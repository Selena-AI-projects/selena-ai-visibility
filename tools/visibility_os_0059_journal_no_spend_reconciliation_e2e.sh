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
runtime_password='selena_0059_disposable_only'
runtime_psql=("${compose_cli[@]}" -p "$compose_project" -f "$compose_file" exec -T -e "PGPASSWORD=$runtime_password" postgres psql -h 127.0.0.1 -U selena_app -d selena_visibility_test -v ON_ERROR_STOP=1)
holder_pid=''
holder_output=''

cleanup_holder() {
	if [[ -n "$holder_pid" ]] && kill -0 "$holder_pid" 2>/dev/null; then
		kill "$holder_pid" 2>/dev/null || true
		wait "$holder_pid" 2>/dev/null || true
	fi
	holder_pid=''
	if [[ -n "$holder_output" && -f "$holder_output" ]]; then
		rm -f "$holder_output"
	fi
	holder_output=''
}

cleanup_runtime_role() {
	local role_exists
	role_exists="$("${psql[@]}" -Atc "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app')")"
	if [[ "$role_exists" == "t" ]]; then
		"${psql[@]}" -c 'DROP OWNED BY selena_app; DROP ROLE selena_app;' >/dev/null
	fi
}

cleanup_fixture() {
	"${psql[@]}" -c 'DROP FUNCTION IF EXISTS public.sv_0059_make_fixture(text, integer, boolean, boolean, boolean, boolean, boolean);' >/dev/null 2>&1
}

cleanup_on_exit() {
	local exit_code=$?
	trap - EXIT
	cleanup_holder
	if ! cleanup_fixture; then
		printf '0059_FIXTURE_CLEANUP_FAILED\n' >&2
		if ((exit_code == 0)); then exit_code=1; fi
	fi
	if ! cleanup_runtime_role; then
		printf '0059_RUNTIME_ROLE_CLEANUP_FAILED\n' >&2
		if ((exit_code == 0)); then exit_code=1; fi
	fi
	exit "$exit_code"
}
trap cleanup_on_exit EXIT

