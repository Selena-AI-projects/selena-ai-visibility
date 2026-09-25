//#region node_modules/.nitro/vite/services/ssr/assets/constants-ChC5ZOH6.js
/**
* Shared constants used across all deployment configurations
*/
/**
* Default branding values for local/demo modes
* These are used when environment variables are not set
*
* NOTE: Whitelabel mode does NOT use these defaults - all values must be
* provided via environment variables.
*/
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "5ed4bfa0-d121-4f96-9bb4-8cfebbcdae97", e._sentryDebugIdIdentifier = "sentry-dbid-5ed4bfa0-d121-4f96-9bb4-8cfebbcdae97");
	} catch (e) {}
})();
var DEFAULT_APP_NAME = "Selena Systems";
var DEFAULT_APP_ICON = "/icons/selena-icon.svg";
var DEFAULT_APP_URL = "http://localhost:3000/";
/** Provider setup guide, linked from SCRAPE_TARGETS errors and the LLMs page. */
var PROVIDERS_DOCS_URL = "https://docs.elmohq.com/docs/user-guide/providers";
/**
* Elmo brand constants — used for icon generation, manifest, and the brand kit.
*/
var ELMO_BRAND_COLOR = "#8f5c34";
var ELMO_THEME_COLOR = "#181614";
var ELMO_BACKGROUND_COLOR = "#f7f2ea";
/**
* Default chart colors for the Elmo product.
*
* 11 base hues (Observable + Tableau, anchored to brand blue) expanded
* into 55 colors across five lightness tiers: base → dark → light →
* muted → deep. This keeps harmony (same hue families throughout) while
* supporting charts with many series. Whitelabel deployments override
* via VITE_CHART_COLORS.
*
* Hue order is load-bearing, not decorative. Charts assign colors by slot,
* so the earliest slots are the ones that end up side by side most often;
* the order below is the one that keeps the first four furthest apart under
* protanopia and deuteranopia. Reordering these is a visible change.
*/
var DEFAULT_CHART_COLORS = [
	"#2563eb",
	"#efb118",
	"#ff8ab7",
	"#9c6b4e",
	"#7cb342",
	"#b07aa1",
	"#a463f2",
	"#3ca951",
	"#9498a0",
	"#ff725c",
	"#38b2ac",
	"#0b43bc",
	"#bb8807",
	"#fa478c",
	"#714932",
	"#58842a",
	"#934d7f",
	"#7c1af4",
	"#247a35",
	"#5e6d8d",
	"#f9381a",
	"#22817c",
	"#6d94e8",
	"#ebc566",
	"#f877a9",
	"#b09382",
	"#9fc17b",
	"#c6a9be",
	"#b282ed",
	"#6fbe7f",
	"#a9b3c6",
	"#f88877",
	"#6ec4c0",
	"#5178cd",
	"#d0aa49",
	"#eb84ac",
	"#967664",
	"#839b69",
	"#af88a4",
	"#ae87de",
	"#62936c",
	"#8e9ab4",
	"#ea8e80",
	"#5f9b98",
	"#0e3486",
	"#84620b",
	"#f9156d",
	"#493327",
	"#3e5822",
	"#6b435f",
	"#6513c9",
	"#1e5229",
	"#49566e",
	"#db2206",
	"#1c5451"
];
//#endregion
export { ELMO_BACKGROUND_COLOR as a, PROVIDERS_DOCS_URL as c, DEFAULT_CHART_COLORS as i, DEFAULT_APP_NAME as n, ELMO_BRAND_COLOR as o, DEFAULT_APP_URL as r, ELMO_THEME_COLOR as s, DEFAULT_APP_ICON as t };

//# sourceMappingURL=constants-ChC5ZOH6.mjs.map