import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, i as isAdmin, r as hasReportAccess } from "./helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-Cur7izv-.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "4526feab-b4dd-4cc7-b476-6366961cd1b6", e._sentryDebugIdIdentifier = "sentry-dbid-4526feab-b4dd-4cc7-b476-6366961cd1b6");
	} catch (e) {}
})();
/**
* /reports - Reports list page
*
* Requires admin OR report generator access.
* Replicates: apps/web/src/app/reports/page.tsx + reports-content.tsx
*/
var checkReportAccess_createServerFn_handler = createServerRpc({
	id: "6f40e56bdf7da40863bd5ba6f61821c7fededfedff95271a911b352f996d781d",
	name: "checkReportAccess",
	filename: "src/routes/_authed/reports/index.tsx"
}, (opts) => checkReportAccess.__executeServer(opts));
var checkReportAccess = createServerFn({ method: "GET" }).handler(checkReportAccess_createServerFn_handler, async () => {
	const session = await requireAuthSession();
	const admin = isAdmin(session);
	const reportAccess = hasReportAccess(session);
	return {
		hasAccess: admin || reportAccess,
		isAdmin: admin,
		hasReportAccess: reportAccess
	};
});
//#endregion
export { checkReportAccess_createServerFn_handler };

//# sourceMappingURL=reports-Cur7izv-.mjs.map