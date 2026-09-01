import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
	GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY,
	type HistoricalGoogleAiModeReconciliationReceipt,
} from "@workspace/lib/db/provider-canary-execution";
import {
	parseHistoricalReconciliationManifest,
	redactedHistoricalReconciliationReceipt,
} from "./reconcile-google-ai-mode-historical-snapshot";

const manifest = {
	organizationId: "tenant-a",
	projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	executionIdentity: GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY,
	providerDatasetId: "gd_history123",
	snapshotId: "historical-snapshot",
	capturedAt: "2026-09-01T08:54:46.000Z",
	historicalReadyObservedAt: "2026-09-01T08:55:17.108Z",
	reconciledAt: "2026-09-01T12:00:00.000Z",
	providerInput: { query: "historical query" },
	expectedFileSha256: `sha256:${"1".repeat(64)}`,
	expectedCanonicalHash: `sha256:${"2".repeat(64)}`,
	estimatedWorstCaseUsd: 0.0015,
};

test("historical reconciliation manifest requires the exact reserved identity", () => {
	assert.deepEqual(parseHistoricalReconciliationManifest(manifest), manifest);
	assert.throws(
		() => parseHistoricalReconciliationManifest({ ...manifest, executionIdentity: "another-run" }),
		/GOOGLE_AI_MODE_HISTORICAL_MANIFEST_INVALID/,
	);
});

test("historical reconciliation manifest rejects extra credential-bearing fields", () => {
	assert.throws(
		() => parseHistoricalReconciliationManifest({ ...manifest, apiKey: "must-not-be-consumed" }),
		/GOOGLE_AI_MODE_HISTORICAL_MANIFEST_INVALID/,
	);
});

test("historical reconciliation stdout contract exposes no identity or private locator", () => {
	const receipt = {
		schemaVersion: "google-ai-mode-historical-reconciliation-receipt-v1.3",
		status: "DRY_RUN_ROLLED_BACK",
		source: "GOOGLE_AI_MODE",
		providerCalls: 0,
		capabilityStatus: "CANARY_ONLY",
		evidenceIndexStatus: "NOT_CREATED",
		costEventStatus: "NOT_CREATED",
		acceptanceReceiptStatus: "NOT_CREATED",
		humanAccepted: false,
		recordCount: 1,
		acceptance: "HOLD",
	} satisfies HistoricalGoogleAiModeReconciliationReceipt;
	const output = redactedHistoricalReconciliationReceipt(receipt);

	assert.deepEqual(output, receipt);
	assert.equal(JSON.stringify(output).includes("historical-snapshot"), false);
	assert.equal(JSON.stringify(output).includes("gd_history123"), false);
	assert.equal(JSON.stringify(output).includes(GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY), false);
});

test("historical reconciliation command has no provider transport or credential dependency", async () => {
	const source = await readFile(__filename.replace(/\.test\.ts$/, ".ts"), "utf8");
	assert.equal(source.includes("createBrightDataGoogleAiModeTransport"), false);
	assert.equal(source.includes("@workspace/lib/secrets"), false);
	assert.equal(source.includes("fetch("), false);
});
