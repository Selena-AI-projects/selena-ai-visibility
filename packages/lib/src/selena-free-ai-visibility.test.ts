import { describe, expect, it, vi } from "vitest";
import {
	claimFreeAiVisibilityCheck,
	executeFreeAiVisibilityCheck,
	FREE_AI_VISIBILITY_COST_USD,
	FREE_AI_VISIBILITY_PROMPT_VERSION,
	serializeFreeAiVisibilityReport,
} from "./selena-free-ai-visibility";

describe("free AI visibility check", () => {
	it("serializes only the safe report fields", () => {
		const report = serializeFreeAiVisibilityReport({
			domain: "example.com",
			outcomes: {
				chatgpt: {
					dispatchKey: "chatgpt",
					status: "SUCCEEDED",
					validity: "VALID",
					answer: { text: "Visit example.com", retainUntil: new Date() },
					sources: [{ url: "https://private.example/path", domain: "private.example" }],
					rawResponseReference: "brightdata:private-provider-handle",
				},
				gemini: { dispatchKey: "gemini", status: "FAILED", validity: "INVALID", invalidReason: "provider body" },
			},
		});

		expect(report).toEqual({
			schemaVersion: 1,
			promptVersion: FREE_AI_VISIBILITY_PROMPT_VERSION,
			terminalStatus: "COMPLETED",
			costUsd: FREE_AI_VISIBILITY_COST_USD,
			systems: [
				{ system: "chatgpt", terminalStatus: "SUCCEEDED", domainMentioned: true, citationCount: 1 },
				{ system: "gemini", terminalStatus: "FAILED", domainMentioned: false, citationCount: 0 },
			],
		});
		expect(JSON.stringify(report)).not.toContain("private");
	});

	it("executes the fixed ChatGPT and Gemini pair once without retries", async () => {
		const execute = vi
			.fn()
			.mockRejectedValueOnce(new Error("first call failed"))
			.mockResolvedValueOnce({ dispatchKey: "gemini", status: "SUCCEEDED", validity: "VALID" });
		const report = await executeFreeAiVisibilityCheck({ domain: "example.com", execute });

		expect(execute).toHaveBeenCalledTimes(2);
		expect(execute.mock.calls.map(([system]) => system)).toEqual(["chatgpt", "gemini"]);
		expect(execute.mock.calls.every(([, prompt]) => prompt.includes("example.com"))).toBe(true);
		expect(report.systems).toEqual([
			{ system: "chatgpt", terminalStatus: "FAILED", domainMentioned: false, citationCount: 0 },
			{ system: "gemini", terminalStatus: "SUCCEEDED", domainMentioned: false, citationCount: 0 },
		]);
	});

	it("returns the global cap refusal without treating it as a claim", async () => {
		const result = await claimFreeAiVisibilityCheck(
			{ execute: async () => ({ rows: [{ receipt: { decision: "REFUSED_OVER_CAP" } }] }) },
			{ userId: "user-1", organizationId: "org-1", domain: "example.com" },
		);
		expect(result).toEqual({ decision: "REFUSED_OVER_CAP" });
	});
});
