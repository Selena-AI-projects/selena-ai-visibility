import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { formatMemberLookup, lookupMember } from "./selena-member-lookup";

function executorAnswering(...answers: unknown[][]) {
	const statements: SQL[] = [];
	return {
		statements,
		execute: async (statement: SQL) => {
			statements.push(statement);
			return { rows: answers[statements.length - 1] ?? [] };
		},
	};
}

describe("member lookup", () => {
	it("prints the user id and every workspace with its role, behind a masked address", async () => {
		const executor = executorAnswering(
			[{ id: "user-1" }],
			[{ organization_id: "org-1", organization_name: "Selena test studio", role: "owner" }],
		);
		const lookup = await lookupMember(executor, " Operator.One@Example.com ");
		expect(formatMemberLookup(lookup)).toEqual([
			"find-member: O***@Example.com user id user-1, 1 workspace(s)",
			'  workspace org-1 "Selena test studio" role owner',
		]);
	});

	it("refuses an unknown or ambiguous address without reading memberships", async () => {
		const missing = executorAnswering([]);
		await expect(lookupMember(missing, "nobody@example.com")).rejects.toThrow(/^SELENA_OWNER_ADMIN_NOT_FOUND/);
		expect(missing.statements).toHaveLength(1);
		const twice = executorAnswering([{ id: "a" }, { id: "b" }]);
		await expect(lookupMember(twice, "two@example.com")).rejects.toThrow(/^SELENA_OWNER_ADMIN_AMBIGUOUS/);
	});
});
