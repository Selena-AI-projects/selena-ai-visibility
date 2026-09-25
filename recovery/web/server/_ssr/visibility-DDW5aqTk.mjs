import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/visibility-DDW5aqTk.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "a5e993a6-fb58-4de0-9984-5b37ba94bcc5", e._sentryDebugIdIdentifier = "sentry-dbid-a5e993a6-fb58-4de0-9984-5b37ba94bcc5");
	} catch (e) {}
})();
/** Ordering options for the prompts list (#60). "Default" keeps the server's
*  smart order (visibility priority → weighted mentions → A–Z); the rest
*  re-sort the already-fetched summaries client-side, each with an ascending
*  and a descending direction (↑ low→high, ↓ high→low). Ordering never narrows
*  the list, so it stays out of `useListFilters` / `isFiltered` and lives in
*  the visibility route's own `validateSearch` (the page-specific search key
*  pattern from PR #336). The label is used both in the menu and (for a chosen
*  order) on the bar button. */
var PROMPT_ORDER_OPTIONS = [
	{
		value: "default",
		label: "Default"
	},
	{
		value: "brand-desc",
		label: "Brand Visibility ↓"
	},
	{
		value: "brand-asc",
		label: "Brand Visibility ↑"
	},
	{
		value: "competitor-desc",
		label: "Competitor Visibility ↓"
	},
	{
		value: "competitor-asc",
		label: "Competitor Visibility ↑"
	},
	{
		value: "prompt-asc",
		label: "Prompt A–Z"
	},
	{
		value: "prompt-desc",
		label: "Prompt Z–A"
	}
];
var DEFAULT_PROMPT_ORDER = "default";
var ORDER_VALUES = PROMPT_ORDER_OPTIONS.map((o) => o.value);
/** Normalize a raw URL value to a known order, falling back to the default
*  for stale/garbage links. */
function coercePromptOrder(raw) {
	return ORDER_VALUES.includes(raw) ? raw : DEFAULT_PROMPT_ORDER;
}
/** Re-order a list of prompt summaries. `default` returns the input untouched
*  so the server's order is preserved; every other key sorts a copy with an
*  alphabetical tiebreak so equal-metric prompts stay stable and readable. */
function orderPrompts(prompts, order) {
	if (order === "default") return prompts;
	const byValue = (a, b) => a.value.localeCompare(b.value);
	const sorted = [...prompts];
	switch (order) {
		case "brand-desc":
			sorted.sort((a, b) => b.brandMentionRate - a.brandMentionRate || b.averageWeightedMentions - a.averageWeightedMentions || byValue(a, b));
			break;
		case "brand-asc":
			sorted.sort((a, b) => a.brandMentionRate - b.brandMentionRate || a.averageWeightedMentions - b.averageWeightedMentions || byValue(a, b));
			break;
		case "competitor-desc":
			sorted.sort((a, b) => b.competitorMentionRate - a.competitorMentionRate || byValue(a, b));
			break;
		case "competitor-asc":
			sorted.sort((a, b) => a.competitorMentionRate - b.competitorMentionRate || byValue(a, b));
			break;
		case "prompt-asc":
			sorted.sort(byValue);
			break;
		case "prompt-desc": sorted.sort((a, b) => byValue(b, a));
	}
	return sorted;
}
/**
* /app/$brand/visibility - Visibility charts page
*
* Shows prompts with visibility scores and trend charts.
* Data is fetched client-side via TanStack Query hooks in PromptsDisplay,
* so no route loader is needed (allows immediate rendering with skeletons).
*/
var $$splitComponentImporter = () => import("./visibility-BcQPbf2N.mjs");
var Route = createFileRoute("/_authed/app/$brand/visibility")({
	validateSearch: (search) => {
		const order = coercePromptOrder(search.order);
		return order === "default" ? {} : { order };
	},
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Visibility", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "Track how LLMs respond to prompts about your brand."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { orderPrompts as a, coercePromptOrder as i, PROMPT_ORDER_OPTIONS as n, Route as r, DEFAULT_PROMPT_ORDER as t };

//# sourceMappingURL=visibility-DDW5aqTk.mjs.map