import { c as createServerFn } from "./_ssr/createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "./_libs/zod.mjs";
import { f as eq } from "./_libs/drizzle-orm.mjs";
import { a as competitors, d as prompts, r as brands } from "./_ssr/schema-ejW7s7Gs.mjs";
import { t as db } from "./_ssr/db-DcHqq7B9.mjs";
import { m as getOrgBillingState } from "./_ssr/entitlements-BlArge5u.mjs";
import { t as createServerRpc } from "./_ssr/createServerRpc-CV4epehf.mjs";
import { a as listUserOrganizations, c as requireAuthSession, i as isAdmin, n as checkOrgAccess, r as hasReportAccess } from "./_ssr/helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_brand-fuA9duOr.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "745d392f-b2d4-42d3-829d-e7baa5471f19", e._sentryDebugIdIdentifier = "sentry-dbid-745d392f-b2d4-42d3-829d-e7baa5471f19");
	} catch (e) {}
})();
/**
* /app/$brand layout - Brand-specific layout with sidebar
*
* Fetches brand data and provides it to child routes.
* Shows sidebar navigation, header, and optional demo banner.
* If brand exists in auth but not in DB, shows onboarding.
*/
/** No access, and nothing else worth saying about it. */
var DENIED = {
	brand: null,
	brandName: null,
	isAdmin: false,
	hasReportAccess: false,
	hasAccess: false,
	unpaidOrganizationId: null
};
var getBrandData_createServerFn_handler = createServerRpc({
	id: "fc6a47a0a39ce2ca6e5f16d9e9e0c669f201a6f5d88746f36905886fe47f3b85",
	name: "getBrandData",
	filename: "src/routes/_authed/app/$brand.tsx"
}, (opts) => getBrandData.__executeServer(opts));
var getBrandData = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(getBrandData_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	const brand = await db.query.brands.findFirst({ where: eq(brands.id, data.brandId) });
	if (!brand) {
		if (!await checkOrgAccess(session.user.id, data.brandId)) return DENIED;
		return {
			brand: null,
			brandName: (await listUserOrganizations(session.user.id)).find((o) => o.id === data.brandId)?.name || data.brandId,
			isAdmin: isAdmin(session),
			hasReportAccess: hasReportAccess(session),
			hasAccess: true,
			unpaidOrganizationId: null
		};
	}
	if (!await checkOrgAccess(session.user.id, brand.organizationId)) return DENIED;
	const [brandPrompts, brandCompetitors, { entitlements }] = await Promise.all([
		db.query.prompts.findMany({ where: eq(prompts.brandId, data.brandId) }),
		db.query.competitors.findMany({ where: eq(competitors.brandId, data.brandId) }),
		getOrgBillingState(brand.organizationId)
	]);
	return {
		brand: {
			...brand,
			prompts: brandPrompts,
			competitors: brandCompetitors
		},
		brandName: brand.name,
		isAdmin: isAdmin(session),
		hasReportAccess: hasReportAccess(session),
		hasAccess: true,
		unpaidOrganizationId: entitlements.standing === "none" ? brand.organizationId : null
	};
});
//#endregion
export { getBrandData_createServerFn_handler };

//# sourceMappingURL=_brand-fuA9duOr.mjs.map