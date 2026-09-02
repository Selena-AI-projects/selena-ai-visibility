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
	0058_journal_provider_boundary_recovery \
	0059_journal_hold_owner_reconciliation; do
	"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/${migration}.sql" >/dev/null
done

"${psql[@]}" <<'SQL' >/dev/null
INSERT INTO organization (id, name, slug, created_at)
VALUES ('journal-hold-0059', 'Journal hold 0059', 'journal-hold-0059', clock_timestamp());
INSERT INTO sv_projects (id, organization_id, name, category, country, languages, status) VALUES (
	'59000000-0000-4000-8000-000000000001', 'journal-hold-0059', 'AVLI disposable',
	'test', 'ID', ARRAY['en'], 'ACTIVE'
), (
	'59000000-0000-4000-8000-000000000002', 'journal-hold-0059', 'Legacy cost disposable',
	'test', 'ID', ARRAY['en'], 'ACTIVE'
);
SELECT set_config('app.organization_id', 'journal-hold-0059', false);
INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'59000000-0000-4000-8000-000000000010', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000001', 'avli-0059',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'59000000-0000-4000-8000-000000000020', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000001', 1,
	jsonb_build_object('journalClaim', jsonb_build_object(
		'id', '59000000-0000-4000-8000-000000000010',
		'utcDay', (clock_timestamp() AT TIME ZONE 'UTC')::date::text,
		'attempt', 1
	)), '0059', 2, 0.5, 'disposable-0059'
);
UPDATE sv_journal_daily_claims
SET configuration_lock_id = '59000000-0000-4000-8000-000000000020', status = 'EXECUTING'
WHERE id = '59000000-0000-4000-8000-000000000010';
INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
) VALUES (
	'59000000-0000-4000-8000-000000000021', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000001', '59000000-0000-4000-8000-000000000020',
	'ACCEPTED', 0, 'USD', 2, clock_timestamp() + interval '1 day'
);
INSERT INTO sv_orders (id, organization_id, project_id, quote_id, lock_id, status, order_cap) VALUES (
	'59000000-0000-4000-8000-000000000022', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000001', '59000000-0000-4000-8000-000000000021',
	'59000000-0000-4000-8000-000000000020', 'QUEUED', 0.5
);
INSERT INTO sv_cycles (
	id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
) VALUES (
	'59000000-0000-4000-8000-000000000023', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000022', '59000000-0000-4000-8000-000000000020',
	'QUEUED', 2, 2, 0
);
INSERT INTO sv_run_permits (
	id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at
) VALUES
	('59000000-0000-4000-8000-000000000030', 'journal-hold-0059',
	 '59000000-0000-4000-8000-000000000023', '0059-consumed', 'VISITOR', 'avli-q1', 'ChatGPT',
	 'consumed', clock_timestamp() + interval '1 day', clock_timestamp()),
	('59000000-0000-4000-8000-000000000031', 'journal-hold-0059',
	 '59000000-0000-4000-8000-000000000023', '0059-issued', 'VISITOR', 'avli-q2', 'Gemini',
	 'issued', clock_timestamp() + interval '1 day', NULL);
BEGIN;
INSERT INTO sv_runs (
	id, organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status, started_at
) VALUES (
	'59000000-0000-4000-8000-000000000032', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000023', '59000000-0000-4000-8000-000000000030',
	'0059-consumed', 'VISITOR', 'avli-q1', 'ChatGPT', 'RUNNING', clock_timestamp()
);
INSERT INTO sv_journal_provider_boundaries (
	id, organization_id, project_id, journal_claim_id, configuration_lock_id,
	cycle_id, permit_id, run_id, dispatch_key, channel, system_id
) VALUES (
	'59000000-0000-4000-8000-000000000033', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000001', '59000000-0000-4000-8000-000000000010',
	'59000000-0000-4000-8000-000000000020', '59000000-0000-4000-8000-000000000023',
	'59000000-0000-4000-8000-000000000030', '59000000-0000-4000-8000-000000000032',
	'0059-consumed', 'VISITOR', 'ChatGPT'
);
COMMIT;
UPDATE sv_journal_daily_claims SET status = 'HOLD', updated_at = clock_timestamp() - interval '2 hours'
WHERE id = '59000000-0000-4000-8000-000000000010';

