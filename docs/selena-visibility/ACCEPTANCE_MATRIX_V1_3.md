# Selena AI Visibility v1.3 — hosted acceptance matrix

Evidence date: `2026-09-01`. This document is the canonical post-hosted
acceptance snapshot. Earlier pre-mutation candidates remain Git history only.

## Canonical anchors

- Accepted staging implementation source: `100d34d8` (merge parent
  `5cbb7b25`; canonical `0045`, follow-up `0053`, exact historical-hash
  compatibility gate)
- First-canary feature HEAD: `3872a396dabfb6763b2b93f70ea3c521f12d8688`
- Diagnostic-2 source and current PR HEAD before this evidence update:
  `a9d1f373c48b64127873b34016ce398eabe00c3f`
- Active worker implementation source after mandatory rollback: `100d34d8`
- Integrated release parent: `5cbb7b256f286295a3dafdbeddc9aa46e24227f7`
- Current remote release head: `2e21ef04e3a0a87d0bd103b15603a23775dad6ab`
  (`Bound migrations to the reviewed release ceiling`)
- Release integration merge: `34d864176c831a78741f504e0f9eda8d69d1e0fc`
  (parents `3b1118e9` and `2e21ef04`)
- Original release snapshot retained for lineage: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Draft PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Protected untracked `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md`: untouched and excluded.

The accepted implementation source, both canary source identities and active
runtime are separate evidence anchors. Railway twice auto-deployed a release
branch over the accepted two-axis UI: first `5cbb7b25`, then `2e21ef04`. The
second drift was detected by a read-only deployment-list check and replaced by
an exact `100d34d8` archive deployment before this matrix was finalized.

## Decision

| Boundary | Decision | Reason |
|---|---|---|
| Source package | `PASS_SOURCE` | Provider, database/evidence and HoReCa streams are code-complete for the authorized v1.3 scope. Release `5cbb7b25` is merged and the applied-`0045` hash transition is bounded to one reviewed timestamp/hash pair. |
| Exact-head CI | `PASS_DIAGNOSTIC / PENDING_MERGE_HEAD` | Build, E2E, scheduling, smoke and license completed successfully on diagnostic source `a9d1f373`. Release integration `34d86417` resolved the two migration-runner conflicts and passed 12 targeted tests locally; final exact-head workflows must complete after push. |
| Staging database/RLS | `PASS` | Fresh backup `d2ac59a9…`, migrations through `0053`, actual non-owner runtime role, GUC, FORCE RLS and rollback-only cross-tenant proof were recorded. |
| Staging web/worker | `PASS_EXACT_WEB / PASS_ROLLBACK_WORKER` | Exact archive `100d34d8` is active on staging web. Worker was temporarily deployed from `a9d1f373` for diagnostic-2 and then returned to exact `100d34d8`. |
| Public/unauthenticated browser and scoped API | `PASS` | Browser smoke, authenticated API-key tenant fences and invalid-key response passed. |
| Authenticated human browser | `PASS` | Owner signed in interactively. AVLI and KORA routes, Local-first states, hidden-module boundary and sanitized customer payload passed without sharing credentials. |
| Google/Bright Data canary | `COST_PASS / OUTCOME_UNKNOWN / HOLD` | Two separately authorized immutable identities each made exactly one provider call. The historical call ended `OUTCOME_UNKNOWN/LIFECYCLE_OUTCOME_UNKNOWN`. Diagnostic-2 ended `OUTCOME_UNKNOWN/TRIGGER_OUTCOME_UNKNOWN` before a snapshot reference existed. Both used zero retries and `recurring=false`; no accepted provider capture exists. First-party billing exports show one Google AI Mode record and `USD 0.0015` total for the day, so diagnostic-2 added no billable record and `USD 0.0000` incremental cost. |
| Production/merge | `NO_GO` | Provider terminal outcome remains unresolved, PR #96 is `dirty`, production is prohibited and no merge was executed. |

Overall decision: `STAGING_CANARY_HOLD / PRE_PRODUCTION_NO_GO`.

## Diagnostic-head CI evidence

The manually dispatched exact-head workflows below passed against
`a9d1f373c48b64127873b34016ce398eabe00c3f`:

