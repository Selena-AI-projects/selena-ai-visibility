import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { C as redirect, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-NxTnyA6u.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "b5df359a-8b21-494b-9afa-ca2bcad9367c", e._sentryDebugIdIdentifier = "sentry-dbid-b5df359a-8b21-494b-9afa-ca2bcad9367c");
	} catch (e) {}
})();
var CANONICAL_PUBLIC_READINESS_URL = "https://www.selenasystems.com/check";
var CANONICAL_PUBLIC_READINESS_PAYLOAD = {
	error: "Canonical Public Readiness Surface",
	code: "PUBLIC_READINESS_MOVED",
	message: "The free Public Readiness check runs only on selenasystems.com/check.",
	canonicalUrl: CANONICAL_PUBLIC_READINESS_URL,
	providerCalls: 0,
	measurementJobsCreated: 0
};
function canonicalPublicReadinessResponse() {
	return Response.json(CANONICAL_PUBLIC_READINESS_PAYLOAD, {
		status: 410,
		headers: {
			Link: `<${CANONICAL_PUBLIC_READINESS_URL}>; rel="canonical"`,
			"Cache-Control": "no-store"
		}
	});
}
var SELENA_PUBLIC_READINESS_URL = CANONICAL_PUBLIC_READINESS_URL;
/**
* Public Readiness has one canonical surface. The authenticated application
* keeps projects and paid measurement results; it does not run a second free
* scanner with a different scoring contract.
*/
var Route = createFileRoute("/selena")({
	beforeLoad: () => {
		throw redirect({ href: SELENA_PUBLIC_READINESS_URL });
	},
	component: CanonicalReadinessRedirect
});
function CanonicalReadinessRedirect() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6 py-16",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium text-muted-foreground",
				children: "Selena Public Readiness"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-4xl font-semibold tracking-tight",
				children: "Continue to the canonical free check"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground",
				children: "The free readiness audit now runs on Selena Systems so every URL receives one versioned result."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				className: "underline underline-offset-4",
				href: SELENA_PUBLIC_READINESS_URL,
				children: "Open selenasystems.com/check"
			})
		]
	});
}
//#endregion
export { canonicalPublicReadinessResponse as i, Route as n, SELENA_PUBLIC_READINESS_URL as r, CanonicalReadinessRedirect as t };

//# sourceMappingURL=selena-NxTnyA6u.mjs.map