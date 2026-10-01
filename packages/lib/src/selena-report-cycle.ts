/**
 * Which cycle a client may be shown, and how a cycle's outcome is stated.
 *
 * The customer report, the weekly digest and the cycle comparison all decide
 * through here, so "the report" names the same cycle everywhere: only a cycle
 * an operator signed off at QC. Anything newer is an update the client is told
 * about, never a report they are shown in its place.
 */

/** READY is the only status in which a cycle's evidence is final and signed off. */
export const REPORT_READY_CYCLE_STATUS = "READY" as const;

const IN_PROGRESS_CYCLE_STATUSES = new Set(["CREATED", "APPROVED", "QUEUED", "RUNNING", "ANALYZING"]);
const BROKEN_CYCLE_STATUSES = new Set(["STOPPED", "FAILED", "CARDINALITY_INCIDENT"]);

export type CycleRunCounts = {
	status: string;
	expectedRuns: number;
	completedRuns: number;
	/** Runs that finished SUCCEEDED; a completed run may also be FAILED or INVALID. */
	succeededRuns: number;
};

export type CycleProgress =
	| { kind: "in_progress"; completedRuns: number; succeededRuns: number; expectedRuns: number }
	| { kind: "unsuccessful"; succeededRuns: 0; expectedRuns: number }
	| { kind: "finished"; succeededRuns: number; expectedRuns: number };

/**
 * A finished cycle whose every run failed or came back invalid has completed
 * all of its runs and measured nothing. Counting completions alone would call
 * it "24/24"; the successful count is what separates it from a result.
 */
export function cycleProgress(cycle: CycleRunCounts): CycleProgress {
	if (IN_PROGRESS_CYCLE_STATUSES.has(cycle.status))
		return {
			kind: "in_progress",
			completedRuns: cycle.completedRuns,
			succeededRuns: cycle.succeededRuns,
			expectedRuns: cycle.expectedRuns,
		};
	if (cycle.succeededRuns === 0) return { kind: "unsuccessful", succeededRuns: 0, expectedRuns: cycle.expectedRuns };
	return { kind: "finished", succeededRuns: cycle.succeededRuns, expectedRuns: cycle.expectedRuns };
}

export type ReportCycleCandidate = CycleRunCounts & {
	id: string;
	orderId: string;
	lockId: string;
	createdAt: Date;
	/** The newest QC decision recorded against this cycle's order, if any. */
	latestQcDecision: string | null;
};

export type ReportCycleUpdate = {
	cycleId: string;
	createdAt: Date;
	expectedRuns: number;
	completedRuns: number;
	succeededRuns: number;
} & (
	| { state: "in_progress" }
	| { state: "awaiting_review" }
	| {
			state: "unsuccessful";
			reason: "QC_REJECTED" | "NO_SUCCESSFUL_RUNS" | "STOPPED" | "FAILED" | "CARDINALITY_INCIDENT";
	  }
);

/** How a cycle that is not the report stands, in the client's terms. */
export function describeCycleUpdate(cycle: ReportCycleCandidate): ReportCycleUpdate {
	const base = {
		cycleId: cycle.id,
		createdAt: cycle.createdAt,
		expectedRuns: cycle.expectedRuns,
		completedRuns: cycle.completedRuns,
		succeededRuns: cycle.succeededRuns,
	};
	if (IN_PROGRESS_CYCLE_STATUSES.has(cycle.status)) return { ...base, state: "in_progress" };
	if (BROKEN_CYCLE_STATUSES.has(cycle.status))
		return { ...base, state: "unsuccessful", reason: cycle.status as "STOPPED" | "FAILED" | "CARDINALITY_INCIDENT" };
	if (cycle.latestQcDecision === "rejected") return { ...base, state: "unsuccessful", reason: "QC_REJECTED" };
	if (cycle.succeededRuns === 0) return { ...base, state: "unsuccessful", reason: "NO_SUCCESSFUL_RUNS" };
	return { ...base, state: "awaiting_review" };
}

export type ReportOrderAnchor = { id: string; lockId: string; createdAt: Date };

export type ReportAnchor = {
	orderId: string;
	lockId: string;
	/** The cycle the report speaks for; null until one has been signed off. */
	cycle: ReportCycleCandidate | null;
	/** A cycle newer than the report, stated as an update rather than shown as the report. */
	update: ReportCycleUpdate | null;
};

export function selectReportAnchor(input: {
	latestReadyCycle: ReportCycleCandidate | null;
	latestCycle: ReportCycleCandidate | null;
	latestOrder: ReportOrderAnchor | null;
}): ReportAnchor | null {
	const { latestReadyCycle: ready, latestCycle: newest, latestOrder } = input;
	if (ready) {
		const newer = newest && newest.id !== ready.id && newest.createdAt > ready.createdAt ? newest : null;
		return {
			orderId: ready.orderId,
			lockId: ready.lockId,
			cycle: ready,
			update: newer ? describeCycleUpdate(newer) : null,
		};
	}
	if (newest)
		return { orderId: newest.orderId, lockId: newest.lockId, cycle: null, update: describeCycleUpdate(newest) };
	if (latestOrder) return { orderId: latestOrder.id, lockId: latestOrder.lockId, cycle: null, update: null };
	return null;
}
