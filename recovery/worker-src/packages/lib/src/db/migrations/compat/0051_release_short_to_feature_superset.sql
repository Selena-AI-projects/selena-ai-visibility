-- Compatibility bridge for the exact reviewed 0051 release-short hash
-- d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395.
--
-- This file is not a Drizzle journal entry. apply-migrations.mjs runs it only
-- while holding the database-wide migration lock and only before 0056. Every
-- statement is idempotent so an interruption after the bridge transaction but
-- before Drizzle resumes cannot leave the database unrecoverable.

CREATE TABLE IF NOT EXISTS "sv_provider_canary_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"execution_identity" text NOT NULL,
	"source" text DEFAULT 'GOOGLE_AI_MODE' NOT NULL,
	"approved_cap_usd" numeric(12, 6) DEFAULT 0.250000 NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"automatic_retries" integer DEFAULT 0 NOT NULL,
	"cost_status" text DEFAULT 'UNKNOWN' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_provider_canary_executions_contract_check" CHECK (
		"source" = 'GOOGLE_AI_MODE'
		AND "approved_cap_usd" = 0.250000
		AND "recurring" = false
		AND "automatic_retries" = 0
		AND "cost_status" = 'UNKNOWN'
		AND length("execution_identity") BETWEEN 8 AND 128
		AND "execution_identity" = btrim("execution_identity")
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sv_provider_canary_executions_identity_unique"
	ON "sv_provider_canary_executions" ("source", "execution_identity");
--> statement-breakpoint
ALTER TABLE "sv_provider_canary_executions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_provider_canary_executions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_catalog.pg_policy
		WHERE polrelid = 'public.sv_provider_canary_executions'::regclass
			AND polname = 'tenant_isolation'
	) THEN
		CREATE POLICY "tenant_isolation" ON "sv_provider_canary_executions"
			USING ("organization_id" = current_setting('app.organization_id', true))
			WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
	END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_reject_provider_canary_execution_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'PROVIDER_CANARY_EXECUTION_IMMUTABLE';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_provider_canary_executions_immutable_guard" ON "sv_provider_canary_executions";
--> statement-breakpoint
CREATE TRIGGER "sv_provider_canary_executions_immutable_guard"
	BEFORE UPDATE OR DELETE ON "sv_provider_canary_executions"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_provider_canary_execution_mutation"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_provider_canary_executions_truncate_guard" ON "sv_provider_canary_executions";
--> statement-breakpoint
CREATE TRIGGER "sv_provider_canary_executions_truncate_guard"
	BEFORE TRUNCATE ON "sv_provider_canary_executions"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_reject_provider_canary_execution_mutation"();
