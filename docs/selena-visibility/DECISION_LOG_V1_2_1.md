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
