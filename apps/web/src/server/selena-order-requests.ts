import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svAuditEvents, svOrderRequests, svProjects, svScenarios } from "@workspace/lib/db/schema";
import { claimFreeAutoDispatch, releaseFreeAutoDispatchClaim } from "@workspace/lib/selena-free-auto-dispatch-claims";
import { redeemPilotInvite } from "@workspace/lib/selena-pilot-invites";
import { createSelenaRepositories, type SelenaRepositoryContext } from "@workspace/lib/selena-visibility-repositories";
import {
	decideFreeAutoDispatch,
	type FreeAutoDispatchStatus,
	freeAutoDispatchConfigFromEnv,
	SELENA_CATALOG,
} from "@workspace/selena-visibility-contracts";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/helpers";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";
import { prepareSelenaScenarios, startSelenaMeasurement } from "./selena-order-desk-core";

const repositories = /* @__PURE__ */ createSelenaRepositories(db);

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

/**
 * A free request can start itself, under caps and behind a default-off flag.
 *
 * The scenarios it approves are the customer's own questions from their own
 * confirmed profile, and the plan is free — so the operator gate here is not
 * protecting a payment, it is only protecting against volume. That is what the
 * caps are for. Anything that goes wrong leaves the request in the inbox as
 * ordinary work: the lead is already saved before this runs, and no failure
 * here is allowed to lose it.
 */
async function autoDispatchFreeRequest(input: {
	context: SelenaRepositoryContext;
	requestId: string;
	projectId: string;
	planId: (typeof orderRequestPlanIds)[number];
	promoApplied: boolean;
}): Promise<{ status: FreeAutoDispatchStatus; expectedRuns: number } | { status: null; reason: string }> {
	const config = freeAutoDispatchConfigFromEnv(process.env);
	// The flag and the promo are decided here. The two daily caps are decided
	// by the database in one claim, because they span every tenant: the runtime
	// role cannot count other tenants' rows under RLS, and a count followed by
	// a dispatch races with a concurrent request.
	const gate = decideFreeAutoDispatch({
		config,
		promoApplied: input.promoApplied,
		dispatchedToday: 0,
		dispatchedTodayForProject: 0,
	});
	// The flag being off is not an event, and a paid request is the desk's.
	if (!gate.dispatch) return { status: null, reason: gate.reason };

	const refuse = async (reason: string) => {
		// A cap refusal is a free measurement the customer expected and did not
		// get, so it is recorded. The request itself is already saved and stays
		// in the inbox as ordinary work.
		await withOrganizationTransaction(db, input.context.tenantId, async (tx) => {
			await tx.insert(svAuditEvents).values({
				organizationId: input.context.tenantId,
				actorId: input.context.actorId,
				event: "ORDER_REQUEST_AUTO_DISPATCH_REFUSED",
				subjectKind: "sv_order_requests",
				subjectId: input.requestId,
				details: { planId: input.planId, reason },
			});
		});
		return { status: null, reason } as const;
	};

	let claim: Awaited<ReturnType<typeof claimFreeAutoDispatch>>;
	try {
		claim = await withOrganizationTransaction(db, input.context.tenantId, (tx) =>
			claimFreeAutoDispatch(tx, {
				requestId: input.requestId,
				organizationId: input.context.tenantId,
				projectId: input.projectId,
				maxPerDay: config.maxPerDay,
				maxPerProjectPerDay: config.maxPerProjectPerDay,
			}),
		);
	} catch {
		// The claim lives in the database; a deployment whose migrations do not
		// yet carry it must refuse, not throw the lead away.
		return refuse("CLAIM_UNAVAILABLE");
	}
	if (claim !== "CLAIMED") return refuse(claim);

	const plan = SELENA_CATALOG[input.planId];
	const questionCap = (plan.questionLimitPerMeasurement ?? 25) * Math.max(1, plan.languageLimit);
	let reachedOrder = false;
	try {
		const { familyId } = await prepareSelenaScenarios(input.context, input.projectId);
		const proposed = (await repositories.scenarios.list(input.context, familyId))
			.filter((scenario) => scenario.status === "PROPOSED" || scenario.status === "APPROVED")
			.slice(0, questionCap);
		if (proposed.length === 0) throw new Error("SELENA_PROFILE_HAS_NO_QUESTIONS");
		const scenarioIds = proposed.map((scenario) => scenario.id);
		await withOrganizationTransaction(db, input.context.tenantId, async (tx) => {
			await tx
				.update(svScenarios)
				.set({ status: "APPROVED", updatedAt: new Date() })
				.where(and(inArray(svScenarios.id, scenarioIds), eq(svScenarios.organizationId, input.context.tenantId)));
		});

		reachedOrder = true;
		const started = await startSelenaMeasurement(input.context, {
			projectId: input.projectId,
			planId: input.planId,
			scenarioIds,
			idempotencyKey: `auto-request:${input.requestId}`,
		});
		await withOrganizationTransaction(db, input.context.tenantId, async (tx) => {
			await tx.insert(svAuditEvents).values({
				organizationId: input.context.tenantId,
				actorId: input.context.actorId,
				event: "ORDER_REQUEST_AUTO_DISPATCHED",
				subjectKind: "sv_order_requests",
				subjectId: input.requestId,
				details: {
					planId: input.planId,
					orderId: started.orderId,
					expectedRuns: started.expectedRuns,
					scenarioCount: scenarioIds.length,
					queued: started.queued,
					stoppedAt: started.stoppedAt,
				},
			});
		});
		return { status: "AUTO_QUEUED", expectedRuns: started.expectedRuns };
	} catch (cause) {
		// A failure before any order exists gives the slot back, so a corrected
		// profile can try again today. Once an order exists the slot stays
		// taken: that order is now the desk's to finish, and a second one would
		// be a second measurement.
		if (!reachedOrder) {
			await withOrganizationTransaction(db, input.context.tenantId, (tx) =>
				releaseFreeAutoDispatchClaim(tx, { requestId: input.requestId, organizationId: input.context.tenantId }),
			).catch(() => undefined);
		}
		await withOrganizationTransaction(db, input.context.tenantId, async (tx) => {
			await tx.insert(svAuditEvents).values({
				organizationId: input.context.tenantId,
				actorId: input.context.actorId,
				event: "ORDER_REQUEST_AUTO_DISPATCH_FAILED",
				subjectKind: "sv_order_requests",
				subjectId: input.requestId,
				details: { planId: input.planId, error: cause instanceof Error ? cause.message : String(cause) },
			});
		});
		return { status: "AUTO_FAILED", expectedRuns: 0 };
	}
}

