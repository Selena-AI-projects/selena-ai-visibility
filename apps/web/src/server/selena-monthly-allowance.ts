import type { OrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svConfigurationLocks, svCycles, svOrders } from "@workspace/lib/db/schema";
import { monthlyAnswerAllowance, type SelenaPlanId } from "@workspace/selena-visibility-contracts";
import { and, eq, gte, isNull, or, sql } from "drizzle-orm";
import {
	type MonthlyAllowanceRow,
	type MonthlyAnswerUsage,
	monthlyAllowanceAdmits,
	monthlyAnswerUsage,
	monthStartUtc,
} from "@/lib/selena-monthly-allowance";

/**
 * One row per cycle the project started this month, plus one per paid order
 * that has no cycle yet. The succeeded count is a subquery written out in
 * full: column references inside a select-list template are not
 * table-qualified, and "cycle_id" = "id" would compare a run with itself.
 */
export async function readMonthlyAnswerUsage(
	tx: OrganizationTransaction,
	input: { tenantId: string; projectId: string; monthStart?: Date },
): Promise<MonthlyAnswerUsage> {
	const monthStart = input.monthStart ?? monthStartUtc();
	const rows = await tx
		.select({
			orderStatus: svOrders.status,
			cycleStatus: svCycles.status,
			expectedRuns: sql<number>`coalesce(${svCycles.expectedRuns}, ${svConfigurationLocks.expectedRuns})::int`,
			completedRuns: sql<number>`coalesce(${svCycles.completedRuns}, 0)::int`,
			succeededRuns: sql<number>`coalesce((
				select count(*)::int from sv_runs as succeeded_runs
				where succeeded_runs.cycle_id = sv_cycles.id
					and succeeded_runs.organization_id = sv_cycles.organization_id
					and succeeded_runs.status = 'SUCCEEDED'
			), 0)`,
		})
		.from(svOrders)
		.innerJoin(svConfigurationLocks, eq(svOrders.lockId, svConfigurationLocks.id))
		.leftJoin(svCycles, and(eq(svCycles.orderId, svOrders.id), eq(svCycles.organizationId, input.tenantId)))
		.where(
			and(
				eq(svOrders.projectId, input.projectId),
				eq(svOrders.organizationId, input.tenantId),
				or(gte(svCycles.createdAt, monthStart), and(isNull(svCycles.id), gte(svOrders.createdAt, monthStart))),
			),
		);
	return monthlyAnswerUsage(
		rows.map(
			(row): MonthlyAllowanceRow => ({
				orderStatus: row.orderStatus,
				cycleStatus: row.cycleStatus ?? null,
				expectedRuns: Number(row.expectedRuns ?? 0),
				completedRuns: Number(row.completedRuns ?? 0),
				succeededRuns: Number(row.succeededRuns ?? 0),
			}),
		),
	);
}

/**
 * Refuses a measurement the month cannot hold, with the numbers. Serialized
 * per project for the rest of the transaction, so two orders placed at once
 * cannot both read the same remaining allowance: the second waits for the
 * first to commit and then sees its reservation.
 */
export async function assertMonthlyAllowanceAvailable(
	tx: OrganizationTransaction,
	input: { tenantId: string; projectId: string; planId: SelenaPlanId; expectedRuns: number; now?: Date },
): Promise<void> {
	const allowance = monthlyAnswerAllowance(input.planId);
	if (allowance === null) return;
	await tx.execute(
		sql`select pg_advisory_xact_lock(hashtextextended('selena-monthly-allowance:' || ${input.projectId}, 0))`,
	);
	const usage = await readMonthlyAnswerUsage(tx, {
		tenantId: input.tenantId,
		projectId: input.projectId,
		monthStart: monthStartUtc(input.now),
	});
	const verdict = monthlyAllowanceAdmits(usage, allowance, input.expectedRuns);
	if (verdict.admitted) return;
	throw new Error(
		`SELENA_MONTHLY_ALLOWANCE_EXCEEDED: ${usage.used} answers used and ${usage.reserved} reserved of ${allowance} this month; this measurement needs ${input.expectedRuns} more`,
	);
}
