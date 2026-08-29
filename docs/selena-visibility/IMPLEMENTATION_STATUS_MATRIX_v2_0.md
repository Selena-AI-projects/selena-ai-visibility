# Visibility OS Implementation Status Matrix v2.0

Working state of local branch `codex/visibility-os-release-integration`, based
on `origin/release/selena-visibility-mvp` merge commit `d0a43adf`, on
2026-08-29. This matrix covers Visibility OS only;
`IMPLEMENTATION_STATUS_MATRIX_v1_4.md` remains the record for the existing AI
core.

**Nothing here is deployed or database-released.** M1 through M6 source are
merged into `release/selena-visibility-mvp`. This branch numbers the M2 through
M6 migrations as `0038` through `0042` and adds the release-only Gate 12
rehearsal. Migrations `0037` through `0042` are unapplied outside disposable
PostgreSQL 16 scratch databases. No production or staging database,
deployment setting, payment path, credential, review source, or live provider
was touched.

Feature statuses use the existing vocabulary: `DESIGNED` / `CODE_IN_BRANCH` /
`SCHEMA_EXISTS-in-branch` / `NOT_BUILT`. A gate remains `NOT_STARTED` or
`FAIL` until every criterion in `SELENA_VISIBILITY_OS_ACCEPTANCE_GATES_V2.md`
has a matching artifact.

## Packages

| Package | Status | Evidence |
| --- | --- | --- |
| M0 cycle economics | `CODE_IN_BRANCH` | merged into `release/selena-visibility-mvp`; contract package tests passed before merge |
| M1 measurement registry | `SCHEMA_EXISTS-in-branch` | merged into the release branch: five Drizzle tables, numbered but unapplied SQL, compatibility view, separate backfill; PG16 scratch registry rehearsal passed |
| M2 Local Visibility | `CODE_IN_BRANCH` | merged into the release branch: Local contracts and frozen fixture, seven RLS tables in numbered migration `0038`, pre-provider guard, isolated queue name, locked/unknown cabinet state, unit coverage and PG16 scratch rehearsal |
| M3 Search and Reputation | `CODE_IN_BRANCH` | merged into the release branch: six RLS tables in numbered migration `0039`, domain-specific cardinality contracts, review velocity/provenance functions and fail-closed Search/Reputation surfaces; no runtime adapter, worker queue or external collection |
| M4 Action and Evidence Loop | `CODE_IN_BRANCH` | merged into the release branch: six RLS tables in numbered migration `0040`, deterministic action lifecycle and 11-rule non-causal attribution contract, outcome-provenance stub and PG16 scratch chain; no API, UI, runtime adapter or Outcome persistence |
| M5 Visibility Map | `CODE_IN_BRANCH` | merged into the release branch: two `security_invoker` live views bound to explicit observation evidence and immutable datasets, strict Before/After compatibility, four non-color marker semantics and PG16 two-tenant rehearsal; no route, provider or materialized cache |
| M6 Outcome Layer | `CODE_IN_BRANCH` | merged into the release branch: four RLS tables for connected/uploaded sources, versioned metric definitions, nullable observations and attribution windows; deterministic non-causal attribution adapter, exact multi-location aggregate and location-bound signed export; no route, provider, connector, payment or worker |

## Acceptance gates

