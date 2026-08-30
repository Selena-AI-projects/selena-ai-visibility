# Selena AI Visibility v1.2.1 — acceptance matrix

| ID | Requirement | Evidence | Status | Gate |
|---|---|---|---|---|
| GRID-01 | Versioned spherical grid `sv-grid-sphere-v1` | `packages/selena-visibility-contracts/src/visibility-os.ts` | `VERIFIED` | Local |
| GRID-02 | 3×3/5×5, 3000 m corner radius, NW row-major | Contract tests | `VERIFIED` | Local |
| GRID-03 | Canonical antimeridian, fixed scale, UUIDv5 | Regression/golden tests | `VERIFIED` | Local |
| DOM-01 | Replace `LOCAL` with `LOCAL_MAPS`; add `LOCAL_AI` | `0043` additive dual-domain draft statically reviewed; no backfill/apply | `PARTIAL` | Disposable DB |
| LOCK-01 | Immutable versioned child Locks | Maps/Local AI Lock v1 schemas verified; global Lock version/immutability persistence still pending | `PARTIAL` | Migration draft |
| ATT-01 | Durable attempt ledger, at most 3 attempts | `sv_measurement_attempts` schema, state guards and sequence controls statically verified; not applied | `PARTIAL` | Disposable DB |
| ATT-02 | Ambiguous call reconciliation without duplicate spend | Same-attempt reclaim, indefinite reserve and reconciliation provenance statically verified; provider reconciliation absent | `PARTIAL` | Runtime contract |
| BUD-01 | Atomic reservation/spend/release | Permit-level states, cost scope/amount and append-only guards drafted; aggregate cap transaction absent | `PARTIAL` | Runtime/migration draft |
| RLS-01 | Non-owner runtime role and transaction-local tenant context | Attempt RLS and tenant-safe FKs drafted; runtime role/GUC proof absent | `PARTIAL` | Disposable DB, then shared staging |
| MAP-01 | Deterministic free Maps stub | Adapter/stub absent | `NOT_STARTED` | Local |
| API-01 | Local quote/create/progress/results/evidence APIs | Routes absent | `NOT_STARTED` | Local |
| PAY-01 | One-task paid canary | No approval and prerequisites incomplete | `NOT_STARTED` | Owner paid gate |
| PROD-01 | Checkout, recurring scans, production acceptance | Explicitly disabled | `NOT_STARTED` | Owner production gates |
