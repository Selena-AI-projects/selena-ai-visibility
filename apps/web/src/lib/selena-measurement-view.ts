import type { AnalysisSubject } from "@workspace/lib/selena-answer-analysis";
import type { CycleDiffChange, CycleDiffReport } from "@workspace/lib/selena-cycle-diff";
import { isBrandedQuestion } from "@workspace/lib/selena-grader-report";
import type { LedgerGroup, LedgerScenarioKind } from "@workspace/lib/selena-ledger-metrics";

/**
 * Pure helpers for the cabinet's step-4 "Measurement" section. The invariants
 * live here where they are unit-testable: an empty group renders UNKNOWN
 * (never 0%), branded and non-branded stay separate, and no composite
 * headline score is ever derived.
 */

export function scenarioKindsFrom(
	rows: { id: string; text: string; intentType: string }[],
	brand: AnalysisSubject | null,
): Map<string, LedgerScenarioKind> {
	const kinds = new Map<string, LedgerScenarioKind>();
	for (const row of rows) {
		// Every profile question lands in one "discovery" family whatever it
		// says, so the question's own text decides, by the rule the full report
		// uses; otherwise the two views would split the same answers differently.
		if (row.intentType === "branded" || (brand !== null && isBrandedQuestion(row.text, brand)))
			kinds.set(row.id, "branded");
		// Anything else stays unclassified and is surfaced as a count by the
		// ledger report rather than guessed into a bucket.
		else if (row.intentType === "discovery") kinds.set(row.id, "discovery");
	}
	return kinds;
}

/** A ratio as a whole-percent string, or null when the input is unmeasured. */
export function formatShare(value: number | null | undefined): string | null {
	if (value === null || value === undefined) return null;
	return `${Math.round(value * 100)}%`;
}

export type GroupView =
	| { state: "unknown"; runs: number }
	| {
			state: "measured";
			measuredRuns: number;
			unmeasuredRuns: number;
			mentionCoverage: string | null;
			/** One decimal, as the full report prints positions. */
			averageBrandPosition: string | null;
	  };

export function groupView(group: LedgerGroup): GroupView {
	if (group.status === "UNKNOWN") return { state: "unknown", runs: group.runs };
	const metrics = group.metrics;
	return {
		state: "measured",
		measuredRuns: metrics.validRuns - metrics.unmeasuredRuns,
		unmeasuredRuns: metrics.unmeasuredRuns,
		mentionCoverage: formatShare(metrics.mentionCoverage),
		averageBrandPosition: metrics.averageBrandPosition === null ? null : metrics.averageBrandPosition.toFixed(1),
	};
}

export type CycleCompareSummary =
	| { state: "unknown"; notComparable: number }
	| { state: "compared"; counts: Record<CycleDiffChange["type"], number>; notComparable: number };

/**
 * Change counts mean something only where a question was measured in both
 * cycles; with no such pair a row of zeros would claim "nothing changed" about
 * answers that were never compared.
 */
export function summarizeCycleCompare(report: CycleDiffReport): CycleCompareSummary {
	const notComparable = report.groups.filter((group) => group.status === "UNKNOWN").length;
	if (!report.groups.some((group) => group.status === "COMPARED")) return { state: "unknown", notComparable };
	const counts: Record<CycleDiffChange["type"], number> = {
		MENTION_APPEARED: 0,
		MENTION_DISAPPEARED: 0,
		POSITION_SHIFTED: 0,
		SOURCE_APPEARED: 0,
		SOURCE_DISAPPEARED: 0,
	};
	for (const change of report.changes) counts[change.type] += 1;
	return { state: "compared", counts, notComparable };
}
