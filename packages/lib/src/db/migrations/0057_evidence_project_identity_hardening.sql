DO $$
BEGIN
	IF current_user <> session_user
		OR NOT EXISTS (
			SELECT 1 FROM pg_catalog.pg_roles
			WHERE rolname = current_user AND (rolsuper OR rolbypassrls)
		)
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_class AS relation
			WHERE relation.oid IN (
				'public.sv_source_snapshots'::regclass,
				'public.sv_evidence_index'::regclass,
				'public.sv_evidence_acceptance_receipts'::regclass,
				'public.sv_audit_events'::regclass
			)
				AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
			HAVING count(*) = 4
		) THEN
		RAISE EXCEPTION 'EVIDENCE_PROJECT_IDENTITY_MIGRATION_OWNER_BYPASS_REQUIRED';
	END IF;
END;
$$;
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots" ADD COLUMN IF NOT EXISTS "project_id" uuid;
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots" DISABLE TRIGGER "sv_source_snapshots_immutable_guard";
--> statement-breakpoint
WITH unambiguous_binding AS (
	SELECT
		"snapshot"."id" AS snapshot_id,
		"snapshot"."organization_id",
		(array_agg(DISTINCT "event"."project_id"))[1] AS project_id
	FROM "sv_source_snapshots" AS "snapshot"
	INNER JOIN "sv_provider_dataset_capabilities" AS "capability"
		ON "capability"."id" = "snapshot"."capability_id"
		AND "capability"."organization_id" = "snapshot"."organization_id"
	INNER JOIN "sv_provider_dataset_snapshot_events" AS "event"
		ON "event"."organization_id" = "snapshot"."organization_id"
		AND "event"."source" = "snapshot"."source_type"
		AND "event"."provider" = "capability"."provider"
		AND "event"."provider_dataset_id" = "snapshot"."provider_dataset_ref"
		AND 'brightdata:snapshot:' || "event"."snapshot_id" = "snapshot"."raw_reference"
		AND "event"."phase" = 'DELIVERED'
		AND "event"."observed_at" >= "snapshot"."captured_at"
	WHERE "snapshot"."capability_id" IS NOT NULL
		AND "snapshot"."project_id" IS NULL
	GROUP BY "snapshot"."id", "snapshot"."organization_id"
	HAVING count(DISTINCT "event"."project_id") = 1
)
UPDATE "sv_source_snapshots" AS "snapshot"
SET "project_id" = "binding"."project_id"
FROM unambiguous_binding AS "binding"
WHERE "snapshot"."id" = "binding"."snapshot_id"
	AND "snapshot"."organization_id" = "binding"."organization_id";
