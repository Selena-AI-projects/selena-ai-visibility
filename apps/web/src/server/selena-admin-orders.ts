import { createServerFn } from "@tanstack/react-start";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import {
	organization,
	svAuditEvents,
	svConfigurationLocks,
	svCostEvents,
	svCycles,
	svOrderRequests,
	svOrders,
	svPayments,
	svProjects,
	svQcRecords,
	svQuotes,
	svRunPermits,
	svRuns,
} from "@workspace/lib/db/schema";
import { isMaintenanceEnabled } from "@workspace/lib/run-policy/controlled-cycle";
import { qcDecisions } from "@workspace/lib/selena-dispatch";
import { assertApprovable, evaluatePreflight, type PreflightEvaluation } from "@workspace/lib/selena-preflight";
import { createSelenaRepositories, type SelenaRepositoryContext } from "@workspace/lib/selena-visibility-repositories";
import {
	measurementConfigFromEnv,
	parseMeasurementScope,
	worstCaseOrderCostUsd,
} from "@workspace/selena-visibility-contracts";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { isAdmin, requireAdmin, requireAuthSession } from "@/lib/auth/helpers";
import { getBoss } from "@/lib/boss-client";
import { enqueueOrderRuns } from "@/lib/selena-run-enqueue";
import { operatorScopeForOrder } from "./selena-operator-scope";

// Operator surface for the order pipeline: read the preflight, approve (which
// mints run permits and nothing else), enqueue those permits, stop, and record
// a QC decision. No provider is ever contacted here: approval is a permission
// record, enqueueing is a queue write, and the executor that consumes a permit
// lives in the worker. Approval and enqueue stay separate actions so minting
// permission never starts spending on its own.

let repositoriesPromise: ReturnType<typeof buildRepositories> | undefined;
const buildRepositories = async () => createSelenaRepositories(await database());
const getRepositories = () => (repositoriesPromise ??= buildRepositories());

/** Statuses an operator is expected to act on, newest work first. */
export const adminQueueStatuses = [
	"PAID_REVIEW_REQUIRED",
	"APPROVED",
	"QUEUED",
	"RUNNING",
	"QC_REQUIRED",
	"READY",
] as const;

/**
 * The database handle, fetched when a call actually needs it. A static import
 * here reaches the browser: this module exports plain helpers (not just server
 * functions), so the client build keeps it, and the edge to the handle dragged
 * the Postgres driver into the browser bundle.
 */
const database = async () => (await import("@workspace/lib/db/db")).db;

const orderIdSchema = z.object({ orderId: z.string().uuid() });

async function recordAdminAudit(
	context: SelenaRepositoryContext,
	event: string,
	orderId: string,
	details: Record<string, unknown>,
) {
	await withOrganizationTransaction(await database(), context.tenantId, async (tx) => {
		await tx.insert(svAuditEvents).values({
			organizationId: context.tenantId,
			actorId: context.actorId,
			event,
			subjectKind: "sv_orders",
			subjectId: orderId,
			details,
		});
	});
}

async function findPriorAudit(context: SelenaRepositoryContext, event: string, orderId: string, key: string) {
	const [prior] = await withOrganizationTransaction(await database(), context.tenantId, (tx) =>
		tx
			.select({ details: svAuditEvents.details, at: svAuditEvents.at })
			.from(svAuditEvents)
			.where(
				and(
					eq(svAuditEvents.organizationId, context.tenantId),
					eq(svAuditEvents.event, event),
					eq(svAuditEvents.subjectId, orderId),
					sql`${svAuditEvents.details} ->> 'idempotencyKey' = ${key}`,
				),
			)
			.limit(1),
	);
	return prior ?? null;
}

async function getOwnedOrder(context: SelenaRepositoryContext, orderId: string) {
	const [order] = await withOrganizationTransaction(await database(), context.tenantId, (tx) =>
		tx
			.select()
			.from(svOrders)
			.where(and(eq(svOrders.id, orderId), eq(svOrders.organizationId, context.tenantId)))
			.limit(1),
	);
	if (!order) throw new Error("Not found: order is outside AuthContext tenant");
	return order;
}

/**
 * The provider budget is an owner-set ceiling, not a balance read from any
 * provider: nothing in this layer may talk to one. Unset means zero, which
 * preflight reports as a blocker instead of guessing that money is available.
 */
function providerBudgetRemaining(): number {
	const configured = Number(process.env.SELENA_PROVIDER_BUDGET_USD ?? 0);
	return Number.isFinite(configured) && configured > 0 ? configured : 0;
}

