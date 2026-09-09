import { describe, expect, it } from "vitest";
import {
	assertAuditDetailsSafe,
	assertBootstrapFresh,
	assertSimulationAllowed,
	BOOTSTRAP_FRESHNESS_MS,
	buildAuditRecord,
	buildConnectTokenClaims,
	buildDigestMessage,
	buildSampleWeeklyReport,
	classifyTelegramResponse,
	constantTimeEquals,
	countActionsByStatus,
	DELIVERY_CLAIM_LEASE_MS,
	DELIVERY_MAX_ATTEMPTS,
	DELIVERY_RETRY_DELAYS_MS,
	decideNextDelivery,
	parseBootstrapRequest,
	parseSimulatedPaymentEvent,
	resolveConnectRedemption,
	resolveDeliveryPrecondition,
	resolveSubscriptionActivation,
	SIMULATION_MARKERS,
	SIMULATION_RECEIPT,
	sampleWeeklyReportSchema,
	signConnectToken,
	signPayload,
	simulationEnvironmentFromEnv,
	subscriptionActivationFromEvent,
	telegramDeepLink,
	verifyConnectToken,
	verifyPayloadSignature,
} from "./staging-simulation.js";

const SECRET = "staging-simulation-test-secret";
const NOW = new Date("2026-09-06T09:00:00.000Z");

function validEvent(overrides: Record<string, unknown> = {}) {
	return {
		event_id: "evt_test_000000001",
		event_type: "payment_succeeded",
		environment: "staging",
		mode: "test",
		customer_id: "test_customer_001",
		project_id: "test_project_001",
		plan: "landscape",
		amount: 79,
		currency: "USD",
		occurred_at: "2026-09-06T08:59:00.000Z",
		...overrides,
	};
}

describe("environment gate", () => {
	it("refuses a production environment even when the flag is on", () => {
		const environment = simulationEnvironmentFromEnv({
			SELENA_STAGING_SIMULATION_ENABLED: "true",
			RAILWAY_ENVIRONMENT_NAME: "production",
		});
		expect(() => assertSimulationAllowed(environment)).toThrowError("SELENA_SIMULATION_ENVIRONMENT_NOT_ALLOWED");
	});

	it.each(["prod", "preview", "staging-2", "staging-clone", "sandbox", "PRODUCTION-eu"])(
		"refuses the environment named %s, which no denylist would have named",
		(name) => {
			const environment = simulationEnvironmentFromEnv({
				SELENA_STAGING_SIMULATION_ENABLED: "true",
				RAILWAY_ENVIRONMENT_NAME: name,
			});
			expect(() => assertSimulationAllowed(environment)).toThrowError("SELENA_SIMULATION_ENVIRONMENT_NOT_ALLOWED");
		},
	);

	it("refuses a deployment that says nothing about where it runs", () => {
		const environment = simulationEnvironmentFromEnv({ SELENA_STAGING_SIMULATION_ENABLED: "true" });
		expect(() => assertSimulationAllowed(environment)).toThrowError("SELENA_SIMULATION_ENVIRONMENT_UNKNOWN");
	});

	it("refuses staging until the owner switches the simulation on", () => {
		const environment = simulationEnvironmentFromEnv({ RAILWAY_ENVIRONMENT_NAME: "staging" });
		expect(() => assertSimulationAllowed(environment)).toThrowError("SELENA_SIMULATION_DISABLED");
	});

	it("allows an opted-in staging environment", () => {
		const environment = simulationEnvironmentFromEnv({
			SELENA_STAGING_SIMULATION_ENABLED: "true",
			RAILWAY_ENVIRONMENT_NAME: "staging",
		});
		expect(() => assertSimulationAllowed(environment)).not.toThrow();
	});

	it("cannot be talked out of production by the feature's own flag", () => {
		// ENVIRONMENT is a value the service sets for itself; RAILWAY_ENVIRONMENT_NAME
		// is injected by the platform. The platform's name has to win.
		const environment = simulationEnvironmentFromEnv({
			SELENA_STAGING_SIMULATION_ENABLED: "true",
			RAILWAY_ENVIRONMENT_NAME: "production",
			ENVIRONMENT: "staging",
		});
		expect(() => assertSimulationAllowed(environment)).toThrowError("SELENA_SIMULATION_ENVIRONMENT_NOT_ALLOWED");
	});
});

