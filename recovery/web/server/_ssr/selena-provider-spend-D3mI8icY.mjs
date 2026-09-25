import { L as sql } from "../_libs/drizzle-orm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-provider-spend-D3mI8icY.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7e64bafa-5a1f-4684-ad79-0e36480b1954", e._sentryDebugIdIdentifier = "sentry-dbid-7e64bafa-5a1f-4684-ad79-0e36480b1954");
	} catch (e) {}
})();
var ProviderSpendRefused = class extends Error {
	constructor(receipt) {
		super(`PROVIDER_SPEND_${receipt.decision}`);
		this.receipt = receipt;
		this.name = "ProviderSpendRefused";
	}
};
function toNumber(value) {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}
function receiptFrom(row) {
	const raw = row ?? {};
	const cap = raw.capUsd;
	return {
		decision: String(raw.decision ?? "UNKNOWN_RESERVATION"),
		reservationId: typeof raw.reservationId === "string" ? raw.reservationId : void 0,
		status: typeof raw.status === "string" ? raw.status : void 0,
		capUsd: cap === null || cap === void 0 ? null : toNumber(cap),
		committedUsd: toNumber(raw.committedUsd),
		estimatedUsd: raw.estimatedUsd === void 0 ? void 0 : toNumber(raw.estimatedUsd),
		actualUsd: raw.actualUsd === void 0 ? void 0 : toNumber(raw.actualUsd)
	};
}
async function callSpendFunction(executor, statement, column) {
	return receiptFrom(((await executor.execute(statement)).rows?.[0])?.[column]);
}
/** Holds budget for one unit of work, or refuses. Never partially reserves. */
async function reserveProviderSpend(executor, request) {
	return callSpendFunction(executor, sql`SELECT public.sv_reserve_provider_spend(
			${request.scope}::text,
			${request.organizationId}::text,
			${request.requestKey}::text,
			${request.estimatedUsd}::numeric
		) AS receipt`, "receipt");
}
/**
* The same call, with a refusal raised instead of returned. Callers on a paid
* path want the work to stop, not to continue with a receipt they might forget
* to read.
*/
async function assertProviderSpendReserved(executor, request) {
	const receipt = await reserveProviderSpend(executor, request);
	if (receipt.decision === "RESERVED" || receipt.decision === "ALREADY_RESERVED") return receipt;
	throw new ProviderSpendRefused(receipt);
}
/** Gives an unspent reservation back after a call that never happened. */
async function releaseProviderSpend(executor, request) {
	return callSpendFunction(executor, sql`SELECT public.sv_release_provider_spend(
			${request.scope}::text,
			${request.organizationId}::text,
			${request.requestKey}::text
		) AS receipt`, "receipt");
}
var LOCAL_MAPS_SPEND_SCOPE = "local-maps";
//#endregion
export { assertProviderSpendReserved as n, releaseProviderSpend as r, LOCAL_MAPS_SPEND_SCOPE as t };

//# sourceMappingURL=selena-provider-spend-D3mI8icY.mjs.map