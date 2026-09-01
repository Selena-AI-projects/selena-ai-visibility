# Selena AI Visibility v1.3 — owner decision pack

Status: `LOCAL_CANDIDATE_READY_ROTATION_OWNER_CONFIRMED_HOSTED_RLS_PROVIDER_HOLD`

Original release anchor: `0e00df4faa74990e6b696c4249cbb85acf23c693`.
Current release integrated: `9e1e993090fb6ef133b147b5341f2ff8591ade6c`.
Historical release `7ac37f43` remains rollback evidence only. Draft PR #96
last pushed/green anchor is `9f387cad47211c2a3d5b6970ecc826c27800edcc`.
The current local candidate is
`2673bcf56639eea113f5e557bba5e55c79da2e4b`, tree
`4f979e26b7fb38ff4b6c192e303b7fda0c5f3e59`; push and exact-head CI are
pending and no hosted acceptance is claimed.
Earlier exact head `01aa9d0c` passed all six required checks. Source readiness does not close staging runtime
gates or make this a production candidate.
The owner authorized the bounded pre-production actions in this pack on
2026-08-31. Production, production DB, application recurring jobs, additional
provider calls, Social/Travel activation and a higher cost cap remain excluded.
On 2026-09-01 the owner superseded the earlier transfer direction: current
Railway staging is the approved public pre-launch runtime, both existing public
domains remain attached, and no production web may be created. Existing
production Postgres remains untouched. The owner confirmed `BRIGHTDATA`,
`OPENAI`, `OPENROUTER`, `RESEND`, `GITHUB` and staging Postgres rotated after
the unsafe output. No values were read; active hosted bindings still require a
names-only verification receipt.

## Recommended decision set

