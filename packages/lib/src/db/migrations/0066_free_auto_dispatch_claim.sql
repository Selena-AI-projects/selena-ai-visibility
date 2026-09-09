DO $migration_preflight$
BEGIN
	IF to_regprocedure('public.sv_redeem_pilot_invite(text,text,text,text)') IS NULL THEN
		RAISE EXCEPTION 'FREE_AUTO_DISPATCH_CLAIM_REQUIRES_MIGRATION_0061';
	END IF;
END;
$migration_preflight$;
--> statement-breakpoint
-- A free plan request may start its own measurement, but only under two daily
-- caps that span every tenant: a leaked pilot code is redeemed from fresh
-- accounts, so a per-tenant count would not bound it. The runtime role cannot
-- count other tenants' rows under RLS, and a count followed by a dispatch
-- races with a concurrent request. So the count and the decision are one
-- statement here, in a table the runtime role cannot read, behind a lock that
-- serializes claimants: two requests cannot both read "one slot left".
--
-- One row is one slot taken on one UTC day. The request id is unique so a
-- retried submission keeps the slot it already holds instead of taking two.
CREATE TABLE "sv_free_auto_dispatch_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"utc_day" date NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "sv_free_auto_dispatch_claims_request_key" UNIQUE ("request_id"),
	CONSTRAINT "sv_free_auto_dispatch_claims_org_present" CHECK (length(btrim("organization_id")) > 0)
);
--> statement-breakpoint
CREATE INDEX "sv_free_auto_dispatch_claims_day_idx"
	ON "sv_free_auto_dispatch_claims" ("utc_day");
--> statement-breakpoint
CREATE INDEX "sv_free_auto_dispatch_claims_day_project_idx"
	ON "sv_free_auto_dispatch_claims" ("utc_day", "project_id");
--> statement-breakpoint
ALTER TABLE "sv_free_auto_dispatch_claims" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- No policy is defined on purpose. With RLS enabled and no policy, every role
-- subject to it reads nothing; the owner is left unforced so the claim
-- function below can still count and insert. RLS is not FORCEd for that
-- reason, the same shape as the pilot seats in 0061.
CREATE FUNCTION "sv_claim_free_auto_dispatch"(
	p_request_id uuid,
	p_organization_id text,
	p_project_id uuid,
	p_max_per_day integer,
	p_max_per_project_per_day integer
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $claim$
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
$claim$;
--> statement-breakpoint
-- A slot is given back only by the tenant that took it, and only for a
-- request that never reached an order: an honest failure before that point —
-- a profile with no questions — must not cost the project its one slot for
-- the day. Once an order exists the slot stays taken whatever happened next,
-- because the order is the desk's to finish.
CREATE FUNCTION "sv_release_free_auto_dispatch"(
	p_request_id uuid,
	p_organization_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $release$
BEGIN
	IF p_request_id IS NULL OR length(btrim(coalesce(p_organization_id, ''))) = 0 THEN
		RAISE EXCEPTION 'FREE_AUTO_DISPATCH_CLAIMANT_REQUIRED';
	END IF;
	DELETE FROM "sv_free_auto_dispatch_claims"
		WHERE "request_id" = p_request_id
			AND "organization_id" = p_organization_id;
	RETURN FOUND;
END;
$release$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_claim_free_auto_dispatch"(uuid, text, uuid, integer, integer) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_release_free_auto_dispatch"(uuid, text) FROM PUBLIC;
--> statement-breakpoint
DO $runtime_grants$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app') THEN
		-- The runtime may take a slot and give its own back, and learn nothing
		-- else: no reading of who dispatched today, no way to raise a cap.
		EXECUTE 'REVOKE ALL ON TABLE "public"."sv_free_auto_dispatch_claims" FROM selena_app';
		EXECUTE 'GRANT EXECUTE ON FUNCTION "public"."sv_claim_free_auto_dispatch"(uuid, text, uuid, integer, integer) TO selena_app';
		EXECUTE 'GRANT EXECUTE ON FUNCTION "public"."sv_release_free_auto_dispatch"(uuid, text) TO selena_app';
	END IF;
END;
$runtime_grants$;
