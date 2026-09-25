import { D as number, M as string, O as object, T as literal, f as array } from "../_libs/zod.mjs";
import { f as premiumPairings, n as PLANS, s as isPlanKey, t as MAX_SELF_SERVE_BRANDS } from "./plans-D-CRwAoX.mjs";
import { L as sql, d as and, f as eq, g as inArray, s as count } from "../_libs/drizzle-orm.mjs";
import { d as prompts, h as subscription, l as organizationSettings, r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as getDeploymentModeFromEnv } from "./env-D9tfoX6E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/entitlements-BlArge5u.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0402b3a2-54d4-4ff5-a792-43ba5cf22710", e._sentryDebugIdIdentifier = "sentry-dbid-0402b3a2-54d4-4ff5-a792-43ba5cf22710");
	} catch (e) {}
})();
/**
* Pure entitlement resolution: (deployment mode, subscription state, add-on
* quantity, per-org overrides) → what the organization may do.
*
* No I/O here. The DB-aware wrapper lives in @workspace/lib
* (src/entitlements/), which loads the subscription + organization_settings
* rows and calls resolveEntitlements. Keeping this pure makes the whole plan
* matrix unit-testable and keeps non-cloud modes provably unaffected: every
* mode except cloud resolves to UNLIMITED_ENTITLEMENTS and nothing else is
* ever consulted.
*/
/**
* Per-org overrides for custom plans, stored in
* organization_settings.entitlement_overrides (jsonb) and applied on top of
* the plan definition. Sparse: set only what differs. Provisioning a custom
* plan is config-only — no code changes.
*/
var entitlementOverridesSchema = object({
	/**
	* Marks the org as a custom plan billed outside Stripe self-serve.
	* Forces standing to "active" regardless of any subscription row, and
	* bases unspecified limits on the Business plan.
	*/
	planOverride: literal("custom").optional(),
	maxBrands: number().int().min(0).optional(),
	maxPrompts: number().int().min(0).optional(),
	/** Extra allowed platforms beyond the standard menu. */
	extraPlatforms: array(string().min(1)).optional(),
	platformPicks: number().int().min(0).optional(),
	standardRunsPerDay: number().int().min(1).max(7).optional(),
	/** Replaces the plan's included premium slots (add-on quantity still adds
	*  on top). */
	premiumPoolIncluded: number().int().min(0).optional(),
	/** Replaces the fixed once-daily cadence for grounded premium calls. */
	premiumRunsPerDay: number().int().min(1).max(7).optional(),
	/** Runs per firing for standard targets (cloud default 1). */
	replication: number().int().min(1).max(10).optional()
}).strict();
/**
* Validate overrides read from the database. Returns null (treated as "no
* overrides", i.e. plain plan limits) when the payload is malformed — failing
* safe toward the paid plan, never toward unlimited.
*/
function parseEntitlementOverrides(value) {
	if (value == null) return null;
	const parsed = entitlementOverridesSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}
