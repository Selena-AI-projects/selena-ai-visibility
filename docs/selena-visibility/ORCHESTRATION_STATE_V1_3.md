# Selena AI Visibility v1.3 — orchestration state

Updated: `2026-09-02` after diagnostic-2, mandatory worker rollback, exact-web
drift recovery, first-party Bright Data payload/cost reconciliation, bounded
snapshot remediation, release-head integration evidence and staging dry-run.

## Current state

- State: `STAGING_CORE_PASS_HISTORICAL_PAYLOAD_VALIDATED_PERSISTENCE_HOLD`
- Context mode: `repository_only`
- Branch: `feature/selena-visibility-v1-2-1`
- Accepted staging implementation source: `100d34d8`
- Diagnostic-2 runtime source: `a9d1f373c48b64127873b34016ce398eabe00c3f`
- Sanitized trigger-diagnostics source before this evidence update: `4f701b35`
- Bounded snapshot-download remediation source: `4a1fd948`
- Last complete exact-head PR receipt: `1f3dd9d7f6e48e9e675b4e1cc16b7e6c7061819`
- Canary-time feature HEAD: `3872a396dabfb6763b2b93f70ea3c521f12d8688`
- Active exact staging web: `100d34d8`, deployment `835aca8d-2a47-4bad-af75-d7f4920cd35b`, restored after
  automatic release drift
- Active worker after diagnostic rollback: `100d34d8`, deployment `9275a824-281d-4afa-8098-1ed7184ffc68`,
  `SUCCESS`
