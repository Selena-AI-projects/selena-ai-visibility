# First live measurement — runbook

Owner authorized real provider calls on the AI answer path on 2026-09-03, and
separately chose to review this branch as a pull request before anything is
applied to staging. Those two together set the order: **the live run comes after
the merge**, because the spend meter it should run under is migration `0062`,
which is in this branch and not yet applied.

Running before that is possible and is not recommended. Without `0062` the only
ceilings are the per-order preflight cap and the limit configured on the Bright
Data account itself — which is exactly the gap the audit named.

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

1. **Merge this branch.** Migrations `0061` and `0062` become part of the
   release.
2. **Approve the migration.** The `migrate` deploy will refuse and print the
   exact SHA to use; set `SELENA_MIGRATION_APPROVED_SHA` to it on the `migrate`
   service and redeploy. Confirm the log reads `journal after: 63/…` and
   `migrations complete` — 63 entries is the chain through `0062`.
3. **Fund the scope.** The paid measurement path spends under the `measure`
   scope, and an unfunded scope refuses every reservation — so this comes before
   the first order, not after it. As the owner, against staging:

   ```
   pnpm -C packages/lib exec tsx scripts/set-provider-spend-budget.ts measure 2
   ```

   Two dollars is more than forty bounded runs and far under the plan cap. Read
   it back with the same command and no amount.

   One permit holds one reservation, taken before the permit is claimed and
   settled when the run reaches a terminal state, so the ceiling is a real
   running total across the whole order rather than a per-order guess.
4. **Prepare the order.** One project, one plan (`visitor-local`), ten approved
   questions. Build the order on the admin desk as usual and check the preflight
   reports the cardinality you expect — `30` planned answers, not `300`.
5. **Open the paid path.** On the staging `worker` service:

   | Variable | Value | Why |
   |---|---|---|
   | `SELENA_EMERGENCY_STOP` | remove, or any non-affirmative value | Affirmative values are `1`, `true`, `yes`. While set, every paid path refuses. |
   | `SELENA_MEASUREMENT_ENABLED` | `true` | Anything else, a misspelling included, leaves execution off. |
   | `SELENA_MEASUREMENT_ADAPTER` | `brightdata` | A family name: the concrete adapter is chosen per permit from the surface that permit authorizes, so a customer is never measured on a surface they did not buy. |
   | `SCHEDULE_MAINTENANCE_ENABLED` | `false` | Recurring maintenance and an order-scoped dispatch would drive the same work twice. |
   | `SELENA_PROVIDER_BUDGET_USD` | `2` | Per-order worst-case ceiling at preflight. |
   | `BRIGHTDATA_API_TOKEN` | present | Sealed; never read back. |

   Leave `SELENA_RECURRING_JOBS_ENABLED` and `SELENA_PAYMENTS_ENABLED` off.
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
