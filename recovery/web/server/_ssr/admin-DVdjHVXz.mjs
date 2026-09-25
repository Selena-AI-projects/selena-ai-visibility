import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { D as number, M as string, O as object } from "../_libs/zod.mjs";
import { n as getDefaultDelayHours } from "./constants-BDRQAb6s.mjs";
import { n as getModelMeta } from "./models-DjvggVKS.mjs";
import { L as sql, f as eq, u as desc } from "../_libs/drizzle-orm.mjs";
import { d as prompts, r as brands, u as promptRuns } from "./schema-ejW7s7Gs.mjs";
import { t as runtimeDatabaseConnection } from "./postgres-config-IAJOu_38.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { s as parseScrapeTargets } from "./env-D9tfoX6E.mjs";
import { g as getOrgEntitlementsMap, p as getBrandOrganizationId, r as assertCadenceAllowed } from "./entitlements-BlArge5u.mjs";
import { t as analyzeBrand } from "./onboarding-D7p0ZNRK.mjs";
import { o as targetKey, r as resolveBrandPromptRunPlans, s as targetOverdueStatus } from "./run-policy-DWPSozxj.mjs";
import { i as sendImmediatePromptJob } from "./job-scheduler-PGB1J6XT.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { s as requireAdmin } from "./helpers-phr0Aqka.mjs";
import { n as getAdminBrandRunStats, r as getAdminRunsOverTime, t as getAdminActiveBrandsOverTime } from "./postgres-read-BdoLn4e5.mjs";
import { Client } from "pg";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-DVdjHVXz.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0c1bbdcf-6c91-4361-86b8-a6d7d305bdfe", e._sentryDebugIdIdentifier = "sentry-dbid-0c1bbdcf-6c91-4361-86b8-a6d7d305bdfe");
	} catch (e) {}
})();
/**
* Server functions for admin operations.
* Replaces apps/web/src/app/api/admin/* API routes.
*/
async function withPgClient(fn) {
	const client = new Client(runtimeDatabaseConnection());
	await client.connect();
	try {
		return await fn(client);
	} finally {
		await client.end();
	}
}
/**
* Get admin dashboard statistics (all brands, run counts, time series charts).
*/
var getAdminStatsFn_createServerFn_handler = createServerRpc({
	id: "4bab7bbbbf7131ce6f78773267513422f555b080a628c87eafb31c5810cb45a3",
	name: "getAdminStatsFn",
	filename: "src/server/admin.ts"
}, (opts) => getAdminStatsFn.__executeServer(opts));
var getAdminStatsFn = createServerFn({ method: "GET" }).handler(getAdminStatsFn_createServerFn_handler, async () => {
	await requireAdmin();
	const sevenDaysAgo = /* @__PURE__ */ new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	const thirtyDaysAgo = /* @__PURE__ */ new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const [allBrands, brandsOverTime, promptsOverTime, runsOverTimeData, brandRunStats, activeBrandsData] = await Promise.all([
		db.query.brands.findMany({ orderBy: desc(brands.createdAt) }),
		db.select({
			date: sql`date_series::date`,
			count: sql`COUNT(${brands.id})::int`
		}).from(sql`generate_series(
					NOW()::date - INTERVAL '30 days',
					NOW()::date,
					INTERVAL '1 day'
				) AS date_series`).leftJoin(brands, sql`${brands.createdAt}::date <= date_series::date`).groupBy(sql`date_series`).orderBy(sql`date_series`),
		db.select({
			date: sql`date_series::date`,
			enabled: sql`COUNT(*) FILTER (WHERE ${prompts.enabled} = true)::int`,
			disabled: sql`COUNT(*) FILTER (WHERE ${prompts.enabled} = false)::int`
		}).from(sql`generate_series(
					NOW()::date - INTERVAL '30 days',
					NOW()::date,
					INTERVAL '1 day'
				) AS date_series`).leftJoin(prompts, sql`${prompts.createdAt}::date <= date_series::date`).groupBy(sql`date_series`).orderBy(sql`date_series`),
		getAdminRunsOverTime(),
		getAdminBrandRunStats(),
		getAdminActiveBrandsOverTime()
	]);
	const brandRunStatsMap = new Map(brandRunStats.map((stat) => [stat.brand_id, stat]));
	return {
		brands: await Promise.all(allBrands.map(async (brand) => {
			const promptCounts = await db.select({
				total: sql`count(*)::int`,
				active: sql`count(*) filter (where enabled = true)::int`
			}).from(prompts).where(eq(prompts.brandId, brand.id));
			const recentPromptCounts = await db.select({
				added7Days: sql`count(*) filter (where ${prompts.createdAt} >= ${sevenDaysAgo})::int`,
				removed7Days: sql`count(*) filter (where ${prompts.updatedAt} >= ${sevenDaysAgo} and ${prompts.enabled} = false)::int`,
				added30Days: sql`count(*) filter (where ${prompts.createdAt} >= ${thirtyDaysAgo})::int`,
				removed30Days: sql`count(*) filter (where ${prompts.updatedAt} >= ${thirtyDaysAgo} and ${prompts.enabled} = false)::int`
			}).from(prompts).where(eq(prompts.brandId, brand.id));
			const runStats = brandRunStatsMap.get(brand.id);
			return {
				...brand,
				totalPrompts: promptCounts[0]?.total || 0,
				activePrompts: promptCounts[0]?.active || 0,
				promptRuns7Days: runStats?.runs_7d || 0,
				promptRuns30Days: runStats?.runs_30d || 0,
				lastPromptRunAt: runStats?.last_run_at ? new Date(runStats.last_run_at) : null,
				promptsAddedLast7Days: recentPromptCounts[0]?.added7Days || 0,
				promptsRemovedLast7Days: recentPromptCounts[0]?.removed7Days || 0,
				promptsAddedLast30Days: recentPromptCounts[0]?.added30Days || 0,
				promptsRemovedLast30Days: recentPromptCounts[0]?.removed30Days || 0
			};
		})),
		brandsOverTime,
		activeBrandsOverTime: activeBrandsData.map((row) => ({
			date: row.date,
			count: row.count
		})),
		promptsOverTime,
		runsOverTime: runsOverTimeData.map((row) => ({
			date: row.date,
			count: row.count
		}))
	};
});
var updateDelayOverrideFn_createServerFn_handler = createServerRpc({
	id: "25efd150d1d206063f2d1c1e8fdfb4d258a3c09acfef2fe34766a238422b6f75",
	name: "updateDelayOverrideFn",
	filename: "src/server/admin.ts"
}, (opts) => updateDelayOverrideFn.__executeServer(opts));
var updateDelayOverrideFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	delayOverrideHours: number().nullable()
})).handler(updateDelayOverrideFn_createServerFn_handler, async ({ data }) => {
	await requireAdmin();
	await assertCadenceAllowed(await getBrandOrganizationId(data.brandId), data.delayOverrideHours);
	const result = await db.update(brands).set({
		delayOverrideHours: data.delayOverrideHours,
		updatedAt: /* @__PURE__ */ new Date()
	}).where(eq(brands.id, data.brandId)).returning();
	if (!result[0]) throw new Error("Brand not found");
	return result[0];
});
var adminAnalyzeBrandFn_createServerFn_handler = createServerRpc({
	id: "c38cb334c7d5256406f0bd2f362a7ca8a891a7a03ff7e6c8b66b85b8a790cb8c",
	name: "adminAnalyzeBrandFn",
	filename: "src/server/admin.ts"
}, (opts) => adminAnalyzeBrandFn.__executeServer(opts));
var adminAnalyzeBrandFn = createServerFn({ method: "POST" }).validator(object({
	website: string().min(1),
	brandName: string().optional(),
	maxCompetitors: number().int().min(0).optional(),
	maxPrompts: number().int().min(0).optional()
})).handler(adminAnalyzeBrandFn_createServerFn_handler, async ({ data }) => {
	await requireAdmin();
	return analyzeBrand({
		website: data.website,
		brandName: data.brandName,
		maxCompetitors: data.maxCompetitors,
		maxPrompts: data.maxPrompts
	});
});
function parseJobData(data) {
	if (!data) return {};
	try {
		const parsed = typeof data === "string" ? JSON.parse(data) : data;
		if (typeof parsed === "object" && parsed !== null) return { promptId: typeof parsed.promptId === "string" ? parsed.promptId : void 0 };
	} catch {}
	return {};
}
async function getQueueStats() {
	return withPgClient(async (client) => {
		if (!(await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'pgboss' AND table_name = 'job')`)).rows[0]?.exists) return {
			name: "process-prompt",
			created: 0,
			active: 0,
			retry: 0,
			completed: 0,
			failed: 0,
			totalPending: 0
		};
		const result = await client.query(`
			SELECT
				COUNT(*) FILTER (WHERE state = 'created') AS created,
				COUNT(*) FILTER (WHERE state = 'active') AS active,
				COUNT(*) FILTER (WHERE state = 'retry') AS retry
			FROM pgboss.job
			WHERE name = 'process-prompt'
		`);
		const archiveCheck = await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'pgboss' AND table_name = 'archive')`);
		let completed = 0;
		let failed = 0;
		if (archiveCheck.rows[0]?.exists) {
			const archiveResult = await client.query(`
				SELECT
					COUNT(*) FILTER (WHERE state = 'completed') AS completed,
					COUNT(*) FILTER (WHERE state = 'failed') AS failed
				FROM pgboss.archive
				WHERE name = 'process-prompt'
			`);
			completed = Number(archiveResult.rows[0]?.completed || 0);
			failed = Number(archiveResult.rows[0]?.failed || 0);
		}
		const stats = {
			created: Number(result.rows[0]?.created || 0),
			active: Number(result.rows[0]?.active || 0),
			retry: Number(result.rows[0]?.retry || 0),
			completed,
			failed
		};
		return {
			name: "process-prompt",
			...stats,
			totalPending: stats.created + stats.active + stats.retry
		};
	});
}
async function getRecentJobs(limit = 50) {
	const jobs = await withPgClient(async (client) => {
		const [jobCheck, archiveCheck] = await Promise.all([client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'pgboss' AND table_name = 'job')`), client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'pgboss' AND table_name = 'archive')`)]);
		const rows = [];
		if (jobCheck.rows[0]?.exists) {
			const result = await client.query(`SELECT id, name, data, state, output, retry_count, created_on, started_on, completed_on
				 FROM pgboss.job
				 WHERE name = 'process-prompt'
				   AND state IN ('completed', 'failed')
				 ORDER BY completed_on DESC NULLS LAST
				 LIMIT $1`, [limit]);
			rows.push(...result.rows);
		}
		if (archiveCheck.rows[0]?.exists) {
			const result = await client.query(`SELECT id, name, data, state, output, retry_count, created_on, started_on, completed_on
				 FROM pgboss.archive
				 WHERE name = 'process-prompt'
				 ORDER BY completed_on DESC NULLS LAST
				 LIMIT $1`, [limit]);
			rows.push(...result.rows);
		}
		return rows;
	});
	const deduped = /* @__PURE__ */ new Map();
	for (const row of jobs) if (!deduped.has(row.id)) deduped.set(row.id, row);
	return Array.from(deduped.values()).sort((a, b) => {
		const aTime = a.completed_on ? new Date(a.completed_on).getTime() : 0;
		return (b.completed_on ? new Date(b.completed_on).getTime() : 0) - aTime;
	}).slice(0, limit).map((row) => {
		const data = parseJobData(row.data);
		let failedReason = null;
		if (row.state === "failed" && row.output) try {
			const output = typeof row.output === "string" ? JSON.parse(row.output) : row.output;
			failedReason = output?.message || output?.error || "Unknown error";
		} catch {
			failedReason = "Unknown error";
		}
		return {
			id: row.id,
			name: row.name,
			data,
			status: row.state === "completed" ? "completed" : "failed",
			failedReason,
			attemptsMade: row.retry_count || 0,
			timestamp: row.created_on ? new Date(row.created_on).getTime() : 0,
			processedOn: row.started_on ? new Date(row.started_on).getTime() : null,
			finishedOn: row.completed_on ? new Date(row.completed_on).getTime() : null
		};
	});
}
function getNextRunFromCron(cron, now) {
	const hourlyMatch = cron.match(/^0 \*\/(\d+) \* \* \*$/);
	if (hourlyMatch) {
		const interval = Number(hourlyMatch[1]);
		if (!Number.isFinite(interval) || interval <= 0) return null;
		const nowMs = now.getTime();
		const nowUtc = new Date(nowMs);
		const year = nowUtc.getUTCFullYear();
		const month = nowUtc.getUTCMonth();
		const day = nowUtc.getUTCDate();
		const hour = nowUtc.getUTCHours();
		const minute = nowUtc.getUTCMinutes();
		const second = nowUtc.getUTCSeconds();
		const ms = nowUtc.getUTCMilliseconds();
		let nextHour = hour;
		if (minute > 0 || second > 0 || ms > 0) nextHour += 1;
		for (let i = 0; i <= 48; i += 1) {
			const h = nextHour + i;
			if (h % interval === 0) {
				const dayOffset = Math.floor(h / 24);
				const hourOfDay = h % 24;
				const candidateMs = Date.UTC(year, month, day, 0, 0, 0, 0) + dayOffset * 24 * 60 * 60 * 1e3 + hourOfDay * 60 * 60 * 1e3;
				if (candidateMs > nowMs) return candidateMs;
			}
		}
		return null;
	}
	const dailyMatch = cron.match(/^0 0 (?:\*\/(\d+)|\*) \* \*$/);
	if (dailyMatch) {
		const dayInterval = dailyMatch[1] ? Number(dailyMatch[1]) : 1;
		if (!Number.isFinite(dayInterval) || dayInterval <= 0) return null;
		const nowMs = now.getTime();
		const nowUtc = new Date(nowMs);
		for (let i = 0; i <= 31; i += 1) {
			const candidate = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate() + i, 0, 0, 0, 0));
			const dayOfMonth = candidate.getUTCDate();
			if ((dayInterval === 1 || (dayOfMonth - 1) % dayInterval === 0) && candidate.getTime() > nowMs) return candidate.getTime();
		}
		return null;
	}
	return null;
}
async function getScheduleMap() {
	const schedules = await withPgClient(async (client) => {
		if (!(await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'pgboss' AND table_name = 'schedule')`)).rows[0]?.exists) return [];
		return (await client.query(`
			SELECT name, key, data, cron
			FROM pgboss.schedule
			WHERE name = 'process-prompt'
		`)).rows;
	});
	const map = /* @__PURE__ */ new Map();
	const now = /* @__PURE__ */ new Date();
	for (const row of schedules) {
		const promptId = row.key;
		if (promptId) {
			let cadenceHours = null;
			let nextRunAt = null;
			if (row.cron) {
				const hourlyMatch = row.cron.match(/^0 \*\/(\d+) \* \* \*$/);
				if (hourlyMatch) cadenceHours = Number(hourlyMatch[1]);
				else {
					const dailyMatch = row.cron.match(/^0 0 (?:\*\/(\d+)|\*) \* \*$/);
					if (dailyMatch) cadenceHours = dailyMatch[1] ? Number(dailyMatch[1]) * 24 : 24;
				}
				nextRunAt = getNextRunFromCron(row.cron, now);
			}
			map.set(promptId, {
				promptId,
				cadenceHours,
				nextRunAt
			});
		}
	}
	return map;
}
async function getActiveJobMap() {
	const jobs = await withPgClient(async (client) => {
		if (!(await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'pgboss' AND table_name = 'job')`)).rows[0]?.exists) return [];
		return (await client.query(`
			SELECT id, data, state, created_on, started_on
			FROM pgboss.job
			WHERE name = 'process-prompt'
			  AND state IN ('created', 'active', 'retry')
			ORDER BY
				CASE state
					WHEN 'active' THEN 1
					WHEN 'retry' THEN 2
					WHEN 'created' THEN 3
					ELSE 4
				END,
				started_on DESC NULLS LAST,
				created_on DESC NULLS LAST
		`)).rows;
	});
	const map = /* @__PURE__ */ new Map();
	for (const row of jobs) {
		const data = parseJobData(row.data);
		if (data.promptId) {
			if (!map.has(data.promptId)) map.set(data.promptId, {
				promptId: data.promptId,
				state: row.state
			});
		}
	}
	return map;
}
/**
* Every prompt's run plan, resolved the way the worker resolves it: pool
* positions across the whole org, run plans per brand. A brand whose
* configuration no longer resolves (a pick whose target left SCRAPE_TARGETS)
* is skipped rather than taking the whole dashboard down.
*/
function resolveRunPlansForBrands(input) {
	const enabledByOrg = /* @__PURE__ */ new Map();
	for (const brand of input.brands) {
		const enabled = (input.promptsByBrand[brand.id] ?? []).filter((p) => p.enabled);
		if (enabled.length === 0) continue;
		enabledByOrg.set(brand.organizationId, [...enabledByOrg.get(brand.organizationId) ?? [], ...enabled]);
	}
	const plans = /* @__PURE__ */ new Map();
	for (const brand of input.brands) {
		const brandPrompts = input.promptsByBrand[brand.id] ?? [];
		const entitlements = input.entitlementsByOrg.get(brand.organizationId);
		if (brandPrompts.length === 0 || !entitlements) continue;
		try {
			for (const [promptId, plan] of resolveBrandPromptRunPlans({
				scrapeTargets: input.scrapeTargets,
				defaultDelayHours: input.defaultDelayHours,
				entitlements,
				orgPrompts: enabledByOrg.get(brand.organizationId) ?? [],
				brand: {
					enabledModels: brand.enabledModels,
					delayOverrideHours: brand.delayOverrideHours
				},
				prompts: brandPrompts
			})) plans.set(promptId, plan);
		} catch (error) {
			console.error(`[admin] Skipping brand ${brand.id} run plans (invalid target config):`, error);
		}
	}
	return plans;
}
/** The chain's cadence: its fastest target. Zero when nothing is planned. */
function intervalMsOf(targets) {
	if (targets.length === 0) return 0;
	return Math.min(...targets.map((t) => t.intervalHours)) * 60 * 60 * 1e3;
}
function fastestCadenceMs(cadences) {
	const running = cadences.filter((ms) => ms > 0);
	return running.length > 0 ? Math.min(...running) : 0;
}
/** The union of every target the brand's prompts run, in first-seen order. */
function targetColumnsFor(plans) {
	const columns = /* @__PURE__ */ new Map();
	for (const plan of plans) for (const target of plan?.targets ?? []) {
		const key = targetKey(target.config);
		if (columns.has(key)) continue;
		const label = getModelMeta(target.config.model).label;
		columns.set(key, {
			key,
			label: target.config.webSearch ? `${label} (web)` : label
		});
	}
	return [...columns.values()];
}
/**
* Get full workflow data: queue stats, recent jobs, brand schedule summaries.
*/
var getWorkflowDataFn_createServerFn_handler = createServerRpc({
	id: "7311ffc67b0bc01f0d72e6076ff4a9ca2ecd2f9eeb9e7afe7c138d6c41f38b6b",
	name: "getWorkflowDataFn",
	filename: "src/server/admin.ts"
}, (opts) => getWorkflowDataFn.__executeServer(opts));
var getWorkflowDataFn = createServerFn({ method: "GET" }).handler(getWorkflowDataFn_createServerFn_handler, async () => {
	await requireAdmin();
	const allBrands = await db.query.brands.findMany({ orderBy: desc(brands.createdAt) });
	const allPrompts = await db.query.prompts.findMany();
	const promptsByBrand = {};
	for (const prompt of allPrompts) {
		if (!promptsByBrand[prompt.brandId]) promptsByBrand[prompt.brandId] = [];
		promptsByBrand[prompt.brandId].push(prompt);
	}
	const lastRunsQuery = await db.select({
		promptId: promptRuns.promptId,
		model: promptRuns.model,
		provider: promptRuns.provider,
		webSearchEnabled: promptRuns.webSearchEnabled,
		lastRunAt: sql`MAX(${promptRuns.createdAt})`.as("last_run_at")
	}).from(promptRuns).groupBy(promptRuns.promptId, promptRuns.model, promptRuns.provider, promptRuns.webSearchEnabled);
	const lastRunsByPrompt = /* @__PURE__ */ new Map();
	for (const run of lastRunsQuery) {
		let byKey = lastRunsByPrompt.get(run.promptId);
		if (!byKey) {
			byKey = /* @__PURE__ */ new Map();
			lastRunsByPrompt.set(run.promptId, byKey);
		}
		if (!run.provider) continue;
		byKey.set(targetKey({
			model: run.model,
			provider: run.provider,
			webSearch: run.webSearchEnabled
		}), new Date(run.lastRunAt));
	}
	const [recentJobs, scheduleMap, activeJobMap, queueStats] = await Promise.all([
		getRecentJobs(5e3),
		getScheduleMap(),
		getActiveJobMap(),
		getQueueStats()
	]);
	const runPlans = resolveRunPlansForBrands({
		brands: allBrands,
		promptsByBrand,
		entitlementsByOrg: await getOrgEntitlementsMap([...new Set(allBrands.map((b) => b.organizationId))]),
		scrapeTargets: parseScrapeTargets(process.env.SCRAPE_TARGETS),
		defaultDelayHours: getDefaultDelayHours()
	});
	const failuresByPrompt = /* @__PURE__ */ new Map();
	for (const job of recentJobs) if (job.status === "failed" && job.data?.promptId) failuresByPrompt.set(job.data.promptId, (failuresByPrompt.get(job.data.promptId) || 0) + 1);
	const now = Date.now();
	const defaultSchedulerInfo = {
		exists: false,
		nextRunAt: null,
		cadenceHours: null
	};
	const brandSummaries = allBrands.map((brand) => {
		const brandPrompts = promptsByBrand[brand.id] || [];
		let overduePrompts = 0;
		let onSchedulePrompts = 0;
		let scheduledCount = 0;
		const promptStatuses = brandPrompts.map((prompt) => {
			const lastRuns = lastRunsByPrompt.get(prompt.id) ?? /* @__PURE__ */ new Map();
			const targets = runPlans.get(prompt.id)?.targets ?? [];
			const lastRunsByTarget = {};
			let anyOverdue = false;
			for (const target of targets) {
				const key = targetKey(target.config);
				const lastRunAt = lastRuns.get(key) ?? null;
				const { isOverdue, overdueByMs } = prompt.enabled ? targetOverdueStatus({
					intervalHours: target.intervalHours,
					lastRunAt,
					promptCreatedAt: prompt.createdAt,
					now
				}) : {
					isOverdue: false,
					overdueByMs: null
				};
				if (isOverdue) anyOverdue = true;
				lastRunsByTarget[key] = {
					lastRunAt,
					isOverdue,
					overdueByMs
				};
			}
			const scheduleInfo = scheduleMap.get(prompt.id);
			const schedulerInfo = scheduleInfo ? {
				exists: true,
				nextRunAt: scheduleInfo.nextRunAt,
				cadenceHours: scheduleInfo.cadenceHours
			} : defaultSchedulerInfo;
			const activeJob = activeJobMap.get(prompt.id);
			if (prompt.enabled && activeJob) scheduledCount++;
			if (prompt.enabled) if (anyOverdue) overduePrompts++;
			else onSchedulePrompts++;
			const jobStatus = activeJob?.state ?? "none";
			return {
				promptId: prompt.id,
				promptValue: prompt.value,
				brandId: brand.id,
				brandName: brand.name,
				enabled: prompt.enabled,
				runFrequencyMs: intervalMsOf(targets),
				lastRunsByTarget,
				schedulerInfo,
				recentFailures: failuresByPrompt.get(prompt.id) || 0,
				jobStatus
			};
		});
		const enabledPrompts = brandPrompts.filter((p) => p.enabled).length;
		return {
			brandId: brand.id,
			brandName: brand.name,
			website: brand.website,
			enabled: brand.enabled,
			totalPrompts: brandPrompts.length,
			enabledPrompts,
			targetColumns: targetColumnsFor(brandPrompts.map((p) => runPlans.get(p.id))),
			runFrequencyMs: fastestCadenceMs(promptStatuses.map((p) => p.runFrequencyMs)),
			overduePrompts,
			onSchedulePrompts,
			schedulerCoverage: {
				scheduled: scheduledCount,
				total: enabledPrompts
			},
			prompts: promptStatuses
		};
	});
	const totalOverdue = brandSummaries.reduce((sum, b) => sum + b.overduePrompts, 0);
	const totalOnSchedule = brandSummaries.reduce((sum, b) => sum + b.onSchedulePrompts, 0);
	const totalEnabled = brandSummaries.reduce((sum, b) => sum + b.enabledPrompts, 0);
	const totalPrompts = brandSummaries.reduce((sum, b) => sum + b.totalPrompts, 0);
	return {
		summary: {
			totalBrands: allBrands.length,
			totalPrompts,
			totalEnabled,
			totalOverdue,
			totalOnSchedule,
			percentOnSchedule: totalEnabled > 0 ? Math.round(totalOnSchedule / totalEnabled * 100) : 100
		},
		queue: queueStats,
		recentJobs: recentJobs.sort((a, b) => b.timestamp - a.timestamp),
		brands: brandSummaries
	};
});
var retryJobFn_createServerFn_handler = createServerRpc({
	id: "bef8e253dcb39f0d4981edf7846f94632d7bd0e32e2b63aa64a4d0a775d1a9d2",
	name: "retryJobFn",
	filename: "src/server/admin.ts"
}, (opts) => retryJobFn.__executeServer(opts));
var retryJobFn = createServerFn({ method: "POST" }).validator(object({
	promptId: string().optional(),
	jobId: string().optional()
})).handler(retryJobFn_createServerFn_handler, async ({ data }) => {
	await requireAdmin();
	const targetPromptId = data.promptId;
	if (!targetPromptId) throw new Error("promptId is required");
	const prompt = await db.query.prompts.findFirst({ where: eq(prompts.id, targetPromptId) });
	if (!prompt) throw new Error("Prompt not found");
	if (!prompt.enabled) throw new Error("Prompt is disabled");
	if (!await sendImmediatePromptJob(targetPromptId)) throw new Error("Failed to send job");
	return {
		success: true,
		message: `Triggered immediate job for prompt ${targetPromptId}`
	};
});
var getJobLogsFn_createServerFn_handler = createServerRpc({
	id: "246d3f900412fe1361b59e238c5718cc024716aa20d124b5153b966cdda49bd8",
	name: "getJobLogsFn",
	filename: "src/server/admin.ts"
}, (opts) => getJobLogsFn.__executeServer(opts));
var getJobLogsFn = createServerFn({ method: "GET" }).validator(object({ jobId: string() })).handler(getJobLogsFn_createServerFn_handler, async ({ data }) => {
	await requireAdmin();
	const job = await withPgClient(async (client) => {
		if (!(await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgboss')`)).rows[0]?.exists) return null;
		let result = await client.query(`SELECT id, name, data, state, output, retry_count, created_on, started_on, completed_on
				 FROM pgboss.job
				 WHERE id = $1`, [data.jobId]);
		if (result.rows.length === 0) result = await client.query(`SELECT id, name, data, state, output, retry_count, created_on, started_on, completed_on
					 FROM pgboss.archive
					 WHERE id = $1`, [data.jobId]);
		return result.rows[0] || null;
	});
	if (!job) throw new Error("Job not found");
	const logs = [];
	logs.push(`Job ID: ${job.id}`);
	logs.push(`Name: ${job.name}`);
	logs.push(`State: ${job.state}`);
	logs.push(`Retry count: ${job.retry_count || 0}`);
	if (job.created_on) logs.push(`Created: ${new Date(job.created_on).toISOString()}`);
	if (job.started_on) logs.push(`Started: ${new Date(job.started_on).toISOString()}`);
	if (job.completed_on) logs.push(`Completed: ${new Date(job.completed_on).toISOString()}`);
	if (job.data) try {
		const d = typeof job.data === "string" ? JSON.parse(job.data) : job.data;
		logs.push(`Data: ${JSON.stringify(d, null, 2)}`);
	} catch {
		logs.push(`Data: ${String(job.data)}`);
	}
	if (job.output) try {
		const output = typeof job.output === "string" ? JSON.parse(job.output) : job.output;
		logs.push(job.state === "failed" ? `Error: ${JSON.stringify(output, null, 2)}` : `Output: ${JSON.stringify(output, null, 2)}`);
	} catch {
		logs.push(`Output: ${String(job.output)}`);
	}
	return {
		jobId: data.jobId,
		logs,
		count: logs.length
	};
});
//#endregion
export { adminAnalyzeBrandFn_createServerFn_handler, getAdminStatsFn_createServerFn_handler, getJobLogsFn_createServerFn_handler, getWorkflowDataFn_createServerFn_handler, retryJobFn_createServerFn_handler, updateDelayOverrideFn_createServerFn_handler };

//# sourceMappingURL=admin-DVdjHVXz.mjs.map