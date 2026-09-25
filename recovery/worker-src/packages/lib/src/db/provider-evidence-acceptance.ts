import { and, eq, sql } from "drizzle-orm";
import type { OrganizationDatabase } from "./organization-transaction";
import { withOrganizationTransaction } from "./organization-transaction";
import { assertOwnerScopedConnection } from "./owner-scoped-connection";
import {
	svAuditEvents,
	svConfigurationLocks,
	svEvidenceAcceptanceReceipts,
	svEvidenceIndex,
	svMeasurementCycles,
	svMeasurementDatasets,
	svProviderDatasetCapabilities,
	svProviderDatasetSnapshotEvents,
	svSourceSnapshots,
} from "./schema";

export type AcceptProviderEvidenceInput = Readonly<{
	organizationId: string;
	projectId: string;
	domainId: string;
	cycleId: string;
	datasetId: string;
	datasetKey: string;
	datasetVersion: number;
	sourceSnapshotId: string;
	nativeObservationRef: string;
	expectedSource: string;
	expectedOutputSchemaVersion: string;
	dryRun: boolean;
}>;

export type ProviderEvidenceAcceptanceReceipt = Readonly<{
	schemaVersion: "provider-evidence-acceptance-receipt-v1.3";
	status: "ACCEPTED" | "ALREADY_ACCEPTED" | "DRY_RUN_ROLLED_BACK";
	providerCalls: 0;
	recurring: false;
	privatePayloadRead: false;
	sourceSnapshotRows: 1;
	evidenceRows: 1;
	acceptanceRows: 1;
	auditRows: 1;
	costRows: 0;
}>;

const acceptanceRollback = new Error("PROVIDER_EVIDENCE_ACCEPTANCE_DRY_RUN_ROLLBACK");
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredTrimmed(value: string, code: string, maximum = 256): string {
	if (!value || value !== value.trim() || value.length > maximum) throw new Error(code);
	return value;
}

function requiredUuid(value: string, code: string): string {
	if (!uuidPattern.test(value)) throw new Error(code);
	return value;
}

function databaseTimestamp(value: unknown, code: string): Date {
	const timestamp = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
	if (!timestamp || !Number.isFinite(timestamp.getTime())) throw new Error(code);
	return timestamp;
}

function capabilityDomainMatchesEvidence(capabilityDomain: string, evidenceDomain: string): boolean {
	return (
		capabilityDomain === evidenceDomain ||
		(capabilityDomain === "ENTITY" && (evidenceDomain === "LOCAL" || evidenceDomain === "LOCAL_MAPS"))
	);
}

function acceptanceReceipt(status: ProviderEvidenceAcceptanceReceipt["status"]): ProviderEvidenceAcceptanceReceipt {
	return Object.freeze({
		schemaVersion: "provider-evidence-acceptance-receipt-v1.3" as const,
		status,
		providerCalls: 0 as const,
		recurring: false as const,
		privatePayloadRead: false as const,
		sourceSnapshotRows: 1 as const,
		evidenceRows: 1 as const,
		acceptanceRows: 1 as const,
		auditRows: 1 as const,
		costRows: 0 as const,
	});
}

function assertAcceptanceAudit(
	details: unknown,
	input: AcceptProviderEvidenceInput,
	evidenceId: string,
	capturedAt: Date,
	acceptedAt: Date,
): void {
	if (typeof details !== "object" || details === null || Array.isArray(details))
		throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_IDEMPOTENCY_MISMATCH");
	const value = details as Record<string, unknown>;
	if (
		value.schemaVersion !== "provider-evidence-acceptance-receipt-v1.3" ||
		value.evidenceId !== evidenceId ||
		value.sourceSnapshotId !== input.sourceSnapshotId ||
		value.projectId !== input.projectId ||
		value.domainId !== input.domainId ||
		value.cycleId !== input.cycleId ||
		value.datasetId !== input.datasetId ||
		value.datasetKey !== input.datasetKey ||
		value.datasetVersion !== input.datasetVersion ||
		value.organizationId !== input.organizationId ||
		value.nativeObservationRef !== input.nativeObservationRef ||
		value.source !== input.expectedSource ||
		value.outputSchemaVersion !== input.expectedOutputSchemaVersion ||
		value.capturedAt !== capturedAt.toISOString() ||
		value.acceptedAt !== acceptedAt.toISOString() ||
		value.providerCalls !== 0 ||
		value.acceptanceProviderCalls !== 0 ||
		value.recurring !== false ||
		value.privatePayloadRead !== false ||
		value.costRows !== 0
	)
		throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_IDEMPOTENCY_MISMATCH");
}

