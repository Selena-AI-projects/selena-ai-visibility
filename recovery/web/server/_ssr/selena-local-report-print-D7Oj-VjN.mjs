//#region node_modules/.nitro/vite/services/ssr/assets/selena-local-report-print-D7Oj-VjN.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "4c84c4f1-5e92-494b-875a-e416ecf734a4", e._sentryDebugIdIdentifier = "sentry-dbid-4c84c4f1-5e92-494b-875a-e416ecf734a4");
	} catch (e) {}
})();
var escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[c] ?? c);
function localReportPrintableHtml(report, external = [], requestParameters) {
	const groups = [];
	for (const keyword of [...new Set(report.observations.map((r) => r.keyword))]) {
		const rows = report.observations.filter((r) => r.keyword === keyword);
		groups.push({
			keyword,
			language: rows[0].language,
			source: "Original published measurement",
			points: rows.map((row) => ({
				point: row.pointIndex + 1,
				rank: row.targetRank,
				outcome: row.outcome,
				capturedAt: row.capturedAt,
				organic: row.competition?.status === "AVAILABLE" ? row.competition.target ? row.competition.aboveTarget : row.competition.returnedOrganic ?? [] : [],
				ads: row.competition?.status === "AVAILABLE" ? row.competition.ads : [],
				comparisonAvailable: row.competition?.status === "AVAILABLE"
			}))
		});
	}
	for (const audit of external) for (const batch of audit.batches) for (const keyword of [...new Set(batch.observations.map((r) => r.keyword))]) {
		const rows = batch.observations.filter((r) => r.keyword === keyword);
		groups.push({
			keyword,
			language: rows[0].request.language_code,
			source: `Additional retained external audit · ${rows[0].request.device}/${rows[0].request.os} · depth ${rows[0].request.depth} · zoom 13 · ${rows[0].request.se_domain}`,
			points: rows.map((row) => ({
				point: row.pointIndex + 1,
				rank: row.targetRank,
				outcome: row.targetRank === null ? "ABSENT_WITHIN_DEPTH" : "FOUND",
				capturedAt: row.capturedAt,
				organic: row.competition.target ? row.competition.aboveTarget : row.competition.returnedOrganic ?? [],
				ads: row.competition.ads,
				comparisonAvailable: true
			}))
		});
	}
	const target = report.observations.map((r) => r.competition?.status === "AVAILABLE" ? r.competition.target?.name : null).find(Boolean) ?? "Restaurant";
	const list = (items) => items.slice(0, 3).map((item) => `${escapeHtml(item.name)} (${item.kind === "AD" ? `overall #${item.absoluteRank ?? "unknown"}` : `organic #${item.groupRank}`})`).join("<br>") + (items.length > 3 ? "<br>Full list in CSV" : "");
	const sections = groups.map((g) => {
		const valid = g.points.filter((r) => ["FOUND", "ABSENT_WITHIN_DEPTH"].includes(r.outcome));
		const found = valid.filter((r) => r.rank !== null).length, top3 = valid.filter((r) => r.rank !== null && r.rank <= 3).length;
		return `<section><p>${escapeHtml(g.source)} · ${escapeHtml(g.language)}</p><h2>${escapeHtml(g.keyword)}</h2><p>Found at ${found} of ${valid.length} measured points; top 3 at ${top3} points. ${g.points.length - valid.length} points unmeasured.</p><table><thead><tr><th>Point</th><th>Organic position</th><th>Captured (UTC)</th><th>Organic results</th><th>Advertising</th></tr></thead><tbody>${g.points.map((p) => `<tr><td>P${p.point}</td><td>${p.rank === null ? p.outcome === "ABSENT_WITHIN_DEPTH" ? "Not found within depth" : "Not measured" : `#${p.rank}`}</td><td>${escapeHtml(p.capturedAt ?? "Unavailable")}</td><td>${p.rank === null ? "Returned results; relative position unknown<br>" : "Above the restaurant<br>"}${list(p.organic) || "No saved comparison"}</td><td>${p.comparisonAvailable ? list(p.ads) || "No ad recorded" : "Comparison unavailable"}</td></tr>`).join("")}</tbody></table></section>`;
	}).join("");
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(target)} — Local Visibility report</title><style>body{font:14px Georgia,serif;color:#181614;background:#fffdf8;margin:32px;line-height:1.5}main{max-width:1100px;margin:auto}h1{font-size:30px}h2{font-size:23px}section{margin-top:40px;break-before:page}table{border-collapse:collapse;width:100%;font:12px system-ui,sans-serif}th,td{border:1px solid #e6ddd1;padding:9px;text-align:left;vertical-align:top;overflow-wrap:anywhere}tr{break-inside:avoid}thead{display:table-header-group}.note{padding:14px;border-left:3px solid #b9825b}@media print{body{margin:0}.screen{display:none}@page{margin:15mm;size:A4 landscape}}</style></head><body><main><p>SELENA SYSTEMS</p><h1>${escapeHtml(target)} — Google Maps visibility</h1>${requestParameters ? `<p>Original measurement: ${escapeHtml(requestParameters.device ?? "device unspecified")} · depth ${escapeHtml(requestParameters.depth ?? "unspecified")} · zoom ${escapeHtml(requestParameters.zoom ?? "unspecified")} · ${escapeHtml(requestParameters.seDomain ?? "domain unspecified")}</p>` : ""}<p>${groups.length} query scenarios · ${groups.reduce((n, g) => n + g.points.length, 0)} points</p><p class="screen">Use your browser’s Print command to print all query scenarios or save them as a PDF.</p><p class="note">Positions describe saved search responses, not visits, bookings, revenue or visibility in ChatGPT. Different queries and capture times are separate scenarios, not growth over time. Advertising is separate from organic position. An absent restaurant’s exact position is unknown. This print view shows up to three organic comparison results per point; the CSV contains the complete retained comparison.</p>${sections}</main></body></html>`;
}
//#endregion
export { localReportPrintableHtml };

//# sourceMappingURL=selena-local-report-print-D7Oj-VjN.mjs.map