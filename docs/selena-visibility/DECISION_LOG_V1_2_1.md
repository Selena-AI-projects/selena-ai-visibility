# Selena AI Visibility v1.2.1 — decision log

## D-001 — Configuration Locks

- Decision: a Lock is immutable from creation; changes create a new version and quote.
- Authority: owner-approved safe default, 2026-08-30.
- Effect: remove the contradictory post-payment immutability interpretation.

## D-002 — Ambiguous provider calls

- Decision: a call that may have reached a provider but lacks durable completion proof enters `UNKNOWN_RECONCILIATION` and is never retried automatically.
- Authority: owner-approved safe default, 2026-08-30.
- Effect: duplicate paid calls fail closed.

## D-003 — Budget accounting

- Decision: reserve, spend, release, and next-attempt admission are atomic database operations.
- Authority: owner-approved safe default, 2026-08-30.

## D-004 — Observation semantics

- Decision: coordinate/data validity is separate from provider outcome; `ABSENT_WITHIN_DEPTH` is a valid observation with no target rank.
- Authority: owner-approved safe default, 2026-08-30.

## D-005 — Google Places boundary

- Decision: Google Places API remains excluded from the MVP. Entity identity must use approved user-confirmed/provider evidence without introducing Places API spend or credentials.
- Authority: owner-approved safe default and `PRODUCT.md`.

## D-006 — Polar boundary

- Decision: every generated point, not only the center, must remain within latitude `[-85, 85]`.
- Authority: owner-approved safe default, 2026-08-30.

## D-007 — Rollout posture

- Decision: new persistence and provider features deploy disabled; enablement is gated separately after evidence passes.
- Authority: owner-approved safe default, 2026-08-30.

## D-008 — Attempt identity and recovery

- Decision: `LOCAL_MAPS` and `LOCAL_AI` execution keys use distinct domain prefixes. A stale pre-submission claim may only reclaim the same attempt and reservation; it cannot allocate a new attempt or budget reservation.
- Authority: implementation of owner-approved duplicate-spend safe default, independently reviewed 2026-08-30.

## D-009 — Retry boundary

- Decision: each matrix slot has at most three controlled attempts, generic queue retry is zero, and ambiguous provider outcomes never auto-retry.
- Authority: owner-approved safe default and Delta v1.2.1, independently reviewed 2026-08-30.

## D-010 — Rehearsal boundary

- Decision: the free Local Maps stub is a separate `REHEARSAL_ONLY` surface. It emits only deterministic synthetic results with zero provider calls and cost; those results are never persistence- or evidence-eligible. Live attempt/result contracts, worker registration and persistent Configuration Lock identity remain separate later slices.
- Authority: implementation of the owner-approved safe defaults, independently reviewed 2026-08-30.

## D-011 — Live runner boundary

- Decision: a live adapter receives only the frozen provider request and returns raw observation fields. The runner constructs tenant/cycle/attempt identity itself and may call the adapter only after a transactional store returns one fresh committed `SUBMITTED` continuation. Ambiguous calls never retry; UNKNOWN and estimated zero retain their reservation, positive known cost must be SPENT, and actual known zero cost must be RELEASED.
- Authority: implementation of the owner-approved duplicate-call and budget-safe defaults, independently reviewed 2026-08-30.
- Boundary: this source-only protocol is not package-exported or worker-registered. DB atomicity, RLS, migration apply and any real provider call remain `UNKNOWN` / owner-gated.

## D-012 — Durable store sequencing

- Decision: durable row-version/token prerequisites and append-only validated-result storage are a source-only prerequisite slice. The row-version column is not itself a fence: the future transactional writer must require an expected version and exact token digest. Aggregate budget admission must be one authoritative database write, never a read-only `FITS` oracle, and claim/finalize/reconciliation must share one deterministic lock order.
- Authority: implementation of D-002 and D-003, supported by three independent read-only store/RLS/lock reviews on 2026-08-30.
- Boundary: monthly period semantics, Configuration Lock budget paths, runtime role/grants and maximum lease TTL remain unresolved owner decisions. No migration apply, grants, store registration or provider activation is implied.

## D-013 — Local read API truth boundary

- Decision: the client-facing Local read surface is tenant-scoped and read-only. Maps results require immutable source provenance; Local AI is exposed only when a frozen `MANUAL_ONLY` lock can be mapped to exactly one pilot, with task/observation review agreement and evidence-backed validity. Missing locks are `NOT_INCLUDED`; missing, ambiguous or structurally inconsistent manual data fails closed as `UNKNOWN`.
- Authority: implementation of the owner-approved safe defaults and Delta v1.2.1, independently reviewed in source-only blind passes on 2026-08-30.
- Boundary: quote/create mutations, database/RLS runtime proof, signed evidence credentials and any provider or paid execution remain separate owner-gated slices. Evidence never returns opaque private object references.

## D-014 — API-01A pagination and signing boundary

