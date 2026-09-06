# Perplexity collector returns an auth-wall error row, never an answer

## Summary

The account's **Perplexity** Bright Data collector (`gd_m7dhdot1vw9a7gc1n`,
dataset `brightdata-perplexity`) produced no answer at all on 2026-09-05. Every
snapshot in that day's journal run came back as the same small error row,
verbatim:

```
keys=timestamp,input,error,error_code error=Auth wall: sign-up prompt detected
```

24/24 Perplexity syncs in the run returned this; the collector's own browser
session is hitting Perplexity's sign-up/authorization wall and returning the
wall, not a visitor answer.

## What this means

- It is **not** a parsing gap on our side: there is no `answer_text_markdown` in
  any snapshot because the collector produced no answer.
- The adapter now classifies these rows as `PROVIDER_ERROR_ROW` (provider
  refusal) instead of `MALFORMED_RESPONSE`, so the failure is labeled correctly
  and does not keep paying for answers the collector never produced.
- ChatGPT and Gemini collectors on the same account work and produce answers.
- Until the collector's auth is resolvable, any `brightdata-perplexity` metric
  is unverified.
- The wall does not describe the whole history. In the paid KORA cycle of
  2026-09-04 the same collector returned text on two of ten runs, one of them a
  366-character row with no sources that was nonetheless stored as `VALID`
  evidence. `KORA_CYCLE_2026-09-04_OUTCOME.md` has those rows; whether that row
  is the wall in another shape is not answerable from them.

## Affected surface

- Perplexity Visitor View via Bright Data dataset `gd_m7dhdot1vw9a7gc1n`
- Endpoint: `https://api.brightdata.com/datasets/v3/scrape` (trigger mode)
- Symptoms: `error="Auth wall: sign-up prompt detected"`, `error_code` set,
  `timestamp`/`input` present, no answer fields.

## Asked of Bright Data

1. Why does the Perplexity collector session end up on Perplexity's
   sign-up/authorization wall?
2. Is the wall reproducible from the account's own collector page?
3. Is there a configuration (residential/desktop, authenticated session, proxy
   pool, consent mode) that fixes it, or is this a known collector limitation?
4. If not fixable: is there another Perplexity collector/dataset on the account
   that returns real visitor answers?

## App-side fallback options

The owner chose **Oxylabs** on 2026-09-06, and chose it over DataForSEO for a
reason that decides the whole question: DataForSEO has no Perplexity scraper —
its Perplexity is the Sonar API, which is the `API` channel — while the Oxylabs
`perplexity` source drives perplexity.ai itself and so stays in the `VISITOR`
channel the local plan sells. A provider that changes the channel does not
replace this collector; it replaces the surface.

Whether Oxylabs meets the same wall is an empirical question, and it is asked
first, before any adapter is written: the `Oxylabs Perplexity probe` workflow
runs `packages/lib/scripts/selena-oxylabs-perplexity-probe.ts` once, through
the provider the registry already ships, on a question the Bright Data
collector failed. Its verdict is one of: a visitor answer with sources, text
without sources, an empty answer, or the wall.

The account was created and the two secrets added on 2026-09-06, and the probe
ran once that day (Actions run `34041688953`, 15:16 UTC, on the question the
Bright Data collector failed on 09-04). **Verdict: a visitor answer with
sources.** The job took 21 seconds; the payload carried `answer_results_md`
alongside `answer_results`, `additional_results`, `related_queries`,
`parse_status_code`, `url` and `model` (`turbo`); the answer was 447
characters with 10 citations and one exposed web query. No wall, no empty
payload, no provider refusal. The raw payload is the run's
`oxylabs-perplexity-live-probe` artifact (id `9991882570`, kept until
2026-09-20); it was not committed.

Two things one run cannot settle. 447 characters is short next to the 5834 the
one genuine Bright Data Perplexity answer carried and the 5249 ChatGPT gave on
the same question — whether `answer_results_md` is the whole answer or a
list-style summary is a question for the artifact (`answer_results` against
`answer_results_md`, and the `parse_status_code` value), not for the log. And
one success on one question says the surface is reachable through this
provider; it does not say how often. Bright Data returned text on two of ten on
09-04 before returning the wall on every sync of 09-05. Reliability is what a
canary of several runs measures, and that is the adapter's first job, not the
probe's.

That verdict is the one that justifies the next step, and the next step is
still an owner decision: a measurement adapter under the same permit, cost and
evidence contract as the Bright Data one, an `oxylabs-perplexity` entry on the
owner-approved list, and a canary of several runs before any route changes —
the same approval path as the original wiring. Until that is approved and
built, the `Perplexity` visitor route stays on Bright Data and its metric stays
unverified.

Not chosen:

- DataForSEO Sonar — `API` channel; if that channel is ever sold for Perplexity
  it is already reachable through the approved `openrouter` adapter.
- Another Bright Data Perplexity dataset — none is known on the account.