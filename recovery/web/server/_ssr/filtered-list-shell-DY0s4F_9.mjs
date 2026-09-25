import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { C as Inbox } from "../_libs/lucide-react.mjs";
import { t as FilterBar } from "./filter-bar-CrWyPYxO.mjs";
import { t as FilterSection } from "./page-header-Da9U5Lfw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/filtered-list-shell-DY0s4F_9.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c41bea33-332f-4eb8-809c-969c540a68b4", e._sentryDebugIdIdentifier = "sentry-dbid-c41bea33-332f-4eb8-809c-969c540a68b4");
	} catch (e) {}
})();
/** The "FilterBar → fetch → filter → list" composition every dashboard page
*  was rebuilding by hand: filter bar + result count, the loading/error
*  states, and the two DISTINCT empty states ("no data yet" vs "no matches
*  for your filters" with a Clear filters escape hatch). The page keeps
*  owning data fetching; the shell owns the plumbing around it. */
function FilteredListShell({ filters, availableTags, trackedTargets, showSearch = false, showModelSelector = true, showResultCount = false, filterBarExtras, filterSectionExtras, isLoading = false, loadingState, isError = false, errorState, totalCount, filteredCount, emptyState, noMatchesTitle, noMatchesDescription, children }) {
	const effectiveFilteredCount = filteredCount ?? totalCount;
	let body;
	if (isLoading) body = loadingState;
	else if (isError) body = errorState;
	else if ((totalCount ?? 0) === 0 && !filters.isFiltered) body = emptyState;
	else if ((effectiveFilteredCount ?? 0) === 0) body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border-2 border-dashed border-muted rounded-lg min-h-48 flex items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-center py-8 text-muted-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { className: "h-12 w-12 mx-auto mb-4 opacity-50" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2",
					children: noMatchesTitle ?? "No results match your filters."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm mb-4",
					children: noMatchesDescription ?? "Try adjusting your search or filters."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					size: "sm",
					onClick: filters.clearFilters,
					className: "cursor-pointer",
					children: "Clear filters"
				})
			]
		})
	});
	else body = children;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSection, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterBar, {
		availableTags,
		trackedTargets,
		showSearch,
		showModelSelector,
		resultCount: showResultCount && !isLoading ? effectiveFilteredCount : void 0,
		resultTotal: showResultCount && !isLoading ? totalCount : void 0,
		extraControls: filterBarExtras
	}), filterSectionExtras] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-6",
		children: body
	})] });
}
//#endregion
export { FilteredListShell as t };

//# sourceMappingURL=filtered-list-shell-DY0s4F_9.mjs.map