# Selena AI Visibility v1.3 — post-merge acceptance matrix

This matrix supplements v1.2/v1.2.1. It records source-only acceptance and does
not promote local evidence to runtime, hosted staging or production proof.

## Post-merge evidence anchor

### Canonical staging acceptance candidate — 2026-09-01

- Draft PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Exact local source HEAD: `2673bcf56639eea113f5e557bba5e55c79da2e4b`
- Exact tree: `4f979e26b7fb38ff4b6c192e303b7fda0c5f3e59`
- Current release parent: `9e1e993090fb6ef133b147b5341f2ff8591ade6c`
- Remote PR HEAD before the next authorized push: `9f387cad47211c2a3d5b6970ecc826c27800edcc`
- Current-candidate CI: `PENDING_PUSH`; the green runs linked below validate
  historical head `9f387cad`, not `2673bcf5`.

This is the single local source candidate for the current staging loop. Merge
commits `74dfaf27` and `2673bcf5` preserve feature payment/provider/database
hardening while integrating release UGC discovery plus the latest migration
runner and concise failure diagnostics through release `9e1e9930`. Source
commits `21e61a4f`, `5ce45990` and `a29e2653` add bounded migration/publisher
gates, receipt-backed HoReCa evidence acceptance and a private raw-evidence
boundary. The protected untracked handoff remains excluded.

Owner-confirmed credential evidence, 2026-09-01: `BRIGHTDATA`, `OPENAI`,
`OPENROUTER`, `RESEND`, `GITHUB` and staging Postgres credentials were rotated
after the unsafe output. This closes the manual revoke/reissue decision item.
It does not by itself prove that every deployed staging service has the new
key version or that fail-closed flags are active; names-only hosted
configuration and deployment receipts remain required before SQL or runtime
acceptance.

Source now contains migration `0052` for the append-only provider snapshot
journal. The owner's staging authorization still ends at `0051`. The packaged
migration runner requires `SELENA_MIGRATION_MAX_INDEX`; staging must seal it to
`51`, and the generated bundle must prove that `0052` is excluded before the
migration service starts. The provider canary therefore remains ineligible on
staging until `0052` receives separate owner authorization or an approved
durable journal path exists.

The staging `migrate` service has names-only confirmation that
`SELENA_MIGRATION_MAX_INDEX` was set with `skip-deploys`; the intended bound is
`51`. No deployment was triggered. Read-back deployment metadata remains on
the earlier `273488fd` image, status `CRASHED`, with restart policy `NEVER`.
This configuration receipt does not apply SQL. External credential rotation is
owner-confirmed; hosted key-version presence remains a separate read-only gate.

The owner designated current Railway staging as the public pre-launch
acceptance runtime and required both public domains to remain attached. During
this loop Railway Git integration automatically deployed release `73446168`.
The auto-started worker and publish deployments were immediately stopped;
measure and migrate are crashed/stopped. Read-only SQL after the failed migrate
attempt still reports 43 journal rows through `0042`, no `0051` table and no
`selena_app` role. No migration was applied by that external auto-deploy.

Fresh pre-mutation backup `6907fadf-d73b-49fd-b052-11715c5daabf`
(`selena-v1-3-pre-mutation-2026-09-01`, no expiry) was created from staging
Postgres. PITR workflow
`createServiceFromPITR/51dd0770-e622-4734-a705-ace401234bb8/1bcbf5f8-176f-41ac-aafd-c8e6d7884dfc/cV-XNYy5gGhqKRrGa3-4e`
restored target `2026-09-01T01:33:02Z` into isolated staging service
`a34b2749-130a-47f3-8da3-8f58e3775fe9`; deployment
`7c2c1261-b879-41af-b0cd-510a231020f9` is `SUCCESS`. Read-only SQL on the
promoted copy reports `pg_is_in_recovery=false`, the same 43 journal rows
through `0042`, no `0051` table and no `selena_app` role. Source Postgres stayed
online and unchanged.

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
- PR #99 subsequently advanced release to
  `73446168eb79983c45fc990dec3c5f5fdf7f9a0d`. PR #96 integrated that release
  through merge commit `1b6c8df0` without rebase or history rewrite.
