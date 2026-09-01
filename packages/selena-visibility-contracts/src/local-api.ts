import { z } from "zod";

export const localApiScopes = ["local:read", "local:write", "local:execute", "evidence:read"] as const;
export const localApiScopeSchema = z.enum(localApiScopes);
export type LocalApiScope = z.infer<typeof localApiScopeSchema>;

// Provider permissions intentionally live outside the client/local scope
// union.  A canary is an owner-gated capability, never an ordinary local read
// or write permission.
export const providerApiScopes = ["provider:canary"] as const;
export const providerApiScopeSchema = z.enum(providerApiScopes);
export type ProviderApiScope = z.infer<typeof providerApiScopeSchema>;
export const PROVIDER_CANARY_SCOPE: ProviderApiScope = "provider:canary";

export const LOCAL_API_DEFAULT_LIMIT = 50 as const;
export const LOCAL_API_MAX_LIMIT = 200 as const;
export const LOCAL_API_EVIDENCE_TTL_SECONDS = 600 as const;

export const localApiErrorEnvelopeSchema = z.strictObject({
	error: z.strictObject({
		code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
		message: z.string().trim().min(1).max(500),
		requestId: z.string().trim().min(1).max(128),
		retryable: z.boolean(),
		details: z.record(z.string(), z.unknown()).optional(),
	}),
});
export type LocalApiErrorEnvelope = z.infer<typeof localApiErrorEnvelopeSchema>;

export const localApiCursorResources = ["map-results", "ai-results", "evidence"] as const;
export const localApiCursorResourceSchema = z.enum(localApiCursorResources);
export type LocalApiCursorResource = z.infer<typeof localApiCursorResourceSchema>;

export const localApiCursorPayloadSchema = z.strictObject({
	version: z.literal(1),
	tenantId: z.string().trim().min(1).max(160),
	cycleId: z.string().uuid(),
	resource: localApiCursorResourceSchema,
	snapshotVersion: z.iso.datetime(),
	position: z.strictObject({
		sortValue: z.iso.datetime(),
		tieBreakerId: z.string().uuid(),
	}),
});
export type LocalApiCursorPayload = z.infer<typeof localApiCursorPayloadSchema>;
export type LocalApiCursorBinding = Pick<LocalApiCursorPayload, "tenantId" | "cycleId" | "resource">;

export const localApiPageSchema = z.strictObject({
	limit: z.number().int().min(1).max(LOCAL_API_MAX_LIMIT),
	nextCursor: z.string().min(1).nullable(),
});
export type LocalApiPage = z.infer<typeof localApiPageSchema>;

export const localApiTruthStatuses = ["VALID", "INVALID", "UNKNOWN", "BLOCKED"] as const;
export const localApiTruthStatusSchema = z.enum(localApiTruthStatuses);
export type LocalApiTruthStatus = z.infer<typeof localApiTruthStatusSchema>;

const countSchema = z.number().int().nonnegative();
export const localApiProgressCountsSchema = z
	.strictObject({
		expected: countSchema,
		pending: countSchema,
		valid: countSchema,
		invalid: countSchema,
		unknown: countSchema,
		blocked: countSchema,
	})
	.refine(
		(counts) => counts.pending + counts.valid + counts.invalid + counts.unknown + counts.blocked === counts.expected,
		{ message: "LOCAL_API_PROGRESS_COUNTS_MISMATCH" },
	);
export type LocalApiProgressCounts = z.infer<typeof localApiProgressCountsSchema>;

export const localApiSurfaceProgressStatuses = [
	"NOT_INCLUDED",
	"NOT_STARTED",
	"RUNNING",
	"PARTIAL",
	"COMPLETED",
	"BLOCKED",
	"UNKNOWN",
] as const;

