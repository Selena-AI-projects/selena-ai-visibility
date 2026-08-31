# Selena AI Visibility v1.3 — staging/runtime gate plan

Status: `SOURCE_REMEDIATION_CI_ROTATION_DOMAIN_RLS_PROVIDER_HOLD`

The original anchor is release HEAD
`0e00df4faa74990e6b696c4249cbb85acf23c693`. Current release HEAD is
`7ac37f436b08f0e48c97acb61dfaee8a6458760a`, retained only as historical and
rollback evidence. Draft PR #96 last pushed head is
`71e5b8efa2baee416ba845852f40940ff85e2349`; the current source hardening is
committed locally through `a75a9f18` but not yet pushed or CI-validated. The
next candidate is PR #96's eventual final head containing this plan. The owner has
authorized one bounded pre-production loop. Production, application recurring
jobs, Social/Travel activation and any provider call beyond the single named
Google AI Mode canary remain prohibited.

## Evidence anchor

- PR [#92](https://github.com/parkourcafe/selena-ai-visibility/pull/92) is merged.
- PR [#95](https://github.com/parkourcafe/selena-ai-visibility/pull/95) is merged
  as release commit `7ac37f43` after final required CI completed successfully.
- Draft PR [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
  is open. Existing green checks apply only to `71e5b8ef`; a fresh cycle is
  required after current remediation is pushed.
- Historical PR #95 head and release `7ac37f43` share tree
  `03074f76a5dbff51a1389228d902d9809ac3d714`, validated by the successful PR
  CI runs listed in `ACCEPTANCE_MATRIX_V1_3.md`. The earlier PR #92 release
  tree remains historical evidence only.
- Source-only registry, Local Maps rehearsal, Social/Travel fail-closed gates,
  evidence provenance and HoReCa read models are accepted only at their stated
  evidence classes.
- Runtime RLS, migrations, durable stores, credentials and live provider
  behavior remain unverified.

## Independent authorization boundaries

| Boundary | What may be done after approval | Current state |
|---|---|---|
| A — shared staging read-only | Inspect deployment metadata, service revisions, bounded logs and configuration key presence without reading values | `AUTHORIZED_EXECUTED` |
| B — staging mutation | Backup/PITR, deploy an immutable revision, run pending migrations through 0051, create fixture rows or restart a service | `AUTHORIZED_WITH_RLS_STOP_CONDITION` |
| C — paid provider canary | One Bright Data `GOOGLE_AI_MODE` request, USD 0.25 maximum, 25-minute hard timeout, zero retries, `recurring=false` | `AUTHORIZED_ONLY_AFTER_SR00_SR08` |
| D — production | Access or mutate production, attach a database, change billing, deploy or schedule work | `OUT_OF_SCOPE` |

Approval of one boundary does not authorize any later boundary.

## Ordered gates

| Gate | Required action and evidence | Pass condition | Authorization |
|---|---|---|---|
| SR-00 Release lineage | Pin the follow-up PR #96 final head and its exact green CI; record image/build digest and configuration version without secrets | The commit containing this plan is immutable and traceable; `0e00df4f` and `7ac37f43` are historical/rollback evidence, not deploy targets | Read-only local |
| SR-01 Baseline disposition | Triage the registered root lint and `apps/www` local build baselines; do not relabel them as PASS | Either fixed in a reviewed follow-up or accepted as a named non-runtime exception with CI evidence | Source-only follow-up |
| SR-02 Staging topology | Confirm web, worker, migration job and PostgreSQL belong to the intended staging environment; confirm the deployed revisions and that production is not targeted | Inventory receipt contains IDs/revisions only, no credential values; web and worker database binding is consistent | Boundary A |
| SR-03 Safe configuration | Verify presence, not values, of required auth/encryption/database settings; require telemetry and all schedulers/fan-out disabled; require stub selectors for the zero-call phase | Configuration receipt shows fail-closed provider selection, `SCHEDULE_MAINTENANCE_ENABLED=false` and no recurring trigger | Boundary A |
| SR-04 Database preflight | Establish staging backup/restore or disposable rollback evidence; enumerate forward migrations `0037` through `0051`; verify the one-shot job has restart policy `NEVER` | Backup/rollback owner, migration order and stop procedure are recorded before any SQL runs | Boundary A, then B |
| SR-05 Migration and RLS proof | After backup verification, apply only pending migrations through 0051 as owner; then run the idempotent least-privilege non-owner role grants; set transaction-local `app.organization_id`; execute same-tenant positives and cross-tenant/privilege negatives | Migration receipt succeeds before role grants; RLS denies cross-tenant reads/writes; unallowlisted tables and private evidence columns remain denied; no owner-role result is accepted as proof | Boundary B |
| SR-06 Runtime boot | Deploy the same immutable candidate to web and worker only after SR-05; keep live providers, payments and schedules disabled | Web setup/health endpoint succeeds; worker boots with bounded logs; provider calls, payment calls and scheduled jobs remain zero | Boundary B |
| SR-07 Zero-call fixture acceptance | Exercise setup, quote, create, progress, results, evidence and HoReCa read paths with fixture/stub adapters only | Expected state transitions and tenant fences pass; no external task, cost event or publishable evidence is created | Boundary B |
| SR-08 Browser/API acceptance | Verify authentication, authorization scopes, UNKNOWN/LOCKED UI, CSV bounds, client-safe errors and evidence privacy | Browser/API report contains no secret/raw-provider leakage and no cross-tenant access | Boundary B |
| SR-09 Provider capability preflight | For one candidate dataset, freeze schema version, retention/privacy decision, entitlement, cost ceiling, attempt cap and stop/circuit-breaker behavior | A signed owner decision names one provider/dataset, one request, maximum cost and abort conditions | Planning only until Boundary C |
| SR-10 Isolated provider canary | Execute exactly one non-recurring, schema-discovery canary after SR-09; preserve raw evidence privately and reconcile the cost ledger | One terminal result is classified without retry ambiguity; answer/evidence requirements pass; actual cost is reconciled | Boundary C |
| SR-11 Social/Travel activation | Review each Social or Travel dataset independently after its canary; keep Social out of AI Visibility scoring and Travel out of product activation until approved | Schema, privacy, retention, entitlement and stable-capability decisions are all explicit | Boundary C plus product approval |
| SR-12 Pilot acceptance | Bind only accepted evidence to AVLI/KORA templates; retain UNKNOWN and module-level HoReCa outputs without a composite score | Pilot report has provenance, limitations, accepted-sample counts and owner sign-off | Separate pilot approval |
| SR-13 Promotion decision | Assemble the complete evidence packet and issue GO/NO-GO for a later production plan | No unresolved P0/P1, no unowned rollback step and no evidence class inflation | Production remains separately gated |

## Current execution state

| Gate | State | Receipt / blocker |
|---|---|---|
| SR-00 | `IN_PROGRESS_PUSH_AND_CI_REQUIRED` | PR #96 last pushed head is `71e5b8ef`; local source commits through `a75a9f18` and this evidence commit are not yet validated by CI. Release `7ac37f43` is historical/rollback only. |
| SR-01 | `PASS_LOCAL_HOLD_NEW_CI` | Root lint, all-workspace typecheck, uncached tests and uncached build pass on Node 24. Impeccable is unavailable due local npm-cache ownership and no PASS is claimed. Fresh PR #96 CI remains required after commit/push. |
| SR-02 | `AUTO_DEPLOYED_DOMAIN_BINDING_HOLD` | Release merge auto-deployed web/worker `7ac37f43`; staging web also serves `app.selenasystems.com`, so blast-radius isolation is not proven and the deployment is not accepted. |
| SR-03 | `P0_CREDENTIAL_ROTATION_AND_DOMAIN_HOLD` | Worker emergency stop is true, measurement/maintenance are false, and worker/legacy measure deployments are stopped; the post-stop window has zero selected permits/runs/cost events/jobs. Current source adds a global provider gate but is not deployed. A Railway key-presence command unexpectedly rendered raw staging values; affected credentials require rotation. Web was not mutated because it serves a production-like domain. |
| SR-04 | `PASS_RESTORE_REHEARSED` | PITR enabled/bucket-wired; named backup `92f3adae…` exists. Workflow `createServiceFromPITR/…/gVug7V8EP2ZFqRiuYaoD9` restored `2026-08-31T13:26:46Z` into an isolated staging DB, which booted successfully with the expected 0042 journal/schema receipt; the source stayed online and the rehearsal service was deleted. Live archiver telemetry remains `UNKNOWN` because its best-effort SSH probe returns exit 10, but restoreability is proven. |
| SR-05 | `PASS_SOURCE_AND_DISPOSABLE_HOLD_APP_RUNTIME` | Disposable PostgreSQL 16 proof applies through 0051 and rolls back cleanly. A second proof simulates legacy hash grants, applies the idempotent least-privilege role script twice, verifies private-column/default/sequence denials and tenant report bootstrap, then tears down. Staging remains through 0042 with 0043–0051 pending; no runtime role switch before hosted acceptance. |
| SR-06 | `AUTO_DEPLOYED_NOT_ACCEPTED` | Web/worker deployed through Railway Git integration before SR-02/SR-05 passed. Journal remains through 0042; deployment cannot be relabelled as accepted runtime boot. |
| SR-07–SR-08 | `BLOCKED_BY_SR02_SR03_SR05` | Fixture and browser/API RLS acceptance remain unexecuted while domain isolation, credential rotation, global provider stop and runtime RLS are unproven. |
| SR-09 | `AUTHORIZED_EXTERNAL_CAP_EVIDENCE_HOLD` | Bright Data / GOOGLE_AI_MODE / one call / USD 0.25 / total source deadline 24m10s / zero retries / non-recurring. Fresh sanitized provider/account hard-cap evidence at or below USD 0.25 is still required. |
| SR-10 | `NOT_ELIGIBLE_PROVIDER_AND_ACTIVITY_HOLD` | No owner-triggered Google canary occurred. Auto-deploy coincided with three Bright Data estimated cost events totalling USD 0.03; actual external-call count is `UNKNOWN`. Current source has one-shot transport, durable once-ever reservation, master gate, 24m overall plus 10s cancellation, and zero retries. Actual provider price enforcement and post-call cost reconciliation remain `HOLD`. |
| SR-11 | `PROHIBITED` | Social and Travel activation not authorized. |

## Provider canary invariants

- One dataset and one request per approval; `recurring=false` and no generic
  queue retry.
- `providerCalls=1` is a hard maximum, not a target to retry toward.
- A cost quote, cap and remaining-account-budget check precede dispatch.
- The accepted quote must cite sanitized authoritative provider/account or
  request hard-cap evidence; locally authored JSON is not evidence by itself.
- Source limits are: 25s trigger, 20s progress, 60s download, 10s poll,
  24-minute overall lifecycle and 10s cancellation, keeping the invocation
  below the owner-approved 25-minute ceiling.
- Ambiguous submission or reconciliation opens a hold/circuit breaker and does
  not create a second call.
- Raw payloads and provider errors remain private. Customer-visible data uses
  normalized, versioned evidence only after schema validation.
- Social and Travel cannot change scoring, UI availability, tariffs or public
  promises merely because configuration or a dataset ID exists.

## Required evidence packet

1. Candidate commit, tree and build/image digest.
2. Links to CI and the disposition of the two registered root baselines.
3. Staging inventory and configuration-presence receipt with secrets redacted.
4. Backup/rollback evidence and ordered migration receipt.
5. Non-owner RLS and transaction-local tenant-context proof.
6. Web/worker health, zero-call fixture and browser/API reports.
7. Provider-call count, cost-ledger reconciliation and circuit-breaker receipt
   only if Boundary C is separately approved.
8. Explicit remaining `UNKNOWN`, `HOLD` and `BLOCKED_FACT` items.

Until SR-00 through SR-08 pass, runtime readiness is `NO-GO`. The single
paid-call authorization already exists, but SR-10 remains ineligible until
those earlier gates pass and is `NO-GO` until its one result is accepted.
Production remains outside this plan.
