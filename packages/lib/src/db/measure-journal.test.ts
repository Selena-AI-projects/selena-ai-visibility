import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import {
	reconcileJournalExecutorSettledClaim,
	reconcileJournalHold,
	recoverJournalDailyClaim,
} from "./measure-journal";

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

describe("journal HOLD owner reconciliation client", () => {
	const receipt = {
		decision: "RECONCILED" as const,
		claimId: "11111111-1111-4111-8111-111111111111",
		cycleId: "22222222-2222-4222-8222-222222222222",
		revokedPermitCount: 71,
		settledRunCount: 4,
		costEventCount: 0,
		unmatchedCostEventCount: 0,
		providerCallUpperBound: 4,
		observedCostUsd: "0.000000",
		historicalExposureCapUsd: "0.500000",
		providerCalls: null,
		providerCallsStatus: "UNKNOWN_WITHIN_UPPER_BOUND" as const,
		recurring: false as const,
	};

	it("passes the exact owner decision and returns the database receipt", async () => {
		const execute = vi.fn(async (statement: SQL) => {
			const query = new PgDialect().sqlToQuery(statement);
			expect(query.sql).toContain("sv_reconcile_journal_hold");
			expect(query.params).toEqual([
				receipt.claimId,
				"selena-owner-reconciler",
				"owner-decision-2026-09-02-avli-budget-10",
				true,
				true,
			]);
			return { rows: [{ receipt }] };
		});

		await expect(
			reconcileJournalHold(
				{ execute },
				{
					claimId: receipt.claimId,
					actorId: "selena-owner-reconciler",
					ownerDecisionRef: "owner-decision-2026-09-02-avli-budget-10",
					runtimeQuiesced: true,
					ambiguousSpendAcknowledged: true,
				},
			),
		).resolves.toEqual(receipt);
		expect(execute).toHaveBeenCalledOnce();
	});

	it("fails closed on malformed or provider-capable receipts", async () => {
		for (const badReceipt of [
			undefined,
			{ ...receipt, providerCalls: 0 },
			{ ...receipt, providerCallsStatus: "PROVEN_ZERO" },
			{ ...receipt, costEventCount: -1 },
			{ ...receipt, costEventCount: 0, unmatchedCostEventCount: 1 },
			{ ...receipt, providerCallUpperBound: 0 },
			{ ...receipt, decision: "REISSUE" },
		]) {
			await expect(
				reconcileJournalHold(
					{ execute: vi.fn(async () => ({ rows: [{ receipt: badReceipt }] })) },
					{
						claimId: receipt.claimId,
						actorId: "selena-owner-reconciler",
						ownerDecisionRef: "owner-decision-2026-09-02-avli-budget-10",
						runtimeQuiesced: true,
						ambiguousSpendAcknowledged: true,
					},
				),
			).rejects.toThrow("SELENA_JOURNAL_HOLD_RECONCILIATION_RECEIPT_INVALID");
		}
	});
});

describe("journal executor-settled owner reconciliation client", () => {
	const receipt = {
		decision: "RECONCILED" as const,
		settlementShape: "EXECUTOR_SETTLED" as const,
		claimId: "33333333-3333-4333-8333-333333333333",
		cycleId: "63e3103d-4d41-4716-ba86-9dd786ef0b1c",
		revokedPermitCount: 0,
		settledRunCount: 25,
		costEventCount: 6,
		unmatchedCostEventCount: 0,
		providerCallUpperBound: 25,
		observedCostUsd: "0.060000",
		historicalExposureCapUsd: "0.500000",
		providerCalls: null,
		providerCallsStatus: "UNKNOWN_WITHIN_UPPER_BOUND" as const,
		recurring: false as const,
	};
	const input = {
		claimId: receipt.claimId,
		actorId: "selena-owner-reconciler",
		ownerDecisionRef: "owner-decision-2026-09-07-korafoodhall-oxylabs-canary-attempt-1",
		runtimeQuiesced: true as const,
		ambiguousSpendAcknowledged: true as const,
	};

	it("calls the executor-settled function with the exact owner decision and returns its receipt", async () => {
		const execute = vi.fn(async (statement: SQL) => {
			const query = new PgDialect().sqlToQuery(statement);
			expect(query.sql).toContain("sv_reconcile_journal_executor_settled");
			expect(query.params).toEqual([input.claimId, input.actorId, input.ownerDecisionRef, true, true]);
			return { rows: [{ receipt }] };
		});
		await expect(reconcileJournalExecutorSettledClaim({ execute }, input)).resolves.toEqual(receipt);
		expect(execute).toHaveBeenCalledOnce();
	});

	it("refuses a receipt of the other shape, so the wrong function cannot answer this call", async () => {
		const { settlementShape: _shape, ...holdShaped } = receipt;
		for (const badReceipt of [
			undefined,
			holdShaped,
			{ ...receipt, settlementShape: "INTERRUPTED" },
			{ ...receipt, providerCalls: 0 },
		]) {
			await expect(
				reconcileJournalExecutorSettledClaim(
					{ execute: vi.fn(async () => ({ rows: [{ receipt: badReceipt }] })) },
					input,
				),
			).rejects.toThrow("SELENA_JOURNAL_EXECUTOR_SETTLED_RECEIPT_INVALID");
		}
	});
});
