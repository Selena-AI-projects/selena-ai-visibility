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

	it.each(["INVALID", "FAILED"] as const)("stops a Perplexity cycle after its first %s run", (runStatus) => {
		expect(
			cycleProgressAfterRunCompletion({
				status: "RUNNING",
				completedRuns: 0,
				expectedRuns: 25,
				systemId: "Perplexity",
				runStatus,
			}),
		).toEqual({ status: "STOPPED", completedRuns: 1, cycleDone: false });
	});

	it("keeps a successful Perplexity cycle running and does not widen the breaker to other systems", () => {
		expect(
			cycleProgressAfterRunCompletion({
				status: "RUNNING",
				completedRuns: 0,
				expectedRuns: 25,
				systemId: "Perplexity",
				runStatus: "SUCCEEDED",
			}),
		).toMatchObject({ status: "RUNNING" });
		expect(
			cycleProgressAfterRunCompletion({
				status: "RUNNING",
				completedRuns: 0,
				expectedRuns: 25,
				systemId: "ChatGPT",
				runStatus: "INVALID",
			}),
		).toMatchObject({ status: "RUNNING" });
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
