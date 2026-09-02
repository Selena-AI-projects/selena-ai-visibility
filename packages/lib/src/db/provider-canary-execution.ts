import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { googleAiModeDatasetAdapter } from "../adapters/google-dataset-adapters";
import type {
	PreparedProviderDatasetCanary,
	ProviderDatasetRawCapture,
	ProviderDatasetSchemaDiscoveryEvidence,
} from "../providers/dataset-registry";
import {
	GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
	type GoogleAiModeCanaryReceipt,
} from "../providers/google-ai-mode-one-shot-canary";
import {
	createProviderDatasetRawCaptureFromLifecycle,
	providerDatasetContentHash,
} from "../providers/provider-dataset-authority";
import { recoverHistoricalGoogleAiModeJournal } from "./brightdata-snapshot-journal";
import {
	type OrganizationDatabase,
	type OrganizationTransaction,
	withOrganizationTransaction,
} from "./organization-transaction";
import { assertOwnerScopedConnection } from "./owner-scoped-connection";
import {
	svAuditEvents,
	svEvidenceIndex,
	svProviderCanaryExecutions,
	svProviderDatasetCapabilities,
	svSourceSnapshots,
} from "./schema";

export const GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD = 0.25 as const;
export const GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY = "selena-v1-3-google-ai-mode-canary" as const;
export const GOOGLE_AI_MODE_HISTORICAL_MAX_FILE_BYTES = 4 * 1024 * 1024;

export type GoogleAiModeCanaryReservation =
	| Readonly<{
			status: "RESERVED";
			reservationId: string;
			approvedCapUsd: typeof GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD;
			remainingAuthorizedUsd: typeof GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD;
	  }>
	| Readonly<{ status: "ALREADY_RESERVED" }>;

export type GoogleAiModeCanaryCapturePersistenceReceipt = Readonly<{
	schemaVersion: "google-ai-mode-canary-persistence-receipt-v1.3";
	status: "PERSISTED_PRIVATE";
	source: "GOOGLE_AI_MODE";
	capabilityStatus: "CANARY_ONLY";
	outputSchemaVersion: null;
	evidenceIndexStatus: "NOT_ELIGIBLE";
	recordCount: number;
	costStatus: "UNKNOWN";
	acceptance: "HOLD";
	reason: "COST_RECONCILIATION_REQUIRED";
}>;

export type HistoricalGoogleAiModeReconciliationReceipt = Readonly<{
	schemaVersion: "google-ai-mode-historical-reconciliation-receipt-v1.3";
	status: "PERSISTED_PRIVATE" | "ALREADY_RECONCILED" | "DRY_RUN_ROLLED_BACK";
	source: "GOOGLE_AI_MODE";
	providerCalls: 0;
	capabilityStatus: "CANARY_ONLY";
	evidenceIndexStatus: "NOT_CREATED";
	costEventStatus: "NOT_CREATED";
	acceptanceReceiptStatus: "NOT_CREATED";
	humanAccepted: false;
	recordCount: number;
	acceptance: "HOLD";
}>;

export type ReconcileHistoricalGoogleAiModeCaptureInput = Readonly<{
	organizationId: string;
	projectId: string;
	executionIdentity: string;
	providerDatasetId: string;
	snapshotId: string;
	capturedAt: string;
	historicalReadyObservedAt: string;
	reconciledAt: string;
	providerInput: unknown;
	rawFileBytes: Uint8Array;
	expectedFileSha256: string;
	expectedCanonicalHash: string;
	estimatedWorstCaseUsd: number;
	dryRun: boolean;
}>;

type PersistGoogleAiModeCanaryCaptureInput = Readonly<{
	organizationId: string;
	executionIdentity: string;
	prepared: PreparedProviderDatasetCanary;
	capture: ProviderDatasetRawCapture;
	receipt: GoogleAiModeCanaryReceipt;
}>;

