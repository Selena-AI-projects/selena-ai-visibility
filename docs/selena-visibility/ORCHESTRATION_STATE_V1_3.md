# Selena AI Visibility v1.3 — orchestration state

Updated: `2026-09-01` after the authorized one-shot provider canary and exact
feature-head CI.

## Current state

- State: `STAGING_CORE_PASS_CANARY_OUTCOME_UNKNOWN_ACCEPTANCE_HOLD`
- Context mode: `repository_only`
- Branch: `feature/selena-visibility-v1-2-1`
- Accepted implementation source: `100d34d8` (PR head before this evidence-only update)
- Canary-time feature HEAD: `3872a396dabfb6763b2b93f70ea3c521f12d8688`
- Last fully reconciled hosted baseline: `2d023470a618c6606e7960ee4dd1b4523dcbdcfe`
- Active exact staging web: `100d34d8`, deployment `10b51bd2…`, `SUCCESS`
- Superseded external staging web auto-deploy: release `5cbb7b25`
- Integrated release baseline: `5cbb7b256f286295a3dafdbeddc9aa46e24227f7`
- Original release comparison snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Historical draft PR reference: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Canary-time feature-head required checks: `ALL PASS`
- Accepted implementation-source checks: `ALL PASS`
- Production deploy/DB mutations: `0`
- Provider triggers: `1`, the authorized one-shot canary only
- New cost-event rows since exact deployment: `0`
- Recurring managed schedules after worker start: `0`
- PR merge: `NOT_EXECUTED`

