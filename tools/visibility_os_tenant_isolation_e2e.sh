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
runtime_password='selena_tenant_isolation_disposable_only'
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
		printf 'TENANT_ISOLATION_RUNTIME_ROLE_CLEANUP_FAILED\n' >&2
		if ((exit_code == 0)); then exit_code=1; fi
	fi
	exit "$exit_code"
}
trap cleanup_on_exit EXIT

for migration in "$repo_root"/packages/lib/src/db/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
	migration_name="${migration##*/}"
	migration_number="${migration_name%%_*}"
	if ((10#$migration_number > 69)); then
		continue
	fi
	"${psql[@]}" --single-transaction < "$migration" >/dev/null
done

"${psql[@]}" <<SQL >/dev/null
CREATE ROLE selena_app LOGIN PASSWORD '$runtime_password' NOSUPERUSER NOBYPASSRLS NOINHERIT;
GRANT USAGE ON SCHEMA public TO selena_app;
GRANT SELECT ON brands, prompt_runs, citations, organization, member TO selena_app;
GRANT SELECT, INSERT ON prompts TO selena_app;
GRANT SELECT ON organization_settings, usage_events, competitors, brand_opportunities,
	prompt_run_hourly_aggregates, invitation, sso_provider TO selena_app;
SQL

"${psql[@]}" <<'SQL' >/dev/null
INSERT INTO public."user" (id, name, email) VALUES
	('tenant-user-a', 'Tenant A', 'tenant-a@example.invalid'),
	('tenant-user-b', 'Tenant B', 'tenant-b@example.invalid');
INSERT INTO public.organization (id, name, slug, created_at) VALUES
	('tenant-org-a', 'Tenant A', 'tenant-org-a', pg_catalog.now()),
	('tenant-org-b', 'Tenant B', 'tenant-org-b', pg_catalog.now());
INSERT INTO public.member (id, organization_id, user_id, role, created_at) VALUES
	('tenant-member-a', 'tenant-org-a', 'tenant-user-a', 'owner', pg_catalog.now()),
	('tenant-member-b', 'tenant-org-b', 'tenant-user-b', 'owner', pg_catalog.now());
INSERT INTO public.brands (id, name, website, organization_id) VALUES
	('tenant-brand-a', 'Brand A', 'https://a.example.invalid', 'tenant-org-a'),
	('tenant-brand-b', 'Brand B', 'https://b.example.invalid', 'tenant-org-b');
INSERT INTO public.prompts (id, brand_id, value) VALUES
	('00000000-0000-4000-8000-00000000000a', 'tenant-brand-a', 'prompt a'),
	('00000000-0000-4000-8000-00000000000b', 'tenant-brand-b', 'prompt b');
INSERT INTO public.prompt_runs (id, prompt_id, brand_id, model, version, web_search_enabled, raw_output, brand_mentioned) VALUES
	('00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000a', 'tenant-brand-a', 'm', 'v', false, '{}', true),
	('00000000-0000-4000-8000-0000000000bb', '00000000-0000-4000-8000-00000000000b', 'tenant-brand-b', 'm', 'v', false, '{}', true);
INSERT INTO public.citations (prompt_run_id, prompt_id, brand_id, model, url, domain, created_at, citation_index) VALUES
	('00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000a', 'tenant-brand-a', 'm', 'https://a.example.invalid/x', 'a.example.invalid', pg_catalog.now(), 0),
	('00000000-0000-4000-8000-0000000000bb', '00000000-0000-4000-8000-00000000000b', 'tenant-brand-b', 'm', 'https://b.example.invalid/x', 'b.example.invalid', pg_catalog.now(), 0);
SQL

# Runs one query as selena_app inside a transaction with the given tenant
# context; an empty value leaves the setting unset.
as_tenant() {
	local organization_id="$1" user_id="$2" query="$3"
	"${runtime_psql[@]}" <<SQL | tail -n 1
BEGIN;
SELECT CASE WHEN '$organization_id' <> '' THEN set_config('app.organization_id', '$organization_id', true) END;
SELECT CASE WHEN '$user_id' <> '' THEN set_config('app.user_id', '$user_id', true) END;
$query;
COMMIT;
SQL
}

expect() {
	local label="$1" expected="$2" actual="$3"
	if [[ "$actual" != "$expected" ]]; then
		printf 'TENANT_ISOLATION_FAILED %s: expected %s, got %s\n' "$label" "$expected" "$actual" >&2
		exit 1
	fi
}

for table in brands organization_settings usage_events prompts competitors brand_opportunities \
	citations prompt_runs prompt_run_hourly_aggregates member organization invitation sso_provider; do
	expect "no context sees no $table" 0 "$(as_tenant '' '' "SELECT count(*) FROM $table")"
done

for table in brands prompts prompt_runs citations; do
	expect "tenant A sees only its $table" 'tenant-brand-a' \
		"$(as_tenant tenant-org-a '' "SELECT string_agg(DISTINCT $([[ $table == brands ]] && echo id || echo brand_id), ',') FROM $table")"
done

expect 'tenant B cannot read tenant A prompt by id' 0 \
	"$(as_tenant tenant-org-b '' "SELECT count(*) FROM prompts WHERE id = '00000000-0000-4000-8000-00000000000a'")"
expect 'tenant B cannot read tenant A brand by id' 0 \
	"$(as_tenant tenant-org-b '' "SELECT count(*) FROM brands WHERE id = 'tenant-brand-a'")"

if as_tenant tenant-org-b '' "INSERT INTO prompts (brand_id, value) VALUES ('tenant-brand-a', 'foreign')" >/dev/null 2>&1; then
	printf 'TENANT_ISOLATION_FAILED tenant B inserted a prompt into tenant A brand\n' >&2
	exit 1
fi
expect 'tenant B inserts into its own brand' 'tenant-brand-b' \
	"$(as_tenant tenant-org-b '' "INSERT INTO prompts (brand_id, value) VALUES ('tenant-brand-b', 'own') RETURNING brand_id")"

expect 'user A sees only own memberships' 'tenant-org-a' \
	"$(as_tenant '' tenant-user-a "SELECT string_agg(organization_id, ',') FROM member")"
expect 'user A sees only own organizations' 'tenant-org-a' \
	"$(as_tenant '' tenant-user-a "SELECT string_agg(id, ',') FROM organization")"

# Policies apply to selena_app only while FORCE stays off, so the table owner
# (today's production connection) keeps full visibility.
expect 'owner still sees every brand' 2 "$("${psql[@]}" -Atc 'SELECT count(*) FROM brands')"
expect 'no tenant table forces RLS yet' 0 "$("${psql[@]}" -Atc "SELECT count(*) FROM pg_class WHERE relname IN ('brands', 'prompts', 'prompt_runs', 'citations', 'member', 'organization') AND relforcerowsecurity")"

printf 'TENANT_ISOLATION_OK\n'
