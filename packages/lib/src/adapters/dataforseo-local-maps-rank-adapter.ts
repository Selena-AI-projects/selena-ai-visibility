import { createHash } from "node:crypto";
import {
	assertLocalMapsRankQuoteMatchesLock,
	formatLocalMapsLocationCoordinate,
	type LocalMapsMaterializedProviderRequest,
	type LocalMapsRankAdapter,
	type LocalMapsRankCapability,
	type LocalMapsRankPermit,
	type LocalMapsRankQuote,
	localMapsRankCapabilitySchema,
	type MapsLockV1,
	mapsLockV1Schema,
} from "@workspace/selena-visibility-contracts";

const DEFAULT_ENDPOINT = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced";
const USD = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;

type DataForSeoRaw = {
	version?: string;
	status_code?: number;
	status_message?: string;
	cost?: number | string;
	tasks?: Array<{
		id?: string;
		status_code?: number;
		status_message?: string;
		result?: Array<{
			check_url?: string;
			items?: Array<Record<string, unknown>>;
		}>;
	}>;
	/** Internal request echo used to build the contract proof; never sent to the provider. */
	__task?: LocalMapsMaterializedProviderRequest;
	__rawResponseBody?: string;
	__httpStatus?: number;
	__malformedResponse?: boolean;
};

type DataForSeoConfig = {
	endpoint: string;
	version: string;
	login: string;
	password: string;
	priceUsd: string;
	timeoutMs: number;
};

function configFrom(env: Record<string, string | undefined>): DataForSeoConfig {
	const login = env.DATAFORSEO_LOGIN?.trim();
	const password = env.DATAFORSEO_PASSWORD?.trim();
	const endpoint = env.SELENA_LOCAL_DATAFORSEO_ENDPOINT?.trim() || DEFAULT_ENDPOINT;
	const version = env.SELENA_LOCAL_DATAFORSEO_VERSION?.trim();
	const priceUsd = env.SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD?.trim();
	const timeoutMs = Number(env.SELENA_LOCAL_DATAFORSEO_TIMEOUT_MS ?? "15000");
	if (
		!login ||
		!password ||
		!version ||
		!priceUsd ||
		!USD.test(priceUsd) ||
		!Number.isSafeInteger(timeoutMs) ||
		timeoutMs < 1000 ||
		timeoutMs > 120000
	)
		throw new Error("LOCAL_DATAFORSEO_CONFIGURATION_REQUIRED");
	new URL(endpoint);
	return { endpoint, version, login, password, priceUsd, timeoutMs };
}

