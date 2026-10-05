import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { organization, svOrderRequests, svProjects } from "@workspace/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/helpers";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";
import { operatorScopeForRequest } from "./selena-operator-scope";
import { submitSelenaOrderRequest } from "./selena-order-request-submit";

export type { OrderRequestOutcome } from "./selena-order-request-submit";

// A request is a lead. The operator reads these on the admin desk and builds
// the paid order there, so the money path keeps its single human gate. The one
// exception is a request an issued pilot seat already made free: it may start
// itself, under caps and behind a default-off flag. A seat is a row the
// operator minted, spendable once, bound to one plan and to an expiry — never
// a string compared against a list of live codes in the environment.

export const orderRequestPlanIds = ["visibility-snapshot", "full-discovery-landscape"] as const;

const createSchema = z.object({
	projectId: z.string().uuid(),
	planId: z.enum(orderRequestPlanIds),
	contactName: z.string().trim().min(1).max(200),
	contactChannel: z.string().trim().min(3).max(300),
	comment: z.string().trim().max(2000).optional(),
	promoCode: z.string().trim().max(100).optional(),
});

export const createSelenaOrderRequestFn = createServerFn({ method: "POST" })
	.validator(createSchema)
	.handler(async ({ data }) => submitSelenaOrderRequest(await resolveSessionAuthContext(), data));

export type OrderRequestRow = {
	id: string;
	organizationId: string;
	organizationName: string;
	projectId: string;
	projectName: string;
	planId: string;
	contactName: string;
	contactChannel: string;
	comment: string | null;
	promoCode: string | null;
	promoApplied: boolean;
	status: string;
	createdAt: string;
};

/**
 * The operator's inbox spans every workspace: pilot guests each own one, so a
 * request filtered to the operator's own organization is a request nobody
 * reads. requireAdmin() admits only the platform role and switches the request
 * onto the operator connection; the owning workspace travels with each row.
 */
export const listSelenaOrderRequestsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<OrderRequestRow[]> => {
		await requireAdmin();
		const rows = await db
			.select({
				id: svOrderRequests.id,
				organizationId: svOrderRequests.organizationId,
				organizationName: organization.name,
				projectId: svOrderRequests.projectId,
				projectName: svProjects.name,
				planId: svOrderRequests.planId,
				contactName: svOrderRequests.contactName,
				contactChannel: svOrderRequests.contactChannel,
				comment: svOrderRequests.comment,
				promoCode: svOrderRequests.promoCode,
				promoApplied: svOrderRequests.promoApplied,
				status: svOrderRequests.status,
				createdAt: svOrderRequests.createdAt,
			})
			.from(svOrderRequests)
			.innerJoin(svProjects, eq(svOrderRequests.projectId, svProjects.id))
			.innerJoin(organization, eq(svOrderRequests.organizationId, organization.id))
			.orderBy(desc(svOrderRequests.createdAt));
		return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
	},
);

export const updateSelenaOrderRequestStatusFn = createServerFn({ method: "POST" })
	.validator(z.object({ requestId: z.string().uuid(), status: z.enum(["NEW", "IN_PROGRESS", "CLOSED"]) }))
	.handler(async ({ data }) => {
		const context = await operatorScopeForRequest(data.requestId, "request_status");
		const [row] = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			tx
				.update(svOrderRequests)
				.set({ status: data.status, updatedAt: new Date() })
				.where(and(eq(svOrderRequests.id, data.requestId), eq(svOrderRequests.organizationId, context.tenantId)))
				.returning({ id: svOrderRequests.id }),
		);
		if (!row) throw new Error("Not found: request does not exist");
		return { id: row.id, status: data.status };
	});
