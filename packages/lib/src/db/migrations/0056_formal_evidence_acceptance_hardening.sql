DO $$
BEGIN
	IF current_user <> session_user
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_roles
			WHERE rolname = current_user
				AND (rolsuper OR rolbypassrls)
		)
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_class AS relation
			WHERE relation.oid IN (
				'public.sv_evidence_acceptance_receipts'::regclass,
				'public.sv_audit_events'::regclass
			)
				AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
			HAVING count(*) = 2
		) THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_MIGRATION_OWNER_BYPASS_REQUIRED';
	END IF;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "sv_enforce_provider_capability_insert_scope"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	IF current_user = session_user AND EXISTS (
		SELECT 1
		FROM pg_catalog.pg_class AS relation
		WHERE relation.oid = 'public.sv_provider_dataset_capabilities'::regclass
			AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
	) THEN
		RETURN NEW;
	END IF;
	IF NEW."capability_status" <> 'CANARY_ONLY'
		OR NEW."output_schema_version" IS NOT NULL THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_CAPABILITY_PROMOTION_OWNER_SCOPE_REQUIRED';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_provider_dataset_capabilities_owner_insert_guard"
	BEFORE INSERT ON "sv_provider_dataset_capabilities"
	FOR EACH ROW EXECUTE FUNCTION "sv_enforce_provider_capability_insert_scope"();
--> statement-breakpoint
CREATE FUNCTION "sv_restrict_runtime_source_snapshot_promotion"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	IF NEW."output_schema_version" IS NOT NULL
		AND NOT (
			current_user = session_user
			AND EXISTS (
			SELECT 1
			FROM pg_catalog.pg_class AS relation
			WHERE relation.oid = 'public.sv_source_snapshots'::regclass
				AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
			)
		) THEN
		RAISE EXCEPTION 'SOURCE_SNAPSHOT_SCHEMA_PROMOTION_OWNER_SCOPE_REQUIRED';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_source_snapshots_runtime_promotion_guard"
	BEFORE INSERT ON "sv_source_snapshots"
	FOR EACH ROW EXECUTE FUNCTION "sv_restrict_runtime_source_snapshot_promotion"();
--> statement-breakpoint
CREATE FUNCTION "sv_require_owner_evidence_acceptance_insert"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	IF current_user <> session_user OR NOT EXISTS (
		SELECT 1
		FROM pg_catalog.pg_class AS relation
		WHERE relation.oid = 'public.sv_evidence_acceptance_receipts'::regclass
			AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
	) THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_OWNER_SCOPE_REQUIRED';
	END IF;
	IF NEW."accepted_by" <> 'database-role:' || current_user THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_IDENTITY_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_evidence_acceptance_receipts_owner_guard"
	BEFORE INSERT ON "sv_evidence_acceptance_receipts"
	FOR EACH ROW EXECUTE FUNCTION "sv_require_owner_evidence_acceptance_insert"();
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "public"."sv_evidence_acceptance_receipts")
		OR EXISTS (
			SELECT 1
			FROM "public"."sv_audit_events"
			WHERE "event" = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'
				AND "subject_kind" = 'evidence'
		) THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_LEGACY_REVIEW_REQUIRED';
	END IF;
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
		"cycle"."organization_id" AS cycle_organization_id,
		"cycle"."status" AS cycle_status,
		"lock"."project_id" AS project_id,
		"dataset"."immutable" AS dataset_immutable,
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
		"capability"."immutable" AS capability_immutable
	INTO accepted_graph
	FROM "public"."sv_evidence_index" AS "evidence"
	INNER JOIN "public"."sv_measurement_cycles" AS "cycle"
		ON "cycle"."id" = "evidence"."cycle_id"
		AND "cycle"."domain_id" = "evidence"."domain_id"
		AND "cycle"."organization_id" = "evidence"."organization_id"
	INNER JOIN "public"."sv_configuration_locks" AS "lock"
		ON "lock"."id" = "cycle"."configuration_lock_id"
		AND "lock"."organization_id" = "evidence"."organization_id"
	INNER JOIN "public"."sv_measurement_datasets" AS "dataset"
		ON "dataset"."id" = "evidence"."dataset_id"
		AND "dataset"."cycle_id" = "evidence"."cycle_id"
		AND "dataset"."organization_id" = "evidence"."organization_id"
	INNER JOIN "public"."sv_source_snapshots" AS "snapshot"
		ON "snapshot"."id" = "evidence"."source_snapshot_id"
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
		OR accepted_graph.project_id IS NULL THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_SCOPE_MISMATCH';
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
	IF accepted_graph.snapshot_environment = 'ISOLATED_CANARY' THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_CANARY_FORBIDDEN';
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
REVOKE ALL ON FUNCTION "sv_enforce_evidence_acceptance_receipt"() FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION "sv_require_formal_evidence_audit_pair"() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM "public"."sv_audit_events" AS "audit"
		WHERE "audit"."organization_id" = NEW."organization_id"
			AND "audit"."event" = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'
			AND "audit"."subject_kind" = 'evidence'
			AND "audit"."subject_id" = NEW."evidence_id"::text
	) THEN
		RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_AUDIT_REQUIRED';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_require_formal_evidence_audit_pair"() FROM PUBLIC;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "sv_evidence_acceptance_receipts_audit_pair_guard"
	AFTER INSERT ON "sv_evidence_acceptance_receipts"
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW EXECUTE FUNCTION "sv_require_formal_evidence_audit_pair"();
--> statement-breakpoint
CREATE FUNCTION "sv_require_formal_evidence_receipt_pair"() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
	IF NEW."event" = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'
		AND NEW."subject_kind" = 'evidence'
		AND NOT EXISTS (
			SELECT 1
			FROM "public"."sv_evidence_acceptance_receipts" AS "acceptance"
			WHERE "acceptance"."organization_id" = NEW."organization_id"
				AND "acceptance"."evidence_id"::text = NEW."subject_id"
		) THEN
		RAISE EXCEPTION 'FORMAL_EVIDENCE_AUDIT_RECEIPT_REQUIRED';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_require_formal_evidence_receipt_pair"() FROM PUBLIC;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "sv_audit_events_formal_evidence_receipt_pair_guard"
	AFTER INSERT ON "sv_audit_events"
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW EXECUTE FUNCTION "sv_require_formal_evidence_receipt_pair"();
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_audit_events_formal_evidence_acceptance_unique"
	ON "sv_audit_events" ("organization_id", "event", "subject_kind", "subject_id")
	WHERE "event" = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED' AND "subject_kind" = 'evidence';
