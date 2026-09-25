import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/query-fan-out-CAZvnVzA.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ae03609d-a6e0-4e13-8e1e-6381ca09e79a", e._sentryDebugIdIdentifier = "sentry-dbid-ae03609d-a6e0-4e13-8e1e-6381ca09e79a");
	} catch (e) {}
})();
/**
* /app/$brand/query-fan-out - Query Fan-Out
*
* "What are the answer engines really searching for?" When an engine answers a
* tracked prompt it may run several web searches first. KPIs summarize how much
* prompts expand, then three tabs: Prompt Fan-Out (each prompt's searches, with
* its keywords bolded), Query Words (the cloud + which words engines add/drop/keep),
* and Query Visibility (searches you're missing vs win).
*
* Read-only from `prompt_runs.web_queries`; engines that don't expose their
* searches contribute runs but no queries. See `server/query-fanout.ts` and
* `lib/fanout-analysis.ts`.
*/
var $$splitComponentImporter = () => import("./query-fan-out-BCnKkw6v.mjs");
/** The active tab lives in `?tab=` so each tab is directly linkable. */
var FANOUT_TABS = [
	"fanout",
	"top-queries",
	"words"
];
var Route = createFileRoute("/_authed/app/$brand/query-fan-out")({
	validateSearch: (search) => ({ tab: FANOUT_TABS.includes(search.tab) ? search.tab : void 0 }),
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Query Fan-Out", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "See the web searches AI engines run when answering your prompts, and how they rewrite your wording."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=query-fan-out-CAZvnVzA.mjs.map