import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { g as inArray } from "../_libs/drizzle-orm.mjs";
import { r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { c as checkBrandCreate } from "./entitlements-BlArge5u.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as getDeployment } from "./server-B0rVTxL5.mjs";
import { a as listUserOrganizations, c as requireAuthSession } from "./helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/new-DLKMuF0x.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "97a2fef3-3f79-4dd5-9832-a7246c4c069c", e._sentryDebugIdIdentifier = "sentry-dbid-97a2fef3-3f79-4dd5-9832-a7246c4c069c");
	} catch (e) {}
})();
/**
* /app/new - Create a new brand.
*
* Attaches a new brand to one of the current user's organizations and seeds
* the brand row with the supplied name + website. Gated by the
* canCreateBrands deployment feature (local, cloud) at both the loader
* (redirect to /app) and the server function.
*
* Where the plan meters platforms, a second step asks which ones to track:
* this is the flow every cloud brand goes through, so accepting the defaults
* silently would mean a brand's first cycle runs on platforms nobody chose.
*
* A workspace that has spent its plan's brands is told so here, before anything
* is filled in — the write guard would otherwise reject the finished form, and
* a limit is not something to discover at the end of a wizard.
*/
/** The oldest brand of each org, which is as good a billing entry point as any. */
async function billingBrandByOrg(orgIds) {
	if (orgIds.length === 0) return /* @__PURE__ */ new Map();
	const rows = await db.select({
		id: brands.id,
		organizationId: brands.organizationId
	}).from(brands).where(inArray(brands.organizationId, orgIds)).orderBy(brands.createdAt);
	const byOrg = /* @__PURE__ */ new Map();
	for (const row of rows) if (!byOrg.has(row.organizationId)) byOrg.set(row.organizationId, row.id);
	return byOrg;
}
var getNewBrandOptions_createServerFn_handler = createServerRpc({
	id: "78471b42f56dbdbaba1f0f7480ce035f1e939c055e0495b7dd56c658064e871d",
	name: "getNewBrandOptions",
	filename: "src/routes/_authed/app/new.tsx"
}, (opts) => getNewBrandOptions.__executeServer(opts));
var getNewBrandOptions = createServerFn({ method: "GET" }).handler(getNewBrandOptions_createServerFn_handler, async () => {
	if (!getDeployment().features.canCreateBrands) return {
		canCreateBrands: false,
		organizations: []
	};
	const session = await requireAuthSession();
	const orgs = await listUserOrganizations(session.user.id);
	const decisions = await checkBrandCreate(orgs.map((org) => org.id));
	const billingBrands = await billingBrandByOrg(orgs.filter((org) => decisions.get(org.id)?.allowed === false).map((org) => org.id));
	return {
		canCreateBrands: true,
		organizations: orgs.map((org) => {
			const decision = decisions.get(org.id);
			return {
				id: org.id,
				name: org.name,
				blocked: decision && !decision.allowed ? {
					code: decision.code,
					message: decision.message
				} : null,
				billingBrandId: billingBrands.get(org.id) ?? null
			};
		})
	};
});
//#endregion
export { getNewBrandOptions_createServerFn_handler };

//# sourceMappingURL=new-DLKMuF0x.mjs.map