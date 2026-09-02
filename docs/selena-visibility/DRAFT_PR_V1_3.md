# Draft PR #96 — Selena AI Visibility v1.3 pre-production hardening

Status: `OPEN / HISTORICAL_PAYLOAD_PASS / PRIVATE_RECONCILED / ACCEPTANCE_HOLD / DO_NOT_MERGE`.

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
- Active staging worker after rollback: `100d34d8`, deployment `9275a824…`
- Active staging web after drift recovery: `100d34d8`, deployment `835aca8d…`
- Integrated release parent: `5cbb7b25`
- Current offline reconciliation source patch: `b01a310b` in follow-up [PR
  #108](https://github.com/parkourcafe/selena-ai-visibility/pull/108); exact
provider capture/journal timestamps, strict replay checks and idempotent
  dry-run rollback are covered by focused tests; final CI is green at
  `f4b1418d`.

## Proposed title

`fix(visibility): harden v1.3 pre-production gates`

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
- rollback deployment `9275a824-281d-4afa-8098-1ed7184ffc68` restored exact
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

1. Historical Bright Data identity, payload and cost are reconciled, but no
   retroactive staging capture write is authorized. Diagnostic-2 remains
   `TRIGGER_OUTCOME_UNKNOWN`; neither execution may be retried.
2. Production, production DB, recurring jobs, billing activation,
   Social/Travel activation, additional provider calls and PR merge remain
   prohibited.

`HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untracked and excluded.

## CI side effects

Every push to PR #96 starts the documented GitHub/Blacksmith checks. The owner
restored the Actions budget and authorized bounded feature-branch pushes. A
green check suite proves source quality only; it does not close the provider
lifecycle or production gates.
