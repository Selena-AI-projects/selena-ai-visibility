-- Operator work spans every tenant through the owner connection, so each entry
-- into it is recorded: who, by which credential, and which request. The table
-- belongs to no tenant; only the operator connection writes or reads it.
CREATE TABLE "sv_operator_access_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"actor_kind" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_operator_access_events_actor_kind_check" CHECK ("actor_kind" IN ('platform_admin', 'admin_api_key'))
);
--> statement-breakpoint
CREATE INDEX "sv_operator_access_events_at_idx" ON "sv_operator_access_events" ("at");
--> statement-breakpoint
ALTER TABLE "sv_operator_access_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
COMMENT ON TABLE "sv_operator_access_events" IS 'rls:deny-by-design';
