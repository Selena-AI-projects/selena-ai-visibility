-- Forward-only PostgreSQL compatibility repair for constraints created by 0044.
-- PostgreSQL 16 can resolve chained jsonb - 'key' expressions ambiguously when
-- the key literals remain type unknown. Recreate only the affected checks with
-- explicit text operands; no rows are changed.
DO $migration$
DECLARE
	constraint_name text;
	table_name text;
	constraint_definition text;
	corrected_definition text;
	key_name text;
	keys text[] := ARRAY[
		'schemaVersion', 'kind', 'mode', 'canonicalizationVersion', 'scope',
		'lockSnapshotCanonical', 'requestSnapshotCanonical', 'lock', 'slot', 'keyword',
		'providerRequest', 'attempt', 'budgetReservation', 'unknownReason',
		'storageClass', 'organizationId', 'measurementCycleId', 'localCycleId',
		'configurationLockId', 'attemptId', 'reservationId', 'executionKey',
		'attemptIndex', 'provider', 'externalProviderCalls', 'completedAt', 'event',
		'targetRank', 'evidenceEligible', 'provenance', 'cost', 'id', 'version',
		'providerTaskId', 'evidenceKind', 'checkReference', 'rawResponseReference',
		'rawResponseSha256', 'providerObservedAt', 'status', 'currency', 'amountUsd',
		'basis', 'observationValidity', 'observationOutcome', 'cycleStatus',
		'retryAllowed', 'finalInvalidReason', 'attemptStatus', 'retryReason',
		'completedAt'
	];
BEGIN
	FOR constraint_name, table_name IN
		SELECT * FROM (VALUES
			('sv_measurement_attempts_submitted_candidate_check', 'sv_measurement_attempts'),
			('sv_measurement_attempt_results_identity_check', 'sv_measurement_attempt_results'),
			('sv_measurement_attempt_results_live_shape_check', 'sv_measurement_attempt_results'),
			('sv_measurement_attempt_results_disposition_check', 'sv_measurement_attempt_results'),
			('sv_measurement_attempt_results_budget_check', 'sv_measurement_attempt_results'),
			('sv_measurement_attempt_results_provenance_check', 'sv_measurement_attempt_results')
		) AS affected(name, relation)
	LOOP
		SELECT pg_get_constraintdef(oid, true)
		INTO constraint_definition
		FROM pg_constraint
		WHERE conname = constraint_name
			AND conrelid = format('%I', table_name)::regclass;
		IF constraint_definition IS NULL THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_0050_CONSTRAINT_MISSING: %', constraint_name;
		END IF;
		corrected_definition := constraint_definition;
		FOREACH key_name IN ARRAY keys LOOP
			corrected_definition := replace(
				corrected_definition,
				format(' - %L', key_name),
				format(' - %L::text', key_name)
			);
		END LOOP;
		IF corrected_definition IS DISTINCT FROM constraint_definition THEN
			EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', table_name, constraint_name);
			EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', table_name, constraint_name, corrected_definition);
		END IF;
	END LOOP;
END;
$migration$;
