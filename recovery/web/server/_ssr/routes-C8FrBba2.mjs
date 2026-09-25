import { C as redirect, d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C8FrBba2.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "4401994f-3ff9-4eff-ae75-955cf2ff2bb1", e._sentryDebugIdIdentifier = "sentry-dbid-4401994f-3ff9-4eff-ae75-955cf2ff2bb1");
	} catch (e) {}
})();
/**
* Better-auth session helpers for TanStack Start.
*
* Server functions that check the session on navigation and in route guards.
*/
var getSession = createServerFn({ method: "GET" }).handler(createSsrRpc("897428c771b824425e52896c7aee422f8a17443227968997e9f2062b729b2956"));
createServerFn({ method: "GET" }).handler(createSsrRpc("c50e344ce10e0aece758223c270bdde1c99b9955502f139b868033693ed9ceeb"));
/**
* Home page - / route
*
* Redirects authenticated users to /app.
* In demo mode, auto-redirects unauthenticated users to /auth/login
* (the login page pre-fills the demo credentials, so the bare home page
* is just a redundant extra click).
* On a fresh deployment that needs bootstrapping (registration is open
* AND no users exist yet), redirects to /auth/register so the first
* visitor sees the signup screen instead of an empty-database login form.
* Shows sign-in for unauthenticated users in other modes.
*/
var $$splitComponentImporter = () => import("./routes-BPM9UDdn.mjs");
var Route = createFileRoute("/")({
	validateSearch: (search) => ({ redirect: typeof search.redirect === "string" ? search.redirect : void 0 }),
	beforeLoad: async ({ context, search }) => {
		const session = await getSession();
		if (session) throw redirect({ to: "/app" });
		if (context.clientConfig?.mode === "demo") throw redirect({
			to: "/auth/login",
			search: search.redirect ? { returnTo: search.redirect } : {}
		});
		if (context.clientConfig?.canRegister && !context.clientConfig?.hasUsers) throw redirect({
			to: "/auth/register",
			search: search.redirect ? { returnTo: search.redirect } : {}
		});
		return { session };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { getSession as n, Route as t };

//# sourceMappingURL=routes-C8FrBba2.mjs.map