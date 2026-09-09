import assert from "node:assert/strict";
import test from "node:test";
import { ownerTaskUsage, resolveOwnerTask } from "./owner-task.js";

const csv = "# two seats\nSELENA-ONE,full-ai-landscape,doki.help\nSELENA-TWO,full-ai-landscape,petid.care\n";

test("refuses to run without a named task, and names the tasks it knows", () => {
	assert.deepEqual(resolveOwnerTask({}), { kind: "refused", reason: "OWNER_TASK_REQUIRED" });
	assert.deepEqual(resolveOwnerTask({ SELENA_OWNER_TASK: "drop-everything" }), {
		kind: "refused",
		reason: "OWNER_TASK_UNKNOWN",
	});
	assert.match(ownerTaskUsage().join("\n"), /issue-pilot-invites, read-spend-budget, set-spend-budget/);
});

test("issues seats from the variable's contents with a default validity", () => {
	assert.deepEqual(resolveOwnerTask({ SELENA_OWNER_TASK: "issue-pilot-invites", SELENA_PILOT_SEATS_CSV: csv }), {
		kind: "issue-pilot-invites",
		csv,
		validDays: 30,
	});
	assert.deepEqual(
		resolveOwnerTask({
			SELENA_OWNER_TASK: " issue-pilot-invites ",
			SELENA_PILOT_SEATS_CSV: csv,
			SELENA_PILOT_SEAT_DAYS: "14",
		}),
		{ kind: "issue-pilot-invites", csv, validDays: 14 },
	);
	assert.deepEqual(resolveOwnerTask({ SELENA_OWNER_TASK: "issue-pilot-invites" }), {
		kind: "refused",
		reason: "PILOT_SEATS_CSV_REQUIRED",
	});
	for (const days of ["0", "-3", "2.5", "soon"]) {
		assert.deepEqual(
			resolveOwnerTask({
				SELENA_OWNER_TASK: "issue-pilot-invites",
				SELENA_PILOT_SEATS_CSV: csv,
				SELENA_PILOT_SEAT_DAYS: days,
			}),
			{ kind: "refused", reason: "PILOT_SEAT_DAYS_INVALID" },
		);
	}
});

test("reads a scope's ceiling, defaulting to the measurement scope", () => {
	assert.deepEqual(resolveOwnerTask({ SELENA_OWNER_TASK: "read-spend-budget" }), {
		kind: "read-spend-budget",
		scope: "measure",
	});
	assert.deepEqual(resolveOwnerTask({ SELENA_OWNER_TASK: "read-spend-budget", SELENA_SPEND_SCOPE: "suggest" }), {
		kind: "read-spend-budget",
		scope: "suggest",
	});
});

test("sets a ceiling only from a non-negative dollar amount", () => {
	assert.deepEqual(resolveOwnerTask({ SELENA_OWNER_TASK: "set-spend-budget", SELENA_SPEND_CAP_USD: "20" }), {
		kind: "set-spend-budget",
		scope: "measure",
		capUsd: 20,
	});
	assert.deepEqual(resolveOwnerTask({ SELENA_OWNER_TASK: "set-spend-budget" }), {
		kind: "refused",
		reason: "SPEND_CAP_USD_REQUIRED",
	});
	for (const cap of ["-1", "lots", "NaN"]) {
		assert.deepEqual(resolveOwnerTask({ SELENA_OWNER_TASK: "set-spend-budget", SELENA_SPEND_CAP_USD: cap }), {
			kind: "refused",
			reason: "SPEND_CAP_USD_INVALID",
		});
	}
});
