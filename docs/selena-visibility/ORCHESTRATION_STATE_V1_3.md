# Selena AI Visibility v1.3 — orchestration state

## Authoritative current state — 2026-09-02

- State: `SOURCE_CI_MERGE_PASS / STAGING_0056_HOLD / PRODUCTION_NO_GO`.
- Exact implementation source head:
  `b9d967b668ba884b524ee7202060f5446abb58ad`.
- Branch: `feature/selena-visibility-v1-2-1`; exact implementation
  `b9d967b6`, green documentation overlay and PR head `a8522067`.
- Release lineage: pre-merge release `223f2681`, local integration merge
  `81721f6d`, owner squash merge and current release head `a8b15116`.
- Source database frontier: `57 entries / 0056`; last evidenced shared staging
  frontier: `54 entries / 0053`.
- `0056` architecture: direct owner/control-plane session only, table-owner
  identity plus `SUPERUSER/BYPASSRLS`, fail-closed preflight before DDL, no
  `selena_app` raw-payload grant, reciprocal immutable receipt/audit rows.
- Exact source tests: first reconciliation creates one private snapshot and one
  audit row; dry-run rolls back; replay returns `ALREADY_RECONCILED`; duplicate
  snapshot/audit/evidence/cost/acceptance rows remain zero; provider calls `0`.
- Local quality: focused final suite `74/74`, disposable PostgreSQL proof
  `PASS`, root tests `16/16`, root build `16/16`, lint `0 errors` with `129`
  warnings and `12` infos, Local Maps stability `3 × 11/11`.
- Impeccable: `NOT_SUPPORTED` because no workspace binary exists.
- PR [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96):
  `MERGED` at `2026-09-02T06:31:55Z`; all six checks passed; merge commit
  `a8b151162a849eec899382b550a948edb40b399c`.
