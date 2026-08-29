#!/usr/bin/env bash
set -euo pipefail

compose_file="${1:-../tmp/selena-visibility-test-compose.yml}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
psql=(docker-compose -p selena-visibility-test -f "$compose_file" exec -T postgres psql -U selena_test -d selena_visibility_test -v ON_ERROR_STOP=1)

bash "$repo_root/tools/visibility_os_m2_local_e2e.sh" "$compose_file"
if [[ "$("${psql[@]}" -Atc "SELECT to_regclass('public.sv_search_queries')")" != "sv_search_queries" ]]; then
	"${psql[@]}" < "$repo_root/packages/lib/src/db/migrations/0039_visibility_os_search_reputation.sql"
fi

"${psql[@]}" <<'SQL'
INSERT INTO organization (id, name, slug, created_at)
VALUES
	('m3-gate-a', 'M3 Gate A', 'm3-gate-a', now()),
	('m3-gate-b', 'M3 Gate B', 'm3-gate-b', now());

DO $$
DECLARE
	org_id text;
	project_id uuid;
	lock_id uuid;
	entity_id uuid;
	location_id uuid;
	search_cycle_id uuid;
	reputation_cycle_id uuid;
	query_id uuid;
	search_observation_id uuid;
	source_id uuid;
	snapshot_id uuid;
	runs_before integer;
	local_before integer;
	runs_after integer;
	local_after integer;
	search_before integer;
	reputation_before integer;
