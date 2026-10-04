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
3 questions × systems × repeats runs: 9 for Snapshot (3 visitor surfaces),
24 for Landscape (3 visitor surfaces and 5 API models), at the plan's nominal
price ($49 / $79) and a recorded payment of $0. The worst-case reservation the
order preflight checks is 24 × $0.005 = $0.12, under the run's $2 provider
budget, the $1 `measure` scope and the plan's own cap.

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
