-- Canary raw payloads have a separate deduplication namespace.
DROP INDEX sv_source_snapshots_project_content_sha256_unique;
DROP INDEX sv_source_snapshots_legacy_org_content_sha256_unique;
CREATE UNIQUE INDEX sv_source_snapshots_project_content_sha256_unique ON sv_source_snapshots(organization_id,project_id,content_sha256) WHERE project_id IS NOT NULL AND source_type <> 'LOCAL_MAPS_CANARY_ONLY';
CREATE UNIQUE INDEX sv_source_snapshots_legacy_org_content_sha256_unique ON sv_source_snapshots(organization_id,content_sha256) WHERE project_id IS NULL AND source_type <> 'LOCAL_MAPS_CANARY_ONLY';
CREATE UNIQUE INDEX sv_source_snapshots_canary_hash_unique ON sv_source_snapshots(organization_id,coalesce(project_id,'00000000-0000-0000-0000-000000000000'::uuid),content_sha256) WHERE source_type = 'LOCAL_MAPS_CANARY_ONLY';

CREATE FUNCTION sv_local_budget_incident_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='BUDGET_BLOCKED' AND (NEW.status<>'BUDGET_BLOCKED' OR NEW.emergency_stopped_at IS DISTINCT FROM OLD.emergency_stopped_at)
 THEN RAISE EXCEPTION 'LOCAL_BUDGET_INCIDENT_RECONCILIATION_REQUIRED'; END IF;
 IF NEW.status='CANARY_REVIEW' AND (NEW.emergency_stopped_at IS NOT NULL OR EXISTS (
  SELECT 1 FROM sv_measurement_attempt_results r WHERE r.organization_id=NEW.organization_id AND r.local_cycle_id=NEW.id AND r.budget_incident IS NOT NULL
 )) THEN RAISE EXCEPTION 'LOCAL_CANARY_BUDGET_INCIDENT'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_budget_incident_guard BEFORE UPDATE ON sv_local_scan_cycles FOR EACH ROW EXECUTE FUNCTION sv_local_budget_incident_guard();

CREATE FUNCTION sv_local_customer_source_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM sv_source_snapshots s WHERE s.id=NEW.source_snapshot_id AND s.organization_id=NEW.organization_id AND s.source_type='LOCAL_MAPS_CANARY_ONLY')
 THEN RAISE EXCEPTION 'LOCAL_CANARY_CUSTOMER_EVIDENCE_FORBIDDEN'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_customer_source_guard BEFORE INSERT OR UPDATE ON sv_evidence_index FOR EACH ROW EXECUTE FUNCTION sv_local_customer_source_guard();

CREATE OR REPLACE FUNCTION sv_local_pilot_canary_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c sv_local_scan_cycles%ROWTYPE; a sv_measurement_attempts%ROWTYPE;
BEGIN
 SELECT * INTO c FROM sv_local_scan_cycles WHERE id=NEW.local_cycle_id AND organization_id=NEW.organization_id FOR UPDATE;
 SELECT * INTO a FROM sv_measurement_attempts WHERE id=NEW.attempt_id AND organization_id=NEW.organization_id;
 IF c.id IS NULL OR a.id IS NULL OR c.execution_mode<>'CANARY' OR c.status<>'CANARY_REVIEW'
  OR c.provider_contract_digest<>NEW.provider_contract_digest OR c.measurement_cycle_id<>a.measurement_cycle_id
  OR c.emergency_stopped_at IS NOT NULL
  OR EXISTS(SELECT 1 FROM sv_measurement_attempt_results r WHERE r.organization_id=c.organization_id AND r.local_cycle_id=c.id AND r.budget_incident IS NOT NULL)
  OR a.status<>'SUCCEEDED' OR a.spent_cost_usd<>NEW.actual_cost_usd
  OR NOT EXISTS(SELECT 1 FROM sv_grid_points p WHERE p.id=a.point_id AND p.grid_id=c.grid_definition_id AND p.organization_id=c.organization_id AND p.point_index=4)
  OR NOT EXISTS(SELECT 1 FROM sv_source_snapshots s WHERE s.id=NEW.evidence_id AND s.organization_id=c.organization_id AND s.source_type='LOCAL_MAPS_CANARY_ONLY' AND s.source_ref=a.raw_ref AND s.content_sha256 IS NOT NULL)
  THEN RAISE EXCEPTION 'LOCAL_CANARY_REVIEW_EVIDENCE_INVALID'; END IF;
 RETURN NEW;
END; $$;

