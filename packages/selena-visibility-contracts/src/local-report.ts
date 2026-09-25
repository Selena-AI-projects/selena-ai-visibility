import { createHash } from "node:crypto";
import { z } from "zod";
import { mapsProviderLockSchema, mapsRequestLockSchema } from "./local-locks.js";
import { canonicalLocalMapsJson } from "./local-maps-live.js";
import { localMapsRankCapabilitySchema } from "./local-maps-rank-adapter.js";

export const localPilotCycleStatuses = [
	"CREATED",
	"PREFLIGHT_BLOCKED",
	"BUDGET_BLOCKED",
	"APPROVED",
	"CANARY_RUNNING",
	"CANARY_REVIEW",
	"QUEUED",
	"RUNNING",
	"PARTIAL_FAILURE",
	"PROVIDER_BLOCKED",
	"UNKNOWN_RECONCILIATION",
	"STOPPED",
	"CARDINALITY_INCIDENT",
	"QC_REQUIRED",
	"READY",
	"COMPLETED",
	"FAILED",
] as const;
export const localPilotExecutionModes = ["LEGACY_SOURCE_ONLY", "CANARY", "PILOT"] as const;
export const localPilotObservationOutcomes = [
	"PENDING",
	"FOUND",
	"ABSENT_WITHIN_DEPTH",
	"INVALID",
	"UNKNOWN",
	"BLOCKED",
	"CANCELLED",
] as const;
export const localPilotCycleStatusSchema = z.enum(localPilotCycleStatuses);
export const localPilotExecutionModeSchema = z.enum(localPilotExecutionModes);
const sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const usd = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);

export const localProviderContractSchema = z.strictObject({
	schemaVersion: z.literal(1),
	provider: mapsProviderLockSchema,
	capability: localMapsRankCapabilitySchema,
	requestProtocol: mapsRequestLockSchema.extend({ os: z.literal("android"), zoom: z.literal(13) }),
	price: z.strictObject({
		billingUnit: z.string().trim().min(1),
		currency: z.literal("USD"),
		perAttemptWorstCaseUsd: usd,
		priceSnapshotVersion: z.string().trim().min(1),
	}),
});
export type LocalProviderContract = z.infer<typeof localProviderContractSchema>;

export function localProviderContractDigest(value: LocalProviderContract): string {
	return `sha256:${createHash("sha256")
		.update(canonicalLocalMapsJson(localProviderContractSchema.parse(value)))
		.digest("hex")}`;
}

export const localPilotObservationSchema = z
	.strictObject({
		id: z.string().uuid(),
		outcome: z.enum(localPilotObservationOutcomes),
		validity: z.enum(["VALID", "INVALID", "UNMEASURED"]).nullable(),
		targetRank: z.number().int().min(1).max(20).nullable(),
		capturedAt: z.iso.datetime().nullable(),
		reason: z.string().trim().min(1).nullable(),
		evidenceId: z.string().uuid().nullable(),
	})
	.superRefine((row, context) => {
		let valid: boolean;
		switch (row.outcome) {
			case "PENDING":
				valid =
					row.validity === null &&
					row.targetRank === null &&
					row.capturedAt === null &&
					row.reason === null &&
					row.evidenceId === null;
				break;
			case "FOUND":
			case "ABSENT_WITHIN_DEPTH":
				valid =
					row.validity === "VALID" &&
					row.capturedAt !== null &&
					row.reason === null &&
					row.evidenceId !== null &&
					(row.outcome === "FOUND" ? row.targetRank !== null : row.targetRank === null);
				break;
			case "INVALID":
				valid = row.validity === "INVALID" && row.targetRank === null && row.capturedAt !== null && row.reason !== null;
				break;
			case "UNKNOWN":
				valid =
					row.validity === "UNMEASURED" && row.targetRank === null && row.capturedAt !== null && row.reason !== null;
				break;
			case "BLOCKED":
			case "CANCELLED":
				valid =
					row.validity === "UNMEASURED" &&
					row.targetRank === null &&
					row.capturedAt === null &&
					row.evidenceId === null &&
					(row.outcome === "CANCELLED" ? row.reason === "LOCAL_STOPPED" : row.reason !== null);
		}
		if (!valid) context.addIssue({ code: "custom", message: "LOCAL_OBSERVATION_STATE_INVALID" });
	});
export type LocalPilotObservation = z.infer<typeof localPilotObservationSchema>;

export function assertLocalObservationTransition(before: LocalPilotObservation, after: LocalPilotObservation): void {
	const oldRow = localPilotObservationSchema.parse(before);
	const newRow = localPilotObservationSchema.parse(after);
	if (oldRow.id !== newRow.id || oldRow.outcome !== "PENDING" || newRow.outcome === "PENDING")
		throw new Error("LOCAL_OBSERVATION_TERMINAL_IMMUTABLE");
}

export const localPilotEvidenceEnvelopeSchema = z
	.strictObject({
		schemaVersion: z.literal(1),
		canonicalizationVersion: z.literal("canonical-json-code-unit-v1"),
		storageClass: z.enum(["CANARY_ONLY", "PILOT"]),
		organizationId: z.string().trim().min(1),
		measurementCycleId: z.string().uuid(),
		localCycleId: z.string().uuid(),
		observationId: z.string().uuid(),
		attemptId: z.string().uuid(),
		configurationLockId: z.string().uuid(),
		providerContractDigest: sha256,
		providerTaskId: z.string().trim().min(1),
		keyword: z.strictObject({
			id: z.string().uuid(),
			text: z.string().trim().min(1),
			language: z.string().trim().min(2),
		}),
		point: z.strictObject({
			id: z.string().uuid(),
			latitude: z.number().min(-90).max(90),
			longitude: z.number().min(-180).max(180),
		}),
		depth: z.literal(20),
		outcome: z.enum(["FOUND", "ABSENT_WITHIN_DEPTH"]),
		targetRank: z.number().int().min(1).max(20).nullable(),
		capturedAt: z.iso.datetime(),
		rawReference: z.string().trim().min(1),
		rawSha256: sha256,
		actualCostUsd: usd,
	})
	.refine(
		(row) => (row.outcome === "FOUND" ? row.targetRank !== null : row.targetRank === null),
		"LOCAL_EVIDENCE_RANK_INVALID",
	);

export function localPilotObservationCounts(rows: readonly LocalPilotObservation[]) {
	const observations = rows.map((row) => localPilotObservationSchema.parse(row));
	return {
		expected: 9 as const,
		terminal: observations.filter((row) => row.outcome !== "PENDING").length,
		valid: observations.filter((row) => row.validity === "VALID").length,
		invalid: observations.filter((row) => row.outcome === "INVALID").length,
		unknown: observations.filter((row) => row.outcome === "UNKNOWN").length,
		blocked: observations.filter((row) => row.outcome === "BLOCKED").length,
		cancelled: observations.filter((row) => row.outcome === "CANCELLED").length,
		pending: observations.filter((row) => row.outcome === "PENDING").length,
	};
}