| Check | Result | Evidence |
|---|---|---|
| Build | `PASS` | [run 33502678567 / job 99839402251](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678567/job/99839402251) |
| E2E Integration Tests | `PASS` | [run 33502678587 / job 99839403550](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678587/job/99839403550) |
| Scheduling Policy Verification | `PASS` | [run 33502678587 / job 99839403329](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678587/job/99839403329) |
| Dependency License Audit | `PASS` | [run 33502678649 / job 99839403470](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678649/job/99839403470) |
| Deployment smoke | `PASS` | [run 33502678500 / job 99839403464](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678500/job/99839403464) |

The CLA workflow is not manually dispatchable. Its earlier PR check passed on
the accepted source lineage, but GitHub currently reports PR #96
`mergeable=false`, `mergeable_state=dirty`; therefore the matrix does not
claim an exact-head merge gate.

Recorded local root gates for diagnostic source `a9d1f373`:
lint `0 errors / 129 warnings / 12 infos`, typecheck `13/13`, tests `16/16`
tasks, Impeccable detect `PASS`, build `16/16`, `git diff --check` clean. The
warnings/infos are the registered root baseline and are non-blocking. Local Node
was `22.23.0`; CI used the required Node 24.

## Staging infrastructure evidence

| Gate | Result | Receipt |
|---|---|---|
| Fresh checkpoint | `PASS` | Pre-`0053` backup `d2ac59a9-fd4b-4bd1-afda-d6d999ef4dc4`, external snapshot reference present, no expiry. Earlier isolated restore receipt `a34b2749…` remains the recovery-path proof. |
| Isolated restore | `PASS` | Restore service `a34b2749-130a-47f3-8da3-8f58e3775fe9` became healthy and proved an actual restored copy. |
| Migration bound | `PASS` | Bounded runner deployment `76fe0d58-0fd8-4213-9b11-f852e72de7f8` applied only `0053`: journal `53/1787940014000` → `54/1787940015000`, runner exit `0`. |
| Post-`0053` schema/RLS | `PASS` | Values-suppressed readback proved `selena_app`, non-owner/no `BYPASSRLS`, FORCE RLS, `legacy_collision_ordinal`, validated nonnegative check, the three-column unique index and insert guard. |
| Runtime role | `PASS` | `current_user=selena_app`; `SUPER=false`, `BYPASS_RLS=false`, `CREATE_ROLE=false`, `CREATE_DB=false`. |
| Administration credential | `PASS` | After the owner-confirmed Postgres rotation, a values-suppressed count-only TCP probe through the service's sealed `POSTGRES_USER`/`POSTGRES_PASSWORD` binding returned `ADMIN_TCP=PASS`. |
| Tenant GUC | `PASS` | `SET LOCAL app.organization_id` succeeded through the active worker connection. |
| Hosted RLS proof | `PASS` | `current_user=selena_app`; `SELECT`/`INSERT` allowed; FORCE RLS active; cross-tenant insert failed with SQLSTATE `42501`; transaction ended in `ROLLBACK`; persisted fixture rows `0`. |
| Replay/concurrency/idempotency | `PASS` | Two concurrent writes produced one winner; replay was stable; cross-tenant read returned no row; active mutation was blocked; expired fixture cleaned up. |
| Exact web deploy | `PASS_RESTORED` | Earlier exact deployment `10b51bd2-ff1b-41a7-b9f8-6d628ea9f8f0` was superseded by automatic release deployment `b5ca2d0f-ff16-4752-ba36-c6a1f07e052f` (`2e21ef04`). Exact archive `100d34d8` was restored by deployment `c3002c7d-e789-4236-9e55-2df00529ae37`, image `sha256:0f43cfae75ff6f550d891e7f6430052cd167192ef53a2d809d9d8f5473ed05f3`, terminal `SUCCESS`. |
| Two-axis UI receipt | `PASS_RESTORED` | Authenticated post-restore DOM on `app.selenasystems.com/app/selena-horeca` proved `ПРОЕКТЫ` in the complementary project rail and `ИНСТРУМЕНТЫ` across the top with all six tool links. Both `/api/setup-status` endpoints returned HTTP 200. |
| Worker deploy | `PASS_ROLLBACK_EXACT` | Temporary diagnostic-2 deployment `de5df16a-2768-4541-8eaf-a6a33604c5b8` ran source `a9d1f373` and was removed. Rollback deployment `73ee9186-5df2-4b4c-a578-fb8e988c86f6` restored exact `100d34d8` and is `SUCCESS`. |
| Public health | `PASS` | `app.selenasystems.com`, `staging.selenasystems.com` and `/api/setup-status` returned HTTP 200. |
| Runtime containment | `PASS` | Logs: legacy provider execution disabled; recurring scheduler disabled and managed schedules removed; pg-boss started; handlers ready; no error-level log. |
| Canary trigger receipts | `HOLD` | Historical identity: `OUTCOME_UNKNOWN/LIFECYCLE_OUTCOME_UNKNOWN`. Diagnostic-2 identity `selena-v1-3-google-ai-mode-diagnostic-2`: `OUTCOME_UNKNOWN/TRIGGER_OUTCOME_UNKNOWN`. Each made `providerCalls=1`, retries `0`, `recurring=false`; neither produced an accepted provider capture. |
| Snapshot lifecycle journal | `PARTIAL/HOLD` | `TRIGGERED=1`, `PENDING=2`, `READY=1`, `INTERRUPTED=1`; no terminal provider outcome was proved. |
| Steady-state containment | `PASS` | Measurement off, emergency stop on, recurring off and billing off after the bounded trigger. |
| Diagnostic-2 reservation | `PASS_IMMUTABLE / CALL_CONSUMED` | Durable reservation `db:e432156c-7f5d-40ef-ad40-72a883affac9`, cap `USD 0.25`, `providerCalls=1`, `automaticRetries=0`, `retryAllowed=false`, `recurring=false`; internal cost reconciliation remains `UNKNOWN/REQUIRED`. |
| Diagnostic-2 lifecycle | `HOLD_TRIGGER_OUTCOME` | Receipt completed in `0.34s` with no `snapshotReference`, no record count and no new snapshot-lifecycle events after the call start. No retry or follow-up call is authorized. |
| Fixture cleanup | `PASS` | Temporary API organizations `0`; temporary idempotency rows `0`. |