| Gate | Status | Evidence or blocker |
| --- | --- | --- |
| 1 `AI_CORE_NO_REGRESSION_PASS` | `PASS (release integration local)` | Node 24.18: contracts 151/151, lib 828/828, config 87/87, web 294 passed / 4 skipped; contracts, lib, config, web and worker typechecks plus the production web build passed. The existing PostgreSQL AI stub cycle passed over the complete numbered chain through `0042` |
| 2 `MEASUREMENT_DOMAIN_ISOLATION_PASS` | `PASS (M3 local)` | M1 and M2 scratch criteria were repeated before M3. Search/Reputation writes created no AI or Local observations; uniqueness, domain FK, retry-in-place, Configuration Lock cardinality, cost sums, failure/emergency-stop status and two-tenant RLS stayed domain-specific. Search/Reputation have no registered runtime queues or adapters |
| 3 `LOCAL_MEASUREMENT_SCHEMA_PASS` | `PASS (M2 local)` | disposable PG16 proved the exact observation uniqueness key, complete `grid points x keywords x repeats` cardinality, explicit invalid/unmeasured rows with reasons, required nonnegative depth, reconstructable region/coordinate/keyword/provider and immutable grid versions |
| 4 `GEO_GRID_METRICS_PASS` | `PASS (M2 local)` | frozen `local-coverage-v1` fixture covers Top-3/10/20, outside Top-20, found-only average rank plus found share, Share of Local Voice, competitors, shallow captures and `UNKNOWN` empty denominators with deterministic six-decimal results |
| 5 `READINESS_VISIBILITY_SEPARATION_PASS` | `PASS (M3 local)` | strict portfolio contracts give readiness `READINESS_SNAPSHOT` evidence and visibility `MEASUREMENT_OBSERVATION` evidence, reject an overall score and preserve surface metrics when readiness changes. Reputation metrics require a review-snapshot FK; topic/sentiment rows require `analysis_method_version`; source inspection found no readiness-as-rank wording or aggregate score in the cabinet |
| 6 `EVIDENCE_LOOP_INTEGRITY_PASS` | `PASS (M6 local)` | persisted Outcome windows use tenant-scoped FKs for the exact source, location, metric/version, baseline/verification observations, datasets, action and verification cycle. The PG16 rehearsal produced four complete chains across two organizations and two locations each; cross-tenant source scope, observation mutation and tampered assessment links were rejected |
| 7 `ATTRIBUTION_GUARDRAIL_PASS` | `PASS (M6 local)` | nullable Outcome values remain `UNKNOWN`; incompatible source/location/metric/version or overlapping periods block comparison. Outcome observations feed the existing 11-rule decision order, which still has no `CAUSAL` verdict; positive and confounded cases were repeated with persisted Outcome windows and complete evidence IDs |
| 8 `BEFORE_AFTER_REPRODUCIBILITY_PASS` | `PASS (M5 local)` | distinct ready datasets must match project, location, keyword set, grid definition and version, provider, locale, device/context and formula version; every mismatch is returned by name, incompatible and one-sided groups stay `UNKNOWN`, no aggregate is produced, and existing `selena-cycle-diff/1` tests remain green |
| 9 `LOCAL_COST_CARDINALITY_PASS` | `PASS (M2 local)` | Configuration Lock freezes formula, cardinality, cost keys and worst-case budget; grid ceiling is 49; expected+1 and emergency stop refuse before the provider callback and record the incident; retry reuses only its exact invalid/unmeasured row without increasing expected cardinality |
| 10 `VISIBILITY_MAP_DATA_INTEGRITY_PASS` | `PASS (M5 local)` | `security_invoker` point rows exist only through exact `sv_evidence_index.observation_ref = observation_id`; every row carries timestamp, provider, keyword and dataset; interpolation is false; `MEASURED` / `MISSING` / `INVALID` / `UNKNOWN` have unique shape+pattern semantics and ARIA labels; the live view reports no fake refresh time or staleness |
| 11 `MULTI_LOCATION_TENANT_PASS` | `PASS (M6 local)` | two organizations with two locations each were isolated under RLS; each organization aggregate reproduced the exact sum `4 + 6 = 10` from its permitted location set, incomplete/foreign/unknown location sets fail closed, and HMAC-signed exports bind organization, project, location, dataset, metric, period and observation IDs so a changed location invalidates the signature |
| 12 `VISIBILITY_OS_VERTICAL_SLICE_PASS` | `PASS (release integration local)` | clean disposable PG16 replayed migrations `0000` through `0042`; one complete stub-only project produced an AI answer at zero cost, Local baseline/verification, finding and recommendation, approved action and change event, two evidence-backed map datasets, nullable Outcome observations preserved as `UNKNOWN`, a `NOT_MEASURED` attribution assessment, canonical CSV evidence and all 15 audit events in order |

