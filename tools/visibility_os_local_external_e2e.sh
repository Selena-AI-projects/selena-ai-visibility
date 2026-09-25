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
runtime_password='selena_local_external_disposable_only'
runtime_psql=("${compose_cli[@]}" -p "$compose_project" -f "$compose_file" exec -T -e "PGPASSWORD=$runtime_password" postgres psql -h 127.0.0.1 -U selena_app -d selena_visibility_test -v ON_ERROR_STOP=1 -Atq)

cleanup_runtime_role() {
	local role_exists
	role_exists="$("${psql[@]}" -Atc "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app')")"
	if [[ "$role_exists" == "t" ]]; then
		"${psql[@]}" -c 'DROP OWNED BY selena_app; DROP ROLE selena_app;' >/dev/null
	fi
}

cleanup_on_exit() {
	local exit_code=$?
	trap - EXIT
	if ! cleanup_runtime_role; then
		printf 'LOCAL_EXTERNAL_RUNTIME_ROLE_CLEANUP_FAILED\n' >&2
		if ((exit_code == 0)); then exit_code=1; fi
	fi
	exit "$exit_code"
}
trap cleanup_on_exit EXIT

for migration in "$repo_root"/packages/lib/src/db/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
	migration_name="${migration##*/}"
	migration_number="${migration_name%%_*}"
	if ((10#$migration_number > 76)); then
		continue
	fi
	"${psql[@]}" --single-transaction < "$migration" >/dev/null
done

# Same privileges the runtime role bootstrap grants on these tables.
"${psql[@]}" <<SQL >/dev/null
CREATE ROLE selena_app LOGIN PASSWORD '$runtime_password' NOSUPERUSER NOBYPASSRLS NOINHERIT;
GRANT USAGE ON SCHEMA public TO selena_app;
GRANT SELECT ON organization, member TO selena_app;
GRANT SELECT, INSERT ON sv_local_external_audits, sv_local_external_tasks, sv_local_external_publications TO selena_app;
GRANT INSERT ON sv_local_external_raw_evidence TO selena_app;
GRANT UPDATE (raw_body, raw_deleted_at) ON sv_local_external_raw_evidence TO selena_app;
GRANT SELECT (provider_task_id, organization_id, audit_id, raw_sha256, captured_at, retention_expires_at, raw_deleted_at)
	ON sv_local_external_raw_evidence TO selena_app;
SQL

"${psql[@]}" <<'SQL' >/dev/null
INSERT INTO public."user" (id, name, email) VALUES
	('ext-owner-a', 'Owner A', 'ext-owner-a@example.invalid'),
	('ext-viewer-a', 'Viewer A', 'ext-viewer-a@example.invalid'),
	('ext-owner-b', 'Owner B', 'ext-owner-b@example.invalid');
INSERT INTO public.organization (id, name, slug, created_at) VALUES
	('ext-org-a', 'External A', 'ext-org-a', pg_catalog.now()),
	('ext-org-b', 'External B', 'ext-org-b', pg_catalog.now());
INSERT INTO public.member (id, organization_id, user_id, role, created_at) VALUES
	('ext-member-owner-a', 'ext-org-a', 'ext-owner-a', 'owner', pg_catalog.now()),
	('ext-member-viewer-a', 'ext-org-a', 'ext-viewer-a', 'member', pg_catalog.now()),
	('ext-member-owner-b', 'ext-org-b', 'ext-owner-b', 'owner', pg_catalog.now());
SQL

# One audit row for $org with $count observations; task ids carry $tag so
# separate imports never collide on the global provider task key.
audit_insert() {
	local org="$1" count="$2" tag="$3"
	cat <<SQL
WITH content AS (
	SELECT jsonb_build_object(
		'organizationId', '$org',
		'provenance', 'EXTERNAL_RETAINED_RESPONSE',
		'billingReconciliation', 'NOT_VERIFIED',
		'applicationLedgerImport', 'NOT_APPLIED',
		'observationCount', $count,
		'batches', jsonb_build_array(jsonb_build_object('observations', (
			SELECT jsonb_agg(jsonb_build_object(
				'providerTaskId', '$tag-' || i,
				'rawSha256', 'sha256:' || encode(sha256(convert_to('$tag-body-' || i, 'UTF8')), 'hex'),
				'capturedAt', '2099-01-01T00:00:00Z'))
			FROM generate_series(1, $count) i)))
	)::text AS canonical
)
INSERT INTO sv_local_external_audits (organization_id, actor_id, content_json, content_canonical, content_sha256)
SELECT '$org', current_setting('app.user_id', true), canonical::jsonb, canonical,
	'sha256:' || encode(sha256(convert_to(canonical, 'UTF8')), 'hex')
FROM content
RETURNING id
SQL
}

# Runs SQL as selena_app with the given tenant context. Prints the last row on
# success and the whole error report on failure.
as_tenant() {
	local organization_id="$1" user_id="$2" query="$3" output
	if output="$("${runtime_psql[@]}" 2>&1 <<SQL
BEGIN;
SELECT set_config('app.organization_id', '$organization_id', true);
SELECT set_config('app.user_id', '$user_id', true);
$query;
COMMIT;
SQL
	)"; then
		printf '%s\n' "$output" | tail -n 1
	else
		printf 'FAILED %s\n' "$output"
	fi
}

expect() {
	local label="$1" expected="$2" actual="$3"
	if [[ "$actual" != "$expected" ]]; then
		printf 'LOCAL_EXTERNAL_FAILED %s: expected %s, got %s\n' "$label" "$expected" "$actual" >&2
		exit 1
	fi
}

expect_error() {
	local label="$1" expected="$2" actual="$3"
	if [[ "$actual" != FAILED* || "$actual" != *"$expected"* ]]; then
		printf 'LOCAL_EXTERNAL_FAILED %s: expected error %s, got %s\n' "$label" "$expected" "$actual" >&2
		exit 1
	fi
}

audit_id="$(as_tenant ext-org-a ext-owner-a "$(audit_insert ext-org-a 9 a)")"
if [[ ! "$audit_id" =~ ^[0-9a-f-]{36}$ ]]; then
	printf 'LOCAL_EXTERNAL_FAILED owner imports an audit: got %s\n' "$audit_id" >&2
	exit 1
fi
expect 'the import registers every task' 9 \
	"$(as_tenant ext-org-a ext-owner-a "SELECT count(*) FROM sv_local_external_tasks WHERE audit_id = '$audit_id'")"

expect_error 'a non-admin member cannot import' LOCAL_EXTERNAL_OPERATOR_REQUIRED \
	"$(as_tenant ext-org-a ext-viewer-a "$(audit_insert ext-org-a 9 v)")"
expect_error 'an owner of another tenant cannot import here' LOCAL_EXTERNAL_OPERATOR_REQUIRED \
	"$(as_tenant ext-org-a ext-owner-b "$(audit_insert ext-org-a 9 x)")"
expect_error 'fewer than nine observations are refused' LOCAL_EXTERNAL_TASK_COUNT_INVALID \
	"$(as_tenant ext-org-a ext-owner-a "$(audit_insert ext-org-a 8 s)")"
expect_error 'an audit cannot be written into another tenant' 'row-level security' \
	"$(as_tenant ext-org-b ext-owner-b "$(audit_insert ext-org-a 9 y)")"

expect 'tenant B sees no tenant A audit' 0 \
	"$(as_tenant ext-org-b ext-owner-b "SELECT count(*) FROM sv_local_external_audits")"
expect 'tenant B sees no tenant A task' 0 \
	"$(as_tenant ext-org-b ext-owner-b "SELECT count(*) FROM sv_local_external_tasks")"

expect_error 'the runtime role cannot rewrite an audit' 'permission denied' \
	"$(as_tenant ext-org-a ext-owner-a "UPDATE sv_local_external_audits SET actor_id = 'ext-owner-a' WHERE id = '$audit_id'")"
if owner_update="$("${psql[@]}" -c "SET app.organization_id = 'ext-org-a'" -c "UPDATE sv_local_external_audits SET actor_id = actor_id WHERE id = '$audit_id'" 2>&1)" \
	|| [[ "$owner_update" != *LOCAL_EXTERNAL_IMMUTABLE* ]]; then
	printf 'LOCAL_EXTERNAL_FAILED even the table owner cannot rewrite an audit: got %s\n' "$owner_update" >&2
	exit 1
fi

raw_insert() {
	local body="$1"
	cat <<SQL
INSERT INTO sv_local_external_raw_evidence
	(provider_task_id, organization_id, audit_id, raw_sha256, captured_at, retention_expires_at, raw_body)
VALUES ('a-1', 'ext-org-a', '$audit_id',
	'sha256:' || encode(sha256(convert_to('a-body-1', 'UTF8')), 'hex'),
	'2099-01-01T00:00:00Z', '2099-01-01T00:00:00Z'::timestamptz + interval '720 hours', '$body')
SQL
}
expect_error 'a body that does not match its hash is refused' 'check constraint' \
	"$(as_tenant ext-org-a ext-owner-a "$(raw_insert tampered)")"
as_tenant ext-org-a ext-owner-a "$(raw_insert a-body-1)" >/dev/null
expect 'the retained body is recorded' 1 \
	"$(as_tenant ext-org-a ext-owner-a "SELECT count(*) FROM sv_local_external_raw_evidence WHERE provider_task_id = 'a-1'")"
expect_error 'the runtime role cannot read a retained body back' 'permission denied' \
	"$(as_tenant ext-org-a ext-owner-a "SELECT raw_body FROM sv_local_external_raw_evidence")"

printf 'LOCAL_EXTERNAL_E2E_OK\n'
