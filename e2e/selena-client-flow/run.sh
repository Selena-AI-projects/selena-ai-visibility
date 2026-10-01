#!/usr/bin/env bash
#
# The invited client's path, end to end, on one commit, in a throwaway setup:
# a clean worktree of that commit (no local .env reaches it), a new local
# database, the web build served in production mode, a sink in place of
# Resend, and the harness worker in place of the provider worker.
#
# Usage:
#   bash e2e/selena-client-flow/run.sh [<commit>]        # default HEAD
#
# Environment:
#   HARNESS_PG       local Postgres superuser URL (default postgres://postgres@127.0.0.1:5432)
#   HARNESS_DIR      where the run lives (default $TMPDIR/selena-client-flow/<run id>)
#   HARNESS_KEEP_DB  1 keeps the database after the run
#   CHROMIUM_PATH    browser binary, when Playwright's own is not installed
#
# Evidence, the redacted configuration and run.json are left in
# $HARNESS_DIR/evidence; secrets are generated per run and never written there.
set -euo pipefail

REPO="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
SHA="$(git -C "$REPO" rev-parse --verify "${1:-HEAD}^{commit}")"
RUN_ID="selena-flow-$(date -u +%Y%m%dT%H%M%SZ)-${SHA:0:7}"
DIR="${HARNESS_DIR:-${TMPDIR:-/tmp}/selena-client-flow/$RUN_ID}"
PG="${HARNESS_PG:-postgres://postgres@127.0.0.1:5432}"
WEB_PORT=3100
SINK_PORT=3191
DB="selena_flow_$(date -u +%Y%m%d%H%M%S)_${SHA:0:7}"

case "$(node -v)" in v24.*) ;; *) echo "Node 24 required, found $(node -v)" >&2; exit 1 ;; esac
case "$(node -e 'console.log(new URL(process.argv[1]).hostname)' "$PG")" in
	127.0.0.1 | localhost) ;;
	*) echo "HARNESS_PG must point at a Postgres on this machine" >&2; exit 1 ;;
esac

SRC="$DIR/src"
CONFIG="$DIR/config"
EVIDENCE="$DIR/evidence"
mkdir -p "$CONFIG" "$EVIDENCE/logs"
PIDS=()

