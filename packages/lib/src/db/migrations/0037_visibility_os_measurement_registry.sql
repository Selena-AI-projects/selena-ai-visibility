CREATE TABLE "sv_measurement_domains" (
	"domain_id" text PRIMARY KEY NOT NULL,
	"unit_of_measure" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "sv_measurement_domains" ("domain_id", "unit_of_measure") VALUES
	('AI', 'scenario_system_repeat'),
	('SEARCH', 'query_engine_region_device'),
	('LOCAL', 'location_keyword_coordinate_provider'),
	('REPUTATION', 'location_source_period'),
	('OUTCOME', 'project_location_metric_period');
--> statement-breakpoint
CREATE TABLE "sv_measurement_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"domain_id" text NOT NULL REFERENCES "sv_measurement_domains"("domain_id"),
	"domain_cycle_id" uuid NOT NULL,
	"configuration_lock_id" uuid NOT NULL REFERENCES "sv_configuration_locks"("id"),
	"status" text DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_cycles_domain_cycle_unique" ON "sv_measurement_cycles" ("domain_id", "domain_cycle_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_cycles_id_domain_unique" ON "sv_measurement_cycles" ("id", "domain_id");
--> statement-breakpoint
CREATE INDEX "sv_measurement_cycles_org_domain_idx" ON "sv_measurement_cycles" ("organization_id", "domain_id");
--> statement-breakpoint
CREATE TABLE "sv_measurement_datasets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"cycle_id" uuid REFERENCES "sv_measurement_cycles"("id"),
	"dataset_key" text NOT NULL,
	"version" integer NOT NULL CHECK ("version" > 0),
	"immutable" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_datasets_org_key_version_unique" ON "sv_measurement_datasets" ("organization_id", "dataset_key", "version");
--> statement-breakpoint
CREATE INDEX "sv_measurement_datasets_org_cycle_idx" ON "sv_measurement_datasets" ("organization_id", "cycle_id");
--> statement-breakpoint
CREATE TABLE "sv_source_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"source_type" text NOT NULL,
	"source_ref" text NOT NULL,
	"content_sha256" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"captured_at" timestamptz NOT NULL,
	"immutable" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_source_snapshots_org_content_sha256_unique" ON "sv_source_snapshots" ("organization_id", "content_sha256");
--> statement-breakpoint
CREATE INDEX "sv_source_snapshots_org_captured_idx" ON "sv_source_snapshots" ("organization_id", "captured_at");
--> statement-breakpoint
CREATE TABLE "sv_evidence_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"domain_id" text NOT NULL REFERENCES "sv_measurement_domains"("domain_id"),
	"cycle_id" uuid NOT NULL,
	"observation_ref" text NOT NULL,
	"dataset_id" uuid NOT NULL REFERENCES "sv_measurement_datasets"("id"),
	"source_snapshot_id" uuid REFERENCES "sv_source_snapshots"("id"),
	"captured_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_evidence_index_cycle_domain_fk" FOREIGN KEY ("cycle_id", "domain_id")
		REFERENCES "sv_measurement_cycles"("id", "domain_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_evidence_index_domain_observation_unique" ON "sv_evidence_index" ("domain_id", "observation_ref");
--> statement-breakpoint
CREATE INDEX "sv_evidence_index_org_cycle_idx" ON "sv_evidence_index" ("organization_id", "cycle_id");
--> statement-breakpoint
ALTER TABLE "sv_measurement_domains" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_measurement_domains" FOR SELECT USING (true);
--> statement-breakpoint
ALTER TABLE "sv_measurement_cycles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_measurement_cycles"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_measurement_datasets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_measurement_datasets"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_source_snapshots"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_evidence_index" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_evidence_index"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE VIEW "sv_measurement_cycles_compat" WITH (security_invoker = true) AS
	SELECT
		"id",
		"organization_id",
		"domain_id",
		"domain_cycle_id",
		"configuration_lock_id",
		"status",
		"created_at",
		"updated_at"
	FROM "sv_measurement_cycles"
	WHERE "domain_id" <> 'AI'
	UNION ALL
	SELECT
		"legacy_cycle"."id",
		"legacy_cycle"."organization_id",
		'AI'::text AS "domain_id",
		"legacy_cycle"."id" AS "domain_cycle_id",
		"legacy_cycle"."lock_id" AS "configuration_lock_id",
		"legacy_cycle"."status"::text,
		"legacy_cycle"."created_at",
		"legacy_cycle"."updated_at"
	FROM "sv_cycles" AS "legacy_cycle";
