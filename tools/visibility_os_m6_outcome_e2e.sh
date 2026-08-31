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

bash "$repo_root/tools/visibility_os_m5_map_e2e.sh" "$compose_file"
if [[ "$("${psql[@]}" -Atc "SELECT to_regclass('public.sv_outcome_sources')")" != "sv_outcome_sources" ]]; then
	"${psql[@]}" < "$repo_root/packages/lib/src/db/migrations/0042_visibility_os_outcome_layer.sql"
fi

"${psql[@]}" <<'SQL'
INSERT INTO sv_outcome_metric_definitions (metric_key, version, unit, aggregation)
VALUES ('qualified_leads', 1, 'lead', 'SUM');

DO $$
<<outcome_seed>>
DECLARE
	org_id text;
	project_id uuid;
	lock_id uuid;
	entity_id uuid;
	location_id uuid;
	source_id uuid;
	outcome_cycle_id uuid;
	outcome_dataset_id uuid;
	baseline_outcome_id uuid;
	verification_outcome_id uuid;
	baseline_cycle_id uuid;
	verification_measurement_cycle_id uuid;
	baseline_dataset_id uuid;
	verification_dataset_id uuid;
	action_id uuid;
	change_event_id uuid;
	verification_cycle_id uuid;
	outcome_window_id uuid;
	location_index integer;
	runs_before integer;
	costs_before integer;
	runs_after integer;
	costs_after integer;
