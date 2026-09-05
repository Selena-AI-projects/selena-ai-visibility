DO $migration_owner$
BEGIN
	IF current_user <> session_user
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_roles AS role
			WHERE role.rolname = current_user
				AND (role.rolsuper OR role.rolbypassrls)
		)
		OR (
			SELECT pg_catalog.count(*)
			FROM pg_catalog.pg_class AS relation
			WHERE relation.oid IN (
				'public.sv_journal_daily_claims'::pg_catalog.regclass,
				'public.sv_projects'::pg_catalog.regclass,
				'public.sv_configuration_locks'::pg_catalog.regclass,
				'public.sv_cycles'::pg_catalog.regclass,
				'public.sv_run_permits'::pg_catalog.regclass,
				'public.sv_runs'::pg_catalog.regclass,
				'public.sv_cost_events'::pg_catalog.regclass,
				'public.sv_provider_dataset_snapshot_events'::pg_catalog.regclass,
				'public.sv_response_mentions'::pg_catalog.regclass,
				'public.sv_citation_gap_snapshots'::pg_catalog.regclass
			)
				AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
		) <> 10
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_proc AS routine
			WHERE routine.oid = 'public.sv_guard_journal_daily_claim_mutation()'::pg_catalog.regprocedure
				AND pg_catalog.pg_get_userbyid(routine.proowner) = current_user
		)
	THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_MIGRATION_OWNER_BYPASS_REQUIRED';
	END IF;
END;
$migration_owner$;
--> statement-breakpoint
CREATE TABLE "public"."sv_journal_no_spend_reconciliations" (
	"reconciliation_id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"schema_version" integer NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"configuration_lock_id" uuid NOT NULL,
	"cycle_ids" uuid[] NOT NULL,
	"permit_ids" uuid[] NOT NULL,
	"run_ids" uuid[] NOT NULL,
	"run_execution_scope" jsonb NOT NULL,
	"provider" text NOT NULL,
	"provider_account_scope_sha256" text NOT NULL,
	"provider_dataset_resource_ids" text[] NOT NULL,
	"evidence_window_start" timestamptz NOT NULL,
	"evidence_window_end" timestamptz NOT NULL,
	"execution_quiesced_at" timestamptz NOT NULL,
	"billing_final_at" timestamptz NOT NULL,
	"accepted_provider_object_count" integer NOT NULL,
	"billed_provider_object_count" integer NOT NULL,
	"billed_amount_usd" numeric(12, 6) NOT NULL,
	"source_artifact_reference" text NOT NULL,
	"source_artifact_sha256" text NOT NULL,
	"prior_claim_status" text NOT NULL,
	"current_claim_status" text NOT NULL,
	"reconciled_at" timestamptz NOT NULL,
	"reconciled_by" text NOT NULL,
	"certificate_sha256" text NOT NULL,
	CONSTRAINT "sv_journal_no_spend_reconciliations_claim_unique" UNIQUE ("claim_id"),
	CONSTRAINT "sv_journal_no_spend_reconciliations_lock_unique" UNIQUE ("configuration_lock_id"),
	CONSTRAINT "sv_journal_no_spend_reconciliations_claim_fk"
		FOREIGN KEY ("claim_id")
		REFERENCES "public"."sv_journal_daily_claims"("id"),
	CONSTRAINT "sv_journal_no_spend_reconciliations_project_org_fk"
		FOREIGN KEY ("project_id", "organization_id")
		REFERENCES "public"."sv_projects"("id", "organization_id"),
	CONSTRAINT "sv_journal_no_spend_reconciliations_lock_project_org_fk"
		FOREIGN KEY ("configuration_lock_id", "project_id", "organization_id")
		REFERENCES "public"."sv_configuration_locks"("id", "project_id", "organization_id"),
	CONSTRAINT "sv_journal_no_spend_reconciliations_sets_check" CHECK (
		pg_catalog.cardinality("cycle_ids") > 0
		AND pg_catalog.cardinality("provider_dataset_resource_ids") > 0
		AND pg_catalog.array_position("cycle_ids", NULL) IS NULL
		AND pg_catalog.array_position("permit_ids", NULL) IS NULL
		AND pg_catalog.array_position("run_ids", NULL) IS NULL
		AND pg_catalog.array_position("provider_dataset_resource_ids", NULL) IS NULL
		AND (
			-- zero-consumption certificate: an empty run set is only valid
			-- alongside an empty permit set and an empty execution scope
			-- (no execution consumed anything).
			(
				pg_catalog.cardinality("run_ids") = 0
				AND pg_catalog.cardinality("permit_ids") = 0
				AND pg_catalog.jsonb_typeof("run_execution_scope") = 'array'
				AND pg_catalog.jsonb_array_length("run_execution_scope") = 0
			)
			OR (
				pg_catalog.cardinality("run_ids") > 0
				AND pg_catalog.cardinality("permit_ids") > 0
				AND pg_catalog.jsonb_typeof("run_execution_scope") = 'array'
				AND pg_catalog.jsonb_array_length("run_execution_scope") = pg_catalog.cardinality("run_ids")
			)
		)
	),
	CONSTRAINT "sv_journal_no_spend_reconciliations_identity_check" CHECK (
		"schema_version" = 1
		AND "provider" = 'BRIGHT_DATA'
		AND "provider_account_scope_sha256" ~ '^sha256:[a-f0-9]{64}$'
		AND "source_artifact_reference" = pg_catalog.btrim("source_artifact_reference")
		AND pg_catalog.length("source_artifact_reference") > 0
		AND "source_artifact_sha256" ~ '^sha256:[a-f0-9]{64}$'
		AND "prior_claim_status" = 'HOLD'
		AND "current_claim_status" = 'NO_SPEND'
		AND "reconciled_by" = pg_catalog.btrim("reconciled_by")
		AND pg_catalog.length("reconciled_by") > 14
		AND "certificate_sha256" ~ '^sha256:[a-f0-9]{64}$'
	),
	CONSTRAINT "sv_journal_no_spend_reconciliations_zero_result_check" CHECK (
		"accepted_provider_object_count" = 0
		AND "billed_provider_object_count" = 0
		AND "billed_amount_usd" = 0
	),
	CONSTRAINT "sv_journal_no_spend_reconciliations_time_check" CHECK (
		"evidence_window_start" <= "execution_quiesced_at"
		AND "execution_quiesced_at" <= "evidence_window_end"
		AND "evidence_window_end" <= "billing_final_at"
		AND "billing_final_at" <= "reconciled_at"
	)
);
--> statement-breakpoint
ALTER TABLE "public"."sv_journal_no_spend_reconciliations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."sv_journal_no_spend_reconciliations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "public"."sv_journal_no_spend_reconciliations" FROM PUBLIC;
--> statement-breakpoint
DO $revoke_runtime_table$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app') THEN
		EXECUTE 'REVOKE ALL ON TABLE "public"."sv_journal_no_spend_reconciliations" FROM selena_app';
	END IF;
