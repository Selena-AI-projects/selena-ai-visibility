import { runtimeDatabaseConnection } from "@workspace/lib/db/postgres-config";
import { PgBoss } from "pg-boss";

const boss = new PgBoss({
	...runtimeDatabaseConnection(),
	// Use the owner-provisioned pg-boss schema in the application database.
	schema: "pgboss",
	// Hosted schema lifecycle is owner-managed. The runtime role has DML and
	// function privileges only, so startup must never attempt schema DDL.
	createSchema: false,
	migrate: false,

	// How often pg-boss runs maintenance tasks
	maintenanceIntervalSeconds: 30,
});

export default boss;
