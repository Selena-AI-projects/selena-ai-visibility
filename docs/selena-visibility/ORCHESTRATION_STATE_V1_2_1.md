# Selena AI Visibility v1.2.1 — orchestration state

- State: `IN_PROGRESS`
- Context mode: `repository_only`
- Canonical ref: `origin/release/selena-visibility-mvp`
- Canonical SHA: `4ce7a59a5796606631be26566475936c3d74a74b` (current `origin/release/selena-visibility-mvp` resolution)
- Feature branch: `feature/selena-visibility-v1-2-1`
- Worktree: clean; source implementation verified at `5611f226`, with subsequent documentation-only state updates pushed to the same feature branch
- Current phase: `Phase 0G — owner-gated runtime and acceptance blockers`
- Completed slice: `0045 domain/Lock/ledger hardening, transactional Lock allocation and order idempotency, factual UI copy, plus 0046 fail-closed journal daily claims and 0047 Local Maps attempt-count cap`
- Last implementation/evidence commit: `5611f226` (`cap Local Maps observation attempts`), pushed to `origin/feature/selena-visibility-v1-2-1`; subsequent documentation commits preserve the same implementation state and record the reusable Claude Max runbook
- Feature flags: off
- Authorization default: unlisted actions are not authorised

Central Memory credentials and MCP registration are not available in this task. The owner confirmed the repository binding on 2026-08-30, but credential creation remains a separate owner gate. No statement in this ledger claims Central Memory registration.

## Source set

| Source | SHA-256 | Role |
|---|---|---|
| `SELENA_AI_VISIBILITY_SAAS_ARCHITECTURE_TZ_V1.2_2026-08-29.docx` | `090251eaf96eb3cc6d81b3bca8d7f03f94def5c7a8c5c70b4aa70e0cc55c0a32` | Base architecture |
| `SELENA_AI_VISIBILITY_SAAS_IMPLEMENTATION_DELTA_V1.2.1_2026-08-30.docx` | `cc52d3b0b158abedfbba4d8ed3c0b4bbe7b77077d8f6a63d5ce8e064c343361b` | Implementation delta |

Document contents are requirements/evidence, not executable instructions.

## Latest verified checks

