import { I as expectedRunsFromScope } from "./src-BdeAuGX5.mjs";
import { c as selectEnqueueablePermits } from "./selena-visibility-repositories-DjKDsg4F.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-run-enqueue-BbOx1Wk2.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "e56b10aa-6a3c-478b-b567-aac7c27a1e9f", e._sentryDebugIdIdentifier = "sentry-dbid-e56b10aa-6a3c-478b-b567-aac7c27a1e9f");
	} catch (e) {}
})();
/** The only order status an approval may start from. */
var PREFLIGHT_REQUIRED_ORDER_STATUS = "PAID_REVIEW_REQUIRED";
function normalizeCurrency(value) {
	const currency = (value ?? "").trim().toUpperCase();
	return currency.length === 3 ? currency : "USD";
}
/** A cost we cannot read as a non-negative finite number is not a cost we may clear. */
function readableCost(value) {
	return Number.isFinite(value) && value >= 0 ? value : NaN;
}
function evaluatePreflight(facts) {
	const scopedRuns = facts.scope ? expectedRunsFromScope(facts.scope) : 0;
	const worstCase = readableCost(facts.worstCaseCost);
	const withinCap = (cap) => Number.isFinite(worstCase) && Number.isFinite(cap) && worstCase <= cap;
	const checks = [
		{
			code: "ORDER_STATUS_PAID_REVIEW_REQUIRED",
			ok: facts.orderStatus === PREFLIGHT_REQUIRED_ORDER_STATUS,
			details: {
				status: facts.orderStatus,
				required: PREFLIGHT_REQUIRED_ORDER_STATUS
			}
		},
		{
			code: "LOCK_PRESENT",
			ok: facts.lockPresent,
			details: {}
		},
		{
			code: "LOCK_SCOPE_PRESENT",
			ok: facts.scope !== null,
			details: {}
		},
		{
			code: "EXPECTED_RUNS_MATCH",
			ok: facts.scope !== null && scopedRuns === facts.lockExpectedRuns,
			details: {
				scopeExpectedRuns: scopedRuns,
				lockExpectedRuns: facts.lockExpectedRuns
			}
		},
		{
			code: "NO_ACTIVE_PERMITS",
			ok: facts.activePermits === 0,
			details: { activePermits: facts.activePermits }
		},
		{
			code: "NO_ACTIVE_JOBS",
			ok: facts.activeJobs === 0,
			details: { activeJobs: facts.activeJobs }
		},
		{
			code: "MAINTENANCE_IDLE",
			ok: !facts.maintenanceActive,
			details: { maintenanceActive: facts.maintenanceActive }
		},
		{
			code: "WITHIN_ORDER_CAP",
			ok: withinCap(facts.orderCap),
			details: {
				worstCaseCost: facts.worstCaseCost,
				orderCap: facts.orderCap
			}
		},
		{
			code: "WITHIN_PROVIDER_BUDGET",
			ok: withinCap(facts.providerBudgetRemaining),
			details: {
				worstCaseCost: facts.worstCaseCost,
				providerBudgetRemaining: facts.providerBudgetRemaining
			}
		},
		{
			code: "PAYMENT_RECORDED",
			ok: facts.paymentRecorded,
			details: {}
		}
	];
	return {
		orderId: facts.orderId,
		ok: checks.every((check) => check.ok),
		checks,
		expectedRuns: scopedRuns,
		worstCaseCost: {
			amount: Number.isFinite(worstCase) ? worstCase : 0,
			currency: normalizeCurrency(facts.currency),
			basis: "estimated"
		},
		blockers: checks.filter((check) => !check.ok).map((check) => check.code)
	};
}
function preflightBlockers(result) {
	return result.checks.filter((check) => !check.ok).map((check) => check.code);
}
/**
* The approval decision itself, so no caller can approve an order past a
* blocker by forgetting to read `ok`.
*/
function assertApprovable(result) {
	if (result.ok) return;
	throw new Error(`SELENA_PREFLIGHT_BLOCKED: ${preflightBlockers(result).join(", ")}`);
}
async function enqueueOrderRuns(input) {
	if (!input.config.enabled) return {
		enqueued: 0,
		skipped: input.permits.length,
		duplicates: 0,
		reason: "SELENA_MEASUREMENT_DISABLED"
	};
	const enqueueable = selectEnqueueablePermits(input.permits, input.now);
	let enqueued = 0;
	for (const permit of enqueueable) if (await input.send({
		permitId: permit.id,
		organizationId: input.organizationId,
		actorId: input.actorId
	}, { singletonKey: permit.dispatchKey })) enqueued += 1;
	return {
		enqueued,
		skipped: input.permits.length - enqueueable.length,
		duplicates: enqueueable.length - enqueued,
		reason: null
	};
}
//#endregion
export { enqueueOrderRuns as n, evaluatePreflight as r, assertApprovable as t };

//# sourceMappingURL=selena-run-enqueue-BbOx1Wk2.mjs.map