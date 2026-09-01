ALTER TABLE "sv_journal_daily_claims"
	ADD COLUMN IF NOT EXISTS "abandoned_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	DROP CONSTRAINT IF EXISTS "sv_journal_daily_claims_status_check";
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	ADD CONSTRAINT "sv_journal_daily_claims_status_check"
	CHECK ("status" IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD', 'COMPLETED', 'ABANDONED'));
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	DROP CONSTRAINT IF EXISTS "sv_journal_daily_claims_execution_link_check";
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	ADD CONSTRAINT "sv_journal_daily_claims_execution_link_check"
	CHECK ("status" IN ('CLAIMED', 'NO_SPEND', 'ABANDONED') OR "configuration_lock_id" IS NOT NULL);
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	DROP CONSTRAINT IF EXISTS "sv_journal_daily_claims_completion_check";
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	ADD CONSTRAINT "sv_journal_daily_claims_completion_check" CHECK (
		(
			"status" IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD')
			AND "completed_at" IS NULL
			AND "abandoned_at" IS NULL
		)
		OR (
			"status" = 'COMPLETED'
			AND "completed_at" IS NOT NULL
			AND "completed_at" >= "claimed_at"
			AND "abandoned_at" IS NULL
		)
		OR (
			"status" = 'ABANDONED'
			AND "completed_at" IS NULL
			AND "abandoned_at" IS NOT NULL
			AND "abandoned_at" >= "claimed_at"
		)
	);
--> statement-breakpoint
DROP INDEX IF EXISTS "sv_journal_daily_claims_unresolved_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_journal_daily_claims_unresolved_unique"
	ON "sv_journal_daily_claims" ("organization_id", "project_id")
	WHERE "status" IN ('CLAIMED', 'EXECUTING', 'HOLD');
--> statement-breakpoint
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

	IF NEW."updated_at" < OLD."updated_at"
		OR (
			OLD."status" = 'CLAIMED'
			AND NEW."status" NOT IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD', 'ABANDONED')
		)
		OR (
			OLD."status" = 'EXECUTING'
			AND NEW."status" NOT IN ('EXECUTING', 'HOLD', 'COMPLETED', 'ABANDONED')
		)
		OR OLD."status" IN ('NO_SPEND', 'HOLD', 'COMPLETED', 'ABANDONED')
	THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
