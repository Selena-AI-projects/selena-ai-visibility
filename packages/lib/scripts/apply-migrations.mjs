// Applies pending migrations through drizzle-orm's programmatic migrator.
//
// This exists because the drizzle-kit CLI exits with code 1 and no output on
// a migration failure in a non-interactive container — five staging runs died
// without a single printed error. Here every failure prints its full stack,
// and the exact ordered journal is read back instead of inferred from exit code.
//
// Plain .mjs run by node directly: the library deploy ships no TypeScript
// runner. The TS connection helper is type-stripped by Node at import time.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

export async function expectedJournalRows(migrationsFolder) {
	const journal = JSON.parse(await readFile(resolve(migrationsFolder, "meta/_journal.json"), "utf8"));
	if (!Array.isArray(journal.entries) || journal.entries.length === 0)
		throw new Error("SELENA_MIGRATION_JOURNAL_INVALID");
	const rows = await Promise.all(
		journal.entries.map(async (entry) => ({
			createdAt: String(entry.when),
			hash: createHash("sha256")
				.update(await readFile(resolve(migrationsFolder, `${entry.tag}.sql`), "utf8"))
				.digest("hex"),
		})),
	);
	if (!/^\d+$/.test(rows.at(-1)?.createdAt ?? "")) throw new Error("SELENA_MIGRATION_JOURNAL_INVALID");
	return rows;
}

async function journalState(pool) {
	try {
		const result = await pool.query(
			"select hash, created_at::text as created_at from drizzle.__drizzle_migrations order by created_at asc",
		);
		return result.rows.map((row) => ({ hash: row.hash, createdAt: row.created_at }));
	} catch {
		return null;
	}
}

export function assertJournalPrefix(actualRows, expectedRows) {
	if (actualRows.length > expectedRows.length) throw new Error("SELENA_MIGRATION_CEILING_ALREADY_EXCEEDED");
	for (const [index, actual] of actualRows.entries()) {
		const expected = expectedRows[index];
		if (!expected || actual.createdAt !== expected.createdAt || actual.hash !== expected.hash)
			throw new Error("SELENA_MIGRATION_JOURNAL_MISMATCH");
	}
}

export function assertJournalPostcondition(actualRows, expectedRows) {
	if (!actualRows) throw new Error("SELENA_MIGRATION_POSTCONDITION_FAILED");
	assertJournalPrefix(actualRows, expectedRows);
	if (actualRows.length !== expectedRows.length) throw new Error("SELENA_MIGRATION_POSTCONDITION_FAILED");
}

export async function main() {
	const migrationsFolder = process.env.SELENA_MIGRATIONS_DIR;
	if (!migrationsFolder) throw new Error("SELENA_MIGRATIONS_DIR_REQUIRED");
	const expectedRows = await expectedJournalRows(migrationsFolder);
	const { runtimeDatabaseConnection } = await import("../src/db/postgres-config.ts");
	const connection = runtimeDatabaseConnection();
	console.log(
		connection.ssl
			? "connecting with TLS verified against SELENA_RUNTIME_DATABASE_CA_PEM"
			: "connecting without TLS verification (SELENA_RUNTIME_DATABASE_CA_PEM unset)",
	);
	const pool = new pg.Pool({
		connectionString: connection.connectionString,
		ssl: connection.ssl,
		max: 1,
		options: "-c lock_timeout=5000 -c statement_timeout=1200000",
	});
	try {
		const before = await journalState(pool);
		console.log(
			`journal before: ${before ? `${before.length}/${before.at(-1)?.createdAt ?? "empty"}` : "no journal table yet"}`,
		);
		if (before) assertJournalPrefix(before, expectedRows);

		await migrate(drizzle(pool), { migrationsFolder });

		const after = await journalState(pool);
		console.log(`journal after: ${after ? `${after.length}/${after.at(-1)?.createdAt ?? "empty"}` : "unknown"}`);
		assertJournalPostcondition(after, expectedRows);
		console.log("migrations complete");
	} finally {
		await pool.end().catch(() => {});
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		// Keep the primary failure visible even when Railway rate-limits logs.
		console.error(`migration failed: ${String(error?.message ?? error).split("\n")[0]}`);
		const cause = error?.cause;
		if (cause) console.error(`cause: ${String(cause?.message ?? cause).split("\n")[0]}`);
		process.exitCode = 1;
	});
}
