import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { h as getOrgEntitlements, l as countOrgAssignedPremiumSlots } from "./entitlements-BlArge5u.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, u as requireBrandOrganization } from "./helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/premium-tracking-v99T5BoZ.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7dba8f05-54e3-4da7-aacc-4fd3b164f0c5", e._sentryDebugIdIdentifier = "sentry-dbid-7dba8f05-54e3-4da7-aacc-4fd3b164f0c5");
	} catch (e) {}
})();
/**
* The organization's premium allowance (cloud plans).
*
* A premium model called without web search is an ordinary platform pick that
* every standard plan may choose. Grounded, it is metered per prompt because the
* call costs roughly ten times an ungrounded one: the plan includes a pool of
* prompt/model slots and Pro/Business can buy more.
*
* Which prompts spend the pool is chosen in the prompts editor and saved with
* the rest of a prompt's fields, so this module only reports the totals the
* LLM settings page shows.
*/
var getPremiumPoolFn_createServerFn_handler = createServerRpc({
	id: "d43803adc4ad123bfec8823e8190d091fd2df60e2e50125e7eb7deb260e03df4",
	name: "getPremiumPoolFn",
	filename: "src/server/premium-tracking.ts"
}, (opts) => getPremiumPoolFn.__executeServer(opts));
var getPremiumPoolFn = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(getPremiumPoolFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	const { id: organizationId } = await requireBrandOrganization(session.user.id, data.brandId);
	const entitlements = await getOrgEntitlements(organizationId);
	if (entitlements.unlimited || entitlements.premiumPool <= 0) return {
		available: false,
		assigned: 0,
		total: 0
	};
	return {
		available: true,
		assigned: await countOrgAssignedPremiumSlots(organizationId),
		total: entitlements.premiumPool
	};
});
//#endregion
export { getPremiumPoolFn_createServerFn_handler };

//# sourceMappingURL=premium-tracking-v99T5BoZ.mjs.map