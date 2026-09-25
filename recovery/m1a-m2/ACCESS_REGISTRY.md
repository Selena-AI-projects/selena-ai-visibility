# M2-a access registry: tenant isolation (web)

Repo: `selena-ai-visibility`, branch `claude/consolidate-services-single-domain-040sci`. This was a read-only analysis. Nothing was edited or run.
Scope: every server-side entry point in `apps/web/src`, meaning API route handlers (`routes/api/**`), `createServerFn` server functions (`server/**`, `lib/auth/session.ts`, and route files), and route loaders. The 21 unrecovered routes are in `recovery/m1a-m2/ROUTE_REGISTRY.md` and are not repeated here.
Uncertain claims are marked **UNVERIFIED**.

## 0. Abbreviations

| Abbrev | Meaning |
|---|---|
| SESS | better-auth session cookie (`auth.api.getSession`) |
| SCTX | `resolveSessionAuthContext()` (`lib/selena-auth-context.ts:27`). The tenant is `session.activeOrganizationId`, or else `rows[0]` of `member` **with no ORDER BY** (`:37`). Role mapping: owner/admin→owner, viewer→viewer, else member. The membership query itself is a plain `db.` (`:32`) |
| AKEY | `resolveApiKeyAuthContext()` (`:48`). It takes the Bearer token, hashes it with sha256 and calls `sv_resolve_api_key_context()` (a SECURITY DEFINER function) through plain `db.execute` (`packages/lib/src/db/api-key-bootstrap.ts:19`). The tenant is `sv_api_keys.organization_id` and the role is always `owner` |
| ADMKEY | Bearer token matched against `ADMIN_API_KEYS`, in `deploymentMiddleware` (`lib/auth/policies.ts:116`) and `createApiHandler` (`lib/api/handler.ts:57`). This key is **deployment-wide and has no tenant** |
| PADM | `requireAdmin()`: `user.role === "admin"` (a platform admin; `lib/auth/helpers.ts:26`) |
| RBA / RBR / RBO | `requireBrandAccess` / `requireBrandRole(BRAND_WRITER_ROLES)` / `requireBrandOrganization` (brand → `brands.organization_id` → `member`), all plain `db.` (`helpers.ts:59-106`) |
| LUO / ROA / COA | `listUserOrganizations` (ordered) / `requireOrgAccess` / `checkOrgAccess` (plain `db.`) |
| PFU | `promptForUser` (prompt→brand→member join; `helpers.ts:118`) |
| OTX | `withOrganizationTransaction(db, orgId, …)`: a transaction-local `app.organization_id`. `app.user_id` is **never** set |
| REPO | `createSelenaRepositories(db)` (`packages/lib/src/selena-visibility-repositories.ts`). Every method uses OTX plus an explicit `organization_id = ctx.tenantId` predicate. Writes call `writable()` (`:97`), which blocks viewers and API keys without `client:write`. Grep found no bare `db.` in this file |
| RECREPO | `createRecommendationRepositories(db)` (`recommendation-persistence.ts`): OTX + predicates, and rejects evidence whose tenantId ≠ ctx |
| DB | plain `db.` from `@workspace/lib/db/db` (owner connection, no `app.organization_id`) |
| PGR | `lib/postgres-read.ts`: a **second pool**, `drizzle({connection: runtimeDatabaseConnection()})` (`:21`), with raw SQL on `prompt_runs` and `citations` and no org context |
| BOSS | pg-boss client (`lib/boss-client.ts`, `runtimeDatabaseConnection()`), plus direct SQL on `pgboss.job` |
| FC | fail-closed store: the handler authenticates, checks scope, UUID and Idempotency-Key, then the default store throws 503 `OWNER_GATE_REQUIRED`. There is **no DB access** apart from the AKEY bootstrap |
| SF-CSRF | TanStack `createCsrfMiddleware({filter: serverFn})` (`start.ts:18-24`). Whether it also checks GET server functions is **UNVERIFIED** |
| BEARER | Bearer-token auth with no cookie, so CSRF does not apply |

Global middleware: `deploymentMiddleware` blocks HTTP `/api/auth/organization/*` writes everywhere and all writes in read-only (demo) mode. It requires ADMKEY on `/api/v1/*` except `/api/v1/selena/*`, `/api/v1/docs` and `/api/v1/openapi.json`. `authMiddleware` attaches the session to server functions but does not enforce it. A rate limiter runs in `server.ts:91`.

---

## 1. How DB connections are built today

| # | Construction | File:line | Env var | Role |
|---|---|---|---|---|
| C1 | `export const db` = `drizzle(process.env.DATABASE_URL)` when `SELENA_RUNTIME_DATABASE_CA_PEM` is unset, otherwise `drizzle({connection: runtimeDatabaseConnection()})` | `packages/lib/src/db/db.ts:12-15` | `DATABASE_URL` (+ optional CA PEM) | Whatever user is in `DATABASE_URL`. Per TZ/M0 that is the **table owner** in staging and prod |
| C2 | `runtimeDatabaseConnection(env)`: throws `DATABASE_URL_REQUIRED` if the var is unset. With a CA PEM it strips the TLS params from the URL and sets `ssl.ca` with `rejectUnauthorized: true` | `packages/lib/src/db/postgres-config.ts:63-76` | `DATABASE_URL`, `SELENA_RUNTIME_DATABASE_CA_PEM` | same |
| C3 | analytics read pool | `apps/web/src/lib/postgres-read.ts:21` | via C2 | same |
| C4 | pg-boss client (`supervise:false, schedule:false`), schema lifecycle via `SELENA_PGBOSS_OWNER_MANAGED_SCHEMA` | `apps/web/src/lib/boss-client.ts:28` | via C2 | same |
| C5 | ad-hoc `new pg.Client(runtimeDatabaseConnection())` for admin pg-boss log reads | `apps/web/src/server/admin.ts:36` | via C2 | same |
| C6 | better-auth `drizzleAdapter(db)` | `packages/lib/src/auth/server.ts:81` | C1 | same |
| C7 | secrets overlay (`startCredentialRefresh()` at boot; `store.ts:55,93` dynamic-imports `db`) | `apps/web/src/server.ts:41`, `packages/lib/src/secrets/store.ts` | C1 | same |

- The worker imports the **same** `db` module (e.g. `apps/worker/src/jobs/analyze-brand.ts:1`), so any change to `db.ts` also affects the worker.
- `SELENA_WEB_DATABASE_URL` and `SELENA_WORKER_DATABASE_URL` are not read anywhere. `selena_app` appears only in migrations, `scripts/selena-rls-runtime-role.sql`, and the guard `assertOwnerScopedConnection` (`owner-scoped-connection.ts:48`). That guard refuses `selena_app`, or any role that does not own `sv_evidence_acceptance_receipts`, for operator-only paths.
- `withOrganizationTransaction` (`organization-transaction.ts:29`) only runs `set_config('app.organization_id', $1, true)`. It does **not** set `app.user_id`, which TZ §M2 work item 5 requires.
- **Blocker for the TZ's fail-closed rule:** Selena staging and prod run `DEPLOYMENT_MODE=local` (`SELENA_OWNER_OPERATING_GUIDE.md:5`, `SELENA_PRODUCT_COMPLETION_REPORT.md:313`, `docker/Dockerfile:56`). A rule of "fail closed when `DEPLOYMENT_MODE != local`" would therefore **never fire in production**.

### Minimal change to support `SELENA_WEB_DATABASE_URL` (selena_app), fail-closed

1. `postgres-config.ts`: extend `RuntimeDatabaseEnvironment` with `SELENA_WEB_DATABASE_URL`, `SELENA_WORKER_DATABASE_URL`, `SELENA_DATABASE_SURFACE` (`web|worker|migrate`), `DEPLOYMENT_MODE`, and a hosted marker (see point 4). Add `resolveRuntimeDatabaseUrl(env)`:
   - surface `web`: use `SELENA_WEB_DATABASE_URL`. If it is unset **and the runtime is hosted**, throw `SELENA_WEB_DATABASE_URL_REQUIRED`. Fall back to `DATABASE_URL` only for local development.
   - surface `worker`: the same, using `SELENA_WORKER_DATABASE_URL`.
   - surface `migrate`: use `DATABASE_URL`.
   - surface unset while hosted: throw.

   Then make `runtimeDatabaseConnection()` use this resolver instead of `env.DATABASE_URL`.
