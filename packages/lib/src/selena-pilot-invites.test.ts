import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { hashPilotInviteCode, redeemPilotInvite, type SqlExecutor } from "./selena-pilot-invites.js";

function recordingExecutor(planId: string | null): SqlExecutor & { statements: SQL[] } {
	const statements: SQL[] = [];
	return {
		statements,
		async execute(statement: SQL) {
			statements.push(statement);
			return { rows: [{ plan_id: planId }] };
		},
	};
}

/** Everything the statement carries to the driver, parameters included. */
function serialized(statement: SQL): string {
	return JSON.stringify(statement);
}

describe("pilot invite code hashing", () => {
	it("ignores the casing and padding a person types", () => {
		expect(hashPilotInviteCode(" avli-2026 ")).toBe(hashPilotInviteCode("AVLI-2026"));
	});

	it("produces a sha-256 digest, the shape the database constraint requires", () => {
		expect(hashPilotInviteCode("AVLI-2026")).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe("redeeming a seat", () => {
	it("returns the plan the seat was issued for", async () => {
		const executor = recordingExecutor("visitor-local");
		await expect(
			redeemPilotInvite(executor, {
				code: "AVLI-2026",
				planId: "visitor-local",
				organizationId: "org-1",
				userId: "user-1",
			}),
		).resolves.toEqual({ planId: "visitor-local" });
	});

	it("sends the digest and never the code the customer typed", async () => {
		const executor = recordingExecutor("visitor-local");
		await redeemPilotInvite(executor, {
			code: "AVLI-2026",
			planId: "visitor-local",
			organizationId: "org-1",
			userId: "user-1",
		});
		const bound = serialized(executor.statements[0]);
		expect(bound).toContain(hashPilotInviteCode("AVLI-2026"));
		expect(bound).not.toContain("AVLI-2026");
	});

	it("carries the requested plan so a seat cannot be spent on another one", async () => {
		const executor = recordingExecutor("visitor-local");
		await redeemPilotInvite(executor, {
			code: "AVLI-2026",
			planId: "full-ai-landscape",
			organizationId: "org-1",
			userId: "user-1",
		});
		expect(serialized(executor.statements[0])).toContain("full-ai-landscape");
	});

	it("reports no seat when the database claims none", async () => {
		const executor = recordingExecutor(null);
		await expect(
			redeemPilotInvite(executor, {
				code: "SPENT-CODE",
				planId: "visitor-local",
				organizationId: "org-1",
				userId: "user-1",
			}),
		).resolves.toBeNull();
	});

	it("does not query at all for an empty code", async () => {
		const executor = recordingExecutor("visitor-local");
		await expect(
			redeemPilotInvite(executor, { code: "   ", planId: "visitor-local", organizationId: "org-1", userId: "user-1" }),
		).resolves.toBeNull();
		expect(executor.statements).toHaveLength(0);
	});
});
