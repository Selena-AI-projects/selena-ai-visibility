import { createHash } from "node:crypto";
import { localMapsLiveSubmittedCandidateSchema } from "@workspace/selena-visibility-contracts";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { OrganizationDatabase } from "./db/organization-transaction";
import * as s from "./db/schema";
import { requireLocalOperator } from "./selena-local-pilot-orchestrator";
import { LOCAL_MAPS_SPEND_SCOPE, settleProviderSpend } from "./selena-provider-spend";

const entrySchema = z
	.object({
		attemptId: z.uuid(),
		reservationId: z.uuid(),
		executionKey: z.string().min(1).max(512),
		providerTaskId: z.string().min(1).max(128),
		actualCostUsd: z.literal("0.002000"),
		coordinate: z.string().min(1).max(100),
		keyword: z.string().min(1).max(1000),
		language: z.string().min(1).max(20),
		seDomain: z.string().min(1).max(100),
		device: z.literal("mobile"),
		os: z.literal("android"),
		depth: z.literal(20),
		searchThisArea: z.literal(true),
		providerPostedAt: z.iso.datetime(),
		providerDoneAt: z.iso.datetime(),
	})
	.strict();

export const localBillingManifestSchema = z
	.object({
		schemaVersion: z.literal(1),
		organizationId: z.string().min(1).max(128),
		cycleId: z.uuid(),
		measurementCycleId: z.uuid(),
		providerId: z.string().min(1).max(128),
		billingSourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
		billingConfirmedAt: z.iso.datetime(),
		entries: z.array(entrySchema).length(9),
	})
	.strict()
	.superRefine((manifest, context) => {
		for (const key of ["attemptId", "reservationId", "executionKey", "providerTaskId", "coordinate"] as const) {
			if (new Set(manifest.entries.map((entry) => entry[key])).size !== 9)
				context.addIssue({ code: "custom", message: `LOCAL_BILLING_DUPLICATE_${key}` });
		}
	});

export type LocalBillingManifest = z.infer<typeof localBillingManifestSchema>;

