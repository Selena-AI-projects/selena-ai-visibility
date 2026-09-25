import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { n as cleanUrl } from "./onboarding-D7p0ZNRK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-CG5bFrq_.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "bb8c8014-3a78-490d-9918-2925e2e32fe6", e._sentryDebugIdIdentifier = "sentry-dbid-bb8c8014-3a78-490d-9918-2925e2e32fe6");
	} catch (e) {}
})();
/**
* Server functions for report operations.
* Replaces apps/web/src/app/api/reports/route.ts
*/
/**
* DS-P0-15: reports are scoped to the caller's organization. The session's
* active organization wins; without one, the user's first membership does —
* the same resolution the Selena auth context uses.
*/
/**
* Legacy rows (organization_id NULL) predate scoping and have no recoverable
* owner; they stay behind an explicit admin-only path, never the customer one.
*/
/**
* Get all reports
*/
var getReportsFn = createServerFn({ method: "GET" }).handler(createSsrRpc("380a1c66f4d0b8ba1bceb3fb7fa8734bb01819c4a70b3f9cfa333dc0a6563765"));
createServerFn({ method: "GET" }).handler(createSsrRpc("1053c4d7198ae4130e72397e46287cf930b56fc95ec5a94bc6e6e2dc749fb1aa"));
/**
* Get a single report by ID (includes rawOutput for rendering)
*/
var getReportByIdFn = createServerFn({ method: "GET" }).validator(object({ reportId: string() })).handler(createSsrRpc("24b6f752febe198fa42cec9ab22cff32478b02ba2102e9258f68fb5db5626108"));
/**
* Create a new report and queue generation job
*/
var createReportFn = createServerFn({ method: "POST" }).validator(object({
	brandName: string().min(1),
	brandWebsite: string().min(1).refine((website) => cleanUrl(website) !== "", "Enter a valid domain or http(s) website URL"),
	manualPrompts: string().optional()
})).handler(createSsrRpc("58a541b4103d51938841af7f67f87bec4271776f21a07941660043ee4d51887e"));
//#endregion
export { getReportByIdFn as n, getReportsFn as r, createReportFn as t };

//# sourceMappingURL=reports-CG5bFrq_.mjs.map