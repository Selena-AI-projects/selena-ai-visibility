import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reset-password-DotdJU4P.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "cc8ca216-6ead-41e1-a0e8-8bb49939b95a", e._sentryDebugIdIdentifier = "sentry-dbid-cc8ca216-6ead-41e1-a0e8-8bb49939b95a");
	} catch (e) {}
})();
/**
* /auth/reset-password - Choose a new password from a reset link (cloud only)
*
* Better-auth redirects here with ?token=... on a valid link, or
* ?error=INVALID_TOKEN on a bad one.
*/
var $$splitComponentImporter = () => import("./reset-password-DGGEoita.mjs");
var Route = createFileRoute("/auth/reset-password")({
	validateSearch: object({
		token: string().optional(),
		error: string().optional()
	}),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=reset-password-DotdJU4P.mjs.map