--> statement-breakpoint
COMMENT ON TABLE "sv_provider_canary_executions" IS
	'Immutable once-ever tenant reservation inserted and committed before the isolated GOOGLE_AI_MODE trigger. UNKNOWN cost_status does not claim actual provider spend.';
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "sv_provider_canary_executions" FROM PUBLIC;
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots"
	ADD COLUMN IF NOT EXISTS "content_sha256_format_valid" boolean
		GENERATED ALWAYS AS ("content_sha256" ~ '^(sha256:)?[a-f0-9]{64}$') STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sv_evidence_index_id_organization_unique"
	ON "sv_evidence_index" ("id", "organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sv_evidence_acceptance_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"evidence_id" uuid NOT NULL,
	"accepted_at" timestamptz NOT NULL,
	"accepted_by" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_evidence_acceptance_receipts_evidence_org_fk"
		FOREIGN KEY ("evidence_id", "organization_id")
		REFERENCES "sv_evidence_index" ("id", "organization_id"),
	CONSTRAINT "sv_evidence_acceptance_receipts_actor_check"
		CHECK (length(trim("accepted_by")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sv_evidence_acceptance_receipts_org_evidence_unique"
	ON "sv_evidence_acceptance_receipts" ("organization_id", "evidence_id");
--> statement-breakpoint
ALTER TABLE "sv_evidence_acceptance_receipts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_evidence_acceptance_receipts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_catalog.pg_policy
		WHERE polrelid = 'public.sv_evidence_acceptance_receipts'::regclass
			AND polname = 'tenant_isolation'
	) THEN
		CREATE POLICY "tenant_isolation" ON "sv_evidence_acceptance_receipts"
			USING ("organization_id" = current_setting('app.organization_id', true))
			WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
	END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_enforce_evidence_acceptance_receipt"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	evidence_captured_at timestamptz;
BEGIN
	SELECT "captured_at" INTO evidence_captured_at
	FROM "sv_evidence_index"
	WHERE "id" = NEW."evidence_id"
		AND "organization_id" = NEW."organization_id";
	IF NOT FOUND THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_SOURCE_NOT_VISIBLE';
	END IF;
	IF NEW."accepted_at" < evidence_captured_at THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_PRECEDES_CAPTURE';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_reject_evidence_acceptance_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_IMMUTABLE';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_evidence_acceptance_receipts_scope_guard" ON "sv_evidence_acceptance_receipts";
--> statement-breakpoint
CREATE TRIGGER "sv_evidence_acceptance_receipts_scope_guard"
	BEFORE INSERT ON "sv_evidence_acceptance_receipts"
	FOR EACH ROW EXECUTE FUNCTION "sv_enforce_evidence_acceptance_receipt"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_evidence_acceptance_receipts_immutable_guard" ON "sv_evidence_acceptance_receipts";
--> statement-breakpoint
CREATE TRIGGER "sv_evidence_acceptance_receipts_immutable_guard"
	BEFORE UPDATE OR DELETE ON "sv_evidence_acceptance_receipts"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_evidence_acceptance_mutation"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_evidence_acceptance_receipts_truncate_guard" ON "sv_evidence_acceptance_receipts";
--> statement-breakpoint
CREATE TRIGGER "sv_evidence_acceptance_receipts_truncate_guard"
	BEFORE TRUNCATE ON "sv_evidence_acceptance_receipts"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_reject_evidence_acceptance_mutation"();
--> statement-breakpoint
COMMENT ON TABLE "sv_evidence_acceptance_receipts" IS
	'Append-only human acceptance receipts. Presence means ACCEPTED; absence remains UNKNOWN. accepted_by is private.';
--> statement-breakpoint
REVOKE ALL ON "sv_evidence_acceptance_receipts" FROM PUBLIC;
--> statement-breakpoint
CREATE OR REPLACE VIEW "sv_evidence_read_model" WITH (security_invoker = true) AS
	SELECT
		"evidence"."organization_id",
		"lock"."project_id",
		"evidence"."id" AS "evidence_id",
		"evidence"."domain_id",
		"dataset"."version" AS "dataset_version",
		"evidence"."source_snapshot_id",
		"snapshot"."capability_id",
		"snapshot"."source_type",
		"snapshot"."input_schema_version",
		"snapshot"."output_schema_version",
		"capability"."source",
		"capability"."surface",
		"capability"."domain" AS "capability_domain",
		"capability"."capability_status",
		"capability"."input_schema_version" AS "capability_input_schema_version",
		"capability"."output_schema_version" AS "capability_output_schema_version",
		CASE WHEN "acceptance"."id" IS NULL THEN NULL ELSE 'ACCEPTED'::text END AS "acceptance_status",
		"acceptance"."accepted_at",
		"evidence"."captured_at" AS "evidence_captured_at"
	FROM "sv_evidence_index" AS "evidence"
	INNER JOIN "sv_measurement_cycles" AS "cycle"
		ON "cycle"."id" = "evidence"."cycle_id"
		AND "cycle"."domain_id" = "evidence"."domain_id"
		AND "cycle"."organization_id" = "evidence"."organization_id"
	INNER JOIN "sv_configuration_locks" AS "lock"
		ON "lock"."id" = "cycle"."configuration_lock_id"
		AND "lock"."organization_id" = "evidence"."organization_id"
	INNER JOIN "sv_measurement_datasets" AS "dataset"
		ON "dataset"."id" = "evidence"."dataset_id"
		AND "dataset"."cycle_id" = "evidence"."cycle_id"
		AND "dataset"."organization_id" = "evidence"."organization_id"
	LEFT JOIN "sv_source_snapshots" AS "snapshot"
		ON "snapshot"."id" = "evidence"."source_snapshot_id"
		AND "snapshot"."organization_id" = "evidence"."organization_id"
	LEFT JOIN "sv_provider_dataset_capabilities" AS "capability"
		ON "capability"."id" = "snapshot"."capability_id"
		AND "capability"."organization_id" = "evidence"."organization_id"
	LEFT JOIN "sv_evidence_acceptance_receipts" AS "acceptance"
		ON "acceptance"."evidence_id" = "evidence"."id"
		AND "acceptance"."organization_id" = "evidence"."organization_id";
--> statement-breakpoint
COMMENT ON VIEW "sv_evidence_read_model" IS
	'Application-safe evidence projection. Excludes raw locators, provider references, content hashes and snapshot payloads.';
--> statement-breakpoint
REVOKE ALL ON "sv_evidence_read_model" FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		REVOKE UPDATE, DELETE, TRUNCATE ON "sv_provider_canary_executions" FROM selena_app;
		GRANT SELECT, INSERT ON "sv_provider_canary_executions" TO selena_app;
		EXECUTE 'REVOKE ALL ON "sv_evidence_provenance" FROM selena_app';
		REVOKE ALL ON "sv_evidence_acceptance_receipts" FROM selena_app;
		REVOKE SELECT ON "sv_source_snapshots" FROM selena_app;
		GRANT SELECT (
			"id", "organization_id", "source_type", "capability_id",
			"input_schema_version", "output_schema_version", "content_sha256_format_valid",
			"captured_at", "immutable", "created_at"
		) ON "sv_source_snapshots" TO selena_app;
		GRANT SELECT ("id", "organization_id", "evidence_id", "accepted_at")
			ON "sv_evidence_acceptance_receipts" TO selena_app;
		GRANT SELECT ON "sv_evidence_read_model" TO selena_app;
	END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_resolve_api_key_context"(api_key_hash text)
RETURNS TABLE (api_key_id uuid, organization_id text, permissions text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT "key"."id", "key"."organization_id", "key"."permissions"
	FROM "public"."sv_api_keys" AS "key"
	WHERE "key"."key_hash" = $1
		AND "key"."revoked_at" IS NULL
		AND ("key"."expires_at" IS NULL OR "key"."expires_at" > pg_catalog.now())
	LIMIT 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_resolve_api_key_context"(text) FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		GRANT EXECUTE ON FUNCTION "sv_resolve_api_key_context"(text) TO selena_app;
	END IF;

	IF to_regclass('public.sv_provider_canary_executions') IS NULL
		OR to_regclass('public.sv_evidence_acceptance_receipts') IS NULL
		OR to_regclass('public.sv_evidence_read_model') IS NULL
		OR to_regprocedure('public.sv_resolve_api_key_context(text)') IS NULL
		OR NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public'
				AND table_name = 'sv_source_snapshots'
				AND column_name = 'content_sha256_format_valid'
		) THEN
		RAISE EXCEPTION 'SELENA_0051_RELEASE_SHORT_COMPATIBILITY_INCOMPLETE';
	END IF;
END;
$$;
