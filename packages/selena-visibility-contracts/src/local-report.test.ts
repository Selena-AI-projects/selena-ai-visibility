import { describe, expect, it } from "vitest";
import { assertMeasurementAttemptTransition } from "./local-execution.js";
import {
	assertLocalObservationTransition,
	type LocalPilotObservation,
	localPilotObservationCounts,
	localPilotObservationSchema,
} from "./local-report.js";

const id = "00000000-0000-4000-8000-000000000001";
const evidenceId = "00000000-0000-4000-8000-000000000002";
const capturedAt = "2026-09-25T12:00:00.000Z";

const pending: LocalPilotObservation = {
	id,
	outcome: "PENDING",
	validity: null,
	targetRank: null,
	capturedAt: null,
	reason: null,
	evidenceId: null,
};
const found: LocalPilotObservation = {
	...pending,
	outcome: "FOUND",
	validity: "VALID",
	targetRank: 3,
	capturedAt,
	evidenceId,
};

describe("local pilot observations", () => {
	it("accepts a measured rank only with its evidence", () => {
		expect(localPilotObservationSchema.safeParse(found).success).toBe(true);
		expect(localPilotObservationSchema.safeParse({ ...found, evidenceId: null }).success).toBe(false);
	});

	it("allows a stopped cycle to cancel a slot only with no capture and the stop reason", () => {
		const cancelled = { ...pending, outcome: "CANCELLED", validity: "UNMEASURED", reason: "LOCAL_STOPPED" };
		expect(localPilotObservationSchema.safeParse(cancelled).success).toBe(true);
		expect(localPilotObservationSchema.safeParse({ ...cancelled, reason: "OTHER" }).success).toBe(false);
		expect(localPilotObservationSchema.safeParse({ ...cancelled, capturedAt }).success).toBe(false);
	});

	it("lets a pending slot settle once and never changes a settled one", () => {
		expect(() => assertLocalObservationTransition(pending, found)).not.toThrow();
		expect(() => assertLocalObservationTransition(found, { ...found, targetRank: 1 })).toThrow(
			"LOCAL_OBSERVATION_TERMINAL_IMMUTABLE",
		);
	});

	it("counts outcomes against the nine-slot cycle", () => {
		expect(localPilotObservationCounts([pending, { ...found, id: evidenceId }])).toMatchObject({
			expected: 9,
			terminal: 1,
			valid: 1,
			pending: 1,
		});
	});
});

describe("measurement attempts", () => {
	it("cancels a claimed attempt that never reached the provider, and nothing after", () => {
		expect(() => assertMeasurementAttemptTransition("CLAIMED", "CANCELLED_NO_CALL")).not.toThrow();
		expect(() => assertMeasurementAttemptTransition("SUBMITTED", "CANCELLED_NO_CALL")).toThrow(
			"MEASUREMENT_ATTEMPT_TRANSITION_BLOCKED",
		);
		expect(() => assertMeasurementAttemptTransition("CANCELLED_NO_CALL", "SUBMITTED")).toThrow(
			"MEASUREMENT_ATTEMPT_TRANSITION_BLOCKED",
		);
	});
});
