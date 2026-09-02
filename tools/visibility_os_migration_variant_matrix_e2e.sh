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

cleanup_databases() {
	local exit_code=$?
	trap - EXIT
	for database in selena_variant_full_current selena_variant_full_release selena_variant_short_current selena_variant_short_release; do
		"${admin[@]}" -d postgres -c "DROP DATABASE IF EXISTS $database WITH (FORCE)" >/dev/null 2>&1 || true
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

catalog_fingerprint() {
	local database="$1"
	"${admin[@]}" -d "$database" -At <<'SQL'
WITH catalog_rows AS (
	SELECT 'column:' || table_name || ':' || column_name || ':' || data_type || ':' || is_nullable || ':' || coalesce(generation_expression, '') AS value
	FROM information_schema.columns
	WHERE table_schema = 'public'
		AND table_name IN (
			'sv_provider_canary_executions', 'sv_source_snapshots', 'sv_evidence_index',
			'sv_evidence_acceptance_receipts', 'sv_provider_dataset_snapshot_events'
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
			'public.sv_provider_dataset_snapshot_events'::regclass
		)
	UNION ALL
	SELECT 'index:' || indexname || ':' || indexdef
	FROM pg_indexes
	WHERE schemaname = 'public'
		AND tablename IN (
			'sv_provider_canary_executions', 'sv_source_snapshots', 'sv_evidence_index',
			'sv_evidence_acceptance_receipts', 'sv_provider_dataset_snapshot_events'
		)
	UNION ALL
	SELECT 'view:' || viewname || ':' || definition
	FROM pg_views
	WHERE schemaname = 'public' AND viewname IN ('sv_evidence_provenance', 'sv_evidence_read_model')
	UNION ALL
	SELECT 'function:' || proname || ':' || pg_get_functiondef(oid)
	FROM pg_proc
	WHERE pronamespace = 'public'::regnamespace
		AND proname IN (
			'sv_reject_provider_canary_execution_mutation', 'sv_enforce_evidence_acceptance_receipt',
			'sv_reject_evidence_acceptance_mutation', 'sv_resolve_api_key_context',
			'sv_enforce_provider_dataset_snapshot_event_insert'
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
	"${admin[@]}" -d "$database" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0056_formal_evidence_acceptance_hardening.sql" >/dev/null
	variant_fingerprint="$(catalog_fingerprint "$database")"
	if [[ -z "$variant_fingerprint" ]]; then
		printf 'MIGRATION_VARIANT_EMPTY_FINGERPRINT database=%s\n' "$database" >&2
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

if [[ "$full_current" != "$full_release" || "$full_current" != "$short_current" || "$full_current" != "$short_release" ]]; then
	printf 'MIGRATION_VARIANT_CATALOG_DIVERGENCE full_current=%s full_release=%s short_current=%s short_release=%s\n' \
		"$full_current" "$full_release" "$short_current" "$short_release" >&2
	exit 1
fi

printf 'MIGRATION_VARIANT_MATRIX_PASS variants=4 catalog=%s providerCalls=0 cleanup=verified\n' "$full_current"
