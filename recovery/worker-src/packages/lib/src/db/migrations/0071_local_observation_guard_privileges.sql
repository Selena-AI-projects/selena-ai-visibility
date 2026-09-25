-- The Local observation trigger validates restricted provenance columns that the
-- runtime role must not be able to select directly. Run only this bounded guard
-- with the migration owner's rights and pin name resolution before doing so.
ALTER FUNCTION sv_local_pilot_observation_guard() SECURITY DEFINER;
ALTER FUNCTION sv_local_pilot_observation_guard() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION sv_local_pilot_observation_guard() FROM PUBLIC;

-- Canary review enforces the same private provenance boundary on insertion.
ALTER FUNCTION sv_local_pilot_canary_review_guard() SECURITY DEFINER;
ALTER FUNCTION sv_local_pilot_canary_review_guard() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION sv_local_pilot_canary_review_guard() FROM PUBLIC;
