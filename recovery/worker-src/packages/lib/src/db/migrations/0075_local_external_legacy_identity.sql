-- A legacy immutable Maps lock may contain CID only; any recorded Place ID must still agree.
CREATE OR REPLACE FUNCTION sv_local_external_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.actor_id IS DISTINCT FROM current_setting('app.user_id',true)
 OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor_id AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_OPERATOR_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM sv_local_report_versions r
  JOIN sv_local_scan_cycles c ON c.id=r.local_cycle_id AND c.organization_id=r.organization_id
  JOIN sv_configuration_locks l ON l.id=c.configuration_lock_id AND l.organization_id=c.organization_id
  JOIN sv_local_external_audits a ON a.id=NEW.audit_id AND a.organization_id=r.organization_id
  WHERE r.id=NEW.report_version_id AND r.organization_id=NEW.organization_id AND r.status='PUBLISHED'
  AND l.snapshot#>>'{targetIdentity,cid}' = a.content_json#>>'{target,cid}'
  AND (l.snapshot#>>'{targetIdentity,placeId}' IS NULL
   OR l.snapshot#>>'{targetIdentity,placeId}' = a.content_json#>>'{target,placeId}')
  AND (SELECT count(raw.provider_task_id) FROM sv_local_external_raw_evidence raw WHERE raw.audit_id=a.id AND raw.organization_id=a.organization_id)=(a.content_json->>'observationCount')::integer)
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_PUBLISHED_TARGET_REQUIRED'; END IF;
 RETURN NEW;
END; $$;
