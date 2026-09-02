import { type SQL, sql } from "drizzle-orm";

export type JournalClaimRecoveryDecision = "COMPLETED" | "ABANDONED" | "HOLD" | "BUSY";

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