2. `db.ts`: remove the `drizzle(legacyDatabaseUrl)` branch so that C1 **always** goes through `runtimeDatabaseConnection()`. Today the non-CA path bypasses C2 completely, and `process.env.DATABASE_URL as string` does not even check that the variable is set. C3, C4, C5, C6 and C7 then follow automatically, because they all use C1 or C2.
3. The surface has to come from the environment, not from the importer. `db` is a module singleton that many shared lib modules import (auth, entitlements, secrets, provisioning, repositories), so a separate `web-db.ts` would not rewire them. Set `SELENA_DATABASE_SURFACE=web` on the web service and `worker` on the worker (Dockerfile targets or Railway variables). drizzle-kit keeps its own `DATABASE_URL`.
4. The fail-closed trigger must not be `DEPLOYMENT_MODE != local`, because Selena prod runs `local`. Use an explicit, positive marker instead, for example `NODE_ENV === "production"` or `RAILWAY_ENVIRONMENT_NAME` present, or better a required `SELENA_DB_ROLE_MODE=app` whose absence is itself fatal on hosted. Record the decision in the TZ. **UNVERIFIED:** which marker is reliably present on every Selena Railway service.
5. Optional but cheap: at boot on hosted, run `select current_user, r.rolbypassrls, r.rolsuper, exists(select 1 from pg_class where relowner = r.oid and relnamespace='public'::regnamespace) from pg_roles r where r.rolname=current_user`. Refuse to serve if the role bypasses RLS, is a superuser, or owns any table.
6. `organization-transaction.ts`: add an optional `userId` and `set_config('app.user_id', …, true)`. Note the prerequisites that M2-b must supply before selena_app can serve: grants on `pgboss` (enqueue, plus `SELECT/UPDATE pgboss.job`, used by `analyze-brand-job.ts:74`, `expedite-prompts.ts:31`, `prompts.ts:56`, `admin.ts:36`), `SELENA_PGBOSS_OWNER_MANAGED_SCHEMA=true`, and a bootstrap path for membership lookups (§4.3).

---

## 2. API routes (`apps/web/src/routes/api/**`): 65 files, 84 method handlers, plus the middleware-served `/api/v1/openapi.json`

### 2a. Non-Selena routes

