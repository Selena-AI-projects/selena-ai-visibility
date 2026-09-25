import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { n as getSelenaWorkspaceFn } from "./selena-client-DuI6j9MY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-order-DqkWHSWS.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "41c118b9-3df9-42a7-9c29-d2a6f74370b4", e._sentryDebugIdIdentifier = "sentry-dbid-41c118b9-3df9-42a7-9c29-d2a6f74370b4");
	} catch (e) {}
})();
/**
* /app/selena-order - the customer asks for a paid measurement plan.
*
* There is no online checkout yet, so this page collects a request — project,
* plan, contact — and a pilot invite code stands in for payment: an unspent,
* unexpired seat issued for this plan makes the request free of charge, once.
* The operator sees every request on the admin desk and builds the actual
* order there; nothing on this page touches quotes, orders or the queue.
*/
var $$splitComponentImporter = () => import("./selena-order-DTQ9y_Ck.mjs");
var Route = createFileRoute("/_authed/app/selena-order")({
	validateSearch: object({
		plan: _enum(["snapshot", "landscape"]).optional(),
		project: string().uuid().optional()
	}),
	loader: () => getSelenaWorkspaceFn(),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=selena-order-DqkWHSWS.mjs.map