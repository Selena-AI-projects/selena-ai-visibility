//#region node_modules/.nitro/vite/services/ssr/assets/selena-local-execution-CwKdUlEJ.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "cffe1151-645f-4795-9644-b9ca3d5510f9", e._sentryDebugIdIdentifier = "sentry-dbid-cffe1151-645f-4795-9644-b9ca3d5510f9");
	} catch (e) {}
})();
function isLocalVisibilityEnabled(env) {
	return env.SELENA_LOCAL_VISIBILITY_ENABLED === "true";
}
/** Missing or malformed values are closed, independently of report visibility. */
function isLocalProviderExecutionEnabled(env) {
	return isLocalVisibilityEnabled(env) && env.SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED === "true" && env.SELENA_LOCAL_EMERGENCY_STOP === "false";
}
function assertLocalProviderExecutionEnabled(env) {
	if (!isLocalProviderExecutionEnabled(env)) throw new Error("LOCAL_PROVIDER_EXECUTION_BLOCKED");
}
//#endregion
export { isLocalVisibilityEnabled as n, assertLocalProviderExecutionEnabled as t };

//# sourceMappingURL=selena-local-execution-CwKdUlEJ.mjs.map