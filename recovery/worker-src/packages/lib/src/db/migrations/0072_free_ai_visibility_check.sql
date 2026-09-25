DO $migration_preflight$
BEGIN
	IF to_regprocedure('public.sv_reserve_provider_spend(text,text,text,numeric)') IS NULL THEN
		RAISE EXCEPTION 'FREE_AI_VISIBILITY_CHECK_REQUIRES_MIGRATION_0062';
	END IF;
END;
$migration_preflight$;
--> statement-breakpoint
-- One free check is a separate product surface, not a zero-priced order. The
-- global uniqueness constraints bind both the person and the effective domain,
-- while the claim function joins that decision to the provider reservation.
CREATE TABLE "sv_free_ai_visibility_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"user_id" text NOT NULL REFERENCES "user"("id"),
	"registrable_domain" text NOT NULL,
	"reservation_request_key" text NOT NULL UNIQUE,
	"status" text NOT NULL DEFAULT 'QUEUED',
	"report" jsonb,
	"queued_at" timestamptz NOT NULL DEFAULT now(),
	"dispatched_at" timestamptz,
	"completed_at" timestamptz,
	CONSTRAINT "sv_free_ai_visibility_checks_one_per_user" UNIQUE ("user_id"),
	CONSTRAINT "sv_free_ai_visibility_checks_one_per_domain" UNIQUE ("registrable_domain"),
	CONSTRAINT "sv_free_ai_visibility_checks_domain_present" CHECK (length(btrim("registrable_domain")) > 0),
	CONSTRAINT "sv_free_ai_visibility_checks_status" CHECK (
		("status" = 'QUEUED' AND "report" IS NULL AND "dispatched_at" IS NULL AND "completed_at" IS NULL)
		OR ("status" = 'UNCONFIRMED' AND "report" IS NULL AND "dispatched_at" IS NOT NULL AND "completed_at" IS NULL)
		OR ("status" = 'COMPLETED' AND "report" IS NOT NULL AND "dispatched_at" IS NOT NULL AND "completed_at" IS NOT NULL)
	)
);
--> statement-breakpoint
CREATE INDEX "sv_free_ai_visibility_checks_org_user_idx"
	ON "sv_free_ai_visibility_checks" ("organization_id", "user_id");
--> statement-breakpoint
ALTER TABLE "sv_free_ai_visibility_checks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_free_ai_visibility_checks"
	FOR SELECT USING ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
-- This is owner-controlled seed funding, not an environment value. The runtime
-- can consume the $10 scope but cannot increase it.
INSERT INTO "sv_provider_spend_budgets" ("scope", "cap_usd")
	VALUES ('free-ai-visibility-global', 10.000000)
	ON CONFLICT ("scope") DO NOTHING;
--> statement-breakpoint
CREATE FUNCTION "sv_claim_free_ai_visibility"(
	p_user_id text,
	p_organization_id text,
	p_registrable_domain text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $claim$
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
$claim$;
--> statement-breakpoint
-- The durable pre-transport state deliberately reads UNCONFIRMED. If a worker
-- dies once dispatch begins, there is no evidence that either provider escaped
-- and no later job is allowed to guess by retrying or releasing the reservation.
CREATE FUNCTION "sv_begin_free_ai_visibility_check"(
	p_check_id uuid,
	p_organization_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $begin$
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
$begin$;
--> statement-breakpoint
CREATE FUNCTION "sv_complete_free_ai_visibility_check"(
	p_check_id uuid,
	p_organization_id text,
	p_report jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $complete$
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
$complete$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_claim_free_ai_visibility"(text, text, text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_begin_free_ai_visibility_check"(uuid, text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_complete_free_ai_visibility_check"(uuid, text, jsonb) FROM PUBLIC;
--> statement-breakpoint
DO $runtime_grants$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app') THEN
		EXECUTE 'REVOKE ALL ON TABLE "public"."sv_free_ai_visibility_checks" FROM selena_app';
		EXECUTE 'GRANT SELECT ON TABLE "public"."sv_free_ai_visibility_checks" TO selena_app';
		EXECUTE 'GRANT EXECUTE ON FUNCTION "public"."sv_claim_free_ai_visibility"(text, text, text) TO selena_app';
		EXECUTE 'GRANT EXECUTE ON FUNCTION "public"."sv_begin_free_ai_visibility_check"(uuid, text) TO selena_app';
		EXECUTE 'GRANT EXECUTE ON FUNCTION "public"."sv_complete_free_ai_visibility_check"(uuid, text, jsonb) TO selena_app';
	END IF;
END;
$runtime_grants$;
