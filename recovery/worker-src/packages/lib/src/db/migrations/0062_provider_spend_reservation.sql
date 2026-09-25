-- The meter the spend gates never had.
--
-- Until now every ceiling in this system was a gate: a flag that says whether a
-- provider may be called at all. Nothing counted what had already been spent,
-- so a stated cap held only as far as the limit configured on the provider
-- account itself. These two tables and three functions are the counter.
--
-- The ceiling lives in the database rather than in the environment, because a
-- ceiling the runtime can read out of its own configuration is a ceiling the
-- runtime can be handed a larger copy of. The runtime holds no privilege on
-- either table: it may reserve, settle and release through the functions below
-- and cannot raise its own budget.
--
-- Reserving is serialized on the scope, so two concurrent requests cannot both
-- read the same remaining balance and both pass. That is the specific race a
-- count-then-spend check loses.
CREATE TABLE "sv_provider_spend_budgets" (
	"scope" text PRIMARY KEY,
	"cap_usd" numeric(12, 6) NOT NULL,
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "sv_provider_spend_budgets_cap_nonnegative" CHECK ("cap_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sv_provider_spend_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"scope" text NOT NULL,
	"organization_id" text NOT NULL,
	"request_key" text NOT NULL,
	"estimated_usd" numeric(12, 6) NOT NULL,
	"actual_usd" numeric(12, 6),
	"status" text NOT NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"settled_at" timestamptz,
	CONSTRAINT "sv_provider_spend_reservations_request_key" UNIQUE ("scope", "organization_id", "request_key"),
	CONSTRAINT "sv_provider_spend_reservations_estimate_nonnegative" CHECK ("estimated_usd" >= 0),
	CONSTRAINT "sv_provider_spend_reservations_status_check" CHECK (
		(
			"status" = 'RESERVED'
			AND "actual_usd" IS NULL AND "settled_at" IS NULL
		)
		OR (
			"status" = 'SETTLED'
			AND "actual_usd" IS NOT NULL AND "actual_usd" >= 0 AND "settled_at" IS NOT NULL
		)
		OR (
			"status" = 'RELEASED'
			AND "actual_usd" IS NULL AND "settled_at" IS NOT NULL
		)
	)
);
--> statement-breakpoint
CREATE INDEX "sv_provider_spend_reservations_scope_status_idx"
	ON "sv_provider_spend_reservations" ("scope", "status");
--> statement-breakpoint
ALTER TABLE "sv_provider_spend_budgets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_provider_spend_reservations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- What the scope has committed: money already spent, plus money promised to a
-- call that has not reported back yet. A released reservation contributes
-- nothing, which is what makes a failed call give its budget back.
CREATE FUNCTION "sv_provider_spend_committed"(p_scope text) RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $committed$
	SELECT coalesce(sum(
		CASE "status"
			WHEN 'RESERVED' THEN "estimated_usd"
			WHEN 'SETTLED' THEN "actual_usd"
			ELSE 0
		END
	), 0)
	FROM "sv_provider_spend_reservations"
	WHERE "scope" = p_scope;
$committed$;
--> statement-breakpoint
CREATE FUNCTION "sv_reserve_provider_spend"(
	p_scope text,
	p_organization_id text,
	p_request_key text,
	p_estimated_usd numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $reserve$
DECLARE
	existing "sv_provider_spend_reservations"%ROWTYPE;
	cap numeric;
	committed numeric;
	created "sv_provider_spend_reservations"%ROWTYPE;
BEGIN
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
$reserve$;
--> statement-breakpoint
-- Settling records what the call actually cost. An actual above the estimate is
-- accepted rather than rejected: the money is already gone, and the next
-- reservation is the one that has to notice.
CREATE FUNCTION "sv_settle_provider_spend"(
	p_scope text,
	p_organization_id text,
	p_request_key text,
	p_actual_usd numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $settle$
DECLARE
	updated "sv_provider_spend_reservations"%ROWTYPE;
	current_status text;
BEGIN
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
$settle$;
--> statement-breakpoint
-- Releasing gives an unspent reservation back. A call that never reached the
-- provider must not hold budget nobody can use again.
CREATE FUNCTION "sv_release_provider_spend"(
	p_scope text,
	p_organization_id text,
	p_request_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $release$
DECLARE
	updated "sv_provider_spend_reservations"%ROWTYPE;
	current_status text;
BEGIN
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
$release$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_provider_spend_committed"(text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_reserve_provider_spend"(text, text, text, numeric) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_settle_provider_spend"(text, text, text, numeric) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_release_provider_spend"(text, text, text) FROM PUBLIC;
--> statement-breakpoint
DO $runtime_grants$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'selena_app') THEN
		-- Spend, report and give back. Never set the ceiling, never edit a
		-- settled row, never read another scope's ledger directly.
		EXECUTE 'REVOKE ALL ON TABLE "public"."sv_provider_spend_budgets" FROM selena_app';
		EXECUTE 'REVOKE ALL ON TABLE "public"."sv_provider_spend_reservations" FROM selena_app';
		EXECUTE 'GRANT EXECUTE ON FUNCTION "public"."sv_reserve_provider_spend"(text, text, text, numeric) TO selena_app';
		EXECUTE 'GRANT EXECUTE ON FUNCTION "public"."sv_settle_provider_spend"(text, text, text, numeric) TO selena_app';
		EXECUTE 'GRANT EXECUTE ON FUNCTION "public"."sv_release_provider_spend"(text, text, text) TO selena_app';
	END IF;
END;
$runtime_grants$;
