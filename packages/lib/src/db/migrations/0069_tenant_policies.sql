-- Tenant policies for the tables that had RLS enabled with no policy, and RLS for
-- organization membership. FORCE is deliberately not set here: the web still
-- connects as the table owner without app.organization_id, and several SECURITY
-- DEFINER functions owned by that role read these tables. Policies are inert for
-- the owner until FORCE, so this migration changes no current query result.
--
-- COMMENT markers record intentional exceptions for check-rls-coverage.mjs:
-- `rls:deny-by-design` (reached only through definer functions or internal roles)
-- and `rls:exempt <reason>` (RLS stays off).
CREATE POLICY "tenant_isolation" ON "brands"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "organization_settings"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "usage_events"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "prompts"
	USING ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)))
	WITH CHECK ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "competitors"
	USING ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)))
	WITH CHECK ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "brand_opportunities"
	USING ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)))
	WITH CHECK ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "citations"
	USING ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)))
	WITH CHECK ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "prompt_runs"
	USING ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)))
	WITH CHECK ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "prompt_run_hourly_aggregates"
	USING ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)))
	WITH CHECK ("brand_id" IN (SELECT "id" FROM "public"."brands" WHERE "organization_id" = current_setting('app.organization_id', true)));
--> statement-breakpoint
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sso_provider" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "member"
	USING ("organization_id" = current_setting('app.organization_id', true) OR "user_id" = current_setting('app.user_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true) OR "user_id" = current_setting('app.user_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "organization"
	USING ("id" = current_setting('app.organization_id', true) OR "id" IN (SELECT "organization_id" FROM "public"."member" WHERE "user_id" = current_setting('app.user_id', true)))
	WITH CHECK ("id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "invitation"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sso_provider"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
COMMENT ON TABLE "secrets" IS 'rls:deny-by-design';
--> statement-breakpoint
COMMENT ON TABLE "sv_pilot_invites" IS 'rls:deny-by-design';
--> statement-breakpoint
COMMENT ON TABLE "sv_provider_spend_budgets" IS 'rls:deny-by-design';
--> statement-breakpoint
COMMENT ON TABLE "sv_provider_spend_reservations" IS 'rls:deny-by-design';
--> statement-breakpoint
COMMENT ON TABLE "sv_free_auto_dispatch_claims" IS 'rls:deny-by-design';
--> statement-breakpoint
COMMENT ON TABLE "sv_journal_no_spend_reconciliations" IS 'rls:deny-by-design';
--> statement-breakpoint
COMMENT ON TABLE "sv_public_scans" IS 'rls:deny-by-design';
--> statement-breakpoint
COMMENT ON TABLE "subscription" IS 'rls:deny-by-design';
--> statement-breakpoint
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
COMMENT ON TABLE "user" IS 'rls:exempt better-auth';
--> statement-breakpoint
COMMENT ON TABLE "session" IS 'rls:exempt better-auth';
--> statement-breakpoint
COMMENT ON TABLE "account" IS 'rls:exempt better-auth';
--> statement-breakpoint
COMMENT ON TABLE "verification" IS 'rls:exempt better-auth';
--> statement-breakpoint
COMMENT ON TABLE "sv_simulation_bootstrap_nonces" IS 'rls:exempt staging-only';
