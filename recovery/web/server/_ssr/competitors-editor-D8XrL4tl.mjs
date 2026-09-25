import { i as __toESM } from "../_runtime.mjs";
import { A as IconInfoCircle, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
import { a as Trash2, g as Plus, v as Pencil } from "../_libs/lucide-react.mjs";
import { s as cleanAndValidateDomain } from "./domain-categories-IivSiXtp.mjs";
import { t as TagsInput } from "./tags-input-C2nEtJB0.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/competitors-editor-D8XrL4tl.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "bee9bb7e-234f-49af-9857-a3dbfdbedd24", e._sentryDebugIdIdentifier = "sentry-dbid-bee9bb7e-234f-49af-9857-a3dbfdbedd24");
	} catch (e) {}
})();
/**
* Shared competitor list editor — used by both the settings/competitors page
* (long-lived edits) and the prompt wizard's Review step (one-shot setup).
*
* Controlled component: caller owns the `competitors` array + the change
* callbacks. State helpers like expand/collapse and the "X/MAX competitors
* configured" footer live here so both surfaces look identical.
*/
function newCompetitorEntry(partial) {
	return {
		_key: crypto.randomUUID(),
		name: partial?.name ?? "",
		domains: partial?.domains ?? [],
		aliases: partial?.aliases ?? [],
		expanded: partial?.expanded ?? true
	};
}
function CompetitorsEditor({ competitors, onChange, disabled }) {
	const validateDomain = (0, import_react.useCallback)((val) => {
		if (!cleanAndValidateDomain(val)) return `"${val}" is not a valid domain`;
		return true;
	}, []);
	const update = (key, patch) => {
		onChange(competitors.map((c) => c._key === key ? {
			...c,
			...patch
		} : c));
	};
	const remove = (index) => onChange(competitors.filter((_, i) => i !== index));
	const add = () => {
		if (competitors.length >= 100) return;
		onChange([...competitors, newCompetitorEntry()]);
	};
	const validCount = competitors.filter((c) => c.name.trim() && c.domains.some((d) => d.trim())).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			competitors.map((competitor, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border rounded-lg overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-w-0",
							children: [competitor.name ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-medium",
								children: competitor.name
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm text-muted-foreground italic",
								children: "Unnamed competitor"
							}), competitor.domains.some(Boolean) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground ml-2",
								children: competitor.domains.filter(Boolean)[0]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "sm",
							onClick: () => update(competitor._key, { expanded: !competitor.expanded }),
							className: "p-1.5 h-auto cursor-pointer shrink-0",
							disabled,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3.5 w-3.5 text-muted-foreground" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "sm",
							onClick: () => remove(index),
							className: "p-1.5 h-auto cursor-pointer shrink-0 text-muted-foreground hover:text-destructive",
							disabled,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
						})
					]
				}), competitor.expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-3 pb-3 pt-0 space-y-3 border-t bg-muted/30",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5 pt-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								className: "text-xs font-medium flex items-center gap-1.5",
								children: ["Name", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
									className: "max-w-xs text-xs font-normal",
									children: [
										"The primary name used to detect this competitor in AI responses. Mention detection applies to",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "future" }),
										" prompt runs only."
									]
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "text",
								value: competitor.name,
								onChange: (e) => update(competitor._key, { name: e.target.value }),
								placeholder: "Competitor name",
								className: "bg-background",
								disabled
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								className: "text-xs font-medium flex items-center gap-1.5",
								children: ["Domains", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
									className: "max-w-xs text-xs font-normal",
									children: "All domains owned by this competitor. Citation categorization updates retroactively — existing citations from these domains will immediately be classified as \"competitor\"."
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsInput, {
								value: competitor.domains.filter(Boolean),
								onValueChange: (values) => update(competitor._key, { domains: values }),
								placeholder: "Add domain...",
								maxItems: 10,
								normalizeValue: (raw) => cleanAndValidateDomain(raw) ?? raw.trim(),
								pasteSplitter: /[\n,\t]+/,
								onValidate: validateDomain
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								className: "text-xs font-medium flex items-center gap-1.5",
								children: ["Aliases", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
									className: "max-w-xs text-xs font-normal",
									children: [
										"Alternative names for this competitor (sub-brands, product names, abbreviations). Used for mention detection in ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "future" }),
										" prompt runs only — does not apply retroactively."
									]
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsInput, {
								value: competitor.aliases,
								onValueChange: (values) => update(competitor._key, { aliases: values }),
								placeholder: "Add alias...",
								maxItems: 10
							})]
						})
					]
				})]
			}, competitor._key)),
			competitors.length < 100 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				type: "button",
				variant: "outline",
				size: "sm",
				onClick: add,
				className: "flex items-center gap-2 cursor-pointer",
				disabled,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Add Competitor"]
			}),
			competitors.length >= 100 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: [
					"Maximum of ",
					100,
					" competitors allowed. Remove a competitor to add a new one."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
						validCount,
						"/",
						100
					] }),
					" ",
					"competitors configured"
				]
			})
		]
	});
}
//#endregion
export { newCompetitorEntry as n, CompetitorsEditor as t };

//# sourceMappingURL=competitors-editor-D8XrL4tl.mjs.map