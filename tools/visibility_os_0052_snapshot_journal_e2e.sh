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

psql=("${compose_cli[@]}" -p "$compose_project" -f "$compose_file" exec -T postgres psql -U selena_test -d selena_visibility_test -v ON_ERROR_STOP=1)

bash "$repo_root/tools/visibility_os_gate12_e2e.sh" "$compose_file" >/dev/null
"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0051_visibility_os_provider_evidence_provenance.sql" >/dev/null
"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0052_provider_dataset_snapshot_journal.sql" >/dev/null

"${psql[@]}" <<'SQL' >/dev/null
DO $$
DECLARE
	function_definition text;
	v_project_id uuid;
	v_blocked boolean := false;
BEGIN
	SELECT pg_get_functiondef('sv_enforce_provider_dataset_snapshot_event_insert()'::regprocedure)
	INTO function_definition;
	function_definition := replace(
		function_definition,
		'IF NEW."phase" NOT IN (''TRIGGERED'', ''RESUMED'') THEN',
		'IF NEW."phase" <> ''TRIGGERED'' THEN'
	);
	IF function_definition NOT LIKE '%IF NEW."phase" <> ''TRIGGERED'' THEN%' THEN
		RAISE EXCEPTION '0055 historical trigger fixture was not installed';
	END IF;
	EXECUTE function_definition;

	SELECT id INTO v_project_id
	FROM sv_projects
	WHERE organization_id = 'gate12-release' AND name = 'Gate 12 Project';
	BEGIN
		INSERT INTO sv_provider_dataset_snapshot_events (
			organization_id, project_id, source, provider_dataset_id, snapshot_id,
			phase, observed_at, event_hash
		) VALUES (
			'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal',
			'initial-resume-reconciliation', 'RESUMED', '2026-09-01T00:30:00Z', 'sha256:' || repeat('0', 64)
		);
	EXCEPTION WHEN raise_exception THEN
		IF SQLERRM = 'PROVIDER_DATASET_SNAPSHOT_INITIAL_PHASE_INVALID' THEN v_blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT v_blocked THEN RAISE EXCEPTION '0055 historical trigger accepted initial RESUMED'; END IF;
END;
$$;
SQL

"${psql[@]}" --single-transaction < "$repo_root/packages/lib/src/db/migrations/0055_provider_snapshot_resume_reconciliation.sql" >/dev/null

DATABASE_URL="${DATABASE_URL:?DATABASE_URL_REQUIRED}" "$repo_root/node_modules/.bin/tsx" \
	"$repo_root/packages/lib/scripts/brightdata-snapshot-journal-rehearsal.ts" >/dev/null

"${psql[@]}" <<'SQL'
DO $$
DECLARE
	v_project_id uuid;
	v_other_project_id uuid;
	v_blocked boolean;