function assertCompleteCanaryReceipt(receipt: GoogleAiModeCanaryReceipt, capture: ProviderDatasetRawCapture): void {
	if (
		receipt.schemaVersion !== "google-ai-mode-canary-receipt-v1.3" ||
		receipt.terminal !== true ||
		receipt.source !== "GOOGLE_AI_MODE" ||
		receipt.status !== "COMPLETE" ||
		receipt.providerCalls !== 1 ||
		receipt.recurring !== false ||
		receipt.automaticRetries !== 0 ||
		receipt.retryAllowed !== false ||
		receipt.cost.status !== "UNKNOWN" ||
		receipt.cost.amountUsd !== null ||
		receipt.cost.approvedCapUsd !== GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD ||
		receipt.cost.reservedUsd !== GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD ||
		receipt.cost.basis !== "PROVIDER_ACTUAL_UNAVAILABLE" ||
		receipt.cost.reconciliation !== "REQUIRED" ||
		receipt.cost.acceptance !== "HOLD" ||
		receipt.snapshotReference !== capture.rawReference ||
		receipt.recordCount !== capture.recordCount
	)
		throw new Error("GOOGLE_AI_MODE_CANARY_CAPTURE_RECEIPT_INVALID");
}

function capabilityMatchesRegistry(row: typeof svProviderDatasetCapabilities.$inferSelect): boolean {
	const definition = googleAiModeDatasetAdapter.definition;
	return (
		row.provider === definition.provider &&
		row.source === definition.source &&
		row.surface === definition.surface &&
		row.domain === definition.domain &&
		row.entityType === definition.entityType &&
		row.datasetEnvKey === definition.datasetEnvKey &&
		row.inputSchemaVersion === definition.inputSchemaVersion &&
		row.outputSchemaVersion === definition.outputSchemaVersion &&
		row.accessClass === definition.accessClass &&
		row.capabilityStatus === definition.capabilityStatus &&
		row.retentionClass === definition.retentionClass &&
		row.contractVersion === definition.contractVersion &&
		row.immutable === true
	);
}

/**
 * Persists the private schema-discovery capture after the once-ever trigger.
 * It deliberately does not create sv_evidence_index rows: a CANARY_ONLY raw
 * capture with no output schema is not accepted measurement evidence.
 */
