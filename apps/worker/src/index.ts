import * as Sentry from "@sentry/node";
import { getDeployment } from "@workspace/deployment";
import { PERPLEXITY_QUEUE_LEASE_SECONDS } from "@workspace/lib/adapters/brightdata";
import { runtimePgBossSchemaLifecycle } from "@workspace/lib/db/postgres-config";
import { getProvider, parseScrapeTargets, validateScrapeTargets } from "@workspace/lib/providers";
import { isLegacyProviderExecutionEnabled, isMaintenanceEnabled } from "@workspace/lib/run-policy";
import { startCredentialRefresh } from "@workspace/lib/secrets";
import type { PgBoss } from "pg-boss";
import boss, { createRecurringSchedulerBoss } from "./boss";
import { registerHandlers } from "./handlers";
import { reconcileAndStartRecurringSchedules } from "./recurring-schedules";
import { isOwnerManagedPgBossRuntime } from "./runtime-boss-options";
import { shutdownTelemetry } from "./telemetry";

if (process.env.SENTRY_DSN) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		environment: process.env.ENVIRONMENT || "development",
		tracesSampleRate: 1.0,
	});
}

let recurringSchedulerBoss: PgBoss | undefined;

function observeBossErrors(client: PgBoss, source: string): void {
	client.on("error", (error) => {
		console.error(`${source} error:`, error);
		Sentry.withScope((scope) => {
			scope.setTag("source", source);
			Sentry.captureException(error);
		});
	});
}

async function main() {
	console.log("Starting pg-boss worker...");

	// Awaited so a stored credential counts toward the validation below.
	await startCredentialRefresh();

	// Fail fast on misconfigured SCRAPE_TARGETS — surfaces unknown providers,
	// missing API keys, and per-provider target errors before any job runs.
	const legacyProviderExecutionEnabled = isLegacyProviderExecutionEnabled();
	if (legacyProviderExecutionEnabled) {
		validateScrapeTargets(parseScrapeTargets(process.env.SCRAPE_TARGETS), getProvider);
		console.log("SCRAPE_TARGETS validated");
	} else {
		console.log("Legacy provider execution disabled; skipped SCRAPE_TARGETS validation");
	}

	observeBossErrors(boss, "pg-boss-internal");

	// Start the processing client under the selected owner-managed or bootstrap lifecycle.
	await boss.start();
	console.log("pg-boss started");

	// Create queues if they don't exist (required in pg-boss v12)
	await boss.createQueue("process-prompt", {
		retryLimit: 3,
		retryDelay: 60,
		retryBackoff: true,
		expireInSeconds: 60 * 15, // 15 minute timeout
	});
	if (getDeployment().features.reportGeneration) {
		await boss.createQueue("generate-report", {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true,
			expireInSeconds: 60 * 60, // 1 hour timeout for reports
		});
	}
	await boss.createQueue("analyze-brand", {
		retryLimit: 1,
		retryDelay: 10,
		retryBackoff: false,
		expireInSeconds: 60 * 15, // 15 minute timeout for onboarding brand analysis
	});
	await boss.createQueue("schedule-maintenance", {
		retryLimit: 3,
		retryDelay: 300, // 5 minutes between retries
		retryBackoff: true,
		expireInSeconds: 60 * 30, // 30 minute timeout
	});
	// Never scheduled: a commercial measurement starts from an explicit admin
	// action. Retries are off because a claimed permit is spent — a retry could
	// only produce a second provider call for work authorized once. The queue
	// deadline must outlast Perplexity's bounded 25-minute provider workflow
	// plus snapshot cancellation and the terminal database transaction.
	await boss.createQueue("selena-measure", {
		retryLimit: 0,
		expireInSeconds: PERPLEXITY_QUEUE_LEASE_SECONDS,
	});
	// createQueue is idempotent but does not reconcile options on an existing
	// pg-boss queue. Keep deployed upgrades from retaining the old 15-minute
	// expiry after the Perplexity snapshot allowance changes.
	await boss.updateQueue("selena-measure", {
		retryLimit: 0,
		expireInSeconds: PERPLEXITY_QUEUE_LEASE_SECONDS,
	});
	await boss.createQueue("selena-answer-retention", {
		retryLimit: 1,
		retryDelay: 600,
		expireInSeconds: 60 * 10,
	});
	if (process.env.DEPLOYMENT_MODE === "whitelabel") {
		await boss.createQueue("sync-auth0-memberships", {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true,
			expireInSeconds: 60 * 10,
		});
	}
	console.log("Queues created");

	recurringSchedulerBoss = await reconcileAndStartRecurringSchedules(
		boss,
		{
			recurringEnabled: process.env.SELENA_RECURRING_JOBS_ENABLED,
			legacyProviderExecutionEnabled,
			maintenanceEnabled: isMaintenanceEnabled(process.env.SCHEDULE_MAINTENANCE_ENABLED),
			answerRetentionEnabled: process.env.SELENA_ANSWER_RETENTION_ENABLED,
			deploymentMode: process.env.DEPLOYMENT_MODE,
			ownerManaged: isOwnerManagedPgBossRuntime(runtimePgBossSchemaLifecycle()),
		},
		async () => {
			const scheduler = createRecurringSchedulerBoss();
			observeBossErrors(scheduler, "pg-boss-recurring");
			await scheduler.start();
			return scheduler;
		},
	);
	console.log(
		recurringSchedulerBoss
			? "Recurring scheduler enabled after schedule reconciliation"
			: "Recurring scheduler disabled; managed schedules removed",
	);

	// Register job handlers
	await registerHandlers(boss);
	console.log("All handlers registered, worker is ready");
}

main().catch(async (error) => {
	Sentry.captureException(error);
	console.error("Failed to start worker:", error);
	await Sentry.flush(2000);
	process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
	console.log("Received SIGTERM, shutting down gracefully...");
	if (recurringSchedulerBoss) await recurringSchedulerBoss.stop({ graceful: true, timeout: 30000 });
	await boss.stop({ graceful: true, timeout: 30000 });
	await Promise.all([Sentry.flush(2000), shutdownTelemetry()]);
	console.log("Worker stopped");
	process.exit(0);
});

process.on("SIGINT", async () => {
	console.log("Received SIGINT, shutting down gracefully...");
	if (recurringSchedulerBoss) await recurringSchedulerBoss.stop({ graceful: true, timeout: 30000 });
	await boss.stop({ graceful: true, timeout: 30000 });
	await Promise.all([Sentry.flush(2000), shutdownTelemetry()]);
	console.log("Worker stopped");
	process.exit(0);
});
