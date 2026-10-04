import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svConfigurationLocks, svRecommendationRuns, svScenarios, svWebsiteSnapshots } from "@workspace/lib/db/schema";
import { buildCycleGraderReport } from "@workspace/lib/selena-cycle-report";
import { parseLockedAnalysisSubjects } from "@workspace/lib/selena-extraction-context";
import type { GraderReport } from "@workspace/lib/selena-grader-report";
import { createRecommendationFollowupRepository } from "@workspace/lib/selena-recommendation-followups-store";
import type { ReportCycleUpdate } from "@workspace/lib/selena-report-cycle";
import { createSelenaRepositories } from "@workspace/lib/selena-visibility-repositories";
import { WEBSITE_SIGNAL_RULES } from "@workspace/lib/website-collector";
import { actionPlanSchema, monthlyAnswerAllowance, resolvePlanId } from "@workspace/selena-visibility-contracts";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";
import { readMonthlyAnswerUsage } from "./selena-monthly-allowance";
import {
	type RecommendationFollowupView,
	serializeRecommendationFollowup,
} from "./selena-recommendation-followups-view";
import { loadReportAnchor } from "./selena-report-cycle-query";

const repositories = /* @__PURE__ */ createSelenaRepositories(db);
const followups = /* @__PURE__ */ createRecommendationFollowupRepository(db);

// Distributes over the union so each update state keeps its own fields once
// the date is a string on the wire.
type SerializedUpdate<T> = T extends { createdAt: Date } ? Omit<T, "createdAt"> & { createdAt: string } : never;

