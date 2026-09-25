-- Owner-run staging bootstrap for the non-owner application role. Migrations
-- through 0060 must be committed first so this script can grant only known runtime
-- surfaces. Re-running the script converges privileges to this allowlist.
--
--   psql -v role_password='...' -f selena-rls-runtime-role.sql

\set ON_ERROR_STOP on

BEGIN;

DO $preflight$
BEGIN
	IF to_regclass('public.sv_provider_canary_executions') IS NULL
		OR to_regclass('public.sv_evidence_index') IS NULL
		OR to_regclass('public.sv_measurement_cycles') IS NULL
		OR to_regclass('public.sv_configuration_locks') IS NULL
		OR to_regclass('public.sv_measurement_datasets') IS NULL
		OR to_regclass('public.sv_source_snapshots') IS NULL
		OR to_regclass('public.sv_provider_dataset_capabilities') IS NULL
		OR to_regclass('public.sv_evidence_acceptance_receipts') IS NULL
		OR to_regclass('public.sv_evidence_read_model') IS NULL
		OR to_regprocedure('public.sv_resolve_api_key_context(text)') IS NULL THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0051';
	END IF;

	IF to_regprocedure('public.sv_enforce_provider_capability_insert_scope()') IS NULL
		OR to_regprocedure('public.sv_restrict_runtime_source_snapshot_promotion()') IS NULL
		OR to_regprocedure('public.sv_require_owner_evidence_acceptance_insert()') IS NULL
		OR to_regprocedure('public.sv_require_formal_evidence_audit_pair()') IS NULL
		OR to_regprocedure('public.sv_require_formal_evidence_receipt_pair()') IS NULL
		OR to_regprocedure('public.sv_enforce_formal_evidence_audit()') IS NULL
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_attribute
			WHERE attrelid = 'public.sv_source_snapshots'::regclass
				AND attname = 'project_id'
				AND NOT attisdropped
		)
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_attribute
			WHERE attrelid = 'public.sv_evidence_index'::regclass
				AND attname = 'project_id'
				AND attnotnull
				AND NOT attisdropped
		)
		OR to_regclass('public.sv_source_snapshots_project_content_sha256_unique') IS NULL
		OR to_regclass('public.sv_source_snapshots_legacy_org_content_sha256_unique') IS NULL
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_constraint
			WHERE conrelid = 'public.sv_evidence_index'::regclass
				AND conname = 'sv_evidence_index_formal_identity_unique'
				AND convalidated
		)
		OR (
			SELECT count(*)
			FROM pg_catalog.pg_constraint
			WHERE conname IN (
				'sv_source_snapshots_project_org_fk',
				'sv_evidence_index_project_org_fk',
				'sv_evidence_index_source_snapshot_project_org_fk',
				'sv_source_snapshots_provider_capture_metadata_check'
			)
				AND convalidated
		) <> 4
		OR pg_catalog.pg_get_functiondef('public.sv_enforce_evidence_capability_domain()'::regprocedure)
			NOT LIKE '%cycle_project_id%'
		OR pg_catalog.pg_get_functiondef('public.sv_enforce_evidence_acceptance_receipt()'::regprocedure)
			NOT LIKE '%EVIDENCE_ACCEPTANCE_ENVIRONMENT_NOT_APPROVED%'
		OR pg_catalog.pg_get_functiondef('public.sv_enforce_formal_evidence_audit()'::regprocedure)
			NOT LIKE '%FORMAL_EVIDENCE_AUDIT_DETAILS_INVALID%'
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_class
			WHERE oid = 'public.sv_evidence_read_model'::regclass
				AND 'security_invoker=true' = ANY (coalesce(reloptions, ARRAY[]::text[]))
		)
		OR pg_catalog.pg_get_viewdef('public.sv_evidence_read_model'::regclass, true)
			NOT LIKE '%lock.project_id = evidence.project_id%'
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_trigger
			WHERE tgrelid = 'public.sv_provider_dataset_capabilities'::regclass
				AND tgname = 'sv_provider_dataset_capabilities_owner_insert_guard'
				AND tgenabled = 'O'
		)
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_trigger
			WHERE tgrelid = 'public.sv_source_snapshots'::regclass
				AND tgname = 'sv_source_snapshots_runtime_promotion_guard'
				AND tgenabled = 'O'
		)
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_trigger
			WHERE tgrelid = 'public.sv_evidence_acceptance_receipts'::regclass
				AND tgname = 'sv_evidence_acceptance_receipts_owner_guard'
				AND tgenabled = 'O'
		)
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_trigger
			WHERE tgrelid = 'public.sv_evidence_acceptance_receipts'::regclass
				AND tgname = 'sv_evidence_acceptance_receipts_audit_pair_guard'
				AND tgenabled = 'O'
		)
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_trigger
			WHERE tgrelid = 'public.sv_audit_events'::regclass
				AND tgname = 'sv_audit_events_formal_evidence_owner_guard'
				AND tgenabled = 'O'
		)
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_trigger
			WHERE tgrelid = 'public.sv_audit_events'::regclass
				AND tgname = 'sv_audit_events_formal_evidence_receipt_pair_guard'
				AND tgenabled = 'O'
		) THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0057';
	END IF;

	IF to_regnamespace('pgboss') IS NULL
		OR to_regclass('pgboss.version') IS NULL
		OR to_regclass('pgboss.bam') IS NULL
		OR to_regclass('pgboss.job') IS NULL
		OR to_regclass('pgboss.job_common') IS NULL
		OR to_regclass('pgboss.job_dependency') IS NULL
		OR to_regclass('pgboss.queue') IS NULL
		OR to_regclass('pgboss.queue_stats') IS NULL
		OR to_regclass('pgboss.schedule') IS NULL
		OR to_regclass('pgboss.subscription') IS NULL
		OR to_regclass('pgboss.warning') IS NULL
		OR to_regprocedure('pgboss.create_queue(text,jsonb)') IS NULL
		OR to_regprocedure('pgboss.job_table_format(text,text)') IS NULL
		OR to_regprocedure('pgboss.delete_queue(text)') IS NULL
		OR to_regprocedure('pgboss.job_table_run(text,text,text)') IS NULL
		OR to_regprocedure('pgboss.job_table_run_async(text,integer,text,text,text)') IS NULL THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_PGBOSS_SCHEMA';
	END IF;

	IF to_regclass('public.sv_journal_provider_boundaries') IS NULL
		OR to_regprocedure('public.sv_journal_claim_recovery_state(uuid)') IS NULL
		OR to_regprocedure('public.sv_recover_journal_daily_claim(uuid,text)') IS NULL
		OR NOT EXISTS (
			SELECT 1 FROM pg_catalog.pg_class
			WHERE oid = 'public.sv_journal_provider_boundaries'::regclass
				AND relrowsecurity AND relforcerowsecurity
		)
		OR NOT EXISTS (
			SELECT 1 FROM pg_catalog.pg_trigger
			WHERE tgrelid = 'public.sv_runs'::regclass
				AND tgname = 'sv_require_journal_provider_boundary'
				AND tgenabled = 'O'
		)
		OR NOT EXISTS (
			SELECT 1 FROM pg_catalog.pg_trigger
			WHERE tgrelid = 'public.sv_journal_provider_boundaries'::regclass
				AND tgname = 'sv_prevent_journal_provider_boundary_mutation'
				AND tgenabled = 'O'
		) THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0058';
	END IF;

	IF to_regclass('public.sv_journal_no_spend_reconciliations') IS NULL
		OR to_regprocedure('public.sv_owner_reconcile_journal_no_spend(uuid,uuid[],text,text,text[],timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone,text,text)') IS NULL
		OR NOT EXISTS (
			SELECT 1 FROM pg_catalog.pg_class
			WHERE oid = to_regclass('public.sv_journal_no_spend_reconciliations')
				AND relrowsecurity AND relforcerowsecurity
		)
		OR NOT EXISTS (
			SELECT 1 FROM pg_catalog.pg_trigger
			WHERE tgrelid = to_regclass('public.sv_journal_no_spend_reconciliations')
				AND tgname = 'sv_journal_no_spend_reconciliations_owner_insert_guard'
				AND tgenabled = 'O'
		)
		OR NOT EXISTS (
			SELECT 1 FROM pg_catalog.pg_trigger
			WHERE tgrelid = to_regclass('public.sv_journal_no_spend_reconciliations')
				AND tgname = 'sv_journal_no_spend_reconciliations_immutable_guard'
				AND tgenabled = 'O'
		)
		OR NOT EXISTS (
			SELECT 1 FROM pg_catalog.pg_trigger
			WHERE tgrelid = 'public.sv_journal_daily_claims'::regclass
				AND tgname = 'sv_guard_journal_daily_claim_mutation'
				AND tgenabled = 'O'
		) THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0059';
	END IF;

	IF to_regprocedure('public.sv_reconcile_journal_hold(uuid,text,text,boolean,boolean)') IS NULL
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_attribute
			WHERE attrelid = 'public.sv_journal_daily_claims'::regclass
				AND attname IN ('reconciled_at', 'reconciliation_reason', 'reconciled_by')
				AND NOT attisdropped
			GROUP BY attrelid
			HAVING count(*) = 3
		)
		OR pg_catalog.pg_get_functiondef('public.sv_guard_journal_daily_claim_mutation()'::regprocedure)
			NOT LIKE '%JOURNAL_HOLD_RECONCILIATION_FUNCTION_REQUIRED%'
		OR pg_catalog.pg_get_functiondef('public.sv_guard_journal_daily_claim_mutation()'::regprocedure)
			NOT LIKE '%JOURNAL_DAILY_CLAIM_NO_SPEND_CERTIFICATE_REQUIRED%'
	THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0060';
	END IF;

	IF to_regprocedure('public.sv_reconcile_journal_executor_settled(uuid,text,text,boolean,boolean)') IS NULL THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0065';
	END IF;

	IF to_regprocedure('public.sv_resolve_session_memberships(text)') IS NULL
		OR NOT EXISTS (
			SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'member'
		) THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0069';
	END IF;

	IF to_regprocedure('public.sv_resolve_brand_membership(text, text)') IS NULL
		OR to_regprocedure('public.sv_resolve_prompt_membership(text, uuid)') IS NULL
		OR to_regprocedure('public.sv_resolve_user_organizations(text)') IS NULL THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0070';
	END IF;

	IF to_regprocedure('public.sv_brand_id_taken(text)') IS NULL
		OR to_regprocedure('public.sv_organization_slug_taken(text)') IS NULL THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_MIGRATION_0071';
	END IF;

	IF (SELECT count(*) FROM pgboss.version) <> 1
		OR NOT EXISTS (SELECT 1 FROM pgboss.version WHERE version = 37) THEN
		RAISE EXCEPTION 'SELENA_RUNTIME_ROLE_REQUIRES_PGBOSS_SCHEMA_VERSION_37';
	END IF;
