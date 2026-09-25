//#region node_modules/.nitro/vite/services/ssr/assets/constants-BDRQAb6s.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0ad1610d-2873-4207-8360-73b71a006e50", e._sentryDebugIdIdentifier = "sentry-dbid-0ad1610d-2873-4207-8360-73b71a006e50");
	} catch (e) {}
})();
/**
* How many times a firing runs each of a prompt's targets. Answers vary between
* identical calls, so sampling several and aggregating is what makes a mention
* rate a measurement rather than an anecdote — and it multiplies provider spend
* one-for-one, which is why an operator paying those bills can turn it down.
*
* Outside cloud only. Cloud resolves replication from the plan
* (`Entitlements.replication`), so this is the lever for local, demo and
* whitelabel deployments, where the operator pays for every call.
*
* Server-only, like getDefaultDelayHours: `process` is not defined in browser
* bundles.
*/
function getRunsPerPrompt() {
	const raw = typeof process !== "undefined" ? process.env.RUNS_PER_PROMPT : void 0;
	if (!raw) return 5;
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 1) return 5;
	return parsed;
}
/**
* Resolves the default prompt cadence (hours) for brands without a
* delayOverrideHours. Reads DEFAULT_DELAY_HOURS from the environment; falls
* back to DEFAULT_DELAY_HOURS_FALLBACK when unset, non-numeric, or <= 0.
*
* Server-only. Client code should read clientConfig.defaultDelayHours instead
* of calling this directly — `process` is not defined in browser bundles.
*/
function getDefaultDelayHours() {
	const raw = typeof process !== "undefined" ? process.env.DEFAULT_DELAY_HOURS : void 0;
	if (!raw) return 24;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) return 24;
	return parsed;
}
/**
* Sentinel providers store in `prompt_runs.web_queries` when a web search
* happened (citations prove it) but the provider doesn't expose the actual
* query strings (OpenRouter always; BrightData/Olostep on extraction failure).
* Written by the provider implementations and filtered out by every fan-out
* read path — keep both sides on this constant.
*/
var WEB_QUERIES_UNAVAILABLE = "unavailable";
//#endregion
export { getDefaultDelayHours as n, getRunsPerPrompt as r, WEB_QUERIES_UNAVAILABLE as t };

//# sourceMappingURL=constants-BDRQAb6s.mjs.map