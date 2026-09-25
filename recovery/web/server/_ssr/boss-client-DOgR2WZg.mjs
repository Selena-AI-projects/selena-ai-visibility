import { L as sql } from "../_libs/drizzle-orm.mjs";
import { n as runtimePgBossSchemaLifecycle, t as runtimeDatabaseConnection } from "./postgres-config-IAJOu_38.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/boss-client-DOgR2WZg.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "5934c4b1-6cf8-432d-9d17-1d89c3d4b565", e._sentryDebugIdIdentifier = "sentry-dbid-5934c4b1-6cf8-432d-9d17-1d89c3d4b565");
	} catch (e) {}
})();
var SLOW_COLLECTOR_QUEUE_LEASE_SECONDS = 2100;
var FREE_AI_VISIBILITY_QUEUE = "selena-free-ai-visibility";
var freeAiVisibilitySystems = ["chatgpt", "gemini"];
function claimFrom(value) {
	const receipt = value ?? {};
	const decision = receipt.decision;
	if (decision === "CLAIMED" && typeof receipt.checkId === "string" && typeof receipt.domain === "string") return {
		decision,
		checkId: receipt.checkId,
		domain: receipt.domain
	};
	if (decision === "ALREADY_CLAIMED" || decision === "REFUSED_NO_BUDGET" || decision === "REFUSED_OVER_CAP") return { decision };
	throw new Error("FREE_AI_VISIBILITY_CLAIM_UNREADABLE");
}
async function claimFreeAiVisibilityCheck(executor, input) {
	return claimFrom(((await executor.execute(sql`SELECT public.sv_claim_free_ai_visibility(
		${input.userId}::text,
		${input.organizationId}::text,
		${input.domain}::text
	) AS receipt`)).rows?.[0])?.receipt);
}
function parseSafeReport(value) {
	const report = value;
	if (report?.schemaVersion !== 1 || report.promptVersion !== "free-ai-visibility-v1" || report.terminalStatus !== "COMPLETED" || report.costUsd !== .003 || !Array.isArray(report.systems) || report.systems.length !== freeAiVisibilitySystems.length) return null;
	const systems = freeAiVisibilitySystems.map((system) => {
		const row = report.systems?.find((candidate) => candidate?.system === system);
		if (!row || row.terminalStatus !== "SUCCEEDED" && row.terminalStatus !== "FAILED" || typeof row.domainMentioned !== "boolean" || !Number.isSafeInteger(row.citationCount) || row.citationCount < 0) return null;
		return {
			system,
			terminalStatus: row.terminalStatus,
			domainMentioned: row.domainMentioned,
			citationCount: row.citationCount
		};
	});
	if (systems.some((system) => system === null)) return null;
	return {
		...report,
		systems
	};
}
async function readFreeAiVisibilityStatus(executor, input) {
	const row = (await executor.execute(sql`
		SELECT "id", "registrable_domain", "status", "report"
		FROM "sv_free_ai_visibility_checks"
		WHERE "user_id" = ${input.userId} AND "organization_id" = ${input.organizationId}
		LIMIT 1
	`)).rows?.[0];
	if (!row || typeof row.id !== "string" || typeof row.registrable_domain !== "string") return null;
	if (row.status === "QUEUED" || row.status === "UNCONFIRMED") return {
		checkId: row.id,
		domain: row.registrable_domain,
		status: row.status,
		report: null
	};
	if (row.status !== "COMPLETED") return null;
	const report = parseSafeReport(row.report);
	return report === null ? {
		checkId: row.id,
		domain: row.registrable_domain,
		status: "UNCONFIRMED",
		report: null
	} : {
		checkId: row.id,
		domain: row.registrable_domain,
		status: "COMPLETED",
		report
	};
}
var bossInstance = null;
var bossPromise = null;
/**
* Get or create a pg-boss client instance.
* Uses singleton pattern to avoid multiple connections.
*/
async function getBoss() {
	if (bossInstance) return bossInstance;
	if (bossPromise) return bossPromise;
	bossPromise = (async () => {
		const { PgBoss } = await import("../_libs/pg-boss+serialize-error.mjs").then((n) => n.t);
		const boss = new PgBoss({
			...runtimeDatabaseConnection(),
			schema: "pgboss",
			...runtimePgBossSchemaLifecycle(),
			supervise: false,
			schedule: false
		});
		await boss.start();
		await boss.createQueue("process-prompt", {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true,
			expireInSeconds: 900
		});
		await boss.createQueue("generate-report", {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true,
			expireInSeconds: 3600
		});
		await boss.createQueue("analyze-brand", {
			retryLimit: 1,
			retryDelay: 10,
			retryBackoff: false,
			expireInSeconds: 900
		});
		await boss.createQueue("selena-measure", {
			retryLimit: 0,
			expireInSeconds: SLOW_COLLECTOR_QUEUE_LEASE_SECONDS
		});
		await boss.updateQueue("selena-measure", {
			retryLimit: 0,
			expireInSeconds: SLOW_COLLECTOR_QUEUE_LEASE_SECONDS
		});
		await boss.createQueue(FREE_AI_VISIBILITY_QUEUE, {
			retryLimit: 0,
			expireInSeconds: SLOW_COLLECTOR_QUEUE_LEASE_SECONDS
		});
		await boss.updateQueue(FREE_AI_VISIBILITY_QUEUE, {
			retryLimit: 0,
			expireInSeconds: SLOW_COLLECTOR_QUEUE_LEASE_SECONDS
		});
		bossInstance = boss;
		return boss;
	})();
	return bossPromise;
}
//#endregion
export { readFreeAiVisibilityStatus as i, claimFreeAiVisibilityCheck as n, getBoss as r, FREE_AI_VISIBILITY_QUEUE as t };

//# sourceMappingURL=boss-client-DOgR2WZg.mjs.map