CREATE FUNCTION "sv_resolve_session_memberships"(session_user_id text)
RETURNS TABLE (organization_id text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT "m"."organization_id", "m"."role"
	FROM "public"."member" AS "m"
	JOIN "public"."organization" AS "o" ON "o"."id" = "m"."organization_id"
	WHERE "m"."user_id" = $1
	ORDER BY "m"."created_at", "m"."organization_id"
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_resolve_session_memberships"(text) FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		GRANT EXECUTE ON FUNCTION "sv_resolve_session_memberships"(text) TO selena_app;
	END IF;
END;
$$;
