-- Every runtime role now carries a tenant context, so row-level security is
-- forced on every table that has it: a connection that owns the tables without
-- being a superuser can no longer read past the policies. Superusers, and the
-- definer functions they own, still bypass RLS by design, which is how the
-- operator connection and the bootstrap functions keep working.
DO $$
DECLARE
	target regclass;
BEGIN
	FOR target IN
		SELECT c.oid::regclass
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relkind IN ('r', 'p')
			AND c.relrowsecurity
			AND NOT c.relforcerowsecurity
	LOOP
		EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target);
	END LOOP;
END;
$$;
