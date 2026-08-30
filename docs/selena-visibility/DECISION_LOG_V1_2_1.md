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

## D-024 — Typed local action success responses

- Decision: setup adapters return operation-specific validated result objects, and admin adapters return a validated action result; handlers emit `200/201/202` only for a non-null, schema-valid durable response.
- Authority: source-only response contracts, route tests and OpenAPI schemas on 2026-08-30.
- Effect: future runtime adapters have an explicit success path without weakening the default fail-closed owner gate or enabling provider calls.

## D-025 — Explicit tenant adapter boundary

- Decision: every Local write, setup and admin adapter input must carry the `tenantId` copied from the authenticated context, alongside the existing auth context and canonical body hash.
- Authority: source-only defense-in-depth hardening on 2026-08-30.
- Effect: future durable adapters receive an explicit tenant boundary and tests detect accidental omission; this does not replace database-enforced RLS or transaction-local tenant context, which remain owner-gated.

## D-026 — Preserve declared observer coordinates in Local AI context identity

- Decision: Local AI task revalidation removes only coordinate-proof metadata (`coordinateProofReference` and `pointId`) before recomputing `contextHash`; `observerLatitude` and `observerLongitude` remain part of the observer conditions and therefore remain hash-bound.
- Evidence: source-only correction in `79e4c259`, web Local Read API regression coverage (`25/25` focused; `363/363` web suite, 4 skipped), web typecheck pass.
- Authority: safe source-only integrity default; no migration, provider call, credential, network or feature-flag activation.
- Effect: a declared coordinate change cannot be hidden behind a proof-field parse, while valid locked coordinate contexts remain readable; Local AI automation and runtime activation remain disabled.

## D-027 — Keep Maps rehearsal and normative adapter paths fail-closed

- Decision: retain the deterministic stub as the only runnable zero-call rehearsal, and expose the normative `LocalMapsRankAdapter` shape through a disabled guard whose `execute` and `normalize` operations reject with `LOCAL_MAPS_REHEARSAL_NOT_LIVE` before any I/O. The reserved `stub-local-maps-v1` identity cannot enter the live provider path.
- Evidence: source-only implementation and targeted adapter tests (`5/5`) plus lib typecheck in `4721fd23`.
- Authority: safe source-only separation; no provider registration, credential, network, migration, feature-flag or paid execution is enabled.
- Effect: future runtime work has an explicit contract boundary without turning the rehearsal stub into a false live-provider capability or readiness claim.

## D-028 — Derive the locked Maps provider coordinate wire value

- Decision: expose a pure formatter that parses the materialized, frozen Local Maps request and returns the exact provider `location_coordinate` value as `latitude,longitude,zoom`. The formatter does not recompute grid centers, alter precision, perform I/O or enable a provider.
- Evidence: source-only implementation in `264badde`, focused adapter test (`5/5`) and contracts typecheck on 2026-08-30.
- Effect: future provider adapters have one explicit wire representation bound to the committed request; provider registration, credentials and network execution remain owner-gated.

## D-029 — Require reviewed evidence for Maps name/address fallback identity

- Decision: primary `placeId`/CID identity remains backward-compatible. If neither primary identifier exists, setup and active Lock contracts require `matchedName` plus `matchedAddress`, policy `REVIEWED_NAME_ADDRESS_FALLBACK`, status `REVIEWED_MATCH` and `reviewed=true`; unresolved or unreviewed fallback identities are rejected.
- Evidence: source-only contract and negative-test hardening in `eca55522`; contracts `228/228`, lib `890/890`, web unit `363/363` with four skipped and typechecks on 2026-08-30.
- Effect: identity matching is explicit and auditable without pretending to perform a Places lookup; identity evidence remains distinct from rank-result evidence and no provider call is enabled.

## D-030 — Keep blanket RLS FORCE migration out of the source-only slice

- Decision: do not add a blanket `FORCE ROW LEVEL SECURITY` migration for every `sv_*` table. Public/static tables lack tenant policies, and FORCE alone does not establish a non-owner runtime role or transaction-local tenant context. A safe allowlist, role/GUC plumbing and disposable-DB proof require an owner-approved runtime slice.
- Authority: bounded read-only adversarial review on 2026-08-30; no migration was retained or applied.
- Effect: RLS remains `PARTIAL`/owner-gated rather than being overstated as verified; no destructive or runtime database action occurred.

## D-031 — Keep OpenAPI identity branches aligned with the reviewed fallback contract

- Decision: describe Local place-entity confirmation as either a primary Place ID/CID branch or a reviewed name/address fallback branch. The fallback branch requires `REVIEWED_NAME_ADDRESS_FALLBACK`, `REVIEWED_MATCH` and `reviewed=true`, while primary identifiers remain compatible.
- Evidence: `dbccc04e` updates `packages/api-spec/src/openapi.json`; focused parity tests pass `3/3` on 2026-08-30.
- Effect: generated/client-facing API documentation no longer contradicts the source validator; this does not add Places lookup or runtime persistence.

