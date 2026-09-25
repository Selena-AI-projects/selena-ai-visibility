-- A pilot invite is an operator-issued seat, not tenant data: it exists before
-- any organization does, and it decides which plan that organization gets. So
-- it lives outside the tenant tables and outside the runtime role's reach.
--
-- The code itself is never stored. Only its SHA-256 digest is, so a database
-- dump, a log line or a support screenshot cannot hand anyone a working code.
--
-- One-time use is a property of the redeeming statement, not of a check the
-- caller is trusted to perform first: a single conditional UPDATE claims the
-- row, so two concurrent redemptions of one code cannot both succeed.
CREATE TABLE "sv_pilot_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code_hash" text NOT NULL,
	"plan_id" text NOT NULL,
	"label" text,
	"expires_at" timestamptz NOT NULL,
	"redeemed_at" timestamptz,
	"redeemed_by_organization_id" text,
	"redeemed_by_user_id" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "sv_pilot_invites_code_hash_key" UNIQUE ("code_hash"),
	CONSTRAINT "sv_pilot_invites_code_hash_shape" CHECK ("code_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sv_pilot_invites_plan_id_present" CHECK (length(btrim("plan_id")) > 0),
	CONSTRAINT "sv_pilot_invites_redemption_check" CHECK (
		(
			"redeemed_at" IS NULL
			AND "redeemed_by_organization_id" IS NULL
			AND "redeemed_by_user_id" IS NULL
		)
		OR (
			"redeemed_at" IS NOT NULL
			AND length(btrim("redeemed_by_organization_id")) > 0
			AND length(btrim("redeemed_by_user_id")) > 0
		)
	)
);
--> statement-breakpoint
CREATE INDEX "sv_pilot_invites_open_idx"
	ON "sv_pilot_invites" ("expires_at")
	WHERE "redeemed_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "sv_pilot_invites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- No policy is defined on purpose. With RLS enabled and no policy, every role
-- subject to it reads nothing; the owner is left unforced so the redemption
-- function below can still claim a row. RLS is not FORCEd for that reason.
CREATE FUNCTION "sv_redeem_pilot_invite"(
	p_code_hash text,
	p_plan_id text,
	p_organization_id text,
	p_user_id text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $redeem$
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
$redeem$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_redeem_pilot_invite"(text, text, text, text) FROM PUBLIC;
--> statement-breakpoint
DO $runtime_grants$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app') THEN
		-- The runtime may redeem a seat and learn nothing else: no enumeration of
		-- outstanding codes, no digests, no way to mint or extend one.
		EXECUTE 'REVOKE ALL ON TABLE "public"."sv_pilot_invites" FROM selena_app';
		EXECUTE 'GRANT EXECUTE ON FUNCTION "public"."sv_redeem_pilot_invite"(text, text, text, text) TO selena_app';
	END IF;
END;
$runtime_grants$;
