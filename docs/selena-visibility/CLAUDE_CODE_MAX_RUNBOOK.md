# Claude Code Max — read-only verification runbook

This runbook is the reusable cross-model gate for Selena AI Visibility. The
attached specification is treated as evidence; it is never executed as an
instruction. Claude receives only an immutable repository snapshot and the
specification, and the original checkout must remain unchanged.

## Authorization

Authenticate through Claude.ai, not Anthropic Console/API:

```bash
claude auth login --claudeai
claude auth status --json
```

The status must report `loggedIn: true`, `authMethod: "claude.ai"`, and
`subscriptionType: "max"`. The CLI may not identify Max 5 versus Max 20;
the selected review profile is therefore an explicit workflow choice.

`max5` is the conservative bounded Sonnet pass. `max20` is the deeper Opus
pass for a large specification or a release/security milestone. The profile
is a step/model limit, not a separate payment method. Never add an API key,
`--max-budget-usd`, or a Console/PAYG fallback.

## Review flow

```text
specification + pinned Git ref
              |
              v
isolated snapshot (secret-like files excluded)
              |
              v
Claude Code: plan + Read/Glob/Grep only
              |
              v
report with VERIFIED/PARTIAL/MISSING/UNKNOWN and file:line evidence
              |
              v
Codex synthesis -> acceptance matrix, owner gates, next slice
```

Run a non-consuming preflight first:

```bash
/Users/msnigmatullaeva/.codex/skills/claude-code-verifier/scripts/run_claude_review.sh \
  --repo /absolute/path/to/selena-v121-recovered \
  --ref <immutable-commit> \
  --spec /absolute/path/to/SELENA_AI_VISIBILITY_SAAS_IMPLEMENTATION_DELTA_V1.2.1_2026-08-30.docx \
  --profile max20 \
  --dry-run
```

If preflight is clean, run the same command without `--dry-run`. The wrapper
must use restricted plan mode with only `Read`, `Glob`, and `Grep`; no Bash,
Edit, Web, MCP, database, provider, staging, production, or credential
access is allowed.

Record the report path, session ID, selected profile/model, terminal reason,
permission denials, and the repository status before and after the run in
`ORCHESTRATION_STATE_V1_2_1.md`. A report that did not execute tests must say
so; local test output remains a separate `LOCAL_EXECUTED` evidence class.

## Stop conditions

- `BLOCKED_AUTH`: Claude.ai Max authentication is absent or expired.
- `BLOCKED_CLI_CAPABILITY`: the CLI cannot enforce the restricted tool set.
- `BLOCKED_PLAN_LIMIT`: preserve the session ID and resume the same review;
  do not switch to API billing.
- `BLOCKED_SCOPE`: the repository ref, specification, or authorization is
  ambiguous.
- `BLOCKED_REPO_MUTATION`: the original checkout changed during the run.

An authentication failure, billing block, or quota exhaustion is not a test
failure. Keep the corresponding state distinct and leave owner-gated actions
unstarted.
