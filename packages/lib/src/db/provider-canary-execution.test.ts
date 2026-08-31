import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";
import { reserveGoogleAiModeCanaryExecution } from "./provider-canary-execution";
import type * as schema from "./schema";

function databaseReturning(rows: { id: string }[]) {
	const returning = vi.fn(async () => rows);
	const onConflictDoNothing = vi.fn(() => ({ returning }));
	const values = vi.fn(() => ({ onConflictDoNothing }));
	const insert = vi.fn(() => ({ values }));
	const execute = vi.fn(async () => undefined);
	const transaction = vi.fn(
		async (work: (tx: { execute: typeof execute; insert: typeof insert }) => Promise<unknown>) =>
			work({ execute, insert }),
	);
	return {
		db: { transaction } as unknown as NodePgDatabase<typeof schema>,
		spies: { transaction, insert, values, onConflictDoNothing, returning },
	};
}

describe("reserveGoogleAiModeCanaryExecution", () => {
	it("commits the fixed one-shot contract and returns its reservation", async () => {
		const { db, spies } = databaseReturning([{ id: "reservation-1" }]);
		await expect(
			reserveGoogleAiModeCanaryExecution(db, {
				organizationId: "tenant-1",
				executionIdentity: "release-0e00df4f-google-ai-mode-owner-canary-1",
			}),
		).resolves.toEqual({
			status: "RESERVED",
			reservationId: "reservation-1",
			approvedCapUsd: 0.25,
			remainingAuthorizedUsd: 0.25,
		});
		expect(spies.transaction).toHaveBeenCalledTimes(1);
		expect(spies.values).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "tenant-1",
				source: "GOOGLE_AI_MODE",
				approvedCapUsd: "0.250000",
				recurring: false,
				automaticRetries: 0,
				costStatus: "UNKNOWN",
			}),
		);
		expect(spies.onConflictDoNothing).toHaveBeenCalledTimes(1);
	});

	it("fails closed when the execution identity was reserved before", async () => {
		const { db } = databaseReturning([]);
		await expect(
			reserveGoogleAiModeCanaryExecution(db, {
				organizationId: "tenant-1",
				executionIdentity: "release-0e00df4f-google-ai-mode-owner-canary-1",
			}),
		).resolves.toEqual({ status: "ALREADY_RESERVED" });
	});

	it("rejects malformed identities before opening a transaction", async () => {
		const { db, spies } = databaseReturning([]);
		await expect(
			reserveGoogleAiModeCanaryExecution(db, { organizationId: "tenant-1", executionIdentity: " short " }),
		).rejects.toThrow("PROVIDER_CANARY_EXECUTION_IDENTITY_INVALID");
		expect(spies.transaction).not.toHaveBeenCalled();
	});
});
