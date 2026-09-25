-- Brand, prompt and organization access is decided before any tenant context exists, and
-- under a non-owner role `brands` and `prompts` are invisible until
-- app.organization_id is set. These return the owning organization only when
-- the user is a member of it, so they reveal nothing a caller could not
-- already reach.
CREATE FUNCTION "sv_resolve_brand_membership"(session_user_id text, target_brand_id text)
RETURNS TABLE (organization_id text, organization_name text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT "o"."id", "o"."name", "m"."role"
	FROM "public"."brands" AS "b"
	JOIN "public"."member" AS "m" ON "m"."organization_id" = "b"."organization_id" AND "m"."user_id" = $1
	JOIN "public"."organization" AS "o" ON "o"."id" = "b"."organization_id"
	WHERE "b"."id" = $2
	LIMIT 1
$$;
--> statement-breakpoint
CREATE FUNCTION "sv_resolve_prompt_membership"(session_user_id text, target_prompt_id uuid)
RETURNS TABLE (brand_id text, organization_id text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT "b"."id", "b"."organization_id", "m"."role"
	FROM "public"."prompts" AS "p"
	JOIN "public"."brands" AS "b" ON "b"."id" = "p"."brand_id"
	JOIN "public"."member" AS "m" ON "m"."organization_id" = "b"."organization_id" AND "m"."user_id" = $1
	WHERE "p"."id" = $2
	LIMIT 1
$$;
--> statement-breakpoint
CREATE FUNCTION "sv_resolve_user_organizations"(session_user_id text)
RETURNS TABLE (organization_id text, organization_name text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT "o"."id", "o"."name", "m"."role"
	FROM "public"."member" AS "m"
	JOIN "public"."organization" AS "o" ON "o"."id" = "m"."organization_id"
	WHERE "m"."user_id" = $1
	ORDER BY "m"."created_at", "o"."id"
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_resolve_brand_membership"(text, text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_resolve_prompt_membership"(text, uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_resolve_user_organizations"(text) FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		GRANT EXECUTE ON FUNCTION "sv_resolve_brand_membership"(text, text) TO selena_app;
		GRANT EXECUTE ON FUNCTION "sv_resolve_prompt_membership"(text, uuid) TO selena_app;
		GRANT EXECUTE ON FUNCTION "sv_resolve_user_organizations"(text) TO selena_app;
	END IF;
END;
$$;
