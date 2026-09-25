import { A as record, D as number, F as union, I as unknown, L as url, M as string, O as object, T as literal, V as datetime, c as _enum, f as array, g as discriminatedUnion, h as date, j as strictObject, p as boolean, u as _null } from "../_libs/zod.mjs";
import { createHash } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/src-BdeAuGX5.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "53804c89-904b-4604-b688-594ed77a3f46", e._sentryDebugIdIdentifier = "sentry-dbid-53804c89-904b-4604-b688-594ed77a3f46");
	} catch (e) {}
})();
var SELENA_CATALOG_VERSION = "selena-catalog-rc6-v1";
var SELENA_CHECKOUT_METADATA = {
	sellerLegalEntity: "Selena Systems LLC",
	sellerStatus: "temporary_owner_approved_pending_kyc",
	currency: "USD",
	livePayments: "off"
};
var visitorSurfaces = [
	"ChatGPT",
	"Gemini",
	"Perplexity"
];
var apiModelIds = [
	"anthropic/claude-haiku-4.5",
	"deepseek/deepseek-v3.2",
	"qwen/qwen3.5-9b",
	"mistralai/mistral-small-2603",
	"x-ai/grok-4.5"
];
var planIds = [
	"visitor-local",
	"full-ai-landscape",
	"expert-verified",
	"growth-90-days"
];
var commonGates = [
	"admin_approval",
	"providers_off",
	"maintenance_off"
];
var SELENA_CATALOG = {
	"visitor-local": {
		planId: "visitor-local",
		name: "Visitor Local",
		billingInterval: "month",
		price: 49,
		currency: "USD",
		channelScope: ["VISITOR_VIEW"],
		systems: [...visitorSurfaces],
		languageLimit: 1,
		scenarioLimit: 100,
		questionLimitPerMeasurement: 25,
		repeatCount: 1,
		includedFeatures: [
			"1 organization",
			"1 site",
			"1 brand",
			"1 city or district",
			"300 planned answers",
			"competitors",
			"mentions",
			"positions",
			"citations",
			"public website scan",
			"approved public business/review signals",
			"dashboard",
			"CSV",
			"automatic recommendations"
		],
		excludedFeatures: [
			"five API View models",
			"manual analyst review",
			"Expert Verified",
			"Connected Analytics by default"
		],
		verificationLevel: "automated",
		laborHours: 0,
		providerBudgetCap: 12,
		retryPolicy: "one_technical_invalid",
		purchaseMode: "self_service",
		activationGates: [...commonGates]
	},
	"full-ai-landscape": {
		planId: "full-ai-landscape",
		name: "Full AI Landscape",
		billingInterval: "month",
		price: 79,
		currency: "USD",
		channelScope: ["VISITOR_VIEW", "API_VIEW"],
		systems: [...visitorSurfaces, ...apiModelIds],
		languageLimit: 2,
		scenarioLimit: 100,
		questionLimitPerMeasurement: 25,
		repeatCount: 1,
		includedFeatures: [
			"all 8 systems",
			"separate Visitor/API views",
			"divergence",
			"800 planned answers",
			"expanded source map",
			"Evidence Ledger",
			"PDF/XLSX/CSV when available"
		],
		excludedFeatures: ["manual analyst review", "Expert Verified"],
		verificationLevel: "automated",
		laborHours: 0,
		providerBudgetCap: 28,
		retryPolicy: "one_technical_invalid",
		purchaseMode: "self_service",
		activationGates: [...commonGates]
	},
	"expert-verified": {
		planId: "expert-verified",
		name: "Expert Verified",
		billingInterval: "one_time",
		price: 399,
		currency: "USD",
		channelScope: ["VISITOR_VIEW", "API_VIEW"],
		systems: [...visitorSurfaces, ...apiModelIds],
		languageLimit: 2,
		scenarioLimit: 50,
		questionLimitPerMeasurement: 25,
		repeatCount: 5,
		includedFeatures: [
			"25 questions across up to 2 languages",
			"2000 planned answers",
			"deep review of the top 10 priorities",
			"Evidence Ledger",
			"PDF/XLSX/CSV",
			"Recommendation Engine",
			"manual semantic/citation/factual QC",
			"5–10 approved recommendations",
			"2–3 analyst hours"
		],
		excludedFeatures: ["Expert Verified label before QC record"],
		verificationLevel: "awaiting_expert_review",
		laborHours: 3,
		providerBudgetCap: 48,
		retryPolicy: "one_technical_invalid",
		purchaseMode: "self_service",
		activationGates: [...commonGates, "expert_qc_record"]
	},
	"growth-90-days": {
		planId: "growth-90-days",
		name: "Growth 90 Days",
		billingInterval: "ninety_days",
		price: 2490,
		currency: "USD",
		channelScope: ["VISITOR_VIEW", "API_VIEW"],
		systems: [...visitorSurfaces, ...apiModelIds],
		languageLimit: 0,
		scenarioLimit: null,
		questionLimitPerMeasurement: null,
		repeatCount: null,
		includedFeatures: [
			"Expert Verified baseline",
			"Visitor/API divergence",
			"Public Data",
			"Uploaded Evidence",
			"optional Connected Analytics",
			"GSC/GBP/Instagram Insights when connected",
			"personal Action Plan",
			"up to 10 implementation hours",
			"8–12 lead expert hours",
			"90-day monitoring",
			"same Configuration Lock remeasurement",
			"second recommendation iteration",
			"final presentation"
		],
		excludedFeatures: ["automatic self-service checkout", "unlocked scope assumptions"],
		verificationLevel: "awaiting_expert_review",
		laborHours: 22,
		providerBudgetCap: 0,
		retryPolicy: "one_technical_invalid",
		purchaseMode: "manual_approval_contact_sales",
		activationGates: [
			...commonGates,
			"locked_custom_scope",
			"cycle_count",
			"provider_cost_cap",
			"margin_floor",
			"admin_approval"
		]
	}
};
object({
	planId: _enum(planIds),
	languages: array(string().min(2)).min(1).max(2),
	languageScenarios: number().int().positive(),
	repeats: number().int().positive(),
	systems: array(string().min(1)).min(1),
	providerCostCap: number().nonnegative(),
	laborCapHours: number().nonnegative(),
	adminApproved: boolean().default(false),
	growthScopeLocked: boolean().default(false)
});
/**
* The plan's monthly answer allowance — the number the pricing page quotes
* (100 scenarios × 3 systems = 300, and so on). Null when the plan sets no
* scenario or repeat bound (Growth), meaning the allowance is negotiated,
* not computed.
*/
function monthlyAnswerAllowance(planId) {
	const plan = SELENA_CATALOG[planId];
	if (plan.scenarioLimit === null || plan.repeatCount === null) return null;
	return plan.scenarioLimit * plan.systems.length * plan.repeatCount;
}
function assertExpertVerified(hasQcRecord) {
	if (!hasQcRecord) throw new Error("EXPERT_QC_REQUIRED");
}
Object.freeze({
	PROPOSED: ["APPROVED", "REJECTED"],
	APPROVED: ["IN_PROGRESS", "ABANDONED"],
	IN_PROGRESS: ["IMPLEMENTED", "ABANDONED"],
	IMPLEMENTED: ["VERIFIED"],
	VERIFIED: [],
	REJECTED: [],
	ABANDONED: []
});
strictObject({
	metricKey: string().trim().min(1),
	value: number().finite().nullable(),
	sourceId: string().trim().min(1),
	accessClass: _enum(["CONNECTED", "UPLOADED"]),
	evidenceIds: array(string().trim().min(1)).min(1),
	periodStart: datetime(),
	periodEnd: datetime()
}).refine((value) => Date.parse(value.periodEnd) > Date.parse(value.periodStart), "Outcome period must increase");
var HORECA_READ_MODEL_VERSION = "horeca-local-first-read-model/v1";
var horecaBusinessTypes = [
	"RESTAURANT",
	"CAFE",
	"FOOD_HALL",
	"HOTEL",
	"VILLA",
	"SPA"
];
var horecaProjectPhases = [
	"ACTIVE",
	"PRE_OPENING",
	"UNKNOWN"
];
var horecaModuleStates = [
	"HIDDEN",
	"LOCKED",
	"PILOT",
	"ACTIVE",
	"PARTIAL",
	"UNKNOWN",
	"BLOCKED"
];
var horecaModuleIds = [
	"AI_ANSWERS",
	"SEARCH",
	"LOCAL_MAPS",
	"LOCAL_AI",
	"REPUTATION",
	"SOCIAL",
	"TRAVEL",
	"OUTCOMES"
];
var horecaNavigationAreas = [
	"OVERVIEW",
	"VISIBILITY",
	"EVIDENCE",
	"COMPETITORS",
	"ACTIONS",
	"OUTCOMES"
];
var evidenceIdSchema = string().trim().min(1);
var measuredShareSchema = strictObject({
	kind: literal("MEASURED_SHARE"),
	sampleBasis: literal("ACCEPTED_ONLY"),
	numerator: number().int().nonnegative(),
	denominator: number().int().positive(),
	invalidCount: number().int().nonnegative(),
	capturedAt: datetime(),
	datasetVersion: string().trim().min(1)
}).refine((value) => value.numerator <= value.denominator, { message: "HORECA_SHARE_NUMERATOR_EXCEEDS_DENOMINATOR" });
var unknownShareSchema = strictObject({
	kind: literal("UNKNOWN"),
	numerator: _null(),
	denominator: _null(),
	invalidCount: number().int().nonnegative(),
	reason: string().trim().min(1)
});
var horecaShareSchema = discriminatedUnion("kind", [measuredShareSchema, unknownShareSchema]);
var horecaModuleReadModelSchema = strictObject({
	moduleId: _enum(horecaModuleIds),
	state: _enum(horecaModuleStates),
	label: string().trim().min(1),
	summary: horecaShareSchema,
	evidenceIds: array(evidenceIdSchema),
	configurationLockReference: string().trim().min(1).nullable(),
	limitations: array(string().trim().min(1))
}).superRefine((value, issues) => {
	if ((value.state === "ACTIVE" || value.state === "PARTIAL") && value.summary.kind !== "MEASURED_SHARE") issues.addIssue({
		code: "custom",
		message: "HORECA_ACTIVE_MODULE_REQUIRES_MEASUREMENT"
	});
	if (value.state === "UNKNOWN" && value.summary.kind !== "UNKNOWN") issues.addIssue({
		code: "custom",
		message: "HORECA_UNKNOWN_MODULE_REQUIRES_UNKNOWN_SUMMARY"
	});
	if ([
		"HIDDEN",
		"LOCKED",
		"BLOCKED"
	].includes(value.state) && value.summary.kind !== "UNKNOWN") issues.addIssue({
		code: "custom",
		message: "HORECA_UNAVAILABLE_MODULE_REQUIRES_UNKNOWN_SUMMARY"
	});
	if (value.summary.kind === "MEASURED_SHARE" && (value.evidenceIds.length === 0 || value.configurationLockReference === null)) issues.addIssue({
		code: "custom",
		message: "HORECA_MEASURED_MODULE_REQUIRES_EVIDENCE_AND_LOCK"
	});
});
var horecaEvidenceReferenceSchema = strictObject({
	id: evidenceIdSchema,
	domain: _enum([
		"ENTITY",
		"WEBSITE",
		"MENU",
		"AI_ANSWERS",
		"SEARCH",
		"MAPS",
		"REVIEW",
		"SOCIAL",
		"TRAVEL",
		"OUTCOME"
	]),
	accessClass: _enum([
		"PUBLIC",
		"UPLOADED",
		"CONNECTED",
		"DERIVED"
	]),
	sourceLabel: string().trim().min(1),
	capturedAt: datetime(),
	sourceReference: string().trim().min(1),
	snapshotReference: string().trim().min(1),
	acceptance: strictObject({
		status: literal("ACCEPTED"),
		acceptedAt: datetime()
	})
}).refine((value) => Date.parse(value.acceptance.acceptedAt) >= Date.parse(value.capturedAt), {
	message: "HORECA_EVIDENCE_ACCEPTANCE_PRECEDES_CAPTURE",
	path: ["acceptance", "acceptedAt"]
});
var horecaFindingSchema = strictObject({
	id: string().trim().min(1),
	area: _enum(horecaNavigationAreas),
	statement: string().trim().min(1),
	status: _enum([
		"OBSERVED",
		"CONFLICT",
		"UNKNOWN",
		"BLOCKED"
	]),
	evidenceIds: array(evidenceIdSchema).min(1)
});
var horecaCompetitorObservationSchema = strictObject({
	id: string().trim().min(1),
	competitorLabel: string().trim().min(1),
	surface: _enum([
		"AI_ANSWERS",
		"SEARCH",
		"LOCAL_MAPS",
		"LOCAL_AI",
		"REPUTATION",
		"SOCIAL",
		"TRAVEL"
	]),
	reason: string().trim().min(1),
	evidenceIds: array(evidenceIdSchema).min(1)
});
var horecaActionSchema = strictObject({
	id: string().trim().min(1),
	findingIds: array(string().trim().min(1)).min(1),
	action: string().trim().min(1),
	owner: string().trim().min(1),
	priority: _enum([
		"NOW",
		"NEXT",
		"LATER"
	]),
	status: _enum([
		"PROPOSED",
		"READY",
		"IN_PROGRESS",
		"DONE",
		"BLOCKED"
	]),
	evidenceIds: array(evidenceIdSchema).min(1),
	verificationPlan: string().trim().min(1)
});
var horecaOutcomeEvidenceSchema = strictObject({
	id: string().trim().min(1),
	level: _enum([
		"READINESS",
		"OBSERVED",
		"ASSISTED",
		"ATTRIBUTED"
	]),
	statement: string().trim().min(1),
	status: _enum([
		"MEASURED",
		"UNKNOWN",
		"BLOCKED"
	]),
	evidenceIds: array(evidenceIdSchema),
	integrationProofReference: string().trim().min(1).nullable()
}).superRefine((value, issues) => {
	if (value.status === "MEASURED" && value.evidenceIds.length === 0) issues.addIssue({
		code: "custom",
		message: "HORECA_MEASURED_OUTCOME_REQUIRES_EVIDENCE"
	});
	if (value.level === "ATTRIBUTED" && value.status === "MEASURED" && value.integrationProofReference === null) issues.addIssue({
		code: "custom",
		message: "HORECA_ATTRIBUTED_OUTCOME_REQUIRES_INTEGRATION_PROOF"
	});
});
var horecaLocalFirstReadModelSchema = strictObject({
	schemaVersion: literal(HORECA_READ_MODEL_VERSION),
	generatedAt: datetime(),
	project: strictObject({
		displayName: string().trim().min(1),
		businessType: _enum(horecaBusinessTypes),
		phase: _enum(horecaProjectPhases)
	}),
	navigation: array(_enum(horecaNavigationAreas)).length(horecaNavigationAreas.length),
	modules: array(horecaModuleReadModelSchema),
	evidence: array(horecaEvidenceReferenceSchema),
	findings: array(horecaFindingSchema),
	competitors: array(horecaCompetitorObservationSchema),
	actions: array(horecaActionSchema),
	outcomes: array(horecaOutcomeEvidenceSchema)
}).superRefine((value, issues) => {
	if (value.navigation.some((area, index) => area !== horecaNavigationAreas[index])) issues.addIssue({
		code: "custom",
		message: "HORECA_NAVIGATION_ORDER_INVALID"
	});
	if (new Set(value.modules.map((module) => module.moduleId)).size !== value.modules.length) issues.addIssue({
		code: "custom",
		message: "HORECA_MODULE_DUPLICATED"
	});
	for (const collection of [
		value.evidence,
		value.findings,
		value.competitors,
		value.actions,
		value.outcomes
	]) if (new Set(collection.map((item) => item.id)).size !== collection.length) issues.addIssue({
		code: "custom",
		message: "HORECA_READ_MODEL_ID_DUPLICATED"
	});
	const evidenceIds = new Set(value.evidence.map((evidence) => evidence.id));
	if ([
		...value.modules.flatMap((module) => module.evidenceIds),
		...value.findings.flatMap((finding) => finding.evidenceIds),
		...value.competitors.flatMap((competitor) => competitor.evidenceIds),
		...value.actions.flatMap((action) => action.evidenceIds),
		...value.outcomes.flatMap((outcome) => outcome.evidenceIds)
	].filter((id) => !evidenceIds.has(id)).length > 0) issues.addIssue({
		code: "custom",
		message: "HORECA_EVIDENCE_REFERENCE_MISSING"
	});
	const findingIds = new Set(value.findings.map((finding) => finding.id));
	if (value.actions.some((action) => action.findingIds.some((id) => !findingIds.has(id)))) issues.addIssue({
		code: "custom",
		message: "HORECA_ACTION_FINDING_REFERENCE_MISSING"
	});
	const hiddenModules = new Set(value.modules.filter((module) => module.state === "HIDDEN").map((module) => module.moduleId));
	if (hiddenModules.has("SOCIAL") && (value.evidence.some((evidence) => evidence.domain === "SOCIAL") || value.competitors.some((competitor) => competitor.surface === "SOCIAL")) || hiddenModules.has("TRAVEL") && (value.evidence.some((evidence) => evidence.domain === "TRAVEL") || value.competitors.some((competitor) => competitor.surface === "TRAVEL"))) issues.addIssue({
		code: "custom",
		message: "HORECA_HIDDEN_MODULE_DATA_FORBIDDEN"
	});
	if (value.project.phase === "PRE_OPENING") {
		const measuredVisibility = value.modules.some((module) => module.moduleId !== "OUTCOMES" && module.summary.kind === "MEASURED_SHARE");
		const measuredPostOpeningOutcome = value.outcomes.some((outcome) => outcome.level !== "READINESS" && outcome.status === "MEASURED");
		if (measuredVisibility || measuredPostOpeningOutcome) issues.addIssue({
			code: "custom",
			message: "HORECA_PRE_OPENING_MEASUREMENT_FORBIDDEN"
		});
	}
});
function customerVisibleHorecaModules(modules) {
	return modules.filter((module) => module.state !== "HIDDEN");
}
var localApiScopeSchema = _enum([
	"local:read",
	"local:write",
	"local:execute",
	"evidence:read"
]);
_enum(["provider:canary"]);
var PROVIDER_CANARY_SCOPE = "provider:canary";
var localApiErrorEnvelopeSchema = strictObject({ error: strictObject({
	code: string().regex(/^[A-Z][A-Z0-9_]*$/),
	message: string().trim().min(1).max(500),
	requestId: string().trim().min(1).max(128),
	retryable: boolean(),
	details: record(string(), unknown()).optional()
}) });
var localApiCursorResourceSchema = _enum([
	"map-results",
	"ai-results",
	"evidence"
]);
var localApiCursorPayloadSchema = strictObject({
	version: literal(1),
	tenantId: string().trim().min(1).max(160),
	cycleId: string().uuid(),
	resource: localApiCursorResourceSchema,
	snapshotVersion: datetime(),
	position: strictObject({
		sortValue: datetime(),
		tieBreakerId: string().uuid()
	})
});
var localApiPageSchema = strictObject({
	limit: number().int().min(1).max(200),
	nextCursor: string().min(1).nullable()
});
var localApiTruthStatusSchema = _enum([
	"VALID",
	"INVALID",
	"UNKNOWN",
	"BLOCKED"
]);
var countSchema = number().int().nonnegative();
var localApiProgressCountsSchema = strictObject({
	expected: countSchema,
	pending: countSchema,
	valid: countSchema,
	invalid: countSchema,
	unknown: countSchema,
	blocked: countSchema
}).refine((counts) => counts.pending + counts.valid + counts.invalid + counts.unknown + counts.blocked === counts.expected, { message: "LOCAL_API_PROGRESS_COUNTS_MISMATCH" });
var localApiSurfaceProgressSchema = strictObject({
	status: _enum([
		"NOT_INCLUDED",
		"NOT_STARTED",
		"RUNNING",
		"PARTIAL",
		"COMPLETED",
		"BLOCKED",
		"UNKNOWN"
	]),
	counts: localApiProgressCountsSchema
}).superRefine((surface, context) => {
	if (surface.status === "NOT_INCLUDED" && surface.counts.expected !== 0) context.addIssue({
		code: "custom",
		message: "LOCAL_API_NOT_INCLUDED_COUNTS_INVALID",
		path: ["counts"]
	});
	if (surface.status === "NOT_STARTED" && surface.counts.pending !== surface.counts.expected) context.addIssue({
		code: "custom",
		message: "LOCAL_API_NOT_STARTED_COUNTS_INVALID",
		path: ["counts"]
	});
	if (surface.status === "COMPLETED" && (surface.counts.pending !== 0 || surface.counts.invalid !== 0 || surface.counts.unknown !== 0 || surface.counts.blocked !== 0)) context.addIssue({
		code: "custom",
		message: "LOCAL_API_COMPLETED_COUNTS_INVALID",
		path: ["counts"]
	});
	if (surface.status === "BLOCKED" && surface.counts.blocked === 0) context.addIssue({
		code: "custom",
		message: "LOCAL_API_BLOCKED_COUNTS_REQUIRED",
		path: ["counts"]
	});
	if (surface.status === "UNKNOWN" && surface.counts.unknown === 0) context.addIssue({
		code: "custom",
		message: "LOCAL_API_UNKNOWN_COUNTS_REQUIRED",
		path: ["counts"]
	});
});
var localApiProgressResponseSchema = strictObject({
	cycleId: string().uuid(),
	status: _enum([
		"CREATED",
		"APPROVED",
		"AWAITING_APPROVAL",
		"QUEUED",
		"RUNNING",
		"ANALYZING",
		"QC_REQUIRED",
		"READY",
		"PARTIAL_FAILURE",
		"COMPLETED",
		"PREFLIGHT_BLOCKED",
		"BUDGET_BLOCKED",
		"PROVIDER_BLOCKED",
		"STOPPED",
		"FAILED",
		"CARDINALITY_INCIDENT",
		"UNKNOWN"
	]),
	maps: localApiSurfaceProgressSchema.extend({ surface: literal("LOCAL_MAPS") }),
	localAi: localApiSurfaceProgressSchema.extend({
		surface: literal("LOCAL_AI"),
		executionMode: literal("MANUAL_ONLY"),
		automationAllowed: literal(false)
	}),
	updatedAt: datetime()
});
var localApiMapResultSchema = strictObject({
	observationId: string().uuid().nullable(),
	gridPointId: string().uuid(),
	pointIndex: number().int().nonnegative(),
	latitude: number().finite().min(-90).max(90),
	longitude: number().finite().min(-180).max(180),
	keywordId: string().uuid(),
	keyword: string().trim().min(1),
	provider: string().trim().min(1),
	repeatIndex: number().int().nonnegative(),
	status: _enum([
		"FOUND",
		"ABSENT_WITHIN_DEPTH",
		"INVALID",
		"UNKNOWN",
		"BLOCKED",
		"PENDING",
		"CANCELLED"
	]),
	targetRank: number().int().positive().nullable(),
	reasonCode: string().trim().min(1).nullable(),
	capturedAt: datetime().nullable(),
	evidenceIds: array(string().trim().min(1))
}).superRefine((result, context) => {
	if (result.status === "PENDING" && (result.reasonCode !== null || result.capturedAt !== null || result.evidenceIds.length !== 0)) context.addIssue({
		code: "custom",
		message: "LOCAL_API_PENDING_EVIDENCE_FORBIDDEN"
	});
	if (result.status === "CANCELLED" && (result.reasonCode !== "LOCAL_STOPPED" || result.capturedAt !== null || result.evidenceIds.length !== 0)) context.addIssue({
		code: "custom",
		message: "LOCAL_API_CANCELLED_STATE_INVALID"
	});
	const measured = result.status === "FOUND" || result.status === "ABSENT_WITHIN_DEPTH";
	if (result.status === "FOUND" && result.targetRank === null) context.addIssue({
		code: "custom",
		message: "LOCAL_API_FOUND_RANK_REQUIRED",
		path: ["targetRank"]
	});
	if (result.status !== "FOUND" && result.targetRank !== null) context.addIssue({
		code: "custom",
		message: "LOCAL_API_UNMEASURED_RANK_FORBIDDEN",
		path: ["targetRank"]
	});
	if (measured && (result.observationId === null || result.capturedAt === null)) context.addIssue({
		code: "custom",
		message: "LOCAL_API_MEASUREMENT_PROVENANCE_REQUIRED"
	});
	if (measured && result.evidenceIds.length === 0) context.addIssue({
		code: "custom",
		message: "LOCAL_API_MEASUREMENT_EVIDENCE_REQUIRED",
		path: ["evidenceIds"]
	});
	if (measured && result.reasonCode !== null) context.addIssue({
		code: "custom",
		message: "LOCAL_API_MEASUREMENT_REASON_FORBIDDEN",
		path: ["reasonCode"]
	});
	if (!measured && result.status !== "PENDING" && result.reasonCode === null) context.addIssue({
		code: "custom",
		message: "LOCAL_API_UNRESOLVED_REASON_REQUIRED",
		path: ["reasonCode"]
	});
});
var localApiCollectionStatuses = [
	"NOT_INCLUDED",
	"READY",
	"PARTIAL",
	"UNKNOWN",
	"BLOCKED"
];
var localApiMapResultsResponseSchema = strictObject({
	cycleId: string().uuid(),
	datasetId: string().uuid().nullable(),
	surface: literal("LOCAL_MAPS"),
	status: _enum(localApiCollectionStatuses),
	items: array(localApiMapResultSchema),
	page: localApiPageSchema
}).superRefine((response, context) => {
	if (response.status === "NOT_INCLUDED" && (response.datasetId !== null || response.items.length !== 0)) context.addIssue({
		code: "custom",
		message: "LOCAL_API_NOT_INCLUDED_MAPS_DATA_FORBIDDEN"
	});
	if ((response.status === "READY" || response.status === "PARTIAL") && response.datasetId === null) context.addIssue({
		code: "custom",
		message: "LOCAL_API_MAPS_DATASET_REQUIRED",
		path: ["datasetId"]
	});
});
var localApiManualTaskStatuses = [
	"PENDING_CAPTURE",
	"AWAITING_MANUAL_CAPTURE",
	"SUBMITTED_FOR_REVIEW",
	"ACCEPTED",
	"REJECTED",
	"NEEDS_CORRECTION",
	"INSUFFICIENT_EVIDENCE",
	"SURFACE_UNAVAILABLE"
];
var localApiInvalidTaskStatuses = [
	"REJECTED",
	"NEEDS_CORRECTION",
	"INSUFFICIENT_EVIDENCE"
];
var localApiAiResultSchema = strictObject({
	captureTaskId: string().uuid(),
	localAiRunId: string().uuid(),
	scanCycleId: string().uuid(),
	pointId: string().uuid().nullable(),
	latitude: number().finite().min(-90).max(90).nullable(),
	longitude: number().finite().min(-180).max(180).nullable(),
	coordinateProofReference: string().trim().min(1).nullable(),
	observationId: string().uuid().nullable(),
	scenarioId: string().uuid(),
	promptId: string().uuid(),
	promptText: string().trim().min(1).nullable(),
	system: string().trim().min(1).nullable(),
	measurementSurface: literal("GOOGLE_ASK_MAPS"),
	modelOrEnvironment: string().trim().min(1).nullable(),
	webSearchState: string().trim().min(1).nullable(),
	personalizationMode: string().trim().min(1).nullable(),
	accountMode: string().trim().min(1).nullable(),
	language: string().trim().min(2).nullable(),
	contextHash: string().trim().min(1),
	repeatIndex: number().int().nonnegative(),
	taskStatus: _enum(localApiManualTaskStatuses),
	validity: _enum([
		"VALID",
		"INVALID",
		"UNMEASURED"
	]).nullable(),
	rawResponseReference: _null(),
	targetMention: boolean().nullable(),
	recommendationPosition: number().int().positive().nullable(),
	citations: array(unknown()),
	competitors: array(unknown()),
	costEventId: string().uuid().nullable(),
	resultStatus: localApiTruthStatusSchema,
	reasonCode: string().trim().min(1).nullable(),
	capturedAt: datetime().nullable(),
	evidenceIds: array(string().trim().min(1))
}).superRefine((result, context) => {
	if (result.resultStatus === "VALID") {
		if (result.taskStatus !== "ACCEPTED" || result.validity !== "VALID") context.addIssue({
			code: "custom",
			message: "LOCAL_API_AI_VALID_STATE_MISMATCH"
		});
		if (result.observationId === null || result.capturedAt === null || result.evidenceIds.length === 0) context.addIssue({
			code: "custom",
			message: "LOCAL_API_AI_VALID_EVIDENCE_REQUIRED"
		});
		if (result.reasonCode !== null) context.addIssue({
			code: "custom",
			message: "LOCAL_API_AI_VALID_REASON_FORBIDDEN",
			path: ["reasonCode"]
		});
	} else if (result.resultStatus === "INVALID") {
		if (!localApiInvalidTaskStatuses.includes(result.taskStatus) || result.validity !== "INVALID") context.addIssue({
			code: "custom",
			message: "LOCAL_API_AI_INVALID_STATE_MISMATCH"
		});
		if (result.reasonCode === null) context.addIssue({
			code: "custom",
			message: "LOCAL_API_AI_NONVALID_REASON_REQUIRED",
			path: ["reasonCode"]
		});
	} else if (result.reasonCode === null) context.addIssue({
		code: "custom",
		message: "LOCAL_API_AI_NONVALID_REASON_REQUIRED",
		path: ["reasonCode"]
	});
});
var localApiAiResultsResponseSchema = strictObject({
	cycleId: string().uuid(),
	pilotCycleId: string().uuid().nullable(),
	surface: literal("LOCAL_AI"),
	executionMode: literal("MANUAL_ONLY"),
	automationAllowed: literal(false),
	status: _enum(localApiCollectionStatuses),
	items: array(localApiAiResultSchema),
	page: localApiPageSchema
}).superRefine((response, context) => {
	if (response.status === "NOT_INCLUDED" && (response.pilotCycleId !== null || response.items.length !== 0)) context.addIssue({
		code: "custom",
		message: "LOCAL_API_NOT_INCLUDED_AI_DATA_FORBIDDEN"
	});
	if ((response.status === "READY" || response.status === "PARTIAL") && response.pilotCycleId === null) context.addIssue({
		code: "custom",
		message: "LOCAL_API_AI_CYCLE_REQUIRED",
		path: ["pilotCycleId"]
	});
});
var localApiEvidenceAccessSchema = discriminatedUnion("state", [strictObject({
	state: literal("SIGNED"),
	url: url(),
	expiresAt: datetime(),
	ttlSeconds: literal(600)
}), strictObject({
	state: literal("UNAVAILABLE"),
	reason: _enum([
		"SIGNING_UNAVAILABLE",
		"NO_REFERENCE",
		"INVALID_REFERENCE",
		"BLOCKED",
		"UNKNOWN"
	]),
	url: _null(),
	expiresAt: _null(),
	ttlSeconds: literal(600)
})]);
var localApiEvidenceItemSchema = strictObject({
	evidenceId: string().trim().min(1),
	datasetId: string().uuid().nullable(),
	surface: _enum(["LOCAL_MAPS", "LOCAL_AI"]),
	status: localApiTruthStatusSchema,
	kind: string().trim().min(1),
	provenanceVerified: boolean(),
	capturedAt: datetime().nullable(),
	access: localApiEvidenceAccessSchema
}).superRefine((item, context) => {
	if (item.status === "VALID" && (!item.provenanceVerified || item.capturedAt === null)) context.addIssue({
		code: "custom",
		message: "LOCAL_API_VALID_EVIDENCE_PROVENANCE_REQUIRED"
	});
	if (item.status !== "VALID" && item.provenanceVerified) context.addIssue({
		code: "custom",
		message: "LOCAL_API_NONVALID_EVIDENCE_PROVENANCE_FORBIDDEN"
	});
	if (item.status !== "VALID" && item.access.state === "SIGNED") context.addIssue({
		code: "custom",
		message: "LOCAL_API_NONVALID_EVIDENCE_SIGNING_FORBIDDEN",
		path: ["access"]
	});
});
var localApiEvidenceResponseSchema = strictObject({
	cycleId: string().uuid(),
	items: array(localApiEvidenceItemSchema),
	page: localApiPageSchema
});
var LOCAL_AI_DISCOVERY_POLICY = Object.freeze({
	surface: "GOOGLE_ASK_MAPS",
	surfaceFamily: "LOCAL_AI_DISCOVERY",
	status: "MANUAL_ONLY",
	captureMethod: "MANUAL_OBSERVATION",
	backendExternalCallsAllowed: false,
	automatedExecutionAllowed: false,
	scrapingAllowed: false,
	placesApiAllowed: false,
	policyVersion: "local-ai-discovery-v1"
});
function localDiscoveryConfigFromEnv(env) {
	return {
		enabled: env.LOCAL_AI_DISCOVERY_ENABLED === "true",
		manualPilotEnabled: env.ASK_MAPS_MANUAL_PILOT_ENABLED === "true",
		clientResultsEnabled: env.LOCAL_AI_DISCOVERY_CLIENT_RESULTS_ENABLED === "true"
	};
}
function assertLocalDiscoveryEnabled(config) {
	if (!config.enabled) throw new Error("LOCAL_AI_DISCOVERY_DISABLED");
}
function assertManualPilotAllowed(config) {
	assertLocalDiscoveryEnabled(config);
	if (!config.manualPilotEnabled) throw new Error("ASK_MAPS_MANUAL_PILOT_DISABLED");
}
var observerContextSchema = strictObject({
	observerCountryCode: string().trim().min(2).max(2),
	observerAdminArea: string().trim().min(1).max(160).optional(),
	observerLocality: string().trim().min(1).max(160).optional(),
	observerGeoMode: _enum([
		"DECLARED_AREA",
		"DECLARED_COORDINATE",
		"UNKNOWN"
	]),
	observerLatitude: number().min(-90).max(90).optional(),
	observerLongitude: number().min(-180).max(180).optional(),
	appLocale: string().trim().min(2).max(35),
	queryLanguage: string().trim().min(2).max(35),
	deviceClass: _enum([
		"MOBILE_IOS",
		"MOBILE_ANDROID",
		"DESKTOP",
		"UNKNOWN"
	]),
	accountState: _enum([
		"SIGNED_OUT",
		"SIGNED_IN",
		"UNKNOWN"
	]),
	personalizationState: _enum([
		"ON",
		"OFF",
		"UNKNOWN"
	]),
	timezone: string().trim().min(1).max(64),
	capturedAt: datetime()
}).superRefine((context, issues) => {
	const hasLatitude = context.observerLatitude !== void 0;
	const hasLongitude = context.observerLongitude !== void 0;
	if (hasLatitude !== hasLongitude) issues.addIssue({
		code: "custom",
		message: "OBSERVER_COORDINATES_MUST_BE_PAIRED"
	});
	if (context.observerGeoMode === "DECLARED_COORDINATE" && (!hasLatitude || !hasLongitude)) issues.addIssue({
		code: "custom",
		message: "DECLARED_COORDINATE_REQUIRES_COORDINATES"
	});
});
var localAiTaskContextSnapshotSchema = observerContextSchema.safeExtend({ pointId: string().uuid().optional() }).superRefine((context, issues) => {
	if (context.observerGeoMode === "DECLARED_COORDINATE" && context.pointId === void 0) issues.addIssue({
		code: "custom",
		message: "DECLARED_COORDINATE_REQUIRES_POINT_ID"
	});
});
function observerContextFromTaskSnapshot(snapshot) {
	const { pointId: _pointId, ...context } = localAiTaskContextSnapshotSchema.parse(snapshot);
	return observerContextSchema.parse(context);
}
function contextHash(context) {
	const { capturedAt: _capturedAt, ...conditions } = observerContextSchema.parse(context);
	const canonical = {};
	for (const key of Object.keys(conditions).sort()) {
		const value = conditions[key];
		if (value !== void 0) canonical[key] = value;
	}
	return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
function localAiTaskContextHash(snapshot) {
	return contextHash(observerContextFromTaskSnapshot(snapshot));
}
function localAiTaskContextIdentityKey(snapshot) {
	const parsed = localAiTaskContextSnapshotSchema.parse(snapshot);
	return `${localAiTaskContextHash(parsed)}:${parsed.pointId ?? ""}`;
}
var lockEntitySchema = strictObject({
	entityId: string().uuid(),
	name: string().trim().min(1),
	aliases: array(string().trim().min(1)).default([]),
	entityKind: _enum([
		"MASTER_BRAND",
		"SUBBRAND",
		"CONCEPT",
		"LOCATION_BRAND"
	]),
	prelaunch: boolean().default(false)
});
var lockEntityRelationshipSchema = strictObject({
	parentEntityId: string().uuid(),
	childEntityId: string().uuid(),
	relation: _enum([
		"SUBBRAND_OF",
		"CONCEPT_WITHIN",
		"LOCATION_OF",
		"UNSPECIFIED"
	])
});
var lockBusinessLocationSchema = strictObject({
	locationId: string().uuid(),
	entityId: string().uuid(),
	displayName: string().trim().min(1),
	countryCode: string().trim().min(2).max(2),
	adminArea: string().trim().min(1).optional(),
	locality: string().trim().min(1).optional()
});
var lockScenarioSchema = strictObject({
	scenarioId: string().uuid(),
	queryText: string().trim().min(1),
	language: string().trim().min(2).max(35),
	targetEntityIds: array(string().uuid()).min(1)
});
var evidencePolicySchema = strictObject({
	queryRequired: literal(true),
	contextRequired: literal(true),
	timestampRequired: literal(true),
	transcriptRequired: literal(true),
	screenshotRequired: literal(true),
	visibleSourcesOptional: boolean()
});
var localAiDiscoveryLockBlockSchema = strictObject({
	schemaVersion: literal(1),
	surface: literal("GOOGLE_ASK_MAPS"),
	captureMethod: literal("MANUAL_OBSERVATION"),
	externalCallsAllowed: literal(false),
	placesApiAllowed: literal(false),
	policyVersion: string().min(1),
	captureProtocolVersion: string().min(1),
	entities: array(lockEntitySchema),
	entityRelationships: array(lockEntityRelationshipSchema),
	businessLocations: array(lockBusinessLocationSchema),
	scenarios: array(lockScenarioSchema),
	observerContexts: array(localAiTaskContextSnapshotSchema),
	repeats: number().int().min(0),
	expectedObservations: number().int().min(0),
	evidencePolicy: evidencePolicySchema
}).superRefine((block, issues) => {
	const known = new Set(block.entities.map((entity) => entity.entityId));
	for (const relationship of block.entityRelationships) if (!known.has(relationship.parentEntityId) || !known.has(relationship.childEntityId)) issues.addIssue({
		code: "custom",
		message: "LOCK_RELATIONSHIP_UNKNOWN_ENTITY"
	});
	for (const location of block.businessLocations) if (!known.has(location.entityId)) issues.addIssue({
		code: "custom",
		message: "LOCK_LOCATION_UNKNOWN_ENTITY"
	});
	for (const scenario of block.scenarios) if (scenario.targetEntityIds.some((id) => !known.has(id))) issues.addIssue({
		code: "custom",
		message: "LOCK_SCENARIO_UNKNOWN_TARGET"
	});
	if (block.expectedObservations !== expectedObservations(block.scenarios, block.observerContexts, block.repeats)) issues.addIssue({
		code: "custom",
		message: "OBSERVATION_CARDINALITY_MISMATCH"
	});
});
var toCount = (value) => typeof value === "number" ? value : value.length;
function expectedObservations(scenarios, observerContexts, repeats) {
	const counts = [
		toCount(scenarios),
		toCount(observerContexts),
		repeats
	];
	if (counts.some((value) => !Number.isInteger(value) || value < 0)) throw new Error("OBSERVATION_CARDINALITY_INVALID");
	return counts[0] * counts[1] * counts[2];
}
function assertObservationCardinality(created, expected) {
	if (!Number.isInteger(created) || !Number.isInteger(expected) || created < 0 || expected < 0) throw new Error("OBSERVATION_CARDINALITY_INVALID");
	if (created >= expected) throw new Error("OBSERVATION_CARDINALITY_BLOCKED");
}
var observationReviewDecisions = [
	"ACCEPTED",
	"REJECTED",
	"NEEDS_CORRECTION",
	"INSUFFICIENT_EVIDENCE",
	"SURFACE_UNAVAILABLE"
];
var orderingStates = [
	"EXPLICIT_ORDER",
	"UNORDERED",
	"UNKNOWN"
];
function observationEvidenceAssetsAreDistinct(screenshot, coordinateProof) {
	const screenshotSha256 = screenshot.sha256.trim().toLowerCase().replace(/^sha256:/, "");
	const coordinateProofSha256 = coordinateProof.sha256.trim().toLowerCase().replace(/^sha256:/, "");
	return screenshot.privateObjectReference.trim() !== coordinateProof.privateObjectReference.trim() && screenshotSha256 !== coordinateProofSha256;
}
var hasValidTimestamp = (value) => value != null && Number.isFinite(new Date(value).getTime());
function observationSubmissionViolations(submission, policy) {
	const violations = [];
	if (policy.queryRequired && !submission.queryText?.trim()) violations.push("OBSERVATION_MISSING_QUERY_TEXT");
	const parsedContext = localAiTaskContextSnapshotSchema.safeParse(submission.context);
	if (policy.contextRequired && !parsedContext.success) violations.push("OBSERVATION_MISSING_CONTEXT");
	if (policy.timestampRequired && !hasValidTimestamp(submission.capturedAt)) violations.push("OBSERVATION_MISSING_CAPTURED_AT");
	if (policy.transcriptRequired && !submission.transcript?.trim()) violations.push("OBSERVATION_MISSING_TRANSCRIPT");
	if (policy.screenshotRequired && !submission.screenshotReference?.trim()) violations.push("OBSERVATION_MISSING_SCREENSHOT");
	if (parsedContext.success && parsedContext.data.observerGeoMode === "DECLARED_COORDINATE" && !submission.coordinateProofReference?.trim()) violations.push("OBSERVATION_MISSING_COORDINATE_PROOF");
	if (parsedContext.success && parsedContext.data.observerGeoMode === "DECLARED_COORDINATE" && submission.screenshotReference?.trim() && submission.screenshotSha256?.trim() && submission.coordinateProofReference?.trim() && submission.coordinateProofSha256?.trim() && !observationEvidenceAssetsAreDistinct({
		privateObjectReference: submission.screenshotReference,
		sha256: submission.screenshotSha256
	}, {
		privateObjectReference: submission.coordinateProofReference,
		sha256: submission.coordinateProofSha256
	})) violations.push("OBSERVATION_EVIDENCE_ASSETS_NOT_DISTINCT");
	return violations;
}
function assertObservationSubmission(submission, policy) {
	const violations = observationSubmissionViolations(submission, policy);
	if (violations.length > 0) throw new Error(violations.join(", "));
}
/**
* A manual capture is valid only for the immutable task/scenario query that
* was sold in the lock. The UI-provided query is evidence metadata, not an
* authority that may replace the task snapshot.
*/
function assertObservationMatchesLockedTask(input) {
	if (input.scenario === null) throw new Error("OBSERVATION_SCENARIO_MISSING");
	if (input.taskQueryText !== input.scenario.queryText) throw new Error("OBSERVATION_TASK_QUERY_MISMATCH");
	if (input.queryText !== input.taskQueryText) throw new Error("OBSERVATION_QUERY_MISMATCH");
	if (input.context.queryLanguage !== input.scenario.language) throw new Error("OBSERVATION_LANGUAGE_MISMATCH");
}
function resolveExplicitPosition(orderingState, explicitPosition) {
	if (explicitPosition == null) return null;
	if (!Number.isInteger(explicitPosition) || explicitPosition < 1) throw new Error("MENTION_POSITION_INVALID");
	if (orderingState !== "EXPLICIT_ORDER") throw new Error("MENTION_POSITION_WITHOUT_EXPLICIT_ORDER");
	return explicitPosition;
}
function assertMentionMatch(mention) {
	if (mention.matchStatus === "UNRESOLVED" && mention.matchedEntityId) throw new Error("MENTION_UNRESOLVED_WITH_ENTITY");
	if (mention.matchStatus !== "UNRESOLVED" && !mention.matchedEntityId) throw new Error("MENTION_MATCH_WITHOUT_ENTITY");
}
var localExecutionDomainIds = ["LOCAL_MAPS", "LOCAL_AI"];
var retryableAttemptReasons = [
	"EMPTY_RESPONSE",
	"TRUNCATED_RESPONSE",
	"TIMEOUT",
	"PROVIDER_5XX",
	"RATE_LIMITED",
	"MALFORMED_RESPONSE"
];
var attemptIndexSchema$2 = union([
	literal(1),
	literal(2),
	literal(3)
]);
var executionKeyPartSchema = string().min(1).regex(/^\S+$/, "EXECUTION_KEY_PART_WHITESPACE_INVALID").refine((value) => !value.includes("|"), "EXECUTION_KEY_PART_INVALID");
var baseSlotKeySchema = string().trim().refine((value) => {
	const parts = value.split("|");
	return parts.length === 6 && localExecutionDomainIds.includes(parts[0]) && parts.every((part) => part.length > 0) && /^\d+$/.test(parts[5]);
}, "BASE_SLOT_KEY_INVALID");
var measurementExecutionKeySchema = string().trim().refine((value) => {
	const parts = value.split("|");
	return parts.length === 7 && localExecutionDomainIds.includes(parts[0]) && string().uuid().safeParse(parts[1]).success && string().uuid().safeParse(parts[2]).success && string().uuid().safeParse(parts[3]).success && executionKeyPartSchema.safeParse(parts[4]).success && /^(?:0|[1-9]\d{0,9})$/.test(parts[5] ?? "") && Number(parts[5]) <= 2147483647 && /^[123]$/.test(parts[6] ?? "");
}, "MEASUREMENT_EXECUTION_KEY_INVALID");
/** Parse the single persisted seven-part execution-key grammar. */
function parseMeasurementExecutionKey(value) {
	const [domainId, cycleId, pointId, itemId, providerId, repeatIndex, attemptIndex] = measurementExecutionKeySchema.parse(value).split("|");
	return {
		domainId,
		cycleId,
		pointId,
		itemId,
		providerId,
		repeatIndex: Number(repeatIndex),
		attemptIndex: Number(attemptIndex),
		baseSlotKey: [
			domainId,
			cycleId,
			pointId,
			itemId,
			providerId,
			repeatIndex
		].join("|")
	};
}
var localMapsSlotSchema = strictObject({
	cycleId: string().uuid(),
	pointId: string().uuid(),
	keywordId: string().uuid(),
	providerId: executionKeyPartSchema,
	repeatIndex: number().int().nonnegative()
});
strictObject({
	cycleId: string().uuid(),
	pointId: string().uuid(),
	promptId: string().uuid(),
	systemId: executionKeyPartSchema,
	repeatIndex: number().int().nonnegative()
});
var joinKey = (parts) => parts.join("|");
function localMapsBaseSlotKey(input) {
	const slot = localMapsSlotSchema.parse(input);
	return joinKey([
		"LOCAL_MAPS",
		slot.cycleId,
		slot.pointId,
		slot.keywordId,
		slot.providerId,
		slot.repeatIndex
	]);
}
function measurementExecutionKey(baseSlotKey, attemptIndex) {
	const executionKey = `${baseSlotKeySchema.parse(baseSlotKey)}|${attemptIndexSchema$2.parse(attemptIndex)}`;
	parseMeasurementExecutionKey(executionKey);
	return executionKey;
}
var positiveInteger = number().int().positive();
function maximumProviderAttempts(expectedSlots) {
	return positiveInteger.parse(expectedSlots) * 3;
}
strictObject({
	attemptId: string().uuid(),
	reservationId: string().uuid(),
	executionKey: string().trim().min(1),
	attemptIndex: attemptIndexSchema$2,
	status: literal("CLAIMED"),
	submittedAt: _null(),
	leaseExpiresAt: datetime()
}).refine((claim) => claim.executionKey.endsWith(`|${claim.attemptIndex}`), "MEASUREMENT_ATTEMPT_KEY_INDEX_MISMATCH");
strictObject({
	action: literal("RECLAIM_EXISTING_ATTEMPT"),
	attemptId: string().uuid(),
	reservationId: string().uuid(),
	executionKey: string().trim().min(1),
	attemptIndex: attemptIndexSchema$2,
	createAttempt: literal(false),
	createReservation: literal(false)
});
var idempotencyKeySchema = string().min(8).max(128).refine((value) => value.trim() === value, "IDEMPOTENCY_KEY_WHITESPACE");
var bodyHashSchema = string().regex(/^sha256:[a-f0-9]{64}$/);
var operationSchema = string().regex(/^[a-z][a-z0-9-]{1,63}$/);
var resourceIdSchema = string().min(1).max(160).refine((value) => value.trim() === value, "RESOURCE_ID_WHITESPACE");
var localApiIdempotencyRecordSchema = strictObject({
	schemaVersion: literal(1),
	tenantId: string().trim().min(1).max(160),
	operation: operationSchema,
	resourceId: resourceIdSchema,
	idempotencyKey: idempotencyKeySchema,
	bodyHash: bodyHashSchema,
	responseStatus: number().int().min(200).max(299),
	responseBody: unknown(),
	createdAt: datetime(),
	expiresAt: datetime()
}).superRefine((record, issues) => {
	const createdAt = new Date(record.createdAt).getTime();
	const expiresAt = new Date(record.expiresAt).getTime();
	if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt <= createdAt) {
		issues.addIssue({
			code: "custom",
			message: "LOCAL_API_IDEMPOTENCY_EXPIRY_INVALID",
			path: ["expiresAt"]
		});
		return;
	}
	if (expiresAt - createdAt > 6048e5) issues.addIssue({
		code: "custom",
		message: "LOCAL_API_IDEMPOTENCY_RETENTION_EXCEEDED",
		path: ["expiresAt"]
	});
});
var localApiIdempotencyIdentitySchema = strictObject({
	tenantId: string().trim().min(1).max(160),
	operation: operationSchema,
	resourceId: resourceIdSchema,
	idempotencyKey: idempotencyKeySchema,
	bodyHash: bodyHashSchema
});
/**
* One environment variable names one adapter, but a plan sells several systems
* at once — the local plan alone buys three visitor surfaces. A family name is
* the routing rule for that: the concrete adapter is chosen per permit from the
* system that permit authorizes, so a surface the customer bought is never
* measured on a different one.
*
* A family widens nothing. Every destination is an individually owner-approved
* adapter, and each one is still checked against the approved list before it
* can run.
*/
var visitorRoutes = {
	ChatGPT: "brightdata-chatgpt",
	Gemini: "brightdata-gemini",
	Perplexity: "brightdata-perplexity"
};
({ ...visitorRoutes });
var bothChannelRoutes = { ...visitorRoutes };
bothChannelRoutes.Perplexity = "dataforseo-perplexity";
for (const model of apiModelIds) bothChannelRoutes[model] = "openrouter";
var affirmativeEnvValues = /* @__PURE__ */ new Set([
	"1",
	"true",
	"yes"
]);
/** Operator flags are fail-closed but tolerate whitespace from deployment UIs. */
function isAffirmativeEnvValue(value) {
	return value !== void 0 && affirmativeEnvValues.has(value.trim());
}
function measurementConfigFromEnv(env) {
	return {
		enabled: isAffirmativeEnvValue(env.SELENA_MEASUREMENT_ENABLED),
		adapter: env.SELENA_MEASUREMENT_ADAPTER ?? "noop"
	};
}
var runOutcomeStatuses = [
	"SUCCEEDED",
	"INVALID",
	"FAILED"
];
var runValidities = ["VALID", "INVALID"];
var runCostBases = ["actual", "estimated"];
/**
* What the adapter observed in the answer — one Evidence Ledger row's worth of
* extraction. strictObject for the same reason as the outcome itself: an
* adapter cannot smuggle fields past the contract.
*/
var runMeasurementSchema = strictObject({
	system: string().min(1),
	model: string().min(1).optional(),
	language: string().min(1),
	region: string().min(1).optional(),
	extractorVersion: string().min(1),
	/**
	* How the answer was produced. Perplexity searches the live web while
	* ChatGPT and Gemini answer from training data: the two are different
	* observations of different things, and a rate that averages them is
	* about neither. The adapter that made the call is the source of truth;
	* anything that did not establish it says so rather than guessing.
	*/
	captureMode: _enum([
		"live_search",
		"training_data",
		"unknown"
	]).default("unknown"),
	/** The canonical brand name the extraction matched against. */
	brand: string().min(1),
	mention: boolean(),
	position: number().int().positive().nullable(),
	ownedCitation: boolean(),
	citations: array(strictObject({
		url: string().min(1),
		domain: string().min(1)
	})),
	competitors: array(strictObject({
		name: string().min(1),
		position: number().int().positive().nullable()
	})),
	factualErrors: array(string().min(1))
}).superRefine((m, issues) => {
	if (!m.mention && m.position !== null) issues.addIssue({
		code: "custom",
		message: "RUN_MEASUREMENT_POSITION_WITHOUT_MENTION",
		path: ["position"]
	});
	if (m.ownedCitation && m.citations.length === 0) issues.addIssue({
		code: "custom",
		message: "RUN_MEASUREMENT_OWNED_CITATION_WITHOUT_CITATIONS",
		path: ["ownedCitation"]
	});
});
var runOutcomeSchema = strictObject({
	dispatchKey: string().min(1),
	status: _enum(runOutcomeStatuses),
	validity: _enum(runValidities),
	invalidReason: string().min(1).optional(),
	rawResponseReference: string().min(1).optional(),
	answer: strictObject({
		text: string().min(1),
		citedUrls: array(string().min(1)).optional(),
		retainUntil: date()
	}).optional(),
	/**
	* What the Visitor View surface displayed as sources beside the answer.
	* A different origin from answer.citedUrls (the provider naming its own
	* sources) and from anything later derived from the answer text — the
	* three must never be pooled into one figure. Top-level rather than
	* inside answer because a surface whose answer text stays out of the row
	* (Bright Data keeps a reference, not the text) still shows citations,
	* and losing them with the text would erase evidence that was displayed.
	*/
	sources: array(strictObject({
		url: string().min(1),
		domain: string().min(1),
		title: string().min(1).optional()
	})).optional(),
	tokenUsage: strictObject({
		input: number().int().nonnegative(),
		output: number().int().nonnegative()
	}).optional(),
	costUsd: number().nonnegative().optional(),
	costBasis: _enum(runCostBases).optional(),
	provider: string().min(1).optional(),
	measurement: runMeasurementSchema.optional()
}).superRefine((outcome, issues) => {
	if (outcome.status !== "SUCCEEDED" && outcome.validity !== "INVALID") issues.addIssue({
		code: "custom",
		message: "RUN_OUTCOME_VALIDITY_MISMATCH",
		path: ["validity"]
	});
	if (outcome.validity === "INVALID" && !outcome.invalidReason) issues.addIssue({
		code: "custom",
		message: "RUN_OUTCOME_INVALID_REASON_REQUIRED",
		path: ["invalidReason"]
	});
	if (outcome.costUsd !== void 0 && outcome.costBasis === void 0) issues.addIssue({
		code: "custom",
		message: "RUN_OUTCOME_COST_BASIS_REQUIRED",
		path: ["costBasis"]
	});
	if (outcome.costUsd !== void 0 && outcome.provider === void 0) issues.addIssue({
		code: "custom",
		message: "RUN_OUTCOME_COST_PROVIDER_REQUIRED",
		path: ["provider"]
	});
	if (outcome.measurement && outcome.status !== "SUCCEEDED") issues.addIssue({
		code: "custom",
		message: "RUN_OUTCOME_MEASUREMENT_REQUIRES_SUCCESS",
		path: ["measurement"]
	});
});
strictObject({
	shape: literal("SQUARE"),
	rows: number().int().positive(),
	columns: number().int().positive(),
	spacingMeters: number().int().positive(),
	centerLatitude: number().min(-90).max(90),
	centerLongitude: number().min(-180).max(180),
	formulaVersion: string().min(1)
}).refine((value) => value.rows === value.columns, "Square grids require equal rows and columns").refine((value) => value.rows % 2 === 1, "Square grids require an odd side length");
var surfaceFamilies = [
	"AI",
	"LOCAL",
	"SEARCH",
	"REPUTATION"
];
var surfaceCaptureMethods = [
	"PROVIDER_API",
	"VISITOR_SCRAPE",
	"MANUAL_OBSERVATION"
];
var visibilitySurfaceIds = [
	"AI_ANSWER_ENGINE",
	"GOOGLE_ASK_MAPS",
	"GOOGLE_MAPS_LOCAL_PACK",
	"GOOGLE_ORGANIC",
	"GOOGLE_AI_OVERVIEWS",
	"REVIEW_PLATFORM"
];
var surfaceSpec = strictObject({
	surfaceId: _enum(visibilitySurfaceIds),
	family: _enum(surfaceFamilies),
	captureMethods: array(_enum(surfaceCaptureMethods)).min(1),
	featureFlag: string().min(1),
	status: _enum(["MEASURED", "ADD"])
});
Object.freeze({
	AI_ANSWER_ENGINE: surfaceSpec.parse({
		surfaceId: "AI_ANSWER_ENGINE",
		family: "AI",
		captureMethods: ["PROVIDER_API", "VISITOR_SCRAPE"],
		featureFlag: "SELENA_MEASUREMENT_ENABLED",
		status: "MEASURED"
	}),
	GOOGLE_ASK_MAPS: surfaceSpec.parse({
		surfaceId: "GOOGLE_ASK_MAPS",
		family: "LOCAL",
		captureMethods: [LOCAL_AI_DISCOVERY_POLICY.captureMethod],
		featureFlag: "LOCAL_AI_DISCOVERY_ENABLED",
		status: "MEASURED"
	}),
	GOOGLE_MAPS_LOCAL_PACK: surfaceSpec.parse({
		surfaceId: "GOOGLE_MAPS_LOCAL_PACK",
		family: "LOCAL",
		captureMethods: ["PROVIDER_API", "MANUAL_OBSERVATION"],
		featureFlag: "SELENA_LOCAL_VISIBILITY_ENABLED",
		status: "ADD"
	}),
	GOOGLE_ORGANIC: surfaceSpec.parse({
		surfaceId: "GOOGLE_ORGANIC",
		family: "SEARCH",
		captureMethods: ["PROVIDER_API"],
		featureFlag: "SELENA_SEARCH_VISIBILITY_ENABLED",
		status: "ADD"
	}),
	GOOGLE_AI_OVERVIEWS: surfaceSpec.parse({
		surfaceId: "GOOGLE_AI_OVERVIEWS",
		family: "SEARCH",
		captureMethods: ["PROVIDER_API"],
		featureFlag: "SELENA_SEARCH_VISIBILITY_ENABLED",
		status: "ADD"
	}),
	REVIEW_PLATFORM: surfaceSpec.parse({
		surfaceId: "REVIEW_PLATFORM",
		family: "REPUTATION",
		captureMethods: ["PROVIDER_API", "MANUAL_OBSERVATION"],
		featureFlag: "SELENA_REPUTATION_ENABLED",
		status: "ADD"
	})
});
var readinessScoreSchema = strictObject({
	evidenceType: literal("READINESS_SNAPSHOT"),
	dimension: _enum([
		"ACCESS",
		"ENTITY",
		"PROPOSITION",
		"ACTION"
	]),
	score: number().min(0).max(100),
	evidenceIds: array(string().min(1)).min(1),
	measuredAt: datetime()
});
var surfaceVisibilitySchema = strictObject({
	evidenceType: literal("MEASUREMENT_OBSERVATION"),
	surfaceId: _enum(visibilitySurfaceIds),
	status: _enum([
		"MEASURED",
		"NOT_MEASURED",
		"UNKNOWN"
	]),
	metrics: record(string(), number().nullable()).nullable(),
	evidenceIds: array(string().min(1)),
	measuredAt: datetime().nullable()
}).superRefine((value, ctx) => {
	if (value.status === "MEASURED" && (value.metrics === null || value.evidenceIds.length === 0)) ctx.addIssue({
		code: "custom",
		message: "Measured visibility requires metrics and evidence"
	});
});
strictObject({
	readiness: array(readinessScoreSchema),
	surfaces: array(surfaceVisibilitySchema)
});
var LOCAL_GRID_FORMULA_VERSION = "sv-grid-sphere-v1";
var LOCAL_GRID_EARTH_RADIUS_METERS = 6371008.8;
var LOCAL_GRID_RADIUS_METERS = 3e3;
var UUID_URL_NAMESPACE_HEX = "6ba7b8119dad11d180b400c04fd430c8";
var sphericalGridSpecV1Schema = strictObject({
	formulaVersion: literal(LOCAL_GRID_FORMULA_VERSION),
	locationId: string().uuid(),
	centerLatitude: number().finite().min(-85).max(85),
	centerLongitude: number().finite().min(-180).max(180),
	radiusMeters: literal(LOCAL_GRID_RADIUS_METERS),
	size: union([literal(3), literal(5)])
});
var sphericalGridPointV1Schema = strictObject({
	id: string().uuid(),
	pointIndex: number().int().nonnegative(),
	row: number().int().nonnegative(),
	column: number().int().nonnegative(),
	latitude: string().regex(/^-?\d{1,2}\.\d{6}$/),
	longitude: string().regex(/^-?(?:\d{1,2}|1[0-7]\d|180)\.\d{6}$/),
	distanceMeters: number().finite().nonnegative(),
	bearingDegrees: number().finite().min(-180).lt(180),
	canonical: string().min(1)
});
var sphericalGridV1Schema = strictObject({
	formulaVersion: literal(LOCAL_GRID_FORMULA_VERSION),
	locationId: string().uuid(),
	centerLatitude: string().regex(/^-?\d{1,2}\.\d{6}$/),
	centerLongitude: string().regex(/^-?(?:\d{1,2}|1[0-7]\d|180)\.\d{6}$/).refine((value) => Number(value) >= -180 && Number(value) < 180, "GRID_LONGITUDE_NOT_CANONICAL"),
	radiusMeters: literal(LOCAL_GRID_RADIUS_METERS),
	size: union([literal(3), literal(5)]),
	spacingMeters: number().finite().positive(),
	points: array(sphericalGridPointV1Schema)
}).superRefine((grid, issues) => {
	let expected;
	try {
		expected = sphericalGridPointsV1({
			formulaVersion: grid.formulaVersion,
			locationId: grid.locationId,
			centerLatitude: Number(grid.centerLatitude),
			centerLongitude: Number(grid.centerLongitude),
			radiusMeters: grid.radiusMeters,
			size: grid.size
		});
	} catch {
		issues.addIssue({
			code: "custom",
			message: "GRID_CANONICAL_REGENERATION_FAILED"
		});
		return;
	}
	if (JSON.stringify(grid) !== JSON.stringify(expected)) issues.addIssue({
		code: "custom",
		message: "GRID_ORDERED_POINTS_NOT_CANONICAL"
	});
});
var degreesToRadians = (value) => value * Math.PI / 180;
var radiansToDegrees = (value) => value * 180 / Math.PI;
function normalizeLongitude(value) {
	const normalized = ((value + 180) % 360 + 360) % 360 - 180;
	return Object.is(normalized, -0) ? 0 : normalized;
}
function roundHalfUpCoordinate(value) {
	if (!Number.isFinite(value)) throw new Error("GRID_COORDINATE_NOT_FINITE");
	const negative = value < 0;
	const [coefficient, exponentText = "0"] = Math.abs(value).toString().split("e");
	const exponent = Number(exponentText);
	const [integerPart, fractionPart = ""] = coefficient.split(".");
	const digits = `${integerPart}${fractionPart}`;
	const decimalIndex = integerPart.length + exponent;
	const integer = decimalIndex <= 0 ? "0" : decimalIndex >= digits.length ? `${digits}${"0".repeat(decimalIndex - digits.length)}` : digits.slice(0, decimalIndex);
	const fraction = decimalIndex <= 0 ? `${"0".repeat(-decimalIndex)}${digits}` : decimalIndex >= digits.length ? "" : digits.slice(decimalIndex);
	const scale = BigInt(1e6);
	const micros = BigInt(integer || "0") * scale + BigInt((fraction.slice(0, 6) || "").padEnd(6, "0") || "0");
	const roundedMicros = (fraction[6] ?? "0") >= "5" ? micros + BigInt(1) : micros;
	const whole = roundedMicros / scale;
	const remainder = (roundedMicros % scale).toString().padStart(6, "0");
	const magnitude = `${whole.toString()}.${remainder}`;
	return negative && magnitude !== "0.000000" ? `-${magnitude}` : magnitude;
}
function canonicalLongitude(value) {
	const rounded = roundHalfUpCoordinate(normalizeLongitude(value));
	return rounded === "180.000000" ? "-180.000000" : rounded;
}
var rotateLeft = (value, bits) => (value << bits | value >>> 32 - bits) >>> 0;
function sha1Bytes(input) {
	const bitLength = input.length * 8;
	const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
	const padded = new Uint8Array(paddedLength);
	padded.set(input);
	padded[input.length] = 128;
	const view = new DataView(padded.buffer);
	view.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296), false);
	view.setUint32(paddedLength - 4, bitLength >>> 0, false);
	let h0 = 1732584193;
	let h1 = 4023233417;
	let h2 = 2562383102;
	let h3 = 271733878;
	let h4 = 3285377520;
	const words = /* @__PURE__ */ new Uint32Array(80);
	for (let offset = 0; offset < paddedLength; offset += 64) {
		for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
		for (let index = 16; index < 80; index += 1) words[index] = rotateLeft(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1);
		let a = h0;
		let b = h1;
		let c = h2;
		let d = h3;
		let e = h4;
		for (let index = 0; index < 80; index += 1) {
			let f;
			let k;
			if (index < 20) {
				f = b & c | ~b & d;
				k = 1518500249;
			} else if (index < 40) {
				f = b ^ c ^ d;
				k = 1859775393;
			} else if (index < 60) {
				f = b & c | b & d | c & d;
				k = 2400959708;
			} else {
				f = b ^ c ^ d;
				k = 3395469782;
			}
			const next = rotateLeft(a, 5) + f + e + k + words[index] >>> 0;
			e = d;
			d = c;
			c = rotateLeft(b, 30);
			b = a;
			a = next;
		}
		h0 = h0 + a >>> 0;
		h1 = h1 + b >>> 0;
		h2 = h2 + c >>> 0;
		h3 = h3 + d >>> 0;
		h4 = h4 + e >>> 0;
	}
	const digest = /* @__PURE__ */ new Uint8Array(20);
	const digestView = new DataView(digest.buffer);
	for (const [index, value] of [
		h0,
		h1,
		h2,
		h3,
		h4
	].entries()) digestView.setUint32(index * 4, value, false);
	return digest;
}
function uuidV5Url(canonical) {
	const namespaceBytes = UUID_URL_NAMESPACE_HEX.match(/../g);
	if (namespaceBytes === null) throw new Error("LOCAL_GRID_UUID_NAMESPACE_INVALID");
	const nameBytes = new TextEncoder().encode(canonical);
	const input = new Uint8Array(16 + nameBytes.length);
	input.set(namespaceBytes.map((value) => Number.parseInt(value, 16)));
	input.set(nameBytes, 16);
	const bytes = Array.from(sha1Bytes(input).slice(0, 16));
	bytes[6] = bytes[6] & 15 | 80;
	bytes[8] = bytes[8] & 63 | 128;
	const hex = bytes.map((value) => value.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function sphericalGridPointsV1(input) {
	if (Number.isFinite(input.centerLatitude) && Math.abs(input.centerLatitude) > 85) throw new Error("GRID_POLAR_REGION_UNSUPPORTED");
	const spec = sphericalGridSpecV1Schema.parse(input);
	const locationId = spec.locationId.toLowerCase();
	const centerLatitude = roundHalfUpCoordinate(spec.centerLatitude);
	const centerLongitude = canonicalLongitude(normalizeLongitude(spec.centerLongitude));
	const half = (spec.size - 1) / 2;
	const spacingMeters = spec.radiusMeters / (Math.SQRT2 * half);
	const latitude1 = degreesToRadians(Number(centerLatitude));
	const longitude1 = degreesToRadians(Number(centerLongitude));
	const points = [];
	const coordinateKeys = /* @__PURE__ */ new Set();
	for (let row = 0; row < spec.size; row += 1) for (let column = 0; column < spec.size; column += 1) {
		const north = (half - row) * spacingMeters;
		const east = (column - half) * spacingMeters;
		const distanceMeters = Math.hypot(north, east);
		const bearingRadians = Math.atan2(east, north);
		const angularDistance = distanceMeters / LOCAL_GRID_EARTH_RADIUS_METERS;
		const latitude2 = Math.asin(Math.sin(latitude1) * Math.cos(angularDistance) + Math.cos(latitude1) * Math.sin(angularDistance) * Math.cos(bearingRadians));
		const longitude2 = longitude1 + Math.atan2(Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitude1), Math.cos(angularDistance) - Math.sin(latitude1) * Math.sin(latitude2));
		const latitudeDegrees = radiansToDegrees(latitude2);
		if (Math.abs(latitudeDegrees) > 85) throw new Error("GRID_POLAR_REGION_UNSUPPORTED");
		const latitude = roundHalfUpCoordinate(latitudeDegrees);
		const longitude = canonicalLongitude(radiansToDegrees(longitude2));
		const coordinateKey = `${latitude}|${longitude}`;
		if (coordinateKeys.has(coordinateKey)) throw new Error("LOCAL_GRID_DUPLICATE_ROUNDED_COORDINATE");
		coordinateKeys.add(coordinateKey);
		const canonical = [
			spec.formulaVersion,
			locationId,
			centerLatitude,
			centerLongitude,
			String(spec.radiusMeters),
			String(spec.size),
			String(row),
			String(column),
			latitude,
			longitude
		].join("|");
		points.push({
			id: uuidV5Url(canonical),
			pointIndex: row * spec.size + column,
			row,
			column,
			latitude,
			longitude,
			distanceMeters,
			bearingDegrees: normalizeLongitude(radiansToDegrees(bearingRadians)),
			canonical
		});
	}
	return {
		formulaVersion: spec.formulaVersion,
		locationId,
		centerLatitude,
		centerLongitude,
		radiusMeters: spec.radiusMeters,
		size: spec.size,
		spacingMeters,
		points
	};
}
var usdAmountSchema$2 = string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);
var mapsTargetIdentitySchema = strictObject({
	placeId: string().trim().min(1).optional(),
	cid: string().trim().min(1).optional(),
	matchedName: string().trim().min(1).max(300).optional(),
	matchedAddress: string().trim().min(1).max(500).optional(),
	mapsUrl: url(),
	identitySource: _enum(["USER_CONFIRMED", "PROVIDER_EVIDENCE"]),
	matchPolicy: _enum(["PLACE_ID_OR_CID", "REVIEWED_NAME_ADDRESS_FALLBACK"]),
	matchStatus: _enum([
		"EXACT_ALIAS",
		"REVIEWED_MATCH",
		"UNRESOLVED"
	]).optional(),
	reviewed: boolean().optional()
}).superRefine((identity, context) => {
	if (identity.placeId !== void 0 || identity.cid !== void 0) {
		if (identity.matchPolicy !== "PLACE_ID_OR_CID") context.addIssue({
			code: "custom",
			message: "MAPS_PRIMARY_ID_FALLBACK_POLICY_CONFLICT",
			path: ["matchPolicy"]
		});
		return;
	}
	if (identity.matchPolicy !== "REVIEWED_NAME_ADDRESS_FALLBACK") context.addIssue({
		code: "custom",
		message: "MAPS_TARGET_IDENTITY_REQUIRED",
		path: ["matchPolicy"]
	});
	if (identity.matchedName === void 0 || identity.matchedAddress === void 0) context.addIssue({
		code: "custom",
		message: "MAPS_NAME_ADDRESS_FALLBACK_REQUIRED",
		path: ["matchedName"]
	});
	if (identity.matchStatus !== "REVIEWED_MATCH") context.addIssue({
		code: "custom",
		message: "MAPS_NAME_ADDRESS_MATCH_STATUS_REQUIRED",
		path: ["matchStatus"]
	});
	if (identity.reviewed !== true) context.addIssue({
		code: "custom",
		message: "MAPS_NAME_ADDRESS_REVIEW_REQUIRED",
		path: ["reviewed"]
	});
});
var mapsProviderLockSchema = strictObject({
	id: executionKeyPartSchema,
	endpoint: string().trim().min(1),
	version: string().trim().min(1),
	rankEvidenceSource: literal("MAPS_SERP_PROVIDER"),
	placesApiUsed: literal(false)
});
var mapsRequestLockSchema = strictObject({
	device: literal("MOBILE"),
	os: string().trim().min(1),
	language: string().trim().min(2).max(35),
	seDomain: string().trim().min(1),
	zoom: number().int().min(0).max(21),
	depth: literal(20),
	searchThisArea: literal(true)
});
var mapsLockV1Schema = strictObject({
	schemaVersion: literal(1),
	domainId: literal("LOCAL_MAPS"),
	pilot: strictObject({
		providerContractDigest: string().regex(/^sha256:[a-f0-9]{64}$/),
		billingUnit: string().trim().min(1),
		perAttemptWorstCaseUsd: usdAmountSchema$2,
		leaseDurationMs: number().int().positive(),
		commercialPriceUsd: literal("0.00"),
		commercialReason: literal("PILOT_NO_CHARGE")
	}).optional(),
	lockVersion: number().int().positive(),
	locationId: string().uuid(),
	targetIdentity: mapsTargetIdentitySchema,
	grid: sphericalGridV1Schema,
	keywordSet: strictObject({
		id: string().uuid(),
		version: number().int().positive(),
		keywordIds: array(string().uuid()).min(1),
		keywords: array(strictObject({
			id: string().uuid(),
			text: string().trim().min(1),
			language: string().trim().min(2).max(35)
		})).min(1).optional()
	}),
	provider: mapsProviderLockSchema,
	request: mapsRequestLockSchema,
	timestampWindow: strictObject({
		startsAt: datetime(),
		endsAt: datetime()
	}),
	repeats: number().int().positive(),
	expectedSlots: number().int().positive(),
	maxProviderAttempts: number().int().positive(),
	retryPolicy: strictObject({
		maxAttemptsPerSlot: literal(3),
		genericQueueRetryLimit: literal(0)
	}),
	budget: strictObject({
		currency: literal("USD"),
		surfaceCapUsd: usdAmountSchema$2,
		monthlyCapUsd: usdAmountSchema$2,
		worstCaseCostUsd: usdAmountSchema$2,
		priceSnapshotVersion: executionKeyPartSchema
	})
}).superRefine((lock, issues) => {
	if (lock.locationId !== lock.grid.locationId) issues.addIssue({
		code: "custom",
		message: "MAPS_LOCK_GRID_LOCATION_MISMATCH"
	});
	if (lock.grid.points.length !== lock.grid.size ** 2) issues.addIssue({
		code: "custom",
		message: "MAPS_LOCK_GRID_CARDINALITY_MISMATCH"
	});
	if (lock.keywordSet.keywords !== void 0) {
		const snapshots = lock.keywordSet.keywords;
		if (snapshots.length !== lock.keywordSet.keywordIds.length || new Set(snapshots.map((item) => item.id)).size !== snapshots.length || snapshots.some((item) => !lock.keywordSet.keywordIds.includes(item.id) || item.language !== lock.request.language)) issues.addIssue({
			code: "custom",
			message: "MAPS_LOCK_KEYWORD_SNAPSHOT_MISMATCH"
		});
	}
	const expectedSlots = lock.grid.points.length * lock.keywordSet.keywordIds.length * lock.repeats;
	if (lock.expectedSlots !== expectedSlots) issues.addIssue({
		code: "custom",
		message: "MAPS_LOCK_SLOT_CARDINALITY_MISMATCH"
	});
	if (lock.maxProviderAttempts !== maximumProviderAttempts(expectedSlots)) issues.addIssue({
		code: "custom",
		message: "MAPS_LOCK_ATTEMPT_CARDINALITY_MISMATCH"
	});
	if (new Set(lock.keywordSet.keywordIds).size !== lock.keywordSet.keywordIds.length) issues.addIssue({
		code: "custom",
		message: "MAPS_LOCK_KEYWORD_IDS_DUPLICATED"
	});
	const micros = (amount) => {
		const [whole, fraction = ""] = amount.split(".");
		return BigInt(whole) * BigInt(1e6) + BigInt(fraction.padEnd(6, "0"));
	};
	const worstCase = micros(lock.budget.worstCaseCostUsd);
	if (worstCase > micros(lock.budget.surfaceCapUsd) || worstCase > micros(lock.budget.monthlyCapUsd)) issues.addIssue({
		code: "custom",
		message: "MAPS_LOCK_WORST_CASE_EXCEEDS_CAP"
	});
	if (new Date(lock.timestampWindow.endsAt) <= new Date(lock.timestampWindow.startsAt)) issues.addIssue({
		code: "custom",
		message: "MAPS_LOCK_TIMESTAMP_WINDOW_INVALID"
	});
});
var mapsLockSlotPlanSchema = strictObject({
	domainId: literal("LOCAL_MAPS"),
	measurementCycleId: string().uuid(),
	locationId: string().uuid(),
	lockVersion: number().int().positive(),
	keywordSetId: string().uuid(),
	keywordSetVersion: number().int().positive(),
	pointId: string().uuid(),
	pointIndex: number().int().nonnegative(),
	latitude: sphericalGridPointV1Schema.shape.latitude,
	longitude: sphericalGridPointV1Schema.shape.longitude,
	keywordId: string().uuid(),
	providerId: executionKeyPartSchema,
	providerVersion: string().trim().min(1),
	repeatIndex: number().int().nonnegative(),
	baseSlotKey: string().min(1),
	attemptIndex: literal(1),
	executionKey: string().min(1)
});
/**
* Expands one frozen Maps Lock into first-attempt analytical slots only. It
* does not reserve attempts, enqueue work, touch a database or call a provider.
*/
function planMapsLockSlots(measurementCycleId, input) {
	const parsedMeasurementCycleId = string().uuid().parse(measurementCycleId);
	const lock = mapsLockV1Schema.parse(input);
	const slots = [];
	for (const point of lock.grid.points) for (const keywordId of lock.keywordSet.keywordIds) for (let repeatIndex = 0; repeatIndex < lock.repeats; repeatIndex += 1) {
		const baseSlotKey = localMapsBaseSlotKey({
			cycleId: parsedMeasurementCycleId,
			pointId: point.id,
			keywordId,
			providerId: lock.provider.id,
			repeatIndex
		});
		slots.push(mapsLockSlotPlanSchema.parse({
			domainId: "LOCAL_MAPS",
			measurementCycleId: parsedMeasurementCycleId,
			locationId: lock.locationId,
			lockVersion: lock.lockVersion,
			keywordSetId: lock.keywordSet.id,
			keywordSetVersion: lock.keywordSet.version,
			pointId: point.id,
			pointIndex: point.pointIndex,
			latitude: point.latitude,
			longitude: point.longitude,
			keywordId,
			providerId: lock.provider.id,
			providerVersion: lock.provider.version,
			repeatIndex,
			baseSlotKey,
			attemptIndex: 1,
			executionKey: measurementExecutionKey(baseSlotKey, 1)
		}));
	}
	if (slots.length !== lock.expectedSlots) throw new Error("MAPS_LOCK_PLANNED_SLOT_CARDINALITY_MISMATCH");
	if (new Set(slots.map((slot) => slot.executionKey)).size !== slots.length) throw new Error("MAPS_LOCK_PLANNED_SLOT_DUPLICATE");
	return slots;
}
var manualLocalAiLockV1Schema = strictObject({
	schemaVersion: literal(1),
	domainId: literal("LOCAL_AI"),
	executionMode: literal("MANUAL_ONLY"),
	automatedExecutionAllowed: literal(false),
	providerAttemptsAllowed: literal(0),
	discovery: localAiDiscoveryLockBlockSchema
}).superRefine((lock, issues) => {
	if (lock.discovery.externalCallsAllowed || lock.discovery.placesApiAllowed) issues.addIssue({
		code: "custom",
		message: "LOCAL_AI_AUTOMATION_BLOCKED"
	});
});
function readManualLocalAiLock(snapshot) {
	const record$1 = record(string(), unknown()).parse(snapshot);
	if (record$1.localAiLock !== void 0) return {
		source: "localAiLock",
		lock: manualLocalAiLockV1Schema.parse(record$1.localAiLock)
	};
	if (record$1.localAiDiscovery !== void 0) return {
		source: "localAiDiscovery",
		lock: {
			schemaVersion: 1,
			domainId: "LOCAL_AI",
			executionMode: "MANUAL_ONLY",
			automatedExecutionAllowed: false,
			providerAttemptsAllowed: 0,
			discovery: localAiDiscoveryLockBlockSchema.parse(record$1.localAiDiscovery)
		}
	};
	throw new Error("LOCAL_AI_LOCK_MISSING");
}
/**
* The source-only Local Maps export is intentionally a pure projection of the
* public read contract. It does not read a database, call a provider, resolve
* object storage, or create a REST response. The web read route pages the
* existing read API and passes the resulting rows here; runtime stores, signed
* evidence access, and provider execution remain separate gates from this pure
* projection.
*/
var LOCAL_MAPS_CSV_MAX_ROWS = 1e4;
var localMapsCsvColumns = [
	"cycle_id",
	"dataset_id",
	"surface",
	"collection_status",
	"observation_id",
	"grid_point_id",
	"point_index",
	"latitude",
	"longitude",
	"keyword_id",
	"keyword",
	"provider",
	"repeat_index",
	"status",
	"target_rank",
	"reason_code",
	"captured_at",
	"evidence_ids"
];
var localMapsCsvInputSchema = strictObject({
	cycleId: string().uuid(),
	datasetId: string().uuid().nullable(),
	surface: literal("LOCAL_MAPS"),
	status: _enum(localApiCollectionStatuses),
	items: array(localApiMapResultSchema).max(LOCAL_MAPS_CSV_MAX_ROWS)
}).superRefine((input, context) => {
	if (input.status === "NOT_INCLUDED" && (input.datasetId !== null || input.items.length !== 0)) context.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_CSV_NOT_INCLUDED_DATA_FORBIDDEN"
	});
	if ((input.status === "READY" || input.status === "PARTIAL") && input.datasetId === null) context.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_CSV_DATASET_REQUIRED"
	});
});
var privateReferencePattern = /^(?:https?|file|s3|gs|private):\/\//i;
function assertNoPrivateReferences(items) {
	if (items.some((item) => item.evidenceIds.some((evidenceId) => privateReferencePattern.test(evidenceId)))) throw new Error("LOCAL_MAPS_CSV_PRIVATE_REFERENCE_FORBIDDEN");
}
/**
* CSV uses an empty cell for a null value. Unknown outcomes remain explicit in
* the `status`, `collection_status`, and `reason_code` columns; this avoids
* turning an absent rank or timestamp into a measured value.
*/
function csvCell(value) {
	const text = Array.isArray(value) ? JSON.stringify(value) : value === null ? "" : String(value);
	return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}
