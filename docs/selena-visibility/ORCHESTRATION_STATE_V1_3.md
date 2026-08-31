# Selena AI Visibility v1.3 — orchestration state

- State: `DRAFT_PR_OPEN_RELEASE_INTEGRATED_CI_PENDING`
- Context mode: `repository_only`
- Feature branch: `feature/selena-visibility-v1-2-1`
- Current source head at sprint start: `3cc2328e89ca7dfb55520db1dc09f31eefcd4f02`
- Release comparison snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Merge base between the feature head and release snapshot: `fe9b97d287fc25c3646438b7a24ebc01ed459495`
- External runtime state: `NOT_INSPECTED`
- Paid provider calls: `0`
- Shared database, staging and production mutations: `0`

The release comparison snapshot is not an ancestor of the feature branch. Its
Perplexity recovery lifecycle is therefore a reconciliation input, not evidence
that the current feature head already contains the same behavior.

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
| Orchestrator | Integration, exports, acceptance evidence, audits, commits and branch push | Draft PR #92 is open; default release integration is locally verified and awaiting push/CI |

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
- Runtime RLS, migration application, credentials, paid canaries, shared
  staging/production, billing, PR merge, deploy and recurring jobs remain
  separate owner gates.

## Draft PR side-effect boundary

The repository default branch is `release/selena-visibility-mvp`, not `main`.
After explicit owner approval of the unknown Blacksmith cost, draft PR #92 was
opened against that default branch. Its initial merge ref was blocked by release
drift; the approved release-to-feature merge was resolved locally with all
supported changed-scope checks passing. The push may now start the workflows
listed in `DRAFT_PR_V1_3.md`; their billing impact remains `UNKNOWN`.
