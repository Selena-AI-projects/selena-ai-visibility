import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/opportunities-7Y9j_quW.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "adc87db6-0e56-4ca3-9782-7753c0a06ebe", e._sentryDebugIdIdentifier = "sentry-dbid-adc87db6-0e56-4ca3-9782-7753c0a06ebe");
	} catch (e) {}
})();
/**
* /app/$brand/opportunities — AI-generated opportunities.
*
* The page renders a structured opportunities report. We assemble a deterministic
* digest of the brand's tracked citation data (per-query standing vs the leading
* competitor over 7d + 30d, citation difficulty, where answers are sourced, and
* per-platform visibility) and make a single structured LLM completion (no web
* search) to turn it into categorized opportunities. The report is cached
* server-side and regenerated only when stale — see server/opportunities.ts.
*/
var $$splitComponentImporter = () => import("./opportunities-BrTKpPJV.mjs");
var Route = createFileRoute("/_authed/app/$brand/opportunities")({
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Opportunities", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "AI-generated opportunities to earn more AI citations."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=opportunities-7Y9j_quW.mjs.map