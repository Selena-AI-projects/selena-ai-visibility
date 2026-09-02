import { readFileSync } from "node:fs";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";
import { acceptProviderEvidence } from "./provider-evidence-acceptance";
import * as schema from "./schema";

const ids = {
	project: "11111111-1111-4111-8111-111111111111",
	cycle: "22222222-2222-4222-8222-222222222222",
	lock: "33333333-3333-4333-8333-333333333333",
	dataset: "44444444-4444-4444-8444-444444444444",
	snapshot: "55555555-5555-4555-8555-555555555555",
	capability: "66666666-6666-4666-8666-666666666666",
	evidence: "77777777-7777-4777-8777-777777777777",
	acceptance: "88888888-8888-4888-8888-888888888888",
	audit: "99999999-9999-4999-8999-999999999999",
} as const;

function acceptanceInput(dryRun = false) {
	return {
		organizationId: "tenant-a",
		projectId: ids.project,
		domainId: "AI",
		cycleId: ids.cycle,
		datasetId: ids.dataset,
		datasetKey: "google-ai-mode-answers",
		datasetVersion: 1,
		sourceSnapshotId: ids.snapshot,
		nativeObservationRef: "GOOGLE_AI_MODE|question-1|repeat-0",
		expectedSource: "GOOGLE_AI_MODE",
		expectedOutputSchemaVersion: "google-ai-mode-output-v1",
		dryRun,
	} as const;
}

