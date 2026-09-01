import { describe, expect, it } from "vitest";
import {
	LOCAL_API_DEFAULT_LIMIT,
	LOCAL_API_EVIDENCE_TTL_SECONDS,
	LOCAL_API_MAX_LIMIT,
	localApiAiResultSchema,
	localApiAiResultsResponseSchema,
	localApiCursorPayloadSchema,
	localApiErrorEnvelopeSchema,
	localApiEvidenceResponseSchema,
	localApiMapResultSchema,
	localApiMapResultsResponseSchema,
	localApiProgressResponseSchema,
	localApiScopeSchema,
	localApiScopes,
	PROVIDER_CANARY_SCOPE,
	providerApiScopeSchema,
	providerApiScopes,
} from "./local-api";

const ids = {
	cycle: "00000000-0000-4000-8000-000000000001",
	dataset: "00000000-0000-4000-8000-000000000002",
	point: "00000000-0000-4000-8000-000000000003",
	keyword: "00000000-0000-4000-8000-000000000004",
	observation: "00000000-0000-4000-8000-000000000005",
	task: "00000000-0000-4000-8000-000000000006",
	scenario: "00000000-0000-4000-8000-000000000007",
	pilot: "00000000-0000-4000-8000-000000000008",
};

const page = { limit: LOCAL_API_DEFAULT_LIMIT, nextCursor: null };

