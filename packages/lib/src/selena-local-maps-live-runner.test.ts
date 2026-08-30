import type { LocalMapsRankNormalizedObservation } from "@workspace/selena-visibility-contracts";
import {
	canonicalLocalMapsLockSnapshot,
	canonicalLocalMapsProviderRequest,
	LOCAL_GRID_FORMULA_VERSION,
	LOCAL_MAPS_CANONICALIZATION_VERSION,
	localMapsLiveSubmittedCandidateSchema,
	mapsLockV1Schema,
	materializeLocalMapsProviderRequest,
	measurementExecutionKey,
	planMapsLockSlots,
	sphericalGridPointsV1,
} from "@workspace/selena-visibility-contracts";
import { describe, expect, it, vi } from "vitest";
import { toLocalMapsLiveProviderPort } from "./adapters/local-maps-rank-adapter";
import {
	type LocalMapsAcquireDecision,
	type LocalMapsLiveAttemptStore,
	type LocalMapsLiveProviderPort,
	runLocalMapsLiveAttempt,
} from "./selena-local-maps-live-runner";

const ids = {
	organizationId: "org-live-runner",
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
		placeId: "ChIJ-live-runner",
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

function submittedSnapshot(attemptIndex: 1 | 2 | 3 = 1) {
	const slot = planMapsLockSlots(ids.measurementCycleId, lock)[0];
	if (!slot) throw new Error("TEST_SLOT_MISSING");
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
			attemptId: ids.attemptId,
			reservationId: ids.reservationId,
			observationRef: "observation-live-runner",
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

function providerObservation(overrides: Record<string, unknown> = {}) {
	return {
		providerTaskId: "task-1",
		event: { kind: "FOUND" },
		targetRank: 2,
		evidenceEligible: true,
		provenance: {
			evidenceKind: "MAPS_SERP_PROVIDER",
			checkReference: "https://maps.example/check/runner",
			rawResponseReference: "raw/live/runner.json",
			rawResponseSha256: `sha256:${"3".repeat(64)}`,
			providerObservedAt: "2026-08-30T01:00:04.000Z",
		},
		cost: { status: "KNOWN", currency: "USD", amountUsd: "0.009000", basis: "actual" },
		...overrides,
	};
}

function committed(snapshot = submittedSnapshot(), commitToken = "commit-token-1") {
	return {
		commitToken,
		organizationId: snapshot.scope.organizationId,
		attemptId: snapshot.attempt.attemptId,
		reservationId: snapshot.attempt.reservationId,
		executionKey: snapshot.attempt.executionKey,
		rowVersion: 1,
		snapshot,
	};
}

function dependencies(decision?: LocalMapsAcquireDecision, result?: unknown) {
	const snapshot = submittedSnapshot();
	const order: string[] = [];
	const store: LocalMapsLiveAttemptStore = {
		acquireAndCommitSubmitted: vi.fn(async (): Promise<LocalMapsAcquireDecision> => {
			order.push("commit-submitted");
			return decision ?? { kind: "READY", committed: committed(snapshot) };
		}),
		finalizeSubmitted: vi.fn(async ({ result: persistedResult, requiredBudgetState }) => {
			order.push("finalize");
			return {
				kind: "FINALIZED" as const,
				persistedResult,
				persistedBudgetState: requiredBudgetState,
			};
		}),
		markSubmittedUnknown: vi.fn(async () => {
			order.push("unknown");
			return { kind: "MARKED_UNKNOWN" as const };
		}),
	};
	const provider: LocalMapsLiveProviderPort = {
		id: lock.provider.id,
		version: lock.provider.version,
		endpoint: lock.provider.endpoint,
		execute: vi.fn(async () => {
			order.push("provider");
			return result ?? providerObservation();
		}),
	};
	return { snapshot, order, store, provider };
}

const intent = { organizationId: ids.organizationId, attemptId: ids.attemptId };
const now = () => new Date("2026-08-30T01:00:04.000Z");

describe("Local Maps live runner protocol", () => {
	it("bridges the normative rank adapter after a committed permit", async () => {
		const deps = dependencies();
		const execute = vi.fn(async (task: typeof deps.snapshot.providerRequest, permit: Record<string, unknown>) => {
			expect(task).toEqual(deps.snapshot.providerRequest);
			expect(permit).toMatchObject({
				organizationId: ids.organizationId,
				attemptId: ids.attemptId,
				reservationId: ids.reservationId,
				executionKey: deps.snapshot.attempt.executionKey,
				attemptIndex: 1,
			});
			return providerObservation();
		});
		const normalize = vi.fn(
			(result: unknown) =>
				({
					...(result as Record<string, unknown>),
					coordinateProof: {
						pointId: deps.snapshot.providerRequest.point.id,
						pointIndex: deps.snapshot.providerRequest.point.pointIndex,
						latitude: deps.snapshot.providerRequest.point.latitude,
						longitude: deps.snapshot.providerRequest.point.longitude,
						keywordId: deps.snapshot.providerRequest.keyword.id,
						keywordText: deps.snapshot.providerRequest.keyword.text,
						request: deps.snapshot.providerRequest.params,
					},
				}) as LocalMapsRankNormalizedObservation,
		);
		const adapter = {
			id: lock.provider.id,
			version: lock.provider.version,
			endpoint: lock.provider.endpoint,
			quote: () => ({
				tasks: lock.expectedSlots,
				maxProviderAttempts: lock.maxProviderAttempts,
				worstCaseCostUsd: lock.budget.worstCaseCostUsd,
				currency: "USD" as const,
				priceSnapshotVersion: lock.budget.priceSnapshotVersion,
			}),
			execute,
			normalize,
			capability: () => ({
				coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED" as const,
				rawEvidenceReference: "REQUIRED" as const,
				supportsAbsentWithinDepth: true as const,
				maxDepth: 20,
			}),
		};
		const port = toLocalMapsLiveProviderPort(adapter);
		expect(execute).not.toHaveBeenCalled();
		await expect(
			port.execute(deps.snapshot.providerRequest, {
				organizationId: ids.organizationId,
				attemptId: ids.attemptId,
				reservationId: ids.reservationId,
				executionKey: deps.snapshot.attempt.executionKey,
				attemptIndex: 1,
				lockSnapshotCanonical: deps.snapshot.lockSnapshotCanonical,
				requestSnapshotCanonical: deps.snapshot.requestSnapshotCanonical,
			}),
		).resolves.toEqual(providerObservation());
		expect(execute).toHaveBeenCalledTimes(1);
		expect(normalize).toHaveBeenCalledTimes(1);

		const missingProofPort = toLocalMapsLiveProviderPort({
			...adapter,
			normalize: () => providerObservation() as unknown as LocalMapsRankNormalizedObservation,
		});
		await expect(
			missingProofPort.execute(deps.snapshot.providerRequest, {
				organizationId: ids.organizationId,
				attemptId: ids.attemptId,
				reservationId: ids.reservationId,
				executionKey: deps.snapshot.attempt.executionKey,
				attemptIndex: 1,
				lockSnapshotCanonical: deps.snapshot.lockSnapshotCanonical,
				requestSnapshotCanonical: deps.snapshot.requestSnapshotCanonical,
			}),
		).rejects.toThrow();
	});

	it("rejects an invalid intent before touching the store", async () => {
		const deps = dependencies();
		await expect(
			runLocalMapsLiveAttempt({ intent: { ...intent, attemptId: "not-a-uuid" }, ...deps, now }),
		).rejects.toThrow();
		expect(deps.store.acquireAndCommitSubmitted).not.toHaveBeenCalled();
		expect(deps.provider.execute).not.toHaveBeenCalled();
	});

	it.each(["BUSY", "RECONCILIATION_REQUIRED", "DONE"] as const)(
		"does not call a provider when the store returns %s",
		async (kind) => {
			const deps = dependencies({ kind });
			await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
				kind: "NOT_CALLED",
				reason: kind,
			});
			expect(deps.provider.execute).not.toHaveBeenCalled();
			expect(deps.store.finalizeSubmitted).not.toHaveBeenCalled();
		},
	);

	it("calls the provider exactly once after committed SUBMITTED and then finalizes", async () => {
		const deps = dependencies();
		const result = await runLocalMapsLiveAttempt({ intent, ...deps, now });
		expect(result).toMatchObject({ kind: "FINALIZED", disposition: { attemptStatus: "SUCCEEDED" } });
		expect(deps.order).toEqual(["commit-submitted", "provider", "finalize"]);
		expect(deps.provider.execute).toHaveBeenCalledTimes(1);
		expect(deps.store.finalizeSubmitted).toHaveBeenCalledWith(
			expect.objectContaining({ requiredBudgetState: "SPENT" }),
		);
	});

	it("does not call the provider while the SUBMITTED commit is still pending", async () => {
		const deps = dependencies();
		let releaseCommit: ((decision: LocalMapsAcquireDecision) => void) | undefined;
		vi.mocked(deps.store.acquireAndCommitSubmitted).mockImplementationOnce(
			async () =>
				new Promise<LocalMapsAcquireDecision>((resolve) => {
					releaseCommit = resolve;
				}),
		);
		const pending = runLocalMapsLiveAttempt({ intent, ...deps, now });
		await Promise.resolve();
		expect(deps.provider.execute).not.toHaveBeenCalled();
		releaseCommit?.({ kind: "READY", committed: committed(deps.snapshot, "token") });
		await expect(pending).resolves.toMatchObject({ kind: "FINALIZED" });
		expect(deps.provider.execute).toHaveBeenCalledTimes(1);
	});

	it("fails closed before the provider for a future, expired, wrong-provider or wrong-tenant commit", async () => {
		const base = submittedSnapshot();
		const cases = [
			{ ...base, attempt: { ...base.attempt, submittedAt: "2026-08-30T01:00:04.001Z" } },
			{ ...base, attempt: { ...base.attempt, leaseExpiresAt: "2026-08-30T01:00:04.000Z" } },
			{ ...base, scope: { ...base.scope, organizationId: "other-org" } },
		];
		for (const snapshot of cases) {
			const deps = dependencies({ kind: "READY", committed: committed(snapshot, "token") });
			const result = await runLocalMapsLiveAttempt({ intent, ...deps, now });
			expect(result).toEqual({ kind: "UNKNOWN_PERSISTENCE_FAILED", reason: "COMMITTED_SNAPSHOT_INVALID" });
			expect(deps.provider.execute).not.toHaveBeenCalled();
		}
		const deps = dependencies();
		deps.provider.id = "wrong-live-provider";
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "UNKNOWN_PERSISTENCE_FAILED",
			reason: "COMMITTED_SNAPSHOT_INVALID",
		});
		expect(deps.provider.execute).not.toHaveBeenCalled();
		for (const field of ["version", "endpoint"] as const) {
			const mismatched = dependencies();
			mismatched.provider[field] = "wrong-provider-capability";
			await expect(runLocalMapsLiveAttempt({ intent, ...mismatched, now })).resolves.toEqual({
				kind: "UNKNOWN_PERSISTENCE_FAILED",
				reason: "COMMITTED_SNAPSHOT_INVALID",
			});
			expect(mismatched.provider.execute).not.toHaveBeenCalled();
		}
	});

	it("does not dispatch after the frozen lock window ends even with an active lease", async () => {
		const base = submittedSnapshot();
		const shortenedLock = mapsLockV1Schema.parse({
			...base.lock,
			timestampWindow: { ...base.lock.timestampWindow, endsAt: "2026-08-30T01:00:04.000Z" },
		});
		const snapshot = localMapsLiveSubmittedCandidateSchema.parse({
			...base,
			lock: shortenedLock,
			lockSnapshotCanonical: canonicalLocalMapsLockSnapshot(shortenedLock),
		});
		const deps = dependencies({ kind: "READY", committed: committed(snapshot, "token") });
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "UNKNOWN_PERSISTENCE_FAILED",
			reason: "COMMITTED_SNAPSHOT_INVALID",
		});
		expect(deps.provider.execute).not.toHaveBeenCalled();
	});

	it("rechecks the lease at actual dispatch and blocks an expiry between clock reads", async () => {
		const deps = dependencies();
		const times = [
			"2026-08-30T01:00:04.000Z",
			"2026-08-30T01:04:59.999Z",
			"2026-08-30T01:05:00.000Z",
			"2026-08-30T01:05:00.000Z",
		];
		const advancingNow = () => new Date(times.shift() ?? "2026-08-30T01:05:00.000Z");
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now: advancingNow })).resolves.toEqual({
			kind: "UNKNOWN_RECONCILIATION",
			reason: "COMMITTED_SNAPSHOT_INVALID",
		});
		expect(deps.provider.execute).not.toHaveBeenCalled();
		expect(deps.store.markSubmittedUnknown).toHaveBeenCalledTimes(1);
	});

	it("marks a submitted attempt unknown after a provider throw and never finalizes", async () => {
		const deps = dependencies();
		vi.mocked(deps.provider.execute).mockImplementationOnce(async () => {
			deps.order.push("provider");
			throw new Error("provider detail must not escape");
		});
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "UNKNOWN_RECONCILIATION",
			reason: "PROVIDER_CALL_THROWN",
		});
		expect(deps.order).toEqual(["commit-submitted", "provider", "unknown"]);
		expect(deps.store.finalizeSubmitted).not.toHaveBeenCalled();
		expect(deps.store.markSubmittedUnknown).toHaveBeenCalledWith(
			expect.objectContaining({
				continuation: expect.objectContaining({
					organizationId: ids.organizationId,
					attemptId: ids.attemptId,
					reservationId: ids.reservationId,
					rowVersion: 1,
				}),
			}),
		);
	});

	it("marks mismatched provider output unknown", async () => {
		const mismatched = { ...providerObservation(), executionKey: "forged-extra-identity" };
		const deps = dependencies(undefined, mismatched);
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "UNKNOWN_RECONCILIATION",
			reason: "PROVIDER_RESULT_INVALID",
		});
		expect(deps.provider.execute).toHaveBeenCalledTimes(1);
		expect(deps.store.finalizeSubmitted).not.toHaveBeenCalled();
	});

	it("rejects provider evidence observed in the future", async () => {
		const future = providerObservation({
			provenance: {
				evidenceKind: "MAPS_SERP_PROVIDER",
				checkReference: "https://maps.example/check/future",
				rawResponseReference: "raw/live/future.json",
				rawResponseSha256: `sha256:${"4".repeat(64)}`,
				providerObservedAt: "2026-08-30T01:00:04.500Z",
			},
		});
		const deps = dependencies(undefined, future);
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "UNKNOWN_RECONCILIATION",
			reason: "PROVIDER_RESULT_INVALID",
		});
	});

	it("rejects provider evidence dated before the actual dispatch", async () => {
		const stale = providerObservation({
			provenance: {
				evidenceKind: "MAPS_SERP_PROVIDER",
				checkReference: "https://maps.example/check/stale",
				rawResponseReference: "raw/live/stale.json",
				rawResponseSha256: `sha256:${"5".repeat(64)}`,
				providerObservedAt: "2026-08-30T01:00:03.999Z",
			},
		});
		const deps = dependencies(undefined, stale);
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "UNKNOWN_RECONCILIATION",
			reason: "PROVIDER_RESULT_INVALID",
		});
	});

	it("does not recall the provider when finalization is ambiguous", async () => {
		const deps = dependencies();
		vi.mocked(deps.store.finalizeSubmitted).mockImplementationOnce(async () => {
			deps.order.push("finalize");
			throw new Error("commit result unknown");
		});
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "UNKNOWN_RECONCILIATION",
			reason: "FINALIZE_AMBIGUOUS",
		});
		expect(deps.provider.execute).toHaveBeenCalledTimes(1);
		expect(deps.order).toEqual(["commit-submitted", "provider", "finalize", "unknown"]);
	});

	it("reports when even the reconciliation write cannot be confirmed", async () => {
		const deps = dependencies();
		vi.mocked(deps.provider.execute).mockRejectedValueOnce(new Error("provider failed"));
		vi.mocked(deps.store.markSubmittedUnknown).mockRejectedValueOnce(new Error("store failed"));
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "UNKNOWN_PERSISTENCE_FAILED",
			reason: "PROVIDER_CALL_THROWN",
		});
		expect(deps.provider.execute).toHaveBeenCalledTimes(1);
	});

	it("reports a final state already persisted after an ambiguous local path", async () => {
		const deps = dependencies();
		vi.mocked(deps.provider.execute).mockRejectedValueOnce(new Error("response lost"));
		vi.mocked(deps.store.markSubmittedUnknown).mockResolvedValueOnce({ kind: "ALREADY_FINALIZED" });
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "FINAL_STATE_ALREADY_PERSISTED",
			reason: "PROVIDER_CALL_THROWN",
		});
	});

	it("maps only a store-authorized third retryable attempt to terminal failure", async () => {
		const snapshot = submittedSnapshot(3);
		const retryable = providerObservation({
			event: { kind: "RETRYABLE_FAILURE", reason: "TIMEOUT" },
			targetRank: null,
			evidenceEligible: false,
		});
		const deps = dependencies({ kind: "READY", committed: committed(snapshot, "token-3") }, retryable);
		const result = await runLocalMapsLiveAttempt({ intent, ...deps, now });
		expect(result).toMatchObject({
			kind: "FINALIZED",
			disposition: { attemptStatus: "TERMINAL_FAILURE", retryAllowed: false },
		});
	});

	it("keeps OUTCOME_UNKNOWN non-retryable and reserved for reconciliation", async () => {
		const unknown = providerObservation({
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
		const deps = dependencies(undefined, unknown);
		const result = await runLocalMapsLiveAttempt({ intent, ...deps, now });
		expect(result).toMatchObject({
			kind: "FINALIZED",
			disposition: { attemptStatus: "UNKNOWN_RECONCILIATION", retryAllowed: false },
		});
		expect(deps.store.finalizeSubmitted).toHaveBeenCalledWith(
			expect.objectContaining({ requiredBudgetState: "RESERVED" }),
		);
	});

	it("refuses to publish a result when finalize violates the budget-state postcondition", async () => {
		const deps = dependencies();
		vi.mocked(deps.store.finalizeSubmitted).mockImplementationOnce(async ({ result: persistedResult }) => ({
			kind: "FINALIZED",
			persistedResult,
			persistedBudgetState: "RELEASED",
		}));
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "FINAL_STATE_ALREADY_PERSISTED",
			reason: "FINALIZE_POSTCONDITION_MISMATCH",
		});
		expect(deps.provider.execute).toHaveBeenCalledTimes(1);
		expect(deps.store.markSubmittedUnknown).not.toHaveBeenCalled();
	});

	it("requires RELEASED only for a known zero-cost result", async () => {
		const zero = providerObservation({
			cost: { status: "KNOWN", currency: "USD", amountUsd: "0.000000", basis: "actual" },
		});
		const deps = dependencies(undefined, zero);
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toMatchObject({ kind: "FINALIZED" });
		expect(deps.store.finalizeSubmitted).toHaveBeenCalledWith(
			expect.objectContaining({ requiredBudgetState: "RELEASED" }),
		);
	});

	it("keeps an estimated zero reserved for reconciliation", async () => {
		const estimatedZero = providerObservation({
			cost: { status: "KNOWN", currency: "USD", amountUsd: "0.000000", basis: "estimated" },
		});
		const deps = dependencies(undefined, estimatedZero);
		await expect(runLocalMapsLiveAttempt({ intent, ...deps, now })).resolves.toEqual({
			kind: "UNKNOWN_RECONCILIATION",
			reason: "ESTIMATED_ZERO_COST_UNRECONCILED",
		});
		expect(deps.store.finalizeSubmitted).not.toHaveBeenCalled();
		expect(deps.store.markSubmittedUnknown).toHaveBeenCalledTimes(1);
	});
});
