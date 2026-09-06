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
