import { describe, expect, it, vi } from "vitest";
import {
	assertSuggestBudget,
	isSuggestBudgetExceeded,
	recordSuggestCost,
	SUGGEST_ESTIMATED_COST_USD,
	suggestBudgetUsdFromEnv,
} from "./selena-suggest-metering";

describe("suggestBudgetUsdFromEnv", () => {
	it("means no ceiling when unset or unparsable", () => {
		expect(suggestBudgetUsdFromEnv({})).toBeNull();
		expect(suggestBudgetUsdFromEnv({ SELENA_SUGGEST_BUDGET_USD: "" })).toBeNull();
		expect(suggestBudgetUsdFromEnv({ SELENA_SUGGEST_BUDGET_USD: "twenty" })).toBeNull();
		expect(suggestBudgetUsdFromEnv({ SELENA_SUGGEST_BUDGET_USD: "0" })).toBeNull();
	});

	it("reads a positive ceiling", () => {
		expect(suggestBudgetUsdFromEnv({ SELENA_SUGGEST_BUDGET_USD: "20" })).toBe(20);
	});
});

describe("isSuggestBudgetExceeded", () => {
	it("never refuses without a ceiling", () => {
		expect(isSuggestBudgetExceeded(1_000_000, null)).toBe(false);
	});

	it("refuses the call that would cross the ceiling, not the one that reaches it", () => {
		expect(isSuggestBudgetExceeded(20 - SUGGEST_ESTIMATED_COST_USD, 20)).toBe(false);
		expect(isSuggestBudgetExceeded(20, 20)).toBe(true);
		expect(isSuggestBudgetExceeded(0, 20)).toBe(false);
	});
});

describe("staging suggestion hold", () => {
	it("fails closed without querying or writing the tenant database", async () => {
		const execute = vi.fn();
		const db = { execute } as never;
		await expect(assertSuggestBudget(db)).rejects.toThrow("SUGGEST_ATOMIC_RESERVATION_REQUIRED");
		await expect(recordSuggestCost(db, { organizationId: "tenant-1", provider: "test" })).rejects.toThrow(
			"SUGGEST_ATOMIC_RESERVATION_REQUIRED",
		);
		expect(execute).not.toHaveBeenCalled();
	});
});
