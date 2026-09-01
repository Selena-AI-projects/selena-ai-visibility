import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrightDataDatasetTransport } from "./brightdata-dataset-client";
import type { ProviderDatasetAccessRequest } from "./dataset-registry";
import {
	createBrightDataGoogleAiModeTransport,
	GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
	type GoogleAiModeCanaryReservationResult,
	type GoogleAiModeCostPreflightEvidence,
	runGoogleAiModeOneShotCanary,
} from "./google-ai-mode-one-shot-canary";

const access = (overrides: Partial<ProviderDatasetAccessRequest> = {}): ProviderDatasetAccessRequest => ({
	mode: "CANARY",
	environment: "ISOLATED_CANARY",
	ownerApproved: true,
	schemaDiscoveryOnly: true,
	providerCalls: 1,
	recurring: false,
	worstCaseCostUsd: 0.1,
	approvedCostCapUsd: 0.25,
	redactionPolicyApproved: true,
	...overrides,
});

function transportWith(overrides: Partial<BrightDataDatasetTransport> = {}): BrightDataDatasetTransport {
	return {
		preflight: vi.fn(async () => undefined),
		trigger: vi.fn(async () => ({ snapshotId: "snapshot-1" })),
		progress: vi.fn(async () => ({ status: "ready" })),
		download: vi.fn(async () => [{ answer: "fixture" }]),
		cancel: vi.fn(async () => undefined),
		...overrides,
	};
}

const journal = () => ({ record: vi.fn(async () => undefined), claimResume: vi.fn(async () => false) });

const configuredEnvironment = { SELENA_BRIGHTDATA_DATASET_GOOGLE_AI: "gd_fixture123" } as const;
const reserved = (): Promise<GoogleAiModeCanaryReservationResult> =>
	Promise.resolve({
		status: "RESERVED",
		reservationReference: "canary-reservation-1",
		approvedCapUsd: 0.25,
		remainingAuthorizedUsd: 0.25,
	});
const costEvidence = (
	overrides: Partial<GoogleAiModeCostPreflightEvidence> = {},
): GoogleAiModeCostPreflightEvidence => ({
	schemaVersion: "google-ai-mode-cost-preflight-v1",
	verifiedWorstCaseUsd: 0.1,
	enforcedMaximumUsd: 0.25,
	remainingAuthorizedBudgetUsd: 0.25,
	enforcement: "PROVIDER_ACCOUNT_HARD_CAP",
	evidenceReference: "cost-preflight:quote-12345678",
	verifiedAt: new Date().toISOString(),
	...overrides,
});

