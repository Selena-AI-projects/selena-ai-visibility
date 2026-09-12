import assert from "node:assert/strict";
import test from "node:test";
import { journalScenario } from "@workspace/lib/selena-journal-scenarios";
import {
	assertBrightDataPersistedCanaryEnvironment,
	assertBrightDataPersistedCanaryExecutionScope,
	BRIGHTDATA_PERSISTED_CANARY_EXPECTED_COST_USD,
	BRIGHTDATA_PERSISTED_CANARY_QUESTION,
	BRIGHTDATA_PERSISTED_CANARY_QUESTION_SET_SUFFIX,
	journalQuestionSetVersion,
	journalQuestionsForRun,
	type PersistedCanaryRunRow,
	validateBrightDataPersistedCanaryEvidence,
} from "./brightdata-persisted-canary-contract.js";

const canaryEnvironment = {
	SELENA_BRIGHTDATA_PERSISTED_CANARY_ENABLED: "true",
	SELENA_MEASUREMENT_ADAPTER: "brightdata",
	SELENA_JOURNAL_PROJECTS: "korafoodhall",
	RAILWAY_ENVIRONMENT_NAME: "staging",
};

function storedRun(overrides: Partial<PersistedCanaryRunRow> = {}): PersistedCanaryRunRow {
	return {
		systemId: "ChatGPT",
		status: "SUCCEEDED",
		validity: "VALID",
		canonicalPayload: {
			answer: { text: "A retained answer" },
			sources: [{ url: "https://example.test/source" }],
		},
		citations: [],
		...overrides,
	};
}

test("persisted canary environment accepts only the exact opt-in, Bright Data family, and KORA project", () => {
	assert.doesNotThrow(() => assertBrightDataPersistedCanaryEnvironment(canaryEnvironment));
	assert.throws(
		() => assertBrightDataPersistedCanaryEnvironment({ ...canaryEnvironment, SELENA_MEASUREMENT_ADAPTER: "branch-c" }),
		/BRIGHTDATA_PERSISTED_CANARY_ADAPTER_INVALID/,
	);
	assert.throws(
		() => assertBrightDataPersistedCanaryEnvironment({ ...canaryEnvironment, SELENA_JOURNAL_PROJECTS: "all" }),
		/BRIGHTDATA_PERSISTED_CANARY_PROJECTS_INVALID/,
	);
	assert.throws(
		() =>
			assertBrightDataPersistedCanaryEnvironment({
				...canaryEnvironment,
				SELENA_BRIGHTDATA_PERSISTED_CANARY_ENABLED: "TRUE",
			}),
		/BRIGHTDATA_PERSISTED_CANARY_DISABLED/,
	);
	assert.throws(
		() => assertBrightDataPersistedCanaryEnvironment({ ...canaryEnvironment, RAILWAY_ENVIRONMENT_NAME: "production" }),
		/BRIGHTDATA_PERSISTED_CANARY_ENVIRONMENT_INVALID/,
	);
});

test("persisted canary selects exactly one fixed question while the default keeps every question", () => {
	const questions = ["Question one", BRIGHTDATA_PERSISTED_CANARY_QUESTION, "Question three"] as const;
	assert.strictEqual(journalQuestionsForRun(questions, false), questions);
	assert.deepEqual(journalQuestionsForRun(questions, true), [BRIGHTDATA_PERSISTED_CANARY_QUESTION]);
	assert.throws(
		() => journalQuestionsForRun([BRIGHTDATA_PERSISTED_CANARY_QUESTION, BRIGHTDATA_PERSISTED_CANARY_QUESTION], true),
		/BRIGHTDATA_PERSISTED_CANARY_QUESTION_INVALID/,
	);
	assert.deepEqual(journalQuestionsForRun(journalScenario("korafoodhall").questions, true), [
		BRIGHTDATA_PERSISTED_CANARY_QUESTION,
	]);
});

