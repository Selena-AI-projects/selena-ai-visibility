#!/usr/bin/env bash
set -euo pipefail

usage() {
	printf '%s\n' \
		'Usage:' \
		'  visibility_os_disposable_rehearsal.sh [--dry-run|--run] [gate12|0045|0049|0052]' \
		'' \
		'--dry-run is the default and does not call Docker or apply migrations.' \
		'--run starts a unique ephemeral PostgreSQL compose project, runs one suite, and removes it.'
}

mode='dry-run'
suite='gate12'

while [[ $# -gt 0 ]]; do
	case "$1" in
		--dry-run) mode='dry-run'; shift ;;
		--run) mode='run'; shift ;;
		gate12|0045|0049|0052) suite="$1"; shift ;;
		-h|--help) usage; exit 0 ;;
		*) printf 'BLOCKED_SCOPE: unknown argument: %s\n' "$1" >&2; usage >&2; exit 2 ;;
	esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$repo_root/tools/visibility_os_disposable_postgres.compose.yml"
random_suffix="${RANDOM}${RANDOM}"
compose_project="selena-visibility-rehearsal-${PPID}-$$-${random_suffix}"

if [[ ! "$compose_project" =~ ^selena-visibility-rehearsal-[a-z0-9][a-z0-9_-]+$ ]]; then
	printf 'BLOCKED_SCOPE: unsafe compose project name.\n' >&2
	exit 2
fi
if [[ ! -f "$compose_file" ]]; then
	printf 'BLOCKED_SCOPE: disposable compose file is missing.\n' >&2
	exit 2
fi

case "$suite" in
	gate12) suite_script="$repo_root/tools/visibility_os_gate12_e2e.sh" ;;
	0045) suite_script="$repo_root/tools/visibility_os_0045_hardening_e2e.sh" ;;
	0049) suite_script="$repo_root/tools/visibility_os_0049_lifecycle_e2e.sh" ;;
	0052) suite_script="$repo_root/tools/visibility_os_0052_snapshot_journal_e2e.sh" ;;
esac

if [[ "$mode" == 'dry-run' ]]; then
	printf 'DRY_RUN_OK suite=%s compose_project=%s compose_file=%s cleanup=down--volumes\n' \
		"$suite" "$compose_project" "$compose_file"
	exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
	printf 'BLOCKED_ENV: Docker is required.\n' >&2
	exit 3
fi

if docker compose version >/dev/null 2>&1; then
	compose_cli=(docker compose)
	compose_command='docker compose'
elif command -v docker-compose >/dev/null 2>&1; then
	compose_cli=(docker-compose)
	compose_command='docker-compose'
else
	printf 'BLOCKED_ENV: docker compose or docker-compose is required.\n' >&2
	exit 3
fi

project_resources_exist() {
	local resources
	for resource in container network volume; do
		if ! resources="$(docker "$resource" ls -q --filter "label=com.docker.compose.project=$compose_project")"; then
			return 2
		fi
		if [[ -n "$resources" ]]; then return 0; fi
	done
	return 1
}

if project_resources_exist; then
	printf 'BLOCKED_SCOPE: generated compose project already exists.\n' >&2
	exit 2
elif [[ "$?" -eq 2 ]]; then
	printf 'BLOCKED_ENV: could not inspect Docker resources for the generated compose project.\n' >&2
	exit 3
fi

if ! docker image inspect postgres:16-alpine >/dev/null 2>&1; then
	printf 'BLOCKED_ENV: postgres:16-alpine must already exist locally; this wrapper does not pull images.\n' >&2
	exit 3
fi

compose=("${compose_cli[@]}" -p "$compose_project" -f "$compose_file")
cleanup_required=false
cleanup() {
	local exit_code=$?
	local cleanup_ok=true
	trap - EXIT
	if [[ "$cleanup_required" == true ]]; then
		if ! "${compose[@]}" down --volumes --remove-orphans >/dev/null; then
			cleanup_ok=false
		else
			if project_resources_exist; then
				cleanup_ok=false
				printf 'BLOCKED_CLEANUP: disposable compose resources remain after teardown: %s\n' "$compose_project" >&2
			else
				resource_status=$?
				if ((resource_status == 2)); then
				cleanup_ok=false
				printf 'BLOCKED_CLEANUP: could not verify disposable compose teardown: %s\n' "$compose_project" >&2
				fi
			fi
		fi
		if [[ "$cleanup_ok" != true ]]; then
			printf 'BLOCKED_CLEANUP: disposable compose project teardown failed: %s\n' "$compose_project" >&2
			if ((exit_code == 0)); then exit_code=4; fi
		fi
	fi
	if ((exit_code == 0)); then
		printf 'REHEARSAL_COMPLETE suite=%s compose_project=%s cleanup=verified\n' "$suite" "$compose_project"
	fi
	exit "$exit_code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cleanup_required=true
"${compose[@]}" up -d --pull never postgres

ready=false
for _ in {1..60}; do
	if "${compose[@]}" exec -T postgres pg_isready -U selena_test -d selena_visibility_test >/dev/null 2>&1; then
		ready=true
		break
	fi
	sleep 0.5
done
if [[ "$ready" != true ]]; then
	printf 'BLOCKED_ENV: disposable PostgreSQL did not become ready.\n' >&2
	exit 3
fi

published_address="$("${compose[@]}" port postgres 5432)"
published_port="${published_address##*:}"
if [[ ! "$published_port" =~ ^[0-9]+$ ]]; then
	printf 'BLOCKED_ENV: Docker did not publish a safe PostgreSQL port.\n' >&2
	exit 3
fi

SELENA_VISIBILITY_COMPOSE_PROJECT="$compose_project" \
SELENA_VISIBILITY_COMPOSE_COMMAND="$compose_command" \
DATABASE_URL="postgres://selena_test:selena_test@127.0.0.1:${published_port}/selena_visibility_test" \
	bash "$suite_script" "$compose_file"
