import type {
	BrightDataDatasetTransport,
	BrightDataDatasetTransportRequest,
} from "../providers/brightdata-dataset-client";
import { getBrightDataSocialDatasetBySource } from "./registry";

type FetchImpl = typeof fetch;

export type BrightDataSocialTransportOptions = Readonly<{
	apiToken: string;
	fetchImpl: FetchImpl;
	apiBaseUrl?: string;
	maxResponseBytes?: number;
	downloadTimeoutMs?: number;
	retryDelayMs?: number;
	sleep?: (milliseconds: number) => Promise<void>;
	now?: () => number;
}>;

export class BrightDataSocialTransportError extends Error {
	constructor(
		public readonly code: string,
		public readonly status?: number,
	) {
		super(status === undefined ? code : `${code}:${status}`);
		this.name = "BrightDataSocialTransportError";
	}
}

const DEFAULT_API_BASE_URL = "https://api.brightdata.com";
const DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_RETRY_DELAY_MS = 250;

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

async function readTextBounded(response: Response, maxBytes: number): Promise<string> {
	const contentLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(contentLength) && contentLength > maxBytes)
		throw new BrightDataSocialTransportError("BRIGHTDATA_RESPONSE_TOO_LARGE", response.status);
	if (!response.body) {
		const value = await response.text();
		if (new TextEncoder().encode(value).byteLength > maxBytes)
			throw new BrightDataSocialTransportError("BRIGHTDATA_RESPONSE_TOO_LARGE", response.status);
		return value;
	}
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let bytes = 0;
	let value = "";
	while (true) {
		const chunk = await reader.read();
		if (chunk.done) break;
		bytes += chunk.value.byteLength;
		if (bytes > maxBytes) {
			await reader.cancel();
			throw new BrightDataSocialTransportError("BRIGHTDATA_RESPONSE_TOO_LARGE", response.status);
		}
		value += decoder.decode(chunk.value, { stream: true });
	}
	return value + decoder.decode();
}

function parseJson(value: string, code: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		throw new BrightDataSocialTransportError(code);
	}
}

function assertRequestBinding(request: BrightDataDatasetTransportRequest) {
	const dataset = getBrightDataSocialDatasetBySource(request.source);
	if (dataset.runtimeStatus === "blocked_cost_and_pii")
		throw new BrightDataSocialTransportError("BRIGHTDATA_SOCIAL_DATASET_BLOCKED_COST_AND_PII");
	return dataset;
}

