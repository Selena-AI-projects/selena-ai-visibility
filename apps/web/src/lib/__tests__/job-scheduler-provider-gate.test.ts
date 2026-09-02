import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { boss, getBoss } = vi.hoisted(() => {
	const boss = {
		send: vi.fn(async () => "job-id"),
		unschedule: vi.fn(async () => undefined),
	};
	return { boss, getBoss: vi.fn(async () => boss) };
});

vi.mock("@/lib/boss-client", () => ({ getBoss }));
vi.mock("@workspace/lib/db/db", () => ({
	db: {
		query: {
			prompts: { findFirst: vi.fn() },
			brands: { findFirst: vi.fn() },
		},
	},
}));

import {
	createPromptJobScheduler,
	scheduleNextPromptRun,
	sendImmediatePromptJob,
	sendReportJob,
} from "@/lib/job-scheduler";

describe("legacy provider job scheduling gate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("does not touch the queue when measurement execution is not explicitly enabled", async () => {
		expect(await createPromptJobScheduler("prompt-1")).toBe(false);
		expect(await sendImmediatePromptJob("prompt-1")).toBe(false);
		expect(await scheduleNextPromptRun("prompt-1", 24)).toBe(false);
		expect(await sendReportJob("report-1", "KORA", "https://example.com")).toBe(false);

		expect(getBoss).not.toHaveBeenCalled();
		expect(boss.send).not.toHaveBeenCalled();
	});

	it("does not touch the queue when the emergency stop overrides an enabled measurement flag", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "true");

		expect(await sendReportJob("report-1", "KORA", "https://example.com")).toBe(false);
		expect(getBoss).not.toHaveBeenCalled();
		expect(boss.send).not.toHaveBeenCalled();
	});

	it("preserves report enqueue behavior when execution is explicitly enabled", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");

		expect(await sendReportJob("report-1", "KORA", "https://example.com", ["best food hall"])).toBe(true);
		expect(boss.send).toHaveBeenCalledWith(
			"generate-report",
			{
				reportId: "report-1",
				brandName: "KORA",
				brandWebsite: "https://example.com",
				manualPrompts: ["best food hall"],
			},
			expect.objectContaining({ retryLimit: 3 }),
		);
	});
});
