/**
 * The parts of a cycle read that touch no database: what one page of runs
 * costs the caller to ask for, and what the spend ledger under it adds up to.
 */
import type { RunAnswer } from "./selena-run-payload";

/** The cap on one page of runs, matching the browser explorer's own ceiling. */
const RUN_PAGE_LIMIT = 200;

export type CycleRunsOptions = { includeAnswers: boolean; limit: number };

export function parseCycleRunsOptions(url: URL): CycleRunsOptions {
	const limit = Number(url.searchParams.get("limit") ?? RUN_PAGE_LIMIT);
	return {
		includeAnswers: url.searchParams.get("answers") === "text",
		limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, RUN_PAGE_LIMIT) : RUN_PAGE_LIMIT,
	};
}

/**
 * Answer text leaves only on request. A reader still learns whether the text
 * exists and how long it is, which is what distinguishes an empty answer from
 * one retention removed, without shipping the text itself.
 */
export function presentAnswer(answer: RunAnswer, includeAnswers: boolean) {
	if (includeAnswers || answer.state !== "present") return answer;
	return { state: "present" as const, length: answer.text.length };
}

/**
 * Spend is read from the ledger rather than summed off the run rows: §10.2
 * makes the ledger the record of what was charged, and a run row that never
 * got written would silently shrink a total taken from runs. The basis split
 * travels with the total because an estimate and a provider's own figure are
 * not the same claim.
 */
export function summariseLedger(events: { amountUsd: string; basis: string; provider: string }[]) {
	const byBasis: Record<string, number> = {};
	const byProvider: Record<string, number> = {};
	let totalUsd = 0;
	for (const event of events) {
		const amount = Number(event.amountUsd);
		totalUsd += amount;
		byBasis[event.basis] = Number(((byBasis[event.basis] ?? 0) + amount).toFixed(6));
		byProvider[event.provider] = Number(((byProvider[event.provider] ?? 0) + amount).toFixed(6));
	}
	return { events: events.length, totalUsd: Number(totalUsd.toFixed(6)), byBasis, byProvider };
}
