import * as Sentry from "@sentry/node";
import { db } from "@workspace/lib/db/db";
import { runtimeDatabaseConnection, runtimePgBossSchemaLifecycle } from "@workspace/lib/db/postgres-config";
import { createLocalDispatchStore } from "@workspace/lib/selena-local-dispatch-store";
import { LOCAL_MEASUREMENT_QUEUE } from "@workspace/lib/selena-local-execution";
import { PgBoss } from "pg-boss";
import { createLocalRawRetentionHandler } from "./jobs/selena-local-raw-retention";
import { startLocalCustomerFixtureScheduler } from "./local-customer-fixture-scheduler";
import { startLocalOutboxDispatcher } from "./local-dispatch-outbox";
import { registerLocalHandlers } from "./local-handlers";
import { registerLocalOperatorAlerts } from "./local-operator-alerts";
import { startLocalRawRetentionScheduler } from "./local-raw-retention-scheduler";
import { ownerManagedPgBossRuntimeOptions } from "./runtime-boss-options";
import { shutdownTelemetry } from "./telemetry";

const localShutdown = new WeakMap<PgBoss, Array<() => Promise<void>>>();

export async function stopLocalWorker(boss: PgBoss): Promise<void> {
	const stops = localShutdown.get(boss) ?? [];
	localShutdown.delete(boss);
	await Promise.all(stops.map((stop) => stop()));
	await boss.stop({ graceful: true, timeout: 30000 });
}

const localQueueOptions = {
	retryLimit: 0,
	expireInSeconds: 60 * 15,
} as const;

/** Construct the Local-only queue client without importing legacy worker code. */
export function createLocalWorkerBoss(): PgBoss {
	const schemaLifecycle = runtimePgBossSchemaLifecycle();
	return new PgBoss({
		...runtimeDatabaseConnection(),
		schema: "pgboss",
		...schemaLifecycle,
		schedule: false,
		...ownerManagedPgBossRuntimeOptions(schemaLifecycle),
		maintenanceIntervalSeconds: 30,
	});
}

/**
 * Start the isolated Local worker. It creates only the Local queue and starts
 * the transactional outbox dispatcher when the owner has explicitly opened
 * the provider controls for one organization.
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

	const stops: Array<() => Promise<void>> = [];
	localShutdown.set(boss, stops);
	try {
		await boss.start();
		await boss.createQueue(LOCAL_MEASUREMENT_QUEUE, localQueueOptions);
		await registerLocalHandlers(boss);
		const notifyOperator = await registerLocalOperatorAlerts(boss);
		const stopCustomerFixture = startLocalCustomerFixtureScheduler(process.env, notifyOperator);
		if (stopCustomerFixture) stops.push(stopCustomerFixture);
		const stopRetention = await startLocalRawRetentionScheduler({
			boss,
			env: process.env,
			handler: createLocalRawRetentionHandler(db, undefined, (count) => {
				console.warn(`Local raw retention overdue: ${count}`);
				void notifyOperator?.("RAW_RETENTION_OVERDUE").catch(() =>
					console.error("LOCAL_OPERATOR_ALERT_ENQUEUE_FAILED"),
				);
				Sentry.captureMessage("Local raw retention overdue", { level: "warning", extra: { count } });
			}),
			onError: (error) => {
				console.error("Local raw retention sender failed", error);
				Sentry.captureException(error);
			},
		});
		if (stopRetention) stops.push(stopRetention);

		const organizationId = process.env.SELENA_LOCAL_DISPATCH_ORGANIZATION_ID?.trim();
		if (
			organizationId &&
			process.env.SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED === "true" &&
			process.env.SELENA_LOCAL_EMERGENCY_STOP === "false"
		) {
			const dispatcher = startLocalOutboxDispatcher({
				store: createLocalDispatchStore(
					db,
					organizationId,
					Number(process.env.SELENA_LOCAL_OUTBOX_LEASE_MS ?? "60000"),
				),
				queue: boss,
				env: () => process.env,
				onError: (error) => {
					console.error("Local outbox dispatcher error:", error);
					Sentry.captureException(error);
				},
				intervalMs: Number(process.env.SELENA_LOCAL_OUTBOX_DISPATCH_INTERVAL_MS ?? "5000"),
			});
			stops.push(dispatcher);
			console.log(`Local outbox dispatcher enabled for organization ${organizationId}`);
		} else {
			console.log("Local outbox dispatcher disabled: explicit organization and execution controls are required");
		}
		console.log(`Local worker ready: ${LOCAL_MEASUREMENT_QUEUE}`);
		return boss;
	} catch (error) {
		await stopLocalWorker(boss);
		throw error;
	}
}

const isDirectRun = process.argv[1]?.endsWith("/local-index.ts") || process.argv[1]?.endsWith("/local-index.js");

if (isDirectRun) {
	let boss: PgBoss | undefined;
	const starting = startLocalWorker()
		.then((startedBoss) => {
			boss = startedBoss;
		})
		.catch(async (error) => {
			Sentry.captureException(error);
			console.error("Failed to start Local worker:", error);
			await Sentry.flush(2000);
			process.exit(1);
		});

	let stopping = false;
	const stop = async () => {
		if (stopping) return;
		stopping = true;
		await starting;
		console.log("Stopping Local worker...");
		if (boss) await stopLocalWorker(boss);
		await Promise.all([Sentry.flush(2000), shutdownTelemetry()]);
		process.exit(0);
	};
	process.on("SIGTERM", stop);
	process.on("SIGINT", stop);
}
