# Selena AI Visibility v1.3 — hosted acceptance matrix

## Authoritative reconciliation overlay — 2026-09-02

This overlay supersedes earlier candidate-head and worker-deployment rows below.

- Source acceptance head: `f2c71dfe8eff6b7207463fce0e4d2f1088e3a15f`.
- PR [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96) is
  `OPEN`, `mergeable_state=dirty`; no merge was performed. The feature branch
  has no published PR checks because the merge ref is dirty.
- Source CI for `f2c71dfe`: Build
  [33581340784](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33581340784),
  E2E
  [33581342375](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33581342375),
  License
  [33581344379](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33581344379);
  all three `SUCCESS`.
- Chosen architecture: private reconciliation requires a separate owner/admin
  scoped staging connection. `selena_app` remains metadata-only and is rejected
  before any private snapshot read with
  `GOOGLE_AI_MODE_HISTORICAL_OWNER_SCOPE_REQUIRED`.
- Staging rollback-only dry-run receipt: command returned redacted
  `GOOGLE_AI_MODE_HISTORICAL_RECONCILIATION_FAILED` under `selena_app`; no
  `--commit`, provider call, or persistence write occurred. Owner-authenticated
  staging verification is `BLOCKED_ACCESS` after password rotation, so staging
  row counts are not promoted to formal evidence.
- Exact source-test cardinality: first commit `0→1` private snapshot and
  `0→1` audit row; evidence/cost/acceptance rows `0→0`; replay remains `1/1/0/0/0`;
  `providerCalls=0`; dry-run performs no writes. The previously persisted
  staging receipt remains one snapshot plus one audit row with no duplicate.
- Worker was restored to exact `100d34d8` by deployment
  `9cf426fe-98ae-4c73-8ec9-a7fd7358504e` (`SUCCESS`).
- Formal decision: `NO-GO / HOLD_OWNER_READ`; no provider, production, billing,
  recurring, or merge action is authorized.

Evidence date: `2026-09-02`. This document is the canonical post-hosted
acceptance snapshot. Earlier pre-mutation candidates remain Git history only.

## Canonical anchors

- Accepted staging implementation source: `100d34d8` (merge parent
  `5cbb7b25`; canonical `0045`, follow-up `0053`, exact historical-hash
  compatibility gate)
- First-canary feature HEAD: `3872a396dabfb6763b2b93f70ea3c521f12d8688`
- Diagnostic-2 runtime source: `a9d1f373c48b64127873b34016ce398eabe00c3f`
- Trigger-diagnostics source before this evidence reconciliation:
  `4f701b35` (sanitized HTTP/response/transport/timeout taxonomy only; no provider
  execution path or retry policy was enabled)
- Bounded snapshot-download remediation source: `4a1fd948` (control responses
  remain capped at 1 MB; snapshot downloads are bounded at 4 MiB)
- Last exact PR evidence head verified inside this document:
  `399a605a2f570f9e3f74ed02208515c016033cb`
- Active worker implementation source after mandatory rollback: `100d34d8`
- Integrated release parent: `5cbb7b256f286295a3dafdbeddc9aa46e24227f7`
- Current remote release head: `4400d4352042eba73a6364ab3fafd29664c2d194`
  (`free the measurement's idle slots and widen its pace one step`)
- Latest release integration merge: `84cce314`
  (parents `eaffa6de` and `4400d435`)
