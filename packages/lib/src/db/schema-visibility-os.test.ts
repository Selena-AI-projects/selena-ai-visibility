import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getTableConfig, getViewConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";

const registryTables = [
	schema.svMeasurementDomains,
	schema.svMeasurementCycles,
	schema.svMeasurementDatasets,
	schema.svSourceSnapshots,
	schema.svEvidenceIndex,
];

const localTables = [
	schema.svLocalKeywords,
	schema.svGridDefinitions,
	schema.svGridPoints,
	schema.svLocalScanCycles,
	schema.svLocalRankObservations,
	schema.svLocalCompetitorObservations,
	schema.svLocalVisibilityMetrics,
];

const attemptTables = [schema.svMeasurementAttempts];
const attemptResultTables = [schema.svMeasurementAttemptResults];

const searchAndReputationTables = [
	schema.svSearchQueries,
	schema.svSearchRankObservations,
	schema.svReputationSources,
	schema.svReviewSnapshots,
	schema.svReviewVelocityMetrics,
	schema.svReviewTopicObservations,
];

const actionAndEvidenceTables = [
	schema.svApprovedActions,
	schema.svActionApprovals,
	schema.svChangeEvents,
	schema.svChangeEventAssets,
	schema.svVerificationCycles,
	schema.svAttributionAssessments,
];

const outcomeTables = [
	schema.svOutcomeSources,
	schema.svOutcomeMetricDefinitions,
	schema.svOutcomeObservations,
	schema.svOutcomeAttributionWindows,
];

describe("Visibility OS measurement registry", () => {
	it("exports the five RLS-enabled registry tables without a shared observation table", () => {
		expect(registryTables.map((table) => getTableConfig(table).name)).toEqual([
			"sv_measurement_domains",
			"sv_measurement_cycles",
			"sv_measurement_datasets",
			"sv_source_snapshots",
			"sv_evidence_index",
		]);
		for (const table of registryTables) expect(getTableConfig(table).enableRLS).toBe(true);
		expect("svMeasurementObservations" in schema).toBe(false);
	});

	it("keeps the existing AI cycle, permit and run contracts unchanged", () => {
		expect(getTableConfig(schema.svCycles).columns.map((column) => column.name)).toEqual([
			"id",
			"organization_id",
			"order_id",
			"lock_id",
			"status",
			"expected_runs",
			"created_runs",
			"completed_runs",
			"created_at",
			"updated_at",
		]);
		expect(getTableConfig(schema.svRunPermits).columns.map((column) => column.name)).toEqual([
			"id",
			"organization_id",
			"cycle_id",
			"dispatch_key",
			"channel",
			"scenario_id",
			"system_id",
			"status",
			"expires_at",
			"consumed_at",
			"created_at",
		]);
		expect(getTableConfig(schema.svRuns).columns.map((column) => column.name)).toEqual([
			"id",
			"organization_id",
			"cycle_id",
			"permit_id",
			"dispatch_key",
			"channel",
			"scenario_id",
			"system_id",
			"status",
			"validity",
			"invalid_reason",
			"cost_usd",
			"cost_basis",
			"token_input",
			"token_output",
			"system",
			"model",
			"language",
			"region",
			"mention",
			"position",
			"owned_citation",
			"citations",
			"competitors",
			"factual_errors",
			"extractor_version",
			"capture_mode",
			"raw_response_reference",
			"canonical_payload",
			"started_at",
			"finished_at",
			"created_at",
		]);
	});

	it("keeps schema, numbered SQL and the owner-run backfill aligned", () => {
		const migration = readFileSync(
			new URL("./migrations/0037_visibility_os_measurement_registry.sql", import.meta.url),
			"utf8",
		);
		const backfill = readFileSync(
			new URL("../../scripts/backfill-visibility-os-ai-cycles.sql", import.meta.url),
			"utf8",
		);

		for (const table of registryTables) {
			const name = getTableConfig(table).name;
			expect(migration).toContain(`CREATE TABLE "${name}"`);
			expect(migration).toContain(`ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY`);
			expect(migration).toContain(`CREATE POLICY "tenant_isolation" ON "${name}"`);
		}
		expect(migration).toContain('CREATE VIEW "sv_measurement_cycles_compat" WITH (security_invoker = true)');
		expect(migration).toContain("('AI', 'scenario_system_repeat')");
		expect(migration).toContain("('SEARCH', 'query_engine_region_device')");
		expect(migration).toContain("('LOCAL', 'location_keyword_coordinate_provider')");
		expect(migration).toContain("('REPUTATION', 'location_source_period')");
		expect(migration).toContain("('OUTCOME', 'project_location_metric_period')");
		expect(migration).not.toContain("measurement_observations");
		expect(migration).not.toContain('INSERT INTO "sv_measurement_cycles"');
		expect(backfill).toContain('INSERT INTO "sv_measurement_cycles"');
		expect(backfill).toContain('FROM "sv_cycles"');
	});
});

describe("Visibility OS provider evidence provenance", () => {
	it("models append-only tenant capability versions without activating Social or Travel domains", () => {
		const table = getTableConfig(schema.svProviderDatasetCapabilities);
		const dialect = new PgDialect();
		expect(table.name).toBe("sv_provider_dataset_capabilities");
		expect(table.enableRLS).toBe(true);
		expect(
			table.indexes.find((index) => index.config.name === "sv_provider_dataset_capabilities_org_source_version_unique")
				?.config.unique,
		).toBe(true);
		expect(table.checks.map((candidate) => candidate.name)).toEqual(
			expect.arrayContaining([
				"sv_provider_dataset_capabilities_shape_check",
				"sv_provider_dataset_capabilities_domain_check",
				"sv_provider_dataset_capabilities_status_check",
				"sv_provider_dataset_capabilities_access_class_check",
			]),
		);
		const domainCheck = table.checks.find(
			(candidate) => candidate.name === "sv_provider_dataset_capabilities_domain_check",
		);
		const statusCheck = table.checks.find(
			(candidate) => candidate.name === "sv_provider_dataset_capabilities_status_check",
		);
		expect(domainCheck && dialect.sqlToQuery(domainCheck.value).sql).toContain("'SOCIAL', 'TRAVEL'");
		expect(statusCheck && dialect.sqlToQuery(statusCheck.value).sql).toContain("'CANARY_ONLY'");
	});

	it("binds provider captures to a capability in the same tenant while allowing pre-discovery output schema", () => {
		const snapshot = getTableConfig(schema.svSourceSnapshots);
		const capabilityReference = snapshot.foreignKeys.find(
			(candidate) => candidate.getName() === "sv_source_snapshots_capability_org_fk",
		);
		const metadataCheck = snapshot.checks.find(
			(candidate) => candidate.name === "sv_source_snapshots_provider_capture_metadata_check",
		);
		const outputSchema = snapshot.columns.find((column) => column.name === "output_schema_version");
		const compiledCheck = metadataCheck && new PgDialect().sqlToQuery(metadataCheck.value).sql;
		expect(capabilityReference?.reference().columns.map((column) => column.name)).toEqual([
			"capability_id",
			"organization_id",
		]);
		expect(capabilityReference?.reference().foreignColumns.map((column) => column.name)).toEqual([
			"id",
			"organization_id",
		]);
		expect(outputSchema?.notNull).toBe(false);
		expect(compiledCheck).toContain('"output_schema_version" IS NULL');
	});

	it("keeps the provenance view private, tenant-invoker scoped and free of normalized Social or Travel tables", () => {
		const migration = readFileSync(
			new URL("./migrations/0051_visibility_os_provider_evidence_provenance.sql", import.meta.url),
			"utf8",
		);
		expect(getViewConfig(schema.svEvidenceProvenance)).toMatchObject({
			name: "sv_evidence_provenance",
			isExisting: true,
		});
		expect(migration).toContain('CREATE VIEW "sv_evidence_provenance" WITH (security_invoker = true)');
		expect(migration).toContain('CREATE POLICY "tenant_isolation" ON "sv_provider_dataset_capabilities"');
		expect(migration).toContain('ALTER TABLE "sv_provider_dataset_capabilities" FORCE ROW LEVEL SECURITY');
		expect(migration).toContain('FOREIGN KEY ("capability_id", "organization_id")');
		expect(migration).toContain("PROVIDER_DATASET_CAPABILITY_IMMUTABLE");
		expect(migration).toContain("PROVIDER_DATASET_CAPABILITY_VERSION_NOT_MONOTONIC");
		expect(migration).toContain("PROVIDER_DATASET_SNAPSHOT_CONTRACT_MISMATCH");
		expect(migration).toContain("PROVIDER_DATASET_EVIDENCE_DOMAIN_MISMATCH");
		expect(migration).toContain("PROVIDER_DATASET_EVIDENCE_SNAPSHOT_NOT_VISIBLE");
		expect(migration).toContain("PROVIDER_DATASET_EVIDENCE_CAPABILITY_NOT_VISIBLE");
		expect(migration).toContain('BEFORE UPDATE OR DELETE ON "sv_provider_dataset_capabilities"');
		expect(migration).toContain('BEFORE TRUNCATE ON "sv_provider_dataset_capabilities"');
		expect(migration).toContain('BEFORE UPDATE OR DELETE ON "sv_source_snapshots"');
		expect(migration).toContain('BEFORE UPDATE OR DELETE ON "sv_evidence_index"');
		expect(migration).toContain('REVOKE ALL ON "sv_evidence_provenance" FROM PUBLIC');
		expect(migration).toContain("IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app')");
		expect(migration).toContain(`EXECUTE 'REVOKE ALL ON "sv_evidence_provenance" FROM selena_app'`);
		expect(migration).toContain("MUST NOT flow to client routes or exports");
		expect(migration).not.toContain('INSERT INTO "sv_provider_dataset_capabilities"');
		expect(migration).not.toContain('CREATE TABLE "sv_social_');
		expect(migration).not.toContain('CREATE TABLE "sv_hotel_');
		expect(migration).not.toContain("provider_call");
	});
});