export function createBrightDataSocialTransport(options: BrightDataSocialTransportOptions): BrightDataDatasetTransport {
	if (!options.apiToken.trim()) throw new BrightDataSocialTransportError("BRIGHTDATA_TOKEN_REQUIRED");
	const apiBaseUrl = new URL(options.apiBaseUrl ?? DEFAULT_API_BASE_URL);
	if (apiBaseUrl.protocol !== "https:") throw new BrightDataSocialTransportError("BRIGHTDATA_HTTPS_REQUIRED");
	if (
		apiBaseUrl.origin !== DEFAULT_API_BASE_URL ||
		apiBaseUrl.username ||
		apiBaseUrl.password ||
		apiBaseUrl.pathname !== "/" ||
		apiBaseUrl.search ||
		apiBaseUrl.hash
	)
		throw new BrightDataSocialTransportError("BRIGHTDATA_API_ORIGIN_NOT_ALLOWED");
	const baseUrl = apiBaseUrl.toString().replace(/\/$/, "");
	const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
	const downloadTimeoutMs = options.downloadTimeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
	const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
	const sleep =
		options.sleep ?? ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
	const now = options.now ?? Date.now;

	function headers(): HeadersInit {
		return { Authorization: `Bearer ${options.apiToken.trim()}`, "Content-Type": "application/json" };
	}

	async function request(url: string, init: RequestInit, code: string): Promise<Response> {
		try {
			return await options.fetchImpl(url, init);
		} catch {
			throw new BrightDataSocialTransportError(code);
		}
	}

	async function getWithRetry(url: string, signal: AbortSignal): Promise<Response> {
		let lastFailure: BrightDataSocialTransportError | undefined;
		for (let attempt = 0; attempt < 3; attempt += 1) {
			try {
				const response = await request(url, { headers: headers(), signal }, "BRIGHTDATA_READ_TRANSPORT_FAILED");
				if ((response.status === 429 || response.status >= 500) && attempt < 2) {
					await response.body?.cancel();
					await sleep(retryDelayMs * 2 ** attempt);
					continue;
				}
				return response;
			} catch (error) {
				if (signal.aborted) throw error;
				lastFailure =
					error instanceof BrightDataSocialTransportError
						? error
						: new BrightDataSocialTransportError("BRIGHTDATA_READ_TRANSPORT_FAILED");
				if (attempt < 2) await sleep(retryDelayMs * 2 ** attempt);
			}
		}
		throw lastFailure ?? new BrightDataSocialTransportError("BRIGHTDATA_READ_TRANSPORT_FAILED");
	}

	return Object.freeze({
		async preflight(requestDetails, signal): Promise<void> {
			const dataset = assertRequestBinding(requestDetails);
			const response = await getWithRetry(
				`${baseUrl}/datasets/${encodeURIComponent(requestDetails.datasetId)}/metadata`,
				signal,
			);
			if (!response.ok) throw new BrightDataSocialTransportError("BRIGHTDATA_METADATA_FAILED", response.status);
			const payload = parseJson(await readTextBounded(response, maxResponseBytes), "BRIGHTDATA_METADATA_MALFORMED");
			const record = asRecord(payload);
			const fields = asRecord(record?.fields);
			if (!record || !fields) throw new BrightDataSocialTransportError("BRIGHTDATA_METADATA_MALFORMED");
			if (typeof record.id === "string" && record.id !== requestDetails.datasetId)
				throw new BrightDataSocialTransportError("BRIGHTDATA_DATASET_ID_MISMATCH");
			if (dataset.metadataSignature.some((field) => !(field in fields) || asRecord(fields[field])?.active === false))
				throw new BrightDataSocialTransportError("BRIGHTDATA_METADATA_SIGNATURE_MISMATCH");
		},

		async trigger(requestDetails, signal) {
			const dataset = assertRequestBinding(requestDetails);
			const url = new URL(`${baseUrl}/datasets/v3/trigger`);
			url.searchParams.set("dataset_id", requestDetails.datasetId);
			url.searchParams.set("notify", "false");
			url.searchParams.set("include_errors", "true");
			url.searchParams.set("format", "json");
			for (const [key, value] of Object.entries(dataset.triggerQuery)) url.searchParams.set(key, value);
			// Never retry this POST: an ambiguous failure may already be billable.
			const response = await request(
				url.toString(),
				{ method: "POST", headers: headers(), body: JSON.stringify(requestDetails.input.records), signal },
				"BRIGHTDATA_TRIGGER_TRANSPORT_FAILED",
			);
			if (!response.ok) throw new BrightDataSocialTransportError("BRIGHTDATA_TRIGGER_FAILED", response.status);
			const payload = asRecord(
				parseJson(await readTextBounded(response, maxResponseBytes), "BRIGHTDATA_TRIGGER_MALFORMED"),
			);
			if (typeof payload?.snapshot_id !== "string" || !payload.snapshot_id.trim())
				throw new BrightDataSocialTransportError("BRIGHTDATA_TRIGGER_MALFORMED");
			return { snapshotId: payload.snapshot_id.trim() };
		},

		async progress(snapshotId, signal) {
			const response = await getWithRetry(`${baseUrl}/datasets/v3/progress/${encodeURIComponent(snapshotId)}`, signal);
			if (!response.ok) throw new BrightDataSocialTransportError("BRIGHTDATA_PROGRESS_FAILED", response.status);
			const payload = asRecord(
				parseJson(await readTextBounded(response, maxResponseBytes), "BRIGHTDATA_PROGRESS_MALFORMED"),
			);
			if (typeof payload?.status !== "string" || !payload.status.trim())
				throw new BrightDataSocialTransportError("BRIGHTDATA_PROGRESS_MALFORMED");
			return { status: payload.status };
		},

		async download(snapshotId, signal) {
			const startedAt = now();
			while (now() - startedAt <= downloadTimeoutMs) {
				const url = new URL(`${baseUrl}/datasets/v3/snapshot/${encodeURIComponent(snapshotId)}`);
				url.searchParams.set("format", "json");
				const response = await getWithRetry(url.toString(), signal);
				if (response.status === 202 || response.status === 409) {
					await response.body?.cancel();
					await sleep(retryDelayMs);
					continue;
				}
				if (!response.ok) throw new BrightDataSocialTransportError("BRIGHTDATA_DOWNLOAD_FAILED", response.status);
				const payload = parseJson(await readTextBounded(response, maxResponseBytes), "BRIGHTDATA_DOWNLOAD_MALFORMED");
				const values = Array.isArray(payload) ? payload : [payload];
				return values.map((value) => {
					if (!asRecord(value)) throw new BrightDataSocialTransportError("BRIGHTDATA_DOWNLOAD_MALFORMED");
					return value;
				});
			}
			throw new BrightDataSocialTransportError("BRIGHTDATA_DOWNLOAD_TIMEOUT");
		},

		async cancel(snapshotId, signal): Promise<void> {
			const response = await request(
				`${baseUrl}/datasets/v3/snapshot/${encodeURIComponent(snapshotId)}/cancel`,
				{ method: "POST", headers: headers(), signal },
				"BRIGHTDATA_CANCEL_TRANSPORT_FAILED",
			);
			if (!response.ok) throw new BrightDataSocialTransportError("BRIGHTDATA_CANCEL_FAILED", response.status);
		},
	});
}
