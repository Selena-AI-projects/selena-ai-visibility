#!/usr/bin/env bash
set -euo pipefail

compose_file="${1:-../tmp/selena-visibility-test-compose.yml}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
psql=(docker-compose -p selena-visibility-test -f "$compose_file" exec -T postgres psql -U selena_test -d selena_visibility_test -v ON_ERROR_STOP=1)

"${psql[@]}" < "$repo_root/packages/lib/src/db/migrations/_pending-os/M1_measurement_registry.sql"

"${psql[@]}" <<'SQL'
INSERT INTO organization (id, name, slug, created_at)
VALUES
	('m1-gate-a', 'M1 Gate A', 'm1-gate-a', now()),
	('m1-gate-b', 'M1 Gate B', 'm1-gate-b', now());

DO $$
DECLARE
	org_id text;
	project_id uuid;
	lock_id uuid;
	quote_id uuid;
	order_id uuid;
	legacy_cycle_id uuid;
	local_cycle_id uuid;
	dataset_id uuid;
	snapshot_id uuid;
	runs_before integer;
	runs_after integer;
BEGIN
	FOREACH org_id IN ARRAY ARRAY['m1-gate-a', 'm1-gate-b'] LOOP
		INSERT INTO sv_projects (organization_id, name, category, country, status)
		VALUES (org_id, 'M1 Gate Project', 'test', 'ID', 'DRAFT')
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
		VALUES (org_id, project_id, 1, '{"source":"m1-gate"}', 'm1-gate', 1, 0, 'm1-gate')
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
		RETURNING id INTO legacy_cycle_id;

		IF NOT EXISTS (
			SELECT 1
			FROM sv_measurement_cycles_compat
			WHERE organization_id = org_id
				AND domain_id = 'AI'
				AND id = legacy_cycle_id
				AND domain_cycle_id = legacy_cycle_id
		) THEN
			RAISE EXCEPTION 'legacy AI cycle is absent from compatibility view for %', org_id;
		END IF;

		SELECT count(*) INTO runs_before FROM sv_runs WHERE organization_id = org_id;
		INSERT INTO sv_measurement_cycles (
			organization_id,
			domain_id,
			domain_cycle_id,
			configuration_lock_id,
			status
		)
		VALUES (org_id, 'LOCAL', gen_random_uuid(), lock_id, 'CREATED')
		RETURNING id INTO local_cycle_id;
		SELECT count(*) INTO runs_after FROM sv_runs WHERE organization_id = org_id;
		IF runs_after <> runs_before THEN
			RAISE EXCEPTION 'registry insertion created an AI run for %', org_id;
		END IF;

		INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
		VALUES (org_id, local_cycle_id, 'm1-gate-dataset', 1)
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
			'm1-gate',
			repeat(CASE WHEN org_id = 'm1-gate-a' THEN 'a' ELSE 'b' END, 64),
			'{"source":"m1-gate"}',
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
		VALUES (org_id, 'LOCAL', local_cycle_id, org_id || ':observation-1', dataset_id, snapshot_id, now());

		IF NOT (SELECT immutable FROM sv_measurement_datasets WHERE id = dataset_id) THEN
			RAISE EXCEPTION 'dataset immutable default is false for %', org_id;
		END IF;
		IF NOT (SELECT immutable FROM sv_source_snapshots WHERE id = snapshot_id) THEN
			RAISE EXCEPTION 'source snapshot immutable default is false for %', org_id;
		END IF;

		BEGIN
			INSERT INTO sv_measurement_cycles (
				organization_id,
				domain_id,
				domain_cycle_id,
				configuration_lock_id
			)
			SELECT organization_id, domain_id, domain_cycle_id, configuration_lock_id
			FROM sv_measurement_cycles
			WHERE id = local_cycle_id;
			RAISE EXCEPTION 'duplicate domain cycle was accepted for %', org_id;
		EXCEPTION
			WHEN unique_violation THEN NULL;
		END;

		BEGIN
			INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
			VALUES (org_id, local_cycle_id, 'm1-gate-dataset', 1);
			RAISE EXCEPTION 'duplicate dataset version was accepted for %', org_id;
		EXCEPTION
			WHEN unique_violation THEN NULL;
		END;

		BEGIN
			INSERT INTO sv_source_snapshots (
				organization_id,
				source_type,
				source_ref,
				content_sha256,
				snapshot,
				captured_at
			)
			SELECT organization_id, source_type, source_ref, content_sha256, snapshot, captured_at
			FROM sv_source_snapshots
			WHERE id = snapshot_id;
			RAISE EXCEPTION 'duplicate source content hash was accepted for %', org_id;
		EXCEPTION
			WHEN unique_violation THEN NULL;
		END;

		BEGIN
			INSERT INTO sv_evidence_index (
				organization_id,
				domain_id,
				cycle_id,
				observation_ref,
				dataset_id,
				source_snapshot_id,
				captured_at
			)
			VALUES (org_id, 'LOCAL', local_cycle_id, org_id || ':observation-1', dataset_id, snapshot_id, now());
			RAISE EXCEPTION 'duplicate domain observation was accepted for %', org_id;
		EXCEPTION
			WHEN unique_violation THEN NULL;
		END;

		BEGIN
			INSERT INTO sv_evidence_index (
				organization_id,
				domain_id,
				cycle_id,
				observation_ref,
				dataset_id,
				source_snapshot_id,
				captured_at
			)
			VALUES (org_id, 'AI', local_cycle_id, org_id || ':wrong-domain', dataset_id, snapshot_id, now());
			RAISE EXCEPTION 'evidence domain mismatch was accepted for %', org_id;
		EXCEPTION
			WHEN foreign_key_violation THEN NULL;
		END;

		UPDATE sv_measurement_cycles SET status = 'FAILED' WHERE id = local_cycle_id;
		IF (SELECT status FROM sv_cycles WHERE id = legacy_cycle_id)::text <> 'QUEUED' THEN
			RAISE EXCEPTION 'LOCAL status change leaked into AI cycle for %', org_id;
		END IF;
	END LOOP;
