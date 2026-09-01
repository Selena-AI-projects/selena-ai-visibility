# Selena AI Visibility v1.3 — hosted acceptance matrix

Evidence date: `2026-09-01`. This document is the canonical post-hosted
acceptance snapshot. Earlier pre-mutation candidates remain Git history only.

## Canonical anchors

- Accepted implementation source: `100d34d8` (merge parent `5cbb7b25`; canonical
  `0045`, follow-up `0053`, exact historical-hash compatibility gate)
- Feature/PR HEAD when the first canary ran: `3872a396dabfb6763b2b93f70ea3c521f12d8688`
- Evidence baseline before this update: `8c5a8948143feac7738df50c274459e23d437ddb`
- Active worker implementation source: `100d34d8`
- Integrated release parent: `5cbb7b256f286295a3dafdbeddc9aa46e24227f7`
- Original release snapshot retained for lineage: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Draft PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Protected untracked `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md`: untouched and excluded.

The accepted implementation source, canary-time feature HEAD and worker runtime
are separate evidence anchors. The automatic `release@5cbb7b25` web deployment
temporarily superseded the first two-axis UI receipt. Exact archive deployment
`10b51bd2-ff1b-41a7-b9f8-6d628ea9f8f0` then restored `100d34d8` as the active
staging web candidate and passed the hosted recheck.

## Decision

| Boundary | Decision | Reason |
|---|---|---|
| Source package | `PASS_SOURCE` | Provider, database/evidence and HoReCa streams are code-complete for the authorized v1.3 scope. Release `5cbb7b25` is merged and the applied-`0045` hash transition is bounded to one reviewed timestamp/hash pair. |
| Exact-head CI | `PASS` | Build, E2E, scheduling, smoke, license and CLA checks all passed on accepted implementation source `100d34d8`. |
| Staging database/RLS | `PASS` | Fresh backup `d2ac59a9…`, migrations through `0053`, actual non-owner runtime role, GUC, FORCE RLS and rollback-only cross-tenant proof were recorded. |
| Staging web/worker | `PASS_EXACT_WEB / PASS_EXACT_WORKER` | Exact archive `100d34d8` is active on both staging web and worker. |
| Public/unauthenticated browser and scoped API | `PASS` | Browser smoke, authenticated API-key tenant fences and invalid-key response passed. |
| Authenticated human browser | `PASS` | Owner signed in interactively. AVLI and KORA routes, Local-first states, hidden-module boundary and sanitized customer payload passed without sharing credentials. |
| Google/Bright Data canary | `COST_PASS / OUTCOME_UNKNOWN / HOLD` | The historical authorization produced exactly one `GOOGLE_AI_MODE` trigger with `providerCalls=1`, `retries=0`, `recurring=false`. The newly authorized diagnostic reached only the exact-worker preflight and was blocked with `MASTER_PROVIDER_GATE_CLOSED`, `providerCalls=0`, cost `USD 0`. Source `100d34d8` also binds the command to the already reserved once-only identity, so no second trigger can run without a separately reviewed identity change. |
| Production/merge | `NO_GO` | The canary lifecycle remains unresolved; production is prohibited and PR #96 remains unmerged. |

Overall decision: `STAGING_CANARY_HOLD / PRE_PRODUCTION_NO_GO`.

## Canary-time CI evidence

All checks below passed against feature/PR HEAD
`3872a396dabfb6763b2b93f70ea3c521f12d8688`:

| Check | Result | Evidence |
|---|---|---|
| Build | `PASS` | [run 33488531122 / job 99794236902](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33488531122/job/99794236902) |
| E2E Integration Tests | `PASS` | [run 33488531185 / job 99794237362](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33488531185/job/99794237362) |
| Scheduling Policy Verification | `PASS` | [run 33488531185 / job 99794237836](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33488531185/job/99794237836) |
| Dependency License Audit | `PASS` | [run 33488531127 / job 99794237322](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33488531127/job/99794237322) |
| Deployment smoke | `PASS` | [run 33488531304 / job 99794237112](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33488531304/job/99794237112) |
| CLA | `PASS` | [run 33488531060 / job 99794236769](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33488531060/job/99794236769) |

The preceding red Build on `d4ac606a` was a real-timer test flake. Commit
`2d023470` moved only that test to deterministic fake time; later feature work
advanced the PR to `3872a396`, where all six required checks passed.

Previously recorded local root gates for the accepted `2d023470` runtime tree:
lint `0 errors / 129 warnings / 12 infos`, typecheck `13/13`, tests `16/16`
tasks, Impeccable detect `PASS`, build `16/16`, `git diff --check` clean. The
warnings/infos are the registered root baseline and are non-blocking. Local Node
was `22.23.0`; CI used the required Node 24.

## Staging infrastructure evidence

