import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as getModelMeta } from "./models-DjvggVKS.mjs";
import { n as projectMonthlyTargetCostUsd } from "./cost-B7DUNy9M.mjs";
import { t as Checkbox } from "./checkbox-Bf5-JXC4.mjs";
import { t as ModelIcon } from "./model-icon-CXwDenx1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-picker-CyUiwNgc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "3b7e2a3f-b8a1-46fe-943e-e51ff9084735", e._sentryDebugIdIdentifier = "sentry-dbid-3b7e2a3f-b8a1-46fe-943e-e51ff9084735");
	} catch (e) {}
})();
/** Cents below a dollar, whole dollars above — the precision each range needs. */
function formatUsd(amount) {
	if (amount === 0) return "$0";
	if (amount < .01) return `$${amount.toFixed(4)}`;
	if (amount < 1) return `$${amount.toFixed(3)}`;
	if (amount < 100) return `$${amount.toFixed(2)}`;
	return `$${Math.round(amount).toLocaleString()}`;
}
/**
* The operator's line under a platform: the unit price and who serves it. The
* monthly figure belongs to the page, which can total the whole selection —
* per row it invited adding up twelve numbers to answer one question.
*/
function PlatformOperatorDetail({ option }) {
	if (option.providerName == null && option.costPerRunUsd == null) return null;
	const parts = [option.costPerRunUsd != null ? `≈${formatUsd(option.costPerRunUsd)}/run` : null, option.providerName ?? null].filter(Boolean);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "block font-mono text-[10px] text-muted-foreground tabular-nums",
		children: parts.join(" · ")
	});
}
/**
* What a selection costs to run for a month, at this brand's prompt count and
* cadence. Platforms with no price estimate contribute nothing, so a figure is a
* floor rather than a guess.
*/
function projectSelectionCostUsd(options, selected, costBasis) {
	return options.filter((option) => selected.has(option.model)).reduce((total, option) => total + (projectMonthlyTargetCostUsd({
		costPerRunUsd: option.costPerRunUsd ?? null,
		...costBasis
	}) ?? 0), 0);
}
function PlatformPicker({ options, selected, onSelectedChange, limit, disabled = false, className }) {
	const idPrefix = (0, import_react.useId)();
	const toggle = (model, checked) => {
		const next = new Set(selected);
		if (checked) next.add(model);
		else next.delete(model);
		onSelectedChange(next);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-3", className),
		children: options.map((option) => {
			const checked = selected.has(option.model);
			const atLimit = !checked && limit !== null && selected.size >= limit;
			const checkboxId = `${idPrefix}-${option.model}`;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				htmlFor: checkboxId,
				className: `flex items-center gap-3 rounded-md border p-3 ${atLimit ? "opacity-50" : "cursor-pointer hover:bg-accent/50"}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
						id: checkboxId,
						checked,
						disabled: atLimit || disabled,
						onCheckedChange: (value) => toggle(option.model, value === true)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelIcon, {
						iconId: getModelMeta(option.model).iconId,
						className: "size-5 shrink-0"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-sm font-medium",
							children: getModelMeta(option.model).label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformOperatorDetail, { option })]
					})
				]
			}, option.model);
		})
	});
}
//#endregion
export { projectSelectionCostUsd as i, PlatformPicker as n, formatUsd as r, PlatformOperatorDetail as t };

//# sourceMappingURL=platform-picker-CyUiwNgc.mjs.map