--
-- PostgreSQL database dump
--

\restrict oJrWQ2UzRxMFVIMV6c9WEnXAoKmvggqSNbjoEk4Oh1yi7KTo301lLUbQAcSzZ3G

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: pgboss; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgboss;


--
-- Name: job_state; Type: TYPE; Schema: pgboss; Owner: -
--

CREATE TYPE pgboss.job_state AS ENUM (
    'created',
    'retry',
    'active',
    'completed',
    'cancelled',
    'failed'
);


--
-- Name: report_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


--
-- Name: sv_action_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_action_status AS ENUM (
    'PROPOSED',
    'APPROVED',
    'IN_PROGRESS',
    'IMPLEMENTED',
    'VERIFIED',
    'REJECTED',
    'ABANDONED'
);


--
-- Name: sv_attribution_confidence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_attribution_confidence AS ENUM (
    'HIGH',
    'MEDIUM',
    'LOW',
    'UNKNOWN'
);


--
-- Name: sv_attribution_verdict; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_attribution_verdict AS ENUM (
    'POSITIVE_CORRELATION',
    'NEGATIVE_CORRELATION',
    'NO_OBSERVED_CHANGE',
    'MIXED_RESULT',
    'INSUFFICIENT_EVIDENCE',
    'CONFOUNDED',
    'NOT_MEASURED'
);


--
-- Name: sv_capture_task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_capture_task_status AS ENUM (
    'PENDING_CAPTURE',
    'AWAITING_MANUAL_CAPTURE',
    'SUBMITTED_FOR_REVIEW',
    'ACCEPTED',
    'REJECTED',
    'NEEDS_CORRECTION',
    'INSUFFICIENT_EVIDENCE',
    'SURFACE_UNAVAILABLE'
);


--
-- Name: sv_change_verification; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_change_verification AS ENUM (
    'DECLARED',
    'EVIDENCED',
    'DISPUTED'
);


--
-- Name: sv_cycle_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_cycle_status AS ENUM (
    'CREATED',
    'APPROVED',
    'QUEUED',
    'RUNNING',
    'ANALYZING',
    'QC_REQUIRED',
    'READY',
    'STOPPED',
    'FAILED',
    'CARDINALITY_INCIDENT'
);


--
-- Name: sv_entity_confirmation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_entity_confirmation AS ENUM (
    'PROPOSED',
    'CLIENT_CONFIRMED',
    'ANALYST_CONFIRMED',
    'REJECTED'
);


--
-- Name: sv_entity_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_entity_kind AS ENUM (
    'MASTER_BRAND',
    'SUBBRAND',
    'CONCEPT',
    'LOCATION_BRAND'
);


--
-- Name: sv_finding_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_finding_status AS ENUM (
    'OPEN',
    'ACCEPTED',
    'DISMISSED'
);


--
-- Name: sv_geo_precision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_geo_precision AS ENUM (
    'CITY',
    'ADDRESS',
    'COORDINATE',
    'UNKNOWN'
);


--
-- Name: sv_local_rank_validity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_local_rank_validity AS ENUM (
    'VALID',
    'INVALID',
    'UNMEASURED'
);


--
-- Name: sv_location_confirmation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_location_confirmation AS ENUM (
    'PROPOSED',
    'CONFIRMED',
    'REJECTED'
);


--
-- Name: sv_location_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_location_role AS ENUM (
    'PRIMARY',
    'SECONDARY',
    'WITHIN'
);


--
-- Name: sv_match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_match_status AS ENUM (
    'EXACT_ALIAS',
    'REVIEWED_MATCH',
    'UNRESOLVED'
);


--
-- Name: sv_mention_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_mention_role AS ENUM (
    'TARGET',
    'PARENT',
    'CHILD',
    'COMPETITOR',
    'OTHER'
);


--
-- Name: sv_order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_order_status AS ENUM (
    'DRAFT',
    'CONFIGURING',
    'QUOTED',
    'AWAITING_PAYMENT',
    'PAID_REVIEW_REQUIRED',
    'APPROVED',
    'QUEUED',
    'RUNNING',
    'ANALYZING',
    'QC_REQUIRED',
    'READY',
    'DELIVERED',
    'PAYMENT_FAILED',
    'PREFLIGHT_BLOCKED',
    'BUDGET_BLOCKED',
    'PROVIDER_BLOCKED',
    'CARDINALITY_INCIDENT',
    'PARTIAL_FAILURE',
    'CANCELLED',
    'REFUND_REVIEW'
);


--
-- Name: sv_ordering_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_ordering_state AS ENUM (
    'EXPLICIT_ORDER',
    'UNORDERED',
    'UNKNOWN'
);


--
-- Name: sv_parent_relation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_parent_relation AS ENUM (
    'SUBBRAND_OF',
    'CONCEPT_WITHIN',
    'LOCATION_OF',
    'UNSPECIFIED'
);


--
-- Name: sv_payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_payment_status AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED'
);


--
-- Name: sv_project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_project_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ARCHIVED'
);


--
-- Name: sv_quote_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_quote_status AS ENUM (
    'DRAFT',
    'ISSUED',
    'EXPIRED',
    'ACCEPTED',
    'CANCELLED'
);


--
-- Name: sv_recommendation_run_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_recommendation_run_status AS ENUM (
    'RUNNING',
    'READY',
    'FAILED'
);


--
-- Name: sv_reference_origin; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_reference_origin AS ENUM (
    'USER_PROVIDED',
    'PUBLIC_SITE',
    'ANALYST_ENTERED'
);


--
-- Name: sv_scan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_scan_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED'
);


--
-- Name: sv_scenario_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_scenario_status AS ENUM (
    'PROPOSED',
    'APPROVED',
    'REJECTED'
);


--
-- Name: sv_verification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sv_verification_status AS ENUM (
    'PLANNED',
    'RUNNING',
    'COMPLETED',
    'FAILED'
);


--
-- Name: create_queue(text, jsonb); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.create_queue(queue_name text, options jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $_$
    DECLARE
      tablename varchar := CASE WHEN options->>'partition' = 'true'
                            THEN 'j' || encode(sha224(queue_name::bytea), 'hex')
                            ELSE 'job_common'
                            END;
      queue_created_on timestamptz;
    BEGIN

      WITH q as (
        INSERT INTO pgboss.queue (
          name,
          policy,
          retry_limit,
          retry_delay,
          retry_backoff,
          retry_delay_max,
          expire_seconds,
          retention_seconds,
          deletion_seconds,
          warning_queued,
          dead_letter,
          partition,
          table_name,
          heartbeat_seconds,
          notify
        )
        VALUES (
          queue_name,
          options->>'policy',
          COALESCE((options->>'retryLimit')::int, 2),
          COALESCE((options->>'retryDelay')::int, 0),
          COALESCE((options->>'retryBackoff')::bool, false),
          (options->>'retryDelayMax')::int,
          COALESCE((options->>'expireInSeconds')::int, 900),
          COALESCE((options->>'retentionSeconds')::int, 1209600),
          COALESCE((options->>'deleteAfterSeconds')::int, 604800),
          COALESCE((options->>'warningQueueSize')::int, 0),
          options->>'deadLetter',
          COALESCE((options->>'partition')::bool, false),
          tablename,
          (options->>'heartbeatSeconds')::int,
          COALESCE((options->>'notify')::bool, false)
        )
        ON CONFLICT DO NOTHING
        RETURNING created_on
      )
      SELECT created_on into queue_created_on from q;

      IF queue_created_on IS NULL OR options->>'partition' IS DISTINCT FROM 'true' THEN
        RETURN;
      END IF;

      EXECUTE format('CREATE TABLE pgboss.%I (LIKE pgboss.job INCLUDING DEFAULTS)', tablename);

      EXECUTE pgboss.job_table_format($cmd$ALTER TABLE pgboss.job ADD PRIMARY KEY (name, id)$cmd$, tablename);
      EXECUTE pgboss.job_table_format($cmd$ALTER TABLE pgboss.job ADD CONSTRAINT q_fkey FOREIGN KEY (name) REFERENCES pgboss.queue (name) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED$cmd$, tablename);
      EXECUTE pgboss.job_table_format($cmd$ALTER TABLE pgboss.job ADD CONSTRAINT dlq_fkey FOREIGN KEY (dead_letter) REFERENCES pgboss.queue (name) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED$cmd$, tablename);

      EXECUTE pgboss.job_table_format($cmd$CREATE INDEX job_i5 ON pgboss.job (name, start_after) WHERE state < 'active' AND NOT blocked$cmd$, tablename);
      EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i4 ON pgboss.job (name, singleton_on, COALESCE(singleton_key, '')) WHERE state <> 'cancelled' AND singleton_on IS NOT NULL$cmd$, tablename);
      EXECUTE pgboss.job_table_format($cmd$CREATE INDEX job_i7 ON pgboss.job (name, group_id) WHERE state = 'active' AND group_id IS NOT NULL$cmd$, tablename);
      EXECUTE pgboss.job_table_format($cmd$CREATE INDEX job_i9 ON pgboss.job (name, id) WHERE blocking AND state = 'completed'$cmd$, tablename);

      IF options->>'policy' = 'short' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i1 ON pgboss.job (name, COALESCE(singleton_key, '')) WHERE state = 'created' AND policy = 'short'$cmd$, tablename);
      ELSIF options->>'policy' = 'singleton' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i2 ON pgboss.job (name, COALESCE(singleton_key, '')) WHERE state = 'active' AND policy = 'singleton'$cmd$, tablename);
      ELSIF options->>'policy' = 'stately' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i3 ON pgboss.job (name, state, COALESCE(singleton_key, '')) WHERE state <= 'active' AND policy = 'stately'$cmd$, tablename);
      ELSIF options->>'policy' = 'exclusive' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i6 ON pgboss.job (name, COALESCE(singleton_key, '')) WHERE state <= 'active' AND policy = 'exclusive'$cmd$, tablename);
      ELSIF options->>'policy' = 'key_strict_fifo' THEN
        EXECUTE pgboss.job_table_format($cmd$CREATE UNIQUE INDEX job_i8 ON pgboss.job (name, singleton_key) WHERE state IN ('active', 'retry', 'failed') AND policy = 'key_strict_fifo'$cmd$, tablename);
        EXECUTE pgboss.job_table_format($cmd$ALTER TABLE pgboss.job ADD CONSTRAINT job_key_strict_fifo_singleton_key_check CHECK (NOT (policy = 'key_strict_fifo' AND singleton_key IS NULL))$cmd$, tablename);
      END IF;

      EXECUTE format('ALTER TABLE pgboss.%I ADD CONSTRAINT cjc CHECK (name=%L)', tablename, queue_name);
      EXECUTE format('ALTER TABLE pgboss.job ATTACH PARTITION pgboss.%I FOR VALUES IN (%L)', tablename, queue_name);
    END;
    $_$;


--
-- Name: delete_queue(text); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.delete_queue(queue_name text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_table varchar;
      v_partition bool;
    BEGIN
      
      SELECT table_name, partition
      FROM pgboss.queue
      WHERE name = queue_name
      INTO v_table, v_partition;

      IF v_partition THEN
        EXECUTE format('DROP TABLE IF EXISTS pgboss.%I', v_table);
      ELSE
        EXECUTE format('DELETE FROM pgboss.%I WHERE name = %L', v_table, queue_name);
      END IF;
    
      DELETE FROM pgboss.queue WHERE name = queue_name;
    END;
    $$;


--
-- Name: job_table_format(text, text); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.job_table_format(command text, table_name text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
      SELECT format(
        regexp_replace(
          regexp_replace(command, '\.job\y', '.%1$I', 'g'),
          '\yjob_i(\d+)', '%1$s_i\1', 'g'
        ),
        table_name
      );
    $_$;


--
-- Name: job_table_run(text, text, text); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.job_table_run(command text, tbl_name text DEFAULT NULL::text, queue_name text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      tbl RECORD;
    BEGIN
      IF queue_name IS NOT NULL THEN
        SELECT table_name INTO tbl_name FROM pgboss.queue WHERE name = queue_name;
      END IF;

      IF tbl_name IS NOT NULL THEN
        EXECUTE pgboss.job_table_format(command, tbl_name);
        RETURN;
      END IF;

      EXECUTE pgboss.job_table_format(command, 'job_common');

      FOR tbl IN SELECT table_name FROM pgboss.queue WHERE partition = true
      LOOP
        EXECUTE pgboss.job_table_format(command, tbl.table_name);
      END LOOP;
    END;
    $$;


--
-- Name: job_table_run_async(text, integer, text, text, text); Type: FUNCTION; Schema: pgboss; Owner: -
--

CREATE FUNCTION pgboss.job_table_run_async(command_name text, version integer, command text, tbl_name text DEFAULT NULL::text, queue_name text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF queue_name IS NOT NULL THEN
        SELECT table_name INTO tbl_name FROM pgboss.queue WHERE name = queue_name;
      END IF;

      IF tbl_name IS NOT NULL THEN
        INSERT INTO pgboss.bam (name, version, status, queue, table_name, command)
        VALUES (
          command_name,
          version,
          'pending',
          queue_name,
          tbl_name,
          pgboss.job_table_format(command, tbl_name)
        );
        RETURN;
      END IF;

      INSERT INTO pgboss.bam (name, version, status, queue, table_name, command)
      SELECT
        command_name,
        version,
        'pending',
        NULL,
        'job_common',
        pgboss.job_table_format(command, 'job_common')
      UNION ALL
      SELECT
        command_name,
        version,
        'pending',
        queue.name,
        queue.table_name,
        pgboss.job_table_format(command, queue.table_name)
      FROM pgboss.queue
      WHERE partition = true;
    END;
    $$;


--
-- Name: sv_begin_free_ai_visibility_check(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_begin_free_ai_visibility_check(p_check_id uuid, p_organization_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
	updated "sv_free_ai_visibility_checks"%ROWTYPE;
BEGIN
	UPDATE "sv_free_ai_visibility_checks"
		SET "status" = 'UNCONFIRMED', "dispatched_at" = now()
		WHERE "id" = p_check_id
			AND "organization_id" = p_organization_id
			AND "status" = 'QUEUED'
		RETURNING * INTO updated;
	IF NOT FOUND THEN RETURN NULL; END IF;
	RETURN jsonb_build_object('checkId', updated."id", 'domain', updated."registrable_domain");
END;
$$;


--
-- Name: sv_claim_free_ai_visibility(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_claim_free_ai_visibility(p_user_id text, p_organization_id text, p_registrable_domain text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
	existing_id uuid;
	check_id uuid := gen_random_uuid();
	request_key text := 'free-ai-visibility:' || check_id::text;
	reservation jsonb;
	decision text;
BEGIN
	IF length(btrim(coalesce(p_user_id, ''))) = 0
		OR length(btrim(coalesce(p_organization_id, ''))) = 0
		OR length(btrim(coalesce(p_registrable_domain, ''))) = 0
		OR p_registrable_domain <> lower(btrim(p_registrable_domain))
	THEN
		RAISE EXCEPTION 'FREE_AI_VISIBILITY_CLAIMANT_REQUIRED';
	END IF;
	IF NOT EXISTS (
		SELECT 1
		FROM "user" u
		INNER JOIN "member" m ON m."user_id" = u."id"
		WHERE u."id" = p_user_id
			AND u."email_verified" = true
			AND m."organization_id" = p_organization_id
	) THEN
		RAISE EXCEPTION 'FREE_AI_VISIBILITY_VERIFIED_MEMBER_REQUIRED';
	END IF;

	-- Every claimant takes locks in the same order. The unique constraints remain
	-- the final line of defence; these locks make the refusal deterministic.
	PERFORM pg_advisory_xact_lock(hashtextextended('free-ai-visibility:user:' || p_user_id, 0));
	PERFORM pg_advisory_xact_lock(hashtextextended('free-ai-visibility:domain:' || p_registrable_domain, 0));

	SELECT "id" INTO existing_id
		FROM "sv_free_ai_visibility_checks"
		WHERE "user_id" = p_user_id;
	IF FOUND THEN
		RETURN jsonb_build_object('decision', 'ALREADY_CLAIMED');
	END IF;

	SELECT "id" INTO existing_id
		FROM "sv_free_ai_visibility_checks"
		WHERE "registrable_domain" = p_registrable_domain;
	IF FOUND THEN
		RETURN jsonb_build_object('decision', 'ALREADY_CLAIMED');
	END IF;

	SELECT public.sv_reserve_provider_spend(
		'free-ai-visibility-global', p_organization_id, request_key, 0.003000
	) INTO reservation;
	decision := reservation->>'decision';
	IF decision IS DISTINCT FROM 'RESERVED' THEN
		IF decision IN ('REFUSED_NO_BUDGET', 'REFUSED_OVER_CAP') THEN
			RETURN jsonb_build_object('decision', decision);
		END IF;
		RAISE EXCEPTION 'FREE_AI_VISIBILITY_RESERVATION_UNREADABLE';
	END IF;

	INSERT INTO "sv_free_ai_visibility_checks" (
		"id", "organization_id", "user_id", "registrable_domain", "reservation_request_key"
	) VALUES (check_id, p_organization_id, p_user_id, p_registrable_domain, request_key);
	RETURN jsonb_build_object('decision', 'CLAIMED', 'checkId', check_id, 'domain', p_registrable_domain);
END;
$$;


--
-- Name: sv_claim_free_auto_dispatch(uuid, text, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_claim_free_auto_dispatch(p_request_id uuid, p_organization_id text, p_project_id uuid, p_max_per_day integer, p_max_per_project_per_day integer) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
	today date := (now() AT TIME ZONE 'UTC')::date;
	held_project uuid;
	taken_today integer;
	taken_today_for_project integer;
BEGIN
	IF p_request_id IS NULL OR p_project_id IS NULL OR length(btrim(coalesce(p_organization_id, ''))) = 0 THEN
		RAISE EXCEPTION 'FREE_AUTO_DISPATCH_CLAIMANT_REQUIRED';
	END IF;
	IF p_max_per_day IS NULL OR p_max_per_day < 0 OR p_max_per_project_per_day IS NULL OR p_max_per_project_per_day < 0 THEN
		RAISE EXCEPTION 'FREE_AUTO_DISPATCH_CAP_INVALID';
	END IF;

	-- Held to the end of the caller's transaction, so the count below and the
	-- insert that follows it are one decision for every claimant at once.
	PERFORM pg_advisory_xact_lock(hashtext('sv_free_auto_dispatch_claims'));

	-- A retried submission of the same request keeps the slot it holds. A
	-- request that comes back naming another project is not a retry.
	SELECT "project_id" INTO held_project
		FROM "sv_free_auto_dispatch_claims"
		WHERE "request_id" = p_request_id;
	IF FOUND THEN
		IF held_project <> p_project_id THEN
			RAISE EXCEPTION 'FREE_AUTO_DISPATCH_CLAIM_IDENTITY_MISMATCH';
		END IF;
		RETURN 'CLAIMED';
	END IF;

	SELECT count(*) INTO taken_today
		FROM "sv_free_auto_dispatch_claims"
		WHERE "utc_day" = today;
	IF taken_today >= p_max_per_day THEN
		RETURN 'DAILY_CAP';
	END IF;

	SELECT count(*) INTO taken_today_for_project
		FROM "sv_free_auto_dispatch_claims"
		WHERE "utc_day" = today AND "project_id" = p_project_id;
	IF taken_today_for_project >= p_max_per_project_per_day THEN
		RETURN 'PROJECT_CAP';
	END IF;

	INSERT INTO "sv_free_auto_dispatch_claims" ("utc_day", "organization_id", "project_id", "request_id")
		VALUES (today, p_organization_id, p_project_id, p_request_id);
	RETURN 'CLAIMED';
END;
$$;


--
-- Name: sv_complete_free_ai_visibility_check(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_complete_free_ai_visibility_check(p_check_id uuid, p_organization_id text, p_report jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
	updated "sv_free_ai_visibility_checks"%ROWTYPE;
	settlement jsonb;
	system jsonb;
	safe_systems jsonb := '[]'::jsonb;
	safe_report jsonb;
	index integer;
BEGIN
	IF coalesce(
		p_report IS NULL
		OR jsonb_typeof(p_report) <> 'object'
		OR p_report->>'schemaVersion' <> '1'
		OR p_report->>'promptVersion' <> 'free-ai-visibility-v1'
		OR p_report->>'terminalStatus' <> 'COMPLETED'
		OR p_report->>'costUsd' <> '0.003'
		OR jsonb_typeof(p_report->'systems') <> 'array'
		OR jsonb_array_length(p_report->'systems') <> 2,
		true
	)
	THEN
		RAISE EXCEPTION 'FREE_AI_VISIBILITY_REPORT_INVALID';
	END IF;

	FOR index IN 0..1 LOOP
		system := p_report->'systems'->index;
		IF coalesce(
			jsonb_typeof(system) <> 'object'
			OR system->>'system' <> CASE WHEN index = 0 THEN 'chatgpt' ELSE 'gemini' END
			OR system->>'terminalStatus' NOT IN ('SUCCEEDED', 'FAILED')
			OR jsonb_typeof(system->'domainMentioned') <> 'boolean'
			OR jsonb_typeof(system->'citationCount') <> 'number'
			OR (system->>'citationCount') !~ '^[0-9]+$',
			true
		)
		THEN
			RAISE EXCEPTION 'FREE_AI_VISIBILITY_REPORT_INVALID';
		END IF;
		safe_systems := safe_systems || jsonb_build_array(jsonb_build_object(
			'system', system->>'system',
			'terminalStatus', system->>'terminalStatus',
			'domainMentioned', (system->>'domainMentioned')::boolean,
			'citationCount', (system->>'citationCount')::integer
		));
	END LOOP;

	-- Construct, rather than trust, the stored JSON so a caller cannot smuggle a
	-- provider id, URL, answer, or error body into the report column.
	safe_report := jsonb_build_object(
		'schemaVersion', 1,
		'promptVersion', 'free-ai-visibility-v1',
		'terminalStatus', 'COMPLETED',
		'costUsd', 0.003,
		'systems', safe_systems
	);
	UPDATE "sv_free_ai_visibility_checks"
		SET "status" = 'COMPLETED', "report" = safe_report, "completed_at" = now()
		WHERE "id" = p_check_id
			AND "organization_id" = p_organization_id
			AND "status" = 'UNCONFIRMED'
		RETURNING * INTO updated;
	IF NOT FOUND THEN RETURN false; END IF;

	SELECT public.sv_settle_provider_spend(
		'free-ai-visibility-global', p_organization_id, updated."reservation_request_key", 0.003000
	) INTO settlement;
	IF coalesce(settlement->>'decision' NOT IN ('SETTLED', 'ALREADY_SETTLED'), true) THEN
		RAISE EXCEPTION 'FREE_AI_VISIBILITY_SETTLEMENT_REFUSED';
	END IF;
	RETURN true;
END;
$_$;


--
-- Name: sv_enforce_evidence_acceptance_receipt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_enforce_evidence_acceptance_receipt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_enforce_evidence_capability_domain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_enforce_evidence_capability_domain() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_enforce_formal_evidence_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_enforce_formal_evidence_audit() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_enforce_provider_capability_insert_scope(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_enforce_provider_capability_insert_scope() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_enforce_provider_dataset_capability_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_enforce_provider_dataset_capability_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: sv_enforce_provider_dataset_snapshot_event_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_enforce_provider_dataset_snapshot_event_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
	latest_event "sv_provider_dataset_snapshot_events"%ROWTYPE;
BEGIN
	PERFORM pg_advisory_xact_lock(
		hashtextextended(
			NEW."organization_id" || ':' || NEW."project_id"::text || ':' || NEW."snapshot_id",
			0
		)
	);

	IF EXISTS (
		SELECT 1
		FROM "sv_provider_dataset_snapshot_events"
		WHERE "organization_id" = NEW."organization_id"
			AND "project_id" = NEW."project_id"
			AND "event_hash" = NEW."event_hash"
	) THEN
		RETURN NULL;
	END IF;

	SELECT * INTO latest_event
	FROM "sv_provider_dataset_snapshot_events"
	WHERE "organization_id" = NEW."organization_id"
		AND "project_id" = NEW."project_id"
		AND "snapshot_id" = NEW."snapshot_id"
	ORDER BY "observed_at" DESC, "created_at" DESC, "id" DESC
	LIMIT 1;

	IF NOT FOUND THEN
		IF NEW."phase" NOT IN ('TRIGGERED', 'RESUMED') THEN
			RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_INITIAL_PHASE_INVALID';
		END IF;
		RETURN NEW;
	END IF;

	IF latest_event."provider" <> NEW."provider"
		OR latest_event."source" <> NEW."source"
		OR latest_event."provider_dataset_id" <> NEW."provider_dataset_id" THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_IDENTITY_MISMATCH';
	END IF;
	IF NEW."observed_at" < latest_event."observed_at" THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_OBSERVED_AT_REGRESSION';
	END IF;
	IF latest_event."phase" IN ('DELIVERED', 'TIMEOUT', 'TERMINAL_FAILURE', 'INVALID') THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_TERMINAL';
	END IF;
	IF latest_event."phase" = 'INTERRUPTED' AND NEW."phase" <> 'RESUMED' THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_RESUME_REQUIRED';
	END IF;
	IF latest_event."phase" = 'READY'
		AND NEW."phase" NOT IN ('DELIVERED', 'TIMEOUT', 'INVALID', 'INTERRUPTED') THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_TRANSITION_INVALID';
	END IF;
	IF latest_event."phase" IN ('TRIGGERED', 'RESUMED', 'PENDING')
		AND NEW."phase" NOT IN (
			'PENDING', 'READY', 'TIMEOUT', 'TERMINAL_FAILURE', 'INVALID', 'INTERRUPTED'
		) THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_TRANSITION_INVALID';
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_enforce_provider_snapshot_contract(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_enforce_provider_snapshot_contract() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: sv_guard_action_status_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_action_status_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
	verification_ready boolean;
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" <> 'PROPOSED' THEN
			RAISE EXCEPTION 'ACTION_INITIAL_STATUS_INVALID';
		END IF;
		RETURN NEW;
	END IF;

	IF NEW."status" = OLD."status" THEN
		RETURN NEW;
	END IF;
	IF NOT (
		(OLD."status" = 'PROPOSED' AND NEW."status" IN ('APPROVED', 'REJECTED'))
		OR (OLD."status" = 'APPROVED' AND NEW."status" IN ('IN_PROGRESS', 'ABANDONED'))
		OR (OLD."status" = 'IN_PROGRESS' AND NEW."status" IN ('IMPLEMENTED', 'ABANDONED'))
		OR (OLD."status" = 'IMPLEMENTED' AND NEW."status" = 'VERIFIED')
	) THEN
		RAISE EXCEPTION 'ACTION_TRANSITION_INVALID';
	END IF;

	IF NEW."status" = 'APPROVED' AND NOT EXISTS (
		SELECT 1 FROM "sv_action_approvals"
		WHERE "action_id" = NEW."id" AND "organization_id" = NEW."organization_id"
	) THEN
		RAISE EXCEPTION 'ACTION_APPROVER_REQUIRED';
	END IF;

	IF NEW."status" = 'VERIFIED' THEN
		SELECT EXISTS (
			SELECT 1
			FROM "sv_verification_cycles" vc
			WHERE vc."action_id" = NEW."id"
				AND vc."organization_id" = NEW."organization_id"
				AND vc."status" = 'COMPLETED'
				AND vc."completed_at" >= (
					SELECT max(ce."occurred_at") + make_interval(days => vc."settle_days")
					FROM "sv_change_events" ce
					WHERE ce."action_id" = NEW."id"
						AND ce."organization_id" = NEW."organization_id"
				)
		) INTO verification_ready;
		IF NOT verification_ready THEN
			RAISE EXCEPTION 'ACTION_VERIFICATION_INCOMPLETE';
		END IF;
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_guard_api_idempotency_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_api_idempotency_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		IF OLD."expires_at" > now() THEN
			RAISE EXCEPTION 'API_IDEMPOTENCY_ACTIVE_DELETE_BLOCKED';
		END IF;
		RETURN OLD;
	END IF;
	IF TG_OP = 'UPDATE' THEN
		RAISE EXCEPTION 'API_IDEMPOTENCY_UPDATE_BLOCKED';
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_guard_attribution_assessment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_attribution_assessment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
	verification_state sv_verification_status;
	matched_events integer;
BEGIN
	SELECT "status" INTO verification_state
	FROM "sv_verification_cycles"
	WHERE "id" = NEW."verification_cycle_id"
		AND "organization_id" = NEW."organization_id";
	IF verification_state IS DISTINCT FROM 'COMPLETED'
		AND (NEW."verdict" <> 'INSUFFICIENT_EVIDENCE'
			OR NOT ('VERIFICATION_INCOMPLETE' = ANY(NEW."reason_codes"))) THEN
		RAISE EXCEPTION 'ATTRIBUTION_VERIFICATION_INCOMPLETE';
	END IF;

	SELECT count(*) INTO matched_events
	FROM "sv_change_events"
	WHERE "id" = ANY(NEW."change_event_ids")
		AND "organization_id" = NEW."organization_id";
	IF matched_events <> cardinality(NEW."change_event_ids") THEN
		RAISE EXCEPTION 'ATTRIBUTION_CHANGE_EVENT_SCOPE_INVALID';
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_guard_configuration_lock_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_configuration_lock_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	IF NEW."legacy_collision_ordinal" <> 0 THEN
		RAISE EXCEPTION 'CONFIGURATION_LOCK_LEGACY_COLLISION_ORDINAL_RESERVED';
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_guard_grid_point_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_grid_point_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
	grid_uuid uuid;
	point_org text;
	definition_org text;
	declared_points integer;
BEGIN
	grid_uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD."grid_id" ELSE NEW."grid_id" END;
	point_org := CASE WHEN TG_OP = 'DELETE' THEN OLD."organization_id" ELSE NEW."organization_id" END;

	IF EXISTS (
		SELECT 1 FROM "sv_local_scan_cycles"
		WHERE "grid_definition_id" = grid_uuid
	) THEN
		RAISE EXCEPTION 'LOCAL_GRID_IMMUTABLE';
	END IF;

	IF TG_OP <> 'DELETE' THEN
		SELECT "organization_id", "point_count"
		INTO definition_org, declared_points
		FROM "sv_grid_definitions"
		WHERE "id" = NEW."grid_id";
		IF point_org <> definition_org OR NEW."point_index" >= declared_points THEN
			RAISE EXCEPTION 'LOCAL_GRID_POINT_OUTSIDE_DEFINITION';
		END IF;
	END IF;
	RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;


--
-- Name: sv_guard_journal_daily_claim_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_journal_daily_claim_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_guard_journal_no_spend_reconciliation_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_journal_no_spend_reconciliation_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: sv_guard_journal_provider_boundary_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_journal_provider_boundary_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
	IF NEW."crossed_at" > clock_timestamp()
		OR NEW."boundary_kind" <> 'PRE_TRANSPORT'
		OR NEW."provider_call_upper_bound" <> 1
		OR NOT EXISTS (
			SELECT 1
			FROM "public"."sv_journal_daily_claims" AS claim
			INNER JOIN "public"."sv_cycles" AS cycle
				ON cycle."id" = NEW."cycle_id"
				AND cycle."lock_id" = claim."configuration_lock_id"
				AND cycle."organization_id" = claim."organization_id"
			INNER JOIN "public"."sv_run_permits" AS permit
				ON permit."id" = NEW."permit_id"
				AND permit."cycle_id" = cycle."id"
				AND permit."organization_id" = claim."organization_id"
			INNER JOIN "public"."sv_runs" AS run
				ON run."id" = NEW."run_id"
				AND run."permit_id" = permit."id"
				AND run."cycle_id" = cycle."id"
				AND run."organization_id" = claim."organization_id"
			WHERE claim."id" = NEW."journal_claim_id"
				AND claim."organization_id" = NEW."organization_id"
				AND claim."project_id" = NEW."project_id"
				AND claim."configuration_lock_id" = NEW."configuration_lock_id"
				AND claim."status" = 'EXECUTING'
				AND permit."consumed_at" IS NOT NULL
				AND permit."dispatch_key" = NEW."dispatch_key"
				AND permit."channel" = NEW."channel"
				AND permit."system_id" IS NOT DISTINCT FROM NEW."system_id"
				AND run."dispatch_key" = NEW."dispatch_key"
				AND run."channel" = NEW."channel"
				AND run."system_id" IS NOT DISTINCT FROM NEW."system_id"
				AND run."status" = 'RUNNING'
		)
	THEN
		RAISE EXCEPTION 'JOURNAL_PROVIDER_BOUNDARY_PROVENANCE_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_guard_local_cycle_project_scope(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_local_cycle_project_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
	linked_entity_id uuid;
	linked_project_id uuid;
	lock_project_id uuid;
BEGIN
	SELECT location."entity_id"
	INTO linked_entity_id
	FROM "sv_business_locations" AS location
	WHERE location."id" = NEW."location_id"
		AND location."organization_id" = NEW."organization_id"
	FOR UPDATE OF location;
	IF linked_entity_id IS NOT NULL THEN
		SELECT entity."project_id"
		INTO linked_project_id
		FROM "sv_entities" AS entity
		WHERE entity."id" = linked_entity_id
			AND entity."organization_id" = NEW."organization_id"
		FOR UPDATE OF entity;
	END IF;
	SELECT configuration_lock."project_id"
	INTO lock_project_id
	FROM "sv_configuration_locks" AS configuration_lock
	WHERE configuration_lock."id" = NEW."configuration_lock_id"
		AND configuration_lock."organization_id" = NEW."organization_id";

	IF linked_entity_id IS NULL
		OR linked_project_id IS NULL
		OR lock_project_id IS NULL
		OR linked_project_id IS DISTINCT FROM lock_project_id
	THEN
		RAISE EXCEPTION 'LOCAL_MAPS_LOCATION_LOCK_PROJECT_SCOPE_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_guard_local_observation_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_local_observation_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE c sv_local_scan_cycles%ROWTYPE;
BEGIN
 SELECT * INTO c FROM sv_local_scan_cycles WHERE id=NEW.cycle_id AND organization_id=NEW.organization_id FOR UPDATE;
 IF NOT FOUND OR c.execution_mode='LEGACY_SOURCE_ONLY' OR c.status<>'APPROVED' OR c.emergency_stopped_at IS NOT NULL
  THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_CYCLE_BLOCKED'; END IF;
 IF NEW.outcome<>'PENDING' OR NEW.provider<>c.provider OR NEW.capture_depth<>c.capture_depth
  OR NEW.repeat_index<>0 OR NEW.grid_definition_id<>c.grid_definition_id OR NEW.location_id<>c.location_id
  OR NOT EXISTS(SELECT 1 FROM sv_local_keywords WHERE id=NEW.keyword_id AND organization_id=NEW.organization_id AND location_id=c.location_id)
  OR NOT EXISTS(SELECT 1 FROM sv_grid_points WHERE id=NEW.grid_point_id AND organization_id=NEW.organization_id AND grid_id=c.grid_definition_id)
  OR NOT EXISTS(SELECT 1 FROM sv_configuration_locks l WHERE l.id=c.configuration_lock_id AND l.organization_id=c.organization_id AND l.snapshot#>>'{keywordSet,keywordIds,0}'=NEW.keyword_id::text)
  THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_OUTSIDE_CYCLE'; END IF;
 IF (SELECT count(*) FROM sv_local_rank_observations WHERE cycle_id=c.id AND organization_id=c.organization_id)>=9
  THEN RAISE EXCEPTION 'LOCAL_CARDINALITY_INCIDENT'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_guard_local_scope_parent_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_local_scope_parent_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	IF TG_TABLE_NAME = 'sv_entities' THEN
		IF (
				OLD."organization_id" IS DISTINCT FROM NEW."organization_id"
				OR OLD."project_id" IS DISTINCT FROM NEW."project_id"
			)
			AND EXISTS (
				SELECT 1
				FROM "sv_business_locations" AS location
				JOIN "sv_local_scan_cycles" AS local_cycle
					ON local_cycle."location_id" = location."id"
					AND local_cycle."organization_id" = location."organization_id"
				WHERE location."entity_id" = OLD."id"
					AND location."organization_id" = OLD."organization_id"
			)
		THEN
			RAISE EXCEPTION 'LOCAL_MAPS_ENTITY_SCOPE_MUTATION_BLOCKED';
		END IF;
	END IF;

	IF TG_TABLE_NAME = 'sv_business_locations' THEN
		IF (
				OLD."organization_id" IS DISTINCT FROM NEW."organization_id"
				OR OLD."entity_id" IS DISTINCT FROM NEW."entity_id"
			)
			AND EXISTS (
				SELECT 1
				FROM "sv_local_scan_cycles" AS local_cycle
				WHERE local_cycle."location_id" = OLD."id"
					AND local_cycle."organization_id" = OLD."organization_id"
			)
		THEN
			RAISE EXCEPTION 'LOCAL_MAPS_LOCATION_SCOPE_MUTATION_BLOCKED';
		END IF;
	END IF;

	RETURN NEW;
END;
$$;


--
-- Name: sv_guard_measurement_attempt_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_measurement_attempt_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
	prior_attempts integer;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status='CANCELLED_NO_CALL' THEN
  IF OLD.status<>'CLAIMED' OR OLD.submitted_at IS NOT NULL
   OR (to_jsonb(OLD)-ARRAY['status','budget_state','released_cost_usd','completed_at','row_version','updated_at'])
   IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','budget_state','released_cost_usd','completed_at','row_version','updated_at'])
   THEN RAISE EXCEPTION 'LOCAL_CANCEL_NO_CALL_INVALID'; END IF;
  NEW.row_version:=OLD.row_version+1; NEW.updated_at:=now(); RETURN NEW;
 END IF;
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
		AND NOT (
			(OLD."status" = 'CLAIMED' AND NEW."status" = 'CLAIMED'
				AND OLD."lease_expires_at" <= now()
				AND NEW."lease_expires_at" > now()
				AND NEW."lease_expires_at" > OLD."lease_expires_at")
			OR (OLD."status" = 'CLAIMED' AND NEW."status" = 'SUBMITTED'
				AND OLD."lease_expires_at" > now()
				AND NEW."lease_expires_at" > now()
				AND NEW."lease_expires_at" > OLD."lease_expires_at")
		) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_LEASE_RENEWAL_BLOCKED';
	END IF;
	IF OLD."status" = 'CLAIMED' AND NEW."status" = 'SUBMITTED'
		AND OLD."lease_expires_at" <= now() THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_CLAIM_EXPIRED';
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
$_$;


--
-- Name: sv_guard_measurement_attempt_result_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_measurement_attempt_result_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
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
$_$;


--
-- Name: sv_guard_outcome_observation_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_guard_outcome_observation_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'OUTCOME_OBSERVATION_IMMUTABLE';
END;
$$;


--
-- Name: sv_journal_claim_recovery_state(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_journal_claim_recovery_state(p_claim_id uuid) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
	claim_record "public"."sv_journal_daily_claims"%ROWTYPE;
	cycle_count integer := 0;
	completed_cycle_count integer := 0;
	pre_execution_cycle_count integer := 0;
	run_count integer := 0;
	consumed_permit_count integer := 0;
	cost_event_count integer := 0;
	boundary_count integer := 0;
BEGIN
	SELECT * INTO claim_record
	FROM "public"."sv_journal_daily_claims"
	WHERE "id" = p_claim_id
		AND "organization_id" = current_setting('app.organization_id', true);
	IF NOT FOUND THEN
		RETURN 'NOT_FOUND';
	END IF;

	SELECT count(*)::integer,
		count(*) FILTER (
			WHERE cycle."status" IN ('QC_REQUIRED', 'READY')
				AND cycle."expected_runs" > 0
				AND cycle."completed_runs" = cycle."expected_runs"
				AND (
					SELECT count(*) FROM "public"."sv_runs" AS run
					WHERE run."cycle_id" = cycle."id"
						AND run."organization_id" = cycle."organization_id"
				) = cycle."expected_runs"
				AND (
					SELECT count(*) FROM "public"."sv_runs" AS run
					WHERE run."cycle_id" = cycle."id"
						AND run."organization_id" = cycle."organization_id"
						AND run."status" <> 'RUNNING'
				) = cycle."expected_runs"
				AND (
					SELECT count(*) FROM "public"."sv_journal_provider_boundaries" AS boundary
					WHERE boundary."journal_claim_id" = claim_record."id"
						AND boundary."cycle_id" = cycle."id"
						AND boundary."organization_id" = cycle."organization_id"
				) = cycle."expected_runs"
		)::integer,
		count(*) FILTER (
			WHERE cycle."status" IN ('CREATED', 'APPROVED', 'QUEUED')
				AND cycle."created_runs" = 0
				AND cycle."completed_runs" = 0
		)::integer
	INTO cycle_count, completed_cycle_count, pre_execution_cycle_count
	FROM "public"."sv_cycles" AS cycle
	WHERE cycle."lock_id" = claim_record."configuration_lock_id"
		AND cycle."organization_id" = claim_record."organization_id";

	SELECT count(run."id")::integer
	INTO run_count
	FROM "public"."sv_cycles" AS cycle
	INNER JOIN "public"."sv_runs" AS run
		ON run."cycle_id" = cycle."id"
		AND run."organization_id" = cycle."organization_id"
	WHERE cycle."lock_id" = claim_record."configuration_lock_id"
		AND cycle."organization_id" = claim_record."organization_id";

	SELECT count(permit."id") FILTER (WHERE permit."consumed_at" IS NOT NULL)::integer
	INTO consumed_permit_count
	FROM "public"."sv_cycles" AS cycle
	INNER JOIN "public"."sv_run_permits" AS permit
		ON permit."cycle_id" = cycle."id"
		AND permit."organization_id" = cycle."organization_id"
	WHERE cycle."lock_id" = claim_record."configuration_lock_id"
		AND cycle."organization_id" = claim_record."organization_id";

	SELECT count(cost."id")::integer
	INTO cost_event_count
	FROM "public"."sv_cycles" AS cycle
	INNER JOIN "public"."sv_cost_events" AS cost
		ON cost."cycle_id" = cycle."id"
		AND cost."organization_id" = cycle."organization_id"
	WHERE cycle."lock_id" = claim_record."configuration_lock_id"
		AND cycle."organization_id" = claim_record."organization_id";

	SELECT count(*)::integer INTO boundary_count
	FROM "public"."sv_journal_provider_boundaries"
	WHERE "journal_claim_id" = claim_record."id"
		AND "organization_id" = claim_record."organization_id";

	IF cycle_count = 1 AND completed_cycle_count = 1 THEN
		RETURN 'TERMINAL_COMPLETED';
	END IF;
	IF cycle_count = pre_execution_cycle_count
		AND run_count = 0
		AND consumed_permit_count = 0
		AND cost_event_count = 0
		AND boundary_count = 0
	THEN
		RETURN 'NO_SPEND';
	END IF;
	RETURN 'AMBIGUOUS';
END;
$$;


--
-- Name: sv_local_acceptance_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_acceptance_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM sv_local_rank_observations o
  JOIN sv_local_scan_cycles c ON c.id=o.cycle_id AND c.organization_id=o.organization_id
  JOIN sv_evidence_index e ON e.id=o.evidence_id AND e.organization_id=o.organization_id
  JOIN sv_source_snapshots s ON s.id=e.source_snapshot_id AND s.organization_id=e.organization_id
  WHERE o.id=NEW.observation_id AND o.organization_id=NEW.organization_id
  AND o.validity='VALID' AND o.outcome IN ('FOUND','ABSENT_WITHIN_DEPTH')
  AND o.evidence_id=NEW.evidence_id AND o.evidence_sha256=NEW.evidence_sha256
  AND s.source_type='LOCAL_MAPS_PROVIDER' AND s.immutable
  AND c.execution_mode='PILOT' AND c.approved_canary_review_id IS NOT NULL
  AND c.emergency_stopped_at IS NULL AND c.status<>'BUDGET_BLOCKED'
 ) THEN RAISE EXCEPTION 'LOCAL_ACCEPTANCE_CHAIN_INVALID'; END IF;
 IF NEW.accepted_at > now() OR NEW.accepted_at < (SELECT captured_at FROM sv_local_rank_observations WHERE id=NEW.observation_id)
 THEN RAISE EXCEPTION 'LOCAL_ACCEPTANCE_TIME_INVALID'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_ai_evidence_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_ai_evidence_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE spec jsonb; slot sv_local_ai_slots; point jsonb; prompt jsonb;
BEGIN
 IF TG_OP='UPDATE' THEN
 IF OLD.raw_body IS NOT NULL AND NEW.raw_body IS NULL AND NEW.raw_canonical IS NULL AND NEW.expired_at IS NOT NULL AND OLD.expires_at<=clock_timestamp()
 AND (to_jsonb(NEW)-ARRAY['raw_body','raw_canonical','expired_at'])=(to_jsonb(OLD)-ARRAY['raw_body','raw_canonical','expired_at']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'LOCAL_AI_EVIDENCE_IMMUTABLE';
 END IF;
 SELECT * INTO slot FROM sv_local_ai_slots WHERE id=NEW.slot_id AND organization_id=NEW.organization_id;
 SELECT lock_json INTO spec FROM sv_local_ai_orders WHERE id=slot.order_id AND organization_id=NEW.organization_id;
 IF spec IS NULL OR NOT EXISTS(SELECT 1 FROM sv_local_ai_payments WHERE order_id=slot.order_id AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'LOCAL_AI_TEST_PAYMENT_REQUIRED'; END IF;
 IF NEW.expired_at IS NOT NULL THEN RAISE EXCEPTION 'LOCAL_AI_EVIDENCE_INVALID'; END IF;
 IF NEW.result_json->>'validity'='VALID' THEN
 SELECT p INTO point FROM jsonb_array_elements(spec#>'{grid,points}') p WHERE p->>'id'=slot.point_id::text;
 SELECT p INTO prompt FROM jsonb_array_elements(spec#>'{promptSet,prompts}') p WHERE p->>'id'=slot.prompt_id::text;
 IF NEW.raw_body IS NULL OR NEW.raw_sha256 IS NULL OR NEW.raw_canonical IS NULL
 OR NEW.raw_body->>'provenance' IS DISTINCT FROM 'FIXTURE_NOT_REAL_AI'
 OR NEW.raw_body#>>'{proof,method}' IS DISTINCT FROM spec->>'coordinateProofMethod'
 OR NEW.raw_body#>>'{proof,precision}' IS DISTINCT FROM 'POINT' OR NEW.raw_body#>>'{proof,applied}' IS DISTINCT FROM 'true'
 OR NEW.raw_body#>>'{proof,pointId}' IS DISTINCT FROM slot.point_id::text
 OR NEW.raw_body#>>'{proof,taskId}' IS DISTINCT FROM 'fixture:'||slot.id::text
 OR NEW.raw_body#>>'{proof,latitude}' IS DISTINCT FROM point->>'latitude' OR NEW.raw_body#>>'{proof,longitude}' IS DISTINCT FROM point->>'longitude'
 OR NEW.raw_body#>>'{request,latitude}' IS DISTINCT FROM point->>'latitude' OR NEW.raw_body#>>'{request,longitude}' IS DISTINCT FROM point->>'longitude'
 OR NEW.raw_body->>'pointId' IS DISTINCT FROM slot.point_id::text OR NEW.raw_body->>'promptId' IS DISTINCT FROM slot.prompt_id::text
 OR NEW.raw_body->>'promptText' IS DISTINCT FROM prompt->>'text' OR NEW.raw_body->>'systemId' IS DISTINCT FROM slot.system_id
 OR NEW.raw_body->>'repeat' IS DISTINCT FROM slot.repeat_index::text OR coalesce(length(NEW.raw_body->>'answer'),0)=0
 OR NEW.raw_body->'mention' IS DISTINCT FROM NEW.result_json->'mention'
 OR NEW.raw_body->'recommendationPosition' IS DISTINCT FROM NEW.result_json->'recommendationPosition'
 OR NEW.raw_body->'citations' IS DISTINCT FROM NEW.result_json->'citations'
 OR NEW.raw_body->'competitors' IS DISTINCT FROM NEW.result_json->'competitors'
 THEN RAISE EXCEPTION 'LOCAL_AI_COORDINATE_PROOF_FAILED'; END IF;
 END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_ai_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_ai_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN RAISE EXCEPTION 'LOCAL_AI_IMMUTABLE'; END; $$;


--
-- Name: sv_local_ai_scope_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_ai_scope_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE spec jsonb; count_slots integer;
BEGIN
 SELECT lock_json INTO spec FROM sv_local_ai_orders WHERE id=NEW.order_id AND organization_id=NEW.organization_id FOR UPDATE;
 IF spec IS NULL THEN RAISE EXCEPTION 'LOCAL_AI_ORDER_NOT_FOUND'; END IF;
 SELECT count(*) INTO count_slots FROM sv_local_ai_slots WHERE order_id=NEW.order_id;
 IF count_slots >= (spec->>'expectedCardinality')::integer OR NEW.ordinal<0 OR NEW.ordinal >= (spec->>'expectedCardinality')::integer
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(spec#>'{grid,points}') p WHERE p->>'id'=NEW.point_id::text)
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(spec#>'{promptSet,prompts}') p WHERE p->>'id'=NEW.prompt_id::text)
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(spec->'systems') s WHERE s->>'id'=NEW.system_id AND s->>'id' IN ('fixture-visitor-v1','fixture-api-v1'))
 OR NEW.repeat_index<0 OR NEW.repeat_index >= (spec->>'repeats')::integer
 THEN RAISE EXCEPTION 'LOCAL_AI_CARDINALITY_OR_SCOPE_INVALID'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_budget_incident_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_budget_incident_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF OLD.status='BUDGET_BLOCKED' AND (NEW.status<>'BUDGET_BLOCKED' OR NEW.emergency_stopped_at IS DISTINCT FROM OLD.emergency_stopped_at)
 THEN RAISE EXCEPTION 'LOCAL_BUDGET_INCIDENT_RECONCILIATION_REQUIRED'; END IF;
 IF NEW.status='CANARY_REVIEW' AND (NEW.emergency_stopped_at IS NOT NULL OR EXISTS (
  SELECT 1 FROM sv_measurement_attempt_results r WHERE r.organization_id=NEW.organization_id AND r.local_cycle_id=NEW.id AND r.budget_incident IS NOT NULL
 )) THEN RAISE EXCEPTION 'LOCAL_CANARY_BUDGET_INCIDENT'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_customer_run_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_customer_run_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF current_user<>pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=TG_RELID)) THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_WORKER_REQUIRED'; END IF;
 IF TG_OP<>'UPDATE' OR OLD.status IN ('READY','CANCELLED') OR
 (to_jsonb(NEW)-ARRAY['status','finished_at','failure_count']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','finished_at','failure_count'])
 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_RUN_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_customer_source_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_customer_source_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM sv_source_snapshots s WHERE s.id=NEW.source_snapshot_id AND s.organization_id=NEW.organization_id AND s.source_type='LOCAL_MAPS_CANARY_ONLY')
 THEN RAISE EXCEPTION 'LOCAL_CANARY_CUSTOMER_EVIDENCE_FORBIDDEN'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_customer_start_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_customer_start_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE spec jsonb; n integer;
BEGIN
 IF NEW.actor_id IS DISTINCT FROM current_setting('app.user_id',true)
 OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor_id AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_ORDER_MEMBER_REQUIRED'; END IF;
 SELECT l.snapshot INTO spec FROM sv_orders o
 JOIN sv_quotes q ON q.id=o.quote_id AND q.lock_id=o.lock_id AND q.organization_id=o.organization_id
 JOIN sv_configuration_locks l ON l.id=o.lock_id AND l.organization_id=o.organization_id
 WHERE o.id=NEW.order_id AND o.organization_id=NEW.organization_id AND o.status='PAID_REVIEW_REQUIRED'
 AND q.price_amount=49 AND q.currency='USD'
 AND EXISTS(SELECT 1 FROM sv_payments p WHERE p.order_id=o.id AND p.organization_id=o.organization_id AND p.provider='test' AND p.status='SUCCEEDED' AND p.amount=49 AND p.currency='USD');
 IF spec IS NULL OR spec IS DISTINCT FROM NEW.snapshot_canonical::jsonb
 OR spec->>'domainId' IS DISTINCT FROM 'LOCAL_MAPS_ORDER' OR spec->>'paymentMode' IS DISTINCT FROM 'TEST'
 OR spec#>>'{providerPolicy,mode}' IS DISTINCT FROM 'FIXTURE'
 OR (spec#>>'{providerPolicy,perAttemptWorstCaseUsd}')::numeric IS DISTINCT FROM 0
 OR (spec->>'worstCaseProviderCostUsd')::numeric IS DISTINCT FROM 0
 OR NEW.expected_slots IS DISTINCT FROM (spec->>'expectedSlots')::integer
 OR NEW.status<>'QUEUED' THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_PAID_FIXTURE_REQUIRED'; END IF;
 INSERT INTO sv_local_customer_tasks(order_id,organization_id,query_index,point_index,keyword,latitude,longitude)
 SELECT NEW.order_id,NEW.organization_id,(q.i-1)::int,(p.v->>'pointIndex')::int,q.v#>>'{}',(p.v->>'latitude')::numeric,(p.v->>'longitude')::numeric
 FROM jsonb_array_elements(spec->'queries') WITH ORDINALITY q(v,i),jsonb_array_elements(spec#>'{grid,points}') p(v);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>NEW.expected_slots THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_CARDINALITY_INVALID'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_customer_task_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_customer_task_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF current_user<>pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=TG_RELID)) THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_WORKER_REQUIRED'; END IF;
 IF TG_OP<>'UPDATE' OR OLD.status='DONE' OR
 (to_jsonb(NEW)-ARRAY['status','result_json']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','result_json'])
 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_TASK_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_customer_task_insert_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_customer_task_insert_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE spec jsonb;
BEGIN
 SELECT snapshot_canonical::jsonb INTO spec FROM sv_local_customer_runs WHERE order_id=NEW.order_id AND organization_id=NEW.organization_id AND status='QUEUED';
 IF spec IS NULL OR NEW.status<>'PENDING' OR NEW.result_json IS NOT NULL
 OR spec->'queries'->>NEW.query_index IS DISTINCT FROM NEW.keyword
 OR (spec#>'{grid,points}'->NEW.point_index->>'pointIndex')::integer IS DISTINCT FROM NEW.point_index
 OR (spec#>'{grid,points}'->NEW.point_index->>'latitude')::numeric IS DISTINCT FROM NEW.latitude
 OR (spec#>'{grid,points}'->NEW.point_index->>'longitude')::numeric IS DISTINCT FROM NEW.longitude
 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_SLOT_INVALID'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_delivery_member_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_delivery_member_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.recipient_identity)
 THEN RAISE EXCEPTION 'LOCAL_MEMBERSHIP_REQUIRED'; END IF;
 IF TG_OP='INSERT' AND (NEW.actor IS DISTINCT FROM current_setting('app.user_id',true) OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor AND role IN ('owner','admin')))
 THEN RAISE EXCEPTION 'LOCAL_OPERATOR_MEMBERSHIP_REQUIRED'; END IF;
 IF NEW.status='ACKNOWLEDGED' AND (NEW.acknowledged_at IS NULL OR NEW.acknowledged_at<NEW.sent_at OR NEW.acknowledged_at>now())
 THEN RAISE EXCEPTION 'LOCAL_DELIVERY_ACK_TIME_INVALID'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_external_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_external_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN RAISE EXCEPTION 'LOCAL_EXTERNAL_IMMUTABLE'; END; $$;


--
-- Name: sv_local_external_publication_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_external_publication_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF NEW.actor_id IS DISTINCT FROM current_setting('app.user_id',true)
 OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor_id AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_OPERATOR_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM sv_local_report_versions r
  JOIN sv_local_scan_cycles c ON c.id=r.local_cycle_id AND c.organization_id=r.organization_id
  JOIN sv_configuration_locks l ON l.id=c.configuration_lock_id AND l.organization_id=c.organization_id
  JOIN sv_local_external_audits a ON a.id=NEW.audit_id AND a.organization_id=r.organization_id
  WHERE r.id=NEW.report_version_id AND r.organization_id=NEW.organization_id AND r.status='PUBLISHED'
  AND l.snapshot#>>'{targetIdentity,cid}' = a.content_json#>>'{target,cid}'
  AND (l.snapshot#>>'{targetIdentity,placeId}' IS NULL
   OR l.snapshot#>>'{targetIdentity,placeId}' = a.content_json#>>'{target,placeId}')
  AND (SELECT count(raw.provider_task_id) FROM sv_local_external_raw_evidence raw WHERE raw.audit_id=a.id AND raw.organization_id=a.organization_id)=(a.content_json->>'observationCount')::integer)
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_PUBLISHED_TARGET_REQUIRED'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_external_raw_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_external_raw_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_METADATA_IMMUTABLE'; END IF;
 IF TG_OP='INSERT' THEN
  IF NOT EXISTS(SELECT 1 FROM sv_local_external_tasks t JOIN sv_local_external_audits a ON a.id=t.audit_id AND a.organization_id=t.organization_id,
   jsonb_array_elements(a.content_json->'batches') b,jsonb_array_elements(b->'observations') o
   WHERE t.provider_task_id=NEW.provider_task_id AND t.organization_id=NEW.organization_id AND t.audit_id=NEW.audit_id AND t.raw_sha256=NEW.raw_sha256
   AND o->>'providerTaskId'=NEW.provider_task_id AND (o->>'capturedAt')::timestamptz=NEW.captured_at)
  THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_SOURCE_REQUIRED'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['raw_body','raw_deleted_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['raw_body','raw_deleted_at'])
   OR OLD.raw_body IS NULL OR NEW.raw_body IS NOT NULL
  THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_METADATA_IMMUTABLE'; END IF;
 END IF;
 IF NEW.raw_body IS NULL AND (NEW.retention_expires_at>now() OR NEW.raw_deleted_at<NEW.retention_expires_at OR NEW.raw_deleted_at>now())
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_RETENTION_REQUIRED'; END IF;
 IF NEW.raw_body IS NOT NULL AND NEW.retention_expires_at<=now() THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_EXPIRED'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_external_register_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_external_register_tasks() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE batch jsonb; item jsonb; count_tasks integer := 0;
BEGIN
 IF NEW.actor_id IS DISTINCT FROM current_setting('app.user_id',true)
 OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor_id AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_OPERATOR_REQUIRED'; END IF;
 FOR batch IN SELECT * FROM jsonb_array_elements(NEW.content_json->'batches') LOOP
  FOR item IN SELECT * FROM jsonb_array_elements(batch->'observations') LOOP
   INSERT INTO sv_local_external_tasks(provider_task_id,organization_id,audit_id,raw_sha256)
   VALUES(item->>'providerTaskId',NEW.organization_id,NEW.id,item->>'rawSha256');
   count_tasks := count_tasks+1;
  END LOOP;
 END LOOP;
 IF count_tasks<9 OR count_tasks IS DISTINCT FROM (NEW.content_json->>'observationCount')::integer
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_TASK_COUNT_INVALID'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_external_task_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_external_task_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM sv_local_external_audits a,
  jsonb_array_elements(a.content_json->'batches') b,
  jsonb_array_elements(b->'observations') i
  WHERE a.id=NEW.audit_id AND a.organization_id=NEW.organization_id
  AND i->>'providerTaskId'=NEW.provider_task_id AND i->>'rawSha256'=NEW.raw_sha256)
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_TASK_SOURCE_REQUIRED'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_first_attempt_terminal_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_first_attempt_terminal_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF NEW.status='TERMINAL_FAILURE' AND NEW.attempt_index=1 AND NEW.retry_reason IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM sv_local_scan_cycles c WHERE c.measurement_cycle_id=NEW.measurement_cycle_id AND c.organization_id=NEW.organization_id AND c.execution_mode='CANARY'
 ) THEN RAISE EXCEPTION 'LOCAL_FIRST_ATTEMPT_TERMINAL_CANARY_REQUIRED'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_observation_acceptance_required(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_observation_acceptance_required() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF NEW.validity='VALID' AND NOT EXISTS(SELECT 1 FROM sv_local_evidence_acceptances WHERE organization_id=NEW.organization_id AND observation_id=NEW.id AND evidence_id=NEW.evidence_id AND evidence_sha256=NEW.evidence_sha256)
 THEN RAISE EXCEPTION 'LOCAL_ACCEPTANCE_REQUIRED'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_order_publication_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_order_publication_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=TG_RELID))
 OR OLD.status<>'PUBLISHED' OR NEW.status<>'REVOKED'
 OR (to_jsonb(NEW)-ARRAY['status','revoked_at','revoked_by']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','revoked_at','revoked_by'])
 THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_pilot_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_pilot_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN RAISE EXCEPTION 'LOCAL_PILOT_APPEND_ONLY'; END; $$;


--
-- Name: sv_local_pilot_attempt_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_pilot_attempt_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE c sv_local_scan_cycles%ROWTYPE; o sv_local_rank_observations%ROWTYPE; r sv_provider_spend_reservations%ROWTYPE; locked jsonb;
BEGIN
 IF NEW.domain_id<>'LOCAL_MAPS' THEN RETURN NEW; END IF;
 IF NEW.organization_id IS DISTINCT FROM nullif(current_setting('app.organization_id',true),'') THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_TENANT_REQUIRED'; END IF;
 SELECT * INTO c FROM sv_local_scan_cycles WHERE measurement_cycle_id=NEW.measurement_cycle_id AND organization_id=NEW.organization_id FOR UPDATE;
 SELECT * INTO o FROM sv_local_rank_observations WHERE id=NEW.local_observation_id AND organization_id=NEW.organization_id;
 SELECT * INTO r FROM sv_provider_spend_reservations WHERE id=NEW.reservation_id AND organization_id=NEW.organization_id AND scope='local-maps' AND request_key=NEW.execution_key;
 IF c.id IS NULL OR c.execution_mode='LEGACY_SOURCE_ONLY' OR o.id IS NULL OR o.cycle_id<>c.id
  OR o.grid_point_id<>NEW.point_id OR o.keyword_id<>NEW.item_id OR o.provider<>NEW.executor_id OR o.repeat_index<>NEW.repeat_index
  OR NEW.observation_ref<>o.id::text OR r.id IS NULL OR r.estimated_usd<>NEW.reserved_cost_usd
  THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_SCOPE_OR_RESERVATION_MISMATCH'; END IF;
 IF TG_OP='UPDATE' AND OLD.local_observation_id IS DISTINCT FROM NEW.local_observation_id THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_OBSERVATION_IMMUTABLE'; END IF;
 IF TG_OP='INSERT' AND (o.outcome<>'PENDING' OR c.emergency_stopped_at IS NOT NULL OR c.status NOT IN ('APPROVED','QUEUED','RUNNING','CANARY_RUNNING')) THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_EXECUTION_BLOCKED'; END IF;
 IF c.execution_mode='CANARY' AND (NEW.attempt_index<>1 OR NOT EXISTS(SELECT 1 FROM sv_grid_points WHERE id=NEW.point_id AND organization_id=NEW.organization_id AND point_index=4)) THEN RAISE EXCEPTION 'LOCAL_CANARY_ONE_ATTEMPT_ONLY'; END IF;
 IF NEW.status='SUBMITTED' THEN
  IF c.emergency_stopped_at IS NOT NULL OR c.status NOT IN ('QUEUED','RUNNING','CANARY_RUNNING') OR r.status<>'RESERVED' THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_SUBMIT_BLOCKED'; END IF;
  SELECT snapshot INTO locked FROM sv_configuration_locks WHERE id=c.configuration_lock_id AND organization_id=c.organization_id;
  IF NEW.submitted_candidate->'lock' IS DISTINCT FROM locked
   OR NEW.submitted_candidate#>>'{keyword,text}' IS DISTINCT FROM locked#>>'{keywordSet,keywords,0,text}'
   OR NEW.submitted_candidate#>>'{providerRequest,params,language}' IS DISTINCT FROM locked#>>'{keywordSet,keywords,0,language}'
   THEN RAISE EXCEPTION 'LOCAL_FROZEN_KEYWORD_MISMATCH'; END IF;
 END IF;
 IF NEW.status='CANCELLED_NO_CALL' AND r.status<>'RELEASED' THEN RAISE EXCEPTION 'LOCAL_CANCEL_RESERVATION_NOT_RELEASED'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_pilot_canary_review_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_pilot_canary_review_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: sv_local_pilot_cycle_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_pilot_cycle_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE locked jsonb; review sv_local_canary_reviews%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (OLD.organization_id,OLD.measurement_cycle_id,OLD.configuration_lock_id,OLD.location_id,OLD.grid_definition_id,OLD.execution_mode,OLD.approved_canary_review_id,OLD.provider_contract_digest)
   IS DISTINCT FROM (NEW.organization_id,NEW.measurement_cycle_id,NEW.configuration_lock_id,NEW.location_id,NEW.grid_definition_id,NEW.execution_mode,NEW.approved_canary_review_id,NEW.provider_contract_digest)
   THEN RAISE EXCEPTION 'LOCAL_PILOT_IDENTITY_IMMUTABLE'; END IF;
  IF OLD.execution_mode='LEGACY_SOURCE_ONLY' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'LOCAL_LEGACY_EXECUTION_FORBIDDEN'; END IF;
 END IF;
 IF NEW.execution_mode='LEGACY_SOURCE_ONLY' THEN RAISE EXCEPTION 'LOCAL_LEGACY_EXECUTION_FORBIDDEN'; END IF;
 SELECT snapshot INTO locked FROM sv_configuration_locks WHERE id=NEW.configuration_lock_id AND organization_id=NEW.organization_id;
 IF locked IS NULL OR locked->>'domainId' IS DISTINCT FROM 'LOCAL_MAPS'
  OR locked->>'locationId' IS DISTINCT FROM NEW.location_id::text
  OR locked#>>'{grid,locationId}' IS DISTINCT FROM NEW.location_id::text
  OR locked#>>'{provider,id}' IS DISTINCT FROM NEW.provider
  OR locked#>>'{request,device}' IS DISTINCT FROM 'MOBILE' OR locked#>>'{request,os}' IS DISTINCT FROM 'android'
  OR locked#>>'{request,depth}' IS DISTINCT FROM '20' OR locked#>>'{request,zoom}' IS DISTINCT FROM '13'
  OR locked#>>'{request,searchThisArea}' IS DISTINCT FROM 'true'
  OR locked#>>'{grid,size}' IS DISTINCT FROM '3' OR locked#>>'{grid,radiusMeters}' IS DISTINCT FROM '3000'
  OR jsonb_array_length(locked#>'{keywordSet,keywords}') IS DISTINCT FROM 1
  OR jsonb_array_length(locked#>'{keywordSet,keywordIds}') IS DISTINCT FROM 1
  OR locked#>>'{keywordSet,keywords,0,id}' IS DISTINCT FROM locked#>>'{keywordSet,keywordIds,0}'
  OR locked#>>'{keywordSet,keywords,0,language}' IS DISTINCT FROM locked#>>'{request,language}'
  OR coalesce(length(btrim(locked#>>'{keywordSet,keywords,0,text}')),0)=0
  OR NEW.expected_observations<>9 OR NEW.repeats<>1 OR NEW.capture_depth<>20
  THEN RAISE EXCEPTION 'LOCAL_PILOT_LOCK_INVALID'; END IF;
 IF TG_OP='INSERT' AND NEW.status<>'CREATED' THEN RAISE EXCEPTION 'LOCAL_PILOT_INITIAL_STATUS_INVALID'; END IF;
 IF NEW.execution_mode='CANARY' AND NEW.approved_canary_review_id IS NOT NULL THEN RAISE EXCEPTION 'LOCAL_CANARY_REVIEW_LINK_INVALID'; END IF;
 IF NEW.execution_mode='PILOT' THEN
  SELECT * INTO review FROM sv_local_canary_reviews WHERE id=NEW.approved_canary_review_id AND organization_id=NEW.organization_id;
  IF NOT FOUND OR review.status<>'ACCEPTED' OR review.provider_contract_digest<>NEW.provider_contract_digest
   THEN RAISE EXCEPTION 'LOCAL_ACCEPTED_CANARY_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_pilot_delivery_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_pilot_delivery_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LOCAL_DELIVERY_IMMUTABLE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM sv_local_report_versions WHERE id=NEW.report_version_id AND organization_id=NEW.organization_id AND status='PUBLISHED')
  THEN RAISE EXCEPTION 'LOCAL_DELIVERY_PUBLISHED_REPORT_REQUIRED'; END IF;
 IF TG_OP='INSERT' AND NEW.status<>'SENT' THEN RAISE EXCEPTION 'LOCAL_DELIVERY_INITIAL_STATE_INVALID'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.status<>'SENT' OR NEW.status NOT IN ('ACKNOWLEDGED','FAILED')
   OR (to_jsonb(OLD)-ARRAY['status','acknowledged_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','acknowledged_at'])
   THEN RAISE EXCEPTION 'LOCAL_DELIVERY_TRANSITION_BLOCKED'; END IF;
  IF NEW.status='ACKNOWLEDGED' AND NEW.recipient_identity IS DISTINCT FROM nullif(current_setting('app.user_id',true),'')
   THEN RAISE EXCEPTION 'LOCAL_DELIVERY_RECIPIENT_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_pilot_observation_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_pilot_observation_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: sv_local_pilot_outbox_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_pilot_outbox_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE a sv_measurement_attempts%ROWTYPE; c sv_local_scan_cycles%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LOCAL_OUTBOX_DELETE_BLOCKED'; END IF;
 SELECT * INTO a FROM sv_measurement_attempts WHERE id=NEW.attempt_id AND organization_id=NEW.organization_id;
 SELECT * INTO c FROM sv_local_scan_cycles WHERE id=NEW.local_cycle_id AND organization_id=NEW.organization_id;
 IF a.id IS NULL OR c.id IS NULL OR c.execution_mode='LEGACY_SOURCE_ONLY'
  OR a.local_observation_id IS DISTINCT FROM NEW.observation_id OR a.measurement_cycle_id<>NEW.measurement_cycle_id
  OR c.measurement_cycle_id<>NEW.measurement_cycle_id
  THEN RAISE EXCEPTION 'LOCAL_OUTBOX_ATTEMPT_MISMATCH'; END IF;
 IF TG_OP='INSERT' AND (NEW.status<>'PENDING' OR a.status<>'CLAIMED') THEN RAISE EXCEPTION 'LOCAL_OUTBOX_INITIAL_STATE_INVALID'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (OLD.id,OLD.organization_id,OLD.local_cycle_id,OLD.measurement_cycle_id,OLD.observation_id,OLD.attempt_id,OLD.created_at)
   IS DISTINCT FROM (NEW.id,NEW.organization_id,NEW.local_cycle_id,NEW.measurement_cycle_id,NEW.observation_id,NEW.attempt_id,NEW.created_at)
   THEN RAISE EXCEPTION 'LOCAL_OUTBOX_IDENTITY_IMMUTABLE'; END IF;
  IF NOT ((OLD.status='PENDING' AND NEW.status IN ('CLAIMED','CANCELLED'))
   OR (OLD.status='CLAIMED' AND NEW.status IN ('ENQUEUED','CANCELLED'))
   OR (OLD.status='CLAIMED' AND NEW.status='PENDING' AND OLD.lease_expires_at<=now())
   OR (OLD.status='ENQUEUED' AND NEW.status='CANCELLED' AND a.status='CANCELLED_NO_CALL'))
   THEN RAISE EXCEPTION 'LOCAL_OUTBOX_TRANSITION_BLOCKED'; END IF;
 END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_pilot_report_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_pilot_report_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE c sv_local_scan_cycles%ROWTYPE; latest_decision text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LOCAL_REPORT_IMMUTABLE'; END IF;
 SELECT * INTO c FROM sv_local_scan_cycles WHERE id=NEW.local_cycle_id AND organization_id=NEW.organization_id FOR UPDATE;
 IF NOT FOUND OR c.execution_mode<>'PILOT' THEN RAISE EXCEPTION 'LOCAL_REPORT_PILOT_REQUIRED'; END IF;
 IF TG_OP='INSERT' AND (NEW.status<>'DRAFT' OR c.status NOT IN ('PARTIAL_FAILURE','QC_REQUIRED')) THEN RAISE EXCEPTION 'LOCAL_REPORT_NOT_READY'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(OLD)-ARRAY['status','published_at','revoked_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','published_at','revoked_at'])
   THEN RAISE EXCEPTION 'LOCAL_REPORT_CONTENT_IMMUTABLE'; END IF;
  IF OLD.status='DRAFT' AND NEW.status='PUBLISHED' THEN
   SELECT decision INTO latest_decision FROM sv_local_qc_decisions WHERE organization_id=NEW.organization_id AND report_version_id=NEW.id ORDER BY created_at DESC,id DESC LIMIT 1;
   IF latest_decision IS DISTINCT FROM 'APPROVED' OR c.status<>'QC_REQUIRED'
    THEN RAISE EXCEPTION 'LOCAL_REPORT_QC_REQUIRED'; END IF;
  ELSIF NOT(OLD.status='PUBLISHED' AND NEW.status='REVOKED') THEN RAISE EXCEPTION 'LOCAL_REPORT_TRANSITION_BLOCKED'; END IF;
 END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_qc_actor_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_qc_actor_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF NEW.actor IS DISTINCT FROM current_setting('app.user_id',true) OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_OPERATOR_MEMBERSHIP_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM sv_local_report_versions WHERE id=NEW.report_version_id AND organization_id=NEW.organization_id AND local_cycle_id=NEW.local_cycle_id AND status='DRAFT')
 THEN RAISE EXCEPTION 'LOCAL_QC_DRAFT_REQUIRED'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_local_report_evidence_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_report_evidence_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE item jsonb; n integer;
BEGIN
 IF NEW.content_json IS DISTINCT FROM NEW.content_canonical::jsonb
 OR NEW.content_sha256 IS DISTINCT FROM 'sha256:'||encode(sha256(convert_to(NEW.content_canonical,'UTF8')),'hex')
 THEN RAISE EXCEPTION 'LOCAL_REPORT_HASH_INVALID'; END IF;
 IF NEW.content_json->>'localCycleId' IS DISTINCT FROM NEW.local_cycle_id::text
 OR jsonb_array_length(NEW.content_json->'observations') IS DISTINCT FROM 9
 THEN RAISE EXCEPTION 'LOCAL_REPORT_CARDINALITY_INVALID'; END IF;
 SELECT count(DISTINCT x->>'id') INTO n FROM jsonb_array_elements(NEW.content_json->'observations') x;
 IF n<>9 THEN RAISE EXCEPTION 'LOCAL_REPORT_CARDINALITY_INVALID'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(NEW.content_json->'observations') LOOP
  IF NOT EXISTS(SELECT 1 FROM sv_local_rank_observations o
    JOIN sv_grid_points p ON p.id=o.grid_point_id AND p.organization_id=o.organization_id
    JOIN sv_local_scan_cycles c ON c.id=o.cycle_id AND c.organization_id=o.organization_id
    JOIN sv_configuration_locks l ON l.id=c.configuration_lock_id AND l.organization_id=c.organization_id
    WHERE o.organization_id=NEW.organization_id AND o.cycle_id=NEW.local_cycle_id
    AND p.point_index=(item->>'pointIndex')::int AND p.latitude=(item->>'latitude')::numeric AND p.longitude=(item->>'longitude')::numeric
    AND item->>'keyword'=l.snapshot#>>'{keywordSet,keywords,0,text}' AND item->>'language'=l.snapshot#>>'{keywordSet,keywords,0,language}'
    AND item->>'reason' IS NOT DISTINCT FROM o.invalid_reason::text
    AND o.id::text=item->>'id' AND o.outcome::text=item->>'outcome' AND o.validity::text IS NOT DISTINCT FROM item->>'validity'
    AND o.target_rank IS NOT DISTINCT FROM (item->>'targetRank')::int AND o.captured_at IS NOT DISTINCT FROM (item->>'capturedAt')::timestamptz
    AND o.evidence_id::text IS NOT DISTINCT FROM item->>'evidenceId' AND o.outcome IN ('FOUND','ABSENT_WITHIN_DEPTH','INVALID')
    AND (o.validity<>'VALID' OR EXISTS(SELECT 1 FROM sv_local_evidence_acceptances a WHERE a.organization_id=o.organization_id AND a.observation_id=o.id AND a.evidence_id=o.evidence_id AND a.evidence_sha256=o.evidence_sha256)))
  THEN RAISE EXCEPTION 'LOCAL_REPORT_ACCEPTED_EVIDENCE_REQUIRED'; END IF;
 END LOOP;
 RETURN NEW;
END; $$;


--
-- Name: sv_owner_reconcile_journal_no_spend(uuid, uuid[], text, text, text[], timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_owner_reconcile_journal_no_spend(p_claim_id uuid, p_expected_run_ids uuid[], p_provider text, p_provider_account_scope_sha256 text, p_provider_dataset_resource_ids text[], p_evidence_window_start timestamp with time zone, p_evidence_window_end timestamp with time zone, p_execution_quiesced_at timestamp with time zone, p_billing_final_at timestamp with time zone, p_source_artifact_reference text, p_source_artifact_sha256 text) RETURNS TABLE(reconciliation_id uuid, claim_id uuid, prior_status text, current_status text, reconciled_at timestamp with time zone, certificate_sha256 text)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
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
$_$;


--
-- Name: FUNCTION sv_owner_reconcile_journal_no_spend(p_claim_id uuid, p_expected_run_ids uuid[], p_provider text, p_provider_account_scope_sha256 text, p_provider_dataset_resource_ids text[], p_evidence_window_start timestamp with time zone, p_evidence_window_end timestamp with time zone, p_execution_quiesced_at timestamp with time zone, p_billing_final_at timestamp with time zone, p_source_artifact_reference text, p_source_artifact_sha256 text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sv_owner_reconcile_journal_no_spend(p_claim_id uuid, p_expected_run_ids uuid[], p_provider text, p_provider_account_scope_sha256 text, p_provider_dataset_resource_ids text[], p_evidence_window_start timestamp with time zone, p_evidence_window_end timestamp with time zone, p_execution_quiesced_at timestamp with time zone, p_billing_final_at timestamp with time zone, p_source_artifact_reference text, p_source_artifact_sha256 text) IS 'Version 1 certifies only canonical BRIGHT_DATA Visitor graphs for ChatGPT, Gemini, and Perplexity; mixed and API graphs remain HOLD.';


--
-- Name: sv_prepare_local_observation_retry(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_prepare_local_observation_retry(observation_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
	current_observation "sv_local_rank_observations"%ROWTYPE;
	local_cycle "sv_local_scan_cycles"%ROWTYPE;
BEGIN
	SELECT * INTO current_observation
	FROM "sv_local_rank_observations"
	WHERE "id" = observation_uuid
	FOR UPDATE;
	IF NOT FOUND OR current_observation."validity" = 'VALID' THEN
		RETURN false;
	END IF;

	SELECT * INTO local_cycle
	FROM "sv_local_scan_cycles"
	WHERE "id" = current_observation."cycle_id"
	FOR UPDATE;
	IF local_cycle."emergency_stopped_at" IS NOT NULL OR local_cycle."status" <> 'RUNNING' THEN
		RETURN false;
	END IF;

	UPDATE "sv_local_rank_observations"
	SET "attempt_count" = "attempt_count" + 1,
		"validity" = 'UNMEASURED',
		"invalid_reason" = 'RETRY_PENDING',
		"target_rank" = NULL,
		"raw_reference" = NULL,
		"updated_at" = now()
	WHERE "id" = observation_uuid;
	RETURN true;
END;
$$;


--
-- Name: sv_prevent_api_idempotency_truncate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_prevent_api_idempotency_truncate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'API_IDEMPOTENCY_TRUNCATE_BLOCKED';
END;
$$;


--
-- Name: sv_prevent_configuration_lock_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_prevent_configuration_lock_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'CONFIGURATION_LOCK_APPEND_ONLY';
END;
$$;


--
-- Name: sv_prevent_cost_event_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_prevent_cost_event_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'COST_EVENT_APPEND_ONLY';
END;
$$;


--
-- Name: sv_prevent_journal_daily_claim_truncate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_prevent_journal_daily_claim_truncate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'JOURNAL_DAILY_CLAIM_TRUNCATE_BLOCKED';
END;
$$;


--
-- Name: sv_prevent_journal_provider_boundary_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_prevent_journal_provider_boundary_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
	RAISE EXCEPTION 'JOURNAL_PROVIDER_BOUNDARY_IMMUTABLE';
END;
$$;


--
-- Name: sv_prevent_local_economics_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_prevent_local_economics_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	IF OLD."cost_snapshot" IS DISTINCT FROM NEW."cost_snapshot"
		OR OLD."worst_case_cost_usd" IS DISTINCT FROM NEW."worst_case_cost_usd"
		OR OLD."expected_observations" IS DISTINCT FROM NEW."expected_observations"
		OR OLD."repeats" IS DISTINCT FROM NEW."repeats"
		OR OLD."capture_depth" IS DISTINCT FROM NEW."capture_depth"
		OR OLD."provider" IS DISTINCT FROM NEW."provider" THEN
		RAISE EXCEPTION 'LOCAL_CYCLE_ECONOMICS_IMMUTABLE';
	END IF;
	IF NEW."status" IN ('ANALYZING', 'QC_REQUIRED', 'READY')
		AND NEW."created_observations" <> NEW."expected_observations" THEN
		RAISE EXCEPTION 'LOCAL_CYCLE_INCOMPLETE';
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_prevent_measurement_attempt_result_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_prevent_measurement_attempt_result_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_APPEND_ONLY';
END;
$$;


--
-- Name: sv_prevent_used_grid_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_prevent_used_grid_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "sv_local_scan_cycles"
		WHERE "grid_definition_id" = OLD."id"
	) THEN
		RAISE EXCEPTION 'LOCAL_GRID_IMMUTABLE';
	END IF;
	RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;


--
-- Name: sv_process_local_customer_fixture_query(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_process_local_customer_fixture_query() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE chosen uuid; tenant text; query_no integer; n integer;
BEGIN
 SELECT r.order_id,r.organization_id INTO chosen,tenant FROM sv_local_customer_runs r JOIN sv_orders o ON o.id=r.order_id AND o.organization_id=r.organization_id
 WHERE r.status IN ('QUEUED','RUNNING') AND o.status IN ('QUEUED','RUNNING')
 ORDER BY r.created_at,r.order_id FOR UPDATE OF r,o SKIP LOCKED LIMIT 1;
 IF chosen IS NULL THEN RETURN 0; END IF;
 BEGIN
 SELECT min(query_index) INTO query_no FROM sv_local_customer_tasks WHERE order_id=chosen AND status='PENDING';
 IF query_no IS NULL THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_PENDING_TASKS_MISSING'; END IF;
 UPDATE sv_local_customer_tasks SET status='DONE',result_json=jsonb_build_object(
  'source','FIXTURE_NOT_GOOGLE','keyword',keyword,'pointIndex',point_index,'latitude',latitude,'longitude',longitude,
  'outcome',CASE WHEN point_index%5=4 THEN 'ABSENT_WITHIN_DEPTH' ELSE 'FOUND' END,
  'targetRank',CASE WHEN point_index%5=4 THEN NULL ELSE 1+point_index%5 END,
  'generatedAt',clock_timestamp(),'externalProviderCalls',0,'providerCostUsd','0.000000')
 WHERE order_id=chosen AND query_index=query_no AND status='PENDING';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF NOT EXISTS(SELECT 1 FROM sv_local_customer_tasks WHERE order_id=chosen AND status='PENDING') THEN
  UPDATE sv_local_customer_runs SET status='READY',finished_at=clock_timestamp() WHERE order_id=chosen;
  UPDATE sv_orders SET status='READY',updated_at=clock_timestamp() WHERE id=chosen AND organization_id=tenant;
 ELSE
  UPDATE sv_local_customer_runs SET status='RUNNING' WHERE order_id=chosen;
  UPDATE sv_orders SET status='RUNNING',updated_at=clock_timestamp() WHERE id=chosen AND organization_id=tenant;
 END IF;
 RETURN n;
 EXCEPTION WHEN query_canceled THEN
  UPDATE sv_local_customer_runs SET status='FAILED',failure_count=failure_count+1 WHERE order_id=chosen;
  UPDATE sv_orders SET status='PARTIAL_FAILURE',updated_at=clock_timestamp() WHERE id=chosen AND organization_id=tenant;
  RETURN -1;
 WHEN OTHERS THEN
  UPDATE sv_local_customer_runs SET status='FAILED',failure_count=failure_count+1 WHERE order_id=chosen;
  UPDATE sv_orders SET status='PARTIAL_FAILURE',updated_at=clock_timestamp() WHERE id=chosen AND organization_id=tenant;
  RETURN -1;
 END;
END; $$;


--
-- Name: sv_provider_spend_committed(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_provider_spend_committed(p_scope text) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
	SELECT coalesce(sum(
		CASE "status"
			WHEN 'RESERVED' THEN "estimated_usd"
			WHEN 'SETTLED' THEN "actual_usd"
			ELSE 0
		END
	), 0)
	FROM "sv_provider_spend_reservations"
	WHERE "scope" = p_scope;
$$;


--
-- Name: sv_publish_local_order(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_publish_local_order(target_order uuid, allow_partial boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE tenant text:=current_setting('app.organization_id',true); actor text:=current_setting('app.user_id',true);
 spec jsonb; run_status text; expected integer; project uuid; restaurant text; tasks jsonb; bundle jsonb; analysis jsonb;
 canonical text; bundle_hash text; prior sv_local_order_publications; result uuid; next_version integer;
BEGIN
 PERFORM 1 FROM member WHERE organization_id=tenant AND user_id=actor AND role IN ('owner','admin') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_MEMBER_REQUIRED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('publication:'||tenant||':'||target_order,0));
 SELECT l.snapshot,r.status,r.expected_slots,o.project_id,b.display_name INTO spec,run_status,expected,project,restaurant
 FROM sv_orders o JOIN sv_configuration_locks l ON l.id=o.lock_id AND l.organization_id=o.organization_id AND l.project_id=o.project_id
 JOIN sv_projects p ON p.id=o.project_id AND p.organization_id=o.organization_id
 JOIN sv_local_customer_runs r ON r.order_id=o.id AND r.organization_id=o.organization_id
 JOIN sv_business_locations b ON b.id::text=l.snapshot->>'locationId' AND b.organization_id=o.organization_id
 JOIN sv_entities e ON e.id=b.entity_id AND e.organization_id=b.organization_id AND e.project_id=o.project_id
 WHERE o.id=target_order AND o.organization_id=tenant AND r.snapshot_canonical::jsonb=l.snapshot
 AND ((r.status='READY' AND o.status IN ('READY','DELIVERED')) OR (r.status='FAILED' AND o.status='PARTIAL_FAILURE'))
 AND EXISTS(SELECT 1 FROM sv_payments pay WHERE pay.order_id=o.id AND pay.organization_id=tenant AND pay.status='SUCCEEDED' AND pay.provider='test' AND pay.amount=49 AND pay.currency='USD')
 FOR SHARE OF r,o,l,b,e,p;
 IF spec IS NULL THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_ORDER_NOT_FOUND'; END IF;
 IF spec->>'domainId' IS DISTINCT FROM 'LOCAL_MAPS_ORDER' OR spec#>>'{providerPolicy,mode}' IS DISTINCT FROM 'FIXTURE' OR spec->>'paymentMode' IS DISTINCT FROM 'TEST'
 THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_SOURCE_UNSUPPORTED'; END IF;
 IF run_status<>'READY' AND NOT(allow_partial IS TRUE AND run_status='FAILED') THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_PARTIAL_APPROVAL_REQUIRED'; END IF;
 SELECT jsonb_agg(jsonb_build_object('queryIndex',query_index,'pointIndex',point_index,'keyword',keyword,'latitude',latitude,'longitude',longitude,'status',status,'result',result_json) ORDER BY query_index,point_index) INTO tasks
 FROM sv_local_customer_tasks WHERE order_id=target_order AND organization_id=tenant;
 IF tasks IS NULL OR jsonb_array_length(tasks)<>expected OR expected<>jsonb_array_length(spec->'queries')*jsonb_array_length(spec#>'{grid,points}') THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_SLOT_MISMATCH'; END IF;
 IF run_status='READY' AND EXISTS(SELECT 1 FROM sv_local_customer_tasks WHERE order_id=target_order AND status<>'DONE') THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_SLOT_MISMATCH'; END IF;
 bundle:=jsonb_build_object('snapshot',spec,'restaurantName',restaurant,'tasks',tasks,'runStatus',run_status,'partialAcknowledged',run_status<>'READY');
 bundle_hash:='sha256:'||encode(sha256(convert_to(bundle::text,'UTF8')),'hex');
 SELECT * INTO prior FROM sv_local_order_publications WHERE order_id=target_order AND organization_id=tenant AND bundle_sha256=bundle_hash ORDER BY version DESC LIMIT 1;
 IF FOUND THEN
  IF prior.status='REVOKED' THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_REVOKED'; END IF;
  RETURN prior.id;
 END IF;
 analysis:=jsonb_build_object('status','PENDING','actions','[]'::jsonb);
 canonical:=jsonb_build_object('bundle',bundle,'analysis',analysis)::text;
 SELECT coalesce(max(version),0)+1 INTO next_version FROM sv_local_order_publications WHERE order_id=target_order AND organization_id=tenant;
 INSERT INTO sv_local_order_publications(organization_id,project_id,order_id,version,bundle_json,bundle_sha256,analysis_json,content_canonical,content_sha256,actor_id)
 VALUES(tenant,project,target_order,next_version,bundle,bundle_hash,analysis,canonical,'sha256:'||encode(sha256(convert_to(canonical,'UTF8')),'hex'),actor) RETURNING id INTO result;
 RETURN result;
END; $$;


--
-- Name: sv_reconcile_journal_executor_settled(uuid, text, text, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reconcile_journal_executor_settled(p_claim_id uuid, p_actor_id text, p_owner_decision_ref text, p_runtime_quiesced boolean, p_ambiguous_spend_acknowledged boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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
$_$;


--
-- Name: sv_reconcile_journal_hold(uuid, text, text, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reconcile_journal_hold(p_claim_id uuid, p_actor_id text, p_owner_decision_ref text, p_runtime_quiesced boolean, p_ambiguous_spend_acknowledged boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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
$_$;


--
-- Name: sv_recover_journal_daily_claim(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_recover_journal_daily_claim(p_claim_id uuid, p_actor_id text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
	claim_identity record;
	claim_record "public"."sv_journal_daily_claims"%ROWTYPE;
	recovery_state text;
	recovery_time timestamptz;
BEGIN
	IF p_actor_id IS NULL OR p_actor_id <> btrim(p_actor_id) OR length(p_actor_id) = 0 THEN
		RAISE EXCEPTION 'JOURNAL_RECOVERY_ACTOR_INVALID';
	END IF;
	SELECT "organization_id", "project_id"
	INTO claim_identity
	FROM "public"."sv_journal_daily_claims"
	WHERE "id" = p_claim_id
		AND "organization_id" = current_setting('app.organization_id', true);
	IF NOT FOUND THEN
		RAISE EXCEPTION 'JOURNAL_RECOVERY_CLAIM_NOT_FOUND';
	END IF;
	IF NOT pg_try_advisory_xact_lock(
		hashtextextended(
			'selena-journal:' || claim_identity."organization_id" || ':' || claim_identity."project_id"::text,
			0
		)
	) THEN
		RETURN 'BUSY';
	END IF;
	SELECT * INTO claim_record
	FROM "public"."sv_journal_daily_claims"
	WHERE "id" = p_claim_id
		AND "organization_id" = claim_identity."organization_id"
	FOR UPDATE;
	IF claim_record."status" IN ('NO_SPEND', 'HOLD', 'ABANDONED') THEN
		RETURN 'HOLD';
	END IF;
	IF claim_record."status" = 'COMPLETED' THEN
		RETURN 'COMPLETED';
	END IF;

	recovery_state := "public"."sv_journal_claim_recovery_state"(claim_record."id");
	recovery_time := clock_timestamp();
	IF recovery_state = 'TERMINAL_COMPLETED' THEN
		UPDATE "public"."sv_journal_daily_claims"
		SET "status" = 'COMPLETED', "completed_at" = recovery_time, "updated_at" = recovery_time
		WHERE "id" = claim_record."id"
			AND "organization_id" = claim_record."organization_id"
			AND "status" = claim_record."status";
		INSERT INTO "public"."sv_audit_events" (
			"organization_id", "actor_id", "event", "subject_kind", "subject_id", "details"
		) VALUES (
			claim_record."organization_id", p_actor_id, 'JOURNAL_DAILY_CLAIM_COMPLETED',
			'journal_daily_claim', claim_record."id"::text,
			jsonb_build_object(
				'fromStatus', claim_record."status", 'toStatus', 'COMPLETED',
				'recovery', 'TERMINAL_CYCLE', 'providerCalls', 0, 'recurring', false
			)
		);
		RETURN 'COMPLETED';
	END IF;
	IF claim_record."status" = 'EXECUTING' THEN
		RETURN 'HOLD';
	END IF;
	IF claim_record."status" = 'CLAIMED'
		AND recovery_state = 'NO_SPEND'
		AND claim_record."updated_at" <= recovery_time - interval '45 minutes'
	THEN
		UPDATE "public"."sv_journal_daily_claims"
		SET "status" = 'ABANDONED', "abandoned_at" = recovery_time, "updated_at" = recovery_time
		WHERE "id" = claim_record."id"
			AND "organization_id" = claim_record."organization_id"
			AND "status" = 'CLAIMED';
		INSERT INTO "public"."sv_audit_events" (
			"organization_id", "actor_id", "event", "subject_kind", "subject_id", "details"
		) VALUES (
			claim_record."organization_id", p_actor_id, 'JOURNAL_DAILY_CLAIM_ABANDONED',
			'journal_daily_claim', claim_record."id"::text,
			jsonb_build_object(
				'fromStatus', 'CLAIMED', 'toStatus', 'ABANDONED', 'recovery', 'EXACT_NO_SPEND',
				'providerCalls', 0, 'runCount', 0, 'boundaryCount', 0,
				'costEventCount', 0, 'consumedPermitCount', 0, 'recurring', false
			)
		);
		RETURN 'ABANDONED';
	END IF;
	RETURN 'HOLD';
END;
$$;


--
-- Name: sv_redeem_pilot_invite(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_redeem_pilot_invite(p_code_hash text, p_plan_id text, p_organization_id text, p_user_id text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
	bound_plan text;
BEGIN
	IF p_code_hash IS NULL OR p_code_hash !~ '^[0-9a-f]{64}$' THEN
		RETURN NULL;
	END IF;
	IF length(btrim(coalesce(p_organization_id, ''))) = 0 OR length(btrim(coalesce(p_user_id, ''))) = 0 THEN
		RAISE EXCEPTION 'PILOT_INVITE_REDEEMER_REQUIRED';
	END IF;

	UPDATE "sv_pilot_invites"
		SET "redeemed_at" = now(),
			"redeemed_by_organization_id" = p_organization_id,
			"redeemed_by_user_id" = p_user_id
		WHERE "code_hash" = p_code_hash
			AND "plan_id" = p_plan_id
			AND "redeemed_at" IS NULL
			AND "expires_at" > now()
		RETURNING "plan_id" INTO bound_plan;

	IF bound_plan IS NOT NULL THEN
		RETURN bound_plan;
	END IF;

	-- A retried submission from the organization that already holds this seat
	-- returns the same plan instead of losing the entitlement to a double
	-- click. Any other organization, an expired seat, a seat sold for a
	-- different plan and an unknown code are all indistinguishable from here,
	-- which is what the caller should report. A plan the seat was not sold for
	-- leaves the seat unclaimed, so a mistyped plan costs the guest nothing.
	SELECT "plan_id" INTO bound_plan
		FROM "sv_pilot_invites"
		WHERE "code_hash" = p_code_hash
			AND "plan_id" = p_plan_id
			AND "redeemed_at" IS NOT NULL
			AND "redeemed_by_organization_id" = p_organization_id;

	RETURN bound_plan;
END;
$_$;


--
-- Name: sv_reject_accepted_evidence_dependency_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_accepted_evidence_dependency_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_reject_evidence_acceptance_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_evidence_acceptance_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'EVIDENCE_ACCEPTANCE_IMMUTABLE';
END;
$$;


--
-- Name: sv_reject_evidence_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_evidence_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'SELENA_EVIDENCE_IMMUTABLE: insert a new snapshot or evidence row instead';
END;
$$;


--
-- Name: sv_reject_formal_evidence_audit_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_formal_evidence_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_reject_formal_evidence_audit_truncate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_formal_evidence_audit_truncate() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
	RAISE EXCEPTION 'FORMAL_EVIDENCE_AUDIT_IMMUTABLE';
END;
$$;


--
-- Name: sv_reject_journal_no_spend_cost_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_journal_no_spend_cost_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: sv_reject_journal_no_spend_dependency_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_journal_no_spend_dependency_mutation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: sv_reject_journal_no_spend_execution_truncate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_journal_no_spend_execution_truncate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	IF EXISTS (SELECT 1 FROM "public"."sv_journal_no_spend_reconciliations") THEN
		RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILED_DEPENDENCY_IMMUTABLE';
	END IF;
	RETURN NULL;
END;
$$;


--
-- Name: sv_reject_journal_no_spend_outcome_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_journal_no_spend_outcome_mutation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: sv_reject_journal_no_spend_provider_snapshot_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_journal_no_spend_provider_snapshot_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: sv_reject_journal_no_spend_reconciliation_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_journal_no_spend_reconciliation_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
	RAISE EXCEPTION 'JOURNAL_NO_SPEND_RECONCILIATION_IMMUTABLE';
END;
$$;


--
-- Name: sv_reject_provider_canary_execution_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_provider_canary_execution_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'PROVIDER_CANARY_EXECUTION_IMMUTABLE';
END;
$$;


--
-- Name: sv_reject_provider_dataset_capability_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_provider_dataset_capability_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'PROVIDER_DATASET_CAPABILITY_IMMUTABLE: insert a new version instead';
END;
$$;


--
-- Name: sv_reject_provider_dataset_snapshot_event_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reject_provider_dataset_snapshot_event_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_EVENT_IMMUTABLE';
END;
$$;


--
-- Name: sv_release_free_auto_dispatch(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_release_free_auto_dispatch(p_request_id uuid, p_organization_id text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
	IF p_request_id IS NULL OR length(btrim(coalesce(p_organization_id, ''))) = 0 THEN
		RAISE EXCEPTION 'FREE_AUTO_DISPATCH_CLAIMANT_REQUIRED';
	END IF;
	DELETE FROM "sv_free_auto_dispatch_claims"
		WHERE "request_id" = p_request_id
			AND "organization_id" = p_organization_id;
	RETURN FOUND;
END;
$$;


--
-- Name: sv_release_provider_spend(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_release_provider_spend(p_scope text, p_organization_id text, p_request_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
	updated "sv_provider_spend_reservations"%ROWTYPE;
	current_status text;
BEGIN
 IF p_scope = 'local-maps' AND p_organization_id IS DISTINCT FROM nullif(current_setting('app.organization_id',true),'') THEN RAISE EXCEPTION 'LOCAL_SPEND_TENANT_MISMATCH'; END IF;
	UPDATE "sv_provider_spend_reservations"
		SET "status" = 'RELEASED', "settled_at" = now()
		WHERE "scope" = p_scope
			AND "organization_id" = p_organization_id
			AND "request_key" = p_request_key
			AND "status" = 'RESERVED'
		RETURNING * INTO updated;

	IF FOUND THEN
		RETURN jsonb_build_object('decision', 'RELEASED', 'reservationId', updated."id",
			'committedUsd', "sv_provider_spend_committed"(p_scope));
	END IF;

	SELECT "status" INTO current_status
		FROM "sv_provider_spend_reservations"
		WHERE "scope" = p_scope AND "organization_id" = p_organization_id AND "request_key" = p_request_key;

	RETURN jsonb_build_object('decision', coalesce('ALREADY_' || current_status, 'UNKNOWN_RESERVATION'),
		'committedUsd', "sv_provider_spend_committed"(p_scope));
END;
$$;


--
-- Name: sv_require_formal_evidence_audit_pair(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_require_formal_evidence_audit_pair() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_require_formal_evidence_receipt_pair(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_require_formal_evidence_receipt_pair() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_require_journal_no_spend_claim_pair(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_require_journal_no_spend_claim_pair() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: sv_require_journal_provider_boundary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_require_journal_provider_boundary() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "public"."sv_cycles" AS cycle
		INNER JOIN "public"."sv_journal_daily_claims" AS claim
			ON claim."configuration_lock_id" = cycle."lock_id"
			AND claim."organization_id" = cycle."organization_id"
		WHERE cycle."id" = NEW."cycle_id"
			AND cycle."organization_id" = NEW."organization_id"
	) AND NOT EXISTS (
		SELECT 1
		FROM "public"."sv_journal_provider_boundaries" AS boundary
		WHERE boundary."run_id" = NEW."id"
			AND boundary."permit_id" = NEW."permit_id"
			AND boundary."cycle_id" = NEW."cycle_id"
			AND boundary."organization_id" = NEW."organization_id"
	) THEN
		RAISE EXCEPTION 'JOURNAL_PROVIDER_BOUNDARY_REQUIRED';
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_require_owner_evidence_acceptance_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_require_owner_evidence_acceptance_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_reserve_provider_spend(text, text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_reserve_provider_spend(p_scope text, p_organization_id text, p_request_key text, p_estimated_usd numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
	existing "sv_provider_spend_reservations"%ROWTYPE;
	cap numeric;
	committed numeric;
	created "sv_provider_spend_reservations"%ROWTYPE;
BEGIN
 IF p_scope = 'local-maps' AND p_organization_id IS DISTINCT FROM nullif(current_setting('app.organization_id',true),'') THEN RAISE EXCEPTION 'LOCAL_SPEND_TENANT_MISMATCH'; END IF;
	IF length(btrim(coalesce(p_scope, ''))) = 0
		OR length(btrim(coalesce(p_organization_id, ''))) = 0
		OR length(btrim(coalesce(p_request_key, ''))) = 0
	THEN
		RAISE EXCEPTION 'PROVIDER_SPEND_RESERVATION_SCOPE_REQUIRED';
	END IF;
	IF p_estimated_usd IS NULL OR p_estimated_usd < 0 THEN
		RAISE EXCEPTION 'PROVIDER_SPEND_ESTIMATE_REQUIRED';
	END IF;

	-- One writer per scope for the read-then-insert below. Transaction-scoped,
	-- so it is released with the commit that creates the row.
	PERFORM pg_advisory_xact_lock(hashtextextended('selena-provider-spend:' || p_scope, 0));

	SELECT * INTO existing
		FROM "sv_provider_spend_reservations"
		WHERE "scope" = p_scope
			AND "organization_id" = p_organization_id
			AND "request_key" = p_request_key;

	-- A retry of the same request rides on the reservation it already made
	-- instead of taking a second bite out of the budget.
	IF FOUND THEN
		RETURN jsonb_build_object(
			'decision', CASE WHEN existing."status" = 'RELEASED' THEN 'RELEASED' ELSE 'ALREADY_RESERVED' END,
			'reservationId', existing."id",
			'status', existing."status",
			'capUsd', (SELECT "cap_usd" FROM "sv_provider_spend_budgets" WHERE "scope" = p_scope),
			'committedUsd', "sv_provider_spend_committed"(p_scope)
		);
	END IF;

	SELECT "cap_usd" INTO cap FROM "sv_provider_spend_budgets" WHERE "scope" = p_scope;
	-- No budget row is not "no ceiling": it is a scope nobody has funded.
	IF NOT FOUND THEN
		RETURN jsonb_build_object('decision', 'REFUSED_NO_BUDGET', 'capUsd', NULL,
			'committedUsd', "sv_provider_spend_committed"(p_scope));
	END IF;

	committed := "sv_provider_spend_committed"(p_scope);
	IF committed + p_estimated_usd > cap THEN
		RETURN jsonb_build_object('decision', 'REFUSED_OVER_CAP', 'capUsd', cap,
			'committedUsd', committed, 'estimatedUsd', p_estimated_usd);
	END IF;

	INSERT INTO "sv_provider_spend_reservations"
		("scope", "organization_id", "request_key", "estimated_usd", "status")
		VALUES (p_scope, p_organization_id, p_request_key, p_estimated_usd, 'RESERVED')
		RETURNING * INTO created;

	RETURN jsonb_build_object('decision', 'RESERVED', 'reservationId', created."id", 'status', 'RESERVED',
		'capUsd', cap, 'committedUsd', committed + p_estimated_usd);
END;
$$;


--
-- Name: sv_resolve_api_key_context(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_resolve_api_key_context(api_key_hash text) RETURNS TABLE(api_key_id uuid, organization_id text, permissions text[])
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $_$
	SELECT "key"."id", "key"."organization_id", "key"."permissions"
	FROM "public"."sv_api_keys" AS "key"
	WHERE "key"."key_hash" = $1
		AND "key"."revoked_at" IS NULL
		AND ("key"."expires_at" IS NULL OR "key"."expires_at" > pg_catalog.now())
	LIMIT 1
$_$;


--
-- Name: sv_resolve_report_context(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_resolve_report_context(report_id uuid) RETURNS TABLE(organization_id text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $_$
	SELECT "report"."organization_id"
	FROM "public"."reports" AS "report"
	WHERE "report"."id" = $1
		AND "report"."organization_id" IS NOT NULL
	LIMIT 1
$_$;


--
-- Name: sv_restrict_runtime_source_snapshot_promotion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_restrict_runtime_source_snapshot_promotion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: sv_resume_local_customer_fixture_run(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_resume_local_customer_fixture_run(target_order uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE tenant text := current_setting('app.organization_id',true); n integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM member WHERE organization_id=tenant AND user_id=current_setting('app.user_id',true) AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_ORDER_MEMBER_REQUIRED'; END IF;
 UPDATE sv_local_customer_runs SET status='QUEUED' WHERE order_id=target_order AND organization_id=tenant AND status='FAILED' AND failure_count<3;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_RETRY_LIMIT_OR_STATE_CONFLICT'; END IF;
 UPDATE sv_orders SET status='QUEUED',updated_at=clock_timestamp() WHERE id=target_order AND organization_id=tenant AND status='PARTIAL_FAILURE';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 OR NOT EXISTS(SELECT 1 FROM sv_payments WHERE order_id=target_order AND organization_id=tenant AND provider='test' AND status='SUCCEEDED' AND amount=49 AND currency='USD')
 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_RETRY_PAYMENT_CONFLICT'; END IF;
END; $$;


--
-- Name: sv_review_local_order_publication(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_review_local_order_publication(base_id uuid, expected_hash text, reviewed_actions jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE tenant text:=current_setting('app.organization_id',true); actor text:=current_setting('app.user_id',true); base sv_local_order_publications; result uuid; analysis jsonb; canonical text; next_version integer; digest text;
BEGIN
 PERFORM 1 FROM member WHERE organization_id=tenant AND user_id=actor AND role IN ('owner','admin') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_MEMBER_REQUIRED'; END IF;
 SELECT * INTO base FROM sv_local_order_publications WHERE id=base_id AND organization_id=tenant;
 IF NOT FOUND OR base.status<>'PUBLISHED' THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_NOT_FOUND'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('publication:'||tenant||':'||base.order_id,0));
 SELECT * INTO base FROM sv_local_order_publications WHERE id=base_id AND organization_id=tenant FOR SHARE;
 IF base.status<>'PUBLISHED' THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_NOT_FOUND'; END IF;
 PERFORM 1 FROM sv_orders WHERE id=base.order_id AND organization_id=tenant AND status IN ('READY','DELIVERED','PARTIAL_FAILURE') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_ORDER_NOT_FOUND'; END IF;
 IF base.content_sha256 IS DISTINCT FROM expected_hash OR jsonb_typeof(reviewed_actions) IS DISTINCT FROM 'array' OR jsonb_array_length(reviewed_actions)>50 THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_REVIEW_MISMATCH'; END IF;
 analysis:=jsonb_build_object('status','REVIEWED','actions',reviewed_actions);
 canonical:=jsonb_build_object('bundle',base.bundle_json,'analysis',analysis)::text; digest:='sha256:'||encode(sha256(convert_to(canonical,'UTF8')),'hex');
 SELECT id INTO result FROM sv_local_order_publications WHERE order_id=base.order_id AND organization_id=tenant AND content_sha256=digest AND status='PUBLISHED';
 IF FOUND THEN RETURN result; END IF;
 SELECT coalesce(max(version),0)+1 INTO next_version FROM sv_local_order_publications WHERE order_id=base.order_id AND organization_id=tenant;
 IF next_version<>base.version+1 THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_STALE_REVIEW'; END IF;
 INSERT INTO sv_local_order_publications(organization_id,project_id,order_id,version,bundle_json,bundle_sha256,analysis_json,content_canonical,content_sha256,actor_id,parent_id)
 VALUES(tenant,base.project_id,base.order_id,next_version,base.bundle_json,base.bundle_sha256,analysis,canonical,digest,actor,base.id) RETURNING id INTO result;
 RETURN result;
END; $$;


--
-- Name: sv_revoke_local_order_publication(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_revoke_local_order_publication(target_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE tenant text:=current_setting('app.organization_id',true); actor text:=current_setting('app.user_id',true); target_order uuid;
BEGIN
 PERFORM 1 FROM member WHERE organization_id=tenant AND user_id=actor AND role IN ('owner','admin') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_MEMBER_REQUIRED'; END IF;
 SELECT order_id INTO target_order FROM sv_local_order_publications WHERE id=target_id AND organization_id=tenant;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_NOT_FOUND'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('publication:'||tenant||':'||target_order,0));
 UPDATE sv_local_order_publications SET status='REVOKED',revoked_at=now(),revoked_by=actor WHERE id=target_id AND organization_id=tenant AND status='PUBLISHED';
 IF NOT FOUND AND NOT EXISTS(SELECT 1 FROM sv_local_order_publications WHERE id=target_id AND organization_id=tenant AND status='REVOKED') THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_NOT_FOUND'; END IF;
END; $$;


--
-- Name: sv_settle_provider_spend(text, text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_settle_provider_spend(p_scope text, p_organization_id text, p_request_key text, p_actual_usd numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
	updated "sv_provider_spend_reservations"%ROWTYPE;
	current_status text;
BEGIN
 IF p_scope = 'local-maps' AND p_organization_id IS DISTINCT FROM nullif(current_setting('app.organization_id',true),'') THEN RAISE EXCEPTION 'LOCAL_SPEND_TENANT_MISMATCH'; END IF;
	IF p_actual_usd IS NULL OR p_actual_usd < 0 THEN
		RAISE EXCEPTION 'PROVIDER_SPEND_ACTUAL_REQUIRED';
	END IF;

	UPDATE "sv_provider_spend_reservations"
		SET "status" = 'SETTLED', "actual_usd" = p_actual_usd, "settled_at" = now()
		WHERE "scope" = p_scope
			AND "organization_id" = p_organization_id
			AND "request_key" = p_request_key
			AND "status" = 'RESERVED'
		RETURNING * INTO updated;

	IF FOUND THEN
		RETURN jsonb_build_object('decision', 'SETTLED', 'reservationId', updated."id",
			'actualUsd', updated."actual_usd", 'committedUsd', "sv_provider_spend_committed"(p_scope));
	END IF;

	SELECT "status" INTO current_status
		FROM "sv_provider_spend_reservations"
		WHERE "scope" = p_scope AND "organization_id" = p_organization_id AND "request_key" = p_request_key;

	RETURN jsonb_build_object('decision', coalesce('ALREADY_' || current_status, 'UNKNOWN_RESERVATION'),
		'committedUsd', "sv_provider_spend_committed"(p_scope));
END;
$$;


--
-- Name: sv_validate_local_cycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_validate_local_cycle() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE locked jsonb; n integer;
BEGIN
 SELECT snapshot INTO locked FROM sv_configuration_locks WHERE id=NEW.configuration_lock_id AND organization_id=NEW.organization_id;
 IF locked IS NULL OR locked<>NEW.cost_snapshot OR (locked#>>'{budget,worstCaseCostUsd}')::numeric IS DISTINCT FROM NEW.worst_case_cost_usd
  THEN RAISE EXCEPTION 'LOCAL_CYCLE_COST_NOT_FROZEN'; END IF;
 SELECT count(*) INTO n FROM sv_grid_points p JOIN sv_grid_definitions g ON g.id=p.grid_id AND g.organization_id=p.organization_id
 WHERE g.id=NEW.grid_definition_id AND g.organization_id=NEW.organization_id AND g.location_id=NEW.location_id;
 IF n<>9 OR NEW.expected_observations<>9 THEN RAISE EXCEPTION 'LOCAL_CYCLE_CARDINALITY_MISMATCH'; END IF;
 RETURN NEW;
END; $$;


--
-- Name: sv_validate_outcome_source_scope(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_validate_outcome_source_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM "sv_business_locations" location
		JOIN "sv_entities" entity ON entity."id" = location."entity_id"
		WHERE location."id" = NEW."location_id"
			AND location."organization_id" = NEW."organization_id"
			AND entity."organization_id" = NEW."organization_id"
			AND entity."project_id" = NEW."project_id"
	) THEN
		RAISE EXCEPTION 'OUTCOME_LOCATION_SCOPE_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$;


--
-- Name: sv_validate_outcome_window_scope(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_validate_outcome_window_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
	baseline_start timestamptz;
	baseline_end timestamptz;
	baseline_source_id uuid;
	verification_start timestamptz;
	verification_end timestamptz;
	verification_source_id uuid;
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM "sv_approved_actions"
		WHERE "id" = NEW."action_id"
			AND "organization_id" = NEW."organization_id"
			AND "project_id" = NEW."project_id"
	) THEN
		RAISE EXCEPTION 'OUTCOME_ACTION_SCOPE_MISMATCH';
	END IF;

	SELECT "period_start", "period_end", "source_id" INTO baseline_start, baseline_end, baseline_source_id
	FROM "sv_outcome_observations" WHERE "id" = NEW."baseline_observation_id";
	SELECT "period_start", "period_end", "source_id"
	INTO verification_start, verification_end, verification_source_id
	FROM "sv_outcome_observations" WHERE "id" = NEW."verification_observation_id";
	IF baseline_source_id <> verification_source_id THEN
		RAISE EXCEPTION 'OUTCOME_SOURCE_MISMATCH';
	END IF;
	IF baseline_end > verification_start THEN
		RAISE EXCEPTION 'OUTCOME_PERIODS_OVERLAP';
	END IF;
	IF NEW."window_start" > baseline_start OR NEW."window_end" < verification_end THEN
		RAISE EXCEPTION 'OUTCOME_WINDOW_INCOMPLETE';
	END IF;
	RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: bam; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.bam (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    version integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    queue text,
    table_name text NOT NULL,
    command text NOT NULL,
    error text,
    created_on timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    started_on timestamp with time zone,
    completed_on timestamp with time zone
);


--
-- Name: job; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.job (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    data jsonb,
    state pgboss.job_state DEFAULT 'created'::pgboss.job_state NOT NULL,
    retry_limit integer DEFAULT 2 NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    retry_delay integer DEFAULT 0 NOT NULL,
    retry_backoff boolean DEFAULT false NOT NULL,
    retry_delay_max integer,
    expire_seconds integer DEFAULT 900 NOT NULL,
    deletion_seconds integer DEFAULT 604800 NOT NULL,
    singleton_key text,
    singleton_on timestamp without time zone,
    group_id text,
    group_tier text,
    start_after timestamp with time zone DEFAULT now() NOT NULL,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    started_on timestamp with time zone,
    completed_on timestamp with time zone,
    keep_until timestamp with time zone DEFAULT (now() + '336:00:00'::interval) NOT NULL,
    output jsonb,
    dead_letter text,
    policy text,
    heartbeat_on timestamp with time zone,
    heartbeat_seconds integer,
    blocked boolean DEFAULT false NOT NULL,
    blocking boolean DEFAULT false NOT NULL,
    pending_dependencies integer DEFAULT 0 NOT NULL,
    source_name text,
    source_id uuid,
    source_created_on timestamp with time zone,
    source_retry_count integer
)
PARTITION BY LIST (name);


--
-- Name: job_common; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.job_common (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT job_id_not_null NOT NULL,
    name text CONSTRAINT job_name_not_null NOT NULL,
    priority integer DEFAULT 0 CONSTRAINT job_priority_not_null NOT NULL,
    data jsonb,
    state pgboss.job_state DEFAULT 'created'::pgboss.job_state CONSTRAINT job_state_not_null NOT NULL,
    retry_limit integer DEFAULT 2 CONSTRAINT job_retry_limit_not_null NOT NULL,
    retry_count integer DEFAULT 0 CONSTRAINT job_retry_count_not_null NOT NULL,
    retry_delay integer DEFAULT 0 CONSTRAINT job_retry_delay_not_null NOT NULL,
    retry_backoff boolean DEFAULT false CONSTRAINT job_retry_backoff_not_null NOT NULL,
    retry_delay_max integer,
    expire_seconds integer DEFAULT 900 CONSTRAINT job_expire_seconds_not_null NOT NULL,
    deletion_seconds integer DEFAULT 604800 CONSTRAINT job_deletion_seconds_not_null NOT NULL,
    singleton_key text,
    singleton_on timestamp without time zone,
    group_id text,
    group_tier text,
    start_after timestamp with time zone DEFAULT now() CONSTRAINT job_start_after_not_null NOT NULL,
    created_on timestamp with time zone DEFAULT now() CONSTRAINT job_created_on_not_null NOT NULL,
    started_on timestamp with time zone,
    completed_on timestamp with time zone,
    keep_until timestamp with time zone DEFAULT (now() + '336:00:00'::interval) CONSTRAINT job_keep_until_not_null NOT NULL,
    output jsonb,
    dead_letter text,
    policy text,
    heartbeat_on timestamp with time zone,
    heartbeat_seconds integer,
    blocked boolean DEFAULT false CONSTRAINT job_blocked_not_null NOT NULL,
    blocking boolean DEFAULT false CONSTRAINT job_blocking_not_null NOT NULL,
    pending_dependencies integer DEFAULT 0 CONSTRAINT job_pending_dependencies_not_null NOT NULL,
    source_name text,
    source_id uuid,
    source_created_on timestamp with time zone,
    source_retry_count integer,
    CONSTRAINT job_key_strict_fifo_singleton_key_check CHECK ((NOT ((policy = 'key_strict_fifo'::text) AND (singleton_key IS NULL))))
);


--
-- Name: job_dependency; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.job_dependency (
    child_name text NOT NULL,
    child_id uuid NOT NULL,
    parent_name text NOT NULL,
    parent_id uuid NOT NULL
);


--
-- Name: queue; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.queue (
    name text NOT NULL,
    policy text NOT NULL,
    retry_limit integer NOT NULL,
    retry_delay integer NOT NULL,
    retry_backoff boolean NOT NULL,
    retry_delay_max integer,
    expire_seconds integer NOT NULL,
    retention_seconds integer NOT NULL,
    deletion_seconds integer NOT NULL,
    dead_letter text,
    partition boolean NOT NULL,
    table_name text NOT NULL,
    deferred_count integer DEFAULT 0 NOT NULL,
    queued_count integer DEFAULT 0 NOT NULL,
    ready_count integer DEFAULT 0 NOT NULL,
    warning_queued integer DEFAULT 0 NOT NULL,
    active_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    total_count integer DEFAULT 0 NOT NULL,
    ready_history integer[] DEFAULT '{}'::integer[] NOT NULL,
    heartbeat_seconds integer,
    notify boolean DEFAULT false NOT NULL,
    singletons_active text[],
    monitor_on timestamp with time zone,
    maintain_on timestamp with time zone,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    updated_on timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT queue_check CHECK ((dead_letter IS DISTINCT FROM name))
);


--
-- Name: queue_stats; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.queue_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    deferred_count integer DEFAULT 0 NOT NULL,
    queued_count integer DEFAULT 0 NOT NULL,
    ready_count integer DEFAULT 0 NOT NULL,
    active_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    total_count integer DEFAULT 0 NOT NULL,
    captured_on timestamp with time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (captured_on);


--
-- Name: queue_stats_20260815; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.queue_stats_20260815 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT queue_stats_id_not_null NOT NULL,
    name text CONSTRAINT queue_stats_name_not_null NOT NULL,
    deferred_count integer DEFAULT 0 CONSTRAINT queue_stats_deferred_count_not_null NOT NULL,
    queued_count integer DEFAULT 0 CONSTRAINT queue_stats_queued_count_not_null NOT NULL,
    ready_count integer DEFAULT 0 CONSTRAINT queue_stats_ready_count_not_null NOT NULL,
    active_count integer DEFAULT 0 CONSTRAINT queue_stats_active_count_not_null NOT NULL,
    failed_count integer DEFAULT 0 CONSTRAINT queue_stats_failed_count_not_null NOT NULL,
    total_count integer DEFAULT 0 CONSTRAINT queue_stats_total_count_not_null NOT NULL,
    captured_on timestamp with time zone DEFAULT now() CONSTRAINT queue_stats_captured_on_not_null NOT NULL
);


--
-- Name: queue_stats_20260816; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.queue_stats_20260816 (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT queue_stats_id_not_null NOT NULL,
    name text CONSTRAINT queue_stats_name_not_null NOT NULL,
    deferred_count integer DEFAULT 0 CONSTRAINT queue_stats_deferred_count_not_null NOT NULL,
    queued_count integer DEFAULT 0 CONSTRAINT queue_stats_queued_count_not_null NOT NULL,
    ready_count integer DEFAULT 0 CONSTRAINT queue_stats_ready_count_not_null NOT NULL,
    active_count integer DEFAULT 0 CONSTRAINT queue_stats_active_count_not_null NOT NULL,
    failed_count integer DEFAULT 0 CONSTRAINT queue_stats_failed_count_not_null NOT NULL,
    total_count integer DEFAULT 0 CONSTRAINT queue_stats_total_count_not_null NOT NULL,
    captured_on timestamp with time zone DEFAULT now() CONSTRAINT queue_stats_captured_on_not_null NOT NULL
);


--
-- Name: schedule; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.schedule (
    name text NOT NULL,
    key text DEFAULT ''::text NOT NULL,
    cron text NOT NULL,
    timezone text,
    data jsonb,
    options jsonb,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    updated_on timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.subscription (
    event text NOT NULL,
    name text NOT NULL,
    created_on timestamp with time zone DEFAULT now() NOT NULL,
    updated_on timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: version; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.version (
    version integer NOT NULL,
    cron_on timestamp with time zone,
    bam_on timestamp with time zone,
    flow_on timestamp with time zone
);


--
-- Name: warning; Type: TABLE; Schema: pgboss; Owner: -
--

CREATE TABLE pgboss.warning (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    data jsonb,
    created_on timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp without time zone,
    refresh_token_expires_at timestamp without time zone,
    scope text,
    password text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: brand_opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_opportunities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id text NOT NULL,
    report json NOT NULL,
    model text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id text NOT NULL,
    name text NOT NULL,
    website text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    onboarded boolean DEFAULT false NOT NULL,
    delay_override_hours integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    additional_domains text[] DEFAULT '{}'::text[] NOT NULL,
    aliases text[] DEFAULT '{}'::text[] NOT NULL,
    enabled_models text[],
    organization_id text NOT NULL
);


--
-- Name: citations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.citations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_run_id uuid NOT NULL,
    prompt_id uuid NOT NULL,
    brand_id text NOT NULL,
    model text CONSTRAINT "citations_modelGroup_not_null" NOT NULL,
    url text NOT NULL,
    domain text NOT NULL,
    title text,
    created_at timestamp with time zone NOT NULL,
    citation_index smallint NOT NULL
);


--
-- Name: competitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    domains text[] DEFAULT '{}'::text[] NOT NULL,
    aliases text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: invitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitation (
    id text NOT NULL,
    organization_id text NOT NULL,
    email text NOT NULL,
    role text,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    inviter_id text NOT NULL
);


--
-- Name: member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member (
    id text NOT NULL,
    organization_id text NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: organization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    created_at timestamp without time zone NOT NULL,
    metadata text,
    stripe_customer_id text
);


--
-- Name: organization_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_settings (
    organization_id text NOT NULL,
    entitlement_overrides jsonb,
    premium_addon_quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prompt_run_hourly_aggregates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_run_hourly_aggregates (
    prompt_id uuid NOT NULL,
    brand_id text NOT NULL,
    model text NOT NULL,
    provider text,
    web_search_enabled boolean NOT NULL,
    hour_bucket timestamp with time zone NOT NULL,
    total_runs integer NOT NULL,
    brand_mentioned_count integer NOT NULL
);


--
-- Name: prompt_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_id uuid NOT NULL,
    model text CONSTRAINT "prompt_runs_modelGroup_not_null" NOT NULL,
    version text CONSTRAINT prompt_runs_model_not_null NOT NULL,
    web_search_enabled boolean NOT NULL,
    raw_output json NOT NULL,
    web_queries text[] DEFAULT '{}'::text[] NOT NULL,
    brand_mentioned boolean NOT NULL,
    competitors_mentioned text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    brand_id text NOT NULL,
    provider text
);


--
-- Name: prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id text NOT NULL,
    value text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    system_tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    premium_models text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_name text NOT NULL,
    brand_website text NOT NULL,
    status public.report_status DEFAULT 'pending'::public.report_status NOT NULL,
    raw_output json,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    organization_id text
);


--
-- Name: secrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.secrets (
    name text NOT NULL,
    encrypted_value text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL,
    active_organization_id text,
    impersonated_by text
);


--
-- Name: sso_provider; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sso_provider (
    id text NOT NULL,
    issuer text NOT NULL,
    oidc_config text,
    saml_config text,
    user_id text,
    provider_id text NOT NULL,
    organization_id text,
    domain text NOT NULL
);


--
-- Name: subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription (
    id text NOT NULL,
    plan text NOT NULL,
    reference_id text NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text DEFAULT 'incomplete'::text,
    period_start timestamp without time zone,
    period_end timestamp without time zone,
    trial_start timestamp without time zone,
    trial_end timestamp without time zone,
    cancel_at_period_end boolean DEFAULT false,
    cancel_at timestamp without time zone,
    canceled_at timestamp without time zone,
    ended_at timestamp without time zone,
    seats integer,
    billing_interval text,
    stripe_schedule_id text
);


--
-- Name: sv_action_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_action_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    action_id uuid NOT NULL,
    approval_version integer NOT NULL,
    approved_by text NOT NULL,
    approved_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_action_approvals_approval_check CHECK (((approval_version > 0) AND (length(TRIM(BOTH FROM approved_by)) > 0)))
);


--
-- Name: sv_api_idempotency_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_api_idempotency_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    operation text NOT NULL,
    resource_id text NOT NULL,
    idempotency_key text NOT NULL,
    body_hash text NOT NULL,
    response_status smallint NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT sv_api_idempotency_body_hash_check CHECK ((body_hash ~ '^sha256:[a-f0-9]{64}$'::text)),
    CONSTRAINT sv_api_idempotency_expiry_check CHECK (((expires_at > created_at) AND (expires_at <= (created_at + '7 days'::interval)))),
    CONSTRAINT sv_api_idempotency_key_length_check CHECK ((((length(idempotency_key) >= 8) AND (length(idempotency_key) <= 128)) AND (idempotency_key = btrim(idempotency_key)))),
    CONSTRAINT sv_api_idempotency_operation_check CHECK ((operation ~ '^[a-z][a-z0-9-]{1,63}$'::text)),
    CONSTRAINT sv_api_idempotency_response_status_check CHECK (((response_status >= 200) AND (response_status <= 299)))
);


--
-- Name: sv_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_approved_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_approved_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    source_kind text NOT NULL,
    source_ref text NOT NULL,
    finding_ref text,
    recommendation_ref text,
    status public.sv_action_status DEFAULT 'PROPOSED'::public.sv_action_status NOT NULL,
    title text NOT NULL,
    evidence_ids text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_approved_actions_evidence_check CHECK (((cardinality(evidence_ids) > 0) AND (length(TRIM(BOTH FROM title)) > 0))),
    CONSTRAINT sv_approved_actions_source_check CHECK (((source_kind = ANY (ARRAY['CYCLE_RECOMMENDATION'::text, 'ENGINE_ACTION'::text, 'MANUAL'::text])) AND (length(TRIM(BOTH FROM source_ref)) > 0)))
);


--
-- Name: sv_attribution_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_attribution_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    verification_cycle_id uuid NOT NULL,
    action_id uuid NOT NULL,
    finding_ref text NOT NULL,
    recommendation_ref text NOT NULL,
    change_event_ids uuid[] NOT NULL,
    baseline_cycle_id uuid NOT NULL,
    verification_measurement_cycle_id uuid CONSTRAINT sv_attribution_assessments_verification_measurement_cy_not_null NOT NULL,
    baseline_dataset_id uuid NOT NULL,
    verification_dataset_id uuid NOT NULL,
    metric_key text NOT NULL,
    formula_version text NOT NULL,
    verdict public.sv_attribution_verdict NOT NULL,
    confidence public.sv_attribution_confidence NOT NULL,
    reason_codes text[] NOT NULL,
    evidence_ids text[] NOT NULL,
    delta numeric(18,6),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    outcome_window_id uuid,
    CONSTRAINT sv_attribution_assessments_confidence_check CHECK ((((verdict = ANY (ARRAY['POSITIVE_CORRELATION'::public.sv_attribution_verdict, 'NEGATIVE_CORRELATION'::public.sv_attribution_verdict, 'NO_OBSERVED_CHANGE'::public.sv_attribution_verdict, 'MIXED_RESULT'::public.sv_attribution_verdict])) AND (confidence = ANY (ARRAY['HIGH'::public.sv_attribution_confidence, 'MEDIUM'::public.sv_attribution_confidence, 'LOW'::public.sv_attribution_confidence]))) OR ((verdict = ANY (ARRAY['INSUFFICIENT_EVIDENCE'::public.sv_attribution_verdict, 'CONFOUNDED'::public.sv_attribution_verdict, 'NOT_MEASURED'::public.sv_attribution_verdict])) AND (confidence = 'UNKNOWN'::public.sv_attribution_confidence)))),
    CONSTRAINT sv_attribution_assessments_provenance_check CHECK (((cardinality(evidence_ids) > 0) AND (cardinality(change_event_ids) > 0) AND (cardinality(reason_codes) > 0) AND (length(TRIM(BOTH FROM finding_ref)) > 0) AND (length(TRIM(BOTH FROM recommendation_ref)) > 0) AND (length(TRIM(BOTH FROM metric_key)) > 0) AND (length(TRIM(BOTH FROM formula_version)) > 0)))
);


--
-- Name: sv_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    actor_id text NOT NULL,
    event text NOT NULL,
    subject_kind text NOT NULL,
    subject_id text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_business_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_business_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    entity_id uuid NOT NULL,
    display_name text NOT NULL,
    country_code text NOT NULL,
    admin_area text,
    locality text,
    address_text text,
    timezone text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    geo_precision public.sv_geo_precision DEFAULT 'UNKNOWN'::public.sv_geo_precision NOT NULL,
    google_maps_url_reference text,
    google_place_id_reference text,
    reference_origin public.sv_reference_origin DEFAULT 'USER_PROVIDED'::public.sv_reference_origin NOT NULL,
    location_role public.sv_location_role DEFAULT 'PRIMARY'::public.sv_location_role NOT NULL,
    confirmation_status public.sv_location_confirmation DEFAULT 'PROPOSED'::public.sv_location_confirmation NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    local_profile jsonb,
    local_profile_confirmed_at timestamp with time zone
);


--
-- Name: sv_capture_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_capture_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    pilot_cycle_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    context_hash text NOT NULL,
    context_snapshot jsonb NOT NULL,
    repeat_index integer NOT NULL,
    query_text_snapshot text NOT NULL,
    target_entity_ids_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL,
    status public.sv_capture_task_status DEFAULT 'PENDING_CAPTURE'::public.sv_capture_task_status NOT NULL,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_change_event_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_change_event_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    change_event_id uuid NOT NULL,
    object_reference text NOT NULL,
    content_sha256 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_change_event_assets_reference_check CHECK ((length(TRIM(BOTH FROM object_reference)) > 0))
);


--
-- Name: sv_change_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_change_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    action_id uuid,
    change_type text NOT NULL,
    detail text NOT NULL,
    verification public.sv_change_verification DEFAULT 'DECLARED'::public.sv_change_verification NOT NULL,
    evidence_ids text[] DEFAULT '{}'::text[] NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_change_events_content_check CHECK (((length(TRIM(BOTH FROM change_type)) > 0) AND (length(TRIM(BOTH FROM detail)) > 0))),
    CONSTRAINT sv_change_events_evidence_check CHECK (((verification <> 'EVIDENCED'::public.sv_change_verification) OR (cardinality(evidence_ids) > 0)))
);


--
-- Name: sv_citation_gap_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_citation_gap_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    cycle_id uuid NOT NULL,
    configuration_lock_id uuid NOT NULL,
    topic_id uuid,
    source_domain text NOT NULL,
    source_urls text[] DEFAULT '{}'::text[] NOT NULL,
    owned_citation_count integer NOT NULL,
    competitor_citation_count integer NOT NULL,
    competitor_names text[] DEFAULT '{}'::text[] NOT NULL,
    engine_count integer NOT NULL,
    scenario_count integer NOT NULL,
    repeat_stability numeric(6,4),
    first_seen timestamp with time zone,
    last_seen timestamp with time zone,
    gap_type text,
    priority_band text NOT NULL,
    formula_version text NOT NULL,
    evidence_run_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_citation_gap_counts_non_negative CHECK (((owned_citation_count >= 0) AND (competitor_citation_count >= 0) AND (engine_count >= 1) AND (scenario_count >= 1)))
);


--
-- Name: sv_configuration_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_configuration_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    version integer NOT NULL,
    snapshot jsonb NOT NULL,
    engine_sha text NOT NULL,
    expected_runs integer NOT NULL,
    budget_cap numeric(12,6) NOT NULL,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    legacy_collision_ordinal integer DEFAULT 0 NOT NULL,
    CONSTRAINT sv_configuration_locks_legacy_collision_ordinal_check CHECK ((legacy_collision_ordinal >= 0)),
    CONSTRAINT sv_configuration_locks_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.sv_configuration_locks FORCE ROW LEVEL SECURITY;


--
-- Name: sv_cost_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_cost_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid,
    run_id uuid,
    provider text NOT NULL,
    amount_usd numeric(12,6) NOT NULL,
    basis text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'measurement'::text NOT NULL,
    measurement_cycle_id uuid,
    domain_id text DEFAULT 'AI'::text NOT NULL,
    CONSTRAINT sv_cost_events_domain_shape_check CHECK (((domain_id = 'AI'::text) OR ((measurement_cycle_id IS NOT NULL) AND (cycle_id IS NULL) AND (run_id IS NULL))))
);


--
-- Name: sv_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    order_id uuid NOT NULL,
    lock_id uuid NOT NULL,
    status public.sv_cycle_status DEFAULT 'CREATED'::public.sv_cycle_status NOT NULL,
    expected_runs integer NOT NULL,
    created_runs integer DEFAULT 0 NOT NULL,
    completed_runs integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_entities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    parent_entity_id uuid,
    entity_kind public.sv_entity_kind NOT NULL,
    parent_relation public.sv_parent_relation,
    confirmation_status public.sv_entity_confirmation DEFAULT 'PROPOSED'::public.sv_entity_confirmation NOT NULL,
    name text NOT NULL,
    aliases text[] DEFAULT '{}'::text[] NOT NULL,
    prelaunch boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_evidence_acceptance_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_evidence_acceptance_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    evidence_id uuid NOT NULL,
    accepted_at timestamp with time zone NOT NULL,
    accepted_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_evidence_acceptance_receipts_actor_check CHECK ((length(TRIM(BOTH FROM accepted_by)) > 0))
);

ALTER TABLE ONLY public.sv_evidence_acceptance_receipts FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE sv_evidence_acceptance_receipts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sv_evidence_acceptance_receipts IS 'Append-only human acceptance receipts. Presence means ACCEPTED; absence remains UNKNOWN. accepted_by is private.';


--
-- Name: sv_evidence_index; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_evidence_index (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    domain_id text NOT NULL,
    cycle_id uuid NOT NULL,
    observation_ref text NOT NULL,
    dataset_id uuid NOT NULL,
    source_snapshot_id uuid,
    captured_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid NOT NULL
);

ALTER TABLE ONLY public.sv_evidence_index FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN sv_evidence_index.observation_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sv_evidence_index.observation_ref IS 'Provider-native observation reference. Formal identity also includes organization, project, domain, cycle, dataset and source snapshot.';


--
-- Name: sv_measurement_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_measurement_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    domain_id text NOT NULL,
    domain_cycle_id uuid NOT NULL,
    configuration_lock_id uuid NOT NULL,
    status text DEFAULT 'CREATED'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.sv_measurement_cycles FORCE ROW LEVEL SECURITY;


--
-- Name: sv_measurement_datasets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_measurement_datasets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid,
    dataset_key text NOT NULL,
    version integer NOT NULL,
    immutable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_measurement_datasets_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.sv_measurement_datasets FORCE ROW LEVEL SECURITY;


--
-- Name: sv_provider_dataset_capabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_provider_dataset_capabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    provider text NOT NULL,
    source text NOT NULL,
    surface text NOT NULL,
    domain text NOT NULL,
    entity_type text NOT NULL,
    dataset_env_key text NOT NULL,
    input_schema_version text NOT NULL,
    output_schema_version text,
    access_class text NOT NULL,
    capability_status text NOT NULL,
    retention_class text,
    contract_version text NOT NULL,
    version integer NOT NULL,
    contract_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    immutable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_provider_dataset_capabilities_access_class_check CHECK ((access_class = ANY (ARRAY['PUBLIC'::text, 'CONNECTED'::text, 'UPLOADED'::text, 'DERIVED'::text]))),
    CONSTRAINT sv_provider_dataset_capabilities_domain_check CHECK ((domain = ANY (ARRAY['AI'::text, 'SEARCH'::text, 'ENTITY'::text, 'REPUTATION'::text, 'SOCIAL'::text, 'TRAVEL'::text]))),
    CONSTRAINT sv_provider_dataset_capabilities_shape_check CHECK (((version > 0) AND (immutable = true) AND (jsonb_typeof(contract_metadata) = 'object'::text) AND (length(TRIM(BOTH FROM provider)) > 0) AND (length(TRIM(BOTH FROM source)) > 0) AND (length(TRIM(BOTH FROM surface)) > 0) AND (length(TRIM(BOTH FROM entity_type)) > 0) AND (length(TRIM(BOTH FROM dataset_env_key)) > 0) AND (length(TRIM(BOTH FROM input_schema_version)) > 0) AND ((output_schema_version IS NULL) OR (length(TRIM(BOTH FROM output_schema_version)) > 0)) AND (length(TRIM(BOTH FROM access_class)) > 0) AND ((retention_class IS NULL) OR (length(TRIM(BOTH FROM retention_class)) > 0)) AND (length(TRIM(BOTH FROM contract_version)) > 0))),
    CONSTRAINT sv_provider_dataset_capabilities_status_check CHECK ((capability_status = ANY (ARRAY['CONFIGURED_ONLY'::text, 'CANARY_ONLY'::text, 'PILOT_ONLY'::text, 'ALLOWED'::text, 'BLOCKED'::text])))
);

ALTER TABLE ONLY public.sv_provider_dataset_capabilities FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE sv_provider_dataset_capabilities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sv_provider_dataset_capabilities IS 'Append-only tenant capability contracts. Insert a higher version; UPDATE, DELETE and TRUNCATE are rejected.';


--
-- Name: sv_source_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_source_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    source_type text NOT NULL,
    source_ref text NOT NULL,
    content_sha256 text NOT NULL,
    snapshot jsonb NOT NULL,
    captured_at timestamp with time zone NOT NULL,
    immutable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    capability_id uuid,
    provider_dataset_ref text,
    environment text,
    raw_reference text,
    input_schema_version text,
    output_schema_version text,
    content_sha256_format_valid boolean GENERATED ALWAYS AS ((content_sha256 ~ '^(sha256:)?[a-f0-9]{64}$'::text)) STORED,
    project_id uuid,
    CONSTRAINT sv_source_snapshots_provider_capture_metadata_check CHECK ((((capability_id IS NULL) AND (provider_dataset_ref IS NULL) AND (environment IS NULL) AND (raw_reference IS NULL) AND (input_schema_version IS NULL) AND (output_schema_version IS NULL)) OR ((capability_id IS NOT NULL) AND (provider_dataset_ref = btrim(provider_dataset_ref)) AND (length(provider_dataset_ref) > 0) AND (environment = ANY (ARRAY['ISOLATED_CANARY'::text, 'STAGING_ACCEPTANCE'::text, 'PRODUCTION'::text])) AND (raw_reference = btrim(raw_reference)) AND (length(raw_reference) > 0) AND (input_schema_version = btrim(input_schema_version)) AND (length(input_schema_version) > 0) AND ((output_schema_version IS NULL) OR ((output_schema_version = btrim(output_schema_version)) AND (length(output_schema_version) > 0))))))
);

ALTER TABLE ONLY public.sv_source_snapshots FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN sv_source_snapshots.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sv_source_snapshots.project_id IS 'Project provenance derived from one unambiguous DELIVERED provider snapshot journal binding. NULL legacy rows remain ineligible for formal acceptance.';


--
-- Name: sv_evidence_provenance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sv_evidence_provenance WITH (security_invoker='true') AS
 SELECT evidence.organization_id,
    evidence.project_id,
    evidence.id AS evidence_id,
    evidence.domain_id,
    evidence.cycle_id,
    evidence.observation_ref,
    evidence.dataset_id,
    dataset.dataset_key,
    dataset.version AS dataset_version,
    evidence.source_snapshot_id,
    snapshot.capability_id,
    snapshot.source_type,
    snapshot.source_ref,
    snapshot.raw_reference,
    snapshot.content_sha256,
    snapshot.environment,
    snapshot.provider_dataset_ref,
    snapshot.input_schema_version,
    snapshot.output_schema_version,
    capability.provider,
    capability.source,
    capability.surface,
    capability.domain AS capability_domain,
    capability.entity_type,
    capability.access_class,
    capability.capability_status,
    capability.retention_class,
    capability.contract_version,
    capability.input_schema_version AS capability_input_schema_version,
    capability.output_schema_version AS capability_output_schema_version,
    evidence.captured_at AS evidence_captured_at,
    snapshot.captured_at AS source_captured_at
   FROM (((((public.sv_evidence_index evidence
     JOIN public.sv_measurement_cycles cycle ON (((cycle.id = evidence.cycle_id) AND (cycle.domain_id = evidence.domain_id) AND (cycle.organization_id = evidence.organization_id))))
     JOIN public.sv_configuration_locks lock ON (((lock.id = cycle.configuration_lock_id) AND (lock.project_id = evidence.project_id) AND (lock.organization_id = evidence.organization_id))))
     JOIN public.sv_measurement_datasets dataset ON (((dataset.id = evidence.dataset_id) AND (dataset.cycle_id = evidence.cycle_id) AND (dataset.organization_id = evidence.organization_id))))
     LEFT JOIN public.sv_source_snapshots snapshot ON (((snapshot.id = evidence.source_snapshot_id) AND (snapshot.project_id = evidence.project_id) AND (snapshot.organization_id = evidence.organization_id))))
     LEFT JOIN public.sv_provider_dataset_capabilities capability ON (((capability.id = snapshot.capability_id) AND (capability.organization_id = evidence.organization_id))));


--
-- Name: VIEW sv_evidence_provenance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.sv_evidence_provenance IS 'INTERNAL PRIVATE provenance. raw_reference, provider_dataset_ref, environment and content_sha256 MUST NOT flow to client routes or exports.';


--
-- Name: sv_evidence_read_model; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sv_evidence_read_model WITH (security_invoker='true') AS
 SELECT evidence.organization_id,
    evidence.project_id,
    evidence.id AS evidence_id,
    evidence.domain_id,
    dataset.version AS dataset_version,
    evidence.source_snapshot_id,
    snapshot.capability_id,
    snapshot.source_type,
    snapshot.input_schema_version,
    snapshot.output_schema_version,
    capability.source,
    capability.surface,
    capability.domain AS capability_domain,
    capability.capability_status,
    capability.input_schema_version AS capability_input_schema_version,
    capability.output_schema_version AS capability_output_schema_version,
        CASE
            WHEN (acceptance.id IS NULL) THEN NULL::text
            ELSE 'ACCEPTED'::text
        END AS acceptance_status,
    acceptance.accepted_at,
    evidence.captured_at AS evidence_captured_at
   FROM ((((((public.sv_evidence_index evidence
     JOIN public.sv_measurement_cycles cycle ON (((cycle.id = evidence.cycle_id) AND (cycle.domain_id = evidence.domain_id) AND (cycle.organization_id = evidence.organization_id))))
     JOIN public.sv_configuration_locks lock ON (((lock.id = cycle.configuration_lock_id) AND (lock.project_id = evidence.project_id) AND (lock.organization_id = evidence.organization_id))))
     JOIN public.sv_measurement_datasets dataset ON (((dataset.id = evidence.dataset_id) AND (dataset.cycle_id = evidence.cycle_id) AND (dataset.organization_id = evidence.organization_id))))
     LEFT JOIN public.sv_source_snapshots snapshot ON (((snapshot.id = evidence.source_snapshot_id) AND (snapshot.project_id = evidence.project_id) AND (snapshot.organization_id = evidence.organization_id))))
     LEFT JOIN public.sv_provider_dataset_capabilities capability ON (((capability.id = snapshot.capability_id) AND (capability.organization_id = evidence.organization_id))))
     LEFT JOIN public.sv_evidence_acceptance_receipts acceptance ON (((acceptance.evidence_id = evidence.id) AND (acceptance.organization_id = evidence.organization_id))));


--
-- Name: VIEW sv_evidence_read_model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.sv_evidence_read_model IS 'Application-safe evidence projection. Excludes raw locators, provider references, content hashes and snapshot payloads.';


--
-- Name: sv_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid NOT NULL,
    severity text NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    detail text NOT NULL,
    status public.sv_finding_status DEFAULT 'OPEN'::public.sv_finding_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    domain_id text,
    location_id uuid
);


--
-- Name: sv_free_ai_visibility_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_free_ai_visibility_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    user_id text NOT NULL,
    registrable_domain text NOT NULL,
    reservation_request_key text NOT NULL,
    status text DEFAULT 'QUEUED'::text NOT NULL,
    report jsonb,
    queued_at timestamp with time zone DEFAULT now() NOT NULL,
    dispatched_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT sv_free_ai_visibility_checks_domain_present CHECK ((length(btrim(registrable_domain)) > 0)),
    CONSTRAINT sv_free_ai_visibility_checks_status CHECK ((((status = 'QUEUED'::text) AND (report IS NULL) AND (dispatched_at IS NULL) AND (completed_at IS NULL)) OR ((status = 'UNCONFIRMED'::text) AND (report IS NULL) AND (dispatched_at IS NOT NULL) AND (completed_at IS NULL)) OR ((status = 'COMPLETED'::text) AND (report IS NOT NULL) AND (dispatched_at IS NOT NULL) AND (completed_at IS NOT NULL))))
);


--
-- Name: sv_free_auto_dispatch_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_free_auto_dispatch_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    utc_day date NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    request_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_free_auto_dispatch_claims_org_present CHECK ((length(btrim(organization_id)) > 0))
);


--
-- Name: sv_grid_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_grid_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    location_id uuid NOT NULL,
    version integer NOT NULL,
    point_count integer NOT NULL,
    spacing_meters integer NOT NULL,
    shape text NOT NULL,
    rows integer NOT NULL,
    columns integer NOT NULL,
    center_latitude numeric(9,6) NOT NULL,
    center_longitude numeric(9,6) NOT NULL,
    formula_version text NOT NULL,
    immutable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_grid_definitions_latitude_check CHECK (((center_latitude >= ('-90'::integer)::numeric) AND (center_latitude <= (90)::numeric))),
    CONSTRAINT sv_grid_definitions_longitude_check CHECK (((center_longitude >= ('-180'::integer)::numeric) AND (center_longitude <= (180)::numeric))),
    CONSTRAINT sv_grid_definitions_point_count_check CHECK (((point_count > 0) AND (point_count <= 49) AND (point_count = (rows * columns)))),
    CONSTRAINT sv_grid_definitions_shape_check CHECK (((shape = 'SQUARE'::text) AND (rows = columns) AND (mod(rows, 2) = 1))),
    CONSTRAINT sv_grid_definitions_spacing_check CHECK ((spacing_meters > 0))
);


--
-- Name: sv_grid_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_grid_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    grid_id uuid NOT NULL,
    point_index integer NOT NULL,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_grid_points_latitude_check CHECK (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric))),
    CONSTRAINT sv_grid_points_longitude_check CHECK (((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))),
    CONSTRAINT sv_grid_points_point_index_check CHECK ((point_index >= 0))
);


--
-- Name: sv_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    order_id uuid,
    cycle_id uuid,
    kind text NOT NULL,
    severity text DEFAULT 'high'::text NOT NULL,
    detail text NOT NULL,
    dispatch_key text,
    status text DEFAULT 'OPEN'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: sv_journal_daily_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_journal_daily_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    configuration_lock_id uuid,
    question_set_version text NOT NULL,
    utc_day date NOT NULL,
    attempt integer NOT NULL,
    status text DEFAULT 'CLAIMED'::text NOT NULL,
    claimed_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    abandoned_at timestamp with time zone,
    reconciled_at timestamp with time zone,
    reconciliation_reason text,
    reconciled_by text,
    CONSTRAINT sv_journal_daily_claims_attempt_check CHECK ((attempt > 0)),
    CONSTRAINT sv_journal_daily_claims_completion_check CHECK ((((status = ANY (ARRAY['CLAIMED'::text, 'EXECUTING'::text, 'NO_SPEND'::text, 'HOLD'::text])) AND (completed_at IS NULL) AND (abandoned_at IS NULL) AND (reconciled_at IS NULL) AND (reconciliation_reason IS NULL) AND (reconciled_by IS NULL)) OR ((status = 'COMPLETED'::text) AND (completed_at IS NOT NULL) AND (completed_at >= claimed_at) AND (abandoned_at IS NULL) AND (reconciled_at IS NULL) AND (reconciliation_reason IS NULL) AND (reconciled_by IS NULL)) OR ((status = 'ABANDONED'::text) AND (completed_at IS NULL) AND (abandoned_at IS NOT NULL) AND (abandoned_at >= claimed_at) AND (reconciled_at IS NULL) AND (reconciliation_reason IS NULL) AND (reconciled_by IS NULL)) OR ((status = 'RECONCILED'::text) AND (completed_at IS NULL) AND (abandoned_at IS NULL) AND (reconciled_at IS NOT NULL) AND (reconciled_at >= claimed_at) AND (length(btrim(reconciliation_reason)) > 0) AND (length(btrim(reconciled_by)) > 0)))),
    CONSTRAINT sv_journal_daily_claims_execution_link_check CHECK (((status = ANY (ARRAY['CLAIMED'::text, 'NO_SPEND'::text, 'ABANDONED'::text])) OR (configuration_lock_id IS NOT NULL))),
    CONSTRAINT sv_journal_daily_claims_status_check CHECK ((status = ANY (ARRAY['CLAIMED'::text, 'EXECUTING'::text, 'NO_SPEND'::text, 'HOLD'::text, 'COMPLETED'::text, 'ABANDONED'::text, 'RECONCILED'::text]))),
    CONSTRAINT sv_journal_daily_claims_utc_day_check CHECK ((utc_day = ((claimed_at AT TIME ZONE 'UTC'::text))::date))
);

ALTER TABLE ONLY public.sv_journal_daily_claims FORCE ROW LEVEL SECURITY;


--
-- Name: sv_journal_no_spend_reconciliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_journal_no_spend_reconciliations (
    reconciliation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    schema_version integer NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    claim_id uuid NOT NULL,
    configuration_lock_id uuid CONSTRAINT sv_journal_no_spend_reconciliati_configuration_lock_id_not_null NOT NULL,
    cycle_ids uuid[] NOT NULL,
    permit_ids uuid[] NOT NULL,
    run_ids uuid[] NOT NULL,
    run_execution_scope jsonb CONSTRAINT sv_journal_no_spend_reconciliation_run_execution_scope_not_null NOT NULL,
    provider text NOT NULL,
    provider_account_scope_sha256 text CONSTRAINT sv_journal_no_spend_reconci_provider_account_scope_sha_not_null NOT NULL,
    provider_dataset_resource_ids text[] CONSTRAINT sv_journal_no_spend_reconci_provider_dataset_resource__not_null NOT NULL,
    evidence_window_start timestamp with time zone CONSTRAINT sv_journal_no_spend_reconciliati_evidence_window_start_not_null NOT NULL,
    evidence_window_end timestamp with time zone CONSTRAINT sv_journal_no_spend_reconciliation_evidence_window_end_not_null NOT NULL,
    execution_quiesced_at timestamp with time zone CONSTRAINT sv_journal_no_spend_reconciliati_execution_quiesced_at_not_null NOT NULL,
    billing_final_at timestamp with time zone NOT NULL,
    accepted_provider_object_count integer CONSTRAINT sv_journal_no_spend_reconci_accepted_provider_object_c_not_null NOT NULL,
    billed_provider_object_count integer CONSTRAINT sv_journal_no_spend_reconci_billed_provider_object_cou_not_null NOT NULL,
    billed_amount_usd numeric(12,6) NOT NULL,
    source_artifact_reference text CONSTRAINT sv_journal_no_spend_reconcil_source_artifact_reference_not_null NOT NULL,
    source_artifact_sha256 text CONSTRAINT sv_journal_no_spend_reconciliat_source_artifact_sha256_not_null NOT NULL,
    prior_claim_status text NOT NULL,
    current_claim_status text CONSTRAINT sv_journal_no_spend_reconciliatio_current_claim_status_not_null NOT NULL,
    reconciled_at timestamp with time zone NOT NULL,
    reconciled_by text NOT NULL,
    certificate_sha256 text NOT NULL,
    CONSTRAINT sv_journal_no_spend_reconciliations_identity_check CHECK (((schema_version = 1) AND (provider = 'BRIGHT_DATA'::text) AND (provider_account_scope_sha256 ~ '^sha256:[a-f0-9]{64}$'::text) AND (source_artifact_reference = btrim(source_artifact_reference)) AND (length(source_artifact_reference) > 0) AND (source_artifact_sha256 ~ '^sha256:[a-f0-9]{64}$'::text) AND (prior_claim_status = 'HOLD'::text) AND (current_claim_status = 'NO_SPEND'::text) AND (reconciled_by = btrim(reconciled_by)) AND (length(reconciled_by) > 14) AND (certificate_sha256 ~ '^sha256:[a-f0-9]{64}$'::text))),
    CONSTRAINT sv_journal_no_spend_reconciliations_sets_check CHECK (((cardinality(cycle_ids) > 0) AND (cardinality(provider_dataset_resource_ids) > 0) AND (array_position(cycle_ids, NULL::uuid) IS NULL) AND (array_position(permit_ids, NULL::uuid) IS NULL) AND (array_position(run_ids, NULL::uuid) IS NULL) AND (array_position(provider_dataset_resource_ids, NULL::text) IS NULL) AND (((cardinality(run_ids) = 0) AND (cardinality(permit_ids) = 0) AND (jsonb_typeof(run_execution_scope) = 'array'::text) AND (jsonb_array_length(run_execution_scope) = 0)) OR ((cardinality(run_ids) > 0) AND (cardinality(permit_ids) > 0) AND (jsonb_typeof(run_execution_scope) = 'array'::text) AND (jsonb_array_length(run_execution_scope) = cardinality(run_ids)))))),
    CONSTRAINT sv_journal_no_spend_reconciliations_time_check CHECK (((evidence_window_start <= execution_quiesced_at) AND (execution_quiesced_at <= evidence_window_end) AND (evidence_window_end <= billing_final_at) AND (billing_final_at <= reconciled_at))),
    CONSTRAINT sv_journal_no_spend_reconciliations_zero_result_check CHECK (((accepted_provider_object_count = 0) AND (billed_provider_object_count = 0) AND (billed_amount_usd = (0)::numeric)))
);

ALTER TABLE ONLY public.sv_journal_no_spend_reconciliations FORCE ROW LEVEL SECURITY;


--
-- Name: sv_journal_provider_boundaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_journal_provider_boundaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    journal_claim_id uuid NOT NULL,
    configuration_lock_id uuid NOT NULL,
    cycle_id uuid NOT NULL,
    permit_id uuid NOT NULL,
    run_id uuid NOT NULL,
    dispatch_key text NOT NULL,
    channel text NOT NULL,
    system_id text,
    boundary_kind text DEFAULT 'PRE_TRANSPORT'::text NOT NULL,
    provider_call_upper_bound integer DEFAULT 1 CONSTRAINT sv_journal_provider_boundari_provider_call_upper_bound_not_null NOT NULL,
    crossed_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT sv_journal_provider_boundaries_call_bound_check CHECK ((provider_call_upper_bound = 1)),
    CONSTRAINT sv_journal_provider_boundaries_kind_check CHECK ((boundary_kind = 'PRE_TRANSPORT'::text))
);

ALTER TABLE ONLY public.sv_journal_provider_boundaries FORCE ROW LEVEL SECURITY;


--
-- Name: sv_local_ai_cost_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_cost_events (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    slot_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    domain_id text NOT NULL,
    amount_usd numeric NOT NULL,
    cost_type text NOT NULL,
    state text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_ai_cost_events_amount_usd_check CHECK ((amount_usd = (0)::numeric)),
    CONSTRAINT sv_local_ai_cost_events_cost_type_check CHECK ((cost_type = 'FIXTURE_ZERO'::text)),
    CONSTRAINT sv_local_ai_cost_events_domain_id_check CHECK ((domain_id = 'LOCAL_AI'::text)),
    CONSTRAINT sv_local_ai_cost_events_state_check CHECK ((state = ANY (ARRAY['SETTLED'::text, 'UNKNOWN_NO_SPEND'::text])))
);

ALTER TABLE ONLY public.sv_local_ai_cost_events FORCE ROW LEVEL SECURITY;


--
-- Name: sv_local_ai_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    order_id uuid NOT NULL,
    kind text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_ai_events_kind_check CHECK ((kind = ANY (ARRAY['LOCKED'::text, 'TEST_PAID'::text, 'BATCH_COMPLETED'::text, 'PARTIAL_UNKNOWN'::text, 'RETENTION_EXPIRED'::text])))
);

ALTER TABLE ONLY public.sv_local_ai_events FORCE ROW LEVEL SECURITY;


--
-- Name: sv_local_ai_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_evidence (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    slot_id uuid NOT NULL,
    raw_body jsonb,
    raw_sha256 text,
    raw_canonical text,
    result_json jsonb NOT NULL,
    captured_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    expired_at timestamp with time zone,
    CONSTRAINT sv_local_ai_evidence_check CHECK ((expires_at > captured_at)),
    CONSTRAINT sv_local_ai_evidence_check1 CHECK ((((raw_body IS NULL) AND (raw_canonical IS NULL)) OR (((raw_canonical)::jsonb = raw_body) AND (raw_sha256 = ('sha256:'::text || encode(sha256(convert_to(raw_canonical, 'UTF8'::name)), 'hex'::text)))))),
    CONSTRAINT sv_local_ai_evidence_result_json_check CHECK (((result_json ->> 'validity'::text) = ANY (ARRAY['VALID'::text, 'INVALID'::text, 'UNKNOWN'::text]))),
    CONSTRAINT sv_local_ai_evidence_result_json_check1 CHECK ((((result_json ->> 'validity'::text) = 'VALID'::text) OR (((result_json -> 'mention'::text) = 'null'::jsonb) AND ((result_json -> 'recommendationPosition'::text) = 'null'::jsonb))))
);

ALTER TABLE ONLY public.sv_local_ai_evidence FORCE ROW LEVEL SECURITY;


--
-- Name: sv_local_ai_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_orders (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    location_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    lock_json jsonb NOT NULL,
    lock_canonical text NOT NULL,
    lock_sha256 text NOT NULL,
    expected integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_ai_orders_check CHECK (((lock_canonical)::jsonb = lock_json)),
    CONSTRAINT sv_local_ai_orders_check1 CHECK ((lock_sha256 = ('sha256:'::text || encode(sha256(convert_to(lock_canonical, 'UTF8'::name)), 'hex'::text)))),
    CONSTRAINT sv_local_ai_orders_check2 CHECK ((((lock_json ->> 'organizationId'::text) = organization_id) AND ((lock_json ->> 'projectId'::text) = (project_id)::text) AND ((lock_json ->> 'locationId'::text) = (location_id)::text))),
    CONSTRAINT sv_local_ai_orders_check3 CHECK (((expected = ((lock_json ->> 'expectedCardinality'::text))::integer) AND (expected = (((jsonb_array_length((lock_json #> '{grid,points}'::text[])) * jsonb_array_length((lock_json #> '{promptSet,prompts}'::text[]))) * jsonb_array_length((lock_json -> 'systems'::text))) * ((lock_json ->> 'repeats'::text))::integer)))),
    CONSTRAINT sv_local_ai_orders_expected_check CHECK (((expected >= 1) AND (expected <= 300))),
    CONSTRAINT sv_local_ai_orders_lock_json_check CHECK ((((lock_json ->> 'domainId'::text) = 'LOCAL_AI'::text) AND ((lock_json ->> 'executionMode'::text) = 'FIXTURE'::text))),
    CONSTRAINT sv_local_ai_orders_lock_json_check1 CHECK ((((lock_json #>> '{budget,capUsd}'::text[]) = '0'::text) AND ((lock_json #>> '{budget,reserveUsd}'::text[]) = '0'::text) AND ((lock_json #>> '{budget,maxRealProviderCalls}'::text[]) = '0'::text))),
    CONSTRAINT sv_local_ai_orders_lock_json_check2 CHECK ((((lock_json #>> '{quote,amountUsd}'::text[]) = '0'::text) AND ((lock_json #>> '{quote,paymentMode}'::text[]) = 'TEST'::text)))
);

ALTER TABLE ONLY public.sv_local_ai_orders FORCE ROW LEVEL SECURITY;


--
-- Name: sv_local_ai_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_payments (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    order_id uuid NOT NULL,
    event_id uuid NOT NULL,
    amount_usd numeric NOT NULL,
    currency text NOT NULL,
    mode text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_ai_payments_amount_usd_check CHECK ((amount_usd = (0)::numeric)),
    CONSTRAINT sv_local_ai_payments_currency_check CHECK ((currency = 'USD'::text)),
    CONSTRAINT sv_local_ai_payments_mode_check CHECK ((mode = 'TEST'::text)),
    CONSTRAINT sv_local_ai_payments_status_check CHECK ((status = 'SUCCEEDED'::text))
);

ALTER TABLE ONLY public.sv_local_ai_payments FORCE ROW LEVEL SECURITY;


--
-- Name: sv_local_ai_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_slots (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    order_id uuid NOT NULL,
    point_id uuid NOT NULL,
    prompt_id uuid NOT NULL,
    system_id text NOT NULL,
    repeat_index integer NOT NULL,
    ordinal integer NOT NULL
);

ALTER TABLE ONLY public.sv_local_ai_slots FORCE ROW LEVEL SECURITY;


--
-- Name: sv_local_canary_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_canary_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    local_cycle_id uuid NOT NULL,
    attempt_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    actual_cost_usd numeric(12,6) NOT NULL,
    provider_contract_digest text NOT NULL,
    status text NOT NULL,
    actor text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_canary_reviews_actor_check CHECK ((length(btrim(actor)) > 0)),
    CONSTRAINT sv_local_canary_reviews_actual_cost_usd_check CHECK ((actual_cost_usd >= (0)::numeric)),
    CONSTRAINT sv_local_canary_reviews_provider_contract_digest_check CHECK ((provider_contract_digest ~ '^sha256:[a-f0-9]{64}$'::text)),
    CONSTRAINT sv_local_canary_reviews_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'ACCEPTED'::text, 'REJECTED'::text])))
);


--
-- Name: sv_local_competitor_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_competitor_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    observation_id uuid NOT NULL,
    rank integer NOT NULL,
    entity_name text NOT NULL,
    matched_entity_id uuid,
    match_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_competitor_observations_rank_check CHECK ((rank > 0))
);


--
-- Name: sv_local_customer_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_customer_runs (
    order_id uuid NOT NULL,
    organization_id text NOT NULL,
    actor_id text NOT NULL,
    snapshot_canonical text NOT NULL,
    snapshot_sha256 text NOT NULL,
    expected_slots integer NOT NULL,
    status text DEFAULT 'QUEUED'::text NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    CONSTRAINT sv_local_customer_runs_check CHECK ((snapshot_sha256 = ('sha256:'::text || encode(sha256(convert_to(snapshot_canonical, 'UTF8'::name)), 'hex'::text)))),
    CONSTRAINT sv_local_customer_runs_expected_slots_check CHECK (((expected_slots >= 9) AND (expected_slots <= 375))),
    CONSTRAINT sv_local_customer_runs_failure_count_check CHECK (((failure_count >= 0) AND (failure_count <= 3))),
    CONSTRAINT sv_local_customer_runs_status_check CHECK ((status = ANY (ARRAY['QUEUED'::text, 'RUNNING'::text, 'READY'::text, 'FAILED'::text, 'CANCELLED'::text])))
);


--
-- Name: sv_local_customer_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_customer_tasks (
    order_id uuid NOT NULL,
    organization_id text NOT NULL,
    query_index integer NOT NULL,
    point_index integer NOT NULL,
    keyword text NOT NULL,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    result_json jsonb,
    CONSTRAINT sv_local_customer_tasks_check CHECK (((((status = 'PENDING'::text) AND (result_json IS NULL)) OR ((status = 'DONE'::text) AND ((result_json ->> 'source'::text) = 'FIXTURE_NOT_GOOGLE'::text) AND ((result_json ->> 'externalProviderCalls'::text) = '0'::text))) IS TRUE)),
    CONSTRAINT sv_local_customer_tasks_point_index_check CHECK (((point_index >= 0) AND (point_index <= 24))),
    CONSTRAINT sv_local_customer_tasks_query_index_check CHECK (((query_index >= 0) AND (query_index <= 14))),
    CONSTRAINT sv_local_customer_tasks_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'DONE'::text])))
);


--
-- Name: sv_local_dispatch_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_dispatch_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    local_cycle_id uuid NOT NULL,
    measurement_cycle_id uuid NOT NULL,
    observation_id uuid NOT NULL,
    attempt_id uuid NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    claim_token uuid,
    lease_expires_at timestamp with time zone,
    enqueued_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_dispatch_outbox_check CHECK ((((status = 'CLAIMED'::text) AND (claim_token IS NOT NULL) AND (lease_expires_at IS NOT NULL) AND (enqueued_at IS NULL)) OR ((status = 'PENDING'::text) AND (claim_token IS NULL) AND (lease_expires_at IS NULL) AND (enqueued_at IS NULL)) OR ((status = 'ENQUEUED'::text) AND (claim_token IS NULL) AND (lease_expires_at IS NULL) AND (enqueued_at IS NOT NULL)) OR ((status = 'CANCELLED'::text) AND (claim_token IS NULL) AND (lease_expires_at IS NULL)))),
    CONSTRAINT sv_local_dispatch_outbox_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'CLAIMED'::text, 'ENQUEUED'::text, 'CANCELLED'::text])))
);


--
-- Name: sv_local_evidence_acceptances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_evidence_acceptances (
    organization_id text NOT NULL,
    observation_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    evidence_sha256 text NOT NULL,
    contract_version text DEFAULT 'LOCAL_MAPS_V1'::text NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_evidence_acceptances_contract_version_check CHECK ((contract_version = 'LOCAL_MAPS_V1'::text))
);


--
-- Name: sv_local_external_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_external_audits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    actor_id text NOT NULL,
    content_json jsonb NOT NULL,
    content_canonical text NOT NULL,
    content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_external_audits_check CHECK ((content_json = (content_canonical)::jsonb)),
    CONSTRAINT sv_local_external_audits_check1 CHECK ((content_sha256 = ('sha256:'::text || encode(sha256(convert_to(content_canonical, 'UTF8'::name)), 'hex'::text)))),
    CONSTRAINT sv_local_external_audits_check2 CHECK ((NOT ((content_json ->> 'organizationId'::text) IS DISTINCT FROM organization_id))),
    CONSTRAINT sv_local_external_audits_content_json_check CHECK ((NOT ((content_json ->> 'provenance'::text) IS DISTINCT FROM 'EXTERNAL_RETAINED_RESPONSE'::text))),
    CONSTRAINT sv_local_external_audits_content_json_check1 CHECK ((NOT ((content_json ->> 'billingReconciliation'::text) IS DISTINCT FROM 'NOT_VERIFIED'::text))),
    CONSTRAINT sv_local_external_audits_content_json_check2 CHECK ((NOT ((content_json ->> 'applicationLedgerImport'::text) IS DISTINCT FROM 'NOT_APPLIED'::text))),
    CONSTRAINT sv_local_external_audits_content_json_check3 CHECK ((NOT (jsonb_typeof((content_json -> 'batches'::text)) IS DISTINCT FROM 'array'::text)))
);


--
-- Name: sv_local_external_publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_external_publications (
    organization_id text NOT NULL,
    report_version_id uuid NOT NULL,
    audit_id uuid NOT NULL,
    actor_id text NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_local_external_raw_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_external_raw_evidence (
    provider_task_id text NOT NULL,
    organization_id text NOT NULL,
    audit_id uuid NOT NULL,
    raw_sha256 text NOT NULL,
    captured_at timestamp with time zone NOT NULL,
    retention_expires_at timestamp with time zone NOT NULL,
    raw_body text,
    raw_deleted_at timestamp with time zone,
    CONSTRAINT sv_local_external_raw_evidence_check CHECK ((retention_expires_at = (captured_at + '720:00:00'::interval))),
    CONSTRAINT sv_local_external_raw_evidence_check1 CHECK ((((raw_body IS NOT NULL) AND (raw_deleted_at IS NULL) AND (raw_sha256 = ('sha256:'::text || encode(sha256(convert_to(raw_body, 'UTF8'::name)), 'hex'::text)))) OR ((raw_body IS NULL) AND (raw_deleted_at IS NOT NULL))))
);


--
-- Name: sv_local_external_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_external_tasks (
    provider_task_id text NOT NULL,
    organization_id text NOT NULL,
    audit_id uuid NOT NULL,
    raw_sha256 text NOT NULL,
    CONSTRAINT sv_local_external_tasks_raw_sha256_check CHECK ((raw_sha256 ~ '^sha256:[a-f0-9]{64}$'::text))
);


--
-- Name: sv_local_keywords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_keywords (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    location_id uuid NOT NULL,
    text text NOT NULL,
    normalized_text text NOT NULL,
    language text NOT NULL,
    status public.sv_scenario_status DEFAULT 'PROPOSED'::public.sv_scenario_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_local_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    capture_task_id uuid NOT NULL,
    captured_by text NOT NULL,
    captured_at timestamp with time zone NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    review_status text DEFAULT 'SUBMITTED_FOR_REVIEW'::text NOT NULL,
    validity text,
    invalid_reason text,
    ordering_state public.sv_ordering_state DEFAULT 'UNKNOWN'::public.sv_ordering_state NOT NULL,
    transcript text NOT NULL,
    query_text text NOT NULL,
    content_sha256 text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    supersedes_observation_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_local_order_publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_order_publications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    order_id uuid NOT NULL,
    version integer NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    bundle_json jsonb NOT NULL,
    bundle_sha256 text NOT NULL,
    analysis_json jsonb NOT NULL,
    content_canonical text NOT NULL,
    content_sha256 text NOT NULL,
    actor_id text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    revoked_by text,
    CONSTRAINT sv_local_order_publications_check CHECK ((bundle_sha256 = ('sha256:'::text || encode(sha256(convert_to((bundle_json)::text, 'UTF8'::name)), 'hex'::text)))),
    CONSTRAINT sv_local_order_publications_check1 CHECK (((content_canonical)::jsonb = jsonb_build_object('bundle', bundle_json, 'analysis', analysis_json))),
    CONSTRAINT sv_local_order_publications_check2 CHECK ((content_sha256 = ('sha256:'::text || encode(sha256(convert_to(content_canonical, 'UTF8'::name)), 'hex'::text)))),
    CONSTRAINT sv_local_order_publications_check3 CHECK ((((status = 'PUBLISHED'::text) AND (revoked_at IS NULL) AND (revoked_by IS NULL)) OR ((status = 'REVOKED'::text) AND (revoked_at IS NOT NULL) AND (revoked_by IS NOT NULL)))),
    CONSTRAINT sv_local_order_publications_status_check CHECK ((status = ANY (ARRAY['PUBLISHED'::text, 'REVOKED'::text]))),
    CONSTRAINT sv_local_order_publications_version_check CHECK ((version > 0))
);


--
-- Name: sv_local_qc_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_qc_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    local_cycle_id uuid NOT NULL,
    report_version_id uuid NOT NULL,
    decision text NOT NULL,
    actor text NOT NULL,
    note text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_qc_decisions_actor_check CHECK ((length(btrim(actor)) > 0)),
    CONSTRAINT sv_local_qc_decisions_decision_check CHECK ((decision = ANY (ARRAY['ACCEPT_PARTIAL'::text, 'APPROVED'::text, 'REJECTED'::text])))
);


--
-- Name: sv_local_rank_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_rank_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid NOT NULL,
    location_id uuid NOT NULL,
    keyword_id uuid NOT NULL,
    grid_definition_id uuid NOT NULL,
    grid_point_id uuid NOT NULL,
    provider text NOT NULL,
    repeat_index integer NOT NULL,
    validity public.sv_local_rank_validity,
    invalid_reason text,
    capture_depth integer NOT NULL,
    capture_mode text NOT NULL,
    target_rank integer,
    attempt_count integer DEFAULT 1 NOT NULL,
    raw_reference text,
    captured_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    outcome text DEFAULT 'PENDING'::text NOT NULL,
    evidence_envelope jsonb,
    evidence_canonical text,
    evidence_sha256 text,
    evidence_id uuid,
    CONSTRAINT sv_local_observation_envelope_check CHECK (((((evidence_envelope IS NULL) AND (evidence_canonical IS NULL) AND (evidence_sha256 IS NULL)) OR ((evidence_envelope IS NOT NULL) AND (evidence_canonical IS NOT NULL) AND (evidence_sha256 IS NOT NULL) AND (evidence_envelope = (evidence_canonical)::jsonb) AND (evidence_sha256 = ('sha256:'::text || encode(sha256(convert_to(evidence_canonical, 'UTF8'::name)), 'hex'::text))))) IS TRUE)),
    CONSTRAINT sv_local_observation_outcome_check CHECK ((outcome = ANY (ARRAY['PENDING'::text, 'FOUND'::text, 'ABSENT_WITHIN_DEPTH'::text, 'INVALID'::text, 'UNKNOWN'::text, 'BLOCKED'::text, 'CANCELLED'::text]))),
    CONSTRAINT sv_local_rank_observations_attempt_count_cap_check CHECK (((attempt_count >= 1) AND (attempt_count <= 3))),
    CONSTRAINT sv_local_rank_observations_attempt_count_check CHECK ((attempt_count > 0)),
    CONSTRAINT sv_local_rank_observations_capture_depth_check CHECK ((capture_depth >= 0)),
    CONSTRAINT sv_local_rank_observations_repeat_index_check CHECK ((repeat_index >= 0)),
    CONSTRAINT sv_local_rank_observations_target_rank_check CHECK (((target_rank IS NULL) OR ((target_rank > 0) AND (target_rank <= capture_depth))))
);


--
-- Name: sv_local_raw_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_raw_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    source_snapshot_id uuid NOT NULL,
    raw_response_body text,
    raw_response_sha256 text NOT NULL,
    provider_task_id text,
    retention_expires_at timestamp with time zone NOT NULL,
    raw_deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_raw_evidence_check CHECK ((((raw_deleted_at IS NULL) AND (raw_response_body IS NOT NULL)) OR ((raw_deleted_at IS NOT NULL) AND (raw_response_body IS NULL))))
);


--
-- Name: sv_local_raw_retention_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_raw_retention_health (
    organization_id text NOT NULL,
    checked_at timestamp with time zone NOT NULL,
    deleted_count integer NOT NULL,
    overdue_count integer NOT NULL,
    CONSTRAINT sv_local_raw_retention_health_deleted_count_check CHECK ((deleted_count >= 0)),
    CONSTRAINT sv_local_raw_retention_health_overdue_count_check CHECK ((overdue_count >= 0))
);


--
-- Name: sv_local_report_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_report_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    report_version_id uuid NOT NULL,
    recipient_identity text NOT NULL,
    channel text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    acknowledged_at timestamp with time zone,
    actor text NOT NULL,
    status text NOT NULL,
    CONSTRAINT sv_local_report_deliveries_actor_check CHECK ((length(btrim(actor)) > 0)),
    CONSTRAINT sv_local_report_deliveries_channel_check CHECK ((channel = 'MANUAL_SECURE_LINK'::text)),
    CONSTRAINT sv_local_report_deliveries_check CHECK ((((status = 'ACKNOWLEDGED'::text) AND (acknowledged_at IS NOT NULL) AND (acknowledged_at >= sent_at)) OR ((status = ANY (ARRAY['SENT'::text, 'FAILED'::text])) AND (acknowledged_at IS NULL)))),
    CONSTRAINT sv_local_report_deliveries_recipient_identity_check CHECK ((length(btrim(recipient_identity)) > 0)),
    CONSTRAINT sv_local_report_deliveries_status_check CHECK ((status = ANY (ARRAY['SENT'::text, 'ACKNOWLEDGED'::text, 'FAILED'::text])))
);


--
-- Name: sv_local_report_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_report_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    local_cycle_id uuid NOT NULL,
    version integer NOT NULL,
    content_json jsonb NOT NULL,
    content_canonical text NOT NULL,
    content_sha256 text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    actor text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    revoked_at timestamp with time zone,
    CONSTRAINT sv_local_report_versions_actor_check CHECK ((length(btrim(actor)) > 0)),
    CONSTRAINT sv_local_report_versions_check CHECK (((content_json = (content_canonical)::jsonb) AND (content_sha256 = ('sha256:'::text || encode(sha256(convert_to(content_canonical, 'UTF8'::name)), 'hex'::text))))),
    CONSTRAINT sv_local_report_versions_check1 CHECK ((((status = 'DRAFT'::text) AND (published_at IS NULL) AND (revoked_at IS NULL)) OR ((status = 'PUBLISHED'::text) AND (published_at IS NOT NULL) AND (revoked_at IS NULL)) OR ((status = 'REVOKED'::text) AND (published_at IS NOT NULL) AND (revoked_at IS NOT NULL) AND (revoked_at >= published_at)))),
    CONSTRAINT sv_local_report_versions_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'PUBLISHED'::text, 'REVOKED'::text]))),
    CONSTRAINT sv_local_report_versions_version_check CHECK ((version > 0))
);


--
-- Name: sv_local_scan_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_scan_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    measurement_cycle_id uuid NOT NULL,
    domain_id text DEFAULT 'LOCAL_MAPS'::text NOT NULL,
    configuration_lock_id uuid NOT NULL,
    location_id uuid NOT NULL,
    grid_definition_id uuid NOT NULL,
    provider text NOT NULL,
    repeats integer NOT NULL,
    capture_depth integer NOT NULL,
    expected_observations integer NOT NULL,
    created_observations integer DEFAULT 0 NOT NULL,
    worst_case_cost_usd numeric(12,6) NOT NULL,
    cost_snapshot jsonb NOT NULL,
    status text DEFAULT 'CREATED'::text NOT NULL,
    emergency_stopped_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    execution_mode text DEFAULT 'LEGACY_SOURCE_ONLY'::text NOT NULL,
    approved_canary_review_id uuid,
    provider_contract_digest text,
    CONSTRAINT sv_local_scan_cycles_cardinality_check CHECK (((expected_observations > 0) AND (created_observations >= 0) AND (created_observations <= expected_observations))),
    CONSTRAINT sv_local_scan_cycles_domain_check CHECK ((domain_id = 'LOCAL_MAPS'::text)),
    CONSTRAINT sv_local_scan_cycles_execution_mode_check CHECK ((execution_mode = ANY (ARRAY['LEGACY_SOURCE_ONLY'::text, 'CANARY'::text, 'PILOT'::text]))),
    CONSTRAINT sv_local_scan_cycles_provider_digest_check CHECK (((execution_mode = 'LEGACY_SOURCE_ONLY'::text) OR ((provider_contract_digest ~ '^sha256:[a-f0-9]{64}$'::text) IS TRUE))),
    CONSTRAINT sv_local_scan_cycles_shape_check CHECK (((repeats > 0) AND (capture_depth >= 0) AND (worst_case_cost_usd >= (0)::numeric))),
    CONSTRAINT sv_local_scan_cycles_status_check CHECK ((status = ANY (ARRAY['CREATED'::text, 'PREFLIGHT_BLOCKED'::text, 'BUDGET_BLOCKED'::text, 'APPROVED'::text, 'CANARY_RUNNING'::text, 'CANARY_REVIEW'::text, 'QUEUED'::text, 'RUNNING'::text, 'PARTIAL_FAILURE'::text, 'PROVIDER_BLOCKED'::text, 'UNKNOWN_RECONCILIATION'::text, 'STOPPED'::text, 'CARDINALITY_INCIDENT'::text, 'QC_REQUIRED'::text, 'READY'::text, 'COMPLETED'::text, 'FAILED'::text])))
);


--
-- Name: sv_local_visibility_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_visibility_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid NOT NULL,
    keyword_id uuid NOT NULL,
    formula_version text NOT NULL,
    top3_coverage numeric(9,8),
    top10_coverage numeric(9,8),
    top20_coverage numeric(9,8),
    outside_top20 numeric(9,8),
    average_rank numeric(12,6),
    found_share numeric(9,8),
    share_of_local_voice numeric(9,8),
    competitor_comparison jsonb DEFAULT '{}'::jsonb NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_visibility_metrics_ratio_check CHECK ((((top3_coverage IS NULL) OR ((top3_coverage >= (0)::numeric) AND (top3_coverage <= (1)::numeric))) AND ((top10_coverage IS NULL) OR ((top10_coverage >= (0)::numeric) AND (top10_coverage <= (1)::numeric))) AND ((top20_coverage IS NULL) OR ((top20_coverage >= (0)::numeric) AND (top20_coverage <= (1)::numeric))) AND ((outside_top20 IS NULL) OR ((outside_top20 >= (0)::numeric) AND (outside_top20 <= (1)::numeric))) AND ((found_share IS NULL) OR ((found_share >= (0)::numeric) AND (found_share <= (1)::numeric))) AND ((share_of_local_voice IS NULL) OR ((share_of_local_voice >= (0)::numeric) AND (share_of_local_voice <= (1)::numeric))) AND ((average_rank IS NULL) OR (average_rank > (0)::numeric))))
);


--
-- Name: sv_measurement_attempt_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_measurement_attempt_results (
    attempt_id uuid NOT NULL,
    organization_id text NOT NULL,
    measurement_cycle_id uuid NOT NULL,
    local_cycle_id uuid NOT NULL,
    configuration_lock_id uuid NOT NULL,
    provider_id text NOT NULL,
    reservation_id uuid NOT NULL,
    execution_key text NOT NULL,
    attempt_index integer NOT NULL,
    result_fingerprint text NOT NULL,
    result_canonical text NOT NULL,
    validated_result jsonb NOT NULL,
    disposition jsonb NOT NULL,
    budget_incident text,
    required_budget_state text NOT NULL,
    provider_task_id text,
    raw_response_reference text,
    raw_response_sha256 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_measurement_attempt_results_budget_check CHECK ((((required_budget_state = ANY (ARRAY['RESERVED'::text, 'SPENT'::text, 'RELEASED'::text])) AND ((budget_incident IS NULL) OR (budget_incident = 'REPORTED_COST_EXCEEDS_RESERVATION'::text))) IS TRUE)),
    CONSTRAINT sv_measurement_attempt_results_disposition_check CHECK ((((jsonb_typeof(disposition) = 'object'::text) AND (disposition ?& ARRAY['attemptStatus'::text, 'observationValidity'::text, 'observationOutcome'::text, 'cycleStatus'::text, 'retryAllowed'::text, 'finalInvalidReason'::text]) AND (((((((disposition - 'attemptStatus'::text) - 'observationValidity'::text) - 'observationOutcome'::text) - 'cycleStatus'::text) - 'retryAllowed'::text) - 'finalInvalidReason'::text) = '{}'::jsonb) AND ((disposition ->> 'attemptStatus'::text) = ANY (ARRAY['SUCCEEDED'::text, 'RETRYABLE_FAILURE'::text, 'TERMINAL_FAILURE'::text, 'UNKNOWN_RECONCILIATION'::text])) AND ((disposition ->> 'observationValidity'::text) = ANY (ARRAY['VALID'::text, 'INVALID'::text, 'UNMEASURED'::text])) AND ((disposition ->> 'observationOutcome'::text) = ANY (ARRAY['FOUND'::text, 'ABSENT_WITHIN_DEPTH'::text, 'RETRY_PENDING'::text, 'PROVIDER_ERROR'::text, 'PROVIDER_BLOCKED'::text, 'PREFLIGHT_BLOCKED'::text, 'UNKNOWN_RECONCILIATION'::text])) AND ((disposition ->> 'cycleStatus'::text) = ANY (ARRAY['RUNNING'::text, 'PARTIAL_FAILURE'::text, 'PROVIDER_BLOCKED'::text, 'PREFLIGHT_BLOCKED'::text, 'STOPPED'::text])) AND (jsonb_typeof((disposition -> 'retryAllowed'::text)) = 'boolean'::text) AND (jsonb_typeof((disposition -> 'finalInvalidReason'::text)) = ANY (ARRAY['string'::text, 'null'::text]))) IS TRUE)),
    CONSTRAINT sv_measurement_attempt_results_fingerprint_check CHECK ((((result_fingerprint = ('sha256:'::text || encode(sha256(convert_to(result_canonical, 'UTF8'::name)), 'hex'::text))) AND (validated_result = (result_canonical)::jsonb)) IS TRUE)),
    CONSTRAINT sv_measurement_attempt_results_identity_check CHECK ((((jsonb_typeof(validated_result) = 'object'::text) AND (validated_result ?& ARRAY['schemaVersion'::text, 'kind'::text, 'mode'::text, 'canonicalizationVersion'::text, 'storageClass'::text, 'organizationId'::text, 'measurementCycleId'::text, 'localCycleId'::text, 'configurationLockId'::text, 'attemptId'::text, 'reservationId'::text, 'executionKey'::text, 'attemptIndex'::text, 'lockSnapshotCanonical'::text, 'requestSnapshotCanonical'::text, 'provider'::text, 'externalProviderCalls'::text, 'completedAt'::text, 'event'::text, 'targetRank'::text, 'evidenceEligible'::text, 'provenance'::text, 'cost'::text]) AND ((validated_result ->> 'schemaVersion'::text) = '1'::text) AND ((validated_result ->> 'canonicalizationVersion'::text) = 'canonical-json-code-unit-v1'::text) AND ((validated_result ->> 'kind'::text) = 'LOCAL_MAPS_LIVE_PROVIDER_RESULT'::text) AND ((validated_result ->> 'mode'::text) = 'LIVE_PROVIDER'::text) AND ((validated_result ->> 'storageClass'::text) = 'LIVE_ATTEMPT'::text) AND ((validated_result ->> 'organizationId'::text) = organization_id) AND ((validated_result ->> 'measurementCycleId'::text) = (measurement_cycle_id)::text) AND ((validated_result ->> 'localCycleId'::text) = (local_cycle_id)::text) AND ((validated_result ->> 'configurationLockId'::text) = (configuration_lock_id)::text) AND ((validated_result ->> 'attemptId'::text) = (attempt_id)::text) AND ((validated_result ->> 'reservationId'::text) = (reservation_id)::text) AND ((validated_result ->> 'executionKey'::text) = execution_key) AND ((validated_result ->> 'attemptIndex'::text) = (attempt_index)::text) AND ((validated_result #>> '{provider,id}'::text[]) = provider_id) AND ((validated_result ->> 'externalProviderCalls'::text) = '1'::text)) IS TRUE)),
    CONSTRAINT sv_measurement_attempt_results_live_shape_check CHECK (((((((((((((((((((((((((((validated_result - 'schemaVersion'::text) - 'kind'::text) - 'mode'::text) - 'canonicalizationVersion'::text) - 'storageClass'::text) - 'organizationId'::text) - 'measurementCycleId'::text) - 'localCycleId'::text) - 'configurationLockId'::text) - 'attemptId'::text) - 'reservationId'::text) - 'executionKey'::text) - 'attemptIndex'::text) - 'lockSnapshotCanonical'::text) - 'requestSnapshotCanonical'::text) - 'provider'::text) - 'externalProviderCalls'::text) - 'completedAt'::text) - 'event'::text) - 'targetRank'::text) - 'evidenceEligible'::text) - 'provenance'::text) - 'cost'::text) = '{}'::jsonb) AND (jsonb_typeof((validated_result -> 'schemaVersion'::text)) = 'number'::text) AND (jsonb_typeof((validated_result -> 'kind'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'mode'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'canonicalizationVersion'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'storageClass'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'organizationId'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'measurementCycleId'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'localCycleId'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'configurationLockId'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'attemptId'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'reservationId'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'executionKey'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'attemptIndex'::text)) = 'number'::text) AND (jsonb_typeof((validated_result -> 'lockSnapshotCanonical'::text)) = 'string'::text) AND (length((validated_result ->> 'lockSnapshotCanonical'::text)) > 0) AND (jsonb_typeof((validated_result -> 'requestSnapshotCanonical'::text)) = 'string'::text) AND (length((validated_result ->> 'requestSnapshotCanonical'::text)) > 0) AND (jsonb_typeof((validated_result -> 'externalProviderCalls'::text)) = 'number'::text) AND (jsonb_typeof((validated_result -> 'completedAt'::text)) = 'string'::text) AND (jsonb_typeof((validated_result -> 'evidenceEligible'::text)) = 'boolean'::text) AND (jsonb_typeof((validated_result -> 'provider'::text)) = 'object'::text) AND ((validated_result -> 'provider'::text) ?& ARRAY['id'::text, 'version'::text, 'providerTaskId'::text]) AND (((((validated_result -> 'provider'::text) - 'id'::text) - 'version'::text) - 'providerTaskId'::text) = '{}'::jsonb) AND (jsonb_typeof((validated_result #> '{provider,id}'::text[])) = 'string'::text) AND (length((validated_result #>> '{provider,id}'::text[])) > 0) AND ((validated_result #>> '{provider,id}'::text[]) !~ '[[:space:]]'::text) AND ((validated_result #>> '{provider,id}'::text[]) !~* '^(stub|noop)(-|$)'::text) AND (jsonb_typeof((validated_result #> '{provider,version}'::text[])) = 'string'::text) AND (length((validated_result #>> '{provider,version}'::text[])) > 0) AND ((validated_result #>> '{provider,version}'::text[]) !~ '[[:space:]]'::text) AND (jsonb_typeof((validated_result #> '{provider,providerTaskId}'::text[])) = ANY (ARRAY['string'::text, 'null'::text])) AND (jsonb_typeof((validated_result -> 'event'::text)) = 'object'::text) AND (jsonb_typeof((validated_result -> 'provenance'::text)) = 'object'::text) AND ((validated_result -> 'provenance'::text) ?& ARRAY['evidenceKind'::text, 'checkReference'::text, 'rawResponseReference'::text, 'rawResponseSha256'::text, 'providerObservedAt'::text]) AND (((((((validated_result -> 'provenance'::text) - 'evidenceKind'::text) - 'checkReference'::text) - 'rawResponseReference'::text) - 'rawResponseSha256'::text) - 'providerObservedAt'::text) = '{}'::jsonb) AND ((validated_result #>> '{provenance,evidenceKind}'::text[]) = 'MAPS_SERP_PROVIDER'::text) AND ((jsonb_typeof((validated_result #> '{provenance,checkReference}'::text[])) = 'string'::text) OR (jsonb_typeof((validated_result #> '{provenance,checkReference}'::text[])) = 'null'::text)) AND ((jsonb_typeof((validated_result #> '{provenance,checkReference}'::text[])) = 'null'::text) OR ((length((validated_result #>> '{provenance,checkReference}'::text[])) > 0) AND ((validated_result #>> '{provenance,checkReference}'::text[]) !~ '[[:space:]]'::text) AND ((validated_result #>> '{provenance,checkReference}'::text[]) !~* '^(stub-local-maps:|stub:)'::text))) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseReference}'::text[])) = ANY (ARRAY['string'::text, 'null'::text])) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseSha256}'::text[])) = ANY (ARRAY['string'::text, 'null'::text])) AND (jsonb_typeof((validated_result #> '{provenance,providerObservedAt}'::text[])) = ANY (ARRAY['string'::text, 'null'::text])) AND (jsonb_typeof((validated_result -> 'cost'::text)) = 'object'::text) AND ((validated_result -> 'cost'::text) ?& ARRAY['status'::text, 'currency'::text, 'amountUsd'::text, 'basis'::text]) AND ((((((validated_result -> 'cost'::text) - 'status'::text) - 'currency'::text) - 'amountUsd'::text) - 'basis'::text) = '{}'::jsonb) AND (jsonb_typeof((validated_result #> '{cost,status}'::text[])) = 'string'::text) AND ((validated_result #>> '{cost,currency}'::text[]) = 'USD'::text) AND ((((validated_result -> 'event'::text) = '{"kind": "FOUND"}'::jsonb) AND (jsonb_typeof((validated_result -> 'targetRank'::text)) = 'number'::text) AND (mod(((validated_result ->> 'targetRank'::text))::numeric, (1)::numeric) = (0)::numeric) AND (((validated_result ->> 'targetRank'::text))::numeric >= (1)::numeric) AND (((validated_result ->> 'targetRank'::text))::numeric <= (20)::numeric) AND ((validated_result ->> 'evidenceEligible'::text) = 'true'::text) AND ((validated_result #>> '{cost,status}'::text[]) = 'KNOWN'::text) AND (jsonb_typeof((validated_result #> '{cost,amountUsd}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{cost,basis}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,checkReference}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseReference}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseSha256}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,providerObservedAt}'::text[])) = 'string'::text)) OR (((validated_result -> 'event'::text) = '{"kind": "ABSENT_WITHIN_DEPTH"}'::jsonb) AND (jsonb_typeof((validated_result -> 'targetRank'::text)) = 'null'::text) AND ((validated_result ->> 'evidenceEligible'::text) = 'true'::text) AND ((validated_result #>> '{cost,status}'::text[]) = 'KNOWN'::text) AND (jsonb_typeof((validated_result #> '{cost,amountUsd}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{cost,basis}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,checkReference}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseReference}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseSha256}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,providerObservedAt}'::text[])) = 'string'::text)) OR (((((validated_result #>> '{event,kind}'::text[]) = 'RETRYABLE_FAILURE'::text) AND ((((validated_result -> 'event'::text) - 'kind'::text) - 'reason'::text) = '{}'::jsonb) AND ((validated_result #>> '{event,reason}'::text[]) = ANY (ARRAY['EMPTY_RESPONSE'::text, 'TRUNCATED_RESPONSE'::text, 'TIMEOUT'::text, 'PROVIDER_5XX'::text, 'RATE_LIMITED'::text, 'MALFORMED_RESPONSE'::text]))) OR ((validated_result -> 'event'::text) = '{"kind": "PROVIDER_AUTH_FAILURE"}'::jsonb)) AND (jsonb_typeof((validated_result -> 'targetRank'::text)) = 'null'::text) AND ((validated_result ->> 'evidenceEligible'::text) = 'false'::text) AND ((validated_result #>> '{cost,status}'::text[]) = 'KNOWN'::text) AND (jsonb_typeof((validated_result #> '{cost,amountUsd}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{cost,basis}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,checkReference}'::text[])) = ANY (ARRAY['string'::text, 'null'::text])) AND (((jsonb_typeof((validated_result #> '{provenance,rawResponseReference}'::text[])) = 'null'::text) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseSha256}'::text[])) = 'null'::text) AND (jsonb_typeof((validated_result #> '{provenance,providerObservedAt}'::text[])) = 'null'::text)) OR ((jsonb_typeof((validated_result #> '{provenance,rawResponseReference}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseSha256}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,providerObservedAt}'::text[])) = 'string'::text)))) OR (((validated_result -> 'event'::text) = '{"kind": "OUTCOME_UNKNOWN"}'::jsonb) AND (jsonb_typeof((validated_result -> 'targetRank'::text)) = 'null'::text) AND ((validated_result ->> 'evidenceEligible'::text) = 'false'::text) AND ((validated_result #>> '{cost,status}'::text[]) = 'UNKNOWN'::text) AND (jsonb_typeof((validated_result #> '{cost,amountUsd}'::text[])) = 'null'::text) AND (jsonb_typeof((validated_result #> '{cost,basis}'::text[])) = 'null'::text) AND (jsonb_typeof((validated_result #> '{provenance,checkReference}'::text[])) = ANY (ARRAY['string'::text, 'null'::text])) AND (((jsonb_typeof((validated_result #> '{provenance,rawResponseReference}'::text[])) = 'null'::text) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseSha256}'::text[])) = 'null'::text) AND (jsonb_typeof((validated_result #> '{provenance,providerObservedAt}'::text[])) = 'null'::text)) OR ((jsonb_typeof((validated_result #> '{provenance,rawResponseReference}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,rawResponseSha256}'::text[])) = 'string'::text) AND (jsonb_typeof((validated_result #> '{provenance,providerObservedAt}'::text[])) = 'string'::text)))))) IS TRUE)),
    CONSTRAINT sv_measurement_attempt_results_provenance_check CHECK (((((provider_task_id IS NULL) OR ((length(provider_task_id) > 0) AND (provider_task_id !~ '[[:space:]]'::text))) AND (((raw_response_reference IS NULL) AND (raw_response_sha256 IS NULL)) OR ((raw_response_reference IS NOT NULL) AND (raw_response_sha256 IS NOT NULL) AND (length(raw_response_reference) > 0) AND (raw_response_reference !~ '[[:space:]]'::text) AND (raw_response_reference !~* '^(stub-local-maps:|stub:)'::text) AND (raw_response_sha256 ~ '^sha256:[a-f0-9]{64}$'::text))) AND (NOT ((validated_result #>> '{provider,providerTaskId}'::text[]) IS DISTINCT FROM provider_task_id)) AND (NOT ((validated_result #>> '{provenance,rawResponseReference}'::text[]) IS DISTINCT FROM raw_response_reference)) AND (NOT ((validated_result #>> '{provenance,rawResponseSha256}'::text[]) IS DISTINCT FROM raw_response_sha256)) AND ((COALESCE(((validated_result ->> 'evidenceEligible'::text))::boolean, false) = false) OR (raw_response_reference IS NOT NULL))) IS TRUE))
);


--
-- Name: sv_measurement_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_measurement_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reservation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    measurement_cycle_id uuid NOT NULL,
    domain_id text NOT NULL,
    observation_ref text NOT NULL,
    point_id uuid NOT NULL,
    item_id uuid NOT NULL,
    executor_id text NOT NULL,
    repeat_index integer NOT NULL,
    base_slot_key text NOT NULL,
    attempt_index integer NOT NULL,
    execution_key text NOT NULL,
    status text DEFAULT 'CLAIMED'::text NOT NULL,
    budget_state text DEFAULT 'RESERVED'::text NOT NULL,
    reserved_cost_usd numeric(12,6) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    surface_cap_usd numeric(12,6) NOT NULL,
    monthly_cap_usd numeric(12,6) NOT NULL,
    price_snapshot_version text NOT NULL,
    spent_cost_usd numeric(12,6) DEFAULT 0 NOT NULL,
    released_cost_usd numeric(12,6) DEFAULT 0 NOT NULL,
    claimed_at timestamp with time zone DEFAULT now() NOT NULL,
    lease_expires_at timestamp with time zone NOT NULL,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    provider_task_id text,
    raw_ref text,
    cost_event_id uuid,
    retry_reason text,
    final_invalid_reason text,
    reconciled_at timestamp with time zone,
    reconciliation_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    row_version bigint DEFAULT 1 NOT NULL,
    submission_token_hash text,
    submitted_candidate_fingerprint text,
    submitted_candidate_canonical text,
    submitted_candidate jsonb,
    unknown_reason text,
    local_observation_id uuid,
    CONSTRAINT sv_measurement_attempts_attempt_index_check CHECK (((attempt_index >= 1) AND (attempt_index <= 3))),
    CONSTRAINT sv_measurement_attempts_budget_check CHECK (((((currency = 'USD'::text) AND (reserved_cost_usd >= (0)::numeric) AND (reserved_cost_usd <= surface_cap_usd) AND (reserved_cost_usd <= monthly_cap_usd) AND (surface_cap_usd >= (0)::numeric) AND (monthly_cap_usd >= (0)::numeric) AND (spent_cost_usd >= (0)::numeric) AND (released_cost_usd >= (0)::numeric) AND (((status = ANY (ARRAY['CLAIMED'::text, 'SUBMITTED'::text, 'UNKNOWN_RECONCILIATION'::text])) AND (budget_state = 'RESERVED'::text)) OR ((status = ANY (ARRAY['SUCCEEDED'::text, 'RETRYABLE_FAILURE'::text, 'TERMINAL_FAILURE'::text])) AND (budget_state = ANY (ARRAY['SPENT'::text, 'RELEASED'::text]))) OR ((status = 'UNKNOWN_RECONCILIATION'::text) AND (budget_state = ANY (ARRAY['SPENT'::text, 'RELEASED'::text])) AND (reconciled_at IS NOT NULL))) AND (((budget_state = 'RESERVED'::text) AND (spent_cost_usd = (0)::numeric) AND (released_cost_usd = (0)::numeric) AND (cost_event_id IS NULL)) OR ((budget_state = 'SPENT'::text) AND (released_cost_usd = GREATEST((reserved_cost_usd - spent_cost_usd), (0)::numeric)) AND (cost_event_id IS NOT NULL)) OR ((budget_state = 'RELEASED'::text) AND (spent_cost_usd = (0)::numeric) AND (released_cost_usd = reserved_cost_usd) AND (cost_event_id IS NULL)))) OR ((status = 'CANCELLED_NO_CALL'::text) AND (domain_id = 'LOCAL_MAPS'::text) AND (budget_state = 'RELEASED'::text) AND (spent_cost_usd = (0)::numeric) AND (released_cost_usd = reserved_cost_usd) AND (submitted_at IS NULL) AND (submission_token_hash IS NULL) AND (submitted_candidate IS NULL) AND (submitted_candidate_fingerprint IS NULL) AND (submitted_candidate_canonical IS NULL) AND (provider_task_id IS NULL) AND (raw_ref IS NULL) AND (cost_event_id IS NULL) AND (completed_at IS NOT NULL) AND (retry_reason IS NULL) AND (final_invalid_reason IS NULL) AND (unknown_reason IS NULL))) IS TRUE)),
    CONSTRAINT sv_measurement_attempts_domain_check CHECK ((domain_id = ANY (ARRAY['LOCAL_MAPS'::text, 'LOCAL_AI'::text]))),
    CONSTRAINT sv_measurement_attempts_execution_identity_check CHECK (((base_slot_key = ((((((((((domain_id || '|'::text) || (measurement_cycle_id)::text) || '|'::text) || (point_id)::text) || '|'::text) || (item_id)::text) || '|'::text) || executor_id) || '|'::text) || (repeat_index)::text)) AND (execution_key = ((base_slot_key || '|'::text) || (attempt_index)::text)))),
    CONSTRAINT sv_measurement_attempts_input_shape_check CHECK (((repeat_index >= 0) AND (length(observation_ref) > 0) AND (observation_ref !~ '[[:space:]]'::text) AND (length(executor_id) > 0) AND (executor_id !~ '[[:space:]]'::text) AND (POSITION(('|'::text) IN (executor_id)) = 0) AND (length(price_snapshot_version) > 0) AND (price_snapshot_version !~ '[[:space:]]'::text) AND (lease_expires_at > claimed_at))),
    CONSTRAINT sv_measurement_attempts_reason_shape_check CHECK ((((retry_reason IS NULL) OR (retry_reason = ANY (ARRAY['EMPTY_RESPONSE'::text, 'TRUNCATED_RESPONSE'::text, 'TIMEOUT'::text, 'PROVIDER_5XX'::text, 'RATE_LIMITED'::text, 'MALFORMED_RESPONSE'::text]))) AND ((final_invalid_reason IS NULL) OR (final_invalid_reason = ANY (ARRAY['EMPTY_AFTER_3_ATTEMPTS'::text, 'PROVIDER_UNAVAILABLE'::text, 'RATE_LIMIT_EXHAUSTED'::text, 'MALFORMED_AFTER_3_ATTEMPTS'::text]))) AND (((status = 'RETRYABLE_FAILURE'::text) AND (attempt_index < 3) AND (retry_reason IS NOT NULL) AND (final_invalid_reason IS NULL)) OR ((status = 'TERMINAL_FAILURE'::text) AND (attempt_index = 3) AND (((retry_reason = ANY (ARRAY['EMPTY_RESPONSE'::text, 'TRUNCATED_RESPONSE'::text])) AND (final_invalid_reason = 'EMPTY_AFTER_3_ATTEMPTS'::text)) OR ((retry_reason = ANY (ARRAY['TIMEOUT'::text, 'PROVIDER_5XX'::text])) AND (final_invalid_reason = 'PROVIDER_UNAVAILABLE'::text)) OR ((retry_reason = 'RATE_LIMITED'::text) AND (final_invalid_reason = 'RATE_LIMIT_EXHAUSTED'::text)) OR ((retry_reason = 'MALFORMED_RESPONSE'::text) AND (final_invalid_reason = 'MALFORMED_AFTER_3_ATTEMPTS'::text)))) OR ((status = 'TERMINAL_FAILURE'::text) AND (domain_id = 'LOCAL_MAPS'::text) AND (attempt_index = 1) AND (retry_reason IS NOT NULL) AND (final_invalid_reason = 'PROVIDER_UNAVAILABLE'::text)) OR ((status = 'TERMINAL_FAILURE'::text) AND (retry_reason IS NULL) AND (final_invalid_reason IS NULL)) OR ((status <> ALL (ARRAY['RETRYABLE_FAILURE'::text, 'TERMINAL_FAILURE'::text])) AND (retry_reason IS NULL) AND (final_invalid_reason IS NULL))))),
    CONSTRAINT sv_measurement_attempts_reconciliation_check CHECK ((((status = 'UNKNOWN_RECONCILIATION'::text) AND (budget_state = 'RESERVED'::text) AND (reconciled_at IS NULL) AND (reconciliation_ref IS NULL)) OR ((status = 'UNKNOWN_RECONCILIATION'::text) AND (budget_state = ANY (ARRAY['SPENT'::text, 'RELEASED'::text])) AND (reconciled_at IS NOT NULL) AND (reconciled_at >= completed_at) AND (reconciliation_ref ~ '[^[:space:]]'::text)) OR ((status <> 'UNKNOWN_RECONCILIATION'::text) AND (reconciled_at IS NULL) AND (reconciliation_ref IS NULL)))),
    CONSTRAINT sv_measurement_attempts_row_version_check CHECK ((row_version > 0)),
    CONSTRAINT sv_measurement_attempts_state_shape_check CHECK (((((status = 'CLAIMED'::text) AND (submitted_at IS NULL) AND (completed_at IS NULL) AND (provider_task_id IS NULL) AND (raw_ref IS NULL) AND (cost_event_id IS NULL)) OR ((status = 'SUBMITTED'::text) AND (submitted_at IS NOT NULL) AND (submitted_at >= claimed_at) AND (completed_at IS NULL) AND (provider_task_id IS NULL) AND (raw_ref IS NULL) AND (cost_event_id IS NULL)) OR ((status = ANY (ARRAY['SUCCEEDED'::text, 'RETRYABLE_FAILURE'::text, 'TERMINAL_FAILURE'::text, 'UNKNOWN_RECONCILIATION'::text])) AND (submitted_at IS NOT NULL) AND (completed_at IS NOT NULL) AND (submitted_at >= claimed_at) AND (completed_at >= submitted_at)) OR ((status = 'CANCELLED_NO_CALL'::text) AND (domain_id = 'LOCAL_MAPS'::text) AND (budget_state = 'RELEASED'::text) AND (spent_cost_usd = (0)::numeric) AND (released_cost_usd = reserved_cost_usd) AND (submitted_at IS NULL) AND (submission_token_hash IS NULL) AND (submitted_candidate IS NULL) AND (submitted_candidate_fingerprint IS NULL) AND (submitted_candidate_canonical IS NULL) AND (provider_task_id IS NULL) AND (raw_ref IS NULL) AND (cost_event_id IS NULL) AND (completed_at IS NOT NULL) AND (retry_reason IS NULL) AND (final_invalid_reason IS NULL) AND (unknown_reason IS NULL))) IS TRUE)),
    CONSTRAINT sv_measurement_attempts_status_check CHECK ((((status = ANY (ARRAY['CLAIMED'::text, 'SUBMITTED'::text, 'SUCCEEDED'::text, 'RETRYABLE_FAILURE'::text, 'TERMINAL_FAILURE'::text, 'UNKNOWN_RECONCILIATION'::text])) OR ((status = 'CANCELLED_NO_CALL'::text) AND (domain_id = 'LOCAL_MAPS'::text) AND (budget_state = 'RELEASED'::text) AND (spent_cost_usd = (0)::numeric) AND (released_cost_usd = reserved_cost_usd) AND (submitted_at IS NULL) AND (submission_token_hash IS NULL) AND (submitted_candidate IS NULL) AND (submitted_candidate_fingerprint IS NULL) AND (submitted_candidate_canonical IS NULL) AND (provider_task_id IS NULL) AND (raw_ref IS NULL) AND (cost_event_id IS NULL) AND (completed_at IS NOT NULL) AND (retry_reason IS NULL) AND (final_invalid_reason IS NULL) AND (unknown_reason IS NULL))) IS TRUE)),
    CONSTRAINT sv_measurement_attempts_submission_token_check CHECK (((((((status = 'CLAIMED'::text) AND (submission_token_hash IS NULL)) OR ((status <> 'CLAIMED'::text) AND (submission_token_hash IS NOT NULL) AND (submission_token_hash ~ '^sha256:[a-f0-9]{64}$'::text))) IS TRUE) OR ((status = 'CANCELLED_NO_CALL'::text) AND (domain_id = 'LOCAL_MAPS'::text) AND (budget_state = 'RELEASED'::text) AND (spent_cost_usd = (0)::numeric) AND (released_cost_usd = reserved_cost_usd) AND (submitted_at IS NULL) AND (submission_token_hash IS NULL) AND (submitted_candidate IS NULL) AND (submitted_candidate_fingerprint IS NULL) AND (submitted_candidate_canonical IS NULL) AND (provider_task_id IS NULL) AND (raw_ref IS NULL) AND (cost_event_id IS NULL) AND (completed_at IS NOT NULL) AND (retry_reason IS NULL) AND (final_invalid_reason IS NULL) AND (unknown_reason IS NULL))) IS TRUE)),
    CONSTRAINT sv_measurement_attempts_submitted_candidate_check CHECK (((((((status = 'CLAIMED'::text) AND (submitted_candidate_fingerprint IS NULL) AND (submitted_candidate_canonical IS NULL) AND (submitted_candidate IS NULL)) OR ((status <> 'CLAIMED'::text) AND (submitted_candidate_fingerprint IS NOT NULL) AND (submitted_candidate_canonical IS NOT NULL) AND (submitted_candidate IS NOT NULL) AND (submitted_candidate_fingerprint = ('sha256:'::text || encode(sha256(convert_to(submitted_candidate_canonical, 'UTF8'::name)), 'hex'::text))) AND (submitted_candidate = (submitted_candidate_canonical)::jsonb) AND (jsonb_typeof(submitted_candidate) = 'object'::text) AND (submitted_candidate ?& ARRAY['schemaVersion'::text, 'kind'::text, 'mode'::text, 'canonicalizationVersion'::text, 'scope'::text, 'lockSnapshotCanonical'::text, 'requestSnapshotCanonical'::text, 'lock'::text, 'slot'::text, 'keyword'::text, 'providerRequest'::text, 'attempt'::text, 'budgetReservation'::text]) AND ((((((((((((((submitted_candidate - 'schemaVersion'::text) - 'kind'::text) - 'mode'::text) - 'canonicalizationVersion'::text) - 'scope'::text) - 'lockSnapshotCanonical'::text) - 'requestSnapshotCanonical'::text) - 'lock'::text) - 'slot'::text) - 'keyword'::text) - 'providerRequest'::text) - 'attempt'::text) - 'budgetReservation'::text) = '{}'::jsonb) AND ((submitted_candidate ->> 'schemaVersion'::text) = '1'::text) AND ((submitted_candidate ->> 'kind'::text) = 'LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE'::text) AND ((submitted_candidate ->> 'mode'::text) = 'LIVE_PROVIDER'::text) AND ((submitted_candidate ->> 'canonicalizationVersion'::text) = 'canonical-json-code-unit-v1'::text) AND ((submitted_candidate #>> '{scope,organizationId}'::text[]) = organization_id) AND ((submitted_candidate #>> '{scope,measurementCycleId}'::text[]) = (measurement_cycle_id)::text) AND ((submitted_candidate #>> '{scope,domainId}'::text[]) = 'LOCAL_MAPS'::text) AND (domain_id = 'LOCAL_MAPS'::text) AND ((submitted_candidate #>> '{attempt,attemptId}'::text[]) = (id)::text) AND ((submitted_candidate #>> '{attempt,reservationId}'::text[]) = (reservation_id)::text) AND ((submitted_candidate #>> '{attempt,observationRef}'::text[]) = observation_ref) AND ((submitted_candidate #>> '{attempt,baseSlotKey}'::text[]) = base_slot_key) AND ((submitted_candidate #>> '{attempt,executionKey}'::text[]) = execution_key) AND ((submitted_candidate #>> '{attempt,attemptIndex}'::text[]) = (attempt_index)::text) AND ((submitted_candidate #>> '{attempt,statusSnapshot}'::text[]) = 'SUBMITTED'::text) AND (((submitted_candidate #>> '{attempt,claimedAt}'::text[]))::timestamp with time zone = claimed_at) AND (((submitted_candidate #>> '{attempt,submittedAt}'::text[]))::timestamp with time zone = submitted_at) AND (((submitted_candidate #>> '{attempt,leaseExpiresAt}'::text[]))::timestamp with time zone = lease_expires_at) AND ((submitted_candidate #>> '{slot,baseSlotKey}'::text[]) = base_slot_key) AND ((submitted_candidate #>> '{slot,pointId}'::text[]) = (point_id)::text) AND ((submitted_candidate #>> '{slot,keywordId}'::text[]) = (item_id)::text) AND ((submitted_candidate #>> '{keyword,id}'::text[]) = (item_id)::text) AND ((submitted_candidate #>> '{slot,repeatIndex}'::text[]) = (repeat_index)::text) AND ((submitted_candidate #>> '{providerRequest,repeatIndex}'::text[]) = (repeat_index)::text) AND (executor_id !~* '^(stub|noop)(-|$)'::text) AND ((submitted_candidate #>> '{providerRequest,provider,id}'::text[]) = executor_id) AND ((submitted_candidate #>> '{lock,provider,id}'::text[]) = executor_id) AND ((submitted_candidate #>> '{budgetReservation,currency}'::text[]) = currency) AND (((submitted_candidate #>> '{budgetReservation,reservedCostUsd}'::text[]))::numeric(12,6) = reserved_cost_usd) AND (((submitted_candidate #>> '{budgetReservation,surfaceCapUsd}'::text[]))::numeric(12,6) = surface_cap_usd) AND (((submitted_candidate #>> '{budgetReservation,monthlyCapUsd}'::text[]))::numeric(12,6) = monthly_cap_usd) AND ((submitted_candidate #>> '{budgetReservation,priceSnapshotVersion}'::text[]) = price_snapshot_version))) IS TRUE) OR ((status = 'CANCELLED_NO_CALL'::text) AND (domain_id = 'LOCAL_MAPS'::text) AND (budget_state = 'RELEASED'::text) AND (spent_cost_usd = (0)::numeric) AND (released_cost_usd = reserved_cost_usd) AND (submitted_at IS NULL) AND (submission_token_hash IS NULL) AND (submitted_candidate IS NULL) AND (submitted_candidate_fingerprint IS NULL) AND (submitted_candidate_canonical IS NULL) AND (provider_task_id IS NULL) AND (raw_ref IS NULL) AND (cost_event_id IS NULL) AND (completed_at IS NOT NULL) AND (retry_reason IS NULL) AND (final_invalid_reason IS NULL) AND (unknown_reason IS NULL))) IS TRUE)),
    CONSTRAINT sv_measurement_attempts_unknown_reason_check CHECK (((((status = 'UNKNOWN_RECONCILIATION'::text) AND (unknown_reason IS NOT NULL) AND (unknown_reason = ANY (ARRAY['COMMITTED_SNAPSHOT_INVALID'::text, 'PROVIDER_CALL_THROWN'::text, 'PROVIDER_RESULT_INVALID'::text, 'FINALIZE_AMBIGUOUS'::text, 'FINALIZE_POSTCONDITION_MISMATCH'::text, 'ESTIMATED_ZERO_COST_UNRECONCILED'::text, 'PROVIDER_OUTCOME_UNKNOWN'::text]))) OR ((status <> 'UNKNOWN_RECONCILIATION'::text) AND (unknown_reason IS NULL))) IS TRUE))
);


--
-- Name: sv_measurement_cycles_compat; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sv_measurement_cycles_compat WITH (security_invoker='true') AS
 SELECT sv_measurement_cycles.id,
    sv_measurement_cycles.organization_id,
    sv_measurement_cycles.domain_id,
    sv_measurement_cycles.domain_cycle_id,
    sv_measurement_cycles.configuration_lock_id,
    sv_measurement_cycles.status,
    sv_measurement_cycles.created_at,
    sv_measurement_cycles.updated_at
   FROM public.sv_measurement_cycles
  WHERE (sv_measurement_cycles.domain_id <> 'AI'::text)
UNION ALL
 SELECT legacy_cycle.id,
    legacy_cycle.organization_id,
    'AI'::text AS domain_id,
    legacy_cycle.id AS domain_cycle_id,
    legacy_cycle.lock_id AS configuration_lock_id,
    (legacy_cycle.status)::text AS status,
    legacy_cycle.created_at,
    legacy_cycle.updated_at
   FROM public.sv_cycles legacy_cycle;


--
-- Name: sv_measurement_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_measurement_domains (
    domain_id text NOT NULL,
    unit_of_measure text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_observation_evidence_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_observation_evidence_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    observation_id uuid NOT NULL,
    asset_type text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    sha256 text NOT NULL,
    sequence_index integer NOT NULL,
    private_object_reference text CONSTRAINT sv_observation_evidence_asset_private_object_reference_not_null NOT NULL,
    uploaded_by text NOT NULL,
    captured_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_observation_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_observation_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    observation_id uuid NOT NULL,
    raw_mention_text text NOT NULL,
    matched_entity_id uuid,
    mention_role public.sv_mention_role NOT NULL,
    match_status public.sv_match_status NOT NULL,
    match_confidence numeric(5,4),
    explicit_position integer,
    ordering_basis text,
    factual_error boolean DEFAULT false NOT NULL,
    evidence_locator text
);


--
-- Name: sv_order_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_order_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    plan_id text NOT NULL,
    contact_name text NOT NULL,
    contact_channel text NOT NULL,
    comment text,
    promo_code text,
    promo_applied boolean DEFAULT false NOT NULL,
    status text DEFAULT 'NEW'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    quote_id uuid NOT NULL,
    lock_id uuid NOT NULL,
    status public.sv_order_status DEFAULT 'DRAFT'::public.sv_order_status NOT NULL,
    order_cap numeric(12,6) NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_outcome_attribution_windows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_outcome_attribution_windows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    location_id uuid NOT NULL,
    verification_cycle_id uuid NOT NULL,
    action_id uuid NOT NULL,
    baseline_cycle_id uuid NOT NULL,
    verification_measurement_cycle_id uuid CONSTRAINT sv_outcome_attribution_wind_verification_measurement_c_not_null NOT NULL,
    baseline_dataset_id uuid NOT NULL,
    verification_dataset_id uuid NOT NULL,
    baseline_observation_id uuid NOT NULL,
    verification_observation_id uuid CONSTRAINT sv_outcome_attribution_wind_verification_observation_i_not_null NOT NULL,
    metric_key text NOT NULL,
    metric_version integer NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    evidence_ids text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_outcome_attribution_windows_window_check CHECK (((window_end > window_start) AND (baseline_observation_id <> verification_observation_id) AND (cardinality(evidence_ids) > 0)))
);


--
-- Name: sv_outcome_metric_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_outcome_metric_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_key text NOT NULL,
    version integer NOT NULL,
    unit text NOT NULL,
    aggregation text DEFAULT 'SUM'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_outcome_metric_definitions_shape_check CHECK (((version > 0) AND (length(TRIM(BOTH FROM metric_key)) > 0) AND (length(TRIM(BOTH FROM unit)) > 0) AND (aggregation = 'SUM'::text)))
);


--
-- Name: sv_outcome_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_outcome_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    location_id uuid NOT NULL,
    source_id uuid NOT NULL,
    measurement_cycle_id uuid NOT NULL,
    domain_id text DEFAULT 'OUTCOME'::text NOT NULL,
    dataset_id uuid NOT NULL,
    metric_key text NOT NULL,
    metric_version integer NOT NULL,
    value numeric(18,6),
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    evidence_ids text[] NOT NULL,
    captured_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_outcome_observations_domain_check CHECK ((domain_id = 'OUTCOME'::text)),
    CONSTRAINT sv_outcome_observations_period_check CHECK ((period_end > period_start)),
    CONSTRAINT sv_outcome_observations_provenance_check CHECK (((cardinality(evidence_ids) > 0) AND (metric_version > 0) AND (length(TRIM(BOTH FROM metric_key)) > 0))),
    CONSTRAINT sv_outcome_observations_value_check CHECK (((value IS NULL) OR (value <> 'NaN'::numeric)))
);


--
-- Name: sv_outcome_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_outcome_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    location_id uuid NOT NULL,
    access_class text NOT NULL,
    source_reference text NOT NULL,
    evidence_ids text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_outcome_sources_access_class_check CHECK ((access_class = ANY (ARRAY['CONNECTED'::text, 'UPLOADED'::text]))),
    CONSTRAINT sv_outcome_sources_provenance_check CHECK (((length(TRIM(BOTH FROM source_reference)) > 0) AND (cardinality(evidence_ids) > 0)))
);


--
-- Name: sv_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    order_id uuid NOT NULL,
    provider text DEFAULT 'test'::text NOT NULL,
    provider_event_id text NOT NULL,
    status public.sv_payment_status DEFAULT 'PENDING'::public.sv_payment_status NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_pilot_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_pilot_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    lock_id uuid NOT NULL,
    status text DEFAULT 'CREATED'::text NOT NULL,
    expected_observations integer NOT NULL,
    created_observations integer DEFAULT 0 NOT NULL,
    capture_protocol_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_pilot_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_pilot_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code_hash text NOT NULL,
    plan_id text NOT NULL,
    label text,
    expires_at timestamp with time zone NOT NULL,
    redeemed_at timestamp with time zone,
    redeemed_by_organization_id text,
    redeemed_by_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_pilot_invites_code_hash_shape CHECK ((code_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT sv_pilot_invites_plan_id_present CHECK ((length(btrim(plan_id)) > 0)),
    CONSTRAINT sv_pilot_invites_redemption_check CHECK ((((redeemed_at IS NULL) AND (redeemed_by_organization_id IS NULL) AND (redeemed_by_user_id IS NULL)) OR ((redeemed_at IS NOT NULL) AND (length(btrim(redeemed_by_organization_id)) > 0) AND (length(btrim(redeemed_by_user_id)) > 0))))
);


--
-- Name: sv_project_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_project_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    brand_name text NOT NULL,
    primary_domain text NOT NULL,
    public_profiles jsonb DEFAULT '[]'::jsonb NOT NULL,
    competitor_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL,
    scenario_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL,
    confirmed_at timestamp with time zone,
    confirmed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    maps_location jsonb
);


--
-- Name: sv_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    country text NOT NULL,
    region text,
    languages text[] DEFAULT '{}'::text[] NOT NULL,
    status public.sv_project_status DEFAULT 'DRAFT'::public.sv_project_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_prompt_families; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_prompt_families (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    intent_type text NOT NULL,
    source text NOT NULL,
    status public.sv_scenario_status DEFAULT 'PROPOSED'::public.sv_scenario_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_provider_canary_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_provider_canary_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    execution_identity text NOT NULL,
    source text DEFAULT 'GOOGLE_AI_MODE'::text NOT NULL,
    approved_cap_usd numeric(12,6) DEFAULT 0.250000 NOT NULL,
    recurring boolean DEFAULT false NOT NULL,
    automatic_retries integer DEFAULT 0 NOT NULL,
    cost_status text DEFAULT 'UNKNOWN'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid,
    CONSTRAINT sv_provider_canary_executions_contract_check CHECK (((source = 'GOOGLE_AI_MODE'::text) AND (approved_cap_usd = 0.250000) AND (recurring = false) AND (automatic_retries = 0) AND (cost_status = 'UNKNOWN'::text) AND ((length(execution_identity) >= 8) AND (length(execution_identity) <= 128)) AND (execution_identity = btrim(execution_identity))))
);

ALTER TABLE ONLY public.sv_provider_canary_executions FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE sv_provider_canary_executions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sv_provider_canary_executions IS 'Immutable once-ever tenant reservation inserted and committed before the isolated GOOGLE_AI_MODE trigger. UNKNOWN cost_status does not claim actual provider spend.';


--
-- Name: sv_provider_dataset_snapshot_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_provider_dataset_snapshot_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    provider text DEFAULT 'BRIGHT_DATA'::text NOT NULL,
    source text NOT NULL,
    provider_dataset_id text CONSTRAINT sv_provider_dataset_snapshot_event_provider_dataset_id_not_null NOT NULL,
    snapshot_id text NOT NULL,
    phase text NOT NULL,
    provider_status text,
    record_count integer,
    observed_at timestamp with time zone NOT NULL,
    event_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_provider_dataset_snapshot_events_event_hash_check CHECK ((event_hash ~ '^sha256:[a-f0-9]{64}$'::text)),
    CONSTRAINT sv_provider_dataset_snapshot_events_phase_check CHECK ((phase = ANY (ARRAY['TRIGGERED'::text, 'RESUMED'::text, 'PENDING'::text, 'READY'::text, 'DELIVERED'::text, 'TIMEOUT'::text, 'TERMINAL_FAILURE'::text, 'INVALID'::text, 'INTERRUPTED'::text]))),
    CONSTRAINT sv_provider_dataset_snapshot_events_provider_status_check CHECK (((phase <> ALL (ARRAY['PENDING'::text, 'READY'::text, 'TERMINAL_FAILURE'::text])) OR (provider_status IS NOT NULL))),
    CONSTRAINT sv_provider_dataset_snapshot_events_record_count_check CHECK ((((phase = 'DELIVERED'::text) AND (record_count IS NOT NULL) AND (record_count >= 0)) OR ((phase <> 'DELIVERED'::text) AND (record_count IS NULL)))),
    CONSTRAINT sv_provider_dataset_snapshot_events_shape_check CHECK (((provider = btrim(provider)) AND (length(provider) > 0) AND (source = btrim(source)) AND (length(source) > 0) AND (provider_dataset_id = btrim(provider_dataset_id)) AND (length(provider_dataset_id) > 0) AND (snapshot_id = btrim(snapshot_id)) AND (length(snapshot_id) > 0) AND ((provider_status IS NULL) OR ((provider_status = btrim(provider_status)) AND (length(provider_status) > 0)))))
);

ALTER TABLE ONLY public.sv_provider_dataset_snapshot_events FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE sv_provider_dataset_snapshot_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sv_provider_dataset_snapshot_events IS 'Append-only tenant lifecycle metadata for provider dataset snapshots. Raw provider payloads and social user data are forbidden.';


--
-- Name: sv_provider_spend_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_provider_spend_budgets (
    scope text NOT NULL,
    cap_usd numeric(12,6) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_provider_spend_budgets_cap_nonnegative CHECK ((cap_usd >= (0)::numeric))
);


--
-- Name: sv_provider_spend_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_provider_spend_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text NOT NULL,
    organization_id text NOT NULL,
    request_key text NOT NULL,
    estimated_usd numeric(12,6) NOT NULL,
    actual_usd numeric(12,6),
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    settled_at timestamp with time zone,
    CONSTRAINT sv_provider_spend_reservations_estimate_nonnegative CHECK ((estimated_usd >= (0)::numeric)),
    CONSTRAINT sv_provider_spend_reservations_status_check CHECK ((((status = 'RESERVED'::text) AND (actual_usd IS NULL) AND (settled_at IS NULL)) OR ((status = 'SETTLED'::text) AND (actual_usd IS NOT NULL) AND (actual_usd >= (0)::numeric) AND (settled_at IS NOT NULL)) OR ((status = 'RELEASED'::text) AND (actual_usd IS NULL) AND (settled_at IS NOT NULL))))
);


--
-- Name: sv_public_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_public_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    website text NOT NULL,
    status public.sv_scan_status DEFAULT 'PENDING'::public.sv_scan_status NOT NULL,
    result jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: sv_qc_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_qc_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    order_id uuid NOT NULL,
    cycle_id uuid,
    reviewer text NOT NULL,
    reviewed_at timestamp with time zone NOT NULL,
    scope text NOT NULL,
    decision text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    lock_id uuid NOT NULL,
    status public.sv_quote_status DEFAULT 'DRAFT'::public.sv_quote_status NOT NULL,
    price_amount numeric(12,2) NOT NULL,
    currency text NOT NULL,
    expected_runs integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_recommendation_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_recommendation_actions (
    id text NOT NULL,
    organization_id text NOT NULL,
    run_id uuid NOT NULL,
    finding_id text NOT NULL,
    title text NOT NULL,
    action text NOT NULL,
    rationale text NOT NULL,
    evidence_ids text[] NOT NULL,
    priority text NOT NULL,
    effort text NOT NULL,
    confidence text NOT NULL,
    blocked boolean NOT NULL,
    block_reason text
);


--
-- Name: sv_recommendation_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_recommendation_evidence (
    id text NOT NULL,
    organization_id text NOT NULL,
    run_id uuid NOT NULL,
    snapshot_id text NOT NULL,
    kind text NOT NULL,
    access_class text NOT NULL,
    source_ref text NOT NULL,
    captured_at text NOT NULL,
    subject text NOT NULL,
    text text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: sv_recommendation_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_recommendation_findings (
    id text NOT NULL,
    organization_id text NOT NULL,
    run_id uuid NOT NULL,
    category text NOT NULL,
    statement text NOT NULL,
    evidence_ids text[] NOT NULL,
    confidence text NOT NULL,
    confidence_score numeric(5,4) NOT NULL,
    severity text NOT NULL,
    unknown boolean NOT NULL,
    rule_id text NOT NULL
);


--
-- Name: sv_recommendation_manifests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_recommendation_manifests (
    id text NOT NULL,
    run_id uuid NOT NULL,
    organization_id text NOT NULL,
    dataset_id text NOT NULL,
    input_hash text NOT NULL,
    snapshot_ids text[] DEFAULT '{}'::text[] NOT NULL,
    evidence_ids text[] DEFAULT '{}'::text[] NOT NULL,
    rulepack_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_recommendation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_recommendation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    dataset_id text NOT NULL,
    input_hash text NOT NULL,
    rulepack_version text NOT NULL,
    status public.sv_recommendation_run_status DEFAULT 'RUNNING'::public.sv_recommendation_run_status NOT NULL,
    grounding_status text DEFAULT 'PENDING'::text NOT NULL,
    action_plan jsonb,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: sv_recommendation_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_recommendation_tasks (
    id text NOT NULL,
    organization_id text NOT NULL,
    run_id uuid NOT NULL,
    recommendation_id text NOT NULL,
    title text NOT NULL,
    horizon text NOT NULL,
    owner text NOT NULL,
    steps text[] NOT NULL,
    evidence_ids text[] NOT NULL,
    verification_plan text[] NOT NULL
);


--
-- Name: sv_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid NOT NULL,
    finding_id uuid,
    priority text NOT NULL,
    title text NOT NULL,
    action text NOT NULL,
    rationale text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    domain_id text,
    location_id uuid
);


--
-- Name: sv_reputation_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_reputation_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    location_id uuid NOT NULL,
    source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_reputation_sources_source_check CHECK ((length(TRIM(BOTH FROM source)) > 0))
);


--
-- Name: sv_response_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_response_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid NOT NULL,
    run_id uuid NOT NULL,
    entity_type text NOT NULL,
    name text NOT NULL,
    ordinal_position smallint,
    match_method text DEFAULT 'exact_term'::text NOT NULL,
    extractor_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    capture_mode text,
    CONSTRAINT sv_response_mentions_capture_mode_known CHECK (((capture_mode IS NULL) OR (capture_mode = ANY (ARRAY['live_search'::text, 'training_data'::text, 'unknown'::text])))),
    CONSTRAINT sv_response_mentions_ordinal_positive CHECK (((ordinal_position IS NULL) OR (ordinal_position >= 1)))
);


--
-- Name: sv_review_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_review_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid NOT NULL,
    domain_id text DEFAULT 'REPUTATION'::text NOT NULL,
    source_id uuid NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    validity text DEFAULT 'VALID'::text NOT NULL,
    invalid_reason text,
    rating_average numeric(4,3),
    review_count integer,
    new_reviews integer,
    attempt_count integer DEFAULT 1 NOT NULL,
    raw_reference text,
    captured_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_review_snapshots_domain_check CHECK ((domain_id = 'REPUTATION'::text)),
    CONSTRAINT sv_review_snapshots_invalid_reason_check CHECK ((((validity = 'VALID'::text) AND (invalid_reason IS NULL)) OR ((validity <> 'VALID'::text) AND (invalid_reason IS NOT NULL)))),
    CONSTRAINT sv_review_snapshots_metric_check CHECK ((((rating_average IS NULL) OR ((rating_average >= (0)::numeric) AND (rating_average <= (5)::numeric))) AND ((review_count IS NULL) OR (review_count >= 0)) AND ((new_reviews IS NULL) OR (new_reviews >= 0)))),
    CONSTRAINT sv_review_snapshots_period_check CHECK ((period_end > period_start)),
    CONSTRAINT sv_review_snapshots_retry_check CHECK ((attempt_count > 0)),
    CONSTRAINT sv_review_snapshots_validity_check CHECK ((validity = ANY (ARRAY['VALID'::text, 'INVALID'::text, 'UNMEASURED'::text])))
);


--
-- Name: sv_review_topic_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_review_topic_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    snapshot_id uuid NOT NULL,
    topic text NOT NULL,
    sentiment text NOT NULL,
    analysis_method_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_review_topic_observations_analysis_method_check CHECK (((length(TRIM(BOTH FROM topic)) > 0) AND (length(TRIM(BOTH FROM sentiment)) > 0) AND (length(TRIM(BOTH FROM analysis_method_version)) > 0)))
);


--
-- Name: sv_review_velocity_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_review_velocity_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    snapshot_id uuid NOT NULL,
    source_id uuid NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    formula_version text NOT NULL,
    velocity_per_30_days numeric(12,6),
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_review_velocity_metrics_period_check CHECK ((period_end > period_start)),
    CONSTRAINT sv_review_velocity_metrics_value_check CHECK (((velocity_per_30_days IS NULL) OR (velocity_per_30_days >= (0)::numeric)))
);


--
-- Name: sv_run_permits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_run_permits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid NOT NULL,
    dispatch_key text NOT NULL,
    channel text NOT NULL,
    scenario_id text NOT NULL,
    status text DEFAULT 'issued'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    system_id text,
    CONSTRAINT sv_run_permits_status_check CHECK ((status = ANY (ARRAY['issued'::text, 'consumed'::text, 'revoked'::text, 'cancelled'::text])))
);


--
-- Name: sv_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid NOT NULL,
    permit_id uuid NOT NULL,
    dispatch_key text NOT NULL,
    channel text NOT NULL,
    scenario_id text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    raw_response_reference text,
    canonical_payload jsonb,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    validity text,
    invalid_reason text,
    cost_usd numeric(12,6),
    cost_basis text,
    token_input integer,
    token_output integer,
    system text,
    model text,
    language text,
    region text,
    mention boolean,
    "position" smallint,
    owned_citation boolean,
    citations jsonb,
    competitors jsonb,
    factual_errors jsonb,
    system_id text,
    extractor_version text,
    capture_mode text,
    CONSTRAINT sv_runs_capture_mode_known CHECK (((capture_mode IS NULL) OR (capture_mode = ANY (ARRAY['live_search'::text, 'training_data'::text, 'unknown'::text]))))
);


--
-- Name: sv_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    family_id uuid NOT NULL,
    text text NOT NULL,
    language text NOT NULL,
    status public.sv_scenario_status DEFAULT 'PROPOSED'::public.sv_scenario_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sv_search_queries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_search_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    query_text text NOT NULL,
    normalized_text text NOT NULL,
    engine text NOT NULL,
    region text NOT NULL,
    device text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_search_queries_text_check CHECK (((length(TRIM(BOTH FROM query_text)) > 0) AND (length(TRIM(BOTH FROM normalized_text)) > 0)))
);


--
-- Name: sv_search_rank_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_search_rank_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    cycle_id uuid NOT NULL,
    domain_id text DEFAULT 'SEARCH'::text NOT NULL,
    query_id uuid NOT NULL,
    engine text NOT NULL,
    region text NOT NULL,
    device text NOT NULL,
    repeat_index integer NOT NULL,
    validity text NOT NULL,
    invalid_reason text,
    capture_depth integer NOT NULL,
    target_rank integer,
    attempt_count integer DEFAULT 1 NOT NULL,
    raw_reference text,
    captured_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_search_rank_observations_domain_check CHECK ((domain_id = 'SEARCH'::text)),
    CONSTRAINT sv_search_rank_observations_invalid_reason_check CHECK ((((validity = 'VALID'::text) AND (invalid_reason IS NULL)) OR ((validity <> 'VALID'::text) AND (invalid_reason IS NOT NULL)))),
    CONSTRAINT sv_search_rank_observations_rank_check CHECK (((capture_depth >= 0) AND ((target_rank IS NULL) OR ((target_rank > 0) AND (target_rank <= capture_depth))))),
    CONSTRAINT sv_search_rank_observations_retry_check CHECK (((repeat_index >= 0) AND (attempt_count > 0))),
    CONSTRAINT sv_search_rank_observations_validity_check CHECK ((validity = ANY (ARRAY['VALID'::text, 'INVALID'::text, 'UNMEASURED'::text])))
);


--
-- Name: sv_simulation_bootstrap_nonces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_simulation_bootstrap_nonces (
    nonce text NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_simulation_bootstrap_nonces_shape_check CHECK ((nonce ~ '^[a-f0-9]{32,128}$'::text))
);


--
-- Name: sv_simulation_connect_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_simulation_connect_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_ref text NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    nonce text NOT NULL,
    environment text DEFAULT 'staging'::text NOT NULL,
    consumed_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_simulation_connect_tokens_environment_check CHECK ((environment = 'staging'::text)),
    CONSTRAINT sv_simulation_connect_tokens_expiry_check CHECK ((expires_at > created_at)),
    CONSTRAINT sv_simulation_connect_tokens_hash_check CHECK ((token_hash ~ '^[a-f0-9]{64}$'::text))
);

ALTER TABLE ONLY public.sv_simulation_connect_tokens FORCE ROW LEVEL SECURITY;


--
-- Name: sv_simulation_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_simulation_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_ref text NOT NULL,
    report_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    attempts_made integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone,
    delivered_at timestamp with time zone,
    last_error text,
    environment text DEFAULT 'staging'::text NOT NULL,
    mode text DEFAULT 'test'::text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    CONSTRAINT sv_simulation_deliveries_attempt_cap_check CHECK (((attempts_made >= 0) AND (attempts_made <= 5))),
    CONSTRAINT sv_simulation_deliveries_claimed_check CHECK (((status <> 'SENDING'::text) OR (claimed_at IS NOT NULL))),
    CONSTRAINT sv_simulation_deliveries_delivered_check CHECK (((status = 'DELIVERED'::text) = (delivered_at IS NOT NULL))),
    CONSTRAINT sv_simulation_deliveries_environment_check CHECK ((environment = 'staging'::text)),
    CONSTRAINT sv_simulation_deliveries_mode_check CHECK ((mode = 'test'::text)),
    CONSTRAINT sv_simulation_deliveries_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'SENDING'::text, 'DELIVERED'::text, 'RETRY_SCHEDULED'::text, 'FAILED'::text, 'UNBOUND'::text])))
);

ALTER TABLE ONLY public.sv_simulation_deliveries FORCE ROW LEVEL SECURITY;


--
-- Name: sv_simulation_delivery_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_simulation_delivery_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    delivery_id uuid NOT NULL,
    attempt integer NOT NULL,
    outcome text NOT NULL,
    detail text,
    correlation_id text NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_simulation_delivery_attempts_outcome_check CHECK ((outcome = ANY (ARRAY['SUCCESS'::text, 'TEMPORARY_FAILURE'::text, 'RECIPIENT_GONE'::text]))),
    CONSTRAINT sv_simulation_delivery_attempts_range_check CHECK (((attempt >= 1) AND (attempt <= 5)))
);

ALTER TABLE ONLY public.sv_simulation_delivery_attempts FORCE ROW LEVEL SECURITY;


--
-- Name: sv_simulation_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_simulation_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_ref text NOT NULL,
    channel text DEFAULT 'telegram'::text NOT NULL,
    chat_id_ciphertext text NOT NULL,
    status text DEFAULT 'BOUND'::text NOT NULL,
    environment text DEFAULT 'staging'::text NOT NULL,
    bound_at timestamp with time zone DEFAULT now() NOT NULL,
    unbound_at timestamp with time zone,
    unbound_reason text,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_simulation_recipients_environment_check CHECK ((environment = 'staging'::text)),
    CONSTRAINT sv_simulation_recipients_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'BOUND'::text, 'UNBOUND'::text]))),
    CONSTRAINT sv_simulation_recipients_unbound_check CHECK (((status = 'UNBOUND'::text) = (unbound_at IS NOT NULL)))
);

ALTER TABLE ONLY public.sv_simulation_recipients FORCE ROW LEVEL SECURITY;


--
-- Name: sv_simulation_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_simulation_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_ref text NOT NULL,
    subscription_id uuid NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    payload jsonb NOT NULL,
    environment text DEFAULT 'staging'::text NOT NULL,
    mode text DEFAULT 'test'::text NOT NULL,
    source_status text DEFAULT 'sample'::text NOT NULL,
    not_a_measurement boolean DEFAULT true NOT NULL,
    provider_calls integer DEFAULT 0 NOT NULL,
    correlation_id text NOT NULL,
    persisted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_simulation_reports_environment_check CHECK ((environment = 'staging'::text)),
    CONSTRAINT sv_simulation_reports_mode_check CHECK ((mode = 'test'::text)),
    CONSTRAINT sv_simulation_reports_not_a_measurement_check CHECK ((not_a_measurement = true)),
    CONSTRAINT sv_simulation_reports_period_check CHECK ((period_end > period_start)),
    CONSTRAINT sv_simulation_reports_provider_calls_check CHECK ((provider_calls = 0)),
    CONSTRAINT sv_simulation_reports_source_status_check CHECK ((source_status = 'sample'::text))
);

ALTER TABLE ONLY public.sv_simulation_reports FORCE ROW LEVEL SECURITY;


--
-- Name: sv_simulation_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_simulation_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    project_ref text NOT NULL,
    customer_ref text NOT NULL,
    plan_id text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    provider text NOT NULL,
    provider_event_id text NOT NULL,
    amount_usd numeric(12,2) NOT NULL,
    currency text NOT NULL,
    environment text DEFAULT 'staging'::text NOT NULL,
    mode text DEFAULT 'test'::text NOT NULL,
    source_status text DEFAULT 'sample'::text NOT NULL,
    not_a_measurement boolean DEFAULT true NOT NULL,
    correlation_id text NOT NULL,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_simulation_subscriptions_currency_check CHECK ((currency = 'USD'::text)),
    CONSTRAINT sv_simulation_subscriptions_environment_check CHECK ((environment = 'staging'::text)),
    CONSTRAINT sv_simulation_subscriptions_mode_check CHECK ((mode = 'test'::text)),
    CONSTRAINT sv_simulation_subscriptions_not_a_measurement_check CHECK ((not_a_measurement = true)),
    CONSTRAINT sv_simulation_subscriptions_source_status_check CHECK ((source_status = 'sample'::text)),
    CONSTRAINT sv_simulation_subscriptions_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'CANCELLED'::text])))
);

ALTER TABLE ONLY public.sv_simulation_subscriptions FORCE ROW LEVEL SECURITY;


--
-- Name: sv_verification_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_verification_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    action_id uuid NOT NULL,
    baseline_cycle_id uuid NOT NULL,
    verification_measurement_cycle_id uuid CONSTRAINT sv_verification_cycles_verification_measurement_cycle__not_null NOT NULL,
    baseline_dataset_id uuid NOT NULL,
    verification_dataset_id uuid NOT NULL,
    attempt integer NOT NULL,
    settle_days integer DEFAULT 14 NOT NULL,
    status public.sv_verification_status DEFAULT 'PLANNED'::public.sv_verification_status NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_verification_cycles_completion_check CHECK ((((status = 'COMPLETED'::public.sv_verification_status) AND (completed_at IS NOT NULL)) OR (status <> 'COMPLETED'::public.sv_verification_status))),
    CONSTRAINT sv_verification_cycles_shape_check CHECK (((attempt > 0) AND (settle_days > 0) AND (baseline_cycle_id <> verification_measurement_cycle_id) AND (baseline_dataset_id <> verification_dataset_id)))
);


--
-- Name: sv_visibility_map_points; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sv_visibility_map_points WITH (security_invoker='true') AS
 SELECT observation.organization_id,
    entity.project_id,
    observation.location_id,
    min(observation.captured_at) OVER (PARTITION BY evidence.dataset_id, observation.location_id) AS period_start,
    max(observation.captured_at) OVER (PARTITION BY evidence.dataset_id, observation.location_id) AS period_end,
    evidence.dataset_id,
    local_cycle.measurement_cycle_id,
    local_cycle.id AS local_cycle_id,
    local_cycle.status AS dataset_status,
    observation.grid_definition_id,
    grid.version AS grid_definition_version,
    observation.grid_point_id,
    point.point_index,
    point.latitude,
    point.longitude,
    observation.id AS observation_id,
    observation.captured_at,
    observation.provider,
    observation.keyword_id,
    keyword.text AS keyword,
    keyword.language AS locale,
    observation.capture_mode AS device_context,
    grid.formula_version,
    observation.repeat_index,
    (observation.validity)::text AS source_validity,
    observation.invalid_reason,
    observation.target_rank,
        CASE
            WHEN ((observation.validity = 'VALID'::public.sv_local_rank_validity) AND (observation.target_rank IS NOT NULL)) THEN 'MEASURED'::text
            WHEN (observation.validity = 'VALID'::public.sv_local_rank_validity) THEN 'MISSING'::text
            WHEN (observation.validity = 'INVALID'::public.sv_local_rank_validity) THEN 'INVALID'::text
            ELSE 'UNKNOWN'::text
        END AS display_status,
    false AS interpolated,
    'LIVE_VIEW'::text AS materialization_kind,
    NULL::timestamp with time zone AS refreshed_at,
    false AS is_stale
   FROM ((((((((public.sv_local_rank_observations observation
     JOIN public.sv_local_scan_cycles local_cycle ON (((local_cycle.id = observation.cycle_id) AND (local_cycle.organization_id = observation.organization_id))))
     JOIN public.sv_evidence_index evidence ON (((evidence.organization_id = observation.organization_id) AND (evidence.domain_id = local_cycle.domain_id) AND (evidence.cycle_id = local_cycle.measurement_cycle_id) AND (evidence.observation_ref = (observation.id)::text))))
     JOIN public.sv_measurement_datasets dataset ON (((dataset.id = evidence.dataset_id) AND (dataset.organization_id = observation.organization_id) AND (dataset.cycle_id = local_cycle.measurement_cycle_id) AND (dataset.immutable = true))))
     JOIN public.sv_grid_definitions grid ON (((grid.id = observation.grid_definition_id) AND (grid.organization_id = observation.organization_id))))
     JOIN public.sv_grid_points point ON (((point.id = observation.grid_point_id) AND (point.grid_id = observation.grid_definition_id) AND (point.organization_id = observation.organization_id))))
     JOIN public.sv_local_keywords keyword ON (((keyword.id = observation.keyword_id) AND (keyword.location_id = observation.location_id) AND (keyword.organization_id = observation.organization_id))))
     JOIN public.sv_business_locations location ON (((location.id = observation.location_id) AND (location.organization_id = observation.organization_id))))
     JOIN public.sv_entities entity ON (((entity.id = location.entity_id) AND (entity.organization_id = observation.organization_id))))
  WHERE (local_cycle.domain_id = 'LOCAL_MAPS'::text);


--
-- Name: sv_visibility_map_datasets; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sv_visibility_map_datasets WITH (security_invoker='true') AS
 SELECT organization_id,
    project_id,
    location_id,
    dataset_id,
    measurement_cycle_id,
    local_cycle_id,
    min(captured_at) AS period_start,
    max(captured_at) AS period_end,
    array_agg(DISTINCT keyword_id ORDER BY keyword_id) AS keyword_ids,
    grid_definition_id,
    grid_definition_version,
    array_agg(DISTINCT provider ORDER BY provider) AS providers,
    array_agg(DISTINCT locale ORDER BY locale) AS locales,
    array_agg(DISTINCT device_context ORDER BY device_context) AS device_contexts,
    array_agg(DISTINCT formula_version ORDER BY formula_version) AS formula_versions,
    dataset_status,
    (count(*))::integer AS observation_count,
    'LIVE_VIEW'::text AS materialization_kind,
    NULL::timestamp with time zone AS refreshed_at,
    false AS is_stale
   FROM public.sv_visibility_map_points point
  GROUP BY organization_id, project_id, location_id, dataset_id, measurement_cycle_id, local_cycle_id, grid_definition_id, grid_definition_version, dataset_status;


--
-- Name: sv_website_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_website_snapshots (
    id text NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    website text NOT NULL,
    content_hash text NOT NULL,
    captured_at timestamp with time zone NOT NULL,
    snapshot jsonb NOT NULL,
    immutable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    brand_id text NOT NULL,
    prompt_id uuid,
    event_type text NOT NULL,
    provider text,
    model text,
    web_search_enabled boolean DEFAULT false NOT NULL,
    units integer DEFAULT 1 NOT NULL,
    estimated_cost_usd numeric(12,6),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    role text,
    banned boolean DEFAULT false,
    ban_reason text,
    ban_expires timestamp without time zone,
    has_report_generator_access boolean DEFAULT false,
    stripe_customer_id text
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: job_common; Type: TABLE ATTACH; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job ATTACH PARTITION pgboss.job_common DEFAULT;


--
-- Name: queue_stats_20260815; Type: TABLE ATTACH; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.queue_stats ATTACH PARTITION pgboss.queue_stats_20260815 FOR VALUES FROM ('2026-08-15 00:00:00+00') TO ('2026-08-16 00:00:00+00');


--
-- Name: queue_stats_20260816; Type: TABLE ATTACH; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.queue_stats ATTACH PARTITION pgboss.queue_stats_20260816 FOR VALUES FROM ('2026-08-16 00:00:00+00') TO ('2026-08-17 00:00:00+00');


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: bam bam_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.bam
    ADD CONSTRAINT bam_pkey PRIMARY KEY (id);


--
-- Name: job job_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job
    ADD CONSTRAINT job_pkey PRIMARY KEY (name, id);


--
-- Name: job_common job_common_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job_common
    ADD CONSTRAINT job_common_pkey PRIMARY KEY (name, id);


--
-- Name: job_dependency job_dependency_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job_dependency
    ADD CONSTRAINT job_dependency_pkey PRIMARY KEY (child_name, child_id, parent_name, parent_id);


--
-- Name: queue queue_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.queue
    ADD CONSTRAINT queue_pkey PRIMARY KEY (name);


--
-- Name: queue_stats queue_stats_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.queue_stats
    ADD CONSTRAINT queue_stats_pkey PRIMARY KEY (id, captured_on);


--
-- Name: queue_stats_20260815 queue_stats_20260815_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.queue_stats_20260815
    ADD CONSTRAINT queue_stats_20260815_pkey PRIMARY KEY (id, captured_on);


--
-- Name: queue_stats_20260816 queue_stats_20260816_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.queue_stats_20260816
    ADD CONSTRAINT queue_stats_20260816_pkey PRIMARY KEY (id, captured_on);


--
-- Name: schedule schedule_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.schedule
    ADD CONSTRAINT schedule_pkey PRIMARY KEY (name, key);


--
-- Name: subscription subscription_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.subscription
    ADD CONSTRAINT subscription_pkey PRIMARY KEY (event, name);


--
-- Name: version version_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.version
    ADD CONSTRAINT version_pkey PRIMARY KEY (version);


--
-- Name: warning warning_pkey; Type: CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.warning
    ADD CONSTRAINT warning_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: brand_opportunities brand_opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_opportunities
    ADD CONSTRAINT brand_opportunities_pkey PRIMARY KEY (id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: citations citations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citations
    ADD CONSTRAINT citations_pkey PRIMARY KEY (id);


--
-- Name: competitors competitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitors
    ADD CONSTRAINT competitors_pkey PRIMARY KEY (id);


--
-- Name: invitation invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation
    ADD CONSTRAINT invitation_pkey PRIMARY KEY (id);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: organization_settings organization_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_settings
    ADD CONSTRAINT organization_settings_pkey PRIMARY KEY (organization_id);


--
-- Name: organization organization_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_slug_unique UNIQUE (slug);


--
-- Name: prompt_run_hourly_aggregates prompt_run_hourly_aggregates_bucket_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_run_hourly_aggregates
    ADD CONSTRAINT prompt_run_hourly_aggregates_bucket_unique UNIQUE NULLS NOT DISTINCT (prompt_id, model, provider, web_search_enabled, hour_bucket);


--
-- Name: prompt_runs prompt_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_runs
    ADD CONSTRAINT prompt_runs_pkey PRIMARY KEY (id);


--
-- Name: prompts prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: secrets secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secrets
    ADD CONSTRAINT secrets_pkey PRIMARY KEY (name);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_unique UNIQUE (token);


--
-- Name: sso_provider sso_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sso_provider
    ADD CONSTRAINT sso_provider_pkey PRIMARY KEY (id);


--
-- Name: sso_provider sso_provider_provider_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sso_provider
    ADD CONSTRAINT sso_provider_provider_id_unique UNIQUE (provider_id);


--
-- Name: subscription subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_pkey PRIMARY KEY (id);


--
-- Name: sv_action_approvals sv_action_approvals_action_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_action_approvals
    ADD CONSTRAINT sv_action_approvals_action_version_unique UNIQUE (action_id, approval_version);


--
-- Name: sv_action_approvals sv_action_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_action_approvals
    ADD CONSTRAINT sv_action_approvals_pkey PRIMARY KEY (id);


--
-- Name: sv_api_idempotency_records sv_api_idempotency_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_api_idempotency_records
    ADD CONSTRAINT sv_api_idempotency_records_pkey PRIMARY KEY (id);


--
-- Name: sv_api_keys sv_api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_api_keys
    ADD CONSTRAINT sv_api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: sv_api_keys sv_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_api_keys
    ADD CONSTRAINT sv_api_keys_pkey PRIMARY KEY (id);


--
-- Name: sv_approved_actions sv_approved_actions_id_organization_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_approved_actions
    ADD CONSTRAINT sv_approved_actions_id_organization_unique UNIQUE (id, organization_id);


--
-- Name: sv_approved_actions sv_approved_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_approved_actions
    ADD CONSTRAINT sv_approved_actions_pkey PRIMARY KEY (id);


--
-- Name: sv_attribution_assessments sv_attribution_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_attribution_assessments
    ADD CONSTRAINT sv_attribution_assessments_pkey PRIMARY KEY (id);


--
-- Name: sv_attribution_assessments sv_attribution_assessments_verification_metric_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_attribution_assessments
    ADD CONSTRAINT sv_attribution_assessments_verification_metric_unique UNIQUE (verification_cycle_id, metric_key, formula_version);


--
-- Name: sv_audit_events sv_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_audit_events
    ADD CONSTRAINT sv_audit_events_pkey PRIMARY KEY (id);


--
-- Name: sv_business_locations sv_business_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_business_locations
    ADD CONSTRAINT sv_business_locations_pkey PRIMARY KEY (id);


--
-- Name: sv_capture_tasks sv_capture_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_capture_tasks
    ADD CONSTRAINT sv_capture_tasks_pkey PRIMARY KEY (id);


--
-- Name: sv_change_event_assets sv_change_event_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_change_event_assets
    ADD CONSTRAINT sv_change_event_assets_pkey PRIMARY KEY (id);


--
-- Name: sv_change_events sv_change_events_id_organization_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_change_events
    ADD CONSTRAINT sv_change_events_id_organization_unique UNIQUE (id, organization_id);


--
-- Name: sv_change_events sv_change_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_change_events
    ADD CONSTRAINT sv_change_events_pkey PRIMARY KEY (id);


--
-- Name: sv_citation_gap_snapshots sv_citation_gap_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_citation_gap_snapshots
    ADD CONSTRAINT sv_citation_gap_snapshots_pkey PRIMARY KEY (id);


--
-- Name: sv_configuration_locks sv_configuration_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_configuration_locks
    ADD CONSTRAINT sv_configuration_locks_pkey PRIMARY KEY (id);


--
-- Name: sv_cost_events sv_cost_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cost_events
    ADD CONSTRAINT sv_cost_events_pkey PRIMARY KEY (id);


--
-- Name: sv_cycles sv_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cycles
    ADD CONSTRAINT sv_cycles_pkey PRIMARY KEY (id);


--
-- Name: sv_entities sv_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_entities
    ADD CONSTRAINT sv_entities_pkey PRIMARY KEY (id);


--
-- Name: sv_evidence_acceptance_receipts sv_evidence_acceptance_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_acceptance_receipts
    ADD CONSTRAINT sv_evidence_acceptance_receipts_pkey PRIMARY KEY (id);


--
-- Name: sv_evidence_index sv_evidence_index_formal_identity_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_formal_identity_unique UNIQUE NULLS NOT DISTINCT (organization_id, project_id, domain_id, cycle_id, dataset_id, source_snapshot_id, observation_ref);


--
-- Name: sv_evidence_index sv_evidence_index_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_pkey PRIMARY KEY (id);


--
-- Name: sv_findings sv_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_findings
    ADD CONSTRAINT sv_findings_pkey PRIMARY KEY (id);


--
-- Name: sv_free_ai_visibility_checks sv_free_ai_visibility_checks_one_per_domain; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_free_ai_visibility_checks
    ADD CONSTRAINT sv_free_ai_visibility_checks_one_per_domain UNIQUE (registrable_domain);


--
-- Name: sv_free_ai_visibility_checks sv_free_ai_visibility_checks_one_per_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_free_ai_visibility_checks
    ADD CONSTRAINT sv_free_ai_visibility_checks_one_per_user UNIQUE (user_id);


--
-- Name: sv_free_ai_visibility_checks sv_free_ai_visibility_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_free_ai_visibility_checks
    ADD CONSTRAINT sv_free_ai_visibility_checks_pkey PRIMARY KEY (id);


--
-- Name: sv_free_ai_visibility_checks sv_free_ai_visibility_checks_reservation_request_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_free_ai_visibility_checks
    ADD CONSTRAINT sv_free_ai_visibility_checks_reservation_request_key_key UNIQUE (reservation_request_key);


--
-- Name: sv_free_auto_dispatch_claims sv_free_auto_dispatch_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_free_auto_dispatch_claims
    ADD CONSTRAINT sv_free_auto_dispatch_claims_pkey PRIMARY KEY (id);


--
-- Name: sv_free_auto_dispatch_claims sv_free_auto_dispatch_claims_request_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_free_auto_dispatch_claims
    ADD CONSTRAINT sv_free_auto_dispatch_claims_request_key UNIQUE (request_id);


--
-- Name: sv_grid_definitions sv_grid_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_grid_definitions
    ADD CONSTRAINT sv_grid_definitions_pkey PRIMARY KEY (id);


--
-- Name: sv_grid_points sv_grid_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_grid_points
    ADD CONSTRAINT sv_grid_points_pkey PRIMARY KEY (id);


--
-- Name: sv_incidents sv_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_incidents
    ADD CONSTRAINT sv_incidents_pkey PRIMARY KEY (id);


--
-- Name: sv_journal_daily_claims sv_journal_daily_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_daily_claims
    ADD CONSTRAINT sv_journal_daily_claims_pkey PRIMARY KEY (id);


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_claim_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_no_spend_reconciliations
    ADD CONSTRAINT sv_journal_no_spend_reconciliations_claim_unique UNIQUE (claim_id);


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_lock_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_no_spend_reconciliations
    ADD CONSTRAINT sv_journal_no_spend_reconciliations_lock_unique UNIQUE (configuration_lock_id);


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_no_spend_reconciliations
    ADD CONSTRAINT sv_journal_no_spend_reconciliations_pkey PRIMARY KEY (reconciliation_id);


--
-- Name: sv_journal_provider_boundaries sv_journal_provider_boundaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_provider_boundaries
    ADD CONSTRAINT sv_journal_provider_boundaries_pkey PRIMARY KEY (id);


--
-- Name: sv_local_ai_cost_events sv_local_ai_cost_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_cost_events
    ADD CONSTRAINT sv_local_ai_cost_events_pkey PRIMARY KEY (id);


--
-- Name: sv_local_ai_cost_events sv_local_ai_cost_events_slot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_cost_events
    ADD CONSTRAINT sv_local_ai_cost_events_slot_id_key UNIQUE (slot_id);


--
-- Name: sv_local_ai_events sv_local_ai_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_events
    ADD CONSTRAINT sv_local_ai_events_pkey PRIMARY KEY (id);


--
-- Name: sv_local_ai_evidence sv_local_ai_evidence_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_evidence
    ADD CONSTRAINT sv_local_ai_evidence_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: sv_local_ai_evidence sv_local_ai_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_evidence
    ADD CONSTRAINT sv_local_ai_evidence_pkey PRIMARY KEY (id);


--
-- Name: sv_local_ai_evidence sv_local_ai_evidence_slot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_evidence
    ADD CONSTRAINT sv_local_ai_evidence_slot_id_key UNIQUE (slot_id);


--
-- Name: sv_local_ai_orders sv_local_ai_orders_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: sv_local_ai_orders sv_local_ai_orders_organization_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_organization_id_idempotency_key_key UNIQUE (organization_id, idempotency_key);


--
-- Name: sv_local_ai_orders sv_local_ai_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_pkey PRIMARY KEY (id);


--
-- Name: sv_local_ai_payments sv_local_ai_payments_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_payments
    ADD CONSTRAINT sv_local_ai_payments_order_id_key UNIQUE (order_id);


--
-- Name: sv_local_ai_payments sv_local_ai_payments_organization_id_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_payments
    ADD CONSTRAINT sv_local_ai_payments_organization_id_event_id_key UNIQUE (organization_id, event_id);


--
-- Name: sv_local_ai_payments sv_local_ai_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_payments
    ADD CONSTRAINT sv_local_ai_payments_pkey PRIMARY KEY (id);


--
-- Name: sv_local_ai_slots sv_local_ai_slots_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: sv_local_ai_slots sv_local_ai_slots_order_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_order_id_ordinal_key UNIQUE (order_id, ordinal);


--
-- Name: sv_local_ai_slots sv_local_ai_slots_order_id_point_id_prompt_id_system_id_rep_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_order_id_point_id_prompt_id_system_id_rep_key UNIQUE (order_id, point_id, prompt_id, system_id, repeat_index);


--
-- Name: sv_local_ai_slots sv_local_ai_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_pkey PRIMARY KEY (id);


--
-- Name: sv_local_canary_reviews sv_local_canary_reviews_organization_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_canary_reviews
    ADD CONSTRAINT sv_local_canary_reviews_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: sv_local_canary_reviews sv_local_canary_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_canary_reviews
    ADD CONSTRAINT sv_local_canary_reviews_pkey PRIMARY KEY (id);


--
-- Name: sv_local_competitor_observations sv_local_competitor_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_competitor_observations
    ADD CONSTRAINT sv_local_competitor_observations_pkey PRIMARY KEY (id);


--
-- Name: sv_local_customer_runs sv_local_customer_runs_order_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_customer_runs
    ADD CONSTRAINT sv_local_customer_runs_order_id_organization_id_key UNIQUE (order_id, organization_id);


--
-- Name: sv_local_customer_runs sv_local_customer_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_customer_runs
    ADD CONSTRAINT sv_local_customer_runs_pkey PRIMARY KEY (order_id);


--
-- Name: sv_local_customer_tasks sv_local_customer_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_customer_tasks
    ADD CONSTRAINT sv_local_customer_tasks_pkey PRIMARY KEY (order_id, query_index, point_index);


--
-- Name: sv_local_dispatch_outbox sv_local_dispatch_outbox_attempt_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_dispatch_outbox
    ADD CONSTRAINT sv_local_dispatch_outbox_attempt_id_key UNIQUE (attempt_id);


--
-- Name: sv_local_dispatch_outbox sv_local_dispatch_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_dispatch_outbox
    ADD CONSTRAINT sv_local_dispatch_outbox_pkey PRIMARY KEY (id);


--
-- Name: sv_local_evidence_acceptances sv_local_evidence_acceptances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_evidence_acceptances
    ADD CONSTRAINT sv_local_evidence_acceptances_pkey PRIMARY KEY (observation_id);


--
-- Name: sv_local_external_audits sv_local_external_audits_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_audits
    ADD CONSTRAINT sv_local_external_audits_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: sv_local_external_audits sv_local_external_audits_organization_id_content_sha256_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_audits
    ADD CONSTRAINT sv_local_external_audits_organization_id_content_sha256_key UNIQUE (organization_id, content_sha256);


--
-- Name: sv_local_external_audits sv_local_external_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_audits
    ADD CONSTRAINT sv_local_external_audits_pkey PRIMARY KEY (id);


--
-- Name: sv_local_external_publications sv_local_external_publications_audit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_publications
    ADD CONSTRAINT sv_local_external_publications_audit_id_key UNIQUE (audit_id);


--
-- Name: sv_local_external_publications sv_local_external_publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_publications
    ADD CONSTRAINT sv_local_external_publications_pkey PRIMARY KEY (organization_id, report_version_id, audit_id);


--
-- Name: sv_local_external_raw_evidence sv_local_external_raw_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_raw_evidence
    ADD CONSTRAINT sv_local_external_raw_evidence_pkey PRIMARY KEY (provider_task_id);


--
-- Name: sv_local_external_tasks sv_local_external_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_tasks
    ADD CONSTRAINT sv_local_external_tasks_pkey PRIMARY KEY (provider_task_id);


--
-- Name: sv_local_keywords sv_local_keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_keywords
    ADD CONSTRAINT sv_local_keywords_pkey PRIMARY KEY (id);


--
-- Name: sv_local_rank_observations sv_local_observation_state_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_observation_state_check CHECK (((((outcome = 'PENDING'::text) AND (validity IS NULL) AND (target_rank IS NULL) AND (captured_at IS NULL) AND (invalid_reason IS NULL) AND (evidence_id IS NULL) AND (evidence_envelope IS NULL) AND (raw_reference IS NULL)) OR ((outcome = 'FOUND'::text) AND (validity = 'VALID'::public.sv_local_rank_validity) AND ((target_rank >= 1) AND (target_rank <= 20)) AND (captured_at IS NOT NULL) AND (invalid_reason IS NULL) AND (evidence_id IS NOT NULL)) OR ((outcome = 'ABSENT_WITHIN_DEPTH'::text) AND (validity = 'VALID'::public.sv_local_rank_validity) AND (target_rank IS NULL) AND (captured_at IS NOT NULL) AND (invalid_reason IS NULL) AND (evidence_id IS NOT NULL)) OR ((outcome = 'INVALID'::text) AND (validity = 'INVALID'::public.sv_local_rank_validity) AND (target_rank IS NULL) AND (captured_at IS NOT NULL) AND (length(btrim(invalid_reason)) > 0)) OR ((outcome = 'UNKNOWN'::text) AND (validity = 'UNMEASURED'::public.sv_local_rank_validity) AND (target_rank IS NULL) AND (captured_at IS NOT NULL) AND (length(btrim(invalid_reason)) > 0)) OR ((outcome = 'BLOCKED'::text) AND (validity = 'UNMEASURED'::public.sv_local_rank_validity) AND (target_rank IS NULL) AND (captured_at IS NULL) AND (length(btrim(invalid_reason)) > 0) AND (evidence_id IS NULL) AND (evidence_envelope IS NULL) AND (raw_reference IS NULL)) OR ((outcome = 'CANCELLED'::text) AND (validity = 'UNMEASURED'::public.sv_local_rank_validity) AND (target_rank IS NULL) AND (captured_at IS NULL) AND (invalid_reason = 'LOCAL_STOPPED'::text) AND (evidence_id IS NULL) AND (evidence_envelope IS NULL) AND (raw_reference IS NULL))) IS TRUE)) NOT VALID;


--
-- Name: sv_local_observations sv_local_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_observations
    ADD CONSTRAINT sv_local_observations_pkey PRIMARY KEY (id);


--
-- Name: sv_local_order_publications sv_local_order_publications_organization_id_order_id_conten_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_order_publications
    ADD CONSTRAINT sv_local_order_publications_organization_id_order_id_conten_key UNIQUE (organization_id, order_id, content_sha256);


--
-- Name: sv_local_order_publications sv_local_order_publications_organization_id_order_id_versio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_order_publications
    ADD CONSTRAINT sv_local_order_publications_organization_id_order_id_versio_key UNIQUE (organization_id, order_id, version);


--
-- Name: sv_local_order_publications sv_local_order_publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_order_publications
    ADD CONSTRAINT sv_local_order_publications_pkey PRIMARY KEY (id);


--
-- Name: sv_local_qc_decisions sv_local_qc_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_qc_decisions
    ADD CONSTRAINT sv_local_qc_decisions_pkey PRIMARY KEY (id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_pkey PRIMARY KEY (id);


--
-- Name: sv_local_raw_evidence sv_local_raw_evidence_organization_id_source_snapshot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_raw_evidence
    ADD CONSTRAINT sv_local_raw_evidence_organization_id_source_snapshot_id_key UNIQUE (organization_id, source_snapshot_id);


--
-- Name: sv_local_raw_evidence sv_local_raw_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_raw_evidence
    ADD CONSTRAINT sv_local_raw_evidence_pkey PRIMARY KEY (id);


--
-- Name: sv_local_raw_retention_health sv_local_raw_retention_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_raw_retention_health
    ADD CONSTRAINT sv_local_raw_retention_health_pkey PRIMARY KEY (organization_id);


--
-- Name: sv_local_report_deliveries sv_local_report_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_report_deliveries
    ADD CONSTRAINT sv_local_report_deliveries_pkey PRIMARY KEY (id);


--
-- Name: sv_local_report_versions sv_local_report_versions_organization_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_report_versions
    ADD CONSTRAINT sv_local_report_versions_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: sv_local_report_versions sv_local_report_versions_organization_id_local_cycle_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_report_versions
    ADD CONSTRAINT sv_local_report_versions_organization_id_local_cycle_id_id_key UNIQUE (organization_id, local_cycle_id, id);


--
-- Name: sv_local_report_versions sv_local_report_versions_organization_id_local_cycle_id_ver_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_report_versions
    ADD CONSTRAINT sv_local_report_versions_organization_id_local_cycle_id_ver_key UNIQUE (organization_id, local_cycle_id, version);


--
-- Name: sv_local_report_versions sv_local_report_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_report_versions
    ADD CONSTRAINT sv_local_report_versions_pkey PRIMARY KEY (id);


--
-- Name: sv_local_scan_cycles sv_local_scan_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_scan_cycles_pkey PRIMARY KEY (id);


--
-- Name: sv_local_visibility_metrics sv_local_visibility_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_visibility_metrics
    ADD CONSTRAINT sv_local_visibility_metrics_pkey PRIMARY KEY (id);


--
-- Name: sv_measurement_attempt_results sv_measurement_attempt_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_attempt_results
    ADD CONSTRAINT sv_measurement_attempt_results_pkey PRIMARY KEY (attempt_id);


--
-- Name: sv_measurement_attempts sv_measurement_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_attempts
    ADD CONSTRAINT sv_measurement_attempts_pkey PRIMARY KEY (id);


--
-- Name: sv_measurement_cycles sv_measurement_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_cycles
    ADD CONSTRAINT sv_measurement_cycles_pkey PRIMARY KEY (id);


--
-- Name: sv_measurement_datasets sv_measurement_datasets_id_cycle_organization_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_datasets
    ADD CONSTRAINT sv_measurement_datasets_id_cycle_organization_unique UNIQUE (id, cycle_id, organization_id);


--
-- Name: sv_measurement_datasets sv_measurement_datasets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_datasets
    ADD CONSTRAINT sv_measurement_datasets_pkey PRIMARY KEY (id);


--
-- Name: sv_measurement_domains sv_measurement_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_domains
    ADD CONSTRAINT sv_measurement_domains_pkey PRIMARY KEY (domain_id);


--
-- Name: sv_observation_evidence_assets sv_observation_evidence_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_observation_evidence_assets
    ADD CONSTRAINT sv_observation_evidence_assets_pkey PRIMARY KEY (id);


--
-- Name: sv_observation_mentions sv_observation_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_observation_mentions
    ADD CONSTRAINT sv_observation_mentions_pkey PRIMARY KEY (id);


--
-- Name: sv_order_requests sv_order_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_order_requests
    ADD CONSTRAINT sv_order_requests_pkey PRIMARY KEY (id);


--
-- Name: sv_orders sv_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_orders
    ADD CONSTRAINT sv_orders_pkey PRIMARY KEY (id);


--
-- Name: sv_outcome_attribution_windows sv_outcome_attribution_windows_assessment_chain_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_attribution_windows
    ADD CONSTRAINT sv_outcome_attribution_windows_assessment_chain_unique UNIQUE (id, organization_id, verification_cycle_id, action_id, baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id, metric_key);


--
-- Name: sv_outcome_attribution_windows sv_outcome_attribution_windows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_attribution_windows
    ADD CONSTRAINT sv_outcome_attribution_windows_pkey PRIMARY KEY (id);


--
-- Name: sv_outcome_attribution_windows sv_outcome_attribution_windows_verification_metric_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_attribution_windows
    ADD CONSTRAINT sv_outcome_attribution_windows_verification_metric_unique UNIQUE (verification_cycle_id, metric_key, metric_version);


--
-- Name: sv_outcome_metric_definitions sv_outcome_metric_definitions_key_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_metric_definitions
    ADD CONSTRAINT sv_outcome_metric_definitions_key_version_unique UNIQUE (metric_key, version);


--
-- Name: sv_outcome_metric_definitions sv_outcome_metric_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_metric_definitions
    ADD CONSTRAINT sv_outcome_metric_definitions_pkey PRIMARY KEY (id);


--
-- Name: sv_outcome_observations sv_outcome_observations_id_scope_metric_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_id_scope_metric_unique UNIQUE (id, organization_id, project_id, location_id, metric_key, metric_version);


--
-- Name: sv_outcome_observations sv_outcome_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_pkey PRIMARY KEY (id);


--
-- Name: sv_outcome_observations sv_outcome_observations_source_metric_period_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_source_metric_period_unique UNIQUE (source_id, metric_key, period_start, period_end);


--
-- Name: sv_outcome_sources sv_outcome_sources_id_scope_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_sources
    ADD CONSTRAINT sv_outcome_sources_id_scope_unique UNIQUE (id, organization_id, project_id, location_id);


--
-- Name: sv_outcome_sources sv_outcome_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_sources
    ADD CONSTRAINT sv_outcome_sources_pkey PRIMARY KEY (id);


--
-- Name: sv_payments sv_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_payments
    ADD CONSTRAINT sv_payments_pkey PRIMARY KEY (id);


--
-- Name: sv_pilot_cycles sv_pilot_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_pilot_cycles
    ADD CONSTRAINT sv_pilot_cycles_pkey PRIMARY KEY (id);


--
-- Name: sv_pilot_invites sv_pilot_invites_code_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_pilot_invites
    ADD CONSTRAINT sv_pilot_invites_code_hash_key UNIQUE (code_hash);


--
-- Name: sv_pilot_invites sv_pilot_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_pilot_invites
    ADD CONSTRAINT sv_pilot_invites_pkey PRIMARY KEY (id);


--
-- Name: sv_project_profiles sv_project_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_project_profiles
    ADD CONSTRAINT sv_project_profiles_pkey PRIMARY KEY (id);


--
-- Name: sv_projects sv_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_projects
    ADD CONSTRAINT sv_projects_pkey PRIMARY KEY (id);


--
-- Name: sv_prompt_families sv_prompt_families_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_prompt_families
    ADD CONSTRAINT sv_prompt_families_pkey PRIMARY KEY (id);


--
-- Name: sv_provider_canary_executions sv_provider_canary_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_canary_executions
    ADD CONSTRAINT sv_provider_canary_executions_pkey PRIMARY KEY (id);


--
-- Name: sv_provider_canary_executions sv_provider_canary_executions_project_required; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.sv_provider_canary_executions
    ADD CONSTRAINT sv_provider_canary_executions_project_required CHECK ((project_id IS NOT NULL)) NOT VALID;


--
-- Name: sv_provider_dataset_capabilities sv_provider_dataset_capabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_dataset_capabilities
    ADD CONSTRAINT sv_provider_dataset_capabilities_pkey PRIMARY KEY (id);


--
-- Name: sv_provider_dataset_snapshot_events sv_provider_dataset_snapshot_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_dataset_snapshot_events
    ADD CONSTRAINT sv_provider_dataset_snapshot_events_pkey PRIMARY KEY (id);


--
-- Name: sv_provider_spend_budgets sv_provider_spend_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_spend_budgets
    ADD CONSTRAINT sv_provider_spend_budgets_pkey PRIMARY KEY (scope);


--
-- Name: sv_provider_spend_reservations sv_provider_spend_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_spend_reservations
    ADD CONSTRAINT sv_provider_spend_reservations_pkey PRIMARY KEY (id);


--
-- Name: sv_provider_spend_reservations sv_provider_spend_reservations_request_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_spend_reservations
    ADD CONSTRAINT sv_provider_spend_reservations_request_key UNIQUE (scope, organization_id, request_key);


--
-- Name: sv_public_scans sv_public_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_public_scans
    ADD CONSTRAINT sv_public_scans_pkey PRIMARY KEY (id);


--
-- Name: sv_qc_records sv_qc_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_qc_records
    ADD CONSTRAINT sv_qc_records_pkey PRIMARY KEY (id);


--
-- Name: sv_quotes sv_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_quotes
    ADD CONSTRAINT sv_quotes_pkey PRIMARY KEY (id);


--
-- Name: sv_recommendation_manifests sv_recommendation_manifests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_manifests
    ADD CONSTRAINT sv_recommendation_manifests_pkey PRIMARY KEY (id);


--
-- Name: sv_recommendation_runs sv_recommendation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_runs
    ADD CONSTRAINT sv_recommendation_runs_pkey PRIMARY KEY (id);


--
-- Name: sv_recommendations sv_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendations
    ADD CONSTRAINT sv_recommendations_pkey PRIMARY KEY (id);


--
-- Name: sv_reputation_sources sv_reputation_sources_location_source_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_reputation_sources
    ADD CONSTRAINT sv_reputation_sources_location_source_unique UNIQUE (location_id, source);


--
-- Name: sv_reputation_sources sv_reputation_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_reputation_sources
    ADD CONSTRAINT sv_reputation_sources_pkey PRIMARY KEY (id);


--
-- Name: sv_response_mentions sv_response_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_response_mentions
    ADD CONSTRAINT sv_response_mentions_pkey PRIMARY KEY (id);


--
-- Name: sv_review_snapshots sv_review_snapshots_id_source_period_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_snapshots
    ADD CONSTRAINT sv_review_snapshots_id_source_period_unique UNIQUE (id, source_id, period_start, period_end);


--
-- Name: sv_review_snapshots sv_review_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_snapshots
    ADD CONSTRAINT sv_review_snapshots_pkey PRIMARY KEY (id);


--
-- Name: sv_review_snapshots sv_review_snapshots_source_period_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_snapshots
    ADD CONSTRAINT sv_review_snapshots_source_period_unique UNIQUE (source_id, period_start, period_end);


--
-- Name: sv_review_topic_observations sv_review_topic_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_topic_observations
    ADD CONSTRAINT sv_review_topic_observations_pkey PRIMARY KEY (id);


--
-- Name: sv_review_topic_observations sv_review_topic_observations_topic_method_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_topic_observations
    ADD CONSTRAINT sv_review_topic_observations_topic_method_unique UNIQUE (snapshot_id, topic, analysis_method_version);


--
-- Name: sv_review_velocity_metrics sv_review_velocity_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_velocity_metrics
    ADD CONSTRAINT sv_review_velocity_metrics_pkey PRIMARY KEY (id);


--
-- Name: sv_review_velocity_metrics sv_review_velocity_metrics_source_period_formula_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_velocity_metrics
    ADD CONSTRAINT sv_review_velocity_metrics_source_period_formula_unique UNIQUE (source_id, period_start, period_end, formula_version);


--
-- Name: sv_run_permits sv_run_permits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_run_permits
    ADD CONSTRAINT sv_run_permits_pkey PRIMARY KEY (id);


--
-- Name: sv_runs sv_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_runs
    ADD CONSTRAINT sv_runs_pkey PRIMARY KEY (id);


--
-- Name: sv_scenarios sv_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_scenarios
    ADD CONSTRAINT sv_scenarios_pkey PRIMARY KEY (id);


--
-- Name: sv_search_queries sv_search_queries_id_scope_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_queries
    ADD CONSTRAINT sv_search_queries_id_scope_unique UNIQUE (id, engine, region, device);


--
-- Name: sv_search_queries sv_search_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_queries
    ADD CONSTRAINT sv_search_queries_pkey PRIMARY KEY (id);


--
-- Name: sv_search_queries sv_search_queries_project_scope_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_queries
    ADD CONSTRAINT sv_search_queries_project_scope_unique UNIQUE (project_id, normalized_text, engine, region, device);


--
-- Name: sv_search_rank_observations sv_search_rank_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_rank_observations
    ADD CONSTRAINT sv_search_rank_observations_pkey PRIMARY KEY (id);


--
-- Name: sv_search_rank_observations sv_search_rank_observations_scope_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_rank_observations
    ADD CONSTRAINT sv_search_rank_observations_scope_unique UNIQUE (cycle_id, query_id, engine, region, device, repeat_index);


--
-- Name: sv_simulation_bootstrap_nonces sv_simulation_bootstrap_nonces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_bootstrap_nonces
    ADD CONSTRAINT sv_simulation_bootstrap_nonces_pkey PRIMARY KEY (nonce);


--
-- Name: sv_simulation_connect_tokens sv_simulation_connect_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_connect_tokens
    ADD CONSTRAINT sv_simulation_connect_tokens_pkey PRIMARY KEY (id);


--
-- Name: sv_simulation_deliveries sv_simulation_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_deliveries
    ADD CONSTRAINT sv_simulation_deliveries_pkey PRIMARY KEY (id);


--
-- Name: sv_simulation_delivery_attempts sv_simulation_delivery_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_delivery_attempts
    ADD CONSTRAINT sv_simulation_delivery_attempts_pkey PRIMARY KEY (id);


--
-- Name: sv_simulation_recipients sv_simulation_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_recipients
    ADD CONSTRAINT sv_simulation_recipients_pkey PRIMARY KEY (id);


--
-- Name: sv_simulation_reports sv_simulation_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_reports
    ADD CONSTRAINT sv_simulation_reports_pkey PRIMARY KEY (id);


--
-- Name: sv_simulation_subscriptions sv_simulation_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_subscriptions
    ADD CONSTRAINT sv_simulation_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: sv_source_snapshots sv_source_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_source_snapshots
    ADD CONSTRAINT sv_source_snapshots_pkey PRIMARY KEY (id);


--
-- Name: sv_source_snapshots sv_source_snapshots_provider_project_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.sv_source_snapshots
    ADD CONSTRAINT sv_source_snapshots_provider_project_check CHECK (((capability_id IS NULL) OR (project_id IS NOT NULL))) NOT VALID;


--
-- Name: sv_verification_cycles sv_verification_cycles_action_attempt_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_action_attempt_unique UNIQUE (action_id, attempt);


--
-- Name: sv_verification_cycles sv_verification_cycles_chain_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_chain_unique UNIQUE (id, organization_id, action_id, baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id);


--
-- Name: sv_verification_cycles sv_verification_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_pkey PRIMARY KEY (id);


--
-- Name: sv_website_snapshots sv_website_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_website_snapshots
    ADD CONSTRAINT sv_website_snapshots_pkey PRIMARY KEY (id);


--
-- Name: usage_events usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_pkey PRIMARY KEY (id);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: job_common_i1; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i1 ON pgboss.job_common USING btree (name, COALESCE(singleton_key, ''::text)) WHERE ((state = 'created'::pgboss.job_state) AND (policy = 'short'::text));


--
-- Name: job_common_i2; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i2 ON pgboss.job_common USING btree (name, COALESCE(singleton_key, ''::text)) WHERE ((state = 'active'::pgboss.job_state) AND (policy = 'singleton'::text));


--
-- Name: job_common_i3; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i3 ON pgboss.job_common USING btree (name, state, COALESCE(singleton_key, ''::text)) WHERE ((state <= 'active'::pgboss.job_state) AND (policy = 'stately'::text));


--
-- Name: job_common_i4; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i4 ON pgboss.job_common USING btree (name, singleton_on, COALESCE(singleton_key, ''::text)) WHERE ((state <> 'cancelled'::pgboss.job_state) AND (singleton_on IS NOT NULL));


--
-- Name: job_common_i5; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX job_common_i5 ON pgboss.job_common USING btree (name, start_after) WHERE ((state < 'active'::pgboss.job_state) AND (NOT blocked));


--
-- Name: job_common_i6; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i6 ON pgboss.job_common USING btree (name, COALESCE(singleton_key, ''::text)) WHERE ((state <= 'active'::pgboss.job_state) AND (policy = 'exclusive'::text));


--
-- Name: job_common_i7; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX job_common_i7 ON pgboss.job_common USING btree (name, group_id) WHERE ((state = 'active'::pgboss.job_state) AND (group_id IS NOT NULL));


--
-- Name: job_common_i8; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE UNIQUE INDEX job_common_i8 ON pgboss.job_common USING btree (name, singleton_key) WHERE ((state = ANY (ARRAY['active'::pgboss.job_state, 'retry'::pgboss.job_state, 'failed'::pgboss.job_state])) AND (policy = 'key_strict_fifo'::text));


--
-- Name: job_common_i9; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX job_common_i9 ON pgboss.job_common USING btree (name, id) WHERE (blocking AND (state = 'completed'::pgboss.job_state));


--
-- Name: job_dep_parent_idx; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX job_dep_parent_idx ON pgboss.job_dependency USING btree (parent_name, parent_id);


--
-- Name: queue_stats_i1; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX queue_stats_i1 ON ONLY pgboss.queue_stats USING btree (name, captured_on DESC) INCLUDE (deferred_count, queued_count, ready_count, active_count, failed_count, total_count);


--
-- Name: queue_stats_20260815_name_captured_on_deferred_count_queued_idx; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX queue_stats_20260815_name_captured_on_deferred_count_queued_idx ON pgboss.queue_stats_20260815 USING btree (name, captured_on DESC) INCLUDE (deferred_count, queued_count, ready_count, active_count, failed_count, total_count);


--
-- Name: queue_stats_20260816_name_captured_on_deferred_count_queued_idx; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX queue_stats_20260816_name_captured_on_deferred_count_queued_idx ON pgboss.queue_stats_20260816 USING btree (name, captured_on DESC) INCLUDE (deferred_count, queued_count, ready_count, active_count, failed_count, total_count);


--
-- Name: warning_i1; Type: INDEX; Schema: pgboss; Owner: -
--

CREATE INDEX warning_i1 ON pgboss.warning USING btree (created_on DESC);


--
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_userId_idx" ON public.account USING btree (user_id);


--
-- Name: brand_opportunities_brand_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brand_opportunities_brand_id_created_at_idx ON public.brand_opportunities USING btree (brand_id, created_at);


--
-- Name: brands_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brands_organization_id_idx ON public.brands USING btree (organization_id);


--
-- Name: citations_domain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX citations_domain_idx ON public.citations USING btree (domain);


--
-- Name: citations_prompt_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX citations_prompt_id_created_at_idx ON public.citations USING btree (prompt_id, created_at);


--
-- Name: idx_citations_brand_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_citations_brand_analytics ON public.citations USING btree (brand_id, created_at, url, domain, title, prompt_id, model);


--
-- Name: idx_prompt_runs_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_runs_admin ON public.prompt_runs USING btree (created_at) INCLUDE (brand_id);


--
-- Name: idx_prompt_runs_brand_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_runs_brand_analytics ON public.prompt_runs USING btree (brand_id, created_at) INCLUDE (prompt_id, brand_mentioned, model, web_search_enabled, competitors_mentioned);


--
-- Name: idx_prompt_runs_prompt_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_runs_prompt_analytics ON public.prompt_runs USING btree (prompt_id, created_at) INCLUDE (brand_mentioned, model, web_search_enabled, competitors_mentioned, brand_id, web_queries);


--
-- Name: invitation_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invitation_email_idx ON public.invitation USING btree (email);


--
-- Name: invitation_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invitation_organizationId_idx" ON public.invitation USING btree (organization_id);


--
-- Name: member_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "member_organizationId_idx" ON public.member USING btree (organization_id);


--
-- Name: member_organization_id_user_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX member_organization_id_user_id_uidx ON public.member USING btree (organization_id, user_id);


--
-- Name: member_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "member_userId_idx" ON public.member USING btree (user_id);


--
-- Name: organization_slug_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX organization_slug_uidx ON public.organization USING btree (slug);


--
-- Name: prompt_run_hourly_aggregates_brand_hour_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompt_run_hourly_aggregates_brand_hour_idx ON public.prompt_run_hourly_aggregates USING btree (brand_id, hour_bucket);


--
-- Name: prompt_runs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompt_runs_created_at_idx ON public.prompt_runs USING btree (created_at);


--
-- Name: prompt_runs_model_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompt_runs_model_created_at_idx ON public.prompt_runs USING btree (model, created_at);


--
-- Name: prompt_runs_prompt_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompt_runs_prompt_id_created_at_idx ON public.prompt_runs USING btree (prompt_id, created_at);


--
-- Name: prompt_runs_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompt_runs_provider_idx ON public.prompt_runs USING btree (provider);


--
-- Name: prompt_runs_web_search_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompt_runs_web_search_created_at_idx ON public.prompt_runs USING btree (web_search_enabled, created_at);


--
-- Name: prompt_runs_web_search_model_group_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompt_runs_web_search_model_group_created_at_idx ON public.prompt_runs USING btree (web_search_enabled, model, created_at);


--
-- Name: prompts_brand_id_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompts_brand_id_enabled_idx ON public.prompts USING btree (brand_id, enabled);


--
-- Name: prompts_brand_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompts_brand_id_idx ON public.prompts USING btree (brand_id);


--
-- Name: reports_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_created_at_idx ON public.reports USING btree (created_at);


--
-- Name: reports_organization_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_organization_idx ON public.reports USING btree (organization_id);


--
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "session_userId_idx" ON public.session USING btree (user_id);


--
-- Name: subscription_reference_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_reference_id_idx ON public.subscription USING btree (reference_id);


--
-- Name: sv_action_approvals_org_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_action_approvals_org_action_idx ON public.sv_action_approvals USING btree (organization_id, action_id);


--
-- Name: sv_api_idempotency_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_api_idempotency_expires_idx ON public.sv_api_idempotency_records USING btree (organization_id, expires_at);


--
-- Name: sv_api_idempotency_identity_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_api_idempotency_identity_unique ON public.sv_api_idempotency_records USING btree (organization_id, operation, resource_id, idempotency_key);


--
-- Name: sv_api_keys_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_api_keys_active_idx ON public.sv_api_keys USING btree (organization_id, revoked_at);


--
-- Name: sv_api_keys_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_api_keys_org_idx ON public.sv_api_keys USING btree (organization_id);


--
-- Name: sv_approved_actions_org_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_approved_actions_org_project_idx ON public.sv_approved_actions USING btree (organization_id, project_id);


--
-- Name: sv_attribution_assessments_org_verification_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_attribution_assessments_org_verification_idx ON public.sv_attribution_assessments USING btree (organization_id, verification_cycle_id);


--
-- Name: sv_audit_events_formal_evidence_acceptance_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_audit_events_formal_evidence_acceptance_unique ON public.sv_audit_events USING btree (organization_id, event, subject_kind, subject_id) WHERE ((event = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED'::text) AND (subject_kind = 'evidence'::text));


--
-- Name: sv_audit_events_org_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_audit_events_org_at_idx ON public.sv_audit_events USING btree (organization_id, at);


--
-- Name: sv_business_locations_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_business_locations_entity_idx ON public.sv_business_locations USING btree (entity_id);


--
-- Name: sv_business_locations_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_business_locations_org_idx ON public.sv_business_locations USING btree (organization_id);


--
-- Name: sv_business_locations_pilot_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_business_locations_pilot_org_id_unique ON public.sv_business_locations USING btree (organization_id, id);


--
-- Name: sv_capture_tasks_matrix_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_capture_tasks_matrix_unique ON public.sv_capture_tasks USING btree (pilot_cycle_id, scenario_id, context_hash, repeat_index);


--
-- Name: sv_capture_tasks_org_idempotency_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_capture_tasks_org_idempotency_unique ON public.sv_capture_tasks USING btree (organization_id, idempotency_key);


--
-- Name: sv_capture_tasks_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_capture_tasks_org_idx ON public.sv_capture_tasks USING btree (organization_id);


--
-- Name: sv_change_event_assets_org_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_change_event_assets_org_event_idx ON public.sv_change_event_assets USING btree (organization_id, change_event_id);


--
-- Name: sv_change_events_org_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_change_events_org_project_idx ON public.sv_change_events USING btree (organization_id, project_id);


--
-- Name: sv_citation_gap_cycle_source_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_citation_gap_cycle_source_unique ON public.sv_citation_gap_snapshots USING btree (cycle_id, source_domain, formula_version);


--
-- Name: sv_citation_gap_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_citation_gap_org_cycle_idx ON public.sv_citation_gap_snapshots USING btree (organization_id, cycle_id);


--
-- Name: sv_citation_gap_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_citation_gap_project_idx ON public.sv_citation_gap_snapshots USING btree (project_id);


--
-- Name: sv_configuration_locks_id_organization_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_configuration_locks_id_organization_unique ON public.sv_configuration_locks USING btree (id, organization_id);


--
-- Name: sv_configuration_locks_id_project_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_configuration_locks_id_project_org_unique ON public.sv_configuration_locks USING btree (id, project_id, organization_id);


--
-- Name: sv_cost_events_id_org_cycle_domain_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_cost_events_id_org_cycle_domain_unique ON public.sv_cost_events USING btree (id, organization_id, measurement_cycle_id, domain_id);


--
-- Name: sv_cost_events_kind_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_cost_events_kind_created_idx ON public.sv_cost_events USING btree (kind, created_at);


--
-- Name: sv_cost_events_measurement_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_cost_events_measurement_cycle_idx ON public.sv_cost_events USING btree (measurement_cycle_id);


--
-- Name: sv_cost_events_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_cost_events_org_cycle_idx ON public.sv_cost_events USING btree (organization_id, cycle_id);


--
-- Name: sv_cost_events_org_domain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_cost_events_org_domain_idx ON public.sv_cost_events USING btree (organization_id, domain_id);


--
-- Name: sv_cost_events_run_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_cost_events_run_idx ON public.sv_cost_events USING btree (run_id);


--
-- Name: sv_cycles_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_cycles_order_idx ON public.sv_cycles USING btree (order_id);


--
-- Name: sv_cycles_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_cycles_org_idx ON public.sv_cycles USING btree (organization_id);


--
-- Name: sv_entities_org_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_entities_org_project_idx ON public.sv_entities USING btree (organization_id, project_id);


--
-- Name: sv_evidence_acceptance_receipts_org_evidence_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_evidence_acceptance_receipts_org_evidence_unique ON public.sv_evidence_acceptance_receipts USING btree (organization_id, evidence_id);


--
-- Name: sv_evidence_index_id_organization_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_evidence_index_id_organization_unique ON public.sv_evidence_index USING btree (id, organization_id);


--
-- Name: sv_evidence_index_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_evidence_index_org_cycle_idx ON public.sv_evidence_index USING btree (organization_id, cycle_id);


--
-- Name: sv_findings_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_findings_cycle_idx ON public.sv_findings USING btree (cycle_id);


--
-- Name: sv_findings_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_findings_org_idx ON public.sv_findings USING btree (organization_id);


--
-- Name: sv_free_ai_visibility_checks_org_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_free_ai_visibility_checks_org_user_idx ON public.sv_free_ai_visibility_checks USING btree (organization_id, user_id);


--
-- Name: sv_free_auto_dispatch_claims_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_free_auto_dispatch_claims_day_idx ON public.sv_free_auto_dispatch_claims USING btree (utc_day);


--
-- Name: sv_free_auto_dispatch_claims_day_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_free_auto_dispatch_claims_day_project_idx ON public.sv_free_auto_dispatch_claims USING btree (utc_day, project_id);


--
-- Name: sv_grid_definitions_id_location_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_grid_definitions_id_location_unique ON public.sv_grid_definitions USING btree (id, location_id);


--
-- Name: sv_grid_definitions_location_version_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_grid_definitions_location_version_unique ON public.sv_grid_definitions USING btree (location_id, version);


--
-- Name: sv_grid_definitions_org_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_grid_definitions_org_location_idx ON public.sv_grid_definitions USING btree (organization_id, location_id);


--
-- Name: sv_grid_definitions_pilot_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_grid_definitions_pilot_org_id_unique ON public.sv_grid_definitions USING btree (organization_id, id);


--
-- Name: sv_grid_points_grid_point_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_grid_points_grid_point_unique ON public.sv_grid_points USING btree (grid_id, point_index);


--
-- Name: sv_grid_points_id_grid_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_grid_points_id_grid_unique ON public.sv_grid_points USING btree (id, grid_id);


--
-- Name: sv_grid_points_org_grid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_grid_points_org_grid_idx ON public.sv_grid_points USING btree (organization_id, grid_id);


--
-- Name: sv_grid_points_pilot_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_grid_points_pilot_org_id_unique ON public.sv_grid_points USING btree (organization_id, id);


--
-- Name: sv_incidents_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_incidents_order_idx ON public.sv_incidents USING btree (order_id);


--
-- Name: sv_incidents_org_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_incidents_org_created_idx ON public.sv_incidents USING btree (organization_id, created_at);


--
-- Name: sv_journal_daily_claims_identity_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_journal_daily_claims_identity_unique ON public.sv_journal_daily_claims USING btree (organization_id, project_id, question_set_version, utc_day, attempt);


--
-- Name: sv_journal_daily_claims_lock_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_journal_daily_claims_lock_unique ON public.sv_journal_daily_claims USING btree (configuration_lock_id) WHERE (configuration_lock_id IS NOT NULL);


--
-- Name: sv_journal_daily_claims_unresolved_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_journal_daily_claims_unresolved_unique ON public.sv_journal_daily_claims USING btree (organization_id, project_id) WHERE (status = ANY (ARRAY['CLAIMED'::text, 'EXECUTING'::text, 'HOLD'::text]));


--
-- Name: sv_journal_provider_boundaries_claim_permit_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_journal_provider_boundaries_claim_permit_unique ON public.sv_journal_provider_boundaries USING btree (journal_claim_id, permit_id);


--
-- Name: sv_journal_provider_boundaries_org_claim_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_journal_provider_boundaries_org_claim_idx ON public.sv_journal_provider_boundaries USING btree (organization_id, journal_claim_id);


--
-- Name: sv_journal_provider_boundaries_run_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_journal_provider_boundaries_run_unique ON public.sv_journal_provider_boundaries USING btree (run_id);


--
-- Name: sv_local_canary_reviews_accepted_attempt_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_canary_reviews_accepted_attempt_unique ON public.sv_local_canary_reviews USING btree (organization_id, local_cycle_id, attempt_id) WHERE (status = 'ACCEPTED'::text);


--
-- Name: sv_local_competitor_observations_org_observation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_local_competitor_observations_org_observation_idx ON public.sv_local_competitor_observations USING btree (organization_id, observation_id);


--
-- Name: sv_local_competitor_observations_rank_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_competitor_observations_rank_unique ON public.sv_local_competitor_observations USING btree (observation_id, rank);


--
-- Name: sv_local_dispatch_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_local_dispatch_pending_idx ON public.sv_local_dispatch_outbox USING btree (organization_id, status, created_at);


--
-- Name: sv_local_keywords_id_location_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_keywords_id_location_unique ON public.sv_local_keywords USING btree (id, location_id);


--
-- Name: sv_local_keywords_location_text_language_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_keywords_location_text_language_unique ON public.sv_local_keywords USING btree (location_id, normalized_text, language);


--
-- Name: sv_local_keywords_org_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_local_keywords_org_location_idx ON public.sv_local_keywords USING btree (organization_id, location_id);


--
-- Name: sv_local_keywords_pilot_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_keywords_pilot_org_id_unique ON public.sv_local_keywords USING btree (organization_id, id);


--
-- Name: sv_local_observations_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_local_observations_org_idx ON public.sv_local_observations USING btree (organization_id);


--
-- Name: sv_local_observations_task_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_observations_task_unique ON public.sv_local_observations USING btree (capture_task_id);


--
-- Name: sv_local_rank_observations_matrix_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_rank_observations_matrix_unique ON public.sv_local_rank_observations USING btree (cycle_id, location_id, keyword_id, grid_point_id, provider, repeat_index);


--
-- Name: sv_local_rank_observations_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_local_rank_observations_org_cycle_idx ON public.sv_local_rank_observations USING btree (organization_id, cycle_id);


--
-- Name: sv_local_rank_observations_pilot_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_rank_observations_pilot_org_id_unique ON public.sv_local_rank_observations USING btree (organization_id, id);


--
-- Name: sv_local_report_one_published; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_report_one_published ON public.sv_local_report_versions USING btree (organization_id, local_cycle_id) WHERE (status = 'PUBLISHED'::text);


--
-- Name: sv_local_reports_cycle_org_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_reports_cycle_org_identity ON public.sv_local_scan_cycles USING btree (organization_id, id, measurement_cycle_id);


--
-- Name: sv_local_scan_cycles_accepted_canary_review_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_scan_cycles_accepted_canary_review_unique ON public.sv_local_scan_cycles USING btree (organization_id, approved_canary_review_id) WHERE ((approved_canary_review_id IS NOT NULL) AND (status <> 'STOPPED'::text));


--
-- Name: sv_local_scan_cycles_id_location_grid_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_scan_cycles_id_location_grid_unique ON public.sv_local_scan_cycles USING btree (id, location_id, grid_definition_id);


--
-- Name: sv_local_scan_cycles_measurement_cycle_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_scan_cycles_measurement_cycle_unique ON public.sv_local_scan_cycles USING btree (measurement_cycle_id);


--
-- Name: sv_local_scan_cycles_org_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_local_scan_cycles_org_location_idx ON public.sv_local_scan_cycles USING btree (organization_id, location_id);


--
-- Name: sv_local_scan_cycles_pilot_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_scan_cycles_pilot_org_id_unique ON public.sv_local_scan_cycles USING btree (organization_id, id);


--
-- Name: sv_local_scan_cycles_result_identity_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_scan_cycles_result_identity_unique ON public.sv_local_scan_cycles USING btree (id, organization_id, measurement_cycle_id, configuration_lock_id, provider);


--
-- Name: sv_local_visibility_metrics_cycle_keyword_formula_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_local_visibility_metrics_cycle_keyword_formula_unique ON public.sv_local_visibility_metrics USING btree (cycle_id, keyword_id, formula_version);


--
-- Name: sv_local_visibility_metrics_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_local_visibility_metrics_org_cycle_idx ON public.sv_local_visibility_metrics USING btree (organization_id, cycle_id);


--
-- Name: sv_locks_project_version_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_locks_project_version_unique ON public.sv_configuration_locks USING btree (project_id, version, legacy_collision_ordinal);


--
-- Name: sv_measurement_attempt_results_org_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_measurement_attempt_results_org_created_idx ON public.sv_measurement_attempt_results USING btree (organization_id, created_at);


--
-- Name: sv_measurement_attempt_results_org_fingerprint_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_attempt_results_org_fingerprint_unique ON public.sv_measurement_attempt_results USING btree (organization_id, result_fingerprint);


--
-- Name: sv_measurement_attempts_active_slot_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_attempts_active_slot_unique ON public.sv_measurement_attempts USING btree (organization_id, base_slot_key) WHERE (status = ANY (ARRAY['CLAIMED'::text, 'SUBMITTED'::text]));


--
-- Name: sv_measurement_attempts_cost_event_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_attempts_cost_event_unique ON public.sv_measurement_attempts USING btree (cost_event_id) WHERE (cost_event_id IS NOT NULL);


--
-- Name: sv_measurement_attempts_execution_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_attempts_execution_unique ON public.sv_measurement_attempts USING btree (organization_id, execution_key);


--
-- Name: sv_measurement_attempts_expired_claim_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_measurement_attempts_expired_claim_idx ON public.sv_measurement_attempts USING btree (organization_id, lease_expires_at) WHERE (status = 'CLAIMED'::text);


--
-- Name: sv_measurement_attempts_org_cycle_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_measurement_attempts_org_cycle_status_idx ON public.sv_measurement_attempts USING btree (organization_id, measurement_cycle_id, status);


--
-- Name: sv_measurement_attempts_pilot_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_attempts_pilot_org_id_unique ON public.sv_measurement_attempts USING btree (organization_id, id);


--
-- Name: sv_measurement_attempts_reservation_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_attempts_reservation_unique ON public.sv_measurement_attempts USING btree (reservation_id);


--
-- Name: sv_measurement_attempts_result_identity_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_attempts_result_identity_unique ON public.sv_measurement_attempts USING btree (id, organization_id, measurement_cycle_id, reservation_id, execution_key, attempt_index);


--
-- Name: sv_measurement_attempts_slot_attempt_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_attempts_slot_attempt_unique ON public.sv_measurement_attempts USING btree (organization_id, base_slot_key, attempt_index);


--
-- Name: sv_measurement_attempts_submission_token_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_attempts_submission_token_unique ON public.sv_measurement_attempts USING btree (submission_token_hash) WHERE (submission_token_hash IS NOT NULL);


--
-- Name: sv_measurement_cycles_domain_cycle_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_cycles_domain_cycle_unique ON public.sv_measurement_cycles USING btree (domain_id, domain_cycle_id);


--
-- Name: sv_measurement_cycles_id_domain_org_lock_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_cycles_id_domain_org_lock_unique ON public.sv_measurement_cycles USING btree (id, domain_id, organization_id, configuration_lock_id);


--
-- Name: sv_measurement_cycles_id_domain_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_cycles_id_domain_org_unique ON public.sv_measurement_cycles USING btree (id, domain_id, organization_id);


--
-- Name: sv_measurement_cycles_id_domain_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_cycles_id_domain_unique ON public.sv_measurement_cycles USING btree (id, domain_id);


--
-- Name: sv_measurement_cycles_org_domain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_measurement_cycles_org_domain_idx ON public.sv_measurement_cycles USING btree (organization_id, domain_id);


--
-- Name: sv_measurement_datasets_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_measurement_datasets_org_cycle_idx ON public.sv_measurement_datasets USING btree (organization_id, cycle_id);


--
-- Name: sv_measurement_datasets_org_key_version_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_measurement_datasets_org_key_version_unique ON public.sv_measurement_datasets USING btree (organization_id, dataset_key, version);


--
-- Name: sv_observation_evidence_assets_observation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_observation_evidence_assets_observation_idx ON public.sv_observation_evidence_assets USING btree (observation_id);


--
-- Name: sv_observation_evidence_assets_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_observation_evidence_assets_org_idx ON public.sv_observation_evidence_assets USING btree (organization_id);


--
-- Name: sv_observation_mentions_observation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_observation_mentions_observation_idx ON public.sv_observation_mentions USING btree (observation_id);


--
-- Name: sv_observation_mentions_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_observation_mentions_org_idx ON public.sv_observation_mentions USING btree (organization_id);


--
-- Name: sv_order_requests_org_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_order_requests_org_created_idx ON public.sv_order_requests USING btree (organization_id, created_at);


--
-- Name: sv_orders_id_organization_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_orders_id_organization_unique ON public.sv_orders USING btree (id, organization_id);


--
-- Name: sv_orders_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_orders_org_idx ON public.sv_orders USING btree (organization_id);


--
-- Name: sv_orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_orders_status_idx ON public.sv_orders USING btree (status);


--
-- Name: sv_outcome_attribution_windows_org_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_outcome_attribution_windows_org_location_idx ON public.sv_outcome_attribution_windows USING btree (organization_id, location_id);


--
-- Name: sv_outcome_observations_org_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_outcome_observations_org_location_idx ON public.sv_outcome_observations USING btree (organization_id, location_id);


--
-- Name: sv_outcome_sources_org_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_outcome_sources_org_location_idx ON public.sv_outcome_sources USING btree (organization_id, location_id);


--
-- Name: sv_payments_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_payments_org_idx ON public.sv_payments USING btree (organization_id);


--
-- Name: sv_payments_provider_event_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_payments_provider_event_unique ON public.sv_payments USING btree (provider, provider_event_id);


--
-- Name: sv_pilot_cycles_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_pilot_cycles_org_idx ON public.sv_pilot_cycles USING btree (organization_id);


--
-- Name: sv_pilot_cycles_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_pilot_cycles_project_idx ON public.sv_pilot_cycles USING btree (project_id);


--
-- Name: sv_pilot_invites_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_pilot_invites_open_idx ON public.sv_pilot_invites USING btree (expires_at) WHERE (redeemed_at IS NULL);


--
-- Name: sv_project_profiles_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_project_profiles_org_idx ON public.sv_project_profiles USING btree (organization_id);


--
-- Name: sv_project_profiles_project_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_project_profiles_project_unique ON public.sv_project_profiles USING btree (project_id);


--
-- Name: sv_projects_id_organization_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_projects_id_organization_unique ON public.sv_projects USING btree (id, organization_id);


--
-- Name: sv_projects_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_projects_org_idx ON public.sv_projects USING btree (organization_id);


--
-- Name: sv_projects_org_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_projects_org_name_unique ON public.sv_projects USING btree (organization_id, name);


--
-- Name: sv_prompt_families_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_prompt_families_project_idx ON public.sv_prompt_families USING btree (project_id);


--
-- Name: sv_provider_canary_executions_identity_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_provider_canary_executions_identity_unique ON public.sv_provider_canary_executions USING btree (source, execution_identity);


--
-- Name: sv_provider_canary_executions_project_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_provider_canary_executions_project_org_idx ON public.sv_provider_canary_executions USING btree (project_id, organization_id) WHERE (project_id IS NOT NULL);


--
-- Name: sv_provider_dataset_capabilities_id_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_provider_dataset_capabilities_id_org_unique ON public.sv_provider_dataset_capabilities USING btree (id, organization_id);


--
-- Name: sv_provider_dataset_capabilities_org_source_version_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_provider_dataset_capabilities_org_source_version_unique ON public.sv_provider_dataset_capabilities USING btree (organization_id, provider, source, version);


--
-- Name: sv_provider_dataset_capabilities_org_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_provider_dataset_capabilities_org_status_idx ON public.sv_provider_dataset_capabilities USING btree (organization_id, capability_status);


--
-- Name: sv_provider_dataset_snapshot_events_event_hash_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_provider_dataset_snapshot_events_event_hash_unique ON public.sv_provider_dataset_snapshot_events USING btree (organization_id, project_id, event_hash);


--
-- Name: sv_provider_dataset_snapshot_events_phase_observed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_provider_dataset_snapshot_events_phase_observed_idx ON public.sv_provider_dataset_snapshot_events USING btree (organization_id, project_id, phase, observed_at);


--
-- Name: sv_provider_dataset_snapshot_events_snapshot_observed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_provider_dataset_snapshot_events_snapshot_observed_idx ON public.sv_provider_dataset_snapshot_events USING btree (organization_id, project_id, snapshot_id, observed_at);


--
-- Name: sv_provider_spend_reservations_scope_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_provider_spend_reservations_scope_status_idx ON public.sv_provider_spend_reservations USING btree (scope, status);


--
-- Name: sv_public_scans_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_public_scans_created_idx ON public.sv_public_scans USING btree (created_at);


--
-- Name: sv_public_scans_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_public_scans_project_idx ON public.sv_public_scans USING btree (project_id);


--
-- Name: sv_qc_records_org_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_qc_records_org_order_idx ON public.sv_qc_records USING btree (organization_id, order_id);


--
-- Name: sv_quotes_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_quotes_org_idx ON public.sv_quotes USING btree (organization_id);


--
-- Name: sv_quotes_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_quotes_project_idx ON public.sv_quotes USING btree (project_id);


--
-- Name: sv_recommendation_actions_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_recommendation_actions_org_idx ON public.sv_recommendation_actions USING btree (organization_id);


--
-- Name: sv_recommendation_actions_run_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_recommendation_actions_run_id_unique ON public.sv_recommendation_actions USING btree (run_id, id);


--
-- Name: sv_recommendation_evidence_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_recommendation_evidence_org_idx ON public.sv_recommendation_evidence USING btree (organization_id);


--
-- Name: sv_recommendation_evidence_run_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_recommendation_evidence_run_id_unique ON public.sv_recommendation_evidence USING btree (run_id, id);


--
-- Name: sv_recommendation_findings_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_recommendation_findings_org_idx ON public.sv_recommendation_findings USING btree (organization_id);


--
-- Name: sv_recommendation_findings_run_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_recommendation_findings_run_id_unique ON public.sv_recommendation_findings USING btree (run_id, id);


--
-- Name: sv_recommendation_manifests_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_recommendation_manifests_org_idx ON public.sv_recommendation_manifests USING btree (organization_id);


--
-- Name: sv_recommendation_manifests_run_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_recommendation_manifests_run_unique ON public.sv_recommendation_manifests USING btree (run_id);


--
-- Name: sv_recommendation_runs_org_idempotency_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_recommendation_runs_org_idempotency_unique ON public.sv_recommendation_runs USING btree (organization_id, idempotency_key);


--
-- Name: sv_recommendation_runs_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_recommendation_runs_org_idx ON public.sv_recommendation_runs USING btree (organization_id);


--
-- Name: sv_recommendation_runs_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_recommendation_runs_project_idx ON public.sv_recommendation_runs USING btree (project_id);


--
-- Name: sv_recommendation_tasks_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_recommendation_tasks_org_idx ON public.sv_recommendation_tasks USING btree (organization_id);


--
-- Name: sv_recommendation_tasks_run_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_recommendation_tasks_run_id_unique ON public.sv_recommendation_tasks USING btree (run_id, id);


--
-- Name: sv_recommendations_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_recommendations_cycle_idx ON public.sv_recommendations USING btree (cycle_id);


--
-- Name: sv_recommendations_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_recommendations_org_idx ON public.sv_recommendations USING btree (organization_id);


--
-- Name: sv_reputation_sources_org_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_reputation_sources_org_location_idx ON public.sv_reputation_sources USING btree (organization_id, location_id);


--
-- Name: sv_response_mentions_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_response_mentions_org_cycle_idx ON public.sv_response_mentions USING btree (organization_id, cycle_id);


--
-- Name: sv_response_mentions_run_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_response_mentions_run_idx ON public.sv_response_mentions USING btree (run_id);


--
-- Name: sv_review_snapshots_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_review_snapshots_org_cycle_idx ON public.sv_review_snapshots USING btree (organization_id, cycle_id);


--
-- Name: sv_review_topic_observations_org_snapshot_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_review_topic_observations_org_snapshot_idx ON public.sv_review_topic_observations USING btree (organization_id, snapshot_id);


--
-- Name: sv_review_velocity_metrics_org_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_review_velocity_metrics_org_source_idx ON public.sv_review_velocity_metrics USING btree (organization_id, source_id);


--
-- Name: sv_run_permits_dispatch_key_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_run_permits_dispatch_key_unique ON public.sv_run_permits USING btree (dispatch_key);


--
-- Name: sv_run_permits_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_run_permits_org_cycle_idx ON public.sv_run_permits USING btree (organization_id, cycle_id);


--
-- Name: sv_runs_dispatch_key_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_runs_dispatch_key_unique ON public.sv_runs USING btree (dispatch_key);


--
-- Name: sv_runs_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_runs_org_cycle_idx ON public.sv_runs USING btree (organization_id, cycle_id);


--
-- Name: sv_scenarios_family_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_scenarios_family_idx ON public.sv_scenarios USING btree (family_id);


--
-- Name: sv_scenarios_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_scenarios_org_idx ON public.sv_scenarios USING btree (organization_id);


--
-- Name: sv_search_queries_org_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_search_queries_org_project_idx ON public.sv_search_queries USING btree (organization_id, project_id);


--
-- Name: sv_search_rank_observations_org_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_search_rank_observations_org_cycle_idx ON public.sv_search_rank_observations USING btree (organization_id, cycle_id);


--
-- Name: sv_simulation_bootstrap_nonces_used_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_simulation_bootstrap_nonces_used_idx ON public.sv_simulation_bootstrap_nonces USING btree (used_at);


--
-- Name: sv_simulation_connect_tokens_hash_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_simulation_connect_tokens_hash_unique ON public.sv_simulation_connect_tokens USING btree (token_hash);


--
-- Name: sv_simulation_connect_tokens_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_simulation_connect_tokens_project_idx ON public.sv_simulation_connect_tokens USING btree (organization_id, project_ref);


--
-- Name: sv_simulation_deliveries_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_simulation_deliveries_project_idx ON public.sv_simulation_deliveries USING btree (organization_id, project_ref);


--
-- Name: sv_simulation_deliveries_report_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_simulation_deliveries_report_unique ON public.sv_simulation_deliveries USING btree (report_id);


--
-- Name: sv_simulation_delivery_attempts_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_simulation_delivery_attempts_unique ON public.sv_simulation_delivery_attempts USING btree (delivery_id, attempt);


--
-- Name: sv_simulation_recipients_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_simulation_recipients_active_unique ON public.sv_simulation_recipients USING btree (organization_id, project_ref, channel) WHERE (status = 'BOUND'::text);


--
-- Name: sv_simulation_recipients_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_simulation_recipients_project_idx ON public.sv_simulation_recipients USING btree (organization_id, project_ref);


--
-- Name: sv_simulation_reports_period_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_simulation_reports_period_unique ON public.sv_simulation_reports USING btree (organization_id, project_ref, period_start);


--
-- Name: sv_simulation_reports_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_simulation_reports_project_idx ON public.sv_simulation_reports USING btree (organization_id, project_ref);


--
-- Name: sv_simulation_subscriptions_event_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_simulation_subscriptions_event_unique ON public.sv_simulation_subscriptions USING btree (organization_id, provider, provider_event_id);


--
-- Name: sv_simulation_subscriptions_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_simulation_subscriptions_org_idx ON public.sv_simulation_subscriptions USING btree (organization_id);


--
-- Name: sv_simulation_subscriptions_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_simulation_subscriptions_project_idx ON public.sv_simulation_subscriptions USING btree (organization_id, project_ref);


--
-- Name: sv_source_snapshots_canary_hash_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_source_snapshots_canary_hash_unique ON public.sv_source_snapshots USING btree (organization_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid), content_sha256) WHERE (source_type = 'LOCAL_MAPS_CANARY_ONLY'::text);


--
-- Name: sv_source_snapshots_id_organization_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_source_snapshots_id_organization_unique ON public.sv_source_snapshots USING btree (id, organization_id);


--
-- Name: sv_source_snapshots_id_project_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_source_snapshots_id_project_org_unique ON public.sv_source_snapshots USING btree (id, project_id, organization_id);


--
-- Name: sv_source_snapshots_legacy_org_content_sha256_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_source_snapshots_legacy_org_content_sha256_unique ON public.sv_source_snapshots USING btree (organization_id, content_sha256) WHERE ((project_id IS NULL) AND (source_type <> 'LOCAL_MAPS_CANARY_ONLY'::text));


--
-- Name: sv_source_snapshots_org_capability_captured_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_source_snapshots_org_capability_captured_idx ON public.sv_source_snapshots USING btree (organization_id, capability_id, captured_at);


--
-- Name: sv_source_snapshots_org_captured_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_source_snapshots_org_captured_idx ON public.sv_source_snapshots USING btree (organization_id, captured_at);


--
-- Name: sv_source_snapshots_project_content_sha256_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_source_snapshots_project_content_sha256_unique ON public.sv_source_snapshots USING btree (organization_id, project_id, content_sha256) WHERE ((project_id IS NOT NULL) AND (source_type <> 'LOCAL_MAPS_CANARY_ONLY'::text));


--
-- Name: sv_verification_cycles_org_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_verification_cycles_org_action_idx ON public.sv_verification_cycles USING btree (organization_id, action_id);


--
-- Name: sv_website_snapshots_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_website_snapshots_org_idx ON public.sv_website_snapshots USING btree (organization_id);


--
-- Name: sv_website_snapshots_project_hash_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sv_website_snapshots_project_hash_unique ON public.sv_website_snapshots USING btree (project_id, content_hash);


--
-- Name: sv_website_snapshots_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sv_website_snapshots_project_idx ON public.sv_website_snapshots USING btree (project_id);


--
-- Name: usage_events_org_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_events_org_created_idx ON public.usage_events USING btree (organization_id, created_at);


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: job_common_pkey; Type: INDEX ATTACH; Schema: pgboss; Owner: -
--

ALTER INDEX pgboss.job_pkey ATTACH PARTITION pgboss.job_common_pkey;


--
-- Name: queue_stats_20260815_name_captured_on_deferred_count_queued_idx; Type: INDEX ATTACH; Schema: pgboss; Owner: -
--

ALTER INDEX pgboss.queue_stats_i1 ATTACH PARTITION pgboss.queue_stats_20260815_name_captured_on_deferred_count_queued_idx;


--
-- Name: queue_stats_20260815_pkey; Type: INDEX ATTACH; Schema: pgboss; Owner: -
--

ALTER INDEX pgboss.queue_stats_pkey ATTACH PARTITION pgboss.queue_stats_20260815_pkey;


--
-- Name: queue_stats_20260816_name_captured_on_deferred_count_queued_idx; Type: INDEX ATTACH; Schema: pgboss; Owner: -
--

ALTER INDEX pgboss.queue_stats_i1 ATTACH PARTITION pgboss.queue_stats_20260816_name_captured_on_deferred_count_queued_idx;


--
-- Name: queue_stats_20260816_pkey; Type: INDEX ATTACH; Schema: pgboss; Owner: -
--

ALTER INDEX pgboss.queue_stats_pkey ATTACH PARTITION pgboss.queue_stats_20260816_pkey;


--
-- Name: sv_local_ai_evidence local_ai_evidence_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_evidence_delete BEFORE DELETE ON public.sv_local_ai_evidence FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_evidence local_ai_evidence_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_evidence_guard BEFORE INSERT OR UPDATE ON public.sv_local_ai_evidence FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_evidence_guard();


--
-- Name: sv_local_ai_cost_events local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_cost_events FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_events local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_events FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_orders local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_orders FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_payments local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_payments FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_slots local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_slots FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_cost_events local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_cost_events FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_events local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_events FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_evidence local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_evidence FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_orders local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_orders FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_payments local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_payments FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_slots local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_slots FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();


--
-- Name: sv_local_ai_slots local_ai_slot_scope; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_slot_scope BEFORE INSERT ON public.sv_local_ai_slots FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_scope_guard();


--
-- Name: sv_audit_events sv_audit_events_formal_evidence_immutable_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_audit_events_formal_evidence_immutable_guard BEFORE DELETE OR UPDATE ON public.sv_audit_events FOR EACH ROW EXECUTE FUNCTION public.sv_reject_formal_evidence_audit_mutation();


--
-- Name: sv_audit_events sv_audit_events_formal_evidence_owner_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_audit_events_formal_evidence_owner_guard BEFORE INSERT OR UPDATE ON public.sv_audit_events FOR EACH ROW EXECUTE FUNCTION public.sv_enforce_formal_evidence_audit();


--
-- Name: sv_audit_events sv_audit_events_formal_evidence_receipt_pair_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER sv_audit_events_formal_evidence_receipt_pair_guard AFTER INSERT ON public.sv_audit_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.sv_require_formal_evidence_receipt_pair();


--
-- Name: sv_audit_events sv_audit_events_formal_evidence_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_audit_events_formal_evidence_truncate_guard BEFORE TRUNCATE ON public.sv_audit_events FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_formal_evidence_audit_truncate();


--
-- Name: sv_citation_gap_snapshots sv_citation_gap_snapshots_journal_no_spend_dependency_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_citation_gap_snapshots_journal_no_spend_dependency_guard BEFORE INSERT OR DELETE OR UPDATE ON public.sv_citation_gap_snapshots FOR EACH ROW EXECUTE FUNCTION public.sv_reject_journal_no_spend_outcome_mutation();


--
-- Name: sv_citation_gap_snapshots sv_citation_gap_snapshots_journal_no_spend_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_citation_gap_snapshots_journal_no_spend_truncate_guard BEFORE TRUNCATE ON public.sv_citation_gap_snapshots FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_journal_no_spend_execution_truncate();


--
-- Name: sv_cost_events sv_cost_events_journal_no_spend_dependency_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_cost_events_journal_no_spend_dependency_guard BEFORE INSERT ON public.sv_cost_events FOR EACH ROW EXECUTE FUNCTION public.sv_reject_journal_no_spend_cost_insert();


--
-- Name: sv_cost_events sv_cost_events_journal_no_spend_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_cost_events_journal_no_spend_truncate_guard BEFORE TRUNCATE ON public.sv_cost_events FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_journal_no_spend_execution_truncate();


--
-- Name: sv_cycles sv_cycles_journal_no_spend_dependency_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_cycles_journal_no_spend_dependency_guard BEFORE INSERT OR DELETE OR UPDATE ON public.sv_cycles FOR EACH ROW EXECUTE FUNCTION public.sv_reject_journal_no_spend_dependency_mutation();


--
-- Name: sv_cycles sv_cycles_journal_no_spend_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_cycles_journal_no_spend_truncate_guard BEFORE TRUNCATE ON public.sv_cycles FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_journal_no_spend_execution_truncate();


--
-- Name: sv_evidence_acceptance_receipts sv_evidence_acceptance_receipts_audit_pair_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER sv_evidence_acceptance_receipts_audit_pair_guard AFTER INSERT ON public.sv_evidence_acceptance_receipts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.sv_require_formal_evidence_audit_pair();


--
-- Name: sv_evidence_acceptance_receipts sv_evidence_acceptance_receipts_immutable_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_evidence_acceptance_receipts_immutable_guard BEFORE DELETE OR UPDATE ON public.sv_evidence_acceptance_receipts FOR EACH ROW EXECUTE FUNCTION public.sv_reject_evidence_acceptance_mutation();


--
-- Name: sv_evidence_acceptance_receipts sv_evidence_acceptance_receipts_owner_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_evidence_acceptance_receipts_owner_guard BEFORE INSERT ON public.sv_evidence_acceptance_receipts FOR EACH ROW EXECUTE FUNCTION public.sv_require_owner_evidence_acceptance_insert();


--
-- Name: sv_evidence_acceptance_receipts sv_evidence_acceptance_receipts_scope_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_evidence_acceptance_receipts_scope_guard BEFORE INSERT ON public.sv_evidence_acceptance_receipts FOR EACH ROW EXECUTE FUNCTION public.sv_enforce_evidence_acceptance_receipt();


--
-- Name: sv_evidence_acceptance_receipts sv_evidence_acceptance_receipts_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_evidence_acceptance_receipts_truncate_guard BEFORE TRUNCATE ON public.sv_evidence_acceptance_receipts FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_evidence_acceptance_mutation();


--
-- Name: sv_evidence_index sv_evidence_index_capability_domain_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_evidence_index_capability_domain_guard BEFORE INSERT OR UPDATE ON public.sv_evidence_index FOR EACH ROW EXECUTE FUNCTION public.sv_enforce_evidence_capability_domain();


--
-- Name: sv_evidence_index sv_evidence_index_immutable_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_evidence_index_immutable_guard BEFORE DELETE OR UPDATE ON public.sv_evidence_index FOR EACH ROW EXECUTE FUNCTION public.sv_reject_evidence_mutation();


--
-- Name: sv_evidence_index sv_evidence_index_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_evidence_index_truncate_guard BEFORE TRUNCATE ON public.sv_evidence_index FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_evidence_mutation();


--
-- Name: sv_approved_actions sv_guard_action_status_transition_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_action_status_transition_trigger BEFORE INSERT OR UPDATE OF status ON public.sv_approved_actions FOR EACH ROW EXECUTE FUNCTION public.sv_guard_action_status_transition();


--
-- Name: sv_api_idempotency_records sv_guard_api_idempotency_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_api_idempotency_mutation BEFORE DELETE OR UPDATE ON public.sv_api_idempotency_records FOR EACH ROW EXECUTE FUNCTION public.sv_guard_api_idempotency_mutation();


--
-- Name: sv_attribution_assessments sv_guard_attribution_assessment_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_attribution_assessment_trigger BEFORE INSERT ON public.sv_attribution_assessments FOR EACH ROW EXECUTE FUNCTION public.sv_guard_attribution_assessment();


--
-- Name: sv_configuration_locks sv_guard_configuration_lock_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_configuration_lock_insert BEFORE INSERT ON public.sv_configuration_locks FOR EACH ROW EXECUTE FUNCTION public.sv_guard_configuration_lock_insert();


--
-- Name: sv_grid_points sv_guard_grid_point_before_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_grid_point_before_mutation BEFORE INSERT OR DELETE OR UPDATE ON public.sv_grid_points FOR EACH ROW EXECUTE FUNCTION public.sv_guard_grid_point_mutation();


--
-- Name: sv_journal_daily_claims sv_guard_journal_daily_claim_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_journal_daily_claim_mutation BEFORE INSERT OR DELETE OR UPDATE ON public.sv_journal_daily_claims FOR EACH ROW EXECUTE FUNCTION public.sv_guard_journal_daily_claim_mutation();


--
-- Name: sv_journal_provider_boundaries sv_guard_journal_provider_boundary_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_journal_provider_boundary_insert BEFORE INSERT ON public.sv_journal_provider_boundaries FOR EACH ROW EXECUTE FUNCTION public.sv_guard_journal_provider_boundary_insert();


--
-- Name: sv_local_scan_cycles sv_guard_local_cycle_project_scope; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_local_cycle_project_scope BEFORE INSERT OR UPDATE OF organization_id, location_id, configuration_lock_id ON public.sv_local_scan_cycles FOR EACH ROW EXECUTE FUNCTION public.sv_guard_local_cycle_project_scope();


--
-- Name: sv_entities sv_guard_local_entity_scope_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_local_entity_scope_mutation BEFORE UPDATE OF organization_id, project_id ON public.sv_entities FOR EACH ROW EXECUTE FUNCTION public.sv_guard_local_scope_parent_mutation();


--
-- Name: sv_business_locations sv_guard_local_location_scope_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_local_location_scope_mutation BEFORE UPDATE OF organization_id, entity_id ON public.sv_business_locations FOR EACH ROW EXECUTE FUNCTION public.sv_guard_local_scope_parent_mutation();


--
-- Name: sv_local_rank_observations sv_guard_local_observation_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_local_observation_before_insert BEFORE INSERT ON public.sv_local_rank_observations FOR EACH ROW EXECUTE FUNCTION public.sv_guard_local_observation_insert();


--
-- Name: sv_measurement_attempts sv_guard_measurement_attempt_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_measurement_attempt_mutation BEFORE INSERT OR DELETE OR UPDATE ON public.sv_measurement_attempts FOR EACH ROW EXECUTE FUNCTION public.sv_guard_measurement_attempt_mutation();


--
-- Name: sv_measurement_attempt_results sv_guard_measurement_attempt_result_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_measurement_attempt_result_insert BEFORE INSERT ON public.sv_measurement_attempt_results FOR EACH ROW EXECUTE FUNCTION public.sv_guard_measurement_attempt_result_insert();


--
-- Name: sv_outcome_observations sv_guard_outcome_observation_immutable_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_guard_outcome_observation_immutable_trigger BEFORE DELETE OR UPDATE ON public.sv_outcome_observations FOR EACH ROW EXECUTE FUNCTION public.sv_guard_outcome_observation_immutable();


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_claim_pair_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER sv_journal_no_spend_reconciliations_claim_pair_guard AFTER INSERT ON public.sv_journal_no_spend_reconciliations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.sv_require_journal_no_spend_claim_pair();


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_immutable_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_journal_no_spend_reconciliations_immutable_guard BEFORE DELETE OR UPDATE ON public.sv_journal_no_spend_reconciliations FOR EACH ROW EXECUTE FUNCTION public.sv_reject_journal_no_spend_reconciliation_mutation();


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_owner_insert_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_journal_no_spend_reconciliations_owner_insert_guard BEFORE INSERT ON public.sv_journal_no_spend_reconciliations FOR EACH ROW EXECUTE FUNCTION public.sv_guard_journal_no_spend_reconciliation_insert();


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_journal_no_spend_reconciliations_truncate_guard BEFORE TRUNCATE ON public.sv_journal_no_spend_reconciliations FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_journal_no_spend_reconciliation_mutation();


--
-- Name: sv_local_evidence_acceptances sv_local_acceptance_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_acceptance_guard BEFORE INSERT ON public.sv_local_evidence_acceptances FOR EACH ROW EXECUTE FUNCTION public.sv_local_acceptance_guard();


--
-- Name: sv_local_evidence_acceptances sv_local_acceptance_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_acceptance_immutable BEFORE DELETE OR UPDATE ON public.sv_local_evidence_acceptances FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_append_only();


--
-- Name: sv_local_evidence_acceptances sv_local_acceptance_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_acceptance_no_truncate BEFORE TRUNCATE ON public.sv_local_evidence_acceptances FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_pilot_append_only();


--
-- Name: sv_local_scan_cycles sv_local_budget_incident_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_budget_incident_guard BEFORE UPDATE ON public.sv_local_scan_cycles FOR EACH ROW EXECUTE FUNCTION public.sv_local_budget_incident_guard();


--
-- Name: sv_local_canary_reviews sv_local_canary_reviews_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_canary_reviews_immutable BEFORE DELETE OR UPDATE ON public.sv_local_canary_reviews FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_append_only();


--
-- Name: sv_local_canary_reviews sv_local_canary_reviews_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_canary_reviews_no_truncate BEFORE TRUNCATE ON public.sv_local_canary_reviews FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_pilot_append_only();


--
-- Name: sv_local_customer_runs sv_local_customer_run_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_customer_run_guard BEFORE DELETE OR UPDATE ON public.sv_local_customer_runs FOR EACH ROW EXECUTE FUNCTION public.sv_local_customer_run_guard();


--
-- Name: sv_local_customer_runs sv_local_customer_run_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_customer_run_no_truncate BEFORE TRUNCATE ON public.sv_local_customer_runs FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_evidence_index sv_local_customer_source_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_customer_source_guard BEFORE INSERT OR UPDATE ON public.sv_evidence_index FOR EACH ROW EXECUTE FUNCTION public.sv_local_customer_source_guard();


--
-- Name: sv_local_customer_runs sv_local_customer_start_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_customer_start_guard AFTER INSERT ON public.sv_local_customer_runs FOR EACH ROW EXECUTE FUNCTION public.sv_local_customer_start_guard();


--
-- Name: sv_local_customer_tasks sv_local_customer_task_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_customer_task_immutable BEFORE DELETE OR UPDATE ON public.sv_local_customer_tasks FOR EACH ROW EXECUTE FUNCTION public.sv_local_customer_task_immutable();


--
-- Name: sv_local_customer_tasks sv_local_customer_task_insert_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_customer_task_insert_guard BEFORE INSERT ON public.sv_local_customer_tasks FOR EACH ROW EXECUTE FUNCTION public.sv_local_customer_task_insert_guard();


--
-- Name: sv_local_customer_tasks sv_local_customer_task_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_customer_task_no_truncate BEFORE TRUNCATE ON public.sv_local_customer_tasks FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_local_report_deliveries sv_local_delivery_member_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_delivery_member_guard BEFORE INSERT OR UPDATE ON public.sv_local_report_deliveries FOR EACH ROW EXECUTE FUNCTION public.sv_local_delivery_member_guard();


--
-- Name: sv_local_dispatch_outbox sv_local_dispatch_outbox_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_dispatch_outbox_no_truncate BEFORE TRUNCATE ON public.sv_local_dispatch_outbox FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_pilot_append_only();


--
-- Name: sv_local_external_audits sv_local_external_audits_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_audits_immutable BEFORE DELETE OR UPDATE ON public.sv_local_external_audits FOR EACH ROW EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_local_external_audits sv_local_external_audits_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_audits_no_truncate BEFORE TRUNCATE ON public.sv_local_external_audits FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_local_external_publications sv_local_external_publication_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_publication_guard BEFORE INSERT ON public.sv_local_external_publications FOR EACH ROW EXECUTE FUNCTION public.sv_local_external_publication_guard();


--
-- Name: sv_local_external_publications sv_local_external_publications_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_publications_immutable BEFORE DELETE OR UPDATE ON public.sv_local_external_publications FOR EACH ROW EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_local_external_publications sv_local_external_publications_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_publications_no_truncate BEFORE TRUNCATE ON public.sv_local_external_publications FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_local_external_raw_evidence sv_local_external_raw_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_raw_guard BEFORE INSERT OR DELETE OR UPDATE ON public.sv_local_external_raw_evidence FOR EACH ROW EXECUTE FUNCTION public.sv_local_external_raw_guard();


--
-- Name: sv_local_external_raw_evidence sv_local_external_raw_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_raw_no_truncate BEFORE TRUNCATE ON public.sv_local_external_raw_evidence FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_local_external_audits sv_local_external_register_tasks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_register_tasks AFTER INSERT ON public.sv_local_external_audits FOR EACH ROW EXECUTE FUNCTION public.sv_local_external_register_tasks();


--
-- Name: sv_local_external_tasks sv_local_external_task_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_task_guard BEFORE INSERT ON public.sv_local_external_tasks FOR EACH ROW EXECUTE FUNCTION public.sv_local_external_task_guard();


--
-- Name: sv_local_external_tasks sv_local_external_tasks_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_tasks_immutable BEFORE DELETE OR UPDATE ON public.sv_local_external_tasks FOR EACH ROW EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_local_external_tasks sv_local_external_tasks_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_external_tasks_no_truncate BEFORE TRUNCATE ON public.sv_local_external_tasks FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_measurement_attempts sv_local_first_attempt_terminal_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_first_attempt_terminal_guard BEFORE UPDATE ON public.sv_measurement_attempts FOR EACH ROW EXECUTE FUNCTION public.sv_local_first_attempt_terminal_guard();


--
-- Name: sv_local_rank_observations sv_local_observation_acceptance_required; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER sv_local_observation_acceptance_required AFTER INSERT OR UPDATE ON public.sv_local_rank_observations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.sv_local_observation_acceptance_required();


--
-- Name: sv_local_order_publications sv_local_order_publication_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_order_publication_immutable BEFORE DELETE OR UPDATE ON public.sv_local_order_publications FOR EACH ROW EXECUTE FUNCTION public.sv_local_order_publication_immutable();


--
-- Name: sv_local_order_publications sv_local_order_publication_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_order_publication_no_truncate BEFORE TRUNCATE ON public.sv_local_order_publications FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_external_immutable();


--
-- Name: sv_measurement_attempts sv_local_pilot_attempt_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_pilot_attempt_guard BEFORE INSERT OR UPDATE ON public.sv_measurement_attempts FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_attempt_guard();


--
-- Name: sv_local_canary_reviews sv_local_pilot_canary_review_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_pilot_canary_review_guard BEFORE INSERT ON public.sv_local_canary_reviews FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_canary_review_guard();


--
-- Name: sv_local_scan_cycles sv_local_pilot_cycle_identity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER sv_local_pilot_cycle_identity AFTER INSERT OR UPDATE ON public.sv_local_scan_cycles DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_cycle_guard();


--
-- Name: sv_local_report_deliveries sv_local_pilot_delivery_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_pilot_delivery_guard BEFORE INSERT OR DELETE OR UPDATE ON public.sv_local_report_deliveries FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_delivery_guard();


--
-- Name: sv_local_rank_observations sv_local_pilot_observation_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_pilot_observation_guard BEFORE DELETE OR UPDATE ON public.sv_local_rank_observations FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_observation_guard();


--
-- Name: sv_local_dispatch_outbox sv_local_pilot_outbox_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_pilot_outbox_guard BEFORE INSERT OR DELETE OR UPDATE ON public.sv_local_dispatch_outbox FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_outbox_guard();


--
-- Name: sv_local_report_versions sv_local_pilot_report_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_pilot_report_guard BEFORE INSERT OR DELETE OR UPDATE ON public.sv_local_report_versions FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_report_guard();


--
-- Name: sv_local_qc_decisions sv_local_qc_actor_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_qc_actor_guard BEFORE INSERT ON public.sv_local_qc_decisions FOR EACH ROW EXECUTE FUNCTION public.sv_local_qc_actor_guard();


--
-- Name: sv_local_qc_decisions sv_local_qc_decisions_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_qc_decisions_immutable BEFORE DELETE OR UPDATE ON public.sv_local_qc_decisions FOR EACH ROW EXECUTE FUNCTION public.sv_local_pilot_append_only();


--
-- Name: sv_local_qc_decisions sv_local_qc_decisions_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_qc_decisions_no_truncate BEFORE TRUNCATE ON public.sv_local_qc_decisions FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_pilot_append_only();


--
-- Name: sv_local_report_deliveries sv_local_report_deliveries_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_report_deliveries_no_truncate BEFORE TRUNCATE ON public.sv_local_report_deliveries FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_pilot_append_only();


--
-- Name: sv_local_report_versions sv_local_report_evidence_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_report_evidence_guard BEFORE INSERT OR UPDATE ON public.sv_local_report_versions FOR EACH ROW EXECUTE FUNCTION public.sv_local_report_evidence_guard();


--
-- Name: sv_local_report_versions sv_local_report_versions_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_local_report_versions_no_truncate BEFORE TRUNCATE ON public.sv_local_report_versions FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_pilot_append_only();


--
-- Name: sv_measurement_cycles sv_measurement_cycles_accepted_evidence_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_measurement_cycles_accepted_evidence_guard BEFORE DELETE OR UPDATE ON public.sv_measurement_cycles FOR EACH ROW EXECUTE FUNCTION public.sv_reject_accepted_evidence_dependency_mutation();


--
-- Name: sv_measurement_datasets sv_measurement_datasets_accepted_evidence_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_measurement_datasets_accepted_evidence_guard BEFORE DELETE OR UPDATE ON public.sv_measurement_datasets FOR EACH ROW EXECUTE FUNCTION public.sv_reject_accepted_evidence_dependency_mutation();


--
-- Name: sv_api_idempotency_records sv_prevent_api_idempotency_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_api_idempotency_truncate BEFORE TRUNCATE ON public.sv_api_idempotency_records FOR EACH STATEMENT EXECUTE FUNCTION public.sv_prevent_api_idempotency_truncate();


--
-- Name: sv_configuration_locks sv_prevent_configuration_lock_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_configuration_lock_mutation BEFORE DELETE OR UPDATE ON public.sv_configuration_locks FOR EACH ROW EXECUTE FUNCTION public.sv_prevent_configuration_lock_mutation();


--
-- Name: sv_configuration_locks sv_prevent_configuration_lock_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_configuration_lock_truncate BEFORE TRUNCATE ON public.sv_configuration_locks FOR EACH STATEMENT EXECUTE FUNCTION public.sv_prevent_configuration_lock_mutation();


--
-- Name: sv_cost_events sv_prevent_cost_event_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_cost_event_mutation BEFORE DELETE OR UPDATE ON public.sv_cost_events FOR EACH ROW EXECUTE FUNCTION public.sv_prevent_cost_event_mutation();


--
-- Name: sv_cost_events sv_prevent_cost_event_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_cost_event_truncate BEFORE TRUNCATE ON public.sv_cost_events FOR EACH STATEMENT EXECUTE FUNCTION public.sv_prevent_cost_event_mutation();


--
-- Name: sv_journal_daily_claims sv_prevent_journal_daily_claim_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_journal_daily_claim_truncate BEFORE TRUNCATE ON public.sv_journal_daily_claims FOR EACH STATEMENT EXECUTE FUNCTION public.sv_prevent_journal_daily_claim_truncate();


--
-- Name: sv_journal_provider_boundaries sv_prevent_journal_provider_boundary_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_journal_provider_boundary_mutation BEFORE DELETE OR UPDATE ON public.sv_journal_provider_boundaries FOR EACH ROW EXECUTE FUNCTION public.sv_prevent_journal_provider_boundary_mutation();


--
-- Name: sv_journal_provider_boundaries sv_prevent_journal_provider_boundary_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_journal_provider_boundary_truncate BEFORE TRUNCATE ON public.sv_journal_provider_boundaries FOR EACH STATEMENT EXECUTE FUNCTION public.sv_prevent_journal_provider_boundary_mutation();


--
-- Name: sv_local_scan_cycles sv_prevent_local_economics_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_local_economics_update BEFORE UPDATE ON public.sv_local_scan_cycles FOR EACH ROW EXECUTE FUNCTION public.sv_prevent_local_economics_mutation();


--
-- Name: sv_measurement_attempt_results sv_prevent_measurement_attempt_result_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_measurement_attempt_result_mutation BEFORE DELETE OR UPDATE ON public.sv_measurement_attempt_results FOR EACH ROW EXECUTE FUNCTION public.sv_prevent_measurement_attempt_result_mutation();


--
-- Name: sv_measurement_attempt_results sv_prevent_measurement_attempt_result_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_measurement_attempt_result_truncate BEFORE TRUNCATE ON public.sv_measurement_attempt_results FOR EACH STATEMENT EXECUTE FUNCTION public.sv_prevent_measurement_attempt_result_mutation();


--
-- Name: sv_grid_definitions sv_prevent_used_grid_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_prevent_used_grid_update BEFORE DELETE OR UPDATE ON public.sv_grid_definitions FOR EACH ROW EXECUTE FUNCTION public.sv_prevent_used_grid_mutation();


--
-- Name: sv_provider_canary_executions sv_provider_canary_executions_immutable_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_canary_executions_immutable_guard BEFORE DELETE OR UPDATE ON public.sv_provider_canary_executions FOR EACH ROW EXECUTE FUNCTION public.sv_reject_provider_canary_execution_mutation();


--
-- Name: sv_provider_canary_executions sv_provider_canary_executions_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_canary_executions_truncate_guard BEFORE TRUNCATE ON public.sv_provider_canary_executions FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_provider_canary_execution_mutation();


--
-- Name: sv_provider_dataset_capabilities sv_provider_dataset_capabilities_immutable_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_dataset_capabilities_immutable_guard BEFORE DELETE OR UPDATE ON public.sv_provider_dataset_capabilities FOR EACH ROW EXECUTE FUNCTION public.sv_reject_provider_dataset_capability_mutation();


--
-- Name: sv_provider_dataset_capabilities sv_provider_dataset_capabilities_owner_insert_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_dataset_capabilities_owner_insert_guard BEFORE INSERT ON public.sv_provider_dataset_capabilities FOR EACH ROW EXECUTE FUNCTION public.sv_enforce_provider_capability_insert_scope();


--
-- Name: sv_provider_dataset_capabilities sv_provider_dataset_capabilities_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_dataset_capabilities_truncate_guard BEFORE TRUNCATE ON public.sv_provider_dataset_capabilities FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_provider_dataset_capability_mutation();


--
-- Name: sv_provider_dataset_capabilities sv_provider_dataset_capabilities_version_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_dataset_capabilities_version_guard BEFORE INSERT ON public.sv_provider_dataset_capabilities FOR EACH ROW EXECUTE FUNCTION public.sv_enforce_provider_dataset_capability_version();


--
-- Name: sv_provider_dataset_snapshot_events sv_provider_dataset_snapshot_events_immutable_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_dataset_snapshot_events_immutable_guard BEFORE DELETE OR UPDATE ON public.sv_provider_dataset_snapshot_events FOR EACH ROW EXECUTE FUNCTION public.sv_reject_provider_dataset_snapshot_event_mutation();


--
-- Name: sv_provider_dataset_snapshot_events sv_provider_dataset_snapshot_events_insert_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_dataset_snapshot_events_insert_guard BEFORE INSERT ON public.sv_provider_dataset_snapshot_events FOR EACH ROW EXECUTE FUNCTION public.sv_enforce_provider_dataset_snapshot_event_insert();


--
-- Name: sv_provider_dataset_snapshot_events sv_provider_dataset_snapshot_events_journal_no_spend_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_dataset_snapshot_events_journal_no_spend_guard BEFORE INSERT ON public.sv_provider_dataset_snapshot_events FOR EACH ROW EXECUTE FUNCTION public.sv_reject_journal_no_spend_provider_snapshot_insert();


--
-- Name: sv_provider_dataset_snapshot_events sv_provider_dataset_snapshot_events_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_provider_dataset_snapshot_events_truncate_guard BEFORE TRUNCATE ON public.sv_provider_dataset_snapshot_events FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_provider_dataset_snapshot_event_mutation();


--
-- Name: sv_runs sv_require_journal_provider_boundary; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER sv_require_journal_provider_boundary AFTER INSERT ON public.sv_runs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.sv_require_journal_provider_boundary();


--
-- Name: sv_response_mentions sv_response_mentions_journal_no_spend_dependency_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_response_mentions_journal_no_spend_dependency_guard BEFORE INSERT OR DELETE OR UPDATE ON public.sv_response_mentions FOR EACH ROW EXECUTE FUNCTION public.sv_reject_journal_no_spend_outcome_mutation();


--
-- Name: sv_response_mentions sv_response_mentions_journal_no_spend_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_response_mentions_journal_no_spend_truncate_guard BEFORE TRUNCATE ON public.sv_response_mentions FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_journal_no_spend_execution_truncate();


--
-- Name: sv_run_permits sv_run_permits_journal_no_spend_dependency_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_run_permits_journal_no_spend_dependency_guard BEFORE INSERT OR DELETE OR UPDATE ON public.sv_run_permits FOR EACH ROW EXECUTE FUNCTION public.sv_reject_journal_no_spend_dependency_mutation();


--
-- Name: sv_run_permits sv_run_permits_journal_no_spend_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_run_permits_journal_no_spend_truncate_guard BEFORE TRUNCATE ON public.sv_run_permits FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_journal_no_spend_execution_truncate();


--
-- Name: sv_runs sv_runs_journal_no_spend_dependency_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_runs_journal_no_spend_dependency_guard BEFORE INSERT OR DELETE OR UPDATE ON public.sv_runs FOR EACH ROW EXECUTE FUNCTION public.sv_reject_journal_no_spend_dependency_mutation();


--
-- Name: sv_runs sv_runs_journal_no_spend_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_runs_journal_no_spend_truncate_guard BEFORE TRUNCATE ON public.sv_runs FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_journal_no_spend_execution_truncate();


--
-- Name: sv_source_snapshots sv_source_snapshots_immutable_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_source_snapshots_immutable_guard BEFORE DELETE OR UPDATE ON public.sv_source_snapshots FOR EACH ROW EXECUTE FUNCTION public.sv_reject_evidence_mutation();


--
-- Name: sv_source_snapshots sv_source_snapshots_provider_contract_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_source_snapshots_provider_contract_guard BEFORE INSERT OR UPDATE ON public.sv_source_snapshots FOR EACH ROW EXECUTE FUNCTION public.sv_enforce_provider_snapshot_contract();


--
-- Name: sv_source_snapshots sv_source_snapshots_runtime_promotion_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_source_snapshots_runtime_promotion_guard BEFORE INSERT ON public.sv_source_snapshots FOR EACH ROW EXECUTE FUNCTION public.sv_restrict_runtime_source_snapshot_promotion();


--
-- Name: sv_source_snapshots sv_source_snapshots_truncate_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_source_snapshots_truncate_guard BEFORE TRUNCATE ON public.sv_source_snapshots FOR EACH STATEMENT EXECUTE FUNCTION public.sv_reject_evidence_mutation();


--
-- Name: sv_local_scan_cycles sv_validate_local_cycle_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_validate_local_cycle_before_insert BEFORE INSERT ON public.sv_local_scan_cycles FOR EACH ROW EXECUTE FUNCTION public.sv_validate_local_cycle();


--
-- Name: sv_outcome_sources sv_validate_outcome_source_scope_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_validate_outcome_source_scope_trigger BEFORE INSERT OR UPDATE OF organization_id, project_id, location_id ON public.sv_outcome_sources FOR EACH ROW EXECUTE FUNCTION public.sv_validate_outcome_source_scope();


--
-- Name: sv_outcome_attribution_windows sv_validate_outcome_window_scope_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sv_validate_outcome_window_scope_trigger BEFORE INSERT OR UPDATE ON public.sv_outcome_attribution_windows FOR EACH ROW EXECUTE FUNCTION public.sv_validate_outcome_window_scope();


--
-- Name: job_common dlq_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job_common
    ADD CONSTRAINT dlq_fkey FOREIGN KEY (dead_letter) REFERENCES pgboss.queue(name) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: job_common q_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.job_common
    ADD CONSTRAINT q_fkey FOREIGN KEY (name) REFERENCES pgboss.queue(name) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: queue queue_dead_letter_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.queue
    ADD CONSTRAINT queue_dead_letter_fkey FOREIGN KEY (dead_letter) REFERENCES pgboss.queue(name);


--
-- Name: schedule schedule_name_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.schedule
    ADD CONSTRAINT schedule_name_fkey FOREIGN KEY (name) REFERENCES pgboss.queue(name) ON DELETE CASCADE;


--
-- Name: subscription subscription_name_fkey; Type: FK CONSTRAINT; Schema: pgboss; Owner: -
--

ALTER TABLE ONLY pgboss.subscription
    ADD CONSTRAINT subscription_name_fkey FOREIGN KEY (name) REFERENCES pgboss.queue(name) ON DELETE CASCADE;


--
-- Name: account account_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: brand_opportunities brand_opportunities_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_opportunities
    ADD CONSTRAINT brand_opportunities_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: brands brands_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: citations citations_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citations
    ADD CONSTRAINT citations_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: citations citations_prompt_id_prompts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citations
    ADD CONSTRAINT citations_prompt_id_prompts_id_fk FOREIGN KEY (prompt_id) REFERENCES public.prompts(id);


--
-- Name: citations citations_prompt_run_id_prompt_runs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.citations
    ADD CONSTRAINT citations_prompt_run_id_prompt_runs_id_fk FOREIGN KEY (prompt_run_id) REFERENCES public.prompt_runs(id);


--
-- Name: competitors competitors_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitors
    ADD CONSTRAINT competitors_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: invitation invitation_inviter_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation
    ADD CONSTRAINT invitation_inviter_id_user_id_fk FOREIGN KEY (inviter_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation
    ADD CONSTRAINT invitation_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id) ON DELETE CASCADE;


--
-- Name: member member_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id) ON DELETE CASCADE;


--
-- Name: member member_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: organization_settings organization_settings_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_settings
    ADD CONSTRAINT organization_settings_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: prompt_run_hourly_aggregates prompt_run_hourly_aggregates_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_run_hourly_aggregates
    ADD CONSTRAINT prompt_run_hourly_aggregates_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: prompt_run_hourly_aggregates prompt_run_hourly_aggregates_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_run_hourly_aggregates
    ADD CONSTRAINT prompt_run_hourly_aggregates_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompts(id) ON DELETE CASCADE;


--
-- Name: prompt_runs prompt_runs_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_runs
    ADD CONSTRAINT prompt_runs_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: prompt_runs prompt_runs_prompt_id_prompts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_runs
    ADD CONSTRAINT prompt_runs_prompt_id_prompts_id_fk FOREIGN KEY (prompt_id) REFERENCES public.prompts(id);


--
-- Name: prompts prompts_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: reports reports_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: session session_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: sso_provider sso_provider_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sso_provider
    ADD CONSTRAINT sso_provider_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: sv_action_approvals sv_action_approvals_action_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_action_approvals
    ADD CONSTRAINT sv_action_approvals_action_organization_fk FOREIGN KEY (action_id, organization_id) REFERENCES public.sv_approved_actions(id, organization_id);


--
-- Name: sv_action_approvals sv_action_approvals_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_action_approvals
    ADD CONSTRAINT sv_action_approvals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_api_idempotency_records sv_api_idempotency_records_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_api_idempotency_records
    ADD CONSTRAINT sv_api_idempotency_records_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_api_keys sv_api_keys_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_api_keys
    ADD CONSTRAINT sv_api_keys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_approved_actions sv_approved_actions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_approved_actions
    ADD CONSTRAINT sv_approved_actions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_approved_actions sv_approved_actions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_approved_actions
    ADD CONSTRAINT sv_approved_actions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_measurement_attempts sv_attempt_local_observation_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_attempts
    ADD CONSTRAINT sv_attempt_local_observation_org_fk FOREIGN KEY (organization_id, local_observation_id) REFERENCES public.sv_local_rank_observations(organization_id, id);


--
-- Name: sv_attribution_assessments sv_attribution_assessments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_attribution_assessments
    ADD CONSTRAINT sv_attribution_assessments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_attribution_assessments sv_attribution_assessments_outcome_window_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_attribution_assessments
    ADD CONSTRAINT sv_attribution_assessments_outcome_window_fk FOREIGN KEY (outcome_window_id, organization_id, verification_cycle_id, action_id, baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id, metric_key) REFERENCES public.sv_outcome_attribution_windows(id, organization_id, verification_cycle_id, action_id, baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id, metric_key);


--
-- Name: sv_attribution_assessments sv_attribution_assessments_verification_chain_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_attribution_assessments
    ADD CONSTRAINT sv_attribution_assessments_verification_chain_fk FOREIGN KEY (verification_cycle_id, organization_id, action_id, baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id) REFERENCES public.sv_verification_cycles(id, organization_id, action_id, baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id);


--
-- Name: sv_audit_events sv_audit_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_audit_events
    ADD CONSTRAINT sv_audit_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_business_locations sv_business_locations_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_business_locations
    ADD CONSTRAINT sv_business_locations_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.sv_entities(id);


--
-- Name: sv_business_locations sv_business_locations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_business_locations
    ADD CONSTRAINT sv_business_locations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_capture_tasks sv_capture_tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_capture_tasks
    ADD CONSTRAINT sv_capture_tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_capture_tasks sv_capture_tasks_pilot_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_capture_tasks
    ADD CONSTRAINT sv_capture_tasks_pilot_cycle_id_fkey FOREIGN KEY (pilot_cycle_id) REFERENCES public.sv_pilot_cycles(id);


--
-- Name: sv_capture_tasks sv_capture_tasks_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_capture_tasks
    ADD CONSTRAINT sv_capture_tasks_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.sv_scenarios(id);


--
-- Name: sv_change_event_assets sv_change_event_assets_event_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_change_event_assets
    ADD CONSTRAINT sv_change_event_assets_event_organization_fk FOREIGN KEY (change_event_id, organization_id) REFERENCES public.sv_change_events(id, organization_id);


--
-- Name: sv_change_event_assets sv_change_event_assets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_change_event_assets
    ADD CONSTRAINT sv_change_event_assets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_change_events sv_change_events_action_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_change_events
    ADD CONSTRAINT sv_change_events_action_organization_fk FOREIGN KEY (action_id, organization_id) REFERENCES public.sv_approved_actions(id, organization_id);


--
-- Name: sv_change_events sv_change_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_change_events
    ADD CONSTRAINT sv_change_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_change_events sv_change_events_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_change_events
    ADD CONSTRAINT sv_change_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_citation_gap_snapshots sv_citation_gap_snapshots_configuration_lock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_citation_gap_snapshots
    ADD CONSTRAINT sv_citation_gap_snapshots_configuration_lock_id_fkey FOREIGN KEY (configuration_lock_id) REFERENCES public.sv_configuration_locks(id);


--
-- Name: sv_citation_gap_snapshots sv_citation_gap_snapshots_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_citation_gap_snapshots
    ADD CONSTRAINT sv_citation_gap_snapshots_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_citation_gap_snapshots sv_citation_gap_snapshots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_citation_gap_snapshots
    ADD CONSTRAINT sv_citation_gap_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_citation_gap_snapshots sv_citation_gap_snapshots_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_citation_gap_snapshots
    ADD CONSTRAINT sv_citation_gap_snapshots_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_configuration_locks sv_configuration_locks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_configuration_locks
    ADD CONSTRAINT sv_configuration_locks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_configuration_locks sv_configuration_locks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_configuration_locks
    ADD CONSTRAINT sv_configuration_locks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_configuration_locks sv_configuration_locks_project_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_configuration_locks
    ADD CONSTRAINT sv_configuration_locks_project_organization_fk FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);


--
-- Name: sv_cost_events sv_cost_events_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cost_events
    ADD CONSTRAINT sv_cost_events_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_cost_events sv_cost_events_domain_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cost_events
    ADD CONSTRAINT sv_cost_events_domain_id_fk FOREIGN KEY (domain_id) REFERENCES public.sv_measurement_domains(domain_id);


--
-- Name: sv_cost_events sv_cost_events_measurement_domain_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cost_events
    ADD CONSTRAINT sv_cost_events_measurement_domain_fk FOREIGN KEY (measurement_cycle_id, domain_id, organization_id) REFERENCES public.sv_measurement_cycles(id, domain_id, organization_id);


--
-- Name: sv_cost_events sv_cost_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cost_events
    ADD CONSTRAINT sv_cost_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_cost_events sv_cost_events_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cost_events
    ADD CONSTRAINT sv_cost_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.sv_runs(id);


--
-- Name: sv_cycles sv_cycles_lock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cycles
    ADD CONSTRAINT sv_cycles_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.sv_configuration_locks(id);


--
-- Name: sv_cycles sv_cycles_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cycles
    ADD CONSTRAINT sv_cycles_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sv_orders(id);


--
-- Name: sv_cycles sv_cycles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_cycles
    ADD CONSTRAINT sv_cycles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_entities sv_entities_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_entities
    ADD CONSTRAINT sv_entities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_entities sv_entities_parent_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_entities
    ADD CONSTRAINT sv_entities_parent_entity_id_fkey FOREIGN KEY (parent_entity_id) REFERENCES public.sv_entities(id);


--
-- Name: sv_entities sv_entities_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_entities
    ADD CONSTRAINT sv_entities_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_evidence_acceptance_receipts sv_evidence_acceptance_receipts_evidence_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_acceptance_receipts
    ADD CONSTRAINT sv_evidence_acceptance_receipts_evidence_org_fk FOREIGN KEY (evidence_id, organization_id) REFERENCES public.sv_evidence_index(id, organization_id);


--
-- Name: sv_evidence_acceptance_receipts sv_evidence_acceptance_receipts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_acceptance_receipts
    ADD CONSTRAINT sv_evidence_acceptance_receipts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_evidence_index sv_evidence_index_cycle_domain_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_cycle_domain_fk FOREIGN KEY (cycle_id, domain_id, organization_id) REFERENCES public.sv_measurement_cycles(id, domain_id, organization_id);


--
-- Name: sv_evidence_index sv_evidence_index_dataset_cycle_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_dataset_cycle_org_fk FOREIGN KEY (dataset_id, cycle_id, organization_id) REFERENCES public.sv_measurement_datasets(id, cycle_id, organization_id);


--
-- Name: sv_evidence_index sv_evidence_index_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.sv_measurement_datasets(id);


--
-- Name: sv_evidence_index sv_evidence_index_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.sv_measurement_domains(domain_id);


--
-- Name: sv_evidence_index sv_evidence_index_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_evidence_index sv_evidence_index_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_project_org_fk FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);


--
-- Name: sv_evidence_index sv_evidence_index_source_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_source_snapshot_id_fkey FOREIGN KEY (source_snapshot_id) REFERENCES public.sv_source_snapshots(id);


--
-- Name: sv_evidence_index sv_evidence_index_source_snapshot_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_evidence_index
    ADD CONSTRAINT sv_evidence_index_source_snapshot_project_org_fk FOREIGN KEY (source_snapshot_id, project_id, organization_id) REFERENCES public.sv_source_snapshots(id, project_id, organization_id);


--
-- Name: sv_findings sv_findings_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_findings
    ADD CONSTRAINT sv_findings_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_findings sv_findings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_findings
    ADD CONSTRAINT sv_findings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_free_ai_visibility_checks sv_free_ai_visibility_checks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_free_ai_visibility_checks
    ADD CONSTRAINT sv_free_ai_visibility_checks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_free_ai_visibility_checks sv_free_ai_visibility_checks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_free_ai_visibility_checks
    ADD CONSTRAINT sv_free_ai_visibility_checks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: sv_grid_definitions sv_grid_definitions_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_grid_definitions
    ADD CONSTRAINT sv_grid_definitions_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.sv_business_locations(id);


--
-- Name: sv_grid_definitions sv_grid_definitions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_grid_definitions
    ADD CONSTRAINT sv_grid_definitions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_grid_points sv_grid_points_grid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_grid_points
    ADD CONSTRAINT sv_grid_points_grid_id_fkey FOREIGN KEY (grid_id) REFERENCES public.sv_grid_definitions(id);


--
-- Name: sv_grid_points sv_grid_points_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_grid_points
    ADD CONSTRAINT sv_grid_points_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_incidents sv_incidents_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_incidents
    ADD CONSTRAINT sv_incidents_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_incidents sv_incidents_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_incidents
    ADD CONSTRAINT sv_incidents_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sv_orders(id);


--
-- Name: sv_incidents sv_incidents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_incidents
    ADD CONSTRAINT sv_incidents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_journal_daily_claims sv_journal_daily_claims_lock_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_daily_claims
    ADD CONSTRAINT sv_journal_daily_claims_lock_project_org_fk FOREIGN KEY (configuration_lock_id, project_id, organization_id) REFERENCES public.sv_configuration_locks(id, project_id, organization_id);


--
-- Name: sv_journal_daily_claims sv_journal_daily_claims_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_daily_claims
    ADD CONSTRAINT sv_journal_daily_claims_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_journal_daily_claims sv_journal_daily_claims_project_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_daily_claims
    ADD CONSTRAINT sv_journal_daily_claims_project_organization_fk FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_claim_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_no_spend_reconciliations
    ADD CONSTRAINT sv_journal_no_spend_reconciliations_claim_fk FOREIGN KEY (claim_id) REFERENCES public.sv_journal_daily_claims(id);


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_lock_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_no_spend_reconciliations
    ADD CONSTRAINT sv_journal_no_spend_reconciliations_lock_project_org_fk FOREIGN KEY (configuration_lock_id, project_id, organization_id) REFERENCES public.sv_configuration_locks(id, project_id, organization_id);


--
-- Name: sv_journal_no_spend_reconciliations sv_journal_no_spend_reconciliations_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_no_spend_reconciliations
    ADD CONSTRAINT sv_journal_no_spend_reconciliations_project_org_fk FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);


--
-- Name: sv_journal_provider_boundaries sv_journal_provider_boundaries_claim_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_provider_boundaries
    ADD CONSTRAINT sv_journal_provider_boundaries_claim_fk FOREIGN KEY (journal_claim_id) REFERENCES public.sv_journal_daily_claims(id);


--
-- Name: sv_journal_provider_boundaries sv_journal_provider_boundaries_cycle_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_provider_boundaries
    ADD CONSTRAINT sv_journal_provider_boundaries_cycle_fk FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_journal_provider_boundaries sv_journal_provider_boundaries_lock_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_provider_boundaries
    ADD CONSTRAINT sv_journal_provider_boundaries_lock_project_org_fk FOREIGN KEY (configuration_lock_id, project_id, organization_id) REFERENCES public.sv_configuration_locks(id, project_id, organization_id);


--
-- Name: sv_journal_provider_boundaries sv_journal_provider_boundaries_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_provider_boundaries
    ADD CONSTRAINT sv_journal_provider_boundaries_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_journal_provider_boundaries sv_journal_provider_boundaries_permit_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_provider_boundaries
    ADD CONSTRAINT sv_journal_provider_boundaries_permit_fk FOREIGN KEY (permit_id) REFERENCES public.sv_run_permits(id);


--
-- Name: sv_journal_provider_boundaries sv_journal_provider_boundaries_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_provider_boundaries
    ADD CONSTRAINT sv_journal_provider_boundaries_project_org_fk FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);


--
-- Name: sv_journal_provider_boundaries sv_journal_provider_boundaries_run_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_journal_provider_boundaries
    ADD CONSTRAINT sv_journal_provider_boundaries_run_fk FOREIGN KEY (run_id) REFERENCES public.sv_runs(id);


--
-- Name: sv_local_ai_cost_events sv_local_ai_cost_events_evidence_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_cost_events
    ADD CONSTRAINT sv_local_ai_cost_events_evidence_id_organization_id_fkey FOREIGN KEY (evidence_id, organization_id) REFERENCES public.sv_local_ai_evidence(id, organization_id);


--
-- Name: sv_local_ai_cost_events sv_local_ai_cost_events_slot_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_cost_events
    ADD CONSTRAINT sv_local_ai_cost_events_slot_id_organization_id_fkey FOREIGN KEY (slot_id, organization_id) REFERENCES public.sv_local_ai_slots(id, organization_id);


--
-- Name: sv_local_ai_events sv_local_ai_events_order_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_events
    ADD CONSTRAINT sv_local_ai_events_order_id_organization_id_fkey FOREIGN KEY (order_id, organization_id) REFERENCES public.sv_local_ai_orders(id, organization_id);


--
-- Name: sv_local_ai_evidence sv_local_ai_evidence_slot_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_evidence
    ADD CONSTRAINT sv_local_ai_evidence_slot_id_organization_id_fkey FOREIGN KEY (slot_id, organization_id) REFERENCES public.sv_local_ai_slots(id, organization_id);


--
-- Name: sv_local_ai_orders sv_local_ai_orders_location_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_location_id_organization_id_fkey FOREIGN KEY (location_id, organization_id) REFERENCES public.sv_business_locations(id, organization_id);


--
-- Name: sv_local_ai_orders sv_local_ai_orders_project_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_project_id_organization_id_fkey FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);


--
-- Name: sv_local_ai_payments sv_local_ai_payments_order_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_payments
    ADD CONSTRAINT sv_local_ai_payments_order_id_organization_id_fkey FOREIGN KEY (order_id, organization_id) REFERENCES public.sv_local_ai_orders(id, organization_id);


--
-- Name: sv_local_ai_slots sv_local_ai_slots_order_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_order_id_organization_id_fkey FOREIGN KEY (order_id, organization_id) REFERENCES public.sv_local_ai_orders(id, organization_id);


--
-- Name: sv_local_canary_reviews sv_local_canary_reviews_evidence_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_canary_reviews
    ADD CONSTRAINT sv_local_canary_reviews_evidence_id_organization_id_fkey FOREIGN KEY (evidence_id, organization_id) REFERENCES public.sv_source_snapshots(id, organization_id);


--
-- Name: sv_local_canary_reviews sv_local_canary_reviews_organization_id_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_canary_reviews
    ADD CONSTRAINT sv_local_canary_reviews_organization_id_attempt_id_fkey FOREIGN KEY (organization_id, attempt_id) REFERENCES public.sv_measurement_attempts(organization_id, id);


--
-- Name: sv_local_canary_reviews sv_local_canary_reviews_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_canary_reviews
    ADD CONSTRAINT sv_local_canary_reviews_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_canary_reviews sv_local_canary_reviews_organization_id_local_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_canary_reviews
    ADD CONSTRAINT sv_local_canary_reviews_organization_id_local_cycle_id_fkey FOREIGN KEY (organization_id, local_cycle_id) REFERENCES public.sv_local_scan_cycles(organization_id, id);


--
-- Name: sv_local_competitor_observations sv_local_competitor_observations_matched_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_competitor_observations
    ADD CONSTRAINT sv_local_competitor_observations_matched_entity_id_fkey FOREIGN KEY (matched_entity_id) REFERENCES public.sv_entities(id);


--
-- Name: sv_local_competitor_observations sv_local_competitor_observations_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_competitor_observations
    ADD CONSTRAINT sv_local_competitor_observations_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES public.sv_local_rank_observations(id);


--
-- Name: sv_local_competitor_observations sv_local_competitor_observations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_competitor_observations
    ADD CONSTRAINT sv_local_competitor_observations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_customer_runs sv_local_customer_runs_order_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_customer_runs
    ADD CONSTRAINT sv_local_customer_runs_order_id_organization_id_fkey FOREIGN KEY (order_id, organization_id) REFERENCES public.sv_orders(id, organization_id);


--
-- Name: sv_local_customer_tasks sv_local_customer_tasks_order_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_customer_tasks
    ADD CONSTRAINT sv_local_customer_tasks_order_id_organization_id_fkey FOREIGN KEY (order_id, organization_id) REFERENCES public.sv_local_customer_runs(order_id, organization_id);


--
-- Name: sv_local_scan_cycles sv_local_cycle_canary_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_cycle_canary_org_fk FOREIGN KEY (organization_id, approved_canary_review_id) REFERENCES public.sv_local_canary_reviews(organization_id, id);


--
-- Name: sv_local_scan_cycles sv_local_cycle_grid_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_cycle_grid_org_fk FOREIGN KEY (organization_id, grid_definition_id) REFERENCES public.sv_grid_definitions(organization_id, id) NOT VALID;


--
-- Name: sv_local_scan_cycles sv_local_cycle_location_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_cycle_location_org_fk FOREIGN KEY (organization_id, location_id) REFERENCES public.sv_business_locations(organization_id, id) NOT VALID;


--
-- Name: sv_local_dispatch_outbox sv_local_dispatch_outbox_organization_id_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_dispatch_outbox
    ADD CONSTRAINT sv_local_dispatch_outbox_organization_id_attempt_id_fkey FOREIGN KEY (organization_id, attempt_id) REFERENCES public.sv_measurement_attempts(organization_id, id);


--
-- Name: sv_local_dispatch_outbox sv_local_dispatch_outbox_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_dispatch_outbox
    ADD CONSTRAINT sv_local_dispatch_outbox_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_dispatch_outbox sv_local_dispatch_outbox_organization_id_local_cycle_id_me_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_dispatch_outbox
    ADD CONSTRAINT sv_local_dispatch_outbox_organization_id_local_cycle_id_me_fkey FOREIGN KEY (organization_id, local_cycle_id, measurement_cycle_id) REFERENCES public.sv_local_scan_cycles(organization_id, id, measurement_cycle_id);


--
-- Name: sv_local_dispatch_outbox sv_local_dispatch_outbox_organization_id_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_dispatch_outbox
    ADD CONSTRAINT sv_local_dispatch_outbox_organization_id_observation_id_fkey FOREIGN KEY (organization_id, observation_id) REFERENCES public.sv_local_rank_observations(organization_id, id);


--
-- Name: sv_local_evidence_acceptances sv_local_evidence_acceptances_evidence_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_evidence_acceptances
    ADD CONSTRAINT sv_local_evidence_acceptances_evidence_id_organization_id_fkey FOREIGN KEY (evidence_id, organization_id) REFERENCES public.sv_evidence_index(id, organization_id);


--
-- Name: sv_local_evidence_acceptances sv_local_evidence_acceptances_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_evidence_acceptances
    ADD CONSTRAINT sv_local_evidence_acceptances_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES public.sv_local_rank_observations(id);


--
-- Name: sv_local_evidence_acceptances sv_local_evidence_acceptances_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_evidence_acceptances
    ADD CONSTRAINT sv_local_evidence_acceptances_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_external_audits sv_local_external_audits_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_audits
    ADD CONSTRAINT sv_local_external_audits_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_external_publications sv_local_external_publication_organization_id_report_versi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_publications
    ADD CONSTRAINT sv_local_external_publication_organization_id_report_versi_fkey FOREIGN KEY (organization_id, report_version_id) REFERENCES public.sv_local_report_versions(organization_id, id);


--
-- Name: sv_local_external_publications sv_local_external_publications_audit_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_publications
    ADD CONSTRAINT sv_local_external_publications_audit_id_organization_id_fkey FOREIGN KEY (audit_id, organization_id) REFERENCES public.sv_local_external_audits(id, organization_id);


--
-- Name: sv_local_external_raw_evidence sv_local_external_raw_evidence_audit_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_raw_evidence
    ADD CONSTRAINT sv_local_external_raw_evidence_audit_id_organization_id_fkey FOREIGN KEY (audit_id, organization_id) REFERENCES public.sv_local_external_audits(id, organization_id);


--
-- Name: sv_local_external_raw_evidence sv_local_external_raw_evidence_provider_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_raw_evidence
    ADD CONSTRAINT sv_local_external_raw_evidence_provider_task_id_fkey FOREIGN KEY (provider_task_id) REFERENCES public.sv_local_external_tasks(provider_task_id);


--
-- Name: sv_local_external_tasks sv_local_external_tasks_audit_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_external_tasks
    ADD CONSTRAINT sv_local_external_tasks_audit_id_organization_id_fkey FOREIGN KEY (audit_id, organization_id) REFERENCES public.sv_local_external_audits(id, organization_id);


--
-- Name: sv_grid_definitions sv_local_grid_location_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_grid_definitions
    ADD CONSTRAINT sv_local_grid_location_org_fk FOREIGN KEY (organization_id, location_id) REFERENCES public.sv_business_locations(organization_id, id) NOT VALID;


--
-- Name: sv_local_keywords sv_local_keyword_location_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_keywords
    ADD CONSTRAINT sv_local_keyword_location_org_fk FOREIGN KEY (organization_id, location_id) REFERENCES public.sv_business_locations(organization_id, id) NOT VALID;


--
-- Name: sv_local_keywords sv_local_keywords_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_keywords
    ADD CONSTRAINT sv_local_keywords_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.sv_business_locations(id);


--
-- Name: sv_local_keywords sv_local_keywords_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_keywords
    ADD CONSTRAINT sv_local_keywords_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_rank_observations sv_local_observation_cycle_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_observation_cycle_org_fk FOREIGN KEY (organization_id, cycle_id) REFERENCES public.sv_local_scan_cycles(organization_id, id) NOT VALID;


--
-- Name: sv_local_rank_observations sv_local_observation_evidence_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_observation_evidence_org_fk FOREIGN KEY (evidence_id, organization_id) REFERENCES public.sv_evidence_index(id, organization_id);


--
-- Name: sv_local_rank_observations sv_local_observation_keyword_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_observation_keyword_org_fk FOREIGN KEY (organization_id, keyword_id) REFERENCES public.sv_local_keywords(organization_id, id) NOT VALID;


--
-- Name: sv_local_rank_observations sv_local_observation_point_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_observation_point_org_fk FOREIGN KEY (organization_id, grid_point_id) REFERENCES public.sv_grid_points(organization_id, id) NOT VALID;


--
-- Name: sv_local_observations sv_local_observations_capture_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_observations
    ADD CONSTRAINT sv_local_observations_capture_task_id_fkey FOREIGN KEY (capture_task_id) REFERENCES public.sv_capture_tasks(id);


--
-- Name: sv_local_observations sv_local_observations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_observations
    ADD CONSTRAINT sv_local_observations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_observations sv_local_observations_supersedes_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_observations
    ADD CONSTRAINT sv_local_observations_supersedes_observation_id_fkey FOREIGN KEY (supersedes_observation_id) REFERENCES public.sv_local_observations(id);


--
-- Name: sv_local_order_publications sv_local_order_publications_order_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_order_publications
    ADD CONSTRAINT sv_local_order_publications_order_id_organization_id_fkey FOREIGN KEY (order_id, organization_id) REFERENCES public.sv_orders(id, organization_id);


--
-- Name: sv_local_order_publications sv_local_order_publications_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_order_publications
    ADD CONSTRAINT sv_local_order_publications_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sv_local_order_publications(id);


--
-- Name: sv_local_order_publications sv_local_order_publications_project_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_order_publications
    ADD CONSTRAINT sv_local_order_publications_project_id_organization_id_fkey FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);


--
-- Name: sv_grid_points sv_local_point_grid_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_grid_points
    ADD CONSTRAINT sv_local_point_grid_org_fk FOREIGN KEY (organization_id, grid_id) REFERENCES public.sv_grid_definitions(organization_id, id) NOT VALID;


--
-- Name: sv_local_qc_decisions sv_local_qc_decisions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_qc_decisions
    ADD CONSTRAINT sv_local_qc_decisions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_qc_decisions sv_local_qc_decisions_organization_id_local_cycle_id_repor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_qc_decisions
    ADD CONSTRAINT sv_local_qc_decisions_organization_id_local_cycle_id_repor_fkey FOREIGN KEY (organization_id, local_cycle_id, report_version_id) REFERENCES public.sv_local_report_versions(organization_id, local_cycle_id, id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_local_scan_cycles(id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_cycle_matrix_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_cycle_matrix_fk FOREIGN KEY (cycle_id, location_id, grid_definition_id) REFERENCES public.sv_local_scan_cycles(id, location_id, grid_definition_id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_grid_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_grid_definition_id_fkey FOREIGN KEY (grid_definition_id) REFERENCES public.sv_grid_definitions(id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_grid_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_grid_point_id_fkey FOREIGN KEY (grid_point_id) REFERENCES public.sv_grid_points(id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_keyword_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.sv_local_keywords(id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_keyword_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_keyword_location_fk FOREIGN KEY (keyword_id, location_id) REFERENCES public.sv_local_keywords(id, location_id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.sv_business_locations(id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_rank_observations sv_local_rank_observations_point_grid_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_rank_observations
    ADD CONSTRAINT sv_local_rank_observations_point_grid_fk FOREIGN KEY (grid_point_id, grid_definition_id) REFERENCES public.sv_grid_points(id, grid_id);


--
-- Name: sv_local_raw_evidence sv_local_raw_evidence_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_raw_evidence
    ADD CONSTRAINT sv_local_raw_evidence_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_raw_evidence sv_local_raw_evidence_source_snapshot_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_raw_evidence
    ADD CONSTRAINT sv_local_raw_evidence_source_snapshot_id_organization_id_fkey FOREIGN KEY (source_snapshot_id, organization_id) REFERENCES public.sv_source_snapshots(id, organization_id);


--
-- Name: sv_local_raw_retention_health sv_local_raw_retention_health_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_raw_retention_health
    ADD CONSTRAINT sv_local_raw_retention_health_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_report_deliveries sv_local_report_deliveries_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_report_deliveries
    ADD CONSTRAINT sv_local_report_deliveries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_report_deliveries sv_local_report_deliveries_organization_id_report_version__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_report_deliveries
    ADD CONSTRAINT sv_local_report_deliveries_organization_id_report_version__fkey FOREIGN KEY (organization_id, report_version_id) REFERENCES public.sv_local_report_versions(organization_id, id);


--
-- Name: sv_local_report_versions sv_local_report_versions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_report_versions
    ADD CONSTRAINT sv_local_report_versions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_report_versions sv_local_report_versions_organization_id_local_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_report_versions
    ADD CONSTRAINT sv_local_report_versions_organization_id_local_cycle_id_fkey FOREIGN KEY (organization_id, local_cycle_id) REFERENCES public.sv_local_scan_cycles(organization_id, id);


--
-- Name: sv_local_scan_cycles sv_local_scan_cycles_configuration_lock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_scan_cycles_configuration_lock_id_fkey FOREIGN KEY (configuration_lock_id) REFERENCES public.sv_configuration_locks(id);


--
-- Name: sv_local_scan_cycles sv_local_scan_cycles_grid_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_scan_cycles_grid_definition_id_fkey FOREIGN KEY (grid_definition_id) REFERENCES public.sv_grid_definitions(id);


--
-- Name: sv_local_scan_cycles sv_local_scan_cycles_grid_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_scan_cycles_grid_location_fk FOREIGN KEY (grid_definition_id, location_id) REFERENCES public.sv_grid_definitions(id, location_id);


--
-- Name: sv_local_scan_cycles sv_local_scan_cycles_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_scan_cycles_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.sv_business_locations(id);


--
-- Name: sv_local_scan_cycles sv_local_scan_cycles_measurement_domain_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_scan_cycles_measurement_domain_fk FOREIGN KEY (measurement_cycle_id, domain_id, organization_id, configuration_lock_id) REFERENCES public.sv_measurement_cycles(id, domain_id, organization_id, configuration_lock_id);


--
-- Name: sv_local_scan_cycles sv_local_scan_cycles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_scan_cycles
    ADD CONSTRAINT sv_local_scan_cycles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_local_visibility_metrics sv_local_visibility_metrics_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_visibility_metrics
    ADD CONSTRAINT sv_local_visibility_metrics_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_local_scan_cycles(id);


--
-- Name: sv_local_visibility_metrics sv_local_visibility_metrics_keyword_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_visibility_metrics
    ADD CONSTRAINT sv_local_visibility_metrics_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.sv_local_keywords(id);


--
-- Name: sv_local_visibility_metrics sv_local_visibility_metrics_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_visibility_metrics
    ADD CONSTRAINT sv_local_visibility_metrics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_measurement_attempt_results sv_measurement_attempt_results_attempt_identity_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_attempt_results
    ADD CONSTRAINT sv_measurement_attempt_results_attempt_identity_fk FOREIGN KEY (attempt_id, organization_id, measurement_cycle_id, reservation_id, execution_key, attempt_index) REFERENCES public.sv_measurement_attempts(id, organization_id, measurement_cycle_id, reservation_id, execution_key, attempt_index);


--
-- Name: sv_measurement_attempt_results sv_measurement_attempt_results_local_cycle_identity_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_attempt_results
    ADD CONSTRAINT sv_measurement_attempt_results_local_cycle_identity_fk FOREIGN KEY (local_cycle_id, organization_id, measurement_cycle_id, configuration_lock_id, provider_id) REFERENCES public.sv_local_scan_cycles(id, organization_id, measurement_cycle_id, configuration_lock_id, provider);


--
-- Name: sv_measurement_attempt_results sv_measurement_attempt_results_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_attempt_results
    ADD CONSTRAINT sv_measurement_attempt_results_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_measurement_attempts sv_measurement_attempts_cost_event_scope_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_attempts
    ADD CONSTRAINT sv_measurement_attempts_cost_event_scope_fk FOREIGN KEY (cost_event_id, organization_id, measurement_cycle_id, domain_id) REFERENCES public.sv_cost_events(id, organization_id, measurement_cycle_id, domain_id);


--
-- Name: sv_measurement_attempts sv_measurement_attempts_cycle_domain_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_attempts
    ADD CONSTRAINT sv_measurement_attempts_cycle_domain_org_fk FOREIGN KEY (measurement_cycle_id, domain_id, organization_id) REFERENCES public.sv_measurement_cycles(id, domain_id, organization_id);


--
-- Name: sv_measurement_attempts sv_measurement_attempts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_attempts
    ADD CONSTRAINT sv_measurement_attempts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_measurement_cycles sv_measurement_cycles_configuration_lock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_cycles
    ADD CONSTRAINT sv_measurement_cycles_configuration_lock_id_fkey FOREIGN KEY (configuration_lock_id) REFERENCES public.sv_configuration_locks(id);


--
-- Name: sv_measurement_cycles sv_measurement_cycles_configuration_lock_scope_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_cycles
    ADD CONSTRAINT sv_measurement_cycles_configuration_lock_scope_fk FOREIGN KEY (configuration_lock_id, organization_id) REFERENCES public.sv_configuration_locks(id, organization_id);


--
-- Name: sv_measurement_cycles sv_measurement_cycles_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_cycles
    ADD CONSTRAINT sv_measurement_cycles_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.sv_measurement_domains(domain_id);


--
-- Name: sv_measurement_cycles sv_measurement_cycles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_cycles
    ADD CONSTRAINT sv_measurement_cycles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_measurement_datasets sv_measurement_datasets_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_datasets
    ADD CONSTRAINT sv_measurement_datasets_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_measurement_cycles(id);


--
-- Name: sv_measurement_datasets sv_measurement_datasets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_measurement_datasets
    ADD CONSTRAINT sv_measurement_datasets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_observation_evidence_assets sv_observation_evidence_assets_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_observation_evidence_assets
    ADD CONSTRAINT sv_observation_evidence_assets_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES public.sv_local_observations(id);


--
-- Name: sv_observation_evidence_assets sv_observation_evidence_assets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_observation_evidence_assets
    ADD CONSTRAINT sv_observation_evidence_assets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_observation_mentions sv_observation_mentions_matched_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_observation_mentions
    ADD CONSTRAINT sv_observation_mentions_matched_entity_id_fkey FOREIGN KEY (matched_entity_id) REFERENCES public.sv_entities(id);


--
-- Name: sv_observation_mentions sv_observation_mentions_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_observation_mentions
    ADD CONSTRAINT sv_observation_mentions_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES public.sv_local_observations(id);


--
-- Name: sv_observation_mentions sv_observation_mentions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_observation_mentions
    ADD CONSTRAINT sv_observation_mentions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_order_requests sv_order_requests_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_order_requests
    ADD CONSTRAINT sv_order_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_order_requests sv_order_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_order_requests
    ADD CONSTRAINT sv_order_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_orders sv_orders_lock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_orders
    ADD CONSTRAINT sv_orders_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.sv_configuration_locks(id);


--
-- Name: sv_orders sv_orders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_orders
    ADD CONSTRAINT sv_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_orders sv_orders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_orders
    ADD CONSTRAINT sv_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_orders sv_orders_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_orders
    ADD CONSTRAINT sv_orders_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.sv_quotes(id);


--
-- Name: sv_outcome_attribution_windows sv_outcome_attribution_windows_baseline_observation_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_attribution_windows
    ADD CONSTRAINT sv_outcome_attribution_windows_baseline_observation_fk FOREIGN KEY (baseline_observation_id, organization_id, project_id, location_id, metric_key, metric_version) REFERENCES public.sv_outcome_observations(id, organization_id, project_id, location_id, metric_key, metric_version);


--
-- Name: sv_outcome_attribution_windows sv_outcome_attribution_windows_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_attribution_windows
    ADD CONSTRAINT sv_outcome_attribution_windows_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.sv_business_locations(id);


--
-- Name: sv_outcome_attribution_windows sv_outcome_attribution_windows_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_attribution_windows
    ADD CONSTRAINT sv_outcome_attribution_windows_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_outcome_attribution_windows sv_outcome_attribution_windows_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_attribution_windows
    ADD CONSTRAINT sv_outcome_attribution_windows_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_outcome_attribution_windows sv_outcome_attribution_windows_verification_chain_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_attribution_windows
    ADD CONSTRAINT sv_outcome_attribution_windows_verification_chain_fk FOREIGN KEY (verification_cycle_id, organization_id, action_id, baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id) REFERENCES public.sv_verification_cycles(id, organization_id, action_id, baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id);


--
-- Name: sv_outcome_attribution_windows sv_outcome_attribution_windows_verification_observation_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_attribution_windows
    ADD CONSTRAINT sv_outcome_attribution_windows_verification_observation_fk FOREIGN KEY (verification_observation_id, organization_id, project_id, location_id, metric_key, metric_version) REFERENCES public.sv_outcome_observations(id, organization_id, project_id, location_id, metric_key, metric_version);


--
-- Name: sv_outcome_observations sv_outcome_observations_dataset_cycle_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_dataset_cycle_fk FOREIGN KEY (dataset_id, measurement_cycle_id, organization_id) REFERENCES public.sv_measurement_datasets(id, cycle_id, organization_id);


--
-- Name: sv_outcome_observations sv_outcome_observations_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.sv_business_locations(id);


--
-- Name: sv_outcome_observations sv_outcome_observations_measurement_domain_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_measurement_domain_fk FOREIGN KEY (measurement_cycle_id, domain_id) REFERENCES public.sv_measurement_cycles(id, domain_id);


--
-- Name: sv_outcome_observations sv_outcome_observations_metric_definition_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_metric_definition_fk FOREIGN KEY (metric_key, metric_version) REFERENCES public.sv_outcome_metric_definitions(metric_key, version);


--
-- Name: sv_outcome_observations sv_outcome_observations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_outcome_observations sv_outcome_observations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_outcome_observations sv_outcome_observations_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sv_outcome_sources(id);


--
-- Name: sv_outcome_observations sv_outcome_observations_source_scope_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_observations
    ADD CONSTRAINT sv_outcome_observations_source_scope_fk FOREIGN KEY (source_id, organization_id, project_id, location_id) REFERENCES public.sv_outcome_sources(id, organization_id, project_id, location_id);


--
-- Name: sv_outcome_sources sv_outcome_sources_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_sources
    ADD CONSTRAINT sv_outcome_sources_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.sv_business_locations(id);


--
-- Name: sv_outcome_sources sv_outcome_sources_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_sources
    ADD CONSTRAINT sv_outcome_sources_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_outcome_sources sv_outcome_sources_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_outcome_sources
    ADD CONSTRAINT sv_outcome_sources_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_payments sv_payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_payments
    ADD CONSTRAINT sv_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sv_orders(id);


--
-- Name: sv_payments sv_payments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_payments
    ADD CONSTRAINT sv_payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_pilot_cycles sv_pilot_cycles_lock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_pilot_cycles
    ADD CONSTRAINT sv_pilot_cycles_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.sv_configuration_locks(id);


--
-- Name: sv_pilot_cycles sv_pilot_cycles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_pilot_cycles
    ADD CONSTRAINT sv_pilot_cycles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_pilot_cycles sv_pilot_cycles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_pilot_cycles
    ADD CONSTRAINT sv_pilot_cycles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_project_profiles sv_project_profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_project_profiles
    ADD CONSTRAINT sv_project_profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_project_profiles sv_project_profiles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_project_profiles
    ADD CONSTRAINT sv_project_profiles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_projects sv_projects_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_projects
    ADD CONSTRAINT sv_projects_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_prompt_families sv_prompt_families_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_prompt_families
    ADD CONSTRAINT sv_prompt_families_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_prompt_families sv_prompt_families_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_prompt_families
    ADD CONSTRAINT sv_prompt_families_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_provider_canary_executions sv_provider_canary_executions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_canary_executions
    ADD CONSTRAINT sv_provider_canary_executions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_provider_canary_executions sv_provider_canary_executions_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_canary_executions
    ADD CONSTRAINT sv_provider_canary_executions_project_org_fk FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id) NOT VALID;


--
-- Name: sv_provider_dataset_capabilities sv_provider_dataset_capabilities_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_dataset_capabilities
    ADD CONSTRAINT sv_provider_dataset_capabilities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_provider_dataset_snapshot_events sv_provider_dataset_snapshot_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_dataset_snapshot_events
    ADD CONSTRAINT sv_provider_dataset_snapshot_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_provider_dataset_snapshot_events sv_provider_dataset_snapshot_events_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_provider_dataset_snapshot_events
    ADD CONSTRAINT sv_provider_dataset_snapshot_events_project_org_fk FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);


--
-- Name: sv_public_scans sv_public_scans_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_public_scans
    ADD CONSTRAINT sv_public_scans_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_qc_records sv_qc_records_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_qc_records
    ADD CONSTRAINT sv_qc_records_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_qc_records sv_qc_records_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_qc_records
    ADD CONSTRAINT sv_qc_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sv_orders(id);


--
-- Name: sv_qc_records sv_qc_records_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_qc_records
    ADD CONSTRAINT sv_qc_records_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_quotes sv_quotes_lock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_quotes
    ADD CONSTRAINT sv_quotes_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.sv_configuration_locks(id);


--
-- Name: sv_quotes sv_quotes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_quotes
    ADD CONSTRAINT sv_quotes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_quotes sv_quotes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_quotes
    ADD CONSTRAINT sv_quotes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_recommendation_actions sv_recommendation_actions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_actions
    ADD CONSTRAINT sv_recommendation_actions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_recommendation_actions sv_recommendation_actions_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_actions
    ADD CONSTRAINT sv_recommendation_actions_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.sv_recommendation_runs(id);


--
-- Name: sv_recommendation_evidence sv_recommendation_evidence_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_evidence
    ADD CONSTRAINT sv_recommendation_evidence_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_recommendation_evidence sv_recommendation_evidence_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_evidence
    ADD CONSTRAINT sv_recommendation_evidence_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.sv_recommendation_runs(id);


--
-- Name: sv_recommendation_findings sv_recommendation_findings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_findings
    ADD CONSTRAINT sv_recommendation_findings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_recommendation_findings sv_recommendation_findings_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_findings
    ADD CONSTRAINT sv_recommendation_findings_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.sv_recommendation_runs(id);


--
-- Name: sv_recommendation_manifests sv_recommendation_manifests_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_manifests
    ADD CONSTRAINT sv_recommendation_manifests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_recommendation_manifests sv_recommendation_manifests_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_manifests
    ADD CONSTRAINT sv_recommendation_manifests_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.sv_recommendation_runs(id);


--
-- Name: sv_recommendation_runs sv_recommendation_runs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_runs
    ADD CONSTRAINT sv_recommendation_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_recommendation_runs sv_recommendation_runs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_runs
    ADD CONSTRAINT sv_recommendation_runs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_recommendation_tasks sv_recommendation_tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_tasks
    ADD CONSTRAINT sv_recommendation_tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_recommendation_tasks sv_recommendation_tasks_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendation_tasks
    ADD CONSTRAINT sv_recommendation_tasks_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.sv_recommendation_runs(id);


--
-- Name: sv_recommendations sv_recommendations_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendations
    ADD CONSTRAINT sv_recommendations_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_recommendations sv_recommendations_finding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendations
    ADD CONSTRAINT sv_recommendations_finding_id_fkey FOREIGN KEY (finding_id) REFERENCES public.sv_findings(id);


--
-- Name: sv_recommendations sv_recommendations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_recommendations
    ADD CONSTRAINT sv_recommendations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_reputation_sources sv_reputation_sources_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_reputation_sources
    ADD CONSTRAINT sv_reputation_sources_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.sv_business_locations(id);


--
-- Name: sv_reputation_sources sv_reputation_sources_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_reputation_sources
    ADD CONSTRAINT sv_reputation_sources_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_response_mentions sv_response_mentions_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_response_mentions
    ADD CONSTRAINT sv_response_mentions_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_response_mentions sv_response_mentions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_response_mentions
    ADD CONSTRAINT sv_response_mentions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_response_mentions sv_response_mentions_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_response_mentions
    ADD CONSTRAINT sv_response_mentions_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.sv_runs(id);


--
-- Name: sv_review_snapshots sv_review_snapshots_cycle_domain_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_snapshots
    ADD CONSTRAINT sv_review_snapshots_cycle_domain_fk FOREIGN KEY (cycle_id, domain_id) REFERENCES public.sv_measurement_cycles(id, domain_id);


--
-- Name: sv_review_snapshots sv_review_snapshots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_snapshots
    ADD CONSTRAINT sv_review_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_review_snapshots sv_review_snapshots_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_snapshots
    ADD CONSTRAINT sv_review_snapshots_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sv_reputation_sources(id);


--
-- Name: sv_review_topic_observations sv_review_topic_observations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_topic_observations
    ADD CONSTRAINT sv_review_topic_observations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_review_topic_observations sv_review_topic_observations_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_topic_observations
    ADD CONSTRAINT sv_review_topic_observations_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.sv_review_snapshots(id);


--
-- Name: sv_review_velocity_metrics sv_review_velocity_metrics_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_velocity_metrics
    ADD CONSTRAINT sv_review_velocity_metrics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_review_velocity_metrics sv_review_velocity_metrics_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_velocity_metrics
    ADD CONSTRAINT sv_review_velocity_metrics_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.sv_review_snapshots(id);


--
-- Name: sv_review_velocity_metrics sv_review_velocity_metrics_snapshot_scope_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_velocity_metrics
    ADD CONSTRAINT sv_review_velocity_metrics_snapshot_scope_fk FOREIGN KEY (snapshot_id, source_id, period_start, period_end) REFERENCES public.sv_review_snapshots(id, source_id, period_start, period_end);


--
-- Name: sv_review_velocity_metrics sv_review_velocity_metrics_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_review_velocity_metrics
    ADD CONSTRAINT sv_review_velocity_metrics_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sv_reputation_sources(id);


--
-- Name: sv_run_permits sv_run_permits_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_run_permits
    ADD CONSTRAINT sv_run_permits_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_run_permits sv_run_permits_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_run_permits
    ADD CONSTRAINT sv_run_permits_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_runs sv_runs_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_runs
    ADD CONSTRAINT sv_runs_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.sv_cycles(id);


--
-- Name: sv_runs sv_runs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_runs
    ADD CONSTRAINT sv_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_runs sv_runs_permit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_runs
    ADD CONSTRAINT sv_runs_permit_id_fkey FOREIGN KEY (permit_id) REFERENCES public.sv_run_permits(id);


--
-- Name: sv_scenarios sv_scenarios_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_scenarios
    ADD CONSTRAINT sv_scenarios_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.sv_prompt_families(id);


--
-- Name: sv_scenarios sv_scenarios_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_scenarios
    ADD CONSTRAINT sv_scenarios_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_search_queries sv_search_queries_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_queries
    ADD CONSTRAINT sv_search_queries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_search_queries sv_search_queries_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_queries
    ADD CONSTRAINT sv_search_queries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: sv_search_rank_observations sv_search_rank_observations_cycle_domain_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_rank_observations
    ADD CONSTRAINT sv_search_rank_observations_cycle_domain_fk FOREIGN KEY (cycle_id, domain_id) REFERENCES public.sv_measurement_cycles(id, domain_id);


--
-- Name: sv_search_rank_observations sv_search_rank_observations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_rank_observations
    ADD CONSTRAINT sv_search_rank_observations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_search_rank_observations sv_search_rank_observations_query_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_rank_observations
    ADD CONSTRAINT sv_search_rank_observations_query_id_fkey FOREIGN KEY (query_id) REFERENCES public.sv_search_queries(id);


--
-- Name: sv_search_rank_observations sv_search_rank_observations_query_scope_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_search_rank_observations
    ADD CONSTRAINT sv_search_rank_observations_query_scope_fk FOREIGN KEY (query_id, engine, region, device) REFERENCES public.sv_search_queries(id, engine, region, device);


--
-- Name: sv_simulation_connect_tokens sv_simulation_connect_tokens_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_connect_tokens
    ADD CONSTRAINT sv_simulation_connect_tokens_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_simulation_deliveries sv_simulation_deliveries_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_deliveries
    ADD CONSTRAINT sv_simulation_deliveries_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_simulation_deliveries sv_simulation_deliveries_recipient_id_sv_simulation_recipients_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_deliveries
    ADD CONSTRAINT sv_simulation_deliveries_recipient_id_sv_simulation_recipients_ FOREIGN KEY (recipient_id) REFERENCES public.sv_simulation_recipients(id);


--
-- Name: sv_simulation_deliveries sv_simulation_deliveries_report_id_sv_simulation_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_deliveries
    ADD CONSTRAINT sv_simulation_deliveries_report_id_sv_simulation_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.sv_simulation_reports(id);


--
-- Name: sv_simulation_delivery_attempts sv_simulation_delivery_attempts_delivery_id_sv_simulation_deliv; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_delivery_attempts
    ADD CONSTRAINT sv_simulation_delivery_attempts_delivery_id_sv_simulation_deliv FOREIGN KEY (delivery_id) REFERENCES public.sv_simulation_deliveries(id);


--
-- Name: sv_simulation_delivery_attempts sv_simulation_delivery_attempts_organization_id_organization_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_delivery_attempts
    ADD CONSTRAINT sv_simulation_delivery_attempts_organization_id_organization_id FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_simulation_recipients sv_simulation_recipients_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_recipients
    ADD CONSTRAINT sv_simulation_recipients_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_simulation_reports sv_simulation_reports_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_reports
    ADD CONSTRAINT sv_simulation_reports_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_simulation_reports sv_simulation_reports_subscription_id_sv_simulation_subscriptio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_reports
    ADD CONSTRAINT sv_simulation_reports_subscription_id_sv_simulation_subscriptio FOREIGN KEY (subscription_id) REFERENCES public.sv_simulation_subscriptions(id);


--
-- Name: sv_simulation_subscriptions sv_simulation_subscriptions_organization_id_organization_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_simulation_subscriptions
    ADD CONSTRAINT sv_simulation_subscriptions_organization_id_organization_id_fk FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_source_snapshots sv_source_snapshots_capability_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_source_snapshots
    ADD CONSTRAINT sv_source_snapshots_capability_org_fk FOREIGN KEY (capability_id, organization_id) REFERENCES public.sv_provider_dataset_capabilities(id, organization_id);


--
-- Name: sv_source_snapshots sv_source_snapshots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_source_snapshots
    ADD CONSTRAINT sv_source_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_source_snapshots sv_source_snapshots_project_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_source_snapshots
    ADD CONSTRAINT sv_source_snapshots_project_org_fk FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);


--
-- Name: sv_verification_cycles sv_verification_cycles_action_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_action_organization_fk FOREIGN KEY (action_id, organization_id) REFERENCES public.sv_approved_actions(id, organization_id);


--
-- Name: sv_verification_cycles sv_verification_cycles_baseline_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_baseline_cycle_id_fkey FOREIGN KEY (baseline_cycle_id) REFERENCES public.sv_measurement_cycles(id);


--
-- Name: sv_verification_cycles sv_verification_cycles_baseline_dataset_cycle_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_baseline_dataset_cycle_fk FOREIGN KEY (baseline_dataset_id, baseline_cycle_id, organization_id) REFERENCES public.sv_measurement_datasets(id, cycle_id, organization_id);


--
-- Name: sv_verification_cycles sv_verification_cycles_baseline_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_baseline_dataset_id_fkey FOREIGN KEY (baseline_dataset_id) REFERENCES public.sv_measurement_datasets(id);


--
-- Name: sv_verification_cycles sv_verification_cycles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_verification_cycles sv_verification_cycles_verification_dataset_cycle_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_verification_dataset_cycle_fk FOREIGN KEY (verification_dataset_id, verification_measurement_cycle_id, organization_id) REFERENCES public.sv_measurement_datasets(id, cycle_id, organization_id);


--
-- Name: sv_verification_cycles sv_verification_cycles_verification_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_verification_dataset_id_fkey FOREIGN KEY (verification_dataset_id) REFERENCES public.sv_measurement_datasets(id);


--
-- Name: sv_verification_cycles sv_verification_cycles_verification_measurement_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_verification_cycles
    ADD CONSTRAINT sv_verification_cycles_verification_measurement_cycle_id_fkey FOREIGN KEY (verification_measurement_cycle_id) REFERENCES public.sv_measurement_cycles(id);


--
-- Name: sv_website_snapshots sv_website_snapshots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_website_snapshots
    ADD CONSTRAINT sv_website_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: sv_website_snapshots sv_website_snapshots_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_website_snapshots
    ADD CONSTRAINT sv_website_snapshots_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.sv_projects(id);


--
-- Name: brand_opportunities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_opportunities ENABLE ROW LEVEL SECURITY;

--
-- Name: brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

--
-- Name: citations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;

--
-- Name: competitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_ai_cost_events local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_cost_events USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_ai_events local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_events USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_ai_evidence local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_evidence USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_ai_orders local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_orders USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_ai_payments local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_payments USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_ai_slots local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_slots USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: organization_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_run_hourly_aggregates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_run_hourly_aggregates ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: secrets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_action_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_action_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_api_idempotency_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_api_idempotency_records ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_approved_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_approved_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_attribution_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_attribution_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_audit_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_business_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_business_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_capture_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_capture_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_change_event_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_change_event_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_change_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_change_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_citation_gap_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_citation_gap_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_configuration_locks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_configuration_locks ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_cost_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_cost_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_cycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_entities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_entities ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_evidence_acceptance_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_evidence_acceptance_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_evidence_index; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_evidence_index ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_findings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_findings ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_free_ai_visibility_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_free_ai_visibility_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_free_auto_dispatch_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_free_auto_dispatch_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_grid_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_grid_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_grid_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_grid_points ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_journal_daily_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_journal_daily_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_journal_no_spend_reconciliations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_journal_no_spend_reconciliations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_journal_provider_boundaries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_journal_provider_boundaries ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_ai_cost_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_cost_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_ai_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_ai_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_ai_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_ai_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_ai_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_canary_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_canary_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_competitor_observations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_competitor_observations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_customer_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_customer_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_customer_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_customer_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_dispatch_outbox; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_dispatch_outbox ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_evidence_acceptances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_evidence_acceptances ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_external_audits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_external_audits ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_external_publications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_external_publications ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_external_raw_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_external_raw_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_external_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_external_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_keywords; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_keywords ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_observations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_observations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_order_publications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_order_publications ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_qc_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_qc_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_rank_observations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_rank_observations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_raw_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_raw_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_raw_retention_health; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_raw_retention_health ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_report_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_report_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_report_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_report_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_scan_cycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_scan_cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_local_visibility_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_visibility_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_measurement_attempt_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_measurement_attempt_results ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_measurement_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_measurement_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_measurement_cycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_measurement_cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_measurement_datasets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_measurement_datasets ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_measurement_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_measurement_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_observation_evidence_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_observation_evidence_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_observation_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_observation_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_order_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_order_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_outcome_attribution_windows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_outcome_attribution_windows ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_outcome_metric_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_outcome_metric_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_outcome_observations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_outcome_observations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_outcome_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_outcome_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_pilot_cycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_pilot_cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_pilot_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_pilot_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_project_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_project_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_prompt_families; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_prompt_families ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_provider_canary_executions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_provider_canary_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_provider_dataset_capabilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_provider_dataset_capabilities ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_provider_dataset_snapshot_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_provider_dataset_snapshot_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_provider_spend_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_provider_spend_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_provider_spend_reservations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_provider_spend_reservations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_public_scans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_public_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_qc_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_qc_records ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_recommendation_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_recommendation_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_recommendation_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_recommendation_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_recommendation_findings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_recommendation_findings ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_recommendation_manifests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_recommendation_manifests ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_recommendation_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_recommendation_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_recommendation_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_recommendation_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_reputation_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_reputation_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_response_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_response_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_review_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_review_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_review_topic_observations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_review_topic_observations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_review_velocity_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_review_velocity_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_run_permits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_run_permits ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_scenarios ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_search_queries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_search_queries ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_search_rank_observations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_search_rank_observations ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_simulation_connect_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_simulation_connect_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_simulation_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_simulation_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_simulation_delivery_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_simulation_delivery_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_simulation_recipients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_simulation_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_simulation_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_simulation_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_simulation_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_simulation_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_source_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_source_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_verification_cycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_verification_cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: sv_website_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_website_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: reports tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.reports USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_action_approvals tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_action_approvals USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_api_idempotency_records tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_api_idempotency_records USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_api_keys tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_api_keys USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_approved_actions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_approved_actions USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_attribution_assessments tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_attribution_assessments USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_audit_events tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_audit_events USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_business_locations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_business_locations USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_capture_tasks tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_capture_tasks USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_change_event_assets tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_change_event_assets USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_change_events tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_change_events USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_citation_gap_snapshots tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_citation_gap_snapshots USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_configuration_locks tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_configuration_locks USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_cost_events tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_cost_events USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_cycles tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_cycles USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_entities tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_entities USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_evidence_acceptance_receipts tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_evidence_acceptance_receipts USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_evidence_index tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_evidence_index USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_findings tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_findings USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_free_ai_visibility_checks tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_free_ai_visibility_checks FOR SELECT USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_grid_definitions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_grid_definitions USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_grid_points tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_grid_points USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_incidents tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_incidents USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_journal_daily_claims tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_journal_daily_claims USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_journal_provider_boundaries tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_journal_provider_boundaries USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_canary_reviews tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_canary_reviews USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_competitor_observations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_competitor_observations USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_customer_runs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_customer_runs USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_customer_tasks tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_customer_tasks USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_dispatch_outbox tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_dispatch_outbox USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_evidence_acceptances tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_evidence_acceptances USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_external_audits tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_external_audits USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_external_publications tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_external_publications USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_external_raw_evidence tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_external_raw_evidence USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_external_tasks tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_external_tasks USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_keywords tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_keywords USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_observations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_observations USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_order_publications tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_order_publications USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_qc_decisions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_qc_decisions USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_rank_observations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_rank_observations USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_raw_evidence tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_raw_evidence USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_raw_retention_health tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_raw_retention_health USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_report_deliveries tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_report_deliveries USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_report_versions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_report_versions USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_scan_cycles tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_scan_cycles USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_local_visibility_metrics tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_local_visibility_metrics USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_measurement_attempt_results tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_measurement_attempt_results USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_measurement_attempts tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_measurement_attempts USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_measurement_cycles tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_measurement_cycles USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_measurement_datasets tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_measurement_datasets USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_measurement_domains tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_measurement_domains FOR SELECT USING (true);


--
-- Name: sv_observation_evidence_assets tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_observation_evidence_assets USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_observation_mentions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_observation_mentions USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_order_requests tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_order_requests USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_orders tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_orders USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_outcome_attribution_windows tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_outcome_attribution_windows USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_outcome_metric_definitions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_outcome_metric_definitions FOR SELECT USING (true);


--
-- Name: sv_outcome_observations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_outcome_observations USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_outcome_sources tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_outcome_sources USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_payments tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_payments USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_pilot_cycles tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_pilot_cycles USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_project_profiles tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_project_profiles USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_projects tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_projects USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_prompt_families tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_prompt_families USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_provider_canary_executions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_provider_canary_executions USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_provider_dataset_capabilities tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_provider_dataset_capabilities USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_provider_dataset_snapshot_events tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_provider_dataset_snapshot_events USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_qc_records tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_qc_records USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_quotes tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_quotes USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_recommendation_actions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_recommendation_actions USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_recommendation_evidence tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_recommendation_evidence USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_recommendation_findings tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_recommendation_findings USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_recommendation_manifests tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_recommendation_manifests USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_recommendation_runs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_recommendation_runs USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_recommendation_tasks tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_recommendation_tasks USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_recommendations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_recommendations USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_reputation_sources tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_reputation_sources USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_response_mentions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_response_mentions USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_review_snapshots tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_review_snapshots USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_review_topic_observations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_review_topic_observations USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_review_velocity_metrics tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_review_velocity_metrics USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_run_permits tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_run_permits USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_runs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_runs USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_scenarios tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_scenarios USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_search_queries tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_search_queries USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_search_rank_observations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_search_rank_observations USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_simulation_connect_tokens tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_simulation_connect_tokens USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_simulation_deliveries tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_simulation_deliveries USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_simulation_delivery_attempts tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_simulation_delivery_attempts USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_simulation_recipients tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_simulation_recipients USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_simulation_reports tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_simulation_reports USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_simulation_subscriptions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_simulation_subscriptions USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_source_snapshots tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_source_snapshots USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_verification_cycles tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_verification_cycles USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: sv_website_snapshots tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.sv_website_snapshots USING ((organization_id = current_setting('app.organization_id'::text, true)));


--
-- Name: usage_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA pgboss; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA pgboss TO selena_app;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO selena_app;


--
-- Name: FUNCTION create_queue(queue_name text, options jsonb); Type: ACL; Schema: pgboss; Owner: -
--

REVOKE ALL ON FUNCTION pgboss.create_queue(queue_name text, options jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION pgboss.create_queue(queue_name text, options jsonb) TO selena_app;


--
-- Name: FUNCTION delete_queue(queue_name text); Type: ACL; Schema: pgboss; Owner: -
--

REVOKE ALL ON FUNCTION pgboss.delete_queue(queue_name text) FROM PUBLIC;


--
-- Name: FUNCTION job_table_format(command text, table_name text); Type: ACL; Schema: pgboss; Owner: -
--

REVOKE ALL ON FUNCTION pgboss.job_table_format(command text, table_name text) FROM PUBLIC;


--
-- Name: FUNCTION job_table_run(command text, tbl_name text, queue_name text); Type: ACL; Schema: pgboss; Owner: -
--

REVOKE ALL ON FUNCTION pgboss.job_table_run(command text, tbl_name text, queue_name text) FROM PUBLIC;


--
-- Name: FUNCTION job_table_run_async(command_name text, version integer, command text, tbl_name text, queue_name text); Type: ACL; Schema: pgboss; Owner: -
--

REVOKE ALL ON FUNCTION pgboss.job_table_run_async(command_name text, version integer, command text, tbl_name text, queue_name text) FROM PUBLIC;


--
-- Name: FUNCTION sv_begin_free_ai_visibility_check(p_check_id uuid, p_organization_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_begin_free_ai_visibility_check(p_check_id uuid, p_organization_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_begin_free_ai_visibility_check(p_check_id uuid, p_organization_id text) TO selena_app;


--
-- Name: FUNCTION sv_claim_free_ai_visibility(p_user_id text, p_organization_id text, p_registrable_domain text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_claim_free_ai_visibility(p_user_id text, p_organization_id text, p_registrable_domain text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_claim_free_ai_visibility(p_user_id text, p_organization_id text, p_registrable_domain text) TO selena_app;


--
-- Name: FUNCTION sv_claim_free_auto_dispatch(p_request_id uuid, p_organization_id text, p_project_id uuid, p_max_per_day integer, p_max_per_project_per_day integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_claim_free_auto_dispatch(p_request_id uuid, p_organization_id text, p_project_id uuid, p_max_per_day integer, p_max_per_project_per_day integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_claim_free_auto_dispatch(p_request_id uuid, p_organization_id text, p_project_id uuid, p_max_per_day integer, p_max_per_project_per_day integer) TO selena_app;


--
-- Name: FUNCTION sv_complete_free_ai_visibility_check(p_check_id uuid, p_organization_id text, p_report jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_complete_free_ai_visibility_check(p_check_id uuid, p_organization_id text, p_report jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_complete_free_ai_visibility_check(p_check_id uuid, p_organization_id text, p_report jsonb) TO selena_app;


--
-- Name: FUNCTION sv_enforce_evidence_acceptance_receipt(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_enforce_evidence_acceptance_receipt() FROM PUBLIC;


--
-- Name: FUNCTION sv_guard_journal_daily_claim_mutation(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_guard_journal_daily_claim_mutation() FROM PUBLIC;


--
-- Name: FUNCTION sv_guard_journal_no_spend_reconciliation_insert(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_guard_journal_no_spend_reconciliation_insert() FROM PUBLIC;


--
-- Name: FUNCTION sv_journal_claim_recovery_state(p_claim_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_journal_claim_recovery_state(p_claim_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_journal_claim_recovery_state(p_claim_id uuid) TO selena_app;


--
-- Name: FUNCTION sv_local_customer_run_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_customer_run_guard() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_customer_start_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_customer_start_guard() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_customer_task_immutable(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_customer_task_immutable() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_customer_task_insert_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_customer_task_insert_guard() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_external_immutable(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_external_immutable() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_external_publication_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_external_publication_guard() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_external_raw_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_external_raw_guard() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_external_register_tasks(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_external_register_tasks() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_external_task_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_external_task_guard() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_order_publication_immutable(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_order_publication_immutable() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_pilot_attempt_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_pilot_attempt_guard() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_pilot_canary_review_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_pilot_canary_review_guard() FROM PUBLIC;


--
-- Name: FUNCTION sv_local_pilot_observation_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_local_pilot_observation_guard() FROM PUBLIC;


--
-- Name: FUNCTION sv_owner_reconcile_journal_no_spend(p_claim_id uuid, p_expected_run_ids uuid[], p_provider text, p_provider_account_scope_sha256 text, p_provider_dataset_resource_ids text[], p_evidence_window_start timestamp with time zone, p_evidence_window_end timestamp with time zone, p_execution_quiesced_at timestamp with time zone, p_billing_final_at timestamp with time zone, p_source_artifact_reference text, p_source_artifact_sha256 text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_owner_reconcile_journal_no_spend(p_claim_id uuid, p_expected_run_ids uuid[], p_provider text, p_provider_account_scope_sha256 text, p_provider_dataset_resource_ids text[], p_evidence_window_start timestamp with time zone, p_evidence_window_end timestamp with time zone, p_execution_quiesced_at timestamp with time zone, p_billing_final_at timestamp with time zone, p_source_artifact_reference text, p_source_artifact_sha256 text) FROM PUBLIC;


--
-- Name: FUNCTION sv_process_local_customer_fixture_query(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_process_local_customer_fixture_query() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_process_local_customer_fixture_query() TO selena_app;


--
-- Name: FUNCTION sv_provider_spend_committed(p_scope text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_provider_spend_committed(p_scope text) FROM PUBLIC;


--
-- Name: FUNCTION sv_publish_local_order(target_order uuid, allow_partial boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_publish_local_order(target_order uuid, allow_partial boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_publish_local_order(target_order uuid, allow_partial boolean) TO selena_app;


--
-- Name: FUNCTION sv_reconcile_journal_executor_settled(p_claim_id uuid, p_actor_id text, p_owner_decision_ref text, p_runtime_quiesced boolean, p_ambiguous_spend_acknowledged boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_reconcile_journal_executor_settled(p_claim_id uuid, p_actor_id text, p_owner_decision_ref text, p_runtime_quiesced boolean, p_ambiguous_spend_acknowledged boolean) FROM PUBLIC;


--
-- Name: FUNCTION sv_reconcile_journal_hold(p_claim_id uuid, p_actor_id text, p_owner_decision_ref text, p_runtime_quiesced boolean, p_ambiguous_spend_acknowledged boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_reconcile_journal_hold(p_claim_id uuid, p_actor_id text, p_owner_decision_ref text, p_runtime_quiesced boolean, p_ambiguous_spend_acknowledged boolean) FROM PUBLIC;


--
-- Name: FUNCTION sv_recover_journal_daily_claim(p_claim_id uuid, p_actor_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_recover_journal_daily_claim(p_claim_id uuid, p_actor_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_recover_journal_daily_claim(p_claim_id uuid, p_actor_id text) TO selena_app;


--
-- Name: FUNCTION sv_redeem_pilot_invite(p_code_hash text, p_plan_id text, p_organization_id text, p_user_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_redeem_pilot_invite(p_code_hash text, p_plan_id text, p_organization_id text, p_user_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_redeem_pilot_invite(p_code_hash text, p_plan_id text, p_organization_id text, p_user_id text) TO selena_app;


--
-- Name: FUNCTION sv_reject_journal_no_spend_cost_insert(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_reject_journal_no_spend_cost_insert() FROM PUBLIC;


--
-- Name: FUNCTION sv_reject_journal_no_spend_dependency_mutation(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_reject_journal_no_spend_dependency_mutation() FROM PUBLIC;


--
-- Name: FUNCTION sv_reject_journal_no_spend_execution_truncate(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_reject_journal_no_spend_execution_truncate() FROM PUBLIC;


--
-- Name: FUNCTION sv_reject_journal_no_spend_outcome_mutation(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_reject_journal_no_spend_outcome_mutation() FROM PUBLIC;


--
-- Name: FUNCTION sv_reject_journal_no_spend_provider_snapshot_insert(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_reject_journal_no_spend_provider_snapshot_insert() FROM PUBLIC;


--
-- Name: FUNCTION sv_reject_journal_no_spend_reconciliation_mutation(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_reject_journal_no_spend_reconciliation_mutation() FROM PUBLIC;


--
-- Name: FUNCTION sv_release_free_auto_dispatch(p_request_id uuid, p_organization_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_release_free_auto_dispatch(p_request_id uuid, p_organization_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_release_free_auto_dispatch(p_request_id uuid, p_organization_id text) TO selena_app;


--
-- Name: FUNCTION sv_release_provider_spend(p_scope text, p_organization_id text, p_request_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_release_provider_spend(p_scope text, p_organization_id text, p_request_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_release_provider_spend(p_scope text, p_organization_id text, p_request_key text) TO selena_app;


--
-- Name: FUNCTION sv_require_formal_evidence_audit_pair(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_require_formal_evidence_audit_pair() FROM PUBLIC;


--
-- Name: FUNCTION sv_require_formal_evidence_receipt_pair(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_require_formal_evidence_receipt_pair() FROM PUBLIC;


--
-- Name: FUNCTION sv_require_journal_no_spend_claim_pair(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_require_journal_no_spend_claim_pair() FROM PUBLIC;


--
-- Name: FUNCTION sv_reserve_provider_spend(p_scope text, p_organization_id text, p_request_key text, p_estimated_usd numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_reserve_provider_spend(p_scope text, p_organization_id text, p_request_key text, p_estimated_usd numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_reserve_provider_spend(p_scope text, p_organization_id text, p_request_key text, p_estimated_usd numeric) TO selena_app;


--
-- Name: FUNCTION sv_resolve_api_key_context(api_key_hash text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_resolve_api_key_context(api_key_hash text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_resolve_api_key_context(api_key_hash text) TO selena_app;


--
-- Name: FUNCTION sv_resolve_report_context(report_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_resolve_report_context(report_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_resolve_report_context(report_id uuid) TO selena_app;


--
-- Name: FUNCTION sv_resume_local_customer_fixture_run(target_order uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_resume_local_customer_fixture_run(target_order uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_resume_local_customer_fixture_run(target_order uuid) TO selena_app;


--
-- Name: FUNCTION sv_review_local_order_publication(base_id uuid, expected_hash text, reviewed_actions jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_review_local_order_publication(base_id uuid, expected_hash text, reviewed_actions jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_review_local_order_publication(base_id uuid, expected_hash text, reviewed_actions jsonb) TO selena_app;


--
-- Name: FUNCTION sv_revoke_local_order_publication(target_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_revoke_local_order_publication(target_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_revoke_local_order_publication(target_id uuid) TO selena_app;


--
-- Name: FUNCTION sv_settle_provider_spend(p_scope text, p_organization_id text, p_request_key text, p_actual_usd numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sv_settle_provider_spend(p_scope text, p_organization_id text, p_request_key text, p_actual_usd numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sv_settle_provider_spend(p_scope text, p_organization_id text, p_request_key text, p_actual_usd numeric) TO selena_app;


--
-- Name: TABLE bam; Type: ACL; Schema: pgboss; Owner: -
--

GRANT SELECT ON TABLE pgboss.bam TO selena_app;


--
-- Name: TABLE job; Type: ACL; Schema: pgboss; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE pgboss.job TO selena_app;


--
-- Name: TABLE job_common; Type: ACL; Schema: pgboss; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE pgboss.job_common TO selena_app;


--
-- Name: TABLE job_dependency; Type: ACL; Schema: pgboss; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE pgboss.job_dependency TO selena_app;


--
-- Name: TABLE queue; Type: ACL; Schema: pgboss; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE pgboss.queue TO selena_app;


--
-- Name: TABLE schedule; Type: ACL; Schema: pgboss; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE pgboss.schedule TO selena_app;


--
-- Name: TABLE subscription; Type: ACL; Schema: pgboss; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE pgboss.subscription TO selena_app;


--
-- Name: TABLE version; Type: ACL; Schema: pgboss; Owner: -
--

GRANT SELECT ON TABLE pgboss.version TO selena_app;


--
-- Name: TABLE account; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account TO selena_app;


--
-- Name: TABLE brand_opportunities; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.brand_opportunities TO selena_app;


--
-- Name: TABLE brands; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.brands TO selena_app;


--
-- Name: TABLE citations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.citations TO selena_app;


--
-- Name: TABLE competitors; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.competitors TO selena_app;


--
-- Name: TABLE invitation; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.invitation TO selena_app;


--
-- Name: TABLE member; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.member TO selena_app;


--
-- Name: TABLE organization; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.organization TO selena_app;


--
-- Name: TABLE organization_settings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.organization_settings TO selena_app;


--
-- Name: TABLE prompt_run_hourly_aggregates; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.prompt_run_hourly_aggregates TO selena_app;


--
-- Name: TABLE prompt_runs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.prompt_runs TO selena_app;


--
-- Name: TABLE prompts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.prompts TO selena_app;


--
-- Name: TABLE reports; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.reports TO selena_app;


--
-- Name: TABLE secrets; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.secrets TO selena_app;


--
-- Name: TABLE session; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.session TO selena_app;


--
-- Name: TABLE sso_provider; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sso_provider TO selena_app;


--
-- Name: TABLE subscription; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.subscription TO selena_app;


--
-- Name: TABLE sv_api_idempotency_records; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_api_idempotency_records TO selena_app;


--
-- Name: TABLE sv_api_keys; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_api_keys TO selena_app;


--
-- Name: TABLE sv_audit_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_audit_events TO selena_app;


--
-- Name: TABLE sv_business_locations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_business_locations TO selena_app;


--
-- Name: TABLE sv_capture_tasks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_capture_tasks TO selena_app;


--
-- Name: TABLE sv_citation_gap_snapshots; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_citation_gap_snapshots TO selena_app;


--
-- Name: TABLE sv_configuration_locks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_configuration_locks TO selena_app;


--
-- Name: TABLE sv_cost_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_cost_events TO selena_app;


--
-- Name: TABLE sv_cycles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_cycles TO selena_app;


--
-- Name: TABLE sv_entities; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_entities TO selena_app;


--
-- Name: COLUMN sv_evidence_acceptance_receipts.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.sv_evidence_acceptance_receipts TO selena_app;


--
-- Name: COLUMN sv_evidence_acceptance_receipts.organization_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(organization_id) ON TABLE public.sv_evidence_acceptance_receipts TO selena_app;


--
-- Name: COLUMN sv_evidence_acceptance_receipts.evidence_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(evidence_id) ON TABLE public.sv_evidence_acceptance_receipts TO selena_app;


--
-- Name: COLUMN sv_evidence_acceptance_receipts.accepted_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(accepted_at) ON TABLE public.sv_evidence_acceptance_receipts TO selena_app;


--
-- Name: TABLE sv_evidence_index; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_evidence_index TO selena_app;


--
-- Name: TABLE sv_measurement_cycles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_measurement_cycles TO selena_app;


--
-- Name: TABLE sv_measurement_datasets; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_measurement_datasets TO selena_app;


--
-- Name: TABLE sv_provider_dataset_capabilities; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_provider_dataset_capabilities TO selena_app;


--
-- Name: TABLE sv_source_snapshots; Type: ACL; Schema: public; Owner: -
--

GRANT INSERT ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.organization_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(organization_id) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.source_type; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(source_type) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.captured_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(captured_at) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.immutable; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(immutable) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.created_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(created_at) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.capability_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(capability_id) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.input_schema_version; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(input_schema_version) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.output_schema_version; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(output_schema_version) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.content_sha256_format_valid; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(content_sha256_format_valid) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: COLUMN sv_source_snapshots.project_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(project_id) ON TABLE public.sv_source_snapshots TO selena_app;


--
-- Name: TABLE sv_evidence_read_model; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.sv_evidence_read_model TO selena_app;


--
-- Name: TABLE sv_findings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_findings TO selena_app;


--
-- Name: TABLE sv_free_ai_visibility_checks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.sv_free_ai_visibility_checks TO selena_app;


--
-- Name: TABLE sv_grid_definitions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_grid_definitions TO selena_app;


--
-- Name: TABLE sv_grid_points; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_grid_points TO selena_app;


--
-- Name: TABLE sv_incidents; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_incidents TO selena_app;


--
-- Name: TABLE sv_journal_daily_claims; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_journal_daily_claims TO selena_app;


--
-- Name: TABLE sv_journal_provider_boundaries; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_journal_provider_boundaries TO selena_app;


--
-- Name: TABLE sv_local_ai_cost_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_cost_events TO selena_app;


--
-- Name: TABLE sv_local_ai_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_events TO selena_app;


--
-- Name: TABLE sv_local_ai_evidence; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_evidence TO selena_app;


--
-- Name: COLUMN sv_local_ai_evidence.raw_body; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(raw_body) ON TABLE public.sv_local_ai_evidence TO selena_app;


--
-- Name: COLUMN sv_local_ai_evidence.raw_canonical; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(raw_canonical) ON TABLE public.sv_local_ai_evidence TO selena_app;


--
-- Name: COLUMN sv_local_ai_evidence.expired_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(expired_at) ON TABLE public.sv_local_ai_evidence TO selena_app;


--
-- Name: TABLE sv_local_ai_orders; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_orders TO selena_app;


--
-- Name: COLUMN sv_local_ai_orders.id; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(id) ON TABLE public.sv_local_ai_orders TO selena_app;


--
-- Name: TABLE sv_local_ai_payments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_payments TO selena_app;


--
-- Name: TABLE sv_local_ai_slots; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_slots TO selena_app;


--
-- Name: COLUMN sv_local_ai_slots.id; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(id) ON TABLE public.sv_local_ai_slots TO selena_app;


--
-- Name: TABLE sv_local_canary_reviews; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.sv_local_canary_reviews TO selena_app;


--
-- Name: TABLE sv_local_competitor_observations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_local_competitor_observations TO selena_app;


--
-- Name: TABLE sv_local_customer_runs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_customer_runs TO selena_app;


--
-- Name: TABLE sv_local_customer_tasks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_customer_tasks TO selena_app;


--
-- Name: TABLE sv_local_dispatch_outbox; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.sv_local_dispatch_outbox TO selena_app;


--
-- Name: TABLE sv_local_evidence_acceptances; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_evidence_acceptances TO selena_app;


--
-- Name: TABLE sv_local_external_audits; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_external_audits TO selena_app;


--
-- Name: TABLE sv_local_external_publications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_external_publications TO selena_app;


--
-- Name: TABLE sv_local_external_raw_evidence; Type: ACL; Schema: public; Owner: -
--

GRANT INSERT ON TABLE public.sv_local_external_raw_evidence TO selena_app;


--
-- Name: COLUMN sv_local_external_raw_evidence.provider_task_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(provider_task_id) ON TABLE public.sv_local_external_raw_evidence TO selena_app;


--
-- Name: COLUMN sv_local_external_raw_evidence.organization_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(organization_id) ON TABLE public.sv_local_external_raw_evidence TO selena_app;


--
-- Name: COLUMN sv_local_external_raw_evidence.audit_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(audit_id) ON TABLE public.sv_local_external_raw_evidence TO selena_app;


--
-- Name: COLUMN sv_local_external_raw_evidence.raw_sha256; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(raw_sha256) ON TABLE public.sv_local_external_raw_evidence TO selena_app;


--
-- Name: COLUMN sv_local_external_raw_evidence.captured_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(captured_at) ON TABLE public.sv_local_external_raw_evidence TO selena_app;


--
-- Name: COLUMN sv_local_external_raw_evidence.retention_expires_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(retention_expires_at) ON TABLE public.sv_local_external_raw_evidence TO selena_app;


--
-- Name: COLUMN sv_local_external_raw_evidence.raw_body; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(raw_body) ON TABLE public.sv_local_external_raw_evidence TO selena_app;


--
-- Name: COLUMN sv_local_external_raw_evidence.raw_deleted_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(raw_deleted_at),UPDATE(raw_deleted_at) ON TABLE public.sv_local_external_raw_evidence TO selena_app;


--
-- Name: TABLE sv_local_external_tasks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_external_tasks TO selena_app;


--
-- Name: TABLE sv_local_keywords; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_local_keywords TO selena_app;


--
-- Name: TABLE sv_local_observations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_local_observations TO selena_app;


--
-- Name: TABLE sv_local_order_publications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.sv_local_order_publications TO selena_app;


--
-- Name: TABLE sv_local_qc_decisions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.sv_local_qc_decisions TO selena_app;


--
-- Name: TABLE sv_local_rank_observations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_local_rank_observations TO selena_app;


--
-- Name: TABLE sv_local_raw_evidence; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.sv_local_raw_evidence TO selena_app;


--
-- Name: TABLE sv_local_raw_retention_health; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.sv_local_raw_retention_health TO selena_app;


--
-- Name: TABLE sv_local_report_deliveries; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.sv_local_report_deliveries TO selena_app;


--
-- Name: TABLE sv_local_report_versions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.sv_local_report_versions TO selena_app;


--
-- Name: TABLE sv_local_scan_cycles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_local_scan_cycles TO selena_app;


--
-- Name: TABLE sv_local_visibility_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_local_visibility_metrics TO selena_app;


--
-- Name: TABLE sv_measurement_attempt_results; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_measurement_attempt_results TO selena_app;


--
-- Name: TABLE sv_measurement_attempts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_measurement_attempts TO selena_app;


--
-- Name: TABLE sv_observation_evidence_assets; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_observation_evidence_assets TO selena_app;


--
-- Name: TABLE sv_observation_mentions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_observation_mentions TO selena_app;


--
-- Name: TABLE sv_order_requests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_order_requests TO selena_app;


--
-- Name: TABLE sv_orders; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_orders TO selena_app;


--
-- Name: TABLE sv_payments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_payments TO selena_app;


--
-- Name: TABLE sv_pilot_cycles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_pilot_cycles TO selena_app;


--
-- Name: TABLE sv_project_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_project_profiles TO selena_app;


--
-- Name: TABLE sv_projects; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_projects TO selena_app;


--
-- Name: TABLE sv_prompt_families; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_prompt_families TO selena_app;


--
-- Name: TABLE sv_provider_canary_executions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_provider_canary_executions TO selena_app;


--
-- Name: TABLE sv_provider_dataset_snapshot_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_provider_dataset_snapshot_events TO selena_app;


--
-- Name: TABLE sv_qc_records; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_qc_records TO selena_app;


--
-- Name: TABLE sv_quotes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_quotes TO selena_app;


--
-- Name: TABLE sv_recommendation_actions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_recommendation_actions TO selena_app;


--
-- Name: TABLE sv_recommendation_evidence; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_recommendation_evidence TO selena_app;


--
-- Name: TABLE sv_recommendation_findings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_recommendation_findings TO selena_app;


--
-- Name: TABLE sv_recommendation_manifests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_recommendation_manifests TO selena_app;


--
-- Name: TABLE sv_recommendation_runs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_recommendation_runs TO selena_app;


--
-- Name: TABLE sv_recommendation_tasks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_recommendation_tasks TO selena_app;


--
-- Name: TABLE sv_recommendations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_recommendations TO selena_app;


--
-- Name: TABLE sv_response_mentions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_response_mentions TO selena_app;


--
-- Name: TABLE sv_run_permits; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_run_permits TO selena_app;


--
-- Name: TABLE sv_runs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_runs TO selena_app;


--
-- Name: TABLE sv_scenarios; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_scenarios TO selena_app;


--
-- Name: TABLE sv_visibility_map_points; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.sv_visibility_map_points TO selena_app;


--
-- Name: TABLE sv_visibility_map_datasets; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.sv_visibility_map_datasets TO selena_app;


--
-- Name: TABLE sv_website_snapshots; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sv_website_snapshots TO selena_app;


--
-- Name: TABLE usage_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.usage_events TO selena_app;


--
-- Name: TABLE "user"; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."user" TO selena_app;


--
-- Name: TABLE verification; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.verification TO selena_app;


--
-- PostgreSQL database dump complete
--

\unrestrict oJrWQ2UzRxMFVIMV6c9WEnXAoKmvggqSNbjoEk4Oh1yi7KTo301lLUbQAcSzZ3G

