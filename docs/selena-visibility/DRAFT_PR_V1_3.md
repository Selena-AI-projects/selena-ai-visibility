# Draft PR #96 — Selena AI Visibility v1.3 pre-production hardening

Status: `OPEN / STAGING_CANARY_HOLD / DO_NOT_MERGE`.

- PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Base: `release/selena-visibility-mvp`
- Accepted implementation source: `100d34d8`
- Canary-time feature HEAD: `3872a396`
- Canary worker runtime source: `2d023470`
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

- migration `0052` is applied in staging; journal frontier is
  `53/1787940014000` and its exact hash is recorded in the Acceptance Matrix;
- migration `0053` exists in source but is not authorized and was not applied;
- canonical `0045` remains immutable for new installations;
- the bounded runner accepts the one reviewed ordinal-bearing historical
  `0045` hash only at timestamp `1787940007000`; a boolean-only staging
  readback matched that historical variant and rejected the mistaken `0051`
  hash;
- `selena_app` has only the required `SELECT`/`INSERT` access to the snapshot
  journal, FORCE RLS is active, cross-tenant insert returned SQLSTATE `42501`,
  and the acceptance transaction rolled back to zero rows.

### Provider canary evidence

- exactly one authorized Bright Data `GOOGLE_AI_MODE` trigger ran;
- receipt: `OUTCOME_UNKNOWN / LIFECYCLE_OUTCOME_UNKNOWN`;
- `providerCalls=1`, `automaticRetries=0`, `retryAllowed=false`,
  `recurring=false`;
- journal: `TRIGGERED=1`, `PENDING=2`, `READY=1`, `INTERRUPTED=1`;
- no provider capture was persisted;
- Bright Data Cost explorer attributes exactly one record to `Google AI Mode
  Search` and displays its cost as `USD 0.00`; the account overview also shows
  `Consumed USD 0.00`;
- the unrounded one-record list-price calculation remains `USD 0.0015` and is
  not represented as a cash charge;
- the daily `USD 0.02` Web Scraper API total covers 11 records across three
  APIs; ten non-Google-AI-Mode records are excluded from canary attribution;
- the once-only reservation prevents a second trigger, and no retry is
  authorized.

### HoReCa hosted evidence

- exact staging deployment `10b51bd2-ff1b-41a7-b9f8-6d628ea9f8f0` from git
  archive `100d34d8` reached `SUCCESS` with image
  `sha256:b92d8e81a26aa20127b681f153bfb32d798673e4128009019fb44101006f1536`;
- projects were presented in the complementary `PROJECTS / HoReCa projects`
  rail;
- `Overview`, `Visibility`, `Evidence`, `Competitors`, `Actions` and
  `Outcomes` were presented in the top `TOOLS / Workspace tools` navigation;
- external release auto-deploy `5cbb7b25` temporarily superseded the first UI
  receipt; the exact `100d34d8` deployment replaced that drift;
- authenticated DOM and visual rechecks passed on the active exact deployment,
  both public health endpoints returned 200, and no page-origin browser errors
  were observed.

### CI evidence

- canary-time HEAD `3872a396` passed Build, E2E, scheduling, deployment smoke,
  license and CLA; exact run links are in `ACCEPTANCE_MATRIX_V1_3.md`;
- accepted implementation source `100d34d8` passed its complete
  Blacksmith/GitHub Actions cycle: Build, E2E Integration, scheduling,
  deployment smoke, dependency license and CLA;
- local focused gates after the release merge: migration/repository tests
  `77/77`, HoReCa web suite `441 passed / 4 skipped`, lib/web typecheck PASS,
  shell syntax PASS and diff check clean;
- local runtime is Node 22 while CI uses the required Node 24.

### Remaining gates

1. Bright Data terminal lifecycle remains `UNKNOWN/HOLD`; billing attribution
   is closed and no second call or retry is authorized.
2. Applying staging migration `0053` requires separate owner authorization.
3. Production, production DB, recurring jobs, billing activation,
   Social/Travel activation and PR merge remain prohibited.

`HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untracked and excluded.

## CI side effects

Every push to PR #96 starts the documented GitHub/Blacksmith checks. The owner
restored the Actions budget and authorized bounded feature-branch pushes. A
green check suite proves source quality only; it does not close the provider
lifecycle or production gates.