END $$;
SQL

"${psql[@]}" < "$repo_root/packages/lib/scripts/backfill-visibility-os-ai-cycles.sql"

"${psql[@]}" <<'SQL'
DO $$
DECLARE
	rls_count integer;
	policy_count integer;
BEGIN
	IF (SELECT count(*) FROM sv_measurement_domains) <> 5 THEN
		RAISE EXCEPTION 'measurement domain registry does not contain five domains';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM sv_cycles AS legacy_cycle
		LEFT JOIN sv_measurement_cycles AS registered_cycle
			ON registered_cycle.domain_id = 'AI'
			AND registered_cycle.domain_cycle_id = legacy_cycle.id
		WHERE registered_cycle.id IS NULL OR registered_cycle.id <> legacy_cycle.id
	) THEN
		RAISE EXCEPTION 'AI cycle backfill is incomplete or changed compatibility ids';
	END IF;

	IF EXISTS (
		SELECT domain_id, domain_cycle_id
		FROM sv_measurement_cycles_compat
		GROUP BY domain_id, domain_cycle_id
		HAVING count(*) <> 1
	) THEN
		RAISE EXCEPTION 'compatibility view contains duplicate domain cycles';
	END IF;

	UPDATE sv_cycles SET status = 'RUNNING' WHERE organization_id = 'm1-gate-a';
	IF EXISTS (
		SELECT 1
		FROM sv_measurement_cycles_compat
		WHERE organization_id = 'm1-gate-a'
			AND domain_id = 'AI'
			AND status <> 'RUNNING'
	) THEN
		RAISE EXCEPTION 'compatibility view returned stale AI status after backfill';
	END IF;

	SELECT count(*) INTO rls_count
	FROM pg_class
	WHERE relname IN (
		'sv_measurement_domains',
		'sv_measurement_cycles',
		'sv_measurement_datasets',
		'sv_source_snapshots',
		'sv_evidence_index'
	)
		AND relkind = 'r'
		AND relrowsecurity;
	IF rls_count <> 5 THEN
		RAISE EXCEPTION 'M1 RLS coverage mismatch: %', rls_count;
	END IF;

	SELECT count(*) INTO policy_count
	FROM pg_policies
	WHERE policyname = 'tenant_isolation'
		AND tablename IN (
			'sv_measurement_domains',
			'sv_measurement_cycles',
			'sv_measurement_datasets',
			'sv_source_snapshots',
			'sv_evidence_index'
		);
	IF policy_count <> 5 THEN
		RAISE EXCEPTION 'M1 tenant policy coverage mismatch: %', policy_count;
	END IF;
END $$;

CREATE ROLE selena_m1_gate_runtime NOLOGIN;
GRANT USAGE ON SCHEMA public TO selena_m1_gate_runtime;
GRANT SELECT ON
	sv_measurement_domains,
	sv_measurement_cycles,
	sv_measurement_datasets,
	sv_source_snapshots,
	sv_evidence_index,
	sv_cycles,
	sv_measurement_cycles_compat
TO selena_m1_gate_runtime;

SET ROLE selena_m1_gate_runtime;
SET app.organization_id = 'm1-gate-a';

DO $$
BEGIN
	IF (SELECT count(*) FROM sv_measurement_domains) <> 5 THEN
		RAISE EXCEPTION 'runtime role cannot read the global domain registry';
	END IF;
	IF (SELECT count(*) FROM sv_measurement_cycles) <> 2 THEN
		RAISE EXCEPTION 'measurement cycle tenant isolation failed';
	END IF;
	IF (SELECT count(*) FROM sv_measurement_cycles_compat) <> 2 THEN
		RAISE EXCEPTION 'compatibility view tenant isolation failed';
	END IF;
	IF (SELECT count(*) FROM sv_measurement_datasets) <> 1 THEN
		RAISE EXCEPTION 'dataset tenant isolation failed';
	END IF;
	IF (SELECT count(*) FROM sv_source_snapshots) <> 1 THEN
		RAISE EXCEPTION 'source snapshot tenant isolation failed';
	END IF;
	IF (SELECT count(*) FROM sv_evidence_index) <> 1 THEN
		RAISE EXCEPTION 'evidence index tenant isolation failed';
	END IF;
END $$;

RESET ROLE;
DROP OWNED BY selena_m1_gate_runtime;
DROP ROLE selena_m1_gate_runtime;

SELECT 'Visibility OS M1 registry scratch subset: PASS' AS result;
SQL
