import { createHash } from "node:crypto";
import {
	assertLocalMapsRankQuoteMatchesLock,
	type LocalMapsRankAdapter,
	type LocalMapsRankCapability,
	type LocalMapsRankPermit,
	type LocalMapsRankQuote,
	formatLocalMapsLocationCoordinate,
	localMapsRankCapabilitySchema,
	mapsLockV1Schema,
	type MapsLockV1,
} from "@workspace/selena-visibility-contracts";
import type { LocalMapsMaterializedProviderRequest } from "@workspace/selena-visibility-contracts";

type HttpLocalMapsResponse = {
	coordinateProof: {
		pointId: string;
		pointIndex: number;
		latitude: string;
		longitude: string;
		keywordId: string;
		keywordText: string;
		request: LocalMapsMaterializedProviderRequest["params"];
	};
	providerTaskId?: string | null;
	event: { kind: "FOUND" | "ABSENT_WITHIN_DEPTH" | "RETRYABLE_FAILURE" | "PROVIDER_AUTH_FAILURE" | "OUTCOME_UNKNOWN"; reason?: string };
	targetRank?: number | null;
	evidenceEligible: boolean;
	provenance: {
		evidenceKind: "MAPS_SERP_PROVIDER";
		checkReference?: string | null;
		rawResponseReference?: string | null;
		rawResponseSha256?: string | null;
		providerObservedAt?: string | null;
	};
	cost: { status: "KNOWN" | "UNKNOWN"; currency: "USD"; amountUsd: string | null; basis: "actual" | "estimated" | null };
};

function configured(env: Record<string, string | undefined>): { id: string; endpoint: string; version: string; apiKey: string; timeoutMs: number } {
	const id = env.SELENA_LOCAL_MAPS_PROVIDER_ID?.trim();
	const endpoint = env.SELENA_LOCAL_MAPS_PROVIDER_ENDPOINT?.trim();
	const version = env.SELENA_LOCAL_MAPS_PROVIDER_VERSION?.trim();
	const apiKey = env.SELENA_LOCAL_MAPS_PROVIDER_API_KEY?.trim();
	const timeoutMs = Number(env.SELENA_LOCAL_MAPS_PROVIDER_TIMEOUT_MS ?? "15000");
	if (!id || !endpoint || !version || !apiKey || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000)
		throw new Error("LOCAL_MAPS_PROVIDER_CONFIGURATION_REQUIRED");
	if (/^(?:stub|noop)(?:-|$)/i.test(id)) throw new Error("LOCAL_MAPS_LIVE_PROVIDER_RESERVED_ID");
	new URL(endpoint);
	return { id, endpoint, version, apiKey, timeoutMs };
}

function sha256(value: string): `sha256:${string}` {
	return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function parseResponse(value: unknown): HttpLocalMapsResponse {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("LOCAL_MAPS_PROVIDER_RESPONSE_INVALID");
	const raw = value as Record<string, unknown>;
	if (!raw.event || typeof raw.evidenceEligible !== "boolean" || !raw.provenance || !raw.cost)
		throw new Error("LOCAL_MAPS_PROVIDER_RESPONSE_INVALID");
	return raw as unknown as HttpLocalMapsResponse;
}

/**
 * Provider-neutral live adapter. The owner chooses the endpoint and provider
 * identity through env; the endpoint must return the documented normalized
 * response envelope, including an immutable raw-response reference/hash.
 */
export function createHttpLocalMapsRankAdapter(env: Record<string, string | undefined> = process.env): LocalMapsRankAdapter<HttpLocalMapsResponse> {
	const config = configured(env);
	const capability: LocalMapsRankCapability = localMapsRankCapabilitySchema.parse({
		coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED",
		rawEvidenceReference: "REQUIRED",
		supportsAbsentWithinDepth: true,
		maxDepth: 20,
	});
	return {
		id: config.id,
		version: config.version,
		endpoint: config.endpoint,
		quote(lock: MapsLockV1): LocalMapsRankQuote {
			const parsed = mapsLockV1Schema.parse(lock);
			const quote = {
				tasks: parsed.expectedSlots,
				maxProviderAttempts: parsed.maxProviderAttempts,
				worstCaseCostUsd: parsed.budget.worstCaseCostUsd,
				currency: "USD" as const,
				priceSnapshotVersion: parsed.budget.priceSnapshotVersion,
			};
			return assertLocalMapsRankQuoteMatchesLock(parsed, quote);
		},
		async execute(task: LocalMapsMaterializedProviderRequest, permit: LocalMapsRankPermit): Promise<HttpLocalMapsResponse> {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
			try {
				const response = await fetch(config.endpoint, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json",
						authorization: `Bearer ${config.apiKey}`,
						"x-selena-attempt-id": permit.attemptId,
						"x-selena-execution-key": permit.executionKey,
					},
					body: JSON.stringify({
						keyword: task.keyword.text,
						location: formatLocalMapsLocationCoordinate(task),
						latitude: task.point.latitude,
						longitude: task.point.longitude,
						depth: task.params.depth,
						zoom: task.params.zoom,
						language: task.params.language,
						seDomain: task.params.seDomain,
						searchThisArea: task.params.searchThisArea,
						pointId: task.point.id,
						keywordId: task.keyword.id,
						permit,
					}),
					signal: controller.signal,
				});
				const text = await response.text();
				if (!response.ok) throw new Error(`LOCAL_MAPS_PROVIDER_HTTP_${response.status}`);
				const parsed = parseResponse(JSON.parse(text));
				if (parsed.provenance.rawResponseReference && !parsed.provenance.rawResponseSha256)
					parsed.provenance.rawResponseSha256 = sha256(text);
				return parsed;
			} finally {
				clearTimeout(timeout);
			}
		},
		normalize(result: HttpLocalMapsResponse) {
			return {
				coordinateProof: result.coordinateProof,
				providerTaskId: result.providerTaskId ?? null,
				event: result.event as never,
				targetRank: result.targetRank ?? null,
				evidenceEligible: result.evidenceEligible,
				provenance: result.provenance as never,
				cost: result.cost as never,
			};
		},
		capability: () => capability,
	};
}
