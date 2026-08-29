CREATE TABLE "sv_outcome_metric_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_key" text NOT NULL,
	"version" integer NOT NULL,
	"unit" text NOT NULL,
	"aggregation" text DEFAULT 'SUM' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_outcome_metric_definitions_key_version_unique" UNIQUE ("metric_key", "version"),
	CONSTRAINT "sv_outcome_metric_definitions_shape_check" CHECK (
		"version" > 0
		AND length(trim("metric_key")) > 0
		AND length(trim("unit")) > 0
		AND "aggregation" = 'SUM'
	)
);
--> statement-breakpoint
CREATE TABLE "sv_outcome_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL REFERENCES "sv_projects"("id"),
	"location_id" uuid NOT NULL REFERENCES "sv_business_locations"("id"),
	"access_class" text NOT NULL,
	"source_reference" text NOT NULL,
	"evidence_ids" text[] NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_outcome_sources_id_scope_unique"
		UNIQUE ("id", "organization_id", "project_id", "location_id"),
	CONSTRAINT "sv_outcome_sources_access_class_check"
		CHECK ("access_class" IN ('CONNECTED', 'UPLOADED')),
	CONSTRAINT "sv_outcome_sources_provenance_check"
		CHECK (length(trim("source_reference")) > 0 AND cardinality("evidence_ids") > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_outcome_sources_org_location_idx"
	ON "sv_outcome_sources" ("organization_id", "location_id");
--> statement-breakpoint
CREATE FUNCTION "sv_validate_outcome_source_scope"() RETURNS trigger AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM "sv_business_locations" location
		JOIN "sv_entities" entity ON entity."id" = location."entity_id"
		WHERE location."id" = NEW."location_id"
			AND location."organization_id" = NEW."organization_id"
			AND entity."organization_id" = NEW."organization_id"
			AND entity."project_id" = NEW."project_id"
	) THEN
		RAISE EXCEPTION 'OUTCOME_LOCATION_SCOPE_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_validate_outcome_source_scope_trigger"
	BEFORE INSERT OR UPDATE OF "organization_id", "project_id", "location_id" ON "sv_outcome_sources"
	FOR EACH ROW EXECUTE FUNCTION "sv_validate_outcome_source_scope"();
--> statement-breakpoint
CREATE TABLE "sv_outcome_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL REFERENCES "sv_projects"("id"),
	"location_id" uuid NOT NULL REFERENCES "sv_business_locations"("id"),
	"source_id" uuid NOT NULL REFERENCES "sv_outcome_sources"("id"),
	"measurement_cycle_id" uuid NOT NULL,
	"domain_id" text DEFAULT 'OUTCOME' NOT NULL,
	"dataset_id" uuid NOT NULL,
	"metric_key" text NOT NULL,
	"metric_version" integer NOT NULL,
	"value" numeric(18, 6),
	"period_start" timestamptz NOT NULL,
	"period_end" timestamptz NOT NULL,
	"evidence_ids" text[] NOT NULL,
	"captured_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_outcome_observations_source_metric_period_unique"
		UNIQUE ("source_id", "metric_key", "period_start", "period_end"),
	CONSTRAINT "sv_outcome_observations_id_scope_metric_unique"
		UNIQUE ("id", "organization_id", "project_id", "location_id", "metric_key", "metric_version"),
	CONSTRAINT "sv_outcome_observations_source_scope_fk"
		FOREIGN KEY ("source_id", "organization_id", "project_id", "location_id")
		REFERENCES "sv_outcome_sources"("id", "organization_id", "project_id", "location_id"),
	CONSTRAINT "sv_outcome_observations_measurement_domain_fk"
		FOREIGN KEY ("measurement_cycle_id", "domain_id")
		REFERENCES "sv_measurement_cycles"("id", "domain_id"),
	CONSTRAINT "sv_outcome_observations_dataset_cycle_fk"
		FOREIGN KEY ("dataset_id", "measurement_cycle_id", "organization_id")
		REFERENCES "sv_measurement_datasets"("id", "cycle_id", "organization_id"),
	CONSTRAINT "sv_outcome_observations_metric_definition_fk"
		FOREIGN KEY ("metric_key", "metric_version")
		REFERENCES "sv_outcome_metric_definitions"("metric_key", "version"),
	CONSTRAINT "sv_outcome_observations_domain_check" CHECK ("domain_id" = 'OUTCOME'),
	CONSTRAINT "sv_outcome_observations_period_check" CHECK ("period_end" > "period_start"),
	CONSTRAINT "sv_outcome_observations_provenance_check" CHECK (
		cardinality("evidence_ids") > 0
		AND "metric_version" > 0
		AND length(trim("metric_key")) > 0
	),
	CONSTRAINT "sv_outcome_observations_value_check"
		CHECK ("value" IS NULL OR "value" <> 'NaN'::numeric)
);
--> statement-breakpoint
CREATE INDEX "sv_outcome_observations_org_location_idx"
	ON "sv_outcome_observations" ("organization_id", "location_id");
--> statement-breakpoint
CREATE FUNCTION "sv_guard_outcome_observation_immutable"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'OUTCOME_OBSERVATION_IMMUTABLE';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_outcome_observation_immutable_trigger"
	BEFORE UPDATE OR DELETE ON "sv_outcome_observations"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_outcome_observation_immutable"();
