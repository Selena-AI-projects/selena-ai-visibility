import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { d as and, f as eq, l as asc } from "../_libs/drizzle-orm.mjs";
import { ht as svScenarios, nt as svPromptFamilies } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { r as createSelenaRepositories } from "./selena-visibility-repositories-DjKDsg4F.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-scenarios-D_M2C51F.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "f0a9243b-f420-4d8c-b9dd-20efdf0400c8", e._sentryDebugIdIdentifier = "sentry-dbid-f0a9243b-f420-4d8c-b9dd-20efdf0400c8");
	} catch (e) {}
})();
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
var listSelenaScenariosFn_createServerFn_handler = createServerRpc({
	id: "38ccccfeef11f41a6edcc70e65c90d50dea8d89718e94285ecbabb2a68518015",
	name: "listSelenaScenariosFn",
	filename: "src/server/selena-scenarios.ts"
}, (opts) => listSelenaScenariosFn.__executeServer(opts));
var listSelenaScenariosFn = createServerFn({ method: "GET" }).validator(object({ projectId: string().uuid() })).handler(listSelenaScenariosFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	if (!await repositories.projects.get(context, data.projectId)) throw new Error("Not found: project is outside AuthContext tenant");
	return { scenarios: await withOrganizationTransaction(db, context.tenantId, (tx) => tx.select({
		id: svScenarios.id,
		familyId: svScenarios.familyId,
		intentType: svPromptFamilies.intentType,
		text: svScenarios.text,
		language: svScenarios.language,
		status: svScenarios.status
	}).from(svScenarios).innerJoin(svPromptFamilies, eq(svScenarios.familyId, svPromptFamilies.id)).where(and(eq(svPromptFamilies.projectId, data.projectId), eq(svScenarios.organizationId, context.tenantId))).orderBy(asc(svScenarios.createdAt))) };
});
var reviewSelenaScenarioFn_createServerFn_handler = createServerRpc({
	id: "24ecf1adf006ead258e9f021c35ac897f967b50c156ff328d0a2cb3b6e685563",
	name: "reviewSelenaScenarioFn",
	filename: "src/server/selena-scenarios.ts"
}, (opts) => reviewSelenaScenarioFn.__executeServer(opts));
var reviewSelenaScenarioFn = createServerFn({ method: "POST" }).validator(object({
	scenarioId: string().uuid(),
	decision: _enum(["APPROVED", "REJECTED"]),
	text: string().max(2e3).optional()
})).handler(reviewSelenaScenarioFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	const updated = await repositories.scenarios.review(context, data.scenarioId, {
		decision: data.decision,
		text: data.text
	});
	return {
		id: updated.id,
		status: updated.status,
		text: updated.text
	};
});
//#endregion
export { listSelenaScenariosFn_createServerFn_handler, reviewSelenaScenarioFn_createServerFn_handler };

//# sourceMappingURL=selena-scenarios-D_M2C51F.mjs.map