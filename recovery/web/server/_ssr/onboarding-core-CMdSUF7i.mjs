import { M as string, O as object, f as array, p as boolean } from "../_libs/zod.mjs";
import { c as dedupeAliases, l as dedupeDomains } from "./domain-categories-IivSiXtp.mjs";
import { f as eq, s as count } from "../_libs/drizzle-orm.mjs";
import { a as competitors, d as prompts, r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as ensureOrganization } from "./provisioning-ClYiUXoH.mjs";
import { i as assertCanAddPrompts, p as getBrandOrganizationId } from "./entitlements-BlArge5u.mjs";
import { r as sanitizeUserTags, t as computeSystemTags } from "./tag-utils-C10EeA61.mjs";
import { t as createMultiplePromptJobSchedulers } from "./job-scheduler-PGB1J6XT.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/onboarding-core-CMdSUF7i.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "a8a8087c-fa5b-409c-b2c2-e4a0951627f5", e._sentryDebugIdIdentifier = "sentry-dbid-a8a8087c-fa5b-409c-b2c2-e4a0951627f5");
	} catch (e) {}
})();
/**
* Brand-onboarding persistence helpers. Server-only — used by the API routes
* under /api/v1/brands and by the server functions in ./onboarding.ts.
*
* Separated from onboarding.ts so that client components importing server
* functions don't transitively pull in db/drizzle/pg (which breaks the
* client bundle). Server functions live in onboarding.ts; everything else
* lives here.
*/
var BrandConflictError = class extends Error {
	brandId;
	constructor(brandId) {
		super(`Brand "${brandId}" already exists.`);
		this.brandId = brandId;
		this.name = "BrandConflictError";
	}
};
var BrandNotFoundError = class extends Error {
	brandId;
	constructor(brandId) {
		super(`Brand "${brandId}" not found.`);
		this.brandId = brandId;
		this.name = "BrandNotFoundError";
	}
};
var competitorInputSchema = object({
	name: string().min(1),
	domains: array(string()).optional().default([]),
	aliases: array(string()).optional().default([])
});
var promptInputSchema = object({
	value: string().min(1),
	tags: array(string()).optional().default([]),
	enabled: boolean().optional().default(true)
});
/**
* POST /api/v1/brands body.
*
* The API speaks a single `domains` list to mirror the competitor endpoints.
* Internally, the first cleaned entry is stored as the brand's `website`
* (`https://<host>`) and the rest are stored in `additionalDomains`.
*/
var createBrandInputSchema = object({
	id: string().min(1),
	name: string().min(1),
	domains: array(string()).min(1),
	aliases: array(string()).optional(),
	competitors: array(competitorInputSchema).optional(),
	prompts: array(promptInputSchema).optional()
});
/** PATCH /api/v1/brands/:brandId body. brandId comes from the URL. */
var updateBrandBodySchema = object({
	brandName: string().min(1).optional(),
	domains: array(string()).min(1).optional(),
	aliases: array(string()).optional(),
	enabled: boolean().optional()
});
/** Wizard save: brand-level fields + new prompts/competitors in one shot. */
var wizardOnboardingInputSchema = object({
	brandId: string().min(1),
	brandName: string().min(1).optional(),
	website: string().min(1).optional(),
	additionalDomains: array(string()).optional(),
	aliases: array(string()).optional(),
	competitors: array(competitorInputSchema).optional(),
	prompts: array(promptInputSchema).optional()
});
function validateAndFormatWebsite(url) {
	const trimmed = url.trim();
	const formatted = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
	const parsed = new URL(formatted);
	if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Website URL must use http or https");
	if (!parsed.hostname) throw new Error("Website URL must have a valid hostname");
	return formatted;
}
function buildBrandResult(row) {
	const websiteHost = new URL(row.website).hostname.replace(/^www\./, "");
	return {
		id: row.id,
		name: row.name,
		domains: [websiteHost, ...row.additionalDomains],
		aliases: row.aliases,
		enabled: row.enabled,
		onboarded: row.onboarded,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}
/**
* Validation error thrown by the API → internal converters when the supplied
* `domains` array contains no valid entries after cleaning. Callers should
* surface this as a 400.
*/
var InvalidDomainsError = class extends Error {
	constructor(message = "domains: at least one valid domain is required") {
		super(message);
		this.name = "InvalidDomainsError";
	}
};
function splitDomainsForStorage(domains) {
	const cleaned = dedupeDomains(domains);
	if (cleaned.length === 0) throw new InvalidDomainsError();
	const [primary, ...rest] = cleaned;
	return {
		website: `https://${primary}`,
		additionalDomains: rest
	};
}
/** Convert POST /api/v1/brands body into the internal createBrand input. */
function apiCreateInputToInternal(input) {
	const { website, additionalDomains } = splitDomainsForStorage(input.domains);
	return {
		id: input.id,
		name: input.name,
		website,
		additionalDomains,
		aliases: input.aliases,
		competitors: input.competitors,
		prompts: input.prompts
	};
}
/** Convert PATCH /api/v1/brands/:brandId body into the internal updateBrand input. */
function apiUpdateInputToInternal(brandId, input) {
	const result = {
		brandId,
		brandName: input.brandName,
		aliases: input.aliases,
		enabled: input.enabled
	};
	if (input.domains !== void 0) {
		const { website, additionalDomains } = splitDomainsForStorage(input.domains);
		result.website = website;
		result.additionalDomains = additionalDomains;
	}
	return result;
}
async function insertCompetitors(args) {
	if (args.source.length === 0) return 0;
	const existing = await db.query.competitors.findMany({ where: eq(competitors.brandId, args.brandId) });
	const existingDomains = new Set(existing.flatMap((c) => c.domains));
	const toInsert = [];
	for (const c of args.source) {
		const cleaned = dedupeDomains(c.domains).filter((d) => d !== args.websiteHost);
		if (cleaned.length === 0) continue;
		if (cleaned.some((d) => existingDomains.has(d))) continue;
		toInsert.push({
			brandId: args.brandId,
			name: c.name.trim(),
			domains: cleaned,
			aliases: dedupeAliases(c.aliases)
		});
	}
	if (toInsert.length === 0) return 0;
	const [{ count: currentCount }] = await db.select({ count: count() }).from(competitors).where(eq(competitors.brandId, args.brandId));
	if ((currentCount || 0) + toInsert.length > 100) throw new Error(`Cannot add competitors. Would exceed maximum of 100 (currently ${currentCount}, adding ${toInsert.length}).`);
	await db.insert(competitors).values(toInsert);
	return toInsert.length;
}
async function insertPrompts(args) {
	if (args.source.length === 0) return 0;
	const seen = /* @__PURE__ */ new Set();
	if (args.dedupeAgainstExisting) {
		const existing = await db.query.prompts.findMany({ where: eq(prompts.brandId, args.brandId) });
		for (const p of existing) seen.add(p.value.toLowerCase());
	}
	const rows = [];
	for (const p of args.source) {
		const value = p.value.trim();
		if (!value) continue;
		const key = value.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		rows.push({
			brandId: args.brandId,
			value,
			enabled: p.enabled,
			tags: p.tags,
			systemTags: computeSystemTags(value, args.brandName, args.website)
		});
	}
	if (rows.length === 0) return 0;
	await assertCanAddPrompts(await getBrandOrganizationId(args.brandId), rows.filter((r) => r.enabled).length);
	const inserted = await db.insert(prompts).values(rows).returning({ id: prompts.id });
	await createMultiplePromptJobSchedulers(inserted.map((r) => r.id));
	return inserted.length;
}
async function createBrand(input) {
	const formattedWebsite = validateAndFormatWebsite(input.website);
	const websiteHost = new URL(formattedWebsite).hostname.replace(/^www\./, "");
	const additionalDomains = dedupeDomains(input.additionalDomains ?? []).filter((d) => d !== websiteHost);
	const aliases = dedupeAliases(input.aliases ?? []);
	await db.transaction(async (tx) => {
		await ensureOrganization({
			id: input.id,
			name: input.name
		}, tx);
		const [inserted] = await tx.insert(brands).values({
			id: input.id,
			organizationId: input.id,
			name: input.name,
			website: formattedWebsite,
			additionalDomains,
			aliases,
			enabled: true,
			onboarded: true
		}).onConflictDoNothing().returning({ id: brands.id });
		if (!inserted) throw new BrandConflictError(input.id);
	});
	await insertCompetitors({
		brandId: input.id,
		websiteHost,
		source: (input.competitors ?? []).map((c) => ({
			name: c.name,
			domains: c.domains ?? [],
			aliases: c.aliases ?? []
		}))
	});
	await insertPrompts({
		brandId: input.id,
		brandName: input.name,
		website: formattedWebsite,
		source: (input.prompts ?? []).map((p) => ({
			value: p.value,
			tags: sanitizeUserTags(p.tags ?? []),
			enabled: p.enabled ?? true
		})),
		dedupeAgainstExisting: false
	});
	return buildBrandResult(await db.query.brands.findFirst({ where: eq(brands.id, input.id) }));
}
async function updateBrand(input) {
	const existing = await db.query.brands.findFirst({ where: eq(brands.id, input.brandId) });
	if (!existing) throw new BrandNotFoundError(input.brandId);
	const formattedWebsite = input.website ? validateAndFormatWebsite(input.website) : null;
	const websiteHost = formattedWebsite ? new URL(formattedWebsite).hostname.replace(/^www\./, "") : existing.website ? new URL(existing.website).hostname.replace(/^www\./, "") : null;
	const patch = { updatedAt: /* @__PURE__ */ new Date() };
	if (input.brandName !== void 0) patch.name = input.brandName;
	if (formattedWebsite !== null) patch.website = formattedWebsite;
	if (input.additionalDomains !== void 0) patch.additionalDomains = dedupeDomains(input.additionalDomains).filter((d) => d !== websiteHost);
	if (input.aliases !== void 0) patch.aliases = dedupeAliases(input.aliases);
	if (input.enabled !== void 0) patch.enabled = input.enabled;
	await db.update(brands).set(patch).where(eq(brands.id, input.brandId));
	return buildBrandResult(await db.query.brands.findFirst({ where: eq(brands.id, input.brandId) }));
}
async function saveWizardOnboarding(input) {
	await updateBrand({
		brandId: input.brandId,
		brandName: input.brandName,
		website: input.website,
		additionalDomains: input.additionalDomains,
		aliases: input.aliases
	});
	await db.update(brands).set({
		onboarded: true,
		updatedAt: /* @__PURE__ */ new Date()
	}).where(eq(brands.id, input.brandId));
	const existing = await db.query.brands.findFirst({ where: eq(brands.id, input.brandId) });
	if (!existing) throw new BrandNotFoundError(input.brandId);
	const websiteHost = new URL(existing.website).hostname.replace(/^www\./, "");
	await insertCompetitors({
		brandId: input.brandId,
		websiteHost,
		source: (input.competitors ?? []).map((c) => ({
			name: c.name,
			domains: c.domains ?? [],
			aliases: c.aliases ?? []
		}))
	});
	await insertPrompts({
		brandId: input.brandId,
		brandName: existing.name,
		website: existing.website,
		source: (input.prompts ?? []).map((p) => ({
			value: p.value,
			tags: sanitizeUserTags(p.tags ?? []),
			enabled: p.enabled ?? true
		})),
		dedupeAgainstExisting: true
	});
	return buildBrandResult(await db.query.brands.findFirst({ where: eq(brands.id, input.brandId) }));
}
//#endregion
export { apiUpdateInputToInternal as a, createBrandInputSchema as c, updateBrandBodySchema as d, wizardOnboardingInputSchema as f, apiCreateInputToInternal as i, saveWizardOnboarding as l, BrandNotFoundError as n, buildBrandResult as o, InvalidDomainsError as r, createBrand as s, BrandConflictError as t, updateBrand as u };

//# sourceMappingURL=onboarding-core-CMdSUF7i.mjs.map