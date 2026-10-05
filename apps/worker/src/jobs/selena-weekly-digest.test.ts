import assert from "node:assert/strict";
import { test } from "node:test";
import type { CycleDiffReport } from "@workspace/lib/selena-cycle-diff";
import type { GraderReport } from "@workspace/lib/selena-grader-report";
import type { TelegramSendResult } from "@workspace/lib/selena-telegram-adapter";
import type { WeeklyDigestContent } from "@workspace/lib/selena-weekly-digest";
import type { DigestDeliveryClaim, WeeklyDigestSource } from "@workspace/lib/selena-weekly-digest-store";
import {
	DELIVERY_MAX_ATTEMPTS,
	type DeliveryOutcome,
	type DeliveryStatus,
	decideNextDelivery,
	resolveDeliveryPrecondition,
} from "@workspace/selena-visibility-contracts";
import {
	deliverWeeklyDigest,
	runWeeklyDigestSweep,
	type TenantDigestStore,
	type WeeklyDigestDeps,
	weeklyDigestPeriod,
} from "./selena-weekly-digest";

// Synthetic fixtures only: no real workspace, chat or bot.
const ENV = {
	SELENA_WEEKLY_DIGEST_ENABLED: "true",
	SELENA_TELEGRAM_BOT_TOKEN: "000000:synthetic-token",
	SELENA_TELEGRAM_BOT_USERNAME: "synthetic_digest_bot",
	APP_URL: "https://app.example.test",
};
// Monday 2026-09-28 06:00 UTC: the digest covers 09-21 00:00 to 09-28 00:00.
const MONDAY = new Date("2026-09-28T06:00:00Z");
const IN_WEEK = new Date("2026-09-25T12:00:00Z");
const BEFORE_WEEK = new Date("2026-09-18T12:00:00Z");

function report(systems: Array<{ answersAnalyzed: number; brandMentioned: number }>, rate: number | null) {
	return { systems, overall: { brandMentionRate: rate } } as unknown as GraderReport;
}

/**
 * One project's rows as the fake store sees them. With `cycles`, the store
 * resolves the digested cycle from the sweep's window the way the database
 * does; without them it hands back the source as given.
 */
type ProjectRows = WeeklyDigestSource & { cycles?: Array<{ id: string; completedAt: Date }> };

function source(overrides: Partial<ProjectRows> = {}): ProjectRows {
	return {
		projectName: "Synthetic Clinic",
		planId: "visibility-snapshot",
		recipient: { id: "recipient-1", locale: "ru" },
		cycle: { id: "cycle-2", completedAt: IN_WEEK },
		previousCycleId: null,
		report: report(
			[
				{ answersAnalyzed: 3, brandMentioned: 2 },
				{ answersAnalyzed: 3, brandMentioned: 0 },
			],
			0.33,
		),
		diff: null,
		...overrides,
	};
}

type Delivery = {
	id: string;
	digestId: string;
	recipientId: string;
	status: DeliveryStatus;
	attemptsMade: number;
	claimedAt: Date | null;
	nextAttemptAt: Date | null;
};

/** One workspace's rows, with the delivery rules the database layer applies. */
class FakeTenant {
	digests = new Map<string, { id: string; content: WeeklyDigestContent }>();
	deliveries = new Map<string, Delivery>();
	attempts: Array<{ deliveryId: string; attempt: number; outcome: string }> = [];
	recipientStatus: "BOUND" | "UNBOUND" = "BOUND";
	constructor(
		readonly organizationId: string,
		readonly sources: Map<string, ProjectRows>,
		readonly events: string[],
	) {}

