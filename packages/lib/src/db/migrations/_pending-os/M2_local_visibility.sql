ALTER TABLE "sv_business_locations"
	ADD COLUMN "local_profile" jsonb,
	ADD COLUMN "local_profile_confirmed_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "sv_cost_events"
	ADD COLUMN "measurement_cycle_id" uuid,
	ADD COLUMN "domain_id" text DEFAULT 'AI' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sv_cost_events"
	ADD CONSTRAINT "sv_cost_events_domain_id_fk"
	FOREIGN KEY ("domain_id") REFERENCES "sv_measurement_domains"("domain_id");
--> statement-breakpoint
ALTER TABLE "sv_cost_events"
	ADD CONSTRAINT "sv_cost_events_measurement_domain_fk"
	FOREIGN KEY ("measurement_cycle_id", "domain_id")
	REFERENCES "sv_measurement_cycles"("id", "domain_id");
--> statement-breakpoint
ALTER TABLE "sv_cost_events"
	ADD CONSTRAINT "sv_cost_events_domain_shape_check"
	CHECK ("domain_id" = 'AI'
		OR ("measurement_cycle_id" IS NOT NULL AND "cycle_id" IS NULL AND "run_id" IS NULL));
--> statement-breakpoint
CREATE INDEX "sv_cost_events_org_domain_idx"
	ON "sv_cost_events" ("organization_id", "domain_id");
--> statement-breakpoint
CREATE INDEX "sv_cost_events_measurement_cycle_idx"
	ON "sv_cost_events" ("measurement_cycle_id");
--> statement-breakpoint
CREATE TYPE "sv_local_rank_validity" AS ENUM ('VALID', 'INVALID', 'UNMEASURED');
--> statement-breakpoint
CREATE TABLE "sv_local_keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"location_id" uuid NOT NULL REFERENCES "sv_business_locations"("id"),
	"text" text NOT NULL,
	"normalized_text" text NOT NULL,
	"language" text NOT NULL,
	"status" "sv_scenario_status" DEFAULT 'PROPOSED' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_local_keywords_location_text_language_unique"
	ON "sv_local_keywords" ("location_id", "normalized_text", "language");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_local_keywords_id_location_unique"
	ON "sv_local_keywords" ("id", "location_id");
--> statement-breakpoint
CREATE INDEX "sv_local_keywords_org_location_idx"
	ON "sv_local_keywords" ("organization_id", "location_id");
