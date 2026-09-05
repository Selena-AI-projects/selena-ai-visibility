import { z } from "zod";

export const HORECA_READ_MODEL_VERSION = "horeca-local-first-read-model/v1" as const;

export const horecaBusinessTypes = ["RESTAURANT", "CAFE", "FOOD_HALL", "HOTEL", "VILLA", "SPA"] as const;
export const horecaProjectPhases = ["ACTIVE", "PRE_OPENING", "UNKNOWN"] as const;
export const horecaModuleStates = ["HIDDEN", "LOCKED", "PILOT", "ACTIVE", "PARTIAL", "UNKNOWN", "BLOCKED"] as const;
export const horecaModuleIds = [
	"AI_ANSWERS",
	"SEARCH",
	"LOCAL_MAPS",
	"LOCAL_AI",
	"REPUTATION",
	"SOCIAL",
	"TRAVEL",
	"OUTCOMES",
] as const;
export const horecaNavigationAreas = [
	"OVERVIEW",
	"VISIBILITY",
	"EVIDENCE",
	"COMPETITORS",
	"ACTIONS",
	"OUTCOMES",
] as const;

const evidenceIdSchema = z.string().trim().min(1);

const measuredShareSchema = z
	.strictObject({
		kind: z.literal("MEASURED_SHARE"),
		sampleBasis: z.literal("ACCEPTED_ONLY"),
		numerator: z.number().int().nonnegative(),
		denominator: z.number().int().positive(),
		invalidCount: z.number().int().nonnegative(),
		capturedAt: z.iso.datetime(),
		datasetVersion: z.string().trim().min(1),
	})
	.refine((value) => value.numerator <= value.denominator, {
		message: "HORECA_SHARE_NUMERATOR_EXCEEDS_DENOMINATOR",
	});

const unknownShareSchema = z.strictObject({
	kind: z.literal("UNKNOWN"),
	numerator: z.null(),
	denominator: z.null(),
	invalidCount: z.number().int().nonnegative(),
	reason: z.string().trim().min(1),
});

export const horecaShareSchema = z.discriminatedUnion("kind", [measuredShareSchema, unknownShareSchema]);
export type HorecaShare = z.infer<typeof horecaShareSchema>;

export const horecaModuleReadModelSchema = z
	.strictObject({
		moduleId: z.enum(horecaModuleIds),
		state: z.enum(horecaModuleStates),
		label: z.string().trim().min(1),
		summary: horecaShareSchema,
		evidenceIds: z.array(evidenceIdSchema),
		configurationLockReference: z.string().trim().min(1).nullable(),
		limitations: z.array(z.string().trim().min(1)),
	})
	.superRefine((value, issues) => {
		if ((value.state === "ACTIVE" || value.state === "PARTIAL") && value.summary.kind !== "MEASURED_SHARE") {
			issues.addIssue({ code: "custom", message: "HORECA_ACTIVE_MODULE_REQUIRES_MEASUREMENT" });
		}
		if (value.state === "UNKNOWN" && value.summary.kind !== "UNKNOWN") {
			issues.addIssue({ code: "custom", message: "HORECA_UNKNOWN_MODULE_REQUIRES_UNKNOWN_SUMMARY" });
		}
		if (["HIDDEN", "LOCKED", "BLOCKED"].includes(value.state) && value.summary.kind !== "UNKNOWN") {
			issues.addIssue({ code: "custom", message: "HORECA_UNAVAILABLE_MODULE_REQUIRES_UNKNOWN_SUMMARY" });
		}
		if (
			value.summary.kind === "MEASURED_SHARE" &&
			(value.evidenceIds.length === 0 || value.configurationLockReference === null)
		) {
			issues.addIssue({ code: "custom", message: "HORECA_MEASURED_MODULE_REQUIRES_EVIDENCE_AND_LOCK" });
		}
	});
export type HorecaModuleReadModel = z.infer<typeof horecaModuleReadModelSchema>;