| Gate | Result | Receipt |
|---|---|---|
| Fresh checkpoint | `PASS` | Pre-`0053` backup `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`, external snapshot reference present, no expiry. Earlier isolated restore receipt `a34b2749…` remains the recovery-path proof. |
| Isolated restore | `PASS` | Restore service `a34b2749-130a-47f3-8da3-8f58e3775fe9` became healthy and proved an actual restored copy. |
| Migration bound | `PASS` | Bounded runner deployment `76fe0d58-0fd8-4213-9b11-f852e72de7f8` applied only `0053`: journal `53/1787940014000` → `54/1787940015000`, runner exit `0`. |
| Post-`0053` schema/RLS | `PASS` | Values-suppressed readback proved `selena_app`, non-owner/no `BYPASSRLS`, FORCE RLS, `legacy_collision_ordinal`, validated nonnegative check, the three-column unique index and insert guard. |
| Runtime role | `PASS` | `current_user=selena_app`; `SUPER=false`, `BYPASS_RLS=false`, `CREATE_ROLE=false`, `CREATE_DB=false`. |
| Administration credential | `PASS` | After the owner-confirmed Postgres rotation, a values-suppressed count-only TCP probe through the service's sealed `POSTGRES_USER`/`POSTGRES_PASSWORD` binding returned `ADMIN_TCP=PASS`. |
| Tenant GUC | `PASS` | `SET LOCAL app.organization_id` succeeded through the active worker connection. |
| Hosted RLS proof | `PASS` | `current_user=selena_app`; `SELECT`/`INSERT` allowed; FORCE RLS active; cross-tenant insert failed with SQLSTATE `42501`; transaction ended in `ROLLBACK`; persisted fixture rows `0`. |
| Replay/concurrency/idempotency | `PASS` | Two concurrent writes produced one winner; replay was stable; cross-tenant read returned no row; active mutation was blocked; expired fixture cleaned up. |
| Exact web deploy | `PASS` | Deployment `10b51bd2-ff1b-41a7-b9f8-6d628ea9f8f0` from git archive `100d34d8`, image `sha256:b92d8e81a26aa20127b681f153bfb32d798673e4128009019fb44101006f1536`. |
| Two-axis UI receipt | `PASS_ACTIVE` | Authenticated DOM and visual review on the exact deployment proved `PROJECTS / HoReCa projects` in the complementary left rail and `TOOLS / Workspace tools` across the top with all six tool links. |
| Worker deploy | `PASS_EXACT` | Deployment `b26865a7-57c4-4fdb-a1a0-567172b10619` from exact archive `100d34d8`, image `sha256:b546171d7606994e3bf5cd1707ae44802a452613917f0704a6d5e896b812a976`. |
| Public health | `PASS` | `app.selenasystems.com`, `staging.selenasystems.com` and `/api/setup-status` returned HTTP 200. |
| Runtime containment | `PASS` | Logs: legacy provider execution disabled; recurring scheduler disabled and managed schedules removed; pg-boss started; handlers ready; no error-level log. |
| Canary trigger receipt | `HOLD` | Exactly one `GOOGLE_AI_MODE` trigger: `OUTCOME_UNKNOWN/LIFECYCLE_OUTCOME_UNKNOWN`, `providerCalls=1`, `retries=0`, `recurring=false`; no provider capture persisted. |
| Snapshot lifecycle journal | `PARTIAL/HOLD` | `TRIGGERED=1`, `PENDING=2`, `READY=1`, `INTERRUPTED=1`; no terminal provider outcome was proved. |
| Steady-state containment | `PASS` | Measurement off, emergency stop on, recurring off and billing off after the bounded trigger. |
| Additional diagnostic preflight | `PASS_FAIL_CLOSED / CALL_NOT_CONSUMED` | Exact worker receipt: `PREFLIGHT_BLOCKED/MASTER_PROVIDER_GATE_CLOSED`, `providerCalls=0`, `automaticRetries=0`, `recurring=false`, cost `USD 0`. No provider request occurred. |
| Fixture cleanup | `PASS` | Temporary API organizations `0`; temporary idempotency rows `0`. |

The earlier administration-only credential mismatch is closed. After the
owner-confirmed Postgres rotation, a repeated values-suppressed TCP probe using
the service's sealed administration binding returned `ADMIN_TCP=PASS`. The
same SSH process did not authenticate through the local Unix socket because
that path applies local OS-user authentication and is not the Railway
application/admin TCP path. No credential value was read or printed.

The automatic external `release@5cbb7b25` deployment reached `SUCCESS` and
temporarily restored the prior single-axis navigation. Exact archive deployment
`10b51bd2…` replaced that drift. Both public domains returned HTTP 200 from
`/api/setup-status`; protected HoReCa routes returned the expected redirect when
unauthenticated. Authenticated Chrome then proved the active two-axis layout and
reported no page-origin error logs.

## API and browser evidence

- API-key acceptance created two explicitly named test tenants, each with one
  test project. Each key saw only its own project; the other tenant was
  invisible; an invalid key returned 401. All fixtures and keys were removed.
- Headless Chrome: home returned 200 with title `Selena Systems — AI
  Visibility`; unauthenticated HoReCa redirected to `/auth/login` with
  `returnTo=/app/selena-horeca`; console errors `0`, page errors `0`.
