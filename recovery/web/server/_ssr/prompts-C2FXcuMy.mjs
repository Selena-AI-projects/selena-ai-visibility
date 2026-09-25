import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { D as number, M as string, O as object, f as array, p as boolean } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prompts-C2FXcuMy.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7ac78fcf-078c-41cf-9b61-17c8fbde70c2", e._sentryDebugIdIdentifier = "sentry-dbid-7ac78fcf-078c-41cf-9b61-17c8fbde70c2");
	} catch (e) {}
})();
/**
* Server functions for prompt operations.
* Replaces apps/web/src/app/api/prompts/* and brands/[id]/prompts-summary API routes.
*/
/**
* Get metadata for a single prompt
*/
var getPromptMetadataFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	promptId: string()
})).handler(createSsrRpc("eb27ffe4b4de414af48ab281cd6f50b7085b81e9f2f8272b3361f33396153961"));
/**
* Get prompts summary for a brand (visibility scores, tags, etc.)
*/
var getPromptsSummaryFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: string().optional().default("1m"),
	webSearchEnabled: string().optional(),
	model: string().optional(),
	tags: string().optional()
})).handler(createSsrRpc("fa6e609692c85ea891db536dfa72149c08c748166ef79f1eb571f985da9ea8c0"));
/**
* Mirrors the brand-wide citations view (server/citations.ts) at the single-
* prompt level: classify each citation at the URL level, pull Google AI Mode
* search/shopping surfaces OUT of the source mix into a dedicated Google
* Shopping module, and rebuild the domain distribution from the URL data.
* Undefined when the prompt has nothing citable.
*/
/**
* Get stats for a single prompt (mentions, web queries, citations)
* Replicates: apps/web/src/app/api/prompts/[promptId]/stats/route.ts
*/
var getPromptStatsFn = createServerFn({ method: "GET" }).validator(object({
	promptId: string(),
	days: number().optional().default(7)
})).handler(createSsrRpc("b65bdf31fb31f12f54a157023d14b5d6a5fc59f44ab1f25044f5e8f26e96a710"));
/**
* Get paginated prompt runs
*/
var getPromptRunsFn = createServerFn({ method: "GET" }).validator(object({
	promptId: string(),
	page: number().optional().default(1),
	limit: number().optional().default(10),
	days: number().optional().default(7)
})).handler(createSsrRpc("12cbd6724c83b38a68c9acb94079d53b83627e6ed2f48407b1d9ba03620fff32"));
/**
* Update prompts for a brand (add/edit/delete)
*/
var updatePromptsFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	prompts: array(object({
		id: string().optional(),
		value: string(),
		enabled: boolean().optional().default(true),
		tags: array(string()).optional(),
		/**
		* Premium models to track this prompt on, grounded — one of the org's
		* premium slots each.
		*/
		premiumModels: array(string()).optional()
	})).max(100, `A brand may have at most 100 prompts.`)
})).handler(createSsrRpc("53ae09ac8d1d9a67a01be5be1349ab3df499551d890c4334b6c8c2611f9ff1f3"));
createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	promptId: string(),
	lookback: string().optional().default("1m"),
	webSearchEnabled: string().optional(),
	model: string().optional(),
	timezone: string().optional()
})).handler(createSsrRpc("73d3175079a6ba9be1ddd1c910a09be618e50c8506a531cfc78cf61bf7f373a9"));
var getPromptWebQueryFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	promptId: string(),
	lookback: string().optional().default("1m"),
	model: string().optional(),
	timezone: string().optional()
})).handler(createSsrRpc("21ee4b48e5c1740375c92929be82d877e8d55a96aa2d90c0eaf3a28e1b9a52b7"));
//#endregion
export { getPromptsSummaryFn as a, getPromptWebQueryFn as i, getPromptRunsFn as n, updatePromptsFn as o, getPromptStatsFn as r, getPromptMetadataFn as t };

//# sourceMappingURL=prompts-C2FXcuMy.mjs.map