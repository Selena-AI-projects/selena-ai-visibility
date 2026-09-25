import { n as getDefaultDelayHours } from "./constants-BDRQAb6s.mjs";
import { f as eq } from "../_libs/drizzle-orm.mjs";
import { d as prompts, r as brands } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { r as getBoss } from "./boss-client-DOgR2WZg.mjs";
import { c as isLegacyProviderExecutionEnabled, i as enqueueLegacyProviderWork } from "./providers-kvP4SquB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/job-scheduler-PGB1J6XT.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "55c12635-9bb9-41c9-9205-7697a23138ab", e._sentryDebugIdIdentifier = "sentry-dbid-55c12635-9bb9-41c9-9205-7697a23138ab");
	} catch (e) {}
})();
function isLegacySchedulingDisabled() {
	if (isLegacyProviderExecutionEnabled()) return false;
	console.warn("Legacy provider execution is disabled; no provider job was queued");
	return true;
}
/**
* Gets the cadence (delay between runs) for a prompt based on its brand's delay override or the default
*/
async function getPromptCadenceHours(promptId) {
	const defaultDelayHours = getDefaultDelayHours();
	try {
		const prompt = await db.query.prompts.findFirst({ where: eq(prompts.id, promptId) });
		if (!prompt) {
			console.warn(`Prompt ${promptId} not found, using default cadence`);
			return defaultDelayHours;
		}
		const brand = await db.query.brands.findFirst({ where: eq(brands.id, prompt.brandId) });
		if (!brand) {
			console.warn(`Brand ${prompt.brandId} not found, using default cadence`);
			return defaultDelayHours;
		}
		if (brand.delayOverrideHours !== null) {
			console.log(`Using custom cadence for brand ${brand.name}: ${brand.delayOverrideHours}h`);
			return brand.delayOverrideHours;
		}
		return defaultDelayHours;
	} catch (error) {
		console.error(`Error fetching cadence for prompt ${promptId}:`, error);
		return defaultDelayHours;
	}
}
async function createPromptJobScheduler(promptId, options = {}) {
	if (isLegacySchedulingDisabled()) return false;
	try {
		const boss = await getBoss();
		const cadenceHours = await getPromptCadenceHours(promptId);
		const sendImmediate = options.sendImmediate ?? true;
		try {
			await boss.unschedule("process-prompt", promptId);
		} catch {}
		if (sendImmediate) {
			if (await enqueueLegacyProviderWork(() => boss.send("process-prompt", {
				promptId,
				cadenceHours
			}, {
				singletonKey: `prompt-${promptId}`,
				singletonSeconds: 3600,
				retryLimit: 3,
				retryDelay: 60,
				retryBackoff: true,
				expireInSeconds: 900
			})) === void 0) return false;
		} else {
			const startAfterSeconds = cadenceHours * 60 * 60;
			if (await enqueueLegacyProviderWork(() => boss.send("process-prompt", {
				promptId,
				cadenceHours
			}, {
				singletonKey: `prompt-${promptId}`,
				singletonSeconds: startAfterSeconds,
				startAfter: startAfterSeconds,
				retryLimit: 3,
				retryDelay: 60,
				retryBackoff: true,
				expireInSeconds: 900
			})) === void 0) return false;
		}
		console.log(`Created job for prompt ${promptId} with ${cadenceHours}h cadence`);
		return true;
	} catch (error) {
		console.error(`Failed to create job for prompt ${promptId}:`, error);
		return false;
	}
}
/**
* Removes any scheduled jobs for a prompt.
*/
async function removePromptJobScheduler(promptId) {
	try {
		const boss = await getBoss();
		try {
			await boss.unschedule("process-prompt", promptId);
		} catch {}
		console.log(`Removed schedule for prompt ${promptId}`);
		return true;
	} catch (error) {
		console.error(`Failed to remove job scheduler for prompt ${promptId}:`, error);
		return false;
	}
}
/**
* Creates schedules for multiple prompts.
* Returns an array of results indicating success/failure for each prompt.
*/
async function createMultiplePromptJobSchedulers(promptIds, options = {}) {
	return (await Promise.allSettled(promptIds.map((promptId) => createPromptJobScheduler(promptId, options)))).map((result) => result.status === "fulfilled" ? result.value : false);
}
/**
* Sends an immediate job to process a prompt (outside of the schedule).
* Useful for manual retries from the admin UI.
*/
async function sendImmediatePromptJob(promptId) {
	if (isLegacySchedulingDisabled()) return false;
	try {
		const boss = await getBoss();
		const cadenceHours = await getPromptCadenceHours(promptId);
		if (await enqueueLegacyProviderWork(() => boss.send("process-prompt", {
			promptId,
			cadenceHours
		}, {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true,
			expireInSeconds: 900
		})) === void 0) return false;
		console.log(`Sent immediate job for prompt ${promptId}`);
		return true;
	} catch (error) {
		console.error(`Failed to send immediate job for prompt ${promptId}:`, error);
		return false;
	}
}
/**
* Sends a report generation job.
*/
async function sendReportJob(reportId, brandName, brandWebsite, manualPrompts) {
	if (isLegacySchedulingDisabled()) return false;
	try {
		const boss = await getBoss();
		if (await enqueueLegacyProviderWork(() => boss.send("generate-report", {
			reportId,
			brandName,
			brandWebsite,
			manualPrompts
		}, {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true,
			expireInSeconds: 3600
		})) === void 0) return false;
		console.log(`Sent report job for report ${reportId}`);
		return true;
	} catch (error) {
		console.error(`Failed to send report job for report ${reportId}:`, error);
		return false;
	}
}
//#endregion
export { sendReportJob as a, sendImmediatePromptJob as i, createPromptJobScheduler as n, removePromptJobScheduler as r, createMultiplePromptJobSchedulers as t };

//# sourceMappingURL=job-scheduler-PGB1J6XT.mjs.map