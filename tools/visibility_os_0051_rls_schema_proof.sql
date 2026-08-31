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
	provenance_options text[];
BEGIN
	IF to_regclass('public.sv_provider_dataset_capabilities') IS NULL
		OR to_regclass('public.sv_evidence_provenance') IS NULL THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_REQUIRES_MIGRATION_0051';
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

	SELECT reloptions INTO provenance_options
	FROM pg_class
	WHERE oid = 'public.sv_evidence_provenance'::regclass;

	IF NOT ('security_invoker=true' = ANY (coalesce(provenance_options, ARRAY[]::text[]))) THEN
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_PROVENANCE_NOT_SECURITY_INVOKER';
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

INSERT INTO organization (id, name, slug, created_at)
VALUES
	('rls-schema-proof-org-a', 'RLS schema proof A', 'rls-schema-proof-org-a', now()),
	('rls-schema-proof-org-b', 'RLS schema proof B', 'rls-schema-proof-org-b', now());

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
END;
$proof_missing_tenant$;

SELECT set_config('app.organization_id', 'rls-schema-proof-org-a', true);

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
END;
$proof_same_tenant_read$;

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
	BEGIN
		PERFORM 1 FROM sv_evidence_provenance LIMIT 1;
		RAISE EXCEPTION 'RLS_SCHEMA_PROOF_PRIVATE_PROVENANCE_VISIBLE';
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
