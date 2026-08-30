# Selena AI Visibility v1.2.1 — acceptance matrix

| ID | Requirement | Evidence | Status | Gate |
|---|---|---|---|---|
| GRID-01 | Versioned spherical grid `sv-grid-sphere-v1` | `packages/selena-visibility-contracts/src/visibility-os.ts` | `VERIFIED` | Local |
| GRID-02 | 3×3/5×5, 3000 m corner radius, NW row-major | Contract tests | `VERIFIED` | Local |
| GRID-03 | Canonical antimeridian, fixed scale, UUIDv5 | Regression/golden tests | `VERIFIED` | Local |
| DOM-01 | Replace `LOCAL` with `LOCAL_MAPS`; add `LOCAL_AI` | No additive migration yet | `NOT_STARTED` | Migration draft |
| LOCK-01 | Immutable versioned child Locks | Existing JSON snapshot is insufficient | `NOT_STARTED` | Migration draft |
| ATT-01 | Durable attempt ledger, at most 3 attempts | `sv_measurement_attempts` absent | `NOT_STARTED` | Migration draft |
| ATT-02 | Ambiguous call reconciliation without duplicate spend | Provider task reconciliation absent | `NOT_STARTED` | Provider contract |
| BUD-01 | Atomic reservation/spend/release | Frozen quote only | `NOT_STARTED` | Migration draft |
| RLS-01 | Non-owner runtime role and transaction-local tenant context | Policies exist; runtime proof absent | `PARTIAL` | Disposable DB, then shared staging |
| MAP-01 | Deterministic free Maps stub | Adapter/stub absent | `NOT_STARTED` | Local |
| API-01 | Local quote/create/progress/results/evidence APIs | Routes absent | `NOT_STARTED` | Local |
| PAY-01 | One-task paid canary | No approval and prerequisites incomplete | `NOT_STARTED` | Owner paid gate |
| PROD-01 | Checkout, recurring scans, production acceptance | Explicitly disabled | `NOT_STARTED` | Owner production gates |
