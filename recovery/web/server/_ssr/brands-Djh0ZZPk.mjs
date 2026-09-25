import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, f as array } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/brands-Djh0ZZPk.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "147ce967-6a36-4131-bf05-01265ea46162", e._sentryDebugIdIdentifier = "sentry-dbid-147ce967-6a36-4131-bf05-01265ea46162");
	} catch (e) {}
})();
createServerFn({ method: "GET" }).handler(createSsrRpc("3a376561f540fb34827c69a147024614f9bc35bd3c913d305eb4b441be532c0e"));
/**
* Get a single brand by ID
*/
var getBrand = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(createSsrRpc("aeb8fd7719320a67b10ad299a3118706c1fac94e06dfa70eb832037399e08ce7"));
/**
* Create a new brand
*/
var createBrandFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	brandName: string(),
	website: string(),
	/** Platform picks from the onboarding wizard; omitted → plan defaults. */
	enabledModels: array(string().min(1)).max(50).optional()
})).handler(createSsrRpc("c5086342f43d713a970e38c1f7a6ce4af17bbf780b765d5adc1f5e635d581b99"));
/**
* Attach a new brand to the current user's existing organization, with a
* fresh id decoupled from the org id. Used by the multi-brand "create new
* brand" flow on the brand switcher. Gated by the canCreateBrands deployment
* feature so whitelabel (orgs come from Auth0) and demo (read-only) reject it.
*/
var createBrandInOrgFn = createServerFn({ method: "POST" }).validator(object({
	brandName: string().min(1).max(100),
	website: string().min(1),
	organizationId: string().optional(),
	/** Platform picks from the creation wizard; omitted → plan defaults. */
	enabledModels: array(string().min(1)).max(50).optional()
})).handler(createSsrRpc("10bf3c18291058ca02b860beda0e470e5a2d9a04bbb522598577ab50cc2e4057"));
/**
* Update a brand
*/
var updateBrandFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	name: string().optional(),
	website: string().optional(),
	additionalDomains: array(string()).optional(),
	aliases: array(string()).optional()
})).handler(createSsrRpc("c16080a950ef75c038702d830decbb94fda6b501a37c59be2b192f9965b383ea"));
/**
* Get competitors for a brand
*/
var getCompetitors = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(createSsrRpc("d80b77c683acf8475e2fcbe2d5fbd9382efee126e26b44b081455c155b90232b"));
/**
* Update competitors for a brand (bulk replace)
*/
var updateCompetitors = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	competitors: array(object({
		name: string(),
		domains: array(string()).min(1),
		aliases: array(string()).optional().default([])
	}))
})).handler(createSsrRpc("0deaa40d7eec0fac56d6f811a5c914cdb7b81bef215332b18218c4c7378970a5"));
/**
* Add an additional domain to the brand itself
*/
var addDomainToBrandFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	domain: string().min(1)
})).handler(createSsrRpc("d1f83a26036caceabe87a178cc6ef8a61ac6082d9d90cbaf295e43d974721656"));
/**
* Add a domain to an existing competitor
*/
var addDomainToCompetitorFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	competitorId: string(),
	domain: string().min(1)
})).handler(createSsrRpc("9e926b71ef1190d98bb8ae6a0af90161fe78fac56645b6244de93d3d86af1e32"));
/**
* Create a new competitor from a domain
*/
var createCompetitorFromDomainFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	name: string().min(1),
	domain: string().min(1)
})).handler(createSsrRpc("3dfb151282935d389d6e08d84e7f8d69da8519f21ddbf877568bc6c93fe47db9"));
//#endregion
export { createCompetitorFromDomainFn as a, updateBrandFn as c, createBrandInOrgFn as i, updateCompetitors as l, addDomainToCompetitorFn as n, getBrand as o, createBrandFn as r, getCompetitors as s, addDomainToBrandFn as t };

//# sourceMappingURL=brands-Djh0ZZPk.mjs.map