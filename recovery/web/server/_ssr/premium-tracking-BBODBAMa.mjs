import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/premium-tracking-BBODBAMa.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c41cebc5-d311-433a-a08e-76ac1b1bd8be", e._sentryDebugIdIdentifier = "sentry-dbid-c41cebc5-d311-433a-a08e-76ac1b1bd8be");
	} catch (e) {}
})();
/**
* The organization's premium allowance (cloud plans).
*
* A premium model called without web search is an ordinary platform pick that
* every standard plan may choose. Grounded, it is metered per prompt because the
* call costs roughly ten times an ungrounded one: the plan includes a pool of
* prompt/model slots and Pro/Business can buy more.
*
* Which prompts spend the pool is chosen in the prompts editor and saved with
* the rest of a prompt's fields, so this module only reports the totals the
* LLM settings page shows.
*/
var getPremiumPoolFn = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(createSsrRpc("d43803adc4ad123bfec8823e8190d091fd2df60e2e50125e7eb7deb260e03df4"));
//#endregion
export { getPremiumPoolFn as t };

//# sourceMappingURL=premium-tracking-BBODBAMa.mjs.map