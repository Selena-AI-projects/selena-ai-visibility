import {
	type DeliveryDecision,
	type DeliveryOutcome,
	type DeliveryStatus,
	decideNextDelivery,
	resolveDeliveryPrecondition,
} from "@workspace/selena-visibility-contracts";
import { and, desc, eq, inArray, max, sql } from "drizzle-orm";
import type { OrganizationDatabase, OrganizationTransaction } from "./db/organization-transaction";
import {
	svConfigurationLocks,
	svCycles,
	svDeliveryRecipients,
	svDigestDeliveries,
	svDigestDeliveryAttempts,
	svOrders,
	svProjects,
	svRuns,
	svScenarios,
	svWeeklyDigests,
} from "./db/schema";
import { decryptSecret, type Keyring } from "./secrets/crypto";
import { type CycleDiffReport, computeCycleDiff } from "./selena-cycle-diff";
import { buildCycleGraderReport } from "./selena-cycle-report";
import { DELIVERY_RECIPIENT_CHAT_AAD, type DeliveryLocale } from "./selena-delivery-connect";
import type { GraderReport } from "./selena-grader-report";
import { readCycleLedger } from "./selena-visibility-repositories";
import { canonicalWeeklyDigest, type WeeklyDigestContent } from "./selena-weekly-digest";

/**
 * The durable half of the weekly digest. Every function but the first takes a
 * transaction already scoped to one workspace; the rules it applies — the
 * five-attempt cap, report-before-send, never twice — come from the contracts.
 */

export type WeeklyDigestTarget = { organizationId: string; projectId: string };

/** The one unscoped read: which workspaces have a chat to send to. */
export async function listWeeklyDigestTargets(db: OrganizationDatabase): Promise<WeeklyDigestTarget[]> {
	const result = await db.execute(
		sql`SELECT "organization_id", "project_id" FROM public.sv_list_weekly_digest_targets()`,
	);
	return (result.rows as { organization_id: string; project_id: string }[]).map((row) => ({
		organizationId: row.organization_id,
		projectId: row.project_id,
	}));
}

export type WeeklyDigestSource = {
	projectName: string;
	recipient: { id: string; locale: DeliveryLocale } | null;
	/** The newest finished cycle; completedAt is null when none of its runs finished. */
	cycle: { id: string; completedAt: Date | null } | null;
	previousCycleId: string | null;
	/** Null when the cycle's lock names no brand, so nothing can be counted. */
	report: GraderReport | null;
	diff: CycleDiffReport | null;
};

// READY is the only state in which a cycle's evidence is final.
const FINISHED_CYCLE_STATUS = "READY" as const;

export async function readWeeklyDigestSource(
	tx: OrganizationTransaction,
	organizationId: string,
	projectId: string,
): Promise<WeeklyDigestSource | null> {
	const [project] = await tx
		.select({ name: svProjects.name })
		.from(svProjects)
		.where(and(eq(svProjects.id, projectId), eq(svProjects.organizationId, organizationId)))
		.limit(1);
	if (!project) return null;

	const [recipient] = await tx
		.select({ id: svDeliveryRecipients.id, locale: svDeliveryRecipients.locale })
		.from(svDeliveryRecipients)
		.where(
			and(
				eq(svDeliveryRecipients.organizationId, organizationId),
				eq(svDeliveryRecipients.projectId, projectId),
				eq(svDeliveryRecipients.channel, "telegram"),
				eq(svDeliveryRecipients.status, "BOUND"),
			),
		)
		.limit(1);

	const cycles = await tx
		.select({ id: svCycles.id, lockId: svCycles.lockId })
		.from(svCycles)
		.innerJoin(svOrders, eq(svCycles.orderId, svOrders.id))
		.where(
			and(
				eq(svOrders.projectId, projectId),
				eq(svOrders.organizationId, organizationId),
				eq(svCycles.organizationId, organizationId),
				eq(svCycles.status, FINISHED_CYCLE_STATUS),
			),
		)
		.orderBy(desc(svCycles.createdAt))
		.limit(2);

	const base: WeeklyDigestSource = {
		projectName: project.name,
		recipient: recipient ? { id: recipient.id, locale: recipient.locale === "en" ? "en" : "ru" } : null,
		cycle: null,
		previousCycleId: null,
		report: null,
		diff: null,
	};
	const [current, previous] = cycles;
	if (!current) return base;

	// A cycle has no completion stamp of its own; it finished when its last run did.
	const [finished] = await tx
		.select({ at: max(svRuns.finishedAt) })
		.from(svRuns)
		.where(and(eq(svRuns.cycleId, current.id), eq(svRuns.organizationId, organizationId)));

	const [lock] = await tx
		.select({ snapshot: svConfigurationLocks.snapshot })
		.from(svConfigurationLocks)
		.where(and(eq(svConfigurationLocks.id, current.lockId), eq(svConfigurationLocks.organizationId, organizationId)))
		.limit(1);
	const runs = await tx
		.select({
			id: svRuns.id,
			scenarioId: svRuns.scenarioId,
			systemId: svRuns.systemId,
			channel: svRuns.channel,
			captureMode: svRuns.captureMode,
			canonicalPayload: svRuns.canonicalPayload,
		})
		.from(svRuns)
		.where(and(eq(svRuns.cycleId, current.id), eq(svRuns.organizationId, organizationId)));
	const scenarioIds = [...new Set(runs.map((run) => run.scenarioId))];
	const scenarios =
		scenarioIds.length === 0
			? []
			: await tx
					.select({ id: svScenarios.id, text: svScenarios.text, language: svScenarios.language })
					.from(svScenarios)
					.where(and(inArray(svScenarios.id, scenarioIds), eq(svScenarios.organizationId, organizationId)));

	let diff: CycleDiffReport | null = null;
	if (previous) {
		const [baseLedger, compareLedger] = [
			await readCycleLedger(tx, organizationId, previous.id),
			await readCycleLedger(tx, organizationId, current.id),
		];
		diff = computeCycleDiff(baseLedger, compareLedger);
	}

	return {
		...base,
		cycle: { id: current.id, completedAt: finished?.at ?? null },
		previousCycleId: previous?.id ?? null,
		report: buildCycleGraderReport({ lockSnapshot: lock?.snapshot, runs, scenarios }),
		diff,
	};
}

