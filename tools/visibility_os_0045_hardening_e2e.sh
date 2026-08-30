#!/usr/bin/env bash
set -euo pipefail

compose_file="${1:-../tmp/selena-visibility-test-compose.yml}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
migration_0045="$repo_root/packages/lib/src/db/migrations/0045_visibility_os_domain_and_lock_hardening.sql"
database_prefix="selena_visibility_0045_$$"
databases=(
	"${database_prefix}_positive"
	"${database_prefix}_lock_collision"
	"${database_prefix}_scope_mismatch"
	"${database_prefix}_measurement_lock_scope"
	"${database_prefix}_local_lock_mismatch"
	"${database_prefix}_cycle_collision"
	"${database_prefix}_evidence_collision"
)
compose=(docker-compose -p selena-visibility-test -f "$compose_file")

for database in "${databases[@]}"; do
	if [[ ! "$database" =~ ^[a-z0-9_]+$ ]]; then
		echo "Unsafe disposable database name: $database" >&2
		exit 1
	fi
done

database_tool() {
	"${compose[@]}" exec -T postgres "$@"
}

run_psql() {
	local database="$1"
	shift
	database_tool psql -U selena_test -d "$database" -v ON_ERROR_STOP=1 "$@"
}

cleanup() {
	local database
	for database in "${databases[@]}"; do
		database_tool dropdb -U selena_test --if-exists --force "$database" >/dev/null 2>&1 || true
	done
}
trap cleanup EXIT

reset_database() {
	local database="$1"
	database_tool dropdb -U selena_test --if-exists --force "$database" >/dev/null
	database_tool createdb -U selena_test "$database"
}

apply_through_0044() {
	local database="$1"
	local migration
	local migration_name
	local migration_number
	for migration in "$repo_root"/packages/lib/src/db/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
		migration_name="$(basename "$migration")"
		migration_number="${migration_name%%_*}"
		if ((10#$migration_number > 44)); then
			continue
		fi
		run_psql "$database" --single-transaction < "$migration" >/dev/null
	done
}

seed_project_and_lock() {
	local database="$1"
	run_psql "$database" <<'SQL'
INSERT INTO organization (id, name, slug, created_at)
VALUES ('hardening-fixture', 'Hardening Fixture', 'hardening-fixture', now());

INSERT INTO sv_projects (id, organization_id, name, category, country, status)
VALUES ('10000000-0000-0000-0000-000000000001', 'hardening-fixture', 'Hardening Project', 'test', 'ID', 'DRAFT');

INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
)
VALUES (
	'20000000-0000-0000-0000-000000000001',
	'hardening-fixture',
	'10000000-0000-0000-0000-000000000001',
	1,
	'{"visibilityOs":{"local":{"plannedCalls":1,"worstCaseCalls":1,"worstCaseCost":1}}}',
	'hardening-fixture',
	1,
	10,
	'hardening-fixture'
);
SQL
}

assert_failed_migration_is_atomic() {
	local database="$1"
	local expected_error="$2"
	local output
	if output="$(run_psql "$database" --single-transaction < "$migration_0045" 2>&1)"; then
		echo "0045 unexpectedly succeeded for $database" >&2
		exit 1
	fi
	if [[ "$output" != *"$expected_error"* ]]; then
		echo "0045 failed with an unexpected error for $database" >&2
		echo "$output" >&2
		exit 1
	fi
	run_psql "$database" -At <<'SQL' | grep -qx 't|t|t'
SELECT
	EXISTS (SELECT 1 FROM sv_measurement_domains WHERE domain_id = 'LOCAL'),
	to_regprocedure('sv_prevent_configuration_lock_mutation()') IS NULL,
	NOT EXISTS (
		SELECT 1 FROM pg_trigger
		WHERE tgname IN (
			'sv_prevent_configuration_lock_mutation',
			'sv_prevent_configuration_lock_truncate',
			'sv_prevent_cost_event_truncate'
		)
	);
SQL
}

positive_database="${database_prefix}_positive"
reset_database "$positive_database"
apply_through_0044 "$positive_database"
seed_project_and_lock "$positive_database"

run_psql "$positive_database" <<'SQL'
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
)
VALUES (
	'20000000-0000-0000-0000-000000000002',
	'hardening-fixture',
	'10000000-0000-0000-0000-000000000001',
	2,
	'{"visibilityOs":{"local":{"plannedCalls":1,"worstCaseCalls":1,"worstCaseCost":1}}}',
	'hardening-fixture',
	1,
	10,
	'hardening-fixture'
);

INSERT INTO sv_quotes (
	id, organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
)
VALUES (
	'30000000-0000-0000-0000-000000000001',
	'hardening-fixture',
	'10000000-0000-0000-0000-000000000001',
	'20000000-0000-0000-0000-000000000001',
	'ISSUED', 0, 'USD', 1, now() + interval '1 day'
);