describe("simulated payment event", () => {
	it("accepts the documented event shape", () => {
		const event = parseSimulatedPaymentEvent(validEvent());
		expect(event.plan).toBe("landscape");
		expect(subscriptionActivationFromEvent(event).planId).toBe("full-ai-landscape");
	});

	it("refuses an event that does not declare itself a staging test", () => {
		expect(() => parseSimulatedPaymentEvent(validEvent({ environment: "production" }))).toThrowError(
			"SELENA_SIMULATION_EVENT_INVALID",
		);
		expect(() => parseSimulatedPaymentEvent(validEvent({ mode: "live" }))).toThrowError(
			"SELENA_SIMULATION_EVENT_INVALID",
		);
	});

	it("refuses an amount that does not match the plan it claims", () => {
		expect(() => parseSimulatedPaymentEvent(validEvent({ amount: 1 }))).toThrowError(
			"SELENA_SIMULATION_EVENT_AMOUNT_MISMATCH",
		);
	});

	it("carries the four markers into the activation intent", () => {
		const intent = subscriptionActivationFromEvent(parseSimulatedPaymentEvent(validEvent()));
		expect(intent.markers).toEqual(SIMULATION_MARKERS);
		expect(intent.markers.notAMeasurement).toBe(true);
	});
});

describe("event signature", () => {
	it("accepts a signature over the exact bytes and rejects an edited body", async () => {
		const body = JSON.stringify(validEvent());
		const signature = await signPayload(body, SECRET);
		expect(await verifyPayloadSignature(body, signature, SECRET)).toBe(true);
		expect(await verifyPayloadSignature(body, signature, "another-secret")).toBe(false);
		const tampered = JSON.stringify(validEvent({ amount: 49, plan: "visitor-local" }));
		expect(await verifyPayloadSignature(tampered, signature, SECRET)).toBe(false);
	});

	it("rejects an absent signature rather than treating it as unsigned-but-fine", async () => {
		expect(await verifyPayloadSignature(JSON.stringify(validEvent()), "", SECRET)).toBe(false);
	});

	it("compares digests without an early exit", () => {
		expect(constantTimeEquals("abcd", "abcd")).toBe(true);
		expect(constantTimeEquals("abcd", "abce")).toBe(false);
		expect(constantTimeEquals("abcd", "abc")).toBe(false);
	});
});

describe("subscription activation", () => {
	const intent = subscriptionActivationFromEvent(parseSimulatedPaymentEvent(validEvent()));

	it("activates once when nothing is stored", () => {
		expect(resolveSubscriptionActivation(intent, null)).toEqual({ kind: "ACTIVATE" });
	});

	it("treats a redelivery of the same event as a replay, not a second subscription", () => {
		const decision = resolveSubscriptionActivation(intent, {
			subscriptionId: "sub-1",
			providerEventId: intent.providerEventId,
			planId: intent.planId,
			projectRef: intent.projectRef,
		});
		expect(decision).toEqual({ kind: "REPLAY", subscriptionId: "sub-1" });
	});

	it("refuses an event id reused for different terms", () => {
		const decision = resolveSubscriptionActivation(intent, {
			subscriptionId: "sub-1",
			providerEventId: intent.providerEventId,
			planId: "visitor-local",
			projectRef: intent.projectRef,
		});
		expect(decision).toEqual({ kind: "CONFLICT", code: "SELENA_SIMULATION_EVENT_REUSED" });
	});
});

