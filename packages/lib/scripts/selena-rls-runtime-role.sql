-- Owner-run staging bootstrap for the non-owner application role. Migration
-- 0051 must be committed first so this script can grant only known runtime
-- surfaces. Re-running the script converges privileges to this allowlist.
--
--   psql -v role_password='...' -f selena-rls-runtime-role.sql

\set ON_ERROR_STOP on

BEGIN;

DO $preflight$
BEGIN
	IF to_regclass('public.sv_provider_canary_executions') IS NULL
		OR to_regclass('public.sv_evidence_read_model') IS NULL
		OR to_regprocedure('public.sv_resolve_api_key_context(text)') IS NULL THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0051';
	END IF;
END;
$preflight$;

SELECT format(
	'CREATE ROLE selena_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS',
	:'role_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app')
\gexec

ALTER ROLE selena_app LOGIN PASSWORD :'role_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO selena_app;

-- Remove privileges left by an older version of this bootstrap before applying
-- the explicit runtime allowlist. No future table or sequence is auto-granted.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM selena_app;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM selena_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM selena_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM selena_app;

-- Better Auth and tenant membership bootstrap run before app.organization_id
-- can be set. These are the only non-Selena identity surfaces used at runtime.
GRANT SELECT, INSERT, UPDATE, DELETE ON
	"user", "session", "account", "verification", "organization", "member",
	"invitation", "sso_provider", "subscription"
TO selena_app;

-- Core Elmo runtime objects. Reports are never deleted by the application.
GRANT SELECT, INSERT, UPDATE, DELETE ON
	brands, prompts, competitors, prompt_runs, prompt_run_hourly_aggregates,
	citations, brand_opportunities, organization_settings, usage_events, secrets
TO selena_app;
GRANT SELECT, INSERT, UPDATE ON reports TO selena_app;

-- Mutable Selena runtime state reached by the web and worker repositories.
GRANT SELECT, INSERT, UPDATE, DELETE ON
	sv_api_keys, sv_api_idempotency_records, sv_projects, sv_prompt_families,
	sv_scenarios, sv_configuration_locks, sv_journal_daily_claims, sv_quotes,
	sv_orders, sv_cycles, sv_payments, sv_findings, sv_recommendations,
	sv_project_profiles, sv_website_snapshots, sv_run_permits, sv_runs,
	sv_response_mentions, sv_citation_gap_snapshots, sv_incidents, sv_cost_events,
	sv_recommendation_runs, sv_recommendation_manifests,
	sv_recommendation_evidence, sv_recommendation_findings,
	sv_recommendation_actions, sv_recommendation_tasks, sv_entities,
	sv_business_locations, sv_pilot_cycles, sv_capture_tasks,
	sv_local_observations, sv_observation_mentions,
	sv_observation_evidence_assets, sv_qc_records, sv_order_requests,
	sv_measurement_cycles, sv_measurement_attempts, sv_measurement_datasets,
	sv_local_keywords, sv_grid_definitions, sv_grid_points, sv_local_scan_cycles,
	sv_measurement_attempt_results, sv_local_rank_observations,
	sv_local_competitor_observations, sv_local_visibility_metrics
TO selena_app;

-- Append-only evidence and audit objects expose only the operations used by
-- runtime repositories. Trigger guards remain the second line of defence.
GRANT SELECT, INSERT ON
	sv_audit_events, sv_provider_dataset_capabilities,
	sv_provider_canary_executions, sv_evidence_index
TO selena_app;
SELECT 'GRANT SELECT, INSERT ON sv_provider_dataset_snapshot_events TO selena_app'
WHERE to_regclass('public.sv_provider_dataset_snapshot_events') IS NOT NULL
\gexec
GRANT INSERT ON sv_source_snapshots TO selena_app;
REVOKE SELECT (
	source_ref, content_sha256, snapshot, provider_dataset_ref, environment, raw_reference
) ON sv_source_snapshots FROM selena_app;
GRANT SELECT (
	id, organization_id, source_type, capability_id,
	input_schema_version, output_schema_version, captured_at, immutable, created_at
) ON sv_source_snapshots TO selena_app;

-- Security-invoker read models also require read access to their safe
-- underlying relational projections. Raw/provider provenance remains private.
GRANT SELECT ON
	sv_evidence_read_model, sv_visibility_map_points, sv_visibility_map_datasets
TO selena_app;
REVOKE ALL ON sv_evidence_provenance FROM selena_app;

-- Bootstrap only the tenant identifier needed to enter report-table RLS. The
-- function cannot return report content and ignores unattributed legacy rows.
CREATE OR REPLACE FUNCTION sv_resolve_report_context(report_id uuid)
RETURNS TABLE (organization_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT "report"."organization_id"
	FROM "public"."reports" AS "report"
	WHERE "report"."id" = $1
		AND "report"."organization_id" IS NOT NULL
	LIMIT 1
$$;
REVOKE ALL ON FUNCTION sv_resolve_report_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sv_resolve_report_context(uuid) TO selena_app;

-- API-key authentication likewise needs a tenant before the request
-- transaction can set app.organization_id.
GRANT EXECUTE ON FUNCTION sv_resolve_api_key_context(text) TO selena_app;

COMMIT;
