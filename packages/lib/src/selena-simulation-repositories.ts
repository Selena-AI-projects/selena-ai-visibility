import {
	assertSimulationMarkers,
	buildAuditRecord,
	buildSampleWeeklyReport,
	CONNECT_TOKEN_TTL_MS,
	DELIVERY_MAX_ATTEMPTS,
	type DeliveryDecision,
	type DeliveryOutcome,
	type DeliveryStatus,
	decideNextDelivery,
	parseSampleWeeklyReport,
	type RecipientBindingStatus,
	resolveConnectRedemption,
	resolveDeliveryPrecondition,
	resolveSubscriptionActivation,
	type SampleWeeklyReport,
	SIMULATION_MARKERS,
	type SimulationAuditEvent,
	type SubscriptionActivationIntent,
	sha256Hex,
} from "@workspace/selena-visibility-contracts";
import { and, eq, sql } from "drizzle-orm";
import {
	svAuditEvents,
	svSimulationConnectTokens,
	svSimulationDeliveries,
	svSimulationDeliveryAttempts,
	svSimulationRecipients,
	svSimulationReports,
	svSimulationSubscriptions,
} from "./db/schema";
import { decryptSecret, encryptSecret, getKeyring } from "./secrets/crypto";

/**
 * The durable half of the staging simulation.
 *
 * Every decision this module makes is imported from the pure contracts; what
 * lives here is the writing down. Keeping the split means the rules — the
 * five-attempt cap, the single-use link, the report-before-send ordering — are
 * tested against a clock rather than a database, and the database work is
 * tested against the rules rather than restating them.
 *
 * Each function takes an open transaction. That is not a style preference: an
 * audit row that commits separately from the fact it describes is an audit row
 * that can disagree with reality.
 */

export type SimulationContext = {
	actorId: string;
	tenantId: string;
};

// Drizzle's transaction handle and its base database handle share no public
// type, and every function here is meant to run inside a caller's transaction.
// biome-ignore lint/suspicious/noExplicitAny: no shared public type exists for the two handles.
type Tx = any;

const RECIPIENT_AAD = "selena-simulation-recipient-chat";

async function recordAudit(
	tx: Tx,
	context: SimulationContext,
	input: {
		event: SimulationAuditEvent;
		correlationId: string;
		projectRef: string;
		subjectKind: string;
		subjectId: string;
		now: Date;
		details?: Record<string, unknown>;
	},
): Promise<void> {
	const record = buildAuditRecord({
		event: input.event,
		correlationId: input.correlationId,
		projectRef: input.projectRef,
		now: input.now,
		details: input.details,
	});
	await tx.insert(svAuditEvents).values({
		organizationId: context.tenantId,
		actorId: context.actorId,
		event: record.event,
		subjectKind: input.subjectKind,
		subjectId: input.subjectId,
		details: {
			correlationId: record.correlationId,
			projectRef: record.projectRef,
			environment: record.environment,
			mode: SIMULATION_MARKERS.mode,
			at: record.at,
			...record.details,
		},
	});
}

/**
 * Reads the audit trail for one correlation id. This is the evidence surface:
 * it returns the ordered steps of a single run without exposing any of the
 * secrets those steps handled, because none were ever written.
 */
export async function readSimulationAuditTrail(
	tx: Tx,
	context: SimulationContext,
	correlationId: string,
): Promise<{ event: string; at: Date; subjectKind: string; details: Record<string, unknown> }[]> {
	const rows = await tx
		.select({
			event: svAuditEvents.event,
			at: svAuditEvents.at,
			subjectKind: svAuditEvents.subjectKind,
			details: svAuditEvents.details,
		})
		.from(svAuditEvents)
		.where(
			and(
				eq(svAuditEvents.organizationId, context.tenantId),
				sql`${svAuditEvents.details} ->> 'correlationId' = ${correlationId}`,
			),
		)
		.orderBy(svAuditEvents.at);
	return rows as { event: string; at: Date; subjectKind: string; details: Record<string, unknown> }[];
}

// ---------------------------------------------------------------------------
// Subscription activation
// ---------------------------------------------------------------------------

export type ActivatedSubscription = {
	subscriptionId: string;
	planId: string;
	projectRef: string;
	replayed: boolean;
};