/**
 * Saves the digest before anything is sent. A week has one digest per
 * project: a second run of the job finds the saved one and sends that,
 * because the row is what the client is shown to have received.
 */
export async function saveWeeklyDigest(
	tx: OrganizationTransaction,
	organizationId: string,
	input: { projectId: string; content: WeeklyDigestContent; now: Date },
): Promise<{ digestId: string; created: boolean }> {
	const { canonical, sha256 } = canonicalWeeklyDigest(input.content);
	const [row] = await tx
		.insert(svWeeklyDigests)
		.values({
			organizationId,
			projectId: input.projectId,
			cycleId: input.content.cycleId,
			previousCycleId: input.content.previousCycleId,
			periodStart: new Date(input.content.periodStart),
			periodEnd: new Date(input.content.periodEnd),
			contentJson: JSON.parse(canonical),
			contentCanonical: canonical,
			contentSha256: sha256,
			createdAt: input.now,
		})
		.onConflictDoNothing({
			target: [svWeeklyDigests.organizationId, svWeeklyDigests.projectId, svWeeklyDigests.periodStart],
		})
		.returning({ id: svWeeklyDigests.id });
	if (row) return { digestId: row.id, created: true };

	const [existing] = await tx
		.select({ id: svWeeklyDigests.id })
		.from(svWeeklyDigests)
		.where(
			and(
				eq(svWeeklyDigests.organizationId, organizationId),
				eq(svWeeklyDigests.projectId, input.projectId),
				eq(svWeeklyDigests.periodStart, new Date(input.content.periodStart)),
			),
		)
		.limit(1);
	if (!existing) throw new Error("SELENA_WEEKLY_DIGEST_WRITE_FAILED");
	return { digestId: existing.id, created: false };
}

export async function ensureDigestDelivery(
	tx: OrganizationTransaction,
	organizationId: string,
	input: { digestId: string; recipientId: string; now: Date },
): Promise<{ deliveryId: string }> {
	const [row] = await tx
		.insert(svDigestDeliveries)
		.values({
			organizationId,
			digestId: input.digestId,
			recipientId: input.recipientId,
			status: "PENDING",
			attemptsMade: 0,
			nextAttemptAt: input.now,
			createdAt: input.now,
			updatedAt: input.now,
		})
		.onConflictDoNothing({ target: [svDigestDeliveries.digestId, svDigestDeliveries.recipientId] })
		.returning({ id: svDigestDeliveries.id });
	if (row) return { deliveryId: row.id };
	const [existing] = await tx
		.select({ id: svDigestDeliveries.id })
		.from(svDigestDeliveries)
		.where(
			and(
				eq(svDigestDeliveries.organizationId, organizationId),
				eq(svDigestDeliveries.digestId, input.digestId),
				eq(svDigestDeliveries.recipientId, input.recipientId),
			),
		)
		.limit(1);
	if (!existing) throw new Error("SELENA_DIGEST_DELIVERY_WRITE_FAILED");
	return { deliveryId: existing.id };
}

export type DigestDeliveryClaim = {
	deliveryId: string;
	recipientId: string;
	content: WeeklyDigestContent;
	locale: DeliveryLocale;
	chatId: string;
	attempt: number;
	claimedAt: Date;
};

/**
 * Claims one delivery and decides whether it may send. As in the staging
 * simulation, the row is marked SENDING and the attempt counted before the
 * transaction commits, so a second worker refuses and a crash mid-send still
 * leaves the attempt on the books.
 */
