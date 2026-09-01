# Selena AI Visibility v1.3 — orchestration state

Updated: `2026-09-01` after staging migration `0053`, exact worker deployment
and the fail-closed additional diagnostic preflight.

## Current state

- State: `STAGING_0053_EXACT_RUNTIME_PASS_CANARY_OUTCOME_UNKNOWN_ACCEPTANCE_HOLD`
- Context mode: `repository_only`
- Branch: `feature/selena-visibility-v1-2-1`
- Accepted implementation source: `100d34d8` (PR head before this evidence-only update)
- Canary-time feature HEAD: `3872a396dabfb6763b2b93f70ea3c521f12d8688`
- Evidence baseline before this update: `8c5a8948143feac7738df50c274459e23d437ddb`
- Active exact staging web: `100d34d8`, deployment `10b51bd2…`, `SUCCESS`
- Superseded external staging web auto-deploy: release `5cbb7b25`
- Integrated release baseline: `5cbb7b256f286295a3dafdbeddc9aa46e24227f7`
- Original release comparison snapshot: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Historical draft PR reference: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Canary-time feature-head required checks: `ALL PASS`
- Accepted implementation-source checks: `ALL PASS`
- Production deploy/DB mutations: `0`
- Provider triggers: `1`, the historical authorized one-shot canary only; the
  additional diagnostic preflight made `0` provider calls
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
- One additional diagnostic trigger is owner-authorized, but remains unused:
  exact source `100d34d8` is bound to the already reserved once-only execution
  identity. The immutable reservation is not deleted or bypassed.
- Steady runtime provider execution remains disabled after the canary.
- Secret values must never be read, printed or committed.

## Parallel stream outcome

| Stream | Result | Current boundary |
|---|---|---|
| Provider | `PASS_COST / HOLD_OUTCOME_UNKNOWN / DIAGNOSTIC_BLOCKED_SAFE` | Exactly one historical trigger ran. The additional exact-worker command stopped at `MASTER_PROVIDER_GATE_CLOSED` with `providerCalls=0`, zero retries and cost `USD 0`. |
| Database/Evidence | `PASS_0053_CANARY_HOLD` | Fresh pre-`0053` backup exists; journal is `54/1787940015000`; post-`0053` schema/RLS proof passed. The original durable reservation and interrupted lifecycle remain immutable. |
| HoReCa Product | `PASS_HOSTED` | Exact active deployment `10b51bd2…` passed authenticated DOM and visual review with projects at left and the six tools across the top. |
| Orchestrator | `STAGING_CORE_PASS` | Release `5cbb7b25` is integrated into `100d34d8`; exact-source CI, exact staging web/worker and migration `0053` reconciliation passed. |

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
| Fresh backup | `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`, pre-`0053`, no expiry |
| Isolated restored service | `a34b2749-130a-47f3-8da3-8f58e3775fe9`, healthy restored copy |
| Active reconciled web | `10b51bd2-ff1b-41a7-b9f8-6d628ea9f8f0`, exact archive `100d34d8`, `SUCCESS/RUNNING`, image `sha256:b92d8e81a26aa20127b681f153bfb32d798673e4128009019fb44101006f1536` |
| Superseded external web drift | release `5cbb7b25`; replaced by the exact accepted implementation deployment |
| Active exact worker | `b26865a7-57c4-4fdb-a1a0-567172b10619`, archive `100d34d8`, `SUCCESS/RUNNING`, image `sha256:b546171d7606994e3bf5cd1707ae44802a452613917f0704a6d5e896b812a976` |
| Runtime DB role | `selena_app`, non-owner, no superuser/createdb/createrole/bypassrls |
| Migration frontier | `0053`, journal `54/1787940015000`; deployment `76fe0d58…` exited `0` |
| Post-`0053` proof | `selena_app` non-owner/no bypass; FORCE RLS, ordinal column, validated check, unique index and insert guard all present |
| Provider canary | One trigger; receipt `OUTCOME_UNKNOWN` / `LIFECYCLE_OUTCOME_UNKNOWN`; no retry allowed or performed |
| Additional diagnostic | Fail-closed preflight `MASTER_PROVIDER_GATE_CLOSED`; `providerCalls=0`, cost `USD 0`, authorization unused |
| Canary reservation | One durable reservation; approved cap `USD 0.25` |
| Canary cost | Bright Data Cost explorer: Google AI Mode Search `1 record`, displayed cost `USD 0.00`; account cash consumed `USD 0.00`. Unrounded one-record list-price calculation `USD 0.0015` remains an estimate, not a charge. |
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
   `OUTCOME_UNKNOWN/LIFECYCLE_OUTCOME_UNKNOWN`. No retry is allowed. Billing
   attribution is closed: one Google AI Mode Search record, displayed cost and
   account cash consumption both `USD 0.00`.
2. `HOLD_DIAGNOSTIC_IDENTITY`: exact source `100d34d8` accepts only the already
   reserved once-only identity. A real second trigger needs a separately
   reviewed identity patch and exact-source authorization; deleting the
   reservation is prohibited.
3. `NO_GO`: production and PR merge while the provider hold remains open.

## Rollback posture

- Web rollback source: prior successful deployment
  `cc89f46b-b548-4216-a546-362051e98ecd`.
- Worker rollback posture: scale to zero first; do not restore the historical
  worker unless fail-closed variables are reconfirmed.
- Database rollback posture: restore from fresh pre-`0053` backup
  `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`; migrations are forward-only and the
  isolated restore receipt is the recovery proof.
- Automatic rollback was not triggered. The provider result is held for
  reconciliation, steady runtime is safely off, and exact `100d34d8` is the
  active accepted staging web implementation.
