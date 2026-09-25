import { f as extractDomain } from "./domain-categories-IivSiXtp.mjs";
import { L as sql } from "../_libs/drizzle-orm.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as cleanUrl } from "./onboarding-D7p0ZNRK.mjs";
import { r as getBoss } from "./boss-client-DOgR2WZg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/analyze-brand-job-1M9hMG7P.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "4673602a-fe8d-47bc-937c-82e904034ac5", e._sentryDebugIdIdentifier = "sentry-dbid-4673602a-fe8d-47bc-937c-82e904034ac5");
	} catch (e) {}
})();
/**
* Server-only helpers for the async brand-analysis job.
*
* All pg-boss coupling for the onboarding analysis lives here so the server
* functions that use it stay thin (and free of direct db imports). The web app
* enqueues the work and then polls the job's result *by request key* — the id
* of whatever the analysis was started for (an Elmo brand, a Selena project).
* Callers prove access to that record first, so a job's output never reaches
* someone outside the org that asked for it.
*
* Reading the result goes straight at pg-boss's `pgboss.job` table rather than
* `getJobById`, because the client polls by brand (not by an opaque job id it
* has to round-trip). The columns used here (`name`, `data`, `state`,
* `output`, `created_on`) are stable across the pinned pg-boss v12 line.
*/
var ANALYZE_BRAND_QUEUE = "analyze-brand";
/**
* Shown to the user when a job ends in a failed/cancelled state. The real
* error (provider messages, stack traces) is already captured server-side by
* the worker's Sentry wrapper; we never forward it to the browser.
*/
var GENERIC_FAILURE = "Brand analysis failed. Please try again.";
/** The namespaced value actually stored in and queried from the job payload. */
function namespacedKey(product, requestKey) {
	return `${product}:${requestKey}`;
}
/** The most recent analyze-brand job for a request key, regardless of state. */
async function latestJob(namespaced) {
	return (await db.execute(sql`
		SELECT id, state, data, output
		FROM pgboss.job
		WHERE name = ${ANALYZE_BRAND_QUEUE} AND data->>'requestKey' = ${namespaced}
		ORDER BY created_on DESC
		LIMIT 1
	`)).rows[0];
}
var IN_FLIGHT_STATES = /* @__PURE__ */ new Set([
	"created",
	"active",
	"retry"
]);
/**
* The page an enqueued job will actually read. Two runs are "the same" only if
* they research the same URL — `nike.com/golf` and `nike.com/running` share a
* domain but produce completely different suggestions.
*/
function analysisKey(website) {
	return cleanUrl(website) || extractDomain(website);
}
/**
* Enqueue a brand analysis, deduped by the request key + page it runs for.
*
* If an analysis for this page is already in flight we reuse it instead of
* paying for a second run; once a job reaches a terminal state a fresh analysis
* is allowed again (so "try again" works).
*
* We guard with an explicit in-flight check rather than pg-boss's `singletonKey`
* because that would be a no-op here: `singleton_key` only enforces uniqueness
* under a non-standard queue policy (short/singleton/stately) or with a
* `singletonSeconds` window, and this queue uses the default `standard` policy
* with no window. The check-then-send isn't atomic, but the analyze button is a
* deliberate, low-frequency action (and disabled while running), so the worst
* case — two near-simultaneous clicks racing past the check — is rare and
* merely costs a duplicate run.
*/
async function enqueueAnalyzeBrand(input) {
	const boss = await getBoss();
	const pageKey = analysisKey(input.website);
	const latest = await latestJob(namespacedKey(input.product, input.requestKey));
	if (latest && IN_FLIGHT_STATES.has(latest.state) && analysisKey(latest.data?.website ?? "") === pageKey) return;
	await boss.send(ANALYZE_BRAND_QUEUE, {
		...input,
		requestKey: namespacedKey(input.product, input.requestKey)
	});
}
/** Poll the status/result of the latest brand-analysis job for a request key. */
async function getAnalyzeBrandStatus(product, requestKey) {
	const job = await latestJob(namespacedKey(product, requestKey));
	if (!job) return { status: "pending" };
	if (job.state === "completed") return {
		status: "done",
		suggestion: job.output
	};
	if (job.state === "failed" || job.state === "cancelled") {
		console.error("[analyze-brand] job ended without a result", {
			product,
			requestKey,
			jobId: job.id,
			state: job.state
		});
		return {
			status: "failed",
			error: GENERIC_FAILURE
		};
	}
	return { status: "pending" };
}
/**
* Best-effort cancel of an in-flight analysis. Used when the user backs out so
* the worker doesn't keep grinding on a result nobody is waiting for.
*/
async function cancelAnalyzeBrand(product, requestKey) {
	const job = await latestJob(namespacedKey(product, requestKey));
	if (!job || !IN_FLIGHT_STATES.has(job.state)) return;
	const boss = await getBoss();
	try {
		await boss.cancel(ANALYZE_BRAND_QUEUE, job.id);
	} catch {}
}
//#endregion
export { enqueueAnalyzeBrand as n, getAnalyzeBrandStatus as r, cancelAnalyzeBrand as t };

//# sourceMappingURL=analyze-brand-job-1M9hMG7P.mjs.map