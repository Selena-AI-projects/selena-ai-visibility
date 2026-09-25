import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { D as number, M as string, O as object } from "../_libs/zod.mjs";
import { S as toRoundedPercentages, _ as isGoogleSurfaceUrl, d as emptyPageTypeCounts, f as extractDomain, n as CITATION_CATEGORIES, r as CITATION_PAGE_TYPES, u as emptyCategoryCounts, v as normalizeUrl, x as resolvePageType } from "./domain-categories-IivSiXtp.mjs";
import { a as citationDateWindow, n as applyPerPromptKeyedLVCF } from "./chart-utils-fSx3DwB3.mjs";
import { d as and, f as eq } from "../_libs/drizzle-orm.mjs";
import { a as competitors, d as prompts, r as brands, t as SYSTEM_TAGS } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as getEffectiveBrandedStatus } from "./tag-utils-C10EeA61.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, l as requireBrandAccess } from "./helpers-phr0Aqka.mjs";
import { m as getPerPromptDailyCitationPages, p as getPerPromptCitationPages, s as getCitationUrlStats } from "./postgres-read-BdoLn4e5.mjs";
import { a as tallyCitations, i as rollUpCitationUrls, n as emptyGoogleModule, r as rollUpCitationDomains, t as buildGoogleModule } from "./google-module-Ce5FBGMc.mjs";
import { n as classifyUrl, t as categorizeDomain } from "./domain-categories.server-CJIsNjFt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/citations-BPruMMrl.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7dc9e82e-bf1a-4003-8b09-d29acbe2fe75", e._sentryDebugIdIdentifier = "sentry-dbid-7dc9e82e-bf1a-4003-8b09-d29acbe2fe75");
	} catch (e) {}
})();
/**
* Server functions for citation data.
* Replaces apps/web/src/app/api/brands/[id]/citations/route.ts
*/
/**
* Get citation statistics for a brand
*/
var getCitationsFn_createServerFn_handler = createServerRpc({
	id: "5641d455e2edf9b119c506bec5c19457cb537c15c6e0ba75dbd5946581f3a460",
	name: "getCitationsFn",
	filename: "src/server/citations.ts"
}, (opts) => getCitationsFn.__executeServer(opts));
var getCitationsFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	days: number().optional().default(7),
	tags: string().optional(),
	model: string().optional()
})).handler(getCitationsFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const { fromDateStr, toDateStr, prevFromDateStr, prevToDateStr, dateRange } = citationDateWindow(/* @__PURE__ */ new Date(), data.days);
	const timezone = "UTC";
	const [brandResult, competitorsList, allPrompts] = await Promise.all([
		db.select().from(brands).where(eq(brands.id, data.brandId)).limit(1),
		db.select().from(competitors).where(eq(competitors.brandId, data.brandId)),
		db.select({
			id: prompts.id,
			value: prompts.value,
			tags: prompts.tags,
			systemTags: prompts.systemTags
		}).from(prompts).where(and(eq(prompts.brandId, data.brandId), eq(prompts.enabled, true)))
	]);
	const primaryBrandDomain = extractDomain(brandResult[0]?.website || "");
	const additionalBrandDomains = (brandResult[0]?.additionalDomains || []).map(extractDomain);
	const brandDomains = new Set([primaryBrandDomain, ...additionalBrandDomains].filter(Boolean));
	const competitorDomains = new Set(competitorsList.flatMap((c) => c.domains.map(extractDomain)).filter(Boolean));
	const competitorSummary = competitorsList.map((c) => ({
		id: c.id,
		name: c.name,
		domains: c.domains
	}));
	const allUserTags = /* @__PURE__ */ new Set();
	for (const p of allPrompts) for (const tag of p.tags || []) allUserTags.add(tag);
	const userTagsWithoutSystemTags = Array.from(allUserTags).filter((tag) => tag.toLowerCase() !== SYSTEM_TAGS.BRANDED && tag.toLowerCase() !== SYSTEM_TAGS.UNBRANDED).sort();
	const availableTags = [
		SYSTEM_TAGS.BRANDED,
		SYSTEM_TAGS.UNBRANDED,
		...userTagsWithoutSystemTags
	];
	let enabledPromptIds = allPrompts.map((p) => p.id);
	const tagFilter = data.tags?.split(",").filter(Boolean) || [];
	if (tagFilter.length > 0) {
		const filterByBranded = tagFilter.includes(SYSTEM_TAGS.BRANDED);
		const filterByUnbranded = tagFilter.includes(SYSTEM_TAGS.UNBRANDED);
		const nonSystemFilterTags = tagFilter.filter((t) => t !== SYSTEM_TAGS.BRANDED && t !== SYSTEM_TAGS.UNBRANDED);
		enabledPromptIds = allPrompts.filter((p) => {
			const systemTags = p.systemTags || [];
			const userTags = p.tags || [];
			if (filterByBranded || filterByUnbranded) {
				const effectiveStatus = getEffectiveBrandedStatus(systemTags, userTags);
				if (filterByBranded && effectiveStatus.isBranded) return true;
				if (filterByUnbranded && !effectiveStatus.isBranded) return true;
			}
			if (nonSystemFilterTags.length > 0) {
				const allTagsLower = [...systemTags, ...userTags].map((t) => t.toLowerCase());
				if (nonSystemFilterTags.some((ft) => allTagsLower.includes(ft))) return true;
			}
			if ((filterByBranded || filterByUnbranded) && nonSystemFilterTags.length === 0) return false;
			return false;
		}).map((p) => p.id);
		if (enabledPromptIds.length === 0) return {
			totalCitations: 0,
			uniqueDomains: 0,
			categoryCounts: emptyCategoryCounts(),
			domainDistribution: [],
			specificUrls: [],
			pageTypeDistribution: [],
			googleModule: emptyGoogleModule(),
			availableTags,
			citationTimeSeries: [],
			pageTypeTimeSeries: [],
			competitors: competitorSummary,
			competitorOnlyPrompts: [],
			whatsChanged: {
				newUrls: [],
				droppedUrls: [],
				titleChanges: [],
				newDomains: [],
				droppedDomains: []
			}
		};
	}
	const [urlStats, perPromptDailyPages, perPromptPages, prevUrlStats] = await Promise.all([
		getCitationUrlStats(data.brandId, fromDateStr, toDateStr, timezone, enabledPromptIds, data.model),
		getPerPromptDailyCitationPages(data.brandId, fromDateStr, toDateStr, timezone, enabledPromptIds, data.model),
		getPerPromptCitationPages(data.brandId, fromDateStr, toDateStr, timezone, enabledPromptIds, data.model),
		getCitationUrlStats(data.brandId, prevFromDateStr, prevToDateStr, timezone, enabledPromptIds, data.model)
	]);
	function categorizeDomain$1(domain) {
		return categorizeDomain(domain, brandDomains, competitorDomains);
	}
	const classify = (domain, url, title) => classifyUrl(domain, url, title, brandDomains, competitorDomains);
	const prevDomainMap = /* @__PURE__ */ new Map();
	for (const { url, domain, count } of prevUrlStats) {
		if (isGoogleSurfaceUrl(url)) continue;
		prevDomainMap.set(domain, (prevDomainMap.get(domain) ?? 0) + Number(count));
	}
	const prevUrlMap = /* @__PURE__ */ new Map();
	for (const { url, domain, title, count } of prevUrlStats) {
		if (isGoogleSurfaceUrl(url)) continue;
		const normalizedUrl = normalizeUrl(url);
		const existing = prevUrlMap.get(normalizedUrl);
		if (existing) {
			existing.count += Number(count);
			if (!existing.title && title) existing.title = title;
		} else prevUrlMap.set(normalizedUrl, {
			count: Number(count),
			title: title || void 0,
			domain
		});
	}
	const promptCountByUrl = /* @__PURE__ */ new Map();
	for (const { url, prompt_count } of urlStats) {
		if (isGoogleSurfaceUrl(url)) continue;
		const normalizedUrl = normalizeUrl(url);
		promptCountByUrl.set(normalizedUrl, Math.max(promptCountByUrl.get(normalizedUrl) ?? 0, Number(prompt_count)));
	}
	const specificUrls = rollUpCitationUrls(urlStats, classify).map((url) => ({
		...url,
		promptCount: promptCountByUrl.get(url.url) ?? 0,
		isNew: !prevUrlMap.has(url.url)
	}));
	const domainDistribution = rollUpCitationDomains(specificUrls).map((domain) => {
		const previousCount = prevDomainMap.get(domain.domain) || 0;
		return {
			...domain,
			previousCount,
			changePercent: previousCount > 0 ? Math.round((domain.count - previousCount) / previousCount * 100) : null
		};
	});
	const { categoryCounts, totalCitations, pageTypeDistribution } = tallyCitations(specificUrls);
	/** By normalized URL, for the period-over-period comparisons below. */
	const currentUrls = new Map(specificUrls.map((url) => [url.url, url]));
	const promptLookup = new Map(allPrompts.map((p) => [p.id, p]));
	const googleModule = buildGoogleModule(perPromptPages, brandResult[0]?.name ?? "", competitorsList.map((c) => ({
		id: c.id,
		name: c.name
	})), (id) => promptLookup.get(id)?.value);
	const cadenceHours = brandResult[0]?.delayOverrideHours;
	const urlCategory = new Map(specificUrls.map((u) => [u.url, u.category]));
	const urlPageType = new Map(specificUrls.map((u) => [u.url, u.pageType]));
	const categoryRows = [];
	const pageTypeRows = [];
	for (const r of perPromptDailyPages) {
		if (!r.url || isGoogleSurfaceUrl(r.url)) continue;
		const c = Number(r.count);
		const date = String(r.date);
		const nu = normalizeUrl(r.url);
		const category = urlCategory.get(nu) ?? classify(r.domain, r.url, r.title);
		const pageType = urlPageType.get(nu) ?? resolvePageType(r.url, r.title, category);
		categoryRows.push({
			prompt_id: r.prompt_id,
			date,
			key: category,
			count: c
		});
		pageTypeRows.push({
			prompt_id: r.prompt_id,
			date,
			key: pageType,
			count: c
		});
	}
	const smoothedCategories = applyPerPromptKeyedLVCF(categoryRows, dateRange, cadenceHours, CITATION_CATEGORIES);
	const smoothedPageTypes = applyPerPromptKeyedLVCF(pageTypeRows, dateRange, cadenceHours, CITATION_PAGE_TYPES);
	const citationTimeSeries = dateRange.map((date) => {
		const c = smoothedCategories.get(date);
		if (!c) return {
			date,
			...emptyCategoryCounts()
		};
		return {
			date,
			...toRoundedPercentages(c)
		};
	});
	const pageTypeTimeSeries = dateRange.map((date) => {
		const c = smoothedPageTypes.get(date);
		if (!c) return {
			date,
			...emptyPageTypeCounts()
		};
		return {
			date,
			...toRoundedPercentages(c)
		};
	});
	const MIN_COUNT_FOR_WHATS_CHANGED = 2;
	const newUrls = specificUrls.filter((u) => u.isNew && u.count >= MIN_COUNT_FOR_WHATS_CHANGED).slice(0, 10).map((u) => ({
		url: u.url,
		domain: u.domain,
		count: u.count,
		promptCount: u.promptCount,
		category: u.category
	}));
	const droppedUrls = [];
	for (const [url, prevData] of prevUrlMap.entries()) {
		if (prevData.count < MIN_COUNT_FOR_WHATS_CHANGED) continue;
		const currentCount = currentUrls.get(url)?.count || 0;
		if ((prevData.count - currentCount) / prevData.count * 100 >= 50) droppedUrls.push({
			url,
			domain: prevData.domain,
			previousCount: prevData.count,
			currentCount,
			category: classify(prevData.domain, url, prevData.title)
		});
	}
	droppedUrls.sort((a, b) => b.previousCount - a.previousCount);
	const titleChanges = [];
	for (const [url, currentData] of currentUrls.entries()) {
		const prevData = prevUrlMap.get(url);
		if (!prevData) continue;
		if (currentData.title && prevData.title && currentData.title !== prevData.title) titleChanges.push({
			url,
			domain: currentData.domain,
			currentTitle: currentData.title,
			previousTitle: prevData.title,
			category: classify(currentData.domain, url, currentData.title)
		});
	}
	const currentDomainSet = new Set(domainDistribution.map((d) => d.domain));
	const newDomains = domainDistribution.filter((d) => d.previousCount === 0 && d.count >= MIN_COUNT_FOR_WHATS_CHANGED).sort((a, b) => b.count - a.count).slice(0, 10).map((d) => ({
		domain: d.domain,
		count: d.count,
		category: d.category
	}));
	const droppedDomains = [];
	for (const [domain, prevCount] of prevDomainMap.entries()) {
		if (prevCount < MIN_COUNT_FOR_WHATS_CHANGED) continue;
		if (!currentDomainSet.has(domain)) droppedDomains.push({
			domain,
			previousCount: prevCount,
			category: categorizeDomain$1(domain)
		});
	}
	droppedDomains.sort((a, b) => b.previousCount - a.previousCount);
	const competitorDomainEntries = competitorsList.flatMap((c) => c.domains.map((d) => ({
		domain: extractDomain(d),
		competitorId: c.id
	}))).filter((e) => e.domain);
	function resolveCompetitorId(citationDomain) {
		const normalized = extractDomain(citationDomain);
		for (const entry of competitorDomainEntries) if (normalized === entry.domain || normalized.endsWith(`.${entry.domain}`)) return entry.competitorId;
	}
	const promptCitationFlags = /* @__PURE__ */ new Map();
	for (const row of perPromptPages) {
		const cat = categorizeDomain$1(row.domain);
		let entry = promptCitationFlags.get(row.prompt_id);
		if (!entry) {
			entry = {
				hasBrand: false,
				hasCompetitor: false,
				competitorCount: 0,
				competitorIds: /* @__PURE__ */ new Set()
			};
			promptCitationFlags.set(row.prompt_id, entry);
		}
		if (cat === "brand") entry.hasBrand = true;
		if (cat === "competitor") {
			entry.hasCompetitor = true;
			entry.competitorCount += Number(row.count);
			const compId = resolveCompetitorId(row.domain);
			if (compId) entry.competitorIds.add(compId);
		}
	}
	const competitorOnlyPrompts = Array.from(promptCitationFlags.entries()).filter(([, data]) => data.hasCompetitor && !data.hasBrand).map(([id, data]) => {
		const prompt = promptLookup.get(id);
		if (!prompt) return null;
		return {
			id,
			value: prompt.value,
			competitorCitationCount: data.competitorCount,
			uniqueCompetitors: data.competitorIds.size
		};
	}).filter((p) => p !== null).sort((a, b) => b.competitorCitationCount - a.competitorCitationCount);
	return {
		totalCitations,
		uniqueDomains: domainDistribution.length,
		categoryCounts,
		domainDistribution,
		specificUrls,
		pageTypeDistribution,
		googleModule,
		availableTags,
		citationTimeSeries,
		pageTypeTimeSeries,
		competitors: competitorSummary,
		competitorOnlyPrompts,
		whatsChanged: {
			newUrls,
			droppedUrls: droppedUrls.slice(0, 10),
			titleChanges: titleChanges.slice(0, 10),
			newDomains,
			droppedDomains: droppedDomains.slice(0, 10)
		}
	};
});
//#endregion
export { getCitationsFn_createServerFn_handler };

//# sourceMappingURL=citations-BPruMMrl.mjs.map