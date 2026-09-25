import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, c as _enum, f as array } from "../_libs/zod.mjs";
import { f as extractDomain } from "./domain-categories-IivSiXtp.mjs";
import { f as eq, u as desc } from "../_libs/drizzle-orm.mjs";
import { a as competitors, n as brandOpportunities, r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as getEffectiveBrandedStatus } from "./tag-utils-C10EeA61.mjs";
import { r as runStructuredCompletionPrompt } from "./onboarding-D7p0ZNRK.mjs";
import { n as resolveTimezone, t as getTimezoneLookbackRange } from "./timezone-utils-BaIeYVmx.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, l as requireBrandAccess } from "./helpers-phr0Aqka.mjs";
import { a as getBrandMentionRateByModel, g as getPerPromptDailyCompetitorMentions, h as getPerPromptDailyCitationStats, p as getPerPromptCitationPages, v as getPerPromptRunStats } from "./postgres-read-BdoLn4e5.mjs";
import { n as computeVolatility, o as stabilityScore } from "./visibility-stats-DqQEIyaP.mjs";
import { t as resolveFilteredPrompts } from "./prompt-resolution-CPr2lUBZ.mjs";
import { t as categorizeDomain } from "./domain-categories.server-CJIsNjFt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/opportunities-D4KGVvOC.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "1aee7d9a-df5b-4a16-b239-1739d50d01a3", e._sentryDebugIdIdentifier = "sentry-dbid-1aee7d9a-df5b-4a16-b239-1739d50d01a3");
	} catch (e) {}
})();
/**
* Shared prompt-tag helpers. Tag/search → prompt-id resolution lives in
* `resolveFilteredPrompts` (server/prompt-resolution.ts); this just exposes the
* effective branded check used to exclude branded prompts from Opportunities.
*/
/** True when a prompt is effectively branded (system tag or user override). */
function isBrandedPrompt(p) {
	return getEffectiveBrandedStatus(p.systemTags || [], p.tags || []).isBranded;
}
/**
* AI-generated Opportunities.
*
* We assemble a compact, deterministic digest of the brand's tracked
* AI-visibility data (overall + per-platform visibility, per-prompt standing vs
* the leading competitor over 7d + 30d with tags + citation difficulty, and the
* citation landscape), then make a SINGLE structured LLM completion — no web
* search, no agent loop — to turn it into categorized opportunities (Creation /
* Existing content / Outreach / Social), each with a plain-language "why". The
* server then attaches each opportunity's related prompts (resolved to IDs) and
* its cited pages split into the brand's vs competitors' — the page renders that.
*
* Provider selection reuses the same config as onboarding / prompt-idea
* generation (`runStructuredCompletionPrompt` → `resolveResearchProvider`, which
* honors ONBOARDING_LLM_TARGET / the preference order). Reports are persisted to
* the brand_opportunities table (append-only) and served as-is until the latest
* is older than REFRESH_AFTER_DAYS, so a normal page load doesn't trigger an LLM call.
*/
var OpportunitySchema = object({
	category: _enum([
		"creation",
		"existing-content",
		"outreach",
		"social"
	]).describe("Which workstream this belongs to: creation (net-new content to publish or earn — comparisons, guides, 'best of' angles for topics the brand is absent on), existing-content (a page already getting cited that's slipping, or could win the mention with a refresh), outreach (earn a placement on a third-party site assistants cite — review platforms, editorial roundups), social (show up in the community conversations assistants pull from — Reddit, YouTube, forums)."),
	title: string().describe("Short, specific, action-oriented — name the concrete surface or angle, not a metric. e.g. \"Get into PCMag's best-CRM roundup\" or \"Answer the recurring r/CRM 'which CRM' threads\"."),
	why: string().describe("One or two tight sentences, in plain language a marketer who has never used this tool will understand, on WHY this is worth doing — the motivation and the payoff. You may include one concrete stat from the data if it strengthens the case (and say what it measures). Do NOT propose on-page specifics you can't verify — you cannot see page contents, so never say things like 'add an FAQ / schema / H2s'. Don't restate long page titles (the UI lists the cited pages)."),
	relatedPrompts: array(string()).describe("The tracked prompts (verbatim, exactly as written in the data) this helps. May be empty.")
});
var opportunitiesSchema = object({
	summary: array(string()).describe("3-5 bullets, ONE short sentence each (≈20 words max): where the brand is being out-cited by competitors, where AI sources its answers, and the through-line of the plan. Do NOT restate the brand's overall or per-platform visibility, and do NOT define what a metric means — the user already has dedicated Overview and Visibility pages for those."),
	opportunities: array(OpportunitySchema).describe("8-12 prioritized opportunities spread across the categories the data supports, highest impact first."),
	risks: array(string()).describe("2-4 very concise caveats (one short sentence each): hard-to-win areas, or tactics to avoid.")
});
var GUIDANCE = `You are an AI-visibility (AEO) strategist advising a content/marketing team that does NOT know how this tool computes its numbers. From the brand's tracked answer data, produce a prioritized, practical set of opportunities to get the brand cited more often in AI assistant answers (ChatGPT, Perplexity, Google AI, Claude, Copilot).

HOW TO READ THE DATA BELOW (define these for the reader whenever you reference them):
- "Visibility" / "named in X%" — the share of an assistant's answers (or of all answers) to the tracked prompts that mention the brand. Higher is better. This is NOT share-of-voice.
- Per prompt, "you X% · top rival Y%" — the share of that prompt's answers that name you vs the single most-cited competitor.
- "difficulty" (wide-open / contested / locked-in) — how much the cited sources rotate for that prompt: wide-open = sources change often (easier to break in), locked-in = the same sources win every time.
- "[tags]" after a prompt — its topic tags, for grouping.
- "cited via" — the third-party domains those answers are built from.
When you cite a number in an opportunity's "why", say what it measures in plain terms. Do NOT spend summary space defining metrics or restating the brand's overall or per-platform visibility — the user already has dedicated Overview and Visibility pages for those.

Sort every opportunity into one of four categories:
- creation — net-new content to publish or earn: comparisons / "dupe" / "alternatives" angles, category guides, "best of" pieces for topics the brand is absent on.
- existing-content — a page already getting cited that's slipping, or could win the mention with a refresh.
- outreach — earn a placement on a third-party site assistants cite: independent review platforms and editorial "best of" roundups.
- social — show up in the community conversations assistants pull from: Reddit, YouTube, forums, Q&A.

Assistants lean far more on independent third-party surfaces (reviews, roundups, comparisons, community) than on a brand's own site, so most opportunities should earn third-party presence; net-new owned content is worth it when a topic is clearly under-served.

Per-assistant sourcing (background only, to help you pick the right surfaces — do not output a per-assistant section):
- ChatGPT — Bing-backed; weights domain authority and freshness; leans on Wikipedia, Reddit, and major media.
- Perplexity — favors curated authoritative domains and publicly accessible reports; rewards recency.
- Google AI / Gemini — lean on the Knowledge Graph and established editorial/retail authority.
- Copilot — Bing-backed; rewards LinkedIn and GitHub presence.
- Claude — Brave-backed; selective, favors fact-dense, well-sourced pages.

Hard rules — keep every recommendation realistic for a content/marketing team:
- ETHICAL: never suggest creating or editing the brand's own Wikipedia/encyclopedia entry (conflict-of-interest, against policy), and never suggest fake, incentivized, or undisclosed reviews, astroturfing, sock-puppets, or any coordinated inauthentic activity — assistants increasingly detect and penalize these.
- AFFORDABLE: prefer low-to-moderate-cost actions a content marketer can run — creating content, pitching editors for inclusion in existing roundups, authentic community participation, normal review drives. Do NOT make the primary action something expensive or specialist (clinical/lab testing, hiring experts, hosting expert AMAs, large paid sponsorships, PR retainers).
- VERIFIABLE: you do not see the contents of any page, so never recommend on-page specifics like adding an FAQ, schema, or headings. Recommend earning or creating presence, not editing internals you can't inspect.
- GROUNDED & SPECIFIC: tie every opportunity to the brand's actual data, and name the concrete surface (an actual site, roundup, community, or comparison angle) — never a vague "query cluster". Prefer surfaces where competitors are already cited but the brand is not. Never recommend a competitor-owned domain.
- Queries marked "*" are branded (contain the brand name); unbranded category queries are where net-new visibility is won, so weight them higher.`;
var TASK = `Using ONLY the data above, return the structured output:
- summary: 3-5 bullets, one short sentence each — the competitive gaps, where AI sources its answers, and the through-line of the plan. Don't restate overall/per-platform visibility or define metrics.
- opportunities: 8-12 prioritized opportunities (highest impact first), each sorted into a category, with a plain-language "why" (the motivation, for a non-expert) and the tracked prompts it helps (verbatim). Spread them across the categories the data supports — don't force all four.
- risks: 2-4 short caveats (hard-to-win areas or tactics to avoid).`;
var TOP_PROMPTS = 30;
var pct = (v) => Math.round(v * 100);
/** Citation volatility (stability 0..100) → a plain difficulty label. Low
* stability = sources rotate = wide open; high = entrenched = locked in. */
function difficultyLabel(stability) {
	if (stability === null) return "n/a";
	if (stability < 40) return "wide-open";
	if (stability < 70) return "contested";
	return "locked-in";
}
/** Map a tracked model id to its assistant/platform family for the digest. */
function modelToPlatform(model) {
	const m = model.toLowerCase();
	if (m.includes("claude")) return "Claude";
	if (m.includes("gemini") || m.includes("google")) return "Gemini";
	if (m.includes("sonar") || m.includes("perplex")) return "Perplexity";
	if (m.includes("copilot")) return "Copilot";
	if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.includes("chatgpt")) return "ChatGPT";
	return model;
}
function resolveRange(lookback, timezone) {
	return getTimezoneLookbackRange(lookback, timezone, { allStrategy: "1y" });
}
/** Top competitor (by mentions) per prompt, with rate = mentions / runs. */
function topCompetitorByPrompt(rows, runsByPrompt) {
	const byPrompt = /* @__PURE__ */ new Map();
	for (const r of rows) {
		let m = byPrompt.get(r.prompt_id);
		if (!m) {
			m = /* @__PURE__ */ new Map();
			byPrompt.set(r.prompt_id, m);
		}
		m.set(r.competitor, (m.get(r.competitor) ?? 0) + Number(r.mentions));
	}
	const out = /* @__PURE__ */ new Map();
	for (const [pid, m] of byPrompt) {
		let best = {
			name: "",
			count: 0
		};
		for (const [name, count] of m) if (count > best.count) best = {
			name,
			count
		};
		const runs = runsByPrompt.get(pid)?.runs ?? 0;
		out.set(pid, {
			name: best.name,
			rate: runs > 0 ? Math.min(1, best.count / runs) : 0
		});
	}
	return out;
}
/** Assemble the deterministic digest text + the structured bits the server needs
* to enrich the LLM output. Returns null if there isn't enough data. */
async function buildDigest(brandId, timezoneParam) {
	const timezone = resolveTimezone(timezoneParam);
	const r30 = resolveRange("1m", timezone);
	const r7 = resolveRange("1w", timezone);
	const prompts = await resolveFilteredPrompts(brandId, {});
	if (prompts.length === 0) return null;
	const promptIds = prompts.map((p) => p.id);
	const isBranded = new Map(prompts.map((p) => [p.id, isBrandedPrompt(p)]));
	const promptText = new Map(prompts.map((p) => [p.id, p.value]));
	const tagsByPrompt = new Map(prompts.map((p) => [p.id, p.tags ?? []]));
	const [brandRows, competitorRows, run30, comp30, daily30, pages30, run7, comp7, byModel] = await Promise.all([
		db.select({
			name: brands.name,
			website: brands.website,
			additionalDomains: brands.additionalDomains
		}).from(brands).where(eq(brands.id, brandId)).limit(1),
		db.select({
			name: competitors.name,
			domains: competitors.domains
		}).from(competitors).where(eq(competitors.brandId, brandId)),
		getPerPromptRunStats(brandId, r30.fromDateStr, r30.toDateStr, timezone, promptIds),
		getPerPromptDailyCompetitorMentions(brandId, r30.fromDateStr, r30.toDateStr, timezone, promptIds),
		getPerPromptDailyCitationStats(brandId, r30.fromDateStr, r30.toDateStr, timezone, promptIds),
		getPerPromptCitationPages(brandId, r30.fromDateStr, r30.toDateStr, timezone, promptIds),
		getPerPromptRunStats(brandId, r7.fromDateStr, r7.toDateStr, timezone, promptIds),
		getPerPromptDailyCompetitorMentions(brandId, r7.fromDateStr, r7.toDateStr, timezone, promptIds),
		getBrandMentionRateByModel(brandId, r30.fromDateStr, r30.toDateStr, timezone, promptIds)
	]);
	if (run30.reduce((s, r) => s + r.runs, 0) === 0) return null;
	const brandName = brandRows[0]?.name ?? "the brand";
	const brandDomains = new Set([extractDomain(brandRows[0]?.website || ""), ...(brandRows[0]?.additionalDomains || []).map(extractDomain)].filter(Boolean));
	const competitorDomains = new Set(competitorRows.flatMap((c) => (c.domains || []).map(extractDomain)).filter(Boolean));
	const catOf = (domain) => categorizeDomain(domain, brandDomains, competitorDomains);
	const ownerOf = (domain) => {
		const c = catOf(domain);
		return c === "brand" ? "brand" : c === "competitor" ? "competitor" : "other";
	};
	const run30By = new Map(run30.map((r) => [r.prompt_id, r]));
	const run7By = new Map(run7.map((r) => [r.prompt_id, r]));
	const leader30 = topCompetitorByPrompt(comp30, run30By);
	const leader7 = topCompetitorByPrompt(comp7, run7By);
	const dailyByPrompt = /* @__PURE__ */ new Map();
	for (const row of daily30) {
		let list = dailyByPrompt.get(row.prompt_id);
		if (!list) {
			list = [];
			dailyByPrompt.set(row.prompt_id, list);
		}
		list.push({
			date: String(row.date),
			domain: row.domain,
			count: Number(row.count)
		});
	}
	const citationsByPrompt = /* @__PURE__ */ new Map();
	for (const row of pages30) {
		if (!row.url) continue;
		let list = citationsByPrompt.get(row.prompt_id);
		if (!list) {
			list = [];
			citationsByPrompt.set(row.prompt_id, list);
		}
		list.push({
			title: row.title,
			domain: row.domain,
			url: row.url,
			count: row.count,
			owner: ownerOf(row.domain)
		});
	}
	const ranked = promptIds.map((pid) => {
		const brand30 = run30By.get(pid)?.brand_mention_rate ?? 0;
		return {
			pid,
			gap: (leader30.get(pid) ?? {
				name: "",
				rate: 0
			}).rate - brand30
		};
	}).sort((a, b) => b.gap - a.gap).slice(0, TOP_PROMPTS);
	const queryLines = ranked.map(({ pid }, i) => {
		const brand30 = run30By.get(pid)?.brand_mention_rate ?? 0;
		const brand7 = run7By.get(pid)?.brand_mention_rate ?? 0;
		const l30 = leader30.get(pid) ?? {
			name: "",
			rate: 0
		};
		const l7 = leader7.get(pid) ?? {
			name: "",
			rate: 0
		};
		const difficulty = difficultyLabel(stabilityScore(computeVolatility(dailyByPrompt.get(pid) ?? []).weightedVolatility));
		const tags = tagsByPrompt.get(pid) ?? [];
		const citedVia = [...new Set((citationsByPrompt.get(pid) ?? []).filter((c) => c.owner !== "brand").map((c) => c.domain))].slice(0, 3);
		const leaderStr = l30.name ? `${l30.name} ${pct(l30.rate)}% (7d ${pct(l7.rate)}%)` : "no competitor cited";
		const tagStr = tags.length ? ` [${tags.join(", ")}]` : "";
		return `${i + 1}. ${isBranded.get(pid) ? "*" : ""}"${promptText.get(pid)}"${tagStr} — you ${pct(brand30)}% (7d ${pct(brand7)}%), top rival ${leaderStr}, difficulty ${difficulty}; cited via: ${citedVia.length ? citedVia.join(", ") : "no citations yet"}`;
	});
	const domainAgg = /* @__PURE__ */ new Map();
	const mix = {
		brand: 0,
		competitor: 0,
		community: 0,
		thirdParty: 0
	};
	for (const row of pages30) {
		const cat = catOf(row.domain);
		const cur = domainAgg.get(row.domain);
		if (cur) cur.count += row.count;
		else domainAgg.set(row.domain, {
			count: row.count,
			title: row.title,
			cat
		});
		if (cat === "brand") mix.brand += row.count;
		else if (cat === "competitor") mix.competitor += row.count;
		else if (cat === "social") mix.community += row.count;
		else mix.thirdParty += row.count;
	}
	const totalCites = mix.brand + mix.competitor + mix.community + mix.thirdParty || 1;
	const sortByCount = (a, b) => b.count - a.count;
	const entries = [...domainAgg.entries()].map(([domain, v]) => ({
		domain,
		...v
	}));
	const fmtDomain = (e) => e.title ? `${e.domain} ("${e.title}")` : e.domain;
	const thirdPartyTop = entries.filter((e) => e.cat !== "brand" && e.cat !== "competitor" && e.cat !== "social").sort(sortByCount).slice(0, 10);
	const communityTop = entries.filter((e) => e.cat === "social").sort(sortByCount).slice(0, 5);
	const competitorPages = entries.filter((e) => e.cat === "competitor").sort(sortByCount).slice(0, 8);
	const platformAgg = /* @__PURE__ */ new Map();
	let allRuns = 0;
	let allMentioned = 0;
	for (const m of byModel) {
		if (m.runs <= 0) continue;
		allRuns += m.runs;
		allMentioned += m.brand_mentioned_count;
		const platform = modelToPlatform(m.model);
		const cur = platformAgg.get(platform) ?? {
			runs: 0,
			mentioned: 0
		};
		cur.runs += m.runs;
		cur.mentioned += m.brand_mentioned_count;
		platformAgg.set(platform, cur);
	}
	const platformLines = [...platformAgg.entries()].map(([p, v]) => `${p} ${pct(v.mentioned / v.runs)}%`);
	const brandedCount = [...isBranded.values()].filter(Boolean).length;
	const overallVis = allRuns > 0 ? allMentioned / allRuns : 0;
	return {
		text: [
			`BRAND: ${brandName}`,
			`COMPETITORS TRACKED: ${competitorRows.map((c) => c.name).join(", ") || "none"}`,
			`WINDOWS: 30 days (primary) with 7-day figures in parentheses for momentum.`,
			``,
			`OVERALL (30d): ${promptIds.length} tracked prompts (${brandedCount} branded); the brand is named in ${pct(overallVis)}% of all answers (overall visibility); ${competitorRows.length} competitors tracked.`,
			`PER-PLATFORM VISIBILITY (share of each assistant's answers, across tracked prompts, that name the brand; 30d): ${platformLines.join(" · ") || "no data"}`,
			``,
			`PROMPTS (top ${ranked.length} of ${promptIds.length} by gap to the leading competitor; "*" = branded; "[...]" = topic tags):`,
			...queryLines,
			``,
			`CITATION LANDSCAPE (where answers to these prompts are sourced, 30d):`,
			`- Source mix: third-party ${pct(mix.thirdParty / totalCites)}%, competitor-owned ${pct(mix.competitor / totalCites)}%, community ${pct(mix.community / totalCites)}%, brand-owned ${pct(mix.brand / totalCites)}%.`,
			`- Independent third-party domains most cited: ${thirdPartyTop.map(fmtDomain).join("; ") || "none"}`,
			`- Community sources most cited: ${communityTop.map(fmtDomain).join("; ") || "none"}`,
			`- Competitor-owned pages cited (you cannot get listed on these — for context only): ${competitorPages.map(fmtDomain).join("; ") || "none"}`
		].join("\n"),
		brandName,
		prompts: prompts.map((p) => ({
			id: p.id,
			value: p.value
		})),
		citationsByPrompt
	};
}
/** From an opportunity's related prompt IDs, gather its cited pages (deduped by
* URL) split into the brand's own vs competitors'. */
function citationsForPrompts(promptIds, citationsByPrompt) {
	const seen = /* @__PURE__ */ new Set();
	const yours = [];
	const comp = [];
	for (const pid of promptIds) for (const c of citationsByPrompt.get(pid) ?? []) {
		if (seen.has(c.url)) continue;
		seen.add(c.url);
		if (c.owner === "brand") yours.push(c);
		else if (c.owner === "competitor") comp.push(c);
	}
	const byCount = (a, b) => b.count - a.count;
	const strip = ({ title, domain, url }) => ({
		title,
		domain,
		url
	});
	return {
		yourCitations: yours.sort(byCount).slice(0, 8).map(strip),
		competitorCitations: comp.sort(byCount).slice(0, 8).map(strip)
	};
}
/** Regenerate at most this often; stored generations newer than this are served
* from cache. Surfaced as "Refreshed weekly" on the page — kept a touch under 7 days. */
var REFRESH_AFTER_DAYS = 6;
var MAX_GENERATION_ATTEMPTS = 3;
/** Resolve the LLM output's prompt strings to tracked IDs (for deep-linking) and
* attach each opportunity's cited pages split into the brand's vs competitors'. */
function enrichReport(raw, digest) {
	const idByText = new Map(digest.prompts.map((p) => [p.value.trim().toLowerCase(), p.id]));
	return {
		...raw,
		opportunities: raw.opportunities.map((o) => {
			const relatedPrompts = o.relatedPrompts.map((text) => ({
				text,
				promptId: idByText.get(text.trim().toLowerCase()) ?? null
			}));
			const ids = relatedPrompts.map((p) => p.promptId).filter((id) => id !== null);
			return {
				...o,
				relatedPrompts,
				...citationsForPrompts(ids, digest.citationsByPrompt)
			};
		})
	};
}
/** Generate the report, retrying until the model's output satisfies the schema.
* Returns the validated report plus the model id that produced it. */
async function generateValidReport(prompt) {
	for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) try {
		const result = await runStructuredCompletionPrompt(prompt, opportunitiesSchema);
		const parsed = opportunitiesSchema.safeParse(result.object);
		if (parsed.success) return {
			report: parsed.data,
			model: result.modelVersion ?? null
		};
		console.warn(`[opportunities] schema mismatch (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS})`);
	} catch (err) {
		console.warn(`[opportunities] generation error (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}):`, err);
	}
	return null;
}
var getOpportunitiesFn_createServerFn_handler = createServerRpc({
	id: "23cdb9d47516372d1fc0888a27a7358031d5cc8ae32b37b3e5021d9ad88921b1",
	name: "getOpportunitiesFn",
	filename: "src/server/opportunities.ts"
}, (opts) => getOpportunitiesFn.__executeServer(opts));
var getOpportunitiesFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	timezone: string().default("UTC")
})).handler(getOpportunitiesFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const [latest] = await db.select().from(brandOpportunities).where(eq(brandOpportunities.brandId, data.brandId)).orderBy(desc(brandOpportunities.createdAt)).limit(1);
	const lastEvaluatedAt = latest?.createdAt.toISOString() ?? null;
	const isFresh = latest && Date.now() - new Date(latest.createdAt).getTime() < REFRESH_AFTER_DAYS * 864e5;
	if (latest && isFresh) return {
		report: latest.report,
		reason: null,
		generatedFor: null,
		lastEvaluatedAt
	};
	const digest = await buildDigest(data.brandId, data.timezone);
	if (!digest) {
		if (latest) return {
			report: latest.report,
			reason: null,
			generatedFor: null,
			lastEvaluatedAt
		};
		return {
			report: null,
			reason: "insufficient-data",
			generatedFor: null,
			lastEvaluatedAt
		};
	}
	const generated = await generateValidReport(`${GUIDANCE}\n\n=== BRAND DATA ===\n${digest.text}\n\n=== TASK ===\n${TASK}`);
	if (!generated) {
		if (latest) return {
			report: latest.report,
			reason: null,
			generatedFor: null,
			lastEvaluatedAt
		};
		throw new Error("Failed to generate a valid opportunities report");
	}
	const report = enrichReport(generated.report, digest);
	const [savedReport] = await db.insert(brandOpportunities).values({
		brandId: data.brandId,
		report,
		model: generated.model
	}).returning({ createdAt: brandOpportunities.createdAt });
	return {
		report,
		reason: null,
		generatedFor: { brandName: digest.brandName },
		lastEvaluatedAt: savedReport?.createdAt.toISOString() ?? null
	};
});
//#endregion
export { getOpportunitiesFn_createServerFn_handler };

//# sourceMappingURL=opportunities-D4KGVvOC.mjs.map