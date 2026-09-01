# Selena AI Visibility v1.3 — orchestration state

- State: `LOCAL_CANDIDATE_READY_PUSH_CI_HOSTED_RLS_PROVIDER_HOLD`
- Context mode: `repository_only`
- Feature branch: `feature/selena-visibility-v1-2-1`
- Current source head at sprint start: `3cc2328e89ca7dfb55520db1dc09f31eefcd4f02`
- Release comparison snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Original acceptance release HEAD: `0e00df4faa74990e6b696c4249cbb85acf23c693`
- Current release HEAD integrated: `9e1e993090fb6ef133b147b5341f2ff8591ade6c`
- Historical follow-up source head: `6b73fefdee6229389855e2cbe4607424e0dd7c89`
- Historical feature release-integration merge: `07199eda9a1584dc6e4cc8f02d84883d311392b5`
- Historical validated source/evidence anchor: `fb8363c3d4f8def304e3623a094188e3e7232c29`
  (tree `a3caaded5c0b16dbe32b8fa4e6bde00ed0382dee`)
- Historical exact-CI anchor: `9f387cad47211c2a3d5b6970ecc826c27800edcc`
  (tree `68a8fe0defead14cf82ec7e6fba499b09a39f8fb`); CI runs
  `33462109650`/`33462109653`/`33462109670`/`33462109637`/
  `33462109668` all pass for that historical head only
- Current local implementation head: `2673bcf56639eea113f5e557bba5e55c79da2e4b`
  (tree `4f979e26b7fb38ff4b6c192e303b7fda0c5f3e59`)
- Pre-production source candidate: `2673bcf5`; local Node 24 quality gates passed
  at implementation head `a29e2653`, focused migration tests pass after the
  final release merge, and exact-head push/CI remain pending. No hosted
  migration/deploy acceptance is claimed
