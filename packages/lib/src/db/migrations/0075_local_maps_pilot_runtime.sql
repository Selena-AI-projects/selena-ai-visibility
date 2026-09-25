-- Local Maps pilot runtime. Staging already carries these objects from its own
-- migrations 0067-0071, which never reached this history; the body below is those
-- files verbatim, in order, and runs only where the objects are absent. The check
-- afterwards fails the migration on a partial copy instead of skipping it.
DO $local_pilot$
BEGIN
IF to_regclass('public.sv_local_dispatch_outbox') IS NULL THEN

-- ==== staging 0067_local_maps_pilot_runtime.sql ====
CREATE TEMP TABLE local_0067_saved_views ON COMMIT DROP AS
 SELECT c.relname, pg_get_viewdef(c.oid,true) AS definition, c.relowner,
  row_number() OVER(ORDER BY CASE c.relname WHEN 'sv_visibility_map_points' THEN 0 ELSE 1 END) AS ordinal
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('sv_visibility_map_points','sv_visibility_map_datasets');
CREATE TEMP TABLE local_0067_saved_grants ON COMMIT DROP AS
 SELECT c.relname, a.grantee, a.privilege_type, a.is_grantable
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a
 WHERE n.nspname='public' AND c.relname IN ('sv_visibility_map_points','sv_visibility_map_datasets');
DROP VIEW sv_visibility_map_datasets;
DROP VIEW sv_visibility_map_points;
-- Local-only pilot foundation. Existing cycles cannot become executable.
ALTER TABLE sv_local_scan_cycles ALTER COLUMN status DROP DEFAULT;
ALTER TABLE sv_local_scan_cycles ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE sv_local_scan_cycles ALTER COLUMN status SET DEFAULT 'CREATED';
DO $views$
DECLARE v record; g record;
BEGIN
 FOR v IN SELECT * FROM local_0067_saved_views ORDER BY ordinal LOOP
  EXECUTE format('CREATE VIEW public.%I WITH (security_invoker=true) AS %s',v.relname,v.definition);
  EXECUTE format('ALTER VIEW public.%I OWNER TO %I',v.relname,pg_get_userbyid(v.relowner));
 END LOOP;
 FOR g IN SELECT * FROM local_0067_saved_grants LOOP
  EXECUTE format('GRANT %s ON public.%I TO %s%s',g.privilege_type,g.relname,CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(g.grantee)) END,CASE WHEN g.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
 END LOOP;
END; $views$;

ALTER TABLE sv_local_scan_cycles ADD CONSTRAINT sv_local_scan_cycles_status_check CHECK (status IN ('CREATED', 'PREFLIGHT_BLOCKED', 'BUDGET_BLOCKED', 'APPROVED', 'CANARY_RUNNING', 'CANARY_REVIEW', 'QUEUED', 'RUNNING', 'PARTIAL_FAILURE', 'PROVIDER_BLOCKED', 'UNKNOWN_RECONCILIATION', 'STOPPED', 'CARDINALITY_INCIDENT', 'QC_REQUIRED', 'READY', 'COMPLETED', 'FAILED'));
ALTER TABLE sv_local_scan_cycles
 ADD COLUMN execution_mode text NOT NULL DEFAULT 'LEGACY_SOURCE_ONLY',
 ADD COLUMN approved_canary_review_id uuid,
 ADD COLUMN provider_contract_digest text,
 ADD CONSTRAINT sv_local_scan_cycles_execution_mode_check CHECK (execution_mode IN ('LEGACY_SOURCE_ONLY','CANARY','PILOT')),
 ADD CONSTRAINT sv_local_scan_cycles_provider_digest_check CHECK (execution_mode = 'LEGACY_SOURCE_ONLY' OR (provider_contract_digest ~ '^sha256:[a-f0-9]{64}$') IS TRUE);
CREATE UNIQUE INDEX sv_local_scan_cycles_pilot_org_id_unique ON sv_local_scan_cycles(organization_id,id);
CREATE UNIQUE INDEX sv_local_scan_cycles_accepted_canary_review_unique ON sv_local_scan_cycles(organization_id,approved_canary_review_id) WHERE approved_canary_review_id IS NOT NULL;
CREATE UNIQUE INDEX sv_local_rank_observations_pilot_org_id_unique ON sv_local_rank_observations(organization_id,id);
CREATE UNIQUE INDEX sv_measurement_attempts_pilot_org_id_unique ON sv_measurement_attempts(organization_id,id);
CREATE UNIQUE INDEX sv_grid_definitions_pilot_org_id_unique ON sv_grid_definitions(organization_id,id);
CREATE UNIQUE INDEX sv_grid_points_pilot_org_id_unique ON sv_grid_points(organization_id,id);
CREATE UNIQUE INDEX sv_local_keywords_pilot_org_id_unique ON sv_local_keywords(organization_id,id);
CREATE UNIQUE INDEX sv_local_reports_cycle_org_identity ON sv_local_scan_cycles(organization_id,id,measurement_cycle_id);
ALTER TABLE sv_measurement_attempts ADD COLUMN local_observation_id uuid;
ALTER TABLE sv_measurement_attempts ADD CONSTRAINT sv_attempt_local_observation_org_fk
 FOREIGN KEY (organization_id,local_observation_id) REFERENCES sv_local_rank_observations(organization_id,id);
ALTER TABLE sv_local_rank_observations ADD COLUMN outcome text;
UPDATE sv_local_rank_observations SET outcome = CASE
 WHEN validity = 'VALID' AND target_rank IS NOT NULL THEN 'FOUND'
 WHEN validity = 'VALID' THEN 'ABSENT_WITHIN_DEPTH'
 WHEN validity = 'INVALID' THEN 'INVALID' ELSE 'UNKNOWN' END;
ALTER TABLE sv_local_rank_observations ALTER COLUMN outcome SET DEFAULT 'PENDING', ALTER COLUMN outcome SET NOT NULL,
 ALTER COLUMN validity DROP NOT NULL, ALTER COLUMN captured_at DROP NOT NULL,
 ADD COLUMN evidence_envelope jsonb, ADD COLUMN evidence_canonical text, ADD COLUMN evidence_sha256 text,
 ADD COLUMN evidence_id uuid;
ALTER TABLE sv_local_rank_observations ADD CONSTRAINT sv_local_observation_evidence_org_fk
 FOREIGN KEY(evidence_id,organization_id) REFERENCES sv_evidence_index(id,organization_id);
ALTER TABLE sv_local_rank_observations DROP CONSTRAINT sv_local_rank_observations_invalid_reason_check;
ALTER TABLE sv_local_rank_observations ADD CONSTRAINT sv_local_observation_outcome_check
 CHECK (outcome IN ('PENDING','FOUND','ABSENT_WITHIN_DEPTH','INVALID','UNKNOWN','BLOCKED','CANCELLED'));