const localApiSurfaceProgressSchema = z
	.strictObject({
		status: z.enum(localApiSurfaceProgressStatuses),
		counts: localApiProgressCountsSchema,
	})
	.superRefine((surface, context) => {
		if (surface.status === "NOT_INCLUDED" && surface.counts.expected !== 0) {
			context.addIssue({ code: "custom", message: "LOCAL_API_NOT_INCLUDED_COUNTS_INVALID", path: ["counts"] });
		}
		if (surface.status === "NOT_STARTED" && surface.counts.pending !== surface.counts.expected) {
			context.addIssue({ code: "custom", message: "LOCAL_API_NOT_STARTED_COUNTS_INVALID", path: ["counts"] });
		}
		if (
			surface.status === "COMPLETED" &&
			(surface.counts.pending !== 0 ||
				surface.counts.invalid !== 0 ||
				surface.counts.unknown !== 0 ||
				surface.counts.blocked !== 0)
		) {
			context.addIssue({ code: "custom", message: "LOCAL_API_COMPLETED_COUNTS_INVALID", path: ["counts"] });
		}
		if (surface.status === "BLOCKED" && surface.counts.blocked === 0) {
			context.addIssue({ code: "custom", message: "LOCAL_API_BLOCKED_COUNTS_REQUIRED", path: ["counts"] });
		}
		if (surface.status === "UNKNOWN" && surface.counts.unknown === 0) {
			context.addIssue({ code: "custom", message: "LOCAL_API_UNKNOWN_COUNTS_REQUIRED", path: ["counts"] });
		}
	});

export const localApiCycleProgressStatuses = [
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
	"UNKNOWN",
] as const;

export const localApiProgressResponseSchema = z.strictObject({
	cycleId: z.string().uuid(),
	status: z.enum(localApiCycleProgressStatuses),
	maps: localApiSurfaceProgressSchema.extend({
		surface: z.literal("LOCAL_MAPS"),
	}),
	localAi: localApiSurfaceProgressSchema.extend({
		surface: z.literal("LOCAL_AI"),
		executionMode: z.literal("MANUAL_ONLY"),
		automationAllowed: z.literal(false),
	}),
	updatedAt: z.iso.datetime(),
});
export type LocalApiProgressResponse = z.infer<typeof localApiProgressResponseSchema>;

export const localApiMapResultStatuses = ["FOUND", "ABSENT_WITHIN_DEPTH", "INVALID", "UNKNOWN", "BLOCKED"] as const;

export const localApiMapResultSchema = z
	.strictObject({
		observationId: z.string().uuid().nullable(),
		gridPointId: z.string().uuid(),
		pointIndex: z.number().int().nonnegative(),
		latitude: z.number().finite().min(-90).max(90),
		longitude: z.number().finite().min(-180).max(180),
		keywordId: z.string().uuid(),
		keyword: z.string().trim().min(1),
		provider: z.string().trim().min(1),
		repeatIndex: z.number().int().nonnegative(),
		status: z.enum(localApiMapResultStatuses),
		targetRank: z.number().int().positive().nullable(),
		reasonCode: z.string().trim().min(1).nullable(),
		capturedAt: z.iso.datetime().nullable(),
		evidenceIds: z.array(z.string().trim().min(1)),
	})
	.superRefine((result, context) => {
		const measured = result.status === "FOUND" || result.status === "ABSENT_WITHIN_DEPTH";
		if (result.status === "FOUND" && result.targetRank === null) {
			context.addIssue({ code: "custom", message: "LOCAL_API_FOUND_RANK_REQUIRED", path: ["targetRank"] });
		}
		if (result.status !== "FOUND" && result.targetRank !== null) {
			context.addIssue({ code: "custom", message: "LOCAL_API_UNMEASURED_RANK_FORBIDDEN", path: ["targetRank"] });
		}
		if (measured && (result.observationId === null || result.capturedAt === null)) {
			context.addIssue({ code: "custom", message: "LOCAL_API_MEASUREMENT_PROVENANCE_REQUIRED" });
		}
		if (measured && result.evidenceIds.length === 0) {
			context.addIssue({ code: "custom", message: "LOCAL_API_MEASUREMENT_EVIDENCE_REQUIRED", path: ["evidenceIds"] });
		}
		if (measured && result.reasonCode !== null) {
			context.addIssue({ code: "custom", message: "LOCAL_API_MEASUREMENT_REASON_FORBIDDEN", path: ["reasonCode"] });
		}
		if (!measured && result.reasonCode === null) {
			context.addIssue({ code: "custom", message: "LOCAL_API_UNRESOLVED_REASON_REQUIRED", path: ["reasonCode"] });
		}
	});
export type LocalApiMapResult = z.infer<typeof localApiMapResultSchema>;

