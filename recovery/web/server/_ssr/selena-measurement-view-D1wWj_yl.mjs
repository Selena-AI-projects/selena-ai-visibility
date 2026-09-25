import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { d as and, f as eq, u as desc } from "../_libs/drizzle-orm.mjs";
import { Z as svOrders, ht as svScenarios, nt as svPromptFamilies, w as svCycles } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { r as createSelenaRepositories } from "./selena-visibility-repositories-DjKDsg4F.mjs";
import { r as scenarioKindsFrom } from "./selena-measurement-view-Z1DAtP8m.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-measurement-view-D1wWj_yl.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ab3dbe6f-4a29-445f-9b99-01614b2e66af", e._sentryDebugIdIdentifier = "sentry-dbid-ab3dbe6f-4a29-445f-9b99-01614b2e66af");
	} catch (e) {}
})();
var BRAND = "BRAND";
var COMPETITOR = "COMPETITOR";
function citationCount(value) {
	return Array.isArray(value) ? value.length : 0;
}
function isVisitorChannel(channel) {
	return channel.toLowerCase().startsWith("visitor");
}
function isApiChannel(channel) {
	return channel.toLowerCase().startsWith("api");
}
function ratio(numerator, denominator) {
	return denominator === 0 ? null : numerator / denominator;
}
/**
* Brand mentions indexed by run. One entity is not supposed to hold two
* positions in one run (addendum §5.3); if a duplicate does arrive the run
* still counts once and keeps the earliest position, so a repeated row can
* neither inflate coverage nor move the average.
*/
function brandMentionsByRun(mentions, runIds) {
	const byRun = /* @__PURE__ */ new Map();
	for (const mention of mentions) {
		if (mention.entityType !== BRAND || !runIds.has(mention.runId)) continue;
		const existing = byRun.get(mention.runId);
		if (existing === void 0) {
			byRun.set(mention.runId, mention.ordinalPosition);
			continue;
		}
		if (mention.ordinalPosition !== null && (existing === null || mention.ordinalPosition < existing)) byRun.set(mention.runId, mention.ordinalPosition);
	}
	return byRun;
}
/** Competitor appearances counted once per run, for the same reason. */
function competitorMentionCounts(mentions, runIds) {
	const seen = /* @__PURE__ */ new Set();
	const counts = /* @__PURE__ */ new Map();
	for (const mention of mentions) {
		if (mention.entityType !== COMPETITOR || !runIds.has(mention.runId)) continue;
		const key = `${mention.runId} ${mention.name}`;
		if (seen.has(key)) continue;
		seen.add(key);
		counts.set(mention.name, (counts.get(mention.name) ?? 0) + 1);
	}
	return counts;
}
function computeLedgerMetrics(rows, mentions) {
	const terminal = rows.filter((row) => row.validity !== null);
	const valid = terminal.filter((row) => row.validity === "VALID");
	const measured = valid.filter((row) => row.extractorVersion !== null);
	const measuredRunIds = new Set(measured.map((row) => row.runId));
	const brandPositions = brandMentionsByRun(mentions, measuredRunIds);
	const mentioned = measured.filter((row) => brandPositions.has(row.runId));
	const groups = /* @__PURE__ */ new Map();
	for (const row of measured) {
		const key = `${row.scenarioId} ${row.system ?? row.channel}`;
		const group = groups.get(key) ?? {
			total: 0,
			mentioned: 0
		};
		group.total += 1;
		if (brandPositions.has(row.runId)) group.mentioned += 1;
		groups.set(key, group);
	}
	const stableGroups = [...groups.values()].filter((group) => group.mentioned === group.total).length;
	const positions = mentioned.map((row) => brandPositions.get(row.runId) ?? null).filter((position) => position !== null);
	const competitorMentions = competitorMentionCounts(mentions, measuredRunIds);
	const totalCompetitorMentions = [...competitorMentions.values()].reduce((sum, count) => sum + count, 0);
	const voiceDenominator = mentioned.length + totalCompetitorMentions;
	const visitorMeasured = measured.filter((row) => isVisitorChannel(row.channel));
	const apiMeasured = measured.filter((row) => isApiChannel(row.channel));
	const visitorMentionRate = ratio(visitorMeasured.filter((row) => brandPositions.has(row.runId)).length, visitorMeasured.length);
	const apiMentionRate = ratio(apiMeasured.filter((row) => brandPositions.has(row.runId)).length, apiMeasured.length);
	const captureModes = {};
	for (const row of measured) {
		const mode = row.captureMode ?? "unknown";
		captureModes[mode] = (captureModes[mode] ?? 0) + 1;
	}
	return {
		totalRuns: terminal.length,
		validRuns: valid.length,
		unmeasuredRuns: valid.length - measured.length,
		invalidRate: ratio(terminal.length - valid.length, terminal.length),
		mentionCoverage: ratio(mentioned.length, measured.length),
		stableMentionRate: ratio(stableGroups, groups.size),
		ownedCitationRate: ratio(measured.filter((row) => row.ownedCitation === true).length, measured.length),
		citationCoverage: ratio(measured.filter((row) => citationCount(row.citations) > 0).length, measured.length),
		averageBrandPosition: positions.length === 0 ? null : positions.reduce((sum, position) => sum + position, 0) / positions.length,
		relativeMentionShare: {
			brand: ratio(mentioned.length, voiceDenominator),
			competitors: [...competitorMentions.entries()].map(([name, count]) => ({
				name,
				mentions: count,
				share: count / voiceDenominator
			})).sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name))
		},
		visitorApiDivergence: {
			visitorMentionRate,
			apiMentionRate,
			divergence: visitorMentionRate === null || apiMentionRate === null ? null : visitorMentionRate - apiMentionRate
		},
		captureModes
	};
}
function groupFor(rows, mentions) {
	if (rows.filter((row) => row.validity === "VALID" && row.extractorVersion !== null).length === 0) return {
		status: "UNKNOWN",
		reason: "NO_MEASURED_RUNS",
		runs: rows.length
	};
	return {
		status: "MEASURED",
		metrics: computeLedgerMetrics(rows, mentions)
	};
}
function computeLedgerReport(rows, mentions, scenarioKinds) {
	const branded = [];
	const nonBranded = [];
	let unclassified = 0;
	for (const row of rows) {
		const kind = scenarioKinds.get(row.scenarioId);
		if (kind === "branded") branded.push(row);
		else if (kind === "discovery") nonBranded.push(row);
		else unclassified += 1;
	}
	return {
		branded: groupFor(branded, mentions),
		nonBranded: groupFor(nonBranded, mentions),
		mixed: {
			mixed: true,
			group: groupFor([...branded, ...nonBranded], mentions)
		},
		unclassifiedRuns: unclassified
	};
}
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
var getSelenaMeasurementFn_createServerFn_handler = createServerRpc({
	id: "db205754e7e78c00aadda3facc0efd2dd76f95da17da1d519c3d24cd58d9c0d5",
	name: "getSelenaMeasurementFn",
	filename: "src/server/selena-measurement-view.ts"
}, (opts) => getSelenaMeasurementFn.__executeServer(opts));
var getSelenaMeasurementFn = createServerFn({ method: "GET" }).validator(object({ projectId: string().uuid() })).handler(getSelenaMeasurementFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	if (!await repositories.projects.get(context, data.projectId)) throw new Error("Not found: project is outside AuthContext tenant");
	const cycles = await withOrganizationTransaction(db, context.tenantId, (tx) => tx.select({
		id: svCycles.id,
		status: svCycles.status,
		expectedRuns: svCycles.expectedRuns,
		completedRuns: svCycles.completedRuns,
		createdAt: svCycles.createdAt
	}).from(svCycles).innerJoin(svOrders, eq(svCycles.orderId, svOrders.id)).where(and(eq(svOrders.projectId, data.projectId), eq(svCycles.organizationId, context.tenantId))).orderBy(desc(svCycles.createdAt)).limit(12));
	if (cycles.length === 0) return {
		cycles: [],
		latest: null
	};
	const [scenarioRows, ledger] = await Promise.all([withOrganizationTransaction(db, context.tenantId, (tx) => tx.select({
		id: svScenarios.id,
		intentType: svPromptFamilies.intentType
	}).from(svScenarios).innerJoin(svPromptFamilies, eq(svScenarios.familyId, svPromptFamilies.id)).where(and(eq(svPromptFamilies.projectId, data.projectId), eq(svScenarios.organizationId, context.tenantId)))), repositories.runs.ledgerForCycle(context, cycles[0].id)]);
	return {
		cycles: cycles.map((cycle) => ({
			id: cycle.id,
			status: cycle.status,
			expectedRuns: cycle.expectedRuns,
			completedRuns: cycle.completedRuns,
			createdAt: cycle.createdAt.toISOString()
		})),
		latest: {
			cycleId: cycles[0].id,
			report: computeLedgerReport(ledger.rows, ledger.mentions, scenarioKindsFrom(scenarioRows))
		}
	};
});
//#endregion
export { getSelenaMeasurementFn_createServerFn_handler };

//# sourceMappingURL=selena-measurement-view-D1wWj_yl.mjs.map