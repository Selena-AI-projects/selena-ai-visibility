import { localMapsMaterializedProviderRequestSchema } from "@workspace/selena-visibility-contracts";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { OrganizationDatabase, OrganizationTransaction } from "./db/organization-transaction";
import { withOrganizationTransaction } from "./db/organization-transaction";
import * as schema from "./db/schema";
import { extractLocalCompetitors, type LocalReportCompetition } from "./selena-local-competitors";
import { isLocalVisibilityEnabled } from "./selena-local-execution";
import type { prepareExternalLocalAudit } from "./selena-local-external-audit";
import {
	requireLocalOperator,
	rescheduleLocalPilotInTransaction,
	reviewLocalCanaryInTransaction,
	validateLocalPilotLock,
	withLocalPilotMutation,
} from "./selena-local-pilot-orchestrator";
import {
	assertLocalReportPublishable,
	buildLocalReportContent,
	canonicalLocalReport,
	localReportSha256,
} from "./selena-local-report-publication";

type AuthContext = { tenantId: string; actorId: string; authType: "session" | "api_key" };
const uuid = z.string().uuid();
const canaryReviewBody = z.strictObject({
	attemptId: uuid,
	evidenceId: uuid,
	decision: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
});
const pilotRescheduleBody = z.strictObject({
	acceptedCanaryReviewId: uuid,
	timestampWindow: z
		.strictObject({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() })
		.refine((window) => new Date(window.endsAt) > new Date(window.startsAt), "LOCAL_PILOT_WINDOW_INVALID"),
	engineSha: z.string().regex(/^[a-f0-9]{40}$/),
});
const reportBody = z.strictObject({});
const qcBody = z.strictObject({
	reportVersionId: uuid,
	decision: z.enum(["ACCEPT_PARTIAL", "APPROVED", "REJECTED"]),
	note: z.string().trim().min(1).max(2000),
});
const publishBody = z.strictObject({ reportVersionId: uuid });
const deliverBody = z.strictObject({ reportVersionId: uuid, recipientIdentity: z.string().trim().min(1).max(320) });
const acknowledgeBody = z.strictObject({ deliveryId: uuid });

export type ReportMutation =
	| "canary-review"
	| "pilot-reschedule"
	| "report-create"
	| "qc"
	| "publish"
	| "deliver"
	| "acknowledge";
export type ReportStoreInput = {
	auth: AuthContext;
	tenantId: string;
	operation: ReportMutation;
	cycleId: string;
	idempotencyKey: string;
	bodyHash: string;
	body: Record<string, unknown>;
};

function parseReportContent(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("LOCAL_REPORT_CONTENT_INVALID");
	return value as Parameters<typeof assertLocalReportPublishable>[0];
}

