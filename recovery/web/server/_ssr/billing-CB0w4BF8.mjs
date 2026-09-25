import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { D as number, M as string, O as object } from "../_libs/zod.mjs";
import { c as isPremiumAddonAvailable } from "./plans-D-CRwAoX.mjs";
import { d as countOrgEnabledPrompts, g as getOrgEntitlementsMap, l as countOrgAssignedPremiumSlots, m as getOrgBillingState, u as countOrgBrands } from "./entitlements-BlArge5u.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { n as isOrgAdminRole } from "./roles-CHs0lopm.mjs";
import { t as getDeployment } from "./server-B0rVTxL5.mjs";
import { i as setPremiumAddonQuantity } from "./server-CDtmD6L-.mjs";
import { a as listUserOrganizations, c as requireAuthSession, u as requireBrandOrganization } from "./helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/billing-CB0w4BF8.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8aa99a33-e184-426c-aa10-a36d633f3468", e._sentryDebugIdIdentifier = "sentry-dbid-8aa99a33-e184-426c-aa10-a36d633f3468");
	} catch (e) {}
})();
/**
* Billing server functions (cloud mode). Read paths power the paywall, the
* plan picker, and the billing settings page; the single write path adjusts
* the extra premium slots add-on quantity. Checkout, plan changes, portal,
* and cancellation all go through better-auth's Stripe endpoints client-side —
* no custom payment surface here.
*/
var getBillingStateFn_createServerFn_handler = createServerRpc({
	id: "98d4ed30035bde65b0328918e3634ff31a2c9d8f9efbc55902547a840416bbd2",
	name: "getBillingStateFn",
	filename: "src/server/billing.ts"
}, (opts) => getBillingStateFn.__executeServer(opts));
var getBillingStateFn = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(getBillingStateFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	const org = await requireBrandOrganization(session.user.id, data.brandId);
	const deployment = getDeployment();
	const state = await getOrgBillingState(org.id);
	const [brandsUsed, promptsUsed, premiumAssigned] = state.entitlements.unlimited ? [
		0,
		0,
		0
	] : await Promise.all([
		countOrgBrands(org.id),
		countOrgEnabledPrompts(org.id),
		countOrgAssignedPremiumSlots(org.id)
	]);
	return {
		billingEnabled: deployment.features.billing,
		organization: org,
		entitlements: state.entitlements,
		subscription: state.subscription ? {
			id: state.subscription.id,
			plan: state.subscription.plan,
			status: state.subscription.status ?? "incomplete",
			periodEnd: state.subscription.periodEnd?.toISOString() ?? null,
			cancelAtPeriodEnd: state.subscription.cancelAtPeriodEnd ?? false,
			billingInterval: state.subscription.billingInterval ?? null,
			seats: state.subscription.seats ?? null
		} : null,
		premiumAddonQuantity: state.settings?.premiumAddonQuantity ?? 0,
		premiumAddonAvailable: isPremiumAddonAvailable(state.entitlements.planKey),
		usage: {
			brands: brandsUsed,
			enabledPrompts: promptsUsed,
			premiumAssigned
		}
	};
});
var getPaywallStateFn_createServerFn_handler = createServerRpc({
	id: "5f11242512c7bba1e18b4e0d8ec7552683ca6da0d2ef8b654f87ce124717129f",
	name: "getPaywallStateFn",
	filename: "src/server/billing.ts"
}, (opts) => getPaywallStateFn.__executeServer(opts));
var getPaywallStateFn = createServerFn({ method: "GET" }).validator(object({ organizationId: string().optional() }).optional()).handler(getPaywallStateFn_createServerFn_handler, async ({ data }) => {
	if (!getDeployment().features.billing) return { needsPlan: false };
	const session = await requireAuthSession();
	const orgs = await listUserOrganizations(session.user.id);
	if (orgs.length === 0) return { needsPlan: false };
	const requested = data?.organizationId;
	const scoped = requested ? orgs.find((org) => org.id === requested) : void 0;
	if (requested && !scoped) return { needsPlan: false };
	const entitlementsByOrg = await getOrgEntitlementsMap(orgs.map((org) => org.id));
	const needsPlan = (org) => entitlementsByOrg.get(org.id)?.standing === "none";
	const subject = scoped ?? orgs[0];
	if (scoped ? !needsPlan(scoped) : !orgs.every(needsPlan)) return { needsPlan: false };
	return {
		needsPlan: true,
		organizationId: subject.id,
		organizationName: subject.name,
		isOrgAdmin: isOrgAdminRole(subject.role)
	};
});
var setPremiumAddonQuantityFn_createServerFn_handler = createServerRpc({
	id: "4ef3fc7530762f1f6733e82577c9b547074d21ab1f9246d892c5ff7a9ad06a3d",
	name: "setPremiumAddonQuantityFn",
	filename: "src/server/billing.ts"
}, (opts) => setPremiumAddonQuantityFn.__executeServer(opts));
var setPremiumAddonQuantityFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	quantity: number().int().min(0).max(1e3)
})).handler(setPremiumAddonQuantityFn_createServerFn_handler, async ({ data }) => {
	if (!getDeployment().features.billing) throw new Error("Billing is not enabled on this deployment");
	const session = await requireAuthSession();
	const org = await requireBrandOrganization(session.user.id, data.brandId);
	if (!isOrgAdminRole(org.role)) throw new Error("Only workspace admins can change billing");
	const state = await getOrgBillingState(org.id);
	if (!isPremiumAddonAvailable(state.entitlements.planKey)) throw new Error("Extra premium pairings are available on the Pro and Business plans");
	if (!state.subscription?.stripeSubscriptionId) throw new Error("No active subscription to attach the add-on to");
	const included = state.entitlements.premiumPool - (state.settings?.premiumAddonQuantity ?? 0);
	const assigned = await countOrgAssignedPremiumSlots(org.id);
	if (assigned > included + data.quantity) throw new Error(`${assigned} premium pairings are in use; unassign ${assigned - included - data.quantity} before reducing the add-on`);
	return { quantity: await setPremiumAddonQuantity({
		stripeSubscriptionId: state.subscription.stripeSubscriptionId,
		organizationId: org.id,
		quantity: data.quantity
	}) };
});
//#endregion
export { getBillingStateFn_createServerFn_handler, getPaywallStateFn_createServerFn_handler, setPremiumAddonQuantityFn_createServerFn_handler };

//# sourceMappingURL=billing-CB0w4BF8.mjs.map