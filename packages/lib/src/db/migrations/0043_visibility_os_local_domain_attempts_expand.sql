INSERT INTO "sv_measurement_domains" ("domain_id", "unit_of_measure") VALUES
	('LOCAL_MAPS', 'location_keyword_coordinate_provider'),
	('LOCAL_AI', 'location_prompt_coordinate_system');
--> statement-breakpoint
ALTER TABLE "sv_local_scan_cycles"
	ADD CONSTRAINT "sv_local_scan_cycles_domain_check_expand"
	CHECK ("domain_id" IN ('LOCAL', 'LOCAL_MAPS')) NOT VALID;
--> statement-breakpoint
ALTER TABLE "sv_local_scan_cycles"
	VALIDATE CONSTRAINT "sv_local_scan_cycles_domain_check_expand";
--> statement-breakpoint
ALTER TABLE "sv_local_scan_cycles"
	DROP CONSTRAINT "sv_local_scan_cycles_domain_check";
--> statement-breakpoint
ALTER TABLE "sv_local_scan_cycles"
	RENAME CONSTRAINT "sv_local_scan_cycles_domain_check_expand"
	TO "sv_local_scan_cycles_domain_check";
--> statement-breakpoint
ALTER TABLE "sv_local_scan_cycles"
	ALTER COLUMN "domain_id" SET DEFAULT 'LOCAL_MAPS';
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_cycles_id_domain_org_unique"
	ON "sv_measurement_cycles" ("id", "domain_id", "organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_cost_events_id_org_cycle_domain_unique"
	ON "sv_cost_events" ("id", "organization_id", "measurement_cycle_id", "domain_id");
--> statement-breakpoint
CREATE TABLE "sv_measurement_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"measurement_cycle_id" uuid NOT NULL,
	"domain_id" text NOT NULL,
	"observation_ref" text NOT NULL,
	"point_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"executor_id" text NOT NULL,
	"repeat_index" integer NOT NULL,
	"base_slot_key" text NOT NULL,
	"attempt_index" integer NOT NULL,
	"execution_key" text NOT NULL,
	"status" text DEFAULT 'CLAIMED' NOT NULL,
	"budget_state" text DEFAULT 'RESERVED' NOT NULL,
	"reserved_cost_usd" numeric(12, 6) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"surface_cap_usd" numeric(12, 6) NOT NULL,
	"monthly_cap_usd" numeric(12, 6) NOT NULL,
	"price_snapshot_version" text NOT NULL,
	"spent_cost_usd" numeric(12, 6) DEFAULT 0 NOT NULL,
	"released_cost_usd" numeric(12, 6) DEFAULT 0 NOT NULL,
	"claimed_at" timestamptz DEFAULT now() NOT NULL,
	"lease_expires_at" timestamptz NOT NULL,
	"submitted_at" timestamptz,
	"completed_at" timestamptz,
	"provider_task_id" text,
	"raw_ref" text,
	"cost_event_id" uuid,
	"retry_reason" text,
	"final_invalid_reason" text,
	"reconciled_at" timestamptz,
	"reconciliation_ref" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_measurement_attempts_cycle_domain_org_fk"
		FOREIGN KEY ("measurement_cycle_id", "domain_id", "organization_id")
		REFERENCES "sv_measurement_cycles"("id", "domain_id", "organization_id"),
	CONSTRAINT "sv_measurement_attempts_cost_event_scope_fk"
		FOREIGN KEY ("cost_event_id", "organization_id", "measurement_cycle_id", "domain_id")
		REFERENCES "sv_cost_events"("id", "organization_id", "measurement_cycle_id", "domain_id"),
	CONSTRAINT "sv_measurement_attempts_domain_check"
		CHECK ("domain_id" IN ('LOCAL_MAPS', 'LOCAL_AI')),
	CONSTRAINT "sv_measurement_attempts_attempt_index_check"
		CHECK ("attempt_index" BETWEEN 1 AND 3),
	CONSTRAINT "sv_measurement_attempts_execution_identity_check"
		CHECK ("base_slot_key" = "domain_id" || '|' || "measurement_cycle_id"::text
			|| '|' || "point_id"::text || '|' || "item_id"::text
			|| '|' || "executor_id" || '|' || "repeat_index"::text
			AND "execution_key" = "base_slot_key" || '|' || "attempt_index"::text),
	CONSTRAINT "sv_measurement_attempts_input_shape_check"
		CHECK ("repeat_index" >= 0
			AND length("observation_ref") > 0
			AND "observation_ref" !~ '[[:space:]]'
			AND length("executor_id") > 0
			AND "executor_id" !~ '[[:space:]]'
			AND position('|' IN "executor_id") = 0
			AND length("price_snapshot_version") > 0
			AND "price_snapshot_version" !~ '[[:space:]]'
			AND "lease_expires_at" > "claimed_at"),
	CONSTRAINT "sv_measurement_attempts_status_check"
		CHECK ("status" IN (
			'CLAIMED', 'SUBMITTED', 'SUCCEEDED', 'RETRYABLE_FAILURE',
			'TERMINAL_FAILURE', 'UNKNOWN_RECONCILIATION'
		)),
	CONSTRAINT "sv_measurement_attempts_state_shape_check"
		CHECK (
			("status" = 'CLAIMED' AND "submitted_at" IS NULL AND "completed_at" IS NULL
				AND "provider_task_id" IS NULL AND "raw_ref" IS NULL AND "cost_event_id" IS NULL)
			OR ("status" = 'SUBMITTED' AND "submitted_at" IS NOT NULL
				AND "submitted_at" >= "claimed_at" AND "completed_at" IS NULL
				AND "provider_task_id" IS NULL AND "raw_ref" IS NULL AND "cost_event_id" IS NULL)
			OR ("status" IN ('SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE', 'UNKNOWN_RECONCILIATION')
				AND "submitted_at" IS NOT NULL AND "completed_at" IS NOT NULL
				AND "submitted_at" >= "claimed_at" AND "completed_at" >= "submitted_at")
		),
	CONSTRAINT "sv_measurement_attempts_reason_shape_check"
		CHECK (
			("retry_reason" IS NULL OR "retry_reason" IN (
				'EMPTY_RESPONSE', 'TRUNCATED_RESPONSE', 'TIMEOUT',
				'PROVIDER_5XX', 'RATE_LIMITED', 'MALFORMED_RESPONSE'
			))
			AND ("final_invalid_reason" IS NULL OR "final_invalid_reason" IN (
				'EMPTY_AFTER_3_ATTEMPTS', 'PROVIDER_UNAVAILABLE',
				'RATE_LIMIT_EXHAUSTED', 'MALFORMED_AFTER_3_ATTEMPTS'
			))
			AND (("status" = 'RETRYABLE_FAILURE' AND "attempt_index" < 3
				AND "retry_reason" IS NOT NULL AND "final_invalid_reason" IS NULL)
			OR ("status" = 'TERMINAL_FAILURE' AND "attempt_index" = 3 AND (
				("retry_reason" IN ('EMPTY_RESPONSE', 'TRUNCATED_RESPONSE')
					AND "final_invalid_reason" = 'EMPTY_AFTER_3_ATTEMPTS')
				OR ("retry_reason" IN ('TIMEOUT', 'PROVIDER_5XX')
					AND "final_invalid_reason" = 'PROVIDER_UNAVAILABLE')
				OR ("retry_reason" = 'RATE_LIMITED'
					AND "final_invalid_reason" = 'RATE_LIMIT_EXHAUSTED')
				OR ("retry_reason" = 'MALFORMED_RESPONSE'
					AND "final_invalid_reason" = 'MALFORMED_AFTER_3_ATTEMPTS')
			))
			OR ("status" = 'TERMINAL_FAILURE'
				AND "retry_reason" IS NULL AND "final_invalid_reason" IS NULL)
			OR ("status" NOT IN ('RETRYABLE_FAILURE', 'TERMINAL_FAILURE')
				AND "retry_reason" IS NULL AND "final_invalid_reason" IS NULL))
		),
	CONSTRAINT "sv_measurement_attempts_reconciliation_check"
		CHECK (
			("status" = 'UNKNOWN_RECONCILIATION' AND "budget_state" = 'RESERVED'
				AND "reconciled_at" IS NULL AND "reconciliation_ref" IS NULL)
		OR ("status" = 'UNKNOWN_RECONCILIATION' AND "budget_state" IN ('SPENT', 'RELEASED')
			AND "reconciled_at" IS NOT NULL
			AND "reconciled_at" >= "completed_at"
			AND "reconciliation_ref" ~ '[^[:space:]]')
			OR ("status" <> 'UNKNOWN_RECONCILIATION'
				AND "reconciled_at" IS NULL AND "reconciliation_ref" IS NULL)
		),
	CONSTRAINT "sv_measurement_attempts_budget_check"
		CHECK (
			"currency" = 'USD'
			AND "reserved_cost_usd" >= 0
			AND "reserved_cost_usd" <= "surface_cap_usd"
			AND "reserved_cost_usd" <= "monthly_cap_usd"
			AND "surface_cap_usd" >= 0
			AND "monthly_cap_usd" >= 0
			AND "spent_cost_usd" >= 0
			AND "released_cost_usd" >= 0
			AND (("status" IN ('CLAIMED', 'SUBMITTED', 'UNKNOWN_RECONCILIATION')
					AND "budget_state" = 'RESERVED')
				OR ("status" IN ('SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE')
					AND "budget_state" IN ('SPENT', 'RELEASED'))
				OR ("status" = 'UNKNOWN_RECONCILIATION'
					AND "budget_state" IN ('SPENT', 'RELEASED') AND "reconciled_at" IS NOT NULL))
			AND (
				("budget_state" = 'RESERVED'
					AND "spent_cost_usd" = 0 AND "released_cost_usd" = 0 AND "cost_event_id" IS NULL)
				OR ("budget_state" = 'SPENT'
					AND "released_cost_usd" = greatest("reserved_cost_usd" - "spent_cost_usd", 0)
					AND "cost_event_id" IS NOT NULL)
				OR ("budget_state" = 'RELEASED'
					AND "spent_cost_usd" = 0 AND "released_cost_usd" = "reserved_cost_usd"
					AND "cost_event_id" IS NULL)
			)
		)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_attempts_reservation_unique"
	ON "sv_measurement_attempts" ("reservation_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_attempts_cost_event_unique"
	ON "sv_measurement_attempts" ("cost_event_id")
	WHERE "cost_event_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_attempts_execution_unique"
	ON "sv_measurement_attempts" ("organization_id", "execution_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_attempts_slot_attempt_unique"
	ON "sv_measurement_attempts" ("organization_id", "base_slot_key", "attempt_index");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_attempts_active_slot_unique"
	ON "sv_measurement_attempts" ("organization_id", "base_slot_key")
	WHERE "status" IN ('CLAIMED', 'SUBMITTED');
--> statement-breakpoint
CREATE INDEX "sv_measurement_attempts_org_cycle_status_idx"
	ON "sv_measurement_attempts" ("organization_id", "measurement_cycle_id", "status");
--> statement-breakpoint
CREATE INDEX "sv_measurement_attempts_expired_claim_idx"
	ON "sv_measurement_attempts" ("organization_id", "lease_expires_at")
	WHERE "status" = 'CLAIMED';
--> statement-breakpoint
ALTER TABLE "sv_measurement_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_measurement_attempts"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE FUNCTION "sv_guard_measurement_attempt_mutation"() RETURNS trigger AS $$
DECLARE
	prior_attempts integer;
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" <> 'CLAIMED' OR NEW."budget_state" <> 'RESERVED' THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_INITIAL_STATE_BLOCKED';
		END IF;
		IF NEW."claimed_at" > now() OR NEW."lease_expires_at" <= now() THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_INITIAL_LEASE_INVALID';
		END IF;

		SELECT count(*) INTO prior_attempts
		FROM "sv_measurement_attempts"
		WHERE "organization_id" = NEW."organization_id"
			AND "base_slot_key" = NEW."base_slot_key";

		IF (NEW."attempt_index" = 1 AND prior_attempts <> 0)
			OR (NEW."attempt_index" > 1 AND (
				prior_attempts <> NEW."attempt_index" - 1
				OR NOT EXISTS (
					SELECT 1 FROM "sv_measurement_attempts"
					WHERE "organization_id" = NEW."organization_id"
						AND "base_slot_key" = NEW."base_slot_key"
						AND "attempt_index" = NEW."attempt_index" - 1
						AND "status" = 'RETRYABLE_FAILURE'
				)
			)) THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_SEQUENCE_BLOCKED';
		END IF;
		RETURN NEW;
	END IF;

	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_DELETE_BLOCKED';
	END IF;

	IF OLD."id" IS DISTINCT FROM NEW."id"
		OR OLD."reservation_id" IS DISTINCT FROM NEW."reservation_id"
		OR OLD."organization_id" IS DISTINCT FROM NEW."organization_id"
		OR OLD."measurement_cycle_id" IS DISTINCT FROM NEW."measurement_cycle_id"
		OR OLD."domain_id" IS DISTINCT FROM NEW."domain_id"
		OR OLD."observation_ref" IS DISTINCT FROM NEW."observation_ref"
		OR OLD."point_id" IS DISTINCT FROM NEW."point_id"
		OR OLD."item_id" IS DISTINCT FROM NEW."item_id"
		OR OLD."executor_id" IS DISTINCT FROM NEW."executor_id"
		OR OLD."repeat_index" IS DISTINCT FROM NEW."repeat_index"
		OR OLD."base_slot_key" IS DISTINCT FROM NEW."base_slot_key"
		OR OLD."attempt_index" IS DISTINCT FROM NEW."attempt_index"
		OR OLD."execution_key" IS DISTINCT FROM NEW."execution_key"
		OR OLD."reserved_cost_usd" IS DISTINCT FROM NEW."reserved_cost_usd"
		OR OLD."currency" IS DISTINCT FROM NEW."currency"
		OR OLD."surface_cap_usd" IS DISTINCT FROM NEW."surface_cap_usd"
		OR OLD."monthly_cap_usd" IS DISTINCT FROM NEW."monthly_cap_usd"
		OR OLD."price_snapshot_version" IS DISTINCT FROM NEW."price_snapshot_version"
		OR OLD."claimed_at" IS DISTINCT FROM NEW."claimed_at"
		OR OLD."created_at" IS DISTINCT FROM NEW."created_at" THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_IDENTITY_IMMUTABLE';
	END IF;

	IF OLD."lease_expires_at" IS DISTINCT FROM NEW."lease_expires_at"
		AND NOT (OLD."status" = 'CLAIMED' AND NEW."status" = 'CLAIMED'
			AND OLD."lease_expires_at" <= now()
			AND NEW."lease_expires_at" > now()
			AND NEW."lease_expires_at" > OLD."lease_expires_at") THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_LEASE_RENEWAL_BLOCKED';
	END IF;

	IF OLD."status" IS DISTINCT FROM NEW."status"
		AND NOT (
			(OLD."status" = 'CLAIMED' AND NEW."status" = 'SUBMITTED')
			OR (OLD."status" = 'SUBMITTED' AND NEW."status" IN (
				'SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE', 'UNKNOWN_RECONCILIATION'
			))
		) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_STATUS_TRANSITION_BLOCKED';
	END IF;

	IF OLD."budget_state" IS DISTINCT FROM NEW."budget_state"
		AND NOT (OLD."budget_state" = 'RESERVED' AND NEW."budget_state" IN ('SPENT', 'RELEASED')) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_BUDGET_TRANSITION_BLOCKED';
	END IF;

	IF OLD."status" = 'SUBMITTED' AND NEW."status" = 'UNKNOWN_RECONCILIATION'
		AND (NEW."budget_state" <> 'RESERVED' OR NEW."reconciled_at" IS NOT NULL
			OR NEW."reconciliation_ref" IS NOT NULL) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_UNKNOWN_MUST_RESERVE';
	END IF;

	IF OLD."budget_state" = NEW."budget_state"
		AND (OLD."spent_cost_usd" IS DISTINCT FROM NEW."spent_cost_usd"
			OR OLD."released_cost_usd" IS DISTINCT FROM NEW."released_cost_usd") THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_BUDGET_IMMUTABLE';
	END IF;

	IF NEW."budget_state" = 'SPENT' AND NOT EXISTS (
		SELECT 1 FROM "sv_cost_events"
		WHERE "id" = NEW."cost_event_id"
			AND "organization_id" = NEW."organization_id"
			AND "measurement_cycle_id" = NEW."measurement_cycle_id"
			AND "domain_id" = NEW."domain_id"
			AND "amount_usd" = NEW."spent_cost_usd"
	) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_COST_EVENT_MISMATCH';
	END IF;

	IF (OLD."provider_task_id" IS NOT NULL AND OLD."provider_task_id" IS DISTINCT FROM NEW."provider_task_id")
		OR (OLD."raw_ref" IS NOT NULL AND OLD."raw_ref" IS DISTINCT FROM NEW."raw_ref")
		OR (OLD."cost_event_id" IS NOT NULL AND OLD."cost_event_id" IS DISTINCT FROM NEW."cost_event_id")
		OR (OLD."submitted_at" IS NOT NULL AND OLD."submitted_at" IS DISTINCT FROM NEW."submitted_at")
		OR (OLD."completed_at" IS NOT NULL AND OLD."completed_at" IS DISTINCT FROM NEW."completed_at")
		OR (OLD."completed_at" IS NOT NULL AND (
			OLD."retry_reason" IS DISTINCT FROM NEW."retry_reason"
			OR OLD."final_invalid_reason" IS DISTINCT FROM NEW."final_invalid_reason"
			OR (OLD."reconciled_at" IS NOT NULL AND OLD."reconciled_at" IS DISTINCT FROM NEW."reconciled_at")
			OR (OLD."reconciliation_ref" IS NOT NULL
				AND OLD."reconciliation_ref" IS DISTINCT FROM NEW."reconciliation_ref")
		)) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_EVIDENCE_IMMUTABLE';
	END IF;

	NEW."updated_at" := now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_measurement_attempt_mutation"
	BEFORE INSERT OR UPDATE OR DELETE ON "sv_measurement_attempts"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_measurement_attempt_mutation"();
--> statement-breakpoint
CREATE FUNCTION "sv_prevent_cost_event_mutation"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'COST_EVENT_APPEND_ONLY';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_cost_event_mutation"
	BEFORE UPDATE OR DELETE ON "sv_cost_events"
	FOR EACH ROW EXECUTE FUNCTION "sv_prevent_cost_event_mutation"();
--> statement-breakpoint
CREATE OR REPLACE VIEW "sv_visibility_map_points" WITH (security_invoker = true) AS
SELECT
	observation."organization_id",
	entity."project_id",
	observation."location_id",
	min(observation."captured_at") OVER (
		PARTITION BY evidence."dataset_id", observation."location_id"
	) AS "period_start",
	max(observation."captured_at") OVER (
		PARTITION BY evidence."dataset_id", observation."location_id"
	) AS "period_end",
	evidence."dataset_id",
	local_cycle."measurement_cycle_id",
	local_cycle."id" AS "local_cycle_id",
	local_cycle."status"::text AS "dataset_status",
	observation."grid_definition_id",
	grid."version" AS "grid_definition_version",
	observation."grid_point_id",
	point."point_index",
	point."latitude",
	point."longitude",
	observation."id" AS "observation_id",
	observation."captured_at",
	observation."provider",
	observation."keyword_id",
	keyword."text" AS "keyword",
	keyword."language" AS "locale",
	observation."capture_mode" AS "device_context",
	grid."formula_version",
	observation."repeat_index",
	observation."validity"::text AS "source_validity",
	observation."invalid_reason",
	observation."target_rank",
	CASE
		WHEN observation."validity" = 'VALID' AND observation."target_rank" IS NOT NULL THEN 'MEASURED'
		WHEN observation."validity" = 'VALID' THEN 'MISSING'
		WHEN observation."validity" = 'INVALID' THEN 'INVALID'
		ELSE 'UNKNOWN'
	END AS "display_status",
	false AS "interpolated",
	'LIVE_VIEW'::text AS "materialization_kind",
	NULL::timestamptz AS "refreshed_at",
	false AS "is_stale"
FROM "sv_local_rank_observations" AS observation
JOIN "sv_local_scan_cycles" AS local_cycle
	ON local_cycle."id" = observation."cycle_id"
	AND local_cycle."organization_id" = observation."organization_id"
JOIN "sv_evidence_index" AS evidence
	ON evidence."organization_id" = observation."organization_id"
	AND evidence."domain_id" = local_cycle."domain_id"
	AND evidence."cycle_id" = local_cycle."measurement_cycle_id"
	AND evidence."observation_ref" = observation."id"::text
JOIN "sv_measurement_datasets" AS dataset
	ON dataset."id" = evidence."dataset_id"
	AND dataset."organization_id" = observation."organization_id"
	AND dataset."cycle_id" = local_cycle."measurement_cycle_id"
	AND dataset."immutable" = true
JOIN "sv_grid_definitions" AS grid
	ON grid."id" = observation."grid_definition_id"
	AND grid."organization_id" = observation."organization_id"
JOIN "sv_grid_points" AS point
	ON point."id" = observation."grid_point_id"
	AND point."grid_id" = observation."grid_definition_id"
	AND point."organization_id" = observation."organization_id"
JOIN "sv_local_keywords" AS keyword
	ON keyword."id" = observation."keyword_id"
	AND keyword."location_id" = observation."location_id"
	AND keyword."organization_id" = observation."organization_id"
JOIN "sv_business_locations" AS location
	ON location."id" = observation."location_id"
	AND location."organization_id" = observation."organization_id"
JOIN "sv_entities" AS entity
	ON entity."id" = location."entity_id"
	AND entity."organization_id" = observation."organization_id"
WHERE local_cycle."domain_id" IN ('LOCAL', 'LOCAL_MAPS');
