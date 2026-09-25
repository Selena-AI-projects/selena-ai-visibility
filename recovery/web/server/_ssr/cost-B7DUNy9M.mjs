//#region node_modules/.nitro/vite/services/ssr/assets/cost-B7DUNy9M.js
/**
* Rough per-run cost estimates in USD, by provider, used to stamp
* usage_events.estimated_cost_usd.
*
* These are deliberately coarse placeholders for internal attribution and
* anomaly spotting — tune them against real provider invoices (that
* comparison is the point of collecting usage_events, not something these
* numbers replace). Missing provider → null cost, event still recorded.
*
* NOTE: These numbers live in the public repository. They are coarse
* placeholders for internal attribution — if they ever approach public
* list prices, move them to config/env so they remain internal.
*/
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c7ed7568-325f-42ee-a9b1-966227ab7b3f", e._sentryDebugIdIdentifier = "sentry-dbid-c7ed7568-325f-42ee-a9b1-966227ab7b3f");
	} catch (e) {}
})();
var PROVIDER_COST_ESTIMATES_USD = {
	olostep: .0054,
	brightdata: .01,
	oxylabs: .01,
	cloro: .01,
	dataforseo: .005,
	"openai-api": .01,
	"anthropic-api": .01,
	"mistral-api": .005,
	openrouter: .005,
	stub: 0
};
/** Anthropic bills native web search per use (plus tokens); max_uses is 1. */
var ANTHROPIC_WEB_SEARCH_SURCHARGE_USD = .01;
function estimateRunCostUsd(provider, webSearchEnabled) {
	if (!provider) return null;
	const base = PROVIDER_COST_ESTIMATES_USD[provider];
	if (base === void 0) return null;
	if (provider === "anthropic-api" && webSearchEnabled) return base + ANTHROPIC_WEB_SEARCH_SURCHARGE_USD;
	return base;
}
/**
* What one target costs to keep running for a month, at a brand's current
* prompt count and cadence: every enabled prompt fires the target `runsPerDay`
* times, each firing making `replication` provider calls.
*
* Self-hosted only. It exists to answer "what does adding this platform cost
* me", so it inherits the coarseness of the per-provider estimates above and
* should be presented as an estimate.
*/
function projectMonthlyTargetCostUsd(input) {
	if (input.costPerRunUsd === null) return null;
	const runs = input.enabledPrompts * input.runsPerDay * input.replication * 30;
	return input.costPerRunUsd * runs;
}
//#endregion
export { projectMonthlyTargetCostUsd as n, estimateRunCostUsd as t };

//# sourceMappingURL=cost-B7DUNy9M.mjs.map