import { describe, expect, it, vi } from "vitest";
import { localMapsMaterializedProviderRequestSchema } from "@workspace/selena-visibility-contracts";
import { buildBrightDataLocalMapsUrl, createBrightDataLocalMapsRankAdapter } from "./brightdata-local-maps-rank-adapter";

const request = localMapsMaterializedProviderRequestSchema.parse({
	schemaVersion: 1,
	provider: { id: "brightdata-google-maps-serp", endpoint: "https://api.brightdata.com/request", version: "brightdata-maps-serp-v1", rankEvidenceSource: "MAPS_SERP_PROVIDER", placesApiUsed: false },
	point: { id: "11111111-1111-4111-8111-111111111111", pointIndex: 0, latitude: "-8.506854", longitude: "115.262482" },
	keyword: { id: "22222222-2222-4222-8222-222222222222", text: "vegan restaurant", keywordSetId: "33333333-3333-4333-8333-333333333333", keywordSetVersion: 1 },
	targetIdentity: { placeId: "ChIJtarget", mapsUrl: "https://maps.google.com/?cid=1", identitySource: "USER_CONFIRMED", matchPolicy: "PLACE_ID_OR_CID" },
	params: { device: "MOBILE", os: "android", language: "en", seDomain: "google.co.id", zoom: 13, depth: 20, searchThisArea: true },
	repeatIndex: 0,
});

describe("Bright Data Local Maps SERP adapter", () => {
	it("builds coordinate-aware Google local SERP requests", () => {
		const url = new URL(buildBrightDataLocalMapsUrl(request));
		expect(url.searchParams.get("tbm")).toBe("lcl");
		expect(url.searchParams.get("ll")).toContain("-8.506854,115.262482,13");
		expect(url.searchParams.get("q")).toBe("vegan restaurant");
	});

	it("normalizes a target rank with immutable raw evidence reference", () => {
		const adapter = createBrightDataLocalMapsRankAdapter({ apiKey: "test-key", fetchImpl: vi.fn() as typeof fetch });
		const normalized = adapter.normalize({ request, observedAt: "2026-09-05T00:00:00.000Z", payload: { local_results: [{ place_id: "other" }, { place_id: "ChIJtarget" }] } });
		expect(normalized.event).toEqual({ kind: "FOUND" });
		expect(normalized.targetRank).toBe(2);
		expect(normalized.coordinateProof.latitude).toBe(request.point.latitude);
		expect(normalized.provenance.rawResponseSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
		expect(normalized.provenance.rawResponseReference).toMatch(/^brightdata:sha256:/);
	});

	it("maps a valid response without the target to absent within depth", () => {
		const adapter = createBrightDataLocalMapsRankAdapter({ apiKey: "test-key", fetchImpl: vi.fn() as typeof fetch });
		const normalized = adapter.normalize({ request, observedAt: "2026-09-05T00:00:00.000Z", payload: { local_results: [{ place_id: "other" }] } });
		expect(normalized.event).toEqual({ kind: "ABSENT_WITHIN_DEPTH" });
		expect(normalized.targetRank).toBeNull();
	});

	it("rejects malformed responses and missing credentials before I/O", () => {
		const fetchImpl = vi.fn() as typeof fetch;
		expect(() => createBrightDataLocalMapsRankAdapter({ apiKey: "", fetchImpl })).toThrow("BRIGHTDATA_API_TOKEN_REQUIRED");
		const adapter = createBrightDataLocalMapsRankAdapter({ apiKey: "test-key", fetchImpl });
		expect(() => adapter.normalize({ request, observedAt: "2026-09-05T00:00:00.000Z", payload: {} })).toThrow("BRIGHTDATA_LOCAL_MAPS_MALFORMED_RESPONSE");
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("declares exact coordinate, raw evidence and depth capabilities", () => {
		const adapter = createBrightDataLocalMapsRankAdapter({ apiKey: "test-key", fetchImpl: vi.fn() as typeof fetch });
		expect(adapter.capability()).toEqual({ coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED", rawEvidenceReference: "REQUIRED", supportsAbsentWithinDepth: true, maxDepth: 20 });
	});
});
