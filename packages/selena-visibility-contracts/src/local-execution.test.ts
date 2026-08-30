import { describe, expect, it } from "vitest";
import {
	assertClaimedAttemptReclaimable,
	assertMeasurementAttemptTransition,
	attemptDisposition,
	expectedLocalSlots,
	GENERIC_QUEUE_RETRY_LIMIT,
	localAiBaseSlotKey,
	localMapsBaseSlotKey,
	MAX_ATTEMPTS_PER_SLOT,
	maximumProviderAttempts,
	measurementExecutionKey,
	parseMeasurementExecutionKey,
} from "./local-execution";

const ids = {
	cycleId: "11111111-1111-4111-8111-111111111111",
	pointId: "22222222-2222-4222-8222-222222222222",
	keywordId: "33333333-3333-4333-8333-333333333333",
	promptId: "44444444-4444-4444-8444-444444444444",
};

describe("local execution cardinality and keys", () => {
	it("holds the Maps and Local AI acceptance cardinalities", () => {
		const maps = expectedLocalSlots({ points: 25, items: 5, systems: 1, repeats: 1 });
		const localAi = expectedLocalSlots({ points: 9, items: 3, systems: 2, repeats: 2 });
		expect(maps).toBe(125);
		expect(maximumProviderAttempts(maps)).toBe(375);
		expect(localAi).toBe(108);
		expect(maximumProviderAttempts(localAi)).toBe(324);
		expect(MAX_ATTEMPTS_PER_SLOT).toBe(3);
		expect(GENERIC_QUEUE_RETRY_LIMIT).toBe(0);
	});

	it("builds stable surface-specific slot and attempt keys", () => {
		const maps = localMapsBaseSlotKey({
			cycleId: ids.cycleId,
			pointId: ids.pointId,
			keywordId: ids.keywordId,
			providerId: "dataforseo-maps-v1",
			repeatIndex: 0,
		});
		const localAi = localAiBaseSlotKey({
			cycleId: ids.cycleId,
			pointId: ids.pointId,
			promptId: ids.promptId,
			systemId: "ask-maps",
			repeatIndex: 1,
		});
		expect(maps).toBe(`LOCAL_MAPS|${ids.cycleId}|${ids.pointId}|${ids.keywordId}|dataforseo-maps-v1|0`);
		expect(localAi).toBe(`LOCAL_AI|${ids.cycleId}|${ids.pointId}|${ids.promptId}|ask-maps|1`);
		expect(maps).not.toBe(localAi);
		const execution = measurementExecutionKey(maps, 3);
		expect(execution).toBe(`${maps}|3`);
		expect(parseMeasurementExecutionKey(execution)).toEqual({
			domainId: "LOCAL_MAPS",
			cycleId: ids.cycleId,
			pointId: ids.pointId,
			itemId: ids.keywordId,
			providerId: "dataforseo-maps-v1",
			repeatIndex: 0,
			attemptIndex: 3,
			baseSlotKey: maps,
		});
		expect(() =>
			localMapsBaseSlotKey({
				cycleId: ids.cycleId,
				pointId: ids.pointId,
				keywordId: ids.keywordId,
				providerId: "bad|provider",
				repeatIndex: 0,
			}),
		).toThrow();
		expect(() =>
			localMapsBaseSlotKey({
				cycleId: ids.cycleId,
				pointId: ids.pointId,
				keywordId: ids.keywordId,
				providerId: "bad\tprovider",
				repeatIndex: 0,
			}),
		).toThrow("EXECUTION_KEY_PART_WHITESPACE_INVALID");
		expect(() =>
			localMapsBaseSlotKey({
				cycleId: ids.cycleId,
				pointId: ids.pointId,
				keywordId: ids.keywordId,
				providerId: " provider",
				repeatIndex: 0,
			}),
		).toThrow("EXECUTION_KEY_PART_WHITESPACE_INVALID");
		expect(() => measurementExecutionKey(maps, 4 as 3)).toThrow();
		expect(() => parseMeasurementExecutionKey(`${maps}|0`)).toThrow("MEASUREMENT_EXECUTION_KEY_INVALID");
		expect(() => parseMeasurementExecutionKey(maps.replace("LOCAL_MAPS", "LOCAL"))).toThrow(
			"MEASUREMENT_EXECUTION_KEY_INVALID",
		);
	});
});

