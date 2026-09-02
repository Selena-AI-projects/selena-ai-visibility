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
	0057_evidence_project_identity_hardening; do
	"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/${migration}.sql" >/dev/null
done

# This is the exact pre-0058 legacy topology seen in staging: four consumed
# permits paired with four unfinished runs, with no boundary or downstream
# spend/evidence rows. It must remain visibly ambiguous; no migration may
# fabricate PRE_TRANSPORT fences for it.
"${psql[@]}" <<'SQL' >/dev/null
INSERT INTO organization (id, name, slug, created_at)
VALUES ('journal-hold-0060', 'Journal hold 0060', 'journal-hold-0060', clock_timestamp());
INSERT INTO sv_projects (id, organization_id, name, category, country, languages, status) VALUES (
	'60000000-0000-4000-8000-000000000004', 'journal-hold-0060', 'Legacy unfenced AVLI disposable',
	'test', 'ID', ARRAY['en'], 'ACTIVE'
);
SELECT set_config('app.organization_id', 'journal-hold-0060', false);
INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'60000000-0000-4000-8000-000000000014', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000004', 'legacy-unfenced-0060',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'60000000-0000-4000-8000-000000000060', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000004', 1,
	jsonb_build_object('journalClaim', jsonb_build_object(
		'id', '60000000-0000-4000-8000-000000000014',
		'utcDay', (clock_timestamp() AT TIME ZONE 'UTC')::date::text,
		'attempt', 1
	)), 'legacy-unfenced-0060', 75, 0.5, 'disposable-0060'
);
UPDATE sv_journal_daily_claims
SET configuration_lock_id = '60000000-0000-4000-8000-000000000060', status = 'EXECUTING'
WHERE id = '60000000-0000-4000-8000-000000000014';
INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
) VALUES (
	'60000000-0000-4000-8000-000000000061', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000060',
	'ACCEPTED', 0, 'USD', 75, clock_timestamp() + interval '1 day'
);
INSERT INTO sv_orders (id, organization_id, project_id, quote_id, lock_id, status, order_cap) VALUES (
	'60000000-0000-4000-8000-000000000062', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000061',
	'60000000-0000-4000-8000-000000000060', 'QUEUED', 0.5
);
INSERT INTO sv_cycles (
	id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
) VALUES (
	'60000000-0000-4000-8000-000000000063', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000062', '60000000-0000-4000-8000-000000000060',
	'QUEUED', 75, 75, 0
);
INSERT INTO sv_run_permits (
	id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at
) VALUES
	('60000000-0000-4000-8000-000000000070', 'journal-hold-0060', '60000000-0000-4000-8000-000000000063', '0060-legacy-unfenced-1', 'VISITOR', 'legacy-q1', 'ChatGPT', 'consumed', clock_timestamp() + interval '1 day', clock_timestamp()),
	('60000000-0000-4000-8000-000000000071', 'journal-hold-0060', '60000000-0000-4000-8000-000000000063', '0060-legacy-unfenced-2', 'VISITOR', 'legacy-q2', 'Gemini', 'consumed', clock_timestamp() + interval '1 day', clock_timestamp()),
	('60000000-0000-4000-8000-000000000072', 'journal-hold-0060', '60000000-0000-4000-8000-000000000063', '0060-legacy-unfenced-3', 'VISITOR', 'legacy-q3', 'Perplexity', 'consumed', clock_timestamp() + interval '1 day', clock_timestamp()),
	('60000000-0000-4000-8000-000000000073', 'journal-hold-0060', '60000000-0000-4000-8000-000000000063', '0060-legacy-unfenced-4', 'VISITOR', 'legacy-q4', 'ChatGPT', 'consumed', clock_timestamp() + interval '1 day', clock_timestamp());
INSERT INTO sv_run_permits (
	id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at
)
SELECT
	('60000000-0000-4000-8000-' || lpad(ordinal::text, 12, '0'))::uuid,
	'journal-hold-0060',
	'60000000-0000-4000-8000-000000000063',
	'0060-legacy-issued-' || ordinal::text,
	'VISITOR',
	'legacy-issued-q' || ordinal::text,
	(ARRAY['ChatGPT', 'Gemini', 'Perplexity'])[((ordinal - 100) % 3) + 1],
	'issued',
	clock_timestamp() + interval '1 day',
	NULL
FROM generate_series(100, 170) AS issued(ordinal);
INSERT INTO sv_runs (
	id, organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status, started_at
) VALUES
	('60000000-0000-4000-8000-000000000074', 'journal-hold-0060', '60000000-0000-4000-8000-000000000063', '60000000-0000-4000-8000-000000000070', '0060-legacy-unfenced-1', 'VISITOR', 'legacy-q1', 'ChatGPT', 'RUNNING', clock_timestamp() - interval '2 hours'),
	('60000000-0000-4000-8000-000000000075', 'journal-hold-0060', '60000000-0000-4000-8000-000000000063', '60000000-0000-4000-8000-000000000071', '0060-legacy-unfenced-2', 'VISITOR', 'legacy-q2', 'Gemini', 'RUNNING', clock_timestamp() - interval '2 hours'),
	('60000000-0000-4000-8000-000000000076', 'journal-hold-0060', '60000000-0000-4000-8000-000000000063', '60000000-0000-4000-8000-000000000072', '0060-legacy-unfenced-3', 'VISITOR', 'legacy-q3', 'Perplexity', 'RUNNING', clock_timestamp() - interval '2 hours'),
	('60000000-0000-4000-8000-000000000077', 'journal-hold-0060', '60000000-0000-4000-8000-000000000063', '60000000-0000-4000-8000-000000000073', '0060-legacy-unfenced-4', 'VISITOR', 'legacy-q4', 'ChatGPT', 'RUNNING', clock_timestamp() - interval '2 hours');
UPDATE sv_journal_daily_claims SET status = 'HOLD', updated_at = clock_timestamp() - interval '2 hours'
WHERE id = '60000000-0000-4000-8000-000000000014';

