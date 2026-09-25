import { A as containsForbiddenClaim, Wt as stableId, c as actionPlanSchema } from "./src-BdeAuGX5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/recommendation-engine-E4GDgmMi.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "fe946c3b-3f1b-4270-acd9-e354fa2e04fe", e._sentryDebugIdIdentifier = "sentry-dbid-fe946c3b-3f1b-4270-acd9-e354fa2e04fe");
	} catch (e) {}
})();
function buildManifest(tenantId, datasetId, evidence, rulepackVersion = "ai-website-v1") {
	return {
		id: stableId("manifest", `${tenantId}:${datasetId}:${evidence.map((item) => item.id).join("|")}:${rulepackVersion}`),
		tenantId,
		datasetId,
		evidenceIds: evidence.map((item) => item.id),
		snapshotIds: [...new Set(evidence.map((item) => item.snapshotId))],
		rulepackVersion,
		createdAt: "2026-08-15T00:00:00.000Z",
		immutable: true
	};
}
function buildActionPlan(tenantId, manifest, evidence) {
	if (evidence.some((item) => item.tenantId !== tenantId)) throw new Error("TENANT_ISOLATION_BLOCKED");
	const selected = evidence.filter((item) => manifest.evidenceIds.includes(item.id));
	const mentionRows = selected.filter((item) => item.metadata.mention === "true");
	const apiRows = selected.filter((item) => item.metadata.channel === "API View");
	const apiMentionRate = apiRows.length ? apiRows.filter((item) => item.metadata.mention === "true").length / apiRows.length : 0;
	const findings = [];
	if (apiRows.length > 0 && apiMentionRate < .5) findings.push({
		id: stableId("finding", `${manifest.id}:ai-api-mention`),
		tenantId,
		manifestId: manifest.id,
		category: "AI_VISIBILITY",
		statement: `API View mentioned the brand in ${Math.round(apiMentionRate * 100)}% of selected responses.`,
		evidenceIds: apiRows.slice(0, 5).map((item) => item.id),
		confidence: apiRows.length >= 30 ? "HIGH" : "MEDIUM",
		confidenceScore: Math.min(1, apiRows.length / 30),
		severity: apiMentionRate < .35 ? "HIGH" : "MEDIUM",
		unknown: false,
		ruleId: "AI-API-MENTION-RATE"
	});
	const owned = selected.filter((item) => item.metadata.owned_citation === "true");
	if (mentionRows.length > 0 && owned.length / mentionRows.length < .7) findings.push({
		id: stableId("finding", `${manifest.id}:owned-citation`),
		tenantId,
		manifestId: manifest.id,
		category: "AI_CITATIONS",
		statement: "Mentioned responses do not consistently contain an owned-domain citation.",
		evidenceIds: selected.filter((item) => item.metadata.mention === "true").slice(0, 5).map((item) => item.id),
		confidence: "MEDIUM",
		confidenceScore: Math.min(1, selected.length / 100),
		severity: "MEDIUM",
		unknown: false,
		ruleId: "AI-OWNED-CITATION-COVERAGE"
	});
	const recommendations = findings.map((finding) => {
		const action = finding.ruleId === "AI-API-MENTION-RATE" ? "Create or improve crawlable authoritative pages that answer the approved discovery questions." : "Strengthen owned-domain pages and internal linking for topics where the brand is mentioned.";
		const blocked = containsForbiddenClaim(action);
		return {
			id: stableId("recommendation", finding.id),
			tenantId,
			findingId: finding.id,
			manifestId: manifest.id,
			title: finding.category === "AI_VISIBILITY" ? "Improve API View discoverability" : "Improve owned citation coverage",
			action,
			rationale: finding.statement,
			evidenceIds: finding.evidenceIds,
			priority: finding.severity === "HIGH" ? "NOW" : "NEXT",
			effort: "M",
			confidence: finding.confidence,
			blocked,
			...blocked ? { blockReason: "FORBIDDEN_CLAIM" } : {}
		};
	});
	const tasks = recommendations.filter((item) => !item.blocked).map((item) => ({
		id: stableId("task", item.id),
		recommendationId: item.id,
		title: item.title,
		horizon: "0_30_DAYS",
		owner: "Client marketing/website owner",
		steps: [item.action, "Review the linked evidence before publishing changes."],
		evidenceIds: item.evidenceIds,
		verificationPlan: ["Run the same approved scenarios in a future measurement cycle.", "Compare mention and owned-citation rates using a new immutable snapshot."]
	}));
	return actionPlanSchema.parse({
		tenantId,
		manifestId: manifest.id,
		findings,
		recommendations,
		tasks
	});
}
function validateGrounding(plan, evidence) {
	const tenantEvidence = evidence.filter((item) => item.tenantId === plan.tenantId);
	const ids = new Set(tenantEvidence.map((item) => item.id));
	const manifest = new Set(plan.findings.flatMap((finding) => finding.evidenceIds));
	const grounded = (item) => item.evidenceIds.length === 0 ? [`${item.id}:NO_EVIDENCE`] : [...item.evidenceIds.filter((id) => !ids.has(id)).map((id) => `${item.id}:UNKNOWN_EVIDENCE:${id}`), ...item.evidenceIds.filter((id) => !manifest.has(id)).map((id) => `${item.id}:EVIDENCE_NOT_IN_FINDING_MANIFEST:${id}`)];
	const errors = [
		...plan.findings.flatMap((finding) => finding.evidenceIds.length === 0 ? [`${finding.id}:NO_EVIDENCE`] : finding.evidenceIds.filter((id) => !ids.has(id)).map((id) => `${finding.id}:UNKNOWN_EVIDENCE:${id}`)),
		...plan.recommendations.flatMap(grounded),
		...plan.tasks.flatMap(grounded)
	];
	if (evidence.some((item) => item.tenantId !== plan.tenantId)) errors.push("TENANT_ISOLATION_BLOCKED");
	return errors;
}
//#endregion
export { buildManifest as n, validateGrounding as r, buildActionPlan as t };

//# sourceMappingURL=recommendation-engine-E4GDgmMi.mjs.map