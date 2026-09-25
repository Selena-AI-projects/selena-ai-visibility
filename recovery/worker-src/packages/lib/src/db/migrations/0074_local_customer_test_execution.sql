CREATE UNIQUE INDEX sv_orders_id_organization_unique ON sv_orders(id,organization_id);
CREATE TABLE sv_local_customer_runs (
 order_id uuid PRIMARY KEY,
 organization_id text NOT NULL,
 actor_id text NOT NULL,
 snapshot_canonical text NOT NULL,
 snapshot_sha256 text NOT NULL,
 expected_slots integer NOT NULL CHECK(expected_slots BETWEEN 9 AND 375),
 status text NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','RUNNING','READY','FAILED','CANCELLED')),
 failure_count integer NOT NULL DEFAULT 0 CHECK(failure_count BETWEEN 0 AND 3),
 created_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 UNIQUE(order_id,organization_id),
 FOREIGN KEY(order_id,organization_id) REFERENCES sv_orders(id,organization_id),
 CHECK(snapshot_sha256='sha256:'||encode(sha256(convert_to(snapshot_canonical,'UTF8')),'hex'))
);
CREATE TABLE sv_local_customer_tasks (
 order_id uuid NOT NULL,
 organization_id text NOT NULL,
 query_index integer NOT NULL CHECK(query_index BETWEEN 0 AND 14),
 point_index integer NOT NULL CHECK(point_index BETWEEN 0 AND 24),
 keyword text NOT NULL,
 latitude numeric(9,6) NOT NULL,
 longitude numeric(9,6) NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DONE')),
 result_json jsonb,
 PRIMARY KEY(order_id,query_index,point_index),
 FOREIGN KEY(order_id,organization_id) REFERENCES sv_local_customer_runs(order_id,organization_id),
 CHECK(((status='PENDING' AND result_json IS NULL) OR
  (status='DONE' AND result_json->>'source'='FIXTURE_NOT_GOOGLE' AND result_json->>'externalProviderCalls'='0')) IS TRUE)
);
ALTER TABLE sv_local_customer_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sv_local_customer_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sv_local_customer_runs USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));
CREATE POLICY tenant_isolation ON sv_local_customer_tasks USING(organization_id=current_setting('app.organization_id',true)) WITH CHECK(organization_id=current_setting('app.organization_id',true));

