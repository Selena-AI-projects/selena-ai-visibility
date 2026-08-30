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
