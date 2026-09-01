# Selena AI Visibility v1.3 — staging/runtime gate plan

Status: `LOCAL_CANDIDATE_READY_ROTATION_OWNER_CONFIRMED_HOSTED_RLS_PROVIDER_HOLD`

The original anchor is release HEAD
`0e00df4faa74990e6b696c4249cbb85acf23c693`. Current integrated release HEAD is
`9e1e993090fb6ef133b147b5341f2ff8591ade6c`; historical release `7ac37f43`
remains rollback evidence only. Draft PR #96 last pushed/green anchor is
`9f387cad47211c2a3d5b6970ecc826c27800edcc`. Current local candidate is
`2673bcf56639eea113f5e557bba5e55c79da2e4b`, tree
`4f979e26b7fb38ff4b6c192e303b7fda0c5f3e59`; exact-head push/CI and hosted
acceptance are pending. Earlier validated source/evidence anchor is
`fb8363c3d4f8def304e3623a094188e3e7232c29`, tree
`a3caaded5c0b16dbe32b8fa4e6bde00ed0382dee`; local Node 24 delta gates and all
six required PR checks pass. The owner has authorized one bounded
pre-production loop.
Production, application recurring
jobs, Social/Travel activation and any provider call beyond the single named
Google AI Mode canary remain prohibited.

## Evidence anchor

