# Selena AI Visibility v1.3 — orchestration state

Updated: `2026-09-01` after diagnostic-2, mandatory worker rollback, exact-web
drift recovery and first-party Bright Data cost reconciliation.

## Current state

- State: `STAGING_CORE_PASS_TWO_CANARY_OUTCOMES_UNKNOWN_MERGE_HEAD_CI_PENDING`
- Context mode: `repository_only`
- Branch: `feature/selena-visibility-v1-2-1`
- Accepted staging implementation source: `100d34d8`
- Diagnostic-2 source and PR HEAD before this evidence update:
  `a9d1f373c48b64127873b34016ce398eabe00c3f`
- Canary-time feature HEAD: `3872a396dabfb6763b2b93f70ea3c521f12d8688`
- Active exact staging web: `100d34d8`, deployment `c3002c7d…`, restored after
  automatic `release@2e21ef04` drift
- Active worker after diagnostic rollback: `100d34d8`, deployment `73ee9186…`,
  `SUCCESS`
- Integrated release baseline: `5cbb7b256f286295a3dafdbeddc9aa46e24227f7`
- Current remote release head: `2e21ef04e3a0a87d0bd103b15603a23775dad6ab`
- Release integration merge: `34d864176c831a78741f504e0f9eda8d69d1e0fc`
- Original release comparison snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Historical draft PR reference: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Canary-time feature-head required checks: `ALL PASS`
- Accepted implementation-source checks: `ALL PASS`
- Production deploy/DB mutations: `0`
- Provider triggers: `2`, one for each separately authorized immutable
  identity; retries `0`, recurring `false`
- Diagnostic-2 provider capture/lifecycle events: `0`; durable reservation: `1`
- Recurring managed schedules after worker start: `0`
- PR merge: `NOT_EXECUTED`

