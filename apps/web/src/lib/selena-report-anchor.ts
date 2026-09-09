export type ReportCycleAnchor = {
	orderId: string;
	lockId: string;
	cycle: {
		id: string;
		status: string;
		expectedRuns: number;
		completedRuns: number;
		createdAt: Date;
	};
};

export type ReportOrderAnchor = {
	id: string;
	lockId: string;
	createdAt: Date;
};

export type ReportAnchor = ReportCycleAnchor | { orderId: string; lockId: string; cycle: null };

export function selectReportAnchor(
	latestCycle: ReportCycleAnchor | null,
	latestOrder: ReportOrderAnchor | null,
): ReportAnchor | null {
	if (latestCycle) return latestCycle;
	return latestOrder ? { orderId: latestOrder.id, lockId: latestOrder.lockId, cycle: null } : null;
}
