# First live measurement — runbook

Owner authorized real provider calls on the AI answer path on 2026-09-03.
Staging's journal now stands at 63 entries through index 62, so migration `0062`
is applied and the spend meter is live: every permit takes a reservation against
a funded scope before it is claimed, rather than relying on the per-order
preflight cap and the Bright Data account limit alone — which was the gap the
audit named.

A read-only staging readback on 2026-09-04 found the `measure` scope at a
`$2` lifetime cap with `$0` committed and no open reservations. That is not the
`$20` standing limit selected below, so the funding step remains on hold.
For the next run the owner chose a `$0.50` ceiling instead; the procedure is
*One bounded Snapshot on staging (2026-10 procedure)* below.

The read-only `discover` phase has run twice. A staging rehearsal then created
and approved questions and built one 30-answer order chain with a zero-dollar
test payment. The order is `PAID_REVIEW_REQUIRED`; it has no cycle, permits,
runs, provider boundary, or cost event. What remains is to reconcile the scope
cap, review and enqueue exactly that order, open the worker's paid path, and
close it again after the terminal evidence is checked.

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

## One bounded Snapshot on staging (2026-10 procedure)

One Snapshot order in the operator's own workspace: a synthetic brand, 3
questions, the three Visitor View surfaces, 9 answers. The owner chose a
`$0.50` ceiling for it. Each step is one Railway service and one deploy —
variables are staged until deployed, see "Applying Railway variable changes"
in `SELENA_OWNER_OPERATING_GUIDE.md` — and nothing starts on a timer: the
measurement begins when the operator presses Enqueue at step 6 and not before.
The September order of operations further down stays as the record of the
first run.

0. **Owner service — read the ceiling.** `SELENA_OWNER_TASK=read-spend-budget`,
   `SELENA_SPEND_SCOPE=measure` → deploy → read `cap:` and `committed:` from
   the log. Last known (2026-09-08): cap `$2`, committed `$0.30`. The cap is
   lifetime-cumulative across all orders and all tenants and `committed` never
   resets, so the headroom is cap minus committed, not the cap.
1. **Owner service — set the ceiling.** Add `SELENA_SPEND_CAP_USD=0.50` (the
   variable does not exist on the service yet) and change
   `SELENA_OWNER_TASK=set-spend-budget` → deploy → the log prints the new cap
   with the unchanged `committed`. `$0.50 − $0.30` leaves `$0.20`; the run
   below holds `$0.0135` and settles at `$0.09`, so it fits with `$0.11` to
   spare. Lowering a cap towards what is already committed is allowed and
   means exactly that (`packages/lib/src/selena-provider-spend-budget.ts:5-12`).
2. **Owner service — grant the operator role.**
   `SELENA_OWNER_TASK=grant-platform-admin`,
   `SELENA_OWNER_ADMIN_EMAIL=<the operator's account>` → deploy → expect
   `grant-platform-admin: updated 1 user (x***@domain)` → clear
   `SELENA_OWNER_ADMIN_EMAIL`. Without `role = 'admin'` on the user row,
   `/app/selena-admin` answers NotFound
   (`apps/web/src/routes/_authed/app/selena-admin.tsx:25-27`), and the desk
   is where steps 4 and 6 happen.
3. **Web.** `SELENA_PROVIDER_BUDGET_USD=2`, `SCHEDULE_MAINTENANCE_ENABLED=false`,
   `SELENA_MEASUREMENT_ENABLED=true`, `SELENA_PAYMENTS_ENABLED=true`,
   `SELENA_PAYMENT_MODE=test` → deploy the staged change. Web's own
   `SELENA_EMERGENCY_STOP` is not consulted by approve or enqueue — the stop
   is read by the worker when it runs a permit
   (`apps/worker/src/jobs/selena-measure.ts:201`) — so setting it on web
   protects nothing. Preflight compares the order's 9 answers × `$0.005` =
   `$0.045` with `SELENA_PROVIDER_BUDGET_USD`; `$0.005` is the highest
   per-answer *reservation* any approved route makes, an estimate and not a
   price (`packages/selena-visibility-contracts/src/measurement-execution.ts:116-126`).
4. **Build the order** on the desk, in the operator's own workspace: synthetic
   brand, 3 questions. It stops at `PAID_REVIEW_REQUIRED`; approve it and it
   stands at `QUEUED`. **Do not press Enqueue yet.**
