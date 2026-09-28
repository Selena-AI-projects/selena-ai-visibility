import { measurementScopeSchema } from "@workspace/selena-visibility-contracts";
import { analyzeAnswer } from "./selena-answer-analysis";
import { readRetainedAnswer, readStoredAnalysis } from "./selena-answer-payload";
import { parseLockedAnalysisSubjects } from "./selena-extraction-context";
import { buildGraderReport, type GraderChannel, type GraderReport, type GraderRunInput } from "./selena-grader-report";

export type CycleReportRun = {
	id: string;
	scenarioId: string;
	systemId: string | null;
	channel: string;
	captureMode: string | null;
	canonicalPayload: unknown;
};

export type CycleReportScenario = { id: string; text: string; language: string };

/**
 * The customer report for one cycle's runs, read against the configuration
 * the cycle was locked with. The workspace and the weekly digest both read
 * through here, so the numbers a client is sent are the numbers they see.
 *
 * Null when the lock names no brand to look for: without one there is
 * nothing to count, and an empty report would read as "not mentioned".
 */
export function buildCycleGraderReport(input: {
	lockSnapshot: unknown;
	runs: readonly CycleReportRun[];
	scenarios: readonly CycleReportScenario[];
}): GraderReport | null {
	const subjects = parseLockedAnalysisSubjects(input.lockSnapshot);
	if (!subjects) return null;
	const snapshot = (input.lockSnapshot ?? null) as Record<string, unknown> | null;
	const scope = measurementScopeSchema.safeParse(snapshot?.measurementScope);
	const scenarioById = new Map(input.scenarios.map((row) => [row.id, row]));

	// A run that predates systemId stamping still belongs to a channel; the
	// scope names that channel's systems, so a single-system channel can be
	// attributed and anything else stays visibly unattributed.
	const channelSystems = new Map<string, string[]>();
	if (scope.success)
		for (const system of scope.data.systems) {
			const bucket = channelSystems.get(system.channel) ?? [];
			bucket.push(system.systemId);
			channelSystems.set(system.channel, bucket);
		}

	const graderRuns: GraderRunInput[] = input.runs.map((run) => {
		const scenario = scenarioById.get(run.scenarioId);
		const channel: GraderChannel = run.channel === "API" ? "API" : "VISITOR";
		const fallbackSystems = channelSystems.get(channel) ?? [];
		return {
			runId: run.id,
			systemId: run.systemId ?? (fallbackSystems.length === 1 ? fallbackSystems[0] : "unattributed"),
			channel,
			captureMode: run.captureMode ?? null,
			scenarioId: run.scenarioId,
			scenarioText: scenario?.text ?? "",
			scenarioLanguage: scenario?.language ?? "",
			// Reading must not write: analysis comes from the payload when the
			// admin action already saved it, and is recomputed in memory from the
			// retained text otherwise.
			analysis:
				readStoredAnalysis(run.canonicalPayload) ??
				(() => {
					const retained = readRetainedAnswer(run.canonicalPayload);
					return retained
						? analyzeAnswer({
								text: retained.text,
								brand: subjects.brand,
								competitors: subjects.competitors,
								citedUrls: retained.citedUrls,
							})
						: null;
				})(),
		};
	});

	return buildGraderReport({ runs: graderRuns, subjects, repeats: scope.success ? scope.data.repeats : null });
}