INSERT INTO sv_orders (id, organization_id, project_id, quote_id, lock_id, status, order_cap)
VALUES (
	'40000000-0000-0000-0000-000000000001',
	'hardening-fixture',
	'10000000-0000-0000-0000-000000000001',
	'30000000-0000-0000-0000-000000000001',
	'20000000-0000-0000-0000-000000000001',
	'APPROVED', 0
);

INSERT INTO sv_cycles (id, organization_id, order_id, lock_id, status, expected_runs)
VALUES (
	'50000000-0000-0000-0000-000000000001',
	'hardening-fixture',
	'40000000-0000-0000-0000-000000000001',
	'20000000-0000-0000-0000-000000000001',
	'READY', 1
);

INSERT INTO sv_entities (id, organization_id, project_id, entity_kind, confirmation_status, name)
VALUES (
	'60000000-0000-0000-0000-000000000001',
	'hardening-fixture',
	'10000000-0000-0000-0000-000000000001',
	'LOCATION_BRAND', 'CLIENT_CONFIRMED', 'Hardening Location'
);

INSERT INTO sv_business_locations (
	id, organization_id, entity_id, display_name, country_code, latitude, longitude, geo_precision, confirmation_status
)
VALUES (
	'70000000-0000-0000-0000-000000000001',
	'hardening-fixture',
	'60000000-0000-0000-0000-000000000001',
	'Hardening Location', 'ID', -8.506900, 115.262500, 'COORDINATE', 'CONFIRMED'
);

INSERT INTO sv_local_keywords (id, organization_id, location_id, text, normalized_text, language, status)
VALUES (
	'80000000-0000-0000-0000-000000000001',
	'hardening-fixture',
	'70000000-0000-0000-0000-000000000001',
	'hardening query', 'hardening query', 'en', 'APPROVED'
);

INSERT INTO sv_grid_definitions (
	id, organization_id, location_id, version, point_count, spacing_meters, shape, rows, columns,
	center_latitude, center_longitude, formula_version
)
VALUES (
	'90000000-0000-0000-0000-000000000001',
	'hardening-fixture',
	'70000000-0000-0000-0000-000000000001',
	1, 1, 400, 'SQUARE', 1, 1, -8.506900, 115.262500, 'square-grid/1'
);

INSERT INTO sv_grid_points (id, organization_id, grid_id, point_index, latitude, longitude)
VALUES (
	'a0000000-0000-0000-0000-000000000001',
	'hardening-fixture',
	'90000000-0000-0000-0000-000000000001',
	0, -8.506900, 115.262500
);

INSERT INTO sv_measurement_cycles (
	id, organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
)
VALUES
	(
		'b0000000-0000-0000-0000-000000000001', 'hardening-fixture', 'LOCAL',
		'c0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'COMPLETED'
	),
	(
		'b0000000-0000-0000-0000-000000000002', 'hardening-fixture', 'LOCAL_MAPS',
		'c0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'COMPLETED'
	);

INSERT INTO sv_local_scan_cycles (
	id, organization_id, measurement_cycle_id, domain_id, configuration_lock_id, location_id,
	grid_definition_id, provider, repeats, capture_depth, expected_observations, worst_case_cost_usd,
	cost_snapshot, status
)
VALUES
	(
		'c0000000-0000-0000-0000-000000000001', 'hardening-fixture',
		'b0000000-0000-0000-0000-000000000001', 'LOCAL',
		'20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001',
		'90000000-0000-0000-0000-000000000001', 'stub-legacy', 1, 20, 1, 1,
		'{"plannedCalls":1,"worstCaseCalls":1,"worstCaseCost":1}', 'RUNNING'
	),
	(
		'c0000000-0000-0000-0000-000000000002', 'hardening-fixture',
		'b0000000-0000-0000-0000-000000000002', 'LOCAL_MAPS',
		'20000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001',
		'90000000-0000-0000-0000-000000000001', 'stub-native', 1, 20, 1, 1,
		'{"plannedCalls":1,"worstCaseCalls":1,"worstCaseCost":1}', 'RUNNING'
	);

INSERT INTO sv_measurement_datasets (id, organization_id, cycle_id, dataset_key, version)
VALUES
	(
		'd0000000-0000-0000-0000-000000000001', 'hardening-fixture',
		'b0000000-0000-0000-0000-000000000001', 'hardening-local', 1
	),
	(
		'd0000000-0000-0000-0000-000000000002', 'hardening-fixture',
		'b0000000-0000-0000-0000-000000000002', 'hardening-local', 2
	);

