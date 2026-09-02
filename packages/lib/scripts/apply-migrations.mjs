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

const MIGRATION_LOCK_TIMEOUT_SQL = "SET lock_timeout = '5s'";
// One database-wide lock for every bounded Selena migration ceiling. Keeping
// the key independent of the requested ceiling prevents adjacent release
// candidates from migrating the same journal concurrently.
const MIGRATION_LOCK_SQL = "select pg_advisory_lock(1397050446, 1095587150)";
const MIGRATION_UNLOCK_SQL = "select pg_advisory_unlock(1397050446, 1095587150) as unlocked";
const RELEASE_SHORT_0051 = Object.freeze({
	createdAt: "1787940013000",
	hash: "d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395",
});
const FORMAL_ACCEPTANCE_0056_CREATED_AT = "1787940018000";
const RELEASE_SHORT_0051_BRIDGE = "0051_release_short_to_feature_superset.sql";

// Staging was initially migrated from reviewed local snapshots before the
// service was connected to GitHub. Drizzle keeps applied file hashes immutable,
// so accept only the exact historical hashes at their exact timestamps. The
// forward migrations named below reconcile behavior that differs from release.
const APPLIED_MIGRATION_HASH_ALIASES = new Map([
	[
		"1787940007000:321e66332583c968a582525470460e000b1788c1a524d24d80d5e4a90c622fec",
		Object.freeze(["3b3915803095bf23f8e8b2e70134bfd71a7774d2793bf40f2e0a0bd03b1c051b"]),
	],
	// Commit 5ce45990 on feature/selena-visibility-v1-2-1 added an evidence
	// acceptance superset. It contains the release 0051 contract plus historical,
	// data-bearing objects that must not be dropped during journal recovery.
	[
		"1787940013000:d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395",
		Object.freeze(["c4a6d5b451183908adc3c240023d577d80a9e20d824ada9f89963b05afecb768"]),
	],
	// Merge 9f387cad on feature/selena-visibility-v1-2-1 carried the earlier
	// 0052 trigger that rejected an initial RESUMED event. 0055 replaces that
	// function with the release behavior after this prefix check succeeds.
	[
		"1787940014000:8e8e663516d0ec16c7c70c9b0d42235b0782c3d3dd86b5d3ebea15e8924c0961",
		Object.freeze(["3123968f0dce8cf6f8ec2054fd20922b5671afbe7ac56c3f082ed0c5016bfcca"]),
	],
]);