cleanup() {
	for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
	wait 2>/dev/null || true
	git -C "$REPO" worktree remove --force "$SRC" 2>/dev/null || true
	if [ "${HARNESS_KEEP_DB:-0}" != "1" ]; then psql "$PG/postgres" -qc "drop database if exists $DB" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

echo "== $RUN_ID: worktree of $SHA"
git -C "$REPO" worktree add --detach "$SRC" "$SHA" >/dev/null
(cd "$SRC" && pnpm install --frozen-lockfile --offline >"$EVIDENCE/logs/install.log" 2>&1)

echo "== database $DB"
psql "$PG/postgres" -qc "create database $DB"
DATABASE_URL="$PG/$DB"

secret() { node -e "console.log(require('node:crypto').randomBytes($1).toString('$2'))"; }
code() { echo "HARNESS-$1-$(secret 4 hex | tr a-f A-F)"; }
MAIN_CODE="$(code MAIN)"
REJECT_CODE="$(code REJECT)"

# Everything the web build, the web server and the harness worker read. The
# secrets exist only for this run; the evidence copy names them, not their values.
cat >"$CONFIG/harness.env" <<EOF
DATABASE_URL=$DATABASE_URL
DEPLOYMENT_MODE=local
VITE_DEPLOYMENT_MODE=local
BETTER_AUTH_SECRET=$(secret 32 hex)
ELMO_ENCRYPTION_KEY=$(secret 32 base64)
APP_URL=http://localhost:$WEB_PORT
VITE_APP_URL=http://localhost:$WEB_PORT
DISABLE_TELEMETRY=1
SCRAPE_TARGETS=stub:stub
ONBOARDING_LLM_TARGET=stub:stub
ANTHROPIC_API_KEY=placeholder-not-a-key
OPENAI_API_KEY=placeholder-not-a-key
DATAFORSEO_LOGIN=placeholder
DATAFORSEO_PASSWORD=placeholder
SELENA_EMERGENCY_STOP=false
SELENA_MEASUREMENT_ENABLED=true
SELENA_MEASUREMENT_ADAPTER=stub
SELENA_PAYMENTS_ENABLED=true
SELENA_PAYMENT_MODE=test
SELENA_PROVIDER_BUDGET_USD=2
SCHEDULE_MAINTENANCE_ENABLED=false
SELENA_SELF_SERVE_SIGNUP_ENABLED=true
SELENA_PILOT_SIGNUP_ALLOWLIST=operator@ops-harness.example,client@studio-lumen-harness.example,rival@other-harness.example,client@studio-nord-harness.example
SELENA_PILOT_SEAT_CAP=10
SELENA_FREE_AUTO_DISPATCH_ENABLED=true
RESEND_BASE_URL=http://127.0.0.1:$SINK_PORT
RESEND_API_KEY=re_sink_not_a_key
RESEND_FROM_EMAIL=harness@sink.example
EOF
chmod 600 "$CONFIG/harness.env"
sed -E 's/^(BETTER_AUTH_SECRET|ELMO_ENCRYPTION_KEY)=.*/\1=<generated per run>/; s#^DATABASE_URL=.*#DATABASE_URL=<local disposable database>#' \
	"$CONFIG/harness.env" >"$EVIDENCE/harness.env.redacted"
printf '%s,visibility-snapshot,harness main client\n%s,visibility-snapshot,harness rejected client\n' \
	"$MAIN_CODE" "$REJECT_CODE" >"$CONFIG/seats.csv"

with_env() { (set -a && . "$CONFIG/harness.env" && set +a && "$@"); }

echo "== migrations, seats, measure budget"
with_env env SELENA_MIGRATIONS_DIR="$SRC/packages/lib/src/db/migrations" \
	node "$SRC/packages/lib/scripts/apply-migrations.mjs" >"$EVIDENCE/logs/migrate.log" 2>&1
(cd "$SRC/packages/lib" && with_env pnpm exec tsx scripts/issue-pilot-invites.ts "$CONFIG/seats.csv" 1 2>&1 |
	grep -v "$MAIN_CODE\|$REJECT_CODE" >"$EVIDENCE/logs/seats.log")
(cd "$SRC/packages/lib" && with_env pnpm exec tsx scripts/set-provider-spend-budget.ts measure 1 >"$EVIDENCE/logs/budget.log" 2>&1)

echo "== web build"
(cd "$SRC/apps/web" && with_env pnpm build >"$EVIDENCE/logs/web-build.log" 2>&1)

echo "== sink, web, harness worker"
SINK_LOG="$EVIDENCE/email-sink.jsonl"
SINK_LOG="$SINK_LOG" SINK_PORT=$SINK_PORT node "$SRC/e2e/selena-client-flow/sink.mjs" >"$EVIDENCE/logs/sink.log" 2>&1 &
PIDS+=($!)
(cd "$SRC/apps/web" && with_env env PORT=$WEB_PORT NODE_ENV=production node .output/server/index.mjs) >"$EVIDENCE/logs/web.log" 2>&1 &
PIDS+=($!)
(cd "$SRC/e2e" && with_env ./node_modules/.bin/tsx selena-client-flow/harness-worker.ts) >"$EVIDENCE/logs/harness-worker.log" 2>&1 &
PIDS+=($!)
for _ in $(seq 1 60); do curl -sf -o /dev/null "http://localhost:$WEB_PORT/auth/login" && break; sleep 1; done
for _ in $(seq 1 60); do grep -q "consuming selena-measure" "$EVIDENCE/logs/harness-worker.log" && break; sleep 1; done

echo "== scenario"
STARTED="$(date -u +%FT%TZ)"
set +e
(cd "$SRC/e2e" && with_env env APP_URL="http://localhost:$WEB_PORT" EVIDENCE_DIR="$EVIDENCE" SINK_LOG="$SINK_LOG" \
	HARNESS_CODES="{\"main\":\"$MAIN_CODE\",\"rejected\":\"$REJECT_CODE\"}" node selena-client-flow/scenario.mjs) |
	tee "$EVIDENCE/scenario.log"
STATUS=${PIPESTATUS[0]}
set -e

psql "$DATABASE_URL" -c "select o.name as workspace, p.name as project, ord.status as order_status, c.status as cycle_status, c.expected_runs
	from sv_orders ord join sv_projects p on p.id = ord.project_id join organization o on o.id = ord.organization_id
	left join sv_cycles c on c.order_id = ord.id order by ord.created_at" \
	-c "select o.name as workspace, r.status, r.provider, count(*) from sv_runs r join organization o on o.id = r.organization_id group by 1, 2, 3 order by 1" \
	-c "select decision, scope from sv_qc_records order by created_at" \
	-c "select name, state, count(*) from pgboss.job where name = 'selena-measure' group by 1, 2" \
	-c "select label, redeemed_at is not null as redeemed from sv_pilot_invites order by label" >"$EVIDENCE/db-state.txt"

cat >"$EVIDENCE/run.json" <<EOF
{
 "run": "$RUN_ID",
 "commit": "$SHA",
 "command": "bash e2e/selena-client-flow/run.sh $SHA",
 "node": "$(node -v)",
 "pnpm": "$(pnpm -v)",
 "scenarioStarted": "$STARTED",
 "finished": "$(date -u +%FT%TZ)",
 "scenarioExit": $STATUS
}
EOF
echo "== evidence in $EVIDENCE (scenario exit $STATUS)"
exit "$STATUS"
