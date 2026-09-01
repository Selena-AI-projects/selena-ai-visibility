import { describe, expect, it } from "vitest";
import { createBrightDataDatasetClient } from "./brightdata-dataset-client";
import {
	assertProviderDatasetAccess,
	getProviderDatasetDefinition,
	type ProviderDatasetAccessRequest,
	prepareProviderDatasetCanary,
	providerDatasetRegistry,
	providerDatasetSourceIds,
	resolveProviderDatasetId,
} from "./dataset-registry";

async function collectFixture(prepared: ReturnType<typeof prepareProviderDatasetCanary>, rawPayload: unknown) {
	const result = await createBrightDataDatasetClient({
		journal: { record: async () => undefined, claimResume: async () => false },
		lifecycle: {
			timeoutMs: 1_000,
			pollIntervalMs: 10,
			cancelTimeoutMs: 100,
			readyStatuses: ["ready"],
			pendingStatuses: ["pending"],
			terminalFailureStatuses: ["failed"],
		},
		transport: {
			preflight: async () => undefined,
			trigger: async () => ({ snapshotId: "snapshot-one" }),
			progress: async () => ({ status: "ready" }),
			download: async () => rawPayload,
			cancel: async () => undefined,
		},
		nowIso: () => "2026-08-31T00:00:00.000Z",
	}).collect(prepared);
	if (result.status !== "COMPLETE") throw new Error("expected complete fixture");
	return result.capture;
}

const safeCanary: ProviderDatasetAccessRequest = {
	mode: "CANARY",
	environment: "ISOLATED_CANARY",
	ownerApproved: true,
	schemaDiscoveryOnly: true,
	providerCalls: 1,
	recurring: false,
	worstCaseCostUsd: 0.01,
	approvedCostCapUsd: 0.02,
	redactionPolicyApproved: true,
};

const approvedSocialPolicies = {
	privacyReviewApproved: true,
	retentionReviewApproved: true,
	deletionPropagationApproved: true,
	legalHoldPolicyApproved: true,
	sourceTermsApproved: true,
} as const;

