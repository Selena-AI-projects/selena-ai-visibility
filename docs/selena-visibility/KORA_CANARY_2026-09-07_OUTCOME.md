# What the Oxylabs canary of 2026-09-07 actually returned

Nothing. The run bought no answer, and the reason it bought none is worth
more than the answers would have been.

Deployment `3f3d4f90-7909-4c74-b460-461afe89f1ad` on the `measure` service,
staging, commit `95d304a6c42c4826c95229ada50a23c1ff3a9548`, adapter
`oxylabs-perplexity`, ceiling `$0.50` against a planned `$0.2500`. Its whole
runtime log:

```
Measuring 1 project(s) through oxylabs-perplexity
KORA Food Hall — 25 questions × 1 systems (~$0.2500)
  6/25 … 25/25
  cycle 63e3103d-4d41-4716-ba86-9dd786ef0b1c: 0 valid of 25 asked, 0 mention rows, 25 did not complete
  coverage below four fifths — read the counts, not a rate
korafoodhall: SELENA_JOURNAL_INCOMPLETE_CYCLE: outcomes=0/25, ledger=25, cycle=25/25 STOPPED
```

Twenty-five permits resolved in four tenths of a second. Nothing that talks to
a provider is that fast, so the failure is a refusal, not a measurement.

## What refused

The cycle ended `STOPPED`, and only one thing moves a Perplexity cycle to
`STOPPED`: `isPerplexityContractRejection`, whose whole definition is
`/^PROVIDER_HTTP_4\d\d$/`. Oxylabs answered the submission with a 4xx.

Which 4xx is not in this record, because the script printed counts and no
reasons. 401, 402 and 403 are all consistent with what was logged, and they
point at different things — a credential that differs from the copy the
2026-09-06 probe used, an account without balance, a subscription that does
not cover the source. That question is answered on the Oxylabs account, not
in this repository.

The breaker did its work: after the first 4xx the cycle went `STOPPED` and
`assertTransportAllowed` refused the rest before building a request, so the
provider saw at most the first concurrent group of six, not twenty-five.

## Spend

Real spend at the provider is almost certainly zero: a refused submission
creates no job, and there is nothing for an invoice to name.

The ledger disagrees, and that is a defect this run exposed. The adapter
attached the `$0.01` estimate to a submission the provider had refused, on
the wrong side of the boundary its own comment draws — a charge may exist
once a job exists, and here none did. Fixed in the same change as this
record: a 4xx on submission now carries no cost, while a 5xx and a
submission that never came back keep theirs, because those are the cases
where a job may exist behind the error.

## What this run did not test

The wall detector. No answer was reached, so no row was classified
`PROVIDER_AUTH_WALL`, and the code merged the same morning is still unproven
against live Oxylabs output. The canary's first question — is a wall recorded
as a wall — remains open.

## Before the next attempt

1. The Oxylabs account: whether `OXYLABS_USERNAME` and `OXYLABS_PASSWORD` on
   the `measure` service are the pair the 09-06 probe used, and whether the
   account can serve the `perplexity` source at all. Answered below: the
   account works and the Railway pair does not.
2. The daily claim from this attempt is still `EXECUTING`, and no shipped
   function can move it; the reading and what it takes are in the last
   section of this record.
3. `SELENA_EMERGENCY_STOP=true` and `SELENA_MEASUREMENT_ENABLED=false` were
   restored immediately after the run and confirmed by deployment
   `a9654238-44fd-4f33-b646-c3ba4b532d59`, whose log is `Starting Container`
   then `PROVIDER_CALLS_STOPPED`.

## What the probe of 05:22Z settled

