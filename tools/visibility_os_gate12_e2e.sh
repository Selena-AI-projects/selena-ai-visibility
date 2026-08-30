#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
. "$repo_root/tools/visibility_os_compose_command.sh"
compose_file="${1:-$repo_root/tools/visibility_os_disposable_postgres.compose.yml}"
compose_project="${SELENA_VISIBILITY_COMPOSE_PROJECT:-}"
if [[ ! "$compose_project" =~ ^selena-visibility-rehearsal-[a-z0-9][a-z0-9_-]+$ ]]; then
	printf 'BLOCKED_SCOPE: SELENA_VISIBILITY_COMPOSE_PROJECT must name an isolated rehearsal project.\n' >&2
	exit 2
fi
database_url="${DATABASE_URL:-postgres://selena_test:selena_test@127.0.0.1:55432/selena_visibility_test}"
psql=("${compose_cli[@]}" -p "$compose_project" -f "$compose_file" exec -T postgres psql -U selena_test -d selena_visibility_test -v ON_ERROR_STOP=1)
fresh_database=false

if [[ "$("${psql[@]}" -Atc "SELECT to_regclass('public.organization')")" != "organization" ]]; then
	for migration in "$repo_root"/packages/lib/src/db/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
		migration_name="$(basename "$migration")"
		migration_number="${migration_name%%_*}"
		if ((10#$migration_number > 36)); then
			continue
		fi
		"${psql[@]}" --single-transaction < "$migration" >/dev/null
	done
	fresh_database=true
fi

if [[ "$fresh_database" == true ]]; then
	bash "$repo_root/tools/visibility_os_m1_registry_e2e.sh" "$compose_file" >/dev/null
	bash "$repo_root/tools/visibility_os_m6_outcome_e2e.sh" "$compose_file" >/dev/null
	for migration in \
		"$repo_root/packages/lib/src/db/migrations/0043_visibility_os_local_domain_attempts_expand.sql" \
		"$repo_root/packages/lib/src/db/migrations/0044_visibility_os_local_live_persistence.sql" \
		"$repo_root/packages/lib/src/db/migrations/0045_visibility_os_domain_and_lock_hardening.sql" \
		"$repo_root/packages/lib/src/db/migrations/0046_selena_journal_daily_claims.sql" \
		"$repo_root/packages/lib/src/db/migrations/0047_visibility_os_local_attempt_count_cap.sql" \
		"$repo_root/packages/lib/src/db/migrations/0048_selena_api_idempotency_records.sql" \
		"$repo_root/packages/lib/src/db/migrations/0049_visibility_os_claimed_submit_lease.sql" \
		"$repo_root/packages/lib/src/db/migrations/0050_visibility_os_jsonb_text_operator_casts.sql"; do
		"${psql[@]}" --single-transaction < "$migration" >/dev/null
	done
fi

if [[ "$("${psql[@]}" -Atc "SELECT to_regclass('public.sv_journal_daily_claims') IS NOT NULL AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'sv_journal_daily_claims'::regclass) AND EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'sv_journal_daily_claims'::regclass AND polname = 'tenant_isolation') AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('sv_journal_daily_claims_project_organization_fk', 'sv_journal_daily_claims_lock_project_org_fk', 'sv_journal_daily_claims_utc_day_check') AND convalidated GROUP BY convalidated HAVING count(*) = 3) AND EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'sv_journal_daily_claims' AND indexname = 'sv_journal_daily_claims_unresolved_unique' AND indexdef LIKE '%WHERE%') AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'sv_journal_daily_claims'::regclass AND tgname IN ('sv_guard_journal_daily_claim_mutation', 'sv_prevent_journal_daily_claim_truncate') AND tgenabled = 'O' GROUP BY tgenabled HAVING count(*) = 2) AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'sv_local_rank_observations'::regclass AND conname = 'sv_local_rank_observations_attempt_count_cap_check' AND convalidated) AND to_regclass('public.sv_api_idempotency_records') IS NOT NULL AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'sv_api_idempotency_records'::regclass) AND EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'sv_api_idempotency_records'::regclass AND polname = 'tenant_isolation') AND EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'sv_api_idempotency_records' AND indexname = 'sv_api_idempotency_identity_unique') AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'sv_api_idempotency_records'::regclass AND conname IN ('sv_api_idempotency_body_hash_check', 'sv_api_idempotency_response_status_check', 'sv_api_idempotency_expiry_check') AND convalidated GROUP BY convalidated HAVING count(*) = 3) AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'sv_api_idempotency_records'::regclass AND tgname IN ('sv_guard_api_idempotency_mutation', 'sv_prevent_api_idempotency_truncate') AND tgenabled = 'O' GROUP BY tgenabled HAVING count(*) = 2)")" != "t" ]]; then
	echo "Gate 12 requires the complete numbered migration chain through 0049" >&2
	exit 1