5. **Worker.** `SELENA_EMERGENCY_STOP=false`, `SELENA_MEASUREMENT_ENABLED=true`,
   `SELENA_MEASUREMENT_ADAPTER=brightdata`, `SCHEDULE_MAINTENANCE_ENABLED=false`,
   `SELENA_RECURRING_JOBS_ENABLED` unset or `false` → deploy → wait for
   SUCCESS **and** the log line `Registered handler: selena-measure`
   (`apps/worker/src/handlers.ts:99`).
6. **Operator presses Enqueue once.**
7. **Wait until 9 runs are terminal.** The desk shows the order in
   `QC_REQUIRED` with a `providerSpend` figure, and the worker log has 9
   lines `[selena-measure] permit <id>: completed` or
   `[selena-measure] permit <id> failed: <reason>`
   (`apps/worker/src/jobs/selena-measure.ts:205-207`).
8. **Close the path.** Worker: `SELENA_EMERGENCY_STOP=true`,
   `SELENA_MEASUREMENT_ENABLED=false` → deploy. Web:
   `SELENA_MEASUREMENT_ENABLED=false` → deploy.
9. **Owner exports provider usage** from Bright Data and reconciles it against
   the database (table below).

> **WARNING — step 5 must be deployed and confirmed before step 6. Pressing
> Enqueue while the worker's stop is still engaged burns all 9 permits.** The
> executor reserves, then claims — which consumes the permit — then executes,
> and the stop is checked inside execution: `reserve → claim → executePermit →
> assertTransportAllowed` (`packages/lib/src/selena-run-executor.ts:185-188`,
> `:227`, `:42-47`). Each run is recorded FAILED with
> `SELENA_GLOBAL_EMERGENCY_STOP`
> (`packages/lib/src/run-policy/controlled-cycle.ts:35`) and settled at its
> reservation. A consumed permit cannot be retried: the queue has
> `retryLimit: 0` (`apps/worker/src/index.ts:94-97`) and a replayed permit is
> refused as already consumed (`selena-run-executor.ts:52`). The order would
> have to be rebuilt from a new lock, and the 9 reservations stay in
> `committed`.

### Expected ledger for 9 answers

| | Expected | Why |
|---|---:|---|
| Reservation, held before each call | 9 × `$0.0015` = `$0.0135` | `MEASUREMENT_ESTIMATED_COST_USD` for the `brightdata` family (`measurement-execution.ts:105`, `:110-114`). `branch-c` would reserve `$0.005` × 9 = `$0.045`, because its Perplexity route is `dataforseo-perplexity` (`:75-78`, `:107`). An estimated reservation, not a maximum and not a price. |
| Settlement | 9 × `$0.01` = `$0.09`, every row `basis = estimated` | Bright Data payloads carry no cost, so each run settles at the `brightdata` placeholder in `packages/lib/src/usage/cost.ts:20`. The 2026-09-04 run settled 30 × `$0.01`, all estimated. |
| Desk label | `$0.0900 · оценка для 9 из 9` | `apps/web/src/routes/_authed/app/selena-admin.tsx:687` |
| `measure` committed afterwards | `$0.30` + `$0.09` = `$0.39` | Read it back with `read-spend-budget`. |
| Validity | ≤ 6 `SUCCEEDED`, 3 `INVALID` — all 9 billed | `brightdata-perplexity` returned the sign-up wall 24/24 on 2026-09-05; an invalid answer is still a record on the invoice. |

### Reconciliation: Bright Data usage against the database

Bright Data → Billing / Usage, per dataset id. The ids are the worker's
`SELENA_BRIGHTDATA_DATASET_CHATGPT`, `_GEMINI` and `_PERPLEXITY` values, which
the owner reads off the service; unless those say otherwise they are
`gd_m7aof0k82r803d5bjm` (ChatGPT), `gd_mbz66arm2mf9cu856y` (Gemini) and
`gd_m7dhdot1vw9a7gc1n` (Perplexity).

| Field | Bright Data side | Database side |
|---|---|---|
| UTC window | from Enqueue to the last terminal run | `min(created_at)` / `max(completed_at)` of the cycle's `sv_runs` |
| Dataset id | one row per collector | `sv_runs.system_id` (ChatGPT, Gemini, Perplexity) |
| Record count | per dataset | `count(*)` of `sv_runs` by `system_id` — 3 each |
| Cost per record | as invoiced | compared with the `$0.0015` of 2026-09-01 |
| Total | per dataset and overall | `Σ sv_provider_spend_reservations.actual_usd` and `Σ sv_cost_events.amount_usd` — both `$0.09` |
| Request id | Bright Data request / snapshot id | `sv_runs.raw_response_reference` |

