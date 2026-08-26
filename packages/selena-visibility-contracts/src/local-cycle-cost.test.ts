import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	assertCycleWithinBudget,
	type LocalCycleRetry,
	type LocalCycleShape,
	type LocalCycleTariff,
	localCycleCalls,
	localCycleCost,
} from "./local-cycle-cost.js";

const shape: LocalCycleShape = { gridPoints: 9, keywords: 5, repeats: 1, providersPerObservation: 1 };
const tariff: LocalCycleTariff = { currency: "USD", pricePerProviderCall: 2 };
const billedRetry: LocalCycleRetry = { maxRetriesPerObservation: 1, retriesBillable: true };
const freeRetry: LocalCycleRetry = { maxRetriesPerObservation: 1, retriesBillable: false };

describe("call counts", () => {
	it("multiplies every axis", () => {
		expect(localCycleCalls({ gridPoints: 49, keywords: 10, repeats: 2, providersPerObservation: 1 }, freeRetry)).toEqual(
			{ planned: 980, worstCase: 980 },
		);
	});

	it("counts a billable retry into the worst case only", () => {
		expect(localCycleCalls(shape, billedRetry)).toEqual({ planned: 45, worstCase: 90 });
		expect(localCycleCalls(shape, freeRetry)).toEqual({ planned: 45, worstCase: 45 });
	});

	it("refuses a shape that is not whole and positive", () => {
		for (const broken of [
			{ ...shape, gridPoints: 0 },
			{ ...shape, keywords: -1 },
			{ ...shape, repeats: 1.5 },
			{ ...shape, providersPerObservation: Number.NaN },
		]) {
			expect(() => localCycleCalls(broken, freeRetry)).toThrow("LOCAL_CYCLE_SHAPE_INVALID");
		}
	});

	it("refuses a retry policy that is not a whole count", () => {
		expect(() => localCycleCalls(shape, { maxRetriesPerObservation: -1, retriesBillable: true })).toThrow(
			"LOCAL_CYCLE_RETRY_INVALID",
		);
	});
});

describe("cost", () => {
	it("prices the billed calls", () => {
		const cost = localCycleCost(shape, tariff, billedRetry);
		expect(cost.plannedCost).toBe(90);
		expect(cost.worstCaseCost).toBe(180);
	});

	it("lets a billing floor raise the invoice without inflating the measurement", () => {
		const cost = localCycleCost(shape, { ...tariff, minimumBillableCalls: 100 }, freeRetry);
		expect(cost.plannedCalls).toBe(45);
		expect(cost.billedPlannedCalls).toBe(100);
		expect(cost.plannedCost).toBe(200);
	});

	it("keeps the inputs visible in the breakdown", () => {
		expect(localCycleCost(shape, tariff, billedRetry).breakdown).toEqual({
			gridPoints: 9,
			keywords: 5,
			repeats: 1,
			providersPerObservation: 1,
			maxRetriesPerObservation: 1,
			retriesBillable: true,
			pricePerProviderCall: 2,
			minimumBillableCalls: null,
		});
	});

	it("refuses a tariff that is not a usable price", () => {
		for (const broken of [
			{ ...tariff, pricePerProviderCall: -1 },
			{ ...tariff, pricePerProviderCall: Number.POSITIVE_INFINITY },
			{ ...tariff, minimumBillableCalls: 1.5 },
		]) {
			expect(() => localCycleCost(shape, broken, freeRetry)).toThrow("LOCAL_CYCLE_TARIFF_INVALID");
		}
	});
});

describe("budget gate", () => {
	it("judges the worst case, not the plan", () => {
		const cost = localCycleCost(shape, tariff, billedRetry);
		expect(cost.plannedCost).toBe(90);
		expect(() => assertCycleWithinBudget(cost, 100)).toThrow("LOCAL_CYCLE_BUDGET_EXCEEDED");
		expect(() => assertCycleWithinBudget(cost, 180)).not.toThrow();
	});

	it("refuses a cap that is not a number of dollars", () => {
		const cost = localCycleCost(shape, tariff, freeRetry);
		expect(() => assertCycleWithinBudget(cost, -1)).toThrow("LOCAL_CYCLE_BUDGET_INVALID");
	});
});

// The point of the module is that the price comes from outside it. These two
// checks are what keep that true as the file is edited.
describe("the module carries no price and reaches nothing", () => {
	const source = readFileSync(fileURLToPath(new URL("./local-cycle-cost.ts", import.meta.url)), "utf8");
	const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

	it("holds no fractional literal that could be a tariff", () => {
		expect(code.match(/\b\d+\.\d+\b/g)).toBeNull();
	});

	it("performs no i/o and reads no environment", () => {
		for (const marker of ["fetch(", "http", "process.env", "node:", "require("]) {
			expect(code).not.toContain(marker);
		}
	});
});