	store(clock: () => Date): TenantDigestStore {
		return {
			readSource: async (projectId, window) => {
				const rows = this.sources.get(projectId);
				if (!rows) return null;
				const { cycles, ...given } = rows;
				if (!cycles) return given;
				const finished = cycles
					.filter((cycle) => cycle.completedAt < window.periodEnd)
					.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
				const [current, previous] = finished;
				if (!current) return { ...given, cycle: null, previousCycleId: null, diff: null };
				return {
					...given,
					cycle: current,
					previousCycleId: previous?.id ?? null,
					diff: previous ? ({ changes: [], groups: [] } as unknown as CycleDiffReport) : null,
				};
			},
			saveDigest: async ({ projectId, content }) => {
				const key = `${projectId}:${content.periodStart}`;
				const existing = this.digests.get(key);
				if (existing) return { digestId: existing.id, created: false };
				const id = `digest-${this.digests.size + 1}`;
				this.digests.set(key, { id, content });
				this.events.push(`save:${this.organizationId}:${id}`);
				return { digestId: id, created: true };
			},
			ensureDelivery: async ({ digestId, recipientId, now }) => {
				const found = [...this.deliveries.values()].find(
					(row) => row.digestId === digestId && row.recipientId === recipientId,
				);
				if (found) return { deliveryId: found.id };
				const id = `delivery-${this.deliveries.size + 1}`;
				this.deliveries.set(id, {
					id,
					digestId,
					recipientId,
					status: "PENDING",
					attemptsMade: 0,
					claimedAt: null,
					nextAttemptAt: now,
				});
				return { deliveryId: id };
			},
			claim: async ({ deliveryId, now }) => {
				const row = this.deliveries.get(deliveryId);
				if (!row) return { kind: "REFUSE", code: "SELENA_DELIVERY_UNKNOWN" };
				const digest = [...this.digests.values()].find((item) => item.id === row.digestId);
				const precondition = resolveDeliveryPrecondition({
					reportPersisted: digest !== undefined,
					deliveryStatus: row.status,
					attemptsMade: row.attemptsMade,
					recipientStatus: this.recipientStatus,
					claimedAt: row.claimedAt,
					nextAttemptAt: row.nextAttemptAt,
					now,
				});
				if (precondition.kind === "REFUSE") return precondition;
				Object.assign(row, { status: "SENDING", attemptsMade: precondition.attempt, claimedAt: now });
				const claim: DigestDeliveryClaim = {
					deliveryId,
					recipientId: row.recipientId,
					content: (digest as { content: WeeklyDigestContent }).content,
					locale: "ru",
					chatId: "synthetic-chat",
					attempt: precondition.attempt,
					claimedAt: now,
				};
				return { kind: "SEND", claim };
			},
			record: async ({ claim, outcome, now }) => {
				this.attempts.push({ deliveryId: claim.deliveryId, attempt: claim.attempt, outcome: outcome.kind });
				const decision = decideNextDelivery({ attempt: claim.attempt, outcome, now });
				const row = this.deliveries.get(claim.deliveryId) as Delivery;
				row.claimedAt = null;
				if (decision.kind === "DELIVERED") Object.assign(row, { status: "DELIVERED", nextAttemptAt: null });
				else if (decision.kind === "RETRY")
					Object.assign(row, { status: "RETRY_SCHEDULED", nextAttemptAt: decision.nextAttemptAt });
				else {
					Object.assign(row, { status: decision.status, nextAttemptAt: null });
					if (decision.status === "UNBOUND") this.recipientStatus = "UNBOUND";
				}
				void clock;
				return decision;
			},
		};
	}
}

function harness(options: {
	env?: Record<string, string | undefined>;
	tenants: Record<string, Record<string, ProjectRows>>;
	outcomes?: DeliveryOutcome[];
	failTenant?: string;
}) {
	let now = MONDAY;
	const events: string[] = [];
	const scopes: string[] = [];
	const sent: Array<{ chatId: string; text: string }> = [];
	const scheduled: Array<{ organizationId: string; deliveryId: string; startAfter: Date }> = [];
	const outcomes = [...(options.outcomes ?? [])];
	const tenants = new Map(
		Object.entries(options.tenants).map(([org, projects]) => [
			org,
			new FakeTenant(org, new Map(Object.entries(projects)), events),
		]),
	);
	const deps: WeeklyDigestDeps = {
		env: options.env ?? ENV,
		now: () => now,
		listTargets: async () =>
			[...tenants.entries()].flatMap(([organizationId, tenant]) =>
				[...tenant.sources.keys()].map((projectId) => ({ organizationId, projectId })),
			),
		inTenant: async (organizationId, work) => {
			scopes.push(organizationId);
			if (organizationId === options.failTenant) throw new Error("synthetic tenant failure");
			const tenant = tenants.get(organizationId);
			if (!tenant) throw new Error("unknown tenant");
			return work(tenant.store(() => now));
		},
		send: async ({ chatId, text }): Promise<TelegramSendResult> => {
			events.push("send");
			sent.push({ chatId, text });
			const outcome = outcomes.shift() ?? { kind: "SUCCESS" };
			return { outcome, httpStatus: outcome.kind === "SUCCESS" ? 200 : 502, messageId: null };
		},
		scheduleDelivery: async (input, startAfter) => {
			scheduled.push({ ...input, startAfter });
		},
	};
	return {
		deps,
		events,
		scopes,
		sent,
		scheduled,
		tenant: (org: string) => tenants.get(org) as FakeTenant,
		advanceTo: (at: Date) => {
			now = at;
		},
	};
}

