# HoReCa Local-first pilot package v0.1

Status: `SOURCE_ONLY_TEMPLATE`. These files prepare AVLI and KORA acceptance without provider calls, database writes, public claims or inferred outcomes.

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
