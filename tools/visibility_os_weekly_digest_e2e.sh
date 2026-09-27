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
	if ((10#$migration_number > 78)); then
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
GRANT EXECUTE ON FUNCTION sv_redeem_delivery_connect_token(text, text) TO selena_app;
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

# Runs SQL as selena_app with no tenant context, the way the Telegram webhook
# reaches the database.
as_runtime() {
	local query="$1" output
	if output="$("${runtime_psql[@]}" -c "$query" 2>&1)"; then
		printf '%s\n' "$output" | tail -n 1
	else
		printf 'FAILED %s\n' "$output"
	fi
}
token_hash() { printf '%s' "$1" | sha256sum | cut -d' ' -f1; }
redeem() { as_runtime "SELECT sv_redeem_delivery_connect_token('$1', '$2')"; }
connect_token_insert() {
	local hash="$1" locale="$2" created="$3" expires="$4"
	printf "INSERT INTO sv_delivery_connect_tokens (organization_id, project_id, user_id, token_hash, locale, created_at, expires_at) VALUES ('dg-org-a', '%s', 'dg-owner-a', '%s', '%s', %s, %s) RETURNING id" \
		"$project_a" "$hash" "$locale" "$created" "$expires"
}
fresh_hash="$(token_hash connect-fresh)"
expired_hash="$(token_hash connect-expired)"
second_hash="$(token_hash connect-second)"
as_tenant dg-org-a dg-owner-a "$(connect_token_insert "$fresh_hash" en 'now()' "now() + interval '15 minutes'")" >/dev/null
as_tenant dg-org-a dg-owner-a "$(connect_token_insert "$expired_hash" ru "now() - interval '1 hour'" "now() - interval '45 minutes'")" >/dev/null
as_tenant dg-org-a dg-owner-a "$(connect_token_insert "$second_hash" ru 'now()' "now() + interval '15 minutes'")" >/dev/null

expect 'the runtime role cannot read connect links without a workspace' 0 \
	"$(as_runtime "SELECT count(*) FROM sv_delivery_connect_tokens")"
expect 'another workspace cannot read the connect links' 0 \
	"$(as_tenant dg-org-b dg-owner-b "SELECT count(*) FROM sv_delivery_connect_tokens")"
"${psql[@]}" -c 'CREATE ROLE selena_digest_probe NOLOGIN' >/dev/null
probe_can_redeem="$("${psql[@]}" -Atc "SELECT has_function_privilege('selena_digest_probe', 'sv_redeem_delivery_connect_token(text, text)', 'EXECUTE')")"
"${psql[@]}" -c 'DROP ROLE selena_digest_probe' >/dev/null
expect 'an arbitrary role cannot redeem a connect link' f "$probe_can_redeem"

expect 'a fresh link binds the chat without a workspace context' BOUND "$(redeem "$fresh_hash" cipher-fresh)"
expect 'the binding carries the language chosen with the link' 'en|cipher-fresh|dg-owner-a' \
	"$(as_tenant dg-org-a dg-owner-a "SELECT locale || '|' || chat_id_ciphertext || '|' || bound_by FROM sv_delivery_recipients WHERE project_id = '$project_a' AND status = 'BOUND'")"
expect 'the chat bound earlier is retired, not kept as a second destination' 'UNBOUND|REPLACED_BY_NEW_BINDING' \
	"$(as_tenant dg-org-a dg-owner-a "SELECT status || '|' || unbound_reason FROM sv_delivery_recipients WHERE id = '$recipient_id'")"
expect 'a link works once' ALREADY_USED "$(redeem "$fresh_hash" cipher-again)"
expect 'an expired link binds nothing' EXPIRED "$(redeem "$expired_hash" cipher-expired)"
expect 'an unknown link binds nothing' UNKNOWN "$(redeem "$(token_hash never-issued)" cipher-unknown)"
expect 'a malformed hash binds nothing' UNKNOWN "$(redeem not-a-hash cipher-unknown)"
expect_error 'a binding needs a chat' DELIVERY_CHAT_REQUIRED "$(redeem "$second_hash" '')"
expect 'a second link for the project binds the new chat' BOUND "$(redeem "$second_hash" cipher-second)"
expect 'the project keeps exactly one bound chat, the newest' '1|cipher-second|ru' \
	"$(as_tenant dg-org-a dg-owner-a "SELECT count(*) || '|' || max(chat_id_ciphertext) || '|' || max(locale) FROM sv_delivery_recipients WHERE project_id = '$project_a' AND status = 'BOUND'")"
expect 'failed redemptions leave no recipient behind' 3 \
	"$(as_tenant dg-org-a dg-owner-a "SELECT count(*) FROM sv_delivery_recipients WHERE project_id = '$project_a'")"
expect 'another workspace sees none of the bindings' 0 \
	"$(as_tenant dg-org-b dg-owner-b "SELECT count(*) FROM sv_delivery_recipients")"

# Two links for one project redeemed at the same time: the later one must wait
# for the earlier binding and retire it, not fail on the one-chat index.
race_first_hash="$(token_hash connect-race-first)"
race_second_hash="$(token_hash connect-race-second)"
as_tenant dg-org-a dg-owner-a "$(connect_token_insert "$race_first_hash" ru 'now()' "now() + interval '15 minutes'")" >/dev/null
as_tenant dg-org-a dg-owner-a "$(connect_token_insert "$race_second_hash" ru 'now()' "now() + interval '15 minutes'")" >/dev/null
race_first_output="$(mktemp)"
"${runtime_psql[@]}" >"$race_first_output" 2>&1 <<SQL &
BEGIN;
SELECT sv_redeem_delivery_connect_token('$race_first_hash', 'cipher-race-first');
SELECT pg_sleep(2);
COMMIT;
SQL
race_first_pid=$!
# Waits until the first redemption has bound its chat and sits uncommitted.
race_first_waiting="SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query LIKE 'SELECT pg_sleep(2)%'"
for _ in $(seq 1 50); do
	if [[ "$("${psql[@]}" -Atc "$race_first_waiting")" != 0 ]]; then
		break
	fi
	sleep 0.1
done
expect 'the first concurrent redemption is still open' 1 "$("${psql[@]}" -Atc "$race_first_waiting")"
race_second="$(redeem "$race_second_hash" cipher-race-second)"
wait "$race_first_pid"
race_first="$(grep -x -E 'BOUND|ALREADY_USED|EXPIRED|UNKNOWN' "$race_first_output" || true)"
rm -f "$race_first_output"
expect 'the first of two concurrent links binds' BOUND "$race_first"
expect 'the second of two concurrent links binds after it' BOUND "$race_second"
expect 'concurrent links leave exactly one bound chat, the later one' '1|cipher-race-second' \
	"$(as_tenant dg-org-a dg-owner-a "SELECT count(*) || '|' || max(chat_id_ciphertext) FROM sv_delivery_recipients WHERE project_id = '$project_a' AND status = 'BOUND'")"

printf 'WEEKLY_DIGEST_E2E_OK\n'
