import { a as require_jsx_runtime, n as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { y as useParams } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as YAxis, c as Area, o as XAxis, t as AreaChart, u as CartesianGrid } from "../_libs/recharts+[...].mjs";
import { n as ChartTooltip, t as ChartContainer } from "./chart-WE9PDFAP.mjs";
import { n as getShareOfVoiceFn } from "./analysis-BlgoS24m.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/trend-chart-JOzAvN1R.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "70bde0bd-04b6-4151-b533-7c9881861408", e._sentryDebugIdIdentifier = "sentry-dbid-70bde0bd-04b6-4151-b533-7c9881861408");
	} catch (e) {}
})();
var shareOfVoiceKeys = {
	all: ["share-of-voice"],
	list: (brandId, filters) => [
		...shareOfVoiceKeys.all,
		brandId,
		filters
	]
};
function useShareOfVoice(brandId, filters) {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const query = useQuery({
		queryKey: shareOfVoiceKeys.list(resolvedBrandId || "", filters),
		queryFn: () => getShareOfVoiceFn({ data: {
			brandId: resolvedBrandId,
			lookback: filters?.lookback ?? "1m",
			model: filters?.model,
			tags: filters?.tags?.join(","),
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
		} }),
		enabled: !!resolvedBrandId,
		staleTime: 3e4,
		placeholderData: (prev) => prev
	});
	return {
		data: query.data,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: !!query.error,
		revalidate: query.refetch
	};
}
/**
* Shared trend area-chart used by the overview's AI Visibility and Share of
* Voice sections and the Share of Voice page. It takes only a label, a color,
* and a {date, value} series — everything else (axis formatting, the
* auto-ranged y-axis, the tooltip, the softened fill) is fixed here so the
* stacked trends stay visually identical without being tuned in two places.
*/
/** Build a local Date from a "YYYY-MM-DD" string (avoids the UTC off-by-one of `new Date(iso)`). */
function localDate(value) {
	const [year, month, day] = value.split("-").map(Number);
	return new Date(year, month - 1, day);
}
function TrendChart({ data, label, color, className = "aspect-auto h-full w-full" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartContainer, {
		config: { value: {
			label,
			color
		} },
		className,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
			data,
			margin: {
				top: 10,
				right: 10,
				left: 0,
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
					tickFormatter: (value) => localDate(value).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
					domain: [0, "auto"],
					tickLine: false,
					axisLine: false,
					tickMargin: 8,
					tickCount: 4,
					tick: { fontSize: 11 },
					tickFormatter: (value) => `${value}%`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {
					isAnimationActive: false,
					cursor: false,
					content: ({ active, payload, label: dateLabel }) => {
						if (!active || !payload?.length) return null;
						const value = payload[0]?.value;
						if (value == null) return null;
						const formattedDate = localDate(dateLabel).toLocaleDateString("en-US", {
							month: "long",
							day: "numeric",
							year: "numeric"
						});
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-border/50 bg-background grid min-w-[12rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: formattedDate
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "shrink-0 rounded-[2px] h-2.5 w-2.5",
										style: { background: color }
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: label
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "ml-auto font-mono tabular-nums",
										children: [value, "%"]
									})
								]
							})]
						});
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
					dataKey: "value",
					type: "monotone",
					stroke: color,
					strokeWidth: 2,
					fill: color,
					fillOpacity: .18,
					connectNulls: true
				})
			]
		})
	});
}
//#endregion
export { useShareOfVoice as n, TrendChart as t };

//# sourceMappingURL=trend-chart-JOzAvN1R.mjs.map