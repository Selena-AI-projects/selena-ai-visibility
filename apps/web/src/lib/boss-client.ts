import { PERPLEXITY_QUEUE_LEASE_SECONDS } from "@workspace/lib/adapters/brightdata";
import { runtimeDatabaseConnection, runtimePgBossSchemaLifecycle } from "@workspace/lib/db/postgres-config";
import type { PgBoss } from "pg-boss";

let bossInstance: PgBoss | null = null;
let bossPromise: Promise<PgBoss> | null = null;

/**
 * Get or create a pg-boss client instance.
 * Uses singleton pattern to avoid multiple connections.
 */
export async function getBoss(): Promise<PgBoss> {
	if (bossInstance) {
		return bossInstance;
	}

	if (bossPromise) {
		return bossPromise;
	}

	bossPromise = (async () => {
		// Loaded here rather than at module scope: server-function modules that
		// enqueue jobs stay in the client graph, and a static edge to pg-boss
		// shipped the Postgres driver to the browser.
		const { PgBoss } = await import("pg-boss");
		const boss = new PgBoss({
			...runtimeDatabaseConnection(),
			schema: "pgboss",
			// Hosted staging opts into owner-managed lifecycle explicitly; clean
			// local and self-hosted installs preserve pg-boss bootstrap.
			...runtimePgBossSchemaLifecycle(),
			// Web app only needs to send/schedule jobs, not process them
			supervise: false, // Let worker handle supervision
			// Recurring dispatch belongs to the worker's explicitly gated scheduler.
			schedule: false,
		});

		await boss.start();

		// Create queues if they don't exist (required in pg-boss v12)
		// createQueue is idempotent - safe to call multiple times
		await boss.createQueue("process-prompt", {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true,
			expireInSeconds: 60 * 15,
		});
		await boss.createQueue("generate-report", {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true,
			expireInSeconds: 60 * 60,
		});
		await boss.createQueue("analyze-brand", {
			retryLimit: 1,
			retryDelay: 10,
			retryBackoff: false,
			expireInSeconds: 60 * 15,
		});
		// Mirrors the worker's definition. Retries are off because a claimed
		// permit is spent: a retry could only produce a second provider call for
		// work that was authorized once.
		await boss.createQueue("selena-measure", {
			retryLimit: 0,
			expireInSeconds: PERPLEXITY_QUEUE_LEASE_SECONDS,
		});
		// createQueue preserves options on an existing queue. Reconcile the
		// measurement deadline so a web-first startup cannot leave the legacy
		// 15-minute expiry in place.
		await boss.updateQueue("selena-measure", {
			retryLimit: 0,
			expireInSeconds: PERPLEXITY_QUEUE_LEASE_SECONDS,
		});

		bossInstance = boss;
		return boss;
	})();

	return bossPromise;
}

/**
 * Stop the pg-boss client (for graceful shutdown).
 */
export async function stopBoss(): Promise<void> {
	if (bossInstance) {
		await bossInstance.stop();
		bossInstance = null;
		bossPromise = null;
	}
}
