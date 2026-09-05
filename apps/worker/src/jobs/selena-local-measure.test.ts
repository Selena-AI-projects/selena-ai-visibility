import assert from "node:assert/strict";
import { test } from "node:test";
import {
	canonicalLocalMapsLockSnapshot,
	canonicalLocalMapsProviderRequest,
	LOCAL_GRID_FORMULA_VERSION,
	localMapsLiveSubmittedCandidateSchema,
	mapsLockV1Schema,
	materializeLocalMapsProviderRequest,
	measurementExecutionKey,
	planMapsLockSlots,
	sphericalGridPointsV1,
} from "@workspace/selena-visibility-contracts";
import type { LocalMapsLiveAttemptStore } from "@workspace/lib/selena-local-maps-live-runner";
import { createSelenaLocalMeasureExecutor, type SelenaLocalMeasureData } from "./selena-local-measure";

const ids = {
	organizationId: "org-local-executor",
	measurementCycleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	localCycleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	configurationLockId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	locationId: "11111111-1111-4111-8111-111111111111",
	keywordSetId: "77777777-7777-4777-8777-777777777777",
	keywordId: "22222222-2222-4222-8222-222222222222",
	attemptId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
	reservationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
};

const lock = mapsLockV1Schema.parse({
	schemaVersion: 1,
	domainId: "LOCAL_MAPS",
	lockVersion: 1,
	locationId: ids.locationId,
	targetIdentity: {
		placeId: "ChIJ-local-executor",
		mapsUrl: "https://maps.example/local-executor",
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

const data: SelenaLocalMeasureData = {
	organizationId: ids.organizationId,
	measurementCycleId: ids.measurementCycleId,
	localCycleId: ids.localCycleId,
	attemptId: ids.attemptId,
};

function snapshot() {
	const slot = planMapsLockSlots(ids.measurementCycleId, lock)[0];
	if (!slot) throw new Error("TEST_SLOT_MISSING");
	const providerRequest = materializeLocalMapsProviderRequest(lock, slot, {
		id: ids.keywordId,
		text: "couples massage ubud",
		keywordSetId: ids.keywordSetId,
		keywordSetVersion: 1,
	});
	return localMapsLiveSubmittedCandidateSchema.parse({
		schemaVersion: 1,
		kind: "LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE",
		mode: "LIVE_PROVIDER",
		canonicalizationVersion: "canonical-json-code-unit-v1",
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
		keyword: {
			id: ids.keywordId,
			text: "couples massage ubud",
			keywordSetId: ids.keywordSetId,
			keywordSetVersion: 1,
		},
		providerRequest,
		attempt: {
			attemptId: ids.attemptId,
			reservationId: ids.reservationId,
			observationRef: "local-executor-observation",
			attemptIndex: 1,
			baseSlotKey: slot.baseSlotKey,
			executionKey: measurementExecutionKey(slot.baseSlotKey, 1),
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

test("injected Local executor runs one committed attempt through its provider port", async () => {
	const candidate = snapshot();
	let providerCalls = 0;
	const store: LocalMapsLiveAttemptStore = {
		acquireAndCommitSubmitted: async () => ({
			kind: "READY",
			committed: {
				commitToken: "local-executor-token",
				organizationId: ids.organizationId,
				attemptId: ids.attemptId,
				reservationId: ids.reservationId,
				executionKey: candidate.attempt.executionKey,
				rowVersion: 1,
				snapshot: candidate,
			},
		}),
		finalizeSubmitted: async ({ result, requiredBudgetState }) => ({
			kind: "FINALIZED",
			persistedResult: result,
			persistedBudgetState: requiredBudgetState,
		}),
		markSubmittedUnknown: async () => ({ kind: "MARKED_UNKNOWN" }),
	};
	const executor = createSelenaLocalMeasureExecutor({
		db: {} as never,
		setTenantContext: async () => undefined,
		claimReservedBudget: async () => undefined,
		leaseDurationMs: 60_000,
		createStore: () => store,
		provider: {
			id: lock.provider.id,
			version: lock.provider.version,
			endpoint: lock.provider.endpoint,
			execute: async () => {
				providerCalls += 1;
				return {
					providerTaskId: "local-executor-task",
					event: { kind: "FOUND" },
					targetRank: 2,
					evidenceEligible: true,
					provenance: {
						evidenceKind: "MAPS_SERP_PROVIDER",
						checkReference: "https://maps.example/check/local-executor",
						rawResponseReference: "raw/local-executor.json",
						rawResponseSha256: `sha256:${"5".repeat(64)}`,
						providerObservedAt: "2026-08-30T01:00:04.000Z",
					},
					cost: { status: "KNOWN", currency: "USD", amountUsd: "0.009000", basis: "actual" },
				};
			},
		},
		now: () => new Date("2026-08-30T01:00:04.000Z"),
	});

	assert.deepEqual(await executor(data), { status: "EXECUTED", providerCalls: 1, reason: "FINALIZED" });
	assert.equal(providerCalls, 1);
});

test("candidate scope is checked before an injected store can release a provider call", async () => {
	let providerCalls = 0;
	const executor = createSelenaLocalMeasureExecutor({
		db: {} as never,
		setTenantContext: async () => undefined,
		claimReservedBudget: async () => undefined,
		leaseDurationMs: 60_000,
		buildCandidate: async () => ({
			...snapshot(),
			scope: { ...snapshot().scope, localCycleId: "ffffffff-ffff-4fff-8fff-ffffffffffff" },
		}),
		createStore: (dependencies) =>
			({
				acquireAndCommitSubmitted: async () => {
					await dependencies.buildCandidate({} as never);
					return { kind: "DONE" };
				},
				finalizeSubmitted: async () => {
					throw new Error("TEST_FINALIZE_UNREACHABLE");
				},
				markSubmittedUnknown: async () => ({ kind: "MARKED_UNKNOWN" }),
			}) as LocalMapsLiveAttemptStore,
		provider: {
			id: lock.provider.id,
			version: lock.provider.version,
			endpoint: lock.provider.endpoint,
			execute: async () => {
				providerCalls += 1;
				return {};
			},
		},
	});

	await assert.rejects(executor(data), /LOCAL_MEASURE_ATTEMPT_SCOPE_MISMATCH/);
	assert.equal(providerCalls, 0);
});
