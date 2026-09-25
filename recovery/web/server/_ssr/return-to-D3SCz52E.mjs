//#region node_modules/.nitro/vite/services/ssr/assets/return-to-D3SCz52E.js
/** Reject cross-origin returnTo values to prevent open redirects. */
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0f0f341c-5be7-4c6e-b628-fdcb1208506e", e._sentryDebugIdIdentifier = "sentry-dbid-0f0f341c-5be7-4c6e-b628-fdcb1208506e");
	} catch (e) {}
})();
function safeReturnTo(returnTo) {
	if (!returnTo) return "/app/selena";
	if (returnTo.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
	try {
		const url = new URL(returnTo, window.location.origin);
		if (url.origin !== window.location.origin) return "/app/selena";
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return "/app/selena";
	}
}
//#endregion
export { safeReturnTo as t };

//# sourceMappingURL=return-to-D3SCz52E.mjs.map