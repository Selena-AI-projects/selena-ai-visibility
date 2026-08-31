import { describe, expect, it } from "vitest";
import {
	assertGlobalProviderStop,
	assertSuggestSpendAllowed,
	enqueueLegacyProviderWork,
	executeLegacyProviderTransport,
	isGlobalProviderStopEngaged,
	isLegacyProviderExecutionEnabled,
	SUGGEST_FREE_BUDGET_CLASS,
} from "./spend-gate";

describe("global provider stop", () => {
	it("halts every provider path, not only measurement", () => {
		expect(() => assertGlobalProviderStop({ SELENA_EMERGENCY_STOP: "true" })).toThrow("PROVIDER_CALLS_STOPPED");
		expect(isGlobalProviderStopEngaged({ SELENA_EMERGENCY_STOP: "true" })).toBe(true);
	});

	it("is only engaged by the exact value, so a typo cannot silently disarm the check", () => {
		expect(() => assertGlobalProviderStop({})).not.toThrow();
		expect(() => assertGlobalProviderStop({ SELENA_EMERGENCY_STOP: "TRUE" })).not.toThrow();
	});
});

describe("legacy provider execution gate", () => {
	it("fails closed unless measurement is explicitly enabled and the emergency stop is clear", () => {
		expect(isLegacyProviderExecutionEnabled({})).toBe(false);
		expect(isLegacyProviderExecutionEnabled({ SELENA_MEASUREMENT_ENABLED: "false" })).toBe(false);
		expect(isLegacyProviderExecutionEnabled({ SELENA_MEASUREMENT_ENABLED: "TRUE" })).toBe(false);
		expect(
			isLegacyProviderExecutionEnabled({
				SELENA_MEASUREMENT_ENABLED: "true",
				SELENA_EMERGENCY_STOP: "true",
			}),
		).toBe(false);
		expect(isLegacyProviderExecutionEnabled({ SELENA_MEASUREMENT_ENABLED: "true" })).toBe(true);
	});

	it("never reaches provider transport while execution is stopped", async () => {
		let providerCalls = 0;
		await expect(
			executeLegacyProviderTransport(
				async () => {
					providerCalls += 1;
					return "answer";
				},
				{ SELENA_MEASUREMENT_ENABLED: "true", SELENA_EMERGENCY_STOP: "true" },
			),
		).rejects.toThrow("LEGACY_PROVIDER_EXECUTION_DISABLED");
		expect(providerCalls).toBe(0);
	});

	it("never enqueues or reschedules legacy work while execution is stopped", async () => {
		let queueCalls = 0;
		const result = await enqueueLegacyProviderWork(
			async () => {
				queueCalls += 1;
				return "job-id";
			},
			{ SELENA_MEASUREMENT_ENABLED: "false" },
		);
		expect(result).toBeUndefined();
		expect(queueCalls).toBe(0);
	});

	it("preserves transport and enqueue behavior when explicitly enabled", async () => {
		const env = { SELENA_MEASUREMENT_ENABLED: "true" };
		expect(await executeLegacyProviderTransport(async () => "answer", env)).toBe("answer");
		expect(await enqueueLegacyProviderWork(async () => "job-id", env)).toBe("job-id");
	});
});

describe("onboarding suggestion spend gate", () => {
	it("refuses a paid suggestion until the owner names the budget class", () => {
		expect(() => assertSuggestSpendAllowed({})).toThrow("SUGGEST_LLM_NOT_BUDGETED");
		expect(() => assertSuggestSpendAllowed({ SELENA_SUGGEST_LLM: "true" })).toThrow("SUGGEST_LLM_NOT_BUDGETED");
		expect(() => assertSuggestSpendAllowed({ SELENA_SUGGEST_LLM: "enabled" })).toThrow("SUGGEST_LLM_NOT_BUDGETED");
	});

	it("allows it once the class is named", () => {
		expect(() => assertSuggestSpendAllowed({ SELENA_SUGGEST_LLM: SUGGEST_FREE_BUDGET_CLASS })).not.toThrow();
	});

	it("stays refused under the global stop however it is budgeted", () => {
		expect(() =>
			assertSuggestSpendAllowed({ SELENA_SUGGEST_LLM: SUGGEST_FREE_BUDGET_CLASS, SELENA_EMERGENCY_STOP: "true" }),
		).toThrow("PROVIDER_CALLS_STOPPED");
	});
});
