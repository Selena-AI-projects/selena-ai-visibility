LOCK TABLE "sv_measurement_attempts" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "sv_measurement_attempts") THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_0044_PREFLIGHT_REQUIRES_EMPTY_TABLE';
	END IF;
END;
$$;
--> statement-breakpoint
ALTER TABLE "sv_measurement_attempts"
	ADD COLUMN "row_version" bigint DEFAULT 1 NOT NULL,
	ADD COLUMN "submission_token_hash" text,
	ADD COLUMN "submitted_candidate_fingerprint" text,
	ADD COLUMN "submitted_candidate_canonical" text,
	ADD COLUMN "submitted_candidate" jsonb,
	ADD COLUMN "unknown_reason" text;
--> statement-breakpoint
ALTER TABLE "sv_measurement_attempts"
	ADD CONSTRAINT "sv_measurement_attempts_row_version_check"
		CHECK ("row_version" > 0),
	ADD CONSTRAINT "sv_measurement_attempts_submission_token_check"
		CHECK (
			(("status" = 'CLAIMED' AND "submission_token_hash" IS NULL)
			OR ("status" <> 'CLAIMED'
				AND "submission_token_hash" IS NOT NULL
				AND "submission_token_hash" ~ '^sha256:[a-f0-9]{64}$')) IS TRUE
		),
	ADD CONSTRAINT "sv_measurement_attempts_submitted_candidate_check"
		CHECK (
			(("status" = 'CLAIMED'
				AND "submitted_candidate_fingerprint" IS NULL
				AND "submitted_candidate_canonical" IS NULL
				AND "submitted_candidate" IS NULL)
			OR ("status" <> 'CLAIMED'
				AND "submitted_candidate_fingerprint" IS NOT NULL
				AND "submitted_candidate_canonical" IS NOT NULL
				AND "submitted_candidate" IS NOT NULL
				AND "submitted_candidate_fingerprint" = 'sha256:'
					|| encode(sha256(convert_to("submitted_candidate_canonical", 'UTF8')), 'hex')
				AND "submitted_candidate" = "submitted_candidate_canonical"::jsonb
				AND jsonb_typeof("submitted_candidate") = 'object'
				AND "submitted_candidate" ?& array[
					'schemaVersion', 'kind', 'mode', 'canonicalizationVersion', 'scope',
					'lockSnapshotCanonical', 'requestSnapshotCanonical', 'lock', 'slot',
					'keyword', 'providerRequest', 'attempt', 'budgetReservation'
				]
				AND "submitted_candidate"
					- 'schemaVersion'::text - 'kind'::text - 'mode'::text - 'canonicalizationVersion'::text
					- 'scope'::text - 'lockSnapshotCanonical'::text - 'requestSnapshotCanonical'::text
					- 'lock'::text - 'slot'::text - 'keyword'::text - 'providerRequest'::text - 'attempt'::text
					- 'budgetReservation'::text = '{}'::jsonb
				AND "submitted_candidate"->>'schemaVersion' = '1'
				AND "submitted_candidate"->>'kind' = 'LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE'
				AND "submitted_candidate"->>'mode' = 'LIVE_PROVIDER'
				AND "submitted_candidate"->>'canonicalizationVersion' = 'canonical-json-code-unit-v1'
				AND "submitted_candidate"#>>'{scope,organizationId}' = "organization_id"
				AND "submitted_candidate"#>>'{scope,measurementCycleId}' = "measurement_cycle_id"::text
				AND "submitted_candidate"#>>'{scope,domainId}' = 'LOCAL_MAPS'
				AND "domain_id" = 'LOCAL_MAPS'
				AND "submitted_candidate"#>>'{attempt,attemptId}' = "id"::text
				AND "submitted_candidate"#>>'{attempt,reservationId}' = "reservation_id"::text
				AND "submitted_candidate"#>>'{attempt,observationRef}' = "observation_ref"
				AND "submitted_candidate"#>>'{attempt,baseSlotKey}' = "base_slot_key"
				AND "submitted_candidate"#>>'{attempt,executionKey}' = "execution_key"
				AND "submitted_candidate"#>>'{attempt,attemptIndex}' = "attempt_index"::text
				AND "submitted_candidate"#>>'{attempt,statusSnapshot}' = 'SUBMITTED'
				AND ("submitted_candidate"#>>'{attempt,claimedAt}')::timestamptz = "claimed_at"
				AND ("submitted_candidate"#>>'{attempt,submittedAt}')::timestamptz = "submitted_at"
				AND ("submitted_candidate"#>>'{attempt,leaseExpiresAt}')::timestamptz = "lease_expires_at"
				AND "submitted_candidate"#>>'{slot,baseSlotKey}' = "base_slot_key"
				AND "submitted_candidate"#>>'{slot,pointId}' = "point_id"::text
				AND "submitted_candidate"#>>'{slot,keywordId}' = "item_id"::text
				AND "submitted_candidate"#>>'{keyword,id}' = "item_id"::text
				AND "submitted_candidate"#>>'{slot,repeatIndex}' = "repeat_index"::text
				AND "submitted_candidate"#>>'{providerRequest,repeatIndex}' = "repeat_index"::text
				AND "executor_id" !~* '^(stub|noop)(-|$)'
				AND "submitted_candidate"#>>'{providerRequest,provider,id}' = "executor_id"
				AND "submitted_candidate"#>>'{lock,provider,id}' = "executor_id"
				AND "submitted_candidate"#>>'{budgetReservation,currency}' = "currency"
				AND ("submitted_candidate"#>>'{budgetReservation,reservedCostUsd}')::numeric(12, 6)
					= "reserved_cost_usd"
				AND ("submitted_candidate"#>>'{budgetReservation,surfaceCapUsd}')::numeric(12, 6)
					= "surface_cap_usd"
				AND ("submitted_candidate"#>>'{budgetReservation,monthlyCapUsd}')::numeric(12, 6)
					= "monthly_cap_usd"
				AND "submitted_candidate"#>>'{budgetReservation,priceSnapshotVersion}'
					= "price_snapshot_version")) IS TRUE
		),
	ADD CONSTRAINT "sv_measurement_attempts_unknown_reason_check"
		CHECK (
			(("status" = 'UNKNOWN_RECONCILIATION'
				AND "unknown_reason" IS NOT NULL
				AND "unknown_reason" IN (
					'COMMITTED_SNAPSHOT_INVALID',
					'PROVIDER_CALL_THROWN',
					'PROVIDER_RESULT_INVALID',
					'FINALIZE_AMBIGUOUS',
					'FINALIZE_POSTCONDITION_MISMATCH',
					'ESTIMATED_ZERO_COST_UNRECONCILED',
					'PROVIDER_OUTCOME_UNKNOWN'
				))
			OR ("status" <> 'UNKNOWN_RECONCILIATION' AND "unknown_reason" IS NULL)) IS TRUE
		);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_attempts_submission_token_unique"
	ON "sv_measurement_attempts" ("submission_token_hash")
	WHERE "submission_token_hash" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_attempts_result_identity_unique"
	ON "sv_measurement_attempts" (
		"id", "organization_id", "measurement_cycle_id",
		"reservation_id", "execution_key", "attempt_index"
	);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_local_scan_cycles_result_identity_unique"
	ON "sv_local_scan_cycles" (
		"id", "organization_id", "measurement_cycle_id", "configuration_lock_id", "provider"
	);
--> statement-breakpoint
CREATE TABLE "sv_measurement_attempt_results" (
	"attempt_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"measurement_cycle_id" uuid NOT NULL,
	"local_cycle_id" uuid NOT NULL,
	"configuration_lock_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"reservation_id" uuid NOT NULL,
	"execution_key" text NOT NULL,
	"attempt_index" integer NOT NULL,
	"result_fingerprint" text NOT NULL,
	"result_canonical" text NOT NULL,
	"validated_result" jsonb NOT NULL,
	"disposition" jsonb NOT NULL,
	"budget_incident" text,
	"required_budget_state" text NOT NULL,
	"provider_task_id" text,
	"raw_response_reference" text,
	"raw_response_sha256" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_measurement_attempt_results_attempt_identity_fk"
		FOREIGN KEY (
			"attempt_id", "organization_id", "measurement_cycle_id",
			"reservation_id", "execution_key", "attempt_index"
		)
		REFERENCES "sv_measurement_attempts"(
			"id", "organization_id", "measurement_cycle_id",
			"reservation_id", "execution_key", "attempt_index"
		),
	CONSTRAINT "sv_measurement_attempt_results_local_cycle_identity_fk"
		FOREIGN KEY (
			"local_cycle_id", "organization_id", "measurement_cycle_id", "configuration_lock_id",
			"provider_id"
		)
		REFERENCES "sv_local_scan_cycles"(
			"id", "organization_id", "measurement_cycle_id", "configuration_lock_id", "provider"
		),
	CONSTRAINT "sv_measurement_attempt_results_fingerprint_check"
		CHECK (
			("result_fingerprint" = 'sha256:'
				|| encode(sha256(convert_to("result_canonical", 'UTF8')), 'hex')
			AND "validated_result" = "result_canonical"::jsonb) IS TRUE
		),
	CONSTRAINT "sv_measurement_attempt_results_identity_check"
		CHECK (
			(jsonb_typeof("validated_result") = 'object'
			AND "validated_result" ?& array[
				'schemaVersion', 'kind', 'mode', 'canonicalizationVersion',
				'storageClass', 'organizationId', 'measurementCycleId',
				'localCycleId', 'configurationLockId', 'attemptId',
				'reservationId', 'executionKey', 'attemptIndex',
				'lockSnapshotCanonical', 'requestSnapshotCanonical',
				'provider', 'externalProviderCalls', 'completedAt', 'event',
				'targetRank', 'evidenceEligible', 'provenance', 'cost'
			]
			AND "validated_result"->>'schemaVersion' = '1'
			AND "validated_result"->>'canonicalizationVersion' = 'canonical-json-code-unit-v1'
			AND "validated_result"->>'kind' = 'LOCAL_MAPS_LIVE_PROVIDER_RESULT'
			AND "validated_result"->>'mode' = 'LIVE_PROVIDER'
			AND "validated_result"->>'storageClass' = 'LIVE_ATTEMPT'
			AND "validated_result"->>'organizationId' = "organization_id"
			AND "validated_result"->>'measurementCycleId' = "measurement_cycle_id"::text
			AND "validated_result"->>'localCycleId' = "local_cycle_id"::text
			AND "validated_result"->>'configurationLockId' = "configuration_lock_id"::text
			AND "validated_result"->>'attemptId' = "attempt_id"::text
			AND "validated_result"->>'reservationId' = "reservation_id"::text
			AND "validated_result"->>'executionKey' = "execution_key"
			AND "validated_result"->>'attemptIndex' = "attempt_index"::text
			AND "validated_result"#>>'{provider,id}' = "provider_id"
			AND "validated_result"->>'externalProviderCalls' = '1') IS TRUE
		),
	CONSTRAINT "sv_measurement_attempt_results_live_shape_check"
		CHECK (
			("validated_result"
				- 'schemaVersion'::text - 'kind'::text - 'mode'::text - 'canonicalizationVersion'::text
				- 'storageClass'::text - 'organizationId'::text - 'measurementCycleId'::text
				- 'localCycleId'::text - 'configurationLockId'::text - 'attemptId'::text
				- 'reservationId'::text - 'executionKey'::text - 'attemptIndex'::text
				- 'lockSnapshotCanonical'::text - 'requestSnapshotCanonical'::text - 'provider'::text
				- 'externalProviderCalls'::text - 'completedAt'::text - 'event'::text - 'targetRank'::text
				- 'evidenceEligible'::text - 'provenance'::text - 'cost'::text = '{}'::jsonb
			AND jsonb_typeof("validated_result"->'schemaVersion') = 'number'
			AND jsonb_typeof("validated_result"->'kind') = 'string'
			AND jsonb_typeof("validated_result"->'mode') = 'string'
			AND jsonb_typeof("validated_result"->'canonicalizationVersion') = 'string'
			AND jsonb_typeof("validated_result"->'storageClass') = 'string'
			AND jsonb_typeof("validated_result"->'organizationId') = 'string'
			AND jsonb_typeof("validated_result"->'measurementCycleId') = 'string'
			AND jsonb_typeof("validated_result"->'localCycleId') = 'string'
			AND jsonb_typeof("validated_result"->'configurationLockId') = 'string'
			AND jsonb_typeof("validated_result"->'attemptId') = 'string'
			AND jsonb_typeof("validated_result"->'reservationId') = 'string'
			AND jsonb_typeof("validated_result"->'executionKey') = 'string'
			AND jsonb_typeof("validated_result"->'attemptIndex') = 'number'
			AND jsonb_typeof("validated_result"->'lockSnapshotCanonical') = 'string'
			AND length("validated_result"->>'lockSnapshotCanonical') > 0
			AND jsonb_typeof("validated_result"->'requestSnapshotCanonical') = 'string'
			AND length("validated_result"->>'requestSnapshotCanonical') > 0
			AND jsonb_typeof("validated_result"->'externalProviderCalls') = 'number'
			AND jsonb_typeof("validated_result"->'completedAt') = 'string'
			AND jsonb_typeof("validated_result"->'evidenceEligible') = 'boolean'
			AND jsonb_typeof("validated_result"->'provider') = 'object'
			AND "validated_result"->'provider' ?& array['id', 'version', 'providerTaskId']
			AND ("validated_result"->'provider') - 'id'::text - 'version'::text - 'providerTaskId'::text = '{}'::jsonb
			AND jsonb_typeof("validated_result"#>'{provider,id}') = 'string'
			AND length("validated_result"#>>'{provider,id}') > 0
			AND "validated_result"#>>'{provider,id}' !~ '[[:space:]]'
			AND "validated_result"#>>'{provider,id}' !~* '^(stub|noop)(-|$)'
			AND jsonb_typeof("validated_result"#>'{provider,version}') = 'string'
			AND length("validated_result"#>>'{provider,version}') > 0
			AND "validated_result"#>>'{provider,version}' !~ '[[:space:]]'
			AND jsonb_typeof("validated_result"#>'{provider,providerTaskId}') IN ('string', 'null')
			AND jsonb_typeof("validated_result"->'event') = 'object'
			AND jsonb_typeof("validated_result"->'provenance') = 'object'
			AND "validated_result"->'provenance' ?& array[
				'evidenceKind', 'checkReference', 'rawResponseReference', 'rawResponseSha256', 'providerObservedAt'
			]
				AND ("validated_result"->'provenance')
				- 'evidenceKind'::text - 'checkReference'::text - 'rawResponseReference'::text - 'rawResponseSha256'::text - 'providerObservedAt'::text
				= '{}'::jsonb
			AND "validated_result"#>>'{provenance,evidenceKind}' = 'MAPS_SERP_PROVIDER'
			AND (
				jsonb_typeof("validated_result"#>'{provenance,checkReference}') = 'string'
				OR jsonb_typeof("validated_result"#>'{provenance,checkReference}') = 'null'
			)
			AND (
				jsonb_typeof("validated_result"#>'{provenance,checkReference}') = 'null'
				OR (
					length("validated_result"#>>'{provenance,checkReference}') > 0
					AND "validated_result"#>>'{provenance,checkReference}' !~ '[[:space:]]'
					AND "validated_result"#>>'{provenance,checkReference}' !~* '^(stub-local-maps:|stub:)'
				)
			)
			AND jsonb_typeof("validated_result"#>'{provenance,rawResponseReference}') IN ('string', 'null')
			AND jsonb_typeof("validated_result"#>'{provenance,rawResponseSha256}') IN ('string', 'null')
			AND jsonb_typeof("validated_result"#>'{provenance,providerObservedAt}') IN ('string', 'null')
			AND jsonb_typeof("validated_result"->'cost') = 'object'
			AND "validated_result"->'cost' ?& array['status', 'currency', 'amountUsd', 'basis']
			AND ("validated_result"->'cost') - 'status'::text - 'currency'::text - 'amountUsd'::text - 'basis'::text = '{}'::jsonb
			AND jsonb_typeof("validated_result"#>'{cost,status}') = 'string'
			AND "validated_result"#>>'{cost,currency}' = 'USD'
			AND (
				("validated_result"->'event' = '{"kind":"FOUND"}'::jsonb
					AND jsonb_typeof("validated_result"->'targetRank') = 'number'
					AND mod(("validated_result"->>'targetRank')::numeric, 1) = 0
					AND ("validated_result"->>'targetRank')::numeric BETWEEN 1 AND 20
					AND "validated_result"->>'evidenceEligible' = 'true'
					AND "validated_result"#>>'{cost,status}' = 'KNOWN'
					AND jsonb_typeof("validated_result"#>'{cost,amountUsd}') = 'string'
					AND jsonb_typeof("validated_result"#>'{cost,basis}') = 'string'
					AND jsonb_typeof("validated_result"#>'{provenance,checkReference}') = 'string'
					AND jsonb_typeof("validated_result"#>'{provenance,rawResponseReference}') = 'string'
					AND jsonb_typeof("validated_result"#>'{provenance,rawResponseSha256}') = 'string'
					AND jsonb_typeof("validated_result"#>'{provenance,providerObservedAt}') = 'string')
				OR ("validated_result"->'event' = '{"kind":"ABSENT_WITHIN_DEPTH"}'::jsonb
					AND jsonb_typeof("validated_result"->'targetRank') = 'null'
					AND "validated_result"->>'evidenceEligible' = 'true'
					AND "validated_result"#>>'{cost,status}' = 'KNOWN'
					AND jsonb_typeof("validated_result"#>'{cost,amountUsd}') = 'string'
					AND jsonb_typeof("validated_result"#>'{cost,basis}') = 'string'
					AND jsonb_typeof("validated_result"#>'{provenance,checkReference}') = 'string'
					AND jsonb_typeof("validated_result"#>'{provenance,rawResponseReference}') = 'string'
					AND jsonb_typeof("validated_result"#>'{provenance,rawResponseSha256}') = 'string'
					AND jsonb_typeof("validated_result"#>'{provenance,providerObservedAt}') = 'string')
				OR (("validated_result"#>>'{event,kind}' = 'RETRYABLE_FAILURE'
						AND ("validated_result"->'event') - 'kind'::text - 'reason'::text = '{}'::jsonb
						AND "validated_result"#>>'{event,reason}' IN (
							'EMPTY_RESPONSE', 'TRUNCATED_RESPONSE', 'TIMEOUT',
							'PROVIDER_5XX', 'RATE_LIMITED', 'MALFORMED_RESPONSE'
						))
					OR "validated_result"->'event' = '{"kind":"PROVIDER_AUTH_FAILURE"}'::jsonb)
					AND jsonb_typeof("validated_result"->'targetRank') = 'null'
					AND "validated_result"->>'evidenceEligible' = 'false'
					AND "validated_result"#>>'{cost,status}' = 'KNOWN'
					AND jsonb_typeof("validated_result"#>'{cost,amountUsd}') = 'string'
					AND jsonb_typeof("validated_result"#>'{cost,basis}') = 'string'
					AND jsonb_typeof("validated_result"#>'{provenance,checkReference}') IN ('string', 'null')
					AND ((jsonb_typeof("validated_result"#>'{provenance,rawResponseReference}') = 'null'
						AND jsonb_typeof("validated_result"#>'{provenance,rawResponseSha256}') = 'null'
						AND jsonb_typeof("validated_result"#>'{provenance,providerObservedAt}') = 'null')
						OR (jsonb_typeof("validated_result"#>'{provenance,rawResponseReference}') = 'string'
							AND jsonb_typeof("validated_result"#>'{provenance,rawResponseSha256}') = 'string'
							AND jsonb_typeof("validated_result"#>'{provenance,providerObservedAt}') = 'string'))
				OR ("validated_result"->'event' = '{"kind":"OUTCOME_UNKNOWN"}'::jsonb
					AND jsonb_typeof("validated_result"->'targetRank') = 'null'
					AND "validated_result"->>'evidenceEligible' = 'false'
					AND "validated_result"#>>'{cost,status}' = 'UNKNOWN'
					AND jsonb_typeof("validated_result"#>'{cost,amountUsd}') = 'null'
					AND jsonb_typeof("validated_result"#>'{cost,basis}') = 'null'
					AND jsonb_typeof("validated_result"#>'{provenance,checkReference}') IN ('string', 'null')
					AND ((jsonb_typeof("validated_result"#>'{provenance,rawResponseReference}') = 'null'
						AND jsonb_typeof("validated_result"#>'{provenance,rawResponseSha256}') = 'null'
						AND jsonb_typeof("validated_result"#>'{provenance,providerObservedAt}') = 'null')
						OR (jsonb_typeof("validated_result"#>'{provenance,rawResponseReference}') = 'string'
							AND jsonb_typeof("validated_result"#>'{provenance,rawResponseSha256}') = 'string'
							AND jsonb_typeof("validated_result"#>'{provenance,providerObservedAt}') = 'string')))
			)) IS TRUE
		),
	CONSTRAINT "sv_measurement_attempt_results_disposition_check"
		CHECK (
			(jsonb_typeof("disposition") = 'object'
			AND "disposition" ?& array[
				'attemptStatus', 'observationValidity', 'observationOutcome',
				'cycleStatus', 'retryAllowed', 'finalInvalidReason'
			]
			AND "disposition"
				- 'attemptStatus'::text - 'observationValidity'::text - 'observationOutcome'::text
				- 'cycleStatus'::text - 'retryAllowed'::text - 'finalInvalidReason'::text = '{}'::jsonb
			AND "disposition"->>'attemptStatus' IN (
				'SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE', 'UNKNOWN_RECONCILIATION'
			)
			AND "disposition"->>'observationValidity' IN ('VALID', 'INVALID', 'UNMEASURED')
			AND "disposition"->>'observationOutcome' IN (
				'FOUND', 'ABSENT_WITHIN_DEPTH', 'RETRY_PENDING', 'PROVIDER_ERROR',
				'PROVIDER_BLOCKED', 'PREFLIGHT_BLOCKED', 'UNKNOWN_RECONCILIATION'
			)
			AND "disposition"->>'cycleStatus' IN (
				'RUNNING', 'PARTIAL_FAILURE', 'PROVIDER_BLOCKED', 'PREFLIGHT_BLOCKED', 'STOPPED'
			)
			AND jsonb_typeof("disposition"->'retryAllowed') = 'boolean'
			AND jsonb_typeof("disposition"->'finalInvalidReason') IN ('string', 'null')) IS TRUE
		),
	CONSTRAINT "sv_measurement_attempt_results_budget_check"
		CHECK (
			("required_budget_state" IN ('RESERVED', 'SPENT', 'RELEASED')
			AND ("budget_incident" IS NULL
				OR "budget_incident" = 'REPORTED_COST_EXCEEDS_RESERVATION')) IS TRUE
		),
	CONSTRAINT "sv_measurement_attempt_results_provenance_check"
		CHECK (
			(("provider_task_id" IS NULL OR (
				length("provider_task_id") > 0 AND "provider_task_id" !~ '[[:space:]]'
			))
			AND (
				("raw_response_reference" IS NULL AND "raw_response_sha256" IS NULL)
				OR ("raw_response_reference" IS NOT NULL
					AND "raw_response_sha256" IS NOT NULL
					AND length("raw_response_reference") > 0
					AND "raw_response_reference" !~ '[[:space:]]'
					AND "raw_response_reference" !~* '^(stub-local-maps:|stub:)'
					AND "raw_response_sha256" ~ '^sha256:[a-f0-9]{64}$')
			)
			AND ("validated_result"#>>'{provider,providerTaskId}')
				IS NOT DISTINCT FROM "provider_task_id"
			AND ("validated_result"#>>'{provenance,rawResponseReference}')
				IS NOT DISTINCT FROM "raw_response_reference"
			AND ("validated_result"#>>'{provenance,rawResponseSha256}')
				IS NOT DISTINCT FROM "raw_response_sha256"
			AND (coalesce(("validated_result"->>'evidenceEligible')::boolean, false) = false
				OR "raw_response_reference" IS NOT NULL)) IS TRUE
		)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_measurement_attempt_results_org_fingerprint_unique"
	ON "sv_measurement_attempt_results" ("organization_id", "result_fingerprint");
--> statement-breakpoint
CREATE INDEX "sv_measurement_attempt_results_org_created_idx"
	ON "sv_measurement_attempt_results" ("organization_id", "created_at");
--> statement-breakpoint
ALTER TABLE "sv_measurement_attempt_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_measurement_attempt_results"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_guard_measurement_attempt_mutation"() RETURNS trigger AS $$
DECLARE
	prior_attempts integer;
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" <> 'CLAIMED' OR NEW."budget_state" <> 'RESERVED' THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_INITIAL_STATE_BLOCKED';
		END IF;
		IF NEW."row_version" <> 1 THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_ROW_VERSION_BLOCKED';
		END IF;
		IF NEW."submission_token_hash" IS NOT NULL
			OR NEW."submitted_candidate_fingerprint" IS NOT NULL
			OR NEW."submitted_candidate_canonical" IS NOT NULL
			OR NEW."submitted_candidate" IS NOT NULL
			OR NEW."unknown_reason" IS NOT NULL THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_INITIAL_PERSISTENCE_STATE_BLOCKED';
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

	IF NEW."row_version" IS DISTINCT FROM OLD."row_version" THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_ROW_VERSION_BLOCKED';
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

	IF OLD."submission_token_hash" IS DISTINCT FROM NEW."submission_token_hash"
		AND NOT (OLD."status" = 'CLAIMED' AND NEW."status" = 'SUBMITTED'
			AND OLD."submission_token_hash" IS NULL
			AND NEW."submission_token_hash" ~ '^sha256:[a-f0-9]{64}$') THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_SUBMISSION_TOKEN_IMMUTABLE';
	END IF;

	IF (OLD."submitted_candidate_fingerprint" IS DISTINCT FROM NEW."submitted_candidate_fingerprint"
		OR OLD."submitted_candidate_canonical" IS DISTINCT FROM NEW."submitted_candidate_canonical"
		OR OLD."submitted_candidate" IS DISTINCT FROM NEW."submitted_candidate")
		AND NOT (OLD."status" = 'CLAIMED' AND NEW."status" = 'SUBMITTED'
			AND OLD."submitted_candidate_fingerprint" IS NULL
			AND OLD."submitted_candidate_canonical" IS NULL
			AND OLD."submitted_candidate" IS NULL
			AND NEW."submitted_candidate_fingerprint" IS NOT NULL
			AND NEW."submitted_candidate_canonical" IS NOT NULL
			AND NEW."submitted_candidate" IS NOT NULL) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_SUBMITTED_CANDIDATE_IMMUTABLE';
	END IF;

	IF OLD."status" = 'CLAIMED' AND NEW."status" = 'SUBMITTED' THEN
		PERFORM 1
		FROM "sv_local_scan_cycles"
		WHERE "id" = (NEW."submitted_candidate"#>>'{scope,localCycleId}')::uuid
			AND "organization_id" = NEW."organization_id"
			AND "measurement_cycle_id" = NEW."measurement_cycle_id"
			AND "configuration_lock_id" =
				(NEW."submitted_candidate"#>>'{scope,configurationLockId}')::uuid
			AND "domain_id" = 'LOCAL_MAPS'
			AND "provider" = NEW."executor_id"
		FOR KEY SHARE;
		IF NOT FOUND THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_SUBMITTED_LOCAL_CYCLE_MISMATCH';
		END IF;
	END IF;

	IF OLD."unknown_reason" IS DISTINCT FROM NEW."unknown_reason"
		AND NOT (OLD."status" = 'SUBMITTED' AND NEW."status" = 'UNKNOWN_RECONCILIATION'
			AND OLD."unknown_reason" IS NULL AND NEW."unknown_reason" IS NOT NULL) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_UNKNOWN_REASON_IMMUTABLE';
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

	NEW."row_version" := OLD."row_version" + 1;
	NEW."updated_at" := now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE FUNCTION "sv_guard_measurement_attempt_result_insert"() RETURNS trigger AS $$
DECLARE
	parent_attempt "sv_measurement_attempts"%ROWTYPE;
	cost_status text;
	cost_amount_text text;
	cost_amount numeric(12, 6);
	cost_basis text;
	result_event text;
	event_reason text;
	expected_attempt_status text;
	expected_observation_validity text;
	expected_observation_outcome text;
	expected_cycle_status text;
	expected_retry_allowed text;
	expected_final_invalid_reason text;
	expected_budget_state text;
	expected_budget_incident text;
	provider_observed_at timestamptz;
BEGIN
	SELECT * INTO parent_attempt
	FROM "sv_measurement_attempts"
	WHERE "id" = NEW."attempt_id"
		AND "organization_id" = NEW."organization_id"
		AND "measurement_cycle_id" = NEW."measurement_cycle_id"
		AND "reservation_id" = NEW."reservation_id"
		AND "execution_key" = NEW."execution_key"
		AND "attempt_index" = NEW."attempt_index"
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_PARENT_MISMATCH';
	END IF;

	IF parent_attempt."submitted_candidate" IS NULL
		OR NEW."local_cycle_id"::text IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{scope,localCycleId}'
		OR NEW."configuration_lock_id"::text IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{scope,configurationLockId}'
		OR NEW."provider_id" IS DISTINCT FROM parent_attempt."executor_id"
		OR NEW."validated_result"->>'organizationId' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{scope,organizationId}'
		OR NEW."validated_result"->>'measurementCycleId' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{scope,measurementCycleId}'
		OR NEW."validated_result"->>'attemptId' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{attempt,attemptId}'
		OR NEW."validated_result"->>'reservationId' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{attempt,reservationId}'
		OR NEW."validated_result"->>'executionKey' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{attempt,executionKey}'
		OR NEW."validated_result"->>'attemptIndex' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{attempt,attemptIndex}'
		OR NEW."validated_result"->>'lockSnapshotCanonical' IS DISTINCT FROM
			parent_attempt."submitted_candidate"->>'lockSnapshotCanonical'
		OR NEW."validated_result"->>'requestSnapshotCanonical' IS DISTINCT FROM
			parent_attempt."submitted_candidate"->>'requestSnapshotCanonical'
		OR NEW."validated_result"#>>'{provider,id}' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{providerRequest,provider,id}'
		OR NEW."validated_result"#>>'{provider,version}' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{providerRequest,provider,version}' THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_SUBMITTED_CANDIDATE_MISMATCH';
	END IF;

	IF parent_attempt."status" NOT IN (
		'SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE', 'UNKNOWN_RECONCILIATION'
	) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_PRETERMINAL_BLOCKED';
	END IF;

	IF (NEW."validated_result"->>'completedAt')::timestamptz
		IS DISTINCT FROM parent_attempt."completed_at" THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_COMPLETED_AT_MISMATCH';
	END IF;
	IF NEW."validated_result"#>>'{provenance,providerObservedAt}' IS NOT NULL THEN
		provider_observed_at :=
			(NEW."validated_result"#>>'{provenance,providerObservedAt}')::timestamptz;
		IF provider_observed_at < parent_attempt."submitted_at"
			OR provider_observed_at > parent_attempt."completed_at" THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_OBSERVED_AT_OUTSIDE_ATTEMPT';
		END IF;
	END IF;

	IF parent_attempt."status" IS DISTINCT FROM NEW."disposition"->>'attemptStatus' THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_DISPOSITION_MISMATCH';
	END IF;

	IF parent_attempt."budget_state" IS DISTINCT FROM NEW."required_budget_state" THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_BUDGET_STATE_MISMATCH';
	END IF;

	IF parent_attempt."provider_task_id" IS DISTINCT FROM NEW."provider_task_id"
		OR parent_attempt."raw_ref" IS DISTINCT FROM NEW."raw_response_reference" THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_PROVENANCE_MISMATCH';
	END IF;

	IF jsonb_typeof(NEW."validated_result"->'cost') <> 'object'
		OR NOT (NEW."validated_result"->'cost' ?& array['status', 'currency', 'amountUsd', 'basis'])
		OR NEW."validated_result"#>>'{cost,currency}' IS DISTINCT FROM 'USD' THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_COST_INVALID';
	END IF;

	cost_status := NEW."validated_result"#>>'{cost,status}';
	cost_amount_text := NEW."validated_result"#>>'{cost,amountUsd}';
	cost_basis := NEW."validated_result"#>>'{cost,basis}';
	result_event := NEW."validated_result"#>>'{event,kind}';
	event_reason := NEW."validated_result"#>>'{event,reason}';
	IF result_event IS DISTINCT FROM 'RETRYABLE_FAILURE' AND event_reason IS NOT NULL THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_EVENT_REASON_INVALID';
	END IF;

	IF result_event IN ('FOUND', 'ABSENT_WITHIN_DEPTH') THEN
		expected_attempt_status := 'SUCCEEDED';
		expected_observation_validity := 'VALID';
		expected_observation_outcome := result_event;
		expected_cycle_status := 'RUNNING';
		expected_retry_allowed := 'false';
		expected_final_invalid_reason := NULL;
	ELSIF result_event = 'RETRYABLE_FAILURE' THEN
		IF event_reason IS NULL OR event_reason NOT IN (
			'EMPTY_RESPONSE', 'TRUNCATED_RESPONSE', 'TIMEOUT',
			'PROVIDER_5XX', 'RATE_LIMITED', 'MALFORMED_RESPONSE'
		) THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_RETRY_REASON_INVALID';
		END IF;
		IF NEW."attempt_index" < 3 THEN
			expected_attempt_status := 'RETRYABLE_FAILURE';
			expected_observation_validity := 'UNMEASURED';
			expected_observation_outcome := 'RETRY_PENDING';
			expected_cycle_status := 'RUNNING';
			expected_retry_allowed := 'true';
			expected_final_invalid_reason := NULL;
		ELSE
			expected_attempt_status := 'TERMINAL_FAILURE';
			expected_observation_validity := 'INVALID';
			expected_observation_outcome := 'PROVIDER_ERROR';
			expected_cycle_status := 'PARTIAL_FAILURE';
			expected_retry_allowed := 'false';
			expected_final_invalid_reason := CASE
				WHEN event_reason IN ('EMPTY_RESPONSE', 'TRUNCATED_RESPONSE')
					THEN 'EMPTY_AFTER_3_ATTEMPTS'
				WHEN event_reason IN ('TIMEOUT', 'PROVIDER_5XX')
					THEN 'PROVIDER_UNAVAILABLE'
				WHEN event_reason = 'RATE_LIMITED' THEN 'RATE_LIMIT_EXHAUSTED'
				WHEN event_reason = 'MALFORMED_RESPONSE' THEN 'MALFORMED_AFTER_3_ATTEMPTS'
			END;
		END IF;
	ELSIF result_event = 'PROVIDER_AUTH_FAILURE' THEN
		expected_attempt_status := 'TERMINAL_FAILURE';
		expected_observation_validity := 'UNMEASURED';
		expected_observation_outcome := 'PROVIDER_BLOCKED';
		expected_cycle_status := 'PROVIDER_BLOCKED';
		expected_retry_allowed := 'false';
		expected_final_invalid_reason := NULL;
	ELSIF result_event = 'OUTCOME_UNKNOWN' THEN
		expected_attempt_status := 'UNKNOWN_RECONCILIATION';
		expected_observation_validity := 'UNMEASURED';
		expected_observation_outcome := 'UNKNOWN_RECONCILIATION';
		expected_cycle_status := 'STOPPED';
		expected_retry_allowed := 'false';
		expected_final_invalid_reason := NULL;
	ELSIF result_event = 'LOCKED_REQUEST_INVALID' THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_NON_LIVE_EVENT_BLOCKED';
	ELSE
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_EVENT_INVALID';
	END IF;

	IF NEW."disposition"->>'attemptStatus' IS DISTINCT FROM expected_attempt_status
		OR NEW."disposition"->>'observationValidity' IS DISTINCT FROM expected_observation_validity
		OR NEW."disposition"->>'observationOutcome' IS DISTINCT FROM expected_observation_outcome
		OR NEW."disposition"->>'cycleStatus' IS DISTINCT FROM expected_cycle_status
		OR NEW."disposition"->>'retryAllowed' IS DISTINCT FROM expected_retry_allowed
		OR NEW."disposition"->>'finalInvalidReason' IS DISTINCT FROM expected_final_invalid_reason THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_EXACT_DISPOSITION_MISMATCH';
	END IF;
	IF parent_attempt."retry_reason" IS DISTINCT FROM event_reason
		OR parent_attempt."final_invalid_reason" IS DISTINCT FROM expected_final_invalid_reason THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_PARENT_REASON_MISMATCH';
	END IF;

	IF cost_status = 'UNKNOWN' THEN
		IF cost_amount_text IS NOT NULL OR cost_basis IS NOT NULL
			OR result_event IS DISTINCT FROM 'OUTCOME_UNKNOWN' THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_UNKNOWN_COST_INVALID';
		END IF;
		expected_budget_state := 'RESERVED';
		expected_budget_incident := NULL;
		IF parent_attempt."spent_cost_usd" <> 0
			OR parent_attempt."released_cost_usd" <> 0
			OR parent_attempt."cost_event_id" IS NOT NULL THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_UNKNOWN_PARENT_COST_MISMATCH';
		END IF;
	ELSIF cost_status = 'KNOWN' THEN
		IF cost_amount_text IS NULL
			OR cost_amount_text !~ '^(0|[1-9][0-9]*)([.][0-9]{1,6})?$'
			OR cost_basis IS NULL OR cost_basis NOT IN ('actual', 'estimated')
			OR result_event IS NOT DISTINCT FROM 'OUTCOME_UNKNOWN' THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_KNOWN_COST_INVALID';
		END IF;
		cost_amount := cost_amount_text::numeric(12, 6);
		IF cost_amount > 0 THEN
			expected_budget_state := 'SPENT';
			IF parent_attempt."spent_cost_usd" IS DISTINCT FROM cost_amount
				OR parent_attempt."released_cost_usd" IS DISTINCT FROM
					greatest(parent_attempt."reserved_cost_usd" - cost_amount, 0)
				OR parent_attempt."cost_event_id" IS NULL THEN
				RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_SPENT_PARENT_COST_MISMATCH';
			END IF;
		ELSIF cost_basis = 'actual' THEN
			expected_budget_state := 'RELEASED';
			IF parent_attempt."spent_cost_usd" <> 0
				OR parent_attempt."released_cost_usd" IS DISTINCT FROM parent_attempt."reserved_cost_usd"
				OR parent_attempt."cost_event_id" IS NOT NULL THEN
				RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_RELEASED_PARENT_COST_MISMATCH';
			END IF;
		ELSE
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_ESTIMATED_ZERO_BLOCKED';
		END IF;
		expected_budget_incident := CASE
			WHEN cost_amount > parent_attempt."reserved_cost_usd"
				THEN 'REPORTED_COST_EXCEEDS_RESERVATION'
			ELSE NULL
		END;
	ELSE
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_COST_STATUS_INVALID';
	END IF;

	IF NEW."required_budget_state" IS DISTINCT FROM expected_budget_state
		OR NEW."budget_incident" IS DISTINCT FROM expected_budget_incident THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_COST_MAPPING_MISMATCH';
	END IF;

	IF parent_attempt."status" = 'UNKNOWN_RECONCILIATION'
		AND (result_event IS DISTINCT FROM 'OUTCOME_UNKNOWN'
			OR parent_attempt."unknown_reason" IS DISTINCT FROM 'PROVIDER_OUTCOME_UNKNOWN') THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_UNKNOWN_REASON_MISMATCH';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_measurement_attempt_result_insert"
	BEFORE INSERT ON "sv_measurement_attempt_results"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_measurement_attempt_result_insert"();
--> statement-breakpoint
CREATE FUNCTION "sv_prevent_measurement_attempt_result_mutation"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_APPEND_ONLY';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_measurement_attempt_result_mutation"
	BEFORE UPDATE OR DELETE ON "sv_measurement_attempt_results"
	FOR EACH ROW EXECUTE FUNCTION "sv_prevent_measurement_attempt_result_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_measurement_attempt_result_truncate"
	BEFORE TRUNCATE ON "sv_measurement_attempt_results"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_prevent_measurement_attempt_result_mutation"();
