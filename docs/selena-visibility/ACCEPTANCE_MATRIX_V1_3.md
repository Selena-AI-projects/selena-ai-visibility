# Selena AI Visibility v1.3 — post-merge acceptance matrix

This matrix supplements v1.2/v1.2.1. It records source-only acceptance and does
not promote local evidence to runtime, hosted staging or production proof.

## Post-merge evidence anchor

- Release branch: `release/selena-visibility-mvp`
- Original acceptance release HEAD: `0e00df4faa74990e6b696c4249cbb85acf23c693`
- Merged PR: [#92 — feat(visibility): add source-only v1.3 acceptance package](https://github.com/parkourcafe/selena-ai-visibility/pull/92)
- PR head validated by CI: `a79a65117ecc4aa3e8f8cd2abcef7cebafd2c406`
- Release and validated PR tree: `8b57645aea201baa38a7e71db423df51d61c9753`
- Merge completed at `2026-08-31T09:32:57Z` by `parkourcafe`.

The release merge commit and the CI-validated PR head have the same Git tree.
The successful pull-request checks therefore validate the released source tree,
but they are not represented as direct workflow executions on the merge commit.
The only observed workflow attached directly to `0e00df4f` was a skipped
[Claude Code run](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33378228255),
which is not counted as acceptance evidence.

## Follow-up pre-production candidate

- The release branch advanced after the original acceptance anchor to
  `04700df5de393cb4d7437a5b467ed753a8554928` through merged PR
  [#94](https://github.com/parkourcafe/selena-ai-visibility/pull/94). The
  feature branch merged that release hardening without rebase or history
  rewrite.
- Follow-up PR
  [#95](https://github.com/parkourcafe/selena-ai-visibility/pull/95) passed all
  required checks at final head
  `6b73fefdee6229389855e2cbe4607424e0dd7c89` and merged into
  `release/selena-visibility-mvp` as
  `7ac37f436b08f0e48c97acb61dfaee8a6458760a` at
  `2026-08-31T13:07:37Z`.
- Final PR head and historical release `7ac37f43` share tree
  `03074f76a5dbff51a1389228d902d9809ac3d714`.
- Source commits `4e017a73` and `ef435a2c` add fail-closed runtime guards and
  close the reproducible root lint/build errors. Merge commit `143318c1`
  retains the later release breaker behavior and the new provider stop guard;
  `6b73fefd` makes the provider snapshot deadline test deterministic without
  changing runtime source.
- No owner-triggered canary, production action, Social/Travel activation or
  billing change occurred. At the bounded containment checkpoint, the selected
  maintenance, retention and Auth0 schedule rows were absent. This does not
  prove a historical zero across every recurring path. The release merge did
  trigger Railway Git deployment and resumed pre-existing VISITOR work; that
  separate runtime activity is recorded below.
- Release `7ac37f43` is now a historical/rollback image only. It contains the
  provider-stop gaps found after its automatic Railway deployment and is not an
  eligible redeploy candidate.
- The release branch later advanced to
  `32945b27202949debf0e27cbf48053d01ed2559e`. PR #96 integrated that exact
  release commit through merge commit `07199eda9a1584dc6e4cc8f02d84883d311392b5`
  without rebase or history rewrite.
- Draft follow-up PR
  [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96) is open,
  draft, clean and mergeable from `feature/selena-visibility-v1-2-1`. Its
  exact CI-validated head is
  `fb8363c3d4f8def304e3623a094188e3e7232c29`, tree
  `a3caaded5c0b16dbe32b8fa4e6bde00ed0382dee`.
- Two reviewed source commits after the earlier green anchor `b86540c9` are
  included in that exact head:
  `bb8f123c` persists the exact validated Google AI Mode canary capture as
  private `CANARY_ONLY` evidence without creating accepted measurement or cost
  evidence, and `4916125eae194dc4d15c5b4e3e8ed359f43dc274` binds the HoReCa
  route to tenant/project-scoped safe projections while failing closed when
  authoritative acceptance provenance is absent. Current local implementation
  implementation tree is `502b98fb678a8d2e94887f579bd452a73d145821`.
  Node 24 targeted tests, typechecks, changed-file Biome and the web build pass;
  all six required PR checks also pass on exact head `fb8363c3`.

| Gate | Required evidence | Current status | Evidence class |
|---|---|---|---|
| V13-BASELINE | Four approved documents hashed; `0d1f21ed` relationship and release HEAD `0e00df4f` recorded; handoff excluded | `PASS_POST_MERGE` | Repository/read-only local |
| V13-REGISTRY | Domain/surface-aware registry with 13 exact dataset definitions, versioned schemas, external attempt policy and no embedded new dataset IDs | `PASS_SOURCE_ONLY` | Source only |
| V13-GOOGLE | Google AI Mode, SERP, Maps Place and Maps Reviews contract adapters preserve domain separation and require lifecycle captures before normalization | `PASS_SOURCE_ONLY` | Source only |
| V13-SOCIAL | Social definitions must fail closed until schema, privacy, retention, deletion propagation, legal hold, source terms and cost evidence exist; Social never contributes to AI visibility | `PASS_SOURCE_ONLY_DISABLED` | Source only |
| V13-TRAVEL | Hotels remains canary-only and blocked from runtime/product activation until stable schema and HoReCa gate | `PASS_SOURCE_ONLY` | Source only |
| V13-EVIDENCE | Capability/source snapshot/evidence provenance is tenant-scoped; raw references and private hashes remain denied; reserved schemas are not invented; a successful one-shot capture is persisted privately and remains in cost/acceptance HOLD | `PASS_SOURCE_AND_DISPOSABLE_RUNTIME_UNKNOWN` | Source plus disposable DB |
| V13-HORECA | Local-first read model exposes independent modules, UNKNOWN and evidence-linked actions without a composite score; the runtime route remains source-only until an authoritative acceptance decision/timestamp can be joined | `PASS_SOURCE_UI_ACCEPTANCE_PROVENANCE_HOLD` | Source/UI only |
| V13-PILOTS | AVLI and KORA packages contain evidence/UNKNOWN gates, intent ontology, report templates and unit-economics decision fields without fabricated facts | `PASS_ARTIFACT` | Repository artifact |
| V13-TESTS | Registered root lint/build baselines remain resolved; current-delta Node 24 tests, typechecks, changed-file Biome and web build pass; PR #96 exact head `fb8363c3` passes Build, E2E integration, scheduling policy, smoke, license and CLA | `PASS_CURRENT_HEAD_CI_GREEN` | Local plus exact PR CI |
| V13-STABILITY | Deterministic Local Maps rehearsal passes five isolated Node 24 replays with zero transport calls, cost, persistence or evidence eligibility | `PASS_LIMITED_REPLAY` | Local executed |
| V13-CODEX | Independent Provider and HoReCa post-CI reviews drove capture-persistence and read-model remediation; repeat reviews report no remaining P0/P1 in those slices, while runtime/cost evidence stays gated | `PASS_SOURCE_ONLY_EXTERNAL_COST_HOLD` | Static independent review |
| V13-CLAUDE | Blind read-only Claude Max review of immutable commit `5e616e63` completes without mutation or API fallback | `PASS_READ_ONLY_WITH_RUNTIME_GATES` | Static independent review |
| V13-BRANCH | Source and evidence are pushed through exact green head `fb8363c3`; the untracked protected handoff remains excluded | `PASS_PUSHED_HANDOFF_EXCLUDED` | Git |
| V13-PR | PR #92/#95 are historical merged evidence; draft PR #96 is clean/mergeable and all six required checks pass on exact head `fb8363c3` | `PASS_DRAFT_PR_CI` | GitHub/CI |
| V13-RUNTIME | Staging service IDs, named backup, disposable 0051 schema RLS and an isolated PITR restore rehearsal are verified; production-like domain isolation, global provider containment and app-wide non-owner RLS remain unproven; migrations, fixtures and the Google canary remain unexecuted | `PARTIAL_BACKUP_PASS_PROVIDER_AND_APP_RLS_HOLD` | Runtime/hosted |

## GitHub CI evidence

All required PR checks below completed successfully against `a79a6511`, whose
tree is byte-identical to release HEAD `0e00df4f`.

| Workflow | Run | Result |
|---|---|---|
| Build | [33374448893](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33374448893) | `SUCCESS` |
| E2E Tests — E2E Integration Tests and Scheduling Policy Verification | [33374448908](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33374448908) | `SUCCESS` |
| Deployment Smoke Tests | [33374448925](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33374448925) | `SUCCESS` |
| License Check | [33374448946](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33374448946) | `SUCCESS` |
| CLA Check | [33374448953](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33374448953) | `SUCCESS` |

Final follow-up head `6b73fefd` completed the bounded Blacksmith CI cycle for
PR #95:

| Workflow | Run | Checkpoint result |
|---|---|---|
| Build | [33392533928](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33392533928) | `SUCCESS` |
| E2E Tests | [33392533929](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33392533929) | Integration `SUCCESS`; scheduling policy `SUCCESS` on bounded rerun after one cold-run readiness race |
| Deployment Smoke Tests | [33392533945](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33392533945) | `SUCCESS` |
| License Check | [33392533932](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33392533932) | `SUCCESS` |
| CLA Check | [33392533943](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33392533943) | `SUCCESS` |

The first scheduling-policy attempt reached the verifier before its named queue
was ready; the adjacent worker log was still empty. The immediately preceding
run passed on identical scheduling source, and the bounded rerun passed both
local and cloud scheduling modes. No scheduling-source change was made or
required for this merge.

Draft PR #96 last pushed head `71e5b8ef` also completed a green Blacksmith
cycle: [Build 33397249574](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33397249574),
[E2E 33397249625](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33397249625),
[Smoke 33397249619](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33397249619),
[License 33397249648](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33397249648)
and [CLA 33397249576](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33397249576).
These runs are historical evidence only until the current working tree is
committed and a new CI cycle passes.

PR #96 historical head `90234ad3` triggered a fresh cycle, but none of the
six required jobs reached a runner or executed a step:

| Workflow | Run | Result |
|---|---|---|
| Build | [33413214322](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214322) | `FAILURE_BEFORE_RUNNER` |
| E2E Tests — E2E Integration Tests and Scheduling Policy Verification | [33413214325](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214325) | `FAILURE_BEFORE_RUNNER` |
| Deployment Smoke Tests | [33413214314](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214314) | `FAILURE_BEFORE_RUNNER` |
| License Check | [33413214321](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214321) | `FAILURE_BEFORE_RUNNER` |
| CLA Check | [33413214313](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214313) | `FAILURE_BEFORE_RUNNER` |

The GitHub check annotations state that the jobs were not started because
recent account payments failed or the Actions spending limit must be
increased. The runs completed in two to three seconds with empty runner names,
zero steps and no job logs. This is a verified external billing/admission hold,
not evidence of a source failure. No rerun was requested because billing
changes remain owner-controlled.

After the owner restored the Actions budget, PR #96 integrated current release
`32945b27` and closed the migration-image and report-auth E2E failures. Exact
head `b86540c99ab8621a763e399873c5aec3e8744cfe` completed a fully green cycle:

| Workflow | Run | Result |
|---|---|---|
| Build | [33430941473](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430941473) | `SUCCESS` (`5m35s`) |
| E2E Tests | [33430942597](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430942597) | Integration `SUCCESS` (`10m43s`); scheduling policy `SUCCESS` (`3m26s`) |
| Deployment Smoke Tests | [33430941439](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430941439) | `SUCCESS` (`1m34s`) |
| License Check | [33430941540](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430941540) | `SUCCESS` (`1m18s`) |
| CLA Check | [33430941516](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430941516) | `SUCCESS` (`8s`) |

The earlier account billing/admission failure remains historical evidence; it
is no longer the current blocker. No deployment or provider call was triggered
by this CI cycle.

Post-CI hardening head `fb8363c3d4f8def304e3623a094188e3e7232c29`
completed a second fully green exact-head cycle:

| Workflow | Run | Result |
|---|---|---|
| Build | [33437012225](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012225) | `SUCCESS` (`5m20s`) |
| E2E Tests | [33437012212](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012212) | Integration `SUCCESS` (`10m39s`); scheduling policy `SUCCESS` (`2m34s`) |
| Deployment Smoke Tests | [33437012218](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012218) | `SUCCESS` (`1m34s`) |
| License Check | [33437012248](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012248) | `SUCCESS` (`1m15s`) |
| CLA Check | [33437012219](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012219) | `SUCCESS` (`6s`) |

## Local stability replay

Executed with Node `v24.18.0`, pnpm `11.18.0` and Vitest `4.1.10`:

```text
pnpm --filter @workspace/lib exec vitest run src/adapters/stub-local-maps-adapter.test.ts
```

Five isolated executions passed `5/5` tests each (`25/25` total). Durations were
`7.72s`, `6.88s`, `6.75s`, `6.82s` and `6.77s`. Every execution exercised the
125-slot rehearsal contract. The test forbids `fetch`, requires
`externalProviderCalls=0` and `costUsd=0.000000`, and rejects persistence or
evidence eligibility. No provider, database, billing or scheduler action was
performed.

## Resolved repository baselines

These failures reproduced on Node `v24.18.0` against the original released
tree. They remain registered as historical evidence and were closed by the
follow-up candidate; warnings remain non-blocking and are not hidden.

| Command | Result | Registered baseline |
|---|---|---|
| `pnpm lint` | `RESOLVED_PASS` | Original: 33 errors, 132 warnings and 14 infos. Follow-up: zero errors; 132 warnings and 14 infos remain registered. |
| `pnpm build` | `RESOLVED_PASS` | Original: 40 `UNLOADABLE_DEPENDENCY` errors. Follow-up: portable `fileURLToPath` alias plus the package-owned Titan One dependency; root Turbo build passes 16/16 tasks. |

Follow-up Node 24 evidence: root lint `PASS`; root tests `15/15` Turbo tasks
(`977/977` lib tests, `412/412` executed web tests and four DB-dependent web
tests skipped); root build `16/16` Turbo tasks. The www path diagnosis was
confirmed by a no-space control and by a successful build in the original path
after the source fix. `impeccable detect` was not available as a local command,
so no Impeccable PASS is claimed.

Current local PR #96 source-stack evidence on Node `v24.18.0`: root lint
`PASS` with zero errors, 129 warnings and 12 infos; all 16 workspace typechecks
`PASS`; uncached root tests `15/15` Turbo tasks with lib `1012/1012`, web
`421/421` executed and four database-dependent web tests skipped; uncached root
build `16/16` tasks `PASS`. `npx --no-install impeccable detect` remains
unavailable because the local npm cache contains root-owned files (`EPERM`); no
permissions were changed and no Impeccable PASS is claimed.

Final frozen Codex Security diff scan
`c767fbb5-efb5-45ec-9296-d2e81470b5de` reviewed 73/73 items and produced zero
reportable findings. The only deferred item is authoritative Bright Data
provider/account hard-cap evidence and actual-cost reconciliation; this keeps
the provider canary at `HOLD` without reopening a source P0/P1/P2.

## Shared staging evidence checkpoint

Scope is Railway project `51dd0770-e622-4734-a705-ace401234bb8`, environment
`90f3bf7f-5e53-4de3-a3f7-56052b706f24` (`staging`) and Postgres service
`280e3b59-77c3-46e0-8c2c-75955b7f9a40`. A key-presence command unexpectedly
printed raw staging values during this audit. No value is reproduced here; the
affected credentials are treated as compromised. Service identity is verified,
but topology acceptance is not: the staging web
service also has the production-like `app.selenasystems.com` binding, so SR-02
remains `HOLD` until domain ownership/blast radius is resolved.

- A fresh read-only inventory after release advanced to `32945b27` found that
  Railway Git integration had again deployed that release to staging. Web
  deployment `3eefbf4a-f3f3-41fc-a25b-2e9c9aef2af3` was `SUCCESS` and still
  served both `app.selenasystems.com` and `staging.selenasystems.com`. Worker
  deployment `c50d857e-3b65-4218-80cc-fd026e0842bc` was `SUCCESS` and running;
  bounded logs showed maintenance disabled and worker ready, but did not prove
  the master emergency-stop or measurement values. Migration deployment
  `2b092c4c-a885-45ed-aedc-ae9046f97666` was stopped/`CRASHED`; its bounded
  error log showed Corepack attempting a runtime pnpm download. This is the
  released `pnpm exec` image path, not the direct packaged-binary path already
  green in PR #96.
- Because SR-03 was not proven, the authorized automatic staging containment
  stopped the newly active worker. The resulting latest worker marker is
  `5adf69b9-4a37-4b4c-b05b-904c828d3542`, `deploymentStopped=true`. Web was not
  changed because of the production-like domain binding. Migration, Postgres,
  provider and billing state were not mutated. Bounded worker DNS searches for
  Bright Data, DataForSEO and Perplexity over the inspected 12-hour window
  returned no rows; this is only an observation and not proof of zero calls.
- The post-CI read-only refresh reconfirmed the named backup
  `92f3adae-a05a-4f64-b064-f48c55001149` with `expiresAt=null`. PITR remains
  enabled and bucket-wired with `live.available=true`, but both live backup
  coverage and archiver probes still return SSH exit 10; live WAL coverage is
  therefore `UNKNOWN`, not PASS.

- Merging PR #95 triggered Railway Git deployment automatically. Web deployment
  `9786b6fe-3a83-4f75-a23f-55cd903e04e9` and worker deployment
  `e781bec1-8d4f-499b-93bf-ccf45379873c` reached `SUCCESS` for release
  `7ac37f43`; this occurred before SR-02/SR-05 were accepted and is not runtime
  acceptance evidence.
- The post-deploy migration journal remained at 43 rows through `0042`; pending
  migrations `0043`–`0051` were not applied.
- Read-only post-deploy ledger evidence showed zero new permits, three new
  VISITOR run rows and three Bright Data estimated cost events totalling
  `USD 0.030000`. Two runs were `SUCCEEDED` and one remained `RUNNING` in the
  ledger, while pg-boss had no active/created/retry `selena-measure` or
  `process-prompt` jobs. The exact number of new external provider calls is
  therefore `UNKNOWN`, not zero.
- Automatic staging containment set `SELENA_EMERGENCY_STOP=true`,
  `SELENA_MEASUREMENT_ENABLED=false` and
  `SCHEDULE_MAINTENANCE_ENABLED=false` on worker deployment
  `ff17e6a2-2113-4c03-87ea-453d0aaa89de`. Bounded logs confirm maintenance is
  disabled and the worker reached ready; the pg-boss schedule table contains no
  maintenance, answer-retention or Auth0 recurring schedule. A subsequent
  read-only checkpoint showed zero new permits, runs, cost events or active
  `selena-measure`/`process-prompt` queue jobs after this containment
  deployment.
- PITR reports `enabled=true` and `bucketWired=true`. Postgres deployment
  `d57b8ebb-547b-4277-a109-2c072308b5a9` reached `SUCCESS` on image digest
  `sha256:8dbbfcb7fafacc22c01dc0c425c38793b5d0449163a3d178d3e3767d43e6f3ee`.
- Named pre-migration volume backup
  `selena-v1-3-pre-migration-2026-08-31` exists as backup
  `92f3adae-a05a-4f64-b064-f48c55001149`; creation workflow is
  `createVolumeInstanceBackup/1bcbf5f8-176f-41ac-aafd-c8e6d7884dfc` and
  `expiresAt=null`.
- The platform PITR health probe still reports live coverage and archiver
  errors as SSH exit 10, so those two telemetry fields remain `UNKNOWN`.
  Restoreability itself is now independently verified: PITR workflow
  `createServiceFromPITR/51dd0770-e622-4734-a705-ace401234bb8/1bcbf5f8-176f-41ac-aafd-c8e6d7884dfc/gVug7V8EP2ZFqRiuYaoD9`
  restored target `2026-08-31T13:26:46Z` into isolated staging service
  `33032d1f-fded-47d2-bc5e-fa907e044b52`; deployment
  `eb887613-e5b3-4740-893d-4589ca5e8c12` reached `SUCCESS`. The restored DB
  was promoted (`pg_is_in_recovery()=false`), retained the 43-row migration
  journal through `0042`, contained `organization`, and correctly lacked the
  still-pending 0051 capability table. The source DB remained online with the
  same technical receipt. The rehearsal service was deleted and its restored
  volume was submitted for deletion; neither web nor worker was rebound.
- The current read-only staging refresh shows 43 applied journal rows and latest
  timestamp `1787940004000`, which matches local journal entry `0042`; `0043`
  through `0051` remain pending. Catalog lookup reports `selena_app=ABSENT`.
  No SQL mutation occurred.
- App-wide hosted runtime RLS is `HOLD`: the reviewed source closes the report
  bootstrap/tenant-context gaps and the idempotent least-privilege role proof
  passes in disposable PostgreSQL. Manual journal publication and recurring
  retention remain deliberately disabled. Web/worker must not be switched to
  `selena_app` until the role is created through the reviewed grant path and
  hosted role attributes, migrations and staging
  browser/API/RLS gates pass using an actual non-owner connection.
- The disposable 0051 schema probe now passes against an isolated PostgreSQL 16
  compose project. It verified same-tenant read/write, denied cross-tenant
  access, kept private provenance inaccessible, rolled back the probe role and
  fixtures, and removed the disposable container/network/volume. This is
  `PASS_SCHEMA_ONLY`, not app-runtime RLS acceptance; no staging SQL was
  applied.
- The current working tree adds a master provider gate across registry,
  scheduler, worker, legacy transport and self-rescheduling paths. Targeted
  source tests pass and exact-candidate PR #96 CI is green. This is still not
  deployed staging evidence.
- During the configuration-presence audit, Railway CLI `variable list`
  unexpectedly rendered raw staging values instead of key names only. No value
  is copied into this artifact, but the exposed auth, database, provider,
  email, encryption and certificate material is treated as compromised.
  Runtime acceptance now requires owner-authorized rotation and verification;
  the production-like domain binding prevents an autonomous rotation here.
- As immediate containment, staging worker deployment `ff17e6a2…` was stopped.
  The legacy `measure` deployment was also stopped; Railway records its latest
  stopped marker as `ddb451ab-61c8-41f2-a726-59331334e276`. A bounded database
  checkpoint from `2026-08-31T14:05:00Z` through `14:11:59Z` found zero new
  permits, runs, cost events, cost and selected active provider jobs. Web was
  not restarted or reconfigured because it serves the production-like domain.
  The web configuration key inventory does not contain the master emergency
  stop key, so direct user-triggered onboarding/provider paths remain a P0
  runtime risk on the current release even though background executors are
  stopped. Correcting that live binding requires explicit production-impact
  permission or an isolated replacement web service.
- New owner-triggered `GOOGLE_AI_MODE` canary calls in this execution loop are
  `0`. Earlier Perplexity canaries and the post-deploy VISITOR ledger activity
  mean no lifetime/account-wide or general provider-call zero is claimed.

## Dataset contract inventory

The v1.3 registry must contain exactly these 13 discovery definitions:

1. `GOOGLE_AI_MODE`
2. `GOOGLE_SERP`
3. `GOOGLE_MAPS_REVIEWS`
4. `GOOGLE_MAPS_PLACE`
5. `GOOGLE_TRAVEL_HOTELS`
6. `INSTAGRAM_PROFILES`
7. `INSTAGRAM_POSTS`
8. `INSTAGRAM_REELS`
9. `INSTAGRAM_COMMENTS`
10. `TIKTOK_PROFILES`
11. `TIKTOK_POSTS`
12. `REDDIT_POSTS`
13. `YOUTUBE_VIDEOS`

Canary-ready means the contract can validate an owner-approved isolated canary.
It does not mean the source has been called, its output schema is known, or the
capability is available to a customer.

## Unconditional stop conditions

- Any credential or raw provider error reaches a client response or export.
- A source-only import, migration or UI render creates a task or provider call.
- Attempt count exceeds three or a generic queue retry is enabled.
- Maps Place is treated as Maps rank evidence, Google AI Mode is mixed with
  Google SERP, or Social is stored as Reviews.
- Social/Travel is shown as active before capability, retention and entitlement
  approval.
- UNKNOWN is converted to zero, a benchmark, a rank or an inferred outcome.
- Cross-tenant evidence/provenance can be joined without tenant scope.
