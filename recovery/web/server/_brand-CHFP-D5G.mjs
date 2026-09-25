import { a as require_jsx_runtime } from "./_libs/react+tanstack__react-query.mjs";
import { C as redirect, d as lazyRouteComponent, f as createFileRoute, w as notFound } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as Skeleton } from "./_ssr/skeleton-BcIvnIuu.mjs";
import { d as SidebarProvider, s as SidebarInset } from "./_ssr/sidebar-DNi-GjZe.mjs";
import { c as createServerFn } from "./_ssr/createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./_ssr/createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object } from "./_libs/zod.mjs";
import { n as getAppName } from "./_ssr/route-head-BwwsuPJZ.mjs";
import { n as getOnboardingPlatformStateFn } from "./_ssr/platform-picks-CbYihqfx.mjs";
import { o as validateBrandFilterSearch } from "./_ssr/use-list-filters-BRE2FD-y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_brand-CHFP-D5G.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "9629dd59-38ad-431c-b702-68be60bcbe63", e._sentryDebugIdIdentifier = "sentry-dbid-9629dd59-38ad-431c-b702-68be60bcbe63");
	} catch (e) {}
})();
/**
* /app/$brand layout - Brand-specific layout with sidebar
*
* Fetches brand data and provides it to child routes.
* Shows sidebar navigation, header, and optional demo banner.
* If brand exists in auth but not in DB, shows onboarding.
*/
var $$splitComponentImporter = () => import("./_brand-ClJNvY4g.mjs");
/** No access, and nothing else worth saying about it. */
var getBrandData = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(createSsrRpc("fc6a47a0a39ce2ca6e5f16d9e9e0c669f201a6f5d88746f36905886fe47f3b85"));
function BrandLayoutSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "w-[var(--sidebar-width)] shrink-0 hidden md:block",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-4 p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-full" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-full" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-full" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-full" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-full" })
				]
			})]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarInset, {
		className: "md:border md:border-border/60 md:rounded-xl overflow-clip",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex h-14 items-center gap-2 px-4 border-b",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-6" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-32" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-1 flex-col",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4 p-4 md:gap-6 md:p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-9 w-48" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-80" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-10 w-full" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-64 w-full rounded-lg" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-64 w-full rounded-lg" })
					]
				})]
			})
		})]
	})] });
}
var Route = createFileRoute("/_authed/app/$brand")({
	validateSearch: validateBrandFilterSearch,
	loader: async ({ params }) => {
		const result = await getBrandData({ data: { brandId: params.brand } });
		if (!result.hasAccess) throw notFound();
		if (result.unpaidOrganizationId) throw redirect({
			to: "/choose-plan",
			search: { org: result.unpaidOrganizationId }
		});
		const needsOnboarding = result.brand === null;
		const onboardingPlatformState = needsOnboarding ? await getOnboardingPlatformStateFn({ data: { organizationId: params.brand } }) : null;
		return {
			brand: result.brand,
			brandName: result.brandName,
			isAdmin: result.isAdmin,
			hasReportAccess: result.hasReportAccess,
			needsOnboarding,
			onboardingPlatformState
		};
	},
	head: ({ match, loaderData }) => {
		const appName = getAppName(match);
		const brandName = loaderData?.brandName;
		return { meta: [{ title: brandName ? `${brandName} · ${appName}` : appName }, {
			name: "description",
			content: brandName ? `AI visibility tracking for ${brandName}.` : "AI visibility tracking and optimization."
		}] };
	},
	staleTime: 3e5,
	pendingComponent: BrandLayoutSkeleton,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=_brand-CHFP-D5G.mjs.map