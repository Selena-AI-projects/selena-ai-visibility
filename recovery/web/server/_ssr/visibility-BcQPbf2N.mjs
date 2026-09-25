import { i as __toESM } from "../_runtime.mjs";
import { A as IconInfoCircle, H as IconChevronDown, N as IconExternalLink, P as IconEditCircle, T as IconLoader2, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime, n as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { _ as useNavigate, g as useRouteContext, h as require_react_dom, m as Link, v as useSearch, y as useParams } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, i as CardFooter, n as CardContent, o as CardTitle, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Separator } from "./separator-D7PdY237.mjs";
import { t as SelenaWordmark } from "./selena-wordmark-DhsBFluR.mjs";
import { t as Skeleton } from "./skeleton-BcIvnIuu.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
import { C as Inbox, L as ArrowUpDown, T as Download } from "../_libs/lucide-react.mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { c as generateDateRange, l as getBadgeClassName, m as selectCompetitorsToDisplay, o as extendLinesToChartEdges, p as isExtendedDataPoint, s as filterAndCompleteChartData, u as getBadgeVariant } from "./chart-utils-fSx3DwB3.mjs";
import { n as useBrand } from "./use-brands-CqDybx5x.mjs";
import { a as useListFilters } from "./use-list-filters-BRE2FD-y.mjs";
import { a as DropdownMenuLabel, c as DropdownMenuSeparator, i as DropdownMenuItem, l as DropdownMenuTrigger, n as DropdownMenuContent, o as DropdownMenuRadioGroup, s as DropdownMenuRadioItem, t as DropdownMenu } from "./dropdown-menu-_EIWZQsZ.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { i as getPromptWebQueryFn } from "./prompts-C2FXcuMy.mjs";
import { r as usePromptsSummary } from "./use-prompts-summary-DoiBkiz3.mjs";
import { a as YAxis, c as Area, i as LineChart, l as Line, m as ResponsiveContainer, o as XAxis, r as BarChart, s as Bar, t as AreaChart, u as CartesianGrid } from "../_libs/recharts+[...].mjs";
import { n as ChartTooltip, r as ChartTooltipContent, t as ChartContainer } from "./chart-WE9PDFAP.mjs";
import { t as ChartFooter } from "./chart-footer-CAOBHPPn.mjs";
import { t as html2canvas } from "../_libs/html2canvas-pro.mjs";
import { n as FilterTriggerButton } from "./filter-bar-CrWyPYxO.mjs";
import { n as PageHeader } from "./page-header-Da9U5Lfw.mjs";
import { t as FilteredListShell } from "./filtered-list-shell-DY0s4F_9.mjs";
import { t as HistoryButton } from "./history-button-3ijYslpE.mjs";
import { a as orderPrompts, i as coercePromptOrder, n as PROMPT_ORDER_OPTIONS, r as Route, t as DEFAULT_PROMPT_ORDER } from "./visibility-DDW5aqTk.mjs";
import { t as useWindowVirtualizer } from "../_libs/@tanstack/react-virtual+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/visibility-BcQPbf2N.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom());
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "3a98a09c-c63b-43e5-b381-34346526e672", e._sentryDebugIdIdentifier = "sentry-dbid-3a98a09c-c63b-43e5-b381-34346526e672");
	} catch (e) {}
})();
/**
* Server functions for visibility and chart data.
* Replaces:
*   - apps/web/src/app/api/brands/[id]/batch-chart-data/route.ts
*   - apps/web/src/app/api/brands/[id]/filtered-visibility/route.ts
*/
var getBatchChartDataFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: _enum([
		"1w",
		"1m",
		"3m",
		"6m",
		"1y",
		"all"
	]).default("1m"),
	model: string().optional(),
	tags: string().optional(),
	search: string().optional(),
	timezone: string().default("UTC")
})).handler(createSsrRpc("31d4492d78cc87721df43de3556031796692c5ad9f1d5ac589a4366d275cd4c1"));
var getFilteredVisibilityFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: _enum([
		"1w",
		"1m",
		"3m",
		"6m",
		"1y",
		"all"
	]).default("1m"),
	model: string().optional(),
	tags: string().optional(),
	search: string().optional(),
	timezone: string().default("UTC")
})).handler(createSsrRpc("8062851249afe4bf238a5b9ba61d89cff868973f64782abaa66f94c3db692a62"));
function useBatchChartData(brandId, filters) {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const query = useQuery({
		queryKey: [
			"batch-chart-data",
			resolvedBrandId,
			filters?.lookback,
			filters?.model,
			filters?.tags?.join(","),
			filters?.search
		],
		queryFn: () => getBatchChartDataFn({ data: {
			brandId: resolvedBrandId,
			lookback: filters?.lookback || "1m",
			model: filters?.model,
			tags: filters?.tags?.join(","),
			search: filters?.search,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
		} }),
		enabled: !!resolvedBrandId,
		staleTime: 6e4,
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		placeholderData: (prev) => prev
	});
	return {
		batchChartData: query.data,
		isLoading: query.isLoading,
		isValidating: query.isFetching,
		isError: query.error,
		revalidate: query.refetch
	};
}
/** The brand's own line is the one people are looking for, so it carries more
*  weight than the competitors it's plotted against. */
var BRAND_STROKE_WIDTH = 3;
var COMPETITOR_STROKE_WIDTH = 2;
/** How far the other series recede while one is singled out. */
var DIMMED_OPACITY = .25;
/** Ring thickness on the hollow competitor dots. */
var DOT_RING_WIDTH = 1.5;
/** Legend that doubles as a way to pick a series out of the chart, since colour
*  alone can't separate four lines for a colourblind reader.
*
*  Three ways in, because hover alone doesn't reach everyone: point at an entry
*  for a transient look, tab to it for the same from the keyboard, or click to
*  pin it — which is the only one that works on a touchscreen, and the only one
*  that survives moving the mouse away.
*
*  Clearing on pointer-leave is handled by the container rather than each
*  button. Per-button leave would fire while crossing the gap between two
*  entries, flashing everything back to full opacity mid-move. */
function SeriesLegend({ payload, active, pinned, onHover, onPin }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("fieldset", {
		"aria-label": "Chart series",
		className: "flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2",
		onMouseLeave: () => onHover(null),
		children: payload.map((item) => {
			const isActive = active === item.dataKey;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				"aria-pressed": pinned === item.dataKey,
				className: "flex items-center gap-1.5 rounded-sm text-muted-foreground text-xs focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
				style: { opacity: active && !isActive ? .4 : 1 },
				onMouseEnter: () => onHover(item.dataKey),
				onFocus: () => onHover(item.dataKey),
				onBlur: () => onHover(null),
				onClick: () => onPin(pinned === item.dataKey ? null : item.dataKey),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-2 w-2 shrink-0 rounded-[2px]",
					style: { backgroundColor: item.color }
				}), item.value]
			}, item.dataKey);
		})
	});
}
function BaseChart({ data, lookback, title, visibility, showTitle = false, showBadge = false, brand, competitors, isAnimationActive = false, chartType = "line", chartColors: chartColorsProp, chartHeight = "250px" }) {
	const completeData = filterAndCompleteChartData(data, lookback);
	const context = useRouteContext({ strict: false });
	const [hoveredSeries, setHoveredSeries] = import_react.useState(null);
	const [pinnedSeries, setPinnedSeries] = import_react.useState(null);
	const activeSeries = pinnedSeries ?? hoveredSeries;
	const sortedAllCompetitors = [...competitors].sort((a, b) => a.name.localeCompare(b.name));
	const sortedSelectedCompetitors = [...selectCompetitorsToDisplay(competitors, completeData, 3)].sort((a, b) => a.name.localeCompare(b.name));
	const chartColors = chartColorsProp ?? context.clientConfig?.branding.chartColors ?? [];
	const chartConfig = {
		visitors: { label: "Visibility" },
		[brand.id]: {
			label: brand.name,
			color: chartColors[0]
		}
	};
	sortedAllCompetitors.forEach((competitor, index) => {
		const colorIndex = (index + 1) % chartColors.length;
		chartConfig[competitor.id] = {
			label: competitor.name,
			color: chartColors[colorIndex]
		};
	});
	const dataKeys = [...sortedSelectedCompetitors.map((c) => c.id), brand.id];
	const strokeWidthFor = (key) => key === brand.id ? BRAND_STROKE_WIDTH : COMPETITOR_STROKE_WIDTH;
	/** Solid dot for the brand, hollow for competitors — a second, quiet cue for
	*  which line is yours. Radii are picked so both read the same diameter; only
	*  the centre differs. */
	const dotProps = (key, size) => key === brand.id ? {
		r: size,
		fill: `var(--color-${key})`,
		opacity: opacityFor(key)
	} : {
		r: size - DOT_RING_WIDTH / 2,
		fill: "var(--card)",
		stroke: `var(--color-${key})`,
		strokeWidth: DOT_RING_WIDTH,
		opacity: opacityFor(key)
	};
	const opacityFor = (key) => activeSeries && activeSeries !== key ? DIMMED_OPACITY : 1;
	const legendPayload = [{
		value: brand.name,
		dataKey: brand.id,
		color: chartConfig[brand.id].color
	}, ...sortedSelectedCompetitors.map((c) => ({
		value: c.name,
		dataKey: c.id,
		color: chartConfig[c.id].color
	}))];
	const chartData = chartType === "bar" ? completeData.filter((point) => {
		return dataKeys.some((key) => {
			const value = point[key];
			return value !== null && value !== void 0;
		});
	}) : extendLinesToChartEdges(completeData, dataKeys).map((point) => {
		const newPoint = { ...point };
		for (const key of dataKeys) if (isExtendedDataPoint(point, key)) newPoint[`${key}_solid`] = null;
		else newPoint[`${key}_solid`] = point[key];
		return newPoint;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex-1 space-y-2",
		children: [showTitle && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-center gap-2",
			children: [title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-medium capitalize",
				children: title
			}), showBadge && visibility !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
				variant: getBadgeVariant(visibility),
				className: `text-xs ${getBadgeClassName(visibility)}`,
				children: [visibility, "%"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col",
			style: { height: chartHeight },
			children: [chartType === "bar" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartContainer, {
				config: chartConfig,
				className: "aspect-auto min-h-0 w-full flex-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
					data: chartData,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, { vertical: false }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
							dataKey: "date",
							tickLine: false,
							axisLine: false,
							tickMargin: 8,
							minTickGap: 32,
							domain: ["dataMin", "dataMax"],
							type: "category",
							tickFormatter: (value) => {
								const [year, month, day] = value.split("-").map(Number);
								return new Date(year, month - 1, day).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric"
								});
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
							domain: [0, "auto"],
							type: "number",
							allowDataOverflow: false,
							tickLine: false,
							axisLine: false,
							tickMargin: 8,
							tickCount: 6,
							tickFormatter: (value) => `${value}%`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {
							isAnimationActive: false,
							cursor: false,
							content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltipContent, {
								labelFormatter: (value) => {
									const [year, month, day] = String(value).split("-").map(Number);
									return new Date(year, month - 1, day).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric"
									});
								},
								indicator: "dot",
								formatter: (value, name, item, index) => {
									const indicatorColor = chartConfig[name]?.color;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "shrink-0 rounded-[2px] h-2.5 w-2.5",
										style: { backgroundColor: indicatorColor }
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-1 justify-between gap-4 leading-none items-center",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "grid gap-1.5",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground",
												children: chartConfig[name]?.label || name
											})
										}), value !== null && value !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-foreground font-mono font-xs tabular-nums",
											children: [value, "%"]
										})]
									})] });
								}
							})
						}),
						dataKeys.map((key, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
							dataKey: key,
							fill: `var(--color-${key})`,
							fillOpacity: opacityFor(key),
							minPointSize: 2,
							radius: 2
						}, key))
					]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartContainer, {
				config: chartConfig,
				className: "aspect-auto min-h-0 w-full flex-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
					data: chartData,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, { vertical: false }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
							dataKey: "date",
							tickLine: false,
							axisLine: false,
							tickMargin: 8,
							minTickGap: 32,
							domain: ["dataMin", "dataMax"],
							type: "category",
							tickFormatter: (value) => {
								const [year, month, day] = value.split("-").map(Number);
								return new Date(year, month - 1, day).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric"
								});
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
							domain: [0, "auto"],
							type: "number",
							allowDataOverflow: false,
							tickLine: false,
							axisLine: false,
							tickMargin: 8,
							tickCount: 6,
							tickFormatter: (value) => `${value}%`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {
							isAnimationActive: false,
							cursor: false,
							content: ({ active, payload, label }) => {
								if (!active || !payload?.length) return null;
								const filteredPayload = payload.filter((item) => {
									const key = item.dataKey;
									if (key.endsWith("_solid")) return false;
									if (item.payload && isExtendedDataPoint(item.payload, key)) return false;
									if (item.value === null || item.value === void 0) return false;
									return true;
								});
								if (filteredPayload.length === 0) return null;
								const [year, month, day] = label.split("-").map(Number);
								const formattedDate = new Date(year, month - 1, day).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric"
								});
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium",
										children: formattedDate
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid gap-1.5",
										children: filteredPayload.map((item) => {
											const indicatorColor = chartConfig[item.dataKey]?.color;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex w-full items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "shrink-0 rounded-[2px] h-2.5 w-2.5",
													style: { backgroundColor: indicatorColor }
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex flex-1 justify-between gap-4 leading-none items-center",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-muted-foreground",
														children: chartConfig[item.dataKey]?.label || item.dataKey
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-foreground font-mono font-xs tabular-nums",
														children: [item.value, "%"]
													})]
												})]
											}, item.dataKey);
										})
									})]
								});
							}
						}),
						dataKeys.flatMap((key) => [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							dataKey: key,
							name: `${key}-dashed`,
							type: "bump",
							stroke: `var(--color-${key})`,
							strokeWidth: strokeWidthFor(key),
							strokeOpacity: opacityFor(key),
							strokeDasharray: "4 4",
							dot: false,
							activeDot: false,
							connectNulls: true,
							isAnimationActive,
							legendType: "none"
						}, `${key}-dashed`), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							dataKey: `${key}_solid`,
							name: key,
							type: "bump",
							stroke: `var(--color-${key})`,
							strokeWidth: strokeWidthFor(key),
							strokeOpacity: opacityFor(key),
							dot: ({ cx, cy, payload, value }) => {
								if (!payload || isExtendedDataPoint(payload, key) || value === null || value === void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", {}, `dot-empty-${key}-${cx}`);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx,
									cy,
									...dotProps(key, 3)
								}, `dot-${key}-${cx}`);
							},
							activeDot: ({ cx, cy, payload, value }) => {
								if (!payload || isExtendedDataPoint(payload, key) || value === null || value === void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", {}, `activedot-empty-${key}-${cx}`);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx,
									cy,
									...dotProps(key, 5)
								}, `activedot-${key}-${cx}`);
							},
							connectNulls: true,
							isAnimationActive
						}, `${key}-solid`)])
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeriesLegend, {
				payload: legendPayload,
				active: activeSeries,
				pinned: pinnedSeries,
				onHover: setHoveredSeries,
				onPin: setPinnedSeries
			})]
		})]
	});
}
function OptimizeButton$1(_props) {
	return null;
}
/**
* Generate optimization URL for a prompt using template substitution
*
* Template placeholders:
* - {brandId} - Organization/brand ID
* - {prompt} - The prompt text (URL encoded)
* - {webQuery} - The search query (URL encoded); callers pass the prompt
*   itself when no genuine query is known
*/
function generateOptimizationUrl(urlTemplate, promptValue, brandId, webQuery) {
	return urlTemplate.replace("{brandId}", encodeURIComponent(brandId)).replace("{prompt}", encodeURIComponent(promptValue)).replace("{webQuery}", encodeURIComponent(webQuery));
}
function getModelDisplayName(model) {
	switch (model) {
		case "openai": return "ChatGPT";
		case "anthropic": return "Claude";
		case "google": return "Gemini";
		default: return model;
	}
}
function OptimizeButton({ brandId, selectedModel = "all", availableModels = [
	"openai",
	"anthropic",
	"google"
], lookback = "1m", promptName, promptId, parentName, optimizationUrlTemplate, fetchWebQuery }) {
	const [loadingKey, setLoadingKey] = (0, import_react.useState)(null);
	if (!promptName || !promptId || !brandId || !parentName || !optimizationUrlTemplate) return null;
	const handleOptimizeClick = async (e, model) => {
		e.preventDefault();
		const key = `${model || "all"}-${promptId}`;
		setLoadingKey(key);
		try {
			let webQuery = null;
			if (fetchWebQuery) {
				const webQueryData = await fetchWebQuery(promptId, lookback ?? "1m", model);
				webQuery = model ? webQueryData.modelWebQueries[model] : webQueryData.webQuery;
			}
			const url = generateOptimizationUrl(optimizationUrlTemplate, promptName, brandId, webQuery || promptName);
			window.open(url, "_blank", "noopener,noreferrer");
		} catch (error) {
			console.error("Failed to fetch web query:", error);
			const url = generateOptimizationUrl(optimizationUrlTemplate, promptName, brandId, promptName);
			window.open(url, "_blank", "noopener,noreferrer");
		} finally {
			setLoadingKey(null);
		}
	};
	const isLoading = (model) => {
		return loadingKey === `${model || "all"}-${promptId}`;
	};
	if (selectedModel !== "all") {
		const loading = isLoading(selectedModel);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			size: "sm",
			className: "text-xs cursor-pointer p-0 m-0 h-6",
			onClick: (e) => handleOptimizeClick(e, selectedModel),
			disabled: loading,
			children: [
				loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, {
					size: 12,
					className: "size-3 mr-0.5 animate-spin"
				}),
				"Optimize with ",
				parentName,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconExternalLink, {
					size: 12,
					className: "size-3 ml-0.5"
				})
			]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			size: "sm",
			className: "text-xs cursor-pointer p-0 m-0 h-6",
			children: [
				"Optimize with ",
				parentName,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronDown, {
					size: 12,
					className: "size-3 ml-0.5"
				})
			]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuContent, {
		align: "end",
		className: "w-48",
		children: availableModels.map((model, index) => {
			const modelName = getModelDisplayName(model);
			const loading = isLoading(model);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				index > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuLabel, { children: ["Optimize for ", modelName] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
					className: "cursor-pointer",
					onClick: (e) => handleOptimizeClick(e, model),
					disabled: loading,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between w-full text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: promptName }), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, {
							size: 12,
							className: "size-3 ml-2 animate-spin"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconExternalLink, {
							size: 12,
							className: "size-3 ml-2"
						})]
					})
				})
			] }, model);
		})
	})] });
}
var OPTIMIZE_BUTTON_BY_MODE = {
	local: OptimizeButton$1,
	demo: OptimizeButton$1,
	whitelabel: (props) => OptimizeButton({
		...props,
		parentName: props.parentName ?? "",
		optimizationUrlTemplate: props.optimizationUrlTemplate ?? ""
	}),
	cloud: OptimizeButton$1
};
/**
* Select the correct OptimizeButton component for the current deployment mode.
*/
function getOptimizeButtonForMode(mode) {
	return OPTIMIZE_BUTTON_BY_MODE[mode];
}
function ChartActionsFooter({ promptId, promptName, brandId, onDownload, isDownloading = false, selectedModel = "all", availableModels = [], lookback = "1m" }) {
	const isSinglePrompt = Boolean(promptId && brandId);
	const context = useRouteContext({ strict: false });
	const mode = context.clientConfig?.mode ?? "local";
	const showOptimizeButton = context.clientConfig?.features.showOptimizeButton ?? false;
	const { parentName, optimizationUrlTemplate } = context.clientConfig?.branding ?? {};
	const OptimizeButton = getOptimizeButtonForMode(mode);
	const fetchWebQuery = (0, import_react.useCallback)(async (pId, lb, model) => {
		if (!brandId) throw new Error("No brand ID");
		return getPromptWebQueryFn({ data: {
			brandId,
			promptId: pId,
			lookback: lb,
			model,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
		} });
	}, [brandId]);
	if (!isSinglePrompt) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center justify-between gap-2 w-full",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryButton, {
				promptName,
				promptId,
				brandId
			}), onDownload && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				onClick: onDownload,
				disabled: isDownloading,
				size: "sm",
				variant: "secondary",
				className: "text-xs cursor-pointer h-6 flex items-center px-2",
				title: "Download chart as PNG",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-3 mr-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-normal",
					children: isDownloading ? "Exporting..." : "Export (PNG)"
				})]
			})]
		}), showOptimizeButton && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OptimizeButton, {
			promptName,
			promptId,
			brandId,
			selectedModel,
			availableModels,
			lookback,
			parentName: parentName ?? "",
			optimizationUrlTemplate: optimizationUrlTemplate ?? "",
			fetchWebQuery
		})]
	}) });
}
function TextHighlighter({ text, highlight, className = "", highlightClassName = "bg-yellow-200 dark:bg-yellow-800 rounded-sm" }) {
	if (!highlight || highlight.trim() === "") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className,
		children: text
	});
	const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`(${escapedHighlight})`, "gi");
	const segments = text.split(regex).map((part, i) => ({
		key: `${i}-${part.slice(0, 8)}`,
		part,
		isMatch: part.toLowerCase() === highlight.toLowerCase()
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className,
		children: segments.map((seg) => seg.isMatch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mark", {
			className: highlightClassName,
			children: seg.part
		}, seg.key) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Fragment, { children: seg.part }, seg.key))
	});
}
var EXPORT_W = 1200;
var HEADER_H = 56;
var HEADER_TOP = 16;
var GAP_HEADER_CARD = 16;
var CHART_H = 436;
function ChartExportPreview({ promptName, visibility, data, lookback, brand, competitors, branding }) {
	const name = branding.name || "Selena Systems";
	const isWhitelabel = branding.isWhitelabel && branding.name !== "Selena Systems";
	const domain = isWhitelabel ? branding.parentUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "" : "selenasystems.com";
	const hasCustomIcon = branding.icon && branding.icon !== "/icons/selena-icon.svg";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			width: EXPORT_W,
			height: 628,
			paddingTop: HEADER_TOP,
			fontSize: 16
		},
		className: "bg-white overflow-hidden flex flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					height: HEADER_H,
					marginBottom: GAP_HEADER_CARD
				},
				className: "flex items-center justify-between px-10 gap-6 shrink-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-semibold text-gray-900 truncate flex-1 min-w-0",
					style: { fontSize: 22 },
					title: promptName,
					children: promptName
				}), visibility !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					variant: getBadgeVariant(visibility),
					className: `${getBadgeClassName(visibility)} shrink-0`,
					style: {
						fontSize: 16,
						padding: "4px 14px"
					},
					children: [visibility, "% Visibility"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-8 shrink-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-xl border border-gray-200 overflow-hidden pl-0",
					style: {
						paddingRight: 12,
						paddingTop: 12,
						paddingBottom: 8
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BaseChart, {
						data,
						lookback,
						brand,
						competitors,
						isAnimationActive: false,
						chartType: "line",
						chartColors: branding.chartColors,
						chartHeight: `${CHART_H}px`
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 flex items-center justify-between px-10 min-h-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [isWhitelabel && hasCustomIcon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: branding.icon,
						alt: `${name} logo`,
						style: {
							width: 28,
							height: 28
						},
						className: "object-contain",
						crossOrigin: "anonymous"
					}), isWhitelabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { fontSize: 18 },
						className: "text-gray-500 font-semibold",
						children: name
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaWordmark, { className: "text-[#181614]" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: { fontSize: 18 },
					className: "text-gray-400 font-medium",
					children: domain
				})]
			})
		]
	});
}
function useChartExport(fileName) {
	const [isExporting, setIsExporting] = (0, import_react.useState)(false);
	const [exportData, setExportData] = (0, import_react.useState)(null);
	const containerRef = (0, import_react.useRef)(null);
	const exportingRef = (0, import_react.useRef)(false);
	const context = useRouteContext({ strict: false });
	const branding = context.clientConfig?.branding;
	const mode = context.clientConfig?.mode;
	return {
		isExporting,
		handleExport: (0, import_react.useCallback)(async (data) => {
			if (exportingRef.current) return;
			exportingRef.current = true;
			setIsExporting(true);
			const exportProps = {
				...data,
				branding: {
					name: branding?.name,
					icon: branding?.icon,
					parentUrl: branding?.parentUrl,
					isWhitelabel: mode === "whitelabel",
					chartColors: branding?.chartColors ?? []
				}
			};
			setExportData(exportProps);
			await new Promise((r) => setTimeout(r, 200));
			try {
				if (!containerRef.current) throw new Error("Export container not mounted");
				const canvas = await html2canvas(containerRef.current, {
					scale: 1,
					backgroundColor: "#ffffff",
					logging: false,
					useCORS: true
				});
				const link = document.createElement("a");
				link.download = `${fileName}.png`;
				link.href = canvas.toDataURL("image/png");
				link.click();
			} catch (error) {
				console.error("Error exporting chart:", error);
			} finally {
				setExportData(null);
				exportingRef.current = false;
				setIsExporting(false);
			}
		}, [
			branding,
			mode,
			fileName
		]),
		portal: exportData ? (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: containerRef,
			style: {
				position: "fixed",
				left: "-9999px",
				top: 0,
				zIndex: -1,
				pointerEvents: "none"
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartExportPreview, { ...exportData })
		}), document.body) : null
	};
}
var ChartDataContext = (0, import_react.createContext)(null);
function ChartDataProvider({ children, batchData, brand, competitors, startDate, endDate, isLoading }) {
	const dateRange = (0, import_react.useMemo)(() => {
		return generateDateRange(startDate, endDate);
	}, [startDate, endDate]);
	const sortedCompetitors = (0, import_react.useMemo)(() => {
		return [...competitors].sort((a, b) => a.name.localeCompare(b.name));
	}, [competitors]);
	const dataByPrompt = (0, import_react.useMemo)(() => {
		if (!batchData) return /* @__PURE__ */ new Map();
		const map = /* @__PURE__ */ new Map();
		for (const point of batchData) {
			const existing = map.get(point.prompt_id) || [];
			existing.push(point);
			map.set(point.prompt_id, existing);
		}
		return map;
	}, [batchData]);
	const value = {
		batchData,
		brand,
		competitors: sortedCompetitors,
		dateRange,
		getChartDataForPrompt: (0, import_react.useMemo)(() => {
			return (promptId) => {
				if (!brand || !batchData) return null;
				const promptData = dataByPrompt.get(promptId) || [];
				const dailyStatsMap = /* @__PURE__ */ new Map();
				for (const stat of promptData) dailyStatsMap.set(String(stat.date), stat);
				const chartData = dateRange.map((date) => {
					const dayStat = dailyStatsMap.get(date);
					const totalRuns = dayStat ? Number(dayStat.total_runs) : 0;
					const dataPoint = { date };
					if (totalRuns === 0) {
						dataPoint[brand.id] = null;
						sortedCompetitors.forEach((competitor) => {
							dataPoint[competitor.id] = null;
						});
						return dataPoint;
					}
					const brandMentions = dayStat ? Number(dayStat.brand_mentioned_count) : 0;
					const brandVisibility = Math.round(brandMentions / totalRuns * 100);
					dataPoint[brand.id] = brandVisibility;
					const competitorCounts = dayStat?.competitor_counts || {};
					sortedCompetitors.forEach((competitor) => {
						const competitorMentions = competitorCounts[competitor.name] || 0;
						const competitorVisibility = Math.round(competitorMentions / totalRuns * 100);
						dataPoint[competitor.id] = competitorVisibility;
					});
					return dataPoint;
				});
				const totalRuns = promptData.reduce((sum, s) => sum + Number(s.total_runs), 0);
				const hasVisibilityData = chartData.some((dataPoint) => {
					return [brand.id, ...sortedCompetitors.map((c) => c.id)].some((id) => {
						const visibility = dataPoint[id];
						return visibility !== null && visibility !== void 0 && Number(visibility) > 0;
					});
				});
				const lastDataPoint = chartData.filter((point) => point[brand.id] !== null).pop();
				return {
					chartData,
					totalRuns,
					hasVisibilityData,
					lastBrandVisibility: lastDataPoint ? lastDataPoint[brand.id] : null
				};
			};
		}, [
			brand,
			batchData,
			dataByPrompt,
			dateRange,
			sortedCompetitors
		]),
		isLoading
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartDataContext.Provider, {
		value,
		children
	});
}
function useOptionalChartDataContext() {
	return (0, import_react.useContext)(ChartDataContext);
}
var PLACEHOLDER_BARS_NO_DATA = [
	20,
	35,
	15,
	45,
	25,
	40,
	30,
	50,
	20,
	35,
	45,
	28
].map((h, i) => ({
	key: String(i),
	h
}));
var PLACEHOLDER_BARS_NO_VISIBILITY = [
	10,
	15,
	8,
	12,
	10,
	14,
	8,
	12,
	10,
	15,
	12,
	9
].map((h, i) => ({
	key: String(i),
	h
}));
function PromptTitle({ name, highlight }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
		className: "text-sm",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextHighlighter, {
			text: name,
			highlight
		})
	});
}
var CachedPromptChart = (0, import_react.memo)(function CachedPromptChart({ promptId, promptName, brandId, lookback = "1m", selectedModel = "all", availableModels = [], searchHighlight = "", hasEverBeenEvaluated = false }) {
	const chartContext = useOptionalChartDataContext();
	const chartData = (0, import_react.useMemo)(() => {
		if (!chartContext) return null;
		return chartContext.getChartDataForPrompt(promptId);
	}, [chartContext, promptId]);
	const { isExporting, handleExport, portal: exportPortal } = useChartExport(chartContext?.brand ? `${chartContext.brand.name}-${promptName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)}` : `chart-${promptName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)}`);
	const brand = chartContext?.brand ?? null;
	const competitors = chartContext?.competitors;
	const data = chartData?.chartData;
	const totalRuns = chartData?.totalRuns ?? 0;
	const hasVisibilityData = chartData?.hasVisibilityData ?? false;
	const lastBrandVisibility = chartData?.lastBrandVisibility ?? null;
	const handleDownload = (0, import_react.useCallback)(() => {
		if (!brand || !data || !competitors) return;
		handleExport({
			promptName,
			visibility: lastBrandVisibility,
			data,
			lookback,
			brand,
			competitors
		});
	}, [
		handleExport,
		promptName,
		lastBrandVisibility,
		data,
		lookback,
		brand,
		competitors
	]);
	if (!chartContext || chartContext.isLoading || !chartData) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "py-3 gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
				className: "flex justify-between items-center px-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-48" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-24 rounded-full" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "pl-0 pr-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-[250px] flex items-center justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-32 mx-auto" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-center space-x-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2 w-2 bg-primary/20 rounded-full animate-pulse" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2 w-2 bg-primary/20 rounded-full animate-pulse [animation-delay:0.2s]" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2 w-2 bg-primary/20 rounded-full animate-pulse [animation-delay:0.4s]" })
							]
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardFooter, {
				className: "flex items-center justify-between px-3 pt-3 pb-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-16 rounded" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-24 rounded" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-20 rounded" })]
			})
		]
	});
	if (totalRuns === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "py-3 gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
				className: "flex justify-between items-center px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptTitle, {
					name: promptName,
					highlight: searchHighlight
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-[300px] flex items-center justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-col items-center text-center max-w-xs",
						children: !hasEverBeenEvaluated ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex space-x-1.5 mb-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse [animation-delay:0.2s]" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse [animation-delay:0.4s]" })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-muted-foreground",
								children: "Evaluating for the first time"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground/70 mt-1",
								children: "Results will appear here shortly."
							})
						] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-16 w-full mb-3 flex items-end justify-center gap-[3px]",
								children: PLACEHOLDER_BARS_NO_DATA.map((bar) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-1.5 rounded-sm bg-muted-foreground/10",
									style: { height: `${bar.h}%` }
								}, bar.key))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-muted-foreground",
								children: "No data in selected time range"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground/70 mt-1",
								children: "Try selecting a longer time period to see historical data."
							})
						] })
					})
				})
			})
		]
	});
	if (!hasVisibilityData) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [exportPortal, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "py-3 gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
				className: "flex justify-between items-center px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptTitle, {
					name: promptName,
					highlight: searchHighlight
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-[250px] flex items-center justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-center text-center max-w-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-16 w-full mb-3 flex items-end justify-center gap-[3px]",
								children: PLACEHOLDER_BARS_NO_VISIBILITY.map((bar) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-1.5 rounded-sm bg-muted-foreground/10",
									style: { height: `${bar.h}%` }
								}, bar.key))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-muted-foreground",
								children: "No brands found in responses"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground/70 mt-1",
								children: "Your brand and competitors weren't mentioned in the evaluated responses for this prompt."
							})
						]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "print:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartActionsFooter, {
					promptId,
					brandId,
					promptName,
					onDownload: handleDownload,
					isDownloading: isExporting,
					selectedModel,
					availableModels,
					lookback
				})
			})
		]
	})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [exportPortal, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "py-3 gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
				className: "flex justify-between items-center px-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptTitle, {
					name: promptName,
					highlight: searchHighlight
				}), lastBrandVisibility !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					variant: getBadgeVariant(lastBrandVisibility),
					className: getBadgeClassName(lastBrandVisibility),
					children: [lastBrandVisibility, "% Visibility"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "pl-0 pr-6",
				children: brand && data && competitors && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BaseChart, {
					data,
					lookback,
					brand,
					competitors,
					isAnimationActive: false,
					chartType: "line"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "print:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartActionsFooter, {
					promptId,
					brandId,
					promptName,
					onDownload: handleDownload,
					isDownloading: isExporting,
					selectedModel,
					availableModels,
					lookback
				})
			})
		]
	})] });
});
var CHART_GAP = 24;
var VirtualizedPromptList = (0, import_react.memo)(function VirtualizedPromptList({ prompts, brandId, lookback, selectedModel, availableModels, searchHighlight = "" }) {
	const listRef = (0, import_react.useRef)(null);
	const [scrollMargin, setScrollMargin] = (0, import_react.useState)(0);
	const orderedPrompts = prompts;
	(0, import_react.useLayoutEffect)(() => {
		if (listRef.current) setScrollMargin(listRef.current.offsetTop);
	}, []);
	const promptsKey = (0, import_react.useMemo)(() => {
		return orderedPrompts.map((p) => p.id).join(",");
	}, [orderedPrompts]);
	const latestPromptsKeyRef = (0, import_react.useRef)(promptsKey);
	latestPromptsKeyRef.current = promptsKey;
	const estimateSize = (0, import_react.useCallback)(() => 404, []);
	const virtualizer = useWindowVirtualizer({
		count: orderedPrompts.length,
		estimateSize,
		overscan: 3,
		scrollMargin
	});
	(0, import_react.useEffect)(() => {
		const promptsKeyAtSchedule = promptsKey;
		const timer = setTimeout(() => {
			if (latestPromptsKeyRef.current !== promptsKeyAtSchedule) return;
			virtualizer.measure();
		}, 50);
		return () => clearTimeout(timer);
	}, [virtualizer, promptsKey]);
	const virtualItems = virtualizer.getVirtualItems();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: listRef,
		className: "space-y-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				height: `${virtualizer.getTotalSize()}px`,
				width: "100%",
				position: "relative"
			},
			children: virtualItems.map((virtualItem) => {
				const prompt = orderedPrompts[virtualItem.index];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"data-index": virtualItem.index,
					ref: virtualizer.measureElement,
					style: {
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						transform: `translateY(${virtualItem.start - scrollMargin}px)`,
						contain: "layout style"
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: { paddingBottom: CHART_GAP },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CachedPromptChart, {
							promptId: prompt.id,
							promptName: prompt.value,
							brandId,
							lookback,
							selectedModel,
							availableModels,
							searchHighlight,
							hasEverBeenEvaluated: Boolean(prompt.firstEvaluatedAt)
						})
					})
				}, prompt.id);
			})
		})
	});
});
/** Sort control for the prompts list (#60). Reads/writes the `order` URL key
*  the visibility route declares in its `validateSearch`. Like the filter-bar
*  widgets it subscribes to just its own key, and writes with `replace` + no
*  scroll reset, dropping the key when set back to the default so default
*  state keeps a clean URL. */
function PromptOrderDropdown() {
	const navigate = useNavigate();
	const selected = useSearch({
		strict: false,
		select: (s) => coercePromptOrder(s.order)
	});
	const setOrder = (next) => navigate({
		to: ".",
		search: (prev) => ({
			...prev,
			order: next === "default" ? void 0 : next
		}),
		replace: true,
		resetScroll: false
	});
	const label = selected === "default" ? "Sort" : PROMPT_ORDER_OPTIONS.find((o) => o.value === selected)?.label ?? "Sort";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterTriggerButton, {
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpDown, { className: "size-3.5" }),
			label,
			active: selected !== DEFAULT_PROMPT_ORDER
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuContent, {
		align: "start",
		className: "w-60",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuRadioGroup, {
			value: selected,
			onValueChange: (v) => setOrder(v),
			children: PROMPT_ORDER_OPTIONS.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuRadioItem, {
				value: o.value,
				className: "cursor-pointer whitespace-nowrap",
				children: o.label
			}, o.value))
		})
	})] });
}
function useFilteredVisibility(brandId, filters) {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const query = useQuery({
		queryKey: [
			"filtered-visibility",
			resolvedBrandId,
			filters?.lookback,
			filters?.model,
			filters?.tags?.join(","),
			filters?.search
		],
		queryFn: () => getFilteredVisibilityFn({ data: {
			brandId: resolvedBrandId,
			lookback: filters?.lookback || "1m",
			model: filters?.model,
			tags: filters?.tags?.join(","),
			search: filters?.search,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
		} }),
		enabled: !!resolvedBrandId,
		staleTime: 3e4,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		refetchInterval: 6e4,
		placeholderData: (prev) => prev
	});
	return {
		filteredVisibility: query.data,
		isLoading: query.isLoading,
		isValidating: query.isFetching,
		isError: query.error,
		revalidate: query.refetch
	};
}
function getVisibilityColors(value) {
	if (value > 75) return {
		bg: "bg-emerald-50 dark:bg-emerald-950/40",
		text: "text-emerald-600 dark:text-emerald-400",
		border: "border-emerald-200 dark:border-emerald-800/60",
		muted: "text-emerald-600/70 dark:text-emerald-400/70",
		stroke: "#10b981",
		fill: "#10b981"
	};
	if (value > 45) return {
		bg: "bg-amber-50 dark:bg-amber-950/40",
		text: "text-amber-600 dark:text-amber-400",
		border: "border-amber-200 dark:border-amber-800/60",
		muted: "text-amber-600/70 dark:text-amber-400/70",
		stroke: "#f59e0b",
		fill: "#f59e0b"
	};
	return {
		bg: "bg-rose-50 dark:bg-rose-950/40",
		text: "text-rose-600 dark:text-rose-400",
		border: "border-rose-200 dark:border-rose-800/60",
		muted: "text-rose-600/70 dark:text-rose-400/70",
		stroke: "#ef4444",
		fill: "#ef4444"
	};
}
function VisibilityBar({ currentVisibility, totalRuns, totalPrompts, totalCitations, visibilityTimeSeries, lookback, isLoading = false }) {
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisibilityBarSkeleton, {});
	if (totalRuns === 0) return null;
	const colors = getVisibilityColors(currentVisibility);
	const showChart = lookback !== "1w";
	const chartData = visibilityTimeSeries.map((point) => ({
		date: point.date,
		value: point.visibility ?? 0
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 min-h-10 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 min-w-0 shrink-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: `text-base sm:text-lg font-semibold whitespace-nowrap ${colors.text}`,
					children: [
						currentVisibility,
						"% ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-normal",
							children: "Visibility"
						})
					]
				}),
				showChart && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-24 h-6 hidden sm:block shrink-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
						width: "100%",
						height: "100%",
						initialDimension: {
							width: 1,
							height: 1
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
							data: chartData,
							margin: {
								top: 2,
								right: 0,
								left: 0,
								bottom: 2
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								domain: [0, "auto"],
								hide: true
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								type: "monotone",
								dataKey: "value",
								stroke: colors.stroke,
								fill: colors.fill,
								fillOpacity: .2,
								strokeWidth: 1.5,
								dot: false,
								isAnimationActive: false,
								connectNulls: true
							})]
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: `h-3.5 w-3.5 shrink-0 ${colors.muted} cursor-help` })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
					side: "bottom",
					className: "max-w-xs text-sm",
					children: [
						"AI visibility for the ",
						totalPrompts.toLocaleString(),
						" prompt",
						totalPrompts !== 1 ? "s" : "",
						" shown below, calculated as the percentage of AI responses that mention your brand over the time period for the selected filters."
					]
				})] })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `flex items-center gap-x-3 text-xs sm:text-sm ${colors.muted}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium",
					children: totalPrompts.toLocaleString()
				}), " prompts"] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium",
					children: totalRuns.toLocaleString()
				}), " runs"] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium",
					children: totalCitations.toLocaleString()
				}), " citations"] })
			]
		})]
	});
}
function VisibilityBarSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 min-h-10 px-3 py-2 rounded-lg border bg-muted/30",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 sm:h-7 w-36" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-24 hidden sm:block" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-x-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 sm:h-5 w-16" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 sm:h-5 w-14" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 sm:h-5 w-20" })
			]
		})]
	});
}
function VisibilityBarEmpty() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center min-h-10 px-3 py-2 rounded-lg border border-border/60 bg-muted/20",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-sm text-muted-foreground",
			children: "No visibility data for the selected time range and filters."
		})
	});
}
/**
* Self-contained visibility bar. Subscribes directly to the filter URL
* keys it needs (lookback, model, tags, search) and fetches
* `useFilteredVisibility` itself, so it's a sibling of the chart section
* rather than something the parent has to wire through. The tag + search
* filters are resolved to prompt IDs server-side, so we pass the criteria
* rather than a prompt-id list (issue #68).
*
* The skeleton stays mounted inside a grid overlay so the bar reserves
* its vertical space on load and doesn't shove the charts down when the
* real bar comes in.
*/
function VisibilityBarSection({ brandId }) {
	const { lookback, model, tags, search } = useListFilters();
	const modelParam = model === "all" ? void 0 : model;
	const { filteredVisibility, isLoading: isLoadingVisibility, isValidating: isValidatingVisibility } = useFilteredVisibility(brandId, {
		lookback,
		tags: tags.length > 0 ? tags : void 0,
		search: search || void 0,
		model: modelParam
	});
	const lastRef = (0, import_react.useRef)(filteredVisibility);
	if (filteredVisibility) lastRef.current = filteredVisibility;
	const stable = filteredVisibility || lastRef.current;
	const hasLoaded = stable && !isLoadingVisibility;
	const hasData = hasLoaded && stable.totalRuns > 0;
	const isEmpty = hasLoaded && stable.totalRuns === 0;
	const showingSkeleton = !stable || stable.totalRuns === 0 && isValidatingVisibility;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3 grid [&>*]:col-start-1 [&>*]:row-start-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: hasData || isEmpty && !showingSkeleton ? "opacity-0 pointer-events-none" : void 0,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisibilityBarSkeleton, {})
			}),
			hasData && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisibilityBar, {
				currentVisibility: stable.currentVisibility,
				totalRuns: stable.totalRuns,
				totalPrompts: stable.totalPrompts,
				totalCitations: stable.totalCitations,
				visibilityTimeSeries: stable.visibilityTimeSeries,
				lookback: stable.lookback
			}),
			isEmpty && !showingSkeleton && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisibilityBarEmpty, {})
		]
	});
}
/** Host component: renders the page shell (title, sticky bar, content)
*  and composes independent sub-sections. It doesn't subscribe to any
*  filter state itself — each section reads the URL keys it cares about
*  so a filter change only re-renders the sections that depend on it. */
function PromptsDisplay({ pageTitle, pageDescription, pageInfoContent, editLink }) {
	const { brand } = useBrand();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
		title: pageTitle,
		subtitle: pageDescription,
		infoContent: pageInfoContent,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptsContent, {
			brandId: brand?.id,
			editLink
		})
	});
}
/** Owns the single `usePromptsSummary` subscription for the page. Derives
*  `availableTags`, the search-filtered prompt id list (used by both the
*  visibility bar and the chart list), and passes them down. Child
*  components still hold their own subscriptions to whichever URL keys
*  they need, so a click on "Lookback" only invalidates the data users
*  and not `FilterBar` itself. */
function PromptsContent({ brandId, editLink }) {
	const { brand } = useBrand(brandId);
	const filters = useListFilters();
	const { model, lookback, tags, search } = filters;
	const order = useSearch({
		strict: false,
		select: (s) => coercePromptOrder(s.order)
	});
	const trackedTargets = brand?.trackedTargets ?? [];
	const availableIndividualModels = (0, import_react.useMemo)(() => trackedTargets.map((target) => target.value), [trackedTargets]);
	const modelParam = model === "all" ? void 0 : model;
	const { promptsSummary, isLoading: isLoadingSummary, isError: summaryError } = usePromptsSummary(brandId, {
		lookback,
		model: modelParam,
		tags: tags.length > 0 ? tags : void 0
	});
	const availableTags = promptsSummary?.availableTags ?? [];
	const sortedPrompts = (0, import_react.useMemo)(() => {
		if (!promptsSummary) return [];
		const allPrompts = promptsSummary.prompts;
		const filtered = search ? allPrompts.filter((p) => p.value.toLowerCase().includes(search.toLowerCase())) : allPrompts;
		return orderPrompts(filtered, order);
	}, [
		promptsSummary,
		search,
		order
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilteredListShell, {
		filters,
		availableTags,
		trackedTargets,
		showSearch: true,
		showModelSelector: true,
		showResultCount: true,
		filterBarExtras: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptOrderDropdown, {}),
		filterSectionExtras: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisibilityBarSection, { brandId }),
		isLoading: isLoadingSummary && !promptsSummary,
		loadingState: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContentLoadingSkeleton, {}),
		isError: Boolean(summaryError),
		errorState: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "p-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2",
					children: "Failed to load prompts data"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm",
					children: "Try refreshing the page"
				})]
			})
		}),
		totalCount: promptsSummary?.prompts?.length,
		filteredCount: sortedPrompts.length,
		noMatchesTitle: "No prompts match your filters.",
		noMatchesDescription: "Try adjusting your search or tag filters.",
		emptyState: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border-2 border-dashed border-muted rounded-lg min-h-48 flex items-center justify-center",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-8 text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { className: "h-12 w-12 mx-auto mb-4 opacity-50" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-4",
						children: "No prompts yet."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						size: "sm",
						className: "h-7 flex cursor-pointer",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: editLink,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconEditCircle, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Edit" })]
						})
					})
				]
			})
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartSection, {
			brandId,
			lookback,
			selectedModel: model,
			modelParam,
			searchQuery: search,
			selectedTags: tags,
			sortedPrompts,
			availableIndividualModels
		})
	});
}
/** Heavy chart subtree. Split out so it gets its own render boundary —
*  `React.memo` on `VirtualizedPromptList` means this block only walks
*  30 chart cards when its own props change, not every time a sibling
*  state (like visibility refetch) moves. */
function ChartSection({ brandId, lookback, selectedModel, modelParam, searchQuery, selectedTags, sortedPrompts, availableIndividualModels }) {
	const { batchChartData, isLoading: isLoadingChartData } = useBatchChartData(brandId, {
		lookback,
		model: modelParam,
		tags: selectedTags.length > 0 ? selectedTags : void 0,
		search: searchQuery || void 0
	});
	const { startDate, endDate } = (0, import_react.useMemo)(() => {
		if (!batchChartData?.dateRange) {
			const now = /* @__PURE__ */ new Date();
			return {
				startDate: now,
				endDate: now
			};
		}
		return {
			startDate: new Date(batchChartData.dateRange.fromDate),
			endDate: new Date(batchChartData.dateRange.toDate)
		};
	}, [batchChartData?.dateRange]);
	const brandForProvider = batchChartData?.brand ? {
		id: batchChartData.brand.id,
		organizationId: batchChartData.brand.id,
		name: batchChartData.brand.name,
		website: "",
		additionalDomains: [],
		aliases: [],
		enabled: true,
		onboarded: true,
		delayOverrideHours: null,
		enabledModels: null,
		createdAt: /* @__PURE__ */ new Date(),
		updatedAt: /* @__PURE__ */ new Date()
	} : null;
	const competitorsForProvider = batchChartData?.competitors?.map((c) => ({
		id: c.id,
		name: c.name,
		brandId: brandId || "",
		domains: [],
		aliases: [],
		createdAt: /* @__PURE__ */ new Date(),
		updatedAt: /* @__PURE__ */ new Date()
	})) || [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartDataProvider, {
		batchData: batchChartData?.chartData || null,
		brand: brandForProvider,
		competitors: competitorsForProvider,
		startDate,
		endDate,
		isLoading: isLoadingChartData,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VirtualizedPromptList, {
			prompts: sortedPrompts,
			brandId: brandId || "",
			lookback,
			selectedModel,
			availableModels: availableIndividualModels,
			searchHighlight: searchQuery
		})
	});
}
function ContentLoadingSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-6",
		children: [
			"loading-chart-primary",
			"loading-chart-secondary",
			"loading-chart-tertiary"
		].map((loadingCard) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "py-3 gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "flex justify-between items-center px-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-48" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-24 rounded-full" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "pl-0 pr-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-[250px] flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-32 mx-auto" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-center space-x-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2 w-2 bg-primary/20 rounded-full animate-pulse" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2 w-2 bg-primary/20 rounded-full animate-pulse [animation-delay:0.2s]" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2 w-2 bg-primary/20 rounded-full animate-pulse [animation-delay:0.4s]" })
								]
							})]
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardFooter, {
					className: "flex items-center justify-between px-3 pt-3 pb-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-16 rounded" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-24 rounded" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-20 rounded" })]
				})
			]
		}, loadingCard))
	});
}
/**
* /app/$brand/visibility - Visibility charts page
*
* Shows prompts with visibility scores and trend charts.
* Data is fetched client-side via TanStack Query hooks in PromptsDisplay,
* so no route loader is needed (allows immediate rendering with skeletons).
*/
function VisibilityPage() {
	const { brand: brandId } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptsDisplay, {
		pageTitle: "Visibility",
		pageDescription: "See how LLMs are evaluating prompts related to your brand.",
		pageInfoContent: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			"Track how different LLMs respond to prompts related to your brand, products, and",
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/app/$brand/settings/competitors",
				params: { brand: brandId },
				className: "underline",
				children: "competitors"
			}),
			"."
		] }),
		editLink: `/app/${brandId}/settings/prompts`
	});
}
//#endregion
export { VisibilityPage as component };

//# sourceMappingURL=visibility-BcQPbf2N.mjs.map