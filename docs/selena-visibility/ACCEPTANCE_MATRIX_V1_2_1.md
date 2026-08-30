# Selena AI Visibility v1.2.1 — acceptance matrix

| ID | Requirement | Evidence | Status | Gate |
|---|---|---|---|---|
| GRID-01 | Versioned spherical grid `sv-grid-sphere-v1` | `packages/selena-visibility-contracts/src/visibility-os.ts` | `VERIFIED` | Local |
| GRID-02 | 3×3/5×5, 3000 m corner radius, NW row-major | Contract tests | `VERIFIED` | Local |
| GRID-03 | Canonical antimeridian, fixed scale, UUIDv5 | Regression/golden tests | `VERIFIED` | Local |
| DOM-01 | Replace `LOCAL` with `LOCAL_MAPS`; add `LOCAL_AI` | `0043` additive dual-domain draft statically reviewed; no backfill/apply | `PARTIAL` | Disposable DB |
| LOCK-01 | Immutable versioned child Locks | Maps/Local AI Lock v1 schemas verified; global Lock version/immutability persistence still pending | `PARTIAL` | Migration draft |
| ATT-01 | Durable attempt ledger, at most 3 attempts | `sv_measurement_attempts` schema, state guards and sequence controls statically verified; not applied | `PARTIAL` | Disposable DB |
| ATT-02 | Ambiguous call reconciliation without duplicate spend | Same-attempt reclaim plus source-only runner: provider call follows committed `SUBMITTED` once; ambiguous paths never recall it; concrete store/reconciliation absent | `PARTIAL` | Runtime store |
| BUD-01 | Atomic reservation/spend/release | Non-authoritative aggregate projection and exact runner postconditions verified: UNKNOWN/estimated-zero→RESERVED, positive known→SPENT, actual known zero→RELEASED; aggregate cap transaction absent | `PARTIAL` | Runtime/migration draft |
| RLS-01 | Non-owner runtime role and transaction-local tenant context | Attempt RLS and tenant-safe FKs drafted; runtime role/GUC proof absent | `PARTIAL` | Disposable DB, then shared staging |
| MAP-01 | Deterministic free Maps stub | 125-slot `REHEARSAL_ONLY` adapter; SHA-bound frozen request; zero network/cost; synthetic output is non-persistable and evidence-ineligible | `VERIFIED` | Local |
| MAP-02 | Source-only live Maps runner boundary | Store-only READY gate, runner-owned result envelope, frozen-window checks, branded scoped continuation, exact finalize proof; 21 unit tests and three blind reviews pass; no adapter/export/worker registration | `VERIFIED` | Local protocol only |
| API-01 | Local quote/create/progress/results/evidence APIs | Routes absent | `NOT_STARTED` | Local |
| PAY-01 | One-task paid canary | No approval and prerequisites incomplete | `NOT_STARTED` | Owner paid gate |
| PROD-01 | Checkout, recurring scans, production acceptance | Explicitly disabled | `NOT_STARTED` | Owner production gates |
