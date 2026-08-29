#!/usr/bin/env bash
set -euo pipefail

compose_file="${1:-../tmp/selena-visibility-test-compose.yml}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
psql=(docker-compose -p selena-visibility-test -f "$compose_file" exec -T postgres psql -U selena_test -d selena_visibility_test -v ON_ERROR_STOP=1)

bash "$repo_root/tools/visibility_os_m3_search_reputation_e2e.sh" "$compose_file"
if [[ "$("${psql[@]}" -Atc "SELECT to_regclass('public.sv_approved_actions')")" != "sv_approved_actions" ]]; then
	"${psql[@]}" < "$repo_root/packages/lib/src/db/migrations/0040_visibility_os_action_evidence_loop.sql"
fi

"${psql[@]}" <<'SQL'
INSERT INTO organization (id, name, slug, created_at)
VALUES
	('m4-gate-a', 'M4 Gate A', 'm4-gate-a', now()),
	('m4-gate-b', 'M4 Gate B', 'm4-gate-b', now());

DO $$
DECLARE
	org_id text;
	project_id uuid;
	lock_id uuid;
	baseline_cycle_id uuid;
	verification_measurement_cycle_id uuid;
	baseline_dataset_id uuid;
	verification_dataset_id uuid;
	action_id uuid;
	change_event_id uuid;
	verification_cycle_id uuid;
	runs_before integer;
	costs_before integer;
	runs_after integer;
	costs_after integer;
