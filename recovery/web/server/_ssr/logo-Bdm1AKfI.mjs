import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { g as useRouteContext } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SelenaWordmark } from "./selena-wordmark-DhsBFluR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/logo-Bdm1AKfI.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ac0d51e9-50b4-43bd-a9f2-3abaa0dfd2f9", e._sentryDebugIdIdentifier = "sentry-dbid-ac0d51e9-50b4-43bd-a9f2-3abaa0dfd2f9");
	} catch (e) {}
})();
function Logo({ className, iconClassName, textClassName, ...props }) {
	const branding = useRouteContext({ strict: false }).clientConfig?.branding;
	if (!branding?.icon || !branding?.name || branding.icon === "/icons/selena-icon.svg" && branding.name === "Selena Systems") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		...props,
		className: cn("flex items-center gap-2", className),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaWordmark, { className: textClassName })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		...props,
		className: cn("flex items-center gap-2", className),
		children: [branding?.icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: branding.icon,
			alt: `${branding.name} logo`,
			className: cn("size-5", iconClassName),
			fetchPriority: "low"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("text-base font-semibold", textClassName),
			children: branding?.name
		})]
	});
}
//#endregion
export { Logo as t };

//# sourceMappingURL=logo-Bdm1AKfI.mjs.map