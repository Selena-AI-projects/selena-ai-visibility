import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { n as getModelMeta } from "./models-DjvggVKS.mjs";
import { n as PlatformPicker } from "./platform-picker-CyUiwNgc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-selection-step-lm2iF7uo.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "11817584-f52f-4fc7-a412-65507e65cfac", e._sentryDebugIdIdentifier = "sentry-dbid-11817584-f52f-4fc7-a412-65507e65cfac");
	} catch (e) {}
})();
/**
* The platform step every brand-creation flow shares: which platforms the new
* brand is tracked on, within what the plan sells. Picking here rather than
* accepting the plan defaults matters because the first cycle starts as soon as
* the brand exists — a set corrected afterwards has already been paid for.
*/
function PlatformSelectionStep({ state, selected, onSelectedChange, disabled, error, onBack, onSubmit, submitLabel }) {
	const limit = state.platformPicks;
	const locked = state.available.length === 1;
	const onlyOption = state.available[0];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: locked && onlyOption ? `Your plan includes ${getModelMeta(onlyOption.model).label} tracking. You can change platforms anytime in settings.` : `Your plan tracks up to ${limit} platform${limit === 1 ? "" : "s"} for this brand. You can change these anytime in settings.`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformPicker, {
				options: state.available,
				selected,
				onSelectedChange,
				limit,
				disabled: disabled || locked,
				className: "sm:grid-cols-1 lg:grid-cols-1"
			}),
			!locked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: selected.size === 0 ? "Pick at least one platform." : `${selected.size} of ${limit} selected`
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-destructive",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: onBack,
					disabled,
					children: "Back"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					className: "flex-1",
					onClick: onSubmit,
					disabled: disabled || selected.size === 0,
					children: submitLabel
				})]
			})
		]
	});
}
//#endregion
export { PlatformSelectionStep as t };

//# sourceMappingURL=platform-selection-step-lm2iF7uo.mjs.map