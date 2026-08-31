# Selena AI Visibility v1.3 — orchestration state

- State: `PREPRODUCTION_EXECUTION_CI_AND_RUNTIME_RLS_GATED`
- Context mode: `repository_only`
- Feature branch: `feature/selena-visibility-v1-2-1`
- Current source head at sprint start: `3cc2328e89ca7dfb55520db1dc09f31eefcd4f02`
- Release comparison snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Original acceptance release HEAD: `0e00df4faa74990e6b696c4249cbb85acf23c693`
- Current release HEAD: `04700df5de393cb4d7437a5b467ed753a8554928`
- Follow-up candidate HEAD: `143318c182d3f5f8e9892cd43d1078ccec110dcb`
- Merged PR: [#92](https://github.com/parkourcafe/selena-ai-visibility/pull/92)
- Follow-up draft PR: [#95](https://github.com/parkourcafe/selena-ai-visibility/pull/95)
- Merge base between the validated feature head and release snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- External runtime state: `STAGING_INSPECTED_BACKUP_CREATED_RLS_HOLD`
- Paid provider calls: `0`
- Shared staging mutations: `PITR_ENABLE_POSTGRES_REDEPLOY_PLUS_NAMED_BACKUP`
- Production mutations: `0`

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
| Provider | Dataset registry, 13 dataset contracts, Google contract adapters, Social/Travel gates | Source-complete; no credential reads, provider calls or runtime registration |
| Database/Evidence | Forward-only generic capability/provenance schema and internal read model | Source-complete; migration runtime proof remains `UNKNOWN` |
| HoReCa Product | Local-first contracts/UI and AVLI/KORA pilot artifacts | Source-complete read-only customer model; no live data binding or public promise |
| Orchestrator | Integration, exports, acceptance evidence, audits, commits and branch push | Follow-up PR #95 is open; root local gates pass; staging backup exists; runtime RLS remains HOLD |

## Active execution receipts

- Root Node 24 lint: `PASS` with zero errors; 132 warnings and 14 infos remain
  visible.
- Root Node 24 test: `PASS`, 15/15 Turbo tasks. The executed lib and web suites
  passed; four explicitly database-dependent web tests remained skipped.
- Root Node 24 build: `PASS`, 16/16 Turbo tasks. The local path-with-spaces and
  OG font ownership baselines are closed.
- Source safety commits: `4e017a73` and `ef435a2c`; merge of later release
  hardening: `143318c1`.
- Railway staging Postgres PITR is enabled and bucket-wired. Deployment
  `d57b8ebb-547b-4277-a109-2c072308b5a9` is successful.
- Named volume backup `92f3adae-a05a-4f64-b064-f48c55001149` exists with no
  expiry. PITR WAL coverage, archiver health and a restore rehearsal remain
  `UNKNOWN`.
- Staging migration journal is verified through `0042`; `0043` through `0051`
  are pending and have not been applied at this checkpoint.
- Provider calls remain exactly `0`. The authorised one-call Google AI Mode
  canary is not eligible until the zero-call runtime gates pass.

## Runtime RLS hold

Do not switch web or worker to `selena_app`. Current source still contains
tenant data access outside a single transaction-local
`app.organization_id` boundary, including lazy repository builders and direct
global-DB paths. A transient `NOLOGIN`/`NOBYPASSRLS` schema probe may prove the
0051 policy only; it cannot prove app-wide runtime isolation. The coordinated
web/worker transaction refactor remains a separate source implementation gate.

## Integrated source-only result

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
- Three independent Codex cross-reviews reached source-level PASS after
  remediation. See `CODEX_AUDITS_V1_3.md`.
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
steps are governed by `STAGING_RUNTIME_GATE_PLAN_V1_3.md`; no merge result is
runtime, staging, provider, billing or production evidence.
