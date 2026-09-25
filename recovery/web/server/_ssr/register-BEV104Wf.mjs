import { C as redirect, d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/register-BEV104Wf.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "9661087b-b10e-43aa-9105-0b7042cc3488", e._sentryDebugIdIdentifier = "sentry-dbid-9661087b-b10e-43aa-9105-0b7042cc3488");
	} catch (e) {}
})();
/**
* /auth/register - Account registration page
*
* Available in local mode for the single bootstrap signup and in cloud mode
* for public self-serve signup. Cloud requires email verification before
* sign-in and also offers Google OAuth.
*/
var $$splitComponentImporter = () => import("./register-DN8xQK5o.mjs");
var Route = createFileRoute("/auth/register")({
	validateSearch: object({ returnTo: string().optional() }),
	beforeLoad: ({ context }) => {
		if (!context.clientConfig?.canRegister) throw redirect({ to: "/auth/login" });
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=register-BEV104Wf.mjs.map