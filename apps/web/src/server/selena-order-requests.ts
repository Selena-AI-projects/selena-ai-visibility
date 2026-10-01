import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { organization, svAuditEvents, svOrderRequests, svProjects, svScenarios } from "@workspace/lib/db/schema";
import { claimFreeAutoDispatch, releaseFreeAutoDispatchClaim } from "@workspace/lib/selena-free-auto-dispatch-claims";
import { hashPilotInviteCode, redeemPilotInvite } from "@workspace/lib/selena-pilot-invites";
import { createSelenaRepositories, type SelenaRepositoryContext } from "@workspace/lib/selena-visibility-repositories";
import {
	decideFreeAutoDispatch,
	type FreeRequestLaunch,
	freeAutoDispatchConfigFromEnv,
	freeAutoDispatchStatusFor,
	freeRequestLaunch,
	pilotSeatRequestId,
	SELENA_CATALOG,
} from "@workspace/selena-visibility-contracts";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/helpers";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";
import { operatorScopeForRequest } from "./selena-operator-scope";
import {
	prepareSelenaScenarios,
	readMeasurementByKey,
	resumeSelenaMeasurement,
	startSelenaMeasurement,
} from "./selena-order-desk-core";

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

/** The idempotency key a free request's order is drafted, approved and queued under. */
function autoRequestKey(requestId: string): string {
	return `auto-request:${requestId}`;
}

async function recordRequestAudit(
	context: SelenaRepositoryContext,
	requestId: string,
	event: string,
	details: Record<string, unknown>,
) {
	await withOrganizationTransaction(db, context.tenantId, (tx) =>
		tx.insert(svAuditEvents).values({
			organizationId: context.tenantId,
			actorId: context.actorId,
			event,
			subjectKind: "sv_order_requests",
			subjectId: requestId,
			details,
		}),
	);
}

/** How long a dispatch may hold its request before another submission may take over. */
const DISPATCH_LEASE_SECONDS = 120;

/**
 * Only one submission of a request dispatches at a time. The lease is the
 * request's own status: a parallel submission finds it taken and reports the
 * launch as starting; a dispatch that died leaves a lease that expires.
 */
async function takeDispatchLease(context: SelenaRepositoryContext, requestId: string): Promise<boolean> {
	const rows = await withOrganizationTransaction(db, context.tenantId, (tx) =>
		tx
			.update(svOrderRequests)
			.set({ status: "AUTO_DISPATCHING", updatedAt: new Date() })
			.where(
				and(
					eq(svOrderRequests.id, requestId),
					eq(svOrderRequests.organizationId, context.tenantId),
					sql`(${svOrderRequests.status} <> 'AUTO_DISPATCHING' or ${svOrderRequests.updatedAt} < now() - make_interval(secs => ${DISPATCH_LEASE_SECONDS}))`,
				),
			)
			.returning({ id: svOrderRequests.id }),
	);
	return rows.length > 0;
}

async function settleRequestStatus(context: SelenaRepositoryContext, requestId: string, status: string) {
	await withOrganizationTransaction(db, context.tenantId, (tx) =>
		tx
			.update(svOrderRequests)
			.set({ status, updatedAt: new Date() })
			.where(and(eq(svOrderRequests.id, requestId), eq(svOrderRequests.organizationId, context.tenantId))),
	);
}

export type StartMeasurement = typeof startSelenaMeasurement;

/**
 * A free request can start itself, under caps and behind a default-off flag.
 *
 * The scenarios it approves are the customer's own questions from their own
 * confirmed profile, and the plan is free — so the operator gate here is not
 * protecting a payment, it is only protecting against volume. That is what the
 * caps are for. Anything that goes wrong leaves the request in the inbox as
 * ordinary work: the lead is already saved before this runs, and no failure
 * here is allowed to lose it.
 *
 * Every step is keyed by the request, so running this again resumes rather
 * than repeats: an existing order is approved and queued under the same keys,
 * never drafted twice. The answer is read back from the order, not inferred
 * from how far this call got.
 */