fi

if [[ "$("${psql[@]}" -Atc "SELECT pg_get_functiondef('sv_guard_measurement_attempt_mutation()'::regprocedure) LIKE '%NEW.\"status\" = ''SUBMITTED''%' AND pg_get_functiondef('sv_guard_measurement_attempt_mutation()'::regprocedure) LIKE '%MEASUREMENT_ATTEMPT_CLAIM_EXPIRED%' AND pg_get_functiondef('sv_guard_measurement_attempt_mutation()'::regprocedure) LIKE '%OLD.\"lease_expires_at\" > now()%' AND pg_get_functiondef('sv_guard_measurement_attempt_mutation()'::regprocedure) LIKE '%NEW.\"lease_expires_at\" > OLD.\"lease_expires_at\"%'")" != "t" ]]; then
	echo "Gate 12 requires the 0049 CLAIMED to SUBMITTED lease guard" >&2
	exit 1
fi

"${psql[@]}" <<'SQL'
INSERT INTO organization (id, name, slug, created_at)
VALUES ('gate12-release', 'Gate 12 Release', 'gate12-release', now());

DO $$
<<gate12_seed>>
DECLARE
	org_id text := 'gate12-release';
	project_id uuid;
	entity_id uuid;
	location_id uuid;
	keyword_id uuid;
	grid_id uuid;
	grid_point_id uuid;
	lock_id uuid;
	quote_id uuid;
	order_id uuid;
	ai_cycle_id uuid;
	family_id uuid;
	scenario_id uuid;
	permit_id uuid;
	run_id uuid;
	baseline_domain_cycle_id uuid;
	baseline_measurement_cycle_id uuid;
	baseline_local_cycle_id uuid;
	baseline_dataset_id uuid;
	baseline_observation_id uuid;
	verification_domain_cycle_id uuid;
	verification_measurement_cycle_id uuid;
	verification_local_cycle_id uuid;
	verification_dataset_id uuid;
	verification_observation_id uuid;
	finding_id uuid;
	recommendation_id uuid;
	action_id uuid;
	change_event_id uuid;
	verification_cycle_id uuid;
	outcome_source_id uuid;
	outcome_measurement_cycle_id uuid;
	outcome_dataset_id uuid;
	baseline_outcome_id uuid;
	verification_outcome_id uuid;
	outcome_window_id uuid;
	assessment_id uuid;
	journal_claim_id uuid;
	journal_bad_lock_id uuid;
	journal_other_project_id uuid;
	journal_other_lock_id uuid;
	journal_lock_id uuid;
	journal_hold_id uuid;
	journal_hold_lock_id uuid;
	blocked boolean;
	local_cost_snapshot jsonb := '{"plannedCalls":1,"worstCaseCalls":1,"worstCaseCost":0}'::jsonb;
