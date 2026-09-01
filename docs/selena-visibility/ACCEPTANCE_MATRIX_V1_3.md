# Selena AI Visibility v1.3 — hosted acceptance matrix

Evidence date: `2026-09-01`. This document is the canonical post-hosted
acceptance snapshot. Earlier pre-mutation candidates remain Git history only.

## Canonical anchors

- Runtime/source HEAD: `2d023470a618c6606e7960ee4dd1b4523dcbdcfe`
- Runtime/source tree: `aa93f8c258fad557caefdfc81be99e07225d72d5`
- Integrated release parent: `9e1e993090fb6ef133b147b5341f2ff8591ade6c`
- Original release snapshot retained for lineage: `0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e`
- Draft PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)
- Protected untracked `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md`: untouched and excluded.

The PR can advance with documentation-only commits after this snapshot. Such a
commit does not change the accepted runtime source above and must not be
represented as a deployed binary.

## Decision

| Boundary | Decision | Reason |
|---|---|---|
| Source package | `PASS` | Provider, database/evidence and HoReCa streams are code-complete for the authorized v1.3 scope; no open P0/P1 in the independent Codex reviews. |
| Exact-head CI | `PASS` | Six required PR checks are green on `2d023470`. |
| Staging database/RLS | `PASS` | Backup/restore, migrations through `0051`, actual non-owner runtime role, GUC, RLS, rollback, replay, concurrency and idempotency were proved. |
| Staging web/worker | `PASS` | Exact archive deployed; both services are `SUCCESS` and `RUNNING`; provider and recurring paths remain fail-closed. |
| Public/unauthenticated browser and scoped API | `PASS` | Browser smoke, authenticated API-key tenant fences and invalid-key response passed. |
| Authenticated human browser | `PASS` | Owner signed in interactively. AVLI and KORA routes, Local-first states, hidden-module boundary and sanitized customer payload passed without sharing credentials. |
| Paid Google/Bright Data canary | `HOLD_OWNER` | Latest owner decision prohibits paid provider calls. Migration `0052`, required for the durable snapshot journal, is also outside the authorized staging range. |
| Production/merge | `NO_GO` | Production is prohibited; PR #96 remains unmerged while the paid-canary gate is open. |

Overall decision: `STAGING_NONPAID_PASS / PRE_PRODUCTION_NO_GO`.

## Exact-head CI evidence

All checks below passed against `2d023470a618c6606e7960ee4dd1b4523dcbdcfe`:

| Check | Result | Evidence |
|---|---|---|
| Build | `PASS`, 5m38s | [run 33477379167 / job 99759379294](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379167/job/99759379294) |
| E2E Integration Tests | `PASS`, 17m34s | [run 33477379190 / job 99759446740](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379190/job/99759446740) |
| Scheduling Policy Verification | `PASS`, 2m38s | [run 33477379190 / job 99759446920](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379190/job/99759446920) |
| Dependency License Audit | `PASS`, 1m13s | [run 33477379254 / job 99759379658](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379254/job/99759379658) |
| Deployment smoke | `PASS`, 1m55s | [run 33477379236 / job 99759379476](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379236/job/99759379476) |
| CLA | `PASS`, 8s | [run 33477379199 / job 99759379135](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33477379199/job/99759379135) |

The preceding red Build on `d4ac606a` was a real-timer test flake: a 5 ms
deadline could expire before the first mocked progress poll. Commit `2d023470`
moved only that test to deterministic fake time. Runtime timeouts, retries and
cost controls were unchanged. The focused case passed `20/20`; the library
suite passed `1074/1074` locally before push.

Local root gates for the same source tree: lint `0 errors / 129 warnings / 12
infos`, typecheck `13/13`, tests `16/16` tasks, Impeccable detect `PASS`, build
`16/16`, `git diff --check` clean. The warnings/infos are the registered root
baseline and are non-blocking. Local Node was `22.23.0`; CI used the required
Node 24.

## Staging infrastructure evidence

