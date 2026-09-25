import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { D as number, M as string, O as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-BGFhkJzE.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "6b29b099-0a7c-4e96-b9b9-02b25a0b33dd", e._sentryDebugIdIdentifier = "sentry-dbid-6b29b099-0a7c-4e96-b9b9-02b25a0b33dd");
	} catch (e) {}
})();
/**
* Server functions for admin operations.
* Replaces apps/web/src/app/api/admin/* API routes.
*/
/**
* Get admin dashboard statistics (all brands, run counts, time series charts).
*/
var getAdminStatsFn = createServerFn({ method: "GET" }).handler(createSsrRpc("4bab7bbbbf7131ce6f78773267513422f555b080a628c87eafb31c5810cb45a3"));
/**
* Update delay override for a brand.
*/
var updateDelayOverrideFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	delayOverrideHours: number().nullable()
})).handler(createSsrRpc("25efd150d1d206063f2d1c1e8fdfb4d258a3c09acfef2fe34766a238422b6f75"));
/**
* Provider-agnostic brand analysis. Returns brand info, competitors, and
* suggested prompts in a single LLM round-trip — same pipeline that the
* onboarding wizard and `POST /api/v1/tools/analyze` use.
*/
var adminAnalyzeBrandFn = createServerFn({ method: "POST" }).validator(object({
	website: string().min(1),
	brandName: string().optional(),
	maxCompetitors: number().int().min(0).optional(),
	maxPrompts: number().int().min(0).optional()
})).handler(createSsrRpc("c38cb334c7d5256406f0bd2f362a7ca8a891a7a03ff7e6c8b66b85b8a790cb8c"));
/**
* Every prompt's run plan, resolved the way the worker resolves it: pool
* positions across the whole org, run plans per brand. A brand whose
* configuration no longer resolves (a pick whose target left SCRAPE_TARGETS)
* is skipped rather than taking the whole dashboard down.
*/
/** The chain's cadence: its fastest target. Zero when nothing is planned. */
/** The union of every target the brand's prompts run, in first-seen order. */
/**
* Get full workflow data: queue stats, recent jobs, brand schedule summaries.
*/
var getWorkflowDataFn = createServerFn({ method: "GET" }).handler(createSsrRpc("7311ffc67b0bc01f0d72e6076ff4a9ca2ecd2f9eeb9e7afe7c138d6c41f38b6b"));
/**
* Retry a prompt job (send immediate job for a prompt).
*/
var retryJobFn = createServerFn({ method: "POST" }).validator(object({
	promptId: string().optional(),
	jobId: string().optional()
})).handler(createSsrRpc("bef8e253dcb39f0d4981edf7846f94632d7bd0e32e2b63aa64a4d0a775d1a9d2"));
/**
* Get logs for a specific job.
*/
var getJobLogsFn = createServerFn({ method: "GET" }).validator(object({ jobId: string() })).handler(createSsrRpc("246d3f900412fe1361b59e238c5718cc024716aa20d124b5153b966cdda49bd8"));
//#endregion
export { retryJobFn as a, getWorkflowDataFn as i, getAdminStatsFn as n, updateDelayOverrideFn as o, getJobLogsFn as r, adminAnalyzeBrandFn as t };

//# sourceMappingURL=admin-BGFhkJzE.mjs.map