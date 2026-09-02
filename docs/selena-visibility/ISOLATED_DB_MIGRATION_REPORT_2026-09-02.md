# Isolated staging database migration report

**Date:** 2026-09-02
**Scope:** fresh isolated Railway Postgres migration/seed plus the separately approved one-shot YouTube canary; no live staging mutation, worker start or recurring job.

## Environment

- Railway project: `selena-ai-visibility` (`51dd0770-e622-4734-a705-ace401234bb8`)
- Environment: `staging` (`90f3bf7f-5e53-4de3-a3f7-56052b706f24`)
- Isolated service: `canary-clean-20260902` (`bb4c60d1-9529-4de1-8792-075d195199cf`)
- Attached volume: `canary-clean-20260902-data` (`5f07fe03-716d-4808-b245-e5177cde8740`)
- No public domain was created. The service has no provider-token variable names and no cron schedule.

## Migration result

The canonical bounded runner was executed with `SELENA_MIGRATION_MAX_INDEX=55` against the empty database. It prepared 56 migrations and exited with code 0.

- Journal rows: **56**
- First `created_at`: `1770853000310`
- Last `created_at`: `1787940017000` (`0055`)
- Local canonical journal/hash comparison: **exact match**
- Unjournaled or partially applied migrations observed: **0**
- Operational rows imported from another database: **0**

The journal was not edited, migrations were not skipped, and no manual constraint was added.

## Schema and isolation checks

Read-only catalog checks after migration found:

- `sv_projects(id uuid, organization_id text)` exists; `organization_id` is `NOT NULL` and references `organization(id)`.
- `sv_projects`: RLS enabled with `tenant_isolation` policy (`ALL`).
- Public relations: 81 RLS-enabled tables, 70 policies, 288 indexes, 38 non-internal triggers, 30 functions.
- Database session role observed during the audit: `postgres` (superuser), which is expected for migration administration and is not an application-runtime acceptance claim.

The service configuration contains only Postgres/Railway connection variables; no Bright Data, Google, YouTube, TikTok, Reddit, Perplexity, worker, or scheduler credentials were present by variable name.

## Minimum synthetic seed

Only synthetic tenant/project rows were created in one transaction:

- Organization ID: `canary-clean-20260902-org`
- Organization slug: `bright-data-canary-isolated`
- Project ID: `c9c0b1f6-d0ec-40ad-b471-7a30c19cc532`
- Project name: `YouTube Canary Isolated`
- Project status: `DRAFT`

The following remain empty: `sv_runs`, `sv_run_permits`, `sv_cost_events`, `sv_journal_daily_claims`, `sv_provider_dataset_snapshot_events`, `sv_provider_dataset_capabilities`, and `sv_audit_events` (zero rows each).

## Gate

**Migration/seed status: PASS.** The isolated database was ready for the separately bounded canary preflight. Provider cost before the canary was `$0`; database hosting cost was not measured (`UNKNOWN`).

## YouTube canary result

The approved one-shot canary ran after an automatically generated, read-only `CLEAN` attestation. No other dataset was called.

