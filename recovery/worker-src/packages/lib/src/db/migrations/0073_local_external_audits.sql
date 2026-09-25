-- External retained responses are not application attempts or settled cost events.
CREATE TABLE sv_local_external_audits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id text NOT NULL REFERENCES organization(id),
 actor_id text NOT NULL,
 content_json jsonb NOT NULL,
 content_canonical text NOT NULL,
 content_sha256 text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,content_sha256),
 UNIQUE(id,organization_id),
 CHECK(content_json = content_canonical::jsonb),
 CHECK(content_sha256 = 'sha256:'||encode(sha256(convert_to(content_canonical,'UTF8')),'hex')),
 CHECK(content_json->>'organizationId' IS NOT DISTINCT FROM organization_id),
 CHECK(content_json->>'provenance' IS NOT DISTINCT FROM 'EXTERNAL_RETAINED_RESPONSE'),
 CHECK(content_json->>'billingReconciliation' IS NOT DISTINCT FROM 'NOT_VERIFIED'),
 CHECK(content_json->>'applicationLedgerImport' IS NOT DISTINCT FROM 'NOT_APPLIED'),
 CHECK(jsonb_typeof(content_json->'batches') IS NOT DISTINCT FROM 'array')
);
CREATE TABLE sv_local_external_tasks (
 provider_task_id text PRIMARY KEY,
 organization_id text NOT NULL,
 audit_id uuid NOT NULL,
 raw_sha256 text NOT NULL CHECK(raw_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 FOREIGN KEY(audit_id,organization_id) REFERENCES sv_local_external_audits(id,organization_id)
);
ALTER TABLE sv_local_external_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sv_local_external_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_external_audits
 USING(organization_id=current_setting('app.organization_id',true))
 WITH CHECK(organization_id=current_setting('app.organization_id',true));
CREATE POLICY tenant_isolation ON sv_local_external_tasks
 USING(organization_id=current_setting('app.organization_id',true))
 WITH CHECK(organization_id=current_setting('app.organization_id',true));

CREATE FUNCTION sv_local_external_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'LOCAL_EXTERNAL_IMMUTABLE'; END; $$;
CREATE TRIGGER sv_local_external_audits_immutable BEFORE UPDATE OR DELETE ON sv_local_external_audits
 FOR EACH ROW EXECUTE FUNCTION sv_local_external_immutable();
CREATE TRIGGER sv_local_external_tasks_immutable BEFORE UPDATE OR DELETE ON sv_local_external_tasks
 FOR EACH ROW EXECUTE FUNCTION sv_local_external_immutable();
CREATE TRIGGER sv_local_external_audits_no_truncate BEFORE TRUNCATE ON sv_local_external_audits
 FOR EACH STATEMENT EXECUTE FUNCTION sv_local_external_immutable();
CREATE TRIGGER sv_local_external_tasks_no_truncate BEFORE TRUNCATE ON sv_local_external_tasks
 FOR EACH STATEMENT EXECUTE FUNCTION sv_local_external_immutable();

CREATE FUNCTION sv_local_external_register_tasks() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE batch jsonb; item jsonb; count_tasks integer := 0;
BEGIN
 IF NEW.actor_id IS DISTINCT FROM current_setting('app.user_id',true)
 OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor_id AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_OPERATOR_REQUIRED'; END IF;
 FOR batch IN SELECT * FROM jsonb_array_elements(NEW.content_json->'batches') LOOP
  FOR item IN SELECT * FROM jsonb_array_elements(batch->'observations') LOOP
   INSERT INTO sv_local_external_tasks(provider_task_id,organization_id,audit_id,raw_sha256)
   VALUES(item->>'providerTaskId',NEW.organization_id,NEW.id,item->>'rawSha256');
   count_tasks := count_tasks+1;
  END LOOP;
 END LOOP;
 IF count_tasks<9 OR count_tasks IS DISTINCT FROM (NEW.content_json->>'observationCount')::integer
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_TASK_COUNT_INVALID'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_external_register_tasks AFTER INSERT ON sv_local_external_audits
 FOR EACH ROW EXECUTE FUNCTION sv_local_external_register_tasks();

CREATE FUNCTION sv_local_external_task_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM sv_local_external_audits a,
  jsonb_array_elements(a.content_json->'batches') b,
  jsonb_array_elements(b->'observations') i
  WHERE a.id=NEW.audit_id AND a.organization_id=NEW.organization_id
  AND i->>'providerTaskId'=NEW.provider_task_id AND i->>'rawSha256'=NEW.raw_sha256)
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_TASK_SOURCE_REQUIRED'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_external_task_guard BEFORE INSERT ON sv_local_external_tasks
 FOR EACH ROW EXECUTE FUNCTION sv_local_external_task_guard();
REVOKE ALL ON FUNCTION sv_local_external_immutable(), sv_local_external_register_tasks(), sv_local_external_task_guard() FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selena_app') THEN
  GRANT SELECT,INSERT ON sv_local_external_audits,sv_local_external_tasks TO selena_app;
 END IF;
END $$;