BEGIN
	FOREACH org_id IN ARRAY ARRAY['m4-gate-a', 'm4-gate-b'] LOOP
		SELECT project.id INTO project_id
		FROM sv_projects project
		WHERE project.organization_id = org_id AND project.name = 'M4 Gate Project';
		SELECT lock.id INTO lock_id
		FROM sv_configuration_locks lock
		WHERE lock.organization_id = org_id AND lock.project_id = outcome_seed.project_id;
		SELECT
			existing_cycle.baseline_cycle_id,
			existing_cycle.verification_measurement_cycle_id,
			existing_cycle.baseline_dataset_id,
			existing_cycle.verification_dataset_id
		INTO
			baseline_cycle_id,
			verification_measurement_cycle_id,
			baseline_dataset_id,
			verification_dataset_id
		FROM sv_verification_cycles existing_cycle
		WHERE existing_cycle.organization_id = org_id
		ORDER BY existing_cycle.created_at
		LIMIT 1;

		SELECT count(*) INTO runs_before FROM sv_runs run WHERE run.organization_id = org_id;
		SELECT count(*) INTO costs_before FROM sv_cost_events cost WHERE cost.organization_id = org_id;

		FOR location_index IN 1..2 LOOP
			INSERT INTO sv_entities (organization_id, project_id, entity_kind, confirmation_status, name)
			VALUES (org_id, project_id, 'LOCATION_BRAND', 'CLIENT_CONFIRMED', 'M6 Gate Location ' || location_index)
			RETURNING id INTO entity_id;

			INSERT INTO sv_business_locations (
				organization_id, entity_id, display_name, country_code, admin_area, locality,
				geo_precision, confirmation_status, local_profile, local_profile_confirmed_at
			)
			VALUES (
				org_id, entity_id, 'M6 Gate Location ' || location_index, 'ID', 'Bali', 'Ubud',
				'CITY', 'CONFIRMED', '{"category":"test"}', now()
			)
			RETURNING id INTO location_id;

			INSERT INTO sv_outcome_sources (
				organization_id, project_id, location_id, access_class, source_reference, evidence_ids
			)
			VALUES (
				org_id,
				project_id,
				location_id,
				CASE WHEN location_index = 1 THEN 'UPLOADED' ELSE 'CONNECTED' END,
				'stub://outcome/' || org_id || '/' || location_index,
				ARRAY['stub:source:' || org_id || ':' || location_index]
			)
			RETURNING id INTO source_id;

			INSERT INTO sv_measurement_cycles (
				organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
			)
			VALUES (org_id, 'OUTCOME', gen_random_uuid(), lock_id, 'COMPLETED')
			RETURNING id INTO outcome_cycle_id;

			INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
			VALUES (org_id, outcome_cycle_id, org_id || ':outcome:' || location_index, 1)
			RETURNING id INTO outcome_dataset_id;

			INSERT INTO sv_outcome_observations (
				organization_id, project_id, location_id, source_id, measurement_cycle_id, dataset_id,
				metric_key, metric_version, value, period_start, period_end, evidence_ids, captured_at
			)
			VALUES (
				org_id, project_id, location_id, source_id, outcome_cycle_id, outcome_dataset_id,
				'qualified_leads', 1, location_index + 1,
				'2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z',
				ARRAY['stub:outcome:baseline:' || org_id || ':' || location_index], '2026-09-01T00:00:00Z'
			)
			RETURNING id INTO baseline_outcome_id;

			INSERT INTO sv_outcome_observations (
				organization_id, project_id, location_id, source_id, measurement_cycle_id, dataset_id,
				metric_key, metric_version, value, period_start, period_end, evidence_ids, captured_at
			)
			VALUES (
				org_id, project_id, location_id, source_id, outcome_cycle_id, outcome_dataset_id,
				'qualified_leads', 1, (location_index + 1) * 2,
				'2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z',
				ARRAY['stub:outcome:verification:' || org_id || ':' || location_index], '2026-10-01T00:00:00Z'
			)
			RETURNING id INTO verification_outcome_id;

			INSERT INTO sv_evidence_index (
				organization_id, domain_id, cycle_id, observation_ref, dataset_id, captured_at
			)
			VALUES
				(org_id, 'OUTCOME', outcome_cycle_id, baseline_outcome_id::text, outcome_dataset_id, '2026-09-01T00:00:00Z'),
				(org_id, 'OUTCOME', outcome_cycle_id, verification_outcome_id::text, outcome_dataset_id, '2026-10-01T00:00:00Z');

			IF location_index = 1 THEN
				SELECT vc.action_id, vc.id
				INTO action_id, verification_cycle_id
				FROM sv_verification_cycles vc
				WHERE vc.organization_id = org_id
				ORDER BY vc.created_at
				LIMIT 1;
				SELECT id INTO change_event_id
				FROM sv_change_events change_event
				WHERE change_event.organization_id = org_id
					AND change_event.action_id = outcome_seed.action_id
				ORDER BY change_event.created_at
				LIMIT 1;
			ELSE
				INSERT INTO sv_approved_actions (
					organization_id, project_id, source_kind, source_ref, finding_ref,
					recommendation_ref, title, evidence_ids
				)
				VALUES (
					org_id, project_id, 'ENGINE_ACTION', 'stub:m6-action:' || location_index,
					'stub:m6-finding:' || location_index, 'stub:m6-recommendation:' || location_index,
					'Implement M6 location action', ARRAY['stub:m6-action-evidence:' || location_index]
				)
				RETURNING id INTO action_id;
				INSERT INTO sv_action_approvals (organization_id, action_id, approval_version, approved_by)
				VALUES (org_id, action_id, 1, 'stub-owner');
				UPDATE sv_approved_actions SET status = 'APPROVED' WHERE sv_approved_actions.id = action_id;
				UPDATE sv_approved_actions SET status = 'IN_PROGRESS' WHERE sv_approved_actions.id = action_id;
				UPDATE sv_approved_actions SET status = 'IMPLEMENTED' WHERE sv_approved_actions.id = action_id;

				INSERT INTO sv_change_events (
					organization_id, project_id, action_id, change_type, detail,
					verification, evidence_ids, occurred_at
				)
				VALUES (
					org_id, project_id, action_id, 'CONTENT', 'Stub M6 location change',
					'EVIDENCED', ARRAY['stub:m6-change-evidence:' || location_index], '2026-09-01T00:00:00Z'
				)
				RETURNING id INTO change_event_id;
				INSERT INTO sv_change_event_assets (organization_id, change_event_id, object_reference, content_sha256)
				VALUES (org_id, change_event_id, 'stub-object://m6-change-proof', repeat('b', 64));

				INSERT INTO sv_verification_cycles (
					organization_id, action_id, baseline_cycle_id, verification_measurement_cycle_id,
					baseline_dataset_id, verification_dataset_id, attempt, settle_days, status, completed_at
				)
				VALUES (
					org_id, action_id, baseline_cycle_id, verification_measurement_cycle_id,
					baseline_dataset_id, verification_dataset_id, 1, 14, 'COMPLETED', '2026-09-15T00:00:00Z'
				)
				RETURNING id INTO verification_cycle_id;
				UPDATE sv_approved_actions SET status = 'VERIFIED' WHERE sv_approved_actions.id = action_id;
			END IF;

			INSERT INTO sv_outcome_attribution_windows (
				organization_id, project_id, location_id, verification_cycle_id, action_id,
				baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id,
				verification_dataset_id, baseline_observation_id, verification_observation_id,
				metric_key, metric_version, window_start, window_end, evidence_ids
			)
			VALUES (
				org_id, project_id, location_id, verification_cycle_id, action_id,
				baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id,
				verification_dataset_id, baseline_outcome_id, verification_outcome_id,
				'qualified_leads', 1, '2026-08-01T00:00:00Z', '2026-10-01T00:00:00Z',
				ARRAY['stub:outcome:baseline:' || org_id || ':' || location_index,
					'stub:outcome:verification:' || org_id || ':' || location_index,
					'stub:m6-change:' || change_event_id::text]
			)
			RETURNING id INTO outcome_window_id;

			INSERT INTO sv_attribution_assessments (
				organization_id, verification_cycle_id, action_id, finding_ref, recommendation_ref,
				change_event_ids, baseline_cycle_id, verification_measurement_cycle_id,
				baseline_dataset_id, verification_dataset_id, outcome_window_id, metric_key,
				formula_version, verdict, confidence, reason_codes, evidence_ids, delta
			)
			VALUES (
				org_id, verification_cycle_id, action_id, 'stub:m6-finding:' || location_index,
				'stub:m6-recommendation:' || location_index, ARRAY[change_event_id],
				baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id,
				verification_dataset_id, outcome_window_id, 'qualified_leads',
				'outcome-attribution/1', 'POSITIVE_CORRELATION', 'HIGH', ARRAY['POSITIVE_DELTA'],
				ARRAY['stub:outcome:baseline:' || org_id || ':' || location_index,
					'stub:outcome:verification:' || org_id || ':' || location_index,
					'stub:m6-change:' || change_event_id::text], location_index + 1
			);
		END LOOP;

		SELECT count(*) INTO runs_after FROM sv_runs run WHERE run.organization_id = org_id;
		SELECT count(*) INTO costs_after FROM sv_cost_events cost WHERE cost.organization_id = org_id;
		IF runs_after <> runs_before OR costs_after <> costs_before THEN
			RAISE EXCEPTION 'M6 stub created a measurement run or cost for %', org_id;
		END IF;
	END LOOP;
