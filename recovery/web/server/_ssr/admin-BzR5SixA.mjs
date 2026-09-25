import { d as lazyRouteComponent, f as createFileRoute, w as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-BzR5SixA.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "27de8d5e-7126-4a85-aabe-ce4d855298be", e._sentryDebugIdIdentifier = "sentry-dbid-27de8d5e-7126-4a85-aabe-ce4d855298be");
	} catch (e) {}
})();
/**
* /admin layout - Admin section with access control
*
* Checks admin status; returns 404 if not admin.
* Wraps admin routes with admin-specific sidebar.
*/
var $$splitComponentImporter = () => import("./admin-BFfibMmO.mjs");
var checkAdminAccess = createServerFn({ method: "GET" }).handler(createSsrRpc("f2a5a79fac093130af3166cfd709c78d4188ffa14c793b8c7c7ed00d739fa4b9"));
var Route = createFileRoute("/_authed/admin")({
	beforeLoad: async () => {
		const { isAdmin, hasReportAccess } = await checkAdminAccess();
		if (!isAdmin) throw notFound();
		return {
			isAdmin,
			hasReportAccess
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=admin-BzR5SixA.mjs.map