- Current source-only reconciliation patch: `b01a310b`, carried by follow-up
  PR [#108](https://github.com/parkourcafe/selena-ai-visibility/pull/108);
  it separates provider `capturedAt` from journal `historicalReadyObservedAt`,
  validates canonical stored evidence/capability/audit rows on replay and
  rolls back idempotent dry-runs.
- Current release-integrated source head: `f4b1418d`, with the disposable
  migration replay ceiling aligned to release frontier `0054`; staging remains
  bounded at `0053`.
- Original release snapshot retained for lineage: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Draft PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Protected untracked `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md`: untouched and excluded.

The accepted implementation source, both canary source identities and active
runtime are separate evidence anchors. Railway three times auto-deployed a
release branch over the accepted two-axis UI: `5cbb7b25`, `2e21ef04`, then
`4400d435`. The third drift was detected by a read-only deployment-list check
and replaced by an exact `100d34d8` archive deployment before this matrix was
finalized.

## Decision

| Boundary | Decision | Reason |
|---|---|---|
| Source package | `PASS_SOURCE_RECONCILIATION_READY` | Provider, database/evidence and HoReCa streams are code-complete for the authorized v1.3 scope. The offline historical path has separate provider/journal timestamps, strict replay validation and rollback-only dry-run behavior. |
| Exact-head CI | `PASS` | Documentation/evidence head `399a605a` passed Build, E2E, Scheduling, Smoke, License and CLA. PR #96 points to `399a605a`, `mergeable=true`, `mergeable_state=clean`; no merge executed. |
| Staging database/RLS | `PASS` | Fresh backup `d2ac59a9…`, migrations through `0053`, actual non-owner runtime role, GUC, FORCE RLS and rollback-only cross-tenant proof were recorded. |
| Staging web/worker | `PASS_EXACT_WEB / PASS_ROLLBACK_WORKER` | Exact archive `100d34d8` is active on staging web deployment `835aca8d-2a47-4bad-af75-d7f4920cd35b` and restored worker deployment `b583e695-e935-4e2f-b6c5-f13b135964d4`. Worker was temporarily deployed from the diagnostic source (`78de5973…`) and then returned to exact `100d34d8`. |
| Public/unauthenticated browser and scoped API | `PASS` | Browser smoke, authenticated API-key tenant fences and invalid-key response passed. |
| Authenticated human browser | `PASS` | Owner signed in interactively. AVLI and KORA routes, Local-first states, hidden-module boundary and sanitized customer payload passed without sharing credentials. |
| Google/Bright Data canary | `COST_PASS / READY_PAYLOAD_VALIDATED / PRIVATE_RECONCILED / ACCEPTANCE_HOLD` | Historical capture `sd_mtiflifw2lfu6ne28l` was persisted once in staging as an immutable private `sv_source_snapshots` row plus one reconciliation audit event by deployment `78de5973-d6c5-446a-b8c9-390c1c273ee9`; receipt `PERSISTED_PRIVATE`, `providerCalls=0`, no evidence-index/cost/acceptance rows. A second commit attempt could not complete idempotent verification because non-owner `selena_app` is denied SELECT on private snapshots (RLS boundary); no duplicate write occurred. Diagnostic-2 remains `TRIGGER_OUTCOME_UNKNOWN`, added no record and cost `USD 0.0000`; human acceptance remains required. |
| Production/merge | `NO_GO` | Historical provider identity and payload are privately reconciled in staging, but formal evidence acceptance remains blocked (human acceptance and owner-scoped idempotency verification). Diagnostic-2 remains unresolved. PR #96 is open at `399a605a` with `mergeable_state=clean`; production is prohibited and no merge was executed. |

Overall decision: `STAGING_PROVIDER_PAYLOAD_PASS / PRIVATE_RECONCILED / IDEMPOTENCY_VERIFY_HOLD / PRE_PRODUCTION_NO_GO`.

## Exact-head CI evidence

Current documentation/evidence-head receipt for `399a605a` (PR [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)):

| Check | Result | Evidence |
|---|---|---|
| Build | `PASS` | [run 33578329492](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33578329492) |
| E2E Integration Tests | `PASS` | [run 33578329505](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33578329505) |
| Scheduling Policy Verification | `PASS` | [run 33578329505](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33578329505) |
| Dependency License Audit | `PASS` | [run 33578329490](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33578329490) |
| Deployment smoke | `PASS` | [run 33578329484](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33578329484) |
| CLA | `PASS` | [run 33578329512](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33578329512) |

The scheduling job passed the real-PostgreSQL bounded replay at disposable
frontier `0054`; this does not authorize applying `0054` to shared staging.

The pull-request workflows below passed against
`4a1fd94803d1a457ab426ff765e2c1052c423646`, which contains release merge
`34d86417`:

| Check | Result | Evidence |
|---|---|---|
| Build | `PASS` | [run 33517852417 / job 99892279238](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852417/job/99892279238) |
| E2E Integration Tests | `PASS` | [run 33517852063 / job 99889310855](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852063/job/99889310855) |
| Scheduling Policy Verification | `PASS` | [run 33517852063 / job 99889311054](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852063/job/99889311054) |
| Dependency License Audit | `PASS` | [run 33517852018 / job 99889310318](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852018/job/99889310318) |
| Deployment smoke | `PASS` | [run 33517852017 / job 99889310054](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852017/job/99889310054) |
| CLA | `PASS` | [run 33517852057 / job 99889311205](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852057/job/99889311205) |

GitHub API returned `base=2e21ef04`, `head=4a1fd948`, `state=open` and
`mergeable=true`. This is a source-quality gate only:
the provider persistence hold still prevents merge.

Recorded local root gates before the sanitized trigger-taxonomy commit:
lint `0 errors / 129 warnings / 12 infos`, typecheck `13/13`, tests `16/16`
tasks, Impeccable detect `PASS`, build `16/16`, `git diff --check` clean. The
warnings/infos are the registered root baseline and are non-blocking. Local Node
was `22.23.0`; CI used the required Node 24. Trigger-taxonomy source `4f701b35`
also passed lib typecheck, `1086/1086` lib tests, root lint with the same
non-blocking baseline and root build `16/16` locally.

After provider reconciliation, source `4a1fd948` separated the 1 MB control
response cap from a 4 MiB snapshot-download cap. Its focused provider suite
passed `19/19` and Biome checked both changed files. The final mutable-head CI
receipt is recorded on PR #96 after this documentation commit.

The offline historical reconciliation path was executed against the restored
staging worker in dry-run mode only. It returned
`DRY_RUN_ROLLED_BACK` with `providerCalls:0`, `evidenceIndexStatus:NOT_CREATED`,
`costEventStatus:NOT_CREATED`, `acceptanceReceiptStatus:NOT_CREATED` and
`acceptance:HOLD`. Staging persistence remains an explicit owner gate. Current
local focused gates are lib `16/16`, worker `23/23`, both package check-types,
targeted Biome and `git diff --check`. The E2E workflow timeout is now bounded
at 35 minutes to include cleanup after successful tests.

## Staging infrastructure evidence

| Gate | Result | Receipt |
|---|---|---|
| Fresh checkpoint | `PASS` | Pre-`0053` backup `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`, external snapshot reference present, no expiry. Earlier isolated restore receipt `a34b2749…` remains the recovery-path proof. |
| Isolated restore | `PASS` | Restore service `a34b2749-130a-47f3-8da3-8f58e3775fe9` became healthy and proved an actual restored copy. |
| Migration bound | `PASS` | Bounded runner deployment `76fe0d58-0fd8-4213-9b11-f852e72de7f8` applied only `0053`: journal `53/1787940014000` → `54/1787940015000`, runner exit `0`. Follow-up bounded no-op deployment `b7b7fa33-6da8-49a0-835f-d76b74e9fafb` with sealed max index `53` read `54/1787940015000` → `54/1787940015000`, TLS verified and exited `0`. |
| Final runner real-PostgreSQL replay | `CI_GATED` | The E2E scheduling job replays the bounded runner through the current disposable release frontier `54/0054`; shared staging remains bounded at `0053`. The current-head E2E check is the authoritative receipt for advisory lock, exact journal prefix/postcondition, no-op replay and unlock. |
| Post-`0053` schema/RLS | `PASS` | Values-suppressed readback proved `selena_app`, non-owner/no `BYPASSRLS`, FORCE RLS, `legacy_collision_ordinal`, validated nonnegative check, the three-column unique index and insert guard. |
| Runtime role | `PASS` | `current_user=selena_app`; `SUPER=false`, `BYPASS_RLS=false`, `CREATE_ROLE=false`, `CREATE_DB=false`. |
| Administration credential | `PASS_ROTATED_AGAIN` | A Railway tunnel diagnostic unexpectedly emitted the administration value into restricted tool output. It was treated as compromised immediately: the Railway sealed password and database role were rotated together, a values-suppressed TCP authentication probe passed, and the temporary local rotation material was destroyed. No credential value is present in this repository or report. |
| Tenant GUC | `PASS` | `SET LOCAL app.organization_id` succeeded through the active worker connection. |
| Hosted RLS proof | `PASS` | `current_user=selena_app`; `SELECT`/`INSERT` allowed; FORCE RLS active; cross-tenant insert failed with SQLSTATE `42501`; transaction ended in `ROLLBACK`; persisted fixture rows `0`. |
| Replay/concurrency/idempotency | `PASS` | Two concurrent writes produced one winner; replay was stable; cross-tenant read returned no row; active mutation was blocked; expired fixture cleaned up. |
| Exact web deploy | `PASS_RESTORED` | Automatic release drift was superseded. Exact archive `100d34d8` was restored by deployment `835aca8d-2a47-4bad-af75-d7f4920cd35b`, terminal `SUCCESS`; both setup-status endpoints returned HTTP 200. |
| Two-axis UI receipt | `PASS_RESTORED` | Authenticated post-restore DOM on `app.selenasystems.com/app/selena-horeca` proved `ПРОЕКТЫ` in the complementary project rail and `ИНСТРУМЕНТЫ` across the top with all six tool links. Both `/api/setup-status` endpoints returned HTTP 200. |
| Worker deploy | `PASS_ROLLBACK_EXACT` | Temporary reconciliation deployment `78de5973-d6c5-446a-b8c9-390c1c273ee9` was removed. Rollback deployment `b583e695-e935-4e2f-b6c5-f13b135964d4` restored exact `100d34d8` and is `SUCCESS`. |
| Public health | `PASS` | `app.selenasystems.com`, `staging.selenasystems.com` and `/api/setup-status` returned HTTP 200. |
| Runtime containment | `PASS` | Logs: legacy provider execution disabled; recurring scheduler disabled and managed schedules removed; pg-boss started; handlers ready; no error-level log. |
| Canary trigger receipts | `HISTORICAL_READY_PAYLOAD / DIAGNOSTIC_HOLD` | Historical identity is exactly reconciled to `sd_mtiflifw2lfu6ne28l`; diagnostic-2 remains `OUTCOME_UNKNOWN/TRIGGER_OUTCOME_UNKNOWN`. Each immutable identity made one trigger, retries `0`, `recurring=false`; no accepted staging capture was retroactively persisted. |
| Snapshot lifecycle journal | `PASS_IDENTITY / HOLD_PERSISTENCE` | Exact snapshot row has five events: `TRIGGERED`, two `PENDING`, `READY`, `INTERRUPTED`; first event `08:54:47.108Z`, provider `READY` row `08:54:46Z`, one tenant/project/dataset. The 1,543,419-byte payload exceeded the former 1 MB client cap; read-only download and offline validation passed. |
| Steady-state containment | `PASS` | Measurement off, emergency stop on, recurring off and billing off after the bounded trigger. |
| Diagnostic-2 reservation | `PASS_IMMUTABLE / CALL_CONSUMED` | Durable reservation `db:e432156c-7f5d-40ef-ad40-72a883affac9`, cap `USD 0.25`, `providerCalls=1`, `automaticRetries=0`, `retryAllowed=false`, `recurring=false`; internal cost reconciliation remains `UNKNOWN/REQUIRED`. |
| Diagnostic-2 lifecycle | `HOLD_TRIGGER_OUTCOME` | Receipt completed in `0.34s` with no `snapshotReference`, no record count and no new snapshot-lifecycle events after the call start. No retry or follow-up call is authorized. |
| Fixture cleanup | `PASS` | Temporary API organizations `0`; temporary idempotency rows `0`. |

The administration binding is closed after a second coordinated staging-only
rotation. The Railway service variable and the PostgreSQL owner role received
the same newly generated value; a values-suppressed TCP probe returned
`ADMIN_TCP=PASS`. Temporary local rotation material was removed immediately
after verification and is not recoverable. No secret value is retained in
source, acceptance evidence or user-visible reporting.

Automatic release deployments `5cbb7b25`, `2e21ef04` and `4400d435` each
superseded an exact feature web deployment. Read-only Railway evidence caught
the drift; exact archive deployment `835aca8d…` restored `100d34d8`. This matrix
treats release auto-deploy drift as an operational HOLD unless the exact source
is actively re-established and rechecked.

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
| Provider registry and 13 dataset contracts | `PASS_SOURCE_CANARY_READY` | Contract and adapter source plus exact-head CI. The historical Google AI Mode payload passed immutable schema-discovery validation with one record; formal accepted evidence remains intentionally ineligible until versioned promotion and human acceptance. |
| Google adapters | `PASS_SOURCE / PASS_HISTORICAL_PAYLOAD / PRIVATE_RECONCILED / HOLD_ACCEPTANCE` | Request/response validation, bounded timeout and zero internal retries passed in source. The exact historical payload produced a non-empty 40,224-character normalized answer and four normalized citations. Source `4a1fd948` adds a bounded 4 MiB snapshot path while keeping 1 MB control responses; no retry or provider trigger was added. One immutable private staging capture plus one audit row were persisted with no evidence-index/cost/acceptance rows; formal acceptance remains held. |
| Social/Travel | `PASS_HIDDEN` | Server strips hidden modules before the customer boundary; workflow and UI cannot activate them. |
| HoReCa Local-first read models/UI | `PASS_HOSTED_RESTORED` | Exact source `100d34d8` was restored after automatic release drift. Its authenticated receipt separates the project rail at left from the six-tool axis across the top. |
| AVLI/KORA pilot package | `PASS_TEMPLATE/HOLD_DATA` | Templates exist; no unsupported venue facts or provider results were invented. |
| Local Maps stability replay | `PASS_5_OF_5` | Seven focused files: 73 tests per replay, five complete replays, no provider calls. |

UGC remains the primary intended discovery/traffic source. That product
direction does not activate Social/Travel collection and is not represented as
measured traffic evidence.

## Credentials and cost

Owner-confirmed names-only rotation receipt: `BRIGHTDATA`, `OPENAI`,
`OPENROUTER`, `RESEND`, `GITHUB`, staging Postgres. The staging Postgres
administration credential was rotated again after a control-plane diagnostic
exposed it in restricted tool output. Active application runtime connectivity
is proved through `selena_app`; the newly rotated administration binding passed
a values-suppressed TCP probe. No value is retained in this evidence package.

- Provider calls recorded across the hosted acceptance: exactly `2`, one per
  separately authorized immutable execution identity
- Retries: `0`
- Recurring: `false`
- Bright Data post-diagnostic usage export: `Google AI Mode Search`, exactly
  `1 record` total for `2026-09-01`
- Bright Data post-diagnostic cost export: `USD 0.0015` total for Google AI
  Mode Search on `2026-09-01`
- Diagnostic-2 incremental billing: `USD 0.0000`; the pre-diagnostic evidence
  already contained the same one Google AI Mode record, and the post-call
  export contains no second record
- Historical provider snapshot: `sd_mtiflifw2lfu6ne28l`, `READY`, one input,
  one record, 100% provider success, 1,543,419 downloaded bytes
- Downloaded-file SHA-256:
  `bfb2ebcae1b69d20573f62e46aa5b586bacaedf8b9e617753b42a4b7a8d64c5a`
- Canonical schema-discovery payload hash:
  `sha256:7b465dc14c050742f77fd37ecca4c64c5ff1f92eb30a945a9f60d688a8e3721f`
- Offline adapter receipt: one immutable record, non-empty normalized answer,
  four normalized citations
- Persisted provider capture: one immutable private source snapshot and one
  reconciliation audit row (`PERSISTED_PRIVATE`, deployment `78de5973…`);
  evidence-index, cost and acceptance rows were intentionally not created
- Idempotent replay: blocked by intentional non-owner `selena_app` SELECT denial
  on private snapshots; no duplicate write observed
- First-party CSV evidence:
  [`brightdata-cost-by-web-api-2026-09-01.csv`](evidence/brightdata-cost-by-web-api-2026-09-01.csv)
  and
  [`brightdata-usage-by-web-api-2026-09-01.csv`](evidence/brightdata-usage-by-web-api-2026-09-01.csv)
- Evidence SHA-256: cost
  `de9a3e463122097dc7cc5f2ab09ff01802ace76e5f1cd144cb8f157e0f151cbc`;
  usage
  `718415d4fcfa6c6e7cd320e8f5414d8a85429ecd6c2fe39aa1ec0a8641136083`
- The daily Web Scraper API total was `USD 0.0285` for 19 records across three
  APIs. Eighteen records and `USD 0.0270` belong to ChatGPT Search and Gemini
  Search, not to the authorized Google AI Mode calls.

## Remaining owner gates

1. Historical provider identity, payload and cost are reconciled. The
   persistence path is complete (`PERSISTED_PRIVATE`), and source replay
   validation is hardened. Formal evidence acceptance still requires a
   successful owner-scoped read-only idempotency verification against the actual
   staging Postgres; the current owner shell fails password authentication.
2. Diagnostic-2 remains `TRIGGER_OUTCOME_UNKNOWN`; do not retry it. Billing and
   usage attribution are closed.
3. Keep both reservations immutable. No additional provider call, identity,
   retry or cost-cap increase is authorized.
4. Keep production, production DB and PR merge prohibited while the provider
   gate remains `HOLD`, even when the current PR checks are green.

## Evidence lineage and mutable PR state

Diagnostic source `a9d1f373` passed every manually dispatchable workflow. The
release-integrated evidence head `4a1fd948` then passed the complete PR suite:

| Check | Result | Evidence |
|---|---|---|
| Build | `PASS` | [run 33517852417](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852417) |
| E2E + Scheduling | `PASS` | [run 33517852063](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852063) |
| Dependency License Audit | `PASS` | [run 33517852018](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852018) |
| Deployment smoke | `PASS` | [run 33517852017](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852017) |
| CLA | `PASS` | [run 33517852057](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33517852057) |

Merge commit `84cce314` integrates exact release head `4400d435` without
rewriting feature history; the earlier `34d86417` merge preserves the reviewed
`0045` hash alias and release-side advisory-lock ordering. GitHub reported PR
#96 mergeable at `4a1fd948`. Since a
Markdown file cannot contain the hash of its own enclosing commit, GitHub PR
metadata and the latest exact-head evidence comment are authoritative for later
source-only evidence commits and their checks.
