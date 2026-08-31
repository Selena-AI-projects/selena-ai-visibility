# Selena AI Visibility v1.3 — pre-production acceptance matrix

This matrix supplements v1.2/v1.2.1. It records source-only acceptance and does
not promote local evidence to runtime, hosted staging or production proof.

| Gate | Required evidence | Current status | Evidence class |
|---|---|---|---|
| V13-BASELINE | Four approved documents hashed; feature head and `0d1f21ed` relationship recorded; handoff excluded | `PASS` | Repository/read-only local |
| V13-REGISTRY | Domain/surface-aware registry with 13 exact dataset definitions, versioned schemas, external attempt policy and no embedded new dataset IDs | `PASS_SOURCE_ONLY` | Source only |
| V13-GOOGLE | Google AI Mode, SERP, Maps Place and Maps Reviews contract adapters preserve domain separation and require lifecycle captures before normalization | `PASS_SOURCE_ONLY` | Source only |
| V13-SOCIAL | Social definitions fail closed until schema, privacy, retention and cost evidence exists; Social never contributes to AI visibility | `PASS_SOURCE_ONLY` | Source only |
| V13-TRAVEL | Hotels remains canary-only and blocked from runtime/product activation until stable schema and HoReCa gate | `PASS_SOURCE_ONLY` | Source only |
| V13-EVIDENCE | Capability/source snapshot/evidence provenance is tenant-scoped; raw references remain private; reserved schemas are not invented | `PASS_SOURCE_ONLY_RUNTIME_UNKNOWN` | Source only |
| V13-HORECA | Local-first read model exposes independent modules, accepted-sample counts, UNKNOWN and evidence-linked actions without a composite score | `PASS_SOURCE_UI` | Source/UI only |
| V13-PILOTS | AVLI and KORA packages contain evidence/UNKNOWN gates, intent ontology, report templates and unit-economics decision fields without fabricated facts | `PASS_ARTIFACT` | Repository artifact |
| V13-TESTS | Changed surfaces pass supported targeted lint/typecheck/tests and web build; repository-wide baseline blockers are recorded separately | `PASS_CHANGED_SCOPE` | Local executed |
| V13-CODEX | Three independent Codex reviewers cross-audit implementation against the four-source baseline | `PASS_SOURCE_ONLY` | Static independent review |
| V13-CLAUDE | Blind read-only Claude Max review of immutable commit `5e616e63` completes without mutation or API fallback | `PASS_READ_ONLY_WITH_RUNTIME_GATES` | Static independent review |
| V13-BRANCH | Small commits contain no handoff/secrets and are pushed only to the feature branch | `PASS_PUSHED` | Git |
| V13-DRAFT-PR | Draft PR #92 targets the repository default release branch; owner approved unknown Blacksmith side effects and release integration | `OPEN_CI_PENDING` | External CI/billing |
| V13-RUNTIME | Migration/RLS execution, provider canaries, shared staging/production and paid paths | `NOT_AUTHORIZED` | Runtime/hosted/paid |

## Dataset contract inventory

The v1.3 registry must contain exactly these 13 discovery definitions:

1. `GOOGLE_AI_MODE`
2. `GOOGLE_SERP`
3. `GOOGLE_MAPS_REVIEWS`
4. `GOOGLE_MAPS_PLACE`
5. `GOOGLE_TRAVEL_HOTELS`
6. `INSTAGRAM_PROFILES`
7. `INSTAGRAM_POSTS`
8. `INSTAGRAM_REELS`
9. `INSTAGRAM_COMMENTS`
10. `TIKTOK_PROFILES`
11. `TIKTOK_POSTS`
12. `REDDIT_POSTS`
13. `YOUTUBE_VIDEOS`

Canary-ready means the contract can validate an owner-approved isolated canary.
It does not mean the source has been called, its output schema is known, or the
capability is available to a customer.

## Unconditional stop conditions

- Any credential or raw provider error reaches a client response or export.
- A source-only import, migration or UI render creates a task or provider call.
- Attempt count exceeds three or a generic queue retry is enabled.
- Maps Place is treated as Maps rank evidence, Google AI Mode is mixed with
  Google SERP, or Social is stored as Reviews.
- Social/Travel is shown as active before capability, retention and entitlement
  approval.
- UNKNOWN is converted to zero, a benchmark, a rank or an inferred outcome.
- Cross-tenant evidence/provenance can be joined without tenant scope.
