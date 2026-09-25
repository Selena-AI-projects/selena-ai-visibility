//#region node_modules/.nitro/vite/services/ssr/assets/selena-measurement-view-Z1DAtP8m.js
/**
* Pure helpers for the cabinet's step-4 "Measurement" section. The invariants
* live here where they are unit-testable: an empty group renders UNKNOWN
* (never 0%), branded and non-branded stay separate, and no composite
* headline score is ever derived.
*/
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "53eab8ec-58f4-43c2-9f45-43bf8534f05e", e._sentryDebugIdIdentifier = "sentry-dbid-53eab8ec-58f4-43c2-9f45-43bf8534f05e");
	} catch (e) {}
})();
function scenarioKindsFrom(rows) {
	const kinds = /* @__PURE__ */ new Map();
	for (const row of rows) if (row.intentType === "branded") kinds.set(row.id, "branded");
	else if (row.intentType === "discovery") kinds.set(row.id, "discovery");
	return kinds;
}
/** A ratio as a whole-percent string, or null when the input is unmeasured. */
function formatShare(value) {
	if (value === null || value === void 0) return null;
	return `${Math.round(value * 100)}%`;
}
function groupView(group) {
	if (group.status === "UNKNOWN") return {
		state: "unknown",
		runs: group.runs
	};
	const metrics = group.metrics;
	return {
		state: "measured",
		measuredRuns: metrics.validRuns - metrics.unmeasuredRuns,
		unmeasuredRuns: metrics.unmeasuredRuns,
		mentionCoverage: formatShare(metrics.mentionCoverage),
		averageBrandPosition: metrics.averageBrandPosition
	};
}
//#endregion
export { groupView as n, scenarioKindsFrom as r, formatShare as t };

//# sourceMappingURL=selena-measurement-view-Z1DAtP8m.mjs.map