-- A pre-0058 cost row can exist without a provider boundary. It is evidence
-- of possible spend and must never produce a PROVEN_ZERO receipt.
INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'59000000-0000-4000-8000-000000000012', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000002', 'legacy-cost-0059',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'59000000-0000-4000-8000-000000000040', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000002', 1,
	jsonb_build_object('journalClaim', jsonb_build_object(
		'id', '59000000-0000-4000-8000-000000000012',
		'utcDay', (clock_timestamp() AT TIME ZONE 'UTC')::date::text,
		'attempt', 1
	)), '0059-legacy-cost', 1, 0.5, 'disposable-0059'
);
UPDATE sv_journal_daily_claims
SET configuration_lock_id = '59000000-0000-4000-8000-000000000040', status = 'EXECUTING'
WHERE id = '59000000-0000-4000-8000-000000000012';
INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
) VALUES (
	'59000000-0000-4000-8000-000000000041', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000002', '59000000-0000-4000-8000-000000000040',
	'ACCEPTED', 0, 'USD', 1, clock_timestamp() + interval '1 day'
);
INSERT INTO sv_orders (id, organization_id, project_id, quote_id, lock_id, status, order_cap) VALUES (
	'59000000-0000-4000-8000-000000000042', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000002', '59000000-0000-4000-8000-000000000041',
	'59000000-0000-4000-8000-000000000040', 'QUEUED', 0.5
);
INSERT INTO sv_cycles (
	id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
) VALUES (
	'59000000-0000-4000-8000-000000000043', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000042', '59000000-0000-4000-8000-000000000040',
	'QUEUED', 1, 1, 0
);
INSERT INTO sv_run_permits (
	id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at
) VALUES (
	'59000000-0000-4000-8000-000000000045', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000043', '0059-legacy-consumed', 'VISITOR', 'legacy-q1', 'ChatGPT',
	'consumed', clock_timestamp() + interval '1 day', clock_timestamp()
);
BEGIN;
INSERT INTO sv_runs (
	id, organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status, started_at
) VALUES (
	'59000000-0000-4000-8000-000000000046', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000043', '59000000-0000-4000-8000-000000000045',
	'0059-legacy-consumed', 'VISITOR', 'legacy-q1', 'ChatGPT', 'RUNNING', clock_timestamp()
);
INSERT INTO sv_journal_provider_boundaries (
	id, organization_id, project_id, journal_claim_id, configuration_lock_id,
	cycle_id, permit_id, run_id, dispatch_key, channel, system_id
) VALUES (
	'59000000-0000-4000-8000-000000000047', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000002', '59000000-0000-4000-8000-000000000012',
	'59000000-0000-4000-8000-000000000040', '59000000-0000-4000-8000-000000000043',
	'59000000-0000-4000-8000-000000000045', '59000000-0000-4000-8000-000000000046',
	'0059-legacy-consumed', 'VISITOR', 'ChatGPT'
);
COMMIT;
INSERT INTO sv_cost_events (
	id, organization_id, cycle_id, run_id, provider, amount_usd, basis
) VALUES
	(
	'59000000-0000-4000-8000-000000000048', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000043', '59000000-0000-4000-8000-000000000046',
	'current-provider', 0.020000, 'observed'
	), (
	'59000000-0000-4000-8000-000000000044', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000043', NULL, 'legacy-provider', 0.010000, 'legacy-observed'
);
UPDATE sv_journal_daily_claims SET status = 'HOLD', updated_at = clock_timestamp() - interval '2 hours'
WHERE id = '59000000-0000-4000-8000-000000000012';
SQL

not_quiesced=''
if not_quiesced="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'owner-decision-disposable-0059', false, true);" 2>&1)"; then
	printf 'JOURNAL_0059_NON_QUIESCED_RECONCILIATION_ALLOWED\n' >&2
	exit 1
fi
if [[ "$not_quiesced" != *"JOURNAL_HOLD_RECONCILIATION_RUNTIME_NOT_QUIESCED"* ]]; then
	printf 'JOURNAL_0059_NON_QUIESCED_WRONG_FAILURE\n' >&2
	exit 1
fi

ambiguous_unacknowledged=''
if ambiguous_unacknowledged="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'owner-decision-disposable-0059', true, false);" 2>&1)"; then
	printf 'JOURNAL_0059_AMBIGUOUS_SPEND_NOT_ACKNOWLEDGED_ALLOWED\n' >&2
	exit 1
