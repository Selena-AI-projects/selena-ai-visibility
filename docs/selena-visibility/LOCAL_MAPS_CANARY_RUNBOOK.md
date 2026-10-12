# Local Maps canary and 3×3 pilot on staging (DataForSEO)

How to take one real Google Maps local-rank measurement for one business —
first a one-call canary per keyword, then the nine-point 3×3 pilot for one
keyword — through the Local Maps path and DataForSEO
`serp/google/maps/live/advanced`. Owner approval for this run: 2026-10-12,
KORA Food Hall, Ubud, Bali.

Every step below is a Railway variable change plus a deploy, then reading a
log. Nothing here needs a query window or a laptop with a connection string.

## What it costs (estimates, not invoiced prices)

| Step | Provider calls | Estimate at $0.002 per live call |
|---|---:|---:|
| Canary, per keyword | 1 (center point only, no retry) | $0.002 |
| Pilot, one keyword, every point answers first time | 9 | $0.018 |
| Pilot worst case (3 attempts on every point) | 27 | $0.054 |

$0.002 is the account price list's `serp / live/advanced` row
(`docs/selena-visibility/local-cycle-economics.md`). The adapter records the
`cost` DataForSEO returns with each response as the actual cost; the table is
what gets reserved, not what gets billed. See *Unknowns* for depth billing.

## Database: which migrations, and `SELENA_MIGRATION_MAX_INDEX`

The Local path uses:

| Migration | What the Local path needs from it |
|---|---|
| `0038` | `sv_business_locations`, `sv_local_keywords`, `sv_grid_definitions`, `sv_grid_points`, `sv_local_scan_cycles`, `sv_local_rank_observations`, grid immutability triggers |
| `0043`, `0044` | Domain-neutral `sv_measurement_attempts` and attempt results the Local live runner writes |
| `0045` | Append-only configuration locks; location ↔ lock project scope trigger |
| `0047` | Local attempt-count cap |
| `0048` | `sv_api_idempotency_records` (canary replay, canary review, pilot approval) |
| `0062` | Provider spend reservations — the `local-maps` scope |
| `0075` | Pilot runtime: outbox, canary reviews, raw evidence, report/QC/delivery tables and their guards |
| `0076` | External audits — read by the published report page even when there are none |