describe("Provider dataset snapshot journal", () => {
	it("models append-only tenant and project scoped lifecycle metadata", () => {
		const table = getTableConfig(schema.svProviderDatasetSnapshotEvents);
		const dialect = new PgDialect();
		expect(table.name).toBe("sv_provider_dataset_snapshot_events");
		expect(table.enableRLS).toBe(true);
		expect(
			table.indexes.find((index) => index.config.name === "sv_provider_dataset_snapshot_events_event_hash_unique")
				?.config.unique,
		).toBe(true);
		expect(
			table.foreignKeys
				.find((foreignKey) => foreignKey.getName() === "sv_provider_dataset_snapshot_events_project_org_fk")
				?.reference()
				.columns.map((column) => column.name),
		).toEqual(["project_id", "organization_id"]);
		const phaseCheck = table.checks.find(
			(candidate) => candidate.name === "sv_provider_dataset_snapshot_events_phase_check",
		);
		expect(phaseCheck && dialect.sqlToQuery(phaseCheck.value).sql).toContain("'INTERRUPTED'");
	});

	it("keeps raw and normalized social data out of the journal contract", () => {
		const columns = getTableConfig(schema.svProviderDatasetSnapshotEvents).columns.map((column) => column.name);
		expect(columns).toEqual([
			"id",
			"organization_id",
			"project_id",
			"provider",
			"source",
			"provider_dataset_id",
			"snapshot_id",
			"phase",
			"provider_status",
			"record_count",
			"observed_at",
			"event_hash",
			"created_at",
		]);
		for (const forbidden of ["url", "raw_payload", "text", "handle", "caption", "media_url"])
			expect(columns).not.toContain(forbidden);
	});

	it("aligns SQL with forced RLS, idempotency, transitions and immutable events", () => {
		const migration = readFileSync(
			new URL("./migrations/0052_provider_dataset_snapshot_journal.sql", import.meta.url),
			"utf8",
		);
		expect(migration).toContain('ALTER TABLE "sv_provider_dataset_snapshot_events" FORCE ROW LEVEL SECURITY');
		expect(migration).toContain('CREATE POLICY "tenant_isolation" ON "sv_provider_dataset_snapshot_events"');
		expect(migration).toContain("PROVIDER_DATASET_SNAPSHOT_INITIAL_PHASE_INVALID");
		expect(migration).toContain("PROVIDER_DATASET_SNAPSHOT_TERMINAL");
		expect(migration).toContain("PROVIDER_DATASET_SNAPSHOT_RESUME_REQUIRED");
		expect(migration).toContain("PROVIDER_DATASET_SNAPSHOT_EVENT_IMMUTABLE");
		expect(migration).toContain("RETURN NULL;");
		expect(migration).not.toContain("raw_payload");
		expect(migration).not.toContain("GRANT ");
	});
});

describe("Visibility OS Local schema", () => {
	it("exports seven RLS-enabled Local tables and keeps Ask Maps observations separate", () => {
		expect(localTables.map((table) => getTableConfig(table).name)).toEqual([
			"sv_local_keywords",
			"sv_grid_definitions",
			"sv_grid_points",
			"sv_local_scan_cycles",
			"sv_local_rank_observations",
			"sv_local_competitor_observations",
			"sv_local_visibility_metrics",
		]);
		for (const table of localTables) expect(getTableConfig(table).enableRLS).toBe(true);
		expect(getTableConfig(schema.svLocalObservations).name).toBe("sv_local_observations");
	});

	it("adds domain attribution to cost events without changing the AI run tables", () => {
		expect(getTableConfig(schema.svCostEvents).columns.map((column) => column.name)).toContain("domain_id");
		expect(getTableConfig(schema.svCostEvents).columns.map((column) => column.name)).toContain("measurement_cycle_id");
		expect(getTableConfig(schema.svRuns).columns.map((column) => column.name)).not.toContain("domain_id");
	});

	it("keeps the pending SQL aligned with Local cardinality and isolation gates", () => {
		const migration = readFileSync(
			new URL("./migrations/0038_visibility_os_local_visibility.sql", import.meta.url),
			"utf8",
		);
		for (const table of localTables) {
			const name = getTableConfig(table).name;
			expect(migration).toContain(`CREATE TABLE "${name}"`);
			expect(migration).toContain(`ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY`);
			expect(migration).toContain(`CREATE POLICY "tenant_isolation" ON "${name}"`);
		}
		expect(migration).toContain(
			'("cycle_id", "location_id", "keyword_id", "grid_point_id", "provider", "repeat_index")',
		);
		expect(migration).toContain("ADD COLUMN \"domain_id\" text DEFAULT 'AI' NOT NULL");
		expect(migration).toContain("\"domain_id\" = 'LOCAL'");
		expect(migration).toContain('"point_count" <= 49');
		expect(migration).toContain("LOCAL_CYCLE_COST_NOT_FROZEN");
		expect(migration).toContain("CARDINALITY_INCIDENT");
		expect(migration).toContain("sv_prepare_local_observation_retry");
		expect(migration).not.toContain('ALTER TABLE "sv_runs"');
		expect(migration).not.toContain('ALTER TABLE "sv_cycles"');
		expect(migration).not.toContain('ALTER TABLE "sv_run_permits"');
	});
});