The earlier administration-only credential mismatch is closed. After the
owner-confirmed Postgres rotation, a repeated values-suppressed TCP probe using
the service's sealed administration binding returned `ADMIN_TCP=PASS`. The
same SSH process did not authenticate through the local Unix socket because
that path applies local OS-user authentication and is not the Railway
application/admin TCP path. No credential value was read or printed.

Automatic release deployments `5cbb7b25` and later `2e21ef04` each superseded
an exact feature web deployment. Read-only Railway evidence caught the second
drift at deployment `b5ca2d0f…`; exact archive deployment `c3002c7d…` restored
`100d34d8`. This matrix treats release auto-deploy drift as an operational HOLD
unless the exact source is actively re-established and rechecked.

## API and browser evidence

- API-key acceptance created two explicitly named test tenants, each with one
  test project. Each key saw only its own project; the other tenant was
  invisible; an invalid key returned 401. All fixtures and keys were removed.
- Headless Chrome: home returned 200 with title `Selena Systems — AI
  Visibility`; unauthenticated HoReCa redirected to `/auth/login` with
  `returnTo=/app/selena-horeca`; console errors `0`, page errors `0`.
- The owner signed in interactively through the normal Chrome staging login;
  no credential was shared with the reviewer.
- AVLI Bali and KORA Food Hall each opened through the project selector with
  the selected project bound in the route and decision view.
- Both showed source-only preview, `Phase: Not confirmed`, independent `Not
  measured` / `Needs approval` / `Not assessed` states and no measurement-start
  control.
- Social/Travel were absent from the rendered DOM and from the JSON customer
  payloads observed during both project navigations. `rawLocator`,
  `contentHash`, provider-reference and snapshot-UUID fields were also absent.
- Authenticated navigation failures `0`; console errors `0`.

## Product and dataset acceptance