- PRs #97 and #100 subsequently advanced release to
  `273488fdf157cc6256e3f39f92afb16a2c42f776`. PR #96 integrated that release
  through merge commit `9f387cad47211c2a3d5b6970ecc826c27800edcc`
  without rebase or history rewrite.
- Draft follow-up PR
  [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96) is open and
  draft. Its last pushed exact CI-validated head is
  `9f387cad47211c2a3d5b6970ecc826c27800edcc`, tree
  `68a8fe0defead14cf82ec7e6fba499b09a39f8fb`. Current mergeability must be
  refreshed after pushing `2673bcf5`.
- Two reviewed historical source commits after the earlier green anchor
  `b86540c9` are included in `9f387cad`:
  `bb8f123c` persists the exact validated Google AI Mode canary capture as
  private `CANARY_ONLY` evidence without creating accepted measurement or cost
  evidence, and `4916125eae194dc4d15c5b4e3e8ed359f43dc274` binds the HoReCa
  route to tenant/project-scoped safe projections while failing closed when
  authoritative acceptance provenance is absent. Current local implementation
  is `2673bcf5`, tree `4f979e26`, and supersedes that safe-view gap with
  receipt-backed acceptance plus private-evidence filtering. Local gates pass;
  all six required PR checks currently validate only historical `9f387cad`.

| Gate | Required evidence | Current status | Evidence class |
|---|---|---|---|
| V13-BASELINE | Four approved documents hashed; `0d1f21ed` relationship and release HEAD `0e00df4f` recorded; handoff excluded | `PASS_POST_MERGE` | Repository/read-only local |
| V13-REGISTRY | Domain/surface-aware registry with 13 exact dataset definitions, versioned schemas, external attempt policy and no embedded new dataset IDs | `PASS_SOURCE_ONLY` | Source only |
| V13-GOOGLE | Google AI Mode, SERP, Maps Place and Maps Reviews contract adapters preserve domain separation and require lifecycle captures before normalization | `PASS_SOURCE_ONLY` | Source only |
| V13-SOCIAL | Social definitions must fail closed until schema, privacy, retention, deletion propagation, legal hold, source terms and cost evidence exist; Social never contributes to AI visibility | `PASS_SOURCE_ONLY_DISABLED` | Source only |
| V13-TRAVEL | Hotels input remains rejected and the module remains hidden until a stable schema and explicit HoReCa product gate exist | `PASS_SOURCE_ONLY_HIDDEN` | Source only |
| V13-EVIDENCE | Capability/source snapshot/evidence provenance is tenant-scoped; public read models expose only a provenance boolean/ledger locator while raw locators, hashes and actor identity remain private; a successful one-shot capture is persisted privately and remains in cost/acceptance HOLD | `PASS_SOURCE_AND_DISPOSABLE_RUNTIME_UNKNOWN` | Source plus disposable DB |
| V13-HORECA | Local-first read model exposes independent modules, UNKNOWN and evidence-linked actions without a composite score; append-only acceptance receipts supply the authoritative timestamp while `accepted_by` remains private | `PASS_SOURCE_UI_AND_DISPOSABLE_RLS` | Source/UI plus disposable DB |
| V13-PILOTS | AVLI and KORA packages contain evidence/UNKNOWN gates, intent ontology, report templates and unit-economics decision fields without fabricated facts | `PASS_ARTIFACT` | Repository artifact |
| V13-TESTS | Registered root lint/build baselines remain resolved; full Node 24 lint, typecheck, uncached tests and build passed on `a29e2653`; targeted migration tests pass after release-diagnostics merge `2673bcf5`; exact-head CI awaits push | `PASS_LOCAL_CI_PENDING_PUSH` | Local |
| V13-STABILITY | Deterministic Local Maps rehearsal passes five isolated Node 24 replays with zero transport calls, cost, persistence or evidence eligibility | `PASS_LIMITED_REPLAY` | Local executed |
| V13-CODEX | Independent Provider, Database/Evidence and HoReCa reviews drove remediation; final slice reviews report no remaining P0/P1, while hosted runtime/cost evidence stays gated | `PASS_SOURCE_ONLY_RUNTIME_COST_HOLD` | Static independent review |
| V13-CLAUDE | Blind read-only Claude Max review of immutable commit `a29e2653` completed without repository mutation or permission denials; its provider-registry, attempt-limit and 0052 recommendations were independently checked and rejected where contradicted by source/owner scope | `PASS_READ_ONLY_WITH_FINDINGS_TRIAGED` | Static independent review |
| V13-BRANCH | Exact local source is `2673bcf5`; push and exact-head CI are pending; the protected handoff remains excluded | `PASS_LOCAL_PENDING_PUSH_HANDOFF_EXCLUDED` | Git |
| V13-PR | PR #92/#95 are historical merged evidence; draft PR #96 is still remote at historical green head `9f387cad` until the authorized push | `PENDING_EXACT_HEAD_PUSH_CI` | GitHub/CI |
| V13-RUNTIME | Staging service IDs, fresh named backup, disposable 0051 actual-role RLS and an isolated PITR restore rehearsal are verified; both public domains intentionally remain on staging. Credential rotation is owner-confirmed, but deployed key-version presence, active zero-call configuration and hosted non-owner RLS remain unproven; migrations, fixtures and the Google canary remain unexecuted | `PARTIAL_BACKUP_ROTATION_CONFIRMED_HOSTED_RLS_HOLD` | Runtime/hosted |

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

