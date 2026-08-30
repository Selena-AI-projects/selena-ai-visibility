import {
	LOCAL_GRID_FORMULA_VERSION,
	localMapsLiveProviderResultSchema,
	mapsLockV1Schema,
	measurementExecutionKey,
	planMapsLockSlots,
	sphericalGridPointsV1,
} from "@workspace/selena-visibility-contracts";
import { describe, expect, it } from "vitest";
import {
	buildLocalMapsSubmittedCandidate,
	type LocalMapsAttemptSourceSnapshot,
	type LocalMapsCandidateAttemptRow,
	settleLocalMapsBudget,
} from "./selena-local-maps-attempt-store";

const ids = {
	organizationId: "00000000-0000-4000-8000-000000000001",
	measurementCycleId: "00000000-0000-4000-8000-000000000002",
	localCycleId: "00000000-0000-4000-8000-000000000003",
	configurationLockId: "00000000-0000-4000-8000-000000000004",
	attemptId: "00000000-0000-4000-8000-000000000005",
	reservationId: "00000000-0000-4000-8000-000000000006",
};

const candidateIds = {
	organizationId: "org-candidate-test",
	measurementCycleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	localCycleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	configurationLockId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	locationId: "11111111-1111-4111-8111-111111111111",
	keywordSetId: "77777777-7777-4777-8777-777777777777",
	keywordId: "22222222-2222-4222-8222-222222222222",
	attemptId: "d1111111-1111-4111-8111-111111111111",
	reservationId: "e1111111-1111-4111-8111-111111111111",
};

const candidateLock = mapsLockV1Schema.parse({
	schemaVersion: 1,
	domainId: "LOCAL_MAPS",
	lockVersion: 1,
	locationId: candidateIds.locationId,
	targetIdentity: {
		placeId: "ChIJ-candidate-test",
		mapsUrl: "https://maps.example/candidate-target",
		identitySource: "USER_CONFIRMED",
		matchPolicy: "PLACE_ID_OR_CID",
	},
	grid: sphericalGridPointsV1({
		formulaVersion: LOCAL_GRID_FORMULA_VERSION,
		locationId: candidateIds.locationId,
		centerLatitude: -8.506854,
		centerLongitude: 115.262482,
		radiusMeters: 3000,
		size: 3,
	}),
	keywordSet: { id: candidateIds.keywordSetId, version: 1, keywordIds: [candidateIds.keywordId] },
	provider: {
		id: "maps-live-provider-v1",
		endpoint: "provider-endpoint-v1",
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
		priceSnapshotVersion: "maps-live-price-v1",
	},
});

