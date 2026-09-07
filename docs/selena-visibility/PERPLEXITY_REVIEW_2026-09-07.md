# Perplexity Visitor View: what nine days of work established, and what it costs to keep going

Written at the owner's request after the third canary, to answer three
questions in one place: what actually happened, what is true now, and whether
the approach should change.

## The finding that reopens everything

The `Oxylabs Perplexity probe` workflow ran four times. Two succeeded and two
failed, and the two failures were not known when the day's earlier conclusions
were written:

| Run | UTC | Head | Result |
|---|---|---|---|
| [34041688953](https://github.com/Selena-AI-projects/selena-ai-visibility/actions/runs/34041688953) | 09-06 15:16 | `a7a1edc` | answer, 447 chars, 10 citations |
| [34086543400](https://github.com/Selena-AI-projects/selena-ai-visibility/actions/runs/34086543400) | 09-07 05:22 | `4d6b576` | answer, 105 chars, 10 citations |
| [34105174822](https://github.com/Selena-AI-projects/selena-ai-visibility/actions/runs/34105174822) | 09-07 09:18 | `c1ce4a1` | `Oxylabs job submission failed (401:)` |
| [34129079327](https://github.com/Selena-AI-projects/selena-ai-visibility/actions/runs/34129079327) | 09-07 13:45 | `c1ce4a1` | `Oxylabs job submission failed (401:)` |

Both failures print `credential 19:13 chars, header 4f0d071cd42f`. The Railway
canary on `otherbali` printed the same twelve hex digits. **The header the
GitHub runner sends and the header the Railway container sends are byte for
byte the same string, and both are refused.**

That retires the network reading recorded in
`KORA_CANARY_2026-09-07_OUTCOME.md`. An account-level IP restriction cannot
refuse a Blacksmith runner at 09:18Z that it served at 05:22Z. The difference
that matters is not *where the request comes from* but *when*: the same
credential, from the same machine, through the same code path, was accepted
at 05:22Z and refused at 09:18Z.

One assumption carries this: that the `OXYLABS_USERNAME` / `OXYLABS_PASSWORD`
Actions secrets were not edited between those two runs. The owner states they
were not. If that holds, nothing on our side changed and the account did.

## Chronology

**Phase 1 — Bright Data, 30 August to 5 September.**
Nine merged changes treating Perplexity as a code problem: direct scrape
instead of trigger mode, bounded runs, snapshot timeouts, queue policy,
answer-section sources, run safety, the trigger contract, the breaker's
scope, retries on an empty or malformed answer. On 09-04 a paid KORA cycle
bought 30 answers and 16 failed, Perplexity 8× `MALFORMED_RESPONSE`. On 09-05
every one of 24 Perplexity snapshots came back as the same row:
`error=Auth wall: sign-up prompt detected`. The collector had never been
returning answers; it was returning the sign-up page. Recorded in
`BRIGHTDATA_PERPLEXITY_AUTH_WALL.md`, ticket #141.

**Phase 2 — provider decision, 6 September.**
Candidates considered: another Bright Data Perplexity dataset, Oxylabs,
DataForSEO Sonar. Oxylabs chosen, correctly, on channel grounds: DataForSEO's
Perplexity is `perplexityLlmResponsesLive` — the Sonar API, the `API` channel
— while the Oxylabs `perplexity` source drives perplexity.ai and stays in
`VISITOR`. Probe passed. Adapter built and gated the same day.

**Phase 3 — canaries, 7 September.**
Three runs of `measure:journal` through `oxylabs-perplexity`, each 25
questions, each returning zero valid answers:

| UTC | Project | Cycle | Outcome |
|---|---|---|---|
| 04:23 | korafoodhall | `63e3103d-…` | 25 did not complete, reasons not printed |
| 08:36 | avlibali | `81037955-…` | `PROVIDER_HTTP_401` ×6, `SELENA_ORDER_STOPPED` ×19 |
| ~11:00 | otherbali | `3ff898c1-…` | `PROVIDER_HTTP_401` ×6, `SELENA_ORDER_STOPPED` ×19 |

Four readings were published during the day and three of them are now known
to be wrong: that the Railway credential differed from the GitHub one
(refuted by the owner's comparison, then by the matching fingerprint); that
the account had been activated between 04:23Z and 05:22Z (refuted by the
08:36Z 401, three hours after a success); that an account-level IP
restriction was the last standing explanation (refuted by the two failing
GitHub probes above). The fourth — that the Basic header encoding and the
credential trimming differed between the two paths — was true, and both are
fixed; the fingerprint that proves it is the same fingerprint that now shows
the fix did not help.

Real provider spend across all three canaries and all four probes: **zero**.
A 401 creates no job. The account dashboard agrees: `$0 / $1`, two successful
results in thirty days, which are the two successful probes.

Cost that was not zero: three journal daily claims are held (`korafoodhall`,
`avlibali`, `otherbali`), each blocking every future journal run for its
project. Migration `0065` exists and is applied for exactly this; releasing
them is an owner `psql` step that has not been taken.

## What the nine days actually established

Three things, all of them durable:

1. **Bright Data's Perplexity collector cannot serve this surface.** Nine
   changes of ours could not have fixed it; it returns a sign-up page.
2. **The Oxylabs `perplexity` source can.** Two probes returned real answers
   with ten citations each. The surface is reachable through that API.
3. **The measurement machinery around it is correct.** The permit contract,
   the breaker, the ledger, the deployment gate and the wall detector all
   behaved as designed under three consecutive failures, and the two defects
   the failures exposed — a charge attached to a refused submission, and a
   claim shape with no exit — were found and closed.

What was **not** established: that any provider can serve Perplexity
*reliably*. That is still the open question, and it is the same question it
was on 30 August.

## Three things about the approach that should change

**1. Provider validation ran after provider commitment, not before.**
On 30–31 August six pull requests fixed Bright Data code in one day, before
anyone read a raw snapshot. The wall was visible in the first payload; it was
diagnosed on 05 September. On 06–07 September a single probe justified an
adapter, a deployment gate and three canaries, and the reliability question
the probe explicitly could not answer is what killed all three. In both
phases the expensive step preceded the cheap one that would have prevented
it.

**2. The candidate list was shorter than the repository.**
The 06 September decision weighed three options. The repo already ships five
Visitor-channel Perplexity providers in `packages/lib/src/providers/registry/`:

| Provider | Perplexity path | Auth |
|---|---|---|
| `brightdata` | collector `gd_m7dhdot1vw9a7gc1n` | API token — **returns the wall** |
| `oxylabs` | `source: perplexity` | username + password — **401 since 09-07 ~06Z** |
| `olostep` | parser `@olostep/perplexity-results` over `perplexity.ai/?q=` | `OLOSTEP_API_KEY` — never tried |
| `cloro` | task type `PERPLEXITY` | `CLORO_API_KEY` — never tried |
| `dataforseo` | `perplexityLlmResponsesLive` | login+password — **wrong channel (API)** |

`olostep` and `cloro` appear in `STATUS_TARGETS` as
`perplexity:olostep:online` and `perplexity:cloro:online`, and in the env
registry as first-class credentials. Neither is named in any decision
document. Both are single-API-key providers: no proxy sub-user, no trial
cap, no account state to go stale mid-morning. They cost one adapter each —
the same day of work the Oxylabs adapter took — and one probe each to
disqualify.

**3. The cheapest experiment available was never the one that ran.**
Learning "401" cost three canaries, 75 permits, three blocked projects and a
database migration. One `curl` against `https://data.oxylabs.io/v1/queries`
from the Railway container, or one probe workflow re-run, answers the same
question in ten seconds and holds nothing. The probe workflow exists and is
free; it was run four times and two of those runs sat unread for hours while
conclusions were published without them.

## What follows

**Do not pay Oxylabs yet.** A paid plan on an account that is currently
refusing authentication buys a paid account that refuses authentication. The
$49 Micro plan is a reasonable purchase *after* Oxylabs explains the 401, not
before. The evidence to send them is unusually clean: same credential, same
code, same machine, accepted 05:22Z and refused 09:18Z and 13:45Z, and their
own statistics show two successful results and no spend.

**A provider is not adopted until a probe passes twice, at least six hours
apart.** Both Oxylabs successes and the first Bright Data answers would have
passed a single-run gate. Neither would have passed this one. The probe is
free; the canary is not.

**Perplexity gets a deadline, not an open ticket.** ChatGPT and Gemini
Visitor View work; the API channel works. Perplexity is one surface of
several, and the product can ship with it labeled *not measured* — which is
what the contract already does, since the route is still
`brightdata-perplexity` and a wall now fails closed. That label is honest and
it costs nothing to carry. What it buys is that the ninth day of Perplexity
work stops blocking everything that is not Perplexity.
