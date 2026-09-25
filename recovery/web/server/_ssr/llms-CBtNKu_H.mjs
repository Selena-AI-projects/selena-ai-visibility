import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as getAppName, r as getBrandName, t as buildTitle } from "./route-head-BwwsuPJZ.mjs";
import { t as getModelPickerStateFn } from "./platform-picks-CbYihqfx.mjs";
import { t as getPremiumPoolFn } from "./premium-tracking-BBODBAMa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/llms-CBtNKu_H.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "46652291-a999-46f5-ba26-8ae25a7c9b52", e._sentryDebugIdIdentifier = "sentry-dbid-46652291-a999-46f5-ba26-8ae25a7c9b52");
	} catch (e) {}
})();
/**
* /app/$brand/settings/llms - LLM configuration page
*
* Which platforms a brand is tracked against, grouped by what each group tells
* you: a scraped engine shows what a visitor sees, an ungrounded API call shows
* what a model already believes, and a grounded one shows what it finds and
* cites. Grounded calls cost roughly ten times an ungrounded one, so in cloud
* they are metered per prompt instead of picked per brand.
*
* Picks are buffered and saved together from the bar at the bottom, matching the
* prompts editor. The server functions hold the real limits; this page only
* renders them.
*/
var $$splitComponentImporter = () => import("./llms-gwy5Yho2.mjs");
var Route = createFileRoute("/_authed/app/$brand/settings/llms")({
	loader: async ({ params }) => {
		const [picker, premium] = await Promise.all([getModelPickerStateFn({ data: { brandId: params.brand } }), getPremiumPoolFn({ data: { brandId: params.brand } })]);
		return {
			picker,
			premium
		};
	},
	head: ({ matches, match }) => {
		const appName = getAppName(match);
		const brandName = getBrandName(matches);
		return { meta: [{ title: buildTitle("LLMs", {
			appName,
			brandName
		}) }, {
			name: "description",
			content: "Choose which AI models this brand is tracked against."
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=llms-CBtNKu_H.mjs.map