//#region node_modules/.nitro/vite/services/ssr/assets/visibility-stats-DqQEIyaP.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "4f189be7-1abf-4c68-a35e-d705757eb2b7", e._sentryDebugIdIdentifier = "sentry-dbid-4f189be7-1abf-4c68-a35e-d705757eb2b7");
	} catch (e) {}
})();
var round3 = (x) => Math.round(x * 1e3) / 1e3;
var clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
/** Collapse raw rows into one bucket per day (summing duplicate domains), sorted chronologically. */
function bucketByDay(daily) {
	const byDate = /* @__PURE__ */ new Map();
	for (const { date, domain, count } of daily) {
		if (count <= 0) continue;
		let m = byDate.get(date);
		if (!m) {
			m = /* @__PURE__ */ new Map();
			byDate.set(date, m);
		}
		m.set(domain, (m.get(domain) ?? 0) + count);
	}
	return [...byDate.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([date, counts]) => {
		let total = 0;
		for (const c of counts.values()) total += c;
		return {
			date,
			counts,
			total
		};
	});
}
/**
* Citation volatility: how much the cited-domain set churns from one day to the next.
* Returns both the unweighted (set) and volume-weighted distances, averaged over
* every consecutive-day transition.
*/
function computeVolatility(daily) {
	const days = bucketByDay(daily);
	if (days.length < 2) return {
		setVolatility: null,
		weightedVolatility: null,
		dayTransitions: 0
	};
	let setSum = 0;
	let weightedSum = 0;
	let transitions = 0;
	for (let i = 1; i < days.length; i++) {
		const prev = days[i - 1];
		const cur = days[i];
		let inter = 0;
		for (const d of cur.counts.keys()) if (prev.counts.has(d)) inter++;
		const union = cur.counts.size + prev.counts.size - inter;
		const setDist = union === 0 ? 0 : 1 - inter / union;
		let overlap = 0;
		for (const [d, c] of cur.counts) {
			const prevC = prev.counts.get(d);
			if (prevC === void 0) continue;
			overlap += Math.min(c / cur.total, prevC / prev.total);
		}
		const weightedDist = 1 - overlap;
		setSum += setDist;
		weightedSum += weightedDist;
		transitions++;
	}
	return {
		setVolatility: round3(setSum / transitions),
		weightedVolatility: round3(weightedSum / transitions),
		dayTransitions: transitions
	};
}
/** Product-facing Stability score: 0 (churns daily) → 100 (rock stable). null if not enough data. */
function stabilityScore(weightedVolatility) {
	if (weightedVolatility === null) return null;
	return Math.round((1 - clamp01(weightedVolatility)) * 100);
}
/**
* An empty set is not a measured zero: when the denominator is 0 nothing was
* observed, so the metric is null and the UI says "no data" instead of "0%".
* A real 0% requires a non-empty denominator.
*/
function percentOrNull(numerator, denominator) {
	return denominator > 0 ? Math.round(numerator / denominator * 100) : null;
}
/**
* Share of voice across the brand and its competitors. Inputs must be in a
* consistent unit (e.g. "# of runs that mentioned this entity"), so the brand's
* mention count and each competitor's are directly comparable.
*
* `share`/`brandShare` are exact ratios, deliberately NOT pre-rounded: the
* leaderboard renders `round(share * 100)`, the donut `round(mentions / total *
* 100)`, and the trend `round(brand / denom * 100)` — all the same single round
* of the same ratio. Pre-rounding `share` here (e.g. to 3 decimals) would
* double-round and let the table read a point off the headline/donut.
*/
function computeShareOfVoice(brand, competitors) {
	let total = brand.mentions;
	for (const c of competitors) total += c.mentions;
	const mk = (name, mentions, isBrand) => ({
		name,
		mentions,
		isBrand,
		share: total === 0 ? null : mentions / total
	});
	return {
		entries: [mk(brand.name, brand.mentions, true), ...competitors.map((c) => mk(c.name, c.mentions, false))].sort((a, b) => b.mentions - a.mentions),
		brandShare: total === 0 ? null : brand.mentions / total,
		total
	};
}
/**
* Brand share of voice over time, smoothed with per-prompt Last-Value-Carried-
* Forward (mirrors the visibility trend): each prompt's last-known brand and
* competitor mention counts are carried across days it didn't run, then summed
* per day — so staggered prompt schedules don't scallop the line. The carry is
* pre-seeded with each prompt's earliest observation to avoid a ramp-up dip.
* Share = brand / (brand + competitor), as a 0–100 percentage (null = no data).
*/
function shareOfVoiceTimeSeriesLVCF(perPrompt, dateRange) {
	const byPrompt = /* @__PURE__ */ new Map();
	for (const r of perPrompt) {
		let m = byPrompt.get(r.promptId);
		if (!m) {
			m = /* @__PURE__ */ new Map();
			byPrompt.set(r.promptId, m);
		}
		m.set(r.date, {
			brand: r.brandMentions,
			competitor: r.competitorMentions
		});
	}
	const daily = /* @__PURE__ */ new Map();
	for (const [, dateMap] of byPrompt) {
		const sorted = [...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b));
		let carried = sorted.length > 0 ? sorted[0][1] : null;
		for (const date of dateRange) {
			const actual = dateMap.get(date);
			if (actual) carried = actual;
			if (!carried) continue;
			let bucket = daily.get(date);
			if (!bucket) {
				bucket = {
					brand: 0,
					competitor: 0
				};
				daily.set(date, bucket);
			}
			bucket.brand += carried.brand;
			bucket.competitor += carried.competitor;
		}
	}
	return dateRange.map((date) => {
		const b = daily.get(date);
		if (!b) return {
			date,
			share: null
		};
		const denom = b.brand + b.competitor;
		return {
			date,
			share: denom === 0 ? null : Math.round(b.brand / denom * 100)
		};
	});
}
/**
* "Current standings" leaderboard: carry each prompt's most recent (brand +
* per-competitor) mention counts forward to the last day, then sum across
* prompts. This is the per-competitor companion to shareOfVoiceTimeSeriesLVCF
* and uses the same per-prompt last-observation carry-forward, so the brand
* share it implies equals that trend's final point — keeping the headline,
* donut, and table consistent with the line (rather than a whole-window
* aggregate that wouldn't match it).
*/
function shareOfVoiceLeaderboardLVCF(brandDaily, competitorDaily, dateRange) {
	if (dateRange.length === 0) return {
		brandMentions: 0,
		brandPrompts: 0,
		competitors: []
	};
	const lastDate = dateRange[dateRange.length - 1];
	const byPrompt = /* @__PURE__ */ new Map();
	const obsAt = (promptId, date) => {
		let dateMap = byPrompt.get(promptId);
		if (!dateMap) {
			dateMap = /* @__PURE__ */ new Map();
			byPrompt.set(promptId, dateMap);
		}
		let obs = dateMap.get(date);
		if (!obs) {
			obs = {
				brand: 0,
				competitors: /* @__PURE__ */ new Map()
			};
			dateMap.set(date, obs);
		}
		return obs;
	};
	for (const r of brandDaily) obsAt(r.promptId, r.date).brand = r.brand;
	for (const r of competitorDaily) if (r.mentions > 0) obsAt(r.promptId, r.date).competitors.set(r.competitor, r.mentions);
	let brandMentions = 0;
	let brandPrompts = 0;
	const compMentions = /* @__PURE__ */ new Map();
	const compPrompts = /* @__PURE__ */ new Map();
	for (const [, dateMap] of byPrompt) {
		let last = null;
		let lastSeen = "";
		for (const [date, obs] of dateMap) if (date <= lastDate && date >= lastSeen) {
			last = obs;
			lastSeen = date;
		}
		if (!last) continue;
		brandMentions += last.brand;
		if (last.brand > 0) brandPrompts++;
		for (const [name, n] of last.competitors) {
			if (n <= 0) continue;
			compMentions.set(name, (compMentions.get(name) ?? 0) + n);
			compPrompts.set(name, (compPrompts.get(name) ?? 0) + 1);
		}
	}
	const competitors = [...compMentions.entries()].map(([name, mentions]) => ({
		name,
		mentions,
		prompts: compPrompts.get(name) ?? 0
	})).sort((a, b) => b.mentions - a.mentions);
	return {
		brandMentions,
		brandPrompts,
		competitors
	};
}
//#endregion
export { shareOfVoiceTimeSeriesLVCF as a, shareOfVoiceLeaderboardLVCF as i, computeVolatility as n, stabilityScore as o, percentOrNull as r, computeShareOfVoice as t };

//# sourceMappingURL=visibility-stats-DqQEIyaP.mjs.map