-- Historical circuit-breaker cancellation is a distinct terminal, unspent
-- state. The staging upgrade path contains exactly this shape and 0060 must
-- preserve it without laundering the provenance into owner revocation.
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'60000000-0000-4000-8001-000000000080', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000004', 2, '{}'::jsonb,
	'historical-cancelled-0060', 11, 0, 'disposable-0060'
);
INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
) VALUES (
	'60000000-0000-4000-8001-000000000081', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000004', '60000000-0000-4000-8001-000000000080',
	'ACCEPTED', 0, 'USD', 11, clock_timestamp() + interval '1 day'
);
INSERT INTO sv_orders (id, organization_id, project_id, quote_id, lock_id, status, order_cap) VALUES (
	'60000000-0000-4000-8001-000000000082', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000004', '60000000-0000-4000-8001-000000000081',
	'60000000-0000-4000-8001-000000000080', 'CANCELLED', 0
);
INSERT INTO sv_cycles (
	id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
) VALUES (
	'60000000-0000-4000-8001-000000000083', 'journal-hold-0060',
	'60000000-0000-4000-8001-000000000082', '60000000-0000-4000-8001-000000000080',
	'STOPPED', 11, 11, 0
);
INSERT INTO sv_run_permits (
	id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at
)
SELECT
	('60000000-0000-4000-8001-' || lpad(ordinal::text, 12, '0'))::uuid,
	'journal-hold-0060', '60000000-0000-4000-8001-000000000083',
	'0060-historical-cancelled-' || ordinal::text, 'VISITOR',
	'historical-cancelled-q' || ordinal::text, 'Perplexity', 'cancelled',
	clock_timestamp() + interval '1 day', NULL
FROM generate_series(201, 211) AS cancelled(ordinal);
SQL

for migration in \
	0058_journal_provider_boundary_recovery \
	0059_journal_no_spend_reconciliation; do
	"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/${migration}.sql" >/dev/null
done
"${psql[@]}" -c 'CREATE ROLE selena_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;' >/dev/null
"${psql[@]}" --single-transaction \
	< "$repo_root/packages/lib/src/db/migrations/0060_journal_hold_owner_reconciliation.sql" >/dev/null

legacy_cancelled_shape="$("${psql[@]}" -qAtc "SELECT concat_ws(':', count(*), count(*) FILTER (WHERE consumed_at IS NULL), count(*) FILTER (WHERE status='cancelled')) FROM sv_run_permits WHERE cycle_id='60000000-0000-4000-8001-000000000083';")"
if [[ "$legacy_cancelled_shape" != '11:11:11' ]]; then
	printf 'JOURNAL_0060_LEGACY_CANCELLED_NOT_PRESERVED:%s\n' "$legacy_cancelled_shape" >&2
	exit 1
fi
invalid_permit_status=''
if invalid_permit_status="$("${psql[@]}" -c "UPDATE sv_run_permits SET status='unknown' WHERE id='60000000-0000-4000-8001-000000000201';" 2>&1)"; then
	printf 'JOURNAL_0060_INVALID_PERMIT_STATUS_ALLOWED\n' >&2
	exit 1
fi
if [[ "$invalid_permit_status" != *"sv_run_permits_status_check"* ]]; then
	printf 'JOURNAL_0060_INVALID_PERMIT_STATUS_WRONG_FAILURE\n' >&2
	exit 1
fi

"${psql[@]}" <<'SQL' >/dev/null
INSERT INTO sv_projects (id, organization_id, name, category, country, languages, status) VALUES (
	'60000000-0000-4000-8000-000000000001', 'journal-hold-0060', 'AVLI disposable',
	'test', 'ID', ARRAY['en'], 'ACTIVE'
), (
	'60000000-0000-4000-8000-000000000002', 'journal-hold-0060', 'Legacy cost disposable',
	'test', 'ID', ARRAY['en'], 'ACTIVE'
), (
	'60000000-0000-4000-8000-000000000003', 'journal-hold-0060', 'Post-0060 no-spend disposable',
	'test', 'ID', ARRAY['en'], 'ACTIVE'
);
SELECT set_config('app.organization_id', 'journal-hold-0060', false);
INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'60000000-0000-4000-8000-000000000010', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000001', 'avli-0060',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'60000000-0000-4000-8000-000000000020', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000001', 1,
	jsonb_build_object('journalClaim', jsonb_build_object(
		'id', '60000000-0000-4000-8000-000000000010',
		'utcDay', (clock_timestamp() AT TIME ZONE 'UTC')::date::text,
		'attempt', 1
	)), '0060', 2, 0.5, 'disposable-0060'
);
UPDATE sv_journal_daily_claims
SET configuration_lock_id = '60000000-0000-4000-8000-000000000020', status = 'EXECUTING'
WHERE id = '60000000-0000-4000-8000-000000000010';
INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
) VALUES (
	'60000000-0000-4000-8000-000000000021', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000020',
	'ACCEPTED', 0, 'USD', 2, clock_timestamp() + interval '1 day'
);
INSERT INTO sv_orders (id, organization_id, project_id, quote_id, lock_id, status, order_cap) VALUES (
	'60000000-0000-4000-8000-000000000022', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000021',
	'60000000-0000-4000-8000-000000000020', 'QUEUED', 0.5
);
INSERT INTO sv_cycles (
	id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
) VALUES (
	'60000000-0000-4000-8000-000000000023', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000022', '60000000-0000-4000-8000-000000000020',
	'QUEUED', 2, 2, 0
);
INSERT INTO sv_run_permits (
	id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at
) VALUES
	('60000000-0000-4000-8000-000000000030', 'journal-hold-0060',
	 '60000000-0000-4000-8000-000000000023', '0060-consumed', 'VISITOR', 'avli-q1', 'ChatGPT',
	 'consumed', clock_timestamp() + interval '1 day', clock_timestamp()),
	('60000000-0000-4000-8000-000000000031', 'journal-hold-0060',
	 '60000000-0000-4000-8000-000000000023', '0060-issued', 'VISITOR', 'avli-q2', 'Gemini',
	 'issued', clock_timestamp() + interval '1 day', NULL);