## D-032 — Require paired observer coordinates for coordinate mode

- Decision: `observerLatitude` and `observerLongitude` must be supplied together; `observerGeoMode: DECLARED_COORDINATE` is invalid without both. Area and unknown modes remain available without coordinates.
- Evidence: source-only contract and positive/negative tests in `dbccc04e`; contracts `229/229` and typecheck pass on 2026-08-30.
- Effect: pin-level Local AI context cannot be represented with a partial or missing coordinate pair; capture proof and manual-only policy remain unchanged.

## D-033 — Reject duplicate manual Local AI task keys before planning

- Decision: `planCaptureTasks` tracks generated `scenarioId:contextHash:repeatIndex` keys and fails closed with `CAPTURE_TASK_DEDUPE_KEY_DUPLICATE` on collision before returning a plan.
- Evidence: source-only planner guard and regression test in `dbccc04e`; focused planner tests `7/7`, lib `891/891` and typecheck pass on 2026-08-30.
- Effect: duplicate manual capture jobs cannot be silently emitted from a malformed lock block; no scheduler, queue or provider path is enabled.

## D-034 — Require check references for live Maps evidence

- Decision: live Maps provenance with `FOUND` or `ABSENT` outcome must carry a non-empty, non-stub `checkReference`; provider-auth, provider-failure and unknown outcomes may carry a nullable reference because no successful observation was established.
- Evidence: source-only contract and negative/positive tests in `fe74649d`; migration `0044` JSON shape checks, Drizzle schema checks and fixtures were aligned; contracts `230/230`, lib `891/891`, schema `29/29` and typechecks pass on 2026-08-30.
- Effect: a live Maps result cannot be treated as evidence without an auditable check reference. No migration was applied, provider was registered, credential used or network call made.

## D-035 — Keep the Local measurement worker boundary fail-closed

- Decision: register a dedicated `selena-local-measure` queue and consumer with concurrency one and queue retries disabled, but make the default executor return `OWNER_GATE_REQUIRED` with `providerCalls=0`; the handler throws that gate instead of acknowledging a false success. A later runtime slice must inject the transaction-owned executor explicitly after Lock, budget, RLS and provider approval.
- Evidence: source-only worker boundary in the feature branch; `apps/worker` typecheck and targeted Biome checks pass, and a local `tsx` smoke confirms the default handler throws `LOCAL_RUNTIME_EXECUTOR_NOT_REGISTERED` on an accidental job (2026-08-30).
- Effect: the queue topology and handler seam are explicit for future at-least-once work; an accidental job fails visibly rather than being acknowledged as measured, while no durable state is written, money spent or provider registered today.

## D-036 — Quarantine the historical planar grid generator

- Decision: move the pre-v1.2.1 planar `squareGridPoints` implementation into an explicit compatibility-only module and mark it deprecated. Preserve its exports for the historical micro-slice, while normative Local Maps code continues to use `sphericalGridPointsV1` exclusively.
- Evidence: source-only refactor in the feature branch; contracts `230/230`, contracts typecheck and targeted Biome checks pass on 2026-08-30. Repository search found no non-test production caller of the planar generator.
- Effect: the legacy algorithm remains available only for backward-compatible historical tests and cannot be mistaken for the v1.2.1 spherical grid implementation; no migration, provider or runtime path changed.

## D-037 — Keep process-level worker isolation unclaimed

- Decision: the Local queue boundary is fail-closed, but it is not represented as a separate process. The existing worker bootstrap still performs legacy credential refresh, scrape-target validation and pg-boss startup before registering the Local handler; do not describe this as full Local-worker isolation until an owner-approved runtime architecture supplies it.
- Evidence: read-only inspection of `apps/worker/src/index.ts` and `apps/worker/src/handlers.ts` at `dc91f8d3`; the Local handler itself imports no database, provider or credential implementation and throws its owner gate before acknowledging a job.
- Effect: the source-only acceptance claim stays limited to queue/handler topology and false-success rejection; process-level startup isolation remains an explicit runtime owner gate.

## D-038 — Require coordinate mode for pin-level Local AI proof

- Decision: a Local AI row may be promoted to `VALID` only when its proof-bearing snapshot declares `observerGeoMode: DECLARED_COORDINATE` in addition to valid latitude/longitude, `pointId` and a non-empty proof reference. Coordinates attached to `DECLARED_AREA` or `UNKNOWN` remain insufficient.
- Evidence: `hasCoordinateProof` and regression coverage in the feature branch at `603fad81` plus the follow-up source-only patch; targeted web read-API tests `26/26` and web typecheck pass. The existing manual submit route still carries only the immutable observer context, so this decision does not claim an end-to-end proof write path.
- Effect: area-level context cannot be misclassified as pin-level evidence; proof metadata transport and persistence remain a separate source/runtime slice and no provider or automated Local AI path is enabled.