- Dataset: `gd_lk56epmy2i5g7lzu0k` (`YOUTUBE_VIDEOS`)
- Input: one public URL, `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Request: synchronous `POST /datasets/v3/scrape`, one attempt
- Cardinality: one response record, one page; comments/related/channel crawling disabled
- Terminal status: `COMPLETE`; no error response
- Latency: `35889.259834 ms`
- Snapshot reference: `sync_c185124a41054595365e524174a718b683a7e8b1cacc066a755ad5a32d19ab6e`
- Bright Data snapshot-list evidence: `sd_mtjq4hom1da1pooe7q`, `ready`, `dataset_size=1` (created `2026-09-02T06:37:14.758Z`)
- Lifecycle: `TRIGGERED` → `DELIVERED` with `recordCount=1` (no polling required)
- Stable IDs observed: `video_id`/`shortcode` (`dQw4w9WgXcQ`); channel `youtuber_id` (`UCuAXFkgsw1L7xaCfnd5JJOw`)
- Normalized entities observed in the canary: `social_actor`, `social_content`, `engagement_snapshot`, `media_asset`; the owner-approved durable projection now excludes `media_asset` and personal text.
- Sanitized fixture hash: `sha256:3a506519e22d1403de1601f84d4846b9cfe284ab66384d434af607191a51386d`
- Raw content hash: `sha256:b2fa2e7c16351c8302f8a566274975530d1ff124766b326adbc54efd39cf5c30`
- Sanitized fixture and full response report: `/private/tmp/selena-brightdata-youtube-canary-20260902/` (not committed; raw retention remains disabled)
- PII/privacy: classified as `public_user_data`; youtuber/channel identity, title, description, transcript and comments fields are privacy-sensitive. The response also contains recommended-video URLs and a signed `video_url`. The owner-approved policy forbids durable raw/signed-URL/comment/transcript retention; technical enforcement remains a pilot gate. See [YouTube privacy and retention decision v1](BRIGHTDATA_YOUTUBE_PRIVACY_RETENTION_DECISION_V1.md).
- Estimated cost: `$0.0015`; actual Bright Data billed cost: `$0.00`. Bright Usage's cost table shows `2026-09-02` Web Scraper API cost `$0.00` with one record; the owner-supplied CSV has SHA-256 `3f68c9d874dc259bc513bbf76a058dce5dc1aa2c7cc9776701e124288281d618`.

### Usage export supplied by owner

`breakdown (3).csv` reports one Web Scraper API record on `2026-09-02` (and 36 records total across the two listed days). Bright Usage's cost table independently shows `$0.00` for Web Scraper API on that date; the preceding `2026-09-01` cost of `$0.05` is outside this canary window. The export contains no snapshot ID, so the date/cardinality match is the reconciliation evidence rather than a per-snapshot billing line item.

## Scoped capability matrix

| Dataset | Intended workflow | Input validated | Response validated | Stable ID | Pagination | Normalized entities | Raw retention | Estimated cost | Recommendation |
|---|---|---|---|---|---|---|---|---:|---|
| YouTube Videos (`gd_lk56epmy2i5g7lzu0k`) | Content Visibility | PASS: one `url` | PASS: one record; full schema captured in report artifact | `video_id`, `shortcode`; channel `youtuber_id` | None observed | Actor, content, engagement snapshot, media asset | Disabled; temporary sanitized fixture only | `$0.0015` estimate; `$0.00` actual | PASS for bounded canary; pilot candidate only after privacy/architecture review |
| Other 7 social datasets | Social Intelligence / Reputation (to be decided) | NOT RUN | NOT RUN | NOT VALIDATED | NOT VALIDATED | NOT RUN | Registry only | UNKNOWN | HOLD; no calls made |
| 5 Google datasets | To be decided | NOT RUN | NOT RUN | NOT VALIDATED | NOT VALIDATED | NOT RUN | Registry only | UNKNOWN | HOLD; no calls made |
| Perplexity | Existing visibility workflow | OUT OF SCOPE | OUT OF SCOPE | Existing integration not revalidated here | OUT OF SCOPE | OUT OF SCOPE | Existing policy unchanged | UNKNOWN | HOLD; no calls made |

**Overall canary decision: `PASS` (bounded technical canary).** The transport, input, response, IDs, cardinality, latency and dated Bright Usage cost reconciliation are validated within the `$0.50` cap. Activation, scoring, UI, tariffs, public product composition and all other datasets remain unchanged. Durable raw retention remains disabled; privacy/architecture review is still required before any pilot activation.

## Final acceptance follow-up

The post-canary runtime reconciliation was completed on 2026-09-02 without a
provider call:

- Live staging worker deployment `587c496c-3862-4bde-a558-5d4245d1cb46` is
  `SUCCESS`; startup reached `pg-boss started`, queue creation, handler
  registration and `worker is ready` with no subsequent pg-boss errors.
- The only runtime drift found was service-owned `pgboss` ACLs. The owner-run
  provisioning contract now grants `selena_app` queue-maintenance DML while
  preserving database ownership; the contract is recorded in commit
  `651c7e60be11a6fef87cd63aec6a098a60b8be97`.
- The same provisioning block was applied to the isolated restored copy and
  verified with a transactionally rolled-back `selena_app` runtime smoke. The
  migration journal remained unchanged at 56 entries through `0055`.
- No scoring, UI, tariff, public-product, automatic source activation or
  migration-journal edits were introduced. The canary script remains manual and
  is not imported by the worker startup path.
- Targeted Bright Data/lib tests passed (`39/39`); worker typecheck and build
  passed. The repository is clean and the branch is pushed to `origin`.

**Final technical acceptance: `PASS`.** The bounded YouTube discovery evidence
and runtime prerequisites are complete. **Product activation remains
`HOLD_FOR_PILOT`** until the separately approved privacy-enforcement and
workflow decision is made; all other datasets remain unlaunched.