END;
$preflight$;

SELECT format(
	'CREATE ROLE selena_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS',
	:'role_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app')
\gexec

ALTER ROLE selena_app LOGIN PASSWORD :'role_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO selena_app;

-- The safe evidence view is security-invoker. Force every tenant policy on its
-- complete underlying graph so an accidental owner connection cannot bypass
-- isolation while the runtime role is being accepted or rotated.
ALTER TABLE sv_evidence_index FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_measurement_cycles FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_configuration_locks FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_measurement_datasets FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_source_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_provider_dataset_capabilities FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_evidence_acceptance_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_journal_daily_claims FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_journal_provider_boundaries FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_journal_no_spend_reconciliations FORCE ROW LEVEL SECURITY;

-- Remove privileges left by an older version of this bootstrap before applying
-- the explicit runtime allowlist. No future table or sequence is auto-granted.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM selena_app;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM selena_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM selena_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM selena_app;

-- 0059 no-spend owner recovery is explicitly owner-only: neither the immutable
-- certificate table nor any of its guard/reconcile functions are reachable by
-- the runtime role. REVOKE ALL is the allowlist default; these lines make the
-- boundary self-documenting on top of that default.
REVOKE ALL ON sv_journal_no_spend_reconciliations FROM selena_app;
REVOKE ALL ON FUNCTION sv_owner_reconcile_journal_no_spend(
	uuid, uuid[], text, text, text[], timestamptz, timestamptz,
	timestamptz, timestamptz, text, text
) FROM selena_app;
REVOKE ALL ON FUNCTION
	sv_guard_journal_no_spend_reconciliation_insert(),
	sv_reject_journal_no_spend_reconciliation_mutation(),
	sv_require_journal_no_spend_claim_pair(),
	sv_reject_journal_no_spend_dependency_mutation(),
	sv_reject_journal_no_spend_cost_insert(),
	sv_reject_journal_no_spend_outcome_mutation(),
	sv_reject_journal_no_spend_provider_snapshot_insert(),
	sv_reject_journal_no_spend_execution_truncate()