INSERT INTO sv_local_rank_observations (
	id, organization_id, cycle_id, location_id, keyword_id, grid_definition_id, grid_point_id,
	provider, repeat_index, validity, capture_depth, capture_mode, target_rank, captured_at
)
VALUES
	(
		'e0000000-0000-0000-0000-000000000001', 'hardening-fixture',
		'c0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001',
		'80000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001',
		'a0000000-0000-0000-0000-000000000001', 'stub-legacy', 0, 'VALID', 20, 'stub', 3, now()
	),
	(
		'e0000000-0000-0000-0000-000000000002', 'hardening-fixture',
		'c0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001',
		'80000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001',
		'a0000000-0000-0000-0000-000000000001', 'stub-native', 0, 'VALID', 20, 'stub', 4, now()
	);

INSERT INTO sv_evidence_index (id, organization_id, domain_id, cycle_id, observation_ref, dataset_id, captured_at)
VALUES
	(
		'01000000-0000-0000-0000-000000000001', 'hardening-fixture', 'LOCAL',
		'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
		'd0000000-0000-0000-0000-000000000001', now()
	),
	(
		'01000000-0000-0000-0000-000000000002', 'hardening-fixture', 'LOCAL_MAPS',
		'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002',
		'd0000000-0000-0000-0000-000000000002', now()
	);

INSERT INTO sv_cost_events (id, organization_id, measurement_cycle_id, domain_id, provider, amount_usd, basis)
VALUES
	(
		'f0000000-0000-0000-0000-000000000001', 'hardening-fixture',
		'b0000000-0000-0000-0000-000000000001', 'LOCAL', 'stub-legacy', 1, 'actual'
	),
	(
		'f0000000-0000-0000-0000-000000000002', 'hardening-fixture',
		'b0000000-0000-0000-0000-000000000002', 'LOCAL_MAPS', 'stub-native', 1, 'actual'
	);

INSERT INTO sv_findings (
	id, organization_id, cycle_id, domain_id, location_id, severity, category, title, detail
)
VALUES
	(
		'11000000-0000-0000-0000-000000000001', 'hardening-fixture',
		'50000000-0000-0000-0000-000000000001', 'LOCAL',
		'70000000-0000-0000-0000-000000000001', 'high', 'fixture', 'Legacy finding', 'fixture'
	),
	(
		'11000000-0000-0000-0000-000000000002', 'hardening-fixture',
		'50000000-0000-0000-0000-000000000001', 'LOCAL_MAPS',
		'70000000-0000-0000-0000-000000000001', 'high', 'fixture', 'Native finding', 'fixture'
	);

INSERT INTO sv_recommendations (
	id, organization_id, cycle_id, finding_id, domain_id, location_id, priority, title, action, rationale
)
VALUES
	(
		'12000000-0000-0000-0000-000000000001', 'hardening-fixture',
		'50000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001',
		'LOCAL', '70000000-0000-0000-0000-000000000001', 'high', 'Legacy recommendation', 'fixture', 'fixture'
	),
	(
		'12000000-0000-0000-0000-000000000002', 'hardening-fixture',
		'50000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002',
		'LOCAL_MAPS', '70000000-0000-0000-0000-000000000001', 'high', 'Native recommendation', 'fixture', 'fixture'
	);
SQL

run_psql "$positive_database" --single-transaction < "$migration_0045" >/dev/null

run_psql "$positive_database" <<'SQL'
DO $$
DECLARE
	constraint_name text;