| Gate | Result | Receipt |
|---|---|---|
| Fresh checkpoint | `PASS` | Backup `9b961055-4f2e-4cb2-aae6-a348f2b4cd5f`, no expiry. |
| Isolated restore | `PASS` | Restore service `a34b2749-130a-47f3-8da3-8f58e3775fe9` became healthy and proved an actual restored copy. |
| Migration bound | `PASS` | `0043–0051` applied; `sv_provider_dataset_capabilities` exists; `0052` table `sv_provider_dataset_snapshot_events` is absent. |
| Runtime role | `PASS` | `current_user=selena_app`; `SUPER=false`, `BYPASS_RLS=false`, `CREATE_ROLE=false`, `CREATE_DB=false`. |
| Administration credential | `PASS` | After the owner-confirmed Postgres rotation, a values-suppressed count-only TCP probe through the service's sealed `POSTGRES_USER`/`POSTGRES_PASSWORD` binding returned `ADMIN_TCP=PASS`. |
| Tenant GUC | `PASS` | `SET LOCAL app.organization_id` succeeded through the active worker connection. |
| Hosted RLS proof | `PASS` | Actual `selena_app`, FORCE RLS, least-privilege ACLs, same-tenant positives, cross-tenant/private-column negatives; proof ended in `ROLLBACK`. |
| Replay/concurrency/idempotency | `PASS` | Two concurrent writes produced one winner; replay was stable; cross-tenant read returned no row; active mutation was blocked; expired fixture cleaned up. |
| Web deploy | `PASS` | Deployment `7e7de294-3758-42a3-b8c2-2f5b39cbaf50`, image `sha256:3b0386c70e650bffb34288a10d49c146890a0ffda153083b7a506fcfdb4d6bd5`. |
| Worker deploy | `PASS` | Deployment `586b6e9a-736b-4d2c-b510-280dc79fa478`, image `sha256:869ba5e8f0b91d117f857f7c56e5d06f56bd79f0c3152591b457f2c5b81d6871`. |
| Public health | `PASS` | `app.selenasystems.com`, `staging.selenasystems.com` and `/api/setup-status` returned HTTP 200. |
| Runtime containment | `PASS` | Logs: legacy provider execution disabled; recurring scheduler disabled and managed schedules removed; pg-boss started; handlers ready; no error-level log. |
| Zero-call receipt | `PASS` | Since exact web deployment: canary rows `0`, cost-event rows `0`, managed recurring schedules `0`. |
| Fixture cleanup | `PASS` | Temporary API organizations `0`; temporary idempotency rows `0`. |

The earlier administration-only credential mismatch is closed. After the
owner-confirmed Postgres rotation, a repeated values-suppressed TCP probe using
the service's sealed administration binding returned `ADMIN_TCP=PASS`. The
same SSH process did not authenticate through the local Unix socket because
that path applies local OS-user authentication and is not the Railway
application/admin TCP path. No credential value was read or printed.

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
| Provider registry and 13 dataset contracts | `PASS_SOURCE_CANARY_READY` | Contract and adapter source plus exact-head CI; no live provider execution. |
| Google adapters | `PASS_SOURCE` | Request/response validation, bounded timeout, zero internal retries for the canary path; no paid call. |
| Social/Travel | `PASS_HIDDEN` | Server strips hidden modules before the customer boundary; workflow and UI cannot activate them. |
| HoReCa Local-first read models/UI | `PASS_SOURCE_AND_HOSTED_CORE` | Independent modules, UNKNOWN semantics and evidence privacy passed; unauth browser boundary passed. |
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

- Provider calls in this hosted loop: `0`
- Cost-event rows since exact deployment: `0`
- Actual first Maps/Bright Data canary price: `UNKNOWN` because no call ran
- Amount incurred by this loop: `USD 0.00`
- Previously authorized cap is not executable under the later no-paid-call
  decision; no estimate may be reported as actual price.

## Remaining owner gates

1. If a paid canary is desired, explicitly authorize both migration `0052` and
   one Bright Data call with a new cost cap. Until then the canary is forbidden.
2. Keep PR #96 unmerged and production untouched while any gate above remains
   open.

## Documentation-head CI

The first hosted-evidence reconciliation head `6efa98d4` passed all six PR
checks: [Build](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33481506128),
[E2E and scheduling](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33481506080),
[license](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33481506074),
[smoke](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33481506135)
and [CLA](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33481506112).
This later credential/browser receipt is documentation-only and does not
change the accepted runtime source.

The credential-gate documentation head `26c5ab62` also passed all six required
PR checks, including [E2E Integration](https://github.com/parkourcafe/selena-ai-visibility/actions/runs/33483389403/job/99777805819).
