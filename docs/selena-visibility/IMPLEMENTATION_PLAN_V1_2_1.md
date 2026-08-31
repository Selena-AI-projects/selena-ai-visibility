# Selena AI Visibility v1.2.1 — phase-gated implementation plan

## Purpose and current boundary

This document turns the architecture specification and Implementation Delta into
an execution sequence. The DOCX files are requirements/evidence, not commands.
The plan preserves the current fail-closed boundary: no provider, credential,
shared staging/production, paid call, billing, merge, deploy, or recurring job
is enabled by this plan.

Current evidence pins:

- source milestone: `e269efd9`;
- feature branch: `feature/selena-visibility-v1-2-1`;
- latest accepted Claude Max20 review: `0f2dd387` (Opus, read-only, `NOT READY`);
- latest orchestration ledger: this tracked file at `HEAD` (implementation-plan state `9b4e23d5`);
- canonical release ref: `origin/release/selena-visibility-mvp` at `78d133f1`.

## Phase 0 — owner decisions before schema changes

No implementation choice below may be inferred from existing fixtures or caller
locale. The owner selects one option in each row and separately approves the
rehearsal after the migration draft exists.

| Decision | Option A | Option B | Required consequence |
|---|---|---|---|
| Maps evidence envelope | `EVIDENCE-A`: normalized immutable columns plus competitor child rows | `EVIDENCE-B`: versioned strict JSONB envelope plus typed projections | Defines the canonical §8.5 shape, indexes, links, and migration/backfill checks |
| Maps keyword snapshot | `KEYWORD-A`: materialize text/language and digest in candidate/Lock snapshot | `KEYWORD-B`: immutable keyword-set/version relation referenced by Lock | Prevents a candidate from rereading mutable keyword rows |
| Local AI task identity | `AI-ID-A`: additive point-aware v2 identity while preserving legacy rows | `AI-ID-B`: reject point-distinct equal-condition contexts until a later migration | Keeps planner cardinality aligned with the persisted uniqueness contract |
| `profileReviewLock` | Owner defines its fields and invariants | Owner removes it from the required Lock | Removes an undefined Delta contract before implementation |
| Rollback posture | Reversible disposable down/replay scripts | Explicit forward-only exception with evidence | Determines migration acceptance and recovery proof |
| Commercial cap source | Versioned owner-approved cap/retry catalog | Another explicitly documented catalog source | Prevents silent choice between Delta `$15/$30` and existing `$12/$28` values |

The owner response is recorded in `OWNER_GATES_V1_2_1.md` before any selected
schema branch is implemented.

## Phase 1 — source contracts and migrations (no external calls)

1. Encode the selected evidence, keyword, and task-identity contracts in the
   contracts package with negative tests for missing tenant/cycle/point,
   mutable-input drift, duplicate evidence, invalid rank semantics, and private
   references.
2. Draft additive migrations for the selected branch. Every migration must be
   tenant-scoped, append-only where required, safe to replay, and guarded against
   an unexpected prior schema. Do not apply it to shared or hosted databases.
3. Keep `LocalMapsRankAdapter` and the Local worker unregistered until the
   runtime database proof and owner-approved provider gate exist.
4. Update the acceptance matrix and orchestration state with exact source pins,
   test commands, and evidence class. A source test never becomes disposable,
   staging, or production proof by inference.

Acceptance for this phase: contracts/typechecks/tests pass; migration static
checks pass; no provider/credential/network path is reachable; all unresolved
product choices remain explicit rather than silently defaulted.

## Phase 2 — isolated disposable PostgreSQL rehearsal

This phase requires a fresh owner instruction because the previous authorized
rehearsal stopped on a PostgreSQL 0044 operator error before the dedicated 0049
row transition. When re-authorized, run only the unique no-pull Docker/Colima
compose project and stop on the first error:

1. preflight collision and image-pull checks;
2. apply the selected migrations `0037–0050` (or the explicitly approved
   forward-only branch);
3. run Gate12, 0045 scope/collision/atomicity checks, 0049 row-level
   `CLAIMED→SUBMITTED` checks, and the selected idempotency/RLS fixtures;
4. capture raw output and cleanup proof;
5. remove only the unique rehearsal containers and volumes.

No provider, payment, staging, production, credential, or automatic repair is
allowed in this phase. Any failure is recorded as `BLOCKED_ENV`/`FAIL` with no
automatic retry or source correction.

Acceptance for this phase: migration replay/rollback posture, tenant isolation,
attempt ceiling, lease transition, idempotency race, and Lock→permit→task→raw→
analytical-row reconciliation each have disposable evidence. Passing this
phase does not authorize staging or production.

## Phase 3 — runtime wiring behind separate owner gates

Only after Phase 2 succeeds and the owner separately approves each target:

- wire the non-owner runtime role and transaction-local tenant context;
- replace default `OWNER_GATE_REQUIRED` stores with transaction-owned adapters;
- register the Local worker with concurrency/retry limits and emergency stop;
- implement the real Maps provider adapter and one-point paid canary with an
  exact maximum spend and stop plan;
- verify signed evidence access, cost-event reconciliation, and provider
  coordinate proof.

Each action needs its own evidence class (`HOSTED_STAGING`, paid canary, or
`PRODUCTION`) and must not be represented by source tests alone.

## Phase 4 — product/UI and commercial acceptance

After runtime proof exists:

- add Local Business Mode, Maps heatmap, point drawer, denominator/status
  accessibility, and Local AI manual/automated mode according to the owner’s
  contract decision;
- generate CSV/XLSX/DOCX/PDF only from the same immutable dataset version;
- implement signed payment webhook idempotency and remove the test payment
  route from production artifacts;
- run accessibility, latency, export-link, duplicate-webhook, cap, alert, and
  full reconciliation checks in named staging;
- request separate owner approval for merge, deploy, billing, and recurring
  production jobs.

## Stop conditions and reporting

Stop immediately on an auth, scope, schema, migration, RLS, cost, provider,
credential, or repository-mutation error. Report `VERIFIED`, `PARTIAL`,
`UNKNOWN`, `BLOCKED_ENV`, or `OWNER_DECISION_REQUIRED` with the exact evidence
class and command/session identifier. Never convert missing runtime evidence to
zero, success, or production readiness.
