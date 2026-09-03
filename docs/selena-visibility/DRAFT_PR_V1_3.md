# Selena AI Visibility v1.3 — audit remediation follow-up

## Authoritative PR #123 overlay — 2026-09-03

- Draft PR: [#123](https://github.com/parkourcafe/selena-ai-visibility/pull/123),
  deployed staging executable `5d8eb47ded32eb7dfe60b2c548a1eb40f8411476`,
  current source head `5f655456c648656678bee10ba272b1135f5530cd` (disposable
  UTC-day fixture fix only), branch `fix/selena-0060-cancelled-permits`; status is
  `OPEN/DRAFT/MERGEABLE` and merge is prohibited.
- All six checks for the current source HEAD pass: [Build run 33702194620](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33702194620),
  [E2E/Scheduling run 33702194622](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33702194622),
  [License run 33702194564](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33702194564),
  [Smoke run 33702194563](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33702194563)
  and [CLA run 33702194570](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33702194570).
- Read-only backup/restore precondition passed: backup
  `3585126c-a35c-452d-8540-d83b8a0e1d94` (426 MB referenced, 222 MB used, no
  expiry), isolated restore service `88dbe261-c7f6-4733-83cf-15e579f6990e`,
  deployment `114b84eb-5f78-43ae-a8a4-d981a8897599`, restored marker and
  WAL-from-bucket evidence.
- Migration deployment `934cacb6-5436-461d-80d2-6d0805c8df0a` applied only
  `0059–0060` and advanced the journal `59→61` with TLS verification and exit
  `0`. Rollback-only owner proof returned upper bound `4` and rolled back with
  no count changes; the authorized owner reconciliation committed exactly once
  and replay returned `ALREADY_RECONCILED`.
- Reconciliation outcome: claim `RECONCILED`; cycle `STOPPED` (`75/75/4`);
  permits `4 consumed/71 revoked`; four runs marked failed-invalid with the
  legacy interruption reason; audit `3→4`, incidents `0→1`; no new snapshot,
  evidence, acceptance, provider-boundary or cost rows. Provider calls stayed
  `0`.
- Runtime safety remains explicit: `selena_app` cannot read private snapshot
  payload/provider references or execute reconciliation; only allowlisted
  metadata is readable. Exact staging web deployment
  `c239da91-2b5b-413b-a77a-7d9c4394c635` and worker deployment
  `14cff336-1549-4ea9-a572-3e576b7db16a` are `SUCCESS`, with provider,
  billing and recurring execution disabled.
- Hosted API/browser acceptance passed: setup health `200 ready=true`, scoped
  unauthenticated project API `401`, AVLI/HoReCa browser shell with left
  project rail and separate horizontal Workspace tools, Local-first read-only,
  Social/Travel absent. Global pre-existing cost baseline remains
  `4560` rows / USD `32.162867`.
- Source and hosted decision: `GO_STAGING_ACCEPTANCE / NO_GO_PRODUCTION`.
  No provider call, retry, billing, recurring job, production action or merge
  occurred. Keep this PR draft until a separately authorized release decision.

## Historical PR #120 overlay — 2026-09-03

- Exact hosted implementation source head:
  `b4e678b812b42623d20a4211a0ae6f6d657420b3`.
- Exact release base: `6d1e7c2a803b8d11053c88bd1996f8e3bc926565`.
- Source and shared-staging frontier is `59 entries / 0058`.
- `0051` converges four evidenced historical/release schema variants. `0057`
  adds tenant-and-project formal-evidence identity and delivered-journal
  binding. `0058` persists the no-spend/provider-execution boundary and makes
  recovery idempotent without reopening a provider path.
- `selena_app` remains non-owner/no-bypass/no-inherit, has 11 allowlisted
  snapshot metadata columns only, and cannot read raw private snapshot
  payload/provider locators, execute private reconciliation or forge formal
  acceptance. The proof actor is derived from the actual owner connection.
- Paginated Local read routes require a server-only HMAC cursor secret of at
  least 32 UTF-8 bytes, bind cursors to tenant/cycle/resource and fail closed
  before DB access when the sealed key is unavailable. The key cannot be
  supplied through tenant/provider configuration.
- Local source gates: four-variant migration matrix, actual-role RLS proof,
  formal-evidence replay and journal-recovery replay all `PASS`; root lint
  `0 errors` (`129 warnings / 12 infos` baseline), typecheck `13/13`, tests
  `16/16`, build `16/16`; provider calls `0`.
- PR [#112](https://github.com/parkourcafe/selena-ai-visibility/pull/112)
  remains open/conflicting and is superseded by this remediation. PR
  [#116](https://github.com/parkourcafe/selena-ai-visibility/pull/116)
  remains open/draft; its independently reviewed project/tool UI tree is
  integrated in this candidate.
- Draft PR [#117](https://github.com/parkourcafe/selena-ai-visibility/pull/117)
  is open/draft, mergeable and clean at exact hosted head `b4e678b8`. All six
  source checks pass:
  [Build](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753485),
  [E2E/Scheduling](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753450),
  [License](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753471),
  [Smoke](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753579)
  and [CLA](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33634753617).
  These source checks use stub/no-network provider paths and do not deploy or
  execute a paid call.
- Fresh backup and isolated restore preceded bounded staging migrations
  `0057–0058`. The owner-neutral proof then passed in a transaction ending in
  rollback; counts stayed `1/2/0/0/10647/4560` for snapshots/canaries/evidence/
  acceptance/audit/cost, with zero proof fixtures or residual memberships.
- Exact `b4e678b8` staging web/worker deployments passed at
  `8a377d4c-28ce-4a0c-b633-9f72fec89b3a` and
  `c5c2b004-f727-49e4-954d-bfe0e9415cfe`. The cursor key is sealed and its
  runtime length gate passed without disclosure. Scoped API auth/HMAC checks
  and AVLI/KORA browser acceptance passed; the temporary API key was deleted.
  Counts remained `1/2/0/0/10647/4560`, with schedules and residual fixtures
  `0/0`. No provider, billing, recurring or production action occurred.
- Remaining staging holds are the Better Auth trusted-client-IP rate-limit
  warning and failed fresh direct `postgres` authentication after credential
  rotation. These do not invalidate the already proved backup/RLS receipts or
  the healthy `selena_app` runtime, but block further owner-scoped maintenance.

Status: `STAGING_PRELAUNCH_PASS / OWNER_DB_BINDING_HOLD / PRODUCTION_NO_GO`.

## Current follow-up PR summary

- reconcile the four historical/release migration shapes without rewriting
  already-delivered migrations;
- make formal evidence identity tenant-and-project scoped and fail closed for
  legacy or historical-canary rows;
- persist an immutable journal boundary so crash recovery cannot relabel a
  possibly-spent execution as `NO_SPEND`;
- preserve the reviewed HoReCa project rail and top tool axis;
- keep production, Social/Travel, recurring execution, billing and provider
  calls closed until their separate gates.

## Historical PR ledger

The material below is retained for audit lineage. Older SHA, CI and deployment
claims are historical and are not the current candidate status.

- PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Base: `release/selena-visibility-mvp`
- Current remote base head: `4400d435`; integrated by merge commit `84cce314`
- Last complete exact-head PR receipt: `1f3dd9d7`, base `330bab2a`,
  `mergeable=true`, all six checks passed
- Accepted staging implementation source: `100d34d8`
- Diagnostic-2 runtime source: `a9d1f373`
- Sanitized trigger-diagnostics source before this evidence update: `4f701b35`
- Bounded snapshot-download remediation source: `4a1fd948`
- Canary-time feature HEAD: `3872a396`
- Active staging worker after rollback: `100d34d8`, deployment `b583e695…`
- Active staging web after drift recovery: `100d34d8`, deployment `835aca8d…`
- Integrated release parent: `5cbb7b25`
- Current offline reconciliation source patch: `b01a310b` in follow-up [PR
  #108](https://github.com/parkourcafe/selena-ai-visibility/pull/108); exact
provider capture/journal timestamps, strict replay checks and idempotent
  dry-run rollback are covered by focused tests; final CI is green at
  `f4b1418d`.

## Proposed title

`fix(visibility): close v1.3 evidence and journal audit gaps`

## Proposed PR body

### Summary

- integrate release `4400d435` without rewriting feature history;
- provide the provider registry and 13 canary-ready dataset contracts;
- harden Google adapters and keep generic live probes fail-closed;
- keep Social/Travel hidden at server, workflow and UI boundaries;
- run staging through non-owner `selena_app` with tenant RLS;
- keep recurring, billing and steady provider execution disabled;
- deliver the HoReCa Local-first read model and separate the project axis from
  the workspace-tool axis;
- preserve the protected untracked recovery handoff boundary.

### Source and migration evidence

- fresh pre-`0053` backup `d2ac59a9…` was created and read back before the
  mutation;
- bounded migration deployment `76fe0d58…` applied only `0053`; journal
  frontier advanced `53/1787940014000` → `54/1787940015000` and runner exit was
  `0`;
- canonical `0045` remains immutable for new installations;
- the bounded runner accepts the one reviewed ordinal-bearing historical
  `0045` hash only at timestamp `1787940007000`; a boolean-only staging
  readback matched that historical variant and rejected the mistaken `0051`
  hash;
- `selena_app` has only the required `SELECT`/`INSERT` access to the snapshot
  journal, FORCE RLS is active, cross-tenant insert returned SQLSTATE `42501`,
  and the acceptance transaction rolled back to zero rows.
- post-`0053` values-suppressed readback proved the non-owner runtime role,
  FORCE RLS, ordinal column, validated check, unique index and insert guard.
- sealed staging migration bound is `53`; follow-up no-op deployment
  `b7b7fa33-6da8-49a0-835f-d76b74e9fafb` read journal `54/1787940015000` before
  and after, verified TLS and exited `0` without applying a new migration.

### Provider canary evidence

- two separately authorized immutable identities each made exactly one Bright
  Data `GOOGLE_AI_MODE` call;
- historical snapshot `sd_mtiflifw2lfu6ne28l` is exactly bound to five staging
  journal events: `TRIGGERED`, two `PENDING`, `READY`, `INTERRUPTED`;
- provider `READY` timestamp `08:54:46Z` precedes the first journal event at
  `08:54:47.108Z`; one tenant/project/dataset matched the raw ID;
- diagnostic-2 receipt: `OUTCOME_UNKNOWN / TRIGGER_OUTCOME_UNKNOWN`;
- each call used `automaticRetries=0`, `retryAllowed=false` and
  `recurring=false`;
- diagnostic-2 reserved cap `USD 0.25` at durable reference
  `db:e432156c-7f5d-40ef-ad40-72a883affac9`;
- diagnostic-2 completed in `0.34s` with no snapshot reference, record count or
  new snapshot-lifecycle event;
- read-only download produced one 1,543,419-byte record; offline registry
  validation passed with a non-empty normalized answer and four citations;
- the historical interruption is explained by the former 1 MB download cap;
  source `4a1fd948` keeps control responses at 1 MB and bounds snapshot downloads
  at 4 MiB;
- the explicitly authorized staging-only reconciliation persisted one immutable
  private source snapshot and one audit event (`PERSISTED_PRIVATE`, deployment
  `78de5973-d6c5-446a-b8c9-390c1c273ee9`), with no evidence-index, cost or
  acceptance rows and `providerCalls=0`;
- a second replay reached the non-owner `selena_app` SELECT boundary on the
  private snapshot and returned no receipt; no duplicate write was observed;
- first-party Bright Data exports after diagnostic-2 show exactly one Google AI
  Mode Search record and `USD 0.0015` total for 1 September;
- the pre-diagnostic evidence already contained the same one record, therefore
  diagnostic-2 added no billable record and `USD 0.0000` incremental cost;
- the daily Web Scraper API total is `USD 0.0285` for 19 records; ChatGPT Search
  and Gemini Search account for 18 records and `USD 0.0270` and are excluded
  from Google AI Mode attribution;
- both reservations remain immutable; no retry or additional provider call is
  authorized.
- offline historical reconciliation ran in staging dry-run mode and returned
  `DRY_RUN_ROLLED_BACK`; it made no provider call or persistence write and
  remains behind a separate owner gate for the irreversible commit.
- prospective source diagnostics now classify HTTP 4xx/5xx, invalid response,
  transport failure and hard trigger timeout without logging the provider body;
  this does not reinterpret either already-consumed canary receipt.
- the staging Postgres administration credential was rotated again after a
  Railway tunnel diagnostic exposed it in restricted tool output; the sealed
  variable and database role were updated together, a values-suppressed TCP
  probe passed and temporary rotation material was destroyed.

### HoReCa hosted evidence

- exact staging deployment `835aca8d-2a47-4bad-af75-d7f4920cd35b` from git
  archive `100d34d8` restored the accepted web after automatic release drift;
- projects were presented in the complementary `PROJECTS / HoReCa projects`
  rail;
- `Overview`, `Visibility`, `Evidence`, `Competitors`, `Actions` and
  `Outcomes` were presented in the top `TOOLS / Workspace tools` navigation;
- external release auto-deploys `5cbb7b25`, `2e21ef04` and `4400d435` each
  superseded an exact UI deployment; exact `100d34d8` was restored after all
  three drifts;
- authenticated DOM and visual rechecks passed on the active exact deployment,
  both public health endpoints returned 200, and no page-origin browser errors
  were observed.

### Exact worker evidence

- temporary deployment `de5df16a-2768-4541-8eaf-a6a33604c5b8` ran diagnostic
  source `a9d1f373` and was removed after the single call;
- rollback deployment `b583e695-e935-4e2f-b6c5-f13b135964d4` restored exact
  archive `100d34d8` and reached `SUCCESS`;
- startup logs prove legacy provider execution disabled, recurring scheduler
  disabled, managed schedules removed, pg-boss ready and all handlers
  registered;
- no package-manager/Corepack download occurred in the worker runtime phase.

### CI evidence

- release-integrated evidence head `4a1fd948` passed Build, E2E Integration,
  Scheduling Policy Verification, Deployment Smoke, License and CLA; exact run
  links are in `ACCEPTANCE_MATRIX_V1_3.md`;
- release integration `34d86417` preserved the feature historical-hash gate,
  adopted release advisory-lock ordering and passed lib migration tests `10/10`
  plus CLI migration image tests `2/2` locally;
- GitHub reported PR #96 mergeable at `4a1fd948`; this source-quality
  result does not override the provider HOLD;
- PR #108 final exact-head checks are green at `f4b1418d`; the prior 30-minute
  cleanup cancellation is superseded by the bounded 35-minute workflow run;
- the E2E scheduling job now replays the final bounded runner through the
  disposable release frontier `0054` against real PostgreSQL after the journal
  is already complete; shared staging remains bounded at `0053`;
  the current-head E2E check is the authoritative no-op/advisory-lock receipt;
- local focused gates after the release merge: migration/repository tests
  `77/77`, HoReCa web suite `441 passed / 4 skipped`, lib/web typecheck PASS,
  shell syntax PASS and diff check clean;
- local runtime is Node 22 while CI uses the required Node 24.

### Remaining gates

1. Historical Bright Data identity, payload and cost are reconciled. The private
   staging capture is persisted once, and replay validation now checks canonical
   payload, timestamps, schema, capability and audit binding. Owner-only
   read-only verification against the actual staging Postgres remains blocked by
   password authentication failure; neither execution may be retried.
2. Production, production DB, recurring jobs, billing activation,
   Social/Travel activation, additional provider calls and PR merge remain
   prohibited.

`HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untracked and excluded.

## CI side effects

Every push to PR #96 starts the documented GitHub/Blacksmith checks. The owner
restored the Actions budget and authorized bounded feature-branch pushes. A
green check suite proves source quality only; it does not close the provider
lifecycle or production gates.
