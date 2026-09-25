import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { l as Outlet } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-DGaPewwB.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "52a29055-9eff-448f-bfa8-740829ce3b7f", e._sentryDebugIdIdentifier = "sentry-dbid-52a29055-9eff-448f-bfa8-740829ce3b7f");
	} catch (e) {}
})();
/**
* /app layout route
*
* The user-level half of the paywall (cloud only): a user whose every workspace
* is unsubscribed has nowhere under /app to go, so they are sent to pick a plan
* for their own workspace. The per-workspace half lives in $brand.tsx, which is
* the first route that knows which workspace is being looked at — this one
* can't answer that and doesn't try.
*
* /choose-plan lives outside this layout so an unentitled user can still reach it.
*/
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
//#endregion
export { SplitComponent as component };

//# sourceMappingURL=app-DGaPewwB.mjs.map