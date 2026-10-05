import { describe, expect, it } from "vitest";
import {
	decideFreeAutoDispatch,
	FREE_AUTO_DISPATCH_DEFAULT_PER_DAY,
	FREE_AUTO_DISPATCH_DEFAULT_PER_PROJECT_PER_DAY,
	type FreeAutoDispatchConfig,
	freeAutoDispatchConfigFromEnv,
	freeAutoDispatchStatusFor,
	freeRequestLaunch,
	pilotSeatRequestId,
} from "./free-auto-dispatch";

const enabled: FreeAutoDispatchConfig = { enabled: true, maxPerDay: 3, maxPerProjectPerDay: 1 };

describe("free auto-dispatch", () => {
	it("stays off until the flag is set, whatever else is true", () => {
		expect(freeAutoDispatchConfigFromEnv({}).enabled).toBe(false);
		expect(freeAutoDispatchConfigFromEnv({ SELENA_FREE_AUTO_DISPATCH_ENABLED: "1" }).enabled).toBe(false);
		expect(
			decideFreeAutoDispatch({
				config: { ...enabled, enabled: false },
				promoApplied: true,
				dispatchedToday: 0,
				dispatchedTodayForProject: 0,
			}),
		).toEqual({ dispatch: false, reason: "DISABLED" });
	});

	it("dispatches a free request that is inside both caps", () => {
		expect(
			decideFreeAutoDispatch({
				config: enabled,
				promoApplied: true,
				dispatchedToday: 2,
				dispatchedTodayForProject: 0,
			}),
		).toEqual({ dispatch: true });
	});

	it("refuses a request that is not free — a paid order still goes through the desk", () => {
		expect(
			decideFreeAutoDispatch({
				config: enabled,
				promoApplied: false,
				dispatchedToday: 0,
				dispatchedTodayForProject: 0,
			}),
		).toEqual({ dispatch: false, reason: "NOT_FREE" });
	});

	it("stops at the daily cap and at the per-project cap", () => {
		expect(
			decideFreeAutoDispatch({
				config: enabled,
				promoApplied: true,
				dispatchedToday: 3,
				dispatchedTodayForProject: 0,
			}),
		).toEqual({ dispatch: false, reason: "DAILY_CAP" });
		expect(
			decideFreeAutoDispatch({
				config: enabled,
				promoApplied: true,
				dispatchedToday: 0,
				dispatchedTodayForProject: 1,
			}),
		).toEqual({ dispatch: false, reason: "PROJECT_CAP" });
	});

	it("treats a zero cap as never, not as unlimited", () => {
		expect(
			decideFreeAutoDispatch({
				config: { enabled: true, maxPerDay: 0, maxPerProjectPerDay: 0 },
				promoApplied: true,
				dispatchedToday: 0,
				dispatchedTodayForProject: 0,
			}),
		).toEqual({ dispatch: false, reason: "DAILY_CAP" });
	});

	it("falls back to the conservative caps when the env values are unusable", () => {
		const config = freeAutoDispatchConfigFromEnv({
			SELENA_FREE_AUTO_DISPATCH_ENABLED: "true",
			SELENA_FREE_AUTO_DISPATCH_MAX_PER_DAY: "lots",
			SELENA_FREE_AUTO_DISPATCH_MAX_PER_PROJECT_PER_DAY: "-4",
		});
		expect(config.maxPerDay).toBe(FREE_AUTO_DISPATCH_DEFAULT_PER_DAY);
		expect(config.maxPerProjectPerDay).toBe(FREE_AUTO_DISPATCH_DEFAULT_PER_PROJECT_PER_DAY);
	});

	it("reads caps the owner set explicitly", () => {
		expect(
			freeAutoDispatchConfigFromEnv({
				SELENA_FREE_AUTO_DISPATCH_ENABLED: "true",
				SELENA_FREE_AUTO_DISPATCH_MAX_PER_DAY: "10",
				SELENA_FREE_AUTO_DISPATCH_MAX_PER_PROJECT_PER_DAY: "2",
			}),
		).toEqual({ enabled: true, maxPerDay: 10, maxPerProjectPerDay: 2 });
	});
});

describe("one pilot seat, one request", () => {
	const digest = "a".repeat(64);

	it("gives every submission of a code by one workspace the same request id", () => {
		expect(pilotSeatRequestId("org-1", digest)).toBe(pilotSeatRequestId("org-1", digest));
		expect(pilotSeatRequestId("org-1", digest)).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});

	it("never lets two workspaces or two codes share a request", () => {
		expect(pilotSeatRequestId("org-1", digest)).not.toBe(pilotSeatRequestId("org-2", digest));
		expect(pilotSeatRequestId("org-1", digest)).not.toBe(pilotSeatRequestId("org-1", "b".repeat(64)));
	});
});

describe("what the client is told about a free request", () => {
	it("calls a run queued only when a run reached the queue", () => {
		expect(freeRequestLaunch({ orderStatus: "QUEUED", runsQueued: true })).toEqual({
			state: "QUEUED",
			orderStatus: "QUEUED",
		});
		expect(freeRequestLaunch({ orderStatus: "QUEUED", runsQueued: false })).toEqual({
			state: "AWAITING_OPERATOR",
			orderStatus: "QUEUED",
		});
	});

	it("reports an order stopped before approval as waiting for the operator, not as started", () => {
		const launch = freeRequestLaunch({ orderStatus: "PAID_REVIEW_REQUIRED", runsQueued: false });
		expect(launch.state).toBe("AWAITING_OPERATOR");
		expect(freeAutoDispatchStatusFor(launch)).toBe("AUTO_AWAITING_OPERATOR");
	});

	it("reports no order as not started, with the reason", () => {
		const launch = freeRequestLaunch({ orderStatus: null, runsQueued: false, notStartedReason: "PROJECT_CAP" });
		expect(launch).toEqual({ state: "NOT_STARTED", reason: "PROJECT_CAP" });
		expect(freeAutoDispatchStatusFor(launch)).toBe("AUTO_FAILED");
	});

	it("follows the order to review and to the report", () => {
		expect(freeRequestLaunch({ orderStatus: "QC_REQUIRED", runsQueued: true }).state).toBe("IN_REVIEW");
		expect(freeRequestLaunch({ orderStatus: "READY", runsQueued: true }).state).toBe("READY");
		expect(freeRequestLaunch({ orderStatus: "CANCELLED", runsQueued: true }).state).toBe("STOPPED");
	});
});
