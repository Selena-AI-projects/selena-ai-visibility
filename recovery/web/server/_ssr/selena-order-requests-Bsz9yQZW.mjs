import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { r as SELENA_CATALOG } from "./src-BdeAuGX5.mjs";
import { L as sql, d as and, f as eq, g as inArray, u as desc } from "../_libs/drizzle-orm.mjs";
import { X as svOrderRequests, ht as svScenarios, tt as svProjects, v as svAuditEvents } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { s as requireAdmin } from "./helpers-phr0Aqka.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { r as createSelenaRepositories } from "./selena-visibility-repositories-DjKDsg4F.mjs";
import { a as startSelenaMeasurement, i as prepareSelenaScenarios } from "./selena-order-desk-core-VYmlVsWR.mjs";
import { createHash } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-order-requests-Bsz9yQZW.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "824c6c4f-18f1-47dc-ae26-51c7413e87f3", e._sentryDebugIdIdentifier = "sentry-dbid-824c6c4f-18f1-47dc-ae26-51c7413e87f3");
	} catch (e) {}
})();
function readCap(raw, fallback) {
	if (raw === void 0 || raw.trim() === "") return fallback;
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 0) return fallback;
	return parsed;
}
function freeAutoDispatchConfigFromEnv(env) {
	return {
		enabled: env.SELENA_FREE_AUTO_DISPATCH_ENABLED === "true",
		maxPerDay: readCap(env.SELENA_FREE_AUTO_DISPATCH_MAX_PER_DAY, 3),
		maxPerProjectPerDay: readCap(env.SELENA_FREE_AUTO_DISPATCH_MAX_PER_PROJECT_PER_DAY, 1)
	};
}
function decideFreeAutoDispatch(input) {
	if (!input.config.enabled) return {
		dispatch: false,
		reason: "DISABLED"
	};
	if (!input.promoApplied) return {
		dispatch: false,
		reason: "NOT_FREE"
	};
	if (input.dispatchedToday >= input.config.maxPerDay) return {
		dispatch: false,
		reason: "DAILY_CAP"
	};
	if (input.dispatchedTodayForProject >= input.config.maxPerProjectPerDay) return {
		dispatch: false,
		reason: "PROJECT_CAP"
	};
	return { dispatch: true };
}
/**
* Taking one of the day's free auto-dispatch slots.
*
* The two caps span every tenant, and the runtime role cannot count other
* tenants' rows under RLS, so the count and the decision live in one database
* function behind a lock. What comes back is the decision, never the counts:
* a caller that could read how many slots are left could also plan around
* them.
*/
var freeAutoDispatchClaimOutcomes = [
	"CLAIMED",
	"DAILY_CAP",
	"PROJECT_CAP"
];
function isClaimOutcome(value) {
	return typeof value === "string" && freeAutoDispatchClaimOutcomes.includes(value);
}
async function claimFreeAutoDispatch(executor, input) {
	const outcome = ((await executor.execute(sql`SELECT public.sv_claim_free_auto_dispatch(
			${input.requestId}::uuid,
			${input.organizationId}::text,
			${input.projectId}::uuid,
			${input.maxPerDay}::integer,
			${input.maxPerProjectPerDay}::integer
		) AS outcome`)).rows?.[0])?.outcome;
	if (!isClaimOutcome(outcome)) throw new Error("FREE_AUTO_DISPATCH_CLAIM_UNREADABLE");
	return outcome;
}
/** Gives a slot back; true when this tenant held one for the request. */
async function releaseFreeAutoDispatchClaim(executor, input) {
	return ((await executor.execute(sql`SELECT public.sv_release_free_auto_dispatch(
			${input.requestId}::uuid,
			${input.organizationId}::text
		) AS released`)).rows?.[0])?.released === true;
}
function hashPilotInviteCode(code) {
	return createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}
