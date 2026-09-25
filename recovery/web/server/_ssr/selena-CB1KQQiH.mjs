import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as getSelenaAdminAccessFn } from "./selena-admin-orders-CbZS8oDU.mjs";
import { n as getSelenaWorkspaceFn } from "./selena-client-DuI6j9MY.mjs";
import { t as getSelenaLocalVisibilityStateFn } from "./selena-local-visibility-2f4Yzn8q.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-CB1KQQiH.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "23d54bf6-0e21-4025-90aa-2193091882da", e._sentryDebugIdIdentifier = "sentry-dbid-23d54bf6-0e21-4025-90aa-2193091882da");
	} catch (e) {}
})();
var $$splitComponentImporter = () => import("./selena-D2BAfN22.mjs");
var Route = createFileRoute("/_authed/app/selena")({
	loader: async () => ({
		workspace: await getSelenaWorkspaceFn(),
		localVisibility: await getSelenaLocalVisibilityStateFn(),
		access: await getSelenaAdminAccessFn()
	}),
	pendingComponent: WorkspaceSkeleton,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
function WorkspaceSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "selena-app min-h-screen px-5 py-10 sm:px-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-7xl animate-pulse space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-48 rounded bg-[#dccfbe]" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-56 rounded-2xl bg-[#dccfbe]" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-72 rounded-2xl bg-[#eee6dc]" })
			]
		})
	});
}
//#endregion
export { Route as t };

//# sourceMappingURL=selena-CB1KQQiH.mjs.map