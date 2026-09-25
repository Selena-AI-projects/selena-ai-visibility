import { n as getModelMeta } from "./models-DjvggVKS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/plans-D-CRwAoX.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ac083a52-378e-47d1-ab2f-f420b7c2fe94", e._sentryDebugIdIdentifier = "sentry-dbid-ac083a52-378e-47d1-ab2f-f420b7c2fe94");
	} catch (e) {}
})();
/**
* The Elmo Cloud plan catalog.
*
* This file is the single source of truth for what each cloud plan includes.
* Billing (Stripe products/prices), write-time enforcement, the worker's run
* policy, and the pricing/billing UI all consume these definitions — change a
* number here and every layer follows.
*
* Stripe prices are referenced by lookup key (stripePlanLookupKey /
* PREMIUM_ADDON_LOOKUP_KEYS) rather than per-environment price-ID env vars;
* packages/cloud/scripts/bootstrap-stripe.ts provisions any Stripe account (test or live)
* with these exact keys.
*/
/**
* Everything Elmo Cloud sells, and how. An entry with `access` is pickable as a
* standard platform, which decides its sampling rate and which tier the pricing
* tables group it under; an entry with `premium` is sold grounded from the pool.
* Most are both. A platform cannot be listed without being one or the other.
*
* A self-hosted operator can wire the same model differently — this describes
* the cloud offering the plans are priced against, not what Elmo can track.
*
* A menu entry is only offerable when the operator's SCRAPE_TARGETS actually
* configures a matching target; the UI and run policy intersect with the
* instance's configured targets.
*
* Order matters: defaultPlatformPicks takes the plan's pick count off the front
* of this list, so a brand created without an explicit choice tracks the first
* entries. Append new platforms rather than inserting them, or existing
* deployments change what a new brand starts out tracking.
*/
var CLOUD_PLATFORMS = {
	chatgpt: {
		access: "scraped",
		premium: true
	},
	"google-ai-mode": { access: "scraped" },
	"google-ai-overview": { access: "scraped" },
	copilot: { access: "scraped" },
	perplexity: { access: "scraped" },
	gemini: { access: "scraped" },
	qwen: { access: "api" },
	deepseek: { access: "api" },
	grok: { premium: true },
	mistral: { access: "api" },
	claude: {
		access: "api",
		premium: true
	}
};
/** The platforms a plan's picks may come from — everything sold as a pick. */
var STANDARD_PLATFORM_MENU = Object.entries(CLOUD_PLATFORMS).filter(([, platform]) => platform.access !== void 0).map(([model]) => model);
/**
* The models sellable as premium — grounded, cited answers from the model's own
* web search. A prompt spends one pool slot per model it is tracked on, so an org
* can spread its allowance across prompts or across models as it likes.
*
* Not a subset of the pick menu: a model whose answers are too dear to sample
* four times a day can still be worth one grounded call, which is exactly what
* the pool is for.
*/
var PREMIUM_MODELS = [
	"claude",
	"chatgpt",
	"grok"
];
/**
* What a premium model is called where it is sold, which is not what it is called
* as a pick: the premium tier sells the grounded variant, and "ChatGPT" and
* "GPT-5 Search" are different products to a customer comparing them.
*/
var PREMIUM_LABELS = {
	claude: "Claude Sonnet 5 (web)",
	chatgpt: "GPT-5 Search",
	grok: "Grok (web)"
};
/** What to call a premium model, wherever the grounded variant is shown. */
function premiumModelLabel(model) {
	return PREMIUM_LABELS[model] ?? getModelMeta(model).label;
}
/**
* The premium models in a requested list, deduped and in catalog order. Anything
* not sellable as premium is dropped rather than rejected: the list names paid
* tracking, so an unknown entry should cost nothing, not fail a whole save.
*/
function selectPremiumModels(requested) {
	if (!requested || requested.length === 0) return [];
	return PREMIUM_MODELS.filter((model) => requested.includes(model));
}
/**
* Premium slots a set of prompts spends: one per model it is tracked on, and
* none at all while it is disabled, since a disabled prompt runs nothing.
*
* The rule is here rather than at each call site because the write guard, the
* prompts editor's live counter and the org-wide total all have to agree — and
* a customer is charged on the difference.
*/
function premiumSlotsUsed(prompts) {
	return prompts.reduce((total, prompt) => total + (prompt.enabled ? prompt.premiumModels.length : 0), 0);
}
var PLANS = {
	starter: {
		key: "starter",
		name: "Starter",
		monthlyPriceUsd: 29,
		annualPriceUsd: 290,
		maxBrands: 1,
		maxPrompts: 50,
		platformMenu: ["chatgpt"],
		platformPicks: 1,
		standardRunsPerDay: 1,
		premiumIncluded: 0,
		premiumAddonAvailable: false
	},
	basic: {
		key: "basic",
		name: "Basic",
		monthlyPriceUsd: 99,
		annualPriceUsd: 990,
		maxBrands: 1,
		maxPrompts: 50,
		platformMenu: STANDARD_PLATFORM_MENU,
		platformPicks: 4,
		standardRunsPerDay: 4,
		premiumIncluded: 0,
		premiumAddonAvailable: false
	},
	pro: {
		key: "pro",
		name: "Pro",
		monthlyPriceUsd: 299,
		annualPriceUsd: 2990,
		maxBrands: 2,
		maxPrompts: 150,
		platformMenu: STANDARD_PLATFORM_MENU,
		platformPicks: 4,
		standardRunsPerDay: 4,
		premiumIncluded: 20,
		premiumAddonAvailable: true
	},
	business: {
		key: "business",
		name: "Business",
		monthlyPriceUsd: 649,
		annualPriceUsd: 6490,
		maxBrands: 5,
		maxPrompts: 350,
		platformMenu: STANDARD_PLATFORM_MENU,
		platformPicks: 4,
		standardRunsPerDay: 4,
		premiumIncluded: 30,
		premiumAddonAvailable: true
	}
};
/** The most brands any self-serve plan sells, so a guard can tell a customer
*  whether upgrading would help or whether they need a custom agreement. */
var MAX_SELF_SERVE_BRANDS = Math.max(...Object.values(PLANS).map((plan) => plan.maxBrands));
var PLAN_KEYS = Object.keys(PLANS);
function isPlanKey(value) {
	return value in PLANS;
}
/**
* Whether extra premium slots can be purchased for a resolved plan key. Custom
* plans always may; no plan means nothing to attach the add-on to.
*/
function isPremiumAddonAvailable(planKey) {
	if (planKey === "custom") return true;
	return planKey !== null && PLANS[planKey].premiumAddonAvailable;
}
/** Human-readable name for a resolved plan key. */
function planDisplayName(planKey) {
	if (planKey === "custom") return "Custom";
	return planKey === null ? "None" : PLANS[planKey].name;
}
/**
* Stripe price lookup key for a plan/interval. The @better-auth/stripe plugin
* resolves these to price IDs at checkout time, so the same code works against
* any Stripe account bootstrapped with packages/cloud/scripts/bootstrap-stripe.ts.
*/
function stripePlanLookupKey(plan, interval) {
	return `elmo_cloud_${plan}_${interval}`;
}
var PREMIUM_ADDON_LOOKUP_KEYS = {
	monthly: "elmo_cloud_premium_extra_monthly",
	annual: "elmo_cloud_premium_extra_annual"
};
/**
* What each tier is called, wherever it is shown. One place, because the
* pricing table, the paywall and the LLM settings page all name them and had
* each kept their own copy.
*/
var PLATFORM_TIER_LABELS = {
	scraped: "Scraped Engines",
	api: "LLM APIs",
	premium: "Premium LLM APIs"
};
/**
* Everything sold in a tier, across all plans — for prose that names the
* platforms rather than tabulating them. Derived rather than written out so a
* new entry in CLOUD_PLATFORMS can't leave a paragraph quietly out of date.
*/
function platformTierMembers(tier) {
	return (tier === "premium" ? PREMIUM_MODELS : STANDARD_PLATFORM_MENU.filter((model) => CLOUD_PLATFORMS[model]?.access === tier)).map((model) => ({
		model,
		label: tier === "premium" ? premiumModelLabel(model) : getModelMeta(model).label,
		iconId: getModelMeta(model).iconId
	}));
}
/** The premium allowance's unit, named the same way wherever it is counted. */
function premiumPairings(count) {
	return `${count} prompt/model pairing${count === 1 ? "" : "s"}`;
}
/**
* What an org is billed each period: the plan plus any add-on quantity, at the
* interval it actually pays on. Annual is quoted annually rather than divided by
* twelve — a customer on annual billing is charged the annual figure, and showing
* a monthly equivalent invites them to look for a charge that never appears.
*/
function summarizeSubscriptionCost(input) {
	const plan = PLANS[input.plan];
	const annual = input.interval === "annual";
	const quantity = Math.max(0, Math.floor(input.addonQuantity));
	const lines = [{
		label: `${plan.name} plan`,
		amountUsd: annual ? plan.annualPriceUsd : plan.monthlyPriceUsd
	}];
	if (quantity > 0) {
		const each = annual ? 50 : 5;
		lines.push({
			label: `${quantity} extra premium pairing${quantity === 1 ? "" : "s"}`,
			amountUsd: quantity * each
		});
	}
	return {
		interval: input.interval,
		lines,
		totalUsd: lines.reduce((sum, line) => sum + line.amountUsd, 0)
	};
}
Math.min(...PLAN_KEYS.map((key) => PLANS[key].monthlyPriceUsd));
//#endregion
export { PREMIUM_ADDON_LOOKUP_KEYS as a, isPremiumAddonAvailable as c, premiumModelLabel as d, premiumPairings as f, summarizeSubscriptionCost as g, stripePlanLookupKey as h, PLATFORM_TIER_LABELS as i, planDisplayName as l, selectPremiumModels as m, PLANS as n, PREMIUM_MODELS as o, premiumSlotsUsed as p, PLAN_KEYS as r, isPlanKey as s, MAX_SELF_SERVE_BRANDS as t, platformTierMembers as u };

//# sourceMappingURL=plans-D-CRwAoX.mjs.map