describe("v1.3 provider dataset registry", () => {
	it("defines exactly the 13 new canary-only datasets without embedding dataset ids", () => {
		const expected = [
			["GOOGLE_AI_MODE", "SELENA_BRIGHTDATA_DATASET_GOOGLE_AI", "AI", "GOOGLE_AI_MODE", "AI_ANSWER"],
			["GOOGLE_SERP", "SELENA_BRIGHTDATA_DATASET_GOOGLE_SERP", "SEARCH", "GOOGLE_SERP", "SEARCH_RESULT"],
			[
				"GOOGLE_MAPS_REVIEWS",
				"SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_REVIEWS",
				"REPUTATION",
				"GOOGLE_MAPS_REVIEWS",
				"REVIEW",
			],
			["GOOGLE_MAPS_PLACE", "SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_PLACE", "ENTITY", "GOOGLE_MAPS_PLACE", "PLACE"],
			["GOOGLE_TRAVEL_HOTELS", "SELENA_BRIGHTDATA_DATASET_GOOGLE_HOTELS", "TRAVEL", "GOOGLE_TRAVEL_HOTELS", "HOTEL"],
			["INSTAGRAM_PROFILES", "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_PROFILES", "SOCIAL", "INSTAGRAM", "SOCIAL_PROFILE"],
			["INSTAGRAM_POSTS", "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_POSTS", "SOCIAL", "INSTAGRAM", "SOCIAL_CONTENT"],
			["INSTAGRAM_REELS", "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_REELS", "SOCIAL", "INSTAGRAM", "SOCIAL_CONTENT"],
			[
				"INSTAGRAM_COMMENTS",
				"SELENA_BRIGHTDATA_DATASET_INSTAGRAM_COMMENTS",
				"SOCIAL",
				"INSTAGRAM",
				"SOCIAL_CONVERSATION",
			],
			["TIKTOK_PROFILES", "SELENA_BRIGHTDATA_DATASET_TIKTOK_PROFILES", "SOCIAL", "TIKTOK", "SOCIAL_PROFILE"],
			["TIKTOK_POSTS", "SELENA_BRIGHTDATA_DATASET_TIKTOK_POSTS", "SOCIAL", "TIKTOK", "SOCIAL_CONTENT"],
			["REDDIT_POSTS", "SELENA_BRIGHTDATA_DATASET_REDDIT_POSTS", "SOCIAL", "REDDIT", "SOCIAL_CONVERSATION"],
			["YOUTUBE_VIDEOS", "SELENA_BRIGHTDATA_DATASET_YOUTUBE_VIDEOS", "SOCIAL", "YOUTUBE", "SOCIAL_CONTENT"],
		];
		expect(providerDatasetRegistry).toHaveLength(13);
		expect(providerDatasetRegistry.map((definition) => definition.source)).toEqual(providerDatasetSourceIds);
		expect(
			providerDatasetRegistry.map(({ source, datasetEnvKey, domain, surface, entityType }) => [
				source,
				datasetEnvKey,
				domain,
				surface,
				entityType,
			]),
		).toEqual(expected);
		expect(new Set(providerDatasetRegistry.map((definition) => definition.datasetEnvKey)).size).toBe(13);
		expect(providerDatasetRegistry.every((definition) => definition.capabilityStatus === "CANARY_ONLY")).toBe(true);
		expect(providerDatasetRegistry.every((definition) => definition.outputSchemaVersion === null)).toBe(true);
		expect(JSON.stringify(providerDatasetRegistry)).not.toContain("gd_");
	});

	it("keeps Google surfaces in their own domains and never treats Place as Maps rank evidence", () => {
		expect(getProviderDatasetDefinition("GOOGLE_AI_MODE")).toMatchObject({ domain: "AI", surface: "GOOGLE_AI_MODE" });
		expect(getProviderDatasetDefinition("GOOGLE_SERP")).toMatchObject({ domain: "SEARCH", surface: "GOOGLE_SERP" });
		expect(getProviderDatasetDefinition("GOOGLE_MAPS_PLACE")).toMatchObject({
			domain: "ENTITY",
			entityType: "PLACE",
			surface: "GOOGLE_MAPS_PLACE",
		});
		expect(getProviderDatasetDefinition("GOOGLE_MAPS_REVIEWS")).toMatchObject({
			domain: "REPUTATION",
			entityType: "REVIEW",
		});
		expect(getProviderDatasetDefinition("GOOGLE_TRAVEL_HOTELS")).toMatchObject({
			domain: "TRAVEL",
			datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_GOOGLE_HOTELS",
		});
	});

	it("uses only ledger-controlled attempts and canary-derived timeout and cost policies", () => {
		for (const definition of providerDatasetRegistry) {
			expect(definition.retryPolicy).toMatchObject({
				controller: "ATTEMPT_LEDGER",
				maxAttempts: 3,
				genericQueueRetries: false,
				retryEmptyResult: false,
				wholeDatasetRetry: false,
			});
			expect(definition.timeoutPolicy).toEqual({
				strategy: "CANARY_DERIVED",
				timeoutMs: null,
				pollIntervalMs: null,
			});
			expect(definition.costPolicy).toMatchObject({ strategy: "CANARY_DERIVED", unit: null });
		}
	});

	it("resolves configuration separately from capability and rejects missing or malformed ids", () => {
		const definition = getProviderDatasetDefinition("GOOGLE_AI_MODE");
		expect(resolveProviderDatasetId("GOOGLE_AI_MODE", { SELENA_BRIGHTDATA_DATASET_GOOGLE_AI: " gd_example123 " })).toBe(
			"gd_example123",
		);
		expect(definition.capabilityStatus).toBe("CANARY_ONLY");
		expect(() => resolveProviderDatasetId("GOOGLE_AI_MODE", {})).toThrow("PROVIDER_DATASET_ID_NOT_CONFIGURED");
		expect(() => resolveProviderDatasetId("GOOGLE_AI_MODE", { SELENA_BRIGHTDATA_DATASET_GOOGLE_AI: "wrong" })).toThrow(
			"PROVIDER_DATASET_ID_INVALID",
		);
	});

	it("builds one-record schema-discovery inputs without transport credentials", () => {
		const definition = getProviderDatasetDefinition("GOOGLE_SERP");
		expect(definition.buildInput({ query: "restaurant in Ubud" })).toMatchObject({
			provider: "BRIGHT_DATA",
			source: "GOOGLE_SERP",
			records: [{ query: "restaurant in Ubud" }],
		});
		expect(() => definition.buildInput({})).toThrow("PROVIDER_DATASET_CANARY_INPUT_REQUIRED");
		expect(() => definition.buildInput({ request: { authorization: "fixture" } })).toThrow(
			"PROVIDER_DATASET_INPUT_CREDENTIAL_FORBIDDEN",
		);
		for (const credentialAlias of ["BRIGHTDATA_API_TOKEN", "access_token", "client_secret"]) {
			expect(() => definition.buildInput({ [credentialAlias]: "fixture" })).toThrow(
				"PROVIDER_DATASET_INPUT_CREDENTIAL_FORBIDDEN",
			);
		}
		expect(() => definition.buildInput({ author: "fixture", token_count: 12 })).not.toThrow();
	});

	it("preserves raw canary evidence and detects payload tampering", async () => {
		const definition = getProviderDatasetDefinition("GOOGLE_MAPS_REVIEWS");
		const callerPayload = [{ nested: { observed: "fixture" } }];
		const prepared = prepareProviderDatasetCanary(
			"GOOGLE_MAPS_REVIEWS",
			safeCanary,
			{ SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_REVIEWS: "gd_example123" },
			{ url: "https://example.test/place" },
		);
		const capture = await collectFixture(prepared, callerPayload);
		const evidence = definition.normalize(capture);
		expect(evidence).toMatchObject({ immutable: true, normalized: false, entityType: "REVIEW" });
		expect(evidence.rawContentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
		const callerRecord = callerPayload[0];
		if (!callerRecord) throw new Error("test fixture missing");
		callerRecord.nested.observed = "mutated after normalization";
		expect(evidence.rawPayload).toEqual([{ nested: { observed: "fixture" } }]);
		expect(Object.isFrozen(evidence.rawPayload)).toBe(true);
		expect(() => definition.validateEvidence(evidence)).not.toThrow();
		expect(() => definition.validateEvidence({ ...evidence, rawPayload: [{ changed: true }] })).toThrow(
			"PROVIDER_DATASET_RAW_PAYLOAD_TAMPERED",
		);
		expect(() => definition.normalize({ ...capture })).toThrow("PROVIDER_DATASET_RAW_CAPTURE_FACTORY_REQUIRED");
	});

	it("blocks runtime and public use even when a dataset id is configured", () => {
		for (const mode of ["RUNTIME", "PUBLIC"] as const) {
			expect(() => assertProviderDatasetAccess("GOOGLE_AI_MODE", { ...safeCanary, mode })).toThrow(
				"PROVIDER_DATASET_CANARY_ONLY",
			);
		}
	});

	it("requires isolated owner approval, one capped call and a redaction policy", () => {
		expect(() => assertProviderDatasetAccess("GOOGLE_AI_MODE", safeCanary)).not.toThrow();
		expect(() => assertProviderDatasetAccess("GOOGLE_AI_MODE", { ...safeCanary, ownerApproved: false })).toThrow(
			"PROVIDER_DATASET_OWNER_APPROVAL_REQUIRED",
		);
		expect(() => assertProviderDatasetAccess("GOOGLE_AI_MODE", { ...safeCanary, providerCalls: 2 })).toThrow(
			"PROVIDER_DATASET_CANARY_SCOPE_INVALID",
		);
		expect(() => assertProviderDatasetAccess("GOOGLE_AI_MODE", { ...safeCanary, worstCaseCostUsd: null })).toThrow(
			"PROVIDER_DATASET_COST_CAP_REQUIRED",
		);
	});

	it("keeps Social and Travel behind their separate fail-closed gates", () => {
		expect(() =>
			assertProviderDatasetAccess("INSTAGRAM_COMMENTS", {
				...safeCanary,
				privacyReviewApproved: true,
				retentionReviewApproved: true,
			}),
		).toThrow("PROVIDER_DATASET_BLOCKED_COST_AND_PERSONAL_DATA");
		expect(() => assertProviderDatasetAccess("INSTAGRAM_PROFILES", safeCanary)).toThrow(
			"PROVIDER_DATASET_SOCIAL_POLICY_GATE_REQUIRED",
		);
		expect(() =>
			assertProviderDatasetAccess("INSTAGRAM_PROFILES", { ...safeCanary, ...approvedSocialPolicies }),
		).not.toThrow();
		expect(() => assertProviderDatasetAccess("GOOGLE_TRAVEL_HOTELS", safeCanary)).toThrow(
			"PROVIDER_DATASET_TRAVEL_GATE_REQUIRED",
		);
		expect(() =>
			assertProviderDatasetAccess("GOOGLE_TRAVEL_HOTELS", { ...safeCanary, travelProductGateApproved: true }),
		).not.toThrow();
	});

	it("requires deletion, legal-hold and source-terms proof before any Social canary", () => {
		const approvedRequest = { ...safeCanary, ...approvedSocialPolicies };
		for (const [gate, error] of [
			["deletionPropagationApproved", "PROVIDER_DATASET_SOCIAL_DELETION_GATE_REQUIRED"],
			["legalHoldPolicyApproved", "PROVIDER_DATASET_SOCIAL_LEGAL_HOLD_GATE_REQUIRED"],
			["sourceTermsApproved", "PROVIDER_DATASET_SOCIAL_SOURCE_TERMS_GATE_REQUIRED"],
		] as const) {
			expect(() => assertProviderDatasetAccess("REDDIT_POSTS", { ...approvedRequest, [gate]: false })).toThrow(error);
		}
		expect(() => assertProviderDatasetAccess("REDDIT_POSTS", approvedRequest)).not.toThrow();
	});

	it("prepares a canary only after access, dataset id and input gates pass together", () => {
		expect(() =>
			prepareProviderDatasetCanary(
				"INSTAGRAM_PROFILES",
				safeCanary,
				{ SELENA_BRIGHTDATA_DATASET_INSTAGRAM_PROFILES: "gd_social123" },
				{ url: "https://example.test/profile" },
			),
		).toThrow("PROVIDER_DATASET_SOCIAL_POLICY_GATE_REQUIRED");

		const prepared = prepareProviderDatasetCanary(
			"INSTAGRAM_PROFILES",
			{ ...safeCanary, ...approvedSocialPolicies },
			{ SELENA_BRIGHTDATA_DATASET_INSTAGRAM_PROFILES: "gd_social123" },
			{ url: "https://example.test/profile" },
		);
		expect(prepared).toMatchObject({
			providerDatasetId: "gd_social123",
			definition: { source: "INSTAGRAM_PROFILES", capabilityStatus: "CANARY_ONLY" },
			input: { source: "INSTAGRAM_PROFILES", records: [{ url: "https://example.test/profile" }] },
		});
	});
});
