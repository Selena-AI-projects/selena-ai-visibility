#!/usr/bin/env bash
set -euo pipefail

dockerfile="${1:-docker/Dockerfile}"
test -f "$dockerfile"
grep -q '^ARG RAILWAY_SERVICE_NAME=web$' "$dockerfile"
grep -q '^ARG SELENA_RUNTIME_TARGET=\${RAILWAY_SERVICE_NAME}$' "$dockerfile"
grep -q '^FROM base AS web$' "$dockerfile"
grep -q '^FROM base AS worker$' "$dockerfile"
grep -q '^FROM \${SELENA_RUNTIME_TARGET} AS final$' "$dockerfile"
printf '%s\n' "tracked Railway Dockerfile target selection: PASS"
