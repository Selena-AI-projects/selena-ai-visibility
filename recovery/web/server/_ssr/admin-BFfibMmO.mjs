import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { l as Outlet } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as SidebarProvider, s as SidebarInset } from "./sidebar-DNi-GjZe.mjs";
import { n as SiteHeader, t as AppSidebar } from "./site-header-DM9jZ_Ek.mjs";
import { t as Route } from "./admin-BzR5SixA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-BFfibMmO.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "84a8bd5d-9ed2-44bc-b95c-6e12c2e0abe3", e._sentryDebugIdIdentifier = "sentry-dbid-84a8bd5d-9ed2-44bc-b95c-6e12c2e0abe3");
	} catch (e) {}
})();
/**
* /admin layout - Admin section with access control
*
* Checks admin status; returns 404 if not admin.
* Wraps admin routes with admin-specific sidebar.
*/
function AdminLayout() {
	const { isAdmin, hasReportAccess } = Route.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppSidebar, {
		isAdmin,
		hasReportAccess,
		scope: "admin"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarInset, {
		className: "md:border md:border-border/60 md:rounded-xl overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-1 flex-col",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "@container/main flex flex-1 flex-col gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-col gap-4 p-4 md:gap-6 md:p-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
				})
			})
		})]
	})] });
}
//#endregion
export { AdminLayout as component };

//# sourceMappingURL=admin-BFfibMmO.mjs.map