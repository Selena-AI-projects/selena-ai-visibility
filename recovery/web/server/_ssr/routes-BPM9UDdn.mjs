import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { g as useRouteContext } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as FullPageCard } from "./full-page-card-Bn7eTsZh.mjs";
import { t as Route } from "./routes-C8FrBba2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BPM9UDdn.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "5e135b13-7535-4a87-ba3e-b226f01fc769", e._sentryDebugIdIdentifier = "sentry-dbid-5e135b13-7535-4a87-ba3e-b226f01fc769");
	} catch (e) {}
})();
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
function HomePage() {
	const { redirect: redirectParam } = Route.useSearch();
	const canRegister = useRouteContext({ strict: false }).clientConfig?.canRegister ?? false;
	const withReturnTo = (path) => redirectParam ? `${path}?returnTo=${encodeURIComponent(redirectParam)}` : path;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		className: "",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center gap-3 w-full",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				className: "w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: withReturnTo("/auth/login"),
					children: "Sign In"
				})
			}), canRegister && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				variant: "outline",
				className: "w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: withReturnTo("/auth/register"),
					children: "Create an account"
				})
			})]
		})
	});
}
//#endregion
export { HomePage as component };

//# sourceMappingURL=routes-BPM9UDdn.mjs.map