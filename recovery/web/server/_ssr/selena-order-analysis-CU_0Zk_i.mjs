import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-order-analysis-CU_0Zk_i.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0d599316-5125-4857-8566-6a01f92a30f9", e._sentryDebugIdIdentifier = "sentry-dbid-0d599316-5125-4857-8566-6a01f92a30f9");
	} catch (e) {}
})();
function readRetainedAnswer(payload) {
	if (typeof payload !== "object" || payload === null) return null;
	const answer = payload.answer;
	if (typeof answer !== "object" || answer === null) return null;
	const record = answer;
	const text = typeof record.text === "string" ? record.text : "";
	if (text.trim() === "") return null;
	const citedUrls = Array.isArray(record.citedUrls) ? record.citedUrls.filter((url) => typeof url === "string") : void 0;
	return citedUrls ? {
		text,
		citedUrls
	} : { text };
}
function readStoredAnalysis(payload) {
	if (typeof payload !== "object" || payload === null) return null;
	const analysis = payload.analysis;
	if (typeof analysis !== "object" || analysis === null) return null;
	const record = analysis;
	if (typeof record.brandMentioned !== "boolean" || !Array.isArray(record.mentions)) return null;
	return record;
}
var analyzeSelenaOrderFn = createServerFn({ method: "POST" }).validator(object({ orderId: string().uuid() })).handler(createSsrRpc("d66696319991447da1b2b07651555c833ca705e755d0e6fc88c993e7bb3e23f2"));
//#endregion
export { readRetainedAnswer as n, readStoredAnalysis as r, analyzeSelenaOrderFn as t };

//# sourceMappingURL=selena-order-analysis-CU_0Zk_i.mjs.map