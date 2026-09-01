import { readFile, stat } from "node:fs/promises";
import {
	GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY,
	GOOGLE_AI_MODE_HISTORICAL_MAX_FILE_BYTES,
	type HistoricalGoogleAiModeReconciliationReceipt,
	type ReconcileHistoricalGoogleAiModeCaptureInput,
	reconcileHistoricalGoogleAiModeCapture,
} from "@workspace/lib/db/provider-canary-execution";

const MAX_MANIFEST_BYTES = 64 * 1024;

type HistoricalReconciliationManifest = Omit<ReconcileHistoricalGoogleAiModeCaptureInput, "rawFileBytes" | "dryRun">;

function record(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_MANIFEST_INVALID");
	return value as Record<string, unknown>;
}

function stringField(value: unknown): string {
	if (typeof value !== "string" || !value.trim()) throw new Error("GOOGLE_AI_MODE_HISTORICAL_MANIFEST_INVALID");
	return value;
}

export function parseHistoricalReconciliationManifest(value: unknown): HistoricalReconciliationManifest {
	const input = record(value);
	const allowedKeys = new Set([
		"organizationId",
		"projectId",
		"executionIdentity",
		"providerDatasetId",
		"snapshotId",
		"capturedAt",
		"historicalReadyObservedAt",
		"reconciledAt",
		"providerInput",
		"expectedFileSha256",
		"expectedCanonicalHash",
		"estimatedWorstCaseUsd",
	]);
	if (Object.keys(input).some((key) => !allowedKeys.has(key)))
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_MANIFEST_INVALID");
	const estimatedWorstCaseUsd = input.estimatedWorstCaseUsd;
	if (typeof estimatedWorstCaseUsd !== "number" || !Number.isFinite(estimatedWorstCaseUsd))
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_MANIFEST_INVALID");
	const executionIdentity = stringField(input.executionIdentity);
	if (executionIdentity !== GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_MANIFEST_INVALID");
	return Object.freeze({
		organizationId: stringField(input.organizationId),
		projectId: stringField(input.projectId),
		executionIdentity,
		providerDatasetId: stringField(input.providerDatasetId),
		snapshotId: stringField(input.snapshotId),
		capturedAt: stringField(input.capturedAt),
		historicalReadyObservedAt: stringField(input.historicalReadyObservedAt),
		reconciledAt: stringField(input.reconciledAt),
		providerInput: input.providerInput,
		expectedFileSha256: stringField(input.expectedFileSha256),
		expectedCanonicalHash: stringField(input.expectedCanonicalHash),
		estimatedWorstCaseUsd,
	});
}

async function readBoundedFile(path: string, maxBytes: number, code: string): Promise<Uint8Array> {
	const metadata = await stat(path);
	if (!metadata.isFile() || metadata.size === 0 || metadata.size > maxBytes) throw new Error(code);
	const bytes = await readFile(path);
	if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) throw new Error(code);
	return bytes;
}

export async function loadHistoricalReconciliationInput(input: {
	manifestPath: string;
	payloadPath: string;
	dryRun: boolean;
}): Promise<ReconcileHistoricalGoogleAiModeCaptureInput> {
	const manifestBytes = await readBoundedFile(
		input.manifestPath,
		MAX_MANIFEST_BYTES,
		"GOOGLE_AI_MODE_HISTORICAL_MANIFEST_SIZE_INVALID",
	);
	let manifestValue: unknown;
	try {
		manifestValue = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes)) as unknown;
	} catch {
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_MANIFEST_INVALID");
	}
	const manifest = parseHistoricalReconciliationManifest(manifestValue);
	const rawFileBytes = await readBoundedFile(
		input.payloadPath,
		GOOGLE_AI_MODE_HISTORICAL_MAX_FILE_BYTES,
		"GOOGLE_AI_MODE_HISTORICAL_FILE_SIZE_INVALID",
	);
	return Object.freeze({ ...manifest, rawFileBytes, dryRun: input.dryRun });
}

export function redactedHistoricalReconciliationReceipt(
	receipt: HistoricalGoogleAiModeReconciliationReceipt,
): HistoricalGoogleAiModeReconciliationReceipt {
	return receipt;
}

function commandArguments(argv: readonly string[]): { manifestPath: string; payloadPath: string; dryRun: boolean } {
	if (argv.length !== 4 && argv.length !== 5) throw new Error("GOOGLE_AI_MODE_HISTORICAL_ARGUMENTS_INVALID");
	const manifestIndex = argv.indexOf("--manifest");
	const payloadIndex = argv.indexOf("--payload");
	const manifestPath = argv[manifestIndex + 1];
	const payloadPath = argv[payloadIndex + 1];
	if (manifestIndex < 0 || payloadIndex < 0 || !manifestPath || !payloadPath)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_ARGUMENTS_INVALID");
	const flags = argv.filter((value) => value.startsWith("--"));
	if (flags.some((flag) => !["--manifest", "--payload", "--commit"].includes(flag)))
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_ARGUMENTS_INVALID");
	if (
		argv.filter((value) => value === "--manifest").length !== 1 ||
		argv.filter((value) => value === "--payload").length !== 1 ||
		argv.filter((value) => value === "--commit").length > 1 ||
		(argv.length === 5) !== argv.includes("--commit")
	)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_ARGUMENTS_INVALID");
	return { manifestPath, payloadPath, dryRun: !argv.includes("--commit") };
}

export async function executeHistoricalGoogleAiModeReconciliationCommand(
	argv = process.argv.slice(2),
): Promise<number> {
	const input = await loadHistoricalReconciliationInput(commandArguments(argv));
	const { db } = await import("@workspace/lib/db/db");
	const receipt = await reconcileHistoricalGoogleAiModeCapture(db, input);
	process.stdout.write(`${JSON.stringify(redactedHistoricalReconciliationReceipt(receipt))}\n`);
	return 0;
}

const isDirectRun = process.argv[1]?.endsWith("/reconcile-google-ai-mode-historical-snapshot.ts");
if (isDirectRun) {
	executeHistoricalGoogleAiModeReconciliationCommand().then(
		(exitCode) => {
			process.exitCode = exitCode;
		},
		() => {
			process.stderr.write("GOOGLE_AI_MODE_HISTORICAL_RECONCILIATION_FAILED\n");
			process.exitCode = 1;
		},
	);
}
