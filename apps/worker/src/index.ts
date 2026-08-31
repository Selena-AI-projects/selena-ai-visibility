import * as Sentry from "@sentry/node";
import { getDeployment } from "@workspace/deployment";
import { PERPLEXITY_QUEUE_LEASE_SECONDS } from "@workspace/lib/adapters/brightdata";
import { getProvider, parseScrapeTargets, validateScrapeTargets } from "@workspace/lib/providers";
import { isLegacyProviderExecutionEnabled, isMaintenanceEnabled } from "@workspace/lib/run-policy";
import { startCredentialRefresh } from "@workspace/lib/secrets";
import boss from "./boss";
import { registerHandlers } from "./handlers";
import { reconcileAnswerRetentionSchedule } from "./jobs/selena-answer-retention";
import { shutdownTelemetry } from "./telemetry";

if (process.env.SENTRY_DSN) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		environment: process.env.ENVIRONMENT || "development",
		tracesSampleRate: 1.0,
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

	boss.on("error", (error) => {
		console.error("pg-boss error:", error);
		Sentry.withScope((scope) => {
			scope.setTag("source", "pg-boss-internal");
			Sentry.captureException(error);
		});
	});

	// Start pg-boss (creates schema if needed)
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

	if (legacyProviderExecutionEnabled && isMaintenanceEnabled(process.env.SCHEDULE_MAINTENANCE_ENABLED)) {
		await boss.schedule("schedule-maintenance", "*/5 * * * *", { source: "scheduled" }, { tz: "UTC" });
		console.log("Scheduled maintenance job (every 5 minutes)");
	} else {
		await boss.unschedule("schedule-maintenance");
		console.log("Maintenance schedule disabled by SCHEDULE_MAINTENANCE_ENABLED=false");
	}

	if (process.env.DEPLOYMENT_MODE === "whitelabel") {
		await boss.schedule("sync-auth0-memberships", "*/15 * * * *", { source: "scheduled" }, { tz: "UTC" });
		console.log("Scheduled Auth0 membership sync (every 15 minutes)");
	}

	await reconcileAnswerRetentionSchedule(boss, process.env.SELENA_ANSWER_RETENTION_ENABLED);

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
	await boss.stop({ graceful: true, timeout: 30000 });
	await Promise.all([Sentry.flush(2000), shutdownTelemetry()]);
	console.log("Worker stopped");
	process.exit(0);
});

process.on("SIGINT", async () => {
	console.log("Received SIGINT, shutting down gracefully...");
	await boss.stop({ graceful: true, timeout: 30000 });
	await Promise.all([Sentry.flush(2000), shutdownTelemetry()]);
	console.log("Worker stopped");
	process.exit(0);
});
