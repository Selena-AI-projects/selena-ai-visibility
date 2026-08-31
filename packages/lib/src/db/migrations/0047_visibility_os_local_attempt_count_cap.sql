LOCK TABLE "sv_local_rank_observations" IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "sv_local_rank_observations"
		WHERE "attempt_count" NOT BETWEEN 1 AND 3
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0047_ATTEMPT_COUNT_INVALID';
	END IF;

	ALTER TABLE "sv_local_rank_observations"
		ADD CONSTRAINT "sv_local_rank_observations_attempt_count_cap_check"
		CHECK ("attempt_count" BETWEEN 1 AND 3) NOT VALID;
	ALTER TABLE "sv_local_rank_observations"
		VALIDATE CONSTRAINT "sv_local_rank_observations_attempt_count_cap_check";
END;
$$;
