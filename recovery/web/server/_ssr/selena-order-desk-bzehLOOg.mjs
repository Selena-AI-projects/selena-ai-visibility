import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, c as _enum, f as array } from "../_libs/zod.mjs";
import { Dt as planIds } from "./src-BdeAuGX5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-order-desk-bzehLOOg.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "64a0ddbc-c7ac-4ebc-beb8-8e9a807ac8da", e._sentryDebugIdIdentifier = "sentry-dbid-64a0ddbc-c7ac-4ebc-beb8-8e9a807ac8da");
	} catch (e) {}
})();
/**
* Client-safe RPC facade for the Selena order desk.
*
* Keep database-backed implementations in selena-order-desk-core.ts. A client
* component imports this module, so regular exports or top-level database work
* here would pull pg into the browser bundle and fail before hydration.
*/
var projectIdSchema = object({ projectId: string().uuid() });
var orderDraftSchema = projectIdSchema.extend({
	planId: _enum(planIds),
	scenarioIds: array(string().uuid()).min(1).max(200),
	idempotencyKey: string().min(1).max(200)
});
var getSelenaOrderDeskFn = createServerFn({ method: "GET" }).handler(createSsrRpc("c22f813e23b7ceae47c2d33713e6ffff88601316938ab520f209105df8e3bba1"));
var prepareSelenaScenariosFn = createServerFn({ method: "POST" }).validator(projectIdSchema).handler(createSsrRpc("9bc43283363483d8dad108bbec8cae093c3e92efa1e596596beb79a8cbe8be6c"));
var decideSelenaScenariosFn = createServerFn({ method: "POST" }).validator(projectIdSchema.extend({
	scenarioIds: array(string().uuid()).min(1).max(200),
	decision: _enum([
		"APPROVED",
		"REJECTED",
		"PROPOSED"
	])
})).handler(createSsrRpc("64a389a81fbc12443d23564a6674f1da6f7d8e2d77374dd48feb4249478e5e7f"));
createServerFn({ method: "POST" }).validator(orderDraftSchema).handler(createSsrRpc("f821edffe6139965a869578fe7dadffa2973811050520eeda960a5ee9eae8860"));
var startSelenaMeasurementFn = createServerFn({ method: "POST" }).validator(orderDraftSchema).handler(createSsrRpc("4af48e6284744c0cdf472a87e18bfb1c6de1e6d1638f02a088f36468612ef554"));
//#endregion
export { startSelenaMeasurementFn as i, getSelenaOrderDeskFn as n, prepareSelenaScenariosFn as r, decideSelenaScenariosFn as t };

//# sourceMappingURL=selena-order-desk-bzehLOOg.mjs.map