- PR [#108](https://github.com/parkourcafe/selena-ai-visibility/pull/108):
  `OPEN`, remote head `a4d05d47`, `CONFLICTING/DIRTY`; its green checks are
  historical and do not cover `970aa54d`.
- CI for implementation `b9d967b6` plus overlay `a8522067`: `PASS`. Build
  [33596500999](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33596500999),
  E2E/Scheduling
  [33596501001](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33596501001),
  License [33596501017](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33596501017),
  Smoke [33596501053](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33596501053)
  and CLA [33596500997](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33596500997)
  all succeeded. Run
  [33596117669](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33596117669)
  on the preceding PR head failed only because the disposable replay ceiling
  was stale at `54`; `b9d967b6` raises that CI-only ceiling to source index `56`
  and locks the invariant with a test.
- Shared staging mutation/deploy/provider execution in this source closure:
  `0`; production, recurring, billing and Social/Travel remain prohibited. The
  source merge was completed by the owner.
- Protected `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md`: untouched, untracked,
  excluded from every commit.

Next gate: a documentation-only post-merge follow-up PR. After its CI receipt,
return to the owner before any shared-staging `0054–0056` action.

## Historical orchestration ledger

The remainder is retained as dated hosted evidence. Its words "current" and
"final" refer to the older receipt that contained them, not to the source head
above.

## Historical state

- State: `STAGING_CORE_PASS_HISTORICAL_PAYLOAD_VALIDATED_PRIVATE_RECONCILIATION_HOLD`
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
- Active worker after diagnostic rollback: `100d34d8`, deployment `b583e695-e935-4e2f-b6c5-f13b135964d4`,
  `SUCCESS`
- Integrated release baseline: `5cbb7b256f286295a3dafdbeddc9aa46e24227f7`
- Current remote release head: `4400d4352042eba73a6364ab3fafd29664c2d194`
- Latest release integration merge: `84cce314`
- Current source-only reconciliation patch: `b01a310b`, carried by follow-up
  PR [#108](https://github.com/parkourcafe/selena-ai-visibility/pull/108);
  provider capture and journal READY timestamps are separate and idempotent
  replay/dry-run invariants are hardened.
- Historical private capture persistence: `PERSISTED_PRIVATE` from temporary
  worker deployment `78de5973-d6c5-446a-b8c9-390c1c273ee9`; idempotent replay
  hit the intentional non-owner snapshot SELECT boundary and made no duplicate
  write.
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
| Database/Evidence | `PASS_0053_CANARY_HOLD / PRIVATE_RECONCILED / IDEMPOTENCY_VERIFY_HOLD` | Fresh pre-`0053` backup exists; journal is `54/1787940015000`; post-`0053` schema/RLS proof passed. Historical capture persistence receipt is `PERSISTED_PRIVATE` from temporary worker deployment `78de5973-d6c5-446a-b8c9-390c1c273ee9` (one source snapshot + one audit row, no evidence/cost/acceptance rows). Replay was blocked by intentional `selena_app` SELECT denial on private snapshots; no duplicate write occurred. Both reservations remain immutable. |
| HoReCa Product | `PASS_HOSTED_RESTORED` | Automatic `4400d435` web drift was detected and exact `100d34d8` restored. The exact-source authenticated receipt separates projects at left from tools across the top. |
| Orchestrator | `STAGING_CORE_PASS / PRIVATE_RECONCILIATION_HOLD` | Exact staging implementation and release-integrated CI passed; worker rollback and web drift recovery are terminal `SUCCESS`. Historical provider payload has one immutable private capture and one audit row; replay validation is hardened, but formal evidence acceptance remains on hold because owner-only staging verification cannot authenticate. PR #96 is open at `399a605a` and is not merged. |

Independent Codex cross-audits found no remaining P0/P1 in the material provider,
database/evidence and HoReCa changes after the reconciliation hardening in
`b01a310b`. Commit `d4ac606a`
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

- Documentation/evidence head `399a605a` completed Build, E2E, Scheduling,
  Smoke, License and CLA green (E2E run `33578329505` completed SUCCESS).
- PR #96 is open at `399a605a`; GitHub reports `mergeable=true` and
  `mergeable_state=clean`. Merge remains intentionally unexecuted.
- Documentation/evidence commit `eb82c8269724e66662abf3532b2ff15cea54c5e5`
  passed Build [33574858750](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33574858750),
  E2E/Scheduling [33574858710](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33574858710),
  Smoke [33574858731](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33574858731),
  License [33574858545](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33574858545)
  and CLA [33574858503](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33574858503).
- Last complete exact-head receipt: `1f3dd9d7f6e48e9e675b4e1cc16b7e6c7061819`
- Build, E2E, Scheduling, Smoke, License and CLA: `ALL PASS`
- PR #96 is open at documentation/evidence head `399a605a`; GitHub reports
  `mergeable=true` with aggregation `clean`; merge remains intentionally
  unexecuted
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
| Active rollback worker | `b583e695-e935-4e2f-b6c5-f13b135964d4`, archive `100d34d8`, `SUCCESS`; temporary reconciliation deployment `78de5973-d6c5-446a-b8c9-390c1c273ee9` completed and was replaced |
| Runtime DB role | `selena_app`, non-owner, no superuser/createdb/createrole/bypassrls |
| Migration frontier | `0053`, journal `54/1787940015000`; deployment `76fe0d58…` exited `0` |
| Migration no-op replay | `b7b7fa33-6da8-49a0-835f-d76b74e9fafb`, sealed max index `53`, journal `54/1787940015000` → `54/1787940015000`, TLS verified, exit `0` |
| Post-`0053` proof | `selena_app` non-owner/no bypass; FORCE RLS, ordinal column, validated check, unique index and insert guard all present |
| Provider canaries | Historical: exact snapshot `sd_mtiflifw2lfu6ne28l`, provider `READY`, one validated payload record; diagnostic-2: `OUTCOME_UNKNOWN/TRIGGER_OUTCOME_UNKNOWN`; one trigger each, zero retries, recurring false |
| Diagnostic-2 reservation | `db:e432156c-7f5d-40ef-ad40-72a883affac9`; cap `USD 0.25`; internal cost status `UNKNOWN/REQUIRED`; immutable |
| Diagnostic-2 lifecycle | No `snapshotReference`, record count or new lifecycle event; command terminal in `0.34s`; no retry authorized |
| Canary cost | First-party post-diagnostic exports: Google AI Mode Search `1 record`, `USD 0.0015` total for 1 September. Because the same one record existed before diagnostic-2, diagnostic-2 added `0` records and `USD 0.0000` incremental billing. |
| Historical payload | Read-only download: 1,543,419 bytes, file SHA-256 `bfb2ebcae1b69d20573f62e46aa5b586bacaedf8b9e617753b42a4b7a8d64c5a`; immutable schema-discovery validation passed with canonical hash `sha256:7b465dc14c050742f77fd37ecca4c64c5ff1f92eb30a945a9f60d688a8e3721f`, one record, non-empty answer and four normalized citations. |
| Reconciliation | Commit receipt `PERSISTED_PRIVATE` (`providerCalls=0`, one source snapshot + one audit row, no evidence/cost/acceptance rows); idempotent replay hit intentional non-owner SELECT denial and produced no duplicate write. |
| Owner-scoped verification | `BLOCKED_ACCESS` — existing reconciliation service points to a separate disposable database (target rows absent); staging Postgres owner shell exposes credentials but authentication fails after rotation. No `selena_app` grants were changed and no mutation was attempted. |
| Snapshot journal | Exact raw ID match: `TRIGGERED -> PENDING -> PENDING -> READY -> INTERRUPTED`, first event `08:54:47.108Z`; recovery appended `RESUMED -> READY -> DELIVERED` in the same transaction as the private capture; one tenant/project/dataset |
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

1. `HOLD_OWNER_READ`: historical identity, provider snapshot, payload and cost
   are reconciled and source replay validation is hardened. The staging dry-run
   returned `DRY_RUN_ROLLED_BACK` with no provider call, evidence, cost or
   acceptance writes. Owner-only verification against the actual staging
   Postgres is still blocked by password authentication failure; do not bypass
   RLS or expand `selena_app`. Diagnostic-2 remains `TRIGGER_OUTCOME_UNKNOWN` and
   neither immutable identity may be retried.
2. `NO_GO`: production, production DB, recurring jobs, Social/Travel and any
   additional provider call remain prohibited.

## Rollback posture

- Web rollback source: prior successful deployment
  `cc89f46b-b548-4216-a546-362051e98ecd`.
- Worker rollback completed: exact `100d34d8` deployment `b583e695…` is active;
  logs confirm recurring scheduler disabled, legacy provider execution disabled,
  pg-boss started and handlers ready.
- Database rollback posture: restore from fresh pre-`0053` backup
  `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`; migrations are forward-only and the
  isolated restore receipt is the recovery proof.
- The mandatory diagnostic worker rollback completed. Exact web was separately
  restored after automatic release drift. Provider results remain held for
  reconciliation and steady runtime is safely off.
