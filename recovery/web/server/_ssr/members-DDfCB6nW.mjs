import { C as redirect, d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
import { a as listTeamFn } from "./team-BEREAu2S.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/members-DDfCB6nW.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "9d8313fa-b953-416f-9af2-604c7bd9fdf6", e._sentryDebugIdIdentifier = "sentry-dbid-9d8313fa-b953-416f-9af2-604c7bd9fdf6");
	} catch (e) {}
})();
/**
* /app/$brand/settings/members - Team settings page (cloud only)
*
* Invite teammates by email, list current members, and manage pending
* invitations. The redirect in the loader is UX only — the security
* boundary is the teamInvites guard inside every team server function.
*/
var $$splitComponentImporter = () => import("./members-Df8wbUYv.mjs");
var Route = createFileRoute("/_authed/app/$brand/settings/members")({
	loader: async ({ params, context }) => {
		if (!context.clientConfig?.features.teamInvites) throw redirect({
			to: "/app/$brand",
			params: { brand: params.brand }
		});
		return listTeamFn({ data: { brandId: params.brand } });
	},
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("Team", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "Invite teammates and manage team members."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=members-DDfCB6nW.mjs.map