END;
$revoke_runtime_table$;
--> statement-breakpoint
CREATE FUNCTION "public"."sv_guard_journal_no_spend_reconciliation_insert"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $guard$
DECLARE
	canonical_cycle_ids uuid[];
	canonical_permit_ids uuid[];
	canonical_run_ids uuid[];
	canonical_resource_ids text[];
	scope_run_ids uuid[];
	canonical_certificate jsonb;
BEGIN
	IF current_user <> session_user
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_roles AS role
			WHERE role.rolname = current_user
				AND (role.rolsuper OR role.rolbypassrls)
		)
		OR (
			SELECT pg_catalog.count(*)
			FROM pg_catalog.pg_class AS relation
			WHERE relation.oid IN (
				'public.sv_journal_no_spend_reconciliations'::pg_catalog.regclass,
				'public.sv_journal_daily_claims'::pg_catalog.regclass,
				'public.sv_projects'::pg_catalog.regclass,
				'public.sv_configuration_locks'::pg_catalog.regclass,
				'public.sv_cycles'::pg_catalog.regclass,
				'public.sv_run_permits'::pg_catalog.regclass,
				'public.sv_runs'::pg_catalog.regclass,
				'public.sv_cost_events'::pg_catalog.regclass,
				'public.sv_provider_dataset_snapshot_events'::pg_catalog.regclass,
				'public.sv_response_mentions'::pg_catalog.regclass,
				'public.sv_citation_gap_snapshots'::pg_catalog.regclass
			)
				AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
		) <> 11
	THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_OWNER_SCOPE_REQUIRED';
	END IF;

	IF NEW."reconciled_by" <> 'database-role:' || session_user THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILER_IDENTITY_MISMATCH';
	END IF;

	SELECT coalesce(pg_catalog.array_agg(value ORDER BY value), ARRAY[]::uuid[])
	INTO canonical_cycle_ids
	FROM (SELECT DISTINCT value FROM pg_catalog.unnest(NEW."cycle_ids") AS item(value)) AS valueset;
	SELECT coalesce(pg_catalog.array_agg(value ORDER BY value), ARRAY[]::uuid[])
	INTO canonical_permit_ids
	FROM (SELECT DISTINCT value FROM pg_catalog.unnest(NEW."permit_ids") AS item(value)) AS valueset;
	SELECT coalesce(pg_catalog.array_agg(value ORDER BY value), ARRAY[]::uuid[])
	INTO canonical_run_ids
	FROM (SELECT DISTINCT value FROM pg_catalog.unnest(NEW."run_ids") AS item(value)) AS valueset;
	SELECT coalesce(pg_catalog.array_agg(value ORDER BY value COLLATE "pg_catalog"."C"), ARRAY[]::text[])
	INTO canonical_resource_ids
	FROM (
		SELECT DISTINCT value COLLATE "pg_catalog"."C" AS value
		FROM pg_catalog.unnest(NEW."provider_dataset_resource_ids") AS item(value)
	) AS valueset;

	IF NEW."cycle_ids" IS DISTINCT FROM canonical_cycle_ids
		OR NEW."permit_ids" IS DISTINCT FROM canonical_permit_ids
		OR NEW."run_ids" IS DISTINCT FROM canonical_run_ids
		OR NEW."provider_dataset_resource_ids" IS DISTINCT FROM canonical_resource_ids
		OR EXISTS (
			SELECT 1
			FROM pg_catalog.unnest(NEW."provider_dataset_resource_ids") AS item(value)
			WHERE value IS NULL
				OR value <> pg_catalog.btrim(value)
				OR pg_catalog.length(value) = 0
		)
	THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CERTIFICATE_SET_NOT_CANONICAL';
	END IF;

	IF pg_catalog.jsonb_typeof(NEW."run_execution_scope") <> 'array'
		OR EXISTS (
			SELECT 1
			FROM pg_catalog.jsonb_array_elements(NEW."run_execution_scope") AS scope(value)
			WHERE pg_catalog.jsonb_typeof(value) <> 'object'
				OR NOT value ?& ARRAY[
					'run_id', 'permit_id', 'cycle_id', 'dispatch_key', 'channel', 'scenario_id', 'system_id'
				]
				OR CASE
					WHEN pg_catalog.jsonb_typeof(value) = 'object' THEN (
						SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(value)
					) <> 7
					ELSE false
				END
				OR value->>'run_id' IS NULL
				OR value->>'permit_id' IS NULL
				OR value->>'cycle_id' IS NULL
				OR value->>'dispatch_key' IS NULL
				OR value->>'dispatch_key' <> pg_catalog.btrim(value->>'dispatch_key')
				OR pg_catalog.length(value->>'dispatch_key') = 0
				OR value->>'channel' IS NULL
				OR value->>'channel' <> pg_catalog.btrim(value->>'channel')
				OR pg_catalog.length(value->>'channel') = 0
				OR value->>'scenario_id' IS NULL
				OR value->>'scenario_id' <> pg_catalog.btrim(value->>'scenario_id')
				OR pg_catalog.length(value->>'scenario_id') = 0
				OR (
					value->>'system_id' IS NOT NULL
					AND (
						value->>'system_id' <> pg_catalog.btrim(value->>'system_id')
						OR pg_catalog.length(value->>'system_id') = 0
					)
				)
		)
	THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CERTIFICATE_RUN_SCOPE_INVALID';
	END IF;

	SELECT coalesce(
		pg_catalog.array_agg((scope.value->>'run_id')::uuid ORDER BY scope.ordinality),
		ARRAY[]::uuid[]
	)
	INTO scope_run_ids
	FROM pg_catalog.jsonb_array_elements(NEW."run_execution_scope")
		WITH ORDINALITY AS scope(value, ordinality);
	IF scope_run_ids IS DISTINCT FROM NEW."run_ids" THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CERTIFICATE_RUN_SCOPE_MISMATCH';
	END IF;

	canonical_certificate := pg_catalog.jsonb_build_object(
		'schema_version', NEW."schema_version",
		'organization_id', NEW."organization_id",
		'project_id', NEW."project_id",
		'claim_id', NEW."claim_id",
		'configuration_lock_id', NEW."configuration_lock_id",
		'cycle_ids', pg_catalog.to_jsonb(NEW."cycle_ids"),
		'permit_ids', pg_catalog.to_jsonb(NEW."permit_ids"),
		'run_ids', pg_catalog.to_jsonb(NEW."run_ids"),
		'run_execution_scope', NEW."run_execution_scope",
		'provider', NEW."provider",
		'provider_account_scope_sha256', NEW."provider_account_scope_sha256",
		'provider_dataset_resource_ids', pg_catalog.to_jsonb(NEW."provider_dataset_resource_ids"),
		'evidence_window_start', pg_catalog.to_char(
			NEW."evidence_window_start" AT TIME ZONE 'UTC',
			'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
		),
		'evidence_window_end', pg_catalog.to_char(
			NEW."evidence_window_end" AT TIME ZONE 'UTC',
			'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
		),
		'execution_quiesced_at', pg_catalog.to_char(
			NEW."execution_quiesced_at" AT TIME ZONE 'UTC',
			'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
		),
		'billing_final_at', pg_catalog.to_char(
			NEW."billing_final_at" AT TIME ZONE 'UTC',
			'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
		),
		'accepted_provider_object_count', NEW."accepted_provider_object_count",
		'billed_provider_object_count', NEW."billed_provider_object_count",
		'billed_amount_usd', NEW."billed_amount_usd",
		'source_artifact_reference', NEW."source_artifact_reference",
		'source_artifact_sha256', NEW."source_artifact_sha256",
		'prior_claim_status', NEW."prior_claim_status",
		'current_claim_status', NEW."current_claim_status",
		'reconciled_at', pg_catalog.to_char(
			NEW."reconciled_at" AT TIME ZONE 'UTC',
			'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
		),
		'reconciled_by', NEW."reconciled_by"
	);
	NEW."certificate_sha256" := 'sha256:' || pg_catalog.encode(
		pg_catalog.sha256(pg_catalog.convert_to(canonical_certificate::text, 'UTF8')),
		'hex'
	);
	RETURN NEW;
