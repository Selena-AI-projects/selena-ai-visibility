# Handoff — Selena Systems measurement app

## Status on 8 September 2026

Three statements further down were true when they were written on 7 September and are not true now. They are corrected here rather than edited in place, so the earlier reading stays visible.

**The three held daily claims are released.** korafoodhall, cycle 63e3103d-4d41-4716-ba86-9dd786ef0b1c; avlibali, cycle 81037955-40ec-4931-8cca-182e58b6054c; otherbali, cycle 3ff898c1-4466-4d94-bd53-7a276005a658. All three read RECONCILED, utc_day 2026-09-07, attempt 1, cycle STOPPED 25 of 25, unfinished_runs 0. Read as postgres against staging on 2026-09-08. No owner psql call is outstanding. The same read answers a question no document had asked: otherbali carried the same executor-settled shape as the other two, so 0065 was its exit as well.

**Migration 0065 is applied.** The migrate service deployed 2026-09-07 23:59:44Z and logged: prepared 66 migrations through index 65 in bounded runtime bundle, journal before and after both 66, migrations complete, runner exit 0. The canary section below says it has not been applied. That sentence is stale.

**The Railway bindings, as they actually were.** The line further down naming worker, web and publish is wrong about publish and was already out of date about the rest.

| Service | Source before 8 September | Now |
|---|---|---|
| worker | parkourcafe, pinned at b4e678b8 | Selena-AI-projects, tracking branch head |
| web | parkourcafe, pinned at b4e678b8 | Selena-AI-projects, tracking branch head |
| publish | no source at all | unchanged, still none |
| measure | Selena-AI-projects | unchanged |
| migrate | Selena-AI-projects | unchanged |

worker and web were 89 commits and 160 files behind the branch head, not four days behind: b4e678b8 predates 31 August, and the deployments of 4 and 5 September rebuilt that same old commit. Both were moved on 8 September and now track the branch head at 4e0bd430. worker came up with every handler registered and the recurring scheduler disabled. web passed its healthcheck, and app.selenasystems.com never went down, because the previous deployment kept serving until the new one was healthy. Two deployments were created from the same commit 54 seconds apart, the source change and the variable commit each triggering one. That is the same race the canary record describes, so it is a property of this setup rather than an accident.

**The stop, and what to restore.** SELENA_EMERGENCY_STOP is true on worker, web and measure, in the lower-case form the affirmative check accepts. measure proves it behaviourally: its deployment of 2026-09-07 15:12:26Z logged PROVIDER_CALLS_STOPPED and nothing else. SELENA_MEASUREMENT_ENABLED read true on worker and web, which is not the state this file records as restored after the canary. It was set to false on both before the 8 September rollout, so the second gate is back in place. Turning it on again is an owner decision, not a cleanup step.

**A volume backup was taken before any of the above**, 2026-09-08 10:23, 467 MB, alongside PITR whose window covers the same day. The backups before it are named pre-0053, pre-0056, pre-0057-0058 and pre-0059-0060. Every earlier migration batch was preceded by a snapshot and 0065 was not.

**Both services log dead environment variables at every start.** worker names five, web names seven. Three of web's read like features somebody believes are on: SELENA_STAGING_GOOGLE_SIGN_IN_ENABLED, SELENA_STAGING_PREVIEW_ENABLED and SELENA_STAGING_MVP. The first two print a did-you-mean pointing at SELENA_STAGING_SIMULATION_ENABLED.

**The access class of the consumer surfaces is an open owner decision, and no document here has ever recorded it.** Perplexity's terms of 23 January 2026 prohibit robots, crawlers and scrapers that collect data from the service and, in the same clause, manual acts performed for that purpose; prohibit circumventing technological measures protecting the service, which is what the Cloudflare wall is; and license the service for personal, non-commercial use only. OpenAI's terms prohibit automated or programmatic extraction of data or Outputs, and circumventing rate limits or protective measures. Google's clause is narrower and conditional, prohibiting automated access that violates the machine-readable instructions on its pages, and gemini.google.com/robots.txt disallows /app/, which is the conversation surface. So the finding below that the wall is Cloudflare rather than Perplexity policy, and that the problem is therefore about proxy quality, is answered by the circumvention clause and should not be relied on. Under sections 12.1 and 24.3 this is a decision the owner takes with legal advice; it is not a fact this file can settle, and it applies to all three surfaces, not only Perplexity.


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

