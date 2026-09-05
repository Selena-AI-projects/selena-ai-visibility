import { createHash } from "node:crypto";
import {
	localMapsMaterializedProviderRequestSchema,
	mapsLockV1Schema,
	type LocalMapsMaterializedProviderRequest,
	type LocalMapsRankAdapter,
	type LocalMapsRankCapability,
	type LocalMapsRankNormalizedObservation,
	type LocalMapsRankQuote,
	type LocalMapsRankPermit,
	maximumProviderAttempts,
} from "@workspace/selena-visibility-contracts";
import { formatLocalMapsLocationCoordinate } from "@workspace/selena-visibility-contracts";

const ENDPOINT = "https://api.brightdata.com/request";
const PROVIDER_ID = "brightdata-google-maps-serp";
const VERSION = "brightdata-maps-serp-v1";

type FetchLike = typeof fetch;
type RawEnvelope = Readonly<{ request: LocalMapsMaterializedProviderRequest; payload: unknown; observedAt: string }>;

function sha256(value: unknown): `sha256:${string}` {
	return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function nonEmpty(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resultRows(payload: unknown): Record<string, unknown>[] {
	const root = Array.isArray(payload) ? payload[0] : payload;
	const record = asRecord(root);
	if (!record) throw new Error("BRIGHTDATA_LOCAL_MAPS_MALFORMED_RESPONSE");
	for (const key of ["local_results", "places", "maps_results", "local_pack"]) {
		if (Array.isArray(record[key])) return record[key].map(asRecord).filter((row): row is Record<string, unknown> => row !== null);
	}
	throw new Error("BRIGHTDATA_LOCAL_MAPS_MALFORMED_RESPONSE");
}

function rowMatchesTarget(row: Record<string, unknown>, request: LocalMapsMaterializedProviderRequest): boolean {
	const target = request.targetIdentity;
	const ids = [target.placeId, target.cid].filter(Boolean);
	const rowIds = [row.place_id, row.placeId, row.cid, row.data_id].filter((value): value is string => typeof value === "string");
	if (ids.some((id) => rowIds.includes(id as string))) return true;
	const mapsUrl = nonEmpty(row.maps_url) ?? nonEmpty(row.url) ?? nonEmpty(row.link);
	if (mapsUrl && mapsUrl === target.mapsUrl) return true;
	if (target.matchPolicy !== "REVIEWED_NAME_ADDRESS_FALLBACK") return false;
	const name = nonEmpty(row.name) ?? nonEmpty(row.title);
	const address = nonEmpty(row.address) ?? nonEmpty(row.location);
	return name === target.matchedName && address === target.matchedAddress;
}

function rankFor(payload: unknown, request: LocalMapsMaterializedProviderRequest): number | null {
	const rows = resultRows(payload);
	const index = rows.findIndex((row) => rowMatchesTarget(row, request));
	return index < 0 ? null : index + 1 <= request.params.depth ? index + 1 : null;
}

function providerTaskId(payload: unknown): string | null {
	const record = asRecord(Array.isArray(payload) ? payload[0] : payload);
	for (const key of ["request_id", "requestId", "id", "snapshot_id"]) {
		const value = nonEmpty(record?.[key]);
		if (value) return value;
	}
	return null;
}

function buildUrl(request: LocalMapsMaterializedProviderRequest): string {
	const coordinate = formatLocalMapsLocationCoordinate(request);
	const url = new URL("https://www.google.com/search");
	url.searchParams.set("q", request.keyword.text);
	url.searchParams.set("tbm", "lcl");
	url.searchParams.set("ll", `@${coordinate.replaceAll(",", ",")}`);
	url.searchParams.set("num", String(request.params.depth));
	url.searchParams.set("hl", request.params.language);
	url.searchParams.set("gl", request.params.seDomain.replace(/^.*\./, ""));
	url.searchParams.set("brd_json", "1");
	return url.toString();
}

function normalizedError(error: unknown): Error {
	if (error instanceof Error && error.message === "BRIGHTDATA_LOCAL_MAPS_PROVIDER_AUTH_FAILURE") return error;
	return new Error("BRIGHTDATA_LOCAL_MAPS_MALFORMED_RESPONSE");
}

export type BrightDataLocalMapsAdapterOptions = Readonly<{ apiKey: string; fetchImpl?: FetchLike; now?: () => Date }>;

/** Coordinate-aware Bright Data SERP adapter. It is injectable and never registered by this module. */
export function createBrightDataLocalMapsRankAdapter(options: BrightDataLocalMapsAdapterOptions): LocalMapsRankAdapter<RawEnvelope> {
	if (!options.apiKey.trim()) throw new Error("BRIGHTDATA_API_TOKEN_REQUIRED");
	const fetchImpl = options.fetchImpl ?? fetch;
	const now = options.now ?? (() => new Date());
	const capability: LocalMapsRankCapability = {
		coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED",
		rawEvidenceReference: "REQUIRED",
		supportsAbsentWithinDepth: true,
		maxDepth: 20,
	};
	return Object.freeze({
		id: PROVIDER_ID,
		version: VERSION,
		endpoint: ENDPOINT,
		quote(lockInput): LocalMapsRankQuote {
			const lock = mapsLockV1Schema.parse(lockInput);
			return { tasks: lock.expectedSlots, maxProviderAttempts: maximumProviderAttempts(lock.expectedSlots), worstCaseCostUsd: lock.budget.worstCaseCostUsd, currency: "USD", priceSnapshotVersion: lock.budget.priceSnapshotVersion };
		},
		async execute(requestInput, _permit: LocalMapsRankPermit): Promise<RawEnvelope> {
			const request = localMapsMaterializedProviderRequestSchema.parse(requestInput);
			let response: Response;
			try {
				response = await fetchImpl(ENDPOINT, {
					method: "POST",
					headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
					body: JSON.stringify({ zone: process.env.BRIGHTDATA_SERP_ZONE ?? "sdk_serp", url: buildUrl(request), method: "GET", format: "raw" }),
				});
			} catch {
				throw new Error("BRIGHTDATA_LOCAL_MAPS_PROVIDER_TRANSPORT_FAILURE");
			}
			if (response.status === 401 || response.status === 403) throw new Error("BRIGHTDATA_LOCAL_MAPS_PROVIDER_AUTH_FAILURE");
			if (!response.ok) throw new Error(response.status === 429 || response.status >= 500 ? "BRIGHTDATA_LOCAL_MAPS_PROVIDER_RETRYABLE_FAILURE" : "BRIGHTDATA_LOCAL_MAPS_MALFORMED_RESPONSE");
			let payload: unknown;
			try { payload = JSON.parse(await response.text()) as unknown; } catch { throw new Error("BRIGHTDATA_LOCAL_MAPS_MALFORMED_RESPONSE"); }
			return Object.freeze({ request, payload, observedAt: now().toISOString() });
		},
		normalize(envelope): LocalMapsRankNormalizedObservation {
			const request = localMapsMaterializedProviderRequestSchema.parse(envelope.request);
			const payload = envelope.payload;
			let rank: number | null;
			try { rank = rankFor(payload, request); } catch (error) { throw normalizedError(error); }
			const rawReference = `brightdata:sha256:${sha256(payload).slice("sha256:".length)}`;
			const coordinateProof = { pointId: request.point.id, pointIndex: request.point.pointIndex, latitude: request.point.latitude, longitude: request.point.longitude, keywordId: request.keyword.id, keywordText: request.keyword.text, request: request.params };
			return {
				coordinateProof,
				providerTaskId: providerTaskId(payload),
				event: rank === null ? { kind: "ABSENT_WITHIN_DEPTH" } : { kind: "FOUND" },
				targetRank: rank,
				evidenceEligible: true,
				provenance: { evidenceKind: "MAPS_SERP_PROVIDER", checkReference: rawReference, rawResponseReference: rawReference, rawResponseSha256: sha256(payload), providerObservedAt: envelope.observedAt },
				cost: { status: "KNOWN", currency: "USD", amountUsd: "0.001500", basis: "estimated" },
			};
		},
		capability: () => capability,
	});
}

export { buildUrl as buildBrightDataLocalMapsUrl };
