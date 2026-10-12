import { describe, expect, it, vi } from "vitest";
import type { ProviderOptions, ScrapeResult } from "../providers/types";
import type { SelenaExecutablePermit, SelenaMeasurementPermit } from "../selena-measurement";
import { executePermit } from "../selena-run-executor";
import { createDataForSeoPerplexityAdapter } from "./dataforseo-perplexity-measurement-adapter";

const now = new Date("2026-09-07T10:00:00.000Z");

function permit(overrides: Partial<SelenaExecutablePermit> = {}): SelenaExecutablePermit {
	return {
		id: "permit-1",
		organizationId: "org-1",
		cycleId: "cycle-1",
		scenarioId: "scenario-1",
		systemId: "perplexity/sonar",
		channel: "API",
		dispatchKey: "order-1:scenario-1:perplexity/sonar:0:1",
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
	it("dispatches the Perplexity Sonar search path as Perplexity (API) evidence", async () => {
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
		expect(adapter.channel).toBe("api_view");
		expect(outcome).toMatchObject({
			status: "SUCCEEDED",
			validity: "VALID",
			provider: "dataforseo",
			costUsd: 0.005,
			costBasis: "estimated",
			rawResponseReference: expect.stringMatching(/^dataforseo:sha256:/),
			measurement: {
				system: "perplexity/sonar",
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
			dispatchKey: "order-1:scenario-1:perplexity/sonar:0:1",
			status: "FAILED",
			validity: "INVALID",
			invalidReason: "PROVIDER_HTTP_401",
			costUsd: 0.005,
			costBasis: "estimated",
			provider: "dataforseo",
		});
	});

	it("classifies an SDK status without retaining sensitive error fields", async () => {
		const sensitive = ["sensitive-message", "sensitive-response", "sensitive-body", "sensitive-header"];
		const run = vi.fn(async () => {
			throw Object.assign(new Error(sensitive[0]), {
				status: 401,
				statusCode: 503,
				response: sensitive[1],
				body: sensitive[2],
				header: sensitive[3],
			});
		});
		const adapter = createDataForSeoPerplexityAdapter({ run, resolveScenarioText: () => "Where should I eat?" });

		const outcome = await adapter.execute(permit());

		expect(outcome.invalidReason).toBe("PROVIDER_HTTP_401");
		const serialized = JSON.stringify(outcome);
		for (const value of sensitive) expect(serialized).not.toContain(value);
	});

	it("classifies DataForSEO task failures", async () => {
		const run = vi.fn(async () => {
			throw new Error("DataForSEO API Error: 40602 Internal SE Server Error.");
		});
		const adapter = createDataForSeoPerplexityAdapter({ run, resolveScenarioText: () => "Where should I eat?" });

		expect((await adapter.execute(permit())).invalidReason).toBe("PROVIDER_TASK_40602");
	});

	it("classifies a missing provider task response", async () => {
		const run = vi.fn(async () => {
			throw new Error("DataForSEO API Error: No response or tasks.");
		});
		const adapter = createDataForSeoPerplexityAdapter({ run, resolveScenarioText: () => "Where should I eat?" });

		expect((await adapter.execute(permit())).invalidReason).toBe("PROVIDER_RESPONSE_MISSING");
	});

	it("classifies unknown thrown errors as transport failures", async () => {
		const run = vi.fn(async () => {
			throw new Error("unknown-sensitive-provider-detail");
		});
		const adapter = createDataForSeoPerplexityAdapter({ run, resolveScenarioText: () => "Where should I eat?" });

		const outcome = await adapter.execute(permit());

		expect(outcome.invalidReason).toBe("TRANSPORT_ERROR");
		expect(JSON.stringify(outcome)).not.toContain("unknown-sensitive-provider-detail");
	});

	it("accepts API permits as sold and Visitor View permits from the owner's journal", async () => {
		const adapter = createDataForSeoPerplexityAdapter({
			run: vi.fn(),
			resolveScenarioText: () => "Where should I eat?",
		});

		for (const channel of ["api_view", "visitor_view"] as const) {
			const queued: SelenaMeasurementPermit = {
				cycleId: "cycle-1",
				organizationId: "org-1",
				scenarioId: "scenario-1",
				dispatchKey: "k1",
				channel,
			};
			await expect(adapter.measure(queued)).resolves.toEqual({ dispatchKey: "k1", status: "queued" });
		}
	});
});

describe("DataForSEO Perplexity answers through the executor", () => {
	const extractionContext = () => ({
		brandTerms: ["KORA Food Hall"],
		ownedDomains: ["kora.example"],
		competitors: [],
		language: "en",
	});
	const executeThroughExecutor = (claimed: SelenaExecutablePermit) =>
		executePermit({
			permit: claimed,
			adapter: createDataForSeoPerplexityAdapter({
				run: vi.fn(async () => result()),
				now: () => now,
				resolveScenarioText: () => "Where should I eat?",
				resolveExtractionContext: extractionContext,
			}),
			cycleState: {
				activeMaintenanceJobs: 0,
				activeCohortJobs: 0,
				cohortId: claimed.cycleId,
				expectedJobs: 1,
				expectedProviderCalls: 1,
				seenCohortIds: new Set<string>(),
				globalEmergencyStop: false,
				orderStopped: false,
			},
			config: { enabled: true, adapter: "dataforseo-perplexity" },
			now,
		});

	it("keeps the extraction of a Perplexity (API) permit, filed under the system the permit sold", async () => {
		const outcome = await executeThroughExecutor(permit());

		expect(outcome.measurement).toMatchObject({ system: "perplexity/sonar", mention: true });
	});

	it("keeps the extraction of a historical Visitor View Perplexity permit too", async () => {
		const outcome = await executeThroughExecutor(
			permit({ systemId: "Perplexity", channel: "VISITOR", dispatchKey: "journal:scenario-1:Perplexity:0:1" }),
		);

		expect(outcome.measurement).toMatchObject({ system: "Perplexity", mention: true });
	});

	it("never files its answer under a system that is not Perplexity", async () => {
		// A plain adapter name sends every permit here; a ChatGPT permit's answer
		// came from Perplexity's API, so the executor must drop the extraction.
		const outcome = await executeThroughExecutor(
			permit({ systemId: "ChatGPT", channel: "VISITOR", dispatchKey: "order-1:scenario-1:ChatGPT:0:1" }),
		);

		expect(outcome.status).toBe("SUCCEEDED");
		expect(outcome.measurement).toBeUndefined();
	});
});