/**
 * Turns one accepted payment event into at most one subscription.
 *
 * The provider event id is unique across the table, so a webhook that is
 * delivered twice — which every real provider does — finds its own row and
 * returns it rather than activating again. The insert still guards the race
 * with `onConflictDoNothing`, because two concurrent deliveries can both read
 * an empty table before either writes.
 */
export async function activateSimulationSubscription(
	tx: Tx,
	context: SimulationContext,
	input: { intent: SubscriptionActivationIntent; correlationId: string; now: Date },
): Promise<ActivatedSubscription> {
	assertSimulationMarkers(input.intent.markers);

	await recordAudit(tx, context, {
		event: "SIMULATION_PAYMENT_EVENT_RECEIVED",
		correlationId: input.correlationId,
		projectRef: input.intent.projectRef,
		subjectKind: "sv_simulation_subscriptions",
		subjectId: input.intent.providerEventId,
		now: input.now,
		details: { provider: input.intent.provider, planId: input.intent.planId, amountUsd: input.intent.amountUsd },
	});

	const [existing] = await tx
		.select({
			subscriptionId: svSimulationSubscriptions.id,
			providerEventId: svSimulationSubscriptions.providerEventId,
			planId: svSimulationSubscriptions.planId,
			projectRef: svSimulationSubscriptions.projectRef,
		})
		.from(svSimulationSubscriptions)
		.where(
			and(
				eq(svSimulationSubscriptions.organizationId, context.tenantId),
				eq(svSimulationSubscriptions.provider, input.intent.provider),
				eq(svSimulationSubscriptions.providerEventId, input.intent.providerEventId),
			),
		)
		.limit(1);

	const decision = resolveSubscriptionActivation(input.intent, existing ?? null);
	if (decision.kind === "CONFLICT") throw new Error(decision.code);
	if (decision.kind === "REPLAY")
		return {
			subscriptionId: decision.subscriptionId,
			planId: input.intent.planId,
			projectRef: input.intent.projectRef,
			replayed: true,
		};

	const [inserted] = await tx
		.insert(svSimulationSubscriptions)
		.values({
			organizationId: context.tenantId,
			projectRef: input.intent.projectRef,
			customerRef: input.intent.customerId,
			planId: input.intent.planId,
			status: "ACTIVE",
			provider: input.intent.provider,
			providerEventId: input.intent.providerEventId,
			amountUsd: input.intent.amountUsd.toFixed(2),
			currency: input.intent.currency,
			correlationId: input.correlationId,
			activatedAt: input.now,
		})
		.onConflictDoNothing({
			target: [
				svSimulationSubscriptions.organizationId,
				svSimulationSubscriptions.provider,
				svSimulationSubscriptions.providerEventId,
			],
		})
		.returning({ id: svSimulationSubscriptions.id });

	if (!inserted) {
		// Lost the race with a concurrent delivery of the same event; the winner's
		// row is the subscription, and this delivery is a replay of it.
		const [winner] = await tx
			.select({ id: svSimulationSubscriptions.id })
			.from(svSimulationSubscriptions)
			.where(
				and(
					eq(svSimulationSubscriptions.organizationId, context.tenantId),
					eq(svSimulationSubscriptions.provider, input.intent.provider),
					eq(svSimulationSubscriptions.providerEventId, input.intent.providerEventId),
				),
			)
			.limit(1);
		if (!winner) throw new Error("SELENA_SIMULATION_SUBSCRIPTION_WRITE_FAILED");
		return {
			subscriptionId: winner.id as string,
			planId: input.intent.planId,
			projectRef: input.intent.projectRef,
			replayed: true,
		};
	}

	await recordAudit(tx, context, {
		event: "SIMULATION_SUBSCRIPTION_ACTIVATED",
		correlationId: input.correlationId,
		projectRef: input.intent.projectRef,
		subjectKind: "sv_simulation_subscriptions",
		subjectId: inserted.id as string,
		now: input.now,
		details: { planId: input.intent.planId, status: "ACTIVE" },
	});

	return {
		subscriptionId: inserted.id as string,
		planId: input.intent.planId,
		projectRef: input.intent.projectRef,
		replayed: false,
	};
}