-- Legacy evidence is preserved but never made publishable by a migration.
ALTER TABLE sv_local_rank_observations ADD CONSTRAINT sv_local_observation_state_check CHECK ((
 (outcome='PENDING' AND validity IS NULL AND target_rank IS NULL AND captured_at IS NULL AND invalid_reason IS NULL AND evidence_id IS NULL AND evidence_envelope IS NULL AND raw_reference IS NULL)
 OR (outcome='FOUND' AND validity='VALID' AND target_rank BETWEEN 1 AND 20 AND captured_at IS NOT NULL AND invalid_reason IS NULL AND evidence_id IS NOT NULL)
 OR (outcome='ABSENT_WITHIN_DEPTH' AND validity='VALID' AND target_rank IS NULL AND captured_at IS NOT NULL AND invalid_reason IS NULL AND evidence_id IS NOT NULL)
 OR (outcome='INVALID' AND validity='INVALID' AND target_rank IS NULL AND captured_at IS NOT NULL AND length(btrim(invalid_reason))>0)
 OR (outcome='UNKNOWN' AND validity='UNMEASURED' AND target_rank IS NULL AND captured_at IS NOT NULL AND length(btrim(invalid_reason))>0)
 OR (outcome='BLOCKED' AND validity='UNMEASURED' AND target_rank IS NULL AND captured_at IS NULL AND length(btrim(invalid_reason))>0 AND evidence_id IS NULL AND evidence_envelope IS NULL AND raw_reference IS NULL)
 OR (outcome='CANCELLED' AND validity='UNMEASURED' AND target_rank IS NULL AND captured_at IS NULL AND invalid_reason='LOCAL_STOPPED' AND evidence_id IS NULL AND evidence_envelope IS NULL AND raw_reference IS NULL)
) IS TRUE) NOT VALID;
ALTER TABLE sv_local_rank_observations ADD CONSTRAINT sv_local_observation_envelope_check CHECK ((
 (evidence_envelope IS NULL AND evidence_canonical IS NULL AND evidence_sha256 IS NULL)
 OR (evidence_envelope IS NOT NULL AND evidence_canonical IS NOT NULL AND evidence_sha256 IS NOT NULL
 AND evidence_envelope=evidence_canonical::jsonb
 AND evidence_sha256='sha256:'||encode(sha256(convert_to(evidence_canonical,'UTF8')),'hex'))
) IS TRUE);
CREATE TABLE sv_local_dispatch_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id text NOT NULL REFERENCES organization(id),
 local_cycle_id uuid NOT NULL, measurement_cycle_id uuid NOT NULL, observation_id uuid NOT NULL, attempt_id uuid NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CLAIMED','ENQUEUED','CANCELLED')),
 claim_token uuid, lease_expires_at timestamptz, enqueued_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,local_cycle_id,measurement_cycle_id) REFERENCES sv_local_scan_cycles(organization_id,id,measurement_cycle_id),
 FOREIGN KEY(organization_id,observation_id) REFERENCES sv_local_rank_observations(organization_id,id),
 FOREIGN KEY(organization_id,attempt_id) REFERENCES sv_measurement_attempts(organization_id,id),
 CHECK ((status='CLAIMED' AND claim_token IS NOT NULL AND lease_expires_at IS NOT NULL AND enqueued_at IS NULL)
 OR (status='PENDING' AND claim_token IS NULL AND lease_expires_at IS NULL AND enqueued_at IS NULL)
 OR (status='ENQUEUED' AND claim_token IS NULL AND lease_expires_at IS NULL AND enqueued_at IS NOT NULL)
 OR (status='CANCELLED' AND claim_token IS NULL AND lease_expires_at IS NULL))
);
CREATE INDEX sv_local_dispatch_pending_idx ON sv_local_dispatch_outbox(organization_id,status,created_at);
CREATE TABLE sv_local_report_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id text NOT NULL REFERENCES organization(id), local_cycle_id uuid NOT NULL,
 version integer NOT NULL CHECK(version>0), content_json jsonb NOT NULL, content_canonical text NOT NULL, content_sha256 text NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','REVOKED')), actor text NOT NULL CHECK(length(btrim(actor))>0),
 created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, revoked_at timestamptz,
 UNIQUE(organization_id,local_cycle_id,version), UNIQUE(organization_id,local_cycle_id,id), UNIQUE(organization_id,id),
 FOREIGN KEY(organization_id,local_cycle_id) REFERENCES sv_local_scan_cycles(organization_id,id),
 CHECK(content_json=content_canonical::jsonb AND content_sha256='sha256:'||encode(sha256(convert_to(content_canonical,'UTF8')),'hex')),
 CHECK((status='DRAFT' AND published_at IS NULL AND revoked_at IS NULL) OR (status='PUBLISHED' AND published_at IS NOT NULL AND revoked_at IS NULL)
 OR (status='REVOKED' AND published_at IS NOT NULL AND revoked_at IS NOT NULL AND revoked_at>=published_at))
);
CREATE UNIQUE INDEX sv_local_report_one_published ON sv_local_report_versions(organization_id,local_cycle_id) WHERE status='PUBLISHED';
CREATE TABLE sv_local_qc_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id text NOT NULL REFERENCES organization(id), local_cycle_id uuid NOT NULL, report_version_id uuid NOT NULL,
 decision text NOT NULL CHECK(decision IN ('ACCEPT_PARTIAL','APPROVED','REJECTED')), actor text NOT NULL CHECK(length(btrim(actor))>0), note text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,local_cycle_id,report_version_id) REFERENCES sv_local_report_versions(organization_id,local_cycle_id,id)
);
CREATE TABLE sv_local_report_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id text NOT NULL REFERENCES organization(id), report_version_id uuid NOT NULL,
 recipient_identity text NOT NULL CHECK(length(btrim(recipient_identity))>0), channel text NOT NULL CHECK(channel='MANUAL_SECURE_LINK'),
 sent_at timestamptz NOT NULL DEFAULT now(), acknowledged_at timestamptz, actor text NOT NULL CHECK(length(btrim(actor))>0),
 status text NOT NULL CHECK(status IN ('SENT','ACKNOWLEDGED','FAILED')),
 FOREIGN KEY(organization_id,report_version_id) REFERENCES sv_local_report_versions(organization_id,id),
 CHECK((status='ACKNOWLEDGED' AND acknowledged_at IS NOT NULL AND acknowledged_at>=sent_at) OR (status IN ('SENT','FAILED') AND acknowledged_at IS NULL))
);
CREATE TABLE sv_local_canary_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id text NOT NULL REFERENCES organization(id), local_cycle_id uuid NOT NULL, attempt_id uuid NOT NULL,
 evidence_id uuid NOT NULL, actual_cost_usd numeric(12,6) NOT NULL CHECK(actual_cost_usd>=0), provider_contract_digest text NOT NULL CHECK(provider_contract_digest ~ '^sha256:[a-f0-9]{64}$'),
 status text NOT NULL CHECK(status IN ('PENDING','ACCEPTED','REJECTED')), actor text NOT NULL CHECK(length(btrim(actor))>0), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id),
 FOREIGN KEY(organization_id,local_cycle_id) REFERENCES sv_local_scan_cycles(organization_id,id),
 FOREIGN KEY(organization_id,attempt_id) REFERENCES sv_measurement_attempts(organization_id,id),
 FOREIGN KEY(evidence_id,organization_id) REFERENCES sv_source_snapshots(id,organization_id)
);
CREATE TABLE sv_local_raw_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id text NOT NULL REFERENCES organization(id),
 source_snapshot_id uuid NOT NULL, raw_response_body text, raw_response_sha256 text NOT NULL,
 provider_task_id text, retention_expires_at timestamptz NOT NULL, raw_deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,source_snapshot_id),
 FOREIGN KEY(source_snapshot_id,organization_id) REFERENCES sv_source_snapshots(id,organization_id),
 CHECK ((raw_deleted_at IS NULL AND raw_response_body IS NOT NULL) OR (raw_deleted_at IS NOT NULL AND raw_response_body IS NULL))
);
CREATE UNIQUE INDEX sv_local_canary_reviews_accepted_attempt_unique
 ON sv_local_canary_reviews(organization_id,local_cycle_id,attempt_id) WHERE status='ACCEPTED';
ALTER TABLE sv_local_scan_cycles ADD CONSTRAINT sv_local_cycle_canary_org_fk
 FOREIGN KEY(organization_id,approved_canary_review_id) REFERENCES sv_local_canary_reviews(organization_id,id);
ALTER TABLE sv_local_dispatch_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_dispatch_outbox USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
ALTER TABLE sv_local_report_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_report_versions USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
ALTER TABLE sv_local_qc_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_qc_decisions USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
ALTER TABLE sv_local_report_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_report_deliveries USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
ALTER TABLE sv_local_canary_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_canary_reviews USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
ALTER TABLE sv_local_raw_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_raw_evidence USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
CREATE FUNCTION sv_local_pilot_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'LOCAL_PILOT_APPEND_ONLY'; END; $$;
CREATE TRIGGER sv_local_qc_decisions_immutable BEFORE UPDATE OR DELETE ON sv_local_qc_decisions FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_append_only();
CREATE TRIGGER sv_local_canary_reviews_immutable BEFORE UPDATE OR DELETE ON sv_local_canary_reviews FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_append_only();
CREATE TRIGGER sv_local_dispatch_outbox_no_truncate BEFORE TRUNCATE ON sv_local_dispatch_outbox FOR EACH STATEMENT EXECUTE FUNCTION sv_local_pilot_append_only();
CREATE TRIGGER sv_local_report_versions_no_truncate BEFORE TRUNCATE ON sv_local_report_versions FOR EACH STATEMENT EXECUTE FUNCTION sv_local_pilot_append_only();
CREATE TRIGGER sv_local_qc_decisions_no_truncate BEFORE TRUNCATE ON sv_local_qc_decisions FOR EACH STATEMENT EXECUTE FUNCTION sv_local_pilot_append_only();
CREATE TRIGGER sv_local_report_deliveries_no_truncate BEFORE TRUNCATE ON sv_local_report_deliveries FOR EACH STATEMENT EXECUTE FUNCTION sv_local_pilot_append_only();
CREATE TRIGGER sv_local_canary_reviews_no_truncate BEFORE TRUNCATE ON sv_local_canary_reviews FOR EACH STATEMENT EXECUTE FUNCTION sv_local_pilot_append_only();

