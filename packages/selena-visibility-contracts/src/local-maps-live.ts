import { z } from "zod";
import {
	type AttemptEvent,
	executionKeyPartSchema,
	measurementExecutionKey,
	retryableAttemptReasons,
} from "./local-execution.js";
import {
	type MapsLockSlotPlan,
	type MapsLockV1,
	mapsLockSlotPlanSchema,
	mapsLockV1Schema,
	mapsProviderLockSchema,
	mapsRequestLockSchema,
	mapsTargetIdentitySchema,
	planMapsLockSlots,
} from "./local-locks.js";

const sha256ReferenceSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const noWhitespaceSchema = z.string().min(1).regex(/^\S+$/);
const attemptIndexSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const usdAmountSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);
const liveProviderIdSchema = executionKeyPartSchema.refine(
	(value) => !/^(?:stub|noop)(?:-|$)/i.test(value),
	"LOCAL_MAPS_LIVE_PROVIDER_RESERVED_ID",
);
const liveReferenceSchema = noWhitespaceSchema.refine(
	(value) => !/^(?:stub-local-maps:|stub:)/i.test(value),
	"LOCAL_MAPS_LIVE_REFERENCE_RESERVED",
);

export const LOCAL_MAPS_CANONICALIZATION_VERSION = "canonical-json-code-unit-v1" as const;

function micros(amount: string): bigint {
	const [whole, fraction = ""] = usdAmountSchema.parse(amount).split(".");
	return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
}

