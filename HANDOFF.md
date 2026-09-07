# Handoff — Selena Systems measurement app

Start here when opening a fresh session on this repository. The company-wide
handoff (product, site, funnel, both repositories in one place) lives in
`parkourcafe/SELENA-AI-COMPANY`, file `HANDOFF.md`.

Read `AGENTS.md` first — it is the working contract for this repo. Then
`SELENA_OWNER_OPERATING_GUIDE.md`, which is the owner's own operating manual and
the only place that describes what turns spend on.

## What this repository is

A fork of Elmo, an open-source AI visibility platform, carrying the Selena
measurement product on top of it. Everything Selena-specific is prefixed `sv_`
in the database and `selena-` in file names; the Elmo product underneath is
still present and still builds.

## Where it runs

- **Railway**, built from `docker/Dockerfile`, two services: `web` and `worker`.
- **Postgres on Railway.** No Supabase here.
- The staging environment serves `app.selenasystems.com`.
- The integration branch is `release/selena-visibility-mvp`, **not** `main`.
  Pull requests target it.

## The two measurement channels

They are different observations and are never averaged together.

- **Visitor View** — what a person is shown by ChatGPT, Gemini or Perplexity.
  Runs through Bright Data, one collector per surface. Sold as the $49 plan.
- **API View** — the model answering from its own knowledge, no web search.
  Runs through OpenRouter. Part of the $79 plan.

## Current open problem — Perplexity collector returns an auth wall (5 September 2026)

Search for this block with the words: **Perplexity**, **auth wall**,
**brightdata-perplexity**, **PROVIDER_ERROR_ROW**, **issue #141**.

The Perplexity Visitor View metric is **not working and cannot be fixed in this
repository**. Bright Data's Perplexity collector `gd_m7dhdot1vw9a7gc1n`
**never returns an answer**: every snapshot (24/24 on 2026-09-05) is a wall:

```
keys=timestamp,input,error,error_code error=Auth wall: sign-up prompt detected
```

- This is **not a parser bug** — there is no `answer_text_markdown` to parse
  because the collector's own browser session is stopped at Perplexity's
  sign-up/login wall. Do **not** edit `normalizeAnswer`/`extractSources`; that
  branch was investigated and rejected.
- The adapter now classifies the row as **`PROVIDER_ERROR_ROW`** (provider
  refusal), not `MALFORMED_RESPONSE`, and the run cycle **fails closed** on it —
  so a wall is reported honestly instead of being paid for as a fake zero.
- ChatGPT and Gemini visitor runs work (the 29 valid answers on 2026-09-05 were
  exactly those two). Only Perplexity is blocked.
