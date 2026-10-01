import { describe, expect, it } from "vitest";
import {
	cycleProgress,
	describeCycleUpdate,
	type ReportCycleCandidate,
	selectReportAnchor,
} from "./selena-report-cycle";

function cycle(
	overrides: Omit<Partial<ReportCycleCandidate>, "createdAt"> & { id: string; createdAt: string },
): ReportCycleCandidate {
	return {
		orderId: `${overrides.id}-order`,
		lockId: `${overrides.id}-lock`,
		status: "READY",
		expectedRuns: 24,
		completedRuns: 24,
		succeededRuns: 24,
		latestQcDecision: "approved",
		...overrides,
		createdAt: new Date(overrides.createdAt),
	};
}

describe("what the client is shown as the report", () => {
	const ready = cycle({ id: "ready", createdAt: "2026-09-01T10:00:00Z" });

	it("keeps the newest READY cycle as the report when a newer cycle failed", () => {
		const failed = cycle({
			id: "failed",
			createdAt: "2026-09-20T10:00:00Z",
			status: "QC_REQUIRED",
			succeededRuns: 0,
			latestQcDecision: "rejected",
		});
		const anchor = selectReportAnchor({ latestReadyCycle: ready, latestCycle: failed, latestOrder: null });

		expect(anchor?.cycle?.id).toBe("ready");
		expect(anchor?.orderId).toBe("ready-order");
		expect(anchor?.update).toMatchObject({
			cycleId: "failed",
			state: "unsuccessful",
			reason: "QC_REJECTED",
			createdAt: new Date("2026-09-20T10:00:00Z"),
		});
	});

	it("reports no update when the newest cycle is the READY one", () => {
		const anchor = selectReportAnchor({
			latestReadyCycle: ready,
			latestCycle: ready,
			latestOrder: { id: "ready-order", lockId: "ready-lock", createdAt: new Date("2026-08-30T00:00:00Z") },
		});
		expect(anchor).toMatchObject({ cycle: { id: "ready" }, update: null });
	});

	it("has no report while no cycle is READY, and says how the newest one stands", () => {
		const running = cycle({
			id: "running",
			createdAt: "2026-09-20T10:00:00Z",
			status: "RUNNING",
			completedRuns: 7,
			succeededRuns: 5,
			latestQcDecision: null,
		});
		const anchor = selectReportAnchor({ latestReadyCycle: null, latestCycle: running, latestOrder: null });

		expect(anchor?.cycle).toBeNull();
		expect(anchor?.orderId).toBe("running-order");
		expect(anchor?.update).toMatchObject({
			cycleId: "running",
			state: "in_progress",
			completedRuns: 7,
			expectedRuns: 24,
		});
	});

	it("falls back to the newest order when no cycle exists at all", () => {
		const anchor = selectReportAnchor({
			latestReadyCycle: null,
			latestCycle: null,
			latestOrder: { id: "paid-order", lockId: "paid-lock", createdAt: new Date("2026-09-02T10:00:00Z") },
		});
		expect(anchor).toEqual({ orderId: "paid-order", lockId: "paid-lock", cycle: null, update: null });
	});

	it("is empty for a project that never ordered", () => {
		expect(selectReportAnchor({ latestReadyCycle: null, latestCycle: null, latestOrder: null })).toBeNull();
	});
});

describe("how a cycle that is not the report is described", () => {
	const base = { id: "c", createdAt: "2026-09-20T10:00:00Z", latestQcDecision: null };

	it("calls a finished cycle without one successful run unsuccessful, even before QC", () => {
		expect(describeCycleUpdate(cycle({ ...base, status: "QC_REQUIRED", succeededRuns: 0 }))).toMatchObject({
			state: "unsuccessful",
			reason: "NO_SUCCESSFUL_RUNS",
		});
	});

	it("calls a QC-rejected cycle unsuccessful whatever its runs did", () => {
		expect(
			describeCycleUpdate(cycle({ ...base, status: "QC_REQUIRED", succeededRuns: 24, latestQcDecision: "rejected" })),
		).toMatchObject({ state: "unsuccessful", reason: "QC_REJECTED" });
	});

	it("keeps the rejection as the reason once the rejection has stopped the cycle", () => {
		expect(
			describeCycleUpdate(cycle({ ...base, status: "STOPPED", succeededRuns: 0, latestQcDecision: "rejected" })),
		).toMatchObject({ state: "unsuccessful", reason: "QC_REJECTED" });
	});

	it("names a stopped or failed cycle by what happened to it", () => {
		expect(describeCycleUpdate(cycle({ ...base, status: "STOPPED", succeededRuns: 20 }))).toMatchObject({
			state: "unsuccessful",
			reason: "STOPPED",
		});
		expect(describeCycleUpdate(cycle({ ...base, status: "FAILED", succeededRuns: 0 }))).toMatchObject({
			state: "unsuccessful",
			reason: "FAILED",
		});
	});

	it("keeps a finished cycle with successful runs as awaiting review until QC decides", () => {
		expect(describeCycleUpdate(cycle({ ...base, status: "QC_REQUIRED", succeededRuns: 20 }))).toMatchObject({
			state: "awaiting_review",
			succeededRuns: 20,
		});
	});
});

describe("cycle progress as the operator queue states it", () => {
	it("does not let a cycle whose every run failed read as 24/24", () => {
		expect(cycleProgress({ status: "QC_REQUIRED", expectedRuns: 24, completedRuns: 24, succeededRuns: 0 })).toEqual({
			kind: "unsuccessful",
			succeededRuns: 0,
			expectedRuns: 24,
		});
	});

	it("counts successful runs against the total for a finished cycle", () => {
		expect(cycleProgress({ status: "READY", expectedRuns: 24, completedRuns: 24, succeededRuns: 24 })).toEqual({
			kind: "finished",
			succeededRuns: 24,
			expectedRuns: 24,
		});
		expect(cycleProgress({ status: "QC_REQUIRED", expectedRuns: 24, completedRuns: 24, succeededRuns: 9 })).toEqual({
			kind: "finished",
			succeededRuns: 9,
			expectedRuns: 24,
		});
	});

	it("shows completed and successful counts while runs are still in flight", () => {
		expect(cycleProgress({ status: "RUNNING", expectedRuns: 24, completedRuns: 10, succeededRuns: 8 })).toEqual({
			kind: "in_progress",
			completedRuns: 10,
			succeededRuns: 8,
			expectedRuns: 24,
		});
	});
});
