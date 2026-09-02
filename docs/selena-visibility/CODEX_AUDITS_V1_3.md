# Selena AI Visibility v1.3 — independent Codex audits

Status: `PASS_SOURCE_B9D967B6 / CI_PASS_A8522067 / MERGED_A8B15116 / HOSTED_0056_NOT_RUN`.

## Current independent overlay — 2026-09-02

Reviewed implementation source:
`b9d967b668ba884b524ee7202060f5446abb58ad`.

- Database/Evidence independent verdict: `P0=0`, `P1=0` after the final
  preflight fix. Migration `0056` requires direct session identity, ownership
  of both acceptance tables and `SUPERUSER/BYPASSRLS` before any DDL; FORCE RLS
  cannot conceal legacy acceptance state from migration review.
- Receipt and formal audit references are reciprocal deferred constraints;
  accepted cycle/dataset metadata is immutable; runtime `selena_app` has no raw
  payload/provider path and no formal-acceptance privilege.
- Disposable PostgreSQL proof passed migration apply, FORCE-RLS owner rejection,
  legacy-state rollback without DDL residue, runtime payload/forgery denial and
  clean teardown.
- Provider/evidence focused verification passed `74/74`; root test and build
  passed `16/16` tasks. Lint has `0 errors`; `129 warnings / 12 infos` are the
  registered non-blocking web baseline.
- HoReCa source navigation has a complementary project rail and top tool axis,
  visible project focus, `aria-current` and locale/project route preservation.
  Its targeted route test passed.
- Local Maps stability replay passed three independent `11/11` runs with no
  provider call.
- Impeccable is `NOT_SUPPORTED` in this checkout because the workspace binary
  is absent; it was not installed during acceptance.
- CI passed on PR head `a8522067`, which contains exact implementation
  `b9d967b6`: Build, E2E, Scheduling, License, Smoke and CLA are green. The
  preceding Scheduling run failed on a stale disposable ceiling and directly
  motivated the source-frontier regression test in `b9d967b6`.
- The owner merged PR #96 at `2026-09-02T06:31:55Z`; GitHub recorded squash
  merge commit `a8b151162a849eec899382b550a948edb40b399c` on the release branch.
- No shared staging migration/deploy, provider call, production action, billing,
  recurring job or PR merge was performed for this overlay.

Current independent conclusion: `PASS_SOURCE_CI_AND_MERGE`; `NO_GO_STAGING_0056`
until a fresh backup/read-only legacy count and a separately authorized bounded
apply; `NO_GO_PRODUCTION`.

## Historical exact-head closure — 2026-09-01

Accepted runtime/source HEAD:
`2d023470a618c6606e7960ee4dd1b4523dcbdcfe`.

The three independent streams and their cross-audits found no open P0/P1 in
the material changes through `8cc0b87b`. The only later source changes were:

- `d4ac606a`: opt the intentionally recurring, stub-only disposable CI worker
  into the exact recurring gate;
- `2d023470`: replace a real 5 ms timer in one Bright Data timeout test with
  deterministic fake time.

Runtime controls, provider timeout, retry cardinality and cost policy were not
changed by either commit. Exact-head Build, unit, E2E, scheduling, license,
smoke and CLA checks all passed. Hosted staging then passed backup/restore,
0051/non-owner RLS, GUC, rollback, API tenant isolation, replay/concurrency/
idempotency, public browser, web and worker lifecycle gates. Provider calls
and new cost events remained zero.

Open items are owner/access gates, not unresolved P0/P1 source findings:
any future paid canary plus migration `0052` authorization. The earlier
Postgres administration and authenticated-browser gates are closed by runtime
receipts; no new P0/P1 source finding was introduced.

Three non-overlapping implementation agents performed cross-stream read-only
reviews after integration. They did not edit files during audit turns and did
not run provider calls, migrations, shared services or production paths.

## Provider security review

Final result: `PASS`, no residual P0/P1/P2 in the reviewed scope.

Remediations driven by the review:

- prepared canaries are private-identity, single-use objects consumed before a
  provider trigger;
- raw captures are minted only inside the lifecycle authority, which is not a
  package export; structural copies fail closed;
- credential aliases use a normalized exact deny-list, so credential-shaped
  fields are rejected without blocking benign fields such as `author` or
  `token_count`;
- legacy Bright Data dispatch rejects Google AI Mode and every custom dataset
  version in both target validation and direct execution before credentials or
  transport can be reached;
- the Google AI Mode hard-coded legacy dataset binding was removed.

## Database/Evidence review

Milestone result: `PASS` at source level, no residual P0/P1/P2 in the reviewed
scope. Runtime was `UNKNOWN` at that audit milestone; the exact-head hosted
closure above now supplies the runtime evidence.

