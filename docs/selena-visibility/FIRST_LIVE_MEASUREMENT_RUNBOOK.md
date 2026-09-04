# First live measurement — runbook

Owner authorized real provider calls on the AI answer path on 2026-09-03.
Staging's journal now stands at 63 entries through index 62, so migration `0062`
is applied and the spend meter is live: every permit takes a reservation against
a funded scope before it is claimed, rather than relying on the per-order
preflight cap and the Bright Data account limit alone — which was the gap the
audit named.

Steps 1 and 2 are done on staging. Step 3 is funded, at an amount this page
does not agree with; step 4 has its tooling and has not been run. What remains
is that decision, one order, the worker's paid path, and two clicks at the
desk.

## What one run costs

From the account's own invoice on 2026-09-01: 9 ChatGPT records cost `$0.0135`,
so **one answer is `$0.0015`**. The same rate held for Gemini.

| Run | Answers | Expected | Worst case with one retry each |
|---|---:|---:|---:|
| Bounded first run: 10 questions × 3 surfaces × 1 repeat | 30 | `$0.045` | `$0.09` |
| Full Visitor Local plan: 100 × 3 × 1 | 300 | `$0.45` | `$0.90` |

The plan's own `providerBudgetCap` is `$12`, roughly twenty-six times the
expected cost. That margin is there to catch a scope typo, not to authorize
spending twenty-six times more.

## Order of operations

1. **Merge the branch.** Done — `0061` and `0062` are in
   `release/selena-visibility-mvp`.
2. **Approve the migration.** Done. Approval is asked only when there is new
   DDL to apply — `assertMigrationApproval` returns as soon as nothing is
   pending — so a redeploy of an unchanged migration set passes without a
   question. The `migrate` deploy on `49fbace` logged `journal before: 63`,
   `journal after: 63`, `migrations complete`. When a deploy does refuse it
   prints the commit to approve: set `SELENA_MIGRATION_APPROVED_SHA` to that
   and redeploy.
3. **Fund the scope.** Funded, but not settled: the `measure` scope carries a
   ceiling of `20` dollars with nothing committed and no open reservations,
   while the command below sets `2`. Decide which one before the first order.

   The gap matters more than the amount suggests, because this is the only
   ceiling that accumulates. `--max-runs` bounds one invocation of the order
   script and `orderCap` bounds one order; `sv_provider_spend_committed` sums
   every reservation the scope has ever held, with no order or time window. So
   the scope cap is what stands between a second order and a hundredth, and at
   `20` the meter permits ten times the aggregate this page intends — over
   thirteen thousand answers at the measured rate.

   ```
   pnpm -C packages/lib exec tsx scripts/set-provider-spend-budget.ts measure 2
   ```

   Two dollars is more than forty bounded runs and far under the plan cap. Read
   it back with the same command and no amount.

   One permit holds one reservation, taken before the permit is claimed and
   settled when the run reaches a terminal state, so the ceiling is a real
   running total across the whole order rather than a per-order guess.
4. **Build the order.** Not one screen: a measurement hangs off a chain of
   five records, each with an endpoint of its own and none with a page that
   creates the next.

   | Record | Endpoint |
   |---|---|
   | Scenarios — the questions | `POST /api/v1/selena/scenarios` |
   | Configuration lock | `POST /api/v1/selena/locks` |
   | Quote | `POST /api/v1/selena/quotes` |
   | Order | `POST /api/v1/selena/orders` |
   | Recorded payment | `POST /api/v1/selena/payments/test` |

   The customer-facing form at `/app/selena-order` does not build these — it
   files a lead, and says so on the page. Test payments need
   `SELENA_PAYMENTS_ENABLED=true` and `SELENA_PAYMENT_MODE=test` **on `web`**,
   which serves these endpoints; both are set on staging. `live` is refused
   unconditionally, so neither value can charge anyone.

   `packages/lib/scripts/selena-first-live-order.ts` walks them, in two phases
   because a question is reviewed between them:

   - `propose --questions <file>` creates the scenarios and prints their ids.
   - A reviewer approves them in the workspace. Permit creation trusts the ids
     frozen into the lock and never rechecks their status, so this is the only
     point where an unapproved question can still be caught.
   - `build --scenarios <file>` refuses any id that is not `APPROVED`, then
     assembles lock, quote, order and payment.

   It refuses a question set whose answers would exceed `--max-runs`, so a full
   plan cannot be ordered by reaching for the wrong list, and it derives the
   lock version from the project's existing locks rather than assuming a fresh
   project. It stops at the order and creates no permits. Run either phase
   without `--confirm` first — it prints the planned answer count and writes
   nothing.
5. **Open the paid path.** On the staging `worker` service:

   | Variable | Value | Why |
   |---|---|---|
   | `SELENA_EMERGENCY_STOP` | remove, or any non-affirmative value | Affirmative values are `1`, `true`, `yes`. While set, every paid path refuses. |
   | `SELENA_MEASUREMENT_ENABLED` | `true` | Anything else, a misspelling included, leaves execution off. |
   | `SELENA_MEASUREMENT_ADAPTER` | `brightdata` | A family name: the concrete adapter is chosen per permit from the surface that permit authorizes, so a customer is never measured on a surface they did not buy. |
   | `SCHEDULE_MAINTENANCE_ENABLED` | `false` | Recurring maintenance and an order-scoped dispatch would drive the same work twice. |
   | `SELENA_PROVIDER_BUDGET_USD` | `2` | Per-order worst-case ceiling at preflight. |
   | `BRIGHTDATA_API_TOKEN` | present | Sealed; never read back. |

   Leave `SELENA_RECURRING_JOBS_ENABLED` off. `SELENA_PAYMENTS_ENABLED` belongs
   to `web`, which serves the payment endpoints; no code path in the worker
   reads it, so setting it here neither enables nor prevents anything. What
   governs the worker is the measurement, adapter, emergency-stop and
   scheduling flags in the table above.
6. **Enqueue exactly one order** from the desk. Nothing runs on a timer; a
   commercial run starts from an explicit admin action.
7. **Close the path again.** Set `SELENA_EMERGENCY_STOP=true` as soon as the run
   reaches a terminal state. The stop is not the same as the measurement switch:
   it halts a claimed run at the point a provider would be contacted, so it is
   what to reach for if something looks wrong mid-run.

## What to check afterwards

- Every permit reached a terminal state, and the count of runs equals the
  planned cardinality — no permit consumed without a run.
- The cost ledger has rows with `basis = actual`, not `estimated`, and the sum
  is within a few cents of `$0.045`. A sum far above that means the scope was
  not what the preflight said.
- Each run carries extraction output. A run stored and billed with no mention,
  position or citation extracted is a successful call whose answer nothing read
  — worth stopping for.
- The answers are real text, not empty strings, and the surfaces are the three
  the plan sold.

## If it goes wrong

`SELENA_EMERGENCY_STOP=true` stops it, including runs already claimed. Do that
first and diagnose second. Do not re-run to see whether it fails the same way:
each attempt is a real charge, and one technical-invalid retry per run is
already the policy.

## What still protects you at step 5

The adapter name is checked twice: it must be registered in the worker and on
the owner-approved list in `measurement-execution.ts`. The three Bright Data
Visitor View surfaces are already on that list, so `brightdata` does select a
live paid path — the credentials are the remaining requirement, not another
code change. A name outside the list is refused with
`SELENA_LIVE_ADAPTER_REQUIRES_OWNER_GO`.

The owner guide said this needed a code change even for an approved adapter,
which stopped being true when those three were added. It has been corrected in
the same commit as this runbook.