export async function persistGoogleAiModeCanaryCapture(
	db: OrganizationDatabase,
	input: PersistGoogleAiModeCanaryCaptureInput,
): Promise<GoogleAiModeCanaryCapturePersistenceReceipt> {
	if (!input.organizationId.trim()) throw new Error("GOOGLE_AI_MODE_CANARY_ORGANIZATION_REQUIRED");
	if (input.executionIdentity !== GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY)
		throw new Error("GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY_INVALID");
	assertCompleteCanaryReceipt(input.receipt, input.capture);

	const evidence = googleAiModeDatasetAdapter.normalizeSchemaDiscoveryCapture(input.prepared, input.capture);
	googleAiModeDatasetAdapter.validateSchemaDiscoveryEvidence(evidence);
	const definition = googleAiModeDatasetAdapter.definition;

	await withOrganizationTransaction(db, input.organizationId, async (tx) => {
		const [reservation] = await tx
			.select()
			.from(svProviderCanaryExecutions)
			.where(
				and(
					eq(svProviderCanaryExecutions.organizationId, input.organizationId),
					eq(svProviderCanaryExecutions.executionIdentity, input.executionIdentity),
					eq(svProviderCanaryExecutions.source, "GOOGLE_AI_MODE"),
				),
			)
			.limit(1);
		if (!reservation) throw new Error("GOOGLE_AI_MODE_CANARY_RESERVATION_MISMATCH");
		if (
			reservation.approvedCapUsd !== "0.250000" ||
			reservation.recurring !== false ||
			reservation.automaticRetries !== 0 ||
			reservation.costStatus !== "UNKNOWN" ||
			input.receipt.reservationReference !== `db:${reservation.id}`
		)
			throw new Error("GOOGLE_AI_MODE_CANARY_RESERVATION_MISMATCH");

		const [latestCapability] = await tx
			.select()
			.from(svProviderDatasetCapabilities)
			.where(
				and(
					eq(svProviderDatasetCapabilities.organizationId, input.organizationId),
					eq(svProviderDatasetCapabilities.provider, definition.provider),
					eq(svProviderDatasetCapabilities.source, definition.source),
				),
			)
			.orderBy(desc(svProviderDatasetCapabilities.version))
			.limit(1);

		let capabilityId = latestCapability?.id;
		if (!latestCapability || !capabilityMatchesRegistry(latestCapability)) {
			const [insertedCapability] = await tx
				.insert(svProviderDatasetCapabilities)
				.values({
					organizationId: input.organizationId,
					provider: definition.provider,
					source: definition.source,
					surface: definition.surface,
					domain: definition.domain,
					entityType: definition.entityType,
					datasetEnvKey: definition.datasetEnvKey,
					inputSchemaVersion: definition.inputSchemaVersion,
					outputSchemaVersion: definition.outputSchemaVersion,
					accessClass: definition.accessClass,
					capabilityStatus: definition.capabilityStatus,
					retentionClass: definition.retentionClass,
					contractVersion: definition.contractVersion,
					version: (latestCapability?.version ?? 0) + 1,
					contractMetadata: {
						adapterId: googleAiModeDatasetAdapter.id,
						evidenceRole: googleAiModeDatasetAdapter.evidenceRole,
						mapsRankEvidenceEligible: false,
						schemaDiscoveryOnly: true,
					},
					immutable: true,
				})
				.returning({ id: svProviderDatasetCapabilities.id });
			if (!insertedCapability) throw new Error("GOOGLE_AI_MODE_CANARY_CAPABILITY_PERSISTENCE_FAILED");
			capabilityId = insertedCapability.id;
		}
		if (!capabilityId) throw new Error("GOOGLE_AI_MODE_CANARY_CAPABILITY_PERSISTENCE_FAILED");

		const [snapshot] = await tx
			.insert(svSourceSnapshots)
			.values({
				organizationId: input.organizationId,
				sourceType: evidence.source,
				sourceRef: evidence.rawReference,
				contentSha256: evidence.rawContentHash,
				snapshot: evidence,
				capabilityId,
				providerDatasetRef: evidence.providerDatasetId,
				environment: evidence.environment,
				rawReference: evidence.rawReference,
				inputSchemaVersion: definition.inputSchemaVersion,
				outputSchemaVersion: definition.outputSchemaVersion,
				capturedAt: new Date(evidence.capturedAt),
				immutable: true,
			})
			.returning({ id: svSourceSnapshots.id });
		if (!snapshot) throw new Error("GOOGLE_AI_MODE_CANARY_SNAPSHOT_PERSISTENCE_FAILED");

		const [audit] = await tx
			.insert(svAuditEvents)
			.values({
				organizationId: input.organizationId,
				actorId: "system:google-ai-mode-canary",
				event: "GOOGLE_AI_MODE_CANARY_CAPTURE_PERSISTED",
				subjectKind: "source_snapshot",
				subjectId: snapshot.id,
				details: {
					schemaVersion: "google-ai-mode-canary-persistence-receipt-v1.3",
					executionIdentity: input.executionIdentity,
					reservationId: reservation.id,
					source: "GOOGLE_AI_MODE",
					providerCalls: 1,
					recurring: false,
					automaticRetries: 0,
					capabilityStatus: "CANARY_ONLY",
					outputSchemaVersion: null,
					evidenceIndexStatus: "NOT_ELIGIBLE",
					recordCount: evidence.recordCount,
					costStatus: "UNKNOWN",
					acceptance: "HOLD",
					reason: "COST_RECONCILIATION_REQUIRED",
				},
			})
			.returning({ id: svAuditEvents.id });
		if (!audit) throw new Error("GOOGLE_AI_MODE_CANARY_AUDIT_PERSISTENCE_FAILED");
	});

	return Object.freeze({
		schemaVersion: "google-ai-mode-canary-persistence-receipt-v1.3" as const,
		status: "PERSISTED_PRIVATE" as const,
		source: "GOOGLE_AI_MODE" as const,
		capabilityStatus: "CANARY_ONLY" as const,
		outputSchemaVersion: null,
		evidenceIndexStatus: "NOT_ELIGIBLE" as const,
		recordCount: evidence.recordCount,
		costStatus: "UNKNOWN" as const,
		acceptance: "HOLD" as const,
		reason: "COST_RECONCILIATION_REQUIRED" as const,
	});
}

const historicalReconciliationRollback = new Error("GOOGLE_AI_MODE_HISTORICAL_DRY_RUN_ROLLBACK");

function requiredHash(value: string, code: string): `sha256:${string}` {
	if (!/^sha256:[a-f0-9]{64}$/.test(value)) throw new Error(code);
	return value as `sha256:${string}`;
}

