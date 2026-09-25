import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { f as wizardOnboardingInputSchema, l as saveWizardOnboarding } from "./onboarding-core-CMdSUF7i.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, l as requireBrandAccess } from "./helpers-phr0Aqka.mjs";
import { n as enqueueAnalyzeBrand, r as getAnalyzeBrandStatus, t as cancelAnalyzeBrand } from "./analyze-brand-job-1M9hMG7P.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/onboarding-BcBUbdwS.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "e175a52d-ae02-4145-8fd8-563b69f0879f", e._sentryDebugIdIdentifier = "sentry-dbid-e175a52d-ae02-4145-8fd8-563b69f0879f");
	} catch (e) {}
})();
/**
* Server functions for the onboarding wizard + brand analysis.
*
* This file ONLY exports createServerFn server functions. No regular function
* exports, no class exports, no db imports. TanStack Start replaces server
* functions with lightweight RPC stubs on the client — but only if the module
* doesn't drag in server-only dependencies (db, drizzle, pg) via other
* exports. Keeping this file server-fn-only guarantees the client bundle
* stays clean.
*
* Regular functions (createBrand, updateBrand, etc.) live in
* ./onboarding-core.ts, imported only by API routes (server-only).
*/
/**
* Kick off brand analysis as a background job.
*
* Brand analysis is an LLM + web-search call that routinely runs ~1 minute,
* which blows past reverse-proxy read timeouts when executed inline (the user
* gets a 504 even though the work succeeds). The worker processes the job; the
* client polls `getAnalyzeBrandStatusFn` (by brand) for the result.
*
* Scoped to the brand's owning org: the caller must have access to the brand
* both to start an analysis and to read it back, so a job's output never
* leaks outside the org that requested it.
*/
var startAnalyzeBrandFn_createServerFn_handler = createServerRpc({
	id: "38e1c6565e0eacaaa5e6258a4905e082ae925f0c1c6e0236e8b94ea700121735",
	name: "startAnalyzeBrandFn",
	filename: "src/server/onboarding.ts"
}, (opts) => startAnalyzeBrandFn.__executeServer(opts));
var startAnalyzeBrandFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string().min(1),
	website: string().min(1),
	brandName: string().optional()
})).handler(startAnalyzeBrandFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	await enqueueAnalyzeBrand({
		product: "elmo",
		requestKey: data.brandId,
		website: data.website,
		...data.brandName !== void 0 && { brandName: data.brandName }
	});
	return { ok: true };
});
var getAnalyzeBrandStatusFn_createServerFn_handler = createServerRpc({
	id: "5cc650af774639f1d41897269ae0f4722a5881185f251afe45db843a6c791e8c",
	name: "getAnalyzeBrandStatusFn",
	filename: "src/server/onboarding.ts"
}, (opts) => getAnalyzeBrandStatusFn.__executeServer(opts));
var getAnalyzeBrandStatusFn = createServerFn({ method: "POST" }).validator(object({ brandId: string().min(1) })).handler(getAnalyzeBrandStatusFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	return getAnalyzeBrandStatus("elmo", data.brandId);
});
var cancelAnalyzeBrandFn_createServerFn_handler = createServerRpc({
	id: "a6b29528327f1a9eb795f4df1e90511b42d704db1c0d4d310cdc72a2f1af6c9d",
	name: "cancelAnalyzeBrandFn",
	filename: "src/server/onboarding.ts"
}, (opts) => cancelAnalyzeBrandFn.__executeServer(opts));
var cancelAnalyzeBrandFn = createServerFn({ method: "POST" }).validator(object({ brandId: string().min(1) })).handler(cancelAnalyzeBrandFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	await cancelAnalyzeBrand("elmo", data.brandId);
	return { ok: true };
});
var updateOnboardedBrandFn_createServerFn_handler = createServerRpc({
	id: "369616f3efa99b3f7778826d3028275d3464af5a235241bc88160d882ab27cde",
	name: "updateOnboardedBrandFn",
	filename: "src/server/onboarding.ts"
}, (opts) => updateOnboardedBrandFn.__executeServer(opts));
var updateOnboardedBrandFn = createServerFn({ method: "POST" }).validator(wizardOnboardingInputSchema).handler(updateOnboardedBrandFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	return saveWizardOnboarding(data);
});
//#endregion
export { cancelAnalyzeBrandFn_createServerFn_handler, getAnalyzeBrandStatusFn_createServerFn_handler, startAnalyzeBrandFn_createServerFn_handler, updateOnboardedBrandFn_createServerFn_handler };

//# sourceMappingURL=onboarding-BcBUbdwS.mjs.map