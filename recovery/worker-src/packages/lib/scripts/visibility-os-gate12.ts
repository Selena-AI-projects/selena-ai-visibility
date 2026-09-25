import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../src/db/db";
import * as schema from "../src/db/schema";
import { assertCanonicalDataset, ledgerToCsv, type SelenaLedgerRow } from "../src/selena-export";

const ORGANIZATION_ID = "gate12-release";
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
if (!/localhost|127\.0\.0\.1/.test(DATABASE_URL)) throw new Error("GATE12_LOCAL_DATABASE_REQUIRED");

const expectedAuditEvents = [
	"VISIBILITY_OS_PROJECT_CREATED",
	"VISIBILITY_OS_LOCATION_CONFIRMED",
	"VISIBILITY_OS_LOCAL_KEYWORDS_APPROVED",
	"VISIBILITY_OS_GRID_CREATED",
	"VISIBILITY_OS_QUOTE_ISSUED",
	"VISIBILITY_OS_CONFIGURATION_LOCK_CREATED",
	"VISIBILITY_OS_AI_CYCLE_COMPLETED",
	"VISIBILITY_OS_LOCAL_CYCLE_COMPLETED",
	"VISIBILITY_OS_FINDINGS_GENERATED",
	"VISIBILITY_OS_ACTION_APPROVED",
	"VISIBILITY_OS_CHANGE_EVENT_RECORDED",
	"VISIBILITY_OS_VERIFICATION_COMPLETED",
	"VISIBILITY_OS_BEFORE_AFTER_GENERATED",
	"VISIBILITY_OS_ATTRIBUTION_ASSESSED",
	"VISIBILITY_OS_EVIDENCE_EXPORTED",
] as const;

