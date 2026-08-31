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

# Gate 12 creates the complete disposable parent graph and applies the ordered
# migration chain through 0050. It makes no external provider call.
bash "$repo_root/tools/visibility_os_gate12_e2e.sh" "$compose_file" >/dev/null
"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0051_visibility_os_provider_evidence_provenance.sql" >/dev/null
"${psql[@]}" < "$repo_root/tools/visibility_os_0051_rls_schema_proof.sql"

if [[ "$("${psql[@]}" -Atc "SELECT to_regclass('public.sv_provider_dataset_capabilities') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_rls_schema_probe') AND NOT EXISTS (SELECT 1 FROM organization WHERE id IN ('rls-schema-proof-org-a', 'rls-schema-proof-org-b'))")" != "t" ]]; then
	printf 'RLS_SCHEMA_PROOF_ROLLBACK_RECEIPT_FAILED\n' >&2
	exit 1
fi

printf 'RLS_SCHEMA_PROOF_DISPOSABLE_PASS migration=0051 rollback=verified\n'
