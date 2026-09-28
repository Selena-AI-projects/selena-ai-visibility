import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { type OrganizationTransaction, withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import {
	svConfigurationLocks,
	svCycles,
	svOrders,
	svRecommendationRuns,
	svScenarios,
	svWebsiteSnapshots,
} from "@workspace/lib/db/schema";
import { buildCycleGraderReport } from "@workspace/lib/selena-cycle-report";
import { parseLockedAnalysisSubjects } from "@workspace/lib/selena-extraction-context";
import type { GraderReport } from "@workspace/lib/selena-grader-report";
import {
	REPORT_READY_CYCLE_STATUS,
	type ReportCycleCandidate,
	type ReportCycleUpdate,
	selectReportAnchor,
} from "@workspace/lib/selena-report-cycle";
import { createSelenaRepositories } from "@workspace/lib/selena-visibility-repositories";
import { WEBSITE_SIGNAL_RULES } from "@workspace/lib/website-collector";
import { actionPlanSchema, monthlyAnswerAllowance, resolvePlanId } from "@workspace/selena-visibility-contracts";
import { and, desc, eq, gte, inArray, notInArray, type SQL, sql } from "drizzle-orm";
import { z } from "zod";
import {
	MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES,
	MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES,
} from "@/lib/selena-monthly-allowance";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";

const repositories = /* @__PURE__ */ createSelenaRepositories(db);

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
	/** The calendar month's spent answers against the plan's quoted allowance. */
	monthUsage: { used: number; allowance: number } | null;
	/** The READY cycle behind the report; null until an operator has signed one off. */
	cycle: { status: string; expectedRuns: number; completedRuns: number } | null;
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

const reportCycleColumns = {
	id: svCycles.id,
	orderId: svCycles.orderId,
	lockId: svCycles.lockId,
	status: svCycles.status,
	expectedRuns: svCycles.expectedRuns,
	completedRuns: svCycles.completedRuns,
	createdAt: svCycles.createdAt,
	// A completed run may have FAILED or come back INVALID; the successful count
	// is what says whether the cycle measured anything at all. Both subqueries
	// are written out in full: column references inside a select-list template
	// are not table-qualified, and "cycle_id" = "id" would compare a run with
	// itself.
	succeededRuns: sql<number>`(
		select count(*)::int from sv_runs as succeeded_runs
		where succeeded_runs.cycle_id = sv_cycles.id
			and succeeded_runs.organization_id = sv_cycles.organization_id
			and succeeded_runs.status = 'SUCCEEDED'
	)`,
	// QC decides per order; a record may name the cycle or leave it implied.
	latestQcDecision: sql<string | null>`(
		select latest_qc.decision from sv_qc_records as latest_qc
		where latest_qc.order_id = sv_cycles.order_id
			and latest_qc.organization_id = sv_cycles.organization_id
			and (latest_qc.cycle_id is null or latest_qc.cycle_id = sv_cycles.id)
		order by latest_qc.created_at desc
		limit 1
	)`,
};

type ReportCycleRow = {
	id: string;
	orderId: string;
	lockId: string;
	status: string;
	expectedRuns: number;
	completedRuns: number;
	createdAt: Date;
	succeededRuns: number;
	latestQcDecision: string | null;
};

function toCandidate(row: ReportCycleRow | undefined): ReportCycleCandidate | null {
	if (!row) return null;
	return { ...row, succeededRuns: Number(row.succeededRuns ?? 0), latestQcDecision: row.latestQcDecision ?? null };
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
			update: null,
			report: null,
			freeAudit,
		};

		const newestProjectCycle = (tx: OrganizationTransaction, filter?: SQL) =>
			tx
				.select(reportCycleColumns)
				.from(svCycles)
				.innerJoin(svOrders, eq(svCycles.orderId, svOrders.id))
				.where(
					and(
						eq(svOrders.projectId, data.projectId),
						eq(svOrders.organizationId, context.tenantId),
						eq(svCycles.organizationId, context.tenantId),
						filter,
					),
				)
				.orderBy(desc(svCycles.createdAt))
				.limit(1);
		const [readyRows, newestRows, orderRows] = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			Promise.all([
				newestProjectCycle(tx, eq(svCycles.status, REPORT_READY_CYCLE_STATUS)),
				newestProjectCycle(tx),
				tx
					.select({ id: svOrders.id, lockId: svOrders.lockId, createdAt: svOrders.createdAt })
					.from(svOrders)
					.where(and(eq(svOrders.projectId, data.projectId), eq(svOrders.organizationId, context.tenantId)))
					.orderBy(desc(svOrders.createdAt))
					.limit(1),
			]),
		);
		const anchor = selectReportAnchor({
			latestReadyCycle: toCandidate(readyRows[0]),
			latestCycle: toCandidate(newestRows[0]),
			latestOrder: orderRows[0] ?? null,
		});
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
			const monthStart = new Date();
			monthStart.setUTCDate(1);
			monthStart.setUTCHours(0, 0, 0, 0);
			const [usage] = await withOrganizationTransaction(db, context.tenantId, (tx) =>
				tx
					.select({ used: sql<number>`coalesce(sum(${svCycles.expectedRuns}), 0)` })
					.from(svCycles)
					.innerJoin(svOrders, eq(svCycles.orderId, svOrders.id))
					.where(
						and(
							eq(svOrders.projectId, data.projectId),
							eq(svOrders.organizationId, context.tenantId),
							gte(svCycles.createdAt, monthStart),
							notInArray(svOrders.status, [...MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES]),
							notInArray(svCycles.status, [...MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES]),
						),
					),
			);
			view.monthUsage = { used: Number(usage?.used ?? 0), allowance: planForAllowance };
		}

		// Without a READY cycle there is no report: a page built from an
		// unfinished or rejected cycle's runs would print its gaps as findings.
		const cycle = anchor.cycle;
		if (!cycle) return view;
		view.cycle = { status: cycle.status, expectedRuns: cycle.expectedRuns, completedRuns: cycle.completedRuns };
		view.measuredAt = cycle.createdAt.toISOString();
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
