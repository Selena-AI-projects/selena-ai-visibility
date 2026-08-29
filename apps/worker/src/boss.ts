import { runtimeDatabaseConnection } from "@workspace/lib/db/postgres-config";
import { PgBoss } from "pg-boss";

const boss = new PgBoss({
	...runtimeDatabaseConnection(),
	// Use same DB as app, pg-boss creates its own schema
	schema: "pgboss",

	// How often pg-boss runs maintenance tasks
	maintenanceIntervalSeconds: 30,
});

export default boss;
