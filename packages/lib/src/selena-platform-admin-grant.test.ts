import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { formatPlatformAdminGrant, grantPlatformAdmin, maskEmail } from "./selena-platform-admin-grant";

const EMAIL = "Operator.One@Example.com";

function executorAnswering(rows: unknown[]) {
	const statements: SQL[] = [];
	return {
		statements,
		execute: async (statement: SQL) => {
			statements.push(statement);
			return { rows };
		},
	};
}

function paramsOf(statement: SQL): string[] {
	return statement.queryChunks
		.filter((chunk): chunk is string | number => typeof chunk === "string" || typeof chunk === "number")
		.map(String);
}

describe("platform admin grant", () => {
	it("grants exactly one matching account and reports it with a masked address", async () => {
		const executor = executorAnswering([{ matched: 1, granted: 1 }]);
		const grant = await grantPlatformAdmin(executor, ` ${EMAIL} `);
		expect(grant).toEqual({ updated: 1, maskedEmail: "O***@Example.com" });
		expect(formatPlatformAdminGrant(grant)).toEqual(["grant-platform-admin: updated 1 user (O***@Example.com)"]);
		expect(executor.statements).toHaveLength(1);
		expect(paramsOf(executor.statements[0])).toContain(EMAIL);
	});

	it("refuses an address no account answers to", async () => {
		const executor = executorAnswering([{ matched: 0, granted: 0 }]);
		await expect(grantPlatformAdmin(executor, EMAIL)).rejects.toThrow(/^SELENA_OWNER_ADMIN_NOT_FOUND/);
	});

	it("refuses an address two accounts answer to, so nobody is granted by accident", async () => {
		const executor = executorAnswering([{ matched: "2", granted: "0" }]);
		await expect(grantPlatformAdmin(executor, EMAIL)).rejects.toThrow(/^SELENA_OWNER_ADMIN_AMBIGUOUS/);
	});

	it("refuses to report a match the update did not reach as a grant", async () => {
		const executor = executorAnswering([{ matched: 1, granted: 0 }]);
		await expect(grantPlatformAdmin(executor, EMAIL)).rejects.toThrow(/^SELENA_OWNER_ADMIN_NOT_GRANTED/);
	});

	it("never puts the full address in a message", async () => {
		for (const rows of [[{ matched: 0, granted: 0 }], [{ matched: 2, granted: 0 }], [{ matched: 1, granted: 0 }]]) {
			const error = await grantPlatformAdmin(executorAnswering(rows), EMAIL).catch((reason: unknown) => reason);
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).not.toContain(EMAIL);
			expect((error as Error).message).not.toContain("Operator.One");
		}
		expect(formatPlatformAdminGrant({ updated: 1, maskedEmail: maskEmail(EMAIL) }).join("\n")).not.toContain(
			"Operator.One",
		);
	});

	it("refuses to query for something that is not an address", async () => {
		const executor = executorAnswering([{ matched: 1, granted: 1 }]);
		await expect(grantPlatformAdmin(executor, "  ")).rejects.toThrow("SELENA_OWNER_ADMIN_EMAIL_INVALID");
		await expect(grantPlatformAdmin(executor, "operator")).rejects.toThrow("SELENA_OWNER_ADMIN_EMAIL_INVALID");
		expect(executor.statements).toHaveLength(0);
	});
});
