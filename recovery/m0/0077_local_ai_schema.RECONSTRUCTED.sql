-- 0077_local_ai_schema.sql — RECONSTRUCTED, NOT THE ORIGINAL FILE.
--
-- The original migration (drizzle hash 8c53ec711a96d452c362aa762f294b83e2637aea6b246e66d92a86a889f3e3c9,
-- journal created_at 1787940034000) was applied to staging on 2026-09-16 by the local-ai-migrate
-- deployment 69abc500 from an unrecorded source tree (0ab842432b0205eba5a6dead6e745312f1dcacc8).
-- The file itself was not recovered.
--
-- Method: migrations 0000-0076 (the exact files staging applied, incl. the pre-edit versions of
-- 0045 and 0060) were replayed into an empty database; its catalog was compared with a
-- pg_dump --schema-only of staging taken 2026-09-25. The objects below are exactly the difference,
-- excluding objects that come from scripts/selena-rls-runtime-role.sql.
-- Applying this file to the replay makes the catalogs identical (apart from that script and
-- PG16/PG18 formatting). Statement order, comments and any data statements of the original are lost.
-- Its sha256 does NOT equal the journal hash; drizzle must not treat it as the original.
-- UNKNOWN: whether the GRANT/column ACL statements to selena_app were in the original migration
-- or were run separately.

SET check_function_bodies = false;

