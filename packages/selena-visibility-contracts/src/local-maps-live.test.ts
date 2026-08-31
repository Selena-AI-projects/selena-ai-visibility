import { describe, expect, it } from "vitest";
import { measurementExecutionKey } from "./local-execution";
import { mapsLockV1Schema, planMapsLockSlots } from "./local-locks";
import {
	assertLocalMapsLiveResultMatchesCandidate,
	canonicalLocalMapsLockSnapshot,
	canonicalLocalMapsProviderRequest,
	canonicalLocalMapsProviderResult,
	canonicalLocalMapsSubmittedCandidate,
	LOCAL_MAPS_CANONICALIZATION_VERSION,
	type LocalMapsLiveSubmittedCandidate,
	localMapsLiveAttemptEvent,
	localMapsLiveProviderResultSchema,
	localMapsLiveSubmittedCandidateSchema,
	materializeLocalMapsProviderRequest,
} from "./local-maps-live";
import { LOCAL_GRID_FORMULA_VERSION, sphericalGridPointsV1 } from "./visibility-os";

const ids = {
	organizationId: "org-live-test",
	measurementCycleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	localCycleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	configurationLockId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	locationId: "11111111-1111-4111-8111-111111111111",
	keywordSetId: "77777777-7777-4777-8777-777777777777",
	keywordId: "22222222-2222-4222-8222-222222222222",
	attemptIds: [
		"d1111111-1111-4111-8111-111111111111",
		"d2222222-2222-4222-8222-222222222222",
		"d3333333-3333-4333-8333-333333333333",
	],
	reservationIds: [
		"e1111111-1111-4111-8111-111111111111",
		"e2222222-2222-4222-8222-222222222222",
		"e3333333-3333-4333-8333-333333333333",
	],
};

