import type { createBrightDataDatasetClient } from "../providers/brightdata-dataset-client";
import {
	type ProviderDatasetAccessRequest,
	type ProviderDatasetEnvKey,
	prepareProviderDatasetCanary,
} from "../providers/dataset-registry";
import { brightDataSocialNormalizers } from "./normalizers";
import { brightDataSocialDatasetRegistry, brightDataSocialSourceByKey } from "./registry";
import type {
	BrightDataDatasetNormalizer,
	BrightDataProjectPolicy,
	BrightDataSocialDatasetConfig,
	BrightDataSocialDatasetKey,
	BrightDataSocialWorkflow,
	NormalizedSocialEntity,
	SourceSnapshot,
} from "./types";

export * from "./normalizers";
export * from "./privacy";
export * from "./registry";
export * from "./retention";
export * from "./transport";
export * from "./types";
export * from "./youtube-durable-persistence";

export class BrightDataSocialPolicyError extends Error {
	constructor(public readonly code: string) {
		super(code);
		this.name = "BrightDataSocialPolicyError";
	}
}

/** No runtime project UUID has been approved, so every dataset is default-off. */
export const noBrightDataSocialProjects: BrightDataProjectPolicy = Object.freeze({});

export const proposedBrightDataSocialWorkflowMapping = Object.freeze({
	SOCIAL_INTELLIGENCE: Object.freeze(["instagram_profiles", "tiktok_profiles"]),
	REPUTATION: Object.freeze(["reddit_posts"]),
	CONTENT_VISIBILITY: Object.freeze(["instagram_posts", "instagram_reels", "tiktok_posts", "youtube_videos"]),
} as const satisfies Record<BrightDataSocialWorkflow, readonly BrightDataSocialDatasetKey[]>);

type SharedBrightDataDatasetClient = ReturnType<typeof createBrightDataDatasetClient>;

export type BrightDataSocialCollectRequest = Readonly<{
	projectId: string;
	workflow: BrightDataSocialWorkflow;
	datasetKey: BrightDataSocialDatasetKey;
	input: Readonly<Record<string, unknown>>;
	access: ProviderDatasetAccessRequest;
}>;

export type BrightDataSocialResumeRequest = BrightDataSocialCollectRequest & Readonly<{ snapshotId: string }>;

export type BrightDataSocialCollection = Readonly<{
	status: "COMPLETE";
	snapshotId: string;
	entities: readonly NormalizedSocialEntity[];
	estimatedCostUsd: number;
}>;

export type BrightDataSocialCollectionResult =
	| BrightDataSocialCollection
	| Readonly<{
			status: "TIMEOUT" | "TERMINAL_FAILURE" | "INVALID";
			snapshotId: string;
			estimatedCostUsd: number;
	  }>;

export type BrightDataSocialCollectorOptions = Readonly<{
	client: SharedBrightDataDatasetClient;
	datasetEnvironment: Readonly<Partial<Record<ProviderDatasetEnvKey, string | undefined>>>;
	policy?: BrightDataProjectPolicy;
	registry?: Readonly<Record<BrightDataSocialDatasetKey, BrightDataSocialDatasetConfig>>;
	normalizers?: Readonly<Record<BrightDataSocialDatasetKey, BrightDataDatasetNormalizer>>;
}>;

const PLATFORM_HOSTS: Readonly<Record<BrightDataSocialDatasetConfig["platform"], readonly string[]>> = {
	instagram: ["instagram.com"],
	tiktok: ["tiktok.com"],
	reddit: ["reddit.com"],
	youtube: ["youtube.com", "youtu.be"],
};

function assertEnabledForProject(
	policy: BrightDataProjectPolicy,
	projectId: string,
	workflow: BrightDataSocialWorkflow,
	datasetKey: BrightDataSocialDatasetKey,
): void {
	const allowed = policy[projectId]?.[workflow];
	if (!allowed?.includes(datasetKey)) throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_PROJECT_NOT_ALLOWED");
}