# Build a clean database in the same numeric order as the migration journal.
# This rehearsal invokes SQL only; it does not load provider clients or make
# external network/API requests.
for migration in "$repo_root"/packages/lib/src/db/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
	migration_name="${migration##*/}"
	migration_number="${migration_name%%_*}"
	if ((10#$migration_number > 58)); then
		continue
	fi
	"${psql[@]}" --single-transaction < "$migration" >/dev/null
done

"${psql[@]}" -c "CREATE ROLE selena_app LOGIN PASSWORD '$runtime_password' NOSUPERUSER NOBYPASSRLS NOINHERIT; GRANT USAGE ON SCHEMA public TO selena_app;" >/dev/null
"${psql[@]}" --single-transaction \
	< "$repo_root/packages/lib/src/db/migrations/0059_journal_no_spend_reconciliation.sql" >/dev/null

"${psql[@]}" <<'SQL'
INSERT INTO public.organization (id, name, slug, created_at)
VALUES ('journal-no-spend-0059', 'Journal no-spend 0059', 'journal-no-spend-0059', pg_catalog.now());

CREATE FUNCTION public.sv_0059_make_fixture(
	fixture_label text,
	run_count integer DEFAULT 1,
	permit_active boolean DEFAULT false,
	with_raw_reference boolean DEFAULT false,
	with_run_cost boolean DEFAULT false,
	with_cost_event boolean DEFAULT false,
	with_snapshot_event boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
AS $fixture$
DECLARE
	project_id uuid := pg_catalog.gen_random_uuid();
	claim_id uuid := pg_catalog.gen_random_uuid();
	lock_id uuid := pg_catalog.gen_random_uuid();
	quote_id uuid := pg_catalog.gen_random_uuid();
	order_id uuid := pg_catalog.gen_random_uuid();
	cycle_id uuid := pg_catalog.gen_random_uuid();
	permit_id uuid;
	run_id uuid;
	run_ids uuid[] := ARRAY[]::uuid[];
	permit_ids uuid[] := ARRAY[]::uuid[];
	permit_system_ids text[] := ARRAY[]::text[];
	now_at timestamptz := pg_catalog.clock_timestamp();
	fixture_claimed_at timestamptz := now_at - interval '6 hours';
	utc_day date := ((now_at - interval '6 hours') AT TIME ZONE 'UTC')::date;
	permit_expires_at timestamptz;
	run_started_at timestamptz := now_at - interval '4 hours';
	permit_system_id text;
	i integer;
BEGIN
	INSERT INTO public.sv_projects (
		id, organization_id, name, category, country, languages, status
	) VALUES (
		project_id, 'journal-no-spend-0059', '0059 ' || fixture_label,
		'test', 'ID', ARRAY['en'], 'ACTIVE'
	);
	INSERT INTO public.sv_journal_daily_claims (
		id, organization_id, project_id, question_set_version, utc_day, attempt,
		claimed_at, updated_at
	) VALUES (
		claim_id, 'journal-no-spend-0059', project_id, '0059-' || fixture_label, utc_day, 1,
		fixture_claimed_at, fixture_claimed_at
	);
	INSERT INTO public.sv_configuration_locks (
		id, organization_id, project_id, version, snapshot, engine_sha,
		expected_runs, budget_cap, created_by
	) VALUES (
		lock_id,
		'journal-no-spend-0059',
		project_id,
		1,
		pg_catalog.jsonb_build_object(
			'journalClaim',
			pg_catalog.jsonb_build_object(
				'id', claim_id::text,
				'utcDay', utc_day::text,
				'attempt', '1'
			)
		),
		'0059-fixture',
		run_count,
		0,
		'0059-owner-e2e'
	);
	UPDATE public.sv_journal_daily_claims
	SET configuration_lock_id = lock_id, updated_at = fixture_claimed_at + interval '1 second'
	WHERE id = claim_id;
	INSERT INTO public.sv_quotes (
		id, organization_id, project_id, lock_id, status, price_amount,
		currency, expected_runs, expires_at
	) VALUES (
		quote_id, 'journal-no-spend-0059', project_id, lock_id, 'ISSUED', 0,
		'USD', run_count, now_at + interval '1 day'
	);
	INSERT INTO public.sv_orders (
		id, organization_id, project_id, quote_id, lock_id, status, order_cap
	) VALUES (
		order_id, 'journal-no-spend-0059', project_id, quote_id, lock_id, 'RUNNING', 0
	);
	INSERT INTO public.sv_cycles (
		id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
	) VALUES (
		cycle_id, 'journal-no-spend-0059', order_id, lock_id, 'RUNNING', run_count, run_count, 0
	);

	FOR i IN 1..run_count LOOP
		permit_id := pg_catalog.gen_random_uuid();
		run_id := pg_catalog.gen_random_uuid();
		permit_expires_at := CASE
			WHEN permit_active THEN now_at + interval '1 hour'
			ELSE now_at - interval '2 hours'
		END;
		permit_system_id := (ARRAY['ChatGPT', 'Gemini', 'Perplexity'])[((i - 1) % 3) + 1];
		INSERT INTO public.sv_run_permits (
			id, organization_id, cycle_id, dispatch_key, channel, scenario_id,
			system_id, status, expires_at, consumed_at
		) VALUES (
			permit_id,
			'journal-no-spend-0059',
			cycle_id,
			'0059-' || fixture_label || '-' || i::text,
			'VISITOR',
			'scenario-' || i::text,
			permit_system_id,
			'consumed',
			permit_expires_at,
			run_started_at
		);
		INSERT INTO public.sv_runs (
			id, organization_id, cycle_id, permit_id, dispatch_key, channel,
			scenario_id, system_id, status, cost_usd, raw_response_reference, started_at
		) VALUES (
			run_id,
			'journal-no-spend-0059',
			cycle_id,
			permit_id,
			'0059-' || fixture_label || '-' || i::text,
			'VISITOR',
			'scenario-' || i::text,
			permit_system_id,
			'RUNNING',
			CASE WHEN with_run_cost THEN 0 ELSE NULL END,
			CASE WHEN with_raw_reference THEN 'immutable://unexpected-run-reference' ELSE NULL END,
			run_started_at
		);
		run_ids := pg_catalog.array_append(run_ids, run_id);
		permit_ids := pg_catalog.array_append(permit_ids, permit_id);
		permit_system_ids := pg_catalog.array_append(permit_system_ids, permit_system_id);
	END LOOP;

	IF with_cost_event THEN
		INSERT INTO public.sv_cost_events (
			organization_id, cycle_id, run_id, provider, amount_usd, basis
		) VALUES (
			'journal-no-spend-0059', cycle_id, run_ids[1], 'BRIGHT_DATA', 0, '0059-fixture'
		);
	END IF;
	IF with_snapshot_event THEN
		INSERT INTO public.sv_provider_dataset_snapshot_events (
			organization_id, project_id, provider, source, provider_dataset_id,
			snapshot_id, phase, observed_at, event_hash
		) VALUES (
			'journal-no-spend-0059', project_id, 'bright-data', '0059_FIXTURE', 'dataset-omitted',
			'0059-' || fixture_label, 'TRIGGERED', now_at - interval '2 hours 30 minutes',
			'sha256:' || pg_catalog.encode(
				pg_catalog.sha256(pg_catalog.convert_to(fixture_label, 'UTF8')),
				'hex'
			)
		);
	END IF;

	UPDATE public.sv_journal_daily_claims
	SET status = 'EXECUTING', updated_at = fixture_claimed_at + interval '2 seconds'
	WHERE id = claim_id;
	FOR i IN 1..run_count LOOP
		INSERT INTO public.sv_journal_provider_boundaries (
			organization_id, project_id, journal_claim_id, configuration_lock_id,
			cycle_id, permit_id, run_id, dispatch_key, channel, system_id
		) VALUES (
			'journal-no-spend-0059', project_id, claim_id, lock_id,
			cycle_id, permit_ids[i], run_ids[i],
			'0059-' || fixture_label || '-' || i::text, 'VISITOR', permit_system_ids[i]
		);
	END LOOP;
	SELECT coalesce(pg_catalog.array_agg(value ORDER BY value), ARRAY[]::uuid[])
	INTO run_ids
	FROM pg_catalog.unnest(run_ids) AS item(value);
	UPDATE public.sv_journal_daily_claims
	SET status = 'HOLD', updated_at = now_at - interval '1 hour'
	WHERE id = claim_id;

	RETURN pg_catalog.jsonb_build_object(
		'project_id', project_id,
		'claim_id', claim_id,
		'lock_id', lock_id,
		'cycle_id', cycle_id,
		'permit_id', permit_id,
		'run_ids', pg_catalog.to_jsonb(run_ids),
		'run_started_at', run_started_at,
		'permit_expires_at', permit_expires_at,
		'window_start', now_at - interval '5 hours',
		'window_end', now_at - interval '1 hour',
		'quiesced_at', now_at - interval '3 hours',
		'billing_final_at', now_at - interval '30 minutes',
		'artifact_reference', 'immutable://0059/' || fixture_label
	);
END;
$fixture$;

DO $proof$
DECLARE
	primary_fixture jsonb;
	abandon_fixture jsonb;
	zero_run_fixture jsonb;
	active_fixture jsonb;
	raw_fixture jsonb;
	run_cost_fixture jsonb;
	cost_event_fixture jsonb;
	snapshot_fixture jsonb;
	mixed_fixture jsonb;
	primary_run_ids uuid[];
	test_run_ids uuid[];
	mixed_run_ids uuid[];
	extra_run_id uuid;
	receipt record;
	replay_receipt record;
	blocked boolean;
	expected_error text;
	new_claim_id uuid;
	new_lock_id uuid;
	new_quote_id uuid;
	new_order_id uuid;
	new_cycle_id uuid;
	new_permit_id uuid;
	new_run_id uuid;
	primary_project_id uuid;
	primary_claim_id uuid;
BEGIN
	primary_fixture := public.sv_0059_make_fixture('primary', 3);
	abandon_fixture := public.sv_0059_make_fixture('abandon-run', 1);
	zero_run_fixture := public.sv_0059_make_fixture('abandon-zero', 0);
	active_fixture := public.sv_0059_make_fixture('active-permit', 1, true);
	raw_fixture := public.sv_0059_make_fixture('raw-reference', 1, false, true);
	run_cost_fixture := public.sv_0059_make_fixture('run-cost', 1, false, false, true);
	cost_event_fixture := public.sv_0059_make_fixture('cost-event', 1, false, false, false, true);
	snapshot_fixture := public.sv_0059_make_fixture('snapshot-event', 1, false, false, false, false, true);
	mixed_fixture := public.sv_0059_make_fixture('mixed-provider-scope', 1);
	INSERT INTO public.sv_run_permits (
		organization_id, cycle_id, dispatch_key, channel, scenario_id,
		system_id, status, expires_at, consumed_at
	) VALUES (
		'journal-no-spend-0059',
		(mixed_fixture->>'cycle_id')::uuid,
		'0059-mixed-provider-scope-api-unconsumed',
		'API',
		'mixed-api-scenario',
		'OpenRouter',
		'issued',
		pg_catalog.clock_timestamp() - interval '2 hours',
		NULL
	);

	SELECT pg_catalog.array_agg(value::uuid ORDER BY value::uuid)
	INTO primary_run_ids
	FROM pg_catalog.jsonb_array_elements_text(primary_fixture->'run_ids') AS item(value);
	primary_project_id := (primary_fixture->>'project_id')::uuid;
	primary_claim_id := (primary_fixture->>'claim_id')::uuid;
	SELECT pg_catalog.array_agg(value::uuid ORDER BY value::uuid)
	INTO mixed_run_ids
	FROM pg_catalog.jsonb_array_elements_text(mixed_fixture->'run_ids') AS item(value);

	blocked := false;
	BEGIN
		UPDATE public.sv_journal_daily_claims
		SET status = 'NO_SPEND', updated_at = pg_catalog.clock_timestamp()
		WHERE id = primary_claim_id;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_DAILY_CLAIM_NO_SPEND_CERTIFICATE_REQUIRED' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 HOLD became NO_SPEND without certificate'; END IF;

	blocked := false;
	BEGIN
		UPDATE public.sv_journal_daily_claims
		SET status = 'ABANDONED', abandoned_at = pg_catalog.clock_timestamp(), updated_at = pg_catalog.clock_timestamp()
		WHERE id = (abandon_fixture->>'claim_id')::uuid;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 run-backed HOLD was abandoned'; END IF;

	blocked := false;
	BEGIN
		UPDATE public.sv_journal_daily_claims
		SET status = 'ABANDONED', abandoned_at = pg_catalog.clock_timestamp(), updated_at = pg_catalog.clock_timestamp()
		WHERE id = (zero_run_fixture->>'claim_id')::uuid;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 zero-run HOLD was abandoned'; END IF;

	PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
		(zero_run_fixture->>'claim_id')::uuid, ARRAY[]::uuid[], 'BRIGHT_DATA',
		'sha256:' || pg_catalog.repeat('c', 64), ARRAY['dataset-alone'],
		(zero_run_fixture->>'window_start')::timestamptz, (zero_run_fixture->>'window_end')::timestamptz,
		(zero_run_fixture->>'quiesced_at')::timestamptz, (zero_run_fixture->>'billing_final_at')::timestamptz,
		zero_run_fixture->>'artifact_reference', 'sha256:' || pg_catalog.repeat('d', 64)
	);
	IF NOT EXISTS (
		SELECT 1 FROM public.sv_journal_daily_claims
		WHERE id = (zero_run_fixture->>'claim_id')::uuid AND status = 'NO_SPEND'
	) THEN
		RAISE EXCEPTION '0059 zero-run HOLD did not reconcile to NO_SPEND';
	END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, primary_run_ids, 'brightdata', 'sha256:' || pg_catalog.repeat('a', 64),
			ARRAY['dataset-a', 'dataset-b'], (primary_fixture->>'window_start')::timestamptz,
			(primary_fixture->>'window_end')::timestamptz, (primary_fixture->>'quiesced_at')::timestamptz,
			(primary_fixture->>'billing_final_at')::timestamptz, primary_fixture->>'artifact_reference',
			'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_PROVIDER_SCOPE_UNSUPPORTED' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 noncanonical provider accepted'; END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			(mixed_fixture->>'claim_id')::uuid, mixed_run_ids, 'BRIGHT_DATA',
			'sha256:' || pg_catalog.repeat('a', 64), ARRAY['dataset-a', 'dataset-b'],
			(mixed_fixture->>'window_start')::timestamptz, (mixed_fixture->>'window_end')::timestamptz,
			(mixed_fixture->>'quiesced_at')::timestamptz, (mixed_fixture->>'billing_final_at')::timestamptz,
			mixed_fixture->>'artifact_reference', 'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_PROVIDER_SCOPE_UNSUPPORTED' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 mixed or API permit graph accepted'; END IF;
	IF NOT EXISTS (
		SELECT 1 FROM public.sv_journal_daily_claims
		WHERE id = (mixed_fixture->>'claim_id')::uuid AND status = 'HOLD'
	) OR EXISTS (
		SELECT 1 FROM public.sv_journal_no_spend_reconciliations
		WHERE claim_id = (mixed_fixture->>'claim_id')::uuid
	) THEN
		RAISE EXCEPTION '0059 unsupported provider graph did not remain HOLD';
	END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, ARRAY[primary_run_ids[1]], 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
			ARRAY['dataset-a', 'dataset-b'], (primary_fixture->>'window_start')::timestamptz,
			(primary_fixture->>'window_end')::timestamptz, (primary_fixture->>'quiesced_at')::timestamptz,
			(primary_fixture->>'billing_final_at')::timestamptz, primary_fixture->>'artifact_reference',
			'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RUN_SET_MISMATCH' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 missing run set accepted'; END IF;

	extra_run_id := pg_catalog.gen_random_uuid();
	SELECT pg_catalog.array_agg(value ORDER BY value) INTO test_run_ids
	FROM pg_catalog.unnest(primary_run_ids || extra_run_id) AS item(value);
	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, test_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
			ARRAY['dataset-a', 'dataset-b'], (primary_fixture->>'window_start')::timestamptz,
			(primary_fixture->>'window_end')::timestamptz, (primary_fixture->>'quiesced_at')::timestamptz,
			(primary_fixture->>'billing_final_at')::timestamptz, primary_fixture->>'artifact_reference',
			'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RUN_SET_MISMATCH' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 extra run set accepted'; END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, ARRAY[primary_run_ids[1], primary_run_ids[1]], 'BRIGHT_DATA',
			'sha256:' || pg_catalog.repeat('a', 64), ARRAY['dataset-a', 'dataset-b'],
			(primary_fixture->>'window_start')::timestamptz, (primary_fixture->>'window_end')::timestamptz,
			(primary_fixture->>'quiesced_at')::timestamptz, (primary_fixture->>'billing_final_at')::timestamptz,
			primary_fixture->>'artifact_reference', 'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_INPUT_INVALID' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 duplicate run set accepted'; END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, ARRAY[primary_run_ids[2], primary_run_ids[1]], 'BRIGHT_DATA',
			'sha256:' || pg_catalog.repeat('a', 64), ARRAY['dataset-a', 'dataset-b'],
			(primary_fixture->>'window_start')::timestamptz, (primary_fixture->>'window_end')::timestamptz,
			(primary_fixture->>'quiesced_at')::timestamptz, (primary_fixture->>'billing_final_at')::timestamptz,
			primary_fixture->>'artifact_reference', 'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_INPUT_INVALID' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 unsorted run set accepted'; END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, primary_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
			ARRAY['dataset-a', 'dataset-a'], (primary_fixture->>'window_start')::timestamptz,
			(primary_fixture->>'window_end')::timestamptz, (primary_fixture->>'quiesced_at')::timestamptz,
			(primary_fixture->>'billing_final_at')::timestamptz, primary_fixture->>'artifact_reference',
			'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_INPUT_INVALID' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 duplicate resource set accepted'; END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, primary_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
			ARRAY['dataset-a', 'dataset-b'], (primary_fixture->>'run_started_at')::timestamptz + interval '1 second',
			(primary_fixture->>'window_end')::timestamptz, (primary_fixture->>'quiesced_at')::timestamptz,
			(primary_fixture->>'billing_final_at')::timestamptz, primary_fixture->>'artifact_reference',
			'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_EVIDENCE_WINDOW_INVALID' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 incomplete window start accepted'; END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, primary_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
			ARRAY['dataset-a', 'dataset-b'], (primary_fixture->>'window_start')::timestamptz,
			(primary_fixture->>'permit_expires_at')::timestamptz - interval '1 second',
			(primary_fixture->>'quiesced_at')::timestamptz, (primary_fixture->>'billing_final_at')::timestamptz,
			primary_fixture->>'artifact_reference', 'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_EVIDENCE_WINDOW_INVALID' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 incomplete window end accepted'; END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, primary_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
			ARRAY['dataset-a', 'dataset-b'], (primary_fixture->>'window_start')::timestamptz,
			(primary_fixture->>'window_end')::timestamptz, (primary_fixture->>'quiesced_at')::timestamptz,
			pg_catalog.clock_timestamp() + interval '1 hour', primary_fixture->>'artifact_reference',
			'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_EVIDENCE_WINDOW_INVALID' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 future billing finality accepted'; END IF;

	FOREACH test_run_ids SLICE 1 IN ARRAY ARRAY[
		ARRAY[(active_fixture->'run_ids'->>0)::uuid],
		ARRAY[(raw_fixture->'run_ids'->>0)::uuid],
		ARRAY[(run_cost_fixture->'run_ids'->>0)::uuid],
		ARRAY[(cost_event_fixture->'run_ids'->>0)::uuid],
		ARRAY[(snapshot_fixture->'run_ids'->>0)::uuid]
	]::uuid[][] LOOP
		blocked := false;
		expected_error := CASE
			WHEN test_run_ids[1] = (active_fixture->'run_ids'->>0)::uuid
				THEN 'JOURNAL_NO_SPEND_EVIDENCE_WINDOW_INVALID'
			WHEN test_run_ids[1] IN (
				(raw_fixture->'run_ids'->>0)::uuid,
				(run_cost_fixture->'run_ids'->>0)::uuid
			) THEN 'JOURNAL_NO_SPEND_RUN_OUTCOME_EVIDENCE_PRESENT'
			WHEN test_run_ids[1] = (cost_event_fixture->'run_ids'->>0)::uuid
				THEN 'JOURNAL_NO_SPEND_COST_EVIDENCE_PRESENT'
			ELSE 'JOURNAL_NO_SPEND_PROVIDER_SNAPSHOT_EVIDENCE_PRESENT'
		END;
		BEGIN
			IF test_run_ids[1] = (active_fixture->'run_ids'->>0)::uuid THEN
				PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
					(active_fixture->>'claim_id')::uuid, test_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
					ARRAY['dataset-a', 'dataset-b'], (active_fixture->>'window_start')::timestamptz,
					(active_fixture->>'window_end')::timestamptz, (active_fixture->>'quiesced_at')::timestamptz,
					(active_fixture->>'billing_final_at')::timestamptz, active_fixture->>'artifact_reference',
					'sha256:' || pg_catalog.repeat('b', 64)
				);
			ELSIF test_run_ids[1] = (raw_fixture->'run_ids'->>0)::uuid THEN
				PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
					(raw_fixture->>'claim_id')::uuid, test_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
					ARRAY['dataset-a', 'dataset-b'], (raw_fixture->>'window_start')::timestamptz,
					(raw_fixture->>'window_end')::timestamptz, (raw_fixture->>'quiesced_at')::timestamptz,
					(raw_fixture->>'billing_final_at')::timestamptz, raw_fixture->>'artifact_reference',
					'sha256:' || pg_catalog.repeat('b', 64)
				);
			ELSIF test_run_ids[1] = (run_cost_fixture->'run_ids'->>0)::uuid THEN
				PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
					(run_cost_fixture->>'claim_id')::uuid, test_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
					ARRAY['dataset-a', 'dataset-b'], (run_cost_fixture->>'window_start')::timestamptz,
					(run_cost_fixture->>'window_end')::timestamptz, (run_cost_fixture->>'quiesced_at')::timestamptz,
					(run_cost_fixture->>'billing_final_at')::timestamptz, run_cost_fixture->>'artifact_reference',
					'sha256:' || pg_catalog.repeat('b', 64)
				);
			ELSIF test_run_ids[1] = (cost_event_fixture->'run_ids'->>0)::uuid THEN
				PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
					(cost_event_fixture->>'claim_id')::uuid, test_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
					ARRAY['dataset-a', 'dataset-b'], (cost_event_fixture->>'window_start')::timestamptz,
					(cost_event_fixture->>'window_end')::timestamptz, (cost_event_fixture->>'quiesced_at')::timestamptz,
					(cost_event_fixture->>'billing_final_at')::timestamptz, cost_event_fixture->>'artifact_reference',
					'sha256:' || pg_catalog.repeat('b', 64)
				);
			ELSE
				PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
					(snapshot_fixture->>'claim_id')::uuid, test_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
					ARRAY['dataset-a', 'dataset-b'], (snapshot_fixture->>'window_start')::timestamptz,
					(snapshot_fixture->>'window_end')::timestamptz, (snapshot_fixture->>'quiesced_at')::timestamptz,
					(snapshot_fixture->>'billing_final_at')::timestamptz, snapshot_fixture->>'artifact_reference',
					'sha256:' || pg_catalog.repeat('b', 64)
				);
			END IF;
		EXCEPTION WHEN OTHERS THEN
			IF SQLERRM = expected_error THEN blocked := true; ELSE RAISE; END IF;
		END;
		IF NOT blocked THEN RAISE EXCEPTION '0059 negative evidence fixture accepted'; END IF;
	END LOOP;
	IF EXISTS (
		SELECT 1 FROM public.sv_journal_no_spend_reconciliations AS reconciliation
		WHERE reconciliation.claim_id IN (
			primary_claim_id,
			(mixed_fixture->>'claim_id')::uuid,
			(active_fixture->>'claim_id')::uuid,
			(raw_fixture->>'claim_id')::uuid,
			(run_cost_fixture->>'claim_id')::uuid,
			(cost_event_fixture->>'claim_id')::uuid,
			(snapshot_fixture->>'claim_id')::uuid
		)
	) THEN
		RAISE EXCEPTION '0059 aborted validation persisted a certificate';
	END IF;

	SELECT * INTO receipt
	FROM public.sv_owner_reconcile_journal_no_spend(
		primary_claim_id, primary_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
		ARRAY['dataset-a', 'dataset-b'], (primary_fixture->>'window_start')::timestamptz,
		(primary_fixture->>'window_end')::timestamptz, (primary_fixture->>'quiesced_at')::timestamptz,
		(primary_fixture->>'billing_final_at')::timestamptz, primary_fixture->>'artifact_reference',
		'sha256:' || pg_catalog.repeat('b', 64)
	);
	SELECT * INTO replay_receipt
	FROM public.sv_owner_reconcile_journal_no_spend(
		primary_claim_id, primary_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
		ARRAY['dataset-a', 'dataset-b'], (primary_fixture->>'window_start')::timestamptz,
		(primary_fixture->>'window_end')::timestamptz, (primary_fixture->>'quiesced_at')::timestamptz,
		(primary_fixture->>'billing_final_at')::timestamptz, primary_fixture->>'artifact_reference',
		'sha256:' || pg_catalog.repeat('b', 64)
	);
	IF receipt.reconciliation_id IS DISTINCT FROM replay_receipt.reconciliation_id
		OR receipt.certificate_sha256 !~ '^sha256:[a-f0-9]{64}$'
		OR receipt.prior_status <> 'HOLD'
		OR receipt.current_status <> 'NO_SPEND'
	THEN
		RAISE EXCEPTION '0059 valid reconciliation receipt invalid';
	END IF;
	IF (SELECT count(*) FROM public.sv_journal_no_spend_reconciliations WHERE claim_id = primary_claim_id) <> 1
		OR NOT EXISTS (
			SELECT 1 FROM public.sv_journal_daily_claims
			WHERE id = primary_claim_id AND status = 'NO_SPEND' AND updated_at = receipt.reconciled_at
		)
		OR (SELECT count(*) FROM public.sv_runs WHERE id = ANY(primary_run_ids) AND status = 'RUNNING' AND finished_at IS NULL) <> 3
		OR (SELECT count(*) FROM public.sv_run_permits WHERE cycle_id = (primary_fixture->>'cycle_id')::uuid AND status = 'consumed') <> 3
	THEN
		RAISE EXCEPTION '0059 valid reconciliation did not preserve graph and transition claim';
	END IF;

	blocked := false;
	BEGIN
		INSERT INTO public.sv_response_mentions (
			organization_id, cycle_id, run_id, entity_type, name, extractor_version
		) VALUES (
			'journal-no-spend-0059', (primary_fixture->>'cycle_id')::uuid,
			primary_run_ids[1], 'brand', 'Late response evidence', '0059-late'
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 late response mention insertion accepted'; END IF;

	blocked := false;
	BEGIN
		INSERT INTO public.sv_citation_gap_snapshots (
			organization_id, project_id, cycle_id, configuration_lock_id,
			source_domain, owned_citation_count, competitor_citation_count,
			engine_count, scenario_count, priority_band, formula_version, evidence_run_ids
		) VALUES (
			'journal-no-spend-0059', primary_project_id, (primary_fixture->>'cycle_id')::uuid,
			(primary_fixture->>'lock_id')::uuid, 'late-evidence.example', 0, 1,
			1, 1, 'HIGH', '0059-late', ARRAY[primary_run_ids[1]]
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 late citation gap insertion accepted'; END IF;

	blocked := false;
	BEGIN
		INSERT INTO public.sv_provider_dataset_snapshot_events (
			organization_id, project_id, provider, source, provider_dataset_id,
			snapshot_id, phase, observed_at, event_hash
		) VALUES (
			'journal-no-spend-0059', primary_project_id, 'brightdata', '0059_LATE',
			'dataset-not-in-certificate', '0059-primary-in-window', 'TRIGGERED',
			(primary_fixture->>'window_end')::timestamptz - interval '1 minute',
			'sha256:' || pg_catalog.repeat('d', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 late in-window provider snapshot insertion accepted'; END IF;

	INSERT INTO public.sv_provider_dataset_snapshot_events (
		organization_id, project_id, provider, source, provider_dataset_id,
		snapshot_id, phase, observed_at, event_hash
	) VALUES (
		'journal-no-spend-0059', primary_project_id, 'BRIGHT_DATA', '0059_LATER_WINDOW',
		'dataset-not-in-certificate', '0059-primary-later-window', 'TRIGGERED',
		(primary_fixture->>'window_end')::timestamptz + interval '30 minutes',
		'sha256:' || pg_catalog.repeat('e', 64)
	);
	IF NOT EXISTS (
		SELECT 1 FROM public.sv_provider_dataset_snapshot_events
		WHERE project_id = primary_project_id AND snapshot_id = '0059-primary-later-window'
	) THEN
		RAISE EXCEPTION '0059 later out-of-window provider snapshot was blocked';
	END IF;

	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			primary_claim_id, primary_run_ids, 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64),
			ARRAY['dataset-a', 'dataset-b'], (primary_fixture->>'window_start')::timestamptz,
			(primary_fixture->>'window_end')::timestamptz, (primary_fixture->>'quiesced_at')::timestamptz,
			(primary_fixture->>'billing_final_at')::timestamptz, primary_fixture->>'artifact_reference',
			'sha256:' || pg_catalog.repeat('c', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_REPLAY_MISMATCH' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 changed replay accepted'; END IF;

	blocked := false;
	BEGIN
		UPDATE public.sv_journal_no_spend_reconciliations SET schema_version = 2 WHERE claim_id = primary_claim_id;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILIATION_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 certificate update accepted'; END IF;
	blocked := false;
	BEGIN
		DELETE FROM public.sv_journal_no_spend_reconciliations WHERE claim_id = primary_claim_id;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILIATION_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 certificate delete accepted'; END IF;
	blocked := false;
	BEGIN
		UPDATE public.sv_runs SET status = 'SUCCEEDED', finished_at = pg_catalog.clock_timestamp()
		WHERE id = primary_run_ids[1];
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 late run completion accepted'; END IF;
	blocked := false;
	BEGIN
		INSERT INTO public.sv_cost_events (organization_id, cycle_id, run_id, provider, amount_usd, basis)
		VALUES ('journal-no-spend-0059', (primary_fixture->>'cycle_id')::uuid, primary_run_ids[1], 'BRIGHT_DATA', 0, 'late');
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 late cost insertion accepted'; END IF;

	new_claim_id := pg_catalog.gen_random_uuid();
	new_lock_id := pg_catalog.gen_random_uuid();
	new_quote_id := pg_catalog.gen_random_uuid();
	new_order_id := pg_catalog.gen_random_uuid();
	new_cycle_id := pg_catalog.gen_random_uuid();
	new_permit_id := pg_catalog.gen_random_uuid();
	new_run_id := pg_catalog.gen_random_uuid();
	INSERT INTO public.sv_journal_daily_claims (
		id, organization_id, project_id, question_set_version, utc_day, attempt
	) VALUES (
		new_claim_id, 'journal-no-spend-0059', primary_project_id, '0059-primary',
		(pg_catalog.now() AT TIME ZONE 'UTC')::date, 2
	);
	INSERT INTO public.sv_configuration_locks (
		id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	) VALUES (
		new_lock_id, 'journal-no-spend-0059', primary_project_id, 2,
		pg_catalog.jsonb_build_object(
			'journalClaim', pg_catalog.jsonb_build_object(
				'id', new_claim_id::text,
				'utcDay', (pg_catalog.now() AT TIME ZONE 'UTC')::date::text,
				'attempt', '2'
			)
		),
		'0059-fresh-lock', 1, 0, '0059-owner-e2e'
	);
	UPDATE public.sv_journal_daily_claims
	SET configuration_lock_id = new_lock_id, updated_at = pg_catalog.clock_timestamp()
	WHERE id = new_claim_id;
	INSERT INTO public.sv_quotes (
		id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
	) VALUES (
		new_quote_id, 'journal-no-spend-0059', primary_project_id, new_lock_id,
		'ISSUED', 0, 'USD', 1, pg_catalog.clock_timestamp() + interval '1 day'
	);
	INSERT INTO public.sv_orders (id, organization_id, project_id, quote_id, lock_id, status, order_cap)
	VALUES (new_order_id, 'journal-no-spend-0059', primary_project_id, new_quote_id, new_lock_id, 'RUNNING', 0);
	INSERT INTO public.sv_cycles (
		id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
	) VALUES (new_cycle_id, 'journal-no-spend-0059', new_order_id, new_lock_id, 'RUNNING', 1, 1, 0);
	INSERT INTO public.sv_run_permits (
		id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id,
		status, expires_at, consumed_at
	) VALUES (
		new_permit_id, 'journal-no-spend-0059', new_cycle_id, '0059-fresh-dispatch',
		'VISITOR', 'fresh-scenario', 'ChatGPT', 'consumed',
		pg_catalog.clock_timestamp() + interval '1 hour', pg_catalog.clock_timestamp()
	);
	INSERT INTO public.sv_runs (
		id, organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id,
		system_id, status, started_at
	) VALUES (
		new_run_id, 'journal-no-spend-0059', new_cycle_id, new_permit_id, '0059-fresh-dispatch',
		'VISITOR', 'fresh-scenario', 'ChatGPT', 'RUNNING', pg_catalog.clock_timestamp()
	);
	UPDATE public.sv_journal_daily_claims
	SET status = 'EXECUTING', updated_at = pg_catalog.clock_timestamp()
	WHERE id = new_claim_id;
	INSERT INTO public.sv_journal_provider_boundaries (
		organization_id, project_id, journal_claim_id, configuration_lock_id,
		cycle_id, permit_id, run_id, dispatch_key, channel, system_id
	) VALUES (
		'journal-no-spend-0059', primary_project_id, new_claim_id, new_lock_id,
		new_cycle_id, new_permit_id, new_run_id, '0059-fresh-dispatch',
		'VISITOR', 'ChatGPT'
	);
	IF NOT EXISTS (
		SELECT 1 FROM public.sv_journal_daily_claims
		WHERE id = new_claim_id AND status = 'EXECUTING' AND configuration_lock_id = new_lock_id
	) OR NOT EXISTS (
		SELECT 1 FROM public.sv_runs WHERE id = new_run_id
	) THEN
		RAISE EXCEPTION '0059 fresh claim or new-lock execution was blocked';
	END IF;

	RAISE NOTICE '0059 owner transition, negatives, replay, immutability and fresh-lock proof passed';
END;
$proof$;

DO $certificate_truncate$
DECLARE
	blocked boolean := false;
BEGIN
	BEGIN
		TRUNCATE public.sv_journal_no_spend_reconciliations;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILIATION_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 certificate truncate accepted'; END IF;
END;
$certificate_truncate$;

DO $acl$
BEGIN
	IF pg_catalog.has_table_privilege('selena_app', 'public.sv_journal_no_spend_reconciliations', 'SELECT')
		OR pg_catalog.has_table_privilege('selena_app', 'public.sv_journal_no_spend_reconciliations', 'INSERT')
		OR pg_catalog.has_function_privilege(
			'selena_app',
			'public.sv_owner_reconcile_journal_no_spend(uuid,uuid[],text,text,text[],timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone,text,text)',
			'EXECUTE'
		)
		OR pg_catalog.has_function_privilege(
			'selena_app', 'public.sv_reject_journal_no_spend_outcome_mutation()', 'EXECUTE'
		)
		OR pg_catalog.has_function_privilege(
			'selena_app', 'public.sv_reject_journal_no_spend_provider_snapshot_insert()', 'EXECUTE'
		)
		OR EXISTS (
			SELECT 1
			FROM pg_catalog.pg_proc AS function
			CROSS JOIN LATERAL pg_catalog.aclexplode(
				coalesce(function.proacl, pg_catalog.acldefault('f', function.proowner))
			) AS privilege
			WHERE function.oid IN (
				'public.sv_reject_journal_no_spend_outcome_mutation()'::pg_catalog.regprocedure,
				'public.sv_reject_journal_no_spend_provider_snapshot_insert()'::pg_catalog.regprocedure
			)
				AND privilege.grantee = 0::oid
				AND privilege.privilege_type = 'EXECUTE'
		)
	THEN
		RAISE EXCEPTION '0059 runtime ACL leaked';
	END IF;
END;
$acl$;

SET ROLE selena_app;
DO $runtime_denied$
DECLARE
	blocked boolean := false;
BEGIN
	BEGIN
		PERFORM pg_catalog.count(*) FROM public.sv_journal_no_spend_reconciliations;
	EXCEPTION WHEN insufficient_privilege THEN blocked := true;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 runtime certificate read allowed'; END IF;
	blocked := false;
	BEGIN
		INSERT INTO public.sv_journal_no_spend_reconciliations DEFAULT VALUES;
	EXCEPTION WHEN insufficient_privilege THEN blocked := true;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 runtime certificate insert allowed'; END IF;
	blocked := false;
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			pg_catalog.gen_random_uuid(), ARRAY[pg_catalog.gen_random_uuid()], 'BRIGHT_DATA',
			'sha256:' || pg_catalog.repeat('a', 64), ARRAY['dataset-a'],
			pg_catalog.clock_timestamp() - interval '5 hours', pg_catalog.clock_timestamp() - interval '1 hour',
			pg_catalog.clock_timestamp() - interval '3 hours', pg_catalog.clock_timestamp() - interval '30 minutes',
			'immutable://0059/runtime-denied', 'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN insufficient_privilege THEN blocked := true;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 runtime function execute allowed'; END IF;
END;
$runtime_denied$;
RESET ROLE;

GRANT SELECT, UPDATE ON public.sv_runs TO selena_app;
SET ROLE selena_app;
SELECT pg_catalog.set_config('app.organization_id', 'journal-no-spend-0059', false);
DO $runtime_fence$
DECLARE
	updated_rows integer;
	blocked boolean := false;
BEGIN
	UPDATE public.sv_runs
	SET started_at = started_at
	WHERE dispatch_key = '0059-fresh-dispatch';
	GET DIAGNOSTICS updated_rows = ROW_COUNT;
	IF updated_rows <> 1 THEN RAISE EXCEPTION '0059 fresh runtime write was blocked'; END IF;

	BEGIN
		UPDATE public.sv_runs
		SET started_at = started_at
		WHERE dispatch_key = '0059-primary-1';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 runtime late-write fence was bypassed'; END IF;
END;
$runtime_fence$;
RESET ROLE;

GRANT EXECUTE ON FUNCTION public.sv_owner_reconcile_journal_no_spend(
	uuid, uuid[], text, text, text[], timestamptz, timestamptz,
	timestamptz, timestamptz, text, text
) TO selena_app;
SET ROLE selena_app;
DO $owner_guard$
DECLARE
	blocked boolean := false;
BEGIN
	BEGIN
		PERFORM 1 FROM public.sv_owner_reconcile_journal_no_spend(
			pg_catalog.gen_random_uuid(), ARRAY[pg_catalog.gen_random_uuid()], 'BRIGHT_DATA',
			'sha256:' || pg_catalog.repeat('a', 64), ARRAY['dataset-a'],
			pg_catalog.clock_timestamp() - interval '5 hours', pg_catalog.clock_timestamp() - interval '1 hour',
			pg_catalog.clock_timestamp() - interval '3 hours', pg_catalog.clock_timestamp() - interval '30 minutes',
			'immutable://0059/non-owner', 'sha256:' || pg_catalog.repeat('b', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_OWNER_SCOPE_REQUIRED' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 non-owner passed owner guard'; END IF;
END;
$owner_guard$;
RESET ROLE;
REVOKE ALL ON FUNCTION public.sv_owner_reconcile_journal_no_spend(
	uuid, uuid[], text, text, text[], timestamptz, timestamptz,
	timestamptz, timestamptz, text, text
) FROM selena_app;
SQL

# Reconciled-run truncate immutability runs in its own committed transaction so the
# upstream 0058 deferred sv_runs constraint trigger (sv_require_journal_provider_boundary)
# has no pending events when TRUNCATE fires. A fresh transaction has none, so TRUNCATE
# reaches the 0059 truncate guards and each raises JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE.
"${psql[@]}" >/dev/null <<'SQL'
DO $truncate_immutability$
DECLARE
	blocked boolean := false;
BEGIN
	BEGIN
		TRUNCATE public.sv_runs CASCADE;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 execution truncate accepted'; END IF;
	blocked := false;
	BEGIN
		TRUNCATE public.sv_response_mentions;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 response mention truncate accepted'; END IF;
	blocked := false;
	BEGIN
		TRUNCATE public.sv_citation_gap_snapshots;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE' THEN blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0059 citation gap truncate accepted'; END IF;
END;
$truncate_immutability$;
SQL

# SET ROLE changes current_user inside the owner's session. This second proof is
# a real password-authenticated selena_app login where current_user=session_user.
"${psql[@]}" -c 'GRANT EXECUTE ON FUNCTION public.sv_owner_reconcile_journal_no_spend(uuid, uuid[], text, text, text[], timestamptz, timestamptz, timestamptz, timestamptz, text, text) TO selena_app;' >/dev/null
if [[ "$("${runtime_psql[@]}" -At -F '|' -c 'SELECT current_user, session_user')" != 'selena_app|selena_app' ]]; then
	printf '0059_DIRECT_LOGIN_IDENTITY_FAILED\n' >&2
	exit 1
fi
direct_login_output=''
if direct_login_output="$("${runtime_psql[@]}" -Atc "SELECT 1 FROM public.sv_owner_reconcile_journal_no_spend(pg_catalog.gen_random_uuid(), ARRAY[pg_catalog.gen_random_uuid()], 'BRIGHT_DATA', 'sha256:' || pg_catalog.repeat('a', 64), ARRAY['dataset-a'], pg_catalog.clock_timestamp() - interval '5 hours', pg_catalog.clock_timestamp() - interval '1 hour', pg_catalog.clock_timestamp() - interval '3 hours', pg_catalog.clock_timestamp() - interval '30 minutes', 'immutable://0059/direct-login', 'sha256:' || pg_catalog.repeat('b', 64));" 2>&1)"; then
	printf '0059_DIRECT_LOGIN_NON_OWNER_ALLOWED\n' >&2
	exit 1
fi
if [[ "$direct_login_output" != *'JOURNAL_NO_SPEND_OWNER_SCOPE_REQUIRED'* ]]; then
	printf '0059_DIRECT_LOGIN_WRONG_FAILURE\n' >&2
	exit 1
fi
"${psql[@]}" -c 'REVOKE ALL ON FUNCTION public.sv_owner_reconcile_journal_no_spend(uuid, uuid[], text, text, text[], timestamptz, timestamptz, timestamptz, timestamptz, text, text) FROM selena_app; GRANT SELECT, UPDATE ON public.sv_run_permits TO selena_app;' >/dev/null

concurrency_fixture="$("${psql[@]}" -At -F '|' -c "WITH fixture AS MATERIALIZED (SELECT public.sv_0059_make_fixture('concurrency', 1) AS data) SELECT fixture.data->>'claim_id', fixture.data->'run_ids'->>0, fixture.data->>'permit_id', fixture.data->>'window_start', fixture.data->>'window_end', fixture.data->>'quiesced_at', fixture.data->>'billing_final_at', fixture.data->>'artifact_reference' FROM fixture;")"
IFS='|' read -r concurrency_claim_id concurrency_run_id concurrency_permit_id concurrency_window_start concurrency_window_end concurrency_quiesced_at concurrency_billing_final_at concurrency_artifact_reference <<< "$concurrency_fixture"
if [[ -z "$concurrency_claim_id" || -z "$concurrency_run_id" || -z "$concurrency_permit_id" ]]; then
	printf '0059_CONCURRENCY_FIXTURE_FAILED\n' >&2
	exit 1
fi

holder_output="$(mktemp "${TMPDIR:-/tmp}/selena-0059-lock-holder.XXXXXX")"
"${runtime_psql[@]}" >"$holder_output" 2>&1 <<SQL &
SET application_name = 'selena-0059-runtime-lock-holder';
SELECT pg_catalog.set_config('app.organization_id', 'journal-no-spend-0059', false);
BEGIN;
SELECT id FROM public.sv_run_permits WHERE id = '$concurrency_permit_id'::uuid FOR UPDATE;
SELECT pg_catalog.pg_sleep(8);
UPDATE public.sv_run_permits SET expires_at = expires_at WHERE id = '$concurrency_permit_id'::uuid;
COMMIT;
SELECT 'RUNTIME_TRANSACTION_COMMITTED';
SQL
holder_pid=$!

holder_ready=false
for _ in {1..100}; do
	if [[ "$("${psql[@]}" -Atc "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_stat_activity WHERE application_name = 'selena-0059-runtime-lock-holder' AND wait_event = 'PgSleep')")" == 't' ]]; then
		holder_ready=true
		break
	fi
	if ! kill -0 "$holder_pid" 2>/dev/null; then
		break
	fi
	sleep 0.1
done
if [[ "$holder_ready" != true ]]; then
	printf '0059_RUNTIME_LOCK_HOLDER_NOT_READY\n' >&2
	exit 1
fi

quiescence_output=''
if quiescence_output="$("${psql[@]}" \
	-v claim_id="$concurrency_claim_id" \
	-v run_id="$concurrency_run_id" \
	-v window_start="$concurrency_window_start" \
	-v window_end="$concurrency_window_end" \
	-v quiesced_at="$concurrency_quiesced_at" \
	-v billing_final_at="$concurrency_billing_final_at" \
	-v artifact_reference="$concurrency_artifact_reference" 2>&1 <<'SQL'
SELECT 1 FROM public.sv_owner_reconcile_journal_no_spend(
	:'claim_id'::uuid,
	ARRAY[:'run_id'::uuid],
	'BRIGHT_DATA',
	'sha256:' || pg_catalog.repeat('a', 64),
	ARRAY['dataset-a', 'dataset-b'],
	:'window_start'::timestamptz,
	:'window_end'::timestamptz,
	:'quiesced_at'::timestamptz,
	:'billing_final_at'::timestamptz,
	:'artifact_reference',
	'sha256:' || pg_catalog.repeat('b', 64)
);
SQL
)"; then
	printf '0059_ACTIVE_RUNTIME_RECONCILIATION_ALLOWED\n' >&2
	exit 1
fi
if [[ "$quiescence_output" != *'JOURNAL_NO_SPEND_EXECUTION_NOT_QUIESCED'* ]]; then
	printf '0059_ACTIVE_RUNTIME_WRONG_FAILURE\n' >&2
	exit 1
fi
if [[ "$("${psql[@]}" -Atc "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_stat_activity WHERE application_name = 'selena-0059-runtime-lock-holder' AND wait_event = 'PgSleep')")" != 't' ]]; then
	printf '0059_RECONCILIATION_DID_NOT_FAIL_QUICKLY\n' >&2
	exit 1
fi
if [[ "$("${psql[@]}" -Atc "SELECT claim.status || ':' || (SELECT pg_catalog.count(*)::text FROM public.sv_journal_no_spend_reconciliations AS reconciliation WHERE reconciliation.claim_id = claim.id) FROM public.sv_journal_daily_claims AS claim WHERE claim.id = '$concurrency_claim_id'::uuid")" != 'HOLD:0' ]]; then
	printf '0059_QUIESCENCE_FAILURE_MUTATED_CLAIM\n' >&2
	exit 1
fi

if ! wait "$holder_pid"; then
	printf '0059_RUNTIME_LOCK_HOLDER_ABORTED\n' >&2
	exit 1
fi
holder_pid=''
if [[ "$(<"$holder_output")" != *'RUNTIME_TRANSACTION_COMMITTED'* ]]; then
	printf '0059_RUNTIME_LOCK_HOLDER_DID_NOT_COMMIT\n' >&2
	exit 1
fi
rm -f "$holder_output"
holder_output=''

"${psql[@]}" \
	-v claim_id="$concurrency_claim_id" \
	-v run_id="$concurrency_run_id" \
	-v window_start="$concurrency_window_start" \
	-v window_end="$concurrency_window_end" \
	-v quiesced_at="$concurrency_quiesced_at" \
	-v billing_final_at="$concurrency_billing_final_at" \
	-v artifact_reference="$concurrency_artifact_reference" >/dev/null <<'SQL'
SELECT 1 FROM public.sv_owner_reconcile_journal_no_spend(
	:'claim_id'::uuid,
	ARRAY[:'run_id'::uuid],
	'BRIGHT_DATA',
	'sha256:' || pg_catalog.repeat('a', 64),
	ARRAY['dataset-a', 'dataset-b'],
	:'window_start'::timestamptz,
	:'window_end'::timestamptz,
	:'quiesced_at'::timestamptz,
	:'billing_final_at'::timestamptz,
	:'artifact_reference',
	'sha256:' || pg_catalog.repeat('b', 64)
);
SQL
if [[ "$("${psql[@]}" -Atc "SELECT claim.status || ':' || (SELECT pg_catalog.count(*)::text FROM public.sv_journal_no_spend_reconciliations AS reconciliation WHERE reconciliation.claim_id = claim.id) FROM public.sv_journal_daily_claims AS claim WHERE claim.id = '$concurrency_claim_id'::uuid")" != 'NO_SPEND:1' ]]; then
	printf '0059_POST_QUIESCENCE_RECONCILIATION_FAILED\n' >&2
	exit 1
fi

"${psql[@]}" -c 'DROP FUNCTION public.sv_0059_make_fixture(text, integer, boolean, boolean, boolean, boolean, boolean);' >/dev/null
cleanup_runtime_role
if [[ "$("${psql[@]}" -Atc "SELECT to_regprocedure('public.sv_0059_make_fixture(text,integer,boolean,boolean,boolean,boolean,boolean)') IS NULL AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app')")" != "t" ]]; then
	printf '0059_FIXTURE_CLEANUP_FAILED\n' >&2
	exit 1
fi

printf 'JOURNAL_NO_SPEND_0059_DISPOSABLE_PASS provider_code_invoked=false external_network_api_calls_made=0 cleanup=verified\n'