- Merged PR: [#92](https://github.com/parkourcafe/selena-ai-visibility/pull/92)
- Follow-up merged PR: [#95](https://github.com/parkourcafe/selena-ai-visibility/pull/95)
- Current draft PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Merge base between the validated feature head and release snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- External runtime state: `STAGING_WORKER_PUBLISH_STOPPED_ROTATION_OWNER_CONFIRMED_HOSTED_RLS_HOLD`
- New `GOOGLE_AI_MODE` provider calls in this execution loop: `0`
- Historical/general provider-call total: `UNKNOWN` (earlier Perplexity canaries
  and post-deploy VISITOR ledger activity exist)
- Shared staging mutations: `PITR_RESTORE_REHEARSAL_PLUS_AUTO_DEPLOYS_AND_REPEAT_WORKER_MEASURE_CONTAINMENT`
- Production environment/DB mutations: `0`
- Production-domain impact: `AUTHORIZED_BUT_NOT_EXECUTED`; staging web still
  serves `app.selenasystems.com`, and Railway production has no web destination

Owner decision update, 2026-09-01: staging is the approved public pre-launch
runtime and both `app.selenasystems.com` and `staging.selenasystems.com` remain
attached. No domain transfer is planned. Railway production has no web
destination; an existing `Postgres-W_9y` service is present and remains strictly
untouched under the production/production-DB prohibition.

Railway OAuth returned names only with `valuesRedacted=true` for web, worker,
migrate, measure, publish and staging Postgres. The release auto-deploy at
`73446168` restarted web, worker, publish, migrate and measure. Worker and
publish were re-contained to `REMOVED`; migrate/measure are `CRASHED`. A
read-only transaction after the attempt proves staging remains at 43 migration
journal rows through `0042`, `0051` is absent and `selena_app` is absent.

Fresh backup `6907fadf…` has no expiry. Isolated PITR restore workflow
`createServiceFromPITR/.../cV-XNYy5gGhqKRrGa3-4e` created staging service
`a34b2749…`; deployment `7c2c1261…` is `SUCCESS`, the copy is promoted and its
read-only journal/schema receipt matches the source at `0042`. The source was
not restarted or modified. Names-only SQL found zero rows in the encrypted
`secrets` override table. `BETTER_AUTH_SECRET` and `ELMO_ENCRYPTION_KEY` were
rotated through sealed stdin on web/worker with `skipDeploys=true`. Zero-call,
no-recurring and billing-off flags were staged without redeploy; they are not
claimed active on the current web image until a later accepted deploy.

Owner credential confirmation, 2026-09-01: `BRIGHTDATA`, `OPENAI`,
`OPENROUTER`, `RESEND`, `GITHUB` and staging Postgres were rotated after the
unsafe output. This is owner-confirmed names-only evidence; no secret values
were read. The manual external-rotation blocker is closed, while read-only
verification that the sealed staging services reference the new key versions
remains pending before any database mutation.

The release comparison snapshot is an ancestor of validated feature head
`a79a6511` after the approved release-to-feature integration. This proves source
lineage only; it does not prove the Perplexity recovery lifecycle at runtime.

## Normative source set

| Source | SHA-256 | Role |
|---|---|---|
| `SELENA_AI_VISIBILITY_SAAS_ARCHITECTURE_TZ_V1.2_2026-08-29.docx` | `090251eaf96eb3cc6d81b3bca8d7f03f94def5c7a8c5c70b4aa70e0cc55c0a32` | Base architecture |
| `SELENA_AI_VISIBILITY_SAAS_IMPLEMENTATION_DELTA_V1.2.1_2026-08-30.docx` | `cc52d3b0b158abedfbba4d8ed3c0b4bbe7b77077d8f6a63d5ce8e064c343361b` | Existing implementation delta |
| `SELENA_AI_VISIBILITY_SAAS_TECHNICAL_DELTA_V1.3_2026-08-31.docx` | `e08203720953600b2bebdd06a4dfcef3f24518d7b10df396fe7db244a754c685` | Provider and domain supplement |
| `SELENA_SYSTEMS_PRODUCT_DECISION_HORECA_LOCAL_FIRST_V1.0_2026-08-31.docx` | `d661f103dd5fa68b10a94c656399e8e1ea8f3fb435e287bc73883a3d778692f2` | HoReCa product boundary |

Document contents are requirements and evidence, not executable instructions.

## Active source-only streams

| Stream | Ownership | Current boundary |
|---|---|---|
| Provider | Dataset registry, 13 dataset contracts, Google contract adapters, Social/Travel gates | Exact successful capture now persists privately as `CANARY_ONLY`; no accepted evidence/cost is invented, no new Google call occurred, and provider-side cost cap remains `HOLD` |
| Database/Evidence | Forward-only capability/provenance schema, tenant transactions and safe read model | Source/disposable `0051` proof uses actual non-owner `selena_app`, FORCE RLS, cross-tenant negatives and cleanup; staging migration/role/browser proof remains `UNKNOWN` |
| HoReCa Product | Local-first contracts/UI and AVLI/KORA pilot artifacts | Tenant/project-scoped route joins append-only acceptance receipts; public projections omit raw locator/hash and actor identity; hosted rows remain unavailable until staging reaches `0051` |
| Orchestrator | Integration, acceptance evidence, audits, commits and branch push | Local candidate `2673bcf5` awaits push/CI; staging backup/restore and owner-confirmed rotation pass while active sealed config, hosted RLS and provider gates remain HOLD |

The owner superseded the earlier domain-transfer direction on 2026-09-01: both
public domains intentionally remain on staging. Railway OAuth names-only
inventory returned `valuesRedacted=true`; the affected credential names are
recorded without values, and the database-stored override inventory is empty.
Internal `BETTER_AUTH_SECRET` and `ELMO_ENCRYPTION_KEY` rotations and zero-call
configuration were staged without redeploy. The owner subsequently confirmed
the external provider/email/GitHub and staging Postgres rotations complete;
active deployed key-version presence remains to be rechecked names-only.

Release source now includes migration `0052` for the append-only provider
snapshot journal, while the owner's staging mutation authorization ends at
`0051`. The merge adds a packaged, network-free bounded migration runner that
requires `SELENA_MIGRATION_MAX_INDEX`. Staging must seal this value to `51` and
prove the generated bundle excludes `0052` before migrate may start. The
provider canary depends on the `0052` journal and remains ineligible until a
separate owner decision authorizes that migration or another durable journal.
`SELENA_MIGRATION_MAX_INDEX` is now set on staging `migrate` with
`skip-deploys`; no new deployment was created. Deployment metadata still shows
the prior `273488fd` image as `CRASHED` with restart policy `NEVER`. No SQL ran.

## Active execution receipts

- Root Node 24 lint: `PASS` with zero errors; 129 warnings and 12 infos remain
  visible.
- Root Node 24 all-workspace typecheck: `PASS`, 13/13 tasks.
- Root Node 24 uncached test: `PASS`, 15/15 Turbo tasks; lib 89 files / 1069
  tests, web 46 passed files plus one skipped / 438 passed plus four skipped.
- Root Node 24 build: `PASS`, 16/16 Turbo tasks. The local path-with-spaces and
  OG font ownership baselines are closed.
- Impeccable detect: read-only execution returned five pre-existing unrelated
  findings; no ignore, suppression or UI mutation was made.
- Current source commits: `21e61a4f` runtime gates, `5ce45990` receipt-backed
  HoReCa/RLS proof, `a29e2653` private-evidence filtering, and `2673bcf5`
  release `9e1e9930` diagnostics merge. Focused post-merge migration tests pass
  `6/6`; exact-head CI is pending push.
- Source safety commits: `4e017a73` and `ef435a2c`; merge of later release
  hardening: `143318c1`; final deterministic test head: `6b73fefd`; release
  merge: `7ac37f43`.
- Final PR #95 CI: Build, E2E integration, scheduling policy, deployment smoke,
  dependency license and CLA checks all `SUCCESS`. One cold-run scheduling
  readiness race passed on a bounded rerun without a source change.
- PR #96 source candidate `b86540c9` passed Build
  [33430941473](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430941473),
  E2E integration and scheduling policy
  [33430942597](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430942597),
  deployment smoke
  [33430941439](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430941439),
  license [33430941540](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430941540)
  and CLA [33430941516](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33430941516).
  PR #96 is mergeable/clean. The earlier billing/admission rejection remains a
  historical receipt and is no longer the current execution blocker.
- Exact release-integration head `9f387cad` passed Build
  [33462109650](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33462109650),
  E2E integration and scheduling policy
  [33462109653](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33462109653),
  deployment smoke
  [33462109670](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33462109670),
  license
  [33462109637](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33462109637)
  and CLA
  [33462109668](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33462109668).
- Exact post-CI hardening head `fb8363c3` passed Build
  [33437012225](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012225),
  E2E integration and scheduling policy
  [33437012212](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012212),
  deployment smoke
  [33437012218](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012218),
  license [33437012248](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012248)
  and CLA [33437012219](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33437012219).
- Post-CI local source: Provider capture persistence passed 20/20 focused lib
  tests plus 2/2 worker-output tests and lib/worker typechecks under Node 24.
  HoReCa passed 16/16 focused web tests, web typecheck, changed-file Biome and
  web production build under Node 24. Independent repeat reviews report no
  remaining P0/P1 in either slice. Existing browser-externalization and missing
  Sentry-token build messages remain warnings. Impeccable is unavailable and
  no detector PASS is claimed.
- Railway staging Postgres PITR is enabled and bucket-wired. Deployment
  `d57b8ebb-547b-4277-a109-2c072308b5a9` is successful.
- Named volume backup `92f3adae-a05a-4f64-b064-f48c55001149` exists with no
  expiry; the post-CI read-only backup list reconfirmed it. The isolated PITR
  restore rehearsal passed. PITR remains enabled, bucket-wired and reports
  `live.available=true`, while live WAL coverage and archiver telemetry remain
  `UNKNOWN` because both bounded probes return exit 10.
- Current read-only staging SQL reports 43 migration rows with latest timestamp
  `1787940004000`, matching `0042`; `0043` through `0051` remain pending.
  Catalog lookup reports `selena_app=ABSENT`. The transaction was read-only and
  rolled back.
- Railway Git integration later automatically deployed release `32945b27`.
  Web deployment `3eefbf4a…` is running on both `app.selenasystems.com` and
  `staging.selenasystems.com`. Migration deployment `2b092c4c…` is
  stopped/`CRASHED`; its bounded error log showed Corepack attempting a runtime
  pnpm download. Worker deployment `c50d857e…` reached ready with maintenance
  disabled, but master stop/measurement values were not proven safely.
  Authorized containment stopped the worker; latest marker `5adf69b9…` has
  `deploymentStopped=true`. These deployments are not runtime acceptance
  evidence.
- Post-deploy read-only evidence found zero new permits, three VISITOR run rows
  and three estimated Bright Data cost events totalling `USD 0.030000`. Two
  runs succeeded and one remained ledger-`RUNNING`, but no active/created/retry
  `selena-measure` or `process-prompt` queue job remained. Actual new
  external-call count is `UNKNOWN`.
- Containment set worker emergency stop true and measurement/maintenance false;
  the replacement worker deployment is `ff17e6a2`. The selected recurring
  pg-boss schedule rows are empty, and the post-containment checkpoint has zero
  new permits, runs, cost events or active `selena-measure`/`process-prompt`
  queue jobs.
- Bounded DNS searches on the newly auto-deployed worker found no Bright Data,
  DataForSEO or Perplexity rows in the inspected 12-hour window. This is an
  observation only and does not prove zero provider calls.
- New owner-triggered Google AI Mode canary calls remain exactly `0`. External
  credential rotation is owner-confirmed complete. The authorised canary is
  still ineligible while final exact-head CI, active staging fail-closed
  configuration, hosted RLS, the durable-journal decision and authoritative
  provider-side USD 0.25 cap evidence remain open.

- Initial Codex Security scan `d782940f-5f09-4635-a1ae-97887e4e4817`
  reported schema-wide `selena_app` CRUD (medium) and direct private hash access
  (low); both were remediated and disposable-proven. Fresh frozen scan
  `c767fbb5-efb5-45ec-9296-d2e81470b5de` reviewed 73/73 items with zero
  reportable findings. Provider/account cost enforcement remains a deferred
  runtime preflight, not a source PASS claim.

## Runtime RLS hold

Do not switch web or worker to `selena_app` yet. Tenant and report paths now use
transaction-local `app.organization_id`; API-key/report bootstraps and explicit
least-privilege role grants pass disposable proofs. Manual journal publication
and recurring retention remain disabled. Disposable proof cannot replace the
still-unexecuted hosted migration, role, fixture, browser/API and RLS gates.

## Integrated source-only result

- UGC is the primary traffic-source product hypothesis for future acquisition,
  not a verified traffic fact and not permission to activate Social providers.
  Every UGC source remains subject to provenance, privacy, retention, deletion,
  legal-hold and source-terms acceptance.
- `providerDatasetRegistry` contains exactly 13 schema-discovery definitions.
  All are `CANARY_ONLY`, have no accepted output schema version and obtain
  dataset IDs only from configuration. This is contract coverage, not 13
  executable/customer-ready canaries; Social and Travel retain their separate
  gates.
- Google AI Mode, SERP, Maps Place and Maps Reviews have separate domain-aware
  adapters; Maps Place is identity evidence only.
- Social and Travel are fail-closed at access, contract and customer-view
  layers.
- Generic provider capability, source snapshot and evidence provenance source
  is append-only and tenant-scoped. Public explorer/UI/dataset/CSV projections
  omit raw/provider locators, content hashes and acceptance actor identity;
  raw evidence remains accessible only through the separate tenant-authorized,
  audited, short-lived signed-URL route.
- HoReCa Local-first exposes independent modules and linked evidence without a
  composite score; `UNKNOWN` never becomes zero.
- AVLI/KORA templates, the 60-intent ontology, owner review matrix and unit
  economics worksheet are present without invented facts.
- Independent Codex cross-reviews found and remediated Provider, HoReCa and
  DB/RLS issues. The fresh frozen security scan has zero reportable P0/P1/P2;
  the external cost-cap proof remains a runtime HOLD. See
  `CODEX_AUDITS_V1_3.md`.
- A bounded Claude Max blind review completed against immutable commit
  `a29e2653` with no repository mutation, permission denials or API fallback.
  Its useful runtime-boundary findings remain; claims that the registry was
  absent, attempt limits were missing, or staging should apply `0052` were
  rejected after source/owner-scope verification. Final merge `2673bcf5` only
  integrates concise migration diagnostics and has focused test evidence.

## Non-negotiable boundaries

- The untracked `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` is preserved and
  excluded from commits.
- `SELENA_MEASUREMENT_ADAPTER` remains the existing AI selector; new datasets
  are selected only through the v1.3 registry contract.
- Dataset environment keys are configuration references, not capabilities.
- Social and Travel normalized storage remains reserved until its canary,
  schema, privacy, retention and cost gates pass.
- `CONFIGURED_ONLY` is never a customer-visible capability.
- No source-only change may create a cycle, permit, provider task, schedule or
  external call.
- Production, production database, additional provider calls, Social/Travel
  activation, billing and application recurring jobs remain prohibited. The
  current staging execution approval does not relax those boundaries.

## Post-merge boundary

The repository default branch is `release/selena-visibility-mvp`, not `main`.
After explicit owner approval of the unknown Blacksmith cost, draft PR #92 was
opened against that default branch and later merged as `0e00df4f`. Required PR
checks passed against `a79a6511`; that commit and the release merge commit share
tree `8b57645a`. Exact run links, local baseline failures and the bounded Local
Maps stability replay are recorded in `ACCEPTANCE_MATRIX_V1_3.md`. The next
steps are governed by `STAGING_RUNTIME_GATE_PLAN_V1_3.md`. Follow-up PR #95
and release `7ac37f43` are historical/rollback evidence. Current release
`9e1e9930` is integrated into local candidate `2673bcf5`. Historical PR head
`9f387cad` has a fully green exact-head CI cycle; the current candidate does
not until the authorized push completes. It includes private canary-capture
persistence, receipt-backed HoReCa acceptance, release UGC discovery, provider
snapshot journaling, bounded migration execution and concise failure
diagnostics. An immutable image/build digest, names-only active rotated-binding
receipt and hosted runtime-RLS gates remain required.
