CREATE TABLE sv_local_order_publications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id text NOT NULL,
 project_id uuid NOT NULL, order_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 status text NOT NULL DEFAULT 'PUBLISHED' CHECK(status IN ('PUBLISHED','REVOKED')),
 bundle_json jsonb NOT NULL, bundle_sha256 text NOT NULL,
 analysis_json jsonb NOT NULL, content_canonical text NOT NULL, content_sha256 text NOT NULL,
 actor_id text NOT NULL, parent_id uuid REFERENCES sv_local_order_publications(id),
 created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, revoked_by text,
 UNIQUE(organization_id,order_id,version), UNIQUE(organization_id,order_id,content_sha256),
 FOREIGN KEY(order_id,organization_id) REFERENCES sv_orders(id,organization_id),
 FOREIGN KEY(project_id,organization_id) REFERENCES sv_projects(id,organization_id),
 CHECK(bundle_sha256='sha256:'||encode(sha256(convert_to(bundle_json::text,'UTF8')),'hex')),
 CHECK(content_canonical::jsonb=jsonb_build_object('bundle',bundle_json,'analysis',analysis_json)),
 CHECK(content_sha256='sha256:'||encode(sha256(convert_to(content_canonical,'UTF8')),'hex')),
 CHECK((status='PUBLISHED' AND revoked_at IS NULL AND revoked_by IS NULL) OR (status='REVOKED' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL))
);
ALTER TABLE sv_local_order_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_order_publications USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
CREATE FUNCTION sv_local_order_publication_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=TG_RELID))
 OR OLD.status<>'PUBLISHED' OR NEW.status<>'REVOKED'
 OR (to_jsonb(NEW)-ARRAY['status','revoked_at','revoked_by']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','revoked_at','revoked_by'])
 THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_order_publication_immutable BEFORE UPDATE OR DELETE ON sv_local_order_publications FOR EACH ROW EXECUTE FUNCTION sv_local_order_publication_immutable();
CREATE TRIGGER sv_local_order_publication_no_truncate BEFORE TRUNCATE ON sv_local_order_publications FOR EACH STATEMENT EXECUTE FUNCTION sv_local_external_immutable();

-- Build from database-owned slots, never from a client-supplied report document.
CREATE FUNCTION sv_publish_local_order(target_order uuid, allow_partial boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tenant text:=current_setting('app.organization_id',true); actor text:=current_setting('app.user_id',true);
 spec jsonb; run_status text; expected integer; project uuid; restaurant text; tasks jsonb; bundle jsonb; analysis jsonb;
 canonical text; bundle_hash text; prior sv_local_order_publications; result uuid; next_version integer;
BEGIN
 PERFORM 1 FROM member WHERE organization_id=tenant AND user_id=actor AND role IN ('owner','admin') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_MEMBER_REQUIRED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('publication:'||tenant||':'||target_order,0));
 SELECT l.snapshot,r.status,r.expected_slots,o.project_id,b.display_name INTO spec,run_status,expected,project,restaurant
 FROM sv_orders o JOIN sv_configuration_locks l ON l.id=o.lock_id AND l.organization_id=o.organization_id AND l.project_id=o.project_id
 JOIN sv_projects p ON p.id=o.project_id AND p.organization_id=o.organization_id
 JOIN sv_local_customer_runs r ON r.order_id=o.id AND r.organization_id=o.organization_id
 JOIN sv_business_locations b ON b.id::text=l.snapshot->>'locationId' AND b.organization_id=o.organization_id
 JOIN sv_entities e ON e.id=b.entity_id AND e.organization_id=b.organization_id AND e.project_id=o.project_id
 WHERE o.id=target_order AND o.organization_id=tenant AND r.snapshot_canonical::jsonb=l.snapshot
 AND ((r.status='READY' AND o.status IN ('READY','DELIVERED')) OR (r.status='FAILED' AND o.status='PARTIAL_FAILURE'))
 AND EXISTS(SELECT 1 FROM sv_payments pay WHERE pay.order_id=o.id AND pay.organization_id=tenant AND pay.status='SUCCEEDED' AND pay.provider='test' AND pay.amount=49 AND pay.currency='USD')
 FOR SHARE OF r,o,l,b,e,p;
 IF spec IS NULL THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_ORDER_NOT_FOUND'; END IF;
 IF spec->>'domainId' IS DISTINCT FROM 'LOCAL_MAPS_ORDER' OR spec#>>'{providerPolicy,mode}' IS DISTINCT FROM 'FIXTURE' OR spec->>'paymentMode' IS DISTINCT FROM 'TEST'
 THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_SOURCE_UNSUPPORTED'; END IF;
 IF run_status<>'READY' AND NOT(allow_partial IS TRUE AND run_status='FAILED') THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_PARTIAL_APPROVAL_REQUIRED'; END IF;
 SELECT jsonb_agg(jsonb_build_object('queryIndex',query_index,'pointIndex',point_index,'keyword',keyword,'latitude',latitude,'longitude',longitude,'status',status,'result',result_json) ORDER BY query_index,point_index) INTO tasks
 FROM sv_local_customer_tasks WHERE order_id=target_order AND organization_id=tenant;
 IF tasks IS NULL OR jsonb_array_length(tasks)<>expected OR expected<>jsonb_array_length(spec->'queries')*jsonb_array_length(spec#>'{grid,points}') THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_SLOT_MISMATCH'; END IF;
 IF run_status='READY' AND EXISTS(SELECT 1 FROM sv_local_customer_tasks WHERE order_id=target_order AND status<>'DONE') THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_SLOT_MISMATCH'; END IF;
 bundle:=jsonb_build_object('snapshot',spec,'restaurantName',restaurant,'tasks',tasks,'runStatus',run_status,'partialAcknowledged',run_status<>'READY');
 bundle_hash:='sha256:'||encode(sha256(convert_to(bundle::text,'UTF8')),'hex');
 SELECT * INTO prior FROM sv_local_order_publications WHERE order_id=target_order AND organization_id=tenant AND bundle_sha256=bundle_hash ORDER BY version DESC LIMIT 1;
 IF FOUND THEN
  IF prior.status='REVOKED' THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_REVOKED'; END IF;
  RETURN prior.id;
 END IF;
 analysis:=jsonb_build_object('status','PENDING','actions','[]'::jsonb);
 canonical:=jsonb_build_object('bundle',bundle,'analysis',analysis)::text;
 SELECT coalesce(max(version),0)+1 INTO next_version FROM sv_local_order_publications WHERE order_id=target_order AND organization_id=tenant;
 INSERT INTO sv_local_order_publications(organization_id,project_id,order_id,version,bundle_json,bundle_sha256,analysis_json,content_canonical,content_sha256,actor_id)
 VALUES(tenant,project,target_order,next_version,bundle,bundle_hash,analysis,canonical,'sha256:'||encode(sha256(convert_to(canonical,'UTF8')),'hex'),actor) RETURNING id INTO result;
 RETURN result;
END; $$;

CREATE FUNCTION sv_review_local_order_publication(base_id uuid, expected_hash text, reviewed_actions jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tenant text:=current_setting('app.organization_id',true); actor text:=current_setting('app.user_id',true); base sv_local_order_publications; result uuid; analysis jsonb; canonical text; next_version integer; digest text;
BEGIN
 PERFORM 1 FROM member WHERE organization_id=tenant AND user_id=actor AND role IN ('owner','admin') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_MEMBER_REQUIRED'; END IF;
 SELECT * INTO base FROM sv_local_order_publications WHERE id=base_id AND organization_id=tenant;
 IF NOT FOUND OR base.status<>'PUBLISHED' THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_NOT_FOUND'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('publication:'||tenant||':'||base.order_id,0));
 SELECT * INTO base FROM sv_local_order_publications WHERE id=base_id AND organization_id=tenant FOR SHARE;
 IF base.status<>'PUBLISHED' THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_NOT_FOUND'; END IF;
 PERFORM 1 FROM sv_orders WHERE id=base.order_id AND organization_id=tenant AND status IN ('READY','DELIVERED','PARTIAL_FAILURE') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_ORDER_NOT_FOUND'; END IF;
 IF base.content_sha256 IS DISTINCT FROM expected_hash OR jsonb_typeof(reviewed_actions) IS DISTINCT FROM 'array' OR jsonb_array_length(reviewed_actions)>50 THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_REVIEW_MISMATCH'; END IF;
 analysis:=jsonb_build_object('status','REVIEWED','actions',reviewed_actions);
 canonical:=jsonb_build_object('bundle',base.bundle_json,'analysis',analysis)::text; digest:='sha256:'||encode(sha256(convert_to(canonical,'UTF8')),'hex');
 SELECT id INTO result FROM sv_local_order_publications WHERE order_id=base.order_id AND organization_id=tenant AND content_sha256=digest AND status='PUBLISHED';
 IF FOUND THEN RETURN result; END IF;
 SELECT coalesce(max(version),0)+1 INTO next_version FROM sv_local_order_publications WHERE order_id=base.order_id AND organization_id=tenant;
 IF next_version<>base.version+1 THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_STALE_REVIEW'; END IF;
 INSERT INTO sv_local_order_publications(organization_id,project_id,order_id,version,bundle_json,bundle_sha256,analysis_json,content_canonical,content_sha256,actor_id,parent_id)
 VALUES(tenant,base.project_id,base.order_id,next_version,base.bundle_json,base.bundle_sha256,analysis,canonical,digest,actor,base.id) RETURNING id INTO result;
 RETURN result;
END; $$;

CREATE FUNCTION sv_revoke_local_order_publication(target_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tenant text:=current_setting('app.organization_id',true); actor text:=current_setting('app.user_id',true); target_order uuid;
BEGIN
 PERFORM 1 FROM member WHERE organization_id=tenant AND user_id=actor AND role IN ('owner','admin') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_MEMBER_REQUIRED'; END IF;
 SELECT order_id INTO target_order FROM sv_local_order_publications WHERE id=target_id AND organization_id=tenant;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_NOT_FOUND'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('publication:'||tenant||':'||target_order,0));
 UPDATE sv_local_order_publications SET status='REVOKED',revoked_at=now(),revoked_by=actor WHERE id=target_id AND organization_id=tenant AND status='PUBLISHED';
 IF NOT FOUND AND NOT EXISTS(SELECT 1 FROM sv_local_order_publications WHERE id=target_id AND organization_id=tenant AND status='REVOKED') THEN RAISE EXCEPTION 'LOCAL_PUBLICATION_NOT_FOUND'; END IF;
END; $$;
REVOKE ALL ON FUNCTION sv_local_order_publication_immutable(),sv_publish_local_order(uuid,boolean),sv_review_local_order_publication(uuid,text,jsonb),sv_revoke_local_order_publication(uuid) FROM PUBLIC;
REVOKE ALL ON sv_local_order_publications FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selena_app') THEN
 GRANT SELECT ON sv_local_order_publications TO selena_app;
 GRANT EXECUTE ON FUNCTION sv_publish_local_order(uuid,boolean),sv_review_local_order_publication(uuid,text,jsonb),sv_revoke_local_order_publication(uuid) TO selena_app;
END IF; END $$;
