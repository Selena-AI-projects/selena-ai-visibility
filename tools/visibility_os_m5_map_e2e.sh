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

bash "$repo_root/tools/visibility_os_m4_evidence_loop_e2e.sh" "$compose_file"
if [[ "$("${psql[@]}" -Atc "SELECT to_regclass('public.sv_visibility_map_points')")" != "sv_visibility_map_points" ]]; then
	"${psql[@]}" < "$repo_root/packages/lib/src/db/migrations/0041_visibility_os_visibility_map.sql"
fi

"${psql[@]}" <<'SQL'
INSERT INTO organization (id, name, slug, created_at)
VALUES
	('m5-gate-a', 'M5 Gate A', 'm5-gate-a', now()),
	('m5-gate-b', 'M5 Gate B', 'm5-gate-b', now());

DO $$
DECLARE
	org_id text;
	project_id uuid;
	lock_id uuid;
	entity_id uuid;
	location_id uuid;
	keyword_id uuid;
	map_grid_id uuid;
	measurement_cycle_id uuid;
	local_cycle_id uuid;
	map_dataset_id uuid;
	snapshot_id uuid;
	cycle_version integer;
	runs_before integer;
	costs_before integer;
	runs_after integer;
	costs_after integer;
	hash_character text;
	observation_time timestamptz;