Criterion: the record count is exact per dataset, and the per-record price is
recorded and compared with the `$0.0015` figure of 2026-09-01. Follow-up once
the invoice is in: correct `packages/lib/src/usage/cost.ts` (`brightdata: 0.01`)
and `MEASUREMENT_ESTIMATED_COST_USD` to the invoiced figure, so the settlement
stops overstating what was spent.

## Order of operations

1. **Merge the branch.** Done — `0061` and `0062` are in
   `release/selena-visibility-mvp`.
2. **Approve the migration.** Done. Approval is asked only when there is new
   DDL to apply — `assertMigrationApproval` returns as soon as nothing is
   pending — so a redeploy of an unchanged migration set passes without a
   question. The `migrate` deploy on `1f0ae937` logged `journal before:
   63/1787940024000`, `journal after: 63/1787940024000`, `migrations complete`.
   When a deploy does refuse it prints the commit to approve: set
   `SELENA_MIGRATION_APPROVED_SHA` to that and redeploy.
3. **Fund the scope.** **HOLD at the intended standing limit.** The owner chose
   **`20` dollars** on 2026-09-04, but the database readback still reports a
   `measure` cap of **`2` dollars**, `$0` committed, and zero open reservations.
   No cap was changed during the reconciliation. Although `$2` covers the
   bounded run's `$0.09` retry-inclusive estimate, do not cross a paid boundary
   while the approved limit and the database source of truth disagree.

   Read it as a lifetime total, not an allowance per order or per venue. This
   is the only ceiling that accumulates: `--max-runs` bounds one invocation of
   the order script and `orderCap` bounds one order, while
   `sv_provider_spend_committed` sums every reservation the scope has ever
   held, with no order and no time window. Nothing resets it — when committed
   spending reaches the cap the meter refuses, and raising it is a deliberate
   act.

   | | Cost | Fits in intended `$20` |
   |---|---:|---:|
   | One bounded run, one venue: 10 × 3 × 1 | `$0.045` | ~440 |
   | Full Visitor Local plan, one venue: 100 × 3 × 1 | `$0.45` | ~44 |
   | Ten pilot venues, full plan each | `$4.50` | 4 times over |

   Set it, or read it back with no amount:

   ```
   pnpm -C packages/lib exec tsx scripts/set-provider-spend-budget.ts measure 20
   ```

   One permit holds one reservation, taken before the permit is claimed and
   settled when the run reaches a terminal state, so the ceiling is a real
   running total rather than a per-order guess.

4. **Build the order.** **Done for one staging rehearsal; not enqueued.** A
   measurement hangs off a chain of five records, each with an endpoint of its
   own and none with a page that creates the next.

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

   The `First live measurement order` workflow runs the script from CI, where
   the API key is a secret nobody has to hold in a shell. Its `discover` phase
   reads `/projects` and a family's questions, which is where the project and
   family ids the other two phases need come from.

   The read-only `discover` phase ran successfully in Actions on 2026-09-04 as
   runs [33847588901](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33847588901)
   and [33847858297](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33847858297).
   It performs only versioned API reads and created none of the records below.
   The subsequent staging readback found:

   - 35 scenarios created that day, all `APPROVED`;
   - the newest lock freezes 10 of those approved scenarios across 3 systems
     and 1 repeat, for 30 expected runs, with order cap `$2` and engine SHA
     `70ff5b8efdd26505553a79f40a06cdb2b480d1ab`;
   - an `ISSUED` zero-dollar quote, an order at `PAID_REVIEW_REQUIRED`, and a
     matching `$0` `test` payment at `SUCCEEDED`;
   - zero cycles, journal claims, run permits, runs, provider boundaries, and
     cost events created that day.

   Those zeros are the stop line: the commercial path has been assembled, but
   no measurement has been dispatched and no provider-spend evidence exists.