- Decision: the source-only read API validates cursor shape and tenant/cycle/resource binding, but does not claim tamper-evident cursors or a complete database high-water mark. Evidence access remains explicitly `UNAVAILABLE/SIGNING_UNAVAILABLE` until an owner-approved signing key, object-storage adapter and runtime proof exist.
- Authority: reconciliation of two fresh blind Codex API-01A reviews on 2026-08-30.
- Effect: API-01 remains `PARTIAL`; no cursor secret, credentials, provider call, staging/production action or paid execution is introduced implicitly.

## D-015 — Local quote/create mutation boundary

- Decision: Local quote and cycle creation use lock-first request contracts, require `local:write` and an 8–128 character `Idempotency-Key`, and pass a canonical body hash to the persistence adapter. The default adapter fails closed with `503 OWNER_GATE_REQUIRED`; no synthetic success, legacy-table write, migration apply or provider call is allowed before target-schema and tenant-RLS proof.
- Authority: implementation of the owner-approved fail-closed defaults and Delta v1.2.1, independently reviewed source-only on 2026-08-30.
- Effect: API-01 now has source-only transport/projection coverage while durable idempotency, commercial pricing persistence and runtime authorization remain explicit owner gates.

## D-016 — Canonical Local Maps export projection

- Decision: Local Maps CSV serialization is a pure, bounded projection of the tenant-scoped read contract with stable columns, explicit `UNKNOWN`/null semantics and no private/raw references. A REST download route, object storage and signed URL are deferred until runtime evidence and owner authorization exist.
- Authority: implementation and contract tests on 2026-08-30.
- Effect: export formatting is deterministic without implying that a canonical database dataset or signed evidence capability is available.

## D-017 — Local admin control transport boundary

- Decision: preflight, approve, stop, single-run retry and provider-canary routes are explicit admin operations. They require `local:execute` or the separate `provider:canary` permission plus `Idempotency-Key`; the default store fails closed with `503 OWNER_GATE_REQUIRED` and reports zero provider calls.
- Authority: implementation and focused tests of API-01C on 2026-08-30.
- Effect: the API surface is now explicit and auditable without granting execution, bypassing approval, or implying runtime RLS, durable idempotency or paid-canary readiness.

## D-018 — Provider canary scope separation

- Decision: `provider:canary` is a dedicated provider capability scope, modeled outside the client-facing `localApiScopes` union and reused by canary/capabilities handlers.
- Authority: source-only scope hardening on 2026-08-30; no new production permission is granted by this contract.
- Effect: provider scope checks cannot drift through untyped string literals; exact production capability-read authorization remains owner-gated.

## D-019 — Injectable signed cursor codec

- Decision: provide an HMAC-SHA256 cursor codec that accepts an injected owner-managed secret and verifies signature plus tenant/cycle/resource binding.
- Authority: source-only security hardening on 2026-08-30; route activation still depends on separately approved secret provisioning, rotation and runtime proof.
- Effect: read routes can emit and validate tamper-evident cursors when an owner-managed secret is injected, while the default dependency remains unsigned and API-01 stays `PARTIAL` until that gate is proven.

## D-020 — OpenAPI capability-route parity

- Decision: include the existing read-only provider-capabilities route in the canonical OpenAPI document, with its explicit `provider:canary` scope and fail-closed owner-gate response.
- Authority: route/OpenAPI parity audit and JSON validation on 2026-08-30.
- Effect: all 26 documented paths now have route-tree coverage; no provider registry, credential or external call is enabled by the specification update.

## D-021 — Bidirectional API-01 route contract check

- Decision: validate the Selena API-01 OpenAPI surface in both directions: every documented path/method must have a concrete route file, and the documented route set must not omit a required API-01 path.
- Authority: source-only route-file/OpenAPI audit on 2026-08-30 (`16` API-01 paths, no missing route or method).
- Effect: future API-01 additions must update both transport and canonical OpenAPI evidence; this check does not authorize runtime execution or provider access.

## D-022 — Evidence pagination high-water before slicing

- Decision: evidence cursors use a store-provided maximum captured-at value across the complete tenant/cycle Maps and Local AI evidence sets, computed before pagination, rather than deriving the snapshot from the returned page.
- Authority: source-only implementation and regression test on 2026-08-30.
- Effect: later pages cannot spuriously report `CURSOR_STALE` because an unseen row is newer than the current page; durable transaction snapshot/RLS proof remains owner-gated.

## D-023 — Quote cardinality invariants

- Decision: validate Local Maps quote responses against a non-empty surface set and the locked arithmetic `tasks = points × keywords × repeats`, `maxProviderAttempts = tasks × 3`.
- Authority: source-only contract/OpenAPI implementation and negative tests on 2026-08-30.
- Effect: malformed adapter output cannot silently alter scope or retry exposure; commercial pricing snapshots and durable persistence remain owner-gated.