async function loadReportCompetition(
	tx: OrganizationTransaction,
	organizationId: string,
	cycleId: string,
	row: { id: string; evidenceId: string | null; targetRank: number | null; keyword: string; language: string },
	provider: string,
): Promise<LocalReportCompetition> {
	if (provider !== "dataforseo-google-maps") return { status: "UNAVAILABLE", reason: "PROVIDER_NOT_SUPPORTED" };
	if (!row.evidenceId) return { status: "UNAVAILABLE", reason: "RAW_NOT_RETAINED" };
	const [evidence] = await tx
		.select({
			raw: schema.svLocalRawEvidence.rawResponseBody,
			retentionExpiresAt: schema.svLocalRawEvidence.retentionExpiresAt,
			withinRetention: sql<boolean>`coalesce(${schema.svLocalRawEvidence.retentionExpiresAt} > now(), false)`,
			rawSha: schema.svLocalRawEvidence.rawResponseSha256,
			rawTaskId: schema.svLocalRawEvidence.providerTaskId,
			resultSha: schema.svMeasurementAttemptResults.rawResponseSha256,
			taskId: schema.svMeasurementAttemptResults.providerTaskId,
			candidate: schema.svMeasurementAttempts.submittedCandidate,
		})
		.from(schema.svMeasurementAttempts)
		.innerJoin(
			schema.svMeasurementAttemptResults,
			and(
				eq(schema.svMeasurementAttemptResults.attemptId, schema.svMeasurementAttempts.id),
				eq(schema.svMeasurementAttemptResults.organizationId, organizationId),
			),
		)
		.innerJoin(
			schema.svEvidenceIndex,
			and(
				eq(schema.svEvidenceIndex.id, row.evidenceId),
				eq(schema.svEvidenceIndex.organizationId, organizationId),
				eq(schema.svEvidenceIndex.cycleId, schema.svMeasurementAttemptResults.measurementCycleId),
				eq(schema.svEvidenceIndex.observationRef, schema.svMeasurementAttempts.observationRef),
			),
		)
		.leftJoin(
			schema.svLocalRawEvidence,
			and(
				eq(schema.svLocalRawEvidence.sourceSnapshotId, schema.svEvidenceIndex.sourceSnapshotId),
				eq(schema.svLocalRawEvidence.organizationId, organizationId),
			),
		)
		.where(
			and(
				eq(schema.svMeasurementAttempts.organizationId, organizationId),
				eq(schema.svMeasurementAttempts.localObservationId, row.id),
				eq(schema.svMeasurementAttempts.status, "SUCCEEDED"),
				eq(schema.svMeasurementAttemptResults.localCycleId, cycleId),
			),
		)
		.limit(1);
	if (!evidence?.raw || !evidence.withinRetention || !evidence.retentionExpiresAt)
		return { status: "UNAVAILABLE", reason: "RAW_NOT_RETAINED" };
	if (
		!evidence.taskId ||
		!evidence.resultSha ||
		evidence.rawSha !== evidence.resultSha ||
		evidence.rawTaskId !== evidence.taskId
	)
		throw new Error("LOCAL_COMPETITOR_EVIDENCE_MISMATCH");
	const { providerRequest: request } = z
		.object({ providerRequest: localMapsMaterializedProviderRequestSchema })
		.parse(evidence.candidate);
	return {
		status: "AVAILABLE",
		rawRetentionExpiresAt: evidence.retentionExpiresAt.toISOString(),
		...extractLocalCompetitors({
			rawBody: evidence.raw,
			rawSha256: evidence.resultSha,
			providerTaskId: evidence.taskId,
			evidenceId: row.evidenceId,
			keyword: row.keyword,
			language: row.language,
			locationCoordinate: `${request.point.latitude},${request.point.longitude},${request.params.zoom}`,
			target: request.targetIdentity,
			targetRank: row.targetRank,
			captureDepth: request.params.depth,
		}),
	};
}

async function loadReportRows(
	tx: OrganizationTransaction,
	organizationId: string,
	cycleId: string,
	includeCompetition = false,
) {
	const rows = await tx
		.select({
			id: schema.svLocalRankObservations.id,
			pointIndex: schema.svGridPoints.pointIndex,
			latitude: schema.svGridPoints.latitude,
			longitude: schema.svGridPoints.longitude,
			keywordId: schema.svLocalRankObservations.keywordId,
			acceptedEvidenceId: schema.svLocalEvidenceAcceptances.evidenceId,
			outcome: schema.svLocalRankObservations.outcome,
			validity: schema.svLocalRankObservations.validity,
			targetRank: schema.svLocalRankObservations.targetRank,
			capturedAt: schema.svLocalRankObservations.capturedAt,
			reason: schema.svLocalRankObservations.invalidReason,
			evidenceId: schema.svLocalRankObservations.evidenceId,
		})
		.from(schema.svLocalRankObservations)
		.innerJoin(schema.svGridPoints, eq(schema.svGridPoints.id, schema.svLocalRankObservations.gridPointId))
		.leftJoin(
			schema.svLocalEvidenceAcceptances,
			and(
				eq(schema.svLocalEvidenceAcceptances.organizationId, organizationId),
				eq(schema.svLocalEvidenceAcceptances.observationId, schema.svLocalRankObservations.id),
				eq(schema.svLocalEvidenceAcceptances.evidenceId, schema.svLocalRankObservations.evidenceId),
			),
		)
		.where(
			and(
				eq(schema.svLocalRankObservations.organizationId, organizationId),
				eq(schema.svLocalRankObservations.cycleId, cycleId),
			),
		)
		.orderBy(asc(schema.svGridPoints.pointIndex), asc(schema.svLocalRankObservations.id));
	const [lockRow] = await tx
		.select({ snapshot: schema.svConfigurationLocks.snapshot })
		.from(schema.svLocalScanCycles)
		.innerJoin(
			schema.svConfigurationLocks,
			eq(schema.svConfigurationLocks.id, schema.svLocalScanCycles.configurationLockId),
		)
		.where(and(eq(schema.svLocalScanCycles.id, cycleId), eq(schema.svLocalScanCycles.organizationId, organizationId)))
		.limit(1);
	const lock = validateLocalPilotLock(lockRow?.snapshot);
	const reportRows = [];
	for (const { keywordId, acceptedEvidenceId, ...row } of rows) {
		const keyword = lock.keywordSet.keywords?.find((item) => item.id === keywordId);
		if (!keyword) throw new Error("LOCAL_REPORT_LOCK_KEYWORD_MISMATCH");
		if (row.validity === "VALID" && (!row.evidenceId || acceptedEvidenceId !== row.evidenceId))
			throw new Error("LOCAL_REPORT_ACCEPTED_EVIDENCE_REQUIRED");
		const result = { ...row, keyword: keyword.text, language: keyword.language };
		reportRows.push({
			...result,
			...(includeCompetition
				? { competition: await loadReportCompetition(tx, organizationId, cycleId, result, lock.provider.id) }
				: {}),
		});
	}
	return reportRows;
}

