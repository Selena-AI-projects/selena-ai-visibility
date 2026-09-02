#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
. "$repo_root/tools/visibility_os_compose_command.sh"
compose_file="${1:-$repo_root/tools/visibility_os_disposable_postgres.compose.yml}"
compose_project="${SELENA_VISIBILITY_COMPOSE_PROJECT:-}"
if [[ ! "$compose_project" =~ ^selena-visibility-rehearsal-[a-z0-9][a-z0-9_-]+$ ]]; then
	printf 'BLOCKED_SCOPE: SELENA_VISIBILITY_COMPOSE_PROJECT must name an isolated rehearsal project.\n' >&2
	exit 2
fi

container=("${compose_cli[@]}" -p "$compose_project" -f "$compose_file" exec -T postgres)
admin=("${container[@]}" psql -h 127.0.0.1 -U selena_test -v ON_ERROR_STOP=1)

ready=false
for _ in {1..30}; do
	if "${admin[@]}" -d postgres -Atc 'SELECT 1' >/dev/null 2>&1; then
		ready=true
		break
	fi
	sleep 0.2
done
if [[ "$ready" != true ]]; then
	printf 'BLOCKED_ENV: disposable PostgreSQL admin connection is not ready.\n' >&2
	exit 3
fi

mapped_port="$("${compose_cli[@]}" -p "$compose_project" -f "$compose_file" port postgres 5432)"
mapped_port="${mapped_port##*:}"
if [[ ! "$mapped_port" =~ ^[0-9]+$ ]]; then
	printf 'BLOCKED_ENV: disposable PostgreSQL mapped port is unavailable.\n' >&2
	exit 3
fi
database_url_prefix="postgres://selena_test:selena_test@127.0.0.1:${mapped_port}"
bounded_bundle_51=''
bounded_bundle_58=''

cleanup_databases() {
	local exit_code=$?
	trap - EXIT
	for database in selena_variant_full_current selena_variant_full_release selena_variant_short_current selena_variant_short_release selena_variant_bounded_release_short selena_variant_legacy_acceptance_guard; do
		"${admin[@]}" -d postgres -c "DROP DATABASE IF EXISTS $database WITH (FORCE)" >/dev/null 2>&1 || true
	done
	for bundle in "$bounded_bundle_51" "$bounded_bundle_58"; do
		if [[ -n "$bundle" && -d "$bundle" ]]; then
			rm -rf -- "$bundle"
		fi
	done
	exit "$exit_code"
}
trap cleanup_databases EXIT

