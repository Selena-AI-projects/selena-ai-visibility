// Applies pending migrations through drizzle-orm's programmatic migrator.
//
// This exists because the drizzle-kit CLI exits with code 1 and no output on
// a migration failure in a non-interactive container — five staging runs died
// without a single printed error. Here every failure prints its full stack,
// and the applied count is read back from the journal table instead of being
// inferred from the exit code.
//
// Plain .mjs run by node directly: the library deploy ships no TypeScript
// runner. The TS connection helper is type-stripped by Node at import time.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const { runtimeDatabaseConnection } = await import("../src/db/postgres-config.ts");

async function appliedCount(pool) {
	try {
		const result = await pool.query("select count(*)::int as n from drizzle.__drizzle_migrations");
		return result.rows[0].n;
	} catch {
		return null;
	}
}

let pool;
try {
	const connection = runtimeDatabaseConnection();
	console.log(
		connection.ssl
			? "connecting with TLS verified against SELENA_RUNTIME_DATABASE_CA_PEM"
			: "connecting without TLS verification (SELENA_RUNTIME_DATABASE_CA_PEM unset)",
	);
	pool = new pg.Pool({ connectionString: connection.connectionString, ssl: connection.ssl });

	const before = await appliedCount(pool);
	console.log(`journal before: ${before ?? "no journal table yet"}`);

	await migrate(drizzle(pool), { migrationsFolder: "./src/db/migrations" });

	const after = await appliedCount(pool);
	console.log(`journal after: ${after ?? "unknown"}`);
	console.log("migrations complete");
	process.exitCode = 0;
} catch (error) {
	// One short line per fact, most important first: the platform drops log
	// lines beyond 500/sec, and a full DrizzleQueryError dump of a large
	// migration flooded exactly the line that named the failure.
	console.error(`migration failed: ${String(error?.message ?? error).split("\n")[0]}`);
	const cause = error?.cause;
	if (cause) console.error(`cause: ${String(cause?.message ?? cause).split("\n")[0]}`);
	process.exitCode = 1;
} finally {
	await pool?.end().catch(() => {});
}
