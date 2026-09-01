import type { SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { resolveSelenaApiKeyBootstrap } from "./api-key-bootstrap";
import type * as schema from "./schema";

describe("resolveSelenaApiKeyBootstrap", () => {
	it("passes the digest as a parameter and exposes only authentication context", async () => {
		const statements: unknown[] = [];
		const execute = vi.fn(async (statement: unknown) => {
			statements.push(statement);
			return {
				rows: [
					{
						api_key_id: "11111111-1111-4111-8111-111111111111",
						organization_id: "tenant-1",
						permissions: ["client:read"],
						ignored_column: "not projected",
					},
				],
			};
		});
		const db = { execute } as unknown as NodePgDatabase<typeof schema>;

		await expect(resolveSelenaApiKeyBootstrap(db, "digest') OR true--")).resolves.toEqual({
			apiKeyId: "11111111-1111-4111-8111-111111111111",
			organizationId: "tenant-1",
			permissions: ["client:read"],
		});
		const statement = statements[0] as SQL;
		const query = new PgDialect().sqlToQuery(statement);
		expect(query.sql).toContain("FROM public.sv_resolve_api_key_context($1)");
		expect(query.params).toEqual(["digest') OR true--"]);
	});

	it("returns null when the database function finds no active key", async () => {
		const db = { execute: vi.fn(async () => ({ rows: [] })) } as unknown as NodePgDatabase<typeof schema>;
		await expect(resolveSelenaApiKeyBootstrap(db, "missing")).resolves.toBeNull();
	});
});
