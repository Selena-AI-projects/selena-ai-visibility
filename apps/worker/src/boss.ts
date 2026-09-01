import { runtimeDatabaseConnection, runtimePgBossSchemaLifecycle } from "@workspace/lib/db/postgres-config";
import { PgBoss } from "pg-boss";
import { isOwnerManagedPgBossRuntime, ownerManagedPgBossRuntimeOptions } from "./runtime-boss-options";

const schemaLifecycle = runtimePgBossSchemaLifecycle();
const boss = new PgBoss({
	...runtimeDatabaseConnection(),
	// Staging opts into an owner-provisioned schema explicitly. Clean local and
	// self-hosted installs retain pg-boss' normal bootstrap behavior.
	schema: "pgboss",
	...schemaLifecycle,
	// Processing and recurring dispatch are separate lifecycles. The main worker
	// must not scan cron rows while startup is still reconciling the owner gates.
	schedule: false,
	// Non-owner runtimes cannot update pg-boss cadence metadata or create/drop
	// queue-stat partitions. Local/self-hosted owners retain pg-boss defaults.
	...ownerManagedPgBossRuntimeOptions(schemaLifecycle),

	// How often pg-boss runs maintenance tasks
	maintenanceIntervalSeconds: 30,
});

/** Start only after all managed recurring schedules have been reconciled. */
export function createRecurringSchedulerBoss(): PgBoss {
	const recurringSchemaLifecycle = runtimePgBossSchemaLifecycle();
	if (
		isOwnerManagedPgBossRuntime(recurringSchemaLifecycle) &&
		process.env.SELENA_PGBOSS_RECURRING_RUNTIME_ENABLED !== "true"
	) {
		throw new Error("PGBOSS_RECURRING_OWNER_GATE_REQUIRED");
	}
	return new PgBoss({
		...runtimeDatabaseConnection(),
		schema: "pgboss",
		...recurringSchemaLifecycle,
		schedule: true,
		supervise: false,
		...ownerManagedPgBossRuntimeOptions(recurringSchemaLifecycle),
	});
}

export default boss;