Current source-stack evidence was executed on Node `v24.18.0` at `a29e2653`:
root lint `PASS` with zero errors, 129 warnings and 12 infos; all 13 workspace
typechecks `PASS`; uncached root tests `15/15` Turbo tasks with lib 89 files /
1069 tests and web 46 passed files plus one skipped / 438 passed plus four
skipped; uncached root build `16/16` tasks `PASS`. Read-only Impeccable detect
ran and returned the same five pre-existing, unrelated findings (competitor
directory gray-on-color, navbar bounce, Geist Sans/Mono and two
website-collector broken-image patterns); no suppression or UI mutation was
made. After merging release `9e1e9930`, the focused migration suite passed
`6/6` on local Node `v22.23.0`; final exact-head Node 24 CI remains pending.

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
affected credentials were treated as compromised. Service identity is verified.
The owner subsequently designated this web as the public pre-launch staging
runtime and required both domains to remain attached, closing the topology
decision without converting staging evidence into production acceptance.

The owner first authorized domain detachment/transfer and later superseded it
with an explicit keep-on-staging decision. Fresh read-only topology evidence
found no alternate target: Railway environment `production` contains only PostgreSQL service
`1d67db6f-7df7-44d6-a9d7-3d7058afafff`, with no web deployment or production
web domain. No domain mutation was performed. A conservative names-only
credential inventory and empty database-stored override inventory were
recorded; the owner later confirmed all named external and staging Postgres
rotations complete without disclosing values.
A domain-status response also exposed a verification token as operational
metadata; it is not reproduced and must be revalidated/rotated if supported.

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
  source tests pass locally. Historical PR #96 head `9f387cad` is green; the
  current local candidate `2673bcf5` still needs exact-head CI and is not
  deployed staging evidence.
- During the configuration-presence audit, Railway CLI `variable list`
  unexpectedly rendered raw staging values instead of key names only. No value
  is copied into this artifact, but the exposed auth, database, provider,
  email, encryption and certificate material is treated as compromised.
  Owner-confirmed rotation is complete. Runtime acceptance still requires a
  values-redacted active-binding check and accepted deployment evidence.
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
