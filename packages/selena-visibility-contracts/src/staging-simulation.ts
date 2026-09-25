import { z } from "zod";

/**
 * The staging verification simulation: a payment event that never charges, a
 * subscription that never renews, a Telegram recipient bound by a single-use
 * link, a sample report that is not a measurement, and one digest delivered
 * under a bounded retry schedule.
 *
 * Everything in this module is pure. It holds no database handle, no queue
 * client and no network transport, so the rules below can be exercised with an
 * injected clock and can never, by construction, reach a paid provider. The
 * effectful adapters live in `packages/lib` and `apps/web`; they import these
 * decisions rather than restating them.
 *
 * Architecture v1.4 §11 keeps production Telegram delivery on HOLD. Nothing
 * here lifts that: the guards below refuse to run outside a staging
 * environment that has explicitly opted in, and every record they describe
 * carries the four markers that make its test origin unmistakable.
 */

export const SIMULATION_ENVIRONMENT = "staging" as const;
export const SIMULATION_MODE = "test" as const;
export const SIMULATION_SOURCE_STATUS = "sample" as const;

/**
 * The four markers every simulated record carries. They are asserted on write
 * and re-asserted before delivery: a row that loses one of them is not
 * deliverable, so a real measurement can never be mistaken for this fixture or
 * ride its delivery path.
 */
export const simulationMarkersSchema = z.strictObject({
	environment: z.literal(SIMULATION_ENVIRONMENT),
	mode: z.literal(SIMULATION_MODE),
	sourceStatus: z.literal(SIMULATION_SOURCE_STATUS),
	notAMeasurement: z.literal(true),
});
export type SimulationMarkers = z.infer<typeof simulationMarkersSchema>;

export const SIMULATION_MARKERS: SimulationMarkers = Object.freeze({
	environment: SIMULATION_ENVIRONMENT,
	mode: SIMULATION_MODE,
	sourceStatus: SIMULATION_SOURCE_STATUS,
	notAMeasurement: true,
});

export function assertSimulationMarkers(value: unknown): asserts value is SimulationMarkers {
	const parsed = simulationMarkersSchema.safeParse(value);
	if (!parsed.success) throw new Error("SELENA_SIMULATION_MARKERS_INVALID");
}

// ---------------------------------------------------------------------------
// Environment gate
// ---------------------------------------------------------------------------

/**
 * Where the simulation may run. Two independent conditions must both hold: the
 * deployment identifies itself as the one staging environment this feature is
 * built for, and the owner has switched it on. The name is read from what
 * Railway injects before what the service sets for itself, so a deployment
 * cannot rename itself into eligibility.
 */
export type SimulationEnvironment = { enabled: boolean; environmentName: string };

export function simulationEnvironmentFromEnv(env: Record<string, string | undefined>): SimulationEnvironment {
	const environmentName = (env.RAILWAY_ENVIRONMENT_NAME ?? env.ENVIRONMENT ?? "").trim().toLowerCase();
	return { enabled: env.SELENA_STAGING_SIMULATION_ENABLED === "true", environmentName };
}

export function isSimulationEnvironment(environmentName: string): boolean {
	return environmentName.trim().toLowerCase() === SIMULATION_ENVIRONMENT;
}

/**
 * Admits only the named staging environment. Naming the one environment that
 * may run this, rather than listing the ones that may not, is what makes the
 * gate safe to carry forward: an environment nobody anticipated — a preview, a
 * clone, a renamed production — is refused because it was never admitted,
 * not because someone remembered to add its name to a list.
 *
 * An unnamed environment gets its own code, because "this deployment tells us
 * nothing about where it runs" is an operator's misconfiguration to fix, while
 * a named non-staging environment is a decision that stands.
 */
