# Draft PR #96 — Selena AI Visibility v1.3 pre-production hardening

Status: `OPEN_DRAFT_CURRENT_SOURCE_CI_PENDING`.

PR: `https://github.com/parkourcafe/selena-ai-visibility/pull/96`

Base: `release/selena-visibility-mvp` (repository default branch).

## Proposed title

`fix(visibility): harden v1.3 pre-production gates`

## Proposed body

### Summary

- integrate current release `32945b27` without rewriting feature history;
- package the migration runner without a runtime Corepack/pnpm download;
- preserve global provider-stop and Social/Travel fail-closed controls;
- persist an exact successful Google AI Mode schema-discovery capture privately
  as `CANARY_ONLY`, without fabricating accepted measurement or cost evidence;
- bind HoReCa Local-first UI to session, tenant and project scoped safe
  projections, with a project selector and normalized evidence detail;
- keep HoReCa runtime source-only until an authoritative acceptance decision and
  timestamp can be joined; retain UNKNOWN and no composite score;
- preserve the AVLI/KORA source-only pilot package and protected recovery
  handoff boundary.

### Evidence

- green pushed anchor `b86540c9`: Build, E2E integration, scheduling policy,
  deployment smoke, license and CLA all passed;
- current local Provider delta under Node 24: 20/20 focused lib tests, 2/2
  worker-output tests, lib/worker typechecks and scoped Biome passed;
- current local HoReCa delta under Node 24: 16/16 focused tests, web typecheck,
  scoped Biome and web production build passed;
- independent Provider and HoReCa repeat reviews: no remaining P0/P1 in the
  reviewed source slices;
- current source still requires a fresh PR #96 Blacksmith cycle after push.

### Runtime and authorization boundaries

- no Google AI Mode canary has been executed; provider calls in this loop: `0`;
- no current-source deploy, migration, fixture write, database role switch or
  billing change occurred;
- staging web still has a production-like domain binding, affected staging
  credentials require rotation, current migration journal is `UNKNOWN`, and
  hosted non-owner RLS is unproven;
- the auto-deployed staging worker was re-contained and remains stopped;
- exactly one Bright Data `GOOGLE_AI_MODE` call may occur only after SR-00
  through SR-09 pass, with USD 0.25 maximum, under 25 minutes, zero retries and
  `recurring=false`;
- production, production DB, recurring jobs, additional provider calls,
  Social/Travel activation and higher cost are not authorized;
- `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untracked and excluded.

### Remaining gates

- push the reviewed source and obtain a fully green exact-head PR cycle;
- record immutable build/image and sealed-configuration references;
- resolve production-like domain ownership and rotate affected credentials;
- refresh backup/PITR and migration journal evidence before any staging SQL;
- prove migrations through 0051 and `selena_app` RLS in hosted staging;
- run zero-call browser/API fixtures before considering the single canary.

## CI side effects

The owner restored the Actions budget and authorized bounded feature-branch
pushes. A push to PR #96 triggers Build, E2E integration, scheduling policy,
deployment smoke, license and CLA checks on Blacksmith/GitHub runners. This is
authorized for the current loop. PR merge and any deployment remain separate
gates; merge must not occur until current-head CI is fully green and no P0/P1
remains.