function acceptanceDatabase(
	options: Readonly<{
		role?: string;
		outputSchemaVersion?: string | null;
		capabilityStatus?: string;
		cycleStatus?: string;
		snapshotProjectId?: string | null;
		deliveredJournal?: boolean;
		deliveredProvider?: string;
		deliveredObservedAt?: Date;
	}> = {},
) {
	const snapshot = {
		id: ids.snapshot,
		organizationId: "tenant-a",
		projectId: options.snapshotProjectId === undefined ? ids.project : options.snapshotProjectId,
		sourceType: "GOOGLE_AI_MODE",
		providerDatasetRef: "gd_google_ai_mode",
		rawReference: "brightdata:snapshot:snapshot-1",
		capabilityId: ids.capability,
		inputSchemaVersion: "google-ai-mode-input-v1",
		outputSchemaVersion:
			options.outputSchemaVersion === undefined ? "google-ai-mode-output-v1" : options.outputSchemaVersion,
		capturedAt: new Date("2026-09-02T03:00:00.000Z"),
		immutable: true,
	};
	const capability = {
		id: ids.capability,
		organizationId: "tenant-a",
		provider: "BRIGHT_DATA",
		source: "GOOGLE_AI_MODE",
		domain: "AI",
		inputSchemaVersion: "google-ai-mode-input-v1",
		outputSchemaVersion: "google-ai-mode-output-v1",
		capabilityStatus: options.capabilityStatus ?? "PILOT_ONLY",
		immutable: true,
	};
	const cycle = {
		id: ids.cycle,
		organizationId: "tenant-a",
		domainId: "AI",
		configurationLockId: ids.lock,
		status: options.cycleStatus ?? "COMPLETED",
	};
	const configurationLock = {
		id: ids.lock,
		organizationId: "tenant-a",
		projectId: ids.project,
	};
	const dataset = {
		id: ids.dataset,
		organizationId: "tenant-a",
		cycleId: ids.cycle,
		datasetKey: "google-ai-mode-answers",
		version: 1,
		immutable: true,
	};
	const durable = {
		evidence: [] as Array<Record<string, unknown>>,
		acceptances: [] as Array<Record<string, unknown>>,
		audits: [] as Array<Record<string, unknown>>,
	};
	const attempted: Array<{ table: unknown; value: Record<string, unknown> }> = [];
	const selections: Array<{ table: unknown; keys: string[] }> = [];
	const rollbacks = { count: 0 };
	const execute = vi.fn(async () => {
		if (execute.mock.calls.length % 3 === 0)
			return {
				rows: [
					{
						acquired: true,
						accepted_at: new Date("2026-09-02T04:00:00.000Z"),
					},
				],
			};
		return {
			rows: [
				{
					role: options.role ?? "postgres",
					session_role: options.role ?? "postgres",
					owner_role: "postgres",
				},
			],
		};
	});
	const transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => {
		const staged: Array<{ table: unknown; value: Record<string, unknown> }> = [];
		const select = vi.fn((projection?: Record<string, unknown>) => ({
			from: (table: unknown) => {
				selections.push({ table, keys: Object.keys(projection ?? {}) });
				return {
					where: () => ({
						limit: async (limit: number) => {
							if (table === schema.svSourceSnapshots) return [snapshot].slice(0, limit);
							if (table === schema.svProviderDatasetSnapshotEvents)
								return options.deliveredJournal === false
									? []
									: [
											{
												id: "journal-delivered",
												provider: options.deliveredProvider ?? "BRIGHT_DATA",
												observedAt: options.deliveredObservedAt ?? new Date("2026-09-02T03:01:00.000Z"),
											},
										].slice(0, limit);
							if (table === schema.svProviderDatasetCapabilities) return [capability].slice(0, limit);
							if (table === schema.svMeasurementCycles) return [cycle].slice(0, limit);
							if (table === schema.svConfigurationLocks) return [configurationLock].slice(0, limit);
							if (table === schema.svMeasurementDatasets) return [dataset].slice(0, limit);
							if (table === schema.svEvidenceIndex) return durable.evidence.slice(0, limit);
							if (table === schema.svEvidenceAcceptanceReceipts) return durable.acceptances.slice(0, limit);
							if (table === schema.svAuditEvents) return durable.audits.slice(0, limit);
							return [];
						},
					}),
				};
			},
		}));
		const insert = vi.fn((table: unknown) => ({
			values: (value: Record<string, unknown>) => {
				attempted.push({ table, value });
				const id =
					table === schema.svEvidenceIndex
						? ids.evidence
						: table === schema.svEvidenceAcceptanceReceipts
							? ids.acceptance
							: ids.audit;
				staged.push({
					table,
					value: {
						id,
						...value,
						...(table === schema.svEvidenceIndex ? { capturedAt: snapshot.capturedAt } : {}),
					},
				});
				return { returning: async () => [{ id }] };
			},
		}));
		let result: unknown;
		try {
			result = await work({ execute, select, insert });
		} catch (error) {
			rollbacks.count += 1;
			throw error;
		}
		for (const item of staged) {
			if (item.table === schema.svEvidenceIndex) durable.evidence.push(item.value);
			if (item.table === schema.svEvidenceAcceptanceReceipts) durable.acceptances.push(item.value);
			if (item.table === schema.svAuditEvents) durable.audits.push(item.value);
		}
		return result;
	});
	return {
		db: { transaction } as unknown as NodePgDatabase<typeof schema>,
		durable,
		attempted,
		selections,
		rollbacks,
		execute,
	};
}

