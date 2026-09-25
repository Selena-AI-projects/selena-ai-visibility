import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { g as useRouteContext, m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { t as Skeleton } from "./skeleton-BcIvnIuu.mjs";
import { i as TrendingDown, r as TrendingUp, u as Settings } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, s as DialogTrigger, t as Dialog } from "./dialog-BmGdp57D.mjs";
import { a as YAxis, c as Area, m as ResponsiveContainer, o as XAxis, r as BarChart, s as Bar, t as AreaChart, u as CartesianGrid } from "../_libs/recharts+[...].mjs";
import { n as ChartTooltip, r as ChartTooltipContent, t as ChartContainer } from "./chart-WE9PDFAP.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-wJUKCpVc.mjs";
import { n as getAdminStatsFn, o as updateDelayOverrideFn } from "./admin-BGFhkJzE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-PKNtJKKf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c10bb574-0d83-42e2-a5b0-223162ec7dca", e._sentryDebugIdIdentifier = "sentry-dbid-c10bb574-0d83-42e2-a5b0-223162ec7dca");
	} catch (e) {}
})();
/**
* /admin - Admin dashboard with brand statistics and charts
*/
function useDefaultDelayHours() {
	return useRouteContext({ strict: false }).clientConfig?.defaultDelayHours ?? 24;
}
function formatDelayHours(hours) {
	const weeks = Math.floor(hours / 168);
	const days = Math.floor(hours % 168 / 24);
	const remainingHours = hours % 24;
	const parts = [];
	if (weeks > 0) parts.push(`${weeks}w`);
	if (days > 0) parts.push(`${days}d`);
	if (remainingHours > 0) parts.push(`${remainingHours}h`);
	return parts.length > 0 ? parts.join(" ") : "0h";
}
function hoursToTimeUnits(hours) {
	return {
		weeks: Math.floor(hours / 168),
		days: Math.floor(hours % 168 / 24),
		hours: hours % 24
	};
}
function timeUnitsToHours(units) {
	return units.weeks * 7 * 24 + units.days * 24 + units.hours;
}
function DelayOverrideDialog({ brand, onUpdate }) {
	const defaultDelayHours = useDefaultDelayHours();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [timeUnits, setTimeUnits] = (0, import_react.useState)({
		weeks: 0,
		days: 0,
		hours: 0
	});
	const [isUpdating, setIsUpdating] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const currentDelay = brand.delayOverrideHours ?? defaultDelayHours;
	(0, import_react.useEffect)(() => {
		if (open) {
			setTimeUnits(hoursToTimeUnits(currentDelay));
			setError(null);
		}
	}, [open, currentDelay]);
	const handleUpdateUnit = (unit, value) => {
		const numValue = value === "" ? 0 : Math.max(0, parseInt(value) || 0);
		setTimeUnits({
			...timeUnits,
			[unit]: numValue
		});
	};
	const handleUpdate = async () => {
		setError(null);
		const totalHours = timeUnitsToHours(timeUnits);
		if (totalHours === 0) {
			setError("Please enter a delay value");
			return;
		}
		if (totalHours < 1) {
			setError("Delay must be at least 1 hour");
			return;
		}
		setIsUpdating(true);
		try {
			await updateDelayOverrideFn({ data: {
				brandId: brand.id,
				delayOverrideHours: totalHours
			} });
			onUpdate();
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update");
		} finally {
			setIsUpdating(false);
		}
	};
	const handleClearOverride = async () => {
		setIsUpdating(true);
		setError(null);
		try {
			await updateDelayOverrideFn({ data: {
				brandId: brand.id,
				delayOverrideHours: null
			} });
			onUpdate();
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to clear override");
		} finally {
			setIsUpdating(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "outline",
				size: "sm",
				className: "cursor-pointer",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "h-4 w-4" })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Configure Job Delay for ", brand.name] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
					"Set a custom delay for how often prompt jobs run. Default is ",
					formatDelayHours(defaultDelayHours),
					"."
				] })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Custom Delay" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-3 gap-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "weeks",
											className: "text-xs text-muted-foreground",
											children: "Weeks"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "weeks",
											type: "number",
											min: "0",
											value: timeUnits.weeks || "",
											onChange: (e) => handleUpdateUnit("weeks", e.target.value),
											disabled: isUpdating,
											placeholder: "0"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "days",
											className: "text-xs text-muted-foreground",
											children: "Days"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "days",
											type: "number",
											min: "0",
											value: timeUnits.days || "",
											onChange: (e) => handleUpdateUnit("days", e.target.value),
											disabled: isUpdating,
											placeholder: "0"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "hours",
											className: "text-xs text-muted-foreground",
											children: "Hours"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "hours",
											type: "number",
											min: "0",
											value: timeUnits.hours || "",
											onChange: (e) => handleUpdateUnit("hours", e.target.value),
											disabled: isUpdating,
											placeholder: "0"
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted-foreground",
								children: [
									"Current: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatDelayHours(currentDelay) }),
									brand.delayOverrideHours !== null && " (custom)",
									brand.delayOverrideHours === null && " (default)"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted-foreground",
								children: ["Total: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatDelayHours(timeUnitsToHours(timeUnits)) })]
							})
						]
					}), error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-destructive",
						children: error
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-between w-full",
					children: [brand.delayOverrideHours !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: handleClearOverride,
						disabled: isUpdating,
						className: "cursor-pointer",
						children: "Clear Override"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 ml-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setOpen(false),
							disabled: isUpdating,
							className: "cursor-pointer",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: handleUpdate,
							disabled: isUpdating,
							className: "cursor-pointer",
							children: isUpdating ? "Updating..." : "Update"
						})]
					})]
				}) })
			]
		})]
	});
}
function ActivityIndicator({ added, removed }) {
	if (added === 0 && removed === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-4 mr-1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "0" })]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [added > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center text-green-600",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-4 w-4 mr-1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["+", added] })]
		}), removed > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center text-red-600",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingDown, { className: "h-4 w-4 mr-1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["-", removed] })]
		})]
	});
}
function AdminDashboard() {
	const defaultDelayHours = useDefaultDelayHours();
	const [brands, setBrands] = (0, import_react.useState)([]);
	const [brandsOverTime, setBrandsOverTime] = (0, import_react.useState)([]);
	const [activeBrandsOverTime, setActiveBrandsOverTime] = (0, import_react.useState)([]);
	const [promptsOverTime, setPromptsOverTime] = (0, import_react.useState)([]);
	const [runsOverTime, setRunsOverTime] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const fetchBrandStats = (0, import_react.useCallback)(async () => {
		try {
			const data = await getAdminStatsFn();
			setBrands(data.brands);
			setBrandsOverTime(data.brandsOverTime || []);
			setActiveBrandsOverTime(data.activeBrandsOverTime || []);
			setPromptsOverTime(data.promptsOverTime || []);
			setRunsOverTime(data.runsOverTime || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		fetchBrandStats();
	}, [fetchBrandStats]);
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-64" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-96" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-48" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-4",
			children: [
				0,
				1,
				2,
				3,
				4
			].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 w-full" }, n))
		}) })] })]
	});
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
		className: "text-destructive",
		children: "Error"
	}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: error }) })] });
	const totals = brands.reduce((acc, brand) => ({
		totalBrands: acc.totalBrands + 1,
		totalPrompts: acc.totalPrompts + (brand.totalPrompts || 0),
		activePrompts: acc.activePrompts + (brand.activePrompts || 0),
		promptRuns7Days: acc.promptRuns7Days + (brand.promptRuns7Days || 0),
		promptRuns30Days: acc.promptRuns30Days + (brand.promptRuns30Days || 0)
	}), {
		totalBrands: 0,
		totalPrompts: 0,
		activePrompts: 0,
		promptRuns7Days: 0,
		promptRuns30Days: 0
	});
	const brandsYAxisMax = Math.max(...brandsOverTime.map((d) => d.count), ...activeBrandsOverTime.map((d) => d.count), 0);
	const dateFormatter = (value) => {
		return new Date(value).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric"
		});
	};
	const tooltipLabelFormatter = (value) => {
		return new Date(String(value)).toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric"
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center justify-between",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-bold tracking-tight",
						children: "Admin Dashboard"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground",
						children: "Monitor and manage brands, prompts, and job scheduling"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "All Brands" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
						"Total: ",
						totals.totalBrands,
						" brands"
					] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
						className: "p-0 pb-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartContainer, {
							config: { count: {
								label: "Total Brands",
								color: "#3b82f6"
							} },
							className: "h-[120px] w-full px-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								initialDimension: {
									width: 1,
									height: 1
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
									data: brandsOverTime,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
											id: "fillBrands",
											x1: "0",
											y1: "0",
											x2: "0",
											y2: "1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "5%",
												stopColor: "#3b82f6",
												stopOpacity: .8
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "95%",
												stopColor: "#3b82f6",
												stopOpacity: .1
											})]
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											strokeDasharray: "3 3",
											vertical: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "date",
											tickLine: false,
											axisLine: false,
											tickMargin: 8,
											minTickGap: 30,
											tickFormatter: dateFormatter
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											tickLine: false,
											axisLine: false,
											tickMargin: 8,
											width: 40,
											domain: [0, brandsYAxisMax]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {
											isAnimationActive: false,
											content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltipContent, {
												className: "min-w-[180px]",
												labelFormatter: tooltipLabelFormatter
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
											type: "monotone",
											dataKey: "count",
											stroke: "#3b82f6",
											fill: "url(#fillBrands)",
											strokeWidth: 2
										})
									]
								})
							})
						})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Active Brands" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: ["With runs in last 30 days: ", activeBrandsOverTime[activeBrandsOverTime.length - 1]?.count ?? 0] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
						className: "p-0 pb-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartContainer, {
							config: { count: {
								label: "Active Brands",
								color: "#22c55e"
							} },
							className: "h-[120px] w-full px-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								initialDimension: {
									width: 1,
									height: 1
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
									data: activeBrandsOverTime,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
											id: "fillActiveBrands",
											x1: "0",
											y1: "0",
											x2: "0",
											y2: "1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "5%",
												stopColor: "#22c55e",
												stopOpacity: .8
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "95%",
												stopColor: "#22c55e",
												stopOpacity: .1
											})]
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											strokeDasharray: "3 3",
											vertical: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "date",
											tickLine: false,
											axisLine: false,
											tickMargin: 8,
											minTickGap: 30,
											tickFormatter: dateFormatter
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											tickLine: false,
											axisLine: false,
											tickMargin: 8,
											width: 40,
											domain: [0, brandsYAxisMax]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {
											isAnimationActive: false,
											content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltipContent, {
												className: "min-w-[180px]",
												labelFormatter: tooltipLabelFormatter
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
											type: "monotone",
											dataKey: "count",
											stroke: "#22c55e",
											fill: "url(#fillActiveBrands)",
											strokeWidth: 2
										})
									]
								})
							})
						})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Prompts" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
						"Active: ",
						totals.activePrompts,
						" | Total: ",
						totals.totalPrompts
					] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
						className: "p-0 pb-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartContainer, {
							config: {
								enabled: {
									label: "Enabled",
									color: "#10b981"
								},
								disabled: {
									label: "Disabled",
									color: "#ef4444"
								}
							},
							className: "h-[120px] w-full px-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								initialDimension: {
									width: 1,
									height: 1
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
									data: promptsOverTime,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
											id: "fillEnabled",
											x1: "0",
											y1: "0",
											x2: "0",
											y2: "1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "5%",
												stopColor: "#10b981",
												stopOpacity: .8
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "95%",
												stopColor: "#10b981",
												stopOpacity: .1
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
											id: "fillDisabled",
											x1: "0",
											y1: "0",
											x2: "0",
											y2: "1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "5%",
												stopColor: "#ef4444",
												stopOpacity: .8
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "95%",
												stopColor: "#ef4444",
												stopOpacity: .1
											})]
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											strokeDasharray: "3 3",
											vertical: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "date",
											tickLine: false,
											axisLine: false,
											tickMargin: 8,
											minTickGap: 30,
											tickFormatter: dateFormatter
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											tickLine: false,
											axisLine: false,
											tickMargin: 8,
											width: 40
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {
											isAnimationActive: false,
											content: (props) => {
												if (!props.active || !props.payload) return null;
												const reversedPayload = [...props.payload].reverse();
												return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltipContent, {
													className: "min-w-[180px]",
													active: props.active,
													payload: reversedPayload,
													label: props.label,
													labelFormatter: tooltipLabelFormatter
												});
											}
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
											type: "monotone",
											dataKey: "disabled",
											stackId: "a",
											stroke: "#ef4444",
											fill: "#ef4444",
											fillOpacity: .6,
											strokeWidth: 2
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
											type: "monotone",
											dataKey: "enabled",
											stackId: "a",
											stroke: "#10b981",
											fill: "#10b981",
											fillOpacity: .6,
											strokeWidth: 2
										})
									]
								})
							})
						})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Runs" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
						"7d: ",
						totals.promptRuns7Days.toLocaleString(),
						" | 30d: ",
						totals.promptRuns30Days.toLocaleString()
					] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
						className: "p-0 pb-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartContainer, {
							config: { count: {
								label: "Runs",
								color: "#8b5cf6"
							} },
							className: "h-[120px] w-full px-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								initialDimension: {
									width: 1,
									height: 1
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
									data: runsOverTime,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											strokeDasharray: "3 3",
											vertical: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "date",
											tickLine: false,
											axisLine: false,
											tickMargin: 8,
											minTickGap: 30,
											tickFormatter: dateFormatter
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											tickLine: false,
											axisLine: false,
											tickMargin: 8,
											width: 40
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {
											isAnimationActive: false,
											content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltipContent, {
												className: "min-w-[180px]",
												labelFormatter: tooltipLabelFormatter
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
											dataKey: "count",
											fill: "#8b5cf6",
											radius: [
												4,
												4,
												0,
												0
											]
										})
									]
								})
							})
						})
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Brand Statistics" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Detailed statistics and configuration for each brand" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Brand" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: "Prompts"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: "Prompts (7d)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: "Prompts (30d)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: "Runs (7d)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: "Runs (30d)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Last Run" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Run Delay" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Actions" })
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: brands.map((brand) => {
					const currentDelayHours = brand.delayOverrideHours ?? defaultDelayHours;
					const currentDelayMs = currentDelayHours * 60 * 60 * 1e3;
					const isOverdue = brand.lastPromptRunAt && brand.activePrompts > 0 ? (/* @__PURE__ */ new Date()).getTime() - new Date(brand.lastPromptRunAt).getTime() > currentDelayMs : false;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "font-medium",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/app/$brand",
									params: { brand: brand.id },
									className: "hover:underline text-primary",
									children: brand.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: brand.website
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-right",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: brand.activePrompts
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex justify-end",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityIndicator, {
								added: brand.promptsAddedLast7Days || 0,
								removed: brand.promptsRemovedLast7Days || 0
							})
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex justify-end",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityIndicator, {
								added: brand.promptsAddedLast30Days || 0,
								removed: brand.promptsRemovedLast30Days || 0
							})
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-right",
							children: brand.promptRuns7Days?.toLocaleString() || 0
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-right",
							children: brand.promptRuns30Days?.toLocaleString() || 0
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: brand.lastPromptRunAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `text-sm ${isOverdue ? "text-red-600 font-semibold" : ""}`,
							children: new Date(brand.lastPromptRunAt).toLocaleDateString()
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted-foreground",
							children: "Never"
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: formatDelayHours(currentDelayHours)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: brand.delayOverrideHours !== null ? "Custom" : "Default"
							})]
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DelayOverrideDialog, {
							brand,
							onUpdate: fetchBrandStats
						}) })
					] }, brand.id);
				}) })] })
			}) })] })
		]
	});
}
//#endregion
export { AdminDashboard as component };

//# sourceMappingURL=admin-PKNtJKKf.mjs.map