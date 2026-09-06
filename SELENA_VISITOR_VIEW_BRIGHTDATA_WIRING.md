# Wiring the Bright Data adapter for Visitor View

This note covers one adapter: `packages/lib/src/adapters/brightdata-measurement-adapter.ts`.
It is registered, owner-approved and selectable. What is still unproven is the
provider contract itself — the open questions at the bottom are answered from a
real response, not from this repository, and until they are, treat any number it
produces as unverified.

It is a companion to "Turning measurement on" in `SELENA_OWNER_OPERATING_GUIDE.md`;
nothing here replaces the gates described there.

## What Visitor View means here

Visitor View is the answer a person is shown by ChatGPT, Gemini or Perplexity —
a search-backed surface. API View is the model queried directly, with no search.
Selling one as the other is the failure this adapter is shaped to avoid, so it
accepts only `visitor_view` permits and only the three surfaces the catalog
sells (`visitorSurfaces`).

## Turning it on

1. **Put a hard spend cap on the Bright Data account itself.** It is the only
   limit that still holds if this application misbehaves.
2. **Give the worker `BRIGHTDATA_API_TOKEN`.** It is the only account-specific
   value: the endpoint and the three collector ids are defaults in the worker,
   overridable through `SELENA_BRIGHTDATA_ENDPOINT` and
   `SELENA_BRIGHTDATA_DATASET_<SURFACE>`. The endpoint must be HTTPS — the
   adapter refuses plaintext, because the token travels in a header.
3. **Set `SELENA_MEASUREMENT_ADAPTER=brightdata`** together with
   `SELENA_MEASUREMENT_ENABLED=true`. `brightdata` is a family, not an adapter:
   one instance measures one surface, and a plan that sells three needs the
   family to route each permit to the instance for the surface that permit
   authorized. See "Wiring the Bright Data adapters for Visitor View" in the
   owner guide for what a plain name does to a three-surface order.

The adapter reads the question through a tenant-scoped `resolveScenarioText` and
the brand context through `resolveExtractionContext`, both supplied by the
worker: a permit carries ids, not text, and the adapter holds no database access
on purpose.

## What the adapter does and does not do

- One permit is one POST. There is no retry and no polling loop inside it.
- The collector is named by `dataset_id` in the query string and the body
  carries the surface URL and the scenario question. The token is sent in the
  `Authorization` header and appears nowhere else — not in the body, the URL, an
  outcome, or an error string.
- The timeout never outlives the permit: the authorization window is the ceiling,
  so a call cannot return an answer nothing is allowed to record any more.
- The run row stores a reference to the answer — Bright Data's own request id
  when the payload names one, otherwise `brightdata:sha256:<digest>` — never the
  answer text.
- `costUsd` is what the provider reported when it reports a number, and the
  coarse local per-run estimate otherwise. The stored number does not say which
  it was; reconcile against the invoice rather than reading it as billed fact.
- Failure mapping: `EMPTY_RESPONSE`, `MALFORMED_RESPONSE`, `PROVIDER_ERROR_ROW`,
  `RESPONSE_TOO_LARGE` and `TIMEOUT` are INVALID; `PROVIDER_HTTP_<code>`,
  `TRANSPORT_ERROR` and `SCENARIO_TEXT_UNAVAILABLE` are FAILED. Nothing is
  quoted from the provider — error bodies can echo the token back, and run rows
  are read by more people than hold the credential.
- An unrecognized payload is `MALFORMED_RESPONSE`. It is never stringified into
  an "answer", and it is never reported as an empty answer: a shape nobody has
  read is not a measurement of a surface that said nothing.
- **Citations are parsed and carried on the outcome.** `parseBrightDataAnswer`
  returns the sources the payload actually showed — only real http(s) links
  present in the payload, deduplicated, never inferred from the answer text —
  and the adapter puts them in the outcome's top-level `sources` field
  (`runOutcomeSchema`). They travel independently of extraction: a run whose
  extraction context failed to resolve still keeps what the surface displayed.
  Extraction feeds the same sources into `measurement.citations`, which is what
  the canonical citation gap (`selena-citation-gap/1`) reads — surface-displayed
  sources, provider-named `answer.citedUrls` and text-derived domains are three
  different origins and are never pooled into one figure.

## Confirmed on a real response, 2026-08-25

The first live calls were made from CI against the account's own collectors.
What they settled:

1. **The exchange is two-legged.** `datasets/v3/scrape` waits about sixty
   seconds and then replies with `{message, snapshot_id}` — a receipt. The
   answer is collected from `datasets/v3/progress/{id}` and
   `datasets/v3/snapshot/{id}`. A run that stops at the receipt records an
   answer that was produced and billed as an unreadable payload.
2. **The answer field is `answer_text_markdown`** on both reachable surfaces.
3. **Sources are not in the same field on both.** Perplexity fills `citations`;
   ChatGPT returns `citations` empty beside a populated `search_sources`. A
   reader that stops at the first field present reports a cited answer as
   uncited.
