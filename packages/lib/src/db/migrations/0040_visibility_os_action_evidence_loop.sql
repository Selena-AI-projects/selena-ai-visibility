DO $$ BEGIN
	CREATE TYPE "sv_action_status" AS ENUM (
		'PROPOSED', 'APPROVED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED', 'REJECTED', 'ABANDONED'
	);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "sv_change_verification" AS ENUM ('DECLARED', 'EVIDENCED', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "sv_verification_status" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "sv_attribution_verdict" AS ENUM (
		'POSITIVE_CORRELATION',
		'NEGATIVE_CORRELATION',
		'NO_OBSERVED_CHANGE',
		'MIXED_RESULT',
		'INSUFFICIENT_EVIDENCE',
		'CONFOUNDED',
		'NOT_MEASURED'
	);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "sv_attribution_confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "sv_findings"
	ADD COLUMN IF NOT EXISTS "domain_id" text,
	ADD COLUMN IF NOT EXISTS "location_id" uuid;
--> statement-breakpoint
ALTER TABLE "sv_recommendations"
	ADD COLUMN IF NOT EXISTS "domain_id" text,
	ADD COLUMN IF NOT EXISTS "location_id" uuid;
--> statement-breakpoint
ALTER TABLE "sv_measurement_datasets"
	ADD CONSTRAINT "sv_measurement_datasets_id_cycle_organization_unique"
	UNIQUE ("id", "cycle_id", "organization_id");
--> statement-breakpoint
CREATE TABLE "sv_approved_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL REFERENCES "sv_projects"("id"),
	"source_kind" text NOT NULL,
	"source_ref" text NOT NULL,
	"finding_ref" text,
	"recommendation_ref" text,
	"status" "sv_action_status" DEFAULT 'PROPOSED' NOT NULL,
	"title" text NOT NULL,
	"evidence_ids" text[] NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_approved_actions_id_organization_unique" UNIQUE ("id", "organization_id"),
	CONSTRAINT "sv_approved_actions_source_check"
		CHECK ("source_kind" IN ('CYCLE_RECOMMENDATION', 'ENGINE_ACTION', 'MANUAL')
			AND length(trim("source_ref")) > 0),
	CONSTRAINT "sv_approved_actions_evidence_check"
		CHECK (cardinality("evidence_ids") > 0 AND length(trim("title")) > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_approved_actions_org_project_idx"
	ON "sv_approved_actions" ("organization_id", "project_id");
--> statement-breakpoint
CREATE TABLE "sv_action_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"action_id" uuid NOT NULL,
	"approval_version" integer NOT NULL,
	"approved_by" text NOT NULL,
	"approved_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_action_approvals_action_organization_fk"
		FOREIGN KEY ("action_id", "organization_id")
		REFERENCES "sv_approved_actions"("id", "organization_id"),
	CONSTRAINT "sv_action_approvals_action_version_unique" UNIQUE ("action_id", "approval_version"),
	CONSTRAINT "sv_action_approvals_approval_check"
		CHECK ("approval_version" > 0 AND length(trim("approved_by")) > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_action_approvals_org_action_idx"
	ON "sv_action_approvals" ("organization_id", "action_id");
--> statement-breakpoint
CREATE TABLE "sv_change_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL REFERENCES "sv_projects"("id"),
	"action_id" uuid,
	"change_type" text NOT NULL,
	"detail" text NOT NULL,
	"verification" "sv_change_verification" DEFAULT 'DECLARED' NOT NULL,
	"evidence_ids" text[] DEFAULT '{}' NOT NULL,
	"occurred_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_change_events_id_organization_unique" UNIQUE ("id", "organization_id"),
	CONSTRAINT "sv_change_events_action_organization_fk"
		FOREIGN KEY ("action_id", "organization_id")
		REFERENCES "sv_approved_actions"("id", "organization_id"),
	CONSTRAINT "sv_change_events_content_check"
		CHECK (length(trim("change_type")) > 0 AND length(trim("detail")) > 0),
	CONSTRAINT "sv_change_events_evidence_check"
		CHECK ("verification" <> 'EVIDENCED' OR cardinality("evidence_ids") > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_change_events_org_project_idx"
	ON "sv_change_events" ("organization_id", "project_id");
--> statement-breakpoint
CREATE TABLE "sv_change_event_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"change_event_id" uuid NOT NULL,
	"object_reference" text NOT NULL,
	"content_sha256" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_change_event_assets_event_organization_fk"
		FOREIGN KEY ("change_event_id", "organization_id")
		REFERENCES "sv_change_events"("id", "organization_id"),
	CONSTRAINT "sv_change_event_assets_reference_check"
		CHECK (length(trim("object_reference")) > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_change_event_assets_org_event_idx"
	ON "sv_change_event_assets" ("organization_id", "change_event_id");
--> statement-breakpoint
CREATE TABLE "sv_verification_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"action_id" uuid NOT NULL,
	"baseline_cycle_id" uuid NOT NULL REFERENCES "sv_measurement_cycles"("id"),
	"verification_measurement_cycle_id" uuid NOT NULL REFERENCES "sv_measurement_cycles"("id"),
	"baseline_dataset_id" uuid NOT NULL REFERENCES "sv_measurement_datasets"("id"),
	"verification_dataset_id" uuid NOT NULL REFERENCES "sv_measurement_datasets"("id"),
	"attempt" integer NOT NULL,
	"settle_days" integer DEFAULT 14 NOT NULL,
	"status" "sv_verification_status" DEFAULT 'PLANNED' NOT NULL,
	"completed_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_verification_cycles_action_organization_fk"
		FOREIGN KEY ("action_id", "organization_id")
		REFERENCES "sv_approved_actions"("id", "organization_id"),
	CONSTRAINT "sv_verification_cycles_baseline_dataset_cycle_fk"
		FOREIGN KEY ("baseline_dataset_id", "baseline_cycle_id", "organization_id")
		REFERENCES "sv_measurement_datasets"("id", "cycle_id", "organization_id"),
	CONSTRAINT "sv_verification_cycles_verification_dataset_cycle_fk"
		FOREIGN KEY ("verification_dataset_id", "verification_measurement_cycle_id", "organization_id")
		REFERENCES "sv_measurement_datasets"("id", "cycle_id", "organization_id"),
	CONSTRAINT "sv_verification_cycles_action_attempt_unique" UNIQUE ("action_id", "attempt"),
	CONSTRAINT "sv_verification_cycles_chain_unique" UNIQUE (
		"id", "organization_id", "action_id", "baseline_cycle_id", "verification_measurement_cycle_id",
		"baseline_dataset_id", "verification_dataset_id"
	),
	CONSTRAINT "sv_verification_cycles_shape_check" CHECK (
		"attempt" > 0 AND "settle_days" > 0
		AND "baseline_cycle_id" <> "verification_measurement_cycle_id"
		AND "baseline_dataset_id" <> "verification_dataset_id"
	),
	CONSTRAINT "sv_verification_cycles_completion_check" CHECK (
		("status" = 'COMPLETED' AND "completed_at" IS NOT NULL) OR "status" <> 'COMPLETED'
	)
);
--> statement-breakpoint
CREATE INDEX "sv_verification_cycles_org_action_idx"
	ON "sv_verification_cycles" ("organization_id", "action_id");
--> statement-breakpoint
CREATE TABLE "sv_attribution_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"verification_cycle_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"finding_ref" text NOT NULL,
	"recommendation_ref" text NOT NULL,
	"change_event_ids" uuid[] NOT NULL,
	"baseline_cycle_id" uuid NOT NULL,
	"verification_measurement_cycle_id" uuid NOT NULL,
	"baseline_dataset_id" uuid NOT NULL,
	"verification_dataset_id" uuid NOT NULL,
	"metric_key" text NOT NULL,
	"formula_version" text NOT NULL,
	"verdict" "sv_attribution_verdict" NOT NULL,
	"confidence" "sv_attribution_confidence" NOT NULL,
	"reason_codes" text[] NOT NULL,
	"evidence_ids" text[] NOT NULL,
	"delta" numeric(18, 6),
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_attribution_assessments_verification_chain_fk" FOREIGN KEY (
		"verification_cycle_id", "organization_id", "action_id", "baseline_cycle_id",
		"verification_measurement_cycle_id", "baseline_dataset_id", "verification_dataset_id"
	) REFERENCES "sv_verification_cycles"(
		"id", "organization_id", "action_id", "baseline_cycle_id",
		"verification_measurement_cycle_id", "baseline_dataset_id", "verification_dataset_id"
	),
	CONSTRAINT "sv_attribution_assessments_verification_metric_unique"
		UNIQUE ("verification_cycle_id", "metric_key", "formula_version"),
	CONSTRAINT "sv_attribution_assessments_provenance_check" CHECK (
		cardinality("evidence_ids") > 0
		AND cardinality("change_event_ids") > 0
		AND cardinality("reason_codes") > 0
		AND length(trim("finding_ref")) > 0
		AND length(trim("recommendation_ref")) > 0
		AND length(trim("metric_key")) > 0
		AND length(trim("formula_version")) > 0
	),
	CONSTRAINT "sv_attribution_assessments_confidence_check" CHECK (
		("verdict" IN ('POSITIVE_CORRELATION', 'NEGATIVE_CORRELATION', 'NO_OBSERVED_CHANGE', 'MIXED_RESULT')
			AND "confidence" IN ('HIGH', 'MEDIUM', 'LOW'))
		OR ("verdict" IN ('INSUFFICIENT_EVIDENCE', 'CONFOUNDED', 'NOT_MEASURED')
			AND "confidence" = 'UNKNOWN')
	)
);
--> statement-breakpoint
CREATE INDEX "sv_attribution_assessments_org_verification_idx"
	ON "sv_attribution_assessments" ("organization_id", "verification_cycle_id");
--> statement-breakpoint
CREATE FUNCTION "sv_guard_action_status_transition"() RETURNS trigger AS $$
DECLARE
	verification_ready boolean;
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" <> 'PROPOSED' THEN
			RAISE EXCEPTION 'ACTION_INITIAL_STATUS_INVALID';
		END IF;
		RETURN NEW;
	END IF;

	IF NEW."status" = OLD."status" THEN
		RETURN NEW;
	END IF;
	IF NOT (
		(OLD."status" = 'PROPOSED' AND NEW."status" IN ('APPROVED', 'REJECTED'))
		OR (OLD."status" = 'APPROVED' AND NEW."status" IN ('IN_PROGRESS', 'ABANDONED'))
		OR (OLD."status" = 'IN_PROGRESS' AND NEW."status" IN ('IMPLEMENTED', 'ABANDONED'))
		OR (OLD."status" = 'IMPLEMENTED' AND NEW."status" = 'VERIFIED')
	) THEN
		RAISE EXCEPTION 'ACTION_TRANSITION_INVALID';
	END IF;

	IF NEW."status" = 'APPROVED' AND NOT EXISTS (
		SELECT 1 FROM "sv_action_approvals"
		WHERE "action_id" = NEW."id" AND "organization_id" = NEW."organization_id"
	) THEN
		RAISE EXCEPTION 'ACTION_APPROVER_REQUIRED';
	END IF;

	IF NEW."status" = 'VERIFIED' THEN
		SELECT EXISTS (
			SELECT 1
			FROM "sv_verification_cycles" vc
			WHERE vc."action_id" = NEW."id"
				AND vc."organization_id" = NEW."organization_id"
				AND vc."status" = 'COMPLETED'
				AND vc."completed_at" >= (
					SELECT max(ce."occurred_at") + make_interval(days => vc."settle_days")
					FROM "sv_change_events" ce
					WHERE ce."action_id" = NEW."id"
						AND ce."organization_id" = NEW."organization_id"
				)
		) INTO verification_ready;
		IF NOT verification_ready THEN
			RAISE EXCEPTION 'ACTION_VERIFICATION_INCOMPLETE';
		END IF;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_action_status_transition_trigger"
	BEFORE INSERT OR UPDATE OF "status" ON "sv_approved_actions"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_action_status_transition"();
--> statement-breakpoint
CREATE FUNCTION "sv_guard_attribution_assessment"() RETURNS trigger AS $$
DECLARE
	verification_state sv_verification_status;
	matched_events integer;
BEGIN
	SELECT "status" INTO verification_state
	FROM "sv_verification_cycles"
	WHERE "id" = NEW."verification_cycle_id"
		AND "organization_id" = NEW."organization_id";
	IF verification_state IS DISTINCT FROM 'COMPLETED'
		AND (NEW."verdict" <> 'INSUFFICIENT_EVIDENCE'
			OR NOT ('VERIFICATION_INCOMPLETE' = ANY(NEW."reason_codes"))) THEN
		RAISE EXCEPTION 'ATTRIBUTION_VERIFICATION_INCOMPLETE';
	END IF;

	SELECT count(*) INTO matched_events
	FROM "sv_change_events"
	WHERE "id" = ANY(NEW."change_event_ids")
		AND "organization_id" = NEW."organization_id";
	IF matched_events <> cardinality(NEW."change_event_ids") THEN
		RAISE EXCEPTION 'ATTRIBUTION_CHANGE_EVENT_SCOPE_INVALID';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_attribution_assessment_trigger"
	BEFORE INSERT ON "sv_attribution_assessments"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_attribution_assessment"();
--> statement-breakpoint
ALTER TABLE "sv_approved_actions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_approved_actions"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_action_approvals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_action_approvals"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_change_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_change_events"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_change_event_assets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_change_event_assets"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_verification_cycles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_verification_cycles"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_attribution_assessments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_attribution_assessments"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