function historicalReceipt(
	status: HistoricalGoogleAiModeReconciliationReceipt["status"],
	recordCount: number,
): HistoricalGoogleAiModeReconciliationReceipt {
	return Object.freeze({
		schemaVersion: "google-ai-mode-historical-reconciliation-receipt-v1.3" as const,
		status,
		source: "GOOGLE_AI_MODE" as const,
		providerCalls: 0 as const,
		capabilityStatus: "CANARY_ONLY" as const,
		evidenceIndexStatus: "NOT_CREATED" as const,
		costEventStatus: "NOT_CREATED" as const,
		acceptanceReceiptStatus: "NOT_CREATED" as const,
		humanAccepted: false as const,
		recordCount,
		acceptance: "HOLD" as const,
	});
}

async function resolveGoogleAiModeCapabilityId(tx: OrganizationTransaction, organizationId: string): Promise<string> {
	const definition = googleAiModeDatasetAdapter.definition;
	const [latestCapability] = await tx
		.select()
		.from(svProviderDatasetCapabilities)
		.where(
			and(
				eq(svProviderDatasetCapabilities.organizationId, organizationId),
				eq(svProviderDatasetCapabilities.provider, definition.provider),
				eq(svProviderDatasetCapabilities.source, definition.source),
			),
		)
		.orderBy(desc(svProviderDatasetCapabilities.version))
		.limit(1);
	if (latestCapability && capabilityMatchesRegistry(latestCapability)) return latestCapability.id;
	const [insertedCapability] = await tx
		.insert(svProviderDatasetCapabilities)
		.values({
			organizationId,
			provider: definition.provider,
			source: definition.source,
			surface: definition.surface,
			domain: definition.domain,
			entityType: definition.entityType,
			datasetEnvKey: definition.datasetEnvKey,
			inputSchemaVersion: definition.inputSchemaVersion,
			outputSchemaVersion: definition.outputSchemaVersion,
			accessClass: definition.accessClass,
			capabilityStatus: definition.capabilityStatus,
			retentionClass: definition.retentionClass,
			contractVersion: definition.contractVersion,
			version: (latestCapability?.version ?? 0) + 1,
			contractMetadata: {
				adapterId: googleAiModeDatasetAdapter.id,
				evidenceRole: googleAiModeDatasetAdapter.evidenceRole,
				mapsRankEvidenceEligible: false,
				schemaDiscoveryOnly: true,
			},
			immutable: true,
		})
		.returning({ id: svProviderDatasetCapabilities.id });
	if (!insertedCapability) throw new Error("GOOGLE_AI_MODE_HISTORICAL_CAPABILITY_PERSISTENCE_FAILED");
	return insertedCapability.id;
}

function assertExistingHistoricalAudit(
	details: unknown,
	input: ReconcileHistoricalGoogleAiModeCaptureInput,
	reservationId: string,
	fileSha256: string,
	canonicalHash: string,
	recordCount: number,
): void {
	if (typeof details !== "object" || details === null || Array.isArray(details))
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_IDEMPOTENCY_MISMATCH");
	const value = details as Record<string, unknown>;
	if (
		value.executionIdentity !== input.executionIdentity ||
		value.reservationId !== reservationId ||
		value.projectId !== input.projectId ||
		value.providerDatasetId !== input.providerDatasetId ||
		value.snapshotId !== input.snapshotId ||
		value.capturedAt !== new Date(input.capturedAt).toISOString() ||
		value.historicalReadyObservedAt !== new Date(input.historicalReadyObservedAt).toISOString() ||
		value.reconciledAt !== new Date(input.reconciledAt).toISOString() ||
		value.fileSha256 !== fileSha256 ||
		value.canonicalHash !== canonicalHash ||
		value.recordCount !== recordCount ||
		value.source !== "GOOGLE_AI_MODE" ||
		value.providerCalls !== 0 ||
		value.recurring !== false ||
		value.capabilityStatus !== "CANARY_ONLY" ||
		value.outputSchemaVersion !== null ||
		value.evidenceIndexStatus !== "NOT_CREATED" ||
		value.costEventStatus !== "NOT_CREATED" ||
		value.acceptanceReceiptStatus !== "NOT_CREATED" ||
		value.schemaVersion !== "google-ai-mode-historical-reconciliation-receipt-v1.3" ||
		value.humanAccepted !== false ||
		value.acceptance !== "HOLD"
	)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_IDEMPOTENCY_MISMATCH");
}

