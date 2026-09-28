import * as Sentry from "@sentry/node";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { getKeyring, type Keyring } from "@workspace/lib/secrets";
import { readTelegramDeliveryConfig } from "@workspace/lib/selena-delivery-connect";
import { sendTelegramText, type TelegramSendResult } from "@workspace/lib/selena-telegram-adapter";
import { buildWeeklyDigest, renderWeeklyDigestMessage } from "@workspace/lib/selena-weekly-digest";
import {
	claimDigestDelivery,
	type DigestDeliveryClaim,
	ensureDigestDelivery,
	listWeeklyDigestTargets,
	readWeeklyDigestSource,
	recordDigestAttempt,
	saveWeeklyDigest,
	type WeeklyDigestSource,
	type WeeklyDigestTarget,
} from "@workspace/lib/selena-weekly-digest-store";
import type { DeliveryDecision, DeliveryOutcome } from "@workspace/selena-visibility-contracts";
import type { Job } from "pg-boss";

export const WEEKLY_DIGEST_QUEUE = "selena-weekly-digest";
/** Mondays at 06:00 UTC, reporting the Monday-to-Monday week that just ended. */
export const WEEKLY_DIGEST_CRON = "0 6 * * 1";

export type SelenaWeeklyDigestData =
	| { kind?: "sweep"; source?: string }
	| { kind: "deliver"; organizationId: string; deliveryId: string };

