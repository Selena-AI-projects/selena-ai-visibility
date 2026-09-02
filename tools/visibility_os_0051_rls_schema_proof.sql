-- RLS_SCHEMA_PROOF_ONLY for the migration frontier through 0051.
--
-- Source-only acceptance artifact. This file does not connect to a database.
-- Do not execute it against shared staging without separate owner approval, a
-- verified restorable checkpoint, and a migration receipt ending at 0051.
-- Run with psql as a database administration role that can CREATE ROLE and
-- grant table privileges, after applying selena-rls-runtime-role.sql. The proof
-- is deliberately one transaction and ends with ROLLBACK, so its temporary
-- membership, grants and fixtures do not persist.

\set ON_ERROR_STOP on

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
SET LOCAL row_security = on;

DO $proof_preflight$
DECLARE
	capability_rls boolean;
	capability_force_rls boolean;
	canary_rls boolean;
	canary_force_rls boolean;
	acceptance_rls boolean;
	acceptance_force_rls boolean;
	provenance_options text[];
	tenant_relation text;
	tenant_rls boolean;
	tenant_force_rls boolean;
BEGIN
	IF to_regclass('public.sv_provider_dataset_capabilities') IS NULL
		OR to_regclass('public.sv_provider_canary_executions') IS NULL
		OR to_regclass('public.sv_evidence_acceptance_receipts') IS NULL
		OR to_regclass('public.sv_evidence_provenance') IS NULL
		OR to_regclass('public.sv_evidence_read_model') IS NULL
		OR to_regprocedure('public.sv_resolve_api_key_context(text)') IS NULL THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_REQUIRES_MIGRATION_0051';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_proc
		WHERE oid = 'public.sv_resolve_api_key_context(text)'::regprocedure
			AND prosecdef = true
			AND 'search_path=""' = ANY (coalesce(proconfig, ARRAY[]::text[]))
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_API_KEY_BOOTSTRAP_NOT_HARDENED';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM pg_proc AS function
		CROSS JOIN LATERAL aclexplode(
			coalesce(function.proacl, acldefault('f', function.proowner))
		) AS privilege
		WHERE function.oid = 'public.sv_resolve_api_key_context(text)'::regprocedure
			AND privilege.grantee = 0::oid
			AND privilege.privilege_type = 'EXECUTE'
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_API_KEY_BOOTSTRAP_PUBLIC_EXECUTE';
	END IF;

	SELECT relrowsecurity, relforcerowsecurity
	INTO capability_rls, capability_force_rls
	FROM pg_class
	WHERE oid = 'public.sv_provider_dataset_capabilities'::regclass;

	IF capability_rls IS DISTINCT FROM true OR capability_force_rls IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CAPABILITY_RLS_NOT_FORCED';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'sv_provider_dataset_capabilities'
			AND policyname = 'tenant_isolation'
			AND cmd = 'ALL'
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_TENANT_POLICY_MISSING';
	END IF;

	SELECT relrowsecurity, relforcerowsecurity
	INTO canary_rls, canary_force_rls
	FROM pg_class
	WHERE oid = 'public.sv_provider_canary_executions'::regclass;

	IF canary_rls IS DISTINCT FROM true OR canary_force_rls IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CANARY_RLS_NOT_FORCED';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'sv_provider_canary_executions'
			AND policyname = 'tenant_isolation'
			AND cmd = 'ALL'
	) OR NOT EXISTS (
		SELECT 1
		FROM pg_indexes
		WHERE schemaname = 'public'
			AND tablename = 'sv_provider_canary_executions'
			AND indexname = 'sv_provider_canary_executions_identity_unique'
			AND indexdef LIKE '%(source, execution_identity)%'
	) OR (
		SELECT count(*)
		FROM pg_trigger
		WHERE tgrelid = 'public.sv_provider_canary_executions'::regclass
			AND tgname IN ('sv_provider_canary_executions_immutable_guard', 'sv_provider_canary_executions_truncate_guard')
			AND tgenabled = 'O'
	) <> 2 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CANARY_RESERVATION_CONTRACT_MISSING';
	END IF;

	SELECT relrowsecurity, relforcerowsecurity
	INTO acceptance_rls, acceptance_force_rls
	FROM pg_class
	WHERE oid = 'public.sv_evidence_acceptance_receipts'::regclass;

	IF acceptance_rls IS DISTINCT FROM true OR acceptance_force_rls IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTANCE_RLS_NOT_FORCED';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'sv_evidence_acceptance_receipts'
			AND policyname = 'tenant_isolation'
			AND cmd = 'ALL'
	) OR (
		SELECT count(*)
		FROM pg_trigger
		WHERE tgrelid = 'public.sv_evidence_acceptance_receipts'::regclass
			AND tgname IN (
				'sv_evidence_acceptance_receipts_scope_guard',
				'sv_evidence_acceptance_receipts_owner_guard',
				'sv_evidence_acceptance_receipts_audit_pair_guard',
				'sv_evidence_acceptance_receipts_immutable_guard',
				'sv_evidence_acceptance_receipts_truncate_guard'
			)
			AND tgenabled = 'O'
		) <> 5 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTANCE_CONTRACT_MISSING';
	END IF;

	IF (
		SELECT count(*)
		FROM pg_trigger
		WHERE tgrelid = 'public.sv_audit_events'::regclass
			AND tgname IN (
				'sv_audit_events_formal_evidence_owner_guard',
				'sv_audit_events_formal_evidence_receipt_pair_guard',
				'sv_audit_events_formal_evidence_immutable_guard',
				'sv_audit_events_formal_evidence_truncate_guard'
			)
			AND tgenabled = 'O'
	) <> 4 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_FORMAL_AUDIT_CONTRACT_MISSING';
	END IF;

	SELECT reloptions INTO provenance_options
	FROM pg_class
	WHERE oid = 'public.sv_evidence_provenance'::regclass;

	IF NOT ('security_invoker=true' = ANY (coalesce(provenance_options, ARRAY[]::text[]))) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_PROVENANCE_NOT_SECURITY_INVOKER';
	END IF;

	SELECT reloptions INTO provenance_options
	FROM pg_class
	WHERE oid = 'public.sv_evidence_read_model'::regclass;

	IF NOT ('security_invoker=true' = ANY (coalesce(provenance_options, ARRAY[]::text[]))) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAFE_EVIDENCE_NOT_SECURITY_INVOKER';
	END IF;

	FOREACH tenant_relation IN ARRAY ARRAY[
		'sv_evidence_index',
		'sv_measurement_cycles',
		'sv_configuration_locks',
		'sv_measurement_datasets',
		'sv_source_snapshots',
		'sv_provider_dataset_capabilities',
		'sv_evidence_acceptance_receipts'
	]
	LOOP
		SELECT relation.relrowsecurity, relation.relforcerowsecurity
		INTO tenant_rls, tenant_force_rls
		FROM pg_class AS relation
		INNER JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
		WHERE namespace.nspname = 'public' AND relation.relname = tenant_relation;
		IF tenant_rls IS DISTINCT FROM true OR tenant_force_rls IS DISTINCT FROM true THEN
			RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAFE_VIEW_RELATION_NOT_FORCED: %', tenant_relation;
		END IF;
		IF NOT EXISTS (
			SELECT 1
			FROM pg_policies
			WHERE schemaname = 'public'
				AND tablename = tenant_relation
				AND policyname = 'tenant_isolation'
				AND cmd = 'ALL'
		) THEN
			RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAFE_VIEW_TENANT_POLICY_MISSING: %', tenant_relation;
		END IF;
	END LOOP;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'sv_evidence_read_model'
			AND column_name IN (
				'source_ref', 'raw_reference', 'provider_dataset_ref', 'environment',
				'content_sha256', 'snapshot', 'accepted_by'
			)
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAFE_EVIDENCE_EXPOSES_RAW_COLUMN';
	END IF;

	IF (
		SELECT count(*)
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'sv_evidence_read_model'
			AND column_name IN ('acceptance_status', 'accepted_at')
	) <> 2 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAFE_EVIDENCE_ACCEPTANCE_MISSING';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM pg_class AS relation
		CROSS JOIN LATERAL aclexplode(
			coalesce(relation.relacl, acldefault('r', relation.relowner))
		) AS privilege
		WHERE relation.oid = 'public.sv_evidence_provenance'::regclass
			AND privilege.grantee = 0::oid
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_PROVENANCE_PUBLIC_GRANT_PRESENT';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_ROLE_MISSING';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM organization
		WHERE id IN ('rls-schema-proof-org-a', 'rls-schema-proof-org-b')
			OR slug IN ('rls-schema-proof-org-a', 'rls-schema-proof-org-b')
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_FIXTURE_COLLISION';
	END IF;
