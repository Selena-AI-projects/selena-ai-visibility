DO $migration_preflight$
BEGIN
	IF to_regprocedure('public.sv_reconcile_journal_hold(uuid,text,text,boolean,boolean)') IS NULL
		OR pg_catalog.pg_get_functiondef('public.sv_guard_journal_daily_claim_mutation()'::pg_catalog.regprocedure)
			NOT LIKE '%JOURNAL_HOLD_RECONCILIATION_FUNCTION_REQUIRED%'
	THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_REQUIRES_MIGRATION_0060';
	END IF;
END;
$migration_preflight$;
--> statement-breakpoint
-- 0060 releases a claim whose process vanished with its runs still RUNNING: it
-- settles those runs itself. A claim can also be left behind by an observed
-- failure — the executor closed every run as FAILED, the breaker stopped the
-- cycle, the script threw and the claim stayed EXECUTING. That shape has no
-- exit: recovery returns HOLD without writing, the guard admits EXECUTING only
-- into HOLD or COMPLETED, COMPLETED needs a QC_REQUIRED cycle, and 0060 counts
-- every closed run as an invariant violation. One unresolved claim blocks its
-- project on every future day.
--
-- This function is the exit for exactly that shape and refuses every other:
-- every run terminal, every run fenced by a boundary of this claim, no run
-- still open, no legacy unfenced pair. It settles nothing — the executor
-- already did — it revokes any unspent permit, cancels the order, and moves
-- the claim EXECUTING -> HOLD -> RECONCILED inside one transaction, each step
-- through the transitions the guard already admits. The receipt carries the
-- same fields as 0060's so the same reader accepts both, plus the shape.
CREATE FUNCTION "sv_reconcile_journal_executor_settled"(
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
	consumed_permit_count integer;
	inconsistent_permit_count integer;
	run_count integer;
	open_run_count integer;
	settled_run_count integer;
	boundary_count integer;
	boundary_call_upper_bound integer;
	revoked_permit_count integer;
	cost_event_count integer;
	unmatched_cost_event_count integer;
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
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_OWNER_REQUIRED';
	END IF;
	IF p_actor_id IS NULL OR p_actor_id <> btrim(p_actor_id) OR length(p_actor_id) = 0 THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_ACTOR_INVALID';
	END IF;
	IF p_owner_decision_ref IS NULL
		OR p_owner_decision_ref <> btrim(p_owner_decision_ref)
		OR length(p_owner_decision_ref) < 12
		OR length(p_owner_decision_ref) > 200
	THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_DECISION_REF_INVALID';
	END IF;
	IF p_runtime_quiesced IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_RUNTIME_NOT_QUIESCED';
	END IF;

	SELECT * INTO claim_record
	FROM "public"."sv_journal_daily_claims"
	WHERE "id" = p_claim_id
		AND "organization_id" = current_setting('app.organization_id', true)
	FOR UPDATE;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_CLAIM_NOT_FOUND';
	END IF;
	IF NOT pg_try_advisory_xact_lock(
		hashtextextended(
			'selena-journal:' || claim_record."organization_id" || ':' || claim_record."project_id"::text,
			0
		)
	) THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_BUSY';
	END IF;

	SELECT count(*)::integer INTO cycle_count
	FROM "public"."sv_cycles"
	WHERE "lock_id" = claim_record."configuration_lock_id"
		AND "organization_id" = claim_record."organization_id";
	IF cycle_count <> 1 THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_CYCLE_CARDINALITY';
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
			FROM "public"."sv_run_permits" AS permit
			WHERE permit."cycle_id" = cycle_record."id"
				AND permit."organization_id" = claim_record."organization_id"
				AND (permit."status" = 'consumed') IS DISTINCT FROM (permit."consumed_at" IS NOT NULL)
		),
		(
			SELECT count(*)::integer
			FROM "public"."sv_runs" AS run
			WHERE run."cycle_id" = cycle_record."id"
				AND run."organization_id" = claim_record."organization_id"
		),
		(
			SELECT count(*)::integer
			FROM "public"."sv_runs" AS run
			WHERE run."cycle_id" = cycle_record."id"
				AND run."organization_id" = claim_record."organization_id"
				AND (run."status" = 'RUNNING' OR run."finished_at" IS NULL OR run."validity" IS NULL)
		),
		(
			-- A run the executor settled: terminal, on its own consumed permit,
			-- fenced by exactly the boundary this claim wrote for it.
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
				AND run."status" <> 'RUNNING'
				AND run."finished_at" IS NOT NULL
				AND run."validity" IS NOT NULL
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
			FROM "public"."sv_journal_provider_boundaries" AS boundary
			WHERE boundary."journal_claim_id" = claim_record."id"
				AND boundary."cycle_id" = cycle_record."id"
				AND boundary."organization_id" = claim_record."organization_id"
		),
		(
			SELECT coalesce(sum(boundary."provider_call_upper_bound"), 0)::integer
			FROM "public"."sv_journal_provider_boundaries" AS boundary
			WHERE boundary."journal_claim_id" = claim_record."id"
				AND boundary."cycle_id" = cycle_record."id"
				AND boundary."organization_id" = claim_record."organization_id"
		)
	INTO consumed_permit_count, inconsistent_permit_count, run_count, open_run_count,
		settled_run_count, boundary_count, boundary_call_upper_bound;

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
	-- Every counted run is fenced, so the fence is the whole upper bound; an
	-- unattached cost row is the only other possible call.
	provider_call_upper_bound := boundary_call_upper_bound + unmatched_cost_event_count;

	IF claim_record."status" = 'RECONCILED' THEN
		IF claim_record."reconciliation_reason" IS DISTINCT FROM p_owner_decision_ref
			OR claim_record."reconciled_by" IS DISTINCT FROM p_actor_id
		THEN
			RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_REPLAY_IDENTITY_MISMATCH';
		END IF;
		IF provider_call_upper_bound > 0 AND p_ambiguous_spend_acknowledged IS DISTINCT FROM true THEN
			RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_AMBIGUOUS_SPEND_ACK_REQUIRED';
		END IF;
		SELECT count(*)::integer INTO revoked_permit_count
		FROM "public"."sv_run_permits"
		WHERE "cycle_id" = cycle_record."id" AND "status" = 'revoked';
		RETURN jsonb_build_object(
			'decision', 'ALREADY_RECONCILED', 'settlementShape', 'EXECUTOR_SETTLED',
			'claimId', claim_record."id", 'cycleId', cycle_record."id",
			'revokedPermitCount', revoked_permit_count, 'settledRunCount', settled_run_count,
			'boundaryBackedRunCount', settled_run_count,
			'legacyUnfencedRunCount', 0, 'legacyUnfencedProviderCallUpperBound', 0,
			'legacyTopologyStatus', 'NONE',
			'costEventCount', cost_event_count, 'unmatchedCostEventCount', unmatched_cost_event_count,
			'providerCallUpperBound', provider_call_upper_bound,
			'observedCostUsd', observed_cost::text, 'historicalExposureCapUsd', historical_exposure_cap::text,
			'providerCalls', CASE WHEN provider_call_upper_bound = 0 THEN 0 ELSE NULL END,
			'providerCallsStatus', CASE WHEN provider_call_upper_bound = 0 THEN 'PROVEN_ZERO' ELSE 'UNKNOWN_WITHIN_UPPER_BOUND' END,
			'recurring', false
		);
	END IF;

	IF claim_record."status" NOT IN ('EXECUTING', 'HOLD') THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_STATUS_BLOCKED';
	END IF;
	IF cycle_record."status" NOT IN ('STOPPED', 'FAILED') THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_CYCLE_STATE_BLOCKED';
	END IF;
	-- Past the longest provider or queue lease, nothing that crossed a boundary
	-- before the failure can still be live and write another row.
	IF claim_record."updated_at" > clock_timestamp() - interval '45 minutes' THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_LEASE_ACTIVE';
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
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_ACTIVE_JOB';
	END IF;

	-- A run still open is 0060's shape, not this one.
	IF open_run_count <> 0 THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_RUNS_STILL_OPEN';
	END IF;
	IF run_count = 0
		OR settled_run_count <> run_count
		OR consumed_permit_count <> run_count
		OR inconsistent_permit_count <> 0
		OR boundary_count <> run_count
		OR boundary_call_upper_bound <> boundary_count
	THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_EXECUTION_INVARIANT';
	END IF;
	IF provider_call_upper_bound > 0 AND p_ambiguous_spend_acknowledged IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'JOURNAL_EXECUTOR_SETTLED_RECONCILIATION_AMBIGUOUS_SPEND_ACK_REQUIRED';
	END IF;

	reconciliation_time := clock_timestamp();
	UPDATE "public"."sv_run_permits"
	SET "status" = 'revoked'
	WHERE "cycle_id" = cycle_record."id"
		AND "organization_id" = claim_record."organization_id"
		AND "consumed_at" IS NULL
		AND "status" = 'issued';
	SELECT count(*)::integer INTO revoked_permit_count
	FROM "public"."sv_run_permits"
	WHERE "cycle_id" = cycle_record."id" AND "status" = 'revoked';

	UPDATE "public"."sv_orders"
	SET "status" = 'CANCELLED', "updated_at" = reconciliation_time
	WHERE "id" = cycle_record."order_id"
		AND "organization_id" = claim_record."organization_id"
		AND "status" <> 'CANCELLED';

	-- Two guarded steps in one transaction: HOLD is the only state the guard
	-- lets EXECUTING leave for, and RECONCILED is the only state it lets HOLD
	-- leave for — through this function's transaction-local marker.
	IF claim_record."status" = 'EXECUTING' THEN
		UPDATE "public"."sv_journal_daily_claims"
		SET "status" = 'HOLD', "updated_at" = reconciliation_time
		WHERE "id" = claim_record."id" AND "organization_id" = claim_record."organization_id";
	END IF;
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
		'OWNER_RECONCILED_JOURNAL_EXECUTOR_SETTLED', 'high', p_owner_decision_ref, 'RESOLVED', reconciliation_time
	);
	INSERT INTO "public"."sv_audit_events" (
		"organization_id", "actor_id", "event", "subject_kind", "subject_id", "details"
	) VALUES (
		claim_record."organization_id", p_actor_id, 'JOURNAL_DAILY_CLAIM_RECONCILED',
		'journal_daily_claim', claim_record."id"::text,
		jsonb_build_object(
			'settlementShape', 'EXECUTOR_SETTLED',
			'ownerDecisionRef', p_owner_decision_ref, 'runtimeQuiesced', true,
			'ambiguousSpendAcknowledged', p_ambiguous_spend_acknowledged,
			'cycleId', cycle_record."id", 'priorClaimStatus', claim_record."status",
			'revokedPermitCount', revoked_permit_count,
			'settledRunCount', settled_run_count, 'costEventCount', cost_event_count,
			'boundaryBackedRunCount', settled_run_count,
			'legacyUnfencedRunCount', 0, 'legacyUnfencedProviderCallUpperBound', 0,
			'legacyTopologyStatus', 'NONE',
			'unmatchedCostEventCount', unmatched_cost_event_count,
			'providerCallUpperBound', provider_call_upper_bound,
			'observedCostUsd', observed_cost, 'historicalExposureCapUsd', historical_exposure_cap,
			'providerCalls', CASE WHEN provider_call_upper_bound = 0 THEN 0 ELSE NULL END,
			'providerCallsStatus', CASE WHEN provider_call_upper_bound = 0 THEN 'PROVEN_ZERO' ELSE 'UNKNOWN_WITHIN_UPPER_BOUND' END,
			'recurring', false
		)
	);

	RETURN jsonb_build_object(
		'decision', 'RECONCILED', 'settlementShape', 'EXECUTOR_SETTLED',
		'claimId', claim_record."id", 'cycleId', cycle_record."id",
		'revokedPermitCount', revoked_permit_count, 'settledRunCount', settled_run_count,
		'boundaryBackedRunCount', settled_run_count,
		'legacyUnfencedRunCount', 0, 'legacyUnfencedProviderCallUpperBound', 0,
		'legacyTopologyStatus', 'NONE',
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
REVOKE ALL ON FUNCTION "sv_reconcile_journal_executor_settled"(uuid, text, text, boolean, boolean) FROM PUBLIC;
--> statement-breakpoint
DO $runtime_revoke$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app') THEN
		EXECUTE 'REVOKE ALL ON FUNCTION "public"."sv_reconcile_journal_executor_settled"(uuid, text, text, boolean, boolean) FROM selena_app';
	END IF;
END;
$runtime_revoke$;
