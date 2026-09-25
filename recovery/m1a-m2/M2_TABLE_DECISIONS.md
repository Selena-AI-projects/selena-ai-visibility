# M2-a: RLS decisions per table

Source: a fresh database with every migration of `release/selena-visibility-mvp` (0000–0067) replayed, 2026-09-25. The staging-only tables from the recovered 0067–0077 are not included; they get the same treatment when they are ported.

## Coverage today

| Group | Tables | Meaning under the non-owner role `selena_app` |
|---|---|---|
| RLS + FORCE + policy | 12 | Isolated |
| RLS + policy, no FORCE | 68 | Isolated for `selena_app` (FORCE only matters for the table owner), but not for the owner connection the web uses today |
| RLS on, no policy | 16 | **Deny-all**: the app breaks the moment it stops connecting as owner |
| RLS off | 10 | Readable by any role with a grant |

Roles in the target model are `selena_app` (web), `selena_worker` (jobs), and `selena_internal` (operators). None of them owns tables, and none of them has `BYPASSRLS`.

## RLS on, no policy (16)

| Table | Tenant key | Who needs it | Decision |
|---|---|---|---|
| `brands` | `organization_id` | web | Tenant policy on `organization_id` |
| `organization_settings` | `organization_id` | web | Tenant policy on `organization_id` |
| `usage_events` | `organization_id` | web (read), worker (write) | Tenant policy; worker writes through its own policy |
| `prompts` | `brand_id` → `brands.organization_id` | web, worker | Tenant policy through `brands` (index on `brand_id` exists) |
| `competitors` | `brand_id` | web | Tenant policy through `brands` |
| `brand_opportunities` | `brand_id` | web | Tenant policy through `brands` |
| `citations` | `brand_id` | web (read), worker (write) | Tenant policy through `brands` |
| `prompt_runs` | `brand_id` | web (read), worker (write) | Tenant policy through `brands` |
| `prompt_run_hourly_aggregates` | `brand_id` | web (read), worker (write) | Tenant policy through `brands` |
| `sv_free_auto_dispatch_claims` | `organization_id` | worker | No `selena_app` policy (deny); `selena_worker` policy |
| `sv_journal_no_spend_reconciliations` | `organization_id` | worker | No `selena_app` policy (deny); `selena_worker` policy |
| `sv_provider_spend_reservations` | `organization_id` | worker | No `selena_app` policy (deny); `selena_worker` policy |
| `sv_provider_spend_budgets` | none (global) | worker, internal | Deny for `selena_app`; read by `selena_worker`, write only by `selena_internal` |
| `sv_pilot_invites` | none (global) | signup flow, internal | Deny for `selena_app`; the signup check goes through a `SECURITY DEFINER` function that answers only "is this email invited" |
| `secrets` | none | server-side secret store | Deny for every runtime role; access only through a `SECURITY DEFINER` function owned by the migrator, with its callers listed in the access registry |
| `sv_public_scans` | `project_id` (nullable for anonymous scans) | public scan endpoint | Anonymous inserts through a `SECURITY DEFINER` function; tenant policy for reads by project |

## RLS off (10)

| Table | Decision |
|---|---|
| `user`, `session`, `account`, `verification` | Better Auth reads these across users to sign people in (lookup by email, token). They stay without RLS, grants to `selena_app` are limited to the columns Better Auth needs, and app code outside Better Auth must not query them (checked by a lint rule in M2-c). Documented exception. |
| `organization`, `member`, `invitation` | Enable RLS. Policy: a row is visible when `app.user_id` is a member of that organization. Better Auth's own membership lookups run with `app.user_id` set, or through a `SECURITY DEFINER` helper where they cannot. |
| `sso_provider` | Enable RLS with an organization policy, or drop grants if SSO stays unused in cloud mode. |
| `subscription` | **Decided (0069):** RLS enabled with no policy, marked `rls:deny-by-design`. It is unused while payments are on HOLD. Add an organization policy when billing exists. |
| `sv_simulation_bootstrap_nonces` | Staging only. No grant to any role in production. |

## RLS + policy but no FORCE (68)

Add `FORCE ROW LEVEL SECURITY` to all of them. It changes nothing for `selena_app`. It closes the gap for any path that still connects as the owner, so an owner connection left in the code by mistake gets the same isolation.

**Deferred to the last M2 step (decided in 0069).** FORCE cannot ship yet for two reasons. First, the web still connects as the owner through plain `db` (60 server functions and 19 API handlers, see `ACCESS_REGISTRY.md`), and with FORCE those queries would silently return 0 rows. Second, the SECURITY DEFINER functions from 0059, 0061, 0062 and 0066 are owned by the table owner and read deny-by-design tables. FORCE goes in after the web runs as `selena_app` inside organization transactions and those functions have a dedicated owner. Until then, `check-rls-coverage.mjs` reports tables without FORCE but does not fail on them.

## Guard against regressions

M2-b adds a check that runs in CI against the migrated database. It fails when any `public` table:

- has RLS off and is not in the exception list above;
- has RLS on but no policy and is not in the deny-by-design list above;
- lacks FORCE;
- is owned by, or grants `BYPASSRLS` to, a runtime role.