BEGIN
	FOREACH org_id IN ARRAY ARRAY['m5-gate-a', 'm5-gate-b'] LOOP
		INSERT INTO sv_projects (organization_id, name, category, country, region, status)
		VALUES (org_id, 'M5 Gate Project', 'test', 'ID', 'Bali', 'DRAFT')
		RETURNING id INTO project_id;

		INSERT INTO sv_configuration_locks (
			organization_id,
			project_id,
			version,
			snapshot,
			engine_sha,
			expected_runs,
			budget_cap,
			created_by
		)
		VALUES (
			org_id,
			project_id,
			1,
			'{"visibilityOs":{"local":{"plannedCalls":9,"worstCaseCalls":9,"worstCaseCost":0}}}',
			'm5-gate',
			9,
			0,
			'm5-gate'
		)
		RETURNING id INTO lock_id;

		INSERT INTO sv_entities (organization_id, project_id, entity_kind, confirmation_status, name)
		VALUES (org_id, project_id, 'LOCATION_BRAND', 'CLIENT_CONFIRMED', 'M5 Gate Location')
		RETURNING id INTO entity_id;

		INSERT INTO sv_business_locations (
			organization_id,
			entity_id,
			display_name,
			country_code,
			admin_area,
			locality,
			latitude,
			longitude,
			geo_precision,
			confirmation_status,
			local_profile,
			local_profile_confirmed_at
		)
		VALUES (
			org_id,
			entity_id,
			'M5 Gate Location',
			'ID',
			'Bali',
			'Ubud',
			-8.506900,
			115.262500,
			'COORDINATE',
			'CONFIRMED',
			'{"category":"test"}',
			now()
		)
		RETURNING id INTO location_id;

		INSERT INTO sv_local_keywords (
			organization_id, location_id, text, normalized_text, language, status
		)
		VALUES (org_id, location_id, 'best bakery ubud', 'best bakery ubud', 'en', 'APPROVED')
		RETURNING id INTO keyword_id;

		INSERT INTO sv_grid_definitions (
			organization_id,
			location_id,
			version,
			point_count,
			spacing_meters,
			shape,
			rows,
			columns,
			center_latitude,
			center_longitude,
			formula_version
		)
		VALUES (org_id, location_id, 1, 9, 400, 'SQUARE', 3, 3, -8.506900, 115.262500, 'square-grid/1')
		RETURNING id INTO map_grid_id;

		INSERT INTO sv_grid_points (organization_id, grid_id, point_index, latitude, longitude)
		SELECT
			org_id,
			map_grid_id,
			point_index,
			-8.506900 + ((point_index / 3) - 1) * 0.003593,
			115.262500 + ((point_index % 3) - 1) * 0.003634
		FROM generate_series(0, 8) AS point_index;

		SELECT count(*) INTO runs_before FROM sv_runs WHERE organization_id = org_id;
		SELECT count(*) INTO costs_before FROM sv_cost_events WHERE organization_id = org_id;

		FOR cycle_version IN 1..2 LOOP
			local_cycle_id := gen_random_uuid();
			observation_time := CASE
				WHEN cycle_version = 1 THEN '2026-08-01T00:00:00Z'::timestamptz
				ELSE '2026-09-01T00:00:00Z'::timestamptz
			END;

			INSERT INTO sv_measurement_cycles (
				organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
			)
			VALUES (org_id, 'LOCAL', local_cycle_id, lock_id, 'COMPLETED')
			RETURNING id INTO measurement_cycle_id;

			INSERT INTO sv_local_scan_cycles (
				id,
				organization_id,
				measurement_cycle_id,
				configuration_lock_id,
				location_id,
				grid_definition_id,
				provider,
				repeats,
				capture_depth,
				expected_observations,
				worst_case_cost_usd,
				cost_snapshot,
				status
			)
			VALUES (
				local_cycle_id,
				org_id,
				measurement_cycle_id,
				lock_id,
				location_id,
				map_grid_id,
				'stub-local-rank',
				1,
				20,
				9,
				0,
				'{"plannedCalls":9,"worstCaseCalls":9,"worstCaseCost":0}',
				'RUNNING'
			);

			INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
			VALUES (org_id, measurement_cycle_id, org_id || ':m5-map', cycle_version)
			RETURNING id INTO map_dataset_id;

			INSERT INTO sv_local_rank_observations (
				organization_id,
				cycle_id,
				location_id,
				keyword_id,
				grid_definition_id,
				grid_point_id,
				provider,
				repeat_index,
				validity,
				invalid_reason,
				capture_depth,
				capture_mode,
				target_rank,
				captured_at
			)
			SELECT
				org_id,
				local_cycle_id,
				location_id,
				keyword_id,
				map_grid_id,
				point.id,
				'stub-local-rank',
				0,
				CASE
					WHEN point.point_index = 2 THEN 'INVALID'::sv_local_rank_validity
					WHEN point.point_index = 3 THEN 'UNMEASURED'::sv_local_rank_validity
					ELSE 'VALID'::sv_local_rank_validity
				END,
				CASE
					WHEN point.point_index = 2 THEN 'STUB_TECHNICAL_INVALID'
					WHEN point.point_index = 3 THEN 'STUB_PROVIDER_UNKNOWN'
					ELSE NULL
				END,
				20,
				'STUB',
				CASE
					WHEN point.point_index IN (1, 2, 3) THEN NULL
					ELSE point.point_index + cycle_version
				END,
				observation_time + point.point_index * interval '1 minute'
			FROM sv_grid_points AS point
			WHERE point.grid_id = map_grid_id
			ORDER BY point.point_index;

			UPDATE sv_local_scan_cycles SET status = 'READY' WHERE id = local_cycle_id;

			hash_character := CASE
				WHEN org_id = 'm5-gate-a' AND cycle_version = 1 THEN 'c'
				WHEN org_id = 'm5-gate-a' AND cycle_version = 2 THEN 'd'
				WHEN org_id = 'm5-gate-b' AND cycle_version = 1 THEN 'e'
				ELSE 'f'
			END;
			INSERT INTO sv_source_snapshots (
				organization_id, source_type, source_ref, content_sha256, snapshot, captured_at
			)
			VALUES (
				org_id,
				'fixture',
				org_id || ':m5-map:' || cycle_version,
				repeat(hash_character, 64),
				jsonb_build_object('source', 'm5-gate', 'version', cycle_version),
				observation_time
			)
			RETURNING id INTO snapshot_id;

			INSERT INTO sv_evidence_index (
				organization_id,
				domain_id,
				cycle_id,
				observation_ref,
				dataset_id,
				source_snapshot_id,
				captured_at
			)
			SELECT
				org_id,
				'LOCAL',
				measurement_cycle_id,
				observation.id::text,
				map_dataset_id,
				snapshot_id,
				observation.captured_at
			FROM sv_local_rank_observations AS observation
			JOIN sv_grid_points AS point ON point.id = observation.grid_point_id
			WHERE observation.cycle_id = local_cycle_id AND point.point_index < 8;

			IF (
				SELECT count(*) FROM sv_visibility_map_points
				WHERE organization_id = org_id AND dataset_id = map_dataset_id
			) <> 8 THEN
				RAISE EXCEPTION 'M5 point view included an observation without dataset evidence';
			END IF;

			INSERT INTO sv_evidence_index (
				organization_id,
				domain_id,
				cycle_id,
				observation_ref,
				dataset_id,
				source_snapshot_id,
				captured_at
			)
			SELECT
				org_id,
				'LOCAL',
				measurement_cycle_id,
				observation.id::text,
				map_dataset_id,
				snapshot_id,
				observation.captured_at
			FROM sv_local_rank_observations AS observation
			JOIN sv_grid_points AS point ON point.id = observation.grid_point_id
			WHERE observation.cycle_id = local_cycle_id AND point.point_index = 8;
		END LOOP;

		IF (SELECT count(*) FROM sv_visibility_map_points WHERE organization_id = org_id) <> 18
			OR (SELECT count(*) FROM sv_visibility_map_datasets WHERE organization_id = org_id) <> 2 THEN
			RAISE EXCEPTION 'M5 read-model cardinality mismatch for %', org_id;
		END IF;

		IF EXISTS (
			SELECT 1 FROM sv_visibility_map_points
			WHERE organization_id = org_id
				AND (
					observation_id IS NULL
					OR dataset_id IS NULL
					OR captured_at IS NULL
					OR provider IS NULL
					OR keyword IS NULL
					OR interpolated
					OR materialization_kind <> 'LIVE_VIEW'
					OR refreshed_at IS NOT NULL
					OR is_stale
				)
		) THEN
			RAISE EXCEPTION 'M5 map point lost provenance or honest freshness';
		END IF;

		IF (
			SELECT count(DISTINCT display_status) FROM sv_visibility_map_points
			WHERE organization_id = org_id
		) <> 4 THEN
			RAISE EXCEPTION 'M5 point statuses are not distinguishable for %', org_id;
		END IF;

		IF EXISTS (
			SELECT 1 FROM sv_visibility_map_datasets
			WHERE organization_id = org_id
				AND (
					dataset_status <> 'READY'
					OR cardinality(keyword_ids) <> 1
					OR cardinality(providers) <> 1
					OR cardinality(locales) <> 1
					OR cardinality(device_contexts) <> 1
					OR cardinality(formula_versions) <> 1
					OR observation_count <> 9
				)
		) THEN
			RAISE EXCEPTION 'M5 dataset compatibility read-model mismatch for %', org_id;
		END IF;

		SELECT count(*) INTO runs_after FROM sv_runs WHERE organization_id = org_id;
		SELECT count(*) INTO costs_after FROM sv_cost_events WHERE organization_id = org_id;
		IF runs_after <> runs_before OR costs_after <> costs_before THEN
			RAISE EXCEPTION 'M5 created a measurement run or cost for %', org_id;
		END IF;
	END LOOP;
