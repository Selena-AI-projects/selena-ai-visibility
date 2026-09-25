import { i as __toESM } from "../_runtime.mjs";
import { $ as IconAlertTriangle, A as IconInfoCircle, H as IconChevronDown, N as IconExternalLink, Q as IconArrowDownRight, h as IconSearch, l as IconSwitchHorizontal, nt as require_react, y as IconPlus } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Separator } from "./separator-D7PdY237.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
import { b as LoaderCircle } from "../_libs/lucide-react.mjs";
import { a as createCompetitorFromDomainFn, n as addDomainToCompetitorFn, t as addDomainToBrandFn } from "./brands-Djh0ZZPk.mjs";
import { a as PAGE_TYPE_CONFIG, i as DOMAIN_CATEGORY_COLORS, n as CITATION_CATEGORIES, r as CITATION_PAGE_TYPES, t as CATEGORY_CONFIG } from "./domain-categories-IivSiXtp.mjs";
import { vt as captureException } from "../_libs/sentry__core.mjs";
import { n as PopoverContent, r as PopoverTrigger, t as Popover } from "./popover-TvG17E-A.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { a as YAxis, c as Area, o as XAxis, t as AreaChart, u as CartesianGrid } from "../_libs/recharts+[...].mjs";
import { n as ChartTooltip, t as ChartContainer } from "./chart-WE9PDFAP.mjs";
import { t as ProgressBarChart } from "./progress-bar-chart-BLiquGfW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/citations-display-BG6q56FQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "dc65139b-9145-4f1c-b411-da2e1a8cf6f5", e._sentryDebugIdIdentifier = "sentry-dbid-dc65139b-9145-4f1c-b411-da2e1a8cf6f5");
	} catch (e) {}
})();
var getCategoryLabel = (category) => CATEGORY_CONFIG[category]?.label ?? category;
var getCategoryColorClass = (category) => CATEGORY_CONFIG[category]?.badgeClass ?? "bg-gray-500/90 text-white";
var formatUrlForDisplay = (url) => {
	let displayUrl = url.replace(/^https?:\/\//, "");
	displayUrl = displayUrl.replace(/^www\./, "");
	displayUrl = displayUrl.replace(/#:~:text=[^&]*/, "");
	if (displayUrl.endsWith("#")) displayUrl = displayUrl.slice(0, -1);
	const maxLength = 80;
	if (displayUrl.length > maxLength) displayUrl = `${displayUrl.substring(0, maxLength)}...`;
	return displayUrl;
};
function formatPeriodLabel(days) {
	if (days === 1) return "24 hours";
	if (days === 7) return "week";
	if (days === 14) return "2 weeks";
	if (days === 30) return "month";
	if (days === 60) return "2 months";
	if (days === 90) return "3 months";
	return `${days} days`;
}
var extractSubreddit = (url) => {
	try {
		const match = url.match(/reddit\.com\/r\/([^/?#]+)/i);
		return match ? `r/${match[1]}` : null;
	} catch {
		return null;
	}
};
var extractFilenameFromUrl = (url) => {
	try {
		const urlObj = new URL(url);
		const segments = urlObj.pathname.split("/").filter(Boolean);
		if (segments.length === 0) return urlObj.hostname.replace(/^www\./, "");
		return segments[segments.length - 1];
	} catch {
		return url;
	}
};
var CATEGORY_META = Object.fromEntries(CITATION_CATEGORIES.map((c) => [c, {
	label: CATEGORY_CONFIG[c].label,
	color: CATEGORY_CONFIG[c].chartColor
}]));
var PAGE_TYPE_META = Object.fromEntries(CITATION_PAGE_TYPES.map((p) => [p, {
	label: PAGE_TYPE_CONFIG[p].label,
	color: PAGE_TYPE_CONFIG[p].chartColor
}]));
var attributionDotClass = (a) => a === "brand" ? "bg-emerald-500" : a === "competitor" ? "bg-red-500" : "bg-gray-400";
function UnderlineTabs({ tabs, activeKey, onSelect }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "-mb-px flex gap-4 overflow-x-auto border-b border-border",
		"aria-label": "Tabs",
		children: tabs.map(({ key, label }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => onSelect(key),
			className: `shrink-0 cursor-pointer whitespace-nowrap pb-2.5 text-xs font-medium transition-colors border-b-2 ${activeKey === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`,
			children: label
		}, key))
	});
}
function StatCard({ title, tooltip, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "flex flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
			className: "gap-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-sm font-medium text-muted-foreground flex items-center gap-1.5",
				children: [title, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 cursor-help" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
					className: "max-w-xs text-sm font-normal",
					children: tooltip
				})] })]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "flex-1 flex items-center",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-2xl sm:text-3xl lg:text-4xl font-bold",
				children: value
			})
		})]
	});
}
function CitationStatsCards({ brandShare, uniqueDomains, totalCitations }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-1 sm:grid-cols-3 gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
				title: "Brand Citation Share",
				tooltip: "The percentage of all citations that link to your brand's domain. A higher share means AI models are more likely to reference your content.",
				value: `${brandShare}%`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
				title: "Unique Domains",
				tooltip: "The number of distinct domains cited across all prompt evaluations in this period.",
				value: uniqueDomains.toLocaleString()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
				title: "Total Citations",
				tooltip: "The total external websites cited by AI models across prompt evaluations.",
				value: totalCitations.toLocaleString()
			})
		]
	});
}
function TrendAreaChart({ title, tooltip, data, keys, meta }) {
	const present = keys;
	const totals = new Map(present.map((k) => [k, data.reduce((s, d) => s + (typeof d[k] === "number" ? d[k] : 0), 0)]));
	const ordered = [...present].sort((a, b) => a === "other" ? 1 : b === "other" ? -1 : (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
	const config = Object.fromEntries(ordered.map((k) => [k, {
		label: meta[k]?.label ?? k,
		color: meta[k]?.color ?? "#9ca3af"
	}]));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
		className: "gap-0 pb-2",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
			className: "text-sm font-medium flex items-center gap-1.5",
			children: [title, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
				className: "max-w-xs text-sm font-normal",
				children: tooltip
			})] })]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartContainer, {
		config,
		className: "aspect-auto h-[200px] w-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
			data,
			margin: {
				top: 10,
				right: 10,
				left: -10,
				bottom: 0
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
					vertical: false,
					strokeDasharray: "3 3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
					dataKey: "date",
					tickLine: false,
					axisLine: false,
					tickMargin: 8,
					minTickGap: 50,
					tick: { fontSize: 11 },
					tickFormatter: (value) => {
						const [year, month, day] = String(value).split("-").map(Number);
						return new Date(year, month - 1, day).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric"
						});
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
					tickLine: false,
					axisLine: false,
					tickMargin: 8,
					domain: [0, 100],
					ticks: [
						0,
						25,
						50,
						75,
						100
					],
					tick: { fontSize: 11 },
					tickFormatter: (value) => `${value}%`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {
					isAnimationActive: false,
					cursor: false,
					content: ({ active, payload, label }) => {
						if (!active || !payload?.length) return null;
						const dp = payload[0]?.payload;
						const [year, month, day] = String(label).split("-").map(Number);
						const formattedDate = new Date(year, month - 1, day).toLocaleDateString("en-US", {
							month: "long",
							day: "numeric",
							year: "numeric"
						});
						const rows = ordered.map((k) => ({
							k,
							value: dp?.[k] ?? 0
						})).filter((r) => r.value > 0);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-border/50 bg-background grid min-w-[10rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: formattedDate
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid gap-1",
								children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "shrink-0 rounded-[2px] h-2.5 w-2.5",
											style: { backgroundColor: meta[r.k]?.color ?? "#9ca3af" }
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground",
											children: meta[r.k]?.label ?? r.k
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "ml-auto font-mono tabular-nums",
											children: [r.value, "%"]
										})
									]
								}, r.k))
							})]
						});
					}
				}),
				[...ordered].reverse().map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
					dataKey: k,
					type: "monotone",
					stackId: "1",
					stroke: `var(--color-${k})`,
					fill: `var(--color-${k})`,
					fillOpacity: .8,
					strokeWidth: 0
				}, k))
			]
		})
	}) })] });
}
var CHANGE_TYPE_TABS = [
	{
		key: "new_pages",
		label: "New Pages"
	},
	{
		key: "dropped_pages",
		label: "Dropped Pages"
	},
	{
		key: "title",
		label: "Title Changes"
	},
	{
		key: "new_domains",
		label: "New Domains"
	},
	{
		key: "dropped_domains",
		label: "Dropped Domains"
	}
];
function RecentChangesCard({ whatsChanged, days }) {
	const [changeTypeFilter, setChangeTypeFilter] = (0, import_react.useState)("new_pages");
	const allChanges = (0, import_react.useMemo)(() => {
		return [
			...whatsChanged.newUrls.map((u) => ({
				type: "new_pages",
				...u
			})),
			...whatsChanged.droppedUrls.map((u) => ({
				type: "dropped_pages",
				...u
			})),
			...whatsChanged.titleChanges.map((u) => ({
				type: "title",
				...u
			})),
			...whatsChanged.newDomains.map((d) => ({
				type: "new_domains",
				...d
			})),
			...whatsChanged.droppedDomains.map((d) => ({
				type: "dropped_domains",
				...d
			}))
		];
	}, [whatsChanged]);
	const visibleChanges = (0, import_react.useMemo)(() => {
		return allChanges.filter((c) => c.type === changeTypeFilter);
	}, [allChanges, changeTypeFilter]).slice(0, 6);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "h-full flex flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-1.5",
				children: ["Recent Changes", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
					className: "max-w-xs text-sm font-normal",
					children: [
						"Compares this ",
						formatPeriodLabel(days),
						" with the ",
						formatPeriodLabel(days),
						" before it. Shows new and dropped pages, title changes, and new and dropped domains."
					]
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: ["How AI citations have shifted over the past ", formatPeriodLabel(days)] })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnderlineTabs, {
					tabs: CHANGE_TYPE_TABS,
					activeKey: changeTypeFilter,
					onSelect: (key) => setChangeTypeFilter(key)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "divide-y divide-border/50",
					children: [visibleChanges.map((change) => {
						const isDomainChange = change.type === "new_domains" || change.type === "dropped_domains";
						const rawUrl = "url" in change ? change.url : void 0;
						const domain = "domain" in change ? change.domain : void 0;
						const url = rawUrl ?? (isDomainChange && domain ? `https://${domain}` : void 0);
						const displayLabel = isDomainChange ? domain ?? "" : rawUrl ? formatUrlForDisplay(rawUrl) : "";
						const key = isDomainChange ? `${change.type}-${domain}` : `${change.type}-${url ?? ""}`;
						const icon = change.type === "new_pages" || change.type === "new_domains" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconPlus, { className: "h-3.5 w-3.5 text-green-600" }) : change.type === "dropped_pages" || change.type === "dropped_domains" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowDownRight, { className: "h-3.5 w-3.5 text-red-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSwitchHorizontal, { className: "h-3.5 w-3.5 text-amber-600" });
						let description = null;
						if (change.type === "new_pages" && "promptCount" in change) description = `0 → ${change.count} citations across ${change.promptCount} prompt${change.promptCount !== 1 ? "s" : ""}`;
						else if (change.type === "dropped_pages" && "previousCount" in change) description = `${change.previousCount} → ${change.currentCount} citations`;
						else if (change.type === "title" && "currentTitle" in change && "previousTitle" in change) description = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "line-through opacity-60",
								children: change.previousTitle
							}),
							" → ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium text-foreground",
								children: change.currentTitle
							})
						] });
						else if (change.type === "new_domains" && "count" in change) description = `${change.count} citation${change.count !== 1 ? "s" : ""} in the current period`;
						else if (change.type === "dropped_domains" && "previousCount" in change) description = `${change.previousCount} citation${change.previousCount !== 1 ? "s" : ""} last period, none now`;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: url,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "flex items-start gap-2.5 py-2 group",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "shrink-0 mt-0.5",
								children: icon
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `text-sm font-medium truncate text-foreground${url ? " group-hover:underline" : ""}`,
										children: displayLabel
									}), url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconExternalLink, { className: "h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" })]
								}), description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground mt-0.5",
									children: description
								})]
							})] })
						}, key);
					}), visibleChanges.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted-foreground text-center py-4",
						children: [
							"No ",
							CHANGE_TYPE_TABS.find((t) => t.key === changeTypeFilter)?.label.toLowerCase() ?? changeTypeFilter,
							" ",
							"changes in this period."
						]
					})]
				})]
			})
		]
	});
}
var PAGER_BUTTON_CLASS = "text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2.5 py-1 rounded-md border border-border hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
/** Page-based pagination footer ("1–10 of 42" + Previous/Next). Controlled,
*  so the same props work whether the caller paginates client-side over
*  fetched data (v1, via `usePagedList`) or drives page/total from the
*  server later. Renders nothing when everything fits on one page. */
function ListPagination({ page, pageSize, totalItems, onPageChange }) {
	const totalPages = Math.ceil(totalItems / pageSize);
	if (totalPages <= 1) return null;
	const start = page * pageSize + 1;
	const end = Math.min((page + 1) * pageSize, totalItems);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3 flex items-center justify-between",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-[11px] text-muted-foreground tabular-nums",
			children: [
				start.toLocaleString(),
				"–",
				end.toLocaleString(),
				" of ",
				totalItems.toLocaleString()
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => onPageChange(Math.max(0, page - 1)),
				disabled: page === 0,
				className: PAGER_BUTTON_CLASS,
				children: "Previous"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => onPageChange(Math.min(totalPages - 1, page + 1)),
				disabled: page >= totalPages - 1,
				className: PAGER_BUTTON_CLASS,
				children: "Next"
			})]
		})]
	});
}
/** Client-side page state over already-fetched items. The page is clamped
*  when the list shrinks (e.g. a filter change) so we never show an
*  out-of-range empty page; callers that want a hard reset to page 0 on
*  filter change can still call `setPage(0)` in their filter handler. */
function usePagedList(items, pageSize) {
	const [rawPage, setPage] = (0, import_react.useState)(0);
	const maxPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
	const page = Math.min(rawPage, maxPage);
	return {
		page,
		setPage,
		pageItems: (0, import_react.useMemo)(() => items.slice(page * pageSize, (page + 1) * pageSize), [
			items,
			page,
			pageSize
		]),
		pageSize,
		totalItems: items.length
	};
}
var PAGE_SIZE = 6;
function ContentGapsCard({ prompts, brandId }) {
	const { page, setPage, pageItems, totalItems } = usePagedList(prompts, PAGE_SIZE);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "h-full flex flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-1.5",
				children: ["Content Gaps", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
					className: "max-w-xs text-sm font-normal",
					children: "Prompts where competitors are cited but your brand isn't — opportunities to improve your citation presence."
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Prompts where competitors are cited but your brand isn't" })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "flex-1 flex flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "divide-y divide-border/50 flex-1",
					children: pageItems.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/app/$brand/prompts/$promptId",
						params: {
							brand: brandId,
							promptId: prompt.id
						},
						className: "flex items-start gap-2.5 py-2 group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "shrink-0 mt-0.5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAlertTriangle, { className: "h-3.5 w-3.5 text-amber-500" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-1.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium truncate text-foreground group-hover:underline",
									children: prompt.value
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground mt-0.5",
								children: [
									prompt.uniqueCompetitors,
									" ",
									prompt.uniqueCompetitors === 1 ? "competitor" : "competitors",
									" cited",
									" ",
									prompt.competitorCitationCount,
									" ",
									prompt.competitorCitationCount === 1 ? "time" : "times",
									" — your brand cited 0 times"
								]
							})]
						})]
					}, prompt.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListPagination, {
					page,
					pageSize: PAGE_SIZE,
					totalItems,
					onPageChange: setPage
				})]
			})
		]
	});
}
function TrackDomainPopover({ domain, brandId, brandName, competitors, onAdded }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [newName, setNewName] = (0, import_react.useState)("");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [saved, setSaved] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const handleSuccess = () => {
		setSaving(false);
		setSaved(true);
		setError("");
		setOpen(false);
		onAdded?.();
	};
	const handleError = (e) => {
		setSaving(false);
		setError("Something went wrong. Please try again.");
		captureException(e);
	};
	const handleAddToBrand = async () => {
		setSaving(true);
		setError("");
		try {
			await addDomainToBrandFn({ data: {
				brandId,
				domain
			} });
			handleSuccess();
		} catch (e) {
			handleError(e);
		}
	};
	const handleAddToExisting = async (competitorId) => {
		setSaving(true);
		setError("");
		try {
			await addDomainToCompetitorFn({ data: {
				brandId,
				competitorId,
				domain
			} });
			handleSuccess();
		} catch (e) {
			handleError(e);
		}
	};
	const handleCreateNew = async () => {
		if (!newName.trim()) return;
		setSaving(true);
		setError("");
		try {
			await createCompetitorFromDomainFn({ data: {
				brandId,
				name: newName.trim(),
				domain
			} });
			setNewName("");
			handleSuccess();
		} catch (e) {
			handleError(e);
		}
	};
	if (saved) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "shrink-0 p-1 text-muted-foreground",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "shrink-0 p-1 rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground transition-colors",
				title: `Track ${domain}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconPlus, { className: "h-3.5 w-3.5" })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverContent, {
			className: "w-72 p-3",
			align: "end",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs font-medium",
						children: ["Track ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: domain })]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-muted-foreground",
								children: "Add as brand domain"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3 w-3 text-muted-foreground cursor-help" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
								className: "max-w-xs text-xs font-normal",
								children: [
									"Applies ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "retroactively" }),
									" — all existing and future citations from this domain will be classified as your brand."
								]
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: handleAddToBrand,
							disabled: saving,
							className: "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted cursor-pointer disabled:opacity-50 transition-colors",
							children: brandName || "My brand"
						})]
					}),
					competitors.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-muted-foreground",
								children: "Add to existing competitor"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3 w-3 text-muted-foreground cursor-help" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
								className: "max-w-xs text-xs font-normal",
								children: [
									"Applies ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "retroactively" }),
									" — all existing and future citations from this domain will be classified under the selected competitor."
								]
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "max-h-32 overflow-y-auto space-y-0.5",
							children: competitors.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => handleAddToExisting(c.id),
								disabled: saving,
								className: "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted cursor-pointer disabled:opacity-50 transition-colors",
								children: c.name
							}, c.id))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-muted-foreground",
							children: "Or create new competitor:"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: newName,
								onChange: (e) => setNewName(e.target.value),
								placeholder: "Competitor name",
								className: "h-7 text-xs",
								onKeyDown: (e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleCreateNew();
									}
								},
								disabled: saving
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								onClick: handleCreateNew,
								disabled: saving || !newName.trim(),
								className: "h-7 px-2 text-xs cursor-pointer shrink-0",
								children: "Add"
							})]
						})]
					})
				]
			})
		})]
	});
}
function TopDomainsCard({ domains, sourceTabs, maxDomains, brandId, brandName, competitors, onCompetitorAdded }) {
	const [domainSearch, setDomainSearch] = (0, import_react.useState)("");
	const [selectedCategory, setSelectedCategory] = (0, import_react.useState)("all");
	const filteredDomains = (0, import_react.useMemo)(() => {
		let result = domains;
		if (selectedCategory !== "all") result = result.filter((d) => d.category === selectedCategory);
		if (domainSearch) {
			const q = domainSearch.toLowerCase();
			result = result.filter((d) => d.domain.toLowerCase().includes(q));
		}
		return result;
	}, [
		domains,
		selectedCategory,
		domainSearch
	]);
	const { page, setPage, pageItems, totalItems } = usePagedList(filteredDomains, maxDomains);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
						className: "flex items-center gap-1.5",
						children: ["Top Cited Domains", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
							className: "max-w-xs text-sm font-normal",
							children: "The most frequently cited domains across all prompt evaluations. Each domain is colored by its category (brand, competitor, etc.)."
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Which domains LLMs reference most when responding to your prompts" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative w-full sm:w-48 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSearch, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Search domains...",
						value: domainSearch,
						onChange: (e) => {
							setDomainSearch(e.target.value);
							setPage(0);
						},
						className: "h-8 pl-8 text-xs"
					})]
				})]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [sourceTabs.length > 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnderlineTabs, {
					tabs: sourceTabs,
					activeKey: selectedCategory,
					onSelect: (key) => {
						setSelectedCategory(key);
						setPage(0);
					}
				})
			}), filteredDomains.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressBarChart, {
				items: pageItems.map((domain) => ({
					label: domain.domain,
					count: domain.count,
					category: domain.category || "other",
					action: domain.category === "other" && brandId && competitors ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrackDomainPopover, {
						domain: domain.domain,
						brandId,
						brandName,
						competitors,
						onAdded: onCompetitorAdded
					}) : void 0
				})),
				colorMapping: DOMAIN_CATEGORY_COLORS,
				percentageMode: "max"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListPagination, {
				page,
				pageSize: maxDomains,
				totalItems,
				onPageChange: setPage
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground text-center py-4",
				children: "No domains match the current filters."
			})] })
		]
	});
}
function TopUrlsCard({ urls, sourceTabs, pageTypeTabs, maxUrls, brandId, brandName, brandShare, brandIsCited }) {
	const [urlSearch, setUrlSearch] = (0, import_react.useState)("");
	const [selectedCategory, setSelectedCategory] = (0, import_react.useState)("all");
	const [selectedPageType, setSelectedPageType] = (0, import_react.useState)("all");
	const filteredUrls = (0, import_react.useMemo)(() => {
		let result = urls;
		if (selectedCategory !== "all") result = result.filter((u) => u.category === selectedCategory);
		if (selectedPageType !== "all") result = result.filter((u) => u.pageType === selectedPageType);
		if (urlSearch) {
			const q = urlSearch.toLowerCase();
			result = result.filter((u) => u.url.toLowerCase().includes(q) || u.title?.toLowerCase().includes(q) || u.domain.toLowerCase().includes(q));
		}
		return result;
	}, [
		urls,
		selectedCategory,
		selectedPageType,
		urlSearch
	]);
	const { page, setPage, pageItems, totalItems } = usePagedList(filteredUrls, maxUrls);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
						className: "flex items-center gap-1.5",
						children: ["Top Cited URLs", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
							className: "max-w-xs text-sm font-normal",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-2",
								children: "The specific pages most frequently cited by AI models. Filter by category to focus on brand, competitor, or other sources."
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Competitor" }),
								" domains are only those in your",
								" ",
								brandId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/app/$brand/settings/competitors",
									params: { brand: brandId },
									className: "underline",
									children: "tracked competitors list"
								}) : "tracked competitors list",
								"."
							] })]
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: ["Individual pages cited by LLMs", brandIsCited && brandName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						" ",
						"— ",
						brandName,
						" accounts for ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [brandShare, "%"] }),
						" of all citations"
					] })] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative w-full sm:w-48 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSearch, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Search URLs...",
						value: urlSearch,
						onChange: (e) => {
							setUrlSearch(e.target.value);
							setPage(0);
						},
						className: "h-8 pl-8 text-xs"
					})]
				})]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [
				sourceTabs.length > 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnderlineTabs, {
					tabs: sourceTabs,
					activeKey: selectedCategory,
					onSelect: (key) => {
						setSelectedCategory(key);
						setPage(0);
					}
				}),
				pageTypeTabs.length > 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center flex-wrap gap-1.5 mt-3",
					children: pageTypeTabs.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setSelectedPageType(t.key);
							setPage(0);
						},
						className: `px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors ${selectedPageType === t.key ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`,
						children: t.label
					}, t.key))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "divide-y divide-border mt-1",
					children: [pageItems.map((citation) => {
						const displayUrl = formatUrlForDisplay(citation.url);
						const domainEndIndex = displayUrl.indexOf("/");
						const domainPart = domainEndIndex > 0 ? displayUrl.substring(0, domainEndIndex) : displayUrl;
						const pathPart = domainEndIndex > 0 ? displayUrl.substring(domainEndIndex) : "";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: citation.url,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "flex items-start justify-between gap-3 py-3 group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 mb-0.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: `text-[10px] px-1.5 py-0 h-[18px] border-0 shadow-none ${getCategoryColorClass(citation.category)}`,
											children: getCategoryLabel(citation.category)
										}),
										citation.isNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: "text-[10px] px-1.5 py-0 h-[18px] border-0 shadow-none bg-green-100 text-green-700",
											children: "NEW"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-medium truncate group-hover:underline",
											children: citation.title || extractFilenameFromUrl(citation.url)
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-muted-foreground truncate",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold",
										children: domainPart
									}), pathPart && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: pathPart })]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3 shrink-0 pt-0.5",
								children: [
									citation.avgPosition != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] text-muted-foreground tabular-nums",
											children: ["avg ", citation.avgPosition.toFixed(1)]
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
										className: "text-xs",
										children: "Average citation position (lower = cited earlier in the response)"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-semibold tabular-nums min-w-[2rem] text-right",
											children: citation.count.toLocaleString()
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
										className: "text-xs",
										children: "Total times this URL was cited across all prompt evaluations"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconExternalLink, { className: "h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" })
								]
							})]
						}, citation.url);
					}), filteredUrls.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground text-center pt-8 pb-4",
						children: "No URLs match the current filters."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListPagination, {
					page,
					pageSize: maxUrls,
					totalItems,
					onPageChange: setPage
				})
			] })
		]
	});
}
var PRODUCTS_PAGE_SIZE = 10;
function PromptCountList({ prompts, brandId }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pl-5 pb-2 space-y-0.5",
		children: prompts.map((p) => brandId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/app/$brand/prompts/$promptId",
			params: {
				brand: brandId,
				promptId: p.id
			},
			className: "flex items-center justify-between py-1 group text-xs",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground group-hover:text-foreground group-hover:underline truncate min-w-0",
				children: p.value
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular-nums text-muted-foreground shrink-0 ml-3",
				children: p.count.toLocaleString()
			})]
		}, p.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between py-1 text-xs",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground truncate min-w-0",
				children: p.value
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular-nums text-muted-foreground shrink-0 ml-3",
				children: p.count.toLocaleString()
			})]
		}, p.id))
	});
}
function GoogleShoppingCard({ googleModule, brandId }) {
	const [expandedProduct, setExpandedProduct] = (0, import_react.useState)(null);
	const [productFilter, setProductFilter] = (0, import_react.useState)("all");
	const [expandedQuery, setExpandedQuery] = (0, import_react.useState)(null);
	const [showAllQueries, setShowAllQueries] = (0, import_react.useState)(false);
	const filteredProducts = (0, import_react.useMemo)(() => {
		const ps = googleModule.shopping.products;
		return productFilter === "all" ? ps : ps.filter((p) => p.attribution === productFilter);
	}, [googleModule, productFilter]);
	const productCounts = (0, import_react.useMemo)(() => {
		const ps = googleModule.shopping.products;
		return {
			all: ps.length,
			brand: ps.filter((p) => p.attribution === "brand").length,
			competitor: ps.filter((p) => p.attribution === "competitor").length
		};
	}, [googleModule]);
	const { page, setPage, pageItems, totalItems } = usePagedList(filteredProducts, PRODUCTS_PAGE_SIZE);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
			className: "flex items-center gap-1.5",
			children: ["Google Shopping", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
				className: "max-w-xs text-sm font-normal",
				children: "Product cards Google AI Mode showed when answering your prompts. The number next to each is how many times that card appeared across results (card inclusions, not unique products). Kept separate from the citation mix above."
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
			"Products Google AI Mode surfaced —",
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium text-emerald-600",
				children: googleModule.shopping.brandCount.toLocaleString()
			}),
			" ",
			"appearances for yours vs",
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium text-red-600",
				children: googleModule.shopping.competitorCount.toLocaleString()
			}),
			" for competitors"
		] })] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-6",
			children: [googleModule.shopping.products.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between mb-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "text-sm font-medium shrink-0",
						children: "Products"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-1",
						children: [
							["all", "All"],
							["brand", "Yours"],
							["competitor", "Competitors"]
						].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								setProductFilter(key);
								setPage(0);
							},
							className: `px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors ${productFilter === key ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`,
							children: [
								label,
								" (",
								productCounts[key].toLocaleString(),
								")"
							]
						}, key))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "divide-y divide-border/50",
					children: pageItems.map((product) => {
						const isExpanded = expandedProduct === product.name;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between py-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setExpandedProduct(isExpanded ? null : product.name),
								className: "flex items-center gap-1.5 min-w-0 cursor-pointer group text-left",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronDown, { className: `h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}` }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `shrink-0 rounded-full h-2 w-2 ${attributionDotClass(product.attribution)}` }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-medium text-foreground group-hover:underline truncate",
										children: product.name
									}),
									product.attribution === "competitor" && product.competitorName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-muted-foreground whitespace-nowrap shrink-0",
										children: [
											"(",
											product.competitorName,
											")"
										]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-semibold tabular-nums shrink-0",
								children: product.count.toLocaleString()
							})]
						}), isExpanded && product.prompts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptCountList, {
							prompts: product.prompts,
							brandId
						})] }, product.name);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListPagination, {
					page,
					pageSize: PRODUCTS_PAGE_SIZE,
					totalItems,
					onPageChange: setPage
				})
			] }), googleModule.search.queries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
					className: "text-sm font-medium mb-2",
					children: "Search queries"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "divide-y divide-border/50",
					children: (showAllQueries ? googleModule.search.queries : googleModule.search.queries.slice(0, 5)).map((q) => {
						const isExpanded = expandedQuery === q.query;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between py-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setExpandedQuery(isExpanded ? null : q.query),
								className: "flex items-center gap-1.5 min-w-0 cursor-pointer group text-left",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronDown, { className: `h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}` }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSearch, { className: "h-3 w-3 shrink-0 text-muted-foreground" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-medium text-foreground group-hover:underline truncate",
										children: q.query
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-semibold tabular-nums shrink-0",
								children: q.count.toLocaleString()
							})]
						}), isExpanded && q.prompts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptCountList, {
							prompts: q.prompts,
							brandId
						})] }, q.query);
					})
				}),
				googleModule.search.queries.length > 5 && !showAllQueries && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setShowAllQueries(true),
					className: "mt-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-3 py-1.5 rounded-md border border-border hover:bg-muted/60 transition-colors",
					children: [
						"Show ",
						googleModule.search.queries.length - 5,
						" more"
					]
				})
			] })]
		})
	] });
}
var SUBREDDITS_PAGE_SIZE = 8;
/** Exact-host check (citation `domain` is a normalized lowercase hostname).
*  A substring match would also catch lookalikes such as
*  "notreddit.com" or "reddit.com.evil.net" (CodeQL js/incomplete-url-substring-sanitization). */
var isRedditDomain = (domain) => domain === "reddit.com" || domain.endsWith(".reddit.com");
function useSubredditData(specificUrls, whatsChanged) {
	return (0, import_react.useMemo)(() => {
		const droppedUrlSet = new Set(whatsChanged?.droppedUrls.filter((u) => isRedditDomain(u.domain)).map((u) => extractSubreddit(u.url)).filter(Boolean) ?? []);
		const map = /* @__PURE__ */ new Map();
		for (const u of specificUrls) {
			if (!isRedditDomain(u.domain)) continue;
			const sub = extractSubreddit(u.url);
			if (!sub) continue;
			const existing = map.get(sub);
			if (existing) {
				existing.count += u.count;
				existing.totalPages += 1;
				if (u.isNew) existing.newPages += 1;
				existing.urls.push({
					url: u.url,
					title: u.title,
					count: u.count,
					isNew: u.isNew
				});
			} else map.set(sub, {
				count: u.count,
				newPages: u.isNew ? 1 : 0,
				totalPages: 1,
				urls: [{
					url: u.url,
					title: u.title,
					count: u.count,
					isNew: u.isNew
				}]
			});
		}
		return Array.from(map.entries()).map(([name, data]) => ({
			name,
			count: data.count,
			newPages: data.newPages,
			totalPages: data.totalPages,
			allNew: data.newPages === data.totalPages,
			hasDropped: droppedUrlSet.has(name),
			urls: data.urls.sort((a, b) => b.count - a.count)
		})).sort((a, b) => b.count - a.count);
	}, [specificUrls, whatsChanged]);
}
function RedditCard({ subreddits }) {
	const [expandedSubreddit, setExpandedSubreddit] = (0, import_react.useState)(null);
	const { page, setPage, pageItems, totalItems } = usePagedList(subreddits, SUBREDDITS_PAGE_SIZE);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
			className: "flex items-center gap-1.5",
			children: ["Reddit", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
				className: "max-w-xs text-sm font-normal",
				children: "Reddit communities most frequently cited by AI models. Extracted from all reddit.com URLs in your citation data."
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Top cited subreddits — which Reddit communities AI models reference when answering your prompts" })] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "divide-y divide-border/50",
			children: pageItems.map((sub) => {
				const isExpanded = expandedSubreddit === sub.name;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setExpandedSubreddit(isExpanded ? null : sub.name),
						className: "flex items-center gap-1.5 min-w-0 cursor-pointer group",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronDown, { className: `h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}` }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-medium text-foreground group-hover:underline truncate",
								children: sub.name
							}),
							sub.allNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								className: "text-[10px] px-1.5 py-0 h-[18px] border-0 shadow-none bg-green-100 text-green-700",
								children: "NEW"
							}),
							!sub.allNew && sub.newPages > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[10px] text-green-600 whitespace-nowrap",
								children: [
									"+",
									sub.newPages,
									" new"
								]
							}),
							sub.hasDropped && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-red-500 whitespace-nowrap",
								children: "some dropped"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 shrink-0 ml-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-semibold tabular-nums",
							children: sub.count.toLocaleString()
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: `https://reddit.com/${sub.name}`,
							target: "_blank",
							rel: "noopener noreferrer",
							onClick: (e) => e.stopPropagation(),
							className: "text-muted-foreground hover:text-foreground transition-colors",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconExternalLink, { className: "h-3.5 w-3.5" })
						})]
					})]
				}), isExpanded && sub.urls.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pl-5 pb-2 space-y-0.5",
					children: sub.urls.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: u.url,
						target: "_blank",
						rel: "noopener noreferrer",
						className: "flex items-center justify-between py-1 group text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground group-hover:text-foreground group-hover:underline truncate min-w-0 flex items-center gap-1.5",
							children: [u.title || formatUrlForDisplay(u.url), u.isNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								className: "text-[9px] px-1 py-0 h-[14px] border-0 shadow-none bg-green-100 text-green-700 shrink-0",
								children: "NEW"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums text-muted-foreground shrink-0 ml-3",
							children: u.count.toLocaleString()
						})]
					}, u.url))
				})] }, sub.name);
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListPagination, {
			page,
			pageSize: SUBREDDITS_PAGE_SIZE,
			totalItems,
			onPageChange: setPage
		})] })
	] });
}
/** Composes the citation sections. Each card owns its own in-card filter
*  state (search, tabs, pagination); this component only derives the data
*  every section shares. Section visibility keys off the UNFILTERED data —
*  in-card filters must never hide a whole section (issue #322). */
function CitationsDisplay({ citationData, brandId, brandName, showStats = false, maxDomains = 10, maxUrls = 20, days = 7, onCompetitorAdded }) {
	const lastTrendPoint = citationData.citationTimeSeries?.[citationData.citationTimeSeries.length - 1];
	const brandShare = lastTrendPoint ? lastTrendPoint.brand ?? 0 : citationData.totalCitations > 0 ? Math.round(citationData.categoryCounts.brand / citationData.totalCitations * 100) : 0;
	const hasGaps = !!(citationData.competitorOnlyPrompts && citationData.competitorOnlyPrompts.length > 0 && brandId);
	const chartSourceCategories = (0, import_react.useMemo)(() => CITATION_CATEGORIES.filter((c) => (citationData.categoryCounts[c] ?? 0) > 0), [citationData.categoryCounts]);
	const chartPageTypes = (0, import_react.useMemo)(() => {
		const present = new Set((citationData.pageTypeDistribution ?? []).filter((d) => d.count > 0).map((d) => d.pageType));
		return CITATION_PAGE_TYPES.filter((p) => present.has(p));
	}, [citationData.pageTypeDistribution]);
	const urlSourceTabs = (0, import_react.useMemo)(() => [{
		key: "all",
		label: "All Sources"
	}, ...chartSourceCategories.map((c) => ({
		key: c,
		label: CATEGORY_CONFIG[c].label
	}))], [chartSourceCategories]);
	const domainSourceTabs = urlSourceTabs;
	const urlPageTypeTabs = (0, import_react.useMemo)(() => [{
		key: "all",
		label: "All Page Types"
	}, ...chartPageTypes.map((p) => ({
		key: p,
		label: PAGE_TYPE_CONFIG[p].label
	}))], [chartPageTypes]);
	const googleModule = citationData.googleModule;
	const subredditData = useSubredditData(citationData.specificUrls, citationData.whatsChanged);
	const whatsChanged = citationData.whatsChanged;
	const totalChanges = whatsChanged ? whatsChanged.newUrls.length + whatsChanged.droppedUrls.length + whatsChanged.titleChanges.length + whatsChanged.newDomains.length + whatsChanged.droppedDomains.length : 0;
	if (citationData.totalCitations === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		showStats && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CitationStatsCards, {
			brandShare,
			uniqueDomains: citationData.uniqueDomains,
			totalCitations: citationData.totalCitations
		}),
		citationData.citationTimeSeries && citationData.citationTimeSeries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendAreaChart, {
			title: "Citation Categories",
			tooltip: "Share of citations by source category over time, as a percentage of all citations each day. Smoothed to account for staggered prompt schedules; Google AI Mode search/shopping are excluded (see the Google Shopping section).",
			data: citationData.citationTimeSeries ?? [],
			keys: chartSourceCategories,
			meta: CATEGORY_META
		}),
		citationData.pageTypeTimeSeries && citationData.pageTypeTimeSeries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendAreaChart, {
			title: "Citation Page Types",
			tooltip: "Share of citations by page type over time — what kind of page each citation points to, inferred from the URL and title.",
			data: citationData.pageTypeTimeSeries ?? [],
			keys: chartPageTypes,
			meta: PAGE_TYPE_META
		}),
		(totalChanges > 0 || hasGaps) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: totalChanges > 0 && hasGaps ? "grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch" : "contents",
			children: [totalChanges > 0 && whatsChanged && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecentChangesCard, {
				whatsChanged,
				days
			}), hasGaps && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContentGapsCard, {
				prompts: citationData.competitorOnlyPrompts,
				brandId
			})]
		}),
		citationData.domainDistribution.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopDomainsCard, {
			domains: citationData.domainDistribution,
			sourceTabs: domainSourceTabs,
			maxDomains,
			brandId,
			brandName,
			competitors: citationData.competitors,
			onCompetitorAdded
		}),
		citationData.specificUrls.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopUrlsCard, {
			urls: citationData.specificUrls,
			sourceTabs: urlSourceTabs,
			pageTypeTabs: urlPageTypeTabs,
			maxUrls,
			brandId,
			brandName,
			brandShare,
			brandIsCited: citationData.categoryCounts.brand > 0
		}),
		googleModule && googleModule.shopping.products.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleShoppingCard, {
			googleModule,
			brandId
		}),
		subredditData.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedditCard, { subreddits: subredditData })
	] });
}
//#endregion
export { ListPagination as n, CitationsDisplay as t };

//# sourceMappingURL=citations-display-BG6q56FQ.mjs.map