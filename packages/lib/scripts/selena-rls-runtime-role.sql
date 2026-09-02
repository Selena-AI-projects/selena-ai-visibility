-- P1-13 step two (owner-run, never part of the migration chain): the runtime
-- role that does not own the tables, so the tenant_isolation policies from
-- migration 0034 actually apply to it. Run by hand, once, with a real
-- password; then point DATABASE_URL at this role ONLY after the application
-- sets app.organization_id in every request transaction — without that GUC
-- every tenant query returns empty, which is the safe direction but is also
-- an outage.
--
--   psql -v role_password='...' -f selena-rls-runtime-role.sql
CREATE ROLE selena_app LOGIN PASSWORD :'role_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO selena_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO selena_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO selena_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO selena_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO selena_app;

-- Raw/provider provenance is intentionally not an application-role surface.
-- Server repositories must use an explicitly granted internal role and project
-- only the safe read model; broad table/view grants above never expose it.
REVOKE ALL ON sv_evidence_provenance FROM selena_app;

-- pg-boss is a service-owned schema, not tenant evidence. The worker runtime
-- must be able to poll and maintain its queues, while ownership stays with the
-- database owner. Keep this in owner provisioning (not the application
-- migration journal) so restored databases receive the same ACL contract.
CREATE SCHEMA IF NOT EXISTS pgboss AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA pgboss TO selena_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pgboss TO selena_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA pgboss
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO selena_app;
