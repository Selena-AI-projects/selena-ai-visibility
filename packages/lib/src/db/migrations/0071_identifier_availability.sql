-- Brand ids and organization slugs are unique across every tenant, but under a
-- non-owner role a tenant cannot see other tenants' rows to check for a clash.
-- These answer only "is it taken", which reveals no more than the unique index
-- already would on insert.
CREATE FUNCTION "sv_brand_id_taken"(candidate_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (SELECT 1 FROM "public"."brands" WHERE "id" = $1)
$$;
--> statement-breakpoint
CREATE FUNCTION "sv_organization_slug_taken"(candidate_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (SELECT 1 FROM "public"."organization" WHERE "slug" = $1)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_brand_id_taken"(text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_organization_slug_taken"(text) FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		GRANT EXECUTE ON FUNCTION "sv_brand_id_taken"(text) TO selena_app;
		GRANT EXECUTE ON FUNCTION "sv_organization_slug_taken"(text) TO selena_app;
	END IF;
END;
$$;
