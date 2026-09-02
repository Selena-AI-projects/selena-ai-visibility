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

"${psql[@]}" <<'SQL' >/dev/null
INSERT INTO organization (id, name, slug, created_at) VALUES
	('journal-recovery-org-a', 'Journal recovery A', 'journal-recovery-org-a', clock_timestamp()),
	('journal-recovery-org-b', 'Journal recovery B', 'journal-recovery-org-b', clock_timestamp());
INSERT INTO sv_projects (id, organization_id, name, category, country, languages, status) VALUES
	('58000000-0000-4000-8000-000000000001', 'journal-recovery-org-a', 'Journal A', 'test', 'ID', ARRAY['en'], 'ACTIVE'),
	('58000000-0000-4000-8000-000000000002', 'journal-recovery-org-b', 'Journal B', 'test', 'ID', ARRAY['en'], 'ACTIVE'),
	('58000000-0000-4000-8000-000000000003', 'journal-recovery-org-a', 'Journal terminal', 'test', 'ID', ARRAY['en'], 'ACTIVE'),
	('58000000-0000-4000-8000-000000000004', 'journal-recovery-org-a', 'Journal ambiguous', 'test', 'ID', ARRAY['en'], 'ACTIVE');
SELECT set_config('app.organization_id', 'journal-recovery-org-a', false);

INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'58000000-0000-4000-8000-000000000010', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000001', 'no-spend-v1',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours'
);
DO $$
DECLARE decision text;
BEGIN
	decision := sv_recover_journal_daily_claim(
		'58000000-0000-4000-8000-000000000010', 'disposable-0058'
	);
	IF decision <> 'ABANDONED' THEN RAISE EXCEPTION 'NO_SPEND_RECOVERY_FAILED:%', decision; END IF;
	decision := sv_recover_journal_daily_claim(
		'58000000-0000-4000-8000-000000000010', 'disposable-0058'
	);
	IF decision <> 'HOLD' THEN RAISE EXCEPTION 'NO_SPEND_REPLAY_FAILED:%', decision; END IF;
	IF (SELECT count(*) FROM sv_audit_events
		WHERE organization_id = 'journal-recovery-org-a'
			AND event = 'JOURNAL_DAILY_CLAIM_ABANDONED'
			AND subject_id = '58000000-0000-4000-8000-000000000010'
			AND details->>'providerCalls' = '0') <> 1
	THEN RAISE EXCEPTION 'NO_SPEND_AUDIT_FAILED'; END IF;
END;
$$;

INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'58000000-0000-4000-8000-000000000011', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000001', 'executing-v1',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'58000000-0000-4000-8000-000000000021', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000001', 1,
	jsonb_build_object('journalClaim', jsonb_build_object(
		'id', '58000000-0000-4000-8000-000000000011',
		'utcDay', (clock_timestamp() AT TIME ZONE 'UTC')::date::text,
		'attempt', 1
	)), '0058', 1, 1, 'disposable-0058'
);
UPDATE sv_journal_daily_claims
SET configuration_lock_id = '58000000-0000-4000-8000-000000000021', status = 'EXECUTING'
WHERE id = '58000000-0000-4000-8000-000000000011';
DO $$
DECLARE decision text;
BEGIN
	decision := sv_recover_journal_daily_claim(
		'58000000-0000-4000-8000-000000000011', 'disposable-0058'
	);
	IF decision <> 'HOLD' THEN RAISE EXCEPTION 'EXECUTING_FAIL_CLOSED_FAILED:%', decision; END IF;
END;
$$;

INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'58000000-0000-4000-8000-000000000040', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000004', 'running-without-rows-v1',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'58000000-0000-4000-8000-000000000041', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000004', 3,
	jsonb_build_object('journalClaim', jsonb_build_object(
		'id', '58000000-0000-4000-8000-000000000040',
		'utcDay', (clock_timestamp() AT TIME ZONE 'UTC')::date::text,
		'attempt', 1
	)), '0058', 1, 1, 'disposable-0058'
);
UPDATE sv_journal_daily_claims
SET configuration_lock_id = '58000000-0000-4000-8000-000000000041'
WHERE id = '58000000-0000-4000-8000-000000000040';
INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
) VALUES (
	'58000000-0000-4000-8000-000000000042', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000004', '58000000-0000-4000-8000-000000000041',
	'ACCEPTED', 0, 'USD', 1, clock_timestamp() + interval '1 day'
);
INSERT INTO sv_orders (
	id, organization_id, project_id, quote_id, lock_id, status, order_cap
) VALUES (
	'58000000-0000-4000-8000-000000000043', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000004', '58000000-0000-4000-8000-000000000042',
	'58000000-0000-4000-8000-000000000041', 'RUNNING', 1
);
INSERT INTO sv_cycles (
	id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
) VALUES (
	'58000000-0000-4000-8000-000000000044', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000043', '58000000-0000-4000-8000-000000000041',
	'RUNNING', 1, 0, 0
);
DO $$
DECLARE decision text;
BEGIN
	decision := sv_recover_journal_daily_claim(
		'58000000-0000-4000-8000-000000000040', 'disposable-0058'
	);
	IF decision <> 'HOLD' THEN RAISE EXCEPTION 'RUNNING_ZERO_ROWS_RECOVERY_FAILED:%', decision; END IF;
	BEGIN
		UPDATE sv_journal_daily_claims
		SET status = 'ABANDONED', abandoned_at = clock_timestamp(), updated_at = clock_timestamp()
		WHERE id = '58000000-0000-4000-8000-000000000040';
		RAISE EXCEPTION 'RUNNING_ZERO_ROWS_ABANDONMENT_ALLOWED';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM NOT LIKE '%JOURNAL_CLAIM_NO_SPEND_PROOF_REQUIRED%' THEN RAISE; END IF;
	END;
END;
$$;
SQL

executing_abandonment=''
if executing_abandonment="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-recovery-org-a', false); UPDATE sv_journal_daily_claims SET status='ABANDONED', abandoned_at=clock_timestamp(), updated_at=clock_timestamp() WHERE id='58000000-0000-4000-8000-000000000011';" 2>&1)"; then
	printf 'JOURNAL_0058_EXECUTING_ABANDONMENT_ALLOWED\n' >&2
	exit 1
fi
if [[ "$executing_abandonment" != *"JOURNAL_EXECUTING_ABANDONMENT_BLOCKED"* ]]; then
	printf 'JOURNAL_0058_EXECUTING_ABANDONMENT_WRONG_FAILURE\n' >&2
	exit 1
fi

