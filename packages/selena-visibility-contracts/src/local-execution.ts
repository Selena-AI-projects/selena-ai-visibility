import { z } from "zod";

export const measurementDomainIds = ["AI", "LOCAL_MAPS", "LOCAL_AI", "SEARCH", "REPUTATION", "OUTCOME"] as const;
export type MeasurementDomainId = (typeof measurementDomainIds)[number];

export const localExecutionDomainIds = ["LOCAL_MAPS", "LOCAL_AI"] as const;
export type LocalExecutionDomainId = (typeof localExecutionDomainIds)[number];

export const MAX_ATTEMPTS_PER_SLOT = 3 as const;
export const GENERIC_QUEUE_RETRY_LIMIT = 0 as const;

export const measurementAttemptStatuses = [
	"CLAIMED",
	"SUBMITTED",
	"SUCCEEDED",
	"RETRYABLE_FAILURE",
	"TERMINAL_FAILURE",
	"UNKNOWN_RECONCILIATION",
] as const;
export type MeasurementAttemptStatus = (typeof measurementAttemptStatuses)[number];

export const retryableAttemptReasons = [
	"EMPTY_RESPONSE",
	"TRUNCATED_RESPONSE",
	"TIMEOUT",
	"PROVIDER_5XX",
	"RATE_LIMITED",
	"MALFORMED_RESPONSE",
] as const;
export type RetryableAttemptReason = (typeof retryableAttemptReasons)[number];

export const finalInvalidReasons = [
	"EMPTY_AFTER_3_ATTEMPTS",
	"PROVIDER_UNAVAILABLE",
	"RATE_LIMIT_EXHAUSTED",
	"MALFORMED_AFTER_3_ATTEMPTS",
] as const;
export type FinalInvalidReason = (typeof finalInvalidReasons)[number];

export const localObservationValidities = ["VALID", "INVALID", "UNMEASURED"] as const;
export type LocalObservationValidity = (typeof localObservationValidities)[number];

export const localObservationOutcomes = [
	"FOUND",
	"ABSENT_WITHIN_DEPTH",
	"RETRY_PENDING",
	"PROVIDER_ERROR",
	"PROVIDER_BLOCKED",
	"PREFLIGHT_BLOCKED",
	"UNKNOWN_RECONCILIATION",
] as const;
export type LocalObservationOutcome = (typeof localObservationOutcomes)[number];

export const localCycleExecutionStatuses = [
	"RUNNING",
	"PARTIAL_FAILURE",
	"PROVIDER_BLOCKED",
	"PREFLIGHT_BLOCKED",
	"STOPPED",
] as const;
export type LocalCycleExecutionStatus = (typeof localCycleExecutionStatuses)[number];

const attemptIndexSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const executionKeyPartSchema = z
	.string()
	.min(1)
	.regex(/^\S+$/, "EXECUTION_KEY_PART_WHITESPACE_INVALID")
	.refine((value) => !value.includes("|"), "EXECUTION_KEY_PART_INVALID");
const baseSlotKeySchema = z
	.string()
	.trim()
	.refine((value) => {
		const parts = value.split("|");
		return (
			parts.length === 6 &&
			localExecutionDomainIds.includes(parts[0] as LocalExecutionDomainId) &&
			parts.every((part) => part.length > 0) &&
			/^\d+$/.test(parts[5])
		);
	}, "BASE_SLOT_KEY_INVALID");

export const localMapsSlotSchema = z.strictObject({
	cycleId: z.string().uuid(),
	pointId: z.string().uuid(),
	keywordId: z.string().uuid(),
	providerId: executionKeyPartSchema,
	repeatIndex: z.number().int().nonnegative(),
});
export type LocalMapsSlot = z.infer<typeof localMapsSlotSchema>;

export const localAiSlotSchema = z.strictObject({
	cycleId: z.string().uuid(),
	pointId: z.string().uuid(),
	promptId: z.string().uuid(),
	systemId: executionKeyPartSchema,
	repeatIndex: z.number().int().nonnegative(),
});
export type LocalAiSlot = z.infer<typeof localAiSlotSchema>;

const joinKey = (parts: readonly (string | number)[]): string => parts.join("|");