export const localApiCollectionStatuses = ["NOT_INCLUDED", "READY", "PARTIAL", "UNKNOWN", "BLOCKED"] as const;
export const localApiMapResultsResponseSchema = z
	.strictObject({
		cycleId: z.string().uuid(),
		datasetId: z.string().uuid().nullable(),
		surface: z.literal("LOCAL_MAPS"),
		status: z.enum(localApiCollectionStatuses),
		items: z.array(localApiMapResultSchema),
		page: localApiPageSchema,
	})
	.superRefine((response, context) => {
		if (response.status === "NOT_INCLUDED" && (response.datasetId !== null || response.items.length !== 0)) {
			context.addIssue({ code: "custom", message: "LOCAL_API_NOT_INCLUDED_MAPS_DATA_FORBIDDEN" });
		}
		if ((response.status === "READY" || response.status === "PARTIAL") && response.datasetId === null) {
			context.addIssue({ code: "custom", message: "LOCAL_API_MAPS_DATASET_REQUIRED", path: ["datasetId"] });
		}
	});
export type LocalApiMapResultsResponse = z.infer<typeof localApiMapResultsResponseSchema>;

export const localApiManualTaskStatuses = [
	"PENDING_CAPTURE",
	"AWAITING_MANUAL_CAPTURE",
	"SUBMITTED_FOR_REVIEW",
	"ACCEPTED",
	"REJECTED",
	"NEEDS_CORRECTION",
	"INSUFFICIENT_EVIDENCE",
	"SURFACE_UNAVAILABLE",
] as const;

const localApiInvalidTaskStatuses = ["REJECTED", "NEEDS_CORRECTION", "INSUFFICIENT_EVIDENCE"] as const;

export const localApiAiResultSchema = z
	.strictObject({
		captureTaskId: z.string().uuid(),
		localAiRunId: z.string().uuid(),
		scanCycleId: z.string().uuid(),
		pointId: z.string().uuid().nullable(),
		latitude: z.number().finite().min(-90).max(90).nullable(),
		longitude: z.number().finite().min(-180).max(180).nullable(),
		coordinateProofReference: z.string().trim().min(1).nullable(),
		observationId: z.string().uuid().nullable(),
		scenarioId: z.string().uuid(),
		promptId: z.string().uuid(),
		promptText: z.string().trim().min(1).nullable(),
		system: z.string().trim().min(1).nullable(),
		measurementSurface: z.literal("GOOGLE_ASK_MAPS"),
		modelOrEnvironment: z.string().trim().min(1).nullable(),
		webSearchState: z.string().trim().min(1).nullable(),
		personalizationMode: z.string().trim().min(1).nullable(),
		accountMode: z.string().trim().min(1).nullable(),
		language: z.string().trim().min(2).nullable(),
		contextHash: z.string().trim().min(1),
		repeatIndex: z.number().int().nonnegative(),
		taskStatus: z.enum(localApiManualTaskStatuses),
		validity: z.enum(["VALID", "INVALID", "UNMEASURED"]).nullable(),
		rawResponseReference: z.null(),
		targetMention: z.boolean().nullable(),
		recommendationPosition: z.number().int().positive().nullable(),
		citations: z.array(z.unknown()),
		competitors: z.array(z.unknown()),
		costEventId: z.string().uuid().nullable(),
		resultStatus: localApiTruthStatusSchema,
		reasonCode: z.string().trim().min(1).nullable(),
		capturedAt: z.iso.datetime().nullable(),
		evidenceIds: z.array(z.string().trim().min(1)),
	})
	.superRefine((result, context) => {
		if (result.resultStatus === "VALID") {
			if (result.taskStatus !== "ACCEPTED" || result.validity !== "VALID") {
				context.addIssue({ code: "custom", message: "LOCAL_API_AI_VALID_STATE_MISMATCH" });
			}
			if (result.observationId === null || result.capturedAt === null || result.evidenceIds.length === 0) {
				context.addIssue({ code: "custom", message: "LOCAL_API_AI_VALID_EVIDENCE_REQUIRED" });
			}
			if (result.reasonCode !== null) {
				context.addIssue({ code: "custom", message: "LOCAL_API_AI_VALID_REASON_FORBIDDEN", path: ["reasonCode"] });
			}
		} else if (result.resultStatus === "INVALID") {
			if (
				!localApiInvalidTaskStatuses.includes(result.taskStatus as (typeof localApiInvalidTaskStatuses)[number]) ||
				result.validity !== "INVALID"
			) {
				context.addIssue({ code: "custom", message: "LOCAL_API_AI_INVALID_STATE_MISMATCH" });
			}
			if (result.reasonCode === null) {
				context.addIssue({ code: "custom", message: "LOCAL_API_AI_NONVALID_REASON_REQUIRED", path: ["reasonCode"] });
			}
		} else if (result.reasonCode === null) {
			context.addIssue({ code: "custom", message: "LOCAL_API_AI_NONVALID_REASON_REQUIRED", path: ["reasonCode"] });
		}
	});
