export const BRIGHTDATA_PERSISTED_CANARY_RUN_MODE = "brightdata-persisted-canary";
export const BRIGHTDATA_PERSISTED_CANARY_ENVIRONMENT = "staging";
export const BRIGHTDATA_PERSISTED_CANARY_PROJECT = "korafoodhall";
export const BRIGHTDATA_PERSISTED_CANARY_QUESTION = "What is the best food hall in Bali?";
export const BRIGHTDATA_PERSISTED_CANARY_SURFACES = ["chatgpt", "gemini"] as const;
export const BRIGHTDATA_PERSISTED_CANARY_SYSTEMS = ["ChatGPT", "Gemini"] as const;
export const BRIGHTDATA_PERSISTED_CANARY_ADAPTERS = ["brightdata-chatgpt", "brightdata-gemini"] as const;
export const BRIGHTDATA_PERSISTED_CANARY_QUESTION_SET_SUFFIX = ":brightdata-chatgpt-gemini-one-question-v1";
export const BRIGHTDATA_PERSISTED_CANARY_EXPECTED_COST_USD = 2 * 0.0015;

type PersistedCanarySystem = (typeof BRIGHTDATA_PERSISTED_CANARY_SYSTEMS)[number];

export type PersistedCanaryEvidence = {
	system: PersistedCanarySystem;
	status: string;
	validity: string;
	answerCharacters: number;
	displayedSourceCount: number;
	extractedCitationCount: number;
};

export type PersistedCanaryRunRow = {
	systemId: string | null;
	status: string;
	validity: string | null;
	canonicalPayload: unknown;
	citations: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactSystems(systems: readonly (string | null)[]): boolean {
	return (
		systems.length === BRIGHTDATA_PERSISTED_CANARY_SYSTEMS.length &&
		BRIGHTDATA_PERSISTED_CANARY_SYSTEMS.every((system) => systems.filter((value) => value === system).length === 1)
	);
}

export function assertBrightDataPersistedCanaryEnvironment(env: Record<string, string | undefined>): void {
	if (env.SELENA_BRIGHTDATA_PERSISTED_CANARY_ENABLED !== "true") {
		throw new Error("BRIGHTDATA_PERSISTED_CANARY_DISABLED");
	}
	if (env.SELENA_MEASUREMENT_ADAPTER !== "brightdata") {
		throw new Error("BRIGHTDATA_PERSISTED_CANARY_ADAPTER_INVALID");
	}
	if (env.SELENA_JOURNAL_PROJECTS !== BRIGHTDATA_PERSISTED_CANARY_PROJECT) {
		throw new Error("BRIGHTDATA_PERSISTED_CANARY_PROJECTS_INVALID");
	}
	if (env.RAILWAY_ENVIRONMENT_NAME !== BRIGHTDATA_PERSISTED_CANARY_ENVIRONMENT) {
		throw new Error("BRIGHTDATA_PERSISTED_CANARY_ENVIRONMENT_INVALID");
	}
}

export function journalQuestionsForRun(questions: readonly string[], persistedCanary: boolean): readonly string[] {
	if (!persistedCanary) return questions;
	const matching = questions.filter((question) => question === BRIGHTDATA_PERSISTED_CANARY_QUESTION);
	if (matching.length !== 1) throw new Error("BRIGHTDATA_PERSISTED_CANARY_QUESTION_INVALID");
	return matching;
}

export function journalQuestionSetVersion(version: string, persistedCanary: boolean): string {
	return persistedCanary ? `${version}${BRIGHTDATA_PERSISTED_CANARY_QUESTION_SET_SUFFIX}` : version;
}

export function assertBrightDataPersistedCanaryExecutionScope(input: {
	rowTexts: readonly string[];
	systems: readonly string[];
	expectedRuns: number;
	estimatedCostUsd: number;
	permitSystems: readonly (string | null)[];
}): void {
	if (
		input.rowTexts.length !== 1 ||
		input.rowTexts[0] !== BRIGHTDATA_PERSISTED_CANARY_QUESTION ||
		!hasExactSystems(input.systems) ||
		input.expectedRuns !== 2 ||
		input.estimatedCostUsd !== BRIGHTDATA_PERSISTED_CANARY_EXPECTED_COST_USD ||
		input.permitSystems.length !== 2 ||
		!hasExactSystems(input.permitSystems)
	) {
		throw new Error("BRIGHTDATA_PERSISTED_CANARY_SCOPE_INVARIANT_FAILED");
	}
}

export function validateBrightDataPersistedCanaryEvidence(
	rows: readonly PersistedCanaryRunRow[],
): PersistedCanaryEvidence[] {
	if (rows.length !== 2 || !hasExactSystems(rows.map((row) => row.systemId))) {
		throw new Error("BRIGHTDATA_PERSISTED_CANARY_EVIDENCE_INVALID");
	}

	const evidence = rows.map((row) => {
		const payload = isRecord(row.canonicalPayload) ? row.canonicalPayload : undefined;
		const answer = payload && isRecord(payload.answer) ? payload.answer : undefined;
		const text = answer?.text;
		const displayedSourceCount = Array.isArray(payload?.sources) ? payload.sources.length : 0;
		const extractedCitationCount = Array.isArray(row.citations) ? row.citations.length : 0;
		if (
			row.status !== "SUCCEEDED" ||
			row.validity !== "VALID" ||
			typeof text !== "string" ||
			text.trim() === "" ||
			displayedSourceCount + extractedCitationCount === 0
		) {
			throw new Error("BRIGHTDATA_PERSISTED_CANARY_EVIDENCE_INVALID");
		}
		return {
			system: row.systemId as PersistedCanarySystem,
			status: row.status,
			validity: row.validity,
			answerCharacters: text.length,
			displayedSourceCount,
			extractedCitationCount,
		};
	});

	return evidence.sort(
		(a, b) =>
			BRIGHTDATA_PERSISTED_CANARY_SYSTEMS.indexOf(a.system) - BRIGHTDATA_PERSISTED_CANARY_SYSTEMS.indexOf(b.system),
	);
}