The untracked `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untouched
and excluded from every commit and archive.

## Owner constraints in force

- Shared staging is the public pre-launch acceptance runtime.
- `app.selenasystems.com` and `staging.selenasystems.com` remain on staging.
- Production, production DB, recurring jobs and Social/Travel activation are
  prohibited.
- The diagnostic-2 authorization is consumed. No additional provider call,
  retry, execution identity or cost-cap increase is authorized.
- Steady runtime provider execution remains disabled after the canary.
- Secret values must never be read, printed or committed.

## Parallel stream outcome

| Stream | Result | Current boundary |
|---|---|---|
| Provider | `PASS_COST / HOLD_TWO_OUTCOMES_UNKNOWN` | Historical and diagnostic-2 identities each made one call. Diagnostic-2 ended `TRIGGER_OUTCOME_UNKNOWN` without a snapshot ID, retry or new billable record. |
| Database/Evidence | `PASS_0053_CANARY_HOLD` | Fresh pre-`0053` backup exists; journal is `54/1787940015000`; post-`0053` schema/RLS proof passed. Both reservations remain immutable. |
| HoReCa Product | `PASS_HOSTED_RESTORED` | Automatic `2e21ef04` web drift was detected and exact `100d34d8` restored. The exact-source authenticated receipt separates projects at left from tools across the top. |
| Orchestrator | `STAGING_CORE_PASS / FINAL_CI_PENDING` | Exact staging implementation and diagnostic CI passed; worker rollback and web drift recovery are terminal `SUCCESS`. Release `2e21ef04` is integrated by merge `34d86417`; PR merge is not executed. |

Independent Codex cross-audits found no P0/P1 in the material provider,
database/evidence and HoReCa changes through `8cc0b87b`. Commit `d4ac606a`
only enabled the intentional stub recurring worker in disposable CI. Commit
`2d023470` only made a real-time timeout test deterministic. All required CI
checks passed on canary-time feature HEAD `3872a396`; current candidate
`100d34d8` adds the release merge and bounded `0045` historical-hash handling.
Its final source CI and exact hosted web reconciliation passed. Commit
`a9d1f373` adds only the immutable diagnostic-2 identity contract and its test;
its manually dispatchable exact-head workflows passed.

## CI state

- Diagnostic source: `a9d1f373c48b64127873b34016ce398eabe00c3f`
- Exact-head manually dispatchable workflows: Build, E2E, Scheduling, Smoke,
  License `ALL PASS`
- PR merge aggregation: `HOLD`; PR #96 is `open`, `mergeable=false`,
  `mergeable_state=dirty` in the pre-merge API snapshot; refresh pending after
  pushing merge `34d86417`
- Merge-resolution tests: lib migration runner `10/10`; CLI migration image
  contract `2/2`
- Hosted deployment equality: `PASS_RESTORED`; exact git archive `100d34d8`
  replaced automatic release drift.

Previously recorded local source gates: lint `0 errors / 129 warnings / 12 infos`, typecheck
`13/13`, tests `16/16` tasks, Impeccable detect `PASS`, build `16/16`.
Focused Bright Data timeout stability: `20/20`. Focused Local Maps stability:
five replays, `73/73` tests per replay.

## Staging receipts

| Item | Receipt |
|---|---|
| Fresh backup | `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`, pre-`0053`, no expiry |
| Isolated restored service | `a34b2749-130a-47f3-8da3-8f58e3775fe9`, healthy restored copy |
| Active reconciled web | `c3002c7d-e789-4236-9e55-2df00529ae37`, exact archive `100d34d8`, `SUCCESS`, image `sha256:0f43cfae75ff6f550d891e7f6430052cd167192ef53a2d809d9d8f5473ed05f3`; replaces automatic release deployment `b5ca2d0f…` (`2e21ef04`) |
| Superseded external web drift | releases `5cbb7b25` and `2e21ef04`; both were replaced by exact accepted implementation deployments |
| Active rollback worker | `73ee9186-5df2-4b4c-a578-fb8e988c86f6`, archive `100d34d8`, `SUCCESS`; diagnostic-2 deployment `de5df16a…` is `REMOVED` |
| Runtime DB role | `selena_app`, non-owner, no superuser/createdb/createrole/bypassrls |
| Migration frontier | `0053`, journal `54/1787940015000`; deployment `76fe0d58…` exited `0` |
| Post-`0053` proof | `selena_app` non-owner/no bypass; FORCE RLS, ordinal column, validated check, unique index and insert guard all present |
| Provider canaries | Historical: `OUTCOME_UNKNOWN/LIFECYCLE_OUTCOME_UNKNOWN`; diagnostic-2: `OUTCOME_UNKNOWN/TRIGGER_OUTCOME_UNKNOWN`; one call each, zero retries, recurring false |
| Diagnostic-2 reservation | `db:e432156c-7f5d-40ef-ad40-72a883affac9`; cap `USD 0.25`; internal cost status `UNKNOWN/REQUIRED`; immutable |
| Diagnostic-2 lifecycle | No `snapshotReference`, record count or new lifecycle event; command terminal in `0.34s`; no retry authorized |
| Canary cost | First-party post-diagnostic exports: Google AI Mode Search `1 record`, `USD 0.0015` total for 1 September. Because the same one record existed before diagnostic-2, diagnostic-2 added `0` records and `USD 0.0000` incremental billing. |
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

1. `HOLD_PROVIDER_TERMINAL`: both immutable calls have unknown terminal
   provider outcomes. Neither call may be retried. Billing attribution is
   closed at one Google AI Mode record and `USD 0.0015` total for the day.
2. `HOLD_FINAL_CI`: release head `2e21ef04` is integrated by merge `34d86417`.
   Exact-head CI and the refreshed PR mergeability result remain required. No
   PR merge is executed.
3. `NO_GO`: production, production DB, recurring jobs, Social/Travel and any
   additional provider call remain prohibited.

## Rollback posture

- Web rollback source: prior successful deployment
  `cc89f46b-b548-4216-a546-362051e98ecd`.
- Worker rollback completed: exact `100d34d8` deployment `73ee9186…` is active;
  logs confirm recurring scheduler disabled, legacy provider execution disabled,
  pg-boss started and handlers ready.
- Database rollback posture: restore from fresh pre-`0053` backup
  `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`; migrations are forward-only and the
  isolated restore receipt is the recovery proof.
- The mandatory diagnostic worker rollback completed. Exact web was separately
  restored after automatic release drift. Provider results remain held for
  reconciliation and steady runtime is safely off.
