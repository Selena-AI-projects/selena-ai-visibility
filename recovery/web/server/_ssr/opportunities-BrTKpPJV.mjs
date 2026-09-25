import { i as __toESM } from "../_runtime.mjs";
import { R as IconClock, T as IconLoader2, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime, n as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { m as Link, y as useParams } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Skeleton } from "./skeleton-BcIvnIuu.mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, c as _enum, f as array } from "../_libs/zod.mjs";
import { n as PageHeader } from "./page-header-Da9U5Lfw.mjs";
import { t as Route } from "./opportunities-7Y9j_quW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/opportunities-BrTKpPJV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "f4bf02ea-c10d-4a19-8507-e10d401755d3", e._sentryDebugIdIdentifier = "sentry-dbid-f4bf02ea-c10d-4a19-8507-e10d401755d3");
	} catch (e) {}
})();
/**
* Renders the AI-generated Opportunities dashboard from getOpportunitiesFn.
* Opportunities are grouped into Creation / Existing content / Outreach / Social;
* each card leads with a plain-language "why", then three drill-downs — Prompts /
* Your citations / Competitor citations — to explore the underlying data.
*/
var CATEGORY_META = [
	{
		key: "creation",
		label: "Creation",
		desc: "Net-new content to publish or earn — comparisons, guides, and 'best of' angles for topics you're absent on."
	},
	{
		key: "existing-content",
		label: "Existing Content",
		desc: "Pages already getting cited that are slipping, or could win the mention with a refresh."
	},
	{
		key: "outreach",
		label: "Outreach",
		desc: "Earn placements on the third-party review sites and editorial roundups assistants cite."
	},
	{
		key: "social",
		label: "Social",
		desc: "Show up in the community conversations — Reddit, YouTube, forums — assistants pull from."
	}
];
function Bullet() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50",
		"aria-hidden": true
	});
}
function BulletList({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "space-y-2.5",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex gap-2.5 text-pretty text-base",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bullet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item })]
		}, item))
	});
}
var ROW = "block truncate rounded px-1.5 py-1 text-xs hover:bg-muted hover:text-foreground";
function PromptLink({ prompt, brandId }) {
	if (!prompt.promptId) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `${ROW} text-muted-foreground`,
		children: prompt.text
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/app/$brand/prompts/$promptId",
		params: {
			brand: brandId,
			promptId: prompt.promptId
		},
		className: ROW,
		children: prompt.text
	});
}
function CiteLink({ page }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
		href: page.url,
		target: "_blank",
		rel: "noopener noreferrer",
		className: ROW,
		children: [
			page.title || page.domain,
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-muted-foreground",
				children: ["· ", page.domain]
			})
		]
	});
}
function Panel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-2 rounded-md bg-muted/30 p-1",
		children
	});
}
function OpportunityCard({ o, brandId }) {
	const [open, setOpen] = (0, import_react.useState)(null);
	const tabs = [
		{
			key: "prompts",
			label: "Prompts",
			count: o.relatedPrompts.length
		},
		{
			key: "your",
			label: "Your citations",
			count: o.yourCitations.length
		},
		{
			key: "comp",
			label: "Competitor citations",
			count: o.competitorCitations.length
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-pretty text-base font-semibold",
				children: o.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-pretty text-sm text-muted-foreground",
				children: o.why
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 border-t border-border/60 pt-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2",
						children: tabs.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setOpen(open === t.key ? null : t.key),
							className: `inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs ${open === t.key ? "bg-muted" : "hover:bg-muted/50"}`,
							children: [
								t.label,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tabular-nums text-muted-foreground",
									children: [
										"(",
										t.count,
										")"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `text-[0.625rem] text-muted-foreground ${open === t.key ? "rotate-180" : ""}`,
									children: "▾"
								})
							]
						}, t.key))
					}),
					open === "prompts" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: o.relatedPrompts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-1.5 py-1 text-xs text-muted-foreground",
						children: "No specific prompts linked."
					}) : o.relatedPrompts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptLink, {
						prompt: p,
						brandId
					}, p.promptId ?? p.text)) }),
					open === "your" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: o.yourCitations.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-1.5 py-1 text-xs text-muted-foreground",
						children: "You're not cited for these prompts yet."
					}) : o.yourCitations.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CiteLink, { page: c }, c.url)) }),
					open === "comp" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: o.competitorCitations.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-1.5 py-1 text-xs text-muted-foreground",
						children: "No competitor pages cited for these prompts."
					}) : o.competitorCitations.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CiteLink, { page: c }, c.url)) })
				]
			})
		]
	});
}
function OpportunitiesReport({ report, brandId }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			report.summary.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-muted/30 p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-semibold text-muted-foreground",
					children: "Summary"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2.5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletList, { items: report.summary })
				})]
			}),
			CATEGORY_META.map((c) => {
				const opps = report.opportunities.filter((o) => o.category === c.key);
				if (opps.length === 0) return null;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-0.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-base font-semibold",
							children: [
								c.label,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-normal text-muted-foreground",
									children: [
										"(",
										opps.length,
										")"
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-pretty text-sm text-muted-foreground",
							children: c.desc
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-3",
						children: opps.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpportunityCard, {
							o,
							brandId
						}, `${o.category}-${o.title}`))
					})]
				}, c.key);
			}),
			report.risks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-base font-semibold",
					children: "Reality Check"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletList, { items: report.risks })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "Generated by AI from your tracked citation data. Suggestions are a starting point — apply your own judgment before acting."
			})
		]
	});
}
var OpportunitySchema = object({
	category: _enum([
		"creation",
		"existing-content",
		"outreach",
		"social"
	]).describe("Which workstream this belongs to: creation (net-new content to publish or earn — comparisons, guides, 'best of' angles for topics the brand is absent on), existing-content (a page already getting cited that's slipping, or could win the mention with a refresh), outreach (earn a placement on a third-party site assistants cite — review platforms, editorial roundups), social (show up in the community conversations assistants pull from — Reddit, YouTube, forums)."),
	title: string().describe("Short, specific, action-oriented — name the concrete surface or angle, not a metric. e.g. \"Get into PCMag's best-CRM roundup\" or \"Answer the recurring r/CRM 'which CRM' threads\"."),
	why: string().describe("One or two tight sentences, in plain language a marketer who has never used this tool will understand, on WHY this is worth doing — the motivation and the payoff. You may include one concrete stat from the data if it strengthens the case (and say what it measures). Do NOT propose on-page specifics you can't verify — you cannot see page contents, so never say things like 'add an FAQ / schema / H2s'. Don't restate long page titles (the UI lists the cited pages)."),
	relatedPrompts: array(string()).describe("The tracked prompts (verbatim, exactly as written in the data) this helps. May be empty.")
});
object({
	summary: array(string()).describe("3-5 bullets, ONE short sentence each (≈20 words max): where the brand is being out-cited by competitors, where AI sources its answers, and the through-line of the plan. Do NOT restate the brand's overall or per-platform visibility, and do NOT define what a metric means — the user already has dedicated Overview and Visibility pages for those."),
	opportunities: array(OpportunitySchema).describe("8-12 prioritized opportunities spread across the categories the data supports, highest impact first."),
	risks: array(string()).describe("2-4 very concise caveats (one short sentence each): hard-to-win areas, or tactics to avoid.")
});
/** Assemble the deterministic digest text + the structured bits the server needs
* to enrich the LLM output. Returns null if there isn't enough data. */
/** From an opportunity's related prompt IDs, gather its cited pages (deduped by
* URL) split into the brand's own vs competitors'. */
/** Regenerate at most this often; stored generations newer than this are served
* from cache. Surfaced as "Refreshed weekly" on the page — kept a touch under 7 days. */
/** Resolve the LLM output's prompt strings to tracked IDs (for deep-linking) and
* attach each opportunity's cited pages split into the brand's vs competitors'. */
/** Generate the report, retrying until the model's output satisfies the schema.
* Returns the validated report plus the model id that produced it. */
var getOpportunitiesFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	timezone: string().default("UTC")
})).handler(createSsrRpc("23cdb9d47516372d1fc0888a27a7358031d5cc8ae32b37b3e5021d9ad88921b1"));
var opportunitiesKeys = {
	all: ["opportunities-report"],
	detail: (brandId) => [...opportunitiesKeys.all, brandId]
};
/**
* Opportunities AEO report. The server returns a stored report and regenerates it
* only when the latest is stale, so this is held for the session (staleTime:
* Infinity, no refetch-on-focus) rather than refetched.
*/
function useOpportunities(brandId) {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const query = useQuery({
		queryKey: opportunitiesKeys.detail(resolvedBrandId || ""),
		queryFn: () => getOpportunitiesFn({ data: {
			brandId: resolvedBrandId,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
		} }),
		enabled: !!resolvedBrandId,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnWindowFocus: false,
		retry: false
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
* /app/$brand/opportunities — AI-generated opportunities.
*
* The page renders a structured opportunities report. We assemble a deterministic
* digest of the brand's tracked citation data (per-query standing vs the leading
* competitor over 7d + 30d, citation difficulty, where answers are sourced, and
* per-platform visibility) and make a single structured LLM completion (no web
* search) to turn it into categorized opportunities. The report is cached
* server-side and regenerated only when stale — see server/opportunities.ts.
*/
function OpportunitiesPage() {
	const { brand: brandId } = Route.useParams();
	const { data, isLoading, isError } = useOpportunities(brandId);
	const infoContent = "Recommendations based on your visibility and citation metrics. Refreshed weekly.";
	let content;
	if (isLoading) content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingState, {});
	else if (isError) content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyCard, { children: "Couldn't generate recommendations right now. Reload the page to try again." });
	else if (!data || data.reason === "insufficient-data" || !data.report) content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyCard, { children: "We need a bit more tracking data before we can recommend opportunities — check back once your prompts have run for a few days." });
	else content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpportunitiesReport, {
		report: data.report,
		brandId
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
		title: "Opportunities",
		subtitle: "What to create, pitch, and seed to earn more AI citations — generated from your tracked answer data.",
		infoContent,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-6",
			children: [data?.report && data.lastEvaluatedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LastEvaluatedAt, { date: data.lastEvaluatedAt }), content]
		})
	});
}
function LastEvaluatedAt({ date }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "flex items-center gap-1.5 text-sm text-muted-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconClock, {
				className: "size-4",
				"aria-hidden": true
			}),
			"Last evaluated",
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
				dateTime: date,
				children: new Date(date).toLocaleDateString(void 0, {
					month: "long",
					day: "numeric",
					year: "numeric"
				})
			})
		]
	});
}
function EmptyCard({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-xl border border-border",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "px-6 py-10 text-center text-sm text-muted-foreground",
			children
		})
	});
}
function LoadingState() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-sm text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, { className: "size-4 animate-spin" }), "Analyzing your citation landscape and drafting your opportunities…"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-2/3" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-full max-w-[70ch]" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-1/2" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: [
					0,
					1,
					2
				].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-28 w-full rounded-xl" }, i))
			})
		]
	});
}
//#endregion
export { OpportunitiesPage as component };

//# sourceMappingURL=opportunities-BrTKpPJV.mjs.map