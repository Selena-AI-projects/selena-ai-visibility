import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, f as array } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-picks-CbYihqfx.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "e285d915-c6de-4a91-907c-4393bafb7f13", e._sentryDebugIdIdentifier = "sentry-dbid-e285d915-c6de-4a91-907c-4393bafb7f13");
	} catch (e) {}
})();
/**
* Server functions for the platform-picker UI (LLMs settings page, onboarding
* wizard). Extracted from brands.ts so brand CRUD and platform/pick management
* stay in separate files.
*/
/**
* `forOperator` is the one predicate behind everything a customer shouldn't see:
* the deployment's vendors and what they cost. True only when the person looking
* runs the deployment.
*/
/**
* One option per model, in SCRAPE_TARGETS order. Picks are stored by model name
* (`brands.enabledModels`), so two targets for the same model can never be
* chosen independently — offering both would render duplicate rows whose
* checkboxes moved together.
*
* `excludePremium` is set in cloud, where a grounded API call is a pooled
* per-prompt allowance rather than a pick. Self-hosted has no pool, so it keeps
* whichever target is configured first for each model.
*/
/**
* Provider spend is only the viewer's concern when they run the deployment.
* Whitelabel is excluded deliberately: the agency pays the bills, but the person
* looking at this page is their customer.
*/
/**
* Trackable platforms this instance has no target for. Derived from the combos
* the provider status workflow exercises, so every suggestion is one we know
* works, and ordered to match the picker above.
*/
var getModelPickerStateFn = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(createSsrRpc("d0d55616d4b1a595fda8df924f0b5077510296e34eb1b3a818dea121fbd09279"));
/**
* Platform choices for the brand onboarding wizard, resolved from the
* organization because the brand row does not exist yet. Null — non-cloud,
* unlimited entitlements, or nothing offerable — means the wizard skips the
* step and creation falls back to the plan defaults.
*/
var getOnboardingPlatformStateFn = createServerFn({ method: "GET" }).validator(object({ organizationId: string() })).handler(createSsrRpc("6e6672e15b410a71b7d9e4765c2b71152ab36cc35320099129d2d502b4db401c"));
var updateEnabledModelsFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	/** Explicit picks, or null to follow the deployment configuration. */
	models: array(string().min(1)).max(50).nullable()
})).handler(createSsrRpc("172945709f5c0d1465968c42e094aed2257a0bcd1ad3ce16af783c78a5523a01"));
//#endregion
export { getOnboardingPlatformStateFn as n, updateEnabledModelsFn as r, getModelPickerStateFn as t };

//# sourceMappingURL=platform-picks-CbYihqfx.mjs.map