import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { S as toRoundedPercentages, f as extractDomain, u as emptyCategoryCounts } from "./domain-categories-IivSiXtp.mjs";
import { c as generateDateRange, r as applyPerPromptLVCF, t as applyPerPromptCitationLVCF } from "./chart-utils-fSx3DwB3.mjs";
import { d as and, f as eq, s as count } from "../_libs/drizzle-orm.mjs";
import { a as competitors, d as prompts, r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as getEffectiveBrandedStatus } from "./tag-utils-C10EeA61.mjs";
import { n as resolveTimezone, t as getTimezoneLookbackRange } from "./timezone-utils-BaIeYVmx.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, l as requireBrandAccess } from "./helpers-phr0Aqka.mjs";
import { h as getPerPromptDailyCitationStats, l as getDashboardSummary, y as getPerPromptVisibilityTimeSeries } from "./postgres-read-BdoLn4e5.mjs";
import { r as percentOrNull } from "./visibility-stats-DqQEIyaP.mjs";
import { t as categorizeDomain } from "./domain-categories.server-CJIsNjFt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-D4kQaaVZ.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "6ce75271-9852-40cc-9581-1a6934ff7ad4", e._sentryDebugIdIdentifier = "sentry-dbid-6ce75271-9852-40cc-9581-1a6934ff7ad4");
	} catch (e) {}
})();
/**
* Server functions for dashboard data.
* Replaces apps/web/src/app/api/brands/[id]/dashboard-summary/route.ts
*/
var getDashboardSummaryFn_createServerFn_handler = createServerRpc({
	id: "11c2deba98af4895020c451e07332ccef0c715ea70da26df5ac1b0c1ffca90d7",
	name: "getDashboardSummaryFn",
	filename: "src/server/dashboard.ts"
}, (opts) => getDashboardSummaryFn.__executeServer(opts));
var getDashboardSummaryFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: _enum([
		"1w",
		"1m",
		"3m",
		"6m",
		"1y",
		"all"
	]).default("1m"),
	timezone: string().default("UTC")
})).handler(getDashboardSummaryFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const lookbackParam = data.lookback;
	const timezone = resolveTimezone(data.timezone);
	const { fromDateStr, toDateStr } = getTimezoneLookbackRange(lookbackParam, timezone, { allStrategy: "1y" });
	const [brandResult, competitorsList, enabledPromptsResult, totalPromptsResult] = await Promise.all([
		db.select({
			name: brands.name,
			website: brands.website,
			additionalDomains: brands.additionalDomains,
			delayOverrideHours: brands.delayOverrideHours
		}).from(brands).where(eq(brands.id, data.brandId)).limit(1),
		db.select().from(competitors).where(eq(competitors.brandId, data.brandId)),
		db.select({
			id: prompts.id,
			value: prompts.value,
			systemTags: prompts.systemTags,
			tags: prompts.tags
		}).from(prompts).where(and(eq(prompts.brandId, data.brandId), eq(prompts.enabled, true))),
		db.select({ count: count() }).from(prompts).where(and(eq(prompts.brandId, data.brandId), eq(prompts.enabled, true)))
	]);
	const brandWebsite = brandResult[0]?.website || "";
	const primaryBrandDomain = extractDomain(brandWebsite);
	const additionalBrandDomains = (brandResult[0]?.additionalDomains || []).map(extractDomain);
	const brandDomains = new Set([primaryBrandDomain, ...additionalBrandDomains].filter(Boolean));
	const competitorDomains = new Set(competitorsList.flatMap((c) => c.domains.map(extractDomain)).filter(Boolean));
	const totalPrompts = totalPromptsResult[0]?.count || 0;
	const enabledPromptIds = enabledPromptsResult.map((p) => p.id);
	const brandedPromptIds = enabledPromptsResult.filter((p) => getEffectiveBrandedStatus(p.systemTags || [], p.tags || []).isBranded).map((p) => p.id);
	const [summaryResult, perPromptVisibility, perPromptCitations] = await Promise.all([
		getDashboardSummary(data.brandId, fromDateStr, toDateStr, timezone, enabledPromptIds),
		getPerPromptVisibilityTimeSeries(data.brandId, fromDateStr, toDateStr, timezone, enabledPromptIds),
		getPerPromptDailyCitationStats(data.brandId, fromDateStr, toDateStr, timezone, enabledPromptIds)
	]);
	const summary = summaryResult[0];
	const totalRuns = summary ? Number(summary.total_runs) : 0;
	const lastUpdatedAt = summary?.last_updated || null;
	const dateRange = generateDateRange(new Date(fromDateStr), new Date(toDateStr));
	const { dailyVisibilityMap, totalBrandedRuns, totalBrandedMentioned, totalNonBrandedRuns, totalNonBrandedMentioned } = applyPerPromptLVCF(perPromptVisibility, dateRange, brandedPromptIds);
	const totalQualifyingRuns = totalBrandedRuns + totalNonBrandedRuns;
	const totalMentioned = totalBrandedMentioned + totalNonBrandedMentioned;
	const averageVisibility = percentOrNull(totalMentioned, totalQualifyingRuns);
	const nonBrandedVisibility = percentOrNull(totalNonBrandedMentioned, totalNonBrandedRuns);
	const brandedVisibility = percentOrNull(totalBrandedMentioned, totalBrandedRuns);
	const visibilityTimeSeries = dateRange.map((date) => {
		const d = dailyVisibilityMap.get(date);
		if (!d) return {
			date,
			overall: null,
			nonBranded: null,
			branded: null
		};
		const t = d.branded.total + d.nonBranded.total;
		const m = d.branded.mentioned + d.nonBranded.mentioned;
		if (t === 0) return {
			date,
			overall: null,
			nonBranded: null,
			branded: null
		};
		return {
			date,
			overall: Math.round(m / t * 100),
			nonBranded: d.nonBranded.total > 0 ? Math.round(d.nonBranded.mentioned / d.nonBranded.total * 100) : null,
			branded: d.branded.total > 0 ? Math.round(d.branded.mentioned / d.branded.total * 100) : null
		};
	});
	const smoothedCitations = applyPerPromptCitationLVCF(perPromptCitations, dateRange, brandResult[0]?.delayOverrideHours, (domain) => categorizeDomain(domain, brandDomains, competitorDomains));
	const citationTimeSeries = dateRange.map((date) => {
		const c = smoothedCitations.get(date);
		if (!c) return {
			date,
			...emptyCategoryCounts()
		};
		return {
			date,
			...toRoundedPercentages(c)
		};
	});
	return {
		totalPrompts: Number(totalPrompts),
		totalRuns,
		averageVisibility,
		nonBrandedVisibility,
		brandedVisibility,
		visibilityTimeSeries,
		citationTimeSeries,
		lastUpdatedAt
	};
});
//#endregion
export { getDashboardSummaryFn_createServerFn_handler };

//# sourceMappingURL=dashboard-D4kQaaVZ.mjs.map