export type GraderReportView = {
	project: { id: string; name: string; region: string | null; country: string | null };
	inputs: {
		brandName: string;
		primaryDomain: string;
		publicProfiles: string[];
		competitorsConfigured: number;
	} | null;
	planId: string | null;
	/** When the READY cycle the report speaks for was created. */
	measuredAt: string | null;
	/**
	 * The calendar month against the plan's quoted allowance: answers with a
	 * usable result as used, answers promised to running or waiting
	 * measurements as reserved. Failed attempts cost the client nothing.
	 */
	monthUsage: { used: number; reserved: number; allowance: number } | null;
	/** The READY cycle behind the report; null until an operator has signed one off. */
	cycle: { cycleId: string; status: string; expectedRuns: number; completedRuns: number; succeededRuns: number } | null;
	/** What the client has recorded against this cycle's recommendations, by recommendation key. */
	followups: RecommendationFollowupView[];
	/**
	 * A cycle newer than the report (or the only cycle, when nothing is READY
	 * yet), as a status the client is told about rather than a report they see.
	 */
	update: SerializedUpdate<ReportCycleUpdate> | null;
	report: GraderReport | null;
	/** The free website audit: every rule with its outcome, plus the plan. */
	freeAudit: {
		websiteUrl: string;
		capturedAt: string;
		checks: { subject: string; ruleId: string; severity: "HIGH" | "MEDIUM" | "LOW"; ok: boolean; unknown: boolean }[];
		actions: { ruleId: string; title: string; action: string; priority: string }[];
	} | null;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * The whole customer-facing report in one read. The client's own session is
 * enough — everything here is their own project's evidence, and tenant
 * scoping is the guard on every query.
 */
export const getSelenaGraderReportFn = createServerFn({ method: "GET" })
	.validator(z.object({ projectId: z.string().uuid() }))
	.handler(async ({ data }): Promise<GraderReportView> => {
		const context = await resolveSessionAuthContext();
		const project = await repositories.projects.get(context, data.projectId);
		if (!project) throw new Error("Not found: project is outside AuthContext tenant");

		const profile = await repositories.profiles.get(context, data.projectId);
		const inputs = profile
			? {
					brandName: profile.brandName,
					primaryDomain: profile.primaryDomain,
					publicProfiles: (Array.isArray(profile.publicProfiles) ? profile.publicProfiles : [])
						.map((entry) => readString((entry as Record<string, unknown>)?.url))
						.filter((url): url is string => url !== null),
					competitorsConfigured: Array.isArray(profile.competitorSnapshot) ? profile.competitorSnapshot.length : 0,
				}
			: null;

		const [websiteSnapshot, recommendationRun] = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			Promise.all([
				tx
					.select({ website: svWebsiteSnapshots.website, capturedAt: svWebsiteSnapshots.capturedAt })
					.from(svWebsiteSnapshots)
					.where(
						and(
							eq(svWebsiteSnapshots.projectId, data.projectId),
							eq(svWebsiteSnapshots.organizationId, context.tenantId),
						),
					)
					.orderBy(desc(svWebsiteSnapshots.capturedAt))
					.limit(1)
					.then((rows) => rows[0] ?? null),
				tx
					.select({ actionPlan: svRecommendationRuns.actionPlan })
					.from(svRecommendationRuns)
					.where(
						and(
							eq(svRecommendationRuns.projectId, data.projectId),
							eq(svRecommendationRuns.organizationId, context.tenantId),
						),
					)
					.orderBy(desc(svRecommendationRuns.createdAt))
					.limit(1)
					.then((rows) => rows[0] ?? null),
			]),
		);
		const parsedPlan = actionPlanSchema.safeParse(recommendationRun?.actionPlan);
		const priorityRank: Record<string, number> = { NOW: 0, NEXT: 1, LATER: 2 };
		const ruleByFinding = new Map(parsedPlan.success ? parsedPlan.data.findings.map((f) => [f.id, f.ruleId]) : []);
		const baseRuleIds = new Set(WEBSITE_SIGNAL_RULES.map(([, ruleId]) => ruleId));
		const freeAudit =
			websiteSnapshot && parsedPlan.success
				? {
						websiteUrl: websiteSnapshot.website,
						capturedAt: websiteSnapshot.capturedAt.toISOString(),
						checks: [
							...WEBSITE_SIGNAL_RULES.map(([subject, ruleId, , severity]) => {
								const finding = parsedPlan.data.findings.find((item) => item.ruleId === ruleId);
								return { subject, ruleId, severity, ok: !finding, unknown: finding?.unknown ?? false };
							}),
							// Rules beyond the base table (Maps linkage, AI-crawler access…)
							// only surface as findings when they fail; a passing one leaves
							// no record, so it is not shown rather than claimed as ✓.
							...parsedPlan.data.findings
								.filter((finding) => !baseRuleIds.has(finding.ruleId))
								.map((finding) => ({
									subject: finding.ruleId,
									ruleId: finding.ruleId,
									severity: (finding.severity === "CRITICAL" ? "HIGH" : finding.severity) as "HIGH" | "MEDIUM" | "LOW",
									ok: false,
									unknown: finding.unknown,
								})),
						],
						// The whole plan, most urgent first — a capped list read as "that
						// is everything" when it was not.
						actions: parsedPlan.data.recommendations
							.filter((item) => !item.blocked)
							.sort((left, right) => (priorityRank[left.priority] ?? 9) - (priorityRank[right.priority] ?? 9))
							.map((item) => ({
								ruleId: ruleByFinding.get(item.findingId) ?? "",
								title: item.title,
								action: item.action,
								priority: item.priority,
							})),
					}
				: null;

		const view: GraderReportView = {
			project: {
				id: project.id,
				name: project.name,
				region: readString((project as Record<string, unknown>).region),
				country: readString((project as Record<string, unknown>).country),
			},
			inputs,
			planId: null,
			measuredAt: null,
			monthUsage: null,
			cycle: null,
			followups: [],
			update: null,
			report: null,
			freeAudit,
		};

		const anchor = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			loadReportAnchor(tx, { projectId: data.projectId, tenantId: context.tenantId }),
		);
		if (!anchor) return view;
		if (anchor.update) view.update = { ...anchor.update, createdAt: anchor.update.createdAt.toISOString() };

		const [lock] = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			tx
				.select({ snapshot: svConfigurationLocks.snapshot })
				.from(svConfigurationLocks)
				.where(
					and(eq(svConfigurationLocks.id, anchor.lockId), eq(svConfigurationLocks.organizationId, context.tenantId)),
				)
				.limit(1),
		);
		const snapshot = (lock?.snapshot ?? null) as Record<string, unknown> | null;
		const subjects = parseLockedAnalysisSubjects(lock?.snapshot);
		const storedPlanId = readString(snapshot?.planId);
		const resolvedPlanId = storedPlanId ? resolvePlanId(storedPlanId) : null;
		view.planId = resolvedPlanId ?? storedPlanId;
		const planForAllowance = resolvedPlanId ? monthlyAnswerAllowance(resolvedPlanId) : null;
		if (planForAllowance !== null) {
			const usage = await withOrganizationTransaction(db, context.tenantId, (tx) =>
				readMonthlyAnswerUsage(tx, { tenantId: context.tenantId, projectId: data.projectId }),
			);
			view.monthUsage = { ...usage, allowance: planForAllowance };
		}

		// Without a READY cycle there is no report: a page built from an
		// unfinished or rejected cycle's runs would print its gaps as findings.
		const cycle = anchor.cycle;
		if (!cycle) return view;
		view.cycle = {
			cycleId: cycle.id,
			status: cycle.status,
			expectedRuns: cycle.expectedRuns,
			completedRuns: cycle.completedRuns,
			succeededRuns: cycle.succeededRuns,
		};
		view.measuredAt = cycle.createdAt.toISOString();
		view.followups = (await followups.list(context, { projectId: data.projectId, cycleId: cycle.id })).map(
			serializeRecommendationFollowup,
		);
		if (!subjects) return view;

		const allRuns = await repositories.runs.listForOrder(context, anchor.orderId);
		// The report speaks for one cycle: mixing runs from an order's earlier
		// cycles would double-count questions and misstate the counts.
		const runs = allRuns.filter((run) => run.cycleId === cycle.id);

		const scenarioIds = [...new Set(runs.map((run) => run.scenarioId))];
		const scenarioRows =
			scenarioIds.length === 0
				? []
				: await withOrganizationTransaction(db, context.tenantId, (tx) =>
						tx
							.select({ id: svScenarios.id, text: svScenarios.text, language: svScenarios.language })
							.from(svScenarios)
							.where(and(inArray(svScenarios.id, scenarioIds), eq(svScenarios.organizationId, context.tenantId))),
					);
		view.report = buildCycleGraderReport({ lockSnapshot: lock?.snapshot, runs, scenarios: scenarioRows });
		return view;
	});
