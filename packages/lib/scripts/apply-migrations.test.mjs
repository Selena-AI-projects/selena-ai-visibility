import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	assertJournalPostcondition,
	assertJournalPrefix,
	assertMigrationApproval,
	expectedJournalRows,
	MIGRATION_APPROVAL_ENV,
	reconcileHistoricalMigrationVariants,
	runMigrationCycleWithLock,
} from "./apply-migrations.mjs";
import { prepareBoundedMigrations } from "./run-bounded-migrations.mjs";

const expected = [
	{ hash: "hash-0049", createdAt: "1787940011000" },
	{ hash: "hash-0050", createdAt: "1787940012000" },
	{ hash: "hash-0051", createdAt: "1787940013000" },
];

describe("bounded migration journal acceptance", () => {
	it("ships the release-short compatibility bridge only when 0056 is inside the sealed ceiling", () => {
		const root = mkdtempSync(join(tmpdir(), "selena-bounded-compat-test-"));
		const through55 = join(root, "selena-through-55");
		const through56 = join(root, "selena-through-56");
		try {
			prepareBoundedMigrations({ maximumIndex: 55, targetDirectory: through55 });
			expect(existsSync(join(through55, "compat/0051_release_short_to_feature_superset.sql"))).toBe(false);
			prepareBoundedMigrations({ maximumIndex: 56, targetDirectory: through56 });
			expect(existsSync(join(through56, "compat/0051_release_short_to_feature_superset.sql"))).toBe(true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("accepts only the exact ordered reviewed prefix before migration", () => {
		expect(() => assertJournalPrefix(expected.slice(0, 2), expected)).not.toThrow();
		expect(() =>
			assertJournalPrefix([...expected, { hash: "hash-0052", createdAt: "1787940014000" }], expected),
		).toThrow("SELENA_MIGRATION_CEILING_ALREADY_EXCEEDED");
		expect(() => assertJournalPrefix([{ ...expected[0], hash: "changed" }], expected)).toThrow(
			"SELENA_MIGRATION_JOURNAL_MISMATCH",
		);
	});

	it("accepts only the recovered staging history beside the shipped journal", () => {
		const historical = {
			createdAt: "1787940028001",
			hash: "21ebc5b9378ef1af64c95cac1870882adf52a4ad3c5d3c9c108d208a0634ee45",
		};
		expect(() => assertJournalPostcondition([...expected, historical], expected)).not.toThrow();
		expect(() =>
			assertJournalPostcondition([...expected, { ...historical, hash: "unreviewed" }], expected),
		).toThrow("SELENA_MIGRATION_CEILING_ALREADY_EXCEEDED");
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
		expect(rows[45]).toMatchObject({
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
		expect(rows[51]).toMatchObject({
			createdAt: "1787940013000",
			hash: "d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395",
			acceptedAppliedHashes: ["c4a6d5b451183908adc3c240023d577d80a9e20d824ada9f89963b05afecb768"],
		});
		expect(rows[52]).toMatchObject({
			createdAt: "1787940014000",
			hash: "8e8e663516d0ec16c7c70c9b0d42235b0782c3d3dd86b5d3ebea15e8924c0961",
			acceptedAppliedHashes: ["3123968f0dce8cf6f8ec2054fd20922b5671afbe7ac56c3f082ed0c5016bfcca"],
		});
		expect(() =>
			assertJournalPrefix([{ createdAt: rows[52].createdAt, hash: rows[51].acceptedAppliedHashes[0] }], [rows[52]]),
		).toThrow("SELENA_MIGRATION_JOURNAL_MISMATCH");
	});

	/**
	 * The digest staging applied for 0060 and the one the release ships. Binding
	 * this exact pair is what lets that database keep moving; binding anything
	 * else would let an edited migration pass unnoticed.
	 */
	it("binds the staging 0060 variant to the release manifest", async () => {
		const rows = await expectedJournalRows(fileURLToPath(new URL("../src/db/migrations", import.meta.url)));
		expect(rows[60]).toMatchObject({
			createdAt: "1787940022000",
			hash: "b3f720b1e03cb163e2ac379efddb1593c80e3e222097a8f72b7c9ff8d82a72d6",
			acceptedAppliedHashes: ["5b5f21235bf75ee1f39f7946fca5a7fd537a9d768396d114e7a6d2f0e570adf1"],
		});
		expect(() =>
			assertJournalPrefix(
				[{ createdAt: "1787940022000", hash: rows[60].acceptedAppliedHashes[0] }],
				[rows[60]],
			),
		).not.toThrow();
	});

	it("accepts the 0060 variant only at its own timestamp", () => {
		const shipped = {
			createdAt: "1787940022000",
			hash: "b3f720b1e03cb163e2ac379efddb1593c80e3e222097a8f72b7c9ff8d82a72d6",
			acceptedAppliedHashes: ["5b5f21235bf75ee1f39f7946fca5a7fd537a9d768396d114e7a6d2f0e570adf1"],
			tag: "0060_journal_hold_owner_reconciliation",
		};
		expect(() =>
			assertJournalPrefix([{ createdAt: "1787940023000", hash: shipped.acceptedAppliedHashes[0] }], [shipped]),
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
			expectedRows: [{ createdAt: "1787940018000", hash: "0056-requested" }],
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
			expectedRows: [{ createdAt: "1787940018000", hash: "0056-requested" }],
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
		await expect(
			reconcileHistoricalMigrationVariants({
				...options,
				expectedRows: [{ createdAt: "1787940017000", hash: "0055-requested" }],
				actualRows: [
					{
						createdAt: "1787940013000",
						hash: "d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395",
					},
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
				expectedRows: [{ createdAt: "1787940018000", hash: "0056-requested" }],
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

/**
 * The gate that turns "no DDL without an exact-SHA decision" from a sentence in
 * an acceptance document into something the deploy cannot walk past.
 */
describe("owner approval before applying DDL", () => {
	const hosted = { RAILWAY_ENVIRONMENT_NAME: "staging", RAILWAY_GIT_COMMIT_SHA: "c71bf0ebb2617411a18b5b0291d53fcf27ae8f09" };
	const silent = () => {};
	const applied = expected.slice(0, 2);

	it("refuses pending migrations on a hosted environment with no approval", () => {
		expect(() =>
			assertMigrationApproval({ actualRows: applied, expectedRows: expected, env: hosted, log: silent }),
		).toThrow("SELENA_MIGRATION_OWNER_APPROVAL_REQUIRED");
	});

	it("accepts an approval naming the commit being deployed, short form included", () => {
		for (const approval of ["c71bf0e", "C71BF0EBB2617411A18B5B0291D53FCF27AE8F09"]) {
			expect(
				assertMigrationApproval({
					actualRows: applied,
					expectedRows: expected,
					env: { ...hosted, [MIGRATION_APPROVAL_ENV]: approval },
					log: silent,
				}),
			).toEqual({ pending: 1, gated: true });
		}
	});

	// An approval left behind from the previous release must not carry over: the
	// next merge is a different commit, which is what makes the gate self-expiring.
	it("refuses an approval for some other commit", () => {
		expect(() =>
			assertMigrationApproval({
				actualRows: applied,
				expectedRows: expected,
				env: { ...hosted, [MIGRATION_APPROVAL_ENV]: "5d8eb47" },
				log: silent,
			}),
		).toThrow("SELENA_MIGRATION_OWNER_APPROVAL_REQUIRED");
	});

	it("refuses an approval too short to name one commit", () => {
		expect(() =>
			assertMigrationApproval({
				actualRows: applied,
				expectedRows: expected,
				env: { ...hosted, [MIGRATION_APPROVAL_ENV]: "c71" },
				log: silent,
			}),
		).toThrow("SELENA_MIGRATION_OWNER_APPROVAL_REQUIRED");
	});

	it("refuses when the deployed commit cannot be identified at all", () => {
		expect(() =>
			assertMigrationApproval({
				actualRows: applied,
				expectedRows: expected,
				env: { RAILWAY_ENVIRONMENT_NAME: "staging", [MIGRATION_APPROVAL_ENV]: "c71bf0e" },
				log: silent,
			}),
		).toThrow("SELENA_MIGRATION_SOURCE_SHA_UNKNOWN");
	});

	it("asks nothing when the deploy carries no new migrations", () => {
		expect(assertMigrationApproval({ actualRows: expected, expectedRows: expected, env: hosted, log: silent })).toEqual({
			pending: 0,
			gated: false,
		});
	});

	it("asks nothing of a database with no history to protect", () => {
		expect(assertMigrationApproval({ actualRows: null, expectedRows: expected, env: hosted, log: silent })).toEqual({
			pending: 3,
			gated: false,
		});
	});

	it("leaves a developer's own database alone", () => {
		expect(assertMigrationApproval({ actualRows: applied, expectedRows: expected, env: {}, log: silent })).toEqual({
			pending: 1,
			gated: false,
		});
	});
});

/**
 * What a mismatch has to tell whoever reads the deploy log: enough to pick a
 * repair without opening a database. The three shapes below need different
 * ones, so each has to be distinguishable from the message alone.
 */
describe("naming the row that disagrees", () => {
	const shipped = [
		{ hash: "aaaa000000000000", createdAt: "1787940011000", tag: "0049_first" },
		{ hash: "bbbb111111111111", createdAt: "1787940012000", tag: "0050_second" },
	];

	it("names the migration whose file changed after it was applied", () => {
		const applied = [shipped[0], { hash: "cccc222222222222", createdAt: "1787940012000" }];
		expect(() => assertJournalPrefix(applied, shipped)).toThrow(/0050_second/);
		expect(() => assertJournalPrefix(applied, shipped)).toThrow(/changed after it was applied/);
		expect(() => assertJournalPrefix(applied, shipped)).toThrow("SELENA_MIGRATION_JOURNAL_MISMATCH");
	});

	it("distinguishes a timestamp that slipped from a file that changed", () => {
		const applied = [shipped[0], { hash: "bbbb111111111111", createdAt: "1787940099000" }];
		expect(() => assertJournalPrefix(applied, shipped)).toThrow(/applied at 1787940099000/);
		expect(() => assertJournalPrefix(applied, shipped)).toThrow(/shipped journal says 1787940012000/);
	});

	it("says when the database holds a migration the release does not ship", () => {
		const applied = [...shipped, { hash: "dddd333333333333", createdAt: "1787940013000" }];
		expect(() => assertJournalPrefix(applied, shipped)).toThrow(/3 applied, 2 shipped/);
	});

	it("mentions the historical hashes a row is also allowed to carry", () => {
		const withAlias = [{ ...shipped[0], acceptedAppliedHashes: ["eeee444444444444"] }];
		const applied = [{ hash: "ffff555555555555", createdAt: "1787940011000" }];
		expect(() => assertJournalPrefix(applied, withAlias)).toThrow(/also accepts eeee44444444/);
	});

	it("still accepts a journal that matches", () => {
		expect(() => assertJournalPrefix(shipped, shipped)).not.toThrow();
	});
});