export async function findActiveSimulationSubscription(
	tx: Tx,
	context: SimulationContext,
	projectRef: string,
): Promise<{ subscriptionId: string; planId: string } | null> {
	const [row] = await tx
		.select({ subscriptionId: svSimulationSubscriptions.id, planId: svSimulationSubscriptions.planId })
		.from(svSimulationSubscriptions)
		.where(
			and(
				eq(svSimulationSubscriptions.organizationId, context.tenantId),
				eq(svSimulationSubscriptions.projectRef, projectRef),
				eq(svSimulationSubscriptions.status, "ACTIVE"),
			),
		)
		.limit(1);
	return row ? { subscriptionId: row.subscriptionId as string, planId: row.planId as string } : null;
}

// ---------------------------------------------------------------------------
// Telegram connect token and recipient binding
// ---------------------------------------------------------------------------

/**
 * Records the hash of a freshly minted connect token. The token itself is
 * returned to the caller and never stored, so the row can only ever confirm a
 * link somebody already holds — it cannot produce one.
 */
export async function storeConnectToken(
	tx: Tx,
	context: SimulationContext,
	input: {
		token: string;
		projectRef: string;
		userId: string;
		nonce: string;
		correlationId: string;
		now: Date;
		ttlMs?: number;
	},
): Promise<{ tokenId: string; expiresAt: Date }> {
	const expiresAt = new Date(input.now.getTime() + (input.ttlMs ?? CONNECT_TOKEN_TTL_MS));
	const tokenHash = await sha256Hex(input.token);
	const [row] = await tx
		.insert(svSimulationConnectTokens)
		.values({
			organizationId: context.tenantId,
			projectRef: input.projectRef,
			userId: input.userId,
			tokenHash,
			nonce: input.nonce,
			expiresAt,
			correlationId: input.correlationId,
			createdAt: input.now,
		})
		.returning({ id: svSimulationConnectTokens.id });
	if (!row) throw new Error("SELENA_CONNECT_TOKEN_WRITE_FAILED");

	await recordAudit(tx, context, {
		event: "SIMULATION_TELEGRAM_TOKEN_ISSUED",
		correlationId: input.correlationId,
		projectRef: input.projectRef,
		subjectKind: "sv_simulation_connect_tokens",
		subjectId: row.id as string,
		now: input.now,
		details: { expiresAt: expiresAt.toISOString(), singleUse: true },
	});
	return { tokenId: row.id as string, expiresAt };
}

export type BindRecipientResult =
	| { kind: "BOUND"; recipientId: string; projectRef: string }
	| { kind: "REFUSED"; code: string };

/**
 * Consumes a connect token and binds the chat behind it.
 *
 * The consumption is a conditional update on `consumed_at IS NULL`: two
 * simultaneous presses of the same link both read an unconsumed row, and only
 * the one whose update matches proceeds. Checking first and writing later would
 * bind twice.
 */
