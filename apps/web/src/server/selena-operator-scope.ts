import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svAuditEvents, svOrderRequests, svOrders } from "@workspace/lib/db/schema";
import type { SelenaRepositoryContext } from "@workspace/lib/selena-visibility-repositories";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/helpers";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";

// How the platform operator acts on a client's order or request. Pilot guests
// each own a workspace, so an order the operator must review, approve or sign
// off lives in an organization the operator is not a member of. The
// organization is taken from the stored row, never from the caller, and only
// after requireAdmin() has confirmed the platform role (user.role = admin): an
// admin of their own workspace is a member role and is refused there.

/** Loaded on demand; see selena-admin-orders.ts on why this is not a static import. */
const database = async () => (await import("@workspace/lib/db/db")).db;

export type OperatorAction =
	| "view_answers"
	| "preflight"
	| "approve"
	| "enqueue"
	| "stop"
	| "qc"
	| "deliver"
	| "request_status";

async function operatorScope(
	subjectKind: "sv_orders" | "sv_order_requests",
	subjectId: string,
	action: OperatorAction,
	resolveOrganization: () => Promise<string | null>,
): Promise<SelenaRepositoryContext> {
	await requireAdmin();
	const operator = await resolveSessionAuthContext();
	const organizationId = await resolveOrganization();
	if (!organizationId)
		throw new Error(`Not found: ${subjectKind === "sv_orders" ? "order" : "request"} does not exist`);
	const context: SelenaRepositoryContext = {
		actorId: operator.actorId,
		tenantId: organizationId,
		role: "owner",
		authType: "session",
		permissions: ["client:read", "client:write"],
	};
	// Written in the order's own organization, before the action runs, so a
	// client's audit trail names every operator who touched their order and
	// what for, whether or not the action itself then succeeds.
	await withOrganizationTransaction(await database(), organizationId, (tx) =>
		tx.insert(svAuditEvents).values({
			organizationId,
			actorId: operator.actorId,
			event: "OPERATOR_ACTION",
			subjectKind,
			subjectId,
			details: {
				action,
				actorKind: "platform_admin",
				operatorOrganizationId: operator.tenantId,
				crossTenant: operator.tenantId !== organizationId,
			},
		}),
	);
	return context;
}

/** The order's own organization as the repository context, for a verified platform operator. */
export function operatorScopeForOrder(orderId: string, action: OperatorAction): Promise<SelenaRepositoryContext> {
	return operatorScope("sv_orders", orderId, action, async () => {
		const [row] = await (await database())
			.select({ organizationId: svOrders.organizationId })
			.from(svOrders)
			.where(eq(svOrders.id, orderId))
			.limit(1);
		return row?.organizationId ?? null;
	});
}

/** The same for a client's plan request in the operator's inbox. */
export function operatorScopeForRequest(requestId: string, action: OperatorAction): Promise<SelenaRepositoryContext> {
	return operatorScope("sv_order_requests", requestId, action, async () => {
		const [row] = await (await database())
			.select({ organizationId: svOrderRequests.organizationId })
			.from(svOrderRequests)
			.where(eq(svOrderRequests.id, requestId))
			.limit(1);
		return row?.organizationId ?? null;
	});
}