END;
$proof_preflight$;

DO $proof_role_attributes$
DECLARE
	runtime_role pg_roles%ROWTYPE;
BEGIN
	SELECT * INTO STRICT runtime_role FROM pg_roles WHERE rolname = 'selena_app';
	IF NOT runtime_role.rolcanlogin
		OR runtime_role.rolsuper
		OR runtime_role.rolcreatedb
		OR runtime_role.rolcreaterole
		OR runtime_role.rolinherit
		OR runtime_role.rolreplication
		OR runtime_role.rolbypassrls THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_ROLE_ATTRIBUTES_UNSAFE';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM pg_class
		WHERE relnamespace IN ('public'::regnamespace, 'pgboss'::regnamespace)
			AND relowner = runtime_role.oid
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_ROLE_OWNS_RELATION';
	END IF;
	IF EXISTS (
		SELECT 1
		FROM pg_proc
		WHERE pronamespace IN ('public'::regnamespace, 'pgboss'::regnamespace)
			AND proowner = runtime_role.oid
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_ROLE_OWNS_FUNCTION';
	END IF;

	IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = runtime_role.oid) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_ROLE_INHERITS_MEMBERSHIP';
	END IF;

	IF NOT has_schema_privilege('selena_app', 'public', 'USAGE')
		OR has_schema_privilege('selena_app', 'public', 'CREATE')
		OR NOT has_schema_privilege('selena_app', 'pgboss', 'USAGE')
		OR has_schema_privilege('selena_app', 'pgboss', 'CREATE')
		OR EXISTS (
			SELECT 1
			FROM unnest(ARRAY[
				'pgboss.job', 'pgboss.job_common', 'pgboss.job_dependency',
				'pgboss.queue', 'pgboss.schedule', 'pgboss.subscription'
			]) AS runtime_table(name)
			WHERE NOT has_table_privilege(
				'selena_app', runtime_table.name, 'SELECT,INSERT,UPDATE,DELETE'
			)
		)
		OR NOT has_table_privilege('selena_app', 'pgboss.bam', 'SELECT')
		OR has_table_privilege('selena_app', 'pgboss.bam', 'INSERT')
		OR has_table_privilege('selena_app', 'pgboss.bam', 'UPDATE')
		OR has_table_privilege('selena_app', 'pgboss.bam', 'DELETE')
		OR has_table_privilege('selena_app', 'pgboss.bam', 'TRUNCATE')
		OR has_table_privilege('selena_app', 'pgboss.warning', 'SELECT')
		OR has_table_privilege('selena_app', 'pgboss.warning', 'INSERT')
		OR has_table_privilege('selena_app', 'pgboss.warning', 'UPDATE')
		OR has_table_privilege('selena_app', 'pgboss.warning', 'DELETE')
		OR has_table_privilege('selena_app', 'pgboss.warning', 'TRUNCATE')
		OR has_table_privilege('selena_app', 'pgboss.queue_stats', 'SELECT')
		OR has_table_privilege('selena_app', 'pgboss.queue_stats', 'INSERT')
		OR has_table_privilege('selena_app', 'pgboss.queue_stats', 'UPDATE')
		OR has_table_privilege('selena_app', 'pgboss.queue_stats', 'DELETE')
		OR has_table_privilege('selena_app', 'pgboss.queue_stats', 'TRUNCATE')
		OR NOT has_table_privilege('selena_app', 'pgboss.version', 'SELECT')
		OR has_table_privilege('selena_app', 'pgboss.version', 'INSERT')
		OR has_table_privilege('selena_app', 'pgboss.version', 'UPDATE')
		OR has_table_privilege('selena_app', 'pgboss.version', 'DELETE')
		OR has_table_privilege('selena_app', 'pgboss.version', 'TRUNCATE')
		OR NOT has_function_privilege('selena_app', 'pgboss.create_queue(text,jsonb)', 'EXECUTE')
		OR has_function_privilege('selena_app', 'pgboss.job_table_format(text,text)', 'EXECUTE')
		OR has_function_privilege('selena_app', 'pgboss.delete_queue(text)', 'EXECUTE')
		OR has_function_privilege('selena_app', 'pgboss.job_table_run(text,text,text)', 'EXECUTE')
		OR has_function_privilege(
			'selena_app',
			'pgboss.job_table_run_async(text,integer,text,text,text)',
			'EXECUTE'
		)
		OR NOT has_table_privilege('selena_app', 'public.sv_evidence_read_model', 'SELECT')
		OR has_table_privilege('selena_app', 'public.sv_evidence_provenance', 'SELECT')
		OR NOT has_table_privilege('selena_app', 'public.sv_provider_canary_executions', 'SELECT')
		OR NOT has_table_privilege('selena_app', 'public.sv_provider_canary_executions', 'INSERT')
		OR has_table_privilege('selena_app', 'public.sv_provider_canary_executions', 'UPDATE')
		OR has_table_privilege('selena_app', 'public.sv_provider_canary_executions', 'DELETE')
		OR has_table_privilege('selena_app', 'public.sv_provider_canary_executions', 'TRUNCATE')
		OR NOT has_table_privilege('selena_app', 'public.sv_provider_dataset_capabilities', 'SELECT')
		OR NOT has_table_privilege('selena_app', 'public.sv_provider_dataset_capabilities', 'INSERT')
		OR has_table_privilege('selena_app', 'public.sv_provider_dataset_capabilities', 'UPDATE')
		OR has_table_privilege('selena_app', 'public.sv_provider_dataset_capabilities', 'DELETE')
		OR has_table_privilege('selena_app', 'public.sv_provider_dataset_capabilities', 'TRUNCATE')
		OR NOT has_table_privilege('selena_app', 'public.sv_source_snapshots', 'INSERT')
		OR has_table_privilege('selena_app', 'public.sv_source_snapshots', 'SELECT')
		OR has_table_privilege('selena_app', 'public.sv_source_snapshots', 'UPDATE')
		OR has_table_privilege('selena_app', 'public.sv_source_snapshots', 'DELETE')
		OR has_table_privilege('selena_app', 'public.sv_source_snapshots', 'TRUNCATE')
		OR NOT has_column_privilege('selena_app', 'public.sv_source_snapshots', 'content_sha256_format_valid', 'SELECT')
		OR has_column_privilege('selena_app', 'public.sv_source_snapshots', 'content_sha256', 'SELECT')
		OR has_column_privilege('selena_app', 'public.sv_source_snapshots', 'raw_reference', 'SELECT')
		OR has_table_privilege('selena_app', 'public.sv_evidence_acceptance_receipts', 'SELECT')
		OR has_table_privilege('selena_app', 'public.sv_evidence_acceptance_receipts', 'INSERT')
		OR has_table_privilege('selena_app', 'public.sv_evidence_acceptance_receipts', 'UPDATE')
		OR has_table_privilege('selena_app', 'public.sv_evidence_acceptance_receipts', 'DELETE')
		OR has_table_privilege('selena_app', 'public.sv_evidence_acceptance_receipts', 'TRUNCATE')
		OR NOT has_column_privilege('selena_app', 'public.sv_evidence_acceptance_receipts', 'accepted_at', 'SELECT')
		OR has_column_privilege('selena_app', 'public.sv_evidence_acceptance_receipts', 'accepted_by', 'SELECT')
		OR NOT has_table_privilege('selena_app', 'public.sv_journal_provider_boundaries', 'SELECT')
		OR NOT has_table_privilege('selena_app', 'public.sv_journal_provider_boundaries', 'INSERT')
		OR has_table_privilege('selena_app', 'public.sv_journal_provider_boundaries', 'UPDATE')
		OR has_table_privilege('selena_app', 'public.sv_journal_provider_boundaries', 'DELETE')
		OR has_table_privilege('selena_app', 'public.sv_journal_provider_boundaries', 'TRUNCATE')
		OR NOT has_function_privilege(
			'selena_app', 'public.sv_journal_claim_recovery_state(uuid)', 'EXECUTE'
		)
		OR NOT has_function_privilege(
			'selena_app', 'public.sv_recover_journal_daily_claim(uuid,text)', 'EXECUTE'
		) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_ROLE_GRANTS_UNSAFE';
	END IF;
