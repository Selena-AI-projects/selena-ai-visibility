import { i as TSS_SERVER_FUNCTION } from "./createServerFn-CnO8ob2E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/createServerRpc-CV4epehf.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8676e220-2bee-41f1-9a95-86b0f6e0c4cd", e._sentryDebugIdIdentifier = "sentry-dbid-8676e220-2bee-41f1-9a95-86b0f6e0c4cd");
	} catch (e) {}
})();
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
export { createServerRpc as t };

//# sourceMappingURL=createServerRpc-CV4epehf.mjs.map