#!/usr/bin/env bash
set -euo pipefail

dockerfile="${1:-docker/Dockerfile}"
test -f "$dockerfile"
grep -q '^ARG RAILWAY_SERVICE_NAME=web$' "$dockerfile"
grep -q '^ARG SELENA_RUNTIME_TARGET=\${RAILWAY_SERVICE_NAME}$' "$dockerfile"
for stage in web worker local migrate measure publish owner; do
	grep -q "^FROM base AS ${stage}\$" "$dockerfile"
done
grep -q '^FROM \${SELENA_RUNTIME_TARGET} AS final$' "$dockerfile"
grep -q '^CMD \["./node_modules/.bin/tsx", "src/local-index.ts"\]$' "$dockerfile"
printf '%s\n' "tracked Railway Dockerfile target selection: PASS"