BEGIN
	FOREACH org_id IN ARRAY ARRAY['m3-gate-a', 'm3-gate-b'] LOOP
		INSERT INTO sv_projects (organization_id, name, category, country, region, status)
		VALUES (org_id, 'M3 Gate Project', 'test', 'ID', 'Bali', 'DRAFT')
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
			jsonb_build_object(
				'visibilityOs',
				jsonb_build_object(
					'search', jsonb_build_object('expectedObservations', 1),
					'reputation', jsonb_build_object('expectedSnapshots', 1)
				)
			),
			'm3-gate',
			1,
			0,
			'm3-gate'
		)
		RETURNING id INTO lock_id;

		INSERT INTO sv_entities (
			organization_id,
			project_id,
			entity_kind,
			confirmation_status,
			name
		)
		VALUES (org_id, project_id, 'LOCATION_BRAND', 'CLIENT_CONFIRMED', 'M3 Gate Location')
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
			confirmation_status
		)
		VALUES (
			org_id,
			entity_id,
			'M3 Gate Location',
			'ID',
			'Bali',
			'Ubud',
			-8.506900,
			115.262500,
			'COORDINATE',
			'CONFIRMED'
		)
		RETURNING id INTO location_id;

		SELECT count(*) INTO runs_before FROM sv_runs WHERE organization_id = org_id;
		SELECT count(*) INTO local_before FROM sv_local_rank_observations WHERE organization_id = org_id;

		INSERT INTO sv_measurement_cycles (
			organization_id,
			domain_id,
			domain_cycle_id,
			configuration_lock_id,
			status
		)
		VALUES (org_id, 'SEARCH', gen_random_uuid(), lock_id, 'RUNNING')
		RETURNING id INTO search_cycle_id;

		INSERT INTO sv_measurement_cycles (
			organization_id,
			domain_id,
			domain_cycle_id,
			configuration_lock_id,
			status
		)
		VALUES (org_id, 'REPUTATION', gen_random_uuid(), lock_id, 'RUNNING')
		RETURNING id INTO reputation_cycle_id;

		INSERT INTO sv_search_queries (
			organization_id,
			project_id,
			query_text,
			normalized_text,
			engine,
			region,
			device
		)
		VALUES (org_id, project_id, 'best bakery ubud', 'best bakery ubud', 'GOOGLE', 'ID-BALI', 'MOBILE')
		RETURNING id INTO query_id;

		INSERT INTO sv_search_rank_observations (
			organization_id,
			cycle_id,
			query_id,
			engine,
			region,
			device,
			repeat_index,
			validity,
			invalid_reason,
			capture_depth,
			captured_at
		)
		VALUES (
			org_id,
			search_cycle_id,
			query_id,
			'GOOGLE',
			'ID-BALI',
			'MOBILE',
			0,
			'UNMEASURED',
			'STUB_PENDING',
			20,
			now()
		)
		RETURNING id INTO search_observation_id;

		INSERT INTO sv_reputation_sources (organization_id, location_id, source)
		VALUES (org_id, location_id, 'STUB_REVIEW_SOURCE')
		RETURNING id INTO source_id;

		INSERT INTO sv_review_snapshots (
			organization_id,
			cycle_id,
			source_id,
			period_start,
			period_end,
			validity,
			invalid_reason,
			captured_at
		)
		VALUES (
			org_id,
			reputation_cycle_id,
			source_id,
			'2026-08-01T00:00:00Z',
			'2026-08-16T00:00:00Z',
			'UNMEASURED',
			'STUB_PENDING',
			now()
		)
		RETURNING id INTO snapshot_id;

		SELECT count(*) INTO search_before
		FROM sv_search_rank_observations
		WHERE organization_id = org_id;
		SELECT count(*) INTO reputation_before
		FROM sv_review_snapshots
		WHERE organization_id = org_id;

		UPDATE sv_search_rank_observations
		SET validity = 'VALID',
			invalid_reason = NULL,
			target_rank = 4,
			attempt_count = attempt_count + 1,
			raw_reference = 'stub:search',
			updated_at = now()
		WHERE id = search_observation_id;

		UPDATE sv_review_snapshots
		SET validity = 'VALID',
			invalid_reason = NULL,
			rating_average = 4.500,
			review_count = 20,
			new_reviews = 5,
			attempt_count = attempt_count + 1,
			raw_reference = 'stub:reputation',
			updated_at = now()
		WHERE id = snapshot_id;

		IF (SELECT count(*) FROM sv_search_rank_observations WHERE organization_id = org_id) <> search_before
			OR (SELECT count(*) FROM sv_review_snapshots WHERE organization_id = org_id) <> reputation_before THEN
			RAISE EXCEPTION 'M3 retry created a new domain observation for %', org_id;
		END IF;

		INSERT INTO sv_review_velocity_metrics (
			organization_id,
			snapshot_id,
			source_id,
			period_start,
			period_end,
			formula_version,
			velocity_per_30_days
		)
		VALUES (
			org_id,
			snapshot_id,
			source_id,
			'2026-08-01T00:00:00Z',
			'2026-08-16T00:00:00Z',
			'review-velocity/1',
			10
		);

		INSERT INTO sv_review_topic_observations (
			organization_id,
			snapshot_id,
			topic,
			sentiment,
			analysis_method_version
		)
		VALUES (org_id, snapshot_id, 'service', 'POSITIVE', 'stub-topic/1');

		INSERT INTO sv_cost_events (
			organization_id,
			measurement_cycle_id,
			domain_id,
			provider,
			amount_usd,
			basis
		)
		VALUES
			(org_id, search_cycle_id, 'SEARCH', 'stub-search', 3, 'stub'),
			(org_id, reputation_cycle_id, 'REPUTATION', 'stub-reputation', 4, 'stub');

		IF (SELECT sum(amount_usd) FROM sv_cost_events WHERE organization_id = org_id AND domain_id = 'SEARCH') <> 3
			OR (SELECT sum(amount_usd) FROM sv_cost_events WHERE organization_id = org_id AND domain_id = 'REPUTATION') <> 4 THEN
			RAISE EXCEPTION 'M3 cost aggregation leaked between domains for %', org_id;
		END IF;

		IF (SELECT count(*) FROM sv_search_rank_observations WHERE organization_id = org_id) <>
			((SELECT snapshot #>> '{visibilityOs,search,expectedObservations}'
				FROM sv_configuration_locks WHERE id = lock_id)::integer)
			OR (SELECT count(*) FROM sv_review_snapshots WHERE organization_id = org_id) <>
			((SELECT snapshot #>> '{visibilityOs,reputation,expectedSnapshots}'
				FROM sv_configuration_locks WHERE id = lock_id)::integer) THEN
			RAISE EXCEPTION 'M3 domain cardinality mismatch for %', org_id;
		END IF;

		UPDATE sv_measurement_cycles SET status = 'FAILED' WHERE id = search_cycle_id;
		IF (SELECT status FROM sv_measurement_cycles WHERE id = reputation_cycle_id) <> 'RUNNING' THEN
			RAISE EXCEPTION 'Search failure changed Reputation status for %', org_id;
		END IF;
		UPDATE sv_measurement_cycles SET status = 'STOPPED' WHERE id = reputation_cycle_id;
		IF (SELECT status FROM sv_measurement_cycles WHERE id = search_cycle_id) <> 'FAILED' THEN
			RAISE EXCEPTION 'Reputation emergency stop changed Search status for %', org_id;
		END IF;

		SELECT count(*) INTO runs_after FROM sv_runs WHERE organization_id = org_id;
		SELECT count(*) INTO local_after FROM sv_local_rank_observations WHERE organization_id = org_id;
		IF runs_after <> runs_before OR local_after <> local_before THEN
			RAISE EXCEPTION 'Search/Reputation wrote AI or Local observations for %', org_id;
		END IF;
	END LOOP;
END $$;

DO $$
DECLARE
	search_cycle_id uuid;
	reputation_cycle_id uuid;
	query_id uuid;
	source_id uuid;
	snapshot_id uuid;
