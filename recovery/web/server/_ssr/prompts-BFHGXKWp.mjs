import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Skeleton } from "./skeleton-BcIvnIuu.mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
import { p as premiumSlotsUsed } from "./plans-D-CRwAoX.mjs";
import { t as getPremiumPoolFn } from "./premium-tracking-BBODBAMa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prompts-BFHGXKWp.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ec54d2cb-7b38-470b-b941-d5983a91eb80", e._sentryDebugIdIdentifier = "sentry-dbid-ec54d2cb-7b38-470b-b941-d5983a91eb80");
	} catch (e) {}
})();
/**
* /app/$brand/settings/prompts - Prompt management page
*
* Editor to add/edit/remove prompts.
*/
var $$splitComponentImporter = () => import("./prompts-D1CtYBFi.mjs");
var getPromptsForEditing = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(createSsrRpc("a0dd3391399a4e9d9933e4ae4026385f6411ac7564e83dc79a576cdedcc3e4ca"));
function PromptsSettingsSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-9 w-48" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-80" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: [
				0,
				1,
				2,
				3,
				4
			].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 p-3 border rounded-lg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 flex-1" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-20" })
				]
			}, n))
		})]
	});
}
var Route = createFileRoute("/_authed/app/$brand/settings/prompts")({
	loader: async ({ params }) => {
		const [brandPrompts, premiumPool] = await Promise.all([getPromptsForEditing({ data: { brandId: params.brand } }), getPremiumPoolFn({ data: { brandId: params.brand } })]);
		const spentHere = premiumSlotsUsed(brandPrompts);
		return {
			prompts: brandPrompts,
			premium: premiumPool.available ? {
				total: premiumPool.total,
				assignedElsewhere: Math.max(0, premiumPool.assigned - spentHere),
				brandId: params.brand
			} : void 0
		};
	},
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Prompts", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "Add, edit, or remove tracked prompts."
		}] };
	},
	pendingComponent: PromptsSettingsSkeleton,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=prompts-BFHGXKWp.mjs.map