-- Local validation is separate from formal owner-only cross-product acceptance.
CREATE OR REPLACE FUNCTION sv_local_pilot_observation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.outcome<>'PENDING' THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_TERMINAL_IMMUTABLE'; END IF;
 IF (to_jsonb(NEW)-ARRAY['outcome','validity','target_rank','captured_at','invalid_reason','raw_reference','evidence_envelope','evidence_canonical','evidence_sha256','evidence_id','attempt_count','updated_at'])
  IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['outcome','validity','target_rank','captured_at','invalid_reason','raw_reference','evidence_envelope','evidence_canonical','evidence_sha256','evidence_id','attempt_count','updated_at'])
  THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_IDENTITY_IMMUTABLE'; END IF;
 IF NEW.outcome IN ('FOUND','ABSENT_WITHIN_DEPTH') AND NOT EXISTS (
  SELECT 1 FROM sv_evidence_index e
  JOIN sv_source_snapshots s ON s.id=e.source_snapshot_id AND s.organization_id=e.organization_id AND s.project_id=e.project_id
  JOIN sv_measurement_datasets d ON d.id=e.dataset_id AND d.organization_id=e.organization_id AND d.cycle_id=e.cycle_id
  JOIN sv_local_scan_cycles c ON c.id=NEW.cycle_id AND c.organization_id=e.organization_id AND c.measurement_cycle_id=e.cycle_id
  JOIN sv_configuration_locks l ON l.id=c.configuration_lock_id AND l.organization_id=c.organization_id AND l.project_id=e.project_id
  JOIN sv_local_canary_reviews review ON review.id=c.approved_canary_review_id AND review.organization_id=c.organization_id
  JOIN sv_measurement_attempts a ON a.local_observation_id=NEW.id AND a.organization_id=c.organization_id AND a.measurement_cycle_id=c.measurement_cycle_id
  JOIN sv_measurement_attempt_results r ON r.attempt_id=a.id AND r.organization_id=a.organization_id AND r.local_cycle_id=c.id
  WHERE e.id=NEW.evidence_id AND e.organization_id=NEW.organization_id AND e.domain_id='LOCAL_MAPS'
   AND e.observation_ref=NEW.id::text AND s.source_type='LOCAL_MAPS_PROVIDER' AND s.immutable AND d.immutable
   AND c.execution_mode='PILOT' AND c.status IN ('QUEUED','RUNNING') AND c.emergency_stopped_at IS NULL
   AND review.status='ACCEPTED' AND review.provider_contract_digest=c.provider_contract_digest
   AND a.status='SUCCEEDED' AND a.attempt_index=NEW.attempt_count AND a.budget_state IN ('SPENT','RELEASED')
   AND r.budget_incident IS NULL AND r.validated_result#>>'{cost,status}'='KNOWN' AND r.validated_result#>>'{cost,basis}'='actual'
   AND r.validated_result#>>'{event,kind}'=NEW.outcome AND NEW.validity='VALID'
   AND (r.validated_result->>'targetRank')::integer IS NOT DISTINCT FROM NEW.target_rank
   AND (r.validated_result->>'completedAt')::timestamptz=NEW.captured_at
   AND r.result_fingerprint=NEW.evidence_sha256 AND r.result_canonical=NEW.evidence_canonical
   AND r.raw_response_reference=NEW.raw_reference AND r.raw_response_sha256=s.content_sha256
   AND s.source_ref=NEW.raw_reference AND e.captured_at=NEW.captured_at
 ) THEN RAISE EXCEPTION 'LOCAL_VALIDATED_PROVIDER_EVIDENCE_REQUIRED'; END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION "sv_guard_measurement_attempt_result_insert"() RETURNS trigger AS $$
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

	-- The event remains immutable; execution policy can close an otherwise retryable slot.
	IF result_event='RETRYABLE_FAILURE' AND NEW.attempt_index<3 THEN
	 IF EXISTS(SELECT 1 FROM sv_local_scan_cycles c WHERE c.id=NEW.local_cycle_id AND c.organization_id=NEW.organization_id AND c.execution_mode='CANARY') THEN
	  expected_attempt_status := 'TERMINAL_FAILURE';
	  expected_observation_validity := 'INVALID';
	  expected_observation_outcome := 'PROVIDER_ERROR';
	  expected_cycle_status := 'PARTIAL_FAILURE';
	  expected_retry_allowed := 'false';
	  expected_final_invalid_reason := 'PROVIDER_UNAVAILABLE';
	 ELSIF EXISTS(SELECT 1 FROM sv_local_scan_cycles c WHERE c.id=NEW.local_cycle_id AND c.organization_id=NEW.organization_id AND c.execution_mode='PILOT' AND c.status IN ('BUDGET_BLOCKED','STOPPED')) THEN
	  expected_observation_validity := 'UNMEASURED';
	  expected_observation_outcome := 'PREFLIGHT_BLOCKED';
	  expected_cycle_status := 'PARTIAL_FAILURE';
	  expected_retry_allowed := 'false';
	 END IF;
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

ALTER TABLE sv_measurement_attempts DROP CONSTRAINT sv_measurement_attempts_reason_shape_check;
ALTER TABLE sv_measurement_attempts ADD CONSTRAINT "sv_measurement_attempts_reason_shape_check"
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
			OR ("status"='TERMINAL_FAILURE' AND "domain_id"='LOCAL_MAPS' AND "attempt_index"=1 AND "retry_reason" IS NOT NULL AND "final_invalid_reason"='PROVIDER_UNAVAILABLE')
			OR ("status" = 'TERMINAL_FAILURE'
				AND "retry_reason" IS NULL AND "final_invalid_reason" IS NULL)
			OR ("status" NOT IN ('RETRYABLE_FAILURE', 'TERMINAL_FAILURE')
				AND "retry_reason" IS NULL AND "final_invalid_reason" IS NULL))
		);

CREATE FUNCTION sv_local_first_attempt_terminal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='TERMINAL_FAILURE' AND NEW.attempt_index=1 AND NEW.retry_reason IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM sv_local_scan_cycles c WHERE c.measurement_cycle_id=NEW.measurement_cycle_id AND c.organization_id=NEW.organization_id AND c.execution_mode='CANARY'
 ) THEN RAISE EXCEPTION 'LOCAL_FIRST_ATTEMPT_TERMINAL_CANARY_REQUIRED'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_first_attempt_terminal_guard BEFORE UPDATE ON sv_measurement_attempts FOR EACH ROW EXECUTE FUNCTION sv_local_first_attempt_terminal_guard();