END $$;

DO $$
DECLARE
	secure_view_count integer;
BEGIN
	SELECT count(*) INTO secure_view_count
	FROM pg_class
	WHERE relname IN ('sv_visibility_map_points', 'sv_visibility_map_datasets')
		AND relkind = 'v'
		AND 'security_invoker=true' = ANY(reloptions);
	IF secure_view_count <> 2 THEN
		RAISE EXCEPTION 'M5 read-model views are not security invokers';
	END IF;
	IF EXISTS (
		SELECT 1 FROM pg_class
		WHERE relname LIKE 'sv_visibility_map_%' AND relkind = 'm'
	) THEN
		RAISE EXCEPTION 'M5 unexpectedly created a materialized view';
	END IF;
END $$;

CREATE ROLE selena_m5_gate_runtime NOLOGIN;
GRANT USAGE ON SCHEMA public TO selena_m5_gate_runtime;
GRANT SELECT ON
	sv_visibility_map_points,
	sv_visibility_map_datasets,
	sv_local_rank_observations,
	sv_local_scan_cycles,
	sv_evidence_index,
	sv_measurement_datasets,
	sv_grid_definitions,
	sv_grid_points,
	sv_local_keywords,
	sv_business_locations,
	sv_entities
TO selena_m5_gate_runtime;

SET ROLE selena_m5_gate_runtime;
SET app.organization_id = 'm5-gate-a';

DO $$
BEGIN
	IF (SELECT count(*) FROM sv_visibility_map_points) <> 18
		OR (SELECT count(*) FROM sv_visibility_map_datasets) <> 2 THEN
		RAISE EXCEPTION 'M5 tenant isolation failed';
	END IF;
END $$;

RESET ROLE;
DROP OWNED BY selena_m5_gate_runtime;
DROP ROLE selena_m5_gate_runtime;

SELECT 'Visibility OS M5 Visibility Map scratch subset: PASS' AS result;
SQL
