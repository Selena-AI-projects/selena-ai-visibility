import {
	assertLocalMapsRehearsalResultMatchesRequest,
	LOCAL_GRID_FORMULA_VERSION,
	localMapsRehearsalRequestSchema,
	localMapsRehearsalResultSchema,
	mapsLockV1Schema,
	planMapsLockSlots,
	sphericalGridPointsV1,
} from "@workspace/selena-visibility-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalMapsRehearsalRequest, createStubLocalMapsAdapter } from "./stub-local-maps-adapter";

const ids = {
	measurementCycleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	locationId: "11111111-1111-4111-8111-111111111111",
	keywordSetId: "77777777-7777-4777-8777-777777777777",
};
const keywordIds = [
	"22222222-2222-4222-8222-222222222222",
	"33333333-3333-4333-8333-333333333333",
	"44444444-4444-4444-8444-444444444444",
	"55555555-5555-4555-8555-555555555555",
	"66666666-6666-4666-8666-666666666666",
];

const lock = mapsLockV1Schema.parse({
	schemaVersion: 1,
	domainId: "LOCAL_MAPS",
	lockVersion: 1,
	locationId: ids.locationId,
	targetIdentity: {
		placeId: "ChIJ-synthetic-test",
		mapsUrl: "https://maps.example/target",
		identitySource: "USER_CONFIRMED",
		matchPolicy: "PLACE_ID_OR_CID",
	},
	grid: sphericalGridPointsV1({
		formulaVersion: LOCAL_GRID_FORMULA_VERSION,
		locationId: ids.locationId,
		centerLatitude: -8.506854,
		centerLongitude: 115.262482,
		radiusMeters: 3000,
		size: 5,
	}),
	keywordSet: { id: ids.keywordSetId, version: 1, keywordIds },
	provider: {
		id: "maps-provider-under-test",
		endpoint: "provider-endpoint-under-test",
		version: "v1",
		rankEvidenceSource: "MAPS_SERP_PROVIDER",
		placesApiUsed: false,
	},
	request: {
		device: "MOBILE",
		os: "android",
		language: "en",
		seDomain: "google.co.id",
		zoom: 13,
		depth: 20,
		searchThisArea: true,
	},
	timestampWindow: { startsAt: "2026-08-30T00:00:00.000Z", endsAt: "2026-08-31T00:00:00.000Z" },
	repeats: 1,
	expectedSlots: 125,
	maxProviderAttempts: 375,
	retryPolicy: { maxAttemptsPerSlot: 3, genericQueueRetryLimit: 0 },
	budget: {
		currency: "USD",
		surfaceCapUsd: "0.500000",
		monthlyCapUsd: "15.000000",
		worstCaseCostUsd: "0.225000",
		priceSnapshotVersion: "maps-provider-test-v1",
	},
});

function rehearsalRequests() {
	return planMapsLockSlots(ids.measurementCycleId, lock).map((slot) =>
		createLocalMapsRehearsalRequest({
			lock,
			slot,
			keyword: {
				id: slot.keywordId,
				text: `synthetic-${slot.keywordId}`,
				keywordSetId: lock.keywordSet.id,
				keywordSetVersion: lock.keywordSet.version,
			},
		}),
	);
}

afterEach(() => vi.unstubAllGlobals());

