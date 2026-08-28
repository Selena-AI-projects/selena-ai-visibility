# Visibility OS Implementation Status Matrix v2.0

State of `codex/visibility-os-m1-gate-closure` on 2026-08-29. This matrix covers
Visibility OS only; `IMPLEMENTATION_STATUS_MATRIX_v1_4.md` remains the record
for the existing AI core.

**Nothing here is deployed or database-released.** M1 source is merged into
`release/selena-visibility-mvp`, while migration `0037` is unapplied outside a
disposable PostgreSQL 16 scratch database. No production or staging database,
deployment setting, payment path, credential, or live provider was touched.

Feature statuses use the existing vocabulary: `DESIGNED` / `CODE_IN_BRANCH` /
`SCHEMA_EXISTS-in-branch` / `NOT_BUILT`. A gate remains `NOT_STARTED` or
`FAIL` until every criterion in `SELENA_VISIBILITY_OS_ACCEPTANCE_GATES_V2.md`
has a matching artifact.

## Packages

| Package | Status | Evidence |
| --- | --- | --- |
| M0 cycle economics | `CODE_IN_BRANCH` | merged into `release/selena-visibility-mvp`; contract package tests passed before merge |
| M1 measurement registry | `SCHEMA_EXISTS-in-branch` | merged into the release branch: five Drizzle tables, numbered but unapplied SQL, compatibility view, separate backfill; 803 package tests and PG16 scratch registry rehearsal pass |
| M2 Local Visibility | `NOT_BUILT` | Gate 2 M1 stage passed; waits for the Gate 1 browser fix to merge and pass on the resulting release commit |
| M3 Search and Reputation | `NOT_BUILT` | depends on M1 and the completed M2 repeat of Gate 2 |
| M4 Action and Evidence Loop | `NOT_BUILT` | depends on M1 and an implemented measurement package |
| M5 Visibility Map | `NOT_BUILT` | depends on M2 |
| M6 Outcome Layer | `NOT_BUILT` | depends on M4 for meaningful attribution |

## Acceptance gates

| Gate | Status | Evidence or blocker |
| --- | --- | --- |
| 1 `AI_CORE_NO_REGRESSION_PASS` | `FAIL` | merge commit `82127f03` passed 803 lib tests and the full stub cycle, but the cabinet exposed a client-side `Buffer` crash; the follow-up branch fixes the client/server boundary and opens the existing project with no browser errors, but Gate 1 must be repeated on the follow-up merge commit |
| 2 `MEASUREMENT_DOMAIN_ISOLATION_PASS` | `PASS (M1)` | five-domain registry, no `sv_runs` on Local registry insertion, independent statuses, evidence domain/cycle FK and two-tenant RLS passed on disposable PG16; Local cost/cardinality/retry/queue remain mandatory in the M2 repeat |
| 3 `LOCAL_MEASUREMENT_SCHEMA_PASS` | `NOT_STARTED` | M2 not built |
| 4 `GEO_GRID_METRICS_PASS` | `NOT_STARTED` | M2 not built |
| 5 `READINESS_VISIBILITY_SEPARATION_PASS` | `NOT_STARTED` | M3 not built |
| 6 `EVIDENCE_LOOP_INTEGRITY_PASS` | `NOT_STARTED` | M4/M6 not built |
| 7 `ATTRIBUTION_GUARDRAIL_PASS` | `NOT_STARTED` | M4/M6 not built |
| 8 `BEFORE_AFTER_REPRODUCIBILITY_PASS` | `NOT_STARTED` | M5 not built |
| 9 `LOCAL_COST_CARDINALITY_PASS` | `NOT_STARTED` | M2 not built |
| 10 `VISIBILITY_MAP_DATA_INTEGRITY_PASS` | `NOT_STARTED` | M5 not built |
| 11 `MULTI_LOCATION_TENANT_PASS` | `NOT_STARTED` | M6 not built |
| 12 `VISIBILITY_OS_VERTICAL_SLICE_PASS` | `NOT_STARTED` | runs only on release after M1-M6 are merged |

The sequencing ambiguity is resolved: Gate 2 is binary per package stage. Its
M1 registry stage passed and unblocks the M2 implementation scope; M2 must then
pass the complete Local repeat, including `sv_cost_events.domain_id`,
cardinality, retry and queue isolation, before M3 starts. M2 remains paused
until Gate 1 passes on the follow-up merge commit.

## Pending database files

| File | Purpose | Applied state |
| --- | --- | --- |
| `packages/lib/src/db/migrations/0037_visibility_os_measurement_registry.sql` | five registry tables, indexes, RLS policies, domain seeds, AI compatibility view | scratch only; not applied to staging or production |
| `packages/lib/scripts/backfill-visibility-os-ai-cycles.sql` | id-preserving AI umbrella rows after M1 is applied | scratch only |

Migration number `0037` and `_journal.json` entry were assigned together on
the follow-up branch against the actual release head `0036`. There are no new
environment variables in M1.
