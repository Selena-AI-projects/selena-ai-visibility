import { sha256HexSync } from "./sha256.js";
/**
 * When a promo code makes a measurement free, the human approval step in the
 * order desk is no longer protecting a payment — the customer's own questions
 * about the customer's own project cost them nothing. This decides whether such
 * a request may start on its own, and it is deliberately hard to say yes:
 *
 *   - the flag is default-off, so a deploy alone never starts a run;
 *   - only a free request qualifies — a paid one still goes through the desk;
 *   - two daily caps bound the worst case if a code leaks.
 *
 * Everything here is a pure decision. The caller supplies today's counts and
 * performs the dispatch; nothing in this module reaches a database or provider.
 * In the application the two caps are counted and decided by one database
 * claim (sv_claim_free_auto_dispatch), because they span every tenant; the
 * counts here let the same rule be read and tested without one.
 */

export type FreeAutoDispatchConfig = {
	enabled: boolean;
	maxPerDay: number;
	maxPerProjectPerDay: number;
};

/** Small enough that a leaked code costs a few dollars, not a budget. */
export const FREE_AUTO_DISPATCH_DEFAULT_PER_DAY = 3;
export const FREE_AUTO_DISPATCH_DEFAULT_PER_PROJECT_PER_DAY = 1;

function readCap(raw: string | undefined, fallback: number): number {
	if (raw === undefined || raw.trim() === "") return fallback;
	const parsed = Number(raw);
	// A malformed cap must not read as "unlimited": an unparseable value falls
	// back to the conservative default rather than to no limit at all.
	if (!Number.isInteger(parsed) || parsed < 0) return fallback;
	return parsed;
}

export function freeAutoDispatchConfigFromEnv(env: Record<string, string | undefined>): FreeAutoDispatchConfig {
	return {
		enabled: env.SELENA_FREE_AUTO_DISPATCH_ENABLED === "true",
		maxPerDay: readCap(env.SELENA_FREE_AUTO_DISPATCH_MAX_PER_DAY, FREE_AUTO_DISPATCH_DEFAULT_PER_DAY),
		maxPerProjectPerDay: readCap(
			env.SELENA_FREE_AUTO_DISPATCH_MAX_PER_PROJECT_PER_DAY,
			FREE_AUTO_DISPATCH_DEFAULT_PER_PROJECT_PER_DAY,
		),
	};
}

export const freeAutoDispatchRefusals = ["DISABLED", "NOT_FREE", "DAILY_CAP", "PROJECT_CAP"] as const;
export type FreeAutoDispatchRefusal = (typeof freeAutoDispatchRefusals)[number];

export type FreeAutoDispatchDecision = { dispatch: true } | { dispatch: false; reason: FreeAutoDispatchRefusal };

export function decideFreeAutoDispatch(input: {
	config: FreeAutoDispatchConfig;
	promoApplied: boolean;
	dispatchedToday: number;
	dispatchedTodayForProject: number;
}): FreeAutoDispatchDecision {
	if (!input.config.enabled) return { dispatch: false, reason: "DISABLED" };
	if (!input.promoApplied) return { dispatch: false, reason: "NOT_FREE" };
	if (input.dispatchedToday >= input.config.maxPerDay) return { dispatch: false, reason: "DAILY_CAP" };
	if (input.dispatchedTodayForProject >= input.config.maxPerProjectPerDay)
		return { dispatch: false, reason: "PROJECT_CAP" };
	return { dispatch: true };
}

/**
 * Statuses an auto-dispatched request carries on the operator's inbox. A
 * refusal or a failure stays visible as ordinary work to pick up by hand, which
 * is why neither of them closes the request.
 */
export const freeAutoDispatchStatuses = ["AUTO_QUEUED", "AUTO_AWAITING_OPERATOR", "AUTO_FAILED"] as const;
export type FreeAutoDispatchStatus = (typeof freeAutoDispatchStatuses)[number];

/**
 * The request a pilot seat makes, as a UUID derived from the workspace and the
 * seat's code digest. Every submission of the same code by the same workspace
 * — a double click, two tabs, a retry after an error — lands on one request
 * row, so on the one dispatch slot and the one order that request keys.
 */
export function pilotSeatRequestId(organizationId: string, codeHash: string): string {
	const hex = sha256HexSync(`selena-pilot-seat-request:${organizationId}:${codeHash}`);
	const variant = ((Number.parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** What the client is told about a free request, read off the order it produced. */
export type FreeRequestLaunch =
	| { state: "NOT_STARTED"; reason: string }
	/** Another submission of the same request is starting it right now. */
	| { state: "STARTING" }
	| { state: "AWAITING_OPERATOR" | "QUEUED" | "RUNNING" | "IN_REVIEW" | "READY" | "STOPPED"; orderStatus: string };

/**
 * The launch state of a free request, from the facts rather than from how far
 * the request handler got: a handler that crashed after queueing still left a
 * queued order, and one that stopped at preflight left an order the operator
 * must release. `runsQueued` is whether any run of the order reached the queue.
 */
export function freeRequestLaunch(input: {
	orderStatus: string | null;
	runsQueued: boolean;
	notStartedReason?: string;
}): FreeRequestLaunch {
	const { orderStatus } = input;
	if (orderStatus === null) return { state: "NOT_STARTED", reason: input.notStartedReason ?? "NO_ORDER" };
	if (orderStatus === "QUEUED") return { state: input.runsQueued ? "QUEUED" : "AWAITING_OPERATOR", orderStatus };
	if (orderStatus === "RUNNING" || orderStatus === "ANALYZING") return { state: "RUNNING", orderStatus };
	if (orderStatus === "QC_REQUIRED") return { state: "IN_REVIEW", orderStatus };
	if (orderStatus === "READY" || orderStatus === "DELIVERED") return { state: "READY", orderStatus };
	if (orderStatus === "CANCELLED" || orderStatus === "CARDINALITY_INCIDENT") return { state: "STOPPED", orderStatus };
	return { state: "AWAITING_OPERATOR", orderStatus };
}

/** The inbox status a request carries once its launch state is known. */
export function freeAutoDispatchStatusFor(launch: FreeRequestLaunch): FreeAutoDispatchStatus {
	if (launch.state === "NOT_STARTED") return "AUTO_FAILED";
	if (launch.state === "AWAITING_OPERATOR" || launch.state === "STARTING") return "AUTO_AWAITING_OPERATOR";
	return "AUTO_QUEUED";
}
