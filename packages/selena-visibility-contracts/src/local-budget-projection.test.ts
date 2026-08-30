import { describe, expect, it } from "vitest";
import {
	type LocalBudgetClaimProjectionInput,
	type LocalBudgetExposureSnapshotRow,
	projectLocalBudgetClaim,
} from "./local-budget-projection";

const cycleA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const cycleB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const pointId = "11111111-1111-4111-8111-111111111111";
const keywordId = "22222222-2222-4222-8222-222222222222";

function executionKey(cycleId: string, providerId: string, attemptIndex: 1 | 2 | 3 = 1): string {
	return `LOCAL_MAPS|${cycleId}|${pointId}|${keywordId}|${providerId}|0|${attemptIndex}`;
}

function projection(overrides: Partial<LocalBudgetClaimProjectionInput> = {}): LocalBudgetClaimProjectionInput {
	return {
		organizationId: "org-1",
		domainId: "LOCAL_MAPS",
		measurementCycleId: cycleA,
		periodKey: "2026-08",
		executionKey: executionKey(cycleA, "new"),
		reservationId: "33333333-3333-4333-8333-333333333333",
		requestedReserveUsd: "0.100000",
		surfaceCapUsd: "1.000000",
		monthlyCapUsd: "2.000000",
		priceSnapshotVersion: "price-v1",
		...overrides,
	};
}

function exposure(overrides: Partial<LocalBudgetExposureSnapshotRow> = {}): LocalBudgetExposureSnapshotRow {
	return {
		organizationId: "org-1",
		domainId: "LOCAL_MAPS",
		measurementCycleId: cycleA,
		periodKey: "2026-08",
		executionKey: executionKey(cycleA, "existing"),
		reservationId: "44444444-4444-4444-8444-444444444444",
		budgetState: "RESERVED",
		reservedCostUsd: "0.900000",
		spentCostUsd: "0.000000",
		surfaceCapUsd: "1.000000",
		monthlyCapUsd: "2.000000",
		priceSnapshotVersion: "price-v1",
		...overrides,
	};
}

