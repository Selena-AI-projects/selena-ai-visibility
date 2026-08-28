#!/usr/bin/env bash
set -euo pipefail

compose_file="${1:-../tmp/selena-visibility-test-compose.yml}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
psql=(docker-compose -p selena-visibility-test -f "$compose_file" exec -T postgres psql -U selena_test -d selena_visibility_test -v ON_ERROR_STOP=1)

"${psql[@]}" < "$repo_root/packages/lib/src/db/migrations/_pending-os/M2_local_visibility.sql"

"${psql[@]}" <<'SQL'
INSERT INTO organization (id, name, slug, created_at)
VALUES
	('m2-gate-a', 'M2 Gate A', 'm2-gate-a', now()),
	('m2-gate-b', 'M2 Gate B', 'm2-gate-b', now());

DO $$
DECLARE
	org_id text;
	project_id uuid;
	lock_id uuid;
	quote_id uuid;
	order_id uuid;
	legacy_ai_cycle_id uuid;
	local_measurement_cycle_id uuid;
	local_scan_cycle_id uuid;
	entity_id uuid;
	location_id uuid;
	keyword_id uuid;
	grid_uuid uuid;
	point_id uuid;
	observation_id uuid;
	dataset_id uuid;
	snapshot_id uuid;
	point_total integer;
	runs_before integer;
	runs_after integer;
	created_before integer;
	created_after integer;
	retry_allowed boolean;
	cost_snapshot jsonb;