END;
$proof_role_attributes$;

-- Membership and mutation grants exist only inside this proof transaction.
-- They allow SET ROLE and exercise immutable triggers independently of the
-- narrower runtime allowlist; ROLLBACK restores the exact bootstrap grants.
GRANT selena_app TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
GRANT UPDATE, DELETE, TRUNCATE ON sv_provider_canary_executions TO selena_app;
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON sv_evidence_acceptance_receipts TO selena_app;
GRANT UPDATE, DELETE, TRUNCATE ON sv_audit_events TO selena_app;

INSERT INTO organization (id, name, slug, created_at)
VALUES
	('rls-schema-proof-org-a', 'RLS schema proof A', 'rls-schema-proof-org-a', now()),
	('rls-schema-proof-org-b', 'RLS schema proof B', 'rls-schema-proof-org-b', now());

INSERT INTO sv_api_keys (organization_id, name, key_hash, permissions, created_by)
VALUES
	('rls-schema-proof-org-a', 'RLS proof key A', 'rls-schema-proof-hash-a', ARRAY['client:read'], 'rls-schema-proof'),
	('rls-schema-proof-org-b', 'RLS proof key B', 'rls-schema-proof-hash-b', ARRAY['client:read'], 'rls-schema-proof');

SELECT set_config('app.organization_id', 'rls-schema-proof-org-a', true);
INSERT INTO sv_provider_dataset_capabilities (
	organization_id,
	provider,
	source,
	surface,
	domain,
	entity_type,
	dataset_env_key,
	input_schema_version,
	output_schema_version,
	access_class,
	capability_status,
	retention_class,
	contract_version,
	version,
	contract_metadata
) VALUES (
	'rls-schema-proof-org-a',
	'BRIGHT_DATA',
	'GOOGLE_AI_MODE',
	'GOOGLE_AI_MODE',
	'AI',
	'AI_ANSWER',
	'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
	'schema-discovery-input-v1',
	'google-ai-mode-output-v1',
	'PUBLIC',
	'PILOT_ONLY',
	'RAW_PRIVATE_POLICY_PENDING',
	'provider-dataset-v1.3',
	1,
	'{}'::jsonb
);

INSERT INTO sv_projects (
	id, organization_id, name, category, country, languages, status
) VALUES (
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
	'rls-schema-proof-org-a',
	'RLS evidence project A',
	'FOOD HALL',
	'ID',
	ARRAY['en'],
	'DRAFT'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha,
	expected_runs, budget_cap, created_by
) VALUES (
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
	'rls-schema-proof-org-a',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
	1,
	'{}'::jsonb,
	'rls-schema-proof',
	1,
	0,
	'rls-schema-proof'
);
INSERT INTO sv_measurement_cycles (
	id, organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
) VALUES (
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
	'rls-schema-proof-org-a',
	'AI',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
		'COMPLETED'
);
INSERT INTO sv_measurement_datasets (
	id, organization_id, cycle_id, dataset_key, version
) VALUES (
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
	'rls-schema-proof-org-a',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
	'rls-evidence-a',
	1
);
CREATE OR REPLACE FUNCTION pg_temp.seed_provider_delivery(
	p_organization_id text,
	p_project_id uuid,
	p_source text,
	p_provider_dataset_id text,
	p_snapshot_id text,
	p_seed text,
	p_captured_at timestamptz
) RETURNS void
LANGUAGE plpgsql AS $seed_provider_delivery$
DECLARE
	phase_name text;
	phase_ordinal integer := 0;
BEGIN
	FOREACH phase_name IN ARRAY ARRAY['TRIGGERED', 'READY', 'DELIVERED'] LOOP
		INSERT INTO sv_provider_dataset_snapshot_events (
			organization_id, project_id, provider, source, provider_dataset_id,
			snapshot_id, phase, provider_status, record_count, observed_at, event_hash
		) VALUES (
			p_organization_id, p_project_id, 'BRIGHT_DATA', p_source, p_provider_dataset_id,
			p_snapshot_id, phase_name,
			CASE WHEN phase_name = 'READY' THEN 'ready' ELSE NULL END,
			CASE WHEN phase_name = 'DELIVERED' THEN 1 ELSE NULL END,
			p_captured_at + ((phase_ordinal + 1) * interval '1 second'),
			'sha256:' || repeat(md5(p_seed || ':' || phase_name), 2)
		);
		phase_ordinal := phase_ordinal + 1;
	END LOOP;
END;
$seed_provider_delivery$;

SELECT pg_temp.seed_provider_delivery(
	'rls-schema-proof-org-a',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
	'GOOGLE_AI_MODE',
	'private-dataset-a',
	'rls-evidence-a',
	'rls-evidence-a',
	'2026-09-01T00:00:00Z'
);
INSERT INTO sv_source_snapshots (
	id, organization_id, project_id, source_type, source_ref, content_sha256, snapshot,
	capability_id, provider_dataset_ref, environment, raw_reference,
	input_schema_version, output_schema_version, captured_at
) VALUES (
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
	'rls-schema-proof-org-a',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
	'GOOGLE_AI_MODE',
	'private:rls-evidence-a',
	'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
	'{}'::jsonb,
	(SELECT id FROM sv_provider_dataset_capabilities
		WHERE organization_id = 'rls-schema-proof-org-a' AND source = 'GOOGLE_AI_MODE' AND version = 1),
	'private-dataset-a',
	'STAGING_ACCEPTANCE',
	'brightdata:snapshot:rls-evidence-a',
	'schema-discovery-input-v1',
	'google-ai-mode-output-v1',
	'2026-09-01T00:00:00Z'
);
INSERT INTO sv_evidence_index (
	id, organization_id, project_id, domain_id, cycle_id, observation_ref,
	dataset_id, source_snapshot_id, captured_at
) VALUES (
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
	'rls-schema-proof-org-a',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
	'AI',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
	'rls-evidence-a',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
	'2026-09-01T00:00:00Z'
);
INSERT INTO sv_evidence_acceptance_receipts (
	organization_id, evidence_id, accepted_at, accepted_by
) VALUES (
	'rls-schema-proof-org-a',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
	'2026-09-01T00:05:00Z',
	'database-role:selena_test'
);
INSERT INTO sv_audit_events (
	organization_id, actor_id, event, subject_kind, subject_id, details
) VALUES (
	'rls-schema-proof-org-a', 'system:provider-evidence-acceptance',
	'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED', 'evidence',
	'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
	jsonb_build_object(
		'schemaVersion', 'provider-evidence-acceptance-receipt-v1.3',
		'evidenceId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
		'organizationId', 'rls-schema-proof-org-a',
		'sourceSnapshotId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
		'projectId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
		'domainId', 'AI',
		'cycleId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
		'datasetId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
		'datasetKey', 'rls-evidence-a',
		'datasetVersion', 1,
		'nativeObservationRef', 'rls-evidence-a',
		'source', 'GOOGLE_AI_MODE',
		'outputSchemaVersion', 'google-ai-mode-output-v1',
		'capturedAt', '2026-09-01T00:00:00Z',
		'acceptedAt', '2026-09-01T00:05:00Z',
		'providerCalls', 0,
		'acceptanceProviderCalls', 0,
		'recurring', false,
		'privatePayloadRead', false,
		'costRows', 0
	)
);

