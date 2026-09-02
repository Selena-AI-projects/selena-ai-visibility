import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	assertJournalPostcondition,
	assertJournalPrefix,
	expectedJournalRows,
	reconcileHistoricalMigrationVariants,
	runMigrationCycleWithLock,
} from "./apply-migrations.mjs";

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

	it("accepts a reviewed historical hash only at its exact migration timestamp", () => {
		const canonical = {
			createdAt: "1787940007000",
			hash: "canonical-0045",
			acceptedAppliedHashes: ["reviewed-staging-0045"],
		};
		expect(() =>
			assertJournalPrefix([{ createdAt: canonical.createdAt, hash: "reviewed-staging-0045" }], [canonical]),
		).not.toThrow();
		expect(() =>
			assertJournalPrefix([{ createdAt: "1787940008000", hash: "reviewed-staging-0045" }], [canonical]),
		).toThrow("SELENA_MIGRATION_JOURNAL_MISMATCH");
		expect(() =>
			assertJournalPrefix([{ createdAt: canonical.createdAt, hash: "unreviewed-0045" }], [canonical]),
		).toThrow("SELENA_MIGRATION_JOURNAL_MISMATCH");
	});

	it("binds the staging 0045 alias to the canonical migration manifest", async () => {
		const rows = await expectedJournalRows(fileURLToPath(new URL("../src/db/migrations", import.meta.url)));
		expect(rows[45]).toEqual({
			createdAt: "1787940007000",
			hash: "321e66332583c968a582525470460e000b1788c1a524d24d80d5e4a90c622fec",
			acceptedAppliedHashes: ["3b3915803095bf23f8e8b2e70134bfd71a7774d2793bf40f2e0a0bd03b1c051b"],
		});
		expect(() =>
			assertJournalPrefix(
				[
					{
						createdAt: "1787940007000",
						hash: "c4a6d5b451183908adc3c240023d577d80a9e20d824ada9f89963b05afecb768",
					},
				],
				[rows[45]],
			),
		).toThrow("SELENA_MIGRATION_JOURNAL_MISMATCH");
	});

	it("binds the reviewed feature snapshot aliases to 0051 and 0052 only", async () => {
		const rows = await expectedJournalRows(fileURLToPath(new URL("../src/db/migrations", import.meta.url)));
		expect(rows[51]).toEqual({
			createdAt: "1787940013000",
			hash: "d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395",
			acceptedAppliedHashes: ["c4a6d5b451183908adc3c240023d577d80a9e20d824ada9f89963b05afecb768"],
		});
		expect(rows[52]).toEqual({
			createdAt: "1787940014000",
			hash: "8e8e663516d0ec16c7c70c9b0d42235b0782c3d3dd86b5d3ebea15e8924c0961",
			acceptedAppliedHashes: ["3123968f0dce8cf6f8ec2054fd20922b5671afbe7ac56c3f082ed0c5016bfcca"],
		});
		expect(() =>
			assertJournalPrefix([{ createdAt: rows[52].createdAt, hash: rows[51].acceptedAppliedHashes[0] }], [rows[52]]),
		).toThrow("SELENA_MIGRATION_JOURNAL_MISMATCH");
	});

	it("bridges the exact release-short 0051 schema before 0056", async () => {
		const queries = [];
		const bridged = await reconcileHistoricalMigrationVariants({
			client: { query: async (statement) => queries.push(statement) },
			actualRows: [
				{
					createdAt: "1787940013000",
					hash: "d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395",
				},
			],
			migrationsFolder: "/reviewed-migrations",
			readCompatibilitySource: async (path, encoding) => {
				expect(path).toBe("/reviewed-migrations/compat/0051_release_short_to_feature_superset.sql");
				expect(encoding).toBe("utf8");
				return "SELECT 1;\n--> statement-breakpoint\nSELECT 2;";
			},
			log: () => {},
		});

		expect(bridged).toBe(true);
		expect(queries).toEqual(["BEGIN", "SELECT 1;", "SELECT 2;", "COMMIT"]);
	});

	it("does not bridge a full 0051 or a database already through 0056", async () => {
		const options = {
			client: { query: async () => undefined },
			migrationsFolder: "/reviewed-migrations",
			readCompatibilitySource: async () => {
				throw new Error("compatibility source must not be read");
			},
			log: () => {},
		};
		await expect(
			reconcileHistoricalMigrationVariants({
				...options,
				actualRows: [
					{
						createdAt: "1787940013000",
						hash: "c4a6d5b451183908adc3c240023d577d80a9e20d824ada9f89963b05afecb768",
					},
				],
			}),
		).resolves.toBe(false);
		await expect(
			reconcileHistoricalMigrationVariants({
				...options,
				actualRows: [
					{
						createdAt: "1787940013000",
						hash: "d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395",
					},
					{ createdAt: "1787940018000", hash: "0056-applied" },
				],
			}),
		).resolves.toBe(false);
	});

	it("rolls back an incomplete release-short compatibility bridge", async () => {
		const queries = [];
		await expect(
			reconcileHistoricalMigrationVariants({
				client: {
					query: async (statement) => {
						queries.push(statement);
						if (statement === "BROKEN;") throw new Error("EXPECTED_BRIDGE_FAILURE");
					},
				},
				actualRows: [
					{
						createdAt: "1787940013000",
						hash: "d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395",
					},
				],
				migrationsFolder: "/reviewed-migrations",
				readCompatibilitySource: async () => "SELECT 1;\n--> statement-breakpoint\nBROKEN;",
				log: () => {},
			}),
		).rejects.toThrow("EXPECTED_BRIDGE_FAILURE");
		expect(queries).toEqual(["BEGIN", "SELECT 1;", "BROKEN;", "ROLLBACK"]);
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
			"runner-a:lock",
			"runner-a:timeout",
			"runner-a:journal:0",
			"runner-a:migrate",
			`runner-a:journal:${expected.length}`,
			"runner-a:unlock",
			"runner-b:lock",
			"runner-b:timeout",
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
