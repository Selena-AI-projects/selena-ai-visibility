# Visibility OS Implementation Status Matrix v2.0

Working state of local branch `codex/visibility-os-m3-search-reputation`, based
on `release/selena-visibility-mvp` merge commit `47d98ee8`, on 2026-08-29. This
matrix covers Visibility OS only;
`IMPLEMENTATION_STATUS_MATRIX_v1_4.md` remains the record for the existing AI
core.

**Nothing here is deployed or database-released.** M1 and M2 source are merged
into `release/selena-visibility-mvp`; M3 exists only on this branch and is not
merged. Migration `0037` and pending M2/M3 SQL are unapplied outside
disposable PostgreSQL 16 scratch databases. No production or staging database,
deployment setting, payment path, credential, review source, or live provider
was touched.

Feature statuses use the existing vocabulary: `DESIGNED` / `CODE_IN_BRANCH` /
`SCHEMA_EXISTS-in-branch` / `NOT_BUILT`. A gate remains `NOT_STARTED` or
`FAIL` until every criterion in `SELENA_VISIBILITY_OS_ACCEPTANCE_GATES_V2.md`
has a matching artifact.

## Packages

| Package | Status | Evidence |
| --- | --- | --- |
| M0 cycle economics | `CODE_IN_BRANCH` | merged into `release/selena-visibility-mvp`; contract package tests passed before merge |
| M1 measurement registry | `SCHEMA_EXISTS-in-branch` | merged into the release branch: five Drizzle tables, numbered but unapplied SQL, compatibility view, separate backfill; PG16 scratch registry rehearsal passed |
| M2 Local Visibility | `CODE_IN_BRANCH` | merged into the release branch: Local contracts and frozen fixture, seven RLS tables in pending SQL, pre-provider guard, isolated queue name, locked/unknown cabinet state, unit coverage and PG16 scratch rehearsal |
| M3 Search and Reputation | `CODE_IN_BRANCH` | current branch, not merged: six RLS tables in pending SQL, domain-specific cardinality contracts, review velocity/provenance functions and fail-closed Search/Reputation surfaces; no runtime adapter, worker queue or external collection |
| M4 Action and Evidence Loop | `NOT_BUILT` | depends on M1 and an implemented measurement package |
| M5 Visibility Map | `NOT_BUILT` | depends on M2 |
| M6 Outcome Layer | `NOT_BUILT` | depends on M4 for meaningful attribution |

## Acceptance gates

| Gate | Status | Evidence or blocker |
| --- | --- | --- |
| 1 `AI_CORE_NO_REGRESSION_PASS` | `PASS (M3 local)` | Node 24.18: contracts 105/105, lib 817/817, config 87/87, web 294 passed / 4 skipped; all four typechecks and the production build passed. The existing PostgreSQL AI stub cycle passed over numbered migrations plus pending M2/M3 SQL. M3 adds no columns to `sv_runs`, `sv_cycles` or `sv_run_permits` and makes no frontend change |
| 2 `MEASUREMENT_DOMAIN_ISOLATION_PASS` | `PASS (M3 local)` | M1 and M2 scratch criteria were repeated before M3. Search/Reputation writes created no AI or Local observations; uniqueness, domain FK, retry-in-place, Configuration Lock cardinality, cost sums, failure/emergency-stop status and two-tenant RLS stayed domain-specific. Search/Reputation have no registered runtime queues or adapters |
| 3 `LOCAL_MEASUREMENT_SCHEMA_PASS` | `PASS (M2 local)` | disposable PG16 proved the exact observation uniqueness key, complete `grid points x keywords x repeats` cardinality, explicit invalid/unmeasured rows with reasons, required nonnegative depth, reconstructable region/coordinate/keyword/provider and immutable grid versions |
| 4 `GEO_GRID_METRICS_PASS` | `PASS (M2 local)` | frozen `local-coverage-v1` fixture covers Top-3/10/20, outside Top-20, found-only average rank plus found share, Share of Local Voice, competitors, shallow captures and `UNKNOWN` empty denominators with deterministic six-decimal results |
| 5 `READINESS_VISIBILITY_SEPARATION_PASS` | `PASS (M3 local)` | strict portfolio contracts give readiness `READINESS_SNAPSHOT` evidence and visibility `MEASUREMENT_OBSERVATION` evidence, reject an overall score and preserve surface metrics when readiness changes. Reputation metrics require a review-snapshot FK; topic/sentiment rows require `analysis_method_version`; source inspection found no readiness-as-rank wording or aggregate score in the cabinet |
| 6 `EVIDENCE_LOOP_INTEGRITY_PASS` | `NOT_STARTED` | M4/M6 not built |
| 7 `ATTRIBUTION_GUARDRAIL_PASS` | `NOT_STARTED` | M4/M6 not built |
| 8 `BEFORE_AFTER_REPRODUCIBILITY_PASS` | `NOT_STARTED` | M5 not built |
| 9 `LOCAL_COST_CARDINALITY_PASS` | `PASS (M2 local)` | Configuration Lock freezes formula, cardinality, cost keys and worst-case budget; grid ceiling is 49; expected+1 and emergency stop refuse before the provider callback and record the incident; retry reuses only its exact invalid/unmeasured row without increasing expected cardinality |
| 10 `VISIBILITY_MAP_DATA_INTEGRITY_PASS` | `NOT_STARTED` | M5 not built |
| 11 `MULTI_LOCATION_TENANT_PASS` | `NOT_STARTED` | M6 not built |
| 12 `VISIBILITY_OS_VERTICAL_SLICE_PASS` | `NOT_STARTED` | runs only on release after M1-M6 are merged |

Gate 2 remains binary per package stage. The local M3 working tree passes its
Search/Reputation repeat after rerunning M1 and M2. M4 may start only after M3
is reviewed and merged; local evidence is not a release or deployment claim.

## Pending database files

| File | Purpose | Applied state |
| --- | --- | --- |
| `packages/lib/src/db/migrations/0037_visibility_os_measurement_registry.sql` | five registry tables, indexes, RLS policies, domain seeds, AI compatibility view | scratch only; not applied to staging or production |
| `packages/lib/scripts/backfill-visibility-os-ai-cycles.sql` | id-preserving AI umbrella rows after M1 is applied | scratch only |
| `packages/lib/src/db/migrations/_pending-os/M2_local_visibility.sql` | Local business-location fields, cost domain references, seven Local tables, constraints, triggers and RLS policies | unnumbered local file; scratch only |
| `packages/lib/src/db/migrations/_pending-os/M3_search_reputation.sql` | Search queries/rank observations and Reputation sources, snapshots, velocity metrics and versioned topic observations | unnumbered local file; scratch only |

Migration number `0037` and its `_journal.json` entry remain unchanged. M2 does
not claim a migration number and does not edit the journal. Its optional
`SELENA_LOCAL_VISIBILITY_ENABLED` server flag is fail-closed: only the exact
value `true` unlocks the cabinet state and pre-provider guard. M3 adds no env
variables: Search and Reputation remain `ADD`, and the shared surface guard
rejects them as not implemented even if a caller supplies a matching flag.
