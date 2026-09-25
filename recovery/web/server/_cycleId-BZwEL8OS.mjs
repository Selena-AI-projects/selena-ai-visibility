import { i as __toESM } from "./_runtime.mjs";
import { $ as IconAlertTriangle, B as IconCircleCheck, R as IconClock, nt as require_react, t as IconX, v as IconQuestionMark, x as IconMapPin } from "./_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "./_libs/react+tanstack__react-query.mjs";
import { n as selectSelenaWorkspace } from "./_ssr/selena-workspaces-BwiY6M8I.mjs";
import { t as Route } from "./_cycleId-qyaWjH7B.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_cycleId-BZwEL8OS.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "5370e692-cdfa-4365-b7fd-fa7f81ef62b1", e._sentryDebugIdIdentifier = "sentry-dbid-5370e692-cdfa-4365-b7fd-fa7f81ef62b1");
	} catch (e) {}
})();
function SelenaLocalExternalReport({ audits }) {
	const queries = audits.flatMap((audit) => audit.content.batches.flatMap((batch) => [...new Set(batch.observations.map((row) => row.keyword))].map((keyword) => ({
		key: `${audit.id}:${batch.auditId}:${keyword}`,
		rawRetention: audit.rawRetention ?? [],
		keyword,
		rows: batch.observations.filter((row) => row.keyword === keyword)
	}))));
	const [selected, setSelected] = (0, import_react.useState)("");
	const [point, setPoint] = (0, import_react.useState)(0);
	const query = queries.find((item) => item.key === selected) ?? queries[0];
	if (!query) return null;
	const row = query.rows.find((item) => item.pointIndex === point) ?? query.rows[0];
	const retention = query.rawRetention.find((item) => item.providerTaskId === row.providerTaskId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		"aria-labelledby": "additional-query-title",
		className: "space-y-5 border-t border-[#e6ddd1] pt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				id: "additional-query-title",
				className: "font-serif text-2xl",
				children: "Additional measured queries"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				queries.length,
				" additional queries · ",
				queries.reduce((sum, item) => sum + item.rows.length, 0),
				" saved positions. The original measurement above remains separate."
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "These results come from retained external audits of the same restaurant. Different search terms and capture times are separate scenarios, not a before-and-after comparison. Positions do not measure visits, bookings or revenue." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "mb-2 block font-semibold",
				htmlFor: "external-query",
				children: "Search query"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				id: "external-query",
				className: "min-h-11 w-full rounded-xl border border-[#b9825b] bg-[#fffdf8] px-3 text-[#181614] focus-visible:outline-2 focus-visible:outline-offset-4",
				value: query.key,
				onChange: (event) => {
					setSelected(event.target.value);
					setPoint(0);
				},
				children: queries.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: item.key,
					children: item.keyword
				}, item.key))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				role: "status",
				children: [
					"Found at ",
					query.rows.filter((item) => item.targetRank !== null).length,
					" of ",
					query.rows.length,
					" points; top 3 at",
					" ",
					query.rows.filter((item) => item.targetRank !== null && item.targetRank <= 3).length,
					" points."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"Google Maps · ",
				row.request.language_code,
				" · ",
				row.request.device,
				"/",
				row.request.os,
				" · depth ",
				row.request.depth,
				" · zoom 13. Select a point to inspect its results."
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("fieldset", {
				"aria-label": "Additional query measurement points, ordered by point number",
				className: "grid grid-cols-3 gap-3",
				children: [...query.rows].sort((a, b) => a.pointIndex - b.pointIndex).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-pressed": row.pointIndex === item.pointIndex,
					className: `min-h-20 rounded-xl border p-3 focus-visible:outline-2 focus-visible:outline-offset-4 ${row.pointIndex === item.pointIndex ? "border-[#8f5c34] bg-[#181614] text-[#fffdf8]" : "border-[#e6ddd1] bg-[#fffdf8] text-[#181614]"}`,
					onClick: () => setPoint(item.pointIndex),
					children: [
						"P",
						item.pointIndex + 1,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						item.targetRank === null ? "Not found" : `#${item.targetRank}`
					]
				}, item.providerTaskId))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "text-lg font-semibold",
						children: [
							"Point ",
							row.pointIndex + 1,
							" ·",
							" ",
							row.targetRank === null ? "Not found within depth 20" : `Organic position #${row.targetRank}`
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Captured: ",
						new Date(row.capturedAt).toLocaleString(),
						" · Coordinates:",
						" ",
						row.request.location_coordinate.split(",").slice(0, 2).join(", ")
					] }),
					row.targetRank === null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The restaurant was not returned within the checked depth. Its exact position is unknown." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "font-semibold",
						children: "Organic results above the restaurant"
					}),
					row.targetRank === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No relative position can be assigned when the restaurant is absent." }) : row.competition.aboveTarget.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No organic result ahead in this response." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "list-disc pl-5",
						children: row.competition.aboveTarget.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
							item.name,
							" — #",
							item.groupRank
						] }, item.sourceItemIndex))
					}),
					row.targetRank === null && row.competition.returnedOrganic && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "font-semibold",
						children: "Restaurants returned in this search"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "list-disc pl-5",
						children: row.competition.returnedOrganic.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
							item.name,
							" — organic #",
							item.groupRank
						] }, item.sourceItemIndex))
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "font-semibold",
						children: "Advertising — separate from organic positions"
					}),
					row.competition.ads.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No ad recorded in this response." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "list-disc pl-5",
						children: row.competition.ads.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [item.name, item.absoluteRank === null ? "" : ` — overall #${item.absoluteRank}`] }, item.sourceItemIndex))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
						className: "break-words text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
								className: "min-h-11 cursor-pointer py-3 font-semibold",
								children: "Saved source reference"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["External retained response · provider task ", row.providerTaskId] }),
							retention && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Original response retention deadline: ",
								new Date(retention.expiresAt).toLocaleString(),
								".",
								" ",
								retention.available ? "Retained privately; the response body is not included in this report." : "Original body is unavailable under the retention policy. The saved comparison and hashes remain."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "break-all",
								children: ["SHA-256: ", row.rawSha256]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Original journal field: ",
								row.sourceTimeField,
								"; recorded ",
								row.sourceRecordedAt,
								".",
								" ",
								row.providerClockAheadMs > 0 ? `Provider clock is ${row.providerClockAheadMs} ms ahead of the source journal.` : ""
							] })
						]
					})
				]
			})
		]
	});
}
var copy = {
	en: {
		title: "Local Maps visibility",
		captured: "Report generated",
		grid: "3×3 measurement grid",
		expected: "Expected",
		terminal: "Finished",
		valid: "Measured",
		invalid: "Failed",
		unknown: "Unconfirmed",
		pending: "Pending",
		found: "Found",
		absent: "Absent within depth",
		invalidState: "Invalid",
		unknownState: "Unknown",
		blocked: "Blocked",
		cancelled: "Cancelled",
		pendingState: "Pending",
		evidence: "Evidence",
		noEvidence: "No accepted evidence"
	},
	ru: {
		title: "Видимость в Local Maps",
		captured: "Отчёт создан",
		grid: "Сетка замера 3×3",
		expected: "Ожидалось",
		terminal: "Завершено",
		valid: "Валидно",
		invalid: "Невалидно",
		unknown: "Неизвестно",
		pending: "Ожидает",
		found: "Найдено",
		absent: "Нет в глубине",
		invalidState: "Невалидно",
		unknownState: "Неизвестно",
		blocked: "Заблокировано",
		cancelled: "Отменено",
		pendingState: "Ожидает",
		evidence: "Доказательство",
		noEvidence: "Принятого доказательства нет"
	}
};
function outcomeLabel(outcome, text) {
	return outcome === "FOUND" ? text.found : outcome === "ABSENT_WITHIN_DEPTH" ? text.absent : outcome === "INVALID" ? text.invalidState : outcome === "UNKNOWN" ? text.unknownState : outcome === "BLOCKED" ? text.blocked : outcome === "CANCELLED" ? text.cancelled : text.pendingState;
}
function OutcomeIcon({ outcome }) {
	if (outcome === "FOUND" || outcome === "ABSENT_WITHIN_DEPTH") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconCircleCheck, {
		className: "size-4",
		"aria-hidden": "true"
	});
	if (outcome === "INVALID" || outcome === "BLOCKED") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAlertTriangle, {
		className: "size-4",
		"aria-hidden": "true"
	});
	if (outcome === "UNKNOWN") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconQuestionMark, {
		className: "size-4",
		"aria-hidden": "true"
	});
	if (outcome === "CANCELLED") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconX, {
		className: "size-4",
		"aria-hidden": "true"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconClock, {
		className: "size-4",
		"aria-hidden": "true"
	});
}
function outcomeTone(outcome) {
	if (outcome === "FOUND") return "border-[#6f8f73] bg-[#edf3ed] text-[#24472b]";
	if (outcome === "ABSENT_WITHIN_DEPTH") return "border-[#b8a177] bg-[#f7f1e5] text-[#5b4928]";
	if (outcome === "INVALID" || outcome === "BLOCKED") return "border-[#b87962] bg-[#f9ece7] text-[#6d2f20]";
	if (outcome === "UNKNOWN") return "border-[#ad936c] bg-[#f4eee5] text-[#54422b]";
	if (outcome === "CANCELLED") return "border-[#a49b91] bg-[#eeeae5] text-[#4b443e]";
	return "border-[#c9beb2] bg-[#faf7f2] text-[#574d45]";
}
function SelenaLocalMapReport({ report, locale = "en", onEvidence }) {
	const text = copy[locale];
	const observations = [...report.observations].sort((a, b) => a.pointIndex - b.pointIndex);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-6",
		"aria-labelledby": "selena-local-map-report-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-[#8f5c34]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconMapPin, {
							className: "size-5",
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-bold tracking-[0.08em]",
							children: text.grid
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "selena-local-map-report-title",
						className: "mt-2 text-2xl font-semibold text-[#181614]",
						children: text.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-[#574d45]",
						children: [
							report.observations[0]?.keyword ?? "",
							" · ",
							report.provider
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-right text-xs text-[#574d45]",
					children: [
						text.captured,
						": ",
						new Date(report.generatedAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB")
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-5",
				children: [
					[text.expected, report.totals.expected],
					[text.terminal, report.totals.terminal],
					[text.valid, report.totals.valid],
					[text.invalid, report.totals.invalid],
					[text.unknown, report.totals.unknown]
				].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-[#d9cfc2] bg-[#faf7f2] p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-xs font-semibold text-[#574d45]",
						children: label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "mt-1 text-xl font-semibold text-[#181614]",
						children: value
					})]
				}, String(label)))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 360 300",
				className: "mx-auto w-full max-w-xl rounded-xl border border-[#d9cfc2] bg-[#faf7f2]",
				role: "img",
				"aria-label": text.grid,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("title", { children: [
						text.grid,
						":",
						" ",
						observations.map((row) => `P${row.pointIndex + 1} ${outcomeLabel(row.outcome, text)} ${row.targetRank ?? "—"}`).join(", ")
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: "180",
						y: "22",
						textAnchor: "middle",
						fill: "#574d45",
						fontSize: "12",
						children: "N ↑"
					}),
					[
						60,
						150,
						240
					].map((y) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: `M60 ${y} H300`,
						stroke: "#d9cfc2"
					}, y)),
					[
						60,
						180,
						300
					].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: `M${x} 60 V240`,
						stroke: "#d9cfc2"
					}, x)),
					observations.map((row) => {
						const latitudes = observations.map((point) => point.latitude);
						const longitudes = observations.map((point) => point.longitude);
						const x = 60 + (row.longitude - Math.min(...longitudes)) / (Math.max(...longitudes) - Math.min(...longitudes) || 1) * 240;
						const y = 60 + (Math.max(...latitudes) - row.latitude) / (Math.max(...latitudes) - Math.min(...latitudes) || 1) * 180;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: x,
								cy: y,
								r: "22",
								fill: row.outcome === "FOUND" ? "#24472b" : "#574d45"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
								x,
								y: y + 5,
								textAnchor: "middle",
								fill: "#fffdf8",
								fontSize: "16",
								children: row.outcome === "FOUND" ? row.targetRank : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
								x,
								y: y + 39,
								textAnchor: "middle",
								fill: "#574d45",
								fontSize: "12",
								children: ["P", row.pointIndex + 1]
							})
						] }, row.id);
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:grid-cols-3",
				children: observations.map((observation) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: `min-h-32 rounded-xl border p-4 ${outcomeTone(observation.outcome)}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs font-bold tracking-[0.08em]",
								children: ["P", observation.pointIndex + 1]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 text-xs font-semibold",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OutcomeIcon, { outcome: observation.outcome }), outcomeLabel(observation.outcome, text)]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 text-2xl font-semibold",
							children: observation.targetRank === null ? "—" : `#${observation.targetRank}`
						}),
						observation.capturedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xs",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
								dateTime: observation.capturedAt,
								children: new Date(observation.capturedAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs",
							children: [
								observation.latitude.toFixed(5),
								", ",
								observation.longitude.toFixed(5)
							]
						}),
						observation.evidenceId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4",
							href: `/api/v1/selena/local-scan-cycles/${report.localCycleId}/report?evidence=${observation.evidenceId}`,
							onClick: onEvidence ? (event) => {
								event.preventDefault();
								onEvidence(observation.evidenceId);
							} : void 0,
							"aria-label": `${text.evidence} P${observation.pointIndex + 1}`,
							children: text.evidence
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-xs",
							children: observation.reason ?? text.noEvidence
						})
					]
				}, observation.id))
			})
		]
	});
}
var control = "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b9825b] px-4 py-2 font-semibold text-[#8f5c34] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60";
function SelenaLocalReportPage({ cycleId }) {
	const [report, setReport] = (0, import_react.useState)(null);
	const [state, setState] = (0, import_react.useState)("loading");
	const [reload, setReload] = (0, import_react.useState)(0);
	const [acknowledging, setAcknowledging] = (0, import_react.useState)(false);
	const [message, setMessage] = (0, import_react.useState)("");
	const [evidence, setEvidence] = (0, import_react.useState)(null);
	const [evidenceState, setEvidenceState] = (0, import_react.useState)("idle");
	const requestKey = (0, import_react.useRef)("");
	const evidencePanel = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (evidenceState === "ready" || evidenceState === "error") {
			evidencePanel.current?.focus();
			evidencePanel.current?.scrollIntoView({ block: "start" });
		}
	}, [evidenceState]);
	const endpoint = `/api/v1/selena/local-scan-cycles/${encodeURIComponent(cycleId)}/report`;
	(0, import_react.useEffect)(() => {
		const abort = new AbortController();
		setState("loading");
		setReport(null);
		setEvidence(null);
		setEvidenceState("idle");
		setMessage("");
		requestKey.current = "";
		fetch(`${endpoint}?refresh=${reload}`, {
			credentials: "same-origin",
			signal: abort.signal
		}).then(async (response) => {
			if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("REPORT_UNAVAILABLE");
			if (response.status === 404) {
				setState("empty");
				return;
			}
			if (!response.ok) throw new Error("REPORT_UNAVAILABLE");
			setReport(await response.json());
			setState("ready");
		}).catch(() => {
			if (!abort.signal.aborted) setState("error");
		});
		return () => abort.abort();
	}, [endpoint, reload]);
	async function acknowledge() {
		if (!report?.delivery || acknowledging) return;
		setAcknowledging(true);
		setMessage("");
		requestKey.current ||= crypto.randomUUID();
		try {
			if (!(await fetch(`${endpoint}/acknowledge`, {
				method: "POST",
				credentials: "same-origin",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": requestKey.current
				},
				body: JSON.stringify({ deliveryId: report.delivery.id })
			})).ok) throw new Error("ACKNOWLEDGEMENT_FAILED");
			setReport({
				...report,
				delivery: {
					...report.delivery,
					status: "ACKNOWLEDGED"
				}
			});
			setMessage("Thank you. Your receipt is confirmed.");
		} catch {
			setMessage("Receipt could not be confirmed. Please try again.");
		} finally {
			setAcknowledging(false);
		}
	}
	async function openEvidence(id) {
		setEvidence(null);
		setEvidenceState("loading");
		try {
			const response = await fetch(`${endpoint}?evidence=${encodeURIComponent(id)}`, { credentials: "same-origin" });
			if (!response.ok) throw new Error("EVIDENCE_UNAVAILABLE");
			setEvidence(await response.json());
			setEvidenceState("ready");
		} catch {
			setEvidenceState("error");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-screen bg-[#f7f2ea] px-4 py-8 text-[#181614] sm:px-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-5xl space-y-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/app/selena",
						className: `${control} mb-6`,
						children: "Back to workspace"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-serif text-3xl sm:text-4xl",
						children: "Your Google Maps report"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/selena/local/checkout",
						className: `${control} mt-4`,
						children: "Create a $49 test order"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-2xl text-[#574d45]",
						children: "Positions measured around your location, with the time and evidence for each point. Positions may change after the measurement."
					})
				] }),
				state === "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "status",
					children: "Loading your report…"
				}),
				state === "empty" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "status",
					children: "This report is not available yet. Your operator will share it after review."
				}),
				state === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					role: "alert",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "We could not load this report. Sign in to the workspace that received the report and try again." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: `${control} mt-4`,
						onClick: () => setReload((value) => value + 1),
						type: "button",
						children: "Try again"
					})]
				}),
				state === "ready" && report && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: `${endpoint}?download=csv`,
						className: control,
						children: "Download report (CSV)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: `${endpoint}?download=print`,
						target: "_blank",
						rel: "noopener noreferrer",
						className: `${control} ml-3`,
						children: "Print / save PDF"
					}),
					report.documents?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						"aria-labelledby": "local-analysis-title",
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								id: "local-analysis-title",
								className: "text-xl font-semibold",
								children: "Analysis and next steps"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Read the reviewed interpretation and recommendations alongside the measured positions below." }),
							report.documents.map((document) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: document.href,
								className: control,
								children: document.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2",
								children: document.description
							})] }, document.id))
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaLocalMapReport, {
						report: report.content,
						onEvidence: (id) => void openEvidence(id)
					}),
					report.externalAudits?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaLocalExternalReport, { audits: report.externalAudits }) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						"aria-labelledby": "local-competitors-title",
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								id: "local-competitors-title",
								className: "text-xl font-semibold",
								children: "Competitors in the saved results"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Organic positions exclude advertising. These are positions at the measurement time, not visits or bookings. They do not explain why Google ranked a restaurant. Saved comparisons remain in the report after the original response reaches its retention deadline." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm sm:hidden",
								children: "Scroll the table sideways to compare positions and advertising."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "overflow-x-auto",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
									className: "w-full min-w-[42rem] border-collapse text-left",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											scope: "col",
											className: "p-3",
											children: "Point and query"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											scope: "col",
											className: "p-3",
											children: "Organic results above your restaurant"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											scope: "col",
											className: "p-3",
											children: "Advertising, shown separately"
										})
									] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: report.content.observations.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-[#e6ddd1]",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
												scope: "row",
												className: "p-3 font-normal",
												children: [
													"Point ",
													row.pointIndex + 1,
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
													row.keyword,
													row.competition?.status === "AVAILABLE" && row.competition.rawRetentionExpiresAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
														className: "mt-2 text-sm",
														children: [
															"Source response retention until",
															" ",
															new Date(row.competition.rawRetentionExpiresAt).toLocaleString()
														]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "p-3",
												children: row.competition?.status !== "AVAILABLE" ? "Competitor evidence unavailable" : !row.competition.target ? "Restaurant not found within the checked depth; its exact position is unknown." : row.competition.aboveTarget.length === 0 ? "No organic result ahead in this saved response." : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: row.competition.aboveTarget.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
													item.name,
													" — organic #",
													item.groupRank,
													item.absoluteRank == null ? "" : `; overall #${item.absoluteRank}`
												] }, item.sourceItemIndex)) })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "p-3",
												children: row.competition?.status !== "AVAILABLE" ? "Advertising evidence unavailable" : row.competition.ads.length === 0 ? "No ad recorded in this response." : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: row.competition.ads.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
													item.name,
													" — ad",
													item.absoluteRank == null ? "" : `; overall #${item.absoluteRank}`
												] }, item.sourceItemIndex)) })
											})
										]
									}, row.id)) })]
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						ref: evidencePanel,
						tabIndex: -1,
						"aria-live": "polite",
						"aria-label": "Measurement evidence",
						className: "scroll-mt-6 focus-visible:outline-2 focus-visible:outline-offset-4",
						children: [
							evidenceState === "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								role: "status",
								children: "Loading evidence…"
							}),
							evidenceState === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								role: "alert",
								children: "Evidence could not be loaded. Select the point again to retry."
							}),
							evidence && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
									className: "text-xl font-semibold",
									children: ["Evidence for point ", evidence.observation.pointIndex + 1]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3",
									children: evidence.observation.keyword
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
									className: "mt-3 grid gap-3 sm:grid-cols-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Position" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: evidence.observation.targetRank ? `#${evidence.observation.targetRank}` : "Absent within the measured depth" })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Measured at" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: evidence.observation.capturedAt ? new Date(evidence.observation.capturedAt).toLocaleString() : "Unavailable" })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Coordinates" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", { children: [
											evidence.observation.latitude,
											", ",
											evidence.observation.longitude
										] })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Data provider" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: evidence.provider })] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
									className: "mt-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
											className: "min-h-11 cursor-pointer py-3",
											children: "Verification record"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "break-all text-sm",
											children: evidence.evidenceSha256
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-2 text-sm",
											children: ["Accepted: ", new Date(evidence.acceptedAt).toLocaleString()]
										})
									]
								})
							] })
						]
					}),
					report.delivery && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "border-t border-[#d9cfc2] pt-6",
						"aria-label": "Report receipt",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-xl font-semibold",
								children: "Confirm receipt"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-[#574d45]",
								children: "This confirms that you received this report."
							}),
							report.delivery.status === "ACKNOWLEDGED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 font-semibold",
								children: "Receipt confirmed"
							}) : report.delivery.status === "SENT" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `${control} mt-4`,
								type: "button",
								disabled: acknowledging,
								onClick: () => void acknowledge(),
								children: acknowledging ? "Confirming…" : "I received this report"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								role: "status",
								className: "mt-3",
								children: message
							})
						]
					})
				] })
			]
		})
	});
}
function LocalReportRoute() {
	const { cycleId } = Route.useParams();
	const workspaces = Route.useLoaderData();
	const [selected, setSelected] = (0, import_react.useState)(workspaces.activeOrganizationId ?? "");
	const [pending, setPending] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	async function selectWorkspace() {
		if (!selected || pending) return;
		setPending(true);
		setError("");
		try {
			await selectSelenaWorkspace({ data: { organizationId: selected } });
			window.location.reload();
		} catch {
			setError("Could not switch workspace. Please try again.");
			setPending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [workspaces.organizations.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		"aria-label": "Workspace selection",
		className: "bg-[#f7f2ea] px-4 pt-6 text-[#181614] sm:px-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-5xl flex-wrap items-end gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex min-w-0 max-w-full flex-col gap-2",
					htmlFor: "local-report-workspace",
					children: ["Workspace", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						id: "local-report-workspace",
						value: selected,
						onChange: (event) => setSelected(event.target.value),
						disabled: pending || workspaces.readOnly,
						className: "min-h-11 max-w-full rounded-xl border border-[#b9825b] bg-[#fffdf8] px-3 focus-visible:outline-2 focus-visible:outline-offset-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							disabled: true,
							children: "Choose workspace"
						}), workspaces.organizations.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: workspace.id,
							children: workspace.name
						}, workspace.id))]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: !selected || pending || workspaces.readOnly,
					onClick: () => void selectWorkspace(),
					className: "min-h-11 rounded-xl border border-[#b9825b] px-4 py-2 font-semibold text-[#8f5c34] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60",
					children: pending ? "Switching…" : "Switch workspace"
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "alert",
					children: error
				})
			]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaLocalReportPage, { cycleId })] });
}
//#endregion
export { LocalReportRoute as component };

//# sourceMappingURL=_cycleId-BZwEL8OS.mjs.map