export async function bindTelegramRecipient(
	tx: Tx,
	context: SimulationContext,
	input: {
		token: string;
		claims: { tenantId: string; projectId: string; userId: string };
		chatId: string;
		correlationId: string;
		now: Date;
		env?: NodeJS.ProcessEnv;
	},
): Promise<BindRecipientResult> {
	const tokenHash = await sha256Hex(input.token);
	const [stored] = await tx
		.select({
			id: svSimulationConnectTokens.id,
			organizationId: svSimulationConnectTokens.organizationId,
			tokenHash: svSimulationConnectTokens.tokenHash,
			projectRef: svSimulationConnectTokens.projectRef,
			userId: svSimulationConnectTokens.userId,
			consumedAt: svSimulationConnectTokens.consumedAt,
			expiresAt: svSimulationConnectTokens.expiresAt,
			correlationId: svSimulationConnectTokens.correlationId,
		})
		.from(svSimulationConnectTokens)
		.where(eq(svSimulationConnectTokens.tokenHash, tokenHash))
		.limit(1);

	const decision = resolveConnectRedemption(
		{
			tenantId: input.claims.tenantId,
			userId: input.claims.userId,
			projectId: input.claims.projectId,
			environment: "staging",
			nonce: "unused-by-this-check",
			issuedAtMs: input.now.getTime(),
			expiresAtMs: input.now.getTime(),
		},
		stored
			? {
					tokenHash: stored.tokenHash as string,
					// The row's own owner, never the caller's: comparing the claim
					// against the context it was already used to build would compare a
					// value with itself and prove nothing.
					tenantId: stored.organizationId as string,
					projectId: stored.projectRef as string,
					userId: stored.userId as string,
					consumedAt: (stored.consumedAt as Date | null) ?? null,
					expiresAt: stored.expiresAt as Date,
				}
			: null,
		input.now,
	);
	if (decision.kind === "REFUSE") return { kind: "REFUSED", code: decision.code };

	const [consumed] = await tx
		.update(svSimulationConnectTokens)
		.set({ consumedAt: input.now })
		.where(and(eq(svSimulationConnectTokens.id, stored.id), sql`${svSimulationConnectTokens.consumedAt} IS NULL`))
		.returning({ id: svSimulationConnectTokens.id });
	if (!consumed) return { kind: "REFUSED", code: "SELENA_CONNECT_TOKEN_ALREADY_USED" };

	const projectRef = stored.projectRef as string;
	const correlationId = stored.correlationId as string;
	const keyring = getKeyring(input.env ?? process.env);
	if (!keyring) throw new Error("SELENA_SIMULATION_ENCRYPTION_KEY_MISSING");
	const chatIdCiphertext = await encryptSecret(input.chatId, { key: keyring.primary, aad: RECIPIENT_AAD });

	// One live recipient per project: an earlier binding is retired rather than
	// left in place, so a rebind cannot quietly create a second destination.
	await tx
		.update(svSimulationRecipients)
		.set({ status: "UNBOUND", unboundAt: input.now, unboundReason: "REPLACED_BY_NEW_BINDING" })
		.where(
			and(
				eq(svSimulationRecipients.organizationId, context.tenantId),
				eq(svSimulationRecipients.projectRef, projectRef),
				eq(svSimulationRecipients.status, "BOUND"),
			),
		);

	const [recipient] = await tx
		.insert(svSimulationRecipients)
		.values({
			organizationId: context.tenantId,
			projectRef,
			channel: "telegram",
			chatIdCiphertext,
			status: "BOUND",
			boundAt: input.now,
			correlationId,
		})
		.returning({ id: svSimulationRecipients.id });
	if (!recipient) throw new Error("SELENA_SIMULATION_RECIPIENT_WRITE_FAILED");

	await recordAudit(tx, context, {
		event: "SIMULATION_TELEGRAM_RECIPIENT_BOUND",
		correlationId,
		projectRef,
		subjectKind: "sv_simulation_recipients",
		subjectId: recipient.id as string,
		now: input.now,
		details: { channel: "telegram", singleUseTokenConsumed: true },
	});
	return { kind: "BOUND", recipientId: recipient.id as string, projectRef };
}

/** The safe disconnect: the row stays for the audit trail, the destination does not. */
export async function unbindTelegramRecipient(
	tx: Tx,
	context: SimulationContext,
	input: { projectRef: string; reason: string; correlationId: string; now: Date },
): Promise<{ unbound: number }> {
	const rows = await tx
		.update(svSimulationRecipients)
		.set({ status: "UNBOUND", unboundAt: input.now, unboundReason: input.reason.slice(0, 200) })
		.where(
			and(
				eq(svSimulationRecipients.organizationId, context.tenantId),
				eq(svSimulationRecipients.projectRef, input.projectRef),
				eq(svSimulationRecipients.status, "BOUND"),
			),
		)
		.returning({ id: svSimulationRecipients.id });

	if (rows.length > 0)
		await recordAudit(tx, context, {
			event: "SIMULATION_TELEGRAM_RECIPIENT_UNBOUND",
			correlationId: input.correlationId,
			projectRef: input.projectRef,
			subjectKind: "sv_simulation_recipients",
			subjectId: rows[0].id as string,
			now: input.now,
			details: { reason: input.reason.slice(0, 200) },
		});
	return { unbound: rows.length };
}