test("persisted canary has a distinct deterministic daily-claim identity", () => {
	const version = "korafoodhall-api-view-2026-08-25";
	assert.equal(journalQuestionSetVersion(version, false), version);
	assert.equal(
		journalQuestionSetVersion(version, true),
		`${version}${BRIGHTDATA_PERSISTED_CANARY_QUESTION_SET_SUFFIX}`,
	);
});

test("persisted canary execution scope is exactly one question and two Bright Data systems", () => {
	const scope = {
		rowTexts: [BRIGHTDATA_PERSISTED_CANARY_QUESTION],
		systems: ["ChatGPT", "Gemini"],
		expectedRuns: 2,
		estimatedCostUsd: BRIGHTDATA_PERSISTED_CANARY_EXPECTED_COST_USD,
		permitSystems: ["ChatGPT", "Gemini"],
	};
	assert.doesNotThrow(() => assertBrightDataPersistedCanaryExecutionScope(scope));
	assert.equal(BRIGHTDATA_PERSISTED_CANARY_EXPECTED_COST_USD, 0.003);
	assert.throws(
		() => assertBrightDataPersistedCanaryExecutionScope({ ...scope, systems: [...scope.systems, "Perplexity"] }),
		/BRIGHTDATA_PERSISTED_CANARY_SCOPE_INVARIANT_FAILED/,
	);
	assert.throws(
		() => assertBrightDataPersistedCanaryExecutionScope({ ...scope, permitSystems: ["ChatGPT"] }),
		/BRIGHTDATA_PERSISTED_CANARY_SCOPE_INVARIANT_FAILED/,
	);
});

test("persisted evidence is derived from two valid stored rows without exposing retained content", () => {
	const evidence = validateBrightDataPersistedCanaryEvidence([
		storedRun(),
		storedRun({
			systemId: "Gemini",
			canonicalPayload: { answer: { text: "Gemini retained answer" } },
			citations: [{ url: "https://example.test/citation", domain: "example.test" }],
		}),
	]);

	assert.deepEqual(evidence, [
		{
			system: "ChatGPT",
			status: "SUCCEEDED",
			validity: "VALID",
			answerCharacters: 17,
			displayedSourceCount: 1,
			extractedCitationCount: 0,
		},
		{
			system: "Gemini",
			status: "SUCCEEDED",
			validity: "VALID",
			answerCharacters: 22,
			displayedSourceCount: 0,
			extractedCitationCount: 1,
		},
	]);
	assert.equal(Object.hasOwn(evidence[0] ?? {}, "answer"), false);
});

test("persisted evidence fails closed on missing rows, retained answers, validity, or source evidence", () => {
	const validRows = [storedRun(), storedRun({ systemId: "Gemini" })];
	assert.throws(
		() => validateBrightDataPersistedCanaryEvidence(validRows.slice(0, 1)),
		/EVIDENCE_SYSTEMS_INVALID/,
	);
	assert.throws(
		() => validateBrightDataPersistedCanaryEvidence([storedRun({ validity: "INVALID" }), validRows[1]]),
		/EVIDENCE_RUN_INVALID/,
	);
	assert.throws(
		() =>
			validateBrightDataPersistedCanaryEvidence([
				storedRun({ canonicalPayload: { answer: { text: " " }, sources: [{}] } }),
				validRows[1],
			]),
		/EVIDENCE_ANSWER_INVALID/,
	);
	assert.throws(
		() =>
			validateBrightDataPersistedCanaryEvidence([
				storedRun({ canonicalPayload: { answer: { text: "Answer without sources" } }, citations: [] }),
				validRows[1],
			]),
		/EVIDENCE_SOURCES_MISSING/,
	);
});

test("persisted evidence uses the permit system when extraction enrichment is unavailable", () => {
	const evidence = validateBrightDataPersistedCanaryEvidence([
		storedRun(),
		storedRun({ systemId: "Gemini", citations: [{ url: "https://example.test/citation" }] }),
	]);

	assert.deepEqual(
		evidence.map((row) => row.system),
		["ChatGPT", "Gemini"],
	);
});
