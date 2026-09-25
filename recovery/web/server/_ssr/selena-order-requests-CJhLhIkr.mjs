import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-order-requests-CJhLhIkr.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7fff00d9-c39d-4aa4-9ea4-9a54b42a4c29", e._sentryDebugIdIdentifier = "sentry-dbid-7fff00d9-c39d-4aa4-9ea4-9a54b42a4c29");
	} catch (e) {}
})();
var createSchema = object({
	projectId: string().uuid(),
	planId: _enum(["visitor-local", "full-ai-landscape"]),
	contactName: string().trim().min(1).max(200),
	contactChannel: string().trim().min(3).max(300),
	comment: string().trim().max(2e3).optional(),
	promoCode: string().trim().max(100).optional()
});
/**
* A free request can start itself, under caps and behind a default-off flag.
*
* The scenarios it approves are the customer's own questions from their own
* confirmed profile, and the plan is free — so the operator gate here is not
* protecting a payment, it is only protecting against volume. That is what the
* caps are for. Anything that goes wrong leaves the request in the inbox as
* ordinary work: the lead is already saved before this runs, and no failure
* here is allowed to lose it.
*/
var createSelenaOrderRequestFn = createServerFn({ method: "POST" }).validator(createSchema).handler(createSsrRpc("fa41326a852a5d2d09763585cddbda034b50132cda9fcf6e9b0698b7c528f330"));
var listSelenaOrderRequestsFn = createServerFn({ method: "GET" }).handler(createSsrRpc("394661c8faa5d17f39b5dad0f04dce2f224272edcfbffd87041f034de108543b"));
var updateSelenaOrderRequestStatusFn = createServerFn({ method: "POST" }).validator(object({
	requestId: string().uuid(),
	status: _enum([
		"NEW",
		"IN_PROGRESS",
		"CLOSED"
	])
})).handler(createSsrRpc("389e1afacb538af654789d7a4eb4a80e1c8b281c33c4e745512b9d42fc3786a4"));
//#endregion
export { listSelenaOrderRequestsFn as n, updateSelenaOrderRequestStatusFn as r, createSelenaOrderRequestFn as t };

//# sourceMappingURL=selena-order-requests-CJhLhIkr.mjs.map