BEGIN;
INSERT INTO sv_runs (
	id, organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status, started_at
) VALUES (
	'60000000-0000-4000-8000-000000000032', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000023', '60000000-0000-4000-8000-000000000030',
	'0060-consumed', 'VISITOR', 'avli-q1', 'ChatGPT', 'RUNNING', clock_timestamp()
);
INSERT INTO sv_journal_provider_boundaries (
	id, organization_id, project_id, journal_claim_id, configuration_lock_id,
	cycle_id, permit_id, run_id, dispatch_key, channel, system_id
) VALUES (
	'60000000-0000-4000-8000-000000000033', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000010',
	'60000000-0000-4000-8000-000000000020', '60000000-0000-4000-8000-000000000023',
	'60000000-0000-4000-8000-000000000030', '60000000-0000-4000-8000-000000000032',
	'0060-consumed', 'VISITOR', 'ChatGPT'
);
COMMIT;
UPDATE sv_journal_daily_claims SET status = 'HOLD', updated_at = clock_timestamp() - interval '2 hours'
WHERE id = '60000000-0000-4000-8000-000000000010';

-- A pre-0058 cost row can exist without a provider boundary. It is evidence
-- of possible spend and must never produce a PROVEN_ZERO receipt.
INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'60000000-0000-4000-8000-000000000012', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000002', 'legacy-cost-0060',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '2 hours', clock_timestamp() - interval '2 hours'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'60000000-0000-4000-8000-000000000040', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000002', 1,
	jsonb_build_object('journalClaim', jsonb_build_object(
		'id', '60000000-0000-4000-8000-000000000012',
		'utcDay', (clock_timestamp() AT TIME ZONE 'UTC')::date::text,
		'attempt', 1
	)), '0060-legacy-cost', 1, 0.5, 'disposable-0060'
);
UPDATE sv_journal_daily_claims
SET configuration_lock_id = '60000000-0000-4000-8000-000000000040', status = 'EXECUTING'
WHERE id = '60000000-0000-4000-8000-000000000012';
INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
) VALUES (
	'60000000-0000-4000-8000-000000000041', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000040',
	'ACCEPTED', 0, 'USD', 1, clock_timestamp() + interval '1 day'
);
INSERT INTO sv_orders (id, organization_id, project_id, quote_id, lock_id, status, order_cap) VALUES (
	'60000000-0000-4000-8000-000000000042', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000041',
	'60000000-0000-4000-8000-000000000040', 'QUEUED', 0.5
);
INSERT INTO sv_cycles (
	id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
) VALUES (
	'60000000-0000-4000-8000-000000000043', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000042', '60000000-0000-4000-8000-000000000040',
	'QUEUED', 1, 1, 0
);
INSERT INTO sv_run_permits (
	id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at
) VALUES (
	'60000000-0000-4000-8000-000000000045', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000043', '0060-legacy-consumed', 'VISITOR', 'legacy-q1', 'ChatGPT',
	'consumed', clock_timestamp() + interval '1 day', clock_timestamp()
);
BEGIN;
INSERT INTO sv_runs (
	id, organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status, started_at
) VALUES (
	'60000000-0000-4000-8000-000000000046', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000043', '60000000-0000-4000-8000-000000000045',
	'0060-legacy-consumed', 'VISITOR', 'legacy-q1', 'ChatGPT', 'RUNNING', clock_timestamp()
);
INSERT INTO sv_journal_provider_boundaries (
	id, organization_id, project_id, journal_claim_id, configuration_lock_id,
	cycle_id, permit_id, run_id, dispatch_key, channel, system_id
) VALUES (
	'60000000-0000-4000-8000-000000000047', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000012',
	'60000000-0000-4000-8000-000000000040', '60000000-0000-4000-8000-000000000043',
	'60000000-0000-4000-8000-000000000045', '60000000-0000-4000-8000-000000000046',
	'0060-legacy-consumed', 'VISITOR', 'ChatGPT'
);
COMMIT;
INSERT INTO sv_cost_events (
	id, organization_id, cycle_id, run_id, provider, amount_usd, basis
) VALUES
	(
	'60000000-0000-4000-8000-000000000048', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000043', '60000000-0000-4000-8000-000000000046',
	'current-provider', 0.020000, 'observed'
	), (
	'60000000-0000-4000-8000-000000000044', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000043', NULL, 'legacy-provider', 0.010000, 'legacy-observed'
);
UPDATE sv_journal_daily_claims SET status = 'HOLD', updated_at = clock_timestamp() - interval '2 hours'
WHERE id = '60000000-0000-4000-8000-000000000012';

-- A zero-run certificate proves that 0060 preserved 0059's positive
-- owner-only HOLD -> NO_SPEND path after replacing the shared claim guard.
INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'60000000-0000-4000-8000-000000000013', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000003', 'no-spend-0060',
	((clock_timestamp() - interval '6 hours') AT TIME ZONE 'UTC')::date, 1,
	clock_timestamp() - interval '6 hours', clock_timestamp() - interval '6 hours'
);
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
) VALUES (
	'60000000-0000-4000-8000-000000000050', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000003', 1,
	jsonb_build_object('journalClaim', jsonb_build_object(
		'id', '60000000-0000-4000-8000-000000000013',
		'utcDay', ((clock_timestamp() - interval '6 hours') AT TIME ZONE 'UTC')::date::text,
		'attempt', 1
	)), '0060-no-spend', 0, 0, 'disposable-0060'
);
UPDATE sv_journal_daily_claims
SET configuration_lock_id = '60000000-0000-4000-8000-000000000050', status = 'EXECUTING',
	updated_at = clock_timestamp() - interval '5 hours 59 minutes'
WHERE id = '60000000-0000-4000-8000-000000000013';
INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
) VALUES (
	'60000000-0000-4000-8000-000000000051', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000050',
	'ISSUED', 0, 'USD', 0, clock_timestamp() + interval '1 day'
);
INSERT INTO sv_orders (id, organization_id, project_id, quote_id, lock_id, status, order_cap) VALUES (
	'60000000-0000-4000-8000-000000000052', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000051',
	'60000000-0000-4000-8000-000000000050', 'RUNNING', 0
);
INSERT INTO sv_cycles (
	id, organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
) VALUES (
	'60000000-0000-4000-8000-000000000053', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000052', '60000000-0000-4000-8000-000000000050',
	'RUNNING', 0, 0, 0
);
UPDATE sv_journal_daily_claims
SET status = 'HOLD', updated_at = clock_timestamp() - interval '1 hour'
WHERE id = '60000000-0000-4000-8000-000000000013';
SQL

