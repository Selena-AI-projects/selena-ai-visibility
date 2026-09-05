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

## App-side fallback options (owner decision pending)

- Alternative Bright Data Perplexity collector/dataset.
- `Oxylabs` Perplexity solution.
- DataForSEO Sonar for the same surface.

Owner gate required before any fallback provider is wired; same approval path as
the original Bright Data wiring.