describe("GOOGLE_AI_MODE one-shot canary", () => {
	it("binds this authorized run to the diagnostic-2 immutable identity", () => {
		expect(GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY).toBe("selena-v1-3-google-ai-mode-diagnostic-2");
	});

	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("fails before transport unless the global provider master gate is open", async () => {
		const transport = transportWith();
		const result = await runGoogleAiModeOneShotCanary({
			access: access(),
			environment: configuredEnvironment,
			providerInput: { query: "best restaurants in Ubud" },
			transport,
			journal: journal(),
		});

		expect(result.receipt).toMatchObject({
			status: "PREFLIGHT_BLOCKED",
			providerCalls: 0,
			recurring: false,
			automaticRetries: 0,
			retryAllowed: false,
			reservationReference: null,
		});
		expect(transport.trigger).not.toHaveBeenCalled();
	});

	it("refuses a cost cap or worst-case estimate above USD 0.25", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		const transport = transportWith();
		for (const request of [
			access({ approvedCostCapUsd: 0.24 }),
			access({ approvedCostCapUsd: 0.26 }),
			access({ worstCaseCostUsd: 0.26 }),
		]) {
			const result = await runGoogleAiModeOneShotCanary({
				access: request,
				environment: configuredEnvironment,
				providerInput: { query: "best restaurants in Ubud" },
				transport,
				journal: journal(),
				costPreflight: costEvidence(),
				reserveOnce: reserved,
			});
			expect(result.receipt).toMatchObject({ status: "PREFLIGHT_BLOCKED", providerCalls: 0 });
		}
		expect(transport.trigger).not.toHaveBeenCalled();
	});

	it("produces a redacted terminal receipt after exactly one successful trigger", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		const transport = transportWith();
		const result = await runGoogleAiModeOneShotCanary({
			access: access(),
			environment: configuredEnvironment,
			providerInput: { query: "best restaurants in Ubud" },
			transport,
			journal: journal(),
			costPreflight: costEvidence(),
			reserveOnce: reserved,
			clock: { nowIso: () => "2026-08-31T10:00:00.000Z" },
		});

		expect(transport.trigger).toHaveBeenCalledTimes(1);
		expect(result.receipt).toMatchObject({
			status: "COMPLETE",
			terminal: true,
			source: "GOOGLE_AI_MODE",
			providerCalls: 1,
			recurring: false,
			automaticRetries: 0,
			retryAllowed: false,
			reservationReference: "canary-reservation-1",
			cost: {
				currency: "USD",
				status: "UNKNOWN",
				amountUsd: null,
				estimatedWorstCaseUsd: 0.1,
				approvedCapUsd: 0.25,
				reservedUsd: 0.25,
				basis: "PROVIDER_ACTUAL_UNAVAILABLE",
				reconciliation: "REQUIRED",
				acceptance: "HOLD",
				preflightEvidenceReference: "cost-preflight:quote-12345678",
			},
		});
		expect(JSON.stringify(result.receipt)).not.toContain("fixture");
		expect(result.capture).toMatchObject({ rawPayload: [{ answer: "fixture" }] });
		expect(result.receipt.timing.overallTimeoutMs + result.receipt.timing.cancelTimeoutMs).toBeLessThanOrEqual(
			25 * 60 * 1_000,
		);
	});

	it("rejects absent, stale, unbounded or underfunded pricing evidence before reservation", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		const transport = transportWith();
		const reserveOnce = vi.fn(reserved);
		const invalidEvidence = [
			undefined,
			costEvidence({ verifiedWorstCaseUsd: 0.26 }),
			costEvidence({ enforcedMaximumUsd: 0.26 }),
			costEvidence({ remainingAuthorizedBudgetUsd: 0.09 }),
			costEvidence({ enforcement: "TRUST_ME" as GoogleAiModeCostPreflightEvidence["enforcement"] }),
			costEvidence({ evidenceReference: "unsafe reference" }),
			costEvidence({ verifiedAt: new Date(Date.now() - 16 * 60 * 1_000).toISOString() }),
		];

		for (const costPreflight of invalidEvidence) {
			const result = await runGoogleAiModeOneShotCanary({
				access: access(),
				environment: configuredEnvironment,
				providerInput: { query: "best restaurants in Ubud" },
				transport,
				journal: journal(),
				costPreflight,
				reserveOnce,
			});
			expect(result.receipt).toMatchObject({
				status: "PREFLIGHT_BLOCKED",
				reason: "COST_PREFLIGHT_EVIDENCE_REQUIRED",
				providerCalls: 0,
			});
		}
		expect(reserveOnce).not.toHaveBeenCalled();
		expect(transport.trigger).not.toHaveBeenCalled();
	});

	it("records an ambiguous trigger as terminal unknown and never retries or leaks its error", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		const trigger = vi.fn(async () => {
			throw new Error("secret-bearing provider response");
		});
		const transport = transportWith({ trigger });
		const result = await runGoogleAiModeOneShotCanary({
			access: access(),
			environment: configuredEnvironment,
			providerInput: { query: "best restaurants in Ubud" },
			transport,
			journal: journal(),
			costPreflight: costEvidence(),
			reserveOnce: reserved,
		});

		expect(trigger).toHaveBeenCalledTimes(1);
		expect(result.receipt).toMatchObject({
			status: "OUTCOME_UNKNOWN",
			providerCalls: 1,
			automaticRetries: 0,
			retryAllowed: false,
			reason: "TRIGGER_OUTCOME_UNKNOWN",
		});
		expect(JSON.stringify(result.receipt)).not.toContain("secret-bearing");
	});

	it("times out one lifecycle without retriggering", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		let currentTime = 0;
		const transport = transportWith({ progress: vi.fn(async () => ({ status: "running" })) });
		const result = await runGoogleAiModeOneShotCanary({
			access: access(),
			environment: configuredEnvironment,
			providerInput: { query: "best restaurants in Ubud" },
			transport,
			journal: journal(),
			costPreflight: costEvidence(),
			reserveOnce: reserved,
			clock: {
				now: () => currentTime,
				sleep: async (durationMs) => {
					currentTime += durationMs;
				},
			},
		});

		expect(result.receipt).toMatchObject({ status: "TIMEOUT", providerCalls: 1 });
		expect(transport.trigger).toHaveBeenCalledTimes(1);
		expect(transport.cancel).toHaveBeenCalledTimes(1);
	});

	it("requires and consumes one durable reservation before the trigger", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		let reservationExists = false;
		const events: string[] = [];
		const reserveOnce = vi.fn(async (): Promise<GoogleAiModeCanaryReservationResult> => {
			if (reservationExists) return { status: "ALREADY_RESERVED" };
			reservationExists = true;
			events.push("reservation-committed");
			return {
				status: "RESERVED",
				reservationReference: "canary-reservation-1",
				approvedCapUsd: 0.25,
				remainingAuthorizedUsd: 0.25,
			};
		});
		const transport = transportWith({
			trigger: vi.fn(async () => {
				events.push("trigger");
				return { snapshotId: "snapshot-1" };
			}),
		});
		const run = () =>
			runGoogleAiModeOneShotCanary({
				access: access(),
				environment: configuredEnvironment,
				providerInput: { query: "best restaurants in Ubud" },
				transport,
				journal: journal(),
				costPreflight: costEvidence(),
				reserveOnce,
			});

		await expect(run()).resolves.toMatchObject({ receipt: { status: "COMPLETE", providerCalls: 1 } });
		await expect(run()).resolves.toMatchObject({
			receipt: { status: "PREFLIGHT_BLOCKED", reason: "RESERVATION_ALREADY_EXISTS", providerCalls: 0 },
		});
		expect(reserveOnce).toHaveBeenCalledTimes(2);
		expect(transport.trigger).toHaveBeenCalledTimes(1);
		expect(events).toEqual(["reservation-committed", "trigger"]);
	});

	it("keeps an ambiguous trigger durably consumed across a repeated invocation", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		let reservationExists = false;
		const reserveOnce = async (): Promise<GoogleAiModeCanaryReservationResult> => {
			if (reservationExists) return { status: "ALREADY_RESERVED" };
			reservationExists = true;
			return {
				status: "RESERVED",
				reservationReference: "canary-reservation-1",
				approvedCapUsd: 0.25,
				remainingAuthorizedUsd: 0.25,
			};
		};
		const trigger = vi.fn(async () => {
			throw new Error("ambiguous");
		});
		const options = {
			access: access(),
			environment: configuredEnvironment,
			providerInput: { query: "best restaurants in Ubud" },
			transport: transportWith({ trigger }),
			journal: journal(),
			costPreflight: costEvidence(),
			reserveOnce,
		};

		await expect(runGoogleAiModeOneShotCanary(options)).resolves.toMatchObject({
			receipt: { status: "OUTCOME_UNKNOWN", providerCalls: 1 },
		});
		await expect(runGoogleAiModeOneShotCanary(options)).resolves.toMatchObject({
			receipt: { reason: "RESERVATION_ALREADY_EXISTS", providerCalls: 0 },
		});
		expect(trigger).toHaveBeenCalledTimes(1);
	});

	it("fails closed before transport when durable reservation or remaining budget is unavailable", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		const transport = transportWith();
		const base = {
			access: access(),
			environment: configuredEnvironment,
			providerInput: { query: "best restaurants in Ubud" },
			transport,
			journal: journal(),
			costPreflight: costEvidence(),
		};

		await expect(runGoogleAiModeOneShotCanary(base)).resolves.toMatchObject({
			receipt: { reason: "DURABLE_RESERVATION_REQUIRED", providerCalls: 0 },
		});
		await expect(
			runGoogleAiModeOneShotCanary({ ...base, reserveOnce: async () => ({ status: "BUDGET_BLOCKED" }) }),
		).resolves.toMatchObject({ receipt: { reason: "REMAINING_BUDGET_INSUFFICIENT", providerCalls: 0 } });
		await expect(
			runGoogleAiModeOneShotCanary({
				...base,
				reserveOnce: async () => ({
					status: "RESERVED",
					reservationReference: "canary-reservation-2",
					approvedCapUsd: 0.25,
					remainingAuthorizedUsd: 0.24,
				}),
			}),
		).resolves.toMatchObject({ receipt: { reason: "RESERVATION_AUTHORIZATION_INVALID", providerCalls: 0 } });
		expect(transport.trigger).not.toHaveBeenCalled();
	});
});

