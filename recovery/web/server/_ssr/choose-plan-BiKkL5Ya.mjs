import { C as redirect, d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { n as getAppName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
import { n as getPaywallStateFn } from "./billing-44PVeuc9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/choose-plan-BiKkL5Ya.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "52c7deba-1900-474a-a93c-45460194ae48", e._sentryDebugIdIdentifier = "sentry-dbid-52c7deba-1900-474a-a93c-45460194ae48");
	} catch (e) {}
})();
/**
* /choose-plan — checkout-first cloud onboarding.
*
* An authenticated org with no active subscription lands here (redirected from
* the app routes) and can't reach anything else until Stripe Checkout
* completes. The plan catalog renders straight from packages/config/plans —
* pricing changes never touch this file. After Checkout returns
* (?status=success) the page polls until the webhook lands, then enters the
* app.
*/
var $$splitComponentImporter = () => import("./choose-plan-d4UyTm3l.mjs");
var searchSchema = object({
	status: _enum(["success"]).optional(),
	/**
	* Which workspace is being subscribed. Carried by whichever gate redirected
	* here so checkout bills the workspace the user was actually blocked on,
	* not whichever of their memberships happens to be oldest.
	*/
	org: string().optional()
});
var Route = createFileRoute("/_authed/choose-plan")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		status: search.status,
		org: search.org
	}),
	loader: async ({ deps }) => {
		const paywall = await getPaywallStateFn({ data: { organizationId: deps.org } });
		if (!paywall.needsPlan && deps.status !== "success") throw redirect({ to: "/app" });
		return paywall;
	},
	head: ({ match }) => ({ meta: [{ title: buildTitle("Choose a plan", { appName: getAppName(match) }) }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=choose-plan-BiKkL5Ya.mjs.map