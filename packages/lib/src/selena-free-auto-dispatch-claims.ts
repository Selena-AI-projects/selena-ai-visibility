import { sql } from "drizzle-orm";
import type { SqlExecutor } from "./selena-pilot-invites";

/**
 * Taking one of the day's free auto-dispatch slots.
 *
 * The two caps span every tenant, and the runtime role cannot count other
 * tenants' rows under RLS, so the count and the decision live in one database
 * function behind a lock. What comes back is the decision, never the counts:
 * a caller that could read how many slots are left could also plan around
 * them.
 */

export const freeAutoDispatchClaimOutcomes = ["CLAIMED", "DAILY_CAP", "PROJECT_CAP"] as const;
export type FreeAutoDispatchClaimOutcome = (typeof freeAutoDispatchClaimOutcomes)[number];

export interface FreeAutoDispatchClaimInput {
	requestId: string;
	organizationId: string;
	projectId: string;
	maxPerDay: number;
	maxPerProjectPerDay: number;
}

function isClaimOutcome(value: unknown): value is FreeAutoDispatchClaimOutcome {
	return typeof value === "string" && (freeAutoDispatchClaimOutcomes as readonly string[]).includes(value);
}

export async function claimFreeAutoDispatch(
	executor: SqlExecutor,
	input: FreeAutoDispatchClaimInput,
): Promise<FreeAutoDispatchClaimOutcome> {
	const result = await executor.execute(
		sql`SELECT public.sv_claim_free_auto_dispatch(
			${input.requestId}::uuid,
			${input.organizationId}::text,
			${input.projectId}::uuid,
			${input.maxPerDay}::integer,
			${input.maxPerProjectPerDay}::integer
		) AS outcome`,
	);
	const outcome = (result.rows?.[0] as { outcome?: unknown } | undefined)?.outcome;
	// An answer this module does not know is not a slot: a caller that treated
	// it as one would dispatch outside the caps the function exists to hold.
	if (!isClaimOutcome(outcome)) throw new Error("FREE_AUTO_DISPATCH_CLAIM_UNREADABLE");
	return outcome;
}

/** Gives a slot back; true when this tenant held one for the request. */
export async function releaseFreeAutoDispatchClaim(
	executor: SqlExecutor,
	input: { requestId: string; organizationId: string },
): Promise<boolean> {
	const result = await executor.execute(
		sql`SELECT public.sv_release_free_auto_dispatch(
			${input.requestId}::uuid,
			${input.organizationId}::text
		) AS released`,
	);
	return (result.rows?.[0] as { released?: unknown } | undefined)?.released === true;
}