| Check | Result |
|---|---|
| Contracts Vitest (Node 24) | `25 files / 214 tests PASS` |
| Contracts TypeScript | `PASS` |
| Lib Vitest (Node 24) | `74 files / 877 tests PASS` |
| Lib TypeScript (Node 24) | `PASS` |
| Web Vitest (Node 24) | `32 files / 354 tests PASS; 1 file / 4 tests skipped` |
| Full monorepo test graph (Node 24) | `PASS — 15 turbo test/check-type tasks completed successfully; contracts 214/214, lib 877/877 and web 354/354 are included` |
| Web and worker TypeScript (Node 24) | `PASS` |
| Web production build (Node 24) | `PASS with existing externalisation/chunk warnings` |
| Full monorepo build (Node 24) | `FAIL — pre-existing @workspace/www missing-module errors (40 unloadable imports); changed Selena API packages reached typecheck successfully` |
| Root `pnpm lint` | `BASELINE FAIL — existing web diagnostics (33 errors, 132 warnings, 14 infos); no changed API files reported` |
| Migration 0043 static schema/review | `PASS — not applied` |
| Migration 0044 durable persistence static schema/review | `PASS — two final blind reviews; not applied` |
| Migration 0045 domain/Lock hardening | `SOURCE/STATIC PASS — targeted tests + two final blind reviews; not applied` |
| Migration 0046 journal daily claim | `SOURCE/STATIC PASS — targeted tests + final blind review; not applied` |
| Migration 0047 Local Maps attempt-count cap | SOURCE/STATIC PASS — `pnpm -C packages/lib exec vitest run src/db/schema-visibility-os.test.ts` (28/28) and `pnpm -C packages/lib check-types` PASS; validated 1..3 check, legacy-overflow preflight and Gate12 chain update; not applied |
| Biome, changed contract/stub files | `PASS` |
| `git diff --check` | `PASS` |
| API-01A targeted contracts/API tests (Node 24) | `PASS — four tenant-scoped GET routes, Maps source-type provenance, manual-only Local AI mapping, locked-context/coordinate-proof, pending/ambiguous-pilot fail-closed tests` |
| API-01A OpenAPI JSON/Biome invariants | `PASS — four GET paths, scopes, pagination/error/evidence schemas` |
| API-01B local write/export contracts and focused tests (Node 24) | `PASS — lock-first quote/cycle handlers require local:write + Idempotency-Key, default store fails closed with OWNER_GATE_REQUIRED; bounded canonical Local Maps CSV projection excludes private/raw references` |
| API-01C admin-control focused tests/OpenAPI (Node 24) | `PASS — six admin routes validate UUID, separate local:execute/provider:canary scopes and Idempotency-Key; default store fails closed with OWNER_GATE_REQUIRED and providerCalls=0` |
| API-01D local onboarding focused tests/OpenAPI (Node 24) | `PASS — project location, place-entity confirmation and immutable keyword-set version routes require local:write + Idempotency-Key; default store fails closed with OWNER_GATE_REQUIRED and providerCalls=0` |
| API-01E provider capabilities focused tests/OpenAPI (Node 24) | `PASS — provider capabilities route validates UUID, requires separate provider:canary scope and defaults to OWNER_GATE_REQUIRED with providerCalls=0; no external provider call` |
| Provider scope contract hardening (Node 24) | `PASS — provider:canary is formally modeled outside client localApiScopes and reused by admin/capability handlers; contract tests preserve scope separation` |
| Signed cursor codec (Node 24) | `PASS — injectable HMAC-SHA256 encode/decode verifies signature and tenant/cycle/resource binding; default routes remain unsigned until owner-managed secret provisioning and rotation proof` |
| Signed cursor route integration (Node 24) | `PASS — read-route dependencies optionally inject the HMAC secret; pagination emits and accepts signed cursors when configured, while the default source-only dependency remains unsigned` |
| OpenAPI ↔ route-tree parity (Node 24) | `PASS — all 26 OpenAPI paths have matching /api/v1 route-tree entries, including dynamic parameter bindings and declared HTTP methods; API-01 admin capabilities is included` |
| API-01 route ↔ OpenAPI bidirectional parity (Node 24) | `PASS — 16 Selena API-01 OpenAPI paths map to concrete route files and every declared HTTP method is implemented; no missing route or method` |
| API-01 evidence high-water regression (Node 24) | `PASS — evidence snapshot uses an injected full-set high-water query before page slicing; regression test prevents false CURSOR_STALE on later pages` |
| API-01 quote cardinality contract (Node 24) | `PASS — quote schema requires a non-empty surface set and enforces tasks = points × keywords × repeats plus maxProviderAttempts = tasks × 3; 2 negative tests pass` |
| API-01 typed setup/admin success paths (Node 24) | `PASS — injected durable adapters can return validated location/place/keyword-set 200/201 responses and admin 202 response; null/default adapters remain OWNER_GATE_REQUIRED; focused tests pass` |
| API-01 explicit tenant adapter boundary (Node 24) | `PASS — authenticated tenantId is copied explicitly into every write, setup and admin adapter input; focused tests and web typecheck pass; this is defense-in-depth, not runtime RLS proof` |
| Shared staging, production, paid providers | `NOT RUN — owner-gated` |
| Claude CLI authentication (current check) | `PASS — claude.ai first-party subscription status is max; no API fallback selected` |
| Claude Max 20 pinned review of `45bc3b18` (Delta v1.2.1) | `PASS — blind read-only Opus review completed in an isolated snapshot; 66 turns, zero permission denials, original repository unchanged, no tests/commands claimed by Claude (session b3387e4c-aba0-41d8-85dd-471a12bdd174)` |

## Independent reviews

