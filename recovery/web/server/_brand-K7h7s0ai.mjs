import { i as __toESM } from "./_runtime.mjs";
import { A as IconInfoCircle, E as IconList, M as IconEye, R as IconClock, X as IconArrowRight, _ as IconRefresh, d as IconSpeakerphone, nt as require_react, tt as IconActivity } from "./_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, t as useMutation } from "./_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./_ssr/button-DFsJLuMy.mjs";
import { g as useRouteContext, m as Link, x as useRouter } from "./_libs/@tanstack/react-router+[...].mjs";
import { a as trackEvent, i as setPersonProperties } from "./_ssr/posthog-DaElL-hv.mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, t as Card } from "./_ssr/card-CTzAVKuz.mjs";
import { t as Separator } from "./_ssr/separator-D7PdY237.mjs";
import { t as Input } from "./_ssr/input-BKn_RBJw.mjs";
import { t as Skeleton } from "./_ssr/skeleton-BcIvnIuu.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./_ssr/tooltip-BswNQ_0y.mjs";
import { _ as Play, b as LoaderCircle, j as CircleAlert, m as Rocket } from "./_libs/lucide-react.mjs";
import { c as createServerFn } from "./_ssr/createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./_ssr/createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object } from "./_libs/zod.mjs";
import { n as useBrand, t as brandKeys } from "./_ssr/use-brands-CqDybx5x.mjs";
import { a as labelForModelFilter, t as describeTargetSchedule } from "./_ssr/model-filter-DGVUY-LA.mjs";
import { t as Route } from "./_brand-C0lEOMzo.mjs";
import { f as wizardOnboardingInputSchema } from "./_ssr/onboarding-core-CMdSUF7i.mjs";
import { i as useDashboardSummary, n as dashboardKeys, t as citationKeys } from "./_ssr/use-dashboard-summary-CZd6zvH8.mjs";
import { t as TagsInput } from "./_ssr/tags-input-C2nEtJB0.mjs";
import { t as promptsSummaryKeys } from "./_ssr/use-prompts-summary-DoiBkiz3.mjs";
import { n as newCompetitorEntry, t as CompetitorsEditor } from "./_ssr/competitors-editor-D8XrL4tl.mjs";
import { n as newPromptEntry, t as PromptsListEditor } from "./_ssr/prompts-list-editor-Cz1MFmWn.mjs";
import { n as useShareOfVoice, t as TrendChart } from "./_ssr/trend-chart-JOzAvN1R.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_brand-K7h7s0ai.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8a4532a9-5c8b-47b8-b92f-8f220cef81dc", e._sentryDebugIdIdentifier = "sentry-dbid-8a4532a9-5c8b-47b8-b92f-8f220cef81dc");
	} catch (e) {}
})();
/**
* Server functions for the onboarding wizard + brand analysis.
*
* This file ONLY exports createServerFn server functions. No regular function
* exports, no class exports, no db imports. TanStack Start replaces server
* functions with lightweight RPC stubs on the client — but only if the module
* doesn't drag in server-only dependencies (db, drizzle, pg) via other
* exports. Keeping this file server-fn-only guarantees the client bundle
* stays clean.
*
* Regular functions (createBrand, updateBrand, etc.) live in
* ./onboarding-core.ts, imported only by API routes (server-only).
*/
/**
* Kick off brand analysis as a background job.
*
* Brand analysis is an LLM + web-search call that routinely runs ~1 minute,
* which blows past reverse-proxy read timeouts when executed inline (the user
* gets a 504 even though the work succeeds). The worker processes the job; the
* client polls `getAnalyzeBrandStatusFn` (by brand) for the result.
*
* Scoped to the brand's owning org: the caller must have access to the brand
* both to start an analysis and to read it back, so a job's output never
* leaks outside the org that requested it.
*/
var startAnalyzeBrandFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string().min(1),
	website: string().min(1),
	brandName: string().optional()
})).handler(createSsrRpc("38e1c6565e0eacaaa5e6258a4905e082ae925f0c1c6e0236e8b94ea700121735"));
/**
* Poll the status/result of the latest brand-analysis job for a brand.
*
* POST (not GET) on purpose: the response changes on every poll, so we don't
* want a browser/CDN/reverse-proxy caching an early `pending` and starving the
* wizard of the eventual result.
*/
var getAnalyzeBrandStatusFn = createServerFn({ method: "POST" }).validator(object({ brandId: string().min(1) })).handler(createSsrRpc("5cc650af774639f1d41897269ae0f4722a5881185f251afe45db843a6c791e8c"));
/** Cancel the in-flight brand-analysis job for a brand (e.g. user backs out). */
var cancelAnalyzeBrandFn = createServerFn({ method: "POST" }).validator(object({ brandId: string().min(1) })).handler(createSsrRpc("a6b29528327f1a9eb795f4df1e90511b42d704db1c0d4d310cdc72a2f1af6c9d"));
/**
* Persist the wizard's reviewed onboarding result for a brand the user
* already has access to.
*/
var updateOnboardedBrandFn = createServerFn({ method: "POST" }).validator(wizardOnboardingInputSchema).handler(createSsrRpc("369616f3efa99b3f7778826d3028275d3464af5a235241bc88160d882ab27cde"));
/**
* Single-step onboarding wizard.
*
* One LLM call returns brand info + competitors + prompts; the user reviews
* and edits before saving. Replaces the prior 4-step wizard that required
* DataForSEO + Anthropic in tandem.
*/
/** Brand analysis runs in the worker (LLM + web search, ~1 min); the client polls for the result. */
var POLL_INTERVAL_MS = 2e3;
var ANALYZE_TIMEOUT_MS = 36e4;
var analyzeStatusKey = (brandId) => [
	"analyze-brand",
	"status",
	brandId
];
var EditableTagsInput = (0, import_react.memo)(({ items, onValueChange, placeholder = "Add item...", maxItems = 10 }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
	className: "space-y-2",
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsInput, {
		value: items,
		onValueChange,
		placeholder,
		searchPlaceholder: placeholder,
		maxItems
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "text-xs text-muted-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
				items.length,
				"/",
				maxItems
			] }),
			" ",
			items.length >= maxItems ? "items added. Remove an item to add a new one." : "items entered."
		]
	})]
}));
EditableTagsInput.displayName = "EditableTagsInput";
function PromptWizard({ onComplete }) {
	const { brand } = useBrand();
	const queryClient = useQueryClient();
	const router = useRouter();
	const [phase, setPhase] = (0, import_react.useState)("idle");
	const [error, setError] = (0, import_react.useState)(null);
	const [submitError, setSubmitError] = (0, import_react.useState)(null);
	const [isSaving, setIsSaving] = (0, import_react.useState)(false);
	const [data, setData] = (0, import_react.useState)({
		brandName: "",
		website: "",
		additionalDomains: [],
		aliases: [],
		competitors: [],
		prompts: []
	});
	const brandId = brand?.id;
	const stopAnalyzing = (0, import_react.useCallback)((errorMessage) => {
		setPhase("idle");
		setError(errorMessage);
		if (brandId) {
			queryClient.removeQueries({ queryKey: analyzeStatusKey(brandId) });
			cancelAnalyzeBrandFn({ data: { brandId } }).catch(() => {});
		}
	}, [brandId, queryClient]);
	const { mutate: enqueueAnalysis, isSuccess: analysisEnqueued } = useMutation({
		mutationFn: (vars) => startAnalyzeBrandFn({ data: vars }),
		onError: (err) => {
			setError(err instanceof Error ? err.message : "Analysis failed");
			setPhase("idle");
		}
	});
	const statusQuery = useQuery({
		queryKey: analyzeStatusKey(brandId ?? "none"),
		queryFn: () => getAnalyzeBrandStatusFn({ data: { brandId } }),
		enabled: phase === "analyzing" && analysisEnqueued && !!brandId,
		staleTime: 0,
		gcTime: 0,
		refetchInterval: (query) => query.state.data?.status === "pending" ? POLL_INTERVAL_MS : false,
		refetchIntervalInBackground: true
	});
	const handleAnalyze = (0, import_react.useCallback)(() => {
		if (!brand?.website || !brand?.id) return;
		setError(null);
		queryClient.removeQueries({ queryKey: analyzeStatusKey(brand.id) });
		setPhase("analyzing");
		enqueueAnalysis({
			brandId: brand.id,
			website: brand.website,
			brandName: brand.name
		});
	}, [
		brand?.website,
		brand?.id,
		brand?.name,
		queryClient,
		enqueueAnalysis
	]);
	const statusData = statusQuery.data;
	(0, import_react.useEffect)(() => {
		if (phase !== "analyzing" || !statusData) return;
		if (statusData.status === "failed") {
			setError(statusData.error);
			setPhase("idle");
			if (brandId) queryClient.removeQueries({ queryKey: analyzeStatusKey(brandId) });
			return;
		}
		if (statusData.status === "done") {
			const suggestion = statusData.suggestion;
			setData({
				brandName: suggestion.brandName || brand?.name || "",
				website: brand?.website || suggestion.website || "",
				additionalDomains: suggestion.additionalDomains,
				aliases: suggestion.aliases,
				competitors: suggestion.competitors.map((c) => newCompetitorEntry({
					name: c.name,
					domains: c.domains,
					aliases: c.aliases,
					expanded: false
				})),
				prompts: suggestion.suggestedPrompts.map((p) => newPromptEntry({
					value: p.prompt,
					tags: p.tags,
					enabled: true
				}))
			});
			setPhase("review");
			trackEvent("onboarding_analyzed", {
				competitor_count: suggestion.competitors.length,
				prompt_count: suggestion.suggestedPrompts.length
			});
			if (brandId) queryClient.removeQueries({ queryKey: analyzeStatusKey(brandId) });
		}
	}, [
		phase,
		statusData,
		brandId,
		brand?.name,
		brand?.website,
		queryClient
	]);
	(0, import_react.useEffect)(() => {
		if (phase !== "analyzing") return;
		const timer = window.setTimeout(() => stopAnalyzing("Brand analysis timed out. Please try again."), ANALYZE_TIMEOUT_MS);
		return () => window.clearTimeout(timer);
	}, [phase, stopAnalyzing]);
	const updateBrandName = (0, import_react.useCallback)((brandName) => setData((p) => ({
		...p,
		brandName
	})), []);
	const updateWebsite = (0, import_react.useCallback)((website) => setData((p) => ({
		...p,
		website
	})), []);
	const updateAliases = (0, import_react.useCallback)((aliases) => setData((p) => ({
		...p,
		aliases
	})), []);
	const updateAdditionalDomains = (0, import_react.useCallback)((additionalDomains) => setData((p) => ({
		...p,
		additionalDomains
	})), []);
	const updateCompetitors = (0, import_react.useCallback)((competitors) => setData((p) => ({
		...p,
		competitors
	})), []);
	const updatePrompts = (0, import_react.useCallback)((prompts) => setData((p) => ({
		...p,
		prompts
	})), []);
	const previewCounts = (0, import_react.useMemo)(() => {
		return { totalNew: data.prompts.filter((p) => p.enabled && p.value.trim().length > 0).length };
	}, [data.prompts]);
	const handleSubmit = (0, import_react.useCallback)(async () => {
		if (!brand?.id) return;
		setSubmitError(null);
		setIsSaving(true);
		try {
			const competitorsPayload = data.competitors.filter((c) => c.name.trim() && c.domains.some((d) => d.trim())).map((c) => ({
				name: c.name.trim(),
				domains: c.domains.filter((d) => d.trim()),
				aliases: c.aliases
			}));
			const promptsPayload = data.prompts.filter((p) => p.enabled && p.value.trim()).map((p) => ({
				value: p.value.trim(),
				tags: p.tags,
				enabled: true
			}));
			await updateOnboardedBrandFn({ data: {
				brandId: brand.id,
				brandName: data.brandName.trim() || brand.name,
				website: data.website.trim() || brand.website,
				additionalDomains: data.additionalDomains,
				aliases: data.aliases,
				competitors: competitorsPayload,
				prompts: promptsPayload
			} });
			trackEvent("wizard_completed", {
				prompts_created: promptsPayload.length,
				competitors_created: competitorsPayload.length,
				skipped: false
			});
			queryClient.invalidateQueries({ queryKey: brandKeys.all });
			queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
			queryClient.invalidateQueries({ queryKey: citationKeys.all });
			queryClient.invalidateQueries({ queryKey: promptsSummaryKeys.all });
			await router.invalidate();
			onComplete();
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setIsSaving(false);
		}
	}, [
		brand,
		data,
		queryClient,
		router,
		onComplete
	]);
	if (phase === "idle" || phase === "analyzing") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-2xl mx-auto space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted-foreground",
				children: [
					"We'll analyze ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: brand?.website }),
					" using web search to suggest competitors, additional domains/aliases, and a starter set of AI prompts to track."
				]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "h-4 w-4 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: handleAnalyze,
					disabled: phase === "analyzing",
					className: "flex items-center gap-2 cursor-pointer",
					children: phase === "analyzing" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), " Analyzing brand…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-4 w-4" }), " Analyze brand"] })
				}), phase === "analyzing" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					onClick: () => stopAnalyzing(null),
					className: "cursor-pointer",
					children: "Cancel"
				})]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-2xl mx-auto space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-2xl font-bold",
						children: "Brand details"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground",
						children: "Confirm the brand identity, additional domains, and aliases used for tracking."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Brand name"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: data.brandName,
								onChange: (e) => updateBrandName(e.target.value),
								placeholder: "Brand name"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Website URL"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "url",
								value: data.website,
								onChange: (e) => updateWebsite(e.target.value),
								placeholder: "https://example.com"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Additional domains"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditableTagsInput, {
								items: data.additionalDomains,
								onValueChange: updateAdditionalDomains,
								placeholder: "Add domain...",
								maxItems: 10
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Aliases"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditableTagsInput, {
								items: data.aliases,
								onValueChange: updateAliases,
								placeholder: "Add alias...",
								maxItems: 10
							})] })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-2xl font-bold",
					children: "Competitors"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: "Companies you want tracked alongside your brand."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CompetitorsEditor, {
					competitors: data.competitors,
					onChange: updateCompetitors,
					disabled: isSaving
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-2xl font-bold",
					children: "Prompts"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: "Pick which AI tracking prompts to start with. Untick any you don't want, edit tags, or add your own at the bottom."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptsListEditor, {
					prompts: data.prompts,
					onChange: updatePrompts,
					showSystemTags: false
				})]
			}),
			submitError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "h-5 w-5 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm",
					children: submitError
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: handleSubmit,
				disabled: isSaving || previewCounts.totalNew === 0,
				className: "flex items-center gap-2 cursor-pointer",
				children: isSaving ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), " Saving…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, { className: "h-4 w-4" }),
					" Start tracking (",
					previewCounts.totalNew,
					" new prompts)"
				] })
			})
		]
	});
}
/**
* /app/$brand - Dashboard overview page
*
* Shows visibility charts, citation trends, and stats.
* Displays onboarding wizard if brand is not yet onboarded.
*/
function getVisibilityBgColor(value) {
	if (value > 75) return "bg-emerald-50 dark:bg-emerald-950/30";
	if (value > 45) return "bg-amber-50 dark:bg-amber-950/30";
	return "bg-rose-50 dark:bg-rose-950/30";
}
function getVisibilityTextColor(value) {
	if (value > 75) return "text-emerald-700 dark:text-emerald-400";
	if (value > 45) return "text-amber-700 dark:text-amber-400";
	return "text-rose-700 dark:text-rose-400";
}
function getVisibilityBorderColor(value) {
	if (value > 75) return "border-emerald-200 dark:border-emerald-800";
	if (value > 45) return "border-amber-200 dark:border-amber-800";
	return "border-rose-200 dark:border-rose-800";
}
/** Most recent non-null value in a daily series — matches the right end of the trend line. */
function lastValue(series, key) {
	for (let i = series.length - 1; i >= 0; i--) {
		const v = series[i]?.[key];
		if (typeof v === "number") return v;
	}
	return null;
}
function formatRelativeTime(dateString) {
	if (!dateString) return "Never";
	const date = new Date(dateString);
	const diffMs = (/* @__PURE__ */ new Date()).getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 6e4);
	const diffHours = Math.floor(diffMs / 36e5);
	const diffDays = Math.floor(diffMs / 864e5);
	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric"
	});
}
function formatRunFrequency(hours) {
	const weeks = Math.floor(hours / 168);
	const days = Math.floor(hours % 168 / 24);
	const remainingHours = hours % 24;
	const parts = [];
	if (weeks > 0) parts.push(`${weeks}w`);
	if (days > 0) parts.push(`${days}d`);
	if (remainingHours > 0) parts.push(`${remainingHours}h`);
	return parts.length > 0 ? `~${parts.join(" ")}` : "~1h";
}
function StatWithTooltip({ icon: Icon, label, value, tooltip }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 cursor-help",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4 flex-shrink-0" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold text-foreground",
						children: value
					}),
					" ",
					label
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 opacity-50" })
			]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
		className: "max-w-xs text-sm",
		children: tooltip
	})] });
}
function CardTitleWithTooltip({ title, tooltip, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
		className: `text-sm font-medium flex items-center gap-1.5 ${className}`,
		children: [title, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
			className: "max-w-xs text-sm font-normal",
			children: tooltip
		})] })]
	});
}
/** The big "current" stat that fills a card — the latest point of its trend, colour-coded by value. */
function HeroStat({ value, loading }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
		className: "flex-1 flex items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `font-bold tracking-tight tabular-nums ${value === null ? "text-muted-foreground" : getVisibilityTextColor(value)}`,
			style: { fontSize: "clamp(2.5rem, 6vw, 5rem)" },
			children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 w-32" }) : value === null ? "—" : `${value}%`
		})
	});
}
function DashboardPage() {
	const { brand: brandId } = Route.useParams();
	const { brand, isLoading: isLoadingBrand } = useBrand();
	const trackedTargets = brand?.trackedTargets ?? [];
	const { dashboardSummary, isLoading: isLoadingSummary } = useDashboardSummary(brand?.id, "1m");
	const { data: sovData, isLoading: isLoadingSov } = useShareOfVoice(brand?.id, { lookback: "1m" });
	const clientConfig = useRouteContext({ strict: false }).clientConfig;
	const isLoading = isLoadingBrand || isLoadingSummary;
	(0, import_react.useEffect)(() => {
		if (dashboardSummary?.totalPrompts != null) setPersonProperties({ active_prompt_count: dashboardSummary.totalPrompts });
	}, [dashboardSummary?.totalPrompts]);
	const visibilityTimeSeries = dashboardSummary?.visibilityTimeSeries || [];
	const currentVisibility = lastValue(visibilityTimeSeries, "overall");
	const sovShare = lastValue(sovData?.shareTimeSeries ?? [], "share");
	if (isLoadingBrand) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-1 flex-col",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "m-auto flex w-full max-w-[1600px] flex-col gap-3 p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-lg font-semibold flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconEye, { className: "h-5 w-5 text-muted-foreground" }), "AI Visibility"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							variant: "ghost",
							size: "sm",
							className: "h-8",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/app/$brand/visibility",
								params: { brand: brandId },
								children: ["View Visibility ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowRight, { className: "h-4 w-4 ml-1" })]
							})
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 lg:grid-cols-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "shadow-none flex flex-col gap-3 py-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStat, {
								value: null,
								loading: true
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "shadow-none lg:col-span-3 flex flex-col gap-3 py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
								className: "border-b border-dotted pb-2!",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
									className: "text-sm font-medium flex items-center gap-1.5 text-muted-foreground",
									children: ["Visibility Trends (30d)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 opacity-70" })]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
								className: "flex-1 min-h-[100px]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-full w-full" })
							})]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-lg font-semibold flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSpeakerphone, { className: "h-5 w-5 text-muted-foreground" }), "Share of Voice"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							variant: "ghost",
							size: "sm",
							className: "h-8",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/app/$brand/share-of-voice",
								params: { brand: brandId },
								children: ["View Share of Voice ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowRight, { className: "h-4 w-4 ml-1" })]
							})
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 lg:grid-cols-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "shadow-none flex flex-col gap-3 py-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStat, {
								value: null,
								loading: true
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "shadow-none lg:col-span-3 flex flex-col gap-3 py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
								className: "border-b border-dotted pb-2!",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
									className: "text-sm font-medium flex items-center gap-1.5 text-muted-foreground",
									children: ["Share of Voice Trends (30d)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 opacity-70" })]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
								className: "flex-1 min-h-[100px]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-full w-full" })
							})]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					className: "pt-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconList, { className: "h-4 w-4 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-28" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconActivity, { className: "h-4 w-4 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-32" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconClock, { className: "h-4 w-4 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-24" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconRefresh, { className: "h-4 w-4 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-24" })]
							})
						]
					})
				})
			]
		})
	});
	const hasPrompts = brand?.prompts && brand.prompts.length > 0;
	if (!brand?.onboarded) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-2xl p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl font-bold",
				children: "Research Brand Data"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground text-balance",
				children: "We will analyze your website and find the best generative AI prompts to track. This process may take a couple of minutes."
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptWizard, { onComplete: () => {
			const template = clientConfig?.branding.onboardingRedirectUrlTemplate;
			if (template) window.location.href = template.replace("{brandId}", brandId);
		} })]
	});
	const totalRuns = dashboardSummary?.totalRuns || 0;
	const totalPrompts = dashboardSummary?.totalPrompts || 0;
	const nonBrandedVisibility = dashboardSummary?.nonBrandedVisibility ?? null;
	const lastUpdatedAt = dashboardSummary?.lastUpdatedAt || null;
	const hasNoEvaluations = totalRuns === 0 && !isLoadingSummary;
	const hasEnabledPrompts = totalPrompts > 0;
	if (hasNoEvaluations) {
		const getMessage = () => {
			if (hasEnabledPrompts) return "You are ready to track your AI visibility. We're currently running the first evaluation against AI models. This usually takes a few minutes.";
			if (hasPrompts) return "You have prompts configured but none are currently enabled. Add or enable some prompts to start tracking your AI visibility.";
			return "Set up prompts to start tracking your AI visibility. Once configured, we'll evaluate them against AI models automatically.";
		};
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-1 flex-col items-center justify-center p-8 max-w-xl mx-auto text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-full bg-muted p-4 mb-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconClock, { className: "h-10 w-10 text-muted-foreground" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-2xl font-bold mb-3",
					children: hasEnabledPrompts ? "Waiting for First Evaluation" : "No Data Yet"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground mb-6 text-balance",
					children: getMessage()
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-3 w-full",
					children: [hasEnabledPrompts && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between p-4 bg-muted/50 rounded-lg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconList, { className: "h-5 w-5 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm",
								children: "Prompts configured and enabled"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold",
							children: totalPrompts.toLocaleString()
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						variant: "outline",
						className: "w-full",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/app/$brand/settings/prompts",
							params: { brand: brandId },
							children: [
								hasEnabledPrompts ? "View Your Prompts" : hasPrompts ? "Edit Prompts" : "Set Up Prompts",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowRight, { className: "h-4 w-4 ml-1" })
							]
						})
					})]
				}),
				hasEnabledPrompts && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground mt-6",
					children: "Refresh this page in a few minutes to see your AI visibility data."
				})
			]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-1 flex-col",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "m-auto flex w-full max-w-[1600px] flex-col gap-3 p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-lg font-semibold flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconEye, { className: "h-5 w-5 text-muted-foreground" }), "AI Visibility"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							variant: "ghost",
							size: "sm",
							className: "h-8",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/app/$brand/visibility",
								params: { brand: brandId },
								children: ["View Visibility ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowRight, { className: "h-4 w-4 ml-1" })]
							})
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 lg:grid-cols-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: `shadow-none flex flex-col gap-3 py-4 ${currentVisibility === null ? "" : `${getVisibilityBgColor(currentVisibility)} ${getVisibilityBorderColor(currentVisibility)}`}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStat, {
								value: currentVisibility,
								loading: isLoading
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "shadow-none lg:col-span-3 flex flex-col gap-3 py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
								className: "border-b border-dotted pb-2!",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitleWithTooltip, {
									title: "Visibility Trends (30d)",
									tooltip: `The percentage of AI answers to your prompts that mention your brand — the big number is the latest point on this line. ${nonBrandedVisibility === null ? "No non-branded prompts have been measured yet." : `For prompts that don't name your brand, it's ${nonBrandedVisibility}%.`} Visibility shifts as AI models, the prompts you track, or the sites AI scans change; the line is smoothed for staggered prompt schedules.`
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
								className: "flex-1 min-h-[100px]",
								children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-full w-full" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendChart, {
									data: visibilityTimeSeries.map((p) => ({
										date: p.date,
										value: p.overall
									})),
									label: "AI Visibility (7d avg)",
									color: "#2563eb"
								})
							})]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-lg font-semibold flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSpeakerphone, { className: "h-5 w-5 text-muted-foreground" }), "Share of Voice"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							variant: "ghost",
							size: "sm",
							className: "h-8",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/app/$brand/share-of-voice",
								params: { brand: brandId },
								children: ["View Share of Voice ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowRight, { className: "h-4 w-4 ml-1" })]
							})
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 lg:grid-cols-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: `shadow-none flex flex-col gap-3 py-4 ${sovShare === null ? "" : `${getVisibilityBgColor(sovShare)} ${getVisibilityBorderColor(sovShare)}`}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStat, {
								value: sovShare,
								loading: isLoadingSov
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "shadow-none lg:col-span-3 flex flex-col gap-3 py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
								className: "border-b border-dotted pb-2!",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitleWithTooltip, {
									title: "Share of Voice Trends (30d)",
									tooltip: "Your brand's share of all brand and competitor mentions across the AI answers to your prompts — the big number is the latest point on this line. It shifts as AI models change, as you and competitors publish, or as the sites AI scans move; the line is smoothed for staggered prompt schedules."
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
								className: "flex-1 min-h-[100px]",
								children: isLoadingSov ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-full w-full" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendChart, {
									data: (sovData?.shareTimeSeries ?? []).map((p) => ({
										date: p.date,
										value: p.share
									})),
									label: "Share of Voice",
									color: "#2563eb"
								})
							})]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					className: "pt-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm text-muted-foreground",
						children: isLoadingSummary ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconList, { className: "h-4 w-4 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-28" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconActivity, { className: "h-4 w-4 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-32" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconClock, { className: "h-4 w-4 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-24" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconRefresh, { className: "h-4 w-4 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-24" })]
							})
						] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatWithTooltip, {
								icon: IconList,
								label: "prompts tracked",
								value: totalPrompts.toLocaleString(),
								tooltip: trackedTargets.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Prompts monitored for AI visibility, each evaluated on:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-1 space-y-0.5",
									children: trackedTargets.map((target) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: labelForModelFilter(target.value) }, target.value))
								})] }) : "Prompts monitored for AI visibility. No platforms are configured for this brand yet."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatWithTooltip, {
								icon: IconActivity,
								label: "evaluations (30d)",
								value: totalRuns.toLocaleString(),
								tooltip: "Total number of times we have evaluated prompts against LLMs in the last 30 days. Each prompt is evaluated multiple times across different AI models."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatWithTooltip, {
								icon: IconClock,
								label: "run frequency",
								value: formatRunFrequency(brand?.delayOverrideHours ?? clientConfig?.defaultDelayHours ?? 24),
								tooltip: trackedTargets.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "How often each platform is sampled:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-1 space-y-0.5",
									children: trackedTargets.map((target) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: describeTargetSchedule(target) }, target.value))
								})] }) : "No platforms are configured for this brand yet."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatWithTooltip, {
								icon: IconRefresh,
								label: "last updated",
								value: formatRelativeTime(lastUpdatedAt),
								tooltip: lastUpdatedAt ? `The last prompts we evaluated for your brand were run on ${new Date(lastUpdatedAt).toLocaleString()}` : "No evaluations have been run yet."
							})
						] })
					})
				})
			]
		})
	});
}
//#endregion
export { DashboardPage as component };

//# sourceMappingURL=_brand-K7h7s0ai.mjs.map