import { describe, expect, it } from "vitest";
import { countsTowardMonthlyAllowance } from "@/lib/selena-monthly-allowance";

describe("monthly answer allowance", () => {
	it.each(["CREATED", "APPROVED", "QUEUED", "RUNNING", "ANALYZING", "QC_REQUIRED", "READY"] as const)(
		"counts a live %s measurement",
		(cycleStatus) => {
			expect(countsTowardMonthlyAllowance({ orderStatus: "RUNNING", cycleStatus })).toBe(true);
		},
	);

	it.each(["STOPPED", "FAILED", "CARDINALITY_INCIDENT"] as const)(
		"releases allowance after a cycle reaches %s",
		(cycleStatus) => {
			expect(countsTowardMonthlyAllowance({ orderStatus: "PARTIAL_FAILURE", cycleStatus })).toBe(false);
		},
	);

	it("does not charge allowance to a cancelled order", () => {
		expect(countsTowardMonthlyAllowance({ orderStatus: "CANCELLED", cycleStatus: "QC_REQUIRED" })).toBe(false);
	});
});
