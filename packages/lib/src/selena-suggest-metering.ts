import { sql } from "drizzle-orm";
import {
	assertProviderSpendReserved,
	releaseProviderSpend,
	settleProviderSpend,
	type SpendReceipt,
	type SqlExecutor,
} from "./selena-provider-spend";

/**
 * What the onboarding suggestion is allowed to spend.
 *
 * The deployment-wide ceiling could not be enforced by a tenant-scoped count
 * followed by an enqueue — concurrent requests race, and a per-tenant count
 * silently weakens a global limit — so this path stayed closed. It now rides on
 * one atomic reservation that owns the cap, and the cap lives in the database
 * rather than in this process's environment.
 */

export const SUGGEST_SPEND_SCOPE = "suggest";

/**
 * Deliberately coarse, like usage/cost.ts: what one profile suggestion is
 * booked at until real invoices retune it. The ledger row says estimated.
 */
export const SUGGEST_ESTIMATED_COST_USD = 0.05;

export interface SuggestSpendRequest {
	organizationId: string;
	/** One suggestion, one key — a retried job reuses its own reservation. */
	requestKey: string;
}

/**
 * Holds budget before the model is called. Throws when the scope has no budget
 * configured or the ceiling would be crossed, so a refusal stops the work.
 */
export async function reserveSuggestSpend(
	dbc: SqlExecutor,
	request: SuggestSpendRequest,
	estimatedUsd: number = SUGGEST_ESTIMATED_COST_USD,
): Promise<SpendReceipt> {
	return assertProviderSpendReserved(dbc, {
		scope: SUGGEST_SPEND_SCOPE,
		organizationId: request.organizationId,
		requestKey: request.requestKey,
		estimatedUsd,
	});
}

/** Books what the suggestion actually cost against its own reservation. */
export async function settleSuggestSpend(
	dbc: SqlExecutor,
	request: SuggestSpendRequest,
	actualUsd: number = SUGGEST_ESTIMATED_COST_USD,
): Promise<SpendReceipt> {
	return settleProviderSpend(dbc, {
		scope: SUGGEST_SPEND_SCOPE,
		organizationId: request.organizationId,
		requestKey: request.requestKey,
		actualUsd,
	});
}

/** Returns budget held for a suggestion that never reached the provider. */
export async function releaseSuggestSpend(dbc: SqlExecutor, request: SuggestSpendRequest): Promise<SpendReceipt> {
	return releaseProviderSpend(dbc, {
		scope: SUGGEST_SPEND_SCOPE,
		organizationId: request.organizationId,
		requestKey: request.requestKey,
	});
}

/**
 * The accounting row that accompanies a settled reservation.
 *
 * The reservation is what enforces the ceiling; this is what the cost reports
 * read. It is written separately and best-effort, because a suggestion that
 * already cost money must not be undone by a bookkeeping failure.
 */
export async function bookSuggestCostEvent(
	dbc: SqlExecutor,
	value: { organizationId: string; provider: string; amountUsd?: number },
): Promise<void> {
	await dbc.execute(sql`
		INSERT INTO sv_cost_events (organization_id, provider, amount_usd, basis, kind)
		VALUES (
			${value.organizationId},
			${value.provider},
			${value.amountUsd ?? SUGGEST_ESTIMATED_COST_USD},
			'estimated',
			'suggest'
		)
	`);
}