BEGIN
	IF EXISTS (
		SELECT 1 FROM sv_measurement_domains WHERE domain_id = 'LOCAL'
		UNION ALL SELECT 1 FROM sv_measurement_cycles WHERE domain_id = 'LOCAL'
		UNION ALL SELECT 1 FROM sv_local_scan_cycles WHERE domain_id = 'LOCAL'
		UNION ALL SELECT 1 FROM sv_cost_events WHERE domain_id = 'LOCAL'
		UNION ALL SELECT 1 FROM sv_evidence_index WHERE domain_id = 'LOCAL'
		UNION ALL SELECT 1 FROM sv_findings WHERE domain_id = 'LOCAL'
		UNION ALL SELECT 1 FROM sv_recommendations WHERE domain_id = 'LOCAL'
	) THEN
		RAISE EXCEPTION '0045 positive fixture retained LOCAL data';
	END IF;

	IF (SELECT count(*) FROM sv_measurement_cycles WHERE domain_id = 'LOCAL_MAPS') <> 2
		OR (SELECT count(*) FROM sv_local_scan_cycles WHERE domain_id = 'LOCAL_MAPS') <> 2
		OR (SELECT count(*) FROM sv_cost_events WHERE domain_id = 'LOCAL_MAPS') <> 2
		OR (SELECT count(*) FROM sv_evidence_index WHERE domain_id = 'LOCAL_MAPS') <> 2
		OR (SELECT count(*) FROM sv_findings WHERE domain_id = 'LOCAL_MAPS') <> 2
		OR (SELECT count(*) FROM sv_recommendations WHERE domain_id = 'LOCAL_MAPS') <> 2 THEN
		RAISE EXCEPTION '0045 positive fixture changed graph cardinality';
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM sv_measurement_cycles
		WHERE id = 'b0000000-0000-0000-0000-000000000002' AND domain_id = 'LOCAL_MAPS'
	) OR NOT EXISTS (
		SELECT 1 FROM sv_cost_events
		WHERE id = 'f0000000-0000-0000-0000-000000000002' AND provider = 'stub-native'
	) THEN
		RAISE EXCEPTION '0045 changed native LOCAL_MAPS identity';
	END IF;

	IF (SELECT count(*) FROM sv_visibility_map_points WHERE organization_id = 'hardening-fixture') <> 2
		OR (SELECT count(*) FROM sv_visibility_map_datasets WHERE organization_id = 'hardening-fixture') <> 2 THEN
		RAISE EXCEPTION '0045 changed map view cardinality';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM sv_evidence_index AS evidence
		JOIN sv_measurement_datasets AS dataset ON dataset.id = evidence.dataset_id
		WHERE evidence.organization_id = 'hardening-fixture'
			AND (dataset.organization_id IS DISTINCT FROM evidence.organization_id
				OR dataset.cycle_id IS DISTINCT FROM evidence.cycle_id)
	) THEN
		RAISE EXCEPTION '0045 changed dataset links';
	END IF;

	FOREACH constraint_name IN ARRAY ARRAY[
		'sv_local_scan_cycles_measurement_domain_fk',
		'sv_evidence_index_cycle_domain_fk',
		'sv_cost_events_measurement_domain_fk'
	] LOOP
		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint
			WHERE conname = constraint_name AND contype = 'f' AND convalidated AND NOT condeferrable
		) THEN
			RAISE EXCEPTION '0045 did not restore constraint %', constraint_name;
		END IF;
	END LOOP;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'sv_configuration_locks_project_organization_fk'
			AND contype = 'f' AND convalidated AND NOT condeferrable
	) OR NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'sv_measurement_cycles_configuration_lock_scope_fk'
			AND contype = 'f' AND convalidated AND NOT condeferrable
	) OR NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'sv_local_scan_cycles_measurement_domain_fk'
			AND contype = 'f' AND convalidated AND NOT condeferrable
			AND pg_get_constraintdef(oid) LIKE '%configuration_lock_id%'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_indexes
		WHERE indexname = 'sv_projects_id_organization_unique'
			AND indexdef LIKE 'CREATE UNIQUE INDEX%'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_indexes
		WHERE indexname = 'sv_locks_project_version_unique'
			AND indexdef LIKE 'CREATE UNIQUE INDEX%'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_indexes
		WHERE indexname = 'sv_configuration_locks_id_organization_unique'
			AND indexdef LIKE 'CREATE UNIQUE INDEX%'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_indexes
		WHERE indexname = 'sv_configuration_locks_id_project_org_unique'
			AND indexdef LIKE 'CREATE UNIQUE INDEX%'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_indexes
		WHERE indexname = 'sv_measurement_cycles_id_domain_org_lock_unique'
			AND indexdef LIKE 'CREATE UNIQUE INDEX%'
	) THEN
		RAISE EXCEPTION '0045 lock identity constraints are incomplete';
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'sv_evidence_index_cycle_domain_fk'
			AND convalidated AND NOT condeferrable
			AND pg_get_constraintdef(oid) LIKE '%cycle_id, domain_id, organization_id%'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'sv_evidence_index_dataset_cycle_org_fk'
			AND convalidated AND NOT condeferrable
			AND pg_get_constraintdef(oid) LIKE '%dataset_id, cycle_id, organization_id%'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'sv_evidence_index_source_snapshot_org_fk'
			AND convalidated AND NOT condeferrable
			AND pg_get_constraintdef(oid) LIKE '%source_snapshot_id, organization_id%'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'sv_cost_events_measurement_domain_fk'
			AND convalidated AND NOT condeferrable
			AND pg_get_constraintdef(oid) LIKE '%measurement_cycle_id, domain_id, organization_id%'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_trigger
		WHERE tgname = 'sv_guard_local_cycle_project_scope' AND tgenabled = 'O'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_trigger
		WHERE tgname = 'sv_guard_local_entity_scope_mutation' AND tgenabled = 'O'
	) OR NOT EXISTS (
		SELECT 1 FROM pg_trigger
		WHERE tgname = 'sv_guard_local_location_scope_mutation' AND tgenabled = 'O'
	) THEN
		RAISE EXCEPTION '0045 future provenance constraints are incomplete';
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'sv_local_scan_cycles_domain_check'
			AND convalidated
			AND pg_get_constraintdef(oid) LIKE '%domain_id%LOCAL_MAPS%'
			AND pg_get_constraintdef(oid) NOT LIKE '% IN %'
	) THEN
		RAISE EXCEPTION '0045 local-domain check is not strict';
	END IF;

	IF EXISTS (
		SELECT 1 FROM pg_trigger
		WHERE tgname IN (
			'sv_prevent_cost_event_mutation',
			'sv_prevent_cost_event_truncate',
			'sv_prevent_configuration_lock_mutation',
			'sv_prevent_configuration_lock_truncate'
		) AND tgenabled <> 'O'
	) OR (
		SELECT count(*) FROM pg_trigger
		WHERE tgname IN (
			'sv_prevent_cost_event_mutation',
			'sv_prevent_cost_event_truncate',
			'sv_prevent_configuration_lock_mutation',
			'sv_prevent_configuration_lock_truncate'
		)
	) <> 4 THEN
		RAISE EXCEPTION '0045 append-only trigger state mismatch';
	END IF;

	BEGIN
		UPDATE sv_configuration_locks SET version = version WHERE id = '20000000-0000-0000-0000-000000000001';
		RAISE EXCEPTION 'configuration-lock no-op update unexpectedly succeeded';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'CONFIGURATION_LOCK_APPEND_ONLY' THEN RAISE; END IF;
	END;
	BEGIN
		DELETE FROM sv_configuration_locks WHERE id = '20000000-0000-0000-0000-000000000001';
		RAISE EXCEPTION 'configuration-lock delete unexpectedly succeeded';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'CONFIGURATION_LOCK_APPEND_ONLY' THEN RAISE; END IF;
	END;
	BEGIN
		TRUNCATE TABLE sv_configuration_locks CASCADE;
		RAISE EXCEPTION 'configuration-lock truncate unexpectedly succeeded';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'CONFIGURATION_LOCK_APPEND_ONLY' THEN RAISE; END IF;
	END;

	INSERT INTO sv_configuration_locks (
		organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	) VALUES (
		'hardening-fixture', '10000000-0000-0000-0000-000000000001', 3,
		'{"source":"new-version"}', 'hardening-fixture', 1, 10, 'hardening-fixture'
	);
	BEGIN
		INSERT INTO sv_configuration_locks (
			organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
		) VALUES (
			'hardening-fixture', '10000000-0000-0000-0000-000000000001', 3,
			'{"source":"duplicate-version"}', 'hardening-fixture', 1, 10, 'hardening-fixture'
		);
		RAISE EXCEPTION 'duplicate configuration-lock version unexpectedly succeeded';
	EXCEPTION WHEN unique_violation THEN NULL;
	END;

	BEGIN
		UPDATE sv_cost_events SET amount_usd = amount_usd WHERE id = 'f0000000-0000-0000-0000-000000000001';
		RAISE EXCEPTION 'cost-event no-op update unexpectedly succeeded';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'COST_EVENT_APPEND_ONLY' THEN RAISE; END IF;
	END;
	BEGIN
		DELETE FROM sv_cost_events WHERE id = 'f0000000-0000-0000-0000-000000000001';
		RAISE EXCEPTION 'cost-event delete unexpectedly succeeded';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'COST_EVENT_APPEND_ONLY' THEN RAISE; END IF;
	END;
	BEGIN
		TRUNCATE TABLE sv_cost_events CASCADE;
		RAISE EXCEPTION 'cost-event truncate unexpectedly succeeded';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'COST_EVENT_APPEND_ONLY' THEN RAISE; END IF;
	END;

	INSERT INTO organization (id, name, slug, created_at)
	VALUES ('hardening-other-tenant', 'Hardening Other Tenant', 'hardening-other-tenant', now());
	INSERT INTO sv_projects (id, organization_id, name, category, country, status)
	VALUES
		(
			'10000000-0000-0000-0000-000000000002', 'hardening-fixture',
			'Hardening Other Project', 'test', 'ID', 'DRAFT'
		),
		(
			'10000000-0000-0000-0000-000000000004', 'hardening-other-tenant',
			'Hardening Other Tenant Project', 'test', 'ID', 'DRAFT'
		);
	INSERT INTO sv_configuration_locks (
		id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	) VALUES (
		'20000000-0000-0000-0000-000000000003', 'hardening-fixture',
		'10000000-0000-0000-0000-000000000002', 1, '{"source":"other-project"}',
		'hardening-fixture', 1, 10, 'hardening-fixture'
	);
	INSERT INTO sv_configuration_locks (
		id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	) VALUES (
		'20000000-0000-0000-0000-000000000004', 'hardening-other-tenant',
		'10000000-0000-0000-0000-000000000004', 1, '{"source":"other-tenant"}',
		'hardening-fixture', 1, 10, 'hardening-fixture'
	);
	INSERT INTO sv_measurement_cycles (
		id, organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
	) VALUES (
		'b0000000-0000-0000-0000-000000000004', 'hardening-other-tenant', 'LOCAL_MAPS',
		'c0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'COMPLETED'
	);
	INSERT INTO sv_measurement_datasets (id, organization_id, cycle_id, dataset_key, version)
	VALUES (
		'd0000000-0000-0000-0000-000000000004', 'hardening-other-tenant',
		'b0000000-0000-0000-0000-000000000004', 'hardening-other-tenant', 1
	);
	INSERT INTO sv_source_snapshots (
		id, organization_id, source_type, source_ref, content_sha256, snapshot, captured_at
	) VALUES (
		'02000000-0000-0000-0000-000000000004', 'hardening-other-tenant',
		'test', 'stub://other-tenant', repeat('a', 64), '{}', now()
	);
	INSERT INTO sv_entities (id, organization_id, project_id, entity_kind, confirmation_status, name)
	VALUES (
		'60000000-0000-0000-0000-000000000002', 'hardening-fixture',
		'10000000-0000-0000-0000-000000000002', 'LOCATION_BRAND', 'CLIENT_CONFIRMED',
		'Hardening Other Project Entity'
	);
	BEGIN
		UPDATE sv_local_scan_cycles
		SET configuration_lock_id = '20000000-0000-0000-0000-000000000003'
		WHERE id = 'c0000000-0000-0000-0000-000000000002';
		RAISE EXCEPTION 'cross-project local-cycle update unexpectedly succeeded';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'LOCAL_MAPS_LOCATION_LOCK_PROJECT_SCOPE_MISMATCH' THEN RAISE; END IF;
	END;
	BEGIN
		UPDATE sv_entities
		SET project_id = '10000000-0000-0000-0000-000000000002'
		WHERE id = '60000000-0000-0000-0000-000000000001';
		RAISE EXCEPTION 'entity project mutation unexpectedly succeeded';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'LOCAL_MAPS_ENTITY_SCOPE_MUTATION_BLOCKED' THEN RAISE; END IF;
	END;
	BEGIN
		UPDATE sv_business_locations
		SET entity_id = '60000000-0000-0000-0000-000000000002'
		WHERE id = '70000000-0000-0000-0000-000000000001';
		RAISE EXCEPTION 'location entity mutation unexpectedly succeeded';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'LOCAL_MAPS_LOCATION_SCOPE_MUTATION_BLOCKED' THEN RAISE; END IF;
	END;
	BEGIN
		INSERT INTO sv_cost_events (
			organization_id, measurement_cycle_id, domain_id, provider, amount_usd, basis
		) VALUES (
			'hardening-other-tenant', 'b0000000-0000-0000-0000-000000000002',
			'LOCAL_MAPS', 'cross-tenant', 1, 'actual'
		);
		RAISE EXCEPTION 'cross-tenant cost event unexpectedly succeeded';
	EXCEPTION WHEN foreign_key_violation THEN NULL;
	END;
	BEGIN
		INSERT INTO sv_evidence_index (
			organization_id, domain_id, cycle_id, observation_ref, dataset_id, captured_at
		) VALUES (
			'hardening-other-tenant', 'LOCAL_MAPS', 'b0000000-0000-0000-0000-000000000002',
			'cross-tenant-evidence', 'd0000000-0000-0000-0000-000000000002', now()
		);
		RAISE EXCEPTION 'cross-tenant evidence unexpectedly succeeded';
	EXCEPTION WHEN foreign_key_violation THEN NULL;
	END;
	BEGIN
		INSERT INTO sv_evidence_index (
			organization_id, domain_id, cycle_id, observation_ref, dataset_id, captured_at
		) VALUES (
			'hardening-fixture', 'LOCAL_MAPS', 'b0000000-0000-0000-0000-000000000002',
			'foreign-dataset-evidence', 'd0000000-0000-0000-0000-000000000004', now()
		);
		RAISE EXCEPTION 'foreign dataset evidence unexpectedly succeeded';
	EXCEPTION WHEN foreign_key_violation THEN NULL;
	END;
	BEGIN
		INSERT INTO sv_evidence_index (
			organization_id, domain_id, cycle_id, observation_ref, dataset_id, source_snapshot_id, captured_at
		) VALUES (
			'hardening-fixture', 'LOCAL_MAPS', 'b0000000-0000-0000-0000-000000000002',
			'foreign-source-evidence', 'd0000000-0000-0000-0000-000000000002',
			'02000000-0000-0000-0000-000000000004', now()
		);
		RAISE EXCEPTION 'foreign source snapshot evidence unexpectedly succeeded';
	EXCEPTION WHEN foreign_key_violation THEN NULL;
	END;

	IF (SELECT count(*) FROM sv_configuration_locks WHERE project_id = '10000000-0000-0000-0000-000000000001') <> 3
		OR (SELECT count(*) FROM sv_configuration_locks WHERE project_id = '10000000-0000-0000-0000-000000000002') <> 1
		OR (SELECT count(*) FROM sv_cost_events WHERE organization_id = 'hardening-fixture') <> 2 THEN
		RAISE EXCEPTION 'append-only DML changed protected rows';
	END IF;
