# Draft PR #96 — Selena AI Visibility v1.3 pre-production hardening

Status: `OPEN / STAGING_CANARY_HOLD / DO_NOT_MERGE`.

- PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Base: `release/selena-visibility-mvp`
- Current remote base head: `2e21ef04`; PR API snapshot still reports
  `5cbb7b25` and `mergeable_state=dirty`
- Accepted staging implementation source: `100d34d8`
- Diagnostic-2 source / current PR HEAD before this evidence update: `a9d1f373`
- Canary-time feature HEAD: `3872a396`
- Active staging worker after rollback: `100d34d8`, deployment `73ee9186…`
- Active staging web after drift recovery: `100d34d8`, deployment `c3002c7d…`
- Integrated release parent: `5cbb7b25`

## Proposed title

`fix(visibility): harden v1.3 pre-production gates`

## Proposed PR body

### Summary

- integrate release `5cbb7b25` without rewriting feature history;
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

### Provider canary evidence

- two separately authorized immutable identities each made exactly one Bright
  Data `GOOGLE_AI_MODE` call;
- historical receipt: `OUTCOME_UNKNOWN / LIFECYCLE_OUTCOME_UNKNOWN`;
- diagnostic-2 receipt: `OUTCOME_UNKNOWN / TRIGGER_OUTCOME_UNKNOWN`;
- each call used `automaticRetries=0`, `retryAllowed=false` and
  `recurring=false`;
- diagnostic-2 reserved cap `USD 0.25` at durable reference
  `db:e432156c-7f5d-40ef-ad40-72a883affac9`;
- diagnostic-2 completed in `0.34s` with no snapshot reference, record count or
  new snapshot-lifecycle event;
- no accepted provider capture was persisted by either call;
- first-party Bright Data exports after diagnostic-2 show exactly one Google AI
  Mode Search record and `USD 0.0015` total for 1 September;
- the pre-diagnostic evidence already contained the same one record, therefore
  diagnostic-2 added no billable record and `USD 0.0000` incremental cost;
- the daily Web Scraper API total is `USD 0.0285` for 19 records; ChatGPT Search
  and Gemini Search account for 18 records and `USD 0.0270` and are excluded
  from Google AI Mode attribution;
- both reservations remain immutable; no retry or additional provider call is
  authorized.

### HoReCa hosted evidence

- exact staging deployment `c3002c7d-e789-4236-9e55-2df00529ae37` from git
  archive `100d34d8` restored the accepted web after automatic release
  deployment `b5ca2d0f…` (`2e21ef04`) superseded the earlier exact receipt;
- projects were presented in the complementary `PROJECTS / HoReCa projects`
  rail;
- `Overview`, `Visibility`, `Evidence`, `Competitors`, `Actions` and
  `Outcomes` were presented in the top `TOOLS / Workspace tools` navigation;
- external release auto-deploys `5cbb7b25` and `2e21ef04` each superseded an
  exact UI deployment; exact `100d34d8` was restored after both drifts;
- authenticated DOM and visual rechecks passed on the active exact deployment,
  both public health endpoints returned 200, and no page-origin browser errors
  were observed.

### Exact worker evidence

- temporary deployment `de5df16a-2768-4541-8eaf-a6a33604c5b8` ran diagnostic
  source `a9d1f373` and was removed after the single call;
- rollback deployment `73ee9186-5df2-4b4c-a578-fb8e988c86f6` restored exact
  archive `100d34d8` and reached `SUCCESS`;
- startup logs prove legacy provider execution disabled, recurring scheduler
  disabled, managed schedules removed, pg-boss ready and all handlers
  registered;
- no package-manager/Corepack download occurred in the worker runtime phase.

### CI evidence

- diagnostic source `a9d1f373` passed exact-head Build, E2E Integration,
  Scheduling Policy Verification, Deployment Smoke and License workflows;
  exact run links are in `ACCEPTANCE_MATRIX_V1_3.md`;
- the CLA workflow is not manually dispatchable; PR #96 currently reports
  `mergeable=false`, `mergeable_state=dirty`, so no merge gate is claimed;
- local focused gates after the release merge: migration/repository tests
  `77/77`, HoReCa web suite `441 passed / 4 skipped`, lib/web typecheck PASS,
  shell syntax PASS and diff check clean;
- local runtime is Node 22 while CI uses the required Node 24.

### Remaining gates

1. Both Bright Data terminal outcomes remain `UNKNOWN/HOLD`; first-party cost
   and usage attribution is closed and neither execution may be retried.
2. PR #96 remains `dirty` and lacks automatic exact-head check aggregation.
3. Production, production DB, recurring jobs, billing activation,
   Social/Travel activation, additional provider calls and PR merge remain
   prohibited.

`HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untracked and excluded.

## CI side effects

Every push to PR #96 starts the documented GitHub/Blacksmith checks. The owner
restored the Actions budget and authorized bounded feature-branch pushes. A
green check suite proves source quality only; it does not close the provider
lifecycle or production gates.
