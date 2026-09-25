import { d as lazyRouteComponent, f as createFileRoute, w as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { n as getAppName } from "./route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-C8vqkJKv.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "d8767a31-04a2-4bb5-948d-20982f31dd70", e._sentryDebugIdIdentifier = "sentry-dbid-d8767a31-04a2-4bb5-948d-20982f31dd70");
	} catch (e) {}
})();
/**
* /reports - Reports list page
*
* Requires admin OR report generator access.
* Replicates: apps/web/src/app/reports/page.tsx + reports-content.tsx
*/
var $$splitComponentImporter = () => import("./reports-Dz7gl1zD.mjs");
var checkReportAccess = createServerFn({ method: "GET" }).handler(createSsrRpc("6f40e56bdf7da40863bd5ba6f61821c7fededfedff95271a911b352f996d781d"));
var Route = createFileRoute("/_authed/reports/")({
	head: ({ match }) => {
		return { meta: [{ title: `Reports · ${getAppName(match)}` }, {
			name: "description",
			content: "Generate and view one-time brand reports."
		}] };
	},
	beforeLoad: async () => {
		const { hasAccess, isAdmin, hasReportAccess } = await checkReportAccess();
		if (!hasAccess) throw notFound();
		return {
			isAdmin,
			hasReportAccess
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=reports-C8vqkJKv.mjs.map