function stringArray(value: unknown): string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function requireCondition(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
	const [project] = await db
		.select()
		.from(schema.svProjects)
		.where(and(eq(schema.svProjects.organizationId, ORGANIZATION_ID), eq(schema.svProjects.name, "Gate 12 Project")));
	requireCondition(project, "GATE12_PROJECT_MISSING");

	const runs = await db.select().from(schema.svRuns).where(eq(schema.svRuns.organizationId, ORGANIZATION_ID));
	requireCondition(runs.length === 1, `GATE12_AI_RUN_COUNT:${runs.length}`);
	const run = runs[0];
	requireCondition(run.system === "stub", `GATE12_LIVE_PROVIDER:${run.system ?? "UNKNOWN"}`);
	requireCondition(Number(run.costUsd) === 0, `GATE12_NONZERO_RUN_COST:${run.costUsd ?? "UNKNOWN"}`);
	requireCondition(run.validity === "VALID" && run.status === "completed", "GATE12_AI_RUN_NOT_VALID");

	const costEvents = await db
		.select()
		.from(schema.svCostEvents)
		.where(eq(schema.svCostEvents.organizationId, ORGANIZATION_ID));
	requireCondition(costEvents.length === 1, `GATE12_COST_EVENT_COUNT:${costEvents.length}`);
	requireCondition(
		costEvents.every((event) => event.provider === "stub" && Number(event.amountUsd) === 0),
		"GATE12_LIVE_OR_NONZERO_COST_EVENT",
	);

	const [scenario] = await db
		.select()
		.from(schema.svScenarios)
		.where(eq(schema.svScenarios.organizationId, ORGANIZATION_ID));
	requireCondition(scenario, "GATE12_SCENARIO_MISSING");

	const row: SelenaLedgerRow = {
		runId: run.id,
		cycleId: run.cycleId,
		channel: run.channel === "visitor_view" ? "Visitor View" : "API View",
		brand: "Gate 12 Brand",
		scenarioId: run.scenarioId,
		scenarioText: scenario.text,
		system: run.system,
		model: run.model,
		timestamp: (run.finishedAt ?? run.createdAt).toISOString(),
		language: run.language ?? "UNKNOWN",
		region: run.region,
		validity: run.validity,
		rawResponseReference: run.rawResponseReference,
		mention: run.mention ?? false,
		position: run.position,
		ownedCitation: run.ownedCitation ?? false,
		citations: stringArray(run.citations),
		competitors: stringArray(run.competitors),
		factualErrors: stringArray(run.factualErrors),
		tokenUsage:
			run.tokenInput === null || run.tokenOutput === null
				? null
				: { input: run.tokenInput, output: run.tokenOutput, total: run.tokenInput + run.tokenOutput },
		cost: run.costUsd === null ? null : Number(run.costUsd),
		qcStatus: "stub-accepted",
	};
	assertCanonicalDataset([row], 1);
	const csv = ledgerToCsv([row]);
	const exportSha256 = createHash("sha256").update(csv).digest("hex");

	const mapDatasets = await db
		.select()
		.from(schema.svVisibilityMapDatasets)
		.where(
			and(
				eq(schema.svVisibilityMapDatasets.organizationId, ORGANIZATION_ID),
				eq(schema.svVisibilityMapDatasets.projectId, project.id),
			),
		);
	requireCondition(mapDatasets.length === 2, `GATE12_BEFORE_AFTER_DATASETS:${mapDatasets.length}`);

	const outcomeObservations = await db
		.select()
		.from(schema.svOutcomeObservations)
		.where(eq(schema.svOutcomeObservations.organizationId, ORGANIZATION_ID));
	requireCondition(outcomeObservations.length === 2, `GATE12_OUTCOME_OBSERVATIONS:${outcomeObservations.length}`);
	requireCondition(
		outcomeObservations.every((observation) => observation.value === null),
		"GATE12_ABSENT_OUTCOME_INVENTED",
	);

	const [assessment] = await db
		.select()
		.from(schema.svAttributionAssessments)
		.where(eq(schema.svAttributionAssessments.organizationId, ORGANIZATION_ID));
	requireCondition(assessment, "GATE12_ATTRIBUTION_MISSING");
	requireCondition(
		assessment.verdict === "NOT_MEASURED" && assessment.confidence === "UNKNOWN" && assessment.delta === null,
		"GATE12_UNKNOWN_ATTRIBUTION_NOT_PRESERVED",
	);

	const auditsBeforeExport = await db
		.select()
		.from(schema.svAuditEvents)
		.where(eq(schema.svAuditEvents.organizationId, ORGANIZATION_ID))
		.orderBy(asc(schema.svAuditEvents.at));
	requireCondition(auditsBeforeExport.length === expectedAuditEvents.length - 1, "GATE12_PRE_EXPORT_AUDIT_COUNT");
	requireCondition(
		auditsBeforeExport.every((event, index) => event.event === expectedAuditEvents[index]),
		"GATE12_PRE_EXPORT_AUDIT_ORDER",
	);

	await db.insert(schema.svAuditEvents).values({
		organizationId: ORGANIZATION_ID,
		actorId: "gate12-stub",
		event: "VISIBILITY_OS_EVIDENCE_EXPORTED",
		subjectKind: "project",
		subjectId: project.id,
		details: { format: "csv", sha256: exportSha256, canonicalRows: 1 },
		at: new Date("2026-08-01T00:14:00.000Z"),
	});

	const finalAudits = await db
		.select()
		.from(schema.svAuditEvents)
		.where(eq(schema.svAuditEvents.organizationId, ORGANIZATION_ID))
		.orderBy(asc(schema.svAuditEvents.at));
	requireCondition(finalAudits.length === expectedAuditEvents.length, `GATE12_AUDIT_COUNT:${finalAudits.length}`);
	requireCondition(
		finalAudits.every((event, index) => event.event === expectedAuditEvents[index]),
		"GATE12_AUDIT_ORDER",
	);

	console.log(`VISIBILITY_OS_VERTICAL_SLICE_PASS project=${project.id} export_sha256=${exportSha256}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