export async function collectPreflight(
	context: SelenaRepositoryContext,
	orderId: string,
): Promise<PreflightEvaluation> {
	const order = await getOwnedOrder(context, orderId);
	const { lock, quote, permitCount, jobCount, payment } = await withOrganizationTransaction(
		await database(),
		context.tenantId,
		async (tx) => {
			const [[lock], [quote], cycles] = await Promise.all([
				tx
					.select()
					.from(svConfigurationLocks)
					.where(
						and(eq(svConfigurationLocks.id, order.lockId), eq(svConfigurationLocks.organizationId, context.tenantId)),
					)
					.limit(1),
				tx
					.select({ currency: svQuotes.currency })
					.from(svQuotes)
					.where(and(eq(svQuotes.id, order.quoteId), eq(svQuotes.organizationId, context.tenantId)))
					.limit(1),
				tx
					.select({ id: svCycles.id })
					.from(svCycles)
					.where(and(eq(svCycles.orderId, orderId), eq(svCycles.organizationId, context.tenantId))),
			]);
			const cycleIds = cycles.map((cycle) => cycle.id);
			const [permitCount, jobCount, payment] = await Promise.all([
				cycleIds.length === 0
					? Promise.resolve([{ count: 0 }])
					: tx
							.select({ count: sql<number>`count(*)::int` })
							.from(svRunPermits)
							.where(
								and(
									inArray(svRunPermits.cycleId, cycleIds),
									eq(svRunPermits.organizationId, context.tenantId),
									isNull(svRunPermits.consumedAt),
								),
							),
				cycleIds.length === 0
					? Promise.resolve([{ count: 0 }])
					: tx
							.select({ count: sql<number>`count(*)::int` })
							.from(svRuns)
							.where(
								and(
									inArray(svRuns.cycleId, cycleIds),
									eq(svRuns.organizationId, context.tenantId),
									isNull(svRuns.finishedAt),
								),
							),
				tx
					.select({ id: svPayments.id })
					.from(svPayments)
					.where(
						and(
							eq(svPayments.orderId, orderId),
							eq(svPayments.organizationId, context.tenantId),
							eq(svPayments.status, "SUCCEEDED"),
						),
					)
					.limit(1),
			]);
			return { lock, quote, permitCount, jobCount, payment };
		},
	);
	// A snapshot whose scope block is corrupt throws; for preflight that is a
	// missing scope, reported as a blocker rather than a crashed panel.
	let scope: ReturnType<typeof parseMeasurementScope> = null;
	if (lock) {
		try {
			scope = parseMeasurementScope(lock.snapshot);
		} catch {
			scope = null;
		}
	}
	return evaluatePreflight({
		orderId,
		orderStatus: order.status,
		lockPresent: Boolean(lock),
		scope,
		lockExpectedRuns: lock?.expectedRuns ?? 0,
		activePermits: permitCount[0]?.count ?? 0,
		activeJobs: jobCount[0]?.count ?? 0,
		maintenanceActive: isMaintenanceEnabled(process.env.SCHEDULE_MAINTENANCE_ENABLED),
		providerBudgetRemaining: providerBudgetRemaining(),
		orderCap: Number(order.orderCap),
		// What the worker can reserve for this many answers, not the plan's cap:
		// the cap is the order cap below, and comparing it with itself proved
		// nothing, and refused every order whenever the owner's per-order
		// ceiling sat below the plan's cap.
		worstCaseCost: lock ? worstCaseOrderCostUsd(lock.expectedRuns) : Number.NaN,
		paymentRecorded: Boolean(payment[0]),
		currency: quote?.currency,
	});
}

/** Lets the route answer a non-admin with the same 404 the rest of /admin gives. */
export const getSelenaAdminAccessFn = createServerFn({ method: "GET" }).handler(async () => {
	const session = await requireAuthSession();
	return { isAdmin: isAdmin(session) };
});

