# Selena AI Visibility v1.3 — hosted acceptance matrix

## Correction overlay — 2026-09-03, read-only audit

The overlay below records shared staging as intentionally unchanged at
migration frontier `0058`, PR [#120](https://github.com/parkourcafe/selena-ai-visibility/pull/120)
as `OPEN/DRAFT`, and no DDL, reconciliation write or runtime deploy in that
loop. Read-only checks against GitHub and Railway contradict all three. The
earlier text is left in place as the record of what was believed at the time;
this section is what actually happened.

- PR #120 is `merged`, not draft: merged `2026-09-02T23:42:13Z` by
  `parkourcafe`, head `e58499f5`, into `release/selena-visibility-mvp`. Merge
  commit `c71bf0eb` — the same SHA the handoff lists as "last observed release
  base" without noting it is that merge.
- The merge auto-deployed staging: `measure` at `2026-09-02T23:42:55Z`,
  `migrate` at `2026-09-03T00:11:21Z`, `web` at `00:34:34Z`, `worker` at
  `00:40:10Z`, all `SUCCESS`.
- Migrations `0059` and `0060` **were applied to shared staging** by that
  deploy. Log of `migrate` deployment `934cacb6-5436-461d-80d2-6d0805c8df0a`:
  `journal before: 59/1787940020000` → `prepared 61 migrations through index 60`
  → `journal after: 61/1787940022000` → `migrations complete`.
  **Current staging frontier is `0060`, not `0058`.** No exact-SHA owner
  approval preceded it; nothing in the pipeline asked for one.
- The disposable and restore PostgreSQL services are **not removed and not
  scaled to zero**. Seven are online with volumes in the project:
  `Postgres-selena-v13-0059-0060-isolated-20260903` (service
  `88dbe261-c7f6-4733-83cf-15e579f6990e`, the one recorded as scaled to zero,
  reporting one running replica), `Postgres-selena-v13-0058-isolated-20260902`,
  `Postgres-selena-v13-0056-restore-20260902`, `canary-clean-20260902`,
  `reconciliation-0054-20260902`, `Postgres-selena-v13-restore-20260901`, and
  `Postgres-W_9y`.
- The `production` environment runs only `Postgres-W_9y`, online since
  `2026-08-15`. No production application deployment exists, which the record
  states correctly.

What this changes, beyond the numbers: the owner gate was documentary. A merge
walked past it. Migration `0061` onwards is now gated in code — on a hosted
environment the migrator refuses pending migrations unless
`SELENA_MIGRATION_APPROVED_SHA` names the commit being deployed, and the
approval expires with the next commit. See
[`PLATFORM_AUDIT_2026-09-03.md`](PLATFORM_AUDIT_2026-09-03.md) for the full
audit this correction came from.

### Staging's `0060` is not the release's `0060`

Migrations stopped applying to staging at `2026-09-03T05:31Z` and stayed stopped
for every deploy after it. The migrator now names the row: index `60`
(`0060_journal_hold_owner_reconciliation`), applied digest
`5b5f21235bf7…`, release file `b3f720b1e03c…`.

That applied digest belongs to `5d8eb47ded32eb7dfe60b2c548a1eb40f8411476` on
`fix/selena-0060-cancelled-permits` — the branch this handoff names as the local
checkout, and one that never merged. The release digest is identical at
`fcb75f54`, at PR [#120](https://github.com/parkourcafe/selena-ai-visibility/pull/120)'s
head `e58499f5` and on the release branch today, so the release has been
consistent throughout; staging is what diverged.

The whole difference is two lines:

| | `sv_run_permits_status_check` |
|---|---|
| Applied to staging | `'issued', 'consumed', 'revoked', 'cancelled'` |
| Shipped in the release | `'issued', 'consumed', 'revoked'` |

with the guard function's matching arm changed the same way. No release code
writes or reads a `cancelled` permit, so the applied database is permissive
where the release is strict rather than behaving differently.

Accepting the exact historical digest through the existing alias mechanism is
what lets the journal move again. It does not answer whether the release should
carry the wider constraint — that depends on whether any permit row already
holds `'cancelled'`, which needs a database read nobody has taken.

No write of any kind was made to staging, production or GitHub while
establishing the above.

## Authoritative AVLI measurement overlay — 2026-09-03

- Exact executable candidate: `fcb75f54eba5810ac41a6c6d130ea80293cb5df5`.
- Branch: `fix/avli-journal-hold-reconciliation`; exact integrated release
  base: `f75542c4028d0ff15c425e4f99057fb5f1cf2376`.
- Draft PR [#120](https://github.com/parkourcafe/selena-ai-visibility/pull/120)
  is `OPEN/DRAFT/MERGEABLE/CLEAN`. Exact-head checks passed:
  [Build 33680828377](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33680828377),
  [E2E and Scheduling 33680828378](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33680828378),
  [License 33680828409](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33680828409),
  [Smoke 33680828491](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33680828491)
  and [CLA 33680828405](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33680828405).
- The first E2E attempt timed out in hosted `Build images` before tests at the
  workflow execution ceiling. Exactly one bounded rerun was performed: E2E,
  Playwright, Bruno API and worker lifecycle passed in `11m16s`; Scheduling
  remained green in `3m53s`. No additional rerun was made.
- Ordered migrations `0059–0060` are `PASS_SOURCE_AND_DISPOSABLE`. Upstream
  `0059` remains the immutable certificate-backed path for proved zero spend;
  `0060` now distinguishes boundary-backed execution from valid pre-`0058`
  consumed/run pairs with no historical boundary. It never backfills a
  synthetic boundary. Ordinary `selena_app` receives no raw snapshot,
  provider-reference or owner reconciliation privilege; direct execute is
  revoked in both migration and runtime bootstrap.
- Disposable PostgreSQL receipts:
  `JOURNAL_NO_SPEND_0059_DISPOSABLE_PASS provider_code_invoked=false external_network_api_calls_made=0 cleanup=verified` and
  `JOURNAL_0060_DISPOSABLE_PASS ownerOnly=true runtimeExecute=false noSpendCompatibility=preserved runtimeQuiesced=true ambiguousSpend=preserved legacyPermits=75 legacyIssuedRevoked=71 legacyConsumed=4 boundaryUpperBound=1 legacyUnfencedUpperBound=4 unmatchedNullCostUpperBound=+1 legacyLinkedCost=not-double-counted legacyInvariantMismatch=rejected legacyReceipt=UNKNOWN_WITHIN_UPPER_BOUND legacyDryRun=rolled-back legacyReplay=idempotent legacyAudit=exact providerInvocationsDuringTest=0`.
  Both disposable environments were removed. An independent read-only
  Database/Evidence review found no remaining P0/P1.
- Local gates on the executable candidate passed: lint exit `0` with the
  registered `129 warnings / 12 infos`, tests `16/16` (`lib 1141/1141`, web
  `448 passed / 4 skipped`), build `16/16`, shell syntax and diff checks. No
  frontend file changed, so Impeccable was not rerun. Local Node is 22.23.0;
  CI used required Node 24.
- Fresh staging backup `3585126c-a35c-452d-8540-d83b8a0e1d94` completed with
  `usedMB=120`, `referencedMB=426`, no expiry. Isolated PITR restore service
  `88dbe261-c7f6-4733-83cf-15e579f6990e` reached `database system is ready`.
  Source and restored read-only receipts matched exactly at migration frontier
  `59 / 1787940020000` and counts
  `claims/runs/cost/snapshots/audit/evidence/acceptance/canaries = 4/5258/4560/1/10647/0/0/2`.
- Shared staging is intentionally unchanged: exact hosted implementation is
  still `b4e678b8`, database frontier is `59 entries / 0058`, and provider
  execution, recurring jobs and billing remain disabled.
- The one live stale HOLD has exact topology `75 permits = 71 issued + 4
  consumed`, four unfinished runs, zero provider-boundary rows, zero cost rows
  and zero downstream evidence rows. The four executions predate `0058` and
  are therefore recorded as `providerCalls=NULL /
  UNKNOWN_WITHIN_UPPER_BOUND`, upper bound `4`, never as `PRE_TRANSPORT`.
- Owner authorized one AVLI staging measurement cycle with an aggregate ceiling
  of USD 10, zero retries and `recurring=false`. The executable path must keep
  the stricter frozen/source limit: effective maximum USD 0.50; current public
  list-price estimate for 75 records is USD 0.1125. This is authorization, not
  evidence that a call has occurred.
- Owner acknowledged up to four possible historical provider calls under the
  old USD 0.50 lock and authorized owner reconciliation. Because executable
  source changed after that approval, applying `0059–0060` and deploying exact
  `fcb75f54` remain a new exact-SHA owner gate. No provider call, DDL,
  reconciliation write or runtime deploy occurred in this overlay.

Current decision: `GO_SOURCE / BACKUP_RESTORE_PASS / HOLD_EXACT_FCB75F54_STAGING_EXECUTION / NO_GO_PRODUCTION`.

## Authoritative source overlay — 2026-09-02

This is the only current acceptance overlay. Hosted receipts in this section
prove the exact staging runtime named below; the older ledger remains historical.

- Exact hosted implementation source head:
  `b4e678b812b42623d20a4211a0ae6f6d657420b3`.
- Branch: `fix/selena-v13-audit-remediation`.
- Exact release base: `6d1e7c2a803b8d11053c88bd1996f8e3bc926565`.
- Source and shared-staging migration frontier: `59 entries / 0058`; staging
  receipt is `count=59`, `max_created_at=1787940020000`.
- PR [#112](https://github.com/parkourcafe/selena-ai-visibility/pull/112)
  remains `OPEN/CONFLICTING` at `65eb563c`; its green checks do not make its
  stale no-spend path releasable. PR
  [#114](https://github.com/parkourcafe/selena-ai-visibility/pull/114) is
  `MERGED`. PR
  [#116](https://github.com/parkourcafe/selena-ai-visibility/pull/116) remains
  `OPEN/DRAFT` at `7bb1ec35`; its reviewed UI tree is integrated into this
  candidate by merge `b87287fa`.
- Draft PR [#117](https://github.com/parkourcafe/selena-ai-visibility/pull/117)
  was `OPEN/DRAFT/MERGEABLE/CLEAN` at exact hosted head `b4e678b8`. Its six
  source checks passed: [Build 33634753485](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753485),
  [E2E and Scheduling 33634753450](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753450),
  [License 33634753471](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753471),
  [Smoke 33634753579](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753579)
  and [CLA 33634753617](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753617).
- Fresh staging backup `b0544cb8-7f5f-491c-833e-47d87f99cc10` and isolated
  PITR restore service `9bec47ee-bebe-49e6-bb0e-ae29fa39ce3` were proved
  before bounded migrations `0057–0058` were applied by deployment
  `e27792a7-de75-46f6-9fe8-38d075361525`.
- The owner-neutral RLS proof incorporated in `b4e678b8` ran against staging as
  `postgres/postgres` and ended in `ROLLBACK`. Receipt:
  `RLS_SCHEMA_PROOF_ONLY PASS`; before/after counts were identical:
  snapshots `1`, canaries `2`, evidence `0`, acceptance `0`, audit `10647`,
  cost `4560`, proof fixtures `0`.
- Exact `b4e678b8` staging deployments passed: web
  `8a377d4c-28ce-4a0c-b633-9f72fec89b3a` and pinned worker
  `c5c2b004-f727-49e4-954d-bfe0e9415cfe`. The sealed cursor key is present in
  web runtime and meets the 32-byte minimum; its value was never read or shown.
- Hosted API acceptance used one short-lived, test-tenant-only scoped key whose
  value was never shown. Progress, Maps, Local AI and evidence GETs passed auth;
  the three paginated routes passed the HMAC gate and all four returned the
  expected tenant-scoped `404 LOCAL_CYCLE_NOT_FOUND` for a nonexistent cycle.
  The fixture key was deleted and verified at `0` remaining rows.
- Hosted browser acceptance passed for the AVLI and KORA project routes: the
  project rail is left-aligned, the tool axis is separate and horizontal,
  Local-first content is read-only, Social/Travel are absent, and browser
  console errors were `0`.
- Provider calls, billing, recurring jobs and production actions were `0`.
  Post-acceptance counts remained snapshots/canaries/evidence/acceptance/audit/
  cost `1/2/0/0/10647/4560`; `pgboss.schedule=0`.

| Current boundary | Decision | Evidence |
|---|---|---|
| 0051 schema compatibility | `PASS_DISPOSABLE` | Four historical/release schema variants converge to one catalog; legacy formal acceptance is rejected; migration catalog digest `2ccfdc3a033d1f4d95d34b5ba567d0a6`; provider calls `0`. |
| 0057 project-scoped formal evidence | `PASS_DISPOSABLE` | Dry-run rolls back; concurrent acceptance is deterministic; cross-tenant and cross-project access are blocked; Local Maps is eligible; historical canary is blocked; evidence/acceptance/audit rows are `4/4/4`; provider calls and cost rows are `0/0`. |
| Runtime least privilege | `PASS_STAGING_ROLLBACK_PROOF` | Actual non-owner `selena_app` has no `SUPERUSER`, `BYPASSRLS` or inheritance, can read only 11 allowlisted snapshot metadata columns, cannot read `content_sha256`, `raw_reference` or table-level private snapshots, cannot insert formal acceptance, and retained the same grants after rollback. The owner-neutral proof derives the actor from the actual control-plane database role instead of a fixed owner name. |
| Local cursor integrity | `PASS_HOSTED_GATE` | Paginated Local read routes require a server-only `SELENA_LOCAL_CURSOR_HMAC_SECRET` of at least 32 UTF-8 bytes, issue HMAC-SHA256 cursors bound to tenant/cycle/resource and fail closed before DB access when the sealed key is missing or short. Staging config and runtime both confirmed the sealed value is present and at least 32 bytes without reading it; authenticated paginated GETs reached tenant-scoped lookup rather than `OWNER_GATE_REQUIRED`. |
| 0058 journal/provider boundary | `PASS_DISPOSABLE` | Exact `NO_SPEND` before transport; `EXECUTING` remains fail-closed after the boundary; terminal recovery completes the same claim; replay is idempotent; cross-tenant recovery is blocked; provider/cost rows are `0/0`. |
| HoReCa Local-first UI | `PASS_HOSTED` | Exact `b4e678b8` rendered AVLI and KORA with the project rail on the left and a separate top tool axis; project identity and anchor navigation were preserved, Social/Travel were absent and browser console errors were `0`. |
| Root quality gates | `PASS_LOCAL_WITH_BASELINE_WARNINGS` | Node 24 lint exit `0` with `129 warnings / 12 infos`; typecheck `13/13`; tests `16/16` (`lib 1138`, `web 448 + 4 skipped`); build `16/16`. |
| Impeccable | `NOT_SUPPORTED` | No workspace binary is installed; no dependency was added to manufacture this gate. |
| Provider and historical canary | `NO_CALL / HOLD` | This loop made zero provider calls. The historical capture remains private and ineligible for formal acceptance; no retroactive promotion is permitted. |
| CI | `PASS_EXACT_HOSTED_SOURCE` | Exact hosted head `b4e678b8` passed Build, E2E, Scheduling, License, Smoke and CLA; Railway web and worker status checks are also green. |
| Shared staging / production | `STAGING_DEPLOY_PASS / PRODUCTION_NO_GO` | Backup/isolated restore, migrations `0057–0058`, rollback-only owner-neutral RLS, exact web/worker lifecycle, sealed HMAC wiring and bounded API/browser acceptance pass. Runtime `selena_app` remains non-owner/no-bypass and denied private snapshot payload/provider references. Production remains prohibited. |

Chosen architecture: private reconciliation and formal acceptance remain
owner/control-plane functions. Ordinary `selena_app` gets only allowlisted
metadata and narrowly scoped journal recovery; it never receives raw snapshot
payload or provider-reference access.

Residual staging observations: Better Auth emitted a warning that Railway did
not provide a trusted client IP header, so its rate limiter uses one shared
per-path bucket. The runtime role remains healthy, but a fresh direct
`postgres` owner login failed password authentication after credential
rotation; the earlier backup, migration and rollback-only RLS receipts remain
valid, while future owner-scoped maintenance is held until that binding is
reconciled.

Overall decision: `GO_STAGING_PRELAUNCH / HOLD_OWNER_DB_BINDING / NO_GO_PRODUCTION`.

## Historical hosted evidence ledger

Everything below predates `b9d967b6` and is retained for lineage only. Where a
row calls an older SHA "current" or "final", read it as current at the date of
that receipt, not as the current branch state.

## Historical anchors

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
