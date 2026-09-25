import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { l as Outlet } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-DXlEj_Bi.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "1bb8a572-29cc-41a8-90b2-a14fbb9ce0a3", e._sentryDebugIdIdentifier = "sentry-dbid-1bb8a572-29cc-41a8-90b2-a14fbb9ce0a3");
	} catch (e) {}
})();
/**
* /reports layout route
*
* Passthrough layout for the /reports section. Per-user access control is
* handled at the page level; here we gate the whole subtree on the deployment
* feature so cloud (report generation disabled) 404s every /reports/* route,
* including the admin-accessible list and the render route.
*/
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
//#endregion
export { SplitComponent as component };

//# sourceMappingURL=reports-DXlEj_Bi.mjs.map