# Selena AI Visibility v1.3 — orchestration state

- State: `WAITING_EXTERNAL_GITHUB_ACTIONS_BILLING`
- Context mode: `repository_only`
- Feature branch: `feature/selena-visibility-v1-2-1`
- Current source head at sprint start: `3cc2328e89ca7dfb55520db1dc09f31eefcd4f02`
- Release comparison snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Original acceptance release HEAD: `0e00df4faa74990e6b696c4249cbb85acf23c693`
- Current release HEAD: `7ac37f436b08f0e48c97acb61dfaee8a6458760a`
- Historical follow-up source head: `6b73fefdee6229389855e2cbe4607424e0dd7c89`
- Current feature base HEAD: `71e5b8efa2baee416ba845852f40940ff85e2349`
- Last pushed source head: `90234ad3518977cd15eb06b6033c8335f4c3f4c5`
- Current local source: pushed source through `90234ad3` plus this waiting-state
  evidence update
- Pre-production deploy candidate: PR #96's eventual final head, only after the
  GitHub Actions billing/admission blocker is resolved and fresh CI is green
- Merged PR: [#92](https://github.com/parkourcafe/selena-ai-visibility/pull/92)
- Follow-up merged PR: [#95](https://github.com/parkourcafe/selena-ai-visibility/pull/95)
- Current draft PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Merge base between the validated feature head and release snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- External runtime state: `STAGING_WORKER_MEASURE_STOPPED_CREDENTIAL_ROTATION_RLS_DOMAIN_HOLD`
- New `GOOGLE_AI_MODE` provider calls in this execution loop: `0`
- Historical/general provider-call total: `UNKNOWN` (earlier Perplexity canaries
  and post-deploy VISITOR ledger activity exist)
- Shared staging mutations: `PITR_RESTORE_REHEARSAL_PLUS_AUTO_DEPLOY_AND_WORKER_MEASURE_STOP`
- Production environment/DB mutations: `0`
- Production-domain impact: `POSSIBLE_UNKNOWN` because the staging web service
  also serves `app.selenasystems.com`

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
| Provider | Dataset registry, 13 dataset contracts, Google contract adapters, Social/Travel gates | Current source complete and targeted tests pass; no new Google call; provider-side cost cap remains `HOLD` |
| Database/Evidence | Forward-only capability/provenance schema, tenant transactions and safe read model | Source/disposable review passes; staging migration/role/browser proof remains `UNKNOWN` |
| HoReCa Product | Local-first contracts/UI and AVLI/KORA pilot artifacts | Source-complete read-only customer model; no live data binding or public promise |
| Orchestrator | Integration, acceptance evidence, audits, commits and branch push | Source through `90234ad3` is pushed; fresh PR #96 checks were rejected before runner assignment by a GitHub billing/spending-limit gate; staging backup/restore passes while runtime remains HOLD |

## Active execution receipts

- Root Node 24 lint: `PASS` with zero errors; 129 warnings and 12 infos remain
  visible.
- Root Node 24 all-workspace typecheck: `PASS`, 16 workspaces.
- Root Node 24 uncached test: `PASS`, 15/15 Turbo tasks; lib `1012/1012`, web
  `421/421` executed; four explicitly database-dependent web tests remained
  skipped.
- Root Node 24 build: `PASS`, 16/16 Turbo tasks. The local path-with-spaces and
  OG font ownership baselines are closed.
- Impeccable detect: `UNAVAILABLE`, because the local npm cache contains
  root-owned files (`EPERM`). No ownership/permission mutation was performed
  and no Impeccable PASS is claimed.
- Source safety commits: `4e017a73` and `ef435a2c`; merge of later release
  hardening: `143318c1`; final deterministic test head: `6b73fefd`; release
  merge: `7ac37f43`.
- Final PR #95 CI: Build, E2E integration, scheduling policy, deployment smoke,
  dependency license and CLA checks all `SUCCESS`. One cold-run scheduling
  readiness race passed on a bounded rerun without a source change.
- PR #96 current head `90234ad3` triggered Build
  [33413214322](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214322),
  E2E [33413214325](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214325),
  deployment smoke
  [33413214314](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214314),
  license [33413214321](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214321)
  and CLA [33413214313](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33413214313).
  All six checks terminated in two to three seconds with no runner and no job
  steps. Each check annotation states that the job was not started because of
  recent account-payment failure or an Actions spending-limit requirement.
  This is `WAITING_EXTERNAL`, not a code-test failure. No rerun was requested.
- GitHub Actions waiting record: host `github.com`, category
  `BILLING_OR_SPENDING_LIMIT`, last verified `2026-08-31T16:25:14Z`, no
  `Retry-After` or automatic retry. Continuation is one owner-confirmed rerun
  after the organization billing operator resolves the gate.
- Railway staging Postgres PITR is enabled and bucket-wired. Deployment
  `d57b8ebb-547b-4277-a109-2c072308b5a9` is successful.
- Named volume backup `92f3adae-a05a-4f64-b064-f48c55001149` exists with no
  expiry. The isolated PITR restore rehearsal passed; live WAL coverage and
  archiver telemetry remain `UNKNOWN` because the bounded probe returned exit
  10.
- Staging migration journal is verified through `0042`; `0043` through `0051`
  are pending and have not been applied at this checkpoint.
- PR #95 merge automatically deployed web and worker release `7ac37f43` before
  the domain/RLS gates were accepted. The journal still remained through
  `0042`; this deployment is not runtime acceptance evidence.
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
- New owner-triggered Google AI Mode canary calls remain exactly `0`. The
  authorised Google canary is not eligible while domain, credential rotation,
  staging RLS and authoritative provider-side USD 0.25 cap evidence remain
  open.

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
- 13 exact registry definitions are canary-ready contracts, not runtime
  capability claims.
- Google AI Mode, SERP, Maps Place and Maps Reviews have separate domain-aware
  adapters; Maps Place is identity evidence only.
- Social and Travel are fail-closed at access, contract and customer-view
  layers.
- Generic provider capability, source snapshot and evidence provenance source
  is append-only, tenant-scoped and keeps raw references private.
- HoReCa Local-first exposes independent modules and linked evidence without a
  composite score; `UNKNOWN` never becomes zero.
- AVLI/KORA templates, the 60-intent ontology, owner review matrix and unit
  economics worksheet are present without invented facts.
- Independent Codex cross-reviews found and remediated Provider, HoReCa and
  DB/RLS issues. The fresh frozen security scan has zero reportable P0/P1/P2;
  the external cost-cap proof remains a runtime HOLD. See
  `CODEX_AUDITS_V1_3.md`.
- A bounded Claude Max blind review completed against immutable commit
  `5e616e63` without repository mutation or API fallback. It agreed with the
  source-only/pre-runtime boundary and retained runtime, DB and paid gates. See
  `CLAUDE_MAX_REVIEW_V1_3.md`.

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
and release `7ac37f43` are historical/rollback evidence. Current draft PR #96
is pushed through `90234ad3`. Its earlier head `71e5b8ef` has green historical
CI, while the current-head cycle was rejected before runner assignment by the
GitHub billing/spending-limit gate. The current head is not CI-validated and
`7ac37f43` is not the next deploy target.
