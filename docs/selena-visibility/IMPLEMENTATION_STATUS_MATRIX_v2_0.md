# Visibility OS Implementation Status Matrix v2.0

Working state of local branch `codex/visibility-os-m2-local`, based on
`release/selena-visibility-mvp` merge commit `d452c23e`, on 2026-08-29. This
matrix covers Visibility OS only;
`IMPLEMENTATION_STATUS_MATRIX_v1_4.md` remains the record for the existing AI
core.

**Nothing here is deployed or database-released.** M1 source is merged into
`release/selena-visibility-mvp`; M2 exists only on this branch and is not merged
into the release branch. Migration `0037` and pending M2 SQL are unapplied outside disposable
PostgreSQL 16 scratch databases. No production or staging database, deployment
setting, payment path, credential, or live provider was touched.

Feature statuses use the existing vocabulary: `DESIGNED` / `CODE_IN_BRANCH` /
`SCHEMA_EXISTS-in-branch` / `NOT_BUILT`. A gate remains `NOT_STARTED` or
`FAIL` until every criterion in `SELENA_VISIBILITY_OS_ACCEPTANCE_GATES_V2.md`
has a matching artifact.

## Packages

| Package | Status | Evidence |
| --- | --- | --- |
| M0 cycle economics | `CODE_IN_BRANCH` | merged into `release/selena-visibility-mvp`; contract package tests passed before merge |
| M1 measurement registry | `SCHEMA_EXISTS-in-branch` | merged into the release branch: five Drizzle tables, numbered but unapplied SQL, compatibility view, separate backfill; PG16 scratch registry rehearsal passed |
| M2 Local Visibility | `CODE_IN_BRANCH` | Local contracts and frozen fixture, seven RLS tables in pending SQL, pre-provider guard, isolated queue name, locked/unknown cabinet state, unit coverage and PG16 scratch rehearsal; not merged into the release branch |
| M3 Search and Reputation | `NOT_BUILT` | depends on M1 and the completed M2 repeat of Gate 2 |
| M4 Action and Evidence Loop | `NOT_BUILT` | depends on M1 and an implemented measurement package |
| M5 Visibility Map | `NOT_BUILT` | depends on M2 |
| M6 Outcome Layer | `NOT_BUILT` | depends on M4 for meaningful attribution |

## Acceptance gates

| Gate | Status | Evidence or blocker |
| --- | --- | --- |
| 1 `AI_CORE_NO_REGRESSION_PASS` | `PASS (M2 local)` | Node 24.18: contracts 100/100, lib 814/814, config 87/87, web 294 passed / 4 skipped; all four typechecks and the production build passed. The PostgreSQL stub cycle passed over numbered migrations plus pending M2 SQL, and the 390 px registration/project/cabinet path had no overflow or browser errors. M2 adds no columns to `sv_runs`, `sv_cycles` or `sv_run_permits` |
| 2 `MEASUREMENT_DOMAIN_ISOLATION_PASS` | `PASS (M2 local)` | M1 registry criteria were repeated on disposable PG16; Local creates no `sv_runs`, AI and Local cost sums remain isolated by `domain_id`, retry/cardinality remain domain-specific, Local failure and emergency stop leave the AI cycle unchanged, and the queue name is separate |
| 3 `LOCAL_MEASUREMENT_SCHEMA_PASS` | `PASS (M2 local)` | disposable PG16 proved the exact observation uniqueness key, complete `grid points x keywords x repeats` cardinality, explicit invalid/unmeasured rows with reasons, required nonnegative depth, reconstructable region/coordinate/keyword/provider and immutable grid versions |
| 4 `GEO_GRID_METRICS_PASS` | `PASS (M2 local)` | frozen `local-coverage-v1` fixture covers Top-3/10/20, outside Top-20, found-only average rank plus found share, Share of Local Voice, competitors, shallow captures and `UNKNOWN` empty denominators with deterministic six-decimal results |
| 5 `READINESS_VISIBILITY_SEPARATION_PASS` | `NOT_STARTED` | M3 not built |
| 6 `EVIDENCE_LOOP_INTEGRITY_PASS` | `NOT_STARTED` | M4/M6 not built |
| 7 `ATTRIBUTION_GUARDRAIL_PASS` | `NOT_STARTED` | M4/M6 not built |
| 8 `BEFORE_AFTER_REPRODUCIBILITY_PASS` | `NOT_STARTED` | M5 not built |
| 9 `LOCAL_COST_CARDINALITY_PASS` | `PASS (M2 local)` | Configuration Lock freezes formula, cardinality, cost keys and worst-case budget; grid ceiling is 49; expected+1 and emergency stop refuse before the provider callback and record the incident; retry reuses only its exact invalid/unmeasured row without increasing expected cardinality |
| 10 `VISIBILITY_MAP_DATA_INTEGRITY_PASS` | `NOT_STARTED` | M5 not built |
| 11 `MULTI_LOCATION_TENANT_PASS` | `NOT_STARTED` | M6 not built |
| 12 `VISIBILITY_OS_VERTICAL_SLICE_PASS` | `NOT_STARTED` | runs only on release after M1-M6 are merged |

The sequencing ambiguity is resolved: Gate 2 is binary per package stage. The
local M2 working tree passes its complete repeat, including
`sv_cost_events.domain_id`, cardinality, retry and queue isolation. M3 may start
only after this M2 change is reviewed and merged; local evidence is not a
release or deployment claim.

## Pending database files

| File | Purpose | Applied state |
| --- | --- | --- |
| `packages/lib/src/db/migrations/0037_visibility_os_measurement_registry.sql` | five registry tables, indexes, RLS policies, domain seeds, AI compatibility view | scratch only; not applied to staging or production |
| `packages/lib/scripts/backfill-visibility-os-ai-cycles.sql` | id-preserving AI umbrella rows after M1 is applied | scratch only |
| `packages/lib/src/db/migrations/_pending-os/M2_local_visibility.sql` | Local business-location fields, cost domain references, seven Local tables, constraints, triggers and RLS policies | unnumbered local file; scratch only |

Migration number `0037` and its `_journal.json` entry remain unchanged. M2 does
not claim a migration number and does not edit the journal. Its optional
`SELENA_LOCAL_VISIBILITY_ENABLED` server flag is fail-closed: only the exact
value `true` unlocks the cabinet state and pre-provider guard.