--
-- Name: sv_local_ai_evidence_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_ai_evidence_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE spec jsonb; slot sv_local_ai_slots; point jsonb; prompt jsonb;
BEGIN
 IF TG_OP='UPDATE' THEN
 IF OLD.raw_body IS NOT NULL AND NEW.raw_body IS NULL AND NEW.raw_canonical IS NULL AND NEW.expired_at IS NOT NULL AND OLD.expires_at<=clock_timestamp()
 AND (to_jsonb(NEW)-ARRAY['raw_body','raw_canonical','expired_at'])=(to_jsonb(OLD)-ARRAY['raw_body','raw_canonical','expired_at']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'LOCAL_AI_EVIDENCE_IMMUTABLE';
 END IF;
 SELECT * INTO slot FROM sv_local_ai_slots WHERE id=NEW.slot_id AND organization_id=NEW.organization_id;
 SELECT lock_json INTO spec FROM sv_local_ai_orders WHERE id=slot.order_id AND organization_id=NEW.organization_id;
 IF spec IS NULL OR NOT EXISTS(SELECT 1 FROM sv_local_ai_payments WHERE order_id=slot.order_id AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'LOCAL_AI_TEST_PAYMENT_REQUIRED'; END IF;
 IF NEW.expired_at IS NOT NULL THEN RAISE EXCEPTION 'LOCAL_AI_EVIDENCE_INVALID'; END IF;
 IF NEW.result_json->>'validity'='VALID' THEN
 SELECT p INTO point FROM jsonb_array_elements(spec#>'{grid,points}') p WHERE p->>'id'=slot.point_id::text;
 SELECT p INTO prompt FROM jsonb_array_elements(spec#>'{promptSet,prompts}') p WHERE p->>'id'=slot.prompt_id::text;
 IF NEW.raw_body IS NULL OR NEW.raw_sha256 IS NULL OR NEW.raw_canonical IS NULL
 OR NEW.raw_body->>'provenance' IS DISTINCT FROM 'FIXTURE_NOT_REAL_AI'
 OR NEW.raw_body#>>'{proof,method}' IS DISTINCT FROM spec->>'coordinateProofMethod'
 OR NEW.raw_body#>>'{proof,precision}' IS DISTINCT FROM 'POINT' OR NEW.raw_body#>>'{proof,applied}' IS DISTINCT FROM 'true'
 OR NEW.raw_body#>>'{proof,pointId}' IS DISTINCT FROM slot.point_id::text
 OR NEW.raw_body#>>'{proof,taskId}' IS DISTINCT FROM 'fixture:'||slot.id::text
 OR NEW.raw_body#>>'{proof,latitude}' IS DISTINCT FROM point->>'latitude' OR NEW.raw_body#>>'{proof,longitude}' IS DISTINCT FROM point->>'longitude'
 OR NEW.raw_body#>>'{request,latitude}' IS DISTINCT FROM point->>'latitude' OR NEW.raw_body#>>'{request,longitude}' IS DISTINCT FROM point->>'longitude'
 OR NEW.raw_body->>'pointId' IS DISTINCT FROM slot.point_id::text OR NEW.raw_body->>'promptId' IS DISTINCT FROM slot.prompt_id::text
 OR NEW.raw_body->>'promptText' IS DISTINCT FROM prompt->>'text' OR NEW.raw_body->>'systemId' IS DISTINCT FROM slot.system_id
 OR NEW.raw_body->>'repeat' IS DISTINCT FROM slot.repeat_index::text OR coalesce(length(NEW.raw_body->>'answer'),0)=0
 OR NEW.raw_body->'mention' IS DISTINCT FROM NEW.result_json->'mention'
 OR NEW.raw_body->'recommendationPosition' IS DISTINCT FROM NEW.result_json->'recommendationPosition'
 OR NEW.raw_body->'citations' IS DISTINCT FROM NEW.result_json->'citations'
 OR NEW.raw_body->'competitors' IS DISTINCT FROM NEW.result_json->'competitors'
 THEN RAISE EXCEPTION 'LOCAL_AI_COORDINATE_PROOF_FAILED'; END IF;
 END IF;
 RETURN NEW;
END; $$;
--
-- Name: sv_local_ai_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_ai_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN RAISE EXCEPTION 'LOCAL_AI_IMMUTABLE'; END; $$;
--
-- Name: sv_local_ai_scope_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sv_local_ai_scope_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE spec jsonb; count_slots integer;
BEGIN
 SELECT lock_json INTO spec FROM sv_local_ai_orders WHERE id=NEW.order_id AND organization_id=NEW.organization_id FOR UPDATE;
 IF spec IS NULL THEN RAISE EXCEPTION 'LOCAL_AI_ORDER_NOT_FOUND'; END IF;
 SELECT count(*) INTO count_slots FROM sv_local_ai_slots WHERE order_id=NEW.order_id;
 IF count_slots >= (spec->>'expectedCardinality')::integer OR NEW.ordinal<0 OR NEW.ordinal >= (spec->>'expectedCardinality')::integer
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(spec#>'{grid,points}') p WHERE p->>'id'=NEW.point_id::text)
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(spec#>'{promptSet,prompts}') p WHERE p->>'id'=NEW.prompt_id::text)
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(spec->'systems') s WHERE s->>'id'=NEW.system_id AND s->>'id' IN ('fixture-visitor-v1','fixture-api-v1'))
 OR NEW.repeat_index<0 OR NEW.repeat_index >= (spec->>'repeats')::integer
 THEN RAISE EXCEPTION 'LOCAL_AI_CARDINALITY_OR_SCOPE_INVALID'; END IF;
 RETURN NEW;
END; $$;
--
-- Name: sv_local_ai_cost_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_cost_events (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    slot_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    domain_id text NOT NULL,
    amount_usd numeric NOT NULL,
    cost_type text NOT NULL,
    state text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_ai_cost_events_amount_usd_check CHECK ((amount_usd = (0)::numeric)),
    CONSTRAINT sv_local_ai_cost_events_cost_type_check CHECK ((cost_type = 'FIXTURE_ZERO'::text)),
    CONSTRAINT sv_local_ai_cost_events_domain_id_check CHECK ((domain_id = 'LOCAL_AI'::text)),
    CONSTRAINT sv_local_ai_cost_events_state_check CHECK ((state = ANY (ARRAY['SETTLED'::text, 'UNKNOWN_NO_SPEND'::text])))
);

ALTER TABLE ONLY public.sv_local_ai_cost_events FORCE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    order_id uuid NOT NULL,
    kind text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_ai_events_kind_check CHECK ((kind = ANY (ARRAY['LOCKED'::text, 'TEST_PAID'::text, 'BATCH_COMPLETED'::text, 'PARTIAL_UNKNOWN'::text, 'RETENTION_EXPIRED'::text])))
);

ALTER TABLE ONLY public.sv_local_ai_events FORCE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_evidence (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    slot_id uuid NOT NULL,
    raw_body jsonb,
    raw_sha256 text,
    raw_canonical text,
    result_json jsonb NOT NULL,
    captured_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    expired_at timestamp with time zone,
    CONSTRAINT sv_local_ai_evidence_check CHECK ((expires_at > captured_at)),
    CONSTRAINT sv_local_ai_evidence_check1 CHECK ((((raw_body IS NULL) AND (raw_canonical IS NULL)) OR (((raw_canonical)::jsonb = raw_body) AND (raw_sha256 = ('sha256:'::text || encode(sha256(convert_to(raw_canonical, 'UTF8'::name)), 'hex'::text)))))),
    CONSTRAINT sv_local_ai_evidence_result_json_check CHECK (((result_json ->> 'validity'::text) = ANY (ARRAY['VALID'::text, 'INVALID'::text, 'UNKNOWN'::text]))),
    CONSTRAINT sv_local_ai_evidence_result_json_check1 CHECK ((((result_json ->> 'validity'::text) = 'VALID'::text) OR (((result_json -> 'mention'::text) = 'null'::jsonb) AND ((result_json -> 'recommendationPosition'::text) = 'null'::jsonb))))
);

ALTER TABLE ONLY public.sv_local_ai_evidence FORCE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_orders (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    project_id uuid NOT NULL,
    location_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    lock_json jsonb NOT NULL,
    lock_canonical text NOT NULL,
    lock_sha256 text NOT NULL,
    expected integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_ai_orders_check CHECK (((lock_canonical)::jsonb = lock_json)),
    CONSTRAINT sv_local_ai_orders_check1 CHECK ((lock_sha256 = ('sha256:'::text || encode(sha256(convert_to(lock_canonical, 'UTF8'::name)), 'hex'::text)))),
    CONSTRAINT sv_local_ai_orders_check2 CHECK ((((lock_json ->> 'organizationId'::text) = organization_id) AND ((lock_json ->> 'projectId'::text) = (project_id)::text) AND ((lock_json ->> 'locationId'::text) = (location_id)::text))),
    CONSTRAINT sv_local_ai_orders_check3 CHECK (((expected = ((lock_json ->> 'expectedCardinality'::text))::integer) AND (expected = (((jsonb_array_length((lock_json #> '{grid,points}'::text[])) * jsonb_array_length((lock_json #> '{promptSet,prompts}'::text[]))) * jsonb_array_length((lock_json -> 'systems'::text))) * ((lock_json ->> 'repeats'::text))::integer)))),
    CONSTRAINT sv_local_ai_orders_expected_check CHECK (((expected >= 1) AND (expected <= 300))),
    CONSTRAINT sv_local_ai_orders_lock_json_check CHECK ((((lock_json ->> 'domainId'::text) = 'LOCAL_AI'::text) AND ((lock_json ->> 'executionMode'::text) = 'FIXTURE'::text))),
    CONSTRAINT sv_local_ai_orders_lock_json_check1 CHECK ((((lock_json #>> '{budget,capUsd}'::text[]) = '0'::text) AND ((lock_json #>> '{budget,reserveUsd}'::text[]) = '0'::text) AND ((lock_json #>> '{budget,maxRealProviderCalls}'::text[]) = '0'::text))),
    CONSTRAINT sv_local_ai_orders_lock_json_check2 CHECK ((((lock_json #>> '{quote,amountUsd}'::text[]) = '0'::text) AND ((lock_json #>> '{quote,paymentMode}'::text[]) = 'TEST'::text)))
);

ALTER TABLE ONLY public.sv_local_ai_orders FORCE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_payments (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    order_id uuid NOT NULL,
    event_id uuid NOT NULL,
    amount_usd numeric NOT NULL,
    currency text NOT NULL,
    mode text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sv_local_ai_payments_amount_usd_check CHECK ((amount_usd = (0)::numeric)),
    CONSTRAINT sv_local_ai_payments_currency_check CHECK ((currency = 'USD'::text)),
    CONSTRAINT sv_local_ai_payments_mode_check CHECK ((mode = 'TEST'::text)),
    CONSTRAINT sv_local_ai_payments_status_check CHECK ((status = 'SUCCEEDED'::text))
);

ALTER TABLE ONLY public.sv_local_ai_payments FORCE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sv_local_ai_slots (
    id uuid NOT NULL,
    organization_id text NOT NULL,
    order_id uuid NOT NULL,
    point_id uuid NOT NULL,
    prompt_id uuid NOT NULL,
    system_id text NOT NULL,
    repeat_index integer NOT NULL,
    ordinal integer NOT NULL
);

ALTER TABLE ONLY public.sv_local_ai_slots FORCE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_cost_events sv_local_ai_cost_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_cost_events
    ADD CONSTRAINT sv_local_ai_cost_events_pkey PRIMARY KEY (id);
--
-- Name: sv_local_ai_cost_events sv_local_ai_cost_events_slot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_cost_events
    ADD CONSTRAINT sv_local_ai_cost_events_slot_id_key UNIQUE (slot_id);
--
-- Name: sv_local_ai_events sv_local_ai_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_events
    ADD CONSTRAINT sv_local_ai_events_pkey PRIMARY KEY (id);
--
-- Name: sv_local_ai_evidence sv_local_ai_evidence_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_evidence
    ADD CONSTRAINT sv_local_ai_evidence_id_organization_id_key UNIQUE (id, organization_id);
--
-- Name: sv_local_ai_evidence sv_local_ai_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_evidence
    ADD CONSTRAINT sv_local_ai_evidence_pkey PRIMARY KEY (id);
--
-- Name: sv_local_ai_evidence sv_local_ai_evidence_slot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_evidence
    ADD CONSTRAINT sv_local_ai_evidence_slot_id_key UNIQUE (slot_id);
--
-- Name: sv_local_ai_orders sv_local_ai_orders_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_id_organization_id_key UNIQUE (id, organization_id);
--
-- Name: sv_local_ai_orders sv_local_ai_orders_organization_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_organization_id_idempotency_key_key UNIQUE (organization_id, idempotency_key);
--
-- Name: sv_local_ai_orders sv_local_ai_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_pkey PRIMARY KEY (id);
--
-- Name: sv_local_ai_payments sv_local_ai_payments_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_payments
    ADD CONSTRAINT sv_local_ai_payments_order_id_key UNIQUE (order_id);
--
-- Name: sv_local_ai_payments sv_local_ai_payments_organization_id_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_payments
    ADD CONSTRAINT sv_local_ai_payments_organization_id_event_id_key UNIQUE (organization_id, event_id);
--
-- Name: sv_local_ai_payments sv_local_ai_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_payments
    ADD CONSTRAINT sv_local_ai_payments_pkey PRIMARY KEY (id);
--
-- Name: sv_local_ai_slots sv_local_ai_slots_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_id_organization_id_key UNIQUE (id, organization_id);
--
-- Name: sv_local_ai_slots sv_local_ai_slots_order_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_order_id_ordinal_key UNIQUE (order_id, ordinal);
--
-- Name: sv_local_ai_slots sv_local_ai_slots_order_id_point_id_prompt_id_system_id_rep_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_order_id_point_id_prompt_id_system_id_rep_key UNIQUE (order_id, point_id, prompt_id, system_id, repeat_index);
--
-- Name: sv_local_ai_slots sv_local_ai_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_pkey PRIMARY KEY (id);
--
-- Name: sv_local_ai_evidence local_ai_evidence_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_evidence_delete BEFORE DELETE ON public.sv_local_ai_evidence FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_evidence local_ai_evidence_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_evidence_guard BEFORE INSERT OR UPDATE ON public.sv_local_ai_evidence FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_evidence_guard();
--
-- Name: sv_local_ai_cost_events local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_cost_events FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_events local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_events FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_orders local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_orders FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_payments local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_payments FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_slots local_ai_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_immutable BEFORE DELETE OR UPDATE ON public.sv_local_ai_slots FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_cost_events local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_cost_events FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_events local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_events FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_evidence local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_evidence FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_orders local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_orders FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_payments local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_payments FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_slots local_ai_no_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_no_truncate BEFORE TRUNCATE ON public.sv_local_ai_slots FOR EACH STATEMENT EXECUTE FUNCTION public.sv_local_ai_immutable();
--
-- Name: sv_local_ai_slots local_ai_slot_scope; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER local_ai_slot_scope BEFORE INSERT ON public.sv_local_ai_slots FOR EACH ROW EXECUTE FUNCTION public.sv_local_ai_scope_guard();
--
-- Name: sv_local_ai_cost_events sv_local_ai_cost_events_evidence_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_cost_events
    ADD CONSTRAINT sv_local_ai_cost_events_evidence_id_organization_id_fkey FOREIGN KEY (evidence_id, organization_id) REFERENCES public.sv_local_ai_evidence(id, organization_id);
--
-- Name: sv_local_ai_cost_events sv_local_ai_cost_events_slot_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_cost_events
    ADD CONSTRAINT sv_local_ai_cost_events_slot_id_organization_id_fkey FOREIGN KEY (slot_id, organization_id) REFERENCES public.sv_local_ai_slots(id, organization_id);
--
-- Name: sv_local_ai_events sv_local_ai_events_order_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_events
    ADD CONSTRAINT sv_local_ai_events_order_id_organization_id_fkey FOREIGN KEY (order_id, organization_id) REFERENCES public.sv_local_ai_orders(id, organization_id);
--
-- Name: sv_local_ai_evidence sv_local_ai_evidence_slot_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_evidence
    ADD CONSTRAINT sv_local_ai_evidence_slot_id_organization_id_fkey FOREIGN KEY (slot_id, organization_id) REFERENCES public.sv_local_ai_slots(id, organization_id);
--
-- Name: sv_local_ai_orders sv_local_ai_orders_location_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_location_id_organization_id_fkey FOREIGN KEY (location_id, organization_id) REFERENCES public.sv_business_locations(id, organization_id);
--
-- Name: sv_local_ai_orders sv_local_ai_orders_project_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_orders
    ADD CONSTRAINT sv_local_ai_orders_project_id_organization_id_fkey FOREIGN KEY (project_id, organization_id) REFERENCES public.sv_projects(id, organization_id);
--
-- Name: sv_local_ai_payments sv_local_ai_payments_order_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_payments
    ADD CONSTRAINT sv_local_ai_payments_order_id_organization_id_fkey FOREIGN KEY (order_id, organization_id) REFERENCES public.sv_local_ai_orders(id, organization_id);
--
-- Name: sv_local_ai_slots sv_local_ai_slots_order_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sv_local_ai_slots
    ADD CONSTRAINT sv_local_ai_slots_order_id_organization_id_fkey FOREIGN KEY (order_id, organization_id) REFERENCES public.sv_local_ai_orders(id, organization_id);
--
-- Name: sv_local_ai_cost_events local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_cost_events USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));
--
-- Name: sv_local_ai_events local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_events USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));
--
-- Name: sv_local_ai_evidence local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_evidence USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));
--
-- Name: sv_local_ai_orders local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_orders USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));
--
-- Name: sv_local_ai_payments local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_payments USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));
--
-- Name: sv_local_ai_slots local_ai_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY local_ai_tenant ON public.sv_local_ai_slots USING ((organization_id = current_setting('app.organization_id'::text, true))) WITH CHECK ((organization_id = current_setting('app.organization_id'::text, true)));
--
-- Name: sv_local_ai_cost_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_cost_events ENABLE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_events ENABLE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_evidence ENABLE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_orders ENABLE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_payments ENABLE ROW LEVEL SECURITY;
--
-- Name: sv_local_ai_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sv_local_ai_slots ENABLE ROW LEVEL SECURITY;
--
-- Name: TABLE sv_local_ai_cost_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_cost_events TO selena_app;
--
-- Name: TABLE sv_local_ai_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_events TO selena_app;
--
-- Name: TABLE sv_local_ai_evidence; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_evidence TO selena_app;
--
-- Name: COLUMN sv_local_ai_evidence.raw_body; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(raw_body) ON TABLE public.sv_local_ai_evidence TO selena_app;
--
-- Name: COLUMN sv_local_ai_evidence.raw_canonical; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(raw_canonical) ON TABLE public.sv_local_ai_evidence TO selena_app;
--
-- Name: COLUMN sv_local_ai_evidence.expired_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(expired_at) ON TABLE public.sv_local_ai_evidence TO selena_app;
--
-- Name: TABLE sv_local_ai_orders; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_orders TO selena_app;
--
-- Name: COLUMN sv_local_ai_orders.id; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(id) ON TABLE public.sv_local_ai_orders TO selena_app;
--
-- Name: TABLE sv_local_ai_payments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_payments TO selena_app;
--
-- Name: TABLE sv_local_ai_slots; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.sv_local_ai_slots TO selena_app;
--
-- Name: COLUMN sv_local_ai_slots.id; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(id) ON TABLE public.sv_local_ai_slots TO selena_app;