END;
$$;
SQL

lock_collision_database="${database_prefix}_lock_collision"
reset_database "$lock_collision_database"
apply_through_0044 "$lock_collision_database"
seed_project_and_lock "$lock_collision_database"
run_psql "$lock_collision_database" <<'SQL'
INSERT INTO sv_configuration_locks (
	organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
)
VALUES (
	'hardening-fixture', '10000000-0000-0000-0000-000000000001', 1,
	'{"source":"collision"}', 'hardening-fixture', 1, 10, 'hardening-fixture'
);
SQL
assert_failed_migration_is_atomic "$lock_collision_database" 'CONFIGURATION_LOCK_0045_PROJECT_VERSION_COLLISION'

scope_mismatch_database="${database_prefix}_scope_mismatch"
reset_database "$scope_mismatch_database"
apply_through_0044 "$scope_mismatch_database"
seed_project_and_lock "$scope_mismatch_database"
run_psql "$scope_mismatch_database" <<'SQL'
INSERT INTO organization (id, name, slug, created_at)
VALUES ('hardening-other-tenant', 'Hardening Other Tenant', 'hardening-other-tenant', now());

UPDATE sv_configuration_locks
SET organization_id = 'hardening-other-tenant'
WHERE id = '20000000-0000-0000-0000-000000000001';
SQL
assert_failed_migration_is_atomic "$scope_mismatch_database" 'CONFIGURATION_LOCK_0045_PROJECT_ORGANIZATION_MISMATCH'

