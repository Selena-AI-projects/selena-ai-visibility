import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/share-of-voice-B8DwSWge.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "e27b939e-6a5a-4aca-887d-9aa893f33718", e._sentryDebugIdIdentifier = "sentry-dbid-e27b939e-6a5a-4aca-887d-9aa893f33718");
	} catch (e) {}
})();
/**
* /app/$brand/share-of-voice - Share of Voice
*
* "Who do the AI engines mention instead of you?" A leaderboard of competitor
* mention rates next to the brand's own, with the brand's overall share, a
* donut of top competitors, and share of voice over time.
*/
var $$splitComponentImporter = () => import("./share-of-voice-D5P--p0U.mjs");
var Route = createFileRoute("/_authed/app/$brand/share-of-voice")({
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Share of Voice", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "See how often AI engines mention you versus your competitors."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=share-of-voice-B8DwSWge.mjs.map