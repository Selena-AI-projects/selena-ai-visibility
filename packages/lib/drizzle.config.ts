import { defineConfig } from "drizzle-kit";
import { runtimeDatabaseConnection } from "./src/db/postgres-config";

// The migration runner must reach the database the same way the application
// does: when SELENA_RUNTIME_DATABASE_CA_PEM is set, TLS is verified against
// that CA bundle instead of whatever the connection string implies. Without
// the variable this resolves to the plain URL, exactly as before. The guard
// keeps `drizzle-kit generate` working locally, where DATABASE_URL is unset.
const connection = process.env.DATABASE_URL ? runtimeDatabaseConnection() : undefined;

export default defineConfig({
	schema: ["./src/db/schema.ts", "./src/db/schema-auth.ts"],
	out: process.env.SELENA_MIGRATIONS_DIR ?? "./src/db/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: connection?.connectionString ?? process.env.DATABASE_URL!,
		ssl: connection?.ssl,
	},
});
