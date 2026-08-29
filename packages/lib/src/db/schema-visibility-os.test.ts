import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
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
