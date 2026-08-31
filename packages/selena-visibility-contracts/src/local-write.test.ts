import { describe, expect, it } from "vitest";
import { localScanQuoteResponseSchema } from "./local-write.js";

const quote = {
	quoteId: "00000000-0000-4000-8000-000000000001",
	locationId: "00000000-0000-4000-8000-000000000002",
	configurationLockId: "00000000-0000-4000-8000-000000000003",
	lockVersion: 1,
	status: "ISSUED" as const,
	surfaces: ["LOCAL_MAPS" as const],
	maps: { points: 9, keywords: 2, repeats: 1, captureDepth: 20, tasks: 18, maxProviderAttempts: 54 },
	providerEnvelope: {
		id: "dataforseo",
		endpoint: "maps/serp",
		version: "2026-08-30",
		rankEvidenceSource: "MAPS_SERP_PROVIDER" as const,
		externalProviderCalls: 0 as const,
	},
	priceAmount: "49.00",
	currency: "USD" as const,
	budget: {
		currency: "USD" as const,
		worstCaseCostUsd: "0.032400",
		surfaceCapUsd: "0.50",
		monthlyCapUsd: "15",
		priceSnapshotVersion: "dataforseo-2026-08-30",
	},
	caveats: ["Source-only quote"],
	expiresAt: "2026-09-01T00:00:00.000Z",
};

describe("local quote response contract", () => {
	it("requires at least one surface", () => {
		expect(() => localScanQuoteResponseSchema.parse({ ...quote, surfaces: [] })).toThrow();
	});

	it("rejects task and attempt cardinality drift", () => {
		expect(() => localScanQuoteResponseSchema.parse({ ...quote, maps: { ...quote.maps, tasks: 17 } })).toThrow(
			/LOCAL_QUOTE_TASK_CARDINALITY_MISMATCH/,
		);
		expect(() =>
			localScanQuoteResponseSchema.parse({ ...quote, maps: { ...quote.maps, maxProviderAttempts: 51 } }),
		).toThrow(/LOCAL_QUOTE_ATTEMPT_CARDINALITY_MISMATCH/);
	});
});