- The owner signed in interactively through the normal Chrome staging login;
  no credential was shared with the reviewer.
- AVLI Bali and KORA Food Hall each opened through the project selector with
  the selected project bound in the route and decision view.
- Both showed source-only preview, `Phase: Not confirmed`, independent `Not
  measured` / `Needs approval` / `Not assessed` states and no measurement-start
  control.
- Social/Travel were absent from the rendered DOM and from the JSON customer
  payloads observed during both project navigations. `rawLocator`,
  `contentHash`, provider-reference and snapshot-UUID fields were also absent.
- Authenticated navigation failures `0`; console errors `0`.

## Product and dataset acceptance

| Scope | Result | Boundary |
|---|---|---|
| Provider registry and 13 dataset contracts | `PASS_SOURCE_CANARY_READY` | Contract and adapter source plus exact-head CI; one bounded Google AI Mode trigger produced no accepted provider capture. |
| Google adapters | `PASS_SOURCE / HOLD_RUNTIME_OUTCOME` | Request/response validation, bounded timeout and zero internal retries passed in source; the single hosted trigger has no proven terminal outcome. |
| Social/Travel | `PASS_HIDDEN` | Server strips hidden modules before the customer boundary; workflow and UI cannot activate them. |
| HoReCa Local-first read models/UI | `PASS_HOSTED` | Exact deployment `10b51bd2…` actively serves the project rail at left and the six-tool axis across the top; authenticated DOM and visual receipts passed. |
| AVLI/KORA pilot package | `PASS_TEMPLATE/HOLD_DATA` | Templates exist; no unsupported venue facts or provider results were invented. |
| Local Maps stability replay | `PASS_5_OF_5` | Seven focused files: 73 tests per replay, five complete replays, no provider calls. |

UGC remains the primary intended discovery/traffic source. That product
direction does not activate Social/Travel collection and is not represented as
measured traffic evidence.

## Credentials and cost

Owner-confirmed names-only rotation receipt: `BRIGHTDATA`, `OPENAI`,
`OPENROUTER`, `RESEND`, `GITHUB`, staging Postgres. Values were never read or
published. Active application runtime connectivity is proved through
`selena_app`; the sealed Postgres administration TCP binding also passed a
values-suppressed count-only probe after rotation.

- Provider calls recorded across the hosted acceptance: exactly `1`; the new diagnostic preflight made `0` calls
- Retries: `0`
- Recurring: `false`
- Bright Data usage attribution: `Google AI Mode Search`, exactly `1 record`
- Billing-surface cost for that record: `USD 0.00`
- Account cash consumed on the billing overview: `USD 0.00`
- Unrounded one-record list-price calculation: `USD 0.0015` — estimate only;
  the billing surface rounds the attributed record to `USD 0.00`
- Persisted provider capture: none
- The daily Web Scraper API total was `USD 0.02` for 11 records across three
  APIs. Ten of those records belonged to ChatGPT Search and Gemini Search, so
  the daily total is not attributed to the one authorized Google AI Mode call.

## Remaining owner gates

1. Reconcile the single historical trigger's terminal provider lifecycle.
   Billing and usage attribution are closed.
2. The additional diagnostic authorization remains unused. Exact source
   `100d34d8` is intentionally bound to the already reserved once-only identity;
   a second provider trigger requires a separately reviewed diagnostic identity
   patch and exact-source authorization. The immutable reservation must not be
   deleted or rewritten.
3. Keep PR #96 unmerged and production untouched while the provider HOLD
   remains open.

## Current PR-head CI

Accepted implementation source `100d34d8` passed every required check:

| Check | Result | Evidence |
|---|---|---|
| Build | `PASS` | [run 33491587536 / job 99804072456](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33491587536/job/99804072456) |
| E2E Integration Tests | `PASS` | [run 33491587544 / job 99804073340](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33491587544/job/99804073340) |
| Scheduling Policy Verification | `PASS` | [run 33491587544 / job 99804073077](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33491587544/job/99804073077) |
| Dependency License Audit | `PASS` | [run 33491587619 / job 99804073329](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33491587619/job/99804073329) |
| Deployment smoke | `PASS` | [run 33491587546 / job 99804073275](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33491587546/job/99804073275) |
| CLA | `PASS` | [run 33491587571 / job 99804073299](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33491587571/job/99804073299) |

Evidence baseline `8c5a8948` also passed all required checks: [Build run
33495715678 / job 99817304988](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33495715678/job/99817304988),
[E2E run 33495715658 / job 99817305096](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33495715658/job/99817305096),
[scheduling job 99817305480](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33495715658/job/99817305480),
[license run 33495715612 / job 99817304446](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33495715612/job/99817304446),
[smoke run 33495715685 / job 99817305097](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33495715685/job/99817305097)
and [CLA run 33495715599 / job 99817304550](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33495715599/job/99817304550).
The final evidence-only commit may advance the PR HEAD beyond `100d34d8`
without changing the deployed implementation tree. Green CI and the exact
hosted web/worker receipts do not resolve the provider lifecycle.
