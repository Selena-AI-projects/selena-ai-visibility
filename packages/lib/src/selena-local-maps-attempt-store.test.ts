import { localMapsLiveProviderResultSchema } from "@workspace/selena-visibility-contracts";
import { describe, expect, it } from "vitest";
import { settleLocalMapsBudget } from "./selena-local-maps-attempt-store";

const ids = {
	organizationId: "00000000-0000-4000-8000-000000000001",
	measurementCycleId: "00000000-0000-4000-8000-000000000002",
	localCycleId: "00000000-0000-4000-8000-000000000003",
	configurationLockId: "00000000-0000-4000-8000-000000000004",
	attemptId: "00000000-0000-4000-8000-000000000005",
	reservationId: "00000000-0000-4000-8000-000000000006",
};

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
