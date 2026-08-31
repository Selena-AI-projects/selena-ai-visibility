-- RLS_SCHEMA_PROOF_ONLY for the migration frontier through 0051.
--
-- Source-only acceptance artifact. This file does not connect to a database.
-- Do not execute it against shared staging without separate owner approval, a
-- verified restorable checkpoint, and a migration receipt ending at 0051.
-- Run with psql as a database administration role that can CREATE ROLE and
-- grant table privileges. The proof is deliberately one transaction and ends
-- with ROLLBACK, so neither the probe role nor fixtures persist.

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
	provenance_options text[];
BEGIN
	IF to_regclass('public.sv_provider_dataset_capabilities') IS NULL
		OR to_regclass('public.sv_provider_canary_executions') IS NULL
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

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'sv_evidence_read_model'
			AND column_name IN ('source_ref', 'raw_reference', 'provider_dataset_ref', 'environment', 'content_sha256', 'snapshot')
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAFE_EVIDENCE_EXPOSES_RAW_COLUMN';
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

	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_rls_schema_probe') THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ROLE_ALREADY_EXISTS';
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

CREATE ROLE selena_rls_schema_probe
	NOLOGIN
	NOSUPERUSER
	NOCREATEDB
	NOCREATEROLE
	NOINHERIT
	NOBYPASSRLS;

DO $proof_role_attributes$
DECLARE
	probe pg_roles%ROWTYPE;
BEGIN
	SELECT * INTO STRICT probe FROM pg_roles WHERE rolname = 'selena_rls_schema_probe';
	IF probe.rolcanlogin
		OR probe.rolsuper
		OR probe.rolcreatedb
		OR probe.rolcreaterole
		OR probe.rolinherit
		OR probe.rolbypassrls THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ROLE_IS_PRIVILEGED';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM pg_class
		WHERE oid = 'public.sv_provider_dataset_capabilities'::regclass
			AND relowner = probe.oid
	) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_ROLE_OWNS_CAPABILITY_TABLE';
	END IF;
END;
$proof_role_attributes$;

GRANT selena_rls_schema_probe TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
GRANT USAGE ON SCHEMA public TO selena_rls_schema_probe;
GRANT SELECT, INSERT ON sv_provider_dataset_capabilities TO selena_rls_schema_probe;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON sv_provider_canary_executions TO selena_rls_schema_probe;
GRANT SELECT ON sv_evidence_read_model TO selena_rls_schema_probe;
GRANT SELECT ON sv_evidence_index, sv_measurement_cycles, sv_configuration_locks, sv_measurement_datasets TO selena_rls_schema_probe;
GRANT SELECT (
	id, organization_id, source_type, capability_id,
	input_schema_version, output_schema_version, captured_at, immutable, created_at
) ON sv_source_snapshots TO selena_rls_schema_probe;
GRANT SELECT ON sv_api_keys TO selena_rls_schema_probe;
GRANT EXECUTE ON FUNCTION sv_resolve_api_key_context(text) TO selena_rls_schema_probe;

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
	NULL,
	'PUBLIC',
	'CANARY_ONLY',
	'RAW_PRIVATE_POLICY_PENDING',
	'provider-dataset-v1.3',
	1,
	'{}'::jsonb
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
	NULL,
	'PUBLIC',
	'CANARY_ONLY',
	'RAW_PRIVATE_POLICY_PENDING',
	'provider-dataset-v1.3',
	1,
	'{}'::jsonb
);

-- Empty tenant context must fail closed before the probe selects a tenant.
SELECT set_config('app.organization_id', '', true);
SET LOCAL ROLE selena_rls_schema_probe;

DO $proof_missing_tenant$
BEGIN
	IF (SELECT count(*) FROM sv_provider_dataset_capabilities) <> 0 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_MISSING_TENANT_VISIBLE_ROWS';
	END IF;

	IF (SELECT count(*) FROM sv_provider_canary_executions) <> 0 THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_MISSING_TENANT_VISIBLE_CANARY_RESERVATIONS';
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
END;
$proof_same_tenant_read$;

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

-- A same-tenant append-only version is allowed for the unprivileged role.
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
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_SAME_TENANT_INSERT_NOT_VISIBLE';
	END IF;
END;
$proof_final_counts$;

RESET ROLE;
ROLLBACK;

\echo 'RLS_SCHEMA_PROOF_ONLY PASS: transaction rolled back; no probe role or fixtures persisted.'
