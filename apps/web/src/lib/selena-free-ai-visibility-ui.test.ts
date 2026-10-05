import { describe, expect, it } from "vitest";
import {
	freeAiVisibilityCustomerError,
	freeAiVisibilityErrorCopy,
	shouldPollFreeAiVisibilityStatus,
} from "./selena-free-ai-visibility-ui";

describe("free AI visibility UI state", () => {
	it("maps server errors to stable customer states without exposing backend detail", () => {
		expect(freeAiVisibilityCustomerError(new Error("SELENA_FREE_AI_VISIBILITY_ALREADY_CLAIMED"))).toBe(
			"ALREADY_CLAIMED",
		);
		expect(freeAiVisibilityCustomerError(new Error("SELENA_FREE_AI_VISIBILITY_CAP_REACHED"))).toBe(
			"BUDGET_UNAVAILABLE",
		);
		expect(freeAiVisibilityCustomerError(new Error("unexpected provider response: https://private.example"))).toBe(
			"FAILED",
		);
	});

	it("tells a visitor in either language that the operator, not an outage, keeps the free check off", () => {
		expect(freeAiVisibilityErrorCopy("DISABLED", "ru").heading).toBe("Оператор ещё не включил бесплатную проверку");
		expect(freeAiVisibilityErrorCopy("DISABLED", "en").heading).toBe("The operator has not enabled the free check yet");
		expect(freeAiVisibilityErrorCopy("DISABLED", "en").body).not.toMatch(/not available right now/);
	});

	it("keeps the English wording of every other state and adds a Russian side", () => {
		expect(freeAiVisibilityErrorCopy("ALREADY_CLAIMED", "en")).toEqual({
			heading: "Your free check has already been used",
			body: "Each verified account can run one no-cost check across the two systems.",
		});
		for (const state of ["EMAIL_VERIFICATION_REQUIRED", "BUDGET_UNAVAILABLE", "DOMAIN_INVALID", "FAILED"] as const) {
			const ru = freeAiVisibilityErrorCopy(state, "ru");
			expect(ru.heading).toMatch(/[а-яё]/i);
			expect(ru.body).toMatch(/[а-яё]/i);
		}
	});

	it("polls only while a claimed check is still pending confirmation", () => {
		expect(shouldPollFreeAiVisibilityStatus(null)).toBe(false);
		expect(
			shouldPollFreeAiVisibilityStatus({ checkId: "check", domain: "example.com", status: "QUEUED", report: null }),
		).toBe(true);
		expect(
			shouldPollFreeAiVisibilityStatus({
				checkId: "check",
				domain: "example.com",
				status: "UNCONFIRMED",
				report: null,
			}),
		).toBe(true);
		expect(
			shouldPollFreeAiVisibilityStatus({
				checkId: "check",
				domain: "example.com",
				status: "COMPLETED",
				report: {
					schemaVersion: 1,
					promptVersion: "free-ai-visibility-v1",
					terminalStatus: "COMPLETED",
					costUsd: 0.003,
					systems: [
						{ system: "chatgpt", terminalStatus: "SUCCEEDED", domainMentioned: false, citationCount: 0 },
						{ system: "gemini", terminalStatus: "SUCCEEDED", domainMentioned: true, citationCount: 2 },
					],
				},
			}),
		).toBe(false);
	});
});
