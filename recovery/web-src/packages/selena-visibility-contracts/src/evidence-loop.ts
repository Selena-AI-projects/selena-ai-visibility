import { z } from "zod";

export const actionStatuses = [
	"PROPOSED",
	"APPROVED",
	"IN_PROGRESS",
	"IMPLEMENTED",
	"VERIFIED",
	"REJECTED",
	"ABANDONED",
] as const;
export type ActionStatus = (typeof actionStatuses)[number];

export const ACTION_TRANSITIONS: Readonly<Record<ActionStatus, readonly ActionStatus[]>> = Object.freeze({
	PROPOSED: ["APPROVED", "REJECTED"],
	APPROVED: ["IN_PROGRESS", "ABANDONED"],
	IN_PROGRESS: ["IMPLEMENTED", "ABANDONED"],
	IMPLEMENTED: ["VERIFIED"],
	VERIFIED: [],
	REJECTED: [],
	ABANDONED: [],
});

export const verificationStatuses = ["PLANNED", "RUNNING", "COMPLETED", "FAILED"] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export type ActionTransitionContext = {
	verificationStatus?: VerificationStatus;
	verificationCompletedAt?: string | null;
	settleEndsAt?: string | null;
};

function timestamp(value: string, error: string): number {
	const parsed = Date.parse(value);
	if (!Number.isFinite(parsed)) throw new Error(error);
	return parsed;
}

export function assertActionTransition(
	current: ActionStatus,
	next: ActionStatus,
	context: ActionTransitionContext = {},
): void {
	if (!ACTION_TRANSITIONS[current].includes(next)) throw new Error("ACTION_TRANSITION_INVALID");
	if (next !== "VERIFIED") return;
	if (context.verificationStatus !== "COMPLETED" || !context.verificationCompletedAt || !context.settleEndsAt) {
		throw new Error("ACTION_VERIFICATION_INCOMPLETE");
	}
	if (
		timestamp(context.verificationCompletedAt, "ACTION_VERIFICATION_TIME_INVALID") <
		timestamp(context.settleEndsAt, "ACTION_SETTLE_TIME_INVALID")
	) {
		throw new Error("ACTION_VERIFICATION_TOO_EARLY");
	}
}

export function assertActionApproval(input: { evidenceIds: readonly string[]; approvedBy: string | null }): void {
	if (input.evidenceIds.length === 0 || input.evidenceIds.some((id) => id.trim().length === 0)) {
		throw new Error("ACTION_APPROVAL_EVIDENCE_REQUIRED");
	}
	if (!input.approvedBy?.trim()) throw new Error("ACTION_APPROVER_REQUIRED");
}

export const changeVerifications = ["DECLARED", "EVIDENCED", "DISPUTED"] as const;
export type ChangeVerification = (typeof changeVerifications)[number];

export const DEFAULT_SETTLE_DAYS = 14;

export function assertVerificationWindow(input: {
	changeOccurredAt: string;
	verificationCompletedAt: string;
	settleDays?: number;
}): void {
	const settleDays = input.settleDays ?? DEFAULT_SETTLE_DAYS;
	if (!Number.isInteger(settleDays) || settleDays <= 0) throw new Error("VERIFICATION_SETTLE_DAYS_INVALID");
	const changeAt = timestamp(input.changeOccurredAt, "VERIFICATION_CHANGE_TIME_INVALID");
	const completedAt = timestamp(input.verificationCompletedAt, "VERIFICATION_COMPLETION_TIME_INVALID");
	if (completedAt < changeAt + settleDays * 24 * 60 * 60 * 1000) {
		throw new Error("VERIFICATION_WINDOW_NOT_SETTLED");
	}
}

export const outcomeAccessClasses = ["CONNECTED", "UPLOADED"] as const;

