//#region node_modules/.nitro/vite/services/ssr/assets/selena-answer-analysis-BVDxCAaG.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "65200479-393f-406c-8738-7b3bcb0bc6cf", e._sentryDebugIdIdentifier = "sentry-dbid-65200479-393f-406c-8738-7b3bcb0bc6cf");
	} catch (e) {}
})();
var URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;
var BARE_HOST_PATTERN = /(?<![@\w.])((?:[a-z0-9-]+\.)+[a-z]{2,})(?![\w-])/gi;
function escapeForRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
* Whether the character at an edge of a match is part of a word.
*
* `\b` is defined over ASCII word characters, so it fires in the middle of any
* Cyrillic name — this project measures Russian answers, so boundaries are
* checked explicitly instead.
*/
function isWordCharacter(character) {
	if (character === void 0) return false;
	return /[\p{L}\p{N}_]/u.test(character);
}
/** Whether the needle occurs as a standalone word — the same boundary rule mentions use. */
function hasStandaloneMention(haystack, needle) {
	return firstStandaloneIndex(haystack, needle) >= 0;
}
function firstStandaloneIndex(haystack, needle) {
	if (needle.trim() === "") return -1;
	const pattern = new RegExp(escapeForRegex(needle.trim()), "giu");
	for (const match of haystack.matchAll(pattern)) {
		const start = match.index ?? 0;
		const end = start + match[0].length;
		if (!isWordCharacter(haystack[start - 1]) && !isWordCharacter(haystack[end])) return start;
	}
	return -1;
}
function earliestIndexFor(text, subject) {
	const candidates = [subject.name, ...subject.aliases ?? []].map((candidate) => firstStandaloneIndex(text, candidate)).filter((index) => index >= 0);
	return candidates.length === 0 ? -1 : Math.min(...candidates);
}
function normalizeDomain(value) {
	return (value.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "").replace(/^www\./, "").replace(/[.,;:]+$/, "");
}
/**
* Hosts an answer leaned on: the ones the provider reported, plus links and
* bare hostnames written into the text itself. Models routinely name a source
* without linking it, and a source named but not linked is still the place the
* answer came from.
*/
function extractCitedDomains(text, providerUrls = []) {
	const domains = /* @__PURE__ */ new Set();
	for (const url of providerUrls) {
		const domain = normalizeDomain(url);
		if (domain !== "") domains.add(domain);
	}
	for (const match of text.matchAll(URL_PATTERN)) domains.add(normalizeDomain(match[0]));
	for (const match of text.matchAll(BARE_HOST_PATTERN)) domains.add(normalizeDomain(match[1] ?? ""));
	domains.delete("");
	return [...domains].sort();
}
function analyzeAnswer(input) {
	const found = [];
	const brandIndex = earliestIndexFor(input.text, input.brand);
	if (brandIndex >= 0) found.push({
		subject: input.brand,
		role: "TARGET",
		firstIndex: brandIndex
	});
	for (const competitor of input.competitors ?? []) {
		const index = earliestIndexFor(input.text, competitor);
		if (index >= 0) found.push({
			subject: competitor,
			role: "COMPETITOR",
			firstIndex: index
		});
	}
	found.sort((left, right) => left.firstIndex - right.firstIndex);
	const mentions = found.map((entry, position) => ({
		name: entry.subject.name,
		role: entry.role,
		firstIndex: entry.firstIndex,
		order: position + 1
	}));
	const brandMention = mentions.find((mention) => mention.role === "TARGET") ?? null;
	return {
		brandMentioned: brandMention !== null,
		brandOrder: brandMention?.order ?? null,
		mentions,
		citedDomains: extractCitedDomains(input.text, input.citedUrls ?? [])
	};
}
function mean(values) {
	return values.reduce((total, value) => total + value, 0) / values.length;
}
/**
* Roll a set of analyzed answers up into the numbers a report shows.
*
* The citation gap is the actionable half: domains the answers leaned on while
* the brand was absent are exactly the places worth being present in, and they
* are observed rather than inferred.
*/
function summarizeScenarioSet(analyses, options = {}) {
	if (analyses.length === 0) return {
		answersAnalyzed: 0,
		brandMentionRate: null,
		brandShareOfVoice: null,
		brandAverageOrder: null,
		competitors: [],
		citationGap: []
	};
	const brandDomain = options.brandDomain ? normalizeDomain(options.brandDomain) : null;
	const withBrand = analyses.filter((analysis) => analysis.brandMentioned);
	const totalMentions = analyses.reduce((total, analysis) => total + analysis.mentions.length, 0);
	const competitorRuns = /* @__PURE__ */ new Map();
	for (const analysis of analyses) for (const mention of analysis.mentions) {
		if (mention.role !== "COMPETITOR") continue;
		const orders = competitorRuns.get(mention.name) ?? [];
		orders.push(mention.order);
		competitorRuns.set(mention.name, orders);
	}
	const citations = /* @__PURE__ */ new Map();
	for (const analysis of analyses) {
		const competitorPresent = analysis.mentions.some((mention) => mention.role === "COMPETITOR");
		for (const domain of analysis.citedDomains) {
			const entry = citations.get(domain) ?? {
				timesCited: 0,
				timesCitedWithoutBrand: 0
			};
			entry.timesCited += 1;
			if (!analysis.brandMentioned && competitorPresent) entry.timesCitedWithoutBrand += 1;
			citations.set(domain, entry);
		}
	}
	return {
		answersAnalyzed: analyses.length,
		brandMentionRate: withBrand.length / analyses.length,
		brandShareOfVoice: totalMentions === 0 ? null : withBrand.length / totalMentions,
		brandAverageOrder: withBrand.length === 0 ? null : mean(withBrand.map((analysis) => analysis.brandOrder)),
		competitors: [...competitorRuns.entries()].map(([name, orders]) => ({
			name,
			answersMentioned: orders.length,
			averageOrder: mean(orders)
		})).sort((left, right) => right.answersMentioned - left.answersMentioned || left.averageOrder - right.averageOrder),
		citationGap: [...citations.entries()].map(([domain, counts]) => ({
			domain,
			timesCited: counts.timesCited,
			timesCitedWithoutBrand: counts.timesCitedWithoutBrand,
			ownedByBrand: brandDomain !== null && domain === brandDomain
		})).sort((left, right) => right.timesCitedWithoutBrand - left.timesCitedWithoutBrand || right.timesCited - left.timesCited || left.domain.localeCompare(right.domain))
	};
}
//#endregion
export { summarizeScenarioSet as i, hasStandaloneMention as n, normalizeDomain as r, analyzeAnswer as t };

//# sourceMappingURL=selena-answer-analysis-BVDxCAaG.mjs.map