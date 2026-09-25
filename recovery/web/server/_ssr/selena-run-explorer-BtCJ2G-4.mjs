import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { L as sql, d as and, f as eq, l as asc, u as desc } from "../_libs/drizzle-orm.mjs";
import { ft as svResponseMentions, ht as svScenarios, mt as svRuns } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { n as readCitations, r as readSources, t as readAnswer } from "./selena-run-payload-C6664xQ6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-run-explorer-BtCJ2G-4.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "643ac5bf-e32b-4b4e-8d79-c6d1bb0120d4", e._sentryDebugIdIdentifier = "sentry-dbid-643ac5bf-e32b-4b4e-8d79-c6d1bb0120d4");
	} catch (e) {}
})();
var listSelenaRunsFn_createServerFn_handler = createServerRpc({
	id: "24b2ee0122cb9f0fd582976e790690b6337f5e8d52fcdb5f3677a5cb55737423",
	name: "listSelenaRunsFn",
	filename: "src/server/selena-run-explorer.ts"
}, (opts) => listSelenaRunsFn.__executeServer(opts));
var listSelenaRunsFn = createServerFn({ method: "GET" }).validator(object({ cycleId: string().uuid() })).handler(listSelenaRunsFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	return { runs: (await withOrganizationTransaction(db, context.tenantId, (tx) => tx.select({
		id: svRuns.id,
		scenarioId: svRuns.scenarioId,
		scenarioText: svScenarios.text,
		system: svRuns.system,
		systemId: svRuns.systemId,
		channel: svRuns.channel,
		status: svRuns.status,
		validity: svRuns.validity,
		invalidReason: svRuns.invalidReason,
		captureMode: svRuns.captureMode,
		finishedAt: svRuns.finishedAt
	}).from(svRuns).leftJoin(svScenarios, and(sql`${svRuns.scenarioId} = ${svScenarios.id}::text`, eq(svScenarios.organizationId, context.tenantId))).where(and(eq(svRuns.cycleId, data.cycleId), eq(svRuns.organizationId, context.tenantId))).orderBy(desc(svRuns.finishedAt)).limit(100))).map((row) => ({
		id: row.id,
		scenarioId: row.scenarioId,
		scenarioText: row.scenarioText,
		system: row.system ?? row.systemId,
		channel: row.channel,
		status: row.status,
		validity: row.validity,
		invalidReason: row.invalidReason,
		captureMode: row.captureMode,
		finishedAt: row.finishedAt?.toISOString() ?? null
	})) };
});
var getSelenaRunDetailFn_createServerFn_handler = createServerRpc({
	id: "1dfaf971eff28ab99e77eeacc02c77228b7b8c5cf91ceae36c2ce6b0ea0cc460",
	name: "getSelenaRunDetailFn",
	filename: "src/server/selena-run-explorer.ts"
}, (opts) => getSelenaRunDetailFn.__executeServer(opts));
var getSelenaRunDetailFn = createServerFn({ method: "GET" }).validator(object({ runId: string().uuid() })).handler(getSelenaRunDetailFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	return withOrganizationTransaction(db, context.tenantId, async (tx) => {
		const [run] = await tx.select().from(svRuns).where(and(eq(svRuns.id, data.runId), eq(svRuns.organizationId, context.tenantId))).limit(1);
		if (!run) throw new Error("Not found: run is outside AuthContext tenant");
		const [mentions, [scenario]] = await Promise.all([tx.select({
			entityType: svResponseMentions.entityType,
			name: svResponseMentions.name,
			ordinalPosition: svResponseMentions.ordinalPosition
		}).from(svResponseMentions).where(and(eq(svResponseMentions.runId, run.id), eq(svResponseMentions.organizationId, context.tenantId))).orderBy(asc(svResponseMentions.ordinalPosition)), tx.select({ text: svScenarios.text }).from(svScenarios).where(and(eq(svScenarios.id, run.scenarioId), eq(svScenarios.organizationId, context.tenantId))).limit(1)]);
		return {
			id: run.id,
			scenarioId: run.scenarioId,
			scenarioText: scenario?.text ?? null,
			system: run.system ?? run.systemId,
			channel: run.channel,
			status: run.status,
			validity: run.validity,
			invalidReason: run.invalidReason,
			captureMode: run.captureMode,
			finishedAt: run.finishedAt?.toISOString() ?? null,
			language: run.language,
			answer: readAnswer(run.canonicalPayload),
			mentions,
			citations: readCitations(run.citations),
			sources: readSources(run.canonicalPayload)
		};
	});
});
//#endregion
export { getSelenaRunDetailFn_createServerFn_handler, listSelenaRunsFn_createServerFn_handler };

//# sourceMappingURL=selena-run-explorer-BtCJ2G-4.mjs.map