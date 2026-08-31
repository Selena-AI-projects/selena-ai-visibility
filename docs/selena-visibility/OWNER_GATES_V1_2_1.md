# Selena AI Visibility v1.2.1 — owner gates

Owner authorization received on 2026-08-30:

> Подтверждаю проект Selena AI Visibility, безопасные технические defaults и указанную матрицу полномочий. Разрешаю создать отдельную feature-ветку, делать коммиты, push этой ветки и draft PR. Активируй долгосрочную цель и reusable orchestration skill. Платные вызовы, staging/production, merge, deploy, billing и credentials — только после моего отдельного подтверждения.

| Gate | State | Scope |
|---|---|---|
| Local implementation and tests | `APPROVED` | Feature branch/worktree, docs, contracts, free stubs, disposable local validation |
| Atomic commits | `APPROVED` | No amend, rebase, or history rewrite |
| Push feature branch | `APPROVED` | `feature/selena-visibility-v1-2-1` only |
| Draft PR | `APPROVED IN PRINCIPLE / DEFERRED` | Review only; creation waits for confirmation that dependency installs, builds, tests and disposable CI containers on Blacksmith runners have acceptable side effects; no merge |
| Apply migrations to disposable PostgreSQL | `APPROVED — scoped rehearsal only` | Owner authorized an isolated no-pull Docker/Colima rehearsal for migrations `0037–0050`, Gate12 and 0045/0049 checks, with teardown and stop-on-error; no shared/staging/production or provider path |
| Blind Claude Max full-spec review | `COMPLETED — Max5 + Max20 evidence recorded` | Delta ref `d70452ec` was reviewed through Claude.ai Max5/Sonnet in 42 restricted read-only turns (session `8d586928-18b8-47da-9542-bcdf511f9411`, report SHA-256 `2b447cde3b97633c784706b82ac31cd8ac8716f26bec4b5ef86addaf4a2eec2a`); the architecture ref `0f2dd387` was reviewed through Claude.ai Max20/Opus in 54 read-only turns (session `52b8b1ae-f3cf-43a8-a859-97a198ddcfed`, report SHA-256 `ab28aa6526f5c9966e4e50ea4572ac34a3e7cfc9816c93471efd05b970a2e971`). Both had zero permission denials and no commands, tests, migrations, database, provider or network actions. The latest verdict is `NOT READY / NO-GO` for the v1.2 commercial launch; runtime/DB/RLS, entitlement/cap source, provider, heatmap UI, signed/runtime evidence, complete §8.5 persistence, commercial and production gates remain open. Claude's isolated snapshot could not independently verify Git SHA, so local checkout evidence remains authoritative; no reconstructed ledger or paid API fallback may replace the reports |
| Paid provider call | `NOT_REACHED` | Requires exact provider, request count, maximum spend, and stop plan |
| Credentials | `NOT_REACHED` | Creation, reading, rotation, or connection requires separate approval |
| Shared staging | `NOT_REACHED` | Migration, data mutation, task enqueue, or flag enablement requires separate approval |
| Merge | `NOT_REACHED` | Separate approval after CI and review evidence |
| Deploy/production DB | `NOT_REACHED` | Separate target-specific approval |
| Billing/checkout | `NOT_REACHED` | Separate commercial approval |
| Recurring production jobs | `NOT_REACHED` | Separate schedule, cap, and kill-switch approval |

## Product/runtime decisions still awaiting the owner

These decisions are intentionally not inferred from a caller, process locale, or current test fixture:

| Decision | State | Why it is gated |
|---|---|---|
| Canonical monthly budget period and timezone | `OWNER_DECISION_REQUIRED` | Changes which calls share a monthly cap; UTC is only a technical recommendation, not an approved billing rule |
| Canonical Configuration Lock paths for Local Maps caps and price version | `OWNER_DECISION_REQUIRED` | The first runtime caller must not be able to invent its own spend authority |
| Runtime database role and grant model | `OWNER_DECISION_REQUIRED` | Role activation changes application-wide RLS behavior and can cause an outage without transaction-local tenant plumbing |
| Maximum live-attempt lease TTL | `OWNER_DECISION_REQUIRED` | The current 300-second examples are test data, not a proven product invariant |
| CLAIMED→SUBMITTED lease mutation contract | `SOURCE CONTRACT SELECTED — RUNTIME PROOF REQUIRED` | Forward-only migration `0049_visibility_os_claimed_submit_lease.sql` is the selected source contract and has been applied only in the prior disposable chain. The dedicated row-level lifecycle has not run after the stop-on-error halt; the lease TTL/rollout policy remains owner-gated before live activation |
| Immutable Maps keyword request snapshot | `OWNER_DECISION_REQUIRED` | The current Lock freezes keyword IDs/version but candidate construction reads mutable current text; choose the versioned snapshot/backfill contract before live execution |
| Canonical Maps §8.5 evidence shape | `OWNER_DECISION_REQUIRED` | Evidence is currently split across lock/attempt/observation/view layers. Define the durable contract and migration for grid/point context, language/device/OS, endpoint version, requested depth, target identity, rank group/absolute semantics, status, competitors, raw/check references and `cost_event_id` before claiming complete evidence or enabling runtime aggregation |
| Point-aware Local AI task identity | `OWNER_DECISION_REQUIRED` | Source already exposes `localAiTaskContextIdentityKey` with `pointId`, but `sv_capture_tasks` persistence still uniques on legacy `context_hash`. Choose a versioned migration posture before supporting point-distinct equal-condition contexts: add a v2 point-aware identity column/index while preserving v1 legacy rows, or explicitly reject/backfill legacy rows under an approved policy. A planner-only key change is unsafe because it could plan more tasks than the current database unique index can persist |
| `profileReviewLock` contract | `OWNER_DECISION_REQUIRED` | Delta names this child block but never defines its fields; owner must define it or remove it from the required Lock |
| Rollback posture for migrations 0043–0048 | `OWNER_DECISION_REQUIRED` | Delta requires forward/replay/rollback proof, but destructive down scripts are not defined; owner must approve reversible disposable-DB scripts or an explicit forward-only exception |
| Commercial cap/retry source of truth | `OWNER_DECISION_REQUIRED` | Delta targets total provider caps of $15/$30 and up to three attempts, while the existing catalog contains $12/$28 and `one_technical_invalid`; no silent product-policy choice is allowed |
| Legacy public grid API compatibility | `OWNER_DECISION_REQUIRED` | The package still exports the pre-Delta flat-earth `squareGridPoints`; removing or deprecating that public symbol may affect consumers even though no in-repo production caller remains |

## Decision packet (no option is selected)

The following bounded choices make the next implementation step explicit without
silently changing product policy. The owner may answer with the option IDs; any
choice still needs source tests and disposable migration proof before activation.

| Decision ID | Option | Consequence to verify |
|---|---|---|
| `EVIDENCE-A` | Store a normalized immutable observation contract as columns plus a child competitor table; link `check_reference` and `cost_event_id` directly to the observation scope | Strong SQL querying and explicit foreign keys; requires additive columns, competitor cardinality/identity rules and a backfill/rollback posture |
| `EVIDENCE-B` | Store one versioned immutable canonical evidence envelope (JSONB with a strict schema) and expose typed projections for the map/API views | One canonical payload and easier evolution; requires JSON schema/version checks, projection indexes and a decision on which links remain relational |
| `KEYWORD-A` | Materialize keyword text and language into the submitted candidate/Lock snapshot, verify a digest, and never reread mutable keyword rows | Preserves existing keyword IDs/version and makes each candidate self-contained; requires an additive snapshot field and migration checks |
| `KEYWORD-B` | Introduce an immutable keyword-set-version/keyword-version relation and require the Lock to reference it | Strong relational provenance and reuse across cycles; requires new version rows, foreign keys and an approved legacy backfill policy |
| `AI-ID-A` | Add a point-aware v2 task identity column/index while preserving the legacy `context_hash` for existing rows | Enables equal-condition tasks at distinct points without rewriting legacy rows; requires additive migration and dual-read/write compatibility |
| `AI-ID-B` | Keep the legacy uniqueness contract and explicitly reject point-distinct equal-condition contexts until a later migration | No schema change now; product must surface a deterministic rejection and the planner must remain aligned with the legacy index |

Owner response template:

`EVIDENCE-[A/B]; KEYWORD-[A/B]; AI-ID-[A/B]; approve source implementation and a new disposable rehearsal after the migration plan is drafted: YES/NO.`

Until these are confirmed, source-only fencing/result persistence may advance, but aggregate budget claim/finalize SQL, runtime grants, worker registration and provider activation stay disabled.

The `0046` daily journal claim uses the database UTC clock only as an operational restart identity, not as the commercial monthly billing period. One unresolved claim blocks the entire project across UTC days and question-set versions. A proven pre-provider failure is audited as `NO_SPEND`; a crash, provider failure, incomplete ledger/cycle or other ambiguous attempt remains unresolved as `CLAIMED`, `EXECUTING`, or `HOLD` and blocks all repeats, including `SELENA_JOURNAL_FORCE=1`, until an owner-authorised evidence review defines the recovery action. No automatic retry of ambiguous work is authorised.
