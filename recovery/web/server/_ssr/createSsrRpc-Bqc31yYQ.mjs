import { i as TSS_SERVER_FUNCTION } from "./createServerFn-CnO8ob2E.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-CI5_1tn2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/createSsrRpc-Bqc31yYQ.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "e971da35-03ec-4d41-9500-eef4963435b3", e._sentryDebugIdIdentifier = "sentry-dbid-e971da35-03ec-4d41-9500-eef4963435b3");
	} catch (e) {}
})();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
export { createSsrRpc as t };

//# sourceMappingURL=createSsrRpc-Bqc31yYQ.mjs.map