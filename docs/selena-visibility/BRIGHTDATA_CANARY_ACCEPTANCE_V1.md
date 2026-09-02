# Bright Data discovery canary acceptance

## Scope

This gate covers one isolated staging database and one YouTube Videos canary. It does not authorize live-staging recovery, recurring jobs, worker restarts, scoring, UI, pricing, or public product changes.

## Definition of Done

### 1. Isolated runtime

- The database is a new Railway service and volume, separate from live `Postgres`.
- No public database domain is enabled.
- No worker, measure, publish service, cron schedule, or provider token is attached.
- The copy has a backup/provenance manifest and a recorded service/deployment identity.
- The manifest records the backup source, capture/recovery point, archive/object identifiers, and hashes without storing credentials.
- Restore verification records database readiness plus non-PII row-count/checksum evidence; local source data is not deleted.
- Remote-copy cost remains within the approved `$3` rehearsal limit.
- Operational claim/run/permit rows from the mixed-history copy are not imported into the canary database unless separately reconciled; only the minimum organization/project seed needed for the canary is allowed.

### 2. Canonical migration proof

- The canonical runner executes the complete source sequence `0000–0055`.
- `drizzle.__drizzle_migrations` contains exactly 56 rows, indexes `0–55`, with exact source timestamps and hashes.
- The journal has no gaps, duplicates, extra rows, or unjournaled migration objects.
- No destructive operation, manual journal update, or direct SQL status correction is used.

### 3. Schema and tenant-isolation proof

- Expected tables, columns, constraints, indexes, triggers, functions, and policies from `0028–0055` are present.
- `sv_projects(id, organization_id)` is present with the expected types.
- RLS and tenant-isolation policies are verified, including forced RLS where required.
- Runtime-role privileges are read back and do not permit unintended provider or journal writes.

### 4. Canary preflight

The attestation must prove:

- `status: CLEAN`;
- zero unresolved journal claims;
- zero `RUNNING` runs;
- no ambiguous spend;
- permits reconciled;
- zero provider calls before the canary;
- zero recurring jobs.

### 5. YouTube canary

- Dataset ID: `gd_lk56epmy2i5g7lzu0k`.
- Exactly one public video URL, one attempt, one page, and at most one returned record.
- Synchronous `POST /datasets/v3/scrape`; no `/trigger` unless dataset metadata proves it is required.
- No comments, related videos, channel crawling, or automatic retry.
- Maximum cost: `$0.50`; total discovery budget remains `$5`.

### 6. Evidence package

The final report must include the exact input contract, sanitized fixture and hash, response schema/version, stable IDs, pagination/polling lifecycle, latency, terminal/error statuses, actual cost or `UNKNOWN` with reconciliation evidence, PII/privacy classification, retention recommendation, and normalized output.

## Stop conditions

Stop and return `HOLD` for any hash mismatch, schema drift, unknown operation, unknown cardinality or cost, unresolved spend, provider call outside the canary, worker/cron activity, or missing evidence.

## Final outcome

Only after all sections pass may the dataset be classified in the capability matrix. Other datasets remain unlaunched.
