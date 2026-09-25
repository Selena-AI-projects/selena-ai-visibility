import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { Dt as planIds, _t as monthlyAnswerAllowance, c as actionPlanSchema, gt as measurementScopeSchema } from "./src-BdeAuGX5.mjs";
import { C as notInArray, L as sql, d as and, f as eq, g as inArray, m as gte, u as desc } from "../_libs/drizzle-orm.mjs";
import { Et as svWebsiteSnapshots, S as svConfigurationLocks, Z as svOrders, ht as svScenarios, lt as svRecommendationRuns, w as svCycles } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { o as parseLockedAnalysisSubjects, r as createSelenaRepositories } from "./selena-visibility-repositories-DjKDsg4F.mjs";
import { t as WEBSITE_SIGNAL_RULES } from "./website-collector-JRCKbLvO.mjs";
import { n as readRetainedAnswer, r as readStoredAnalysis } from "./selena-order-analysis-CU_0Zk_i.mjs";
import { i as summarizeScenarioSet, n as hasStandaloneMention, r as normalizeDomain, t as analyzeAnswer } from "./selena-answer-analysis-BVDxCAaG.mjs";
import { n as MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES, t as MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES } from "./selena-monthly-allowance-D_oHYZLf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-grader-report-wIeEZdgj.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "bcd35536-c894-4504-9d74-d457a60fddba", e._sentryDebugIdIdentifier = "sentry-dbid-bcd35536-c894-4504-9d74-d457a60fddba");
	} catch (e) {}
})();
/**
* A question is "branded" when it names the business — the definition the
* report states to the customer, so it is decided from the question text, not
* from how the scenario was produced.
*/
function isBrandedQuestion(text, brand) {
	return [brand.name, ...brand.aliases ?? []].some((needle) => {
		const trimmed = needle.trim();
		return trimmed.length >= 2 && hasStandaloneMention(text, trimmed);
	});
}
function mean(values) {
	let total = 0;
	for (const value of values) total += value;
	return total / values.length;
}
function compareSystemIdentity(left, right) {
	return left.channel === right.channel ? left.systemId.localeCompare(right.systemId) : left.channel === "VISITOR" ? -1 : 1;
}
var MAX_GAP_COMPETITORS = 3;
var MAX_GAP_DOMAINS = 3;
var MAX_SOURCE_RECOMMENDATIONS = 3;
var MAX_EXAMPLE_QUESTIONS = 2;
function buildGraderReport(input) {
	const { runs, subjects } = input;
	const brandDomain = subjects.brand.domain;
	const withQuestion = (run) => run.scenarioText.trim() !== "";
	const questionsById = /* @__PURE__ */ new Map();
	for (const run of runs) if (withQuestion(run) && !questionsById.has(run.scenarioId)) questionsById.set(run.scenarioId, {
		scenarioId: run.scenarioId,
		text: run.scenarioText,
		language: run.scenarioLanguage,
		branded: isBrandedQuestion(run.scenarioText, subjects.brand),
		systems: []
	});
	const questions = [...questionsById.values()];
	const brandedIds = new Set(questions.filter((q) => q.branded).map((q) => q.scenarioId));
	const questionSystemRuns = /* @__PURE__ */ new Map();
	for (const run of runs) {
		if (!withQuestion(run)) continue;
		const key = `${run.scenarioId}:${run.channel}:${run.systemId}`;
		const bucket = questionSystemRuns.get(key) ?? [];
		bucket.push(run);
		questionSystemRuns.set(key, bucket);
	}
	for (const question of questions) question.systems = [...questionSystemRuns.values()].filter((systemRuns) => systemRuns[0]?.scenarioId === question.scenarioId).map((systemRuns) => {
		const analyzed = systemRuns.filter((run) => run.analysis !== null);
		return {
			systemId: systemRuns[0].systemId,
			channel: systemRuns[0].channel,
			answersExpected: systemRuns.length,
			answersAnalyzed: analyzed.length,
			brandMentioned: analyzed.filter((run) => run.analysis.brandMentioned).length,
			captureModes: [...new Set(systemRuns.map((run) => run.captureMode).filter((mode) => Boolean(mode)))],
			runs: systemRuns.map((run) => ({
				runId: run.runId,
				brandMentioned: run.analysis === null ? null : run.analysis.brandMentioned
			}))
		};
	}).sort(compareSystemIdentity);
	const systemsById = /* @__PURE__ */ new Map();
	for (const run of runs) {
		const key = `${run.channel}:${run.systemId}`;
		const bucket = systemsById.get(key) ?? [];
		bucket.push(run);
		systemsById.set(key, bucket);
	}
	const systems = [...systemsById.values()].map((systemRuns) => {
		const analyzed = systemRuns.filter((run) => run.analysis !== null);
		const analyses = analyzed.map((run) => run.analysis);
		const summary = summarizeScenarioSet(analyses, { brandDomain });
		const group = (branded) => {
			const inGroup = analyzed.filter((run) => withQuestion(run) && brandedIds.has(run.scenarioId) === branded);
			return {
				answers: inGroup.length,
				mentioned: inGroup.filter((run) => run.analysis.brandMentioned).length
			};
		};
		return {
			systemId: systemRuns[0].systemId,
			channel: systemRuns[0].channel,
			answersExpected: systemRuns.length,
			answersAnalyzed: analyzed.length,
			brandMentioned: analyses.filter((analysis) => analysis.brandMentioned).length,
			branded: group(true),
			category: group(false),
			shareOfVoice: summary.brandShareOfVoice,
			averageOrder: summary.brandAverageOrder,
			captureModes: [...new Set(systemRuns.map((run) => run.captureMode).filter((mode) => Boolean(mode)))]
		};
	}).sort((left, right) => compareSystemIdentity(left, right));
	const allAnalyses = runs.filter((run) => run.analysis !== null).map((run) => run.analysis);
	const overall = summarizeScenarioSet(allAnalyses, { brandDomain });
	const orders = /* @__PURE__ */ new Map();
	for (const analysis of allAnalyses) for (const mention of analysis.mentions) {
		const key = mention.role === "TARGET" ? subjects.brand.name : mention.name;
		const bucket = orders.get(key) ?? [];
		bucket.push(mention.order);
		orders.set(key, bucket);
	}
	const rosterFor = (subject, isBrand) => {
		const positions = orders.get(subject.name) ?? [];
		return {
			name: subject.name,
			isBrand,
			answersMentioned: positions.length,
			averageOrder: positions.length === 0 ? null : mean(positions)
		};
	};
	const roster = [rosterFor(subjects.brand, true), ...subjects.competitors.map((competitor) => rosterFor(competitor, false)).sort((left, right) => right.answersMentioned - left.answersMentioned || (left.averageOrder ?? Number.POSITIVE_INFINITY) - (right.averageOrder ?? Number.POSITIVE_INFINITY) || left.name.localeCompare(right.name))];
	const gaps = runs.filter((run) => {
		const analysis = run.analysis;
		return analysis !== null && !analysis.brandMentioned && analysis.mentions.some((mention) => mention.role === "COMPETITOR");
	}).map((run) => {
		const analysis = run.analysis;
		return {
			runId: run.runId,
			systemId: run.systemId,
			channel: run.channel,
			scenarioText: run.scenarioText,
			scenarioLanguage: run.scenarioLanguage,
			competitorsShown: [...new Set(analysis.mentions.filter((mention) => mention.role === "COMPETITOR").sort((left, right) => left.order - right.order).map((mention) => mention.name))].slice(0, MAX_GAP_COMPETITORS),
			citedDomains: analysis.citedDomains.slice(0, MAX_GAP_DOMAINS)
		};
	});
	const recommendations = [];
	const brandHost = brandDomain ? normalizeDomain(brandDomain) : null;
	const ownedDomain = (domain) => brandHost !== null && (domain === brandHost || domain.endsWith(`.${brandHost}`));
	const externalGaps = overall.citationGap.filter((entry) => !entry.ownedByBrand && !ownedDomain(entry.domain) && entry.timesCitedWithoutBrand > 0);
	for (const entry of externalGaps.slice(0, MAX_SOURCE_RECOMMENDATIONS)) recommendations.push({
		kind: "SOURCE_PRESENCE",
		domain: entry.domain,
		timesCited: entry.timesCited,
		timesCitedWithoutBrand: entry.timesCitedWithoutBrand
	});
	const categoryAnswers = runs.filter((run) => run.analysis !== null && withQuestion(run) && !brandedIds.has(run.scenarioId));
	const categoryMissed = categoryAnswers.filter((run) => !run.analysis.brandMentioned);
	if (categoryMissed.length > 0) recommendations.push({
		kind: "CATEGORY_CONTENT",
		missedAnswers: categoryMissed.length,
		categoryAnswers: categoryAnswers.length,
		exampleQuestions: [...new Set(categoryMissed.map((run) => run.scenarioText))].slice(0, MAX_EXAMPLE_QUESTIONS)
	});
	const ownEntry = overall.citationGap.find((entry) => entry.ownedByBrand);
	const topExternal = overall.citationGap.filter((entry) => !entry.ownedByBrand && !ownedDomain(entry.domain)).reduce((best, entry) => best === null || entry.timesCited > best.timesCited ? entry : best, null);
	if (brandDomain && topExternal && (ownEntry?.timesCited ?? 0) < topExternal.timesCited) recommendations.push({
		kind: "OWN_SITE_UNDERCITED",
		domain: brandDomain,
		timesCited: ownEntry?.timesCited ?? 0,
		topExternalDomain: topExternal.domain,
		topExternalCited: topExternal.timesCited
	});
	return {
		methodology: {
			questions: questions.length,
			visitorSystems: systems.filter((system) => system.channel === "VISITOR").length,
			apiSystems: systems.filter((system) => system.channel === "API").length,
			repeats: input.repeats ?? null,
			answersExpected: runs.length,
			answersAnalyzed: allAnalyses.length,
			answersMissing: runs.length - allAnalyses.length
		},
		systems,
		overall,
		roster,
		gaps,
		recommendations,
		questions
	};
}
function selectReportAnchor(latestCycle, latestOrder) {
	if (latestCycle) return latestCycle;
	return latestOrder ? {
		orderId: latestOrder.id,
		lockId: latestOrder.lockId,
		cycle: null
	} : null;
}
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
function readString(value) {
	return typeof value === "string" && value.trim() !== "" ? value : null;
}
/**
* The whole customer-facing report in one read. The client's own session is
* enough — everything here is their own project's evidence, and tenant
* scoping is the guard on every query.
*/
var getSelenaGraderReportFn_createServerFn_handler = createServerRpc({
	id: "34d74785c70e442c12ee13af46dec1deee349f29937ff87c4e8f1f82c6240ca2",
	name: "getSelenaGraderReportFn",
	filename: "src/server/selena-grader-report.ts"
}, (opts) => getSelenaGraderReportFn.__executeServer(opts));
var getSelenaGraderReportFn = createServerFn({ method: "GET" }).validator(object({ projectId: string().uuid() })).handler(getSelenaGraderReportFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	const project = await repositories.projects.get(context, data.projectId);
	if (!project) throw new Error("Not found: project is outside AuthContext tenant");
	const profile = await repositories.profiles.get(context, data.projectId);
	const inputs = profile ? {
		brandName: profile.brandName,
		primaryDomain: profile.primaryDomain,
		publicProfiles: (Array.isArray(profile.publicProfiles) ? profile.publicProfiles : []).map((entry) => readString(entry?.url)).filter((url) => url !== null),
		competitorsConfigured: Array.isArray(profile.competitorSnapshot) ? profile.competitorSnapshot.length : 0
	} : null;
	const [websiteSnapshot, recommendationRun] = await withOrganizationTransaction(db, context.tenantId, (tx) => Promise.all([tx.select({
		website: svWebsiteSnapshots.website,
		capturedAt: svWebsiteSnapshots.capturedAt
	}).from(svWebsiteSnapshots).where(and(eq(svWebsiteSnapshots.projectId, data.projectId), eq(svWebsiteSnapshots.organizationId, context.tenantId))).orderBy(desc(svWebsiteSnapshots.capturedAt)).limit(1).then((rows) => rows[0] ?? null), tx.select({ actionPlan: svRecommendationRuns.actionPlan }).from(svRecommendationRuns).where(and(eq(svRecommendationRuns.projectId, data.projectId), eq(svRecommendationRuns.organizationId, context.tenantId))).orderBy(desc(svRecommendationRuns.createdAt)).limit(1).then((rows) => rows[0] ?? null)]));
	const parsedPlan = actionPlanSchema.safeParse(recommendationRun?.actionPlan);
	const priorityRank = {
		NOW: 0,
		NEXT: 1,
		LATER: 2
	};
	const ruleByFinding = new Map(parsedPlan.success ? parsedPlan.data.findings.map((f) => [f.id, f.ruleId]) : []);
	const baseRuleIds = new Set(WEBSITE_SIGNAL_RULES.map(([, ruleId]) => ruleId));
	const freeAudit = websiteSnapshot && parsedPlan.success ? {
		websiteUrl: websiteSnapshot.website,
		capturedAt: websiteSnapshot.capturedAt.toISOString(),
		checks: [...WEBSITE_SIGNAL_RULES.map(([subject, ruleId, , severity]) => {
			const finding = parsedPlan.data.findings.find((item) => item.ruleId === ruleId);
			return {
				subject,
				ruleId,
				severity,
				ok: !finding,
				unknown: finding?.unknown ?? false
			};
		}), ...parsedPlan.data.findings.filter((finding) => !baseRuleIds.has(finding.ruleId)).map((finding) => ({
			subject: finding.ruleId,
			ruleId: finding.ruleId,
			severity: finding.severity === "CRITICAL" ? "HIGH" : finding.severity,
			ok: false,
			unknown: finding.unknown
		}))],
		actions: parsedPlan.data.recommendations.filter((item) => !item.blocked).sort((left, right) => (priorityRank[left.priority] ?? 9) - (priorityRank[right.priority] ?? 9)).map((item) => ({
			ruleId: ruleByFinding.get(item.findingId) ?? "",
			title: item.title,
			action: item.action,
			priority: item.priority
		}))
	} : null;
	const view = {
		project: {
			id: project.id,
			name: project.name,
			region: readString(project.region),
			country: readString(project.country)
		},
		inputs,
		planId: null,
		measuredAt: null,
		monthUsage: null,
		cycle: null,
		report: null,
		freeAudit
	};
	const [cycleRows, orderRows] = await withOrganizationTransaction(db, context.tenantId, (tx) => Promise.all([tx.select({
		id: svCycles.id,
		orderId: svCycles.orderId,
		lockId: svCycles.lockId,
		status: svCycles.status,
		expectedRuns: svCycles.expectedRuns,
		completedRuns: svCycles.completedRuns,
		createdAt: svCycles.createdAt
	}).from(svCycles).innerJoin(svOrders, eq(svCycles.orderId, svOrders.id)).where(and(eq(svOrders.projectId, data.projectId), eq(svOrders.organizationId, context.tenantId), eq(svCycles.organizationId, context.tenantId))).orderBy(desc(svCycles.createdAt)).limit(1), tx.select({
		id: svOrders.id,
		lockId: svOrders.lockId,
		createdAt: svOrders.createdAt
	}).from(svOrders).where(and(eq(svOrders.projectId, data.projectId), eq(svOrders.organizationId, context.tenantId))).orderBy(desc(svOrders.createdAt)).limit(1)]));
	const latestCycle = cycleRows[0];
	const anchor = selectReportAnchor(latestCycle ? {
		orderId: latestCycle.orderId,
		lockId: latestCycle.lockId,
		cycle: {
			id: latestCycle.id,
			status: latestCycle.status,
			expectedRuns: latestCycle.expectedRuns,
			completedRuns: latestCycle.completedRuns,
			createdAt: latestCycle.createdAt
		}
	} : null, orderRows[0] ?? null);
	if (!anchor) return view;
	const [lock] = await withOrganizationTransaction(db, context.tenantId, (tx) => tx.select({ snapshot: svConfigurationLocks.snapshot }).from(svConfigurationLocks).where(and(eq(svConfigurationLocks.id, anchor.lockId), eq(svConfigurationLocks.organizationId, context.tenantId))).limit(1));
	const snapshot = lock?.snapshot ?? null;
	const subjects = parseLockedAnalysisSubjects(lock?.snapshot);
	const scope = measurementScopeSchema.safeParse(snapshot?.measurementScope);
	view.planId = readString(snapshot?.planId);
	const planForAllowance = planIds.includes(view.planId ?? "") ? monthlyAnswerAllowance(view.planId) : null;
	if (planForAllowance !== null) {
		const monthStart = /* @__PURE__ */ new Date();
		monthStart.setUTCDate(1);
		monthStart.setUTCHours(0, 0, 0, 0);
		const [usage] = await withOrganizationTransaction(db, context.tenantId, (tx) => tx.select({ used: sql`coalesce(sum(${svCycles.expectedRuns}), 0)` }).from(svCycles).innerJoin(svOrders, eq(svCycles.orderId, svOrders.id)).where(and(eq(svOrders.projectId, data.projectId), eq(svOrders.organizationId, context.tenantId), gte(svCycles.createdAt, monthStart), notInArray(svOrders.status, [...MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES]), notInArray(svCycles.status, [...MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES]))));
		view.monthUsage = {
			used: Number(usage?.used ?? 0),
			allowance: planForAllowance
		};
	}
	const cycle = anchor.cycle;
	if (cycle) {
		view.cycle = {
			status: cycle.status,
			expectedRuns: cycle.expectedRuns,
			completedRuns: cycle.completedRuns
		};
		view.measuredAt = cycle.createdAt.toISOString();
	}
	if (!subjects) return view;
	const allRuns = await repositories.runs.listForOrder(context, anchor.orderId);
	const runs = cycle ? allRuns.filter((run) => run.cycleId === cycle.id) : [];
	const scenarioIds = [...new Set(runs.map((run) => run.scenarioId))];
	const scenarioRows = scenarioIds.length === 0 ? [] : await withOrganizationTransaction(db, context.tenantId, (tx) => tx.select({
		id: svScenarios.id,
		text: svScenarios.text,
		language: svScenarios.language
	}).from(svScenarios).where(and(inArray(svScenarios.id, scenarioIds), eq(svScenarios.organizationId, context.tenantId))));
	const scenarioById = new Map(scenarioRows.map((row) => [row.id, row]));
	const channelSystems = /* @__PURE__ */ new Map();
	if (scope.success) for (const system of scope.data.systems) {
		const bucket = channelSystems.get(system.channel) ?? [];
		bucket.push(system.systemId);
		channelSystems.set(system.channel, bucket);
	}
	view.report = buildGraderReport({
		runs: runs.map((run) => {
			const scenario = scenarioById.get(run.scenarioId);
			const channel = run.channel === "API" ? "API" : "VISITOR";
			const fallbackSystems = channelSystems.get(channel) ?? [];
			return {
				runId: run.id,
				systemId: run.systemId ?? (fallbackSystems.length === 1 ? fallbackSystems[0] : "unattributed"),
				channel,
				captureMode: run.captureMode ?? null,
				scenarioId: run.scenarioId,
				scenarioText: scenario?.text ?? "",
				scenarioLanguage: scenario?.language ?? "",
				analysis: readStoredAnalysis(run.canonicalPayload) ?? (() => {
					const retained = readRetainedAnswer(run.canonicalPayload);
					return retained ? analyzeAnswer({
						text: retained.text,
						brand: subjects.brand,
						competitors: subjects.competitors,
						citedUrls: retained.citedUrls
					}) : null;
				})()
			};
		}),
		subjects,
		repeats: scope.success ? scope.data.repeats : null
	});
	return view;
});
//#endregion
export { getSelenaGraderReportFn_createServerFn_handler };

//# sourceMappingURL=selena-grader-report-wIeEZdgj.mjs.map