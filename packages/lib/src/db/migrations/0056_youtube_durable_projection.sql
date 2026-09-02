CREATE TABLE "sv_youtube_video_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL,
	"snapshot_id" text NOT NULL,
	"video_id" text NOT NULL,
	"shortcode" text,
	"youtuber_id" text,
	"views" bigint,
	"likes" bigint,
	"comments_count" integer,
	"content_sha256" text NOT NULL,
	"schema_version" text NOT NULL,
	"captured_at" timestamptz NOT NULL,
	"expires_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_youtube_video_metrics_project_org_fk"
		FOREIGN KEY ("project_id", "organization_id")
		REFERENCES "sv_projects"("id", "organization_id"),
	CONSTRAINT "sv_youtube_video_metrics_shape_check" CHECK (
		"snapshot_id" = btrim("snapshot_id") AND length("snapshot_id") > 0
		AND "video_id" = btrim("video_id") AND length("video_id") > 0
		AND ("shortcode" IS NULL OR ("shortcode" = btrim("shortcode") AND length("shortcode") > 0))
		AND ("youtuber_id" IS NULL OR ("youtuber_id" = btrim("youtuber_id") AND length("youtuber_id") > 0))
		AND ("views" IS NULL OR "views" >= 0)
		AND ("likes" IS NULL OR "likes" >= 0)
		AND ("comments_count" IS NULL OR "comments_count" >= 0)
		AND "content_sha256" ~ '^sha256:[a-f0-9]{64}$'
		AND "schema_version" = btrim("schema_version") AND length("schema_version") > 0
		AND "expires_at" > "captured_at"
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_youtube_video_metrics_video_snapshot_unique"
	ON "sv_youtube_video_metrics" ("organization_id", "project_id", "video_id", "snapshot_id");
--> statement-breakpoint
CREATE INDEX "sv_youtube_video_metrics_org_project_captured_idx"
	ON "sv_youtube_video_metrics" ("organization_id", "project_id", "captured_at");
--> statement-breakpoint
CREATE INDEX "sv_youtube_video_metrics_expires_idx"
	ON "sv_youtube_video_metrics" ("organization_id", "expires_at");
--> statement-breakpoint
ALTER TABLE "sv_youtube_video_metrics" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_youtube_video_metrics" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_youtube_video_metrics"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE FUNCTION "sv_reject_youtube_video_metrics_update"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'YOUTUBE_VIDEO_METRICS_IMMUTABLE: insert a new metric snapshot instead';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_youtube_video_metrics_immutable_guard"
	BEFORE UPDATE ON "sv_youtube_video_metrics"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_youtube_video_metrics_update"();
--> statement-breakpoint
COMMENT ON TABLE "sv_youtube_video_metrics" IS
	'Tenant-scoped YouTube metric projection only. Raw payloads, URLs, title, description, transcript and comments are forbidden.';
