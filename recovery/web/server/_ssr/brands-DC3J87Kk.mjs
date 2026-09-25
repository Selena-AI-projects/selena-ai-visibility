import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, f as array } from "../_libs/zod.mjs";
import { n as getDefaultDelayHours } from "./constants-BDRQAb6s.mjs";
import { s as cleanAndValidateDomain } from "./domain-categories-IivSiXtp.mjs";
import { s as targetFilterValue } from "./model-filter-DGVUY-LA.mjs";
import { t as validateWebsiteUrl } from "./brand-website-COFlckqV.mjs";
import { L as sql, d as and, f as eq, g as inArray, s as count } from "../_libs/drizzle-orm.mjs";
import { a as competitors, d as prompts, r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { o as slugify, r as findUniqueBrandId } from "./provisioning-ClYiUXoH.mjs";
import { s as parseScrapeTargets } from "./env-D9tfoX6E.mjs";
import { a as assertCanCreateBrand, g as getOrgEntitlementsMap, h as getOrgEntitlements, o as assertEnabledModelsAllowed } from "./entitlements-BlArge5u.mjs";
import { l as resolveProviderAccess, s as isGroundedApiTarget } from "./providers-kvP4SquB.mjs";
import { a as selectTargetsForBrand, i as resolvePromptRunPlan, t as defaultPlatformPicks } from "./run-policy-DWPSozxj.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as getDeployment } from "./server-B0rVTxL5.mjs";
import { a as listUserOrganizations, c as requireAuthSession, d as requireBrandRole, f as requireOrgAccess, l as requireBrandAccess, t as BRAND_WRITER_ROLES } from "./helpers-phr0Aqka.mjs";
import { a as evaluateRequireCanCreateBrands, s as resolveBrandOrganization } from "./policies-CGhErjzS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/brands-DC3J87Kk.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7d04927b-30d1-4fe0-9013-a64dbca75219", e._sentryDebugIdIdentifier = "sentry-dbid-7d04927b-30d1-4fe0-9013-a64dbca75219");
	} catch (e) {}
})();
function normalizeBrandUpdate(input) {
	const updates = {};
	if (input.name !== void 0) {
		if (!input.name.trim()) return {
			ok: false,
			error: "Brand name must be a non-empty string"
		};
		updates.name = input.name.trim();
	}
	if (input.website !== void 0) {
		const urlValidation = validateWebsiteUrl(input.website);
		if (!urlValidation.isValid) return {
			ok: false,
			error: urlValidation.error
		};
		updates.website = urlValidation.formattedUrl;
	}
	if (input.additionalDomains !== void 0) {
		const cleaned = input.additionalDomains.map((d) => cleanAndValidateDomain(d));
		const invalid = input.additionalDomains.filter((_, i) => !cleaned[i]);
		if (invalid.length > 0) return {
			ok: false,
			error: `Invalid domain(s): ${invalid.join(", ")}`
		};
		updates.additionalDomains = [...new Set(cleaned.filter(Boolean))];
	}
	if (input.aliases !== void 0) updates.aliases = [...new Set(input.aliases.map((a) => a.trim()).filter(Boolean))];
	return {
		ok: true,
		updates
	};
}
/**
* Server functions for brand operations.
* Replaces apps/web/src/app/api/brands/* API routes.
*/
var BRAND_ORG_ERRORS = {
	"no-organization": "No organization for the current user",
	forbidden: "Forbidden: No access to this organization",
	ambiguous: "Choose a workspace for this brand"
};
/**
* What this brand's results can be broken down by: the standard platforms it
* picks, plus the grounded variants its prompts are tracked on.
*
* A model can appear twice — scraped and grounded are different answers to
* different questions — so these are targets rather than model ids. Anything
* asking "which models is this brand tracking?" reads from here; deployments
* configure arbitrary sets via `SCRAPE_TARGETS`, so nothing hardcodes a list.
*/
function computeTrackedTargets(brand, brandPrompts, entitlements) {
	try {
		const configs = parseScrapeTargets(process.env.SCRAPE_TARGETS);
		return resolvePromptRunPlan({
			scrapeTargets: configs,
			brand: {
				enabledModels: brand.enabledModels,
				delayOverrideHours: brand.delayOverrideHours
			},
			prompt: { premiumModels: [...new Set(brandPrompts.flatMap((prompt) => prompt.premiumModels))] },
			entitlements,
			defaultDelayHours: getDefaultDelayHours()
		}).targets.map((target) => {
			const premium = isGroundedApiTarget(target.config);
			return {
				value: targetFilterValue(target.config.model, premium),
				model: target.config.model,
				premium,
				tier: premium ? "premium" : resolveProviderAccess(target.config) === "scraped" ? "scraped" : "api",
				intervalHours: target.intervalHours,
				replication: target.replication
			};
		});
	} catch {
		return [];
	}
}
/**
* Cloud brands start with their plan's default platform picks written
* explicitly, so the run policy, the model filter, and the LLMs settings page
* all agree from the first run. Outside cloud (or when nothing is pickable
* yet, e.g. an unsubscribed org via the admin API) brands keep the null
* "follow deployment configuration" semantics.
*
* Note: the defaults written here are a snapshot at creation time. The
* run policy's `resolvePromptRunPlan` also applies `defaultPlatformPicks` as a
* fallback when `brand.enabledModels` is null — so a brand that had picks
* written explicitly follows the creation-time snapshot, while one created
* via the API without picks always resolves fresh defaults. Both converge for
* the same plan; the dual path is intentional defense-in-depth.
*/
async function initialEnabledModels(organizationId) {
	if (getDeployment().mode !== "cloud") return null;
	const entitlements = await getOrgEntitlements(organizationId);
	if (entitlements.unlimited) return null;
	const picks = defaultPlatformPicks(entitlements, parseScrapeTargets(process.env.SCRAPE_TARGETS));
	return picks.length > 0 ? picks : null;
}
/**
* Picks supplied at creation time go through the same checks as a
* post-creation edit: the loud configured-target validation plus plan
* enforcement. Without picks, creation falls back to the plan defaults.
*/
async function resolveCreateEnabledModels(organizationId, requested) {
	if (!requested || requested.length === 0) return initialEnabledModels(organizationId);
	const models = [...new Set(requested)];
	selectTargetsForBrand(parseScrapeTargets(process.env.SCRAPE_TARGETS), models);
	await assertEnabledModelsAllowed(organizationId, models);
	return models;
}
function getDefaultBrandDomains() {
	const raw = process.env.DEFAULT_BRAND_DOMAINS;
	if (!raw) return [];
	return raw.split(",").map((d) => d.trim()).filter(Boolean).map((d) => cleanAndValidateDomain(d)).filter((d) => d !== null);
}
/**
* Entitlements come in from the caller rather than being loaded here: the
* brand-list path fans this out per brand, and resolving them inside would put
* two subscription queries on every brand a whitelabel org owns.
*/
async function getBrandWithPromptsFromDb(brandId, entitlements) {
	try {
		const brand = await db.query.brands.findFirst({ where: eq(brands.id, brandId) });
		if (!brand) return void 0;
		const [brandPrompts, brandCompetitors, resolved] = await Promise.all([
			db.query.prompts.findMany({ where: eq(prompts.brandId, brandId) }),
			db.query.competitors.findMany({ where: eq(competitors.brandId, brandId) }),
			entitlements ?? getOrgEntitlements(brand.organizationId)
		]);
		return {
			...brand,
			prompts: brandPrompts,
			competitors: brandCompetitors,
			trackedTargets: computeTrackedTargets(brand, brandPrompts, resolved)
		};
	} catch (error) {
		console.error("Error fetching brand with prompts:", error);
		return;
	}
}
/**
* Get all brands the current user has access to.
*
* Org scoping is the access-control mechanism: we resolve the orgs the user is
* a member of and return only brands owned by those orgs (`brands.organization_id
* IN (...)`). A user in org A never sees org B's brands.
*/
var getBrands_createServerFn_handler = createServerRpc({
	id: "3a376561f540fb34827c69a147024614f9bc35bd3c913d305eb4b441be532c0e",
	name: "getBrands",
	filename: "src/server/brands.ts"
}, (opts) => getBrands.__executeServer(opts));
var getBrands = createServerFn({ method: "GET" }).handler(getBrands_createServerFn_handler, async () => {
	const session = await requireAuthSession();
	const orgIds = (await listUserOrganizations(session.user.id)).map((o) => o.id);
	if (orgIds.length === 0) return [];
	const scopedBrands = await db.query.brands.findMany({ where: inArray(brands.organizationId, orgIds) });
	const entitlementsByOrg = await getOrgEntitlementsMap(orgIds);
	return (await Promise.all(scopedBrands.map((brand) => getBrandWithPromptsFromDb(brand.id, entitlementsByOrg.get(brand.organizationId))))).filter((brand) => brand !== void 0);
});
var getBrand_createServerFn_handler = createServerRpc({
	id: "aeb8fd7719320a67b10ad299a3118706c1fac94e06dfa70eb832037399e08ce7",
	name: "getBrand",
	filename: "src/server/brands.ts"
}, (opts) => getBrand.__executeServer(opts));
var getBrand = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(getBrand_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	const brand = await getBrandWithPromptsFromDb(data.brandId);
	if (!brand) throw new Error("Brand not found");
	return brand;
});
var createBrandFn_createServerFn_handler = createServerRpc({
	id: "c5086342f43d713a970e38c1f7a6ce4af17bbf780b765d5adc1f5e635d581b99",
	name: "createBrandFn",
	filename: "src/server/brands.ts"
}, (opts) => createBrandFn.__executeServer(opts));
var createBrandFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	brandName: string(),
	website: string(),
	/** Platform picks from the onboarding wizard; omitted → plan defaults. */
	enabledModels: array(string().min(1)).max(50).optional()
})).handler(createBrandFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireOrgAccess(session.user.id, data.brandId);
	await assertCanCreateBrand(data.brandId);
	const urlValidation = validateWebsiteUrl(data.website);
	if (!urlValidation.isValid) throw new Error(urlValidation.error);
	const defaultDomains = getDefaultBrandDomains();
	const enabledModels = await resolveCreateEnabledModels(data.brandId, data.enabledModels);
	const brand = (await db.insert(brands).values({
		id: data.brandId,
		organizationId: data.brandId,
		name: data.brandName,
		website: urlValidation.formattedUrl,
		enabled: true,
		...enabledModels && { enabledModels },
		...defaultDomains.length > 0 && { additionalDomains: defaultDomains }
	}).onConflictDoNothing().returning())[0] ?? await db.query.brands.findFirst({ where: eq(brands.id, data.brandId) });
	if (!brand) throw new Error("Failed to create brand");
	return {
		success: true,
		brand
	};
});
var createBrandInOrgFn_createServerFn_handler = createServerRpc({
	id: "10bf3c18291058ca02b860beda0e470e5a2d9a04bbb522598577ab50cc2e4057",
	name: "createBrandInOrgFn",
	filename: "src/server/brands.ts"
}, (opts) => createBrandInOrgFn.__executeServer(opts));
var createBrandInOrgFn = createServerFn({ method: "POST" }).validator(object({
	brandName: string().min(1).max(100),
	website: string().min(1),
	organizationId: string().optional(),
	/** Platform picks from the creation wizard; omitted → plan defaults. */
	enabledModels: array(string().min(1)).max(50).optional()
})).handler(createBrandInOrgFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	const deployment = getDeployment();
	if (evaluateRequireCanCreateBrands(deployment.features.canCreateBrands) === "deny") throw new Error("Brand creation is not allowed in this deployment");
	const urlValidation = validateWebsiteUrl(data.website);
	if (!urlValidation.isValid) throw new Error(urlValidation.error);
	const trimmedName = data.brandName.trim();
	if (!trimmedName) throw new Error("Brand name must be a non-empty string");
	const orgs = await listUserOrganizations(session.user.id);
	const choice = resolveBrandOrganization(orgs.map((o) => o.id), data.organizationId);
	if (!choice.ok) throw new Error(BRAND_ORG_ERRORS[choice.reason]);
	const orgId = choice.organizationId;
	await assertCanCreateBrand(orgId);
	const brandId = await findUniqueBrandId(slugify(trimmedName));
	const defaultDomains = getDefaultBrandDomains();
	const enabledModels = await resolveCreateEnabledModels(orgId, data.enabledModels);
	await db.insert(brands).values({
		id: brandId,
		organizationId: orgId,
		name: trimmedName,
		website: urlValidation.formattedUrl,
		enabled: true,
		...enabledModels && { enabledModels },
		...defaultDomains.length > 0 && { additionalDomains: defaultDomains }
	});
	return { brandId };
});
var updateBrandFn_createServerFn_handler = createServerRpc({
	id: "c16080a950ef75c038702d830decbb94fda6b501a37c59be2b192f9965b383ea",
	name: "updateBrandFn",
	filename: "src/server/brands.ts"
}, (opts) => updateBrandFn.__executeServer(opts));
var updateBrandFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	name: string().optional(),
	website: string().optional(),
	additionalDomains: array(string()).optional(),
	aliases: array(string()).optional()
})).handler(updateBrandFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandRole(session.user.id, data.brandId, BRAND_WRITER_ROLES);
	const normalized = normalizeBrandUpdate({
		name: data.name,
		website: data.website,
		additionalDomains: data.additionalDomains,
		aliases: data.aliases
	});
	if (!normalized.ok) throw new Error(normalized.error);
	const updateData = normalized.updates;
	const result = await db.update(brands).set({
		...updateData,
		updatedAt: /* @__PURE__ */ new Date()
	}).where(eq(brands.id, data.brandId)).returning();
	if (!result[0]) throw new Error("Failed to update brand");
	return result[0];
});
var getCompetitors_createServerFn_handler = createServerRpc({
	id: "d80b77c683acf8475e2fcbe2d5fbd9382efee126e26b44b081455c155b90232b",
	name: "getCompetitors",
	filename: "src/server/brands.ts"
}, (opts) => getCompetitors.__executeServer(opts));
var getCompetitors = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(getCompetitors_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	return db.query.competitors.findMany({ where: eq(competitors.brandId, data.brandId) });
});
var updateCompetitors_createServerFn_handler = createServerRpc({
	id: "0deaa40d7eec0fac56d6f811a5c914cdb7b81bef215332b18218c4c7378970a5",
	name: "updateCompetitors",
	filename: "src/server/brands.ts"
}, (opts) => updateCompetitors.__executeServer(opts));
var updateCompetitors = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	competitors: array(object({
		name: string(),
		domains: array(string()).min(1),
		aliases: array(string()).optional().default([])
	}))
})).handler(updateCompetitors_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandRole(session.user.id, data.brandId, BRAND_WRITER_ROLES);
	const cleanedCompetitors = data.competitors.map((c) => {
		const cleanedDomains = c.domains.map((d) => cleanAndValidateDomain(d));
		const invalid = c.domains.filter((_, i) => !cleanedDomains[i]);
		if (invalid.length > 0) throw new Error(`Invalid domain(s) for "${c.name}": ${invalid.join(", ")}`);
		return {
			name: c.name,
			domains: cleanedDomains.filter(Boolean),
			aliases: c.aliases
		};
	});
	return db.transaction(async (tx) => {
		await tx.delete(competitors).where(eq(competitors.brandId, data.brandId));
		if (cleanedCompetitors.length > 0) await tx.insert(competitors).values(cleanedCompetitors.map((c) => ({
			brandId: data.brandId,
			name: c.name,
			domains: c.domains,
			aliases: c.aliases
		})));
		return tx.query.competitors.findMany({ where: eq(competitors.brandId, data.brandId) });
	});
});
var addDomainToBrandFn_createServerFn_handler = createServerRpc({
	id: "d1f83a26036caceabe87a178cc6ef8a61ac6082d9d90cbaf295e43d974721656",
	name: "addDomainToBrandFn",
	filename: "src/server/brands.ts"
}, (opts) => addDomainToBrandFn.__executeServer(opts));
var addDomainToBrandFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	domain: string().min(1)
})).handler(addDomainToBrandFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandRole(session.user.id, data.brandId, BRAND_WRITER_ROLES);
	const domain = cleanAndValidateDomain(data.domain);
	if (!domain) throw new Error(`Invalid domain: ${data.domain}`);
	const [result] = await db.update(brands).set({
		additionalDomains: sql`array_append(${brands.additionalDomains}, ${domain})`,
		updatedAt: /* @__PURE__ */ new Date()
	}).where(and(eq(brands.id, data.brandId), sql`NOT (${domain} = ANY(${brands.additionalDomains}))`)).returning();
	if (result) return result;
	const brand = await db.query.brands.findFirst({ where: eq(brands.id, data.brandId) });
	if (!brand) throw new Error("Brand not found");
	return brand;
});
var addDomainToCompetitorFn_createServerFn_handler = createServerRpc({
	id: "9e926b71ef1190d98bb8ae6a0af90161fe78fac56645b6244de93d3d86af1e32",
	name: "addDomainToCompetitorFn",
	filename: "src/server/brands.ts"
}, (opts) => addDomainToCompetitorFn.__executeServer(opts));
var addDomainToCompetitorFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	competitorId: string(),
	domain: string().min(1)
})).handler(addDomainToCompetitorFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandRole(session.user.id, data.brandId, BRAND_WRITER_ROLES);
	const existing = await db.query.competitors.findFirst({ where: and(eq(competitors.id, data.competitorId), eq(competitors.brandId, data.brandId)) });
	if (!existing) throw new Error("Competitor not found");
	const domain = cleanAndValidateDomain(data.domain);
	if (!domain) throw new Error(`Invalid domain: ${data.domain}`);
	if (existing.domains.includes(domain)) return existing;
	const updatedDomains = [...existing.domains, domain];
	const [result] = await db.update(competitors).set({
		domains: updatedDomains,
		updatedAt: /* @__PURE__ */ new Date()
	}).where(eq(competitors.id, data.competitorId)).returning();
	return result;
});
var createCompetitorFromDomainFn_createServerFn_handler = createServerRpc({
	id: "3dfb151282935d389d6e08d84e7f8d69da8519f21ddbf877568bc6c93fe47db9",
	name: "createCompetitorFromDomainFn",
	filename: "src/server/brands.ts"
}, (opts) => createCompetitorFromDomainFn.__executeServer(opts));
var createCompetitorFromDomainFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	name: string().min(1),
	domain: string().min(1)
})).handler(createCompetitorFromDomainFn_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandRole(session.user.id, data.brandId, BRAND_WRITER_ROLES);
	const domain = cleanAndValidateDomain(data.domain);
	if (!domain) throw new Error(`Invalid domain: ${data.domain}`);
	const [currentCount] = await db.select({ count: count() }).from(competitors).where(eq(competitors.brandId, data.brandId));
	if ((currentCount?.count || 0) >= 100) throw new Error(`Cannot add competitor. Maximum of 100 competitors reached.`);
	const [result] = await db.insert(competitors).values({
		brandId: data.brandId,
		name: data.name.trim(),
		domains: [domain]
	}).returning();
	return result;
});
//#endregion
export { addDomainToBrandFn_createServerFn_handler, addDomainToCompetitorFn_createServerFn_handler, createBrandFn_createServerFn_handler, createBrandInOrgFn_createServerFn_handler, createCompetitorFromDomainFn_createServerFn_handler, getBrand_createServerFn_handler, getBrands_createServerFn_handler, getCompetitors_createServerFn_handler, updateBrandFn_createServerFn_handler, updateCompetitors_createServerFn_handler };

//# sourceMappingURL=brands-DC3J87Kk.mjs.map