export const createSelenaOrderRequestFn = createServerFn({ method: "POST" })
	.validator(createSchema)
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		const project = await repositories.projects.get(context, data.projectId);
		if (!project) throw new Error("Not found: project is outside AuthContext tenant");
		// Claiming the seat and saving the lead commit together: a seat consumed
		// by a request that was never stored would be a seat nobody can use again.
		const { row, promoApplied } = await withOrganizationTransaction(db, context.tenantId, async (tx) => {
			const seat = data.promoCode?.trim()
				? await redeemPilotInvite(tx, {
						code: data.promoCode,
						planId: data.planId,
						organizationId: context.tenantId,
						userId: context.actorId,
					})
				: null;
			const [inserted] = await tx
				.insert(svOrderRequests)
				.values({
					organizationId: context.tenantId,
					projectId: data.projectId,
					planId: data.planId,
					contactName: data.contactName,
					contactChannel: data.contactChannel,
					comment: data.comment || null,
					// The submitted code is never stored. Which seat was spent is
					// recorded on the invite itself, against this organization, so the
					// lead table cannot become a list of working codes.
					promoCode: null,
					promoApplied: seat !== null,
				})
				.returning({ id: svOrderRequests.id });
			return { row: inserted, promoApplied: seat !== null };
		});

		const auto = await autoDispatchFreeRequest({
			context,
			requestId: row.id,
			projectId: data.projectId,
			planId: data.planId,
			promoApplied,
		});
		if (auto.status)
			await withOrganizationTransaction(db, context.tenantId, async (tx) => {
				await tx
					.update(svOrderRequests)
					.set({ status: auto.status, updatedAt: new Date() })
					.where(and(eq(svOrderRequests.id, row.id), eq(svOrderRequests.organizationId, context.tenantId)));
			});
		return { id: row.id, promoApplied, autoStarted: auto.status === "AUTO_QUEUED" };
	});

export type OrderRequestRow = {
	id: string;
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

export const listSelenaOrderRequestsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<OrderRequestRow[]> => {
		await requireAdmin();
		const context = await resolveSessionAuthContext();
		const rows = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			tx
				.select({
					id: svOrderRequests.id,
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
				.where(eq(svOrderRequests.organizationId, context.tenantId))
				.orderBy(desc(svOrderRequests.createdAt)),
		);
		return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
	},
);

export const updateSelenaOrderRequestStatusFn = createServerFn({ method: "POST" })
	.validator(z.object({ requestId: z.string().uuid(), status: z.enum(["NEW", "IN_PROGRESS", "CLOSED"]) }))
	.handler(async ({ data }) => {
		await requireAdmin();
		const context = await resolveSessionAuthContext();
		const [row] = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			tx
				.update(svOrderRequests)
				.set({ status: data.status, updatedAt: new Date() })
				.where(and(eq(svOrderRequests.id, data.requestId), eq(svOrderRequests.organizationId, context.tenantId)))
				.returning({ id: svOrderRequests.id }),
		);
		if (!row) throw new Error("Not found: request is outside AuthContext tenant");
		return { id: row.id, status: data.status };
	});
