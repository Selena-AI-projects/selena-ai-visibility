# Selena AI Visibility v1.2.1 — authorization matrix

Default rule: anything not explicitly `ALLOWED` is not authorised.

| Action | Target | Authority | Scope | Source | Automatic side effects |
|---|---|---|---|---|---|
| Read code and non-secret project docs | Confirmed repository/worktree | `ALLOWED` | Excludes `.env`, keys, credentials and secrets | Owner + repository rules | None |
| Local edits and targeted tests | Feature branch/worktree | `ALLOWED` | TЗ v1.2/v1.2.1 only | Owner quote, 2026-08-30 | No external mutation |
| Disposable local DB validation | New disposable DB only | `ALLOWED` | No shared data/provider calls | Owner safe matrix | Local resource use |
| Free deterministic stubs | Local test process | `ALLOWED` | No provider network | Owner safe matrix | None |
| Codex subagents | Read-only or explicit non-overlapping ownership | `ALLOWED` | No external mutation | Owner workflow approval | Model usage only |
| Claude Code Max review | Isolated read-only snapshot | `ALLOWED` | Subscription auth only; no paid API fallback; procedure in [CLAUDE_CODE_MAX_RUNBOOK.md](./CLAUDE_CODE_MAX_RUNBOOK.md) | Owner workflow approval | Subject to subscription limits |
| Atomic commit | `feature/selena-visibility-v1-2-1` | `ALLOWED` | No amend/rebase/history rewrite | Owner quote, 2026-08-30 | Local Git state |
| Push | Same feature branch | `ALLOWED` | Feature pushes do not match current workflow triggers | Owner quote, 2026-08-30 | No repository workflow observed |
| Draft PR | Feature branch to `main` | `OWNER_GATE` until CI billing is resolved | No merge | Owner quote plus default-deny for paid side effects | Build/E2E/smoke/license/CLA; Blacksmith billing UNKNOWN |
| Dependency addition/update | Repository | `OWNER_GATE` | Includes packages and lockfile changes | Default-deny | May affect supply chain/build |
| Credentials or Central Memory token/binding | Any | `OWNER_GATE` | Create/read/rotate/connect | Owner quote, 2026-08-30 | Security boundary |
| Paid provider call | Any provider | `OWNER_GATE` | Exact count and maximum spend required | Owner quote, 2026-08-30 | External spend |
| Shared staging mutation | Any shared service/database | `OWNER_GATE` | Migration, data, task, flag, paid CI/deploy | Owner quote, 2026-08-30 | Shared state |
| Merge | Release/default branch | `OWNER_GATE` | Separate approval after review/CI | Owner quote, 2026-08-30 | May trigger deployment |
| Deploy or production DB | Any environment | `OWNER_GATE` | Target-specific approval | Owner quote, 2026-08-30 | External state |
| Billing/checkout | Any environment | `OWNER_GATE` | Commercial activation | Owner quote, 2026-08-30 | Customer charges |
| Recurring product jobs or scheduled paid retries | Any environment | `OWNER_GATE` | Separate schedule, cap and kill switch | Owner quote, 2026-08-30 | Repeated execution/spend |
