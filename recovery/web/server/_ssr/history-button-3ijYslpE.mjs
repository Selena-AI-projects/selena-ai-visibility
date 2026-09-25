import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as GoStack } from "../_libs/react-icons.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/history-button-3ijYslpE.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "afa7e9c2-837e-4efd-81cb-25c44bc57f39", e._sentryDebugIdIdentifier = "sentry-dbid-afa7e9c2-837e-4efd-81cb-25c44bc57f39");
	} catch (e) {}
})();
function HistoryButton({ brandId, promptName, promptId, tab }) {
	if (!brandId || !promptId) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		size: "sm",
		variant: "secondary",
		className: "text-xs cursor-pointer h-6 flex items-center px-2",
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/app/$brand/prompts/$promptId",
			params: {
				brand: brandId,
				promptId
			},
			search: tab ? { tab } : void 0,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoStack, { className: "size-3 mr-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs font-normal",
				children: "View Details"
			})]
		})
	});
}
//#endregion
export { HistoryButton as t };

//# sourceMappingURL=history-button-3ijYslpE.mjs.map