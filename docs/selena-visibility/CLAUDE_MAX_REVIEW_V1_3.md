# Selena AI Visibility v1.3 — Claude Max blind review synthesis

## Run identity

- Pinned commit: `5e616e633346a8719d217d547e202f9602aa92c8`
- Combined four-document specification SHA-256:
  `c17d88b9bfdd88d1ade7f5e1cfe87f0e96a1d3246bca0a5ca2a0b05fc0c25163`
- Profile/model: `max5` / Claude Sonnet through authenticated Claude.ai Max
- Completed audit session: `1aef38c9-f543-4ff7-a8eb-176ecaa9864b`
- Bounded inspection turns: `20`
- Permission denials: `0`
- Web/search/fetch requests: `0`
- Allowed tools: `Read`, `Glob`, `Grep`
- Original repository mutation: `NONE`; the pre-existing untracked
  `HANDOFF_PERPLEXITY_RECOVERY_2026-08-30.md` remained unchanged and untracked.

The first wrapper invocation, session
`943ed16e-195c-4c8c-a6f3-c185a53c5643`, returned only an audit plan. It was
rejected as incomplete evidence. Resume was unavailable, so a second blind
pass used the same immutable commit and isolated snapshot with no Codex
findings supplied to Claude.

## Claude verdict

Claude's final verdict was: not ready for production or commercial launch,
but consistent with a `source-only / pre-runtime` package. That is consensus
with the Codex acceptance boundary: the sprint target is code-complete
pre-production source, not production activation.

## Consensus

- `sv_measurement_attempts` encodes `LOCAL_MAPS`/`LOCAL_AI` separation and an
  attempt index limited to three.
- The forward migration chain exists in source, including 0051, but migration
  apply/replay/rollback and cross-tenant RLS are not runtime-proven.
- Provider canaries, actual cost evidence, shared staging/production and paid
  paths remain unexecuted owner gates.
- Admin/API/local measurement surfaces exist in source, while payment,
  provider and deployment acceptance need stronger evidence classes.
- AVLI/KORA pilot artifacts exist; Claude did not inspect their contents within
  its budget, while the Codex Product reviewer did and reached source-level
  PASS after remediation.

## Codex-only evidence Claude did not inspect

Claude exhausted its bounded inspection budget before reviewing the new v1.3
provider registry, lifecycle authority, Google adapters or the complete HoReCa
contract/UI. It therefore did not independently confirm:

- the exact 13 registry definitions and fail-closed Social/Travel access gates;
- removal of Google AI Mode and custom dataset IDs from legacy Bright Data
  runtime dispatch;
- lifecycle-only raw capture authority and single-use prepared canaries;
- HoReCa hidden-domain filtering, pre-opening measurement guard and actual
  evidence-linked UI rendering;
- the locally executed 115 Provider/Evidence tests, 8 contract tests, 7 web
  tests, three typechecks, changed-file Biome pass and web production build.

These remain `CODEX_ONLY` local evidence, not Claude-confirmed evidence. Claude
correctly refused to promote repository test reports to executed proof.

## Claude-only observations and local reconciliation

1. **Admin deployment boundary — owner decision, P2.** Claude observed that
   admin routes live inside `apps/web`, not a separate `apps/admin` deployment.
   The specification wording can describe an application area rather than a
   mandatory deployment unit. This does not block the v1.3 source package, but
   blast-radius ownership should be decided before production.
2. **Two navigation sets — compatible modes, owner decision before public
   release.** The existing general Selena workspace and the new HoReCa
   Local-first route have different information architectures. The current
   implementation keeps HoReCa as a separate read-only route; whether it
   replaces or complements the general workspace is a product decision.
3. **Migration-number collision — not present in the pinned ref.** Local
   reinspection found exactly one source file and one monotonic journal entry
   for each migration 0037 through 0051. A collision with an unmerged external
   branch is `UNKNOWN`, not a defect proven in this snapshot.
4. **Recurring/public promise gap — retained owner gate.** Claude highlighted
   specification text where weekly/90-day promises may lead scheduler proof.
   This sprint neither activates recurring jobs nor changes public pricing;
   alignment remains required before commercial release.

## Priority synthesis

### P0 before production

- apply, replay and rollback migrations in an authorized disposable database,
  then prove RLS and private-view privileges with a non-owner runtime role;
- run owner-approved, cost-capped provider canaries and record schema,
  coordinate/capability and actual-cost evidence;
- complete authorized payment/idempotency and hosted runtime acceptance;
- keep deploy, merge, production DB and recurring jobs blocked until their
  separate gates pass.

### P1 before a customer pilot or public promise

- decide the canonical relationship between the general Selena workspace and
  HoReCa Local-first navigation;
- align recurring/remeasurement copy with scheduler evidence;
- validate AVLI active-location identity and KORA pre-opening evidence without
  converting `UNKNOWN` into facts.

### P2 hardening

- decide whether admin needs a separate deployment unit or document acceptance
  of the shared `apps/web` blast radius;
- maintain one current normative-status pointer so historical verdicts cannot
  be mistaken for the active release gate.

## Final review classification

`CLAUDE_COMPLETE_READ_ONLY`; `SOURCE_ONLY_ACCEPTANCE_SUPPORTED`;
`RUNTIME/STAGING/PAID/PRODUCTION_UNKNOWN_OR_NOT_AUTHORIZED`.