BEGIN
	FOREACH org_id IN ARRAY ARRAY['m2-gate-a', 'm2-gate-b'] LOOP
		point_total := CASE WHEN org_id = 'm2-gate-a' THEN 9 ELSE 1 END;
		cost_snapshot := jsonb_build_object(
			'plannedCalls', point_total,
			'worstCaseCalls', point_total * 2,
			'worstCaseCost', point_total::numeric / 100
		);

		INSERT INTO sv_projects (organization_id, name, category, country, region, status)
		VALUES (org_id, 'M2 Gate Project', 'test', 'ID', 'Bali', 'DRAFT')
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
			jsonb_build_object('visibilityOs', jsonb_build_object('local', cost_snapshot)),
			'm2-gate',
			point_total,
			3,
			'm2-gate'
		)
		RETURNING id INTO lock_id;

		INSERT INTO sv_quotes (
			organization_id,
			project_id,
			lock_id,
			status,
			price_amount,
			currency,
			expected_runs,
			expires_at
		)
		VALUES (org_id, project_id, lock_id, 'ISSUED', 0, 'USD', 1, now() + interval '1 day')
		RETURNING id INTO quote_id;

		INSERT INTO sv_orders (organization_id, project_id, quote_id, lock_id, status, order_cap)
		VALUES (org_id, project_id, quote_id, lock_id, 'APPROVED', 0)
		RETURNING id INTO order_id;

		INSERT INTO sv_cycles (organization_id, order_id, lock_id, status, expected_runs)
		VALUES (org_id, order_id, lock_id, 'QUEUED', 1)
		RETURNING id INTO legacy_ai_cycle_id;

		INSERT INTO sv_measurement_cycles (
			id,
			organization_id,
			domain_id,
			domain_cycle_id,
			configuration_lock_id,
			status
		)
		VALUES (legacy_ai_cycle_id, org_id, 'AI', legacy_ai_cycle_id, lock_id, 'QUEUED');

		INSERT INTO sv_entities (
			organization_id,
			project_id,
			entity_kind,
			confirmation_status,
			name
		)
		VALUES (org_id, project_id, 'LOCATION_BRAND', 'CLIENT_CONFIRMED', 'M2 Gate Location')
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
			'M2 Gate Location',
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
			organization_id,
			location_id,
			text,
			normalized_text,
			language,
			status
		)
		VALUES (org_id, location_id, 'test local query', 'test local query', 'en', 'APPROVED')
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
		VALUES (
			org_id,
			location_id,
			1,
			point_total,
			400,
			'SQUARE',
			CASE WHEN point_total = 9 THEN 3 ELSE 1 END,
			CASE WHEN point_total = 9 THEN 3 ELSE 1 END,
			-8.506900,
			115.262500,
			'square-grid/1'
		)
		RETURNING id INTO grid_uuid;

		INSERT INTO sv_grid_points (organization_id, grid_id, point_index, latitude, longitude)
		SELECT
			org_id,
			grid_uuid,
			point_index,
			-8.506900 + ((point_index / 3) - 1) * 0.003593,
			115.262500 + ((point_index % 3) - 1) * 0.003634
		FROM generate_series(0, point_total - 1) AS point_index;

		local_scan_cycle_id := gen_random_uuid();
		SELECT count(*) INTO runs_before FROM sv_runs WHERE organization_id = org_id;
		INSERT INTO sv_measurement_cycles (
			organization_id,
			domain_id,
			domain_cycle_id,
			configuration_lock_id,
			status
		)
		VALUES (org_id, 'LOCAL', local_scan_cycle_id, lock_id, 'RUNNING')
		RETURNING id INTO local_measurement_cycle_id;

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
			local_scan_cycle_id,
			org_id,
			local_measurement_cycle_id,
			lock_id,
			location_id,
			grid_uuid,
			'stub-local-rank',
			1,
			20,
			point_total,
			point_total::numeric / 100,
			cost_snapshot,
			'RUNNING'
		);
		SELECT count(*) INTO runs_after FROM sv_runs WHERE organization_id = org_id;
		IF runs_after <> runs_before THEN
			RAISE EXCEPTION 'Local cycle created an AI run for %', org_id;
		END IF;

		SELECT id INTO point_id
		FROM sv_grid_points
		WHERE grid_id = grid_uuid AND point_index = 0
		ORDER BY id
		LIMIT 1;

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
		VALUES (
			org_id,
			local_scan_cycle_id,
			location_id,
			keyword_id,
			grid_uuid,
			point_id,
			'stub-local-rank',
			0,
			CASE WHEN org_id = 'm2-gate-a' THEN 'INVALID'::sv_local_rank_validity ELSE 'VALID'::sv_local_rank_validity END,
			CASE WHEN org_id = 'm2-gate-a' THEN 'STUB_TECHNICAL_INVALID' ELSE NULL END,
			20,
			'STUB',
			CASE WHEN org_id = 'm2-gate-a' THEN NULL ELSE 1 END,
			now()
		)
		RETURNING id INTO observation_id;

		IF org_id = 'm2-gate-a' THEN
			BEGIN
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
					captured_at
				)
				VALUES (
					org_id,
					local_scan_cycle_id,
					location_id,
					keyword_id,
					grid_uuid,
					point_id,
					'stub-local-rank',
					0,
					'INVALID',
					'STUB_DUPLICATE',
					20,
					'STUB',
					now()
				);
				RAISE EXCEPTION 'duplicate Local observation was accepted';
			EXCEPTION
				WHEN unique_violation THEN NULL;
			END;

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
				local_scan_cycle_id,
				location_id,
				keyword_id,
				grid_uuid,
				point.id,
				'stub-local-rank',
				0,
				CASE WHEN point.point_index = 1 THEN 'UNMEASURED'::sv_local_rank_validity ELSE 'VALID'::sv_local_rank_validity END,
				CASE WHEN point.point_index = 1 THEN 'STUB_SURFACE_UNAVAILABLE' ELSE NULL END,
				20,
				'STUB',
				CASE WHEN point.point_index = 1 THEN NULL ELSE point.point_index + 1 END,
				now()
			FROM sv_grid_points AS point
			WHERE point.grid_id = grid_uuid AND point.point_index > 0
			ORDER BY point.point_index;
		END IF;

		INSERT INTO sv_local_competitor_observations (
			organization_id,
			observation_id,
			rank,
			entity_name,
			matched_entity_id,
			match_status
		)
		VALUES (org_id, observation_id, 1, 'Observed entity', entity_id, 'EXACT_ALIAS');
		IF org_id = 'm2-gate-a' THEN
			INSERT INTO sv_local_competitor_observations (
				organization_id,
				observation_id,
				rank,
				entity_name,
				match_status
			)
			VALUES (org_id, observation_id, 2, 'Observed competitor', 'UNRESOLVED');
		END IF;

		INSERT INTO sv_local_visibility_metrics (
			organization_id,
			cycle_id,
			keyword_id,
			formula_version,
			top3_coverage,
			top10_coverage,
			top20_coverage,
			outside_top20,
			average_rank,
			found_share,
			share_of_local_voice,
			competitor_comparison
		)
		VALUES (
			org_id,
			local_scan_cycle_id,
			keyword_id,
			'local-coverage/1',
			CASE WHEN org_id = 'm2-gate-a' THEN 0.71428571 ELSE 1 END,
			CASE WHEN org_id = 'm2-gate-a' THEN 1 ELSE 1 END,
			CASE WHEN org_id = 'm2-gate-a' THEN 1 ELSE 1 END,
			0,
			CASE WHEN org_id = 'm2-gate-a' THEN 5 ELSE 1 END,
			CASE WHEN org_id = 'm2-gate-a' THEN 1 ELSE 1 END,
			0.5,
			'{"fixture":"stub"}'
		);

		INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
		VALUES (org_id, local_measurement_cycle_id, 'm2-local-dataset', 1)
		RETURNING id INTO dataset_id;

		INSERT INTO sv_source_snapshots (
			organization_id,
			source_type,
			source_ref,
			content_sha256,
			snapshot,
			captured_at
		)
		VALUES (
			org_id,
			'fixture',
			'm2-gate',
			repeat(CASE WHEN org_id = 'm2-gate-a' THEN 'a' ELSE 'b' END, 64),
			'{"source":"m2-gate"}',
			now()
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
		VALUES (org_id, 'LOCAL', local_measurement_cycle_id, org_id || ':local-observation', dataset_id, snapshot_id, now());

		INSERT INTO sv_cost_events (organization_id, cycle_id, domain_id, provider, amount_usd, basis)
		VALUES (org_id, legacy_ai_cycle_id, 'AI', 'stub-ai', 1, 'stub');
		INSERT INTO sv_cost_events (
			organization_id,
			measurement_cycle_id,
			domain_id,
			provider,
			amount_usd,
			basis
		)
		VALUES (org_id, local_measurement_cycle_id, 'LOCAL', 'stub-local-rank', 2, 'stub');

		IF org_id = 'm2-gate-a' THEN
			SELECT created_observations INTO created_before
			FROM sv_local_scan_cycles
			WHERE id = local_scan_cycle_id;
			SELECT sv_prepare_local_observation_retry(observation_id) INTO retry_allowed;
			IF NOT retry_allowed THEN
				RAISE EXCEPTION 'invalid Local observation retry was refused';
			END IF;
			SELECT created_observations INTO created_after
			FROM sv_local_scan_cycles
			WHERE id = local_scan_cycle_id;
			IF created_after <> created_before THEN
				RAISE EXCEPTION 'Local retry increased expected cardinality';
			END IF;
			UPDATE sv_local_rank_observations
			SET validity = 'VALID', invalid_reason = NULL, target_rank = 1
			WHERE id = observation_id;
			SELECT sv_prepare_local_observation_retry(observation_id) INTO retry_allowed;
			IF retry_allowed THEN
				RAISE EXCEPTION 'valid Local observation was accepted for retry';
			END IF;

			IF (SELECT count(*) FROM sv_local_rank_observations WHERE cycle_id = local_scan_cycle_id) <> 9
				OR (SELECT created_observations FROM sv_local_scan_cycles WHERE id = local_scan_cycle_id) <> 9 THEN
				RAISE EXCEPTION 'Local observation cardinality is not complete';
			END IF;
			IF NOT EXISTS (
				SELECT 1 FROM sv_local_rank_observations
				WHERE cycle_id = local_scan_cycle_id
					AND validity = 'UNMEASURED'
					AND invalid_reason IS NOT NULL
			) THEN
				RAISE EXCEPTION 'missing coordinate was not preserved as an explicit row';
			END IF;

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
				captured_at
			)
			VALUES (
				org_id,
				local_scan_cycle_id,
				location_id,
				keyword_id,
				grid_uuid,
				point_id,
				'stub-local-rank',
				0,
				'UNMEASURED',
				'EXPECTED_PLUS_ONE',
				20,
				'STUB',
				now()
			);
			IF (SELECT count(*) FROM sv_local_rank_observations WHERE cycle_id = local_scan_cycle_id) <> 9
				OR NOT EXISTS (
					SELECT 1 FROM sv_incidents
					WHERE organization_id = org_id AND kind = 'CARDINALITY_INCIDENT'
				) THEN
				RAISE EXCEPTION 'expected plus one was not blocked with an incident';
			END IF;

			BEGIN
				UPDATE sv_grid_definitions SET spacing_meters = 500 WHERE id = grid_uuid;
				RAISE EXCEPTION 'used grid definition was mutable';
			EXCEPTION
				WHEN raise_exception THEN
					IF SQLERRM <> 'LOCAL_GRID_IMMUTABLE' THEN RAISE; END IF;
			END;
			BEGIN
				UPDATE sv_grid_points SET latitude = latitude + 0.000001 WHERE id = point_id;
				RAISE EXCEPTION 'used grid point was mutable';
			EXCEPTION
				WHEN raise_exception THEN
					IF SQLERRM <> 'LOCAL_GRID_IMMUTABLE' THEN RAISE; END IF;
			END;

			IF NOT EXISTS (
				SELECT 1
				FROM sv_local_rank_observations AS observation
				JOIN sv_grid_points AS point ON point.id = observation.grid_point_id
				JOIN sv_local_keywords AS keyword ON keyword.id = observation.keyword_id
				JOIN sv_business_locations AS location ON location.id = observation.location_id
				WHERE observation.cycle_id = local_scan_cycle_id
					AND location.admin_area = 'Bali'
					AND point.latitude IS NOT NULL
					AND point.longitude IS NOT NULL
					AND keyword.text = 'test local query'
					AND observation.provider = 'stub-local-rank'
			) THEN
				RAISE EXCEPTION 'region, coordinate, keyword and provider cannot be reconstructed';
			END IF;

			IF (SELECT sum(amount_usd) FROM sv_cost_events WHERE organization_id = org_id AND domain_id = 'AI') <> 1
				OR (SELECT sum(amount_usd) FROM sv_cost_events WHERE organization_id = org_id AND domain_id = 'LOCAL') <> 2 THEN
				RAISE EXCEPTION 'cost aggregation leaked between domains';
			END IF;

			UPDATE sv_measurement_cycles SET status = 'FAILED' WHERE id = local_measurement_cycle_id;
			IF (SELECT status FROM sv_cycles WHERE id = legacy_ai_cycle_id)::text <> 'QUEUED' THEN
				RAISE EXCEPTION 'Local failure changed the AI cycle status';
			END IF;

			UPDATE sv_local_scan_cycles SET emergency_stopped_at = now(), status = 'STOPPED'
			WHERE id = local_scan_cycle_id;
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
				captured_at
			)
			VALUES (
				org_id,
				local_scan_cycle_id,
				location_id,
				keyword_id,
				grid_uuid,
				point_id,
				'stub-local-rank',
				0,
				'UNMEASURED',
				'EMERGENCY_STOP_ATTEMPT',
				20,
				'STUB',
				now()
			);
			IF NOT EXISTS (
				SELECT 1 FROM sv_incidents
				WHERE organization_id = org_id AND kind = 'LOCAL_EMERGENCY_STOP'
			) OR (SELECT status FROM sv_cycles WHERE id = legacy_ai_cycle_id)::text <> 'QUEUED' THEN
				RAISE EXCEPTION 'Local emergency stop was not isolated';
			END IF;
		END IF;
	END LOOP;

	IF (SELECT count(*) FROM sv_measurement_domains) <> 5 THEN
		RAISE EXCEPTION 'measurement domain registry does not contain five domains';
	END IF;
	BEGIN
		INSERT INTO sv_evidence_index (
			organization_id,
			domain_id,
			cycle_id,
			observation_ref,
			dataset_id,
			captured_at
		)
		SELECT
			evidence.organization_id,
			'AI',
			evidence.cycle_id,
			'm2-gate-a:wrong-domain',
			evidence.dataset_id,
			now()
		FROM sv_evidence_index AS evidence
		WHERE evidence.organization_id = 'm2-gate-a'
		LIMIT 1;
		RAISE EXCEPTION 'cross-domain evidence was accepted';
	EXCEPTION
		WHEN foreign_key_violation THEN NULL;
	END;