The runner applies every migration up to the index, in order, so the
minimum is **76**. Set **`SELENA_MIGRATION_MAX_INDEX=80`** on `migrate`: 80 is
the frontier the code at this commit expects (CI's e2e applies through 80),
and `web`/`worker` at this commit also read tables from 0077–0080. Deploy
`migrate`, set `SELENA_MIGRATION_APPROVED_SHA` to the commit it names if it
asks, deploy again, and read `migrations complete`.

`0075` says staging may already carry the Local objects from its own earlier
numbering (`0067`–`0071`); in that case its body is skipped and only its
completeness check runs. A failure there reads `LOCAL_PILOT_SCHEMA_INCOMPLETE:
<what is missing>` — stop and report it; do not hand-patch.

## Services

| Service | Stage | Role here |
|---|---|---|
| `migrate` | `migrate` | Applies migrations through 80 |
| `owner` | `owner` | One-shot tasks with the migration owner's connection: spend ceiling, setup, canary, status, canary review, pilot approval. Restart policy **never** |
| `local` (new) | `local` | The only process that calls DataForSEO for Local Maps; consumes `selena-local-measure`. Long-running, like `worker` |
| `web` | `web` | Serves `/app/selena-local-maps/<cycleId>` and the operator report routes |
| `worker` | `worker` | Unchanged; it never consumes the Local queue |

Create `local` from the same repository and branch as `worker`; naming the
service `local` selects the Dockerfile's `local` stage, which starts
`src/local-index.ts`. (Equivalent without the stage: the `worker` image with
start command `./node_modules/.bin/tsx src/local-index.ts`.)

## Variables

### `local`

| Variable | Value |
|---|---|
| Database variables | The same ones `worker` has, as references to `worker`'s: `DATABASE_URL`, and whichever of `SELENA_HOSTED`, `SELENA_DATABASE_SURFACE`, `SELENA_WORKER_DATABASE_URL`, `SELENA_RUNTIME_DATABASE_CA_PEM`, `SELENA_PGBOSS_OWNER_MANAGED_SCHEMA` it sets |
| `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | References to the account the owner approved |
| `SELENA_LOCAL_VISIBILITY_ENABLED` | `true` |
| `SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED` | `true` only while measuring; `false` otherwise |
| `SELENA_LOCAL_EMERGENCY_STOP` | `false` only while measuring; anything else stops |
| `SELENA_LOCAL_MAPS_PROVIDER_ID` | `dataforseo-google-maps` |
| `SELENA_LOCAL_DATAFORSEO_VERSION` | A label without spaces, e.g. `v3` — frozen into the lock, so **identical on `owner`** |
| `SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD` | `0.002` — identical on `owner` |
| `SELENA_LOCAL_PROVIDER_LEASE_DURATION_MS` | `300000` (10 000–900 000) — identical on `owner` |
| `SELENA_LOCAL_DISPATCH_ORGANIZATION_ID` | The KORA organization id; enables the outbox dispatcher for that one tenant |
| `SELENA_LOCAL_DATAFORSEO_TIMEOUT_MS` | Optional, default `15000` |
| `DISABLE_TELEMETRY` | `1` |

### `owner`, for every Local task

| Variable | Value |
|---|---|
| `SELENA_LOCAL_CANARY_ORGANIZATION_ID` | KORA's organization id (text; a local-mode install's first workspace is `default`) |
| `SELENA_LOCAL_CANARY_ACTOR_ID` | The user id of an `owner` or `admin` **member of that organization**; every task refuses with `LOCAL_OPERATOR_MEMBERSHIP_REQUIRED` otherwise |
| `SELENA_LOCAL_MAPS_PROVIDER_ID`, `SELENA_LOCAL_DATAFORSEO_VERSION`, `SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD`, `SELENA_LOCAL_PROVIDER_LEASE_DURATION_MS` | Exactly as on `local` |

### `owner`, `local-maps-setup` only

| Variable | Value |
|---|---|
| `SELENA_LOCAL_SETUP_DISPLAY_NAME` | `KORA Food Hall` |
| `SELENA_LOCAL_SETUP_COUNTRY_CODE` | `ID` |
| `SELENA_LOCAL_SETUP_ADMIN_AREA`, `SELENA_LOCAL_SETUP_LOCALITY` | Optional: `Bali`, `Ubud` |
| `SELENA_LOCAL_SETUP_TIMEZONE` | `Asia/Makassar` (Bali) |
| `SELENA_LOCAL_SETUP_LATITUDE`, `SELENA_LOCAL_SETUP_LONGITUDE` | The client-confirmed coordinates; they are the grid's center point |
| `SELENA_LOCAL_SETUP_PLACE_ID` and/or `SELENA_LOCAL_SETUP_CID` | The client-confirmed Google Place ID / decimal CID the rank is matched on. At least one |
| `SELENA_LOCAL_SETUP_MAPS_URL` | Optional; derived from the Place ID or CID when unset |
| `SELENA_LOCAL_SETUP_KEYWORDS` | 1–5 keywords, one per line or separated by `\|`; one lock each |
| `SELENA_LOCAL_SETUP_LANGUAGE` | Optional, default `en` |
| `SELENA_LOCAL_SETUP_SE_DOMAIN` | Optional, default `google.com` |
| `SELENA_LOCAL_SETUP_WINDOW_STARTS_AT`, `SELENA_LOCAL_SETUP_WINDOW_ENDS_AT` | ISO instants, e.g. `2026-10-12T00:00:00Z` and `2026-10-19T00:00:00Z`. The canary **and** the pilot approval must both happen inside this window; leave days of room for the review |
| `SELENA_LOCAL_SETUP_PRICE_SNAPSHOT_VERSION` | Optional label; defaults from the per-attempt price |

The coordinates, Place ID/CID and keywords are the client's confirmed facts;
nothing in this path looks them up.

## Order of steps

Each step: set the variables on the named service, deploy it (Railway
staged-changes banner → Details → Deploy), read its log.

1. **`migrate`** — `SELENA_MIGRATION_MAX_INDEX=80`, as above.
2. **`owner`: fund the scope.** `SELENA_OWNER_TASK=set-spend-budget`,
   `SELENA_SPEND_SCOPE=local-maps`, `SELENA_SPEND_CAP_USD=0.10` (one canary
   per keyword plus one pilot's $0.054 worst case; raise it by $0.002 per
   extra canary). Log: `scope: local-maps` with the cap. An unfunded scope
   refuses every reservation, so nothing below can spend without this.
3. **`owner`: setup.** `SELENA_OWNER_TASK=local-maps-setup` with the setup
   variables. The log prints, per keyword, ready-to-paste
   `SELENA_LOCAL_CANARY_CONFIGURATION_LOCK_ID`, `…_GRID_DEFINITION_ID` and
   `…_IDEMPOTENCY_KEY`. Deploying again with the same inputs prints `nothing
   new, every row already existed` and the same ids. A changed coordinate or
   Place ID for an existing location is refused
   (`LOCAL_SETUP_LOCATION_CONFLICT`), never overwritten.
4. **`local`: start it** with the `local` variables. Log: `Local outbox
   dispatcher enabled for organization …` and `Local worker ready:
   selena-local-measure`. If it says the dispatcher is disabled, the
   organization or the two execution controls are not set exactly.
5. **`owner`: canary, once per keyword.** `SELENA_OWNER_TASK=local-maps-canary`
   plus, for one keyword at a time, the three printed lock variables and:
   `SELENA_LOCAL_VISIBILITY_ENABLED=true`,
   `SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED=true`,
   `SELENA_LOCAL_EMERGENCY_STOP=false`, `SELENA_LOCAL_CANARY_OWNER_APPROVED=true`,
   `SELENA_LOCAL_CANARY_MAX_CALLS=1`, `SELENA_LOCAL_CANARY_MAX_SPEND_USD=0.002`.
   Log: `local-maps-canary: {"status":"CREATED_AND_DISPATCHED",…,"attempts":1,…}`.
   A second deploy with the same key replays the same receipt and creates
   nothing. Within seconds `local` logs
   `[selena-local-measure] <canary cycle>: FINALIZED (FOUND|ABSENT_WITHIN_DEPTH); providerCalls=1`.
6. **`owner`: status.** `SELENA_OWNER_TASK=local-maps-status` (needs the lock
   variable). Expect `CANARY … CANARY_REVIEW`, one `SUCCEEDED` attempt at
   point 4 with `spent $0.002000`, the event, the rank if found, and its
   `evidenceId`. Check the rank against the client's own phone before
   accepting.
7. **`owner`: review the canary.** `SELENA_OWNER_TASK=local-maps-canary-review`,
   `SELENA_LOCAL_CANARY_CYCLE_ID=<canary cycle>`,
   `SELENA_LOCAL_CANARY_REVIEW_DECISION=ACCEPTED` (or `REJECTED`). Accepting
   prints `SELENA_LOCAL_PILOT_CYCLE_ID=<pilot cycle>`, created but not yet
   runnable. (The operator route
   `POST /api/v1/selena/admin/local-scan-cycles/<cycle>/canary-review` does the
   same from a platform operator's session.)
8. **`owner`: approve the pilot** — the only step that queues nine calls.
   `SELENA_OWNER_TASK=local-maps-pilot-approve`, `SELENA_LOCAL_PILOT_CYCLE_ID`,
   `SELENA_LOCAL_PILOT_OWNER_APPROVED=true`, `SELENA_LOCAL_PILOT_MAX_SPEND_USD=0.054`,
   and the execution controls from step 5. Log: `queued 9 attempts over 9
   points; worst case $0.054000` and `dispatched: claimed 9, enqueued 9`. It
   refuses any cycle that is not the CREATED pilot of an accepted canary of
   this lock, a lock whose worst case exceeds the ceiling, or closed controls.
   Re-deploying replays the same approval.
9. **`owner`: status** again until the pilot reads `QC_REQUIRED` (all nine
   measured) or `PARTIAL_FAILURE`. `local` retries a point at most twice more
   on its own.
10. **Close.** On `owner`: `SELENA_OWNER_TASK=read-spend-budget` (its idle
    task), `SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED=false`,
    `SELENA_LOCAL_EMERGENCY_STOP=true`, `SELENA_LOCAL_PILOT_OWNER_APPROVED` and
    `SELENA_LOCAL_CANARY_OWNER_APPROVED` removed. On `local`: the same two
    controls, then deploy (or remove its deployment).

## How to stop

- **Everything, now:** on `local` set `SELENA_LOCAL_EMERGENCY_STOP=true` (or
  `SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED=false`) and deploy, or remove the
  `local` deployment. Railway variable edits reach a running service only
  through a deploy. With the controls closed the dispatcher enqueues nothing
  and a queued attempt is not sent.
- **Nothing new:** keep the controls closed on `owner`; the canary and the
  approval refuse with `LOCAL_PROVIDER_EXECUTION_BLOCKED` before writing.
- Lowering the `local-maps` cap stops further reservations (retries), not the
  nine first attempts already reserved at approval.
- The `stop` admin route is still an owner-gate stub (503); it stops nothing.

## Reading the result

- **Canary:** only through `local-maps-status`. A canary's point is recorded as
  `BLOCKED / CANARY_REVIEW_REQUIRED` and its evidence is canary-only by
  design; it never appears in a client report.
- **Pilot:** `local-maps-status` lists the nine points with outcome and rank.
  The client-facing page `/app/selena-local-maps/<pilot cycle>` shows only a
  **published** report. A platform operator (`grant-platform-admin`) who is an
  owner/admin member of the KORA workspace, signed in with it active, and with
  `SELENA_LOCAL_VISIBILITY_ENABLED=true` on `web`, runs from the browser
  console on the staging origin:

  ```js
  const cycle = "<pilot cycle id>";
  // One Idempotency-Key per distinct request: the same key with another body is refused.
  const post = (path, body, key = `${path}-${cycle}`) => fetch(`/api/v1/selena/admin/local-scan-cycles/${cycle}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(body),
  }).then((response) => response.json());
  const draft = await post("report", {});          // report-create → reportVersionId
  // GET /api/v1/selena/admin/local-scan-cycles/<cycle>/report previews the draft
  // Only for a PARTIAL_FAILURE pilot, first:
  // await post("qc", { reportVersionId: draft.reportVersionId, decision: "ACCEPT_PARTIAL", note: "<why>" }, `qc-partial-${cycle}`);
  await post("qc", { reportVersionId: draft.reportVersionId, decision: "APPROVED", note: "<what was checked>" });
  await post("publish", { reportVersionId: draft.reportVersionId });
  ```

  A draft needs every point terminal and none unknown or blocked. A
  `QC_REQUIRED` pilot takes `APPROVED`; a `PARTIAL_FAILURE` pilot first takes
  `ACCEPT_PARTIAL`, which moves it to `QC_REQUIRED`, then `APPROVED`.

## Unknowns and risks

- **Depth billing.** The account price list shows no per-result column for
  `live/advanced`, and the billing reconciliation ported from staging
  (`packages/lib/src/selena-local-billing-reconciliation.ts`) accepts exactly
  $0.002000 per depth-20 call; but `local-cycle-economics.md` records that
  DataForSEO has spoken publicly of depth-aware pricing, and no bill for this
  account has confirmed it either way. If a depth-20 call reports more than the
  $0.002 reserved, the attempt records a budget incident: a canary with one
  cannot be reviewed (`LOCAL_CANARY_BUDGET_INCIDENT`) and the pilot stops at
  `BUDGET_BLOCKED`. The canary command refuses a per-attempt price above
  $0.002, so a higher price needs a code change, not a variable.
- **No `cost` in a response.** The adapter treats a successful response
  without a numeric `cost` as `OUTCOME_UNKNOWN`: the cycle goes to
  `UNKNOWN_RECONCILIATION`, a canary cannot be reviewed, and only the pilot
  has a billing-reconciliation script.
- **The `z` zoom.** The request now sends `latitude,longitude,13z`, the form
  DataForSEO documents. The canary is the first real call in that form; check
  in its status that the event is not a provider error before accepting.
- **The window.** A pilot whose window closed can be rescheduled through the
  operator route, but that issues a new lock, and `local-maps-pilot-approve`
  only approves the pilot of the canary's own lock: run a new setup window and
  a new canary instead.
- **Ids without a query window.** This runbook does not say where the owner
  reads KORA's organization id and the acting user's id; confirm both before
  step 3.
- **The `local` image** has not been built on Railway; the stage mirrors
  `worker`'s exactly.