The untracked `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untouched
and excluded from every commit and archive.

## Owner constraints in force

- Shared staging is the public pre-launch acceptance runtime.
- `app.selenasystems.com` and `staging.selenasystems.com` remain on staging.
- Production, production DB, recurring jobs and Social/Travel activation are
  prohibited.
- The one-shot provider authorization is consumed. No retry or additional
  provider trigger is authorized.
- Steady runtime provider execution remains disabled after the canary.
- Secret values must never be read, printed or committed.

## Parallel stream outcome

| Stream | Result | Current boundary |
|---|---|---|
| Provider | `HOLD_OUTCOME_UNKNOWN` | Exactly one authorized trigger ran. Terminal receipt: `OUTCOME_UNKNOWN` / `LIFECYCLE_OUTCOME_UNKNOWN`; no retry was allowed or performed. The one-record verified worst-case/list price was `USD 0.0015`, while actual billed amount remains `UNKNOWN`. |
| Database/Evidence | `PASS_HOSTED_CORE_CANARY_HOLD` | The durable reservation count is one. Journal lifecycle is `TRIGGERED -> PENDING -> READY -> INTERRUPTED`; no raw capture was persisted and no acceptance evidence was created. |
| HoReCa Product | `PASS_HOSTED` | Exact active deployment `10b51bd2…` passed authenticated DOM and visual review with projects at left and the six tools across the top. |
| Orchestrator | `STAGING_CORE_PASS` | Release `5cbb7b25` is integrated into `100d34d8`; exact-source CI and exact staging web reconciliation passed. |

Independent Codex cross-audits found no P0/P1 in the material provider,
database/evidence and HoReCa changes through `8cc0b87b`. Commit `d4ac606a`
only enabled the intentional stub recurring worker in disposable CI. Commit
`2d023470` only made a real-time timeout test deterministic. All required CI
checks passed on canary-time feature HEAD `3872a396`; current candidate
`100d34d8` adds the release merge and bounded `0045` historical-hash handling.
Its final source CI and exact hosted web reconciliation passed.

## CI state

- Canary-time feature HEAD: `3872a396dabfb6763b2b93f70ea3c521f12d8688`
- Canary-time required checks: `ALL PASS`
- Accepted implementation source: `100d34d8`; checks `ALL PASS`
- Hosted deployment equality: `PASS`; exact git archive `100d34d8` is active as
  deployment `10b51bd2-ff1b-41a7-b9f8-6d628ea9f8f0`.

Previously recorded local source gates: lint `0 errors / 129 warnings / 12 infos`, typecheck
`13/13`, tests `16/16` tasks, Impeccable detect `PASS`, build `16/16`.
Focused Bright Data timeout stability: `20/20`. Focused Local Maps stability:
five replays, `73/73` tests per replay.

## Staging receipts

| Item | Receipt |
|---|---|
| Fresh backup | `9b961055-4f2e-4cb2-aae6-a348f2b4cd5f`, no expiry |
| Isolated restored service | `a34b2749-130a-47f3-8da3-8f58e3775fe9`, healthy restored copy |
| Active reconciled web | `10b51bd2-ff1b-41a7-b9f8-6d628ea9f8f0`, exact archive `100d34d8`, `SUCCESS/RUNNING`, image `sha256:b92d8e81a26aa20127b681f153bfb32d798673e4128009019fb44101006f1536` |
| Superseded external web drift | release `5cbb7b25`; replaced by the exact accepted implementation deployment |
| Last reconciled worker | `586b6e9a-736b-4d2c-b510-280dc79fa478`, `SUCCESS/RUNNING` |
| Runtime DB role | `selena_app`, non-owner, no superuser/createdb/createrole/bypassrls |
| Migration frontier | `0052` snapshot journal present and used by the one-shot canary |
| Pending source migration | `0053`, not authorized and not applied; actual staging `0045` row matches the one reviewed historical hash alias, proved by boolean-only readback |
| Provider canary | One trigger; receipt `OUTCOME_UNKNOWN` / `LIFECYCLE_OUTCOME_UNKNOWN`; no retry allowed or performed |
| Canary reservation | One durable reservation; approved cap `USD 0.25` |
| Canary cost | Verified one-record worst-case/list price `USD 0.0015`; actual billed amount `UNKNOWN` because the Bright Data billing UI requires login |
| Snapshot journal | `TRIGGERED -> PENDING -> READY -> INTERRUPTED`; no capture persistence |
| Runtime logs | Steady provider path disabled after the canary; recurring scheduler disabled; pg-boss started; handlers ready |
| Browser | Both health endpoints 200; HoReCa unauth redirect correct; authenticated project-rail/tool-axis DOM and visual review passed; page-origin errors 0 |
| API | Two scoped tenants isolated; invalid key 401; fixtures removed |
| RLS | Same-tenant positive and cross-tenant/private negatives passed; proof rolled back |
| Replay | Concurrent winner 1; stable replay; active mutation blocked; expired fixture removed |

## Credential state

Owner-confirmed names-only rotation: `BRIGHTDATA`, `OPENAI`, `OPENROUTER`,
`RESEND`, `GITHUB`, staging Postgres. Active application DB connectivity is
proved with the rotated `selena_app` binding. A values-suppressed count-only
probe after the owner-confirmed rotation returned `ADMIN_TCP=PASS` for the
Postgres service's sealed administration binding. No value was read.

Status: `PASS_ADMIN_BINDING`.

## Remaining gates

1. `HOLD_RECONCILIATION`: the one-shot canary ended
   `OUTCOME_UNKNOWN/LIFECYCLE_OUTCOME_UNKNOWN`. No retry is allowed. Actual
   billed amount remains `UNKNOWN` until an authorized owner checks the Bright
   Data billing UI; the verified one-record worst-case/list price is not an
   actual charge.
2. `HOLD_MIGRATION_0053`: source is ready, but staging application was not
   authorized and was not attempted.
3. `NO_GO`: production and PR merge while any hold remains open.

## Rollback posture

- Web rollback source: prior successful deployment
  `cc89f46b-b548-4216-a546-362051e98ecd`.
- Worker rollback posture: scale to zero first; do not restore the historical
  worker unless fail-closed variables are reconfirmed.
- Database rollback posture: restore from backup
  `9b961055-4f2e-4cb2-aae6-a348f2b4cd5f`; migrations are forward-only and the
  isolated restore receipt is the recovery proof.
- Automatic rollback was not triggered. The provider result is held for
  reconciliation, steady runtime is safely off, and exact `100d34d8` is the
  active accepted staging web implementation.