/** Unset means off: a message to a client is an owner decision. */
export function isWeeklyDigestEnabled(value: string | undefined): boolean {
	return value === "true";
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The last full UTC week, Monday 00:00 to Monday 00:00, before `now`. */
export function weeklyDigestPeriod(now: Date): { periodStart: Date; periodEnd: Date } {
	const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	periodEnd.setUTCDate(periodEnd.getUTCDate() - ((periodEnd.getUTCDay() + 6) % 7));
	return { periodStart: new Date(periodEnd.getTime() - WEEK_MS), periodEnd };
}

/** What one workspace's scoped transaction can do; nothing here can see another workspace. */
export type TenantDigestStore = {
	readSource(projectId: string): Promise<WeeklyDigestSource | null>;
	saveDigest(input: Parameters<typeof saveWeeklyDigest>[2]): Promise<{ digestId: string; created: boolean }>;
	ensureDelivery(input: Parameters<typeof ensureDigestDelivery>[2]): Promise<{ deliveryId: string }>;
	claim(input: {
		deliveryId: string;
		now: Date;
	}): Promise<{ kind: "SEND"; claim: DigestDeliveryClaim } | { kind: "REFUSE"; code: string }>;
	record(input: { claim: DigestDeliveryClaim; outcome: DeliveryOutcome; now: Date }): Promise<DeliveryDecision>;
};

export type WeeklyDigestDeps = {
	env: Record<string, string | undefined>;
	now: () => Date;
	listTargets(): Promise<WeeklyDigestTarget[]>;
	inTenant<T>(organizationId: string, work: (store: TenantDigestStore) => Promise<T>): Promise<T>;
	send(input: { botToken: string; chatId: string; text: string }): Promise<TelegramSendResult>;
	/** Queues the next attempt; the claim re-checks the time, so an early job cannot send early. */
	scheduleDelivery(input: { organizationId: string; deliveryId: string }, startAfter: Date): Promise<void>;
};

export type TargetOutcome =
	| "NO_PROJECT"
	| "NO_RECIPIENT"
	| "NO_FINISHED_CYCLE"
	| "NO_BRAND_TO_COUNT"
	| "NO_NEW_CYCLE"
	| "DELIVERED"
	| "RETRY_SCHEDULED"
	| "FAILED"
	| "UNBOUND"
	| `REFUSED:${string}`
	| "ERROR";

export type DeliveryResult = Exclude<TargetOutcome, "NO_PROJECT" | "NO_RECIPIENT" | "NO_FINISHED_CYCLE">;

function config(env: Record<string, string | undefined>) {
	return readTelegramDeliveryConfig(env);
}

/**
 * One attempt at one saved digest. The digest text is rendered from the saved
 * row, not from anything recomputed, so what is sent is what was stored.
 */
export async function deliverWeeklyDigest(
	deps: WeeklyDigestDeps,
	input: { organizationId: string; deliveryId: string },
): Promise<DeliveryResult> {
	const telegram = config(deps.env);
	if (!telegram) return "REFUSED:SELENA_WEEKLY_DIGEST_DISABLED";

	const claimed = await deps.inTenant(input.organizationId, (store) =>
		store.claim({ deliveryId: input.deliveryId, now: deps.now() }),
	);
	if (claimed.kind === "REFUSE") return `REFUSED:${claimed.code}`;
	const { claim } = claimed;

	let outcome: DeliveryOutcome;
	try {
		const text = renderWeeklyDigestMessage(claim.content, claim.locale, `${telegram.appUrl}/app/selena`);
		outcome = (await deps.send({ botToken: telegram.botToken, chatId: claim.chatId, text })).outcome;
	} catch (error) {
		// The attempt was already counted at claim time; recording it keeps the
		// row from sitting in SENDING until its lease runs out.
		outcome = { kind: "TEMPORARY_FAILURE", detail: error instanceof Error ? error.message : "send_failed" };
	}

	const decision = await deps.inTenant(input.organizationId, (store) =>
		store.record({ claim, outcome, now: deps.now() }),
	);
	if (decision.kind === "DELIVERED") return "DELIVERED";
	if (decision.kind === "RETRY") {
		await deps.scheduleDelivery(input, decision.nextAttemptAt);
		return "RETRY_SCHEDULED";
	}
	return decision.status;
}

/**
 * The weekly pass. Each workspace is read and written only inside its own
 * scope, and one workspace's failure does not stop the others.
 */
export async function runWeeklyDigestSweep(
	deps: WeeklyDigestDeps,
): Promise<{ skipped: string } | { outcomes: Array<WeeklyDigestTarget & { outcome: TargetOutcome }> }> {
	if (!isWeeklyDigestEnabled(deps.env.SELENA_WEEKLY_DIGEST_ENABLED)) return { skipped: "DISABLED" };
	// Nothing is saved without a way to send it: a digest that can never be
	// delivered would still read as "sent this week" in the store.
	if (!config(deps.env)) return { skipped: "TELEGRAM_NOT_CONFIGURED" };

	const now = deps.now();
	const { periodStart, periodEnd } = weeklyDigestPeriod(now);
	const outcomes: Array<WeeklyDigestTarget & { outcome: TargetOutcome }> = [];

	for (const target of await deps.listTargets()) {
		let outcome: TargetOutcome;
		try {
			const prepared = await deps.inTenant(target.organizationId, async (store) => {
				const source = await store.readSource(target.projectId);
				if (!source) return "NO_PROJECT" as const;
				if (!source.recipient) return "NO_RECIPIENT" as const;
				if (!source.cycle) return "NO_FINISHED_CYCLE" as const;
				if (!source.report) return "NO_BRAND_TO_COUNT" as const;
				const content = buildWeeklyDigest({
					projectName: source.projectName,
					periodStart,
					periodEnd,
					cycle: source.cycle,
					previousCycleId: source.previousCycleId,
					report: source.report,
					diff: source.diff,
				});
				if (!content) return "NO_NEW_CYCLE" as const;
				const { digestId } = await store.saveDigest({ projectId: target.projectId, content, now });
				return store.ensureDelivery({ digestId, recipientId: source.recipient.id, now });
			});
			outcome =
				typeof prepared === "string"
					? prepared
					: await deliverWeeklyDigest(deps, {
							organizationId: target.organizationId,
							deliveryId: prepared.deliveryId,
						});
		} catch (error) {
			Sentry.captureException(error);
			console.error("[selena-weekly-digest] target failed", error instanceof Error ? error.name : "unknown");
			outcome = "ERROR";
		}
		outcomes.push({ ...target, outcome });
	}
	return { outcomes };
}

function databaseDeps(scheduleDelivery: WeeklyDigestDeps["scheduleDelivery"]): WeeklyDigestDeps {
	let keyring: Keyring | null = null;
	const requireKeyring = () => {
		keyring ??= getKeyring(process.env);
		if (!keyring) throw new Error("SELENA_WEEKLY_DIGEST_ENCRYPTION_KEY_MISSING");
		return keyring;
	};
	return {
		env: process.env,
		now: () => new Date(),
		listTargets: () => listWeeklyDigestTargets(db),
		inTenant: (organizationId, work) =>
			withOrganizationTransaction(db, organizationId, (tx) =>
				work({
					readSource: (projectId) => readWeeklyDigestSource(tx, organizationId, projectId),
					saveDigest: (input) => saveWeeklyDigest(tx, organizationId, input),
					ensureDelivery: (input) => ensureDigestDelivery(tx, organizationId, input),
					claim: (input) => claimDigestDelivery(tx, organizationId, { ...input, keyring: requireKeyring() }),
					record: (input) => recordDigestAttempt(tx, organizationId, input),
				}),
			),
		send: ({ botToken, chatId, text }) => sendTelegramText({ botToken }, { chatId, text }),
		scheduleDelivery,
	};
}

export function createSelenaWeeklyDigestJob(scheduleDelivery: WeeklyDigestDeps["scheduleDelivery"]) {
	return async function selenaWeeklyDigestJob(jobs: Job<SelenaWeeklyDigestData>[]): Promise<void> {
		if (!isWeeklyDigestEnabled(process.env.SELENA_WEEKLY_DIGEST_ENABLED)) {
			console.log("[selena-weekly-digest] Skipped: SELENA_WEEKLY_DIGEST_ENABLED is not 'true'");
			return;
		}
		const deps = databaseDeps(scheduleDelivery);
		for (const job of jobs) {
			const data = job.data ?? {};
			if (data.kind === "deliver") {
				const result = await deliverWeeklyDigest(deps, data);
				console.log(`[selena-weekly-digest] delivery attempt: ${result}`);
				continue;
			}
			const summary = await runWeeklyDigestSweep(deps);
			if ("skipped" in summary) {
				console.log(`[selena-weekly-digest] Skipped: ${summary.skipped}`);
				continue;
			}
			const counts = new Map<string, number>();
			for (const { outcome } of summary.outcomes) counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
			console.log(`[selena-weekly-digest] ${JSON.stringify(Object.fromEntries(counts))}`);
			if (counts.has("ERROR")) throw new Error("SELENA_WEEKLY_DIGEST_TARGETS_FAILED");
		}
	};
}
