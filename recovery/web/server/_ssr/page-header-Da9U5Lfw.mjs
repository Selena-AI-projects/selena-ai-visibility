import { A as IconInfoCircle } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/page-header-Da9U5Lfw.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "841e13e8-bced-45f8-8f5a-1cfce67e81d1", e._sentryDebugIdIdentifier = "sentry-dbid-841e13e8-bced-45f8-8f5a-1cfce67e81d1");
	} catch (e) {}
})();
/** Title + subtitle block. No filter state, no data fetching — callers
*  compose the filter section and content as children. */
function PageHeader({ title, subtitle, infoContent, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-3xl font-bold flex items-center gap-2",
				children: [title, infoContent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-5 w-5 text-muted-foreground cursor-help" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
					className: "max-w-xs text-sm font-normal",
					children: infoContent
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground mt-1",
				children: subtitle
			})]
		}), children]
	});
}
/** Wrapper for the filter bar + visibility bar sitting under the page title. */
function FilterSection({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pt-2 pb-4",
		children
	});
}
//#endregion
export { PageHeader as n, FilterSection as t };

//# sourceMappingURL=page-header-Da9U5Lfw.mjs.map