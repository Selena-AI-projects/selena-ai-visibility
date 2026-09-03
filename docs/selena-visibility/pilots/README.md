# HoReCa Local-first pilot package v0.1

Status: `SOURCE_ONLY_TEMPLATE`. These files prepare AVLI and KORA acceptance without provider calls, database writes, public claims or inferred outcomes.

## Not part of the Founding Restaurant Pilot — owner decision, 2026-09-03

Local Visibility cannot measure. There is no runtime executor: the worker's
Local job is a seam whose default returns `LOCAL_RUNTIME_EXECUTOR_NOT_REGISTERED`,
no producer sends to its queue, and the write and admin APIs refuse a Local
cycle with `503 OWNER_GATE_REQUIRED` before anything is queued. The surface
registry says the same thing in code: `GOOGLE_MAPS_LOCAL_PACK` is `ADD`, and
`assertSurfaceCaptureAllowed` refuses any surface that is not `MEASURED`.

The owner has therefore taken Local Visibility, Search, Reputation, the
Visibility Map and the Outcome layer **out of the pilot**. The Founding
Restaurant Pilot runs on the AI answer path only — the surfaces the Visitor
Local and Full AI Landscape plans already name, which have a real adapter, a
permit ledger and a cost ledger behind them.

What this means in practice:

- Nothing in an invitation, a brief or a report may promise a restaurant a
  Maps rank, a geo-grid, a local pack position, a review metric or an outcome
  attribution. None of it can be produced.
- The material in this folder stays as the design it is. It is not evidence,
  and it is not a description of what the pilot delivers.
- Bringing Local into scope later is a separate decision with its own gates:
  it needs an executor, an approved provider path, and a budget in the
  reservation ledger that path spends against.

## Package

- `HORECA_INTENT_ONTOLOGY_V0_1.md` — 60 candidate intents. They are a controlled pilot library, not measured demand or a ranking claim.
- `AVLI_LOCAL_DECISION_REPORT_V0_1.md` — report shell for one active location whose identity and facts still require verification.
- `KORA_PREOPENING_READINESS_REPORT_V0_1.md` — pre-opening evidence and verification shell.
- `SOURCE_UNIT_ECONOMICS_TEMPLATE.csv` — source/cost/cardinality worksheet. Unknown price or input cardinality remains `UNKNOWN` and blocks eligibility.
- `OWNER_REVIEW_MATRIX.md` — explicit source-by-source GO/NO-GO decision record.

## Shared acceptance gates

1. Every published finding has at least one resolvable evidence ID and capture timestamp.
2. No inferred fact, benchmark, rating, rank, review, recommendation coverage or outcome is presented as observed.
3. Every recommendation names its action, owner, priority and verification plan.
4. `UNKNOWN` is excluded from denominators and never rendered as zero.
5. Comparisons use compatible Configuration Locks or state `BREAK_IN_SERIES`.
6. Maps Place/entity readiness is never presented as Maps rank evidence.
7. Local Maps and Local AI use separate samples, denominators and result sections.
8. Social and Travel stay absent from customer-visible capability until their source, retention, cost and entitlement gates pass.

## Completion boundary

This package becomes a pilot result only after its evidence register, locked scope, cost ledger and review record are populated from accepted data. Until then its verdict is `HOLD_DATA`.
