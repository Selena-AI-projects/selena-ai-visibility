# Draft PR — Selena AI Visibility v1.3 source-only acceptance package

Status: `OPEN_RELEASE_INTEGRATED_CI_PENDING`.

PR: `https://github.com/parkourcafe/selena-ai-visibility/pull/92`

Base: `release/selena-visibility-mvp` (repository default branch).

## Proposed title

`feat(visibility): add source-only v1.3 acceptance package`

## Proposed body

### Summary

- add a domain-aware registry for 13 Bright Data dataset contracts with
  lifecycle-only captures, external attempt control and no ambient transport;
- add separate Google AI Mode, SERP, Maps Place and Maps Reviews contract
  adapters;
- keep Social and Travel fail-closed behind privacy, retention, cost and
  product gates;
- add tenant-scoped provider capability, source snapshot and evidence
  provenance source with append-only guards and private raw references;
- add signed ten-minute evidence cursors and safe HoReCa evidence read models;
- add the HoReCa Local-first read-only contract/UI plus AVLI/KORA pilot,
  60-intent ontology, owner review and unit-economics templates;
- record three independent Codex audits and a blind read-only Claude Max review.

### Evidence

- Provider/Database/Evidence: 115 tests passed across 6 files.
- HoReCa contract: 8 tests passed.
- HoReCa web model/rendering: 7 tests passed.
- `@workspace/lib`, `@workspace/selena-visibility-contracts` and
  `@workspace/web` typechecks passed.
- changed-file Biome check passed.
- `@workspace/web` production build passed.
- Impeccable deterministic UI detector returned no findings in its single run.
- three Codex cross-reviews: source-level PASS after remediation.
- Claude Max `max5`/Sonnet blind review: complete, read-only, no permission
  denials, no repository mutation; agreed with the source-only/pre-runtime
  boundary.
- post-release-integration full test run passed all 15 Turbo tasks, including
  976 lib, 409 web and 240 visibility-contract tests; four DB-dependent web
  tests remained explicitly skipped;
- config, lib, contracts, worker and web typechecks passed;
- changed-file Biome, web build and worker build passed after conflict
  resolution.

### Known baseline and authorization boundaries

- repository-wide build remains blocked in unchanged `apps/www` by 40
  unresolved `@/lib/*` imports under the workspace path containing a space;
  the changed web package builds independently;
- repository-wide web lint has pre-existing findings outside this diff;
  changed files pass targeted Biome;
- no migration was applied and runtime RLS remains `UNKNOWN`;
- no credentials, provider calls, paid canaries, shared staging/production,
  billing changes, merge, deploy, production DB, recurring jobs or public
  capability activation were performed;
- `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untracked and is not part
  of the branch diff.

### Owner gates after review

- disposable PostgreSQL migration/replay/rollback and non-owner RLS proof;
- cost-capped provider canaries and schema/capability evidence;
- hosted staging/payment acceptance;
- product decision on general Selena vs HoReCa navigation;
- merge/deploy/production/recurring activation.

## PR creation side effects

Opening PR #92 to the repository default branch
`release/selena-visibility-mvp` matches `pull_request` triggers for the
following workflows:

- `Build` — `blacksmith-4vcpu-ubuntu-2404`;
- `E2E Tests` — `blacksmith-4vcpu-ubuntu-2404` plus a
  `blacksmith-2vcpu-ubuntu-2404` scheduling-policy job;
- `Deployment Smoke Tests` — `blacksmith-2vcpu-ubuntu-2404`;
- `License Check` — `blacksmith-4vcpu-ubuntu-2404`;
- `CLA Check` — pull-request workflow; runner billing was not established by
  repository inspection.

The billing/cost impact of Blacksmith jobs is `UNKNOWN`. The owner explicitly
approved draft PR creation and the release-to-feature integration on 2026-08-31.
PR merge, deploy and production activation remain separately unauthorized.