measurement_lock_scope_database="${database_prefix}_measurement_lock_scope"
reset_database "$measurement_lock_scope_database"
apply_through_0044 "$measurement_lock_scope_database"
seed_project_and_lock "$measurement_lock_scope_database"
run_psql "$measurement_lock_scope_database" <<'SQL'
INSERT INTO organization (id, name, slug, created_at)
VALUES ('hardening-other-tenant', 'Hardening Other Tenant', 'hardening-other-tenant', now());

INSERT INTO sv_measurement_cycles (organization_id, domain_id, domain_cycle_id, configuration_lock_id)
VALUES (
	'hardening-other-tenant', 'LOCAL', 'b3000000-0000-0000-0000-000000000001',
	'20000000-0000-0000-0000-000000000001'
);
SQL
assert_failed_migration_is_atomic "$measurement_lock_scope_database" 'MEASUREMENT_CYCLE_0045_CONFIGURATION_LOCK_SCOPE_MISMATCH'

local_lock_mismatch_database="${database_prefix}_local_lock_mismatch"
reset_database "$local_lock_mismatch_database"
apply_through_0044 "$local_lock_mismatch_database"
seed_project_and_lock "$local_lock_mismatch_database"
run_psql "$local_lock_mismatch_database" <<'SQL'
INSERT INTO sv_configuration_locks (
	id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
)
VALUES (
	'20000000-0000-0000-0000-000000000002',
	'hardening-fixture',
	'10000000-0000-0000-0000-000000000001',
	2,
	'{"visibilityOs":{"local":{"plannedCalls":1,"worstCaseCalls":1,"worstCaseCost":1}}}',
	'hardening-fixture', 1, 10, 'hardening-fixture'
);

