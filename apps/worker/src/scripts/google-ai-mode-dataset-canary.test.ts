import assert from "node:assert/strict";
import { test } from "node:test";
import type { GoogleAiModeCanaryCapturePersistenceReceipt } from "@workspace/lib/db/provider-canary-execution";
import type { GoogleAiModeCanaryReceipt } from "@workspace/lib/providers/google-ai-mode-one-shot-canary";
import {
	failedGoogleAiModeCanaryPersistenceReceipt,
	redactedGoogleAiModeCanaryTerminalReceipt,
} from "./google-ai-mode-dataset-canary";

const receipt = {
	schemaVersion: "google-ai-mode-canary-receipt-v1.3",
	terminal: true,
	source: "GOOGLE_AI_MODE",
	status: "COMPLETE",
	reason: null,
	providerCalls: 1,
	recurring: false,
	automaticRetries: 0,
	retryAllowed: false,
	reservationReference: "db:11111111-1111-4111-8111-111111111111",
	cost: {
		currency: "USD",
		status: "UNKNOWN",
		amountUsd: null,
		estimatedWorstCaseUsd: 0.1,
		approvedCapUsd: 0.25,
		reservedUsd: 0.25,
		basis: "PROVIDER_ACTUAL_UNAVAILABLE",
		reconciliation: "REQUIRED",
		acceptance: "HOLD",
		preflightEvidenceReference: "cost-preflight:fixture-12345678",
	},
	timing: {
		overallTimeoutMs: 1_440_000,
		triggerTimeoutMs: 25_000,
		progressTimeoutMs: 20_000,
		downloadTimeoutMs: 60_000,
		pollIntervalMs: 10_000,
		cancelTimeoutMs: 10_000,
	},
	snapshotReference: "brightdata:snapshot:private-snapshot-id",
	recordCount: 1,
	startedAt: "2026-08-31T10:00:00.000Z",
	finishedAt: "2026-08-31T10:01:00.000Z",
} satisfies GoogleAiModeCanaryReceipt;

const persistence = {
	schemaVersion: "google-ai-mode-canary-persistence-receipt-v1.3",
	status: "PERSISTED_PRIVATE",
	source: "GOOGLE_AI_MODE",
	capabilityStatus: "CANARY_ONLY",
	outputSchemaVersion: null,
	evidenceIndexStatus: "NOT_ELIGIBLE",
	recordCount: 1,
	costStatus: "UNKNOWN",
	acceptance: "HOLD",
	reason: "COST_RECONCILIATION_REQUIRED",
} satisfies GoogleAiModeCanaryCapturePersistenceReceipt;

test("GOOGLE_AI_MODE canary prints only a redacted persistence receipt and retains the hold", () => {
	const output = redactedGoogleAiModeCanaryTerminalReceipt(receipt, persistence);
	assert.equal(output.status, "COMPLETE");
	assert.equal(output.snapshotReference, null);
	assert.deepEqual(output.cost, receipt.cost);
	assert.deepEqual(output.persistence, persistence);
	assert.equal(JSON.stringify(output).includes("private-snapshot-id"), false);
});

test("GOOGLE_AI_MODE canary fails closed without exposing the private snapshot", () => {
	const output = failedGoogleAiModeCanaryPersistenceReceipt(receipt, "CAPTURE_PERSISTENCE_FAILED");
	assert.equal(output.status, "OUTCOME_UNKNOWN");
	assert.equal(output.reason, "CAPTURE_PERSISTENCE_FAILED");
	assert.equal(output.snapshotReference, null);
	assert.deepEqual(output.persistence, { status: "FAILED", acceptance: "HOLD" });
	assert.equal(JSON.stringify(output).includes("private-snapshot-id"), false);
});
