import { readFileSync } from "node:fs";
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
	it("registers M2 through local live persistence as one ordered numbered migration chain", () => {
		const journal = JSON.parse(readFileSync(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8")) as {
			entries: Array<{ idx: number; tag: string }>;
		};
		expect(journal.entries.slice(-7)).toEqual([
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
		]);
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