- Integrated release baseline: `5cbb7b256f286295a3dafdbeddc9aa46e24227f7`
- Current remote release head: `4400d4352042eba73a6364ab3fafd29664c2d194`
- Latest release integration merge: `84cce314`
- Current source-only reconciliation patch: `b01a310b`, carried by follow-up
  PR [#108](https://github.com/parkourcafe/selena-ai-visibility/pull/108);
  provider capture and journal READY timestamps are separate and idempotent
  replay/dry-run invariants are hardened.
- Current release-integrated source head: `f4b1418d`; final PR #108 checks are
  green, including bounded replay through disposable migration `0054`.
- Original release comparison snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Historical draft PR reference: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Canary-time feature-head required checks: `ALL PASS`
- Release-integrated exact-head checks: `ALL PASS` at `f4b1418d`; PR #96 and
  follow-up PR #108 are `CLEAN/MERGEABLE`; E2E timeout and migration-frontier
  patches are green
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
| Provider | `PASS_HISTORICAL_PAYLOAD / HOLD_PERSISTENCE_AND_DIAGNOSTIC` | Historical identity is exactly bound to provider snapshot `sd_mtiflifw2lfu6ne28l`; its one-record payload has a non-empty answer and four normalized citations. Diagnostic-2 ended `TRIGGER_OUTCOME_UNKNOWN` without a snapshot ID, retry or new billable record. |
| Database/Evidence | `PASS_0053_CANARY_HOLD / SOURCE_RECONCILIATION_READY` | Fresh pre-`0053` backup exists; journal is `54/1787940015000`; post-`0053` schema/RLS proof passed. The offline path is locally green and unrun against staging. Both reservations remain immutable. |
| HoReCa Product | `PASS_HOSTED_RESTORED` | Automatic `4400d435` web drift was detected and exact `100d34d8` restored. The exact-source authenticated receipt separates projects at left from tools across the top. |
| Orchestrator | `STAGING_CORE_PASS / PROVIDER_PERSISTENCE_HOLD` | Exact staging implementation and release-integrated CI passed; worker rollback and web drift recovery are terminal `SUCCESS`. Historical provider payload is reconciled read-only; no retroactive capture write or new call occurred. Release `4400d435` is integrated by merge `84cce314`; PR is not merged. |

Independent Codex cross-audits found no P0/P1 in the material provider,
database/evidence and HoReCa changes through `8cc0b87b`. Commit `d4ac606a`
only enabled the intentional stub recurring worker in disposable CI. Commit
`2d023470` only made a real-time timeout test deterministic. All required CI
checks passed on canary-time feature HEAD `3872a396`; current candidate
`100d34d8` adds the release merge and bounded `0045` historical-hash handling.
Its final source CI and exact hosted web reconciliation passed. Commit
`a9d1f373` adds only the immutable diagnostic-2 identity contract and its test;
its manually dispatchable workflows passed. Release-integrated evidence head
`4a1fd948` passed the complete PR suite. Source `4f701b35` adds only redacted
trigger failure categories and deterministic mocked tests; it cannot
retroactively identify diagnostic-2's generic `TRIGGER_OUTCOME_UNKNOWN`.
Source `4a1fd948` corrects the independently proved historical download defect:
control responses remain limited to 1 MB while snapshot downloads are bounded
at 4 MiB. It does not enable a trigger, retry or recurring path.

## CI state

- Last complete exact-head receipt: `1f3dd9d7f6e48e9e675b4e1cc16b7e6c7061819`
- Build, E2E, Scheduling, Smoke, License and CLA: `ALL PASS`
- PR merge aggregation at that receipt: PR #96 `open`, `mergeable=true`,
  `mergeable_state=clean`; merge remains intentionally unexecuted
- Merge-resolution tests: lib migration runner `10/10`; CLI migration image
  contract `2/2`
- Hosted deployment equality: `PASS_RESTORED`; exact git archive `100d34d8`
  replaced automatic release drift.
- The E2E scheduling workflow now requires a real-PostgreSQL no-op replay through
  the current disposable release frontier `54/0054`; shared staging remains
  bounded at `0053`. The current PR-head E2E check is its authoritative receipt.

Previously recorded local source gates: lint `0 errors / 129 warnings / 12 infos`, typecheck
`13/13`, tests `16/16` tasks, Impeccable detect `PASS`, build `16/16`.
Focused Bright Data timeout stability: `20/20`. Focused Local Maps stability:
five replays, `73/73` tests per replay. Trigger taxonomy source `4f701b35`
passed lib typecheck, `1086/1086` lib tests, the same root lint baseline and
root build `16/16` locally. Snapshot-cap source `4a1fd948` passed its focused
provider suite `19/19` and targeted Biome check. Current reconciliation focused
gates are lib `16/16`, worker `23/23`, both check-types, targeted Biome and diff
check; exact-head CI is green on PR #108.

## Staging receipts

| Item | Receipt |
|---|---|
| Fresh backup | `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`, pre-`0053`, no expiry |
| Isolated restored service | `a34b2749-130a-47f3-8da3-8f58e3775fe9`, healthy restored copy |
| Active reconciled web | `835aca8d-2a47-4bad-af75-d7f4920cd35b`, exact archive `100d34d8`, `SUCCESS`; replaces automatic release drift; public app and both setup-status endpoints returned 200 |
| Superseded external web drift | releases `5cbb7b25`, `2e21ef04` and `4400d435`; all were replaced by exact accepted implementation deployments |
| Active rollback worker | `9275a824-281d-4afa-8098-1ed7184ffc68`, archive `100d34d8`, `SUCCESS`; temporary diagnostic deployment is `REMOVED` |
| Runtime DB role | `selena_app`, non-owner, no superuser/createdb/createrole/bypassrls |
| Migration frontier | `0053`, journal `54/1787940015000`; deployment `76fe0d58…` exited `0` |
| Migration no-op replay | `b7b7fa33-6da8-49a0-835f-d76b74e9fafb`, sealed max index `53`, journal `54/1787940015000` → `54/1787940015000`, TLS verified, exit `0` |
| Post-`0053` proof | `selena_app` non-owner/no bypass; FORCE RLS, ordinal column, validated check, unique index and insert guard all present |
| Provider canaries | Historical: exact snapshot `sd_mtiflifw2lfu6ne28l`, provider `READY`, one validated payload record; diagnostic-2: `OUTCOME_UNKNOWN/TRIGGER_OUTCOME_UNKNOWN`; one trigger each, zero retries, recurring false |
| Diagnostic-2 reservation | `db:e432156c-7f5d-40ef-ad40-72a883affac9`; cap `USD 0.25`; internal cost status `UNKNOWN/REQUIRED`; immutable |
| Diagnostic-2 lifecycle | No `snapshotReference`, record count or new lifecycle event; command terminal in `0.34s`; no retry authorized |
| Canary cost | First-party post-diagnostic exports: Google AI Mode Search `1 record`, `USD 0.0015` total for 1 September. Because the same one record existed before diagnostic-2, diagnostic-2 added `0` records and `USD 0.0000` incremental billing. |
| Historical payload | Read-only download: 1,543,419 bytes, file SHA-256 `bfb2ebcae1b69d20573f62e46aa5b586bacaedf8b9e617753b42a4b7a8d64c5a`; immutable schema-discovery validation passed with canonical hash `sha256:7b465dc14c050742f77fd37ecca4c64c5ff1f92eb30a945a9f60d688a8e3721f`, one record, non-empty answer and four normalized citations. |
| Reconciliation dry-run | `DRY_RUN_ROLLED_BACK`; restored worker returned `providerCalls=0`, no evidence/cost/acceptance rows and `HOLD`; irreversible persistence commit was not run. |
| Snapshot journal | Exact raw ID match: `TRIGGERED -> PENDING -> PENDING -> READY -> INTERRUPTED`, first event `08:54:47.108Z`; one tenant/project/dataset; no capture persistence |
| Runtime logs | Steady provider path disabled after the canary; recurring scheduler disabled; pg-boss started; handlers ready |
| Browser | Both health endpoints 200; HoReCa unauth redirect correct; authenticated project-rail/tool-axis DOM and visual review passed; page-origin errors 0 |
| API | Two scoped tenants isolated; invalid key 401; fixtures removed |
| RLS | Same-tenant positive and cross-tenant/private negatives passed; proof rolled back |
| Replay | Concurrent winner 1; stable replay; active mutation blocked; expired fixture removed |

## Credential state

Owner-confirmed names-only rotation: `BRIGHTDATA`, `OPENAI`, `OPENROUTER`,
`RESEND`, `GITHUB`, staging Postgres. Active application DB connectivity is
proved with the rotated `selena_app` binding. After a Railway tunnel diagnostic
unexpectedly exposed the administration value in restricted tool output, the
staging PostgreSQL owner role and sealed Railway variable were rotated again.
A values-suppressed TCP probe passed and temporary rotation material was
destroyed; no value is retained in source or this report.

Status: `PASS_ADMIN_BINDING_ROTATED_AGAIN`.

## Remaining gates

1. `HOLD_PROVIDER_PERSISTENCE`: historical identity, provider snapshot, payload
   and cost are reconciled. The staging dry-run returned
   `DRY_RUN_ROLLED_BACK` with no provider call, evidence, cost or acceptance
   writes. No retroactive capture write is authorized or fabricated. Diagnostic-2
   remains `TRIGGER_OUTCOME_UNKNOWN` and neither immutable identity may be retried.
2. `NO_GO`: production, production DB, recurring jobs, Social/Travel and any
   additional provider call remain prohibited.

## Rollback posture

- Web rollback source: prior successful deployment
  `cc89f46b-b548-4216-a546-362051e98ecd`.
- Worker rollback completed: exact `100d34d8` deployment `9275a824…` is active;
  logs confirm recurring scheduler disabled, legacy provider execution disabled,
  pg-boss started and handlers ready.
- Database rollback posture: restore from fresh pre-`0053` backup
  `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`; migrations are forward-only and the
  isolated restore receipt is the recovery proof.
- The mandatory diagnostic worker rollback completed. Exact web was separately
  restored after automatic release drift. Provider results remain held for
  reconciliation and steady runtime is safely off.