- PR [#92](https://github.com/parkourcafe/selena-ai-visibility/pull/92) is merged.
- PR [#95](https://github.com/parkourcafe/selena-ai-visibility/pull/95) is merged
  as release commit `7ac37f43` after final required CI completed successfully.
- Draft PR [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
  is open and still remote at exact head `9f387cad`. Build, E2E
  integration, scheduling policy, deployment smoke, license and CLA checks all
  passed on that historical head. Run links are recorded in
  `ACCEPTANCE_MATRIX_V1_3.md`.
- Historical PR #95 head and release `7ac37f43` share tree
  `03074f76a5dbff51a1389228d902d9809ac3d714`, validated by the successful PR
  CI runs listed in `ACCEPTANCE_MATRIX_V1_3.md`. The earlier PR #92 release
  tree remains historical evidence only.
- Source-only registry, Local Maps rehearsal, Social/Travel fail-closed gates,
  evidence provenance and HoReCa read models are accepted only at their stated
  evidence classes.
- Owner-confirmed rotations for Bright Data, OpenAI, OpenRouter, Resend,
  GitHub and staging Postgres are complete without values. Active sealed
  bindings, runtime RLS, migrations, durable stores and live provider behavior
  remain unverified.

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
| SR-00 Release lineage | Pin the PR #96 source candidate and its exact green CI; record image/build digest and configuration version without secrets | Current local head `2673bcf5` must be pushed and pass exact-head CI; `9f387cad`, `0e00df4f`, `7ac37f43` and `01aa9d0c` are historical evidence, not deploy targets | Read-only local |
| SR-01 Baseline disposition | Triage the registered root lint and `apps/www` local build baselines; do not relabel them as PASS | Either fixed in a reviewed follow-up or accepted as a named non-runtime exception with CI evidence | Source-only follow-up |
| SR-02 Staging topology | Confirm web, worker, migration job and PostgreSQL belong to the intended staging environment; confirm the deployed revisions and that production is not targeted | Inventory receipt contains IDs/revisions only, no credential values; web and worker database binding is consistent | Boundary A |
| SR-03 Safe configuration | Verify presence, not values, of required auth/encryption/database settings; require telemetry and all schedulers/fan-out disabled; require stub selectors for the zero-call phase | Configuration receipt shows fail-closed provider selection, `SCHEDULE_MAINTENANCE_ENABLED=false` and no recurring trigger | Boundary A |
| SR-04 Database preflight | Establish staging backup/restore or disposable rollback evidence; enumerate forward migrations `0037` through `0051`; seal `SELENA_MIGRATION_MAX_INDEX=51`; prove the generated bundle excludes source migration `0052`; verify the one-shot job has restart policy `NEVER` | Backup/rollback owner, migration order, exact upper bound and stop procedure are recorded before any SQL runs | Boundary A, then B |
| SR-05 Migration and RLS proof | After backup verification, apply only pending migrations through 0051 as owner; then run the idempotent least-privilege non-owner role grants; set transaction-local `app.organization_id`; execute same-tenant positives and cross-tenant/privilege negatives | Migration receipt ends at `0051` before role grants; `0052` remains unapplied; RLS denies cross-tenant reads/writes; unallowlisted tables and private evidence columns remain denied; no owner-role result is accepted as proof | Boundary B |
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
| SR-00 | `HOLD_CURRENT_HEAD_PUSH_AND_EXACT_CI` | Local candidate `2673bcf5`, tree `4f979e26`, integrates release `9e1e9930` without rewriting feature history. Historical `9f387cad` CI is green but does not validate the current source. Push, exact-head CI and an immutable Railway image digest remain required. |
| SR-01 | `PASS_LOCAL_HOLD_EXACT_CI` | The registered root lint/build baseline remains resolved. Full local Node 24 lint, typecheck, uncached tests and build passed at `a29e2653`; focused migration tests pass after final release merge. Exact-head CI is pending. Read-only Impeccable retains five pre-existing unrelated findings. |
| SR-02 | `PASS_OWNER_APPROVED_PUBLIC_STAGING_TOPOLOGY` | Release `73446168` auto-deployed web `51e00af1…`, which intentionally serves both existing public domains. The owner designated this staging web as the public pre-launch runtime and prohibited domain transfer. Production web remains absent; existing production Postgres is untouched. |
| SR-03 | `ROTATION_OWNER_CONFIRMED_ACTIVE_BINDINGS_HOLD` | OAuth names-only inventory returned `valuesRedacted=true` for all six staging services; encrypted DB override inventory is empty. Worker and publish remain re-contained; measure/migrate are stopped/crashed. Internal auth/encryption rotations were staged, and the owner confirmed Bright Data/OpenAI/OpenRouter/Resend/GitHub/staging Postgres rotations complete. Zero-call/recurring/billing-off flags are staged; active key-version and flag bindings still require a values-redacted deployment receipt. |
| SR-04 | `PASS_FRESH_BACKUP_AND_ISOLATED_RESTORE_BOUND_51_STAGED_LIVE_WAL_UNKNOWN` | Fresh backup `6907fadf…` has no expiry. PITR workflow `.../cV-XNYy5gGhqKRrGa3-4e` restored `2026-09-01T01:33:02Z` into isolated service `a34b2749…`; deployment `7c2c1261…` is `SUCCESS`, `pg_is_in_recovery=false`, and the copy matches 43 journal rows through `0042` with no `0051` or `selena_app`. Source stayed online. `SELENA_MIGRATION_MAX_INDEX` was set on staging `migrate` with `skip-deploys` to the approved upper bound `51`; no deployment or SQL followed, and restart policy remains `NEVER`. PITR is enabled/bucket-wired and `live.available=true`, but coverage/archiver probes still return SSH exit 10; live WAL telemetry remains `UNKNOWN`. |
| SR-05 | `PASS_SOURCE_ACTUAL_ROLE_DISPOSABLE_HOLD_HOSTED` | Disposable PostgreSQL 16 proof applies through 0051 using the actual non-owner `selena_app`, validates NOINHERIT/NOBYPASSRLS, FORCE RLS, least-privilege ACLs, same-tenant positives, cross-tenant/private-column negatives and cleanup. Source `0052` is outside the authorized staging range; max-51 excludes it. Staging still reports 43 rows through 0042 and `selena_app=ABSENT`; hosted migration/role/RLS remain unexecuted. |
| SR-06 | `AUTO_DEPLOYED_RELEASE_NOT_ACCEPTED` | Release `73446168` remains the last observed auto-deployed web source in the recorded topology. Web deployment `51e00af1…` is running; worker and publish were re-contained to `REMOVED`, while migrate and measure are `CRASHED`. The direct migration binary ran without a Corepack download, but read-only SQL proves the journal remains at `0042`; none of these deployments is accepted runtime boot for current candidate `2673bcf5`. |
| SR-07–SR-08 | `BLOCKED_BY_SR00_SR03_SR05` | Fixture and browser/API RLS acceptance remain unexecuted while exact-head CI, active global provider stop/rotated bindings and hosted runtime RLS are unproven. External rotation itself is no longer the blocker. |
| SR-09 | `AUTHORIZED_EXTERNAL_CAP_EVIDENCE_HOLD` | Bright Data / GOOGLE_AI_MODE / one call / USD 0.25 / total source deadline 24m10s / zero retries / non-recurring. Fresh sanitized provider/account hard-cap evidence at or below USD 0.25 is still required. |
| SR-10 | `NOT_ELIGIBLE_PROVIDER_AND_ACTIVITY_HOLD` | No owner-triggered Google canary occurred. Auto-deploy coincided with three Bright Data estimated cost events totalling USD 0.03; actual external-call count is `UNKNOWN`. Current source has one-shot transport, source-bound preflight, durable snapshot journal, master gate, 24m overall plus 10s cancellation and zero retries. The journal is introduced by source migration `0052`, which is outside the current staging authorization; the canary cannot run until that dependency receives a separate owner decision or an approved durable alternative. Authoritative provider price enforcement and post-call cost reconciliation remain `HOLD`. |
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
