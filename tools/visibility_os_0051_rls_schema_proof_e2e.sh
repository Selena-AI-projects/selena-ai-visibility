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
pgboss_plan=''

cleanup_runtime_role() {
	local role_exists
	role_exists="$("${psql[@]}" -Atc "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app')")"
	if [[ "$role_exists" == "t" ]]; then
		"${psql[@]}" -c 'DROP OWNED BY selena_app; DROP ROLE selena_app;' >/dev/null
	fi
}

cleanup_on_exit() {
	local exit_code=$?
	trap - EXIT
	if [[ -n "$pgboss_plan" && -f "$pgboss_plan" ]]; then
		rm -f "$pgboss_plan"
	fi
	if ! cleanup_runtime_role; then
		printf 'RLS_SCHEMA_PROOF_RUNTIME_ROLE_CLEANUP_FAILED\n' >&2
		if ((exit_code == 0)); then exit_code=1; fi
	fi
	exit "$exit_code"
}
trap cleanup_on_exit EXIT

# Gate 12 creates the complete disposable parent graph and applies the ordered
# migration chain through 0050. It makes no external provider call.
bash "$repo_root/tools/visibility_os_gate12_e2e.sh" "$compose_file" >/dev/null
"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0051_visibility_os_provider_evidence_provenance.sql" >/dev/null

# Generate the owner-managed schema from the pinned pg-boss package instead of
# maintaining a second hand-written copy. The construction plan is applied by
# the disposable database owner before selena_app exists or receives grants.
pgboss_plan="$(mktemp "${TMPDIR:-/tmp}/selena-pgboss-v37.XXXXXX.sql")"
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
"${psql[@]}" < "$repo_root/tools/visibility_os_0051_rls_schema_proof.sql"
cleanup_runtime_role

if [[ "$("${psql[@]}" -Atc "SELECT to_regclass('public.sv_provider_dataset_capabilities') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') AND NOT EXISTS (SELECT 1 FROM organization WHERE id IN ('rls-schema-proof-org-a', 'rls-schema-proof-org-b'))")" != "t" ]]; then
	printf 'RLS_SCHEMA_PROOF_ROLLBACK_RECEIPT_FAILED\n' >&2
	exit 1
fi

printf 'RLS_SCHEMA_PROOF_DISPOSABLE_PASS migration=0051 runtime_role=validated cleanup=verified\n'
