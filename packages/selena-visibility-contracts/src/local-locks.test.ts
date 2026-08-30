import { describe, expect, it } from "vitest";
import { localAiDiscoveryLockBlockSchema } from "./local-discovery";
import { manualLocalAiLockV1Schema, mapsLockV1Schema, planMapsLockSlots, readManualLocalAiLock } from "./local-locks";
import { LOCAL_GRID_FORMULA_VERSION, sphericalGridPointsV1 } from "./visibility-os";

const locationId = "11111111-1111-4111-8111-111111111111";
const keywordIds = [
	"22222222-2222-4222-8222-222222222222",
	"33333333-3333-4333-8333-333333333333",
	"44444444-4444-4444-8444-444444444444",
	"55555555-5555-4555-8555-555555555555",
	"66666666-6666-4666-8666-666666666666",
];

const mapsLock = {
	schemaVersion: 1,
	domainId: "LOCAL_MAPS",
	lockVersion: 1,
	locationId,
	targetIdentity: {
		placeId: "ChIJ-test",
		mapsUrl: "https://maps.google.com/?cid=123",
		identitySource: "USER_CONFIRMED",
		matchPolicy: "PLACE_ID_OR_CID",
	},
	grid: sphericalGridPointsV1({
		formulaVersion: LOCAL_GRID_FORMULA_VERSION,
		locationId,
		centerLatitude: -8.506854,
		centerLongitude: 115.262482,
		radiusMeters: 3000,
		size: 5,
	}),
	keywordSet: { id: "77777777-7777-4777-8777-777777777777", version: 1, keywordIds },
	provider: {
		id: "dataforseo",
		endpoint: "google/maps/live/advanced",
		version: "v3",
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
		priceSnapshotVersion: "dataforseo-maps-2026-08-30",
	},
} as const;

const legacyDiscovery = localAiDiscoveryLockBlockSchema.parse({
	schemaVersion: 1,
	surface: "GOOGLE_ASK_MAPS",
	captureMethod: "MANUAL_OBSERVATION",
	externalCallsAllowed: false,
	placesApiAllowed: false,
	policyVersion: "local-ai-discovery-v1",
	captureProtocolVersion: "capture-protocol-v1",
	entities: [],
	entityRelationships: [],
	businessLocations: [],
	scenarios: [],
	observerContexts: [],
	repeats: 0,
	expectedObservations: 0,
	evidencePolicy: {
		queryRequired: true,
		contextRequired: true,
		timestampRequired: true,
		transcriptRequired: true,
		screenshotRequired: true,
		visibleSourcesOptional: true,
	},
});