FROM selena_app;

-- 0060's ambiguous-spend reconciliation is also owner-only. The application
-- role can observe allowlisted claim metadata but cannot invoke the owner write.
REVOKE ALL ON FUNCTION sv_reconcile_journal_hold(uuid, text, text, boolean, boolean) FROM selena_app;
-- 0065's executor-settled release is the same boundary for the other shape.
REVOKE ALL ON FUNCTION sv_reconcile_journal_executor_settled(uuid, text, text, boolean, boolean) FROM selena_app;

-- pg-boss schema lifecycle remains owner-managed. This is the fixed v37
-- runtime allowlist: schema state is read-only, queue data is mutable, and only
-- the non-destructive queue bootstrap functions are callable. Migration/DDL
-- helpers stay owner-only, including through PUBLIC's default function ACL.
GRANT USAGE ON SCHEMA pgboss TO selena_app;
REVOKE CREATE ON SCHEMA pgboss FROM selena_app;
REVOKE CREATE ON SCHEMA pgboss FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA pgboss FROM selena_app;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA pgboss FROM selena_app;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA pgboss FROM selena_app;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA pgboss FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA pgboss FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA pgboss FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgboss REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON
	pgboss.job, pgboss.job_common, pgboss.job_dependency,
	pgboss.queue, pgboss.schedule, pgboss.subscription