4. **Payloads are large.** 0.97 MB from ChatGPT and 2.6 MB from Perplexity,
   because the rendered answer travels with the text.
5. **The Gemini collector id is wrong.** The account answers `dataset does not
   exist`. Its default is now empty, so the surface is not registered and the
   family is refused before a permit is claimed; supply the real id in
   `SELENA_BRIGHTDATA_DATASET_GEMINI`.

## Confirmed on the AVLI journal run, 2026-09-05

The first journal measurement (`measure-journal.ts`) answered the Perplexity open
question with a negative: **the collector returns an auth wall, not an answer.**

Every one of the 24 Perplexity snapshots came back with the same small payload —
the collector's error fields, nothing more — and the adapter's diagnostics
(`describeUnreadablePayload`) recorded them verbatim:

```
keys=timestamp,input,error,error_code error=Auth wall: sign-up prompt detected
```

What this means, and what changed because of it:

1. **The Perplexity payload is not renamed, it is refused.** There is no
   `answer_text_markdown` in any snapshot because the collector never produced an
   answer: it hit Perplexity's sign-up/authorization wall inside the collector's
   own browser session. A parser fix cannot read an answer that the provider
   never returned.
2. **The adapter now classifies these rows as `PROVIDER_ERROR_ROW`, not
   `MALFORMED_RESPONSE`.** A wall is a provider refusal, so blaming the parser
   for it would mislabel the failure and keep paying for answers the collector
   never produced (`providerErrorRowReason`, scoped to Perplexity by the
   confirmed observation).
3. **ChatGPT and Gemini are unaffected by the classification change.** Only
   Perplexity enters that branch; their error handling is unchanged.
4. **A run cycle that mixes surfaces now fails closed on Perplexity.** Because a
   non-succeeded Perplexity run stops the whole cycle, the journal run's 29 valid
   answers are ChatGPT+Gemini — the Perplexity share is the wall, not a measured
   zero. Until the collector's auth is fixable, any `brightdata-perplexity`
   number is unverified.

The right half of the fix lives at Bright Data's side (collector session /
authorization for the Perplexity surface), not in this repository. Tracked
against the account's support; the fallback options (alternative Perplexity
collector, `Oxylabs`, DataForSEO Sonar) are an owner decision gated the same way
as the original Bright Data wiring.

Of those, Oxylabs was chosen on 2026-09-06 and one live probe through its
`perplexity` source returned a visitor answer with sources. The resulting
`oxylabs-perplexity` measurement adapter (`packages/lib/src/adapters/oxylabs-measurement-adapter.ts`)
is on the owner-approved list but routed nowhere: the `Perplexity` visitor route
here stays on `brightdata-perplexity` until a canary through the new adapter
decides otherwise. `docs/selena-visibility/BRIGHTDATA_PERPLEXITY_AUTH_WALL.md`
carries the probe result and the canary procedure.

## Still open



The request body and the response field names are a **hypothesis**, taken from
the field names this repository's existing collector reads
(`packages/lib/src/providers/registry/brightdata.ts`), which were observed on the
`datasets/v3` flow — not on the endpoint this adapter posts to. Both directions
are injectable so the answers below can be pinned without editing the adapter:
pass `buildRequestBody` and `parseAnswer`.

Capture one real response per surface and confirm:

1. **Endpoint and flow.** Is there an endpoint that returns the visitor answer in
   one synchronous POST? The known chat-surface flow in this repository is
   asynchronous — trigger a snapshot, poll `datasets/v3/progress`, then fetch the
   snapshot. If that is the only flow available, this adapter's single-request
   shape is not sufficient on its own and needs a polling variant; the permit
   deadline then has to cover the whole snapshot wait.
2. **Request body shape per surface.** The collector is selected by
   `dataset_id` in the query string; the body is built per surface
   (`buildBrightDataRequestBody`) because the three collectors do not take the
   same fields. Taken from the account's own scraper pages, not from a
   successful call.
3. **Answer field**: the default reads the first non-empty string among
   `answer_text_markdown`, `answer_text`, `answer`, `response_text`, `text`,
   `content`.
4. **Whether the body is JSON at all**, and whether a single answer arrives as an
   object or as a one-element array.
5. **Sources field**: the default reads `citations`, `links_attached`, `sources`.
   Confirm the surface actually displays them, because a citation is evidence
   that the answer showed a source.
6. **Request id field**: the default reads `snapshot_id`, `request_id`,
   `response_id`, `id`. This is what makes a run auditable on Bright Data's side.
7. **Cost field**: the default reads a numeric `cost`. If Bright Data reports
   cost out of band only, every run stores the local estimate.
8. **Response size**: the default cap is 1 MiB. A visitor payload that carries the
   rendered page would exceed it and be recorded as `RESPONSE_TOO_LARGE`.

Until 1–8 are answered from a real response, treat any Visitor View number this
adapter would produce as unverified.