Item 1 above is answered. The `Oxylabs Perplexity probe` workflow — one live
job through the same `perplexity` source, credentials from the GitHub
Actions secrets — ran as
[34086543400](https://github.com/Selena-AI-projects/selena-ai-visibility/actions/runs/34086543400)
on `4d6b576` and returned:

```
source: perplexity (provider "oxylabs", access "scraped")
job finished in 29s
content keys: additional_results,answer_results,answer_results_md,displayed_tabs,model,parse_status_code,prompt_query,raw_response,related_queries,url
llm_model: turbo
answer field: answer_results_md
answer: 105 chars, 10 citations, no web query exposed
VERDICT: a visitor answer with sources — the shape an adapter can be built on.
```

The account is live, the source is served, and nothing needs paying. The
dashboard agrees: Web Scraper API `Active`, no usage-limit rules, spending
analytics not yet populated.

What differs between that job and the refused canary is one thing. The
request code is the same in every material respect — `POST
https://data.oxylabs.io/v1/queries`, Basic authorization, JSON content type,
body `{ source: "perplexity", prompt, parse: true }` — in the registry
provider the probe uses and in the adapter the canary uses. The probe took
its credentials from the GitHub Actions secrets; the canary took them from
`OXYLABS_USERNAME` and `OXYLABS_PASSWORD` on the staging `measure` service.
One pair is accepted and the other is refused with a 4xx, so the Railway
values are not the pair that works. The fix is to overwrite them from the
Oxylabs dashboard (My account → Web Scraper API user), in the Railway
dashboard, never through a chat. The one residual alternative — an IP
restriction on the account that a Railway egress address fails — is unlikely
for a password-authenticated Web Scraper API user and is where to look only
if the rewritten pair is refused too.

Two more things the probe said:

**The answer was 105 characters, not 447.** `answer_results_md` on this run
is four venue names as a bulleted list, where the 09-06 run carried prose.
The payload also names `answer_results` and `raw_response`; whether one of
those holds the full answer is a question for the run's artifact, and it
decides what a canary should treat as the answer text. The wall detector
read this row correctly — ten sources, no wall phrase — and the 105-character
genuine answer is why the detector requires the absence of sources and not
only a short length.

**The published price is about eight times below the estimate.** The
Web Scraper API pricing page lists `Other: $1.15/1k results` without JS
rendering and `$1.35/1k` with it on the Micro plan, so one Perplexity answer
is roughly $0.0012 and a 25-question canary roughly three cents. The cost
table's `0.01` errs in the safe direction and stays until an invoice, not a
price list, replaces it.

## The daily claim: why it is held, and why nothing shipped can release it

Two retries (04:47Z and 05:14Z) were refused before any provider call with
`SELENA_JOURNAL_DAILY_CLAIM_HOLD: 2026-09-07 attempt 1 is EXECUTING`. This
section is the result of reading migrations `0058` and `0060` and the
journal script for that message — three independent readings, one
adversarial check of the role and precondition claims, and a direct read of
the invariant block. A second adversarial check of the mutation and
next-run claims did not run, so those rest on the readers' agreement and on
the `0060` rehearsal script rather than on a refutation pass.

### What the message means

`sv_recover_journal_daily_claim` (`0058:341-429`) returns `HOLD` for any
claim in status `EXECUTING`, unconditionally and without writing
(`0058:402-404`). The 45-minute rule that turns a vanished attempt into
`ABANDONED` applies only to a claim still in `CLAIMED` whose footprint is
provably empty — no runs, no consumed permits, no boundaries, no cost rows
(`0058:405-426`). This claim moved to `EXECUTING` before dispatch and left 25
of each, so its recovery state is `AMBIGUOUS` and time never touches it. The
row itself is still `EXECUTING`; the script prints the status it read, not
the decision.

Because the unresolved lookup in `acquireDailyClaim` is scoped to the
organization and project and not to a day (`measure-journal.ts:310-321`,
index `0054:44-46`), this one claim blocks every future journal run for
`korafoodhall`, not only today's.

### The exits the contract admits, and why each is closed

| Transition | Admitted by the row guard? | What stops it here |
|---|---|---|
| `EXECUTING → ABANDONED` | No — `JOURNAL_EXECUTING_ABANDONMENT_BLOCKED` (`0058:306-308`, `0060:169-171`) | Structural |
| `EXECUTING → COMPLETED` | Only with recovery state `TERMINAL_COMPLETED` (`0060:186-190`) | Needs the cycle in `QC_REQUIRED` or `READY`; it is `STOPPED` |
| `EXECUTING → HOLD` | Yes, by a plain owner `UPDATE` (`0060:195`) | `HOLD` is terminal (`0060:196`); its only exit is below |
| `HOLD → RECONCILED` via `sv_reconcile_journal_hold` | Owner role only, status must be `HOLD` (`0060:438-440`) | **`JOURNAL_HOLD_RECONCILIATION_EXECUTION_INVARIANT`** |

The last row is the one that matters. The reconciler's invariant counts, as a
violation, every run of the cycle for which `status <> 'RUNNING'` or
`finished_at`, `validity` or `invalid_reason` is set (`0060:497-520`). It is
built for the AVLI shape — a process that vanished with its runs still
`RUNNING` — and it settles those. This cycle's 25 runs were closed by the
executor's catch path as `FAILED` / `INVALID` with a reason
(`selena-run-executor.ts:196-203`), so all 25 count against it and the
function raises before writing. A claim whose runs were closed honestly is a
shape the contract does not yet have a word for.

### What can be read now, safely

One `psql` session against staging as the role that owns
`public.sv_journal_daily_claims` — `0060:243` tests `session_user`, so a
login as the owner, or a superuser after `SET SESSION AUTHORIZATION
<owner>`; `SET ROLE` is not enough. `<TENANT>` is the `SELENA_JOURNAL_TENANT`
of the staging `measure` service; the cycle id is known.

```sql
-- 0. Identity and the deployed function body. Line numbers in this record are
--    for the release file; compare before trusting them.
SELECT session_user, current_user,
       pg_get_userbyid(c.relowner) AS table_owner,
       pg_get_userbyid(p.proowner) AS function_owner,
       md5(pg_get_functiondef(p.oid)) AS function_body_md5
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_proc p
  ON p.oid = 'public.sv_reconcile_journal_hold(uuid,text,text,boolean,boolean)'::regprocedure
WHERE n.nspname = 'public' AND c.relname = 'sv_journal_daily_claims';

-- 1. Tenant scope: the function's own predicate needs it (0060:263), and so
--    does FORCE RLS for a non-superuser owner.
SELECT set_config('app.organization_id', '<TENANT>', false);

-- 2. The claim, from the known cycle. Expect EXECUTING, 2026-09-07, attempt 1,
--    cycle STOPPED 25/25, since_heartbeat well past 45 minutes.
SELECT claim.id AS claim_id, claim.status, claim.utc_day, claim.attempt,
       claim.question_set_version, claim.updated_at AS last_heartbeat,
       clock_timestamp() - claim.updated_at AS since_heartbeat,
       cycle.status AS cycle_status, cycle.expected_runs, cycle.completed_runs
FROM public.sv_cycles AS cycle
JOIN public.sv_journal_daily_claims AS claim
  ON claim.configuration_lock_id = cycle.lock_id
 AND claim.organization_id = cycle.organization_id
WHERE cycle.id = '63e3103d-4d41-4716-ba86-9dd786ef0b1c'::uuid;

-- 3. The topology the invariant judges, and the reasons the log did not print.
SELECT
  (SELECT count(*) FROM public.sv_run_permits
     WHERE cycle_id = '63e3103d-4d41-4716-ba86-9dd786ef0b1c' AND status = 'consumed') AS consumed_permits,
  (SELECT count(*) FROM public.sv_runs
     WHERE cycle_id = '63e3103d-4d41-4716-ba86-9dd786ef0b1c') AS runs,
  (SELECT count(*) FROM public.sv_runs
     WHERE cycle_id = '63e3103d-4d41-4716-ba86-9dd786ef0b1c'
       AND status = 'RUNNING' AND finished_at IS NULL
       AND validity IS NULL AND invalid_reason IS NULL) AS unfinished_runs,
  (SELECT count(*) FROM public.sv_journal_provider_boundaries
     WHERE cycle_id = '63e3103d-4d41-4716-ba86-9dd786ef0b1c') AS boundaries,
  (SELECT count(*) FROM public.sv_cost_events
     WHERE cycle_id = '63e3103d-4d41-4716-ba86-9dd786ef0b1c') AS cost_rows,
  (SELECT coalesce(sum(amount_usd), 0) FROM public.sv_cost_events
     WHERE cycle_id = '63e3103d-4d41-4716-ba86-9dd786ef0b1c') AS observed_cost_usd;

SELECT status, invalid_reason, count(*)
FROM public.sv_runs
WHERE cycle_id = '63e3103d-4d41-4716-ba86-9dd786ef0b1c'
GROUP BY 1, 2 ORDER BY 3 DESC;
```

The second query in step 3 is the one that names the 4xx: expect a handful
of `PROVIDER_HTTP_4xx` rows and the rest `SELENA_ORDER_STOPPED`. Expect
`unfinished_runs = 0`, which is the invariant's refusal in advance.

### The rehearsal that proves the refusal

The `EXECUTING → HOLD` update and the function call must share one
transaction: `HOLD` committed on its own strands the claim, because the
transition is terminal and the function will not accept it. `updated_at` is
left alone so the 45-minute lease stays anchored to the last real heartbeat.

```sql
BEGIN;
SELECT set_config('app.organization_id', '<TENANT>', true);
UPDATE public.sv_journal_daily_claims
   SET status = 'HOLD'
 WHERE id = '<CLAIM_ID>'::uuid AND organization_id = '<TENANT>' AND status = 'EXECUTING'
RETURNING id, status, updated_at;
SELECT jsonb_pretty(public.sv_reconcile_journal_hold(
  '<CLAIM_ID>'::uuid,
  'selena-owner-reconciler'::text,
  'owner-decision-2026-09-07-korafoodhall-oxylabs-canary-attempt-1'::text,
  true::boolean,
  true::boolean
));
ROLLBACK;
```

Expected result on the release contract:
`JOURNAL_HOLD_RECONCILIATION_EXECUTION_INVARIANT`, and the `ROLLBACK`
leaves the claim exactly as it was. If it instead returns a receipt with
`"decision": "RECONCILED"`, the deployed function differs from the release
file — read step 0's `md5` and the function body before doing anything
else; only then would the same two statements, with `COMMIT` in place of
`ROLLBACK` and the same actor and decision reference byte for byte (they are
the replay identity, `0060:398-403`), be the release.

The decision reference above follows the pattern already in the repository
(`owner-decision-2026-09-02-avli-budget-10`). What the owner acknowledges
with `p_ambiguous_spend_acknowledged = true` is what the contract can
express, not what happened: the receipt will report
`providerCallUpperBound = 25` (one pre-transport boundary per consumed
permit) and `providerCallsStatus = UNKNOWN_WITHIN_UPPER_BOUND`, while the
breaker bounds the real requests at six and a 4xx refusal bills nothing.

### What it takes to release this claim

A migration. Either `sv_reconcile_journal_hold` learns to accept a claim
whose runs are all terminal — closed, each with its consumed permit and
matching boundary, "settled by the executor" rather than by the reconciler
— and reports the observed cost from `sv_cost_events`; or a sibling
function does that for exactly this shape. Both are owner-gated
(`SELENA_MIGRATION_APPROVED_SHA`) and neither exists yet. The script-side
half of the same defect is that the `INCOMPLETE_CYCLE` path leaves the
claim `EXECUTING` when every run is closed and the cycle is terminal —
there is no status the guard admits for that state today, which is why the
fix cannot be script-only.

Until one of those ships, `korafoodhall` cannot be journaled on any day,
and the canary cannot be repeated on it. The other owner projects are not
affected: the block is per project.
