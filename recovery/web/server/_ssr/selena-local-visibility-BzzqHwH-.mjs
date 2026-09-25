import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { n as isLocalVisibilityEnabled } from "./selena-local-execution-CwKdUlEJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-local-visibility-BzzqHwH-.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "5d7f631a-1832-4dc8-8c72-ddeedeed98de", e._sentryDebugIdIdentifier = "sentry-dbid-5d7f631a-1832-4dc8-8c72-ddeedeed98de");
	} catch (e) {}
})();
function localVisibilityFeatureState(env) {
	const enabled = isLocalVisibilityEnabled(env);
	return {
		enabled,
		status: enabled ? "UNKNOWN" : "LOCKED"
	};
}
var getSelenaLocalVisibilityStateFn_createServerFn_handler = createServerRpc({
	id: "4639e6e72b45af1968218d2d7eada4dea2e488b9b23b90c26aea8d242e0d4546",
	name: "getSelenaLocalVisibilityStateFn",
	filename: "src/server/selena-local-visibility.ts"
}, (opts) => getSelenaLocalVisibilityStateFn.__executeServer(opts));
var getSelenaLocalVisibilityStateFn = createServerFn({ method: "GET" }).handler(getSelenaLocalVisibilityStateFn_createServerFn_handler, async () => localVisibilityFeatureState(process.env));
//#endregion
export { getSelenaLocalVisibilityStateFn_createServerFn_handler };

//# sourceMappingURL=selena-local-visibility-BzzqHwH-.mjs.map