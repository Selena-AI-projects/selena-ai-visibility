# Disposable proof — migrations 0061 and 0062

Date: 2026-09-03
Database: throwaway PostgreSQL 16.13 cluster, created and destroyed for this
run. No staging, production or shared database was touched, and no provider was
called.

Migrations `0000` through `0062` applied in order to an empty database:
`journal before: no journal table yet` → `journal after: 63/1787940024000` →
`migrations complete`.

The runtime role was created with the attributes the bootstrap script gives it —
`NOSUPERUSER NOINHERIT NOBYPASSRLS` — and the grant blocks from both migrations
were applied against it.

## Pilot seats — `0061`

| Case | Result |
|---|---|
| Redeem with a plan the seat was not issued for | `NULL`, seat still `UNCLAIMED` |
| Redeem with the issued plan | `visitor-local` |
| Same organization submits again | `visitor-local` — idempotent, no second seat |
| A different organization submits the same code | `NULL` |
| Expired seat | `NULL` |
| Unknown code | `NULL` |
| Seats consumed in total | `1`, held by `org-1` |

Eight organizations redeeming one seat simultaneously: exactly one received
`visitor-local`, seven received `NULL`, and the seat records a single holder.
One-time use survives concurrency because the claim is a single conditional
`UPDATE`, not a check followed by a write.

## Provider spend — `0062`

| Case | Decision | Committed |
|---|---|---|
| Reserve against a scope nobody funded | `REFUSED_NO_BUDGET` | — |
| First reservation, cap `0.12` | `RESERVED` | `0.05` |
| Same request key again | `ALREADY_RESERVED` | `0.05` — unchanged |
| Second request key | `RESERVED` | `0.10` |
| Third, which would cross the cap | `REFUSED_OVER_CAP` | `0.10` |
| Release the unspent second hold | `RELEASED` | `0.05` |
| Third retried after the release | `RESERVED` | `0.10` |
| Settle the first at `0.07` actual | `SETTLED` | `0.12` |
| Settle it again | `ALREADY_SETTLED` | `0.12` — no double count |

Eight concurrent reservations against a scope with room for exactly one:
one `RESERVED`, seven `REFUSED_OVER_CAP`, one ledger row, committed exactly
`0.05`. This is the race a count-then-spend check loses.

## Least privilege

As `selena_app`:

| Attempt | Result |
|---|---|
| `select` from `sv_pilot_invites` | permission denied |
| `select` from `sv_provider_spend_budgets` | permission denied |
| `select` from `sv_provider_spend_reservations` | permission denied |
| `insert` a seat | permission denied |
| Raise its own budget | permission denied |
| `sv_reserve_provider_spend(...)` | executed, returned a decision |
| `sv_redeem_pilot_invite(...)` | executed, returned `NULL` for an unknown code |

The runtime can spend a seat and hold budget. It cannot enumerate seats, mint
one, read the ledger, or raise the ceiling it spends under.

## What this does not prove

Applying these migrations to shared staging, which remains an owner decision
gated on `SELENA_MIGRATION_APPROVED_SHA`. No browser or HTTP path was exercised
here: this is database behaviour only.