CREATE TABLE sv_local_external_raw_evidence (
 provider_task_id text PRIMARY KEY REFERENCES sv_local_external_tasks(provider_task_id),
 organization_id text NOT NULL,
 audit_id uuid NOT NULL,
 raw_sha256 text NOT NULL,
 captured_at timestamptz NOT NULL,
 retention_expires_at timestamptz NOT NULL,
 raw_body text,
 raw_deleted_at timestamptz,
 FOREIGN KEY(audit_id,organization_id) REFERENCES sv_local_external_audits(id,organization_id),
 CHECK(retention_expires_at=captured_at+interval '720 hours'),
 CHECK((raw_body IS NOT NULL AND raw_deleted_at IS NULL AND raw_sha256='sha256:'||encode(sha256(convert_to(raw_body,'UTF8')),'hex'))
   OR (raw_body IS NULL AND raw_deleted_at IS NOT NULL))
);
ALTER TABLE sv_local_external_raw_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_external_raw_evidence USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
CREATE FUNCTION sv_local_external_raw_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_METADATA_IMMUTABLE'; END IF;
 IF TG_OP='INSERT' THEN
  IF NOT EXISTS(SELECT 1 FROM sv_local_external_tasks t JOIN sv_local_external_audits a ON a.id=t.audit_id AND a.organization_id=t.organization_id,
   jsonb_array_elements(a.content_json->'batches') b,jsonb_array_elements(b->'observations') o
   WHERE t.provider_task_id=NEW.provider_task_id AND t.organization_id=NEW.organization_id AND t.audit_id=NEW.audit_id AND t.raw_sha256=NEW.raw_sha256
   AND o->>'providerTaskId'=NEW.provider_task_id AND (o->>'capturedAt')::timestamptz=NEW.captured_at)
  THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_SOURCE_REQUIRED'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['raw_body','raw_deleted_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['raw_body','raw_deleted_at'])
   OR OLD.raw_body IS NULL OR NEW.raw_body IS NOT NULL
  THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_METADATA_IMMUTABLE'; END IF;
 END IF;
 IF NEW.raw_body IS NULL AND (NEW.retention_expires_at>now() OR NEW.raw_deleted_at<NEW.retention_expires_at OR NEW.raw_deleted_at>now())
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_RETENTION_REQUIRED'; END IF;
 IF NEW.raw_body IS NOT NULL AND NEW.retention_expires_at<=now() THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_RAW_EXPIRED'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_external_raw_guard BEFORE INSERT OR UPDATE OR DELETE ON sv_local_external_raw_evidence FOR EACH ROW EXECUTE FUNCTION sv_local_external_raw_guard();
CREATE TRIGGER sv_local_external_raw_no_truncate BEFORE TRUNCATE ON sv_local_external_raw_evidence FOR EACH STATEMENT EXECUTE FUNCTION sv_local_external_immutable();
REVOKE ALL ON FUNCTION sv_local_external_raw_guard() FROM PUBLIC;
REVOKE ALL ON sv_local_external_raw_evidence FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selena_app') THEN
  REVOKE SELECT,UPDATE,DELETE,TRUNCATE ON sv_local_external_raw_evidence FROM selena_app;
  GRANT INSERT ON sv_local_external_raw_evidence TO selena_app;
  GRANT SELECT(provider_task_id,organization_id,audit_id,raw_sha256,captured_at,retention_expires_at,raw_deleted_at) ON sv_local_external_raw_evidence TO selena_app;
  GRANT UPDATE(raw_body,raw_deleted_at) ON sv_local_external_raw_evidence TO selena_app;
 END IF;
END $$;

CREATE TABLE sv_local_external_publications (
 organization_id text NOT NULL,
 report_version_id uuid NOT NULL,
 audit_id uuid NOT NULL,
 actor_id text NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,report_version_id,audit_id),
 UNIQUE(audit_id),
 FOREIGN KEY(audit_id,organization_id) REFERENCES sv_local_external_audits(id,organization_id),
 FOREIGN KEY(organization_id,report_version_id) REFERENCES sv_local_report_versions(organization_id,id)
);
ALTER TABLE sv_local_external_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_external_publications
 USING(organization_id=current_setting('app.organization_id',true))
 WITH CHECK(organization_id=current_setting('app.organization_id',true));
CREATE FUNCTION sv_local_external_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
  AND l.snapshot#>>'{targetIdentity,placeId}' = a.content_json#>>'{target,placeId}'
  AND (SELECT count(raw.provider_task_id) FROM sv_local_external_raw_evidence raw WHERE raw.audit_id=a.id AND raw.organization_id=a.organization_id)=(a.content_json->>'observationCount')::integer)
 THEN RAISE EXCEPTION 'LOCAL_EXTERNAL_PUBLISHED_TARGET_REQUIRED'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_external_publication_guard BEFORE INSERT ON sv_local_external_publications
 FOR EACH ROW EXECUTE FUNCTION sv_local_external_publication_guard();
CREATE TRIGGER sv_local_external_publications_immutable BEFORE UPDATE OR DELETE ON sv_local_external_publications
 FOR EACH ROW EXECUTE FUNCTION sv_local_external_immutable();
CREATE TRIGGER sv_local_external_publications_no_truncate BEFORE TRUNCATE ON sv_local_external_publications
 FOR EACH STATEMENT EXECUTE FUNCTION sv_local_external_immutable();
REVOKE ALL ON FUNCTION sv_local_external_publication_guard() FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selena_app') THEN GRANT SELECT,INSERT ON sv_local_external_publications TO selena_app; END IF;
END $$;
