import assert from "node:assert/strict";
import { test } from "node:test";
import { reconcileAnswerRetentionSchedule } from "./selena-answer-retention";

test("retention scheduling fails closed and removes a stale trigger unless explicitly enabled", async () => {
	for (const enabledValue of [undefined, "", "false", "TRUE", "1"]) {
		const scheduled: unknown[][] = [];
		const unscheduled: string[] = [];
		const scheduler = {
			schedule: async (...args: unknown[]) => {
				scheduled.push(args);
			},
			unschedule: async (name: string) => {
				unscheduled.push(name);
			},
		};

		await reconcileAnswerRetentionSchedule(scheduler, enabledValue);

		assert.deepEqual(scheduled, []);
		assert.deepEqual(unscheduled, ["selena-answer-retention"]);
	}
});

test("retention scheduling preserves the daily trigger when explicitly enabled", async () => {
	const scheduled: unknown[][] = [];
	const unscheduled: string[] = [];
	const scheduler = {
		schedule: async (...args: unknown[]) => {
			scheduled.push(args);
		},
		unschedule: async (name: string) => {
			unscheduled.push(name);
		},
	};

	await reconcileAnswerRetentionSchedule(scheduler, "true");

	assert.deepEqual(scheduled, [["selena-answer-retention", "30 3 * * *", { source: "scheduled" }, { tz: "UTC" }]]);
	assert.deepEqual(unscheduled, []);
});
