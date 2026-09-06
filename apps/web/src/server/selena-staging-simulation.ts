import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import {
	activateSimulationSubscription,
	bindTelegramRecipient,
	claimDeliveryAttempt,
	createDeliveryJob,
	findActiveSimulationSubscription,
	findBoundRecipient,
	persistSampleReport,
	readDeliveryState,
	readSimulationAuditTrail,
	recordDeliveryAttempt,
	type SimulationContext,
	storeConnectToken,
	unbindTelegramRecipient,
} from "@workspace/lib/selena-simulation-repositories";
import { sendTelegramMessage } from "@workspace/lib/selena-telegram-adapter";
import {
	assertSimulationAllowed,
	buildConnectTokenClaims,
	buildDigestMessage,
	type ConnectTokenClaims,
	parseSimulatedPaymentEvent,
	SIMULATION_RECEIPT,
	signConnectToken,
	simulationEnvironmentFromEnv,
	subscriptionActivationFromEvent,
	telegramDeepLink,
	verifyConnectToken,
	verifyPayloadSignature,
} from "@workspace/selena-visibility-contracts";

/**
 * The staging verification simulation, as one application service.
 *
 * Routes and the worker call these functions; none of them re-implement a
 * rule. The point of the exercise is that a later, real payment webhook and a
 * later, real weekly report enter at exactly these seams — a provider adapter
 * parses its own payload into the same activation intent, and a real report
 * writer persists before the same delivery step — so what is proven here is
 * the chain, not a demo that parallels it.
 *
 * Architecture v1.4 §11 keeps production Telegram delivery on HOLD. Every entry
 * point below refuses outside an opted-in, non-production environment.
 */

export class SimulationError extends Error {
	constructor(
		readonly code: string,
		readonly httpStatus: number,
	) {
		super(code);
		this.name = "SimulationError";
	}
}

function environment(env: NodeJS.ProcessEnv = process.env) {
	return simulationEnvironmentFromEnv(env);
}

/** Throws unless this deployment may run the simulation at all. */
export function assertSimulationEnvironment(env: NodeJS.ProcessEnv = process.env): void {
	try {
		assertSimulationAllowed(environment(env));
	} catch (error) {
		const code = error instanceof Error ? error.message : "SELENA_SIMULATION_DISABLED";
		throw new SimulationError(code, code === "SELENA_SIMULATION_FORBIDDEN_IN_PRODUCTION" ? 403 : 404);
	}
}

function requireSecret(env: NodeJS.ProcessEnv, name: "SELENA_SIMULATION_SIGNING_SECRET"): string {
	const value = env[name];
	if (!value) throw new SimulationError("SELENA_SIMULATION_SIGNING_SECRET_MISSING", 503);
	return value;
}

/**
 * A correlation id ties every row of one run together. It is generated here
 * rather than accepted from the caller so a client cannot merge its run into
 * somebody else's trail.
 */
