import { C as redirect, d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
import { t as getBillingStateFn } from "./billing-44PVeuc9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/billing-D87jHz2s.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7e85a49d-f8da-4fd1-b97c-849ea6d0cb4c", e._sentryDebugIdIdentifier = "sentry-dbid-7e85a49d-f8da-4fd1-b97c-849ea6d0cb4c");
	} catch (e) {}
})();
/**
* /app/$brand/settings/billing — plan, usage meters, and the extra-premium-
* prompts add-on (cloud only).
*
* Card changes, invoices, plan switches, and cancellation go through the
* Stripe Customer Portal / Checkout via better-auth — no card data or payment
* state lives here. The redirect in the loader is UX only; the real gates are
* the entitlement guards in the server functions.
*/
var $$splitComponentImporter = () => import("./billing--BAIrLJi.mjs");
var Route = createFileRoute("/_authed/app/$brand/settings/billing")({
	loader: async ({ params, context }) => {
		if (!context.clientConfig?.features.billing) throw redirect({
			to: "/app/$brand",
			params: { brand: params.brand }
		});
		return getBillingStateFn({ data: { brandId: params.brand } });
	},
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Billing", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "Manage your plan, usage, and billing."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=billing-D87jHz2s.mjs.map