if [[ "$("${psql[@]}" -Atc "SELECT has_function_privilege('selena_app', 'public.sv_reconcile_journal_hold(uuid,text,text,boolean,boolean)', 'EXECUTE')")" != 'f' ]]; then
	printf 'JOURNAL_0060_RUNTIME_EXECUTE_PRIVILEGE_LEAKED\n' >&2
	exit 1
fi

legacy_before="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT concat_ws(':', (SELECT status FROM sv_journal_daily_claims WHERE id='60000000-0000-4000-8000-000000000014'), (SELECT expected_runs FROM sv_cycles WHERE id='60000000-0000-4000-8000-000000000063'), (SELECT created_runs FROM sv_cycles WHERE id='60000000-0000-4000-8000-000000000063'), (SELECT count(*) FROM sv_run_permits WHERE cycle_id='60000000-0000-4000-8000-000000000063'), (SELECT count(*) FROM sv_run_permits WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND status='issued'), (SELECT count(*) FROM sv_run_permits WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND status='consumed'), (SELECT count(*) FROM sv_runs WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND status='RUNNING' AND finished_at IS NULL), (SELECT count(*) FROM sv_journal_provider_boundaries WHERE journal_claim_id='60000000-0000-4000-8000-000000000014'), (SELECT count(*) FROM sv_cost_events WHERE cycle_id='60000000-0000-4000-8000-000000000063'), (SELECT count(*) FROM sv_response_mentions WHERE cycle_id='60000000-0000-4000-8000-000000000063'), (SELECT count(*) FROM sv_citation_gap_snapshots WHERE cycle_id='60000000-0000-4000-8000-000000000063'), (SELECT count(*) FROM sv_source_snapshots WHERE organization_id='journal-hold-0060' AND project_id='60000000-0000-4000-8000-000000000004'), (SELECT count(*) FROM sv_evidence_index WHERE organization_id='journal-hold-0060' AND project_id='60000000-0000-4000-8000-000000000004'), (SELECT count(*) FROM sv_evidence_acceptance_receipts WHERE organization_id='journal-hold-0060'));")"
if [[ "$legacy_before" != $'journal-hold-0060\nHOLD:75:75:75:71:4:4:0:0:0:0:0:0:0' ]]; then
	printf 'JOURNAL_0060_LEGACY_INITIAL_STATE_MISMATCH:%s\n' "$legacy_before" >&2
	exit 1
fi

legacy_unacknowledged=''
if legacy_unacknowledged="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000014', 'disposable-0060', 'owner-decision-legacy-unfenced-0060', true, false);" 2>&1)"; then
	printf 'JOURNAL_0060_LEGACY_AMBIGUOUS_SPEND_NOT_ACKNOWLEDGED_ALLOWED\n' >&2
	exit 1
fi
if [[ "$legacy_unacknowledged" != *"JOURNAL_HOLD_RECONCILIATION_AMBIGUOUS_SPEND_ACK_REQUIRED"* ]]; then
	printf 'JOURNAL_0060_LEGACY_AMBIGUOUS_SPEND_WRONG_FAILURE\n' >&2
	exit 1
fi

legacy_mismatched_run=''
if legacy_mismatched_run="$("${psql[@]}" -c "BEGIN; SELECT set_config('app.organization_id', 'journal-hold-0060', true); UPDATE sv_runs SET dispatch_key='0060-legacy-mismatch' WHERE id='60000000-0000-4000-8000-000000000074'; SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000014', 'disposable-0060', 'owner-decision-legacy-unfenced-0060', true, true); ROLLBACK;" 2>&1)"; then
	printf 'JOURNAL_0060_LEGACY_MISMATCHED_RUN_ALLOWED\n' >&2
	exit 1
fi
if [[ "$legacy_mismatched_run" != *"JOURNAL_HOLD_RECONCILIATION_EXECUTION_INVARIANT"* ]]; then
	printf 'JOURNAL_0060_LEGACY_MISMATCHED_RUN_WRONG_FAILURE\n' >&2
	exit 1
fi

