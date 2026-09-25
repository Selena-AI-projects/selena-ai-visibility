import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/competitors-CBFTQaxN.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "4092af69-a947-4e32-889e-acbcf761ad80", e._sentryDebugIdIdentifier = "sentry-dbid-4092af69-a947-4e32-889e-acbcf761ad80");
	} catch (e) {}
})();
/**
* /app/$brand/settings/competitors - Competitor management page
*
* Form to manage competitor list with multiple domains and aliases per competitor.
*/
var $$splitComponentImporter = () => import("./competitors-C8L4Rnow.mjs");
var Route = createFileRoute("/_authed/app/$brand/settings/competitors")({
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Competitors", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "Manage your tracked competitors."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=competitors-CBFTQaxN.mjs.map