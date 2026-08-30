import { describe, expect, it } from "vitest";
import { cycleProgressAfterRunCompletion } from "./selena-visibility-repositories";

describe("cycleProgressAfterRunCompletion", () => {
	it("advances an active cycle without completing it", () => {
		expect(cycleProgressAfterRunCompletion({ status: "QUEUED", completedRuns: 0, expectedRuns: 3 })).toEqual({
			status: "RUNNING",
			completedRuns: 1,
			cycleDone: false,
		});
	});

	it("moves an active cycle to QC when the expected run count completes", () => {
		expect(cycleProgressAfterRunCompletion({ status: "RUNNING", completedRuns: 2, expectedRuns: 3 })).toEqual({
			status: "QC_REQUIRED",
			completedRuns: 3,
			cycleDone: true,
		});
	});

	it("does not revive a stopped cycle when an in-flight run finishes late", () => {
		expect(cycleProgressAfterRunCompletion({ status: "STOPPED", completedRuns: 2, expectedRuns: 3 })).toEqual({
			status: "STOPPED",
			completedRuns: 3,
			cycleDone: true,
		});
	});

	it.each(["ANALYZING", "QC_REQUIRED", "READY", "FAILED", "CARDINALITY_INCIDENT"] as const)(
		"preserves the forward-only %s state",
		(status) => {
			expect(cycleProgressAfterRunCompletion({ status, completedRuns: 1, expectedRuns: 3 })).toEqual({
				status,
				completedRuns: 2,
				cycleDone: false,
			});
		},
	);
});