export const getSelenaAdminOrderQueueFn = createServerFn({ method: "GET" }).handler(async () => {
	await requireAdmin();
	// The operator desk spans every tenant: list orders across organizations on
	// the operator connection requireAdmin() entered, then enrich each one scoped
	// to its own organization so tenant-forced tables stay readable. The owning
	// organization travels with each row. This is read-only — the mutating desk
	// actions keep the caller's own tenant and refuse another organization's order.
	const db = await database();
	const orders = await db
		.select({
			id: svOrders.id,
			organizationId: svOrders.organizationId,
			status: svOrders.status,
			orderCap: svOrders.orderCap,
			paidAt: svOrders.paidAt,
			createdAt: svOrders.createdAt,
			updatedAt: svOrders.updatedAt,
			projectId: svOrders.projectId,
			projectName: svProjects.name,
			organizationName: organization.name,
			currency: svQuotes.currency,
			lockId: svOrders.lockId,
		})
		.from(svOrders)
		.innerJoin(svProjects, eq(svOrders.projectId, svProjects.id))
		.innerJoin(svQuotes, eq(svOrders.quoteId, svQuotes.id))
		.innerJoin(organization, eq(svOrders.organizationId, organization.id))
		.where(inArray(svOrders.status, [...adminQueueStatuses]))
		.orderBy(desc(svOrders.updatedAt));
	return Promise.all(
		orders.map(async (order) => {
			const organizationId = order.organizationId;
			const [lock, cycles, qc] = await withOrganizationTransaction(db, organizationId, (tx) =>
				Promise.all([
					tx
						.select({
							version: svConfigurationLocks.version,
							expectedRuns: svConfigurationLocks.expectedRuns,
							budgetCap: svConfigurationLocks.budgetCap,
						})
						.from(svConfigurationLocks)
						.where(
							and(eq(svConfigurationLocks.id, order.lockId), eq(svConfigurationLocks.organizationId, organizationId)),
						)
						.limit(1),
					tx
						.select({
							id: svCycles.id,
							status: svCycles.status,
							expectedRuns: svCycles.expectedRuns,
							createdRuns: svCycles.createdRuns,
							completedRuns: svCycles.completedRuns,
							// A completed run may have FAILED or come back INVALID; only the
							// successful ones tell the operator whether the cycle measured anything.
							// Written out in full: column references inside a select-list
							// template are not table-qualified, and an unqualified
							// "cycle_id" = "id" would compare the run with itself.
							succeededRuns: sql<number>`(
								select count(*)::int from sv_runs as succeeded_runs
								where succeeded_runs.cycle_id = sv_cycles.id
									and succeeded_runs.organization_id = sv_cycles.organization_id
									and succeeded_runs.status = 'SUCCEEDED'
							)`,
						})
						.from(svCycles)
						.where(and(eq(svCycles.orderId, order.id), eq(svCycles.organizationId, organizationId)))
						.orderBy(desc(svCycles.createdAt)),
					tx
						.select({
							id: svQcRecords.id,
							reviewer: svQcRecords.reviewer,
							decision: svQcRecords.decision,
							scope: svQcRecords.scope,
							notes: svQcRecords.notes,
							reviewedAt: svQcRecords.reviewedAt,
						})
						.from(svQcRecords)
						.where(and(eq(svQcRecords.orderId, order.id), eq(svQcRecords.organizationId, organizationId)))
						.orderBy(desc(svQcRecords.createdAt))
						.limit(1),
				]),
			);
			// What the providers charged (or were estimated to charge) for this
			// order, from the spend ledger: the operator's number, never the
			// client's, whose allowance counts answers rather than dollars.
			const [spend] = await withOrganizationTransaction(db, organizationId, (tx) =>
				tx
					.select({
						totalUsd: sql<number>`coalesce(sum(${svCostEvents.amountUsd}), 0)::float8`,
						estimatedEvents: sql<number>`count(*) filter (where ${svCostEvents.basis} <> 'actual')::int`,
						events: sql<number>`count(*)::int`,
					})
					.from(svCostEvents)
					.innerJoin(svCycles, eq(svCostEvents.cycleId, svCycles.id))
					.where(and(eq(svCycles.orderId, order.id), eq(svCostEvents.organizationId, organizationId))),
			);
			return {
				id: order.id,
				organizationId,
				status: order.status,
				orderCap: order.orderCap,
				paidAt: order.paidAt,
				createdAt: order.createdAt,
				updatedAt: order.updatedAt,
				projectId: order.projectId,
				projectName: order.projectName,
				organizationName: order.organizationName,
				currency: order.currency,
				lockVersion: lock[0]?.version ?? null,
				lockExpectedRuns: lock[0]?.expectedRuns ?? null,
				lockBudgetCap: lock[0]?.budgetCap ?? null,
				cycles,
				latestQc: qc[0] ?? null,
				providerSpend: {
					totalUsd: Number(spend?.totalUsd ?? 0),
					events: Number(spend?.events ?? 0),
					estimatedEvents: Number(spend?.estimatedEvents ?? 0),
				},
			};
		}),
	);
});

export const getSelenaOrderPreflightFn = createServerFn({ method: "GET" })
	.validator(orderIdSchema)
	.handler(async ({ data }) => {
		return collectPreflight(await operatorScopeForOrder(data.orderId, "preflight"), data.orderId);
	});

