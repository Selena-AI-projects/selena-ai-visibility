-- The weekly digest job starts with no workspace: it has to learn which ones
-- have a Telegram chat bound before it can scope a single query to them.
-- Row-level security cannot answer "which tenants" for a caller that is none
-- of them, so, as with sv_redeem_delivery_connect_token, one definer function
-- answers it and returns only the pairs to visit. Everything the job then
-- reads or writes about a workspace runs under that workspace's own scope.
CREATE FUNCTION "sv_list_weekly_digest_targets"()
RETURNS TABLE ("organization_id" text, "project_id" uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $targets$
	SELECT DISTINCT r."organization_id", r."project_id"
		FROM "sv_delivery_recipients" r
		WHERE r."channel" = 'telegram' AND r."status" = 'BOUND'
		ORDER BY r."organization_id", r."project_id";
$targets$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_list_weekly_digest_targets"() FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		GRANT EXECUTE ON FUNCTION "sv_list_weekly_digest_targets"() TO selena_app;
	END IF;
END;
$$;