--> statement-breakpoint
CREATE TABLE "sv_outcome_attribution_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL REFERENCES "sv_projects"("id"),
	"location_id" uuid NOT NULL REFERENCES "sv_business_locations"("id"),
	"verification_cycle_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"baseline_cycle_id" uuid NOT NULL,
	"verification_measurement_cycle_id" uuid NOT NULL,
	"baseline_dataset_id" uuid NOT NULL,
	"verification_dataset_id" uuid NOT NULL,
	"baseline_observation_id" uuid NOT NULL,
	"verification_observation_id" uuid NOT NULL,
	"metric_key" text NOT NULL,
	"metric_version" integer NOT NULL,
	"window_start" timestamptz NOT NULL,
	"window_end" timestamptz NOT NULL,
	"evidence_ids" text[] NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_outcome_attribution_windows_verification_metric_unique"
		UNIQUE ("verification_cycle_id", "metric_key", "metric_version"),
	CONSTRAINT "sv_outcome_attribution_windows_assessment_chain_unique" UNIQUE (
		"id", "organization_id", "verification_cycle_id", "action_id", "baseline_cycle_id",
		"verification_measurement_cycle_id", "baseline_dataset_id", "verification_dataset_id", "metric_key"
	),
	CONSTRAINT "sv_outcome_attribution_windows_verification_chain_fk" FOREIGN KEY (
		"verification_cycle_id", "organization_id", "action_id", "baseline_cycle_id",
		"verification_measurement_cycle_id", "baseline_dataset_id", "verification_dataset_id"
	) REFERENCES "sv_verification_cycles"(
		"id", "organization_id", "action_id", "baseline_cycle_id",
		"verification_measurement_cycle_id", "baseline_dataset_id", "verification_dataset_id"
	),
	CONSTRAINT "sv_outcome_attribution_windows_baseline_observation_fk" FOREIGN KEY (
		"baseline_observation_id", "organization_id", "project_id", "location_id", "metric_key", "metric_version"
	) REFERENCES "sv_outcome_observations"(
		"id", "organization_id", "project_id", "location_id", "metric_key", "metric_version"
	),
	CONSTRAINT "sv_outcome_attribution_windows_verification_observation_fk" FOREIGN KEY (
		"verification_observation_id", "organization_id", "project_id", "location_id", "metric_key", "metric_version"
	) REFERENCES "sv_outcome_observations"(
		"id", "organization_id", "project_id", "location_id", "metric_key", "metric_version"
	),
	CONSTRAINT "sv_outcome_attribution_windows_window_check" CHECK (
		"window_end" > "window_start"
		AND "baseline_observation_id" <> "verification_observation_id"
		AND cardinality("evidence_ids") > 0
	)
);
--> statement-breakpoint
CREATE INDEX "sv_outcome_attribution_windows_org_location_idx"
	ON "sv_outcome_attribution_windows" ("organization_id", "location_id");
--> statement-breakpoint
CREATE FUNCTION "sv_validate_outcome_window_scope"() RETURNS trigger AS $$
DECLARE
	baseline_start timestamptz;
	baseline_end timestamptz;
	baseline_source_id uuid;
	verification_start timestamptz;
	verification_end timestamptz;
	verification_source_id uuid;
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM "sv_approved_actions"
		WHERE "id" = NEW."action_id"
			AND "organization_id" = NEW."organization_id"
			AND "project_id" = NEW."project_id"
	) THEN
		RAISE EXCEPTION 'OUTCOME_ACTION_SCOPE_MISMATCH';
	END IF;

	SELECT "period_start", "period_end", "source_id" INTO baseline_start, baseline_end, baseline_source_id
	FROM "sv_outcome_observations" WHERE "id" = NEW."baseline_observation_id";
	SELECT "period_start", "period_end", "source_id"
	INTO verification_start, verification_end, verification_source_id
	FROM "sv_outcome_observations" WHERE "id" = NEW."verification_observation_id";
	IF baseline_source_id <> verification_source_id THEN
		RAISE EXCEPTION 'OUTCOME_SOURCE_MISMATCH';
	END IF;
	IF baseline_end > verification_start THEN
		RAISE EXCEPTION 'OUTCOME_PERIODS_OVERLAP';
	END IF;
	IF NEW."window_start" > baseline_start OR NEW."window_end" < verification_end THEN
		RAISE EXCEPTION 'OUTCOME_WINDOW_INCOMPLETE';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_validate_outcome_window_scope_trigger"
	BEFORE INSERT OR UPDATE ON "sv_outcome_attribution_windows"
	FOR EACH ROW EXECUTE FUNCTION "sv_validate_outcome_window_scope"();
--> statement-breakpoint
ALTER TABLE "sv_attribution_assessments"
	ADD COLUMN "outcome_window_id" uuid;
--> statement-breakpoint
ALTER TABLE "sv_attribution_assessments"
	ADD CONSTRAINT "sv_attribution_assessments_outcome_window_fk" FOREIGN KEY (
		"outcome_window_id", "organization_id", "verification_cycle_id", "action_id", "baseline_cycle_id",
		"verification_measurement_cycle_id", "baseline_dataset_id", "verification_dataset_id", "metric_key"
	) REFERENCES "sv_outcome_attribution_windows"(
		"id", "organization_id", "verification_cycle_id", "action_id", "baseline_cycle_id",
		"verification_measurement_cycle_id", "baseline_dataset_id", "verification_dataset_id", "metric_key"
	);
--> statement-breakpoint
ALTER TABLE "sv_outcome_metric_definitions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_outcome_metric_definitions" FOR SELECT USING (true);
--> statement-breakpoint
ALTER TABLE "sv_outcome_sources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_outcome_sources"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_outcome_observations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_outcome_observations"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_outcome_attribution_windows" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_outcome_attribution_windows"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