export async function findBoundRecipient(
	tx: Tx,
	context: SimulationContext,
	projectRef: string,
): Promise<{ recipientId: string; status: RecipientBindingStatus } | null> {
	const [row] = await tx
		.select({ id: svSimulationRecipients.id, status: svSimulationRecipients.status })
		.from(svSimulationRecipients)
		.where(
			and(
				eq(svSimulationRecipients.organizationId, context.tenantId),
				eq(svSimulationRecipients.projectRef, projectRef),
				eq(svSimulationRecipients.status, "BOUND"),
			),
		)
		.limit(1);
	return row ? { recipientId: row.id as string, status: row.status as RecipientBindingStatus } : null;
}

// ---------------------------------------------------------------------------
// Sample report
// ---------------------------------------------------------------------------

/**
 * Saves the sample report. The payload is validated on the way in, so a row
 * that reached the table is one the delivery step can trust without
 * re-deriving it.
 */
export async function persistSampleReport(
	tx: Tx,
	context: SimulationContext,
	input: {
		projectRef: string;
		projectName: string;
		subscriptionId: string;
		periodStart: Date;
		periodEnd: Date;
		correlationId: string;
		now: Date;
	},
): Promise<{ reportId: string; report: SampleWeeklyReport }> {
	const report = buildSampleWeeklyReport({
		projectRef: input.projectRef,
		projectName: input.projectName,
		periodStart: input.periodStart,
		periodEnd: input.periodEnd,
	});

	const [row] = await tx
		.insert(svSimulationReports)
		.values({
			organizationId: context.tenantId,
			projectRef: input.projectRef,
			subscriptionId: input.subscriptionId,
			periodStart: input.periodStart,
			periodEnd: input.periodEnd,
			payload: report,
			correlationId: input.correlationId,
			persistedAt: input.now,
		})
		.onConflictDoNothing({
			target: [svSimulationReports.organizationId, svSimulationReports.projectRef, svSimulationReports.periodStart],
		})
		.returning({ id: svSimulationReports.id });

	if (!row) {
		const [existing] = await tx
			.select({ id: svSimulationReports.id, payload: svSimulationReports.payload })
			.from(svSimulationReports)
			.where(
				and(
					eq(svSimulationReports.organizationId, context.tenantId),
					eq(svSimulationReports.projectRef, input.projectRef),
					eq(svSimulationReports.periodStart, input.periodStart),
				),
			)
			.limit(1);
		if (!existing) throw new Error("SELENA_SIMULATION_REPORT_WRITE_FAILED");
		return { reportId: existing.id as string, report: parseSampleWeeklyReport(existing.payload) };
	}

	await recordAudit(tx, context, {
		event: "SIMULATION_SAMPLE_REPORT_PERSISTED",
		correlationId: input.correlationId,
		projectRef: input.projectRef,
		subjectKind: "sv_simulation_reports",
		subjectId: row.id as string,
		now: input.now,
		details: { periodStart: input.periodStart.toISOString(), providerCalls: 0, actions: report.actions.length },
	});
	return { reportId: row.id as string, report };
}

