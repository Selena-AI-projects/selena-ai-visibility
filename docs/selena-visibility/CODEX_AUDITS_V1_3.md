# Selena AI Visibility v1.3 — independent Codex audits

Status: `PASS_SOURCE_ONLY_WITH_RUNTIME_GATES`.

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

Final result: `PASS` at source level, no residual P0/P1/P2 in the reviewed
scope. Runtime result remains `UNKNOWN`.

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

No migration apply/replay/rollback, role inspection, trigger execution or
cross-tenant database proof was authorized. Those gates are `UNKNOWN`, not
promoted from static inspection.

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
- A historical Impeccable deterministic pass returned an empty finding list
  before the latest HoReCa integration. The binary is unavailable in the
  current environment, so no fresh detector PASS is claimed.
- The previously registered root build/lint baselines were fixed before green
  anchor `b86540c9`; exact-anchor CI passed the full build/test/clean-tree graph.
- Post-CI Provider verification under Node 24 passed 20/20 focused lib tests,
  2/2 worker-output tests, lib/worker typechecks and scoped Biome.
- Post-CI HoReCa verification under Node 24 passed 16/16 focused web tests,
  web typecheck, scoped Biome and the web production build. Existing browser
  externalization and missing Sentry-token messages remain warnings.

## Remaining owner gates

- fresh PR #96 CI for the post-CI implementation commits;
- authoritative HoReCa acceptance provenance and hosted non-owner RLS proof;
- staging domain isolation, credential rotation and sealed configuration;
- provider/account hard-cap evidence and the single authorized Google AI Mode
  call; no other provider call is authorized;
- production, production DB, billing changes, Social/Travel activation and
  recurring jobs remain prohibited.