/**
 * Approval as a plain call: minting permits is the same act whether one
 * button or a combined one asks for it, so both paths run this and cannot
 * drift apart on a gate.
 */
export async function approveOrder(context: SelenaRepositoryContext, orderId: string, idempotencyKey?: string) {
	if (idempotencyKey) {
		const prior = await findPriorAudit(context, "ORDER_APPROVED", orderId, idempotencyKey);
		if (prior) {
			const order = await getOwnedOrder(context, orderId);
			const details = prior.details as Record<string, unknown>;
			return {
				orderId: orderId,
				status: order.status,
				cycleId: (details.cycleId as string | undefined) ?? null,
				created: (details.created as number | undefined) ?? 0,
				expected: (details.expected as number | undefined) ?? 0,
				replay: true,
			};
		}
	}
	const preflight = await collectPreflight(context, orderId);
	// Approval never runs past a blocker: the same evaluation the operator
	// saw is recomputed here and decides.
	assertApprovable(preflight);
	// The status change, the permits it authorizes and the record of the
	// decision commit together: an approval stored without its audit row is a
	// decision nobody can prove was taken, and permits without the approval
	// are permission nobody gave.
	const dispatch = await (await getRepositories()).dispatch.createPermits(context, orderId, {
		approval: {
			fromStatus: "PAID_REVIEW_REQUIRED",
			auditEvent: "ORDER_APPROVED",
			auditDetails: { idempotencyKey: idempotencyKey ?? null },
		},
	});
	const order = await getOwnedOrder(context, orderId);
	return {
		orderId: orderId,
		status: order.status,
		cycleId: dispatch.cycleId,
		created: dispatch.created,
		expected: dispatch.expected,
		replay: false,
	};
}

/** Handing minted permits to the worker; see approveOrder on why it is shared. */
export async function enqueueOrderRunsForOrder(
	context: SelenaRepositoryContext,
	orderId: string,
	idempotencyKey?: string,
) {
	if (idempotencyKey) {
		const prior = await findPriorAudit(context, "RUNS_ENQUEUED", orderId, idempotencyKey);
		if (prior) {
			const details = prior.details as Record<string, unknown>;
			return {
				orderId: orderId,
				enqueued: (details.enqueued as number | undefined) ?? 0,
				skipped: (details.skipped as number | undefined) ?? 0,
				duplicates: (details.duplicates as number | undefined) ?? 0,
				reason: null,
				replay: true,
			};
		}
	}
	const order = await getOwnedOrder(context, orderId);
	// QUEUED is the state approval leaves an order in: permits exist and none
	// of them has been handed to the queue yet.
	if (order.status !== "QUEUED") throw new Error("SELENA_ORDER_NOT_QUEUED");
	const permits = await (await getRepositories()).dispatch.listPermits(context, orderId);
	const config = measurementConfigFromEnv(process.env);
	const result = await enqueueOrderRuns({
		permits,
		config,
		organizationId: context.tenantId,
		actorId: context.actorId,
		now: new Date(),
		send: async (payload, options) => {
			const boss = await getBoss();
			return boss.send("selena-measure", payload, { singletonKey: options.singletonKey });
		},
	});
	await recordAdminAudit(context, "RUNS_ENQUEUED", orderId, {
		orderId: orderId,
		enqueued: result.enqueued,
		skipped: result.skipped,
		duplicates: result.duplicates,
		reason: result.reason,
		// A refused enqueue is deliberately not replayable: once the owner
		// turns execution on, the same key must still be able to queue the run.
		idempotencyKey: result.reason === null ? (idempotencyKey ?? null) : null,
	});
	return { orderId: orderId, ...result, replay: false };
}

export const approveSelenaOrderFn = createServerFn({ method: "POST" })
	.validator(orderIdSchema.extend({ idempotencyKey: z.string().min(1).max(200).optional() }))
	.handler(async ({ data }) =>
		approveOrder(await operatorScopeForOrder(data.orderId, "approve"), data.orderId, data.idempotencyKey),
	);

export const enqueueSelenaOrderRunsFn = createServerFn({ method: "POST" })
	.validator(orderIdSchema.extend({ idempotencyKey: z.string().min(1).max(200).optional() }))
	.handler(async ({ data }) =>
		enqueueOrderRunsForOrder(await operatorScopeForOrder(data.orderId, "enqueue"), data.orderId, data.idempotencyKey),
	);