fi
if [[ "$ambiguous_unacknowledged" != *"JOURNAL_HOLD_RECONCILIATION_AMBIGUOUS_SPEND_ACK_REQUIRED"* ]]; then
	printf 'JOURNAL_0059_AMBIGUOUS_SPEND_WRONG_FAILURE\n' >&2
	exit 1
fi

legacy_cost_unacknowledged=''
if legacy_cost_unacknowledged="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000012', 'disposable-0059', 'owner-decision-legacy-cost-0059', true, false);" 2>&1)"; then
	printf 'JOURNAL_0059_LEGACY_COST_NOT_ACKNOWLEDGED_ALLOWED\n' >&2
	exit 1
fi
if [[ "$legacy_cost_unacknowledged" != *"JOURNAL_HOLD_RECONCILIATION_AMBIGUOUS_SPEND_ACK_REQUIRED"* ]]; then
	printf 'JOURNAL_0059_LEGACY_COST_WRONG_FAILURE\n' >&2
	exit 1
fi
legacy_cost_receipt="$("${psql[@]}" -qAtc "BEGIN; SELECT set_config('app.organization_id', 'journal-hold-0059', true); SELECT concat_ws(':', result->>'decision', coalesce(result->>'providerCalls', 'NULL'), result->>'providerCallsStatus', result->>'providerCallUpperBound', result->>'costEventCount', result->>'unmatchedCostEventCount', result->>'observedCostUsd') FROM (SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000012', 'disposable-0059', 'owner-decision-legacy-cost-0059', true, true) AS result) AS reconciliation; ROLLBACK;")"
if [[ "$legacy_cost_receipt" != $'journal-hold-0059\nRECONCILED:NULL:UNKNOWN_WITHIN_UPPER_BOUND:2:2:1:0.030000' ]]; then
	printf 'JOURNAL_0059_LEGACY_COST_RECEIPT_MISMATCH:%s\n' "$legacy_cost_receipt" >&2
	exit 1
fi

wrong_tenant=''
if wrong_tenant="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'other-tenant', false); SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'owner-decision-disposable-0059', true, true);" 2>&1)"; then
	printf 'JOURNAL_0059_WRONG_TENANT_ALLOWED\n' >&2
	exit 1
fi
if [[ "$wrong_tenant" != *"JOURNAL_HOLD_RECONCILIATION_CLAIM_NOT_FOUND"* ]]; then
	printf 'JOURNAL_0059_WRONG_TENANT_WRONG_FAILURE\n' >&2
	exit 1
fi

"${psql[@]}" <<'SQL' >/dev/null
SELECT set_config('app.organization_id', 'journal-hold-0059', false);
ALTER TABLE sv_journal_daily_claims DISABLE TRIGGER sv_guard_journal_daily_claim_mutation;
UPDATE sv_journal_daily_claims SET updated_at = clock_timestamp()
WHERE id = '59000000-0000-4000-8000-000000000010';
ALTER TABLE sv_journal_daily_claims ENABLE TRIGGER sv_guard_journal_daily_claim_mutation;
SQL
active_lease=''
if active_lease="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'owner-decision-disposable-0059', true, true);" 2>&1)"; then
	printf 'JOURNAL_0059_ACTIVE_LEASE_ALLOWED\n' >&2
	exit 1
fi
if [[ "$active_lease" != *"JOURNAL_HOLD_RECONCILIATION_LEASE_ACTIVE"* ]]; then
	printf 'JOURNAL_0059_ACTIVE_LEASE_WRONG_FAILURE\n' >&2
	exit 1
fi
"${psql[@]}" <<'SQL' >/dev/null
ALTER TABLE sv_journal_daily_claims DISABLE TRIGGER sv_guard_journal_daily_claim_mutation;
UPDATE sv_journal_daily_claims SET updated_at = clock_timestamp() - interval '2 hours'
WHERE id = '59000000-0000-4000-8000-000000000010';
ALTER TABLE sv_journal_daily_claims ENABLE TRIGGER sv_guard_journal_daily_claim_mutation;
CREATE SCHEMA pgboss;
CREATE TABLE pgboss.job (name text NOT NULL, state text NOT NULL);
INSERT INTO pgboss.job (name, state) VALUES ('selena-measure', 'active');
SQL
active_job=''
if active_job="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'owner-decision-disposable-0059', true, true);" 2>&1)"; then
	printf 'JOURNAL_0059_ACTIVE_JOB_ALLOWED\n' >&2
	exit 1
