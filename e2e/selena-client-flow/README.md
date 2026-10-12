# Selena client-flow harness

Drives the invited client's whole path through the product on one commit, in
a throwaway setup, and leaves evidence behind: a clean worktree of that commit,
a disposable local database, the web build served in production mode, a sink in
place of Resend and a worker that runs the production `selena-measure` handler
with the inert stub adapter. Four people sign up through the pilot allowlist;
one client redeems a pilot seat for a free measurement, the worker answers every
permit, the operator records QC from the desk, the client reads a report whose
numbers are checked against the stored runs, other sessions replay the operator's
and the client's calls and must be refused, a second client's measurement gets no
answers and QC rejects it, and nothing leaves the machine. Each check lands in
`evidence/steps.json`; the process fails on any FAIL.

## Running it

```sh
bash e2e/selena-client-flow/run.sh                        # Visibility Snapshot
HARNESS_PLAN=landscape bash e2e/selena-client-flow/run.sh # Full Discovery Landscape
```

Both clients redeem a seat for the chosen plan, so the scenario expects
3 questions × systems × repeats runs: 9 for Snapshot (ChatGPT and Gemini in
Visitor View, Perplexity through its API), 24 for Landscape (the same three
and 5 more API models), at the plan's nominal price ($49 / $79) and a recorded
payment of $0. Perplexity's website as a visitor sees it is not measured until
a transport for it is verified, so no plan mints a Visitor View run for it.
The estimated reservation the order preflight checks is 24 × $0.005 = $0.12
(a reservation estimate, not a price), under the run's $2 provider budget and
the plan's own cap; at run time the stub worker reserves $0.0015 per answer
against the $1 `measure` scope, which the run never approaches.

## Why the other two plans do not run here

- The harness enters through the free request: a pilot seat redeemed on
  `/app/selena-order`, which accepts `?plan=snapshot|landscape` only, and seats
  are issued only for `visibility-snapshot` and `full-discovery-landscape`
  (`pilotSeatPlanIds`). Neither Competitive Audit nor Managed Growth has a seat
  or promo request path.
- Managed Discovery Growth has `providerBudgetCap: 0` in the catalog, so the
  order preflight's WITHIN_ORDER_CAP fails for any reservation; its scope is
  negotiated and admin-approved, not self-served.
- Competitive Audit measures 3 × 8 × 5 = 120 runs for the three questions here;
  running it would need the promo request path extended to that plan.
