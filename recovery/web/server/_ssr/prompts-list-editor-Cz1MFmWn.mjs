import { i as __toESM } from "../_runtime.mjs";
import { A as IconInfoCircle, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
import { C as Inbox, g as Plus, x as ListPlus } from "../_libs/lucide-react.mjs";
import { n as getModelMeta } from "./models-DjvggVKS.mjs";
import { d as premiumModelLabel, m as selectPremiumModels, o as PREMIUM_MODELS, p as premiumSlotsUsed } from "./plans-D-CRwAoX.mjs";
import { t as Checkbox } from "./checkbox-Bf5-JXC4.mjs";
import { t as ModelIcon } from "./model-icon-CXwDenx1.mjs";
import { n as PopoverContent, r as PopoverTrigger, t as Popover } from "./popover-TvG17E-A.mjs";
import { t as TagsInput } from "./tags-input-C2nEtJB0.mjs";
import { t as Switch } from "./switch-2VQ8weif.mjs";
import { t as Textarea } from "./textarea-D11Pept6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prompts-list-editor-Cz1MFmWn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "fa21c6f2-03e3-4bff-bd96-d03097591da3", e._sentryDebugIdIdentifier = "sentry-dbid-fa21c6f2-03e3-4bff-bd96-d03097591da3");
	} catch (e) {}
})();
/**
* Comparison key for two prompts being "the same".
*
* Case and surrounding whitespace are ignored, and runs of internal whitespace
* collapse to one space, so a line re-pasted from a wrapped document does not
* arrive as a second distinct prompt.
*/
function dedupeKey(value) {
	return value.trim().replace(/\s+/g, " ").toLowerCase();
}
/**
* Split pasted text into prompts, one per line.
*
* Everything this drops, it names. The caller gets the lines that became
* prompts and, separately, every line that did not along with the reason, so
* the screen can tell someone that three of their lines were already in the
* list rather than leaving them to count.
*
* Capacity is measured against the whole list, not the paste: `limit` is the
* total the list may hold, so a paste of ten lines into a list already holding
* `limit - 2` prompts contributes two and reports eight as over capacity.
*/
function parseBulkPrompts(text, options = {}) {
	const { existing = [], limit = 100 } = options;
	const seen = new Set(existing.map(dedupeKey));
	const room = Math.max(0, limit - existing.length);
	const added = [];
	const skipped = {
		blank: 0,
		duplicateOfExisting: [],
		duplicateInPaste: [],
		overCapacity: []
	};
	const withinPaste = /* @__PURE__ */ new Set();
	for (const raw of text.split(/\r?\n/)) {
		const value = raw.trim();
		if (value.length === 0) {
			skipped.blank += 1;
			continue;
		}
		const key = dedupeKey(value);
		if (withinPaste.has(key)) {
			skipped.duplicateInPaste.push(value);
			continue;
		}
		if (seen.has(key)) {
			skipped.duplicateOfExisting.push(value);
			continue;
		}
		if (added.length >= room) {
			skipped.overCapacity.push(value);
			continue;
		}
		withinPaste.add(key);
		added.push(value);
	}
	return {
		added,
		skipped
	};
}
/**
* One sentence naming what the parse dropped, or null when it dropped nothing.
*
* Over-capacity lines are deliberately absent: they block the paste outright
* rather than being skipped, so the caller reports those as an error instead.
*/
function describeSkipped(skipped) {
	const parts = [];
	const duplicates = skipped.duplicateOfExisting.length + skipped.duplicateInPaste.length;
	if (duplicates > 0) parts.push(`${duplicates} duplicate${duplicates === 1 ? "" : "s"}`);
	if (skipped.blank > 0) parts.push(`${skipped.blank} blank line${skipped.blank === 1 ? "" : "s"}`);
	if (parts.length === 0) return null;
	return `Skipped ${parts.join(" and ")}.`;
}
/**
* Shared prompts table — used by the settings/prompts page (manages a brand's
* full prompt list) and the prompt wizard's Review step (picks from
* AI-suggested prompts + custom additions).
*
* Controlled component: the caller owns the `prompts` array and the change
* callback. The settings page wraps it with save/server logic; the wizard
* keeps it inline. The `showSystemTags` prop hides the System Tags column
* in the wizard since onboarding hasn't yet computed any system tags.
*/
function newPromptEntry(partial) {
	return {
		_key: crypto.randomUUID(),
		value: partial?.value ?? "",
		enabled: partial?.enabled ?? true,
		tags: partial?.tags ?? [],
		systemTags: partial?.systemTags ?? [],
		premiumModels: partial?.premiumModels ?? [],
		...partial?.id ? { id: partial.id } : {}
	};
}
/** Both places that offer more pairings send you to the same page. */
function BillingLink({ brandId, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/app/$brand/settings/billing",
		params: { brand: brandId },
		className: "underline",
		children
	});
}
/**
* Which premium models a prompt is tracked on. A popover rather than a checkbox
* per model because the table has one narrow column for this and the list grows
* as more models ship a usable web-search tool.
*/
function PremiumModelsField({ selected, promptEnabled, atCapacity, brandId, onChange, showLabel }) {
	const summary = selected.length === 0 ? "None" : selected.map(premiumModelLabel).join(", ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			type: "button",
			variant: "outline",
			size: "sm",
			disabled: !promptEnabled,
			className: "h-8 w-full justify-center gap-1 px-2",
			"aria-label": `Premium models: ${summary}`,
			children: selected.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground",
				children: showLabel ? "Premium: none" : "—"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [selected.map((model) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelIcon, {
				iconId: getModelMeta(model).iconId,
				className: "size-3.5"
			}, model)), showLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-1 text-xs",
				children: summary
			})] })
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
		align: "end",
		className: "w-64 space-y-1 p-2",
		children: [PREMIUM_MODELS.map((model) => {
			const checked = selected.includes(model);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				disabled: atCapacity && !checked,
				onClick: () => onChange(selectPremiumModels(checked ? selected.filter((m) => m !== model) : [...selected, model])),
				className: "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
						checked,
						disabled: atCapacity && !checked,
						className: "pointer-events-none"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelIcon, {
						iconId: getModelMeta(model).iconId,
						className: "size-4"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex-1",
						children: premiumModelLabel(model)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-[10px] text-muted-foreground tabular-nums",
						children: [1, "×/day"]
					})
				]
			}, model);
		}), atCapacity && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "px-2 pt-1 text-xs text-muted-foreground",
			children: [
				"No premium pairings left. Untick one, or ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BillingLink, {
					brandId,
					children: "buy more"
				}),
				"."
			]
		})]
	})] });
}
/**
* Every column layout the table can take, spelled out rather than assembled at
* runtime: Tailwind only generates class names that appear literally in source.
*/
var GRID_COLS = {
	"system-basic": "md:grid-cols-[2.25rem_minmax(0,1fr)_6rem_minmax(14rem,1fr)_2.75rem]",
	"system-premium": "md:grid-cols-[2.25rem_minmax(0,1fr)_6rem_minmax(14rem,1fr)_5.5rem_2.75rem]",
	"plain-basic": "md:grid-cols-[2.25rem_minmax(0,1fr)_minmax(14rem,1fr)_2.75rem]",
	"plain-premium": "md:grid-cols-[2.25rem_minmax(0,1fr)_minmax(14rem,1fr)_5.5rem_2.75rem]"
};
function PromptsListEditor({ prompts, onChange, showSystemTags = true, changedKeys, premium }) {
	const [selectedKeys, setSelectedKeys] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const allTagOptions = (0, import_react.useMemo)(() => {
		const set = /* @__PURE__ */ new Set();
		for (const p of prompts) for (const t of p.tags) set.add(t);
		return [...set].sort().map((t) => ({ value: t }));
	}, [prompts]);
	const update = (index, patch) => {
		onChange(prompts.map((p, i) => i === index ? {
			...p,
			...patch
		} : p));
	};
	const add = () => {
		if (prompts.length >= 100) return;
		onChange([...prompts, newPromptEntry()]);
	};
	const [bulkOpen, setBulkOpen] = (0, import_react.useState)(false);
	const [bulkText, setBulkText] = (0, import_react.useState)("");
	const filledValues = (0, import_react.useMemo)(() => prompts.map((p) => p.value).filter((v) => v.trim().length > 0), [prompts]);
	const atCapacity = filledValues.length >= 100;
	const bulkPreview = (0, import_react.useMemo)(() => parseBulkPrompts(bulkText, {
		existing: filledValues,
		limit: 100
	}), [bulkText, filledValues]);
	const bulkNotice = bulkText.trim().length > 0 ? describeSkipped(bulkPreview.skipped) : null;
	const overCapacity = bulkPreview.skipped.overCapacity.length;
	const bulkError = overCapacity > 0 ? `This paste is ${overCapacity} prompt${overCapacity === 1 ? "" : "s"} over the 100 limit. Remove ${overCapacity === 1 ? "a line" : "some lines"} to continue.` : null;
	const closeBulk = () => {
		setBulkOpen(false);
		setBulkText("");
	};
	const addBulk = () => {
		if (bulkPreview.added.length === 0 || overCapacity > 0) return;
		onChange([...prompts, ...bulkPreview.added.map((value) => newPromptEntry({ value }))]);
		closeBulk();
	};
	const liveSelectedCount = prompts.reduce((n, p) => selectedKeys.has(p._key) ? n + 1 : n, 0);
	const allSelected = prompts.length > 0 && liveSelectedCount === prompts.length;
	const toggleSelect = (key) => {
		setSelectedKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};
	const toggleSelectAll = () => {
		if (allSelected) setSelectedKeys(/* @__PURE__ */ new Set());
		else setSelectedKeys(new Set(prompts.map((p) => p._key)));
	};
	const applyEnabledToSelection = (enabled) => {
		if (liveSelectedCount === 0) return;
		onChange(prompts.map((p) => selectedKeys.has(p._key) ? {
			...p,
			enabled
		} : p));
	};
	const clearSelection = () => setSelectedKeys(/* @__PURE__ */ new Set());
	const validCount = prompts.filter((p) => p.enabled && p.value.trim().length > 0).length;
	const premiumUsed = premium ? premium.assignedElsewhere + premiumSlotsUsed(prompts) : 0;
	const premiumAtCapacity = premium ? premiumUsed >= premium.total : false;
	const gridCols = GRID_COLS[`${showSystemTags ? "system" : "plain"}-${premium ? "premium" : "basic"}`];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			liveSelectedCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hidden md:flex flex-wrap items-center justify-between gap-x-2 gap-y-2 rounded-md border bg-muted/40 px-3 py-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-foreground",
						children: liveSelectedCount
					}), " selected"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							size: "sm",
							variant: "outline",
							onClick: () => applyEnabledToSelection(true),
							className: "cursor-pointer",
							children: "Enable"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							size: "sm",
							variant: "outline",
							onClick: () => applyEnabledToSelection(false),
							className: "cursor-pointer",
							children: "Disable"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							size: "sm",
							variant: "ghost",
							onClick: clearSelection,
							className: "cursor-pointer",
							children: "Clear"
						})
					]
				})]
			}),
			premium && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted-foreground",
				children: [
					"Premium:",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-medium text-foreground",
						children: [
							premiumUsed,
							" of ",
							premium.total
						]
					}),
					" ",
					"pairings in use across this workspace — one for each model a prompt is tracked on.",
					premiumAtCapacity && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						" ",
						"Unassign one to free it up, or ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BillingLink, {
							brandId: premium.brandId,
							children: "buy more"
						}),
						"."
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `hidden md:grid ${gridCols} gap-2 text-sm font-medium text-muted-foreground border-b pb-2`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
							checked: allSelected,
							onCheckedChange: toggleSelectAll,
							disabled: prompts.length === 0,
							"aria-label": allSelected ? "Deselect all prompts" : "Select all prompts"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1 min-w-0",
						children: ["Prompt Text", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "max-w-xs",
							children: "The question or query that will be sent to AI models for evaluation."
						}) })] })]
					}),
					showSystemTags && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden md:flex items-center gap-1",
						children: ["System", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "max-w-xs",
							children: "Auto-generated tags like \"branded\" or \"unbranded\" based on prompt content."
						}) })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1 min-w-0",
						children: ["Tags", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "max-w-xs",
							children: "Custom labels to organize and filter prompts."
						}) })] })]
					}),
					premium && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-center gap-1",
						children: ["Premium", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "max-w-xs",
							children: [
								"Also track this prompt on a model called directly with its own web search on, for a grounded answer with citations — ",
								1,
								"× a day. Each model you pick here spends one of the workspace's premium pairings. This is on top of the platforms the brand tracks, which run on every prompt either way."
							]
						}) })] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "sr-only",
							children: "Enabled"
						})
					})
				]
			}),
			prompts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-2 border-dashed border-muted rounded-lg min-h-48 flex items-center justify-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center py-8 text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, { className: "h-12 w-12 mx-auto mb-4 opacity-50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No prompts yet." })]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: prompts.map((prompt, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cn("-ml-3 border-l-2 pl-3 transition-colors", changedKeys?.has(prompt._key) ? "border-amber-500" : "border-transparent", !prompt.enabled && "opacity-60"),
					children: [
						changedKeys?.has(prompt._key) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "sr-only",
							children: "Has unsaved changes"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `md:hidden flex flex-col gap-2 pb-3 ${index < prompts.length - 1 ? "border-b" : ""}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: prompt.value,
										onChange: (e) => update(index, { value: e.target.value }),
										placeholder: "Enter prompt text...",
										className: "min-w-0 flex-1"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "pt-2",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: prompt.enabled,
											onCheckedChange: (checked) => update(index, { enabled: checked }),
											"aria-label": prompt.enabled ? "Disable prompt" : "Enable prompt"
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsInput, {
									value: prompt.tags,
									onValueChange: (tags) => update(index, { tags }),
									options: allTagOptions,
									placeholder: "Add tag...",
									searchPlaceholder: "Search or create tag...",
									normalizeValue: (raw) => raw.toLowerCase().trim()
								}),
								premium && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PremiumModelsField, {
									selected: prompt.premiumModels,
									promptEnabled: prompt.enabled,
									atCapacity: premiumAtCapacity,
									brandId: premium.brandId,
									onChange: (premiumModels) => update(index, { premiumModels }),
									showLabel: true
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `hidden md:grid ${gridCols} gap-2 items-start`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex justify-center pt-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
										checked: selectedKeys.has(prompt._key),
										onCheckedChange: () => toggleSelect(prompt._key),
										"aria-label": "Select prompt"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: prompt.value,
									onChange: (e) => update(index, { value: e.target.value }),
									placeholder: "Enter prompt text...",
									className: "min-w-0"
								}),
								showSystemTags && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsInput, {
									value: prompt.systemTags,
									onValueChange: () => {},
									disabled: true,
									placeholder: "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsInput, {
									value: prompt.tags,
									onValueChange: (tags) => update(index, { tags }),
									options: allTagOptions,
									placeholder: "Add tag...",
									searchPlaceholder: "Search or create tag...",
									normalizeValue: (raw) => raw.toLowerCase().trim()
								}),
								premium && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex justify-center pt-1",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PremiumModelsField, {
										selected: prompt.premiumModels,
										promptEnabled: prompt.enabled,
										atCapacity: premiumAtCapacity,
										brandId: premium.brandId,
										onChange: (premiumModels) => update(index, { premiumModels })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex justify-center pt-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: prompt.enabled,
										onCheckedChange: (checked) => update(index, { enabled: checked }),
										"aria-label": prompt.enabled ? "Disable prompt" : "Enable prompt"
									})
								})
							]
						})
					]
				}, prompt._key))
			}),
			!atCapacity && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [prompts.length < 100 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					type: "button",
					onClick: add,
					className: "flex items-center gap-2 cursor-pointer",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Add Prompt"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					type: "button",
					onClick: () => setBulkOpen((open) => !open),
					className: "flex items-center gap-2 cursor-pointer",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListPlus, { className: "h-4 w-4" }), " Add Multiple"]
				})]
			}),
			bulkOpen && !atCapacity && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2 rounded-md border bg-muted/40 p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						value: bulkText,
						onChange: (e) => setBulkText(e.target.value),
						placeholder: "One prompt per line",
						rows: 6,
						"aria-label": "Prompts to add, one per line"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								type: "button",
								onClick: addBulk,
								disabled: bulkPreview.added.length === 0 || overCapacity > 0,
								children: [
									"Add ",
									bulkPreview.added.length > 0 ? `${bulkPreview.added.length} ` : "",
									bulkPreview.added.length === 1 ? "Prompt" : "Prompts"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								type: "button",
								onClick: closeBulk,
								children: "Cancel"
							}),
							bulkNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: bulkNotice
							})
						]
					}),
					bulkError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						role: "alert",
						className: "text-xs text-destructive",
						children: bulkError
					})
				]
			}),
			atCapacity && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: [
					"Maximum of ",
					100,
					" prompts allowed. Remove a prompt to add a new one."
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
					"prompts configured"
				]
			})
		]
	});
}
//#endregion
export { newPromptEntry as n, PromptsListEditor as t };

//# sourceMappingURL=prompts-list-editor-Cz1MFmWn.mjs.map