import { describe, expect, it } from "vitest";
import {
	ACTION_TRANSITIONS,
	type AttributionInput,
	actionStatuses,
	assertActionApproval,
	assertActionTransition,
	assertOutcomeProvenance,
	assertVerificationWindow,
	assessAttribution,
	assessEvidenceLoopIntegrity,
	attributionVerdicts,
	DEFAULT_SETTLE_DAYS,
	outcomeAccessClasses,
} from "./evidence-loop";

const baseInput = (): AttributionInput => ({
	baselineCycleId: "cycle-before",
	verificationCycleId: "cycle-after",
	beforeValues: [10],
	afterValues: [12],
	cyclesCompatible: true,
	chainComplete: true,
	changeEvents: [{ actionId: "action-1", changeType: "CONTENT", verification: "EVIDENCED" }],
	verificationCompleted: true,
	settled: true,
	minimumDetectableChange: 0.5,
	beforeSampleSize: 10,
	afterSampleSize: 10,
	minimumSampleSize: 5,
	externalFactors: [],
	evidenceIds: ["evidence-1"],
});

describe("Visibility OS action lifecycle", () => {
	it("uses only the canonical transitions and keeps terminal states closed", () => {
		expect(actionStatuses).toEqual([
			"PROPOSED",
			"APPROVED",
			"IN_PROGRESS",
			"IMPLEMENTED",
			"VERIFIED",
			"REJECTED",
			"ABANDONED",
		]);
		expect(ACTION_TRANSITIONS.VERIFIED).toEqual([]);
		expect(() => assertActionTransition("PROPOSED", "APPROVED")).not.toThrow();
		expect(() => assertActionTransition("PROPOSED", "VERIFIED")).toThrow("ACTION_TRANSITION_INVALID");
	});

	it("requires a completed verification cycle after the settle window before VERIFIED", () => {
		expect(() => assertActionTransition("IMPLEMENTED", "VERIFIED")).toThrow("ACTION_VERIFICATION_INCOMPLETE");
		expect(() =>
			assertActionTransition("IMPLEMENTED", "VERIFIED", {
				verificationStatus: "COMPLETED",
				verificationCompletedAt: "2026-09-14T00:00:00.000Z",
				settleEndsAt: "2026-09-15T00:00:00.000Z",
			}),
		).toThrow("ACTION_VERIFICATION_TOO_EARLY");
		expect(() =>
			assertActionTransition("IMPLEMENTED", "VERIFIED", {
				verificationStatus: "COMPLETED",
				verificationCompletedAt: "2026-09-15T00:00:00.000Z",
				settleEndsAt: "2026-09-15T00:00:00.000Z",
			}),
		).not.toThrow();
	});

	it("refuses approval without evidence or an approver", () => {
		expect(() => assertActionApproval({ evidenceIds: [], approvedBy: "owner-1" })).toThrow(
			"ACTION_APPROVAL_EVIDENCE_REQUIRED",
		);
		expect(() => assertActionApproval({ evidenceIds: ["evidence-1"], approvedBy: " " })).toThrow(
			"ACTION_APPROVER_REQUIRED",
		);
		expect(() => assertActionApproval({ evidenceIds: ["evidence-1"], approvedBy: "owner-1" })).not.toThrow();
	});

	it("uses the canonical 14-day settle window", () => {
		expect(DEFAULT_SETTLE_DAYS).toBe(14);
		expect(() =>
			assertVerificationWindow({
				changeOccurredAt: "2026-09-01T00:00:00.000Z",
				verificationCompletedAt: "2026-09-15T00:00:00.000Z",
				settleDays: 0,
			}),
		).toThrow("VERIFICATION_SETTLE_DAYS_INVALID");
		expect(() =>
			assertVerificationWindow({
				changeOccurredAt: "2026-09-01T00:00:00.000Z",
				verificationCompletedAt: "2026-09-14T23:59:59.000Z",
			}),
		).toThrow("VERIFICATION_WINDOW_NOT_SETTLED");
		expect(() =>
			assertVerificationWindow({
				changeOccurredAt: "2026-09-01T00:00:00.000Z",
				verificationCompletedAt: "2026-09-15T00:00:00.000Z",
			}),
		).not.toThrow();
	});
});

describe("Visibility OS outcome provenance stub", () => {
	it("accepts only connected or uploaded evidence and preserves UNKNOWN", () => {
		expect(outcomeAccessClasses).toEqual(["CONNECTED", "UPLOADED"]);
		expect(() =>
			assertOutcomeProvenance({
				metricKey: "qualified_leads",
				value: null,
				sourceId: "upload-1",
				accessClass: "UPLOADED",
				evidenceIds: ["evidence-1"],
				periodStart: "2026-08-01T00:00:00.000Z",
				periodEnd: "2026-09-01T00:00:00.000Z",
			}),
		).not.toThrow();
		expect(() =>
			assertOutcomeProvenance({
				metricKey: "qualified_leads",
				value: 5,
				sourceId: "public-1",
				accessClass: "PUBLIC" as "UPLOADED",
				evidenceIds: ["evidence-1"],
				periodStart: "2026-08-01T00:00:00.000Z",
				periodEnd: "2026-09-01T00:00:00.000Z",
			}),
		).toThrow();
	});
});