END;
$guard$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_guard_journal_no_spend_reconciliation_insert"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "sv_journal_no_spend_reconciliations_owner_insert_guard"
	BEFORE INSERT ON "public"."sv_journal_no_spend_reconciliations"
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_guard_journal_no_spend_reconciliation_insert"();
--> statement-breakpoint
CREATE FUNCTION "public"."sv_reject_journal_no_spend_reconciliation_mutation"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $immutable$
BEGIN
	RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILIATION_IMMUTABLE';
END;
$immutable$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_reconciliation_mutation"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "sv_journal_no_spend_reconciliations_immutable_guard"
	BEFORE UPDATE OR DELETE ON "public"."sv_journal_no_spend_reconciliations"
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_reconciliation_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_journal_no_spend_reconciliations_truncate_guard"
	BEFORE TRUNCATE ON "public"."sv_journal_no_spend_reconciliations"
	FOR EACH STATEMENT EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_reconciliation_mutation"();
--> statement-breakpoint
CREATE FUNCTION "public"."sv_require_journal_no_spend_claim_pair"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $pair$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM "public"."sv_journal_daily_claims" AS claim
		WHERE claim."id" = NEW."claim_id"
			AND claim."organization_id" = NEW."organization_id"
			AND claim."project_id" = NEW."project_id"
			AND claim."configuration_lock_id" = NEW."configuration_lock_id"
			AND claim."status" = 'NO_SPEND'
			AND claim."completed_at" IS NULL
			AND claim."abandoned_at" IS NULL
			AND claim."updated_at" = NEW."reconciled_at"
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CLAIM_PAIR_REQUIRED';
	END IF;
	RETURN NEW;