var UNLIMITED_ENTITLEMENTS = {
	unlimited: true,
	planKey: null,
	standing: "active",
	trackingActive: true,
	maxBrands: null,
	maxPrompts: null,
	platformMenu: null,
	platformPicks: null,
	standardRunsPerDay: null,
	replication: null,
	premiumPool: 0,
	premiumRunsPerDay: 1
};
/** An unsubscribed cloud org: nothing may be created, nothing runs. */
var NO_PLAN_ENTITLEMENTS = {
	unlimited: false,
	planKey: null,
	standing: "none",
	trackingActive: false,
	maxBrands: 0,
	maxPrompts: 0,
	platformMenu: [],
	platformPicks: 0,
	standardRunsPerDay: 0,
	replication: 1,
	premiumPool: 0,
	premiumRunsPerDay: 1
};
/**
* Derive the billing standing from the stored subscription row. Stripe keeps
* status "active" through cancel_at_period_end, so a scheduled cancellation
* stays active until the period actually ends (then the webhook flips the
* status). past_due ages out of grace PAST_DUE_GRACE_DAYS after the period
* that failed to renew.
*/
function deriveSubscriptionStanding(subscription, now) {
	if (!subscription) return "none";
	switch (subscription.status) {
		case "active":
		case "trialing": return "active";
		case "past_due": {
			if (!subscription.periodEnd) return "grace";
			const graceEndsMs = subscription.periodEnd.getTime() + 6048e5;
			return now.getTime() <= graceEndsMs ? "grace" : "paused";
		}
		default: return "none";
	}
}
function resolveEntitlements(input) {
	if (input.mode !== "cloud") return UNLIMITED_ENTITLEMENTS;
	const overrides = input.overrides ?? {};
	const isCustom = overrides.planOverride === "custom";
	const subscriptionStanding = deriveSubscriptionStanding(input.subscription, input.now);
	const basePlan = (input.subscription && subscriptionStanding !== "none" && isPlanKey(input.subscription.plan) ? PLANS[input.subscription.plan] : null) ?? (isCustom ? PLANS.business : null);
	if (!basePlan) return NO_PLAN_ENTITLEMENTS;
	const standing = isCustom ? "active" : subscriptionStanding;
	if (standing === "none") return NO_PLAN_ENTITLEMENTS;
	const premiumIncluded = overrides.premiumPoolIncluded ?? basePlan.premiumIncluded;
	const addonQuantity = basePlan.premiumAddonAvailable || isCustom ? Math.max(0, Math.floor(input.premiumAddonQuantity)) : 0;
	const menu = [...basePlan.platformMenu, ...overrides.extraPlatforms ?? []];
	return {
		unlimited: false,
		planKey: isCustom ? "custom" : basePlan.key,
		standing,
		trackingActive: standing === "active" || standing === "grace",
		maxBrands: overrides.maxBrands ?? basePlan.maxBrands,
		maxPrompts: overrides.maxPrompts ?? basePlan.maxPrompts,
		platformMenu: [...new Set(menu)],
		platformPicks: overrides.platformPicks ?? basePlan.platformPicks,
		standardRunsPerDay: Math.min(overrides.standardRunsPerDay ?? basePlan.standardRunsPerDay, 7),
		replication: overrides.replication ?? 1,
		premiumPool: premiumIncluded + addonQuantity,
		premiumRunsPerDay: Math.min(overrides.premiumRunsPerDay ?? 1, 7)
	};
}
/**
* DB-aware entitlement resolution: loads the org's subscription row
* (maintained by the @better-auth/stripe webhook) and organization_settings
* (custom-plan overrides + premium add-on quantity), then delegates to the pure
* resolver in @workspace/config/entitlements.
*
* Outside cloud mode this never touches the database — the first line resolves
* to UNLIMITED_ENTITLEMENTS, which is what keeps local/demo/whitelabel
* provably unaffected by everything built on top of this.
*/
/**
* Statuses ranked from most to least relevant when an org has accumulated
* several subscription rows (e.g. canceled once, resubscribed). Unknown
* statuses rank last.
*/
var STATUS_RANK = {
	active: 0,
	trialing: 1,
	past_due: 2,
	paused: 3,
	unpaid: 4,
	incomplete: 5,
	incomplete_expired: 6,
	canceled: 7
};
/**
* Pick the row that best represents the org's current subscription: the
* healthiest status wins; among equals, the latest billing period.
*/
function selectRelevantSubscription(rows) {
	if (rows.length === 0) return null;
	return [...rows].sort((a, b) => {
		const rankA = STATUS_RANK[a.status ?? ""] ?? 99;
		const rankB = STATUS_RANK[b.status ?? ""] ?? 99;
		if (rankA !== rankB) return rankA - rankB;
		return (b.periodEnd?.getTime() ?? 0) - (a.periodEnd?.getTime() ?? 0);
	})[0];
}
function toEntitlements(mode, subscriptionRow, settingsRow, now) {
	return resolveEntitlements({
		mode,
		subscription: subscriptionRow ? {
			status: subscriptionRow.status ?? "incomplete",
			plan: subscriptionRow.plan,
			periodEnd: subscriptionRow.periodEnd
		} : null,
		premiumAddonQuantity: settingsRow?.premiumAddonQuantity ?? 0,
		overrides: parseEntitlementOverrides(settingsRow?.entitlementOverrides),
		now
	});
}
/**
* The org a brand belongs to, for callers that hold only a brand id and no
* user context (the admin surface, /api/v1 key auth, the worker). Access
* control is the caller's concern; this is pure tenancy resolution.
*/
async function getBrandOrganizationId(brandId) {
	const [row] = await db.select({ organizationId: brands.organizationId }).from(brands).where(eq(brands.id, brandId)).limit(1);
	if (!row) throw new Error(`Brand not found: ${brandId}`);
	return row.organizationId;
}
var UNLIMITED_STATE = {
	entitlements: UNLIMITED_ENTITLEMENTS,
	subscription: null,
	settings: null
};
/**
* Billing state for any number of orgs in two queries. Every requested org gets
* an entry, so callers never have to distinguish "no row" from "not asked for".
*
* The single-org accessors below all funnel through here rather than issuing
* their own one-row variants of the same two queries — one query shape, one
* place that decides which subscription row wins.
*/
async function getOrgBillingStates(orgIds, options) {
	const mode = options?.mode ?? getDeploymentModeFromEnv(process.env);
	const result = /* @__PURE__ */ new Map();
	if (mode !== "cloud") {
		for (const orgId of orgIds) result.set(orgId, UNLIMITED_STATE);
		return result;
	}
	if (orgIds.length === 0) return result;
	const now = options?.now ?? /* @__PURE__ */ new Date();
	const [subscriptionRows, settingsRows] = await Promise.all([db.select().from(subscription).where(inArray(subscription.referenceId, orgIds)), db.select().from(organizationSettings).where(inArray(organizationSettings.organizationId, orgIds))]);
	const subscriptionsByOrg = /* @__PURE__ */ new Map();
	for (const row of subscriptionRows) {
		const list = subscriptionsByOrg.get(row.referenceId) ?? [];
		list.push(row);
		subscriptionsByOrg.set(row.referenceId, list);
	}
	const settingsByOrg = new Map(settingsRows.map((row) => [row.organizationId, row]));
	for (const orgId of orgIds) {
		const subscriptionRow = selectRelevantSubscription(subscriptionsByOrg.get(orgId) ?? []);
		const settingsRow = settingsByOrg.get(orgId) ?? null;
		result.set(orgId, {
			entitlements: toEntitlements(mode, subscriptionRow, settingsRow, now),
			subscription: subscriptionRow,
			settings: settingsRow
		});
	}
	return result;
}
async function getOrgBillingState(orgId, options) {
	return (await getOrgBillingStates([orgId], options)).get(orgId) ?? UNLIMITED_STATE;
}
async function getOrgEntitlements(orgId, options) {
	return (await getOrgBillingState(orgId, options)).entitlements;
}
/** Entitlements only, for callers (the worker sweep, the paywall) with no use for the rows. */
async function getOrgEntitlementsMap(orgIds, options) {
	const states = await getOrgBillingStates(orgIds, options);
	return new Map([...states].map(([orgId, state]) => [orgId, state.entitlements]));
}
/**
* Thrown by the assert* helpers. `status`/`error` are the HTTP response /api/v1
* renders; server functions surface `message` directly. Having no plan at all
* is a payment problem; every other denial is a request that conflicts with
* the limits of the plan the org does have.
*/
var EntitlementError = class extends Error {
	constructor(code, message) {
		super(message);
		this.name = "EntitlementError";
		this.code = code;
		this.status = code === "no-active-plan" ? 402 : 409;
		this.error = code === "no-active-plan" ? "Payment Required" : "Conflict";
	}
};
var ALLOWED = { allowed: true };
function deny(code, message) {
	return {
		allowed: false,
		code,
		message
	};
}
function requireActivePlan(entitlements) {
	if (entitlements.unlimited) return ALLOWED;
	if (entitlements.standing === "none") return deny("no-active-plan", "An active subscription is required.");
	return null;
}
function decideBrandCreate(entitlements, currentBrandCount) {
	const gate = requireActivePlan(entitlements);
	if (gate) return gate;
	if (entitlements.maxBrands !== null && currentBrandCount >= entitlements.maxBrands) {
		const included = `Your plan includes ${entitlements.maxBrands} brand${entitlements.maxBrands === 1 ? "" : "s"}.`;
		return deny("brand-limit", entitlements.maxBrands < MAX_SELF_SERVE_BRANDS ? `${included} Upgrade to add more.` : `${included} Talk to us about a custom plan to track more.`);
	}
	return ALLOWED;
}
/** Adding or re-enabling prompts consumes the org-wide tracked-prompt pool. */
function decidePromptAdd(entitlements, currentEnabledPrompts, adding) {
	if (adding <= 0) return ALLOWED;
	const gate = requireActivePlan(entitlements);
	if (gate) return gate;
	if (entitlements.maxPrompts !== null && currentEnabledPrompts + adding > entitlements.maxPrompts) {
		const remaining = Math.max(0, entitlements.maxPrompts - currentEnabledPrompts);
		return deny("prompt-limit", `Your plan tracks up to ${entitlements.maxPrompts} prompts across this workspace (${remaining} remaining). Disable other prompts or upgrade.`);
	}
	return ALLOWED;
}
/** Brand platform picks: every model must be on the plan menu, within the pick count. */
function decideEnabledModels(entitlements, requestedModels) {
	const gate = requireActivePlan(entitlements);
	if (gate) return gate;
	if (entitlements.platformMenu !== null) {
		const menu = new Set(entitlements.platformMenu);
		const offMenu = requestedModels.filter((model) => !menu.has(model));
		if (offMenu.length > 0) return deny("platform-not-in-plan", `Not available on your plan: ${offMenu.join(", ")}.`);
	}
	if (entitlements.platformPicks !== null && requestedModels.length > entitlements.platformPicks) return deny("platform-picks-exceeded", `Your plan tracks up to ${entitlements.platformPicks} platform${entitlements.platformPicks === 1 ? "" : "s"} per brand.`);
	return ALLOWED;
}
/**
* Tracking a prompt on a premium model spends one pairing from the org's pool,
* and a prompt tracked on two premium models spends two — so `adding` counts
* pairings rather than prompts.
*/
function decidePremiumAssign(entitlements, currentAssignedEnabled, adding) {
	if (adding <= 0) return ALLOWED;
	const gate = requireActivePlan(entitlements);
	if (gate) return gate;
	if (entitlements.premiumPool <= 0) return deny("premium-not-in-plan", "Premium tracking — adding a grounded, cited answer to a prompt from a model's own web search — is available on the Pro and Business plans.");
	if (currentAssignedEnabled + adding > entitlements.premiumPool) {
		const remaining = Math.max(0, entitlements.premiumPool - currentAssignedEnabled);
		return deny("premium-pool-exhausted", `Your plan covers ${premiumPairings(entitlements.premiumPool)} (${remaining} remaining). Buy more on the billing page or unassign others.`);
	}
	return ALLOWED;
}
/**
* A cadence override may slow sampling down, never speed it past the plan
* rate — so the floor moves with the plan (custom plans with higher
* standardRunsPerDay allow proportionally faster overrides). Null clears the
* override back to the plan cadence.
*/
function decideCadenceOverride(entitlements, requestedDelayHours) {
	const gate = requireActivePlan(entitlements);
	if (gate) return gate;
	if (requestedDelayHours === null) return ALLOWED;
	const runsPerDay = entitlements.standardRunsPerDay;
	if (runsPerDay === null || requestedDelayHours * runsPerDay >= 24) return ALLOWED;
	return deny("cadence-faster-than-plan", `Your plan samples ${runsPerDay} time${runsPerDay === 1 ? "" : "s"} per day; a cadence override can only slow that down.`);
}
/**
* Turn a decision into the thrown form. Exported so a caller that already holds
* entitlements can use the pure decide* functions directly and still raise the
* same error every other write path raises.
*/
function assertAllowed(decision) {
	if (!decision.allowed) throw new EntitlementError(decision.code, decision.message);
}
async function countBrandsByOrg(orgIds) {
	if (orgIds.length === 0) return /* @__PURE__ */ new Map();
	const rows = await db.select({
		organizationId: brands.organizationId,
		value: count()
	}).from(brands).where(inArray(brands.organizationId, orgIds)).groupBy(brands.organizationId);
	return new Map(rows.map((row) => [row.organizationId, row.value]));
}
async function countOrgBrands(organizationId) {
	return (await countBrandsByOrg([organizationId])).get(organizationId) ?? 0;
}
async function countOrgEnabledPrompts(organizationId) {
	const [row] = await db.select({ value: count() }).from(prompts).innerJoin(brands, eq(prompts.brandId, brands.id)).where(and(eq(brands.organizationId, organizationId), eq(prompts.enabled, true)));
	return row?.value ?? 0;
}
/**
* Premium pairings the org has spent: one per prompt/model pair on enabled prompts,
* so a prompt tracked on two premium models counts twice. Picking the same model
* ungrounded is a platform pick and never counts here.
*/
async function countOrgAssignedPremiumSlots(organizationId) {
	const [row] = await db.select({ value: sql`coalesce(sum(cardinality(${prompts.premiumModels})), 0)` }).from(prompts).innerJoin(brands, eq(prompts.brandId, brands.id)).where(and(eq(brands.organizationId, organizationId), eq(prompts.enabled, true)));
	return Number(row?.value ?? 0);
}
/**
* Load the org's entitlements once, then run `decide` against them. Unlimited
* entitlements return before `decide` runs, so the usage counts a decision needs
* are never queried outside cloud.
*/
async function withEntitlements(organizationId, decide) {
	const entitlements = await getOrgEntitlements(organizationId);
	if (entitlements.unlimited) return;
	for (const decision of await decide(entitlements)) assertAllowed(decision);
}
async function assertCanCreateBrand(organizationId) {
	await withEntitlements(organizationId, async (entitlements) => [decideBrandCreate(entitlements, await countOrgBrands(organizationId))]);
}
/**
* The same verdict assertCanCreateBrand raises, returned instead of thrown, for
* any number of orgs at once. UI that offers brand creation asks this first so a
* customer meets the limit before filling in a form, rather than as an error on
* the last step of one.
*/
async function checkBrandCreate(orgIds) {
	const entitlementsByOrg = await getOrgEntitlementsMap(orgIds);
	const counts = await countBrandsByOrg(orgIds.filter((orgId) => !entitlementsByOrg.get(orgId)?.unlimited));
	const decisions = /* @__PURE__ */ new Map();
	for (const orgId of orgIds) {
		const entitlements = entitlementsByOrg.get(orgId);
		decisions.set(orgId, entitlements ? decideBrandCreate(entitlements, counts.get(orgId) ?? 0) : ALLOWED);
	}
	return decisions;
}
/** Guard creating `adding` new enabled prompts (or re-enabling that many). */
async function assertCanAddPrompts(organizationId, adding) {
	if (adding <= 0) return;
	await withEntitlements(organizationId, async (entitlements) => [decidePromptAdd(entitlements, await countOrgEnabledPrompts(organizationId), adding)]);
}
async function assertEnabledModelsAllowed(organizationId, requestedModels) {
	await withEntitlements(organizationId, (entitlements) => [decideEnabledModels(entitlements, requestedModels)]);
}
async function assertCadenceAllowed(organizationId, requestedDelayHours) {
	await withEntitlements(organizationId, (entitlements) => [decideCadenceOverride(entitlements, requestedDelayHours)]);
}
/**
* Guard a whole prompts save against both pools it can spend. One entitlement
* load and one parallel round of counts, rather than the two of each that
* calling the single-limit asserts back to back would cost — and the two limits
* are decided against the same snapshot, so a save can't pass one against a
* plan the other was denied under.
*/
async function assertPromptSaveAllowed(organizationId, delta) {
	if (delta.prompts <= 0 && delta.premiumPairings <= 0) return;
	await withEntitlements(organizationId, async (entitlements) => {
		const [enabledPrompts, assignedPremium] = await Promise.all([delta.prompts > 0 ? countOrgEnabledPrompts(organizationId) : 0, delta.premiumPairings > 0 ? countOrgAssignedPremiumSlots(organizationId) : 0]);
		return [decidePromptAdd(entitlements, enabledPrompts, delta.prompts), decidePremiumAssign(entitlements, assignedPremium, delta.premiumPairings)];
	});
}
//#endregion
export { assertCanCreateBrand as a, checkBrandCreate as c, countOrgEnabledPrompts as d, decideEnabledModels as f, getOrgEntitlementsMap as g, getOrgEntitlements as h, assertCanAddPrompts as i, countOrgAssignedPremiumSlots as l, getOrgBillingState as m, assertAllowed as n, assertEnabledModelsAllowed as o, getBrandOrganizationId as p, assertCadenceAllowed as r, assertPromptSaveAllowed as s, EntitlementError as t, countOrgBrands as u };

//# sourceMappingURL=entitlements-BlArge5u.mjs.map