# Selena AI Visibility v1.2.1 — owner gates

Owner authorization received on 2026-08-30:

> Подтверждаю проект Selena AI Visibility, безопасные технические defaults и указанную матрицу полномочий. Разрешаю создать отдельную feature-ветку, делать коммиты, push этой ветки и draft PR. Активируй долгосрочную цель и reusable orchestration skill. Платные вызовы, staging/production, merge, deploy, billing и credentials — только после моего отдельного подтверждения.

| Gate | State | Scope |
|---|---|---|
| Local implementation and tests | `APPROVED` | Feature branch/worktree, docs, contracts, free stubs, disposable local validation |
| Atomic commits | `APPROVED` | No amend, rebase, or history rewrite |
| Push feature branch | `APPROVED` | `feature/selena-visibility-v1-2-1` only |
| Draft PR | `APPROVED` | Review only; no merge |
| Apply migrations to disposable PostgreSQL | `AWAITING_EXPLICIT_COMMAND` | Repository rules require a separate explicit migration-run instruction; source-only drafts remain approved |
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

Until these are confirmed, source-only fencing/result persistence may advance, but aggregate budget claim/finalize SQL, runtime grants, worker registration and provider activation stay disabled.
