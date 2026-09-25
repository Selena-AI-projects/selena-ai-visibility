import { d as lazyRouteComponent, f as createFileRoute } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as listSelenaWorkspaces } from "./_ssr/selena-workspaces-BwiY6M8I.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_cycleId-qyaWjH7B.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "9831c875-6894-4d32-ad2c-ac96dfe1eb70", e._sentryDebugIdIdentifier = "sentry-dbid-9831c875-6894-4d32-ad2c-ac96dfe1eb70");
	} catch (e) {}
})();
var $$splitComponentImporter = () => import("./_cycleId-BZwEL8OS.mjs");
var Route = createFileRoute("/_authed/selena/local/$cycleId")({
	loader: () => listSelenaWorkspaces(),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=_cycleId-qyaWjH7B.mjs.map