test("the period is the last full Monday-to-Monday UTC week", () => {
	assert.deepEqual(weeklyDigestPeriod(MONDAY), {
		periodStart: new Date("2026-09-21T00:00:00Z"),
		periodEnd: new Date("2026-09-28T00:00:00Z"),
	});
	assert.deepEqual(weeklyDigestPeriod(new Date("2026-09-27T23:59:59Z")), {
		periodStart: new Date("2026-09-14T00:00:00Z"),
		periodEnd: new Date("2026-09-21T00:00:00Z"),
	});
});

test("the sweep does nothing unless the flag is exactly 'true'", async () => {
	for (const flag of [undefined, "", "false", "TRUE", "1"]) {
		const h = harness({ env: { ...ENV, SELENA_WEEKLY_DIGEST_ENABLED: flag }, tenants: { "org-a": { p1: source() } } });
		assert.deepEqual(await runWeeklyDigestSweep(h.deps), { skipped: "DISABLED" });
		assert.deepEqual(h.scopes, []);
		assert.deepEqual(h.sent, []);
	}
});

test("nothing is saved when the bot is not configured", async () => {
	const h = harness({ env: { ...ENV, SELENA_TELEGRAM_BOT_TOKEN: undefined }, tenants: { "org-a": { p1: source() } } });
	assert.deepEqual(await runWeeklyDigestSweep(h.deps), { skipped: "TELEGRAM_NOT_CONFIGURED" });
	assert.deepEqual(h.events, []);
});

test("a week without a newly finished cycle sends nothing", async () => {
	const h = harness({
		tenants: {
			"org-a": {
				stale: source({ cycle: { id: "cycle-1", completedAt: BEFORE_WEEK } }),
				never: source({ cycle: null, report: null }),
			},
		},
	});
	const result = await runWeeklyDigestSweep(h.deps);
	assert.deepEqual("outcomes" in result && result.outcomes.map(({ outcome }) => outcome), [
		"NO_NEW_CYCLE",
		"NO_FINISHED_CYCLE",
	]);
	assert.equal(h.tenant("org-a").digests.size, 0);
	assert.deepEqual(h.sent, []);
});

test("only plans whose offer names the digest receive it", async () => {
	const h = harness({
		tenants: {
			"org-a": {
				snapshot: source({ planId: "visibility-snapshot" }),
				managed: source({ planId: "managed-discovery-90" }),
				legacySnapshot: source({ planId: "visitor-local" }),
				landscape: source({ planId: "full-discovery-landscape" }),
				audit: source({ planId: "competitive-audit" }),
				unknown: source({ planId: "no-such-plan" }),
				unrecorded: source({ planId: null }),
			},
		},
	});
	const result = await runWeeklyDigestSweep(h.deps);
	assert.deepEqual("outcomes" in result && result.outcomes.map(({ projectId, outcome }) => `${projectId}:${outcome}`), [
		"snapshot:DELIVERED",
		"managed:DELIVERED",
		"legacySnapshot:DELIVERED",
		"landscape:DELIVERED",
		"audit:PLAN_EXCLUDES_DIGEST",
		"unknown:PLAN_EXCLUDES_DIGEST",
		"unrecorded:PLAN_EXCLUDES_DIGEST",
	]);
	assert.equal(h.tenant("org-a").digests.size, 4);
	assert.equal(h.sent.length, 4);
});

