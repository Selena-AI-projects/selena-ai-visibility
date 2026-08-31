#!/usr/bin/env bash

case "${SELENA_VISIBILITY_COMPOSE_COMMAND:-}" in
	docker-compose) compose_cli=(docker-compose) ;;
	'docker compose') compose_cli=(docker compose) ;;
	*)
		printf 'BLOCKED_SCOPE: SELENA_VISIBILITY_COMPOSE_COMMAND must be selected by the rehearsal wrapper.\n' >&2
		exit 2
		;;
esac
