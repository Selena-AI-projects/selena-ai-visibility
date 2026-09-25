import { type SQL, sql } from "drizzle-orm";

export type JournalClaimRecoveryDecision = "COMPLETED" | "ABANDONED" | "HOLD" | "BUSY";

export type JournalHoldReconciliationReceipt = {
	decision: "RECONCILED" | "ALREADY_RECONCILED";
	claimId: string;
	cycleId: string;
	revokedPermitCount: number;
	settledRunCount: number;
	costEventCount: number;
	unmatchedCostEventCount: number;
	providerCallUpperBound: number;
	observedCostUsd: string;
	historicalExposureCapUsd: string;
	providerCalls: 0 | null;
	providerCallsStatus: "PROVEN_ZERO" | "UNKNOWN_WITHIN_UPPER_BOUND";
	recurring: false;
	/** Present only on the executor-settled sibling; 0060's receipt has no shape field. */
	settlementShape?: "EXECUTOR_SETTLED";
};

type SqlExecutor = {
	execute(statement: SQL): Promise<{ rows?: unknown[] }>;
};

const decisions = new Set<JournalClaimRecoveryDecision>(["COMPLETED", "ABANDONED", "HOLD", "BUSY"]);

/**
 * Ask PostgreSQL to recover one claim while its tenant policy, advisory lock,
 * row lock, run ledger, permit ledger, cost ledger and boundary receipts are
 * observed in one transaction. This module has no provider imports.
 */
export async function recoverJournalDailyClaim(
	executor: SqlExecutor,
	input: Readonly<{ claimId: string; actorId: string }>,
): Promise<JournalClaimRecoveryDecision> {
	const result = await executor.execute(
		sql`SELECT public.sv_recover_journal_daily_claim(${input.claimId}::uuid, ${input.actorId}::text) AS decision`,
	);
	const decision = (result.rows?.[0] as { decision?: unknown } | undefined)?.decision;
	if (typeof decision !== "string" || !decisions.has(decision as JournalClaimRecoveryDecision)) {
		throw new Error("SELENA_JOURNAL_RECOVERY_DECISION_INVALID");
	}
	return decision as JournalClaimRecoveryDecision;
}

/**
 * Quarantine an operator-reviewed HOLD without deleting or pretending that its
 * pre-transport boundary proved a provider outcome. PostgreSQL admits this
 * function only for the table owner and returns the committed counts.
 */
export async function reconcileJournalHold(
	executor: SqlExecutor,
	input: Readonly<{
		claimId: string;
		actorId: string;
		ownerDecisionRef: string;
		runtimeQuiesced: true;
		ambiguousSpendAcknowledged: true;
	}>,
): Promise<JournalHoldReconciliationReceipt> {
	const result = await executor.execute(
		sql`SELECT public.sv_reconcile_journal_hold(
			${input.claimId}::uuid,
			${input.actorId}::text,
			${input.ownerDecisionRef}::text,
			${input.runtimeQuiesced}::boolean,
			${input.ambiguousSpendAcknowledged}::boolean
		) AS receipt`,
	);
	const receipt = (result.rows?.[0] as { receipt?: unknown } | undefined)?.receipt;
	if (!isJournalHoldReconciliationReceipt(receipt)) {
		throw new Error("SELENA_JOURNAL_HOLD_RECONCILIATION_RECEIPT_INVALID");
	}
	return receipt;
}

/**
 * The sibling of reconcileJournalHold for a claim whose runs the executor
 * already closed. The reconciler settles nothing there — it only releases the
 * claim — so the receipt names its shape and the reader insists on it: a
 * 0060 receipt answering this call would mean the wrong function ran.
 */
export async function reconcileJournalExecutorSettledClaim(
	executor: SqlExecutor,
	input: Readonly<{
		claimId: string;
		actorId: string;
		ownerDecisionRef: string;
		runtimeQuiesced: true;
		ambiguousSpendAcknowledged: true;
	}>,
): Promise<JournalHoldReconciliationReceipt & { settlementShape: "EXECUTOR_SETTLED" }> {
	const result = await executor.execute(
		sql`SELECT public.sv_reconcile_journal_executor_settled(
			${input.claimId}::uuid,
			${input.actorId}::text,
			${input.ownerDecisionRef}::text,
			${input.runtimeQuiesced}::boolean,
			${input.ambiguousSpendAcknowledged}::boolean
		) AS receipt`,
	);
	const receipt = (result.rows?.[0] as { receipt?: unknown } | undefined)?.receipt;
	if (!isJournalHoldReconciliationReceipt(receipt) || receipt.settlementShape !== "EXECUTOR_SETTLED") {
		throw new Error("SELENA_JOURNAL_EXECUTOR_SETTLED_RECEIPT_INVALID");
	}
	return receipt as JournalHoldReconciliationReceipt & { settlementShape: "EXECUTOR_SETTLED" };
}

function isJournalHoldReconciliationReceipt(value: unknown): value is JournalHoldReconciliationReceipt {
	if (!value || typeof value !== "object") return false;
	const receipt = value as Record<string, unknown>;
	return (
		(receipt.decision === "RECONCILED" || receipt.decision === "ALREADY_RECONCILED") &&
		typeof receipt.claimId === "string" &&
		typeof receipt.cycleId === "string" &&
		typeof receipt.revokedPermitCount === "number" &&
		Number.isInteger(receipt.revokedPermitCount) &&
		typeof receipt.settledRunCount === "number" &&
		Number.isInteger(receipt.settledRunCount) &&
		typeof receipt.costEventCount === "number" &&
		Number.isInteger(receipt.costEventCount) &&
		receipt.costEventCount >= 0 &&
		typeof receipt.unmatchedCostEventCount === "number" &&
		Number.isInteger(receipt.unmatchedCostEventCount) &&
		receipt.unmatchedCostEventCount >= 0 &&
		receipt.unmatchedCostEventCount <= receipt.costEventCount &&
		typeof receipt.providerCallUpperBound === "number" &&
		Number.isInteger(receipt.providerCallUpperBound) &&
		typeof receipt.observedCostUsd === "string" &&
		typeof receipt.historicalExposureCapUsd === "string" &&
		(receipt.providerCalls === 0 || receipt.providerCalls === null) &&
		(receipt.providerCallsStatus === "PROVEN_ZERO" || receipt.providerCallsStatus === "UNKNOWN_WITHIN_UPPER_BOUND") &&
		((receipt.providerCallsStatus === "PROVEN_ZERO" &&
			receipt.providerCalls === 0 &&
			receipt.providerCallUpperBound === 0 &&
			receipt.costEventCount === 0 &&
			receipt.unmatchedCostEventCount === 0) ||
			(receipt.providerCallsStatus === "UNKNOWN_WITHIN_UPPER_BOUND" &&
				receipt.providerCalls === null &&
				receipt.providerCallUpperBound > 0 &&
				receipt.providerCallUpperBound >= receipt.unmatchedCostEventCount)) &&
		receipt.recurring === false
	);
}
