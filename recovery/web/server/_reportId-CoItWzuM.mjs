import { c as createServerFn } from "./_ssr/createServerFn-CnO8ob2E.mjs";
import { t as createServerRpc } from "./_ssr/createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, r as hasReportAccess } from "./_ssr/helpers-phr0Aqka.mjs";
import { n as getReportByIdFn } from "./_ssr/reports-CG5bFrq_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_reportId-CoItWzuM.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0b89f313-0ce6-4657-905b-537df3a817e9", e._sentryDebugIdIdentifier = "sentry-dbid-0b89f313-0ce6-4657-905b-537df3a817e9");
	} catch (e) {}
})();
/**
* /reports/render/$reportId - Standalone report rendering page
*
* Production-quality printable report (US Letter 8.5 x 11 in).
* Uses Share of Voice as the primary metric with rich competitive analysis.
*/
var loadReportData_createServerFn_handler = createServerRpc({
	id: "d359f83d1e5180badd13f192496370264fd402c556b4fca2035cccb78ee872cb",
	name: "loadReportData",
	filename: "src/routes/_authed/reports/render/$reportId.tsx"
}, (opts) => loadReportData.__executeServer(opts));
var loadReportData = createServerFn({ method: "GET" }).validator((d) => d).handler(loadReportData_createServerFn_handler, async ({ data: reportId }) => {
	const session = await requireAuthSession();
	if (!hasReportAccess(session)) throw new Error("Not authorized");
	return getReportByIdFn({ data: { reportId } });
});
//#endregion
export { loadReportData_createServerFn_handler };

//# sourceMappingURL=_reportId-CoItWzuM.mjs.map