export function localMapsBaseSlotKey(input: LocalMapsSlot): string {
	const slot = localMapsSlotSchema.parse(input);
	return joinKey(["LOCAL_MAPS", slot.cycleId, slot.pointId, slot.keywordId, slot.providerId, slot.repeatIndex]);
}

export function localAiBaseSlotKey(input: LocalAiSlot): string {
	const slot = localAiSlotSchema.parse(input);
	return joinKey(["LOCAL_AI", slot.cycleId, slot.pointId, slot.promptId, slot.systemId, slot.repeatIndex]);
}

export function measurementExecutionKey(baseSlotKey: string, attemptIndex: 1 | 2 | 3): string {
	const base = baseSlotKeySchema.parse(baseSlotKey);
	const attempt = attemptIndexSchema.parse(attemptIndex);
	return `${base}|${attempt}`;
}

export type LocalCardinalityShape = {
	points: number;
	items: number;
	systems: number;
	repeats: number;
};

const positiveInteger = z.number().int().positive();
export function expectedLocalSlots(input: LocalCardinalityShape): number {
	const values = [input.points, input.items, input.systems, input.repeats].map((value) => positiveInteger.parse(value));
	return values.reduce((product, value) => product * value, 1);
}

export function maximumProviderAttempts(expectedSlots: number): number {
	return positiveInteger.parse(expectedSlots) * MAX_ATTEMPTS_PER_SLOT;
}

export type AttemptEvent =
	| { kind: "FOUND" }
	| { kind: "ABSENT_WITHIN_DEPTH" }
	| { kind: "RETRYABLE_FAILURE"; reason: RetryableAttemptReason }
	| { kind: "PROVIDER_AUTH_FAILURE" }
	| { kind: "LOCKED_REQUEST_INVALID" }
	| { kind: "OUTCOME_UNKNOWN" };

export type AttemptDisposition = {
	attemptStatus: MeasurementAttemptStatus;
	observationValidity: LocalObservationValidity;
	observationOutcome: LocalObservationOutcome;
	cycleStatus: LocalCycleExecutionStatus;
	retryAllowed: boolean;
	finalInvalidReason: FinalInvalidReason | null;
};

const finalReasonByRetryable: Record<RetryableAttemptReason, FinalInvalidReason> = {
	EMPTY_RESPONSE: "EMPTY_AFTER_3_ATTEMPTS",
	TRUNCATED_RESPONSE: "EMPTY_AFTER_3_ATTEMPTS",
	TIMEOUT: "PROVIDER_UNAVAILABLE",
	PROVIDER_5XX: "PROVIDER_UNAVAILABLE",
	RATE_LIMITED: "RATE_LIMIT_EXHAUSTED",
	MALFORMED_RESPONSE: "MALFORMED_AFTER_3_ATTEMPTS",
};

export function attemptDisposition(attemptIndex: 1 | 2 | 3, event: AttemptEvent): AttemptDisposition {
	const attempt = attemptIndexSchema.parse(attemptIndex);
	if (event.kind === "FOUND" || event.kind === "ABSENT_WITHIN_DEPTH") {
		return {
			attemptStatus: "SUCCEEDED",
			observationValidity: "VALID",
			observationOutcome: event.kind,
			cycleStatus: "RUNNING",
			retryAllowed: false,
			finalInvalidReason: null,
		};
	}
	if (event.kind === "RETRYABLE_FAILURE") {
		const reason = z.enum(retryableAttemptReasons).parse(event.reason);
		if (attempt < MAX_ATTEMPTS_PER_SLOT) {
			return {
				attemptStatus: "RETRYABLE_FAILURE",
				observationValidity: "UNMEASURED",
				observationOutcome: "RETRY_PENDING",
				cycleStatus: "RUNNING",
				retryAllowed: true,
				finalInvalidReason: null,
			};
		}
		return {
			attemptStatus: "TERMINAL_FAILURE",
			observationValidity: "INVALID",
			observationOutcome: "PROVIDER_ERROR",
			cycleStatus: "PARTIAL_FAILURE",
			retryAllowed: false,
			finalInvalidReason: finalReasonByRetryable[reason],
		};
	}
	if (event.kind === "PROVIDER_AUTH_FAILURE") {
		return {
			attemptStatus: "TERMINAL_FAILURE",
			observationValidity: "UNMEASURED",
			observationOutcome: "PROVIDER_BLOCKED",
			cycleStatus: "PROVIDER_BLOCKED",
			retryAllowed: false,
			finalInvalidReason: null,
		};
	}
	if (event.kind === "LOCKED_REQUEST_INVALID") {
		return {
			attemptStatus: "TERMINAL_FAILURE",
			observationValidity: "UNMEASURED",
			observationOutcome: "PREFLIGHT_BLOCKED",
			cycleStatus: "PREFLIGHT_BLOCKED",
			retryAllowed: false,
			finalInvalidReason: null,
		};
	}
	return {
		attemptStatus: "UNKNOWN_RECONCILIATION",
		observationValidity: "UNMEASURED",
		observationOutcome: "UNKNOWN_RECONCILIATION",
		cycleStatus: "STOPPED",
		retryAllowed: false,
		finalInvalidReason: null,
	};
}

