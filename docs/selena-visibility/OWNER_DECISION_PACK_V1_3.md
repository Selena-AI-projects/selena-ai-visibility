# Selena AI Visibility v1.3 — owner decision pack

Decision snapshot: `2026-09-01`. Accepted runtime source:
`2d023470a618c6606e7960ee4dd1b4523dcbdcfe` on staging only.

## Executive decision

Staging core acceptance is complete for exact-head CI, backup/restore,
migrations through `0051`, non-owner runtime, RLS, API, public browser,
replay/concurrency/idempotency, web and worker lifecycle.

Overall release state remains `NO_GO` because one owner gate remains:

1. Optional paid canary plus migration `0052` authorization.

Production and PR #96 merge remain prohibited at this state.

## What is already proved

| Item | Owner-facing result |
|---|---|
| CI | Six required checks green on the deployed source SHA. |
| Backup | Fresh no-expiry backup and actual isolated restore proved. |
| Database | Migrations 0043–0051 applied; 0052 excluded. Existing data was not reset or deleted. |
| Runtime role | `selena_app` is non-owner and cannot bypass RLS or create roles/databases. |
| Tenant isolation | Hosted cross-tenant and private-column negatives passed; temporary proof rolled back. |
| Web/worker | Exact archive deployed; both services running. |
| Safety gates | Provider path off, recurring scheduler off, billing off, emergency stop on. |
| API | Scoped keys saw only their own test project; invalid key 401; fixtures removed. |
| Browser | Public home and unauth HoReCa redirect passed with zero console/page errors. |
| Replay | Concurrent duplicate produced one durable winner; replay stable; mutation blocked; cleanup passed. |
| Provider/cost | Zero provider calls and zero new cost events in the hosted loop. |

## Credentials

Owner-confirmed rotated names:

- `BRIGHTDATA`
- `OPENAI`
- `OPENROUTER`
- `RESEND`
- `GITHUB`
- staging Postgres

No values were read or printed. The working application runtime uses
`selena_app` successfully. After the owner-confirmed Postgres rotation, the
service's sealed administration binding passed a values-suppressed count-only
TCP connection check.

### OD-1 — closed

Owner rotation receipt plus `ADMIN_TCP=PASS` closes the administration
credential gate. No schema/data mutation or secret-value inspection was used.

## Runtime role and database scope

| Control | Accepted value |
|---|---|
| Runtime role | `selena_app` |
| Attributes | LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT, NOBYPASSRLS |
| Tenant context | `SET LOCAL app.organization_id` inside request transaction |
| Schema creation | Forbidden to runtime |
| Migration | Owner/migrate service only, bounded through 0051 |
| Evidence | Safe views/columns only; raw locator/hash/actor data remains private |
| Test data | Explicit staging fixtures only, with rollback or verified cleanup |
| Production DB | Prohibited |

## Provider canary

Current decision: `NOT AUTHORIZED`.

The prior provisional envelope was one `GOOGLE_AI_MODE` Bright Data call,
maximum `USD 0.25`, hard timeout 25 minutes, zero retries,
`recurring=false`. The later owner decision prohibited paid provider calls,
and migration `0052` is outside the authorized staging range. Therefore:

- calls executed: `0`
- cost incurred: `USD 0.00`
- exact first-canary price: `UNKNOWN`
- no estimate may be relabelled as an actual price

### OD-2 — optional future owner action

If the canary is still wanted, explicitly authorize in one message:

1. staging migration `0052`;
2. exactly one Bright Data `GOOGLE_AI_MODE` call;
3. maximum cost;
4. 25-minute or lower hard timeout;
5. zero retries and `recurring=false`.

Without all five, the provider path stays off.

## Authenticated browser

The public, unauthenticated and authenticated browser gates passed. The owner
signed in interactively without sharing credentials. AVLI and KORA each opened
through the project selector with correct source-only/unknown states.
Social/Travel and private provenance field names were absent from both rendered
DOM and observed JSON customer payloads; navigation and console errors were 0.

### OD-3 — closed

Authenticated owner browser acceptance completed for AVLI Bali and KORA Food
Hall. No credential or session material was retained in the evidence package.

## Timeout and retry limits

| Operation | Limit |
|---|---|
| Hosted RLS SQL proof | statement timeout 30s; lock timeout 5s; full transaction rollback |
| API/browser smoke | bounded request/navigation timeout; no provider execution |
| Worker queue | exact source queue lease remains longer than the provider deadline, but provider execution is disabled |
| Future canary | hard stop at the separately authorized limit; zero automatic retries |
| Recurring jobs | disabled, no schedule rows |

## Rollback procedure

1. Web regression: redeploy prior successful web
   `cc89f46b-b548-4216-a546-362051e98ecd`.
2. Worker regression: scale worker to zero before any other action.
3. DB/RLS regression: stop writes; restore from backup
   `9b961055-4f2e-4cb2-aae6-a348f2b4cd5f`; do not down-migrate shared staging.
4. Credential uncertainty: revoke/reissue only through official surfaces.
5. Future canary failure: stop after the single attempt, preserve journal and
   cost evidence, no retry.

## Exact owner decisions still required

| ID | Decision/action | Current default |
|---|---|---|
| OD-1 | Reconcile staging Postgres administration credential through Railway's official rotation surface | `CLOSED/PASS` |
| OD-2 | Authorize migration 0052 and one paid canary under an explicit new envelope | `DENY/HOLD` |
| OD-3 | Provide an authenticated staging browser session by signing in normally | `CLOSED/PASS` |
| OD-4 | Merge PR #96 after all required gates and a final green docs-head CI | `DENY/HOLD` |
| OD-5 | Any production deploy or production DB action | `DENY` |