fi
if [[ "$active_job" != *"JOURNAL_HOLD_RECONCILIATION_ACTIVE_JOB"* ]]; then
	printf 'JOURNAL_0059_ACTIVE_JOB_WRONG_FAILURE\n' >&2
	exit 1
fi
"${psql[@]}" -c "DELETE FROM pgboss.job;" >/dev/null

inconsistent_execution=''
if inconsistent_execution="$("${psql[@]}" -c "BEGIN; SELECT set_config('app.organization_id', 'journal-hold-0059', true); INSERT INTO sv_run_permits (id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at) VALUES ('59000000-0000-4000-8000-000000000034', 'journal-hold-0059', '59000000-0000-4000-8000-000000000023', '0059-orphan-consumed', 'VISITOR', 'avli-q3', 'Perplexity', 'consumed', clock_timestamp() + interval '1 day', clock_timestamp()); SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'owner-decision-disposable-0059', true, true); ROLLBACK;" 2>&1)"; then
	printf 'JOURNAL_0059_INCONSISTENT_EXECUTION_ALLOWED\n' >&2
	exit 1
fi
if [[ "$inconsistent_execution" != *"JOURNAL_HOLD_RECONCILIATION_EXECUTION_INVARIANT"* ]]; then
	printf 'JOURNAL_0059_INCONSISTENT_EXECUTION_WRONG_FAILURE\n' >&2
	exit 1
fi

direct_update=''
if direct_update="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0059', false); UPDATE sv_journal_daily_claims SET status='RECONCILED', reconciled_at=clock_timestamp(), reconciliation_reason='direct-update', reconciled_by='direct-owner', updated_at=clock_timestamp() WHERE id='59000000-0000-4000-8000-000000000010';" 2>&1)"; then
	printf 'JOURNAL_0059_DIRECT_UPDATE_ALLOWED\n' >&2
	exit 1
fi
if [[ "$direct_update" != *"JOURNAL_HOLD_RECONCILIATION_FUNCTION_REQUIRED"* ]]; then
	printf 'JOURNAL_0059_DIRECT_UPDATE_WRONG_FAILURE\n' >&2
	exit 1
fi

"${psql[@]}" <<'SQL' >/dev/null
CREATE ROLE selena_hold_probe NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT EXECUTE ON FUNCTION sv_reconcile_journal_hold(uuid, text, text, boolean, boolean) TO selena_hold_probe;
GRANT SELECT, UPDATE ON sv_journal_daily_claims TO selena_hold_probe;
GRANT SELECT ON sv_configuration_locks TO selena_hold_probe;
SQL
non_owner=''
if non_owner="$("${psql[@]}" -c "SET SESSION AUTHORIZATION selena_hold_probe; SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'owner-decision-disposable-0059', true, true);" 2>&1)"; then
	printf 'JOURNAL_0059_NON_OWNER_ALLOWED\n' >&2
	exit 1
fi
if [[ "$non_owner" != *"JOURNAL_HOLD_RECONCILIATION_OWNER_REQUIRED"* ]]; then
	printf 'JOURNAL_0059_NON_OWNER_WRONG_FAILURE\n' >&2
	exit 1
fi
spoofed_guc=''
if spoofed_guc="$("${psql[@]}" -c "SET SESSION AUTHORIZATION selena_hold_probe; SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT set_config('app.journal_hold_reconciliation', '59000000-0000-4000-8000-000000000010', false); UPDATE sv_journal_daily_claims SET status='RECONCILED', reconciled_at=clock_timestamp(), reconciliation_reason='spoofed-guc', reconciled_by='selena-hold-probe', updated_at=clock_timestamp() WHERE id='59000000-0000-4000-8000-000000000010';" 2>&1)"; then
	printf 'JOURNAL_0059_NON_OWNER_GUC_SPOOF_ALLOWED\n' >&2
	exit 1
fi
if [[ "$spoofed_guc" != *"JOURNAL_HOLD_RECONCILIATION_FUNCTION_REQUIRED"* ]]; then
	printf 'JOURNAL_0059_NON_OWNER_GUC_SPOOF_WRONG_FAILURE\n' >&2
	exit 1
fi
"${psql[@]}" -c 'DROP OWNED BY selena_hold_probe; DROP ROLE selena_hold_probe;' >/dev/null