Gate 12 is repository-only evidence. It runs the M2 through M6 chain and the
existing AI stub cycle without a live provider, paid call or hosted mutation.
Its PASS does not imply that any numbered migration was applied to staging or
production, or that hosted database connectivity is accepted.

## Pending database files

| File | Purpose | Applied state |
| --- | --- | --- |
| `packages/lib/src/db/migrations/0037_visibility_os_measurement_registry.sql` | five registry tables, indexes, RLS policies, domain seeds, AI compatibility view | scratch only; not applied to staging or production |
| `packages/lib/scripts/backfill-visibility-os-ai-cycles.sql` | id-preserving AI umbrella rows after M1 is applied | scratch only |
| `packages/lib/src/db/migrations/0038_visibility_os_local_visibility.sql` | Local business-location fields, cost domain references, seven Local tables, constraints, triggers and RLS policies | numbered in this branch; scratch only |
| `packages/lib/src/db/migrations/0039_visibility_os_search_reputation.sql` | Search queries/rank observations and Reputation sources, snapshots, velocity metrics and versioned topic observations | numbered in this branch; scratch only |
| `packages/lib/src/db/migrations/0040_visibility_os_action_evidence_loop.sql` | approved actions, approvals, change events/assets, verification cycles and non-causal attribution assessments | numbered in this branch; scratch only |
| `packages/lib/src/db/migrations/_pending-os/M4_action_evidence_loop_down.sql` | reverse only M4 tables, triggers, enums and nullable ledger-scope columns; preserves incidents, audit and M1–M3 | unnumbered local rollback; scratch only |
| `packages/lib/src/db/migrations/0041_visibility_os_visibility_map.sql` | observation-backed point view and dataset compatibility view; both live `security_invoker` read-models | numbered in this branch; scratch only |
| `packages/lib/src/db/migrations/_pending-os/M5_visibility_map_down.sql` | drops only the two M5 views and preserves all M1–M4 state | unnumbered local rollback; scratch only |
| `packages/lib/src/db/migrations/0042_visibility_os_outcome_layer.sql` | connected/uploaded sources, metric definitions, nullable observations, attribution windows, exact scope triggers/FKs and four RLS policies | numbered in this branch; scratch only |
| `packages/lib/src/db/migrations/_pending-os/M6_outcome_layer_down.sql` | removes only M6 tables, triggers and the nullable M6 assessment link; preserves incidents, audit and M1–M5 | unnumbered local rollback; scratch only |

Migration `0037` remains unchanged. The journal now appends `0038` through
`0042` in dependency order without generating or applying SQL. M2's optional
`SELENA_LOCAL_VISIBILITY_ENABLED` server flag is fail-closed: only the exact
value `true` unlocks the cabinet state and pre-provider guard. M3 adds no env
variables: Search and Reputation remain `ADD`, and the shared surface guard
rejects them as not implemented even if a caller supplies a matching flag. M4
adds no environment variable, route, provider registration or background job.
M5 adds no environment variable, route, materialized cache, provider registration
or background job. M6 likewise adds no environment variable, route, connector,
provider registration, paid call or background job. Auto-deploy is outside this
branch: release happens only through an owner merge into
`release/selena-visibility-mvp`; `railway up` was not run.

## Hosted runtime TLS blocker

`SELENA_RUNTIME_DATABASE_CA_PEM` is not registered in the environment registry,
declared in the web environment types or referenced by a GitHub workflow. More
importantly, none of the PostgreSQL clients reads it: Drizzle, direct `pg`
clients and pg-boss receive only `DATABASE_URL`. Therefore injecting that PEM
variable in GitHub or Railway does not attach the CA certificate to a database
connection. A `DATABASE_URL` may carry its own SSL parameters, but that is not
evidence that this custom CA PEM is trusted.

Hosted CA-verified connectivity is `UNKNOWN / BLOCKED_EXTERNAL` until a separate
runtime TLS implementation and hosted connection test are authorized. No CA
handling, deployment variable or hosted service was changed in this branch;
this blocker is outside the repository-only Gate 12 PASS.
