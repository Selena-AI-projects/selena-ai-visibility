# Elmo 
# Supports: web app (Nitro server) and worker

# Build-time selector used by the final runtime stage.
ARG RAILWAY_SERVICE_NAME=web

# Base stage with Node.js
FROM node:24-alpine AS base
RUN corepack enable pnpm
RUN apk add --no-cache curl

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY packages/lib/package.json ./packages/lib/
COPY packages/local/package.json ./packages/local/
COPY packages/whitelabel/package.json ./packages/whitelabel/
COPY packages/cloud/package.json ./packages/cloud/
COPY packages/deployment/package.json ./packages/deployment/
COPY packages/og/package.json ./packages/og/
COPY packages/api-spec/package.json ./packages/api-spec/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/lib/node_modules ./packages/lib/node_modules
COPY --from=deps /app/packages/local/node_modules ./packages/local/node_modules
COPY --from=deps /app/packages/whitelabel/node_modules ./packages/whitelabel/node_modules
COPY --from=deps /app/packages/cloud/node_modules ./packages/cloud/node_modules
COPY --from=deps /app/packages/deployment/node_modules ./packages/deployment/node_modules
COPY --from=deps /app/packages/og/node_modules ./packages/og/node_modules

# Copy source code
COPY . .

# Build arguments for VITE_ env vars (baked into client bundle)
ARG DEPLOYMENT_MODE=local
ARG VITE_DEPLOYMENT_MODE=${DEPLOYMENT_MODE}
ENV VITE_DEPLOYMENT_MODE=${VITE_DEPLOYMENT_MODE}

# Build the web application (increase heap for large bundles)
RUN pnpm --filter @workspace/web build

# Create pruned standalone deployments (only each package's own deps)
# --legacy: allows deploy without inject-workspace-packages (which breaks Alpine Docker builds)
RUN pnpm --filter @workspace/worker deploy --legacy /deploy/worker
RUN pnpm --filter @workspace/lib deploy --legacy /deploy/lib

# Runner stage for web app (Nitro)
FROM base AS web
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 elmo

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy Nitro output - this is the entire server bundle
COPY --from=builder --chown=elmo:nodejs /app/apps/web/.output ./.output

USER elmo

EXPOSE 3000
ENV PORT=3000
ENV HOST="0.0.0.0"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]

# Migration stage — applies pending migrations, then exits.
#
# The binary is invoked by path, with no launcher in front of it. Both
# launchers reach the network before they reach the database, and both failed
# here: `npx` downloads drizzle-kit at container start (killed mid-download
# once, exited zero having applied nothing once), and `pnpm exec` runs a
# dependency check that decided to reinstall and aborted for want of a TTY.
# drizzle-kit is a dependency of the library, so `pnpm deploy` already put it
# in ./node_modules/.bin.
FROM base AS migrate
WORKDIR /app

COPY --from=builder /deploy/lib ./

# The Node runner requires an explicit maximum migration index, builds a
# matching Drizzle journal/SQL bundle, invokes the packaged binary directly and
# retains the final log line for Railway collection. It performs no downloads.
CMD ["node", "./scripts/run-bounded-migrations.mjs"]

# Worker stage
FROM base AS worker
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=builder --chown=worker:nodejs /deploy/worker ./

USER worker

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npx", "tsx", "src/index.ts"]

# Measurement stage — runs one measurement of the owner's own projects, then
# exits. A job, not a server: the script refuses a second run of the same
# question set on the same day, so a platform that restarts what exits cannot
# turn a job into a spending loop.
#
# It ships the worker's deploy rather than the library's, because the runner it
# needs is the worker's: tsx is the worker's dependency and the worker's own
# entrypoint proves the path in production every day. The library deploy has no
# runner in it at all.
FROM base AS measure
WORKDIR /app

COPY --from=builder /deploy/worker ./

CMD ["npx", "tsx", "src/scripts/measure-journal.ts"]

# Publishing stage — reads a finished measurement and opens a pull request on
# the marketing site with its per-question detail, then exits.
#
# Separate from `measure` on purpose: this one spends nothing and touches no
# provider, so it can be re-run freely when a publish fails, without the
# spending guard that protects the measurement.
FROM base AS publish
WORKDIR /app

COPY --from=builder /deploy/worker ./

CMD ["npx", "tsx", "src/scripts/publish-journal-detail.ts"]

# The service name selects the final runtime stage: web or worker.
FROM ${RAILWAY_SERVICE_NAME} AS final