describe("deterministic Local Maps rehearsal stub", () => {
	it("rehearses 125 slots once with zero transport calls, evidence eligibility or cost", async () => {
		const fetchSpy = vi.fn(async () => {
			throw new Error("NETWORK_CALL_FORBIDDEN");
		});
		vi.stubGlobal("fetch", fetchSpy);
		const adapter = createStubLocalMapsAdapter();
		const requests = rehearsalRequests();
		const results = await Promise.all(requests.map((request) => adapter.execute(request)));

		expect(requests).toHaveLength(125);
		expect(results).toHaveLength(125);
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(results.every((result) => result.externalProviderCalls === 0)).toBe(true);
		expect(results.every((result) => result.costUsd === "0.000000")).toBe(true);
		expect(results.every((result) => result.persistable === false && result.evidenceEligible === false)).toBe(true);
		expect(new Set(results.map((result) => result.event.kind))).toEqual(new Set(["FOUND", "ABSENT_WITHIN_DEPTH"]));
		expect(
			results.every((result) => {
				if (result.event.kind !== "FOUND") return true;
				return result.targetRank !== null && result.targetRank >= 1 && result.targetRank <= 20;
			}),
		).toBe(true);
	});

	it("returns byte-identical output bound to the full frozen request snapshot", async () => {
		const adapter = createStubLocalMapsAdapter();
		const request = rehearsalRequests()[0];
		if (!request) throw new Error("TEST_REQUEST_MISSING");
		const first = await adapter.execute(request);
		const second = await adapter.execute(request);
		expect(first).toEqual(second);
		expect(first.requestSnapshotDigest).toBe(request.requestSnapshotDigest);
		expect(first.requestCoordinate).toEqual({
			pointId: request.slot.pointId,
			latitude: request.slot.latitude,
			longitude: request.slot.longitude,
		});
		expect(first.rawReference).toMatch(/^stub-local-maps:sha256:[a-f0-9]{64}$/);
	});

	it("rejects lock, slot and digest tampering before producing a result", async () => {
		const adapter = createStubLocalMapsAdapter();
		const request = rehearsalRequests()[0];
		if (!request) throw new Error("TEST_REQUEST_MISSING");
		await expect(
			adapter.execute({ ...request, lock: { ...request.lock, request: { ...request.lock.request, zoom: 12 } } }),
		).rejects.toThrow("LOCAL_MAPS_REHEARSAL_SNAPSHOT_TAMPERED");
		expect(
			localMapsRehearsalRequestSchema.safeParse({
				...request,
				slot: { ...request.slot, providerVersion: "other-version" },
			}).success,
		).toBe(false);
	});

	it("cannot relabel rehearsal output as live or evidence-eligible", async () => {
		const request = rehearsalRequests()[0];
		if (!request) throw new Error("TEST_REQUEST_MISSING");
		const result = await createStubLocalMapsAdapter().execute(request);
		expect(localMapsRehearsalResultSchema.safeParse({ ...result, mode: "LIVE_PROVIDER" }).success).toBe(false);
		expect(localMapsRehearsalResultSchema.safeParse({ ...result, persistable: true }).success).toBe(false);
		expect(localMapsRehearsalResultSchema.safeParse({ ...result, evidenceEligible: true }).success).toBe(false);
		expect(localMapsRehearsalResultSchema.safeParse({ ...result, externalProviderCalls: 1 }).success).toBe(false);
		expect(() =>
			assertLocalMapsRehearsalResultMatchesRequest(request, {
				...result,
				executionKey: `${result.executionKey}-other`,
			}),
		).toThrow("LOCAL_MAPS_REHEARSAL_RESULT_REQUEST_MISMATCH");
		expect(() =>
			assertLocalMapsRehearsalResultMatchesRequest(request, {
				...result,
				rawReference: `stub-local-maps:sha256:${"0".repeat(64)}`,
			}),
		).toThrow("LOCAL_MAPS_REHEARSAL_RESULT_REQUEST_MISMATCH");
		const opposite =
			result.event.kind === "FOUND"
				? ({ ...result, event: { kind: "ABSENT_WITHIN_DEPTH" as const }, targetRank: null } as const)
				: ({ ...result, event: { kind: "FOUND" as const }, targetRank: 1 } as const);
		expect(() => assertLocalMapsRehearsalResultMatchesRequest(request, opposite)).toThrow(
			"LOCAL_MAPS_REHEARSAL_RESULT_REQUEST_MISMATCH",
		);
	});
});