Remediations driven by the review:

- evidence cursors use HMAC-SHA256, tenant/project binding, key rotation and an
  exact ten-minute maximum TTL;
- provider snapshot and evidence domain triggers fail closed when a linked
  snapshot or capability is not visible, while legacy snapshots with no
  capability remain explicitly distinguishable;
- `ENTITY` capability evidence may map only to `LOCAL`; other incompatible
  domains are rejected;
- the private provenance view is revoked from `PUBLIC` and from `selena_app`
  in both migration-before-role and role-before-migration orderings;
- source snapshots and evidence rows remain append-only.

At that audit milestone no migration apply/replay/rollback, role inspection,
trigger execution or cross-tenant database proof was authorized. Those claims
were not promoted from static inspection; they were later proved separately in
hosted staging as recorded in the closure above.

## HoReCa Product review

Final result: `PASS`, no residual P0/P1/P2 in the reviewed scope.

Remediations driven by the review:

- the UI renders actual module summaries, limitations, accepted sources,
  findings, competitor observations, actions and outcomes from the read model;
- measured modules require accepted evidence and a saved comparison basis;
- `PRE_OPENING` rejects any measured visibility, including a module labelled
  `PILOT`, and rejects measured post-opening outcomes;
- hidden Social/Travel modules forbid corresponding customer evidence and
  competitor records; the UI also filters those domains and dependent records;
- the route is English-only while factual contract text is single-language,
  avoiding a misleading partially translated customer view;
- AVLI remains location-verification-required and KORA remains pre-opening;
  neither package fabricates venue facts or outcomes.

## Post-CI P1 re-audits

Two additional non-overlapping source reviews were performed after green PR
anchor `b86540c9`. Their first pass found two material gaps that the earlier
snapshot did not cover:

- the Google AI Mode command discarded the exact successful private capture;
- the HoReCa route was still a static preview and had no safe tenant/project
  binding or evidence-detail path.

Provider remediation at `bb8f123c` persists the exact validated capture inside
the tenant transaction as immutable private `CANARY_ONLY` source evidence,
binds it to the once-ever reservation and emits only a sanitized receipt. It
does not create `sv_evidence_index` or `sv_cost_events`; actual cost and
acceptance remain `UNKNOWN`/`HOLD`. The independent repeat review reports no
remaining P0/P1 in this slice. It does not prove provider-side price
enforcement, real RLS or hosted persistence.

HoReCa remediation at `4916125e` adds the session-authenticated,
tenant/project-scoped route and project selector over the application-safe
projection. The assembler requires authoritative `ACCEPTED` plus `acceptedAt`,
`LINKED` provenance and snapshot linkage, retains WEBSITE/MENU as evidence-only,
keeps Social/Travel hidden, maps PRE_OPENING only from unanimously confirmed
persisted entity facts and renders UNKNOWN as `Not measured`/`Not assessed`.
Evidence detail uses an opaque `snapshot:evidence:<evidenceId>` reference and
never returns the snapshot UUID, payload, raw locator, provider reference or
content hash. Because the current safe view has no authoritative acceptance
decision/timestamp, the hosted route deliberately remains source-only until an
approved provenance join exists. The independent repeat review reports no
remaining P0/P1 in this slice.

## Local verification evidence

- Provider/Database/Evidence: 6 files, 115 tests passed.
- HoReCa contract: 1 file, 8 tests passed.
- HoReCa web model/rendering: 1 file, 7 tests passed.
- TypeScript: `@workspace/lib`, `@workspace/selena-visibility-contracts` and
  `@workspace/web` passed.
- Changed-file Biome checks passed after remediation.
- `@workspace/web` production build passed. Its existing Node-externalization
  and Sentry telemetry notices remain warnings, not acceptance proof for a
  hosted environment.
- Exact-head local Impeccable detect passed before the final CI push.
- The previously registered root build/lint baselines were fixed before green
  anchor `b86540c9`; exact-anchor CI passed the full build/test/clean-tree graph.
- Post-CI Provider verification under Node 24 passed 20/20 focused lib tests,
  2/2 worker-output tests, lib/worker typechecks and scoped Biome.
- Post-CI HoReCa verification under Node 24 passed 16/16 focused web tests,
  web typecheck, scoped Biome and the web production build. Existing browser
  externalization and missing Sentry-token messages remain warnings.

## Historical owner gates at the 2026-09-01 audit

- separate authorization for migration `0052` and any paid Google AI Mode
  canary; the latest decision currently prohibits the call;
- production, production DB, billing changes, Social/Travel activation,
  recurring jobs and PR merge remain prohibited.
