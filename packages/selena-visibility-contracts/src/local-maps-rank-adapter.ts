import { z } from "zod";
import { executionKeyPartSchema, maximumProviderAttempts } from "./local-execution.js";
import { type MapsLockV1, mapsLockV1Schema, mapsRequestLockSchema } from "./local-locks.js";
import {
	type LocalMapsLiveProviderResult,
	type LocalMapsMaterializedProviderRequest,
	localMapsMaterializedProviderRequestSchema,
} from "./local-maps-live.js";

const usdAmountSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);
const attemptIndexSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** The immutable, lock-derived result of a provider quote. */
export const localMapsRankQuoteSchema = z.strictObject({
	tasks: z.number().int().positive(),
	maxProviderAttempts: z.number().int().positive(),
	worstCaseCostUsd: usdAmountSchema,
	currency: z.literal("USD"),
	priceSnapshotVersion: executionKeyPartSchema,
});
export type LocalMapsRankQuote = z.infer<typeof localMapsRankQuoteSchema>;

/**
 * The spend permit identity handed to an adapter. It contains no secret and
 * cannot be constructed from a task alone; the durable runner supplies it
 * only after the attempt row has been committed.
 */
export const localMapsRankPermitSchema = z.strictObject({
	organizationId: z.string().trim().min(1),
	attemptId: z.string().uuid(),
	reservationId: z.string().uuid(),
	executionKey: z.string().min(1),
	attemptIndex: attemptIndexSchema,
});
export type LocalMapsRankPermit = z.infer<typeof localMapsRankPermitSchema>;

/**
 * A capability declaration is a requirement, not proof that a provider has
 * met it. The live runner still validates the normalized result and the
 * persisted store must prove the corresponding evidence and coordinate facts.
 */
export const localMapsRankCapabilitySchema = z.strictObject({
	coordinateProof: z.literal("EXACT_REQUEST_ECHO_REQUIRED"),
	rawEvidenceReference: z.literal("REQUIRED"),
	supportsAbsentWithinDepth: z.literal(true),
	maxDepth: z.number().int().positive(),
});
export type LocalMapsRankCapability = z.infer<typeof localMapsRankCapabilitySchema>;

/** Fields a provider must echo before its response can be normalized. */
export const localMapsRankCoordinateProofSchema = z.strictObject({
	pointId: z.string().uuid(),
	pointIndex: z.number().int().nonnegative(),
	latitude: z.string().trim().min(1),
	longitude: z.string().trim().min(1),
	keywordId: z.string().uuid(),
	keywordText: z.string().trim().min(1),
	request: mapsRequestLockSchema,
});
export type LocalMapsRankCoordinateProof = z.infer<typeof localMapsRankCoordinateProofSchema>;

/**
 * The adapter's normalized observation is deliberately narrower than a live
 * result. The runner adds lock/permit identity and then validates the full
 * `LocalMapsLiveProviderResult` before persistence.
 */
export type LocalMapsRankNormalizedObservation = {
	coordinateProof: LocalMapsRankCoordinateProof;
	providerTaskId: string | null;
	event: LocalMapsLiveProviderResult["event"];
	targetRank: number | null;
	evidenceEligible: boolean;
	provenance: LocalMapsLiveProviderResult["provenance"];
	cost: LocalMapsLiveProviderResult["cost"];
};
export type LocalMapsRankRunnerObservation = Omit<LocalMapsRankNormalizedObservation, "coordinateProof">;

/**
 * Serializes the validated request in the contract's field order. Provider
 * echoes are untrusted objects, so comparing their input insertion order
 * would make an equivalent request fail the coordinate-proof check.
 */
function canonicalMapsRequest(input: unknown): string {
	const request = mapsRequestLockSchema.parse(input);
	return JSON.stringify({
		device: request.device,
		os: request.os,
		language: request.language,
		seDomain: request.seDomain,
		zoom: request.zoom,
		depth: request.depth,
		searchThisArea: request.searchThisArea,
	});
}

/**
 * Provider boundary required by Delta §4.1. Implementations are injected and
 * are not registered by this contract package. A provider call remains
 * impossible until a caller explicitly supplies this adapter to the runner.
 */
export type LocalMapsRankAdapter<TRawResult = unknown> = {
	readonly id: string;
	readonly version: string;
	readonly endpoint: string;
	quote(lock: MapsLockV1): LocalMapsRankQuote;
	execute(task: LocalMapsMaterializedProviderRequest, permit: LocalMapsRankPermit): Promise<TRawResult>;
	normalize(result: TRawResult): LocalMapsRankNormalizedObservation;
	capability(): LocalMapsRankCapability;
};

/**
 * Formats the provider wire value required by the Maps contract. Coordinates
 * are already frozen decimal strings in the materialized request; only the
 * locked zoom is appended, so a provider adapter cannot silently choose a
 * different point or depth context.
 */
export function formatLocalMapsLocationCoordinate(inputTask: LocalMapsMaterializedProviderRequest): string {
	const task = localMapsMaterializedProviderRequestSchema.parse(inputTask);
	return `${task.point.latitude},${task.point.longitude},${task.params.zoom}`;
}

/** A provider must be able to honour the depth frozen in the Maps Lock. */
export function assertLocalMapsRankCapabilitySupportsTask(
	inputTask: LocalMapsMaterializedProviderRequest,
	inputCapability: LocalMapsRankCapability,
): LocalMapsRankCapability {
	const capability = localMapsRankCapabilitySchema.parse(inputCapability);
	if (capability.maxDepth < inputTask.params.depth) throw new Error("LOCAL_MAPS_RANK_DEPTH_UNSUPPORTED");
	return capability;
}

/** Rejects a normalized response that does not echo the frozen task inputs. */
export function assertLocalMapsRankCoordinateProofMatchesTask(
	inputTask: LocalMapsMaterializedProviderRequest,
	inputProof: LocalMapsRankCoordinateProof,
): LocalMapsRankCoordinateProof {
	const task = localMapsMaterializedProviderRequestSchema.parse(inputTask);
	const proof = localMapsRankCoordinateProofSchema.parse(inputProof);
	if (
		proof.pointId !== task.point.id ||
		proof.pointIndex !== task.point.pointIndex ||
		proof.latitude !== task.point.latitude ||
		proof.longitude !== task.point.longitude ||
		proof.keywordId !== task.keyword.id ||
		proof.keywordText !== task.keyword.text ||
		canonicalMapsRequest(proof.request) !== canonicalMapsRequest(task.params)
	)
		throw new Error("LOCAL_MAPS_RANK_COORDINATE_PROOF_MISMATCH");
	return proof;
}

/**
 * Verifies that a quote cannot silently change the frozen task/attempt/cost
 * envelope. This is arithmetic over caller-supplied snapshots; it is not a
 * budget authorization and performs no I/O.
 */
export function assertLocalMapsRankQuoteMatchesLock(
	inputLock: MapsLockV1,
	inputQuote: LocalMapsRankQuote,
): LocalMapsRankQuote {
	const lock = mapsLockV1Schema.parse(inputLock);
	const quote = localMapsRankQuoteSchema.parse(inputQuote);
	if (
		quote.tasks !== lock.expectedSlots ||
		quote.maxProviderAttempts !== maximumProviderAttempts(lock.expectedSlots) ||
		quote.worstCaseCostUsd !== lock.budget.worstCaseCostUsd ||
		quote.priceSnapshotVersion !== lock.budget.priceSnapshotVersion
	)
		throw new Error("LOCAL_MAPS_RANK_QUOTE_LOCK_MISMATCH");
	return quote;
}
