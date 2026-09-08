import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { claimFreeAutoDispatch, releaseFreeAutoDispatchClaim } from "./selena-free-auto-dispatch-claims";

const input = {
	requestId: "5e1f0c0e-9c9a-4d0a-9c0e-2b8f6d3f1a11",
	organizationId: "org-1",
	projectId: "0b7b6e4a-3a5c-4d2f-8e1a-6c9d2f0b5a22",
	maxPerDay: 3,
	maxPerProjectPerDay: 1,
};

/** An executor that records the statement it was handed and answers with fixed rows. */
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

function textOf(statement: SQL): string {
	return statement.queryChunks
		.map((chunk) => (typeof chunk === "object" && chunk !== null && "value" in chunk ? String(chunk.value) : ""))
		.join("");
}

describe("free auto-dispatch claims", () => {
	it("asks the database for the slot and hands back exactly its decision", async () => {
		for (const outcome of ["CLAIMED", "DAILY_CAP", "PROJECT_CAP"] as const) {
			const executor = executorAnswering([{ outcome }]);
			await expect(claimFreeAutoDispatch(executor, input)).resolves.toBe(outcome);
			expect(executor.statements).toHaveLength(1);
			expect(textOf(executor.statements[0] as SQL)).toContain("sv_claim_free_auto_dispatch");
		}
	});

	it("refuses to read an unknown answer as a slot", async () => {
		await expect(claimFreeAutoDispatch(executorAnswering([{ outcome: "MAYBE" }]), input)).rejects.toThrow(
			"FREE_AUTO_DISPATCH_CLAIM_UNREADABLE",
		);
		await expect(claimFreeAutoDispatch(executorAnswering([]), input)).rejects.toThrow(
			"FREE_AUTO_DISPATCH_CLAIM_UNREADABLE",
		);
	});

	it("reports whether a slot was given back", async () => {
		const released = executorAnswering([{ released: true }]);
		await expect(
			releaseFreeAutoDispatchClaim(released, { requestId: input.requestId, organizationId: input.organizationId }),
		).resolves.toBe(true);
		expect(textOf(released.statements[0] as SQL)).toContain("sv_release_free_auto_dispatch");
		await expect(
			releaseFreeAutoDispatchClaim(executorAnswering([{ released: false }]), {
				requestId: input.requestId,
				organizationId: input.organizationId,
			}),
		).resolves.toBe(false);
	});
});
