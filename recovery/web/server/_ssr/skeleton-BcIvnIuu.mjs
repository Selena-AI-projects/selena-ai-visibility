import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/skeleton-BcIvnIuu.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "e6b8578c-bf4b-46e5-916f-02b64616dc16", e._sentryDebugIdIdentifier = "sentry-dbid-e6b8578c-bf4b-46e5-916f-02b64616dc16");
	} catch (e) {}
})();
function Skeleton({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		"data-slot": "skeleton",
		className: cn("bg-accent animate-pulse rounded-md", className),
		...props
	});
}
//#endregion
export { Skeleton as t };

//# sourceMappingURL=skeleton-BcIvnIuu.mjs.map