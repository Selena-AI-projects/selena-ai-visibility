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
