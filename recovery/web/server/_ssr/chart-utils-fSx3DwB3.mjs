import { n as getDefaultDelayHours } from "./constants-BDRQAb6s.mjs";
import { n as CITATION_CATEGORIES } from "./domain-categories-IivSiXtp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chart-utils-fSx3DwB3.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "a065b702-5fa0-4170-b91e-62e2f0829581", e._sentryDebugIdIdentifier = "sentry-dbid-a065b702-5fa0-4170-b91e-62e2f0829581");
	} catch (e) {}
})();
/**
* Determines the default lookback period based on the brand's data history.
* Returns "1m" (1 month) if the brand has more than 1 week of data or if data hasn't loaded yet,
* otherwise returns "1w" (1 week) for new brands with less than a week of data.
*
* Note: We default to "1m" when data is unavailable because most established brands
* have more than a week of data, and this prevents inconsistent defaults when brand
* data loads asynchronously (which was causing chart type mismatches downstream).
*
* @param earliestDataDate - ISO date string of the earliest data point, or null if no data
* @returns The recommended default lookback period
*/
function getDefaultLookbackPeriod(earliestDataDate) {
	if (!earliestDataDate) return "1m";
	const earliestDate = new Date(earliestDataDate);
	const diffInMs = (/* @__PURE__ */ new Date()).getTime() - earliestDate.getTime();
	return Math.floor(diffInMs / 864e5) > 7 ? "1m" : "1w";
}
function getDaysFromLookback(lookback) {
	switch (lookback) {
		case "1w": return 7;
		case "1m": return 30;
		case "3m": return 90;
		case "6m": return 180;
		case "1y": return 365;
		case "all": return 730;
	}
}
function generateDateRange(startDate, endDate) {
	const dates = [];
	const current = new Date(startDate);
	while (current <= endDate) {
		dates.push(current.toISOString().split("T")[0]);
		current.setDate(current.getDate() + 1);
	}
	return dates;
}
/**
* Citation comparison window for a lookback of `days` days — computed entirely in
* UTC so it's independent of server timezone. The current window is `days` calendar
* days ending on `today` (inclusive): [today-(days-1), today]. The previous window
* is the contiguous equal-length window ending the day before the current one
* starts. `dateRange` is the current window as one YYYY-MM-DD per day (what the
* trend charts iterate) so totals and charts cover exactly the same span.
*/
function citationDateWindow(today, days) {
	const iso = (d) => d.toISOString().split("T")[0];
	const shift = (base, deltaDays) => {
		const d = new Date(base);
		d.setUTCDate(d.getUTCDate() + deltaDays);
		return d;
	};
	const span = Math.max(1, days);
	const from = shift(today, -(span - 1));
	const prevTo = shift(from, -1);
	const prevFrom = shift(prevTo, -(span - 1));
	const dateRange = [];
	for (let i = 0; i < span; i++) dateRange.push(iso(shift(from, i)));
	return {
		fromDateStr: iso(from),
		toDateStr: iso(today),
		prevFromDateStr: iso(prevFrom),
		prevToDateStr: iso(prevTo),
		dateRange
	};
}
/**
* Per-prompt Last Value Carried Forward (LVCF) for visibility data.
*
* For each prompt, carries forward its last known (total_runs, brand_mentioned_count)
* to fill gap days when it didn't run. Then aggregates across all prompts per day,
* split by branded/non-branded status.
*
* This eliminates periodic artifacts caused by staggered prompt schedules:
* every prompt contributes to every day's aggregate via its last observation.
*/
function applyPerPromptLVCF(perPromptData, dateRange, brandedPromptIds) {
	const brandedSet = new Set(brandedPromptIds);
	const byPrompt = /* @__PURE__ */ new Map();
	for (const row of perPromptData) {
		if (!byPrompt.has(row.prompt_id)) byPrompt.set(row.prompt_id, /* @__PURE__ */ new Map());
		byPrompt.get(row.prompt_id).set(String(row.date), {
			total: Number(row.total_runs),
			mentioned: Number(row.brand_mentioned_count)
		});
	}
	const dailyVisibilityMap = /* @__PURE__ */ new Map();
	let totalBrandedRuns = 0;
	let totalBrandedMentioned = 0;
	let totalNonBrandedRuns = 0;
	let totalNonBrandedMentioned = 0;
	for (const [promptId, dateMap] of byPrompt) {
		const isBranded = brandedSet.has(promptId);
		const sortedEntries = [...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b));
		let carried = sortedEntries.length > 0 ? sortedEntries[0][1] : null;
		for (const date of dateRange) {
			const actual = dateMap.get(date);
			if (actual) carried = actual;
			if (!carried) continue;
			if (!dailyVisibilityMap.has(date)) dailyVisibilityMap.set(date, {
				branded: {
					total: 0,
					mentioned: 0
				},
				nonBranded: {
					total: 0,
					mentioned: 0
				}
			});
			const bucket = dailyVisibilityMap.get(date);
			const target = isBranded ? bucket.branded : bucket.nonBranded;
			target.total += carried.total;
			target.mentioned += carried.mentioned;
			if (actual) if (isBranded) {
				totalBrandedRuns += actual.total;
				totalBrandedMentioned += actual.mentioned;
			} else {
				totalNonBrandedRuns += actual.total;
				totalNonBrandedMentioned += actual.mentioned;
			}
		}
	}
	return {
		dailyVisibilityMap,
		totalBrandedRuns,
		totalBrandedMentioned,
		totalNonBrandedRuns,
		totalNonBrandedMentioned
	};
}
/**
* Generalized per-prompt LVCF with cadence normalization over arbitrary string
* keys (citation category, page type, …). For each prompt, carries forward its
* last known per-key counts, normalized by the brand's cadence so daily totals
* reflect a steady rate rather than spiking on run days. Pre-seeds each prompt
* with its earliest observation to avoid ramp-up artifacts.
*/
function applyPerPromptKeyedLVCF(rows, dateRange, cadenceHours, allKeys) {
	const cadenceDays = Math.max(1, Math.ceil((cadenceHours ?? getDefaultDelayHours()) / 24));
	const empty = () => Object.fromEntries(allKeys.map((k) => [k, 0]));
	const byPrompt = /* @__PURE__ */ new Map();
	for (const row of rows) {
		if (!byPrompt.has(row.prompt_id)) byPrompt.set(row.prompt_id, /* @__PURE__ */ new Map());
		const dateMap = byPrompt.get(row.prompt_id);
		const dateStr = String(row.date);
		if (!dateMap.has(dateStr)) dateMap.set(dateStr, empty());
		dateMap.get(dateStr)[row.key] += Number(row.count);
	}
	const daily = /* @__PURE__ */ new Map();
	for (const [, dateMap] of byPrompt) {
		const sortedEntries = [...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b));
		let carried = sortedEntries.length > 0 ? sortedEntries[0][1] : null;
		for (const date of dateRange) {
			const actual = dateMap.get(date);
			if (actual) carried = actual;
			if (!carried) continue;
			if (!daily.has(date)) daily.set(date, empty());
			const day = daily.get(date);
			for (const k of allKeys) day[k] += carried[k] / cadenceDays;
		}
	}
	return daily;
}
/** Category-keyed LVCF (back-compat wrapper used by the dashboard). */
function applyPerPromptCitationLVCF(perPromptData, dateRange, cadenceHours, categorizeDomain) {
	return applyPerPromptKeyedLVCF(perPromptData.map((r) => ({
		prompt_id: r.prompt_id,
		date: r.date,
		key: categorizeDomain(r.domain),
		count: Number(r.count)
	})), dateRange, cadenceHours, CITATION_CATEGORIES);
}
function getBadgeVariant(value) {
	if (value > 75) return "default";
	if (value > 45) return "secondary";
	return "destructive";
}
function getBadgeClassName(value) {
	if (value > 75) return "bg-emerald-600 hover:bg-emerald-600 text-white";
	if (value > 45) return "bg-amber-500 hover:bg-amber-500 text-white";
	return "bg-rose-500 hover:bg-rose-500 text-white";
}
/**
* Calculate visibility percentages for brand vs competitors from prompt runs
*/
function calculateVisibilityPercentages(promptRuns, brand, competitors, lookback, userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	let startDate;
	let endDate;
	if (lookback === "all" && promptRuns.length > 0) {
		const sortedRuns = [...promptRuns].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		const firstRun = sortedRuns[0];
		const lastRun = sortedRuns[sortedRuns.length - 1];
		startDate = new Date(firstRun.createdAt);
		endDate = new Date(lastRun.createdAt);
		const startDateString = startDate.toLocaleDateString("en-CA", { timeZone: userTimezone });
		const endDateString = endDate.toLocaleDateString("en-CA", { timeZone: userTimezone });
		startDate = new Date(startDateString);
		endDate = new Date(endDateString);
	} else {
		const daysToSubtract = getDaysFromLookback(lookback);
		const currentDateInTimezone = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: userTimezone });
		endDate = new Date(currentDateInTimezone);
		startDate = new Date(endDate);
		startDate.setDate(startDate.getDate() - (daysToSubtract - 1));
	}
	const dateRange = generateDateRange(startDate, endDate);
	const sortedCompetitors = [...competitors].sort((a, b) => a.name.localeCompare(b.name));
	const runsByDate = promptRuns.reduce((acc, run) => {
		const dateKey = new Date(run.createdAt).toLocaleDateString("en-CA", { timeZone: userTimezone });
		if (!acc[dateKey]) acc[dateKey] = [];
		acc[dateKey].push(run);
		return acc;
	}, {});
	return dateRange.map((date) => {
		const runsForDate = runsByDate[date] || [];
		const totalRuns = runsForDate.length;
		const dataPoint = { date };
		if (totalRuns === 0) {
			dataPoint[brand.id] = null;
			sortedCompetitors.forEach((competitor) => {
				dataPoint[competitor.id] = null;
			});
			return dataPoint;
		}
		const brandMentions = runsForDate.filter((run) => run.brandMentioned).length;
		const brandVisibility = Math.round(brandMentions / totalRuns * 100);
		dataPoint[brand.id] = brandVisibility;
		sortedCompetitors.forEach((competitor) => {
			const competitorMentions = runsForDate.filter((run) => run.competitorsMentioned && run.competitorsMentioned.includes(competitor.name)).length;
			const competitorVisibility = Math.round(competitorMentions / totalRuns * 100);
			dataPoint[competitor.id] = competitorVisibility;
		});
		return dataPoint;
	});
}
function calculateAverageVisibility(data, competitorId) {
	const validValues = data.map((point) => point[competitorId]).filter((value) => value !== null && value !== void 0);
	if (validValues.length === 0) return 0;
	return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}
