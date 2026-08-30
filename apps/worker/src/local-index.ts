import * as Sentry from "@sentry/node";
import { runtimeDatabaseConnection } from "@workspace/lib/db/postgres-config";
import { LOCAL_MEASUREMENT_QUEUE } from "@workspace/lib/selena-local-execution";
import { PgBoss } from "pg-boss";
import { registerLocalHandlers } from "./local-handlers";
import { shutdownTelemetry } from "./telemetry";

const localQueueOptions = {
	retryLimit: 0,
	expireInSeconds: 60 * 15,
} as const;

/** Construct the Local-only queue client without importing legacy worker code. */
export function createLocalWorkerBoss(): PgBoss {
	return new PgBoss({
		...runtimeDatabaseConnection(),
		schema: "pgboss",
		maintenanceIntervalSeconds: 30,
	});
}

/**
 * Start the isolated Local worker. This intentionally creates only the Local
 * queue; the executor remains owner-gated and therefore performs no provider
 * or write-side effects until a later approved runtime slice injects one.
 */
export async function startLocalWorker(boss: PgBoss = createLocalWorkerBoss()): Promise<PgBoss> {
	if (process.env.SENTRY_DSN) {
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			environment: process.env.ENVIRONMENT || "development",
			tracesSampleRate: 1.0,
		});
	}

	boss.on("error", (error) => {
		console.error("Local pg-boss error:", error);
		Sentry.withScope((scope) => {
			scope.setTag("source", "pg-boss-local-worker");
			Sentry.captureException(error);
		});
	});

	await boss.start();
	await boss.createQueue(LOCAL_MEASUREMENT_QUEUE, localQueueOptions);
	await registerLocalHandlers(boss);
	console.log(`Local worker ready: ${LOCAL_MEASUREMENT_QUEUE} (owner-gated)`);
	return boss;
}

const isDirectRun = process.argv[1]?.endsWith("/local-index.ts") || process.argv[1]?.endsWith("/local-index.js");

if (isDirectRun) {
	let boss: PgBoss | undefined;
	startLocalWorker()
		.then((startedBoss) => {
			boss = startedBoss;
		})
		.catch(async (error) => {
			Sentry.captureException(error);
			console.error("Failed to start Local worker:", error);
			await Sentry.flush(2000);
			process.exit(1);
		});

	const stop = async () => {
		console.log("Stopping Local worker...");
		if (boss) await boss.stop({ graceful: true, timeout: 30000 });
		await Promise.all([Sentry.flush(2000), shutdownTelemetry()]);
		process.exit(0);
	};
	process.on("SIGTERM", stop);
	process.on("SIGINT", stop);
}
