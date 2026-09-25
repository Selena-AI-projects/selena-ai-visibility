-- An accepted canary may need a later execution window. Keep every historical
-- PILOT immutable, but allow its accepted review to back one active replacement
-- after the unmaterialized predecessor is terminalized as STOPPED.
DROP INDEX sv_local_scan_cycles_accepted_canary_review_unique;

CREATE UNIQUE INDEX sv_local_scan_cycles_accepted_canary_review_unique
 ON sv_local_scan_cycles(organization_id,approved_canary_review_id)
 WHERE approved_canary_review_id IS NOT NULL AND status <> 'STOPPED';
