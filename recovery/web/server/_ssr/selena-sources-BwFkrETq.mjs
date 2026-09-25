import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, p as boolean } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-sources-BwFkrETq.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "6ea39452-1ca8-4088-ad70-23818f62662d", e._sentryDebugIdIdentifier = "sentry-dbid-6ea39452-1ca8-4088-ad70-23818f62662d");
	} catch (e) {}
})();
/**
* The Source Opportunity Map (addendum §8) reads the stored snapshots rather
* than recomputing them, so what the customer sees is the aggregation that was
* written when the cycle was analysed, under the formula version stored beside
* it. Recomputing on read would quietly change a number the client already saw.
*/
var getSelenaSourceMapFn = createServerFn({ method: "GET" }).validator(object({
	projectId: string().uuid(),
	gapsOnly: boolean().optional()
})).handler(createSsrRpc("764e60639ea5d4e62d1eb3b022fdfb9d7c0c5a3e7667cb7d96982545b12dfb78"));
var listSelenaSourceProjectsFn = createServerFn({ method: "GET" }).handler(createSsrRpc("d58c98343591a2e7aad06ebb8d9be9b867b92872bda2667247f25bc6b67d000e"));
var $$splitComponentImporter = () => import("./selena-sources-DF3ezVsG.mjs");
var Route = createFileRoute("/_authed/app/selena-sources")({
	loader: () => listSelenaSourceProjectsFn(),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { getSelenaSourceMapFn as n, Route as t };

//# sourceMappingURL=selena-sources-BwFkrETq.mjs.map