export function createLocalReportStore(db: OrganizationDatabase, env: Record<string, string | undefined>) {
	return {
		async mutate(input: ReportStoreInput) {
			if (!isLocalVisibilityEnabled(env)) throw new Error("LOCAL_VISIBILITY_DISABLED");
			if (input.auth.authType !== "session" || input.tenantId !== input.auth.tenantId)
				throw new Error("LOCAL_SESSION_REQUIRED");
			if (input.operation === "acknowledge") return acknowledgeLocalDelivery(db, input);
			return withLocalPilotMutation({
				db,
				identity: {
					tenantId: input.tenantId,
					operation: input.operation,
					resourceId: input.cycleId,
					idempotencyKey: input.idempotencyKey,
					bodyHash: input.bodyHash,
				},
				actorId: input.auth.actorId,
				work: async (tx) => {
					const [cycle] = await tx
						.select()
						.from(schema.svLocalScanCycles)
						.where(
							and(
								eq(schema.svLocalScanCycles.id, input.cycleId),
								eq(schema.svLocalScanCycles.organizationId, input.tenantId),
							),
						)
						.for("update")
						.limit(1);
					if (!cycle) throw new Error("LOCAL_CYCLE_NOT_FOUND");
					const databaseNow = new Date((await tx.execute(sql`select now() as now`)).rows[0].now as string);
					if (input.operation === "canary-review") {
						const body = canaryReviewBody.parse(input.body);
						return reviewLocalCanaryInTransaction({
							tx,
							organizationId: input.tenantId,
							cycleId: cycle.id,
							actorId: input.auth.actorId,
							...body,
						});
					}
					if (input.operation === "pilot-reschedule") {
						const body = pilotRescheduleBody.parse(input.body);
						const pilot = await rescheduleLocalPilotInTransaction({
							tx,
							organizationId: input.tenantId,
							pilotCycleId: cycle.id,
							reviewId: body.acceptedCanaryReviewId,
							actorId: input.auth.actorId,
							timestampWindow: body.timestampWindow,
							engineSha: body.engineSha,
						});
						return {
							operation: "pilot-reschedule",
							supersededPilotCycleId: pilot.supersededPilotCycleId,
							pilotCycleId: pilot.cycleId,
							pilotMeasurementCycleId: pilot.measurementCycleId,
							configurationLockId: pilot.configurationLockId,
							lockVersion: pilot.lockVersion,
							status: "CREATED",
							providerCalls: 0,
						};
					}
					if (input.operation === "report-create") {
						reportBody.parse(input.body);
						if (cycle.executionMode !== "PILOT") throw new Error("LOCAL_REPORT_PILOT_REQUIRED");
						const rows = await loadReportRows(tx, input.tenantId, cycle.id, true);
						if (rows.length !== 9) throw new Error("LOCAL_REPORT_CARDINALITY_INVALID");
						const content = buildLocalReportContent({
							localCycleId: cycle.id,
							measurementCycleId: cycle.measurementCycleId,
							provider: cycle.provider,
							generatedAt: databaseNow,
							observations: rows,
						});
						if (content.totals.pending > 0 || content.totals.unknown > 0 || content.totals.blocked > 0)
							throw new Error("LOCAL_REPORT_OBSERVATIONS_INCOMPLETE");
						const canonical = canonicalLocalReport(content);
						const [latest] = await tx
							.select({ version: schema.svLocalReportVersions.version })
							.from(schema.svLocalReportVersions)
							.where(
								and(
									eq(schema.svLocalReportVersions.organizationId, input.tenantId),
									eq(schema.svLocalReportVersions.localCycleId, cycle.id),
								),
							)
							.orderBy(desc(schema.svLocalReportVersions.version))
							.limit(1);
						const [report] = await tx
							.insert(schema.svLocalReportVersions)
							.values({
								organizationId: input.tenantId,
								localCycleId: cycle.id,
								version: (latest?.version ?? 0) + 1,
								contentJson: content,
								contentCanonical: canonical,
								contentSha256: localReportSha256(canonical),
								status: "DRAFT",
								actor: input.auth.actorId,
							})
							.returning({
								id: schema.svLocalReportVersions.id,
								version: schema.svLocalReportVersions.version,
								contentSha256: schema.svLocalReportVersions.contentSha256,
							});
						if (!report) throw new Error("LOCAL_REPORT_INSERT_FAILED");
						return {
							operation: input.operation,
							cycleId: cycle.id,
							reportVersionId: report.id,
							version: report.version,
							status: "DRAFT",
							contentSha256: report.contentSha256,
						};
					}
					if (input.operation === "qc") {
						const body = qcBody.parse(input.body);
						const [report] = await tx
							.select()
							.from(schema.svLocalReportVersions)
							.where(
								and(
									eq(schema.svLocalReportVersions.id, body.reportVersionId),
									eq(schema.svLocalReportVersions.organizationId, input.tenantId),
									eq(schema.svLocalReportVersions.localCycleId, cycle.id),
								),
							)
							.limit(1);
						if (report?.status !== "DRAFT") throw new Error("LOCAL_REPORT_VERSION_NOT_FOUND");
						const rows = await loadReportRows(tx, input.tenantId, cycle.id);
						const terminal = rows.every((row) => row.outcome !== "PENDING");
						if (!terminal) throw new Error("LOCAL_REPORT_OBSERVATIONS_INCOMPLETE");
						if (
							body.decision === "ACCEPT_PARTIAL" &&
							(cycle.status !== "PARTIAL_FAILURE" ||
								rows.some(
									(row) => row.outcome === "UNKNOWN" || row.outcome === "BLOCKED" || row.outcome === "CANCELLED",
								))
						)
							throw new Error("LOCAL_PARTIAL_QC_INVALID");
						if (body.decision === "APPROVED" && cycle.status !== "QC_REQUIRED")
							throw new Error("LOCAL_QC_APPROVAL_STATE_INVALID");
						const [decision] = await tx
							.insert(schema.svLocalQcDecisions)
							.values({
								organizationId: input.tenantId,
								localCycleId: cycle.id,
								reportVersionId: report.id,
								decision: body.decision,
								actor: input.auth.actorId,
								note: body.note,
							})
							.returning({ id: schema.svLocalQcDecisions.id });
						if (!decision) throw new Error("LOCAL_QC_INSERT_FAILED");
						if (body.decision === "ACCEPT_PARTIAL")
							await tx
								.update(schema.svLocalScanCycles)
								.set({ status: "QC_REQUIRED", updatedAt: databaseNow })
								.where(
									and(
										eq(schema.svLocalScanCycles.id, cycle.id),
										eq(schema.svLocalScanCycles.organizationId, input.tenantId),
									),
								);
						if (body.decision === "REJECTED")
							await tx
								.update(schema.svLocalScanCycles)
								.set({ status: "FAILED", updatedAt: databaseNow })
								.where(
									and(
										eq(schema.svLocalScanCycles.id, cycle.id),
										eq(schema.svLocalScanCycles.organizationId, input.tenantId),
									),
								);
						return {
							operation: input.operation,
							cycleId: cycle.id,
							reportVersionId: report.id,
							decisionId: decision.id,
							status: body.decision,
						};
					}
					if (input.operation === "publish") {
						const body = publishBody.parse(input.body);
						const [report] = await tx
							.select()
							.from(schema.svLocalReportVersions)
							.where(
								and(
									eq(schema.svLocalReportVersions.id, body.reportVersionId),
									eq(schema.svLocalReportVersions.organizationId, input.tenantId),
									eq(schema.svLocalReportVersions.localCycleId, cycle.id),
								),
							)
							.limit(1);
						const [latestQc] = await tx
							.select({ decision: schema.svLocalQcDecisions.decision })
							.from(schema.svLocalQcDecisions)
							.where(
								and(
									eq(schema.svLocalQcDecisions.organizationId, input.tenantId),
									eq(schema.svLocalQcDecisions.localCycleId, cycle.id),
									eq(schema.svLocalQcDecisions.reportVersionId, body.reportVersionId),
								),
							)
							.orderBy(desc(schema.svLocalQcDecisions.createdAt), desc(schema.svLocalQcDecisions.id))
							.limit(1);
						if (cycle.status !== "QC_REQUIRED" || report?.status !== "DRAFT" || latestQc?.decision !== "APPROVED")
							throw new Error("LOCAL_REPORT_QC_REQUIRED");
						assertLocalReportPublishable(parseReportContent(report.contentJson));
						const publishedAt = databaseNow;
						await tx
							.update(schema.svLocalReportVersions)
							.set({ status: "PUBLISHED", publishedAt })
							.where(
								and(
									eq(schema.svLocalReportVersions.id, report.id),
									eq(schema.svLocalReportVersions.organizationId, input.tenantId),
									eq(schema.svLocalReportVersions.status, "DRAFT"),
								),
							);
						await tx
							.update(schema.svLocalScanCycles)
							.set({ status: "READY", updatedAt: publishedAt })
							.where(
								and(
									eq(schema.svLocalScanCycles.id, cycle.id),
									eq(schema.svLocalScanCycles.organizationId, input.tenantId),
								),
							);
						return { operation: input.operation, cycleId: cycle.id, reportVersionId: report.id, status: "PUBLISHED" };
					}
					if (input.operation === "deliver") {
						const body = deliverBody.parse(input.body);
						const [report] = await tx
							.select()
							.from(schema.svLocalReportVersions)
							.where(
								and(
									eq(schema.svLocalReportVersions.id, body.reportVersionId),
									eq(schema.svLocalReportVersions.organizationId, input.tenantId),
									eq(schema.svLocalReportVersions.localCycleId, cycle.id),
									eq(schema.svLocalReportVersions.status, "PUBLISHED"),
								),
							)
							.limit(1);
						if (cycle.status !== "READY" || !report) throw new Error("LOCAL_REPORT_PUBLISHED_REQUIRED");
						await requireLocalMember(tx, input.tenantId, body.recipientIdentity);
						const [delivery] = await tx
							.insert(schema.svLocalReportDeliveries)
							.values({
								organizationId: input.tenantId,
								reportVersionId: report.id,
								recipientIdentity: body.recipientIdentity,
								channel: "MANUAL_SECURE_LINK",
								actor: input.auth.actorId,
								status: "SENT",
							})
							.returning({ id: schema.svLocalReportDeliveries.id });
						if (!delivery) throw new Error("LOCAL_DELIVERY_INSERT_FAILED");
						return {
							operation: input.operation,
							cycleId: cycle.id,
							reportVersionId: report.id,
							deliveryId: delivery.id,
							securePath: `/selena/local/${cycle.id}`,
							status: "SENT",
						};
					}
					throw new Error("LOCAL_REPORT_OPERATION_INVALID");
				},
			});
		},
		async read(input: { auth: AuthContext; cycleId: string; evidenceId?: string; preview?: boolean }) {
			if (!isLocalVisibilityEnabled(env)) throw new Error("LOCAL_VISIBILITY_DISABLED");
			if (input.auth.authType !== "session") throw new Error("LOCAL_SESSION_REQUIRED");
			return withOrganizationTransaction(db, input.auth.tenantId, async (tx) => {
				await requireLocalMember(tx, input.auth.tenantId, input.auth.actorId);
				if (input.preview) await requireLocalOperator(tx, input.auth.tenantId, input.auth.actorId);
				const [report] = await tx
					.select({
						id: schema.svLocalReportVersions.id,
						version: schema.svLocalReportVersions.version,
						content: schema.svLocalReportVersions.contentJson,
						contentSha256: schema.svLocalReportVersions.contentSha256,
						publishedAt: schema.svLocalReportVersions.publishedAt,
					})
					.from(schema.svLocalReportVersions)
					.innerJoin(
						schema.svLocalScanCycles,
						eq(schema.svLocalScanCycles.id, schema.svLocalReportVersions.localCycleId),
					)
					.where(
						and(
							eq(schema.svLocalReportVersions.organizationId, input.auth.tenantId),
							eq(schema.svLocalReportVersions.localCycleId, input.cycleId),
							eq(schema.svLocalReportVersions.status, input.preview ? "DRAFT" : "PUBLISHED"),
							eq(schema.svLocalScanCycles.executionMode, "PILOT"),
						),
					)
					.orderBy(desc(schema.svLocalReportVersions.version))
					.limit(1);
				if (!report) return null;
				// Older publications are not silently grandfathered into Local acceptance.
				await loadReportRows(tx, input.auth.tenantId, input.cycleId);
				if (input.evidenceId) {
					const content = parseReportContent(report.content);
					const observation = content.observations.find((row) => row.evidenceId === input.evidenceId);
					if (!observation) return null;
					const [accepted] = await tx
						.select({
							evidenceSha256: schema.svLocalEvidenceAcceptances.evidenceSha256,
							acceptedAt: schema.svLocalEvidenceAcceptances.acceptedAt,
							contractVersion: schema.svLocalEvidenceAcceptances.contractVersion,
						})
						.from(schema.svLocalEvidenceAcceptances)
						.where(
							and(
								eq(schema.svLocalEvidenceAcceptances.organizationId, input.auth.tenantId),
								eq(schema.svLocalEvidenceAcceptances.observationId, observation.id),
								eq(schema.svLocalEvidenceAcceptances.evidenceId, input.evidenceId),
							),
						)
						.limit(1);
					if (!accepted) return null;
					return { observation, provider: content.provider, reportVersion: report.version, ...accepted };
				}
				const deliveries = await tx
					.select({
						id: schema.svLocalReportDeliveries.id,
						status: schema.svLocalReportDeliveries.status,
						sentAt: schema.svLocalReportDeliveries.sentAt,
						acknowledgedAt: schema.svLocalReportDeliveries.acknowledgedAt,
					})
					.from(schema.svLocalReportDeliveries)
					.where(
						and(
							eq(schema.svLocalReportDeliveries.organizationId, input.auth.tenantId),
							eq(schema.svLocalReportDeliveries.reportVersionId, report.id),
							eq(schema.svLocalReportDeliveries.recipientIdentity, input.auth.actorId),
						),
					)
					.orderBy(desc(schema.svLocalReportDeliveries.sentAt));
				const external = input.preview
					? { rows: [] }
					: await tx.execute<{
							id: string;
							content: ReturnType<typeof prepareExternalLocalAudit>["content"];
							contentSha256: string;
							rawRetention: Array<{ providerTaskId: string; expiresAt: string; available: boolean }>;
						}>(sql`select a.id, a.content_json as content, a.content_sha256 as "contentSha256",
						(select coalesce(jsonb_agg(jsonb_build_object('providerTaskId',raw.provider_task_id,'expiresAt',raw.retention_expires_at,'available',raw.raw_deleted_at is null and raw.retention_expires_at>now()) order by raw.provider_task_id),'[]'::jsonb) from sv_local_external_raw_evidence raw where raw.audit_id=a.id and raw.organization_id=a.organization_id) as "rawRetention"
					from sv_local_external_publications p join sv_local_external_audits a
					on a.id=p.audit_id and a.organization_id=p.organization_id
					where p.organization_id=${input.auth.tenantId} and p.report_version_id=${report.id}
					order by p.published_at,a.id`);
				const parameters = await tx.execute<{
					requestParameters: { depth?: number; device?: string; zoom?: number; seDomain?: string };
				}>(
					sql`select l.snapshot->'request' as "requestParameters" from sv_local_scan_cycles c join sv_configuration_locks l on l.id=c.configuration_lock_id and l.organization_id=c.organization_id where c.id=${input.cycleId} and c.organization_id=${input.auth.tenantId}`,
				);
				return {
					...report,
					delivery: deliveries[0] ?? null,
					externalAudits: external.rows,
					requestParameters: parameters.rows[0]?.requestParameters,
				};
			});
		},
	};
}

