import { t as WEB_QUERIES_UNAVAILABLE } from "./constants-BDRQAb6s.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/fanout-analysis-Bt4WW_et.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "875621b8-e29c-4835-843b-6bb47e2b5c1c", e._sentryDebugIdIdentifier = "sentry-dbid-875621b8-e29c-4835-843b-6bb47e2b5c1c");
	} catch (e) {}
})();
/**
* Pure aggregation for the Query Fanout page. No DB or React imports, so it can
* be unit-tested in isolation and safely imported by both the server fn and the
* page (for its result types).
*
* "Query fanout" = the sub-queries an AI engine issues to the web while
* answering a tracked prompt (`prompt_runs.web_queries`) — the single source
* for every figure on the page, uniformly across providers. Two kinds of
* entries are excluded as a read-time display rule (in the SQL that reads
* web_queries, and defensively here): a query identical to the prompt (engines
* do sometimes search the prompt verbatim — real data, kept in the DB, but a
* repeat says nothing about how the prompt was *rewritten*, which is what this
* page shows), and the `"unavailable"` sentinel providers write when a search
* happened but the real query strings aren't exposed (OpenRouter and
* DataForSEO always; BrightData/Olostep on extraction failure). So every row
* that reaches the aggregator is a genuine expansion, and engines that never
* expose their searches simply contribute none.
*/
var LIMITS = {
	topQueries: 25,
	terms: 60,
	wordChanges: 60,
	perModelTop: 8,
	variations: 10,
	breadth: 20
};
/**
* Stop words for the term cloud and word-change analysis. Deliberately excludes
* the modifiers that *are* the signal in fan-out research — "best", "top",
* "review(s)", "vs", "comparison", year numbers — so they surface, not hide.
*/
var STOPWORDS = /* @__PURE__ */ new Set([
	"the",
	"a",
	"an",
	"and",
	"or",
	"but",
	"of",
	"to",
	"in",
	"on",
	"for",
	"with",
	"by",
	"at",
	"from",
	"as",
	"is",
	"are",
	"was",
	"were",
	"be",
	"been",
	"being",
	"do",
	"does",
	"did",
	"has",
	"have",
	"had",
	"will",
	"would",
	"can",
	"could",
	"should",
	"may",
	"might",
	"must",
	"shall",
	"what",
	"which",
	"who",
	"whom",
	"whose",
	"how",
	"when",
	"where",
	"why",
	"that",
	"this",
	"these",
	"those",
	"it",
	"its",
	"you",
	"your",
	"yours",
	"i",
	"me",
	"my",
	"we",
	"our",
	"ours",
	"they",
	"them",
	"their",
	"he",
	"she",
	"his",
	"her",
	"about",
	"into",
	"over",
	"than",
	"then",
	"there",
	"here",
	"if",
	"so",
	"not",
	"no",
	"up",
	"out",
	"off",
	"all",
	"any",
	"some",
	"more",
	"most",
	"such",
	"own",
	"too",
	"very",
	"s",
	"t",
	"re",
	"ll",
	"ve",
	"d",
	"m"
]);
/** True for stop words; the Word changes view hides these by default. */
function isStopword(word) {
	return STOPWORDS.has(word.toLowerCase());
}
/** Normalize a display word for keyword matching: lowercase, alphanumerics only. */
var normTok = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
/**
* Non-stop-word tokens from the prompt — the page bolds these in each fan-out
* query. A possessive contributes its base form too ("Acme's" yields "acmes"
* AND "acme"), since engines search for the bare name, which would otherwise
* not match the prompt's possessive token.
*/
function promptKeywords(promptValue) {
	const out = /* @__PURE__ */ new Set();
	for (const raw of promptValue.split(/\s+/)) for (const form of [raw, raw.replace(/['’]s$/i, "")]) {
		const tok = normTok(form);
		if (tok.length > 0 && !isStopword(tok)) out.add(tok);
	}
	return out;
}
var norm = (s) => s.trim().toLowerCase();
var pct = (num, den) => den > 0 ? Math.round(num / den * 100) : 0;
/**
* Sentinel some providers store in `web_queries` when a web search happened but
* the actual query strings aren't exposed (OpenRouter always; BrightData/Olostep
* on extraction failure). It's not a real fan-out query — the SQL filters it, and
* this guards the pure aggregator against any that slip through. Compare against
* `norm`-ed (trimmed + lowercased) queries. Aliases the shared constant the
* provider implementations write, so the two sides can't drift.
*/
var UNAVAILABLE_SENTINEL = WEB_QUERIES_UNAVAILABLE;
/** Lowercase word tokens; keeps alphanumerics (so "2026", "vs", "g2" survive), drops 1-char noise. */
function tokenize(s) {
	return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length >= 2);
}
function bump(map, key, count, brand) {
	const t = map.get(key);
	if (t) {
		t.count += count;
		t.brand += brand;
	} else map.set(key, {
		count,
		brand
	});
}
function toQueryStats(map, limit) {
	return [...map.entries()].map(([query, t]) => ({
		query,
		count: t.count,
		brandMentionRate: pct(t.brand, t.count)
	})).sort((a, b) => b.count - a.count || a.query.localeCompare(b.query)).slice(0, limit);
}
function computeFanoutAnalysis(breakdown, modelTotals, promptValueMap, opts = {}) {
	const { promptRuns } = opts;
	const L = {
		...LIMITS,
		...opts.limits
	};
	const overall = /* @__PURE__ */ new Map();
	/** query → prompt id → run instances (feeds the Top Queries drill-down). */
	const promptsPerQuery = /* @__PURE__ */ new Map();
	const perModel = /* @__PURE__ */ new Map();
	const perPrompt = /* @__PURE__ */ new Map();
	const terms = /* @__PURE__ */ new Map();
	const added = /* @__PURE__ */ new Map();
	const dropped = /* @__PURE__ */ new Map();
	const preserved = /* @__PURE__ */ new Map();
	let totalQueries = 0;
	let totalBrand = 0;
	const promptTokensByPrompt = /* @__PURE__ */ new Map();
	const promptTokensFor = (promptId, promptValue) => {
		let set = promptTokensByPrompt.get(promptId);
		if (!set) {
			set = new Set(tokenize(promptValue));
			promptTokensByPrompt.set(promptId, set);
		}
		return set;
	};
	for (const row of breakdown) {
		const query = norm(row.query);
		if (!query || query === UNAVAILABLE_SENTINEL) continue;
		totalQueries += row.count;
		totalBrand += row.brand_mentions;
		bump(overall, query, row.count, row.brand_mentions);
		let queryPrompts = promptsPerQuery.get(query);
		if (!queryPrompts) {
			queryPrompts = /* @__PURE__ */ new Map();
			promptsPerQuery.set(query, queryPrompts);
		}
		queryPrompts.set(row.prompt_id, (queryPrompts.get(row.prompt_id) ?? 0) + row.count);
		if (!perModel.has(row.model)) perModel.set(row.model, /* @__PURE__ */ new Map());
		bump(perModel.get(row.model), query, row.count, row.brand_mentions);
		const promptValue = promptValueMap.get(row.prompt_id) ?? "";
		let pp = perPrompt.get(row.prompt_id);
		if (!pp) {
			pp = {
				value: promptValue,
				total: 0,
				queries: /* @__PURE__ */ new Map()
			};
			perPrompt.set(row.prompt_id, pp);
		}
		pp.total += row.count;
		bump(pp.queries, query, row.count, row.brand_mentions);
		for (const tok of tokenize(query)) {
			if (STOPWORDS.has(tok)) continue;
			terms.set(tok, (terms.get(tok) ?? 0) + row.count);
		}
		const promptTokens = promptTokensFor(row.prompt_id, promptValue);
		const queryTokens = new Set(tokenize(query));
		for (const tok of queryTokens) if (!promptTokens.has(tok)) added.set(tok, (added.get(tok) ?? 0) + row.count);
		for (const tok of promptTokens) {
			const target = queryTokens.has(tok) ? preserved : dropped;
			target.set(tok, (target.get(tok) ?? 0) + row.count);
		}
	}
	const coverageRate = pct(totalBrand, totalQueries);
	const topQueries = toQueryStats(overall, overall.size).slice(0, L.topQueries);
	const termStats = [...terms.entries()].map(([term, count]) => ({
		term,
		count
	})).sort((a, b) => b.count - a.count || a.term.localeCompare(b.term)).slice(0, L.terms);
	const toWordChanges = (map) => [...map.entries()].map(([word, count]) => ({
		word,
		count,
		share: pct(count, totalQueries),
		isStop: STOPWORDS.has(word)
	})).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)).slice(0, L.wordChanges);
	const wordChanges = {
		added: toWordChanges(added),
		dropped: toWordChanges(dropped),
		preserved: toWordChanges(preserved)
	};
	const byModel = modelTotals.filter((m) => m.runs > 0).map((m) => ({
		model: m.model,
		runs: m.runs,
		fanoutRuns: m.fanout_runs,
		totalQueries: m.total_queries,
		avgPerExecution: m.fanout_runs > 0 ? Math.round(m.total_queries / m.fanout_runs * 10) / 10 : 0,
		topQueries: perModel.has(m.model) ? toQueryStats(perModel.get(m.model), L.perModelTop) : []
	})).sort((a, b) => b.totalQueries - a.totalQueries || b.runs - a.runs);
	const byPrompt = [...perPrompt.entries()].map(([promptId, pp]) => {
		const runs = promptRuns?.get(promptId) ?? 0;
		return {
			promptId,
			promptValue: pp.value,
			totalQueries: pp.total,
			uniqueQueries: pp.queries.size,
			runs,
			avgPerExecution: runs > 0 ? Math.round(pp.total / runs * 10) / 10 : 0,
			variations: toQueryStats(pp.queries, L.variations)
		};
	}).sort((a, b) => b.totalQueries - a.totalQueries);
	const breadthStats = [...overall.entries()].map(([query, t]) => {
		const per = promptsPerQuery.get(query) ?? /* @__PURE__ */ new Map();
		const promptRefs = [...per.entries()].map(([promptId, runs]) => ({
			promptId,
			promptValue: promptValueMap.get(promptId) ?? "",
			runs
		})).sort((a, b) => b.runs - a.runs || a.promptValue.localeCompare(b.promptValue));
		return {
			query,
			prompts: per.size,
			runs: t.count,
			promptRefs
		};
	});
	const topByPrompts = [...breadthStats].sort((a, b) => b.prompts - a.prompts || b.runs - a.runs || a.query.localeCompare(b.query)).slice(0, L.breadth);
	const topByRuns = [...breadthStats].sort((a, b) => b.runs - a.runs || b.prompts - a.prompts || a.query.localeCompare(b.query)).slice(0, L.breadth);
	const totalRuns = modelTotals.reduce((s, m) => s + m.runs, 0);
	const fanoutRuns = modelTotals.reduce((s, m) => s + m.fanout_runs, 0);
	return {
		totalQueries,
		uniqueQueries: overall.size,
		fanoutRuns,
		totalRuns,
		avgPerExecution: fanoutRuns > 0 ? Math.round(totalQueries / fanoutRuns * 10) / 10 : 0,
		coverageRate,
		topQueries,
		terms: termStats,
		wordChanges,
		byModel,
		byPrompt,
		topByPrompts,
		topByRuns
	};
}
//#endregion
export { promptKeywords as i, computeFanoutAnalysis as n, normTok as r, UNAVAILABLE_SENTINEL as t };

//# sourceMappingURL=fanout-analysis-Bt4WW_et.mjs.map