async function dispatchFreeRequest(
	input: {
		context: SelenaRepositoryContext;
		requestId: string;
		projectId: string;
		planId: (typeof orderRequestPlanIds)[number];
	},
	start: StartMeasurement,
): Promise<FreeRequestLaunch> {
	const { context, requestId } = input;
	const config = freeAutoDispatchConfigFromEnv(process.env);
	// The flag and the promo are decided here. The two daily caps are decided
	// by the database in one claim, because they span every tenant: the runtime
	// role cannot count other tenants' rows under RLS, and a count followed by
	// a dispatch races with a concurrent request.
	const gate = decideFreeAutoDispatch({ config, promoApplied: true, dispatchedToday: 0, dispatchedTodayForProject: 0 });
	if (!gate.dispatch) return { state: "NOT_STARTED", reason: gate.reason };

	if (!(await takeDispatchLease(context, requestId))) {
		const order = await readMeasurementByKey(context, autoRequestKey(requestId));
		return order
			? freeRequestLaunch({ orderStatus: order.status, runsQueued: order.runsQueued })
			: { state: "STARTING" };
	}

	const existing = await readMeasurementByKey(context, autoRequestKey(requestId));
	if (!existing) {
		let claim: Awaited<ReturnType<typeof claimFreeAutoDispatch>> | "CLAIM_UNAVAILABLE";
		try {
			claim = await withOrganizationTransaction(db, context.tenantId, (tx) =>
				claimFreeAutoDispatch(tx, {
					requestId,
					organizationId: context.tenantId,
					projectId: input.projectId,
					maxPerDay: config.maxPerDay,
					maxPerProjectPerDay: config.maxPerProjectPerDay,
				}),
			);
		} catch {
			// The claim lives in the database; a deployment whose migrations do not
			// yet carry it must refuse, not throw the lead away.
			claim = "CLAIM_UNAVAILABLE";
		}
		if (claim !== "CLAIMED") {
			// A cap refusal is a free measurement the customer expected and did not
			// get, so it is recorded. The seat stays with this workspace and the
			// request keeps its id, so the same code works again tomorrow.
			await recordRequestAudit(context, requestId, "ORDER_REQUEST_AUTO_DISPATCH_REFUSED", {
				planId: input.planId,
				reason: claim,
			});
			return { state: "NOT_STARTED", reason: claim };
		}
	}

	let failure: string | null = null;
	try {
		if (!existing) {
			const plan = SELENA_CATALOG[input.planId];
			const questionCap = (plan.questionLimitPerMeasurement ?? 25) * Math.max(1, plan.languageLimit);
			const { familyId } = await prepareSelenaScenarios(context, input.projectId);
			const proposed = (await repositories.scenarios.list(context, familyId))
				.filter((scenario) => scenario.status === "PROPOSED" || scenario.status === "APPROVED")
				.slice(0, questionCap);
			if (proposed.length === 0) throw new Error("SELENA_PROFILE_HAS_NO_QUESTIONS");
			const scenarioIds = proposed.map((scenario) => scenario.id);
			await withOrganizationTransaction(db, context.tenantId, async (tx) => {
				await tx
					.update(svScenarios)
					.set({ status: "APPROVED", updatedAt: new Date() })
					.where(and(inArray(svScenarios.id, scenarioIds), eq(svScenarios.organizationId, context.tenantId)));
			});
			await start(context, {
				projectId: input.projectId,
				planId: input.planId,
				scenarioIds,
				idempotencyKey: autoRequestKey(requestId),
				settlement: "pilot_seat",
			});
		} else {
			await resumeSelenaMeasurement(context, existing, autoRequestKey(requestId));
		}
	} catch (cause) {
		failure = cause instanceof Error ? cause.message : String(cause);
	}

	const order = await readMeasurementByKey(context, autoRequestKey(requestId));
	if (!order) {
		// Nothing was drafted, so the slot goes back: the customer can correct
		// the profile and send the same code again today.
		await withOrganizationTransaction(db, context.tenantId, (tx) =>
			releaseFreeAutoDispatchClaim(tx, { requestId, organizationId: context.tenantId }),
		).catch(() => undefined);
	}
	const launch = order
		? freeRequestLaunch({ orderStatus: order.status, runsQueued: order.runsQueued })
		: freeRequestLaunch({ orderStatus: null, runsQueued: false, notStartedReason: failure ?? "NO_ORDER" });
	await recordRequestAudit(
		context,
		requestId,
		failure ? "ORDER_REQUEST_AUTO_DISPATCH_FAILED" : "ORDER_REQUEST_AUTO_DISPATCHED",
		{
			planId: input.planId,
			orderId: order?.orderId ?? null,
			orderStatus: order?.status ?? null,
			launch: launch.state,
			resumed: existing !== null,
			error: failure,
		},
	);
	return launch;
}