BEGIN
	INSERT INTO sv_projects (organization_id, name, category, country, region, languages, status)
	VALUES (org_id, 'Gate 12 Project', 'test', 'ID', 'Bali', ARRAY['en'], 'DRAFT')
	RETURNING id INTO project_id;

	INSERT INTO sv_entities (organization_id, project_id, entity_kind, confirmation_status, name)
	VALUES (org_id, project_id, 'LOCATION_BRAND', 'CLIENT_CONFIRMED', 'Gate 12 Location')
	RETURNING id INTO entity_id;
	INSERT INTO sv_business_locations (
		organization_id, entity_id, display_name, country_code, admin_area, locality,
		latitude, longitude, geo_precision, confirmation_status, local_profile, local_profile_confirmed_at
	)
	VALUES (
		org_id, entity_id, 'Gate 12 Location', 'ID', 'Bali', 'Ubud', -8.506900, 115.262500,
		'COORDINATE', 'CONFIRMED', '{"category":"test"}', '2026-08-01T00:00:00Z'
	)
	RETURNING id INTO location_id;

	INSERT INTO sv_local_keywords (organization_id, location_id, text, normalized_text, language, status)
	VALUES (org_id, location_id, 'gate 12 local query', 'gate 12 local query', 'en', 'APPROVED')
	RETURNING id INTO keyword_id;

	INSERT INTO sv_grid_definitions (
		organization_id, location_id, version, point_count, spacing_meters, shape, rows, columns,
		center_latitude, center_longitude, formula_version
	)
	VALUES (org_id, location_id, 1, 1, 400, 'SQUARE', 1, 1, -8.506900, 115.262500, 'square-grid/1')
	RETURNING id INTO grid_id;
	INSERT INTO sv_grid_points (organization_id, grid_id, point_index, latitude, longitude)
	VALUES (org_id, grid_id, 0, -8.506900, 115.262500)
	RETURNING id INTO grid_point_id;

	INSERT INTO sv_configuration_locks (
		organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	)
	VALUES (
		org_id, project_id, 1, jsonb_build_object('visibilityOs', jsonb_build_object('local', local_cost_snapshot)),
		'gate12-stub', 1, 0, 'gate12-stub'
	)
	RETURNING id INTO lock_id;

	INSERT INTO sv_quotes (
		organization_id, project_id, lock_id, status, price_amount, currency, expected_runs, expires_at
	)
	VALUES (org_id, project_id, lock_id, 'ISSUED', 0, 'USD', 1, '2026-08-02T00:00:00Z')
	RETURNING id INTO quote_id;
	INSERT INTO sv_orders (organization_id, project_id, quote_id, lock_id, status, order_cap)
	VALUES (org_id, project_id, quote_id, lock_id, 'APPROVED', 0)
	RETURNING id INTO order_id;

	INSERT INTO sv_prompt_families (organization_id, project_id, intent_type, source, status)
	VALUES (org_id, project_id, 'discovery', 'stub', 'APPROVED')
	RETURNING id INTO family_id;
	INSERT INTO sv_scenarios (organization_id, family_id, text, language, status)
	VALUES (org_id, family_id, 'What is the Gate 12 Brand?', 'en', 'APPROVED')
	RETURNING id INTO scenario_id;

	INSERT INTO sv_cycles (
		organization_id, order_id, lock_id, status, expected_runs, created_runs, completed_runs
	)
	VALUES (org_id, order_id, lock_id, 'READY', 1, 1, 1)
	RETURNING id INTO ai_cycle_id;
	INSERT INTO sv_measurement_cycles (
		id, organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
	)
	VALUES (ai_cycle_id, org_id, 'AI', ai_cycle_id, lock_id, 'COMPLETED');
	INSERT INTO sv_run_permits (
		organization_id, cycle_id, dispatch_key, channel, scenario_id, system_id, status, expires_at, consumed_at
	)
	VALUES (
		org_id, ai_cycle_id, 'gate12-ai-run', 'api_view', scenario_id::text, 'stub', 'consumed',
		'2026-08-02T00:00:00Z', '2026-08-01T01:00:00Z'
	)
	RETURNING id INTO permit_id;
	INSERT INTO sv_runs (
		organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status,
		validity, cost_usd, cost_basis, token_input, token_output, system, model, language, region,
		mention, position, owned_citation, citations, competitors, factual_errors, extractor_version,
		capture_mode, raw_response_reference, canonical_payload, started_at, finished_at
	)
	VALUES (
		org_id, ai_cycle_id, permit_id, 'gate12-ai-run', 'api_view', scenario_id::text, 'stub', 'completed',
		'VALID', 0, 'STUB', 0, 0, 'stub', 'stub-model', 'en', 'ID-Bali', true, 1, false,
		'[]', '[]', '[]', 'gate12/1', 'unknown', 'stub://gate12/answer', '{"source":"stub"}',
		'2026-08-01T01:00:00Z', '2026-08-01T01:00:01Z'
	)
	RETURNING id INTO run_id;
	INSERT INTO sv_cost_events (organization_id, cycle_id, domain_id, run_id, provider, amount_usd, basis, kind)
	VALUES (org_id, ai_cycle_id, 'AI', run_id, 'stub', 0, 'ACTUAL', 'measurement');

	baseline_domain_cycle_id := gen_random_uuid();
	INSERT INTO sv_measurement_cycles (
		organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
	)
	VALUES (org_id, 'LOCAL_MAPS', baseline_domain_cycle_id, lock_id, 'RUNNING')
	RETURNING id INTO baseline_measurement_cycle_id;
	INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
	VALUES (org_id, baseline_measurement_cycle_id, 'gate12-local', 1)
	RETURNING id INTO baseline_dataset_id;
	INSERT INTO sv_local_scan_cycles (
		id, organization_id, measurement_cycle_id, configuration_lock_id, location_id, grid_definition_id,
		provider, repeats, capture_depth, expected_observations, worst_case_cost_usd, cost_snapshot, status
	)
	VALUES (
		baseline_domain_cycle_id, org_id, baseline_measurement_cycle_id, lock_id, location_id, grid_id,
		'stub-local-rank', 1, 20, 1, 0, local_cost_snapshot, 'RUNNING'
	)
	RETURNING id INTO baseline_local_cycle_id;
	INSERT INTO sv_local_rank_observations (
		organization_id, cycle_id, location_id, keyword_id, grid_definition_id, grid_point_id,
		provider, repeat_index, validity, capture_depth, capture_mode, target_rank, raw_reference, captured_at
	)
	VALUES (
		org_id, baseline_local_cycle_id, location_id, keyword_id, grid_id, grid_point_id,
		'stub-local-rank', 0, 'VALID', 20, 'STUB', 5, 'stub://gate12/local/baseline', '2026-08-01T02:00:00Z'
	)
	RETURNING id INTO baseline_observation_id;
	UPDATE sv_local_scan_cycles SET status = 'READY' WHERE id = baseline_local_cycle_id;
	UPDATE sv_measurement_cycles SET status = 'COMPLETED' WHERE id = baseline_measurement_cycle_id;
	INSERT INTO sv_evidence_index (organization_id, domain_id, cycle_id, observation_ref, dataset_id, captured_at)
	VALUES (
		org_id, 'LOCAL_MAPS', baseline_measurement_cycle_id, baseline_observation_id::text,
		baseline_dataset_id, '2026-08-01T02:00:00Z'
	);

	verification_domain_cycle_id := gen_random_uuid();
	INSERT INTO sv_measurement_cycles (
		organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
	)
	VALUES (org_id, 'LOCAL_MAPS', verification_domain_cycle_id, lock_id, 'RUNNING')
	RETURNING id INTO verification_measurement_cycle_id;
	INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
	VALUES (org_id, verification_measurement_cycle_id, 'gate12-local', 2)
	RETURNING id INTO verification_dataset_id;
	INSERT INTO sv_local_scan_cycles (
		id, organization_id, measurement_cycle_id, configuration_lock_id, location_id, grid_definition_id,
		provider, repeats, capture_depth, expected_observations, worst_case_cost_usd, cost_snapshot, status
	)
	VALUES (
		verification_domain_cycle_id, org_id, verification_measurement_cycle_id, lock_id, location_id, grid_id,
		'stub-local-rank', 1, 20, 1, 0, local_cost_snapshot, 'RUNNING'
	)
	RETURNING id INTO verification_local_cycle_id;
	INSERT INTO sv_local_rank_observations (
		organization_id, cycle_id, location_id, keyword_id, grid_definition_id, grid_point_id,
		provider, repeat_index, validity, capture_depth, capture_mode, target_rank, raw_reference, captured_at
	)
	VALUES (
		org_id, verification_local_cycle_id, location_id, keyword_id, grid_id, grid_point_id,
		'stub-local-rank', 0, 'VALID', 20, 'STUB', 3, 'stub://gate12/local/verification', '2026-09-15T02:00:00Z'
	)
	RETURNING id INTO verification_observation_id;
	UPDATE sv_local_scan_cycles SET status = 'READY' WHERE id = verification_local_cycle_id;
	UPDATE sv_measurement_cycles SET status = 'COMPLETED' WHERE id = verification_measurement_cycle_id;
	INSERT INTO sv_evidence_index (organization_id, domain_id, cycle_id, observation_ref, dataset_id, captured_at)
	VALUES (
		org_id, 'LOCAL_MAPS', verification_measurement_cycle_id, verification_observation_id::text,
		verification_dataset_id, '2026-09-15T02:00:00Z'
	);

	INSERT INTO sv_findings (
		organization_id, cycle_id, domain_id, location_id, severity, category, title, detail
	)
	VALUES (
		org_id, ai_cycle_id, 'LOCAL_MAPS', location_id, 'high', 'visibility',
		'Gate 12 stub finding', 'Deterministic finding from stub Local observations'
	)
	RETURNING id INTO finding_id;
	INSERT INTO sv_recommendations (
		organization_id, cycle_id, finding_id, domain_id, location_id, priority, title, action, rationale
	)
	VALUES (
		org_id, ai_cycle_id, finding_id, 'LOCAL_MAPS', location_id, 'high', 'Gate 12 stub recommendation',
		'Publish the approved deterministic change', 'Stub evidence requests a verification cycle'
	)
	RETURNING id INTO recommendation_id;

	INSERT INTO sv_approved_actions (
		organization_id, project_id, source_kind, source_ref, finding_ref, recommendation_ref, title, evidence_ids
	)
	VALUES (
		org_id, project_id, 'ENGINE_ACTION', 'stub://gate12/action', finding_id::text,
		recommendation_id::text, 'Gate 12 approved action', ARRAY['stub:gate12:baseline']
	)
	RETURNING id INTO action_id;
	INSERT INTO sv_action_approvals (organization_id, action_id, approval_version, approved_by)
	VALUES (org_id, action_id, 1, 'gate12-owner');
	UPDATE sv_approved_actions SET status = 'APPROVED' WHERE id = action_id;
	UPDATE sv_approved_actions SET status = 'IN_PROGRESS' WHERE id = action_id;
	UPDATE sv_approved_actions SET status = 'IMPLEMENTED' WHERE id = action_id;

	INSERT INTO sv_change_events (
		organization_id, project_id, action_id, change_type, detail, verification, evidence_ids, occurred_at
	)
	VALUES (
		org_id, project_id, action_id, 'CONTENT', 'Gate 12 deterministic stub change', 'EVIDENCED',
		ARRAY['stub:gate12:change'], '2026-09-01T00:00:00Z'
	)
	RETURNING id INTO change_event_id;
	INSERT INTO sv_change_event_assets (organization_id, change_event_id, object_reference, content_sha256)
	VALUES (org_id, change_event_id, 'stub-object://gate12/change', repeat('c', 64));

	INSERT INTO sv_verification_cycles (
		organization_id, action_id, baseline_cycle_id, verification_measurement_cycle_id,
		baseline_dataset_id, verification_dataset_id, attempt, settle_days, status, completed_at
	)
	VALUES (
		org_id, action_id, baseline_measurement_cycle_id, verification_measurement_cycle_id,
		baseline_dataset_id, verification_dataset_id, 1, 14, 'COMPLETED', '2026-09-15T00:00:00Z'
	)
	RETURNING id INTO verification_cycle_id;
	UPDATE sv_approved_actions SET status = 'VERIFIED' WHERE id = action_id;

	IF (
		SELECT count(*)
		FROM sv_visibility_map_datasets dataset
		WHERE dataset.organization_id = org_id AND dataset.project_id = gate12_seed.project_id
	) <> 2 THEN
		RAISE EXCEPTION 'GATE12_BEFORE_AFTER_NOT_REPRODUCIBLE';
	END IF;

	INSERT INTO sv_outcome_metric_definitions (metric_key, version, unit, aggregation)
	VALUES ('gate12_qualified_leads', 1, 'lead', 'SUM');
	INSERT INTO sv_outcome_sources (
		organization_id, project_id, location_id, access_class, source_reference, evidence_ids
	)
	VALUES (
		org_id, project_id, location_id, 'UPLOADED', 'stub://gate12/outcome', ARRAY['stub:gate12:outcome-source']
	)
	RETURNING id INTO outcome_source_id;
	INSERT INTO sv_measurement_cycles (
		organization_id, domain_id, domain_cycle_id, configuration_lock_id, status
	)
	VALUES (org_id, 'OUTCOME', gen_random_uuid(), lock_id, 'COMPLETED')
	RETURNING id INTO outcome_measurement_cycle_id;
	INSERT INTO sv_measurement_datasets (organization_id, cycle_id, dataset_key, version)
	VALUES (org_id, outcome_measurement_cycle_id, 'gate12-outcome', 1)
	RETURNING id INTO outcome_dataset_id;
	INSERT INTO sv_outcome_observations (
		organization_id, project_id, location_id, source_id, measurement_cycle_id, dataset_id,
		metric_key, metric_version, value, period_start, period_end, evidence_ids, captured_at
	)
	VALUES (
		org_id, project_id, location_id, outcome_source_id, outcome_measurement_cycle_id, outcome_dataset_id,
		'gate12_qualified_leads', 1, NULL, '2026-08-01T00:00:00Z', '2026-09-01T00:00:00Z',
		ARRAY['stub:gate12:outcome-baseline:unknown'], '2026-09-01T00:00:00Z'
	)
	RETURNING id INTO baseline_outcome_id;
	INSERT INTO sv_outcome_observations (
		organization_id, project_id, location_id, source_id, measurement_cycle_id, dataset_id,
		metric_key, metric_version, value, period_start, period_end, evidence_ids, captured_at
	)
	VALUES (
		org_id, project_id, location_id, outcome_source_id, outcome_measurement_cycle_id, outcome_dataset_id,
		'gate12_qualified_leads', 1, NULL, '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z',
		ARRAY['stub:gate12:outcome-verification:unknown'], '2026-10-01T00:00:00Z'
	)
	RETURNING id INTO verification_outcome_id;
	INSERT INTO sv_outcome_attribution_windows (
		organization_id, project_id, location_id, verification_cycle_id, action_id,
		baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id,
		baseline_observation_id, verification_observation_id, metric_key, metric_version,
		window_start, window_end, evidence_ids
	)
	VALUES (
		org_id, project_id, location_id, verification_cycle_id, action_id,
		baseline_measurement_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id,
		baseline_outcome_id, verification_outcome_id, 'gate12_qualified_leads', 1,
		'2026-08-01T00:00:00Z', '2026-10-01T00:00:00Z',
		ARRAY['stub:gate12:outcome-baseline:unknown', 'stub:gate12:outcome-verification:unknown', 'stub:gate12:change']
	)
	RETURNING id INTO outcome_window_id;
	INSERT INTO sv_attribution_assessments (
		organization_id, verification_cycle_id, action_id, finding_ref, recommendation_ref, change_event_ids,
		baseline_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id,
		outcome_window_id, metric_key, formula_version, verdict, confidence, reason_codes, evidence_ids, delta
	)
	VALUES (
		org_id, verification_cycle_id, action_id, finding_id::text, recommendation_id::text, ARRAY[change_event_id],
		baseline_measurement_cycle_id, verification_measurement_cycle_id, baseline_dataset_id, verification_dataset_id,
		outcome_window_id, 'gate12_qualified_leads', 'outcome-attribution/1', 'NOT_MEASURED', 'UNKNOWN',
		ARRAY['OUTCOME_VALUE_UNKNOWN'],
		ARRAY['stub:gate12:outcome-baseline:unknown', 'stub:gate12:outcome-verification:unknown', 'stub:gate12:change'], NULL
	)
	RETURNING id INTO assessment_id;

	INSERT INTO sv_audit_events (organization_id, actor_id, event, subject_kind, subject_id, details, at)
	VALUES
		(org_id, 'gate12-stub', 'VISIBILITY_OS_PROJECT_CREATED', 'project', project_id::text, '{"source":"stub"}', '2026-08-01T00:00:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_LOCATION_CONFIRMED', 'location', location_id::text, '{"source":"stub"}', '2026-08-01T00:01:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_LOCAL_KEYWORDS_APPROVED', 'keyword', keyword_id::text, '{"source":"stub"}', '2026-08-01T00:02:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_GRID_CREATED', 'grid', grid_id::text, '{"source":"stub"}', '2026-08-01T00:03:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_QUOTE_ISSUED', 'quote', quote_id::text, '{"source":"stub","amount":0}', '2026-08-01T00:04:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_CONFIGURATION_LOCK_CREATED', 'configuration_lock', lock_id::text, '{"source":"stub"}', '2026-08-01T00:05:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_AI_CYCLE_COMPLETED', 'cycle', ai_cycle_id::text, '{"provider":"stub","cost":0}', '2026-08-01T00:06:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_LOCAL_CYCLE_COMPLETED', 'measurement_cycle', verification_measurement_cycle_id::text, '{"provider":"stub-local-rank","cost":0}', '2026-08-01T00:07:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_FINDINGS_GENERATED', 'finding', finding_id::text, '{"source":"stub"}', '2026-08-01T00:08:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_ACTION_APPROVED', 'action', action_id::text, '{"source":"stub"}', '2026-08-01T00:09:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_CHANGE_EVENT_RECORDED', 'change_event', change_event_id::text, '{"source":"stub"}', '2026-08-01T00:10:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_VERIFICATION_COMPLETED', 'verification_cycle', verification_cycle_id::text, '{"source":"stub"}', '2026-08-01T00:11:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_BEFORE_AFTER_GENERATED', 'dataset', verification_dataset_id::text, '{"baselineRank":5,"verificationRank":3}', '2026-08-01T00:12:00Z'),
		(org_id, 'gate12-stub', 'VISIBILITY_OS_ATTRIBUTION_ASSESSED', 'assessment', assessment_id::text, '{"verdict":"NOT_MEASURED","outcome":"UNKNOWN"}', '2026-08-01T00:13:00Z');

	INSERT INTO sv_journal_daily_claims (
		organization_id, project_id, question_set_version, utc_day, attempt
	)
	VALUES (org_id, project_id, 'gate12-journal-v1', (current_timestamp AT TIME ZONE 'UTC')::date, 1)
	RETURNING id INTO journal_claim_id;
	INSERT INTO sv_projects (organization_id, name, category, country, status)
	VALUES (org_id, 'Gate 12 Other Project', 'test', 'ID', 'DRAFT')
	RETURNING id INTO journal_other_project_id;
	INSERT INTO sv_configuration_locks (
		organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	)
	VALUES (
		org_id, journal_other_project_id, 1,
		jsonb_build_object(
			'journalClaim', jsonb_build_object(
				'id', journal_claim_id::text,
				'utcDay', (current_timestamp AT TIME ZONE 'UTC')::date::text,
				'attempt', 1
			)
		),
		'gate12-journal-stub', 1, 0, 'gate12-journal-stub'
	)
	RETURNING id INTO journal_other_lock_id;
	blocked := false;
	BEGIN
		UPDATE sv_journal_daily_claims
		SET configuration_lock_id = journal_other_lock_id, updated_at = now()
		WHERE id = journal_claim_id;
	EXCEPTION WHEN raise_exception THEN
		IF SQLERRM <> 'JOURNAL_DAILY_CLAIM_LOCK_PROVENANCE_MISMATCH' THEN RAISE; END IF;
		blocked := true;
	END;
	IF NOT blocked THEN
		RAISE EXCEPTION 'GATE12_JOURNAL_CROSS_PROJECT_LOCK_ACCEPTED';
	END IF;
	INSERT INTO sv_configuration_locks (
		organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	)
	VALUES (
		org_id, project_id, 2,
		jsonb_build_object(
			'journalClaim', jsonb_build_object(
				'id', gen_random_uuid()::text,
				'utcDay', (current_timestamp AT TIME ZONE 'UTC')::date::text,
				'attempt', 1
			)
		),
		'gate12-journal-stub', 1, 0, 'gate12-journal-stub'
	)
	RETURNING id INTO journal_bad_lock_id;
	blocked := false;
	BEGIN
		UPDATE sv_journal_daily_claims
		SET configuration_lock_id = journal_bad_lock_id, updated_at = now()
		WHERE id = journal_claim_id;
	EXCEPTION WHEN raise_exception THEN
		blocked := true;
	END;
	IF NOT blocked THEN
		RAISE EXCEPTION 'GATE12_JOURNAL_BAD_LOCK_PROVENANCE_ACCEPTED';
	END IF;
	INSERT INTO sv_configuration_locks (
		organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	)
	VALUES (
		org_id, project_id, 3,
		jsonb_build_object(
			'journalClaim', jsonb_build_object(
				'id', journal_claim_id::text,
				'utcDay', (current_timestamp AT TIME ZONE 'UTC')::date::text,
				'attempt', 1
			)
		),
		'gate12-journal-stub', 1, 0, 'gate12-journal-stub'
	)
	RETURNING id INTO journal_lock_id;
	UPDATE sv_journal_daily_claims
	SET configuration_lock_id = journal_lock_id, updated_at = now()
	WHERE id = journal_claim_id;
	blocked := false;
	BEGIN
		INSERT INTO sv_journal_daily_claims (
			organization_id, project_id, question_set_version, utc_day, attempt
		)
		VALUES (org_id, project_id, 'gate12-journal-v2', (current_timestamp AT TIME ZONE 'UTC')::date, 1);
	EXCEPTION WHEN unique_violation THEN
		blocked := true;
	END;
	IF NOT blocked THEN
		RAISE EXCEPTION 'GATE12_JOURNAL_CROSS_VERSION_CONCURRENT_CLAIM_ACCEPTED';
	END IF;
	UPDATE sv_journal_daily_claims SET status = 'EXECUTING', updated_at = now() WHERE id = journal_claim_id;
	UPDATE sv_journal_daily_claims
	SET status = 'COMPLETED', completed_at = now(), updated_at = now()
	WHERE id = journal_claim_id;
	blocked := false;
	BEGIN
		UPDATE sv_journal_daily_claims SET status = 'HOLD', completed_at = NULL, updated_at = now()
		WHERE id = journal_claim_id;
	EXCEPTION WHEN raise_exception THEN
		blocked := true;
	END;
	IF NOT blocked THEN
		RAISE EXCEPTION 'GATE12_JOURNAL_TERMINAL_MUTATION_ACCEPTED';
	END IF;
	INSERT INTO sv_journal_daily_claims (
		organization_id, project_id, question_set_version, utc_day, attempt
	)
	VALUES (org_id, project_id, 'gate12-journal-v1', (current_timestamp AT TIME ZONE 'UTC')::date, 2)
	RETURNING id INTO journal_claim_id;
	UPDATE sv_journal_daily_claims SET status = 'NO_SPEND', updated_at = now() WHERE id = journal_claim_id;

	INSERT INTO sv_journal_daily_claims (
		organization_id, project_id, question_set_version, utc_day, attempt, claimed_at, updated_at
	)
	VALUES (
		org_id, project_id, 'gate12-journal-v1',
		((current_timestamp AT TIME ZONE 'UTC')::date - 1), 1,
		current_timestamp - interval '1 day', current_timestamp - interval '1 day'
	)
	RETURNING id INTO journal_hold_id;
	INSERT INTO sv_configuration_locks (
		organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by
	)
	VALUES (
		org_id, project_id, 4,
		jsonb_build_object(
			'journalClaim', jsonb_build_object(
				'id', journal_hold_id::text,
				'utcDay', ((current_timestamp AT TIME ZONE 'UTC')::date - 1)::text,
				'attempt', 1
			)
		),
		'gate12-journal-stub', 1, 0, 'gate12-journal-stub'
	)
	RETURNING id INTO journal_hold_lock_id;
	UPDATE sv_journal_daily_claims
	SET configuration_lock_id = journal_hold_lock_id, updated_at = now()
	WHERE id = journal_hold_id;
	UPDATE sv_journal_daily_claims SET status = 'EXECUTING', updated_at = now() WHERE id = journal_hold_id;
	UPDATE sv_journal_daily_claims SET status = 'HOLD', updated_at = now() WHERE id = journal_hold_id;
	blocked := false;
	BEGIN
		INSERT INTO sv_journal_daily_claims (
			organization_id, project_id, question_set_version, utc_day, attempt
		)
		VALUES (org_id, project_id, 'gate12-journal-v1', (current_timestamp AT TIME ZONE 'UTC')::date, 3);
	EXCEPTION WHEN unique_violation THEN
		blocked := true;
	END;
	IF NOT blocked THEN
		RAISE EXCEPTION 'GATE12_JOURNAL_CROSS_DAY_HOLD_BYPASSED';
	END IF;
	blocked := false;
	BEGIN
		DELETE FROM sv_journal_daily_claims WHERE id = journal_hold_id;
	EXCEPTION WHEN raise_exception THEN
		blocked := true;
	END;
	IF NOT blocked THEN
		RAISE EXCEPTION 'GATE12_JOURNAL_DELETE_ACCEPTED';
	END IF;
	blocked := false;
	BEGIN
		TRUNCATE sv_journal_daily_claims;
	EXCEPTION WHEN raise_exception THEN
		blocked := true;
	END;
	IF NOT blocked THEN
		RAISE EXCEPTION 'GATE12_JOURNAL_TRUNCATE_ACCEPTED';
	END IF;
END $$;
SQL

DATABASE_URL="$database_url" "$repo_root/node_modules/.bin/tsx" \
	"$repo_root/packages/lib/scripts/visibility-os-gate12.ts"
