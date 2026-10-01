import type { OrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svCycles, svOrders } from "@workspace/lib/db/schema";
import {
	REPORT_READY_CYCLE_STATUS,
	type ReportAnchor,
	type ReportCycleCandidate,
	selectReportAnchor,
} from "@workspace/lib/selena-report-cycle";
import { and, desc, eq, type SQL, sql } from "drizzle-orm";

const reportCycleColumns = {
	id: svCycles.id,
	orderId: svCycles.orderId,
	lockId: svCycles.lockId,
	status: svCycles.status,
	expectedRuns: svCycles.expectedRuns,
	completedRuns: svCycles.completedRuns,
	createdAt: svCycles.createdAt,
	// A completed run may have FAILED or come back INVALID; the successful count
	// is what says whether the cycle measured anything at all. Both subqueries
	// are written out in full: column references inside a select-list template
	// are not table-qualified, and "cycle_id" = "id" would compare a run with
	// itself.
	succeededRuns: sql<number>`(
		select count(*)::int from sv_runs as succeeded_runs
		where succeeded_runs.cycle_id = sv_cycles.id
			and succeeded_runs.organization_id = sv_cycles.organization_id
			and succeeded_runs.status = 'SUCCEEDED'
	)`,
	// QC decides per order; a record may name the cycle or leave it implied.
	latestQcDecision: sql<string | null>`(
		select latest_qc.decision from sv_qc_records as latest_qc
		where latest_qc.order_id = sv_cycles.order_id
			and latest_qc.organization_id = sv_cycles.organization_id
			and (latest_qc.cycle_id is null or latest_qc.cycle_id = sv_cycles.id)
		order by latest_qc.created_at desc
		limit 1
	)`,
};

type ReportCycleRow = {
	id: string;
	orderId: string;
	lockId: string;
	status: string;
	expectedRuns: number;
	completedRuns: number;
	createdAt: Date;
	succeededRuns: number;
	latestQcDecision: string | null;
};

function toCandidate(row: ReportCycleRow | undefined): ReportCycleCandidate | null {
	if (!row) return null;
	return { ...row, succeededRuns: Number(row.succeededRuns ?? 0), latestQcDecision: row.latestQcDecision ?? null };
}

/**
 * Which cycle a project's client may be shown, read the one way every client
 * surface reads it: the report page, the cabinet's project rows and anything
 * else that names "the report" resolve the same READY cycle and the same
 * newer update. Tenant scoping is the guard on every query.
 */
export async function loadReportAnchor(
	tx: OrganizationTransaction,
	input: { projectId: string; tenantId: string },
): Promise<ReportAnchor | null> {
	const newestProjectCycle = (filter?: SQL) =>
		tx
			.select(reportCycleColumns)
			.from(svCycles)
			.innerJoin(svOrders, eq(svCycles.orderId, svOrders.id))
			.where(
				and(
					eq(svOrders.projectId, input.projectId),
					eq(svOrders.organizationId, input.tenantId),
					eq(svCycles.organizationId, input.tenantId),
					filter,
				),
			)
			.orderBy(desc(svCycles.createdAt))
			.limit(1);
	const [readyRows, newestRows, orderRows] = await Promise.all([
		newestProjectCycle(eq(svCycles.status, REPORT_READY_CYCLE_STATUS)),
		newestProjectCycle(),
		tx
			.select({ id: svOrders.id, lockId: svOrders.lockId, createdAt: svOrders.createdAt })
			.from(svOrders)
			.where(and(eq(svOrders.projectId, input.projectId), eq(svOrders.organizationId, input.tenantId)))
			.orderBy(desc(svOrders.createdAt))
			.limit(1),
	]);
	return selectReportAnchor({
		latestReadyCycle: toCandidate(readyRows[0]),
		latestCycle: toCandidate(newestRows[0]),
		latestOrder: orderRows[0] ?? null,
	});
}
