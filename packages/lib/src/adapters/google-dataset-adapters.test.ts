import { describe, expect, it } from "vitest";
import { createBrightDataDatasetClient } from "../providers/brightdata-dataset-client";
import {
	coreGoogleDatasetAdapters,
	coreGoogleDatasetSources,
	getCoreGoogleDatasetAdapter,
	googleMapsPlaceDatasetAdapter,
} from "./google-dataset-adapters";

const safeCanary = {
	mode: "CANARY" as const,
	environment: "ISOLATED_CANARY" as const,
	ownerApproved: true,
	schemaDiscoveryOnly: true,
	providerCalls: 1,
	recurring: false,
	worstCaseCostUsd: 0.01,
	approvedCostCapUsd: 0.01,
	redactionPolicyApproved: true,
};

describe("v1.3 core Google dataset adapters", () => {
	it("exposes only AI Mode, SERP, Place and Reviews schema-discovery adapters", () => {
		expect(Object.keys(coreGoogleDatasetAdapters)).toEqual(coreGoogleDatasetSources);
		expect(() => getCoreGoogleDatasetAdapter("GOOGLE_TRAVEL_HOTELS")).toThrow("GOOGLE_DATASET_ADAPTER_NOT_AVAILABLE");
	});

	it("keeps each adapter bound to its registry contract", () => {
		for (const source of coreGoogleDatasetSources) {
			const adapter = getCoreGoogleDatasetAdapter(source);
			expect(adapter.source).toBe(source);
			expect(adapter.definition.source).toBe(source);
			expect(adapter.definition.outputSchemaVersion).toBeNull();
			expect(adapter.mapsRankEvidenceEligible).toBe(false);
		}
	});

	it("marks Maps Place as identity evidence rather than Maps rank evidence", () => {
		expect(googleMapsPlaceDatasetAdapter).toMatchObject({
			evidenceRole: "ENTITY_ONLY",
			mapsRankEvidenceEligible: false,
			definition: { domain: "ENTITY", entityType: "PLACE" },
		});
	});

	it("preserves an observed raw fixture without inventing normalized Google fields", async () => {
		const adapter = getCoreGoogleDatasetAdapter("GOOGLE_SERP");
		const prepared = adapter.prepareCanary(
			safeCanary,
			{ SELENA_BRIGHTDATA_DATASET_GOOGLE_SERP: "gd_fixture123" },
			{ observedProviderField: "query" },
		);
		const result = await createBrightDataDatasetClient({
			journal: { record: async () => undefined },
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
				trigger: async () => ({ snapshotId: "google-serp-canary-1" }),
				progress: async () => ({ status: "ready" }),
				download: async () => [{ providerFieldSeenInCanary: 1 }],
				cancel: async () => undefined,
			},
			nowIso: () => "2026-08-31T01:00:00.000Z",
		}).collect(prepared);
		if (result.status !== "COMPLETE") throw new Error("expected complete fixture");
		const capture = result.capture;
		const evidence = adapter.normalizeSchemaDiscoveryCapture(prepared, capture);

		expect(prepared.input.records).toEqual([{ observedProviderField: "query" }]);
		expect(evidence).toMatchObject({
			source: "GOOGLE_SERP",
			domain: "SEARCH",
			normalized: false,
			rawPayload: [{ providerFieldSeenInCanary: 1 }],
		});
		expect(() => adapter.validateSchemaDiscoveryEvidence(evidence)).not.toThrow();
		expect(() =>
			getCoreGoogleDatasetAdapter("GOOGLE_AI_MODE").normalizeSchemaDiscoveryCapture(prepared, capture),
		).toThrow("GOOGLE_DATASET_CAPTURE_BINDING_MISMATCH");
	});
});