function selectCompetitorsToDisplay(competitors, data, maxCompetitors = 3) {
	const topCompetitors = competitors.map((competitor) => ({
		competitor,
		avgVisibility: calculateAverageVisibility(data, competitor.id)
	})).sort((a, b) => b.avgVisibility - a.avgVisibility).slice(0, maxCompetitors).map((item) => item.competitor);
	if (topCompetitors.length < maxCompetitors) {
		const selectedIds = new Set(topCompetitors.map((c) => c.id));
		const remaining = competitors.filter((c) => !selectedIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, maxCompetitors - topCompetitors.length);
		topCompetitors.push(...remaining);
	}
	return topCompetitors;
}
function filterAndCompleteChartData(chartData, lookback) {
	if (lookback === "all") return chartData;
	const daysToSubtract = getDaysFromLookback(lookback);
	const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const currentDateInTimezone = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: userTimezone });
	const referenceDate = new Date(currentDateInTimezone);
	const startDate = new Date(referenceDate);
	startDate.setDate(startDate.getDate() - (daysToSubtract - 1));
	const dateRange = generateDateRange(startDate, referenceDate);
	const filteredData = chartData.filter((item) => {
		const date = new Date(item.date);
		return date >= startDate && date <= referenceDate;
	});
	return dateRange.map((date) => {
		return filteredData.find((item) => item.date === date) || { date };
	});
}
/**
* Extends line chart data to the edges of the time frame.
* For each entity (brand/competitor), extends the first non-null value backward
* to fill the start of the chart, and extends the last non-null value forward
* to fill the end of the chart. This prevents gaps at the edges of the chart
* when data collection started mid-period or hasn't been collected yet for recent dates.
*
* Extended points are marked with `_extended_{key}: true` so the chart can:
* - Skip rendering dots for extended points
* - Skip showing extended values in tooltips
*/
function extendLinesToChartEdges(chartData, dataKeys) {
	if (chartData.length === 0) return chartData;
	const extendedData = chartData.map((point) => ({ ...point }));
	for (const key of dataKeys) {
		let firstValidIndex = -1;
		let lastValidIndex = -1;
		let firstValue = null;
		let lastValue = null;
		for (let i = 0; i < extendedData.length; i++) {
			const value = extendedData[i][key];
			if (value !== null && value !== void 0) {
				if (firstValidIndex === -1) {
					firstValidIndex = i;
					firstValue = value;
				}
				lastValidIndex = i;
				lastValue = value;
			}
		}
		if (firstValidIndex !== -1 && lastValidIndex !== -1) {
			for (let i = 0; i < firstValidIndex; i++) {
				extendedData[i][key] = firstValue;
				extendedData[i][`_extended_${key}`] = true;
			}
			for (let i = lastValidIndex + 1; i < extendedData.length; i++) {
				extendedData[i][key] = lastValue;
				extendedData[i][`_extended_${key}`] = true;
			}
		}
	}
	return extendedData;
}
/**
* Check if a data point's value for a specific key is an extended/synthetic value
*/
function isExtendedDataPoint(dataPoint, key) {
	return dataPoint[`_extended_${key}`] === true;
}
//#endregion
export { citationDateWindow as a, generateDateRange as c, getDaysFromLookback as d, getDefaultLookbackPeriod as f, calculateVisibilityPercentages as i, getBadgeClassName as l, selectCompetitorsToDisplay as m, applyPerPromptKeyedLVCF as n, extendLinesToChartEdges as o, isExtendedDataPoint as p, applyPerPromptLVCF as r, filterAndCompleteChartData as s, applyPerPromptCitationLVCF as t, getBadgeVariant as u };

//# sourceMappingURL=chart-utils-fSx3DwB3.mjs.map