describe("verified Bright Data GOOGLE_AI_MODE HTTP transport", () => {
	it("blocks the concrete HTTP trigger at the transport boundary when the master gate is closed", async () => {
		const fetchImpl = vi.fn(
			async (_input: string | URL | Request, _init?: RequestInit) =>
				new Response(JSON.stringify({ snapshot_id: "should-not-run" })),
		);
		const transport = createBrightDataGoogleAiModeTransport({ apiKey: "private-token", fetchImpl });

		await expect(
			transport.trigger(
				{
					source: "GOOGLE_AI_MODE",
					datasetId: "gd_fixture123",
					input: {
						schemaVersion: "schema-discovery-input-v1",
						provider: "BRIGHT_DATA",
						source: "GOOGLE_AI_MODE",
						records: [{ query: "fixture" }],
					},
				},
				new AbortController().signal,
			),
		).rejects.toThrow("LEGACY_PROVIDER_EXECUTION_DISABLED");
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("uses the repository-verified trigger/progress/snapshot lifecycle without exposing the token", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		const responses = [
			new Response(JSON.stringify({ snapshot_id: "snapshot-1" }), { status: 200 }),
			new Response(JSON.stringify({ status: "ready" }), { status: 200 }),
			new Response(JSON.stringify([{ answer: "fixture" }]), { status: 200 }),
			new Response(null, { status: 200 }),
		];
		const fetchImpl = vi.fn(
			async (_input: string | URL | Request, _init?: RequestInit) =>
				responses.shift() ?? new Response(null, { status: 500 }),
		);
		const transport = createBrightDataGoogleAiModeTransport({ apiKey: "private-token", fetchImpl });

		await expect(
			transport.trigger(
				{
					source: "GOOGLE_AI_MODE",
					datasetId: "gd_fixture123",
					input: {
						schemaVersion: "schema-discovery-input-v1",
						provider: "BRIGHT_DATA",
						source: "GOOGLE_AI_MODE",
						records: [{ query: "fixture" }],
					},
				},
				new AbortController().signal,
			),
		).resolves.toEqual({ snapshotId: "snapshot-1" });
		vi.stubEnv("SELENA_EMERGENCY_STOP", "true");
		await expect(transport.progress("snapshot-1", new AbortController().signal)).resolves.toEqual({ status: "ready" });
		await expect(transport.download("snapshot-1", new AbortController().signal)).resolves.toEqual([
			{ answer: "fixture" },
		]);
		await expect(transport.cancel("snapshot-1", new AbortController().signal)).resolves.toBeUndefined();

		const urls = fetchImpl.mock.calls.map(([url]) => String(url));
		expect(urls[0]).toContain("/datasets/v3/trigger");
		expect(urls[1]).toContain("/datasets/v3/progress/snapshot-1");
		expect(urls[2]).toContain("/datasets/v3/snapshot/snapshot-1?format=json");
		expect(urls[3]).toContain("/datasets/v3/snapshot/snapshot-1/cancel");
		expect(urls.join("\n")).not.toContain("private-token");
	});
});