legacy_dry_run="$("${psql[@]}" -qAtc "BEGIN; SELECT set_config('app.organization_id', 'journal-hold-0060', true); SELECT concat_ws(':', result->>'decision', coalesce(result->>'providerCalls', 'NULL'), result->>'providerCallsStatus', result->>'providerCallUpperBound', result->>'legacyUnfencedRunCount', result->>'legacyUnfencedProviderCallUpperBound', result->>'boundaryBackedRunCount', result->>'revokedPermitCount', result->>'costEventCount', result->>'unmatchedCostEventCount') FROM (SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000014', 'disposable-0060', 'owner-decision-legacy-unfenced-0060', true, true) AS result) AS reconciliation; ROLLBACK;")"
if [[ "$legacy_dry_run" != $'journal-hold-0060\nRECONCILED:NULL:UNKNOWN_WITHIN_UPPER_BOUND:4:4:4:0:71:0:0' ]]; then
	printf 'JOURNAL_0060_LEGACY_DRY_RUN_RECEIPT_MISMATCH:%s\n' "$legacy_dry_run" >&2
	exit 1
fi
legacy_after_dry_run="$("${psql[@]}" -Atc "SELECT concat_ws(':', (SELECT status FROM sv_journal_daily_claims WHERE id='60000000-0000-4000-8000-000000000014'), (SELECT count(*) FROM sv_run_permits WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND status='issued'), (SELECT count(*) FROM sv_run_permits WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND status='revoked'), (SELECT count(*) FROM sv_runs WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND status='RUNNING' AND finished_at IS NULL), (SELECT count(*) FROM sv_audit_events WHERE subject_id='60000000-0000-4000-8000-000000000014' AND event='JOURNAL_DAILY_CLAIM_RECONCILED'), (SELECT count(*) FROM sv_incidents WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND kind='OWNER_RECONCILED_JOURNAL_HOLD'));")"
if [[ "$legacy_after_dry_run" != 'HOLD:71:0:4:0:0' ]]; then
	printf 'JOURNAL_0060_LEGACY_DRY_RUN_DID_NOT_ROLL_BACK:%s\n' "$legacy_after_dry_run" >&2
	exit 1
fi

# A cost row linked to one of the four legacy runs is evidence about that
# already-counted ambiguous execution, not a fifth possible call.
legacy_linked_cost="$("${psql[@]}" -qAtc "BEGIN; SELECT set_config('app.organization_id', 'journal-hold-0060', true); INSERT INTO sv_cost_events (id, organization_id, cycle_id, run_id, provider, amount_usd, basis) VALUES ('60000000-0000-4000-8000-000000000078', 'journal-hold-0060', '60000000-0000-4000-8000-000000000063', '60000000-0000-4000-8000-000000000074', 'legacy-provider', 0.010000, 'legacy-observed'); SELECT concat_ws(':', result->>'providerCallUpperBound', result->>'legacyUnfencedRunCount', result->>'costEventCount', result->>'unmatchedCostEventCount') FROM (SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000014', 'disposable-0060', 'owner-decision-legacy-unfenced-0060', true, true) AS result) AS reconciliation; ROLLBACK;")"
if [[ "$legacy_linked_cost" != $'journal-hold-0060\n4:4:1:0' ]]; then
	printf 'JOURNAL_0060_LEGACY_LINKED_COST_DOUBLE_COUNTED:%s\n' "$legacy_linked_cost" >&2
	exit 1
fi

legacy_receipt="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT concat_ws(':', result->>'decision', coalesce(result->>'providerCalls', 'NULL'), result->>'providerCallsStatus', result->>'providerCallUpperBound', result->>'legacyUnfencedRunCount', result->>'legacyUnfencedProviderCallUpperBound', result->>'boundaryBackedRunCount', result->>'revokedPermitCount', result->>'settledRunCount') FROM (SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000014', 'disposable-0060', 'owner-decision-legacy-unfenced-0060', true, true) AS result) AS reconciliation;")"
if [[ "$legacy_receipt" != $'journal-hold-0060\nRECONCILED:NULL:UNKNOWN_WITHIN_UPPER_BOUND:4:4:4:0:71:4' ]]; then
	printf 'JOURNAL_0060_LEGACY_RECONCILIATION_FAILED:%s\n' "$legacy_receipt" >&2
	exit 1
fi
legacy_replay="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT concat_ws(':', result->>'decision', coalesce(result->>'providerCalls', 'NULL'), result->>'providerCallsStatus', result->>'providerCallUpperBound', result->>'legacyUnfencedRunCount', result->>'legacyUnfencedProviderCallUpperBound', result->>'boundaryBackedRunCount', result->>'revokedPermitCount', result->>'settledRunCount') FROM (SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000014', 'disposable-0060', 'owner-decision-legacy-unfenced-0060', true, true) AS result) AS reconciliation;")"
if [[ "$legacy_replay" != $'journal-hold-0060\nALREADY_RECONCILED:NULL:UNKNOWN_WITHIN_UPPER_BOUND:4:4:4:0:71:4' ]]; then
	printf 'JOURNAL_0060_LEGACY_REPLAY_FAILED:%s\n' "$legacy_replay" >&2
	exit 1
fi
legacy_after="$("${psql[@]}" -Atc "SELECT concat_ws(':', (SELECT status FROM sv_journal_daily_claims WHERE id='60000000-0000-4000-8000-000000000014'), (SELECT count(*) FROM sv_run_permits WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND status='revoked'), (SELECT count(*) FROM sv_run_permits WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND status='consumed'), (SELECT count(*) FROM sv_runs WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND status='FAILED' AND validity='INVALID' AND invalid_reason='OWNER_RECONCILED_LEGACY_INTERRUPTED_WITHOUT_BOUNDARY' AND canonical_payload->>'invalidReason'='OWNER_RECONCILED_LEGACY_INTERRUPTED_WITHOUT_BOUNDARY' AND finished_at IS NOT NULL), (SELECT count(*) FROM sv_journal_provider_boundaries WHERE journal_claim_id='60000000-0000-4000-8000-000000000014'), (SELECT count(*) FROM sv_audit_events WHERE subject_id='60000000-0000-4000-8000-000000000014' AND event='JOURNAL_DAILY_CLAIM_RECONCILED'), (SELECT count(*) FROM sv_audit_events WHERE subject_id='60000000-0000-4000-8000-000000000014' AND event='JOURNAL_DAILY_CLAIM_RECONCILED' AND details->>'providerCallsStatus'='UNKNOWN_WITHIN_UPPER_BOUND' AND details->>'providerCallUpperBound'='4' AND details->>'legacyUnfencedRunCount'='4' AND details->>'legacyUnfencedProviderCallUpperBound'='4' AND details->>'boundaryBackedRunCount'='0' AND details->>'legacyTopologyStatus'='CONSUMED_RUNS_WITHOUT_BOUNDARY' AND details->>'revokedPermitCount'='71' AND details->'providerCalls'='null'::jsonb), (SELECT count(*) FROM sv_incidents WHERE cycle_id='60000000-0000-4000-8000-000000000063' AND kind='OWNER_RECONCILED_JOURNAL_HOLD'), (SELECT count(*) FROM sv_cost_events WHERE cycle_id='60000000-0000-4000-8000-000000000063'), (SELECT count(*) FROM sv_response_mentions WHERE cycle_id='60000000-0000-4000-8000-000000000063'), (SELECT count(*) FROM sv_citation_gap_snapshots WHERE cycle_id='60000000-0000-4000-8000-000000000063'), (SELECT count(*) FROM sv_source_snapshots WHERE organization_id='journal-hold-0060' AND project_id='60000000-0000-4000-8000-000000000004'), (SELECT count(*) FROM sv_evidence_index WHERE organization_id='journal-hold-0060' AND project_id='60000000-0000-4000-8000-000000000004'), (SELECT count(*) FROM sv_evidence_acceptance_receipts WHERE organization_id='journal-hold-0060'));")"
if [[ "$legacy_after" != 'RECONCILED:71:4:4:0:1:1:1:0:0:0:0:0:0' ]]; then
	printf 'JOURNAL_0060_LEGACY_FINAL_STATE_MISMATCH:%s\n' "$legacy_after" >&2
	exit 1