| Item | Proposed decision | Current status |
|---|---|---|
| Environment | Shared **staging only**; production excluded | `AUTHORIZED_CURRENT_LOOP`; both public domains intentionally remain on staging |
| Runtime role | `selena_app`, non-owner, `NOINHERIT`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOBYPASSRLS` | Creation authorized; web/worker switch `HOLD` until app-wide GUC proof |
| Database scope | Inspect current version first; apply only pending migrations through `0051`; seal `SELENA_MIGRATION_MAX_INDEX=51`; use transaction-local `app.organization_id` | Authorized after final exact-head/config freshness checks; source `0052` is excluded |
| Zero-call runtime | Stub selectors, maintenance disabled, measurement disabled and emergency stop engaged | Staged without redeploy; activation waits for active-binding and hosted RLS gates |
| First dataset canary | `GOOGLE_AI_MODE` through Bright Data in `ISOLATED_CANARY`; UGC/Social remains behind privacy, retention, deletion, legal-hold and source-terms approval | `AUTHORIZED_ONLY_AFTER_SR00_SR08` |
| External calls | Exactly `1`; non-recurring; no automatic, generic, empty-result or whole-dataset retry | `AUTHORIZED_ONLY_AFTER_SR00_SR08` |
| Maximum canary cost | **USD 0.25 total** for this one canary, only when a preflight quote proves worst-case cost is at or below the cap | `AUTHORIZED_CAP` |
| Canary wall clock | Trigger `25s`; progress `20s`; download `60s`; poll `10s`; lifecycle `24m`; cancellation `10s`; total invocation below `25m` | `AUTHORIZED_LIMITS` |
| Production | No access, deploy, database, provider or scheduler action | `OUT_OF_SCOPE` |

## Execution disposition

- PR #96 historical exact-head CI: `PASS`. Build, E2E integration, scheduling policy,
  deployment smoke, license and CLA all succeeded on `9f387cad`. Current local
  candidate `2673bcf5` is not CI-green until the next push completes. The earlier
  pre-runner billing/admission rejection is historical and no longer blocks the
  loop.
- Release source contains migration `0052` for the provider snapshot journal,
  but the owner authorized staging only through `0051`. The packaged migration
  runner now requires an explicit maximum index; staging must seal it to `51`
  and the generated bundle must exclude `0052`. The provider canary depends on
  the `0052` journal and therefore needs a separate owner decision or another
  approved durable journal path.
- Staging `migrate` now has names-only confirmation that
  `SELENA_MIGRATION_MAX_INDEX` was set with `skip-deploys` to the approved
  upper bound `51`. No deployment or SQL followed; the last deployment remains
  the prior `273488fd` image, `CRASHED`, with restart policy `NEVER`.
- Historical `OD-A` no-value condition failed. Railway CLI `variable list`
  unexpectedly rendered raw staging values during a key-presence audit. Values
  are not reproduced in this pack, but affected credentials are considered
  compromised. Owner-confirmed rotations now close the revoke/reissue item;
  runtime acceptance still waits for names-only active-binding verification.
- `OD-S` domain portion is complete by owner decision: both public domains
  remain attached to staging and no transfer is planned. Railway `production`
  has no web destination; its existing PostgreSQL service remains untouched.
  A previously rendered Railway domain verification token is not reproduced
  and remains exposed operational metadata requiring platform revalidation if
  supported.
- Latest pre-mutation checkpoint: backup
  `6907fadf-d73b-49fd-b052-11715c5daabf` has no expiry. PITR restored target
  `2026-09-01T01:33:02Z` into isolated staging service `a34b2749…`; deployment
  `7c2c1261…` is `SUCCESS`, and read-only SQL matches the source at 43 journal
  rows through `0042`, with no `0051` table or `selena_app` role. The source
  remained online and unchanged. The isolated restore remains available as
  inspectable evidence.
- `OD-B2` backup portion: executed. PITR is enabled and bucket-wired; named
  backup `92f3adae-a05a-4f64-b064-f48c55001149` exists. A PITR restore to
  `2026-08-31T13:26:46Z` completed in isolated staging service
  `33032d1f-fded-47d2-bc5e-fa907e044b52`, whose technical schema/journal
  receipt matched the expected pre-0051 state. The source stayed online; the
  rehearsal service was deleted and the restored volume is pending recoverable
  deletion. The post-CI read-only list reconfirmed the named backup with no
  expiry and `live.available=true`; best-effort live coverage and archiver
  probes still return exit 10, so live WAL telemetry remains `UNKNOWN`.
- Migration preflight refresh: read-only staging SQL reports 43 rows with latest
  timestamp `1787940004000`, matching `0042`; `0043` through `0051` remain
  pending. Catalog lookup reports `selena_app=ABSENT`. The transaction rolled
  back and made no mutation.
- `OD-B1` runtime switch and app-wide RLS acceptance: `HOLD`. Reviewed source
  and disposable proofs cover transaction-local `app.organization_id` and the
  report bootstrap, but hosted role attributes and actual non-owner same/cross-
  tenant behavior remain unverified. Binding web/worker to `selena_app` before
  that proof would be unsafe.
- PR #95 merge triggered Railway Git deployment of web/worker release
  `7ac37f43` before the RLS/domain gates passed. Post-deploy journal evidence
  remained through `0042`, so pending migrations were not applied.
- Railway Git integration earlier auto-deployed release `32945b27`. Web
  deployment `3eefbf4a…` is running and still serves both the production-like
  and staging domains. Migration deployment `2b092c4c…` crashed while Corepack
  attempted a runtime pnpm download. Worker deployment `c50d857e…` reached
  ready with maintenance disabled, but the master stop and measurement values
  could not be proven safely. The authorized rollback path stopped it; latest
  worker marker `5adf69b9…` has `deploymentStopped=true`. No web, database,
  provider or billing mutation was performed during this containment.
- Railway Git integration subsequently auto-deployed current release
  `73446168`. Web deployment `51e00af1…` is running. Worker and publish were
  re-contained to `REMOVED`; measure and migrate are `CRASHED`. The current
  migration image invoked its binary directly without a Corepack download, but
  read-only SQL after the attempt proves no migration was applied.
- Read-only ledger reconciliation found zero new permits, three VISITOR run
  rows and three estimated Bright Data cost events totalling `USD 0.030000`.
  The actual number of new external calls is `UNKNOWN`; two run rows succeeded,
  one remained ledger-`RUNNING`, and no active/created/retry `selena-measure`
  or `process-prompt` queue job remained.
- Automatic staging containment stopped worker/publish. Zero-call,
  no-recurring and billing-off configuration is staged with no redeploy; it is
  not claimed active on the current web image. No selected recurring pg-boss schedule is
  present; the next read-only checkpoint found zero new permits, runs, cost
  events or active `selena-measure`/`process-prompt` queue jobs. The
  public-domain blast radius prevents an unreviewed web change. After source
  audit found legacy bypasses, the staging worker and legacy measure
  deployments were stopped. External rotation is owner-confirmed complete;
  direct user-triggered provider paths remain a P0 runtime risk until the
  rotated bindings and staged stop configuration are verified active on the
  accepted deployment.
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

### Names-only affected credential inventory

Railway OAuth reported `valuesRedacted=true` for every inventory response. No
value was read. Conservatively affected names from the earlier unsafe output
scope are:

| Staging service | Credential names only |
|---|---|
| web | `BETTER_AUTH_SECRET`, `DATABASE_URL`, `ELMO_ENCRYPTION_KEY`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`, `SELENA_RUNTIME_DATABASE_CA_PEM` |
| worker | `BETTER_AUTH_SECRET`, `BRIGHTDATA_API_TOKEN`, `DATABASE_URL`, `ELMO_ENCRYPTION_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `SELENA_RUNTIME_DATABASE_CA_PEM` |
| migrate | `DATABASE_URL` |
| measure | `BRIGHTDATA_API_TOKEN`, `DATABASE_URL`, `GITHUB_TOKEN`, `OPENROUTER_API_KEY` |
| publish | `DATABASE_URL`, `GITHUB_TOKEN` |
| Postgres | `DATABASE_URL`, `PGPASSWORD`, `POSTGRES_PASSWORD`, `WAL_ARCHIVE_KEY`, `WAL_ARCHIVE_SECRET` |
| domain metadata | Railway domain verification token previously rendered by the platform; value not retained or reproduced |

Dataset IDs, origins, feature flags and Railway identity variables are tracked
as configuration names, not credentials. Database-stored provider overrides
remain a separate encrypted scope and cannot be declared rotated from this
environment inventory alone.

Names-only SQL found no rows in the encrypted `secrets` override table.
`BETTER_AUTH_SECRET` and `ELMO_ENCRYPTION_KEY` were therefore rotated for web
and worker through sealed stdin without retaining or displaying either value;
`skipDeploys=true` kept the stopped worker stopped. The current running web
does not use those staged versions until the accepted deploy. The following
non-secret containment settings are also staged on web/worker without deploy:
`SELENA_EMERGENCY_STOP=true`, `SELENA_MEASUREMENT_ENABLED=false`,
`SCHEDULE_MAINTENANCE_ENABLED=false`,
`SELENA_FREE_AUTO_DISPATCH_ENABLED=false`, `SELENA_PAYMENTS_ENABLED=false`,
`SCRAPE_TARGETS=stub:stub`, `ONBOARDING_LLM_TARGET=stub:stub`. Measure is staged
with emergency stop, measurement disabled and journal force disabled.

Fresh backup `6907fadf-d73b-49fd-b052-11715c5daabf` and isolated restore
service `a34b2749-130a-47f3-8da3-8f58e3775fe9` close the backup/restore
precondition. Restore deployment `7c2c1261-b879-41af-b0cd-510a231020f9` is
`SUCCESS`; the promoted copy matches 43 journal rows through `0042` and has no
`0051` table or `selena_app`. The source remained online and unchanged.

### External owner rotation receipt — complete, values undisclosed

The owner confirmed that `BRIGHTDATA`, `OPENAI`, `OPENROUTER`, `RESEND`,
`GITHUB` and staging Postgres were rotated after the unsafe output. This is the
required names-only confirmation; no replacement value is stored in this
repository or evidence pack. Before staging SQL, the orchestrator must only
verify key presence/key-version binding through a values-redacted platform
surface and re-run the read-only journal/configuration checkpoint. A missing or
stale service binding returns the loop to `HOLD`; it does not authorize reading
the value or rotating a second time.

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

That production-impacting approval is now present. Railway OAuth produced a
names-only inventory with `valuesRedacted=true`, and read-only SQL found no
database-stored provider overrides. `BETTER_AUTH_SECRET` and
`ELMO_ENCRYPTION_KEY` were rotated through sealed stdin and staged without
redeploy. The owner subsequently confirmed Bright Data, OpenAI, OpenRouter,
Resend, GitHub and staging Postgres rotations complete. Active service binding
is not inferred from that confirmation and remains a names-only pre-SQL check.

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
2. Seal `SELENA_MIGRATION_MAX_INDEX=51`, prove the generated migration bundle
   ends at `0051` and excludes source migration `0052`, then run it as a
   one-shot owner job with restart policy `NEVER`. Apply idempotent
   least-privilege `selena_app` grants only afterward. On failure,
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
| OD-B4 | Deploy/restart only the final exact CI-green PR head after recording an immutable image/build digest and satisfying the remaining staging gates. Current local candidate is `2673bcf5`; `9f387cad`, `0e00df4f`, `7ac37f43` and `01aa9d0c` are historical evidence, not current deploy targets. |
| OD-B5 | Create staging fixture rows and run browser/API/RLS acceptance that mutates the staging database. |
| OD-C | Inject `BRIGHTDATA_API_TOKEN` and the approved dataset ID, then execute one isolated provider call with the confirmed USD 0.25 and 25-minute caps. |
| OD-R | Execute the rollback/restore procedure, including environment changes, job cancellation, service restart or image rollback. |
| OD-S | `DOMAIN_DECISION_COMPLETE_ROTATION_OWNER_CONFIRMED`: keep both public domains on staging; affected external and staging Postgres credential rotations are owner-confirmed complete without values. Active sealed bindings still require names-only verification. |
| OD-CI | `PENDING_CURRENT_HEAD`: Actions budget was restored; historical `9f387cad` CI passed, while current local candidate `2673bcf5` awaits push and one exact-head CI cycle. |
| OD-P | Any production access, production database, billing change, recurring schedule or production deploy. This remains outside the pack. |

OD-A, OD-B1 through OD-B5, OD-C and automatic staging rollback are authorized
for this bounded loop, but their ordered gate conditions still apply. Rotation
is no longer the blocker. Final exact-head CI, active fail-closed configuration,
hosted migration/RLS and provider cost/durable-journal findings stop the later
boundaries; authorization is not a PASS. Backup restoreability is proven at the
recorded checkpoint and must be refreshed before SQL. OD-P remains separately
gated.