--> statement-breakpoint
CREATE TABLE "sv_grid_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"location_id" uuid NOT NULL REFERENCES "sv_business_locations"("id"),
	"version" integer NOT NULL,
	"point_count" integer NOT NULL,
	"spacing_meters" integer NOT NULL,
	"shape" text NOT NULL,
	"rows" integer NOT NULL,
	"columns" integer NOT NULL,
	"center_latitude" numeric(9, 6) NOT NULL,
	"center_longitude" numeric(9, 6) NOT NULL,
	"formula_version" text NOT NULL,
	"immutable" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_grid_definitions_point_count_check"
		CHECK ("point_count" > 0 AND "point_count" <= 49 AND "point_count" = "rows" * "columns"),
	CONSTRAINT "sv_grid_definitions_shape_check"
		CHECK ("shape" = 'SQUARE' AND "rows" = "columns" AND mod("rows", 2) = 1),
	CONSTRAINT "sv_grid_definitions_spacing_check" CHECK ("spacing_meters" > 0),
	CONSTRAINT "sv_grid_definitions_latitude_check" CHECK ("center_latitude" BETWEEN -90 AND 90),
	CONSTRAINT "sv_grid_definitions_longitude_check" CHECK ("center_longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_grid_definitions_location_version_unique"
	ON "sv_grid_definitions" ("location_id", "version");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_grid_definitions_id_location_unique"
	ON "sv_grid_definitions" ("id", "location_id");
--> statement-breakpoint
CREATE INDEX "sv_grid_definitions_org_location_idx"
	ON "sv_grid_definitions" ("organization_id", "location_id");
--> statement-breakpoint
CREATE TABLE "sv_grid_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"grid_id" uuid NOT NULL REFERENCES "sv_grid_definitions"("id"),
	"point_index" integer NOT NULL CHECK ("point_index" >= 0),
	"latitude" numeric(9, 6) NOT NULL CHECK ("latitude" BETWEEN -90 AND 90),
	"longitude" numeric(9, 6) NOT NULL CHECK ("longitude" BETWEEN -180 AND 180),
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_grid_points_grid_point_unique"
	ON "sv_grid_points" ("grid_id", "point_index");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_grid_points_id_grid_unique"
	ON "sv_grid_points" ("id", "grid_id");
--> statement-breakpoint
CREATE INDEX "sv_grid_points_org_grid_idx"
	ON "sv_grid_points" ("organization_id", "grid_id");
--> statement-breakpoint
CREATE TABLE "sv_local_scan_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"measurement_cycle_id" uuid NOT NULL,
	"domain_id" text DEFAULT 'LOCAL' NOT NULL,
	"configuration_lock_id" uuid NOT NULL REFERENCES "sv_configuration_locks"("id"),
	"location_id" uuid NOT NULL REFERENCES "sv_business_locations"("id"),
	"grid_definition_id" uuid NOT NULL REFERENCES "sv_grid_definitions"("id"),
	"provider" text NOT NULL,
	"repeats" integer NOT NULL,
	"capture_depth" integer NOT NULL,
	"expected_observations" integer NOT NULL,
	"created_observations" integer DEFAULT 0 NOT NULL,
	"worst_case_cost_usd" numeric(12, 6) NOT NULL,
	"cost_snapshot" jsonb NOT NULL,
	"status" "sv_cycle_status" DEFAULT 'CREATED' NOT NULL,
	"emergency_stopped_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_local_scan_cycles_measurement_domain_fk"
		FOREIGN KEY ("measurement_cycle_id", "domain_id")
		REFERENCES "sv_measurement_cycles"("id", "domain_id"),
	CONSTRAINT "sv_local_scan_cycles_grid_location_fk"
		FOREIGN KEY ("grid_definition_id", "location_id")
		REFERENCES "sv_grid_definitions"("id", "location_id"),
	CONSTRAINT "sv_local_scan_cycles_domain_check" CHECK ("domain_id" = 'LOCAL'),
	CONSTRAINT "sv_local_scan_cycles_cardinality_check"
		CHECK ("expected_observations" > 0 AND "created_observations" >= 0
			AND "created_observations" <= "expected_observations"),
	CONSTRAINT "sv_local_scan_cycles_shape_check"
		CHECK ("repeats" > 0 AND "capture_depth" >= 0 AND "worst_case_cost_usd" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_local_scan_cycles_measurement_cycle_unique"
	ON "sv_local_scan_cycles" ("measurement_cycle_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_local_scan_cycles_id_location_grid_unique"
	ON "sv_local_scan_cycles" ("id", "location_id", "grid_definition_id");
--> statement-breakpoint
CREATE INDEX "sv_local_scan_cycles_org_location_idx"
	ON "sv_local_scan_cycles" ("organization_id", "location_id");
--> statement-breakpoint
CREATE TABLE "sv_local_rank_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"cycle_id" uuid NOT NULL REFERENCES "sv_local_scan_cycles"("id"),
	"location_id" uuid NOT NULL REFERENCES "sv_business_locations"("id"),
	"keyword_id" uuid NOT NULL REFERENCES "sv_local_keywords"("id"),
	"grid_definition_id" uuid NOT NULL REFERENCES "sv_grid_definitions"("id"),
	"grid_point_id" uuid NOT NULL REFERENCES "sv_grid_points"("id"),
	"provider" text NOT NULL,
	"repeat_index" integer NOT NULL CHECK ("repeat_index" >= 0),
	"validity" "sv_local_rank_validity" NOT NULL,
	"invalid_reason" text,
	"capture_depth" integer NOT NULL CHECK ("capture_depth" >= 0),
	"capture_mode" text NOT NULL,
	"target_rank" integer,
	"attempt_count" integer DEFAULT 1 NOT NULL CHECK ("attempt_count" > 0),
	"raw_reference" text,
	"captured_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_local_rank_observations_cycle_matrix_fk"
		FOREIGN KEY ("cycle_id", "location_id", "grid_definition_id")
		REFERENCES "sv_local_scan_cycles"("id", "location_id", "grid_definition_id"),
	CONSTRAINT "sv_local_rank_observations_keyword_location_fk"
		FOREIGN KEY ("keyword_id", "location_id")
		REFERENCES "sv_local_keywords"("id", "location_id"),
	CONSTRAINT "sv_local_rank_observations_point_grid_fk"
		FOREIGN KEY ("grid_point_id", "grid_definition_id")
		REFERENCES "sv_grid_points"("id", "grid_id"),
	CONSTRAINT "sv_local_rank_observations_target_rank_check"
		CHECK ("target_rank" IS NULL OR ("target_rank" > 0 AND "target_rank" <= "capture_depth")),
	CONSTRAINT "sv_local_rank_observations_invalid_reason_check"
		CHECK (("validity" = 'VALID' AND "invalid_reason" IS NULL)
			OR ("validity" <> 'VALID' AND "invalid_reason" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_local_rank_observations_matrix_unique"
	ON "sv_local_rank_observations"
	("cycle_id", "location_id", "keyword_id", "grid_point_id", "provider", "repeat_index");
--> statement-breakpoint
CREATE INDEX "sv_local_rank_observations_org_cycle_idx"
	ON "sv_local_rank_observations" ("organization_id", "cycle_id");
--> statement-breakpoint
CREATE TABLE "sv_local_competitor_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"observation_id" uuid NOT NULL REFERENCES "sv_local_rank_observations"("id"),
	"rank" integer NOT NULL CHECK ("rank" > 0),
	"entity_name" text NOT NULL,
	"matched_entity_id" uuid REFERENCES "sv_entities"("id"),
	"match_status" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_local_competitor_observations_rank_unique"
	ON "sv_local_competitor_observations" ("observation_id", "rank");
--> statement-breakpoint
CREATE INDEX "sv_local_competitor_observations_org_observation_idx"
	ON "sv_local_competitor_observations" ("organization_id", "observation_id");
--> statement-breakpoint
CREATE TABLE "sv_local_visibility_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"cycle_id" uuid NOT NULL REFERENCES "sv_local_scan_cycles"("id"),
	"keyword_id" uuid NOT NULL REFERENCES "sv_local_keywords"("id"),
	"formula_version" text NOT NULL,
	"top3_coverage" numeric(9, 8),
	"top10_coverage" numeric(9, 8),
	"top20_coverage" numeric(9, 8),
	"outside_top20" numeric(9, 8),
	"average_rank" numeric(12, 6),
	"found_share" numeric(9, 8),
	"share_of_local_voice" numeric(9, 8),
	"competitor_comparison" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computed_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_local_visibility_metrics_ratio_check" CHECK (
		("top3_coverage" IS NULL OR "top3_coverage" BETWEEN 0 AND 1)
		AND ("top10_coverage" IS NULL OR "top10_coverage" BETWEEN 0 AND 1)
		AND ("top20_coverage" IS NULL OR "top20_coverage" BETWEEN 0 AND 1)
		AND ("outside_top20" IS NULL OR "outside_top20" BETWEEN 0 AND 1)
		AND ("found_share" IS NULL OR "found_share" BETWEEN 0 AND 1)
		AND ("share_of_local_voice" IS NULL OR "share_of_local_voice" BETWEEN 0 AND 1)
		AND ("average_rank" IS NULL OR "average_rank" > 0)
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_local_visibility_metrics_cycle_keyword_formula_unique"
	ON "sv_local_visibility_metrics" ("cycle_id", "keyword_id", "formula_version");
--> statement-breakpoint
CREATE INDEX "sv_local_visibility_metrics_org_cycle_idx"
	ON "sv_local_visibility_metrics" ("organization_id", "cycle_id");
--> statement-breakpoint
CREATE FUNCTION "sv_validate_local_cycle"() RETURNS trigger AS $$
DECLARE
	grid_points integer;
	declared_grid_points integer;
	first_point_index integer;
	last_point_index integer;
	approved_keywords integer;
	lock_snapshot jsonb;
	lock_budget numeric;
BEGIN
	SELECT count(*), max(definition."point_count"), min(point."point_index"), max(point."point_index")
	INTO grid_points, declared_grid_points, first_point_index, last_point_index
	FROM "sv_grid_points" AS point
	JOIN "sv_grid_definitions" AS definition ON definition."id" = point."grid_id"
	WHERE point."grid_id" = NEW."grid_definition_id";

	SELECT count(*) INTO approved_keywords
	FROM "sv_local_keywords"
	WHERE "location_id" = NEW."location_id" AND "status" = 'APPROVED';

	IF grid_points = 0 OR grid_points <> declared_grid_points
		OR first_point_index <> 0 OR last_point_index <> declared_grid_points - 1
		OR approved_keywords = 0
		OR NEW."expected_observations" <> grid_points * approved_keywords * NEW."repeats" THEN
		RAISE EXCEPTION 'LOCAL_CYCLE_CARDINALITY_MISMATCH';
	END IF;

	SELECT "snapshot" #> '{visibilityOs,local}', "budget_cap"
	INTO lock_snapshot, lock_budget
	FROM "sv_configuration_locks"
	WHERE "id" = NEW."configuration_lock_id";

	IF lock_snapshot IS NULL OR lock_snapshot <> NEW."cost_snapshot"
		OR NOT (NEW."cost_snapshot" ? 'worstCaseCost')
		OR NOT (NEW."cost_snapshot" ? 'plannedCalls')
		OR NOT (NEW."cost_snapshot" ? 'worstCaseCalls')
		OR (NEW."cost_snapshot" ->> 'worstCaseCost')::numeric <> NEW."worst_case_cost_usd" THEN
		RAISE EXCEPTION 'LOCAL_CYCLE_COST_NOT_FROZEN';
	END IF;
	IF NEW."worst_case_cost_usd" > lock_budget THEN
		RAISE EXCEPTION 'LOCAL_CYCLE_BUDGET_EXCEEDED';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_validate_local_cycle_before_insert"
	BEFORE INSERT ON "sv_local_scan_cycles"
	FOR EACH ROW EXECUTE FUNCTION "sv_validate_local_cycle"();
--> statement-breakpoint
CREATE FUNCTION "sv_prevent_local_economics_mutation"() RETURNS trigger AS $$
BEGIN
	IF OLD."cost_snapshot" IS DISTINCT FROM NEW."cost_snapshot"
		OR OLD."worst_case_cost_usd" IS DISTINCT FROM NEW."worst_case_cost_usd"
		OR OLD."expected_observations" IS DISTINCT FROM NEW."expected_observations"
		OR OLD."repeats" IS DISTINCT FROM NEW."repeats"
		OR OLD."capture_depth" IS DISTINCT FROM NEW."capture_depth"
		OR OLD."provider" IS DISTINCT FROM NEW."provider" THEN
		RAISE EXCEPTION 'LOCAL_CYCLE_ECONOMICS_IMMUTABLE';
	END IF;
	IF NEW."status" IN ('ANALYZING', 'QC_REQUIRED', 'READY')
		AND NEW."created_observations" <> NEW."expected_observations" THEN
		RAISE EXCEPTION 'LOCAL_CYCLE_INCOMPLETE';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_local_economics_update"
	BEFORE UPDATE ON "sv_local_scan_cycles"
	FOR EACH ROW EXECUTE FUNCTION "sv_prevent_local_economics_mutation"();
--> statement-breakpoint
CREATE FUNCTION "sv_prevent_used_grid_mutation"() RETURNS trigger AS $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "sv_local_scan_cycles"
		WHERE "grid_definition_id" = OLD."id"
	) THEN
		RAISE EXCEPTION 'LOCAL_GRID_IMMUTABLE';
	END IF;
	RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_used_grid_update"
	BEFORE UPDATE OR DELETE ON "sv_grid_definitions"
	FOR EACH ROW EXECUTE FUNCTION "sv_prevent_used_grid_mutation"();
--> statement-breakpoint
CREATE FUNCTION "sv_guard_grid_point_mutation"() RETURNS trigger AS $$
DECLARE
	grid_uuid uuid;
	point_org text;
	definition_org text;
	declared_points integer;
BEGIN
	grid_uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD."grid_id" ELSE NEW."grid_id" END;
	point_org := CASE WHEN TG_OP = 'DELETE' THEN OLD."organization_id" ELSE NEW."organization_id" END;

	IF EXISTS (
		SELECT 1 FROM "sv_local_scan_cycles"
		WHERE "grid_definition_id" = grid_uuid
	) THEN
		RAISE EXCEPTION 'LOCAL_GRID_IMMUTABLE';
	END IF;

	IF TG_OP <> 'DELETE' THEN
		SELECT "organization_id", "point_count"
		INTO definition_org, declared_points
		FROM "sv_grid_definitions"
		WHERE "id" = NEW."grid_id";
		IF point_org <> definition_org OR NEW."point_index" >= declared_points THEN
			RAISE EXCEPTION 'LOCAL_GRID_POINT_OUTSIDE_DEFINITION';
		END IF;
	END IF;
	RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_grid_point_before_mutation"
	BEFORE INSERT OR UPDATE OR DELETE ON "sv_grid_points"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_grid_point_mutation"();
--> statement-breakpoint
CREATE FUNCTION "sv_guard_local_observation_insert"() RETURNS trigger AS $$
DECLARE
	local_cycle "sv_local_scan_cycles"%ROWTYPE;
BEGIN
	SELECT * INTO local_cycle
	FROM "sv_local_scan_cycles"
	WHERE "id" = NEW."cycle_id"
	FOR UPDATE;

	IF local_cycle."emergency_stopped_at" IS NOT NULL THEN
		INSERT INTO "sv_incidents" ("organization_id", "kind", "detail")
		VALUES (NEW."organization_id", 'LOCAL_EMERGENCY_STOP',
			'Local observation blocked before provider call for cycle ' || NEW."cycle_id"::text);
		RETURN NULL;
	END IF;
	IF local_cycle."status" <> 'RUNNING' THEN
		INSERT INTO "sv_incidents" ("organization_id", "kind", "detail")
		VALUES (NEW."organization_id", 'LOCAL_CYCLE_NOT_RUNNING',
			'Local observation blocked before provider call for cycle ' || NEW."cycle_id"::text);
		RETURN NULL;
	END IF;

	IF NEW."organization_id" <> local_cycle."organization_id"
		OR NEW."provider" <> local_cycle."provider"
		OR NEW."capture_depth" <> local_cycle."capture_depth"
		OR NEW."repeat_index" >= local_cycle."repeats" THEN
		RAISE EXCEPTION 'LOCAL_OBSERVATION_OUTSIDE_CYCLE';
	END IF;

	IF local_cycle."created_observations" >= local_cycle."expected_observations" THEN
		INSERT INTO "sv_incidents" ("organization_id", "kind", "detail")
		VALUES (NEW."organization_id", 'CARDINALITY_INCIDENT',
			'Local observation expected+1 blocked before provider call for cycle ' || NEW."cycle_id"::text);
		RETURN NULL;
	END IF;

	UPDATE "sv_local_scan_cycles"
	SET "created_observations" = "created_observations" + 1,
		"updated_at" = now()
	WHERE "id" = NEW."cycle_id";
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_local_observation_before_insert"
	BEFORE INSERT ON "sv_local_rank_observations"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_local_observation_insert"();
--> statement-breakpoint
CREATE FUNCTION "sv_prepare_local_observation_retry"(observation_uuid uuid) RETURNS boolean AS $$
DECLARE
	current_observation "sv_local_rank_observations"%ROWTYPE;
	local_cycle "sv_local_scan_cycles"%ROWTYPE;
BEGIN
	SELECT * INTO current_observation
	FROM "sv_local_rank_observations"
	WHERE "id" = observation_uuid
	FOR UPDATE;
	IF NOT FOUND OR current_observation."validity" = 'VALID' THEN
		RETURN false;
	END IF;

	SELECT * INTO local_cycle
	FROM "sv_local_scan_cycles"
	WHERE "id" = current_observation."cycle_id"
	FOR UPDATE;
	IF local_cycle."emergency_stopped_at" IS NOT NULL OR local_cycle."status" <> 'RUNNING' THEN
		RETURN false;
	END IF;

	UPDATE "sv_local_rank_observations"
	SET "attempt_count" = "attempt_count" + 1,
		"validity" = 'UNMEASURED',
		"invalid_reason" = 'RETRY_PENDING',
		"target_rank" = NULL,
		"raw_reference" = NULL,
		"updated_at" = now()
	WHERE "id" = observation_uuid;
	RETURN true;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
ALTER TABLE "sv_local_keywords" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_local_keywords"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_grid_definitions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_grid_definitions"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_grid_points" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_grid_points"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_local_scan_cycles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_local_scan_cycles"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_local_rank_observations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_local_rank_observations"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_local_competitor_observations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_local_competitor_observations"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_local_visibility_metrics" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_local_visibility_metrics"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