fi

"${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT 1 FROM sv_owner_reconcile_journal_no_spend('60000000-0000-4000-8000-000000000013', ARRAY[]::uuid[], 'BRIGHT_DATA', 'sha256:' || repeat('c', 64), ARRAY['dataset-alone'], clock_timestamp() - interval '5 hours', clock_timestamp() - interval '1 hour', clock_timestamp() - interval '3 hours', clock_timestamp() - interval '30 minutes', 'immutable://0060/post-0060-no-spend', 'sha256:' || repeat('d', 64));" >/dev/null
if [[ "$("${psql[@]}" -Atc "SELECT concat_ws(':', status, (SELECT count(*) FROM sv_journal_no_spend_reconciliations WHERE claim_id='60000000-0000-4000-8000-000000000013')) FROM sv_journal_daily_claims WHERE id='60000000-0000-4000-8000-000000000013'")" != 'NO_SPEND:1' ]]; then
	printf 'JOURNAL_0060_POSITIVE_NO_SPEND_PATH_NOT_PRESERVED\n' >&2
	exit 1
fi
no_spend_dependency_mutation=''
if no_spend_dependency_mutation="$("${psql[@]}" -c "UPDATE sv_cycles SET status='STOPPED' WHERE id='60000000-0000-4000-8000-000000000053';" 2>&1)"; then
	printf 'JOURNAL_0060_NO_SPEND_DEPENDENCY_MUTATION_ALLOWED\n' >&2
	exit 1
fi
if [[ "$no_spend_dependency_mutation" != *"JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE"* ]]; then
	printf 'JOURNAL_0060_NO_SPEND_DEPENDENCY_GUARD_NOT_PRESERVED\n' >&2
	exit 1
fi

no_spend_without_certificate=''
if no_spend_without_certificate="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); UPDATE sv_journal_daily_claims SET status='NO_SPEND', updated_at=clock_timestamp() WHERE id='60000000-0000-4000-8000-000000000010';" 2>&1)"; then
	printf 'JOURNAL_0060_NO_SPEND_CERTIFICATE_BYPASS_ALLOWED\n' >&2
	exit 1
fi
if [[ "$no_spend_without_certificate" != *"JOURNAL_DAILY_CLAIM_NO_SPEND_CERTIFICATE_REQUIRED"* ]]; then
	printf 'JOURNAL_0060_NO_SPEND_GUARD_NOT_PRESERVED\n' >&2
	exit 1
fi

not_quiesced=''
if not_quiesced="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', false, true);" 2>&1)"; then
	printf 'JOURNAL_0060_NON_QUIESCED_RECONCILIATION_ALLOWED\n' >&2
	exit 1
fi
if [[ "$not_quiesced" != *"JOURNAL_HOLD_RECONCILIATION_RUNTIME_NOT_QUIESCED"* ]]; then
	printf 'JOURNAL_0060_NON_QUIESCED_WRONG_FAILURE\n' >&2
	exit 1
fi

ambiguous_unacknowledged=''
if ambiguous_unacknowledged="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', true, false);" 2>&1)"; then
	printf 'JOURNAL_0060_AMBIGUOUS_SPEND_NOT_ACKNOWLEDGED_ALLOWED\n' >&2
	exit 1
fi
if [[ "$ambiguous_unacknowledged" != *"JOURNAL_HOLD_RECONCILIATION_AMBIGUOUS_SPEND_ACK_REQUIRED"* ]]; then
	printf 'JOURNAL_0060_AMBIGUOUS_SPEND_WRONG_FAILURE\n' >&2
	exit 1
fi

legacy_cost_unacknowledged=''
if legacy_cost_unacknowledged="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000012', 'disposable-0060', 'owner-decision-legacy-cost-0060', true, false);" 2>&1)"; then
	printf 'JOURNAL_0060_LEGACY_COST_NOT_ACKNOWLEDGED_ALLOWED\n' >&2
	exit 1
fi
if [[ "$legacy_cost_unacknowledged" != *"JOURNAL_HOLD_RECONCILIATION_AMBIGUOUS_SPEND_ACK_REQUIRED"* ]]; then
	printf 'JOURNAL_0060_LEGACY_COST_WRONG_FAILURE\n' >&2
	exit 1
fi
legacy_cost_receipt="$("${psql[@]}" -qAtc "BEGIN; SELECT set_config('app.organization_id', 'journal-hold-0060', true); SELECT concat_ws(':', result->>'decision', coalesce(result->>'providerCalls', 'NULL'), result->>'providerCallsStatus', result->>'providerCallUpperBound', result->>'costEventCount', result->>'unmatchedCostEventCount', result->>'observedCostUsd') FROM (SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000012', 'disposable-0060', 'owner-decision-legacy-cost-0060', true, true) AS result) AS reconciliation; ROLLBACK;")"
if [[ "$legacy_cost_receipt" != $'journal-hold-0060\nRECONCILED:NULL:UNKNOWN_WITHIN_UPPER_BOUND:2:2:1:0.030000' ]]; then
	printf 'JOURNAL_0060_LEGACY_COST_RECEIPT_MISMATCH:%s\n' "$legacy_cost_receipt" >&2
	exit 1
fi

wrong_tenant=''
if wrong_tenant="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'other-tenant', false); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', true, true);" 2>&1)"; then
	printf 'JOURNAL_0060_WRONG_TENANT_ALLOWED\n' >&2
	exit 1
fi
if [[ "$wrong_tenant" != *"JOURNAL_HOLD_RECONCILIATION_CLAIM_NOT_FOUND"* ]]; then
	printf 'JOURNAL_0060_WRONG_TENANT_WRONG_FAILURE\n' >&2
	exit 1
fi