export const horecaEvidenceReferenceSchema = z
	.strictObject({
		id: evidenceIdSchema,
		domain: z.enum([
			"ENTITY",
			"WEBSITE",
			"MENU",
			"AI_ANSWERS",
			"SEARCH",
			"MAPS",
			"REVIEW",
			"SOCIAL",
			"TRAVEL",
			"OUTCOME",
		]),
		accessClass: z.enum(["PUBLIC", "UPLOADED", "CONNECTED", "DERIVED"]),
		sourceLabel: z.string().trim().min(1),
		capturedAt: z.iso.datetime(),
		sourceReference: z.string().trim().min(1),
		snapshotReference: z.string().trim().min(1),
		acceptance: z.strictObject({
			status: z.literal("ACCEPTED"),
			acceptedAt: z.iso.datetime(),
		}),
	})
	.refine((value) => Date.parse(value.acceptance.acceptedAt) >= Date.parse(value.capturedAt), {
		message: "HORECA_EVIDENCE_ACCEPTANCE_PRECEDES_CAPTURE",
		path: ["acceptance", "acceptedAt"],
	});
export type HorecaEvidenceReference = z.infer<typeof horecaEvidenceReferenceSchema>;

export const horecaFindingSchema = z.strictObject({
	id: z.string().trim().min(1),
	area: z.enum(horecaNavigationAreas),
	statement: z.string().trim().min(1),
	status: z.enum(["OBSERVED", "CONFLICT", "UNKNOWN", "BLOCKED"]),
	evidenceIds: z.array(evidenceIdSchema).min(1),
});
export type HorecaFinding = z.infer<typeof horecaFindingSchema>;

export const horecaCompetitorObservationSchema = z.strictObject({
	id: z.string().trim().min(1),
	competitorLabel: z.string().trim().min(1),
	surface: z.enum(["AI_ANSWERS", "SEARCH", "LOCAL_MAPS", "LOCAL_AI", "REPUTATION", "SOCIAL", "TRAVEL"]),
	reason: z.string().trim().min(1),
	evidenceIds: z.array(evidenceIdSchema).min(1),
});
export type HorecaCompetitorObservation = z.infer<typeof horecaCompetitorObservationSchema>;

export const horecaActionSchema = z.strictObject({
	id: z.string().trim().min(1),
	findingIds: z.array(z.string().trim().min(1)).min(1),
	action: z.string().trim().min(1),
	owner: z.string().trim().min(1),
	priority: z.enum(["NOW", "NEXT", "LATER"]),
	status: z.enum(["PROPOSED", "READY", "IN_PROGRESS", "DONE", "BLOCKED"]),
	evidenceIds: z.array(evidenceIdSchema).min(1),
	verificationPlan: z.string().trim().min(1),
});
export type HorecaAction = z.infer<typeof horecaActionSchema>;

export const horecaOutcomeEvidenceSchema = z
	.strictObject({
		id: z.string().trim().min(1),
		level: z.enum(["READINESS", "OBSERVED", "ASSISTED", "ATTRIBUTED"]),
		statement: z.string().trim().min(1),
		status: z.enum(["MEASURED", "UNKNOWN", "BLOCKED"]),
		evidenceIds: z.array(evidenceIdSchema),
		integrationProofReference: z.string().trim().min(1).nullable(),
	})
	.superRefine((value, issues) => {
		if (value.status === "MEASURED" && value.evidenceIds.length === 0) {
			issues.addIssue({ code: "custom", message: "HORECA_MEASURED_OUTCOME_REQUIRES_EVIDENCE" });
		}
		if (value.level === "ATTRIBUTED" && value.status === "MEASURED" && value.integrationProofReference === null) {
			issues.addIssue({ code: "custom", message: "HORECA_ATTRIBUTED_OUTCOME_REQUIRES_INTEGRATION_PROOF" });
		}
	});
export type HorecaOutcomeEvidence = z.infer<typeof horecaOutcomeEvidenceSchema>;