--> statement-breakpoint
WITH unambiguous_evidence_binding AS (
	SELECT
		"snapshot"."id" AS snapshot_id,
		"snapshot"."organization_id",
		(array_agg(DISTINCT "lock"."project_id"))[1] AS project_id
	FROM "sv_source_snapshots" AS "snapshot"
	INNER JOIN "sv_evidence_index" AS "evidence"
		ON "evidence"."source_snapshot_id" = "snapshot"."id"
		AND "evidence"."organization_id" = "snapshot"."organization_id"
	INNER JOIN "sv_measurement_cycles" AS "cycle"
		ON "cycle"."id" = "evidence"."cycle_id"
		AND "cycle"."domain_id" = "evidence"."domain_id"
		AND "cycle"."organization_id" = "evidence"."organization_id"
	INNER JOIN "sv_configuration_locks" AS "lock"
		ON "lock"."id" = "cycle"."configuration_lock_id"
		AND "lock"."organization_id" = "cycle"."organization_id"
	WHERE "snapshot"."capability_id" IS NULL
		AND "snapshot"."project_id" IS NULL
	GROUP BY "snapshot"."id", "snapshot"."organization_id"
	HAVING count(DISTINCT "lock"."project_id") = 1
)
UPDATE "sv_source_snapshots" AS "snapshot"
SET "project_id" = "binding"."project_id"
FROM unambiguous_evidence_binding AS "binding"
WHERE "snapshot"."id" = "binding"."snapshot_id"
	AND "snapshot"."organization_id" = "binding"."organization_id";
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots" ENABLE TRIGGER "sv_source_snapshots_immutable_guard";
--> statement-breakpoint
DROP INDEX "sv_source_snapshots_org_content_sha256_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_source_snapshots_project_content_sha256_unique"
	ON "sv_source_snapshots" ("organization_id", "project_id", "content_sha256")
	WHERE "project_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_source_snapshots_legacy_org_content_sha256_unique"
	ON "sv_source_snapshots" ("organization_id", "content_sha256")
	WHERE "project_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_source_snapshots_id_project_org_unique"
	ON "sv_source_snapshots" ("id", "project_id", "organization_id");
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots"
	ADD CONSTRAINT "sv_source_snapshots_project_org_fk"
	FOREIGN KEY ("project_id", "organization_id")
	REFERENCES "sv_projects" ("id", "organization_id");
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots"
	ADD CONSTRAINT "sv_source_snapshots_provider_project_check"
	CHECK ("capability_id" IS NULL OR "project_id" IS NOT NULL) NOT VALID;
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots"
	DROP CONSTRAINT "sv_source_snapshots_provider_capture_metadata_check";
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots"
	ADD CONSTRAINT "sv_source_snapshots_provider_capture_metadata_check" CHECK (
		(
			"capability_id" IS NULL
			AND "provider_dataset_ref" IS NULL
			AND "environment" IS NULL
			AND "raw_reference" IS NULL
			AND "input_schema_version" IS NULL
			AND "output_schema_version" IS NULL
		)
		OR (
			"capability_id" IS NOT NULL
			AND "provider_dataset_ref" = btrim("provider_dataset_ref")
			AND length("provider_dataset_ref") > 0
			AND "environment" IN ('ISOLATED_CANARY', 'STAGING_ACCEPTANCE', 'PRODUCTION')
			AND "raw_reference" = btrim("raw_reference")
			AND length("raw_reference") > 0
			AND "input_schema_version" = btrim("input_schema_version")
			AND length("input_schema_version") > 0
			AND (
				"output_schema_version" IS NULL
				OR (
					"output_schema_version" = btrim("output_schema_version")
					AND length("output_schema_version") > 0
				)
			)
		)
	) NOT VALID;
--> statement-breakpoint
ALTER TABLE "sv_source_snapshots"
	VALIDATE CONSTRAINT "sv_source_snapshots_provider_capture_metadata_check";
--> statement-breakpoint
ALTER TABLE "sv_evidence_index" ADD COLUMN IF NOT EXISTS "project_id" uuid;
--> statement-breakpoint
ALTER TABLE "sv_evidence_index" DISABLE TRIGGER "sv_evidence_index_immutable_guard";
--> statement-breakpoint
UPDATE "sv_evidence_index" AS "evidence"
SET "project_id" = "lock"."project_id"
FROM "sv_measurement_cycles" AS "cycle"
INNER JOIN "sv_configuration_locks" AS "lock"
	ON "lock"."id" = "cycle"."configuration_lock_id"
	AND "lock"."organization_id" = "cycle"."organization_id"
WHERE "cycle"."id" = "evidence"."cycle_id"
	AND "cycle"."domain_id" = "evidence"."domain_id"
	AND "cycle"."organization_id" = "evidence"."organization_id"
	AND "evidence"."project_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "sv_evidence_index" ENABLE TRIGGER "sv_evidence_index_immutable_guard";
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "sv_evidence_index" WHERE "project_id" IS NULL) THEN
		RAISE EXCEPTION 'EVIDENCE_PROJECT_IDENTITY_LEGACY_REVIEW_REQUIRED';
	END IF;
	IF EXISTS (
		SELECT 1
		FROM "sv_evidence_index" AS "evidence"
		INNER JOIN "sv_source_snapshots" AS "snapshot"
			ON "snapshot"."id" = "evidence"."source_snapshot_id"
			AND "snapshot"."organization_id" = "evidence"."organization_id"
		WHERE "snapshot"."project_id" IS DISTINCT FROM "evidence"."project_id"
	) THEN
		RAISE EXCEPTION 'EVIDENCE_PROJECT_IDENTITY_LEGACY_SNAPSHOT_REVIEW_REQUIRED';
	END IF;
