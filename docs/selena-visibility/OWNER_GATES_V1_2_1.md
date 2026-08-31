# Selena AI Visibility v1.2.1 — owner gates

Owner authorization received on 2026-08-30:

> Подтверждаю проект Selena AI Visibility, безопасные технические defaults и указанную матрицу полномочий. Разрешаю создать отдельную feature-ветку, делать коммиты, push этой ветки и draft PR. Активируй долгосрочную цель и reusable orchestration skill. Платные вызовы, staging/production, merge, deploy, billing и credentials — только после моего отдельного подтверждения.

| Gate | State | Scope |
|---|---|---|
| Local implementation and tests | `APPROVED` | Feature branch/worktree, docs, contracts, free stubs, disposable local validation |
| Atomic commits | `APPROVED` | No amend, rebase, or history rewrite |
| Push feature branch | `APPROVED` | `feature/selena-visibility-v1-2-1` only |
| Draft PR | `APPROVED` | Review only; no merge |
| Apply migrations to disposable PostgreSQL | `APPROVED — scoped rehearsal only` | Owner authorized an isolated no-pull Docker/Colima rehearsal for migrations `0037–0050`, Gate12 and 0045/0049 checks, with teardown and stop-on-error; no shared/staging/production or provider path |
| Blind Claude Max full-spec review | `COMPLETED — Max5 + Max20 evidence recorded` | Delta ref `c00d98b7` was reviewed through Claude.ai Max5/Sonnet in 38 read-only turns; base architecture ref `38de9dd1` was reviewed through Claude.ai Max20/Opus in 57 read-only turns. Both had zero permission denials and no commands, tests, migrations, database, provider or network actions. Max20 verdict is `NOT READY / NO-GO` for Maps pilot, Local AI beta and commercial launch; runtime/DB/RLS, provider, UI, commercial and production gates remain open. Claude's isolated snapshot could not independently verify Git SHA, so local checkout evidence remains authoritative; no reconstructed ledger or paid API fallback may replace the reports |
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
| Point-aware Local AI task identity | `OWNER_DECISION_REQUIRED` | Compatibility contextHash excludes pointId, while database task uniqueness uses that hash; choose a versioned identity/migration posture before supporting point-distinct equal-condition contexts |
| `profileReviewLock` contract | `OWNER_DECISION_REQUIRED` | Delta names this child block but never defines its fields; owner must define it or remove it from the required Lock |
| Rollback posture for migrations 0043–0048 | `OWNER_DECISION_REQUIRED` | Delta requires forward/replay/rollback proof, but destructive down scripts are not defined; owner must approve reversible disposable-DB scripts or an explicit forward-only exception |
| Commercial cap/retry source of truth | `OWNER_DECISION_REQUIRED` | Delta targets total provider caps of $15/$30 and up to three attempts, while the existing catalog contains $12/$28 and `one_technical_invalid`; no silent product-policy choice is allowed |
| Legacy public grid API compatibility | `OWNER_DECISION_REQUIRED` | The package still exports the pre-Delta flat-earth `squareGridPoints`; removing or deprecating that public symbol may affect consumers even though no in-repo production caller remains |

Until these are confirmed, source-only fencing/result persistence may advance, but aggregate budget claim/finalize SQL, runtime grants, worker registration and provider activation stay disabled.

The `0046` daily journal claim uses the database UTC clock only as an operational restart identity, not as the commercial monthly billing period. One unresolved claim blocks the entire project across UTC days and question-set versions. A proven pre-provider failure is audited as `NO_SPEND`; a crash, provider failure, incomplete ledger/cycle or other ambiguous attempt remains unresolved as `CLAIMED`, `EXECUTING`, or `HOLD` and blocks all repeats, including `SELENA_JOURNAL_FORCE=1`, until an owner-authorised evidence review defines the recovery action. No automatic retry of ambiguous work is authorised.
