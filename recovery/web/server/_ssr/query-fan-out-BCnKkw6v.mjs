import { i as __toESM } from "../_runtime.mjs";
import { H as IconChevronDown, V as IconChevronRight, h as IconSearch, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Skeleton } from "./skeleton-BcIvnIuu.mjs";
import { r as TooltipProvider } from "./tooltip-BswNQ_0y.mjs";
import { n as useBrand } from "./use-brands-CqDybx5x.mjs";
import { a as useListFilters } from "./use-list-filters-BRE2FD-y.mjs";
import { r as usePromptsSummary } from "./use-prompts-summary-DoiBkiz3.mjs";
import { i as promptKeywords } from "./fanout-analysis-Bt4WW_et.mjs";
import { a as TabsList, c as VariationLine, d as useQueryFanout, i as TabsContent, n as QueryWordsSection, o as TabsTrigger, r as Tabs, t as InfoTip, u as getModelDisplayName } from "./use-query-fanout-B7Fdn67O.mjs";
import { t as FilterBar } from "./filter-bar-CrWyPYxO.mjs";
import { n as PageHeader, t as FilterSection } from "./page-header-Da9U5Lfw.mjs";
import { t as Route } from "./query-fan-out-CAZvnVzA.mjs";
import { t as HistoryButton } from "./history-button-3ijYslpE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/query-fan-out-BCnKkw6v.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "05483b90-b749-4f64-a7fe-6cd3bf5a6d8e", e._sentryDebugIdIdentifier = "sentry-dbid-05483b90-b749-4f64-a7fe-6cd3bf5a6d8e");
	} catch (e) {}
})();
/**
* /app/$brand/query-fan-out - Query Fan-Out
*
* "What are the answer engines really searching for?" When an engine answers a
* tracked prompt it may run several web searches first. KPIs summarize how much
* prompts expand, then three tabs: Prompt Fan-Out (each prompt's searches, with
* its keywords bolded), Query Words (the cloud + which words engines add/drop/keep),
* and Query Visibility (searches you're missing vs win).
*
* Read-only from `prompt_runs.web_queries`; engines that don't expose their
* searches contribute runs but no queries. See `server/query-fanout.ts` and
* `lib/fanout-analysis.ts`.
*/
function QueryFanoutPage() {
	const { brand: brandId } = Route.useParams();
	const { model, lookback, tags } = useListFilters();
	const tab = Route.useSearch({ select: (s) => s.tab ?? "fanout" });
	const navigate = Route.useNavigate();
	const setTab = (next) => navigate({
		search: (prev) => ({
			...prev,
			tab: next === "fanout" ? void 0 : next
		}),
		replace: true,
		resetScroll: false
	});
	const { brand } = useBrand(brandId);
	const trackedTargets = brand?.trackedTargets ?? [];
	const modelParam = model === "all" ? void 0 : model;
	const { promptsSummary } = usePromptsSummary(brandId, {
		lookback,
		model: modelParam
	});
	const availableTags = promptsSummary?.availableTags ?? [];
	const { data, isLoading, isError } = useQueryFanout(brandId, {
		lookback,
		tags,
		model: modelParam
	});
	const infoContent = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "When an AI engine with web search capabilities responds to a prompt, it may choose to make a number of web searches before creating its answer. These underlying web searches, or web queries, are only available for some engines." });
	let content;
	if (isLoading && !data) content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingState, {});
	else if (isError && !data) content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "Couldn't load query fan-out right now. Reload the page to try again." });
	else if (!data || data.totalRuns === 0) content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "No runs with web search enabled for the selected filters. Fan-out appears once your prompts have been run by an engine with web search." });
	else if (data.totalQueries === 0) content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, {
		delayDuration: 150,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatRow, { data }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "No web queries in this period — the engines you track didn't expose any searches for these prompts and filters." })]
		})
	});
	else content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, {
		delayDuration: 150,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatRow, { data }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				value: tab,
				onValueChange: (v) => setTab(v),
				className: "gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "fanout",
							children: "Prompt Fan-Out"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "top-queries",
							children: "Top Queries"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "words",
							children: "Query Words"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "fanout",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Prompts, {
							prompts: data.byPrompt,
							brandId
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "top-queries",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopQueries, {
							data,
							brandId
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "words",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryWordsSection, {
							terms: data.terms,
							wordChanges: data.wordChanges
						})
					})
				]
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageHeader, {
		title: "Query Fan-Out",
		subtitle: "The web searches AI engines run when answering your prompts.",
		infoContent,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterSection, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterBar, {
			availableTags,
			trackedTargets,
			showSearch: false,
			showModelSelector: true
		}) }), content]
	});
}
function StatCard({ label, value, tip }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "py-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-muted-foreground flex items-center gap-1 text-sm",
			children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoTip, { children: tip })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1.5 text-3xl font-bold tabular-nums",
			children: value
		})] })
	});
}
function RunsTooltip({ breakdown }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Prompt runs that produced at least one web search. Some engines do not expose web searches, so this number may be lower than expected." }), breakdown.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border-border/60 mt-2 space-y-0.5 border-t pt-2",
		children: breakdown.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: getModelDisplayName(m.model) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular-nums",
				children: m.fanoutRuns.toLocaleString()
			})]
		}, m.model))
	})] });
}
function UnknownRunsTooltip({ byModel }) {
	const rows = byModel.map((m) => ({
		model: m.model,
		unknown: m.runs - m.fanoutRuns
	})).filter((m) => m.unknown > 0).sort((a, b) => b.unknown - a.unknown);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Search-enabled runs without known queries. The engine may have chosen not to search at all, searched with just the prompt itself, or searched without revealing its queries." }), rows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border-border/60 mt-2 space-y-0.5 border-t pt-2",
		children: rows.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: getModelDisplayName(m.model) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular-nums",
				children: m.unknown.toLocaleString()
			})]
		}, m.model))
	})] });
}
function StatRow({ data }) {
	const breakdown = data.byModel.filter((m) => m.fanoutRuns > 0).sort((a, b) => b.fanoutRuns - a.fanoutRuns);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
				label: "Search Prompt Runs",
				value: data.totalRuns.toLocaleString(),
				tip: "How many times your prompts were run against engines configured with web search. An engine may still choose not to execute a search on a given run."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
				label: "Prompt Runs w/ Unknown Queries",
				value: (data.totalRuns - data.fanoutRuns).toLocaleString(),
				tip: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnknownRunsTooltip, { byModel: data.byModel })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
				label: "Prompt Runs w/ Known Queries",
				value: data.fanoutRuns.toLocaleString(),
				tip: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunsTooltip, { breakdown })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
				label: "Average Fan-Out",
				value: data.avgPerExecution.toLocaleString(),
				tip: "Average queries per run that had at least one web query."
			})
		]
	});
}
function LoadingState() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
			children: [
				"a",
				"b",
				"c",
				"d"
			].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "py-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-28" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-16" })]
				})
			}, k))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-48" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-3/4" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-2/3" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-1/2" })
			]
		})] })]
	});
}
function EmptyState({ message }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
		className: "py-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-muted-foreground text-center",
			children: message
		})
	}) });
}
function SortHead({ k, label, sort, setSort }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick: () => setSort(k),
		className: cn("hover:text-foreground cursor-pointer uppercase tracking-wide", sort === k ? "text-foreground" : ""),
		children: label
	});
}
var GRID = "grid grid-cols-[1.25rem_1fr_4.5rem_7rem] items-center gap-3";
function Prompts({ prompts, brandId }) {
	const [expanded, setExpanded] = (0, import_react.useState)(() => new Set(prompts.length === 1 ? [prompts[0].promptId] : []));
	const [sort, setSort] = (0, import_react.useState)("queries");
	const [search, setSearch] = (0, import_react.useState)("");
	const rows = (0, import_react.useMemo)(() => {
		const s = search.trim().toLowerCase();
		return [...s ? prompts.filter((p) => p.promptValue.toLowerCase().includes(s)) : prompts].sort((a, b) => sort === "avg" ? b.avgPerExecution - a.avgPerExecution || b.totalQueries - a.totalQueries : b.totalQueries - a.totalQueries);
	}, [
		prompts,
		search,
		sort
	]);
	const toggle = (id) => setExpanded((prev) => {
		const next = new Set(prev);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		return next;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-1.5 text-base",
				children: ["Prompts", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoTip, { children: "Each prompt's fan-out: how many searches it generates (Queries) and how many per run that searched (Avg/Prompt Run). Expand a prompt to see the searches, with your prompt's keywords bolded." })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "The web searches each prompt triggers." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative w-64 shrink-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSearch, { className: "text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: search,
					onChange: (e) => setSearch(e.target.value),
					placeholder: "Search prompts...",
					className: "h-8 pl-8 text-sm"
				})]
			})]
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn(GRID, "text-muted-foreground/80 border-b py-2 text-[11px] font-medium"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "uppercase tracking-wide",
					children: "Prompt"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-right",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortHead, {
						k: "queries",
						label: "Queries",
						sort,
						setSort
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-right",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortHead, {
						k: "avg",
						label: "Avg/Prompt Run",
						sort,
						setSort
					})
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "divide-border divide-y",
			children: [rows.map((p) => {
				const isOpen = expanded.has(p.promptId);
				const keywords = isOpen ? promptKeywords(p.promptValue) : null;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "py-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => toggle(p.promptId),
						className: cn(GRID, "hover:bg-muted/50 w-full cursor-pointer rounded-sm py-2 text-left"),
						"aria-expanded": isOpen,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground",
								children: isOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronDown, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronRight, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block truncate text-sm font-medium",
									title: p.promptValue,
									children: p.promptValue || "(untitled prompt)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted-foreground text-xs",
									children: [p.uniqueQueries.toLocaleString(), " variations"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-right text-sm tabular-nums",
								children: p.totalQueries.toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-right text-sm tabular-nums",
								children: p.avgPerExecution.toLocaleString()
							})
						]
					}), isOpen && keywords && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-border mb-3 ml-8 mr-2 space-y-2 border-l pl-4",
						children: [
							p.variations.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VariationLine, {
								variation: v,
								keywords
							}, v.query)),
							p.uniqueQueries > p.variations.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-muted-foreground text-xs",
								children: [
									"Top ",
									p.variations.length,
									" of ",
									p.uniqueQueries.toLocaleString(),
									" variations shown"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "pt-1",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryButton, {
									brandId,
									promptId: p.promptId,
									promptName: p.promptValue,
									tab: "web-queries"
								})
							})
						]
					})]
				}, p.promptId);
			}), rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-muted-foreground py-6 text-center text-sm",
				children: "No prompts match your search."
			})]
		})] })]
	});
}
var TOP_GRID = "grid grid-cols-[1.25rem_1fr_5rem_5.5rem] items-center gap-3";
function TopQueries({ data, brandId }) {
	const [sort, setSort] = (0, import_react.useState)("prompts");
	const [expanded, setExpanded] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const rows = sort === "prompts" ? data.topByPrompts : data.topByRuns;
	const toggle = (query) => setExpanded((prev) => {
		const next = new Set(prev);
		if (next.has(query)) next.delete(query);
		else next.add(query);
		return next;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
			className: "flex items-center gap-1.5 text-base",
			children: ["Top Queries", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoTip, { children: "The searches with the widest reach — sort by how many distinct prompts triggered them, or how many prompt runs issued them. Expand a query to see the prompts behind it." })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "The searches that recur across your prompts." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn(TOP_GRID, "text-muted-foreground/80 border-b py-2 text-[11px] font-medium"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "uppercase tracking-wide",
					children: "Query"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-right",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortHead, {
						k: "prompts",
						label: "Prompts",
						sort,
						setSort
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-right",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortHead, {
						k: "runs",
						label: "Prompt Runs",
						sort,
						setSort
					})
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "divide-border divide-y",
			children: [rows.map((q) => {
				const isOpen = expanded.has(q.query);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "py-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => toggle(q.query),
						className: cn(TOP_GRID, "hover:bg-muted/50 w-full cursor-pointer rounded-sm py-2 text-left"),
						"aria-expanded": isOpen,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground",
								children: isOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronDown, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronRight, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "min-w-0 truncate text-sm",
								title: q.query,
								children: q.query
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-right text-sm tabular-nums",
								children: q.prompts.toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-right text-sm tabular-nums",
								children: q.runs.toLocaleString()
							})
						]
					}), isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border-border mb-3 ml-8 mr-2 space-y-1.5 border-l pl-4",
						children: q.promptRefs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/app/$brand/prompts/$promptId",
								params: {
									brand: brandId,
									promptId: p.promptId
								},
								search: { tab: "web-queries" },
								className: "min-w-0 truncate text-sm hover:underline",
								title: p.promptValue,
								children: p.promptValue || "(untitled prompt)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted-foreground shrink-0 text-sm tabular-nums",
								title: "Runs of this prompt that issued the search",
								children: [p.runs.toLocaleString(), "×"]
							})]
						}, p.promptId))
					})]
				}, q.query);
			}), rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-muted-foreground py-6 text-center text-sm",
				children: "No queries for this period."
			})]
		})] })]
	});
}
//#endregion
export { QueryFanoutPage as component };

//# sourceMappingURL=query-fan-out-BCnKkw6v.mjs.map