function assertExistingHistoricalEvidence(value: unknown, expected: ProviderDatasetSchemaDiscoveryEvidence): void {
	try {
		googleAiModeDatasetAdapter.validateSchemaDiscoveryEvidence(value as ProviderDatasetSchemaDiscoveryEvidence);
	} catch {
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_IDEMPOTENCY_MISMATCH");
	}
	const stored = value as ProviderDatasetSchemaDiscoveryEvidence;
	if (
		stored.rawContentHash !== expected.rawContentHash ||
		stored.rawReference !== expected.rawReference ||
		stored.providerDatasetId !== expected.providerDatasetId ||
		stored.capturedAt !== expected.capturedAt ||
		stored.recordCount !== expected.recordCount
	)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_IDEMPOTENCY_MISMATCH");
}

/**
 * Reconciles a previously downloaded historical snapshot without importing a
 * provider transport or credential. All durable writes share one transaction;
 * dry-run exercises those writes and then deliberately rolls the transaction back.
 */
export async function reconcileHistoricalGoogleAiModeCapture(
	db: OrganizationDatabase,
	input: ReconcileHistoricalGoogleAiModeCaptureInput,
): Promise<HistoricalGoogleAiModeReconciliationReceipt> {
	if (!input.organizationId.trim()) throw new Error("GOOGLE_AI_MODE_HISTORICAL_ORGANIZATION_REQUIRED");
	if (!input.projectId.trim()) throw new Error("GOOGLE_AI_MODE_HISTORICAL_PROJECT_REQUIRED");
	if (input.executionIdentity !== GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_EXECUTION_IDENTITY_INVALID");
	if (!/^gd_[a-z0-9]+$/.test(input.providerDatasetId)) throw new Error("GOOGLE_AI_MODE_HISTORICAL_DATASET_INVALID");
	if (!input.snapshotId.trim()) throw new Error("GOOGLE_AI_MODE_HISTORICAL_SNAPSHOT_REQUIRED");
	if (input.rawFileBytes.byteLength === 0 || input.rawFileBytes.byteLength > GOOGLE_AI_MODE_HISTORICAL_MAX_FILE_BYTES)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_FILE_SIZE_INVALID");
	const expectedFileSha256 = requiredHash(input.expectedFileSha256, "GOOGLE_AI_MODE_HISTORICAL_FILE_HASH_INVALID");
	const expectedCanonicalHash = requiredHash(
		input.expectedCanonicalHash,
		"GOOGLE_AI_MODE_HISTORICAL_CANONICAL_HASH_INVALID",
	);
	const fileSha256 = `sha256:${createHash("sha256").update(input.rawFileBytes).digest("hex")}` as const;
	if (fileSha256 !== expectedFileSha256) throw new Error("GOOGLE_AI_MODE_HISTORICAL_FILE_HASH_MISMATCH");
	let rawPayload: unknown;
	try {
		rawPayload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(input.rawFileBytes)) as unknown;
	} catch {
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_FILE_JSON_INVALID");
	}
	const canonicalHash = providerDatasetContentHash(rawPayload);
	if (canonicalHash !== expectedCanonicalHash) throw new Error("GOOGLE_AI_MODE_HISTORICAL_CANONICAL_HASH_MISMATCH");

	const prepared = googleAiModeDatasetAdapter.prepareCanary(
		{
			mode: "CANARY",
			environment: "ISOLATED_CANARY",
			ownerApproved: true,
			schemaDiscoveryOnly: true,
			providerCalls: 1,
			recurring: false,
			worstCaseCostUsd: input.estimatedWorstCaseUsd,
			approvedCostCapUsd: GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD,
			redactionPolicyApproved: true,
		},
		{ SELENA_BRIGHTDATA_DATASET_GOOGLE_AI: input.providerDatasetId },
		input.providerInput,
	);
	const capturedAt = new Date(input.capturedAt);
	if (!Number.isFinite(capturedAt.getTime())) throw new Error("GOOGLE_AI_MODE_HISTORICAL_CAPTURE_TIME_INVALID");
	const capture = createProviderDatasetRawCaptureFromLifecycle(prepared, {
		snapshotId: input.snapshotId,
		capturedAt: capturedAt.toISOString(),
		rawPayload,
	});
	const evidence = googleAiModeDatasetAdapter.normalizeSchemaDiscoveryCapture(prepared, capture);
	googleAiModeDatasetAdapter.validateSchemaDiscoveryEvidence(evidence);

	try {
		const status = await withOrganizationTransaction(db, input.organizationId, async (tx) => {
			await assertOwnerScopedConnection(tx, "GOOGLE_AI_MODE_HISTORICAL_OWNER_SCOPE_REQUIRED");
			const [reservation] = await tx
				.select()
				.from(svProviderCanaryExecutions)
				.where(
					and(
						eq(svProviderCanaryExecutions.organizationId, input.organizationId),
						eq(svProviderCanaryExecutions.executionIdentity, input.executionIdentity),
						eq(svProviderCanaryExecutions.source, "GOOGLE_AI_MODE"),
					),
				)
				.limit(1);
			if (
				reservation?.approvedCapUsd !== "0.250000" ||
				reservation.recurring !== false ||
				reservation.automaticRetries !== 0 ||
				reservation.costStatus !== "UNKNOWN"
			)
				throw new Error("GOOGLE_AI_MODE_HISTORICAL_RESERVATION_MISMATCH");

			const journal = await recoverHistoricalGoogleAiModeJournal(tx, {
				organizationId: input.organizationId,
				projectId: input.projectId,
				providerDatasetId: input.providerDatasetId,
				snapshotId: input.snapshotId,
				historicalReadyObservedAt: input.historicalReadyObservedAt,
				reconciledAt: input.reconciledAt,
				recordCount: evidence.recordCount,
			});

			if (journal.status === "ALREADY_DELIVERED") {
				const [snapshot] = await tx
					.select()
					.from(svSourceSnapshots)
					.where(
						and(
							eq(svSourceSnapshots.organizationId, input.organizationId),
							eq(svSourceSnapshots.contentSha256, evidence.rawContentHash),
						),
					)
					.limit(1);
				if (
					snapshot?.sourceType !== "GOOGLE_AI_MODE" ||
					snapshot.sourceRef !== evidence.rawReference ||
					snapshot.contentSha256 !== evidence.rawContentHash ||
					snapshot.providerDatasetRef !== input.providerDatasetId ||
					snapshot.environment !== "ISOLATED_CANARY" ||
					snapshot.rawReference !== evidence.rawReference ||
					snapshot.inputSchemaVersion !== googleAiModeDatasetAdapter.definition.inputSchemaVersion ||
					snapshot.outputSchemaVersion !== null ||
					!snapshot.capabilityId ||
					snapshot.capturedAt.toISOString() !== capturedAt.toISOString() ||
					snapshot.immutable !== true
				)
					throw new Error("GOOGLE_AI_MODE_HISTORICAL_IDEMPOTENCY_MISMATCH");
				assertExistingHistoricalEvidence(snapshot.snapshot, evidence);
				const [capability] = await tx
					.select()
					.from(svProviderDatasetCapabilities)
					.where(
						and(
							eq(svProviderDatasetCapabilities.organizationId, input.organizationId),
							eq(svProviderDatasetCapabilities.id, snapshot.capabilityId),
						),
					)
					.limit(1);
				if (!capability || !capabilityMatchesRegistry(capability))
					throw new Error("GOOGLE_AI_MODE_HISTORICAL_IDEMPOTENCY_MISMATCH");
				const [indexed] = await tx
					.select({ id: svEvidenceIndex.id })
					.from(svEvidenceIndex)
					.where(
						and(
							eq(svEvidenceIndex.organizationId, input.organizationId),
							eq(svEvidenceIndex.sourceSnapshotId, snapshot.id),
						),
					)
					.limit(1);
				if (indexed) throw new Error("GOOGLE_AI_MODE_HISTORICAL_EVIDENCE_INDEX_FORBIDDEN");
				const [audit] = await tx
					.select({ details: svAuditEvents.details })
					.from(svAuditEvents)
					.where(
						and(
							eq(svAuditEvents.organizationId, input.organizationId),
							eq(svAuditEvents.event, "GOOGLE_AI_MODE_HISTORICAL_CAPTURE_RECONCILED"),
							eq(svAuditEvents.subjectKind, "source_snapshot"),
							eq(svAuditEvents.subjectId, snapshot.id),
						),
					)
					.limit(1);
				if (!audit) throw new Error("GOOGLE_AI_MODE_HISTORICAL_IDEMPOTENCY_MISMATCH");
				assertExistingHistoricalAudit(
					audit.details,
					input,
					reservation.id,
					fileSha256,
					canonicalHash,
					evidence.recordCount,
				);
				if (input.dryRun) throw historicalReconciliationRollback;
				return "ALREADY_RECONCILED" as const;
			}

			const capabilityId = await resolveGoogleAiModeCapabilityId(tx, input.organizationId);
			const [snapshot] = await tx
				.insert(svSourceSnapshots)
				.values({
					organizationId: input.organizationId,
					sourceType: evidence.source,
					sourceRef: evidence.rawReference,
					contentSha256: evidence.rawContentHash,
					snapshot: evidence,
					capabilityId,
					providerDatasetRef: evidence.providerDatasetId,
					environment: evidence.environment,
					rawReference: evidence.rawReference,
					inputSchemaVersion: googleAiModeDatasetAdapter.definition.inputSchemaVersion,
					outputSchemaVersion: null,
					capturedAt,
					immutable: true,
				})
				.returning({ id: svSourceSnapshots.id });
			if (!snapshot) throw new Error("GOOGLE_AI_MODE_HISTORICAL_SNAPSHOT_PERSISTENCE_FAILED");
			const [audit] = await tx
				.insert(svAuditEvents)
				.values({
					organizationId: input.organizationId,
					actorId: "system:google-ai-mode-historical-reconciliation",
					event: "GOOGLE_AI_MODE_HISTORICAL_CAPTURE_RECONCILED",
					subjectKind: "source_snapshot",
					subjectId: snapshot.id,
					details: {
						schemaVersion: "google-ai-mode-historical-reconciliation-receipt-v1.3",
						source: "GOOGLE_AI_MODE",
						executionIdentity: input.executionIdentity,
						reservationId: reservation.id,
						projectId: input.projectId,
						providerDatasetId: input.providerDatasetId,
						snapshotId: input.snapshotId,
						capturedAt: capturedAt.toISOString(),
						historicalReadyObservedAt: new Date(input.historicalReadyObservedAt).toISOString(),
						reconciledAt: new Date(input.reconciledAt).toISOString(),
						fileSha256,
						canonicalHash,
						providerCalls: 0,
						recurring: false,
						capabilityStatus: "CANARY_ONLY",
						outputSchemaVersion: null,
						evidenceIndexStatus: "NOT_CREATED",
						costEventStatus: "NOT_CREATED",
						acceptanceReceiptStatus: "NOT_CREATED",
						humanAccepted: false,
						recordCount: evidence.recordCount,
						acceptance: "HOLD",
					},
				})
				.returning({ id: svAuditEvents.id });
			if (!audit) throw new Error("GOOGLE_AI_MODE_HISTORICAL_AUDIT_PERSISTENCE_FAILED");
			if (input.dryRun) throw historicalReconciliationRollback;
			return "PERSISTED_PRIVATE" as const;
		});
		return historicalReceipt(status, evidence.recordCount);
	} catch (error) {
		if (error === historicalReconciliationRollback)
			return historicalReceipt("DRY_RUN_ROLLED_BACK", evidence.recordCount);
		throw error;
	}
}

