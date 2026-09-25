import { r as getRunsPerPrompt } from "./constants-BDRQAb6s.mjs";
import { s as isGroundedApiTarget } from "./providers-kvP4SquB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/run-policy-DWPSozxj.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "b90cebe1-0e93-4a94-8a1c-2f1a4bc7a899", e._sentryDebugIdIdentifier = "sentry-dbid-b90cebe1-0e93-4a94-8a1c-2f1a4bc7a899");
	} catch (e) {}
})();
/**
* Resolve which SCRAPE_TARGETS configs a brand should run.
*
* `enabledModels` is a brand-level override keyed by model name:
*   - `null` / `undefined`: no override — run every configured target.
*   - `[]`: explicit empty — run nothing (caller skips the prompt).
*   - `[...]`: run exactly these models. Every entry must correspond to a
*     model in `configs`; an unknown model throws so the configuration error
*     surfaces loudly instead of silently dropping runs.
*/
function selectTargetsForBrand(configs, enabledModels) {
	if (enabledModels === null || enabledModels === void 0) return configs;
	if (enabledModels.length === 0) return [];
	const configModels = new Set(configs.map((c) => c.model));
	const unknown = enabledModels.filter((m) => !configModels.has(m));
	if (unknown.length > 0) throw new Error(`brand.enabledModels references models not in SCRAPE_TARGETS: ${unknown.join(", ")}. Configured models: ${[...configModels].join(", ") || "(none)"}.`);
	const allowed = new Set(enabledModels);
	return configs.filter((c) => allowed.has(c.model));
}
/** Hours between runs for a daily rate, guarding the zero a paused plan carries. */
function intervalForRate(runsPerDay) {
	return 24 / Math.max(1, runsPerDay);
}
function resolvePromptRunPlan(input) {
	const { entitlements } = input;
	if (entitlements.unlimited) {
		const interval = input.brand.delayOverrideHours ?? input.defaultDelayHours;
		const targets = selectTargetsForBrand(input.scrapeTargets, input.brand.enabledModels).map((config) => ({
			config,
			intervalHours: interval,
			replication: getRunsPerPrompt()
		}));
		return {
			targets,
			rescheduleHours: targets.length > 0 ? interval : null
		};
	}
	if (!entitlements.trackingActive || input.withinPromptPool === false) return {
		targets: [],
		rescheduleHours: null
	};
	const targets = [];
	const picks = resolveBrandPicks(entitlements, input.brand, input.scrapeTargets);
	const overrideHours = input.brand.delayOverrideHours;
	const slowerOf = (planInterval) => Math.max(overrideHours ?? planInterval, planInterval);
	const standardInterval = slowerOf(intervalForRate(entitlements.standardRunsPerDay ?? 1));
	const premiumInterval = slowerOf(intervalForRate(entitlements.premiumRunsPerDay));
	const replication = entitlements.replication ?? 1;
	for (const model of picks) {
		const config = input.scrapeTargets.find((t) => t.model === model && !isGroundedApiTarget(t));
		if (!config) continue;
		targets.push({
			config,
			intervalHours: standardInterval,
			replication
		});
	}
	if (entitlements.premiumPool > 0) for (const model of input.prompt.premiumModels) {
		const config = input.scrapeTargets.find((t) => t.model === model && isGroundedApiTarget(t));
		if (config) targets.push({
			config,
			intervalHours: premiumInterval,
			replication: 1
		});
	}
	if (targets.length === 0) return {
		targets,
		rescheduleHours: null
	};
	return {
		targets,
		rescheduleHours: Math.min(...targets.map((t) => t.intervalHours))
	};
}
/**
* Which standard platforms a metered brand is tracked on: its own picks,
* clamped to what the plan sells and to how many it may run at once — or the
* plan's defaults when it has never chosen.
*
* The single answer to "what is this brand tracked on", because three surfaces
* asked it independently and a brand with no stored picks got a different
* answer from each: the run policy applied the plan defaults while the LLM
* settings page and the prompts view both read null as "every configured
* target", showing ten platforms to a brand running four.
*/
function resolveBrandPicks(entitlements, brand, scrapeTargets) {
	const menu = new Set(entitlements.platformMenu ?? []);
	const picks = brand.enabledModels !== null ? brand.enabledModels.filter((model) => menu.has(model)) : defaultPlatformPicks(entitlements, scrapeTargets);
	return picks.slice(0, entitlements.platformPicks ?? picks.length);
}
/**
* Default platform picks for a cloud brand that hasn't chosen yet: the first
* available menu platforms up to the plan's pick count. Written explicitly at
* brand creation (and applied implicitly by the run policy when picks are
* null) so a paying org is never silently untracked.
*/
function defaultPlatformPicks(entitlements, scrapeTargets) {
	const available = new Set(scrapeTargets.filter((t) => !isGroundedApiTarget(t)).map((t) => t.model));
	return (entitlements.platformMenu ?? []).filter((model) => available.has(model)).slice(0, entitlements.platformPicks ?? 0);
}
/**
* Key for per-target run history.
*
* The provider is part of the identity, not just the model and its web-search
* flag: a brand can track ChatGPT scraped off the consumer product *and*
* grounded through an API, and both are `chatgpt` with web search on. Keyed on
* model alone the two shared a cadence slot, so the scraped target's four runs
* a day kept the premium one looking fresh and it never came due.
*
* Changing this shape costs no reprocessing, because keys are never stored:
* both sides compute one from (model, provider, web_search_enabled), and
* prompt_runs has recorded all three since the run was written. A deploy
* therefore matches existing history rather than treating every target as
* never-run. The one case that does re-fire once is an operator pointing a
* model at a different provider — which is a different data source, so
* restarting its cadence is the right answer.
*/
function targetKey(config) {
	return `${config.model}::${config.provider}::${config.webSearch ? "web" : "base"}`;
}
/**
* Whether a target has missed its cadence — the single definition of "overdue",
* shared by the maintenance sweep, the Sentry alert, and the admin dashboard.
*
* Distinct from `isTargetDue`, which asks whether to run now (and so leans
* early, with jitter tolerance). This asks whether something is wrong, and so
* leans late: a target is overdue only once it is a whole interval past its last
* run, plus whatever grace the caller wants. A target that has never run is
* overdue once the prompt itself is past the grace window — failed runs record
* no row, so a target broken on one provider shows up even while its siblings
* stay fresh.
*/
function targetOverdueStatus(input) {
	const graceMs = input.graceMs ?? 0;
	if (!input.lastRunAt) return {
		isOverdue: input.now - input.promptCreatedAt.getTime() > graceMs,
		overdueByMs: null
	};
	const intervalMs = input.intervalHours * 3600 * 1e3;
	const sinceRun = input.now - input.lastRunAt.getTime();
	if (sinceRun > intervalMs + graceMs) return {
		isOverdue: true,
		overdueByMs: sinceRun - intervalMs
	};
	return {
		isOverdue: false,
		overdueByMs: null
	};
}
/**
* Pool positions for downgrade handling: which enabled prompts are inside the
* org's tracked-prompt pool, and which of their premium models the premium pool
* still covers. Oldest first (creation order, id tiebreak) so a new prompt can
* never displace an old one's tracking.
*
* The premium pool is spent per prompt/model pair, so a prompt asking for two
* models with one slot left keeps the first — admitting neither would strand a
* slot the org is paying for.
*/
function computePoolPositions(prompts, limits) {
	const ordered = [...prompts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
	const withinPromptPool = /* @__PURE__ */ new Set();
	for (const prompt of limits.maxPrompts === null ? ordered : ordered.slice(0, limits.maxPrompts)) withinPromptPool.add(prompt.id);
	const premiumByPrompt = /* @__PURE__ */ new Map();
	let slotsUsed = 0;
	for (const prompt of ordered) {
		if (!withinPromptPool.has(prompt.id)) continue;
		const admitted = [];
		for (const model of prompt.premiumModels) {
			if (slotsUsed >= limits.premiumPool) break;
			admitted.push(model);
			slotsUsed++;
		}
		if (admitted.length > 0) premiumByPrompt.set(prompt.id, admitted);
	}
	return {
		withinPromptPool,
		premiumByPrompt
	};
}
function resolveBrandPromptRunPlans(input) {
	const pools = input.entitlements.unlimited ? null : computePoolPositions(input.orgPrompts, {
		maxPrompts: input.entitlements.maxPrompts,
		premiumPool: input.entitlements.premiumPool
	});
	const plans = /* @__PURE__ */ new Map();
	for (const prompt of input.prompts) plans.set(prompt.id, resolvePromptRunPlan({
		scrapeTargets: input.scrapeTargets,
		brand: input.brand,
		prompt: { premiumModels: pools ? pools.premiumByPrompt.get(prompt.id) ?? [] : prompt.premiumModels },
		entitlements: input.entitlements,
		defaultDelayHours: input.defaultDelayHours,
		withinPromptPool: pools ? pools.withinPromptPool.has(prompt.id) : true
	}));
	return plans;
}
//#endregion
export { selectTargetsForBrand as a, resolvePromptRunPlan as i, resolveBrandPicks as n, targetKey as o, resolveBrandPromptRunPlans as r, targetOverdueStatus as s, defaultPlatformPicks as t };

//# sourceMappingURL=run-policy-DWPSozxj.mjs.map