receipt="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT concat_ws(':', result->>'decision', coalesce(result->>'providerCalls', 'NULL'), result->>'providerCallsStatus', result->>'revokedPermitCount', result->>'settledRunCount', result->>'costEventCount', result->>'unmatchedCostEventCount', result->>'historicalExposureCapUsd') FROM (SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'owner-decision-disposable-0059', true, true) AS result) AS reconciliation;")"
if [[ "$receipt" != $'journal-hold-0059\nRECONCILED:NULL:UNKNOWN_WITHIN_UPPER_BOUND:1:1:0:0:0.500000' ]]; then
	printf 'JOURNAL_0059_RECONCILIATION_FAILED\n' >&2
	exit 1
fi
replay="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT concat_ws(':', result->>'decision', coalesce(result->>'providerCalls', 'NULL'), result->>'providerCallsStatus', result->>'revokedPermitCount', result->>'settledRunCount', result->>'costEventCount', result->>'unmatchedCostEventCount', result->>'historicalExposureCapUsd') FROM (SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'owner-decision-disposable-0059', true, true) AS result) AS reconciliation;")"
if [[ "$replay" != $'journal-hold-0059\nALREADY_RECONCILED:NULL:UNKNOWN_WITHIN_UPPER_BOUND:1:1:0:0:0.500000' ]]; then
	printf 'JOURNAL_0059_REPLAY_FAILED\n' >&2
	exit 1
fi

wrong_replay=''
if wrong_replay="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT sv_reconcile_journal_hold('59000000-0000-4000-8000-000000000010', 'disposable-0059', 'different-owner-decision-0059', true, true);" 2>&1)"; then
	printf 'JOURNAL_0059_WRONG_REPLAY_IDENTITY_ALLOWED\n' >&2
	exit 1
fi
if [[ "$wrong_replay" != *"JOURNAL_HOLD_RECONCILIATION_REPLAY_IDENTITY_MISMATCH"* ]]; then
	printf 'JOURNAL_0059_WRONG_REPLAY_IDENTITY_WRONG_FAILURE\n' >&2
	exit 1
fi

state="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-hold-0059', false); SELECT concat_ws(':', (SELECT status FROM sv_journal_daily_claims WHERE id='59000000-0000-4000-8000-000000000010'), (SELECT status FROM sv_run_permits WHERE id='59000000-0000-4000-8000-000000000031'), (SELECT status FROM sv_runs WHERE id='59000000-0000-4000-8000-000000000032'), (SELECT status FROM sv_cycles WHERE id='59000000-0000-4000-8000-000000000023'), (SELECT completed_runs FROM sv_cycles WHERE id='59000000-0000-4000-8000-000000000023'), (SELECT status FROM sv_orders WHERE id='59000000-0000-4000-8000-000000000022'), (SELECT count(*) FROM sv_audit_events WHERE organization_id='journal-hold-0059' AND event='JOURNAL_DAILY_CLAIM_RECONCILED'), (SELECT count(*) FROM sv_incidents WHERE organization_id='journal-hold-0059' AND kind='OWNER_RECONCILED_JOURNAL_HOLD' AND status='RESOLVED' AND resolved_at IS NOT NULL), (SELECT count(*) FROM sv_cost_events WHERE organization_id='journal-hold-0059' AND cycle_id='59000000-0000-4000-8000-000000000023'));")"
if [[ "$state" != $'journal-hold-0059\nRECONCILED:revoked:FAILED:STOPPED:1:CANCELLED:1:1:0' ]]; then
	printf 'JOURNAL_0059_STATE_MISMATCH:%s\n' "$state" >&2
	exit 1
fi

"${psql[@]}" <<'SQL' >/dev/null
SELECT set_config('app.organization_id', 'journal-hold-0059', false);
INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'59000000-0000-4000-8000-000000000011', 'journal-hold-0059',
	'59000000-0000-4000-8000-000000000001', 'avli-0059',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 2, clock_timestamp(), clock_timestamp()
);
SQL

printf 'JOURNAL_0059_DISPOSABLE_PASS ownerOnly=true runtimeQuiesced=true ambiguousSpend=preserved upperBound=1 mixedLegacyUpperBound=2 legacyCost=ack-required revoked=1 settled=1 replay=idempotent costRows=0 nextAttempt=allowed\n'