export type LocalApiAiResult = z.infer<typeof localApiAiResultSchema>;

export const localApiAiResultsResponseSchema = z
	.strictObject({
		cycleId: z.string().uuid(),
		pilotCycleId: z.string().uuid().nullable(),
		surface: z.literal("LOCAL_AI"),
		executionMode: z.literal("MANUAL_ONLY"),
		automationAllowed: z.literal(false),
		status: z.enum(localApiCollectionStatuses),
		items: z.array(localApiAiResultSchema),
		page: localApiPageSchema,
	})
	.superRefine((response, context) => {
		if (response.status === "NOT_INCLUDED" && (response.pilotCycleId !== null || response.items.length !== 0)) {
			context.addIssue({ code: "custom", message: "LOCAL_API_NOT_INCLUDED_AI_DATA_FORBIDDEN" });
		}
		if ((response.status === "READY" || response.status === "PARTIAL") && response.pilotCycleId === null) {
			context.addIssue({ code: "custom", message: "LOCAL_API_AI_CYCLE_REQUIRED", path: ["pilotCycleId"] });
		}
	});
export type LocalApiAiResultsResponse = z.infer<typeof localApiAiResultsResponseSchema>;

export const localApiEvidenceAccessSchema = z.discriminatedUnion("state", [
	z.strictObject({
		state: z.literal("SIGNED"),
		url: z.url(),
		expiresAt: z.iso.datetime(),
		ttlSeconds: z.literal(LOCAL_API_EVIDENCE_TTL_SECONDS),
	}),
	z.strictObject({
		state: z.literal("UNAVAILABLE"),
		reason: z.enum(["SIGNING_UNAVAILABLE", "NO_REFERENCE", "INVALID_REFERENCE", "BLOCKED", "UNKNOWN"]),
		url: z.null(),
		expiresAt: z.null(),
		ttlSeconds: z.literal(LOCAL_API_EVIDENCE_TTL_SECONDS),
	}),
]);
export type LocalApiEvidenceAccess = z.infer<typeof localApiEvidenceAccessSchema>;

export const localApiEvidenceItemSchema = z
	.strictObject({
		evidenceId: z.string().trim().min(1),
		datasetId: z.string().uuid().nullable(),
		surface: z.enum(["LOCAL_MAPS", "LOCAL_AI"]),
		status: localApiTruthStatusSchema,
		kind: z.string().trim().min(1),
		provenanceVerified: z.boolean(),
		capturedAt: z.iso.datetime().nullable(),
		access: localApiEvidenceAccessSchema,
	})
	.superRefine((item, context) => {
		if (item.status === "VALID" && (!item.provenanceVerified || item.capturedAt === null)) {
			context.addIssue({ code: "custom", message: "LOCAL_API_VALID_EVIDENCE_PROVENANCE_REQUIRED" });
		}
		if (item.status !== "VALID" && item.provenanceVerified) {
			context.addIssue({ code: "custom", message: "LOCAL_API_NONVALID_EVIDENCE_PROVENANCE_FORBIDDEN" });
		}
		if (item.status !== "VALID" && item.access.state === "SIGNED") {
			context.addIssue({ code: "custom", message: "LOCAL_API_NONVALID_EVIDENCE_SIGNING_FORBIDDEN", path: ["access"] });
		}
	});
export type LocalApiEvidenceItem = z.infer<typeof localApiEvidenceItemSchema>;

export const localApiEvidenceResponseSchema = z.strictObject({
	cycleId: z.string().uuid(),
	items: z.array(localApiEvidenceItemSchema),
	page: localApiPageSchema,
});
export type LocalApiEvidenceResponse = z.infer<typeof localApiEvidenceResponseSchema>;
