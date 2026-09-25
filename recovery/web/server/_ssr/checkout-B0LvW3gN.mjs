import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as listSelenaWorkspaces } from "./selena-workspaces-BwiY6M8I.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout-B0LvW3gN.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8740597d-68b7-460c-bf49-6fee10d93771", e._sentryDebugIdIdentifier = "sentry-dbid-8740597d-68b7-460c-bf49-6fee10d93771");
	} catch (e) {}
})();
var $$splitComponentImporter = () => import("./checkout-CAO-HiPh.mjs");
var Route = createFileRoute("/_authed/selena/local/checkout")({
	loader: () => listSelenaWorkspaces(),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=checkout-B0LvW3gN.mjs.map