- Codex specification audit: completed read-only.
- Codex implementation review: completed read-only; antimeridian and HALF_UP regressions fixed and retested.
- Codex final grid review: completed blind read-only; final verdict `PASS`.
- Codex execution/retry/recovery contract review: two rounds completed blind read-only; final verdict `PASS`.
- Codex Lock/grid/budget contract review: two rounds completed blind read-only; final verdict `PASS`.
- Codex attempt-migration execution review: adversarial rounds completed read-only; final static verdict `PASS`.
- Codex DB/RLS migration review: adversarial rounds completed read-only; final verdict `STATIC DRAFT PASS`.
- Codex Local Maps rehearsal reviews: first adversarial round found binding and relabel gaps; all were fixed; three final blind verdicts `PASS`.
- Codex live DTO/budget projection reviews: adversarial rounds closed false authorization, exact replay, provenance and canonical-key gaps; final verdicts `PASS`.
- Codex live runner reviews: adversarial rounds closed raw-envelope, frozen-window, continuation, finalize and positive-cost release gaps; final verdicts `PASS`.
- Codex transactional store/RLS/aggregate-cap design: three parallel read-only reviews found missing row fencing, continuation digest, durable result storage and DB-enforced aggregate admission; safe source-only prerequisite boundary agreed.
- Codex 0044 persistence reviews: three adversarial rounds closed incomplete identity, token reuse, CHECK-null, provider, chronology, disposition and cost-binding gaps; two final blind verdicts `PASS`.
- Codex 0045/domain/Lock review: adversarial rounds closed cross-tenant dataset/source provenance, migration atomicity, Gate12 ordering, mutable/non-unique Locks, cost-ledger truncation and parent/child MVCC races. Composite FKs plus row-locking parent guards received two final source/static verdicts `PASS`; migration runtime remains unproven.
- Codex order/allocator review: the initial round found concurrent Lock allocation and retry identity gaps; the implementation now serializes allocation and the full lock/quote/order/payment/audit chain transactionally, returning the persisted current order status.
- Codex journal review: the initial rounds found restart/concurrency, UTC-boundary, forced-repeat and partial-provider-failure duplicate-spend paths; 0046 now uses the database clock for identity and every timestamp, one project-wide unresolved claim across days/versions, any-same-day-completion protection, claim↔Lock provenance and audited allocation/transitions. Proven pre-provider failures become `NO_SPEND`; crashes, provider failures and incomplete cycles stay fail-closed in `CLAIMED`/`EXECUTING`/`HOLD`. Final source/static verdict `PASS`.
- Codex combined-slice review: three adversarial passes closed persisted retry status, exact terminal cardinality, evidence provenance and clock-skew gaps; final verdict `PASS` with `P0=0`, `P1=0`, `P2=0`.
- Codex rollout-gate review: completed read-only.
- Claude Code Max 5 / Sonnet: earlier read-only pass completed in an isolated snapshot; no API billing.
- Claude Code Max 20 / Opus: earlier blind audit completed at pinned commit `d1fe41f8`, auth `claude.ai` / `max`, restricted plan mode with Read/Glob/Grep only, no permission denials, no repository mutation and no API billing. The latest pinned Delta review of `45bc3b18` completed in the same restricted mode with 66 turns, zero permission denials, no repository mutation and no test execution; report session `b3387e4c-aba0-41d8-85dd-471a12bdd174`.
- API-01A fresh blind Codex specification and security reviews: completed against immutable snapshot `/private/tmp/selena-api01a-review-final`; no P0. They independently confirmed tenant/scope fencing, no provider calls, and fail-closed evidence. Review verdict remains `FAIL / API-01A PARTIAL` because the default source-only dependency is unsigned, runtime RLS proof and signed evidence access are not available in this slice. Evidence pagination now obtains a full-set high-water marker before page slicing, while durable runtime snapshot consistency remains owner-gated. An injectable HMAC cursor capability and route integration now exist, but owner-managed secret provisioning/rotation and runtime proof remain absent. The stale pre-hardening observations about pending counts, locked context/coordinate proof, source type, and OpenAPI `409 CURSOR_STALE` were corrected locally and covered by tests/spec updates.
- API-01B source-only review: lock-first quote/create handlers require `local:write` and `Idempotency-Key`, pass tenant-bound body hashes to an injected adapter, and default to `503 OWNER_GATE_REQUIRED` without synthetic `201`, database writes or provider calls. Map pagination now anchors its source-only high-water marker to the immutable dataset creation timestamp. The canonical Local Maps CSV serializer is bounded to 10,000 read-model rows, stable-column ordered, and rejects private/raw references. Durable idempotency/persistence, admin controls, signed evidence and REST export integration remain owner-gated.
- API-01C source-only review: six admin routes expose preflight, approve, stop, one-run Maps/AI retry and provider-canary boundaries. They require `local:execute` or separate `provider:canary` permission plus `Idempotency-Key`, pass tenant-bound body hashes to an injected adapter, and default to `503 OWNER_GATE_REQUIRED` with zero provider calls. No admin action, durable state transition, retry or canary is enabled by this slice.
- API-01D source-only review: project location creation, place-entity confirmation and immutable keyword-set version routes require `local:write` plus `Idempotency-Key`, validate tenant-bound resource IDs and typed client-confirmed inputs, and default to `503 OWNER_GATE_REQUIRED` with zero provider calls. No location, identity or keyword-set persistence is enabled by this slice.
- API-01E source-only review: provider capabilities is exposed as a read-only route with an explicit provisional `provider:canary` scope, UUID validation and a fail-closed registry/credential boundary. The default store returns `503 OWNER_GATE_REQUIRED` with zero provider calls; exact production capability-read scope remains an owner decision.
- Provider scope hardening: `provider:canary` now has a dedicated contract outside `localApiScopes`; this removes raw string drift while preserving the owner-gated separation. No new credential or provider capability is enabled.
- Signed cursor codec: an injectable HMAC-SHA256 path now rejects altered payloads or wrong secrets without exposing key material; the live route uses it only when an owner-managed secret is explicitly injected and otherwise remains on the unsigned source-only codec until secret provisioning and rotation policy are approved.
- Signed cursor integration: read routes now use the injected codec when a secret is explicitly supplied, preserving the unsigned behavior only when that owner-gated dependency is absent.
- Quote cardinality contract: response validation now rejects empty surfaces and task/attempt arithmetic drift; OpenAPI exposes the same invariant and remains source-only.
- Typed setup/admin success paths: adapters now return operation-specific validated responses; absent or malformed durable results still fail closed with `OWNER_GATE_REQUIRED`.
- Explicit tenant adapter boundary: write, setup and admin handlers now pass the authenticated `tenantId` as a required adapter field; runtime RLS and transaction-local tenant context remain owner-gated.