CREATE FUNCTION sv_local_customer_start_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE spec jsonb; n integer;
BEGIN
 IF NEW.actor_id IS DISTINCT FROM current_setting('app.user_id',true)
 OR NOT EXISTS(SELECT 1 FROM member WHERE organization_id=NEW.organization_id AND user_id=NEW.actor_id AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_ORDER_MEMBER_REQUIRED'; END IF;
 SELECT l.snapshot INTO spec FROM sv_orders o
 JOIN sv_quotes q ON q.id=o.quote_id AND q.lock_id=o.lock_id AND q.organization_id=o.organization_id
 JOIN sv_configuration_locks l ON l.id=o.lock_id AND l.organization_id=o.organization_id
 WHERE o.id=NEW.order_id AND o.organization_id=NEW.organization_id AND o.status='PAID_REVIEW_REQUIRED'
 AND q.price_amount=49 AND q.currency='USD'
 AND EXISTS(SELECT 1 FROM sv_payments p WHERE p.order_id=o.id AND p.organization_id=o.organization_id AND p.provider='test' AND p.status='SUCCEEDED' AND p.amount=49 AND p.currency='USD');
 IF spec IS NULL OR spec IS DISTINCT FROM NEW.snapshot_canonical::jsonb
 OR spec->>'domainId' IS DISTINCT FROM 'LOCAL_MAPS_ORDER' OR spec->>'paymentMode' IS DISTINCT FROM 'TEST'
 OR spec#>>'{providerPolicy,mode}' IS DISTINCT FROM 'FIXTURE'
 OR (spec#>>'{providerPolicy,perAttemptWorstCaseUsd}')::numeric IS DISTINCT FROM 0
 OR (spec->>'worstCaseProviderCostUsd')::numeric IS DISTINCT FROM 0
 OR NEW.expected_slots IS DISTINCT FROM (spec->>'expectedSlots')::integer
 OR NEW.status<>'QUEUED' THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_PAID_FIXTURE_REQUIRED'; END IF;
 INSERT INTO sv_local_customer_tasks(order_id,organization_id,query_index,point_index,keyword,latitude,longitude)
 SELECT NEW.order_id,NEW.organization_id,(q.i-1)::int,(p.v->>'pointIndex')::int,q.v#>>'{}',(p.v->>'latitude')::numeric,(p.v->>'longitude')::numeric
 FROM jsonb_array_elements(spec->'queries') WITH ORDINALITY q(v,i),jsonb_array_elements(spec#>'{grid,points}') p(v);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>NEW.expected_slots THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_CARDINALITY_INVALID'; END IF;
 RETURN NEW;
END; $$;
-- After insert, the run exists for the tasks' foreign key; any failure rolls back everything.
CREATE TRIGGER sv_local_customer_start_guard AFTER INSERT ON sv_local_customer_runs FOR EACH ROW EXECUTE FUNCTION sv_local_customer_start_guard();

CREATE FUNCTION sv_local_customer_task_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE spec jsonb;
BEGIN
 SELECT snapshot_canonical::jsonb INTO spec FROM sv_local_customer_runs WHERE order_id=NEW.order_id AND organization_id=NEW.organization_id AND status='QUEUED';
 IF spec IS NULL OR NEW.status<>'PENDING' OR NEW.result_json IS NOT NULL
 OR spec->'queries'->>NEW.query_index IS DISTINCT FROM NEW.keyword
 OR (spec#>'{grid,points}'->NEW.point_index->>'pointIndex')::integer IS DISTINCT FROM NEW.point_index
 OR (spec#>'{grid,points}'->NEW.point_index->>'latitude')::numeric IS DISTINCT FROM NEW.latitude
 OR (spec#>'{grid,points}'->NEW.point_index->>'longitude')::numeric IS DISTINCT FROM NEW.longitude
 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_SLOT_INVALID'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_customer_task_insert_guard BEFORE INSERT ON sv_local_customer_tasks FOR EACH ROW EXECUTE FUNCTION sv_local_customer_task_insert_guard();

CREATE FUNCTION sv_local_customer_task_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_user<>pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=TG_RELID)) THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_WORKER_REQUIRED'; END IF;
 IF TG_OP<>'UPDATE' OR OLD.status='DONE' OR
 (to_jsonb(NEW)-ARRAY['status','result_json']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','result_json'])
 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_TASK_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_customer_task_immutable BEFORE UPDATE OR DELETE ON sv_local_customer_tasks FOR EACH ROW EXECUTE FUNCTION sv_local_customer_task_immutable();
CREATE TRIGGER sv_local_customer_task_no_truncate BEFORE TRUNCATE ON sv_local_customer_tasks FOR EACH STATEMENT EXECUTE FUNCTION sv_local_external_immutable();
CREATE FUNCTION sv_local_customer_run_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_user<>pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=TG_RELID)) THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_WORKER_REQUIRED'; END IF;
 IF TG_OP<>'UPDATE' OR OLD.status IN ('READY','CANCELLED') OR
 (to_jsonb(NEW)-ARRAY['status','finished_at','failure_count']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','finished_at','failure_count'])
 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_RUN_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER sv_local_customer_run_guard BEFORE UPDATE OR DELETE ON sv_local_customer_runs FOR EACH ROW EXECUTE FUNCTION sv_local_customer_run_guard();
CREATE TRIGGER sv_local_customer_run_no_truncate BEFORE TRUNCATE ON sv_local_customer_runs FOR EACH STATEMENT EXECUTE FUNCTION sv_local_external_immutable();

-- Internal worker operation: one previously authorized fixture query, no tenant data returned.
CREATE FUNCTION sv_process_local_customer_fixture_query() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE chosen uuid; tenant text; query_no integer; n integer;
BEGIN
 SELECT r.order_id,r.organization_id INTO chosen,tenant FROM sv_local_customer_runs r JOIN sv_orders o ON o.id=r.order_id AND o.organization_id=r.organization_id
 WHERE r.status IN ('QUEUED','RUNNING') AND o.status IN ('QUEUED','RUNNING')
 ORDER BY r.created_at,r.order_id FOR UPDATE OF r,o SKIP LOCKED LIMIT 1;
 IF chosen IS NULL THEN RETURN 0; END IF;
 BEGIN
 SELECT min(query_index) INTO query_no FROM sv_local_customer_tasks WHERE order_id=chosen AND status='PENDING';
 IF query_no IS NULL THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_PENDING_TASKS_MISSING'; END IF;
 UPDATE sv_local_customer_tasks SET status='DONE',result_json=jsonb_build_object(
  'source','FIXTURE_NOT_GOOGLE','keyword',keyword,'pointIndex',point_index,'latitude',latitude,'longitude',longitude,
  'outcome',CASE WHEN point_index%5=4 THEN 'ABSENT_WITHIN_DEPTH' ELSE 'FOUND' END,
  'targetRank',CASE WHEN point_index%5=4 THEN NULL ELSE 1+point_index%5 END,
  'generatedAt',clock_timestamp(),'externalProviderCalls',0,'providerCostUsd','0.000000')
 WHERE order_id=chosen AND query_index=query_no AND status='PENDING';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF NOT EXISTS(SELECT 1 FROM sv_local_customer_tasks WHERE order_id=chosen AND status='PENDING') THEN
  UPDATE sv_local_customer_runs SET status='READY',finished_at=clock_timestamp() WHERE order_id=chosen;
  UPDATE sv_orders SET status='READY',updated_at=clock_timestamp() WHERE id=chosen AND organization_id=tenant;
 ELSE
  UPDATE sv_local_customer_runs SET status='RUNNING' WHERE order_id=chosen;
  UPDATE sv_orders SET status='RUNNING',updated_at=clock_timestamp() WHERE id=chosen AND organization_id=tenant;
 END IF;
 RETURN n;
 EXCEPTION WHEN query_canceled THEN
  UPDATE sv_local_customer_runs SET status='FAILED',failure_count=failure_count+1 WHERE order_id=chosen;
  UPDATE sv_orders SET status='PARTIAL_FAILURE',updated_at=clock_timestamp() WHERE id=chosen AND organization_id=tenant;
  RETURN -1;
 WHEN OTHERS THEN
  UPDATE sv_local_customer_runs SET status='FAILED',failure_count=failure_count+1 WHERE order_id=chosen;
  UPDATE sv_orders SET status='PARTIAL_FAILURE',updated_at=clock_timestamp() WHERE id=chosen AND organization_id=tenant;
  RETURN -1;
 END;
END; $$;
CREATE FUNCTION sv_resume_local_customer_fixture_run(target_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tenant text := current_setting('app.organization_id',true); n integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM member WHERE organization_id=tenant AND user_id=current_setting('app.user_id',true) AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'LOCAL_ORDER_MEMBER_REQUIRED'; END IF;
 UPDATE sv_local_customer_runs SET status='QUEUED' WHERE order_id=target_order AND organization_id=tenant AND status='FAILED' AND failure_count<3;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_RETRY_LIMIT_OR_STATE_CONFLICT'; END IF;
 UPDATE sv_orders SET status='QUEUED',updated_at=clock_timestamp() WHERE id=target_order AND organization_id=tenant AND status='PARTIAL_FAILURE';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 OR NOT EXISTS(SELECT 1 FROM sv_payments WHERE order_id=target_order AND organization_id=tenant AND provider='test' AND status='SUCCEEDED' AND amount=49 AND currency='USD')
 THEN RAISE EXCEPTION 'LOCAL_CUSTOMER_RETRY_PAYMENT_CONFLICT'; END IF;
END; $$;
REVOKE ALL ON FUNCTION sv_local_customer_start_guard(),sv_local_customer_task_insert_guard(),sv_local_customer_task_immutable(),sv_local_customer_run_guard(),sv_process_local_customer_fixture_query() FROM PUBLIC;
REVOKE ALL ON FUNCTION sv_resume_local_customer_fixture_run(uuid) FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selena_app') THEN
  GRANT SELECT,INSERT ON sv_local_customer_runs,sv_local_customer_tasks TO selena_app;
  GRANT EXECUTE ON FUNCTION sv_process_local_customer_fixture_query() TO selena_app;
  GRANT EXECUTE ON FUNCTION sv_resume_local_customer_fixture_run(uuid) TO selena_app;
 END IF;
END $$;
