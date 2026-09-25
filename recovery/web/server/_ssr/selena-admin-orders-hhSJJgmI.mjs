import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { ht as measurementConfigFromEnv, wt as parseMeasurementScope } from "./src-BdeAuGX5.mjs";
import { L as sql, d as and, f as eq, g as inArray, u as desc, v as isNull } from "../_libs/drizzle-orm.mjs";
import { Q as svPayments, S as svConfigurationLocks, Z as svOrders, it as svQuotes, mt as svRuns, pt as svRunPermits, rt as svQcRecords, tt as svProjects, v as svAuditEvents, w as svCycles } from "./schema-ejW7s7Gs.mjs";
import { r as getBoss } from "./boss-client-DOgR2WZg.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, i as isAdmin, s as requireAdmin } from "./helpers-phr0Aqka.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { i as isMaintenanceEnabled, r as createSelenaRepositories, s as qcDecisions } from "./selena-visibility-repositories-DjKDsg4F.mjs";
import { n as enqueueOrderRuns, r as evaluatePreflight, t as assertApprovable } from "./selena-run-enqueue-BbOx1Wk2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-admin-orders-hhSJJgmI.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "dba9882c-238a-49c6-ac71-84327037b694", e._sentryDebugIdIdentifier = "sentry-dbid-dba9882c-238a-49c6-ac71-84327037b694");
	} catch (e) {}
})();
var repositoriesPromise;
var buildRepositories = async () => createSelenaRepositories(await database());
var getRepositories = () => repositoriesPromise ??= buildRepositories();
/** Statuses an operator is expected to act on, newest work first. */
var adminQueueStatuses = [
	"PAID_REVIEW_REQUIRED",
	"APPROVED",
	"QUEUED",
	"RUNNING",
	"QC_REQUIRED",
	"READY"
];
/**
* The database handle, fetched when a call actually needs it. A static import
* here reaches the browser: this module exports plain helpers (not just server
* functions), so the client build keeps it, and the edge to the handle dragged
* the Postgres driver into the browser bundle.
*/
var database = async () => (await import("./db-DcHqq7B9.mjs").then((n) => n.n).then((n) => n.n)).db;
var orderIdSchema = object({ orderId: string().uuid() });
async function requireAdminContext() {
	await requireAdmin();
	return resolveSessionAuthContext();
}
async function recordAdminAudit(context, event, orderId, details) {
	await withOrganizationTransaction(await database(), context.tenantId, async (tx) => {
		await tx.insert(svAuditEvents).values({
			organizationId: context.tenantId,
			actorId: context.actorId,
			event,
			subjectKind: "sv_orders",
			subjectId: orderId,
			details
		});
	});
}
async function findPriorAudit(context, event, orderId, key) {
	const [prior] = await withOrganizationTransaction(await database(), context.tenantId, (tx) => tx.select({
		details: svAuditEvents.details,
		at: svAuditEvents.at
	}).from(svAuditEvents).where(and(eq(svAuditEvents.organizationId, context.tenantId), eq(svAuditEvents.event, event), eq(svAuditEvents.subjectId, orderId), sql`${svAuditEvents.details} ->> 'idempotencyKey' = ${key}`)).limit(1));
	return prior ?? null;
}
async function getOwnedOrder(context, orderId) {
	const [order] = await withOrganizationTransaction(await database(), context.tenantId, (tx) => tx.select().from(svOrders).where(and(eq(svOrders.id, orderId), eq(svOrders.organizationId, context.tenantId))).limit(1));
	if (!order) throw new Error("Not found: order is outside AuthContext tenant");
	return order;
}
/**
* The provider budget is an owner-set ceiling, not a balance read from any
* provider: nothing in this layer may talk to one. Unset means zero, which
* preflight reports as a blocker instead of guessing that money is available.
*/
function providerBudgetRemaining() {
	const configured = Number(process.env.SELENA_PROVIDER_BUDGET_USD ?? 0);
	return Number.isFinite(configured) && configured > 0 ? configured : 0;
}
async function collectPreflight(context, orderId) {
	const order = await getOwnedOrder(context, orderId);
	const { lock, quote, permitCount, jobCount, payment } = await withOrganizationTransaction(await database(), context.tenantId, async (tx) => {
		const [[lock], [quote], cycles] = await Promise.all([
			tx.select().from(svConfigurationLocks).where(and(eq(svConfigurationLocks.id, order.lockId), eq(svConfigurationLocks.organizationId, context.tenantId))).limit(1),
			tx.select({ currency: svQuotes.currency }).from(svQuotes).where(and(eq(svQuotes.id, order.quoteId), eq(svQuotes.organizationId, context.tenantId))).limit(1),
			tx.select({ id: svCycles.id }).from(svCycles).where(and(eq(svCycles.orderId, orderId), eq(svCycles.organizationId, context.tenantId)))
		]);
		const cycleIds = cycles.map((cycle) => cycle.id);
		const [permitCount, jobCount, payment] = await Promise.all([
			cycleIds.length === 0 ? Promise.resolve([{ count: 0 }]) : tx.select({ count: sql`count(*)::int` }).from(svRunPermits).where(and(inArray(svRunPermits.cycleId, cycleIds), eq(svRunPermits.organizationId, context.tenantId), isNull(svRunPermits.consumedAt))),
			cycleIds.length === 0 ? Promise.resolve([{ count: 0 }]) : tx.select({ count: sql`count(*)::int` }).from(svRuns).where(and(inArray(svRuns.cycleId, cycleIds), eq(svRuns.organizationId, context.tenantId), isNull(svRuns.finishedAt))),
			tx.select({ id: svPayments.id }).from(svPayments).where(and(eq(svPayments.orderId, orderId), eq(svPayments.organizationId, context.tenantId), eq(svPayments.status, "SUCCEEDED"))).limit(1)
		]);
		return {
			lock,
			quote,
			permitCount,
			jobCount,
			payment
		};
	});
	let scope = null;
	if (lock) try {
		scope = parseMeasurementScope(lock.snapshot);
	} catch {
		scope = null;
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
		worstCaseCost: Number(lock?.budgetCap ?? NaN),
		paymentRecorded: Boolean(payment[0]),
		currency: quote?.currency
	});
}
var getSelenaAdminAccessFn_createServerFn_handler = createServerRpc({
	id: "28b358e4d37662b8236e914f77857c34df88e1346295a4cfcbca129bd476bb48",
	name: "getSelenaAdminAccessFn",
	filename: "src/server/selena-admin-orders.ts"
}, (opts) => getSelenaAdminAccessFn.__executeServer(opts));
var getSelenaAdminAccessFn = createServerFn({ method: "GET" }).handler(getSelenaAdminAccessFn_createServerFn_handler, async () => {
	const session = await requireAuthSession();
	return { isAdmin: isAdmin(session) };
});
var getSelenaAdminOrderQueueFn_createServerFn_handler = createServerRpc({
	id: "0b4466c872a8806c2f73085f4f5944fe6ed933d9e53af7815228e0f9b5d24b0a",
	name: "getSelenaAdminOrderQueueFn",
	filename: "src/server/selena-admin-orders.ts"
}, (opts) => getSelenaAdminOrderQueueFn.__executeServer(opts));
var getSelenaAdminOrderQueueFn = createServerFn({ method: "GET" }).handler(getSelenaAdminOrderQueueFn_createServerFn_handler, async () => {
	const context = await requireAdminContext();
	const orders = await withOrganizationTransaction(await database(), context.tenantId, (tx) => tx.select({
		id: svOrders.id,
		status: svOrders.status,
		orderCap: svOrders.orderCap,
		paidAt: svOrders.paidAt,
		createdAt: svOrders.createdAt,
		updatedAt: svOrders.updatedAt,
		projectId: svOrders.projectId,
		projectName: svProjects.name,
		currency: svQuotes.currency,
		lockVersion: svConfigurationLocks.version,
		lockExpectedRuns: svConfigurationLocks.expectedRuns,
		lockBudgetCap: svConfigurationLocks.budgetCap
	}).from(svOrders).innerJoin(svProjects, eq(svOrders.projectId, svProjects.id)).innerJoin(svQuotes, eq(svOrders.quoteId, svQuotes.id)).innerJoin(svConfigurationLocks, eq(svOrders.lockId, svConfigurationLocks.id)).where(and(eq(svOrders.organizationId, context.tenantId), inArray(svOrders.status, [...adminQueueStatuses]))).orderBy(desc(svOrders.updatedAt)));
	return Promise.all(orders.map(async (order) => {
		const [cycles, qc] = await withOrganizationTransaction(await database(), context.tenantId, (tx) => Promise.all([tx.select({
			id: svCycles.id,
			status: svCycles.status,
			expectedRuns: svCycles.expectedRuns,
			createdRuns: svCycles.createdRuns,
			completedRuns: svCycles.completedRuns
		}).from(svCycles).where(and(eq(svCycles.orderId, order.id), eq(svCycles.organizationId, context.tenantId))).orderBy(desc(svCycles.createdAt)), tx.select({
			id: svQcRecords.id,
			reviewer: svQcRecords.reviewer,
			decision: svQcRecords.decision,
			scope: svQcRecords.scope,
			notes: svQcRecords.notes,
			reviewedAt: svQcRecords.reviewedAt
		}).from(svQcRecords).where(and(eq(svQcRecords.orderId, order.id), eq(svQcRecords.organizationId, context.tenantId))).orderBy(desc(svQcRecords.createdAt)).limit(1)]));
		return {
			...order,
			cycles,
			latestQc: qc[0] ?? null
		};
	}));
});
var getSelenaOrderPreflightFn_createServerFn_handler = createServerRpc({
	id: "7729a7c20ff1754bdcfb97b75d80462b5e39f304b2f51604d22d9366473607a5",
	name: "getSelenaOrderPreflightFn",
	filename: "src/server/selena-admin-orders.ts"
}, (opts) => getSelenaOrderPreflightFn.__executeServer(opts));
var getSelenaOrderPreflightFn = createServerFn({ method: "GET" }).validator(orderIdSchema).handler(getSelenaOrderPreflightFn_createServerFn_handler, async ({ data }) => {
	return collectPreflight(await requireAdminContext(), data.orderId);
});
async function approveOrder(context, orderId, idempotencyKey) {
	if (idempotencyKey) {
		const prior = await findPriorAudit(context, "ORDER_APPROVED", orderId, idempotencyKey);
		if (prior) {
			const order = await getOwnedOrder(context, orderId);
			const details = prior.details;
			return {
				orderId,
				status: order.status,
				cycleId: details.cycleId ?? null,
				created: details.created ?? 0,
				expected: details.expected ?? 0,
				replay: true
			};
		}
	}
	const preflight = await collectPreflight(context, orderId);
	assertApprovable(preflight);
	const dispatch = await (await getRepositories()).dispatch.createPermits(context, orderId, { approval: {
		fromStatus: "PAID_REVIEW_REQUIRED",
		auditEvent: "ORDER_APPROVED",
		auditDetails: { idempotencyKey: idempotencyKey ?? null }
	} });
	return {
		orderId,
		status: (await getOwnedOrder(context, orderId)).status,
		cycleId: dispatch.cycleId,
		created: dispatch.created,
		expected: dispatch.expected,
		replay: false
	};
}
async function enqueueOrderRunsForOrder(context, orderId, idempotencyKey) {
	if (idempotencyKey) {
		const prior = await findPriorAudit(context, "RUNS_ENQUEUED", orderId, idempotencyKey);
		if (prior) {
			const details = prior.details;
			return {
				orderId,
				enqueued: details.enqueued ?? 0,
				skipped: details.skipped ?? 0,
				duplicates: details.duplicates ?? 0,
				reason: null,
				replay: true
			};
		}
	}
	if ((await getOwnedOrder(context, orderId)).status !== "QUEUED") throw new Error("SELENA_ORDER_NOT_QUEUED");
	const permits = await (await getRepositories()).dispatch.listPermits(context, orderId);
	const config = measurementConfigFromEnv(process.env);
	const result = await enqueueOrderRuns({
		permits,
		config,
		organizationId: context.tenantId,
		actorId: context.actorId,
		now: /* @__PURE__ */ new Date(),
		send: async (payload, options) => {
			return (await getBoss()).send("selena-measure", payload, { singletonKey: options.singletonKey });
		}
	});
	await recordAdminAudit(context, "RUNS_ENQUEUED", orderId, {
		orderId,
		enqueued: result.enqueued,
		skipped: result.skipped,
		duplicates: result.duplicates,
		reason: result.reason,
		idempotencyKey: result.reason === null ? idempotencyKey ?? null : null
	});
	return {
		orderId,
		...result,
		replay: false
	};
}
var approveSelenaOrderFn_createServerFn_handler = createServerRpc({
	id: "a1c6aaf332294a4f307c33666ce8c90f42f2f8fd2e55043ef8fe73bfaa132f06",
	name: "approveSelenaOrderFn",
	filename: "src/server/selena-admin-orders.ts"
}, (opts) => approveSelenaOrderFn.__executeServer(opts));
var approveSelenaOrderFn = createServerFn({ method: "POST" }).validator(orderIdSchema.extend({ idempotencyKey: string().min(1).max(200).optional() })).handler(approveSelenaOrderFn_createServerFn_handler, async ({ data }) => approveOrder(await requireAdminContext(), data.orderId, data.idempotencyKey));
var enqueueSelenaOrderRunsFn_createServerFn_handler = createServerRpc({
	id: "f2039d0b4dc343b35c2ba2441d01b59d0320211d2dcef4b86f4ec599e3e839c5",
	name: "enqueueSelenaOrderRunsFn",
	filename: "src/server/selena-admin-orders.ts"
}, (opts) => enqueueSelenaOrderRunsFn.__executeServer(opts));
var enqueueSelenaOrderRunsFn = createServerFn({ method: "POST" }).validator(orderIdSchema.extend({ idempotencyKey: string().min(1).max(200).optional() })).handler(enqueueSelenaOrderRunsFn_createServerFn_handler, async ({ data }) => enqueueOrderRunsForOrder(await requireAdminContext(), data.orderId, data.idempotencyKey));
var stopSelenaOrderFn_createServerFn_handler = createServerRpc({
	id: "4abd27973f56a44bba943c06aa2b961778488b6a41db9b47eb49c9d6e220216f",
	name: "stopSelenaOrderFn",
	filename: "src/server/selena-admin-orders.ts"
}, (opts) => stopSelenaOrderFn.__executeServer(opts));
var stopSelenaOrderFn = createServerFn({ method: "POST" }).validator(orderIdSchema.extend({
	reason: string().trim().max(500).optional(),
	idempotencyKey: string().min(1).max(200).optional()
})).handler(stopSelenaOrderFn_createServerFn_handler, async ({ data }) => {
	const context = await requireAdminContext();
	const order = await getOwnedOrder(context, data.orderId);
	if (data.idempotencyKey) {
		if (await findPriorAudit(context, "ORDER_STOPPED", data.orderId, data.idempotencyKey)) return {
			orderId: data.orderId,
			status: order.status,
			stoppedCycles: 0,
			replay: true
		};
	}
	if (order.status === "CANCELLED") return {
		orderId: data.orderId,
		status: order.status,
		stoppedCycles: 0,
		replay: true
	};
	const stopped = await withOrganizationTransaction(await database(), context.tenantId, async (tx) => {
		await tx.update(svOrders).set({
			status: "CANCELLED",
			updatedAt: /* @__PURE__ */ new Date()
		}).where(and(eq(svOrders.id, data.orderId), eq(svOrders.organizationId, context.tenantId)));
		const stopped = await tx.update(svCycles).set({
			status: "STOPPED",
			updatedAt: /* @__PURE__ */ new Date()
		}).where(and(eq(svCycles.orderId, data.orderId), eq(svCycles.organizationId, context.tenantId), inArray(svCycles.status, [
			"CREATED",
			"APPROVED",
			"QUEUED",
			"RUNNING",
			"ANALYZING",
			"QC_REQUIRED"
		]))).returning({ id: svCycles.id });
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
				idempotencyKey: data.idempotencyKey ?? null
			}
		});
		return stopped;
	});
	return {
		orderId: data.orderId,
		status: "CANCELLED",
		stoppedCycles: stopped.length,
		replay: false
	};
});
var deliverSelenaOrderFn_createServerFn_handler = createServerRpc({
	id: "51b598d3051bb4895141e9ff4e665a176725b108ab61476bdc85f7d585b5d463",
	name: "deliverSelenaOrderFn",
	filename: "src/server/selena-admin-orders.ts"
}, (opts) => deliverSelenaOrderFn.__executeServer(opts));
var deliverSelenaOrderFn = createServerFn({ method: "POST" }).validator(orderIdSchema).handler(deliverSelenaOrderFn_createServerFn_handler, async ({ data }) => {
	const context = await requireAdminContext();
	const delivered = await (await getRepositories()).orders.deliver(context, data.orderId);
	return {
		orderId: data.orderId,
		status: delivered.status
	};
});
var recordSelenaQcFn_createServerFn_handler = createServerRpc({
	id: "21d9ff49125c5bb8921765a5a05fe58fd40f4cae93302a6eb6b2b6b7c4fe3a6b",
	name: "recordSelenaQcFn",
	filename: "src/server/selena-admin-orders.ts"
}, (opts) => recordSelenaQcFn.__executeServer(opts));
var recordSelenaQcFn = createServerFn({ method: "POST" }).validator(orderIdSchema.extend({
	cycleId: string().uuid().optional(),
	reviewer: string().trim().min(1).max(200).optional(),
	reviewedAt: string().datetime().optional(),
	scope: string().trim().min(1).max(500),
	decision: _enum(qcDecisions),
	notes: string().trim().max(2e3).optional()
})).handler(recordSelenaQcFn_createServerFn_handler, async ({ data }) => {
	const context = await requireAdminContext();
	return (await getRepositories()).qcRecords.create(context, {
		orderId: data.orderId,
		cycleId: data.cycleId ?? null,
		reviewer: data.reviewer,
		reviewedAt: data.reviewedAt ?? /* @__PURE__ */ new Date(),
		scope: data.scope,
		decision: data.decision,
		notes: data.notes ?? null
	});
});
//#endregion
export { approveSelenaOrderFn_createServerFn_handler, deliverSelenaOrderFn_createServerFn_handler, enqueueSelenaOrderRunsFn_createServerFn_handler, getSelenaAdminAccessFn_createServerFn_handler, getSelenaAdminOrderQueueFn_createServerFn_handler, getSelenaOrderPreflightFn_createServerFn_handler, recordSelenaQcFn_createServerFn_handler, stopSelenaOrderFn_createServerFn_handler };

//# sourceMappingURL=selena-admin-orders-hhSJJgmI.mjs.map