apply_through_0050() {
	local database="$1"
	for migration in "$repo_root"/packages/lib/src/db/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
		local migration_name migration_number
		migration_name="$(basename "$migration")"
		migration_number="${migration_name%%_*}"
		if ((10#$migration_number > 50)); then
			continue
		fi
		"${admin[@]}" -d "$database" --single-transaction < "$migration" >/dev/null
	done
}

install_release_0052_behavior() {
	local database="$1"
	"${admin[@]}" -d "$database" <<'SQL' >/dev/null
DO $$
DECLARE
	function_definition text;
BEGIN
	SELECT pg_get_functiondef('sv_enforce_provider_dataset_snapshot_event_insert()'::regprocedure)
	INTO function_definition;
	function_definition := replace(
		function_definition,
		'IF NEW."phase" <> ''TRIGGERED'' THEN',
		'IF NEW."phase" NOT IN (''TRIGGERED'', ''RESUMED'') THEN'
	);
	IF function_definition NOT LIKE '%IF NEW."phase" NOT IN (''TRIGGERED'', ''RESUMED'') THEN%' THEN
		RAISE EXCEPTION 'MIGRATION_VARIANT_0052_RELEASE_FIXTURE_FAILED';
	END IF;
	EXECUTE function_definition;
END;
$$;
SQL
}

seed_legacy_project_rows() {
	local database="$1"
	"${admin[@]}" -d "$database" <<'SQL' >/dev/null
INSERT INTO organization (id, name, slug, created_at)
VALUES ('migration-variant', 'Migration Variant', 'migration-variant', clock_timestamp());
INSERT INTO sv_measurement_domains (domain_id, unit_of_measure)
VALUES ('AI', 'fixture') ON CONFLICT (domain_id) DO NOTHING;
INSERT INTO sv_projects (id, organization_id, name, category, country, languages, status)
VALUES (
	'57000000-0000-4000-8000-000000000001', 'migration-variant',
	'Migration Variant', 'fixture', 'ID', ARRAY['en'], 'DRAFT'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha,
	expected_runs, budget_cap, created_by
) VALUES (
	'57000000-0000-4000-8000-000000000002', 'migration-variant',
	'57000000-0000-4000-8000-000000000001', 1, '{}'::jsonb,
	'fixture', 1, 0, 'fixture'
);
INSERT INTO sv_measurement_cycles (
	id, organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
) VALUES (
	'57000000-0000-4000-8000-000000000003', 'migration-variant', 'AI',
	'57000000-0000-4000-8000-000000000003',
	'57000000-0000-4000-8000-000000000002', 'COMPLETED'
);
INSERT INTO sv_measurement_datasets (id, organization_id, cycle_id, dataset_key, version)
VALUES (
	'57000000-0000-4000-8000-000000000004', 'migration-variant',
	'57000000-0000-4000-8000-000000000003', 'migration-variant', 1
);
INSERT INTO sv_source_snapshots (
	id, organization_id, source_type, source_ref, content_sha256, snapshot, captured_at
) VALUES (
	'57000000-0000-4000-8000-000000000005', 'migration-variant', 'UPLOAD',
	'fixture:legacy', '5700000000000000000000000000000000000000000000000000000000000005',
	'{}'::jsonb, '2026-09-02T00:00:00Z'
);
INSERT INTO sv_evidence_index (
	id, organization_id, domain_id, cycle_id, observation_ref,
	dataset_id, source_snapshot_id, captured_at
) VALUES (
	'57000000-0000-4000-8000-000000000006', 'migration-variant', 'AI',
	'57000000-0000-4000-8000-000000000003', 'legacy-observation',
	'57000000-0000-4000-8000-000000000004',
	'57000000-0000-4000-8000-000000000005', '2026-09-02T00:00:00Z'
);
INSERT INTO sv_provider_dataset_capabilities (
	id, organization_id, provider, source, surface, domain, entity_type,
	dataset_env_key, input_schema_version, output_schema_version, access_class,
	capability_status, retention_class, contract_version, version, contract_metadata
) VALUES (
	'57000000-0000-4000-8000-000000000007', 'migration-variant', 'BRIGHT_DATA',
	'GOOGLE_AI_MODE', 'GOOGLE_AI_MODE', 'AI', 'AI_ANSWER', 'FIXTURE_DATASET',
	'fixture-input-v1', 'fixture-output-v1', 'PUBLIC', 'PILOT_ONLY',
	'RAW_PRIVATE_POLICY_PENDING', 'provider-dataset-v1.3', 1, '{}'::jsonb
);
INSERT INTO sv_provider_dataset_snapshot_events (
	organization_id, project_id, provider, source, provider_dataset_id,
	snapshot_id, phase, provider_status, record_count, observed_at, event_hash
) VALUES
	(
		'migration-variant', '57000000-0000-4000-8000-000000000001', 'BRIGHT_DATA',
		'GOOGLE_AI_MODE', 'fixture-provider-dataset', 'fixture-delivered', 'TRIGGERED',
		NULL, NULL, '2026-09-02T00:01:00Z',
		'sha256:5700000000000000000000000000000000000000000000000000000000000001'
	),
	(
		'migration-variant', '57000000-0000-4000-8000-000000000001', 'BRIGHT_DATA',
		'GOOGLE_AI_MODE', 'fixture-provider-dataset', 'fixture-delivered', 'READY',
		'ready', NULL, '2026-09-02T00:02:00Z',
		'sha256:5700000000000000000000000000000000000000000000000000000000000002'
	),
	(
		'migration-variant', '57000000-0000-4000-8000-000000000001', 'BRIGHT_DATA',
		'GOOGLE_AI_MODE', 'fixture-provider-dataset', 'fixture-delivered', 'DELIVERED',
		NULL, 1, '2026-09-02T00:03:00Z',
		'sha256:5700000000000000000000000000000000000000000000000000000000000003'
	);
INSERT INTO sv_source_snapshots (
	id, organization_id, source_type, source_ref, content_sha256, snapshot,
	capability_id, provider_dataset_ref, environment, raw_reference,
	input_schema_version, output_schema_version, captured_at
) VALUES
	(
		'57000000-0000-4000-8000-000000000008', 'migration-variant', 'GOOGLE_AI_MODE',
		'private:delivered', '5700000000000000000000000000000000000000000000000000000000000008',
		'{}'::jsonb, '57000000-0000-4000-8000-000000000007', 'fixture-provider-dataset',
		'STAGING_ACCEPTANCE', 'brightdata:snapshot:fixture-delivered',
		'fixture-input-v1', 'fixture-output-v1', '2026-09-02T00:00:00Z'
	),
	(
		'57000000-0000-4000-8000-000000000009', 'migration-variant', 'GOOGLE_AI_MODE',
		'private:unbound', '5700000000000000000000000000000000000000000000000000000000000009',
		'{}'::jsonb, '57000000-0000-4000-8000-000000000007', 'fixture-provider-dataset',
		'STAGING_ACCEPTANCE', 'brightdata:snapshot:fixture-unbound',
		'fixture-input-v1', 'fixture-output-v1', '2026-09-02T00:00:00Z'
	);
SQL
}

catalog_fingerprint() {
	local database="$1"
	"${admin[@]}" -d "$database" -At <<'SQL'
WITH catalog_rows AS (
	SELECT 'column:' || table_name || ':' || column_name || ':' || data_type || ':' || is_nullable || ':' || coalesce(generation_expression, '') AS value
	FROM information_schema.columns
	WHERE table_schema = 'public'
		AND table_name IN (
			'sv_provider_canary_executions', 'sv_source_snapshots', 'sv_evidence_index',
			'sv_evidence_acceptance_receipts', 'sv_provider_dataset_snapshot_events',
			'sv_journal_daily_claims', 'sv_journal_provider_boundaries'
		)
	UNION ALL
	SELECT 'constraint:' || conname || ':' || pg_get_constraintdef(oid)
	FROM pg_constraint
	WHERE connamespace = 'public'::regnamespace
		AND conrelid IN (
			'public.sv_provider_canary_executions'::regclass,
			'public.sv_source_snapshots'::regclass,
			'public.sv_evidence_index'::regclass,
			'public.sv_evidence_acceptance_receipts'::regclass,
			'public.sv_provider_dataset_snapshot_events'::regclass,
			'public.sv_journal_daily_claims'::regclass,
			'public.sv_journal_provider_boundaries'::regclass
		)
	UNION ALL
	SELECT 'index:' || indexname || ':' || indexdef
	FROM pg_indexes
	WHERE schemaname = 'public'
		AND tablename IN (
			'sv_provider_canary_executions', 'sv_source_snapshots', 'sv_evidence_index',
			'sv_evidence_acceptance_receipts', 'sv_provider_dataset_snapshot_events',
			'sv_journal_daily_claims', 'sv_journal_provider_boundaries'
		)
	UNION ALL
	SELECT 'view:' || viewname || ':' || definition
	FROM pg_views
	WHERE schemaname = 'public' AND viewname IN ('sv_evidence_provenance', 'sv_evidence_read_model')
	UNION ALL
	SELECT 'relation:' || relation.relname || ':' || relation.relrowsecurity || ':' || relation.relforcerowsecurity
		|| ':' || coalesce(relation.reloptions::text, '') || ':' || coalesce(relation.relacl::text, '')
	FROM pg_class AS relation
	WHERE relation.relnamespace = 'public'::regnamespace
		AND relation.relname IN (
			'sv_provider_canary_executions', 'sv_source_snapshots', 'sv_evidence_index',
			'sv_evidence_acceptance_receipts', 'sv_provider_dataset_snapshot_events',
			'sv_journal_daily_claims', 'sv_journal_provider_boundaries',
			'sv_evidence_provenance', 'sv_evidence_read_model'
		)
	UNION ALL
	SELECT 'policy:' || tablename || ':' || policyname || ':' || cmd || ':'
		|| coalesce(qual, '') || ':' || coalesce(with_check, '')
	FROM pg_policies
	WHERE schemaname = 'public'
		AND tablename IN (
			'sv_provider_canary_executions', 'sv_source_snapshots', 'sv_evidence_index',
			'sv_evidence_acceptance_receipts', 'sv_provider_dataset_snapshot_events',
			'sv_journal_daily_claims', 'sv_journal_provider_boundaries'
		)
	UNION ALL
	SELECT 'trigger:' || event_object_table || ':' || trigger_name || ':' || action_statement
	FROM information_schema.triggers
	WHERE trigger_schema = 'public'
		AND event_object_table IN (
			'sv_provider_canary_executions', 'sv_source_snapshots', 'sv_evidence_index',
			'sv_evidence_acceptance_receipts', 'sv_provider_dataset_snapshot_events',
			'sv_journal_daily_claims', 'sv_journal_provider_boundaries',
			'sv_measurement_runs', 'sv_audit_events'
		)
	UNION ALL
	SELECT 'function:' || proname || ':' || pg_get_functiondef(oid)
	FROM pg_proc
	WHERE pronamespace = 'public'::regnamespace
		AND proname IN (
			'sv_reject_provider_canary_execution_mutation', 'sv_enforce_evidence_acceptance_receipt',
			'sv_reject_evidence_acceptance_mutation', 'sv_resolve_api_key_context',
			'sv_enforce_provider_dataset_snapshot_event_insert', 'sv_enforce_evidence_capability_domain',
			'sv_enforce_formal_evidence_audit', 'sv_require_formal_evidence_audit_pair',
			'sv_require_formal_evidence_receipt_pair',
			'sv_guard_journal_provider_boundary_insert',
			'sv_prevent_journal_provider_boundary_mutation',
			'sv_require_journal_provider_boundary', 'sv_journal_claim_recovery_state',
			'sv_guard_journal_daily_claim_mutation', 'sv_recover_journal_daily_claim'
		)
)
SELECT md5(string_agg(value, E'\n' ORDER BY value)) FROM catalog_rows;
SQL
}

run_variant() {
	local database="$1"
	local migration_0051="$2"
	local migration_0052="$3"
	"${admin[@]}" -d postgres -c "CREATE DATABASE $database" >/dev/null
	apply_through_0050 "$database"
	"${admin[@]}" -d "$database" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0051_visibility_os_provider_evidence_provenance.sql" >/dev/null
	if [[ "$migration_0051" == 'release-short' ]]; then
		"${admin[@]}" -d "$database" --single-transaction < "$repo_root/tools/fixtures/0051_release_short_catalog.sql" >/dev/null
		if [[ "$("${admin[@]}" -d "$database" -Atc "SELECT to_regclass('public.sv_evidence_acceptance_receipts') IS NULL")" != 't' ]]; then
			printf 'MIGRATION_VARIANT_RELEASE_SHORT_FIXTURE_FAILED database=%s\n' "$database" >&2
			exit 1
		fi
	fi
	"${admin[@]}" -d "$database" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0052_provider_dataset_snapshot_journal.sql" >/dev/null
	if [[ "$migration_0052" == 'release' ]]; then
		install_release_0052_behavior "$database"
	fi
	for migration in \
		"$repo_root/packages/lib/src/db/migrations/0053_configuration_lock_legacy_collision_ordinal.sql" \
		"$repo_root/packages/lib/src/db/migrations/0054_journal_daily_claim_execution_lease.sql" \
		"$repo_root/packages/lib/src/db/migrations/0055_provider_snapshot_resume_reconciliation.sql"; do
		"${admin[@]}" -d "$database" --single-transaction < "$migration" >/dev/null
	done
	if [[ "$migration_0051" == 'release-short' ]]; then
		"${admin[@]}" -d "$database" --single-transaction < "$repo_root/packages/lib/src/db/migrations/compat/0051_release_short_to_feature_superset.sql" >/dev/null
	fi
	seed_legacy_project_rows "$database"
	"${admin[@]}" -d "$database" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0056_formal_evidence_acceptance_hardening.sql" >/dev/null
	"${admin[@]}" -d "$database" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0057_evidence_project_identity_hardening.sql" >/dev/null
	"${admin[@]}" -d "$database" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0058_journal_provider_boundary_recovery.sql" >/dev/null
	backfill_receipt="$("${admin[@]}" -d "$database" -Atc "SELECT (SELECT project_id::text FROM sv_evidence_index WHERE id = '57000000-0000-4000-8000-000000000006') || ':' || (SELECT project_id::text FROM sv_source_snapshots WHERE id = '57000000-0000-4000-8000-000000000005') || ':' || (SELECT project_id::text FROM sv_source_snapshots WHERE id = '57000000-0000-4000-8000-000000000008') || ':' || (SELECT project_id IS NULL FROM sv_source_snapshots WHERE id = '57000000-0000-4000-8000-000000000009') || ':' || (SELECT tgenabled::text FROM pg_trigger WHERE tgrelid = 'sv_evidence_index'::regclass AND tgname = 'sv_evidence_index_immutable_guard') || ':' || (SELECT tgenabled::text FROM pg_trigger WHERE tgrelid = 'sv_source_snapshots'::regclass AND tgname = 'sv_source_snapshots_immutable_guard')")"
	if [[ "$backfill_receipt" != '57000000-0000-4000-8000-000000000001:57000000-0000-4000-8000-000000000001:57000000-0000-4000-8000-000000000001:true:O:O' ]]; then
		printf 'MIGRATION_VARIANT_LEGACY_BACKFILL_FAILED database=%s receipt=%s\n' "$database" "$backfill_receipt" >&2
		exit 1
	fi
	variant_fingerprint="$(catalog_fingerprint "$database")"
	if [[ -z "$variant_fingerprint" ]]; then
		printf 'MIGRATION_VARIANT_EMPTY_FINGERPRINT database=%s\n' "$database" >&2
		exit 1
	fi
}

run_bounded_release_short() {
	local database='selena_variant_bounded_release_short'
	"${admin[@]}" -d postgres -c "CREATE DATABASE $database" >/dev/null
	bounded_bundle_51="$(mktemp -d "${TMPDIR:-/tmp}/selena-bounded-0051.XXXXXX")"
	DATABASE_URL="${database_url_prefix}/${database}" \
		SELENA_MIGRATION_MAX_INDEX=51 \
		SELENA_BOUNDED_MIGRATIONS_DIR="$bounded_bundle_51" \
		node "$repo_root/packages/lib/scripts/run-bounded-migrations.mjs" --prepare-only >/dev/null
	if [[ -e "$bounded_bundle_51/compat/0051_release_short_to_feature_superset.sql" ]]; then
		printf 'MIGRATION_VARIANT_BOUNDED_CEILING_BREACH maximum=51\n' >&2
		exit 1
	fi
	DATABASE_URL="${database_url_prefix}/${database}" \
		SELENA_MIGRATIONS_DIR="$bounded_bundle_51" \
		node "$repo_root/packages/lib/scripts/apply-migrations.mjs" >/dev/null
	"${admin[@]}" -d "$database" --single-transaction \
		< "$repo_root/tools/fixtures/0051_release_short_catalog.sql" >/dev/null
	"${admin[@]}" -d "$database" -c \
		"UPDATE drizzle.__drizzle_migrations SET hash = 'd66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395' WHERE created_at = 1787940013000" \
		>/dev/null
	bounded_bundle_58="$(mktemp -d "${TMPDIR:-/tmp}/selena-bounded-0058.XXXXXX")"
	DATABASE_URL="${database_url_prefix}/${database}" \
		SELENA_MIGRATION_MAX_INDEX=58 \
		SELENA_BOUNDED_MIGRATIONS_DIR="$bounded_bundle_58" \
		node "$repo_root/packages/lib/scripts/run-bounded-migrations.mjs" --prepare-only >/dev/null
	if [[ ! -f "$bounded_bundle_58/compat/0051_release_short_to_feature_superset.sql" ]]; then
		printf 'MIGRATION_VARIANT_BOUNDED_COMPATIBILITY_MISSING maximum=58\n' >&2
		exit 1
	fi
	DATABASE_URL="${database_url_prefix}/${database}" \
		SELENA_MIGRATIONS_DIR="$bounded_bundle_58" \
		node "$repo_root/packages/lib/scripts/apply-migrations.mjs" >/dev/null
	if [[ "$("${admin[@]}" -d "$database" -Atc "SELECT count(*) || ':' || max(created_at)::text || ':' || (to_regclass('public.sv_evidence_acceptance_receipts') IS NOT NULL)::text || ':' || EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sv_evidence_index' AND column_name = 'project_id')::text || ':' || (to_regclass('public.sv_journal_provider_boundaries') IS NOT NULL)::text FROM drizzle.__drizzle_migrations")" != '59:1787940020000:true:true:true' ]]; then
		printf 'MIGRATION_VARIANT_BOUNDED_RELEASE_SHORT_FAILED\n' >&2
		exit 1
	fi
}

run_legacy_acceptance_guard() {
	local database='selena_variant_legacy_acceptance_guard'
	"${admin[@]}" -d postgres -c "CREATE DATABASE $database" >/dev/null
	apply_through_0050 "$database"
	for migration in \
		0051_visibility_os_provider_evidence_provenance \
		0052_provider_dataset_snapshot_journal \
		0053_configuration_lock_legacy_collision_ordinal \
		0054_journal_daily_claim_execution_lease \
		0055_provider_snapshot_resume_reconciliation; do
		"${admin[@]}" -d "$database" --single-transaction \
			< "$repo_root/packages/lib/src/db/migrations/${migration}.sql" >/dev/null
	done
	seed_legacy_project_rows "$database"
	"${admin[@]}" -d "$database" --single-transaction \
		< "$repo_root/packages/lib/src/db/migrations/0056_formal_evidence_acceptance_hardening.sql" >/dev/null
	"${admin[@]}" -d "$database" <<'SQL' >/dev/null
ALTER TABLE sv_evidence_acceptance_receipts DISABLE TRIGGER USER;
ALTER TABLE sv_audit_events DISABLE TRIGGER USER;
INSERT INTO sv_evidence_acceptance_receipts (
	organization_id, evidence_id, accepted_at, accepted_by
) VALUES (
	'migration-variant', '57000000-0000-4000-8000-000000000006',
	'2026-09-02T00:05:00Z', 'database-role:selena_test'
);
INSERT INTO sv_audit_events (
	organization_id, actor_id, event, subject_kind, subject_id, details
) VALUES (
	'migration-variant', 'historical-owner', 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED',
	'evidence', '57000000-0000-4000-8000-000000000006', '{}'::jsonb
);
ALTER TABLE sv_evidence_acceptance_receipts ENABLE TRIGGER USER;
ALTER TABLE sv_audit_events ENABLE TRIGGER USER;
SQL
	if "${admin[@]}" -d "$database" --single-transaction \
		< "$repo_root/packages/lib/src/db/migrations/0057_evidence_project_identity_hardening.sql" \
		>/dev/null 2>&1; then
		printf 'MIGRATION_VARIANT_LEGACY_ACCEPTANCE_NOT_BLOCKED\n' >&2
		exit 1
	fi
	if [[ "$("${admin[@]}" -d "$database" -Atc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sv_evidence_index' AND column_name = 'project_id')::text || ':' || (SELECT count(*) FROM sv_evidence_acceptance_receipts)::text || ':' || (SELECT count(*) FROM sv_audit_events WHERE event = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED')::text")" != 'false:1:1' ]]; then
		printf 'MIGRATION_VARIANT_LEGACY_ACCEPTANCE_GUARD_ROLLBACK_FAILED\n' >&2
		exit 1
	fi
}

variant_fingerprint=''
run_variant selena_variant_full_current feature-superset historical
full_current="$variant_fingerprint"
run_variant selena_variant_full_release feature-superset release
full_release="$variant_fingerprint"
run_variant selena_variant_short_current release-short historical
short_current="$variant_fingerprint"
run_variant selena_variant_short_release release-short release
short_release="$variant_fingerprint"

run_bounded_release_short
run_legacy_acceptance_guard

if [[ "$full_current" != "$full_release" || "$full_current" != "$short_current" || "$full_current" != "$short_release" ]]; then
	printf 'MIGRATION_VARIANT_CATALOG_DIVERGENCE full_current=%s full_release=%s short_current=%s short_release=%s\n' \
		"$full_current" "$full_release" "$short_current" "$short_release" >&2
	exit 1
fi

printf 'MIGRATION_VARIANT_MATRIX_PASS variants=4 boundedReleaseShort=true legacyAcceptance=blocked catalog=%s providerCalls=0 cleanup=verified\n' "$full_current"