/**
 * Commits the durable, once-ever reservation before the provider trigger may
 * run. The immutable row records authorization, not an assertion of spend.
 */
export async function reserveGoogleAiModeCanaryExecution(
	db: OrganizationDatabase,
	input: Readonly<{ organizationId: string; executionIdentity: string }>,
): Promise<GoogleAiModeCanaryReservation> {
	if (input.executionIdentity.length < 8 || input.executionIdentity.length > 128)
		throw new Error("PROVIDER_CANARY_EXECUTION_IDENTITY_INVALID");
	if (input.executionIdentity !== input.executionIdentity.trim())
		throw new Error("PROVIDER_CANARY_EXECUTION_IDENTITY_INVALID");

	const reservationId = await withOrganizationTransaction(db, input.organizationId, async (tx) => {
		const [reserved] = await tx
			.insert(svProviderCanaryExecutions)
			.values({
				organizationId: input.organizationId,
				executionIdentity: input.executionIdentity,
				source: "GOOGLE_AI_MODE",
				approvedCapUsd: "0.250000",
				recurring: false,
				automaticRetries: 0,
				costStatus: "UNKNOWN",
			})
			.onConflictDoNothing({
				target: [svProviderCanaryExecutions.source, svProviderCanaryExecutions.executionIdentity],
			})
			.returning({ id: svProviderCanaryExecutions.id });
		return reserved?.id ?? null;
	});

	return reservationId
		? Object.freeze({
				status: "RESERVED" as const,
				reservationId,
				approvedCapUsd: GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD,
				remainingAuthorizedUsd: GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD,
			})
		: Object.freeze({ status: "ALREADY_RESERVED" as const });
}