TO selena_app;
GRANT SELECT ON pgboss.bam, pgboss.version TO selena_app;
GRANT EXECUTE ON FUNCTION
	pgboss.create_queue(text, jsonb)
TO selena_app;

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
	sv_local_competitor_observations, sv_local_visibility_metrics,
	sv_simulation_subscriptions, sv_simulation_connect_tokens,
	sv_simulation_recipients, sv_simulation_reports, sv_simulation_deliveries
TO selena_app;

-- Append-only evidence and audit objects expose only the operations used by
-- runtime repositories. Trigger guards remain the second line of defence.
GRANT SELECT, INSERT ON
	sv_audit_events, sv_provider_dataset_capabilities,
	sv_provider_canary_executions, sv_evidence_index
TO selena_app;
GRANT SELECT, INSERT ON sv_journal_provider_boundaries TO selena_app;
-- The simulation's attempt log is append-only for the same reason the audit
-- trail is: a delivery attempt that could be edited afterwards proves nothing.
GRANT SELECT, INSERT ON sv_simulation_delivery_attempts TO selena_app;

-- The bootstrap nonce ledger holds no tenant data; it is swept rather than kept.
GRANT SELECT, INSERT, DELETE ON sv_simulation_bootstrap_nonces TO selena_app;
GRANT EXECUTE ON FUNCTION sv_journal_claim_recovery_state(uuid) TO selena_app;
GRANT EXECUTE ON FUNCTION sv_recover_journal_daily_claim(uuid, text) TO selena_app;
SELECT 'GRANT SELECT, INSERT ON sv_provider_dataset_snapshot_events TO selena_app'
WHERE to_regclass('public.sv_provider_dataset_snapshot_events') IS NOT NULL
\gexec
-- Local Maps pilot runtime (migration 0075). Acceptances are append-only; the
-- other rows move through states their trigger guards check.
SELECT format('GRANT %s ON %I TO selena_app', privileges, name)
FROM (VALUES
	('sv_local_dispatch_outbox', 'SELECT, INSERT, UPDATE'),
	('sv_local_report_versions', 'SELECT, INSERT, UPDATE'),
	('sv_local_qc_decisions', 'SELECT, INSERT, UPDATE'),
	('sv_local_report_deliveries', 'SELECT, INSERT, UPDATE'),
	('sv_local_canary_reviews', 'SELECT, INSERT, UPDATE'),
	('sv_local_raw_evidence', 'SELECT, INSERT, UPDATE'),
	('sv_local_raw_retention_health', 'SELECT, INSERT, UPDATE'),
	('sv_local_evidence_acceptances', 'SELECT, INSERT')
) AS pilot(name, privileges)
WHERE to_regclass('public.' || name) IS NOT NULL
\gexec
GRANT INSERT ON sv_source_snapshots TO selena_app;
REVOKE SELECT (
	source_ref, content_sha256, snapshot, provider_dataset_ref, environment, raw_reference
) ON sv_source_snapshots FROM selena_app;
GRANT SELECT (
	id, organization_id, project_id, source_type, capability_id,
	input_schema_version, output_schema_version, content_sha256_format_valid,
	captured_at, immutable, created_at
) ON sv_source_snapshots TO selena_app;

-- Security-invoker read models also require read access to their safe
-- underlying relational projections. Raw/provider provenance remains private.
GRANT SELECT ON
	sv_evidence_read_model, sv_visibility_map_points, sv_visibility_map_datasets
TO selena_app;
REVOKE ALL ON sv_evidence_provenance FROM selena_app;
REVOKE ALL ON sv_evidence_acceptance_receipts FROM selena_app;
GRANT SELECT (id, organization_id, evidence_id, accepted_at)
	ON sv_evidence_acceptance_receipts TO selena_app;

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

-- Session sign-in likewise resolves memberships before any tenant exists.
GRANT EXECUTE ON FUNCTION sv_resolve_session_memberships(text) TO selena_app;

-- Brand, prompt and organization access checks run before the organization is known.
GRANT EXECUTE ON FUNCTION sv_resolve_brand_membership(text, text) TO selena_app;
GRANT EXECUTE ON FUNCTION sv_resolve_prompt_membership(text, uuid) TO selena_app;
GRANT EXECUTE ON FUNCTION sv_resolve_user_organizations(text) TO selena_app;

-- Brand ids and organization slugs are unique across tenants.
GRANT EXECUTE ON FUNCTION sv_brand_id_taken(text) TO selena_app;
GRANT EXECUTE ON FUNCTION sv_organization_slug_taken(text) TO selena_app;

COMMIT;
