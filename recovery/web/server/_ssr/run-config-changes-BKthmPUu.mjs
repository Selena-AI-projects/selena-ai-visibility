import { L as sql } from "../_libs/drizzle-orm.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createMultiplePromptJobSchedulers } from "./job-scheduler-PGB1J6XT.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/run-config-changes-BKthmPUu.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "e0d59477-11ac-4bbe-b8ff-9025918abe30", e._sentryDebugIdIdentifier = "sentry-dbid-e0d59477-11ac-4bbe-b8ff-9025918abe30");
	} catch (e) {}
})();
/**
* Bring prompts' next cycle forward after a configuration change — platforms
* added to a brand, a premium model added to a prompt — so the change takes
* effect now rather than whenever the current cadence happens to come around.
*
* Dragging the queued row forward is the only thing that works here: the
* `prompt-${id}` singleton swallows a fresh send while a future job exists, so
* `boss.send` would silently do nothing. Same UPDATE the worker's
* schedule-maintenance uses to revive stalled chains.
*
* Safe to call on any save, and cheap: the cycle it triggers runs only the
* targets that are actually due, so platforms that ran recently are skipped
* rather than paid for a second time.
*
* Best-effort by design. A prompt whose cycle is mid-flight has no queued row
* to move and holds the singleton against a new one, so its added target waits
* for maintenance to expedite the job that cycle queues on its way out.
*/
async function expeditePromptRuns(promptIds) {
	if (promptIds.length === 0) return;
	try {
		const idList = sql.join(promptIds.map((id) => sql`${id}`), sql`, `);
		const result = await db.execute(sql`
			UPDATE pgboss.job
			SET start_after = now()
			WHERE name = 'process-prompt'
			  AND state = 'created'
			  AND (data->>'promptId') IN (${idList})
			RETURNING (data->>'promptId') AS prompt_id
		`);
		const moved = new Set(result.rows.map((row) => row.prompt_id));
		const unqueued = promptIds.filter((id) => !moved.has(id));
		if (unqueued.length > 0) await createMultiplePromptJobSchedulers(unqueued);
	} catch (error) {
		console.error("Failed to expedite prompt runs:", error);
	}
}
/**
* Which saves have earned an immediate run.
*
* A platform or premium model that was just added has no run history, so its
* target is due the moment it is saved — waiting out the cadence leaves the
* customer looking at a setting that hasn't taken effect. Dropping one, or
* saving with nothing changed, earns nothing: the cycle it would trigger is
* paid provider calls for answers already on file.
*/
/**
* Platforms `next` adds over `previous`. Null on either side means "every
* configured target", which is what a brand with no explicit picks follows.
*/
function addedPlatforms(previous, next, configured) {
	const before = new Set(previous ?? configured);
	return (next ?? configured).filter((model) => !before.has(model));
}
/**
* Prompts that gained a premium model in a save. Prompts created by the same
* save are excluded — their chain starts immediately anyway, and expediting a
* job that doesn't exist yet would race it.
*/
function promptsGainingPremium(before, after) {
	return after.filter((prompt) => {
		const previous = before.get(prompt.id);
		return previous !== void 0 && prompt.premiumModels.some((model) => !previous.premiumModels.includes(model));
	}).map((prompt) => prompt.id);
}
//#endregion
export { expeditePromptRuns as n, promptsGainingPremium as r, addedPlatforms as t };

//# sourceMappingURL=run-config-changes-BKthmPUu.mjs.map