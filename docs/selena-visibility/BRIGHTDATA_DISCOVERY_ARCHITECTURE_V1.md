# Bright Data discovery architecture and operator runbook v1

**Status:** implementation foundation / owner decision pending
**Scope:** staging schema discovery only. This document does not activate provider jobs, recurring schedules, scoring, UI, tariffs, or public product claims.

## What the finished instrument is

The finished instrument is one bounded collection boundary with four replaceable
parts:

```text
operator-approved request
        |
        v
dataset registry + project policy + cost/privacy gates
        |
        v
shared BrightDataClient + shared HTTPS transport
        |
        v
provider response -> lifecycle journal -> dataset normalizer
        |
        v
sanitized fixture + hashes + capability-matrix evidence
```

The registry owns dataset-specific facts: dataset ID, input contract, collection
mode, output cap, timeout, cost estimate, privacy fields and incremental strategy.
The transport owns HTTP and bounded response handling. The client owns the
snapshot lifecycle and journal. Normalizers own the mapping from a validated
provider row to common entities. Adding a dataset must not require copying the
transport or client.

## Current implementation boundary

- `packages/lib/src/brightdata-social/registry.ts` is the single registry for the
  eight configured Social datasets.
- `packages/lib/src/brightdata-social/transport.ts` is the shared Bright Data
  HTTPS transport. Non-idempotent trigger/scrape POSTs are never retried.
- `packages/lib/src/providers/brightdata-dataset-client.ts` is the shared
  lifecycle client. It records `TRIGGERED`, `PENDING`, `READY`, `DELIVERED`,
  `TIMEOUT`, `TERMINAL_FAILURE` and `INVALID` states.
- `packages/lib/src/brightdata-social/normalizers.ts` contains dataset-specific
  response normalizers that emit common social entities.
- `apps/worker/src/scripts/brightdata-youtube-canary.ts` is a deliberately
  manual, one-shot YouTube discovery script. It is not imported by a worker,
  queue, timer or recurring job.

## Operator workflow

The normal operator flow is:

1. Select exactly one dataset and one public input URL.
2. Run the read-only preflight attestation against the isolated copy. It must
   report zero unresolved work, zero running jobs, reconciled permits/spend,
   zero provider calls and zero recurring jobs.
3. Set an explicit project policy and a cost cap. The request is rejected when
   the registry's worst-case estimate cannot fit inside the cap.
4. Execute one canary. Use synchronous `POST /datasets/v3/scrape` only when the
   registry proves `sync_scrape` (YouTube is the validated example). Otherwise
   use the registry's unvalidated async mode only after a separate approval.
5. Keep the generated report and sanitized fixture. Never retain the raw
   provider payload by default.
6. Reconcile record count and cost in Bright Usage, then update the capability
   matrix. A date-level Usage total is evidence for the bounded run, but should
   be labelled as date/cardinality reconciliation when no snapshot-level bill
   line exists.
7. Stop. Product activation is a separate decision after privacy, retention and
   workflow review.

The worker's `brightdata-youtube-retention` queue can remove only expired
temporary canary directories. It remains fail-closed unless both
`SELENA_YOUTUBE_RETENTION_ENABLED=true` and an explicit artifact root are set;
it does not delete durable metrics or provider snapshots.

The operator should only need to provide or approve the dataset, URL and cap.
The token stays in the remote worker environment and is never put in a report,
fixture, log or commit.

## What a successful run produces

Each run must produce a report containing:

- exact input contract and request policy;
- endpoint and attempt count;
- response schema and schema version;
- stable identifiers and normalized entities;
- pagination and polling lifecycle;
- latency and terminal/error status;
- estimated and Usage-reconciled actual cost;
- sanitized fixture and SHA-256 hash;
- PII classification, fields and retention recommendation.

For the completed YouTube run these artifacts are in the temporary directory
`/private/tmp/selena-brightdata-youtube-canary-20260902/`; the durable summary is
`docs/selena-visibility/ISOLATED_DB_MIGRATION_REPORT_2026-09-02.md`.

## Dataset decision order

The next recommended discovery candidate is `instagram_profiles`: one known
public profile URL, one expected row, no comments and no discovery fan-out. This
is a recommendation for the next bounded test, not an authorization to call the
provider.

| Dataset group | Current state | Reason |
|---|---|---|
| YouTube Videos | `PASS` bounded canary | Input, response, IDs, lifecycle, latency and `$0.00` dated Usage reconciliation captured |
| Instagram Profiles | Recommended next candidate | Lowest-complexity profile contract; still requires its own canary |
| Instagram Posts/Reels, TikTok Profiles/Posts, Reddit Posts | `HOLD` | No schema-discovery canary has been run |
| Instagram Comments | `BLOCKED` | Provider-enforced output cap is unproven and the payload is high-volume public user data |
| Five Google datasets | `HOLD` | Outside this Social discovery sequence; no calls made |
| Perplexity | `OUT OF SCOPE` | Existing integration; not revalidated here |

## When this becomes a product capability

Do not promote a dataset from discovery to product until all of the following
are true:

- its capability-matrix row is complete and marked `PASS`;
- cost is reconciled from first-party Usage evidence;
- PII fields have an approved minimization and retention policy;
- a workflow owner chooses Social Intelligence, Reputation or Content Visibility;
- a project policy explicitly allowlists the dataset;
- durable journal storage and tenant-isolation checks are enabled;
- a separate owner decision authorizes activation.

Until then, the instrument is a manual evidence collector, not an autonomous
scraping system. This preserves the current product boundary: no automatic
launch of all sources and no changes to scoring, UI, tariffs or public product
composition.

## Safety and stop conditions

Stop without retrying when the input, dataset ID, metadata signature, output
cardinality, cost, schema, privacy classification or lifecycle status is
unknown. An ambiguous non-idempotent POST is never retried. A provider error is
recorded as evidence; it is not converted into a successful capability row.

The isolated database and temporary artifacts are disposable infrastructure.
Deletion, pausing or promotion of that infrastructure remains a separate
owner-visible action.
