import { readFileSync } from "node:fs";
import { getTableConfig, getViewConfig } from "drizzle-orm/pg-core";
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
			new URL("./migrations/_pending-os/M2_local_visibility.sql", import.meta.url),
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
			new URL("./migrations/_pending-os/M3_search_reputation.sql", import.meta.url),
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
			new URL("./migrations/_pending-os/M4_action_evidence_loop.sql", import.meta.url),
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
		const migration = readFileSync(new URL("./migrations/_pending-os/M5_visibility_map.sql", import.meta.url), "utf8");
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
