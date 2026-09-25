import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-wJUKCpVc.mjs";
import { n as getSelenaSourceMapFn, t as Route } from "./selena-sources-BwFkrETq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-sources-DF3ezVsG.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "be00a13b-3b12-4fb6-8630-b09b3c7baf1e", e._sentryDebugIdIdentifier = "sentry-dbid-be00a13b-3b12-4fb6-8630-b09b3c7baf1e");
	} catch (e) {}
})();
var copy = {
	en: {
		title: "Source Opportunity Map",
		subtitle: "Sources cited in the answers of an analysed cycle, and which of them turned up only alongside competitors.",
		disclaimer: "The counters count runs, not the contents of a source. Selena did not read these pages: it recorded which sources an answer cited and which brands that answer named.",
		project: "Project",
		gapsOnly: "Citation gaps only",
		all: "All sources",
		empty: "No cycle has been analysed for this project yet, so there is nothing to aggregate.",
		emptyGaps: "No source in this project was cited only alongside competitors.",
		domain: "Source",
		priority: "Priority",
		gap: "Gap",
		withBrand: "Runs naming the brand",
		withCompetitors: "Runs naming a competitor",
		competitors: "Competitors named",
		reach: "Scenarios × engines",
		stability: "Repeat stability",
		seen: "First / last seen",
		evidence: "Evidence runs",
		formula: "Formula",
		none: "—"
	},
	ru: {
		title: "Карта источников",
		subtitle: "Источники, процитированные в ответах проанализированного цикла, и те из них, что встречались только рядом с конкурентами.",
		disclaimer: "Счётчики считают прогоны, а не содержимое источника. Selena эти страницы не читала: записано, какие источники цитировал ответ и какие бренды он называл.",
		project: "Проект",
		gapsOnly: "Только citation gaps",
		all: "Все источники",
		empty: "По этому проекту ещё не проанализирован ни один цикл — агрегировать нечего.",
		emptyGaps: "Ни один источник проекта не встречался исключительно рядом с конкурентами.",
		domain: "Источник",
		priority: "Приоритет",
		gap: "Gap",
		withBrand: "Прогонов с брендом",
		withCompetitors: "Прогонов с конкурентом",
		competitors: "Названные конкуренты",
		reach: "Сценарии × движки",
		stability: "Стабильность повторов",
		seen: "Впервые / последний раз",
		evidence: "Прогоны-доказательства",
		formula: "Формула",
		none: "—"
	}
};
function priorityVariant(band) {
	if (band === "HIGH") return "default";
	return band === "MEDIUM" ? "secondary" : "outline";
}
function formatDate(value) {
	return value === null ? "—" : new Date(value).toLocaleDateString();
}
function formatShare(value) {
	return value === null ? "—" : `${Math.round(value * 100)}%`;
}
function SelenaSourceMap() {
	const projects = Route.useLoaderData();
	const [locale, setLocale] = (0, import_react.useState)("en");
	const [projectId, setProjectId] = (0, import_react.useState)(projects[0]?.id ?? "");
	const [gapsOnly, setGapsOnly] = (0, import_react.useState)(false);
	const [map, setMap] = (0, import_react.useState)(null);
	const [pending, setPending] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const text = copy[locale];
	(0, import_react.useEffect)(() => {
		const saved = window.localStorage.getItem("selena-workspace-locale");
		setLocale(saved === "ru" || saved === "en" ? saved : navigator.language.startsWith("ru") ? "ru" : "en");
	}, []);
	const load = (0, import_react.useCallback)(async () => {
		if (!projectId) return;
		setPending(true);
		setError("");
		try {
			setMap(await getSelenaSourceMapFn({ data: {
				projectId,
				gapsOnly
			} }));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Unable to read the source map");
			setMap(null);
		} finally {
			setPending(false);
		}
	}, [projectId, gapsOnly]);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	const sources = map?.sources ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full max-w-6xl flex-col gap-6 p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-semibold text-2xl",
					children: text.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-3xl text-muted-foreground text-sm",
					children: text.subtitle
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					size: "sm",
					onClick: () => setLocale(locale === "en" ? "ru" : "en"),
					children: locale === "en" ? "RU" : "EN"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: text.project
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: text.disclaimer })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "flex flex-wrap items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: "h-9 rounded-md border border-input bg-background px-3 text-sm",
					value: projectId,
					onChange: (event) => setProjectId(event.target.value),
					"aria-label": text.project,
					children: projects.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: project.id,
						children: project.name
					}, project.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: gapsOnly ? "default" : "outline",
					size: "sm",
					onClick: () => setGapsOnly(!gapsOnly),
					children: gapsOnly ? text.gapsOnly : text.all
				})]
			})] }),
			error !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm",
				children: error
			}),
			!pending && sources.length === 0 && error === "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-dashed p-6 text-muted-foreground text-sm",
				children: gapsOnly ? text.emptyGaps : text.empty
			}),
			sources.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-md border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: text.domain }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: text.priority }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: text.withBrand
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: text.withCompetitors
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: text.competitors }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: text.reach
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: text.stability
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: text.seen }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: text.evidence
					})
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "font-medium",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex flex-col gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: source.domain }),
								source.gapType !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "destructive",
									className: "w-fit",
									children: text.gap
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground text-xs",
									children: source.formulaVersion
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: priorityVariant(source.priorityBand),
						children: source.priorityBand
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-right tabular-nums",
						children: source.ownedCitationCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-right tabular-nums",
						children: source.competitorCitationCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-sm",
						children: source.competitorNames.length === 0 ? text.none : source.competitorNames.join(", ")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, {
						className: "text-right tabular-nums",
						children: [
							source.scenarioCount,
							" × ",
							source.engineCount
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-right tabular-nums",
						children: formatShare(source.repeatStability)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, {
						className: "text-sm",
						children: [
							formatDate(source.firstSeen),
							" / ",
							formatDate(source.lastSeen)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-right tabular-nums",
						children: source.evidenceRunIds.length
					})
				] }, source.id)) })] })
			})
		]
	});
}
//#endregion
export { SelenaSourceMap as component };

//# sourceMappingURL=selena-sources-DF3ezVsG.mjs.map