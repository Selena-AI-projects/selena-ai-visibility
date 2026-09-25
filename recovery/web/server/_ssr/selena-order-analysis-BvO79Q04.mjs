import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { d as and, f as eq } from "../_libs/drizzle-orm.mjs";
import { S as svConfigurationLocks, Z as svOrders } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { s as requireAdmin } from "./helpers-phr0Aqka.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { o as parseLockedAnalysisSubjects, r as createSelenaRepositories } from "./selena-visibility-repositories-DjKDsg4F.mjs";
import { i as summarizeScenarioSet, t as analyzeAnswer } from "./selena-answer-analysis-BVDxCAaG.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-order-analysis-BvO79Q04.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "465e6c4d-94c8-4715-93cc-8ed41c7b8550", e._sentryDebugIdIdentifier = "sentry-dbid-465e6c4d-94c8-4715-93cc-8ed41c7b8550");
	} catch (e) {}
})();
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
async function requireAdminContext() {
	await requireAdmin();
	return resolveSessionAuthContext();
}
function readRetainedAnswer(payload) {
	if (typeof payload !== "object" || payload === null) return null;
	const answer = payload.answer;
	if (typeof answer !== "object" || answer === null) return null;
	const record = answer;
	const text = typeof record.text === "string" ? record.text : "";
	if (text.trim() === "") return null;
	const citedUrls = Array.isArray(record.citedUrls) ? record.citedUrls.filter((url) => typeof url === "string") : void 0;
	return citedUrls ? {
		text,
		citedUrls
	} : { text };
}
function readStoredAnalysis(payload) {
	if (typeof payload !== "object" || payload === null) return null;
	const analysis = payload.analysis;
	if (typeof analysis !== "object" || analysis === null) return null;
	const record = analysis;
	if (typeof record.brandMentioned !== "boolean" || !Array.isArray(record.mentions)) return null;
	return record;
}
async function computeOrderAnalysis(context, orderId) {
	const data = { orderId };
	{
		const lock = await withOrganizationTransaction(db, context.tenantId, async (tx) => {
			const [order] = await tx.select({
				id: svOrders.id,
				lockId: svOrders.lockId
			}).from(svOrders).where(and(eq(svOrders.id, data.orderId), eq(svOrders.organizationId, context.tenantId))).limit(1);
			if (!order) throw new Error("Not found: order is outside AuthContext tenant");
			const [lock] = await tx.select({ snapshot: svConfigurationLocks.snapshot }).from(svConfigurationLocks).where(and(eq(svConfigurationLocks.id, order.lockId), eq(svConfigurationLocks.organizationId, context.tenantId))).limit(1);
			return lock;
		});
		const subjects = parseLockedAnalysisSubjects(lock?.snapshot);
		if (!subjects) throw new Error("SELENA_LOCK_SUBJECTS_MISSING");
		const runs = await repositories.runs.listForOrder(context, data.orderId);
		const analyses = [];
		let analyzed = 0;
		let reused = 0;
		let withoutAnswer = 0;
		for (const run of runs) {
			const retained = readRetainedAnswer(run.canonicalPayload);
			if (retained) {
				const analysis = analyzeAnswer({
					text: retained.text,
					brand: subjects.brand,
					competitors: subjects.competitors,
					citedUrls: retained.citedUrls
				});
				await repositories.runs.saveAnalysis(context, run.id, analysis);
				analyses.push(analysis);
				analyzed += 1;
				continue;
			}
			const stored = readStoredAnalysis(run.canonicalPayload);
			if (stored) {
				analyses.push(stored);
				reused += 1;
				continue;
			}
			withoutAnswer += 1;
		}
		return {
			orderId: data.orderId,
			runsSeen: runs.length,
			analyzed,
			reused,
			withoutAnswer,
			brand: subjects.brand.name,
			summary: summarizeScenarioSet(analyses, { brandDomain: subjects.brand.domain })
		};
	}
}
var analyzeSelenaOrderFn_createServerFn_handler = createServerRpc({
	id: "d66696319991447da1b2b07651555c833ca705e755d0e6fc88c993e7bb3e23f2",
	name: "analyzeSelenaOrderFn",
	filename: "src/server/selena-order-analysis.ts"
}, (opts) => analyzeSelenaOrderFn.__executeServer(opts));
var analyzeSelenaOrderFn = createServerFn({ method: "POST" }).validator(object({ orderId: string().uuid() })).handler(analyzeSelenaOrderFn_createServerFn_handler, async ({ data }) => computeOrderAnalysis(await requireAdminContext(), data.orderId));
//#endregion
export { analyzeSelenaOrderFn_createServerFn_handler };

//# sourceMappingURL=selena-order-analysis-BvO79Q04.mjs.map