export const horecaLocalFirstReadModelSchema = z
	.strictObject({
		schemaVersion: z.literal(HORECA_READ_MODEL_VERSION),
		generatedAt: z.iso.datetime(),
		project: z.strictObject({
			displayName: z.string().trim().min(1),
			businessType: z.enum(horecaBusinessTypes),
			phase: z.enum(horecaProjectPhases),
		}),
		navigation: z.array(z.enum(horecaNavigationAreas)).length(horecaNavigationAreas.length),
		modules: z.array(horecaModuleReadModelSchema),
		evidence: z.array(horecaEvidenceReferenceSchema),
		findings: z.array(horecaFindingSchema),
		competitors: z.array(horecaCompetitorObservationSchema),
		actions: z.array(horecaActionSchema),
		outcomes: z.array(horecaOutcomeEvidenceSchema),
	})
	.superRefine((value, issues) => {
		if (value.navigation.some((area, index) => area !== horecaNavigationAreas[index])) {
			issues.addIssue({ code: "custom", message: "HORECA_NAVIGATION_ORDER_INVALID" });
		}
		if (new Set(value.modules.map((module) => module.moduleId)).size !== value.modules.length) {
			issues.addIssue({ code: "custom", message: "HORECA_MODULE_DUPLICATED" });
		}
		for (const collection of [value.evidence, value.findings, value.competitors, value.actions, value.outcomes]) {
			if (new Set(collection.map((item) => item.id)).size !== collection.length) {
				issues.addIssue({ code: "custom", message: "HORECA_READ_MODEL_ID_DUPLICATED" });
			}
		}
		const evidenceIds = new Set(value.evidence.map((evidence) => evidence.id));
		const missingEvidenceIds = [
			...value.modules.flatMap((module) => module.evidenceIds),
			...value.findings.flatMap((finding) => finding.evidenceIds),
			...value.competitors.flatMap((competitor) => competitor.evidenceIds),
			...value.actions.flatMap((action) => action.evidenceIds),
			...value.outcomes.flatMap((outcome) => outcome.evidenceIds),
		].filter((id) => !evidenceIds.has(id));
		if (missingEvidenceIds.length > 0) {
			issues.addIssue({ code: "custom", message: "HORECA_EVIDENCE_REFERENCE_MISSING" });
		}
		const findingIds = new Set(value.findings.map((finding) => finding.id));
		if (value.actions.some((action) => action.findingIds.some((id) => !findingIds.has(id)))) {
			issues.addIssue({ code: "custom", message: "HORECA_ACTION_FINDING_REFERENCE_MISSING" });
		}
		const hiddenModules = new Set(
			value.modules.filter((module) => module.state === "HIDDEN").map((module) => module.moduleId),
		);
		if (
			(hiddenModules.has("SOCIAL") &&
				(value.evidence.some((evidence) => evidence.domain === "SOCIAL") ||
					value.competitors.some((competitor) => competitor.surface === "SOCIAL"))) ||
			(hiddenModules.has("TRAVEL") &&
				(value.evidence.some((evidence) => evidence.domain === "TRAVEL") ||
					value.competitors.some((competitor) => competitor.surface === "TRAVEL")))
		) {
			issues.addIssue({ code: "custom", message: "HORECA_HIDDEN_MODULE_DATA_FORBIDDEN" });
		}
		if (value.project.phase === "PRE_OPENING") {
			const measuredVisibility = value.modules.some(
				(module) => module.moduleId !== "OUTCOMES" && module.summary.kind === "MEASURED_SHARE",
			);
			const measuredPostOpeningOutcome = value.outcomes.some(
				(outcome) => outcome.level !== "READINESS" && outcome.status === "MEASURED",
			);
			if (measuredVisibility || measuredPostOpeningOutcome) {
				issues.addIssue({ code: "custom", message: "HORECA_PRE_OPENING_MEASUREMENT_FORBIDDEN" });
			}
		}
	});
export type HorecaLocalFirstReadModel = z.infer<typeof horecaLocalFirstReadModelSchema>;

export function customerVisibleHorecaModules(modules: readonly HorecaModuleReadModel[]): HorecaModuleReadModel[] {
	return modules.filter((module) => module.state !== "HIDDEN");
}
