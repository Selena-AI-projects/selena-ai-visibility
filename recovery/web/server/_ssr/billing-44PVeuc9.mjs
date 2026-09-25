import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { D as number, M as string, O as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/billing-44PVeuc9.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ee18eecf-f9a6-4015-b83a-aeecdd25c8d5", e._sentryDebugIdIdentifier = "sentry-dbid-ee18eecf-f9a6-4015-b83a-aeecdd25c8d5");
	} catch (e) {}
})();
/**
* Billing server functions (cloud mode). Read paths power the paywall, the
* plan picker, and the billing settings page; the single write path adjusts
* the extra premium slots add-on quantity. Checkout, plan changes, portal,
* and cancellation all go through better-auth's Stripe endpoints client-side —
* no custom payment surface here.
*/
var getBillingStateFn = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(createSsrRpc("98d4ed30035bde65b0328918e3634ff31a2c9d8f9efbc55902547a840416bbd2"));
/**
* The paywall decision, and the org it is about.
*
* Two questions, one answer shape, because the callers ask different ones:
*  - with `organizationId` (a brand's owning org): is *this* workspace paid up?
*  - without: does this user have anywhere at all to go? Any entitled org keeps
*    the app usable; only a user whose every org is unsubscribed is stopped, and
*    they are pointed at their own workspace.
*
* The org always comes back with the verdict. A paywall that says "pay" without
* saying "for what" is how a member of a paid team and an unpaid one ends up at
* checkout for the wrong workspace.
*/
var getPaywallStateFn = createServerFn({ method: "GET" }).validator(object({ organizationId: string().optional() }).optional()).handler(createSsrRpc("5f11242512c7bba1e18b4e0d8ec7552683ca6da0d2ef8b654f87ce124717129f"));
var setPremiumAddonQuantityFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	quantity: number().int().min(0).max(1e3)
})).handler(createSsrRpc("4ef3fc7530762f1f6733e82577c9b547074d21ab1f9246d892c5ff7a9ad06a3d"));
//#endregion
export { getPaywallStateFn as n, setPremiumAddonQuantityFn as r, getBillingStateFn as t };

//# sourceMappingURL=billing-44PVeuc9.mjs.map