describe("non-authoritative Local aggregate budget projection", () => {
	it("projects the exact cap boundary as FITS and one micro above as EXCEEDS", () => {
		expect(projectLocalBudgetClaim([exposure()], projection())).toMatchObject({
			fit: "FITS",
			projectedSurfaceExposureUsd: "1.000000",
		});
		expect(projectLocalBudgetClaim([exposure()], projection({ requestedReserveUsd: "0.100001" }))).toMatchObject({
			fit: "EXCEEDS",
			reason: "SURFACE_CAP_EXCEEDED",
		});
	});

	it("counts active reserves and actual spend, while released rows free exposure", () => {
		const rows = [
			exposure({ executionKey: executionKey(cycleA, "reserved"), reservedCostUsd: "0.300000" }),
			exposure({
				executionKey: executionKey(cycleA, "spent"),
				budgetState: "SPENT",
				reservedCostUsd: "0.200000",
				spentCostUsd: "0.250000",
			}),
			exposure({
				executionKey: executionKey(cycleA, "released"),
				budgetState: "RELEASED",
				reservedCostUsd: "0.400000",
			}),
		];
		expect(projectLocalBudgetClaim(rows, projection({ requestedReserveUsd: "0.100000" }))).toMatchObject({
			fit: "FITS",
			currentSurfaceExposureUsd: "0.550000",
			projectedSurfaceExposureUsd: "0.650000",
		});
	});

	it("keeps unreconciled unknown work exposed by representing it as RESERVED", () => {
		const unknownReserve = exposure({ executionKey: executionKey(cycleA, "unknown"), reservedCostUsd: "1.000000" });
		expect(projectLocalBudgetClaim([unknownReserve], projection({ requestedReserveUsd: "0.000001" }))).toMatchObject({
			fit: "EXCEEDS",
			reason: "SURFACE_CAP_EXCEEDED",
		});
	});

	it("recognizes only an exact active reservation replay", () => {
		const input = projection({ executionKey: executionKey(cycleA, "same") });
		const row = exposure({
			executionKey: input.executionKey,
			reservationId: input.reservationId,
			reservedCostUsd: input.requestedReserveUsd,
			surfaceCapUsd: input.surfaceCapUsd,
			monthlyCapUsd: input.monthlyCapUsd,
			priceSnapshotVersion: input.priceSnapshotVersion,
		});
		expect(projectLocalBudgetClaim([row], input)).toEqual({
			fit: "EXACT_REPLAY",
			reason: null,
			currentSurfaceExposureUsd: "0.100000",
			currentMonthlyExposureUsd: "0.100000",
			projectedSurfaceExposureUsd: "0.100000",
			projectedMonthlyExposureUsd: "0.100000",
		});
		expect(projectLocalBudgetClaim([row], { ...input, requestedReserveUsd: "0.100001" })).toMatchObject({
			fit: "CONFLICT",
			reason: "EXISTING_EXECUTION_MISMATCH",
		});
		expect(projectLocalBudgetClaim([{ ...row, budgetState: "SPENT" }], input)).toMatchObject({
			fit: "CONFLICT",
			reason: "EXECUTION_ALREADY_FINALIZED",
		});
	});

	it("separates surface cycles but aggregates the explicit immutable monthly period", () => {
		const priorCycle = exposure({
			measurementCycleId: cycleB,
			executionKey: executionKey(cycleB, "prior-cycle"),
			reservedCostUsd: "1.950000",
		});
		expect(projectLocalBudgetClaim([priorCycle], projection())).toMatchObject({
			fit: "EXCEEDS",
			reason: "MONTHLY_CAP_EXCEEDED",
			currentSurfaceExposureUsd: "0.000000",
			currentMonthlyExposureUsd: "1.950000",
		});
		const priorPeriod = { ...priorCycle, periodKey: "2026-07" };
		expect(projectLocalBudgetClaim([priorPeriod], projection())).toMatchObject({
			fit: "FITS",
			currentMonthlyExposureUsd: "0.000000",
		});
	});

	it("blocks new claims after a truthful provider overcharge exceeds a cap", () => {
		const overcharge = exposure({ budgetState: "SPENT", reservedCostUsd: "0.500000", spentCostUsd: "1.000001" });
		expect(projectLocalBudgetClaim([overcharge], projection({ requestedReserveUsd: "0.000001" }))).toMatchObject({
			fit: "EXCEEDS",
			reason: "SURFACE_CAP_EXCEEDED",
			currentSurfaceExposureUsd: "1.000001",
		});
	});

	it("fails closed on fictitious periods, cross-cycle keys and impossible released spend", () => {
		expect(() => projectLocalBudgetClaim([], projection({ periodKey: "2026-13" }))).toThrow();
		expect(() =>
			projectLocalBudgetClaim([], projection({ executionKey: executionKey(cycleB, "wrong-cycle") })),
		).toThrow();
		expect(() =>
			projectLocalBudgetClaim([exposure({ budgetState: "RELEASED", spentCostUsd: "0.000001" })], projection()),
		).toThrow();
	});

	it("rejects non-canonical or out-of-range repeat aliases in execution keys", () => {
		const canonical = projection().executionKey;
		for (const repeat of ["00", "01", "2147483648"]) {
			const parts = canonical.split("|");
			parts[5] = repeat;
			expect(() => projectLocalBudgetClaim([], projection({ executionKey: parts.join("|") }))).toThrow();
		}
	});

	it("fails closed when one aggregate snapshot contains duplicate execution exposure", () => {
		const row = exposure();
		expect(() => projectLocalBudgetClaim([row, row], projection())).toThrow(
			"LOCAL_BUDGET_DUPLICATE_EXECUTION_EXPOSURE",
		);
	});
});