"${psql[@]}" <<'SQL' >/dev/null
SELECT set_config('app.organization_id', 'journal-hold-0060', false);
ALTER TABLE sv_journal_daily_claims DISABLE TRIGGER sv_guard_journal_daily_claim_mutation;
UPDATE sv_journal_daily_claims SET updated_at = clock_timestamp()
WHERE id = '60000000-0000-4000-8000-000000000010';
ALTER TABLE sv_journal_daily_claims ENABLE TRIGGER sv_guard_journal_daily_claim_mutation;
SQL
active_lease=''
if active_lease="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', true, true);" 2>&1)"; then
	printf 'JOURNAL_0060_ACTIVE_LEASE_ALLOWED\n' >&2
	exit 1
fi
if [[ "$active_lease" != *"JOURNAL_HOLD_RECONCILIATION_LEASE_ACTIVE"* ]]; then
	printf 'JOURNAL_0060_ACTIVE_LEASE_WRONG_FAILURE\n' >&2
	exit 1
fi
"${psql[@]}" <<'SQL' >/dev/null
ALTER TABLE sv_journal_daily_claims DISABLE TRIGGER sv_guard_journal_daily_claim_mutation;
UPDATE sv_journal_daily_claims SET updated_at = clock_timestamp() - interval '2 hours'
WHERE id = '60000000-0000-4000-8000-000000000010';
ALTER TABLE sv_journal_daily_claims ENABLE TRIGGER sv_guard_journal_daily_claim_mutation;
CREATE SCHEMA pgboss;
CREATE TABLE pgboss.job (name text NOT NULL, state text NOT NULL);
INSERT INTO pgboss.job (name, state) VALUES ('selena-measure', 'active');
SQL
active_job=''
if active_job="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', true, true);" 2>&1)"; then
	printf 'JOURNAL_0060_ACTIVE_JOB_ALLOWED\n' >&2
	exit 1
fi
if [[ "$active_job" != *"JOURNAL_HOLD_RECONCILIATION_ACTIVE_JOB"* ]]; then
	printf 'JOURNAL_0060_ACTIVE_JOB_WRONG_FAILURE\n' >&2
	exit 1
fi
"${psql[@]}" -c "DELETE FROM pgboss.job;" >/dev/null

inconsistent_execution=''
if inconsistent_execution="$("${psql[@]}" -c "BEGIN; SELECT set_config('app.organization_id', 'journal-hold-0060', true); INSERT INTO sv_run_permits (id, organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at) VALUES ('60000000-0000-4000-8000-000000000034', 'journal-hold-0060', '60000000-0000-4000-8000-000000000023', '0060-orphan-consumed', 'VISITOR', 'avli-q3', 'Perplexity', 'consumed', clock_timestamp() + interval '1 day', clock_timestamp()); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', true, true); ROLLBACK;" 2>&1)"; then
	printf 'JOURNAL_0060_INCONSISTENT_EXECUTION_ALLOWED\n' >&2
	exit 1
fi
if [[ "$inconsistent_execution" != *"JOURNAL_HOLD_RECONCILIATION_EXECUTION_INVARIANT"* ]]; then
	printf 'JOURNAL_0060_INCONSISTENT_EXECUTION_WRONG_FAILURE\n' >&2
	exit 1
fi

cancelled_with_run=''
if cancelled_with_run="$("${psql[@]}" -c "BEGIN; SELECT set_config('app.organization_id', 'journal-hold-0060', true); UPDATE sv_run_permits SET status='cancelled' WHERE id='60000000-0000-4000-8000-000000000031'; INSERT INTO sv_runs (id, organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status, started_at) VALUES ('60000000-0000-4000-8000-000000000035', 'journal-hold-0060', '60000000-0000-4000-8000-000000000023', '60000000-0000-4000-8000-000000000031', '0060-issued', 'VISITOR', 'avli-q2', 'Gemini', 'RUNNING', clock_timestamp()); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', true, true); ROLLBACK;" 2>&1)"; then
	printf 'JOURNAL_0060_CANCELLED_WITH_RUN_ALLOWED\n' >&2
	exit 1
fi
if [[ "$cancelled_with_run" != *"JOURNAL_HOLD_RECONCILIATION_EXECUTION_INVARIANT"* ]]; then
	printf 'JOURNAL_0060_CANCELLED_WITH_RUN_WRONG_FAILURE\n' >&2
	exit 1
fi

direct_update=''
if direct_update="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); UPDATE sv_journal_daily_claims SET status='RECONCILED', reconciled_at=clock_timestamp(), reconciliation_reason='direct-update', reconciled_by='direct-owner', updated_at=clock_timestamp() WHERE id='60000000-0000-4000-8000-000000000010';" 2>&1)"; then
	printf 'JOURNAL_0060_DIRECT_UPDATE_ALLOWED\n' >&2
	exit 1
fi
if [[ "$direct_update" != *"JOURNAL_HOLD_RECONCILIATION_FUNCTION_REQUIRED"* ]]; then
	printf 'JOURNAL_0060_DIRECT_UPDATE_WRONG_FAILURE\n' >&2
	exit 1
fi

"${psql[@]}" <<'SQL' >/dev/null
CREATE ROLE selena_hold_probe NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT EXECUTE ON FUNCTION sv_reconcile_journal_hold(uuid, text, text, boolean, boolean) TO selena_hold_probe;
GRANT SELECT, UPDATE ON sv_journal_daily_claims TO selena_hold_probe;
GRANT SELECT ON sv_configuration_locks TO selena_hold_probe;
SQL
non_owner=''
if non_owner="$("${psql[@]}" -c "SET SESSION AUTHORIZATION selena_hold_probe; SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', true, true);" 2>&1)"; then
	printf 'JOURNAL_0060_NON_OWNER_ALLOWED\n' >&2
	exit 1
fi
if [[ "$non_owner" != *"JOURNAL_HOLD_RECONCILIATION_OWNER_REQUIRED"* ]]; then
	printf 'JOURNAL_0060_NON_OWNER_WRONG_FAILURE\n' >&2
	exit 1
