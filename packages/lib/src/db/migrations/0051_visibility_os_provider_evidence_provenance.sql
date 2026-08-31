CREATE TABLE "sv_provider_dataset_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"provider" text NOT NULL,
	"source" text NOT NULL,
	"surface" text NOT NULL,
	"domain" text NOT NULL,
	"entity_type" text NOT NULL,
	"dataset_env_key" text NOT NULL,
	"input_schema_version" text NOT NULL,
	"output_schema_version" text,
	"access_class" text NOT NULL,
	"capability_status" text NOT NULL,
	"retention_class" text,
	"contract_version" text NOT NULL,
	"version" integer NOT NULL,
	"contract_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"immutable" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_provider_dataset_capabilities_shape_check" CHECK (
		"version" > 0
		AND "immutable" = true
		AND jsonb_typeof("contract_metadata") = 'object'
		AND length(trim("provider")) > 0
		AND length(trim("source")) > 0
		AND length(trim("surface")) > 0
		AND length(trim("entity_type")) > 0
		AND length(trim("dataset_env_key")) > 0
		AND length(trim("input_schema_version")) > 0
		AND ("output_schema_version" IS NULL OR length(trim("output_schema_version")) > 0)
		AND length(trim("access_class")) > 0
		AND ("retention_class" IS NULL OR length(trim("retention_class")) > 0)
		AND length(trim("contract_version")) > 0
	),
	CONSTRAINT "sv_provider_dataset_capabilities_domain_check" CHECK (
		"domain" IN ('AI', 'SEARCH', 'ENTITY', 'REPUTATION', 'SOCIAL', 'TRAVEL')
	),
	CONSTRAINT "sv_provider_dataset_capabilities_status_check" CHECK (
		"capability_status" IN ('CONFIGURED_ONLY', 'CANARY_ONLY', 'PILOT_ONLY', 'ALLOWED', 'BLOCKED')
	),
	CONSTRAINT "sv_provider_dataset_capabilities_access_class_check" CHECK (
		"access_class" IN ('PUBLIC', 'CONNECTED', 'UPLOADED', 'DERIVED')
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_provider_dataset_capabilities_org_source_version_unique"
	ON "sv_provider_dataset_capabilities" ("organization_id", "provider", "source", "version");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_provider_dataset_capabilities_id_org_unique"
	ON "sv_provider_dataset_capabilities" ("id", "organization_id");
--> statement-breakpoint
CREATE INDEX "sv_provider_dataset_capabilities_org_status_idx"
	ON "sv_provider_dataset_capabilities" ("organization_id", "capability_status");
--> statement-breakpoint
ALTER TABLE "sv_provider_dataset_capabilities" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_provider_dataset_capabilities" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_provider_dataset_capabilities"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE FUNCTION "sv_reject_provider_dataset_capability_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'PROVIDER_DATASET_CAPABILITY_IMMUTABLE: insert a new version instead';
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "sv_enforce_provider_dataset_capability_version"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	latest_version integer;
BEGIN
	PERFORM pg_advisory_xact_lock(hashtextextended(NEW."organization_id" || ':' || NEW."provider" || ':' || NEW."source", 0));
	SELECT max("version") INTO latest_version
	FROM "sv_provider_dataset_capabilities"
	WHERE "organization_id" = NEW."organization_id"
		AND "provider" = NEW."provider"
		AND "source" = NEW."source";
	IF latest_version IS NOT NULL AND NEW."version" <= latest_version THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_CAPABILITY_VERSION_NOT_MONOTONIC';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_provider_dataset_capabilities_version_guard"
	BEFORE INSERT ON "sv_provider_dataset_capabilities"
	FOR EACH ROW EXECUTE FUNCTION "sv_enforce_provider_dataset_capability_version"();
--> statement-breakpoint
CREATE TRIGGER "sv_provider_dataset_capabilities_immutable_guard"
	BEFORE UPDATE OR DELETE ON "sv_provider_dataset_capabilities"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_provider_dataset_capability_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_provider_dataset_capabilities_truncate_guard"
	BEFORE TRUNCATE ON "sv_provider_dataset_capabilities"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_reject_provider_dataset_capability_mutation"();
--> statement-breakpoint
COMMENT ON TABLE "sv_provider_dataset_capabilities" IS
	'Append-only tenant capability contracts. Insert a higher version; UPDATE, DELETE and TRUNCATE are rejected.';
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots"
	ADD COLUMN "capability_id" uuid,
	ADD COLUMN "provider_dataset_ref" text,
	ADD COLUMN "environment" text,
	ADD COLUMN "raw_reference" text,
	ADD COLUMN "input_schema_version" text,
	ADD COLUMN "output_schema_version" text;
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots"
	ADD CONSTRAINT "sv_source_snapshots_capability_org_fk"
	FOREIGN KEY ("capability_id", "organization_id")
	REFERENCES "sv_provider_dataset_capabilities" ("id", "organization_id"),
	ADD CONSTRAINT "sv_source_snapshots_provider_capture_metadata_check" CHECK (
		((
			"capability_id" IS NULL
			AND "provider_dataset_ref" IS NULL
			AND "environment" IS NULL
			AND "raw_reference" IS NULL
			AND "input_schema_version" IS NULL
			AND "output_schema_version" IS NULL
		) OR (
			"capability_id" IS NOT NULL
			AND length(trim("provider_dataset_ref")) > 0
			AND length(trim("environment")) > 0
			AND length(trim("raw_reference")) > 0
			AND length(trim("input_schema_version")) > 0
			AND ("output_schema_version" IS NULL OR length(trim("output_schema_version")) > 0)
		)) IS TRUE
	);
--> statement-breakpoint
CREATE INDEX "sv_source_snapshots_org_capability_captured_idx"
	ON "sv_source_snapshots" ("organization_id", "capability_id", "captured_at");
--> statement-breakpoint
CREATE FUNCTION "sv_enforce_provider_snapshot_contract"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	capability "sv_provider_dataset_capabilities"%ROWTYPE;
BEGIN
	IF NEW."capability_id" IS NULL THEN
		RETURN NEW;
	END IF;
	SELECT * INTO capability
	FROM "sv_provider_dataset_capabilities"
	WHERE "id" = NEW."capability_id" AND "organization_id" = NEW."organization_id";
	IF NOT FOUND
		OR NEW."source_type" <> capability."source"
		OR NEW."input_schema_version" <> capability."input_schema_version"
		OR NEW."output_schema_version" IS DISTINCT FROM capability."output_schema_version" THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_CONTRACT_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_source_snapshots_provider_contract_guard"
	BEFORE INSERT OR UPDATE ON "sv_source_snapshots"
	FOR EACH ROW EXECUTE FUNCTION "sv_enforce_provider_snapshot_contract"();
--> statement-breakpoint
CREATE FUNCTION "sv_enforce_evidence_capability_domain"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	linked_capability_id uuid;
	capability_domain text;
BEGIN
	IF NEW."source_snapshot_id" IS NULL THEN
		RETURN NEW;
	END IF;
	SELECT "snapshot"."capability_id" INTO linked_capability_id
	FROM "sv_source_snapshots" AS "snapshot"
	WHERE "snapshot"."id" = NEW."source_snapshot_id"
		AND "snapshot"."organization_id" = NEW."organization_id";
	IF NOT FOUND THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_EVIDENCE_SNAPSHOT_NOT_VISIBLE';
	END IF;
	IF linked_capability_id IS NULL THEN
		RETURN NEW;
	END IF;
	SELECT "capability"."domain" INTO capability_domain
	FROM "sv_provider_dataset_capabilities" AS "capability"
	WHERE "capability"."id" = linked_capability_id
		AND "capability"."organization_id" = NEW."organization_id";
	IF NOT FOUND THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_EVIDENCE_CAPABILITY_NOT_VISIBLE';
	END IF;
	IF NOT (capability_domain = NEW."domain_id" OR (capability_domain = 'ENTITY' AND NEW."domain_id" = 'LOCAL')) THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_EVIDENCE_DOMAIN_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_evidence_index_capability_domain_guard"
	BEFORE INSERT OR UPDATE ON "sv_evidence_index"
	FOR EACH ROW EXECUTE FUNCTION "sv_enforce_evidence_capability_domain"();
--> statement-breakpoint
CREATE FUNCTION "sv_reject_evidence_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'SELENA_EVIDENCE_IMMUTABLE: insert a new snapshot or evidence row instead';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_source_snapshots_immutable_guard"
	BEFORE UPDATE OR DELETE ON "sv_source_snapshots"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_evidence_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_source_snapshots_truncate_guard"
	BEFORE TRUNCATE ON "sv_source_snapshots"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_reject_evidence_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_evidence_index_immutable_guard"
	BEFORE UPDATE OR DELETE ON "sv_evidence_index"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_evidence_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_evidence_index_truncate_guard"
	BEFORE TRUNCATE ON "sv_evidence_index"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_reject_evidence_mutation"();
--> statement-breakpoint
CREATE VIEW "sv_evidence_provenance" WITH (security_invoker = true) AS
	SELECT
		"evidence"."organization_id",
		"lock"."project_id",
		"evidence"."id" AS "evidence_id",
		"evidence"."domain_id",
		"evidence"."cycle_id",
		"evidence"."observation_ref",
		"evidence"."dataset_id",
		"dataset"."dataset_key",
		"dataset"."version" AS "dataset_version",
		"evidence"."source_snapshot_id",
		"snapshot"."capability_id",
		"snapshot"."source_type",
		"snapshot"."source_ref",
		"snapshot"."raw_reference",
		"snapshot"."content_sha256",
		"snapshot"."environment",
		"snapshot"."provider_dataset_ref",
		"snapshot"."input_schema_version",
		"snapshot"."output_schema_version",
		"capability"."provider",
		"capability"."source",
		"capability"."surface",
		"capability"."domain" AS "capability_domain",
		"capability"."entity_type",
		"capability"."access_class",
		"capability"."capability_status",
		"capability"."retention_class",
		"capability"."contract_version",
		"capability"."input_schema_version" AS "capability_input_schema_version",
		"capability"."output_schema_version" AS "capability_output_schema_version",
		"evidence"."captured_at" AS "evidence_captured_at",
		"snapshot"."captured_at" AS "source_captured_at"
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
		AND "capability"."organization_id" = "evidence"."organization_id";
--> statement-breakpoint
COMMENT ON VIEW "sv_evidence_provenance" IS
	'INTERNAL PRIVATE provenance. raw_reference, provider_dataset_ref, environment and content_sha256 MUST NOT flow to client routes or exports.';
--> statement-breakpoint
REVOKE ALL ON "sv_evidence_provenance" FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		EXECUTE 'REVOKE ALL ON "sv_evidence_provenance" FROM selena_app';
	END IF;
END;
$$;