async function requireLocalMember(tx: OrganizationTransaction, organizationId: string, actorId: string) {
	const [member] = await tx
		.select({ id: schema.member.id })
		.from(schema.member)
		.where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, actorId)))
		.limit(1);
	if (!member) throw new Error("LOCAL_MEMBERSHIP_REQUIRED");
}

/** Recipient authorization precedes all replays; a second acknowledgement never changes its timestamp. */
async function acknowledgeLocalDelivery(db: OrganizationDatabase, input: ReportStoreInput) {
	const { deliveryId } = acknowledgeBody.parse(input.body);
	return withOrganizationTransaction(db, input.tenantId, async (tx) => {
		await requireLocalMember(tx, input.tenantId, input.auth.actorId);
		await tx.execute(sql`select set_config('app.user_id', ${input.auth.actorId}, true)`);
		const [row] = await tx
			.select({ delivery: schema.svLocalReportDeliveries, cycle: schema.svLocalScanCycles })
			.from(schema.svLocalScanCycles)
			.innerJoin(
				schema.svLocalReportVersions,
				eq(schema.svLocalReportVersions.localCycleId, schema.svLocalScanCycles.id),
			)
			.innerJoin(
				schema.svLocalReportDeliveries,
				eq(schema.svLocalReportDeliveries.reportVersionId, schema.svLocalReportVersions.id),
			)
			.where(
				and(
					eq(schema.svLocalScanCycles.id, input.cycleId),
					eq(schema.svLocalScanCycles.organizationId, input.tenantId),
					eq(schema.svLocalReportDeliveries.id, deliveryId),
					eq(schema.svLocalReportDeliveries.recipientIdentity, input.auth.actorId),
					eq(schema.svLocalReportVersions.status, "PUBLISHED"),
				),
			)
			.for("update")
			.limit(1);
		if (!row) throw new Error("LOCAL_DELIVERY_RECIPIENT_REQUIRED");
		if (
			row.cycle.executionMode !== "PILOT" ||
			row.cycle.emergencyStoppedAt ||
			!["READY", "COMPLETED"].includes(row.cycle.status)
		)
			throw new Error("LOCAL_REPORT_PUBLISHED_REQUIRED");
		if (!["SENT", "ACKNOWLEDGED"].includes(row.delivery.status)) throw new Error("LOCAL_DELIVERY_RECIPIENT_REQUIRED");
		// Bind replay to the recipient while preserving body conflicts within this cycle.
		const resourceId = `${input.cycleId}:${input.auth.actorId}`;
		const where = and(
			eq(schema.svApiIdempotencyRecords.organizationId, input.tenantId),
			eq(schema.svApiIdempotencyRecords.operation, "acknowledge"),
			eq(schema.svApiIdempotencyRecords.resourceId, resourceId),
			eq(schema.svApiIdempotencyRecords.idempotencyKey, input.idempotencyKey),
		);
		const [prior] = await tx.select().from(schema.svApiIdempotencyRecords).where(where).limit(1);
		if (prior) {
			if (prior.bodyHash !== input.bodyHash) throw new Error("IDEMPOTENCY_BODY_CONFLICT");
			return prior.responseBody;
		}
		if (row.delivery.status === "SENT") {
			await tx
				.update(schema.svLocalReportDeliveries)
				.set({ status: "ACKNOWLEDGED", acknowledgedAt: sql`now()` })
				.where(
					and(
						eq(schema.svLocalReportDeliveries.id, deliveryId),
						eq(schema.svLocalReportDeliveries.organizationId, input.tenantId),
					),
				);
			await tx
				.update(schema.svLocalScanCycles)
				.set({ status: "COMPLETED", updatedAt: sql`now()` })
				.where(
					and(
						eq(schema.svLocalScanCycles.id, input.cycleId),
						eq(schema.svLocalScanCycles.organizationId, input.tenantId),
					),
				);
		}
		const response = { operation: input.operation, cycleId: input.cycleId, deliveryId, status: "ACKNOWLEDGED" };
		await tx.insert(schema.svApiIdempotencyRecords).values({
			organizationId: input.tenantId,
			operation: "acknowledge",
			resourceId,
			idempotencyKey: input.idempotencyKey,
			bodyHash: input.bodyHash,
			responseStatus: 200,
			responseBody: response,
			expiresAt: sql`now() + interval '7 days'`,
		});
		return response;
	});
}
