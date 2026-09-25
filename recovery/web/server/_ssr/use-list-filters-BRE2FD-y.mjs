import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { _ as useNavigate, v as useSearch } from "../_libs/@tanstack/react-router+[...].mjs";
import { f as getDefaultLookbackPeriod } from "./chart-utils-fSx3DwB3.mjs";
import { n as useBrand } from "./use-brands-CqDybx5x.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-list-filters-BRE2FD-y.js
var import_react = /* @__PURE__ */ __toESM(require_react());
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8d4c0e81-5ace-4c0c-8901-5f8fc8af4d09", e._sentryDebugIdIdentifier = "sentry-dbid-8d4c0e81-5ace-4c0c-8901-5f8fc8af4d09");
	} catch (e) {}
})();
function asString(value) {
	if (typeof value === "string") return value || void 0;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
}
function validateBrandFilterSearch(search) {
	return {
		model: asString(search.model),
		lookback: asString(search.lookback),
		tags: Array.isArray(search.tags) ? search.tags.map(String).join(",") : asString(search.tags),
		q: asString(search.q)
	};
}
function splitTags(tags) {
	return tags ? tags.split(",").filter(Boolean) : [];
}
function joinTags(tags) {
	return tags.length > 0 ? tags.join(",") : void 0;
}
var LOOKBACK_VALUES = [
	"1w",
	"1m",
	"3m",
	"6m",
	"1y",
	"all"
];
function coerceLookback(raw, fallback) {
	return LOOKBACK_VALUES.includes(raw ?? "") ? raw : fallback;
}
/** Write side of the filter URL state: one router navigation per interaction
*  (`replace`, no scroll reset, so filter clicks never grow history or jump
*  the page). Setting a key to `undefined` removes it from the URL — pass
*  that for a filter's default value so default state keeps a clean URL. */
function useFilterNavigate() {
	const navigate = useNavigate();
	return (0, import_react.useCallback)((updates) => navigate({
		to: ".",
		search: (prev) => ({
			...prev,
			...updates
		}),
		replace: true,
		resetScroll: false
	}), [navigate]);
}
/** URL-persisted state for the standard dashboard filter set (search, tags,
*  model, lookback). Page-specific keys (e.g. the fan-out `tab`) live in
*  their own route's `validateSearch` instead.
*
*  This subscribes to the whole search object — use it in the component that
*  composes the page's data query. Display widgets (the filter-bar dropdowns)
*  keep their own per-key `useSearch` selectors so a lookback click doesn't
*  re-render the whole bar. */
function useListFilters() {
	const { brand } = useBrand();
	const defaultLookback = (0, import_react.useMemo)(() => getDefaultLookbackPeriod(brand?.earliestDataDate), [brand?.earliestDataDate]);
	const urlFilters = useSearch({ strict: false });
	const setFilters = useFilterNavigate();
	const model = urlFilters.model ?? "all";
	const tags = (0, import_react.useMemo)(() => splitTags(urlFilters.tags), [urlFilters.tags]);
	const search = urlFilters.q ?? "";
	return {
		model,
		lookback: coerceLookback(urlFilters.lookback, defaultLookback),
		tags,
		search,
		/** True when any narrowing filter is active (lookback never narrows to
		*  zero on its own, so it doesn't count). Gates which empty state a
		*  page shows: "no data" vs "no matches for your filters". */
		isFiltered: Boolean(search) || tags.length > 0 || model !== "all",
		clearFilters: () => setFilters({
			q: void 0,
			tags: void 0,
			model: void 0
		})
	};
}
//#endregion
export { useListFilters as a, useFilterNavigate as i, joinTags as n, validateBrandFilterSearch as o, splitTags as r, coerceLookback as t };

//# sourceMappingURL=use-list-filters-BRE2FD-y.mjs.map