END $$;

DO $$
DECLARE
	rls_count integer;
	policy_count integer;
BEGIN
	SELECT count(*) INTO rls_count
	FROM pg_class
	WHERE relname IN (
		'sv_local_keywords',
		'sv_grid_definitions',
		'sv_grid_points',
		'sv_local_scan_cycles',
		'sv_local_rank_observations',
		'sv_local_competitor_observations',
		'sv_local_visibility_metrics'
	)
		AND relkind = 'r'
		AND relrowsecurity;
	IF rls_count <> 7 THEN
		RAISE EXCEPTION 'M2 RLS coverage mismatch: %', rls_count;
	END IF;

	SELECT count(*) INTO policy_count
	FROM pg_policies
	WHERE policyname = 'tenant_isolation'
		AND tablename IN (
			'sv_local_keywords',
			'sv_grid_definitions',
			'sv_grid_points',
			'sv_local_scan_cycles',
			'sv_local_rank_observations',
			'sv_local_competitor_observations',
			'sv_local_visibility_metrics'
		);
	IF policy_count <> 7 THEN
		RAISE EXCEPTION 'M2 tenant policy coverage mismatch: %', policy_count;
	END IF;
END $$;

CREATE ROLE selena_m2_gate_runtime NOLOGIN;
GRANT USAGE ON SCHEMA public TO selena_m2_gate_runtime;
GRANT SELECT ON
	sv_measurement_domains,
	sv_measurement_cycles,
	sv_measurement_datasets,
	sv_source_snapshots,
	sv_evidence_index,
	sv_cycles,
	sv_measurement_cycles_compat,
	sv_local_keywords,
	sv_grid_definitions,
	sv_grid_points,
	sv_local_scan_cycles,
	sv_local_rank_observations,
	sv_local_competitor_observations,
	sv_local_visibility_metrics