export async function claimDigestDelivery(
	tx: OrganizationTransaction,
	organizationId: string,
	input: { deliveryId: string; now: Date; keyring: Keyring },
): Promise<{ kind: "SEND"; claim: DigestDeliveryClaim } | { kind: "REFUSE"; code: string }> {
	const [delivery] = await tx
		.select({
			id: svDigestDeliveries.id,
			digestId: svDigestDeliveries.digestId,
			recipientId: svDigestDeliveries.recipientId,
			status: svDigestDeliveries.status,
			attemptsMade: svDigestDeliveries.attemptsMade,
			claimedAt: svDigestDeliveries.claimedAt,
			nextAttemptAt: svDigestDeliveries.nextAttemptAt,
		})
		.from(svDigestDeliveries)
		.where(and(eq(svDigestDeliveries.organizationId, organizationId), eq(svDigestDeliveries.id, input.deliveryId)))
		.for("update");
	if (!delivery) return { kind: "REFUSE", code: "SELENA_DELIVERY_UNKNOWN" };

	const [recipient] = await tx
		.select({
			status: svDeliveryRecipients.status,
			locale: svDeliveryRecipients.locale,
			chatIdCiphertext: svDeliveryRecipients.chatIdCiphertext,
		})
		.from(svDeliveryRecipients)
		.where(
			and(eq(svDeliveryRecipients.organizationId, organizationId), eq(svDeliveryRecipients.id, delivery.recipientId)),
		)
		.limit(1);
	const [digest] = await tx
		.select({ contentCanonical: svWeeklyDigests.contentCanonical })
		.from(svWeeklyDigests)
		.where(and(eq(svWeeklyDigests.organizationId, organizationId), eq(svWeeklyDigests.id, delivery.digestId)))
		.limit(1);

	const precondition = resolveDeliveryPrecondition({
		reportPersisted: digest !== undefined,
		deliveryStatus: delivery.status as DeliveryStatus,
		attemptsMade: delivery.attemptsMade,
		recipientStatus: recipient?.status === "BOUND" ? "BOUND" : "UNBOUND",
		claimedAt: delivery.claimedAt,
		nextAttemptAt: delivery.nextAttemptAt,
		now: input.now,
	});
	if (precondition.kind === "REFUSE") return { kind: "REFUSE", code: precondition.code };

	const chatId = await decryptSecret(recipient?.chatIdCiphertext, {
		keyring: input.keyring,
		aad: DELIVERY_RECIPIENT_CHAT_AAD,
	});
	await tx
		.update(svDigestDeliveries)
		.set({
			status: "SENDING",
			attemptsMade: precondition.attempt,
			claimedAt: input.now,
			nextAttemptAt: null,
			updatedAt: input.now,
		})
		.where(eq(svDigestDeliveries.id, delivery.id));

	return {
		kind: "SEND",
		claim: {
			deliveryId: delivery.id,
			recipientId: delivery.recipientId,
			content: JSON.parse((digest as { contentCanonical: string }).contentCanonical) as WeeklyDigestContent,
			locale: recipient?.locale === "en" ? "en" : "ru",
			chatId,
			attempt: precondition.attempt,
			claimedAt: input.now,
		},
	};
}

/**
 * Writes down what one attempt did and what happens next. Every update is
 * conditioned on the claim, so a worker whose lease was taken over cannot
 * overwrite the state written by the one that took it.
 */
export async function recordDigestAttempt(
	tx: OrganizationTransaction,
	organizationId: string,
	input: { claim: DigestDeliveryClaim; outcome: DeliveryOutcome; now: Date },
): Promise<DeliveryDecision> {
	const { claim, outcome, now } = input;
	await tx.insert(svDigestDeliveryAttempts).values({
		organizationId,
		deliveryId: claim.deliveryId,
		attempt: claim.attempt,
		outcome: outcome.kind,
		detail: outcome.kind === "SUCCESS" ? null : outcome.detail.slice(0, 300),
		attemptedAt: now,
	});

	const decision = decideNextDelivery({ attempt: claim.attempt, outcome, now });
	const lastError = outcome.kind === "SUCCESS" ? null : outcome.detail.slice(0, 300);
	const update =
		decision.kind === "DELIVERED"
			? { status: "DELIVERED", deliveredAt: now, nextAttemptAt: null, lastError: null }
			: decision.kind === "RETRY"
				? { status: "RETRY_SCHEDULED", nextAttemptAt: decision.nextAttemptAt, lastError }
				: { status: decision.status, nextAttemptAt: null, lastError: decision.reason.slice(0, 300) };
	const written = await tx
		.update(svDigestDeliveries)
		.set({ ...update, attemptsMade: claim.attempt, claimedAt: null, updatedAt: now })
		.where(and(eq(svDigestDeliveries.id, claim.deliveryId), eq(svDigestDeliveries.claimedAt, claim.claimedAt)))
		.returning({ id: svDigestDeliveries.id });
	if (written.length === 0) throw new Error("SELENA_DELIVERY_CLAIM_LOST");

	if (decision.kind === "STOP" && decision.status === "UNBOUND")
		await tx
			.update(svDeliveryRecipients)
			.set({ status: "UNBOUND", unboundAt: now, unboundReason: "TELEGRAM_RECIPIENT_GONE" })
			.where(
				and(
					eq(svDeliveryRecipients.organizationId, organizationId),
					eq(svDeliveryRecipients.id, claim.recipientId),
					eq(svDeliveryRecipients.status, "BOUND"),
				),
			);
	return decision;
}
