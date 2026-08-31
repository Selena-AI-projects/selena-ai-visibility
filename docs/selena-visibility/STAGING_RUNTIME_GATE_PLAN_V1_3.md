# Selena AI Visibility v1.3 — staging/runtime gate plan

Status: `CURRENT_SOURCE_CI_PENDING_ROTATION_DOMAIN_RLS_PROVIDER_HOLD`

The original anchor is release HEAD
`0e00df4faa74990e6b696c4249cbb85acf23c693`. Current release HEAD is
`32945b27202949debf0e27cbf48053d01ed2559e`; historical release `7ac37f43`
remains rollback evidence only. Draft PR #96's last pushed green anchor is
`b86540c99ab8621a763e399873c5aec3e8744cfe`. Current reviewed local
implementation head is `4916125eae194dc4d15c5b4e3e8ed359f43dc274`, tree
`502b98fb678a8d2e94887f579bd452a73d145821`; local Node 24 delta gates pass and
fresh PR CI is pending. The owner has authorized one bounded pre-production loop.
Production, application recurring
jobs, Social/Travel activation and any provider call beyond the single named
Google AI Mode canary remain prohibited.

## Evidence anchor

- PR [#92](https://github.com/parkourcafe/selena-ai-visibility/pull/92) is merged.
- PR [#95](https://github.com/parkourcafe/selena-ai-visibility/pull/95) is merged
  as release commit `7ac37f43` after final required CI completed successfully.
- Draft PR [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
  is open, mergeable/clean and pushed through green anchor `b86540c9`. Build, E2E
  integration, scheduling policy, deployment smoke, license and CLA checks all
  passed on that exact anchor. Local commits `bb8f123c` and `4916125e` require
  a fresh cycle after push. Run links are recorded in `ACCEPTANCE_MATRIX_V1_3.md`.
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
| SR-00 Release lineage | Pin the PR #96 source candidate and its exact green CI; record image/build digest and configuration version without secrets | Current implementation candidate `4916125e` is traceable and its eventual pushed head passes CI; `0e00df4f` and `7ac37f43` are historical/rollback evidence, not deploy targets | Read-only local |
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
| SR-00 | `CURRENT_SOURCE_CI_AND_IMAGE_DIGEST_PENDING` | Current local implementation candidate is `4916125e`, tree `502b98fb`; current release `32945b27` is an ancestor through merge commit `07199eda`. Green predecessor `b86540c9` passed all six checks, but the new source has not yet been pushed or CI-validated. An immutable build/image digest plus sealed staging configuration version is also required before deploy. |
| SR-01 | `PASS_LOCAL_CURRENT_DELTA_CI_PENDING` | The registered root lint/build baseline remains resolved. Current delta passes focused Node 24 tests, package typechecks, changed-file Biome and web build; green predecessor CI covers the larger graph, but fresh current-source CI is required. No fresh full-root lint replay is claimed. Impeccable remains unavailable and no PASS is claimed. |
| SR-02 | `AUTO_DEPLOYED_DOMAIN_BINDING_HOLD` | Railway Git integration auto-deployed release `32945b27`. Web deployment `3eefbf4a…` is running and still serves both `app.selenasystems.com` and `staging.selenasystems.com`, so blast-radius isolation is not proven and the deployment is not accepted. |
| SR-03 | `P0_CREDENTIAL_ROTATION_AND_DOMAIN_HOLD` | The auto-deployed worker `c50d857e…` reached ready with maintenance disabled, but safe evidence did not prove master emergency-stop or measurement values. Authorized containment stopped it; latest marker `5adf69b9…` has `deploymentStopped=true`. Legacy measure and migrate are also stopped. Current source adds a global provider gate but is not deployed. A Railway key-presence command previously rendered raw staging values; affected credentials require rotation. Web was not mutated because it serves a production-like domain. |
| SR-04 | `PASS_RESTORE_REHEARSED_REFRESH_REQUIRED` | PITR enabled/bucket-wired and named backup `92f3adae…` were verified at the recorded checkpoint. Workflow `createServiceFromPITR/…/gVug7V8EP2ZFqRiuYaoD9` restored `2026-08-31T13:26:46Z` into an isolated staging DB with the expected 0042 journal/schema receipt; the source stayed online and the rehearsal service was deleted. Live archiver telemetry remains `UNKNOWN`, and backup/PITR metadata must be refreshed before SQL. |
| SR-05 | `PASS_SOURCE_AND_DISPOSABLE_HOLD_APP_RUNTIME` | Disposable PostgreSQL 16 proof applies through 0051 and rolls back cleanly. A second proof simulates legacy hash grants, applies the idempotent least-privilege role script twice, verifies private-column/default/sequence denials and tenant report bootstrap, then tears down. The last direct staging checkpoint was through 0042 with 0043–0051 pending; current live journal and `selena_app` role state are `UNKNOWN` until refreshed. No runtime role switch before hosted acceptance. |
| SR-06 | `AUTO_DEPLOYED_NOT_ACCEPTED` | Web/worker release `32945b27` deployed through Railway Git integration before SR-02/SR-05 passed. The migration job `2b092c4c…` crashed while Corepack attempted a runtime pnpm download; the worker was re-contained. Current live journal is `UNKNOWN`, and none of these deployments is accepted runtime boot. |
| SR-07–SR-08 | `BLOCKED_BY_SR02_SR03_SR05` | Fixture and browser/API RLS acceptance remain unexecuted while domain isolation, credential rotation, global provider stop and runtime RLS are unproven. |
| SR-09 | `AUTHORIZED_EXTERNAL_CAP_EVIDENCE_HOLD` | Bright Data / GOOGLE_AI_MODE / one call / USD 0.25 / total source deadline 24m10s / zero retries / non-recurring. Fresh sanitized provider/account hard-cap evidence at or below USD 0.25 is still required. |
| SR-10 | `NOT_ELIGIBLE_PROVIDER_AND_ACTIVITY_HOLD` | No owner-triggered Google canary occurred. Auto-deploy coincided with three Bright Data estimated cost events totalling USD 0.03; actual external-call count is `UNKNOWN`. Current source has one-shot transport, durable once-ever reservation, master gate, 24m overall plus 10s cancellation, zero retries, and transactional persistence of the exact successful capture as private `CANARY_ONLY` evidence. It deliberately creates no accepted measurement or cost event; authoritative provider price enforcement and post-call cost reconciliation remain `HOLD`. |
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
