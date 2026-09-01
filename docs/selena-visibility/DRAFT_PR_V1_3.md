# Draft PR #96 — Selena AI Visibility v1.3 pre-production hardening

Status: `OPEN_STAGING_CORE_ACCEPTED_OWNER_GATES_REMAIN`.

PR: [#96](https://github.com/parkourcafe/selena-ai-visibility/pull/96)

Base: `release/selena-visibility-mvp`.

Accepted runtime/source HEAD:
`2d023470a618c6606e7960ee4dd1b4523dcbdcfe`.

## Proposed title

`fix(visibility): harden v1.3 pre-production gates`

## Proposed PR body

### Summary

- integrate release `9e1e9930` without rewriting feature history;
- provide the registry and 13 canary-ready dataset contracts;
- harden Google adapters and make generic live provider probes unreachable;
- keep Social/Travel hidden at server, workflow and UI boundaries;
- run web/worker with non-owner `selena_app` and owner-managed pg-boss schema;
- fail closed on recurring, provider, billing and free-dispatch paths;
- deliver HoReCa Local-first safe read models/UI plus AVLI/KORA pilot templates;
- preserve the protected untracked recovery handoff boundary.

### Exact-head evidence

- PR checks: Build, E2E, scheduling, deployment smoke, license and CLA all
  passed on `2d023470`;
- local root gates: lint 0 errors, typecheck 13/13, tests 16/16 tasks,
  Impeccable detect PASS, build 16/16;
- Bright Data timeout stability 20/20;
- Local Maps focused stability five replays, 73 tests per replay;
- independent cross-stream Codex reviews found no remaining P0/P1 in the
  material source changes.

### Hosted staging evidence

- fresh backup `9b961055…` and isolated restored service `a34b2749…` passed;
- migrations 0043–0051 are present and 0052 remains excluded;
- actual `selena_app`, `SET LOCAL app.organization_id`, FORCE RLS,
  cross-tenant/private negatives and rollback passed;
- replay/concurrency/idempotency passed and cleaned up;
- exact web `7e7de294…` and worker `586b6e9a…` are running;
- public health, scoped API and unauthenticated browser gates passed;
- provider calls 0, cost-event rows 0, managed recurring schedules 0.

### Remaining gates

- authenticated owner browser session for HoReCa/Local UI;
- reconcile the staging Postgres administration credential through Railway's
  official rotation surface;
- any paid canary requires a new explicit authorization for migration 0052 and
  one provider call; current price is UNKNOWN and incurred cost is USD 0.00;
- production, production DB, recurring jobs, billing, Social/Travel activation
  and PR merge remain prohibited.

`HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remains untracked and excluded.

## CI side effects

Each push to PR #96 starts the six documented GitHub/Blacksmith checks. The
owner restored the Actions budget and authorized bounded feature-branch
pushes. The documentation reconciliation commit will therefore receive one
final exact docs-head CI cycle. Merge is a separate gate and must not happen
while any owner gate remains open.
