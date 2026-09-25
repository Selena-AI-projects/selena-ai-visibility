import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { v as useSearch } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { D as Clock, F as Check, P as ChevronDown, f as Search, s as Tag, t as X } from "../_libs/lucide-react.mjs";
import { f as getDefaultLookbackPeriod } from "./chart-utils-fSx3DwB3.mjs";
import { n as useBrand } from "./use-brands-CqDybx5x.mjs";
import { a as labelForModelFilter, i as iconIdForModelFilter, n as getAvailableModels, r as groupTrackedTargets } from "./model-filter-DGVUY-LA.mjs";
import { i as useFilterNavigate, n as joinTags, r as splitTags, t as coerceLookback } from "./use-list-filters-BRE2FD-y.mjs";
import { a as DropdownMenuLabel, l as DropdownMenuTrigger, n as DropdownMenuContent, o as DropdownMenuRadioGroup, r as DropdownMenuGroup, s as DropdownMenuRadioItem, t as DropdownMenu } from "./dropdown-menu-_EIWZQsZ.mjs";
import { n as MdSelectAll } from "../_libs/react-icons.mjs";
import { t as ModelIcon } from "./model-icon-CXwDenx1.mjs";
import { n as PopoverContent, r as PopoverTrigger, t as Popover } from "./popover-TvG17E-A.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/filter-bar-CrWyPYxO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "877c82c3-0fb7-4bbb-8267-cacc8b36157e", e._sentryDebugIdIdentifier = "sentry-dbid-877c82c3-0fb7-4bbb-8267-cacc8b36157e");
	} catch (e) {}
})();
/** The model filter's trigger glyph. `all` is the no-filter sentinel; every
*  other value names one of the brand's targets, whose logo is decided by
*  @workspace/config/models. */
function iconForModel(model, className = "size-3.5") {
	if (model === "all") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MdSelectAll, { className });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelIcon, {
		iconId: iconIdForModelFilter(model),
		className
	});
}
function labelForModel(model) {
	return labelForModelFilter(model);
}
var LOOKBACK_OPTIONS = [
	{
		value: "1w",
		label: "Last 7 days"
	},
	{
		value: "1m",
		label: "Last 30 days"
	},
	{
		value: "3m",
		label: "Last 3 months"
	},
	{
		value: "6m",
		label: "Last 6 months"
	},
	{
		value: "1y",
		label: "Last 12 months"
	},
	{
		value: "all",
		label: "All time"
	}
];
function getLookbackLabel(lookback) {
	return LOOKBACK_OPTIONS.find((o) => o.value === lookback)?.label ?? lookback;
}
function FilterTriggerButton({ icon, label, active, badgeCount, className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		variant: "outline",
		size: "sm",
		...props,
		className: `h-8 gap-1.5 cursor-pointer font-normal ${active ? "border-foreground/30 bg-accent/50" : ""} ${className ?? ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground flex items-center",
				children: icon
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-foreground",
				children: label
			}),
			badgeCount !== void 0 && badgeCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground",
				children: badgeCount
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3.5 text-muted-foreground" })
		]
	});
}
function ModelDropdown({ trackedTargets }) {
	const availableModels = getAvailableModels(trackedTargets);
	const defaultModel = availableModels.includes("all") ? "all" : availableModels[0] ?? "all";
	const urlModel = useSearch({
		strict: false,
		select: (s) => s.model
	});
	const setFilters = useFilterNavigate();
	const selected = urlModel && availableModels.includes(urlModel) ? urlModel : defaultModel;
	const handleChange = (next) => {
		setFilters({ model: next === defaultModel ? void 0 : next });
	};
	if (availableModels.length <= 1) return null;
	const isFiltered = selected !== "all";
	const groups = groupTrackedTargets(trackedTargets);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterTriggerButton, {
			icon: iconForModel(selected),
			label: labelForModel(selected),
			active: isFiltered
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuContent, {
		align: "start",
		className: "w-56",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuRadioGroup, {
			value: selected,
			onValueChange: handleChange,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuRadioItem, {
				value: "all",
				className: "cursor-pointer gap-2",
				children: [iconForModel("all"), labelForModel("all")]
			}), groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuGroup, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuLabel, {
				className: "text-muted-foreground text-xs font-medium",
				children: group.label
			}), group.values.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuRadioItem, {
				value,
				className: "cursor-pointer gap-2",
				children: [iconForModel(value), labelForModel(value)]
			}, value))] }, group.tier))]
		})
	})] });
}
function LookbackDropdown() {
	const { brand } = useBrand();
	const defaultLookback = (0, import_react.useMemo)(() => getDefaultLookbackPeriod(brand?.earliestDataDate), [brand?.earliestDataDate]);
	const urlLookback = useSearch({
		strict: false,
		select: (s) => s.lookback
	});
	const setFilters = useFilterNavigate();
	const selected = coerceLookback(urlLookback, defaultLookback);
	const handleChange = (next) => {
		setFilters({ lookback: next === defaultLookback ? void 0 : next });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterTriggerButton, {
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "size-3.5" }),
			label: getLookbackLabel(selected)
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuContent, {
		align: "start",
		className: "w-48",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuRadioGroup, {
			value: selected,
			onValueChange: (v) => handleChange(v),
			children: LOOKBACK_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuRadioItem, {
				value: opt.value,
				className: "cursor-pointer",
				children: opt.label
			}, opt.value))
		})
	})] });
}
function TagsDropdown({ availableTags }) {
	const urlTags = useSearch({
		strict: false,
		select: (s) => s.tags
	});
	const setFilters = useFilterNavigate();
	const selected = (0, import_react.useMemo)(() => splitTags(urlTags), [urlTags]);
	const commit = (next) => {
		setFilters({ tags: joinTags(next) });
	};
	const toggle = (tag) => {
		commit(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
	};
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		modal: false,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterTriggerButton, {
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { className: "size-3.5" }),
				label: "Tags",
				active: selected.length > 0,
				badgeCount: selected.length > 0 ? selected.length : void 0
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
			align: "start",
			className: "w-64 p-0",
			onOpenAutoFocus: (e) => e.preventDefault(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-3 h-10 border-b",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium text-sm",
					children: "Tags"
				}), selected.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => commit([]),
					className: "min-h-11 min-w-11 text-xs text-muted-foreground hover:text-foreground cursor-pointer",
					children: "Clear"
				})]
			}), availableTags.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground py-6 text-center",
				children: "No tags available"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "py-1 max-h-64 overflow-y-auto",
				children: availableTags.map((tag) => {
					const checked = selected.includes(tag);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						"aria-pressed": checked,
						onClick: (event) => {
							event.preventDefault();
							event.stopPropagation();
							toggle(tag);
						},
						className: `flex min-h-11 w-full items-center gap-2.5 py-1.5 px-3 cursor-pointer text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${checked ? "bg-accent" : "hover:bg-muted"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							className: `flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs ${checked ? "border-primary bg-primary text-primary-foreground" : "border-input"}`,
							children: checked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "capitalize flex-1",
							children: tag
						})]
					}, tag);
				})
			})]
		})]
	});
}
function SearchInput({ placeholder = "Search prompts..." }) {
	const urlValue = useSearch({
		strict: false,
		select: (s) => s.q
	});
	const setFilters = useFilterNavigate();
	const value = urlValue ?? "";
	const [local, setLocal] = (0, import_react.useState)(value);
	const pendingTargetRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (pendingTargetRef.current !== null) {
			if (value === pendingTargetRef.current) {
				pendingTargetRef.current = null;
				return;
			}
			pendingTargetRef.current = null;
			setLocal(value);
			return;
		}
		setLocal((current) => current === value ? current : value);
	}, [value]);
	(0, import_react.useEffect)(() => {
		if (local === value) return;
		if (local === pendingTargetRef.current) return;
		const timer = setTimeout(() => {
			pendingTargetRef.current = local;
			setFilters({ q: local.length ? local : void 0 });
		}, 250);
		return () => clearTimeout(timer);
	}, [
		local,
		value,
		setFilters
	]);
	const clear = () => {
		setLocal("");
		if (value !== "") {
			pendingTargetRef.current = "";
			setFilters({ q: void 0 });
		} else pendingTargetRef.current = null;
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative w-full sm:w-64",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: local,
				onChange: (e) => setLocal(e.target.value),
				placeholder,
				className: "h-8 pl-8 pr-8 text-sm"
			}),
			local && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: clear,
				className: "absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer",
				"aria-label": "Clear search",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
			})
		]
	});
}
function ResultCount({ count, total }) {
	const tags = useSearch({
		strict: false,
		select: (s) => s.tags
	});
	const q = useSearch({
		strict: false,
		select: (s) => s.q
	});
	if (!(Boolean(tags) || Boolean(q)) || count === void 0) return null;
	const showTotal = total !== void 0 && total !== count;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "text-xs text-muted-foreground tabular-nums ml-1",
		children: [
			count.toLocaleString(),
			showTotal && ` of ${total.toLocaleString()}`,
			" ",
			count === 1 && !showTotal ? "result" : "results"
		]
	});
}
function FilterBar({ availableTags, trackedTargets, showSearch, showModelSelector, resultCount, resultTotal, extraControls }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-1.5",
			children: [
				showModelSelector && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelDropdown, { trackedTargets }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsDropdown, { availableTags }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LookbackDropdown, {}),
				extraControls,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultCount, {
					count: resultCount,
					total: resultTotal
				})
			]
		}), showSearch && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchInput, {})]
	});
}
//#endregion
export { FilterTriggerButton as n, FilterBar as t };

//# sourceMappingURL=filter-bar-CrWyPYxO.mjs.map