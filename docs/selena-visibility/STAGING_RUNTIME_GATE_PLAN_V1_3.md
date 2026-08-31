# Selena AI Visibility v1.3 — staging/runtime gate plan

Status: `EXECUTION_AUTHORIZED_PARTIAL_RLS_HOLD`

The original anchor is release HEAD
`0e00df4faa74990e6b696c4249cbb85acf23c693`. Current release HEAD is
`04700df5de393cb4d7437a5b467ed753a8554928`; follow-up source checkpoint
`143318c182d3f5f8e9892cd43d1078ccec110dcb` is in draft PR #95, whose final
head must be resolved at deploy time. The owner has
authorized one bounded pre-production loop. Production, application recurring
jobs, Social/Travel activation and any provider call beyond the single named
Google AI Mode canary remain prohibited.

## Evidence anchor

- PR [#92](https://github.com/parkourcafe/selena-ai-visibility/pull/92) is merged.
- The release tree `8b57645aea201baa38a7e71db423df51d61c9753`
  equals the tree validated by the successful PR CI runs listed in
  `ACCEPTANCE_MATRIX_V1_3.md`.
- Source-only registry, Local Maps rehearsal, Social/Travel fail-closed gates,
  evidence provenance and HoReCa read models are accepted only at their stated
  evidence classes.
- Runtime RLS, migrations, durable stores, credentials and live provider
  behavior remain unverified.

## Independent authorization boundaries

| Boundary | What may be done after approval | Current state |
|---|---|---|
| A — shared staging read-only | Inspect deployment metadata, service revisions, bounded logs and configuration key presence without reading values | `AUTHORIZED_IN_PROGRESS` |
| B — staging mutation | Backup/PITR, deploy an immutable revision, run pending migrations through 0051, create fixture rows or restart a service | `AUTHORIZED_WITH_RLS_STOP_CONDITION` |
| C — paid provider canary | One Bright Data `GOOGLE_AI_MODE` request, USD 0.25 maximum, 25-minute hard timeout, zero retries, `recurring=false` | `AUTHORIZED_ONLY_AFTER_SR00_SR08` |
| D — production | Access or mutate production, attach a database, change billing, deploy or schedule work | `OUT_OF_SCOPE` |

Approval of one boundary does not authorize any later boundary.

## Ordered gates

| Gate | Required action and evidence | Pass condition | Authorization |
|---|---|---|---|
| SR-00 Release lineage | Pin the final PR #95 head and, after authorized merge, its exact release merge commit; record image/build digest and configuration version without secrets | Candidate revision and source commit are immutable and traceable; `0e00df4f` is historical evidence, not the deploy target | Read-only local |
| SR-01 Baseline disposition | Triage the registered root lint and `apps/www` local build baselines; do not relabel them as PASS | Either fixed in a reviewed follow-up or accepted as a named non-runtime exception with CI evidence | Source-only follow-up |
| SR-02 Staging topology | Confirm web, worker, migration job and PostgreSQL belong to the intended staging environment; confirm the deployed revisions and that production is not targeted | Inventory receipt contains IDs/revisions only, no credential values; web and worker database binding is consistent | Boundary A |
| SR-03 Safe configuration | Verify presence, not values, of required auth/encryption/database settings; require telemetry and all schedulers/fan-out disabled; require stub selectors for the zero-call phase | Configuration receipt shows fail-closed provider selection, `SCHEDULE_MAINTENANCE_ENABLED=false` and no recurring trigger | Boundary A |
| SR-04 Database preflight | Establish staging backup/restore or disposable rollback evidence; enumerate forward migrations `0037` through `0051`; verify the one-shot job has restart policy `NEVER` | Backup/rollback owner, migration order and stop procedure are recorded before any SQL runs | Boundary A, then B |
| SR-05 Migration and RLS proof | Apply the approved chain once; use a non-owner runtime role; set transaction-local `app.organization_id`; execute positive same-tenant and negative cross-tenant checks | Migration receipt is successful; RLS denies cross-tenant reads/writes; no owner-role result is accepted as proof | Boundary B |
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
| SR-00 | `IN_PROGRESS` | Candidate `143318c1`; PR #95 CI is running. |
| SR-01 | `PASS_LOCAL` | Root lint/tests/build pass on Node 24; warnings remain registered. |
| SR-02 | `PARTIAL_DOMAIN_BINDING_HOLD` | Exact staging project/environment/service IDs are recorded without secret values, but staging web also serves `app.selenasystems.com`; production-like domain isolation is not proven. |
| SR-03 | `PARTIAL` | Key-name and scheduler state audit exists; sealed value correctness is not claimed. |
| SR-04 | `PARTIAL_CHECKPOINT_EXISTS` | PITR enabled/bucket-wired; Postgres deploy successful; named backup `92f3adae…` exists. WAL health, restore range and restore rehearsal remain `UNKNOWN`. |
| SR-05 | `HOLD_APP_RUNTIME` | Read-only journal proves staging through 0042 with 0043–0051 pending. App-wide transaction-local tenant context is incomplete; no runtime role switch allowed. |
| SR-06–SR-08 | `BLOCKED_BY_SR05` | Web/worker candidate, fixture and browser/API RLS acceptance must not be relabelled as complete while runtime RLS is unproven. |
| SR-09 | `AUTHORIZED_FROZEN` | Bright Data / GOOGLE_AI_MODE / one call / USD 0.25 / 25m / zero retries / non-recurring. |
| SR-10 | `NOT_ELIGIBLE` | No provider call has occurred; SR-00–SR-08 are not all green. |
| SR-11 | `PROHIBITED` | Social and Travel activation not authorized. |

## Provider canary invariants

- One dataset and one request per approval; `recurring=false` and no generic
  queue retry.
- `providerCalls=1` is a hard maximum, not a target to retry toward.
- A cost quote, cap and remaining-account-budget check precede dispatch.
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