CREATE FUNCTION sv_local_pilot_cycle_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE locked jsonb; review sv_local_canary_reviews%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (OLD.organization_id,OLD.measurement_cycle_id,OLD.configuration_lock_id,OLD.location_id,OLD.grid_definition_id,OLD.execution_mode,OLD.approved_canary_review_id,OLD.provider_contract_digest)
   IS DISTINCT FROM (NEW.organization_id,NEW.measurement_cycle_id,NEW.configuration_lock_id,NEW.location_id,NEW.grid_definition_id,NEW.execution_mode,NEW.approved_canary_review_id,NEW.provider_contract_digest)
   THEN RAISE EXCEPTION 'LOCAL_PILOT_IDENTITY_IMMUTABLE'; END IF;
  IF OLD.execution_mode='LEGACY_SOURCE_ONLY' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'LOCAL_LEGACY_EXECUTION_FORBIDDEN'; END IF;
 END IF;
 IF NEW.execution_mode='LEGACY_SOURCE_ONLY' THEN RAISE EXCEPTION 'LOCAL_LEGACY_EXECUTION_FORBIDDEN'; END IF;
 SELECT snapshot INTO locked FROM sv_configuration_locks WHERE id=NEW.configuration_lock_id AND organization_id=NEW.organization_id;
 IF locked IS NULL OR locked->>'domainId' IS DISTINCT FROM 'LOCAL_MAPS'
  OR locked->>'locationId' IS DISTINCT FROM NEW.location_id::text
  OR locked#>>'{grid,locationId}' IS DISTINCT FROM NEW.location_id::text
  OR locked#>>'{provider,id}' IS DISTINCT FROM NEW.provider
  OR locked#>>'{request,device}' IS DISTINCT FROM 'MOBILE' OR locked#>>'{request,os}' IS DISTINCT FROM 'android'
  OR locked#>>'{request,depth}' IS DISTINCT FROM '20' OR locked#>>'{request,zoom}' IS DISTINCT FROM '13'
  OR locked#>>'{request,searchThisArea}' IS DISTINCT FROM 'true'
  OR locked#>>'{grid,size}' IS DISTINCT FROM '3' OR locked#>>'{grid,radiusMeters}' IS DISTINCT FROM '3000'
  OR jsonb_array_length(locked#>'{keywordSet,keywords}') IS DISTINCT FROM 1
  OR jsonb_array_length(locked#>'{keywordSet,keywordIds}') IS DISTINCT FROM 1
  OR locked#>>'{keywordSet,keywords,0,id}' IS DISTINCT FROM locked#>>'{keywordSet,keywordIds,0}'
  OR locked#>>'{keywordSet,keywords,0,language}' IS DISTINCT FROM locked#>>'{request,language}'
  OR coalesce(length(btrim(locked#>>'{keywordSet,keywords,0,text}')),0)=0
  OR NEW.expected_observations<>9 OR NEW.repeats<>1 OR NEW.capture_depth<>20
  THEN RAISE EXCEPTION 'LOCAL_PILOT_LOCK_INVALID'; END IF;
 IF TG_OP='INSERT' AND NEW.status<>'CREATED' THEN RAISE EXCEPTION 'LOCAL_PILOT_INITIAL_STATUS_INVALID'; END IF;
 IF NEW.execution_mode='CANARY' AND NEW.approved_canary_review_id IS NOT NULL THEN RAISE EXCEPTION 'LOCAL_CANARY_REVIEW_LINK_INVALID'; END IF;
 IF NEW.execution_mode='PILOT' THEN
  SELECT * INTO review FROM sv_local_canary_reviews WHERE id=NEW.approved_canary_review_id AND organization_id=NEW.organization_id;
  IF NOT FOUND OR review.status<>'ACCEPTED' OR review.provider_contract_digest<>NEW.provider_contract_digest
   THEN RAISE EXCEPTION 'LOCAL_ACCEPTED_CANARY_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE CONSTRAINT TRIGGER sv_local_pilot_cycle_identity AFTER INSERT OR UPDATE ON sv_local_scan_cycles
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_cycle_guard();

-- New locks contain the matrix and immutable keyword contents, not mutable keyword counts.
CREATE OR REPLACE FUNCTION sv_validate_local_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE locked jsonb; n integer;
BEGIN
 SELECT snapshot INTO locked FROM sv_configuration_locks WHERE id=NEW.configuration_lock_id AND organization_id=NEW.organization_id;
 IF locked IS NULL OR locked<>NEW.cost_snapshot OR (locked#>>'{budget,worstCaseCostUsd}')::numeric IS DISTINCT FROM NEW.worst_case_cost_usd
  THEN RAISE EXCEPTION 'LOCAL_CYCLE_COST_NOT_FROZEN'; END IF;
 SELECT count(*) INTO n FROM sv_grid_points p JOIN sv_grid_definitions g ON g.id=p.grid_id AND g.organization_id=p.organization_id
 WHERE g.id=NEW.grid_definition_id AND g.organization_id=NEW.organization_id AND g.location_id=NEW.location_id;
 IF n<>9 OR NEW.expected_observations<>9 THEN RAISE EXCEPTION 'LOCAL_CYCLE_CARDINALITY_MISMATCH'; END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION sv_guard_local_observation_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c sv_local_scan_cycles%ROWTYPE;
BEGIN
 SELECT * INTO c FROM sv_local_scan_cycles WHERE id=NEW.cycle_id AND organization_id=NEW.organization_id FOR UPDATE;
 IF NOT FOUND OR c.execution_mode='LEGACY_SOURCE_ONLY' OR c.status<>'APPROVED' OR c.emergency_stopped_at IS NOT NULL
  THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_CYCLE_BLOCKED'; END IF;
 IF NEW.outcome<>'PENDING' OR NEW.provider<>c.provider OR NEW.capture_depth<>c.capture_depth
  OR NEW.repeat_index<>0 OR NEW.grid_definition_id<>c.grid_definition_id OR NEW.location_id<>c.location_id
  OR NOT EXISTS(SELECT 1 FROM sv_local_keywords WHERE id=NEW.keyword_id AND organization_id=NEW.organization_id AND location_id=c.location_id)
  OR NOT EXISTS(SELECT 1 FROM sv_grid_points WHERE id=NEW.grid_point_id AND organization_id=NEW.organization_id AND grid_id=c.grid_definition_id)
  OR NOT EXISTS(SELECT 1 FROM sv_configuration_locks l WHERE l.id=c.configuration_lock_id AND l.organization_id=c.organization_id AND l.snapshot#>>'{keywordSet,keywordIds,0}'=NEW.keyword_id::text)
  THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_OUTSIDE_CYCLE'; END IF;
 IF (SELECT count(*) FROM sv_local_rank_observations WHERE cycle_id=c.id AND organization_id=c.organization_id)>=9
  THEN RAISE EXCEPTION 'LOCAL_CARDINALITY_INCIDENT'; END IF;
 RETURN NEW;
END; $$;

CREATE FUNCTION sv_local_pilot_observation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.outcome<>'PENDING' THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_TERMINAL_IMMUTABLE'; END IF;
 IF (to_jsonb(NEW)-ARRAY['outcome','validity','target_rank','captured_at','invalid_reason','raw_reference','evidence_envelope','evidence_canonical','evidence_sha256','evidence_id','attempt_count','updated_at'])
  IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['outcome','validity','target_rank','captured_at','invalid_reason','raw_reference','evidence_envelope','evidence_canonical','evidence_sha256','evidence_id','attempt_count','updated_at'])
  THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_IDENTITY_IMMUTABLE'; END IF;
 IF NEW.outcome IN ('FOUND','ABSENT_WITHIN_DEPTH') AND NOT EXISTS (
  SELECT 1 FROM sv_evidence_acceptance_receipts e WHERE e.organization_id=NEW.organization_id AND e.evidence_id=NEW.evidence_id
 ) THEN RAISE EXCEPTION 'LOCAL_ACCEPTED_EVIDENCE_REQUIRED'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_pilot_observation_guard BEFORE UPDATE OR DELETE ON sv_local_rank_observations FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_observation_guard();

CREATE FUNCTION sv_local_pilot_outbox_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a sv_measurement_attempts%ROWTYPE; c sv_local_scan_cycles%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LOCAL_OUTBOX_DELETE_BLOCKED'; END IF;
 SELECT * INTO a FROM sv_measurement_attempts WHERE id=NEW.attempt_id AND organization_id=NEW.organization_id;
 SELECT * INTO c FROM sv_local_scan_cycles WHERE id=NEW.local_cycle_id AND organization_id=NEW.organization_id;
 IF a.id IS NULL OR c.id IS NULL OR c.execution_mode='LEGACY_SOURCE_ONLY'
  OR a.local_observation_id IS DISTINCT FROM NEW.observation_id OR a.measurement_cycle_id<>NEW.measurement_cycle_id
  OR c.measurement_cycle_id<>NEW.measurement_cycle_id
  THEN RAISE EXCEPTION 'LOCAL_OUTBOX_ATTEMPT_MISMATCH'; END IF;
 IF TG_OP='INSERT' AND (NEW.status<>'PENDING' OR a.status<>'CLAIMED') THEN RAISE EXCEPTION 'LOCAL_OUTBOX_INITIAL_STATE_INVALID'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (OLD.id,OLD.organization_id,OLD.local_cycle_id,OLD.measurement_cycle_id,OLD.observation_id,OLD.attempt_id,OLD.created_at)
   IS DISTINCT FROM (NEW.id,NEW.organization_id,NEW.local_cycle_id,NEW.measurement_cycle_id,NEW.observation_id,NEW.attempt_id,NEW.created_at)
   THEN RAISE EXCEPTION 'LOCAL_OUTBOX_IDENTITY_IMMUTABLE'; END IF;
  IF NOT ((OLD.status='PENDING' AND NEW.status IN ('CLAIMED','CANCELLED'))
   OR (OLD.status='CLAIMED' AND NEW.status IN ('ENQUEUED','CANCELLED'))
   OR (OLD.status='CLAIMED' AND NEW.status='PENDING' AND OLD.lease_expires_at<=now())
   OR (OLD.status='ENQUEUED' AND NEW.status='CANCELLED' AND a.status='CANCELLED_NO_CALL'))
   THEN RAISE EXCEPTION 'LOCAL_OUTBOX_TRANSITION_BLOCKED'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_pilot_outbox_guard BEFORE INSERT OR UPDATE OR DELETE ON sv_local_dispatch_outbox FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_outbox_guard();

CREATE FUNCTION sv_local_pilot_report_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c sv_local_scan_cycles%ROWTYPE; latest_decision text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LOCAL_REPORT_IMMUTABLE'; END IF;
 SELECT * INTO c FROM sv_local_scan_cycles WHERE id=NEW.local_cycle_id AND organization_id=NEW.organization_id FOR UPDATE;
 IF NOT FOUND OR c.execution_mode<>'PILOT' THEN RAISE EXCEPTION 'LOCAL_REPORT_PILOT_REQUIRED'; END IF;
 IF TG_OP='INSERT' AND (NEW.status<>'DRAFT' OR c.status NOT IN ('PARTIAL_FAILURE','QC_REQUIRED')) THEN RAISE EXCEPTION 'LOCAL_REPORT_NOT_READY'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(OLD)-ARRAY['status','published_at','revoked_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','published_at','revoked_at'])
   THEN RAISE EXCEPTION 'LOCAL_REPORT_CONTENT_IMMUTABLE'; END IF;
  IF OLD.status='DRAFT' AND NEW.status='PUBLISHED' THEN
   SELECT decision INTO latest_decision FROM sv_local_qc_decisions WHERE organization_id=NEW.organization_id AND report_version_id=NEW.id ORDER BY created_at DESC,id DESC LIMIT 1;
   IF latest_decision IS DISTINCT FROM 'APPROVED' OR c.status<>'QC_REQUIRED'
    THEN RAISE EXCEPTION 'LOCAL_REPORT_QC_REQUIRED'; END IF;
  ELSIF NOT(OLD.status='PUBLISHED' AND NEW.status='REVOKED') THEN RAISE EXCEPTION 'LOCAL_REPORT_TRANSITION_BLOCKED'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_pilot_report_guard BEFORE INSERT OR UPDATE OR DELETE ON sv_local_report_versions FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_report_guard();

CREATE FUNCTION sv_local_pilot_canary_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c sv_local_scan_cycles%ROWTYPE; a sv_measurement_attempts%ROWTYPE;
BEGIN
 SELECT * INTO c FROM sv_local_scan_cycles WHERE id=NEW.local_cycle_id AND organization_id=NEW.organization_id FOR UPDATE;
 SELECT * INTO a FROM sv_measurement_attempts WHERE id=NEW.attempt_id AND organization_id=NEW.organization_id;
 IF c.id IS NULL OR a.id IS NULL OR c.execution_mode<>'CANARY' OR c.status<>'CANARY_REVIEW'
  OR c.provider_contract_digest<>NEW.provider_contract_digest OR c.measurement_cycle_id<>a.measurement_cycle_id
  OR a.status<>'SUCCEEDED' OR a.spent_cost_usd<>NEW.actual_cost_usd
  OR NOT EXISTS(SELECT 1 FROM sv_grid_points p WHERE p.id=a.point_id AND p.grid_id=c.grid_definition_id AND p.organization_id=c.organization_id AND p.point_index=4)
  OR NOT EXISTS(SELECT 1 FROM sv_source_snapshots s WHERE s.id=NEW.evidence_id AND s.organization_id=c.organization_id AND s.source_type='LOCAL_MAPS_CANARY_ONLY' AND s.source_ref=a.raw_ref AND s.content_sha256 IS NOT NULL)
  THEN RAISE EXCEPTION 'LOCAL_CANARY_REVIEW_EVIDENCE_INVALID'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_pilot_canary_review_guard BEFORE INSERT ON sv_local_canary_reviews FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_canary_review_guard();

CREATE FUNCTION sv_local_pilot_delivery_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LOCAL_DELIVERY_IMMUTABLE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM sv_local_report_versions WHERE id=NEW.report_version_id AND organization_id=NEW.organization_id AND status='PUBLISHED')
  THEN RAISE EXCEPTION 'LOCAL_DELIVERY_PUBLISHED_REPORT_REQUIRED'; END IF;
 IF TG_OP='INSERT' AND NEW.status<>'SENT' THEN RAISE EXCEPTION 'LOCAL_DELIVERY_INITIAL_STATE_INVALID'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.status<>'SENT' OR NEW.status NOT IN ('ACKNOWLEDGED','FAILED')
   OR (to_jsonb(OLD)-ARRAY['status','acknowledged_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','acknowledged_at'])
   THEN RAISE EXCEPTION 'LOCAL_DELIVERY_TRANSITION_BLOCKED'; END IF;
  IF NEW.status='ACKNOWLEDGED' AND NEW.recipient_identity IS DISTINCT FROM nullif(current_setting('app.user_id',true),'')
   THEN RAISE EXCEPTION 'LOCAL_DELIVERY_RECIPIENT_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_pilot_delivery_guard BEFORE INSERT OR UPDATE OR DELETE ON sv_local_report_deliveries FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_delivery_guard();

-- Existing callers retain their interfaces; Local calls must match the RLS tenant.
DO $migration$
DECLARE function_name text; definition text;
BEGIN
 FOREACH function_name IN ARRAY ARRAY['sv_reserve_provider_spend(text,text,text,numeric)','sv_settle_provider_spend(text,text,text,numeric)','sv_release_provider_spend(text,text,text)'] LOOP
  SELECT pg_get_functiondef(function_name::regprocedure) INTO definition;
  definition:=replace(definition,E'BEGIN\n',E'BEGIN\n IF p_scope = ''local-maps'' AND p_organization_id IS DISTINCT FROM nullif(current_setting(''app.organization_id'',true),'''') THEN RAISE EXCEPTION ''LOCAL_SPEND_TENANT_MISMATCH''; END IF;\n');
  EXECUTE definition;
 END LOOP;
END; $migration$;
DO $grants$
DECLARE t text;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selena_app') THEN
  FOREACH t IN ARRAY ARRAY['sv_local_dispatch_outbox','sv_local_report_versions','sv_local_qc_decisions','sv_local_report_deliveries','sv_local_canary_reviews','sv_local_raw_evidence'] LOOP
   EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE %I TO selena_app',t);
  END LOOP;
 END IF;
END; $grants$;

-- Preserve the exact existing checks for other states while adding a no-call terminal state.
DO $cancel$
DECLARE n text; expression text; definition text;
BEGIN
 FOREACH n IN ARRAY ARRAY['sv_measurement_attempts_status_check','sv_measurement_attempts_state_shape_check','sv_measurement_attempts_submission_token_check','sv_measurement_attempts_submitted_candidate_check','sv_measurement_attempts_budget_check'] LOOP
  SELECT pg_get_expr(conbin,conrelid) INTO expression FROM pg_constraint WHERE conrelid='sv_measurement_attempts'::regclass AND conname=n;
  IF expression IS NULL THEN RAISE EXCEPTION 'LOCAL_0067_ATTEMPT_CHECK_MISSING:%',n; END IF;
  EXECUTE format('ALTER TABLE sv_measurement_attempts DROP CONSTRAINT %I',n);
  EXECUTE format($check$ALTER TABLE sv_measurement_attempts ADD CONSTRAINT %I CHECK (((%s) OR (
   status='CANCELLED_NO_CALL' AND domain_id='LOCAL_MAPS' AND budget_state='RELEASED'
   AND spent_cost_usd=0 AND released_cost_usd=reserved_cost_usd
   AND submitted_at IS NULL AND submission_token_hash IS NULL AND submitted_candidate IS NULL
   AND submitted_candidate_fingerprint IS NULL AND submitted_candidate_canonical IS NULL
   AND provider_task_id IS NULL AND raw_ref IS NULL AND cost_event_id IS NULL AND completed_at IS NOT NULL
   AND retry_reason IS NULL AND final_invalid_reason IS NULL AND unknown_reason IS NULL
  )) IS TRUE)$check$,n,expression);
 END LOOP;
 SELECT pg_get_functiondef('sv_guard_measurement_attempt_mutation()'::regprocedure) INTO definition;
 IF position(E'BEGIN\n' IN definition)=0 THEN RAISE EXCEPTION 'LOCAL_0067_ATTEMPT_GUARD_UNEXPECTED'; END IF;
 definition:=replace(definition,E'BEGIN\n',$body$BEGIN
 IF TG_OP='UPDATE' AND NEW.status='CANCELLED_NO_CALL' THEN
  IF OLD.status<>'CLAIMED' OR OLD.submitted_at IS NOT NULL
   OR (to_jsonb(OLD)-ARRAY['status','budget_state','released_cost_usd','completed_at','row_version','updated_at'])
   IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','budget_state','released_cost_usd','completed_at','row_version','updated_at'])
   THEN RAISE EXCEPTION 'LOCAL_CANCEL_NO_CALL_INVALID'; END IF;
  NEW.row_version:=OLD.row_version+1; NEW.updated_at:=now(); RETURN NEW;
 END IF;
$body$);
 EXECUTE definition;
END; $cancel$;

CREATE FUNCTION sv_local_pilot_attempt_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c sv_local_scan_cycles%ROWTYPE; o sv_local_rank_observations%ROWTYPE; r sv_provider_spend_reservations%ROWTYPE; locked jsonb;
BEGIN
 IF NEW.domain_id<>'LOCAL_MAPS' THEN RETURN NEW; END IF;
 IF NEW.organization_id IS DISTINCT FROM nullif(current_setting('app.organization_id',true),'') THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_TENANT_REQUIRED'; END IF;
 SELECT * INTO c FROM sv_local_scan_cycles WHERE measurement_cycle_id=NEW.measurement_cycle_id AND organization_id=NEW.organization_id FOR UPDATE;
 SELECT * INTO o FROM sv_local_rank_observations WHERE id=NEW.local_observation_id AND organization_id=NEW.organization_id;
 SELECT * INTO r FROM sv_provider_spend_reservations WHERE id=NEW.reservation_id AND organization_id=NEW.organization_id AND scope='local-maps' AND request_key=NEW.execution_key;
 IF c.id IS NULL OR c.execution_mode='LEGACY_SOURCE_ONLY' OR o.id IS NULL OR o.cycle_id<>c.id
  OR o.grid_point_id<>NEW.point_id OR o.keyword_id<>NEW.item_id OR o.provider<>NEW.executor_id OR o.repeat_index<>NEW.repeat_index
  OR NEW.observation_ref<>o.id::text OR r.id IS NULL OR r.estimated_usd<>NEW.reserved_cost_usd
  THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_SCOPE_OR_RESERVATION_MISMATCH'; END IF;
 IF TG_OP='UPDATE' AND OLD.local_observation_id IS DISTINCT FROM NEW.local_observation_id THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_OBSERVATION_IMMUTABLE'; END IF;
 IF TG_OP='INSERT' AND (o.outcome<>'PENDING' OR c.emergency_stopped_at IS NOT NULL OR c.status NOT IN ('APPROVED','QUEUED','RUNNING','CANARY_RUNNING')) THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_EXECUTION_BLOCKED'; END IF;
 IF c.execution_mode='CANARY' AND (NEW.attempt_index<>1 OR NOT EXISTS(SELECT 1 FROM sv_grid_points WHERE id=NEW.point_id AND organization_id=NEW.organization_id AND point_index=4)) THEN RAISE EXCEPTION 'LOCAL_CANARY_ONE_ATTEMPT_ONLY'; END IF;
 IF NEW.status='SUBMITTED' THEN
  IF c.emergency_stopped_at IS NOT NULL OR c.status NOT IN ('QUEUED','RUNNING','CANARY_RUNNING') OR r.status<>'RESERVED' THEN RAISE EXCEPTION 'LOCAL_ATTEMPT_SUBMIT_BLOCKED'; END IF;
  SELECT snapshot INTO locked FROM sv_configuration_locks WHERE id=c.configuration_lock_id AND organization_id=c.organization_id;
  IF NEW.submitted_candidate->'lock' IS DISTINCT FROM locked
   OR NEW.submitted_candidate#>>'{keyword,text}' IS DISTINCT FROM locked#>>'{keywordSet,keywords,0,text}'
   OR NEW.submitted_candidate#>>'{providerRequest,params,language}' IS DISTINCT FROM locked#>>'{keywordSet,keywords,0,language}'
   THEN RAISE EXCEPTION 'LOCAL_FROZEN_KEYWORD_MISMATCH'; END IF;
 END IF;
 IF NEW.status='CANCELLED_NO_CALL' AND r.status<>'RELEASED' THEN RAISE EXCEPTION 'LOCAL_CANCEL_RESERVATION_NOT_RELEASED'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION sv_local_pilot_attempt_guard() FROM PUBLIC;
CREATE TRIGGER sv_local_pilot_attempt_guard BEFORE INSERT OR UPDATE ON sv_measurement_attempts FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_attempt_guard();

CREATE UNIQUE INDEX sv_business_locations_pilot_org_id_unique ON sv_business_locations(organization_id,id);
ALTER TABLE sv_local_keywords ADD CONSTRAINT sv_local_keyword_location_org_fk FOREIGN KEY(organization_id,location_id) REFERENCES sv_business_locations(organization_id,id) NOT VALID;
ALTER TABLE sv_grid_definitions ADD CONSTRAINT sv_local_grid_location_org_fk FOREIGN KEY(organization_id,location_id) REFERENCES sv_business_locations(organization_id,id) NOT VALID;
ALTER TABLE sv_grid_points ADD CONSTRAINT sv_local_point_grid_org_fk FOREIGN KEY(organization_id,grid_id) REFERENCES sv_grid_definitions(organization_id,id) NOT VALID;
ALTER TABLE sv_local_scan_cycles ADD CONSTRAINT sv_local_cycle_location_org_fk FOREIGN KEY(organization_id,location_id) REFERENCES sv_business_locations(organization_id,id) NOT VALID;
ALTER TABLE sv_local_scan_cycles ADD CONSTRAINT sv_local_cycle_grid_org_fk FOREIGN KEY(organization_id,grid_definition_id) REFERENCES sv_grid_definitions(organization_id,id) NOT VALID;
ALTER TABLE sv_local_rank_observations ADD CONSTRAINT sv_local_observation_cycle_org_fk FOREIGN KEY(organization_id,cycle_id) REFERENCES sv_local_scan_cycles(organization_id,id) NOT VALID;
ALTER TABLE sv_local_rank_observations ADD CONSTRAINT sv_local_observation_keyword_org_fk FOREIGN KEY(organization_id,keyword_id) REFERENCES sv_local_keywords(organization_id,id) NOT VALID;
ALTER TABLE sv_local_rank_observations ADD CONSTRAINT sv_local_observation_point_org_fk FOREIGN KEY(organization_id,grid_point_id) REFERENCES sv_grid_points(organization_id,id) NOT VALID;

-- ==== staging 0068_local_maps_runtime_guards.sql ====
-- Canary raw payloads have a separate deduplication namespace.
DROP INDEX sv_source_snapshots_project_content_sha256_unique;
DROP INDEX sv_source_snapshots_legacy_org_content_sha256_unique;
CREATE UNIQUE INDEX sv_source_snapshots_project_content_sha256_unique ON sv_source_snapshots(organization_id,project_id,content_sha256) WHERE project_id IS NOT NULL AND source_type <> 'LOCAL_MAPS_CANARY_ONLY';
CREATE UNIQUE INDEX sv_source_snapshots_legacy_org_content_sha256_unique ON sv_source_snapshots(organization_id,content_sha256) WHERE project_id IS NULL AND source_type <> 'LOCAL_MAPS_CANARY_ONLY';
CREATE UNIQUE INDEX sv_source_snapshots_canary_hash_unique ON sv_source_snapshots(organization_id,coalesce(project_id,'00000000-0000-0000-0000-000000000000'::uuid),content_sha256) WHERE source_type = 'LOCAL_MAPS_CANARY_ONLY';

CREATE FUNCTION sv_local_budget_incident_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='BUDGET_BLOCKED' AND (NEW.status<>'BUDGET_BLOCKED' OR NEW.emergency_stopped_at IS DISTINCT FROM OLD.emergency_stopped_at)
 THEN RAISE EXCEPTION 'LOCAL_BUDGET_INCIDENT_RECONCILIATION_REQUIRED'; END IF;
 IF NEW.status='CANARY_REVIEW' AND (NEW.emergency_stopped_at IS NOT NULL OR EXISTS (
  SELECT 1 FROM sv_measurement_attempt_results r WHERE r.organization_id=NEW.organization_id AND r.local_cycle_id=NEW.id AND r.budget_incident IS NOT NULL
 )) THEN RAISE EXCEPTION 'LOCAL_CANARY_BUDGET_INCIDENT'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_budget_incident_guard BEFORE UPDATE ON sv_local_scan_cycles FOR EACH ROW EXECUTE FUNCTION sv_local_budget_incident_guard();

CREATE FUNCTION sv_local_customer_source_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM sv_source_snapshots s WHERE s.id=NEW.source_snapshot_id AND s.organization_id=NEW.organization_id AND s.source_type='LOCAL_MAPS_CANARY_ONLY')
 THEN RAISE EXCEPTION 'LOCAL_CANARY_CUSTOMER_EVIDENCE_FORBIDDEN'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_customer_source_guard BEFORE INSERT OR UPDATE ON sv_evidence_index FOR EACH ROW EXECUTE FUNCTION sv_local_customer_source_guard();

CREATE OR REPLACE FUNCTION sv_local_pilot_canary_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c sv_local_scan_cycles%ROWTYPE; a sv_measurement_attempts%ROWTYPE;
BEGIN
 SELECT * INTO c FROM sv_local_scan_cycles WHERE id=NEW.local_cycle_id AND organization_id=NEW.organization_id FOR UPDATE;
 SELECT * INTO a FROM sv_measurement_attempts WHERE id=NEW.attempt_id AND organization_id=NEW.organization_id;
 IF c.id IS NULL OR a.id IS NULL OR c.execution_mode<>'CANARY' OR c.status<>'CANARY_REVIEW'
  OR c.provider_contract_digest<>NEW.provider_contract_digest OR c.measurement_cycle_id<>a.measurement_cycle_id
  OR c.emergency_stopped_at IS NOT NULL
  OR EXISTS(SELECT 1 FROM sv_measurement_attempt_results r WHERE r.organization_id=c.organization_id AND r.local_cycle_id=c.id AND r.budget_incident IS NOT NULL)
  OR a.status<>'SUCCEEDED' OR a.spent_cost_usd<>NEW.actual_cost_usd
  OR NOT EXISTS(SELECT 1 FROM sv_grid_points p WHERE p.id=a.point_id AND p.grid_id=c.grid_definition_id AND p.organization_id=c.organization_id AND p.point_index=4)
  OR NOT EXISTS(SELECT 1 FROM sv_source_snapshots s WHERE s.id=NEW.evidence_id AND s.organization_id=c.organization_id AND s.source_type='LOCAL_MAPS_CANARY_ONLY' AND s.source_ref=a.raw_ref AND s.content_sha256 IS NOT NULL)
  THEN RAISE EXCEPTION 'LOCAL_CANARY_REVIEW_EVIDENCE_INVALID'; END IF;
 RETURN NEW;
END; $$;

-- Local validation is separate from formal owner-only cross-product acceptance.
CREATE OR REPLACE FUNCTION sv_local_pilot_observation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.outcome<>'PENDING' THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_TERMINAL_IMMUTABLE'; END IF;
 IF (to_jsonb(NEW)-ARRAY['outcome','validity','target_rank','captured_at','invalid_reason','raw_reference','evidence_envelope','evidence_canonical','evidence_sha256','evidence_id','attempt_count','updated_at'])
  IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['outcome','validity','target_rank','captured_at','invalid_reason','raw_reference','evidence_envelope','evidence_canonical','evidence_sha256','evidence_id','attempt_count','updated_at'])
  THEN RAISE EXCEPTION 'LOCAL_OBSERVATION_IDENTITY_IMMUTABLE'; END IF;
 IF NEW.outcome IN ('FOUND','ABSENT_WITHIN_DEPTH') AND NOT EXISTS (
  SELECT 1 FROM sv_evidence_index e
  JOIN sv_source_snapshots s ON s.id=e.source_snapshot_id AND s.organization_id=e.organization_id AND s.project_id=e.project_id
  JOIN sv_measurement_datasets d ON d.id=e.dataset_id AND d.organization_id=e.organization_id AND d.cycle_id=e.cycle_id
  JOIN sv_local_scan_cycles c ON c.id=NEW.cycle_id AND c.organization_id=e.organization_id AND c.measurement_cycle_id=e.cycle_id
  JOIN sv_configuration_locks l ON l.id=c.configuration_lock_id AND l.organization_id=c.organization_id AND l.project_id=e.project_id
  JOIN sv_local_canary_reviews review ON review.id=c.approved_canary_review_id AND review.organization_id=c.organization_id
  JOIN sv_measurement_attempts a ON a.local_observation_id=NEW.id AND a.organization_id=c.organization_id AND a.measurement_cycle_id=c.measurement_cycle_id
  JOIN sv_measurement_attempt_results r ON r.attempt_id=a.id AND r.organization_id=a.organization_id AND r.local_cycle_id=c.id
  WHERE e.id=NEW.evidence_id AND e.organization_id=NEW.organization_id AND e.domain_id='LOCAL_MAPS'
   AND e.observation_ref=NEW.id::text AND s.source_type='LOCAL_MAPS_PROVIDER' AND s.immutable AND d.immutable
   AND c.execution_mode='PILOT' AND c.status IN ('QUEUED','RUNNING') AND c.emergency_stopped_at IS NULL
   AND review.status='ACCEPTED' AND review.provider_contract_digest=c.provider_contract_digest
   AND a.status='SUCCEEDED' AND a.attempt_index=NEW.attempt_count AND a.budget_state IN ('SPENT','RELEASED')
   AND r.budget_incident IS NULL AND r.validated_result#>>'{cost,status}'='KNOWN' AND r.validated_result#>>'{cost,basis}'='actual'
   AND r.validated_result#>>'{event,kind}'=NEW.outcome AND NEW.validity='VALID'
   AND (r.validated_result->>'targetRank')::integer IS NOT DISTINCT FROM NEW.target_rank
   AND (r.validated_result->>'completedAt')::timestamptz=NEW.captured_at
   AND r.result_fingerprint=NEW.evidence_sha256 AND r.result_canonical=NEW.evidence_canonical
   AND r.raw_response_reference=NEW.raw_reference AND r.raw_response_sha256=s.content_sha256
   AND s.source_ref=NEW.raw_reference AND e.captured_at=NEW.captured_at
 ) THEN RAISE EXCEPTION 'LOCAL_VALIDATED_PROVIDER_EVIDENCE_REQUIRED'; END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION "sv_guard_measurement_attempt_result_insert"() RETURNS trigger AS $$
DECLARE
	parent_attempt "sv_measurement_attempts"%ROWTYPE;
	cost_status text;
	cost_amount_text text;
	cost_amount numeric(12, 6);
	cost_basis text;
	result_event text;
	event_reason text;
	expected_attempt_status text;
	expected_observation_validity text;
	expected_observation_outcome text;
	expected_cycle_status text;
	expected_retry_allowed text;
	expected_final_invalid_reason text;
	expected_budget_state text;
	expected_budget_incident text;
	provider_observed_at timestamptz;
BEGIN
	SELECT * INTO parent_attempt
	FROM "sv_measurement_attempts"
	WHERE "id" = NEW."attempt_id"
		AND "organization_id" = NEW."organization_id"
		AND "measurement_cycle_id" = NEW."measurement_cycle_id"
		AND "reservation_id" = NEW."reservation_id"
		AND "execution_key" = NEW."execution_key"
		AND "attempt_index" = NEW."attempt_index"
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_PARENT_MISMATCH';
	END IF;

	IF parent_attempt."submitted_candidate" IS NULL
		OR NEW."local_cycle_id"::text IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{scope,localCycleId}'
		OR NEW."configuration_lock_id"::text IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{scope,configurationLockId}'
		OR NEW."provider_id" IS DISTINCT FROM parent_attempt."executor_id"
		OR NEW."validated_result"->>'organizationId' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{scope,organizationId}'
		OR NEW."validated_result"->>'measurementCycleId' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{scope,measurementCycleId}'
		OR NEW."validated_result"->>'attemptId' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{attempt,attemptId}'
		OR NEW."validated_result"->>'reservationId' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{attempt,reservationId}'
		OR NEW."validated_result"->>'executionKey' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{attempt,executionKey}'
		OR NEW."validated_result"->>'attemptIndex' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{attempt,attemptIndex}'
		OR NEW."validated_result"->>'lockSnapshotCanonical' IS DISTINCT FROM
			parent_attempt."submitted_candidate"->>'lockSnapshotCanonical'
		OR NEW."validated_result"->>'requestSnapshotCanonical' IS DISTINCT FROM
			parent_attempt."submitted_candidate"->>'requestSnapshotCanonical'
		OR NEW."validated_result"#>>'{provider,id}' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{providerRequest,provider,id}'
		OR NEW."validated_result"#>>'{provider,version}' IS DISTINCT FROM
			parent_attempt."submitted_candidate"#>>'{providerRequest,provider,version}' THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_SUBMITTED_CANDIDATE_MISMATCH';
	END IF;

	IF parent_attempt."status" NOT IN (
		'SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE', 'UNKNOWN_RECONCILIATION'
	) THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_PRETERMINAL_BLOCKED';
	END IF;

	IF (NEW."validated_result"->>'completedAt')::timestamptz
		IS DISTINCT FROM parent_attempt."completed_at" THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_COMPLETED_AT_MISMATCH';
	END IF;
	IF NEW."validated_result"#>>'{provenance,providerObservedAt}' IS NOT NULL THEN
		provider_observed_at :=
			(NEW."validated_result"#>>'{provenance,providerObservedAt}')::timestamptz;
		IF provider_observed_at < parent_attempt."submitted_at"
			OR provider_observed_at > parent_attempt."completed_at" THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_OBSERVED_AT_OUTSIDE_ATTEMPT';
		END IF;
	END IF;

	IF parent_attempt."status" IS DISTINCT FROM NEW."disposition"->>'attemptStatus' THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_DISPOSITION_MISMATCH';
	END IF;

	IF parent_attempt."budget_state" IS DISTINCT FROM NEW."required_budget_state" THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_BUDGET_STATE_MISMATCH';
	END IF;

	IF parent_attempt."provider_task_id" IS DISTINCT FROM NEW."provider_task_id"
		OR parent_attempt."raw_ref" IS DISTINCT FROM NEW."raw_response_reference" THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_PROVENANCE_MISMATCH';
	END IF;

	IF jsonb_typeof(NEW."validated_result"->'cost') <> 'object'
		OR NOT (NEW."validated_result"->'cost' ?& array['status', 'currency', 'amountUsd', 'basis'])
		OR NEW."validated_result"#>>'{cost,currency}' IS DISTINCT FROM 'USD' THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_COST_INVALID';
	END IF;

	cost_status := NEW."validated_result"#>>'{cost,status}';
	cost_amount_text := NEW."validated_result"#>>'{cost,amountUsd}';
	cost_basis := NEW."validated_result"#>>'{cost,basis}';
	result_event := NEW."validated_result"#>>'{event,kind}';
	event_reason := NEW."validated_result"#>>'{event,reason}';
	IF result_event IS DISTINCT FROM 'RETRYABLE_FAILURE' AND event_reason IS NOT NULL THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_EVENT_REASON_INVALID';
	END IF;

	IF result_event IN ('FOUND', 'ABSENT_WITHIN_DEPTH') THEN
		expected_attempt_status := 'SUCCEEDED';
		expected_observation_validity := 'VALID';
		expected_observation_outcome := result_event;
		expected_cycle_status := 'RUNNING';
		expected_retry_allowed := 'false';
		expected_final_invalid_reason := NULL;
	ELSIF result_event = 'RETRYABLE_FAILURE' THEN
		IF event_reason IS NULL OR event_reason NOT IN (
			'EMPTY_RESPONSE', 'TRUNCATED_RESPONSE', 'TIMEOUT',
			'PROVIDER_5XX', 'RATE_LIMITED', 'MALFORMED_RESPONSE'
		) THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_RETRY_REASON_INVALID';
		END IF;
		IF NEW."attempt_index" < 3 THEN
			expected_attempt_status := 'RETRYABLE_FAILURE';
			expected_observation_validity := 'UNMEASURED';
			expected_observation_outcome := 'RETRY_PENDING';
			expected_cycle_status := 'RUNNING';
			expected_retry_allowed := 'true';
			expected_final_invalid_reason := NULL;
		ELSE
			expected_attempt_status := 'TERMINAL_FAILURE';
			expected_observation_validity := 'INVALID';
			expected_observation_outcome := 'PROVIDER_ERROR';
			expected_cycle_status := 'PARTIAL_FAILURE';
			expected_retry_allowed := 'false';
			expected_final_invalid_reason := CASE
				WHEN event_reason IN ('EMPTY_RESPONSE', 'TRUNCATED_RESPONSE')
					THEN 'EMPTY_AFTER_3_ATTEMPTS'
				WHEN event_reason IN ('TIMEOUT', 'PROVIDER_5XX')
					THEN 'PROVIDER_UNAVAILABLE'
				WHEN event_reason = 'RATE_LIMITED' THEN 'RATE_LIMIT_EXHAUSTED'
				WHEN event_reason = 'MALFORMED_RESPONSE' THEN 'MALFORMED_AFTER_3_ATTEMPTS'
			END;
		END IF;
	ELSIF result_event = 'PROVIDER_AUTH_FAILURE' THEN
		expected_attempt_status := 'TERMINAL_FAILURE';
		expected_observation_validity := 'UNMEASURED';
		expected_observation_outcome := 'PROVIDER_BLOCKED';
		expected_cycle_status := 'PROVIDER_BLOCKED';
		expected_retry_allowed := 'false';
		expected_final_invalid_reason := NULL;
	ELSIF result_event = 'OUTCOME_UNKNOWN' THEN
		expected_attempt_status := 'UNKNOWN_RECONCILIATION';
		expected_observation_validity := 'UNMEASURED';
		expected_observation_outcome := 'UNKNOWN_RECONCILIATION';
		expected_cycle_status := 'STOPPED';
		expected_retry_allowed := 'false';
		expected_final_invalid_reason := NULL;
	ELSIF result_event = 'LOCKED_REQUEST_INVALID' THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_NON_LIVE_EVENT_BLOCKED';
	ELSE
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_EVENT_INVALID';
	END IF;

	-- The event remains immutable; execution policy can close an otherwise retryable slot.
	IF result_event='RETRYABLE_FAILURE' AND NEW.attempt_index<3 THEN
	 IF EXISTS(SELECT 1 FROM sv_local_scan_cycles c WHERE c.id=NEW.local_cycle_id AND c.organization_id=NEW.organization_id AND c.execution_mode='CANARY') THEN
	  expected_attempt_status := 'TERMINAL_FAILURE';
	  expected_observation_validity := 'INVALID';
	  expected_observation_outcome := 'PROVIDER_ERROR';
	  expected_cycle_status := 'PARTIAL_FAILURE';
	  expected_retry_allowed := 'false';
	  expected_final_invalid_reason := 'PROVIDER_UNAVAILABLE';
	 ELSIF EXISTS(SELECT 1 FROM sv_local_scan_cycles c WHERE c.id=NEW.local_cycle_id AND c.organization_id=NEW.organization_id AND c.execution_mode='PILOT' AND c.status IN ('BUDGET_BLOCKED','STOPPED')) THEN
	  expected_observation_validity := 'UNMEASURED';
	  expected_observation_outcome := 'PREFLIGHT_BLOCKED';
	  expected_cycle_status := 'PARTIAL_FAILURE';
	  expected_retry_allowed := 'false';
	 END IF;
	END IF;

	IF NEW."disposition"->>'attemptStatus' IS DISTINCT FROM expected_attempt_status
		OR NEW."disposition"->>'observationValidity' IS DISTINCT FROM expected_observation_validity
		OR NEW."disposition"->>'observationOutcome' IS DISTINCT FROM expected_observation_outcome
		OR NEW."disposition"->>'cycleStatus' IS DISTINCT FROM expected_cycle_status
		OR NEW."disposition"->>'retryAllowed' IS DISTINCT FROM expected_retry_allowed
		OR NEW."disposition"->>'finalInvalidReason' IS DISTINCT FROM expected_final_invalid_reason THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_EXACT_DISPOSITION_MISMATCH';
	END IF;
	IF parent_attempt."retry_reason" IS DISTINCT FROM event_reason
		OR parent_attempt."final_invalid_reason" IS DISTINCT FROM expected_final_invalid_reason THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_PARENT_REASON_MISMATCH';
	END IF;

	IF cost_status = 'UNKNOWN' THEN
		IF cost_amount_text IS NOT NULL OR cost_basis IS NOT NULL
			OR result_event IS DISTINCT FROM 'OUTCOME_UNKNOWN' THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_UNKNOWN_COST_INVALID';
		END IF;
		expected_budget_state := 'RESERVED';
		expected_budget_incident := NULL;
		IF parent_attempt."spent_cost_usd" <> 0
			OR parent_attempt."released_cost_usd" <> 0
			OR parent_attempt."cost_event_id" IS NOT NULL THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_UNKNOWN_PARENT_COST_MISMATCH';
		END IF;
	ELSIF cost_status = 'KNOWN' THEN
		IF cost_amount_text IS NULL
			OR cost_amount_text !~ '^(0|[1-9][0-9]*)([.][0-9]{1,6})?$'
			OR cost_basis IS NULL OR cost_basis NOT IN ('actual', 'estimated')
			OR result_event IS NOT DISTINCT FROM 'OUTCOME_UNKNOWN' THEN
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_KNOWN_COST_INVALID';
		END IF;
		cost_amount := cost_amount_text::numeric(12, 6);
		IF cost_amount > 0 THEN
			expected_budget_state := 'SPENT';
			IF parent_attempt."spent_cost_usd" IS DISTINCT FROM cost_amount
				OR parent_attempt."released_cost_usd" IS DISTINCT FROM
					greatest(parent_attempt."reserved_cost_usd" - cost_amount, 0)
				OR parent_attempt."cost_event_id" IS NULL THEN
				RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_SPENT_PARENT_COST_MISMATCH';
			END IF;
		ELSIF cost_basis = 'actual' THEN
			expected_budget_state := 'RELEASED';
			IF parent_attempt."spent_cost_usd" <> 0
				OR parent_attempt."released_cost_usd" IS DISTINCT FROM parent_attempt."reserved_cost_usd"
				OR parent_attempt."cost_event_id" IS NOT NULL THEN
				RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_RELEASED_PARENT_COST_MISMATCH';
			END IF;
		ELSE
			RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_ESTIMATED_ZERO_BLOCKED';
		END IF;
		expected_budget_incident := CASE
			WHEN cost_amount > parent_attempt."reserved_cost_usd"
				THEN 'REPORTED_COST_EXCEEDS_RESERVATION'
			ELSE NULL
		END;
	ELSE
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_COST_STATUS_INVALID';
	END IF;

	IF NEW."required_budget_state" IS DISTINCT FROM expected_budget_state
		OR NEW."budget_incident" IS DISTINCT FROM expected_budget_incident THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_COST_MAPPING_MISMATCH';
	END IF;

	IF parent_attempt."status" = 'UNKNOWN_RECONCILIATION'
		AND (result_event IS DISTINCT FROM 'OUTCOME_UNKNOWN'
			OR parent_attempt."unknown_reason" IS DISTINCT FROM 'PROVIDER_OUTCOME_UNKNOWN') THEN
		RAISE EXCEPTION 'MEASUREMENT_ATTEMPT_RESULT_UNKNOWN_REASON_MISMATCH';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE sv_measurement_attempts DROP CONSTRAINT sv_measurement_attempts_reason_shape_check;
ALTER TABLE sv_measurement_attempts ADD CONSTRAINT "sv_measurement_attempts_reason_shape_check"
		CHECK (
			("retry_reason" IS NULL OR "retry_reason" IN (
				'EMPTY_RESPONSE', 'TRUNCATED_RESPONSE', 'TIMEOUT',
				'PROVIDER_5XX', 'RATE_LIMITED', 'MALFORMED_RESPONSE'
			))
			AND ("final_invalid_reason" IS NULL OR "final_invalid_reason" IN (
				'EMPTY_AFTER_3_ATTEMPTS', 'PROVIDER_UNAVAILABLE',
				'RATE_LIMIT_EXHAUSTED', 'MALFORMED_AFTER_3_ATTEMPTS'
			))
			AND (("status" = 'RETRYABLE_FAILURE' AND "attempt_index" < 3
				AND "retry_reason" IS NOT NULL AND "final_invalid_reason" IS NULL)
			OR ("status" = 'TERMINAL_FAILURE' AND "attempt_index" = 3 AND (
				("retry_reason" IN ('EMPTY_RESPONSE', 'TRUNCATED_RESPONSE')
					AND "final_invalid_reason" = 'EMPTY_AFTER_3_ATTEMPTS')
				OR ("retry_reason" IN ('TIMEOUT', 'PROVIDER_5XX')
					AND "final_invalid_reason" = 'PROVIDER_UNAVAILABLE')
				OR ("retry_reason" = 'RATE_LIMITED'
					AND "final_invalid_reason" = 'RATE_LIMIT_EXHAUSTED')
				OR ("retry_reason" = 'MALFORMED_RESPONSE'
					AND "final_invalid_reason" = 'MALFORMED_AFTER_3_ATTEMPTS')
			))
			OR ("status"='TERMINAL_FAILURE' AND "domain_id"='LOCAL_MAPS' AND "attempt_index"=1 AND "retry_reason" IS NOT NULL AND "final_invalid_reason"='PROVIDER_UNAVAILABLE')
			OR ("status" = 'TERMINAL_FAILURE'
				AND "retry_reason" IS NULL AND "final_invalid_reason" IS NULL)
			OR ("status" NOT IN ('RETRYABLE_FAILURE', 'TERMINAL_FAILURE')
				AND "retry_reason" IS NULL AND "final_invalid_reason" IS NULL))
		);

CREATE FUNCTION sv_local_first_attempt_terminal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='TERMINAL_FAILURE' AND NEW.attempt_index=1 AND NEW.retry_reason IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM sv_local_scan_cycles c WHERE c.measurement_cycle_id=NEW.measurement_cycle_id AND c.organization_id=NEW.organization_id AND c.execution_mode='CANARY'
 ) THEN RAISE EXCEPTION 'LOCAL_FIRST_ATTEMPT_TERMINAL_CANARY_REQUIRED'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_first_attempt_terminal_guard BEFORE UPDATE ON sv_measurement_attempts FOR EACH ROW EXECUTE FUNCTION sv_local_first_attempt_terminal_guard();

-- ==== staging 0069_local_report_acceptance.sql ====
-- Local runtime acceptance records the validated immutable Maps chain. It grants no
-- owner privileges and leaves the separate formal evidence acceptance guards intact.
CREATE TABLE sv_local_evidence_acceptances (
 organization_id text NOT NULL REFERENCES organization(id),
 observation_id uuid PRIMARY KEY REFERENCES sv_local_rank_observations(id),
 evidence_id uuid NOT NULL,
 evidence_sha256 text NOT NULL,
 contract_version text NOT NULL DEFAULT 'LOCAL_MAPS_V1' CHECK(contract_version='LOCAL_MAPS_V1'),
 accepted_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(evidence_id,organization_id) REFERENCES sv_evidence_index(id,organization_id)
);
ALTER TABLE sv_local_evidence_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_evidence_acceptances
 USING(organization_id=current_setting('app.organization_id',true))
 WITH CHECK(organization_id=current_setting('app.organization_id',true));
CREATE FUNCTION sv_local_acceptance_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM sv_local_rank_observations o
  JOIN sv_local_scan_cycles c ON c.id=o.cycle_id AND c.organization_id=o.organization_id
  JOIN sv_evidence_index e ON e.id=o.evidence_id AND e.organization_id=o.organization_id
  JOIN sv_source_snapshots s ON s.id=e.source_snapshot_id AND s.organization_id=e.organization_id
  WHERE o.id=NEW.observation_id AND o.organization_id=NEW.organization_id
  AND o.validity='VALID' AND o.outcome IN ('FOUND','ABSENT_WITHIN_DEPTH')
  AND o.evidence_id=NEW.evidence_id AND o.evidence_sha256=NEW.evidence_sha256
  AND s.source_type='LOCAL_MAPS_PROVIDER' AND s.immutable
  AND c.execution_mode='PILOT' AND c.approved_canary_review_id IS NOT NULL
  AND c.emergency_stopped_at IS NULL AND c.status<>'BUDGET_BLOCKED'
 ) THEN RAISE EXCEPTION 'LOCAL_ACCEPTANCE_CHAIN_INVALID'; END IF;
 IF NEW.accepted_at > now() OR NEW.accepted_at < (SELECT captured_at FROM sv_local_rank_observations WHERE id=NEW.observation_id)
 THEN RAISE EXCEPTION 'LOCAL_ACCEPTANCE_TIME_INVALID'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_acceptance_guard BEFORE INSERT ON sv_local_evidence_acceptances FOR EACH ROW EXECUTE FUNCTION sv_local_acceptance_guard();
CREATE TRIGGER sv_local_acceptance_immutable BEFORE UPDATE OR DELETE ON sv_local_evidence_acceptances FOR EACH ROW EXECUTE FUNCTION sv_local_pilot_append_only();
CREATE TRIGGER sv_local_acceptance_no_truncate BEFORE TRUNCATE ON sv_local_evidence_acceptances FOR EACH STATEMENT EXECUTE FUNCTION sv_local_pilot_append_only();
CREATE FUNCTION sv_local_observation_acceptance_required() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.validity='VALID' AND NOT EXISTS(SELECT 1 FROM sv_local_evidence_acceptances WHERE organization_id=NEW.organization_id AND observation_id=NEW.id AND evidence_id=NEW.evidence_id AND evidence_sha256=NEW.evidence_sha256)
 THEN RAISE EXCEPTION 'LOCAL_ACCEPTANCE_REQUIRED'; END IF;
 RETURN NEW;
END; $$;
CREATE CONSTRAINT TRIGGER sv_local_observation_acceptance_required AFTER INSERT OR UPDATE ON sv_local_rank_observations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sv_local_observation_acceptance_required();

CREATE FUNCTION sv_local_report_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item jsonb; n integer;
BEGIN
 IF NEW.content_json IS DISTINCT FROM NEW.content_canonical::jsonb
 OR NEW.content_sha256 IS DISTINCT FROM 'sha256:'||encode(sha256(convert_to(NEW.content_canonical,'UTF8')),'hex')
 THEN RAISE EXCEPTION 'LOCAL_REPORT_HASH_INVALID'; END IF;
 IF NEW.content_json->>'localCycleId' IS DISTINCT FROM NEW.local_cycle_id::text
 OR jsonb_array_length(NEW.content_json->'observations') IS DISTINCT FROM 9
 THEN RAISE EXCEPTION 'LOCAL_REPORT_CARDINALITY_INVALID'; END IF;
 SELECT count(DISTINCT x->>'id') INTO n FROM jsonb_array_elements(NEW.content_json->'observations') x;
 IF n<>9 THEN RAISE EXCEPTION 'LOCAL_REPORT_CARDINALITY_INVALID'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(NEW.content_json->'observations') LOOP
  IF NOT EXISTS(SELECT 1 FROM sv_local_rank_observations o
    JOIN sv_grid_points p ON p.id=o.grid_point_id AND p.organization_id=o.organization_id
    JOIN sv_local_scan_cycles c ON c.id=o.cycle_id AND c.organization_id=o.organization_id
    JOIN sv_configuration_locks l ON l.id=c.configuration_lock_id AND l.organization_id=c.organization_id
    WHERE o.organization_id=NEW.organization_id AND o.cycle_id=NEW.local_cycle_id
    AND p.point_index=(item->>'pointIndex')::int AND p.latitude=(item->>'latitude')::numeric AND p.longitude=(item->>'longitude')::numeric
    AND item->>'keyword'=l.snapshot#>>'{keywordSet,keywords,0,text}' AND item->>'language'=l.snapshot#>>'{keywordSet,keywords,0,language}'
    AND item->>'reason' IS NOT DISTINCT FROM o.invalid_reason::text
    AND o.id::text=item->>'id' AND o.outcome::text=item->>'outcome' AND o.validity::text IS NOT DISTINCT FROM item->>'validity'
    AND o.target_rank IS NOT DISTINCT FROM (item->>'targetRank')::int AND o.captured_at IS NOT DISTINCT FROM (item->>'capturedAt')::timestamptz
    AND o.evidence_id::text IS NOT DISTINCT FROM item->>'evidenceId' AND o.outcome IN ('FOUND','ABSENT_WITHIN_DEPTH','INVALID')
    AND (o.validity<>'VALID' OR EXISTS(SELECT 1 FROM sv_local_evidence_acceptances a WHERE a.organization_id=o.organization_id AND a.observation_id=o.id AND a.evidence_id=o.evidence_id AND a.evidence_sha256=o.evidence_sha256)))
  THEN RAISE EXCEPTION 'LOCAL_REPORT_ACCEPTED_EVIDENCE_REQUIRED'; END IF;
 END LOOP;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_report_evidence_guard BEFORE INSERT OR UPDATE ON sv_local_report_versions FOR EACH ROW EXECUTE FUNCTION sv_local_report_evidence_guard();
CREATE FUNCTION sv_local_qc_actor_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.actor IS DISTINCT FROM current_setting('app.user_id',true) OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_OPERATOR_MEMBERSHIP_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM sv_local_report_versions WHERE id=NEW.report_version_id AND organization_id=NEW.organization_id AND local_cycle_id=NEW.local_cycle_id AND status='DRAFT')
 THEN RAISE EXCEPTION 'LOCAL_QC_DRAFT_REQUIRED'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_qc_actor_guard BEFORE INSERT ON sv_local_qc_decisions FOR EACH ROW EXECUTE FUNCTION sv_local_qc_actor_guard();
CREATE FUNCTION sv_local_delivery_member_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.recipient_identity)
 THEN RAISE EXCEPTION 'LOCAL_MEMBERSHIP_REQUIRED'; END IF;
 IF TG_OP='INSERT' AND (NEW.actor IS DISTINCT FROM current_setting('app.user_id',true) OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor AND role IN ('owner','admin')))
 THEN RAISE EXCEPTION 'LOCAL_OPERATOR_MEMBERSHIP_REQUIRED'; END IF;
 IF NEW.status='ACKNOWLEDGED' AND (NEW.acknowledged_at IS NULL OR NEW.acknowledged_at<NEW.sent_at OR NEW.acknowledged_at>now())
 THEN RAISE EXCEPTION 'LOCAL_DELIVERY_ACK_TIME_INVALID'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_delivery_member_guard BEFORE INSERT OR UPDATE ON sv_local_report_deliveries FOR EACH ROW EXECUTE FUNCTION sv_local_delivery_member_guard();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selena_app') THEN GRANT SELECT,INSERT ON sv_local_evidence_acceptances TO selena_app; END IF;
END $$;

-- A durable heartbeat lets an independent container health check detect a stalled cleanup worker.
CREATE TABLE sv_local_raw_retention_health (
 organization_id text PRIMARY KEY REFERENCES organization(id),
 checked_at timestamptz NOT NULL,
 deleted_count integer NOT NULL CHECK(deleted_count>=0),
 overdue_count integer NOT NULL CHECK(overdue_count>=0)
);
ALTER TABLE sv_local_raw_retention_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_raw_retention_health USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selena_app') THEN GRANT SELECT,INSERT,UPDATE ON sv_local_raw_retention_health TO selena_app; END IF;
END $$;

-- ==== staging 0070_local_pilot_reschedule.sql ====
-- An accepted canary may need a later execution window. Keep every historical
-- PILOT immutable, but allow its accepted review to back one active replacement
-- after the unmaterialized predecessor is terminalized as STOPPED.
DROP INDEX sv_local_scan_cycles_accepted_canary_review_unique;

CREATE UNIQUE INDEX sv_local_scan_cycles_accepted_canary_review_unique
 ON sv_local_scan_cycles(organization_id,approved_canary_review_id)
 WHERE approved_canary_review_id IS NOT NULL AND status <> 'STOPPED';

-- ==== staging 0071_local_observation_guard_privileges.sql ====
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

END IF;
END; $local_pilot$;

DO $local_pilot_verify$
DECLARE missing text;
BEGIN
 SELECT string_agg(name, ', ') INTO missing FROM (
  SELECT t AS name FROM unnest(ARRAY['sv_local_dispatch_outbox', 'sv_local_report_versions', 'sv_local_qc_decisions', 'sv_local_report_deliveries', 'sv_local_canary_reviews', 'sv_local_raw_evidence', 'sv_local_evidence_acceptances', 'sv_local_raw_retention_health']) t
   WHERE to_regclass('public.'||t) IS NULL
  UNION ALL
  SELECT f FROM unnest(ARRAY['sv_local_pilot_append_only', 'sv_local_pilot_cycle_guard', 'sv_local_pilot_observation_guard', 'sv_local_pilot_outbox_guard', 'sv_local_pilot_report_guard', 'sv_local_pilot_canary_review_guard', 'sv_local_pilot_delivery_guard', 'sv_local_pilot_attempt_guard', 'sv_local_budget_incident_guard', 'sv_local_customer_source_guard', 'sv_local_first_attempt_terminal_guard', 'sv_local_acceptance_guard', 'sv_local_observation_acceptance_required', 'sv_local_report_evidence_guard', 'sv_local_qc_actor_guard', 'sv_local_delivery_member_guard']) f
   WHERE to_regprocedure('public.'||f||'()') IS NULL
  UNION ALL
  SELECT 'sv_local_pilot_observation_guard SECURITY DEFINER'
   WHERE NOT coalesce((SELECT prosecdef FROM pg_proc WHERE oid=to_regprocedure('public.sv_local_pilot_observation_guard()')),false)
  UNION ALL
  SELECT 'sv_local_scan_cycles_accepted_canary_review_unique excludes STOPPED'
   WHERE coalesce(pg_get_indexdef(to_regclass('public.sv_local_scan_cycles_accepted_canary_review_unique')),'') NOT LIKE '%STOPPED%'
  UNION ALL
  SELECT p FROM unnest(ARRAY['sv_reserve_provider_spend(text,text,text,numeric)','sv_settle_provider_spend(text,text,text,numeric)','sv_release_provider_spend(text,text,text)']) p
   WHERE position('LOCAL_SPEND_TENANT_MISMATCH' IN pg_get_functiondef(p::regprocedure))=0
  UNION ALL
  SELECT 'sv_guard_measurement_attempt_mutation CANCELLED_NO_CALL'
   WHERE position('LOCAL_CANCEL_NO_CALL_INVALID' IN pg_get_functiondef('sv_guard_measurement_attempt_mutation()'::regprocedure))=0
 ) m;
 IF missing IS NOT NULL THEN RAISE EXCEPTION 'LOCAL_PILOT_SCHEMA_INCOMPLETE: %', missing; END IF;
END; $local_pilot_verify$;
ALTER TABLE sv_local_dispatch_outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_local_report_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_local_qc_decisions FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_local_report_deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_local_canary_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_local_raw_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_local_evidence_acceptances FORCE ROW LEVEL SECURITY;
ALTER TABLE sv_local_raw_retention_health FORCE ROW LEVEL SECURITY;
