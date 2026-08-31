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

# Gate12 creates the complete parent graph and applies migrations 0037–0050
# in this same disposable database. This runner adds only the row-level
# CLAIMED → SUBMITTED assertions that the structural Gate12 check cannot prove.
bash "$repo_root/tools/visibility_os_gate12_e2e.sh" "$compose_file" >/dev/null

"${psql[@]}" <<'SQL'
DO $$
DECLARE
	v_org_id text := 'gate12-release';
	v_lock_id uuid;
	v_location_id uuid;
	v_grid_id uuid;
	v_point_id uuid;
	v_keyword_id uuid;
	v_cycle_id uuid := gen_random_uuid();
	v_local_cycle_id uuid := gen_random_uuid();
	v_attempt_id uuid;
	v_reservation_id uuid;
	v_claimed_at timestamptz := CURRENT_TIMESTAMP;
	v_submitted_at timestamptz := CURRENT_TIMESTAMP + interval '1 second';
	v_lease_expires_at timestamptz := CURRENT_TIMESTAMP + interval '10 minutes';
	v_base_slot_key text;
	v_execution_key text;
	v_candidate jsonb;
	v_canonical text;
	v_status text;
	v_negative_guard boolean := false;
BEGIN
	SELECT lock.id, location.id, grid.id, point.id, keyword.id
	INTO v_lock_id, v_location_id, v_grid_id, v_point_id, v_keyword_id
	FROM sv_configuration_locks AS lock
	JOIN sv_projects AS project
		ON project.id = lock.project_id AND project.organization_id = lock.organization_id
	JOIN sv_business_locations AS location
		ON location.organization_id = lock.organization_id
	JOIN sv_grid_definitions AS grid
		ON grid.location_id = location.id AND grid.organization_id = location.organization_id
	JOIN sv_grid_points AS point
		ON point.grid_id = grid.id AND point.organization_id = grid.organization_id
	JOIN sv_local_keywords AS keyword
		ON keyword.location_id = location.id AND keyword.organization_id = location.organization_id
	WHERE lock.organization_id = v_org_id
	ORDER BY lock.created_at, location.id, grid.id, point.id, keyword.id
	LIMIT 1;
	IF v_lock_id IS NULL THEN
		RAISE EXCEPTION '0049 fixture parent graph missing';
	END IF;

	INSERT INTO sv_measurement_cycles (
		id, organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
	)
	VALUES (
		v_cycle_id, v_org_id, 'LOCAL_MAPS', gen_random_uuid(), v_lock_id, 'RUNNING'
	);
	INSERT INTO sv_local_scan_cycles (
		id, organization_id, measurement_cycle_id, domain_id, configuration_lock_id,
		location_id, grid_definition_id, provider, repeats, capture_depth,
		expected_observations, worst_case_cost_usd, cost_snapshot, status
	)
	VALUES (
		v_local_cycle_id, v_org_id, v_cycle_id, 'LOCAL_MAPS', v_lock_id,
		v_location_id, v_grid_id, 'maps-live-provider-v1', 1, 20,
		1, 0, '{"plannedCalls":0,"worstCaseCalls":0,"worstCaseCost":0}', 'RUNNING'
	);

	v_base_slot_key := 'LOCAL_MAPS|' || v_cycle_id::text || '|' || v_point_id::text || '|' || v_keyword_id::text || '|maps-live-provider-v1|0';
	v_execution_key := v_base_slot_key || '|1';
	INSERT INTO sv_measurement_attempts (
		organization_id, measurement_cycle_id, domain_id, observation_ref, point_id, item_id,
		executor_id, repeat_index, base_slot_key, attempt_index, execution_key, status,
		budget_state, reserved_cost_usd, currency, surface_cap_usd, monthly_cap_usd,
		price_snapshot_version, claimed_at, lease_expires_at
	)
	VALUES (
		v_org_id, v_cycle_id, 'LOCAL_MAPS', 'gate12-0049-lifecycle', v_point_id, v_keyword_id,
		'maps-live-provider-v1', 0, v_base_slot_key, 1, v_execution_key, 'CLAIMED',
		'RESERVED', 0, 'USD', 0, 0, 'gate12-0049', v_claimed_at, v_lease_expires_at
	)
	RETURNING id, reservation_id INTO v_attempt_id, v_reservation_id;

	v_candidate := jsonb_build_object(
		'schemaVersion', '1',
		'kind', 'LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE',
		'mode', 'LIVE_PROVIDER',
		'canonicalizationVersion', 'canonical-json-code-unit-v1',
		'scope', jsonb_build_object(
			'organizationId', v_org_id,
			'measurementCycleId', v_cycle_id::text,
			'localCycleId', v_local_cycle_id::text,
			'configurationLockId', v_lock_id::text,
			'domainId', 'LOCAL_MAPS'
		),
		'lockSnapshotCanonical', 'gate12-0049-lock',
		'requestSnapshotCanonical', 'gate12-0049-request',
		'lock', jsonb_build_object('provider', jsonb_build_object('id', 'maps-live-provider-v1')),
		'slot', jsonb_build_object('baseSlotKey', v_base_slot_key, 'pointId', v_point_id::text, 'keywordId', v_keyword_id::text, 'repeatIndex', 0),
		'keyword', jsonb_build_object('id', v_keyword_id::text),
		'providerRequest', jsonb_build_object('repeatIndex', 0, 'provider', jsonb_build_object('id', 'maps-live-provider-v1')),
		'attempt', jsonb_build_object(
			'attemptId', v_attempt_id::text,
			'reservationId', v_reservation_id::text,
			'observationRef', 'gate12-0049-lifecycle',
			'baseSlotKey', v_base_slot_key,
			'executionKey', v_execution_key,
			'attemptIndex', 1,
			'statusSnapshot', 'SUBMITTED',
			'claimedAt', v_claimed_at,
			'submittedAt', v_submitted_at,
			'leaseExpiresAt', v_lease_expires_at
		),
		'budgetReservation', jsonb_build_object(
			'currency', 'USD',
			'reservedCostUsd', '0',
			'surfaceCapUsd', '0',
			'monthlyCapUsd', '0',
			'priceSnapshotVersion', 'gate12-0049'
		)
	);
	v_canonical := v_candidate::text;

	UPDATE sv_measurement_attempts
	SET status = 'SUBMITTED',
		submitted_at = v_submitted_at,
		lease_expires_at = v_lease_expires_at,
		submission_token_hash = 'sha256:' || repeat('a', 64),
		submitted_candidate_fingerprint = 'sha256:' || encode(sha256(convert_to(v_canonical, 'UTF8')), 'hex'),
		submitted_candidate_canonical = v_canonical,
		submitted_candidate = v_candidate
	WHERE id = v_attempt_id
	RETURNING status INTO v_status;
	IF v_status <> 'SUBMITTED' THEN
		RAISE EXCEPTION '0049 positive CLAIMED to SUBMITTED transition failed';
	END IF;

	BEGIN
		UPDATE sv_measurement_attempts
		SET lease_expires_at = v_submitted_at
		WHERE id = v_attempt_id;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'MEASUREMENT_ATTEMPT_LEASE_RENEWAL_BLOCKED' THEN
			v_negative_guard := true;
		ELSE
			RAISE;
		END IF;
	END;
	IF NOT v_negative_guard THEN
		RAISE EXCEPTION '0049 negative lease mutation was not blocked';
	END IF;
	RAISE NOTICE '0049 lifecycle positive transition and active-lease negative guard passed';
END;
$$;
SQL

printf 'Visibility OS 0049 lifecycle gate passed\n'
