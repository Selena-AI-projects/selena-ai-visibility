import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, i as isAdmin, r as hasReportAccess } from "./helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-BBq7wJgF.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "1747d1d7-3d80-44dc-9f89-f21125a4dd43", e._sentryDebugIdIdentifier = "sentry-dbid-1747d1d7-3d80-44dc-9f89-f21125a4dd43");
	} catch (e) {}
})();
/**
* /admin layout - Admin section with access control
*
* Checks admin status; returns 404 if not admin.
* Wraps admin routes with admin-specific sidebar.
*/
var checkAdminAccess_createServerFn_handler = createServerRpc({
	id: "f2a5a79fac093130af3166cfd709c78d4188ffa14c793b8c7c7ed00d739fa4b9",
	name: "checkAdminAccess",
	filename: "src/routes/_authed/admin.tsx"
}, (opts) => checkAdminAccess.__executeServer(opts));
var checkAdminAccess = createServerFn({ method: "GET" }).handler(checkAdminAccess_createServerFn_handler, async () => {
	const session = await requireAuthSession();
	return {
		isAdmin: isAdmin(session),
		hasReportAccess: hasReportAccess(session)
	};
});
//#endregion
export { checkAdminAccess_createServerFn_handler };

//# sourceMappingURL=admin-BBq7wJgF.mjs.map