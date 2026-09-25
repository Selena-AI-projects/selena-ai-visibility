import { U as IconCheck, b as IconMinus } from "../_libs/react+tabler__icons-react.mjs";
import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { a as CardHeader, i as CardFooter, n as CardContent, o as CardTitle, t as Card } from "./card-CTzAVKuz.mjs";
import { f as premiumPairings, i as PLATFORM_TIER_LABELS, n as PLANS, r as PLAN_KEYS, u as platformTierMembers } from "./plans-D-CRwAoX.mjs";
import { t as ModelIcon } from "./model-icon-CXwDenx1.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/plan-comparison-DI2j5M0B.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "04eccb9f-6ea9-4edb-8bb6-a2eb9887e28e", e._sentryDebugIdIdentifier = "sentry-dbid-04eccb9f-6ea9-4edb-8bb6-a2eb9887e28e");
	} catch (e) {}
})();
/**
* The cloud plan ladder: a centred row of price cards, and one detail table
* beneath.
*
* The cards used to carry the full platform breakdown each, which meant the
* same thirteen model names were printed four times and every card ran about a
* screen tall — so comparing two plans meant scrolling past the parts they
* agree on. Here each fact is stated once, in a row the plans differ across,
* which is the shape the question actually has.
*
* Every section of the table names the plans again, so a reader deep in the
* premium rows still knows which column is which. That is what frees the cards
* from the table's columns: they carry no data a row has to line up with, so
* they centre on the page and stack on a narrow one, while the table keeps a
* minimum width and scrolls sideways rather than reflowing — a comparison
* whose columns don't line up isn't one.
*/
/** Label column plus one column per plan, shared by the cards and every row. */
var GRID = "grid min-w-[52rem] grid-cols-[minmax(11rem,1.1fr)_repeat(4,minmax(0,1fr))]";
function PlanComparison({ annual, activePlan, highlightPlan, align = "center", renderAction }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", align === "center" ? "mx-auto max-w-3xl" : "max-w-4xl"),
			children: PLAN_KEYS.map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlanHeaderCard, {
				plan: PLANS[key],
				annual,
				active: activePlan === key,
				highlighted: activePlan == null && highlightPlan === key,
				action: renderAction?.(PLANS[key])
			}, key))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto pb-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: GRID,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: "Limits" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: "Brands",
						cell: (plan) => plan.maxBrands
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: "Tracked prompts",
						cell: (plan) => plan.maxPrompts
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: "Platforms per brand",
						cell: (plan) => plan.platformPicks
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: "Sampling",
						cell: (plan) => `${plan.standardRunsPerDay}×/day`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: "Seats",
						cell: () => "Unlimited"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: "API access",
						cell: () => true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformSection, { tier: "scraped" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformSection, { tier: "api" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionHeading, { children: [PLATFORM_TIER_LABELS.premium, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-2 font-mono text-[10px] font-normal text-muted-foreground tabular-nums",
						children: [1, "×/day"]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: "Included",
						cell: (plan) => plan.premiumIncluded > 0 ? premiumPairings(plan.premiumIncluded) : false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: "Buy more",
						cell: (plan) => plan.premiumAddonAvailable ? `$5/mo each` : false
					}),
					platformTierMembers("premium").map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						label: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelLabel, {
							iconId: member.iconId,
							label: member.label
						}),
						cell: (plan) => plan.premiumIncluded > 0 || plan.premiumAddonAvailable
					}, member.model))
				]
			})
		})]
	});
}
/**
* Name, price and call to action. Everything a plan and its neighbours disagree
* about lives in the table below, so this stays short enough that four of them
* fit above the fold.
*/
function PlanHeaderCard({ plan, annual, active, highlighted, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: cn("gap-3 py-4", active && "border-primary ring-1 ring-primary", !active && highlighted && "border-primary"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
				className: "px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
					className: "flex flex-wrap items-center justify-center gap-1.5 text-base",
					children: [plan.name, active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: "Current" }) : highlighted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "secondary",
						children: "Popular"
					}) : null]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-baseline justify-center gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-2xl font-bold tabular-nums",
						children: ["$", (annual ? plan.annualPriceUsd : plan.monthlyPriceUsd).toLocaleString()]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm text-muted-foreground",
						children: annual ? "/yr" : "/mo"
					})]
				})
			}),
			action && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardFooter, {
				className: "px-4",
				children: action
			})
		]
	});
}
/**
* A section title, and the plan names again beneath it.
*
* The names repeat here rather than sitting in one row at the top because the
* cards are long gone by the time you reach the premium rows, and a column of
* ticks says nothing without the plan it belongs to. Sticky headers can't do
* this job: the horizontal scroll container is the containing block for
* `position: sticky`, so a vertical offset never engages.
*/
function SectionHeading({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border-b px-3 pt-7 pb-2 text-xs font-semibold tracking-wide uppercase",
		children
	}), PLAN_KEYS.map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border-b px-3 pt-7 pb-2 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase",
		children: PLANS[key].name
	}, key))] });
}
/** One platform tier: its models as rows, ticked on the plans that sell them. */
function PlatformSection({ tier }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: PLATFORM_TIER_LABELS[tier] }), platformTierMembers(tier).map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
		label: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelLabel, {
			iconId: member.iconId,
			label: member.label
		}),
		cell: (plan) => plan.platformMenu.includes(member.model)
	}, member.model))] });
}
function ModelLabel({ iconId, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelIcon, {
			iconId,
			className: "size-3.5 shrink-0"
		}), label]
	});
}
/**
* A boolean cell renders as a tick or a dash; anything else renders as itself.
* `false` and "not sold here" are the same statement, so a plan that omits a
* feature reads the same whether the row counts something or merely has it.
*/
function Row({ label, cell }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border-b px-3 py-2 text-sm text-muted-foreground",
		children: label
	}), PLAN_KEYS.map((key) => {
		const value = cell(PLANS[key]);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center justify-center border-b px-3 py-2 text-center text-sm",
			children: value === true ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconCheck, {
				className: "size-4 text-emerald-600",
				"aria-label": "Included"
			}) : value === false ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconMinus, {
				className: "size-4 text-muted-foreground/40",
				"aria-label": "Not included"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular-nums",
				children: value
			})
		}, key);
	})] });
}
//#endregion
export { PlanComparison as t };

//# sourceMappingURL=plan-comparison-DI2j5M0B.mjs.map