export async function expectedJournalRows(migrationsFolder) {
	const journal = JSON.parse(await readFile(resolve(migrationsFolder, "meta/_journal.json"), "utf8"));
	if (!Array.isArray(journal.entries) || journal.entries.length === 0)
		throw new Error("SELENA_MIGRATION_JOURNAL_INVALID");
	const rows = await Promise.all(
		journal.entries.map(async (entry) => {
			const createdAt = String(entry.when);
			const sourceHash = createHash("sha256")
				.update(await readFile(resolve(migrationsFolder, `${entry.tag}.sql`), "utf8"))
				.digest("hex");
			const directKey = `${createdAt}:${sourceHash}`;
			const canonicalEntry = APPLIED_MIGRATION_HASH_ALIASES.get(directKey)
				? { hash: sourceHash, acceptedAppliedHashes: APPLIED_MIGRATION_HASH_ALIASES.get(directKey) }
				: [...APPLIED_MIGRATION_HASH_ALIASES.entries()].find(
						([key, aliases]) => key.startsWith(`${createdAt}:`) && aliases.includes(sourceHash),
					);
			const hash = canonicalEntry ? (canonicalEntry.hash ?? canonicalEntry[0].slice(createdAt.length + 1)) : sourceHash;
			const acceptedAppliedHashes = canonicalEntry
				? (canonicalEntry.acceptedAppliedHashes ?? canonicalEntry[1])
				: Object.freeze([]);
			return {
				createdAt,
				hash,
				acceptedAppliedHashes,
			};
		}),
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

function migrationStatements(source) {
	return source
		.split("--> statement-breakpoint")
		.map((statement) => statement.trim())
		.filter(Boolean);
}

/**
 * The reviewed release-short 0051 hash predates receipt/read-model objects that
 * 0056 requires. Its journal row cannot be rewritten, and a normal 0057 would
 * be unreachable because PostgreSQL resolves the missing receipt table at the
 * start of 0056. Apply the exact owner-reviewed compatibility bridge while the
 * database-wide migration lock is held, then let Drizzle continue normally.
 */
export async function reconcileHistoricalMigrationVariants({
	client,
	actualRows,
	expectedRows,
	migrationsFolder,
	readCompatibilitySource = readFile,
	log = console.log,
}) {
	const releaseShortApplied = actualRows.some(
		(row) => row.createdAt === RELEASE_SHORT_0051.createdAt && row.hash === RELEASE_SHORT_0051.hash,
	);
	const formalAcceptanceApplied = actualRows.some((row) => row.createdAt === FORMAL_ACCEPTANCE_0056_CREATED_AT);
	const formalAcceptanceRequested = expectedRows.some(
		(row) => row.createdAt === FORMAL_ACCEPTANCE_0056_CREATED_AT,
	);
	if (!releaseShortApplied || formalAcceptanceApplied || !formalAcceptanceRequested) return false;

	const compatibilityPath = resolve(migrationsFolder, "compat", RELEASE_SHORT_0051_BRIDGE);
	const source = await readCompatibilitySource(compatibilityPath, "utf8");
	await client.query("BEGIN");
	try {
		for (const statement of migrationStatements(source)) await client.query(statement);
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK").catch(() => {});
		throw error;
	}
	log("historical 0051 release-short schema reconciled before 0056");
	return true;
}

export async function runMigrationCycleWithLock({
	client,
	expectedRows,
	migrationsFolder,
	createDatabase = drizzle,
	migrateDatabase = migrate,
	readCompatibilitySource = readFile,
	log = console.log,
}) {
	let lockAcquired = false;
	let migrationError;
	try {
		await client.query(MIGRATION_LOCK_SQL);
		lockAcquired = true;
		await client.query(MIGRATION_LOCK_TIMEOUT_SQL);

		const before = await journalState(client);
		log(
			`journal before: ${before ? `${before.length}/${before.at(-1)?.createdAt ?? "empty"}` : "no journal table yet"}`,
		);
		if (before) {
			assertJournalPrefix(before, expectedRows);
			await reconcileHistoricalMigrationVariants({
				client,
				actualRows: before,
				expectedRows,
				migrationsFolder,
				readCompatibilitySource,
				log,
			});
		}

		await migrateDatabase(createDatabase(client), { migrationsFolder });

		const after = await journalState(client);
		log(`journal after: ${after ? `${after.length}/${after.at(-1)?.createdAt ?? "empty"}` : "unknown"}`);
		assertJournalPostcondition(after, expectedRows);
		log("migrations complete");
	} catch (error) {
		migrationError = error;
	}

	let unlockError;
	if (lockAcquired) {
		try {
			const result = await client.query(MIGRATION_UNLOCK_SQL);
			if (result.rows[0]?.unlocked !== true) unlockError = new Error("SELENA_MIGRATION_ADVISORY_UNLOCK_FAILED");
		} catch (error) {
			unlockError = error;
		}
	}
	if (migrationError) throw migrationError;
	if (unlockError) throw unlockError;
}

export function assertJournalPrefix(actualRows, expectedRows) {
	if (actualRows.length > expectedRows.length) throw new Error("SELENA_MIGRATION_CEILING_ALREADY_EXCEEDED");
	for (const [index, actual] of actualRows.entries()) {
		const expected = expectedRows[index];
		const hashMatches =
			expected && (actual.hash === expected.hash || expected.acceptedAppliedHashes?.includes(actual.hash));
		if (!expected || actual.createdAt !== expected.createdAt || !hashMatches)
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
		options: "-c statement_timeout=1200000",
	});
	let client;
	try {
		client = await pool.connect();
		await runMigrationCycleWithLock({ client, expectedRows, migrationsFolder });
	} finally {
		// Destroy this dedicated session even after a successful explicit unlock so
		// an unlock failure can never return a lock-holding client to the pool.
		client?.release(true);
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
