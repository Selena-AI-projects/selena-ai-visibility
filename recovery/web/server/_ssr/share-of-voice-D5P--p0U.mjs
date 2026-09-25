import { A as IconInfoCircle } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Skeleton } from "./skeleton-BcIvnIuu.mjs";
import { i as TooltipTrigger, n as TooltipContent, r as TooltipProvider, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
import { n as useBrand } from "./use-brands-CqDybx5x.mjs";
import { a as useListFilters } from "./use-list-filters-BRE2FD-y.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { r as usePromptsSummary } from "./use-prompts-summary-DoiBkiz3.mjs";
import { d as Pie, f as Cell, n as PieChart, p as Tooltip$1 } from "../_libs/recharts+[...].mjs";
import { t as ChartContainer } from "./chart-WE9PDFAP.mjs";
import { n as useShareOfVoice, t as TrendChart } from "./trend-chart-JOzAvN1R.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-wJUKCpVc.mjs";
import { t as FilterBar } from "./filter-bar-CrWyPYxO.mjs";
import { n as PageHeader, t as FilterSection } from "./page-header-Da9U5Lfw.mjs";
import { t as Route } from "./share-of-voice-B8DwSWge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/share-of-voice-D5P--p0U.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "73204a41-2034-4603-81f6-cda962e1b045", e._sentryDebugIdIdentifier = "sentry-dbid-73204a41-2034-4603-81f6-cda962e1b045");
	} catch (e) {}
})();
/**
* Shared Share-of-Voice palette so the donut and the leaderboard colour each
* brand identically — the brand in its blue, competitors from a fixed palette in
* rank order, and the long tail in a neutral "others" grey.
*/
var BRAND_COLOR = "#2563eb";
var OTHERS_COLOR = "#cbd5e1";
var COMPETITOR_PALETTE = [
	"#10b981",
	"#f59e0b",
	"#8b5cf6",
	"#ec4899",
	"#14b8a6",
	"#f97316"
];
/**
* Map each entry name to its colour, mirroring the donut's assignment order
* (brand → BRAND_COLOR; the first `topN` competitors → palette; the rest →
* OTHERS_COLOR). Entries with no mentions are skipped, matching the donut.
*/
function shareOfVoiceColorMap(entries, topN = 6) {
	const map = /* @__PURE__ */ new Map();
	let competitorIdx = 0;
	for (const e of entries) {
		if (e.mentions <= 0) continue;
		if (e.isBrand) map.set(e.name, BRAND_COLOR);
		else if (competitorIdx < topN) map.set(e.name, COMPETITOR_PALETTE[competitorIdx++ % COMPETITOR_PALETTE.length]);
		else map.set(e.name, OTHERS_COLOR);
	}
	return map;
}
/** A table column header with an info tooltip. Render inside a TooltipProvider. */
function ColHead({ label, tip, right }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: `inline-flex items-center gap-1 ${right ? "w-full justify-end" : ""}`,
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "cursor-help text-muted-foreground/60",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "size-3.5" })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
			className: "max-w-[240px] text-xs font-normal",
			children: tip
		})] })]
	});
}
/**
* Donut of share of voice: the brand plus its top competitors, with the long
* tail bucketed into "Others". Sits beside the headline share number.
*/
function ShareOfVoiceDonut({ entries, topN = 6 }) {
	const slices = [];
	let paletteIdx = 0;
	let shownCompetitors = 0;
	let othersValue = 0;
	for (const e of entries) {
		if (e.mentions <= 0) continue;
		if (e.isBrand) slices.push({
			name: e.name,
			value: e.mentions,
			color: BRAND_COLOR
		});
		else if (shownCompetitors < topN) {
			slices.push({
				name: e.name,
				value: e.mentions,
				color: COMPETITOR_PALETTE[paletteIdx++ % COMPETITOR_PALETTE.length]
			});
			shownCompetitors++;
		} else othersValue += e.mentions;
	}
	if (othersValue > 0) slices.push({
		name: "Others",
		value: othersValue,
		color: OTHERS_COLOR
	});
	const total = slices.reduce((s, x) => s + x.value, 0);
	if (total === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartContainer, {
		config: {},
		className: "aspect-square h-[180px] w-[180px]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
			data: slices,
			dataKey: "value",
			nameKey: "name",
			innerRadius: 48,
			outerRadius: 84,
			paddingAngle: 1,
			strokeWidth: 1,
			children: slices.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: s.color }, s.name))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip$1, { content: ({ active, payload }) => {
			if (!active || !payload?.length) return null;
			const s = payload[0].payload;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-md border bg-background px-2 py-1 text-xs shadow-md",
				children: [
					s.name,
					": ",
					Math.round(s.value / total * 100),
					"%"
				]
			});
		} })] })
	});
}
/**
* /app/$brand/share-of-voice - Share of Voice
*
* "Who do the AI engines mention instead of you?" A leaderboard of competitor
* mention rates next to the brand's own, with the brand's overall share, a
* donut of top competitors, and share of voice over time.
*/
var formatPct = (share) => share === null ? "—" : `${Math.round(share * 100)}%`;
/** Latest non-null point of the share-of-voice trend — the value the line ends on. */
function currentShareOf(series) {
	for (let i = series.length - 1; i >= 0; i--) {
		const v = series[i]?.share;
		if (typeof v === "number") return v;
	}
	return null;
}
var TIPS = {
	mentions: "Number of runs in which this brand was mentioned in the AI answer.",
	share: "This brand's share of all brand + competitor mentions.",
	prompts: "Number of distinct prompts this brand appeared in."
};
function ShareOfVoicePage() {
	const { brand: brandId } = Route.useParams();
	const { model, lookback, tags } = useListFilters();
	const { brand } = useBrand(brandId);
	const trackedTargets = brand?.trackedTargets ?? [];
	const modelParam = model === "all" ? void 0 : model;
	const { promptsSummary } = usePromptsSummary(brandId, {
		lookback,
		model: modelParam
	});
	const availableTags = promptsSummary?.availableTags ?? [];
	const { data, isLoading } = useShareOfVoice(brandId, {
		lookback,
		model: modelParam,
		tags
	});
	const infoContent = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-2",
		children: "Share of voice is how often each brand is mentioned in the AI answers to your prompts. Mentions are counted per run, so the brand and competitor figures use the same unit and are directly comparable."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Competitors are the ones you track in settings. Switch the model filter to compare engines." })] });
	const maxMentions = data?.entries.reduce((m, e) => Math.max(m, e.mentions), 0) ?? 0;
	const barColors = shareOfVoiceColorMap(data?.entries ?? []);
	let content;
	if (isLoading && !data) content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-48" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-3/4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-2/3" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-1/2" })
		]
	})] });
	else if (!data || data.totalRuns === 0 || data.entries.length === 0) content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
		className: "pt-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-muted-foreground text-center py-8",
			children: "No mention data yet for the selected filters. Mentions appear once your prompts have been run."
		})
	}) });
	else {
		const currentShare = currentShareOf(data.shareTimeSeries);
		content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipProvider, {
			delayDuration: 150,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Share of Voice" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "flex items-center justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-3xl sm:text-4xl font-bold tabular-nums",
						children: currentShare !== null ? `${currentShare}%` : "—"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted-foreground mt-1 max-w-[18rem]",
						children: [
							data.brandName,
							" across ",
							data.totalRuns.toLocaleString(),
							" runs",
							data.entries.length > 1 ? ` and ${data.entries.length - 1} competitors` : "",
							"."
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShareOfVoiceDonut, { entries: data.entries })]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Share of Voice Trends" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendChart, {
					data: data.shareTimeSeries.map((p) => ({
						date: p.date,
						value: p.share
					})),
					label: "Share of Voice",
					color: "#2563eb",
					className: "aspect-auto h-[180px] w-full"
				}) })] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Share of Voice Leaderboard" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "w-10",
					children: "#"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Brand" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-right",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColHead, {
						label: "Mentions",
						tip: TIPS.mentions,
						right: true
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "w-[34%]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColHead, {
						label: "Share",
						tip: TIPS.share
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-right",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColHead, {
						label: "Prompts",
						tip: TIPS.prompts,
						right: true
					})
				})
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: data.entries.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
				className: e.isBrand ? "bg-muted/40" : void 0,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-muted-foreground tabular-nums",
						children: i + 1
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "font-medium",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-2",
							children: [e.name, e.isBrand && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								className: "text-xs",
								children: "You"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-right tabular-nums",
						children: e.mentions.toLocaleString()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bg-muted h-2 w-full overflow-hidden rounded-full",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full rounded-full",
								style: {
									width: `${maxMentions > 0 ? e.mentions / maxMentions * 100 : 0}%`,
									backgroundColor: barColors.get(e.name) ?? "#cbd5e1"
								}
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums text-sm text-muted-foreground w-10 text-right",
							children: formatPct(e.share)
						})]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-right tabular-nums text-muted-foreground",
						children: e.prompts
					})
				]
			}, e.name)) })] }) })] })]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageHeader, {
		title: "Share of Voice",
		subtitle: "How often AI engines mention you versus your competitors.",
		infoContent,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterSection, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterBar, {
			availableTags,
			trackedTargets,
			showSearch: false,
			showModelSelector: true
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-6",
			children: content
		})]
	});
}
//#endregion
export { ShareOfVoicePage as component };

//# sourceMappingURL=share-of-voice-D5P--p0U.mjs.map