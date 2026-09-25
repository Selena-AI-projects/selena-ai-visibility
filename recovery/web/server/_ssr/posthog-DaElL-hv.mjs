import { t as Yl } from "../_libs/posthog-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/posthog-DaElL-hv.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "a6f8a153-eeac-48e7-b713-b007c390bf52", e._sentryDebugIdIdentifier = "sentry-dbid-a6f8a153-eeac-48e7-b713-b007c390bf52");
	} catch (e) {}
})();
var POSTHOG_HOST = "https://var.elmohq.com";
var initialized = false;
function initPostHog(apiKey) {
	if (initialized || typeof window === "undefined") return;
	Yl.init(apiKey, {
		api_host: POSTHOG_HOST,
		capture_pageview: true,
		capture_pageleave: true,
		autocapture: true,
		disable_session_recording: true
	});
	Yl.register({ app_version: "0.2.19" });
	initialized = true;
}
function identifyUser(userId, properties) {
	if (!initialized) return;
	Yl.identify(userId, properties);
}
function trackEvent(eventName, properties) {
	if (!initialized) return;
	Yl.capture(eventName, properties);
}
function setPersonProperties(properties) {
	if (!initialized) return;
	Yl.people.set(properties);
}
function resetPostHog() {
	if (!initialized) return;
	Yl.reset();
}
//#endregion
export { trackEvent as a, setPersonProperties as i, initPostHog as n, resetPostHog as r, identifyUser as t };

//# sourceMappingURL=posthog-DaElL-hv.mjs.map