describe("Maps Lock v1", () => {
	it("freezes the 125-slot and 375-attempt footprint", () => {
		expect(mapsLockV1Schema.parse(mapsLock)).toMatchObject({ expectedSlots: 125, maxProviderAttempts: 375 });
	});

	it("plans 125 unique first attempts in stable point-keyword-repeat order", () => {
		const measurementCycleId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const slots = planMapsLockSlots(measurementCycleId, mapsLock);
		expect(slots).toHaveLength(125);
		expect(new Set(slots.map((slot) => slot.baseSlotKey)).size).toBe(125);
		expect(new Set(slots.map((slot) => slot.executionKey)).size).toBe(125);
		expect(slots[0]).toMatchObject({
			measurementCycleId,
			pointId: mapsLock.grid.points[0]?.id,
			keywordId: mapsLock.keywordSet.keywordIds[0],
			repeatIndex: 0,
			attemptIndex: 1,
			lockVersion: mapsLock.lockVersion,
			keywordSetVersion: mapsLock.keywordSet.version,
			providerVersion: mapsLock.provider.version,
		});
		expect(slots[5]).toMatchObject({
			pointId: mapsLock.grid.points[1]?.id,
			keywordId: mapsLock.keywordSet.keywordIds[0],
		});
		expect(slots).toEqual(planMapsLockSlots(measurementCycleId, mapsLock));
	});

	it("accepts a canonical 3x3 footprint without fixing every lock to 125 slots", () => {
		const grid = sphericalGridPointsV1({
			formulaVersion: LOCAL_GRID_FORMULA_VERSION,
			locationId,
			centerLatitude: -8.506854,
			centerLongitude: 115.262482,
			radiusMeters: 3000,
			size: 3,
		});
		const smallLock = mapsLockV1Schema.parse({ ...mapsLock, grid, expectedSlots: 45, maxProviderAttempts: 135 });
		expect(smallLock).toMatchObject({
			expectedSlots: 45,
			maxProviderAttempts: 135,
		});
		expect(planMapsLockSlots("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", smallLock)).toHaveLength(45);
	});

	it("rejects mismatched location, cardinality, identity and time", () => {
		expect(mapsLockV1Schema.safeParse({ ...mapsLock, locationId: keywordIds[0] }).success).toBe(false);
		expect(mapsLockV1Schema.safeParse({ ...mapsLock, expectedSlots: 124 }).success).toBe(false);
		expect(mapsLockV1Schema.safeParse({ ...mapsLock, maxProviderAttempts: 374 }).success).toBe(false);
		expect(
			mapsLockV1Schema.safeParse({ ...mapsLock, targetIdentity: { ...mapsLock.targetIdentity, placeId: undefined } })
				.success,
		).toBe(false);
		expect(
			mapsLockV1Schema.safeParse({
				...mapsLock,
				timestampWindow: { startsAt: mapsLock.timestampWindow.endsAt, endsAt: mapsLock.timestampWindow.startsAt },
			}).success,
		).toBe(false);
		expect(
			mapsLockV1Schema.safeParse({
				...mapsLock,
				keywordSet: { ...mapsLock.keywordSet, keywordIds: [...keywordIds.slice(0, 4), keywordIds[0]] },
			}).success,
		).toBe(false);
		expect(
			mapsLockV1Schema.safeParse({
				...mapsLock,
				budget: { ...mapsLock.budget, worstCaseCostUsd: "0.500001" },
			}).success,
		).toBe(false);
		expect(
			mapsLockV1Schema.safeParse({
				...mapsLock,
				provider: { ...mapsLock.provider, placesApiUsed: true },
			}).success,
		).toBe(false);
		expect(
			mapsLockV1Schema.safeParse({ ...mapsLock, provider: { ...mapsLock.provider, id: "bad provider" } }).success,
		).toBe(false);
		expect(
			mapsLockV1Schema.safeParse({ ...mapsLock, provider: { ...mapsLock.provider, id: "bad|provider" } }).success,
		).toBe(false);
	});

	it("permits a reviewed name/address fallback but rejects unreviewed identity", () => {
		const fallback = {
			matchedName: "KORA Food Hall",
			matchedAddress: "Ubud, Bali",
			mapsUrl: "https://maps.google.com/?q=KORA",
			identitySource: "USER_CONFIRMED" as const,
			matchPolicy: "REVIEWED_NAME_ADDRESS_FALLBACK" as const,
			matchStatus: "REVIEWED_MATCH" as const,
			reviewed: true,
		};
		expect(mapsLockV1Schema.safeParse({ ...mapsLock, targetIdentity: fallback }).success).toBe(true);
		expect(
			mapsLockV1Schema.safeParse({
				...mapsLock,
				targetIdentity: { ...fallback, reviewed: false },
			}).success,
		).toBe(false);
		expect(
			mapsLockV1Schema.safeParse({
				...mapsLock,
				targetIdentity: { ...fallback, matchStatus: "UNRESOLVED" },
			}).success,
		).toBe(false);
	});

	it("rejects a reordered or duplicated ordered grid", () => {
		const reordered = [...mapsLock.grid.points];
		[reordered[0], reordered[1]] = [reordered[1], reordered[0]];
		expect(mapsLockV1Schema.safeParse({ ...mapsLock, grid: { ...mapsLock.grid, points: reordered } }).success).toBe(
			false,
		);
		const duplicated = [...mapsLock.grid.points];
		duplicated[1] = duplicated[0];
		expect(mapsLockV1Schema.safeParse({ ...mapsLock, grid: { ...mapsLock.grid, points: duplicated } }).success).toBe(
			false,
		);
	});
});

describe("manual Local AI Lock v1", () => {
	it("keeps current Local AI execution manual-only with zero provider attempts", () => {
		const lock = manualLocalAiLockV1Schema.parse({
			schemaVersion: 1,
			domainId: "LOCAL_AI",
			executionMode: "MANUAL_ONLY",
			automatedExecutionAllowed: false,
			providerAttemptsAllowed: 0,
			discovery: legacyDiscovery,
		});
		expect(lock.providerAttemptsAllowed).toBe(0);
		expect(lock.discovery.captureMethod).toBe("MANUAL_OBSERVATION");
	});

	it("reads legacy localAiDiscovery without mutating the snapshot contract", () => {
		const read = readManualLocalAiLock({ localAiDiscovery: legacyDiscovery });
		expect(read.source).toBe("localAiDiscovery");
		expect(read.lock).toMatchObject({
			domainId: "LOCAL_AI",
			executionMode: "MANUAL_ONLY",
			automatedExecutionAllowed: false,
			providerAttemptsAllowed: 0,
		});
		expect(() => readManualLocalAiLock({})).toThrow("LOCAL_AI_LOCK_MISSING");
	});
});
