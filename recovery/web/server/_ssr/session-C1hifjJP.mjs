import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { n as getRequestHeaders } from "./server-44w5PK5b.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as auth } from "./server-CDtmD6L-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/session-C1hifjJP.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "64c8da23-7693-4d01-9b8c-539521b713ea", e._sentryDebugIdIdentifier = "sentry-dbid-64c8da23-7693-4d01-9b8c-539521b713ea");
	} catch (e) {}
})();
/**
* Better-auth session helpers for TanStack Start.
*
* Server functions that check the session on navigation and in route guards.
*/
var getSession_createServerFn_handler = createServerRpc({
	id: "897428c771b824425e52896c7aee422f8a17443227968997e9f2062b729b2956",
	name: "getSession",
	filename: "src/lib/auth/session.ts"
}, (opts) => getSession.__executeServer(opts));
var getSession = createServerFn({ method: "GET" }).handler(getSession_createServerFn_handler, async () => {
	const headers = getRequestHeaders();
	return await auth.api.getSession({ headers });
});
var ensureSession_createServerFn_handler = createServerRpc({
	id: "c50e344ce10e0aece758223c270bdde1c99b9955502f139b868033693ed9ceeb",
	name: "ensureSession",
	filename: "src/lib/auth/session.ts"
}, (opts) => ensureSession.__executeServer(opts));
var ensureSession = createServerFn({ method: "GET" }).handler(ensureSession_createServerFn_handler, async () => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session;
});
//#endregion
export { ensureSession_createServerFn_handler, getSession_createServerFn_handler };

//# sourceMappingURL=session-C1hifjJP.mjs.map