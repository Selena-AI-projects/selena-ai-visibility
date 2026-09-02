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

# FORCE RLS must never hide legacy rows from the migration preflight. A direct
# non-bypass table owner is rejected before 0056 creates any object.
"${psql[@]}" -c "CREATE ROLE selena_non_bypass_owner NOSUPERUSER NOBYPASSRLS NOLOGIN; ALTER TABLE sv_evidence_acceptance_receipts OWNER TO selena_non_bypass_owner; ALTER TABLE sv_audit_events OWNER TO selena_non_bypass_owner;" >/dev/null
non_bypass_output=''
if non_bypass_output="$(
	{
		printf 'BEGIN;\nSET ROLE selena_non_bypass_owner;\n'
		sed -n '1,$p' "$repo_root/packages/lib/src/db/migrations/0056_formal_evidence_acceptance_hardening.sql"
		printf '\nCOMMIT;\n'
	} | "${psql[@]}" 2>&1
)"; then
	printf 'RLS_SCHEMA_PROOF_NON_BYPASS_MIGRATION_ALLOWED\n' >&2
	exit 1
fi
if [[ "$non_bypass_output" != *"EVIDENCE_ACCEPTANCE_MIGRATION_OWNER_BYPASS_REQUIRED"* ]]; then
	printf 'RLS_SCHEMA_PROOF_NON_BYPASS_MIGRATION_WRONG_FAILURE: %s\n' "$non_bypass_output" >&2
	exit 1
fi
if [[ "$("${psql[@]}" -Atc "SELECT to_regprocedure('public.sv_enforce_provider_capability_insert_scope()') IS NULL")" != "t" ]]; then
	printf 'RLS_SCHEMA_PROOF_NON_BYPASS_MIGRATION_RESIDUE\n' >&2
	exit 1
fi
"${psql[@]}" -c "ALTER TABLE sv_evidence_acceptance_receipts OWNER TO selena_test; ALTER TABLE sv_audit_events OWNER TO selena_test; DROP ROLE selena_non_bypass_owner;" >/dev/null

# Upgrade safety is fail-closed: legacy formal acceptance state must be reviewed
# explicitly rather than silently grandfathered into the hardened contract.
"${psql[@]}" -c "INSERT INTO organization (id, name, slug, created_at) VALUES ('rls-schema-proof-legacy-upgrade', 'RLS legacy upgrade proof', 'rls-schema-proof-legacy-upgrade', now()); INSERT INTO sv_audit_events (organization_id, actor_id, event, subject_kind, subject_id, details) VALUES ('rls-schema-proof-legacy-upgrade', 'legacy-proof', 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED', 'evidence', 'legacy-evidence', '{}'::jsonb);" >/dev/null
legacy_upgrade_output=''
if legacy_upgrade_output="$("${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0056_formal_evidence_acceptance_hardening.sql" 2>&1)"; then
	printf 'RLS_SCHEMA_PROOF_LEGACY_ACCEPTANCE_UPGRADE_ALLOWED\n' >&2
	exit 1
fi
if [[ "$legacy_upgrade_output" != *"EVIDENCE_ACCEPTANCE_LEGACY_REVIEW_REQUIRED"* ]]; then
	printf 'RLS_SCHEMA_PROOF_LEGACY_ACCEPTANCE_WRONG_FAILURE\n' >&2
	exit 1
fi
if [[ "$("${psql[@]}" -Atc "SELECT to_regprocedure('public.sv_require_owner_evidence_acceptance_insert()') IS NULL")" != "t" ]]; then
	printf 'RLS_SCHEMA_PROOF_LEGACY_ACCEPTANCE_MIGRATION_RESIDUE\n' >&2
	exit 1
fi
"${psql[@]}" -c "DELETE FROM sv_audit_events WHERE organization_id = 'rls-schema-proof-legacy-upgrade'; DELETE FROM organization WHERE id = 'rls-schema-proof-legacy-upgrade';" >/dev/null
"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0056_formal_evidence_acceptance_hardening.sql" >/dev/null

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

printf 'RLS_SCHEMA_PROOF_DISPOSABLE_PASS migrations=0051,0056 runtime_role=validated cleanup=verified\n'
