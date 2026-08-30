-- Forward-only repair for the 0044 runtime/store contract.
-- This migration changes only the existing guard function; it does not mutate rows.
DO $migration$
DECLARE
	function_definition text;
	old_guard text := $guard$
	IF OLD."lease_expires_at" IS DISTINCT FROM NEW."lease_expires_at"
		AND NOT (OLD."status" = 'CLAIMED' AND NEW."status" = 'CLAIMED'
			AND OLD."lease_expires_at" <= now()
			AND NEW."lease_expires_at" > now()
			AND NEW."lease_expires_at" > OLD."lease_expires_at") THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_LEASE_RENEWAL_BLOCKED';
	END IF;$guard$;
	new_guard text := $guard$
	IF OLD."lease_expires_at" IS DISTINCT FROM NEW."lease_expires_at"
		AND NOT (
			(OLD."status" = 'CLAIMED' AND NEW."status" = 'CLAIMED'
				AND OLD."lease_expires_at" <= now()
				AND NEW."lease_expires_at" > now()
				AND NEW."lease_expires_at" > OLD."lease_expires_at")
			OR (OLD."status" = 'CLAIMED' AND NEW."status" = 'SUBMITTED'
				AND OLD."lease_expires_at" > now()
				AND NEW."lease_expires_at" > now()
				AND NEW."lease_expires_at" > OLD."lease_expires_at")
		) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_LEASE_RENEWAL_BLOCKED';
	END IF;
	IF OLD."status" = 'CLAIMED' AND NEW."status" = 'SUBMITTED'
		AND OLD."lease_expires_at" <= now() THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_CLAIM_EXPIRED';
	END IF;
	$guard$;
BEGIN
	SELECT pg_get_functiondef('sv_guard_measurement_attempt_mutation()'::regprocedure)
		INTO function_definition;
	IF function_definition IS NULL OR position(old_guard IN function_definition) = 0 THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_0049_GUARD_SHAPE_UNEXPECTED';
	END IF;
	EXECUTE replace(function_definition, old_guard, new_guard);
END;
$migration$;
