import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { recoverJournalDailyClaim } from "./measure-journal";

describe("journal claim recovery client", () => {
	it.each(["COMPLETED", "ABANDONED", "HOLD", "BUSY"] as const)(
		"returns the database-enforced %s decision without provider work",
		async (decision) => {
			const execute = vi.fn(async (statement: SQL) => {
				const query = new PgDialect().sqlToQuery(statement);
				expect(query.sql).toContain("sv_recover_journal_daily_claim");
				expect(query.params).toEqual(["11111111-1111-4111-8111-111111111111", "selena-measure-journal"]);
				return { rows: [{ decision }] };
			});

			await expect(
				recoverJournalDailyClaim(
					{ execute },
					{
						claimId: "11111111-1111-4111-8111-111111111111",
						actorId: "selena-measure-journal",
					},
				),
			).resolves.toBe(decision);
			expect(execute).toHaveBeenCalledOnce();
		},
	);

	it("fails closed on an unknown or missing database decision", async () => {
		for (const rows of [[], [{ decision: "REISSUE" }]]) {
			await expect(
				recoverJournalDailyClaim(
					{ execute: vi.fn(async () => ({ rows })) },
					{
						claimId: "11111111-1111-4111-8111-111111111111",
						actorId: "selena-measure-journal",
					},
				),
			).rejects.toThrow("SELENA_JOURNAL_RECOVERY_DECISION_INVALID");
		}
	});
});