describe("controlled attempt disposition", () => {
	it("never retries found or absent observations", () => {
		expect(attemptDisposition(1, { kind: "FOUND" })).toMatchObject({
			attemptStatus: "SUCCEEDED",
			observationValidity: "VALID",
			observationOutcome: "FOUND",
			retryAllowed: false,
		});
		expect(attemptDisposition(1, { kind: "ABSENT_WITHIN_DEPTH" })).toMatchObject({
			attemptStatus: "SUCCEEDED",
			observationValidity: "VALID",
			observationOutcome: "ABSENT_WITHIN_DEPTH",
			retryAllowed: false,
		});
	});

	it("allows only two controlled retries and maps the final reason", () => {
		const finalReasons = {
			EMPTY_RESPONSE: "EMPTY_AFTER_3_ATTEMPTS",
			TRUNCATED_RESPONSE: "EMPTY_AFTER_3_ATTEMPTS",
			TIMEOUT: "PROVIDER_UNAVAILABLE",
			PROVIDER_5XX: "PROVIDER_UNAVAILABLE",
			RATE_LIMITED: "RATE_LIMIT_EXHAUSTED",
			MALFORMED_RESPONSE: "MALFORMED_AFTER_3_ATTEMPTS",
		} as const;
		for (const [reason, finalInvalidReason] of Object.entries(finalReasons)) {
			for (const attempt of [1, 2] as const) {
				expect(
					attemptDisposition(attempt, { kind: "RETRYABLE_FAILURE", reason: reason as keyof typeof finalReasons }),
				).toMatchObject({
					attemptStatus: "RETRYABLE_FAILURE",
					observationValidity: "UNMEASURED",
					retryAllowed: true,
					finalInvalidReason: null,
				});
			}
			expect(
				attemptDisposition(3, { kind: "RETRYABLE_FAILURE", reason: reason as keyof typeof finalReasons }),
			).toMatchObject({
				attemptStatus: "TERMINAL_FAILURE",
				observationValidity: "INVALID",
				cycleStatus: "PARTIAL_FAILURE",
				retryAllowed: false,
				finalInvalidReason,
			});
		}
	});

	it("fails auth, locked input and ambiguous dispatch closed", () => {
		expect(attemptDisposition(1, { kind: "PROVIDER_AUTH_FAILURE" })).toMatchObject({
			observationOutcome: "PROVIDER_BLOCKED",
			cycleStatus: "PROVIDER_BLOCKED",
			retryAllowed: false,
		});
		expect(attemptDisposition(1, { kind: "LOCKED_REQUEST_INVALID" })).toMatchObject({
			observationOutcome: "PREFLIGHT_BLOCKED",
			cycleStatus: "PREFLIGHT_BLOCKED",
			retryAllowed: false,
		});
		expect(attemptDisposition(1, { kind: "OUTCOME_UNKNOWN" })).toMatchObject({
			attemptStatus: "UNKNOWN_RECONCILIATION",
			cycleStatus: "STOPPED",
			retryAllowed: false,
		});
	});

	it("allows only claim to submit and submit to a final recorded outcome", () => {
		expect(() => assertMeasurementAttemptTransition("CLAIMED", "SUBMITTED")).not.toThrow();
		expect(() => assertMeasurementAttemptTransition("SUBMITTED", "SUCCEEDED")).not.toThrow();
		expect(() => assertMeasurementAttemptTransition("SUBMITTED", "UNKNOWN_RECONCILIATION")).not.toThrow();
		expect(() => assertMeasurementAttemptTransition("CLAIMED", "SUCCEEDED")).toThrow(
			"MEASUREMENT_ATTEMPT_TRANSITION_BLOCKED",
		);
		expect(() => assertMeasurementAttemptTransition("SUCCEEDED", "SUBMITTED")).toThrow(
			"MEASUREMENT_ATTEMPT_TRANSITION_BLOCKED",
		);
	});

	it("reclaims only an expired pre-submission claim using the same attempt row", () => {
		const expired = {
			attemptId: "55555555-5555-4555-8555-555555555555",
			reservationId: "66666666-6666-4666-8666-666666666666",
			executionKey: `${localMapsBaseSlotKey({
				cycleId: ids.cycleId,
				pointId: ids.pointId,
				keywordId: ids.keywordId,
				providerId: "dataforseo-maps-v1",
				repeatIndex: 0,
			})}|2`,
			attemptIndex: 2,
			status: "CLAIMED",
			submittedAt: null,
			leaseExpiresAt: "2026-08-30T01:00:00.000Z",
		} as const;
		expect(assertClaimedAttemptReclaimable(expired, new Date("2026-08-30T01:00:00.000Z"))).toEqual({
			action: "RECLAIM_EXISTING_ATTEMPT",
			attemptId: expired.attemptId,
			reservationId: expired.reservationId,
			executionKey: expired.executionKey,
			attemptIndex: expired.attemptIndex,
			createAttempt: false,
			createReservation: false,
		});
		expect(() => assertClaimedAttemptReclaimable(expired, new Date("2026-08-30T00:59:59.999Z"))).toThrow(
			"MEASUREMENT_ATTEMPT_LEASE_ACTIVE",
		);
		expect(() =>
			assertClaimedAttemptReclaimable(
				{ ...expired, submittedAt: "2026-08-30T00:59:00.000Z" },
				new Date("2026-08-30T02:00:00.000Z"),
			),
		).toThrow();
		expect(() =>
			assertClaimedAttemptReclaimable({ ...expired, attemptIndex: 3 }, new Date("2026-08-30T02:00:00.000Z")),
		).toThrow("MEASUREMENT_ATTEMPT_KEY_INDEX_MISMATCH");
	});
});
