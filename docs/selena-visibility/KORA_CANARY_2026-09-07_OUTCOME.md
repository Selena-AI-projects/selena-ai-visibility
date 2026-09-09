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

The request code is the same in every material respect — `POST
https://data.oxylabs.io/v1/queries`, Basic authorization, JSON content type,
body `{ source: "perplexity", prompt, parse: true }` — in the registry
provider the probe uses and in the adapter the canary uses, and the journal
script hands the adapter the plain `fetch`, the default endpoint and the
credentials trimmed from `OXYLABS_USERNAME` / `OXYLABS_PASSWORD`. The first
reading of this record concluded that the Railway pair therefore had to
differ from the GitHub Actions copy. **The owner compared them and they are
identical.** That leaves two differences between the accepted job and the
refused one, and the record does not choose between them:

- **Time.** The canary ran at 04:23Z, the probe at 05:22Z. The dashboard at
  05:0xZ showed Web Scraper API `Active` with spending analytics still
  "uploading, up to 24 hours" — the state of a product activated recently.
  An account not yet active at 04:23Z answers a valid credential with a 4xx
  and the same credential with a job an hour later.
- **Network.** The canary submits from a Railway container, the probe from a
  Blacksmith runner. An account-level IP restriction would refuse one and not
  the other; it is unlikely for a password-authenticated Web Scraper API
  user, but it is the only other thing that differs.

Concurrency does not explain the log on its own: six submissions in flight
could draw a 429 on the later ones, but a first job accepted at 04:23Z would
have been polled for twenty seconds, and the whole run ended in four tenths.

What separates the two is one more run through the adapter from Railway,
with the reason breakdown the script now prints. It cannot be on
`korafoodhall` until the claim below is released, but the block is per
project: the same canary on another owner project, at the same ceiling,
answers the question and is the first live test of the wall detector.

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

### What releases this claim: migration 0065

`0065_journal_executor_settled_reconciliation.sql` adds
`sv_reconcile_journal_executor_settled`, a sibling of `0060` with the same
five parameters, the same owner-only boundary and the same receipt shape
plus `settlementShape: EXECUTOR_SETTLED`. It is the exit for exactly the
shape above and refuses every other: the claim in `EXECUTING` or `HOLD`, the
cycle `STOPPED` or `FAILED`, every run terminal and fenced by a boundary of
this claim on its own consumed permit, no run still open
(`…_RUNS_STILL_OPEN` — that is `0060`'s shape), no legacy unfenced pair, the
lease past 45 minutes, no active measurement job. It settles nothing — the
executor already did, and the function never rewrites a run — it revokes
any unspent permit, cancels the order, and moves the claim `EXECUTING →
HOLD → RECONCILED` in one transaction through the two transitions the guard
already admits, so the guard itself is untouched. A replay returns
`ALREADY_RECONCILED` under the same actor and decision reference.

Applying it is the owner's decision twice over. First the migration: raise
`SELENA_MIGRATION_MAX_INDEX` to `65` on the staging `migrate` service and
deploy it, then read `prepared … through index 65` in its log. Then the
release, in the same owner `psql` session as the readback above — the
rehearsal first:

```sql
BEGIN;
SELECT set_config('app.organization_id', '<TENANT>', true);
SELECT jsonb_pretty(public.sv_reconcile_journal_executor_settled(
  '<CLAIM_ID>'::uuid,
  'selena-owner-reconciler'::text,
  'owner-decision-2026-09-07-korafoodhall-oxylabs-canary-attempt-1'::text,
  true::boolean,
  true::boolean
));
ROLLBACK;
```

Expected: `"decision": "RECONCILED"`, `"settlementShape": "EXECUTOR_SETTLED"`,
`settledRunCount` 25, `providerCallUpperBound` 25,
`providerCallsStatus` `UNKNOWN_WITHIN_UPPER_BOUND`, `costEventCount` between
0 and 6 with `unmatchedCostEventCount` 0. The `EXECUTING → HOLD` update from
the earlier rehearsal is no longer needed; the function does it. Then the
same statement with `COMMIT`, a second call to see `ALREADY_RECONCILED`,
and the next journal run on `korafoodhall` allocates attempt 2 — the
unresolved lookup does not see `RECONCILED`.

The script-side half of the same defect — the `INCOMPLETE_CYCLE` path
leaving the claim `EXECUTING` when every run is closed — is not changed
here: with `0065` in place that state has an owner exit, and moving the
claim automatically would decide for the owner what the function asks the
owner to acknowledge.

## The 401, and the second held claim

The canary ran on `avlibali` at 08:36Z from deployment
`66460751-e3c0-4e07-9ec3-3d8eee86267b` on `8f1965e`. Merging the migration
touched `packages/lib/**`, which is in the `measure` service's watch
patterns, so that merge and the variable change raced: two deployments, both
carrying the new variables, and the earlier one ran the canary while the
later one found the claim it had just made. A canary should be started from
a commit already deployed, or with the service's automatic deploys quiet.

```
AVLI Bali — 25 questions × 1 systems (~$0.2500)
  cycle 81037955-40ec-4931-8cca-182e58b6054c: 0 valid of 25 asked, 0 mention rows, 25 did not complete
  did not complete: SELENA_ORDER_STOPPED ×19, PROVIDER_HTTP_401 ×6
```

The reason breakdown is the line the first canary was spent learning, and it
names the code: **401**. Not 402, not 403. That settles three things at
once — the account needs no payment, the plan covers the source, and the
"activated between 04:23Z and 05:22Z" reading is wrong, because 08:36Z is
three hours after the probe answered.

What is left is that the same credential is refused from a Railway container
and accepted from a Blacksmith runner, with the owner having compared the two
stored values character by character. Three mechanisms produce exactly that,
and two of them were ours:

- **The Basic header was built differently.** The registry the probe uses
  encodes with `btoa`, one byte per code unit; the adapter used
  `Buffer.from`, which is UTF-8. For `café±§` those differ —
  `dTpjYWbpsac=` against `dTpjYWbDqcKxwqc=` — so a password holding any
  character between U+0080 and U+00FF reaches the provider as a different
  password from the same configured value.
- **The journal script trimmed the credential.** `required()` trims; the
  registry does not. A value stored with a trailing newline is one password
  through the probe and another through the canary.
- **An IP restriction on the Oxylabs account**, which no code change can
  reach.

The first two are fixed: `buildOxylabsAuthorization` is the registry's
encoding byte for byte and refuses a credential Basic cannot carry rather
than guessing at it, and `requiredCredential` passes the value as configured.
Both the adapter and the probe now print
`credential <user>:<pass> chars, header <12 hex>` — lengths catch the
whitespace a dashboard hides, the fingerprint catches everything else, and
neither can be read back into a credential. **Two runs whose fingerprints
match and whose outcomes differ leave only the network.**

That last sentence is wrong, and what refutes it is in
`PERPLEXITY_REVIEW_2026-09-07.md`: the probe workflow was run twice more the
same day, from the same Blacksmith runner that had answered at 05:22Z, and
both returned `401` under the same fingerprint `4f0d071cd42f`. A restriction
on the network the request comes from cannot refuse a machine it served four
hours earlier. What the four probe runs bound is a time, not a place — the
account served this credential at 05:22Z and refused it by 09:18Z — and no
change of ours falls in that window.

Spend was again nothing: a 401 creates no job, and after the submission-cost
fix those six rows carry no charge — the first live confirmation that both
changes from that fix behave as designed.

`avlibali` now carries a held claim of the same shape as `korafoodhall`'s,
made by this run. Migration `0065` releases both; it is merged and not yet
applied.