test("the digest is saved before it is sent, and a rerun never sends it twice", async () => {
	const h = harness({ tenants: { "org-a": { p1: source() } } });
	const first = await runWeeklyDigestSweep(h.deps);
	assert.deepEqual("outcomes" in first && first.outcomes.map(({ outcome }) => outcome), ["DELIVERED"]);
	assert.deepEqual(h.events, ["save:org-a:digest-1", "send"]);
	assert.match(h.sent[0].text, /Synthetic Clinic/);
	assert.match(h.sent[0].text, /https:\/\/app\.example\.test\/app\/selena/);

	const second = await runWeeklyDigestSweep(h.deps);
	assert.deepEqual("outcomes" in second && second.outcomes.map(({ outcome }) => outcome), [
		"REFUSED:SELENA_DELIVERY_ALREADY_DELIVERED",
	]);
	assert.equal(h.sent.length, 1);
	assert.equal(h.tenant("org-a").digests.size, 1);
});

test("a cycle finished on Sunday is digested on Monday even when a newer cycle finished after midnight", async () => {
	const h = harness({
		tenants: {
			"org-a": {
				p1: source({
					cycles: [
						{ id: "sunday", completedAt: new Date("2026-09-27T20:00:00Z") },
						{ id: "monday", completedAt: new Date("2026-09-28T01:00:00Z") },
					],
				}),
			},
		},
	});
	const first = await runWeeklyDigestSweep(h.deps);
	assert.deepEqual("outcomes" in first && first.outcomes.map(({ outcome }) => outcome), ["DELIVERED"]);
	assert.match(h.sent[0].text, /2026-09-21 — 2026-09-28/);
	const [sundayDigest] = [...h.tenant("org-a").digests.values()];
	assert.equal(sundayDigest.content.cycleId, "sunday");
	assert.equal(sundayDigest.content.previousCycleId, null);

	// The week after, the Monday cycle is the news and the Sunday one is what it is compared with.
	h.advanceTo(new Date("2026-10-05T06:00:00Z"));
	const second = await runWeeklyDigestSweep(h.deps);
	assert.deepEqual("outcomes" in second && second.outcomes.map(({ outcome }) => outcome), ["DELIVERED"]);
	assert.match(h.sent[1].text, /2026-09-28 — 2026-10-05/);
	const digests = [...h.tenant("org-a").digests.values()];
	assert.equal(digests.length, 2);
	assert.equal(digests[1].content.cycleId, "monday");
	assert.equal(digests[1].content.previousCycleId, "sunday");
	assert.equal(h.sent.length, 2);
});

test("a system with no analyzed answers is reported as unknown, never as zero", async () => {
	const h = harness({
		tenants: {
			"org-a": {
				p1: source({
					report: report(
						[
							{ answersAnalyzed: 0, brandMentioned: 0 },
							{ answersAnalyzed: 0, brandMentioned: 0 },
						],
						null,
					),
				}),
			},
		},
	});
	await runWeeklyDigestSweep(h.deps);
	const text = h.sent[0].text;
	assert.match(text, /нет данных: 2/);
	assert.match(text, /Доля ответов с упоминанием: неизвестно/);
	assert.doesNotMatch(text, /0%/);
	const [{ content }] = [...h.tenant("org-a").digests.values()];
	assert.equal(content.brandMentionRate, null);
	assert.deepEqual(content.systems, { total: 2, mentioned: 0, notMentioned: 0, unknown: 2 });
});

test("changes are reported against the previous cycle, with incomparable groups called out", async () => {
	const diff = {
		changes: [{ type: "MENTION_APPEARED" }, { type: "POSITION_SHIFTED", basePosition: 3, comparePosition: 1 }],
		groups: [{ status: "UNKNOWN" }, { status: "COMPARABLE" }],
	} as unknown as CycleDiffReport;
	const h = harness({ tenants: { "org-a": { p1: source({ previousCycleId: "cycle-1", diff }) } } });
	await runWeeklyDigestSweep(h.deps);
	assert.match(h.sent[0].text, /появились упоминания: 1/);
	assert.match(h.sent[0].text, /бренд назван раньше: 1/);
	assert.match(h.sent[0].text, /Не удалось сравнить: 1/);
});