## Where Perplexity stands (7 September 2026, 15:33 UTC)

Read this before the history below it, which is still accurate but no longer
current.

**A third vendor answers.** `olostep` returned a visitor answer with sources —
643 characters, 10 citations — through the parser
`@olostep/perplexity-results` over `perplexity.ai/?q=`, on the same question
Bright Data failed. Run
[34137495520](https://github.com/Selena-AI-projects/selena-ai-visibility/actions/runs/34137495520).
It is not adopted: a vendor needs two passing probes at least six hours apart,
because both previous ones would have passed a single run and stopped
answering within days.

- **Bright Data** returns the sign-up wall. Not a parser bug; not fixable here.
- **Oxylabs** answers `401` from every machine since about 06:00 UTC that day,
  including the runner it served an hour earlier. Nothing was spent; the
  account holds credit. `PERPLEXITY_REVIEW_2026-09-07.md` has the evidence and
  the readings that turned out wrong.
- **Olostep** answers, slowly — 944 s for one question — and its
  `search_queries` field returns the prompt verbatim rather than real fan-out
  queries.

The route is still `brightdata-perplexity` and changes only by a code change
after a canary. `docs/selena-visibility/BRIGHTDATA_PERPLEXITY_AUTH_WALL.md`
carries the full Olostep record;
`docs/selena-visibility/HOW_THE_INDUSTRY_MEASURES_PERPLEXITY.md` explains why
scraping the public UI is the right channel and why the wall is a proxy
problem rather than a locked door.

## What works and what does not (7 September 2026)

| Part | State | Evidence |
|---|---|---|
| API View (OpenRouter) | works | a real paid measurement, $0.00171 per answer |
| Visitor View — ChatGPT | works | end-to-end run, 09-05 |
| Visitor View — Gemini | works | end-to-end run, 09-05 |
| Visitor View — Perplexity | **a vendor answers, none adopted** | run `34137495520` |
| ├ Bright Data | does not work | 24 of 24 walls, 09-05 |
| ├ Oxylabs | does not work | `401` from every machine since ~06:00Z 09-07 |
| └ Olostep | answers | 643 chars, 10 citations, 944 s |
| Perplexity canary | not possible yet | no `olostep-perplexity` adapter exists |
| Free auto-dispatch | off on purpose | `SELENA_FREE_AUTO_DISPATCH_ENABLED` |

## What this session established

Four findings that outlive it and change decisions.

**The wall is Cloudflare, not Perplexity policy.** Anonymous basic search on
perplexity.ai needs no account; the web UI sits behind Cloudflare, which
challenges traffic that looks automated. `error=Auth wall: sign-up prompt
detected` is what a session read as a bot is served, not a rule applied to
visitors. So the problem is solvable and is about proxy quality.

**The market drives the public UI with a browser; nobody uses the Sonar API
for this.** Ahrefs Brand Radar and Profound both do it that way. The channel
this repository chose is correct and should not change.
`docs/selena-visibility/HOW_THE_INDUSTRY_MEASURES_PERPLEXITY.md` carries the
sources.

**The vendor is a commodity, not a commitment.** Bright Data worked and
stopped; Oxylabs worked and stopped within four hours. Hence the rule: **two
passing probes at least six hours apart** before a provider is adopted. Both
previous vendors would have passed a single run. The probe prints the rule
itself.

**An SDK's message is not a diagnosis.** "The Olostep API rejected API key as
invalid" was printed for HTTP 402 (Payment Required) with 497 live credits in
the account. The probe now prints the status and body the transport actually
saw, with every configured credential scrubbed out of it.

## What is still open

- **The second Olostep probe** — this is the adoption gate. Actions →
  "Perplexity scraper probe" → provider `olostep`, 3 credits. Compare against
  `34137495520`: the verdict, an answer length near 643 characters, non-empty
  citations, and the elapsed time.
- **No `olostep-perplexity` adapter.** It is what stands between a probe and a
  canary. Model it on `oxylabs-measurement-adapter.ts`. Two decisions are
  known in advance: the job budget must be at least 20 minutes (the window is
  15, and the 15 min 44 s answer above would have been discarded), and
  `olostep` in `packages/lib/src/usage/cost.ts` reads `0.01` where the real
  price is $0.0054.
- **Three daily claims are held** — `korafoodhall`
  (`63e3103d-4d41-4716-ba86-9dd786ef0b1c`), `avlibali`
  (`81037955-40ec-4931-8cca-182e58b6054c`), `otherbali`
  (`3ff898c1-4466-4d94-bd53-7a276005a658`). Each blocks every future journal
  run for its project. Migration `0065` is applied and can release them; the
  function call is an owner `psql` step and has not been taken.
  `docs/selena-visibility/KORA_CANARY_2026-09-07_OUTCOME.md` has the reading.
- **Oxylabs answers `401`.** Not a blocker while Olostep answers. The account
  holds credit and nothing was spent; do not buy a plan before Oxylabs
  explains the refusal.
- **Railway `worker`, `web` and `publish` are bound to the old repository
  path** (`parkourcafe/...`). Noted early in the session and **not
  re-verified** — check before the next deploy.
- **The emergency stop** was restored (`SELENA_EMERGENCY_STOP=true`,
  `SELENA_MEASUREMENT_ENABLED=false`) after the last canary and **has not been
  re-checked since**.

Session cost: **nothing**. Olostep credits used: **6 of 500**. GitHub Actions
minutes: **none** — every runner in this repository is Blacksmith, so that
counter does not move. Merged: #153, #154, #155.

## The history — Perplexity collector returns an auth wall (5 September 2026)

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
- **The refusal is `PROVIDER_HTTP_401`.** The `avlibali` canary of 08:36Z
  printed the reason breakdown — `SELENA_ORDER_STOPPED ×19,
  PROVIDER_HTTP_401 ×6` — three hours after the probe answered, so payment,
  plan and "not yet activated" are all excluded. The credential is refused
  from Railway and accepted from a GitHub runner while both stored values
  match. Two causes of that were ours and are fixed: the adapter built the
  Basic header with UTF-8 where the working registry path uses `btoa`, and
  the journal script trimmed the credential where the registry does not.
  Both now print a credential fingerprint, so the next pair of runs either
  agrees and leaves only an account IP restriction, or disagrees and names
  which value differs.
- **That pair of runs happened, and it is the account.** The probe workflow
  was dispatched twice more on 09-07 — 09:18Z and 13:45Z, runs `34105174822`
  and `34129079327` — from the same Blacksmith runner that answered at
  05:22Z. Both printed `credential 19:13 chars, header 4f0d071cd42f`, the
  fingerprint the Railway canary prints, and both returned
  `Oxylabs job submission failed (401:)`. An IP restriction cannot refuse a
  machine it served four hours earlier, so the network reading is retired.
  The Oxylabs account served this credential at 05:22Z and refused it by
  09:18Z, and nothing of ours changed in that window. **Do not buy a plan
  until Oxylabs explains the 401** — that is what the account statistics
  (`$0 / $1`, two successful results) and these four runs are the evidence
  for. The whole review, including two Visitor-channel Perplexity providers
  the repository already ships and no decision document has weighed
  (`olostep`, `cloro`), is
  `docs/selena-visibility/PERPLEXITY_REVIEW_2026-09-07.md`.
- **The wall detector is still unproven against live output.** No answer was
  reached, so the canary's first question is exactly where it was.
- **`avlibali` is held too, by that canary.** Same shape as `korafoodhall`;
  migration `0065` releases both and is merged, not applied. Starting a
  canary from a commit whose merge also triggers a deploy races two
  containers onto the same variables — that is how this run happened at all.
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
  code. *(Superseded on 09-07: a third vendor answers. Read "Where Perplexity
  stands" and "What works and what does not" above.)*
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

`OLOSTEP_API_KEY` lives in **GitHub Actions Secrets, not Railway** — the probe
runs from Actions rather than from a service. Looking for it on a Railway
service and concluding the vendor is unconfigured is the trap that shape sets.

## Working notes

- Migrations are never run without the owner asking.
- The owner is not a developer and works by voice. Do the work rather than
  handing back instructions; when something genuinely needs her (a Railway
  variable, a provider account), say exactly what to click and why.
