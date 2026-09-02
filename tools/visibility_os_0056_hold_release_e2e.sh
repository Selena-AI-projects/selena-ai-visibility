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

bash "$repo_root/tools/visibility_os_gate12_e2e.sh" "$compose_file" >/dev/null
for migration in 0051_visibility_os_provider_evidence_provenance 0052_provider_dataset_snapshot_journal \
	0053_configuration_lock_legacy_collision_ordinal 0054_journal_daily_claim_execution_lease \
	0055_provider_snapshot_resume_reconciliation 0056_journal_daily_claim_hold_release; do
	"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/${migration}.sql" >/dev/null
done

"${psql[@]}" <<'SQL' >/dev/null
INSERT INTO organization (id, name, slug, created_at)
VALUES ('hold-release', 'Hold Release', 'hold-release', now());

SELECT set_config('app.organization_id', 'hold-release', false);

DO $$
DECLARE
	org_id text := 'hold-release';
	project_id uuid;
	claim_id uuid;
	lock_id uuid;
	quote_id uuid;
	order_id uuid;
	cycle_id uuid;
	family_id uuid;
	scenario_id uuid;
	permit_id uuid;
	today date := (current_timestamp AT TIME ZONE 'UTC')::date;
	blocked boolean;
BEGIN
	INSERT INTO sv_projects (organization_id, name, category, country, region, languages, status)
	VALUES (org_id, 'Hold Release Project', 'test', 'ID', 'Bali', ARRAY['en'], 'DRAFT')
	RETURNING id INTO project_id;

	INSERT INTO sv_journal_daily_claims (organization_id, project_id, question_set_version, utc_day, attempt)
	VALUES (org_id, project_id, 'hold-v1', today, 1)
	RETURNING id INTO claim_id;
	INSERT INTO sv_configuration_locks (
		organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	)
	VALUES (
		org_id, project_id, 1,
		jsonb_build_object('journalClaim', jsonb_build_object('id', claim_id::text, 'utcDay', today::text, 'attempt', 1)),
		'hold-stub', 1, 0, 'hold-stub'
	)
	RETURNING id INTO lock_id;
	UPDATE sv_journal_daily_claims SET configuration_lock_id = lock_id, updated_at = now() WHERE id = claim_id;
	UPDATE sv_journal_daily_claims SET status = 'EXECUTING', updated_at = now() WHERE id = claim_id;
	UPDATE sv_journal_daily_claims SET status = 'HOLD', updated_at = now() WHERE id = claim_id;

	blocked := false;
	BEGIN
		INSERT INTO sv_journal_daily_claims (organization_id, project_id, question_set_version, utc_day, attempt)
		VALUES (org_id, project_id, 'hold-v1', today, 2);
	EXCEPTION WHEN unique_violation THEN blocked := true;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0056 hold accepted a second unresolved claim'; END IF;

	UPDATE sv_journal_daily_claims
	SET status = 'ABANDONED', abandoned_at = now(), updated_at = now()
	WHERE id = claim_id;
	IF (SELECT status FROM sv_journal_daily_claims WHERE id = claim_id) <> 'ABANDONED' THEN
		RAISE EXCEPTION '0056 hold without recorded spend was not released';
	END IF;

	INSERT INTO sv_journal_daily_claims (organization_id, project_id, question_set_version, utc_day, attempt)
	VALUES (org_id, project_id, 'hold-v1', today, 2)
	RETURNING id INTO claim_id;

	INSERT INTO sv_configuration_locks (
		organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	)
	VALUES (
		org_id, project_id, 2,
		jsonb_build_object('journalClaim', jsonb_build_object('id', claim_id::text, 'utcDay', today::text, 'attempt', 2)),
		'hold-stub', 1, 0, 'hold-stub'
	)
	RETURNING id INTO lock_id;
	UPDATE sv_journal_daily_claims SET configuration_lock_id = lock_id, updated_at = now() WHERE id = claim_id;
	UPDATE sv_journal_daily_claims SET status = 'EXECUTING', updated_at = now() WHERE id = claim_id;
	UPDATE sv_journal_daily_claims SET status = 'HOLD', updated_at = now() WHERE id = claim_id;

	INSERT INTO sv_quotes (organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at)
	VALUES (org_id, project_id, lock_id, 'ISSUED', 0, 'USD', 1, now() + interval '1 day')
	RETURNING id INTO quote_id;
	INSERT INTO sv_orders (organization_id, project_id, quote_id, lock_id, status, order_cap)
	VALUES (org_id, project_id, quote_id, lock_id, 'APPROVED', 0)
	RETURNING id INTO order_id;
	INSERT INTO sv_cycles (organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs)
	VALUES (org_id, order_id, lock_id, 'READY', 1, 1, 1)
	RETURNING id INTO cycle_id;
	INSERT INTO sv_prompt_families (organization_id, project_id, intent_type, source, status)
	VALUES (org_id, project_id, 'discovery', 'stub', 'APPROVED')
	RETURNING id INTO family_id;
	INSERT INTO sv_scenarios (organization_id, family_id, text, language, status)
	VALUES (org_id, family_id, 'Hold release question?', 'en', 'APPROVED')
	RETURNING id INTO scenario_id;
	INSERT INTO sv_run_permits (
		organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at
	)
	VALUES (
		org_id, cycle_id, 'hold-release-run', 'api_view', scenario_id::text, 'stub', 'consumed',
		now() + interval '1 day', now()
	)
	RETURNING id INTO permit_id;
	INSERT INTO sv_runs (
		organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status,
		validity, cost_usd, cost_basis, token_input, token_output, system, model, language, region,
		mention, position, owned_citation, citations, competitors, factual_errors, extractor_version,
		capture_mode, raw_response_reference, canonical_payload, started_at, finished_at
	)
	VALUES (
		org_id, cycle_id, permit_id, 'hold-release-run', 'api_view', scenario_id::text, 'stub', 'completed',
		'VALID', 0, 'STUB', 0, 0, 'stub', 'stub-model', 'en', 'ID-Bali', true, 1, false,
		'[]', '[]', '[]', 'hold/1', 'unknown', 'stub://hold/answer', '{"source":"stub"}', now(), now()
	);

	blocked := false;
	BEGIN
		UPDATE sv_journal_daily_claims
		SET status = 'ABANDONED', abandoned_at = now(), updated_at = now()
		WHERE id = claim_id;
	EXCEPTION WHEN raise_exception THEN
		IF SQLERRM <> 'JOURNAL_DAILY_CLAIM_HOLD_SPEND_RECORDED' THEN RAISE; END IF;
		blocked := true;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0056 hold with recorded spend was released'; END IF;

	blocked := false;
	BEGIN
		UPDATE sv_journal_daily_claims SET status = 'EXECUTING', updated_at = now() WHERE id = claim_id;
	EXCEPTION WHEN raise_exception THEN blocked := true;
	END;
	IF NOT blocked THEN RAISE EXCEPTION '0056 hold reopened as EXECUTING'; END IF;
END $$;
SQL

printf '0056 hold release rehearsal passed\n'
