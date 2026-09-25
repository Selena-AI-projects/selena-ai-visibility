import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, c as _enum, f as array } from "../_libs/zod.mjs";
import { Dt as planIds } from "./src-BdeAuGX5.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { s as requireAdmin } from "./helpers-phr0Aqka.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { a as startSelenaMeasurement, i as prepareSelenaScenarios, n as decideSelenaScenarios, r as getSelenaOrderDesk, t as createSelenaOrderDraft } from "./selena-order-desk-core-VYmlVsWR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-order-desk-x5B6M4Mv.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ae5ef2df-0028-4bbb-be4a-99282614496d", e._sentryDebugIdIdentifier = "sentry-dbid-ae5ef2df-0028-4bbb-be4a-99282614496d");
	} catch (e) {}
})();
/**
* Client-safe RPC facade for the Selena order desk.
*
* Keep database-backed implementations in selena-order-desk-core.ts. A client
* component imports this module, so regular exports or top-level database work
* here would pull pg into the browser bundle and fail before hydration.
*/
async function requireAdminContext() {
	await requireAdmin();
	return resolveSessionAuthContext();
}
var projectIdSchema = object({ projectId: string().uuid() });
var orderDraftSchema = projectIdSchema.extend({
	planId: _enum(planIds),
	scenarioIds: array(string().uuid()).min(1).max(200),
	idempotencyKey: string().min(1).max(200)
});
var getSelenaOrderDeskFn_createServerFn_handler = createServerRpc({
	id: "c22f813e23b7ceae47c2d33713e6ffff88601316938ab520f209105df8e3bba1",
	name: "getSelenaOrderDeskFn",
	filename: "src/server/selena-order-desk.ts"
}, (opts) => getSelenaOrderDeskFn.__executeServer(opts));
var getSelenaOrderDeskFn = createServerFn({ method: "GET" }).handler(getSelenaOrderDeskFn_createServerFn_handler, async () => getSelenaOrderDesk(await requireAdminContext()));
var prepareSelenaScenariosFn_createServerFn_handler = createServerRpc({
	id: "9bc43283363483d8dad108bbec8cae093c3e92efa1e596596beb79a8cbe8be6c",
	name: "prepareSelenaScenariosFn",
	filename: "src/server/selena-order-desk.ts"
}, (opts) => prepareSelenaScenariosFn.__executeServer(opts));
var prepareSelenaScenariosFn = createServerFn({ method: "POST" }).validator(projectIdSchema).handler(prepareSelenaScenariosFn_createServerFn_handler, async ({ data }) => prepareSelenaScenarios(await resolveSessionAuthContext(), data.projectId));
var decideSelenaScenariosFn_createServerFn_handler = createServerRpc({
	id: "64a389a81fbc12443d23564a6674f1da6f7d8e2d77374dd48feb4249478e5e7f",
	name: "decideSelenaScenariosFn",
	filename: "src/server/selena-order-desk.ts"
}, (opts) => decideSelenaScenariosFn.__executeServer(opts));
var decideSelenaScenariosFn = createServerFn({ method: "POST" }).validator(projectIdSchema.extend({
	scenarioIds: array(string().uuid()).min(1).max(200),
	decision: _enum([
		"APPROVED",
		"REJECTED",
		"PROPOSED"
	])
})).handler(decideSelenaScenariosFn_createServerFn_handler, async ({ data }) => decideSelenaScenarios(await resolveSessionAuthContext(), data));
var createSelenaOrderDraftFn_createServerFn_handler = createServerRpc({
	id: "f821edffe6139965a869578fe7dadffa2973811050520eeda960a5ee9eae8860",
	name: "createSelenaOrderDraftFn",
	filename: "src/server/selena-order-desk.ts"
}, (opts) => createSelenaOrderDraftFn.__executeServer(opts));
var createSelenaOrderDraftFn = createServerFn({ method: "POST" }).validator(orderDraftSchema).handler(createSelenaOrderDraftFn_createServerFn_handler, async ({ data }) => createSelenaOrderDraft(await requireAdminContext(), data));
var startSelenaMeasurementFn_createServerFn_handler = createServerRpc({
	id: "4af48e6284744c0cdf472a87e18bfb1c6de1e6d1638f02a088f36468612ef554",
	name: "startSelenaMeasurementFn",
	filename: "src/server/selena-order-desk.ts"
}, (opts) => startSelenaMeasurementFn.__executeServer(opts));
var startSelenaMeasurementFn = createServerFn({ method: "POST" }).validator(orderDraftSchema).handler(startSelenaMeasurementFn_createServerFn_handler, async ({ data }) => startSelenaMeasurement(await requireAdminContext(), data));
//#endregion
export { createSelenaOrderDraftFn_createServerFn_handler, decideSelenaScenariosFn_createServerFn_handler, getSelenaOrderDeskFn_createServerFn_handler, prepareSelenaScenariosFn_createServerFn_handler, startSelenaMeasurementFn_createServerFn_handler };

//# sourceMappingURL=selena-order-desk-x5B6M4Mv.mjs.map