# Visibility OS Implementation Status Matrix v2.0

State of `codex/visibility-os-m1-registry` on 2026-08-28. This matrix covers
Visibility OS only; `IMPLEMENTATION_STATUS_MATRIX_v1_4.md` remains the record
for the existing AI core.

**Nothing here is RELEASED.** The M1 SQL exists only in `_pending-os/`. It was
applied with the separate AI backfill only to a disposable PostgreSQL 16
scratch database. No production or staging database, deployment setting,
payment path, credential, or live provider was touched.

Feature statuses use the existing vocabulary: `DESIGNED` / `CODE_IN_BRANCH` /
`SCHEMA_EXISTS-in-branch` / `NOT_BUILT`. A gate remains `NOT_STARTED` or
`FAIL` until every criterion in `SELENA_VISIBILITY_OS_ACCEPTANCE_GATES_V2.md`
has a matching artifact.

## Packages

| Package | Status | Evidence |
| --- | --- | --- |
| M0 cycle economics | `CODE_IN_BRANCH` | merged into `release/selena-visibility-mvp`; contract package tests passed before merge |
| M1 measurement registry | `SCHEMA_EXISTS-in-branch` | five Drizzle tables, pending SQL, compatibility view, separate backfill; 803 package tests and PG16 scratch registry rehearsal pass |
| M2 Local Visibility | `NOT_BUILT` | blocked by Gate 2 |
| M3 Search and Reputation | `NOT_BUILT` | depends on M1 and M2 sequencing decision |
| M4 Action and Evidence Loop | `NOT_BUILT` | depends on M1 and an implemented measurement package |
| M5 Visibility Map | `NOT_BUILT` | depends on M2 |
| M6 Outcome Layer | `NOT_BUILT` | depends on M4 for meaningful attribution |

## Acceptance gates

| Gate | Status | Evidence or blocker |
| --- | --- | --- |
| 1 `AI_CORE_NO_REGRESSION_PASS` | `NOT_STARTED` | branch evidence: 803 package tests, unchanged AI table contracts, and the full stub cycle pass; the approved plan requires the authoritative run on the merge commit |
| 2 `MEASUREMENT_DOMAIN_ISOLATION_PASS` | `FAIL` | registry status and tenant isolation pass on scratch; Local retry/queue isolation does not exist before M2, and `sv_cost_events.domain_id` is assigned to M2 by the migration plan |
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

Gate 2 currently creates a sequencing deadlock: the acceptance document makes
it a prerequisite for M2, while two of its binary criteria first become
implementable in M2. M2 must not start until the owner either moves those
criteria to the M2 repeat of Gate 2 or explicitly adds the corresponding
cost-ledger and Local-domain work to M1.

## Pending database files

| File | Purpose | Applied state |
| --- | --- | --- |
| `packages/lib/src/db/migrations/_pending-os/M1_measurement_registry.sql` | five registry tables, indexes, RLS policies, domain seeds, AI compatibility view | scratch only |
| `packages/lib/scripts/backfill-visibility-os-ai-cycles.sql` | id-preserving AI umbrella rows after M1 is applied | scratch only |

No migration number or `_journal.json` entry has been assigned. There are no
new environment variables in M1.