END $$;

DO $$
DECLARE
	project_a uuid;
	project_b uuid;
	location_a uuid;
	source_a uuid;
	observation_a uuid;
	window_a uuid;
	verification_a uuid;
	action_a uuid;
	baseline_cycle_a uuid;
	verification_cycle_a uuid;
	baseline_dataset_a uuid;
	verification_dataset_a uuid;
	alternate_source_a uuid;
	alternate_observation_a uuid;
BEGIN
	SELECT id INTO project_a FROM sv_projects WHERE organization_id = 'm4-gate-a' AND name = 'M4 Gate Project';
	SELECT id INTO project_b FROM sv_projects WHERE organization_id = 'm4-gate-b' AND name = 'M4 Gate Project';
	SELECT location_id, id INTO location_a, source_a FROM sv_outcome_sources WHERE organization_id = 'm4-gate-a' LIMIT 1;
	SELECT id INTO observation_a FROM sv_outcome_observations WHERE source_id = source_a ORDER BY period_start LIMIT 1;
	SELECT id, verification_cycle_id, action_id, baseline_cycle_id, verification_measurement_cycle_id,
		baseline_dataset_id, verification_dataset_id
	INTO window_a, verification_a, action_a, baseline_cycle_a, verification_cycle_a,
		baseline_dataset_a, verification_dataset_a
	FROM sv_outcome_attribution_windows WHERE organization_id = 'm4-gate-a' LIMIT 1;

	BEGIN
		INSERT INTO sv_outcome_sources (
			organization_id, project_id, location_id, access_class, source_reference, evidence_ids
		) VALUES ('m4-gate-b', project_b, location_a, 'UPLOADED', 'stub://cross-tenant', ARRAY['stub:cross-tenant']);
		RAISE EXCEPTION 'cross-tenant location source was accepted';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM = 'cross-tenant location source was accepted' THEN RAISE; END IF;
	END;

	INSERT INTO sv_outcome_sources (
		organization_id, project_id, location_id, access_class, source_reference, evidence_ids
	) VALUES (
		'm4-gate-a', project_a, location_a, 'CONNECTED', 'stub://alternate-source', ARRAY['stub:alternate-source']
	) RETURNING id INTO alternate_source_a;
	INSERT INTO sv_outcome_observations (
		organization_id, project_id, location_id, source_id, measurement_cycle_id, dataset_id,
		metric_key, metric_version, value, period_start, period_end, evidence_ids, captured_at
	)
	SELECT organization_id, project_id, location_id, alternate_source_a, measurement_cycle_id, dataset_id,
		metric_key, metric_version, 99, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z',
		ARRAY['stub:alternate-observation'], '2026-11-01T00:00:00Z'
	FROM sv_outcome_observations
	WHERE id = observation_a
	RETURNING id INTO alternate_observation_a;

	BEGIN
		UPDATE sv_outcome_attribution_windows
		SET verification_observation_id = alternate_observation_a
		WHERE id = window_a;
		RAISE EXCEPTION 'Outcome window accepted observations from different sources';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM = 'Outcome window accepted observations from different sources' THEN RAISE; END IF;
	END;

	BEGIN
		INSERT INTO sv_outcome_sources (
			organization_id, project_id, location_id, access_class, source_reference, evidence_ids
		) VALUES ('m4-gate-a', project_a, location_a, 'PUBLIC', 'visibility-derived', ARRAY['visibility:derived']);
		RAISE EXCEPTION 'PUBLIC Outcome source was accepted';
	EXCEPTION
		WHEN check_violation THEN NULL;
	END;

	BEGIN
		UPDATE sv_outcome_observations SET value = 0 WHERE id = observation_a;
		RAISE EXCEPTION 'Outcome observation mutation was accepted';
	EXCEPTION
		WHEN raise_exception THEN
			IF SQLERRM = 'Outcome observation mutation was accepted' THEN RAISE; END IF;
	END;

	BEGIN
		INSERT INTO sv_attribution_assessments (
			organization_id, verification_cycle_id, action_id, finding_ref, recommendation_ref,
			change_event_ids, baseline_cycle_id, verification_measurement_cycle_id,
			baseline_dataset_id, verification_dataset_id, outcome_window_id, metric_key,
			formula_version, verdict, confidence, reason_codes, evidence_ids, delta
		)
		SELECT organization_id, verification_cycle_id, action_id, finding_ref, recommendation_ref,
			change_event_ids, baseline_cycle_id, verification_measurement_cycle_id,
			baseline_dataset_id, verification_dataset_id, window_a, 'tampered_location_metric',
			'outcome-attribution/tampered', verdict, confidence, reason_codes, evidence_ids, delta
		FROM sv_attribution_assessments
		WHERE organization_id = 'm4-gate-a' AND outcome_window_id = window_a;
		RAISE EXCEPTION 'assessment accepted a tampered Outcome window scope';
	EXCEPTION
		WHEN foreign_key_violation THEN NULL;
	END;
