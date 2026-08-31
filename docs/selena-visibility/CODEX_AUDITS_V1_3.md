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
- The Impeccable deterministic detector returned an empty finding list in the single allowed
  deterministic UI pass performed before the final contract-only remediation.
- The repository-wide build remains blocked in unchanged `apps/www`: 40
  unresolved `@/lib/*` imports under the workspace path containing a space;
  14 of 16 tasks completed. The changed `apps/web` build passes independently.
- The repository-wide web lint remains blocked by pre-existing findings outside
  this change (33 errors, 132 warnings and 14 informational findings in the
  recorded run). Changed files pass their targeted Biome check.

## Remaining owner gates

- migration/RLS runtime proof;
- credentials and 13 paid isolated canaries;
- shared staging/production, billing, merge, deploy and recurring jobs;
- draft PR creation because its Blacksmith-backed CI billing impact is
  `UNKNOWN` until the owner explicitly approves it.
