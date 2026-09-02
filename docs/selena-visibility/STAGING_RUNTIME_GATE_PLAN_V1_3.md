# Selena AI Visibility v1.3 — staging/runtime gate plan

Updated after execution on `2026-09-01`. Runtime/source anchor:
`2d023470a618c6606e7960ee4dd1b4523dcbdcfe`.

## Executed gates

| Gate | Result | Evidence |
|---|---|---|
| SR-00 Exact source identity | `PASS` | Exact Git archive from `2d023470`; protected handoff excluded. |
| SR-01 Exact-head CI | `PASS` | PR #96 required checks `6/6` green. |
| SR-02 Names-only credentials | `PASS` | Owner confirmed six rotations; no values read. Application binding works and the repeated values-suppressed Postgres administration TCP probe returned `PASS`. |
| SR-03 Provider/recurring/billing containment | `PASS` | Worker logs prove provider and recurring scheduler disabled; managed schedules 0; canary/cost rows 0. |
| SR-04 Backup and isolated restore | `PASS` | Backup `9b961055…`; restored service `a34b2749…` healthy. |
| SR-05 Migrations/runtime role/RLS | `PASS` | 0043–0051 present, 0052 absent; actual `selena_app`, GUC and RLS proof passed and rolled back. |
| SR-06 Exact web/worker deploy | `PASS` | Web `7e7de294…`, worker `586b6e9a…`, both running. |
| SR-07 Zero-call fixture/API | `PASS` | Two scoped API tenants isolated; invalid key 401; fixture cleanup proved. |
| SR-08 Browser | `PASS` | Public/unauthenticated boundary plus authenticated AVLI/KORA project, Local-first state, hidden Social/Travel and sanitized payload checks passed. |
| SR-09 Replay/concurrency/idempotency | `PASS` | One concurrent winner, stable replay, cross-tenant fence, immutable active receipt, cleanup. |
| SR-10 Local Maps stability | `PASS_5_OF_5` | 73 focused tests per replay, five replays, zero calls. |
| SR-11 Paid canary | `NOT_EXECUTED/HOLD_OWNER` | Latest owner decision prohibits paid calls; 0052 is outside the migration authorization. |
| SR-12 Production/merge | `NOT_EXECUTED/NO_GO` | Production is prohibited; PR #96 remains open. |

## Runtime configuration contract

The exact staging worker was accepted only with all of these fail-closed
properties:

- `SELENA_RECURRING_JOBS_ENABLED=false`
- `SELENA_PGBOSS_RECURRING_RUNTIME_ENABLED=false`
- `SCHEDULE_MAINTENANCE_ENABLED=false`
- `SELENA_ANSWER_RETENTION_ENABLED=false`
- `SELENA_MEASUREMENT_ENABLED=false`
- `SELENA_EMERGENCY_STOP=true`
- `SELENA_PAYMENTS_ENABLED=false`
- `SELENA_FREE_AUTO_DISPATCH_ENABLED=false`
- `SCRAPE_TARGETS=stub:stub`
- `ONBOARDING_LLM_TARGET=stub:stub`
- `SELENA_PGBOSS_OWNER_MANAGED_SCHEMA=true`

This list records key names and expected non-secret booleans/fixtures only. It
does not authorize reading or publishing credential values.

## Remaining gate sequence

### G1 — Postgres administration binding (`CLOSED`)

The owner confirmed staging Postgres rotation. The follow-up count-only TCP
connection check through the service's sealed administration binding returned
`ADMIN_TCP=PASS`; no credential value was read or printed.

The working `selena_app` runtime remains unchanged and both public setup-status
endpoints continue to return HTTP 200.

### G2 — authenticated browser acceptance (`CLOSED`)

The owner signed in through the normal staging login without sharing
credentials. The reviewer verified:

1. HoReCa page loads under the intended test organization.
2. Local-first modules remain independent and preserve `UNKNOWN`/locked state.
3. Social/Travel modules are absent from DOM and customer-visible payloads.
4. API/network failures expose no raw provider locator, content hash, secret or
   cross-tenant row.

No credential or session material was sent in chat or persisted in an
acceptance artifact. Authenticated network failures and console errors were 0.

### G3 — optional paid canary

Current status: forbidden. A future owner decision must explicitly authorize:

1. migration `0052` in staging;
2. one `GOOGLE_AI_MODE` Bright Data call;
3. a hard dollar cap and timeout;
4. zero retries and `recurring=false`;
5. durable snapshot journal validation and exact post-call cost reconciliation.

Until all five are explicit, provider calls remain `0`, actual canary price is
`UNKNOWN`, and incurred cost is `USD 0.00`.

## Rollback

| Failure | Action |
|---|---|
| Web health/runtime regression | Redeploy prior web `cc89f46b-b548-4216-a546-362051e98ecd`; keep worker fail-closed. |
| Worker startup/containment regression | Scale worker to 0 immediately; do not re-enable recurring/provider paths. |
| DB/RLS regression | Stop mutations and restore isolated copy from backup `9b961055-4f2e-4cb2-aae6-a348f2b4cd5f`; do not down-migrate shared staging. |
| Credential uncertainty | Revoke/reissue through the official surface; never copy values from logs or shell output. |
| Paid canary failure, if later authorized | Stop after the single attempt, preserve 0052 journal/cost evidence, no retry. |

No automatic rollback fired during this execution because exact-head CI, web,
worker, database, RLS, API and public-browser gates passed.
