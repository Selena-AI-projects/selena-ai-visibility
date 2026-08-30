CREATE TABLE "sv_journal_daily_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"configuration_lock_id" uuid,
	"question_set_version" text NOT NULL,
	"utc_day" date NOT NULL,
	"attempt" integer NOT NULL,
	"status" text DEFAULT 'CLAIMED' NOT NULL,
	"claimed_at" timestamptz DEFAULT now() NOT NULL,
	"completed_at" timestamptz,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_journal_daily_claims_attempt_check" CHECK ("attempt" > 0),
	CONSTRAINT "sv_journal_daily_claims_status_check" CHECK ("status" IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD', 'COMPLETED')),
	CONSTRAINT "sv_journal_daily_claims_utc_day_check"
		CHECK ("utc_day" = ("claimed_at" AT TIME ZONE 'UTC')::date),
	CONSTRAINT "sv_journal_daily_claims_execution_link_check"
		CHECK ("status" IN ('CLAIMED', 'NO_SPEND') OR "configuration_lock_id" IS NOT NULL),
	CONSTRAINT "sv_journal_daily_claims_completion_check" CHECK (
		("status" IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD') AND "completed_at" IS NULL)
		OR (
			"status" = 'COMPLETED'
			AND "completed_at" IS NOT NULL
			AND "completed_at" >= "claimed_at"
		)
	),
	CONSTRAINT "sv_journal_daily_claims_organization_fk"
		FOREIGN KEY ("organization_id") REFERENCES "organization"("id"),
	CONSTRAINT "sv_journal_daily_claims_project_organization_fk"
		FOREIGN KEY ("project_id", "organization_id")
		REFERENCES "sv_projects"("id", "organization_id"),
	CONSTRAINT "sv_journal_daily_claims_lock_project_org_fk"
		FOREIGN KEY ("configuration_lock_id", "project_id", "organization_id")
		REFERENCES "sv_configuration_locks"("id", "project_id", "organization_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_journal_daily_claims_identity_unique"
	ON "sv_journal_daily_claims" (
		"organization_id", "project_id", "question_set_version", "utc_day", "attempt"
	);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_journal_daily_claims_unresolved_unique"
	ON "sv_journal_daily_claims" ("organization_id", "project_id")
	WHERE "status" IN ('CLAIMED', 'EXECUTING', 'HOLD');
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_journal_daily_claims_lock_unique"
	ON "sv_journal_daily_claims" ("configuration_lock_id")
	WHERE "configuration_lock_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_journal_daily_claims"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE FUNCTION "sv_guard_journal_daily_claim_mutation"() RETURNS trigger AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" <> 'CLAIMED'
			OR NEW."configuration_lock_id" IS NOT NULL
			OR NEW."completed_at" IS NOT NULL
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
			AND NEW."status" NOT IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD')
		)
		OR (
			OLD."status" = 'EXECUTING'
			AND NEW."status" NOT IN ('HOLD', 'COMPLETED')
		)
		OR OLD."status" IN ('NO_SPEND', 'HOLD', 'COMPLETED')
	THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_journal_daily_claim_mutation"
	BEFORE INSERT OR UPDATE OR DELETE ON "sv_journal_daily_claims"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_journal_daily_claim_mutation"();
--> statement-breakpoint
CREATE FUNCTION "sv_prevent_journal_daily_claim_truncate"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_TRUNCATE_BLOCKED';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_journal_daily_claim_truncate"
	BEFORE TRUNCATE ON "sv_journal_daily_claims"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_prevent_journal_daily_claim_truncate"();