--> statement-breakpoint
CREATE FUNCTION "sv_enforce_formal_evidence_audit"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	IF NEW."event" = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'
		AND NEW."subject_kind" = 'evidence'
		AND (
			current_user <> session_user
			OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_class AS relation
			WHERE relation.oid = 'public.sv_audit_events'::regclass
				AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
			)
		) THEN
		RAISE EXCEPTION 'FORMAL_EVIDENCE_AUDIT_OWNER_SCOPE_REQUIRED';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_audit_events_formal_evidence_owner_guard"
	BEFORE INSERT OR UPDATE ON "sv_audit_events"
	FOR EACH ROW EXECUTE FUNCTION "sv_enforce_formal_evidence_audit"();
--> statement-breakpoint
CREATE FUNCTION "sv_reject_formal_evidence_audit_mutation"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	IF (
		OLD."event" = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'
		AND OLD."subject_kind" = 'evidence'
	) OR (
		TG_OP = 'UPDATE'
		AND NEW."event" = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'
		AND NEW."subject_kind" = 'evidence'
	) THEN
		RAISE EXCEPTION 'FORMAL_EVIDENCE_AUDIT_IMMUTABLE';
	END IF;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_audit_events_formal_evidence_immutable_guard"
	BEFORE UPDATE OR DELETE ON "sv_audit_events"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_formal_evidence_audit_mutation"();
--> statement-breakpoint
CREATE FUNCTION "sv_reject_formal_evidence_audit_truncate"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	RAISE EXCEPTION 'FORMAL_EVIDENCE_AUDIT_IMMUTABLE';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_audit_events_formal_evidence_truncate_guard"
	BEFORE TRUNCATE ON "sv_audit_events"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_reject_formal_evidence_audit_truncate"();
--> statement-breakpoint
CREATE FUNCTION "sv_reject_accepted_evidence_dependency_mutation"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
	IF TG_TABLE_NAME = 'sv_measurement_cycles' AND EXISTS (
		SELECT 1
		FROM "public"."sv_evidence_index" AS "evidence"
		INNER JOIN "public"."sv_evidence_acceptance_receipts" AS "acceptance"
			ON "acceptance"."evidence_id" = "evidence"."id"
			AND "acceptance"."organization_id" = "evidence"."organization_id"
		WHERE "evidence"."organization_id" = OLD."organization_id"
			AND "evidence"."cycle_id" = OLD."id"
	) THEN
		RAISE EXCEPTION 'ACCEPTED_EVIDENCE_CYCLE_IMMUTABLE';
	END IF;
	IF TG_TABLE_NAME = 'sv_measurement_datasets' AND EXISTS (
		SELECT 1
		FROM "public"."sv_evidence_index" AS "evidence"
		INNER JOIN "public"."sv_evidence_acceptance_receipts" AS "acceptance"
			ON "acceptance"."evidence_id" = "evidence"."id"
			AND "acceptance"."organization_id" = "evidence"."organization_id"
		WHERE "evidence"."organization_id" = OLD."organization_id"
			AND "evidence"."dataset_id" = OLD."id"
	) THEN
		RAISE EXCEPTION 'ACCEPTED_EVIDENCE_DATASET_IMMUTABLE';
	END IF;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_measurement_cycles_accepted_evidence_guard"
	BEFORE UPDATE OR DELETE ON "sv_measurement_cycles"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_accepted_evidence_dependency_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_measurement_datasets_accepted_evidence_guard"
	BEFORE UPDATE OR DELETE ON "sv_measurement_datasets"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_accepted_evidence_dependency_mutation"();