describe("local API public contracts", () => {
	it("exposes only the four Delta scopes", () => {
		expect(localApiScopes).toEqual(["local:read", "local:write", "local:execute", "evidence:read"]);
		for (const scope of localApiScopes) expect(localApiScopeSchema.parse(scope)).toBe(scope);
		expect(localApiScopeSchema.safeParse("provider:canary").success).toBe(false);
		expect(providerApiScopes).toEqual(["provider:canary"]);
		expect(providerApiScopeSchema.parse(PROVIDER_CANARY_SCOPE)).toBe(PROVIDER_CANARY_SCOPE);
	});

	it("locks pagination and evidence TTL constants", () => {
		expect(LOCAL_API_DEFAULT_LIMIT).toBe(50);
		expect(LOCAL_API_MAX_LIMIT).toBe(200);
		expect(LOCAL_API_EVIDENCE_TTL_SECONDS).toBe(600);
	});

	it("accepts the standard nested error envelope and rejects legacy shapes", () => {
		expect(
			localApiErrorEnvelopeSchema.parse({
				error: {
					code: "BUDGET_BLOCKED",
					message: "The locked provider cap would be exceeded.",
					requestId: "request-1",
					retryable: false,
					details: { surface: "LOCAL_MAPS" },
				},
			}),
		).toMatchObject({ error: { code: "BUDGET_BLOCKED", retryable: false } });
		expect(localApiErrorEnvelopeSchema.safeParse({ error: "BUDGET_BLOCKED", message: "blocked" }).success).toBe(false);
		expect(
			localApiErrorEnvelopeSchema.safeParse({
				error: { code: "bad-code", message: "blocked", requestId: "request-1", retryable: false },
			}).success,
		).toBe(false);
	});

	it("binds a cursor payload to tenant, cycle, resource, and stable sort position", () => {
		expect(
			localApiCursorPayloadSchema.parse({
				version: 1,
				tenantId: "tenant-1",
				cycleId: ids.cycle,
				resource: "map-results",
				snapshotVersion: "2026-08-30T00:00:00.000Z",
				position: { sortValue: "2026-08-30T00:00:00.000Z", tieBreakerId: ids.observation },
			}),
		).toMatchObject({ resource: "map-results", position: { sortValue: "2026-08-30T00:00:00.000Z" } });
		expect(
			localApiCursorPayloadSchema.safeParse({
				version: 1,
				tenantId: "tenant-1",
				cycleId: ids.cycle,
				resource: "map-results",
			}).success,
		).toBe(false);
	});

	it("keeps Maps FOUND, absent, INVALID, UNKNOWN, and BLOCKED distinct", () => {
		const base = {
			observationId: ids.observation,
			gridPointId: ids.point,
			pointIndex: 0,
			latitude: -8.5069,
			longitude: 115.2625,
			keywordId: ids.keyword,
			keyword: "restaurant ubud",
			provider: "stub",
			repeatIndex: 0,
			capturedAt: "2026-08-30T00:00:00.000Z",
			evidenceIds: ["evidence:1"],
		};
		for (const result of [
			{ ...base, status: "FOUND", targetRank: 2, reasonCode: null },
			{ ...base, status: "ABSENT_WITHIN_DEPTH", targetRank: null, reasonCode: null },
			{ ...base, status: "INVALID", targetRank: null, reasonCode: "EMPTY_AFTER_3_ATTEMPTS" },
			{
				...base,
				observationId: null,
				capturedAt: null,
				status: "UNKNOWN",
				targetRank: null,
				reasonCode: "OUTCOME_UNKNOWN",
			},
			{
				...base,
				observationId: null,
				capturedAt: null,
				status: "BLOCKED",
				targetRank: null,
				reasonCode: "BUDGET_BLOCKED",
			},
		]) {
			expect(localApiMapResultSchema.parse(result).status).toBe(result.status);
		}
		expect(
			localApiMapResultSchema.safeParse({ ...base, status: "FOUND", targetRank: null, reasonCode: null }).success,
		).toBe(false);
		expect(
			localApiMapResultSchema.safeParse({ ...base, status: "INVALID", targetRank: null, reasonCode: null }).success,
		).toBe(false);
		expect(
			localApiMapResultSchema.safeParse({
				...base,
				status: "ABSENT_WITHIN_DEPTH",
				targetRank: null,
				reasonCode: null,
				evidenceIds: [],
			}).success,
		).toBe(false);
	});

	it("accepts a paginated immutable Maps result surface", () => {
		expect(
			localApiMapResultsResponseSchema.parse({
				cycleId: ids.cycle,
				datasetId: ids.dataset,
				surface: "LOCAL_MAPS",
				status: "PARTIAL",
				items: [],
				page,
			}),
		).toMatchObject({ surface: "LOCAL_MAPS", status: "PARTIAL" });
		expect(
			localApiMapResultsResponseSchema.safeParse({
				cycleId: ids.cycle,
				datasetId: null,
				surface: "LOCAL_MAPS",
				status: "READY",
				items: [],
				page,
			}).success,
		).toBe(false);
	});

	it("partitions Maps and Local AI progress without collapsing unknown or blocked counts", () => {
		const response = localApiProgressResponseSchema.parse({
			cycleId: ids.cycle,
			status: "PARTIAL_FAILURE",
			maps: {
				surface: "LOCAL_MAPS",
				status: "PARTIAL",
				counts: { expected: 5, pending: 0, valid: 2, invalid: 1, unknown: 1, blocked: 1 },
			},
			localAi: {
				surface: "LOCAL_AI",
				executionMode: "MANUAL_ONLY",
				automationAllowed: false,
				status: "NOT_STARTED",
				counts: { expected: 2, pending: 2, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
			},
			updatedAt: "2026-08-30T00:00:00.000Z",
		});
		expect(response.maps.counts).toEqual({ expected: 5, pending: 0, valid: 2, invalid: 1, unknown: 1, blocked: 1 });
		expect(response.localAi).toMatchObject({ executionMode: "MANUAL_ONLY", automationAllowed: false });
		expect(
			localApiProgressResponseSchema.safeParse({
				...response,
				localAi: { ...response.localAi, executionMode: "AUTOMATED" },
			}).success,
		).toBe(false);
		expect(
			localApiProgressResponseSchema.safeParse({
				...response,
				maps: { ...response.maps, counts: { ...response.maps.counts, unknown: 0 } },
			}).success,
		).toBe(false);
		expect(
			localApiProgressResponseSchema.safeParse({
				...response,
				maps: { ...response.maps, status: "COMPLETED" },
			}).success,
		).toBe(false);
	});

	it("preserves canonical existing and future local-cycle states", () => {
		for (const status of [
			"APPROVED",
			"ANALYZING",
			"QC_REQUIRED",
			"READY",
			"FAILED",
			"CARDINALITY_INCIDENT",
			"PARTIAL_FAILURE",
			"PROVIDER_BLOCKED",
		] as const) {
			expect(
				localApiProgressResponseSchema.parse({
					cycleId: ids.cycle,
					status,
					maps: {
						surface: "LOCAL_MAPS",
						status: "NOT_STARTED",
						counts: { expected: 1, pending: 1, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
					},
					localAi: {
						surface: "LOCAL_AI",
						executionMode: "MANUAL_ONLY",
						automationAllowed: false,
						status: "NOT_INCLUDED",
						counts: { expected: 0, pending: 0, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
					},
					updatedAt: "2026-08-30T00:00:00.000Z",
				}).status,
			).toBe(status);
		}
	});

	it("represents an intentionally excluded manual surface without inventing UNKNOWN rows", () => {
		const response = localApiProgressResponseSchema.parse({
			cycleId: ids.cycle,
			status: "CREATED",
			maps: {
				surface: "LOCAL_MAPS",
				status: "NOT_STARTED",
				counts: { expected: 1, pending: 1, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
			},
			localAi: {
				surface: "LOCAL_AI",
				executionMode: "MANUAL_ONLY",
				automationAllowed: false,
				status: "NOT_INCLUDED",
				counts: { expected: 0, pending: 0, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
			},
			updatedAt: "2026-08-30T00:00:00.000Z",
		});
		expect(response.localAi.status).toBe("NOT_INCLUDED");
		expect(
			localApiAiResultsResponseSchema.parse({
				cycleId: ids.cycle,
				pilotCycleId: null,
				surface: "LOCAL_AI",
				executionMode: "MANUAL_ONLY",
				automationAllowed: false,
				status: "NOT_INCLUDED",
				items: [],
				page,
			}).status,
		).toBe("NOT_INCLUDED");
	});

	it("requires evidence-backed manual Local AI VALID rows and preserves non-valid states", () => {
		const base = {
			captureTaskId: ids.task,
			localAiRunId: ids.pilot,
			scanCycleId: ids.cycle,
			pointId: ids.point,
			latitude: -8.5,
			longitude: 115.26,
			coordinateProofReference: "proof:1",
			observationId: ids.observation,
			scenarioId: ids.scenario,
			promptId: ids.scenario,
			promptText: "best local business",
			system: "manual",
			measurementSurface: "GOOGLE_ASK_MAPS",
			modelOrEnvironment: "manual-browser",
			webSearchState: "UNKNOWN",
			personalizationMode: "UNKNOWN",
			accountMode: "SIGNED_OUT",
			language: "en",
			contextHash: "context-hash",
			repeatIndex: 0,
			taskStatus: "ACCEPTED",
			validity: "VALID",
			rawResponseReference: null,
			targetMention: null,
			recommendationPosition: null,
			citations: [],
			competitors: [],
			costEventId: null,
			resultStatus: "VALID",
			reasonCode: null,
			capturedAt: "2026-08-30T00:00:00.000Z",
			evidenceIds: ["manual:screenshot:1"],
		};
		const response = localApiAiResultsResponseSchema.parse({
			cycleId: ids.cycle,
			pilotCycleId: ids.pilot,
			surface: "LOCAL_AI",
			executionMode: "MANUAL_ONLY",
			automationAllowed: false,
			status: "PARTIAL",
			items: [
				base,
				{
					...base,
					observationId: null,
					resultStatus: "UNKNOWN",
					taskStatus: "SURFACE_UNAVAILABLE",
					reasonCode: "SURFACE_UNAVAILABLE",
					capturedAt: null,
					evidenceIds: [],
				},
			],
			page,
		});
		expect(response.items.map((item) => item.resultStatus)).toEqual(["VALID", "UNKNOWN"]);
		expect(localApiAiResultsResponseSchema.safeParse({ ...response, executionMode: "PROVIDER" }).success).toBe(false);
		expect(localApiAiResultsResponseSchema.safeParse({ ...response, pilotCycleId: null }).success).toBe(false);
		expect(
			localApiAiResultsResponseSchema.safeParse({
				...response,
				items: [{ ...base, evidenceIds: [] }],
			}).success,
		).toBe(false);
		for (const resultStatus of ["UNKNOWN", "BLOCKED"] as const) {
			expect(
				localApiAiResultSchema.parse({
					...base,
					observationId: null,
					resultStatus,
					reasonCode: `${resultStatus}_REASON`,
					capturedAt: null,
					evidenceIds: [],
				}).resultStatus,
			).toBe(resultStatus);
		}
		expect(
			localApiAiResultSchema.parse({
				...base,
				observationId: null,
				resultStatus: "INVALID",
				taskStatus: "REJECTED",
				validity: "INVALID",
				reasonCode: "REJECTED",
				capturedAt: null,
				evidenceIds: [],
			}).resultStatus,
		).toBe("INVALID");
		expect(
			localApiAiResultSchema.safeParse({
				...base,
				resultStatus: "VALID",
				taskStatus: "REJECTED",
				validity: "INVALID",
			}).success,
		).toBe(false);
		expect(
			localApiAiResultSchema.safeParse({
				...base,
				observationId: null,
				resultStatus: "INVALID",
				taskStatus: "ACCEPTED",
				validity: "VALID",
				capturedAt: null,
				evidenceIds: [],
				reasonCode: "INVALID_REVIEW",
			}).success,
		).toBe(false);
	});

	it("models both 600-second signed access and explicit signing-unavailable access", () => {
		const response = localApiEvidenceResponseSchema.parse({
			cycleId: ids.cycle,
			items: [
				{
					evidenceId: "evidence:valid",
					datasetId: ids.dataset,
					surface: "LOCAL_MAPS",
					status: "VALID",
					kind: "MAPS_SERP_PROVIDER",
					provenanceVerified: true,
					capturedAt: "2026-08-30T00:00:00.000Z",
					access: {
						state: "SIGNED",
						url: "https://evidence.example.test/object?signature=redacted",
						expiresAt: "2026-08-30T00:10:00.000Z",
						ttlSeconds: 600,
					},
				},
				{
					evidenceId: "evidence:unknown",
					datasetId: null,
					surface: "LOCAL_AI",
					status: "UNKNOWN",
					kind: "MANUAL_SCREENSHOT",
					provenanceVerified: false,
					capturedAt: null,
					access: {
						state: "UNAVAILABLE",
						reason: "SIGNING_UNAVAILABLE",
						url: null,
						expiresAt: null,
						ttlSeconds: 600,
					},
				},
			],
			page,
		});
		expect(response.items[0]?.access).toMatchObject({ state: "SIGNED", ttlSeconds: 600 });
		expect(response.items[1]?.access).toEqual({
			state: "UNAVAILABLE",
			reason: "SIGNING_UNAVAILABLE",
			url: null,
			expiresAt: null,
			ttlSeconds: 600,
		});
		expect(response.items[0]).not.toHaveProperty("contentSha256");
		expect(
			localApiEvidenceResponseSchema.safeParse({
				...response,
				items: [{ ...response.items[0], contentSha256: `sha256:${"a".repeat(64)}` }],
			}).success,
		).toBe(false);
		expect(
			localApiEvidenceResponseSchema.safeParse({
				...response,
				items: [{ ...response.items[1], access: response.items[0]?.access }],
			}).success,
		).toBe(false);
	});
});
