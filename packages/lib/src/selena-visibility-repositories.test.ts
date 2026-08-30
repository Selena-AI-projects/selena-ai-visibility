import type { SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import * as schema from "./db/schema";
import { createSelenaRepositories, type SelenaRepositoryContext } from "./selena-visibility-repositories";

const context: SelenaRepositoryContext = {
	actorId: "actor-1",
	tenantId: "tenant-1",
	role: "owner",
	authType: "session",
	permissions: ["client:write"],
};

const input = {
	projectId: "11111111-1111-4111-8111-111111111111",
	snapshot: { measurementScope: {} },
	engineSha: "engine-1",
	expectedRuns: 1,
	budgetCap: "0",
};

function allocationDb(options: { latest?: number; projectOwned?: boolean; insertWins?: boolean } = {}) {
	const inserted: Record<string, unknown>[] = [];
	const conflictTargets: unknown[][] = [];
	const events: string[] = [];
	const execute = vi.fn(async (_statement: unknown) => {
		events.push("advisory-lock");
	});
	let selectCall = 0;
	const tx = {
		execute,
		select: vi.fn(() => {
			selectCall += 1;
			if (selectCall === 1) {
				const projectQuery = {
					from: () => projectQuery,
					where: () => projectQuery,
					limit: async () => {
						events.push("project-check");
						return options.projectOwned === false ? [] : [{ id: input.projectId }];
					},
				};
				return projectQuery;
			}
			const versionQuery = {
				from: () => versionQuery,
				where: async () => {
					events.push("read-version");
					return [{ version: options.latest ?? 0 }];
				},
			};
			return versionQuery;
		}),
		insert: vi.fn(() => {
			let row: Record<string, unknown> = {};
			const insertQuery = {
				values: (value: Record<string, unknown>) => {
					events.push("insert");
					row = value;
					inserted.push(value);
					return insertQuery;
				},
				onConflictDoNothing: (options: { target: unknown[] }) => {
					conflictTargets.push(options.target);
					return insertQuery;
				},
				returning: async () => (options.insertWins === false ? [] : [{ id: "lock-1", createdAt: new Date(0), ...row }]),
			};
			return insertQuery;
		}),
	};
	const transaction = vi.fn(async (work: (runner: typeof tx) => Promise<unknown>) => work(tx));
	const db = { transaction } as unknown as NodePgDatabase<typeof schema>;
	return { db, execute, events, inserted, conflictTargets, transaction };
}

describe("configuration lock allocation", () => {
	it("allocates max plus one under one transaction and accepts the matching expected version", async () => {
		const fake = allocationDb({ latest: 4 });
		const lock = await createSelenaRepositories(fake.db).locks.allocate(context, {
			...input,
			expectedVersion: 5,
		});

		expect(fake.transaction).toHaveBeenCalledTimes(1);
		expect(fake.execute).toHaveBeenCalledTimes(1);
		expect(fake.events).toEqual(["project-check", "advisory-lock", "read-version", "insert"]);
		const statement = fake.execute.mock.calls[0]?.[0];
		expect(statement && new PgDialect().sqlToQuery(statement as SQL).sql).toContain("pg_advisory_xact_lock");
		expect(lock.version).toBe(5);
		expect(fake.inserted).toEqual([
			expect.objectContaining({
				projectId: input.projectId,
				organizationId: context.tenantId,
				createdBy: context.actorId,
				version: 5,
			}),
		]);
		expect(fake.inserted[0]).not.toHaveProperty("expectedVersion");
		expect(fake.conflictTargets[0]).toEqual([
			schema.svConfigurationLocks.projectId,
			schema.svConfigurationLocks.version,
		]);
	});

	it("rejects a stale expected version without inserting or retrying", async () => {
		const fake = allocationDb({ latest: 4 });
		await expect(
			createSelenaRepositories(fake.db).locks.allocate(context, { ...input, expectedVersion: 4 }),
		).rejects.toThrow("SELENA_CONFIGURATION_LOCK_VERSION_CONFLICT");

		expect(fake.transaction).toHaveBeenCalledTimes(1);
		expect(fake.inserted).toHaveLength(0);
	});

	it("fails closed when the int4 version space is exhausted", async () => {
		const fake = allocationDb({ latest: 2_147_483_647 });
		await expect(createSelenaRepositories(fake.db).locks.allocate(context, input)).rejects.toThrow(
			"SELENA_CONFIGURATION_LOCK_VERSION_EXHAUSTED",
		);
		expect(fake.inserted).toHaveLength(0);
	});

	it("turns an unexpected unique loser into a stable conflict without retrying", async () => {
		const fake = allocationDb({ latest: 1, insertWins: false });
		await expect(createSelenaRepositories(fake.db).locks.allocate(context, input)).rejects.toThrow(
			"SELENA_CONFIGURATION_LOCK_VERSION_CONFLICT",
		);
		expect(fake.transaction).toHaveBeenCalledTimes(1);
		expect(fake.inserted).toHaveLength(1);
	});

	it("checks project tenancy inside the transaction before reading or inserting locks", async () => {
		const fake = allocationDb({ projectOwned: false });
		await expect(createSelenaRepositories(fake.db).locks.allocate(context, input)).rejects.toThrow(
			"Not found: project is outside AuthContext tenant",
		);
		expect(fake.transaction).toHaveBeenCalledTimes(1);
		expect(fake.inserted).toHaveLength(0);
	});
});
