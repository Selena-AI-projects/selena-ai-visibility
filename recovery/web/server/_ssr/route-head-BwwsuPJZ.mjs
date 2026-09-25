//#region node_modules/.nitro/vite/services/ssr/assets/route-head-BwwsuPJZ.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "fed2c163-54fd-4c5f-8569-b97cbce27c19", e._sentryDebugIdIdentifier = "sentry-dbid-fed2c163-54fd-4c5f-8569-b97cbce27c19");
	} catch (e) {}
})();
/**
* Helpers for building route head() meta tags.
* Respects white-label / deployment branding configuration.
*/
/**
* Get the app display name from route match context.
* Returns the white-label branding name if configured, otherwise Selena Systems.
*/
function getAppName(match) {
	return match.context?.clientConfig?.branding?.name || "Selena Systems";
}
/**
* Get the brand name from the matched routes hierarchy.
* Searches for the $brand layout match which stores brandName in loader data.
*/
function getBrandName(matches) {
	for (const m of matches) if (m.loaderData && typeof m.loaderData.brandName === "string") return m.loaderData.brandName;
}
/**
* Build a page title following the convention:
*   "PageName | BrandName · AppName"  (with brand context)
*   "PageName · AppName"              (without brand context)
*/
function buildTitle(pageName, opts) {
	if (opts.brandName) return `${pageName} | ${opts.brandName} · ${opts.appName}`;
	return `${pageName} · ${opts.appName}`;
}
//#endregion
export { getAppName as n, getBrandName as r, buildTitle as t };

//# sourceMappingURL=route-head-BwwsuPJZ.mjs.map