const lock = mapsLockV1Schema.parse({
	schemaVersion: 1,
	domainId: "LOCAL_MAPS",
	lockVersion: 1,
	locationId: ids.locationId,
	targetIdentity: {
		placeId: "ChIJ-live-test",
		mapsUrl: "https://maps.example/live-target",
		identitySource: "USER_CONFIRMED",
		matchPolicy: "PLACE_ID_OR_CID",
	},
	grid: sphericalGridPointsV1({
		formulaVersion: LOCAL_GRID_FORMULA_VERSION,
		locationId: ids.locationId,
		centerLatitude: -8.506854,
		centerLongitude: 115.262482,
		radiusMeters: 3000,
		size: 3,
	}),
	keywordSet: { id: ids.keywordSetId, version: 1, keywordIds: [ids.keywordId] },
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

function candidateFor(attemptIndex: 1 | 2 | 3 = 1): LocalMapsLiveSubmittedCandidate {
	const slot = planMapsLockSlots(ids.measurementCycleId, lock)[0];
	const attemptId = ids.attemptIds[attemptIndex - 1];
	const reservationId = ids.reservationIds[attemptIndex - 1];
	if (!slot || !attemptId || !reservationId) throw new Error("TEST_IDENTITY_MISSING");
	const keyword = {
		id: ids.keywordId,
		text: "couples massage ubud",
		keywordSetId: ids.keywordSetId,
		keywordSetVersion: 1,
	};
	const providerRequest = materializeLocalMapsProviderRequest(lock, slot, keyword);
	return localMapsLiveSubmittedCandidateSchema.parse({
		schemaVersion: 1,
		kind: "LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE",
		mode: "LIVE_PROVIDER",
		canonicalizationVersion: LOCAL_MAPS_CANONICALIZATION_VERSION,
		scope: {
			organizationId: ids.organizationId,
			measurementCycleId: ids.measurementCycleId,
			localCycleId: ids.localCycleId,
			configurationLockId: ids.configurationLockId,
			domainId: "LOCAL_MAPS",
		},
		lockSnapshotCanonical: canonicalLocalMapsLockSnapshot(lock),
		requestSnapshotCanonical: canonicalLocalMapsProviderRequest(providerRequest),
		lock,
		slot,
		keyword,
		providerRequest,
		attempt: {
			attemptId,
			reservationId,
			observationRef: `observation-live-${attemptIndex}`,
			attemptIndex,
			baseSlotKey: slot.baseSlotKey,
			executionKey: measurementExecutionKey(slot.baseSlotKey, attemptIndex),
			statusSnapshot: "SUBMITTED",
			claimedAt: "2026-08-30T01:00:00.000Z",
			submittedAt: "2026-08-30T01:00:01.000Z",
			leaseExpiresAt: "2026-08-30T01:05:00.000Z",
		},
		budgetReservation: {
			currency: "USD",
			reservedCostUsd: "0.010000",
			surfaceCapUsd: lock.budget.surfaceCapUsd,
			monthlyCapUsd: lock.budget.monthlyCapUsd,
			priceSnapshotVersion: lock.budget.priceSnapshotVersion,
		},
	});
}

function resultFor(
	input: LocalMapsLiveSubmittedCandidate,
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		schemaVersion: 1,
		kind: "LOCAL_MAPS_LIVE_PROVIDER_RESULT",
		mode: "LIVE_PROVIDER",
		canonicalizationVersion: LOCAL_MAPS_CANONICALIZATION_VERSION,
		storageClass: "LIVE_ATTEMPT",
		organizationId: input.scope.organizationId,
		measurementCycleId: input.scope.measurementCycleId,
		localCycleId: input.scope.localCycleId,
		configurationLockId: input.scope.configurationLockId,
		attemptId: input.attempt.attemptId,
		reservationId: input.attempt.reservationId,
		executionKey: input.attempt.executionKey,
		attemptIndex: input.attempt.attemptIndex,
		lockSnapshotCanonical: input.lockSnapshotCanonical,
		requestSnapshotCanonical: input.requestSnapshotCanonical,
		provider: { id: input.lock.provider.id, version: input.lock.provider.version, providerTaskId: "task-live-1" },
		externalProviderCalls: 1,
		completedAt: "2026-08-30T01:00:03.000Z",
		event: { kind: "FOUND" },
		targetRank: 4,
		evidenceEligible: true,
		provenance: {
			evidenceKind: "MAPS_SERP_PROVIDER",
			checkReference: "https://maps.example/check/attempt-1",
			rawResponseReference: "raw/live/attempt-1.json",
			rawResponseSha256: `sha256:${"3".repeat(64)}`,
			providerObservedAt: "2026-08-30T01:00:02.000Z",
		},
		cost: { status: "KNOWN", currency: "USD", amountUsd: "0.009000", basis: "actual" },
		...overrides,
	};
}

describe("Local Maps live submitted candidate", () => {
	it("canonicalizes the complete validated candidate with the shared versioned algorithm", () => {
		const input = candidateFor();
		const canonical = canonicalLocalMapsSubmittedCandidate(input);
		expect(JSON.parse(canonical)).toEqual(input);
		expect(canonical).toContain(`"canonicalizationVersion":"${LOCAL_MAPS_CANONICALIZATION_VERSION}"`);
		expect(canonicalLocalMapsSubmittedCandidate({ ...input, schemaVersion: 1 })).toBe(canonical);
	});

	it("binds attempts 1 through 3 to one frozen slot with distinct identities", () => {
		const attempts = ([1, 2, 3] as const).map(candidateFor);
		for (const input of attempts)
			expect(input.attempt.executionKey).toBe(`${input.slot.baseSlotKey}|${input.attempt.attemptIndex}`);
		expect(new Set(attempts.map((input) => input.attempt.attemptId)).size).toBe(3);
		expect(new Set(attempts.map((input) => input.attempt.reservationId)).size).toBe(3);
	});

	it("rejects altered lock, slot, keyword, request, canonical snapshot, budget and reserved providers", () => {
		const input = candidateFor();
		const candidates = [
			{ ...input, slot: { ...input.slot, providerVersion: "forged" } },
			{ ...input, keyword: { ...input.keyword, text: "forged keyword" } },
			{
				...input,
				providerRequest: { ...input.providerRequest, params: { ...input.providerRequest.params, zoom: 12 } },
			},
			{ ...input, requestSnapshotCanonical: `${input.requestSnapshotCanonical} ` },
			{ ...input, budgetReservation: { ...input.budgetReservation, surfaceCapUsd: "2.000000" } },
			{ ...input, lock: { ...input.lock, provider: { ...input.lock.provider, id: "stub-local-maps-v1" } } },
		];
		for (const value of candidates) expect(localMapsLiveSubmittedCandidateSchema.safeParse(value).success).toBe(false);
	});

	it("does not export a dispatch assertion or adapter contract", async () => {
		const module = await import("./local-maps-live");
		expect("assertLocalMapsLiveProviderInputDispatchable" in module).toBe(false);
		expect("LocalMapsLiveProviderAdapter" in module).toBe(false);
	});

	it("rejects submission outside the frozen timestamp window", () => {
		const input = candidateFor();
		expect(
			localMapsLiveSubmittedCandidateSchema.safeParse({
				...input,
				attempt: {
					...input.attempt,
					claimedAt: "2026-08-31T01:00:00.000Z",
					submittedAt: "2026-08-31T01:00:01.000Z",
					leaseExpiresAt: "2026-08-31T01:05:00.000Z",
				},
			}).success,
		).toBe(false);
	});
});

describe("Local Maps live provider result", () => {
	it("canonicalizes the complete validated provider result with the same algorithm", () => {
		const input = candidateFor();
		const result = localMapsLiveProviderResultSchema.parse(resultFor(input));
		const canonical = canonicalLocalMapsProviderResult(result);
		expect(JSON.parse(canonical)).toEqual(result);
		expect(canonical).toContain(`"canonicalizationVersion":"${LOCAL_MAPS_CANONICALIZATION_VERSION}"`);
		expect(canonicalLocalMapsProviderResult({ ...result, schemaVersion: 1 })).toBe(canonical);
	});

	it("accepts live success evidence and binds identity and observation time to the candidate", () => {
		const input = candidateFor();
		const result = localMapsLiveProviderResultSchema.parse(resultFor(input));
		expect(assertLocalMapsLiveResultMatchesCandidate(input, result)).toEqual({ result, budgetIncident: null });
		expect(localMapsLiveAttemptEvent(result)).toEqual({ kind: "FOUND" });
		for (const forged of [
			{ ...result, executionKey: `${result.executionKey}-forged` },
			{ ...result, provider: { ...result.provider, id: "different-live-provider" } },
			{
				...result,
				provenance: { ...result.provenance, providerObservedAt: "2026-08-30T01:00:00.000Z" },
			},
		]) {
			const parsedForged = localMapsLiveProviderResultSchema.parse(forged);
			expect(() => assertLocalMapsLiveResultMatchesCandidate(input, parsedForged)).toThrow(
				"LOCAL_MAPS_LIVE_RESULT_CANDIDATE_MISMATCH",
			);
		}
	});

	it("requires a non-empty check reference for evidence-eligible outcomes", () => {
		const input = candidateFor();
		for (const checkReference of [undefined, "", " ", "stub-local-maps:check"]) {
			expect(
				localMapsLiveProviderResultSchema.safeParse(
					resultFor(input, {
						provenance: {
							evidenceKind: "MAPS_SERP_PROVIDER",
							checkReference,
							rawResponseReference: "raw/live/attempt-1.json",
							rawResponseSha256: `sha256:${"3".repeat(64)}`,
							providerObservedAt: "2026-08-30T01:00:02.000Z",
						},
					}),
				).success,
			).toBe(false);
		}
		const retry = resultFor(input, {
			event: { kind: "RETRYABLE_FAILURE", reason: "TIMEOUT" },
			targetRank: null,
			evidenceEligible: false,
			provenance: {
				evidenceKind: "MAPS_SERP_PROVIDER",
				checkReference: null,
				rawResponseReference: null,
				rawResponseSha256: null,
				providerObservedAt: null,
			},
		});
		expect(localMapsLiveProviderResultSchema.safeParse(retry).success).toBe(true);
		const unknown = resultFor(input, {
			event: { kind: "OUTCOME_UNKNOWN" },
			targetRank: null,
			evidenceEligible: false,
			provenance: {
				evidenceKind: "MAPS_SERP_PROVIDER",
				checkReference: null,
				rawResponseReference: null,
				rawResponseSha256: null,
				providerObservedAt: null,
			},
			cost: { status: "UNKNOWN", currency: "USD", amountUsd: null, basis: null },
		});
		expect(localMapsLiveProviderResultSchema.safeParse(unknown).success).toBe(true);
	});

	it("requires known cost for every non-unknown outcome", () => {
		const input = candidateFor();
		const retry = resultFor(input, {
			event: { kind: "RETRYABLE_FAILURE", reason: "TIMEOUT" },
			targetRank: null,
			evidenceEligible: false,
			provenance: {
				evidenceKind: "MAPS_SERP_PROVIDER",
				checkReference: null,
				rawResponseReference: null,
				rawResponseSha256: null,
				providerObservedAt: null,
			},
		});
		const unknownCost = { status: "UNKNOWN", currency: "USD", amountUsd: null, basis: null };
		for (const event of [
			{ kind: "FOUND" },
			{ kind: "ABSENT_WITHIN_DEPTH" },
			{ kind: "RETRYABLE_FAILURE", reason: "TIMEOUT" },
			{ kind: "PROVIDER_AUTH_FAILURE" },
		])
			expect(localMapsLiveProviderResultSchema.safeParse({ ...retry, event, cost: unknownCost }).success).toBe(false);
		expect(
			localMapsLiveProviderResultSchema.safeParse({ ...retry, event: { kind: "OUTCOME_UNKNOWN" }, cost: unknownCost })
				.success,
		).toBe(true);
		expect(
			localMapsLiveProviderResultSchema.safeParse({ ...retry, event: { kind: "LOCKED_REQUEST_INVALID" } }).success,
		).toBe(false);
	});

	it("requires all-or-none failure provenance and rejects rehearsal namespaces", () => {
		const input = candidateFor();
		const retryProvenance = {
			evidenceKind: "MAPS_SERP_PROVIDER",
			checkReference: "raw/live/check-1.json",
			rawResponseReference: "raw/live/attempt-1.json",
			rawResponseSha256: `sha256:${"3".repeat(64)}`,
			providerObservedAt: "2026-08-30T01:00:02.000Z",
		};
		const retry = resultFor(input, {
			event: { kind: "RETRYABLE_FAILURE", reason: "TIMEOUT" },
			targetRank: null,
			evidenceEligible: false,
			provenance: retryProvenance,
		});
		expect(
			localMapsLiveProviderResultSchema.safeParse({
				...retry,
				provenance: { ...retryProvenance, providerObservedAt: null },
			}).success,
		).toBe(false);
		expect(
			localMapsLiveProviderResultSchema.safeParse({
				...resultFor(input),
				provenance: {
					evidenceKind: "MAPS_SERP_PROVIDER",
					checkReference: "raw/live/check-1.json",
					rawResponseReference: "stub-local-maps:sha256:forged",
					rawResponseSha256: `sha256:${"3".repeat(64)}`,
					providerObservedAt: "2026-08-30T01:00:02.000Z",
				},
			}).success,
		).toBe(false);
	});

	it("reports any known cost above the reservation without dropping the result", () => {
		const input = candidateFor();
		for (const basis of ["actual", "estimated"] as const) {
			const over = localMapsLiveProviderResultSchema.parse(
				resultFor(input, { cost: { status: "KNOWN", currency: "USD", amountUsd: "0.010001", basis } }),
			);
			expect(assertLocalMapsLiveResultMatchesCandidate(input, over)).toEqual({
				result: over,
				budgetIncident: "REPORTED_COST_EXCEEDS_RESERVATION",
			});
		}
	});
});