- Dev deployed: staging worker sits on release `a70ffb2b` (merge of #140 into
  release, diagnostics #139 now live). `SELENA_EMERGENCY_STOP=true` is the
  correct safety setting and should stay on until the owner decides the next
  provider step.
- **Ticket is filed:** https://github.com/parkourcafe/selena-ai-visibility/issues/141
  (body also at `docs/selena-visibility/BRIGHTDATA_PERPLEXITY_AUTH_WALL.md`, full
  observation at `SELENA_VISITOR_VIEW_BRIGHTDATA_WIRING.md`).

### Decisions the owner must make next

1. **Do we keep waiting on Bright Data support** to fix the Perplexity
   collector, or **switch to a different Perplexity provider**? The candidates
   named so far: another Bright Data Perplexity dataset, **Oxylabs**, or
   **DataForSEO Sonar**. This is the only blocker for a Perplexity number.
2. If switching: **which provider**, and does the owner **approve the billing**
   for it (new token + `SELENA_BRIGHTDATA_DATASET_PERPLEXITY` style wiring, same
   `.env`/Railway gate as the original Bright Data wiring)?
3. **What is the Perplexity SLA?** Until this is resolved, every
   `brightdata-perplexity` number is **unverified** and must be labeled as such
   in any report. Perplexity stub should keep failing closed, not show a zero.
4. Whether to spend another paid permit to re-test once the owner (or Bright
   Data) believes the wall is gone — currently not needed and `SELENA_EMERGENCY_STOP`
   stays true.

### Decisions taken on 6 September 2026

- **1 is decided: switch, and the provider is Oxylabs.** Chosen over DataForSEO
  for a reason that settles it rather than a preference: DataForSEO has no
  Perplexity scraper, only the Sonar API, which is the `API` channel; the
  Oxylabs `perplexity` source drives perplexity.ai and stays in the `VISITOR`
  channel the local plan sells. A provider that changes the channel replaces
  the surface, not the collector. (If the API channel is ever sold for
  Perplexity, it is already reachable through the approved `openrouter`
  adapter — no new provider needed.)
- **2 is half-decided: the account exists and the probe passed.** Secrets
  `OXYLABS_USERNAME`/`OXYLABS_PASSWORD` were added on 2026-09-06 and the
  `Oxylabs Perplexity probe` workflow ran once (run `34041688953`): **a visitor
  answer with sources** — 447 characters, 10 citations, 21 seconds, no wall.
  Details and the two open caveats (answer length; one run is not a
  reliability figure) are in `docs/selena-visibility/BRIGHTDATA_PERPLEXITY_AUTH_WALL.md`.
  The owner approved the adapter the same day and it is built:
  `oxylabs-perplexity` (`packages/lib/src/adapters/oxylabs-measurement-adapter.ts`),
  on the owner-approved list, registered in the worker job and in the journal
  script, routed nowhere. What is still open is the **canary spend**: run
  `measure:journal` with `SELENA_MEASUREMENT_ADAPTER=oxylabs-perplexity` and
  `OXYLABS_USERNAME`/`OXYLABS_PASSWORD` on the worker (the exact command and
  what it has to show are in the auth-wall doc). `SELENA_EMERGENCY_STOP=true`
  stays on until that run is deliberately started; the `Perplexity` visitor
  route is still `brightdata-perplexity` and changes only by a code change
  after the canary.
- **The 2026-09-04 KORA numbers in the repo were wrong** and are corrected in
  `docs/selena-visibility/KORA_CYCLE_2026-09-04_OUTCOME.md`: 16 of 30 answers
  failed, not 5 — Perplexity 8× `MALFORMED_RESPONSE`, Gemini 4×
  `SNAPSHOT_NOT_READY` plus 2× `RESPONSE_TOO_LARGE` (a size ceiling with no fix
  yet). One Perplexity row of 366 characters and zero sources was stored as
  `VALID`, `mention: false`, so "never returns an answer" holds for 2026-09-05
  but not for 09-04; whether that row is the wall in another shape is open.
  The ledger is 30 events at $0.30, all `estimated`, none `actual`.

### Decisions taken on 7 September 2026

- **The wall detector was built before the canary, not after.** The owner chose
  to close the adapter's second caveat first: a short, sourceless answer
  carrying a sign-up phrase is now `PROVIDER_AUTH_WALL`, invalid with its
  charge, instead of a VALID row. Without it the canary's "80% valid" could
  have been 25 walls. The definition is
  `looksLikeOxylabsAuthWall` in the adapter and the probe imports it, so the
  two cannot drift. Each valid row now logs its length and source count —
  `answered N chars, M sources` — which is what the canary is read against.
  `parse_status_code` is carried into that log and still not gated: 12000 is
  one observation, not the provider's code list.
- **The canary ceiling is `SELENA_JOURNAL_MAX_COST_USD=0.50`,** approved by the
  owner. KORA is 25 questions and the plan prices at $0.25 against the cost
  table's estimate, so the ceiling is double the plan rather than equal to it.
- **The canary still cannot run, for a reason that is not the credentials.**
  `measure-journal.ts` calls `assertMeasurementDeploymentApproved` at load, and
  that gate also needs `SELENA_MEASUREMENT_APPROVED_COMMIT_SHA` (40 hex,
  equal to `RAILWAY_GIT_COMMIT_SHA`) and `SELENA_MEASUREMENT_APPROVED_ENVIRONMENT`
  (equal to `RAILWAY_ENVIRONMENT_NAME`). Neither is on the staging `measure`
  service, and the whole runtime log of its last deployment
  (2026-09-06 15:20Z) is `Starting Container` then
  `JOURNAL_MEASUREMENT_DEPLOYMENT_NOT_APPROVED`. No document in this repository
  named those two variables before now; the canary runbook and the owner
  guide's journal section both carry them now, with the three refusals read as
  a diagnosis.
- **Read from the same log: the emergency stop was not what was holding.** The
  gate returns `DEPLOYMENT_NOT_APPROVED` only after passing the stop and the
  enable flag, so at that deployment `SELENA_EMERGENCY_STOP` was not `1`,
  `true` or `yes` and `SELENA_MEASUREMENT_ENABLED` was exactly `true`. The
  affirmative check is case-sensitive everywhere it is used, so `TRUE` or
  `True` in a dashboard reads as "not engaged". Confirm both values on the
  service before re-linking its source to the new repository path: the
  re-link is what restores the deploy path.

### The canary ran on 7 September 2026 and bought nothing

The owner approved the provider call and a `$0.50` ceiling; the run went out
on commit `95d304a` and returned `0 valid of 25`, cycle `STOPPED`, in four
tenths of a second. Oxylabs refused the submission with a 4xx — the only
thing that stops a Perplexity cycle — and the breaker refused the remaining
permits before they built a request, so at most six reached the provider. The
full record, including which 4xx codes are still consistent with the log, is
`docs/selena-visibility/KORA_CANARY_2026-09-07_OUTCOME.md`.

The emergency stop and the enable flag were restored immediately and
confirmed by a deployment whose log is `PROVIDER_CALLS_STOPPED`.

Two things follow, and neither is a retry:

- **The account question is answered: the Oxylabs account works.** The probe
  workflow ran again at 05:22Z (run `34086543400`) with the GitHub Actions
  secrets and returned a visitor answer in 29 s with ten citations. Nothing
  needs paying. The request code the probe and the adapter send is
  identical, and **the owner compared the Railway pair with the working one:
  identical too.** What still differs between the refused 04:23Z canary and
  the accepted 05:22Z probe is the hour (the dashboard looked freshly
  activated at 05:0xZ) and the network (Railway container against a
  Blacksmith runner). One more adapter run from Railway, on a project that is
  not held, decides it — the script now prints the reason. Details, the
  105-character answer and the published price are in the outcome record.
- **The wall detector is still unproven against live output.** No answer was
  reached, so the canary's first question is exactly where it was.
- **A repeat is blocked by the daily claim, and that is not a timer.** Two
  retries (04:47Z and 05:14Z) were refused with
  `SELENA_JOURNAL_DAILY_CLAIM_HOLD: 2026-09-07 attempt 1 is EXECUTING`. The
  45-minute rule turns a silently vanished attempt into `ABANDONED`; an
  observed failure with ledger rows is held for the owner instead, and
  `SELENA_JOURNAL_FORCE` does not pass it. **Nothing shipped can release
  it.** The recovery function returns `HOLD` for an `EXECUTING` claim without
  writing; the guard admits `EXECUTING → HOLD` but `HOLD` is terminal; and
  `sv_reconcile_journal_hold`, the only exit, refuses a claim whose runs are
  closed — its invariant counts every non-`RUNNING` run as a violation
  (`0060:497-520`), and the executor closed all 25 as `FAILED`. Until it is
  released **`korafoodhall` cannot be journaled on any day** — the unresolved
  lookup is per project, not per day — while the other projects are
  unaffected. **The release is written: migration `0065` adds
  `sv_reconcile_journal_executor_settled`**, `0060`'s sibling for the
  executor-settled shape, owner-only, same receipt. It has not been applied:
  applying it means raising `SELENA_MIGRATION_MAX_INDEX` to `65` on the
  staging `migrate` service, deploying, and then calling the function as the
  table owner with a decision reference. The reading, the readback queries,
  the rehearsal and the expected receipt are in
  `docs/selena-visibility/KORA_CANARY_2026-09-07_OUTCOME.md`.

The run also exposed a ledger defect, fixed here: a submission the provider
refused was carrying the `$0.01` estimate although no job existed to be
invoiced. A 4xx on submission now carries no cost; a 5xx and a submission
that never came back keep theirs, because a job may exist behind those. And
the journal script now prints the failure reasons it already had in hand,
which is what this canary was spent learning.

## State as of 5 September 2026

- API View has produced a real, paid measurement. Measured cost per answer:
  **$0.00171**.
- Visitor View runs for **ChatGPT and Gemini** are proven end to end. The third
  surface, **Perplexity, is blocked on Bright Data's auth wall** (see the block
  above) — that is the next thing to unblock, and it is a provider decision, not
  code.
- Free auto-dispatch of promo-code orders is built and **switched off**
  (`SELENA_FREE_AUTO_DISPATCH_ENABLED`). It stays off until Visitor View is
  healthy across the surfaces a customer's plan sells.

## Owner variables

Names only; values live in Railway. The owner guide explains each one.

| Service | Variable |
|---|---|
| worker | `SELENA_MEASUREMENT_ENABLED`, `SELENA_MEASUREMENT_ADAPTER`, `BRIGHTDATA_API_TOKEN`, `OPENROUTER_API_KEY` |
| web | `SELENA_MEASUREMENT_ENABLED`, `SELENA_PAYMENTS_ENABLED`, `SELENA_PILOT_SIGNUP_ALLOWLIST`, `SELENA_PILOT_SEAT_CAP`, `SELENA_FREE_AUTO_DISPATCH_ENABLED` |

`SELENA_MEASUREMENT_ADAPTER=brightdata` and `=auto` are **families** that route
per permit; a plain name pins one adapter for every permit and mismeasures a
multi-surface order.

## Working notes

- Migrations are never run without the owner asking.
- The owner is not a developer and works by voice. Do the work rather than
  handing back instructions; when something genuinely needs her (a Railway
  variable, a provider account), say exactly what to click and why.
