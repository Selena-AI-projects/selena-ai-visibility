# Selena AI Visibility v1.3 — orchestration state

Updated: `2026-09-01` after exact-head hosted acceptance.

## Current state

- State: `STAGING_CORE_PASS_OWNER_GATES_REMAIN`
- Context mode: `repository_only`
- Branch: `feature/selena-visibility-v1-2-1`
- Runtime/source HEAD: `2d023470a618c6606e7960ee4dd1b4523dcbdcfe`
- Runtime/source tree: `aa93f8c258fad557caefdfc81be99e07225d72d5`
- Integrated release HEAD: `9e1e993090fb6ef133b147b5341f2ff8591ade6c`
- Original release comparison snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Draft PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Exact-head required checks: `6/6 PASS`
- Production deploy/DB mutations: `0`
- Provider calls in this hosted loop: `0`
- New cost-event rows since exact deployment: `0`
- Recurring managed schedules after worker start: `0`
- PR merge: `NOT_EXECUTED`

The untracked `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untouched
and excluded from every commit and archive.

## Owner constraints in force

- Shared staging is the public pre-launch acceptance runtime.
- `app.selenasystems.com` and `staging.selenasystems.com` remain on staging.
- Production, production DB, recurring jobs, billing and Social/Travel
  activation are prohibited.
- Latest owner decision prohibits paid provider calls.
- Staging migrations are bounded at `0051`; `0052` is not authorized.
- Secret values must never be read, printed or committed.

## Parallel stream outcome

| Stream | Result | Current boundary |
|---|---|---|
| Provider | `PASS_SOURCE` | Registry, 13 dataset contracts and Google adapters are exact-head CI green. Generic live probes are unreachable; Social/Travel is hidden. No provider call ran. |
| Database/Evidence | `PASS_HOSTED_CORE` | Backup/restore, migrations through 0051, actual non-owner role, RLS, rollback, replay, concurrency and idempotency passed. |
| HoReCa Product | `PASS_SOURCE_HOSTED_BOUNDARY` | Local-first modules, UNKNOWN semantics, evidence privacy, scoped API and unauthenticated browser boundary passed. Authenticated human UI is pending. |
| Orchestrator | `PASS_WITH_OWNER_GATES` | Exact archive deployed to web/worker, CI and runtime receipts reconciled, zero-call containment proved. |

Independent Codex cross-audits found no P0/P1 in the material provider,
database/evidence and HoReCa changes through `8cc0b87b`. Commit `d4ac606a`
only enabled the intentional stub recurring worker in disposable CI. Commit
`2d023470` only made a real-time timeout test deterministic. Exact-head Build,
unit, E2E and scheduling checks passed afterward.

## Exact-head CI

- Build: [33477379167](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379167)
- E2E and scheduling: [33477379190](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379190)
- License: [33477379254](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379254)
- Smoke: [33477379236](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379236)
- CLA: [33477379199](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379199)

Local source gates: lint `0 errors / 129 warnings / 12 infos`, typecheck
`13/13`, tests `16/16` tasks, Impeccable detect `PASS`, build `16/16`.
Focused Bright Data timeout stability: `20/20`. Focused Local Maps stability:
five replays, `73/73` tests per replay.

## Staging receipts

| Item | Receipt |
|---|---|
| Fresh backup | `9b961055-4f2e-4cb2-aae6-a348f2b4cd5f`, no expiry |
| Isolated restored service | `a34b2749-130a-47f3-8da3-8f58e3775fe9`, healthy restored copy |
| Web | `7e7de294-3758-42a3-b8c2-2f5b39cbaf50`, `SUCCESS/RUNNING` |
| Worker | `586b6e9a-736b-4d2c-b510-280dc79fa478`, `SUCCESS/RUNNING` |
| Runtime DB role | `selena_app`, non-owner, no superuser/createdb/createrole/bypassrls |
| Migration frontier | `0051` present; `0052` snapshot-event table absent |
| Runtime logs | Provider path disabled; recurring scheduler disabled; pg-boss started; handlers ready; no error-level log |
| Browser | Home 200; HoReCa unauth redirect correct; console/page errors 0 |
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

1. `HOLD_ACCESS`: authenticated owner browser session for HoReCa/Local UI.
2. `HOLD_OWNER`: paid canary. Actual price is `UNKNOWN`; incurred price is
   `USD 0.00`. A future run requires explicit authorization for migration
   `0052` and for one paid call.
3. `NO_GO`: production and PR merge while any gate above is open.

## Rollback posture

- Web rollback source: prior successful deployment
  `cc89f46b-b548-4216-a546-362051e98ecd`.
- Worker rollback posture: scale to zero first; do not restore the historical
  worker unless fail-closed variables are reconfirmed.
- Database rollback posture: restore from backup
  `9b961055-4f2e-4cb2-aae6-a348f2b4cd5f`; migrations are forward-only and the
  isolated restore receipt is the recovery proof.
- Automatic rollback was not triggered because both exact deployments passed.
