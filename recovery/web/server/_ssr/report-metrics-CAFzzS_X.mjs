import { d as lazyRouteComponent, f as createFileRoute, w as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { n as getModelMeta } from "./models-DjvggVKS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/report-metrics-CAFzzS_X.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8ba7f459-c80c-4047-8956-db489c806fcb", e._sentryDebugIdIdentifier = "sentry-dbid-8ba7f459-c80c-4047-8956-db489c806fcb");
	} catch (e) {}
})();
/**
* /reports/render/$reportId - Standalone report rendering page
*
* Production-quality printable report (US Letter 8.5 x 11 in).
* Uses Share of Voice as the primary metric with rich competitive analysis.
*/
var $$splitComponentImporter = () => import("../_reportId-CboD2YJ4.mjs");
var loadReportData = createServerFn({ method: "GET" }).validator((d) => d).handler(createSsrRpc("d359f83d1e5180badd13f192496370264fd402c556b4fca2035cccb78ee872cb"));
var Route = createFileRoute("/_authed/reports/render/$reportId")({
	loader: async ({ params }) => {
		const report = await loadReportData({ data: params.reportId });
		if (!report) throw notFound();
		return { report };
	},
	head: () => ({ meta: [{ title: "AI Share of Voice Report" }, {
		name: "robots",
		content: "noindex, nofollow"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
/**
* Shared report metrics computation module.
* Provides Share of Voice (SoV) calculations and representative prompt selection
* for both the report renderer and the report API.
*/
/**
* Compute Share of Voice for a single prompt.
* SoV = brand_mentions / (brand_mentions + total_competitor_mentions)
* Returns null when denominator is 0 (no one mentioned).
*/
function computePromptSoV(promptId, runs, competitors) {
	const promptRuns = runs.filter((r) => r.promptId === promptId);
	const totalRuns = promptRuns.length;
	if (totalRuns === 0) return {
		promptId,
		sov: null,
		brandMentionCount: 0,
		totalRuns: 0,
		totalCompetitorMentions: 0,
		competitorMentions: {}
	};
	const brandMentionCount = promptRuns.filter((r) => r.brandMentioned).length;
	const competitorMentions = {};
	let totalCompetitorMentions = 0;
	for (const run of promptRuns) if (run.competitorsMentioned) {
		for (const mentioned of run.competitorsMentioned) if (competitors.some((c) => c.name === mentioned)) {
			competitorMentions[mentioned] = (competitorMentions[mentioned] || 0) + 1;
			totalCompetitorMentions++;
		}
	}
	const denominator = brandMentionCount + totalCompetitorMentions;
	return {
		promptId,
		sov: denominator === 0 ? null : Math.round(brandMentionCount / denominator * 100),
		brandMentionCount,
		totalRuns,
		totalCompetitorMentions,
		competitorMentions
	};
}
/**
* Compute overall Share of Voice across all prompts.
* Aggregates brand mentions and competitor mentions across all runs.
*/
function computeOverallSoV(runs, competitors) {
	let totalBrandMentions = 0;
	let totalCompetitorMentions = 0;
	for (const run of runs) {
		if (run.brandMentioned) totalBrandMentions++;
		if (run.competitorsMentioned) {
			for (const mentioned of run.competitorsMentioned) if (competitors.some((c) => c.name === mentioned)) totalCompetitorMentions++;
		}
	}
	const denominator = totalBrandMentions + totalCompetitorMentions;
	if (denominator === 0) return null;
	return Math.round(totalBrandMentions / denominator * 100);
}
/**
* Compute per-competitor Share of Voice.
*/
function computeCompetitorSoVs(runs, competitors) {
	let totalBrandMentions = 0;
	const competitorMentionCounts = {};
	for (const run of runs) {
		if (run.brandMentioned) totalBrandMentions++;
		if (run.competitorsMentioned) {
			for (const mentioned of run.competitorsMentioned) if (competitors.some((c) => c.name === mentioned)) competitorMentionCounts[mentioned] = (competitorMentionCounts[mentioned] || 0) + 1;
		}
	}
	const totalAllMentions = totalBrandMentions + Object.values(competitorMentionCounts).reduce((sum, c) => sum + c, 0);
	if (totalAllMentions === 0) return [];
	return competitors.map((comp) => {
		const mentionCount = competitorMentionCounts[comp.name] || 0;
		return {
			name: comp.name,
			sov: Math.round(mentionCount / totalAllMentions * 100),
			mentionCount
		};
	}).sort((a, b) => b.sov - a.sov);
}
/**
* Select a representative mix of prompts: 2 strengths + 2 opportunities.
*
* Strengths: highest SoV prompts (brand is performing well).
* Opportunities: prompts where competitors are active and brand has room to grow.
*   - Prefer non-zero SoV opportunities (brand has some presence but competitors lead).
*   - At most 1 zero-SoV prompt to avoid making the brand look invisible.
*
* If fewer than 2 in either bucket, fills from the other.
*/
function selectRepresentativePrompts(promptSoVs, isBrandedFn) {
	const nonBranded = promptSoVs.filter((p) => !isBrandedFn(p.promptId));
	const pool = nonBranded.length >= 4 ? nonBranded : promptSoVs;
	const strengths = pool.filter((p) => p.sov !== null && p.sov > 0).sort((a, b) => {
		const aHasComp = a.totalCompetitorMentions > 0 ? 1 : 0;
		const bHasComp = b.totalCompetitorMentions > 0 ? 1 : 0;
		if (bHasComp !== aHasComp) return bHasComp - aHasComp;
		return (b.sov ?? 0) - (a.sov ?? 0);
	});
	const nonZeroOpportunities = pool.filter((p) => p.totalCompetitorMentions > 0 && p.sov !== null && p.sov > 0).sort((a, b) => {
		const sovDiff = (a.sov ?? 0) - (b.sov ?? 0);
		if (sovDiff !== 0) return sovDiff;
		return b.totalCompetitorMentions - a.totalCompetitorMentions;
	});
	const zeroSovOpportunities = pool.filter((p) => p.totalCompetitorMentions > 0 && (p.sov === null || p.sov === 0)).sort((a, b) => b.totalCompetitorMentions - a.totalCompetitorMentions);
	const selected = [];
	const usedIds = /* @__PURE__ */ new Set();
	for (const s of strengths) {
		if (selected.length >= 2) break;
		if (usedIds.has(s.promptId)) continue;
		selected.push({
			promptId: s.promptId,
			category: "strength",
			sov: s.sov
		});
		usedIds.add(s.promptId);
	}
	let zeroSovCount = 0;
	const opportunityCandidates = [...nonZeroOpportunities, ...zeroSovOpportunities];
	for (const o of opportunityCandidates) {
		if (selected.filter((s) => s.category === "opportunity").length >= 2) break;
		if (usedIds.has(o.promptId)) continue;
		const isZero = o.sov === null || o.sov === 0;
		if (isZero && zeroSovCount >= 1) continue;
		if (isZero) zeroSovCount++;
		selected.push({
			promptId: o.promptId,
			category: "opportunity",
			sov: o.sov
		});
		usedIds.add(o.promptId);
	}
	if (selected.length < 4) {
		const remaining = [
			...strengths,
			...nonZeroOpportunities,
			...zeroSovOpportunities
		];
		for (const r of remaining) {
			if (selected.length >= 4) break;
			if (usedIds.has(r.promptId)) continue;
			const isZero = r.sov === null || r.sov === 0;
			if (isZero && zeroSovCount >= 1) continue;
			if (isZero) zeroSovCount++;
			const category = (r.sov ?? 0) > 0 ? "strength" : "opportunity";
			selected.push({
				promptId: r.promptId,
				category,
				sov: r.sov
			});
			usedIds.add(r.promptId);
		}
	}
	return selected.slice(0, 4);
}
/**
* Find content gaps: prompts where competitors are mentioned but the brand is not.
* These are the highest-value opportunities for content creation.
*/
function findContentGaps(runs, maxResults = 5) {
	const byPrompt = /* @__PURE__ */ new Map();
	for (const run of runs) {
		if (!byPrompt.has(run.promptId)) byPrompt.set(run.promptId, []);
		byPrompt.get(run.promptId).push(run);
	}
	const gaps = [];
	for (const [promptId, promptRuns] of byPrompt) {
		if (promptRuns.some((r) => r.brandMentioned)) continue;
		const allCompetitors = /* @__PURE__ */ new Set();
		for (const run of promptRuns) for (const comp of run.competitorsMentioned) allCompetitors.add(comp);
		if (allCompetitors.size === 0) continue;
		gaps.push({
			promptValue: promptRuns[0].promptValue,
			promptId,
			competitorsMentioned: [...allCompetitors],
			competitorCount: allCompetitors.size
		});
	}
	return gaps.sort((a, b) => b.competitorCount - a.competitorCount).slice(0, maxResults);
}
/**
* Extract top web search queries used by AI models and how often they led to brand mentions.
*/
function analyzeWebQueries(runs, maxResults = 10) {
	const queryStats = /* @__PURE__ */ new Map();
	for (const run of runs) {
		if (!run.webQueries) continue;
		for (const query of run.webQueries) {
			const normalized = query.toLowerCase().trim();
			if (!normalized || normalized.length < 3) continue;
			if (!queryStats.has(normalized)) queryStats.set(normalized, {
				count: 0,
				brandMentions: 0
			});
			const stats = queryStats.get(normalized);
			stats.count++;
			if (run.brandMentioned) stats.brandMentions++;
		}
	}
	return [...queryStats.entries()].map(([query, stats]) => ({
		query,
		count: stats.count,
		brandMentionRate: stats.count > 0 ? Math.round(stats.brandMentions / stats.count * 100) : 0
	})).sort((a, b) => b.count - a.count).slice(0, maxResults);
}
/**
* Analyze which competitors are mentioned most frequently and in which contexts.
*/
function analyzeCompetitorFrequency(runs, competitors) {
	const competitorStats = /* @__PURE__ */ new Map();
	for (const comp of competitors) competitorStats.set(comp.name, {
		mentions: 0,
		prompts: /* @__PURE__ */ new Set(),
		coMentions: 0
	});
	for (const run of runs) {
		if (!run.competitorsMentioned) continue;
		for (const mentioned of run.competitorsMentioned) {
			const stats = competitorStats.get(mentioned);
			if (!stats) continue;
			stats.mentions++;
			stats.prompts.add(run.promptId);
			if (run.brandMentioned) stats.coMentions++;
		}
	}
	return competitors.map((comp) => {
		const stats = competitorStats.get(comp.name);
		return {
			name: comp.name,
			mentionCount: stats.mentions,
			promptCount: stats.prompts.size,
			coMentionRate: stats.mentions > 0 ? Math.round(stats.coMentions / stats.mentions * 100) : 0
		};
	}).sort((a, b) => b.mentionCount - a.mentionCount);
}
/**
* Compute mention rate by AI engine (how often each engine mentions the brand).
*/
function analyzeByEngine(runs) {
	const engineStats = /* @__PURE__ */ new Map();
	for (const run of runs) {
		const engine = run.model;
		if (!engineStats.has(engine)) engineStats.set(engine, {
			total: 0,
			mentions: 0
		});
		const stats = engineStats.get(engine);
		stats.total++;
		if (run.brandMentioned) stats.mentions++;
	}
	const legacyAliases = {
		openai: "ChatGPT",
		anthropic: "Claude",
		google: "Google AI"
	};
	return [...engineStats.entries()].map(([engine, stats]) => ({
		engine: legacyAliases[engine] ?? getModelMeta(engine).label,
		totalRuns: stats.total,
		brandMentions: stats.mentions,
		mentionRate: stats.total > 0 ? Math.round(stats.mentions / stats.total * 100) : 0
	})).sort((a, b) => b.mentionRate - a.mentionRate);
}
/**
* Compute derived stats from report raw output.
* These are marked "unstable" because the format may change.
*
* - sov: brand_mentions / (brand_mentions + competitor_mentions), 0-1 float
* - visibility: brand_mentions / total_prompt_runs, 0-1 float (how often the brand appears at all)
* - competitors[].sov: competitor_mentions / total_mentions, 0-1 float
* - competitors[].promptsWithMentions: number of prompts where this competitor was mentioned
* - competitors[].promptRunsWithMentions: number of prompt runs where this competitor was mentioned
* - competitors[].visibility: prompt runs with this competitor / total prompt runs, 0-1 float
*/
function computeReportUnstableStats(raw) {
	const runs = [];
	let totalPromptRuns = 0;
	const promptsWithBrand = /* @__PURE__ */ new Set();
	const competitorPrompts = /* @__PURE__ */ new Map();
	const competitorRunCounts = /* @__PURE__ */ new Map();
	raw.promptRuns.forEach((pr, promptIndex) => {
		let promptHasBrand = false;
		for (const run of pr.runs) {
			runs.push({
				promptId: `prompt-${promptIndex + 1}`,
				brandMentioned: run.brandMentioned,
				competitorsMentioned: run.competitorsMentioned
			});
			totalPromptRuns++;
			if (run.brandMentioned) promptHasBrand = true;
			for (const comp of run.competitorsMentioned) {
				if (!competitorPrompts.has(comp)) competitorPrompts.set(comp, /* @__PURE__ */ new Set());
				competitorPrompts.get(comp).add(promptIndex);
				competitorRunCounts.set(comp, (competitorRunCounts.get(comp) || 0) + 1);
			}
		}
		if (promptHasBrand) promptsWithBrand.add(promptIndex);
	});
	const brandMentionCount = runs.filter((r) => r.brandMentioned).length;
	let totalCompetitorMentions = 0;
	for (const run of runs) for (const mentioned of run.competitorsMentioned) if (raw.competitors.some((c) => c.name === mentioned)) totalCompetitorMentions++;
	const totalAllMentions = brandMentionCount + totalCompetitorMentions;
	return {
		sov: totalAllMentions === 0 ? null : brandMentionCount / totalAllMentions,
		visibility: totalPromptRuns === 0 ? 0 : brandMentionCount / totalPromptRuns,
		totalPrompts: raw.promptRuns.length,
		totalPromptRuns,
		promptsWithBrandMentions: promptsWithBrand.size,
		promptRunsWithBrandMentions: brandMentionCount,
		competitors: totalAllMentions === 0 ? [] : raw.competitors.map((comp) => {
			const promptRunsWithMentions = competitorRunCounts.get(comp.name) || 0;
			return {
				name: comp.name,
				sov: promptRunsWithMentions / totalAllMentions,
				visibility: totalPromptRuns === 0 ? 0 : promptRunsWithMentions / totalPromptRuns,
				promptsWithMentions: competitorPrompts.get(comp.name)?.size || 0,
				promptRunsWithMentions
			};
		}).sort((a, b) => b.sov - a.sov)
	};
}
function getSoVColor(sov) {
	if (sov === null) return "text-gray-400";
	if (sov >= 40) return "text-emerald-600";
	if (sov >= 20) return "text-amber-500";
	return "text-rose-500";
}
function getSoVBadgeClasses(sov) {
	if (sov === null || sov < 20) return {
		variant: "destructive",
		className: "bg-rose-500 hover:bg-rose-500 text-white"
	};
	if (sov < 40) return {
		variant: "secondary",
		className: "bg-amber-500 hover:bg-amber-500 text-white"
	};
	return {
		variant: "default",
		className: "bg-emerald-600 hover:bg-emerald-600 text-white"
	};
}
function getSoVLevel(sov) {
	if (sov === null) return {
		label: "No Data",
		description: "No mentions detected."
	};
	if (sov >= 40) return {
		label: "Strong",
		description: "Your brand leads the conversation."
	};
	if (sov >= 20) return {
		label: "Moderate",
		description: "Room for improvement."
	};
	return {
		label: "Low",
		description: "Competitors dominate this space."
	};
}
//#endregion
export { computeCompetitorSoVs as a, computeReportUnstableStats as c, getSoVColor as d, getSoVLevel as f, analyzeWebQueries as i, findContentGaps as l, analyzeByEngine as n, computeOverallSoV as o, selectRepresentativePrompts as p, analyzeCompetitorFrequency as r, computePromptSoV as s, Route as t, getSoVBadgeClasses as u };

//# sourceMappingURL=report-metrics-CAFzzS_X.mjs.map