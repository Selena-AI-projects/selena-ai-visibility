import { i as __toESM } from "./_runtime.mjs";
import { nt as require_react } from "./_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "./_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./_ssr/button-DFsJLuMy.mjs";
import { g as useRouteContext } from "./_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, t as Card } from "./_ssr/card-CTzAVKuz.mjs";
import { t as Separator } from "./_ssr/separator-D7PdY237.mjs";
import { t as Logo } from "./_ssr/logo-Bdm1AKfI.mjs";
import { I as ChartColumn, T as Download, m as Rocket, o as Target } from "./_libs/lucide-react.mjs";
import { i as calculateVisibilityPercentages, l as getBadgeClassName, m as selectCompetitorsToDisplay, u as getBadgeVariant } from "./_ssr/chart-utils-fSx3DwB3.mjs";
import { t as Badge } from "./_ssr/badge-CEgIcDZr.mjs";
import { a as YAxis, f as Cell, m as ResponsiveContainer, o as XAxis, r as BarChart, s as Bar } from "./_libs/recharts+[...].mjs";
import { a as computeCompetitorSoVs, d as getSoVColor, f as getSoVLevel, i as analyzeWebQueries, l as findContentGaps, n as analyzeByEngine, o as computeOverallSoV, p as selectRepresentativePrompts, r as analyzeCompetitorFrequency, s as computePromptSoV, t as Route, u as getSoVBadgeClasses } from "./_ssr/report-metrics-CAFzzS_X.mjs";
import { t as ChartFooter } from "./_ssr/chart-footer-CAOBHPPn.mjs";
import { t as html2canvas } from "./_libs/html2canvas-pro.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_reportId-CboD2YJ4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "38cb3c18-722e-4169-b42b-2d01cd988c1a", e._sentryDebugIdIdentifier = "sentry-dbid-38cb3c18-722e-4169-b42b-2d01cd988c1a");
	} catch (e) {}
})();
function CustomXAxisTick(props) {
	const { x, y, payload, brandName } = props;
	const isCurrentBrand = payload.value === brandName;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", {
		transform: `translate(${x},${y})`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
			x: 0,
			y: 0,
			dy: 8,
			textAnchor: "middle",
			fill: "#374151",
			fontSize: "10",
			fontWeight: isCurrentBrand ? "bold" : "normal",
			children: payload.value
		})
	});
}
function BaseChartPrint({ data, title, visibility, showTitle = false, showBadge = false, brand, competitors }) {
	const routeContext = useRouteContext({ strict: false });
	const latestDataPoint = data.filter((point) => {
		return [brand.id, ...competitors.map((c) => c.id)].some((id) => point[id] !== null && point[id] !== void 0);
	}).pop();
	if (!latestDataPoint) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex-1 space-y-2 print:space-y-1",
		children: [showTitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center justify-center gap-2",
			children: title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-medium capitalize print:text-xs",
				children: title
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-[200px] print:h-[150px] flex items-center justify-center text-muted-foreground text-sm print:text-xs",
			children: "No data available"
		})]
	});
	const chartColors = routeContext.clientConfig?.branding.chartColors ?? [];
	const allEntities = [];
	const brandValue = latestDataPoint[brand.id];
	if (brandValue !== null && brandValue !== void 0) allEntities.push({
		name: brand.name,
		value: brandValue,
		color: chartColors[0],
		isBrand: true
	});
	competitors.forEach((competitor, index) => {
		const competitorValue = latestDataPoint[competitor.id];
		if (competitorValue !== null && competitorValue !== void 0) {
			const colorIndex = (index + 1) % chartColors.length;
			allEntities.push({
				name: competitor.name,
				value: competitorValue,
				color: chartColors[colorIndex],
				isBrand: false
			});
		}
	});
	const sortedEntities = allEntities.sort((a, b) => b.value - a.value).slice(0, 6);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex-1",
		children: [showTitle && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-center gap-2",
			children: [title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-medium capitalize print:text-xs",
				children: title
			}), showBadge && visibility !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
				variant: getBadgeVariant(visibility),
				className: `text-xs ${getBadgeClassName(visibility)} print:text-xs`,
				children: [visibility, "%"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-[300px] w-full",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
				width: "100%",
				height: "100%",
				initialDimension: {
					width: 1,
					height: 1
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
					data: sortedEntities,
					margin: {
						top: 20,
						right: 15,
						left: 20,
						bottom: 0
					},
					barCategoryGap: "20%",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
							dataKey: "name",
							axisLine: false,
							tickLine: false,
							tick: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CustomXAxisTick, { brandName: brand.name }),
							height: 30,
							interval: 0
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
							domain: [0, "auto"],
							axisLine: false,
							tickLine: false,
							tick: {
								fontSize: 10,
								fill: "#6B7280"
							},
							tickFormatter: (value) => `${value}%`,
							width: 40
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
							dataKey: "value",
							radius: [
								4,
								4,
								0,
								0
							],
							minPointSize: 2,
							label: {
								position: "top",
								fontSize: 11,
								fontWeight: "bold",
								fill: "#374151",
								formatter: (value) => `${value}%`
							},
							children: sortedEntities.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: entry.color }, entry.name))
						})
					]
				})
			})
		})]
	});
}
function ChartDownloadFooter({ onDownload, isDownloading }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "print:hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			onClick: onDownload,
			disabled: isDownloading,
			size: "sm",
			variant: "secondary",
			className: "text-xs cursor-pointer h-6 flex items-center px-2",
			title: "Download chart as PNG",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-3 mr-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs font-normal",
				children: isDownloading ? "Exporting..." : "Export (PNG)"
			})]
		}) })
	});
}
function useChartDownload(fileName) {
	const chartRef = (0, import_react.useRef)(null);
	const [isDownloading, setIsDownloading] = (0, import_react.useState)(false);
	const handleDownload = async () => {
		if (!chartRef.current || isDownloading) return;
		setIsDownloading(true);
		try {
			const canvas = await html2canvas(chartRef.current, {
				scale: 2,
				backgroundColor: "#ffffff",
				logging: false,
				onclone: (clonedDoc) => {
					clonedDoc.querySelectorAll(".print\\:hidden").forEach((el) => {
						el.remove();
					});
				}
			});
			const link = document.createElement("a");
			link.download = `${fileName}.png`;
			link.href = canvas.toDataURL("image/png");
			link.click();
		} catch (error) {
			console.error("Error downloading chart:", error);
		} finally {
			setIsDownloading(false);
		}
	};
	return {
		chartRef,
		isDownloading,
		handleDownload
	};
}
/**
* Compute SoV for each entity (brand + competitors) from prompt runs.
* Returns data shaped for BaseChartPrint: one data point with entity IDs as keys.
*/
function computeSoVChartData(runs, brand, competitors) {
	if (runs.length === 0) return null;
	let brandMentions = 0;
	const competitorMentions = {};
	for (const comp of competitors) competitorMentions[comp.id] = 0;
	for (const run of runs) {
		if (run.brandMentioned) brandMentions++;
		if (run.competitorsMentioned) {
			for (const comp of competitors) if (run.competitorsMentioned.includes(comp.name)) competitorMentions[comp.id]++;
		}
	}
	const totalMentions = brandMentions + Object.values(competitorMentions).reduce((s, c) => s + c, 0);
	if (totalMentions === 0) return null;
	const dataPoint = { date: "sov" };
	dataPoint[brand.id] = Math.round(brandMentions / totalMentions * 100);
	for (const comp of competitors) dataPoint[comp.id] = Math.round(competitorMentions[comp.id] / totalMentions * 100);
	return [dataPoint];
}
function PromptChartPrint({ lookback = "1m", promptName, promptId, brand, competitors, promptRuns, hasEverBeenEvaluated = false, category }) {
	const { chartRef, isDownloading, handleDownload } = useChartDownload(`${brand.name}-${promptName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)}`);
	const promptSpecificRuns = promptRuns?.filter((run) => run.promptId === promptId) || [];
	const hasNoRuns = promptSpecificRuns.length === 0;
	const isReportContext = !!category;
	const sovChartData = isReportContext ? computeSoVChartData(promptSpecificRuns, brand, competitors) : null;
	const chartData = isReportContext ? sovChartData ?? [] : calculateVisibilityPercentages(promptSpecificRuns, brand, competitors, lookback);
	const selectedCompetitors = selectCompetitorsToDisplay(competitors, chartData, 5);
	const hasVisibilityData = chartData.some((dataPoint) => {
		const brandValue = dataPoint[brand.id];
		if (brandValue !== null && brandValue !== void 0 && Number(brandValue) > 0) return true;
		return selectedCompetitors.some((competitor) => {
			const value = dataPoint[competitor.id];
			return value !== null && value !== void 0 && Number(value) > 0;
		});
	});
	const badgeValue = isReportContext ? sovChartData ? sovChartData[0][brand.id] : null : (() => {
		const lastDataPoint = chartData.filter((point) => brand && point[brand.id] !== null).pop();
		return lastDataPoint && brand ? lastDataPoint[brand.id] : null;
	})();
	const badgeLabel = isReportContext ? "SoV" : "Visibility";
	if (hasNoRuns) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		ref: chartRef,
		className: "py-3 gap-3 print:shadow-none print:border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
				className: "flex justify-between items-center px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
					className: "text-sm print:text-xs",
					children: promptName
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-semibold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-muted-foreground print:text-lg",
					children: hasEverBeenEvaluated ? "No data in selected time range" : "Evaluating for the first time..."
				}) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartDownloadFooter, {
				onDownload: handleDownload,
				isDownloading
			})
		]
	});
	if (!hasVisibilityData) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		ref: chartRef,
		className: "py-3 gap-3 print:shadow-none print:border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
				className: "flex justify-between items-center px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
					className: "text-sm print:text-xs",
					children: promptName
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-[250px] flex items-center justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-center text-center max-w-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium text-muted-foreground print:text-xs",
							children: "No brands found in responses"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground/70 mt-1 print:text-[10px]",
							children: "Your brand and competitors weren't mentioned in the evaluated responses for this prompt."
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartDownloadFooter, {
				onDownload: handleDownload,
				isDownloading
			})
		]
	});
	const badgeClasses = isReportContext && badgeValue !== null ? getSoVBadgeClasses(badgeValue) : badgeValue !== null ? {
		variant: getBadgeVariant(badgeValue),
		className: getBadgeClassName(badgeValue)
	} : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		ref: chartRef,
		className: "py-3 gap-3 print:shadow-none print:border print:break-inside-avoid",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
				className: "flex justify-between items-center px-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
					className: "text-sm print:text-xs",
					children: promptName
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-2",
					children: badgeClasses && badgeValue !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						variant: badgeClasses.variant,
						className: `${badgeClasses.className} print:text-xs`,
						children: [
							badgeValue,
							"% ",
							badgeLabel
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "py-0 my-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BaseChartPrint, {
					data: chartData,
					brand,
					competitors: selectedCompetitors
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartDownloadFooter, {
				onDownload: handleDownload,
				isDownloading
			})
		]
	});
}
/**
* /reports/render/$reportId - Standalone report rendering page
*
* Production-quality printable report (US Letter 8.5 x 11 in).
* Uses Share of Voice as the primary metric with rich competitive analysis.
*/
function isPromptBranded(promptValue, brandName, brandWebsite) {
	const promptLower = promptValue.toLowerCase();
	const brandNameLower = brandName.toLowerCase();
	try {
		const domain = new URL(brandWebsite.startsWith("http") ? brandWebsite : `https://${brandWebsite}`).hostname.replace(/^www\./, "").toLowerCase();
		const domainWithoutTld = domain.split(".")[0];
		return promptLower.includes(brandNameLower) || promptLower.includes(domain) || promptLower.includes(domainWithoutTld);
	} catch {
		return promptLower.includes(brandNameLower);
	}
}
function sovBgColor(sov) {
	if (sov === null) return "bg-slate-300";
	if (sov >= 40) return "bg-emerald-500";
	if (sov >= 20) return "bg-amber-500";
	return "bg-rose-500";
}
function ReportRenderPage() {
	const { report } = Route.useLoaderData();
	const branding = useRouteContext({ strict: false }).clientConfig?.branding;
	if (report.status !== "completed") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "max-w-3xl mx-auto p-8 text-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-slate-500",
			children: ["Report status: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium",
				children: report.status
			})]
		})
	});
	const data = report.rawOutput;
	const mockBrand = {
		id: "brand-1",
		name: report.brandName,
		website: report.brandWebsite,
		enabled: true,
		onboarded: true,
		delayOverrideHours: null,
		createdAt: /* @__PURE__ */ new Date(),
		updatedAt: /* @__PURE__ */ new Date()
	};
	const mockCompetitors = data.competitors.map((comp, i) => ({
		id: `comp-${i + 1}`,
		name: comp.name,
		domain: comp.domain,
		brandId: mockBrand.id,
		createdAt: /* @__PURE__ */ new Date(),
		updatedAt: /* @__PURE__ */ new Date()
	}));
	const mockPrompts = data.prompts.map((p, i) => ({
		id: `prompt-${i + 1}`,
		brandId: mockBrand.id,
		value: p.value,
		enabled: true,
		createdAt: /* @__PURE__ */ new Date()
	}));
	const simpleRuns = [];
	const fullRuns = [];
	const chartRuns = [];
	data.promptRuns.forEach((pr, pi) => {
		pr.runs.forEach((run, ri) => {
			const promptId = `prompt-${pi + 1}`;
			simpleRuns.push({
				promptId,
				brandMentioned: run.brandMentioned,
				competitorsMentioned: run.competitorsMentioned
			});
			fullRuns.push({
				promptId,
				promptValue: pr.promptValue,
				brandMentioned: run.brandMentioned,
				competitorsMentioned: run.competitorsMentioned,
				webQueries: run.webQueries || [],
				textContent: run.textContent || "",
				model: run.model
			});
			chartRuns.push({
				id: `run-${pi}-${ri}`,
				promptId,
				brandMentioned: run.brandMentioned,
				competitorsMentioned: run.competitorsMentioned,
				createdAt: /* @__PURE__ */ new Date(),
				model: run.model,
				version: run.version,
				webSearchEnabled: run.webSearchEnabled,
				rawOutput: run.rawOutput,
				webQueries: run.webQueries
			});
		});
	});
	const brandNameLower = report.brandName.toLowerCase().trim();
	const isBrandName = (name) => name.toLowerCase().trim() === brandNameLower;
	const seenCompetitorNames = /* @__PURE__ */ new Set();
	const filteredCompetitors = data.competitors.filter((c) => {
		const key = c.name.toLowerCase().trim();
		if (isBrandName(c.name) || seenCompetitorNames.has(key)) return false;
		seenCompetitorNames.add(key);
		return true;
	});
	const overallSoV = computeOverallSoV(simpleRuns, filteredCompetitors);
	const competitorSoVs = computeCompetitorSoVs(simpleRuns, filteredCompetitors);
	const promptSoVs = mockPrompts.map((p) => computePromptSoV(p.id, simpleRuns, filteredCompetitors));
	const promptMap = new Map(mockPrompts.map((p) => [p.id, p]));
	const selectedPrompts = selectRepresentativePrompts(promptSoVs, (id) => {
		const p = promptMap.get(id);
		return p ? isPromptBranded(p.value, report.brandName, report.brandWebsite) : false;
	});
	const contentGaps = findContentGaps(fullRuns, 5);
	const allWebQueries = analyzeWebQueries(fullRuns, 1e3);
	const competitorFreq = analyzeCompetitorFrequency(fullRuns, filteredCompetitors);
	const engineBreakdown = analyzeByEngine(fullRuns);
	const queryCompetitorMap = /* @__PURE__ */ new Map();
	for (const run of fullRuns) for (const query of run.webQueries || []) {
		const normalized = query.toLowerCase().trim();
		if (!normalized || normalized.length < 3) continue;
		const existing = queryCompetitorMap.get(normalized);
		const compCount = run.competitorsMentioned.length;
		if (!existing) queryCompetitorMap.set(normalized, {
			brandMentioned: run.brandMentioned,
			competitorCount: compCount
		});
		else {
			if (run.brandMentioned) existing.brandMentioned = true;
			existing.competitorCount = Math.max(existing.competitorCount, compCount);
		}
	}
	const enrichedQueries = allWebQueries.map((q) => {
		const extra = queryCompetitorMap.get(q.query);
		return {
			...q,
			brandMentioned: extra?.brandMentioned ?? false,
			competitorCount: extra?.competitorCount ?? 0
		};
	});
	const topSearchQueries = [];
	const usedQueries = /* @__PURE__ */ new Set();
	const byFrequency = [...enrichedQueries].sort((a, b) => b.count - a.count);
	const withBrand = enrichedQueries.filter((q) => q.brandMentioned).sort((a, b) => b.count - a.count);
	for (const q of byFrequency) {
		if (topSearchQueries.length >= 3) break;
		if (!usedQueries.has(q.query)) {
			topSearchQueries.push(q);
			usedQueries.add(q.query);
		}
	}
	for (const q of withBrand) {
		if (topSearchQueries.length >= 6) break;
		if (!usedQueries.has(q.query)) {
			topSearchQueries.push(q);
			usedQueries.add(q.query);
		}
	}
	for (const q of byFrequency) {
		if (topSearchQueries.length >= 6) break;
		if (!usedQueries.has(q.query)) {
			topSearchQueries.push(q);
			usedQueries.add(q.query);
		}
	}
	topSearchQueries.sort((a, b) => b.competitorCount - a.competitorCount);
	const sovLevel = getSoVLevel(overallSoV);
	const sovColor = getSoVColor(overallSoV);
	const totalPrompts = mockPrompts.length;
	const promptsWithMentions = promptSoVs.filter((p) => p.brandMentionCount > 0).length;
	totalPrompts > 0 && Math.round(promptsWithMentions / totalPrompts * 100);
	const chartPairs = [];
	for (let i = 0; i < selectedPrompts.length; i += 2) chartPairs.push(selectedPrompts.slice(i, i + 2));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-[780px] mx-auto bg-white print:max-w-none text-slate-900",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
				@media print {
					@page { size: letter; margin: 0.5in 0.6in; }
					body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				}
			` }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "print:h-[9.5in] print:flex print:flex-col p-10 print:p-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-[3px] bg-slate-800 -mx-10 print:-mx-0 mb-8" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between mb-16",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {
							iconClassName: "!size-5",
							textClassName: "text-sm font-semibold text-slate-400"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs tracking-wide text-slate-400",
							children: new Date(report.createdAt).toLocaleDateString("en-US", {
								year: "numeric",
								month: "long",
								day: "numeric"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 flex flex-col justify-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-semibold tracking-[0.25em] uppercase text-slate-400 mb-4",
								children: "AI Share of Voice Report"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-4xl font-bold tracking-tight mb-2",
								children: report.brandName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-16 h-[2px] bg-slate-800 mb-12" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-slate-50 rounded-xl p-8 max-w-md mb-12",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-baseline gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `text-6xl font-extrabold tracking-tighter ${sovColor}`,
										children: overallSoV !== null ? `${overallSoV}%` : "N/A"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-sm font-semibold",
										children: "Share of Voice"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-slate-500",
										children: [
											sovLevel.label,
											" — ",
											sovLevel.description
										]
									})] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-4 w-full bg-slate-200 rounded-full h-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `h-2 rounded-full ${sovBgColor(overallSoV)}`,
										style: { width: `${Math.max(2, overallSoV ?? 0)}%` }
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-3 gap-6 max-w-lg",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverStat, {
										value: String(totalPrompts),
										label: "Prompts Tested"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverStat, {
										value: String(promptsWithMentions),
										label: "Brand Mentions"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverStat, {
										value: String(filteredCompetitors.length),
										label: "Competitors"
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, { branding })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "print:break-before-page print:h-[9.5in] print:flex print:flex-col p-10 print:p-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunningHeader, { brand: report.brandName }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "AI Engine Performance",
						subtitle: `Brand mention rate across ${engineBreakdown.reduce((s, e) => s + e.totalRuns, 0)} evaluations`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-3 gap-3 mb-8",
						children: engineBreakdown.map((eng) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border border-slate-200 rounded-lg p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] font-medium text-slate-500 mb-2",
									children: eng.engine
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `text-3xl font-bold ${getSoVColor(eng.mentionRate)}`,
									children: [eng.mentionRate, "%"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[10px] text-slate-400 mt-1",
									children: [
										eng.brandMentions,
										" of ",
										eng.totalRuns,
										" runs"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2.5 w-full bg-slate-100 rounded-full h-1.5",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `h-1.5 rounded-full ${sovBgColor(eng.mentionRate)}`,
										style: { width: `${Math.max(2, eng.mentionRate)}%` }
									})
								})
							]
						}, eng.engine))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Competitive Landscape",
						subtitle: "Share of voice comparison across all tested prompts"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border border-slate-200 rounded-lg overflow-hidden mb-8 print:pb-px",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "bg-slate-50 border-b border-slate-200",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "left",
										children: "Brand"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "right",
										className: "w-16",
										children: "SoV"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "left",
										className: "w-[40%]",
										children: "Share"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-slate-100",
								children: [{
									name: report.brandName,
									sov: overallSoV ?? 0,
									isBrand: true
								}, ...competitorSoVs.filter((c) => !isBrandName(c.name)).slice(0, 3).map((c) => ({
									name: c.name,
									sov: c.sov,
									isBrand: false
								}))].sort((a, b) => b.sov - a.sov).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: row.isBrand ? "bg-blue-50/30" : "",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: `py-2.5 px-4 text-sm ${row.isBrand ? "font-semibold" : "text-slate-600"}`,
											children: row.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-4 text-right",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: `text-sm font-bold ${row.isBrand ? sovColor : "text-slate-500"}`,
												children: [row.sov, "%"]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-4",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar$1, {
												value: row.sov,
												color: row.isBrand ? "bg-blue-500" : "bg-slate-300"
											})
										})
									]
								}, row.name))
							})]
						})
					}),
					competitorFreq.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Mention Rate",
						subtitle: "Each prompt is evaluated multiple times across AI engines — mentions show total appearances, unique prompts show how many distinct prompts include the brand"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border border-slate-200 rounded-lg overflow-hidden print:pb-px",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "bg-slate-50 border-b border-slate-200",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "left",
										children: "Brand"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "center",
										children: "Mentions"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "center",
										children: "Unique Prompts"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-slate-100",
								children: [{
									name: report.brandName,
									mentionCount: simpleRuns.filter((r) => r.brandMentioned).length,
									promptCount: promptsWithMentions,
									isBrand: true
								}, ...competitorFreq.filter((c) => !isBrandName(c.name)).slice(0, 3).map((c) => ({
									...c,
									isBrand: false
								}))].sort((a, b) => b.mentionCount - a.mentionCount).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: c.isBrand ? "bg-blue-50/30" : "",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: `py-2 px-4 text-xs font-medium ${c.isBrand ? "text-slate-900" : "text-slate-700"}`,
											children: c.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2 px-4 text-center text-xs text-slate-600",
											children: [c.mentionCount, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-slate-400",
												children: ["/", simpleRuns.length]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2 px-4 text-center text-xs text-slate-600",
											children: [c.promptCount, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-slate-400",
												children: ["/", totalPrompts]
											})]
										})
									]
								}, c.name))
							})]
						})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, { branding })
					})
				]
			}),
			chartPairs.map((pair, pageIdx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "print:break-before-page print:h-[9.5in] print:flex print:flex-col p-10 print:p-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunningHeader, { brand: report.brandName }),
					pageIdx === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Prompt Analysis",
						subtitle: "Share of voice for representative prompts — strengths and growth opportunities"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-slate-400 italic mb-4",
						children: "Prompt Analysis (continued)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex-1 flex flex-col gap-5",
						children: pair.map((selected) => {
							const prompt = promptMap.get(selected.promptId);
							if (!prompt) return null;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex-1 flex flex-col",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptChartPrint, {
									lookback: "1m",
									promptName: prompt.value,
									promptId: prompt.id,
									brand: mockBrand,
									competitors: mockCompetitors,
									promptRuns: chartRuns,
									category: selected.category
								})
							}, selected.promptId);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, { branding })
					})
				]
			}, pair.map((prompt) => prompt.promptId).join("-"))),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "print:break-before-page print:h-[9.5in] print:flex print:flex-col p-10 print:p-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunningHeader, { brand: report.brandName }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Content Gaps",
						subtitle: `Prompts where competitors appear but ${report.brandName} does not — highest-value opportunities`
					}),
					contentGaps.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border border-slate-200 rounded-lg overflow-hidden mb-8",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "bg-slate-50 border-b border-slate-200",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
									align: "left",
									children: "Prompt"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
									align: "left",
									className: "w-[50%]",
									children: "Competitors Found"
								})]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-slate-100",
								children: contentGaps.map((gap) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2.5 px-4 text-xs text-slate-700 leading-relaxed max-w-[320px]",
									children: gap.promptValue
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2.5 px-4",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap gap-1",
										children: [gap.competitorsMentioned.slice(0, 3).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium",
											children: c
										}, c)), gap.competitorsMentioned.length > 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[10px] text-slate-400",
											children: ["+", gap.competitorsMentioned.length - 3]
										})]
									})
								})] }, gap.promptId))
							})]
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border border-slate-200 rounded-lg p-6 text-center mb-8",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-slate-500 text-sm",
							children: [report.brandName, " appears in all prompts where competitors are mentioned."]
						})
					}),
					topSearchQueries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Top AI Search Queries",
						subtitle: "Common web search queries AI models run when answering prompts in your category"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border border-slate-200 rounded-lg overflow-hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "bg-slate-50 border-b border-slate-200",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "left",
										children: "Query"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "center",
										className: "w-28",
										children: "Competitors Found"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "center",
										className: "w-24",
										children: "Brand Mentioned"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-slate-100",
								children: topSearchQueries.map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-4 text-xs text-slate-700 max-w-[350px] break-words",
										children: q.query
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-4 text-center text-xs text-slate-600",
										children: q.competitorCount
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-4 text-center",
										children: q.brandMentioned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-emerald-600 font-semibold text-xs",
											children: "✓"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-slate-300 text-xs",
											children: "—"
										})
									})
								] }, q.query))
							})]
						})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, { branding })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "print:break-before-page print:h-[9.5in] print:flex print:flex-col p-10 print:p-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunningHeader, { brand: report.brandName }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Share of Voice Opportunity",
						subtitle: "Overview of your current AI share of voice and growth potential"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border border-slate-200 rounded-lg overflow-hidden mb-8",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "bg-slate-50 border-b border-slate-200",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "center",
										children: "Prompts With Mentions"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "center",
										children: "Total Prompts Tested"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "center",
										children: "Overall SoV"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "center",
										children: "Opportunity"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
										align: "left",
										children: "Recommendation"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "text-center py-3 px-4 text-sm font-semibold",
									children: promptsWithMentions
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "text-center py-3 px-4 text-sm text-slate-600",
									children: totalPrompts
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "text-center py-3 px-4",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: `text-sm font-bold ${sovColor}`,
										children: [overallSoV ?? 0, "%"]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "text-center py-3 px-4",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${(overallSoV ?? 0) < 20 ? "bg-rose-50 text-rose-700" : (overallSoV ?? 0) < 40 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`,
										children: (overallSoV ?? 0) < 20 ? "High" : (overallSoV ?? 0) < 40 ? "Medium" : "Low"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-3 px-4 text-xs text-slate-600",
									children: (overallSoV ?? 0) < 20 ? "Prioritize content creation to establish AI presence" : (overallSoV ?? 0) < 40 ? "Expand content to increase brand share of voice" : "Maintain leadership and defend competitive position"
								})
							] }) })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "What Should I Do Next?",
						subtitle: `Prompts where competitors outperform ${report.brandName} — your biggest growth opportunities`
					}),
					(() => {
						const opportunities = promptSoVs.filter((p) => p.totalCompetitorMentions > 0).map((p) => {
							const prompt = promptMap.get(p.promptId);
							const brandSoV = p.sov ?? 0;
							const topCompMentions = Math.max(...Object.values(p.competitorMentions), 0);
							const denom = p.brandMentionCount + p.totalCompetitorMentions;
							const maxCompSoV = denom > 0 ? Math.round(topCompMentions / denom * 100) : 0;
							const gap = maxCompSoV - brandSoV;
							const goalSoV = Math.min(100, maxCompSoV + (gap > 30 ? 5 : gap > 15 ? 8 : 10));
							const articleCount = gap > 40 ? 8 : gap > 25 ? 6 : gap > 10 ? 5 : 4;
							return {
								promptValue: prompt?.value ?? p.promptId,
								brandSoV,
								maxCompSoV,
								gap,
								goalSoV,
								articleCount
							};
						}).filter((o) => o.gap > 0).sort((a, b) => {
							if (a.brandSoV > 0 && b.brandSoV === 0) return -1;
							if (a.brandSoV === 0 && b.brandSoV > 0) return 1;
							return b.gap - a.gap;
						}).slice(0, 5);
						if (opportunities.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "border border-slate-200 rounded-lg p-6 text-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-slate-500 text-sm",
								children: [report.brandName, " leads or matches competitors across all tested prompts."]
							})
						});
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "border border-slate-200 rounded-lg overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "bg-slate-50 border-b border-slate-200",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
											align: "left",
											children: "Prompt"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
											align: "center",
											children: "Current SoV"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
											align: "center",
											children: "Top Competitor SoV"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
											align: "center",
											children: "Goal SoV"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TH, {
											align: "left",
											children: "Recommendation"
										})
									]
								}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
									className: "divide-y divide-slate-100",
									children: opportunities.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-4 text-xs text-slate-700 max-w-[200px] break-words leading-relaxed",
											children: o.promptValue
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-4 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: `text-xs font-semibold ${getSoVColor(o.brandSoV)}`,
												children: [o.brandSoV, "%"]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2.5 px-4 text-center text-xs font-semibold text-slate-600",
											children: [o.maxCompSoV, "%"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2.5 px-4 text-center text-xs font-semibold text-emerald-600",
											children: [o.goalSoV, "%"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2.5 px-4 text-xs text-slate-600",
											children: [
												"Write ",
												o.articleCount,
												" LLM-friendly articles on “",
												o.promptValue,
												"”"
											]
										})
									] }, o.promptValue))
								})]
							})
						});
					})(),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, { branding })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "print:break-before-page print:h-[9.5in] print:flex print:flex-col print:justify-center p-10 print:p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-10 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-2xl font-bold text-slate-800 mb-2",
							children: "Ready to Optimize Your AI Visibility?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-slate-600 text-base mb-8",
							children: ["Take your brand's AI presence to the next level with ", branding?.name || "Elmo"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-6 mb-8",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-center p-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex justify-center mb-3",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { className: "h-8 w-8 text-slate-600" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "font-semibold text-slate-800 mb-2",
											children: "Strategic Optimization"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-slate-600 leading-relaxed",
											children: "Develop content strategies that increase your brand's share of voice in AI responses"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-center p-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex justify-center mb-3",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, { className: "h-8 w-8 text-slate-600" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "font-semibold text-slate-800 mb-2",
											children: "Continuous Monitoring"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-slate-600 leading-relaxed",
											children: "Track your AI share of voice across hundreds of relevant prompts and topics"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-center p-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex justify-center mb-3",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, { className: "h-8 w-8 text-slate-600" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "font-semibold text-slate-800 mb-2",
											children: "Competitive Advantage"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-slate-600 leading-relaxed",
											children: "Stay ahead of competitors in the rapidly evolving AI search landscape"
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pt-6 border-t border-blue-200",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-slate-800 font-medium mb-2",
								children: [
									"Get started with ",
									branding?.name || "Elmo",
									" today"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-slate-600 text-sm text-balance",
								children: [
									"Visit ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: branding?.url || "elmo.chat" }),
									" to learn more about our AI visibility platform and services."
								]
							})]
						})
					]
				})
			})
		]
	});
}
function RunningHeader({ brand }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between mb-6 pb-3 border-b border-slate-100",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-400",
			children: "AI Share of Voice Report"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[10px] font-medium text-slate-400",
			children: brand
		})]
	});
}
function Section({ title, subtitle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-l-[3px] border-slate-800 pl-3 mb-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-base font-semibold",
			children: title
		}), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-slate-500 mt-0.5 leading-relaxed",
			children: subtitle
		})]
	});
}
function TH({ children, align, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
		className: `py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500 ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"} ${className}`,
		children
	});
}
function CoverStat({ value, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t-2 border-slate-800 pt-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-2xl font-bold",
			children: value
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[10px] text-slate-500 mt-0.5",
			children: label
		})]
	});
}
function Bar$1({ value, color }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "w-full bg-slate-100 rounded-full h-2.5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `${color} h-2.5 rounded-full`,
			style: { width: `${Math.max(2, value ?? 0)}%` }
		})
	});
}
function PageFooter({ branding }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {
			iconClassName: "!size-3",
			textClassName: "text-[10px] font-medium text-slate-400"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: branding?.url || "elmo.chat" })]
	});
}
//#endregion
export { ReportRenderPage as component };

//# sourceMappingURL=_reportId-CboD2YJ4.mjs.map