const allowedAttemptTransitions: Record<MeasurementAttemptStatus, readonly MeasurementAttemptStatus[]> = {
	CLAIMED: ["SUBMITTED"],
	SUBMITTED: ["SUCCEEDED", "RETRYABLE_FAILURE", "TERMINAL_FAILURE", "UNKNOWN_RECONCILIATION"],
	SUCCEEDED: [],
	RETRYABLE_FAILURE: [],
	TERMINAL_FAILURE: [],
	UNKNOWN_RECONCILIATION: [],
};

export function assertMeasurementAttemptTransition(from: MeasurementAttemptStatus, to: MeasurementAttemptStatus): void {
	const current = z.enum(measurementAttemptStatuses).parse(from);
	const next = z.enum(measurementAttemptStatuses).parse(to);
	if (!allowedAttemptTransitions[current].includes(next)) throw new Error("MEASUREMENT_ATTEMPT_TRANSITION_BLOCKED");
}

export const claimedAttemptLeaseSchema = z
	.strictObject({
		attemptId: z.string().uuid(),
		reservationId: z.string().uuid(),
		executionKey: z.string().trim().min(1),
		attemptIndex: attemptIndexSchema,
		status: z.literal("CLAIMED"),
		submittedAt: z.null(),
		leaseExpiresAt: z.iso.datetime(),
	})
	.refine((claim) => claim.executionKey.endsWith(`|${claim.attemptIndex}`), "MEASUREMENT_ATTEMPT_KEY_INDEX_MISMATCH");

export const claimedAttemptReclaimDirectiveSchema = z.strictObject({
	action: z.literal("RECLAIM_EXISTING_ATTEMPT"),
	attemptId: z.string().uuid(),
	reservationId: z.string().uuid(),
	executionKey: z.string().trim().min(1),
	attemptIndex: attemptIndexSchema,
	createAttempt: z.literal(false),
	createReservation: z.literal(false),
});
export type ClaimedAttemptReclaimDirective = z.infer<typeof claimedAttemptReclaimDirectiveSchema>;

// A CLAIMED row proves the provider was not called because SUBMITTED must be
// persisted first. Reclaiming reuses the same row and execution key; it never
// creates another attempt or another reservation.
export function assertClaimedAttemptReclaimable(input: unknown, now: Date): ClaimedAttemptReclaimDirective {
	const claim = claimedAttemptLeaseSchema.parse(input);
	if (!Number.isFinite(now.getTime())) throw new Error("MEASUREMENT_ATTEMPT_RECLAIM_TIME_INVALID");
	if (new Date(claim.leaseExpiresAt).getTime() > now.getTime()) throw new Error("MEASUREMENT_ATTEMPT_LEASE_ACTIVE");
	return claimedAttemptReclaimDirectiveSchema.parse({
		action: "RECLAIM_EXISTING_ATTEMPT",
		attemptId: claim.attemptId,
		reservationId: claim.reservationId,
		executionKey: claim.executionKey,
		attemptIndex: claim.attemptIndex,
		createAttempt: false,
		createReservation: false,
	});
}
