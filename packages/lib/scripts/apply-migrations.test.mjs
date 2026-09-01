import { describe, expect, it } from "vitest";
import { assertJournalPostcondition, assertJournalPrefix, runMigrationCycleWithLock } from "./apply-migrations.mjs";

const expected = [
	{ hash: "hash-0049", createdAt: "1787940011000" },
	{ hash: "hash-0050", createdAt: "1787940012000" },
	{ hash: "hash-0051", createdAt: "1787940013000" },
];

describe("bounded migration journal acceptance", () => {
	it("accepts only the exact ordered reviewed prefix before migration", () => {
		expect(() => assertJournalPrefix(expected.slice(0, 2), expected)).not.toThrow();
		expect(() =>
			assertJournalPrefix([...expected, { hash: "hash-0052", createdAt: "1787940014000" }], expected),
		).toThrow("SELENA_MIGRATION_CEILING_ALREADY_EXCEEDED");
		expect(() => assertJournalPrefix([{ ...expected[0], hash: "changed" }], expected)).toThrow(
			"SELENA_MIGRATION_JOURNAL_MISMATCH",
		);
	});

	it("requires the exact reviewed journal as the postcondition", () => {
		expect(() => assertJournalPostcondition(expected, expected)).not.toThrow();
		expect(() => assertJournalPostcondition(expected.slice(0, 2), expected)).toThrow(
			"SELENA_MIGRATION_POSTCONDITION_FAILED",
		);
		expect(() => assertJournalPostcondition(null, expected)).toThrow("SELENA_MIGRATION_POSTCONDITION_FAILED");
	});

	it("serializes two runners across journal precheck, migration, and postcondition", async () => {
		const events = [];
		const waiters = [];
		let lockHeld = false;
		let activeMigrations = 0;
		let maximumActiveMigrations = 0;
		let journalRows = [];

		function client(id) {
			return {
				id,
				async query(statement) {
					if (statement.startsWith("SET lock_timeout")) {
						events.push(`${id}:timeout`);
						return { rows: [] };
					}
					if (statement.includes("pg_advisory_lock")) {
						if (lockHeld) await new Promise((resolve) => waiters.push(resolve));
						lockHeld = true;
						events.push(`${id}:lock`);
						return { rows: [] };
					}
					if (statement.includes("pg_advisory_unlock")) {
						events.push(`${id}:unlock`);
						lockHeld = false;
						waiters.shift()?.();
						return { rows: [{ unlocked: true }] };
					}
					if (statement.includes("drizzle.__drizzle_migrations")) {
						events.push(`${id}:journal:${journalRows.length}`);
						return { rows: journalRows.map(({ hash, createdAt }) => ({ hash, created_at: createdAt })) };
					}
					throw new Error(`unexpected query: ${statement}`);
				},
			};
		}

		const migrateDatabase = async (database) => {
			activeMigrations += 1;
			maximumActiveMigrations = Math.max(maximumActiveMigrations, activeMigrations);
			events.push(`${database.id}:migrate`);
			await new Promise((resolve) => setImmediate(resolve));
			journalRows = expected;
			activeMigrations -= 1;
		};
		const options = {
			expectedRows: expected,
			migrationsFolder: "/reviewed-through-0051",
			createDatabase: (migrationClient) => migrationClient,
			migrateDatabase,
			log: () => {},
		};

		await Promise.all([
			runMigrationCycleWithLock({ ...options, client: client("runner-a") }),
			runMigrationCycleWithLock({ ...options, client: client("runner-b") }),
		]);

		expect(maximumActiveMigrations).toBe(1);
		expect(events).toEqual([
			"runner-a:timeout",
			"runner-b:timeout",
			"runner-a:lock",
			"runner-a:journal:0",
			"runner-a:migrate",
			`runner-a:journal:${expected.length}`,
			"runner-a:unlock",
			"runner-b:lock",
			`runner-b:journal:${expected.length}`,
			"runner-b:migrate",
			`runner-b:journal:${expected.length}`,
			"runner-b:unlock",
		]);
	});

	it("releases the session lock when migration fails", async () => {
		const queries = [];
		const client = {
			async query(statement) {
				queries.push(statement);
				if (statement.includes("drizzle.__drizzle_migrations")) return { rows: [] };
				if (statement.includes("pg_advisory_unlock")) return { rows: [{ unlocked: true }] };
				return { rows: [] };
			},
		};

		await expect(
			runMigrationCycleWithLock({
				client,
				expectedRows: expected,
				migrationsFolder: "/reviewed-through-0051",
				createDatabase: () => ({}),
				migrateDatabase: async () => {
					throw new Error("EXPECTED_MIGRATION_FAILURE");
				},
				log: () => {},
			}),
		).rejects.toThrow("EXPECTED_MIGRATION_FAILURE");

		expect(queries.at(-1)).toContain("pg_advisory_unlock");
	});
});
