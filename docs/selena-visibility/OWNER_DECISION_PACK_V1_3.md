# Selena AI Visibility v1.3 — owner decision pack

Status: `SECURITY_INCIDENT_ROTATION_AND_SOURCE_REMEDIATION_HOLD`

Original release anchor: `0e00df4faa74990e6b696c4249cbb85acf23c693`.
Current release: `7ac37f436b08f0e48c97acb61dfaee8a6458760a`, historical/rollback only.
Draft PR #96 last pushed head:
`71e5b8efa2baee416ba845852f40940ff85e2349`. Source hardening is committed
locally through `a75a9f18` but not yet pushed or CI-validated. The only
eligible future candidate is PR #96's eventual final head containing this pack,
after fresh green CI and zero unresolved P0/P1.
The owner authorized the bounded pre-production actions in this pack on
2026-08-31. Production, production DB, application recurring jobs, additional
provider calls, Social/Travel activation and a higher cost cap remain excluded.

## Recommended decision set

| Item | Proposed decision | Current status |
|---|---|---|
| Environment | Shared **staging only**; production excluded | `AUTHORIZED_CURRENT_LOOP`, subject to domain-binding HOLD |
| Runtime role | `selena_app`, non-owner, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOBYPASSRLS` | Creation authorized; web/worker switch `HOLD` until app-wide GUC proof |
| Database scope | Inspect current version first; apply only pending migrations through `0051`; use transaction-local `app.organization_id` | Authorized, but stopped at runtime-RLS condition |
| Zero-call runtime | Stub selectors, maintenance disabled, measurement disabled and emergency stop engaged | Authorized after domain/RLS gates pass |
| First dataset canary | `GOOGLE_AI_MODE` through Bright Data in `ISOLATED_CANARY`; UGC/Social remains behind privacy, retention, deletion, legal-hold and source-terms approval | `AUTHORIZED_ONLY_AFTER_SR00_SR08` |
| External calls | Exactly `1`; non-recurring; no automatic, generic, empty-result or whole-dataset retry | `AUTHORIZED_ONLY_AFTER_SR00_SR08` |
| Maximum canary cost | **USD 0.25 total** for this one canary, only when a preflight quote proves worst-case cost is at or below the cap | `AUTHORIZED_CAP` |
| Canary wall clock | Trigger `25s`; progress `20s`; download `60s`; poll `10s`; lifecycle `24m`; cancellation `10s`; total invocation below `25m` | `AUTHORIZED_LIMITS` |
| Production | No access, deploy, database, provider or scheduler action | `OUT_OF_SCOPE` |

## Execution disposition

- `OD-A`: failed its no-value condition. Railway CLI `variable list`
  unexpectedly rendered raw staging values during a key-presence audit. Values
  are not reproduced in this pack, but affected credentials are considered
  compromised and runtime acceptance is stopped pending rotation.
- `OD-B2` backup portion: executed. PITR is enabled and bucket-wired; named
  backup `92f3adae-a05a-4f64-b064-f48c55001149` exists. A PITR restore to
  `2026-08-31T13:26:46Z` completed in isolated staging service
  `33032d1f-fded-47d2-bc5e-fa907e044b52`, whose technical schema/journal
  receipt matched the expected pre-0051 state. The source stayed online; the
  rehearsal service was deleted and the restored volume is pending recoverable
  deletion. Best-effort live archiver telemetry remains `UNKNOWN`.
- Migration preflight: read-only journal is through `0042`; only `0043` through
  `0051` are pending.
- `OD-B1` runtime switch and app-wide RLS acceptance: `HOLD`. The current app
  does not consistently set transaction-local `app.organization_id`, so binding
  web/worker to `selena_app` would be unsafe.
- PR #95 merge triggered Railway Git deployment of web/worker release
  `7ac37f43` before the RLS/domain gates passed. Post-deploy journal evidence
  remained through `0042`, so pending migrations were not applied.
- Read-only ledger reconciliation found zero new permits, three VISITOR run
  rows and three estimated Bright Data cost events totalling `USD 0.030000`.
  The actual number of new external calls is `UNKNOWN`; two run rows succeeded,
  one remained ledger-`RUNNING`, and no active/created/retry `selena-measure`
  or `process-prompt` queue job remained.
- Automatic staging containment set worker emergency stop true and
  measurement/maintenance false. No selected recurring pg-boss schedule is
  present; the next read-only checkpoint found zero new permits, runs, cost
  events or active `selena-measure`/`process-prompt` queue jobs. The
  public-domain blast radius prevents an unreviewed web change. After source
  audit found legacy bypasses, the staging worker and legacy measure
  deployments were stopped. The current web key inventory lacks the master
  emergency-stop key, so direct user-triggered provider paths remain a P0 risk
  until the production-like domain is isolated or an owner-authorized rotation
  and stop configuration is deployed.
- `OD-C`: authorized but not eligible. New Google AI Mode calls remain exactly
  zero in this loop until SR-00 through SR-08 pass and the post-deploy provider
  activity is reconciled. Earlier Perplexity canaries and current VISITOR
  ledger activity keep the historical/general provider-call total `UNKNOWN`.

The approved USD 0.25 cap matches the repository's default per-audit
public-provider cap. The separate USD 5 staging-ledger ceiling is **not** spend
approval. The
13-dataset contract has no verified unit price or canary-derived timeout yet;
missing quote or timeout evidence therefore results in `HOLD`.

The current source requires a fresh sealed
`SELENA_GOOGLE_AI_MODE_CANARY_COST_PREFLIGHT_JSON`. It is non-secret
configuration, not proof by itself: its sanitized reference must bind to an
authoritative provider/account or request hard cap at or below USD 0.25. Actual
cost remains `UNKNOWN` until post-call reconciliation, so acceptance remains
`HOLD` even after a technically successful response until that receipt exists.

## Required credentials and configuration

Secret values must be stored in the platform's sealed secret store. They must
not be pasted into chat, committed, printed in logs or included in evidence.

| Purpose | Required name/access | Boundary |
|---|---|---|
| Migration connection | A staging-only DDL-capable `DATABASE_URL` used only by the one-shot migration job | Owner-controlled; Boundary B |
| Runtime connection | A distinct `DATABASE_URL` for `selena_app` | Switch only after app-wide GUC proof; Boundary B |
| Strict database trust | `SELENA_RUNTIME_DATABASE_CA_PEM` when the staging database requires a private CA; verification must remain enabled | Presence/value installation requires Boundary B |
| Sessions | `BETTER_AUTH_SECRET` | Staging secret; Boundary B |
| Stored provider credentials | `ELMO_ENCRYPTION_KEY`; `ELMO_ENCRYPTION_KEY_OLD` only during an approved rotation | Staging secret; Boundary B |
| Application origins | `APP_URL`, `VITE_APP_URL`, optional `AUTH_TRUSTED_ORIGINS` | Configuration, not credentials; Boundary B |
| Bright Data canary | `BRIGHTDATA_API_TOKEN` plus `SELENA_BRIGHTDATA_DATASET_GOOGLE_AI` for the approved source | Use only after the Boundary C eligibility gates pass |
| Canary policy | `SELENA_GOOGLE_AI_MODE_CANARY_ORGANIZATION_ID`, owner/redaction approval flags, one-record input and fresh `SELENA_GOOGLE_AI_MODE_CANARY_COST_PREFLIGHT_JSON` | Non-secret sealed configuration; hard-cap reference must be independently verified |
| Platform operator | Existing staging platform access capable of reading metadata and, separately, changing services/secrets | Read-only access is Boundary A; mutation is Boundary B |

Any auth, database, provider, email or encryption credentials rendered by the
failed key-presence audit must be rotated before runtime acceptance. Auth-secret
rotation invalidates sessions; database rotation requires coordinated runtime
binding; provider/email keys require external revocation and replacement; an
encryption-key rotation requires an explicit old/new migration procedure.
Private certificate/key credentials in the affected configuration scope must be
rotated as secrets. Public CA certificates and certificate provenance should be
reviewed separately; public certificate material is not automatically treated
as a private credential.
These actions may affect `app.selenasystems.com` and therefore require explicit
owner approval for production-impacting credential work.

`OPENROUTER_API_KEY`, payment credentials, Social OAuth credentials and
production secrets are not required for the recommended dataset canary and must
not be added under this decision.

## Runtime role and database scope

The runtime role must be created only after owner-run migrations through `0051`
and through an idempotent script with explicit least-privilege grants. The
schema-wide CRUD/default-grant version was rejected by formal security review.
`sv_evidence_provenance`, raw snapshot locators/provider references/payloads
and `content_sha256` must remain unavailable to `selena_app`.

The `selena_app` connection must not be activated until all request paths that
touch tenant data run inside a transaction that executes:

```sql
select set_config('app.organization_id', <authenticated organization id>, true);
```

Required proof is one same-tenant positive case plus cross-tenant read and write
denials using the non-owner role. An owner/table-owner connection is not valid
RLS evidence. If the GUC is absent, empty tenant results are safe but constitute
an outage; the runtime connection switch remains `HOLD`.

Database authorization is limited to the named staging database. The migration
job may apply only migrations shown as pending by a read-only version check,
ending at `0051`. No production database, destructive down migration or schema
outside the reviewed chain is included.

## Canary limits

- One provider: Bright Data.
- One source: owner-confirmed `GOOGLE_AI_MODE`; selecting a different source is
  a new decision.
- One input record and one provider call; `schemaDiscoveryOnly=true` and
  `recurring=false`.
- Retry count for this canary: **zero**. The contract's later runtime ceiling of
  three ledger-controlled attempts is not permission to retry this canary.
- Generic queue retry, empty-result retry and whole-dataset retry: disabled.
- Hard cost cap: USD 0.25; the preflight worst-case quote must be known and must
  not exceed the cap.
- Hard wall-clock cap: 25 minutes. Source limits are 25 seconds for trigger,
  20 seconds for progress, 60 seconds for download, 10-second polling,
  24-minute lifecycle and 10-second cancellation, for a maximum invocation of
  24 minutes 10 seconds.
- Timeout, ambiguous submission, provider 5xx, rate limit, malformed response
  or missing cost reconciliation ends the authorization in `HOLD`; no second
  call is allowed.
- Raw response remains private and immutable. It cannot change scoring, UI
  availability, tariffs or public claims until schema and policy gates pass.

If the owner prefers a UGC-first canary such as `REDDIT_POSTS`, that requires a
separate source decision plus approved privacy, retention, deletion
propagation, legal-hold and source-terms policies before the call. Social is not
interchangeable with the recommended Google canary.

## Rollback and stop procedure

1. Before any database mutation, record a staging backup/PITR checkpoint or use
   a disposable replacement database and verify who owns restoration.
2. Run migrations through `0051` as a one-shot owner job with restart policy
   `NEVER`, then apply idempotent least-privilege `selena_app` grants. On failure,
   do not deploy web or worker; preserve logs and restore the checkpoint or
   replace the staging database. Do not improvise destructive down migrations.
3. Retain the prior immutable web/worker image and prior runtime connection
   secret version. On boot or RLS failure, engage `SELENA_EMERGENCY_STOP`, keep
   `SCHEDULE_MAINTENANCE_ENABLED=false`, disable measurement, drain/cancel the
   named staging cohort, verify `active/queued=0`, and restore the prior images
   and connection.
4. A provider call cannot be rolled back. On timeout or ambiguous completion,
   preserve the provider receipt, open the circuit/hold, reconcile the provider
   account and cost ledger, and do not retry.
5. Every restore, secret switch, service restart, job cancellation or rollback
   deployment is an infrastructure mutation. The current loop explicitly
   covers automatic staging rollback; production rollback remains prohibited.

## Owner decision IDs and current boundaries

| Decision ID | Authorized action or remaining boundary |
|---|---|
| OD-A | Read shared staging deployment metadata, bounded logs and configuration **key presence only**; never read secret values. |
| OD-B1 | After OD-B2, create/update `selena_app` through the reviewed idempotent least-privilege grant script; do not use schema-wide CRUD/default grants. |
| OD-B2 | Take/verify the staging backup checkpoint and run the one-shot pending migration chain through `0051` as owner before OD-B1. |
| OD-B3 | Change staging secret/config bindings, including runtime `DATABASE_URL`, CA, auth/encryption keys, stub/stop flags and application origins. |
| OD-B4 | Deploy/restart only PR #96's final head containing this pack after fresh green CI and the remaining staging gates; `0e00df4f` and `7ac37f43` are historical/rollback evidence, not fix candidates. |
| OD-B5 | Create staging fixture rows and run browser/API/RLS acceptance that mutates the staging database. |
| OD-C | Inject `BRIGHTDATA_API_TOKEN` and the approved dataset ID, then execute one isolated provider call with the confirmed USD 0.25 and 25-minute caps. |
| OD-R | Execute the rollback/restore procedure, including environment changes, job cancellation, service restart or image rollback. |
| OD-S | Rotate/revoke the credentials exposed by the failed staging key-presence audit, coordinate session/database/encryption migrations, and verify replacement key presence without printing values. Because the current web serves `app.selenasystems.com`, this requires separate production-impact permission. |
| OD-P | Any production access, production database, billing change, recurring schedule or production deploy. This remains outside the pack. |

OD-A, OD-B1 through OD-B5, OD-C and automatic staging rollback are authorized
for this bounded loop, but their ordered gate conditions still apply. The
current credential-rotation, domain-binding, runtime-RLS and provider-activity
findings stop OD-B1/B3/B4/B5 and OD-C; authorization is not a PASS. Backup
restoreability itself is now proven. OD-S and OD-P are never implied and remain
separately gated.