export const outcomeMetrics = z
	.strictObject({
		metricKey: z.string().trim().min(1),
		value: z.number().finite().nullable(),
		sourceId: z.string().trim().min(1),
		accessClass: z.enum(outcomeAccessClasses),
		evidenceIds: z.array(z.string().trim().min(1)).min(1),
		periodStart: z.iso.datetime(),
		periodEnd: z.iso.datetime(),
	})
	.refine((value) => Date.parse(value.periodEnd) > Date.parse(value.periodStart), "Outcome period must increase");
export type OutcomeMetric = z.infer<typeof outcomeMetrics>;

export function assertOutcomeProvenance(input: OutcomeMetric): void {
	outcomeMetrics.parse(input);
}

export const attributionVerdicts = [
	"POSITIVE_CORRELATION",
	"NEGATIVE_CORRELATION",
	"NO_OBSERVED_CHANGE",
	"MIXED_RESULT",
	"INSUFFICIENT_EVIDENCE",
	"CONFOUNDED",
	"NOT_MEASURED",
] as const;
export type AttributionVerdict = (typeof attributionVerdicts)[number];

export const attributionConfidences = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"] as const;
export type AttributionConfidence = (typeof attributionConfidences)[number];

export type AttributionChangeEvent = {
	actionId: string | null;
	changeType: string;
	verification: ChangeVerification;
};

export type AttributionInput = {
	baselineCycleId: string | null;
	verificationCycleId: string | null;
	beforeValues: readonly (number | null)[] | null;
	afterValues: readonly (number | null)[] | null;
	cyclesCompatible: boolean;
	chainComplete: boolean;
	changeEvents: readonly AttributionChangeEvent[];
	verificationCompleted: boolean;
	settled: boolean;
	minimumDetectableChange: number;
	beforeSampleSize: number;
	afterSampleSize: number;
	minimumSampleSize: number;
	externalFactors: readonly string[];
	evidenceIds: readonly string[];
};

export type AttributionAssessment = {
	verdict: AttributionVerdict;
	confidence: AttributionConfidence;
	reasonCodes: string[];
	evidenceIds: string[];
	delta: number | null;
};

function assessment(
	input: AttributionInput,
	verdict: AttributionVerdict,
	reasonCode: string,
	delta: number | null = null,
): AttributionAssessment {
	let confidence: AttributionConfidence = "UNKNOWN";
	if (
		verdict === "MIXED_RESULT" ||
		verdict === "NO_OBSERVED_CHANGE" ||
		verdict === "POSITIVE_CORRELATION" ||
		verdict === "NEGATIVE_CORRELATION"
	) {
		const weaknessCount = [
			input.changeEvents.some((event) => event.verification !== "EVIDENCED"),
			input.beforeSampleSize < input.minimumSampleSize || input.afterSampleSize < input.minimumSampleSize,
			input.externalFactors.length > 0,
			new Set(input.changeEvents.map((event) => event.changeType)).size > 1,
		].filter(Boolean).length;
		confidence = (["HIGH", "MEDIUM", "LOW"] as const)[Math.min(weaknessCount, 2)];
	}
	return {
		verdict,
		confidence,
		reasonCodes: [reasonCode],
		evidenceIds: [...input.evidenceIds],
		delta,
	};
}

