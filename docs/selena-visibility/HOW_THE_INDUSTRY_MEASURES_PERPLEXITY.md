# How AI visibility platforms actually get Perplexity data

Desk research, 2026-09-07, prompted by nine days of failing to get a Perplexity
visitor answer through two providers. The question asked was narrow: when
Ahrefs, Profound, Peec, Semrush and the rest report a Perplexity number, where
does that number come from — and is our channel the same one?

Sources are third-party unless marked. Where a figure comes from a search
summary of a vendor page rather than the page itself, it says so: the egress
proxy in this environment blocks `ahrefs.com`, `scrapfly.io` and `cloro.dev`
directly.

## The answer in one line

**They scrape the public web interface, at scale, and nobody uses Perplexity's
own API for this.** Our channel is the right one. What we lack is not a
strategy, it is a scraping vendor whose sessions Perplexity does not challenge.

## Three methods exist; the industry has settled on the first

### 1. Drive the free public UI with a browser (the dominant method)

- **Ahrefs Brand Radar** runs its question corpus "through the free, publicly
  available web interfaces to reflect typical user experiences," reportedly
  ~13.3 M Perplexity queries a month, on a 90-day reporting window, with
  questions drawn from People Also Ask and their keyword database. *(reported
  by search summary of `ahrefs.com/blog/brand-radar-methodology/`)*
- **Profound** "runs prompts through the front-end browser instead of API
  calls." *(third-party reviews, 2026)*

This is the Visitor View channel as this repository defines it, and it is what
`brightdata-perplexity` and `oxylabs-perplexity` were built to do. The
architecture is not the problem.

### 2. Buy someone else's stored corpus instead of running the queries

- **DataForSEO LLM Mentions** searches a 280M+ prompt database — but the
  brand-entity side of it spans **ChatGPT and Google AI Overviews**, not
  Perplexity. Its **LLM Responses** endpoint does cover Perplexity, and
  Perplexity there is **Live-method only**: you pay per query in real time, so
  it is not a stored corpus at all. (This repository already reads that
  endpoint — `perplexityLlmResponsesLive` in the DataForSEO registry provider
  — and it is Sonar, i.e. the API channel. *Verified in code.*)
- **Ahrefs Brand Radar API** does expose Perplexity as a `data_source`, with
  stored `response`, `links` and `search_queries`. *Verified against the live
  tool schema.* The `search_queries` field is documented as populated only for
  `chatgpt` and `perplexity`. Querying it on the account attached to this
  session returns `{"error": "Insufficient plan"}`, so the data exists and the
  subscription does not reach it.
- **OpenRush**, also attached to this session, has an `ai_visibility` domain —
  and it is **Google AI Overview only**. *Verified via
  `describe_capabilities`.* No Perplexity at all.

### 3. Use Perplexity's own Sonar API — which nobody does, correctly

Sonar is a different product from the website, not a cheaper door to it:

- The web UI runs a multi-step Pro Search pipeline (several searches, page
  fetches, cross-referencing); a `sonar-pro` API call is single-step.
- Perplexity's own community forum carries threads where the same query returns
  **materially different conclusions** from the API and the Web UI.

So a Sonar number is not what a person is shown. It is the API channel, and
this repository already reaches that channel through `openrouter` when it wants
it. The 2026-09-06 decision to reject DataForSEO Sonar on channel grounds was
correct and this research confirms it.

## Why the wall appeared — and why that is good news

**Perplexity does not require an account for basic search.** Anonymous basic
searches are unlimited on the free tier; an account is needed for Pro Search,
model switching, file upload and saved threads, none of which a visitor
measurement uses.

**The web UI sits behind Cloudflare, which challenges traffic that looks
automated.**

Put together: `error=Auth wall: sign-up prompt detected` was never Perplexity
policy applied to visitors. It is what Perplexity serves a session it has
decided is a bot. The Bright Data collector was not blocked *because it asked
without logging in* — it was blocked *because its fingerprint and IPs looked
automated*.

That reframes nine days of work. The wall is not a locked door; it is a
quality-of-proxy problem, and beating it is precisely the product these
scraper vendors sell. It also explains the shape of the Bright Data history —
two answers out of ten on 09-04, then 24 walls out of 24 on 09-05 — which is
what a rotating pool looks like as its addresses get burned.

## Corroboration that this surface is genuinely the hard one

**Semrush's AI Visibility Toolkit covers ChatGPT, AI Overviews and AI Mode —
and excludes Perplexity** in its starter offering, while Peec AI's basic plan
includes it. A vendor of Semrush's size leaving Perplexity out is the strongest
available evidence that the difficulty is in the surface, not in us.

Profound's own published citation-drift figures put Perplexity at **40.5%**
month-over-month change in cited domains — the *lowest* of the major engines
(Google AI Overviews 59.3%, ChatGPT 54.1%, Copilot 53.4%). Once the data flows,
Perplexity is the most stable surface to report on. It is worth getting.

## The vendors that sell exactly this, with real numbers

