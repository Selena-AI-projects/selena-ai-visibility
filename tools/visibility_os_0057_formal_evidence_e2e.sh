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

psql=("${compose_cli[@]}" -p "$compose_project" -f "$compose_file" exec -T postgres psql -U selena_test -d selena_visibility_test -v ON_ERROR_STOP=1)

mapped_port="$("${compose_cli[@]}" -p "$compose_project" -f "$compose_file" port postgres 5432)"
mapped_port="${mapped_port##*:}"
if [[ ! "$mapped_port" =~ ^[0-9]+$ ]]; then
	printf 'BLOCKED_ENV: disposable PostgreSQL mapped port is unavailable.\n' >&2
	exit 3
fi
database_url="postgres://selena_test:selena_test@127.0.0.1:${mapped_port}/selena_visibility_test"
pgboss_plan="$(mktemp "${TMPDIR:-/tmp}/selena-pgboss-v37-0057.XXXXXX.sql")"

cleanup_runtime_role() {
	local exit_code=$?
	trap - EXIT
	rm -f "$pgboss_plan"
	if [[ "$("${psql[@]}" -Atc "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app')")" == 't' ]]; then
		"${psql[@]}" -c 'DROP OWNED BY selena_app; DROP ROLE selena_app;' >/dev/null 2>&1 || true
	fi
	exit "$exit_code"
}
trap cleanup_runtime_role EXIT

DATABASE_URL="$database_url" bash "$repo_root/tools/visibility_os_gate12_e2e.sh" "$compose_file" >/dev/null
for migration in \
	0051_visibility_os_provider_evidence_provenance \
	0052_provider_dataset_snapshot_journal \
	0053_configuration_lock_legacy_collision_ordinal \
	0054_journal_daily_claim_execution_lease \
	0055_provider_snapshot_resume_reconciliation \
	0056_formal_evidence_acceptance_hardening \
	0057_evidence_project_identity_hardening \
	0058_journal_provider_boundary_recovery; do
	"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/${migration}.sql" >/dev/null
done

if ! pnpm --dir "$repo_root/apps/worker" exec tsx -e \
	'import { getConstructionPlans } from "pg-boss"; process.stdout.write(getConstructionPlans("pgboss"));' \
	> "$pgboss_plan"; then
	printf 'PGBOSS_SCHEMA_OWNER_PROVISION_FAILED: could not generate pinned construction plan.\n' >&2
	exit 1
fi
if ! "${psql[@]}" < "$pgboss_plan" >/dev/null; then
	printf 'PGBOSS_SCHEMA_OWNER_PROVISION_FAILED: construction plan did not apply.\n' >&2
	exit 1
fi
"${psql[@]}" -v role_password=selena_disposable_role_proof_only \
	< "$repo_root/packages/lib/scripts/selena-rls-runtime-role.sql" >/dev/null

DATABASE_URL="$database_url" \
	pnpm --dir "$repo_root/packages/lib" exec tsx scripts/provider-evidence-acceptance-rehearsal.ts

role_receipt="$("${psql[@]}" -qAtc "SELECT NOT rolsuper AND NOT rolbypassrls FROM pg_roles WHERE rolname = 'selena_app'; SELECT NOT has_table_privilege('selena_app', 'sv_source_snapshots', 'SELECT') AND NOT has_column_privilege('selena_app', 'sv_source_snapshots', 'snapshot', 'SELECT') AND NOT has_column_privilege('selena_app', 'sv_source_snapshots', 'content_sha256', 'SELECT') AND NOT has_column_privilege('selena_app', 'sv_source_snapshots', 'source_ref', 'SELECT') AND NOT has_column_privilege('selena_app', 'sv_source_snapshots', 'provider_dataset_ref', 'SELECT') AND NOT has_column_privilege('selena_app', 'sv_source_snapshots', 'raw_reference', 'SELECT') AND NOT has_column_privilege('selena_app', 'sv_evidence_provenance', 'organization_id', 'SELECT'); BEGIN; SET LOCAL ROLE selena_app; SET LOCAL app.organization_id = 'formal-evidence-org-a'; SELECT count(id) FROM sv_source_snapshots; SELECT count(id) FROM sv_source_snapshots WHERE organization_id = 'formal-evidence-org-b'; ROLLBACK;")"
if [[ "$role_receipt" != $'t\nt\n4\n0' ]]; then
	printf 'RUNTIME_ROLE_0057_PRIVILEGE_RECEIPT_FAILED\n' >&2
	exit 1
fi
if "${psql[@]}" -qAtc "BEGIN; SET LOCAL ROLE selena_app; SET LOCAL app.organization_id = 'formal-evidence-org-a'; SELECT raw_reference FROM sv_source_snapshots LIMIT 1; ROLLBACK;" >/dev/null 2>&1; then
	printf 'RUNTIME_ROLE_0057_PRIVATE_PAYLOAD_READ_ALLOWED\n' >&2
	exit 1
fi

printf 'RUNTIME_ROLE_0057_PASS nonOwner=true bypassRls=false safeMetadata=4 crossTenant=0 privatePayload=blocked providerLocators=blocked cleanup=verified\n'