INSERT INTO sv_entities (id, organization_id, project_id, entity_kind, confirmation_status, name)
VALUES (
	'63000000-0000-0000-0000-000000000001', 'hardening-fixture',
	'10000000-0000-0000-0000-000000000001', 'LOCATION_BRAND', 'CLIENT_CONFIRMED', 'Mismatch Location'
);

INSERT INTO sv_business_locations (
	id, organization_id, entity_id, display_name, country_code, latitude, longitude, geo_precision, confirmation_status
)
VALUES (
	'73000000-0000-0000-0000-000000000001', 'hardening-fixture',
	'63000000-0000-0000-0000-000000000001', 'Mismatch Location', 'ID',
	-8.506900, 115.262500, 'COORDINATE', 'CONFIRMED'
);

INSERT INTO sv_local_keywords (id, organization_id, location_id, text, normalized_text, language, status)
VALUES (
	'83000000-0000-0000-0000-000000000001', 'hardening-fixture',
	'73000000-0000-0000-0000-000000000001', 'mismatch query', 'mismatch query', 'en', 'APPROVED'
);

INSERT INTO sv_grid_definitions (
	id, organization_id, location_id, version, point_count, spacing_meters, shape, rows, columns,
	center_latitude, center_longitude, formula_version
)
VALUES (
	'93000000-0000-0000-0000-000000000001', 'hardening-fixture',
	'73000000-0000-0000-0000-000000000001', 1, 1, 400, 'SQUARE', 1, 1,
	-8.506900, 115.262500, 'square-grid/1'
);