describe("Visibility OS local domain and attempt expand", () => {
	it("exports one tenant-isolated attempt ledger that is also the spend permit", () => {
		expect(attemptTables.map((table) => getTableConfig(table).name)).toEqual(["sv_measurement_attempts"]);
		expect(getTableConfig(schema.svMeasurementAttempts).enableRLS).toBe(true);
		expect(getTableConfig(schema.svMeasurementAttempts).columns.map((column) => column.name)).toEqual([
			"id",
			"reservation_id",
			"organization_id",
			"measurement_cycle_id",
			"domain_id",
			"observation_ref",
			"point_id",
			"item_id",
			"executor_id",
			"repeat_index",
			"base_slot_key",
			"attempt_index",
			"execution_key",
			"row_version",
			"submission_token_hash",
			"submitted_candidate_fingerprint",
			"submitted_candidate_canonical",
			"submitted_candidate",
			"status",
			"budget_state",
			"reserved_cost_usd",
			"currency",
			"surface_cap_usd",
			"monthly_cap_usd",
			"price_snapshot_version",
			"spent_cost_usd",
			"released_cost_usd",
			"claimed_at",
			"lease_expires_at",
			"submitted_at",
			"completed_at",
			"provider_task_id",
			"raw_ref",
			"cost_event_id",
			"retry_reason",
			"final_invalid_reason",
			"reconciled_at",
			"reconciliation_ref",
			"unknown_reason",
			"created_at",
			"updated_at",
		]);
		expect(
			getTableConfig(schema.svLocalScanCycles).columns.find((column) => column.name === "domain_id")?.default,
		).toBe("LOCAL_MAPS");
	});

	it("exports one append-only result row per tenant-scoped attempt", () => {
		expect(attemptResultTables.map((table) => getTableConfig(table).name)).toEqual(["sv_measurement_attempt_results"]);
		const config = getTableConfig(schema.svMeasurementAttemptResults);
		expect(config.enableRLS).toBe(true);
		expect(config.columns.map((column) => column.name)).toEqual([
			"attempt_id",
			"organization_id",
			"measurement_cycle_id",
			"local_cycle_id",
			"configuration_lock_id",
			"provider_id",
			"reservation_id",
			"execution_key",
			"attempt_index",
			"result_fingerprint",
			"result_canonical",
			"validated_result",
			"disposition",
			"budget_incident",
			"required_budget_state",
			"provider_task_id",
			"raw_response_reference",
			"raw_response_sha256",
			"created_at",
		]);
		expect(config.columns.find((column) => column.name === "attempt_id")?.primary).toBe(true);
		expect(config.columns.find((column) => column.name === "validated_result")?.notNull).toBe(true);
		expect(config.columns.find((column) => column.name === "result_fingerprint")?.notNull).toBe(true);
		const localCycleReference = config.foreignKeys
			.find((foreignKey) => foreignKey.getName() === "sv_measurement_attempt_results_local_cycle_identity_fk")
			?.reference();
		expect(localCycleReference?.columns.map((column) => column.name)).toEqual([
			"local_cycle_id",
			"organization_id",
			"measurement_cycle_id",
			"configuration_lock_id",
			"provider_id",
		]);
		expect(localCycleReference?.foreignColumns.map((column) => column.name)).toEqual([
			"id",
			"organization_id",
			"measurement_cycle_id",
			"configuration_lock_id",
			"provider",
		]);
		const localCycleIdentity = getTableConfig(schema.svLocalScanCycles).indexes.find(
			(index) => index.config.name === "sv_local_scan_cycles_result_identity_unique",
		);
		expect(localCycleIdentity?.config.columns.map((column) => ("name" in column ? column.name : undefined))).toEqual([
			"id",
			"organization_id",
			"measurement_cycle_id",
			"configuration_lock_id",
			"provider",
		]);
	});

	it("renders nullable persistence checks fail-closed in Drizzle", () => {
		const dialect = new PgDialect();
		const failClosedNames = [
			"sv_measurement_attempts_submission_token_check",
			"sv_measurement_attempts_submitted_candidate_check",
			"sv_measurement_attempts_unknown_reason_check",
			"sv_measurement_attempt_results_fingerprint_check",
			"sv_measurement_attempt_results_identity_check",
			"sv_measurement_attempt_results_live_shape_check",
			"sv_measurement_attempt_results_disposition_check",
			"sv_measurement_attempt_results_budget_check",
			"sv_measurement_attempt_results_provenance_check",
		];
		let checked = 0;
		for (const table of [schema.svMeasurementAttempts, schema.svMeasurementAttemptResults]) {
			for (const check of getTableConfig(table).checks.filter((candidate) =>
				failClosedNames.includes(candidate.name),
			)) {
				expect(dialect.sqlToQuery(check.value).sql).toMatch(/\) IS TRUE$/);
				checked += 1;
			}
		}
		expect(checked).toBe(failClosedNames.length);
	});

	it("keeps 0043 additive, dual-readable and free of provider execution side effects", () => {
		const migration = readFileSync(
			new URL("./migrations/0043_visibility_os_local_domain_attempts_expand.sql", import.meta.url),
			"utf8",
		);
		const journal = readFileSync(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8");

		expect(migration).toContain("('LOCAL_MAPS', 'location_keyword_coordinate_provider')");
		expect(migration).toContain("('LOCAL_AI', 'location_prompt_coordinate_system')");
		expect(migration).toContain("ALTER COLUMN \"domain_id\" SET DEFAULT 'LOCAL_MAPS'");
		expect(migration).toContain("CHECK (\"domain_id\" IN ('LOCAL', 'LOCAL_MAPS'))");
		expect(migration).toContain("CHECK (\"domain_id\" IN ('LOCAL', 'LOCAL_MAPS')) NOT VALID");
		expect(migration).toContain('VALIDATE CONSTRAINT "sv_local_scan_cycles_domain_check_expand"');
		expect(migration).toContain('CREATE TABLE "sv_measurement_attempts"');
		expect(migration).toContain('CHECK ("attempt_index" BETWEEN 1 AND 3)');
		expect(migration).toContain("MEASUREMENT_ATTEMPT_STATUS_TRANSITION_BLOCKED");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_DELETE_BLOCKED");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_INITIAL_STATE_BLOCKED");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_INITIAL_LEASE_INVALID");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_LEASE_RENEWAL_BLOCKED");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_SEQUENCE_BLOCKED");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_UNKNOWN_MUST_RESERVE");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_COST_EVENT_MISMATCH");
		expect(migration).toContain("COST_EVENT_APPEND_ONLY");
		expect(migration).toContain('AND "provider_task_id" IS NULL AND "raw_ref" IS NULL');
		expect(migration).toContain("\"executor_id\" !~ '[[:space:]]'");
		expect(migration).toContain("\"reconciliation_ref\" ~ '[^[:space:]]'");
		expect(migration).toContain("'TIMEOUT', 'PROVIDER_5XX'");
		expect(migration).toContain("'MALFORMED_AFTER_3_ATTEMPTS'");
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_measurement_attempts_cost_event_unique"');
		expect(migration).toContain('CONSTRAINT "sv_measurement_attempts_cost_event_scope_fk"');
		expect(migration).toContain(
			'REFERENCES "sv_cost_events"("id", "organization_id", "measurement_cycle_id", "domain_id")',
		);
		expect(migration).toContain('ALTER TABLE "sv_measurement_attempts" ENABLE ROW LEVEL SECURITY');
		expect(migration).toContain('CREATE POLICY "tenant_isolation" ON "sv_measurement_attempts"');
		expect(migration).toContain('evidence."domain_id" = local_cycle."domain_id"');
		expect(migration).toContain("WHERE local_cycle.\"domain_id\" IN ('LOCAL', 'LOCAL_MAPS')");
		expect(migration).not.toContain('UPDATE "sv_measurement_cycles"');
		expect(migration).not.toContain('UPDATE "sv_local_scan_cycles"');
		expect(migration).not.toContain('INSERT INTO "sv_measurement_attempts"');
		expect(migration).not.toContain("feature_flag");
		expect(migration).not.toContain("provider_call");
		expect(migration).not.toContain("sv_local_ai_cycles");
		expect(journal).toContain('"tag": "0043_visibility_os_local_domain_attempts_expand"');
	});

	it("keeps 0044 source-only as a row-version and durable-result prerequisite", () => {
		const migration = readFileSync(
			new URL("./migrations/0044_visibility_os_local_live_persistence.sql", import.meta.url),
			"utf8",
		);
		const journal = readFileSync(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8");

		expect(migration).toContain('ADD COLUMN "row_version" bigint DEFAULT 1 NOT NULL');
		expect(migration).toContain('CHECK ("row_version" > 0)');
		expect(migration.indexOf('LOCK TABLE "sv_measurement_attempts" IN ACCESS EXCLUSIVE MODE')).toBeLessThan(
			migration.indexOf('IF EXISTS (SELECT 1 FROM "sv_measurement_attempts")'),
		);
		expect(migration).toContain("MEASUREMENT_ATTEMPT_0044_PREFLIGHT_REQUIRES_EMPTY_TABLE");
		expect(migration).toContain("'schemaVersion'::text");
		expect(migration).toContain("'providerTaskId'::text");
		expect(migration).toContain("'amountUsd'::text");
		expect(migration).toContain("(\"validated_result\"->'provider') -");
		expect(migration).toContain("(\"validated_result\"->'event') -");
		expect(migration).toContain('ADD COLUMN "submission_token_hash" text');
		expect(migration).toContain('ADD COLUMN "submitted_candidate_fingerprint" text');
		expect(migration).toContain('ADD COLUMN "submitted_candidate_canonical" text');
		expect(migration).toContain('ADD COLUMN "submitted_candidate" jsonb');
		expect(migration).toContain('CONSTRAINT "sv_measurement_attempts_submitted_candidate_check"');
		expect(migration).toContain("'LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE'");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_SUBMITTED_CANDIDATE_IMMUTABLE");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_SUBMITTED_LOCAL_CYCLE_MISMATCH");
		expect(migration).toContain("#>>'{attempt,observationRef}' = \"observation_ref\"");
		expect(migration).toContain("#>>'{slot,pointId}' = \"point_id\"::text");
		expect(migration).toContain("#>>'{budgetReservation,reservedCostUsd}'");
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_measurement_attempts_submission_token_unique"');
		expect(migration).toContain('WHERE "submission_token_hash" IS NOT NULL');
		expect(migration).toContain("'COMMITTED_SNAPSHOT_INVALID'");
		expect(migration).toContain("'PROVIDER_OUTCOME_UNKNOWN'");
		expect(migration).toContain('CREATE TABLE "sv_measurement_attempt_results"');
		expect(migration).toContain('"attempt_id" uuid PRIMARY KEY NOT NULL');
		expect(migration).toContain('"measurement_cycle_id" uuid NOT NULL');
		expect(migration).toContain('"local_cycle_id" uuid NOT NULL');
		expect(migration).toContain('"configuration_lock_id" uuid NOT NULL');
		expect(migration).toContain('"provider_id" text NOT NULL');
		expect(migration).toContain('"reservation_id" uuid NOT NULL');
		expect(migration).toContain('"execution_key" text NOT NULL');
		expect(migration).toContain('"attempt_index" integer NOT NULL');
		expect(migration).toContain('"validated_result" jsonb NOT NULL');
		expect(migration).toContain('"result_canonical" text NOT NULL');
		expect(migration).toContain('"result_fingerprint" text NOT NULL');
		expect(migration).toContain('CONSTRAINT "sv_measurement_attempt_results_attempt_identity_fk"');
		expect(migration).toContain('CONSTRAINT "sv_measurement_attempt_results_local_cycle_identity_fk"');
		expect(migration).toContain('"id", "organization_id", "measurement_cycle_id", "configuration_lock_id", "provider"');
		expect(migration).toContain('AND "provider" = NEW."executor_id"');
		expect(migration).toContain('OR NEW."provider_id" IS DISTINCT FROM parent_attempt."executor_id"');
		expect(migration).toContain('"validated_result"#>>\'{provider,id}\' = "provider_id"');
		expect(migration).toContain('CONSTRAINT "sv_measurement_attempt_results_live_shape_check"');
		expect(migration).toContain("'evidenceKind', 'checkReference', 'rawResponseReference'");
		expect(migration).toContain("'{provenance,checkReference}'");
		expect(migration).toContain("encode(sha256(convert_to(\"result_canonical\", 'UTF8')), 'hex')");
		expect(migration).toContain('"validated_result" = "result_canonical"::jsonb');
		expect(migration).toContain('ALTER TABLE "sv_measurement_attempt_results" ENABLE ROW LEVEL SECURITY');
		expect(migration).toContain('CREATE POLICY "tenant_isolation" ON "sv_measurement_attempt_results"');
		expect(migration).toContain("MEASUREMENT_ATTEMPT_SUBMISSION_TOKEN_IMMUTABLE");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_UNKNOWN_REASON_IMMUTABLE");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_APPEND_ONLY");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_PRETERMINAL_BLOCKED");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_COST_MAPPING_MISMATCH");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_SUBMITTED_CANDIDATE_MISMATCH");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_EXACT_DISPOSITION_MISMATCH");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_NON_LIVE_EVENT_BLOCKED");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_COMPLETED_AT_MISMATCH");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_OBSERVED_AT_OUTSIDE_ATTEMPT");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_PARENT_REASON_MISMATCH");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_SPENT_PARENT_COST_MISMATCH");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_RELEASED_PARENT_COST_MISMATCH");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_RESULT_UNKNOWN_PARENT_COST_MISMATCH");
		expect(migration).toContain("'EMPTY_AFTER_3_ATTEMPTS'");
		expect(migration).toContain("'PROVIDER_UNAVAILABLE'");
		expect(migration).toContain("'RATE_LIMIT_EXHAUSTED'");
		expect(migration).toContain("'MALFORMED_AFTER_3_ATTEMPTS'");
		expect(migration).toContain('BEFORE TRUNCATE ON "sv_measurement_attempt_results"');
		expect(migration).toContain("\"validated_result\"->>'schemaVersion' = '1'");
		expect(migration).toContain("\"validated_result\"->>'canonicalizationVersion' = 'canonical-json-code-unit-v1'");
		expect(migration).toContain("FOR UPDATE");
		expect(migration).toContain('IF NEW."row_version" IS DISTINCT FROM OLD."row_version"');
		expect(migration).toContain('NEW."row_version" := OLD."row_version" + 1');
		expect(migration).toContain("!~ '[[:space:]]'");
		expect(migration).not.toContain("'\\S");
		for (const constraintName of [
			"sv_measurement_attempts_submission_token_check",
			"sv_measurement_attempts_submitted_candidate_check",
			"sv_measurement_attempts_unknown_reason_check",
			"sv_measurement_attempt_results_fingerprint_check",
			"sv_measurement_attempt_results_identity_check",
			"sv_measurement_attempt_results_live_shape_check",
			"sv_measurement_attempt_results_disposition_check",
			"sv_measurement_attempt_results_budget_check",
			"sv_measurement_attempt_results_provenance_check",
		]) {
			const start = migration.indexOf(`CONSTRAINT "${constraintName}"`);
			const nextAddConstraint = migration.indexOf("\n\tADD CONSTRAINT ", start + 1);
			const nextConstraint = migration.indexOf("\n\tCONSTRAINT ", start + 1);
			const tableEnd = migration.indexOf("\n);", start + 1);
			const end = Math.min(
				...([nextAddConstraint, nextConstraint, tableEnd].filter((index) => index > start) as number[]),
			);
			expect(start).toBeGreaterThan(-1);
			expect(migration.slice(start, end)).toContain("IS TRUE");
		}
		expect(migration).not.toContain("budget_period");
		expect(migration).not.toContain("monthly_budget");
		expect(migration).not.toContain("GRANT ");
		expect(migration).not.toContain("provider_call");
		expect(journal).toContain('"tag": "0044_visibility_os_local_live_persistence"');
	});

	it("keeps 0049 as a forward-only CLAIMED to SUBMITTED lease-contract repair", () => {
		const migration = readFileSync(
			new URL("./migrations/0049_visibility_os_claimed_submit_lease.sql", import.meta.url),
			"utf8",
		);
		const journal = readFileSync(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8");

		expect(migration).toContain("pg_get_functiondef('sv_guard_measurement_attempt_mutation()'::regprocedure)");
		expect(migration).toContain("END IF;$guard$;");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_0049_GUARD_SHAPE_UNEXPECTED");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_CLAIM_EXPIRED");
		expect(migration).toContain("OLD.\"status\" = 'CLAIMED' AND NEW.\"status\" = 'SUBMITTED'");
		expect(migration).toContain('NEW."lease_expires_at" > OLD."lease_expires_at"');
		expect(migration).toContain('OLD."lease_expires_at" > now()');
		expect(migration).toContain('NEW."lease_expires_at" > now()');
		expect(migration).not.toContain('INSERT INTO "sv_measurement_attempts"');
		expect(migration).not.toContain('UPDATE "sv_measurement_attempts"');
		expect(journal).toContain('"tag": "0049_visibility_os_claimed_submit_lease"');
	});

	it("keeps 0050 as a forward-only PostgreSQL JSONB operator compatibility repair", () => {
		const migration = readFileSync(
			new URL("./migrations/0050_visibility_os_jsonb_text_operator_casts.sql", import.meta.url),
			"utf8",
		);
		const journal = readFileSync(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8");

		expect(migration).toContain("pg_get_constraintdef(oid, true)");
		expect(migration).toContain("format(' - %L::text', key_name)");
		expect(migration).toContain("MEASUREMENT_ATTEMPT_0050_CONSTRAINT_MISSING");
		expect(migration).toContain("ALTER TABLE %I DROP CONSTRAINT %I");
		expect(migration).toContain("ALTER TABLE %I ADD CONSTRAINT %I %s");
		expect(migration).not.toContain('INSERT INTO "sv_measurement_attempt');
		expect(migration).not.toContain('UPDATE "sv_measurement_attempt');
		expect(journal).toContain('"tag": "0050_visibility_os_jsonb_text_operator_casts"');
	});

	it("retires the legacy Local domain and makes configuration locks append-only", () => {
		const migration0044 = readFileSync(
			new URL("./migrations/0044_visibility_os_local_live_persistence.sql", import.meta.url),
			"utf8",
		);
		const migration = readFileSync(
			new URL("./migrations/0045_visibility_os_domain_and_lock_hardening.sql", import.meta.url),
			"utf8",
		);
		const hardeningGate = readFileSync(
			new URL("../../../../tools/visibility_os_0045_hardening_e2e.sh", import.meta.url),
			"utf8",
		);
		const gate12 = readFileSync(new URL("../../../../tools/visibility_os_gate12_e2e.sh", import.meta.url), "utf8");
		const journal = readFileSync(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8");
		const dialect = new PgDialect();
		const lockConfig = getTableConfig(schema.svConfigurationLocks);
		const projectConfig = getTableConfig(schema.svProjects);
		const projectVersionIndex = lockConfig.indexes.find(
			(index) => index.config.name === "sv_locks_project_version_unique",
		);
		const projectIdentityIndex = projectConfig.indexes.find(
			(index) => index.config.name === "sv_projects_id_organization_unique",
		);
		const lockIdentityIndex = lockConfig.indexes.find(
			(index) => index.config.name === "sv_configuration_locks_id_organization_unique",
		);
		const lockProjectIdentityIndex = lockConfig.indexes.find(
			(index) => index.config.name === "sv_configuration_locks_id_project_org_unique",
		);
		const measurementCycleConfig = getTableConfig(schema.svMeasurementCycles);
		const measurementCycleIdentityIndex = measurementCycleConfig.indexes.find(
			(index) => index.config.name === "sv_measurement_cycles_id_domain_org_lock_unique",
		);
		const measurementCycleLockReference = measurementCycleConfig.foreignKeys
			.find((foreignKey) => foreignKey.getName() === "sv_measurement_cycles_configuration_lock_scope_fk")
			?.reference();
		const localCycleMeasurementReference = getTableConfig(schema.svLocalScanCycles)
			.foreignKeys.find((foreignKey) => foreignKey.getName() === "sv_local_scan_cycles_measurement_domain_fk")
			?.reference();
		const evidenceCycleReference = getTableConfig(schema.svEvidenceIndex)
			.foreignKeys.find((foreignKey) => foreignKey.getName() === "sv_evidence_index_cycle_domain_fk")
			?.reference();
		const evidenceDatasetReference = getTableConfig(schema.svEvidenceIndex)
			.foreignKeys.find((foreignKey) => foreignKey.getName() === "sv_evidence_index_dataset_cycle_org_fk")
			?.reference();
		const evidenceSourceReference = getTableConfig(schema.svEvidenceIndex)
			.foreignKeys.find((foreignKey) => foreignKey.getName() === "sv_evidence_index_source_snapshot_org_fk")
			?.reference();
		const sourceIdentityIndex = getTableConfig(schema.svSourceSnapshots).indexes.find(
			(index) => index.config.name === "sv_source_snapshots_id_organization_unique",
		);
		const projectOrganizationReference = lockConfig.foreignKeys
			.find((foreignKey) => foreignKey.getName() === "sv_configuration_locks_project_organization_fk")
			?.reference();
		const versionCheck = lockConfig.checks.find(
			(candidate) => candidate.name === "sv_configuration_locks_version_check",
		);
		const localDomainCheck = getTableConfig(schema.svLocalScanCycles).checks.find(
			(candidate) => candidate.name === "sv_local_scan_cycles_domain_check",
		);

		expect(projectVersionIndex?.config.unique).toBe(true);
		expect(projectVersionIndex?.config.columns.map((column) => ("name" in column ? column.name : undefined))).toEqual([
			"project_id",
			"version",
		]);
		expect(projectIdentityIndex?.config.unique).toBe(true);
		expect(projectIdentityIndex?.config.columns.map((column) => ("name" in column ? column.name : undefined))).toEqual([
			"id",
			"organization_id",
		]);
		expect(lockIdentityIndex?.config.unique).toBe(true);
		expect(lockIdentityIndex?.config.columns.map((column) => ("name" in column ? column.name : undefined))).toEqual([
			"id",
			"organization_id",
		]);
		expect(lockProjectIdentityIndex?.config.unique).toBe(true);
		expect(
			lockProjectIdentityIndex?.config.columns.map((column) => ("name" in column ? column.name : undefined)),
		).toEqual(["id", "project_id", "organization_id"]);
		expect(measurementCycleIdentityIndex?.config.unique).toBe(true);
		expect(
			measurementCycleIdentityIndex?.config.columns.map((column) => ("name" in column ? column.name : undefined)),
		).toEqual(["id", "domain_id", "organization_id", "configuration_lock_id"]);
		expect(measurementCycleLockReference?.columns.map((column) => column.name)).toEqual([
			"configuration_lock_id",
			"organization_id",
		]);
		expect(measurementCycleLockReference?.foreignColumns.map((column) => column.name)).toEqual([
			"id",
			"organization_id",
		]);
		expect(localCycleMeasurementReference?.columns.map((column) => column.name)).toEqual([
			"measurement_cycle_id",
			"domain_id",
			"organization_id",
			"configuration_lock_id",
		]);
		expect(localCycleMeasurementReference?.foreignColumns.map((column) => column.name)).toEqual([
			"id",
			"domain_id",
			"organization_id",
			"configuration_lock_id",
		]);
		expect(evidenceCycleReference?.columns.map((column) => column.name)).toEqual([
			"cycle_id",
			"domain_id",
			"organization_id",
		]);
		expect(evidenceCycleReference?.foreignColumns.map((column) => column.name)).toEqual([
			"id",
			"domain_id",
			"organization_id",
		]);
		expect(evidenceDatasetReference?.columns.map((column) => column.name)).toEqual([
			"dataset_id",
			"cycle_id",
			"organization_id",
		]);
		expect(evidenceDatasetReference?.foreignColumns.map((column) => column.name)).toEqual([
			"id",
			"cycle_id",
			"organization_id",
		]);
		expect(evidenceSourceReference?.columns.map((column) => column.name)).toEqual([
			"source_snapshot_id",
			"organization_id",
		]);
		expect(evidenceSourceReference?.foreignColumns.map((column) => column.name)).toEqual(["id", "organization_id"]);
		expect(sourceIdentityIndex?.config.unique).toBe(true);
		expect(projectOrganizationReference?.columns.map((column) => column.name)).toEqual([
			"project_id",
			"organization_id",
		]);
		expect(projectOrganizationReference?.foreignColumns.map((column) => column.name)).toEqual([
			"id",
			"organization_id",
		]);
		expect(versionCheck && dialect.sqlToQuery(versionCheck.value).sql).toContain('"version" > 0');
		expect(localDomainCheck && dialect.sqlToQuery(localDomainCheck.value).sql).toContain(
			"\"domain_id\" = 'LOCAL_MAPS'",
		);

		expect(migration0044).not.toContain('CREATE TRIGGER "sv_prevent_cost_event_truncate"');
		expect(migration).toContain('CREATE TRIGGER "sv_prevent_cost_event_truncate"');
		expect(migration).toContain('BEFORE TRUNCATE ON "sv_cost_events"');
		expect(migration).toContain('CREATE TRIGGER "sv_prevent_configuration_lock_mutation"');
		expect(migration).toContain('BEFORE UPDATE OR DELETE ON "sv_configuration_locks"');
		expect(migration).toContain('CREATE TRIGGER "sv_prevent_configuration_lock_truncate"');
		expect(migration).toContain('BEFORE TRUNCATE ON "sv_configuration_locks"');
		expect(migration).toContain("CONFIGURATION_LOCK_0045_PROJECT_VERSION_COLLISION");
		expect(migration).toContain("CONFIGURATION_LOCK_0045_NONPOSITIVE_VERSION");
		expect(migration).toContain("CONFIGURATION_LOCK_0045_PROJECT_ORGANIZATION_MISMATCH");
		expect(migration).toContain("MEASUREMENT_CYCLE_0045_CONFIGURATION_LOCK_SCOPE_MISMATCH");
		expect(migration).toContain("LOCAL_MAPS_0045_LOCAL_CYCLE_LOCK_SCOPE_MISMATCH");
		expect(migration).toContain("LOCAL_MAPS_0045_LOCATION_LOCK_PROJECT_SCOPE_MISMATCH");
		expect(migration).toContain('CHECK ("version" > 0) NOT VALID');
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_locks_project_version_unique"');
		expect(migration.indexOf('CREATE UNIQUE INDEX "sv_locks_project_version_unique"')).toBeLessThan(
			migration.indexOf('DROP INDEX "sv_locks_project_version_idx"'),
		);
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_projects_id_organization_unique"');
		expect(migration).toContain('CONSTRAINT "sv_configuration_locks_project_organization_fk"');
		expect(migration).toContain('FOREIGN KEY ("project_id", "organization_id")');
		expect(migration).toContain('REFERENCES "sv_projects" ("id", "organization_id") NOT VALID');
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_configuration_locks_id_organization_unique"');
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_configuration_locks_id_project_org_unique"');
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_measurement_cycles_id_domain_org_lock_unique"');
		expect(migration).toContain('CONSTRAINT "sv_measurement_cycles_configuration_lock_scope_fk"');
		expect(migration).toContain('FOREIGN KEY ("configuration_lock_id", "organization_id")');
		expect(migration).toContain('"measurement_cycle_id", "domain_id", "organization_id", "configuration_lock_id"');
		expect(migration).toContain('FOREIGN KEY ("cycle_id", "domain_id", "organization_id")');
		expect(migration).toContain('CONSTRAINT "sv_evidence_index_dataset_cycle_org_fk"');
		expect(migration).toContain('FOREIGN KEY ("dataset_id", "cycle_id", "organization_id")');
		expect(migration).toContain('CONSTRAINT "sv_evidence_index_source_snapshot_org_fk"');
		expect(migration).toContain('FOREIGN KEY ("source_snapshot_id", "organization_id")');
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_source_snapshots_id_organization_unique"');
		expect(migration).toContain('FOREIGN KEY ("measurement_cycle_id", "domain_id", "organization_id")');
		expect(migration).toContain('CREATE TRIGGER "sv_guard_local_cycle_project_scope"');
		expect(migration).toContain('CREATE TRIGGER "sv_guard_local_entity_scope_mutation"');
		expect(migration).toContain('CREATE TRIGGER "sv_guard_local_location_scope_mutation"');
		expect(migration).toContain("FOR UPDATE OF location");
		expect(migration).toContain("FOR UPDATE OF entity");
		expect(migration).toContain("LOCAL_MAPS_0045_MEASUREMENT_CYCLE_COLLISION");
		expect(migration).toContain("LOCAL_MAPS_0045_EVIDENCE_COLLISION");
		expect(migration).toContain("LOCAL_MAPS_0045_EVIDENCE_PROVENANCE_SCOPE_MISMATCH");
		const firstBackfillWrite = migration.indexOf('UPDATE "sv_measurement_cycles"');
		const costTriggerDisable = migration.indexOf('DISABLE TRIGGER "sv_prevent_cost_event_mutation"');
		const exclusiveLock = migration.indexOf('LOCK TABLE\n\t"sv_projects"');
		const projectLock = migration.indexOf('"sv_projects",', exclusiveLock);
		const configurationLock = migration.indexOf('"sv_configuration_locks",', exclusiveLock);
		for (const preflight of [
			"LOCAL_MAPS_0045_DOMAIN_REGISTRY_PREFLIGHT_FAILED",
			"CONFIGURATION_LOCK_0045_NONPOSITIVE_VERSION",
			"CONFIGURATION_LOCK_0045_PROJECT_ORGANIZATION_MISMATCH",
			"MEASUREMENT_CYCLE_0045_CONFIGURATION_LOCK_SCOPE_MISMATCH",
			"CONFIGURATION_LOCK_0045_PROJECT_VERSION_COLLISION",
			"LOCAL_MAPS_0045_MEASUREMENT_CYCLE_COLLISION",
			"LOCAL_MAPS_0045_EVIDENCE_COLLISION",
			"LOCAL_MAPS_0045_LEGACY_ATTEMPT_IDENTITY",
			"LOCAL_MAPS_0045_LOCAL_CYCLE_LOCK_SCOPE_MISMATCH",
			"LOCAL_MAPS_0045_LOCATION_LOCK_PROJECT_SCOPE_MISMATCH",
			"LOCAL_MAPS_0045_COST_SCOPE_MISMATCH",
			"LOCAL_MAPS_0045_EVIDENCE_PROVENANCE_SCOPE_MISMATCH",
		]) {
			expect(migration.indexOf(preflight)).toBeGreaterThan(-1);
			expect(migration.indexOf(preflight)).toBeLessThan(firstBackfillWrite);
			expect(migration.indexOf(preflight)).toBeLessThan(costTriggerDisable);
		}
		expect(exclusiveLock).toBeGreaterThan(-1);
		expect(exclusiveLock).toBe(0);
		expect(exclusiveLock).toBeLessThan(migration.indexOf('CREATE FUNCTION "sv_prevent_configuration_lock_mutation"'));
		expect(projectLock).toBeLessThan(configurationLock);
		expect(exclusiveLock).toBeLessThan(migration.indexOf("LOCAL_MAPS_0045_DOMAIN_REGISTRY_PREFLIGHT_FAILED"));
		expect(migration).toContain('DISABLE TRIGGER "sv_prevent_cost_event_mutation"');
		expect(migration).toContain('ENABLE TRIGGER "sv_prevent_cost_event_mutation"');
		expect(migration).not.toMatch(/(?:DISABLE|ENABLE) TRIGGER (?:ALL|USER)/);
		expect(migration.match(/DISABLE TRIGGER/g)).toHaveLength(1);
		expect(migration.match(/ENABLE TRIGGER/g)).toHaveLength(1);
		expect(migration.indexOf('ALTER CONSTRAINT "sv_cost_events_measurement_domain_fk"')).toBeLessThan(
			migration.indexOf('ADD CONSTRAINT "sv_configuration_locks_project_organization_fk"'),
		);
		expect(migration.indexOf('ENABLE TRIGGER "sv_prevent_cost_event_mutation"')).toBeGreaterThan(
			migration.indexOf("SET CONSTRAINTS\n"),
		);
		expect(migration).toContain('ALTER CONSTRAINT "sv_local_scan_cycles_measurement_domain_fk" NOT DEFERRABLE');
		expect(migration).toContain('ALTER CONSTRAINT "sv_evidence_index_cycle_domain_fk" NOT DEFERRABLE');
		expect(migration).toContain('ALTER CONSTRAINT "sv_cost_events_measurement_domain_fk" NOT DEFERRABLE');
		for (const table of [
			"sv_measurement_cycles",
			"sv_local_scan_cycles",
			"sv_cost_events",
			"sv_evidence_index",
			"sv_findings",
			"sv_recommendations",
		]) {
			expect(migration).toContain(`UPDATE "${table}"`);
		}
		expect(migration).toContain("CHECK (\"domain_id\" = 'LOCAL_MAPS') NOT VALID");
		expect(migration).toContain("WHERE local_cycle.\"domain_id\" = 'LOCAL_MAPS'");
		expect(migration).toContain('DELETE FROM "sv_measurement_domains"');
		expect(migration).toContain("LOCAL_MAPS_0045_POSTCONDITION_FAILED");
		expect(migration).not.toContain("GRANT ");
		expect(migration).not.toContain("provider_call");
		expect(migration).not.toContain("monthly_budget");
		expect(journal).toContain('"tag": "0045_visibility_os_domain_and_lock_hardening"');
		expect(hardeningGate).toContain("apply_through_0044");
		expect(hardeningGate).toContain("--single-transaction");
		expect(hardeningGate).toContain("assert_failed_migration_is_atomic");
		expect(hardeningGate).toContain("CONFIGURATION_LOCK_0045_PROJECT_VERSION_COLLISION");
		expect(hardeningGate).toContain("CONFIGURATION_LOCK_0045_PROJECT_ORGANIZATION_MISMATCH");
		expect(hardeningGate).toContain("MEASUREMENT_CYCLE_0045_CONFIGURATION_LOCK_SCOPE_MISMATCH");
		expect(hardeningGate).toContain("LOCAL_MAPS_0045_LOCAL_CYCLE_LOCK_SCOPE_MISMATCH");
		expect(hardeningGate).toContain("LOCAL_MAPS_0045_MEASUREMENT_CYCLE_COLLISION");
		expect(hardeningGate).toContain("LOCAL_MAPS_0045_EVIDENCE_COLLISION");
		expect(hardeningGate).toContain("CONFIGURATION_LOCK_APPEND_ONLY");
		expect(hardeningGate).toContain("COST_EVENT_APPEND_ONLY");
		expect(hardeningGate).toContain("tgenabled <> 'O'");
		expect(gate12).toContain('--single-transaction < "$migration"');
		expect(gate12).toContain("sv_journal_daily_claims_project_organization_fk");
		expect(gate12).toContain("complete numbered migration chain through 0049");
		const gate12Through0036 = gate12.indexOf("10#$migration_number > 36");
		const gate12RegistryFixture = gate12.indexOf('bash "$repo_root/tools/visibility_os_m1_registry_e2e.sh"');
		const gate12HistoricalChain = gate12.indexOf('bash "$repo_root/tools/visibility_os_m6_outcome_e2e.sh"');
		const gate12Apply0043 = gate12.indexOf("0043_visibility_os_local_domain_attempts_expand.sql");
		const gate12Apply0044 = gate12.indexOf("0044_visibility_os_local_live_persistence.sql");
		const gate12Apply0045 = gate12.indexOf("0045_visibility_os_domain_and_lock_hardening.sql");
		const gate12Apply0046 = gate12.indexOf("0046_selena_journal_daily_claims.sql");
		const gate12Apply0047 = gate12.indexOf("0047_visibility_os_local_attempt_count_cap.sql");
		const gate12Apply0048 = gate12.indexOf("0048_selena_api_idempotency_records.sql");
		const gate12Apply0049 = gate12.indexOf("0049_visibility_os_claimed_submit_lease.sql");
		const gate12Marker = gate12.indexOf("sv_journal_daily_claims_project_organization_fk");
		const gate12Seed = gate12.indexOf("INSERT INTO organization");
		expect(gate12).toContain('if [[ "$fresh_database" == true ]]');
		expect(gate12Through0036).toBeGreaterThan(-1);
		expect(gate12Through0036).toBeLessThan(gate12RegistryFixture);
		expect(gate12RegistryFixture).toBeLessThan(gate12HistoricalChain);
		expect(gate12HistoricalChain).toBeLessThan(gate12Apply0043);
		expect(gate12Apply0043).toBeLessThan(gate12Apply0044);
		expect(gate12Apply0044).toBeLessThan(gate12Apply0045);
		expect(gate12Apply0045).toBeLessThan(gate12Apply0046);
		expect(gate12Apply0046).toBeLessThan(gate12Apply0047);
		expect(gate12Apply0047).toBeLessThan(gate12Apply0048);
		expect(gate12Apply0048).toBeLessThan(gate12Apply0049);
		const gate12Apply0050 = gate12.indexOf("0050_visibility_os_jsonb_text_operator_casts.sql");
		expect(gate12Apply0049).toBeLessThan(gate12Apply0050);
		expect(gate12).toContain("Gate 12 requires the 0049 CLAIMED to SUBMITTED lease guard");
		expect(gate12).toMatch(/"\$\{psql\[@\]\}" -Atc/);
		expect(gate12Apply0048).toBeLessThan(gate12Marker);
		expect(gate12Marker).toBeLessThan(gate12Seed);
	});

	it("keeps the disposable PostgreSQL rehearsal unique, ephemeral and opt-in", () => {
		const wrapper = readFileSync(
			new URL("../../../../tools/visibility_os_disposable_rehearsal.sh", import.meta.url),
			"utf8",
		);
		const compose = readFileSync(
			new URL("../../../../tools/visibility_os_disposable_postgres.compose.yml", import.meta.url),
			"utf8",
		);
		const rehearsalScripts = [
			"selena_isolated_e2e.sh",
			"visibility_os_m1_registry_e2e.sh",
			"visibility_os_m2_local_e2e.sh",
			"visibility_os_m3_search_reputation_e2e.sh",
			"visibility_os_m4_evidence_loop_e2e.sh",
			"visibility_os_m5_map_e2e.sh",
			"visibility_os_m6_outcome_e2e.sh",
			"visibility_os_gate12_e2e.sh",
			"visibility_os_0045_hardening_e2e.sh",
			"visibility_os_0049_lifecycle_e2e.sh",
			"visibility_os_0051_rls_schema_proof_e2e.sh",
			"visibility_os_0052_snapshot_journal_e2e.sh",
		].map((name) => readFileSync(new URL(`../../../../tools/${name}`, import.meta.url), "utf8"));

		expect(wrapper).toContain("mode='dry-run'");
		expect(wrapper).toContain("--run) mode='run'");
		expect(wrapper).toContain("gate12|0045|0049|0051|0052");
		expect(wrapper.indexOf("if [[ \"$mode\" == 'dry-run' ]]")).toBeLessThan(wrapper.indexOf("command -v docker"));
		expect(wrapper).toMatch(/compose_project="selena-visibility-rehearsal-\$\{PPID\}-\$\$-\$\{random_suffix\}"/);
		expect(wrapper).toContain("label=com.docker.compose.project=$compose_project");
		expect(wrapper).toMatch(/compose=\("\$\{compose_cli\[@\]\}" -p "\$compose_project"/);
		expect(wrapper).toContain("compose_cli=(docker compose)");
		expect(wrapper).toContain("compose_cli=(docker-compose)");
		expect(wrapper).toContain("up -d --pull never postgres");
		expect(wrapper).toContain("down --volumes --remove-orphans");
		expect(wrapper).toContain("trap cleanup EXIT");
		expect(wrapper).toContain("BLOCKED_CLEANUP");
		expect(wrapper).toContain("resources remain after teardown");
		expect(wrapper).toContain("cleanup=verified");
		expect(wrapper).not.toContain("cleanup=scheduled");
		expect(wrapper).not.toContain("down --volumes --remove-orphans >/dev/null 2>&1 || true");
		expect(wrapper).toMatch(/published_address="\$\("\$\{compose\[@\]\}" port postgres 5432\)"/);
		expect(wrapper).not.toContain("docker system prune");
		expect(wrapper).not.toContain("provider_call");

		expect(compose).toContain("image: postgres:16-alpine");
		expect(compose).toContain('"127.0.0.1::5432"');
		expect(compose).toContain("tmpfs:");
		expect(compose).toContain("/var/lib/postgresql/data");
		expect(compose).not.toContain("volumes:");

		for (const script of rehearsalScripts) {
			expect(script).toContain('visibility_os_compose_command.sh"');
			expect(script).toMatch(/compose_project="\$\{SELENA_VISIBILITY_COMPOSE_PROJECT:-\}"/);
			expect(script).toContain("^selena-visibility-rehearsal-");
			expect(script).not.toContain("SELENA_VISIBILITY_COMPOSE_PROJECT:-selena-visibility-test");
			expect(script).toContain("tools/visibility_os_disposable_postgres.compose.yml}");
			expect(script).toMatch(/"\$\{compose_cli\[@\]\}" -p "\$compose_project"/);
		}
	});

	it("proves dry-run and teardown behavior with a hermetic fake Docker CLI", () => {
		const wrapperPath = fileURLToPath(
			new URL("../../../../tools/visibility_os_disposable_rehearsal.sh", import.meta.url),
		);
		const fakeBin = mkdtempSync(join(tmpdir(), "selena-rehearsal-"));
		const dockerLog = join(fakeBin, "docker.log");
		const suiteLog = join(fakeBin, "suite.log");
		const fakeDocker = join(fakeBin, "docker");
		const fakeBash = join(fakeBin, "bash");

		writeFileSync(dockerLog, "");
		writeFileSync(suiteLog, "");
		writeFileSync(
			fakeDocker,
			`#!/bin/sh
printf '%s\\n' "$*" >> "$FAKE_DOCKER_LOG"
case "$*" in
  "compose version") exit 0 ;;
  *"container ls -q"*) exit 0 ;;
  *"network ls -q"*) exit 0 ;;
  *"volume ls -q"*) exit 0 ;;
  "image inspect postgres:16-alpine") exit 0 ;;
  *"up -d --pull never postgres"*) exit 0 ;;
  *"exec -T postgres pg_isready"*) exit 0 ;;
  *"port postgres 5432"*) printf '%s\\n' '127.0.0.1:49152'; exit 0 ;;
  *"down --volumes --remove-orphans"*) exit "\${FAKE_DOWN_EXIT:-0}" ;;
esac
exit 64
`,
		);
		writeFileSync(
			fakeBash,
			`#!/bin/sh
printf '%s\\n' "$*" >> "$FAKE_SUITE_LOG"
if [ "\${FAKE_SUITE_SIGNAL:-}" = TERM ]; then
  kill -TERM "$PPID"
fi
exit "\${FAKE_SUITE_EXIT:-0}"
`,
		);
		chmodSync(fakeDocker, 0o755);
		chmodSync(fakeBash, 0o755);

		const run = (extraEnv: Record<string, string> = {}, args = ["--run", "gate12"]) =>
			spawnSync("/bin/bash", [wrapperPath, ...args], {
				encoding: "utf8",
				env: {
					...process.env,
					PATH: `${fakeBin}:/usr/bin:/bin`,
					FAKE_DOCKER_LOG: dockerLog,
					FAKE_SUITE_LOG: suiteLog,
					...extraEnv,
				},
			});

		try {
			const dryRun = run({}, ["--dry-run", "gate12"]);
			expect(dryRun.status).toBe(0);
			expect(readFileSync(dockerLog, "utf8")).toBe("");

			const success = run();
			expect(success.status).toBe(0);
			expect(success.stdout).toContain("REHEARSAL_COMPLETE");
			expect(success.stdout).toContain("cleanup=verified");
			expect(readFileSync(dockerLog, "utf8")).toContain("up -d --pull never postgres");
			expect(readFileSync(dockerLog, "utf8")).toContain("down --volumes --remove-orphans");

			writeFileSync(dockerLog, "");
			const suiteFailure = run({ FAKE_SUITE_EXIT: "7" });
			expect(suiteFailure.status).toBe(7);
			expect(suiteFailure.stdout).not.toContain("REHEARSAL_COMPLETE");
			expect(readFileSync(dockerLog, "utf8")).toContain("down --volumes --remove-orphans");

			writeFileSync(dockerLog, "");
			const signal = run({ FAKE_SUITE_SIGNAL: "TERM", FAKE_SUITE_EXIT: "143" });
			expect(signal.status).toBe(143);
			expect(signal.stdout).not.toContain("REHEARSAL_COMPLETE");
			expect(readFileSync(dockerLog, "utf8")).toContain("down --volumes --remove-orphans");

			const cleanupFailure = run({ FAKE_DOWN_EXIT: "9" });
			expect(cleanupFailure.status).toBe(4);
			expect(cleanupFailure.stderr).toContain("BLOCKED_CLEANUP");
			expect(cleanupFailure.stdout).not.toContain("REHEARSAL_COMPLETE");
		} finally {
			rmSync(fakeBin, { force: true, recursive: true });
		}
	});

	it("persists fail-closed daily journal claims before any provider-capable restart", () => {
		const migration = readFileSync(
			new URL("./migrations/0046_selena_journal_daily_claims.sql", import.meta.url),
			"utf8",
		);
		const journal = readFileSync(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8");
		const config = getTableConfig(schema.svJournalDailyClaims);
		const identity = config.indexes.find((index) => index.config.name === "sv_journal_daily_claims_identity_unique");
		const unresolved = config.indexes.find(
			(index) => index.config.name === "sv_journal_daily_claims_unresolved_unique",
		);
		const lockIdentity = config.indexes.find((index) => index.config.name === "sv_journal_daily_claims_lock_unique");
		const projectReference = config.foreignKeys
			.find((foreignKey) => foreignKey.getName() === "sv_journal_daily_claims_project_organization_fk")
			?.reference();
		const lockReference = config.foreignKeys
			.find((foreignKey) => foreignKey.getName() === "sv_journal_daily_claims_lock_project_org_fk")
			?.reference();

		expect(config.enableRLS).toBe(true);
		expect(identity?.config.unique).toBe(true);
		expect(unresolved?.config.unique).toBe(true);
		expect(lockIdentity?.config.unique).toBe(true);
		expect(identity?.config.columns.map((column) => ("name" in column ? column.name : undefined))).toEqual([
			"organization_id",
			"project_id",
			"question_set_version",
			"utc_day",
			"attempt",
		]);
		expect(projectReference?.columns.map((column) => column.name)).toEqual(["project_id", "organization_id"]);
		expect(projectReference?.foreignColumns.map((column) => column.name)).toEqual(["id", "organization_id"]);
		expect(lockReference?.columns.map((column) => column.name)).toEqual([
			"configuration_lock_id",
			"project_id",
			"organization_id",
		]);
		expect(lockReference?.foreignColumns.map((column) => column.name)).toEqual(["id", "project_id", "organization_id"]);
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_journal_daily_claims_identity_unique"');
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_journal_daily_claims_unresolved_unique"');
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_journal_daily_claims_lock_unique"');
		expect(migration).toContain('CONSTRAINT "sv_journal_daily_claims_utc_day_check"');
		expect(migration).toContain('CONSTRAINT "sv_journal_daily_claims_execution_link_check"');
		expect(migration).toContain("JOURNAL_DAILY_CLAIM_LOCK_PROVENANCE_MISMATCH");
		expect(migration).toContain('CREATE POLICY "tenant_isolation" ON "sv_journal_daily_claims"');
		expect(migration).toContain("JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED");
		expect(migration).toContain("JOURNAL_DAILY_CLAIM_INITIAL_STATE_BLOCKED");
		expect(migration).toContain('BEFORE INSERT OR UPDATE OR DELETE ON "sv_journal_daily_claims"');
		expect(migration).toContain('BEFORE TRUNCATE ON "sv_journal_daily_claims"');
		expect(migration).not.toContain("GRANT ");
		expect(journal).toContain('"tag": "0046_selena_journal_daily_claims"');
	});
});

describe("Visibility OS Search and Reputation schema", () => {
	it("exports six RLS-enabled domain tables without changing AI run tables", () => {
		expect(searchAndReputationTables.map((table) => getTableConfig(table).name)).toEqual([
			"sv_search_queries",
			"sv_search_rank_observations",
			"sv_reputation_sources",
			"sv_review_snapshots",
			"sv_review_velocity_metrics",
			"sv_review_topic_observations",
		]);
		for (const table of searchAndReputationTables) expect(getTableConfig(table).enableRLS).toBe(true);
		expect(getTableConfig(schema.svRuns).columns.map((column) => column.name)).not.toContain("domain_id");
	});

	it("keeps absent Reputation values nullable and analysis provenance required", () => {
		const snapshotColumns = getTableConfig(schema.svReviewSnapshots).columns;
		for (const name of ["rating_average", "review_count", "new_reviews"]) {
			expect(snapshotColumns.find((column) => column.name === name)?.notNull).toBe(false);
		}
		const topicColumns = getTableConfig(schema.svReviewTopicObservations).columns;
		expect(topicColumns.find((column) => column.name === "analysis_method_version")?.notNull).toBe(true);
	});

	it("keeps pending SQL aligned with Search/Reputation isolation and provenance", () => {
		const migration = readFileSync(
			new URL("./migrations/0039_visibility_os_search_reputation.sql", import.meta.url),
			"utf8",
		);
		for (const table of searchAndReputationTables) {
			const name = getTableConfig(table).name;
			expect(migration).toContain(`CREATE TABLE "${name}"`);
			expect(migration).toContain(`ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY`);
			expect(migration).toContain(`CREATE POLICY "tenant_isolation" ON "${name}"`);
		}
		expect(migration).toContain('("cycle_id", "query_id", "engine", "region", "device", "repeat_index")');
		expect(migration).toContain('UNIQUE ("location_id", "source")');
		expect(migration).toContain('UNIQUE ("source_id", "period_start", "period_end")');
		expect(migration).toContain('"analysis_method_version" text NOT NULL');
		expect(migration).toContain("\"domain_id\" = 'SEARCH'");
		expect(migration).toContain("\"domain_id\" = 'REPUTATION'");
		expect(migration).not.toContain('ALTER TABLE "sv_runs"');
		expect(migration).not.toContain('ALTER TABLE "sv_cycles"');
		expect(migration).not.toContain('ALTER TABLE "sv_run_permits"');
	});
});

describe("Visibility OS Action and Evidence Loop schema", () => {
	it("exports six RLS-enabled M4 tables beside the recommendation engine ledger", () => {
		expect(actionAndEvidenceTables.map((table) => getTableConfig(table).name)).toEqual([
			"sv_approved_actions",
			"sv_action_approvals",
			"sv_change_events",
			"sv_change_event_assets",
			"sv_verification_cycles",
			"sv_attribution_assessments",
		]);
		for (const table of actionAndEvidenceTables) expect(getTableConfig(table).enableRLS).toBe(true);
		expect(getTableConfig(schema.svRecommendationActions).name).toBe("sv_recommendation_actions");
	});

	it("keeps CAUSAL out of the attribution type and preserves the seven terminal verdicts", () => {
		expect(schema.svAttributionVerdictEnum.enumValues).toEqual([
			"POSITIVE_CORRELATION",
			"NEGATIVE_CORRELATION",
			"NO_OBSERVED_CHANGE",
			"MIXED_RESULT",
			"INSUFFICIENT_EVIDENCE",
			"CONFOUNDED",
			"NOT_MEASURED",
		]);
		expect(schema.svAttributionVerdictEnum.enumValues).not.toContain("CAUSAL");
	});

	it("allows unattributed changes but requires action and attribution evidence", () => {
		const actionColumns = getTableConfig(schema.svApprovedActions).columns;
		expect(actionColumns.find((column) => column.name === "evidence_ids")?.notNull).toBe(true);
		const changeColumns = getTableConfig(schema.svChangeEvents).columns;
		expect(changeColumns.find((column) => column.name === "action_id")?.notNull).toBe(false);
		const assessmentColumns = getTableConfig(schema.svAttributionAssessments).columns;
		expect(assessmentColumns.find((column) => column.name === "evidence_ids")?.notNull).toBe(true);
		expect(assessmentColumns.find((column) => column.name === "change_event_ids")?.notNull).toBe(true);
	});

	it("adds nullable domain and location scope to the legacy finding ledger", () => {
		for (const table of [schema.svFindings, schema.svRecommendations]) {
			const columns = getTableConfig(table).columns;
			expect(columns.find((column) => column.name === "domain_id")?.notNull).toBe(false);
			expect(columns.find((column) => column.name === "location_id")?.notNull).toBe(false);
		}
	});

	it("keeps pending SQL aligned with evidence, transition and verification gates", () => {
		const migration = readFileSync(
			new URL("./migrations/0040_visibility_os_action_evidence_loop.sql", import.meta.url),
			"utf8",
		);
		const rollback = readFileSync(
			new URL("./migrations/_pending-os/M4_action_evidence_loop_down.sql", import.meta.url),
			"utf8",
		);
		for (const table of actionAndEvidenceTables) {
			const name = getTableConfig(table).name;
			expect(migration).toContain(`CREATE TABLE "${name}"`);
			expect(migration).toContain(`ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY`);
			expect(migration).toContain(`CREATE POLICY "tenant_isolation" ON "${name}"`);
		}
		expect(migration).toContain('cardinality("evidence_ids") > 0');
		expect(migration).toContain('UNIQUE ("action_id", "approval_version")');
		expect(migration).toContain('UNIQUE ("action_id", "attempt")');
		expect(migration).toContain('UNIQUE ("verification_cycle_id", "metric_key", "formula_version")');
		expect(migration).toContain("sv_guard_action_status_transition");
		expect(migration).toContain("ACTION_VERIFICATION_INCOMPLETE");
		expect(migration).toContain("ATTRIBUTION_VERIFICATION_INCOMPLETE");
		expect(migration).toContain('ALTER TABLE "sv_findings"');
		expect(migration).toContain('ALTER TABLE "sv_recommendations"');
		expect(migration).not.toContain("'CAUSAL'");
		expect(migration).not.toContain('CREATE TABLE "sv_outcome_');
		for (const table of actionAndEvidenceTables.toReversed()) {
			expect(rollback).toContain(`DROP TABLE IF EXISTS "${getTableConfig(table).name}"`);
		}
		expect(rollback).not.toContain('DROP TABLE IF EXISTS "sv_incidents"');
		expect(rollback).not.toContain('DROP TABLE IF EXISTS "sv_audit_events"');
	});
});

describe("Visibility OS Map read models", () => {
	it("exports two existing views instead of a table per map mode", () => {
		expect(
			[schema.svVisibilityMapPoints, schema.svVisibilityMapDatasets].map((view) => getViewConfig(view)),
		).toMatchObject([
			{ name: "sv_visibility_map_points", isExisting: true },
			{ name: "sv_visibility_map_datasets", isExisting: true },
		]);
	});

	it("keeps pending SQL bound to immutable dataset evidence and observation provenance", () => {
		const migration = readFileSync(
			new URL("./migrations/0041_visibility_os_visibility_map.sql", import.meta.url),
			"utf8",
		);
		const rollback = readFileSync(
			new URL("./migrations/_pending-os/M5_visibility_map_down.sql", import.meta.url),
			"utf8",
		);
		expect(migration).toContain('CREATE VIEW "sv_visibility_map_points" WITH (security_invoker = true)');
		expect(migration).toContain('CREATE VIEW "sv_visibility_map_datasets" WITH (security_invoker = true)');
		expect(migration).toContain('evidence."observation_ref" = observation."id"::text');
		expect(migration).toContain('dataset."immutable" = true');
		expect(migration).toContain('observation."id" AS "observation_id"');
		expect(migration).toContain('false AS "interpolated"');
		expect(migration).toContain("'LIVE_VIEW'::text AS \"materialization_kind\"");
		expect(migration).toContain('NULL::timestamptz AS "refreshed_at"');
		expect(migration).toContain('array_agg(DISTINCT point."keyword_id"');
		expect(migration).not.toContain("CREATE TABLE");
		expect(migration).not.toContain("MATERIALIZED VIEW");
		expect(migration).not.toContain('ALTER TABLE "sv_runs"');
		expect(rollback).toContain('DROP VIEW IF EXISTS "sv_visibility_map_datasets"');
		expect(rollback).toContain('DROP VIEW IF EXISTS "sv_visibility_map_points"');
		expect(rollback).not.toContain("DROP TABLE");
	});
});

describe("Visibility OS Outcome Layer schema", () => {
	it("registers M2 through local attempt-count hardening as one ordered numbered migration chain", () => {
		const journal = JSON.parse(readFileSync(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8")) as {
			entries: Array<{ idx: number; tag: string }>;
		};
		expect(journal.entries.slice(-15)).toEqual([
			{ idx: 38, version: "7", when: 1787940000000, tag: "0038_visibility_os_local_visibility", breakpoints: true },
			{ idx: 39, version: "7", when: 1787940001000, tag: "0039_visibility_os_search_reputation", breakpoints: true },
			{ idx: 40, version: "7", when: 1787940002000, tag: "0040_visibility_os_action_evidence_loop", breakpoints: true },
			{ idx: 41, version: "7", when: 1787940003000, tag: "0041_visibility_os_visibility_map", breakpoints: true },
			{ idx: 42, version: "7", when: 1787940004000, tag: "0042_visibility_os_outcome_layer", breakpoints: true },
			{
				idx: 43,
				version: "7",
				when: 1787940005000,
				tag: "0043_visibility_os_local_domain_attempts_expand",
				breakpoints: true,
			},
			{
				idx: 44,
				version: "7",
				when: 1787940006000,
				tag: "0044_visibility_os_local_live_persistence",
				breakpoints: true,
			},
			{
				idx: 45,
				version: "7",
				when: 1787940007000,
				tag: "0045_visibility_os_domain_and_lock_hardening",
				breakpoints: true,
			},
			{
				idx: 46,
				version: "7",
				when: 1787940008000,
				tag: "0046_selena_journal_daily_claims",
				breakpoints: true,
			},
			{
				idx: 47,
				version: "7",
				when: 1787940009000,
				tag: "0047_visibility_os_local_attempt_count_cap",
				breakpoints: true,
			},
			{
				idx: 48,
				version: "7",
				when: 1787940010000,
				tag: "0048_selena_api_idempotency_records",
				breakpoints: true,
			},
			{
				idx: 49,
				version: "7",
				when: 1787940011000,
				tag: "0049_visibility_os_claimed_submit_lease",
				breakpoints: true,
			},
			{
				idx: 50,
				version: "7",
				when: 1787940012000,
				tag: "0050_visibility_os_jsonb_text_operator_casts",
				breakpoints: true,
			},
			{
				idx: 51,
				version: "7",
				when: 1787940013000,
				tag: "0051_visibility_os_provider_evidence_provenance",
				breakpoints: true,
			},
			{
				idx: 52,
				version: "7",
				when: 1787940014000,
				tag: "0052_provider_dataset_snapshot_journal",
				breakpoints: true,
			},
		]);
	});

	it("caps Local Maps observation attempts at three and fails closed on legacy overflow", () => {
		const migration = readFileSync(
			new URL("./migrations/0047_visibility_os_local_attempt_count_cap.sql", import.meta.url),
			"utf8",
		);
		const journal = readFileSync(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8");
		const dialect = new PgDialect();
		const attemptCheck = getTableConfig(schema.svLocalRankObservations).checks.find(
			(candidate) => candidate.name === "sv_local_rank_observations_attempt_check",
		);

		expect(attemptCheck && dialect.sqlToQuery(attemptCheck.value).sql).toContain('"attempt_count" BETWEEN 1 AND 3');
		expect(migration).toContain('LOCK TABLE "sv_local_rank_observations" IN ACCESS EXCLUSIVE MODE');
		expect(migration).toContain("LOCAL_MAPS_0047_ATTEMPT_COUNT_INVALID");
		expect(migration).toContain('CONSTRAINT "sv_local_rank_observations_attempt_count_cap_check"');
		expect(migration).toContain('CHECK ("attempt_count" BETWEEN 1 AND 3) NOT VALID');
		expect(migration).toContain('VALIDATE CONSTRAINT "sv_local_rank_observations_attempt_count_cap_check"');
		expect(migration).not.toContain("provider_call");
		expect(migration).not.toContain("GRANT ");
		expect(journal).toContain('"tag": "0047_visibility_os_local_attempt_count_cap"');
	});

	it("defines an immutable, tenant-scoped seven-day response cache for mutating API retries", () => {
		const migration = readFileSync(
			new URL("./migrations/0048_selena_api_idempotency_records.sql", import.meta.url),
			"utf8",
		);
		const config = getTableConfig(schema.svApiIdempotencyRecords);
		const identity = config.indexes.find((index) => index.config.name === "sv_api_idempotency_identity_unique");
		const expiry = config.checks.find((candidate) => candidate.name === "sv_api_idempotency_expiry_check");

		expect(config.name).toBe("sv_api_idempotency_records");
		expect(config.enableRLS).toBe(true);
		expect(identity?.config.unique).toBe(true);
		expect(expiry && new PgDialect().sqlToQuery(expiry.value).sql).toContain("interval '7 days'");
		expect(migration).toContain('CREATE POLICY "tenant_isolation" ON "sv_api_idempotency_records"');
		expect(migration).toContain('CREATE UNIQUE INDEX "sv_api_idempotency_identity_unique"');
		expect(migration).toContain("API_IDEMPOTENCY_ACTIVE_DELETE_BLOCKED");
		expect(migration).toContain("API_IDEMPOTENCY_UPDATE_BLOCKED");
		expect(migration).toContain("API_IDEMPOTENCY_TRUNCATE_BLOCKED");
		expect(migration).not.toContain("GRANT ");
	});

	it("exports four RLS-enabled M6 tables and keeps observations nullable", () => {
		expect(outcomeTables.map((table) => getTableConfig(table).name)).toEqual([
			"sv_outcome_sources",
			"sv_outcome_metric_definitions",
			"sv_outcome_observations",
			"sv_outcome_attribution_windows",
		]);
		for (const table of outcomeTables) expect(getTableConfig(table).enableRLS).toBe(true);
		const columns = getTableConfig(schema.svOutcomeObservations).columns;
		expect(columns.find((column) => column.name === "value")?.notNull).toBe(false);
		expect(columns.find((column) => column.name === "source_id")?.notNull).toBe(true);
		expect(columns.find((column) => column.name === "dataset_id")?.notNull).toBe(true);
	});

	it("extends attribution with an optional persisted Outcome window", () => {
		const columns = getTableConfig(schema.svAttributionAssessments).columns;
		expect(columns.find((column) => column.name === "outcome_window_id")?.notNull).toBe(false);
		expect(schema.svAttributionVerdictEnum.enumValues).not.toContain("CAUSAL");
	});

	it("keeps numbered SQL aligned with Outcome provenance and tenant gates", () => {
		const migration = readFileSync(
			new URL("./migrations/0042_visibility_os_outcome_layer.sql", import.meta.url),
			"utf8",
		);
		const rollback = readFileSync(
			new URL("./migrations/_pending-os/M6_outcome_layer_down.sql", import.meta.url),
			"utf8",
		);
		for (const table of outcomeTables) {
			const name = getTableConfig(table).name;
			expect(migration).toContain(`CREATE TABLE "${name}"`);
			expect(migration).toContain(`ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY`);
			expect(migration).toContain(`CREATE POLICY "tenant_isolation" ON "${name}"`);
			expect(rollback).toContain(`DROP TABLE IF EXISTS "${name}"`);
		}
		expect(migration).toContain("\"access_class\" IN ('CONNECTED', 'UPLOADED')");
		expect(migration).toContain('UNIQUE ("source_id", "metric_key", "period_start", "period_end")');
		expect(migration).toContain('"value" numeric(18, 6)');
		expect(migration).toContain('ADD COLUMN "outcome_window_id" uuid');
		expect(migration).toContain("\"domain_id\" = 'OUTCOME'");
		expect(migration).toContain("OUTCOME_SOURCE_MISMATCH");
		expect(migration).not.toContain('ALTER TABLE "sv_runs"');
		expect(migration).not.toContain("ownerApprovedMeasurementAdapters");
		expect(rollback).not.toContain('DROP TABLE IF EXISTS "sv_incidents"');
		expect(rollback).not.toContain('DROP TABLE IF EXISTS "sv_audit_events"');
	});
});