TO selena_m2_gate_runtime;

SET ROLE selena_m2_gate_runtime;
SET app.organization_id = 'm2-gate-a';

DO $$
BEGIN
	IF (SELECT count(*) FROM sv_measurement_domains) <> 5 THEN
		RAISE EXCEPTION 'runtime role cannot read the global domain registry';
	END IF;
	IF (SELECT count(*) FROM sv_measurement_cycles) <> 2
		OR (SELECT count(*) FROM sv_measurement_cycles_compat) <> 2
		OR (SELECT count(*) FROM sv_measurement_datasets) <> 1
		OR (SELECT count(*) FROM sv_source_snapshots) <> 1
		OR (SELECT count(*) FROM sv_evidence_index) <> 1 THEN
		RAISE EXCEPTION 'M1 tenant isolation failed during M2 repeat';
	END IF;
	IF (SELECT count(*) FROM sv_local_keywords) <> 1
		OR (SELECT count(*) FROM sv_grid_definitions) <> 1
		OR (SELECT count(*) FROM sv_grid_points) <> 9
		OR (SELECT count(*) FROM sv_local_scan_cycles) <> 1
		OR (SELECT count(*) FROM sv_local_rank_observations) <> 9
		OR (SELECT count(*) FROM sv_local_competitor_observations) <> 2
		OR (SELECT count(*) FROM sv_local_visibility_metrics) <> 1 THEN
		RAISE EXCEPTION 'M2 tenant isolation failed';
	END IF;
END $$;

RESET ROLE;
DROP OWNED BY selena_m2_gate_runtime;
DROP ROLE selena_m2_gate_runtime;

SELECT 'Visibility OS M2 Local scratch subset: PASS' AS result;
SQL
