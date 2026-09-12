import { describe, expect, it } from "vitest";
import { freeAiVisibilityCustomerError, shouldPollFreeAiVisibilityStatus } from "./selena-free-ai-visibility-ui";

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
