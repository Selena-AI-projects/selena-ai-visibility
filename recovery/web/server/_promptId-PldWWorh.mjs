import { i as __toESM } from "./_runtime.mjs";
import { A as IconInfoCircle, nt as require_react } from "./_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime, n as useQuery } from "./_libs/react+tanstack__react-query.mjs";
import { m as Link, v as useSearch } from "./_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./_ssr/card-CTzAVKuz.mjs";
import { t as Separator } from "./_ssr/separator-D7PdY237.mjs";
import { t as Skeleton } from "./_ssr/skeleton-BcIvnIuu.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./_ssr/tooltip-BswNQ_0y.mjs";
import { d as getDaysFromLookback, f as getDefaultLookbackPeriod } from "./_ssr/chart-utils-fSx3DwB3.mjs";
import { n as useBrand } from "./_ssr/use-brands-CqDybx5x.mjs";
import { i as useFilterNavigate, t as coerceLookback } from "./_ssr/use-list-filters-BRE2FD-y.mjs";
import { l as extractTextContent } from "./_ssr/text-extraction-2XGzlgNM.mjs";
import { t as Badge } from "./_ssr/badge-CEgIcDZr.mjs";
import { n as getPromptRunsFn, r as getPromptStatsFn, t as getPromptMetadataFn } from "./_ssr/prompts-C2FXcuMy.mjs";
import { t as Route } from "./_promptId-DKiGEOB2.mjs";
import { i as promptKeywords } from "./_ssr/fanout-analysis-Bt4WW_et.mjs";
import { t as ProgressBarChart } from "./_ssr/progress-bar-chart-BLiquGfW.mjs";
import { a as TabsList, d as useQueryFanout, i as TabsContent, l as VariationsList, n as QueryWordsSection, o as TabsTrigger, r as Tabs, s as UnknownQueriesNote, t as InfoTip, u as getModelDisplayName } from "./_ssr/use-query-fanout-B7Fdn67O.mjs";
import { n as ListPagination, t as CitationsDisplay } from "./_ssr/citations-display-BG6q56FQ.mjs";
import { t as Markdown } from "./_libs/react-markdown+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_promptId-PldWWorh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "78b46317-4013-4a08-a252-849adf4c7af3", e._sentryDebugIdIdentifier = "sentry-dbid-78b46317-4013-4a08-a252-849adf4c7af3");
	} catch (e) {}
})();
function getLookbackLabel(lookback) {
	switch (lookback) {
		case "1w": return "1w";
		case "1m": return "1mo";
		case "3m": return "3mo";
		case "6m": return "6mo";
		case "1y": return "1yr";
		case "all": return "all";
	}
}
function LookbackSelector({ defaultPeriod, onLookbackChange }) {
	const { brand } = useBrand();
	const computedDefaultPeriod = (0, import_react.useMemo)(() => defaultPeriod ?? getDefaultLookbackPeriod(brand?.earliestDataDate), [defaultPeriod, brand?.earliestDataDate]);
	const urlLookback = useSearch({
		strict: false,
		select: (s) => s.lookback
	});
	const setFilters = useFilterNavigate();
	const selectedLookback = coerceLookback(urlLookback, computedDefaultPeriod);
	const handleChange = (period) => {
		setFilters({ lookback: period === computedDefaultPeriod ? void 0 : period });
		onLookbackChange?.(period);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex rounded-md bg-muted p-1",
		children: [
			"1w",
			"1m",
			"3m",
			"6m",
			"1y",
			"all"
		].map((period) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: () => handleChange(period),
			className: `px-3 py-1 text-sm rounded cursor-pointer ${selectedLookback === period ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
			type: "button",
			children: getLookbackLabel(period)
		}, period))
	});
}
function useLookbackPeriod(defaultPeriod) {
	const { brand } = useBrand();
	const computedDefaultPeriod = (0, import_react.useMemo)(() => defaultPeriod ?? getDefaultLookbackPeriod(brand?.earliestDataDate), [defaultPeriod, brand?.earliestDataDate]);
	const urlLookback = useSearch({
		strict: false,
		select: (s) => s.lookback
	});
	return coerceLookback(urlLookback, computedDefaultPeriod);
}
var promptStatsKeys = {
	all: ["prompt-stats"],
	detail: (promptId, days) => [
		...promptStatsKeys.all,
		promptId,
		days
	]
};
function usePromptStats(promptId, options) {
	const days = options?.days || 7;
	const query = useQuery({
		queryKey: promptStatsKeys.detail(promptId || "", days),
		queryFn: () => getPromptStatsFn({ data: {
			promptId,
			days
		} }),
		enabled: !!promptId,
		staleTime: 3e4,
		refetchOnWindowFocus: true,
		placeholderData: (prev) => prev
	});
	return {
		data: query.data,
		promptStats: query.data,
		isLoading: query.isLoading,
		isError: query.error,
		revalidate: query.refetch,
		prompt: query.data?.prompt,
		aggregations: query.data?.aggregations
	};
}
var promptRunsKeys = {
	all: ["prompt-runs"],
	list: (promptId, options) => [
		...promptRunsKeys.all,
		promptId,
		options
	]
};
function usePromptRunsOnly(promptId, options) {
	const page = options?.page || 1;
	const limit = options?.limit || 10;
	const days = options?.days || 7;
	const query = useQuery({
		queryKey: promptRunsKeys.list(promptId || "", {
			page,
			limit,
			days
		}),
		queryFn: () => getPromptRunsFn({ data: {
			promptId,
			page,
			limit,
			days
		} }),
		enabled: !!promptId,
		staleTime: 3e4,
		refetchOnWindowFocus: true,
		placeholderData: (prev) => prev
	});
	const total = Number(query.data?.total || 0);
	const totalPages = Math.ceil(total / limit) || 1;
	return {
		runs: query.data?.runs || [],
		total,
		hasMore: query.data?.hasMore || false,
		isLoading: query.isLoading,
		isError: query.error,
		revalidate: query.refetch,
		pagination: query.data ? {
			page,
			limit,
			total,
			totalPages,
			hasNext: page < totalPages,
			hasPrev: page > 1
		} : void 0
	};
}
/**
* /app/$brand/prompts/$promptId - Prompt detail page
*
* Shows prompt details with tabs: Mentions, Web Queries, Citations, LLM Responses.
*/
var TABS = [
	{
		key: "mentions",
		label: "Mentions"
	},
	{
		key: "web-queries",
		label: "Web Queries"
	},
	{
		key: "citations",
		label: "Citations"
	},
	{
		key: "responses",
		label: "LLM Responses"
	}
];
function PromptHistoryPage() {
	const { brand: brandId, promptId } = Route.useParams();
	const lookback = useLookbackPeriod();
	const days = getDaysFromLookback(lookback);
	const activeTab = Route.useSearch({ select: (s) => s.tab ?? "mentions" });
	const navigate = Route.useNavigate();
	const setActiveTab = (0, import_react.useCallback)((tab) => navigate({
		search: (prev) => ({
			...prev,
			tab: tab === "mentions" ? void 0 : tab
		}),
		replace: true,
		resetScroll: false
	}), [navigate]);
	const [visitedTabs, setVisitedTabs] = (0, import_react.useState)(() => /* @__PURE__ */ new Set([activeTab]));
	const [currentPage, setCurrentPage] = (0, import_react.useState)(1);
	const [promptMeta, setPromptMeta] = (0, import_react.useState)(null);
	const [isMetaLoading, setIsMetaLoading] = (0, import_react.useState)(true);
	const { brand } = useBrand(brandId);
	const { isLoading: isStatsLoading, isError: isStatsError, aggregations } = usePromptStats(visitedTabs.has("mentions") || visitedTabs.has("citations") ? promptId : "", { days });
	const { runs, pagination, isLoading: isRunsLoading, isError: isRunsError } = usePromptRunsOnly(visitedTabs.has("responses") ? promptId : "", {
		page: currentPage,
		limit: 15,
		days
	});
	(0, import_react.useEffect)(() => {
		if (!brandId || !promptId) return;
		setIsMetaLoading(true);
		getPromptMetadataFn({ data: {
			brandId,
			promptId
		} }).then((data) => {
			if (data) setPromptMeta(data);
		}).catch(console.error).finally(() => setIsMetaLoading(false));
	}, [brandId, promptId]);
	const handleTabChange = (0, import_react.useCallback)((tab) => {
		setActiveTab(tab);
		setVisitedTabs((prev) => {
			if (prev.has(tab)) return prev;
			return /* @__PURE__ */ new Set([...prev, tab]);
		});
	}, [setActiveTab]);
	const handleLookbackChange = (0, import_react.useCallback)(() => {
		setCurrentPage(1);
	}, []);
	const handlePageChange = (newPage) => {
		if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) setCurrentPage(newPage);
	};
	const mentionStats = aggregations?.mentionStats || [];
	const citationStats = aggregations?.citationStats;
	const systemTags = promptMeta?.systemTags || [];
	const userTags = promptMeta?.tags || [];
	const hasTags = systemTags.length > 0 || userTags.length > 0;
	if (isStatsError || isRunsError) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex justify-between items-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-bold",
				children: "Prompt Details"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LookbackSelector, { onLookbackChange: handleLookbackChange })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "pt-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-red-600 text-sm bg-red-50 p-3 rounded-md",
				children: "Failed to load prompt data. Please try again."
			})
		}) })]
	});
	if (!isMetaLoading && !promptMeta) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-3xl font-bold",
			children: "Prompt Details"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "pt-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-muted-foreground",
				children: "No prompt data found."
			})
		}) })]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pb-6 space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex-1 min-w-0",
						children: isMetaLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-[28rem] max-w-full" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-2xl font-semibold tracking-tight leading-tight break-words",
							children: promptMeta?.value
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "shrink-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LookbackSelector, { onLookbackChange: handleLookbackChange })
					})]
				}), isMetaLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-14" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-40" })]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm",
					children: [
						promptMeta?.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1.5 text-green-700",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "relative flex h-2 w-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex h-2 w-2 rounded-full bg-green-500" })]
							}), "Active"]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted-foreground",
							children: "Disabled"
						}),
						promptMeta?.nextRunAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-border",
							children: "|"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground",
							children: [
								"Next run:",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-foreground tabular-nums",
									children: new Date(promptMeta.nextRunAt).toLocaleString(void 0, {
										month: "short",
										day: "numeric",
										hour: "numeric",
										minute: "2-digit"
									})
								})
							]
						})] }),
						hasTags && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-border",
							children: "|"
						}),
						hasTags && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: "Tags:"
								}),
								systemTags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "secondary",
									className: "text-xs capitalize font-normal",
									children: tag
								}, `sys-${tag}`)),
								userTags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "outline",
									className: "text-xs capitalize font-normal",
									children: tag
								}, `usr-${tag}`))
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-border",
							children: "|"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/app/$brand/settings/prompts",
							params: { brand: brandId },
							className: "text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 decoration-muted-foreground/40 hover:decoration-foreground/40",
							children: "Edit prompts"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "-mb-px flex gap-6",
						"aria-label": "Tabs",
						children: TABS.map(({ key, label }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => handleTabChange(key),
							className: `cursor-pointer whitespace-nowrap pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`,
							children: label
						}, key))
					}), aggregations?.totalRuns != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "pb-3 text-xs text-muted-foreground tabular-nums",
						children: [aggregations.totalRuns.toLocaleString(), " runs in period"]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pt-6 space-y-6",
				children: [
					activeTab === "mentions" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MentionsTab, {
						isLoading: isStatsLoading,
						mentionStats,
						totalRuns: aggregations?.totalRuns || 0,
						brandName: brand?.name,
						brandId
					}),
					activeTab === "web-queries" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WebQueriesTab, {
						brandId,
						promptId,
						promptValue: promptMeta?.value ?? "",
						lookback
					}),
					activeTab === "citations" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CitationsTab, {
						isLoading: isStatsLoading,
						citationStats,
						brandId,
						brandName: brand?.name
					}),
					activeTab === "responses" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsesTab, {
						runs,
						pagination,
						isLoading: isRunsLoading,
						currentPage,
						onPageChange: handlePageChange,
						brandName: brand?.name
					})
				]
			})
		]
	});
}
function TabLoadingSkeleton({ lines = 3 }) {
	const placeholders = Array.from({ length: lines }, (_, index) => `loading-line-${index}`);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-32 mb-2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-80" })] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "space-y-4 pt-6",
			children: placeholders.map((placeholder) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-full" }, placeholder))
		})
	] });
}
function MentionsTab({ isLoading, mentionStats, totalRuns, brandName, brandId }) {
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabLoadingSkeleton, { lines: 5 });
	if (mentionStats.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-12 text-center text-muted-foreground text-sm",
		children: "No mention data available for this time period."
	});
	const brandMentionPct = Math.round((mentionStats.find((s) => s.name === brandName)?.count || 0) / (totalRuns || 1) * 100);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-1.5 text-base",
				children: ["Mentions", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
					className: "max-w-xs text-sm font-normal",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Only competitors from your",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/app/$brand/settings/competitors",
							params: { brand: brandId },
							className: "underline",
							children: "tracked competitors list"
						}),
						" ",
						"are shown here."
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2",
						children: "If a competitor isn't showing up, add them to your list."
					})]
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
				brandName,
				" was mentioned in ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [brandMentionPct, "%"] }),
				" of prompt evaluations (",
				totalRuns.toLocaleString(),
				" total runs)."
			] })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressBarChart, {
				items: mentionStats.map((stat) => ({
					label: stat.name,
					count: stat.count
				})),
				defaultColor: "#3b82f6",
				customTotal: totalRuns || 1,
				highlightLabel: brandName
			}) })
		]
	});
}
function WebQueriesTab({ brandId, promptId, promptValue, lookback }) {
	const { data, isLoading, isError } = useQueryFanout(brandId, {
		lookback,
		promptId
	});
	const modelCounts = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const m of data?.byModel ?? []) for (const q of m.topQueries) {
			const entry = map.get(q.query);
			if (entry) entry.push({
				model: m.model,
				count: q.count
			});
			else map.set(q.query, [{
				model: m.model,
				count: q.count
			}]);
		}
		for (const counts of map.values()) counts.sort((a, b) => b.count - a.count);
		return map;
	}, [data]);
	if (isLoading && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabLoadingSkeleton, { lines: 6 });
	if (isError && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-12 text-center text-muted-foreground text-sm",
		children: "Couldn't load web queries right now. Reload the page to try again."
	});
	if (!data || data.totalQueries === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-12 text-center text-muted-foreground text-sm",
		children: "No web query data available for this time period."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
		defaultValue: "fanout",
		className: "gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
				value: "fanout",
				children: "Prompt Fan-Out"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
				value: "words",
				children: "Query Words"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "fanout",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
						className: "flex items-center gap-1.5 text-base",
						children: ["Prompt Fan-Out", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoTip, { children: "Every distinct search engines ran while answering this prompt, with how many runs each engine issued it. Your prompt's keywords are bolded." })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [data.uniqueQueries.toLocaleString(), " distinct searches."] })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-3 space-y-1 empty:hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnknownQueriesNote, { byModel: data.byModel })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VariationsList, {
						variations: data.topQueries,
						keywords: promptKeywords(promptValue),
						totalUnique: data.uniqueQueries,
						modelCounts
					})] })
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "words",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryWordsSection, {
					terms: data.terms,
					wordChanges: data.wordChanges
				})
			})
		]
	});
}
function CitationsTab({ isLoading, citationStats, brandId, brandName }) {
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabLoadingSkeleton, { lines: 6 });
	if (!citationStats || citationStats.totalCitations === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-12 text-center text-muted-foreground text-sm",
		children: "No citation data available for this time period."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CitationsDisplay, {
		citationData: citationStats,
		brandId,
		brandName,
		showStats: true,
		maxDomains: 10,
		maxUrls: 50
	});
}
function ResponsesTab({ runs, pagination, isLoading, currentPage, onPageChange, brandName }) {
	const formatDate = (dateString) => new Date(dateString).toLocaleString(void 0, { timeZoneName: "short" });
	const formatRawOutput = (rawOutput) => typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput, null, 2);
	if (isLoading && runs.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-4",
		children: [
			"first",
			"second",
			"third"
		].map((placeholder) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
				className: "pb-0 gap-y-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-3 gap-x-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-20 mb-1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-16" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-16 mb-1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-24" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-20 mb-1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-32" })] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "space-y-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-20 w-full" })
			})
		] }, placeholder))
	});
	if (runs.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-12 text-center text-muted-foreground text-sm",
		children: "No prompt runs found for this time period."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-base font-medium",
				children: "Individual Prompt Runs"
			}),
			runs.map((run) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
					className: "pb-0 gap-y-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-x-4 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground block text-xs mb-0.5",
								children: "Model"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: getModelDisplayName(run.model) })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground block text-xs mb-0.5",
								children: "Version"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: run.version })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground block text-xs mb-0.5",
								children: "Evaluated"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatDate(run.createdAt) })] })
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-5",
					children: [
						run.webQueries && run.webQueries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground block mb-1.5",
							children: "Web Queries"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1.5",
							children: run.webQueries.map((query) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "outline",
								className: "text-xs font-normal",
								children: query
							}, query))
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground block mb-1.5",
							children: "Brands Mentioned"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-1.5",
							children: [
								run.brandMentioned && brandName && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: "text-xs font-normal",
									children: brandName
								}),
								run.competitorsMentioned?.map((competitor) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "outline",
									className: "text-xs font-normal",
									children: competitor
								}, competitor)),
								!run.brandMentioned && (!run.competitorsMentioned || run.competitorsMentioned.length === 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted-foreground",
									children: "None"
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground block mb-1.5",
							children: "LLM Response"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-md border bg-muted/30 p-4 max-h-64 overflow-auto prose prose-sm max-w-none",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Markdown, { children: extractTextContent(run.rawOutput, run.provider ?? run.model) })
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground block mb-1.5",
							children: "Raw Output"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-md border bg-muted/20 p-4 max-h-64 overflow-auto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
								className: "text-xs font-mono leading-relaxed whitespace-pre-wrap",
								children: formatRawOutput(run.rawOutput)
							})
						})] })
					]
				})
			] }, run.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListPagination, {
				page: currentPage - 1,
				pageSize: pagination?.limit ?? 15,
				totalItems: pagination?.total ?? runs.length,
				onPageChange: (p) => onPageChange(p + 1)
			})
		]
	});
}
//#endregion
export { PromptHistoryPage as component };

//# sourceMappingURL=_promptId-PldWWorh.mjs.map