Every one of these publishes a dedicated Perplexity endpoint. Two of them are
already implemented in `packages/lib/src/providers/registry/`.

| Vendor | Endpoint / auth | Free tier | In our registry |
|---|---|---|---|
| **Cloro** | `POST https://api.cloro.dev/v1/monitor/perplexity`, `Authorization: Bearer <key>` | **500 credits/month**, then $30/mo Lite | **yes** — `cloro.ts`, task `PERPLEXITY`, `CLORO_API_KEY` |
| **Olostep** | parser `@olostep/perplexity-results` over `perplexity.ai/?q=` | **500 requests**, then $9/mo for 5 000 credits | **yes** — `olostep.ts`, 3 credits/answer, `OLOSTEP_API_KEY` — **answered 2026-09-07** |
| Oxylabs | `POST https://data.oxylabs.io/v1/queries`, Basic user+password | trial capped at $1 | yes — currently answering `401` |
| Bright Data | collector `gd_m7dhdot1vw9a7gc1n` | advertises 5K records/month free | yes — returns the wall |
| Scrapeless, Decodo, Apify | dedicated Perplexity scrapers | varies | no |

Two things stand out.

**Cloro's payload is richer than what Oxylabs gave us.** Its Perplexity
response carries `text`, `markdown`, `sources` (position, url, label,
description), `related_queries`, `citationPills` and **`search_model_queries`**
— the queries Perplexity itself ran behind the answer. Our Oxylabs probes
recorded *no web query exposed*; that field simply was not in the payload. The
same field is what Ahrefs surfaces as `search_queries`, and it is the one that
tells a client *why* they were or were not cited.

**Both free tiers are large enough to answer the reliability question without
buying anything.** A canary is 25 questions. Cloro's free 500 credits and
Olostep's free 500 requests each cover several canaries and the repeat-probe
gate on top.

Olostep was probed the same evening, on the free tier, and answered: 643
characters with 10 citations, the first Perplexity visitor answer this
repository has obtained since 2026-09-04. It cost 3 credits and confirmed the
argument above — the surface is reachable, the vendor is a commodity, and the
one already in the registry was worth trying before buying anything. Two
measured caveats are in
`BRIGHTDATA_PERPLEXITY_AUTH_WALL.md`: it took 944 seconds, and its
`search_queries` returned the prompt verbatim rather than the fan-out queries
Cloro's payload advertises. The second is the field that would tell a client
*why* they were cited, so it stays a reason to keep Cloro on the list.

## What this changes

1. **The channel decision stands.** Scraping the public UI is what the market
   does. Do not switch to Sonar and do not average it into a Visitor number.
2. **The vendor is a commodity and should be treated as one.** Five vendors
   sell this endpoint; two are already coded here; the differentiator is whose
   proxy pool Perplexity currently tolerates, and that changes month to month.
   The lesson of Bright Data (worked, then didn't) and Oxylabs (worked, then
   didn't, inside four hours) is that **no single provider should be load
   bearing**. The adapter interface already makes this cheap.
3. **The next probe costs nothing.** Cloro and Olostep both have free tiers and
   both already have registry providers. Neither needs a purchase decision to
   answer the only open question — does this vendor return a real Perplexity
   answer, twice, six hours apart.
4. **Payment is not the blocker it looked like.** Nothing in this research
   suggests a paid plan changes whether Perplexity challenges a session; it
   changes volume and concurrency. Buying the Oxylabs Micro plan to fix a `401`
   remains unjustified until Oxylabs explains the `401`.

## Sources

- <https://github.com/oxylabs/perplexity-scraper> — Oxylabs Perplexity source,
  fields, Basic auth, free trial *(fetched)*
- <https://github.com/cloro-dev/perplexity-scraper> — Cloro endpoint, Bearer
  auth, returned fields including `search_model_queries` *(fetched)*
- <https://ahrefs.com/blog/brand-radar-methodology/> — Brand Radar collection
  method and volumes *(via search summary; domain blocked here)*
- <https://cloro.dev/blog/scrape-perplexity/> — API vs web interface, Cloudflare
  on the UI *(via search summary; domain blocked here)*
- <https://scrapfly.io/blog/posts/how-to-scrape-perplexity> — three ways to
  scrape Perplexity *(via search summary; domain blocked here)*
- <https://www.tryprofound.com/blog/semrush-ai-visibility-toolkit-review> and
  <https://peec.ai/comparison/peec-vs-semrush> — engine coverage, Semrush
  excluding Perplexity
- <https://felloai.com/is-perplexity-ai-free/> — anonymous access to basic
  search without an account
- <https://community.perplexity.ai/t/perplexitypro-response-vs-sonarpro-response/1496>
  — Sonar answers differing from the web UI
- <https://docs.dataforseo.com/v3/ai_optimization-llm_responses-overview/> and
  <https://dataforseo.com/ai-optimization-api> — LLM Mentions / LLM Responses
  coverage, Perplexity Live-only
- Ahrefs Brand Radar and OpenRush tool schemas *(queried directly in session)*