END;
$$;
--> statement-breakpoint
ALTER TABLE "sv_evidence_index" ALTER COLUMN "project_id" SET NOT NULL;
--> statement-breakpoint
DROP INDEX "sv_evidence_index_domain_observation_unique";
--> statement-breakpoint
ALTER TABLE "sv_evidence_index"
	ADD CONSTRAINT "sv_evidence_index_formal_identity_unique"
	UNIQUE NULLS NOT DISTINCT (
		"organization_id", "project_id", "domain_id", "cycle_id",
		"dataset_id", "source_snapshot_id", "observation_ref"
	);
--> statement-breakpoint
ALTER TABLE "sv_evidence_index"
	ADD CONSTRAINT "sv_evidence_index_project_org_fk"
	FOREIGN KEY ("project_id", "organization_id")
	REFERENCES "sv_projects" ("id", "organization_id");
--> statement-breakpoint
ALTER TABLE "sv_evidence_index" DROP CONSTRAINT "sv_evidence_index_source_snapshot_org_fk";
--> statement-breakpoint
ALTER TABLE "sv_evidence_index"
	ADD CONSTRAINT "sv_evidence_index_source_snapshot_project_org_fk"
	FOREIGN KEY ("source_snapshot_id", "project_id", "organization_id")
	REFERENCES "sv_source_snapshots" ("id", "project_id", "organization_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_enforce_evidence_capability_domain"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE
	linked_capability_id uuid;
	linked_project_id uuid;
	cycle_project_id uuid;
	capability_domain text;
BEGIN
	SELECT "lock"."project_id"
	INTO cycle_project_id
	FROM "public"."sv_measurement_cycles" AS "cycle"
	INNER JOIN "public"."sv_configuration_locks" AS "lock"
		ON "lock"."id" = "cycle"."configuration_lock_id"
		AND "lock"."organization_id" = "cycle"."organization_id"
	WHERE "cycle"."id" = NEW."cycle_id"
		AND "cycle"."domain_id" = NEW."domain_id"
		AND "cycle"."organization_id" = NEW."organization_id";
	IF NOT FOUND OR cycle_project_id IS DISTINCT FROM NEW."project_id" THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_EVIDENCE_PROJECT_MISMATCH';
	END IF;
	IF NEW."source_snapshot_id" IS NULL THEN
		RETURN NEW;
	END IF;
	SELECT "snapshot"."capability_id", "snapshot"."project_id"
	INTO linked_capability_id, linked_project_id
	FROM "public"."sv_source_snapshots" AS "snapshot"
	WHERE "snapshot"."id" = NEW."source_snapshot_id"
		AND "snapshot"."organization_id" = NEW."organization_id";
	IF NOT FOUND THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_EVIDENCE_SNAPSHOT_NOT_VISIBLE';
	END IF;
	IF linked_project_id IS NULL OR linked_project_id <> NEW."project_id" THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_EVIDENCE_PROJECT_MISMATCH';
	END IF;
	IF linked_capability_id IS NULL THEN
		RETURN NEW;
	END IF;
	SELECT "capability"."domain" INTO capability_domain
	FROM "public"."sv_provider_dataset_capabilities" AS "capability"
	WHERE "capability"."id" = linked_capability_id
		AND "capability"."organization_id" = NEW."organization_id";
	IF NOT FOUND THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_EVIDENCE_CAPABILITY_NOT_VISIBLE';
	END IF;
	IF NOT (
		capability_domain = NEW."domain_id"
		OR (capability_domain = 'ENTITY' AND NEW."domain_id" IN ('LOCAL', 'LOCAL_MAPS'))
	) THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_EVIDENCE_DOMAIN_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_enforce_evidence_acceptance_receipt"() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
	accepted_graph record;
BEGIN
	SELECT
		"evidence"."captured_at" AS evidence_captured_at,
		"evidence"."domain_id" AS evidence_domain,
		"evidence"."project_id" AS evidence_project_id,
		"cycle"."organization_id" AS cycle_organization_id,
		"cycle"."status" AS cycle_status,
		"lock"."project_id" AS lock_project_id,
		"dataset"."immutable" AS dataset_immutable,
		"snapshot"."project_id" AS snapshot_project_id,
		"snapshot"."captured_at" AS snapshot_captured_at,
		"snapshot"."source_type" AS snapshot_source,
		"snapshot"."environment" AS snapshot_environment,
		"snapshot"."input_schema_version" AS snapshot_input_schema_version,
		"snapshot"."output_schema_version" AS snapshot_output_schema_version,
		"snapshot"."immutable" AS snapshot_immutable,
		"capability"."provider" AS capability_provider,
		"capability"."source" AS capability_source,
		"capability"."domain" AS capability_domain,
		"capability"."input_schema_version" AS capability_input_schema_version,
		"capability"."output_schema_version" AS capability_output_schema_version,
		"capability"."capability_status" AS capability_status,
		"capability"."version" AS capability_version,
		"capability"."immutable" AS capability_immutable,
		EXISTS (
			SELECT 1
			FROM "public"."sv_provider_dataset_snapshot_events" AS "event"
			WHERE "event"."organization_id" = "evidence"."organization_id"
				AND "event"."project_id" = "evidence"."project_id"
				AND "event"."provider" = "capability"."provider"
				AND "event"."source" = "snapshot"."source_type"
				AND "event"."provider_dataset_id" = "snapshot"."provider_dataset_ref"
				AND 'brightdata:snapshot:' || "event"."snapshot_id" = "snapshot"."raw_reference"
				AND "event"."phase" = 'DELIVERED'
				AND "event"."observed_at" >= "snapshot"."captured_at"
		) AS delivered_journal
	INTO accepted_graph
	FROM "public"."sv_evidence_index" AS "evidence"
	INNER JOIN "public"."sv_measurement_cycles" AS "cycle"
		ON "cycle"."id" = "evidence"."cycle_id"
		AND "cycle"."domain_id" = "evidence"."domain_id"
		AND "cycle"."organization_id" = "evidence"."organization_id"
	INNER JOIN "public"."sv_configuration_locks" AS "lock"
		ON "lock"."id" = "cycle"."configuration_lock_id"
		AND "lock"."project_id" = "evidence"."project_id"
		AND "lock"."organization_id" = "evidence"."organization_id"
	INNER JOIN "public"."sv_measurement_datasets" AS "dataset"
		ON "dataset"."id" = "evidence"."dataset_id"
		AND "dataset"."cycle_id" = "evidence"."cycle_id"
		AND "dataset"."organization_id" = "evidence"."organization_id"
	INNER JOIN "public"."sv_source_snapshots" AS "snapshot"
		ON "snapshot"."id" = "evidence"."source_snapshot_id"
		AND "snapshot"."project_id" = "evidence"."project_id"
		AND "snapshot"."organization_id" = "evidence"."organization_id"
	INNER JOIN "public"."sv_provider_dataset_capabilities" AS "capability"
		ON "capability"."id" = "snapshot"."capability_id"
		AND "capability"."organization_id" = "evidence"."organization_id"
	WHERE "evidence"."id" = NEW."evidence_id"
		AND "evidence"."organization_id" = NEW."organization_id";

	IF NOT FOUND THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_GRAPH_NOT_VISIBLE';
	END IF;
	IF accepted_graph.cycle_organization_id <> NEW."organization_id"
		OR accepted_graph.evidence_project_id IS NULL
		OR accepted_graph.evidence_project_id <> accepted_graph.lock_project_id
		OR accepted_graph.evidence_project_id <> accepted_graph.snapshot_project_id THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_SCOPE_MISMATCH';
	END IF;
	IF accepted_graph.delivered_journal IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_DELIVERED_JOURNAL_REQUIRED';
	END IF;
	IF accepted_graph.cycle_status <> 'COMPLETED' THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_CYCLE_NOT_COMPLETE';
	END IF;
	IF accepted_graph.dataset_immutable IS DISTINCT FROM true
		OR accepted_graph.snapshot_immutable IS DISTINCT FROM true
		OR accepted_graph.capability_immutable IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_IMMUTABILITY_REQUIRED';
	END IF;
	IF accepted_graph.snapshot_output_schema_version IS NULL
		OR accepted_graph.capability_output_schema_version IS NULL
		OR accepted_graph.snapshot_output_schema_version <> accepted_graph.capability_output_schema_version
		OR accepted_graph.snapshot_input_schema_version IS NULL
		OR accepted_graph.snapshot_input_schema_version <> accepted_graph.capability_input_schema_version THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_SCHEMA_NOT_APPROVED';
	END IF;
	IF accepted_graph.snapshot_source <> accepted_graph.capability_source THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_SOURCE_MISMATCH';
	END IF;
	IF accepted_graph.capability_domain <> accepted_graph.evidence_domain
		AND NOT (
			accepted_graph.capability_domain = 'ENTITY'
			AND accepted_graph.evidence_domain IN ('LOCAL', 'LOCAL_MAPS')
		) THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_DOMAIN_MISMATCH';
	END IF;
	IF accepted_graph.capability_status NOT IN ('PILOT_ONLY', 'ALLOWED') THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_CAPABILITY_NOT_ALLOWED';
	END IF;
	IF accepted_graph.snapshot_environment NOT IN ('STAGING_ACCEPTANCE', 'PRODUCTION') THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_ENVIRONMENT_NOT_APPROVED';
	END IF;
	IF accepted_graph.evidence_captured_at <> accepted_graph.snapshot_captured_at THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_CAPTURE_TIME_MISMATCH';
	END IF;
	IF NEW."accepted_at" < accepted_graph.evidence_captured_at THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_PRECEDES_CAPTURE';
	END IF;
	IF NEW."accepted_at" > pg_catalog.transaction_timestamp() + interval '5 minutes' THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_TIME_IN_FUTURE';
	END IF;
	IF EXISTS (
		SELECT 1
		FROM "public"."sv_provider_dataset_capabilities" AS "newer_capability"
		WHERE "newer_capability"."organization_id" = NEW."organization_id"
			AND "newer_capability"."provider" = accepted_graph.capability_provider
			AND "newer_capability"."source" = accepted_graph.capability_source
			AND "newer_capability"."version" > accepted_graph.capability_version
			AND "newer_capability"."capability_status" = 'BLOCKED'
	) THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_CAPABILITY_SUPERSEDED_BY_BLOCK';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_enforce_formal_evidence_audit"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE
	formal_graph record;
BEGIN
	IF NEW."event" <> 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'
		OR NEW."subject_kind" <> 'evidence' THEN
		RETURN NEW;
	END IF;
	IF current_user <> session_user OR NOT EXISTS (
		SELECT 1
		FROM pg_catalog.pg_class AS relation
		WHERE relation.oid = 'public.sv_audit_events'::regclass
			AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
	) THEN
		RAISE EXCEPTION 'FORMAL_EVIDENCE_AUDIT_OWNER_SCOPE_REQUIRED';
	END IF;

	SELECT
		"evidence"."id" AS evidence_id,
		"evidence"."organization_id",
		"evidence"."project_id",
		"evidence"."domain_id",
		"evidence"."cycle_id",
		"evidence"."dataset_id",
		"evidence"."source_snapshot_id",
		"evidence"."observation_ref",
		"evidence"."captured_at",
		"dataset"."dataset_key",
		"dataset"."version" AS dataset_version,
		"snapshot"."source_type",
		"snapshot"."output_schema_version",
		"acceptance"."accepted_at"
	INTO formal_graph
	FROM "public"."sv_evidence_index" AS "evidence"
	INNER JOIN "public"."sv_measurement_datasets" AS "dataset"
		ON "dataset"."id" = "evidence"."dataset_id"
		AND "dataset"."cycle_id" = "evidence"."cycle_id"
		AND "dataset"."organization_id" = "evidence"."organization_id"
	INNER JOIN "public"."sv_source_snapshots" AS "snapshot"
		ON "snapshot"."id" = "evidence"."source_snapshot_id"
		AND "snapshot"."project_id" = "evidence"."project_id"
		AND "snapshot"."organization_id" = "evidence"."organization_id"
	INNER JOIN "public"."sv_evidence_acceptance_receipts" AS "acceptance"
		ON "acceptance"."evidence_id" = "evidence"."id"
		AND "acceptance"."organization_id" = "evidence"."organization_id"
	WHERE "evidence"."id"::text = NEW."subject_id"
		AND "evidence"."organization_id" = NEW."organization_id";
	IF NOT FOUND THEN
		RAISE EXCEPTION 'FORMAL_EVIDENCE_AUDIT_RECEIPT_REQUIRED';
	END IF;

	IF jsonb_typeof(NEW."details") <> 'object'
		OR NOT NEW."details" ?& ARRAY[
			'schemaVersion', 'evidenceId', 'organizationId', 'sourceSnapshotId',
			'projectId', 'domainId', 'cycleId', 'datasetId', 'datasetKey',
			'datasetVersion', 'nativeObservationRef', 'source',
			'outputSchemaVersion', 'capturedAt', 'acceptedAt', 'providerCalls',
			'acceptanceProviderCalls', 'recurring', 'privatePayloadRead', 'costRows'
		]
		OR NEW."details"
			- 'schemaVersion' - 'evidenceId' - 'organizationId' - 'sourceSnapshotId'
			- 'projectId' - 'domainId' - 'cycleId' - 'datasetId' - 'datasetKey'
			- 'datasetVersion' - 'nativeObservationRef' - 'source'
			- 'outputSchemaVersion' - 'capturedAt' - 'acceptedAt' - 'providerCalls'
			- 'acceptanceProviderCalls' - 'recurring' - 'privatePayloadRead' - 'costRows'
			<> '{}'::jsonb
		OR NEW."details"->>'schemaVersion' <> 'provider-evidence-acceptance-receipt-v1.3'
		OR NEW."details"->>'evidenceId' <> formal_graph.evidence_id::text
		OR NEW."details"->>'organizationId' <> formal_graph.organization_id
		OR NEW."details"->>'sourceSnapshotId' <> formal_graph.source_snapshot_id::text
		OR NEW."details"->>'projectId' <> formal_graph.project_id::text
		OR NEW."details"->>'domainId' <> formal_graph.domain_id
		OR NEW."details"->>'cycleId' <> formal_graph.cycle_id::text
		OR NEW."details"->>'datasetId' <> formal_graph.dataset_id::text
		OR NEW."details"->>'datasetKey' <> formal_graph.dataset_key
		OR NEW."details"->>'datasetVersion' <> formal_graph.dataset_version::text
		OR NEW."details"->>'nativeObservationRef' <> formal_graph.observation_ref
		OR NEW."details"->>'source' <> formal_graph.source_type
		OR NEW."details"->>'outputSchemaVersion' <> formal_graph.output_schema_version
		OR date_trunc('milliseconds', (NEW."details"->>'capturedAt')::timestamptz)
			<> date_trunc('milliseconds', formal_graph.captured_at)
		OR (NEW."details"->>'acceptedAt')::timestamptz <> formal_graph.accepted_at
		OR NEW."details"->>'providerCalls' <> '0'
		OR NEW."details"->>'acceptanceProviderCalls' <> '0'
		OR NEW."details"->>'recurring' <> 'false'
		OR NEW."details"->>'privatePayloadRead' <> 'false'
		OR NEW."details"->>'costRows' <> '0'
	THEN
		RAISE EXCEPTION 'FORMAL_EVIDENCE_AUDIT_DETAILS_INVALID';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE VIEW "sv_evidence_provenance" WITH (security_invoker = true) AS
	SELECT
		"evidence"."organization_id",
		"evidence"."project_id",
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
		AND "lock"."project_id" = "evidence"."project_id"
		AND "lock"."organization_id" = "evidence"."organization_id"
	INNER JOIN "sv_measurement_datasets" AS "dataset"
		ON "dataset"."id" = "evidence"."dataset_id"
		AND "dataset"."cycle_id" = "evidence"."cycle_id"
		AND "dataset"."organization_id" = "evidence"."organization_id"
	LEFT JOIN "sv_source_snapshots" AS "snapshot"
		ON "snapshot"."id" = "evidence"."source_snapshot_id"
		AND "snapshot"."project_id" = "evidence"."project_id"
		AND "snapshot"."organization_id" = "evidence"."organization_id"
	LEFT JOIN "sv_provider_dataset_capabilities" AS "capability"
		ON "capability"."id" = "snapshot"."capability_id"
		AND "capability"."organization_id" = "evidence"."organization_id";
--> statement-breakpoint
CREATE OR REPLACE VIEW "sv_evidence_read_model" WITH (security_invoker = true) AS
	SELECT
		"evidence"."organization_id",
		"evidence"."project_id",
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
		AND "lock"."project_id" = "evidence"."project_id"
		AND "lock"."organization_id" = "evidence"."organization_id"
	INNER JOIN "sv_measurement_datasets" AS "dataset"
		ON "dataset"."id" = "evidence"."dataset_id"
		AND "dataset"."cycle_id" = "evidence"."cycle_id"
		AND "dataset"."organization_id" = "evidence"."organization_id"
	LEFT JOIN "sv_source_snapshots" AS "snapshot"
		ON "snapshot"."id" = "evidence"."source_snapshot_id"
		AND "snapshot"."project_id" = "evidence"."project_id"
		AND "snapshot"."organization_id" = "evidence"."organization_id"
	LEFT JOIN "sv_provider_dataset_capabilities" AS "capability"
		ON "capability"."id" = "snapshot"."capability_id"
		AND "capability"."organization_id" = "evidence"."organization_id"
	LEFT JOIN "sv_evidence_acceptance_receipts" AS "acceptance"
		ON "acceptance"."evidence_id" = "evidence"."id"
		AND "acceptance"."organization_id" = "evidence"."organization_id";
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		REVOKE SELECT ON "sv_source_snapshots" FROM selena_app;
		GRANT SELECT (
			"id", "organization_id", "project_id", "source_type", "capability_id",
			"input_schema_version", "output_schema_version", "content_sha256_format_valid",
			"captured_at", "immutable", "created_at"
		) ON "sv_source_snapshots" TO selena_app;
	END IF;
END;
$$;
--> statement-breakpoint
COMMENT ON COLUMN "sv_evidence_index"."observation_ref" IS
	'Provider-native observation reference. Formal identity also includes organization, project, domain, cycle, dataset and source snapshot.';
--> statement-breakpoint
COMMENT ON COLUMN "sv_source_snapshots"."project_id" IS
	'Project provenance derived from one unambiguous DELIVERED provider snapshot journal binding. NULL legacy rows remain ineligible for formal acceptance.';
