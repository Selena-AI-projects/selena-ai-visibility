import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { analyzeBrand, boss, dbUpdate, getProvider, listAuth0Accounts, parseScrapeTargets, syncAuth0User } = vi.hoisted(
	() => ({
		analyzeBrand: vi.fn(),
		boss: { send: vi.fn() },
		dbUpdate: vi.fn(),
		getProvider: vi.fn(),
		listAuth0Accounts: vi.fn(),
		parseScrapeTargets: vi.fn(),
		syncAuth0User: vi.fn(),
	}),
);

vi.mock("../../../../worker/src/boss", () => ({ default: boss }));
vi.mock("@workspace/lib/db/db", () => ({
	db: {
		query: {},
		select: vi.fn(),
		transaction: vi.fn(),
		update: dbUpdate,
	},
}));
vi.mock("@workspace/lib/onboarding", () => ({ analyzeBrand }));
vi.mock("@workspace/lib/providers", () => ({ getProvider, parseScrapeTargets }));
vi.mock("@workspace/lib/db/auth-sync", () => ({ listAuth0Accounts }));
vi.mock("@workspace/whitelabel/auth-hooks", () => ({ syncAuth0User }));

import { processPromptJob } from "../../../../worker/src/jobs/process-prompt";
import { scheduleMaintenanceJob } from "../../../../worker/src/jobs/schedule-maintenance";
import { syncAuth0MembershipsJob } from "../../../../worker/src/jobs/sync-auth0-memberships";
import { processReportJob } from "../../../../worker/src/report-worker";

describe("legacy worker provider gate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("drops process-prompt jobs before provider resolution or self-rescheduling when execution is off", async () => {
		await processPromptJob([{ data: { promptId: "prompt-1" } }] as never);

		expect(parseScrapeTargets).not.toHaveBeenCalled();
		expect(getProvider).not.toHaveBeenCalled();
		expect(boss.send).not.toHaveBeenCalled();
	});

	it("preserves process-prompt handler startup when execution is explicitly enabled", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		parseScrapeTargets.mockReturnValue([]);

		await processPromptJob([]);

		expect(parseScrapeTargets).toHaveBeenCalledOnce();
	});

	it("drops stale maintenance jobs before database work or process-prompt enqueue while stopped", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "true");
		vi.stubEnv("SCHEDULE_MAINTENANCE_ENABLED", "true");

		await scheduleMaintenanceJob([{ data: { source: "scheduled" } }] as never);

		expect(parseScrapeTargets).not.toHaveBeenCalled();
		expect(dbUpdate).not.toHaveBeenCalled();
		expect(boss.send).not.toHaveBeenCalled();
	});

	it("drops stale Auth0 sync jobs while recurring execution is not explicitly enabled", async () => {
		await syncAuth0MembershipsJob([{ data: { source: "scheduled" } }] as never);

		expect(listAuth0Accounts).not.toHaveBeenCalled();
		expect(syncAuth0User).not.toHaveBeenCalled();
	});

	it("drops report jobs before database work, analysis, or provider transport under emergency stop", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "true");
		const log = vi.fn();

		const result = await processReportJob({
			data: {
				reportId: "report-1",
				organizationId: "org-1",
				brandName: "KORA",
				brandWebsite: "https://example.com",
			},
			log,
			updateProgress: vi.fn(),
		});

		expect(result).toEqual({
			success: false,
			reportId: "report-1",
			reason: "LEGACY_PROVIDER_EXECUTION_DISABLED",
		});
		expect(dbUpdate).not.toHaveBeenCalled();
		expect(parseScrapeTargets).not.toHaveBeenCalled();
		expect(analyzeBrand).not.toHaveBeenCalled();
		expect(getProvider).not.toHaveBeenCalled();
	});
});
