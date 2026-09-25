import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/citations-B-nJUfVX.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8300017d-20a6-4a99-80bc-efe283f1c883", e._sentryDebugIdIdentifier = "sentry-dbid-8300017d-20a6-4a99-80bc-efe283f1c883");
	} catch (e) {}
})();
/**
* /app/$brand/citations - Citations tracking page
*
* Shows citation statistics with filtering by model, tags, and lookback period.
*/
var $$splitComponentImporter = () => import("./citations-03lJrK2k.mjs");
var Route = createFileRoute("/_authed/app/$brand/citations")({
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Citations", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "See which sources LLMs cite in responses to your prompts."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=citations-B-nJUfVX.mjs.map