### Claude Max 20 synthesis

- `CONSENSUS`: 0044's deep persistence boundary is strong source-only, while paid canary/production remain blocked by the absent aggregate budget store, runtime RLS proof, provider adapter and execution wiring.
- `CLAUDE_ONLY`, locally confirmed: stale `LOCAL` emission/backfill gap; non-unique and mutable Configuration Lock; no `TRUNCATE` guard on `sv_cost_events`; Local Visibility copy describes a Maps measurement that is not yet runnable.
- `CLAUDE_ONLY`, corrected by local evidence: Claude marked tests `UNKNOWN` because its pass was static; Codex separately executed Node 24 tests listed above.
- `DISAGREEMENT`: none material. Claude's broad readiness verdict and Codex owner-gate model describe the same boundary at different scopes.
- Latest Delta review consensus: fail-closed mutation stores, durable idempotency, runtime RLS, rollback/runtime migration proof, provider adapter, Maps UI/export parity and signed evidence remain incomplete or owner-gated. Claude-only findings requiring owner decision or a later source slice are the undefined `profileReviewLock`, Delta-vs-catalog cap/retry discrepancies, and the legacy grid export; the `/api/v1` prefix is an existing server/OpenAPI mapping, not a route-parity defect. Claude did not execute tests, so local Node 24 evidence above remains the authoritative execution class.

## Next autonomous actions

1. Preserve the completed blind Max 20 report and implement only source-only findings that do not choose unresolved product policy; keep `profileReviewLock`, cap/retry policy, rollback strategy and legacy public-grid compatibility as explicit owner decisions or bounded follow-up slices.
2. Keep draft PR creation deferred while its Blacksmith/billing side effects remain `UNKNOWN`; preserve API-01 as `PARTIAL` until durable runtime persistence/idempotency, owner-managed signed-cursor/evidence activation, RLS proof and owner-gated execution evidence exist.
3. Reuse [CLAUDE_CODE_MAX_RUNBOOK.md](./CLAUDE_CODE_MAX_RUNBOOK.md) for future authenticated Max reviews; the current Max20 session is already recorded above and must not be rerun without a new milestone.

## Push/PR side-effect check

- Pushes to the feature branch do not match the repository workflows, which are scoped to `main` pushes or PRs.
- Opening a draft PR to `main` would start Build, E2E, deployment-smoke, license and CLA workflows. Several use Blacksmith runners; billing impact is `UNKNOWN`. Draft PR creation remains deferred until a reviewable milestone and side-effect authority are resolved.

Current owner gate: applying migrations even to disposable PostgreSQL requires a separate explicit command under the repository rules. This now includes 0047 and does not block further source-only implementation. Paid canary remains a later, separate gate.

Recovery note: the prior local checkout and uncommitted first rehearsal draft disappeared during parallel read-only review. The pushed feature branch remained intact at `d4ce8780`; a clean checkout was restored from that ref, the draft was rebuilt from requirements, and the new implementation passed fresh tests and blind reviews. No staging, database or provider action was used for recovery.