export const stopSelenaOrderFn = createServerFn({ method: "POST" })
	.validator(
		orderIdSchema.extend({
			reason: z.string().trim().max(500).optional(),
			idempotencyKey: z.string().min(1).max(200).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const context = await operatorScopeForOrder(data.orderId, "stop");
		const order = await getOwnedOrder(context, data.orderId);
		if (data.idempotencyKey) {
			const prior = await findPriorAudit(context, "ORDER_STOPPED", data.orderId, data.idempotencyKey);
			if (prior) return { orderId: data.orderId, status: order.status, stoppedCycles: 0, replay: true };
		}
		// The order status enum has no STOPPED member; a stopped order is a
		// cancelled one, while the cycle it owns carries the STOPPED state.
		if (order.status === "CANCELLED")
			return { orderId: data.orderId, status: order.status, stoppedCycles: 0, replay: true };
		const stopped = await withOrganizationTransaction(await database(), context.tenantId, async (tx) => {
			await tx
				.update(svOrders)
				.set({ status: "CANCELLED", updatedAt: new Date() })
				.where(and(eq(svOrders.id, data.orderId), eq(svOrders.organizationId, context.tenantId)));
			const stopped = await tx
				.update(svCycles)
				.set({ status: "STOPPED", updatedAt: new Date() })
				.where(
					and(
						eq(svCycles.orderId, data.orderId),
						eq(svCycles.organizationId, context.tenantId),
						inArray(svCycles.status, ["CREATED", "APPROVED", "QUEUED", "RUNNING", "ANALYZING", "QC_REQUIRED"]),
					),
				)
				.returning({ id: svCycles.id });
			await tx.insert(svAuditEvents).values({
				organizationId: context.tenantId,
				actorId: context.actorId,
				event: "ORDER_STOPPED",
				subjectKind: "sv_orders",
				subjectId: data.orderId,
				details: {
					previousStatus: order.status,
					stoppedCycles: stopped.length,
					reason: data.reason ?? null,
					idempotencyKey: data.idempotencyKey ?? null,
				},
			});
			return stopped;
		});
		return { orderId: data.orderId, status: "CANCELLED" as const, stoppedCycles: stopped.length, replay: false };
	});

/**
 * Hands a published order to the client. Separate from QC on purpose: the
 * reviewer decides whether the work is sound, and releasing it is a second,
 * recorded action that refuses to run without their approval.
 */
export const deliverSelenaOrderFn = createServerFn({ method: "POST" })
	.validator(orderIdSchema)
	.handler(async ({ data }) => {
		const context = await operatorScopeForOrder(data.orderId, "deliver");
		const delivered = await (await getRepositories()).orders.deliver(context, data.orderId);
		return { orderId: data.orderId, status: delivered.status };
	});

export const recordSelenaQcFn = createServerFn({ method: "POST" })
	.validator(
		orderIdSchema.extend({
			cycleId: z.string().uuid().optional(),
			reviewer: z.string().trim().min(1).max(200).optional(),
			reviewedAt: z.string().datetime().optional(),
			scope: z.string().trim().min(1).max(500),
			decision: z.enum(qcDecisions),
			notes: z.string().trim().max(2000).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const context = await operatorScopeForOrder(data.orderId, "qc");
		const record = await (await getRepositories()).qcRecords.create(context, {
			orderId: data.orderId,
			cycleId: data.cycleId ?? null,
			reviewer: data.reviewer,
			reviewedAt: data.reviewedAt ?? new Date(),
			scope: data.scope,
			decision: data.decision,
			notes: data.notes ?? null,
		});
		// The client is told the operator will be in touch about a new
		// measurement; the request that started the order goes back to the
		// inbox as that follow-up.
		if (data.decision === "rejected") await reopenRequestForOrder(context, data.orderId);
		return record;
	});

/** The free request whose dispatch drafted this order, marked for the operator's follow-up. */
async function reopenRequestForOrder(context: SelenaRepositoryContext, orderId: string) {
	await withOrganizationTransaction(await database(), context.tenantId, async (tx) => {
		const [payment] = await tx
			.select({ key: svPayments.providerEventId })
			.from(svPayments)
			.where(and(eq(svPayments.orderId, orderId), eq(svPayments.organizationId, context.tenantId)))
			.limit(1);
		const requestId = payment?.key.match(/^auto-request:([0-9a-f-]{36})$/)?.[1];
		if (!requestId) return;
		await tx
			.update(svOrderRequests)
			.set({ status: "QC_REJECTED", updatedAt: new Date() })
			.where(and(eq(svOrderRequests.id, requestId), eq(svOrderRequests.organizationId, context.tenantId)));
	});
}
