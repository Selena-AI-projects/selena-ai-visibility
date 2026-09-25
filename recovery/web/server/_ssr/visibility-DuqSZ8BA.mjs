import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { f as eq } from "../_libs/drizzle-orm.mjs";
import { a as competitors, r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as getEffectiveBrandedStatus } from "./tag-utils-C10EeA61.mjs";
import { n as resolveTimezone, t as getTimezoneLookbackRange } from "./timezone-utils-BaIeYVmx.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, l as requireBrandAccess } from "./helpers-phr0Aqka.mjs";
import { c as getCitationsTotalCount, i as getBatchChartData, k as getVisibilityDailyAggregate } from "./postgres-read-BdoLn4e5.mjs";
import { t as resolveFilteredPrompts } from "./prompt-resolution-CPr2lUBZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/visibility-DuqSZ8BA.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c326b5a9-8208-4ba4-83fd-6796188fc074", e._sentryDebugIdIdentifier = "sentry-dbid-c326b5a9-8208-4ba4-83fd-6796188fc074");
	} catch (e) {}
})();
/**
* Server functions for visibility and chart data.
* Replaces:
*   - apps/web/src/app/api/brands/[id]/batch-chart-data/route.ts
*   - apps/web/src/app/api/brands/[id]/filtered-visibility/route.ts
*/
var getBatchChartDataFn_createServerFn_handler = createServerRpc({
	id: "31d4492d78cc87721df43de3556031796692c5ad9f1d5ac589a4366d275cd4c1",
	name: "getBatchChartDataFn",
	filename: "src/server/visibility.ts"
}, (opts) => getBatchChartDataFn.__executeServer(opts));
var getBatchChartDataFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: _enum([
		"1w",
		"1m",
		"3m",
		"6m",
		"1y",
		"all"
	]).default("1m"),
	model: string().optional(),
	tags: string().optional(),
	search: string().optional(),
	timezone: string().default("UTC")
})).handler(getBatchChartDataFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const timezone = resolveTimezone(data.timezone);
	const lookbackParam = data.lookback;
	const { fromDateStr, toDateStr } = getTimezoneLookbackRange(lookbackParam, timezone, { allStrategy: "1y" });
	const promptIds = (await resolveFilteredPrompts(data.brandId, {
		tags: data.tags,
		search: data.search
	})).map((p) => p.id);
	const [brandResult, competitorsResult] = await Promise.all([db.select({
		id: brands.id,
		name: brands.name
	}).from(brands).where(eq(brands.id, data.brandId)).limit(1), db.select({
		id: competitors.id,
		name: competitors.name
	}).from(competitors).where(eq(competitors.brandId, data.brandId))]);
	if (brandResult.length === 0) throw new Error("Brand not found");
	const brand = brandResult[0];
	if (promptIds.length === 0) return {
		chartData: [],
		brand: {
			id: brand.id,
			name: brand.name
		},
		competitors: competitorsResult,
		dateRange: {
			fromDate: fromDateStr,
			toDate: toDateStr
		}
	};
	return {
		chartData: await getBatchChartData(data.brandId, promptIds, fromDateStr, toDateStr, timezone, void 0, data.model),
		brand: {
			id: brand.id,
			name: brand.name
		},
		competitors: competitorsResult,
		dateRange: {
			fromDate: fromDateStr,
			toDate: toDateStr
		}
	};
});
var getFilteredVisibilityFn_createServerFn_handler = createServerRpc({
	id: "8062851249afe4bf238a5b9ba61d89cff868973f64782abaa66f94c3db692a62",
	name: "getFilteredVisibilityFn",
	filename: "src/server/visibility.ts"
}, (opts) => getFilteredVisibilityFn.__executeServer(opts));
var getFilteredVisibilityFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: _enum([
		"1w",
		"1m",
		"3m",
		"6m",
		"1y",
		"all"
	]).default("1m"),
	model: string().optional(),
	tags: string().optional(),
	search: string().optional(),
	timezone: string().default("UTC")
})).handler(getFilteredVisibilityFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	const lookbackParam = data.lookback;
	await requireBrandAccess(session.user.id, data.brandId);
	const resolvedPrompts = await resolveFilteredPrompts(data.brandId, {
		tags: data.tags,
		search: data.search
	});
	const promptIds = resolvedPrompts.map((p) => p.id);
	const totalPrompts = promptIds.length;
	if (totalPrompts === 0) return {
		currentVisibility: 0,
		totalRuns: 0,
		totalPrompts: 0,
		totalCitations: 0,
		visibilityTimeSeries: [],
		lookback: lookbackParam
	};
	const timezone = resolveTimezone(data.timezone);
	const brandedPromptIds = resolvedPrompts.filter((p) => getEffectiveBrandedStatus(p.systemTags, p.tags).isBranded).map((p) => p.id);
	const { fromDateStr: fromDate, toDateStr: toDate } = getTimezoneLookbackRange(lookbackParam, timezone, { allStrategy: "1y" });
	const [daily, totalCitations] = await Promise.all([getVisibilityDailyAggregate(data.brandId, fromDate, toDate, timezone, promptIds, brandedPromptIds, data.model), getCitationsTotalCount(data.brandId, fromDate, toDate, timezone, promptIds, data.model)]);
	let totalBrandedRuns = 0;
	let totalNonBrandedRuns = 0;
	const visibilityTimeSeries = daily.map((row) => {
		totalBrandedRuns += row.actual_branded_runs;
		totalNonBrandedRuns += row.actual_nonbranded_runs;
		const t = row.lvcf_branded_runs + row.lvcf_nonbranded_runs;
		const m = row.lvcf_branded_mentioned + row.lvcf_nonbranded_mentioned;
		return {
			date: row.date,
			visibility: t === 0 ? null : Math.round(m / t * 100)
		};
	});
	const totalRuns = totalBrandedRuns + totalNonBrandedRuns;
	let currentVisibility = 0;
	for (let i = visibilityTimeSeries.length - 1; i >= 0; i--) {
		const v = visibilityTimeSeries[i].visibility;
		if (v != null) {
			currentVisibility = v;
			break;
		}
	}
	return {
		currentVisibility,
		totalRuns,
		totalPrompts,
		totalCitations,
		visibilityTimeSeries,
		lookback: lookbackParam
	};
});
//#endregion
export { getBatchChartDataFn_createServerFn_handler, getFilteredVisibilityFn_createServerFn_handler };

//# sourceMappingURL=visibility-DuqSZ8BA.mjs.map