END $$;

DO $$
DECLARE
	chain_count integer;
	rls_count integer;
	policy_count integer;
	org_id text;
	location_count integer;
	location_sum numeric;
BEGIN
	SELECT count(*) INTO chain_count
	FROM sv_outcome_attribution_windows outcome_window
	JOIN sv_outcome_observations baseline ON baseline.id = outcome_window.baseline_observation_id
	JOIN sv_outcome_observations verification ON verification.id = outcome_window.verification_observation_id
	JOIN sv_attribution_assessments assessment ON assessment.outcome_window_id = outcome_window.id
	JOIN sv_verification_cycles cycle ON cycle.id = outcome_window.verification_cycle_id
	JOIN sv_approved_actions action ON action.id = cycle.action_id
	WHERE assessment.finding_ref <> ''
		AND assessment.recommendation_ref <> ''
		AND cardinality(assessment.change_event_ids) > 0
		AND cycle.baseline_dataset_id IS NOT NULL
		AND cycle.verification_dataset_id IS NOT NULL
		AND baseline.value IS NOT NULL
		AND verification.value IS NOT NULL;
	IF chain_count <> 4 THEN RAISE EXCEPTION 'M6 evidence chain count mismatch: %', chain_count; END IF;

	FOREACH org_id IN ARRAY ARRAY['m4-gate-a', 'm4-gate-b'] LOOP
		SELECT count(DISTINCT location_id), sum(value)
		INTO location_count, location_sum
		FROM sv_outcome_observations observation
		WHERE observation.organization_id = org_id AND observation.period_start = '2026-09-01T00:00:00Z';
		IF location_count <> 2 OR location_sum <> 10 THEN
			RAISE EXCEPTION 'M6 location aggregate mismatch for %: locations %, sum %', org_id, location_count, location_sum;
		END IF;
	END LOOP;

	SELECT count(*) INTO rls_count FROM pg_class
	WHERE relname IN (
		'sv_outcome_sources', 'sv_outcome_metric_definitions',
		'sv_outcome_observations', 'sv_outcome_attribution_windows'
	) AND relkind = 'r' AND relrowsecurity;
	IF rls_count <> 4 THEN RAISE EXCEPTION 'M6 RLS coverage mismatch: %', rls_count; END IF;

	SELECT count(*) INTO policy_count FROM pg_policies
	WHERE policyname = 'tenant_isolation' AND tablename IN (
		'sv_outcome_sources', 'sv_outcome_metric_definitions',
		'sv_outcome_observations', 'sv_outcome_attribution_windows'
	);
	IF policy_count <> 4 THEN RAISE EXCEPTION 'M6 tenant policy coverage mismatch: %', policy_count; END IF;

	IF EXISTS (SELECT 1 FROM unnest(enum_range(NULL::sv_attribution_verdict)) verdict WHERE verdict::text = 'CAUSAL') THEN
		RAISE EXCEPTION 'M6 reintroduced CAUSAL';
	END IF;
END $$;

CREATE ROLE selena_m6_gate_runtime NOLOGIN;
GRANT USAGE ON SCHEMA public TO selena_m6_gate_runtime;
GRANT SELECT ON
	sv_outcome_sources,
	sv_outcome_metric_definitions,
	sv_outcome_observations,
	sv_outcome_attribution_windows
TO selena_m6_gate_runtime;

SET ROLE selena_m6_gate_runtime;
SET app.organization_id = 'm4-gate-b';
DO $$
BEGIN
	IF (SELECT count(*) FROM sv_outcome_sources) <> 2
		OR (SELECT count(*) FROM sv_outcome_observations) <> 4
		OR (SELECT count(*) FROM sv_outcome_attribution_windows) <> 2
		OR (SELECT count(*) FROM sv_outcome_metric_definitions) <> 1 THEN
		RAISE EXCEPTION 'M6 tenant isolation failed';
	END IF;
END $$;
RESET ROLE;
DROP OWNED BY selena_m6_gate_runtime;
DROP ROLE selena_m6_gate_runtime;

SELECT 'Visibility OS M6 Outcome scratch subset: PASS' AS result;
SQL

bash "$repo_root/tools/selena_isolated_e2e.sh" "$compose_file"
