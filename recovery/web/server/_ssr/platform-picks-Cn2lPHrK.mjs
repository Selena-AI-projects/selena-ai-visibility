import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, f as array } from "../_libs/zod.mjs";
import { n as getDefaultDelayHours, r as getRunsPerPrompt } from "./constants-BDRQAb6s.mjs";
import { t as estimateRunCostUsd } from "./cost-B7DUNy9M.mjs";
import { d as and, f as eq, s as count } from "../_libs/drizzle-orm.mjs";
import { d as prompts, r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { c as providersByModel, s as parseScrapeTargets } from "./env-D9tfoX6E.mjs";
import { f as decideEnabledModels, h as getOrgEntitlements, n as assertAllowed } from "./entitlements-BlArge5u.mjs";
import { l as resolveProviderAccess, r as describeProvider, s as isGroundedApiTarget } from "./providers-kvP4SquB.mjs";
import { a as selectTargetsForBrand, n as resolveBrandPicks, t as defaultPlatformPicks } from "./run-policy-DWPSozxj.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as getDeployment } from "./server-B0rVTxL5.mjs";
import { c as requireAuthSession, f as requireOrgAccess, l as requireBrandAccess } from "./helpers-phr0Aqka.mjs";
import { n as expeditePromptRuns, t as addedPlatforms } from "./run-config-changes-BKthmPUu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-picks-Cn2lPHrK.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "02d9a125-8b0d-4cdd-8158-73f16e8f73d5", e._sentryDebugIdIdentifier = "sentry-dbid-02d9a125-8b0d-4cdd-8158-73f16e8f73d5");
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
function toOption(config, forOperator) {
	const shared = {
		model: config.model,
		webSearch: config.webSearch,
		access: resolveProviderAccess(config)
	};
	if (!forOperator) return {
		...shared,
		costPerRunUsd: null
	};
	return {
		...shared,
		providerName: describeProvider(config.provider).name,
		version: config.version,
		costPerRunUsd: estimateRunCostUsd(config.provider, config.webSearch)
	};
}
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
function optionsByModel(configs, { forOperator, excludePremium }) {
	const seen = /* @__PURE__ */ new Set();
	const options = [];
	for (const config of configs) {
		if (excludePremium && isGroundedApiTarget(config)) continue;
		if (seen.has(config.model)) continue;
		seen.add(config.model);
		options.push(toOption(config, forOperator));
	}
	return options;
}
/**
* Provider spend is only the viewer's concern when they run the deployment.
* Whitelabel is excluded deliberately: the agency pays the bills, but the person
* looking at this page is their customer.
*/
async function selfHostedCostBasis(brand) {
	if (getDeployment().mode !== "local") return null;
	const [row] = await db.select({ value: count() }).from(prompts).where(and(eq(prompts.brandId, brand.id), eq(prompts.enabled, true)));
	const delayHours = brand.delayOverrideHours ?? getDefaultDelayHours();
	return {
		enabledPrompts: row?.value ?? 0,
		runsPerDay: 24 / Math.max(1, delayHours),
		replication: getRunsPerPrompt()
	};
}
/**
* Trackable platforms this instance has no target for. Derived from the combos
* the provider status workflow exercises, so every suggestion is one we know
* works, and ordered to match the picker above.
*/
function unconfiguredPlatforms(configs) {
	const configured = new Set(configs.map((config) => config.model));
	const suggestions = [];
	for (const [model, providerIds] of providersByModel()) {
		if (configured.has(model)) continue;
		suggestions.push({
			model,
			providers: providerIds.map(describeProvider)
		});
	}
	return suggestions;
}
var getModelPickerStateFn_createServerFn_handler = createServerRpc({
	id: "d0d55616d4b1a595fda8df924f0b5077510296e34eb1b3a818dea121fbd09279",
	name: "getModelPickerStateFn",
	filename: "src/server/platform-picks.ts"
}, (opts) => getModelPickerStateFn.__executeServer(opts));
var getModelPickerStateFn = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(getModelPickerStateFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const brand = await db.query.brands.findFirst({ where: eq(brands.id, data.brandId) });
	if (!brand) throw new Error("Brand not found");
	const configs = parseScrapeTargets(process.env.SCRAPE_TARGETS);
	const entitlements = await getOrgEntitlements(brand.organizationId);
	if (entitlements.unlimited) {
		const selfHosted = await selfHostedCostBasis(brand);
		return {
			available: optionsByModel(configs, {
				forOperator: selfHosted !== null,
				excludePremium: false
			}),
			enabledModels: brand.enabledModels,
			planLimits: null,
			upgradeOptions: [],
			costBasis: selfHosted,
			unconfiguredPlatforms: selfHosted !== null ? unconfiguredPlatforms(configs) : []
		};
	}
	const pickable = optionsByModel(configs, {
		forOperator: false,
		excludePremium: true
	});
	const menu = new Set(entitlements.platformMenu ?? []);
	const available = pickable.filter((option) => menu.has(option.model));
	return {
		available,
		enabledModels: resolveBrandPicks(entitlements, brand, configs),
		planLimits: {
			platformPicks: entitlements.platformPicks ?? available.length,
			platformMenu: entitlements.platformMenu ?? []
		},
		upgradeOptions: pickable.filter((option) => !menu.has(option.model)),
		costBasis: null,
		unconfiguredPlatforms: []
	};
});
var getOnboardingPlatformStateFn_createServerFn_handler = createServerRpc({
	id: "6e6672e15b410a71b7d9e4765c2b71152ab36cc35320099129d2d502b4db401c",
	name: "getOnboardingPlatformStateFn",
	filename: "src/server/platform-picks.ts"
}, (opts) => getOnboardingPlatformStateFn.__executeServer(opts));
var getOnboardingPlatformStateFn = createServerFn({ method: "GET" }).validator(object({ organizationId: string() })).handler(getOnboardingPlatformStateFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireOrgAccess(session.user.id, data.organizationId);
	if (getDeployment().mode !== "cloud") return null;
	const entitlements = await getOrgEntitlements(data.organizationId);
	if (entitlements.unlimited) return null;
	const configs = parseScrapeTargets(process.env.SCRAPE_TARGETS);
	const menu = new Set(entitlements.platformMenu ?? []);
	const available = optionsByModel(configs, {
		forOperator: false,
		excludePremium: true
	}).filter((option) => menu.has(option.model));
	if (available.length === 0) return null;
	return {
		available,
		platformPicks: entitlements.platformPicks ?? available.length,
		defaultSelected: defaultPlatformPicks(entitlements, configs)
	};
});
var updateEnabledModelsFn_createServerFn_handler = createServerRpc({
	id: "172945709f5c0d1465968c42e094aed2257a0bcd1ad3ce16af783c78a5523a01",
	name: "updateEnabledModelsFn",
	filename: "src/server/platform-picks.ts"
}, (opts) => updateEnabledModelsFn.__executeServer(opts));
var updateEnabledModelsFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	/** Explicit picks, or null to follow the deployment configuration. */
	models: array(string().min(1)).max(50).nullable()
})).handler(updateEnabledModelsFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const brand = await db.query.brands.findFirst({ where: eq(brands.id, data.brandId) });
	if (!brand) throw new Error("Brand not found");
	const models = data.models === null ? null : [...new Set(data.models)];
	const configs = parseScrapeTargets(process.env.SCRAPE_TARGETS);
	const entitlements = await getOrgEntitlements(brand.organizationId);
	if (models === null) {
		if (!entitlements.unlimited) throw new Error("Choose which platforms to track — your plan defines how many.");
	} else {
		selectTargetsForBrand(configs, models);
		if (!entitlements.unlimited) assertAllowed(decideEnabledModels(entitlements, models));
	}
	const [updated] = await db.update(brands).set({
		enabledModels: models,
		updatedAt: /* @__PURE__ */ new Date()
	}).where(eq(brands.id, data.brandId)).returning({
		id: brands.id,
		enabledModels: brands.enabledModels
	});
	if (!updated) throw new Error("Brand not found");
	if (addedPlatforms(brand.enabledModels, models, configs.map((config) => config.model)).length > 0) {
		const enabled = await db.select({ id: prompts.id }).from(prompts).where(and(eq(prompts.brandId, data.brandId), eq(prompts.enabled, true)));
		await expeditePromptRuns(enabled.map((prompt) => prompt.id));
	}
	return updated;
});
//#endregion
export { getModelPickerStateFn_createServerFn_handler, getOnboardingPlatformStateFn_createServerFn_handler, updateEnabledModelsFn_createServerFn_handler };

//# sourceMappingURL=platform-picks-Cn2lPHrK.mjs.map