export function newCorrelationId(prefix: string): string {
	return `${prefix}-${globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

// ---------------------------------------------------------------------------
// 1. Simulated payment event → subscription activation
// ---------------------------------------------------------------------------

export type AcceptedPaymentEvent = {
	subscriptionId: string;
	projectRef: string;
	planId: string;
	replayed: boolean;
	correlationId: string;
	receipt: typeof SIMULATION_RECEIPT;
};

/**
 * Accepts one signed payment event and activates at most one subscription.
 *
 * The signature is verified over the exact bytes received, before the body is
 * parsed: verifying a re-serialised object would check a different string from
 * the one that was signed. The tenant comes from the caller's credential
 * rather than from the event, because an event that could name its own tenant
 * would let anyone who can reach this route write into any workspace. A real
 * provider webhook resolves the tenant from a stored customer mapping instead
 * and then calls this same activation.
 */
export async function acceptSimulatedPaymentEvent(input: {
	rawBody: string;
	signature: string;
	tenantId: string;
	actorId: string;
	env?: NodeJS.ProcessEnv;
	now?: Date;
}): Promise<AcceptedPaymentEvent> {
	const env = input.env ?? process.env;
	assertSimulationEnvironment(env);
	const secret = requireSecret(env, "SELENA_SIMULATION_SIGNING_SECRET");
	if (!(await verifyPayloadSignature(input.rawBody, input.signature, secret)))
		throw new SimulationError("SELENA_SIMULATION_SIGNATURE_INVALID", 401);

	let parsed: unknown;
	try {
		parsed = JSON.parse(input.rawBody);
	} catch {
		throw new SimulationError("SELENA_SIMULATION_EVENT_INVALID", 400);
	}

	let event: ReturnType<typeof parseSimulatedPaymentEvent>;
	try {
		event = parseSimulatedPaymentEvent(parsed);
	} catch (error) {
		throw new SimulationError(error instanceof Error ? error.message : "SELENA_SIMULATION_EVENT_INVALID", 400);
	}

	const intent = subscriptionActivationFromEvent(event);
	const context: SimulationContext = { actorId: input.actorId, tenantId: input.tenantId };
	const correlationId = newCorrelationId("sim");
	const now = input.now ?? new Date();

	const activated = await withOrganizationTransaction(db, input.tenantId, (tx) =>
		activateSimulationSubscription(tx, context, { intent, correlationId, now }),
	);

	return {
		subscriptionId: activated.subscriptionId,
		projectRef: activated.projectRef,
		planId: activated.planId,
		replayed: activated.replayed,
		correlationId,
		receipt: SIMULATION_RECEIPT,
	};
}

// ---------------------------------------------------------------------------
// 2. Telegram connect link
// ---------------------------------------------------------------------------

export type ConnectLink = { deepLink: string; expiresAt: string; correlationId: string };

/**
 * Mints one single-use connect link for a project that has an active
 * subscription. The subscription is required first: a link is an invitation to
 * receive that project's digests, and issuing one for a project nobody has
 * subscribed to would create a destination with nothing to send it.
 */
export async function issueTelegramConnectLink(input: {
	tenantId: string;
	actorId: string;
	userId: string;
	projectRef: string;
	env?: NodeJS.ProcessEnv;
	now?: Date;
}): Promise<ConnectLink> {
	const env = input.env ?? process.env;
	assertSimulationEnvironment(env);
	const secret = requireSecret(env, "SELENA_SIMULATION_SIGNING_SECRET");
	const botUsername = env.SELENA_TELEGRAM_BOT_USERNAME;
	if (!botUsername) throw new SimulationError("SELENA_TELEGRAM_BOT_USERNAME_MISSING", 503);

	const context: SimulationContext = { actorId: input.actorId, tenantId: input.tenantId };
	const now = input.now ?? new Date();
	const correlationId = newCorrelationId("bind");

	return withOrganizationTransaction(db, input.tenantId, async (tx) => {
		const subscription = await findActiveSimulationSubscription(tx, context, input.projectRef);
		if (!subscription) throw new SimulationError("SELENA_SIMULATION_SUBSCRIPTION_NOT_ACTIVE", 409);

		const nonce = globalThis.crypto.randomUUID().replaceAll("-", "");
		const claims = buildConnectTokenClaims({
			tenantId: input.tenantId,
			userId: input.userId,
			projectId: input.projectRef,
			nonce,
			now,
		});
		const token = await signConnectToken(claims, secret);
		const stored = await storeConnectToken(tx, context, {
			token,
			projectRef: input.projectRef,
			userId: input.userId,
			nonce,
			correlationId,
			now,
		});
		return {
			deepLink: telegramDeepLink(botUsername, token),
			expiresAt: stored.expiresAt.toISOString(),
			correlationId,
		};
	});
}

/**
 * Redeems a link presented over the Telegram webhook.
 *
 * The claims carry the tenant, so a token is the only thing that decides which
 * workspace this binds — the webhook itself is unauthenticated, as Telegram's
 * callbacks always are, and the signature is what stands in for a session.
 */
export async function redeemTelegramConnectToken(input: {
	token: string;
	chatId: string;
	env?: NodeJS.ProcessEnv;
	now?: Date;
}): Promise<{ bound: boolean; code?: string; projectRef?: string }> {
	const env = input.env ?? process.env;
	assertSimulationEnvironment(env);
	const secret = requireSecret(env, "SELENA_SIMULATION_SIGNING_SECRET");
	const now = input.now ?? new Date();

	const verification = await verifyConnectToken(input.token, secret, now);
	if (!verification.ok) return { bound: false, code: verification.code };
	const claims: ConnectTokenClaims = verification.claims;

	const context: SimulationContext = { actorId: `telegram:${claims.userId}`, tenantId: claims.tenantId };
	const result = await withOrganizationTransaction(db, claims.tenantId, (tx) =>
		bindTelegramRecipient(tx, context, {
			token: input.token,
			claims: { tenantId: claims.tenantId, projectId: claims.projectId, userId: claims.userId },
			chatId: input.chatId,
			correlationId: newCorrelationId("bind"),
			now,
			env,
		}),
	);
	return result.kind === "BOUND" ? { bound: true, projectRef: result.projectRef } : { bound: false, code: result.code };
}

/** The safe disconnect, available to the workspace that owns the binding. */
export async function disconnectTelegramRecipient(input: {
	tenantId: string;
	actorId: string;
	projectRef: string;
	env?: NodeJS.ProcessEnv;
	now?: Date;
}): Promise<{ unbound: number }> {
	const env = input.env ?? process.env;
	assertSimulationEnvironment(env);
	const context: SimulationContext = { actorId: input.actorId, tenantId: input.tenantId };
	return withOrganizationTransaction(db, input.tenantId, (tx) =>
		unbindTelegramRecipient(tx, context, {
			projectRef: input.projectRef,
			reason: "DISCONNECTED_BY_WORKSPACE",
			correlationId: newCorrelationId("unbind"),
			now: input.now ?? new Date(),
		}),
	);
}

export async function readTelegramBindingStatus(input: {
	tenantId: string;
	actorId: string;
	projectRef: string;
}): Promise<{ connected: boolean }> {
	const context: SimulationContext = { actorId: input.actorId, tenantId: input.tenantId };
	const recipient = await withOrganizationTransaction(db, input.tenantId, (tx) =>
		findBoundRecipient(tx, context, input.projectRef),
	);
	return { connected: recipient !== null };
}

// ---------------------------------------------------------------------------
// 3. Sample report → delivery job
// ---------------------------------------------------------------------------

export type PreparedDelivery = {
	reportId: string;
	deliveryId: string;
	correlationId: string;
	receipt: typeof SIMULATION_RECEIPT;
};

/**
 * Saves the sample report and only then creates its delivery.
 *
 * Both happen in one transaction, so there is no moment at which a delivery
 * exists for a report that does not. That ordering is the §11.2 rule the
 * delivery step re-checks: this function makes it true, and
 * `claimDeliveryAttempt` refuses to send if it somehow is not.
 */
export async function prepareSampleReportDelivery(input: {
	tenantId: string;
	actorId: string;
	projectRef: string;
	projectName: string;
	periodStart: Date;
	periodEnd: Date;
	env?: NodeJS.ProcessEnv;
	now?: Date;
}): Promise<PreparedDelivery> {
	const env = input.env ?? process.env;
	assertSimulationEnvironment(env);
	const context: SimulationContext = { actorId: input.actorId, tenantId: input.tenantId };
	const now = input.now ?? new Date();
	const correlationId = newCorrelationId("report");

	return withOrganizationTransaction(db, input.tenantId, async (tx) => {
		const subscription = await findActiveSimulationSubscription(tx, context, input.projectRef);
		if (!subscription) throw new SimulationError("SELENA_SIMULATION_SUBSCRIPTION_NOT_ACTIVE", 409);

		const persisted = await persistSampleReport(tx, context, {
			projectRef: input.projectRef,
			projectName: input.projectName,
			subscriptionId: subscription.subscriptionId,
			periodStart: input.periodStart,
			periodEnd: input.periodEnd,
			correlationId,
			now,
		});
		const delivery = await createDeliveryJob(tx, context, {
			reportId: persisted.reportId,
			projectRef: input.projectRef,
			correlationId,
			now,
		});
		return {
			reportId: persisted.reportId,
			deliveryId: delivery.deliveryId,
			correlationId,
			receipt: SIMULATION_RECEIPT,
		};
	});
}

// ---------------------------------------------------------------------------
// 4. Delivery attempt
// ---------------------------------------------------------------------------

export type DeliveryAttemptResult = {
	deliveryId: string;
	decision: "DELIVERED" | "RETRY" | "STOP" | "REFUSED";
	code?: string;
	attempt?: number;
	nextAttemptAt?: string;
	receipt: typeof SIMULATION_RECEIPT;
};

/**
 * Runs one attempt: claim, send, record.
 *
 * The claim and the recording are separate transactions with the network call
 * between them, because holding a row lock across an outbound HTTP request
 * would let a slow provider block the table. The cost of that choice is that a
 * crash between the two loses the record of a send that may have happened,
 * which is why the claim locks and re-reads state: a redelivered job checks
 * whether the digest already arrived before trying again.
 */
export async function runDeliveryAttempt(input: {
	tenantId: string;
	actorId: string;
	deliveryId: string;
	workspaceUrl: string;
	env?: NodeJS.ProcessEnv;
	now?: Date;
	fetchImpl?: typeof fetch;
}): Promise<DeliveryAttemptResult> {
	const env = input.env ?? process.env;
	assertSimulationEnvironment(env);
	const botToken = env.SELENA_TELEGRAM_BOT_TOKEN;
	if (!botToken) throw new SimulationError("SELENA_TELEGRAM_BOT_TOKEN_MISSING", 503);

	const context: SimulationContext = { actorId: input.actorId, tenantId: input.tenantId };
	const now = input.now ?? new Date();

	const claimed = await withOrganizationTransaction(db, input.tenantId, (tx) =>
		claimDeliveryAttempt(tx, context, { deliveryId: input.deliveryId, now, env }),
	);
	if (claimed.kind === "REFUSE")
		return { deliveryId: input.deliveryId, decision: "REFUSED", code: claimed.code, receipt: SIMULATION_RECEIPT };

	const message = buildDigestMessage({ report: claimed.claim.report, workspaceUrl: input.workspaceUrl });
	const sent = await sendTelegramMessage(
		{ botToken },
		{ chatId: claimed.claim.chatId, text: message },
		{ fetchImpl: input.fetchImpl },
	);

	const decision = await withOrganizationTransaction(db, input.tenantId, (tx) =>
		recordDeliveryAttempt(tx, context, { claim: claimed.claim, outcome: sent.outcome, now: new Date() }),
	);

	if (decision.kind === "DELIVERED")
		return {
			deliveryId: input.deliveryId,
			decision: "DELIVERED",
			attempt: claimed.claim.attempt,
			receipt: SIMULATION_RECEIPT,
		};
	if (decision.kind === "RETRY")
		return {
			deliveryId: input.deliveryId,
			decision: "RETRY",
			attempt: decision.attempt,
			nextAttemptAt: decision.nextAttemptAt.toISOString(),
			receipt: SIMULATION_RECEIPT,
		};
	return {
		deliveryId: input.deliveryId,
		decision: "STOP",
		code: decision.status,
		attempt: claimed.claim.attempt,
		receipt: SIMULATION_RECEIPT,
	};
}

// ---------------------------------------------------------------------------
// 5. Evidence
// ---------------------------------------------------------------------------

export async function readSimulationEvidence(input: {
	tenantId: string;
	actorId: string;
	deliveryId: string;
	correlationId: string;
}): Promise<{
	delivery: Awaited<ReturnType<typeof readDeliveryState>>;
	trail: Awaited<ReturnType<typeof readSimulationAuditTrail>>;
	receipt: typeof SIMULATION_RECEIPT;
}> {
	const context: SimulationContext = { actorId: input.actorId, tenantId: input.tenantId };
	return withOrganizationTransaction(db, input.tenantId, async (tx) => ({
		delivery: await readDeliveryState(tx, context, input.deliveryId),
		trail: await readSimulationAuditTrail(tx, context, input.correlationId),
		receipt: SIMULATION_RECEIPT,
	}));
}