fi
spoofed_guc=''
if spoofed_guc="$("${psql[@]}" -c "SET SESSION AUTHORIZATION selena_hold_probe; SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT set_config('app.journal_hold_reconciliation', '60000000-0000-4000-8000-000000000010', false); UPDATE sv_journal_daily_claims SET status='RECONCILED', reconciled_at=clock_timestamp(), reconciliation_reason='spoofed-guc', reconciled_by='selena-hold-probe', updated_at=clock_timestamp() WHERE id='60000000-0000-4000-8000-000000000010';" 2>&1)"; then
	printf 'JOURNAL_0060_NON_OWNER_GUC_SPOOF_ALLOWED\n' >&2
	exit 1
fi
if [[ "$spoofed_guc" != *"JOURNAL_HOLD_RECONCILIATION_FUNCTION_REQUIRED"* ]]; then
	printf 'JOURNAL_0060_NON_OWNER_GUC_SPOOF_WRONG_FAILURE\n' >&2
	exit 1
fi
"${psql[@]}" -c 'DROP OWNED BY selena_hold_probe; DROP ROLE selena_hold_probe;' >/dev/null

receipt="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT concat_ws(':', result->>'decision', coalesce(result->>'providerCalls', 'NULL'), result->>'providerCallsStatus', result->>'revokedPermitCount', result->>'settledRunCount', result->>'costEventCount', result->>'unmatchedCostEventCount', result->>'historicalExposureCapUsd') FROM (SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', true, true) AS result) AS reconciliation;")"
if [[ "$receipt" != $'journal-hold-0060\nRECONCILED:NULL:UNKNOWN_WITHIN_UPPER_BOUND:1:1:0:0:0.500000' ]]; then
	printf 'JOURNAL_0060_RECONCILIATION_FAILED\n' >&2
	exit 1
fi
replay="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT concat_ws(':', result->>'decision', coalesce(result->>'providerCalls', 'NULL'), result->>'providerCallsStatus', result->>'revokedPermitCount', result->>'settledRunCount', result->>'costEventCount', result->>'unmatchedCostEventCount', result->>'historicalExposureCapUsd') FROM (SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'owner-decision-disposable-0060', true, true) AS result) AS reconciliation;")"
if [[ "$replay" != $'journal-hold-0060\nALREADY_RECONCILED:NULL:UNKNOWN_WITHIN_UPPER_BOUND:1:1:0:0:0.500000' ]]; then
	printf 'JOURNAL_0060_REPLAY_FAILED\n' >&2
	exit 1
fi

wrong_replay=''
if wrong_replay="$("${psql[@]}" -c "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT sv_reconcile_journal_hold('60000000-0000-4000-8000-000000000010', 'disposable-0060', 'different-owner-decision-0060', true, true);" 2>&1)"; then
	printf 'JOURNAL_0060_WRONG_REPLAY_IDENTITY_ALLOWED\n' >&2
	exit 1
fi
if [[ "$wrong_replay" != *"JOURNAL_HOLD_RECONCILIATION_REPLAY_IDENTITY_MISMATCH"* ]]; then
	printf 'JOURNAL_0060_WRONG_REPLAY_IDENTITY_WRONG_FAILURE\n' >&2
	exit 1
fi

state="$("${psql[@]}" -qAtc "SELECT set_config('app.organization_id', 'journal-hold-0060', false); SELECT concat_ws(':', (SELECT status FROM sv_journal_daily_claims WHERE id='60000000-0000-4000-8000-000000000010'), (SELECT status FROM sv_run_permits WHERE id='60000000-0000-4000-8000-000000000031'), (SELECT status FROM sv_runs WHERE id='60000000-0000-4000-8000-000000000032'), (SELECT status FROM sv_cycles WHERE id='60000000-0000-4000-8000-000000000023'), (SELECT completed_runs FROM sv_cycles WHERE id='60000000-0000-4000-8000-000000000023'), (SELECT status FROM sv_orders WHERE id='60000000-0000-4000-8000-000000000022'), (SELECT count(*) FROM sv_audit_events WHERE organization_id='journal-hold-0060' AND subject_id='60000000-0000-4000-8000-000000000010' AND event='JOURNAL_DAILY_CLAIM_RECONCILED'), (SELECT count(*) FROM sv_incidents WHERE organization_id='journal-hold-0060' AND cycle_id='60000000-0000-4000-8000-000000000023' AND kind='OWNER_RECONCILED_JOURNAL_HOLD' AND status='RESOLVED' AND resolved_at IS NOT NULL), (SELECT count(*) FROM sv_cost_events WHERE organization_id='journal-hold-0060' AND cycle_id='60000000-0000-4000-8000-000000000023'));")"
if [[ "$state" != $'journal-hold-0060\nRECONCILED:revoked:FAILED:STOPPED:1:CANCELLED:1:1:0' ]]; then
	printf 'JOURNAL_0060_STATE_MISMATCH:%s\n' "$state" >&2
	exit 1
fi

"${psql[@]}" <<'SQL' >/dev/null
SELECT set_config('app.organization_id', 'journal-hold-0060', false);
INSERT INTO sv_journal_daily_claims (
	id, organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
) VALUES (
	'60000000-0000-4000-8000-000000000011', 'journal-hold-0060',
	'60000000-0000-4000-8000-000000000001', 'avli-0060',
	(clock_timestamp() AT TIME ZONE 'UTC')::date, 2, clock_timestamp(), clock_timestamp()
);
SQL

printf 'JOURNAL_0060_DISPOSABLE_PASS ownerOnly=true runtimeExecute=false noSpendCompatibility=preserved runtimeQuiesced=true ambiguousSpend=preserved historicalCancelled=11 historicalCancelledPreserved=true cancelledWithRun=rejected legacyPermits=75 legacyIssuedRevoked=71 legacyConsumed=4 boundaryUpperBound=1 legacyUnfencedUpperBound=4 unmatchedNullCostUpperBound=+1 legacyLinkedCost=not-double-counted legacyInvariantMismatch=rejected legacyReceipt=UNKNOWN_WITHIN_UPPER_BOUND legacyDryRun=rolled-back legacyReplay=idempotent legacyAudit=exact revoked=1 settled=1 replay=idempotent costRows=0 providerInvocationsDuringTest=0 nextAttempt=allowed\n'
