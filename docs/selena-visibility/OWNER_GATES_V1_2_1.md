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