SELECT set_config('app.organization_id', 'rls-schema-proof-org-b', true);
INSERT INTO sv_provider_dataset_capabilities (
	organization_id,
	provider,
	source,
	surface,
	domain,
	entity_type,
	dataset_env_key,
	input_schema_version,
	output_schema_version,
	access_class,
	capability_status,
	retention_class,
	contract_version,
	version,
	contract_metadata
) VALUES (
	'rls-schema-proof-org-b',
	'BRIGHT_DATA',
	'GOOGLE_AI_MODE',
	'GOOGLE_AI_MODE',
	'AI',
	'AI_ANSWER',
	'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
	'schema-discovery-input-v1',
	'google-ai-mode-output-v1',
	'PUBLIC',
	'PILOT_ONLY',
	'RAW_PRIVATE_POLICY_PENDING',
	'provider-dataset-v1.3',
	1,
	'{}'::jsonb
);

INSERT INTO sv_projects (
	id, organization_id, name, category, country, languages, status
) VALUES (
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
	'rls-schema-proof-org-b',
	'RLS evidence project B',
	'FOOD HALL',
	'ID',
	ARRAY['en'],
	'DRAFT'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha,
	expected_runs, budget_cap, created_by
) VALUES (
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
	'rls-schema-proof-org-b',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
	1,
	'{}'::jsonb,
	'rls-schema-proof',
	1,
	0,
	'rls-schema-proof'
);
INSERT INTO sv_measurement_cycles (
	id, organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
) VALUES (
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
	'rls-schema-proof-org-b',
	'AI',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
		'COMPLETED'
);
INSERT INTO sv_measurement_datasets (
	id, organization_id, cycle_id, dataset_key, version
) VALUES (
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
	'rls-schema-proof-org-b',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
	'rls-evidence-b',
	1
);
SELECT pg_temp.seed_provider_delivery(
	'rls-schema-proof-org-b',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
	'GOOGLE_AI_MODE',
	'private-dataset-b',
	'rls-evidence-b',
	'rls-evidence-b',
	'2026-09-01T00:00:00Z'
);
INSERT INTO sv_source_snapshots (
	id, organization_id, project_id, source_type, source_ref, content_sha256, snapshot,
	capability_id, provider_dataset_ref, environment, raw_reference,
	input_schema_version, output_schema_version, captured_at
) VALUES (
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
	'rls-schema-proof-org-b',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
	'GOOGLE_AI_MODE',
	'private:rls-evidence-b',
	'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
	'{}'::jsonb,
	(SELECT id FROM sv_provider_dataset_capabilities
		WHERE organization_id = 'rls-schema-proof-org-b' AND source = 'GOOGLE_AI_MODE' AND version = 1),
	'private-dataset-b',
	'STAGING_ACCEPTANCE',
	'brightdata:snapshot:rls-evidence-b',
	'schema-discovery-input-v1',
	'google-ai-mode-output-v1',
	'2026-09-01T00:00:00Z'
);
INSERT INTO sv_evidence_index (
	id, organization_id, project_id, domain_id, cycle_id, observation_ref,
	dataset_id, source_snapshot_id, captured_at
) VALUES (
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
	'rls-schema-proof-org-b',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
	'AI',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
	'rls-evidence-b',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
	'2026-09-01T00:00:00Z'
);
INSERT INTO sv_evidence_acceptance_receipts (
	organization_id, evidence_id, accepted_at, accepted_by
) VALUES (
	'rls-schema-proof-org-b',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
	'2026-09-01T00:05:00Z',
	'database-role:selena_test'
);
INSERT INTO sv_audit_events (
	organization_id, actor_id, event, subject_kind, subject_id, details
) VALUES (
	'rls-schema-proof-org-b', 'system:provider-evidence-acceptance',
	'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED', 'evidence',
	'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
	jsonb_build_object(
		'schemaVersion', 'provider-evidence-acceptance-receipt-v1.3',
		'evidenceId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',
		'organizationId', 'rls-schema-proof-org-b',
		'sourceSnapshotId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
		'projectId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
		'domainId', 'AI',
		'cycleId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
		'datasetId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
		'datasetKey', 'rls-evidence-b',
		'datasetVersion', 1,
		'nativeObservationRef', 'rls-evidence-b',
		'source', 'GOOGLE_AI_MODE',
		'outputSchemaVersion', 'google-ai-mode-output-v1',
		'capturedAt', '2026-09-01T00:00:00Z',
		'acceptedAt', '2026-09-01T00:05:00Z',
		'providerCalls', 0,
		'acceptanceProviderCalls', 0,
		'recurring', false,
		'privatePayloadRead', false,
		'costRows', 0
	)
);

-- Owner-scoped eligibility is independently enforced before the runtime role
-- is assumed. A receipt cannot predate its immutable capture.
SELECT set_config('app.organization_id', 'rls-schema-proof-org-a', true);
SET CONSTRAINTS
	sv_evidence_acceptance_receipts_audit_pair_guard,
	sv_audit_events_formal_evidence_receipt_pair_guard
IMMEDIATE;
SET CONSTRAINTS
	sv_evidence_acceptance_receipts_audit_pair_guard,
	sv_audit_events_formal_evidence_receipt_pair_guard
