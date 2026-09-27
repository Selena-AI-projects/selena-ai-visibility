-- A connect link is redeemed by a Telegram update, not by a signed-in user, so
-- the webhook knows the chat and the token and nothing about which workspace
-- the link belongs to. Row-level security cannot scope a lookup whose scope is
-- the thing being looked up, so this function is the one path that finds a
-- token by its hash across workspaces, as sv_resolve_api_key_context does for
-- API keys. It consumes the token and binds the chat in one step and returns
-- only the outcome, never the workspace or project.
--
-- The digest language is chosen where the link is made, in the workspace, so
-- the token carries it to the recipient row.
ALTER TABLE "sv_delivery_connect_tokens" ADD COLUMN "locale" text DEFAULT 'ru' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sv_delivery_connect_tokens" ADD CONSTRAINT "sv_delivery_connect_tokens_locale_check" CHECK ("locale" IN ('ru', 'en'));
--> statement-breakpoint
CREATE FUNCTION "sv_redeem_delivery_connect_token"(
	p_token_hash text,
	p_chat_id_ciphertext text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $redeem$
DECLARE
	link record;
BEGIN
	IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
		RETURN 'UNKNOWN';
	END IF;
	IF length(btrim(coalesce(p_chat_id_ciphertext, ''))) = 0 THEN
		RAISE EXCEPTION 'DELIVERY_CHAT_REQUIRED';
	END IF;

	-- Locked, so two presses of the same link cannot both bind.
	SELECT "id", "organization_id", "project_id", "user_id", "locale", "consumed_at", "expires_at"
		INTO link
		FROM "sv_delivery_connect_tokens"
		WHERE "token_hash" = p_token_hash
		FOR UPDATE;
	IF NOT FOUND THEN
		RETURN 'UNKNOWN';
	END IF;
	IF link."consumed_at" IS NOT NULL THEN
		RETURN 'ALREADY_USED';
	END IF;
	IF link."expires_at" <= now() THEN
		RETURN 'EXPIRED';
	END IF;

	UPDATE "sv_delivery_connect_tokens" SET "consumed_at" = now() WHERE "id" = link."id";

	-- One chat per project: a new binding retires the old one rather than
	-- becoming a second destination for the same report.
	UPDATE "sv_delivery_recipients"
		SET "status" = 'UNBOUND', "unbound_at" = now(), "unbound_reason" = 'REPLACED_BY_NEW_BINDING'
		WHERE "organization_id" = link."organization_id"
			AND "project_id" = link."project_id"
			AND "channel" = 'telegram'
			AND "status" = 'BOUND';

	INSERT INTO "sv_delivery_recipients"
		("organization_id", "project_id", "channel", "chat_id_ciphertext", "locale", "status", "bound_by")
		VALUES (link."organization_id", link."project_id", 'telegram', p_chat_id_ciphertext, link."locale", 'BOUND', link."user_id");

	RETURN 'BOUND';
END;
$redeem$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_redeem_delivery_connect_token"(text, text) FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		GRANT EXECUTE ON FUNCTION "sv_redeem_delivery_connect_token"(text, text) TO selena_app;
	END IF;
END;
$$;
