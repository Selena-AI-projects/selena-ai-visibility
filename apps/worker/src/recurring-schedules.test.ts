import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import type { PgBoss } from "pg-boss";
import { type RecurringScheduleOptions, reconcileAndStartRecurringSchedules } from "./recurring-schedules";
import { ownerManagedPgBossRuntimeOptions } from "./runtime-boss-options";

type ScheduleCall = {
	name: string;
	cron: string;
	data: unknown;
	options: unknown;
};

function fakeScheduler(events: string[], existingSchedules: Array<{ name: string; key?: string }> = []) {
	const scheduled: ScheduleCall[] = [];
	const unscheduled: string[] = [];
	const scheduler = {
		schedule: async (name: string, cron: string, data: unknown, options: unknown) => {
			events.push(`schedule:${name}`);
			scheduled.push({ name, cron, data, options });
		},
		unschedule: async (name: string) => {
			events.push(`unschedule:${name}`);
			unscheduled.push(name);
		},
		getSchedules: async () => existingSchedules,
	};
	return {
		scheduler: scheduler as unknown as Pick<PgBoss, "schedule" | "unschedule" | "getSchedules">,
		scheduled,
		unscheduled,
	};
}

const allEnabled: RecurringScheduleOptions = {
	recurringEnabled: "true",
	legacyProviderExecutionEnabled: true,
	maintenanceEnabled: true,
	answerRetentionEnabled: "true",
	weeklyDigestEnabled: "true",
	deploymentMode: "whitelabel",
	ownerManaged: false,
};

test("web and worker processing clients cannot start a Timekeeper", () => {
	const workerBoss = readFileSync(resolve(__dirname, "boss.ts"), "utf8");
	const webBoss = readFileSync(resolve(__dirname, "../../web/src/lib/boss-client.ts"), "utf8");

	assert.match(workerBoss, /const boss = new PgBoss\(\{[\s\S]*schedule: false,/);
	assert.match(webBoss, /const boss = new PgBoss\(\{[\s\S]*schedule: false,/);
});

test("owner-managed runtime disables supervisor-owned maintenance, stats, and warnings", () => {
	assert.deepEqual(ownerManagedPgBossRuntimeOptions({ createSchema: false, migrate: false }), {
		supervise: false,
		persistQueueStats: false,
		persistWarnings: false,
	});
	assert.deepEqual(ownerManagedPgBossRuntimeOptions({ createSchema: true, migrate: true }), {});
});

test("recurring startup is off by default and removes every managed schedule", async () => {
	for (const recurringEnabled of [undefined, "", "false", "TRUE", "1"]) {
		const events: string[] = [];
		const { scheduler, scheduled, unscheduled } = fakeScheduler(events);
		let schedulerStarts = 0;

		const started = await reconcileAndStartRecurringSchedules(
			scheduler,
			{ ...allEnabled, recurringEnabled },
			async () => {
				schedulerStarts += 1;
				return "started";
			},
		);

		assert.equal(started, undefined);
		assert.equal(schedulerStarts, 0);
		assert.deepEqual(scheduled, []);
		assert.deepEqual(unscheduled, [
			"schedule-maintenance",
			"selena-answer-retention",
			"sync-auth0-memberships",
			"selena-weekly-digest",
		]);
	}
});

test("an exact recurring opt-in reconciles schedules before starting Timekeeper", async () => {
	const events: string[] = [];
	const { scheduler, scheduled, unscheduled } = fakeScheduler(events);

	const started = await reconcileAndStartRecurringSchedules(scheduler, allEnabled, async () => {
		events.push("start-timekeeper");
		return "started";
	});

	assert.equal(started, "started");
	assert.deepEqual(unscheduled, []);
	assert.deepEqual(
		scheduled.map(({ name }) => name),
		["schedule-maintenance", "selena-answer-retention", "sync-auth0-memberships", "selena-weekly-digest"],
	);
	assert.equal(events.at(-1), "start-timekeeper");
});

test("the master opt-in does not bypass individual recurring gates", async () => {
	const events: string[] = [];
	const { scheduler, scheduled, unscheduled } = fakeScheduler(events);

	await reconcileAndStartRecurringSchedules(
		scheduler,
		{
			...allEnabled,
			legacyProviderExecutionEnabled: false,
			maintenanceEnabled: false,
			answerRetentionEnabled: "false",
			weeklyDigestEnabled: undefined,
			deploymentMode: "cloud",
		},
		async () => "started",
	);

	assert.deepEqual(scheduled, []);
	assert.deepEqual(unscheduled, [
		"schedule-maintenance",
		"selena-answer-retention",
		"sync-auth0-memberships",
		"selena-weekly-digest",
	]);
});

test("owner-managed Timekeeper stays fail-closed until a scheduler role is approved", async () => {
	const events: string[] = [];
	const { scheduler, scheduled, unscheduled } = fakeScheduler(events);
	let schedulerStarts = 0;

	await assert.rejects(
		reconcileAndStartRecurringSchedules(scheduler, { ...allEnabled, ownerManaged: true }, async () => {
			schedulerStarts += 1;
			return "started";
		}),
		/PGBOSS_RECURRING_OWNER_PRIVILEGE_GATE_UNAVAILABLE/,
	);

	assert.equal(schedulerStarts, 0);
	assert.deepEqual(scheduled, []);
	assert.deepEqual(unscheduled, [
		"schedule-maintenance",
		"selena-answer-retention",
		"sync-auth0-memberships",
		"selena-weekly-digest",
	]);
});

test("unknown schedule rows deny Timekeeper startup", async () => {
	const events: string[] = [];
	const { scheduler, scheduled } = fakeScheduler(events, [{ name: "unexpected-recurring-work" }]);
	let schedulerStarts = 0;

	await assert.rejects(
		reconcileAndStartRecurringSchedules(scheduler, allEnabled, async () => {
			schedulerStarts += 1;
			return "started";
		}),
		/PGBOSS_UNKNOWN_RECURRING_SCHEDULES:unexpected-recurring-work/,
	);

	assert.equal(schedulerStarts, 0);
	assert.deepEqual(scheduled, []);
});

test("a managed queue name with an unexpected key is not allowlisted", async () => {
	const events: string[] = [];
	const { scheduler } = fakeScheduler(events, [{ name: "schedule-maintenance", key: "tenant-specific" }]);

	await assert.rejects(
		reconcileAndStartRecurringSchedules(scheduler, allEnabled, async () => "started"),
		/PGBOSS_UNKNOWN_RECURRING_SCHEDULES:schedule-maintenance:NON_DEFAULT_KEY/,
	);
});

test("the weekly digest is scheduled only on its own exact opt-in", async () => {
	for (const weeklyDigestEnabled of [undefined, "", "false", "TRUE", "1"]) {
		const { scheduler, scheduled, unscheduled } = fakeScheduler([]);
		await reconcileAndStartRecurringSchedules(scheduler, { ...allEnabled, weeklyDigestEnabled }, async () => "started");
		assert.equal(
			scheduled.some(({ name }) => name === "selena-weekly-digest"),
			false,
		);
		assert.ok(unscheduled.includes("selena-weekly-digest"));
	}

	const { scheduler, scheduled } = fakeScheduler([]);
	await reconcileAndStartRecurringSchedules(scheduler, allEnabled, async () => "started");
	assert.deepEqual(
		scheduled.find(({ name }) => name === "selena-weekly-digest"),
		{
			name: "selena-weekly-digest",
			cron: "0 6 * * 1",
			data: { kind: "sweep", source: "scheduled" },
			options: { tz: "UTC" },
		},
	);
});
