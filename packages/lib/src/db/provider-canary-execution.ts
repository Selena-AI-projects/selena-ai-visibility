import { and, desc, eq } from "drizzle-orm";
import { googleAiModeDatasetAdapter } from "../adapters/google-dataset-adapters";
import type { PreparedProviderDatasetCanary, ProviderDatasetRawCapture } from "../providers/dataset-registry";
import {
	GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
	type GoogleAiModeCanaryReceipt,
} from "../providers/google-ai-mode-one-shot-canary";
import { type OrganizationDatabase, withOrganizationTransaction } from "./organization-transaction";
import { svAuditEvents, svProviderCanaryExecutions, svProviderDatasetCapabilities, svSourceSnapshots } from "./schema";

export const GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD = 0.25 as const;

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