BEGIN
	FOREACH org_id IN ARRAY ARRAY['m4-gate-a', 'm4-gate-b'] LOOP
		INSERT INTO sv_projects (organization_id, name, category, country, region, status)
		VALUES (org_id, 'M4 Gate Project', 'test', 'ID', 'Bali', 'DRAFT')
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
			'{"visibilityOs":{"evidenceLoop":{"formulaVersion":"attribution/1"}}}',
			'm4-gate',
			1,
			0,
			'm4-gate'
		)
		RETURNING id INTO lock_id;

		INSERT INTO sv_measurement_cycles (
			organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
		)
		VALUES (org_id, 'LOCAL', gen_random_uuid(), lock_id, 'COMPLETED')
		RETURNING id INTO baseline_cycle_id;

		INSERT INTO sv_measurement_cycles (
			organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
		)
		VALUES (org_id, 'LOCAL', gen_random_uuid(), lock_id, 'COMPLETED')
		RETURNING id INTO verification_measurement_cycle_id;

		INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
		VALUES (org_id, baseline_cycle_id, 'm4-gate-local', 1)
		RETURNING id INTO baseline_dataset_id;

		INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
		VALUES (org_id, verification_measurement_cycle_id, 'm4-gate-local', 2)
		RETURNING id INTO verification_dataset_id;

		SELECT count(*) INTO runs_before FROM sv_runs WHERE organization_id = org_id;
		SELECT count(*) INTO costs_before FROM sv_cost_events WHERE organization_id = org_id;

		INSERT INTO sv_approved_actions (
			organization_id,
			project_id,
			source_kind,
			source_ref,
			finding_ref,
			recommendation_ref,
			title,
			evidence_ids
		)
		VALUES (
			org_id,
			project_id,
			'ENGINE_ACTION',
			'stub:recommendation-action',
			'stub:finding',
			'stub:recommendation',
			'Publish the approved structured answer',
			ARRAY['stub:evidence:baseline']
		)
		RETURNING id INTO action_id;

		BEGIN
			UPDATE sv_approved_actions SET status = 'APPROVED' WHERE id = action_id;
			RAISE EXCEPTION 'approval without approver was accepted';
		EXCEPTION
			WHEN raise_exception THEN
				IF SQLERRM = 'approval without approver was accepted' THEN RAISE; END IF;
		END;

		INSERT INTO sv_action_approvals (organization_id, action_id, approval_version, approved_by)
		VALUES (org_id, action_id, 1, 'stub-owner');
		UPDATE sv_approved_actions SET status = 'APPROVED' WHERE id = action_id;

		BEGIN
			UPDATE sv_approved_actions SET status = 'IMPLEMENTED' WHERE id = action_id;
			RAISE EXCEPTION 'invalid action transition was accepted';
		EXCEPTION
			WHEN raise_exception THEN
				IF SQLERRM = 'invalid action transition was accepted' THEN RAISE; END IF;
		END;

		UPDATE sv_approved_actions SET status = 'IN_PROGRESS' WHERE id = action_id;
		UPDATE sv_approved_actions SET status = 'IMPLEMENTED' WHERE id = action_id;

		INSERT INTO sv_change_events (
			organization_id,
			project_id,
			action_id,
			change_type,
			detail,
			verification,
			evidence_ids,
			occurred_at
		)
		VALUES (
			org_id,
			project_id,
			action_id,
			'CONTENT',
			'Stub content change',
			'EVIDENCED',
			ARRAY['stub:evidence:change'],
			'2026-09-01T00:00:00Z'
		)
		RETURNING id INTO change_event_id;

		INSERT INTO sv_change_event_assets (
			organization_id, change_event_id, object_reference, content_sha256
		)
		VALUES (org_id, change_event_id, 'stub-object://change-proof', repeat('a', 64));

		INSERT INTO sv_change_events (
			organization_id,
			project_id,
			action_id,
			change_type,
			detail,
			verification,
			evidence_ids,
			occurred_at
		)
		VALUES (
			org_id,
			project_id,
			NULL,
			'EXTERNAL',
			'Unattributed stub change used by the CONFOUNDED rule',
			'DECLARED',
			ARRAY[]::text[],
			'2026-09-02T00:00:00Z'
		);

		BEGIN
			INSERT INTO sv_verification_cycles (
				organization_id,
				action_id,
				baseline_cycle_id,
				verification_measurement_cycle_id,
				baseline_dataset_id,
				verification_dataset_id,
				attempt,
				settle_days
			)
			VALUES (
				org_id,
				action_id,
				baseline_cycle_id,
				verification_measurement_cycle_id,
				verification_dataset_id,
				baseline_dataset_id,
				2,
				14
			);
			RAISE EXCEPTION 'datasets outside their measurement cycles were accepted';
		EXCEPTION
			WHEN foreign_key_violation THEN NULL;
		END;

		INSERT INTO sv_verification_cycles (
			organization_id,
			action_id,
			baseline_cycle_id,
			verification_measurement_cycle_id,
			baseline_dataset_id,
			verification_dataset_id,
			attempt,
			settle_days
		)
		VALUES (
			org_id,
			action_id,
			baseline_cycle_id,
			verification_measurement_cycle_id,
			baseline_dataset_id,
			verification_dataset_id,
			1,
			14
		)
		RETURNING id INTO verification_cycle_id;

		INSERT INTO sv_attribution_assessments (
			organization_id,
			verification_cycle_id,
			action_id,
			finding_ref,
			recommendation_ref,
			change_event_ids,
			baseline_cycle_id,
			verification_measurement_cycle_id,
			baseline_dataset_id,
			verification_dataset_id,
			metric_key,
			formula_version,
			verdict,
			confidence,
			reason_codes,
			evidence_ids,
			delta
		)
		VALUES (
			org_id,
			verification_cycle_id,
			action_id,
			'stub:finding',
			'stub:recommendation',
			ARRAY[change_event_id],
			baseline_cycle_id,
			verification_measurement_cycle_id,
			baseline_dataset_id,
			verification_dataset_id,
			'local_top_3_coverage',
			'attribution/preflight',
			'INSUFFICIENT_EVIDENCE',
			'UNKNOWN',
			ARRAY['VERIFICATION_INCOMPLETE'],
			ARRAY['stub:evidence:baseline', 'stub:evidence:change'],
			NULL
		);

		BEGIN
			INSERT INTO sv_attribution_assessments (
				organization_id,
				verification_cycle_id,
				action_id,
				finding_ref,
				recommendation_ref,
				change_event_ids,
				baseline_cycle_id,
				verification_measurement_cycle_id,
				baseline_dataset_id,
				verification_dataset_id,
				metric_key,
				formula_version,
				verdict,
				confidence,
				reason_codes,
				evidence_ids,
				delta
			)
			VALUES (
				org_id,
				verification_cycle_id,
				action_id,
				'stub:finding',
				'stub:recommendation',
				ARRAY[change_event_id],
				baseline_cycle_id,
				verification_measurement_cycle_id,
				baseline_dataset_id,
				verification_dataset_id,
				'local_top_10_coverage',
				'attribution/1',
				'POSITIVE_CORRELATION',
				'HIGH',
				ARRAY['POSITIVE_DELTA'],
				ARRAY['stub:evidence:baseline', 'stub:evidence:change'],
				0.250000
			);
			RAISE EXCEPTION 'measured attribution before verification was accepted';
		EXCEPTION
			WHEN raise_exception THEN
				IF SQLERRM = 'measured attribution before verification was accepted' THEN RAISE; END IF;
		END;

		UPDATE sv_verification_cycles
		SET status = 'COMPLETED', completed_at = '2026-09-10T00:00:00Z'
		WHERE id = verification_cycle_id;

		BEGIN
			UPDATE sv_approved_actions SET status = 'VERIFIED' WHERE id = action_id;
			RAISE EXCEPTION 'VERIFIED before the settle window was accepted';
		EXCEPTION
			WHEN raise_exception THEN
				IF SQLERRM = 'VERIFIED before the settle window was accepted' THEN RAISE; END IF;
		END;

		UPDATE sv_verification_cycles
		SET completed_at = '2026-09-15T00:00:00Z'
		WHERE id = verification_cycle_id;
		UPDATE sv_approved_actions SET status = 'VERIFIED' WHERE id = action_id;

		INSERT INTO sv_attribution_assessments (
			organization_id,
			verification_cycle_id,
			action_id,
			finding_ref,
			recommendation_ref,
			change_event_ids,
			baseline_cycle_id,
			verification_measurement_cycle_id,
			baseline_dataset_id,
			verification_dataset_id,
			metric_key,
			formula_version,
			verdict,
			confidence,
			reason_codes,
			evidence_ids,
			delta
		)
		VALUES (
			org_id,
			verification_cycle_id,
			action_id,
			'stub:finding',
			'stub:recommendation',
			ARRAY[change_event_id],
			baseline_cycle_id,
			verification_measurement_cycle_id,
			baseline_dataset_id,
			verification_dataset_id,
			'local_top_3_coverage',
			'attribution/1',
			'POSITIVE_CORRELATION',
			'HIGH',
			ARRAY['POSITIVE_DELTA'],
			ARRAY['stub:evidence:baseline', 'stub:evidence:change', 'stub:evidence:verification'],
			0.250000
		);

		SELECT count(*) INTO runs_after FROM sv_runs WHERE organization_id = org_id;
		SELECT count(*) INTO costs_after FROM sv_cost_events WHERE organization_id = org_id;
		IF runs_after <> runs_before OR costs_after <> costs_before THEN
			RAISE EXCEPTION 'M4 stub created a measurement run or cost for %', org_id;
		END IF;
	END LOOP;
