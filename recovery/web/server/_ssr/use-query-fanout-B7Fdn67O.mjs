import { i as __toESM } from "../_runtime.mjs";
import { A as IconInfoCircle, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime, n as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { y as useParams } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Primitive } from "./dist-Dkr14p02.mjs";
import { t as Separator } from "./separator-D7PdY237.mjs";
import { n as composeEventHandlers, r as useControllableState, t as Presence } from "./dist-BUa3vsWH.mjs";
import { t as createContextScope } from "./dist-NquxrNib.mjs";
import { a as useId$1 } from "./dist-1xKXGPiL.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { n as getModelMeta } from "./models-DjvggVKS.mjs";
import { n as useDirection } from "./dist-BBk_4MHb.mjs";
import { n as Root, r as createRovingFocusGroupScope, t as Item } from "./dist-BpVimTz4.mjs";
import { t as Switch } from "./switch-2VQ8weif.mjs";
import { t as LOOKBACK } from "./analysis-BlgoS24m.mjs";
import { r as normTok } from "./fanout-analysis-Bt4WW_et.mjs";
import { t as ProgressBarChart } from "./progress-bar-chart-BLiquGfW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-query-fanout-B7Fdn67O.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "b8361b92-5821-4cb0-b1a4-408fc54bd132", e._sentryDebugIdIdentifier = "sentry-dbid-b8361b92-5821-4cb0-b1a4-408fc54bd132");
	} catch (e) {}
})();
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", {
	value,
	configurable: true
});
var TABS_NAME = "Tabs";
var [createTabsContext, createTabsScope] = createContextScope(TABS_NAME, [createRovingFocusGroupScope]);
var useRovingFocusGroupScope = createRovingFocusGroupScope();
var [TabsProvider, useTabsContext] = createTabsContext(TABS_NAME);
var Tabs$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function Tabs2(props, forwardedRef) {
	const { __scopeTabs, value: valueProp, onValueChange, defaultValue, orientation = "horizontal", dir, activationMode = "automatic", ...tabsProps } = props;
	const direction = useDirection(dir);
	const [value, setValue] = useControllableState({
		prop: valueProp,
		onChange: onValueChange,
		defaultProp: defaultValue ?? "",
		caller: TABS_NAME
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsProvider, {
		scope: __scopeTabs,
		baseId: useId$1(),
		value,
		onValueChange: setValue,
		orientation,
		dir: direction,
		activationMode,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
			dir: direction,
			"data-orientation": orientation,
			...tabsProps,
			ref: forwardedRef
		})
	});
}, "Tabs"));
var TAB_LIST_NAME = "TabsList";
var TabsList$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function TabsList2(props, forwardedRef) {
	const { __scopeTabs, loop = true, ...listProps } = props;
	const context = useTabsContext(TAB_LIST_NAME, __scopeTabs);
	const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
		asChild: true,
		...rovingFocusGroupScope,
		orientation: context.orientation,
		dir: context.dir,
		loop,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
			role: "tablist",
			"aria-orientation": context.orientation,
			...listProps,
			ref: forwardedRef
		})
	});
}, "TabsList"));
var TRIGGER_NAME = "TabsTrigger";
var TabsTrigger$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function TabsTrigger2(props, forwardedRef) {
	const { __scopeTabs, value, disabled = false, ...triggerProps } = props;
	const context = useTabsContext(TRIGGER_NAME, __scopeTabs);
	const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
	const triggerId = makeTriggerId(context.baseId, value);
	const contentId = makeContentId(context.baseId, value);
	const isSelected = value === context.value;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
		asChild: true,
		...rovingFocusGroupScope,
		focusable: !disabled,
		active: isSelected,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.button, {
			type: "button",
			role: "tab",
			"aria-selected": isSelected,
			"aria-controls": contentId,
			"data-state": isSelected ? "active" : "inactive",
			"data-disabled": disabled ? "" : void 0,
			disabled,
			id: triggerId,
			...triggerProps,
			ref: forwardedRef,
			onMouseDown: composeEventHandlers(props.onMouseDown, (event) => {
				if (!disabled && event.button === 0 && event.ctrlKey === false) context.onValueChange(value);
				else event.preventDefault();
			}),
			onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
				if (disabled || event.target !== event.currentTarget) return;
				if ([" ", "Enter"].includes(event.key)) context.onValueChange(value);
			}),
			onFocus: composeEventHandlers(props.onFocus, () => {
				const isAutomaticActivation = context.activationMode !== "manual";
				if (!isSelected && !disabled && isAutomaticActivation) context.onValueChange(value);
			})
		})
	});
}, "TabsTrigger"));
var CONTENT_NAME = "TabsContent";
var TabsContent$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function TabsContent2(props, forwardedRef) {
	const { __scopeTabs, value, forceMount, children, ...contentProps } = props;
	const context = useTabsContext(CONTENT_NAME, __scopeTabs);
	const triggerId = makeTriggerId(context.baseId, value);
	const contentId = makeContentId(context.baseId, value);
	const isSelected = value === context.value;
	const isMountAnimationPreventedRef = import_react.useRef(isSelected);
	import_react.useEffect(() => {
		const rAF = requestAnimationFrame(() => isMountAnimationPreventedRef.current = false);
		return () => cancelAnimationFrame(rAF);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
		present: forceMount || isSelected,
		children: ({ present }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
			"data-state": isSelected ? "active" : "inactive",
			"data-orientation": context.orientation,
			role: "tabpanel",
			"aria-labelledby": triggerId,
			hidden: !present,
			id: contentId,
			tabIndex: 0,
			...contentProps,
			ref: forwardedRef,
			style: {
				...props.style,
				animationDuration: isMountAnimationPreventedRef.current ? "0s" : void 0
			},
			children: present && children
		})
	});
}, "TabsContent"));
function makeTriggerId(baseId, value) {
	return `${baseId}-trigger-${value}`;
}
__name(makeTriggerId, "makeTriggerId");
function makeContentId(baseId, value) {
	return `${baseId}-content-${value}`;
}
__name(makeContentId, "makeContentId");
var Root2 = Tabs$1;
var List = TabsList$1;
var Trigger = TabsTrigger$1;
var Content = TabsContent$1;
function Tabs({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root2, {
		"data-slot": "tabs",
		className: cn("flex flex-col gap-2", className),
		...props
	});
}
function TabsList({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
		"data-slot": "tabs-list",
		className: cn("bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]", className),
		...props
	});
}
function TabsTrigger({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
		"data-slot": "tabs-trigger",
		className: cn("data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className),
		...props
	});
}
function TabsContent({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
		"data-slot": "tabs-content",
		className: cn("flex-1 outline-none", className),
		...props
	});
}
/**
* Shared utility functions.
*/
/**
* Display name for a model id. Thin wrapper over `getModelMeta` so the UI
* works for any deployment-configured model, not just the ones we happen
* to have hardcoded in a switch. Unknown ids get a title-cased fallback.
*/
function getModelDisplayName(model) {
	return getModelMeta(model).label;
}
/**
* Dependency-free term cloud. Sizes each term by sqrt(count) (so a 100× term
* isn't 100× the height), colors it by frequency, and centers the biggest terms
* so it reads like a cloud rather than a sorted list. Deterministic — no random
* placement — so it's SSR-stable.
*/
var PALETTE = [
	"#7c3aed",
	"#4f46e5",
	"#2563eb",
	"#0891b2",
	"#0d9488",
	"#059669",
	"#d97706"
];
var MIN_PX = 13;
function WordCloud({ terms, maxItems = 48, className }) {
	const items = [...terms].sort((a, b) => b.count - a.count).slice(0, maxItems);
	if (items.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-muted-foreground py-6 text-center text-sm",
		children: "No terms for this period."
	});
	const counts = items.map((i) => i.count);
	const max = Math.max(...counts);
	const min = Math.min(...counts);
	const rootMax = Math.sqrt(max);
	const rootMin = Math.sqrt(min);
	const scale = (count) => max === min ? .6 : (Math.sqrt(count) - rootMin) / (rootMax - rootMin);
	const ordered = [];
	items.forEach((it, i) => {
		if (i % 2 === 0) ordered.push(it);
		else ordered.unshift(it);
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-wrap items-center justify-center gap-x-3 gap-y-1 leading-tight", className),
		children: ordered.map((it) => {
			const t = scale(it.count);
			const color = PALETTE[Math.min(PALETTE.length - 1, Math.round((1 - t) * (PALETTE.length - 1)))];
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				title: `${it.term} · ${it.count.toLocaleString()}`,
				className: "font-semibold",
				style: {
					fontSize: Math.round(MIN_PX + t * 27),
					color,
					opacity: .62 + t * .38
				},
				children: it.term
			}, it.term);
		})
	});
}
/**
* Shared fan-out UI sections, used by the Query Fan-Out page and the prompt
* details "Web Queries" tab: variation lines with prompt-keyword bolding and
* run counts, a per-model variations breakdown, and the Query Words section
* (term cloud + Added/Preserved/Dropped word changes).
*/
var FANOUT_PURPLE = "#8b5cf6";
function InfoTip({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "cursor-help",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "text-muted-foreground/60 size-3.5" })
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
		className: "max-w-xs text-sm font-normal",
		children
	})] });
}
/**
* Engines that ran with web search but contributed no usable queries — they
* searched with the prompt itself or don't reveal their searches. Purely
* data-derived (search runs without exposed queries), so it stays correct for
* any provider/model combination. Renders nothing when every engine exposed
* queries.
*/
function UnknownQueriesNote({ byModel }) {
	const hidden = byModel.filter((m) => m.runs > 0 && m.totalQueries === 0);
	if (hidden.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "text-muted-foreground text-xs",
		children: [hidden.map((m) => getModelDisplayName(m.model)).join(", "), " ran with web search enabled but the queries are unknown — the engine may not have searched, searched with just the prompt itself, or searched without revealing its queries."]
	});
}
function VariationLine({ variation, keywords, modelCounts }) {
	const seen = /* @__PURE__ */ new Map();
	const segs = variation.query.split(/\s+/).filter(Boolean).map((w) => {
		const n = seen.get(w) ?? 0;
		seen.set(w, n + 1);
		return {
			text: w,
			bold: keywords.has(normTok(w)),
			key: `${w}:${n}`
		};
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-baseline justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-w-0 text-sm leading-6 break-words",
			children: segs.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: s.bold ? "text-foreground font-semibold" : "text-muted-foreground",
				children: [s.text, " "]
			}, s.key))
		}), modelCounts?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted-foreground shrink-0 text-right text-xs tabular-nums leading-6",
			title: "Times each engine ran this search",
			children: modelCounts.map((mc) => `${mc.count.toLocaleString()}× ${getModelDisplayName(mc.model)}`).join(" · ")
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-muted-foreground shrink-0 text-sm tabular-nums",
			title: "Times engines ran this search",
			children: [variation.count.toLocaleString(), "×"]
		})]
	});
}
function VariationsList({ variations, keywords, totalUnique, modelCounts }) {
	if (variations.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-muted-foreground py-4 text-sm",
		children: "No web queries for this selection."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [variations.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VariationLine, {
			variation: v,
			keywords,
			modelCounts: modelCounts?.get(v.query)
		}, v.query)), totalUnique !== void 0 && totalUnique > variations.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-muted-foreground text-xs",
			children: [
				"Top ",
				variations.length,
				" of ",
				totalUnique.toLocaleString(),
				" variations shown"
			]
		})]
	});
}
var WORD_TAB_HELP = {
	added: "Words engines add that weren't in your prompt — the intent they layer on (e.g. “best”, “2026”, “vs”).",
	preserved: "Words from your prompt engines keep in their searches.",
	dropped: "Words from your prompt engines leave out of their searches."
};
function QueryWordsSection({ terms, wordChanges }) {
	const [tab, setTab] = (0, import_react.useState)("added");
	const [hideStop, setHideStop] = (0, import_react.useState)(true);
	const words = wordChanges[tab];
	const items = (hideStop ? words.filter((w) => !w.isStop) : words).slice(0, 18).map((w) => ({
		label: w.word,
		count: w.count,
		suffix: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-muted-foreground tabular-nums text-xs",
			children: [w.share, "%"]
		})
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "py-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WordCloud, { terms }) })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
						className: "flex items-center gap-1.5 text-base",
						children: ["Word Changes", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoTip, { children: WORD_TAB_HELP[tab] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "How engines rewrite your prompt wording." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								id: "qf-hide-stop",
								checked: hideStop,
								onCheckedChange: setHideStop
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "qf-hide-stop",
								className: "text-muted-foreground cursor-pointer text-sm",
								children: "Hide stop words"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tabs, {
							value: tab,
							onValueChange: (v) => setTab(v),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
									value: "added",
									children: "Added"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
									value: "preserved",
									children: "Preserved"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
									value: "dropped",
									children: "Dropped"
								})
							] })
						})]
					})]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: items.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressBarChart, {
					items,
					defaultColor: FANOUT_PURPLE
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-muted-foreground py-6 text-center text-sm",
					children: [
						"No ",
						tab,
						" words",
						hideStop ? " (try showing stop words)" : "",
						"."
					]
				}) })
			]
		})]
	});
}
/**
* Server function for the Query Fanout page. Read-only — derived entirely from
* `prompt_runs.web_queries` (the sub-queries engines run while answering a
* prompt), uniformly across providers. Engines that don't expose their
* searches contribute runs but no queries. No schema changes.
*
* Filters (tags/search → prompt IDs, lookback → date range in the user's
* timezone) are resolved server-side exactly like Share of Voice, so the same
* prompt set and window back every figure on the page. See `server/analysis.ts`.
*/
var getQueryFanoutFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: LOOKBACK.default("1m"),
	model: string().optional(),
	tags: string().optional(),
	search: string().optional(),
	/** Scope to a single prompt (prompt-details Web Queries tab) — lists come back uncapped. */
	promptId: string().optional(),
	timezone: string().default("UTC")
})).handler(createSsrRpc("bb2bb785d141880b1ce95e0f119182564c8b822f27d57519ab11f968738e8cda"));
var queryFanoutKeys = {
	all: ["query-fanout"],
	list: (brandId, filters) => [
		...queryFanoutKeys.all,
		brandId,
		filters
	]
};
function useQueryFanout(brandId, filters) {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const query = useQuery({
		queryKey: queryFanoutKeys.list(resolvedBrandId || "", filters),
		queryFn: () => getQueryFanoutFn({ data: {
			brandId: resolvedBrandId,
			lookback: filters?.lookback ?? "1m",
			model: filters?.model,
			tags: filters?.tags?.join(","),
			promptId: filters?.promptId,
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
//#endregion
export { TabsList as a, VariationLine as c, useQueryFanout as d, TabsContent as i, VariationsList as l, QueryWordsSection as n, TabsTrigger as o, Tabs as r, UnknownQueriesNote as s, InfoTip as t, getModelDisplayName as u };

//# sourceMappingURL=use-query-fanout-B7Fdn67O.mjs.map