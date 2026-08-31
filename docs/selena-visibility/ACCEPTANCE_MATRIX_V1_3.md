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
- Final PR head and current release share tree
  `03074f76a5dbff51a1389228d902d9809ac3d714`.
- Source commits `4e017a73` and `ef435a2c` add fail-closed runtime guards and
  close the reproducible root lint/build errors. Merge commit `143318c1`
  retains the later release breaker behavior and the new provider stop guard;
  `6b73fefd` makes the provider snapshot deadline test deterministic without
  changing runtime source.
- No production action, provider call, Social/Travel activation, billing
  change or application recurring job occurred.

| Gate | Required evidence | Current status | Evidence class |
|---|---|---|---|
| V13-BASELINE | Four approved documents hashed; `0d1f21ed` relationship and release HEAD `0e00df4f` recorded; handoff excluded | `PASS_POST_MERGE` | Repository/read-only local |
| V13-REGISTRY | Domain/surface-aware registry with 13 exact dataset definitions, versioned schemas, external attempt policy and no embedded new dataset IDs | `PASS_SOURCE_ONLY` | Source only |
| V13-GOOGLE | Google AI Mode, SERP, Maps Place and Maps Reviews contract adapters preserve domain separation and require lifecycle captures before normalization | `PASS_SOURCE_ONLY` | Source only |
| V13-SOCIAL | Social definitions fail closed until schema, privacy, retention and cost evidence exists; Social never contributes to AI visibility | `PASS_SOURCE_ONLY` | Source only |
| V13-TRAVEL | Hotels remains canary-only and blocked from runtime/product activation until stable schema and HoReCa gate | `PASS_SOURCE_ONLY` | Source only |
| V13-EVIDENCE | Capability/source snapshot/evidence provenance is tenant-scoped; raw references remain private; reserved schemas are not invented | `PASS_SOURCE_ONLY_RUNTIME_UNKNOWN` | Source only |
| V13-HORECA | Local-first read model exposes independent modules, accepted-sample counts, UNKNOWN and evidence-linked actions without a composite score | `PASS_SOURCE_UI` | Source/UI only |
| V13-PILOTS | AVLI and KORA packages contain evidence/UNKNOWN gates, intent ontology, report templates and unit-economics decision fields without fabricated facts | `PASS_ARTIFACT` | Repository artifact |
| V13-TESTS | Node 24 root lint, tests and build pass after the follow-up; source candidate CI is green; historical root errors are retained below as resolved baselines | `PASS_LOCAL_ROOT_AND_SOURCE_CI` | Local plus PR CI |
| V13-STABILITY | Deterministic Local Maps rehearsal passes five isolated Node 24 replays with zero transport calls, cost, persistence or evidence eligibility | `PASS_LIMITED_REPLAY` | Local executed |
| V13-CODEX | Three independent Codex reviewers cross-audit implementation against the four-source baseline | `PASS_SOURCE_ONLY` | Static independent review |
| V13-CLAUDE | Blind read-only Claude Max review of immutable commit `5e616e63` completes without mutation or API fallback | `PASS_READ_ONLY_WITH_RUNTIME_GATES` | Static independent review |
| V13-BRANCH | Small commits contain no handoff/secrets; protected handoff remains untracked; latest release hardening and follow-up source are merged into the release branch | `PASS_FOLLOWUP_MERGED` | Git |
| V13-PR | PR #92 and follow-up PR #95 are merged; final PR #95 head passed all required checks and independent P0/P1 review found no blocker | `PASS_FOLLOWUP_MERGED` | GitHub/CI |
| V13-RUNTIME | Staging service IDs and a backup checkpoint are verified, but production-like domain isolation and app-wide non-owner RLS are not; migrations, fixtures and the Google canary remain unexecuted | `PARTIAL_STAGING_DOMAIN_AND_RLS_HOLD` | Runtime/hosted |

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

## Shared staging evidence checkpoint

Scope is Railway project `51dd0770-e622-4734-a705-ace401234bb8`, environment
`90f3bf7f-5e53-4de3-a3f7-56052b706f24` (`staging`) and Postgres service
`280e3b59-77c3-46e0-8c2c-75955b7f9a40`. No secret value was read or printed.
Service identity is verified, but topology acceptance is not: the staging web
service also has the production-like `app.selenasystems.com` binding, so SR-02
remains `HOLD` until domain ownership/blast radius is resolved.

- PITR reports `enabled=true` and `bucketWired=true`. Postgres deployment
  `d57b8ebb-547b-4277-a109-2c072308b5a9` reached `SUCCESS` on image digest
  `sha256:8dbbfcb7fafacc22c01dc0c425c38793b5d0449163a3d178d3e3767d43e6f3ee`.
- Named pre-migration volume backup
  `selena-v1-3-pre-migration-2026-08-31` exists as backup
  `92f3adae-a05a-4f64-b064-f48c55001149`; creation workflow is
  `createVolumeInstanceBackup/1bcbf5f8-176f-41ac-aafd-c8e6d7884dfc` and
  `expiresAt=null`.
- Live WAL coverage and archiver health remain `UNKNOWN`: the CLI health probes
  returned SSH exit 10, and no restore rehearsal was performed.
- Read-only migration metadata shows 43 applied journal rows, with the latest
  timestamp matching migration `0042`. Only `0043` through `0051` are pending.
- App-wide runtime RLS is `HOLD`: the source still has direct and lazy global-DB
  paths without one transaction-local `app.organization_id` seam. Web/worker
  must not be switched to `selena_app`; a schema-only rollback probe cannot be
  relabelled as runtime proof.
- A disposable 0051 schema-probe runner was prepared, but its executed result
  is `BLOCKED_ENV`: the configured Colima Docker socket was not running. No
  disposable or staging SQL was applied, and no schema-probe PASS is claimed.
- New `GOOGLE_AI_MODE` provider calls in this execution loop are `0`. Earlier
  Perplexity canaries exist, so no lifetime/account-wide zero is claimed.

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