BEGIN
	SELECT id INTO search_cycle_id
	FROM sv_measurement_cycles
	WHERE organization_id = 'm3-gate-a' AND domain_id = 'SEARCH';
	SELECT id INTO reputation_cycle_id
	FROM sv_measurement_cycles
	WHERE organization_id = 'm3-gate-a' AND domain_id = 'REPUTATION';
	SELECT id INTO query_id FROM sv_search_queries WHERE organization_id = 'm3-gate-a';
	SELECT id INTO source_id FROM sv_reputation_sources WHERE organization_id = 'm3-gate-a';
	SELECT id INTO snapshot_id FROM sv_review_snapshots WHERE organization_id = 'm3-gate-a';

	BEGIN
		INSERT INTO sv_search_rank_observations (
			organization_id, cycle_id, query_id, engine, region, device,
			repeat_index, validity, capture_depth, captured_at
		)
		VALUES (
			'm3-gate-a', search_cycle_id, query_id, 'GOOGLE', 'ID-BALI', 'MOBILE',
			0, 'VALID', 20, now()
		);
		RAISE EXCEPTION 'duplicate Search observation was accepted';
	EXCEPTION
		WHEN unique_violation THEN NULL;
	END;

	BEGIN
		INSERT INTO sv_search_rank_observations (
			organization_id, cycle_id, query_id, engine, region, device,
			repeat_index, validity, capture_depth, captured_at
		)
		VALUES (
			'm3-gate-a', reputation_cycle_id, query_id, 'GOOGLE', 'ID-BALI', 'MOBILE',
			1, 'VALID', 20, now()
		);
		RAISE EXCEPTION 'Reputation cycle accepted a Search observation';
	EXCEPTION
		WHEN foreign_key_violation OR check_violation THEN NULL;
	END;

	BEGIN
		INSERT INTO sv_review_snapshots (
			organization_id, cycle_id, source_id, period_start, period_end, captured_at
		)
		VALUES (
			'm3-gate-a', reputation_cycle_id, source_id,
			'2026-08-01T00:00:00Z', '2026-08-16T00:00:00Z', now()
		);
		RAISE EXCEPTION 'duplicate Reputation snapshot was accepted';
	EXCEPTION
		WHEN unique_violation THEN NULL;
	END;

	BEGIN
		INSERT INTO sv_review_snapshots (
			organization_id, cycle_id, source_id, period_start, period_end, captured_at
		)
		VALUES (
			'm3-gate-a', search_cycle_id, source_id,
			'2026-09-01T00:00:00Z', '2026-09-16T00:00:00Z', now()
		);
		RAISE EXCEPTION 'Search cycle accepted a Reputation snapshot';
	EXCEPTION
		WHEN foreign_key_violation OR check_violation THEN NULL;
	END;

	BEGIN
		INSERT INTO sv_review_topic_observations (
			organization_id, snapshot_id, topic, sentiment, analysis_method_version
		)
		VALUES ('m3-gate-a', snapshot_id, 'service', 'POSITIVE', '');
		RAISE EXCEPTION 'Reputation analysis without a version was accepted';
	EXCEPTION
		WHEN check_violation THEN NULL;
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
		'sv_search_queries',
		'sv_search_rank_observations',
		'sv_reputation_sources',
		'sv_review_snapshots',
		'sv_review_velocity_metrics',
		'sv_review_topic_observations'
	)
		AND relkind = 'r'
		AND relrowsecurity;
	IF rls_count <> 6 THEN
		RAISE EXCEPTION 'M3 RLS coverage mismatch: %', rls_count;
	END IF;

	SELECT count(*) INTO policy_count
	FROM pg_policies
	WHERE policyname = 'tenant_isolation'
		AND tablename IN (
			'sv_search_queries',
			'sv_search_rank_observations',
			'sv_reputation_sources',
			'sv_review_snapshots',
			'sv_review_velocity_metrics',
			'sv_review_topic_observations'
		);
	IF policy_count <> 6 THEN
		RAISE EXCEPTION 'M3 tenant policy coverage mismatch: %', policy_count;
	END IF;
END $$;

CREATE ROLE selena_m3_gate_runtime NOLOGIN;
GRANT USAGE ON SCHEMA public TO selena_m3_gate_runtime;
GRANT SELECT ON
	sv_measurement_cycles,
	sv_search_queries,
	sv_search_rank_observations,
	sv_reputation_sources,
	sv_review_snapshots,
	sv_review_velocity_metrics,
	sv_review_topic_observations
TO selena_m3_gate_runtime;

SET ROLE selena_m3_gate_runtime;
SET app.organization_id = 'm3-gate-a';

DO $$
BEGIN
	IF (SELECT count(*) FROM sv_measurement_cycles) <> 2
		OR (SELECT count(*) FROM sv_search_queries) <> 1
		OR (SELECT count(*) FROM sv_search_rank_observations) <> 1
		OR (SELECT count(*) FROM sv_reputation_sources) <> 1
		OR (SELECT count(*) FROM sv_review_snapshots) <> 1
		OR (SELECT count(*) FROM sv_review_velocity_metrics) <> 1
		OR (SELECT count(*) FROM sv_review_topic_observations) <> 1 THEN
		RAISE EXCEPTION 'M3 tenant isolation failed';
	END IF;
END $$;

RESET ROLE;
DROP OWNED BY selena_m3_gate_runtime;
DROP ROLE selena_m3_gate_runtime;

SELECT 'Visibility OS M3 Search/Reputation scratch subset: PASS' AS result;
SQL