END $$;

DO $$
DECLARE
	action_a uuid;
	change_a uuid;
BEGIN
	SELECT id INTO action_a FROM sv_approved_actions WHERE organization_id = 'm4-gate-a';
	SELECT id INTO change_a FROM sv_change_events WHERE organization_id = 'm4-gate-a' AND action_id IS NOT NULL;

	BEGIN
		INSERT INTO sv_approved_actions (
			organization_id, project_id, source_kind, source_ref, title, evidence_ids
		)
		SELECT organization_id, project_id, 'MANUAL', 'stub:empty-evidence', 'Invalid action', ARRAY[]::text[]
		FROM sv_approved_actions WHERE id = action_a;
		RAISE EXCEPTION 'action without evidence was accepted';
	EXCEPTION
		WHEN check_violation THEN NULL;
	END;

	BEGIN
		INSERT INTO sv_action_approvals (organization_id, action_id, approval_version, approved_by)
		VALUES ('m4-gate-b', action_a, 2, 'cross-tenant-owner');
		RAISE EXCEPTION 'cross-tenant approval was accepted';
	EXCEPTION
		WHEN foreign_key_violation THEN NULL;
	END;

	BEGIN
		INSERT INTO sv_change_events (
			organization_id, project_id, action_id, change_type, detail, verification, evidence_ids, occurred_at
		)
		SELECT organization_id, project_id, id, 'CONTENT', 'Missing evidence', 'EVIDENCED', ARRAY[]::text[], now()
		FROM sv_approved_actions WHERE id = action_a;
		RAISE EXCEPTION 'EVIDENCED change without evidence was accepted';
	EXCEPTION
		WHEN check_violation THEN NULL;
	END;

	BEGIN
		DELETE FROM sv_change_events WHERE id = change_a;
		RAISE EXCEPTION 'intermediate change event deletion was accepted';
	EXCEPTION
		WHEN foreign_key_violation THEN NULL;
	END;
