import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { D as number, M as string, O as object, f as array, p as boolean } from "../_libs/zod.mjs";
import { f as extractDomain } from "./domain-categories-IivSiXtp.mjs";
import { c as generateDateRange } from "./chart-utils-fSx3DwB3.mjs";
import { m as selectPremiumModels, p as premiumSlotsUsed } from "./plans-D-CRwAoX.mjs";
import { L as sql, d as and, f as eq, m as gte, s as count, u as desc } from "../_libs/drizzle-orm.mjs";
import { a as competitors, d as prompts, r as brands, t as SYSTEM_TAGS, u as promptRuns } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { s as assertPromptSaveAllowed } from "./entitlements-BlArge5u.mjs";
import { n as getEffectiveBrandedStatus, t as computeSystemTags } from "./tag-utils-C10EeA61.mjs";
import { t as createMultiplePromptJobSchedulers } from "./job-scheduler-PGB1J6XT.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, d as requireBrandRole, l as requireBrandAccess, o as promptForUser, t as BRAND_WRITER_ROLES } from "./helpers-phr0Aqka.mjs";
import { D as getPromptsFirstEvaluatedAt, E as getPromptWebQueryCounts, O as getPromptsSummary, S as getPromptDailyStats, T as getPromptWebQueriesForMapping, b as getPromptCitationUrlStats, x as getPromptCompetitorDailyStats } from "./postgres-read-BdoLn4e5.mjs";
import { a as tallyCitations, i as rollUpCitationUrls, r as rollUpCitationDomains, t as buildGoogleModule } from "./google-module-Ce5FBGMc.mjs";
import { n as classifyUrl } from "./domain-categories.server-CJIsNjFt.mjs";
import { n as expeditePromptRuns, r as promptsGainingPremium } from "./run-config-changes-BKthmPUu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prompts-hEV10dpx.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "f25e39f4-0ae8-456b-a9aa-8a389c6ad5e3", e._sentryDebugIdIdentifier = "sentry-dbid-f25e39f4-0ae8-456b-a9aa-8a389c6ad5e3");
	} catch (e) {}
})();
/**
* Server functions for prompt operations.
* Replaces apps/web/src/app/api/prompts/* and brands/[id]/prompts-summary API routes.
*/
/**
* Get metadata for a single prompt
*/
var getPromptMetadataFn_createServerFn_handler = createServerRpc({
	id: "eb27ffe4b4de414af48ab281cd6f50b7085b81e9f2f8272b3361f33396153961",
	name: "getPromptMetadataFn",
	filename: "src/server/prompts.ts"
}, (opts) => getPromptMetadataFn.__executeServer(opts));
var getPromptMetadataFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	promptId: string()
})).handler(getPromptMetadataFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const prompt = await db.query.prompts.findFirst({ where: and(eq(prompts.id, data.promptId), eq(prompts.brandId, data.brandId)) });
	if (!prompt) return null;
	let nextRunAt = null;
	try {
		const row = (await db.execute(sql`
				SELECT start_after
				FROM pgboss.job
				WHERE name = 'process-prompt'
				  AND state IN ('created', 'retry')
				  AND (data->>'promptId') = ${data.promptId}
				  AND start_after > NOW()
				ORDER BY start_after ASC
				LIMIT 1
			`)).rows?.[0];
		if (row?.start_after) nextRunAt = new Date(row.start_after).toISOString();
	} catch {}
	return {
		id: prompt.id,
		brandId: prompt.brandId,
		value: prompt.value,
		enabled: prompt.enabled,
		tags: prompt.tags || [],
		systemTags: prompt.systemTags || [],
		nextRunAt
	};
});
var getPromptsSummaryFn_createServerFn_handler = createServerRpc({
	id: "fa6e609692c85ea891db536dfa72149c08c748166ef79f1eb571f985da9ea8c0",
	name: "getPromptsSummaryFn",
	filename: "src/server/prompts.ts"
}, (opts) => getPromptsSummaryFn.__executeServer(opts));
var getPromptsSummaryFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: string().optional().default("1m"),
	webSearchEnabled: string().optional(),
	model: string().optional(),
	tags: string().optional()
})).handler(getPromptsSummaryFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const allPrompts = await db.select().from(prompts).where(and(eq(prompts.brandId, data.brandId), eq(prompts.enabled, true))).orderBy(desc(prompts.createdAt));
	const promptIds = allPrompts.map((p) => p.id);
	if (promptIds.length === 0) return {
		prompts: [],
		totalPrompts: 0,
		availableTags: []
	};
	const timezone = "UTC";
	let fromDateStr = null;
	let toDateStr = null;
	const lookbackParam = data.lookback || "1m";
	if (lookbackParam && lookbackParam !== "all") {
		const toDate = /* @__PURE__ */ new Date();
		const fromDate = /* @__PURE__ */ new Date();
		switch (lookbackParam) {
			case "1w":
				fromDate.setDate(fromDate.getDate() - 7);
				break;
			case "1m":
				fromDate.setMonth(fromDate.getMonth() - 1);
				break;
			case "3m":
				fromDate.setMonth(fromDate.getMonth() - 3);
				break;
			case "6m":
				fromDate.setMonth(fromDate.getMonth() - 6);
				break;
			case "1y": fromDate.setFullYear(fromDate.getFullYear() - 1);
		}
		fromDateStr = fromDate.toISOString().split("T")[0];
		toDateStr = toDate.toISOString().split("T")[0];
	}
	const webSearchEnabled = data.webSearchEnabled != null ? data.webSearchEnabled === "true" : void 0;
	const [summaryData, firstEvaluatedData] = await Promise.all([getPromptsSummary(data.brandId, fromDateStr, toDateStr, timezone, webSearchEnabled, data.model, promptIds), getPromptsFirstEvaluatedAt(data.brandId, promptIds)]);
	const summaryMap = new Map(summaryData.map((s) => [s.prompt_id, s]));
	const firstEvalMap = new Map(firstEvaluatedData.map((f) => [f.prompt_id, f.first_evaluated_at]));
	const allUserTags = /* @__PURE__ */ new Set();
	const tagFilter = data.tags?.split(",").filter(Boolean) || [];
	const promptSummaries = allPrompts.map((p) => {
		const stats = summaryMap.get(p.id);
		const userTags = p.tags || [];
		const systemTag = getEffectiveBrandedStatus(p.systemTags || [], userTags).isBranded ? SYSTEM_TAGS.BRANDED : SYSTEM_TAGS.UNBRANDED;
		const effectiveTags = userTags.includes(systemTag) ? [...userTags] : [...userTags, systemTag];
		for (const tag of userTags) allUserTags.add(tag);
		const totalRuns = stats ? Number(stats.total_runs) : 0;
		const totalWeightedMentions = stats ? Number(stats.total_weighted_mentions) : 0;
		const averageWeightedMentions = totalRuns > 0 ? totalWeightedMentions / totalRuns : 0;
		return {
			id: p.id,
			value: p.value,
			enabled: p.enabled,
			createdAt: p.createdAt,
			totalRuns,
			brandMentionRate: stats ? Number(stats.brand_mention_rate) : 0,
			competitorMentionRate: stats ? Number(stats.competitor_mention_rate) : 0,
			averageWeightedMentions,
			hasVisibilityData: totalRuns > 0 && (Number(stats?.brand_mention_rate || 0) > 0 || Number(stats?.competitor_mention_rate || 0) > 0),
			lastRunAt: stats?.last_run_date ? new Date(stats.last_run_date) : null,
			firstEvaluatedAt: firstEvalMap.get(p.id) ? new Date(firstEvalMap.get(p.id)) : null,
			tags: effectiveTags
		};
	});
	return {
		prompts: (tagFilter.length > 0 ? promptSummaries.filter((p) => tagFilter.some((t) => p.tags.includes(t))) : promptSummaries).sort((a, b) => {
			const getPriority = (prompt) => {
				if (prompt.hasVisibilityData) return 1;
				if (prompt.totalRuns === 0) return 2;
				return 3;
			};
			const priorityA = getPriority(a);
			const priorityB = getPriority(b);
			if (priorityA !== priorityB) return priorityA - priorityB;
			if (priorityA === 1 && a.averageWeightedMentions !== b.averageWeightedMentions) return b.averageWeightedMentions - a.averageWeightedMentions;
			return a.value.localeCompare(b.value);
		}),
		totalPrompts: promptSummaries.length,
		availableTags: [
			SYSTEM_TAGS.BRANDED,
			SYSTEM_TAGS.UNBRANDED,
			...Array.from(allUserTags).filter((tag) => tag.toLowerCase() !== SYSTEM_TAGS.BRANDED && tag.toLowerCase() !== SYSTEM_TAGS.UNBRANDED).sort()
		]
	};
});
/**
* Mirrors the brand-wide citations view (server/citations.ts) at the single-
* prompt level: classify each citation at the URL level, pull Google AI Mode
* search/shopping surfaces OUT of the source mix into a dedicated Google
* Shopping module, and rebuild the domain distribution from the URL data.
* Undefined when the prompt has nothing citable.
*/
function computePromptCitationStats(input) {
	const { urlStats } = input;
	if (urlStats.length === 0) return void 0;
	const googleModule = buildGoogleModule(urlStats.map((u) => ({
		prompt_id: input.promptId,
		url: u.url,
		domain: u.domain,
		title: u.title,
		count: u.count
	})), input.brandName, input.competitors, () => input.promptValue);
	const specificUrls = rollUpCitationUrls(urlStats, (domain, url, title) => classifyUrl(domain, url, title, input.brandDomains, input.competitorDomains));
	const domainDistribution = rollUpCitationDomains(specificUrls);
	const { categoryCounts, totalCitations, pageTypeDistribution } = tallyCitations(specificUrls);
	if (totalCitations === 0) return void 0;
	return {
		totalCitations,
		uniqueDomains: domainDistribution.length,
		categoryCounts,
		domainDistribution,
		specificUrls,
		pageTypeDistribution,
		googleModule
	};
}
/**
* Get stats for a single prompt (mentions, web queries, citations)
* Replicates: apps/web/src/app/api/prompts/[promptId]/stats/route.ts
*/
var getPromptStatsFn_createServerFn_handler = createServerRpc({
	id: "b65bdf31fb31f12f54a157023d14b5d6a5fc59f44ab1f25044f5e8f26e96a710",
	name: "getPromptStatsFn",
	filename: "src/server/prompts.ts"
}, (opts) => getPromptStatsFn.__executeServer(opts));
var getPromptStatsFn = createServerFn({ method: "GET" }).validator(object({
	promptId: string(),
	days: number().optional().default(7)
})).handler(getPromptStatsFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	const owned = await promptForUser(session.user.id, data.promptId);
	if (!owned) throw new Error("Prompt not found");
	const prompt = [{
		id: owned.id,
		brandId: owned.brandId,
		value: owned.value
	}];
	const fromDate = /* @__PURE__ */ new Date();
	fromDate.setDate(fromDate.getDate() - data.days);
	const toDate = /* @__PURE__ */ new Date();
	const fromDateStr = fromDate.toISOString().split("T")[0];
	const toDateStr = toDate.toISOString().split("T")[0];
	const timezone = "UTC";
	const timeCondition = gte(promptRuns.createdAt, fromDate);
	const [mentionStatsResult, competitorMentionsResult] = await Promise.all([db.select({
		totalRuns: count(),
		brandMentions: sql`SUM(CASE WHEN ${promptRuns.brandMentioned} THEN 1 ELSE 0 END)`
	}).from(promptRuns).where(and(eq(promptRuns.promptId, data.promptId), timeCondition)), db.select({ competitorsMentioned: promptRuns.competitorsMentioned }).from(promptRuns).where(and(eq(promptRuns.promptId, data.promptId), timeCondition, sql`array_length(${promptRuns.competitorsMentioned}, 1) > 0`))]);
	const mentionData = mentionStatsResult[0];
	const mentionStats = [];
	if (mentionData) {
		const [brandResult, allCompetitors] = await Promise.all([db.select({ name: brands.name }).from(brands).where(eq(brands.id, prompt[0].brandId)).limit(1), db.select({ name: competitors.name }).from(competitors).where(eq(competitors.brandId, prompt[0].brandId))]);
		const brandName = brandResult[0]?.name;
		if (brandName) mentionStats.push({
			name: brandName,
			count: Number(mentionData.brandMentions)
		});
		const competitorCounts = {};
		allCompetitors.forEach((c) => {
			competitorCounts[c.name] = 0;
		});
		competitorMentionsResult.forEach((row) => {
			(row.competitorsMentioned || []).forEach((name) => {
				if (name?.trim() && Object.hasOwn(competitorCounts, name)) competitorCounts[name] += 1;
			});
		});
		Object.entries(competitorCounts).forEach(([name, cnt]) => {
			mentionStats.push({
				name,
				count: cnt
			});
		});
		const noMentionRuns = await db.select({ count: count() }).from(promptRuns).where(and(eq(promptRuns.promptId, data.promptId), timeCondition, eq(promptRuns.brandMentioned, false), sql`array_length(${promptRuns.competitorsMentioned}, 1) IS NULL OR array_length(${promptRuns.competitorsMentioned}, 1) = 0`));
		const noMentionCount = Number(noMentionRuns[0]?.count || 0);
		if (noMentionCount > 0) mentionStats.push({
			name: "(no brand mentions)",
			count: noMentionCount
		});
	}
	mentionStats.sort((a, b) => a.count === b.count ? a.name.localeCompare(b.name) : b.count - a.count);
	const [brandInfo, competitorsList] = await Promise.all([db.select({
		name: brands.name,
		website: brands.website,
		additionalDomains: brands.additionalDomains
	}).from(brands).where(eq(brands.id, prompt[0].brandId)).limit(1), db.select({
		id: competitors.id,
		name: competitors.name,
		domains: competitors.domains
	}).from(competitors).where(eq(competitors.brandId, prompt[0].brandId))]);
	const primaryBrandDomain = brandInfo[0] ? extractDomain(brandInfo[0].website) : "";
	const additionalBrandDomains = (brandInfo[0]?.additionalDomains || []).map(extractDomain);
	const brandDomains = new Set([primaryBrandDomain, ...additionalBrandDomains].filter(Boolean));
	const competitorDomains = new Set(competitorsList.flatMap((c) => c.domains.map(extractDomain)).filter(Boolean));
	const citationStats = computePromptCitationStats({
		urlStats: await getPromptCitationUrlStats(data.promptId, fromDateStr, toDateStr, timezone),
		promptId: data.promptId,
		promptValue: prompt[0].value,
		brandName: brandInfo[0]?.name ?? "",
		brandDomains,
		competitors: competitorsList.map((c) => ({
			id: c.id,
			name: c.name
		})),
		competitorDomains
	});
	return {
		prompt: prompt[0],
		aggregations: {
			mentionStats,
			citationStats,
			totalRuns: Number(mentionData?.totalRuns || 0)
		}
	};
});
var getPromptRunsFn_createServerFn_handler = createServerRpc({
	id: "12cbd6724c83b38a68c9acb94079d53b83627e6ed2f48407b1d9ba03620fff32",
	name: "getPromptRunsFn",
	filename: "src/server/prompts.ts"
}, (opts) => getPromptRunsFn.__executeServer(opts));
var getPromptRunsFn = createServerFn({ method: "GET" }).validator(object({
	promptId: string(),
	page: number().optional().default(1),
	limit: number().optional().default(10),
	days: number().optional().default(7)
})).handler(getPromptRunsFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	if (!await promptForUser(session.user.id, data.promptId)) throw new Error("Prompt not found");
	const fromDate = /* @__PURE__ */ new Date();
	fromDate.setDate(fromDate.getDate() - data.days);
	const offset = (data.page - 1) * data.limit;
	const [runs, totalResult] = await Promise.all([db.query.promptRuns.findMany({
		where: and(eq(promptRuns.promptId, data.promptId), gte(promptRuns.createdAt, fromDate)),
		orderBy: desc(promptRuns.createdAt),
		limit: data.limit,
		offset
	}), db.select({ count: count() }).from(promptRuns).where(and(eq(promptRuns.promptId, data.promptId), gte(promptRuns.createdAt, fromDate)))]);
	return {
		runs: runs.map((r) => ({
			...r,
			rawOutput: r.rawOutput
		})),
		total: totalResult[0]?.count || 0,
		page: data.page,
		limit: data.limit,
		hasMore: offset + runs.length < (totalResult[0]?.count || 0)
	};
});
var updatePromptsFn_createServerFn_handler = createServerRpc({
	id: "53ae09ac8d1d9a67a01be5be1349ab3df499551d890c4334b6c8c2611f9ff1f3",
	name: "updatePromptsFn",
	filename: "src/server/prompts.ts"
}, (opts) => updatePromptsFn.__executeServer(opts));
var updatePromptsFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	prompts: array(object({
		id: string().optional(),
		value: string(),
		enabled: boolean().optional().default(true),
		tags: array(string()).optional(),
		/**
		* Premium models to track this prompt on, grounded — one of the org's
		* premium slots each.
		*/
		premiumModels: array(string()).optional()
	})).max(100, `A brand may have at most 100 prompts.`)
})).handler(updatePromptsFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandRole(session.user.id, data.brandId, BRAND_WRITER_ROLES);
	const brand = await db.query.brands.findFirst({ where: eq(brands.id, data.brandId) });
	if (!brand) throw new Error("Brand not found");
	const existingRows = await db.select({
		id: prompts.id,
		enabled: prompts.enabled,
		premiumModels: prompts.premiumModels
	}).from(prompts).where(eq(prompts.brandId, data.brandId));
	const existingIds = new Set(existingRows.map((p) => p.id));
	const existingById = new Map(existingRows.map((p) => [p.id, p]));
	const delta = {
		prompts: 0,
		premiumPairings: 0
	};
	for (const p of data.prompts) {
		const before = p.id ? existingById.get(p.id) : void 0;
		if (p.id && !before) continue;
		const after = {
			enabled: p.enabled,
			premiumModels: selectPremiumModels(p.premiumModels)
		};
		delta.prompts += (p.enabled ? 1 : 0) - (before?.enabled ? 1 : 0);
		delta.premiumPairings += premiumSlotsUsed([after]) - premiumSlotsUsed(before ? [before] : []);
	}
	await assertPromptSaveAllowed(brand.organizationId, delta);
	const saved = await db.transaction(async (tx) => {
		const toUpdate = data.prompts.filter((p) => p.id);
		const toInsert = data.prompts.filter((p) => !p.id);
		for (const p of toUpdate) await tx.update(prompts).set({
			value: p.value,
			enabled: p.enabled,
			tags: p.tags || [],
			systemTags: computeSystemTags(p.value, brand.name, brand.website),
			premiumModels: selectPremiumModels(p.premiumModels)
		}).where(and(eq(prompts.id, p.id), eq(prompts.brandId, data.brandId)));
		if (toInsert.length > 0) await tx.insert(prompts).values(toInsert.map((p) => ({
			brandId: data.brandId,
			value: p.value,
			enabled: p.enabled,
			tags: p.tags || [],
			systemTags: computeSystemTags(p.value, brand.name, brand.website),
			premiumModels: selectPremiumModels(p.premiumModels)
		})));
		return tx.query.prompts.findMany({ where: eq(prompts.brandId, data.brandId) });
	});
	const newPromptIds = saved.filter((p) => !existingIds.has(p.id)).map((p) => p.id);
	if (newPromptIds.length > 0) createMultiplePromptJobSchedulers(newPromptIds).catch((err) => console.error("Failed to create job schedulers for new prompts:", err));
	await expeditePromptRuns(promptsGainingPremium(existingById, saved));
	return saved;
});
var getPromptChartDataFn_createServerFn_handler = createServerRpc({
	id: "73d3175079a6ba9be1ddd1c910a09be618e50c8506a531cfc78cf61bf7f373a9",
	name: "getPromptChartDataFn",
	filename: "src/server/prompts.ts"
}, (opts) => getPromptChartDataFn.__executeServer(opts));
var getPromptChartDataFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	promptId: string(),
	lookback: string().optional().default("1m"),
	webSearchEnabled: string().optional(),
	model: string().optional(),
	timezone: string().optional()
})).handler(getPromptChartDataFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
	const lookbackParam = data.lookback || "1m";
	let fromDateStr = null;
	let toDateStr = null;
	let startDate;
	let endDate;
	const now = /* @__PURE__ */ new Date();
	const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
	if (lookbackParam && lookbackParam !== "all") {
		toDateStr = todayStr;
		const fromDate = new Date(now);
		switch (lookbackParam) {
			case "1w":
				fromDate.setDate(fromDate.getDate() - 6);
				break;
			case "1m":
				fromDate.setMonth(fromDate.getMonth() - 1);
				break;
			case "3m":
				fromDate.setMonth(fromDate.getMonth() - 3);
				break;
			case "6m":
				fromDate.setMonth(fromDate.getMonth() - 6);
				break;
			case "1y": fromDate.setFullYear(fromDate.getFullYear() - 1);
		}
		fromDateStr = fromDate.toLocaleDateString("en-CA", { timeZone: timezone });
		startDate = new Date(fromDateStr);
		endDate = new Date(toDateStr);
	} else {
		toDateStr = todayStr;
		startDate = /* @__PURE__ */ new Date();
		endDate = new Date(todayStr);
	}
	const [ownedPrompt, brandData, competitorsData] = await Promise.all([
		promptForUser(session.user.id, data.promptId),
		db.select().from(brands).where(eq(brands.id, data.brandId)).limit(1),
		db.select().from(competitors).where(eq(competitors.brandId, data.brandId))
	]);
	const promptData = ownedPrompt ? [{
		id: ownedPrompt.id,
		value: ownedPrompt.value,
		brandId: ownedPrompt.brandId
	}] : [];
	if (promptData.length === 0) throw new Error("Prompt not found");
	if (brandData.length === 0) throw new Error("Brand not found");
	if (promptData[0].brandId !== data.brandId) throw new Error("Access denied");
	const prompt = promptData[0];
	const brand = brandData[0];
	const brandCompetitors = competitorsData;
	const webSearchEnabled = data.webSearchEnabled != null ? data.webSearchEnabled === "true" : void 0;
	const [dailyStats, competitorStats, webQueryData] = await Promise.all([
		getPromptDailyStats(data.promptId, fromDateStr, toDateStr, timezone, webSearchEnabled, data.model),
		getPromptCompetitorDailyStats(data.promptId, fromDateStr, toDateStr, timezone, webSearchEnabled, data.model),
		getPromptWebQueriesForMapping(data.promptId, fromDateStr, toDateStr, timezone)
	]);
	if (lookbackParam === "all" && dailyStats.length > 0) {
		const sortedDates = dailyStats.map((s) => String(s.date)).sort();
		startDate = new Date(sortedDates[0]);
	}
	const dateRange = generateDateRange(startDate, endDate);
	const dailyStatsMap = /* @__PURE__ */ new Map();
	for (const stat of dailyStats) dailyStatsMap.set(String(stat.date), {
		total_runs: Number(stat.total_runs),
		brand_mentioned_count: Number(stat.brand_mentioned_count)
	});
	const competitorStatsMap = /* @__PURE__ */ new Map();
	for (const stat of competitorStats) {
		const dateStr = String(stat.date);
		if (!competitorStatsMap.has(dateStr)) competitorStatsMap.set(dateStr, /* @__PURE__ */ new Map());
		competitorStatsMap.get(dateStr).set(stat.competitor_name, Number(stat.mention_count));
	}
	const sortedCompetitors = [...brandCompetitors].sort((a, b) => a.name.localeCompare(b.name));
	const chartData = dateRange.map((date) => {
		const dayStat = dailyStatsMap.get(date);
		const totalRuns = dayStat?.total_runs || 0;
		const dataPoint = { date };
		if (totalRuns === 0) {
			dataPoint[brand.id] = null;
			sortedCompetitors.forEach((c) => {
				dataPoint[c.id] = null;
			});
			return dataPoint;
		}
		dataPoint[brand.id] = Math.round((dayStat?.brand_mentioned_count || 0) / totalRuns * 100);
		const competitorCounts = competitorStatsMap.get(date) || /* @__PURE__ */ new Map();
		sortedCompetitors.forEach((c) => {
			dataPoint[c.id] = Math.round((competitorCounts.get(c.name) || 0) / totalRuns * 100);
		});
		return dataPoint;
	});
	const totalRuns = dailyStats.reduce((sum, s) => sum + Number(s.total_runs), 0);
	const hasVisibilityData = chartData.some((dp) => {
		return [brand.id, ...sortedCompetitors.map((c) => c.id)].some((id) => dp[id] !== null && dp[id] !== void 0 && Number(dp[id]) > 0);
	});
	const lastDataPoint = chartData.filter((p) => p[brand.id] !== null).pop();
	const lastBrandVisibility = lastDataPoint ? lastDataPoint[brand.id] : null;
	const webQueryMapping = {};
	const modelWebQueryMappings = {};
	if (webQueryData.length > 0) {
		const oldestQuery = webQueryData[0];
		if (oldestQuery) {
			const oldestTime = new Date(oldestQuery.created_at_iso).getTime();
			const oldestQueries = webQueryData.filter((q) => new Date(q.created_at_iso).getTime() === oldestTime).map((q) => q.web_query).sort();
			if (oldestQueries.length > 0) webQueryMapping[data.promptId] = oldestQueries[0];
		}
		const seenModels = new Set(webQueryData.map((q) => q.model));
		for (const model of seenModels) {
			const modelQueries = webQueryData.filter((q) => q.model === model);
			if (modelQueries.length > 0) {
				const oldest = modelQueries[0];
				const oldestTime = new Date(oldest.created_at_iso).getTime();
				const sorted = modelQueries.filter((q) => new Date(q.created_at_iso).getTime() === oldestTime).map((q) => q.web_query).sort();
				if (sorted.length > 0) {
					if (!modelWebQueryMappings[model]) modelWebQueryMappings[model] = {};
					modelWebQueryMappings[model][data.promptId] = sorted[0];
				}
			}
		}
	}
	return {
		prompt: {
			id: prompt.id,
			value: prompt.value
		},
		chartData,
		brand,
		competitors: brandCompetitors,
		totalRuns,
		hasVisibilityData,
		lastBrandVisibility,
		webQueryMapping,
		modelWebQueryMappings
	};
});
var getPromptWebQueryFn_createServerFn_handler = createServerRpc({
	id: "21ee4b48e5c1740375c92929be82d877e8d55a96aa2d90c0eaf3a28e1b9a52b7",
	name: "getPromptWebQueryFn",
	filename: "src/server/prompts.ts"
}, (opts) => getPromptWebQueryFn.__executeServer(opts));
var getPromptWebQueryFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	promptId: string(),
	lookback: string().optional().default("1m"),
	model: string().optional(),
	timezone: string().optional()
})).handler(getPromptWebQueryFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const timezone = data.timezone || "UTC";
	const now = /* @__PURE__ */ new Date();
	const toDateStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
	let fromDateStr = null;
	if (data.lookback && data.lookback !== "all") {
		const fromDate = new Date(now);
		switch (data.lookback) {
			case "1w":
				fromDate.setDate(fromDate.getDate() - 6);
				break;
			case "1m":
				fromDate.setMonth(fromDate.getMonth() - 1);
				break;
			case "3m":
				fromDate.setMonth(fromDate.getMonth() - 3);
				break;
			case "6m":
				fromDate.setMonth(fromDate.getMonth() - 6);
				break;
			case "1y": fromDate.setFullYear(fromDate.getFullYear() - 1);
		}
		fromDateStr = fromDate.toLocaleDateString("en-CA", { timeZone: timezone });
	}
	const webQueryData = await getPromptWebQueryCounts(data.promptId, fromDateStr, toDateStr, timezone, data.model);
	let webQuery = null;
	const modelWebQueries = {};
	let maxOverallCount = 0;
	for (const row of webQueryData) {
		if (!modelWebQueries[row.model]) modelWebQueries[row.model] = row.web_query;
		if (row.query_count > maxOverallCount) {
			maxOverallCount = row.query_count;
			webQuery = row.web_query;
		}
	}
	return {
		webQuery,
		modelWebQueries
	};
});
//#endregion
export { getPromptChartDataFn_createServerFn_handler, getPromptMetadataFn_createServerFn_handler, getPromptRunsFn_createServerFn_handler, getPromptStatsFn_createServerFn_handler, getPromptWebQueryFn_createServerFn_handler, getPromptsSummaryFn_createServerFn_handler, updatePromptsFn_createServerFn_handler };

//# sourceMappingURL=prompts-hEV10dpx.mjs.map