"${psql[@]}" <<'SQL' >/dev/null
SELECT set_config('app.organization_id', 'journal-recovery-org-a', false);
INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'58000000-0000-4000-8000-000000000012', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000003', 'terminal-v1',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'58000000-0000-4000-8000-000000000022', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000003', 2,
	jsonb_build_object('journalClaim', jsonb_build_object(
		'id', '58000000-0000-4000-8000-000000000012',
		'utcDay', (clock_timestamp() AT TIME ZONE 'UTC')::date::text,
		'attempt', 1
	)), '0058', 1, 1, 'disposable-0058'
);
UPDATE sv_journal_daily_claims
SET configuration_lock_id = '58000000-0000-4000-8000-000000000022', status = 'EXECUTING'
WHERE id = '58000000-0000-4000-8000-000000000012';
INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
) VALUES (
	'58000000-0000-4000-8000-000000000030', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000003', '58000000-0000-4000-8000-000000000022',
	'ACCEPTED', 0, 'USD', 1, clock_timestamp() + interval '1 day'
);
INSERT INTO sv_orders (
	id, organization_id, project_id, quote_id, lock_id, status, order_cap
) VALUES (
	'58000000-0000-4000-8000-000000000031', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000003', '58000000-0000-4000-8000-000000000030',
	'58000000-0000-4000-8000-000000000022', 'RUNNING', 1
);
INSERT INTO sv_cycles (
	id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
) VALUES (
	'58000000-0000-4000-8000-000000000032', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000031', '58000000-0000-4000-8000-000000000022',
	'RUNNING', 1, 1, 0
);
INSERT INTO sv_run_permits (
	id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id,
	status, expires_at, consumed_at
) VALUES (
	'58000000-0000-4000-8000-000000000033', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000032', '0058-terminal-dispatch', 'VISITOR',
	'0058-scenario', 'chatgpt', 'consumed', clock_timestamp() + interval '1 day', clock_timestamp()
);
BEGIN;
INSERT INTO sv_runs (
	id, organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id,
	status, started_at
) VALUES (
	'58000000-0000-4000-8000-000000000034', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000032', '58000000-0000-4000-8000-000000000033',
	'0058-terminal-dispatch', 'VISITOR', '0058-scenario', 'chatgpt', 'RUNNING', clock_timestamp()
);
INSERT INTO sv_journal_provider_boundaries (
	id, organization_id, project_id, journal_claim_id, configuration_lock_id,
	cycle_id, permit_id, run_id, dispatch_key, channel, system_id
) VALUES (
	'58000000-0000-4000-8000-000000000035', 'journal-recovery-org-a',
	'58000000-0000-4000-8000-000000000003', '58000000-0000-4000-8000-000000000012',
	'58000000-0000-4000-8000-000000000022', '58000000-0000-4000-8000-000000000032',
	'58000000-0000-4000-8000-000000000033', '58000000-0000-4000-8000-000000000034',
	'0058-terminal-dispatch', 'VISITOR', 'chatgpt'
);
COMMIT;
UPDATE sv_runs
SET status = 'SUCCEEDED', validity = 'VALID', finished_at = clock_timestamp()
WHERE id = '58000000-0000-4000-8000-000000000034';
UPDATE sv_cycles SET status = 'QC_REQUIRED', completed_runs = 1
WHERE id = '58000000-0000-4000-8000-000000000032';
DO $$
DECLARE decision text;
BEGIN
	decision := sv_recover_journal_daily_claim(
		'58000000-0000-4000-8000-000000000012', 'disposable-0058'
	);
	IF decision <> 'COMPLETED' THEN RAISE EXCEPTION 'TERMINAL_SETTLEMENT_FAILED:%', decision; END IF;
	decision := sv_recover_journal_daily_claim(
		'58000000-0000-4000-8000-000000000012', 'disposable-0058'
	);
	IF decision <> 'COMPLETED' THEN RAISE EXCEPTION 'TERMINAL_REPLAY_FAILED:%', decision; END IF;
	IF (SELECT count(*) FROM sv_audit_events
		WHERE organization_id = 'journal-recovery-org-a'
			AND event = 'JOURNAL_DAILY_CLAIM_COMPLETED'
			AND subject_id = '58000000-0000-4000-8000-000000000012'
			AND details->>'providerCalls' = '0') <> 1
	THEN RAISE EXCEPTION 'TERMINAL_AUDIT_FAILED'; END IF;
	IF (SELECT count(*) FROM sv_cost_events WHERE organization_id = 'journal-recovery-org-a') <> 0
	THEN RAISE EXCEPTION 'RECOVERY_COST_MUTATION_DETECTED'; END IF;
END;
$$;
SQL

