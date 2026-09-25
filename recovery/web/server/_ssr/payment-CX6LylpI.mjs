//#region node_modules/.nitro/vite/services/ssr/assets/payment-CX6LylpI.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "972cb0f0-f018-4cff-b113-6f6a217e1bd5", e._sentryDebugIdIdentifier = "sentry-dbid-972cb0f0-f018-4cff-b113-6f6a217e1bd5");
	} catch (e) {}
})();
function paymentConfigFromEnv(env) {
	return {
		mode: env.SELENA_PAYMENT_MODE === "live" ? "live" : "test",
		enabled: env.SELENA_PAYMENTS_ENABLED === "true"
	};
}
function assertPaymentAllowed(config, requestedMode) {
	if (!config.enabled) throw new Error("SELENA_PAYMENTS_DISABLED");
	if (config.mode !== requestedMode) throw new Error("SELENA_PAYMENT_MODE_MISMATCH");
	if (requestedMode === "live") throw new Error("SELENA_LIVE_PAYMENTS_REQUIRE_OWNER_GO");
}
//#endregion
export { paymentConfigFromEnv as n, assertPaymentAllowed as t };

//# sourceMappingURL=payment-CX6LylpI.mjs.map