5. **Open the paid path.** On the staging `worker` service:

   | Variable | Value | Why |
   |---|---|---|
   | `SELENA_EMERGENCY_STOP` | remove, or any non-affirmative value | Affirmative values are `1`, `true`, `yes`. While set, every paid path refuses. |
   | `SELENA_MEASUREMENT_ENABLED` | `true` | Anything else, a misspelling included, leaves execution off. |
   | `SELENA_MEASUREMENT_ADAPTER` | `brightdata` | A family name: the concrete adapter is chosen per permit from the surface that permit authorizes, so a customer is never measured on a surface they did not buy. |
   | `SCHEDULE_MAINTENANCE_ENABLED` | `false` | Recurring maintenance and an order-scoped dispatch would drive the same work twice. |
   | `BRIGHTDATA_API_TOKEN` | present | On the staging worker it is present but **not sealed**: anyone with the dashboard can read it back. Seal it at the next variable edit; a sealed value is never read back. |

   On the staging `web` service, which runs preflight, approval and enqueue:

   | Variable | Value | Why |
   |---|---|---|
   | `SELENA_PROVIDER_BUDGET_USD` | `2` | Per-order ceiling at preflight on the order's estimated reservation: its answers × $0.005, the highest per-answer reservation the worker makes — an estimate, not a provider price. Read by `web` only; the worker never reads it. |
   | `SCHEDULE_MAINTENANCE_ENABLED` | `false` | Preflight reads it here as well; unset counts as on and blocks every order. |
   | `SELENA_MEASUREMENT_ENABLED` | `true` | Web refuses to enqueue while it is off. |
   | `SELENA_PAYMENTS_ENABLED` / `SELENA_PAYMENT_MODE` | `true` / `test` | The desk and a free promo order both draft through a test payment. |

   Leave `SELENA_RECURRING_JOBS_ENABLED` off. What governs the worker is the
   measurement, adapter, emergency-stop and scheduling flags in the first
   table; what governs whether an order may be approved and queued is the
   second. Real spend is bounded by the `measure` spend scope
   (`sv_provider_spend_budgets`), not by `SELENA_PROVIDER_BUDGET_USD`.
6. **Enqueue exactly one order** from the desk. Nothing runs on a timer; a
   commercial run starts from an explicit admin action.
7. **Close the path again.** Set `SELENA_EMERGENCY_STOP=true` as soon as the run
   reaches a terminal state. The stop is not the same as the measurement switch:
   it halts a claimed run at the point a provider would be contacted, so it is
   what to reach for if something looks wrong mid-run.

## What to check afterwards

- Every permit reached a terminal state, and the count of runs equals the
  planned cardinality — no permit consumed without a run.
- The cost ledger has one row per run and every row reads `basis = estimated`
  at `$0.01`: Bright Data payloads carry no cost, so nothing on these routes
  can write `actual` — the repository stores whatever basis the adapter
  reports, defaulting to estimated
  (`packages/lib/src/selena-visibility-repositories.ts:1269-1278`), and the
  adapter has only the placeholder in `packages/lib/src/usage/cost.ts:20`.
  For 9 answers that is `$0.09` in `sv_cost_events`, with `$0.0135` reserved
  beforehand; the expected ledger under the 2026-10 procedure has the detail.
  A sum far above `$0.01` a run means the scope was not what the preflight
  said.
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

## What the first live measurement returned

Order `239c25cb`, cycle `882f3ea3`, lock `8e53e776` v3, project KORA Food Hall.
Approved and enqueued 2026-09-04 11:50 UTC, last run finished 14:18 UTC.
Ten questions about eating in Ubud, none containing the brand name, on three
Bright Data Visitor View surfaces.

| | ChatGPT | Gemini | Perplexity |
|---|---|---|---|
| Valid answers | 10 / 10 | 4 / 10 | 2 / 10 |
| Brand named | 2 | 1 | 0 |
| Own domain cited | 2 | 0 | 0 |

Thirty permits, thirty runs, thirty ledger rows — no permit consumed without a
run. The brand was named on two questions: *"Where can I find a good food court
in Ubud?"* (ChatGPT and Gemini) and *"What are the best food halls in Ubud,
Bali?"* (ChatGPT), first position each time, with `korafoodhall.com` cited in
both ChatGPT answers. It was named on none of the other eight questions.

Three things this run says about the platform rather than about the brand:

1. **Fourteen of thirty runs came back invalid and every one of them was still
   billed.** Perplexity failed eight times with `MALFORMED_RESPONSE` and Gemini
   six times (`SNAPSHOT_NOT_READY` ×4, `RESPONSE_TOO_LARGE` ×2). Perplexity is
   effectively unmeasured at this sample size, and a customer paying per run
   would be paying for answers nobody can read.
2. **Every ledger row reads `basis = estimated`**, a flat $0.01 per run for
   $0.30 total. Nothing reconciles that against what Bright Data actually
   charged, so the platform can report what it expects to have spent and not
   what it spent. The check that mattered here was the cap, and $0.30 sits well
   inside the $2 order cap and the $12 remaining provider budget.
3. **Only the owned brand is extracted.** `sv_response_mentions` holds three
   rows, all `KORA Food Hall`, though the answers name many other Ubud
   restaurants. Competitor and share-of-voice numbers cannot be derived from
   this dataset until competitor entities are extracted too.

Against `deriveFindings`, this cycle raises three: low mention rate
(0.19 < 0.20, high), weak owned citation coverage (0.13 < 0.20, high), and an
elevated invalid rate (0.47 > 0.10, medium).
