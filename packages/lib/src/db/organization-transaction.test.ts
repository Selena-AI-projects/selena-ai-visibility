import type { SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { type OrganizationTransaction, withOrganizationTransaction } from "./organization-transaction";
import type * as schema from "./schema";

describe("withOrganizationTransaction", () => {
	it("sets a parameterized transaction-local tenant before running work", async () => {
		const statements: unknown[] = [];
		const execute = vi.fn(async (statement: unknown) => {
			statements.push(statement);
		});
		const tx = { execute };
		const transaction = vi.fn(async (work: (runner: typeof tx) => Promise<unknown>) => work(tx));
		const db = { transaction } as unknown as NodePgDatabase<typeof schema>;
		const callback = vi.fn(async (runner: OrganizationTransaction) => {
			expect(runner).toBe(tx);
			return "result";
		});

		await expect(withOrganizationTransaction(db, "tenant-1', false)--", callback)).resolves.toBe("result");
		expect(transaction).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledTimes(1);
		const statement = statements[0] as SQL;
		const query = new PgDialect().sqlToQuery(statement);
		expect(query.sql).toBe("select set_config('app.organization_id', $1, true)");
		expect(query.params).toEqual(["tenant-1', false)--"]);
	});

	it("rejects an empty tenant before opening a transaction", async () => {
		const transaction = vi.fn();
		const db = { transaction } as unknown as NodePgDatabase<typeof schema>;

		await expect(withOrganizationTransaction(db, "  ", async () => undefined)).rejects.toThrow(
			"ORGANIZATION_TRANSACTION_ID_REQUIRED",
		);
		expect(transaction).not.toHaveBeenCalled();
	});
});