describe("Visibility OS evidence loop integrity", () => {
	it("returns an incident draft and insufficient evidence for a broken chain", () => {
		const result = assessEvidenceLoopIntegrity({
			findingId: "finding-1",
			recommendationId: null,
			actionId: "action-1",
			changeEventIds: [],
			baselineCycleId: "cycle-before",
			verificationCycleId: "cycle-after",
			baselineDatasetId: "dataset-before",
			verificationDatasetId: "dataset-after",
		});
		expect(result).toEqual({
			intact: false,
			verdict: "INSUFFICIENT_EVIDENCE",
			incident: {
				kind: "EVIDENCE_CHAIN_BROKEN",
				missingLinks: ["recommendation", "change_event"],
			},
		});
	});
});

describe("Visibility OS attribution decision order", () => {
	it("contains exactly seven non-causal verdicts", () => {
		expect(attributionVerdicts).toEqual([
			"POSITIVE_CORRELATION",
			"NEGATIVE_CORRELATION",
			"NO_OBSERVED_CHANGE",
			"MIXED_RESULT",
			"INSUFFICIENT_EVIDENCE",
			"CONFOUNDED",
			"NOT_MEASURED",
		]);
		expect(attributionVerdicts).not.toContain("CAUSAL");
	});

	it("rule 1: missing baseline or verification cycle is NOT_MEASURED", () => {
		expect(assessAttribution({ ...baseInput(), baselineCycleId: null }).verdict).toBe("NOT_MEASURED");
	});

	it("rule 2: UNKNOWN before or after is NOT_MEASURED", () => {
		expect(assessAttribution({ ...baseInput(), beforeValues: [null] }).reasonCodes).toEqual(["METRIC_UNKNOWN"]);
	});

	it("rule 3: incompatible cycles are INSUFFICIENT_EVIDENCE", () => {
		expect(assessAttribution({ ...baseInput(), cyclesCompatible: false }).verdict).toBe("INSUFFICIENT_EVIDENCE");
	});

	it("rule 4: no change event is NOT_MEASURED", () => {
		expect(assessAttribution({ ...baseInput(), changeEvents: [] }).reasonCodes).toEqual(["CHANGE_EVENT_MISSING"]);
	});

	it("rule 5: incomplete verification is INSUFFICIENT_EVIDENCE", () => {
		expect(assessAttribution({ ...baseInput(), verificationCompleted: false }).reasonCodes).toEqual([
			"VERIFICATION_INCOMPLETE",
		]);
	});

	it("rule 6: measurement before settlement is INSUFFICIENT_EVIDENCE", () => {
		expect(assessAttribution({ ...baseInput(), settled: false }).reasonCodes).toEqual(["SETTLE_WINDOW_INCOMPLETE"]);
	});

	it("rule 7: independent or unattributed changes are CONFOUNDED", () => {
		const independent = {
			...baseInput(),
			changeEvents: [
				{ actionId: "action-1", changeType: "CONTENT", verification: "EVIDENCED" as const },
				{ actionId: "action-2", changeType: "SCHEMA", verification: "EVIDENCED" as const },
			],
		};
		expect(assessAttribution(independent).verdict).toBe("CONFOUNDED");
		expect(
			assessAttribution({
				...baseInput(),
				changeEvents: [{ actionId: null, changeType: "EXTERNAL", verification: "DECLARED" }],
			}).verdict,
		).toBe("CONFOUNDED");
	});

	it("rule 8: metrics moving in different directions are MIXED_RESULT", () => {
		const result = assessAttribution({ ...baseInput(), beforeValues: [10, 10], afterValues: [12, 8] });
		expect(result.verdict).toBe("MIXED_RESULT");
		expect(result.confidence).toBe("HIGH");
	});

	it("rule 9: a delta below the threshold is NO_OBSERVED_CHANGE", () => {
		expect(assessAttribution({ ...baseInput(), afterValues: [10.2] }).verdict).toBe("NO_OBSERVED_CHANGE");
	});

	it("rule 10: a positive delta is POSITIVE_CORRELATION", () => {
		expect(assessAttribution(baseInput()).verdict).toBe("POSITIVE_CORRELATION");
	});

	it("rule 11: a negative delta is NEGATIVE_CORRELATION", () => {
		expect(assessAttribution({ ...baseInput(), afterValues: [8] }).verdict).toBe("NEGATIVE_CORRELATION");
	});

	it("lowers confidence one level per weakness with a LOW floor", () => {
		const oneWeakness = assessAttribution({
			...baseInput(),
			changeEvents: [{ actionId: "action-1", changeType: "CONTENT", verification: "DECLARED" }],
		});
		const twoWeaknesses = assessAttribution({
			...baseInput(),
			changeEvents: [{ actionId: "action-1", changeType: "CONTENT", verification: "DECLARED" }],
			beforeSampleSize: 1,
		});
		expect(oneWeakness.confidence).toBe("MEDIUM");
		expect(twoWeaknesses.confidence).toBe("LOW");
		expect(assessAttribution({ ...baseInput(), changeEvents: [] }).confidence).toBe("UNKNOWN");
	});

	it("refuses to produce an assessment without supporting evidence", () => {
		expect(() => assessAttribution({ ...baseInput(), evidenceIds: [] })).toThrow("ATTRIBUTION_EVIDENCE_REQUIRED");
		expect(() => assessAttribution({ ...baseInput(), minimumDetectableChange: 0 })).toThrow(
			"ATTRIBUTION_THRESHOLD_INVALID",
		);
		expect(() => assessAttribution({ ...baseInput(), afterValues: [Number.NaN] })).toThrow(
			"ATTRIBUTION_METRIC_INVALID",
		);
	});
});