export function assertSimulationAllowed(environment: SimulationEnvironment): void {
	if (environment.environmentName.length === 0) throw new Error("SELENA_SIMULATION_ENVIRONMENT_UNKNOWN");
	if (!isSimulationEnvironment(environment.environmentName))
		throw new Error("SELENA_SIMULATION_ENVIRONMENT_NOT_ALLOWED");
	if (!environment.enabled) throw new Error("SELENA_SIMULATION_DISABLED");
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

function hex(bytes: Uint8Array): string {
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Compares two hex digests without leaking, through timing, how far the first
 * difference is. The length is compared first because an attacker already
 * knows the digest length of a published algorithm.
 */
export function constantTimeEquals(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
	return difference === 0;
}

export async function signPayload(payload: string, secret: string): Promise<string> {
	if (!secret) throw new Error("SELENA_SIMULATION_SIGNING_SECRET_MISSING");
	const key = await globalThis.crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const digest = new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
	return hex(digest);
}

export async function verifyPayloadSignature(payload: string, signature: string, secret: string): Promise<boolean> {
	if (!payload || !signature || !secret) return false;
	const presented = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
	return constantTimeEquals(await signPayload(payload, secret), presented.trim().toLowerCase());
}

export async function sha256Hex(value: string): Promise<string> {
	const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
	return hex(digest);
}

/**
 * The value Telegram echoes back on every update.
 *
 * Telegram accepts only letters, digits, underscore and hyphen here and
 * rejects the whole registration otherwise — a rule an operator choosing a
 * secret has no reason to know. Hashing the configured secret satisfies it
 * whatever they typed, and has the better property that the secret itself
 * never leaves the deployment holding it: what travels to Telegram is a
 * derived value, domain-separated so it cannot double as a plain digest of
 * the secret in another context.
 */
export async function telegramWebhookHeaderToken(secret: string): Promise<string> {
	if (!secret) throw new Error("SELENA_TELEGRAM_WEBHOOK_SECRET_MISSING");
	return sha256Hex(`selena-telegram-webhook ${secret}`);
}

// ---------------------------------------------------------------------------
// Simulated payment event
// ---------------------------------------------------------------------------

/**
 * The plan identifiers a payment event may name, mapped to the catalog. The
 * short names are what a payment provider's metadata would realistically
 * carry; the catalog id is what the subscription stores.
 */
export const SIMULATED_PLAN_IDS = {
	landscape: "full-discovery-landscape",
	"visibility-snapshot": "visibility-snapshot",
	local: "visibility-snapshot",
	"visitor-local": "visibility-snapshot",
	"full-ai-landscape": "full-discovery-landscape",
	"full-discovery-landscape": "full-discovery-landscape",
} as const satisfies Record<string, "visibility-snapshot" | "full-discovery-landscape">;

export type SimulatedPlanKey = keyof typeof SIMULATED_PLAN_IDS;
export type SimulatedPlanId = (typeof SIMULATED_PLAN_IDS)[SimulatedPlanKey];

/** The price each plan must present, in whole US dollars. */
export const SIMULATED_PLAN_PRICES: Record<SimulatedPlanId, number> = Object.freeze({
	"visibility-snapshot": 49,
	"full-discovery-landscape": 79,
});

export const simulatedPaymentEventSchema = z.strictObject({
	event_id: z
		.string()
		.trim()
		.min(8)
		.max(128)
		.regex(/^[A-Za-z0-9._:-]+$/, "SELENA_SIMULATION_EVENT_ID_INVALID"),
	event_type: z.literal("payment_succeeded"),
	environment: z.literal(SIMULATION_ENVIRONMENT),
	mode: z.literal(SIMULATION_MODE),
	customer_id: z.string().trim().min(1).max(160),
	project_id: z.string().trim().min(1).max(160),
	plan: z.enum(Object.keys(SIMULATED_PLAN_IDS) as [SimulatedPlanKey, ...SimulatedPlanKey[]]),
	amount: z.number().int().nonnegative().max(100_000),
	currency: z.literal("USD"),
	occurred_at: z.iso.datetime(),
});
export type SimulatedPaymentEvent = z.infer<typeof simulatedPaymentEventSchema>;

export function parseSimulatedPaymentEvent(value: unknown): SimulatedPaymentEvent {
	const parsed = simulatedPaymentEventSchema.safeParse(value);
	if (!parsed.success) throw new Error("SELENA_SIMULATION_EVENT_INVALID");
	const planId = SIMULATED_PLAN_IDS[parsed.data.plan];
	if (parsed.data.amount !== SIMULATED_PLAN_PRICES[planId]) throw new Error("SELENA_SIMULATION_EVENT_AMOUNT_MISMATCH");
	return parsed.data;
}

// ---------------------------------------------------------------------------
// Subscription activation contract
// ---------------------------------------------------------------------------

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED"] as const;
export type SimulatedSubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * What one accepted payment event asks the product to do. A real provider
 * webhook produces this same shape from its own payload, which is why the
 * activation service takes the intent rather than the raw event: the parsing
 * differs per provider, the activation must not.
 */
export type SubscriptionActivationIntent = {
	provider: string;
	providerEventId: string;
	customerId: string;
	projectRef: string;
	planId: SimulatedPlanId;
	amountUsd: number;
	currency: "USD";
	occurredAt: string;
	markers: SimulationMarkers;
};

export const SIMULATION_PAYMENT_PROVIDER = "staging-simulator" as const;

export function subscriptionActivationFromEvent(event: SimulatedPaymentEvent): SubscriptionActivationIntent {
	return {
		provider: SIMULATION_PAYMENT_PROVIDER,
		providerEventId: event.event_id,
		customerId: event.customer_id,
		projectRef: event.project_id,
		planId: SIMULATED_PLAN_IDS[event.plan],
		amountUsd: event.amount,
		currency: event.currency,
		occurredAt: event.occurred_at,
		markers: SIMULATION_MARKERS,
	};
}

/**
 * The decision an activation makes against what is already stored. A second
 * delivery of the same event is a replay, never a second subscription: the
 * provider event id is the identity, so a provider that retries its webhook
 * cannot double-activate.
 */
export type SubscriptionActivationDecision =
	| { kind: "ACTIVATE" }
	| { kind: "REPLAY"; subscriptionId: string }
	| { kind: "CONFLICT"; code: "SELENA_SIMULATION_EVENT_REUSED" };

export function resolveSubscriptionActivation(
	intent: SubscriptionActivationIntent,
	existing: { subscriptionId: string; providerEventId: string; planId: string; projectRef: string } | null,
): SubscriptionActivationDecision {
	if (!existing) return { kind: "ACTIVATE" };
	const sameRequest =
		existing.providerEventId === intent.providerEventId &&
		existing.planId === intent.planId &&
		existing.projectRef === intent.projectRef;
	return sameRequest
		? { kind: "REPLAY", subscriptionId: existing.subscriptionId }
		: { kind: "CONFLICT", code: "SELENA_SIMULATION_EVENT_REUSED" };
}

/**
 * A simulated subscription never authorises spend. This is asserted where the
 * subscription is read, not only where it is written, so a row edited by hand
 * still cannot unlock a measurement.
 */
export function assertSimulatedSubscriptionCannotMeasure(subscription: { markers: unknown }): void {
	assertSimulationMarkers(subscription.markers);
}

// ---------------------------------------------------------------------------
// Telegram connect token
// ---------------------------------------------------------------------------

export const CONNECT_TOKEN_TTL_MS = 15 * 60 * 1000;
const CONNECT_TOKEN_VERSION = "v1";

/**
 * What a connect link proves. The link is bound to one user, one project and
 * one environment; the nonce makes it single-use once the binding records it.
 * Telegram deep links carry the payload in a `start` parameter, so it stays
 * URL-safe and short.
 */
export type ConnectTokenClaims = {
	tenantId: string;
	userId: string;
	projectId: string;
	environment: typeof SIMULATION_ENVIRONMENT;
	nonce: string;
	issuedAtMs: number;
	expiresAtMs: number;
};

const claimsSchema = z.strictObject({
	tenantId: z.string().trim().min(1).max(160),
	userId: z.string().trim().min(1).max(160),
	projectId: z.string().trim().min(1).max(160),
	environment: z.literal(SIMULATION_ENVIRONMENT),
	nonce: z
		.string()
		.trim()
		.min(16)
		.max(64)
		.regex(/^[A-Za-z0-9_-]+$/),
	issuedAtMs: z.number().int().positive(),
	expiresAtMs: z.number().int().positive(),
});

function base64UrlEncode(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
	const padded = value
		.replaceAll("-", "+")
		.replaceAll("_", "/")
		.padEnd(Math.ceil(value.length / 4) * 4, "=");
	const binary = atob(padded);
	const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

export function buildConnectTokenClaims(input: {
	tenantId: string;
	userId: string;
	projectId: string;
	nonce: string;
	now: Date;
	ttlMs?: number;
}): ConnectTokenClaims {
	const issuedAtMs = input.now.getTime();
	const claims: ConnectTokenClaims = {
		tenantId: input.tenantId,
		userId: input.userId,
		projectId: input.projectId,
		environment: SIMULATION_ENVIRONMENT,
		nonce: input.nonce,
		issuedAtMs,
		expiresAtMs: issuedAtMs + (input.ttlMs ?? CONNECT_TOKEN_TTL_MS),
	};
	const parsed = claimsSchema.safeParse(claims);
	if (!parsed.success) throw new Error("SELENA_CONNECT_TOKEN_CLAIMS_INVALID");
	return claims;
}

/** `v1.<base64url(claims)>.<hmac>` — the signature covers version and claims together. */
export async function signConnectToken(claims: ConnectTokenClaims, secret: string): Promise<string> {
	const body = `${CONNECT_TOKEN_VERSION}.${base64UrlEncode(JSON.stringify(claims))}`;
	return `${body}.${await signPayload(body, secret)}`;
}

export type ConnectTokenVerification =
	| { ok: true; claims: ConnectTokenClaims }
	| {
			ok: false;
			code:
				| "SELENA_CONNECT_TOKEN_MALFORMED"
				| "SELENA_CONNECT_TOKEN_SIGNATURE_INVALID"
				| "SELENA_CONNECT_TOKEN_EXPIRED"
				| "SELENA_CONNECT_TOKEN_ENVIRONMENT_MISMATCH";
	  };

/**
 * Verifies signature first, then expiry. A tampered token is reported as a bad
 * signature even when its edited claims have also expired, because the
 * signature is the only field an attacker cannot choose.
 */
export async function verifyConnectToken(token: string, secret: string, now: Date): Promise<ConnectTokenVerification> {
	const parts = token.split(".");
	if (parts.length !== 3 || parts[0] !== CONNECT_TOKEN_VERSION)
		return { ok: false, code: "SELENA_CONNECT_TOKEN_MALFORMED" };
	const body = `${parts[0]}.${parts[1]}`;
	if (!(await verifyPayloadSignature(body, parts[2] as string, secret)))
		return { ok: false, code: "SELENA_CONNECT_TOKEN_SIGNATURE_INVALID" };
	let decoded: unknown;
	try {
		decoded = JSON.parse(base64UrlDecode(parts[1] as string));
	} catch {
		return { ok: false, code: "SELENA_CONNECT_TOKEN_MALFORMED" };
	}
	const parsed = claimsSchema.safeParse(decoded);
	if (!parsed.success) {
		const environmentIssue = parsed.error.issues.some((issue) => issue.path[0] === "environment");
		return {
			ok: false,
			code: environmentIssue ? "SELENA_CONNECT_TOKEN_ENVIRONMENT_MISMATCH" : "SELENA_CONNECT_TOKEN_MALFORMED",
		};
	}
	if (parsed.data.expiresAtMs <= now.getTime()) return { ok: false, code: "SELENA_CONNECT_TOKEN_EXPIRED" };
	return { ok: true, claims: parsed.data };
}

/**
 * The stored binding a redemption is checked against. Only the token's hash is
 * kept, so the database never holds a credential that could rebind a recipient.
 */
export type StoredConnectToken = {
	tokenHash: string;
	tenantId: string;
	projectId: string;
	userId: string;
	consumedAt: Date | null;
	expiresAt: Date;
};

export type ConnectRedemptionDecision =
	| { kind: "BIND" }
	| {
			kind: "REFUSE";
			code:
				| "SELENA_CONNECT_TOKEN_UNKNOWN"
				| "SELENA_CONNECT_TOKEN_ALREADY_USED"
				| "SELENA_CONNECT_TOKEN_EXPIRED"
				| "SELENA_CONNECT_TOKEN_PROJECT_MISMATCH";
	  };

/**
 * The single-use rule. A token that has already bound a recipient is refused
 * rather than re-bound, and a token presented for a project other than the one
 * it was issued for is refused even when its signature is valid — the
 * signature proves who minted it, not what it may do.
 */
export function resolveConnectRedemption(
	claims: ConnectTokenClaims,
	stored: StoredConnectToken | null,
	now: Date,
): ConnectRedemptionDecision {
	if (!stored) return { kind: "REFUSE", code: "SELENA_CONNECT_TOKEN_UNKNOWN" };
	if (stored.tenantId !== claims.tenantId || stored.projectId !== claims.projectId || stored.userId !== claims.userId)
		return { kind: "REFUSE", code: "SELENA_CONNECT_TOKEN_PROJECT_MISMATCH" };
	if (stored.consumedAt !== null) return { kind: "REFUSE", code: "SELENA_CONNECT_TOKEN_ALREADY_USED" };
	if (stored.expiresAt.getTime() <= now.getTime()) return { kind: "REFUSE", code: "SELENA_CONNECT_TOKEN_EXPIRED" };
	return { kind: "BIND" };
}

export const RECIPIENT_BINDING_STATUSES = ["PENDING", "BOUND", "UNBOUND"] as const;
export type RecipientBindingStatus = (typeof RECIPIENT_BINDING_STATUSES)[number];

/** Telegram deep link for a bot, carrying the connect token as its start payload. */
export function telegramDeepLink(botUsername: string, token: string): string {
	const username = botUsername.trim().replace(/^@/, "");
	if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) throw new Error("SELENA_TELEGRAM_BOT_USERNAME_INVALID");
	return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}

// ---------------------------------------------------------------------------
// Sample weekly report
// ---------------------------------------------------------------------------

export const SAMPLE_ACTION_STATUSES = ["NEW", "STILL_OPEN", "NEEDS_RECHECK", "VERIFIED", "CLOSED"] as const;
export type SampleActionStatus = (typeof SAMPLE_ACTION_STATUSES)[number];

/**
 * One row of the sample report's action plan. Delivery status is deliberately
 * absent: a digest is delivered once per report, so recording a delivery state
 * per action would describe something the system never does.
 */
export const sampleActionSchema = z.strictObject({
	id: z.string().trim().min(1).max(64),
	action: z.string().trim().min(1).max(400),
	owner: z.string().trim().min(1).max(160),
	status: z.enum(SAMPLE_ACTION_STATUSES),
	evidenceIds: z.array(z.string().regex(/^EV-[A-Z0-9-]{3,32}$/)).min(1),
	recheckMethod: z.string().trim().min(1).max(400),
	before: z.string().trim().min(1).max(400),
	after: z.string().trim().min(1).max(400),
});
export type SampleAction = z.infer<typeof sampleActionSchema>;

export const sampleWeeklyReportSchema = z.strictObject({
	schemaVersion: z.literal(1),
	title: z.literal("TEST / SAMPLE DATA"),
	notice: z.literal("Not a measurement"),
	markers: simulationMarkersSchema,
	projectRef: z.string().trim().min(1).max(160),
	projectName: z.string().trim().min(1).max(160),
	periodStart: z.iso.datetime(),
	periodEnd: z.iso.datetime(),
	visibilitySummary: z.string().trim().min(1).max(400),
	recheckStatus: z.string().trim().min(1).max(200),
	actions: z.array(sampleActionSchema).min(1).max(50),
	providerCalls: z.literal(0),
});
export type SampleWeeklyReport = z.infer<typeof sampleWeeklyReportSchema>;

export function parseSampleWeeklyReport(value: unknown): SampleWeeklyReport {
	const parsed = sampleWeeklyReportSchema.safeParse(value);
	if (!parsed.success) throw new Error("SELENA_SAMPLE_REPORT_INVALID");
	return parsed.data;
}

/**
 * Builds the fixture. It reads nothing: no provider, no measurement table, no
 * clock beyond the period it is told to cover. Every action status appears at
 * least once so the digest counts below are exercised by real rows rather than
 * by a hand-written number.
 */
export function buildSampleWeeklyReport(input: {
	projectRef: string;
	projectName: string;
	periodStart: Date;
	periodEnd: Date;
}): SampleWeeklyReport {
	const report: SampleWeeklyReport = {
		schemaVersion: 1,
		title: "TEST / SAMPLE DATA",
		notice: "Not a measurement",
		markers: SIMULATION_MARKERS,
		projectRef: input.projectRef,
		projectName: input.projectName,
		periodStart: input.periodStart.toISOString(),
		periodEnd: input.periodEnd.toISOString(),
		visibilitySummary: "Sample: brand named in 6 of 25 sample answers, against 3 of 25 in the previous sample cycle",
		recheckStatus: "Recheck planned for the next comparable sample cycle under the same fixture lock",
		providerCalls: 0,
		actions: [
			{
				id: "ACT-SIM-01",
				action: "Publish one canonical service description on the homepage and About page",
				owner: "Test project owner",
				status: "VERIFIED",
				evidenceIds: ["EV-SIM-0412", "EV-SIM-0507"],
				recheckMethod: "Re-crawl of the same 3 sample pages, then the same 25 sample questions under fixture lock v1",
				before: "Sample: description differed on 2 of 3 pages",
				after: "Sample: one description on 3 of 3 pages",
			},
			{
				id: "ACT-SIM-02",
				action: "State the booking inputs before the flow starts",
				owner: "Test project developer",
				status: "NEEDS_RECHECK",
				evidenceIds: ["EV-SIM-0431"],
				recheckMethod: "Action-path check of the sample booking page in the next sample cycle",
				before: "Sample: required inputs not stated",
				after: "Sample: change recorded, not yet observed in a sample cycle",
			},
			{
				id: "ACT-SIM-03",
				action: "Publish a direct-answer FAQ page linked from the homepage",
				owner: "Test project owner",
				status: "STILL_OPEN",
				evidenceIds: ["EV-SIM-0407"],
				recheckMethod: "Same 25 sample questions under fixture lock v1, owned-page citations counted per system",
				before: "Sample: 0 of 25 sample answers cite an owned page",
				after: "Sample: not started, carried over from the previous digest",
			},
			{
				id: "ACT-SIM-04",
				action: "Remove the robots rule that blocked the rooms section",
				owner: "Test project developer",
				status: "CLOSED",
				evidenceIds: ["EV-SIM-0402", "EV-SIM-0501"],
				recheckMethod: "Sample robots file fetched again and the 4 sample room pages re-crawled",
				before: "Sample: 0 of 4 sample room pages fetchable",
				after: "Sample: 4 of 4 sample room pages fetched",
			},
			{
				id: "ACT-SIM-05",
				action: "Decide how to answer the two sample questions where a competitor is cited instead",
				owner: "Test project owner",
				status: "NEW",
				evidenceIds: ["EV-SIM-0519"],
				recheckMethod: "Same 2 sample questions under fixture lock v1 in the next sample cycle",
				before: "Sample: competitor cited in 5 of 12 sample answers to these questions",
				after: "Sample: created and assigned in this cycle, first recheck next cycle",
			},
		],
	};
	return parseSampleWeeklyReport(report);
}

// ---------------------------------------------------------------------------
// Digest
// ---------------------------------------------------------------------------

export function countActionsByStatus(report: SampleWeeklyReport): Record<SampleActionStatus, number> {
	const counts = Object.fromEntries(SAMPLE_ACTION_STATUSES.map((status) => [status, 0])) as Record<
		SampleActionStatus,
		number
	>;
	for (const action of report.actions) counts[action.status] += 1;
	return counts;
}

/**
 * The short digest. Telegram receives a summary and a link into the workspace,
 * never the report itself: the report is the authenticated surface, and a chat
 * message is not an access-controlled one.
 */
export function buildDigestMessage(input: { report: SampleWeeklyReport; workspaceUrl: string }): string {
	const counts = countActionsByStatus(input.report);
	const opened = counts.NEW;
	const closed = counts.VERIFIED + counts.CLOSED;
	const period = `${input.report.periodStart.slice(0, 10)} — ${input.report.periodEnd.slice(0, 10)}`;
	return [
		"[TEST] Selena weekly digest — sample data, not a measurement",
		"",
		`Project: ${input.report.projectName} (${input.report.projectRef})`,
		`Period: ${period}`,
		`Visibility: ${input.report.visibilitySummary}`,
		`Actions: ${opened} new, ${closed} closed, ${counts.NEEDS_RECHECK} awaiting recheck`,
		`Recheck: ${input.report.recheckStatus}`,
		"",
		`Open the saved sample report: ${input.workspaceUrl}`,
		"",
		"[TEST] Staging simulation. No measurement ran and no payment was taken.",
	].join("\n");
}

export function assertDigestIsShort(message: string): void {
	if (message.length > 3500) throw new Error("SELENA_DIGEST_TOO_LONG");
	if (!message.includes("[TEST]")) throw new Error("SELENA_DIGEST_TEST_MARKER_MISSING");
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export const DELIVERY_MAX_ATTEMPTS = 5;

/**
 * The waits between attempts, in order. There are four because the first send
 * is itself attempt one: five attempts in total leave exactly four retries.
 */
export const DELIVERY_RETRY_DELAYS_MS = Object.freeze([60_000, 300_000, 1_800_000, 7_200_000]);

export const DELIVERY_STATUSES = ["PENDING", "SENDING", "DELIVERED", "RETRY_SCHEDULED", "FAILED", "UNBOUND"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/**
 * How long a claimed delivery stays claimed. A worker marks the row SENDING
 * before it calls Telegram, so a second worker refuses; if that worker then
 * dies mid-send, nothing would ever clear the mark, and one crash would strand
 * the delivery for good. After this window another worker may take it over —
 * the attempt the dead worker consumed has already been counted, so a takeover
 * continues the schedule rather than restarting it.
 *
 * The window is far longer than a Telegram call takes and far shorter than the
 * first retry delay, so it can only ever admit a takeover that the retry
 * schedule would have admitted anyway.
 */
export const DELIVERY_CLAIM_LEASE_MS = 30_000;

export type DeliveryOutcome =
	| { kind: "SUCCESS" }
	| { kind: "TEMPORARY_FAILURE"; detail: string }
	| { kind: "RECIPIENT_GONE"; detail: string };

/**
 * How Telegram's answer is read. 403 and "chat not found" mean the recipient
 * can no longer be reached at all, so the binding is dropped and retrying
 * would only repeat a refusal; everything else is treated as temporary,
 * because a send that failed for an unknown reason may still succeed later.
 */
export function classifyTelegramResponse(input: {
	ok: boolean;
	httpStatus: number;
	description?: string;
}): DeliveryOutcome {
	if (input.ok && input.httpStatus >= 200 && input.httpStatus < 300) return { kind: "SUCCESS" };
	const description = (input.description ?? "").toLowerCase();
	if (input.httpStatus === 403 || description.includes("chat not found") || description.includes("bot was blocked"))
		return { kind: "RECIPIENT_GONE", detail: input.description ?? `http_${input.httpStatus}` };
	return { kind: "TEMPORARY_FAILURE", detail: input.description ?? `http_${input.httpStatus}` };
}

export type DeliveryDecision =
	| { kind: "DELIVERED" }
	| { kind: "RETRY"; attempt: number; nextAttemptAt: Date }
	| { kind: "STOP"; status: "FAILED" | "UNBOUND"; reason: string };

/**
 * What to do after one attempt. `attempt` is the number of the attempt that
 * just ran, so the cap is reached when it equals the maximum: there is no
 * delay left to schedule and delivery stops.
 */
export function decideNextDelivery(input: { attempt: number; outcome: DeliveryOutcome; now: Date }): DeliveryDecision {
	if (input.attempt < 1 || input.attempt > DELIVERY_MAX_ATTEMPTS)
		throw new Error("SELENA_DELIVERY_ATTEMPT_OUT_OF_RANGE");
	if (input.outcome.kind === "SUCCESS") return { kind: "DELIVERED" };
	if (input.outcome.kind === "RECIPIENT_GONE") return { kind: "STOP", status: "UNBOUND", reason: input.outcome.detail };
	if (input.attempt >= DELIVERY_MAX_ATTEMPTS)
		return { kind: "STOP", status: "FAILED", reason: "SELENA_DELIVERY_ATTEMPTS_EXHAUSTED" };
	const delay = DELIVERY_RETRY_DELAYS_MS[input.attempt - 1];
	if (delay === undefined) throw new Error("SELENA_DELIVERY_SCHEDULE_EXHAUSTED");
	return { kind: "RETRY", attempt: input.attempt + 1, nextAttemptAt: new Date(input.now.getTime() + delay) };
}

/**
 * The ordering rule of v1.4 §11.2: the report exists in the workspace before
 * anything is sent, and a delivery already completed is never sent twice. Both
 * are checked at the moment of sending rather than only when the job is
 * created, so a redelivered job re-reads the state it depends on.
 */
export type DeliveryPrecondition =
	| { kind: "SEND"; attempt: number }
	| {
			kind: "REFUSE";
			code:
				| "SELENA_DELIVERY_REPORT_NOT_PERSISTED"
				| "SELENA_DELIVERY_ALREADY_DELIVERED"
				| "SELENA_DELIVERY_IN_FLIGHT"
				| "SELENA_DELIVERY_RECIPIENT_UNBOUND"
				| "SELENA_DELIVERY_ATTEMPTS_EXHAUSTED"
				| "SELENA_DELIVERY_NOT_DUE";
	  };

export function resolveDeliveryPrecondition(input: {
	reportPersisted: boolean;
	deliveryStatus: DeliveryStatus;
	attemptsMade: number;
	recipientStatus: RecipientBindingStatus;
	claimedAt: Date | null;
	nextAttemptAt: Date | null;
	now: Date;
}): DeliveryPrecondition {
	if (!input.reportPersisted) return { kind: "REFUSE", code: "SELENA_DELIVERY_REPORT_NOT_PERSISTED" };
	if (input.deliveryStatus === "DELIVERED") return { kind: "REFUSE", code: "SELENA_DELIVERY_ALREADY_DELIVERED" };
	if (input.deliveryStatus === "SENDING") {
		// A claim with no recorded time is a row we cannot reason about, and the
		// safe reading of "somebody may be sending this right now" is that they
		// are: refusing costs a retry, sending twice cannot be undone.
		const leaseExpired =
			input.claimedAt !== null && input.now.getTime() - input.claimedAt.getTime() >= DELIVERY_CLAIM_LEASE_MS;
		if (!leaseExpired) return { kind: "REFUSE", code: "SELENA_DELIVERY_IN_FLIGHT" };
	}
	if (input.deliveryStatus === "UNBOUND" || input.recipientStatus !== "BOUND")
		return { kind: "REFUSE", code: "SELENA_DELIVERY_RECIPIENT_UNBOUND" };
	if (input.deliveryStatus === "FAILED" || input.attemptsMade >= DELIVERY_MAX_ATTEMPTS)
		return { kind: "REFUSE", code: "SELENA_DELIVERY_ATTEMPTS_EXHAUSTED" };
	// The schedule is the contract, so it is enforced where the send is decided
	// rather than only where the next time is written down: a queue that fires a
	// job early — or twice — still cannot send before the delay has passed.
	if (input.nextAttemptAt !== null && input.nextAttemptAt.getTime() > input.now.getTime())
		return { kind: "REFUSE", code: "SELENA_DELIVERY_NOT_DUE" };
	return { kind: "SEND", attempt: input.attemptsMade + 1 };
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export const SIMULATION_AUDIT_EVENTS = [
	"SIMULATION_PAYMENT_EVENT_RECEIVED",
	"SIMULATION_SUBSCRIPTION_ACTIVATED",
	"SIMULATION_TELEGRAM_TOKEN_ISSUED",
	"SIMULATION_TELEGRAM_RECIPIENT_BOUND",
	"SIMULATION_TELEGRAM_RECIPIENT_UNBOUND",
	"SIMULATION_SAMPLE_REPORT_PERSISTED",
	"SIMULATION_DELIVERY_JOB_CREATED",
	"SIMULATION_TELEGRAM_SEND_ATTEMPTED",
	"SIMULATION_TELEGRAM_DELIVERY_CONFIRMED",
	"SIMULATION_TELEGRAM_DELIVERY_FAILED",
] as const;
export type SimulationAuditEvent = (typeof SIMULATION_AUDIT_EVENTS)[number];

/**
 * Fields that may never reach an audit row. The audit trail is read by people
 * and shipped in evidence bundles, so the check is a denylist applied to the
 * details object rather than a convention about what callers should pass.
 */
const FORBIDDEN_AUDIT_KEYS = [
	"token",
	"bottoken",
	"bot_token",
	"secret",
	"signature",
	"chatid",
	"chat_id",
	"connecttoken",
	"connect_token",
	"authorization",
	"password",
];

export type SimulationAuditRecord = {
	event: SimulationAuditEvent;
	correlationId: string;
	projectRef: string;
	environment: typeof SIMULATION_ENVIRONMENT;
	at: string;
	details: Record<string, unknown>;
};

export function assertAuditDetailsSafe(details: Record<string, unknown>): void {
	for (const key of Object.keys(details)) {
		const normalised = key.toLowerCase().replaceAll("-", "");
		if (FORBIDDEN_AUDIT_KEYS.includes(normalised)) throw new Error(`SELENA_AUDIT_SECRET_LEAK:${key}`);
	}
}

export function buildAuditRecord(input: {
	event: SimulationAuditEvent;
	correlationId: string;
	projectRef: string;
	now: Date;
	details?: Record<string, unknown>;
}): SimulationAuditRecord {
	const details = input.details ?? {};
	assertAuditDetailsSafe(details);
	if (!/^[A-Za-z0-9_-]{8,64}$/.test(input.correlationId)) throw new Error("SELENA_AUDIT_CORRELATION_ID_INVALID");
	return {
		event: input.event,
		correlationId: input.correlationId,
		projectRef: input.projectRef,
		environment: SIMULATION_ENVIRONMENT,
		at: input.now.toISOString(),
		details,
	};
}

/**
 * The receipt the simulation returns. `providerCalls` is a literal so a change
 * that made the fixture reach a measurement provider would not type-check.
 */
export type SimulationReceipt = {
	providerCalls: 0;
	realPayments: 0;
	environment: typeof SIMULATION_ENVIRONMENT;
	mode: typeof SIMULATION_MODE;
};

export const SIMULATION_RECEIPT: SimulationReceipt = Object.freeze({
	providerCalls: 0,
	realPayments: 0,
	environment: SIMULATION_ENVIRONMENT,
	mode: SIMULATION_MODE,
});

// ---------------------------------------------------------------------------
// Rig bootstrap
// ---------------------------------------------------------------------------

/**
 * How far from now a bootstrap request may claim to have been issued. The
 * window is what turns a captured signature from a permanent credential into
 * one that is worthless within minutes; the nonce is what stops it being used
 * even once more inside the window. Both are needed: a window alone allows a
 * replay in the seconds after capture, and a nonce alone would leave a ledger
 * that has to be kept forever.
 */
export const BOOTSTRAP_FRESHNESS_MS = 120_000;

export const bootstrapRequestSchema = z.strictObject({
	purpose: z.literal("staging-verification-simulation"),
	nonce: z.string().regex(/^[a-f0-9]{32,128}$/),
	issued_at: z.iso.datetime(),
});
export type BootstrapRequest = z.infer<typeof bootstrapRequestSchema>;

export function parseBootstrapRequest(value: unknown): BootstrapRequest {
	const parsed = bootstrapRequestSchema.safeParse(value);
	if (!parsed.success) throw new Error("SELENA_BOOTSTRAP_REQUEST_INVALID");
	return parsed.data;
}

/** Rejects a request signed too long ago, and one dated too far ahead to be a
 * clock that merely drifted. */
export function assertBootstrapFresh(request: BootstrapRequest, now: Date): void {
	const skewMs = Math.abs(now.getTime() - new Date(request.issued_at).getTime());
	if (skewMs > BOOTSTRAP_FRESHNESS_MS) throw new Error("SELENA_BOOTSTRAP_REQUEST_STALE");
}