/**
* Returns the plan bound to the seat, or null when the code is unknown,
* expired, issued for another plan, or already held by someone else. They are
* one answer on purpose: distinguishing them would let a caller probe which
* codes exist.
*/
async function redeemPilotInvite(executor, input) {
	if (input.code.trim().length === 0) return null;
	const planId = ((await executor.execute(sql`SELECT public.sv_redeem_pilot_invite(
			${hashPilotInviteCode(input.code)}::text,
			${input.planId}::text,
			${input.organizationId}::text,
			${input.userId}::text
		) AS plan_id`)).rows?.[0])?.plan_id;
	return typeof planId === "string" && planId.length > 0 ? { planId } : null;
}
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
var createSchema = object({
	projectId: string().uuid(),
	planId: _enum(["visitor-local", "full-ai-landscape"]),
	contactName: string().trim().min(1).max(200),
	contactChannel: string().trim().min(3).max(300),
	comment: string().trim().max(2e3).optional(),
	promoCode: string().trim().max(100).optional()
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
async function autoDispatchFreeRequest(input) {
	const config = freeAutoDispatchConfigFromEnv(process.env);
	const gate = decideFreeAutoDispatch({
		config,
		promoApplied: input.promoApplied,
		dispatchedToday: 0,
		dispatchedTodayForProject: 0
	});
	if (!gate.dispatch) return {
		status: null,
		reason: gate.reason
	};
	const refuse = async (reason) => {
		await withOrganizationTransaction(db, input.context.tenantId, async (tx) => {
			await tx.insert(svAuditEvents).values({
				organizationId: input.context.tenantId,
				actorId: input.context.actorId,
				event: "ORDER_REQUEST_AUTO_DISPATCH_REFUSED",
				subjectKind: "sv_order_requests",
				subjectId: input.requestId,
				details: {
					planId: input.planId,
					reason
				}
			});
		});
		return {
			status: null,
			reason
		};
	};
	let claim;
	try {
		claim = await withOrganizationTransaction(db, input.context.tenantId, (tx) => claimFreeAutoDispatch(tx, {
			requestId: input.requestId,
			organizationId: input.context.tenantId,
			projectId: input.projectId,
			maxPerDay: config.maxPerDay,
			maxPerProjectPerDay: config.maxPerProjectPerDay
		}));
	} catch {
		return refuse("CLAIM_UNAVAILABLE");
	}
	if (claim !== "CLAIMED") return refuse(claim);
	const plan = SELENA_CATALOG[input.planId];
	const questionCap = (plan.questionLimitPerMeasurement ?? 25) * Math.max(1, plan.languageLimit);
	let reachedOrder = false;
	try {
		const { familyId } = await prepareSelenaScenarios(input.context, input.projectId);
		const proposed = (await repositories.scenarios.list(input.context, familyId)).filter((scenario) => scenario.status === "PROPOSED" || scenario.status === "APPROVED").slice(0, questionCap);
		if (proposed.length === 0) throw new Error("SELENA_PROFILE_HAS_NO_QUESTIONS");
		const scenarioIds = proposed.map((scenario) => scenario.id);
		await withOrganizationTransaction(db, input.context.tenantId, async (tx) => {
			await tx.update(svScenarios).set({
				status: "APPROVED",
				updatedAt: /* @__PURE__ */ new Date()
			}).where(and(inArray(svScenarios.id, scenarioIds), eq(svScenarios.organizationId, input.context.tenantId)));
		});
		reachedOrder = true;
		const started = await startSelenaMeasurement(input.context, {
			projectId: input.projectId,
			planId: input.planId,
			scenarioIds,
			idempotencyKey: `auto-request:${input.requestId}`
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
					stoppedAt: started.stoppedAt
				}
			});
		});
		return {
			status: "AUTO_QUEUED",
			expectedRuns: started.expectedRuns
		};
	} catch (cause) {
		if (!reachedOrder) await withOrganizationTransaction(db, input.context.tenantId, (tx) => releaseFreeAutoDispatchClaim(tx, {
			requestId: input.requestId,
			organizationId: input.context.tenantId
		})).catch(() => void 0);
		await withOrganizationTransaction(db, input.context.tenantId, async (tx) => {
			await tx.insert(svAuditEvents).values({
				organizationId: input.context.tenantId,
				actorId: input.context.actorId,
				event: "ORDER_REQUEST_AUTO_DISPATCH_FAILED",
				subjectKind: "sv_order_requests",
				subjectId: input.requestId,
				details: {
					planId: input.planId,
					error: cause instanceof Error ? cause.message : String(cause)
				}
			});
		});
		return {
			status: "AUTO_FAILED",
			expectedRuns: 0
		};
	}
}
var createSelenaOrderRequestFn_createServerFn_handler = createServerRpc({
	id: "fa41326a852a5d2d09763585cddbda034b50132cda9fcf6e9b0698b7c528f330",
	name: "createSelenaOrderRequestFn",
	filename: "src/server/selena-order-requests.ts"
}, (opts) => createSelenaOrderRequestFn.__executeServer(opts));
var createSelenaOrderRequestFn = createServerFn({ method: "POST" }).validator(createSchema).handler(createSelenaOrderRequestFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	if (!await repositories.projects.get(context, data.projectId)) throw new Error("Not found: project is outside AuthContext tenant");
	const { row, promoApplied } = await withOrganizationTransaction(db, context.tenantId, async (tx) => {
		const seat = data.promoCode?.trim() ? await redeemPilotInvite(tx, {
			code: data.promoCode,
			planId: data.planId,
			organizationId: context.tenantId,
			userId: context.actorId
		}) : null;
		const [inserted] = await tx.insert(svOrderRequests).values({
			organizationId: context.tenantId,
			projectId: data.projectId,
			planId: data.planId,
			contactName: data.contactName,
			contactChannel: data.contactChannel,
			comment: data.comment || null,
			promoCode: null,
			promoApplied: seat !== null
		}).returning({ id: svOrderRequests.id });
		return {
			row: inserted,
			promoApplied: seat !== null
		};
	});
	const auto = await autoDispatchFreeRequest({
		context,
		requestId: row.id,
		projectId: data.projectId,
		planId: data.planId,
		promoApplied
	});
	if (auto.status) await withOrganizationTransaction(db, context.tenantId, async (tx) => {
		await tx.update(svOrderRequests).set({
			status: auto.status,
			updatedAt: /* @__PURE__ */ new Date()
		}).where(and(eq(svOrderRequests.id, row.id), eq(svOrderRequests.organizationId, context.tenantId)));
	});
	return {
		id: row.id,
		promoApplied,
		autoStarted: auto.status === "AUTO_QUEUED"
	};
});
var listSelenaOrderRequestsFn_createServerFn_handler = createServerRpc({
	id: "394661c8faa5d17f39b5dad0f04dce2f224272edcfbffd87041f034de108543b",
	name: "listSelenaOrderRequestsFn",
	filename: "src/server/selena-order-requests.ts"
}, (opts) => listSelenaOrderRequestsFn.__executeServer(opts));
var listSelenaOrderRequestsFn = createServerFn({ method: "GET" }).handler(listSelenaOrderRequestsFn_createServerFn_handler, async () => {
	await requireAdmin();
	const context = await resolveSessionAuthContext();
	return (await withOrganizationTransaction(db, context.tenantId, (tx) => tx.select({
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
		createdAt: svOrderRequests.createdAt
	}).from(svOrderRequests).innerJoin(svProjects, eq(svOrderRequests.projectId, svProjects.id)).where(eq(svOrderRequests.organizationId, context.tenantId)).orderBy(desc(svOrderRequests.createdAt)))).map((row) => ({
		...row,
		createdAt: row.createdAt.toISOString()
	}));
});
var updateSelenaOrderRequestStatusFn_createServerFn_handler = createServerRpc({
	id: "389e1afacb538af654789d7a4eb4a80e1c8b281c33c4e745512b9d42fc3786a4",
	name: "updateSelenaOrderRequestStatusFn",
	filename: "src/server/selena-order-requests.ts"
}, (opts) => updateSelenaOrderRequestStatusFn.__executeServer(opts));
var updateSelenaOrderRequestStatusFn = createServerFn({ method: "POST" }).validator(object({
	requestId: string().uuid(),
	status: _enum([
		"NEW",
		"IN_PROGRESS",
		"CLOSED"
	])
})).handler(updateSelenaOrderRequestStatusFn_createServerFn_handler, async ({ data }) => {
	await requireAdmin();
	const context = await resolveSessionAuthContext();
	const [row] = await withOrganizationTransaction(db, context.tenantId, (tx) => tx.update(svOrderRequests).set({
		status: data.status,
		updatedAt: /* @__PURE__ */ new Date()
	}).where(and(eq(svOrderRequests.id, data.requestId), eq(svOrderRequests.organizationId, context.tenantId))).returning({ id: svOrderRequests.id }));
	if (!row) throw new Error("Not found: request is outside AuthContext tenant");
	return {
		id: row.id,
		status: data.status
	};
});
//#endregion
export { createSelenaOrderRequestFn_createServerFn_handler, listSelenaOrderRequestsFn_createServerFn_handler, updateSelenaOrderRequestStatusFn_createServerFn_handler };

//# sourceMappingURL=selena-order-requests-Bsz9yQZW.mjs.map