export function localBillingManifestDigest(value: unknown): string {
	const manifest = localBillingManifestSchema.parse(value);
	const canonical = {
		...manifest,
		entries: [...manifest.entries].sort((a, b) => a.attemptId.localeCompare(b.attemptId)),
	};
	return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/** This operator-only path consumes reviewed billing evidence; it never calls a provider. */
export async function reconcileLocalPilotBilling(input: {
	db: OrganizationDatabase;
	actorId: string;
	manifest: unknown;
	env: Record<string, string | undefined>;
	apply?: boolean;
	approvedManifestSha256?: string;
}) {
	const manifest = localBillingManifestSchema.parse(input.manifest);
	const digest = localBillingManifestDigest(manifest);
	if (input.env.SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED !== "false" || input.env.SELENA_LOCAL_EMERGENCY_STOP !== "true")
		throw new Error("LOCAL_BILLING_EXECUTION_MUST_BE_STOPPED");
	if (input.apply && input.approvedManifestSha256 !== digest)
		throw new Error("LOCAL_BILLING_MANIFEST_APPROVAL_REQUIRED");
	const reference = `local-billing:sha256:${digest}`;
	return input.db.transaction(async (tx) => {
		if (!input.apply) await tx.execute(sql`SET TRANSACTION READ ONLY`);
		await tx.execute(sql`select set_config('app.organization_id', ${manifest.organizationId}, true)`);
		await requireLocalOperator(tx, manifest.organizationId, input.actorId);
		const cycleWhere = and(
			eq(s.svLocalScanCycles.id, manifest.cycleId),
			eq(s.svLocalScanCycles.organizationId, manifest.organizationId),
		);
		const cycleQuery = tx.select().from(s.svLocalScanCycles).where(cycleWhere);
		const [cycle] = input.apply ? await cycleQuery.for("update") : await cycleQuery;
		if (
			cycle?.executionMode !== "PILOT" ||
			cycle.measurementCycleId !== manifest.measurementCycleId ||
			cycle.provider !== manifest.providerId
		)
			throw new Error("LOCAL_BILLING_CYCLE_MISMATCH");
		if (!["QUEUED", "RUNNING", "UNKNOWN_RECONCILIATION", "STOPPED"].includes(cycle.status))
			throw new Error("LOCAL_BILLING_CYCLE_STATE_INVALID");
		const attemptWhere = and(
			eq(s.svMeasurementAttempts.organizationId, manifest.organizationId),
			eq(s.svMeasurementAttempts.measurementCycleId, manifest.measurementCycleId),
		);
		const attemptQuery = tx
			.select()
			.from(s.svMeasurementAttempts)
			.where(attemptWhere)
			.orderBy(s.svMeasurementAttempts.id);
		const attempts = input.apply ? await attemptQuery.for("update") : await attemptQuery;
		if (attempts.length !== 9) throw new Error("LOCAL_BILLING_CARDINALITY_MISMATCH");
		if (new Set(attempts.map((a) => a.localObservationId)).size !== 9)
			throw new Error("LOCAL_BILLING_OBSERVATION_CARDINALITY_MISMATCH");
		const reservations = (
			await tx.execute(sql`select r.id, r.status, r.estimated_usd, r.actual_usd
			from sv_provider_spend_reservations r join sv_measurement_attempts a
			on a.reservation_id=r.id and a.organization_id=r.organization_id and a.execution_key=r.request_key
			where r.scope='local-maps' and a.organization_id=${manifest.organizationId}
			and a.measurement_cycle_id=${manifest.measurementCycleId}::uuid
			order by r.id ${input.apply ? sql`for update of r` : sql``}`)
		).rows as Array<{ id: string; status: string; estimated_usd: string; actual_usd: string | null }>;
		if (reservations.length !== 9) throw new Error("LOCAL_BILLING_RESERVATION_CARDINALITY_MISMATCH");
		const outbox = await tx
			.select()
			.from(s.svLocalDispatchOutbox)
			.where(
				and(
					eq(s.svLocalDispatchOutbox.organizationId, manifest.organizationId),
					eq(s.svLocalDispatchOutbox.localCycleId, manifest.cycleId),
				),
			);
		if (
			outbox.length !== 9 ||
			new Set(outbox.map((o) => o.attemptId)).size !== 9 ||
			outbox.some(
				(o) =>
					o.status !== "ENQUEUED" ||
					!attempts.some((a) => a.id === o.attemptId && a.localObservationId === o.observationId),
			)
		)
			throw new Error("LOCAL_BILLING_DISPATCH_HISTORY_MISMATCH");
		const materialized = (
			await tx.execute(sql`select
			(select count(*)::int from sv_measurement_attempt_results where organization_id=${manifest.organizationId} and local_cycle_id=${manifest.cycleId}::uuid) as results,
			(select count(*)::int from sv_evidence_index where organization_id=${manifest.organizationId} and cycle_id=${manifest.measurementCycleId}::uuid) as evidence,
			(select count(*)::int from sv_measurement_datasets where organization_id=${manifest.organizationId} and cycle_id=${manifest.measurementCycleId}::uuid) as datasets`)
		).rows[0] as { results: number; evidence: number; datasets: number };
		if (materialized.results || materialized.evidence || materialized.datasets)
			throw new Error("LOCAL_BILLING_RETAINED_RESULT_REQUIRES_REVIEW");
		const observationWhere = and(
			eq(s.svLocalRankObservations.organizationId, manifest.organizationId),
			eq(s.svLocalRankObservations.cycleId, manifest.cycleId),
		);
		const observationQuery = tx.select().from(s.svLocalRankObservations).where(observationWhere);
		const observations = input.apply ? await observationQuery.for("update") : await observationQuery;
		if (
			observations.length !== 9 ||
			observations.some(
				(o) =>
					!["PENDING", "UNKNOWN"].includes(o.outcome) ||
					o.evidenceId ||
					o.targetRank !== null ||
					o.rawReference !== null ||
					o.evidenceEnvelope !== null ||
					o.evidenceCanonical !== null ||
					o.evidenceSha256 !== null,
			)
		)
			throw new Error("LOCAL_BILLING_OBSERVATION_STATE_INVALID");
		const [clock] = (await tx.execute(sql`select now() as now`)).rows as Array<{ now: Date }>;
		const now = new Date(clock.now);
		const confirmedAt = new Date(manifest.billingConfirmedAt);
		if (confirmedAt > now) throw new Error("LOCAL_BILLING_FUTURE_CONFIRMATION");
		for (const attempt of attempts) {
			const entry = manifest.entries.find((e) => e.attemptId === attempt.id);
			if (
				!entry ||
				entry.reservationId !== attempt.reservationId ||
				entry.executionKey !== attempt.executionKey ||
				attempt.executorId !== manifest.providerId ||
				attempt.rawRef !== null ||
				attempt.status !== "UNKNOWN_RECONCILIATION" ||
				!attempt.submittedAt ||
				!attempt.completedAt ||
				!attempt.localObservationId ||
				!observations.some((o) => o.id === attempt.localObservationId) ||
				attempt.reservedCostUsd !== entry.actualCostUsd
			)
				throw new Error("LOCAL_BILLING_ATTEMPT_MISMATCH");
			const candidate = localMapsLiveSubmittedCandidateSchema.parse(attempt.submittedCandidate);
			const request = candidate.providerRequest;
			if (
				candidate.scope.localCycleId !== cycle.id ||
				candidate.scope.organizationId !== manifest.organizationId ||
				entry.coordinate !== `${request.point.latitude},${request.point.longitude},${request.params.zoom}` ||
				entry.keyword !== request.keyword.text ||
				entry.language !== request.params.language ||
				entry.seDomain !== request.params.seDomain ||
				entry.device !== request.params.device.toLowerCase() ||
				entry.os !== request.params.os ||
				entry.depth !== request.params.depth ||
				entry.searchThisArea !== request.params.searchThisArea
			)
				throw new Error("LOCAL_BILLING_REQUEST_MISMATCH");
			if (
				Math.abs(new Date(entry.providerPostedAt).getTime() - attempt.submittedAt.getTime()) >= 1000 ||
				new Date(entry.providerDoneAt) < new Date(entry.providerPostedAt) ||
				new Date(entry.providerDoneAt) > confirmedAt ||
				attempt.completedAt > confirmedAt
			)
				throw new Error("LOCAL_BILLING_TIME_MISMATCH");
		}
		const costs = await tx
			.select()
			.from(s.svCostEvents)
			.where(
				and(
					eq(s.svCostEvents.organizationId, manifest.organizationId),
					eq(s.svCostEvents.measurementCycleId, manifest.measurementCycleId),
				),
			);
		const alreadyReconciled = attempts.every(
			(a) =>
				a.budgetState === "SPENT" &&
				a.reconciliationRef === reference &&
				a.reconciledAt !== null &&
				manifest.entries.some(
					(e) => e.attemptId === a.id && e.providerTaskId === a.providerTaskId && e.actualCostUsd === a.spentCostUsd,
				),
		);
		if (alreadyReconciled) {
			if (
				reservations.some(
					(r) => r.status !== "SETTLED" || r.actual_usd !== "0.002000" || r.estimated_usd !== "0.002000",
				)
			)
				throw new Error("LOCAL_BILLING_REPLAY_RESERVATION_MISMATCH");
			if (
				cycle.status !== "STOPPED" ||
				!cycle.emergencyStoppedAt ||
				observations.some((o) => o.outcome !== "UNKNOWN") ||
				costs.length !== 9 ||
				attempts.some(
					(a) =>
						!costs.some(
							(c) =>
								c.id === a.costEventId &&
								c.amountUsd === a.spentCostUsd &&
								c.basis === "actual" &&
								c.provider === manifest.providerId,
						),
				)
			)
				throw new Error("LOCAL_BILLING_REPLAY_STATE_MISMATCH");
			const audit = await tx
				.select()
				.from(s.svAuditEvents)
				.where(
					and(
						eq(s.svAuditEvents.organizationId, manifest.organizationId),
						eq(s.svAuditEvents.subjectId, cycle.id),
						eq(s.svAuditEvents.event, "LOCAL_PILOT_BILLING_RECONCILED"),
					),
				);
			if (audit.length !== 1 || (audit[0].details as { manifestSha256?: string }).manifestSha256 !== digest)
				throw new Error("LOCAL_BILLING_REPLAY_AUDIT_MISMATCH");
			return { status: "ALREADY_RECONCILED" as const, manifestSha256: digest, attempts: 9, actualCostUsd: "0.018000" };
		}
		if (
			costs.length ||
			attempts.some(
				(a) =>
					a.budgetState !== "RESERVED" ||
					a.costEventId ||
					a.reconciliationRef ||
					a.reconciledAt ||
					a.providerTaskId ||
					a.spentCostUsd !== "0.000000" ||
					a.releasedCostUsd !== "0.000000",
			)
		)
			throw new Error("LOCAL_BILLING_PARTIAL_OR_CONFLICTING_STATE");
		if (reservations.some((r) => r.status !== "RESERVED" || r.actual_usd !== null || r.estimated_usd !== "0.002000"))
			throw new Error("LOCAL_BILLING_RESERVATION_STATE_MISMATCH");
		if (!input.apply)
			return { status: "DRY_RUN" as const, manifestSha256: digest, attempts: 9, actualCostUsd: "0.018000" };
		for (const attempt of attempts) {
			const entry = manifest.entries.find((e) => e.attemptId === attempt.id);
			if (!entry || !attempt.localObservationId) throw new Error("LOCAL_BILLING_ATTEMPT_MISMATCH");
			const receipt = await settleProviderSpend(tx, {
				scope: LOCAL_MAPS_SPEND_SCOPE,
				organizationId: manifest.organizationId,
				requestKey: attempt.executionKey,
				actualUsd: entry.actualCostUsd,
			});
			if (
				receipt.decision !== "SETTLED" ||
				receipt.reservationId !== entry.reservationId ||
				receipt.actualUsd !== Number(entry.actualCostUsd)
			)
				throw new Error("LOCAL_BILLING_RESERVATION_SETTLEMENT_MISMATCH");
			const [cost] = await tx
				.insert(s.svCostEvents)
				.values({
					organizationId: manifest.organizationId,
					measurementCycleId: manifest.measurementCycleId,
					domainId: "LOCAL_MAPS",
					provider: manifest.providerId,
					amountUsd: entry.actualCostUsd,
					basis: "actual",
					kind: "measurement",
				})
				.returning({ id: s.svCostEvents.id });
			await tx
				.update(s.svMeasurementAttempts)
				.set({
					budgetState: "SPENT",
					spentCostUsd: entry.actualCostUsd,
					costEventId: cost.id,
					providerTaskId: entry.providerTaskId,
					reconciledAt: now,
					reconciliationRef: reference,
				})
				.where(and(attemptWhere, eq(s.svMeasurementAttempts.id, attempt.id)));
			// Preserve unknown measurement outcomes and the original completion time.
			await tx
				.update(s.svLocalRankObservations)
				.set({
					outcome: "UNKNOWN",
					validity: "UNMEASURED",
					capturedAt: attempt.completedAt,
					invalidReason: "BILLING_RECONCILED_RESULT_UNAVAILABLE",
					attemptCount: attempt.attemptIndex,
					updatedAt: now,
				})
				.where(
					and(
						observationWhere,
						eq(s.svLocalRankObservations.id, attempt.localObservationId),
						eq(s.svLocalRankObservations.outcome, "PENDING"),
					),
				);
		}
		await tx
			.update(s.svLocalScanCycles)
			.set({ status: "STOPPED", emergencyStoppedAt: cycle.emergencyStoppedAt ?? now, updatedAt: now })
			.where(cycleWhere);
		// ENQUEUED is truthful dispatch history: these calls did happen. STOPPED
		// plus UNKNOWN attempts blocks both dispatcher eligibility and reacquisition.
		await tx.insert(s.svAuditEvents).values({
			organizationId: manifest.organizationId,
			actorId: input.actorId,
			event: "LOCAL_PILOT_BILLING_RECONCILED",
			subjectKind: "local_scan_cycle",
			subjectId: cycle.id,
			details: {
				manifestSha256: digest,
				billingSourceSha256: manifest.billingSourceSha256,
				actualCostUsd: "0.018000",
				attempts: 9,
				resultRecovery: false,
			},
		});
		return { status: "RECONCILED" as const, manifestSha256: digest, attempts: 9, actualCostUsd: "0.018000" };
	});
}