"${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-recovery-org-a', false); INSERT INTO sv_run_permits (id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at) VALUES ('58000000-0000-4000-8000-000000000036', 'journal-recovery-org-a', '58000000-0000-4000-8000-000000000032', '0058-unfenced-dispatch', 'VISITOR', '0058-scenario', 'chatgpt', 'consumed', clock_timestamp() + interval '1 day', clock_timestamp());" >/dev/null
unfenced_run=''
if unfenced_run="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-recovery-org-a', false); BEGIN; INSERT INTO sv_runs (id, organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status, started_at) VALUES ('58000000-0000-4000-8000-000000000037', 'journal-recovery-org-a', '58000000-0000-4000-8000-000000000032', '58000000-0000-4000-8000-000000000036', '0058-unfenced-dispatch', 'VISITOR', '0058-scenario', 'chatgpt', 'RUNNING', clock_timestamp()); COMMIT;" 2>&1)"; then
	printf 'JOURNAL_0058_UNFENCED_RUN_COMMITTED\n' >&2
	exit 1
fi
if [[ "$unfenced_run" != *"JOURNAL_PROVIDER_BOUNDARY_REQUIRED"* ]]; then
	printf 'JOURNAL_0058_UNFENCED_RUN_WRONG_FAILURE\n' >&2
	exit 1
fi
if [[ "$("${psql[@]}" -qAtc "SELECT count(*) FROM sv_runs WHERE id='58000000-0000-4000-8000-000000000037';")" != "0" ]]; then
	printf 'JOURNAL_0058_UNFENCED_RUN_RESIDUE\n' >&2
	exit 1
fi

# Hold the same advisory key in a separate database session. Recovery must
# return BUSY immediately instead of waiting or racing a second decision.
("${psql[@]}" -c "BEGIN; SELECT pg_advisory_xact_lock(hashtextextended('selena-journal:journal-recovery-org-a:58000000-0000-4000-8000-000000000001', 0)); SELECT pg_sleep(2); COMMIT;" >/dev/null) &
holder_pid=$!
sleep 0.4
busy_receipt="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-recovery-org-a', false); SELECT sv_recover_journal_daily_claim('58000000-0000-4000-8000-000000000011', 'disposable-0058');")"
wait "$holder_pid"
if [[ "$busy_receipt" != $'journal-recovery-org-a\nBUSY' ]]; then
	printf 'JOURNAL_0058_BOUNDED_LOCK_FAILED\n' >&2
	exit 1
fi

"${psql[@]}" <<'SQL' >/dev/null
CREATE ROLE selena_recovery_probe NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO selena_recovery_probe;
GRANT SELECT, UPDATE ON sv_journal_daily_claims TO selena_recovery_probe;
GRANT SELECT ON sv_cycles, sv_runs, sv_run_permits, sv_cost_events, sv_journal_provider_boundaries TO selena_recovery_probe;
GRANT INSERT ON sv_audit_events TO selena_recovery_probe;
GRANT EXECUTE ON FUNCTION sv_journal_claim_recovery_state(uuid) TO selena_recovery_probe;
GRANT EXECUTE ON FUNCTION sv_recover_journal_daily_claim(uuid, text) TO selena_recovery_probe;
SQL
cross_tenant=''
if cross_tenant="$("${psql[@]}" -qAtc "BEGIN; SET LOCAL ROLE selena_recovery_probe; SET LOCAL app.organization_id='journal-recovery-org-b'; SELECT sv_recover_journal_daily_claim('58000000-0000-4000-8000-000000000011', 'disposable-0058'); ROLLBACK;" 2>&1)"; then
	printf 'JOURNAL_0058_CROSS_TENANT_RECOVERY_ALLOWED\n' >&2
	exit 1
fi
if [[ "$cross_tenant" != *"JOURNAL_RECOVERY_CLAIM_NOT_FOUND"* ]]; then
	printf 'JOURNAL_0058_CROSS_TENANT_WRONG_FAILURE\n' >&2
	exit 1
fi
"${psql[@]}" -c 'DROP OWNED BY selena_recovery_probe; DROP ROLE selena_recovery_probe;' >/dev/null

printf 'JOURNAL_0058_DISPOSABLE_PASS noSpend=exact executing=hold terminal=same-claim replay=idempotent lock=bounded crossTenant=blocked providerCalls=0 costRows=0\n'
