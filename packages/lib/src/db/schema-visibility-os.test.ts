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
