# What the KORA cycle of 2026-09-04 actually returned

The first paid cycle ran to completion: order `239c25cb`, cycle
`882f3ea3-a8e3-4dd7-a3b0-c2565fc397a5`, 30 of 30 runs terminal, status
`QC_REQUIRED`. This is what its rows hold, read over
`GET /api/v1/selena/cycles/{cycleId}/runs` rather than off a screen, so the
counts below are the ones the charge was made against.

## Per surface

| Surface | `VALID` | Reasons on the rest | Answer lengths | KORA mentioned |
|---|---:|---|---|---:|
| ChatGPT | 10 / 10 | — | 3023–7650 | 2 |
| Gemini | 4 / 10 | 4× `SNAPSHOT_NOT_READY`, 2× `RESPONSE_TOO_LARGE` | 1156–1794 | 1 |
| Perplexity | 2 / 10 | 8× `MALFORMED_RESPONSE` | 366 and 5834 | 0 |

Sixteen of the thirty answers were paid for and returned nothing usable.

## Spend

The ledger holds 30 events totalling `$0.30`, every one of them on basis
`estimated` and none on `actual`. The cycle therefore fails the acceptance
check the first-live-measurement runbook sets for itself — that the ledger
carries rows with `basis = actual`. What the account was really charged for
these thirty answers is still only reconcilable against the Bright Data
invoice.

## Three things the rows say that nothing else did

**The Perplexity failure is eight rows, not three, and the Gemini failure is
six, not two.** The counts written into the adapter's comments when the
collector window was widened came from a partial view. The window change
addresses `SNAPSHOT_NOT_READY` and nothing else, so four of the six Gemini
losses are covered by it and two are not.

**`RESPONSE_TOO_LARGE` is a second Gemini failure with no fix.** Two Gemini
snapshots exceeded the 8 MB response ceiling. That ceiling was set from
measured ChatGPT (0.97 MB) and Perplexity (2.6 MB) payloads; no Gemini payload
was ever measured, so how far past 8 MB these ran is unknown and raising the
number would be guessing.

**One of the two `VALID` Perplexity rows is not a real answer.** For *Best
breakfast places in Ubud, Bali* the row carries 366 characters and zero
sources, against 5871 characters and five sources from ChatGPT on the same
question. It was stored as `VALID` with `mention: false`, which means it
entered the metric as evidence that the brand is absent. A row like this costs
more than a refusal does: a refusal is visible, and this is not. The other
`VALID` Perplexity row (5834 characters, three sources) looks like a genuine
answer.

That last point bounds the claim in `BRIGHTDATA_PERPLEXITY_AUTH_WALL.md`. The
auth wall accounts for 24/24 syncs in the 2026-09-05 journal run, but on
2026-09-04 the same collector returned text twice out of ten. Whether the
366-character row is the wall in another shape, or the collector degraded
between the two dates, is not answerable from the rows alone.

## Still open

- Whether a `VALID` row with no sources and an answer far shorter than its
  siblings should be admissible as evidence at all, or refused the way an
  empty answer already is.
- The unmeasured size of a Gemini payload, which is what a `RESPONSE_TOO_LARGE`
  fix would have to be built on.
- Reconciling `estimated` spend against the provider invoice, which is the only
  route to an `actual` basis for this cycle.