INSERT INTO sv_grid_points (id, organization_id, grid_id, point_index, latitude, longitude)
VALUES (
	'a3000000-0000-0000-0000-000000000001', 'hardening-fixture',
	'93000000-0000-0000-0000-000000000001', 0, -8.506900, 115.262500
);

INSERT INTO sv_measurement_cycles (
	id, organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
)
VALUES (
	'b3000000-0000-0000-0000-000000000002', 'hardening-fixture', 'LOCAL',
	'c3000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'CREATED'
);

INSERT INTO sv_local_scan_cycles (
	id, organization_id, measurement_cycle_id, domain_id, configuration_lock_id, location_id,
	grid_definition_id, provider, repeats, capture_depth, expected_observations, worst_case_cost_usd,
	cost_snapshot, status
)
VALUES (
	'c3000000-0000-0000-0000-000000000001', 'hardening-fixture',
	'b3000000-0000-0000-0000-000000000002', 'LOCAL',
	'20000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000001',
	'93000000-0000-0000-0000-000000000001', 'stub-mismatch', 1, 20, 1, 1,
	'{"plannedCalls":1,"worstCaseCalls":1,"worstCaseCost":1}', 'CREATED'
);
SQL
assert_failed_migration_is_atomic "$local_lock_mismatch_database" 'LOCAL_MAPS_0045_LOCAL_CYCLE_LOCK_SCOPE_MISMATCH'

cycle_collision_database="${database_prefix}_cycle_collision"
reset_database "$cycle_collision_database"
apply_through_0044 "$cycle_collision_database"
seed_project_and_lock "$cycle_collision_database"
run_psql "$cycle_collision_database" <<'SQL'
INSERT INTO sv_measurement_cycles (organization_id, domain_id, domain_cycle_id, configuration_lock_id)
VALUES
	(
		'hardening-fixture', 'LOCAL', 'b1000000-0000-0000-0000-000000000001',
		'20000000-0000-0000-0000-000000000001'
	),
	(
		'hardening-fixture', 'LOCAL_MAPS', 'b1000000-0000-0000-0000-000000000001',
		'20000000-0000-0000-0000-000000000001'
	);
SQL
assert_failed_migration_is_atomic "$cycle_collision_database" 'LOCAL_MAPS_0045_MEASUREMENT_CYCLE_COLLISION'

evidence_collision_database="${database_prefix}_evidence_collision"
reset_database "$evidence_collision_database"
apply_through_0044 "$evidence_collision_database"
seed_project_and_lock "$evidence_collision_database"
run_psql "$evidence_collision_database" <<'SQL'
INSERT INTO sv_measurement_cycles (id, organization_id, domain_id, domain_cycle_id, configuration_lock_id)
VALUES
	(
		'b2000000-0000-0000-0000-000000000001', 'hardening-fixture', 'LOCAL',
		'b2100000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'
	),
	(
		'b2000000-0000-0000-0000-000000000002', 'hardening-fixture', 'LOCAL_MAPS',
		'b2100000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'
	);

INSERT INTO sv_measurement_datasets (id, organization_id, cycle_id, dataset_key, version)
VALUES
	(
		'd2000000-0000-0000-0000-000000000001', 'hardening-fixture',
		'b2000000-0000-0000-0000-000000000001', 'collision', 1
	),
	(
		'd2000000-0000-0000-0000-000000000002', 'hardening-fixture',
		'b2000000-0000-0000-0000-000000000002', 'collision', 2
	);

INSERT INTO sv_evidence_index (organization_id, domain_id, cycle_id, observation_ref, dataset_id, captured_at)
VALUES
	(
		'hardening-fixture', 'LOCAL', 'b2000000-0000-0000-0000-000000000001',
		'collision-observation', 'd2000000-0000-0000-0000-000000000001', now()
	),
	(
		'hardening-fixture', 'LOCAL_MAPS', 'b2000000-0000-0000-0000-000000000002',
		'collision-observation', 'd2000000-0000-0000-0000-000000000002', now()
	);
SQL
assert_failed_migration_is_atomic "$evidence_collision_database" 'LOCAL_MAPS_0045_EVIDENCE_COLLISION'

echo "Visibility OS 0045 hardening gate passed"
