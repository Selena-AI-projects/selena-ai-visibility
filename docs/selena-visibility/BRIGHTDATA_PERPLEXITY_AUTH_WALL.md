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
characters with 10 citations. The probe's "1 web queries" line was not an
exposed query: the payload carried neither `search_queries` nor
`web_search_queries`, and the registry's reader answers that case with the
sentinel `unavailable` when citations exist, which the probe counted. No web
query was observed. No wall, no empty payload, no provider refusal. The raw payload is the run's
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

That verdict justified the next step, and the owner approved it the same day.
The `oxylabs-perplexity` measurement adapter now exists
(`packages/lib/src/adapters/oxylabs-measurement-adapter.ts`), under the same
permit, cost and evidence contract as the Bright Data one: one job per permit,
submitted, polled to `done` and fetched; the answer read off
`answer_results_md` and the displayed sources off
`additional_results.sources_results`; every post-submission outcome carrying
its charge (the cost table's estimate — the results payload names none); both
credentials scrubbed from anything stored; an unrecognized payload recorded as
`MALFORMED_RESPONSE`, an empty one as `EMPTY_RESPONSE`, a faulted job as
`JOB_FAULTED`, a job that outlives its budget as `JOB_NOT_READY` with the job
id kept for a later fetch. It is on the owner-approved list under that name
and in no routing family, so it runs only when named outright.

Since 2026-09-07 it also refuses the wall itself. A row whose text carries a
sign-up phrase, stays under 600 characters and shows no sources is recorded
`PROVIDER_AUTH_WALL` — invalid, with its charge, never an answer. Both halves
are required because either alone misreads a row: an answer about where to
sign up for a class carries the phrase, and the sign-up page carries no
citations. `looksLikeOxylabsAuthWall` is the one definition, and the probe
script imports it rather than keeping a second copy. A wall that somehow
carried a citation would still pass, which is what the per-row log below is
for.

## The canary

The Perplexity visitor route is still `brightdata-perplexity`. What decides
whether it moves is a canary through the new adapter, run where the worker
runs, by the journal script that already measures the owner's own projects:

```
SELENA_MEASUREMENT_ENABLED=true SELENA_MEASUREMENT_ADAPTER=oxylabs-perplexity \
OXYLABS_USERNAME=... OXYLABS_PASSWORD=... \
SELENA_JOURNAL_TENANT=<organization id> SELENA_JOURNAL_PROJECTS=korafoodhall \
SELENA_JOURNAL_MAX_COST_USD=0.50 \
pnpm -C apps/worker measure:journal
```

On Railway that command is the `measure` service, and the shell above is not
the whole list. The script's first act is the deployment gate, which also
needs `SELENA_MEASUREMENT_APPROVED_COMMIT_SHA` — the 40-character SHA of the
commit being deployed — and `SELENA_MEASUREMENT_APPROVED_ENVIRONMENT`, the
name of the environment, each matching the `RAILWAY_GIT_COMMIT_SHA` and
`RAILWAY_ENVIRONMENT_NAME` that Railway supplies. Without them the container
starts, prints `JOURNAL_MEASUREMENT_DEPLOYMENT_NOT_APPROVED`, exits, and buys
nothing — which is what the last `measure` deployment did on 2026-09-06.
Set them in the same staged change as the credentials and the ceiling, and
deploy that change; a variable edit alone reaches no running container. The
owner guide's "Measuring the owner's own projects on Railway" carries the full
list and reads the three refusals as a diagnosis.

Named outright, the adapter measures Perplexity alone: the script mints
permits only for the surfaces its registered adapters can honour, so no
ChatGPT or Gemini permit is paid for and then refused. The ceiling is priced
at the cost table's Oxylabs estimate because no invoice exists yet; replace
that constant with the invoiced figure once one does. KORA's set is 25
questions, so the plan prices at $0.25 and the owner's ceiling of $0.50 leaves
the run a margin rather than sitting on its own total. The script already
refuses to declare a cycle healthy below 80% valid, which is the reliability
figure the single probe could not give.

What the canary has to show before the route changes: the valid rate, the
answer lengths against the 447-character probe, and how often the sources list
is empty. The first of those means something only because a wall is now
refused rather than counted valid; the other two are logged per row, as
`answered N chars, M sources`, with the provider's `parse_status_code` when
the payload names one. That status is recorded and never gated on: 12000 is
one observation from the probe, not the provider's code list.

The invoiced price is not one of them. Oxylabs bills after the fact, so the
canary cannot produce it on the day; the ledger rows stay `estimated` until an
invoice is reconciled against them, and that reconciliation is its own step.

The route change itself is one more owner decision and one more code change —
`visitorRoutes` in `measurement-execution.ts` — not a configuration flip.

Not chosen:

- DataForSEO Sonar — `API` channel; if that channel is ever sold for Perplexity
  it is already reachable through the approved `openrouter` adapter.
- Another Bright Data Perplexity dataset — none is known on the account.
## Olostep answered where both of the others stopped

By the evening of 2026-09-07 neither chosen provider served this surface:
Bright Data returns the wall, and Oxylabs answers `401` from every machine,
including the Blacksmith runner that it had served four hours earlier
(`PERPLEXITY_REVIEW_2026-09-07.md`). A third vendor was probed because the
registry already shipped it and no decision document had ever weighed it.

`olostep` drives `perplexity.ai/?q=` through the parser
`@olostep/perplexity-results` and authenticates with one API key. Run
[34137495520](https://github.com/Selena-AI-projects/selena-ai-visibility/actions/runs/34137495520),
15:33 UTC, on the same question the Bright Data collector failed on 09-04:

```
job finished in 944s
model: perplexity
answer: 643 chars, 10 citations, 1 web queries
web queries: ["What are the best food halls in Ubud, Bali?"]
VERDICT: a visitor answer with sources — the shape an adapter can be built on.
```

643 characters against the 447 and 105 the two Oxylabs probes returned, and
the text reads as a real Perplexity answer, hedges included. The raw payload
is the run's `olostep-perplexity-live-probe` artifact (id `10025081799`,
12 759 bytes, kept until 2026-09-21); it was not committed.

Two findings come with it, and both shape the adapter rather than the
decision.

**944 seconds for one answer.** A canary is 25 questions, so even six in
flight is over an hour, and the job budget has to be at least twenty minutes:
the registry's Oxylabs constant is ten, and an answer like this would be
recorded `JOB_NOT_READY` under it. Whether 944 s is typical or an outlier is
what the second probe measures.

**The `search_queries` field carries the prompt back verbatim.** One entry,
byte for byte the question asked. `cloro.ts` already documents this as
Perplexity's habit, and the fan-out read path drops verbatim repeats — so the
field is populated but currently worth nothing, and no client promise should
rest on it until a run shows a query that differs from its prompt.

An earlier attempt the same day failed with `The Olostep API rejected API key
… as invalid` on `GET /batches/{id}` while the account held 497 of 500
credits. The key was fine: that sentence is what the client prints for **HTTP
402** without a usage flag, and 402 is Payment Required. The condition cleared
on its own within the hour and has not recurred. The probe now prints the
status and body the transport saw, so the next such message names itself.

Adoption still needs a second passing probe at least six hours after the
first — the rule exists because both previous vendors would have passed a
single run and stopped answering within days.
