import { n as getModelMeta } from "./models-DjvggVKS.mjs";
import { d as premiumModelLabel, i as PLATFORM_TIER_LABELS } from "./plans-D-CRwAoX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/model-filter-DGVUY-LA.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "6468ba04-2f90-4814-8c6c-009f6676c91e", e._sentryDebugIdIdentifier = "sentry-dbid-6468ba04-2f90-4814-8c6c-009f6676c91e");
	} catch (e) {}
})();
/** Marks the grounded-API variant of a model in a filter value. */
var PREMIUM_SUFFIX = "::premium";
/** How often a target runs, as a rate: "4×/day", or "every 3 days" once past one. */
function describeCadence(intervalHours) {
	if (intervalHours <= 0) return "—";
	if (intervalHours >= 48) return `every ${Math.round(intervalHours / 24)} days`;
	if (intervalHours > 24) return "every other day";
	const perDay = 24 / intervalHours;
	return `${Number.isInteger(perDay) ? perDay : perDay.toFixed(1)}×/day`;
}
/** One line per target: what it is, how often it runs, and how many calls each time. */
function describeTargetSchedule(target) {
	const runs = describeCadence(target.intervalHours);
	return `${labelForModelFilter(target.value)} — ${runs}${target.replication > 1 ? ` ×${target.replication}` : ""}`;
}
/**
* The brand's targets under their tier headings, in catalog order, dropping any
* tier it tracks nothing in. The same three groups the LLM settings page and
* the pricing table use, because they answer the same question about a model.
*/
function groupTrackedTargets(targets) {
	return [
		"scraped",
		"api",
		"premium"
	].map((tier) => ({
		tier,
		label: PLATFORM_TIER_LABELS[tier],
		values: targets.filter((target) => target.tier === tier).map((target) => target.value)
	})).filter((group) => group.values.length > 0);
}
function targetFilterValue(model, premium) {
	return premium ? `${model}${PREMIUM_SUFFIX}` : model;
}
function parseModelFilter(value) {
	if (!value || value === "all") return null;
	return value.endsWith(PREMIUM_SUFFIX) ? {
		model: value.slice(0, -9),
		premium: true
	} : {
		model: value,
		premium: false
	};
}
/**
* What to call a filter value. The grounded variant takes the name it is sold
* under — "GPT-5 Search", not a second "ChatGPT" — which is the same name the
* LLM settings page and the pricing table use.
*/
function labelForModelFilter(value) {
	if (value === "all") return "All models";
	const parsed = parseModelFilter(value);
	if (!parsed) return value;
	return parsed.premium ? premiumModelLabel(parsed.model) : getModelMeta(parsed.model).label;
}
function iconIdForModelFilter(value) {
	const parsed = parseModelFilter(value);
	return getModelMeta(parsed?.model ?? value).iconId;
}
/**
* Dropdown options for a brand's targets, with "All" on top once there is more
* than one. A single-target brand gets no "all" entry, since the filter is
* redundant (callers hide the dropdown entirely).
*/
function getAvailableModels(targets) {
	const values = targets.map((target) => target.value);
	return values.length > 1 ? ["all", ...values] : values;
}
//#endregion
export { labelForModelFilter as a, iconIdForModelFilter as i, getAvailableModels as n, parseModelFilter as o, groupTrackedTargets as r, targetFilterValue as s, describeTargetSchedule as t };

//# sourceMappingURL=model-filter-DGVUY-LA.mjs.map