function rowCells(input, item) {
	return [
		input.cycleId,
		input.datasetId,
		input.surface,
		input.status,
		item.observationId,
		item.gridPointId,
		item.pointIndex,
		item.latitude,
		item.longitude,
		item.keywordId,
		item.keyword,
		item.provider,
		item.repeatIndex,
		item.status,
		item.targetRank,
		item.reasonCode,
		item.capturedAt,
		item.evidenceIds
	];
}
/**
* Serialize a bounded Local Maps read-model collection in a stable, canonical
* column order. The caller owns pagination and must provide rows in the read
* API's stable order; this function never performs an unbounded read or sorts
* by data that is not part of the public contract.
*/
function serializeLocalMapsCsv(input) {
	const parsed = localMapsCsvInputSchema.parse(input);
	assertNoPrivateReferences(parsed.items);
	const lines = [localMapsCsvColumns.join(",")];
	for (const item of parsed.items) lines.push(rowCells(parsed, item).map(csvCell).join(","));
	return `${lines.join("\n")}\n`;
}
var sha256ReferenceSchema$1 = string().regex(/^sha256:[a-f0-9]{64}$/);
var noWhitespaceSchema = string().min(1).regex(/^\S+$/);
var attemptIndexSchema$1 = union([
	literal(1),
	literal(2),
	literal(3)
]);
var usdAmountSchema$1 = string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);
var liveProviderIdSchema = executionKeyPartSchema.refine((value) => !/^(?:stub|noop)(?:-|$)/i.test(value), "LOCAL_MAPS_LIVE_PROVIDER_RESERVED_ID");
var liveReferenceSchema = noWhitespaceSchema.refine((value) => !/^(?:stub-local-maps:|stub:)/i.test(value), "LOCAL_MAPS_LIVE_REFERENCE_RESERVED");
var LOCAL_MAPS_CANONICALIZATION_VERSION = "canonical-json-code-unit-v1";
function micros(amount) {
	const [whole, fraction = ""] = usdAmountSchema$1.parse(amount).split(".");
	return BigInt(whole) * BigInt(1e6) + BigInt(fraction.padEnd(6, "0"));
}
function canonicalLocalMapsJson(value) {
	if (Array.isArray(value)) return `[${value.map(canonicalLocalMapsJson).join(",")}]`;
	if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalLocalMapsJson(entry)}`).join(",")}}`;
	return JSON.stringify(value);
}
var localMapsLiveKeywordSchema = strictObject({
	id: string().uuid(),
	text: string().trim().min(1),
	keywordSetId: string().uuid(),
	keywordSetVersion: number().int().positive()
});
var localMapsMaterializedProviderRequestSchema = strictObject({
	schemaVersion: literal(1),
	provider: mapsProviderLockSchema.extend({ id: liveProviderIdSchema }),
	point: strictObject({
		id: string().uuid(),
		pointIndex: number().int().nonnegative(),
		latitude: mapsLockSlotPlanSchema.shape.latitude,
		longitude: mapsLockSlotPlanSchema.shape.longitude
	}),
	keyword: localMapsLiveKeywordSchema,
	targetIdentity: mapsTargetIdentitySchema,
	params: mapsRequestLockSchema,
	repeatIndex: number().int().nonnegative()
});
function canonicalLocalMapsLockSnapshot(lock) {
	return canonicalLocalMapsJson(mapsLockV1Schema.parse(lock));
}
function canonicalLocalMapsProviderRequest(request) {
	return canonicalLocalMapsJson(localMapsMaterializedProviderRequestSchema.parse(request));
}
strictObject({
	schemaVersion: literal(1),
	kind: literal("LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE"),
	mode: literal("LIVE_PROVIDER"),
	canonicalizationVersion: literal(LOCAL_MAPS_CANONICALIZATION_VERSION),
	scope: strictObject({
		organizationId: string().trim().min(1),
		measurementCycleId: string().uuid(),
		localCycleId: string().uuid(),
		configurationLockId: string().uuid(),
		domainId: literal("LOCAL_MAPS")
	}),
	lockSnapshotCanonical: string().min(1),
	requestSnapshotCanonical: string().min(1),
	lock: mapsLockV1Schema,
	slot: mapsLockSlotPlanSchema,
	keyword: localMapsLiveKeywordSchema,
	providerRequest: localMapsMaterializedProviderRequestSchema,
	attempt: strictObject({
		attemptId: string().uuid(),
		reservationId: string().uuid(),
		observationRef: noWhitespaceSchema,
		attemptIndex: attemptIndexSchema$1,
		baseSlotKey: string().min(1),
		executionKey: string().min(1),
		statusSnapshot: literal("SUBMITTED"),
		claimedAt: datetime(),
		submittedAt: datetime(),
		leaseExpiresAt: datetime()
	}),
	budgetReservation: strictObject({
		currency: literal("USD"),
		reservedCostUsd: usdAmountSchema$1,
		surfaceCapUsd: usdAmountSchema$1,
		monthlyCapUsd: usdAmountSchema$1,
		priceSnapshotVersion: executionKeyPartSchema
	})
}).superRefine((input, issues) => {
	const frozen = input.lock.keywordSet.keywords?.find((item) => item.id === input.keyword.id);
	if (input.lock.keywordSet.keywords !== void 0 && (!frozen || frozen.text !== input.keyword.text || frozen.language !== input.lock.request.language)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_FROZEN_KEYWORD_MISMATCH"
	});
	const expectedSlot = planMapsLockSlots(input.scope.measurementCycleId, input.lock).find((slot) => slot.executionKey === input.slot.executionKey);
	if (expectedSlot === void 0 || canonicalLocalMapsJson(expectedSlot) !== canonicalLocalMapsJson(input.slot)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_SLOT_LOCK_MISMATCH",
		path: ["slot"]
	});
	if (input.slot.measurementCycleId !== input.scope.measurementCycleId || input.keyword.id !== input.slot.keywordId || input.keyword.keywordSetId !== input.lock.keywordSet.id || input.keyword.keywordSetVersion !== input.lock.keywordSet.version) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_SCOPE_LOCK_MISMATCH"
	});
	if (input.attempt.baseSlotKey !== input.slot.baseSlotKey || input.attempt.executionKey !== measurementExecutionKey(input.slot.baseSlotKey, input.attempt.attemptIndex)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_ATTEMPT_KEY_MISMATCH",
		path: ["attempt"]
	});
	if (new Date(input.attempt.submittedAt) < new Date(input.attempt.claimedAt)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_SUBMISSION_TIME_INVALID",
		path: ["attempt"]
	});
	if (new Date(input.attempt.leaseExpiresAt) <= new Date(input.attempt.submittedAt)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_LEASE_TIME_INVALID",
		path: ["attempt"]
	});
	if (new Date(input.attempt.submittedAt) < new Date(input.lock.timestampWindow.startsAt) || new Date(input.attempt.submittedAt) >= new Date(input.lock.timestampWindow.endsAt)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_SUBMISSION_OUTSIDE_LOCK_WINDOW",
		path: ["attempt"]
	});
	if (liveProviderIdSchema.safeParse(input.lock.provider.id).success === false) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_PROVIDER_INVALID",
		path: [
			"lock",
			"provider",
			"id"
		]
	});
	if (input.budgetReservation.surfaceCapUsd !== input.lock.budget.surfaceCapUsd || input.budgetReservation.monthlyCapUsd !== input.lock.budget.monthlyCapUsd || input.budgetReservation.priceSnapshotVersion !== input.lock.budget.priceSnapshotVersion) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_BUDGET_LOCK_MISMATCH",
		path: ["budgetReservation"]
	});
	if (micros(input.budgetReservation.reservedCostUsd) > micros(input.budgetReservation.surfaceCapUsd) || micros(input.budgetReservation.reservedCostUsd) > micros(input.budgetReservation.monthlyCapUsd)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_RESERVATION_EXCEEDS_CAP",
		path: ["budgetReservation"]
	});
	const expectedRequest = localMapsMaterializedProviderRequestSchema.safeParse({
		schemaVersion: 1,
		provider: input.lock.provider,
		point: {
			id: input.slot.pointId,
			pointIndex: input.slot.pointIndex,
			latitude: input.slot.latitude,
			longitude: input.slot.longitude
		},
		keyword: input.keyword,
		targetIdentity: input.lock.targetIdentity,
		params: input.lock.request,
		repeatIndex: input.slot.repeatIndex
	});
	if (!expectedRequest.success || canonicalLocalMapsJson(expectedRequest.data) !== canonicalLocalMapsJson(input.providerRequest)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_PROVIDER_REQUEST_MISMATCH",
		path: ["providerRequest"]
	});
	if (input.lockSnapshotCanonical !== canonicalLocalMapsLockSnapshot(input.lock)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_LOCK_SNAPSHOT_MISMATCH",
		path: ["lockSnapshotCanonical"]
	});
	if (expectedRequest.success && input.requestSnapshotCanonical !== canonicalLocalMapsProviderRequest(expectedRequest.data)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_LIVE_REQUEST_SNAPSHOT_MISMATCH",
		path: ["requestSnapshotCanonical"]
	});
});
var localMapsLiveKnownCostSchema = strictObject({
	status: literal("KNOWN"),
	currency: literal("USD"),
	amountUsd: usdAmountSchema$1,
	basis: _enum(["actual", "estimated"])
});
var localMapsLiveUnknownCostSchema = strictObject({
	status: literal("UNKNOWN"),
	currency: literal("USD"),
	amountUsd: _null(),
	basis: _null()
});
var resultIdentity = {
	schemaVersion: literal(1),
	kind: literal("LOCAL_MAPS_LIVE_PROVIDER_RESULT"),
	mode: literal("LIVE_PROVIDER"),
	canonicalizationVersion: literal(LOCAL_MAPS_CANONICALIZATION_VERSION),
	storageClass: literal("LIVE_ATTEMPT"),
	organizationId: string().trim().min(1),
	measurementCycleId: string().uuid(),
	localCycleId: string().uuid(),
	configurationLockId: string().uuid(),
	attemptId: string().uuid(),
	reservationId: string().uuid(),
	executionKey: string().min(1),
	attemptIndex: attemptIndexSchema$1,
	lockSnapshotCanonical: string().min(1),
	requestSnapshotCanonical: string().min(1),
	provider: strictObject({
		id: liveProviderIdSchema,
		version: string().trim().min(1),
		providerTaskId: noWhitespaceSchema.nullable()
	}),
	externalProviderCalls: literal(1),
	completedAt: datetime()
};
var successProvenanceSchema = strictObject({
	evidenceKind: literal("MAPS_SERP_PROVIDER"),
	checkReference: liveReferenceSchema,
	rawResponseReference: liveReferenceSchema,
	rawResponseSha256: sha256ReferenceSchema$1,
	providerObservedAt: datetime()
});
var failureProvenanceSchema = strictObject({
	evidenceKind: literal("MAPS_SERP_PROVIDER"),
	checkReference: liveReferenceSchema.nullable().default(null),
	rawResponseReference: liveReferenceSchema.nullable(),
	rawResponseSha256: sha256ReferenceSchema$1.nullable(),
	providerObservedAt: datetime().nullable()
}).refine((value) => {
	const fields = [
		value.rawResponseReference,
		value.rawResponseSha256,
		value.providerObservedAt
	];
	return fields.every((field) => field === null) || fields.every((field) => field !== null);
}, "LOCAL_MAPS_LIVE_RAW_PROVENANCE_TRIPLE_INVALID");
union([
	strictObject({
		...resultIdentity,
		event: strictObject({ kind: literal("FOUND") }),
		targetRank: number().int().min(1).max(20),
		evidenceEligible: literal(true),
		provenance: successProvenanceSchema,
		cost: localMapsLiveKnownCostSchema
	}),
	strictObject({
		...resultIdentity,
		event: strictObject({ kind: literal("ABSENT_WITHIN_DEPTH") }),
		targetRank: _null(),
		evidenceEligible: literal(true),
		provenance: successProvenanceSchema,
		cost: localMapsLiveKnownCostSchema
	}),
	strictObject({
		...resultIdentity,
		event: strictObject({
			kind: literal("RETRYABLE_FAILURE"),
			reason: _enum(retryableAttemptReasons)
		}),
		targetRank: _null(),
		evidenceEligible: literal(false),
		provenance: failureProvenanceSchema,
		cost: localMapsLiveKnownCostSchema
	}),
	strictObject({
		...resultIdentity,
		event: strictObject({ kind: literal("PROVIDER_AUTH_FAILURE") }),
		targetRank: _null(),
		evidenceEligible: literal(false),
		provenance: failureProvenanceSchema,
		cost: localMapsLiveKnownCostSchema
	}),
	strictObject({
		...resultIdentity,
		event: strictObject({ kind: literal("OUTCOME_UNKNOWN") }),
		targetRank: _null(),
		evidenceEligible: literal(false),
		provenance: failureProvenanceSchema,
		cost: localMapsLiveUnknownCostSchema
	})
]);
var usdAmountSchema = string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);
var attemptIndexSchema = union([
	literal(1),
	literal(2),
	literal(3)
]);
strictObject({
	tasks: number().int().positive(),
	maxProviderAttempts: number().int().positive(),
	worstCaseCostUsd: usdAmountSchema,
	currency: literal("USD"),
	priceSnapshotVersion: executionKeyPartSchema
});
strictObject({
	organizationId: string().trim().min(1),
	attemptId: string().uuid(),
	reservationId: string().uuid(),
	executionKey: string().min(1),
	attemptIndex: attemptIndexSchema
});
/**
* A capability declaration is a requirement, not proof that a provider has
* met it. The live runner still validates the normalized result and the
* persisted store must prove the corresponding evidence and coordinate facts.
*/
var localMapsRankCapabilitySchema = strictObject({
	coordinateProof: literal("EXACT_REQUEST_ECHO_REQUIRED"),
	rawEvidenceReference: literal("REQUIRED"),
	supportsAbsentWithinDepth: literal(true),
	maxDepth: number().int().positive()
});
strictObject({
	pointId: string().uuid(),
	pointIndex: number().int().nonnegative(),
	latitude: string().trim().min(1),
	longitude: string().trim().min(1),
	keywordId: string().uuid(),
	keywordText: string().trim().min(1),
	request: mapsRequestLockSchema
});
var STUB_LOCAL_MAPS_ADAPTER_ID = "stub-local-maps-v1";
var sha256ReferenceSchema = string().regex(/^sha256:[a-f0-9]{64}$/);
var stubRawReferenceSchema = string().regex(/^stub-local-maps:sha256:[a-f0-9]{64}$/);
strictObject({
	requestSnapshotDigest: sha256ReferenceSchema,
	lock: mapsLockV1Schema,
	slot: mapsLockSlotPlanSchema,
	keyword: strictObject({
		id: string().uuid(),
		text: string().trim().min(1),
		keywordSetId: string().uuid(),
		keywordSetVersion: number().int().positive()
	})
}).superRefine((request, issues) => {
	const expected = planMapsLockSlots(request.slot.measurementCycleId, request.lock).find((slot) => slot.executionKey === request.slot.executionKey);
	if (expected === void 0 || JSON.stringify(expected) !== JSON.stringify(request.slot)) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_REHEARSAL_SLOT_LOCK_MISMATCH",
		path: ["slot"]
	});
	if (request.keyword.id !== request.slot.keywordId || request.keyword.keywordSetId !== request.lock.keywordSet.id || request.keyword.keywordSetVersion !== request.lock.keywordSet.version) issues.addIssue({
		code: "custom",
		message: "LOCAL_MAPS_REHEARSAL_KEYWORD_LOCK_MISMATCH",
		path: ["keyword"]
	});
});
var rehearsalResultCommon = {
	schemaVersion: literal(1),
	kind: literal("LOCAL_MAPS_REHEARSAL_RESULT"),
	mode: literal("SYNTHETIC_TEST_ONLY"),
	adapterId: literal(STUB_LOCAL_MAPS_ADAPTER_ID),
	simulatedProviderId: string().trim().min(1),
	executionKey: string().min(1),
	requestSnapshotDigest: sha256ReferenceSchema,
	requestCoordinate: strictObject({
		pointId: string().uuid(),
		latitude: sphericalGridPointV1Schema.shape.latitude,
		longitude: sphericalGridPointV1Schema.shape.longitude
	}),
	keywordId: string().uuid(),
	persistable: literal(false),
	evidenceEligible: literal(false),
	externalProviderCalls: literal(0),
	providerTaskId: _null(),
	costUsd: literal("0.000000"),
	rawReference: stubRawReferenceSchema
};
union([strictObject({
	...rehearsalResultCommon,
	event: strictObject({ kind: literal("FOUND") }),
	targetRank: number().int().min(1).max(20)
}), strictObject({
	...rehearsalResultCommon,
	event: strictObject({ kind: literal("ABSENT_WITHIN_DEPTH") }),
	targetRank: _null()
})]);
var uuid$2 = string().uuid();
/**
* Client-confirmed business-location inputs.  Coordinates and references are
* accepted as user evidence only; this contract never authorizes a provider
* lookup or silently normalizes an external place.
*/
var localBusinessLocationCreateRequestSchema = strictObject({
	entityId: uuid$2,
	displayName: string().trim().min(1).max(160),
	countryCode: string().regex(/^[A-Z]{2}$/),
	adminArea: string().trim().max(160).optional(),
	locality: string().trim().max(160).optional(),
	addressText: string().trim().max(500).optional(),
	timezone: string().trim().max(80).optional(),
	latitude: number().finite().min(-85).max(85).optional(),
	longitude: number().finite().min(-180).max(180).optional(),
	geoPrecision: _enum([
		"CITY",
		"ADDRESS",
		"COORDINATE",
		"UNKNOWN"
	]).default("UNKNOWN"),
	googleMapsUrlReference: url().optional(),
	googlePlaceIdReference: string().trim().min(1).max(300).optional(),
	referenceOrigin: _enum([
		"USER_PROVIDED",
		"PUBLIC_SITE",
		"ANALYST_ENTERED"
	]).default("USER_PROVIDED"),
	locationRole: _enum([
		"PRIMARY",
		"SECONDARY",
		"WITHIN"
	]).default("PRIMARY")
}).superRefine((input, context) => {
	const hasLatitude = input.latitude !== void 0;
	if (hasLatitude !== (input.longitude !== void 0)) context.addIssue({
		code: "custom",
		message: "LOCATION_COORDINATES_MUST_BE_PAIRED"
	});
	if (input.geoPrecision === "COORDINATE" && !hasLatitude) context.addIssue({
		code: "custom",
		message: "COORDINATE_PRECISION_REQUIRES_COORDINATES"
	});
});
/** Place identity is confirmed by the client and is never a rank observation. */
var localPlaceEntityConfirmRequestSchema = strictObject({
	placeId: string().trim().min(1).max(300).optional(),
	cid: string().trim().min(1).max(300).optional(),
	matchedName: string().trim().min(1).max(300).optional(),
	matchedAddress: string().trim().min(1).max(500).optional(),
	mapsUrl: url(),
	identitySource: _enum(["USER_CONFIRMED", "PROVIDER_EVIDENCE"]),
	matchPolicy: _enum(["PLACE_ID_OR_CID", "REVIEWED_NAME_ADDRESS_FALLBACK"]),
	matchStatus: _enum([
		"EXACT_ALIAS",
		"REVIEWED_MATCH",
		"UNRESOLVED"
	]).default("REVIEWED_MATCH"),
	reviewed: boolean().optional()
}).superRefine((input, context) => {
	if (input.placeId !== void 0 || input.cid !== void 0) {
		if (input.matchPolicy !== "PLACE_ID_OR_CID") context.addIssue({
			code: "custom",
			message: "MAPS_PRIMARY_ID_FALLBACK_POLICY_CONFLICT",
			path: ["matchPolicy"]
		});
		return;
	}
	if (input.matchPolicy !== "REVIEWED_NAME_ADDRESS_FALLBACK") context.addIssue({
		code: "custom",
		message: "MAPS_TARGET_IDENTITY_REQUIRED",
		path: ["matchPolicy"]
	});
	if (input.matchedName === void 0 || input.matchedAddress === void 0) context.addIssue({
		code: "custom",
		message: "MAPS_NAME_ADDRESS_FALLBACK_REQUIRED",
		path: ["matchedName"]
	});
	if (input.matchStatus !== "REVIEWED_MATCH") context.addIssue({
		code: "custom",
		message: "MAPS_NAME_ADDRESS_MATCH_STATUS_REQUIRED",
		path: ["matchStatus"]
	});
	if (input.reviewed !== true) context.addIssue({
		code: "custom",
		message: "MAPS_NAME_ADDRESS_REVIEW_REQUIRED",
		path: ["reviewed"]
	});
});
/** Immutable keyword-set version inputs; the adapter assigns the set version. */
var localKeywordSetCreateRequestSchema = strictObject({
	language: string().trim().min(2).max(35),
	keywords: array(strictObject({
		text: string().trim().min(1).max(240),
		intent: string().trim().min(1).max(120),
		branded: boolean()
	})).min(1).max(500)
});
var localBusinessLocationCreateResponseSchema = strictObject({
	locationId: uuid$2,
	projectId: uuid$2,
	status: literal("CREATED"),
	normalizedCoordinates: strictObject({
		latitude: number().finite().min(-85).max(85),
		longitude: number().finite().min(-180).max(180),
		precision: _enum([
			"CITY",
			"ADDRESS",
			"COORDINATE",
			"UNKNOWN"
		])
	})
});
var localPlaceEntityConfirmResponseSchema = strictObject({
	locationId: uuid$2,
	placeId: string().trim().min(1).max(300).optional(),
	cid: string().trim().min(1).max(300).optional(),
	matchedName: string().trim().min(1).max(300).optional(),
	matchedAddress: string().trim().min(1).max(500).optional(),
	mapsUrl: url(),
	matchStatus: _enum([
		"EXACT_ALIAS",
		"REVIEWED_MATCH",
		"UNRESOLVED"
	]),
	reviewed: boolean().optional()
}).superRefine((input, context) => {
	if (input.placeId !== void 0 || input.cid !== void 0) return;
	if (input.matchedName === void 0 || input.matchedAddress === void 0) context.addIssue({
		code: "custom",
		message: "MAPS_NAME_ADDRESS_FALLBACK_REQUIRED",
		path: ["matchedName"]
	});
	if (input.matchStatus !== "REVIEWED_MATCH") context.addIssue({
		code: "custom",
		message: "MAPS_NAME_ADDRESS_MATCH_STATUS_REQUIRED",
		path: ["matchStatus"]
	});
	if (input.reviewed !== true) context.addIssue({
		code: "custom",
		message: "MAPS_NAME_ADDRESS_REVIEW_REQUIRED",
		path: ["reviewed"]
	});
});
var localKeywordSetCreateResponseSchema = strictObject({
	locationId: uuid$2,
	keywordSetId: uuid$2,
	version: number().int().positive(),
	status: literal("CREATED")
});
var uuid$1 = string().uuid();
var decimalUsd = string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);
/**
* The local write API is deliberately lock-first.  A quote is calculated from
* an immutable configuration lock; the client cannot submit a second set of
* grid/provider values which would silently diverge from the later cycle.
*/
var localScanQuoteRequestSchema = strictObject({ configurationLockId: uuid$1 });
var localScanQuoteResponseSchema = strictObject({
	quoteId: uuid$1,
	locationId: uuid$1,
	configurationLockId: uuid$1,
	lockVersion: number().int().positive(),
	status: _enum(["ISSUED", "BUDGET_BLOCKED"]),
	surfaces: array(literal("LOCAL_MAPS")).min(1),
	maps: strictObject({
		points: number().int().positive(),
		keywords: number().int().positive(),
		repeats: number().int().positive(),
		captureDepth: number().int().positive(),
		tasks: number().int().positive(),
		maxProviderAttempts: number().int().positive()
	}),
	providerEnvelope: strictObject({
		id: string().min(1),
		endpoint: string().min(1),
		version: string().min(1),
		rankEvidenceSource: literal("MAPS_SERP_PROVIDER"),
		externalProviderCalls: literal(0)
	}),
	priceAmount: string().regex(/^(?:0|[1-9]\d*)(?:\.\d{2})$/),
	currency: literal("USD"),
	budget: strictObject({
		currency: literal("USD"),
		worstCaseCostUsd: decimalUsd,
		surfaceCapUsd: decimalUsd,
		monthlyCapUsd: decimalUsd,
		priceSnapshotVersion: string().min(1)
	}),
	caveats: array(string().min(1)),
	expiresAt: datetime()
}).superRefine(({ maps }, issues) => {
	const expectedTasks = maps.points * maps.keywords * maps.repeats;
	if (maps.tasks !== expectedTasks) issues.addIssue({
		code: "custom",
		path: ["maps", "tasks"],
		message: "LOCAL_QUOTE_TASK_CARDINALITY_MISMATCH"
	});
	if (maps.maxProviderAttempts !== maximumProviderAttempts(maps.tasks)) issues.addIssue({
		code: "custom",
		path: ["maps", "maxProviderAttempts"],
		message: "LOCAL_QUOTE_ATTEMPT_CARDINALITY_MISMATCH"
	});
});
var localScanCycleCreateRequestSchema = strictObject({
	quoteId: uuid$1,
	configurationLockId: uuid$1,
	gridDefinitionId: uuid$1
});
var localScanCycleCreateResponseSchema = strictObject({
	cycleId: uuid$1,
	measurementCycleId: uuid$1,
	locationId: uuid$1,
	projectId: uuid$1,
	configurationLockId: uuid$1,
	gridDefinitionId: uuid$1,
	status: literal("CREATED"),
	domainId: literal("LOCAL_MAPS"),
	expectedObservations: number().int().positive(),
	createdObservations: literal(0),
	providerCalls: literal(0),
	providerExecution: literal("MANUAL_ONLY_UNTIL_APPROVED"),
	createdAt: datetime()
});
var measurementScopeSchema = object({
	scenarios: array(string().uuid()).min(1),
	systems: array(object({
		systemId: string().min(1),
		channel: _enum(["VISITOR", "API"])
	})).min(1),
	repeats: number().int().min(1)
}).refine((scope) => new Set(scope.scenarios).size === scope.scenarios.length, "Scenarios must be unique").refine((scope) => new Set(scope.systems.map((system) => system.systemId)).size === scope.systems.length, "Systems must be unique");
function expectedRunsFromScope(scope) {
	return scope.scenarios.length * scope.systems.length * scope.repeats;
}
/**
* Reads the measurement scope block from a configuration-lock snapshot.
* Absence is a legal state (older locks predate the block) and returns null;
* a present but malformed block is corruption and throws.
*/
function parseMeasurementScope(snapshot) {
	if (typeof snapshot !== "object" || snapshot === null) return null;
	const block = snapshot.measurementScope;
	if (block === void 0 || block === null) return null;
	return measurementScopeSchema.parse(block);
}
/**
* Who a measurement looks for in an answer, frozen into the lock alongside the
* scope. Reading these from the live profile instead would let a report change
* under a customer who edited their competitor list afterwards — the lock is
* what the run was sold against, so it answers this too.
*/
var analysisSubjectSchema = object({
	name: string().min(1),
	aliases: array(string().min(1)).optional(),
	domain: string().min(1).optional()
});
var analysisSubjectsSchema = object({
	brand: analysisSubjectSchema,
	competitors: array(analysisSubjectSchema).default([])
});
/** Absent on locks written before subjects were frozen; malformed throws. */
function parseAnalysisSubjects(snapshot) {
	if (typeof snapshot !== "object" || snapshot === null) return null;
	const block = snapshot.analysisSubjects;
	if (block === void 0 || block === null) return null;
	return analysisSubjectsSchema.parse(block);
}
var outcomeSourceAccessClasses = ["CONNECTED", "UPLOADED"];
var outcomeScopeSchema = strictObject({
	organizationId: string().trim().min(1),
	projectId: string().uuid(),
	locationId: string().uuid()
});
outcomeScopeSchema.extend({
	id: string().uuid(),
	accessClass: _enum(outcomeSourceAccessClasses),
	sourceReference: string().trim().min(1),
	evidenceIds: array(string().trim().min(1)).min(1)
});
strictObject({
	metricKey: string().trim().min(1),
	version: number().int().positive(),
	unit: string().trim().min(1),
	aggregation: literal("SUM")
});
outcomeScopeSchema.extend({
	id: string().uuid(),
	sourceId: string().uuid(),
	sourceAccessClass: _enum(outcomeSourceAccessClasses),
	measurementCycleId: string().uuid(),
	datasetId: string().uuid(),
	metricKey: string().trim().min(1),
	metricVersion: number().int().positive(),
	value: number().finite().nullable(),
	periodStart: datetime(),
	periodEnd: datetime(),
	evidenceIds: array(string().trim().min(1)).min(1)
}).refine((value) => Date.parse(value.periodEnd) > Date.parse(value.periodStart), { message: "OUTCOME_PERIOD_INVALID" });
outcomeScopeSchema.extend({
	metricKey: string().trim().min(1),
	metricVersion: number().int().positive(),
	unit: string().trim().min(1),
	periodStart: datetime(),
	periodEnd: datetime(),
	value: number().finite().nullable(),
	evidenceIds: array(string().trim().min(1)).min(1)
}).refine((value) => Date.parse(value.periodEnd) > Date.parse(value.periodStart), { message: "OUTCOME_PERIOD_INVALID" });
outcomeScopeSchema.extend({
	signatureVersion: literal("outcome-export/1"),
	datasetId: string().uuid(),
	metricKey: string().trim().min(1),
	metricVersion: number().int().positive(),
	periodStart: datetime(),
	periodEnd: datetime(),
	observationIds: array(string().uuid()).min(1)
});
var accessClasses = [
	"PUBLIC",
	"CONNECTED",
	"UPLOADED"
];
var evidenceKinds = [
	"AI_RESPONSE",
	"WEBSITE",
	"SEARCH",
	"MAPS",
	"REVIEW",
	"SOCIAL",
	"UPLOADED"
];
var priorityLevels = [
	"NOW",
	"NEXT",
	"LATER"
];
var confidenceLevels = [
	"HIGH",
	"MEDIUM",
	"LOW",
	"UNKNOWN"
];
object({
	id: string().min(1),
	tenantId: string().min(1),
	snapshotId: string().min(1),
	kind: _enum(evidenceKinds),
	accessClass: _enum(accessClasses),
	sourceRef: string().min(1),
	capturedAt: string().min(1),
	subject: string().min(1),
	text: string(),
	metadata: record(string(), unknown()).default({})
});
object({
	id: string().min(1),
	tenantId: string().min(1),
	source: string().min(1),
	capturedAt: string().min(1),
	contentHash: string().min(1),
	metadata: record(string(), unknown()).default({})
});
object({
	id: string().min(1),
	tenantId: string().min(1),
	datasetId: string().min(1),
	evidenceIds: array(string().min(1)).min(1),
	snapshotIds: array(string().min(1)),
	rulepackVersion: string().min(1),
	createdAt: string().min(1),
	immutable: literal(true)
});
var findingSchema = object({
	id: string().min(1),
	tenantId: string().min(1),
	manifestId: string().min(1),
	category: string().min(1),
	statement: string().min(1),
	evidenceIds: array(string().min(1)).min(1),
	confidence: _enum(confidenceLevels),
	confidenceScore: number().min(0).max(1),
	severity: _enum([
		"CRITICAL",
		"HIGH",
		"MEDIUM",
		"LOW"
	]),
	unknown: boolean(),
	ruleId: string().min(1)
});
var recommendationSchema = object({
	id: string().min(1),
	tenantId: string().min(1),
	findingId: string().min(1),
	manifestId: string().min(1),
	title: string().min(1),
	action: string().min(1),
	rationale: string().min(1),
	evidenceIds: array(string().min(1)).min(1),
	priority: _enum(priorityLevels),
	effort: _enum([
		"S",
		"M",
		"L"
	]),
	confidence: _enum(confidenceLevels),
	blocked: boolean(),
	blockReason: string().optional()
});
var actionPlanTaskSchema = object({
	id: string().min(1),
	recommendationId: string().min(1),
	title: string().min(1),
	horizon: _enum([
		"0_30_DAYS",
		"31_90_DAYS",
		"90_PLUS_DAYS"
	]),
	owner: string().min(1),
	steps: array(string().min(1)).min(1),
	evidenceIds: array(string().min(1)).min(1),
	verificationPlan: array(string().min(1)).min(1)
});
var actionPlanSchema = object({
	tenantId: string().min(1),
	manifestId: string().min(1),
	findings: array(findingSchema),
	recommendations: array(recommendationSchema),
	tasks: array(actionPlanTaskSchema)
});
var forbiddenClaimPatterns = [
	/guarantee/i,
	/will rank/i,
	/guaranteed visibility/i,
	/increase sales/i,
	/increase revenue/i,
	/ensure recommendation/i
];
function containsForbiddenClaim(text) {
	return forbiddenClaimPatterns.some((pattern) => pattern.test(text));
}
function stableId(prefix, value) {
	let hash = 2166136261;
	for (const char of value) {
		hash ^= char.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return `${prefix}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
/**
* The staging verification simulation: a payment event that never charges, a
* subscription that never renews, a Telegram recipient bound by a single-use
* link, a sample report that is not a measurement, and one digest delivered
* under a bounded retry schedule.
*
* Everything in this module is pure. It holds no database handle, no queue
* client and no network transport, so the rules below can be exercised with an
* injected clock and can never, by construction, reach a paid provider. The
* effectful adapters live in `packages/lib` and `apps/web`; they import these
* decisions rather than restating them.
*
* Architecture v1.4 §11 keeps production Telegram delivery on HOLD. Nothing
* here lifts that: the guards below refuse to run outside a staging
* environment that has explicitly opted in, and every record they describe
* carries the four markers that make its test origin unmistakable.
*/
var SIMULATION_ENVIRONMENT = "staging";
var SIMULATION_MODE = "test";
var SIMULATION_SOURCE_STATUS = "sample";
/**
* The four markers every simulated record carries. They are asserted on write
* and re-asserted before delivery: a row that loses one of them is not
* deliverable, so a real measurement can never be mistaken for this fixture or
* ride its delivery path.
*/
var simulationMarkersSchema = strictObject({
	environment: literal(SIMULATION_ENVIRONMENT),
	mode: literal(SIMULATION_MODE),
	sourceStatus: literal(SIMULATION_SOURCE_STATUS),
	notAMeasurement: literal(true)
});
var SIMULATION_MARKERS = Object.freeze({
	environment: SIMULATION_ENVIRONMENT,
	mode: SIMULATION_MODE,
	sourceStatus: SIMULATION_SOURCE_STATUS,
	notAMeasurement: true
});
function assertSimulationMarkers(value) {
	if (!simulationMarkersSchema.safeParse(value).success) throw new Error("SELENA_SIMULATION_MARKERS_INVALID");
}
function simulationEnvironmentFromEnv(env) {
	const environmentName = (env.RAILWAY_ENVIRONMENT_NAME ?? env.ENVIRONMENT ?? "").trim().toLowerCase();
	return {
		enabled: env.SELENA_STAGING_SIMULATION_ENABLED === "true",
		environmentName
	};
}
function isSimulationEnvironment(environmentName) {
	return environmentName.trim().toLowerCase() === SIMULATION_ENVIRONMENT;
}
/**
* Admits only the named staging environment. Naming the one environment that
* may run this, rather than listing the ones that may not, is what makes the
* gate safe to carry forward: an environment nobody anticipated — a preview, a
* clone, a renamed production — is refused because it was never admitted,
* not because someone remembered to add its name to a list.
*
* An unnamed environment gets its own code, because "this deployment tells us
* nothing about where it runs" is an operator's misconfiguration to fix, while
* a named non-staging environment is a decision that stands.
*/
function assertSimulationAllowed(environment) {
	if (environment.environmentName.length === 0) throw new Error("SELENA_SIMULATION_ENVIRONMENT_UNKNOWN");
	if (!isSimulationEnvironment(environment.environmentName)) throw new Error("SELENA_SIMULATION_ENVIRONMENT_NOT_ALLOWED");
	if (!environment.enabled) throw new Error("SELENA_SIMULATION_DISABLED");
}
function hex(bytes) {
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
/**
* Compares two hex digests without leaking, through timing, how far the first
* difference is. The length is compared first because an attacker already
* knows the digest length of a published algorithm.
*/
function constantTimeEquals(left, right) {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
	return difference === 0;
}
async function signPayload(payload, secret) {
	if (!secret) throw new Error("SELENA_SIMULATION_SIGNING_SECRET_MISSING");
	const key = await globalThis.crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {
		name: "HMAC",
		hash: "SHA-256"
	}, false, ["sign"]);
	return hex(new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}
async function verifyPayloadSignature(payload, signature, secret) {
	if (!payload || !signature || !secret) return false;
	const presented = signature.startsWith("sha256=") ? signature.slice(7) : signature;
	return constantTimeEquals(await signPayload(payload, secret), presented.trim().toLowerCase());
}
async function sha256Hex(value) {
	return hex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
/**
* The value Telegram echoes back on every update.
*
* Telegram accepts only letters, digits, underscore and hyphen here and
* rejects the whole registration otherwise — a rule an operator choosing a
* secret has no reason to know. Hashing the configured secret satisfies it
* whatever they typed, and has the better property that the secret itself
* never leaves the deployment holding it: what travels to Telegram is a
* derived value, domain-separated so it cannot double as a plain digest of
* the secret in another context.
*/
async function telegramWebhookHeaderToken(secret) {
	if (!secret) throw new Error("SELENA_TELEGRAM_WEBHOOK_SECRET_MISSING");
	return sha256Hex(`selena-telegram-webhook ${secret}`);
}
/**
* The plan identifiers a payment event may name, mapped to the catalog. The
* short names are what a payment provider's metadata would realistically
* carry; the catalog id is what the subscription stores.
*/
var SIMULATED_PLAN_IDS = {
	landscape: "full-ai-landscape",
	"visitor-local": "visitor-local",
	local: "visitor-local",
	"full-ai-landscape": "full-ai-landscape"
};
/** The price each plan must present, in whole US dollars. */
var SIMULATED_PLAN_PRICES = Object.freeze({
	"visitor-local": 49,
	"full-ai-landscape": 79
});
var simulatedPaymentEventSchema = strictObject({
	event_id: string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/, "SELENA_SIMULATION_EVENT_ID_INVALID"),
	event_type: literal("payment_succeeded"),
	environment: literal(SIMULATION_ENVIRONMENT),
	mode: literal(SIMULATION_MODE),
	customer_id: string().trim().min(1).max(160),
	project_id: string().trim().min(1).max(160),
	plan: _enum(Object.keys(SIMULATED_PLAN_IDS)),
	amount: number().int().nonnegative().max(1e5),
	currency: literal("USD"),
	occurred_at: datetime()
});
function parseSimulatedPaymentEvent(value) {
	const parsed = simulatedPaymentEventSchema.safeParse(value);
	if (!parsed.success) throw new Error("SELENA_SIMULATION_EVENT_INVALID");
	const planId = SIMULATED_PLAN_IDS[parsed.data.plan];
	if (parsed.data.amount !== SIMULATED_PLAN_PRICES[planId]) throw new Error("SELENA_SIMULATION_EVENT_AMOUNT_MISMATCH");
	return parsed.data;
}
var SIMULATION_PAYMENT_PROVIDER = "staging-simulator";
function subscriptionActivationFromEvent(event) {
	return {
		provider: SIMULATION_PAYMENT_PROVIDER,
		providerEventId: event.event_id,
		customerId: event.customer_id,
		projectRef: event.project_id,
		planId: SIMULATED_PLAN_IDS[event.plan],
		amountUsd: event.amount,
		currency: event.currency,
		occurredAt: event.occurred_at,
		markers: SIMULATION_MARKERS
	};
}
function resolveSubscriptionActivation(intent, existing) {
	if (!existing) return { kind: "ACTIVATE" };
	return existing.providerEventId === intent.providerEventId && existing.planId === intent.planId && existing.projectRef === intent.projectRef ? {
		kind: "REPLAY",
		subscriptionId: existing.subscriptionId
	} : {
		kind: "CONFLICT",
		code: "SELENA_SIMULATION_EVENT_REUSED"
	};
}
var CONNECT_TOKEN_VERSION = "v1";
var claimsSchema = strictObject({
	tenantId: string().trim().min(1).max(160),
	userId: string().trim().min(1).max(160),
	projectId: string().trim().min(1).max(160),
	environment: literal(SIMULATION_ENVIRONMENT),
	nonce: string().trim().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/),
	issuedAtMs: number().int().positive(),
	expiresAtMs: number().int().positive()
});
function base64UrlEncode(value) {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function base64UrlDecode(value) {
	const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
	const binary = atob(padded);
	const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}
function buildConnectTokenClaims(input) {
	const issuedAtMs = input.now.getTime();
	const claims = {
		tenantId: input.tenantId,
		userId: input.userId,
		projectId: input.projectId,
		environment: SIMULATION_ENVIRONMENT,
		nonce: input.nonce,
		issuedAtMs,
		expiresAtMs: issuedAtMs + (input.ttlMs ?? 9e5)
	};
	if (!claimsSchema.safeParse(claims).success) throw new Error("SELENA_CONNECT_TOKEN_CLAIMS_INVALID");
	return claims;
}
/** `v1.<base64url(claims)>.<hmac>` — the signature covers version and claims together. */
async function signConnectToken(claims, secret) {
	const body = `${CONNECT_TOKEN_VERSION}.${base64UrlEncode(JSON.stringify(claims))}`;
	return `${body}.${await signPayload(body, secret)}`;
}
/**
* Verifies signature first, then expiry. A tampered token is reported as a bad
* signature even when its edited claims have also expired, because the
* signature is the only field an attacker cannot choose.
*/
async function verifyConnectToken(token, secret, now) {
	const parts = token.split(".");
	if (parts.length !== 3 || parts[0] !== CONNECT_TOKEN_VERSION) return {
		ok: false,
		code: "SELENA_CONNECT_TOKEN_MALFORMED"
	};
	if (!await verifyPayloadSignature(`${parts[0]}.${parts[1]}`, parts[2], secret)) return {
		ok: false,
		code: "SELENA_CONNECT_TOKEN_SIGNATURE_INVALID"
	};
	let decoded;
	try {
		decoded = JSON.parse(base64UrlDecode(parts[1]));
	} catch {
		return {
			ok: false,
			code: "SELENA_CONNECT_TOKEN_MALFORMED"
		};
	}
	const parsed = claimsSchema.safeParse(decoded);
	if (!parsed.success) return {
		ok: false,
		code: parsed.error.issues.some((issue) => issue.path[0] === "environment") ? "SELENA_CONNECT_TOKEN_ENVIRONMENT_MISMATCH" : "SELENA_CONNECT_TOKEN_MALFORMED"
	};
	if (parsed.data.expiresAtMs <= now.getTime()) return {
		ok: false,
		code: "SELENA_CONNECT_TOKEN_EXPIRED"
	};
	return {
		ok: true,
		claims: parsed.data
	};
}
/**
* The single-use rule. A token that has already bound a recipient is refused
* rather than re-bound, and a token presented for a project other than the one
* it was issued for is refused even when its signature is valid — the
* signature proves who minted it, not what it may do.
*/
function resolveConnectRedemption(claims, stored, now) {
	if (!stored) return {
		kind: "REFUSE",
		code: "SELENA_CONNECT_TOKEN_UNKNOWN"
	};
	if (stored.tenantId !== claims.tenantId || stored.projectId !== claims.projectId || stored.userId !== claims.userId) return {
		kind: "REFUSE",
		code: "SELENA_CONNECT_TOKEN_PROJECT_MISMATCH"
	};
	if (stored.consumedAt !== null) return {
		kind: "REFUSE",
		code: "SELENA_CONNECT_TOKEN_ALREADY_USED"
	};
	if (stored.expiresAt.getTime() <= now.getTime()) return {
		kind: "REFUSE",
		code: "SELENA_CONNECT_TOKEN_EXPIRED"
	};
	return { kind: "BIND" };
}
/** Telegram deep link for a bot, carrying the connect token as its start payload. */
function telegramDeepLink(botUsername, token) {
	const username = botUsername.trim().replace(/^@/, "");
	if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) throw new Error("SELENA_TELEGRAM_BOT_USERNAME_INVALID");
	return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}
var SAMPLE_ACTION_STATUSES = [
	"NEW",
	"STILL_OPEN",
	"NEEDS_RECHECK",
	"VERIFIED",
	"CLOSED"
];
/**
* One row of the sample report's action plan. Delivery status is deliberately
* absent: a digest is delivered once per report, so recording a delivery state
* per action would describe something the system never does.
*/
var sampleActionSchema = strictObject({
	id: string().trim().min(1).max(64),
	action: string().trim().min(1).max(400),
	owner: string().trim().min(1).max(160),
	status: _enum(SAMPLE_ACTION_STATUSES),
	evidenceIds: array(string().regex(/^EV-[A-Z0-9-]{3,32}$/)).min(1),
	recheckMethod: string().trim().min(1).max(400),
	before: string().trim().min(1).max(400),
	after: string().trim().min(1).max(400)
});
var sampleWeeklyReportSchema = strictObject({
	schemaVersion: literal(1),
	title: literal("TEST / SAMPLE DATA"),
	notice: literal("Not a measurement"),
	markers: simulationMarkersSchema,
	projectRef: string().trim().min(1).max(160),
	projectName: string().trim().min(1).max(160),
	periodStart: datetime(),
	periodEnd: datetime(),
	visibilitySummary: string().trim().min(1).max(400),
	recheckStatus: string().trim().min(1).max(200),
	actions: array(sampleActionSchema).min(1).max(50),
	providerCalls: literal(0)
});
function parseSampleWeeklyReport(value) {
	const parsed = sampleWeeklyReportSchema.safeParse(value);
	if (!parsed.success) throw new Error("SELENA_SAMPLE_REPORT_INVALID");
	return parsed.data;
}
/**
* Builds the fixture. It reads nothing: no provider, no measurement table, no
* clock beyond the period it is told to cover. Every action status appears at
* least once so the digest counts below are exercised by real rows rather than
* by a hand-written number.
*/
function buildSampleWeeklyReport(input) {
	return parseSampleWeeklyReport({
		schemaVersion: 1,
		title: "TEST / SAMPLE DATA",
		notice: "Not a measurement",
		markers: SIMULATION_MARKERS,
		projectRef: input.projectRef,
		projectName: input.projectName,
		periodStart: input.periodStart.toISOString(),
		periodEnd: input.periodEnd.toISOString(),
		visibilitySummary: "Sample: brand named in 6 of 25 sample answers, against 3 of 25 in the previous sample cycle",
		recheckStatus: "Recheck planned for the next comparable sample cycle under the same fixture lock",
		providerCalls: 0,
		actions: [
			{
				id: "ACT-SIM-01",
				action: "Publish one canonical service description on the homepage and About page",
				owner: "Test project owner",
				status: "VERIFIED",
				evidenceIds: ["EV-SIM-0412", "EV-SIM-0507"],
				recheckMethod: "Re-crawl of the same 3 sample pages, then the same 25 sample questions under fixture lock v1",
				before: "Sample: description differed on 2 of 3 pages",
				after: "Sample: one description on 3 of 3 pages"
			},
			{
				id: "ACT-SIM-02",
				action: "State the booking inputs before the flow starts",
				owner: "Test project developer",
				status: "NEEDS_RECHECK",
				evidenceIds: ["EV-SIM-0431"],
				recheckMethod: "Action-path check of the sample booking page in the next sample cycle",
				before: "Sample: required inputs not stated",
				after: "Sample: change recorded, not yet observed in a sample cycle"
			},
			{
				id: "ACT-SIM-03",
				action: "Publish a direct-answer FAQ page linked from the homepage",
				owner: "Test project owner",
				status: "STILL_OPEN",
				evidenceIds: ["EV-SIM-0407"],
				recheckMethod: "Same 25 sample questions under fixture lock v1, owned-page citations counted per system",
				before: "Sample: 0 of 25 sample answers cite an owned page",
				after: "Sample: not started, carried over from the previous digest"
			},
			{
				id: "ACT-SIM-04",
				action: "Remove the robots rule that blocked the rooms section",
				owner: "Test project developer",
				status: "CLOSED",
				evidenceIds: ["EV-SIM-0402", "EV-SIM-0501"],
				recheckMethod: "Sample robots file fetched again and the 4 sample room pages re-crawled",
				before: "Sample: 0 of 4 sample room pages fetchable",
				after: "Sample: 4 of 4 sample room pages fetched"
			},
			{
				id: "ACT-SIM-05",
				action: "Decide how to answer the two sample questions where a competitor is cited instead",
				owner: "Test project owner",
				status: "NEW",
				evidenceIds: ["EV-SIM-0519"],
				recheckMethod: "Same 2 sample questions under fixture lock v1 in the next sample cycle",
				before: "Sample: competitor cited in 5 of 12 sample answers to these questions",
				after: "Sample: created and assigned in this cycle, first recheck next cycle"
			}
		]
	});
}
function countActionsByStatus(report) {
	const counts = Object.fromEntries(SAMPLE_ACTION_STATUSES.map((status) => [status, 0]));
	for (const action of report.actions) counts[action.status] += 1;
	return counts;
}
/**
* The short digest. Telegram receives a summary and a link into the workspace,
* never the report itself: the report is the authenticated surface, and a chat
* message is not an access-controlled one.
*/
function buildDigestMessage(input) {
	const counts = countActionsByStatus(input.report);
	const opened = counts.NEW;
	const closed = counts.VERIFIED + counts.CLOSED;
	const period = `${input.report.periodStart.slice(0, 10)} — ${input.report.periodEnd.slice(0, 10)}`;
	return [
		"[TEST] Selena weekly digest — sample data, not a measurement",
		"",
		`Project: ${input.report.projectName} (${input.report.projectRef})`,
		`Period: ${period}`,
		`Visibility: ${input.report.visibilitySummary}`,
		`Actions: ${opened} new, ${closed} closed, ${counts.NEEDS_RECHECK} awaiting recheck`,
		`Recheck: ${input.report.recheckStatus}`,
		"",
		`Open the saved sample report: ${input.workspaceUrl}`,
		"",
		"[TEST] Staging simulation. No measurement ran and no payment was taken."
	].join("\n");
}
function assertDigestIsShort(message) {
	if (message.length > 3500) throw new Error("SELENA_DIGEST_TOO_LONG");
	if (!message.includes("[TEST]")) throw new Error("SELENA_DIGEST_TEST_MARKER_MISSING");
}
/**
* The waits between attempts, in order. There are four because the first send
* is itself attempt one: five attempts in total leave exactly four retries.
*/
var DELIVERY_RETRY_DELAYS_MS = Object.freeze([
	6e4,
	3e5,
	18e5,
	72e5
]);
/**
* How Telegram's answer is read. 403 and "chat not found" mean the recipient
* can no longer be reached at all, so the binding is dropped and retrying
* would only repeat a refusal; everything else is treated as temporary,
* because a send that failed for an unknown reason may still succeed later.
*/
function classifyTelegramResponse(input) {
	if (input.ok && input.httpStatus >= 200 && input.httpStatus < 300) return { kind: "SUCCESS" };
	const description = (input.description ?? "").toLowerCase();
	if (input.httpStatus === 403 || description.includes("chat not found") || description.includes("bot was blocked")) return {
		kind: "RECIPIENT_GONE",
		detail: input.description ?? `http_${input.httpStatus}`
	};
	return {
		kind: "TEMPORARY_FAILURE",
		detail: input.description ?? `http_${input.httpStatus}`
	};
}
/**
* What to do after one attempt. `attempt` is the number of the attempt that
* just ran, so the cap is reached when it equals the maximum: there is no
* delay left to schedule and delivery stops.
*/
function decideNextDelivery(input) {
	if (input.attempt < 1 || input.attempt > 5) throw new Error("SELENA_DELIVERY_ATTEMPT_OUT_OF_RANGE");
	if (input.outcome.kind === "SUCCESS") return { kind: "DELIVERED" };
	if (input.outcome.kind === "RECIPIENT_GONE") return {
		kind: "STOP",
		status: "UNBOUND",
		reason: input.outcome.detail
	};
	if (input.attempt >= 5) return {
		kind: "STOP",
		status: "FAILED",
		reason: "SELENA_DELIVERY_ATTEMPTS_EXHAUSTED"
	};
	const delay = DELIVERY_RETRY_DELAYS_MS[input.attempt - 1];
	if (delay === void 0) throw new Error("SELENA_DELIVERY_SCHEDULE_EXHAUSTED");
	return {
		kind: "RETRY",
		attempt: input.attempt + 1,
		nextAttemptAt: new Date(input.now.getTime() + delay)
	};
}
function resolveDeliveryPrecondition(input) {
	if (!input.reportPersisted) return {
		kind: "REFUSE",
		code: "SELENA_DELIVERY_REPORT_NOT_PERSISTED"
	};
	if (input.deliveryStatus === "DELIVERED") return {
		kind: "REFUSE",
		code: "SELENA_DELIVERY_ALREADY_DELIVERED"
	};
	if (input.deliveryStatus === "SENDING") {
		if (!(input.claimedAt !== null && input.now.getTime() - input.claimedAt.getTime() >= 3e4)) return {
			kind: "REFUSE",
			code: "SELENA_DELIVERY_IN_FLIGHT"
		};
	}
	if (input.deliveryStatus === "UNBOUND" || input.recipientStatus !== "BOUND") return {
		kind: "REFUSE",
		code: "SELENA_DELIVERY_RECIPIENT_UNBOUND"
	};
	if (input.deliveryStatus === "FAILED" || input.attemptsMade >= 5) return {
		kind: "REFUSE",
		code: "SELENA_DELIVERY_ATTEMPTS_EXHAUSTED"
	};
	if (input.nextAttemptAt !== null && input.nextAttemptAt.getTime() > input.now.getTime()) return {
		kind: "REFUSE",
		code: "SELENA_DELIVERY_NOT_DUE"
	};
	return {
		kind: "SEND",
		attempt: input.attemptsMade + 1
	};
}
/**
* Fields that may never reach an audit row. The audit trail is read by people
* and shipped in evidence bundles, so the check is a denylist applied to the
* details object rather than a convention about what callers should pass.
*/
var FORBIDDEN_AUDIT_KEYS = [
	"token",
	"bottoken",
	"bot_token",
	"secret",
	"signature",
	"chatid",
	"chat_id",
	"connecttoken",
	"connect_token",
	"authorization",
	"password"
];
function assertAuditDetailsSafe(details) {
	for (const key of Object.keys(details)) {
		const normalised = key.toLowerCase().replaceAll("-", "");
		if (FORBIDDEN_AUDIT_KEYS.includes(normalised)) throw new Error(`SELENA_AUDIT_SECRET_LEAK:${key}`);
	}
}
function buildAuditRecord(input) {
	const details = input.details ?? {};
	assertAuditDetailsSafe(details);
	if (!/^[A-Za-z0-9_-]{8,64}$/.test(input.correlationId)) throw new Error("SELENA_AUDIT_CORRELATION_ID_INVALID");
	return {
		event: input.event,
		correlationId: input.correlationId,
		projectRef: input.projectRef,
		environment: SIMULATION_ENVIRONMENT,
		at: input.now.toISOString(),
		details
	};
}
var SIMULATION_RECEIPT = Object.freeze({
	providerCalls: 0,
	realPayments: 0,
	environment: SIMULATION_ENVIRONMENT,
	mode: SIMULATION_MODE
});
/**
* How far from now a bootstrap request may claim to have been issued. The
* window is what turns a captured signature from a permanent credential into
* one that is worthless within minutes; the nonce is what stops it being used
* even once more inside the window. Both are needed: a window alone allows a
* replay in the seconds after capture, and a nonce alone would leave a ledger
* that has to be kept forever.
*/
var BOOTSTRAP_FRESHNESS_MS = 12e4;
var bootstrapRequestSchema = strictObject({
	purpose: literal("staging-verification-simulation"),
	nonce: string().regex(/^[a-f0-9]{32,128}$/),
	issued_at: datetime()
});
function parseBootstrapRequest(value) {
	const parsed = bootstrapRequestSchema.safeParse(value);
	if (!parsed.success) throw new Error("SELENA_BOOTSTRAP_REQUEST_INVALID");
	return parsed.data;
}
/** Rejects a request signed too long ago, and one dated too far ahead to be a
* clock that merely drifted. */
function assertBootstrapFresh(request, now) {
	if (Math.abs(now.getTime() - new Date(request.issued_at).getTime()) > 12e4) throw new Error("SELENA_BOOTSTRAP_REQUEST_STALE");
}
Object.freeze({
	MAPS: {
		source: "LOCAL_RANK_OBSERVATION",
		spatialAnchor: "GRID_POINT"
	},
	AI_LOCAL_INTENT: {
		source: "MANUAL_LOCAL_OBSERVATION",
		spatialAnchor: "LOCATION"
	},
	COMPETITORS: {
		source: "LOCAL_COMPETITOR_OBSERVATION",
		spatialAnchor: "GRID_POINT"
	},
	REVIEWS: {
		source: "REVIEW_SNAPSHOT",
		spatialAnchor: "LOCATION"
	},
	CHANGES: {
		source: "CHANGE_EVENT",
		spatialAnchor: "LOCATION"
	},
	BEFORE_AFTER: {
		source: "LOCAL_RANK_OBSERVATION_PAIR",
		spatialAnchor: "GRID_POINT"
	}
});
var visibilityMapPointStatuses = [
	"MEASURED",
	"MISSING",
	"INVALID",
	"UNKNOWN"
];
Object.freeze({
	MEASURED: {
		shape: "CIRCLE",
		pattern: "SOLID"
	},
	MISSING: {
		shape: "SQUARE",
		pattern: "DIAGONAL"
	},
	INVALID: {
		shape: "TRIANGLE",
		pattern: "CROSSHATCH"
	},
	UNKNOWN: {
		shape: "DIAMOND",
		pattern: "DOTTED"
	}
});
var visibilityMapMaterializationSchema = discriminatedUnion("kind", [strictObject({
	kind: literal("LIVE_VIEW"),
	refreshedAt: _null(),
	isStale: literal(false)
}), strictObject({
	kind: literal("MATERIALIZED"),
	refreshedAt: datetime(),
	isStale: boolean()
})]);
var uuid = string().uuid();
var uniqueNonEmptyStrings = array(string().trim().min(1)).min(1).refine((values) => new Set(values).size === values.length, "Values must be unique");
var uniqueUuids = array(uuid).min(1).refine((values) => new Set(values).size === values.length, "UUIDs must be unique");
strictObject({
	organizationId: string().trim().min(1),
	projectId: uuid,
	locationId: uuid,
	datasetId: uuid,
	measurementCycleId: uuid,
	localCycleId: uuid,
	gridDefinitionId: uuid,
	gridDefinitionVersion: number().int().positive(),
	gridPointId: uuid,
	pointIndex: number().int().nonnegative(),
	latitude: number().finite().min(-90).max(90),
	longitude: number().finite().min(-180).max(180),
	observationId: uuid,
	capturedAt: datetime(),
	provider: string().trim().min(1),
	keywordId: uuid,
	keyword: string().trim().min(1),
	locale: string().trim().min(1),
	deviceContext: string().trim().min(1),
	formulaVersion: string().trim().min(1),
	repeatIndex: number().int().nonnegative(),
	sourceValidity: _enum([
		"VALID",
		"INVALID",
		"UNMEASURED"
	]),
	invalidReason: string().trim().min(1).nullable(),
	targetRank: number().int().positive().nullable(),
	displayStatus: _enum(visibilityMapPointStatuses),
	interpolated: literal(false),
	materialization: visibilityMapMaterializationSchema
}).superRefine((point, context) => {
	const expected = visibilityMapPointStatus(point);
	if (point.displayStatus !== expected) context.addIssue({
		code: "custom",
		message: "VISIBILITY_MAP_STATUS_MISMATCH",
		path: ["displayStatus"]
	});
	if (point.sourceValidity === "VALID" && point.invalidReason !== null) context.addIssue({
		code: "custom",
		message: "VISIBILITY_MAP_VALID_REASON_FORBIDDEN",
		path: ["invalidReason"]
	});
	if (point.sourceValidity !== "VALID" && point.invalidReason === null) context.addIssue({
		code: "custom",
		message: "VISIBILITY_MAP_INVALID_REASON_REQUIRED",
		path: ["invalidReason"]
	});
});
function visibilityMapPointStatus(input) {
	if (input.sourceValidity === "INVALID") return "INVALID";
	if (input.sourceValidity === "UNMEASURED") return "UNKNOWN";
	return input.targetRank === null ? "MISSING" : "MEASURED";
}
strictObject({
	organizationId: string().trim().min(1),
	projectId: uuid,
	locationId: uuid,
	datasetId: uuid,
	measurementCycleId: uuid,
	localCycleId: uuid,
	periodStart: datetime(),
	periodEnd: datetime(),
	keywordIds: uniqueUuids,
	gridDefinitionId: uuid,
	gridDefinitionVersion: number().int().positive(),
	providers: uniqueNonEmptyStrings,
	locales: uniqueNonEmptyStrings,
	deviceContexts: uniqueNonEmptyStrings,
	formulaVersions: uniqueNonEmptyStrings,
	datasetStatus: string().trim().min(1),
	observationCount: number().int().positive(),
	materialization: visibilityMapMaterializationSchema
}).refine((dataset) => Date.parse(dataset.periodEnd) >= Date.parse(dataset.periodStart), {
	message: "VISIBILITY_MAP_PERIOD_INVALID",
	path: ["periodEnd"]
});
var localPilotCycleStatuses = [
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
	"FAILED"
];
var localPilotExecutionModes = [
	"LEGACY_SOURCE_ONLY",
	"CANARY",
	"PILOT"
];
var localPilotObservationOutcomes = [
	"PENDING",
	"FOUND",
	"ABSENT_WITHIN_DEPTH",
	"INVALID",
	"UNKNOWN",
	"BLOCKED",
	"CANCELLED"
];
_enum(localPilotCycleStatuses);
_enum(localPilotExecutionModes);
var sha256 = string().regex(/^sha256:[a-f0-9]{64}$/);
var usd = string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);
var localProviderContractSchema = strictObject({
	schemaVersion: literal(1),
	provider: mapsProviderLockSchema,
	capability: localMapsRankCapabilitySchema,
	requestProtocol: mapsRequestLockSchema.extend({
		os: literal("android"),
		zoom: literal(13)
	}),
	price: strictObject({
		billingUnit: string().trim().min(1),
		currency: literal("USD"),
		perAttemptWorstCaseUsd: usd,
		priceSnapshotVersion: string().trim().min(1)
	})
});
function localProviderContractDigest(value) {
	return `sha256:${createHash("sha256").update(canonicalLocalMapsJson(localProviderContractSchema.parse(value))).digest("hex")}`;
}
strictObject({
	id: string().uuid(),
	outcome: _enum(localPilotObservationOutcomes),
	validity: _enum([
		"VALID",
		"INVALID",
		"UNMEASURED"
	]).nullable(),
	targetRank: number().int().min(1).max(20).nullable(),
	capturedAt: datetime().nullable(),
	reason: string().trim().min(1).nullable(),
	evidenceId: string().uuid().nullable()
}).superRefine((row, context) => {
	let valid;
	switch (row.outcome) {
		case "PENDING":
			valid = row.validity === null && row.targetRank === null && row.capturedAt === null && row.reason === null && row.evidenceId === null;
			break;
		case "FOUND":
		case "ABSENT_WITHIN_DEPTH":
			valid = row.validity === "VALID" && row.capturedAt !== null && row.reason === null && row.evidenceId !== null && (row.outcome === "FOUND" ? row.targetRank !== null : row.targetRank === null);
			break;
		case "INVALID":
			valid = row.validity === "INVALID" && row.targetRank === null && row.capturedAt !== null && row.reason !== null;
			break;
		case "UNKNOWN":
			valid = row.validity === "UNMEASURED" && row.targetRank === null && row.capturedAt !== null && row.reason !== null;
			break;
		case "BLOCKED":
		case "CANCELLED": valid = row.validity === "UNMEASURED" && row.targetRank === null && row.capturedAt === null && row.evidenceId === null && (row.outcome === "CANCELLED" ? row.reason === "LOCAL_STOPPED" : row.reason !== null);
	}
	if (!valid) context.addIssue({
		code: "custom",
		message: "LOCAL_OBSERVATION_STATE_INVALID"
	});
});
strictObject({
	schemaVersion: literal(1),
	canonicalizationVersion: literal("canonical-json-code-unit-v1"),
	storageClass: _enum(["CANARY_ONLY", "PILOT"]),
	organizationId: string().trim().min(1),
	measurementCycleId: string().uuid(),
	localCycleId: string().uuid(),
	observationId: string().uuid(),
	attemptId: string().uuid(),
	configurationLockId: string().uuid(),
	providerContractDigest: sha256,
	providerTaskId: string().trim().min(1),
	keyword: strictObject({
		id: string().uuid(),
		text: string().trim().min(1),
		language: string().trim().min(2)
	}),
	point: strictObject({
		id: string().uuid(),
		latitude: number().min(-90).max(90),
		longitude: number().min(-180).max(180)
	}),
	depth: literal(20),
	outcome: _enum(["FOUND", "ABSENT_WITHIN_DEPTH"]),
	targetRank: number().int().min(1).max(20).nullable(),
	capturedAt: datetime(),
	rawReference: string().trim().min(1),
	rawSha256: sha256,
	actualCostUsd: usd
}).refine((row) => row.outcome === "FOUND" ? row.targetRank !== null : row.targetRank === null, "LOCAL_EVIDENCE_RANK_INVALID");
var systemChannels = ["VISITOR", "API"];
object({
	orderId: string().uuid(),
	scenarioId: string().uuid(),
	systemId: string().min(1),
	channel: _enum(systemChannels),
	repeatIndex: number().int().nonnegative(),
	configurationVersion: number().int().positive()
});
function dispatchKey(input) {
	return [
		input.orderId,
		input.scenarioId,
		input.systemId,
		input.repeatIndex,
		input.configurationVersion
	].join(":");
}
function assertCardinality(createdRuns, expectedRuns) {
	if (!Number.isInteger(createdRuns) || !Number.isInteger(expectedRuns) || expectedRuns < 0 || createdRuns < 0) throw new Error("CARDINALITY_INVALID");
	if (createdRuns >= expectedRuns) throw new Error("CARDINALITY_BLOCKED");
}
object({
	orderId: string().uuid(),
	ok: boolean(),
	checks: array(object({
		code: string(),
		ok: boolean(),
		details: record(string(), unknown()).optional()
	})),
	expectedRuns: number().int().nonnegative(),
	worstCaseCost: object({
		amount: number().nonnegative(),
		currency: string().length(3),
		basis: _enum(["estimated", "actual"])
	})
});
var projectCreateSchema = object({
	name: string().trim().min(1).max(160),
	category: string().trim().min(1).max(120),
	country: string().trim().min(2).max(2),
	region: string().trim().max(160).optional(),
	languages: array(string().regex(/^[a-z]{2}(-[A-Z]{2})?$/)).min(1).max(10)
});
object({
	approvedScenarioIds: array(string().uuid()).default([]),
	rejectedScenarioIds: array(string().uuid()).default([])
}).refine((value) => !value.approvedScenarioIds.some((id) => value.rejectedScenarioIds.includes(id)), "Scenario cannot be approved and rejected");
var quoteCreateSchema = object({
	scenarioIds: array(string().uuid()).min(1),
	systems: array(object({
		id: string().min(1),
		channel: _enum(systemChannels)
	})).min(1),
	repeats: number().int().min(1).max(100)
});
function expectedRuns(input) {
	return input.scenarioIds.length * input.systems.length * input.repeats;
}
var quotePricingSchema = object({
	baseAmount: number().nonnegative(),
	perRunAmount: number().nonnegative(),
	qcAmount: number().nonnegative(),
	marginRate: number().min(0).max(10),
	currency: string().length(3)
});
function calculateQuote(input, pricing) {
	const runs = expectedRuns(input);
	const subtotal = pricing.baseAmount + runs * pricing.perRunAmount + pricing.qcAmount;
	return {
		expectedRuns: runs,
		amount: Number((subtotal * (1 + pricing.marginRate)).toFixed(2)),
		currency: pricing.currency
	};
}
//#endregion
export { localBusinessLocationCreateResponseSchema as $, containsForbiddenClaim as A, quoteCreateSchema as At, localAiTaskContextHash as B, signConnectToken as Bt, buildConnectTokenClaims as C, parseBootstrapRequest as Ct, canonicalLocalMapsJson as D, planIds as Dt, calculateQuote as E, parseSimulatedPaymentEvent as Et, expectedObservations as F, resolveExplicitPosition as Ft, localApiErrorEnvelopeSchema as G, subscriptionActivationFromEvent as Gt, localAiTaskContextSnapshotSchema as H, sphericalGridPointsV1 as Ht, expectedRunsFromScope as I, resolveSubscriptionActivation as It, localApiIdempotencyRecordSchema as J, verifyConnectToken as Jt, localApiEvidenceResponseSchema as K, telegramDeepLink as Kt, horecaLocalFirstReadModelSchema as L, runOutcomeSchema as Lt, customerVisibleHorecaModules as M, readManualLocalAiLock as Mt, decideNextDelivery as N, resolveConnectRedemption as Nt, classifyTelegramResponse as O, planMapsLockSlots as Ot, dispatchKey as P, resolveDeliveryPrecondition as Pt, localBusinessLocationCreateRequestSchema as Q, isAffirmativeEnvValue as R, serializeLocalMapsCsv as Rt, buildAuditRecord as S, parseAnalysisSubjects as St, buildSampleWeeklyReport as T, parseSampleWeeklyReport as Tt, localApiAiResultsResponseSchema as U, sphericalGridV1Schema as Ut, localAiTaskContextIdentityKey as V, simulationEnvironmentFromEnv as Vt, localApiCursorPayloadSchema as W, stableId as Wt, localApiProgressResponseSchema as X, visitorSurfaces as Xt, localApiMapResultsResponseSchema as Y, verifyPayloadSignature as Yt, localApiScopeSchema as Z, assertObservationCardinality as _, monthlyAnswerAllowance as _t, SELENA_CHECKOUT_METADATA as a, localPlaceEntityConfirmRequestSchema as at, assertSimulationAllowed as b, observerContextFromTaskSnapshot as bt, actionPlanSchema as c, localProviderContractSchema as ct, assertBootstrapFresh as d, localScanQuoteRequestSchema as dt, localDiscoveryConfigFromEnv as et, assertCardinality as f, localScanQuoteResponseSchema as ft, assertMentionMatch as g, measurementScopeSchema as gt, assertManualPilotAllowed as h, measurementConfigFromEnv as ht, SELENA_CATALOG_VERSION as i, localPilotCycleStatuses as it, contextHash as j, quotePricingSchema as jt, constantTimeEquals as k, projectCreateSchema as kt, analysisSubjectsSchema as l, localScanCycleCreateRequestSchema as lt, assertExpertVerified as m, maximumProviderAttempts as mt, PROVIDER_CANARY_SCOPE as n, localKeywordSetCreateResponseSchema as nt, SIMULATION_MARKERS as o, localPlaceEntityConfirmResponseSchema as ot, assertDigestIsShort as p, mapsLockV1Schema as pt, localApiIdempotencyIdentitySchema as q, telegramWebhookHeaderToken as qt, SELENA_CATALOG as r, localMapsMaterializedProviderRequestSchema as rt, SIMULATION_RECEIPT as s, localProviderContractDigest as st, BOOTSTRAP_FRESHNESS_MS as t, localKeywordSetCreateRequestSchema as tt, apiModelIds as u, localScanCycleCreateResponseSchema as ut, assertObservationMatchesLockedTask as v, observationEvidenceAssetsAreDistinct as vt, buildDigestMessage as w, parseMeasurementScope as wt, assertSimulationMarkers as x, orderingStates as xt, assertObservationSubmission as y, observationReviewDecisions as yt, localAiDiscoveryLockBlockSchema as z, sha256Hex as zt };

//# sourceMappingURL=src-BdeAuGX5.mjs.map