import { C as redirect, d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/new-Car03DFM.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "96a62f61-af72-45d7-8d09-28324b119734", e._sentryDebugIdIdentifier = "sentry-dbid-96a62f61-af72-45d7-8d09-28324b119734");
	} catch (e) {}
})();
/**
* /app/new - Create a new brand.
*
* Attaches a new brand to one of the current user's organizations and seeds
* the brand row with the supplied name + website. Gated by the
* canCreateBrands deployment feature (local, cloud) at both the loader
* (redirect to /app) and the server function.
*
* Where the plan meters platforms, a second step asks which ones to track:
* this is the flow every cloud brand goes through, so accepting the defaults
* silently would mean a brand's first cycle runs on platforms nobody chose.
*
* A workspace that has spent its plan's brands is told so here, before anything
* is filled in — the write guard would otherwise reject the finished form, and
* a limit is not something to discover at the end of a wizard.
*/
var $$splitComponentImporter = () => import("./new-DiPT3eOY.mjs");
/** The oldest brand of each org, which is as good a billing entry point as any. */
var getNewBrandOptions = createServerFn({ method: "GET" }).handler(createSsrRpc("78471b42f56dbdbaba1f0f7480ce035f1e939c055e0495b7dd56c658064e871d"));
var Route = createFileRoute("/_authed/app/new")({
	loader: async () => {
		const { canCreateBrands, organizations } = await getNewBrandOptions();
		if (!canCreateBrands) throw redirect({ to: "/app" });
		return { organizations };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=new-Car03DFM.mjs.map