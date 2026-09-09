import { describe, expect, it, vi } from "vitest";
import type { ProviderOptions, ScrapeResult } from "../providers/types";
import type { SelenaExecutablePermit, SelenaMeasurementPermit } from "../selena-measurement";
import { createDataForSeoPerplexityAdapter } from "./dataforseo-perplexity-measurement-adapter";

const now = new Date("2026-09-07T10:00:00.000Z");

function permit(overrides: Partial<SelenaExecutablePermit> = {}): SelenaExecutablePermit {
	return {
		id: "permit-1",
		organizationId: "org-1",
		cycleId: "cycle-1",
		scenarioId: "scenario-1",
		systemId: "Perplexity",
		channel: "VISITOR",
		dispatchKey: "order-1:scenario-1:Perplexity:0:1",
		expiresAt: new Date("2026-09-07T11:00:00.000Z"),
		consumedAt: null,
		...overrides,
	};
}

function result(overrides: Partial<ScrapeResult> = {}): ScrapeResult {
	return {
		textContent: "KORA Food Hall is a strong option.",
		rawOutput: { task: "task-1" },
		webQueries: ["unavailable"],
		citations: [{ url: "https://kora.example/menu", domain: "kora.example", title: "Menu", citationIndex: 0 }],
		modelVersion: "sonar",
		...overrides,
	};
}

describe("DataForSEO Perplexity measurement adapter", () => {
	it("dispatches the Perplexity Sonar search path as Visitor View evidence", async () => {
		const run = vi.fn(async (_model: string, _prompt: string, _options?: ProviderOptions) => result());
		const adapter = createDataForSeoPerplexityAdapter({
			run,
			now: () => now,
			resolveScenarioText: () => "Where should I eat?",
			resolveExtractionContext: () => ({
				brandTerms: ["KORA Food Hall"],
				ownedDomains: ["kora.example"],
				competitors: [],
				language: "en",
			}),
		});

		const outcome = await adapter.execute(permit());

		expect(run).toHaveBeenCalledWith("perplexity", "Where should I eat?", { webSearch: true, version: "sonar" });
		expect(adapter.channel).toBe("visitor_view");
		expect(outcome).toMatchObject({
			status: "SUCCEEDED",
			validity: "VALID",
			provider: "dataforseo",
			costUsd: 0.005,
			costBasis: "estimated",
			rawResponseReference: expect.stringMatching(/^dataforseo:sha256:/),
			measurement: {
				system: "Perplexity",
				captureMode: "live_search",
				mention: true,
			},
		});
		expect(outcome.answer).toEqual({
			text: "KORA Food Hall is a strong option.",
			retainUntil: new Date("2027-10-07T10:00:00.000Z"),
		});
		expect(outcome.sources).toEqual([{ url: "https://kora.example/menu", domain: "kora.example", title: "Menu" }]);
	});

	it("records a provider HTTP failure without storing the provider error body", async () => {
		const run = vi.fn(async () => {
			throw new Error("DataForSEO API Error: 401 Unauthorized");
		});
		const adapter = createDataForSeoPerplexityAdapter({ run, resolveScenarioText: () => "Where should I eat?" });

		expect(await adapter.execute(permit())).toEqual({
			dispatchKey: "order-1:scenario-1:Perplexity:0:1",
			status: "FAILED",
			validity: "INVALID",
			invalidReason: "PROVIDER_HTTP_401",
			costUsd: 0.005,
			costBasis: "estimated",
			provider: "dataforseo",
		});
	});

	it("rejects API permits instead of silently changing their channel", async () => {
		const adapter = createDataForSeoPerplexityAdapter({
			run: vi.fn(),
			resolveScenarioText: () => "Where should I eat?",
		});

		const apiPermit: SelenaMeasurementPermit = {
			cycleId: "cycle-1",
			organizationId: "org-1",
			scenarioId: "scenario-1",
			dispatchKey: "k1",
			channel: "api_view",
		};
		await expect(adapter.measure(apiPermit)).rejects.toThrow("MEASUREMENT_CHANNEL_MISMATCH");
	});
});
