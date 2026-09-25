import { Wt as stableId, c as actionPlanSchema } from "./src-BdeAuGX5.mjs";
import { i as normalizeWebsiteUrl, n as assertWebsiteUrl, t as assertPublicWebsiteTarget } from "./website-security-Cz8PLhxo.mjs";
import { t as isGoogleMapsLink } from "./google-maps-location-Dex-PeaZ.mjs";
import { createHash } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/website-collector-JRCKbLvO.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7acab442-81a7-468e-b10e-e74270126ec0", e._sentryDebugIdIdentifier = "sentry-dbid-7acab442-81a7-468e-b10e-e74270126ec0");
	} catch (e) {}
})();
/**
* Only crawlers whose operator documents both the token and its purpose. An
* agent missing here is left unclassified rather than guessed at, so a wrong
* guess never becomes a finding.
*/
var AI_CRAWLERS = [
	{
		token: "OAI-SearchBot",
		product: "ChatGPT Search",
		crawlerClass: "search"
	},
	{
		token: "PerplexityBot",
		product: "Perplexity",
		crawlerClass: "search"
	},
	{
		token: "Claude-SearchBot",
		product: "Claude web search",
		crawlerClass: "search"
	},
	{
		token: "Googlebot",
		product: "Google Search and AI Overviews",
		crawlerClass: "search"
	},
	{
		token: "Bingbot",
		product: "Bing and Copilot",
		crawlerClass: "search"
	},
	{
		token: "ChatGPT-User",
		product: "ChatGPT when a person opens a link",
		crawlerClass: "user_fetch"
	},
	{
		token: "Perplexity-User",
		product: "Perplexity when a person opens a link",
		crawlerClass: "user_fetch"
	},
	{
		token: "Claude-User",
		product: "Claude when a person opens a link",
		crawlerClass: "user_fetch"
	},
	{
		token: "GPTBot",
		product: "OpenAI model training",
		crawlerClass: "training"
	},
	{
		token: "ClaudeBot",
		product: "Anthropic model training",
		crawlerClass: "training"
	},
	{
		token: "Google-Extended",
		product: "Gemini model training and grounding",
		crawlerClass: "training"
	},
	{
		token: "Applebot-Extended",
		product: "Apple model training",
		crawlerClass: "training"
	},
	{
		token: "CCBot",
		product: "Common Crawl",
		crawlerClass: "training"
	}
];
/**
* robots.txt as the crawlers read it: consecutive `User-agent` lines share the
* rules that follow them, comments and unknown fields are ignored, and a
* malformed file yields no groups rather than an exception.
*/
function parseRobotsTxt(text) {
	const groups = [];
	let current = null;
	let agentRunOpen = false;
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.split("#", 1)[0].trim();
		if (!line) continue;
		const separator = line.indexOf(":");
		if (separator === -1) continue;
		const field = line.slice(0, separator).trim().toLowerCase();
		const value = line.slice(separator + 1).trim();
		if (field === "user-agent") {
			if (!current || !agentRunOpen) {
				current = {
					agents: [],
					rules: []
				};
				groups.push(current);
				agentRunOpen = true;
			}
			current.agents.push(value.toLowerCase());
			continue;
		}
		if (field !== "allow" && field !== "disallow") continue;
		if (!current) continue;
		agentRunOpen = false;
		current.rules.push({
			allow: field === "allow",
			path: value
		});
	}
	return groups.filter((group) => group.agents.length > 0);
}
/**
* The group that governs one agent: an exact user-agent match wins over `*`,
* which is the precedence every major crawler documents.
*/
function groupFor(groups, token) {
	const wanted = token.toLowerCase();
	const exact = groups.filter((group) => group.agents.includes(wanted));
	if (exact.length > 0) return {
		agents: [wanted],
		rules: exact.flatMap((group) => group.rules)
	};
	const wildcard = groups.filter((group) => group.agents.includes("*"));
	if (wildcard.length > 0) return {
		agents: ["*"],
		rules: wildcard.flatMap((group) => group.rules)
	};
	return null;
}
/**
* Whether one agent may fetch one path. Longest matching rule wins and Allow
* breaks a tie, as the robots exclusion protocol specifies; an empty
* `Disallow:` allows everything, which is why rule length is what decides.
*/
function robotsAllows(robotsTxt, token, path = "/") {
	const group = groupFor(parseRobotsTxt(robotsTxt), token);
	if (!group) return true;
	let decision = true;
	let matched = -1;
	for (const rule of group.rules) {
		if (rule.path === "") continue;
		const pattern = rule.path.replace(/\*+$/, "");
		if (!path.startsWith(pattern)) continue;
		if (pattern.length > matched || pattern.length === matched && rule.allow) {
			matched = pattern.length;
			decision = rule.allow;
		}
	}
	return decision;
}
/**
* Every catalogued crawler the site refuses at `path`. `UNKNOWN` robots
* evidence — no robots.txt served, or the fetch failed — blocks nothing: an
* absent file permits crawling, and a failed read is not evidence of refusal.
*/
function blockedAiCrawlers(robotsTxt, path = "/") {
	if (!robotsTxt || robotsTxt === "UNKNOWN") return [];
	return AI_CRAWLERS.filter((crawler) => !robotsAllows(robotsTxt, crawler.token, path)).map((crawler) => ({
		...crawler,
		path
	}));
}
/**
* Robots directives that stop an engine using the page it just fetched.
* `noindex` keeps it out of the index entirely; `nosnippet` and
* `max-snippet:0` forbid quoting from it, and a quote is what an AI answer
* is made of.
*/
function restrictiveMetaRobots(value) {
	if (!value || value === "UNKNOWN") return [];
	const found = value.toLowerCase().split(",").map((entry) => entry.trim()).filter(Boolean).filter((directive) => directive === "noindex" || directive === "none" || directive === "nosnippet" || directive === "max-snippet:0" || /^max-snippet\s*:\s*0$/.test(directive));
	return [...new Set(found)];
}
var MAX_PAGES = 10;
var MAX_DEPTH = 1;
var MAX_LINKS = 200;
var MAX_TEXT = 1e5;
var ALLOWED_MIME = /* @__PURE__ */ new Set([
	"text/html",
	"application/xhtml+xml",
	"text/plain"
]);
/**
* The crawler follows redirects itself so it can revalidate every hop, but the
* rule it validates against is the shared one — a second copy of "which hosts
* are public" is a second copy that drifts.
*/
async function assertPublicUrl(value) {
	const url = normalizeWebsiteUrl(value);
	await assertPublicWebsiteTarget(url.href);
	return url;
}
function decodeEntities(value) {
	return value.replaceAll(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ({
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&quot;": "\"",
		"&#39;": "'",
		"&nbsp;": " "
	})[entity] ?? entity);
}
function visible(value) {
	return decodeEntities(value.replaceAll(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]+>/gi, " ").replaceAll(/\s+/g, " ").trim()).slice(0, MAX_TEXT);
}
function attr(tag, name) {
	return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1]?.trim() || null;
}
function parseHtml(html, base) {
	const metadata = {};
	for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
		const tag = match[0];
		const key = attr(tag, "name") ?? attr(tag, "property");
		const value = attr(tag, "content");
		if (key && value) metadata[key.toLowerCase()] = decodeEntities(value);
	}
	const canonicalTag = html.match(/<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i)?.[0];
	let canonical = null;
	try {
		canonical = canonicalTag ? new URL(attr(canonicalTag, "href") ?? base.href, base).href : null;
	} catch {
		canonical = null;
	}
	const hreflang = [...html.matchAll(/<link\b[^>]*hreflang=["']([^"']+)["'][^>]*>/gi)].map((match) => {
		try {
			return {
				lang: match[1] ?? "",
				href: new URL(attr(match[0], "href") ?? "", base).href
			};
		} catch {
			return null;
		}
	}).filter((item) => item !== null);
	const headings = [...html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((match) => visible(match[2] ?? "")).filter(Boolean);
	const jsonLd = [];
	for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) try {
		jsonLd.push(JSON.parse(match[1] ?? ""));
	} catch {
		jsonLd.push({ invalid: true });
	}
	const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => {
		try {
			return new URL(match[1] ?? "", base);
		} catch {
			return null;
		}
	}).filter((href) => href !== null);
	const links = anchors.map((href) => href.origin === base.origin && ["http:", "https:"].includes(href.protocol) ? href.href.split("#")[0] : null).filter((href) => typeof href === "string");
	const mapsLinks = [...new Set(anchors.map((href) => href.href).filter((href) => isGoogleMapsLink(href)))].slice(0, MAX_LINKS);
	const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => ({
		src: attr(match[0], "src") ?? "",
		alt: attr(match[0], "alt")
	})).filter((item) => item.src).slice(0, MAX_LINKS);
	const contacts = [...new Set((html.match(/(?:mailto:|tel:)[^"'\s<>]+/gi) ?? []).map((value) => value.trim()))];
	const services = [...new Set([...html.matchAll(/<(?:h[1-3]|li|p)\b[^>]*>([\s\S]*?)<\/(?:h[1-3]|li|p)>/gi)].map((match) => visible(match[1] ?? "")).filter((value) => /service|solution|offer|menu|pricing|booking|contact|location/i.test(value)).slice(0, 50))];
	const sitemapReferences = [...html.matchAll(/(?:sitemap(?:\.xml)?|robots\.txt)/gi)].map((match) => match[0]);
	const microdata = [...html.matchAll(/(?:itemprop|itemscope|itemtype)=["'][^"']+["']/gi)].map((match) => match[0]);
	return {
		canonical,
		metadata,
		hreflang,
		headings,
		visibleText: visible(html),
		jsonLd,
		microdata,
		contacts,
		services,
		internalLinks: [...new Set(links)].slice(0, MAX_LINKS),
		mapsLinks,
		sitemapReferences,
		images
	};
}
async function fetchDefault(url, userAgent) {
	let current = url;
	const redirectChain = [url.href];
	for (let i = 0; i <= 3; i++) {
		await assertPublicUrl(current.href);
		const response = await fetch(current, {
			redirect: "manual",
			headers: {
				"user-agent": userAgent,
				accept: "text/html,application/xhtml+xml,text/plain;q=0.8"
			},
			signal: AbortSignal.timeout(1e4)
		});
		if (response.status < 300 || response.status >= 400) {
			const mime = (response.headers.get("content-type") ?? "").split(";", 1)[0].toLowerCase();
			if (mime && !ALLOWED_MIME.has(mime)) throw new Error("WEBSITE_MIME_NOT_ALLOWED");
			if (Number(response.headers.get("content-length") ?? "0") > 1e6) throw new Error("WEBSITE_RESPONSE_TOO_LARGE");
			const body = await response.text();
			if (new TextEncoder().encode(body).byteLength > 1e6) throw new Error("WEBSITE_RESPONSE_TOO_LARGE");
			return {
				status: response.status,
				headers: response.headers,
				body,
				finalUrl: current,
				redirectChain
			};
		}
		const location = response.headers.get("location");
		if (!location || i === 3) throw new Error("WEBSITE_REDIRECT_LIMIT");
		current = await assertPublicUrl(new URL(location, current).href);
		if (redirectChain.includes(current.href)) throw new Error("WEBSITE_REDIRECT_LOOP");
		redirectChain.push(current.href);
	}
	throw new Error("WEBSITE_REDIRECT_LIMIT");
}
async function fetchWithPolicy(url, fetcher, userAgent) {
	if (!fetcher) return fetchDefault(url, userAgent);
	let current = url;
	const redirectChain = [url.href];
	for (let i = 0; i <= 3; i++) {
		assertWebsiteUrl(current.href);
		const page = await fetcher(current.href);
		if (page.status < 300 || page.status >= 400) return {
			...page,
			finalUrl: current,
			redirectChain
		};
		const location = page.headers.get("location");
		if (!location || i === 3) throw new Error("WEBSITE_REDIRECT_LIMIT");
		current = normalizeWebsiteUrl(new URL(location, current).href);
		if (redirectChain.includes(current.href)) throw new Error("WEBSITE_REDIRECT_LOOP");
		redirectChain.push(current.href);
	}
	throw new Error("WEBSITE_REDIRECT_LIMIT");
}
function evidence(tenantId, snapshotId, source, subject, value, capturedAt) {
	return {
		id: stableId("web_evidence", `${snapshotId}:${source}:${subject}`),
		tenantId,
		snapshotId,
		kind: "WEBSITE",
		accessClass: "PUBLIC",
		sourceRef: source,
		capturedAt,
		subject,
		text: typeof value === "string" ? value : JSON.stringify(value),
		metadata: { rulepack: "WEB-v2" }
	};
}
async function collectWebsite(tenantId, website, options = {}) {
	const maxPages = options.maxPages ?? MAX_PAGES;
	const maxDepth = options.maxDepth ?? MAX_DEPTH;
	if (maxPages < 1 || maxDepth < 0) throw new Error("WEBSITE_CRAWL_POLICY_INVALID");
	const url = options.fetcher ? normalizeWebsiteUrl(website) : await assertPublicUrl(website);
	const userAgent = options.userAgent ?? "SelenaWebsiteCollector/1.0 (+https://selenasystems.com/ai-visibility)";
	const page = await fetchWithPolicy(url, options.fetcher, userAgent);
	if (page.status < 200 || page.status >= 400) throw new Error(`WEBSITE_HTTP_${page.status}`);
	const mime = (page.headers.get("content-type") ?? "").split(";", 1)[0].toLowerCase();
	if (mime && !ALLOWED_MIME.has(mime)) throw new Error("WEBSITE_MIME_NOT_ALLOWED");
	if (new TextEncoder().encode(page.body).byteLength > 1e6) throw new Error("WEBSITE_RESPONSE_TOO_LARGE");
	let robots = null;
	try {
		const robotsPage = await fetchWithPolicy(new URL("/robots.txt", page.finalUrl), options.fetcher, userAgent);
		if (robotsPage.status >= 200 && robotsPage.status < 300) robots = robotsPage.body.slice(0, 1e5);
	} catch {
		robots = null;
	}
	const capturedAt = options.capturedAt ?? (/* @__PURE__ */ new Date()).toISOString();
	const parsed = parseHtml(page.body, page.finalUrl);
	const normalized = JSON.stringify({
		finalUrl: page.finalUrl.href,
		status: page.status,
		redirects: page.redirectChain,
		html: page.body,
		robots,
		parsed
	});
	const contentHash = createHash("sha256").update(normalized).digest("hex");
	const snapshotId = stableId("website_snapshot", `${tenantId}:${page.finalUrl.href}:${contentHash}`);
	const snapshot = {
		id: snapshotId,
		tenantId,
		url: url.href,
		finalUrl: page.finalUrl.href,
		capturedAt,
		contentHash,
		immutable: true,
		html: page.body,
		status: page.status,
		redirectChain: page.redirectChain,
		robots,
		pageCount: 1,
		depth: 0,
		...parsed
	};
	const items = [
		["http-status", page.status],
		["redirect-chain", page.redirectChain],
		["title", parsed.metadata.title ?? "UNKNOWN"],
		["meta-description", parsed.metadata.description ?? "UNKNOWN"],
		["meta-robots", parsed.metadata.robots ?? "UNKNOWN"],
		["canonical", parsed.canonical ?? "UNKNOWN"],
		["hreflang", parsed.hreflang],
		["headings", parsed.headings],
		["visible-text", parsed.visibleText],
		["internal-links", parsed.internalLinks],
		["maps-links", parsed.mapsLinks],
		["sitemap-references", parsed.sitemapReferences],
		["json-ld", parsed.jsonLd],
		["microdata", parsed.microdata],
		["contacts", parsed.contacts],
		["services", parsed.services],
		["images", parsed.images],
		["robots", robots ?? "UNKNOWN"]
	].map(([subject, value]) => evidence(tenantId, snapshotId, `${page.finalUrl.href}#${subject}`, subject, value, capturedAt));
	return {
		snapshot,
		evidence: items,
		manifest: {
			id: stableId("manifest", `${tenantId}:${snapshotId}:WEB-v2`),
			tenantId,
			datasetId: snapshotId,
			evidenceIds: items.map((item) => item.id),
			snapshotIds: [snapshotId],
			rulepackVersion: "WEB-v2",
			createdAt: capturedAt,
			immutable: true
		},
		rulepack: "WEB-v2"
	};
}
function safeJsonParse(text) {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
/** True when any JSON-LD node (including @graph members) declares an address. */
function declaresAddress(value, depth = 0) {
	if (depth > 4 || value === null || typeof value !== "object") return false;
	if (Array.isArray(value)) return value.some((item) => declaresAddress(item, depth + 1));
	const record = value;
	if (record.address !== null && record.address !== void 0 && record.address !== "") return true;
	return Object.values(record).some((item) => declaresAddress(item, depth + 1));
}
/**
* What each rule asks for, in the words of the person who has to do it. The
* rule id stays on the finding for traceability; a task board reading
* "Improve WEB-001" tells its owner nothing.
*/
var recommendationTitles = {
	"WEB-001": "Give the page a title that names the brand and what it offers",
	"WEB-002": "Write a short description of the offer for search results",
	"WEB-003": "State an explicit robots policy",
	"WEB-004": "Declare the page's canonical address",
	"WEB-005": "Declare language alternates where the site has them",
	"WEB-006": "Organise the page with descriptive headings",
	"WEB-007": "Publish the offer as readable text, not only images",
	"WEB-008": "Link the service, location and contact pages to each other",
	"WEB-009": "Describe the business in structured data",
	"WEB-010": "Review the structured data already on the page",
	"WEB-011": "Publish a clear way to get in touch",
	"WEB-012": "Describe the services, menu or booking in readable text",
	"WEB-013": "Describe the important images in alt text",
	"WEB-014": "Serve a robots.txt that can be checked again later",
	"WEB-015": "Link the Google Maps listing from the site",
	"WEB-016": "Put the business address in structured data",
	"WEB-017": "Use the exact Google Maps listing name on the site",
	"WEB-018": "Let the answer engines' crawlers read the site",
	"WEB-019": "Let assistants open the site when a customer asks them to",
	"WEB-020": "Stop the page asking engines to ignore or not quote it",
	"WEB-021": "Confirm that excluding the site from model training is deliberate"
};
/**
* The free audit's rule table, exported so the customer-facing report can
* render every check — the passing ones included — instead of only the
* failures the action plan keeps.
*/
var WEBSITE_SIGNAL_RULES = [
	[
		"title",
		"WEB-001",
		"Add a descriptive page title that identifies the brand and offer.",
		"MEDIUM"
	],
	[
		"meta-description",
		"WEB-002",
		"Add a concise meta description describing the confirmed offer.",
		"MEDIUM"
	],
	[
		"meta-robots",
		"WEB-003",
		"Publish an explicit reviewable robots policy.",
		"LOW"
	],
	[
		"canonical",
		"WEB-004",
		"Add a valid canonical URL to the confirmed website.",
		"MEDIUM"
	],
	[
		"hreflang",
		"WEB-005",
		"Add language alternates only where supported by the site.",
		"LOW"
	],
	[
		"headings",
		"WEB-006",
		"Organize the website with descriptive H1-H3 headings.",
		"MEDIUM"
	],
	[
		"visible-text",
		"WEB-007",
		"Publish crawlable visible text for the confirmed offer.",
		"HIGH"
	],
	[
		"internal-links",
		"WEB-008",
		"Connect service, location and contact pages with internal links.",
		"MEDIUM"
	],
	[
		"json-ld",
		"WEB-009",
		"Add JSON-LD describing the organization or service, so directories and agents read the same facts the page states. Structured data on its own does not move AI answers.",
		"LOW"
	],
	[
		"microdata",
		"WEB-010",
		"Review structured data only where it is actually present.",
		"LOW"
	],
	[
		"contacts",
		"WEB-011",
		"Publish a clear public contact path.",
		"MEDIUM"
	],
	[
		"services",
		"WEB-012",
		"Describe services, menu, booking or location information in crawlable content.",
		"HIGH"
	],
	[
		"images",
		"WEB-013",
		"Add useful alt text to important images.",
		"LOW"
	],
	[
		"robots",
		"WEB-014",
		"Keep robots evidence available for future verification.",
		"LOW"
	]
];
function buildWebsiteActionPlan(collection, context = {}) {
	const bySubject = new Map(collection.evidence.map((item) => [item.subject, item]));
	const rules = WEBSITE_SIGNAL_RULES;
	const actionByRuleId = new Map(rules.map(([, ruleId, action]) => [ruleId, action]));
	const findings = [];
	for (const [subject, ruleId, _action, severity] of rules) {
		const item = bySubject.get(subject);
		if (!item) continue;
		if (!(item.text === "UNKNOWN" || item.text === "[]" || item.text === "{}" || item.text === "")) continue;
		findings.push({
			id: stableId("finding", `${collection.manifest.id}:${ruleId}`),
			tenantId: collection.manifest.tenantId,
			manifestId: collection.manifest.id,
			category: "WEBSITE_FOUNDATION",
			statement: `Website signal ${subject} is missing or unknown.`,
			evidenceIds: [item.id],
			confidence: item.text === "UNKNOWN" ? "UNKNOWN" : "MEDIUM",
			confidenceScore: item.text === "UNKNOWN" ? 0 : .8,
			severity,
			unknown: item.text === "UNKNOWN",
			ruleId
		});
	}
	const location = context.mapsLocation;
	if (location) {
		const placeName = location.placeName;
		const localRules = [
			{
				ruleId: "WEB-015",
				subject: "maps-links",
				failed: (text) => text === "[]",
				statement: "The website does not link to any Google Maps listing.",
				action: "Link the confirmed Google Maps listing from the website's contact or location section."
			},
			{
				ruleId: "WEB-016",
				subject: "json-ld",
				failed: (text) => text !== "[]" && !declaresAddress(safeJsonParse(text)),
				statement: "Structured data on the website does not declare a business address.",
				action: "Add LocalBusiness JSON-LD whose name and address match the Google Maps listing."
			},
			...placeName ? [{
				ruleId: "WEB-017",
				subject: "visible-text",
				failed: (text) => !text.toLowerCase().includes(placeName.toLowerCase()),
				statement: `The Google Maps listing name "${placeName}" does not appear in the website's visible text.`,
				action: "Use the exact listing name on the website so the site and the listing confirm each other."
			}] : []
		];
		for (const rule of localRules) {
			const item = bySubject.get(rule.subject);
			if (!item || !rule.failed(item.text)) continue;
			actionByRuleId.set(rule.ruleId, rule.action);
			findings.push({
				id: stableId("finding", `${collection.manifest.id}:${rule.ruleId}`),
				tenantId: collection.manifest.tenantId,
				manifestId: collection.manifest.id,
				category: "LOCAL_PRESENCE",
				statement: rule.statement,
				evidenceIds: [item.id],
				confidence: "MEDIUM",
				confidenceScore: .8,
				severity: "MEDIUM",
				unknown: false,
				ruleId: rule.ruleId
			});
		}
	}
	const robotsItem = bySubject.get("robots");
	const blocked = robotsItem ? blockedAiCrawlers(robotsItem.text) : [];
	const accessRules = [];
	const blockedSearch = blocked.filter((crawler) => crawler.crawlerClass === "search");
	if (robotsItem && blockedSearch.length > 0) {
		const names = blockedSearch.map((crawler) => crawler.product).join(", ");
		accessRules.push({
			ruleId: "WEB-018",
			item: robotsItem,
			statement: `robots.txt refuses the crawlers behind ${names}, so those engines cannot read the site.`,
			action: `Allow the answer-engine crawlers you want to be found in (${blockedSearch.map((crawler) => crawler.token).join(", ")}) in robots.txt. Refusing training crawlers is a separate decision and can stay as it is.`,
			severity: "HIGH"
		});
	}
	const blockedUserFetch = blocked.filter((crawler) => crawler.crawlerClass === "user_fetch");
	if (robotsItem && blockedUserFetch.length > 0) {
		const names = blockedUserFetch.map((crawler) => crawler.product).join(", ");
		accessRules.push({
			ruleId: "WEB-019",
			item: robotsItem,
			statement: `robots.txt refuses ${names}, so a customer who opens the site's link in the assistant gets nothing back.`,
			action: `Allow the user-triggered agents (${blockedUserFetch.map((crawler) => crawler.token).join(", ")}) in robots.txt: they fetch a page only because a person asked for it.`,
			severity: "MEDIUM"
		});
	}
	const blockedTraining = blocked.filter((crawler) => crawler.crawlerClass === "training");
	if (robotsItem && blockedTraining.length > 0) accessRules.push({
		ruleId: "WEB-021",
		item: robotsItem,
		statement: `robots.txt refuses the training crawlers ${blockedTraining.map((crawler) => crawler.token).join(", ")}, so this site's content stays out of the models those crawlers feed.`,
		action: "Confirm this exclusion is deliberate. A rule like this is often inherited with a robots.txt or switched on by a CDN default; keeping the content out of model training is a valid choice, and so is reversing it.",
		severity: "LOW"
	});
	const metaItem = bySubject.get("meta-robots");
	const restrictive = metaItem ? restrictiveMetaRobots(metaItem.text) : [];
	if (metaItem && restrictive.length > 0) {
		const indexBlocked = restrictive.includes("noindex") || restrictive.includes("none");
		accessRules.push({
			ruleId: "WEB-020",
			item: metaItem,
			statement: indexBlocked ? `The page's robots meta tag says ${restrictive.join(", ")}, which asks every engine to keep it out of their index.` : `The page's robots meta tag says ${restrictive.join(", ")}, which forbids engines from quoting its text.`,
			action: indexBlocked ? "Remove noindex from the page's robots meta tag if this page is meant to be found." : "Remove nosnippet and max-snippet:0 from the page's robots meta tag: an AI answer is built from quoted text.",
			severity: "HIGH"
		});
	}
	for (const rule of accessRules) {
		if (!rule.item) continue;
		actionByRuleId.set(rule.ruleId, rule.action);
		findings.push({
			id: stableId("finding", `${collection.manifest.id}:${rule.ruleId}`),
			tenantId: collection.manifest.tenantId,
			manifestId: collection.manifest.id,
			category: "AI_ACCESS",
			statement: rule.statement,
			evidenceIds: [rule.item.id],
			confidence: "HIGH",
			confidenceScore: .95,
			severity: rule.severity,
			unknown: false,
			ruleId: rule.ruleId
		});
	}
	const recommendations = findings.map((finding) => {
		return {
			id: stableId("recommendation", finding.id),
			tenantId: finding.tenantId,
			findingId: finding.id,
			manifestId: finding.manifestId,
			title: recommendationTitles[finding.ruleId] ?? `Improve ${finding.ruleId}`,
			action: actionByRuleId.get(finding.ruleId) ?? "Improve the website evidence.",
			rationale: finding.statement,
			evidenceIds: finding.evidenceIds,
			priority: finding.severity === "HIGH" ? "NOW" : "NEXT",
			effort: "S",
			confidence: finding.confidence,
			blocked: false
		};
	});
	const tasks = recommendations.map((item) => ({
		id: stableId("task", item.id),
		recommendationId: item.id,
		title: item.title,
		horizon: "0_30_DAYS",
		owner: "Website owner",
		steps: [item.action],
		evidenceIds: item.evidenceIds,
		verificationPlan: ["Recollect the confirmed website into a new immutable snapshot.", "Compare the same evidence subject in the new snapshot."]
	}));
	return actionPlanSchema.parse({
		tenantId: collection.manifest.tenantId,
		manifestId: collection.manifest.id,
		findings,
		recommendations,
		tasks
	});
}
//#endregion
export { buildWebsiteActionPlan as n, collectWebsite as r, WEBSITE_SIGNAL_RULES as t };

//# sourceMappingURL=website-collector-JRCKbLvO.mjs.map