test("temporary failures follow the five-attempt schedule, then stop", async () => {
	const failure: DeliveryOutcome = { kind: "TEMPORARY_FAILURE", detail: "synthetic 502" };
	const h = harness({ tenants: { "org-a": { p1: source() } }, outcomes: Array(6).fill(failure) });

	const sweep = await runWeeklyDigestSweep(h.deps);
	assert.deepEqual("outcomes" in sweep && sweep.outcomes.map(({ outcome }) => outcome), ["RETRY_SCHEDULED"]);

	// A redelivered job that fires before its time is refused, not sent early.
	assert.equal(
		await deliverWeeklyDigest(h.deps, { organizationId: "org-a", deliveryId: "delivery-1" }),
		"REFUSED:SELENA_DELIVERY_NOT_DUE",
	);

	const results: string[] = [];
	while (h.scheduled.length > results.length) {
		const next = h.scheduled[results.length];
		h.advanceTo(next.startAfter);
		results.push(await deliverWeeklyDigest(h.deps, next));
	}
	assert.deepEqual(results, ["RETRY_SCHEDULED", "RETRY_SCHEDULED", "RETRY_SCHEDULED", "FAILED"]);
	assert.equal(h.sent.length, DELIVERY_MAX_ATTEMPTS);

	const waits = h.scheduled.map((item, index) => {
		const from = index === 0 ? MONDAY : h.scheduled[index - 1].startAfter;
		return (item.startAfter.getTime() - from.getTime()) / 60_000;
	});
	assert.deepEqual(waits, [1, 5, 30, 120]);
	assert.deepEqual(
		h.tenant("org-a").attempts.map(({ attempt }) => attempt),
		[1, 2, 3, 4, 5],
	);

	h.advanceTo(new Date(MONDAY.getTime() + 24 * 60 * 60 * 1000));
	assert.equal(
		await deliverWeeklyDigest(h.deps, { organizationId: "org-a", deliveryId: "delivery-1" }),
		"REFUSED:SELENA_DELIVERY_ATTEMPTS_EXHAUSTED",
	);
	assert.equal(h.sent.length, DELIVERY_MAX_ATTEMPTS);
});

test("a chat that is gone is unbound instead of retried", async () => {
	const h = harness({
		tenants: { "org-a": { p1: source() } },
		outcomes: [{ kind: "RECIPIENT_GONE", detail: "Forbidden: bot was blocked by the user" }],
	});
	const sweep = await runWeeklyDigestSweep(h.deps);
	assert.deepEqual("outcomes" in sweep && sweep.outcomes.map(({ outcome }) => outcome), ["UNBOUND"]);
	assert.deepEqual(h.scheduled, []);
	assert.equal(h.tenant("org-a").recipientStatus, "UNBOUND");
});

test("each workspace is handled in its own scope and one failure does not stop the rest", async () => {
	const h = harness({
		tenants: {
			"org-a": { p1: source({ projectName: "Tenant A" }) },
			"org-b": { p2: source({ projectName: "Tenant B" }) },
			"org-c": { p3: source({ projectName: "Tenant C" }) },
		},
		failTenant: "org-b",
	});
	const sweep = await runWeeklyDigestSweep(h.deps);
	assert.deepEqual(
		"outcomes" in sweep && sweep.outcomes.map(({ organizationId, outcome }) => `${organizationId}:${outcome}`),
		["org-a:DELIVERED", "org-b:ERROR", "org-c:DELIVERED"],
	);
	assert.deepEqual(
		h.sent.map(({ text }) => text.split("\n")[0]),
		["Selena · отчёт за неделю: Tenant A", "Selena · отчёт за неделю: Tenant C"],
	);
	// Every read and write ran under the workspace it belonged to.
	assert.deepEqual(h.scopes, ["org-a", "org-a", "org-a", "org-b", "org-c", "org-c", "org-c"]);
	assert.equal(h.tenant("org-a").digests.size, 1);
	assert.equal(h.tenant("org-c").digests.size, 1);
});