function assertInput(config: BrightDataSocialDatasetConfig, input: Readonly<Record<string, unknown>>): void {
	const allowedFields = new Set([...config.inputContract.required, ...config.inputContract.optional]);
	if (Object.keys(input).some((field) => !allowedFields.has(field)))
		throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_INPUT_FIELD_NOT_VALIDATED");
	for (const field of config.inputContract.required) {
		if (input[field] === null || input[field] === undefined || input[field] === "")
			throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_INPUT_REQUIRED");
	}
	if (config.key === "instagram_reels" && input.num_of_posts !== 1)
		throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_REELS_LIMIT_REQUIRED");
	if (typeof input.url !== "string") throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_URL_REQUIRED");
	let url: URL;
	try {
		url = new URL(input.url);
	} catch {
		throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_URL_INVALID");
	}
	if (url.protocol !== "https:") throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_URL_INVALID");
	const validHost = PLATFORM_HOSTS[config.platform].some(
		(host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
	);
	if (!validHost) throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_URL_PLATFORM_MISMATCH");
}

function assertCost(config: BrightDataSocialDatasetConfig, access: ProviderDatasetAccessRequest): number {
	const estimatedCostUsd = config.expectedMaxOutputRecords * config.unitCostUsd;
	if (
		access.worstCaseCostUsd === null ||
		access.approvedCostCapUsd === null ||
		access.worstCaseCostUsd < estimatedCostUsd ||
		access.approvedCostCapUsd < estimatedCostUsd
	)
		throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_COST_LIMIT_EXCEEDED");
	return estimatedCostUsd;
}

function assertCollectible(config: BrightDataSocialDatasetConfig): void {
	if (config.runtimeStatus === "blocked_cost_and_pii")
		throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_DATASET_BLOCKED_COST_AND_PII");
	if (config.expectedMaxOutputRecords < 1)
		throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_OUTPUT_CAP_REQUIRED");
}

function rowsFromPayload(payload: unknown, maxRows: number): readonly Record<string, unknown>[] {
	const values = Array.isArray(payload) ? payload : [payload];
	if (values.length > maxRows) throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_UNEXPECTED_FANOUT");
	return values.map((value) => {
		if (typeof value !== "object" || value === null || Array.isArray(value))
			throw new BrightDataSocialPolicyError("BRIGHTDATA_SOCIAL_RESPONSE_MALFORMED");
		return value as Record<string, unknown>;
	});
}

/**
 * Manual schema-discovery boundary only. It registers no worker, timer, scoring
 * hook, UI surface, tariff, or public product capability.
 */
export function createBrightDataSocialCollector(options: BrightDataSocialCollectorOptions) {
	const policy = options.policy ?? noBrightDataSocialProjects;
	const registry = options.registry ?? brightDataSocialDatasetRegistry;
	const normalizers = options.normalizers ?? brightDataSocialNormalizers;

	function prepare(request: BrightDataSocialCollectRequest) {
		const config = registry[request.datasetKey];
		assertCollectible(config);
		assertEnabledForProject(policy, request.projectId, request.workflow, request.datasetKey);
		assertInput(config, request.input);
		const estimatedCostUsd = assertCost(config, request.access);
		const prepared = prepareProviderDatasetCanary(
			brightDataSocialSourceByKey[request.datasetKey],
			request.access,
			options.datasetEnvironment,
			request.input,
		);
		return { config, estimatedCostUsd, normalizer: normalizers[request.datasetKey], prepared };
	}

	function result(
		prepared: ReturnType<typeof prepare>,
		collection: Awaited<ReturnType<SharedBrightDataDatasetClient["collect"]>>,
	): BrightDataSocialCollectionResult {
		if (collection.status !== "COMPLETE") {
			return Object.freeze({
				status: collection.status,
				snapshotId: collection.snapshotId,
				estimatedCostUsd: prepared.estimatedCostUsd,
			});
		}
		const rows = rowsFromPayload(collection.capture.rawPayload, prepared.config.expectedMaxOutputRecords);
		const context = {
			datasetKey: prepared.config.key,
			snapshotId: collection.snapshotId,
			capturedAt: collection.capture.capturedAt,
		};
		const sourceSnapshot: SourceSnapshot = {
			entityType: "source_snapshot",
			datasetKey: prepared.config.key,
			datasetId: prepared.config.datasetId,
			snapshotId: collection.snapshotId,
			capturedAt: collection.capture.capturedAt,
			rowCount: rows.length,
			rawRetained: false,
		};
		return Object.freeze({
			status: "COMPLETE" as const,
			snapshotId: collection.snapshotId,
			entities: Object.freeze([sourceSnapshot, ...prepared.normalizer(rows, context)]),
			estimatedCostUsd: prepared.estimatedCostUsd,
		});
	}

	return Object.freeze({
		async collect(request: BrightDataSocialCollectRequest): Promise<BrightDataSocialCollectionResult> {
			const prepared = prepare(request);
			const collection =
				prepared.config.collectionMode === "sync_scrape"
					? await options.client.collectSynchronous(prepared.prepared)
					: await options.client.collect(prepared.prepared);
			return result(prepared, collection);
		},

		async resume(request: BrightDataSocialResumeRequest): Promise<BrightDataSocialCollectionResult> {
			const prepared = prepare(request);
			return result(prepared, await options.client.resume(prepared.prepared, { snapshotId: request.snapshotId }));
		},
	});
}
