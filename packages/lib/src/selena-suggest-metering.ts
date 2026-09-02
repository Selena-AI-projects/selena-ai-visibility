import type { db as defaultDb } from "./db/db";

type Executor = Pick<typeof defaultDb, "execute">;

export const SUGGEST_BUDGET_USD_ENV = "SELENA_SUGGEST_BUDGET_USD";

/**
 * Deliberately coarse, like usage/cost.ts: what one profile suggestion is
 * booked at until real invoices retune it. The ledger row says estimated.
 */
export const SUGGEST_ESTIMATED_COST_USD = 0.05;

/** Unset or unparsable means no ceiling — the class gate alone, as before. */
export function suggestBudgetUsdFromEnv(env: Record<string, string | undefined> = process.env): number | null {
	const raw = env[SUGGEST_BUDGET_USD_ENV]?.trim();
	if (!raw) return null;
	const value = Number(raw);
	return Number.isFinite(value) && value > 0 ? value : null;
}

/** Pure rule shared by both refusal frontiers (web enqueue and worker). */
export function isSuggestBudgetExceeded(
	spentThisMonthUsd: number,
	budgetUsd: number | null,
	nextCallUsd: number = SUGGEST_ESTIMATED_COST_USD,
): boolean {
	if (budgetUsd === null) return false;
	return spentThisMonthUsd + nextCallUsd > budgetUsd;
}

/**
 * The deployment-wide suggestion cap cannot be enforced by tenant RLS with a
 * count followed by enqueue: concurrent requests race, while a tenant-scoped
 * count silently weakens the owner's global ceiling. Staging therefore holds
 * this provider path closed until one atomic reservation owns the cap.
 */
export async function assertSuggestBudget(
	_dbc: Executor,
	_env: Record<string, string | undefined> = process.env,
	_now: Date = new Date(),
): Promise<void> {
	throw new Error("SUGGEST_ATOMIC_RESERVATION_REQUIRED");
}

/** Disabled with the provider path; no unscoped cost write is permitted. */
export async function recordSuggestCost(
	_dbc: Executor,
	_value: { organizationId: string; provider: string },
): Promise<void> {
	throw new Error("SUGGEST_ATOMIC_RESERVATION_REQUIRED");
}