function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (value !== null && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`);
		return `{${entries.join(",")}}`;
	}
	return JSON.stringify(value);
}

export const localMapsLiveKeywordSchema = z.strictObject({
	id: z.string().uuid(),
	text: z.string().trim().min(1),
	keywordSetId: z.string().uuid(),
	keywordSetVersion: z.number().int().positive(),
});
export type LocalMapsLiveKeyword = z.infer<typeof localMapsLiveKeywordSchema>;

export const localMapsMaterializedProviderRequestSchema = z.strictObject({
	schemaVersion: z.literal(1),
	provider: mapsProviderLockSchema.extend({ id: liveProviderIdSchema }),
	point: z.strictObject({
		id: z.string().uuid(),
		pointIndex: z.number().int().nonnegative(),
		latitude: mapsLockSlotPlanSchema.shape.latitude,
		longitude: mapsLockSlotPlanSchema.shape.longitude,
	}),
	keyword: localMapsLiveKeywordSchema,
	targetIdentity: mapsTargetIdentitySchema,
	params: mapsRequestLockSchema,
	repeatIndex: z.number().int().nonnegative(),
});
export type LocalMapsMaterializedProviderRequest = z.infer<typeof localMapsMaterializedProviderRequestSchema>;

export function materializeLocalMapsProviderRequest(
	lockInput: MapsLockV1,
	slotInput: MapsLockSlotPlan,
	keywordInput: LocalMapsLiveKeyword,
): LocalMapsMaterializedProviderRequest {
	const lock = mapsLockV1Schema.parse(lockInput);
	const slot = mapsLockSlotPlanSchema.parse(slotInput);
	const keyword = localMapsLiveKeywordSchema.parse(keywordInput);
	return localMapsMaterializedProviderRequestSchema.parse({
		schemaVersion: 1,
		provider: lock.provider,
		point: {
			id: slot.pointId,
			pointIndex: slot.pointIndex,
			latitude: slot.latitude,
			longitude: slot.longitude,
		},
		keyword,
		targetIdentity: lock.targetIdentity,
		params: lock.request,
		repeatIndex: slot.repeatIndex,
	});
}

export function canonicalLocalMapsLockSnapshot(lock: MapsLockV1): string {
	return canonicalJson(mapsLockV1Schema.parse(lock));
}

export function canonicalLocalMapsProviderRequest(request: LocalMapsMaterializedProviderRequest): string {
	return canonicalJson(localMapsMaterializedProviderRequestSchema.parse(request));
}

/**
 * A caller-supplied snapshot candidate. Parsing this object proves internal
 * consistency only; it never proves a database transition, tenant binding,
 * aggregate budget claim or permission to call a provider.
 */
export const localMapsLiveSubmittedCandidateSchema = z
	.strictObject({
		schemaVersion: z.literal(1),
		kind: z.literal("LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE"),
		mode: z.literal("LIVE_PROVIDER"),
		canonicalizationVersion: z.literal(LOCAL_MAPS_CANONICALIZATION_VERSION),
		scope: z.strictObject({
			organizationId: z.string().trim().min(1),
			measurementCycleId: z.string().uuid(),
			localCycleId: z.string().uuid(),
			configurationLockId: z.string().uuid(),
			domainId: z.literal("LOCAL_MAPS"),
		}),
		lockSnapshotCanonical: z.string().min(1),
		requestSnapshotCanonical: z.string().min(1),
		lock: mapsLockV1Schema,
		slot: mapsLockSlotPlanSchema,
		keyword: localMapsLiveKeywordSchema,
		providerRequest: localMapsMaterializedProviderRequestSchema,
		attempt: z.strictObject({
			attemptId: z.string().uuid(),
			reservationId: z.string().uuid(),
			observationRef: noWhitespaceSchema,
			attemptIndex: attemptIndexSchema,
			baseSlotKey: z.string().min(1),
			executionKey: z.string().min(1),
			statusSnapshot: z.literal("SUBMITTED"),
			claimedAt: z.iso.datetime(),
			submittedAt: z.iso.datetime(),
			leaseExpiresAt: z.iso.datetime(),
		}),
		budgetReservation: z.strictObject({
			currency: z.literal("USD"),
			reservedCostUsd: usdAmountSchema,
			surfaceCapUsd: usdAmountSchema,
			monthlyCapUsd: usdAmountSchema,
			priceSnapshotVersion: executionKeyPartSchema,
		}),
	})
	.superRefine((input, issues) => {
		const expectedSlot = planMapsLockSlots(input.scope.measurementCycleId, input.lock).find(
			(slot) => slot.executionKey === input.slot.executionKey,
		);
		if (expectedSlot === undefined || canonicalJson(expectedSlot) !== canonicalJson(input.slot))
			issues.addIssue({ code: "custom", message: "LOCAL_MAPS_LIVE_SLOT_LOCK_MISMATCH", path: ["slot"] });
		if (
			input.slot.measurementCycleId !== input.scope.measurementCycleId ||
			input.keyword.id !== input.slot.keywordId ||
			input.keyword.keywordSetId !== input.lock.keywordSet.id ||
			input.keyword.keywordSetVersion !== input.lock.keywordSet.version
		)
			issues.addIssue({ code: "custom", message: "LOCAL_MAPS_LIVE_SCOPE_LOCK_MISMATCH" });
		if (
			input.attempt.baseSlotKey !== input.slot.baseSlotKey ||
			input.attempt.executionKey !== measurementExecutionKey(input.slot.baseSlotKey, input.attempt.attemptIndex)
		)
			issues.addIssue({ code: "custom", message: "LOCAL_MAPS_LIVE_ATTEMPT_KEY_MISMATCH", path: ["attempt"] });
		if (new Date(input.attempt.submittedAt) < new Date(input.attempt.claimedAt))
			issues.addIssue({ code: "custom", message: "LOCAL_MAPS_LIVE_SUBMISSION_TIME_INVALID", path: ["attempt"] });
		if (new Date(input.attempt.leaseExpiresAt) <= new Date(input.attempt.submittedAt))
			issues.addIssue({ code: "custom", message: "LOCAL_MAPS_LIVE_LEASE_TIME_INVALID", path: ["attempt"] });
		if (
			new Date(input.attempt.submittedAt) < new Date(input.lock.timestampWindow.startsAt) ||
			new Date(input.attempt.submittedAt) >= new Date(input.lock.timestampWindow.endsAt)
		)
			issues.addIssue({ code: "custom", message: "LOCAL_MAPS_LIVE_SUBMISSION_OUTSIDE_LOCK_WINDOW", path: ["attempt"] });
		if (liveProviderIdSchema.safeParse(input.lock.provider.id).success === false)
			issues.addIssue({
				code: "custom",
				message: "LOCAL_MAPS_LIVE_PROVIDER_INVALID",
				path: ["lock", "provider", "id"],
			});
		if (
			input.budgetReservation.surfaceCapUsd !== input.lock.budget.surfaceCapUsd ||
			input.budgetReservation.monthlyCapUsd !== input.lock.budget.monthlyCapUsd ||
			input.budgetReservation.priceSnapshotVersion !== input.lock.budget.priceSnapshotVersion
		)
			issues.addIssue({ code: "custom", message: "LOCAL_MAPS_LIVE_BUDGET_LOCK_MISMATCH", path: ["budgetReservation"] });
		if (
			micros(input.budgetReservation.reservedCostUsd) > micros(input.budgetReservation.surfaceCapUsd) ||
			micros(input.budgetReservation.reservedCostUsd) > micros(input.budgetReservation.monthlyCapUsd)
		)
			issues.addIssue({
				code: "custom",
				message: "LOCAL_MAPS_LIVE_RESERVATION_EXCEEDS_CAP",
				path: ["budgetReservation"],
			});
		const expectedRequest = localMapsMaterializedProviderRequestSchema.safeParse({
			schemaVersion: 1,
			provider: input.lock.provider,
			point: {
				id: input.slot.pointId,
				pointIndex: input.slot.pointIndex,
				latitude: input.slot.latitude,
				longitude: input.slot.longitude,
			},
			keyword: input.keyword,
			targetIdentity: input.lock.targetIdentity,
			params: input.lock.request,
			repeatIndex: input.slot.repeatIndex,
		});
		if (!expectedRequest.success || canonicalJson(expectedRequest.data) !== canonicalJson(input.providerRequest))
			issues.addIssue({
				code: "custom",
				message: "LOCAL_MAPS_LIVE_PROVIDER_REQUEST_MISMATCH",
				path: ["providerRequest"],
			});
		if (input.lockSnapshotCanonical !== canonicalLocalMapsLockSnapshot(input.lock))
			issues.addIssue({
				code: "custom",
				message: "LOCAL_MAPS_LIVE_LOCK_SNAPSHOT_MISMATCH",
				path: ["lockSnapshotCanonical"],
			});
		if (
			expectedRequest.success &&
			input.requestSnapshotCanonical !== canonicalLocalMapsProviderRequest(expectedRequest.data)
		)
			issues.addIssue({
				code: "custom",
				message: "LOCAL_MAPS_LIVE_REQUEST_SNAPSHOT_MISMATCH",
				path: ["requestSnapshotCanonical"],
			});
	});
export type LocalMapsLiveSubmittedCandidate = z.infer<typeof localMapsLiveSubmittedCandidateSchema>;

export const localMapsLiveKnownCostSchema = z.strictObject({
	status: z.literal("KNOWN"),
	currency: z.literal("USD"),
	amountUsd: usdAmountSchema,
	basis: z.enum(["actual", "estimated"]),
});

export const localMapsLiveUnknownCostSchema = z.strictObject({
	status: z.literal("UNKNOWN"),
	currency: z.literal("USD"),
	amountUsd: z.null(),
	basis: z.null(),
});

const resultIdentity = {
	schemaVersion: z.literal(1),
	kind: z.literal("LOCAL_MAPS_LIVE_PROVIDER_RESULT"),
	mode: z.literal("LIVE_PROVIDER"),
	canonicalizationVersion: z.literal(LOCAL_MAPS_CANONICALIZATION_VERSION),
	storageClass: z.literal("LIVE_ATTEMPT"),
	organizationId: z.string().trim().min(1),
	measurementCycleId: z.string().uuid(),
	localCycleId: z.string().uuid(),
	configurationLockId: z.string().uuid(),
	attemptId: z.string().uuid(),
	reservationId: z.string().uuid(),
	executionKey: z.string().min(1),
	attemptIndex: attemptIndexSchema,
	lockSnapshotCanonical: z.string().min(1),
	requestSnapshotCanonical: z.string().min(1),
	provider: z.strictObject({
		id: liveProviderIdSchema,
		version: z.string().trim().min(1),
		providerTaskId: noWhitespaceSchema.nullable(),
	}),
	externalProviderCalls: z.literal(1),
	completedAt: z.iso.datetime(),
};

const successProvenanceSchema = z.strictObject({
	evidenceKind: z.literal("MAPS_SERP_PROVIDER"),
	rawResponseReference: liveReferenceSchema,
	rawResponseSha256: sha256ReferenceSchema,
	providerObservedAt: z.iso.datetime(),
});

const failureProvenanceSchema = z
	.strictObject({
		evidenceKind: z.literal("MAPS_SERP_PROVIDER"),
		rawResponseReference: liveReferenceSchema.nullable(),
		rawResponseSha256: sha256ReferenceSchema.nullable(),
		providerObservedAt: z.iso.datetime().nullable(),
	})
	.refine((value) => {
		const fields = [value.rawResponseReference, value.rawResponseSha256, value.providerObservedAt];
		return fields.every((field) => field === null) || fields.every((field) => field !== null);
	}, "LOCAL_MAPS_LIVE_RAW_PROVENANCE_TRIPLE_INVALID");

export const localMapsLiveProviderResultSchema = z.union([
	z.strictObject({
		...resultIdentity,
		event: z.strictObject({ kind: z.literal("FOUND") }),
		targetRank: z.number().int().min(1).max(20),
		evidenceEligible: z.literal(true),
		provenance: successProvenanceSchema,
		cost: localMapsLiveKnownCostSchema,
	}),
	z.strictObject({
		...resultIdentity,
		event: z.strictObject({ kind: z.literal("ABSENT_WITHIN_DEPTH") }),
		targetRank: z.null(),
		evidenceEligible: z.literal(true),
		provenance: successProvenanceSchema,
		cost: localMapsLiveKnownCostSchema,
	}),
	z.strictObject({
		...resultIdentity,
		event: z.strictObject({ kind: z.literal("RETRYABLE_FAILURE"), reason: z.enum(retryableAttemptReasons) }),
		targetRank: z.null(),
		evidenceEligible: z.literal(false),
		provenance: failureProvenanceSchema,
		cost: localMapsLiveKnownCostSchema,
	}),
	z.strictObject({
		...resultIdentity,
		event: z.strictObject({ kind: z.literal("PROVIDER_AUTH_FAILURE") }),
		targetRank: z.null(),
		evidenceEligible: z.literal(false),
		provenance: failureProvenanceSchema,
		cost: localMapsLiveKnownCostSchema,
	}),
	z.strictObject({
		...resultIdentity,
		event: z.strictObject({ kind: z.literal("OUTCOME_UNKNOWN") }),
		targetRank: z.null(),
		evidenceEligible: z.literal(false),
		provenance: failureProvenanceSchema,
		cost: localMapsLiveUnknownCostSchema,
	}),
]);
export type LocalMapsLiveProviderResult = z.infer<typeof localMapsLiveProviderResultSchema>;

export function assertLocalMapsLiveResultMatchesCandidate(
	inputValue: LocalMapsLiveSubmittedCandidate,
	resultValue: LocalMapsLiveProviderResult,
): { result: LocalMapsLiveProviderResult; budgetIncident: "REPORTED_COST_EXCEEDS_RESERVATION" | null } {
	const input = localMapsLiveSubmittedCandidateSchema.parse(inputValue);
	const result = localMapsLiveProviderResultSchema.parse(resultValue);
	const submittedAt = new Date(input.attempt.submittedAt).getTime();
	const completedAt = new Date(result.completedAt).getTime();
	const observedAt =
		result.provenance.providerObservedAt === null ? null : new Date(result.provenance.providerObservedAt).getTime();
	if (
		result.organizationId !== input.scope.organizationId ||
		result.measurementCycleId !== input.scope.measurementCycleId ||
		result.localCycleId !== input.scope.localCycleId ||
		result.configurationLockId !== input.scope.configurationLockId ||
		result.attemptId !== input.attempt.attemptId ||
		result.reservationId !== input.attempt.reservationId ||
		result.executionKey !== input.attempt.executionKey ||
		result.attemptIndex !== input.attempt.attemptIndex ||
		result.canonicalizationVersion !== input.canonicalizationVersion ||
		result.lockSnapshotCanonical !== input.lockSnapshotCanonical ||
		result.requestSnapshotCanonical !== input.requestSnapshotCanonical ||
		result.provider.id !== input.providerRequest.provider.id ||
		result.provider.version !== input.providerRequest.provider.version ||
		completedAt < submittedAt ||
		(observedAt !== null && (observedAt < submittedAt || observedAt > completedAt))
	)
		throw new Error("LOCAL_MAPS_LIVE_RESULT_CANDIDATE_MISMATCH");
	return {
		result,
		budgetIncident:
			result.cost.status === "KNOWN" && micros(result.cost.amountUsd) > micros(input.budgetReservation.reservedCostUsd)
				? "REPORTED_COST_EXCEEDS_RESERVATION"
				: null,
	};
}

export function localMapsLiveAttemptEvent(result: LocalMapsLiveProviderResult): AttemptEvent {
	return result.event;
}
