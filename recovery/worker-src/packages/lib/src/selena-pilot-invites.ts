import { createHash } from "node:crypto";
import { type SQL, sql } from "drizzle-orm";

/**
 * Redeeming one pilot seat.
 *
 * The plaintext code never leaves this module: it is hashed here, and only the
 * digest reaches the database, the query log and any error. What comes back is
 * the plan the operator bound to that seat — the caller must not take the plan
 * the customer asked for on trust, because that is the difference between a
 * Snapshot seat and a Landscape one.
 */

export type SqlExecutor = {
	execute(statement: SQL): Promise<{ rows?: unknown[] }>;
};

export interface PilotInviteRedemption {
	code: string;
	/** The plan the seat must have been issued for; a mismatch leaves it unclaimed. */
	planId: string;
	organizationId: string;
	userId: string;
}

export function hashPilotInviteCode(code: string): string {
	return createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

/**
 * Returns the plan bound to the seat, or null when the code is unknown,
 * expired, issued for another plan, or already held by someone else. They are
 * one answer on purpose: distinguishing them would let a caller probe which
 * codes exist.
 */
export async function redeemPilotInvite(
	executor: SqlExecutor,
	input: PilotInviteRedemption,
): Promise<{ planId: string } | null> {
	if (input.code.trim().length === 0) return null;
	const result = await executor.execute(
		sql`SELECT public.sv_redeem_pilot_invite(
			${hashPilotInviteCode(input.code)}::text,
			${input.planId}::text,
			${input.organizationId}::text,
			${input.userId}::text
		) AS plan_id`,
	);
	const planId = (result.rows?.[0] as { plan_id?: unknown } | undefined)?.plan_id;
	return typeof planId === "string" && planId.length > 0 ? { planId } : null;
}
