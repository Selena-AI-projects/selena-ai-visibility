# Selena Visibility local/staging runbook

## Scope

The Selena client layer runs above the existing Elmo Measurement Engine and Evidence Ledger. Website Collector, public-source fixture adapters, Connected Analytics contracts and Monitoring Core are reused as completed components. Native apps and live provider integrations are not part of this MVP.

## Safe local verification

1. Preview each bounded action with `bash tools/visibility_os_disposable_rehearsal.sh --dry-run gate12`, `--dry-run 0045`, or `--dry-run 0049`; dry-run does not call Docker or apply migrations.
2. The owner-authorized scope is limited to an isolated no-pull Docker/Colima rehearsal. Ensure `postgres:16-alpine` already exists in the local Docker image store; the wrapper uses `--pull never` and does not contact an image registry.
3. Under that explicit scope, run `bash tools/visibility_os_disposable_rehearsal.sh --run gate12`, `--run 0045`, or `--run 0049` from the repository root. The 0049 suite runs Gate12 first and then performs the row-level lease assertions.
4. The wrapper creates a randomly suffixed compose project from `tools/visibility_os_disposable_postgres.compose.yml`, verifies that the generated project label is unused, publishes PostgreSQL on a random loopback port, and uses `tmpfs` rather than a persistent database volume. Every subordinate script rejects a missing or non-rehearsal project name.
5. On success, script failure, `INT`, or `TERM`, the wrapper runs and verifies the selected Compose command's `down --volumes --remove-orphans` for that exact unique project. `REHEARSAL_COMPLETE` is printed only after teardown succeeds; a teardown failure exits non-zero as `BLOCKED_CLEANUP`.
6. `SIGKILL` or a host crash cannot run a shell cleanup trap. If either occurs, use the printed exact compose project name to inspect and remove only that uniquely labelled project before retrying.
7. Run the lib test suite and web typecheck/build separately, then confirm provider calls and Elmo jobs remain zero.

Production database, real payment providers, Bright Data, OpenRouter and external analytics credentials must not be used by this runbook.

## Flow states

`DRAFT → AWAITING_APPROVAL → READY → RUNNING → COMPLETE` is the successful path. `BUDGET_BLOCKED`, `PARTIAL`, `FAILED` and `STOPPED` are terminal or operator-visible control states. A quote exceeding the order cap is blocked before dispatch. Cardinality and duplicate dispatch checks happen before runtime execution.

## Authentication and tenant safety

- Browser cabinet uses Better Auth session membership.
- Machine-to-machine routes use a scoped hashed API key.
- Tenant scope comes only from AuthContext; body/query `tenantId` is rejected when it differs.
- Never log tokens, raw credentials or provider secrets.
- Connector contracts remain `NOT_ACTIVATED` until explicit owner-approved integration work.

## Incident handling

- `BUDGET_BLOCKED`: adjust the test quote or budget; do not bypass the gate.
- `CARDINALITY_BLOCKED`: inspect scenario/system/repeat cardinality and dispatch keys.
- `DUPLICATE`: reuse the original idempotent result; do not dispatch again.
- `GROUNDING_FAILED`: keep the Action Plan unpublished and inspect evidence references.
- `PARTIAL` or `FAILED`: preserve immutable snapshots and audit events; retry only through a new approved cycle.
- `STOPPED`: record the stop reason and leave no new dispatches.

## Export safety

CSV/report exports use canonical rows and tenant-scoped data. Exports must contain source references and limitations, never secrets, access tokens or raw provider credentials.

## Railway staging fixture activation

Staging project: `selena-ai-visibility` (`51dd0770-e622-4734-a705-ace401234bb8`). The isolated staging environment is `90f3bf7f-5e53-4de3-a3f7-56052b706f24`; production is not modified.

- Web: `55909c04-a9ea-49af-9b71-98e4d7b848c9`, generated URL `https://web-staging-4a8f.up.railway.app`.
- Worker: `a43c94e7-76c5-4490-b8cb-87fd4ff97e33`, no public domain.
- Migration: `85e09996-7bc6-4dcd-a4af-7582683fa38c`, one-shot, restart policy `NEVER`.
- PostgreSQL: `280e3b59-77c3-46e0-8c2c-75955b7f9a40`.

Fixture bindings use `DEPLOYMENT_MODE=local`, `SCRAPE_TARGETS=stub:stub`, `ONBOARDING_LLM_TARGET=stub:stub`, telemetry disabled and `SCHEDULE_MAINTENANCE_ENABLED=false`. Staging-only auth/encryption secrets are generated randomly and passed to Railway through sealed stdin bindings; their values are never read back.

Activation order is migration SUCCESS → web SUCCESS and `/api/setup-status` HTTP 200 → worker SUCCESS with bounded logs. Real provider calls, payment calls, Elmo measurements and scheduler fan-out remain disabled.

## Production readiness gate (2026-08-15)

- Release candidate `selena-visibility-mvp-rc1` remains unchanged and does not contain commits `3e3501f5` and `6c515889`.
- Release candidate `selena-visibility-mvp-rc2` was created at commit `6c515889474c13824f806eaf3e70cbaf128126a5` and published to the Selena origin repository.
- Read-only Railway review confirmed staging remains healthy and production environment `72cd278f-af7c-4802-8da3-20a143d0ba1e` currently contains zero services.
- Production PostgreSQL backup/PITR cannot be verified because no production PostgreSQL service exists. No production service, migration, secret, domain, or deployment was created.
- Required rollback plan before production boot: retain the immutable release tag, take a provider-confirmed database backup/PITR checkpoint, apply migrations as a one-shot job, verify health, and roll back application services to the prior immutable release without destructive database changes. This plan is pending the production database and backup/PITR capability.

## Leftover proof databases (2026-09-03)

Six disposable and restore PostgreSQL services from the 0054–0060 proof runs are
still online in the `staging` environment, each holding a volume with a copy of
the database. The acceptance record states they were removed or scaled to zero;
they are neither. They cost money and widen where tenant data sits.

Deleting a service destroys its volume, so this is an owner action and is listed
here rather than performed:

| Service | Id | Created |
|---|---|---|
| `Postgres-selena-v13-0059-0060-isolated-20260903` | `88dbe261-c7f6-4733-83cf-15e579f6990e` | 2026-09-02 21:49Z |
| `Postgres-selena-v13-0058-isolated-20260902` | `9bec47ee-bebe-49e6-bb0e-ae29fa39ce3c` | 2026-09-02 12:08Z |
| `Postgres-selena-v13-0056-restore-20260902` | `eda9ad35-e488-477a-bc25-96afeecebdf8` | 2026-09-02 07:12Z |
| `canary-clean-20260902` | `bb4c60d1-9529-4de1-8792-075d195199cf` | 2026-09-02 06:21Z |
| `reconciliation-0054-20260902` | `bbcbf014-7c66-4254-8cea-f912e6f3f7b2` | 2026-09-02 00:02Z |
| `Postgres-selena-v13-restore-20260901` | `a34b2749-130a-47f3-8da3-8f58e3775fe9` | 2026-09-01 01:35Z |

**Do not delete** `Postgres` (`280e3b59-77c3-46e0-8c2c-75955b7f9a40`) — that is
the staging database itself — or the `web`, `worker`, `migrate`, `measure` and
`publish` services beside it.

Separately, the `production` environment runs `Postgres-W_9y`
(`1d67db6f-7df7-44d6-a9d7-3d7058afafff`) with no application in front of it,
online since 2026-08-15. It holds the PITR and restore evidence the production
gate rests on, so it is a keep-or-drop decision of its own rather than cleanup.