describe("telegram connect token", () => {
	async function issue(overrides: Partial<{ projectId: string; userId: string; ttlMs: number }> = {}) {
		const claims = buildConnectTokenClaims({
			tenantId: "org-1",
			userId: overrides.userId ?? "user-1",
			projectId: overrides.projectId ?? "test_project_001",
			nonce: "0123456789abcdef0123456789abcdef",
			now: NOW,
			ttlMs: overrides.ttlMs,
		});
		return { claims, token: await signConnectToken(claims, SECRET) };
	}

	it("verifies a freshly issued link", async () => {
		const { token } = await issue();
		const verified = await verifyConnectToken(token, SECRET, NOW);
		expect(verified.ok).toBe(true);
	});

	it("rejects a link whose claims were edited", async () => {
		const { token } = await issue();
		const [version, payload, signature] = token.split(".");
		const decoded = JSON.parse(
			new TextDecoder().decode(
				Uint8Array.from(
					atob(
						(payload as string)
							.replaceAll("-", "+")
							.replaceAll("_", "/")
							.padEnd(Math.ceil((payload as string).length / 4) * 4, "="),
					),
					(character) => character.charCodeAt(0),
				),
			),
		);
		decoded.projectId = "someone_elses_project";
		const forgedPayload = btoa(JSON.stringify(decoded)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
		const forged = `${version}.${forgedPayload}.${signature}`;
		const verified = await verifyConnectToken(forged, SECRET, NOW);
		expect(verified).toEqual({ ok: false, code: "SELENA_CONNECT_TOKEN_SIGNATURE_INVALID" });
	});

	it("rejects a link after its window closes", async () => {
		const { token } = await issue({ ttlMs: 60_000 });
		const verified = await verifyConnectToken(token, SECRET, new Date(NOW.getTime() + 61_000));
		expect(verified).toEqual({ ok: false, code: "SELENA_CONNECT_TOKEN_EXPIRED" });
	});

	it("rejects a link signed with a different secret", async () => {
		const { claims } = await issue();
		const foreign = await signConnectToken(claims, "not-our-secret");
		const verified = await verifyConnectToken(foreign, SECRET, NOW);
		expect(verified).toEqual({ ok: false, code: "SELENA_CONNECT_TOKEN_SIGNATURE_INVALID" });
	});

	it("binds once and refuses the second press of the same link", async () => {
		const { claims } = await issue();
		const stored = {
			tokenHash: "a".repeat(64),
			tenantId: "org-1",
			projectId: claims.projectId,
			userId: claims.userId,
			consumedAt: null as Date | null,
			expiresAt: new Date(NOW.getTime() + 60_000),
		};
		expect(resolveConnectRedemption(claims, stored, NOW)).toEqual({ kind: "BIND" });
		expect(resolveConnectRedemption(claims, { ...stored, consumedAt: NOW }, NOW)).toEqual({
			kind: "REFUSE",
			code: "SELENA_CONNECT_TOKEN_ALREADY_USED",
		});
	});

	it("refuses a link that names a project other than the one it was stored for", async () => {
		const { claims } = await issue({ projectId: "project_a" });
		const stored = {
			tokenHash: "a".repeat(64),
			tenantId: "org-1",
			projectId: "project_b",
			userId: claims.userId,
			consumedAt: null,
			expiresAt: new Date(NOW.getTime() + 60_000),
		};
		expect(resolveConnectRedemption(claims, stored, NOW)).toEqual({
			kind: "REFUSE",
			code: "SELENA_CONNECT_TOKEN_PROJECT_MISMATCH",
		});
	});

	it("refuses a link that belongs to another tenant", async () => {
		const { claims } = await issue();
		const stored = {
			tokenHash: "a".repeat(64),
			tenantId: "org-2",
			projectId: claims.projectId,
			userId: claims.userId,
			consumedAt: null,
			expiresAt: new Date(NOW.getTime() + 60_000),
		};
		expect(resolveConnectRedemption(claims, stored, NOW)).toEqual({
			kind: "REFUSE",
			code: "SELENA_CONNECT_TOKEN_PROJECT_MISMATCH",
		});
	});

	it("refuses a link the store has never seen", async () => {
		const { claims } = await issue();
		expect(resolveConnectRedemption(claims, null, NOW)).toEqual({
			kind: "REFUSE",
			code: "SELENA_CONNECT_TOKEN_UNKNOWN",
		});
	});

	it("builds a deep link and refuses an implausible bot username", async () => {
		const { token } = await issue();
		expect(telegramDeepLink("selena_staging_bot", token)).toContain("https://t.me/selena_staging_bot?start=");
		expect(() => telegramDeepLink("no", token)).toThrowError("SELENA_TELEGRAM_BOT_USERNAME_INVALID");
	});
});

describe("sample weekly report", () => {
	const report = buildSampleWeeklyReport({
		projectRef: "test_project_001",
		projectName: "Test Project",
		periodStart: new Date("2026-08-31T00:00:00.000Z"),
		periodEnd: new Date("2026-09-06T00:00:00.000Z"),
	});

	it("marks itself as test data that is not a measurement", () => {
		expect(report.title).toBe("TEST / SAMPLE DATA");
		expect(report.notice).toBe("Not a measurement");
		expect(report.markers).toEqual(SIMULATION_MARKERS);
		expect(report.providerCalls).toBe(0);
	});

	it("gives every action an owner, evidence, a recheck method and before/after", () => {
		for (const action of report.actions) {
			expect(action.owner.trim().length).toBeGreaterThan(0);
			expect(action.evidenceIds.length).toBeGreaterThan(0);
			expect(action.recheckMethod.trim().length).toBeGreaterThan(0);
			expect(action.before.trim().length).toBeGreaterThan(0);
			expect(action.after.trim().length).toBeGreaterThan(0);
		}
	});

	it("carries no delivery status on any action row", () => {
		// Delivery belongs to the digest, once. A per-action delivery field would
		// describe something the system never does.
		const serialised = JSON.stringify(report);
		expect(serialised).not.toMatch(/DELIVERED|RETRY_SCHEDULED|telegram/i);
		for (const action of report.actions)
			expect(Object.keys(action).sort()).toEqual([
				"action",
				"after",
				"before",
				"evidenceIds",
				"id",
				"owner",
				"recheckMethod",
				"status",
			]);
	});

	it("refuses a report row that tries to carry a delivery status", () => {
		const withDelivery = {
			...report,
			actions: [{ ...report.actions[0], telegram: "DELIVERED" }],
		};
		expect(sampleWeeklyReportSchema.safeParse(withDelivery).success).toBe(false);
	});

	it("demonstrates every action status so the digest counts come from real rows", () => {
		const counts = countActionsByStatus(report);
		for (const status of ["NEW", "STILL_OPEN", "NEEDS_RECHECK", "VERIFIED", "CLOSED"] as const)
			expect(counts[status]).toBeGreaterThan(0);
	});
});

describe("digest", () => {
	const report = buildSampleWeeklyReport({
		projectRef: "test_project_001",
		projectName: "Test Project",
		periodStart: new Date("2026-08-31T00:00:00.000Z"),
		periodEnd: new Date("2026-09-06T00:00:00.000Z"),
	});
	const message = buildDigestMessage({ report, workspaceUrl: "https://staging.example/app/report/1" });

	it("names the project, the period, the change, the counts and the recheck", () => {
		expect(message).toContain("Test Project");
		expect(message).toContain("2026-08-31 — 2026-09-06");
		expect(message).toContain(report.visibilitySummary);
		expect(message).toMatch(/1 new, 2 closed, 1 awaiting recheck/);
		expect(message).toContain(report.recheckStatus);
	});

	it("is marked as a test and links to the saved report rather than carrying it", () => {
		expect(message).toContain("[TEST]");
		expect(message).toContain("https://staging.example/app/report/1");
		expect(message.length).toBeLessThan(1200);
		for (const action of report.actions) expect(message).not.toContain(action.recheckMethod);
	});
});

describe("delivery retries", () => {
	it("allows the first send plus four retries and no more", () => {
		expect(DELIVERY_MAX_ATTEMPTS).toBe(5);
		expect(DELIVERY_RETRY_DELAYS_MS).toHaveLength(DELIVERY_MAX_ATTEMPTS - 1);
	});

	it("waits one minute, five minutes, thirty minutes and two hours", () => {
		expect(DELIVERY_RETRY_DELAYS_MS).toEqual([60_000, 300_000, 1_800_000, 7_200_000]);
	});

	it("schedules each retry from the injected clock, never from the wall clock", () => {
		const failure = { kind: "TEMPORARY_FAILURE", detail: "timeout" } as const;
		const expected = [60_000, 300_000, 1_800_000, 7_200_000];
		for (let attempt = 1; attempt <= 4; attempt += 1) {
			const decision = decideNextDelivery({ attempt, outcome: failure, now: NOW });
			expect(decision.kind).toBe("RETRY");
			if (decision.kind !== "RETRY") throw new Error("unreachable");
			expect(decision.attempt).toBe(attempt + 1);
			expect(decision.nextAttemptAt.getTime() - NOW.getTime()).toBe(expected[attempt - 1]);
		}
	});

	it("stops after the fifth attempt", () => {
		const decision = decideNextDelivery({
			attempt: 5,
			outcome: { kind: "TEMPORARY_FAILURE", detail: "timeout" },
			now: NOW,
		});
		expect(decision).toEqual({ kind: "STOP", status: "FAILED", reason: "SELENA_DELIVERY_ATTEMPTS_EXHAUSTED" });
	});

	it("stops as soon as a send succeeds", () => {
		expect(decideNextDelivery({ attempt: 2, outcome: { kind: "SUCCESS" }, now: NOW })).toEqual({ kind: "DELIVERED" });
	});

	it("unbinds the recipient and stops retrying when the chat is gone", () => {
		for (const response of [
			{ ok: false, httpStatus: 403, description: "Forbidden: bot was blocked by the user" },
			{ ok: false, httpStatus: 400, description: "Bad Request: chat not found" },
		]) {
			const outcome = classifyTelegramResponse(response);
			expect(outcome.kind).toBe("RECIPIENT_GONE");
			const decision = decideNextDelivery({ attempt: 1, outcome, now: NOW });
			expect(decision.kind).toBe("STOP");
			if (decision.kind !== "STOP") throw new Error("unreachable");
			expect(decision.status).toBe("UNBOUND");
		}
	});

	it("treats an unexplained failure as temporary rather than final", () => {
		expect(classifyTelegramResponse({ ok: false, httpStatus: 502 }).kind).toBe("TEMPORARY_FAILURE");
		expect(classifyTelegramResponse({ ok: false, httpStatus: 429, description: "Too Many Requests" }).kind).toBe(
			"TEMPORARY_FAILURE",
		);
	});

	it("refuses an attempt number outside the schedule", () => {
		expect(() => decideNextDelivery({ attempt: 0, outcome: { kind: "SUCCESS" }, now: NOW })).toThrowError(
			"SELENA_DELIVERY_ATTEMPT_OUT_OF_RANGE",
		);
		expect(() => decideNextDelivery({ attempt: 6, outcome: { kind: "SUCCESS" }, now: NOW })).toThrowError(
			"SELENA_DELIVERY_ATTEMPT_OUT_OF_RANGE",
		);
	});
});

describe("delivery preconditions", () => {
	const base = {
		reportPersisted: true,
		deliveryStatus: "PENDING" as const,
		attemptsMade: 0,
		recipientStatus: "BOUND" as const,
		claimedAt: null,
		nextAttemptAt: null,
		now: NOW,
	};

	it("sends when the report is saved and a recipient is bound", () => {
		expect(resolveDeliveryPrecondition(base)).toEqual({ kind: "SEND", attempt: 1 });
	});

	it("refuses to send a report that was never saved", () => {
		expect(resolveDeliveryPrecondition({ ...base, reportPersisted: false })).toEqual({
			kind: "REFUSE",
			code: "SELENA_DELIVERY_REPORT_NOT_PERSISTED",
		});
	});

	it("does not send the same digest twice when a job is redelivered", () => {
		expect(resolveDeliveryPrecondition({ ...base, deliveryStatus: "DELIVERED", attemptsMade: 1 })).toEqual({
			kind: "REFUSE",
			code: "SELENA_DELIVERY_ALREADY_DELIVERED",
		});
	});

	it("refuses once the recipient is unbound", () => {
		expect(resolveDeliveryPrecondition({ ...base, recipientStatus: "UNBOUND" })).toEqual({
			kind: "REFUSE",
			code: "SELENA_DELIVERY_RECIPIENT_UNBOUND",
		});
	});

	it("refuses a sixth attempt", () => {
		expect(resolveDeliveryPrecondition({ ...base, attemptsMade: 5, deliveryStatus: "RETRY_SCHEDULED" })).toEqual({
			kind: "REFUSE",
			code: "SELENA_DELIVERY_ATTEMPTS_EXHAUSTED",
		});
	});

	it("refuses a delivery another worker is already sending", () => {
		expect(
			resolveDeliveryPrecondition({ ...base, deliveryStatus: "SENDING", attemptsMade: 1, claimedAt: NOW }),
		).toEqual({ kind: "REFUSE", code: "SELENA_DELIVERY_IN_FLIGHT" });
	});

	it("refuses an in-flight delivery whose claim time was never written", () => {
		expect(resolveDeliveryPrecondition({ ...base, deliveryStatus: "SENDING", attemptsMade: 1 })).toEqual({
			kind: "REFUSE",
			code: "SELENA_DELIVERY_IN_FLIGHT",
		});
	});

	it("lets another worker take over a claim left behind by a crash", () => {
		expect(
			resolveDeliveryPrecondition({
				...base,
				deliveryStatus: "SENDING",
				attemptsMade: 1,
				claimedAt: NOW,
				now: new Date(NOW.getTime() + DELIVERY_CLAIM_LEASE_MS),
			}),
			// The crashed attempt was counted when it was claimed, so the takeover
			// continues the schedule rather than restarting it.
		).toEqual({ kind: "SEND", attempt: 2 });
	});

	it("refuses to send a scheduled retry before its delay has passed", () => {
		const nextAttemptAt = new Date(NOW.getTime() + DELIVERY_RETRY_DELAYS_MS[0]);
		expect(
			resolveDeliveryPrecondition({ ...base, deliveryStatus: "RETRY_SCHEDULED", attemptsMade: 1, nextAttemptAt }),
		).toEqual({ kind: "REFUSE", code: "SELENA_DELIVERY_NOT_DUE" });
		expect(
			resolveDeliveryPrecondition({
				...base,
				deliveryStatus: "RETRY_SCHEDULED",
				attemptsMade: 1,
				nextAttemptAt,
				now: nextAttemptAt,
			}),
		).toEqual({ kind: "SEND", attempt: 2 });
	});

	it("refuses a delivery that already stopped", () => {
		expect(resolveDeliveryPrecondition({ ...base, deliveryStatus: "FAILED", attemptsMade: 5 })).toEqual({
			kind: "REFUSE",
			code: "SELENA_DELIVERY_ATTEMPTS_EXHAUSTED",
		});
	});
});

describe("rig bootstrap request", () => {
	const request = {
		purpose: "staging-verification-simulation",
		nonce: "0123456789abcdef0123456789abcdef",
		issued_at: NOW.toISOString(),
	};

	it("accepts a fresh, well-formed request", () => {
		expect(() => assertBootstrapFresh(parseBootstrapRequest(request), NOW)).not.toThrow();
	});

	it("refuses a request that carries no nonce to spend", () => {
		expect(() => parseBootstrapRequest({ purpose: request.purpose, issued_at: request.issued_at })).toThrowError(
			"SELENA_BOOTSTRAP_REQUEST_INVALID",
		);
		expect(() => parseBootstrapRequest({ ...request, nonce: "not-hex" })).toThrowError(
			"SELENA_BOOTSTRAP_REQUEST_INVALID",
		);
	});

	it("refuses a captured signature once its window has passed", () => {
		const parsed = parseBootstrapRequest(request);
		const later = new Date(NOW.getTime() + BOOTSTRAP_FRESHNESS_MS + 1000);
		expect(() => assertBootstrapFresh(parsed, later)).toThrowError("SELENA_BOOTSTRAP_REQUEST_STALE");
	});

	it("refuses a request dated too far ahead to be drift", () => {
		const parsed = parseBootstrapRequest(request);
		const earlier = new Date(NOW.getTime() - BOOTSTRAP_FRESHNESS_MS - 1000);
		expect(() => assertBootstrapFresh(parsed, earlier)).toThrowError("SELENA_BOOTSTRAP_REQUEST_STALE");
	});
});

describe("audit trail", () => {
	it("records a step with its correlation id, project and environment", () => {
		const record = buildAuditRecord({
			event: "SIMULATION_SUBSCRIPTION_ACTIVATED",
			correlationId: "sim-0123456789abcdef",
			projectRef: "test_project_001",
			now: NOW,
			details: { planId: "full-ai-landscape" },
		});
		expect(record).toMatchObject({
			event: "SIMULATION_SUBSCRIPTION_ACTIVATED",
			correlationId: "sim-0123456789abcdef",
			projectRef: "test_project_001",
			environment: "staging",
			at: NOW.toISOString(),
		});
	});

	it("refuses to record a secret", () => {
		for (const key of ["token", "bot_token", "chatId", "chat_id", "signature", "connect-token"])
			expect(() => assertAuditDetailsSafe({ [key]: "whatever" })).toThrowError(/SELENA_AUDIT_SECRET_LEAK/);
		expect(() => assertAuditDetailsSafe({ planId: "full-ai-landscape", attempt: 1 })).not.toThrow();
	});
});

describe("receipt", () => {
	it("states zero provider calls and zero real payments as literals", () => {
		expect(SIMULATION_RECEIPT).toEqual({
			providerCalls: 0,
			realPayments: 0,
			environment: "staging",
			mode: "test",
		});
	});
});