DEFERRED;
DO $proof_owner_acceptance_eligibility$
BEGIN
	-- A raw schema-discovery capture cannot become formal evidence.
	BEGIN
		INSERT INTO sv_provider_dataset_capabilities (
			organization_id, provider, source, surface, domain, entity_type,
			dataset_env_key, input_schema_version, output_schema_version,
			access_class, capability_status, retention_class, contract_version,
			version, contract_metadata
		) VALUES (
			'rls-schema-proof-org-a', 'BRIGHT_DATA', 'GOOGLE_AI_MODE', 'GOOGLE_AI_MODE',
			'AI', 'AI_ANSWER', 'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
			'schema-discovery-input-v1', NULL, 'PUBLIC', 'CANARY_ONLY',
			'RAW_PRIVATE_POLICY_PENDING', 'provider-dataset-v1.3', 2, '{}'::jsonb
		);
		PERFORM pg_temp.seed_provider_delivery(
			'rls-schema-proof-org-a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private-schema-discovery', 'raw-schema-discovery',
			'raw-schema-discovery', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_source_snapshots (
			id, organization_id, project_id, source_type, source_ref, content_sha256, snapshot,
			capability_id, provider_dataset_ref, environment, raw_reference,
			input_schema_version, output_schema_version, captured_at
		) VALUES (
			'10000000-0000-4000-8000-000000000001', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private:raw-schema-discovery',
			'1000000000000000000000000000000000000000000000000000000000000001',
			'{}'::jsonb,
			(SELECT id FROM sv_provider_dataset_capabilities
				WHERE organization_id = 'rls-schema-proof-org-a' AND source = 'GOOGLE_AI_MODE' AND version = 2),
			'private-schema-discovery', 'STAGING_ACCEPTANCE', 'brightdata:snapshot:raw-schema-discovery',
			'schema-discovery-input-v1', NULL, '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_evidence_index (
			id, organization_id, project_id, domain_id, cycle_id, observation_ref,
			dataset_id, source_snapshot_id, captured_at
		) VALUES (
			'10000000-0000-4000-8000-000000000002', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'AI',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'negative-output-schema-null',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
			'10000000-0000-4000-8000-000000000001', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_evidence_acceptance_receipts (organization_id, evidence_id, accepted_at, accepted_by)
		VALUES (
			'rls-schema-proof-org-a', '10000000-0000-4000-8000-000000000002',
			'2026-09-01T00:05:00Z', 'database-role:selena_test'
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_NULL_SCHEMA_ACCEPTANCE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_SCHEMA_NOT_APPROVED' THEN RAISE; END IF;
	END;

	-- A schema-known capability must still be promoted beyond CANARY_ONLY.
	BEGIN
		INSERT INTO sv_provider_dataset_capabilities (
			organization_id, provider, source, surface, domain, entity_type,
			dataset_env_key, input_schema_version, output_schema_version,
			access_class, capability_status, retention_class, contract_version,
			version, contract_metadata
		) VALUES (
			'rls-schema-proof-org-a', 'BRIGHT_DATA', 'GOOGLE_AI_MODE', 'GOOGLE_AI_MODE',
			'AI', 'AI_ANSWER', 'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
			'schema-discovery-input-v1', 'google-ai-mode-output-v1', 'PUBLIC', 'CANARY_ONLY',
			'RAW_PRIVATE_POLICY_PENDING', 'provider-dataset-v1.3', 2, '{}'::jsonb
		);
		PERFORM pg_temp.seed_provider_delivery(
			'rls-schema-proof-org-a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private-canary-only', 'canary-only',
			'canary-only', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_source_snapshots (
			id, organization_id, project_id, source_type, source_ref, content_sha256, snapshot,
			capability_id, provider_dataset_ref, environment, raw_reference,
			input_schema_version, output_schema_version, captured_at
		) VALUES (
			'20000000-0000-4000-8000-000000000001', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private:canary-only',
			'2000000000000000000000000000000000000000000000000000000000000002',
			'{}'::jsonb,
			(SELECT id FROM sv_provider_dataset_capabilities
				WHERE organization_id = 'rls-schema-proof-org-a' AND source = 'GOOGLE_AI_MODE' AND version = 2),
			'private-canary-only', 'STAGING_ACCEPTANCE', 'brightdata:snapshot:canary-only',
			'schema-discovery-input-v1', 'google-ai-mode-output-v1', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_evidence_index (
			id, organization_id, project_id, domain_id, cycle_id, observation_ref,
			dataset_id, source_snapshot_id, captured_at
		) VALUES (
			'20000000-0000-4000-8000-000000000002', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'AI',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'negative-canary-only',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
			'20000000-0000-4000-8000-000000000001', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_evidence_acceptance_receipts (organization_id, evidence_id, accepted_at, accepted_by)
		VALUES (
			'rls-schema-proof-org-a', '20000000-0000-4000-8000-000000000002',
			'2026-09-01T00:05:00Z', 'database-role:selena_test'
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CANARY_ONLY_ACCEPTANCE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_CAPABILITY_NOT_ALLOWED' THEN RAISE; END IF;
	END;

	-- An isolated paid-canary capture is never the formal acceptance source.
	BEGIN
		INSERT INTO sv_provider_dataset_capabilities (
			organization_id, provider, source, surface, domain, entity_type,
			dataset_env_key, input_schema_version, output_schema_version,
			access_class, capability_status, retention_class, contract_version,
			version, contract_metadata
		) VALUES (
			'rls-schema-proof-org-a', 'BRIGHT_DATA', 'GOOGLE_AI_MODE', 'GOOGLE_AI_MODE',
			'AI', 'AI_ANSWER', 'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
			'schema-discovery-input-v1', 'google-ai-mode-output-v1', 'PUBLIC', 'PILOT_ONLY',
			'RAW_PRIVATE_POLICY_PENDING', 'provider-dataset-v1.3', 2, '{}'::jsonb
		);
		PERFORM pg_temp.seed_provider_delivery(
			'rls-schema-proof-org-a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private-isolated-canary', 'isolated-canary',
			'isolated-canary', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_source_snapshots (
			id, organization_id, project_id, source_type, source_ref, content_sha256, snapshot,
			capability_id, provider_dataset_ref, environment, raw_reference,
			input_schema_version, output_schema_version, captured_at
		) VALUES (
			'30000000-0000-4000-8000-000000000001', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private:isolated-canary',
			'3000000000000000000000000000000000000000000000000000000000000003',
			'{}'::jsonb,
			(SELECT id FROM sv_provider_dataset_capabilities
				WHERE organization_id = 'rls-schema-proof-org-a' AND source = 'GOOGLE_AI_MODE' AND version = 2),
			'private-isolated-canary', 'ISOLATED_CANARY', 'brightdata:snapshot:isolated-canary',
			'schema-discovery-input-v1', 'google-ai-mode-output-v1', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_evidence_index (
			id, organization_id, project_id, domain_id, cycle_id, observation_ref,
			dataset_id, source_snapshot_id, captured_at
		) VALUES (
			'30000000-0000-4000-8000-000000000002', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'AI',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'negative-isolated-canary',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
			'30000000-0000-4000-8000-000000000001', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_evidence_acceptance_receipts (organization_id, evidence_id, accepted_at, accepted_by)
		VALUES (
			'rls-schema-proof-org-a', '30000000-0000-4000-8000-000000000002',
			'2026-09-01T00:05:00Z', 'database-role:selena_test'
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ISOLATED_CANARY_ACCEPTANCE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_ENVIRONMENT_NOT_APPROVED' THEN RAISE; END IF;
	END;

	-- A later BLOCKED capability supersedes an otherwise eligible capture.
	BEGIN
		INSERT INTO sv_provider_dataset_capabilities (
			organization_id, provider, source, surface, domain, entity_type,
			dataset_env_key, input_schema_version, output_schema_version,
			access_class, capability_status, retention_class, contract_version,
			version, contract_metadata
		) VALUES (
			'rls-schema-proof-org-a', 'BRIGHT_DATA', 'GOOGLE_AI_MODE', 'GOOGLE_AI_MODE',
			'AI', 'AI_ANSWER', 'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
			'schema-discovery-input-v1', 'google-ai-mode-output-v1', 'PUBLIC', 'PILOT_ONLY',
			'RAW_PRIVATE_POLICY_PENDING', 'provider-dataset-v1.3', 2, '{}'::jsonb
		);
		PERFORM pg_temp.seed_provider_delivery(
			'rls-schema-proof-org-a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private-superseded', 'superseded',
			'superseded', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_source_snapshots (
			id, organization_id, project_id, source_type, source_ref, content_sha256, snapshot,
			capability_id, provider_dataset_ref, environment, raw_reference,
			input_schema_version, output_schema_version, captured_at
		) VALUES (
			'40000000-0000-4000-8000-000000000001', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private:superseded',
			'4000000000000000000000000000000000000000000000000000000000000004',
			'{}'::jsonb,
			(SELECT id FROM sv_provider_dataset_capabilities
				WHERE organization_id = 'rls-schema-proof-org-a' AND source = 'GOOGLE_AI_MODE' AND version = 2),
			'private-superseded', 'STAGING_ACCEPTANCE', 'brightdata:snapshot:superseded',
			'schema-discovery-input-v1', 'google-ai-mode-output-v1', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_evidence_index (
			id, organization_id, project_id, domain_id, cycle_id, observation_ref,
			dataset_id, source_snapshot_id, captured_at
		) VALUES (
			'40000000-0000-4000-8000-000000000002', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'AI',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'negative-superseded',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
			'40000000-0000-4000-8000-000000000001', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_provider_dataset_capabilities (
			organization_id, provider, source, surface, domain, entity_type,
			dataset_env_key, input_schema_version, output_schema_version,
			access_class, capability_status, retention_class, contract_version,
			version, contract_metadata
		) VALUES (
			'rls-schema-proof-org-a', 'BRIGHT_DATA', 'GOOGLE_AI_MODE', 'GOOGLE_AI_MODE',
			'AI', 'AI_ANSWER', 'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
			'schema-discovery-input-v1', 'google-ai-mode-output-v1', 'PUBLIC', 'BLOCKED',
			'RAW_PRIVATE_POLICY_PENDING', 'provider-dataset-v1.3', 3, '{}'::jsonb
		);
		INSERT INTO sv_evidence_acceptance_receipts (organization_id, evidence_id, accepted_at, accepted_by)
		VALUES (
			'rls-schema-proof-org-a', '40000000-0000-4000-8000-000000000002',
			'2026-09-01T00:05:00Z', 'database-role:selena_test'
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_BLOCKED_SUPERSESSION_ACCEPTANCE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_CAPABILITY_SUPERSEDED_BY_BLOCK' THEN RAISE; END IF;
	END;
END;
$proof_owner_acceptance_eligibility$;

-- Even the table owner cannot commit a receipt without the matching formal
-- audit row in the same transaction.
DO $proof_owner_acceptance_audit_pair$
BEGIN
	BEGIN
		INSERT INTO sv_provider_dataset_capabilities (
			organization_id, provider, source, surface, domain, entity_type,
			dataset_env_key, input_schema_version, output_schema_version,
			access_class, capability_status, retention_class, contract_version,
			version, contract_metadata
		) VALUES (
			'rls-schema-proof-org-a', 'BRIGHT_DATA', 'GOOGLE_AI_MODE', 'GOOGLE_AI_MODE',
			'AI', 'AI_ANSWER', 'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
			'schema-discovery-input-v1', 'google-ai-mode-output-v1', 'PUBLIC', 'PILOT_ONLY',
			'RAW_PRIVATE_POLICY_PENDING', 'provider-dataset-v1.3', 2, '{}'::jsonb
		);
		PERFORM pg_temp.seed_provider_delivery(
			'rls-schema-proof-org-a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private-missing-audit', 'missing-audit',
			'missing-audit', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_source_snapshots (
			id, organization_id, project_id, source_type, source_ref, content_sha256, snapshot,
			capability_id, provider_dataset_ref, environment, raw_reference,
			input_schema_version, output_schema_version, captured_at
		) VALUES (
			'50000000-0000-4000-8000-000000000001', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE', 'private:missing-audit',
			'5000000000000000000000000000000000000000000000000000000000000005',
			'{}'::jsonb,
			(SELECT id FROM sv_provider_dataset_capabilities
				WHERE organization_id = 'rls-schema-proof-org-a' AND source = 'GOOGLE_AI_MODE' AND version = 2),
			'private-missing-audit', 'STAGING_ACCEPTANCE', 'brightdata:snapshot:missing-audit',
			'schema-discovery-input-v1', 'google-ai-mode-output-v1', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_evidence_index (
			id, organization_id, project_id, domain_id, cycle_id, observation_ref,
			dataset_id, source_snapshot_id, captured_at
		) VALUES (
			'50000000-0000-4000-8000-000000000002', 'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'AI',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'negative-missing-formal-audit',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
			'50000000-0000-4000-8000-000000000001', '2026-09-01T00:00:00Z'
		);
		INSERT INTO sv_evidence_acceptance_receipts (organization_id, evidence_id, accepted_at, accepted_by)
		VALUES (
			'rls-schema-proof-org-a', '50000000-0000-4000-8000-000000000002',
			'2026-09-01T00:05:00Z', 'database-role:selena_test'
		);
		SET CONSTRAINTS sv_evidence_acceptance_receipts_audit_pair_guard IMMEDIATE;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTANCE_WITHOUT_AUDIT_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_AUDIT_REQUIRED' THEN RAISE; END IF;
	END;
	SET CONSTRAINTS sv_evidence_acceptance_receipts_audit_pair_guard DEFERRED;

	BEGIN
		INSERT INTO sv_audit_events (
			organization_id, actor_id, event, subject_kind, subject_id, details
		) VALUES (
			'rls-schema-proof-org-a', 'system:provider-evidence-acceptance',
			'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED', 'evidence',
			'60000000-0000-4000-8000-000000000001',
			'{"providerCalls":0,"privatePayloadRead":false}'::jsonb
		);
		SET CONSTRAINTS sv_audit_events_formal_evidence_receipt_pair_guard IMMEDIATE;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_AUDIT_WITHOUT_ACCEPTANCE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'FORMAL_EVIDENCE_AUDIT_RECEIPT_REQUIRED' THEN RAISE; END IF;
	END;
	SET CONSTRAINTS sv_audit_events_formal_evidence_receipt_pair_guard DEFERRED;
END;
$proof_owner_acceptance_audit_pair$;

DO $proof_owner_acceptance_time$
BEGIN
	BEGIN
		INSERT INTO sv_evidence_acceptance_receipts (
			organization_id, evidence_id, accepted_at, accepted_by
		) VALUES (
			'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
			'2026-09-01T00:06:00Z',
			'forged-owner-identity'
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTANCE_IDENTITY_FORGERY_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_IDENTITY_MISMATCH' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		INSERT INTO sv_evidence_acceptance_receipts (
			organization_id, evidence_id, accepted_at, accepted_by
		) VALUES (
			'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
			'2026-08-31T23:59:59Z',
			'database-role:selena_test'
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTANCE_PRE_CAPTURE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_PRECEDES_CAPTURE' THEN
				RAISE;
			END IF;
		END;

	BEGIN
		UPDATE sv_audit_events
		SET details = details
		WHERE event = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'
			AND subject_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7';
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_FORMAL_AUDIT_UPDATE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'FORMAL_EVIDENCE_AUDIT_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		DELETE FROM sv_audit_events
		WHERE event = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'
			AND subject_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7';
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_FORMAL_AUDIT_DELETE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'FORMAL_EVIDENCE_AUDIT_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		TRUNCATE TABLE sv_audit_events;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_FORMAL_AUDIT_TRUNCATE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'FORMAL_EVIDENCE_AUDIT_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;
END;
$proof_owner_acceptance_time$;

-- Empty tenant context must fail closed before the runtime role selects a tenant.
SELECT set_config('app.organization_id', '', true);
SET LOCAL ROLE selena_app;

-- The allowed runtime queue path is data-only. A partition request reaches
-- pg-boss' DDL branch and must still fail for the non-owner role.
DO $proof_pgboss_queue_bootstrap$
BEGIN
	PERFORM pgboss.create_queue(
		'selena-rls-schema-proof-runtime',
		'{"policy":"standard","partition":false}'::jsonb
	);
	IF NOT EXISTS (
		SELECT 1 FROM pgboss.queue WHERE name = 'selena-rls-schema-proof-runtime'
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_PGBOSS_QUEUE_BOOTSTRAP_FAILED';
	END IF;

	BEGIN
		PERFORM pgboss.create_queue(
			'selena-rls-schema-proof-ddl',
			'{"policy":"standard","partition":true}'::jsonb
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_PGBOSS_PARTITION_DDL_ALLOWED';
	EXCEPTION
		WHEN insufficient_privilege THEN
			NULL;
	END;

	IF EXISTS (SELECT 1 FROM pgboss.queue WHERE name = 'selena-rls-schema-proof-ddl') THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_PGBOSS_PARTITION_DDL_RESIDUE';
	END IF;
END;
$proof_pgboss_queue_bootstrap$;

DO $proof_missing_tenant$
BEGIN
	IF (SELECT count(*) FROM sv_provider_dataset_capabilities) <> 0 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_MISSING_TENANT_VISIBLE_ROWS';
	END IF;

	IF (SELECT count(*) FROM sv_provider_canary_executions) <> 0 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_MISSING_TENANT_VISIBLE_CANARY_RESERVATIONS';
	END IF;

	IF (SELECT count(*) FROM sv_evidence_acceptance_receipts) <> 0
		OR (SELECT count(*) FROM sv_evidence_read_model) <> 0 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_MISSING_TENANT_VISIBLE_ACCEPTANCE';
	END IF;

	IF (SELECT count(*) FROM sv_api_keys) <> 0 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_MISSING_TENANT_VISIBLE_API_KEYS';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM sv_resolve_api_key_context('rls-schema-proof-hash-a')
		WHERE organization_id = 'rls-schema-proof-org-a'
			AND permissions = ARRAY['client:read']
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_API_KEY_BOOTSTRAP_FAILED';
	END IF;

	IF EXISTS (SELECT 1 FROM sv_resolve_api_key_context('rls-schema-proof-missing')) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_UNKNOWN_API_KEY_BOOTSTRAP_VISIBLE';
	END IF;
END;
$proof_missing_tenant$;

SELECT set_config('app.organization_id', 'rls-schema-proof-org-a', true);

DO $proof_runtime_journal_recovery_acl$
BEGIN
	IF (SELECT count(*) FROM sv_journal_provider_boundaries) <> 0 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_BOUNDARY_SCOPE_FAILED';
	END IF;
	BEGIN
		PERFORM sv_recover_journal_daily_claim(
			'00000000-0000-4000-8000-000000000000',
			'rls-schema-proof-runtime'
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_RECOVERY_MISSING_CLAIM_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'JOURNAL_RECOVERY_CLAIM_NOT_FOUND' THEN RAISE; END IF;
	END;
END;
$proof_runtime_journal_recovery_acl$;

INSERT INTO sv_provider_canary_executions (organization_id, execution_identity)
VALUES ('rls-schema-proof-org-a', 'release-0e00df4f-google-ai-mode-owner-canary-1');

DO $proof_same_tenant_read$
BEGIN
	IF (
		SELECT count(*)
		FROM sv_provider_dataset_capabilities
		WHERE organization_id = 'rls-schema-proof-org-a'
	) <> 1 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAME_TENANT_READ_FAILED';
	END IF;

	IF (
		SELECT count(*)
		FROM sv_provider_dataset_capabilities
		WHERE organization_id = 'rls-schema-proof-org-b'
	) <> 0 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CROSS_TENANT_READ_VISIBLE';
	END IF;

	IF (SELECT count(*) FROM sv_api_keys) <> 1 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAME_TENANT_API_KEY_READ_FAILED';
	END IF;

	IF (
		SELECT count(*)
		FROM sv_provider_canary_executions
		WHERE organization_id = 'rls-schema-proof-org-a'
			AND source = 'GOOGLE_AI_MODE'
			AND approved_cap_usd = 0.250000
			AND recurring = false
			AND automatic_retries = 0
			AND cost_status = 'UNKNOWN'
	) <> 1 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CANARY_RESERVATION_FAILED';
	END IF;

	IF (
		SELECT count(*)
		FROM sv_evidence_acceptance_receipts
		WHERE organization_id = 'rls-schema-proof-org-a'
			AND evidence_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7'
	) <> 1 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAME_TENANT_ACCEPTANCE_READ_FAILED';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM sv_evidence_acceptance_receipts
		WHERE organization_id = 'rls-schema-proof-org-b'
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CROSS_TENANT_ACCEPTANCE_VISIBLE';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM sv_evidence_read_model
		WHERE evidence_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7'
			AND acceptance_status = 'ACCEPTED'
			AND accepted_at = '2026-09-01T00:05:00Z'::timestamptz
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAFE_ACCEPTANCE_PROJECTION_FAILED';
	END IF;

	IF (SELECT count(*) FROM sv_evidence_read_model) <> 1
		OR EXISTS (
			SELECT 1
			FROM sv_evidence_read_model
			WHERE evidence_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7'
		) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAFE_VIEW_CROSS_TENANT_VISIBLE';
	END IF;
END;
$proof_same_tenant_read$;

DO $proof_acceptance_contract$
BEGIN
	BEGIN
		INSERT INTO sv_evidence_acceptance_receipts (
			organization_id, evidence_id, accepted_at, accepted_by
		) VALUES (
			'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
			'2026-09-01T00:06:00Z',
			'private-proof-operator-a'
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_ACCEPTANCE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_OWNER_SCOPE_REQUIRED' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		UPDATE sv_measurement_cycles
		SET status = status
		WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTED_CYCLE_MUTATION_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'ACCEPTED_EVIDENCE_CYCLE_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		UPDATE sv_measurement_datasets
		SET immutable = immutable
		WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTED_DATASET_MUTATION_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'ACCEPTED_EVIDENCE_DATASET_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		UPDATE sv_evidence_acceptance_receipts
		SET accepted_at = accepted_at
		WHERE evidence_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7';
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTANCE_UPDATE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		DELETE FROM sv_evidence_acceptance_receipts
		WHERE evidence_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7';
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTANCE_DELETE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		TRUNCATE TABLE sv_evidence_acceptance_receipts;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTANCE_TRUNCATE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'EVIDENCE_ACCEPTANCE_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		PERFORM accepted_by FROM sv_evidence_acceptance_receipts LIMIT 1;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ACCEPTANCE_ACTOR_VISIBLE';
	EXCEPTION
		WHEN insufficient_privilege THEN
			NULL;
	END;
END;
$proof_acceptance_contract$;

-- Granting mutation privileges to the disposable probe demonstrates that the
-- table-level immutable guards reject every mutation form independently of the
-- narrower production grant set.
DO $proof_canary_immutable$
BEGIN
	BEGIN
		UPDATE sv_provider_canary_executions
		SET cost_status = 'UNKNOWN'
		WHERE execution_identity = 'release-0e00df4f-google-ai-mode-owner-canary-1';
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CANARY_UPDATE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'PROVIDER_CANARY_EXECUTION_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		DELETE FROM sv_provider_canary_executions
		WHERE execution_identity = 'release-0e00df4f-google-ai-mode-owner-canary-1';
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CANARY_DELETE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'PROVIDER_CANARY_EXECUTION_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;

	BEGIN
		TRUNCATE TABLE sv_provider_canary_executions;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CANARY_TRUNCATE_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'PROVIDER_CANARY_EXECUTION_IMMUTABLE' THEN
				RAISE;
			END IF;
	END;
END;
$proof_canary_immutable$;

-- The execution identity is unique across organizations forever. Reusing the
-- fixed identity from another tenant must fail closed without revealing row data.
SELECT set_config('app.organization_id', 'rls-schema-proof-org-b', true);
DO $proof_global_canary_once$
DECLARE
	inserted integer;
BEGIN
	INSERT INTO sv_provider_canary_executions (organization_id, execution_identity)
	VALUES ('rls-schema-proof-org-b', 'release-0e00df4f-google-ai-mode-owner-canary-1')
	ON CONFLICT (source, execution_identity) DO NOTHING;
	GET DIAGNOSTICS inserted = ROW_COUNT;
	IF inserted <> 0 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CANARY_IDENTITY_REUSED_ACROSS_TENANTS';
	END IF;
END;
$proof_global_canary_once$;

SELECT set_config('app.organization_id', 'rls-schema-proof-org-a', true);

-- The runtime role can append only a non-promoted same-tenant canary contract.
INSERT INTO sv_provider_dataset_capabilities (
	organization_id,
	provider,
	source,
	surface,
	domain,
	entity_type,
	dataset_env_key,
	input_schema_version,
	output_schema_version,
	access_class,
	capability_status,
	retention_class,
	contract_version,
	version,
	contract_metadata
) VALUES (
	'rls-schema-proof-org-a',
	'BRIGHT_DATA',
	'GOOGLE_AI_MODE',
	'GOOGLE_AI_MODE',
	'AI',
	'AI_ANSWER',
	'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
	'schema-discovery-input-v1',
	NULL,
	'PUBLIC',
	'CANARY_ONLY',
	'RAW_PRIVATE_POLICY_PENDING',
	'provider-dataset-v1.3',
	2,
	'{}'::jsonb
);

DO $proof_runtime_capability_promotion_denied$
BEGIN
	BEGIN
		INSERT INTO sv_provider_dataset_capabilities (
			organization_id,
			provider,
			source,
			surface,
			domain,
			entity_type,
			dataset_env_key,
			input_schema_version,
			output_schema_version,
			access_class,
			capability_status,
			retention_class,
			contract_version,
			version,
			contract_metadata
		) VALUES (
			'rls-schema-proof-org-a',
			'BRIGHT_DATA',
			'GOOGLE_AI_MODE',
			'GOOGLE_AI_MODE',
			'AI',
			'AI_ANSWER',
			'SELENA_BRIGHTDATA_DATASET_GOOGLE_AI',
			'schema-discovery-input-v1',
			'google-ai-mode-output-v2',
			'PUBLIC',
			'PILOT_ONLY',
			'RAW_PRIVATE_POLICY_PENDING',
			'provider-dataset-v1.3',
			3,
			'{}'::jsonb
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_CAPABILITY_PROMOTION_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'PROVIDER_DATASET_CAPABILITY_PROMOTION_OWNER_SCOPE_REQUIRED' THEN
				RAISE;
			END IF;
	END;
END;
$proof_runtime_capability_promotion_denied$;

DO $proof_runtime_snapshot_promotion_denied$
BEGIN
	BEGIN
		INSERT INTO sv_source_snapshots (
			id, organization_id, project_id, source_type, source_ref, content_sha256, snapshot,
			capability_id, provider_dataset_ref, environment, raw_reference,
			input_schema_version, output_schema_version, captured_at
		) VALUES (
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
			'rls-schema-proof-org-a',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			'GOOGLE_AI_MODE',
			'private:runtime-promotion-denied',
			'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
			'{}'::jsonb,
			(SELECT id FROM sv_provider_dataset_capabilities
				WHERE organization_id = 'rls-schema-proof-org-a' AND source = 'GOOGLE_AI_MODE' AND version = 1),
			'private-dataset-a',
			'STAGING_ACCEPTANCE',
			'private:runtime-promotion-denied',
			'schema-discovery-input-v1',
			'google-ai-mode-output-v1',
			'2026-09-01T00:00:00Z'
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_SNAPSHOT_PROMOTION_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'SOURCE_SNAPSHOT_SCHEMA_PROMOTION_OWNER_SCOPE_REQUIRED' THEN
				RAISE;
			END IF;
	END;
END;
$proof_runtime_snapshot_promotion_denied$;

DO $proof_runtime_formal_audit_denied$
BEGIN
	BEGIN
		INSERT INTO sv_audit_events (
			organization_id, actor_id, event, subject_kind, subject_id, details
		) VALUES (
			'rls-schema-proof-org-a',
			'runtime:forbidden',
			'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED',
			'evidence',
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
			'{}'::jsonb
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RUNTIME_FORMAL_AUDIT_ALLOWED';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM <> 'FORMAL_EVIDENCE_AUDIT_OWNER_SCOPE_REQUIRED' THEN
				RAISE;
			END IF;
	END;
END;
$proof_runtime_formal_audit_denied$;

DO $proof_cross_tenant_write$
BEGIN
	BEGIN
		INSERT INTO sv_provider_dataset_capabilities (
			organization_id,
			provider,
			source,
			surface,
			domain,
			entity_type,
			dataset_env_key,
			input_schema_version,
			output_schema_version,
			access_class,
			capability_status,
			retention_class,
			contract_version,
			version,
			contract_metadata
		) VALUES (
			'rls-schema-proof-org-b',
			'BRIGHT_DATA',
			'GOOGLE_SERP',
			'GOOGLE_SERP',
			'SEARCH',
			'SEARCH_RESULT',
			'SELENA_BRIGHTDATA_DATASET_GOOGLE_SERP',
			'schema-discovery-input-v1',
			NULL,
			'PUBLIC',
			'CANARY_ONLY',
			'RAW_PRIVATE_POLICY_PENDING',
			'provider-dataset-v1.3',
			1,
			'{}'::jsonb
		);
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CROSS_TENANT_WRITE_ALLOWED';
	EXCEPTION
		WHEN insufficient_privilege THEN
			NULL;
	END;
END;
$proof_cross_tenant_write$;

DO $proof_private_provenance$
BEGIN
	PERFORM 1 FROM sv_evidence_read_model LIMIT 1;
	PERFORM content_sha256_format_valid FROM sv_source_snapshots LIMIT 1;

	BEGIN
		PERFORM 1 FROM sv_evidence_provenance LIMIT 1;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_PRIVATE_PROVENANCE_VISIBLE';
	EXCEPTION
		WHEN insufficient_privilege THEN
			NULL;
	END;

	BEGIN
		PERFORM raw_reference FROM sv_source_snapshots LIMIT 1;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_RAW_SNAPSHOT_COLUMN_VISIBLE';
	EXCEPTION
		WHEN insufficient_privilege THEN
			NULL;
	END;

	BEGIN
		PERFORM content_sha256 FROM sv_source_snapshots LIMIT 1;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_CONTENT_HASH_VISIBLE';
	EXCEPTION
		WHEN insufficient_privilege THEN
			NULL;
	END;
END;
$proof_private_provenance$;

DO $proof_final_counts$
BEGIN
	IF (SELECT count(*) FROM sv_provider_dataset_capabilities) <> 2 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAFE_CANARY_CAPABILITY_NOT_VISIBLE';
	END IF;
END;
$proof_final_counts$;

RESET ROLE;
ROLLBACK;

\echo 'RLS_SCHEMA_PROOF_ONLY PASS: actual selena_app validated; temporary grants and fixtures rolled back.'
