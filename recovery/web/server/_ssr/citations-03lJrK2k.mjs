import { a as require_jsx_runtime, i as useQueryClient } from "../_libs/react+tanstack__react-query.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Skeleton } from "./skeleton-BcIvnIuu.mjs";
import { d as getDaysFromLookback } from "./chart-utils-fSx3DwB3.mjs";
import { n as useBrand, t as brandKeys } from "./use-brands-CqDybx5x.mjs";
import { a as useListFilters } from "./use-list-filters-BRE2FD-y.mjs";
import { n as dashboardKeys, r as useCitations } from "./use-dashboard-summary-CZd6zvH8.mjs";
import { t as CitationsDisplay } from "./citations-display-BG6q56FQ.mjs";
import { t as Route } from "./citations-B-nJUfVX.mjs";
import { n as PageHeader } from "./page-header-Da9U5Lfw.mjs";
import { t as FilteredListShell } from "./filtered-list-shell-DY0s4F_9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/citations-03lJrK2k.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "01b2aa6a-4b96-4e56-873c-1efb83c84f18", e._sentryDebugIdIdentifier = "sentry-dbid-01b2aa6a-4b96-4e56-873c-1efb83c84f18");
	} catch (e) {}
})();
/**
* /app/$brand/citations - Citations tracking page
*
* Shows citation statistics with filtering by model, tags, and lookback period.
*/
function CitationsPage() {
	const { brand: brandId } = Route.useParams();
	const queryClient = useQueryClient();
	const filters = useListFilters();
	const days = getDaysFromLookback(filters.lookback);
	const { brand } = useBrand(brandId);
	const trackedTargets = brand?.trackedTargets ?? [];
	const modelParam = filters.model === "all" ? void 0 : filters.model;
	const { citations: citationData, isLoading, isError, revalidate: revalidateCitations } = useCitations(brandId, {
		days,
		tags: filters.tags.length > 0 ? filters.tags : void 0,
		model: modelParam
	});
	const infoContent = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-2",
		children: "Citations are the links and sources that AI models include in their responses when answering your prompts. They show which websites the AI considers authoritative or relevant to your topics."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Competitor" }),
		" domains are only those you've added to your",
		" ",
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/app/$brand/settings/competitors",
			params: { brand: brandId },
			className: "underline",
			children: "tracked competitors list"
		}),
		". Other domains appear under their detected category (Google, Social Media, Institutional, or Other)."
	] })] });
	const showFullSkeleton = isLoading && !citationData;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
		title: "Citations",
		subtitle: "See which sources LLMs cite when responding to your prompts.",
		infoContent,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilteredListShell, {
			filters,
			availableTags: citationData?.availableTags || [],
			trackedTargets,
			showModelSelector: true,
			isLoading: showFullSkeleton,
			loadingState: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-48" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-3/4" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-1/2" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-2/3" })
				]
			}) })] }),
			isError: Boolean(isError) || !citationData,
			errorState: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "pt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-red-600 text-sm bg-red-50 p-3 rounded-md",
					children: "Failed to load citation data. Please try again."
				})
			}) }),
			totalCount: citationData?.totalCitations,
			noMatchesTitle: "No citations found for the selected filters.",
			noMatchesDescription: "Try adjusting your filters or time period.",
			emptyState: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "pt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-muted-foreground text-center py-8",
					children: "No citations found. Citations are only available from prompts evaluated with web search enabled."
				})
			}) }),
			children: citationData && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CitationsDisplay, {
				citationData,
				brandId,
				brandName: brand?.name,
				showStats: true,
				maxDomains: 10,
				maxUrls: 20,
				days,
				onCompetitorAdded: () => {
					revalidateCitations();
					queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
					queryClient.invalidateQueries({ queryKey: brandKeys.competitors(brandId) });
					queryClient.invalidateQueries({ queryKey: brandKeys.detail(brandId) });
				}
			})
		})
	});
}
//#endregion
export { CitationsPage as component };

//# sourceMappingURL=citations-03lJrK2k.mjs.map