BEGIN
	SELECT id INTO v_project_id
	FROM sv_projects
	WHERE organization_id = 'gate12-release' AND name = 'Gate 12 Project';
	IF v_project_id IS NULL THEN
		RAISE EXCEPTION '0052 primary project missing';
	END IF;

	INSERT INTO sv_provider_dataset_snapshot_events (
		organization_id, project_id, source, provider_dataset_id, snapshot_id,
		phase, observed_at, event_hash
	) VALUES (
		'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal',
		'initial-resume-reconciliation', 'RESUMED', '2026-09-01T00:30:00Z', 'sha256:' || repeat('0', 64)
	);

	IF (SELECT count(*) FROM sv_provider_dataset_snapshot_events
		WHERE project_id = v_project_id AND snapshot_id = 'brightdata-journal-adapter-snapshot') <> 4 THEN
		RAISE EXCEPTION '0052 adapter exact replay was not idempotent';
	END IF;

	INSERT INTO sv_provider_dataset_snapshot_events (
		organization_id, project_id, source, provider_dataset_id, snapshot_id,
		phase, provider_status, observed_at, event_hash
	) VALUES (
		'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal', 'resume-snapshot',
		'TRIGGERED', NULL, '2026-09-01T01:00:00Z', 'sha256:' || repeat('1', 64)
	), (
		'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal', 'resume-snapshot',
		'INTERRUPTED', NULL, '2026-09-01T01:00:01Z', 'sha256:' || repeat('2', 64)
	), (
		'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal', 'resume-snapshot',
		'RESUMED', NULL, '2026-09-01T01:00:02Z', 'sha256:' || repeat('3', 64)
	), (
		'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal', 'resume-snapshot',
		'PENDING', 'running', '2026-09-01T01:00:03Z', 'sha256:' || repeat('4', 64)
	), (
		'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal', 'resume-snapshot',
		'PENDING', 'running', '2026-09-01T01:00:04Z', 'sha256:' || repeat('5', 64)
	), (
		'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal', 'resume-snapshot',
		'TERMINAL_FAILURE', 'failed', '2026-09-01T01:00:05Z', 'sha256:' || repeat('6', 64)
	);

	v_blocked := false;
	BEGIN
		INSERT INTO sv_provider_dataset_snapshot_events (
			organization_id, project_id, source, provider_dataset_id, snapshot_id,
			phase, provider_status, observed_at, event_hash
		) VALUES (
			'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal',
			'brightdata-journal-adapter-snapshot', 'PENDING', 'running',
			'2026-09-01T02:00:00Z', 'sha256:' || repeat('7', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'PROVIDER_DATASET_SNAPSHOT_TERMINAL' THEN v_blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT v_blocked THEN RAISE EXCEPTION '0052 terminal transition accepted'; END IF;

	v_blocked := false;
	BEGIN
		INSERT INTO sv_provider_dataset_snapshot_events (
			organization_id, project_id, source, provider_dataset_id, snapshot_id,
			phase, provider_status, observed_at, event_hash
		) VALUES (
			'gate12-release', v_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal',
			'invalid-initial-snapshot', 'PENDING', 'running',
			'2026-09-01T02:00:00Z', 'sha256:' || repeat('8', 64)
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'PROVIDER_DATASET_SNAPSHOT_INITIAL_PHASE_INVALID' THEN v_blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT v_blocked THEN RAISE EXCEPTION '0052 invalid initial phase accepted'; END IF;

	INSERT INTO organization (id, name, slug, created_at)
	VALUES ('snapshot-journal-other', 'Snapshot Journal Other', 'snapshot-journal-other', now());
	INSERT INTO sv_projects (organization_id, name, category, country, languages, status)
	VALUES ('snapshot-journal-other', 'Other Project', 'test', 'ID', ARRAY['en'], 'DRAFT')
	RETURNING id INTO v_other_project_id;
	INSERT INTO sv_provider_dataset_snapshot_events (
		organization_id, project_id, source, provider_dataset_id, snapshot_id,
		phase, observed_at, event_hash
	) VALUES (
		'snapshot-journal-other', v_other_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal',
		'other-snapshot', 'TRIGGERED', '2026-09-01T03:00:00Z', 'sha256:' || repeat('9', 64)
	);

	v_blocked := false;
	BEGIN
		INSERT INTO sv_provider_dataset_snapshot_events (
			organization_id, project_id, source, provider_dataset_id, snapshot_id,
			phase, observed_at, event_hash
		) VALUES (
			'gate12-release', v_other_project_id, 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal',
			'cross-tenant-project', 'TRIGGERED', '2026-09-01T03:00:00Z', 'sha256:' || repeat('a', 64)
		);
	EXCEPTION WHEN foreign_key_violation THEN v_blocked := true;
	END;
	IF NOT v_blocked THEN RAISE EXCEPTION '0052 cross-tenant project accepted'; END IF;

	v_blocked := false;
	BEGIN
		UPDATE sv_provider_dataset_snapshot_events
		SET provider_status = 'changed'
		WHERE id = (
			SELECT id FROM sv_provider_dataset_snapshot_events WHERE project_id = v_project_id LIMIT 1
		);
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'PROVIDER_DATASET_SNAPSHOT_EVENT_IMMUTABLE' THEN v_blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT v_blocked THEN RAISE EXCEPTION '0052 update accepted'; END IF;

	v_blocked := false;
	BEGIN
		DELETE FROM sv_provider_dataset_snapshot_events WHERE project_id = v_project_id;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'PROVIDER_DATASET_SNAPSHOT_EVENT_IMMUTABLE' THEN v_blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT v_blocked THEN RAISE EXCEPTION '0052 delete accepted'; END IF;

	v_blocked := false;
	BEGIN
		TRUNCATE sv_provider_dataset_snapshot_events;
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM = 'PROVIDER_DATASET_SNAPSHOT_EVENT_IMMUTABLE' THEN v_blocked := true; ELSE RAISE; END IF;
	END;
	IF NOT v_blocked THEN RAISE EXCEPTION '0052 truncate accepted'; END IF;
END;
$$;

CREATE ROLE snapshot_journal_tenant NOLOGIN;
GRANT USAGE ON SCHEMA public TO snapshot_journal_tenant;
GRANT SELECT, INSERT ON sv_provider_dataset_snapshot_events TO snapshot_journal_tenant;
SET ROLE snapshot_journal_tenant;
SELECT set_config('app.organization_id', 'gate12-release', false);
DO $$
DECLARE
	v_visible integer;
	v_blocked boolean := false;
BEGIN
	SELECT count(*) INTO v_visible FROM sv_provider_dataset_snapshot_events;
	IF v_visible <> 11 THEN RAISE EXCEPTION '0052 tenant A visibility count: %', v_visible; END IF;
	BEGIN
		INSERT INTO sv_provider_dataset_snapshot_events (
			organization_id, project_id, source, provider_dataset_id, snapshot_id,
			phase, observed_at, event_hash
		) VALUES (
			'snapshot-journal-other', '00000000-0000-0000-0000-000000000001', 'YOUTUBE_VIDEOS', 'gd_youtube_rehearsal',
			'rls-cross-tenant', 'TRIGGERED', '2026-09-01T04:00:00Z', 'sha256:' || repeat('b', 64)
		);
	EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
	END;
	IF NOT v_blocked THEN RAISE EXCEPTION '0052 RLS cross-tenant insert accepted'; END IF;
END;
$$;
RESET ROLE;

DO $$
BEGIN
	IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'sv_provider_dataset_snapshot_events'::regclass) THEN
		RAISE EXCEPTION '0052 forced RLS missing';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_policy
		WHERE polrelid = 'sv_provider_dataset_snapshot_events'::regclass AND polname = 'tenant_isolation'
	) THEN
		RAISE EXCEPTION '0052 tenant policy missing';
	END IF;
	RAISE NOTICE '0052 snapshot journal lifecycle, idempotency, RLS and immutability passed';
END;
$$;
SQL

printf 'Visibility OS 0052 snapshot journal gate passed\n'
