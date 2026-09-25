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
