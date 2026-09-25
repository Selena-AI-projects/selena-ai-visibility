import { _ as isGoogleSurfaceUrl, b as parseGoogleSearchQuery, d as emptyPageTypeCounts, g as isGoogleShoppingUrl, h as isGoogleSearchUrl, o as attributeProduct, r as CITATION_PAGE_TYPES, u as emptyCategoryCounts, v as normalizeUrl, x as resolvePageType, y as parseGoogleProductName } from "./domain-categories-IivSiXtp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/google-module-Ce5FBGMc.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "60c06474-c547-41d1-9fc9-b57ffab6d5ab", e._sentryDebugIdIdentifier = "sentry-dbid-60c06474-c547-41d1-9fc9-b57ffab6d5ab");
	} catch (e) {}
})();
/**
* Rolling raw citation rows up into the shape both citation views render.
*
* The brand-wide view (server/citations.ts) and the single-prompt view
* (server/prompts.ts) ask the same three questions of the same rows — which
* URLs, which domains, which categories — and only differ in what they hang off
* the answers (period-over-period deltas brand-wide, nothing per prompt). The
* questions live here so the two views cannot answer them differently; the
* decorations stay with their callers.
*
* Google surfaces are dropped throughout: they are pulled into their own module
* by buildGoogleModule and would otherwise be double-counted in the source mix.
*/
/**
* One entry per distinct URL, classified and sorted by citation count.
*
* URLs are folded on their normalized form before classification: the same page
* cited with and without a tracking parameter is one source, and averaging
* positions across the pre-normalized rows would weight it twice.
*/
function rollUpCitationUrls(rows, classify) {
	const folded = /* @__PURE__ */ new Map();
	for (const { url, domain, title, count, avg_position } of rows) {
		if (isGoogleSurfaceUrl(url)) continue;
		const normalized = normalizeUrl(url);
		const c = Number(count);
		const positionSum = avg_position != null ? Number(avg_position) * c : 0;
		const positionCount = avg_position != null ? c : 0;
		const existing = folded.get(normalized);
		if (existing) {
			existing.count += c;
			existing.positionSum += positionSum;
			existing.positionCount += positionCount;
			if (!existing.title && title) existing.title = title;
		} else folded.set(normalized, {
			count: c,
			title: title || void 0,
			domain,
			positionSum,
			positionCount
		});
	}
	return Array.from(folded.entries()).map(([url, { count, title, domain, positionSum, positionCount }]) => {
		const category = classify(domain, url, title);
		return {
			url,
			title,
			domain,
			count,
			category,
			pageType: resolvePageType(url, title, category),
			avgPosition: positionCount > 0 ? Math.round(positionSum / positionCount * 10) / 10 : null
		};
	}).sort((a, b) => b.count - a.count);
}
/**
* Domains, rebuilt from the URL-level data rather than counted separately, each
* taking its category from its most-cited URL — so a domain that is mostly
* review articles reads as editorial rather than falling to "other".
*/
function rollUpCitationDomains(urls) {
	const byDomain = /* @__PURE__ */ new Map();
	for (const url of urls) {
		const current = byDomain.get(url.domain);
		if (!current) {
			byDomain.set(url.domain, {
				domain: url.domain,
				count: url.count,
				category: url.category,
				exampleTitle: url.title,
				topCount: url.count
			});
			continue;
		}
		current.count += url.count;
		if (url.count > current.topCount) {
			current.topCount = url.count;
			current.category = url.category;
			current.exampleTitle = url.title;
		}
	}
	return Array.from(byDomain.values()).map(({ topCount: _topCount, ...domain }) => domain).sort((a, b) => b.count - a.count);
}
/** Category and page-type totals, taken from the URL-level classification. */
function tallyCitations(urls) {
	const categoryCounts = emptyCategoryCounts();
	const pageTypeCounts = emptyPageTypeCounts();
	let totalCitations = 0;
	for (const url of urls) {
		categoryCounts[url.category] += url.count;
		pageTypeCounts[url.pageType] += url.count;
		totalCitations += url.count;
	}
	return {
		categoryCounts,
		pageTypeCounts,
		totalCitations,
		pageTypeDistribution: CITATION_PAGE_TYPES.map((pageType) => ({
			pageType,
			count: pageTypeCounts[pageType]
		})).filter((entry) => entry.count > 0)
	};
}
/**
* Google AI Mode module builder.
*
* Shopping product cards and search links Google AI Mode surfaces aren't external
* citations in the traditional sense (they point back into Google's own results),
* so they're pulled OUT of the citation source mix and surfaced here instead —
* products attributed brand-vs-competitor by name, and searches, each tied to the
* prompts that triggered them. Shared by the brand-wide citations view and the
* per-prompt detail view so both render the same Google Shopping section.
*/
var emptyGoogleModule = () => ({
	shopping: {
		totalCitations: 0,
		brandCount: 0,
		competitorCount: 0,
		products: []
	},
	search: {
		totalCitations: 0,
		queries: []
	}
});
/**
* Build the Google AI Mode module from per-prompt cited pages: Shopping products
* (attributed brand/competitor/other by name) and search queries, each tied to
* the prompts that triggered them.
*/
function buildGoogleModule(pages, brandName, competitors, promptValue) {
	const productByKey = /* @__PURE__ */ new Map();
	const queryByKey = /* @__PURE__ */ new Map();
	for (const row of pages) {
		if (!row.url) continue;
		const c = Number(row.count);
		if (isGoogleShoppingUrl(row.url)) {
			const name = parseGoogleProductName(row.url, row.title);
			if (!name) continue;
			const key = name.toLowerCase();
			let e = productByKey.get(key);
			if (!e) {
				e = {
					name,
					count: 0,
					attribution: attributeProduct(name, brandName, competitors),
					prompts: /* @__PURE__ */ new Map(),
					urls: /* @__PURE__ */ new Map()
				};
				productByKey.set(key, e);
			}
			e.count += c;
			e.prompts.set(row.prompt_id, (e.prompts.get(row.prompt_id) ?? 0) + c);
			e.urls.set(row.url, (e.urls.get(row.url) ?? 0) + c);
		} else if (isGoogleSearchUrl(row.url)) {
			const query = parseGoogleSearchQuery(row.url);
			if (!query) continue;
			const key = query.toLowerCase();
			let e = queryByKey.get(key);
			if (!e) {
				e = {
					query,
					count: 0,
					prompts: /* @__PURE__ */ new Map()
				};
				queryByKey.set(key, e);
			}
			e.count += c;
			e.prompts.set(row.prompt_id, (e.prompts.get(row.prompt_id) ?? 0) + c);
		}
	}
	const promptRefs = (m) => [...m.entries()].map(([id, count]) => {
		const value = promptValue(id);
		return value ? {
			id,
			value,
			count
		} : null;
	}).filter((p) => p !== null).sort((a, b) => b.count - a.count);
	const products = [...productByKey.values()].map((e) => ({
		name: e.name,
		count: e.count,
		attribution: e.attribution.kind,
		competitorName: e.attribution.kind === "competitor" ? e.attribution.competitorName : void 0,
		prompts: promptRefs(e.prompts),
		urls: [...e.urls.entries()].map(([url, count]) => ({
			url,
			count
		})).sort((a, b) => b.count - a.count)
	})).sort((a, b) => b.count - a.count);
	const queries = [...queryByKey.values()].map((e) => ({
		query: e.query,
		count: e.count,
		prompts: promptRefs(e.prompts)
	})).sort((a, b) => b.count - a.count);
	const brandCount = products.filter((p) => p.attribution === "brand").reduce((s, p) => s + p.count, 0);
	const competitorCount = products.filter((p) => p.attribution === "competitor").reduce((s, p) => s + p.count, 0);
	return {
		shopping: {
			totalCitations: products.reduce((s, p) => s + p.count, 0),
			brandCount,
			competitorCount,
			products
		},
		search: {
			totalCitations: queries.reduce((s, q) => s + q.count, 0),
			queries
		}
	};
}
//#endregion
export { tallyCitations as a, rollUpCitationUrls as i, emptyGoogleModule as n, rollUpCitationDomains as r, buildGoogleModule as t };

//# sourceMappingURL=google-module-Ce5FBGMc.mjs.map