function candidateSource(): LocalMapsAttemptSourceSnapshot {
	const slot = planMapsLockSlots(candidateIds.measurementCycleId, candidateLock)[0];
	if (!slot) throw new Error("TEST_CANDIDATE_SLOT_MISSING");
	const claimedAt = new Date("2026-08-30T01:00:00.000Z");
	const submittedAt = new Date("2026-08-30T01:00:01.000Z");
	const leaseExpiresAt = new Date("2026-08-30T01:05:00.000Z");
	const attempt: LocalMapsCandidateAttemptRow = {
		id: candidateIds.attemptId,
		reservationId: candidateIds.reservationId,
		organizationId: candidateIds.organizationId,
		measurementCycleId: candidateIds.measurementCycleId,
		domainId: "LOCAL_MAPS",
		observationRef: "observation-candidate-1",
		pointId: slot.pointId,
		itemId: candidateIds.keywordId,
		executorId: candidateLock.provider.id,
		repeatIndex: slot.repeatIndex,
		baseSlotKey: slot.baseSlotKey,
		attemptIndex: 1,
		executionKey: measurementExecutionKey(slot.baseSlotKey, 1),
		rowVersion: 1,
		submissionTokenHash: null,
		submittedCandidateFingerprint: null,
		submittedCandidateCanonical: null,
		submittedCandidate: null,
		status: "CLAIMED",
		budgetState: "RESERVED",
		reservedCostUsd: "0.010000",
		currency: "USD",
		surfaceCapUsd: "1.000000",
		monthlyCapUsd: "10.000000",
		priceSnapshotVersion: candidateLock.budget.priceSnapshotVersion,
		spentCostUsd: "0",
		releasedCostUsd: "0",
		claimedAt,
		leaseExpiresAt,
		submittedAt,
		completedAt: null,
		providerTaskId: null,
		rawRef: null,
		costEventId: null,
		retryReason: null,
		finalInvalidReason: null,
		reconciledAt: null,
		reconciliationRef: null,
		unknownReason: null,
		createdAt: claimedAt,
		updatedAt: submittedAt,
	};
	return {
		attempt,
		measurementCycle: {
			id: candidateIds.measurementCycleId,
			organizationId: candidateIds.organizationId,
			domainId: "LOCAL_MAPS",
			configurationLockId: candidateIds.configurationLockId,
		},
		localCycle: {
			id: candidateIds.localCycleId,
			organizationId: candidateIds.organizationId,
			measurementCycleId: candidateIds.measurementCycleId,
			configurationLockId: candidateIds.configurationLockId,
			locationId: candidateIds.locationId,
			provider: candidateLock.provider.id,
		},
		lockId: candidateIds.configurationLockId,
		lock: candidateLock,
		slot,
		keywordLocationId: candidateIds.locationId,
		keyword: {
			id: candidateIds.keywordId,
			text: "couples massage ubud",
			keywordSetId: candidateIds.keywordSetId,
			keywordSetVersion: 1,
		},
	};
}

function rawResult(cost: unknown) {
	return {
		schemaVersion: 1,
		kind: "LOCAL_MAPS_LIVE_PROVIDER_RESULT",
		mode: "LIVE_PROVIDER",
		canonicalizationVersion: "canonical-json-code-unit-v1",
		storageClass: "LIVE_ATTEMPT",
		...ids,
		executionKey: "LOCAL_MAPS|cycle|point|keyword|maps|0|1",
		attemptIndex: 1,
		lockSnapshotCanonical: "lock",
		requestSnapshotCanonical: "request",
		provider: { id: "maps", version: "v1", providerTaskId: null },
		externalProviderCalls: 1,
		completedAt: "2026-08-30T00:00:01.000Z",
		event: { kind: "FOUND" },
		targetRank: 1,
		evidenceEligible: true,
		provenance: {
			evidenceKind: "MAPS_SERP_PROVIDER",
			rawResponseReference: "maps:response-1",
			rawResponseSha256: `sha256:${"a".repeat(64)}`,
			providerObservedAt: "2026-08-30T00:00:00.500Z",
		},
		cost,
	};
}

function result(cost: unknown) {
	return localMapsLiveProviderResultSchema.parse(rawResult(cost));
}

