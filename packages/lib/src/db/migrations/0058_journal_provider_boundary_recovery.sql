ALTER TABLE "sv_journal_daily_claims"
	ALTER COLUMN "claimed_at" SET DEFAULT clock_timestamp(),
	ALTER COLUMN "updated_at" SET DEFAULT clock_timestamp();
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "sv_journal_provider_boundaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"journal_claim_id" uuid NOT NULL,
	"configuration_lock_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"permit_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"dispatch_key" text NOT NULL,
	"channel" text NOT NULL,
	"system_id" text,
	"boundary_kind" text DEFAULT 'PRE_TRANSPORT' NOT NULL,
	"provider_call_upper_bound" integer DEFAULT 1 NOT NULL,
	"crossed_at" timestamptz DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "sv_journal_provider_boundaries_kind_check"
		CHECK ("boundary_kind" = 'PRE_TRANSPORT'),
	CONSTRAINT "sv_journal_provider_boundaries_call_bound_check"
		CHECK ("provider_call_upper_bound" = 1),
	CONSTRAINT "sv_journal_provider_boundaries_organization_fk"
		FOREIGN KEY ("organization_id") REFERENCES "organization"("id"),
	CONSTRAINT "sv_journal_provider_boundaries_project_org_fk"
		FOREIGN KEY ("project_id", "organization_id")
		REFERENCES "sv_projects"("id", "organization_id"),
	CONSTRAINT "sv_journal_provider_boundaries_claim_fk"
		FOREIGN KEY ("journal_claim_id") REFERENCES "sv_journal_daily_claims"("id"),
	CONSTRAINT "sv_journal_provider_boundaries_lock_project_org_fk"
		FOREIGN KEY ("configuration_lock_id", "project_id", "organization_id")
		REFERENCES "sv_configuration_locks"("id", "project_id", "organization_id"),
	CONSTRAINT "sv_journal_provider_boundaries_cycle_fk"
		FOREIGN KEY ("cycle_id") REFERENCES "sv_cycles"("id"),
	CONSTRAINT "sv_journal_provider_boundaries_permit_fk"
		FOREIGN KEY ("permit_id") REFERENCES "sv_run_permits"("id"),
	CONSTRAINT "sv_journal_provider_boundaries_run_fk"
		FOREIGN KEY ("run_id") REFERENCES "sv_runs"("id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_journal_provider_boundaries_claim_permit_unique"
	ON "sv_journal_provider_boundaries" ("journal_claim_id", "permit_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_journal_provider_boundaries_run_unique"
	ON "sv_journal_provider_boundaries" ("run_id");
--> statement-breakpoint
CREATE INDEX "sv_journal_provider_boundaries_org_claim_idx"
	ON "sv_journal_provider_boundaries" ("organization_id", "journal_claim_id");
--> statement-breakpoint
ALTER TABLE "sv_journal_provider_boundaries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_journal_provider_boundaries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_journal_provider_boundaries"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE FUNCTION "sv_guard_journal_provider_boundary_insert"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	IF NEW."crossed_at" > clock_timestamp()
		OR NEW."boundary_kind" <> 'PRE_TRANSPORT'
		OR NEW."provider_call_upper_bound" <> 1
		OR NOT EXISTS (
			SELECT 1
			FROM "public"."sv_journal_daily_claims" AS claim
			INNER JOIN "public"."sv_cycles" AS cycle
				ON cycle."id" = NEW."cycle_id"
				AND cycle."lock_id" = claim."configuration_lock_id"
				AND cycle."organization_id" = claim."organization_id"
			INNER JOIN "public"."sv_run_permits" AS permit
				ON permit."id" = NEW."permit_id"
				AND permit."cycle_id" = cycle."id"
				AND permit."organization_id" = claim."organization_id"
			INNER JOIN "public"."sv_runs" AS run
				ON run."id" = NEW."run_id"
				AND run."permit_id" = permit."id"
				AND run."cycle_id" = cycle."id"
				AND run."organization_id" = claim."organization_id"
			WHERE claim."id" = NEW."journal_claim_id"
				AND claim."organization_id" = NEW."organization_id"
				AND claim."project_id" = NEW."project_id"
				AND claim."configuration_lock_id" = NEW."configuration_lock_id"
				AND claim."status" = 'EXECUTING'
				AND permit."consumed_at" IS NOT NULL
				AND permit."dispatch_key" = NEW."dispatch_key"
				AND permit."channel" = NEW."channel"
				AND permit."system_id" IS NOT DISTINCT FROM NEW."system_id"
				AND run."dispatch_key" = NEW."dispatch_key"
				AND run."channel" = NEW."channel"
				AND run."system_id" IS NOT DISTINCT FROM NEW."system_id"
				AND run."status" = 'RUNNING'
		)
	THEN
		RAISE EXCEPTION 'JOURNAL_PROVIDER_BOUNDARY_PROVENANCE_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_journal_provider_boundary_insert"
	BEFORE INSERT ON "sv_journal_provider_boundaries"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_journal_provider_boundary_insert"();
--> statement-breakpoint
CREATE FUNCTION "sv_prevent_journal_provider_boundary_mutation"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	RAISE EXCEPTION 'JOURNAL_PROVIDER_BOUNDARY_IMMUTABLE';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_journal_provider_boundary_mutation"
	BEFORE UPDATE OR DELETE ON "sv_journal_provider_boundaries"
	FOR EACH ROW EXECUTE FUNCTION "sv_prevent_journal_provider_boundary_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_journal_provider_boundary_truncate"
	BEFORE TRUNCATE ON "sv_journal_provider_boundaries"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_prevent_journal_provider_boundary_mutation"();
--> statement-breakpoint
CREATE FUNCTION "sv_require_journal_provider_boundary"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "public"."sv_cycles" AS cycle
		INNER JOIN "public"."sv_journal_daily_claims" AS claim
			ON claim."configuration_lock_id" = cycle."lock_id"
			AND claim."organization_id" = cycle."organization_id"
		WHERE cycle."id" = NEW."cycle_id"
			AND cycle."organization_id" = NEW."organization_id"
	) AND NOT EXISTS (
		SELECT 1
		FROM "public"."sv_journal_provider_boundaries" AS boundary
		WHERE boundary."run_id" = NEW."id"
			AND boundary."permit_id" = NEW."permit_id"
			AND boundary."cycle_id" = NEW."cycle_id"
			AND boundary."organization_id" = NEW."organization_id"
	) THEN
		RAISE EXCEPTION 'JOURNAL_PROVIDER_BOUNDARY_REQUIRED';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "sv_require_journal_provider_boundary"
	AFTER INSERT ON "sv_runs"
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW EXECUTE FUNCTION "sv_require_journal_provider_boundary"();
--> statement-breakpoint
CREATE FUNCTION "sv_journal_claim_recovery_state"(p_claim_id uuid) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = '' AS $$
DECLARE
	claim_record "public"."sv_journal_daily_claims"%ROWTYPE;
	cycle_count integer := 0;
	completed_cycle_count integer := 0;
	pre_execution_cycle_count integer := 0;
	run_count integer := 0;
	consumed_permit_count integer := 0;
	cost_event_count integer := 0;
	boundary_count integer := 0;
BEGIN
	SELECT * INTO claim_record
	FROM "public"."sv_journal_daily_claims"
	WHERE "id" = p_claim_id
		AND "organization_id" = current_setting('app.organization_id', true);
	IF NOT FOUND THEN
		RETURN 'NOT_FOUND';
	END IF;

	SELECT count(*)::integer,
		count(*) FILTER (
			WHERE cycle."status" IN ('QC_REQUIRED', 'READY')
				AND cycle."expected_runs" > 0
				AND cycle."completed_runs" = cycle."expected_runs"
				AND (
					SELECT count(*) FROM "public"."sv_runs" AS run
					WHERE run."cycle_id" = cycle."id"
						AND run."organization_id" = cycle."organization_id"
				) = cycle."expected_runs"
				AND (
					SELECT count(*) FROM "public"."sv_runs" AS run
					WHERE run."cycle_id" = cycle."id"
						AND run."organization_id" = cycle."organization_id"
						AND run."status" <> 'RUNNING'
				) = cycle."expected_runs"
				AND (
					SELECT count(*) FROM "public"."sv_journal_provider_boundaries" AS boundary
					WHERE boundary."journal_claim_id" = claim_record."id"
						AND boundary."cycle_id" = cycle."id"
						AND boundary."organization_id" = cycle."organization_id"
				) = cycle."expected_runs"
		)::integer,
		count(*) FILTER (
			WHERE cycle."status" IN ('CREATED', 'APPROVED', 'QUEUED')
				AND cycle."created_runs" = 0
				AND cycle."completed_runs" = 0
		)::integer
	INTO cycle_count, completed_cycle_count, pre_execution_cycle_count
	FROM "public"."sv_cycles" AS cycle
	WHERE cycle."lock_id" = claim_record."configuration_lock_id"
		AND cycle."organization_id" = claim_record."organization_id";

	SELECT count(run."id")::integer
	INTO run_count
	FROM "public"."sv_cycles" AS cycle
	INNER JOIN "public"."sv_runs" AS run
		ON run."cycle_id" = cycle."id"
		AND run."organization_id" = cycle."organization_id"
	WHERE cycle."lock_id" = claim_record."configuration_lock_id"
		AND cycle."organization_id" = claim_record."organization_id";

	SELECT count(permit."id") FILTER (WHERE permit."consumed_at" IS NOT NULL)::integer
	INTO consumed_permit_count
	FROM "public"."sv_cycles" AS cycle
	INNER JOIN "public"."sv_run_permits" AS permit
		ON permit."cycle_id" = cycle."id"
		AND permit."organization_id" = cycle."organization_id"
	WHERE cycle."lock_id" = claim_record."configuration_lock_id"
		AND cycle."organization_id" = claim_record."organization_id";

	SELECT count(cost."id")::integer
	INTO cost_event_count
	FROM "public"."sv_cycles" AS cycle
	INNER JOIN "public"."sv_cost_events" AS cost
		ON cost."cycle_id" = cycle."id"
		AND cost."organization_id" = cycle."organization_id"
	WHERE cycle."lock_id" = claim_record."configuration_lock_id"
		AND cycle."organization_id" = claim_record."organization_id";

	SELECT count(*)::integer INTO boundary_count
	FROM "public"."sv_journal_provider_boundaries"
	WHERE "journal_claim_id" = claim_record."id"
		AND "organization_id" = claim_record."organization_id";

	IF cycle_count = 1 AND completed_cycle_count = 1 THEN
		RETURN 'TERMINAL_COMPLETED';
	END IF;
	IF cycle_count = pre_execution_cycle_count
		AND run_count = 0
		AND consumed_permit_count = 0
		AND cost_event_count = 0
		AND boundary_count = 0
	THEN
		RETURN 'NO_SPEND';
	END IF;
	RETURN 'AMBIGUOUS';
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_guard_journal_daily_claim_mutation"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE
	recovery_state text;
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" <> 'CLAIMED'
			OR NEW."configuration_lock_id" IS NOT NULL
			OR NEW."completed_at" IS NOT NULL
			OR NEW."abandoned_at" IS NOT NULL
			OR NEW."claimed_at" > clock_timestamp()
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
		FROM "public"."sv_configuration_locks" AS configuration_lock
		WHERE configuration_lock."id" = NEW."configuration_lock_id"
			AND configuration_lock."project_id" = NEW."project_id"
			AND configuration_lock."organization_id" = NEW."organization_id"
			AND configuration_lock."snapshot"#>>'{journalClaim,id}' = NEW."id"::text
			AND configuration_lock."snapshot"#>>'{journalClaim,utcDay}' = NEW."utc_day"::text
			AND configuration_lock."snapshot"#>>'{journalClaim,attempt}' = NEW."attempt"::text
	) THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_LOCK_PROVENANCE_MISMATCH';
	END IF;

	IF OLD."status" = 'EXECUTING' AND NEW."status" = 'ABANDONED' THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTING_ABANDONMENT_BLOCKED';
	END IF;
	IF (OLD."status" = 'CLAIMED' AND NEW."status" IN ('NO_SPEND', 'ABANDONED'))
		OR (OLD."status" IN ('CLAIMED', 'EXECUTING') AND NEW."status" = 'COMPLETED')
	THEN
		recovery_state := "public"."sv_journal_claim_recovery_state"(OLD."id");
	END IF;
	IF OLD."status" = 'CLAIMED' AND NEW."status" IN ('NO_SPEND', 'ABANDONED')
		AND recovery_state <> 'NO_SPEND'
	THEN
		RAISE EXCEPTION 'JOURNAL_CLAIM_NO_SPEND_PROOF_REQUIRED';
	END IF;
	IF OLD."status" = 'CLAIMED' AND NEW."status" = 'ABANDONED'
		AND OLD."updated_at" > clock_timestamp() - interval '45 minutes'
	THEN
		RAISE EXCEPTION 'JOURNAL_CLAIM_LEASE_ACTIVE';
	END IF;
	IF OLD."status" IN ('CLAIMED', 'EXECUTING') AND NEW."status" = 'COMPLETED'
		AND recovery_state <> 'TERMINAL_COMPLETED'
	THEN
		RAISE EXCEPTION 'JOURNAL_CLAIM_TERMINAL_PROOF_REQUIRED';
	END IF;

	IF NEW."updated_at" < OLD."updated_at"
		OR (OLD."status" = 'CLAIMED' AND NEW."status" NOT IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD', 'ABANDONED', 'COMPLETED'))
		OR (OLD."status" = 'EXECUTING' AND NEW."status" NOT IN ('EXECUTING', 'HOLD', 'COMPLETED'))
		OR OLD."status" IN ('NO_SPEND', 'HOLD', 'COMPLETED', 'ABANDONED')
	THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "sv_recover_journal_daily_claim"(p_claim_id uuid, p_actor_id text) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = '' AS $$
DECLARE
	claim_identity record;
	claim_record "public"."sv_journal_daily_claims"%ROWTYPE;
	recovery_state text;
	recovery_time timestamptz;
BEGIN
	IF p_actor_id IS NULL OR p_actor_id <> btrim(p_actor_id) OR length(p_actor_id) = 0 THEN
		RAISE EXCEPTION 'JOURNAL_RECOVERY_ACTOR_INVALID';
	END IF;
	SELECT "organization_id", "project_id"
	INTO claim_identity
	FROM "public"."sv_journal_daily_claims"
	WHERE "id" = p_claim_id
		AND "organization_id" = current_setting('app.organization_id', true);
	IF NOT FOUND THEN
		RAISE EXCEPTION 'JOURNAL_RECOVERY_CLAIM_NOT_FOUND';
	END IF;
	IF NOT pg_try_advisory_xact_lock(
		hashtextextended(
			'selena-journal:' || claim_identity."organization_id" || ':' || claim_identity."project_id"::text,
			0
		)
	) THEN
		RETURN 'BUSY';
	END IF;
	SELECT * INTO claim_record
	FROM "public"."sv_journal_daily_claims"
	WHERE "id" = p_claim_id
		AND "organization_id" = claim_identity."organization_id"
	FOR UPDATE;
	IF claim_record."status" IN ('NO_SPEND', 'HOLD', 'ABANDONED') THEN
		RETURN 'HOLD';
	END IF;
	IF claim_record."status" = 'COMPLETED' THEN
		RETURN 'COMPLETED';
	END IF;

	recovery_state := "public"."sv_journal_claim_recovery_state"(claim_record."id");
	recovery_time := clock_timestamp();
	IF recovery_state = 'TERMINAL_COMPLETED' THEN
		UPDATE "public"."sv_journal_daily_claims"
		SET "status" = 'COMPLETED', "completed_at" = recovery_time, "updated_at" = recovery_time
		WHERE "id" = claim_record."id"
			AND "organization_id" = claim_record."organization_id"
			AND "status" = claim_record."status";
		INSERT INTO "public"."sv_audit_events" (
			"organization_id", "actor_id", "event", "subject_kind", "subject_id", "details"
		) VALUES (
			claim_record."organization_id", p_actor_id, 'JOURNAL_DAILY_CLAIM_COMPLETED',
			'journal_daily_claim', claim_record."id"::text,
			jsonb_build_object(
				'fromStatus', claim_record."status", 'toStatus', 'COMPLETED',
				'recovery', 'TERMINAL_CYCLE', 'providerCalls', 0, 'recurring', false
			)
		);
		RETURN 'COMPLETED';
	END IF;
	IF claim_record."status" = 'EXECUTING' THEN
		RETURN 'HOLD';
	END IF;
	IF claim_record."status" = 'CLAIMED'
		AND recovery_state = 'NO_SPEND'
		AND claim_record."updated_at" <= recovery_time - interval '45 minutes'
	THEN
		UPDATE "public"."sv_journal_daily_claims"
		SET "status" = 'ABANDONED', "abandoned_at" = recovery_time, "updated_at" = recovery_time
		WHERE "id" = claim_record."id"
			AND "organization_id" = claim_record."organization_id"
			AND "status" = 'CLAIMED';
		INSERT INTO "public"."sv_audit_events" (
			"organization_id", "actor_id", "event", "subject_kind", "subject_id", "details"
		) VALUES (
			claim_record."organization_id", p_actor_id, 'JOURNAL_DAILY_CLAIM_ABANDONED',
			'journal_daily_claim', claim_record."id"::text,
			jsonb_build_object(
				'fromStatus', 'CLAIMED', 'toStatus', 'ABANDONED', 'recovery', 'EXACT_NO_SPEND',
				'providerCalls', 0, 'runCount', 0, 'boundaryCount', 0,
				'costEventCount', 0, 'consumedPermitCount', 0, 'recurring', false
			)
		);
		RETURN 'ABANDONED';
	END IF;
	RETURN 'HOLD';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_journal_claim_recovery_state"(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_recover_journal_daily_claim"(uuid, text) FROM PUBLIC;