END $$;

DO $$
DECLARE
	verdict_count integer;
	rls_count integer;
	policy_count integer;
BEGIN
	SELECT count(*) INTO verdict_count
	FROM unnest(enum_range(NULL::sv_attribution_verdict)) AS verdict;
	IF verdict_count <> 7
		OR EXISTS (
			SELECT 1 FROM unnest(enum_range(NULL::sv_attribution_verdict)) AS verdict
			WHERE verdict::text = 'CAUSAL'
		) THEN
		RAISE EXCEPTION 'M4 attribution verdict enum is not the canonical non-causal set';
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'sv_findings' AND column_name = 'domain_id' AND is_nullable = 'YES'
	) OR NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'sv_recommendations' AND column_name = 'location_id' AND is_nullable = 'YES'
	) THEN
		RAISE EXCEPTION 'M4 finding/recommendation scope columns are missing';
	END IF;

	SELECT count(*) INTO rls_count
	FROM pg_class
	WHERE relname IN (
		'sv_approved_actions',
		'sv_action_approvals',
		'sv_change_events',
		'sv_change_event_assets',
		'sv_verification_cycles',
		'sv_attribution_assessments'
	)
		AND relkind = 'r'
		AND relrowsecurity;
	IF rls_count <> 6 THEN
		RAISE EXCEPTION 'M4 RLS coverage mismatch: %', rls_count;
	END IF;

	SELECT count(*) INTO policy_count
	FROM pg_policies
	WHERE policyname = 'tenant_isolation'
		AND tablename IN (
			'sv_approved_actions',
			'sv_action_approvals',
			'sv_change_events',
			'sv_change_event_assets',
			'sv_verification_cycles',
			'sv_attribution_assessments'
		);
	IF policy_count <> 6 THEN
		RAISE EXCEPTION 'M4 tenant policy coverage mismatch: %', policy_count;
	END IF;
END $$;

CREATE ROLE selena_m4_gate_runtime NOLOGIN;
GRANT USAGE ON SCHEMA public TO selena_m4_gate_runtime;
GRANT SELECT ON
	sv_approved_actions,
	sv_action_approvals,
	sv_change_events,
	sv_change_event_assets,
	sv_verification_cycles,
	sv_attribution_assessments
TO selena_m4_gate_runtime;

SET ROLE selena_m4_gate_runtime;
SET app.organization_id = 'm4-gate-a';

DO $$
BEGIN
	IF (SELECT count(*) FROM sv_approved_actions) <> 1
		OR (SELECT count(*) FROM sv_action_approvals) <> 1
		OR (SELECT count(*) FROM sv_change_events) <> 2
		OR (SELECT count(*) FROM sv_change_event_assets) <> 1
		OR (SELECT count(*) FROM sv_verification_cycles) <> 1
		OR (SELECT count(*) FROM sv_attribution_assessments) <> 2 THEN
		RAISE EXCEPTION 'M4 tenant isolation failed';
	END IF;
END $$;

RESET ROLE;
DROP OWNED BY selena_m4_gate_runtime;
DROP ROLE selena_m4_gate_runtime;

SELECT 'Visibility OS M4 Action/Evidence scratch subset: PASS' AS result;
SQL
