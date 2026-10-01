import { describe, expect, it } from "vitest";
import {
	type MonthlyAllowanceRow,
	monthlyAllowanceAdmits,
	monthlyAnswerUsage,
	monthStartUtc,
} from "@/lib/selena-monthly-allowance";

function cycle(overrides: Partial<MonthlyAllowanceRow> = {}): MonthlyAllowanceRow {
	return {
		orderStatus: "QC_REQUIRED",
		cycleStatus: "QC_REQUIRED",
		expectedRuns: 24,
		completedRuns: 24,
		succeededRuns: 24,
		...overrides,
	};
}

describe("what spends the client's monthly answer allowance", () => {
	it("charges a partially successful cycle for its successful answers only", () => {
		expect(monthlyAnswerUsage([cycle({ succeededRuns: 15 })])).toEqual({ used: 15, reserved: 0 });
	});

	it("charges nothing for a cycle whose every run failed or came back invalid", () => {
		expect(monthlyAnswerUsage([cycle({ succeededRuns: 0 })])).toEqual({ used: 0, reserved: 0 });
		expect(
			monthlyAnswerUsage([cycle({ succeededRuns: 0, cycleStatus: "FAILED", orderStatus: "PARTIAL_FAILURE" })]),
		).toEqual({ used: 0, reserved: 0 });
	});

	it("keeps the successful answers of a stopped cycle: a partial result is not zeroed", () => {
		expect(
			monthlyAnswerUsage([
				cycle({ cycleStatus: "STOPPED", orderStatus: "PARTIAL_FAILURE", completedRuns: 20, succeededRuns: 17 }),
			]),
		).toEqual({ used: 17, reserved: 0 });
	});

	it("holds the unfinished answers of running cycles as reserved, so two parallel cycles cannot overrun the month", () => {
		const usage = monthlyAnswerUsage([
			cycle({ cycleStatus: "RUNNING", orderStatus: "RUNNING", completedRuns: 10, succeededRuns: 8 }),
			cycle({ cycleStatus: "QUEUED", orderStatus: "QUEUED", completedRuns: 0, succeededRuns: 0 }),
		]);
		expect(usage).toEqual({ used: 8, reserved: 14 + 24 });
		expect(monthlyAllowanceAdmits(usage, 800, 24)).toEqual({ admitted: true });
		expect(monthlyAllowanceAdmits(usage, 50, 24)).toEqual({ admitted: false, committed: 46 });
	});

	it("reserves a paid order that has no cycle yet, and not an unpaid draft", () => {
		expect(
			monthlyAnswerUsage([
				cycle({ orderStatus: "PAID_REVIEW_REQUIRED", cycleStatus: null, completedRuns: 0, succeededRuns: 0 }),
				cycle({ orderStatus: "APPROVED", cycleStatus: null, completedRuns: 0, succeededRuns: 0 }),
				cycle({ orderStatus: "QUOTED", cycleStatus: null, completedRuns: 0, succeededRuns: 0 }),
			]),
		).toEqual({ used: 0, reserved: 48 });
	});

	it("charges nothing to a cancelled order, whatever its cycle measured", () => {
		expect(
			monthlyAnswerUsage([cycle({ orderStatus: "CANCELLED", cycleStatus: "STOPPED", succeededRuns: 20 })]),
		).toEqual({ used: 0, reserved: 0 });
	});

	it("never counts a completed run twice: a cycle's answers are its succeeded runs, not its attempts", () => {
		// Re-delivery of a finished run leaves succeededRuns and completedRuns
		// where they are (the run store ignores a second completion); an
		// over-completed counter must not turn into negative reservation either.
		expect(monthlyAnswerUsage([cycle({ cycleStatus: "RUNNING", completedRuns: 25, succeededRuns: 24 })])).toEqual({
			used: 24,
			reserved: 0,
		});
	});

	it("starts the month at 00:00 UTC on the first", () => {
		expect(monthStartUtc(new Date("2026-09-28T23:30:00+05:00")).toISOString()).toBe("2026-09-01T00:00:00.000Z");
	});
});