export async function readSampleReport(
	tx: Tx,
	context: SimulationContext,
	reportId: string,
): Promise<{ reportId: string; projectRef: string; report: SampleWeeklyReport } | null> {
	const [row] = await tx
		.select({
			id: svSimulationReports.id,
			projectRef: svSimulationReports.projectRef,
			payload: svSimulationReports.payload,
		})
		.from(svSimulationReports)
		.where(and(eq(svSimulationReports.organizationId, context.tenantId), eq(svSimulationReports.id, reportId)))
		.limit(1);
	return row
		? {
				reportId: row.id as string,
				projectRef: row.projectRef as string,
				report: parseSampleWeeklyReport(row.payload),
			}
		: null;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

/**
 * Creates the delivery for a saved report.
 *
 * The report id is looked up rather than trusted: a delivery whose report does
 * not exist is the one case §11.2 forbids outright, and refusing it here means
 * the ordering holds even if a caller enqueues out of sequence.
 */
export async function createDeliveryJob(
	tx: Tx,
	context: SimulationContext,
	input: { reportId: string; projectRef: string; correlationId: string; now: Date },
): Promise<{ deliveryId: string }> {
	const report = await readSampleReport(tx, context, input.reportId);
	if (!report) throw new Error("SELENA_DELIVERY_REPORT_NOT_PERSISTED");

	const recipient = await findBoundRecipient(tx, context, input.projectRef);
	if (!recipient) throw new Error("SELENA_DELIVERY_RECIPIENT_UNBOUND");

	const [row] = await tx
		.insert(svSimulationDeliveries)
		.values({
			organizationId: context.tenantId,
			projectRef: input.projectRef,
			reportId: input.reportId,
			recipientId: recipient.recipientId,
			status: "PENDING",
			attemptsMade: 0,
			nextAttemptAt: input.now,
			correlationId: input.correlationId,
			createdAt: input.now,
			updatedAt: input.now,
		})
		.onConflictDoNothing({ target: [svSimulationDeliveries.reportId] })
		.returning({ id: svSimulationDeliveries.id });

	if (!row) {
		const [existing] = await tx
			.select({ id: svSimulationDeliveries.id })
			.from(svSimulationDeliveries)
			.where(
				and(
					eq(svSimulationDeliveries.organizationId, context.tenantId),
					eq(svSimulationDeliveries.reportId, input.reportId),
				),
			)
			.limit(1);
		if (!existing) throw new Error("SELENA_SIMULATION_DELIVERY_WRITE_FAILED");
		return { deliveryId: existing.id as string };
	}

	await recordAudit(tx, context, {
		event: "SIMULATION_DELIVERY_JOB_CREATED",
		correlationId: input.correlationId,
		projectRef: input.projectRef,
		subjectKind: "sv_simulation_deliveries",
		subjectId: row.id as string,
		now: input.now,
		details: { reportId: input.reportId, maxAttempts: DELIVERY_MAX_ATTEMPTS },
	});
	return { deliveryId: row.id as string };
}

export type DeliveryClaim = {
	deliveryId: string;
	projectRef: string;
	reportId: string;
	report: SampleWeeklyReport;
	chatId: string;
	attempt: number;
	claimedAt: Date;
	correlationId: string;
};

/**
 * Claims one delivery and decides whether it may send.
 *
 * The row is taken `FOR UPDATE` and then *marked* in flight before this
 * function returns. The lock alone would not have been enough: it is released
 * when the claiming transaction commits, and the send happens after that, so
 * two redelivered jobs could each lock an untouched row in turn and both send
 * the same digest. Writing the claim down is what makes the second one refuse.
 *
 * The attempt is counted at claim time for the same reason. A crash between
 * the claim and the record would otherwise leave no trace of a send that may
 * well have reached Telegram, and an uncounted attempt is how a five-attempt
 * cap becomes six.
 *
 * The preconditions are re-read here rather than carried on the job payload,
 * because a payload records what was true when the job was created.
 */
export async function claimDeliveryAttempt(
	tx: Tx,
	context: SimulationContext,
	input: { deliveryId: string; now: Date; env?: NodeJS.ProcessEnv },
): Promise<{ kind: "SEND"; claim: DeliveryClaim } | { kind: "REFUSE"; code: string }> {
	const [delivery] = await tx
		.select({
			id: svSimulationDeliveries.id,
			projectRef: svSimulationDeliveries.projectRef,
			reportId: svSimulationDeliveries.reportId,
			recipientId: svSimulationDeliveries.recipientId,
			status: svSimulationDeliveries.status,
			attemptsMade: svSimulationDeliveries.attemptsMade,
			claimedAt: svSimulationDeliveries.claimedAt,
			nextAttemptAt: svSimulationDeliveries.nextAttemptAt,
			correlationId: svSimulationDeliveries.correlationId,
		})
		.from(svSimulationDeliveries)
		.where(
			and(eq(svSimulationDeliveries.organizationId, context.tenantId), eq(svSimulationDeliveries.id, input.deliveryId)),
		)
		.for("update");
	if (!delivery) return { kind: "REFUSE", code: "SELENA_DELIVERY_UNKNOWN" };

	const [recipient] = await tx
		.select({
			id: svSimulationRecipients.id,
			status: svSimulationRecipients.status,
			chatIdCiphertext: svSimulationRecipients.chatIdCiphertext,
		})
		.from(svSimulationRecipients)
		.where(eq(svSimulationRecipients.id, delivery.recipientId))
		.limit(1);

	const report = await readSampleReport(tx, context, delivery.reportId as string);

	const precondition = resolveDeliveryPrecondition({
		reportPersisted: report !== null,
		deliveryStatus: delivery.status as DeliveryStatus,
		attemptsMade: delivery.attemptsMade as number,
		recipientStatus: (recipient?.status as RecipientBindingStatus) ?? "UNBOUND",
		claimedAt: (delivery.claimedAt as Date | null) ?? null,
		nextAttemptAt: (delivery.nextAttemptAt as Date | null) ?? null,
		now: input.now,
	});
	if (precondition.kind === "REFUSE") return { kind: "REFUSE", code: precondition.code };

	const keyring = getKeyring(input.env ?? process.env);
	if (!keyring) throw new Error("SELENA_SIMULATION_ENCRYPTION_KEY_MISSING");
	const chatId = await decryptSecret(recipient?.chatIdCiphertext, { keyring, aad: RECIPIENT_AAD });

	await tx
		.update(svSimulationDeliveries)
		.set({
			status: "SENDING",
			attemptsMade: precondition.attempt,
			claimedAt: input.now,
			nextAttemptAt: null,
			updatedAt: input.now,
		})
		.where(eq(svSimulationDeliveries.id, delivery.id));

	return {
		kind: "SEND",
		claim: {
			deliveryId: delivery.id as string,
			projectRef: delivery.projectRef as string,
			reportId: delivery.reportId as string,
			report: (report as { report: SampleWeeklyReport }).report,
			chatId,
			attempt: precondition.attempt,
			claimedAt: input.now,
			correlationId: delivery.correlationId as string,
		},
	};
}

/**
 * Writes down what one attempt did and what happens next.
 *
 * The attempt row is inserted before the delivery row is updated: if anything
 * fails between the two the transaction rolls back both, and an attempt that
 * reached Telegram without leaving a record is the one outcome that would make
 * the evidence untrustworthy.
 *
 * Every update carries the claim it is writing for. A worker whose claim
 * expired and was taken over must not overwrite the state of the worker that
 * took it: it lost the delivery while it was away, and saying so is better
 * than quietly winding the attempt count back.
 */
/** Matches the delivery only while it is still held by this claim. */
function claimHeld(claim: DeliveryClaim) {
	return and(eq(svSimulationDeliveries.id, claim.deliveryId), eq(svSimulationDeliveries.claimedAt, claim.claimedAt));
}

function assertClaimHeld(written: { id: unknown }[]): void {
	if (written.length === 0) throw new Error("SELENA_DELIVERY_CLAIM_LOST");
}

export async function recordDeliveryAttempt(
	tx: Tx,
	context: SimulationContext,
	input: {
		claim: DeliveryClaim;
		outcome: DeliveryOutcome;
		now: Date;
	},
): Promise<DeliveryDecision> {
	await tx.insert(svSimulationDeliveryAttempts).values({
		organizationId: context.tenantId,
		deliveryId: input.claim.deliveryId,
		attempt: input.claim.attempt,
		outcome: input.outcome.kind,
		detail: input.outcome.kind === "SUCCESS" ? null : input.outcome.detail.slice(0, 300),
		correlationId: input.claim.correlationId,
		attemptedAt: input.now,
	});

	await recordAudit(tx, context, {
		event: "SIMULATION_TELEGRAM_SEND_ATTEMPTED",
		correlationId: input.claim.correlationId,
		projectRef: input.claim.projectRef,
		subjectKind: "sv_simulation_deliveries",
		subjectId: input.claim.deliveryId,
		now: input.now,
		details: { attempt: input.claim.attempt, outcome: input.outcome.kind },
	});

	const decision = decideNextDelivery({ attempt: input.claim.attempt, outcome: input.outcome, now: input.now });

	if (decision.kind === "DELIVERED") {
		const written = await tx
			.update(svSimulationDeliveries)
			.set({
				status: "DELIVERED",
				attemptsMade: input.claim.attempt,
				deliveredAt: input.now,
				nextAttemptAt: null,
				claimedAt: null,
				lastError: null,
				updatedAt: input.now,
			})
			.where(claimHeld(input.claim))
			.returning({ id: svSimulationDeliveries.id });
		assertClaimHeld(written);
		await recordAudit(tx, context, {
			event: "SIMULATION_TELEGRAM_DELIVERY_CONFIRMED",
			correlationId: input.claim.correlationId,
			projectRef: input.claim.projectRef,
			subjectKind: "sv_simulation_deliveries",
			subjectId: input.claim.deliveryId,
			now: input.now,
			details: { attempts: input.claim.attempt, status: "DELIVERED" },
		});
		return decision;
	}

	if (decision.kind === "RETRY") {
		const written = await tx
			.update(svSimulationDeliveries)
			.set({
				status: "RETRY_SCHEDULED",
				attemptsMade: input.claim.attempt,
				nextAttemptAt: decision.nextAttemptAt,
				claimedAt: null,
				lastError: input.outcome.kind === "SUCCESS" ? null : input.outcome.detail.slice(0, 300),
				updatedAt: input.now,
			})
			.where(claimHeld(input.claim))
			.returning({ id: svSimulationDeliveries.id });
		assertClaimHeld(written);
		return decision;
	}

	const stopped = await tx
		.update(svSimulationDeliveries)
		.set({
			status: decision.status,
			attemptsMade: input.claim.attempt,
			nextAttemptAt: null,
			claimedAt: null,
			lastError: decision.reason.slice(0, 300),
			updatedAt: input.now,
		})
		.where(claimHeld(input.claim))
		.returning({ id: svSimulationDeliveries.id });
	assertClaimHeld(stopped);

	if (decision.status === "UNBOUND")
		await unbindTelegramRecipient(tx, context, {
			projectRef: input.claim.projectRef,
			reason: "TELEGRAM_RECIPIENT_GONE",
			correlationId: input.claim.correlationId,
			now: input.now,
		});

	await recordAudit(tx, context, {
		event: "SIMULATION_TELEGRAM_DELIVERY_FAILED",
		correlationId: input.claim.correlationId,
		projectRef: input.claim.projectRef,
		subjectKind: "sv_simulation_deliveries",
		subjectId: input.claim.deliveryId,
		now: input.now,
		details: { attempts: input.claim.attempt, status: decision.status, reason: decision.reason.slice(0, 200) },
	});
	return decision;
}

export async function readDeliveryState(
	tx: Tx,
	context: SimulationContext,
	deliveryId: string,
): Promise<{
	deliveryId: string;
	status: DeliveryStatus;
	attemptsMade: number;
	deliveredAt: Date | null;
	nextAttemptAt: Date | null;
	attempts: { attempt: number; outcome: string; detail: string | null; attemptedAt: Date }[];
} | null> {
	const [row] = await tx
		.select({
			id: svSimulationDeliveries.id,
			status: svSimulationDeliveries.status,
			attemptsMade: svSimulationDeliveries.attemptsMade,
			deliveredAt: svSimulationDeliveries.deliveredAt,
			nextAttemptAt: svSimulationDeliveries.nextAttemptAt,
		})
		.from(svSimulationDeliveries)
		.where(and(eq(svSimulationDeliveries.organizationId, context.tenantId), eq(svSimulationDeliveries.id, deliveryId)))
		.limit(1);
	if (!row) return null;
	const attempts = await tx
		.select({
			attempt: svSimulationDeliveryAttempts.attempt,
			outcome: svSimulationDeliveryAttempts.outcome,
			detail: svSimulationDeliveryAttempts.detail,
			attemptedAt: svSimulationDeliveryAttempts.attemptedAt,
		})
		.from(svSimulationDeliveryAttempts)
		.where(eq(svSimulationDeliveryAttempts.deliveryId, deliveryId))
		.orderBy(svSimulationDeliveryAttempts.attempt);
	return {
		deliveryId: row.id as string,
		status: row.status as DeliveryStatus,
		attemptsMade: row.attemptsMade as number,
		deliveredAt: (row.deliveredAt as Date | null) ?? null,
		nextAttemptAt: (row.nextAttemptAt as Date | null) ?? null,
		attempts: attempts as { attempt: number; outcome: string; detail: string | null; attemptedAt: Date }[],
	};
}