| # | Entry point | Methods | Auth | Org scoping | Membership / role | DB path | Tables | IDOR risk | CSRF / Origin | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | `api/auth/$.ts` `/api/auth/$` | GET, POST | public / SESS (better-auth) | n/a (better-auth org plugin; org mutations blocked by middleware) | better-auth internal | C6 plain DB | user, session, account, verification, organization, member, invitation, (sso_provider, subscription) | n/a | better-auth `trustedOrigins` (`packages/lib/src/auth/server.ts:75-88`) | Signup hooks call `countUsers()` (cross-tenant count). Needs a selena_app policy or definer for the auth tables (RLS is off today) |
| A2 | `api/local-ready/index.ts` | GET | public | none | none | none | none | none | n/a | Static `{status:"ok"}` (differs from the bundle; see ROUTE_REGISTRY #1) |
| A3 | `api/manifest/index.ts` | GET | public | none | none | none | none | none | n/a | Deployment config only |
| A4 | `api/og/index.ts` | GET | public | none | none | none | none | none | n/a | Server-side fetch of the *configured* branding icon (`:50`). The URL comes from config, not the request |
| A5 | `api/plausible/event/index.ts` | POST | public | none | none | none | none | none | **none** (open proxy to plausible.io) | Allowed even in read-only mode. No DB |
| A6 | `api/plausible/js/script/index.ts` | GET | public | none | none | none | none | none | n/a | Script proxy |
| A7 | `api/setup-status/index.ts` | GET | public | none | none | **DB** `:15` `db.query.brands.findFirst()` | brands | none (returns only a boolean) | n/a | Under selena_app with no org context this returns 0 rows or throws, so the page reports "not ready". Needs a `to_regclass` probe or definer |
| A8 | `api/v1/brands/index.ts` | GET, POST | **ADMKEY** | **none: lists every brand of every tenant** | none | **DB** `:33,:37`; POST → `onboarding-core.createBrand` `db.transaction` (`onboarding-core.ts:318`, `ensureOrganization`) | brands, organization, competitors, prompts | cross-tenant by design | BEARER | Can create organizations. Legitimate only as an operator API (§4.3) |
| A9 | `api/v1/brands/$brandId.ts` | GET, PATCH | ADMKEY | brandId path param, no org | none | **DB** `:31`; PATCH → `onboarding-core.updateBrand` (`:369,:388`) | brands | cross-tenant by design | BEARER | |
| A10 | `api/v1/competitors/index.ts` | GET, POST | ADMKEY | optional `?brandId`; body `brandId` | none | **DB** `:38,:42,:71,:76,:88` | competitors, brands | cross-tenant by design | BEARER | |
| A11 | `api/v1/competitors/$competitorId.ts` | GET, PATCH, DELETE | ADMKEY | competitorId only | none | **DB** `:36,:50,:66,:83` | competitors | cross-tenant by design | BEARER | |
| A12 | `api/v1/docs/index.tsx` | GET (beforeLoad redirect) | public | none | none | none | none | none | n/a | |
| A13 | `api/v1/prompts/index.ts` | GET, POST | ADMKEY | optional `?brandId` / body brandId | none | **DB** `:34,:38,:68,:78`; entitlements (DB); BOSS (`createPromptJobScheduler`) | prompts, brands, subscription/org settings | cross-tenant by design | BEARER | |
| A14 | `api/v1/prompts/$promptId.ts` | GET, PATCH, DELETE | ADMKEY | promptId only | none | **DB** `:38,:68,:73,:95,:122,:129` (tx deletes citations, prompt_runs); BOSS | prompts, brands, citations, prompt_runs | cross-tenant by design | BEARER | |
| A15 | `api/v1/prompts/$promptId/snapshot.ts` | GET | ADMKEY | promptId only | none | **DB** `:61,:72,:73` + PGR | prompts, brands, competitors, prompt_runs, citations | cross-tenant by design | BEARER | |
| A16 | `api/v1/reports/index.ts` | GET, POST | **ADMKEY and AKEY with the same Bearer token** | AKEY tenant | `canWrite` on POST | OTX + predicate (`:64,:84,:109`); BOSS `sendReportJob` | reports | none | BEARER | **UNVERIFIED/odd:** the same token must be both an `ADMIN_API_KEYS` entry and an `sv_api_keys` digest, so in practice the route works only when an admin key was also stored as a tenant key |
| A17 | `api/v1/reports/$reportId.ts` | GET | ADMKEY + AKEY | AKEY tenant | none | OTX, `id AND organization_id` (`:40`) | reports | none (404) | BEARER | as A16 |
| A18 | `api/v1/tools/analyze.ts` | POST | ADMKEY | none | none | none (LLM + web fetch) | none | n/a | BEARER | Provider spend. Operator-only |
| A19 | `/api/v1/openapi.json` (middleware) | GET | public | none | none | none | none | none | n/a | `middleware/deployment.ts:213` |

### 2b. Selena tenant API (`/api/v1/selena/**`, D = `routes/api/v1/selena/`)

The Selena routes are exempt from ADMKEY. All of them use AKEY Bearer auth unless stated otherwise, so CSRF is n/a (BEARER). None of them accept a session.

| # | Entry point | Methods | Auth | Org scoping | Membership / role | DB path | Tables | IDOR risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| S1 | D`action-plan.ts` | POST | AKEY, `client:write` | AKEY tenant | permission | **none** (pure compute over the body) | none | none | Evidence rows come from the client |
| S2 | D`admin/local-ai-runs/$runId/retry.ts` → `selena-local-admin-api.ts` | POST | AKEY, scope `local:execute` | AKEY tenant | scope only (no platform operator) | FC | none | n/a | Idempotency-Key required. **"Admin" means any tenant key with local:execute** (same class as ROUTE_REGISTRY finding 4) |
| S3 | D`admin/local-map-runs/$runId/retry.ts` | POST | as S2 | | | FC | | | |
| S4 | D`admin/local-scan-cycles/$cycleId/approve.ts` | POST | as S2 | | | FC | | | |
| S5 | D`…/$cycleId/preflight.ts` | POST | as S2 | | | FC | | | |
| S6 | D`…/$cycleId/stop.ts` | POST | as S2 | | | FC | | | |
| S7 | D`admin/providers/$providerId/canary.ts` | POST | AKEY, scope `provider:canary` | tenant | scope | FC | | | Provider scope is not mintable through `createSelenaApiKeyFn` (**UNVERIFIED**: `PROVIDER_CANARY_SCOPE` is not in `localApiScopes`) |
| S8 | D`admin/providers/$providerId/capabilities.ts` → `selena-provider-capabilities-api.ts` | GET | AKEY | tenant | scope | FC | | | |
| S9 | D`admin/orders/$orderId/approve.ts` → `selena-admin-orders-api.ts` → `approveOrder` | POST | AKEY, scope `orders:approve` | AKEY tenant | scope; **no platform-admin check** | OTX + predicates (`selena-admin-orders.ts:100-104` `getOwnedOrder`); mints permits | sv_orders, sv_run_permits, sv_cycles, sv_audit_events, sv_payments, sv_quotes, sv_configuration_locks | none (org predicate) | `orders:approve` cannot be minted in the UI (the `createSelenaApiKeyFn` schema), so it must be inserted out of band (**UNVERIFIED** who does this). A tenant holding such a key self-approves provider spend |
| S10 | D`admin/orders/$orderId/enqueue.ts` | POST | as S9 | | | OTX + BOSS | + pgboss | none | as S9 |
| S11 | D`admin/orders/$orderId/preflight.ts` | GET | as S9 | | | OTX (`collectPreflight`, `selena-admin-orders.ts:126-180`) | | none | |
| S12 | D`citation-gaps.ts` | GET | AKEY (no permission check) | tenant | none | REPO `citationGaps.listForProject` | sv_citation_* (**UNVERIFIED** exact) | none | Errors → 400 |
| S13 | D`cycles/$cycleId/runs.ts` → `selena-cycle-runs-api.ts:27` | GET | AKEY, `client:read` | tenant | permission | OTX + predicates | sv_cycles, sv_runs, sv_response_mentions, sv_scenarios, sv_cost_events | none (404) | |
| S14 | D`cycles/index.ts` | GET, POST | AKEY; POST `client:write` | tenant; `?orderId` / body orderId, lockId | REPO `writable()` | REPO | sv_cycles, sv_orders, sv_configuration_locks | none | |
| S15 | D`dashboard.ts` | GET | AKEY | tenant, `?cycleId` | none | OTX + predicates | sv_cycles, sv_findings, sv_recommendations | none (404) | Every error → 401 |
| S16 | D`findings/index.ts` | GET, POST | AKEY; POST `client:write` | tenant, cycleId | permission | OTX + predicates | sv_cycles, sv_findings, sv_recommendations | none | Foreign cycle → GET 400, POST 404 |
| S17 | D`local-scan-cycles/$cycleId/ai-results.ts` → `selena-local-read-api.ts` | GET | AKEY, `local:read` | tenant, cycleId | scope | OTX + predicates (`:946-1345`); join predicates also carry organization_id | sv_local_scan_cycles, sv_configuration_locks, sv_pilot_cycles, sv_capture_tasks, sv_local_observations, sv_observation_evidence_assets | none (404 `SelenaLocalCycleNotFoundError`) | **Live** (not FC). HMAC cursor `SELENA_LOCAL_CURSOR_HMAC_SECRET`, fail-closed |
| S18 | D`…/evidence.ts` | GET | AKEY, `evidence:read` | as S17 | | as S17 | + sv_evidence_index, sv_source_snapshots, sv_measurement_datasets | none | |
| S19 | D`…/map-results.ts` | GET | AKEY, `local:read` | | | as S17 | sv_visibility_map_points, sv_visibility_map_datasets, … | none | |
| S20 | D`…/map-results/export.ts` | GET | as S19 | | | as S17 | as S19 | none | CSV export, org-scoped |
| S21 | D`…/progress.ts` | GET | as S19 | | | as S17 | | none | |
| S22 | D`locations/$locationId/keyword-sets.ts` → `selena-local-setup-api.ts` | POST | AKEY, `local:write` | tenant | scope | FC | | n/a | |
| S23 | D`locations/$locationId/local-scan-cycles.ts` → `selena-local-write-api.ts` | POST | AKEY, `local:write` | | | FC | | | |
| S24 | D`locations/$locationId/local-scan/quote.ts` | POST | as S23 | | | FC | | | |
| S25 | D`locations/$locationId/place-entity.ts` | PUT | as S22 | | | FC | | | |
| S26 | D`projects/$projectId/locations.ts` | POST | as S22 | | | FC | | | |
| S27 | D`locks/index.ts` | GET, POST | AKEY; POST `client:write` | tenant, projectId | REPO | REPO | sv_configuration_locks, sv_projects | none | |
| S28 | D`orders/index.ts` | GET, POST | AKEY; POST `client:write` | tenant; body projectId, quoteId, lockId | REPO | REPO | sv_orders, sv_quotes, sv_configuration_locks | none | |
| S29 | D`payments/test.ts` → `selena-test-payment-store.ts:28` | POST | AKEY, `client:write` | tenant, body orderId | **no role** (key role is always owner) | OTX + predicates (`:37-85`) | sv_orders, sv_quotes, sv_payments | none (404) | **Tenant self-pay path**, gated only by the `assertPaymentAllowed(...,"test")` kill-switch. The TZ says not to port it |
| S30 | D`pilot/cycles/$cycleId/tasks/generate.ts` | POST | AKEY (`createSelenaApiHandler`) | tenant | REPO `writable()` | REPO | sv_capture_tasks, sv_pilot_cycles | none | `pilotDisabledResponse()` returns 404 before auth |
| S31 | D`pilot/cycles/$cycleId/tasks/index.ts` | GET | AKEY | tenant | none | REPO | | none | as S30 |
| S32 | D`pilot/cycles/index.ts` | GET, POST | AKEY | tenant | REPO | REPO | sv_pilot_cycles | none | as S30 |
| S33 | D`pilot/observations/$observationId/review.ts` | POST | AKEY | tenant | REPO | REPO | sv_local_observations, … | none | as S30. No platform-operator check: a tenant reviews its own observations |
| S34 | D`pilot/observations/index.ts` | POST | AKEY | tenant | REPO | REPO | sv_local_observations, sv_observation_evidence_assets | none | as S30 |
| S35 | D`profiles.ts` | GET, POST | AKEY; POST `client:write` | tenant, projectId | REPO | REPO | sv_project_profiles | none | |
| S36 | D`projects/index.ts` | GET, POST | AKEY; POST checked by REPO | tenant | REPO | REPO | sv_projects | none | |
| S37 | D`public-scan.ts` | POST | public | none | none | none | none | none | Tombstone (canonical static payload) |
| S38 | D`quotes/index.ts` | GET, POST | AKEY; POST `client:write` | tenant, projectId, lockId | REPO | REPO | sv_quotes | none | The **client supplies the pricing object** (`quotePricingSchema`); the price is computed from client input. **UNVERIFIED** whether it is validated against the catalog |
| S39 | D`readiness/scans/$scanId.ts` | GET | public | none | none | none | none | none | Tombstone |
| S40 | D`readiness/scans/$scanId/fixes/$findingId.ts` | GET | public | none | none | none | none | none | Tombstone |
| S41 | D`readiness/verify.ts` | POST | public | none | none | none | none | none | Tombstone |
| S42 | D`scenarios/index.ts` | GET, POST | AKEY; POST `client:write` | tenant, familyId | REPO | REPO | sv_scenarios, sv_prompt_families | none | |
| S43 | D`staging/bootstrap.ts` → `selena-staging-bootstrap.ts` | POST | **public + HMAC** `x-selena-signature` + single-use nonce; gated by `assertSimulationEnvironment` | creates or looks up the org by slug `staging-simulation` | none | **DB** `:58` (organization), `:76` `db.transaction` (user, organization, member), `:123,:127` (sv_simulation_bootstrap_nonces); then OTX for sv_api_keys | organization, user, member, sv_simulation_bootstrap_nonces, sv_api_keys | n/a | Cross-tenant, needs a DEFINER or internal path. Staging only |
| S44 | D`staging/payment-event.ts` | POST | AKEY `client:write` + HMAC | tenant | permission | OTX (`selena-staging-simulation.ts:145`) | subscription / sim tables (**UNVERIFIED**) | none | Staging only |
| S45 | D`staging/simulation.ts` | POST | AKEY `client:write`; env gate | tenant | permission | OTX per action | telegram recipient / delivery sim tables | none | Action `set-webhook` reconfigures the **global** staging Telegram bot for every tenant (`registerTelegramWebhook({})`) |
| S46 | D`staging/telegram/webhook.ts` | POST | public + `x-telegram-bot-api-secret-token`; env gate | tenant taken from **signed token claims** | none | OTX(claims.tenantId) (`selena-staging-simulation.ts:265`) | telegram binding tables | none | |
| S47 | D`website-collector.ts` | POST | AKEY `client:write` | tenant, projectId | permission | OTX + predicates | sv_project_profiles, sv_website_snapshots | none | Outbound fetch of the tenant's own domain (SSRF guard in `website-security.ts`, **UNVERIFIED**) |

---

## 3. Server functions (`createServerFn`): 127 in total

CSRF for every row is SF-CSRF (server functions are same-origin checked) unless noted. The "Auth" column shows the first check performed.

### 3a. Legacy Elmo (brand-scoped) and platform

| # | File:line, fn | Method | Auth | Org scoping | Membership / role | DB path | Tables | IDOR risk | Notes |
|---|---|---|---|---|---|---|---|---|---|
| F1 | `server/admin.ts:52` getAdminStatsFn | GET | PADM | **none (all tenants)** | platform admin | **DB** `:62,:65,:82,:108,:116` + PGR admin queries | brands, prompts, prompt_runs | cross-tenant by design | operator |
| F2 | `admin.ts:165` updateDelayOverrideFn | POST | PADM | brandId | admin | **DB** `:175` | brands | by design | |
| F3 | `admin.ts:193` adminAnalyzeBrandFn | POST | PADM | none | admin | none (LLM) | – | – | spend |
| F4 | `admin.ts:601` getWorkflowDataFn | GET | PADM | none | admin | **DB** `:604,:605,:615` + C5 pg Client on pgboss | brands, prompts, prompt_runs, pgboss.job | by design | |
| F5 | `admin.ts:783` retryJobFn | POST | PADM | promptId | admin | **DB** `:798` + BOSS | prompts, pgboss | by design | |
| F6 | `admin.ts:818` getJobLogsFn | GET | PADM | jobId | admin | C5 pg Client | pgboss.job | by design | |
| F7 | `analysis.ts:65` getShareOfVoiceFn | GET | SESS | brandId | RBA | **DB** `:83` + PGR | brands, prompts, prompt_runs | none | |
| F8 | `billing.ts:52` getBillingStateFn | GET | SESS | brandId→org | RBO | entitlements / cloud billing (DB) | subscription, organization_settings | none | |
| F9 | `billing.ts:102` getPaywallStateFn | GET | SESS | optional organizationId, checked against LUO | LUO | DB | subscription, org | none | |
| F10 | `billing.ts:135` setPremiumAddonQuantityFn | POST | SESS | brandId→org | RBO + `isOrgAdminRole` | DB + Stripe | subscription, org settings | none | |
| F11 | `brands.ts:194` getBrands | GET | SESS | LUO org ids | LUO | **DB** `:203`, `:160-167` | brands, prompts, competitors | none | |
| F12 | `brands.ts:222` getBrand | GET | SESS | brandId | RBA | **DB** `:160-167` | brands, prompts, competitors | none | |
| F13 | `brands.ts:239` createBrandFn | POST | SESS | brandId used as orgId | ROA (**no role**) | **DB** `:264,:282` | brands | none | a viewer can create a brand |
| F14 | `brands.ts:299` createBrandInOrgFn | POST | SESS | `resolveBrandOrganization` (explicit or single org) | LUO (no role) | **DB** `:347` + `findUniqueBrandId` (global scan) | brands | none | |
| F15 | `brands.ts:363` updateBrandFn | POST | SESS | brandId | RBR | **DB** `:388` | brands | none | |
| F16 | `brands.ts:404` getCompetitors | GET | SESS | brandId | RBA | **DB** `:410` | competitors | none | |
| F17 | `brands.ts:418` updateCompetitors | POST | SESS | brandId | RBR | **DB** `:449` tx | competitors | none | |
| F18 | `brands.ts:472` addDomainToBrandFn | POST | SESS | brandId | RBR | **DB** `:486,:497` | brands | none | |
| F19 | `brands.ts:507` addDomainToCompetitorFn | POST | SESS | brandId + competitorId, bound at `:519-520` | RBR | **DB** `:519,:529` (the update uses `id` only, after the scoped read) | competitors | none (TOCTOU negligible) | |
| F20 | `brands.ts:541` createCompetitorFromDomainFn | POST | SESS | brandId | RBR | **DB** `:556,:565` | competitors | none | |
| F21 | `citations.ts:37` getCitationsFn | GET | SESS | brandId | RBA | **DB** `:61-63` + PGR | brands, competitors, prompts, citations | none | |
| F22 | `config.ts:31` getClientConfig | GET | **public** | none | none | **DB** `countUsers()` (`provisioning.ts:35`) | user (count) | none | cross-tenant aggregate (the `hasUsers` boolean) |
| F23 | `config.ts:58` getEnvValidationStateFn | GET | **public** | none | none | none | – | – | **Discloses the names of missing env vars** to anonymous callers (low) |
| F24 | `dashboard.ts:60` getDashboardSummaryFn | GET | SESS | brandId | RBA | **DB** `:84,:94,:95,:99` + PGR | brands, competitors, prompts, prompt_runs, citations | none | |
| F25 | `onboarding.ts:37` startAnalyzeBrandFn | POST | SESS | brandId | RBA (**no role**: a viewer can spend) | BOSS + `pgboss.job` read (`analyze-brand-job.ts:74`) | pgboss | none | spend |
| F26 | `onboarding.ts:64` getAnalyzeBrandStatusFn | POST | SESS | brandId | RBA | pgboss.job | pgboss | none | |
| F27 | `onboarding.ts:73` cancelAnalyzeBrandFn | POST | SESS | brandId | RBA (no role) | pgboss | pgboss | none | |
| F28 | `onboarding.ts:86` updateOnboardedBrandFn | POST | SESS | brandId | RBA (**no role for a write**) | **DB** via `onboarding-core.ts:217-434` | brands, competitors, prompts | none | |
| F29 | `opportunities.ts:473` getOpportunitiesFn | GET | SESS | brandId | RBA | **DB** `:481,:510` (**INSERT on GET**), `:245,:250` + PGR + LLM | brand_opportunities, brands, competitors, prompt_runs | none | A GET with side effects and spend. GET CSRF coverage is **UNVERIFIED** |
| F30 | `platform-picks.ts:174` getModelPickerStateFn | GET | SESS | brandId | RBA | **DB** `:180,:146` | brands, prompts | none | |
| F31 | `platform-picks.ts:229` getOnboardingPlatformStateFn | GET | SESS | organizationId param | ROA | DB (entitlements) | org settings | none | |
| F32 | `platform-picks.ts:253` updateEnabledModelsFn | POST | SESS | brandId | RBA (**no role for a write**) | **DB** `:265,:287,:302` | brands, prompts | none | |
| F33 | `premium-tracking.ts:27` getPremiumPoolFn | GET | SESS | brandId→org | RBO | DB (entitlements) | org settings, prompts | none | |
| F34 | `prompts.ts:40` getPromptMetadataFn | GET | SESS | brandId + promptId, bound `:47` | RBA | **DB** `:46`, `:56` (pgboss.job) | prompts, pgboss | none | |
| F35 | `prompts.ts:88` getPromptsSummaryFn | GET | SESS | brandId | RBA | **DB** `:103` + PGR | prompts, prompt_runs | none | |
| F36 | `prompts.ts:296` getPromptStatsFn | GET | SESS | promptId | PFU | **DB** `:324,:333,:351,:352,:380,:403,:408` + PGR | prompt_runs, brands, competitors | none | |
| F37 | `prompts.ts:444` getPromptRunsFn | GET | SESS | promptId | PFU | **DB** `:464,:470` | prompt_runs | none | |
| F38 | `prompts.ts:488` updatePromptsFn | POST | SESS | brandId; prompt ids bound `:554` | RBR | **DB** `:513,:518,:540` tx + BOSS/expedite (`expedite-prompts.ts:31` UPDATE pgboss.job) | prompts, pgboss | none | |
| F39 | `prompts.ts:594` getPromptChartDataFn | GET | SESS | brandId + promptId, checked `:660` | RBA + PFU | **DB** `:653,:654` + PGR | prompts, brands, competitors, prompt_runs | none | |
| F40 | `prompts.ts:781` **getPromptWebQueryFn** | GET | SESS | brandId checked; **promptId never bound to the brand** | RBA on brandId only | PGR `getPromptWebQueryCounts(data.promptId)` (`postgres-read.ts:664-677`, `WHERE prompt_id = $1`) | prompt_runs | **YES: IDOR** | See §5.2 |
| F41 | `provider-credentials.ts:41` getProviderCredentialStatusFn | GET | PADM | none | admin | DB (secrets overlay) | secrets | by design | global |
| F42 | `provider-credentials.ts:63` saveProviderCredentialFn | POST | PADM | none | admin | DB (`secrets/store.ts:93`) | secrets | by design | global |
| F43 | `query-fanout.ts:48` getQueryFanoutFn | GET | SESS | brandId; promptId filtered against the brand's prompts (`:65`) | RBA | **DB** `:69` + PGR | brands, prompt_runs | none | |
| F44 | `reports.ts:42` getReportsFn | GET | SESS + `hasReportAccess` | activeOrganizationId, else LUO[0] (ordered) | membership via LUO | OTX + predicate | reports | none | |
| F45 | `reports.ts:63` getLegacyReportsFn | GET | SESS + isAdmin | – | admin | none (throws) | – | – | |
| F46 | `reports.ts:71` getReportByIdFn | GET | as F44 | as F44 | | OTX, `id AND org` (`:80`) | reports | none | |
| F47 | `reports.ts:91` createReportFn | POST | as F44 | as F44 | (no role) | OTX + BOSS | reports | none | |
| F48 | `team.ts:33` listTeamFn | GET | SESS | brandId→org | RBO | **DB** `:43,:56` | member, user, invitation | none | |
| F49 | `team.ts:74` updateOrganizationFn | POST | SESS | brandId→org | RBO + `isOrgAdminRole` | **DB** `:84` | organization | none | |
| F50 | `team.ts:88` inviteTeamMemberFn | POST | SESS | brandId→org | RBO. The role check is delegated to better-auth (**UNVERIFIED**) | better-auth (C6) | invitation | none | |
| F51 | `team.ts:109` cancelInvitationFn | POST | SESS | brandId checked; **invitationId not bound to that org** | RBA only | better-auth `cancelInvitation` | invitation | **LOW / UNVERIFIED** (relies on better-auth checking the caller's role in the invitation's org) | |
| F52 | `team.ts:124` removeTeamMemberFn | POST | SESS | brandId→org; memberId bound `:131-133` | RBO + better-auth | **DB** `:131` | member | none | |
| F53 | `team.ts:148` getInvitationFn | GET | SESS | invitationId only | none | better-auth | invitation, organization | **LOW / UNVERIFIED** (better-auth may restrict to the invitee's email) | |
| F54 | `team.ts:160` acceptInvitationFn | POST | SESS | invitationId | better-auth | better-auth | invitation, member | as F53 | |
| F55 | `visibility.ts:62` getBatchChartDataFn | GET | SESS | brandId | RBA | **DB** `:96,:97` + PGR | brands, competitors, prompts, prompt_runs | none | |
| F56 | `visibility.ts:142` getFilteredVisibilityFn | GET | SESS | brandId | RBA | PGR (+ prompt-resolution DB `prompt-resolution.ts:45`) | prompts, prompt_runs, citations | none | |
| F57 | `lib/auth/session.ts:10` getSession | GET | public | – | – | better-auth | session, user | none | returns the caller's own session or null |
| F58 | `lib/auth/session.ts:16` ensureSession | GET | SESS | – | – | better-auth | session | none | |
| F59 | `routes/_authed/app/$brand.tsx:52` getBrandData (loader) | GET | SESS | brandId, or brandId-as-orgId | COA | **DB** `:57,:77,:78` + billing | brands, prompts, competitors | none | returns DENIED instead of 404 |
| F60 | `routes/_authed/app/new.tsx:60` getNewBrandOptions (loader) | GET | SESS | LUO | LUO | **DB** `new.tsx:50` + entitlements | brands | none | |
| F61 | `routes/_authed/app/$brand/settings/prompts.tsx:19` getPromptsForEditing (loader) | GET | SESS | brandId | RBA | **DB** `:26` | prompts | none | |
| F62 | `routes/_authed/admin.tsx:14` checkAdminAccess (beforeLoad) | GET | SESS | – | isAdmin | none | – | – | |
| F63 | `routes/_authed/reports/render/$reportId.tsx:72` loadReportData (loader) | GET | SESS + hasReportAccess | delegates to F46 | as F46 | OTX | reports | none | |
| F64 | `routes/_authed/reports/index.tsx:26` checkReportAccess (beforeLoad) | GET | SESS | – | – | none | – | – | |

### 3b. Selena server functions (session)

All rows except the public ones use SCTX (tenant = activeOrganizationId, or an **unordered** `rows[0]`). Tenant data goes through OTX with explicit `organization_id` predicates. Writes through REPO/RECREPO enforce `writable()`, which blocks viewers.

| # | File:line, fn | Method | Auth | Org scoping | Membership / role | DB path | Tables | IDOR | Notes |
|---|---|---|---|---|---|---|---|---|---|
| G1 | `selena-admin-orders.ts:219` getSelenaAdminAccessFn | GET | SESS | – | isAdmin | none | – | – | |
| G2 | `selena-admin-orders.ts:224` getSelenaAdminOrderQueueFn | GET | **PADM + SCTX** | **the admin's own active tenant** | platform admin and a member of the tenant | OTX + predicates `:226-274` | sv_orders, sv_cycles, sv_qc_records | none | The operator only sees orgs they belong to, so this is not cross-tenant today |
| G3 | `selena-admin-orders.ts:284` getSelenaOrderPreflightFn | GET | PADM + SCTX | as G2 | | OTX (`collectPreflight`) | sv_orders, locks, quotes, cycles, permits, runs, payments | none | |
| G4 | `…:388` approveSelenaOrderFn | POST | PADM + SCTX | as G2 | | OTX + audit | + sv_run_permits, sv_audit_events | none | |
| G5 | `…:392` enqueueSelenaOrderRunsFn | POST | PADM + SCTX | as G2 | | OTX + BOSS | + pgboss | none | |
| G6 | `…:398` stopSelenaOrderFn | POST | PADM + SCTX | as G2 | | OTX `:416-433` | sv_orders, sv_cycles, audit | none | |
| G7 | `…:455` deliverSelenaOrderFn | POST | PADM + SCTX | as G2 | | OTX (REPO) | sv_orders, audit | none | |
| G8 | `…:463` recordSelenaQcFn | POST | PADM + SCTX | as G2 | | REPO qcRecords | sv_qc_records | none | |
| G9 | `selena-api-keys.ts:30` createSelenaApiKeyFn | POST | SCTX | tenant | owner + canWrite (`:25`) | OTX | sv_api_keys | none | allowed scopes: client:read/write, measurement:dispatch, local:* , evidence:read |
| G10 | `selena-api-keys.ts:60` listSelenaApiKeysFn | GET | SCTX | tenant | **none** (any member lists key metadata) | OTX + predicate | sv_api_keys | none | |
| G11 | `selena-api-keys.ts:78` revokeSelenaApiKeyFn | POST | SCTX | tenant, keyId bound `:89-90` | owner | OTX | sv_api_keys | none | |
| G12 | `selena-client.ts:26` listSelenaProjectsFn | GET | SCTX | tenant | – | REPO | sv_projects | none | |
| G13 | `selena-client.ts:31` getSelenaWorkspaceFn (loader: selena-order, selena-report) | GET | SCTX | tenant | – | REPO + OTX + predicates `:36-100` | sv_projects, profiles, website snapshots, cycles, orders, recommendation runs | none | |
| G14 | `selena-client.ts:175` createSelenaProjectFn | POST | SCTX | tenant | writable | REPO | sv_projects | none | |
| G15 | `selena-client.ts:182` getSelenaProjectFn | GET | SCTX | tenant, projectId | – | REPO | sv_projects | none | |
| G16 | `selena-commerce.ts:28` createSelenaQuoteFn | POST | SCTX | tenant | writable | REPO | sv_quotes | none | |
| G17 | `selena-commerce.ts:53` createSelenaOrderFn | POST | SCTX | tenant | writable | REPO | sv_orders | none | |
| G18 | `selena-commerce.ts:73` createSelenaTestPaymentFn | POST | SCTX | tenant | canWrite (member or owner) | OTX (test-payment store) | sv_payments, sv_orders | none | **self-pay**, kill-switch only |
| G19 | `selena-cycle-compare.ts:27` getSelenaCycleCompareFn | GET | SCTX | tenant, projectId | – | REPO + OTX | sv_cycles, sv_orders, sv_runs | none | |
| G20 | `selena-dashboard.ts:9` getSelenaDashboardFn | GET | SCTX | tenant, cycleId | – | OTX + predicates | sv_cycles, sv_findings, sv_recommendations | none | |
| G21 | `selena-findings.ts:18` generateSelenaFindingsFn | POST | SCTX | tenant, cycleId | **no role / writable check** (a viewer can write findings) | OTX + predicates | sv_findings, sv_recommendations | none | |
| G22 | `selena-free-ai-visibility.ts:32` claimFreeAiVisibilityCheckFn | POST | SCTX + emailVerified | tenant | – | **DB** `:22` (user.emailVerified), then OTX + `sv_claim_free_ai_visibility()` (a global cap via a DEFINER fn) + BOSS | user, sv_free_ai_visibility_* | none | |
| G23 | `selena-free-ai-visibility.ts:67` getFreeAiVisibilityCheckStatusFn | GET | as G22 | tenant | – | DB `:22` + OTX | same | none | |
| G24 | `selena-grader-report.ts:72` getSelenaGraderReportFn | GET | SCTX | tenant, projectId | – | REPO + OTX + predicates | projects, profiles, snapshots, recommendation runs, cycles, orders, locks, scenarios, runs | none | report read |
| G25 | `selena-horeca.ts:78` getSelenaHorecaWorkspaceFn | GET | SCTX | tenant | – | REPO + OTX (`:46-70`) | sv_evidence_read_model, sv_entities, … | none | |
| G26 | `selena-local-visibility.ts:14` getSelenaLocalVisibilityStateFn | GET | **public** | – | – | none | – | – | flag state only |
| G27 | `selena-measurement-view.ts:34` getSelenaMeasurementFn | GET | SCTX | tenant, projectId | – | REPO + OTX | cycles, orders, families, scenarios, runs | none | |
| G28 | `selena-onboarding.ts:25` confirmSelenaProfileFn | POST | SCTX | tenant | writable | REPO | sv_project_profiles | none | |
| G29 | `selena-onboarding.ts:103` startSelenaProfileSuggestionFn | POST | SCTX (via `requireProject`) | tenant, projectId | **no role** (a viewer can spend) | REPO + **DB** `reserveSuggestSpend(db)` `:119` (DEFINER `sv_reserve_provider_spend`) + BOSS + pgboss.job read | sv_provider_spend_*, pgboss | none | spend |
| G30 | `selena-onboarding.ts:148` getSelenaProfileSuggestionFn | POST | SCTX | tenant | – | REPO + pgboss.job | pgboss | none | |
| G31 | `selena-onboarding.ts:163` cancelSelenaProfileSuggestionFn | POST | SCTX | tenant | no role | REPO + pgboss | pgboss | none | |
| G32 | `selena-order-analysis.ts:114` analyzeSelenaOrderFn | POST | PADM + SCTX | admin's tenant | admin | OTX + REPO | sv_orders, sv_configuration_locks, sv_runs | none | |
| G33 | `selena-order-desk.ts:34` getSelenaOrderDeskFn | GET | PADM + SCTX | admin's tenant | admin | OTX + predicates (`selena-order-desk-core.ts:80-111`) | projects, families, scenarios | none | |
| G34 | `selena-order-desk.ts:38` prepareSelenaScenariosFn | POST | SCTX | tenant, projectId | writable (REPO) | OTX + REPO | families, scenarios | none | |
| G35 | `selena-order-desk.ts:42` decideSelenaScenariosFn | POST | SCTX | tenant, scenarioIds bound `:198-210` | **no explicit role** (**UNVERIFIED**: direct tx update) | OTX + predicates | sv_scenarios | none | a viewer may be able to approve scenarios |
| G36 | `selena-order-desk.ts:51` createSelenaOrderDraftFn | POST | PADM + SCTX | admin's tenant | admin | OTX (`core.ts:248-472`). **`:284` selects sv_payments by `providerEventId` with no org predicate**, then compares orgs in application code | sv_payments, orders, locks, quotes, scenarios, profiles | **LOW** (existence oracle on the owner connection) | |
| G37 | `selena-order-desk.ts:55` startSelenaMeasurementFn | POST | PADM + SCTX | as G36 | admin | as G36 + approve/enqueue + BOSS | + permits, pgboss | LOW (as G36) | |
| G38 | `selena-order-requests.ts:172` createSelenaOrderRequestFn | POST | SCTX | tenant, projectId | (no role) | REPO + OTX; `sv_redeem_pilot_invite()` and `sv_claim_free_auto_dispatch()` (global DEFINER fns) + BOSS | sv_order_requests, sv_pilot_invites, sv_free_auto_dispatch_claims, audit | none | |
| G39 | `selena-order-requests.ts:239` listSelenaOrderRequestsFn | GET | PADM + SCTX | admin's tenant | admin | OTX + predicate | sv_order_requests, sv_projects | none | The **"request inbox" only shows the admin's own org**. Cross-tenant intent is **UNVERIFIED** |
| G40 | `selena-order-requests.ts:267` updateSelenaOrderRequestStatusFn | POST | PADM + SCTX | as G39 | admin | OTX + predicate | sv_order_requests | none | |
| G41 | `selena-public-scan.ts:6` runSelenaPublicScanFn | POST | **public** | – | – | none | – | – | static payload |
| G42 | `selena-raw-evidence.ts:26` getSelenaRawEvidenceUrlFn | POST | SCTX | tenant, runId | – | REPO `runs.rawEvidenceFor` (OTX + audit) + presigned S3 (600 s) | sv_runs, audit | none | signed, time-limited URL (compliant with TZ item 7) |
| G43-47 | `selena-recommendations.ts:13-17` run/status/findings/recommendations/actionPlan | POST/GET | SCTX | tenant, runId/projectId | RECREPO (create checks evidence tenant) | OTX + predicates | sv_recommendation_* | none | |
| G48 | `selena-reporting.ts:31` exportSelenaCsvFn | POST | SCTX | tenant (rejects a foreign `tenantId`) | – | none (**CSV built from client-supplied rows**) | – | none | The export is **not** sourced from the DB, so it proves nothing about tenant data |
| G49-56 | `selena-resources.ts:10-65` create/list family, scenario, lock, cycle | POST/GET | SCTX | tenant | REPO writable on create | REPO | families, scenarios, locks, cycles | none | |
| G57 | `selena-run-explorer.ts:43` listSelenaRunsFn | GET | SCTX | tenant, cycleId | – | OTX + predicates | sv_runs, sv_scenarios | none | |
| G58 | `selena-run-explorer.ts:87` getSelenaRunDetailFn | GET | SCTX | tenant, runId | – | OTX + predicates | sv_runs, sv_response_mentions, sv_scenarios | none | |
| G59 | `selena-scenarios.ts:26` listSelenaScenariosFn | GET | SCTX | tenant, projectId | – | REPO + OTX | scenarios, families | none | |
| G60 | `selena-scenarios.ts:50` reviewSelenaScenarioFn | POST | SCTX | tenant | REPO writable | REPO | sv_scenarios | none | |
| G61 | `selena-sources.ts:15` getSelenaSourceMapFn | GET | SCTX | tenant, projectId | – | REPO | citation gaps | none | |
| G62 | `selena-sources.ts:47` listSelenaSourceProjectsFn (loader: selena-sources) | GET | SCTX | tenant | – | REPO | sv_projects | none | |
| G63 | `selena-website-collector.ts:14` collectSelenaWebsiteFn | POST | SCTX | tenant, projectId | (no role) | OTX + RECREPO + outbound fetch | profiles, website snapshots, recommendation runs | none | |

Route loaders: all loader and beforeLoad data access goes through the server functions above (F57-F64, G13, G62, F9, F41, G1-G2, F23). No other loader touches the DB directly.

---

## 4. Summaries

### 4.1 Entry points using plain `db.` or the owner pools outside OTX (break under `selena_app` + FORCE RLS without `app.organization_id`)

**Shared primitives.** These are hit by almost every session or key entry point:
- `lib/selena-auth-context.ts:32` (SCTX member lookup) and `:52` (AKEY via a DEFINER fn: fine once granted EXECUTE).
- `lib/auth/helpers.ts:115` (checkOrgAccess), `:134-141` (RBA), `:162` (RBO/RBR), `:192` (PFU), `:208` (LUO).
- better-auth adapter `packages/lib/src/auth/server.ts:81`; `countUsers` `packages/lib/src/db/provisioning.ts:35`; entitlements `packages/lib/src/entitlements/{service,guards}.ts`; secrets `packages/lib/src/secrets/store.ts:56,93`; `findUniqueBrandId` `provisioning.ts:117`.
- `lib/postgres-read.ts:21/:133` (separate pool: every analytics read on prompt_runs and citations).
- pgboss.job SQL: `lib/analyze-brand-job.ts:74`, `lib/expedite-prompts.ts:31`, `server/prompts.ts:56`, `server/admin.ts:36`; `lib/job-scheduler.ts:28,38`.

These tables currently have **RLS disabled** (auth tables) or **RLS enabled with no policy** (brands, prompts, competitors, prompt_runs, citations, secrets, organization_settings, …). Under selena_app they would return 0 rows for every legacy-Elmo entry point.

**API routes:** A7 `setup-status/index.ts:15`; A8 `v1/brands/index.ts:33,37` (+ `onboarding-core.ts:318`); A9 `v1/brands/$brandId.ts:31` (+ `onboarding-core.ts:369,388`); A10 `v1/competitors/index.ts:38,42,71,76,88`; A11 `v1/competitors/$competitorId.ts:36,50,66,83`; A13 `v1/prompts/index.ts:34,38,68,78`; A14 `v1/prompts/$promptId.ts:38,68,73,95,122,129`; A15 `v1/prompts/$promptId/snapshot.ts:61,72,73` (+PGR); A1 `auth/$` (better-auth); S43 `selena-staging-bootstrap.ts:58,76,123,127`.

**Server functions (fn:line → db lines):**

| Group | Entry points |
|---|---|
| admin (legacy) | F1 `admin.ts:52` (`:62,65,82,108,116` + PGR); F2 `:165` (`:175`); F4 `:601` (`:604,605,615`); F5 `:783` (`:798`); F6 `:818` (pg Client `:36`) |
| analysis | F7 `analysis.ts:65` (`:83` + PGR) |
| billing and entitlements | F8 `billing.ts:52`; F9 `:102`; F10 `:135`; F31 `platform-picks.ts:229`; F33 `premium-tracking.ts:27` |
| brands | F11 `brands.ts:194` (`:203,160-167`); F12 `:222`; F13 `:239` (`:264,282`); F14 `:299` (`:347`); F15 `:363` (`:388`); F16 `:404` (`:410`); F17 `:418` (`:449`); F18 `:472` (`:486,497`); F19 `:507` (`:519,529`); F20 `:541` (`:556,565`) |
| citations, dashboard, visibility | F21 `citations.ts:37` (`:61-63` + PGR); F24 `dashboard.ts:60` (`:84,94,95,99` + PGR); F55 `visibility.ts:62` (`:96,97` + PGR); F56 `visibility.ts:142` (PGR, `prompt-resolution.ts:45`) |
| config | F22 `config.ts:31` (`countUsers`) |
| onboarding | F25–F27 `onboarding.ts:37,64,73` (pgboss `analyze-brand-job.ts:74`); F28 `onboarding.ts:86` (`onboarding-core.ts:217-434`) |
| opportunities | F29 `opportunities.ts:473` (`:245,250,481,510`) |
| platform picks | F30 `platform-picks.ts:174` (`:146,180`); F32 `:253` (`:265,287,302`) |
| prompts | F34 `prompts.ts:40` (`:46,56`); F35 `:88` (`:103`); F36 `:296` (`:324,333,351,352,380,403,408`); F37 `:444` (`:464,470`); F38 `:488` (`:513,518,540`); F39 `:594` (`:653,654`); F40 `:781` (PGR `:664`) |
| provider credentials | F41, F42 `provider-credentials.ts:41,63` (secrets) |
| query fanout | F43 `query-fanout.ts:48` (`:69`) |
| team | F48 `team.ts:33` (`:43,56`); F49 `:74` (`:84`); F52 `:124` (`:131`); F50/F51/F53/F54 (better-auth adapter) |
| route loaders | F59 `$brand.tsx:52` (`:57,77,78`); F60 `new.tsx:60` (`:50`); F61 `settings/prompts.tsx:19` (`:26`) |
| Selena | G22/G23 `selena-free-ai-visibility.ts:22` (user); G29 `selena-onboarding.ts:119` (`reserveSuggestSpend(db)`: a DEFINER fn, needs only EXECUTE); G36/G37 are inside OTX, but `selena-order-desk-core.ts:284` depends on the owner seeing foreign sv_payments rows; every Selena session fn inherits the SCTX lookup `selena-auth-context.ts:32` |

### 4.2 IDOR (an object id from the request used without an organization predicate)

| Sev | Entry point | Where | Detail |
|---|---|---|---|
| **MEDIUM** | F40 `getPromptWebQueryFn` | `server/prompts.ts:781-823` → `lib/postgres-read.ts:664-677` | Access is checked for `brandId`, but `promptId` is passed straight to `WHERE prompt_id = $1`. Tenant B, with any brand of its own, can read tenant A's web-search queries per model for any known prompt UUID. Fix: filter through `resolveFilteredPrompts(brandId)` as `query-fanout.ts:65` does, or use `promptForUser` |
| **HIGH (by design; blast radius)** | A8–A11, A13–A15, A18 `/api/v1/{brands,competitors,prompts,tools}` | route files above | These have no tenant model at all. A single `ADMIN_API_KEYS` bearer reads and writes every tenant's brands, competitors and prompts, and deletes prompt runs and citations. These are not tenant IDORs, but they must move to `selena_internal` with an audit trail, or be removed from the Selena deployment |
| LOW / UNVERIFIED | F51 `cancelInvitationFn` | `server/team.ts:109-121` | `invitationId` is not bound to the brand's org. Safety depends on better-auth checking the caller's role in the invitation's org |
| LOW / UNVERIFIED | F53 `getInvitationFn`, F54 `acceptInvitationFn` | `team.ts:148,160` | Any authenticated user can pass any invitationId. Whether better-auth enforces the invitee's email is UNVERIFIED |
| LOW | G36/G37 order draft | `selena-order-desk-core.ts:284` | `sv_payments` is looked up by `providerEventId` without an org predicate, then compared in application code. It works as an existence oracle only for platform admins |
| none found | every Selena REPO/OTX path, the local read API, `/api/v1/reports` | – | Every inspected query has `organization_id = tenant` |

Authorization gaps that are not IDOR:
- **Writes gated only by RBA, so viewers can write:** F13, F25, F27, F28, F32, F47, G21, G29, G31, G35 (UNVERIFIED), G38, G63.
- **Unordered tenant fallback:** SCTX takes `rows[0]` without ORDER BY (`selena-auth-context.ts:37`), whereas `reports.ts` and billing use the ordered LUO.
- **Self-pay:** S29 and G18.
- **"Admin" routes gated only by tenant key scope:** S2–S8 and S9–S11.
- **Global effect from one tenant:** S45 `set-webhook` changes the Telegram bot for everyone.
- **Anonymous disclosure:** F23 reveals the names of missing env vars.

### 4.3 Entry points that legitimately need cross-tenant access (selena_internal or SECURITY DEFINER)

| Need | Entry points |
|---|---|
| Platform operator, all tenants | F1–F6 (legacy admin dashboard, pg-boss logs); F41–F42 (global `secrets`); A8–A11, A13–A15, A18 (ADMIN_API_KEYS API) |
| Platform operator today scoped to the admin's own active org, which **must become** explicit-tenant plus audit under selena_internal if operators are meant to serve customers | G2–G8, G32, G33, G36, G37, G39, G40 |
| Identity bootstrap (runs before any tenant context exists) | SCTX member lookup, RBA/RBO/RBR/PFU/LUO/COA/ROA brand→org resolution, the better-auth adapter (A1, F50–F54, F57, F58), `countUsers` (F22 + signup hooks), provisioning (`provisionLocalOrg`, `provisionUmbrellaOrg`, `ensureOrganization`, `findUniqueBrandId`). AKEY already uses DEFINER `sv_resolve_api_key_context` |
| Global counters, caps and budgets (already DEFINER fns; need EXECUTE grants only) | `sv_claim_free_ai_visibility` (G22), `sv_claim_free_auto_dispatch` / `sv_release_…` and `sv_redeem_pilot_invite` (G38), `sv_reserve/settle/release_provider_spend` and `sv_provider_spend_committed` (G29; preflight G3/S11 **UNVERIFIED**) |
| Worker-invoked from web (pg-boss) | every BOSS enqueue (F5, F25, F38, F47, G5, G22, G29, G37, G38, A13, A14, A16) and direct `pgboss.job` SQL (`analyze-brand-job.ts:74`, `expedite-prompts.ts:31`, `prompts.ts:56`, `admin.ts:36`). These need pgboss-schema grants for selena_app, or a narrow DEFINER |
| Public scans | none any more: S37, S39–S41 and G41 are static tombstones |
| Staging rig | S43 bootstrap (creates user, org, member and the nonce ledger), S46 telegram webhook (tenant from a signed token; fine via OTX), S45 set-webhook (global) |
| Health probe | A7 setup-status (replace it with a `to_regclass` or DEFINER probe) |

### 4.4 Public or anonymous endpoints and what they can reach

| Endpoint | Reaches |
|---|---|
| A1 `/api/auth/*` | better-auth: user, account, session and verification (sign-in, sign-up with hooks, password reset, email verification). Org mutations are blocked by middleware |
| A2 local-ready, A3 manifest, A12 docs, A19 openapi.json | static data and config |
| A4 `/api/og` | config, plus a server-side fetch of the configured branding icon |
| A5 `/api/plausible/event`, A6 `…/js/script` | outbound proxy to plausible.io. **A5 is an unauthenticated POST relay** with no Origin check |
| A7 `/api/setup-status` | `SELECT … FROM brands LIMIT 1` on the owner connection; returns a boolean |
| S37, S39, S40, S41 readiness tombstones | static payload |
| S43 `/api/v1/selena/staging/bootstrap` | behind HMAC and a staging env gate: creates or rotates the simulation org, user, member and API key |
| S46 `/api/v1/selena/staging/telegram/webhook` | behind a Telegram secret header and a staging env gate: binds a chat to the tenant named in a signed token |
| F22 getClientConfig | `count(*)` from `user` (the `hasUsers` boolean) |
| F23 getEnvValidationStateFn | the **names** of missing env vars |
| F57 getSession | the caller's own session or null |
| G26 getSelenaLocalVisibilityStateFn, G41 runSelenaPublicScanFn | env flags or a static payload |

None of them read tenant business data.

### 4.5 Counts

| Metric | Count |
|---|---|
| API route files (excluding the one test) | 65 (18 non-Selena + 47 Selena), plus 1 middleware-served (`openapi.json`) |
| API method handlers | 84 (28 non-Selena incl. the docs redirect, 56 Selena) |
| Server functions (`createServerFn`) | 127 (119 in `server/`, 2 in `lib/auth/session.ts`, 6 in route files) |
| Total server-side entry points (files × methods + server fns) | 212 (+1 openapi) |
| Auth: public/anonymous | API 16 handlers (A1×2, A2–A7, A12, A19, S37, S39–S41, S43, S46) · server fns 5 (F22, F23, F57, G26, G41) |
| Auth: ADMIN_API_KEYS (deployment-wide) | 16 handlers (A8–A11, A13–A15, A18), plus A16–A17 (3 handlers) that require ADMKEY **and** AKEY |
| Auth: tenant API key (AKEY) | 50 Selena handlers (12 of them FC stubs with no DB) |
| Auth: session, legacy brand/org checks | 53 server fns (F7–F21, F24–F40, F43–F64, excluding the public and PADM rows) |
| Auth: session SCTX (Selena) | 48 server fns (G1 and the SCTX-only G rows) |
| Auth: platform admin (PADM) | 8 legacy (F1–F6, F41, F42) + 13 Selena PADM+SCTX (G2–G8, G32, G33, G36, G37, G39, G40) |
| Plain `db`/PGR/pg-boss/better-auth outside OTX (breaks under selena_app) | API **10 route files / 19 handlers** (A1, A7–A11, A13–A15, S43) · server fns **60** (55 legacy F-rows + G22, G23, G29–G31) · plus **every** session entry point through the SCTX or RBA membership lookup, and every AKEY entry point through the DEFINER bootstrap (grant only) |
| IDOR confirmed | 1 MEDIUM (F40). Plus 8 route files by design with ADMKEY and no tenant; 3 LOW/UNVERIFIED (F51, F53/F54, G36/G37) |
| Fail-closed stubs (no DB) | 12 handlers (S2–S8, S22–S26) |
