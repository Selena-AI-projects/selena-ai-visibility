import { d as lazyRouteComponent, f as createFileRoute, w as notFound } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as getSelenaAdminAccessFn, s as getSelenaAdminOrderQueueFn } from "./selena-admin-orders-CbZS8oDU.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-admin-CiX-uoh-.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "195f5407-4814-44b9-88bb-7ebb4e4f4150", e._sentryDebugIdIdentifier = "sentry-dbid-195f5407-4814-44b9-88bb-7ebb4e4f4150");
	} catch (e) {}
})();
var $$splitComponentImporter = () => import("./selena-admin-rrXcI_V6.mjs");
var Route = createFileRoute("/_authed/app/selena-admin")({
	beforeLoad: async () => {
		const { isAdmin } = await getSelenaAdminAccessFn();
		if (!isAdmin) throw notFound();
	},
	loader: () => getSelenaAdminOrderQueueFn(),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=selena-admin-CiX-uoh-.mjs.map