/**
 * Atomically links and accepts schema-approved provider evidence. The owner
 * control plane reads only the provider locators needed to prove the matching
 * DELIVERED journal row; snapshot payload and content hashes are never read.
 */
export async function acceptProviderEvidence(
	db: OrganizationDatabase,
	input: AcceptProviderEvidenceInput,
): Promise<ProviderEvidenceAcceptanceReceipt> {
	requiredTrimmed(input.organizationId, "PROVIDER_EVIDENCE_ACCEPTANCE_ORGANIZATION_REQUIRED");
	requiredUuid(input.projectId, "PROVIDER_EVIDENCE_ACCEPTANCE_PROJECT_INVALID");
	requiredTrimmed(input.domainId, "PROVIDER_EVIDENCE_ACCEPTANCE_DOMAIN_INVALID");
	requiredUuid(input.cycleId, "PROVIDER_EVIDENCE_ACCEPTANCE_CYCLE_INVALID");
	requiredUuid(input.datasetId, "PROVIDER_EVIDENCE_ACCEPTANCE_DATASET_INVALID");
	requiredTrimmed(input.datasetKey, "PROVIDER_EVIDENCE_ACCEPTANCE_DATASET_KEY_INVALID");
	if (!Number.isSafeInteger(input.datasetVersion) || input.datasetVersion < 1)
		throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_DATASET_VERSION_INVALID");
	requiredUuid(input.sourceSnapshotId, "PROVIDER_EVIDENCE_ACCEPTANCE_SNAPSHOT_INVALID");
	requiredTrimmed(input.nativeObservationRef, "PROVIDER_EVIDENCE_ACCEPTANCE_OBSERVATION_INVALID", 512);
	requiredTrimmed(input.expectedSource, "PROVIDER_EVIDENCE_ACCEPTANCE_SOURCE_INVALID");
	requiredTrimmed(input.expectedOutputSchemaVersion, "PROVIDER_EVIDENCE_ACCEPTANCE_OUTPUT_SCHEMA_INVALID");

	try {
		const status = await withOrganizationTransaction(db, input.organizationId, async (tx) => {
			const controlPlaneRole = await assertOwnerScopedConnection(
				tx,
				"PROVIDER_EVIDENCE_ACCEPTANCE_OWNER_SCOPE_REQUIRED",
			);
			const formalIdentity = JSON.stringify([
				input.organizationId,
				input.projectId,
				input.domainId,
				input.cycleId,
				input.datasetId,
				input.sourceSnapshotId,
				input.nativeObservationRef,
			]);
			const lock = await tx.execute(
				sql`select pg_advisory_xact_lock(hashtextextended(${formalIdentity}, 0)), true as acquired, transaction_timestamp() as accepted_at`,
			);
			const lockRow = (lock as { rows?: Array<{ acquired?: unknown; accepted_at?: unknown }> }).rows?.[0];
			if (lockRow?.acquired !== true) throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_LOCK_BUSY");
			const acceptedAt = databaseTimestamp(lockRow.accepted_at, "PROVIDER_EVIDENCE_ACCEPTANCE_DATABASE_TIME_INVALID");

			const [snapshot] = await tx
				.select({
					id: svSourceSnapshots.id,
					organizationId: svSourceSnapshots.organizationId,
					projectId: svSourceSnapshots.projectId,
					sourceType: svSourceSnapshots.sourceType,
					providerDatasetRef: svSourceSnapshots.providerDatasetRef,
					rawReference: svSourceSnapshots.rawReference,
					capabilityId: svSourceSnapshots.capabilityId,
					inputSchemaVersion: svSourceSnapshots.inputSchemaVersion,
					outputSchemaVersion: svSourceSnapshots.outputSchemaVersion,
					capturedAt: svSourceSnapshots.capturedAt,
					immutable: svSourceSnapshots.immutable,
				})
				.from(svSourceSnapshots)
				.where(
					and(
						eq(svSourceSnapshots.organizationId, input.organizationId),
						eq(svSourceSnapshots.id, input.sourceSnapshotId),
					),
				)
				.limit(1);
			if (!snapshot) throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_SNAPSHOT_NOT_FOUND");
			if (
				snapshot.organizationId !== input.organizationId ||
				snapshot.projectId !== input.projectId ||
				snapshot.sourceType !== input.expectedSource ||
				!snapshot.capabilityId ||
				!snapshot.inputSchemaVersion ||
				snapshot.outputSchemaVersion !== input.expectedOutputSchemaVersion ||
				snapshot.immutable !== true
			)
				throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_SNAPSHOT_NOT_ELIGIBLE");
			if (acceptedAt.getTime() < snapshot.capturedAt.getTime())
				throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_TIME_BEFORE_CAPTURE");
			if (!snapshot.providerDatasetRef || !snapshot.rawReference)
				throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_DELIVERED_JOURNAL_REQUIRED");

			const [deliveredJournal] = await tx
				.select({
					id: svProviderDatasetSnapshotEvents.id,
					provider: svProviderDatasetSnapshotEvents.provider,
					observedAt: svProviderDatasetSnapshotEvents.observedAt,
				})
				.from(svProviderDatasetSnapshotEvents)
				.where(
					and(
						eq(svProviderDatasetSnapshotEvents.organizationId, input.organizationId),
						eq(svProviderDatasetSnapshotEvents.projectId, input.projectId),
						eq(svProviderDatasetSnapshotEvents.source, snapshot.sourceType),
						eq(svProviderDatasetSnapshotEvents.providerDatasetId, snapshot.providerDatasetRef),
						eq(svProviderDatasetSnapshotEvents.phase, "DELIVERED"),
						sql`'brightdata:snapshot:' || ${svProviderDatasetSnapshotEvents.snapshotId} = ${snapshot.rawReference}`,
					),
				)
				.limit(1);
			if (!deliveredJournal) throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_DELIVERED_JOURNAL_REQUIRED");

			const [capability] = await tx
				.select({
					id: svProviderDatasetCapabilities.id,
					organizationId: svProviderDatasetCapabilities.organizationId,
					provider: svProviderDatasetCapabilities.provider,
					source: svProviderDatasetCapabilities.source,
					domain: svProviderDatasetCapabilities.domain,
					inputSchemaVersion: svProviderDatasetCapabilities.inputSchemaVersion,
					outputSchemaVersion: svProviderDatasetCapabilities.outputSchemaVersion,
					capabilityStatus: svProviderDatasetCapabilities.capabilityStatus,
					immutable: svProviderDatasetCapabilities.immutable,
				})
				.from(svProviderDatasetCapabilities)
				.where(
					and(
						eq(svProviderDatasetCapabilities.organizationId, input.organizationId),
						eq(svProviderDatasetCapabilities.id, snapshot.capabilityId),
					),
				)
				.limit(1);
			if (
				!capability ||
				capability.organizationId !== input.organizationId ||
				capability.source !== input.expectedSource ||
				capability.inputSchemaVersion !== snapshot.inputSchemaVersion ||
				capability.outputSchemaVersion !== input.expectedOutputSchemaVersion ||
				!capabilityDomainMatchesEvidence(capability.domain, input.domainId) ||
				(capability.capabilityStatus !== "PILOT_ONLY" && capability.capabilityStatus !== "ALLOWED") ||
				capability.immutable !== true
			)
				throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_CAPABILITY_NOT_ELIGIBLE");
			if (
				deliveredJournal.provider !== capability.provider ||
				deliveredJournal.observedAt.getTime() < snapshot.capturedAt.getTime()
			)
				throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_DELIVERED_JOURNAL_REQUIRED");

			const [cycle] = await tx
				.select({
					id: svMeasurementCycles.id,
					organizationId: svMeasurementCycles.organizationId,
					domainId: svMeasurementCycles.domainId,
					configurationLockId: svMeasurementCycles.configurationLockId,
					status: svMeasurementCycles.status,
				})
				.from(svMeasurementCycles)
				.where(
					and(
						eq(svMeasurementCycles.organizationId, input.organizationId),
						eq(svMeasurementCycles.id, input.cycleId),
						eq(svMeasurementCycles.domainId, input.domainId),
					),
				)
				.limit(1);
			if (
				!cycle ||
				cycle.organizationId !== input.organizationId ||
				cycle.domainId !== input.domainId ||
				cycle.status !== "COMPLETED"
			)
				throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_CYCLE_MISMATCH");

			const [configurationLock] = await tx
				.select({
					id: svConfigurationLocks.id,
					organizationId: svConfigurationLocks.organizationId,
					projectId: svConfigurationLocks.projectId,
				})
				.from(svConfigurationLocks)
				.where(
					and(
						eq(svConfigurationLocks.organizationId, input.organizationId),
						eq(svConfigurationLocks.id, cycle.configurationLockId),
						eq(svConfigurationLocks.projectId, input.projectId),
					),
				)
				.limit(1);
			if (!configurationLock || configurationLock.projectId !== input.projectId)
				throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_PROJECT_MISMATCH");

			const [dataset] = await tx
				.select({
					id: svMeasurementDatasets.id,
					organizationId: svMeasurementDatasets.organizationId,
					cycleId: svMeasurementDatasets.cycleId,
					datasetKey: svMeasurementDatasets.datasetKey,
					version: svMeasurementDatasets.version,
					immutable: svMeasurementDatasets.immutable,
				})
				.from(svMeasurementDatasets)
				.where(
					and(
						eq(svMeasurementDatasets.organizationId, input.organizationId),
						eq(svMeasurementDatasets.id, input.datasetId),
						eq(svMeasurementDatasets.cycleId, input.cycleId),
					),
				)
				.limit(1);
			if (
				!dataset ||
				dataset.organizationId !== input.organizationId ||
				dataset.cycleId !== input.cycleId ||
				dataset.datasetKey !== input.datasetKey ||
				dataset.version !== input.datasetVersion ||
				dataset.immutable !== true
			)
				throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_DATASET_MISMATCH");

			const existingEvidence = await tx
				.select({
					id: svEvidenceIndex.id,
					organizationId: svEvidenceIndex.organizationId,
					projectId: svEvidenceIndex.projectId,
					domainId: svEvidenceIndex.domainId,
					cycleId: svEvidenceIndex.cycleId,
					observationRef: svEvidenceIndex.observationRef,
					datasetId: svEvidenceIndex.datasetId,
					sourceSnapshotId: svEvidenceIndex.sourceSnapshotId,
					capturedAt: svEvidenceIndex.capturedAt,
				})
				.from(svEvidenceIndex)
				.where(
					and(
						eq(svEvidenceIndex.organizationId, input.organizationId),
						eq(svEvidenceIndex.projectId, input.projectId),
						eq(svEvidenceIndex.domainId, input.domainId),
						eq(svEvidenceIndex.cycleId, input.cycleId),
						eq(svEvidenceIndex.datasetId, input.datasetId),
						eq(svEvidenceIndex.sourceSnapshotId, input.sourceSnapshotId),
						eq(svEvidenceIndex.observationRef, input.nativeObservationRef),
					),
				)
				.limit(2);

			let evidenceId: string;
			if (existingEvidence.length > 0) {
				const evidence = existingEvidence[0];
				if (
					existingEvidence.length !== 1 ||
					!evidence ||
					evidence.organizationId !== input.organizationId ||
					evidence.projectId !== input.projectId ||
					evidence.domainId !== input.domainId ||
					evidence.cycleId !== input.cycleId ||
					evidence.observationRef !== input.nativeObservationRef ||
					evidence.datasetId !== input.datasetId ||
					evidence.sourceSnapshotId !== input.sourceSnapshotId ||
					evidence.capturedAt.getTime() !== snapshot.capturedAt.getTime()
				)
					throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_IDEMPOTENCY_MISMATCH");
				evidenceId = evidence.id;
			} else {
				const [evidence] = await tx
					.insert(svEvidenceIndex)
					.values({
						organizationId: input.organizationId,
						projectId: input.projectId,
						domainId: input.domainId,
						cycleId: input.cycleId,
						observationRef: input.nativeObservationRef,
						datasetId: input.datasetId,
						sourceSnapshotId: input.sourceSnapshotId,
						// Preserve PostgreSQL microseconds. A JavaScript Date is only
						// millisecond-precise, while the acceptance trigger intentionally
						// requires exact equality with the immutable snapshot timestamp.
						capturedAt: sql`(
							SELECT "source"."captured_at"
							FROM "sv_source_snapshots" AS "source"
							WHERE "source"."id" = ${input.sourceSnapshotId}
								AND "source"."organization_id" = ${input.organizationId}
						)`,
					})
					.returning({ id: svEvidenceIndex.id });
				if (!evidence) throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_EVIDENCE_PERSISTENCE_FAILED");
				evidenceId = evidence.id;
			}

			const existingAcceptances = await tx
				.select({
					id: svEvidenceAcceptanceReceipts.id,
					evidenceId: svEvidenceAcceptanceReceipts.evidenceId,
					organizationId: svEvidenceAcceptanceReceipts.organizationId,
					acceptedAt: svEvidenceAcceptanceReceipts.acceptedAt,
					acceptedBy: svEvidenceAcceptanceReceipts.acceptedBy,
				})
				.from(svEvidenceAcceptanceReceipts)
				.where(
					and(
						eq(svEvidenceAcceptanceReceipts.organizationId, input.organizationId),
						eq(svEvidenceAcceptanceReceipts.evidenceId, evidenceId),
					),
				)
				.limit(2);
			const existingAudits = await tx
				.select({ id: svAuditEvents.id, details: svAuditEvents.details })
				.from(svAuditEvents)
				.where(
					and(
						eq(svAuditEvents.organizationId, input.organizationId),
						eq(svAuditEvents.event, "PROVIDER_EVIDENCE_FORMALLY_ACCEPTED"),
						eq(svAuditEvents.subjectKind, "evidence"),
						eq(svAuditEvents.subjectId, evidenceId),
					),
				)
				.limit(2);

			if (existingAcceptances.length > 0 || existingAudits.length > 0) {
				const acceptance = existingAcceptances[0];
				const audit = existingAudits[0];
				if (
					existingAcceptances.length !== 1 ||
					existingAudits.length !== 1 ||
					!acceptance ||
					!audit ||
					acceptance.organizationId !== input.organizationId ||
					acceptance.evidenceId !== evidenceId ||
					acceptance.acceptedBy !== `database-role:${controlPlaneRole}`
				)
					throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_IDEMPOTENCY_MISMATCH");
				assertAcceptanceAudit(audit.details, input, evidenceId, snapshot.capturedAt, acceptance.acceptedAt);
				if (input.dryRun) throw acceptanceRollback;
				return "ALREADY_ACCEPTED" as const;
			}

			const [acceptance] = await tx
				.insert(svEvidenceAcceptanceReceipts)
				.values({
					organizationId: input.organizationId,
					evidenceId,
					acceptedAt,
					acceptedBy: `database-role:${controlPlaneRole}`,
				})
				.returning({ id: svEvidenceAcceptanceReceipts.id });
			if (!acceptance) throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_RECEIPT_PERSISTENCE_FAILED");

			const [audit] = await tx
				.insert(svAuditEvents)
				.values({
					organizationId: input.organizationId,
					actorId: "system:provider-evidence-acceptance",
					event: "PROVIDER_EVIDENCE_FORMALLY_ACCEPTED",
					subjectKind: "evidence",
					subjectId: evidenceId,
					details: {
						schemaVersion: "provider-evidence-acceptance-receipt-v1.3",
						evidenceId,
						organizationId: input.organizationId,
						sourceSnapshotId: input.sourceSnapshotId,
						projectId: input.projectId,
						domainId: input.domainId,
						cycleId: input.cycleId,
						datasetId: input.datasetId,
						datasetKey: input.datasetKey,
						datasetVersion: input.datasetVersion,
						nativeObservationRef: input.nativeObservationRef,
						source: input.expectedSource,
						outputSchemaVersion: input.expectedOutputSchemaVersion,
						capturedAt: snapshot.capturedAt.toISOString(),
						acceptedAt: acceptedAt.toISOString(),
						providerCalls: 0,
						acceptanceProviderCalls: 0,
						recurring: false,
						privatePayloadRead: false,
						costRows: 0,
					},
				})
				.returning({ id: svAuditEvents.id });
			if (!audit) throw new Error("PROVIDER_EVIDENCE_ACCEPTANCE_AUDIT_PERSISTENCE_FAILED");
			if (input.dryRun) throw acceptanceRollback;
			return "ACCEPTED" as const;
		});
		return acceptanceReceipt(status);
	} catch (error) {
		if (error === acceptanceRollback) return acceptanceReceipt("DRY_RUN_ROLLED_BACK");
		throw error;
	}
}