function sha256(value: string): `sha256:${string}` {
	return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function rankItemMatches(item: Record<string, unknown>, task: LocalMapsMaterializedProviderRequest): boolean {
	const paidType = [item.type, item.item_type, item.kind].some(
		(value) => String(value ?? "").toLowerCase() === "maps_paid_item",
	);
	if (paidType) return false;
	const identity = task.targetIdentity;
	if (identity.placeId && item.place_id === identity.placeId) return true;
	if (identity.cid && String(item.cid ?? "") === identity.cid) return true;
	return false;
}

function asEstimatedCost(priceUsd: string) {
	return { status: "KNOWN" as const, currency: "USD" as const, amountUsd: priceUsd, basis: "estimated" as const };
}

function asActualOrUnknown(value: unknown) {
	const amount =
		typeof value === "number" && Number.isFinite(value)
			? value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")
			: typeof value === "string"
				? value.trim()
				: "";
	if (amount && USD.test(amount) && Number(amount) >= 0)
		return { status: "KNOWN" as const, currency: "USD" as const, amountUsd: amount, basis: "actual" as const };
	return { status: "UNKNOWN" as const, currency: "USD" as const, amountUsd: null, basis: null };
}

function coordinateProof(task: LocalMapsMaterializedProviderRequest) {
	return {
		pointId: task.point.id,
		pointIndex: task.point.pointIndex,
		latitude: task.point.latitude,
		longitude: task.point.longitude,
		keywordId: task.keyword.id,
		keywordText: task.keyword.text,
		request: task.params,
	};
}

function responseTask(value: unknown): {
	raw: DataForSeoRaw;
	task: NonNullable<DataForSeoRaw["tasks"]>[number];
	result: NonNullable<NonNullable<DataForSeoRaw["tasks"]>[number]["result"]>[number] & {
		items: Array<Record<string, unknown>>;
	};
} {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("LOCAL_DATAFORSEO_RESPONSE_INVALID");
	const raw = value as DataForSeoRaw;
	const task = raw.tasks?.[0];
	const result = task?.result?.[0];
	if (!task || !result || !Array.isArray(result.items)) throw new Error("LOCAL_DATAFORSEO_RESPONSE_INVALID");
	return { raw, task, result: result as { check_url?: string; items: Array<Record<string, unknown>> } };
}

export function createDataForSeoLocalMapsRankAdapter(
	env: Record<string, string | undefined> = process.env,
): LocalMapsRankAdapter<DataForSeoRaw> {
	const config = configFrom(env);
	const capability: LocalMapsRankCapability = localMapsRankCapabilitySchema.parse({
		coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED",
		rawEvidenceReference: "REQUIRED",
		supportsAbsentWithinDepth: true,
		maxDepth: 20,
	});
	return {
		id: "dataforseo-google-maps",
		version: config.version,
		endpoint: config.endpoint,
		quote(lock: MapsLockV1): LocalMapsRankQuote {
			const parsed = mapsLockV1Schema.parse(lock);
			return assertLocalMapsRankQuoteMatchesLock(parsed, {
				tasks: parsed.expectedSlots,
				maxProviderAttempts: parsed.maxProviderAttempts,
				worstCaseCostUsd: parsed.budget.worstCaseCostUsd,
				currency: "USD",
				priceSnapshotVersion: parsed.budget.priceSnapshotVersion,
			});
		},
		async execute(task, _permit: LocalMapsRankPermit): Promise<DataForSeoRaw> {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
			try {
				const auth = Buffer.from(`${config.login}:${config.password}`, "utf8").toString("base64");
				const response = await fetch(config.endpoint, {
					method: "POST",
					headers: { accept: "application/json", "content-type": "application/json", authorization: `Basic ${auth}` },
					body: JSON.stringify([
						{
							keyword: task.keyword.text,
							location_coordinate: formatLocalMapsLocationCoordinate(task),
							language_code: task.params.language,
							se_domain: task.params.seDomain,
							device: "mobile",
							os: task.params.os,
							depth: task.params.depth,
							search_this_area: task.params.searchThisArea,
						},
					]),
					signal: controller.signal,
				});
				const text = await response.text();
				if (!response.ok)
					return {
						status_code: response.status,
						status_message: text.slice(0, 500),
						__httpStatus: response.status,
						__rawResponseBody: text,
						__task: task,
					};
				try {
					return { ...(JSON.parse(text) as DataForSeoRaw), __rawResponseBody: text, __task: task };
				} catch {
					return {
						status_code: response.status,
						status_message: "MALFORMED_JSON",
						__malformedResponse: true,
						__rawResponseBody: text,
						__task: task,
					};
				}
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError")
					return {
						status_code: 408,
						status_message: "TIMEOUT",
						__httpStatus: 408,
						__rawResponseBody: "",
						__task: task,
					};
				throw error;
			} finally {
				clearTimeout(timeout);
			}
		},
		normalize(rawValue) {
			const task = rawValue.__task;
			if (!task) throw new Error("LOCAL_DATAFORSEO_REQUEST_ECHO_MISSING");
			const {
				__task: _ignored,
				__rawResponseBody: rawResponseBody,
				__httpStatus,
				__malformedResponse,
				...providerPayload
			} = rawValue;
			const rawText = rawResponseBody ?? JSON.stringify(providerPayload);
			const rawResponseSha256 = sha256(rawText);
			if (!providerPayload || typeof providerPayload !== "object" || Array.isArray(providerPayload))
				throw new Error("LOCAL_DATAFORSEO_RESPONSE_INVALID");
			const raw = providerPayload as DataForSeoRaw;
			const providerTask = raw.tasks?.[0];
			const proof = coordinateProof(task);
			const observedAt = new Date().toISOString();
			const base = {
				coordinateProof: proof,
				providerTaskId: providerTask?.id ?? null,
				provenance: {
					evidenceKind: "MAPS_SERP_PROVIDER" as const,
					checkReference:
						providerTask?.result?.[0]?.check_url ??
						`dataforseo-task:${providerTask?.id ?? raw.status_code ?? "unknown"}`,
					rawResponseReference: `dataforseo-local:${rawResponseSha256}`,
					rawResponseSha256,
					providerObservedAt: observedAt,
				},
				cost: asActualOrUnknown(raw.cost),
				rawResponseBody: rawText,
			};
			if (
				__httpStatus === 401 ||
				__httpStatus === 403 ||
				raw.status_code === 401 ||
				raw.status_code === 403 ||
				providerTask?.status_code === 401 ||
				providerTask?.status_code === 403
			)
				return {
					...base,
					event: { kind: "PROVIDER_AUTH_FAILURE" as const },
					targetRank: null,
					evidenceEligible: false,
					cost: asEstimatedCost(config.priceUsd),
				};
			if (__httpStatus === 429)
				return base.cost.status === "KNOWN"
					? {
							...base,
							event: { kind: "RETRYABLE_FAILURE" as const, reason: "RATE_LIMITED" as const },
							targetRank: null,
							evidenceEligible: false,
						}
					: {
							...base,
							event: { kind: "OUTCOME_UNKNOWN" as const },
							targetRank: null,
							evidenceEligible: false,
							cost: { status: "UNKNOWN" as const, currency: "USD" as const, amountUsd: null, basis: null },
						};
			if (__httpStatus !== undefined && (__httpStatus === 408 || __httpStatus >= 500))
				return base.cost.status === "KNOWN"
					? {
							...base,
							event: {
								kind: "RETRYABLE_FAILURE" as const,
								reason: __httpStatus === 408 ? ("TIMEOUT" as const) : ("PROVIDER_5XX" as const),
							},
							targetRank: null,
							evidenceEligible: false,
						}
					: {
							...base,
							event: { kind: "OUTCOME_UNKNOWN" as const },
							targetRank: null,
							evidenceEligible: false,
							cost: { status: "UNKNOWN" as const, currency: "USD" as const, amountUsd: null, basis: null },
						};
			if (__malformedResponse || !providerTask)
				return base.cost.status === "KNOWN"
					? {
							...base,
							event: { kind: "RETRYABLE_FAILURE" as const, reason: "MALFORMED_RESPONSE" as const },
							targetRank: null,
							evidenceEligible: false,
						}
					: {
							...base,
							event: { kind: "OUTCOME_UNKNOWN" as const },
							targetRank: null,
							evidenceEligible: false,
							cost: base.cost,
						};
			if (raw.status_code !== 20000 || providerTask.status_code !== 20000)
				return base.cost.status === "KNOWN"
					? {
							...base,
							event: { kind: "RETRYABLE_FAILURE" as const, reason: "PROVIDER_5XX" as const },
							targetRank: null,
							evidenceEligible: false,
						}
					: {
							...base,
							event: { kind: "OUTCOME_UNKNOWN" as const },
							targetRank: null,
							evidenceEligible: false,
							cost: { status: "UNKNOWN" as const, currency: "USD" as const, amountUsd: null, basis: null },
						};
			if (base.cost.status !== "KNOWN")
				return {
					...base,
					event: { kind: "OUTCOME_UNKNOWN" as const },
					targetRank: null,
					evidenceEligible: false,
					cost: base.cost,
				};
			const { result } = responseTask(providerPayload);
			const match = result.items.find((item) => rankItemMatches(item, task));
			const rank = match ? Number(match.rank_group ?? match.rank_absolute) : null;
			if (rank !== null && Number.isInteger(rank) && rank >= 1 && rank <= 20)
				return { ...base, event: { kind: "FOUND" as const }, targetRank: rank, evidenceEligible: true };
			return { ...base, event: { kind: "ABSENT_WITHIN_DEPTH" as const }, targetRank: null, evidenceEligible: true };
		},
		capability: () => capability,
	};
}
