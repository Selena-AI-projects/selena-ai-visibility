CREATE OR REPLACE FUNCTION "sv_guard_journal_daily_claim_mutation"() RETURNS trigger AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" <> 'CLAIMED'
			OR NEW."configuration_lock_id" IS NOT NULL
			OR NEW."completed_at" IS NOT NULL
			OR NEW."abandoned_at" IS NOT NULL
			OR NEW."claimed_at" > now()
			OR NEW."updated_at" < NEW."claimed_at"
		THEN
			RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_INITIAL_STATE_BLOCKED';
		END IF;
		RETURN NEW;
	END IF;

	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_DELETE_BLOCKED';
	END IF;

	IF OLD."id" IS DISTINCT FROM NEW."id"
		OR OLD."organization_id" IS DISTINCT FROM NEW."organization_id"
		OR OLD."project_id" IS DISTINCT FROM NEW."project_id"
		OR OLD."question_set_version" IS DISTINCT FROM NEW."question_set_version"
		OR OLD."utc_day" IS DISTINCT FROM NEW."utc_day"
		OR OLD."attempt" IS DISTINCT FROM NEW."attempt"
		OR OLD."claimed_at" IS DISTINCT FROM NEW."claimed_at"
		OR (OLD."configuration_lock_id" IS NOT NULL AND OLD."configuration_lock_id" IS DISTINCT FROM NEW."configuration_lock_id")
	THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_IDENTITY_MUTATION_BLOCKED';
	END IF;

	IF NEW."configuration_lock_id" IS NOT NULL AND NOT EXISTS (
		SELECT 1
		FROM "sv_configuration_locks" AS configuration_lock
		WHERE configuration_lock."id" = NEW."configuration_lock_id"
			AND configuration_lock."project_id" = NEW."project_id"
			AND configuration_lock."organization_id" = NEW."organization_id"
			AND configuration_lock."snapshot"#>>'{journalClaim,id}' = NEW."id"::text
			AND configuration_lock."snapshot"#>>'{journalClaim,utcDay}' = NEW."utc_day"::text
			AND configuration_lock."snapshot"#>>'{journalClaim,attempt}' = NEW."attempt"::text
	) THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_LOCK_PROVENANCE_MISMATCH';
	END IF;

	-- A hold records that the provider boundary was crossed and the run did not
	-- finish, so the question set may not be asked again until a person has read
	-- what was spent. Nothing could move that row, which retired the project for
	-- good the first time a run failed before its first answer. The one release
	-- is a hold whose lock recorded no run at all: there is no spend to read, and
	-- the ledger, not the caller, decides that here.
	IF OLD."status" = 'HOLD' THEN
		IF NEW."status" <> 'ABANDONED' OR NEW."abandoned_at" IS NULL OR NEW."updated_at" < OLD."updated_at" THEN
			RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED';
		END IF;
		IF EXISTS (
			SELECT 1
			FROM "sv_cycles" AS cycle
			JOIN "sv_runs" AS run ON run."cycle_id" = cycle."id"
			WHERE cycle."lock_id" = OLD."configuration_lock_id"
				AND cycle."organization_id" = OLD."organization_id"
		) THEN
			RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_HOLD_SPEND_RECORDED';
		END IF;
		RETURN NEW;
	END IF;

	IF NEW."updated_at" < OLD."updated_at"
		OR (
			OLD."status" = 'CLAIMED'
			AND NEW."status" NOT IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD', 'ABANDONED')
		)
		OR (
			OLD."status" = 'EXECUTING'
			AND NEW."status" NOT IN ('EXECUTING', 'HOLD', 'COMPLETED', 'ABANDONED')
		)
		OR OLD."status" IN ('NO_SPEND', 'COMPLETED', 'ABANDONED')
	THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
