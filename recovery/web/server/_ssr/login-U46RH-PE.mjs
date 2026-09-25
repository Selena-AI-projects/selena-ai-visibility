import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-U46RH-PE.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "35ba2a88-5353-40d4-b57f-74dd8a86ba48", e._sentryDebugIdIdentifier = "sentry-dbid-35ba2a88-5353-40d4-b57f-74dd8a86ba48");
	} catch (e) {}
})();
/** Password resets are available to cloud users and the invited self-serve pilot. */
function canResetPassword(clientConfig) {
	return clientConfig?.mode === "cloud" || clientConfig?.features?.selfServeSignup === true;
}
var $$splitComponentImporter = () => import("./login-_CvetHKj.mjs");
var Route = createFileRoute("/auth/login")({
	validateSearch: object({ returnTo: string().optional() }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { canResetPassword as n, Route as t };

//# sourceMappingURL=login-U46RH-PE.mjs.map