END;
$pair$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_require_journal_no_spend_claim_pair"() FROM PUBLIC;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "sv_journal_no_spend_reconciliations_claim_pair_guard"
	AFTER INSERT ON "public"."sv_journal_no_spend_reconciliations"
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_require_journal_no_spend_claim_pair"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."sv_guard_journal_daily_claim_mutation"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $claim_guard$
DECLARE
	recovery_state text;
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" <> 'CLAIMED'
			OR NEW."configuration_lock_id" IS NOT NULL
			OR NEW."completed_at" IS NOT NULL
			OR NEW."abandoned_at" IS NOT NULL
			OR NEW."claimed_at" > clock_timestamp()
			OR NEW."updated_at" < NEW."claimed_at"
		THEN
			RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_INITIAL_STATE_BLOCKED';
		END IF;
		RETURN NEW;
	END IF;

	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_DELETE_BLOCKED';
	END IF;

	IF OLD."id" IS DISTINCT FROM NEW."id"
		OR OLD."organization_id" IS DISTINCT FROM NEW."organization_id"
		OR OLD."project_id" IS DISTINCT FROM NEW."project_id"
		OR OLD."question_set_version" IS DISTINCT FROM NEW."question_set_version"
		OR OLD."utc_day" IS DISTINCT FROM NEW."utc_day"
		OR OLD."attempt" IS DISTINCT FROM NEW."attempt"
		OR OLD."claimed_at" IS DISTINCT FROM NEW."claimed_at"
		OR (OLD."configuration_lock_id" IS NOT NULL AND OLD."configuration_lock_id" IS DISTINCT FROM NEW."configuration_lock_id")
	THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_IDENTITY_MUTATION_BLOCKED';
	END IF;

	IF NEW."configuration_lock_id" IS NOT NULL AND NOT EXISTS (
		SELECT 1
		FROM "public"."sv_configuration_locks" AS configuration_lock
		WHERE configuration_lock."id" = NEW."configuration_lock_id"
			AND configuration_lock."project_id" = NEW."project_id"
			AND configuration_lock."organization_id" = NEW."organization_id"
			AND configuration_lock."snapshot"#>>'{journalClaim,id}' = NEW."id"::text
			AND configuration_lock."snapshot"#>>'{journalClaim,utcDay}' = NEW."utc_day"::text
			AND configuration_lock."snapshot"#>>'{journalClaim,attempt}' = NEW."attempt"::text
	) THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_LOCK_PROVENANCE_MISMATCH';
	END IF;

	IF OLD."status" = 'EXECUTING' AND NEW."status" = 'ABANDONED' THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTING_ABANDONMENT_BLOCKED';
	END IF;
	IF (OLD."status" = 'CLAIMED' AND NEW."status" IN ('NO_SPEND', 'ABANDONED'))
		OR (OLD."status" IN ('CLAIMED', 'EXECUTING') AND NEW."status" = 'COMPLETED')
	THEN
		recovery_state := "public"."sv_journal_claim_recovery_state"(OLD."id");
	END IF;
	IF OLD."status" = 'CLAIMED' AND NEW."status" IN ('NO_SPEND', 'ABANDONED')
		AND recovery_state <> 'NO_SPEND'
	THEN
		RAISE EXCEPTION 'JOURNAL_CLAIM_NO_SPEND_PROOF_REQUIRED';
	END IF;
	IF OLD."status" = 'CLAIMED' AND NEW."status" = 'ABANDONED'
		AND OLD."updated_at" > clock_timestamp() - interval '45 minutes'
	THEN
		RAISE EXCEPTION 'JOURNAL_CLAIM_LEASE_ACTIVE';
	END IF;
	IF OLD."status" IN ('CLAIMED', 'EXECUTING') AND NEW."status" = 'COMPLETED'
		AND recovery_state <> 'TERMINAL_COMPLETED'
	THEN
		RAISE EXCEPTION 'JOURNAL_CLAIM_TERMINAL_PROOF_REQUIRED';
	END IF;

	-- 0059: the single owner-only exit from HOLD. 0058 leaves a HOLD terminal and
	-- blocks every transition out of it. The owner certificate (a matched
	-- sv_journal_no_spend_reconciliations row written by
	-- sv_owner_reconcile_journal_no_spend) is the sole key that may open it into
	-- NO_SPEND. Everything else about the claim lifecycle is unchanged.
	IF OLD."status" = 'HOLD' AND NEW."status" = 'NO_SPEND' THEN
		IF NEW."configuration_lock_id" IS NULL
			OR NEW."completed_at" IS NOT NULL
			OR NEW."abandoned_at" IS NOT NULL
			OR NOT EXISTS (
				SELECT 1
				FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
				WHERE reconciliation."claim_id" = NEW."id"
					AND reconciliation."organization_id" = NEW."organization_id"
					AND reconciliation."project_id" = NEW."project_id"
					AND reconciliation."configuration_lock_id" = NEW."configuration_lock_id"
					AND reconciliation."prior_claim_status" = 'HOLD'
					AND reconciliation."current_claim_status" = 'NO_SPEND'
					AND reconciliation."reconciled_at" = NEW."updated_at"
			)
		THEN
			RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_NO_SPEND_CERTIFICATE_REQUIRED';
		END IF;
		RETURN NEW;
	END IF;

	IF NEW."updated_at" < OLD."updated_at"
		OR (OLD."status" = 'CLAIMED' AND NEW."status" NOT IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD', 'ABANDONED', 'COMPLETED'))
		OR (OLD."status" = 'EXECUTING' AND NEW."status" NOT IN ('EXECUTING', 'HOLD', 'COMPLETED'))
		OR OLD."status" IN ('NO_SPEND', 'HOLD', 'COMPLETED', 'ABANDONED')
	THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED';
	END IF;
	RETURN NEW;
END;
$claim_guard$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_guard_journal_daily_claim_mutation"() FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION "public"."sv_reject_journal_no_spend_dependency_mutation"() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $dependency$
BEGIN
	IF TG_TABLE_NAME = 'sv_cycles' THEN
		IF TG_OP IN ('UPDATE', 'DELETE') AND EXISTS (
			SELECT 1
			FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
			WHERE reconciliation."configuration_lock_id" = OLD."lock_id"
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
		IF TG_OP IN ('INSERT', 'UPDATE') AND EXISTS (
			SELECT 1
			FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
			WHERE reconciliation."configuration_lock_id" = NEW."lock_id"
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
	ELSIF TG_TABLE_NAME = 'sv_run_permits' THEN
		IF TG_OP IN ('UPDATE', 'DELETE') AND EXISTS (
			SELECT 1
			FROM "public"."sv_cycles" AS cycle
			INNER JOIN "public"."sv_journal_no_spend_reconciliations" AS reconciliation
				ON reconciliation."configuration_lock_id" = cycle."lock_id"
			WHERE cycle."id" = OLD."cycle_id"
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
		IF TG_OP IN ('INSERT', 'UPDATE') AND EXISTS (
			SELECT 1
			FROM "public"."sv_cycles" AS cycle
			INNER JOIN "public"."sv_journal_no_spend_reconciliations" AS reconciliation
				ON reconciliation."configuration_lock_id" = cycle."lock_id"
			WHERE cycle."id" = NEW."cycle_id"
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
	ELSIF TG_TABLE_NAME = 'sv_runs' THEN
		IF TG_OP IN ('UPDATE', 'DELETE') AND (
			EXISTS (
				SELECT 1
				FROM "public"."sv_cycles" AS cycle
				INNER JOIN "public"."sv_journal_no_spend_reconciliations" AS reconciliation
					ON reconciliation."configuration_lock_id" = cycle."lock_id"
				WHERE cycle."id" = OLD."cycle_id"
			) OR EXISTS (
				SELECT 1
				FROM "public"."sv_run_permits" AS permit
				INNER JOIN "public"."sv_cycles" AS cycle ON cycle."id" = permit."cycle_id"
				INNER JOIN "public"."sv_journal_no_spend_reconciliations" AS reconciliation
					ON reconciliation."configuration_lock_id" = cycle."lock_id"
				WHERE permit."id" = OLD."permit_id"
			)
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
		IF TG_OP IN ('INSERT', 'UPDATE') AND (
			EXISTS (
				SELECT 1
				FROM "public"."sv_cycles" AS cycle
				INNER JOIN "public"."sv_journal_no_spend_reconciliations" AS reconciliation
					ON reconciliation."configuration_lock_id" = cycle."lock_id"
				WHERE cycle."id" = NEW."cycle_id"
			) OR EXISTS (
				SELECT 1
				FROM "public"."sv_run_permits" AS permit
				INNER JOIN "public"."sv_cycles" AS cycle ON cycle."id" = permit."cycle_id"
				INNER JOIN "public"."sv_journal_no_spend_reconciliations" AS reconciliation
					ON reconciliation."configuration_lock_id" = cycle."lock_id"
				WHERE permit."id" = NEW."permit_id"
			)
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
	END IF;

	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$dependency$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_dependency_mutation"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "sv_cycles_journal_no_spend_dependency_guard"
	BEFORE INSERT OR UPDATE OR DELETE ON "public"."sv_cycles"
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_dependency_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_run_permits_journal_no_spend_dependency_guard"
	BEFORE INSERT OR UPDATE OR DELETE ON "public"."sv_run_permits"
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_dependency_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_runs_journal_no_spend_dependency_guard"
	BEFORE INSERT OR UPDATE OR DELETE ON "public"."sv_runs"
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_dependency_mutation"();
--> statement-breakpoint
CREATE FUNCTION "public"."sv_reject_journal_no_spend_cost_insert"() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $cost$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "public"."sv_cycles" AS cycle
		INNER JOIN "public"."sv_journal_no_spend_reconciliations" AS reconciliation
			ON reconciliation."configuration_lock_id" = cycle."lock_id"
		WHERE cycle."id" = NEW."cycle_id"
	) OR EXISTS (
		SELECT 1
		FROM "public"."sv_runs" AS run
		INNER JOIN "public"."sv_cycles" AS cycle ON cycle."id" = run."cycle_id"
		INNER JOIN "public"."sv_journal_no_spend_reconciliations" AS reconciliation
			ON reconciliation."configuration_lock_id" = cycle."lock_id"
		WHERE run."id" = NEW."run_id"
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
	END IF;
	RETURN NEW;
END;
$cost$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_cost_insert"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "sv_cost_events_journal_no_spend_dependency_guard"
	BEFORE INSERT ON "public"."sv_cost_events"
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_cost_insert"();
--> statement-breakpoint
CREATE FUNCTION "public"."sv_reject_journal_no_spend_outcome_mutation"() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $outcome$
BEGIN
	IF TG_TABLE_NAME = 'sv_response_mentions' THEN
		IF TG_OP IN ('UPDATE', 'DELETE') AND EXISTS (
			SELECT 1
			FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
			WHERE OLD."cycle_id" = ANY(reconciliation."cycle_ids")
				OR OLD."run_id" = ANY(reconciliation."run_ids")
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
		IF TG_OP IN ('INSERT', 'UPDATE') AND EXISTS (
			SELECT 1
			FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
			WHERE NEW."cycle_id" = ANY(reconciliation."cycle_ids")
				OR NEW."run_id" = ANY(reconciliation."run_ids")
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
	ELSIF TG_TABLE_NAME = 'sv_citation_gap_snapshots' THEN
		IF TG_OP IN ('UPDATE', 'DELETE') AND EXISTS (
			SELECT 1
			FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
			WHERE OLD."configuration_lock_id" = reconciliation."configuration_lock_id"
				OR OLD."cycle_id" = ANY(reconciliation."cycle_ids")
				OR OLD."evidence_run_ids" && reconciliation."run_ids"
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
		IF TG_OP IN ('INSERT', 'UPDATE') AND EXISTS (
			SELECT 1
			FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
			WHERE NEW."configuration_lock_id" = reconciliation."configuration_lock_id"
				OR NEW."cycle_id" = ANY(reconciliation."cycle_ids")
				OR NEW."evidence_run_ids" && reconciliation."run_ids"
		) THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
		END IF;
	END IF;

	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$outcome$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_outcome_mutation"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "sv_response_mentions_journal_no_spend_dependency_guard"
	BEFORE INSERT OR UPDATE OR DELETE ON "public"."sv_response_mentions"
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_outcome_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_citation_gap_snapshots_journal_no_spend_dependency_guard"
	BEFORE INSERT OR UPDATE OR DELETE ON "public"."sv_citation_gap_snapshots"
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_outcome_mutation"();
--> statement-breakpoint
CREATE FUNCTION "public"."sv_reject_journal_no_spend_provider_snapshot_insert"() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $provider_snapshot$
BEGIN
	IF pg_catalog.translate(
		pg_catalog.lower(pg_catalog.btrim(NEW."provider")),
		'_- ',
		''
	) = 'brightdata' AND EXISTS (
		SELECT 1
		FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
		WHERE reconciliation."organization_id" = NEW."organization_id"
			AND reconciliation."project_id" = NEW."project_id"
			AND NEW."observed_at" >= reconciliation."evidence_window_start"
			AND NEW."observed_at" <= reconciliation."evidence_window_end"
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
	END IF;
	RETURN NEW;
END;
$provider_snapshot$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_provider_snapshot_insert"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "sv_provider_dataset_snapshot_events_journal_no_spend_guard"
	BEFORE INSERT ON "public"."sv_provider_dataset_snapshot_events"
	FOR EACH ROW EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_provider_snapshot_insert"();
--> statement-breakpoint
CREATE FUNCTION "public"."sv_reject_journal_no_spend_execution_truncate"() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $truncate$
BEGIN
	IF EXISTS (SELECT 1 FROM "public"."sv_journal_no_spend_reconciliations") THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
	END IF;
	RETURN NULL;
END;
$truncate$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_execution_truncate"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "sv_cycles_journal_no_spend_truncate_guard"
	BEFORE TRUNCATE ON "public"."sv_cycles"
	FOR EACH STATEMENT EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_execution_truncate"();
--> statement-breakpoint
CREATE TRIGGER "sv_run_permits_journal_no_spend_truncate_guard"
	BEFORE TRUNCATE ON "public"."sv_run_permits"
	FOR EACH STATEMENT EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_execution_truncate"();
--> statement-breakpoint
CREATE TRIGGER "sv_runs_journal_no_spend_truncate_guard"
	BEFORE TRUNCATE ON "public"."sv_runs"
	FOR EACH STATEMENT EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_execution_truncate"();
--> statement-breakpoint
CREATE TRIGGER "sv_cost_events_journal_no_spend_truncate_guard"
	BEFORE TRUNCATE ON "public"."sv_cost_events"
	FOR EACH STATEMENT EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_execution_truncate"();
--> statement-breakpoint
CREATE TRIGGER "sv_response_mentions_journal_no_spend_truncate_guard"
	BEFORE TRUNCATE ON "public"."sv_response_mentions"
	FOR EACH STATEMENT EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_execution_truncate"();
--> statement-breakpoint
CREATE TRIGGER "sv_citation_gap_snapshots_journal_no_spend_truncate_guard"
	BEFORE TRUNCATE ON "public"."sv_citation_gap_snapshots"
	FOR EACH STATEMENT EXECUTE FUNCTION "public"."sv_reject_journal_no_spend_execution_truncate"();
--> statement-breakpoint
CREATE FUNCTION "public"."sv_owner_reconcile_journal_no_spend"(
	p_claim_id uuid,
	p_expected_run_ids uuid[],
	p_provider text,
	p_provider_account_scope_sha256 text,
	p_provider_dataset_resource_ids text[],
	p_evidence_window_start timestamptz,
	p_evidence_window_end timestamptz,
	p_execution_quiesced_at timestamptz,
	p_billing_final_at timestamptz,
	p_source_artifact_reference text,
	p_source_artifact_sha256 text
) RETURNS TABLE (
	reconciliation_id uuid,
	claim_id uuid,
	prior_status text,
	current_status text,
	reconciled_at timestamptz,
	certificate_sha256 text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = '' AS $reconcile$
DECLARE
	canonical_expected_run_ids uuid[];
	canonical_resource_ids text[];
	existing_reconciliation record;
	initial_claim record;
	locked_claim record;
	configuration_lock record;
	derived_cycle_ids uuid[];
	derived_permit_ids uuid[];
	derived_run_ids uuid[];
	derived_run_scope jsonb;
	earliest_run_start timestamptz;
	latest_run_start timestamptz;
	latest_permit_expiry timestamptz;
	transition_at timestamptz;
	inserted_reconciliation record;
BEGIN
	IF current_user <> session_user
		OR NOT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_roles AS role
			WHERE role.rolname = current_user
				AND (role.rolsuper OR role.rolbypassrls)
		)
		OR (
			SELECT pg_catalog.count(*)
			FROM pg_catalog.pg_class AS relation
			WHERE relation.oid IN (
				'public.sv_journal_no_spend_reconciliations'::pg_catalog.regclass,
				'public.sv_journal_daily_claims'::pg_catalog.regclass,
				'public.sv_projects'::pg_catalog.regclass,
				'public.sv_configuration_locks'::pg_catalog.regclass,
				'public.sv_cycles'::pg_catalog.regclass,
				'public.sv_run_permits'::pg_catalog.regclass,
				'public.sv_runs'::pg_catalog.regclass,
				'public.sv_cost_events'::pg_catalog.regclass,
				'public.sv_provider_dataset_snapshot_events'::pg_catalog.regclass,
				'public.sv_response_mentions'::pg_catalog.regclass,
				'public.sv_citation_gap_snapshots'::pg_catalog.regclass
			)
				AND pg_catalog.pg_get_userbyid(relation.relowner) = current_user
		) <> 11
	THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_OWNER_SCOPE_REQUIRED';
	END IF;

	SELECT coalesce(pg_catalog.array_agg(value ORDER BY value), ARRAY[]::uuid[])
	INTO canonical_expected_run_ids
	FROM (SELECT DISTINCT value FROM pg_catalog.unnest(p_expected_run_ids) AS item(value)) AS valueset;
	SELECT coalesce(pg_catalog.array_agg(value ORDER BY value COLLATE "pg_catalog"."C"), ARRAY[]::text[])
	INTO canonical_resource_ids
	FROM (
		SELECT DISTINCT value COLLATE "pg_catalog"."C" AS value
		FROM pg_catalog.unnest(p_provider_dataset_resource_ids) AS item(value)
	) AS valueset;

	IF p_claim_id IS NULL
		OR p_expected_run_ids IS NULL
		OR p_expected_run_ids IS DISTINCT FROM canonical_expected_run_ids
		OR pg_catalog.array_position(p_expected_run_ids, NULL) IS NOT NULL
		OR p_provider IS NULL
		OR p_provider <> pg_catalog.btrim(p_provider)
		OR pg_catalog.length(p_provider) = 0
		OR p_provider_account_scope_sha256 IS NULL
		OR p_provider_account_scope_sha256 !~ '^sha256:[a-f0-9]{64}$'
		OR p_provider_dataset_resource_ids IS NULL
		OR p_provider_dataset_resource_ids IS DISTINCT FROM canonical_resource_ids
		OR pg_catalog.cardinality(p_provider_dataset_resource_ids) = 0
		OR pg_catalog.array_position(p_provider_dataset_resource_ids, NULL) IS NOT NULL
		OR EXISTS (
			SELECT 1
			FROM pg_catalog.unnest(p_provider_dataset_resource_ids) AS item(value)
			WHERE value <> pg_catalog.btrim(value) OR pg_catalog.length(value) = 0
		)
		OR p_evidence_window_start IS NULL
		OR p_evidence_window_end IS NULL
		OR p_execution_quiesced_at IS NULL
		OR p_billing_final_at IS NULL
		OR p_source_artifact_reference IS NULL
		OR p_source_artifact_reference <> pg_catalog.btrim(p_source_artifact_reference)
		OR pg_catalog.length(p_source_artifact_reference) = 0
		OR p_source_artifact_sha256 IS NULL
		OR p_source_artifact_sha256 !~ '^sha256:[a-f0-9]{64}$'
	THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_INPUT_INVALID';
	END IF;
	IF p_provider <> 'BRIGHT_DATA' THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_PROVIDER_SCOPE_UNSUPPORTED';
	END IF;

	SELECT reconciliation.*
	INTO existing_reconciliation
	FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
	WHERE reconciliation."claim_id" = p_claim_id;
	IF FOUND THEN
		IF existing_reconciliation.run_ids IS DISTINCT FROM p_expected_run_ids
			OR existing_reconciliation.provider IS DISTINCT FROM p_provider
			OR existing_reconciliation.provider_account_scope_sha256 IS DISTINCT FROM p_provider_account_scope_sha256
			OR existing_reconciliation.provider_dataset_resource_ids IS DISTINCT FROM p_provider_dataset_resource_ids
			OR existing_reconciliation.evidence_window_start IS DISTINCT FROM p_evidence_window_start
			OR existing_reconciliation.evidence_window_end IS DISTINCT FROM p_evidence_window_end
			OR existing_reconciliation.execution_quiesced_at IS DISTINCT FROM p_execution_quiesced_at
			OR existing_reconciliation.billing_final_at IS DISTINCT FROM p_billing_final_at
			OR existing_reconciliation.source_artifact_reference IS DISTINCT FROM p_source_artifact_reference
			OR existing_reconciliation.source_artifact_sha256 IS DISTINCT FROM p_source_artifact_sha256
		THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_REPLAY_MISMATCH';
		END IF;
		RETURN QUERY SELECT
			existing_reconciliation.reconciliation_id,
			existing_reconciliation.claim_id,
			existing_reconciliation.prior_claim_status,
			existing_reconciliation.current_claim_status,
			existing_reconciliation.reconciled_at,
			existing_reconciliation.certificate_sha256;
		RETURN;
	END IF;

	SELECT claim."organization_id", claim."project_id"
	INTO initial_claim
	FROM "public"."sv_journal_daily_claims" AS claim
	WHERE claim."id" = p_claim_id;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CLAIM_NOT_FOUND';
	END IF;

	-- Any active runtime SELECT FOR UPDATE or write already holds a conflicting
	-- table lock. Fail instead of waiting so reconciliation cannot deadlock with
	-- permit claims or run completion.
	BEGIN
		LOCK TABLE
			"public"."sv_projects",
			"public"."sv_configuration_locks",
			"public"."sv_journal_daily_claims",
			"public"."sv_cycles",
			"public"."sv_run_permits",
			"public"."sv_runs",
			"public"."sv_cost_events",
			"public"."sv_response_mentions",
			"public"."sv_citation_gap_snapshots",
			"public"."sv_provider_dataset_snapshot_events",
			"public"."sv_journal_no_spend_reconciliations"
		IN EXCLUSIVE MODE NOWAIT;
	EXCEPTION
		WHEN lock_not_available THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_EXECUTION_NOT_QUIESCED' USING ERRCODE = '55P03';
	END;

	-- Recheck under the certificate table lock so a concurrent identical owner
	-- call cannot create a second receipt.
	SELECT reconciliation.*
	INTO existing_reconciliation
	FROM "public"."sv_journal_no_spend_reconciliations" AS reconciliation
	WHERE reconciliation."claim_id" = p_claim_id;
	IF FOUND THEN
		IF existing_reconciliation.run_ids IS DISTINCT FROM p_expected_run_ids
			OR existing_reconciliation.provider IS DISTINCT FROM p_provider
			OR existing_reconciliation.provider_account_scope_sha256 IS DISTINCT FROM p_provider_account_scope_sha256
			OR existing_reconciliation.provider_dataset_resource_ids IS DISTINCT FROM p_provider_dataset_resource_ids
			OR existing_reconciliation.evidence_window_start IS DISTINCT FROM p_evidence_window_start
			OR existing_reconciliation.evidence_window_end IS DISTINCT FROM p_evidence_window_end
			OR existing_reconciliation.execution_quiesced_at IS DISTINCT FROM p_execution_quiesced_at
			OR existing_reconciliation.billing_final_at IS DISTINCT FROM p_billing_final_at
			OR existing_reconciliation.source_artifact_reference IS DISTINCT FROM p_source_artifact_reference
			OR existing_reconciliation.source_artifact_sha256 IS DISTINCT FROM p_source_artifact_sha256
		THEN
			RAISE EXCEPTION 'JOURNAL_NO_SPEND_REPLAY_MISMATCH';
		END IF;
		RETURN QUERY SELECT
			existing_reconciliation.reconciliation_id,
			existing_reconciliation.claim_id,
			existing_reconciliation.prior_claim_status,
			existing_reconciliation.current_claim_status,
			existing_reconciliation.reconciled_at,
			existing_reconciliation.certificate_sha256;
		RETURN;
	END IF;

	SELECT claim.*
	INTO locked_claim
	FROM "public"."sv_journal_daily_claims" AS claim
	WHERE claim."id" = p_claim_id
	FOR UPDATE;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CLAIM_NOT_FOUND';
	END IF;
	IF locked_claim.organization_id IS DISTINCT FROM initial_claim.organization_id
		OR locked_claim.project_id IS DISTINCT FROM initial_claim.project_id
	THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CLAIM_SCOPE_CHANGED';
	END IF;
	IF locked_claim.status <> 'HOLD' OR locked_claim.configuration_lock_id IS NULL THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CLAIM_NOT_DIRECT_HOLD';
	END IF;

	SELECT lock.*
	INTO configuration_lock
	FROM "public"."sv_configuration_locks" AS lock
	WHERE lock."id" = locked_claim.configuration_lock_id
		AND lock."project_id" = locked_claim.project_id
		AND lock."organization_id" = locked_claim.organization_id
	FOR SHARE;
	IF NOT FOUND
		OR configuration_lock.snapshot#>>'{journalClaim,id}' IS DISTINCT FROM locked_claim.id::text
		OR configuration_lock.snapshot#>>'{journalClaim,utcDay}' IS DISTINCT FROM locked_claim.utc_day::text
		OR configuration_lock.snapshot#>>'{journalClaim,attempt}' IS DISTINCT FROM locked_claim.attempt::text
	THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_LOCK_PROVENANCE_MISMATCH';
	END IF;

	SELECT pg_catalog.array_agg(cycle."id" ORDER BY cycle."id")
	INTO derived_cycle_ids
	FROM "public"."sv_cycles" AS cycle
	WHERE cycle."lock_id" = locked_claim.configuration_lock_id;
	IF derived_cycle_ids IS NULL OR EXISTS (
		SELECT 1
		FROM "public"."sv_cycles" AS cycle
		WHERE cycle."lock_id" = locked_claim.configuration_lock_id
			AND cycle."organization_id" IS DISTINCT FROM locked_claim.organization_id
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CYCLE_SCOPE_INVALID';
	END IF;
	PERFORM 1
	FROM "public"."sv_cycles" AS cycle
	WHERE cycle."id" = ANY(derived_cycle_ids)
	ORDER BY cycle."id"
	FOR UPDATE;

	SELECT coalesce(pg_catalog.array_agg(permit."id" ORDER BY permit."id"), ARRAY[]::uuid[])
	INTO derived_permit_ids
	FROM "public"."sv_run_permits" AS permit
	WHERE permit."cycle_id" = ANY(derived_cycle_ids);
	IF EXISTS (
		SELECT 1
		FROM "public"."sv_run_permits" AS permit
		WHERE permit."id" = ANY(derived_permit_ids)
			AND permit."organization_id" IS DISTINCT FROM locked_claim.organization_id
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_PERMIT_SCOPE_INVALID';
	END IF;
	PERFORM 1
	FROM "public"."sv_run_permits" AS permit
	WHERE permit."id" = ANY(derived_permit_ids)
	ORDER BY permit."id"
	FOR UPDATE;
	IF EXISTS (
		SELECT 1
		FROM "public"."sv_run_permits" AS permit
		WHERE permit."id" = ANY(derived_permit_ids)
			AND (
				permit."channel" IS DISTINCT FROM 'VISITOR'
				OR permit."system_id" IS NULL
				OR permit."system_id" <> pg_catalog.btrim(permit."system_id")
				OR pg_catalog.length(permit."system_id") = 0
				OR permit."system_id" NOT IN ('ChatGPT', 'Gemini', 'Perplexity')
			)
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_PROVIDER_SCOPE_UNSUPPORTED';
	END IF;

	SELECT
		coalesce(pg_catalog.array_agg(run."id" ORDER BY run."id"), ARRAY[]::uuid[]),
		pg_catalog.jsonb_agg(
			pg_catalog.jsonb_build_object(
				'run_id', run."id",
				'permit_id', run."permit_id",
				'cycle_id', run."cycle_id",
				'dispatch_key', run."dispatch_key",
				'channel', run."channel",
				'scenario_id', run."scenario_id",
				'system_id', run."system_id"
			)
			ORDER BY run."id"
		),
		pg_catalog.min(run."started_at"),
		pg_catalog.max(run."started_at")
	INTO derived_run_ids, derived_run_scope, earliest_run_start, latest_run_start
	FROM "public"."sv_runs" AS run
	WHERE run."cycle_id" = ANY(derived_cycle_ids);
	PERFORM 1
	FROM "public"."sv_runs" AS run
	WHERE run."id" = ANY(derived_run_ids)
	ORDER BY run."id"
	FOR UPDATE;

	IF EXISTS (
		(
			SELECT expected_run_id
			FROM pg_catalog.unnest(p_expected_run_ids) AS expected(expected_run_id)
			EXCEPT
			SELECT run."id"
			FROM "public"."sv_runs" AS run
			WHERE run."cycle_id" = ANY(derived_cycle_ids)
		)
		UNION ALL
		(
			SELECT run."id"
			FROM "public"."sv_runs" AS run
			WHERE run."cycle_id" = ANY(derived_cycle_ids)
			EXCEPT
			SELECT expected_run_id
			FROM pg_catalog.unnest(p_expected_run_ids) AS expected(expected_run_id)
		)
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_RUN_SET_MISMATCH';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "public"."sv_runs" AS run
		LEFT JOIN "public"."sv_run_permits" AS permit ON permit."id" = run."permit_id"
		WHERE run."id" = ANY(derived_run_ids)
			AND (
				permit."id" IS NULL
				OR permit."organization_id" IS DISTINCT FROM locked_claim.organization_id
				OR run."organization_id" IS DISTINCT FROM locked_claim.organization_id
				OR permit."cycle_id" IS DISTINCT FROM run."cycle_id"
				OR permit."dispatch_key" IS DISTINCT FROM run."dispatch_key"
				OR permit."channel" IS DISTINCT FROM run."channel"
				OR permit."scenario_id" IS DISTINCT FROM run."scenario_id"
				OR permit."system_id" IS DISTINCT FROM run."system_id"
				OR permit."status" <> 'consumed'
				OR permit."consumed_at" IS NULL
			)
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_RUN_PERMIT_IDENTITY_MISMATCH';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "public"."sv_run_permits" AS permit
		WHERE permit."id" = ANY(derived_permit_ids)
			AND (permit."consumed_at" IS NOT NULL OR permit."status" = 'consumed')
			AND NOT EXISTS (
				SELECT 1
				FROM "public"."sv_runs" AS run
				WHERE run."permit_id" = permit."id"
					AND run."cycle_id" = permit."cycle_id"
					AND run."dispatch_key" = permit."dispatch_key"
					AND run."channel" = permit."channel"
					AND run."scenario_id" = permit."scenario_id"
					AND run."system_id" IS NOT DISTINCT FROM permit."system_id"
			)
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_CONSUMED_PERMIT_WITHOUT_RUN';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "public"."sv_runs" AS run
		WHERE run."id" = ANY(derived_run_ids)
			AND (
				run."status" <> 'RUNNING'
				OR run."started_at" IS NULL
				OR run."finished_at" IS NOT NULL
				OR run."validity" IS NOT NULL
				OR run."invalid_reason" IS NOT NULL
				OR run."cost_usd" IS NOT NULL
				OR run."cost_basis" IS NOT NULL
				OR run."token_input" IS NOT NULL
				OR run."token_output" IS NOT NULL
				OR run."system" IS NOT NULL
				OR run."model" IS NOT NULL
				OR run."language" IS NOT NULL
				OR run."region" IS NOT NULL
				OR run."mention" IS NOT NULL
				OR run."position" IS NOT NULL
				OR run."owned_citation" IS NOT NULL
				OR run."citations" IS NOT NULL
				OR run."competitors" IS NOT NULL
				OR run."factual_errors" IS NOT NULL
				OR run."extractor_version" IS NOT NULL
				OR run."capture_mode" IS NOT NULL
				OR run."raw_response_reference" IS NOT NULL
				OR run."canonical_payload" IS NOT NULL
			)
	) OR EXISTS (
		SELECT 1
		FROM "public"."sv_response_mentions" AS mention
		WHERE mention."cycle_id" = ANY(derived_cycle_ids)
			OR mention."run_id" = ANY(derived_run_ids)
	) OR EXISTS (
		SELECT 1
		FROM "public"."sv_citation_gap_snapshots" AS gap
		WHERE gap."configuration_lock_id" = locked_claim.configuration_lock_id
			OR gap."cycle_id" = ANY(derived_cycle_ids)
			OR gap."evidence_run_ids" && derived_run_ids
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_RUN_OUTCOME_EVIDENCE_PRESENT';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "public"."sv_cost_events" AS cost
		WHERE cost."cycle_id" = ANY(derived_cycle_ids)
			OR cost."run_id" = ANY(derived_run_ids)
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_COST_EVIDENCE_PRESENT';
	END IF;

	SELECT pg_catalog.max(permit."expires_at")
	INTO latest_permit_expiry
	FROM "public"."sv_run_permits" AS permit
	WHERE permit."id" = ANY(derived_permit_ids);

	transition_at := pg_catalog.clock_timestamp();
	IF p_evidence_window_start > p_evidence_window_end
		OR p_evidence_window_start > earliest_run_start
		OR p_evidence_window_end < latest_permit_expiry
		OR p_execution_quiesced_at < latest_run_start
		OR p_execution_quiesced_at > p_evidence_window_end
		OR p_billing_final_at < p_evidence_window_end
		OR p_billing_final_at > transition_at
	THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_EVIDENCE_WINDOW_INVALID';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "public"."sv_run_permits" AS permit
		WHERE permit."id" = ANY(derived_permit_ids)
			AND (
				permit."expires_at" > p_billing_final_at
				OR permit."expires_at" > transition_at
			)
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_PERMIT_NOT_EXPIRED';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "public"."sv_provider_dataset_snapshot_events" AS snapshot_event
		WHERE snapshot_event."organization_id" = locked_claim.organization_id
			AND snapshot_event."project_id" = locked_claim.project_id
			AND pg_catalog.translate(
				pg_catalog.lower(pg_catalog.btrim(snapshot_event."provider")),
				'_- ',
				''
			) = 'brightdata'
			AND snapshot_event."observed_at" >= p_evidence_window_start
			AND snapshot_event."observed_at" <= p_evidence_window_end
	) THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_PROVIDER_SNAPSHOT_EVIDENCE_PRESENT';
	END IF;

	INSERT INTO "public"."sv_journal_no_spend_reconciliations" (
		"schema_version",
		"organization_id",
		"project_id",
		"claim_id",
		"configuration_lock_id",
		"cycle_ids",
		"permit_ids",
		"run_ids",
		"run_execution_scope",
		"provider",
		"provider_account_scope_sha256",
		"provider_dataset_resource_ids",
		"evidence_window_start",
		"evidence_window_end",
		"execution_quiesced_at",
		"billing_final_at",
		"accepted_provider_object_count",
		"billed_provider_object_count",
		"billed_amount_usd",
		"source_artifact_reference",
		"source_artifact_sha256",
		"prior_claim_status",
		"current_claim_status",
		"reconciled_at",
		"reconciled_by"
	) VALUES (
		1,
		locked_claim.organization_id,
		locked_claim.project_id,
		locked_claim.id,
		locked_claim.configuration_lock_id,
		derived_cycle_ids,
		derived_permit_ids,
		derived_run_ids,
		coalesce(derived_run_scope, '[]'::jsonb),
		p_provider,
		p_provider_account_scope_sha256,
		p_provider_dataset_resource_ids,
		p_evidence_window_start,
		p_evidence_window_end,
		p_execution_quiesced_at,
		p_billing_final_at,
		0,
		0,
		0,
		p_source_artifact_reference,
		p_source_artifact_sha256,
		'HOLD',
		'NO_SPEND',
		transition_at,
		'database-role:' || session_user
	)
	RETURNING * INTO inserted_reconciliation;

	UPDATE "public"."sv_journal_daily_claims" AS claim
	SET "status" = 'NO_SPEND', "updated_at" = transition_at
	WHERE claim."id" = locked_claim.id
		AND claim."organization_id" = locked_claim.organization_id
		AND claim."project_id" = locked_claim.project_id
		AND claim."configuration_lock_id" = locked_claim.configuration_lock_id
		AND claim."status" = 'HOLD';
	IF NOT FOUND THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_TRANSITION_CONFLICT';
	END IF;

	RETURN QUERY SELECT
		inserted_reconciliation.reconciliation_id,
		inserted_reconciliation.claim_id,
		inserted_reconciliation.prior_claim_status,
		inserted_reconciliation.current_claim_status,
		inserted_reconciliation.reconciled_at,
		inserted_reconciliation.certificate_sha256;
END;
$reconcile$;
--> statement-breakpoint
COMMENT ON FUNCTION "public"."sv_owner_reconcile_journal_no_spend"(
	uuid, uuid[], text, text, text[], timestamptz, timestamptz,
	timestamptz, timestamptz, text, text
) IS 'Version 1 certifies only canonical BRIGHT_DATA Visitor graphs for ChatGPT, Gemini, and Perplexity; mixed and API graphs remain HOLD.';
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."sv_owner_reconcile_journal_no_spend"(
	uuid, uuid[], text, text, text[], timestamptz, timestamptz,
	timestamptz, timestamptz, text, text
) FROM PUBLIC;
--> statement-breakpoint
DO $revoke_runtime_functions$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app') THEN
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_owner_reconcile_journal_no_spend"(uuid, uuid[], text, text, text[], timestamptz, timestamptz, timestamptz, timestamptz, text, text) FROM selena_app';
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_guard_journal_no_spend_reconciliation_insert"() FROM selena_app';
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_reconciliation_mutation"() FROM selena_app';
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_require_journal_no_spend_claim_pair"() FROM selena_app';
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_guard_journal_daily_claim_mutation"() FROM selena_app';
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_dependency_mutation"() FROM selena_app';
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_cost_insert"() FROM selena_app';
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_outcome_mutation"() FROM selena_app';
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_provider_snapshot_insert"() FROM selena_app';
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_reject_journal_no_spend_execution_truncate"() FROM selena_app';
	END IF;
END;
$revoke_runtime_functions$;
