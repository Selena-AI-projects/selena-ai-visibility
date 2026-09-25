import { d as lazyRouteComponent, f as createFileRoute } from "./_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./_ssr/route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_brand-C0lEOMzo.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "3ffad3f1-c37c-42db-9f4e-f1108795ccf2", e._sentryDebugIdIdentifier = "sentry-dbid-3ffad3f1-c37c-42db-9f4e-f1108795ccf2");
	} catch (e) {}
})();
/**
* /app/$brand - Dashboard overview page
*
* Shows visibility charts, citation trends, and stats.
* Displays onboarding wizard if brand is not yet onboarded.
*/
var $$splitComponentImporter = () => import("./_brand-K7h7s0ai.mjs");
/** Most recent non-null value in a daily series — matches the right end of the trend line. */
var Route = createFileRoute("/_authed/app/$brand/")({
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Overview", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "Dashboard overview of AI visibility and citations."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=_brand-C0lEOMzo.mjs.map