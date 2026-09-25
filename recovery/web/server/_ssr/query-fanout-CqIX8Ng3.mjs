import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { f as eq } from "../_libs/drizzle-orm.mjs";
import { r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { r as resolveRange, t as LOOKBACK } from "./analysis-BlgoS24m.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, l as requireBrandAccess } from "./helpers-phr0Aqka.mjs";
import { n as computeFanoutAnalysis } from "./fanout-analysis-Bt4WW_et.mjs";
import { d as getFanoutModelTotals, f as getFanoutPromptTotals, u as getFanoutBreakdown } from "./postgres-read-BdoLn4e5.mjs";
import { t as resolveFilteredPrompts } from "./prompt-resolution-CPr2lUBZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/query-fanout-CqIX8Ng3.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "6c014a39-af76-4724-a7d2-82de851e9377", e._sentryDebugIdIdentifier = "sentry-dbid-6c014a39-af76-4724-a7d2-82de851e9377");
	} catch (e) {}
})();
/**
* Server function for the Query Fanout page. Read-only — derived entirely from
* `prompt_runs.web_queries` (the sub-queries engines run while answering a
* prompt), uniformly across providers. Engines that don't expose their
* searches contribute runs but no queries. No schema changes.
*
* Filters (tags/search → prompt IDs, lookback → date range in the user's
* timezone) are resolved server-side exactly like Share of Voice, so the same
* prompt set and window back every figure on the page. See `server/analysis.ts`.
*/
function emptyResponse(brandName, model) {
	return {
		brandName,
		model,
		totalQueries: 0,
		uniqueQueries: 0,
		fanoutRuns: 0,
		totalRuns: 0,
		avgPerExecution: 0,
		coverageRate: 0,
		topQueries: [],
		terms: [],
		wordChanges: {
			added: [],
			dropped: [],
			preserved: []
		},
		byModel: [],
		byPrompt: [],
		topByPrompts: [],
		topByRuns: []
	};
}
var getQueryFanoutFn_createServerFn_handler = createServerRpc({
	id: "bb2bb785d141880b1ce95e0f119182564c8b822f27d57519ab11f968738e8cda",
	name: "getQueryFanoutFn",
	filename: "src/server/query-fanout.ts"
}, (opts) => getQueryFanoutFn.__executeServer(opts));
var getQueryFanoutFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: LOOKBACK.default("1m"),
	model: string().optional(),
	tags: string().optional(),
	search: string().optional(),
	/** Scope to a single prompt (prompt-details Web Queries tab) — lists come back uncapped. */
	promptId: string().optional(),
	timezone: string().default("UTC")
})).handler(getQueryFanoutFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const { timezone, fromDateStr, toDateStr } = resolveRange(data.lookback, data.timezone);
	const model = data.model;
	const [brandRow, allResolved] = await Promise.all([db.select({ name: brands.name }).from(brands).where(eq(brands.id, data.brandId)).limit(1), resolveFilteredPrompts(data.brandId, {
		tags: data.tags,
		search: data.search
	})]);
	const brandName = brandRow[0]?.name ?? "Your brand";
	const resolved = data.promptId ? allResolved.filter((p) => p.id === data.promptId) : allResolved;
	const promptIds = resolved.map((p) => p.id);
	if (promptIds.length === 0) return emptyResponse(brandName, model ?? null);
	const promptValueMap = new Map(resolved.map((p) => [p.id, p.value]));
	const [breakdown, modelTotals, promptTotalsRows] = await Promise.all([
		getFanoutBreakdown(data.brandId, fromDateStr, toDateStr, timezone, promptIds, model),
		getFanoutModelTotals(data.brandId, fromDateStr, toDateStr, timezone, promptIds, model),
		getFanoutPromptTotals(data.brandId, fromDateStr, toDateStr, timezone, promptIds, model)
	]);
	const promptRuns = new Map(promptTotalsRows.map((r) => [r.prompt_id, r.runs]));
	const limits = data.promptId ? {
		topQueries: 2e3,
		perModelTop: 2e3,
		variations: 2e3
	} : void 0;
	const analysis = computeFanoutAnalysis(breakdown, modelTotals, promptValueMap, {
		promptRuns,
		limits
	});
	return {
		brandName,
		model: model ?? null,
		...analysis
	};
});
//#endregion
export { getQueryFanoutFn_createServerFn_handler };

//# sourceMappingURL=query-fanout-CqIX8Ng3.mjs.map