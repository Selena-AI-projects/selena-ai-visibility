import type { SvCycle } from "@workspace/lib/db/schema";
import type { OrderStatus } from "@workspace/selena-visibility-contracts";

/**
 * The client's monthly answer allowance is spent by answers, not by attempts.
 *
 * Provider spend is a different quantity with its own ledger (sv_cost_events,
 * the spend reservations) and is the operator's to watch; a failed provider
 * call costs the operator money and costs the client nothing. What the client
 * buys is answers with a usable result, so only runs that finished SUCCEEDED
 * count as used, whatever became of the rest of their cycle. Runs a cycle has
 * not finished yet, and orders that are paid but not dispatched, are held as
 * reserved so a second order cannot promise the same answers twice.
 */

export const MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES = ["CANCELLED"] as const satisfies readonly OrderStatus[];

/** Paid orders that have not minted a cycle yet: their whole measurement is still to come. */
export const MONTHLY_ALLOWANCE_RESERVING_ORDER_STATUSES = [
	"PAID_REVIEW_REQUIRED",
	"APPROVED",
	"PREFLIGHT_BLOCKED",
	"BUDGET_BLOCKED",
	"PROVIDER_BLOCKED",
] as const satisfies readonly OrderStatus[];

const IN_FLIGHT_CYCLE_STATUSES = new Set<SvCycle["status"]>(["CREATED", "APPROVED", "QUEUED", "RUNNING", "ANALYZING"]);
const excludedOrderStatuses = new Set<OrderStatus>(MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES);
const reservingOrderStatuses = new Set<OrderStatus>(MONTHLY_ALLOWANCE_RESERVING_ORDER_STATUSES);

export type MonthlyAllowanceRow = {
	orderStatus: OrderStatus;
	/** Null for an order that has no cycle yet. */
	cycleStatus: SvCycle["status"] | null;
	/** The cycle's expected runs, or the lock's for an order without a cycle. */
	expectedRuns: number;
	completedRuns: number;
	/** Runs that finished SUCCEEDED; FAILED and INVALID completions are not answers. */
	succeededRuns: number;
};

export type MonthlyAnswerUsage = {
	/** Answers with a usable result this month. */
	used: number;
	/** Answers promised to measurements that are still running or waiting to start. */
	reserved: number;
};

export function monthlyAnswerUsage(rows: readonly MonthlyAllowanceRow[]): MonthlyAnswerUsage {
	let used = 0;
	let reserved = 0;
	for (const row of rows) {
		if (excludedOrderStatuses.has(row.orderStatus)) continue;
		if (row.cycleStatus === null) {
			if (reservingOrderStatuses.has(row.orderStatus)) reserved += row.expectedRuns;
			continue;
		}
		used += row.succeededRuns;
		if (IN_FLIGHT_CYCLE_STATUSES.has(row.cycleStatus)) reserved += Math.max(row.expectedRuns - row.completedRuns, 0);
	}
	return { used, reserved };
}

/** Whether one more measurement of `expectedRuns` answers fits into the month. */
export function monthlyAllowanceAdmits(
	usage: MonthlyAnswerUsage,
	allowance: number,
	expectedRuns: number,
): { admitted: true } | { admitted: false; committed: number } {
	const committed = usage.used + usage.reserved;
	return committed + expectedRuns <= allowance ? { admitted: true } : { admitted: false, committed };
}

export function monthStartUtc(now: Date = new Date()): Date {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