export type OrderRequestOutcome = {
	id: string;
	promoApplied: boolean;
	/** The code was already spent by this workspace on another project or plan. */
	seatHeldElsewhere: boolean;
	/** For a free request: what actually happened to the measurement. */
	launch: FreeRequestLaunch | null;
};

/**
 * Saves a plan request and, when a pilot seat makes it free, starts it.
 *
 * A seat's request id is derived from the workspace and the code, so every
 * submission of one code is one request: the seat is redeemed once and kept
 * by this workspace, the dispatch slot is held by that request, and the order
 * is keyed by it. Resubmitting after any failure therefore resumes the same
 * request instead of spending the code, the slot or a second order.
 */
export async function submitSelenaOrderRequest(
	context: SelenaRepositoryContext,
	data: z.infer<typeof createSchema>,
	start: StartMeasurement = startSelenaMeasurement,
): Promise<OrderRequestOutcome> {
	const project = await repositories.projects.get(context, data.projectId);
	if (!project) throw new Error("Not found: project is outside AuthContext tenant");
	const code = data.promoCode?.trim() ?? "";
	const columns = { id: svOrderRequests.id, projectId: svOrderRequests.projectId, planId: svOrderRequests.planId };
	const lead = {
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
	};
	// Claiming the seat and saving the lead commit together: a seat consumed
	// by a request that was never stored would be a seat nobody can use again.
	const saved = await withOrganizationTransaction(db, context.tenantId, async (tx) => {
		if (code) {
			const seatRequestId = pilotSeatRequestId(context.tenantId, hashPilotInviteCode(code));
			const findSeatRequest = async () =>
				(
					await tx
						.select(columns)
						.from(svOrderRequests)
						.where(and(eq(svOrderRequests.id, seatRequestId), eq(svOrderRequests.organizationId, context.tenantId)))
						.limit(1)
				)[0];
			const held = await findSeatRequest();
			if (held) return { row: held, promoApplied: true };
			const seat = await redeemPilotInvite(tx, {
				code,
				planId: data.planId,
				organizationId: context.tenantId,
				userId: context.actorId,
			});
			if (seat) {
				const [inserted] = await tx
					.insert(svOrderRequests)
					.values({ ...lead, id: seatRequestId, promoApplied: true })
					.onConflictDoNothing({ target: svOrderRequests.id })
					.returning(columns);
				// A parallel submission of the same code stored the request first.
				const row = inserted ?? (await findSeatRequest());
				if (!row) throw new Error("SELENA_ORDER_REQUEST_WRITE_FAILED");
				return { row, promoApplied: true };
			}
		}
		const [inserted] = await tx
			.insert(svOrderRequests)
			.values({ ...lead, promoApplied: false })
			.returning(columns);
		return { row: inserted, promoApplied: false };
	});
	const { row, promoApplied } = saved;
	if (!promoApplied) return { id: row.id, promoApplied, seatHeldElsewhere: false, launch: null };

	if (row.projectId !== data.projectId || row.planId !== data.planId) {
		const order = await readMeasurementByKey(context, autoRequestKey(row.id));
		return {
			id: row.id,
			promoApplied,
			seatHeldElsewhere: true,
			launch: order
				? freeRequestLaunch({ orderStatus: order.status, runsQueued: order.runsQueued })
				: { state: "NOT_STARTED", reason: "SEAT_HELD_BY_ANOTHER_REQUEST" },
		};
	}

	const launch = await dispatchFreeRequest(
		{ context, requestId: row.id, projectId: data.projectId, planId: data.planId },
		start,
	);
	if (launch.state !== "STARTING") await settleRequestStatus(context, row.id, freeAutoDispatchStatusFor(launch));
	return { id: row.id, promoApplied, seatHeldElsewhere: false, launch };
}

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
