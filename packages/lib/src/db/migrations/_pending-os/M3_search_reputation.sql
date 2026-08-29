CREATE TABLE "sv_search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL REFERENCES "sv_projects"("id"),
	"query_text" text NOT NULL,
	"normalized_text" text NOT NULL,
	"engine" text NOT NULL,
	"region" text NOT NULL,
	"device" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_search_queries_text_check"
		CHECK (length(trim("query_text")) > 0 AND length(trim("normalized_text")) > 0),
	CONSTRAINT "sv_search_queries_project_scope_unique"
		UNIQUE ("project_id", "normalized_text", "engine", "region", "device"),
	CONSTRAINT "sv_search_queries_id_scope_unique"
		UNIQUE ("id", "engine", "region", "device")
);
--> statement-breakpoint
CREATE INDEX "sv_search_queries_org_project_idx"
	ON "sv_search_queries" ("organization_id", "project_id");
--> statement-breakpoint
CREATE TABLE "sv_search_rank_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"cycle_id" uuid NOT NULL,
	"domain_id" text DEFAULT 'SEARCH' NOT NULL,
	"query_id" uuid NOT NULL REFERENCES "sv_search_queries"("id"),
	"engine" text NOT NULL,
	"region" text NOT NULL,
	"device" text NOT NULL,
	"repeat_index" integer NOT NULL,
	"validity" text NOT NULL,
	"invalid_reason" text,
	"capture_depth" integer NOT NULL,
	"target_rank" integer,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"raw_reference" text,
	"captured_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_search_rank_observations_cycle_domain_fk"
		FOREIGN KEY ("cycle_id", "domain_id")
		REFERENCES "sv_measurement_cycles"("id", "domain_id"),
	CONSTRAINT "sv_search_rank_observations_query_scope_fk"
		FOREIGN KEY ("query_id", "engine", "region", "device")
		REFERENCES "sv_search_queries"("id", "engine", "region", "device"),
	CONSTRAINT "sv_search_rank_observations_scope_unique"
		UNIQUE ("cycle_id", "query_id", "engine", "region", "device", "repeat_index"),
	CONSTRAINT "sv_search_rank_observations_domain_check" CHECK ("domain_id" = 'SEARCH'),
	CONSTRAINT "sv_search_rank_observations_validity_check"
		CHECK ("validity" IN ('VALID', 'INVALID', 'UNMEASURED')),
	CONSTRAINT "sv_search_rank_observations_invalid_reason_check"
		CHECK (("validity" = 'VALID' AND "invalid_reason" IS NULL)
			OR ("validity" <> 'VALID' AND "invalid_reason" IS NOT NULL)),
	CONSTRAINT "sv_search_rank_observations_rank_check"
		CHECK ("capture_depth" >= 0
			AND ("target_rank" IS NULL OR ("target_rank" > 0 AND "target_rank" <= "capture_depth"))),
	CONSTRAINT "sv_search_rank_observations_retry_check"
		CHECK ("repeat_index" >= 0 AND "attempt_count" > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_search_rank_observations_org_cycle_idx"
	ON "sv_search_rank_observations" ("organization_id", "cycle_id");
--> statement-breakpoint
CREATE TABLE "sv_reputation_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"location_id" uuid NOT NULL REFERENCES "sv_business_locations"("id"),
	"source" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_reputation_sources_location_source_unique" UNIQUE ("location_id", "source"),
	CONSTRAINT "sv_reputation_sources_source_check" CHECK (length(trim("source")) > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_reputation_sources_org_location_idx"
	ON "sv_reputation_sources" ("organization_id", "location_id");
--> statement-breakpoint
CREATE TABLE "sv_review_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"cycle_id" uuid NOT NULL,
	"domain_id" text DEFAULT 'REPUTATION' NOT NULL,
	"source_id" uuid NOT NULL REFERENCES "sv_reputation_sources"("id"),
	"period_start" timestamptz NOT NULL,
	"period_end" timestamptz NOT NULL,
	"validity" text DEFAULT 'VALID' NOT NULL,
	"invalid_reason" text,
	"rating_average" numeric(4, 3),
	"review_count" integer,
	"new_reviews" integer,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"raw_reference" text,
	"captured_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_review_snapshots_cycle_domain_fk"
		FOREIGN KEY ("cycle_id", "domain_id")
		REFERENCES "sv_measurement_cycles"("id", "domain_id"),
	CONSTRAINT "sv_review_snapshots_source_period_unique"
		UNIQUE ("source_id", "period_start", "period_end"),
	CONSTRAINT "sv_review_snapshots_id_source_period_unique"
		UNIQUE ("id", "source_id", "period_start", "period_end"),
	CONSTRAINT "sv_review_snapshots_domain_check" CHECK ("domain_id" = 'REPUTATION'),
	CONSTRAINT "sv_review_snapshots_period_check" CHECK ("period_end" > "period_start"),
	CONSTRAINT "sv_review_snapshots_validity_check"
		CHECK ("validity" IN ('VALID', 'INVALID', 'UNMEASURED')),
	CONSTRAINT "sv_review_snapshots_invalid_reason_check"
		CHECK (("validity" = 'VALID' AND "invalid_reason" IS NULL)
			OR ("validity" <> 'VALID' AND "invalid_reason" IS NOT NULL)),
	CONSTRAINT "sv_review_snapshots_metric_check"
		CHECK (("rating_average" IS NULL OR ("rating_average" >= 0 AND "rating_average" <= 5))
			AND ("review_count" IS NULL OR "review_count" >= 0)
			AND ("new_reviews" IS NULL OR "new_reviews" >= 0)),
	CONSTRAINT "sv_review_snapshots_retry_check" CHECK ("attempt_count" > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_review_snapshots_org_cycle_idx"
	ON "sv_review_snapshots" ("organization_id", "cycle_id");
--> statement-breakpoint
CREATE TABLE "sv_review_velocity_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"snapshot_id" uuid NOT NULL REFERENCES "sv_review_snapshots"("id"),
	"source_id" uuid NOT NULL REFERENCES "sv_reputation_sources"("id"),
	"period_start" timestamptz NOT NULL,
	"period_end" timestamptz NOT NULL,
	"formula_version" text NOT NULL,
	"velocity_per_30_days" numeric(12, 6),
	"computed_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_review_velocity_metrics_snapshot_scope_fk"
		FOREIGN KEY ("snapshot_id", "source_id", "period_start", "period_end")
		REFERENCES "sv_review_snapshots"("id", "source_id", "period_start", "period_end"),
	CONSTRAINT "sv_review_velocity_metrics_source_period_formula_unique"
		UNIQUE ("source_id", "period_start", "period_end", "formula_version"),
	CONSTRAINT "sv_review_velocity_metrics_period_check" CHECK ("period_end" > "period_start"),
	CONSTRAINT "sv_review_velocity_metrics_value_check"
		CHECK ("velocity_per_30_days" IS NULL OR "velocity_per_30_days" >= 0)
);
--> statement-breakpoint
CREATE INDEX "sv_review_velocity_metrics_org_source_idx"
	ON "sv_review_velocity_metrics" ("organization_id", "source_id");
--> statement-breakpoint
CREATE TABLE "sv_review_topic_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"snapshot_id" uuid NOT NULL REFERENCES "sv_review_snapshots"("id"),
	"topic" text NOT NULL,
	"sentiment" text NOT NULL,
	"analysis_method_version" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_review_topic_observations_topic_method_unique"
		UNIQUE ("snapshot_id", "topic", "analysis_method_version"),
	CONSTRAINT "sv_review_topic_observations_analysis_method_check"
		CHECK (length(trim("topic")) > 0
			AND length(trim("sentiment")) > 0
			AND length(trim("analysis_method_version")) > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_review_topic_observations_org_snapshot_idx"
	ON "sv_review_topic_observations" ("organization_id", "snapshot_id");
--> statement-breakpoint
ALTER TABLE "sv_search_queries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_search_queries"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_search_rank_observations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_search_rank_observations"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_reputation_sources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_reputation_sources"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_review_snapshots" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_review_snapshots"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_review_velocity_metrics" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_review_velocity_metrics"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
ALTER TABLE "sv_review_topic_observations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_review_topic_observations"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