| Scope | Result | Boundary |
|---|---|---|
| Provider registry and 13 dataset contracts | `PASS_SOURCE_CANARY_READY` | Contract and adapter source plus exact-head CI; two separately authorized bounded Google AI Mode calls produced no accepted provider capture. |
| Google adapters | `PASS_SOURCE / HOLD_RUNTIME_OUTCOME` | Request/response validation, bounded timeout and zero internal retries passed in source; neither hosted call has a proven terminal provider outcome. |
| Social/Travel | `PASS_HIDDEN` | Server strips hidden modules before the customer boundary; workflow and UI cannot activate them. |
| HoReCa Local-first read models/UI | `PASS_HOSTED_RESTORED` | Exact source `100d34d8` was restored after automatic release drift. Its authenticated receipt separates the project rail at left from the six-tool axis across the top. |
| AVLI/KORA pilot package | `PASS_TEMPLATE/HOLD_DATA` | Templates exist; no unsupported venue facts or provider results were invented. |
| Local Maps stability replay | `PASS_5_OF_5` | Seven focused files: 73 tests per replay, five complete replays, no provider calls. |

UGC remains the primary intended discovery/traffic source. That product
direction does not activate Social/Travel collection and is not represented as
measured traffic evidence.

## Credentials and cost

Owner-confirmed names-only rotation receipt: `BRIGHTDATA`, `OPENAI`,
`OPENROUTER`, `RESEND`, `GITHUB`, staging Postgres. Values were never read or
published. Active application runtime connectivity is proved through
`selena_app`; the sealed Postgres administration TCP binding also passed a
values-suppressed count-only probe after rotation.

- Provider calls recorded across the hosted acceptance: exactly `2`, one per
  separately authorized immutable execution identity
- Retries: `0`
- Recurring: `false`
- Bright Data post-diagnostic usage export: `Google AI Mode Search`, exactly
  `1 record` total for `2026-09-01`
- Bright Data post-diagnostic cost export: `USD 0.0015` total for Google AI
  Mode Search on `2026-09-01`
- Diagnostic-2 incremental billing: `USD 0.0000`; the pre-diagnostic evidence
  already contained the same one Google AI Mode record, and the post-call
  export contains no second record
- Persisted provider capture: none
- First-party CSV evidence:
  [`brightdata-cost-by-web-api-2026-09-01.csv`](evidence/brightdata-cost-by-web-api-2026-09-01.csv)
  and
  [`brightdata-usage-by-web-api-2026-09-01.csv`](evidence/brightdata-usage-by-web-api-2026-09-01.csv)
- Evidence SHA-256: cost
  `de9a3e463122097dc7cc5f2ab09ff01802ace76e5f1cd144cb8f157e0f151cbc`;
  usage
  `718415d4fcfa6c6e7cd320e8f5414d8a85429ecd6c2fe39aa1ec0a8641136083`
- The daily Web Scraper API total was `USD 0.0285` for 19 records across three
  APIs. Eighteen records and `USD 0.0270` belong to ChatGPT Search and Gemini
  Search, not to the authorized Google AI Mode calls.

## Remaining owner gates

1. Reconcile the terminal provider outcome of both immutable calls without
   retrying either call. Billing and usage attribution are closed.
2. Keep both reservations immutable. No additional provider call, identity,
   retry or cost-cap increase is authorized.
3. Obtain exact final-head CI and refreshed GitHub mergeability after pushing
   release integration merge `34d86417`. Production remains prohibited.

## Current diagnostic-head CI

Source `a9d1f373` passed every manually dispatchable exact-head workflow:

| Check | Result | Evidence |
|---|---|---|
| Build | `PASS` | [run 33502678567 / job 99839402251](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678567/job/99839402251) |
| E2E Integration Tests | `PASS` | [run 33502678587 / job 99839403550](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678587/job/99839403550) |
| Scheduling Policy Verification | `PASS` | [run 33502678587 / job 99839403329](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678587/job/99839403329) |
| Dependency License Audit | `PASS` | [run 33502678649 / job 99839403470](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678649/job/99839403470) |
| Deployment smoke | `PASS` | [run 33502678500 / job 99839403464](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33502678500/job/99839403464) |

GitHub API evidence before the release integration merge: `head=a9d1f373`,
cached PR `base=5cbb7b25`, `state=open`, `mergeable=false`,
`mergeable_state=dirty`, while the base ref itself resolved to `2e21ef04`.
Merge commit `34d86417` now integrates that exact release head, preserves the
feature-side reviewed `0045` hash alias, and adopts the release-side advisory
lock ordering. GitHub mergeability and final CI must be read back after push.
