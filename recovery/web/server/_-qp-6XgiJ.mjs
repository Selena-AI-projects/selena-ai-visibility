import { a as require_jsx_runtime } from "./_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./_ssr/button-DFsJLuMy.mjs";
import { m as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as Route } from "./_-7zHo7IqP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_-qp-6XgiJ.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "18ecc76e-f609-44ac-a49f-d086e5286288", e._sentryDebugIdIdentifier = "sentry-dbid-18ecc76e-f609-44ac-a49f-d086e5286288");
	} catch (e) {}
})();
function BrandSubpathNotFound() {
	const { brand: brandId } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-bold tracking-tight",
				children: "404 Not Found"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground mt-1",
				children: "The page you're looking for doesn't exist."
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pt-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/app/$brand",
					params: { brand: brandId },
					children: "Go Back"
				})
			})
		})]
	});
}
//#endregion
export { BrandSubpathNotFound as component };

//# sourceMappingURL=_-qp-6XgiJ.mjs.map