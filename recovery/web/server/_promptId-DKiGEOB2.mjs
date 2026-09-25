import { d as lazyRouteComponent, f as createFileRoute } from "./_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./_ssr/route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_promptId-DKiGEOB2.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c88717f1-62bd-4e85-9ff2-5788f8b15e7a", e._sentryDebugIdIdentifier = "sentry-dbid-c88717f1-62bd-4e85-9ff2-5788f8b15e7a");
	} catch (e) {}
})();
/**
* /app/$brand/prompts/$promptId - Prompt detail page
*
* Shows prompt details with tabs: Mentions, Web Queries, Citations, LLM Responses.
*/
var $$splitComponentImporter = () => import("./_promptId-PldWWorh.mjs");
var TAB_KEYS = [
	"mentions",
	"web-queries",
	"citations",
	"responses"
];
var Route = createFileRoute("/_authed/app/$brand/prompts/$promptId")({
	validateSearch: (search) => ({ tab: TAB_KEYS.includes(search.tab) ? search.tab : void 0 }),
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Prompt Details", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "Detailed analysis of a tracked prompt's performance."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=_promptId-DKiGEOB2.mjs.map