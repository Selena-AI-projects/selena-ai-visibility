DO $migration_preflight$
BEGIN
	IF to_regclass('public.sv_journal_no_spend_reconciliations') IS NULL
		OR to_regprocedure('public.sv_owner_reconcile_journal_no_spend(uuid,uuid[],text,text,text[],timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone,text,text)') IS NULL
		OR pg_catalog.pg_get_functiondef('public.sv_guard_journal_daily_claim_mutation()'::pg_catalog.regprocedure)
			NOT LIKE '%JOURNAL_DAILY_CLAIM_NO_SPEND_CERTIFICATE_REQUIRED%'
	THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_REQUIRES_MIGRATION_0059';
	END IF;
END;
$migration_preflight$;
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	ADD COLUMN "reconciled_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	ADD COLUMN "reconciliation_reason" text;
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	ADD COLUMN "reconciled_by" text;
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	DROP CONSTRAINT "sv_journal_daily_claims_status_check";
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	ADD CONSTRAINT "sv_journal_daily_claims_status_check"
	CHECK ("status" IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD', 'COMPLETED', 'ABANDONED', 'RECONCILED'));
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	DROP CONSTRAINT "sv_journal_daily_claims_completion_check";
--> statement-breakpoint
ALTER TABLE "sv_journal_daily_claims"
	ADD CONSTRAINT "sv_journal_daily_claims_completion_check" CHECK (
		(
			"status" IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD')
			AND "completed_at" IS NULL AND "abandoned_at" IS NULL
			AND "reconciled_at" IS NULL AND "reconciliation_reason" IS NULL AND "reconciled_by" IS NULL
		)
		OR (
			"status" = 'COMPLETED' AND "completed_at" IS NOT NULL
			AND "completed_at" >= "claimed_at" AND "abandoned_at" IS NULL
			AND "reconciled_at" IS NULL AND "reconciliation_reason" IS NULL AND "reconciled_by" IS NULL
		)
		OR (
			"status" = 'ABANDONED' AND "completed_at" IS NULL
			AND "abandoned_at" IS NOT NULL AND "abandoned_at" >= "claimed_at"
			AND "reconciled_at" IS NULL AND "reconciliation_reason" IS NULL AND "reconciled_by" IS NULL
		)
		OR (
			"status" = 'RECONCILED' AND "completed_at" IS NULL AND "abandoned_at" IS NULL
			AND "reconciled_at" IS NOT NULL AND "reconciled_at" >= "claimed_at"
			AND length(btrim("reconciliation_reason")) > 0 AND length(btrim("reconciled_by")) > 0
		)
	);
--> statement-breakpoint
ALTER TABLE "sv_run_permits"
	ADD CONSTRAINT "sv_run_permits_status_check"
	CHECK ("status" IN ('issued', 'consumed', 'revoked', 'cancelled')) NOT VALID;
--> statement-breakpoint
ALTER TABLE "sv_run_permits"
	VALIDATE CONSTRAINT "sv_run_permits_status_check";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sv_guard_journal_daily_claim_mutation"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE
	recovery_state text;
	table_owner text;
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" <> 'CLAIMED'
			OR NEW."configuration_lock_id" IS NOT NULL
			OR NEW."completed_at" IS NOT NULL
			OR NEW."abandoned_at" IS NOT NULL
			OR NEW."reconciled_at" IS NOT NULL
			OR NEW."reconciliation_reason" IS NOT NULL
			OR NEW."reconciled_by" IS NOT NULL
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

	-- Preserve 0059's certificate-backed owner-only HOLD -> NO_SPEND path.
	-- 0060 adds an explicitly ambiguous RECONCILED outcome beside it; it must
	-- never weaken or shadow the proven-zero transition.
	IF OLD."status" = 'HOLD' AND NEW."status" = 'NO_SPEND' THEN
		IF NEW."configuration_lock_id" IS NULL
			OR NEW."completed_at" IS NOT NULL
			OR NEW."abandoned_at" IS NOT NULL
			OR NEW."reconciled_at" IS NOT NULL
			OR NEW."reconciliation_reason" IS NOT NULL
			OR NEW."reconciled_by" IS NOT NULL
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

	IF OLD."status" = 'HOLD' AND NEW."status" = 'RECONCILED' THEN
		SELECT pg_get_userbyid(relation."relowner")
		INTO table_owner
		FROM "pg_catalog"."pg_class" AS relation
		WHERE relation."oid" = TG_RELID;
		IF current_user <> table_owner
			OR current_setting('app.journal_hold_reconciliation', true) IS DISTINCT FROM OLD."id"::text
			OR NEW."completed_at" IS NOT NULL
			OR NEW."abandoned_at" IS NOT NULL
			OR NEW."reconciled_at" IS NULL
			OR NEW."reconciled_at" < OLD."claimed_at"
			OR NEW."reconciliation_reason" IS NULL
			OR length(btrim(NEW."reconciliation_reason")) = 0
			OR NEW."reconciled_by" IS NULL
			OR length(btrim(NEW."reconciled_by")) = 0
		THEN
			RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_FUNCTION_REQUIRED';
		END IF;
		RETURN NEW;
	END IF;

	IF OLD."reconciled_at" IS DISTINCT FROM NEW."reconciled_at"
		OR OLD."reconciliation_reason" IS DISTINCT FROM NEW."reconciliation_reason"
		OR OLD."reconciled_by" IS DISTINCT FROM NEW."reconciled_by"
	THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_FUNCTION_REQUIRED';
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

	IF NEW."updated_at" < OLD."updated_at"
		OR (OLD."status" = 'CLAIMED' AND NEW."status" NOT IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD', 'ABANDONED', 'COMPLETED'))
		OR (OLD."status" = 'EXECUTING' AND NEW."status" NOT IN ('EXECUTING', 'HOLD', 'COMPLETED'))
		OR OLD."status" IN ('NO_SPEND', 'HOLD', 'COMPLETED', 'ABANDONED', 'RECONCILED')
	THEN
		RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_TRANSITION_BLOCKED';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "sv_reconcile_journal_hold"(
	p_claim_id uuid,
	p_actor_id text,
	p_owner_decision_ref text,
	p_runtime_quiesced boolean,
	p_ambiguous_spend_acknowledged boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
	claim_record "public"."sv_journal_daily_claims"%ROWTYPE;
	cycle_record "public"."sv_cycles"%ROWTYPE;
	table_owner text;
	cycle_count integer;
	active_job_count integer := 0;
	execution_invariant_violation_count integer;
	consumed_permit_count integer;
	run_count integer;
	boundary_count integer;
	boundary_backed_run_count integer;
	legacy_unfenced_run_count integer;
	revoked_permit_count integer;
	settled_run_count integer;
	settled_boundary_run_count integer;
	settled_legacy_run_count integer;
	cost_event_count integer;
	unmatched_cost_event_count integer;
	boundary_call_upper_bound integer;
	provider_call_upper_bound integer;
	observed_cost numeric(12, 6);
	historical_exposure_cap numeric(12, 6);
	reconciliation_time timestamptz;
BEGIN
	SELECT pg_get_userbyid(relation."relowner")
	INTO table_owner
	FROM "pg_catalog"."pg_class" AS relation
	INNER JOIN "pg_catalog"."pg_namespace" AS namespace ON namespace."oid" = relation."relnamespace"
	WHERE namespace."nspname" = 'public' AND relation."relname" = 'sv_journal_daily_claims';
	IF session_user <> table_owner THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_OWNER_REQUIRED';
	END IF;
	IF p_actor_id IS NULL OR p_actor_id <> btrim(p_actor_id) OR length(p_actor_id) = 0 THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_ACTOR_INVALID';
	END IF;
	IF p_owner_decision_ref IS NULL
		OR p_owner_decision_ref <> btrim(p_owner_decision_ref)
		OR length(p_owner_decision_ref) < 12
		OR length(p_owner_decision_ref) > 200
	THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_DECISION_REF_INVALID';
	END IF;
	IF p_runtime_quiesced IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_RUNTIME_NOT_QUIESCED';
	END IF;

	SELECT * INTO claim_record
	FROM "public"."sv_journal_daily_claims"
	WHERE "id" = p_claim_id
		AND "organization_id" = current_setting('app.organization_id', true)
	FOR UPDATE;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_CLAIM_NOT_FOUND';
	END IF;
	IF NOT pg_try_advisory_xact_lock(
		hashtextextended(
			'selena-journal:' || claim_record."organization_id" || ':' || claim_record."project_id"::text,
			0
		)
	) THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_BUSY';
	END IF;

	SELECT count(*)::integer INTO cycle_count
	FROM "public"."sv_cycles"
	WHERE "lock_id" = claim_record."configuration_lock_id"
		AND "organization_id" = claim_record."organization_id";
	IF cycle_count <> 1 THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_CYCLE_CARDINALITY';
	END IF;
	SELECT * INTO cycle_record
	FROM "public"."sv_cycles"
	WHERE "lock_id" = claim_record."configuration_lock_id"
		AND "organization_id" = claim_record."organization_id"
	FOR UPDATE;
	SELECT "budget_cap"::numeric(12, 6) INTO historical_exposure_cap
	FROM "public"."sv_configuration_locks"
	WHERE "id" = claim_record."configuration_lock_id"
		AND "organization_id" = claim_record."organization_id";

	SELECT
		(
			SELECT count(*)::integer
			FROM "public"."sv_run_permits" AS permit
			WHERE permit."cycle_id" = cycle_record."id"
				AND permit."organization_id" = claim_record."organization_id"
				AND permit."status" = 'consumed'
		),
		(
			SELECT count(*)::integer
			FROM "public"."sv_runs" AS run
			WHERE run."cycle_id" = cycle_record."id"
				AND run."organization_id" = claim_record."organization_id"
		),
		(
			SELECT count(*)::integer
			FROM "public"."sv_journal_provider_boundaries" AS boundary
			WHERE boundary."cycle_id" = cycle_record."id"
				AND boundary."organization_id" = claim_record."organization_id"
		),
		(
			SELECT count(*)::integer
			FROM "public"."sv_runs" AS run
			INNER JOIN "public"."sv_run_permits" AS permit
				ON permit."id" = run."permit_id"
				AND permit."cycle_id" = run."cycle_id"
				AND permit."organization_id" = run."organization_id"
			INNER JOIN "public"."sv_journal_provider_boundaries" AS boundary
				ON boundary."run_id" = run."id"
				AND boundary."permit_id" = permit."id"
				AND boundary."cycle_id" = run."cycle_id"
				AND boundary."journal_claim_id" = claim_record."id"
				AND boundary."configuration_lock_id" = claim_record."configuration_lock_id"
				AND boundary."project_id" = claim_record."project_id"
				AND boundary."organization_id" = run."organization_id"
			WHERE run."cycle_id" = cycle_record."id"
				AND run."organization_id" = claim_record."organization_id"
				AND permit."status" = 'consumed'
				AND permit."consumed_at" IS NOT NULL
				AND permit."dispatch_key" = run."dispatch_key"
				AND permit."channel" = run."channel"
				AND permit."scenario_id" = run."scenario_id"
				AND permit."system_id" IS NOT DISTINCT FROM run."system_id"
				AND boundary."dispatch_key" = run."dispatch_key"
				AND boundary."channel" = run."channel"
				AND boundary."system_id" IS NOT DISTINCT FROM run."system_id"
		),
		(
			SELECT count(*)::integer
			FROM "public"."sv_runs" AS run
			INNER JOIN "public"."sv_run_permits" AS permit
				ON permit."id" = run."permit_id"
				AND permit."cycle_id" = run."cycle_id"
				AND permit."organization_id" = run."organization_id"
			WHERE run."cycle_id" = cycle_record."id"
				AND run."organization_id" = claim_record."organization_id"
				AND permit."status" = 'consumed'
				AND permit."consumed_at" IS NOT NULL
				AND permit."dispatch_key" = run."dispatch_key"
				AND permit."channel" = run."channel"
				AND permit."scenario_id" = run."scenario_id"
				AND permit."system_id" IS NOT DISTINCT FROM run."system_id"
				AND NOT EXISTS (
					SELECT 1
					FROM "public"."sv_journal_provider_boundaries" AS boundary
					WHERE boundary."run_id" = run."id"
						AND boundary."cycle_id" = run."cycle_id"
						AND boundary."organization_id" = run."organization_id"
				)
		)
	INTO consumed_permit_count, run_count, boundary_count,
		boundary_backed_run_count, legacy_unfenced_run_count;

	SELECT coalesce(sum(boundary."provider_call_upper_bound"), 0)::integer
	INTO boundary_call_upper_bound
	FROM "public"."sv_journal_provider_boundaries" AS boundary
	WHERE boundary."journal_claim_id" = claim_record."id"
		AND boundary."cycle_id" = cycle_record."id"
		AND boundary."organization_id" = claim_record."organization_id";
	SELECT count(*)::integer,
		coalesce(sum(cost."amount_usd"), 0)::numeric(12, 6),
		count(*) FILTER (
			WHERE cost."run_id" IS NULL OR NOT EXISTS (
				SELECT 1
				FROM "public"."sv_runs" AS run
				WHERE run."id" = cost."run_id"
					AND run."cycle_id" = cycle_record."id"
					AND run."organization_id" = claim_record."organization_id"
			)
		)::integer
	INTO cost_event_count, observed_cost, unmatched_cost_event_count
	FROM "public"."sv_cost_events" AS cost
	WHERE cost."cycle_id" = cycle_record."id"
		AND cost."organization_id" = claim_record."organization_id";
	-- 0058 boundaries are the authoritative call fence for new executions.
	-- A valid consumed/run pair without such a fence can only be inherited from
	-- the pre-0058 topology. It remains ambiguous and contributes one possible
	-- call; no synthetic boundary is created. A cost tied to any already-counted
	-- run is not counted again, while an unattached legacy cost remains another
	-- possible call.
	provider_call_upper_bound := boundary_call_upper_bound
		+ legacy_unfenced_run_count
		+ unmatched_cost_event_count;

	IF claim_record."status" = 'RECONCILED' THEN
		IF claim_record."reconciliation_reason" IS DISTINCT FROM p_owner_decision_ref
			OR claim_record."reconciled_by" IS DISTINCT FROM p_actor_id
		THEN
			RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_REPLAY_IDENTITY_MISMATCH';
		END IF;
		IF provider_call_upper_bound > 0 AND p_ambiguous_spend_acknowledged IS DISTINCT FROM true THEN
			RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_AMBIGUOUS_SPEND_ACK_REQUIRED';
		END IF;
		SELECT count(*)::integer INTO revoked_permit_count
		FROM "public"."sv_run_permits"
		WHERE "cycle_id" = cycle_record."id" AND "status" = 'revoked';
		SELECT
			count(*) FILTER (
				WHERE "invalid_reason" = 'OWNER_RECONCILED_INTERRUPTED_AFTER_BOUNDARY'
			)::integer,
			count(*) FILTER (
				WHERE "invalid_reason" = 'OWNER_RECONCILED_LEGACY_INTERRUPTED_WITHOUT_BOUNDARY'
			)::integer
		INTO settled_boundary_run_count, settled_legacy_run_count
		FROM "public"."sv_runs"
		WHERE "cycle_id" = cycle_record."id"
			AND "organization_id" = claim_record."organization_id";
		settled_run_count := settled_boundary_run_count + settled_legacy_run_count;
		RETURN jsonb_build_object(
			'decision', 'ALREADY_RECONCILED', 'claimId', claim_record."id",
			'cycleId', cycle_record."id", 'revokedPermitCount', revoked_permit_count,
			'settledRunCount', settled_run_count, 'costEventCount', cost_event_count,
			'boundaryBackedRunCount', boundary_backed_run_count,
			'legacyUnfencedRunCount', legacy_unfenced_run_count,
			'legacyUnfencedProviderCallUpperBound', legacy_unfenced_run_count,
			'legacyTopologyStatus', CASE WHEN legacy_unfenced_run_count = 0 THEN 'NONE' ELSE 'CONSUMED_RUNS_WITHOUT_BOUNDARY' END,
			'unmatchedCostEventCount', unmatched_cost_event_count,
			'providerCallUpperBound', provider_call_upper_bound,
			'observedCostUsd', observed_cost::text, 'historicalExposureCapUsd', historical_exposure_cap::text,
			'providerCalls', CASE WHEN provider_call_upper_bound = 0 THEN 0 ELSE NULL END,
			'providerCallsStatus', CASE WHEN provider_call_upper_bound = 0 THEN 'PROVEN_ZERO' ELSE 'UNKNOWN_WITHIN_UPPER_BOUND' END,
			'recurring', false
		);
	END IF;
	IF claim_record."status" <> 'HOLD' THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_HOLD_REQUIRED';
	END IF;
	IF cycle_record."status" NOT IN ('QUEUED', 'RUNNING', 'STOPPED') THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_CYCLE_STATE_BLOCKED';
	END IF;
	-- A literal HOLD prevents every new permit claim. Waiting beyond the
	-- longest supported provider/queue lease proves any transport that crossed
	-- the boundary before the HOLD can no longer be live.
	IF claim_record."updated_at" > clock_timestamp() - interval '45 minutes' THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_LEASE_ACTIVE';
	END IF;

	IF to_regclass('pgboss.job') IS NOT NULL THEN
		EXECUTE $query$
			SELECT count(*)::integer
			FROM pgboss.job
			WHERE name IN ('selena-measure', 'selena-measure-journal')
				AND state::text NOT IN ('completed', 'failed', 'cancelled', 'expired')
		$query$ INTO active_job_count;
	END IF;
	IF active_job_count <> 0 THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_ACTIVE_JOB';
	END IF;

	SELECT (
		SELECT count(*)::integer
		FROM "public"."sv_run_permits" AS permit
		WHERE permit."cycle_id" = cycle_record."id"
			AND permit."organization_id" = claim_record."organization_id"
			AND (
				(permit."status" = 'consumed') IS DISTINCT FROM (permit."consumed_at" IS NOT NULL)
				OR (
					permit."status" = 'consumed'
					AND (
						SELECT count(*)
						FROM "public"."sv_runs" AS run
						WHERE run."permit_id" = permit."id"
							AND run."cycle_id" = permit."cycle_id"
							AND run."organization_id" = permit."organization_id"
							AND run."dispatch_key" = permit."dispatch_key"
							AND run."channel" = permit."channel"
							AND run."scenario_id" = permit."scenario_id"
							AND run."system_id" IS NOT DISTINCT FROM permit."system_id"
					) <> 1
				)
				OR (
					permit."status" IN ('issued', 'revoked', 'cancelled')
					AND EXISTS (
						SELECT 1 FROM "public"."sv_runs" AS run
						WHERE run."permit_id" = permit."id"
							AND run."cycle_id" = permit."cycle_id"
							AND run."organization_id" = permit."organization_id"
					)
				)
			)
	) + (
		SELECT count(*)::integer
		FROM "public"."sv_runs" AS run
		LEFT JOIN "public"."sv_run_permits" AS permit
			ON permit."id" = run."permit_id"
			AND permit."cycle_id" = run."cycle_id"
			AND permit."organization_id" = run."organization_id"
		WHERE run."cycle_id" = cycle_record."id"
			AND run."organization_id" = claim_record."organization_id"
			AND (
				permit."id" IS NULL
				OR permit."status" <> 'consumed'
				OR permit."consumed_at" IS NULL
				OR permit."dispatch_key" IS DISTINCT FROM run."dispatch_key"
				OR permit."channel" IS DISTINCT FROM run."channel"
				OR permit."scenario_id" IS DISTINCT FROM run."scenario_id"
				OR permit."system_id" IS DISTINCT FROM run."system_id"
				OR run."status" <> 'RUNNING'
				OR run."finished_at" IS NOT NULL
				OR run."validity" IS NOT NULL
				OR run."invalid_reason" IS NOT NULL
			)
	) + (
		SELECT count(*)::integer
		FROM "public"."sv_journal_provider_boundaries" AS boundary
		LEFT JOIN "public"."sv_runs" AS run
			ON run."id" = boundary."run_id"
			AND run."cycle_id" = boundary."cycle_id"
			AND run."organization_id" = boundary."organization_id"
		LEFT JOIN "public"."sv_run_permits" AS permit
			ON permit."id" = boundary."permit_id"
			AND permit."cycle_id" = boundary."cycle_id"
			AND permit."organization_id" = boundary."organization_id"
		WHERE boundary."cycle_id" = cycle_record."id"
			AND boundary."organization_id" = claim_record."organization_id"
			AND (
				boundary."journal_claim_id" IS DISTINCT FROM claim_record."id"
				OR boundary."configuration_lock_id" IS DISTINCT FROM claim_record."configuration_lock_id"
				OR boundary."project_id" IS DISTINCT FROM claim_record."project_id"
				OR run."id" IS NULL
				OR permit."id" IS NULL
				OR run."permit_id" IS DISTINCT FROM permit."id"
				OR boundary."dispatch_key" IS DISTINCT FROM run."dispatch_key"
				OR boundary."channel" IS DISTINCT FROM run."channel"
				OR boundary."system_id" IS DISTINCT FROM run."system_id"
			)
	) + (
		SELECT count(*)::integer
		FROM "public"."sv_cost_events" AS cost
		WHERE cost."cycle_id" = cycle_record."id"
			AND cost."organization_id" = claim_record."organization_id"
			AND cost."run_id" IS NOT NULL
			AND NOT EXISTS (
				SELECT 1 FROM "public"."sv_runs" AS run
				WHERE run."id" = cost."run_id"
					AND run."cycle_id" = cycle_record."id"
					AND run."organization_id" = claim_record."organization_id"
			)
	)
	INTO execution_invariant_violation_count;
	IF execution_invariant_violation_count <> 0
		OR consumed_permit_count <> run_count
		OR run_count <> boundary_backed_run_count + legacy_unfenced_run_count
		OR boundary_count <> boundary_backed_run_count
		OR boundary_count <> boundary_call_upper_bound
	THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_EXECUTION_INVARIANT';
	END IF;
	IF provider_call_upper_bound > 0 AND p_ambiguous_spend_acknowledged IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'JOURNAL_HOLD_RECONCILIATION_AMBIGUOUS_SPEND_ACK_REQUIRED';
	END IF;

	reconciliation_time := clock_timestamp();
	UPDATE "public"."sv_run_permits"
	SET "status" = 'revoked'
	WHERE "cycle_id" = cycle_record."id"
		AND "organization_id" = claim_record."organization_id"
		AND "consumed_at" IS NULL
		AND "status" = 'issued';
	GET DIAGNOSTICS revoked_permit_count = ROW_COUNT;

	UPDATE "public"."sv_runs" AS run
	SET "status" = 'FAILED',
		"validity" = 'INVALID',
		"invalid_reason" = CASE WHEN EXISTS (
			SELECT 1
			FROM "public"."sv_journal_provider_boundaries" AS boundary
			WHERE boundary."run_id" = run."id"
				AND boundary."cycle_id" = run."cycle_id"
				AND boundary."journal_claim_id" = claim_record."id"
				AND boundary."organization_id" = run."organization_id"
		) THEN 'OWNER_RECONCILED_INTERRUPTED_AFTER_BOUNDARY'
		ELSE 'OWNER_RECONCILED_LEGACY_INTERRUPTED_WITHOUT_BOUNDARY' END,
		"canonical_payload" = jsonb_build_object(
			'dispatchKey', run."dispatch_key", 'status', 'FAILED', 'validity', 'INVALID',
			'invalidReason', CASE WHEN EXISTS (
				SELECT 1
				FROM "public"."sv_journal_provider_boundaries" AS boundary
				WHERE boundary."run_id" = run."id"
					AND boundary."cycle_id" = run."cycle_id"
					AND boundary."journal_claim_id" = claim_record."id"
					AND boundary."organization_id" = run."organization_id"
			) THEN 'OWNER_RECONCILED_INTERRUPTED_AFTER_BOUNDARY'
			ELSE 'OWNER_RECONCILED_LEGACY_INTERRUPTED_WITHOUT_BOUNDARY' END
		),
		"finished_at" = reconciliation_time
	WHERE run."cycle_id" = cycle_record."id"
		AND run."organization_id" = claim_record."organization_id"
		AND run."finished_at" IS NULL;
	GET DIAGNOSTICS settled_run_count = ROW_COUNT;
	-- Return stable total counts on both the first call and an idempotent replay.
	SELECT count(*)::integer INTO revoked_permit_count
	FROM "public"."sv_run_permits"
	WHERE "cycle_id" = cycle_record."id" AND "status" = 'revoked';
	SELECT
		count(*) FILTER (
			WHERE "invalid_reason" = 'OWNER_RECONCILED_INTERRUPTED_AFTER_BOUNDARY'
		)::integer,
		count(*) FILTER (
			WHERE "invalid_reason" = 'OWNER_RECONCILED_LEGACY_INTERRUPTED_WITHOUT_BOUNDARY'
		)::integer
	INTO settled_boundary_run_count, settled_legacy_run_count
	FROM "public"."sv_runs"
	WHERE "cycle_id" = cycle_record."id"
		AND "organization_id" = claim_record."organization_id";
	settled_run_count := settled_boundary_run_count + settled_legacy_run_count;

	UPDATE "public"."sv_cycles"
	SET "status" = 'STOPPED',
		"completed_runs" = (
			SELECT count(*)::integer FROM "public"."sv_runs"
			WHERE "cycle_id" = cycle_record."id" AND "finished_at" IS NOT NULL
		),
		"updated_at" = reconciliation_time
	WHERE "id" = cycle_record."id" AND "organization_id" = claim_record."organization_id";
	UPDATE "public"."sv_orders"
	SET "status" = 'CANCELLED', "updated_at" = reconciliation_time
	WHERE "id" = cycle_record."order_id" AND "organization_id" = claim_record."organization_id";

	PERFORM set_config('app.journal_hold_reconciliation', claim_record."id"::text, true);
	UPDATE "public"."sv_journal_daily_claims"
	SET "status" = 'RECONCILED', "reconciled_at" = reconciliation_time,
		"reconciliation_reason" = p_owner_decision_ref, "reconciled_by" = p_actor_id,
		"updated_at" = reconciliation_time
	WHERE "id" = claim_record."id" AND "organization_id" = claim_record."organization_id";

	INSERT INTO "public"."sv_incidents" (
		"organization_id", "order_id", "cycle_id", "kind", "severity", "detail", "status", "resolved_at"
	) VALUES (
		claim_record."organization_id", cycle_record."order_id", cycle_record."id",
		'OWNER_RECONCILED_JOURNAL_HOLD', 'high', p_owner_decision_ref, 'RESOLVED', reconciliation_time
	);
	INSERT INTO "public"."sv_audit_events" (
		"organization_id", "actor_id", "event", "subject_kind", "subject_id", "details"
	) VALUES (
		claim_record."organization_id", p_actor_id, 'JOURNAL_DAILY_CLAIM_RECONCILED',
		'journal_daily_claim', claim_record."id"::text,
		jsonb_build_object(
			'ownerDecisionRef', p_owner_decision_ref, 'runtimeQuiesced', true,
			'ambiguousSpendAcknowledged', p_ambiguous_spend_acknowledged,
			'cycleId', cycle_record."id", 'revokedPermitCount', revoked_permit_count,
			'settledRunCount', settled_run_count, 'costEventCount', cost_event_count,
			'boundaryBackedRunCount', boundary_backed_run_count,
			'legacyUnfencedRunCount', legacy_unfenced_run_count,
			'legacyUnfencedProviderCallUpperBound', legacy_unfenced_run_count,
			'legacyTopologyStatus', CASE WHEN legacy_unfenced_run_count = 0 THEN 'NONE' ELSE 'CONSUMED_RUNS_WITHOUT_BOUNDARY' END,
			'unmatchedCostEventCount', unmatched_cost_event_count,
			'providerCallUpperBound', provider_call_upper_bound,
			'observedCostUsd', observed_cost, 'historicalExposureCapUsd', historical_exposure_cap,
			'providerCalls', CASE WHEN provider_call_upper_bound = 0 THEN 0 ELSE NULL END,
			'providerCallsStatus', CASE WHEN provider_call_upper_bound = 0 THEN 'PROVEN_ZERO' ELSE 'UNKNOWN_WITHIN_UPPER_BOUND' END,
			'recurring', false
		)
	);

	RETURN jsonb_build_object(
		'decision', 'RECONCILED', 'claimId', claim_record."id", 'cycleId', cycle_record."id",
		'revokedPermitCount', revoked_permit_count, 'settledRunCount', settled_run_count,
		'boundaryBackedRunCount', boundary_backed_run_count,
		'legacyUnfencedRunCount', legacy_unfenced_run_count,
		'legacyUnfencedProviderCallUpperBound', legacy_unfenced_run_count,
		'legacyTopologyStatus', CASE WHEN legacy_unfenced_run_count = 0 THEN 'NONE' ELSE 'CONSUMED_RUNS_WITHOUT_BOUNDARY' END,
		'costEventCount', cost_event_count, 'unmatchedCostEventCount', unmatched_cost_event_count,
		'providerCallUpperBound', provider_call_upper_bound,
		'observedCostUsd', observed_cost::text,
		'historicalExposureCapUsd', historical_exposure_cap::text,
		'providerCalls', CASE WHEN provider_call_upper_bound = 0 THEN 0 ELSE NULL END,
		'providerCallsStatus', CASE WHEN provider_call_upper_bound = 0 THEN 'PROVEN_ZERO' ELSE 'UNKNOWN_WITHIN_UPPER_BOUND' END,
		'recurring', false
	);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_reconcile_journal_hold"(uuid, text, text, boolean, boolean) FROM PUBLIC;
--> statement-breakpoint
DO $runtime_revoke$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app') THEN
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_reconcile_journal_hold"(uuid, text, text, boolean, boolean) FROM selena_app';
	END IF;
END;
$runtime_revoke$;
