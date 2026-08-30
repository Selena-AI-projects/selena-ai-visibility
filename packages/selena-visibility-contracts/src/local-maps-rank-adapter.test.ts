import { describe, expect, it } from "vitest";
import { maximumProviderAttempts } from "./local-execution";
import { mapsLockV1Schema, planMapsLockSlots } from "./local-locks";
import { materializeLocalMapsProviderRequest } from "./local-maps-live";
import {
	assertLocalMapsRankCapabilitySupportsTask,
	assertLocalMapsRankCoordinateProofMatchesTask,
	assertLocalMapsRankQuoteMatchesLock,
	formatLocalMapsLocationCoordinate,
	localMapsRankCapabilitySchema,
	localMapsRankPermitSchema,
	localMapsRankQuoteSchema,
} from "./local-maps-rank-adapter";
import { LOCAL_GRID_FORMULA_VERSION, sphericalGridPointsV1 } from "./visibility-os";

const lock = mapsLockV1Schema.parse({
	schemaVersion: 1,
	domainId: "LOCAL_MAPS",
	lockVersion: 1,
	locationId: "11111111-1111-4111-8111-111111111111",
	targetIdentity: {
		placeId: "ChIJ-adapter-test",
		mapsUrl: "https://maps.example/adapter-test",
		identitySource: "USER_CONFIRMED",
		matchPolicy: "PLACE_ID_OR_CID",
	},
	grid: sphericalGridPointsV1({
		formulaVersion: LOCAL_GRID_FORMULA_VERSION,
		locationId: "11111111-1111-4111-8111-111111111111",
		centerLatitude: -8.506854,
		centerLongitude: 115.262482,
		radiusMeters: 3000,
		size: 3,
	}),
	keywordSet: {
		id: "77777777-7777-4777-8777-777777777777",
		version: 1,
		keywordIds: ["22222222-2222-4222-8222-222222222222"],
	},
	provider: {
		id: "maps-adapter-v1",
		endpoint: "maps-adapter-endpoint-v1",
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
	expectedSlots: 9,
	maxProviderAttempts: 27,
	retryPolicy: { maxAttemptsPerSlot: 3, genericQueueRetryLimit: 0 },
	budget: {
		currency: "USD",
		surfaceCapUsd: "1.000000",
		monthlyCapUsd: "10.000000",
		worstCaseCostUsd: "0.270000",
		priceSnapshotVersion: "maps-adapter-price-v1",
	},
});

const quote = {
	tasks: lock.expectedSlots,
	maxProviderAttempts: maximumProviderAttempts(lock.expectedSlots),
	worstCaseCostUsd: lock.budget.worstCaseCostUsd,
	currency: "USD" as const,
	priceSnapshotVersion: lock.budget.priceSnapshotVersion,
};

describe("LocalMapsRankAdapter contract", () => {
	it("accepts the lock-derived quote and rejects cardinality or price drift", () => {
		expect(localMapsRankQuoteSchema.parse(quote)).toEqual(quote);
		expect(assertLocalMapsRankQuoteMatchesLock(lock, quote)).toEqual(quote);
		expect(() => assertLocalMapsRankQuoteMatchesLock(lock, { ...quote, tasks: quote.tasks - 1 })).toThrow(
			"LOCAL_MAPS_RANK_QUOTE_LOCK_MISMATCH",
		);
		expect(() =>
			assertLocalMapsRankQuoteMatchesLock(lock, { ...quote, priceSnapshotVersion: "other-price-v1" }),
		).toThrow("LOCAL_MAPS_RANK_QUOTE_LOCK_MISMATCH");
	});

	it("keeps permit identity and capability requirements explicit", () => {
		expect(
			localMapsRankPermitSchema.parse({
				organizationId: "org-adapter",
				attemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				reservationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
				executionKey: "LOCAL_MAPS|cycle|point|keyword|provider|0|1",
				attemptIndex: 1,
			}),
		).toMatchObject({ attemptIndex: 1 });
		expect(
			localMapsRankCapabilitySchema.parse({
				coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED",
				rawEvidenceReference: "REQUIRED",
				supportsAbsentWithinDepth: true,
				maxDepth: 20,
			}),
		).toMatchObject({ supportsAbsentWithinDepth: true });
		expect(() =>
			localMapsRankCapabilitySchema.parse({
				coordinateProof: "OPTIONAL",
				rawEvidenceReference: "REQUIRED",
				supportsAbsentWithinDepth: true,
				maxDepth: 20,
			}),
		).toThrow();
	});

	it("rejects a normalized response with missing or altered coordinate/request echo", () => {
		const slot = planMapsLockSlots("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", lock)[0];
		if (!slot) throw new Error("TEST_SLOT_MISSING");
		const task = materializeLocalMapsProviderRequest(lock, slot, {
			id: "22222222-2222-4222-8222-222222222222",
			text: "cafes ubud",
			keywordSetId: lock.keywordSet.id,
			keywordSetVersion: lock.keywordSet.version,
		});
		const proof = {
			pointId: task.point.id,
			pointIndex: task.point.pointIndex,
			latitude: task.point.latitude,
			longitude: task.point.longitude,
			keywordId: task.keyword.id,
			keywordText: task.keyword.text,
			request: task.params,
		};
		expect(assertLocalMapsRankCoordinateProofMatchesTask(task, proof)).toEqual(proof);
		expect(() => assertLocalMapsRankCoordinateProofMatchesTask(task, { ...proof, longitude: "0" })).toThrow(
			"LOCAL_MAPS_RANK_COORDINATE_PROOF_MISMATCH",
		);
		expect(() => assertLocalMapsRankCoordinateProofMatchesTask(task, undefined as never)).toThrow();
	});

	it("formats the locked location_coordinate wire value", () => {
		const slot = planMapsLockSlots("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", lock)[0];
		if (!slot) throw new Error("TEST_SLOT_MISSING");
		const task = materializeLocalMapsProviderRequest(lock, slot, {
			id: "22222222-2222-4222-8222-222222222222",
			text: "cafes ubud",
			keywordSetId: lock.keywordSet.id,
			keywordSetVersion: lock.keywordSet.version,
		});
		expect(formatLocalMapsLocationCoordinate(task)).toBe(
			`${task.point.latitude},${task.point.longitude},${lock.request.zoom}`,
		);
	});

	it("rejects a provider capability whose depth is below the locked request", () => {
		const slot = planMapsLockSlots("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", lock)[0];
		if (!slot) throw new Error("TEST_SLOT_MISSING");
		const task = materializeLocalMapsProviderRequest(lock, slot, {
			id: "22222222-2222-4222-8222-222222222222",
			text: "cafes ubud",
			keywordSetId: lock.keywordSet.id,
			keywordSetVersion: lock.keywordSet.version,
		});
		const capability = {
			coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED" as const,
			rawEvidenceReference: "REQUIRED" as const,
			supportsAbsentWithinDepth: true as const,
			maxDepth: 20,
		};
		expect(assertLocalMapsRankCapabilitySupportsTask(task, capability)).toEqual(capability);
		expect(() => assertLocalMapsRankCapabilitySupportsTask(task, { ...capability, maxDepth: 1 })).toThrow(
			"LOCAL_MAPS_RANK_DEPTH_UNSUPPORTED",
		);
	});
});
