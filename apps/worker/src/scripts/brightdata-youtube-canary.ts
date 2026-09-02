/**
 * One-shot Bright Data YouTube schema-discovery canary.
 *
 * This script is intentionally not wired into the worker or a queue. It refuses
 * to make a provider request until the owner has explicitly confirmed both the
 * recovery decision and the isolated-canary scope.
 *
 * Required environment:
 *   BRIGHTDATA_API_TOKEN
 *   SELENA_BRIGHTDATA_CANARY_PROJECT_ID
 *   SELENA_BRIGHTDATA_CANARY_OWNER_APPROVAL=YES
 *   SELENA_BRIGHTDATA_CANARY_RECOVERY_CLEAN=YES
 *   SELENA_BRIGHTDATA_CANARY_PREFLIGHT_FILE (read-only audit attestation)
 *   SELENA_BRIGHTDATA_CANARY_ARTIFACT_DIR (optional, defaults to /tmp/...)
 * The attestation must contain CLEAN, zero unresolved/running work, no
 * ambiguous spend, reconciled recovery/permits, zero provider calls and zero
 * recurring jobs. It is read only; this script never creates it.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	brightDataSocialDatasetRegistry,
	brightDataSocialNormalizers,
	createBrightDataSocialTransport,
	projectYouTubeDurableEntities,
	sanitizeYouTubePrivacyFixture,
} from "@workspace/lib/brightdata-social";
import {
	type BrightDataSnapshotJournalEntry,
	createBrightDataDatasetClient,
} from "@workspace/lib/providers/brightdata-dataset-client";
import {
	getProviderDatasetDefinition,
	type ProviderDatasetAccessRequest,
	prepareProviderDatasetCanary,
} from "@workspace/lib/providers/dataset-registry";
import {
	canonicalProviderDatasetPayload,
	providerDatasetContentHash,
} from "@workspace/lib/providers/provider-dataset-authority";

const DATASET_KEY = "youtube_videos" as const;
const SOURCE = "YOUTUBE_VIDEOS" as const;
const DATASET_ID = "gd_lk56epmy2i5g7lzu0k";
const CANARY_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const MAX_COST_USD = 0.5;
const EXPECTED_COST_USD =
	brightDataSocialDatasetRegistry[DATASET_KEY].expectedMaxOutputRecords *
	brightDataSocialDatasetRegistry[DATASET_KEY].unitCostUsd;

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name}_REQUIRED`);
	return value;
}

function assertExact(value: string, expected: string, code: string): void {
	if (value !== expected) throw new Error(code);
}

function shape(value: unknown): unknown {
	if (Array.isArray(value)) return { type: "array", items: value.map(shape) };
	if (value === null) return { type: "null" };
	if (typeof value !== "object") return { type: typeof value };
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, nested]) => [key, shape(nested)]),
	);
}

function outputPath(): string {
	return (
		process.env.SELENA_BRIGHTDATA_CANARY_ARTIFACT_DIR?.trim() ||
		join("/tmp", `selena-brightdata-youtube-canary-${Date.now()}`)
	);
}

async function readCleanPreflight(): Promise<{ hash: `sha256:${string}` }> {
	const path = required("SELENA_BRIGHTDATA_CANARY_PREFLIGHT_FILE");
	let value: unknown;
	try {
		value = JSON.parse(await readFile(path, "utf8"));
	} catch {
		throw new Error("CANARY_PREFLIGHT_ATTESTATION_INVALID");
	}
	if (value === null || typeof value !== "object" || Array.isArray(value))
		throw new Error("CANARY_PREFLIGHT_ATTESTATION_INVALID");
	const attestation = value as Record<string, unknown>;
	if (
		attestation.status !== "CLEAN" ||
		attestation.unresolvedClaims !== 0 ||
		attestation.runningRuns !== 0 ||
		attestation.ambiguousSpend !== false ||
		attestation.recoveryReconciled !== true ||
		attestation.permitsReconciled !== true ||
		attestation.providerCalls !== 0 ||
		attestation.recurringJobs !== 0
	)
		throw new Error("CANARY_PREFLIGHT_NOT_CLEAN");
	return { hash: providerDatasetContentHash(attestation) };
}

async function main(): Promise<void> {
	const apiToken = required("BRIGHTDATA_API_TOKEN");
	const projectId = required("SELENA_BRIGHTDATA_CANARY_PROJECT_ID");
	assertExact(required("SELENA_BRIGHTDATA_CANARY_OWNER_APPROVAL"), "YES", "OWNER_APPROVAL_REQUIRED");
	assertExact(required("SELENA_BRIGHTDATA_CANARY_RECOVERY_CLEAN"), "YES", "RECOVERY_CLEAN_CONFIRMATION_REQUIRED");
	const preflight = await readCleanPreflight();
	assertExact(DATASET_ID, brightDataSocialDatasetRegistry[DATASET_KEY].datasetId, "DATASET_REGISTRY_MISMATCH");
	if (EXPECTED_COST_USD > MAX_COST_USD) throw new Error("CANARY_COST_CAP_EXCEEDED");

	const startedAt = new Date().toISOString();
	const started = process.hrtime.bigint();
	const journal: BrightDataSnapshotJournalEntry[] = [];
	const definition = getProviderDatasetDefinition(SOURCE);
	const config = brightDataSocialDatasetRegistry[DATASET_KEY];
	const input = { url: CANARY_URL } as const;
	const access: ProviderDatasetAccessRequest = {
		mode: "CANARY",
		environment: "ISOLATED_CANARY",
		ownerApproved: true,
		schemaDiscoveryOnly: true,
		providerCalls: 1,
		recurring: false,
		worstCaseCostUsd: EXPECTED_COST_USD,
		approvedCostCapUsd: MAX_COST_USD,
		redactionPolicyApproved: true,
		privacyReviewApproved: true,
		retentionReviewApproved: true,
	};

	const reportBase = {
		schemaVersion: "brightdata-youtube-canary-report-v1",
		projectId,
		provider: "BRIGHT_DATA",
		source: SOURCE,
		datasetKey: DATASET_KEY,
		datasetId: DATASET_ID,
		intendedWorkflow: "CONTENT_VISIBILITY",
		inputContract: {
			required: config.inputContract.required,
			optional: config.inputContract.optional,
			maxInputsPerRun: config.inputContract.maxInputsPerRun,
			request: input,
		},
		requestPolicy: {
			endpoint: "POST /datasets/v3/scrape",
			attempts: 1,
			maxRecords: config.expectedMaxOutputRecords,
			maxPages: 1,
			comments: false,
			relatedVideos: false,
			channelCrawling: false,
			maxCostUsd: MAX_COST_USD,
		},
		privacyRetentionPolicy: {
			version: "youtube-privacy-retention-v1",
			rawDurableRetentionDays: 0,
			signedUrlRetentionDays: 0,
			commentsAndTranscriptRetentionDays: 0,
			sanitizedFixtureMaxHours: 24,
			stableIdsMetricsHashesRollingDays: 90,
			titleDescriptionRetentionDays: 0,
		},
		startedAt,
		preflightAttestationHash: preflight.hash,
	};

	try {
		const prepared = prepareProviderDatasetCanary(
			SOURCE,
			access,
			{ SELENA_BRIGHTDATA_DATASET_YOUTUBE_VIDEOS: DATASET_ID },
			input,
		);
		const transport = createBrightDataSocialTransport({
			apiToken,
			fetchImpl: fetch,
			maxResponseBytes: config.maxResponseBytes,
			downloadTimeoutMs: config.downloadTimeoutMs,
		});
		const client = createBrightDataDatasetClient({
			transport,
			journal: { record: async (entry) => void journal.push(entry) },
			lifecycle: {
				timeoutMs: config.collectionTimeoutMs,
				pollIntervalMs: 1_000,
				cancelTimeoutMs: 5_000,
				readyStatuses: ["ready"],
				pendingStatuses: ["pending", "starting", "running", "triggered", "building"],
				terminalFailureStatuses: ["failed", "error", "cancelled", "canceled"],
			},
		});
		const collection = await client.collectSynchronous(prepared);
		const latencyMs = Number(process.hrtime.bigint() - started) / 1_000_000;
		const terminal = collection.status;
		const report = { ...reportBase, latencyMs, journal, terminalStatus: terminal } as Record<string, unknown>;

		if (collection.status === "COMPLETE") {
			const rows = Array.isArray(collection.capture.rawPayload)
				? collection.capture.rawPayload
				: [collection.capture.rawPayload];
			if (rows.length !== 1) throw new Error("CANARY_RECORD_CARDINALITY_INVALID");
			const sanitizedFixture = sanitizeYouTubePrivacyFixture(rows);
			const context = {
				datasetKey: DATASET_KEY,
				snapshotId: collection.snapshotId,
				capturedAt: collection.capture.capturedAt,
			};
			const normalized = projectYouTubeDurableEntities(
				brightDataSocialNormalizers[DATASET_KEY](rows, context),
			);
			Object.assign(report, {
				responseSchema: shape(rows),
				stableIdFields: config.stableIdFields,
				pagination: config.pagination,
				pollingLifecycle: journal,
				snapshotId: collection.snapshotId,
				rawReference: collection.capture.rawReference,
				sanitizedFixtureHash: providerDatasetContentHash(sanitizedFixture),
				rawContentHash: providerDatasetContentHash(collection.capture.rawPayload),
				normalizedEntities: normalized,
				pii: {
					classification: config.personalDataClassification,
					fields: config.personalDataFields,
					retention: config.rawRetention,
				},
				cost: {
					estimatedUsd: EXPECTED_COST_USD,
					actualUsd: "UNKNOWN_UNTIL_BRIGHTDATA_USAGE_RECONCILIATION",
				},
				providerOutputSchemaVersion: definition.outputSchemaVersion,
			});
			const dir = outputPath();
			await mkdir(dir, { recursive: true });
			await writeFile(
				join(dir, "sanitized-fixture.json"),
				`${canonicalProviderDatasetPayload(sanitizedFixture)}\n`,
				"utf8",
			);
			await writeFile(join(dir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
			console.log(JSON.stringify({ status: "PASS_PENDING_COST_RECONCILIATION", artifactDir: dir, latencyMs }));
			return;
		}

		Object.assign(report, {
			error: "PROVIDER_TERMINAL_OR_TIMEOUT",
			cost: { estimatedUsd: EXPECTED_COST_USD, actualUsd: "UNKNOWN" },
		});
		const dir = outputPath();
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
		throw new Error(`CANARY_${collection.status}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : "CANARY_FAILED";
		if (message.includes(apiToken)) throw new Error("CANARY_FAILED");
		throw error;
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : "CANARY_FAILED");
	process.exitCode = 1;
});