export function assessAttribution(input: AttributionInput): AttributionAssessment {
	if (input.evidenceIds.length === 0 || input.evidenceIds.some((id) => id.trim().length === 0)) {
		throw new Error("ATTRIBUTION_EVIDENCE_REQUIRED");
	}
	if (!Number.isFinite(input.minimumDetectableChange) || input.minimumDetectableChange <= 0) {
		throw new Error("ATTRIBUTION_THRESHOLD_INVALID");
	}
	if (
		![input.beforeSampleSize, input.afterSampleSize, input.minimumSampleSize].every(
			(value) => Number.isInteger(value) && value >= 0,
		)
	) {
		throw new Error("ATTRIBUTION_SAMPLE_SIZE_INVALID");
	}

	if (!input.baselineCycleId || !input.verificationCycleId) {
		return assessment(input, "NOT_MEASURED", "MEASUREMENT_CYCLE_MISSING");
	}
	if (
		!input.beforeValues ||
		!input.afterValues ||
		input.beforeValues.length === 0 ||
		input.afterValues.length === 0 ||
		input.beforeValues.some((value) => value === null) ||
		input.afterValues.some((value) => value === null)
	) {
		return assessment(input, "NOT_MEASURED", "METRIC_UNKNOWN");
	}
	if (!input.cyclesCompatible || input.beforeValues.length !== input.afterValues.length) {
		return assessment(input, "INSUFFICIENT_EVIDENCE", "CYCLES_INCOMPATIBLE");
	}
	const beforeValues = input.beforeValues as readonly number[];
	const afterValues = input.afterValues as readonly number[];
	if (![...beforeValues, ...afterValues].every(Number.isFinite)) {
		throw new Error("ATTRIBUTION_METRIC_INVALID");
	}
	if (!input.chainComplete) {
		return assessment(input, "INSUFFICIENT_EVIDENCE", "EVIDENCE_CHAIN_BROKEN");
	}
	if (input.changeEvents.length === 0) return assessment(input, "NOT_MEASURED", "CHANGE_EVENT_MISSING");
	if (!input.verificationCompleted) {
		return assessment(input, "INSUFFICIENT_EVIDENCE", "VERIFICATION_INCOMPLETE");
	}
	if (!input.settled) return assessment(input, "INSUFFICIENT_EVIDENCE", "SETTLE_WINDOW_INCOMPLETE");

	const actionIds = new Set(input.changeEvents.flatMap((event) => (event.actionId ? [event.actionId] : [])));
	if (input.changeEvents.some((event) => event.actionId === null) || actionIds.size >= 2) {
		return assessment(input, "CONFOUNDED", "CHANGE_EVENTS_CONFOUNDED");
	}

	const deltas = beforeValues.map((before, index) => (afterValues[index] ?? 0) - before);
	if (deltas.some((delta) => delta > 0) && deltas.some((delta) => delta < 0)) {
		return assessment(input, "MIXED_RESULT", "METRIC_DIRECTIONS_MIXED");
	}
	const delta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
	if (Math.abs(delta) < input.minimumDetectableChange) {
		return assessment(input, "NO_OBSERVED_CHANGE", "DELTA_BELOW_THRESHOLD", delta);
	}
	if (delta > 0) return assessment(input, "POSITIVE_CORRELATION", "POSITIVE_DELTA", delta);
	return assessment(input, "NEGATIVE_CORRELATION", "NEGATIVE_DELTA", delta);
}

export type EvidenceLoopLinks = {
	findingId: string | null;
	recommendationId: string | null;
	actionId: string | null;
	changeEventIds: readonly string[];
	baselineCycleId: string | null;
	verificationCycleId: string | null;
	baselineDatasetId: string | null;
	verificationDatasetId: string | null;
};

export function assessEvidenceLoopIntegrity(links: EvidenceLoopLinks):
	| { intact: true }
	| {
			intact: false;
			verdict: "INSUFFICIENT_EVIDENCE";
			incident: { kind: "EVIDENCE_CHAIN_BROKEN"; missingLinks: string[] };
	  } {
	const candidateLinks: ReadonlyArray<readonly [string, string | null]> = [
		["finding", links.findingId],
		["recommendation", links.recommendationId],
		["action", links.actionId],
		["change_event", links.changeEventIds.length > 0 ? "present" : null],
		["baseline_cycle", links.baselineCycleId],
		["verification_cycle", links.verificationCycleId],
		["baseline_dataset", links.baselineDatasetId],
		["verification_dataset", links.verificationDatasetId],
	];
	const missingLinks = candidateLinks.flatMap(([name, value]) => (value ? [] : [name]));
	if (missingLinks.length === 0) return { intact: true };
	return {
		intact: false,
		verdict: "INSUFFICIENT_EVIDENCE",
		incident: { kind: "EVIDENCE_CHAIN_BROKEN", missingLinks },
	};
}