describe("acceptProviderEvidence", () => {
	it("rejects selena_app before reading any evidence metadata", async () => {
		const state = acceptanceDatabase({ role: "selena_app" });

		await expect(acceptProviderEvidence(state.db, acceptanceInput(true))).rejects.toThrow(
			"PROVIDER_EVIDENCE_ACCEPTANCE_OWNER_SCOPE_REQUIRED",
		);
		expect(state.selections).toHaveLength(0);
		expect(state.attempted).toHaveLength(0);
	});

	it("rejects a privileged operations role that does not own the acceptance table", async () => {
		const state = acceptanceDatabase({ role: "migration_admin" });

		await expect(acceptProviderEvidence(state.db, acceptanceInput())).rejects.toThrow(
			"PROVIDER_EVIDENCE_ACCEPTANCE_OWNER_SCOPE_REQUIRED",
		);
		expect(state.selections).toHaveLength(0);
		expect(state.attempted).toHaveLength(0);
	});

	it("keeps a raw CANARY_ONLY snapshot ineligible without reading its private payload", async () => {
		const state = acceptanceDatabase({ outputSchemaVersion: null, capabilityStatus: "CANARY_ONLY" });

		await expect(acceptProviderEvidence(state.db, acceptanceInput())).rejects.toThrow(
			"PROVIDER_EVIDENCE_ACCEPTANCE_SNAPSHOT_NOT_ELIGIBLE",
		);
		expect(state.attempted).toHaveLength(0);
		const snapshotProjection = state.selections.find((entry) => entry.table === schema.svSourceSnapshots);
		expect(snapshotProjection?.keys).toEqual([
			"id",
			"organizationId",
			"projectId",
			"sourceType",
			"providerDatasetRef",
			"rawReference",
			"capabilityId",
			"inputSchemaVersion",
			"outputSchemaVersion",
			"capturedAt",
			"immutable",
		]);
		for (const privateColumn of ["snapshot", "sourceRef", "contentSha256", "environment"])
			expect(snapshotProjection?.keys).not.toContain(privateColumn);
	});

	it("uses the complete tenant/project evidence tuple with a blocking transaction lock", async () => {
		const state = acceptanceDatabase();
		await acceptProviderEvidence(state.db, acceptanceInput(true));
		const serviceSource = readFileSync(new URL("./provider-evidence-acceptance.ts", import.meta.url), "utf8");
		expect(serviceSource).toContain("pg_advisory_xact_lock");
		expect(serviceSource).not.toContain("pg_try_advisory_xact_lock");
		expect(serviceSource).toContain("input.organizationId");
		expect(serviceSource).toContain("input.projectId");
		expect(state.execute).toHaveBeenCalled();
	});

	it("rejects a snapshot from another project before creating evidence", async () => {
		const state = acceptanceDatabase({ snapshotProjectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
		await expect(acceptProviderEvidence(state.db, acceptanceInput())).rejects.toThrow(
			"PROVIDER_EVIDENCE_ACCEPTANCE_SNAPSHOT_NOT_ELIGIBLE",
		);
		expect(state.attempted).toHaveLength(0);
	});

	it("requires a project-matching DELIVERED snapshot journal", async () => {
		const state = acceptanceDatabase({ deliveredJournal: false });
		await expect(acceptProviderEvidence(state.db, acceptanceInput())).rejects.toThrow(
			"PROVIDER_EVIDENCE_ACCEPTANCE_DELIVERED_JOURNAL_REQUIRED",
		);
		expect(state.attempted).toHaveLength(0);
	});

	it.each([
		["another provider", { deliveredProvider: "OTHER_PROVIDER" }],
		["delivery before capture", { deliveredObservedAt: new Date("2026-09-02T02:59:59.000Z") }],
	])("rejects %s as delivered provenance", async (_label, options) => {
		const state = acceptanceDatabase(options);
		await expect(acceptProviderEvidence(state.db, acceptanceInput())).rejects.toThrow(
			"PROVIDER_EVIDENCE_ACCEPTANCE_DELIVERED_JOURNAL_REQUIRED",
		);
		expect(state.attempted).toHaveLength(0);
	});

	it("rejects an incomplete measurement cycle before creating evidence", async () => {
		const state = acceptanceDatabase({ cycleStatus: "CREATED" });

		await expect(acceptProviderEvidence(state.db, acceptanceInput())).rejects.toThrow(
			"PROVIDER_EVIDENCE_ACCEPTANCE_CYCLE_MISMATCH",
		);
		expect(state.attempted).toHaveLength(0);
	});

	it("creates one evidence row, one immutable acceptance and one audit row", async () => {
		const state = acceptanceDatabase();

		await expect(acceptProviderEvidence(state.db, acceptanceInput())).resolves.toEqual({
			schemaVersion: "provider-evidence-acceptance-receipt-v1.3",
			status: "ACCEPTED",
			providerCalls: 0,
			recurring: false,
			privatePayloadRead: false,
			sourceSnapshotRows: 1,
			evidenceRows: 1,
			acceptanceRows: 1,
			auditRows: 1,
			costRows: 0,
		});
		expect(state.durable.evidence).toHaveLength(1);
		expect(state.durable.acceptances).toHaveLength(1);
		expect(state.durable.audits).toHaveLength(1);
		expect(state.durable.audits[0]).toMatchObject({
			event: "PROVIDER_EVIDENCE_FORMALLY_ACCEPTED",
			actorId: "system:provider-evidence-acceptance",
			details: {
				organizationId: "tenant-a",
				projectId: ids.project,
				nativeObservationRef: "GOOGLE_AI_MODE|question-1|repeat-0",
				providerCalls: 0,
				acceptanceProviderCalls: 0,
				recurring: false,
				privatePayloadRead: false,
				costRows: 0,
			},
		});
		expect(state.durable.acceptances[0]).toMatchObject({ acceptedBy: "database-role:postgres" });
		expect(JSON.stringify(state.durable.audits)).not.toContain("database-role:postgres");
	});

	it("exercises all writes and rolls them back in dry-run mode", async () => {
		const state = acceptanceDatabase();

		await expect(acceptProviderEvidence(state.db, acceptanceInput(true))).resolves.toMatchObject({
			status: "DRY_RUN_ROLLED_BACK",
			providerCalls: 0,
			privatePayloadRead: false,
		});
		expect(state.attempted.filter((entry) => entry.table === schema.svEvidenceIndex)).toHaveLength(1);
		expect(state.attempted.filter((entry) => entry.table === schema.svEvidenceAcceptanceReceipts)).toHaveLength(1);
		expect(state.attempted.filter((entry) => entry.table === schema.svAuditEvents)).toHaveLength(1);
		expect(state.durable.evidence).toHaveLength(0);
		expect(state.durable.acceptances).toHaveLength(0);
		expect(state.durable.audits).toHaveLength(0);
		expect(state.rollbacks.count).toBe(1);
	});

	it("returns ALREADY_ACCEPTED on exact replay without duplicate rows", async () => {
		const state = acceptanceDatabase();
		const input = acceptanceInput();

		await expect(acceptProviderEvidence(state.db, input)).resolves.toMatchObject({
			status: "ACCEPTED",
			providerCalls: 0,
		});
		const attemptedAfterFirst = state.attempted.length;
		await expect(acceptProviderEvidence(state.db, input)).resolves.toMatchObject({
			status: "ALREADY_ACCEPTED",
			providerCalls: 0,
		});
		expect(state.attempted).toHaveLength(attemptedAfterFirst);
		expect(state.durable.evidence).toHaveLength(1);
		expect(state.durable.acceptances).toHaveLength(1);
		expect(state.durable.audits).toHaveLength(1);

		await expect(acceptProviderEvidence(state.db, { ...input, dryRun: true })).resolves.toMatchObject({
			status: "DRY_RUN_ROLLED_BACK",
			providerCalls: 0,
		});
		expect(state.attempted).toHaveLength(attemptedAfterFirst);
		expect(state.durable.evidence).toHaveLength(1);
		expect(state.durable.acceptances).toHaveLength(1);
		expect(state.durable.audits).toHaveLength(1);
		expect(state.rollbacks.count).toBe(1);
	});
});

describe("formal evidence acceptance migration", () => {
	const migration = readFileSync(
		new URL("./migrations/0056_formal_evidence_acceptance_hardening.sql", import.meta.url),
		"utf8",
	);
	const projectIdentityMigration = readFileSync(
		new URL("./migrations/0057_evidence_project_identity_hardening.sql", import.meta.url),
		"utf8",
	);
	const roleBootstrap = readFileSync(new URL("../../scripts/selena-rls-runtime-role.sql", import.meta.url), "utf8");

	it("enforces eligibility independently of the owner service", () => {
		expect(migration).toContain('CREATE OR REPLACE FUNCTION "sv_enforce_evidence_acceptance_receipt"');
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_OWNER_SCOPE_REQUIRED");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_IDENTITY_MISMATCH");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_AUDIT_REQUIRED");
		expect(migration).toContain("FORMAL_EVIDENCE_AUDIT_RECEIPT_REQUIRED");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_LEGACY_REVIEW_REQUIRED");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_MIGRATION_OWNER_BYPASS_REQUIRED");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_CYCLE_NOT_COMPLETE");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_SCHEMA_NOT_APPROVED");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_DOMAIN_MISMATCH");
		expect(migration).toContain("capability_status NOT IN ('PILOT_ONLY', 'ALLOWED')");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_CANARY_FORBIDDEN");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_CAPTURE_TIME_MISMATCH");
		expect(migration).toContain("EVIDENCE_ACCEPTANCE_CAPABILITY_SUPERSEDED_BY_BLOCK");
	});

	it("keeps capability promotion and formal audit owner-scoped", () => {
		expect(migration).toContain("PROVIDER_DATASET_CAPABILITY_PROMOTION_OWNER_SCOPE_REQUIRED");
		expect(migration).toContain("SOURCE_SNAPSHOT_SCHEMA_PROMOTION_OWNER_SCOPE_REQUIRED");
		expect(migration).toContain("FORMAL_EVIDENCE_AUDIT_OWNER_SCOPE_REQUIRED");
		expect(migration).toContain('CREATE TRIGGER "sv_evidence_acceptance_receipts_owner_guard"');
		expect(migration).toContain('CREATE CONSTRAINT TRIGGER "sv_evidence_acceptance_receipts_audit_pair_guard"');
		expect(migration).toContain('CREATE CONSTRAINT TRIGGER "sv_audit_events_formal_evidence_receipt_pair_guard"');
		expect(migration).toContain("NEW.\"capability_status\" <> 'CANARY_ONLY'");
		expect(migration).toContain('NEW."output_schema_version" IS NOT NULL');
		expect(roleBootstrap).toContain("GRANT SELECT, INSERT ON\n\tsv_audit_events, sv_provider_dataset_capabilities");
		expect(roleBootstrap).toContain("SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0057");
	});

	it("makes the formal audit unique and freezes accepted provenance dependencies", () => {
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_audit_events_formal_evidence_acceptance_unique"');
		expect(migration).toContain("FORMAL_EVIDENCE_AUDIT_IMMUTABLE");
		expect(migration).toContain("ACCEPTED_EVIDENCE_CYCLE_IMMUTABLE");
		expect(migration).toContain("ACCEPTED_EVIDENCE_DATASET_IMMUTABLE");
		expect(migration).toContain('BEFORE UPDATE OR DELETE ON "sv_measurement_cycles"');
		expect(migration).toContain('BEFORE UPDATE OR DELETE ON "sv_measurement_datasets"');
	});

	it("scopes formal identity to tenant and project-bound delivered provenance", () => {
		expect(projectIdentityMigration).toContain('ADD COLUMN IF NOT EXISTS "project_id" uuid');
		expect(projectIdentityMigration).toContain('ADD CONSTRAINT "sv_evidence_index_formal_identity_unique"');
		expect(projectIdentityMigration).toContain('"organization_id", "project_id", "domain_id", "cycle_id"');
		expect(projectIdentityMigration).toContain("EVIDENCE_ACCEPTANCE_DELIVERED_JOURNAL_REQUIRED");
		expect(projectIdentityMigration).toContain("EVIDENCE_ACCEPTANCE_ENVIRONMENT_NOT_APPROVED");
		expect(projectIdentityMigration).toContain("PROVIDER_DATASET_EVIDENCE_PROJECT_MISMATCH");
		expect(projectIdentityMigration).toContain("NEW.\"domain_id\" IN ('LOCAL', 'LOCAL_MAPS')");
	});
});
