//#region node_modules/.nitro/vite/services/ssr/assets/domain-categories-IivSiXtp.js
/**
* Ordered source of truth for citation source categories. Display order, chart
* band order, tab order, and total accumulators are all derived from this — add
* or reorder a category here and the rest follows.
*/
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "a26958ac-d19b-408a-9579-e5ecc6871192", e._sentryDebugIdIdentifier = "sentry-dbid-a26958ac-d19b-408a-9579-e5ecc6871192");
	} catch (e) {}
})();
var CITATION_CATEGORIES = [
	"brand",
	"competitor",
	"editorial",
	"reviews",
	"ecommerce",
	"social",
	"developer",
	"pr",
	"reference",
	"institutional",
	"other"
];
var emptyCategoryCounts = () => Object.fromEntries(CITATION_CATEGORIES.map((c) => [c, 0]));
var CITATION_PAGE_TYPES = [
	"homepage",
	"article",
	"listicle",
	"howto",
	"comparison",
	"review",
	"forum",
	"video",
	"doc",
	"product",
	"info",
	"search",
	"shopping",
	"other"
];
var emptyPageTypeCounts = () => Object.fromEntries(CITATION_PAGE_TYPES.map((p) => [p, 0]));
function extractDomain(urlOrDomain) {
	try {
		return urlOrDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
	} catch {
		return urlOrDomain.toLowerCase();
	}
}
var DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
/**
* Clean and validate a user-entered domain string.
* Strips protocols, www prefix, and trailing paths. Returns the cleaned domain
* if valid, or null if the input doesn't look like a valid domain.
*/
function cleanAndValidateDomain(input) {
	const cleaned = extractDomain(input.trim());
	if (!cleaned || !DOMAIN_REGEX.test(cleaned)) return null;
	return cleaned;
}
function dedupeDomains(values) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	for (const v of values) {
		const cleaned = cleanAndValidateDomain(v);
		if (!cleaned || seen.has(cleaned)) continue;
		seen.add(cleaned);
		out.push(cleaned);
	}
	return out;
}
function dedupeAliases(values) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	for (const v of values) {
		const trimmed = v.trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(trimmed);
	}
	return out;
}
function normalizeUrl(url) {
	try {
		const urlObj = new URL(url);
		if (urlObj.searchParams.get("utm_source") === "openai") urlObj.searchParams.delete("utm_source");
		urlObj.search = urlObj.searchParams.toString();
		urlObj.hash = urlObj.hash.replace(/:~:text=[^&]*/, "");
		if (urlObj.hash === "#") urlObj.hash = "";
		urlObj.protocol = "https:";
		urlObj.hostname = urlObj.hostname.replace(/^www\./, "").toLowerCase();
		if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith("/")) urlObj.pathname = urlObj.pathname.slice(0, -1);
		return urlObj.toString();
	} catch {
		return url;
	}
}
var GOOGLE_HOST_RE = /(^|\.)google\.[a-z.]+$/;
function googleHost(url) {
	try {
		const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
		return GOOGLE_HOST_RE.test(host) ? host : null;
	} catch {
		return null;
	}
}
/**
* Google Shopping product card, e.g.
* `google.com/search?q=product&prds=pvt:hg,productid:123...`. The product name
* lives in the citation title; `q=product` is a constant in this deep-link format.
*/
function isGoogleShoppingUrl(url) {
	if (!googleHost(url)) return false;
	try {
		const u = new URL(url);
		if (!u.pathname.startsWith("/search")) return false;
		const q = u.search;
		return q.includes("prds=") || /productid(%3a|:)/i.test(q) || q.includes("tbm=shop") || u.searchParams.get("udm") === "28";
	} catch {
		return false;
	}
}
/** Google web-search link, e.g. `google.com/search?q=best+vitamin+c+serum`. */
function isGoogleSearchUrl(url) {
	if (!googleHost(url)) return false;
	if (isGoogleShoppingUrl(url)) return false;
	try {
		const u = new URL(url);
		return u.pathname.startsWith("/search") && u.searchParams.has("q");
	} catch {
		return false;
	}
}
/** Any Google search/shopping surface pulled out of the source-mix donut. */
function isGoogleSurfaceUrl(url) {
	return isGoogleShoppingUrl(url) || isGoogleSearchUrl(url);
}
function parseGoogleProductName(url, title) {
	if (title && title.trim()) return title.trim();
	try {
		const m = new URL(url).search.match(/productid(?:%3a|:)(\d+)/i);
		return m ? `Product ${m[1]}` : null;
	} catch {
		return null;
	}
}
function parseGoogleSearchQuery(url) {
	try {
		const q = new URL(url).searchParams.get("q");
		if (!q) return null;
		const trimmed = q.trim();
		if (!trimmed || trimmed.toLowerCase() === "product") return null;
		return trimmed;
	} catch {
		return null;
	}
}
/**
* Attribute a Google Shopping product (by its name) to the brand or a tracked
* competitor via case-insensitive name match. Longest competitor name first so a
* longer name wins over a shorter substring collision.
*/
function attributeProduct(productName, brandName, competitors) {
	const n = productName.toLowerCase();
	if (brandName?.trim() && n.includes(brandName.trim().toLowerCase())) return { kind: "brand" };
	const sorted = competitors.filter((c) => c.name?.trim()).sort((a, b) => b.name.length - a.name.length);
	for (const c of sorted) if (n.includes(c.name.trim().toLowerCase())) return {
		kind: "competitor",
		competitorId: c.id,
		competitorName: c.name
	};
	return { kind: "other" };
}
/**
* Dedicated forum / community sites (the whole domain is user discussion). Forum
* *threads* are also caught by path markers in inferPageType; this list — plus the
* subdomain heuristic in isForumDomain — additionally recognizes a forum when the
* path is ambiguous, and routes the domain to the "social" source category
* (community / UGC) instead of letting it fall to "other".
*
* Seeded from Wikipedia's "List of Internet forums". News/forum hybrids (MacRumors,
* Tom's Hardware, Ars Technica, Digital Spy, XDA, MoneySavingExpert, …) are
* deliberately omitted: their forum subdomains/paths are already caught, while the
* bare domain should stay editorial. Defunct, regional-only, and dark-web/abuse
* forums are skipped.
*/
var FORUM_DOMAINS = /* @__PURE__ */ new Set([
	"4chan.org",
	"somethingawful.com",
	"city-data.com",
	"gaiaonline.com",
	"resetera.com",
	"neogaf.com",
	"thestudentroom.co.uk",
	"mumsnet.com",
	"nairaland.com",
	"skyscrapercity.com",
	"whirlpool.net.au",
	"zhihu.com",
	"news.ycombinator.com",
	"collegeconfidential.com",
	"studentdoctor.net",
	"boredofstudies.org",
	"pprune.org",
	"eng-tips.com",
	"bogleheads.org",
	"physicsforums.com",
	"avsforum.com",
	"head-fi.org",
	"audiosciencereview.com",
	"linustechtips.com",
	"androidforums.com",
	"talkbass.com",
	"ultimate-guitar.com",
	"reef2reef.com",
	"fishlore.com",
	"stripersonline.com",
	"ar15.com",
	"rollitup.org",
	"grasscity.com",
	"twoplustwo.com",
	"healthboards.com",
	"airliners.net",
	"gearspace.com",
	"teamliquid.net",
	"atariage.com",
	"websleuths.com",
	"redflagdeals.com",
	"flyertalk.com",
	"weddingbee.com",
	"thenest.com",
	"cafemom.com"
]);
/**
* True for dedicated forum domains and conventional forum subdomains
* (forum.X, forums.X, community.X, discuss.X, boards.X) — a generalizable signal
* that works across niches without enumerating every site.
*/
function isForumDomain(host) {
	let d = host.replace(/^www\./, "").toLowerCase();
	if (/^(forums?|community|discuss|boards?)\./.test(d)) return true;
	while (d) {
		if (FORUM_DOMAINS.has(d)) return true;
		const dot = d.indexOf(".");
		if (dot === -1) return false;
		d = d.slice(dot + 1);
	}
	return false;
}
/**
* Infer a page type from the URL path + citation title. Heuristic — "good, not
* perfect"; the long tail falls through to "other".
*/
function inferPageType(url, title) {
	if (isGoogleShoppingUrl(url)) return "shopping";
	if (isGoogleSearchUrl(url)) return "search";
	let path = "";
	let host = "";
	try {
		const u = new URL(url);
		path = u.pathname.toLowerCase();
		host = u.hostname.replace(/^www\./, "").toLowerCase();
	} catch {
		return "other";
	}
	if (path === "/" || path === "") return "homepage";
	const t = (title ?? "").toLowerCase();
	const hay = `${path} ${t}`;
	if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|tiktok\.com)$/.test(host) || /\/(watch|shorts|embed|videos?)(\/|$|\?)/.test(path)) return "video";
	if (isForumDomain(host) || /(^|\.)reddit\.com$/.test(host) || /\/(comments|forums?|threads?|viewtopic|discussion)(\/|$)/.test(path) || /\/r\//.test(path)) return "forum";
	if (/\/(docs?|documentation|developers?|api|sdk|reference)(\/|$)/.test(path)) return "doc";
	if (/\breview(s|ed)?\b/.test(hay)) return "review";
	if (/\b(vs\.?|versus|alternatives?|comparison)\b/.test(hay) || /\/(compare|comparison|vs|alternatives)(\/|$|-)/.test(path)) return "comparison";
	if (/\b(\d+\s+best|best\s+\d+|top\s+\d+|\d+\s+top|best\s+[a-z])\b/.test(t) || /^\s*(best|top)\b/.test(t) || /(^|\/)(best|top)-[a-z]/.test(path) && !/best-?sellers?|\/(products?|collections|shop|store|dp|gp|pdp|item|cart|buy)(\/|$|-)/.test(path)) return "listicle";
	if (/\b(how to|how-to|guide|tutorial|step[- ]by[- ]step|getting started|routine)\b/.test(hay) || /\/(how-to|guides?|tutorials?|routines?)(\/|$)/.test(path)) return "howto";
	if (/\/(shipping-policy|returns?-policy|refund-policy|privacy-policy|privacy|terms|store-locator|locations?|about|about-us|contact|contact-us|faqs?)(\/|$)/.test(path)) return "info";
	if (/\/(dp|gp\/product|gp\/aw\/d|ip|itm|pdp|products?|item|shop|store|collections|buy|cart|pricing|plans?)(\/|$)/.test(path)) return "product";
	if (/\/(about|about-us|faq|faqs|contact|contact-us|shipping|shipping-policy|returns?|return-policy|refunds?|privacy|terms|policy|policies|legal|account|login|sign-?in|register|careers?|press|wholesale|store-locator|locations?|subscribe|subscription|rewards|loyalty|gift-?cards?)(\/|$|-)/.test(path)) return "info";
	if (/\/(support|help|kb)(\/|$)/.test(path)) return "doc";
	if (/\/(blog|news|articles?|story|stories|posts?|magazine|tips|advice|journal|features?|insights?|resources?)(\/|$|-)/.test(path) || /\/\d{4}\/\d{2}\//.test(path) || /\/\d{4}\/[a-z]/.test(path)) return "article";
	return "other";
}
var CONTENT_PUBLISHER_CATEGORIES = /* @__PURE__ */ new Set([
	"editorial",
	"institutional",
	"reference"
]);
/**
* Page type for a citation given its resolved source category. Niche-independent:
* a page from a content publisher (editorial / institutional / reference) that
* doesn't match a more specific type is treated as an article rather than left in
* "other" — instead of hardcoding per-industry content paths.
*/
function resolvePageType(url, title, category) {
	const pt = inferPageType(url, title);
	if (pt === "other" && CONTENT_PUBLISHER_CATEGORIES.has(category)) return "article";
	return pt;
}
/**
* Round category counts to percentages that always sum to exactly 100.
* Uses largest-remainder method to distribute rounding residuals.
*/
function toRoundedPercentages(counts) {
	const entries = Object.entries(counts);
	const total = entries.reduce((s, [, v]) => s + v, 0);
	if (total === 0) return Object.fromEntries(entries.map(([k]) => [k, 0]));
	const floored = entries.map(([k, v]) => ({
		key: k,
		exact: v / total * 100
	})).map((r) => ({
		...r,
		floor: Math.floor(r.exact)
	}));
	let remainder = 100 - floored.reduce((s, r) => s + r.floor, 0);
	floored.sort((a, b) => b.exact - b.floor - (a.exact - a.floor));
	for (const entry of floored) {
		if (remainder <= 0) break;
		entry.floor += 1;
		remainder -= 1;
	}
	return Object.fromEntries(floored.map((r) => [r.key, r.floor]));
}
var CATEGORY_CONFIG = {
	brand: {
		label: "Brand",
		chartColor: "#2563eb",
		badgeClass: "bg-blue-600/90 text-white",
		chartDotClass: "bg-blue-600"
	},
	competitor: {
		label: "Competitor",
		chartColor: "#ef4444",
		badgeClass: "bg-red-500/90 text-white",
		chartDotClass: "bg-red-500"
	},
	editorial: {
		label: "Editorial",
		chartColor: "#a463f2",
		badgeClass: "bg-purple-500/90 text-white",
		chartDotClass: "bg-purple-500"
	},
	reviews: {
		label: "Reviews",
		chartColor: "#efb118",
		badgeClass: "bg-amber-500/90 text-white",
		chartDotClass: "bg-amber-500"
	},
	ecommerce: {
		label: "Ecommerce",
		chartColor: "#36b39a",
		badgeClass: "bg-teal-500/90 text-white",
		chartDotClass: "bg-teal-500"
	},
	social: {
		label: "Social",
		chartColor: "#ff8ab7",
		badgeClass: "bg-pink-400/90 text-white",
		chartDotClass: "bg-pink-400"
	},
	developer: {
		label: "Developer",
		chartColor: "#3ca951",
		badgeClass: "bg-green-600/90 text-white",
		chartDotClass: "bg-green-600"
	},
	pr: {
		label: "PR",
		chartColor: "#f58518",
		badgeClass: "bg-orange-500/90 text-white",
		chartDotClass: "bg-orange-500"
	},
	reference: {
		label: "Reference",
		chartColor: "#b279a2",
		badgeClass: "bg-fuchsia-500/90 text-white",
		chartDotClass: "bg-fuchsia-500"
	},
	institutional: {
		label: "Institutional",
		chartColor: "#79a8e8",
		badgeClass: "bg-sky-500/90 text-white",
		chartDotClass: "bg-sky-500"
	},
	other: {
		label: "Other",
		chartColor: "#9498a0",
		badgeClass: "bg-slate-400/90 text-white",
		chartDotClass: "bg-slate-400"
	}
};
var DOMAIN_CATEGORY_COLORS = Object.fromEntries(CITATION_CATEGORIES.map((c) => [c, CATEGORY_CONFIG[c].chartColor]));
var PAGE_TYPE_CONFIG = {
	homepage: {
		label: "Homepage",
		chartColor: "#79a8e8"
	},
	article: {
		label: "Article",
		chartColor: "#2563eb"
	},
	listicle: {
		label: "Listicle",
		chartColor: "#36b39a"
	},
	howto: {
		label: "Guide",
		chartColor: "#a463f2"
	},
	comparison: {
		label: "Comparison",
		chartColor: "#f58518"
	},
	review: {
		label: "Review",
		chartColor: "#ff8ab7"
	},
	forum: {
		label: "Forum",
		chartColor: "#11a8cd"
	},
	video: {
		label: "Video",
		chartColor: "#ef4444"
	},
	doc: {
		label: "Docs",
		chartColor: "#b279a2"
	},
	product: {
		label: "Storefront",
		chartColor: "#3ca951"
	},
	info: {
		label: "Info",
		chartColor: "#efb118"
	},
	search: {
		label: "Search",
		chartColor: "#b6992d"
	},
	shopping: {
		label: "Shopping",
		chartColor: "#9c6b4e"
	},
	other: {
		label: "Other",
		chartColor: "#9498a0"
	}
};
Object.fromEntries(CITATION_PAGE_TYPES.map((p) => [p, PAGE_TYPE_CONFIG[p].chartColor]));
//#endregion
export { toRoundedPercentages as S, isGoogleSurfaceUrl as _, PAGE_TYPE_CONFIG as a, parseGoogleSearchQuery as b, dedupeAliases as c, emptyPageTypeCounts as d, extractDomain as f, isGoogleShoppingUrl as g, isGoogleSearchUrl as h, DOMAIN_CATEGORY_COLORS as i, dedupeDomains as l, isForumDomain as m, CITATION_CATEGORIES as n, attributeProduct as o, inferPageType as p, CITATION_PAGE_TYPES as r, cleanAndValidateDomain as s, CATEGORY_CONFIG as t, emptyCategoryCounts as u, normalizeUrl as v, resolvePageType as x, parseGoogleProductName as y };

//# sourceMappingURL=domain-categories-IivSiXtp.mjs.map