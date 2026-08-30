import type { SvCycle } from "@workspace/lib/db/schema";
import type { OrderStatus } from "@workspace/selena-visibility-contracts";

export const MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES = [
	"STOPPED",
	"FAILED",
	"CARDINALITY_INCIDENT",
] as const satisfies readonly SvCycle["status"][];
export const MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES = ["CANCELLED"] as const satisfies readonly OrderStatus[];

const excludedCycleStatuses = new Set<SvCycle["status"]>(MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES);
const excludedOrderStatuses = new Set<OrderStatus>(MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES);

export function countsTowardMonthlyAllowance(input: {
	orderStatus: OrderStatus;
	cycleStatus: SvCycle["status"];
}): boolean {
	return !excludedOrderStatuses.has(input.orderStatus) && !excludedCycleStatuses.has(input.cycleStatus);
}
