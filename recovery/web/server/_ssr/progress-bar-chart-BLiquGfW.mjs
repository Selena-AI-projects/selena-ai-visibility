import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
import { n as getModelMeta, t as KNOWN_MODELS } from "./models-DjvggVKS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/progress-bar-chart-BLiquGfW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "796f25dd-f967-48d7-94cc-c2545f6bbf1a", e._sentryDebugIdIdentifier = "sentry-dbid-796f25dd-f967-48d7-94cc-c2545f6bbf1a");
	} catch (e) {}
})();
function ProgressBarChart({ items, colorMapping = {}, defaultColor = "#3b82f6", trackColor = "bg-primary/10", barHeight = "h-2", percentageMode = "max", customTotal, spacing = "space-y-4", highlightLabel, className, truncateLabels = true, fillHeight = false }) {
	const total = import_react.useMemo(() => {
		if (customTotal !== void 0) return customTotal;
		if (percentageMode === "total") return items.reduce((sum, item) => sum + item.count, 0);
		return Math.max(...items.map((item) => item.count), 1);
	}, [
		items,
		percentageMode,
		customTotal
	]);
	const getItemColor = (item) => {
		if (item.color) return item.color;
		if (item.category && colorMapping[item.category]) return colorMapping[item.category];
		return defaultColor;
	};
	const calculatePercentage = (count) => {
		if (total === 0) return 0;
		return count / total * 100;
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn(fillHeight ? "flex flex-col justify-between h-full" : spacing, className),
		children: items.map((item) => {
			const percentage = calculatePercentage(item.count);
			const color = getItemColor(item);
			const isHighlighted = highlightLabel && item.label === highlightLabel;
			const isClickable = !!item.onClick;
			const labelClassName = cn("text-sm", item.tooltip && "cursor-default", isHighlighted ? "font-bold" : "font-medium", truncateLabels && "truncate", isClickable && "cursor-pointer hover:underline");
			const label = item.onClick ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: cn(labelClassName, "min-h-11 min-w-11 p-0 text-left focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"),
				onClick: item.onClick,
				children: item.label
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: labelClassName,
				children: item.label
			});
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1 min-w-0 flex-1",
							children: [item.tooltip ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
								asChild: true,
								children: label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
								className: "max-w-xs text-xs font-normal",
								children: item.tooltip
							})] }) : label, item.action]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 ml-2 shrink-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm",
								children: item.count.toLocaleString()
							}), item.suffix]
						})]
					}),
					item.subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground truncate -mt-1",
						children: item.subtitle
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("relative w-full overflow-hidden rounded-full", trackColor, barHeight),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full transition-all rounded-full",
							style: {
								width: `${percentage}%`,
								backgroundColor: color
							}
						})
					})
				]
			}, item.label);
		})
	});
}
var COLOR_BY_ICON = {
	openai: "#10b981",
	anthropic: "#f59e0b",
	google: "#3b82f6",
	microsoft: "#06b6d4",
	perplexity: "#8b5cf6",
	x: "#111827"
};
/** Resolve a model id to a display color. "all" is a no-filter sentinel. */
function getModelColor(model) {
	if (model === "all") return "#8b5cf6";
	return COLOR_BY_ICON[getModelMeta(model).iconId];
}
({ ...Object.fromEntries(Object.keys(KNOWN_MODELS).map((m) => [m, getModelColor(m)]).filter((entry) => entry[1] !== void 0)) });
//#endregion
export { ProgressBarChart as t };

//# sourceMappingURL=progress-bar-chart-BLiquGfW.mjs.map