describe("settleLocalMapsBudget", () => {
	it("spends positive actual cost and releases the remainder", () => {
		expect(
			settleLocalMapsBudget(
				result({ status: "KNOWN", currency: "USD", amountUsd: "0.010001", basis: "actual" }),
				"0.020000",
			),
		).toEqual({
			state: "SPENT",
			spentCostUsd: "0.010001",
			releasedCostUsd: "0.009999",
			incident: null,
		});
	});

	it("marks a zero actual cost as released without a ledger event", () => {
		expect(
			settleLocalMapsBudget(result({ status: "KNOWN", currency: "USD", amountUsd: "0", basis: "actual" }), "0.020000"),
		).toEqual({
			state: "RELEASED",
			spentCostUsd: "0.000000",
			releasedCostUsd: "0.020000",
			incident: null,
		});
	});

	it("keeps unknown outcome cost reserved", () => {
		const unknown = rawResult({ status: "UNKNOWN", currency: "USD", amountUsd: null, basis: null });
		// The result fixture is intentionally a FOUND result; replace only the
		// discriminated fields through the shared parser so this test stays tied
		// to the public contract rather than an unvalidated cast.
		const outcomeUnknown = localMapsLiveProviderResultSchema.parse({
			...unknown,
			event: { kind: "OUTCOME_UNKNOWN" },
			targetRank: null,
			evidenceEligible: false,
			provenance: {
				evidenceKind: "MAPS_SERP_PROVIDER",
				rawResponseReference: null,
				rawResponseSha256: null,
				providerObservedAt: null,
			},
		});
		expect(settleLocalMapsBudget(outcomeUnknown, "0.020000")).toEqual({
			state: "RESERVED",
			spentCostUsd: "0.000000",
			releasedCostUsd: "0.000000",
			incident: null,
		});
	});

	it("records an over-reservation incident while preserving exact micros", () => {
		expect(
			settleLocalMapsBudget(
				result({ status: "KNOWN", currency: "USD", amountUsd: "0.030000", basis: "actual" }),
				"0.020000",
			),
		).toEqual({
			state: "SPENT",
			spentCostUsd: "0.030000",
			releasedCostUsd: "0.000000",
			incident: "REPORTED_COST_EXCEEDS_RESERVATION",
		});
	});

	it("rejects an estimated zero-cost result", () => {
		expect(() =>
			settleLocalMapsBudget(
				result({ status: "KNOWN", currency: "USD", amountUsd: "0", basis: "estimated" }),
				"0.020000",
			),
		).toThrow("LOCAL_MAPS_ESTIMATED_ZERO_COST_BLOCKED");
	});
});

describe("buildLocalMapsSubmittedCandidate", () => {
	it("materializes a lock-derived candidate from one tenant-scoped source snapshot", () => {
		const source = candidateSource();
		const candidate = buildLocalMapsSubmittedCandidate({ source });

		expect(candidate.scope).toEqual({
			organizationId: candidateIds.organizationId,
			measurementCycleId: candidateIds.measurementCycleId,
			localCycleId: candidateIds.localCycleId,
			configurationLockId: candidateIds.configurationLockId,
			domainId: "LOCAL_MAPS",
		});
		expect(candidate.slot).toEqual(source.slot);
		expect(candidate.keyword.text).toBe("couples massage ubud");
		expect(candidate.providerRequest.point).toMatchObject({
			id: source.slot.pointId,
			pointIndex: source.slot.pointIndex,
			latitude: source.slot.latitude,
			longitude: source.slot.longitude,
		});
		expect(candidate.providerRequest.keyword).toEqual(candidate.keyword);
		expect(candidate.attempt).toMatchObject({
			attemptId: candidateIds.attemptId,
			reservationId: candidateIds.reservationId,
			statusSnapshot: "SUBMITTED",
			executionKey: source.attempt.executionKey,
		});
	});

	it("rejects a candidate whose measurement scope does not match the locked attempt", () => {
		const source = candidateSource();
		expect(() =>
			buildLocalMapsSubmittedCandidate({
				source: {
					...source,
					measurementCycle: { ...source.measurementCycle, domainId: "LOCAL_AI" },
				},
			}),
		).toThrow("LOCAL_MAPS_ATTEMPT_MEASUREMENT_SCOPE_MISMATCH");
	});

	it("rejects a candidate whose slot identity is not the attempt slot", () => {
		const source = candidateSource();
		const otherSlot = planMapsLockSlots(candidateIds.measurementCycleId, candidateLock)[1];
		if (!otherSlot) throw new Error("TEST_CANDIDATE_SECOND_SLOT_MISSING");
		expect(() => buildLocalMapsSubmittedCandidate({ source: { ...source, slot: otherSlot } })).toThrow(
			"LOCAL_MAPS_ATTEMPT_SLOT_SCOPE_MISMATCH",
		);
	});

	it("rejects a keyword resolved for a different location", () => {
		const source = candidateSource();
		expect(() =>
			buildLocalMapsSubmittedCandidate({
				source: { ...source, keywordLocationId: "99999999-9999-4999-8999-999999999999" },
			}),
		).toThrow("LOCAL_MAPS_ATTEMPT_KEYWORD_LOCATION_MISMATCH");
	});
});
