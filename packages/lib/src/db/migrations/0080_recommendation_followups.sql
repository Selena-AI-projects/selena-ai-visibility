-- A recommendation in the paid report is computed from a cycle's runs each
-- time the report is read, so it has no row of its own. What a client decides
-- about it does need one: who takes it, by when, and whether it was done or
-- set aside. The row is keyed by the cycle and a key derived from the
-- recommendation's content, which is what makes "the same recommendation" in
-- two reads of one report land on one row.
--
-- References to the project and cycle go through (id, organization_id), as in
-- 0077, so a row can never point at another workspace's cycle even if a caller
-- passes a foreign id. The free-text fields are capped here, not only in the
-- validator, so a direct write cannot bypass the limit.
CREATE TABLE "sv_recommendation_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"recommendation_key" text NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"assignee" text,
	"due_on" date,
	"note" text,
	"updated_by" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_recommendation_followups_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "sv_projects"("id","organization_id"),
	CONSTRAINT "sv_recommendation_followups_cycle_fk" FOREIGN KEY ("cycle_id","organization_id") REFERENCES "sv_cycles"("id","organization_id"),
	CONSTRAINT "sv_recommendation_followups_key_check" CHECK (length(btrim("recommendation_key")) > 0),
	CONSTRAINT "sv_recommendation_followups_status_check" CHECK ("status" IN ('NEW', 'IN_PROGRESS', 'DONE', 'DISMISSED')),
	CONSTRAINT "sv_recommendation_followups_assignee_check" CHECK ("assignee" IS NULL OR length("assignee") <= 120),
	CONSTRAINT "sv_recommendation_followups_note_check" CHECK ("note" IS NULL OR length("note") <= 2000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_recommendation_followups_cycle_key_unique" ON "sv_recommendation_followups" USING btree ("organization_id","cycle_id","recommendation_key");
--> statement-breakpoint
CREATE INDEX "sv_recommendation_followups_project_idx" ON "sv_recommendation_followups" USING btree ("organization_id","project_id");
--> statement-breakpoint
ALTER TABLE "sv_recommendation_followups" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_recommendation_followups" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_recommendation_followups"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
-- Where the runtime role already exists (staging), the table reaches it with
-- this migration; a clean install creates the role later and gets the same
-- grant from selena-rls-runtime-role.sql. No DELETE: a follow-up is
-- rewritten, never removed.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		GRANT SELECT, INSERT, UPDATE ON "sv_recommendation_followups" TO selena_app;
	END IF;
END;
$$;
