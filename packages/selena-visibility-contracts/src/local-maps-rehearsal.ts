import { z } from "zod";
import { mapsLockSlotPlanSchema, mapsLockV1Schema, planMapsLockSlots } from "./local-locks.js";
import { sphericalGridPointV1Schema } from "./visibility-os.js";

export const STUB_LOCAL_MAPS_ADAPTER_ID = "stub-local-maps-v1" as const;
const sha256ReferenceSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const stubRawReferenceSchema = z.string().regex(/^stub-local-maps:sha256:[a-f0-9]{64}$/);

export const localMapsRehearsalRequestSchema = z
	.strictObject({
		requestSnapshotDigest: sha256ReferenceSchema,
		lock: mapsLockV1Schema,
		slot: mapsLockSlotPlanSchema,
		keyword: z.strictObject({
			id: z.string().uuid(),
			text: z.string().trim().min(1),
			keywordSetId: z.string().uuid(),
			keywordSetVersion: z.number().int().positive(),
		}),
	})
	.superRefine((request, issues) => {
		const planned = planMapsLockSlots(request.slot.measurementCycleId, request.lock);
		const expected = planned.find((slot) => slot.executionKey === request.slot.executionKey);
		if (expected === undefined || JSON.stringify(expected) !== JSON.stringify(request.slot))
			issues.addIssue({ code: "custom", message: "LOCAL_MAPS_REHEARSAL_SLOT_LOCK_MISMATCH", path: ["slot"] });
		if (
			request.keyword.id !== request.slot.keywordId ||
			request.keyword.keywordSetId !== request.lock.keywordSet.id ||
			request.keyword.keywordSetVersion !== request.lock.keywordSet.version
		)
			issues.addIssue({ code: "custom", message: "LOCAL_MAPS_REHEARSAL_KEYWORD_LOCK_MISMATCH", path: ["keyword"] });
	});
export type LocalMapsRehearsalRequest = z.infer<typeof localMapsRehearsalRequestSchema>;

const rehearsalResultCommon = {
	schemaVersion: z.literal(1),
	kind: z.literal("LOCAL_MAPS_REHEARSAL_RESULT"),
	mode: z.literal("SYNTHETIC_TEST_ONLY"),
	adapterId: z.literal(STUB_LOCAL_MAPS_ADAPTER_ID),
	simulatedProviderId: z.string().trim().min(1),
	executionKey: z.string().min(1),
	requestSnapshotDigest: sha256ReferenceSchema,
	requestCoordinate: z.strictObject({
		pointId: z.string().uuid(),
		latitude: sphericalGridPointV1Schema.shape.latitude,
		longitude: sphericalGridPointV1Schema.shape.longitude,
	}),
	keywordId: z.string().uuid(),
	persistable: z.literal(false),
	evidenceEligible: z.literal(false),
	externalProviderCalls: z.literal(0),
	providerTaskId: z.null(),
	costUsd: z.literal("0.000000"),
	rawReference: stubRawReferenceSchema,
};

export const localMapsRehearsalResultSchema = z.union([
	z.strictObject({
		...rehearsalResultCommon,
		event: z.strictObject({ kind: z.literal("FOUND") }),
		targetRank: z.number().int().min(1).max(20),
	}),
	z.strictObject({
		...rehearsalResultCommon,
		event: z.strictObject({ kind: z.literal("ABSENT_WITHIN_DEPTH") }),
		targetRank: z.null(),
	}),
]);
export type LocalMapsRehearsalResult = z.infer<typeof localMapsRehearsalResultSchema>;

export function localMapsRehearsalDeterministicOutcome(
	requestSnapshotDigest: string,
	depth: 20,
): { event: { kind: "FOUND" }; targetRank: number } | { event: { kind: "ABSENT_WITHIN_DEPTH" }; targetRank: null } {
	const digest = sha256ReferenceSchema.parse(requestSnapshotDigest).slice("sha256:".length);
	const found = Number.parseInt(digest.slice(0, 2), 16) % 5 !== 0;
	return found
		? { event: { kind: "FOUND" }, targetRank: (Number.parseInt(digest.slice(2, 10), 16) % depth) + 1 }
		: { event: { kind: "ABSENT_WITHIN_DEPTH" }, targetRank: null };
}

export function assertLocalMapsRehearsalResultMatchesRequest(
	requestInput: LocalMapsRehearsalRequest,
	resultInput: LocalMapsRehearsalResult,
): LocalMapsRehearsalResult {
	const request = localMapsRehearsalRequestSchema.parse(requestInput);
	const result = localMapsRehearsalResultSchema.parse(resultInput);
	const expectedOutcome = localMapsRehearsalDeterministicOutcome(
		request.requestSnapshotDigest,
		request.lock.request.depth,
	);
	if (
		result.executionKey !== request.slot.executionKey ||
		result.requestSnapshotDigest !== request.requestSnapshotDigest ||
		result.simulatedProviderId !== request.lock.provider.id ||
		result.keywordId !== request.keyword.id ||
		result.requestCoordinate.pointId !== request.slot.pointId ||
		result.requestCoordinate.latitude !== request.slot.latitude ||
		result.requestCoordinate.longitude !== request.slot.longitude ||
		result.rawReference !== `stub-local-maps:${request.requestSnapshotDigest}` ||
		result.event.kind !== expectedOutcome.event.kind ||
		result.targetRank !== expectedOutcome.targetRank
	)
		throw new Error("LOCAL_MAPS_REHEARSAL_RESULT_REQUEST_MISMATCH");
	return result;
}

export type LocalMapsRehearsalAdapter = {
	readonly id: typeof STUB_LOCAL_MAPS_ADAPTER_ID;
	readonly kind: "REHEARSAL_ONLY";
	execute(request: LocalMapsRehearsalRequest): Promise<LocalMapsRehearsalResult>;
};
