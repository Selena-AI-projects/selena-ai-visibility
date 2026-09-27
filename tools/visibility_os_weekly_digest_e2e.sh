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
runtime_password='selena_weekly_digest_disposable_only'
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
		printf 'WEEKLY_DIGEST_RUNTIME_ROLE_CLEANUP_FAILED\n' >&2
		if ((exit_code == 0)); then exit_code=1; fi
	fi
	exit "$exit_code"
}
trap cleanup_on_exit EXIT

for migration in "$repo_root"/packages/lib/src/db/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
	migration_name="${migration##*/}"
	migration_number="${migration_name%%_*}"
	if ((10#$migration_number > 77)); then
		continue
	fi
	"${psql[@]}" --single-transaction < "$migration" >/dev/null
done

# Same privileges the runtime role bootstrap grants on these tables.
"${psql[@]}" <<SQL >/dev/null
CREATE ROLE selena_app LOGIN PASSWORD '$runtime_password' NOSUPERUSER NOBYPASSRLS NOINHERIT;
GRANT USAGE ON SCHEMA public TO selena_app;
GRANT SELECT, INSERT, UPDATE ON sv_delivery_connect_tokens, sv_delivery_recipients, sv_digest_deliveries TO selena_app;
GRANT SELECT, INSERT ON sv_weekly_digests, sv_digest_delivery_attempts TO selena_app;
SQL

"${psql[@]}" <<'SQL' >/dev/null
INSERT INTO public."user" (id, name, email) VALUES ('dg-owner-a','A','dg-a@example.invalid'),('dg-owner-b','B','dg-b@example.invalid');
INSERT INTO public.organization (id, name, slug, created_at) VALUES ('dg-org-a','A','dg-org-a',now()),('dg-org-b','B','dg-org-b',now());
DO $f$
DECLARE org text; p uuid; l uuid; q uuid; o uuid; i int;
BEGIN
	FOREACH org IN ARRAY ARRAY['dg-org-a','dg-org-b'] LOOP
		INSERT INTO sv_projects (id, organization_id, name, category, country)
		VALUES (CASE org WHEN 'dg-org-a' THEN '00000000-0000-4000-8000-00000000000a'::uuid ELSE '00000000-0000-4000-8000-00000000000b'::uuid END, org, 'Digest '||org, 'test', 'ID')
		RETURNING id INTO p;
		INSERT INTO sv_configuration_locks (organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by)
		VALUES (org, p, 1, '{}'::jsonb, 'digest-stub', 1, 0, 'digest-stub') RETURNING id INTO l;
		INSERT INTO sv_quotes (organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at)
		VALUES (org, p, l, 'ISSUED', 0, 'USD', 1, now() + interval '1 day') RETURNING id INTO q;
		INSERT INTO sv_orders (organization_id, project_id, quote_id, lock_id, status, order_cap)
		VALUES (org, p, q, l, 'APPROVED', 0) RETURNING id INTO o;
		FOR i IN 1..2 LOOP
			INSERT INTO sv_cycles (id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs)
			VALUES (('00000000-0000-4000-8000-0000000000' || CASE org WHEN 'dg-org-a' THEN 'a' ELSE 'b' END || i)::uuid, org, o, l, 'READY', 1, 1, 1);
		END LOOP;
	END LOOP;
END; $f$;
SQL

project_a='00000000-0000-4000-8000-00000000000a'
cycle_a1='00000000-0000-4000-8000-0000000000a1'
cycle_a2='00000000-0000-4000-8000-0000000000a2'
cycle_b1='00000000-0000-4000-8000-0000000000b1'

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
		printf 'WEEKLY_DIGEST_FAILED %s: expected %s, got %s\n' "$label" "$expected" "$actual" >&2
		exit 1
	fi
}

expect_error() {
	local label="$1" expected="$2" actual="$3"
	if [[ "$actual" != FAILED* || "$actual" != *"$expected"* ]]; then
		printf 'WEEKLY_DIGEST_FAILED %s: expected error %s, got %s\n' "$label" "$expected" "$actual" >&2
		exit 1
	fi
}

# One digest for $cycle in tenant A's project; $hash_override replaces the content hash.
digest_insert() {
	local cycle="$1" period="$2" hash_override="${3:-}"
	cat <<SQL
WITH content AS (SELECT jsonb_build_object('mentionedIn', 3, 'changes', jsonb_build_array())::text AS canonical)
INSERT INTO sv_weekly_digests (organization_id, project_id, cycle_id, period_start, period_end, content_json, content_canonical, content_sha256)
SELECT 'dg-org-a', '$project_a', '$cycle', '$period'::timestamptz, '$period'::timestamptz + interval '7 days', canonical::jsonb, canonical,
	coalesce(nullif('$hash_override', ''), 'sha256:' || encode(sha256(convert_to(canonical, 'UTF8')), 'hex'))
FROM content
RETURNING id
SQL
}

digest_id="$(as_tenant dg-org-a dg-owner-a "$(digest_insert "$cycle_a1" 2026-09-21)")"
if [[ ! "$digest_id" =~ ^[0-9a-f-]{36}$ ]]; then
	printf 'WEEKLY_DIGEST_FAILED a digest for the tenant own cycle is saved: got %s\n' "$digest_id" >&2
	exit 1
fi
expect_error 'a digest cannot point at another tenant cycle' 'foreign key' \
	"$(as_tenant dg-org-a dg-owner-a "$(digest_insert "$cycle_b1" 2026-09-28)")"
expect_error 'a digest whose hash does not match its content is refused' 'check constraint' \
	"$(as_tenant dg-org-a dg-owner-a "$(digest_insert "$cycle_a2" 2026-09-28 "sha256:$(printf '0%.0s' {1..64})")")"
expect_error 'a project gets one digest per week' 'duplicate key' \
	"$(as_tenant dg-org-a dg-owner-a "$(digest_insert "$cycle_a2" 2026-09-21)")"
expect_error 'a digest cannot be written into another tenant' 'row-level security' \
	"$(as_tenant dg-org-b dg-owner-b "$(digest_insert "$cycle_a2" 2026-10-05)")"
expect 'tenant B sees no tenant A digest' 0 \
	"$(as_tenant dg-org-b dg-owner-b "SELECT count(*) FROM sv_weekly_digests")"
expect_error 'the runtime role cannot rewrite a digest' 'permission denied' \
	"$(as_tenant dg-org-a dg-owner-a "UPDATE sv_weekly_digests SET period_end = period_end WHERE id = '$digest_id'")"
if owner_update="$("${psql[@]}" -c "SET app.organization_id = 'dg-org-a'" -c "UPDATE sv_weekly_digests SET period_end = period_end WHERE id = '$digest_id'" 2>&1)" \
	|| [[ "$owner_update" != *DIGEST_APPEND_ONLY* ]]; then
	printf 'WEEKLY_DIGEST_FAILED even the table owner cannot rewrite a digest: got %s\n' "$owner_update" >&2
	exit 1
fi

recipient_id="$(as_tenant dg-org-a dg-owner-a "INSERT INTO sv_delivery_recipients (organization_id, project_id, chat_id_ciphertext, bound_by) VALUES ('dg-org-a', '$project_a', 'ciphertext', 'dg-owner-a') RETURNING id")"
expect_error 'a project has one bound Telegram chat' 'duplicate key' \
	"$(as_tenant dg-org-a dg-owner-a "INSERT INTO sv_delivery_recipients (organization_id, project_id, chat_id_ciphertext, bound_by) VALUES ('dg-org-a', '$project_a', 'other', 'dg-owner-a')")"
delivery_id="$(as_tenant dg-org-a dg-owner-a "INSERT INTO sv_digest_deliveries (organization_id, digest_id, recipient_id) VALUES ('dg-org-a', '$digest_id', '$recipient_id') RETURNING id")"
for attempt in 1 2 3 4 5; do
	as_tenant dg-org-a dg-owner-a "INSERT INTO sv_digest_delivery_attempts (organization_id, delivery_id, attempt, outcome) VALUES ('dg-org-a', '$delivery_id', $attempt, 'TEMPORARY_FAILURE')" >/dev/null
done
expect_error 'a sixth send cannot be recorded' 'check constraint' \
	"$(as_tenant dg-org-a dg-owner-a "INSERT INTO sv_digest_delivery_attempts (organization_id, delivery_id, attempt, outcome) VALUES ('dg-org-a', '$delivery_id', 6, 'TEMPORARY_FAILURE')")"
expect_error 'a delivery cannot be claimed as sending without a claim time' 'check constraint' \
	"$(as_tenant dg-org-a dg-owner-a "UPDATE sv_digest_deliveries SET status = 'SENDING' WHERE id = '$delivery_id'")"
expect 'tenant B sees no tenant A recipient' 0 \
	"$(as_tenant dg-org-b dg-owner-b "SELECT count(*) FROM sv_delivery_recipients")"

printf 'WEEKLY_DIGEST_E2E_OK\n'
