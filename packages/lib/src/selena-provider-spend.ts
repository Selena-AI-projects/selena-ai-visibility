import { type SQL, sql } from "drizzle-orm";

/**
 * The running total behind every stated provider cap.
 *
 * A reservation is taken before the call and settled after it, so the balance
 * always includes money that is promised but not yet reported. Both halves are
 * keyed by the request, which makes a retry ride on the reservation it already
 * has instead of taking a second bite out of the budget.
 *
 * The ceiling itself is not read here. It lives in the database, where the
 * runtime cannot raise it.
 */

export type SqlExecutor = {
	execute(statement: SQL): Promise<{ rows?: unknown[] }>;
};

export type SpendDecision =
	| "RESERVED"
	| "ALREADY_RESERVED"
	| "RELEASED"
	| "REFUSED_NO_BUDGET"
	| "REFUSED_OVER_CAP"
	| "SETTLED"
	| "UNKNOWN_RESERVATION"
	| `ALREADY_${string}`;

export interface SpendReceipt {
	decision: SpendDecision;
	reservationId?: string;
	status?: string;
	capUsd: number | null;
	committedUsd: number;
	estimatedUsd?: number;
	actualUsd?: number;
}

export interface SpendRequest {
	scope: string;
	organizationId: string;
	/** Stable per unit of work; the same key never reserves twice. */
	requestKey: string;
}

export class ProviderSpendRefused extends Error {
	constructor(readonly receipt: SpendReceipt) {
		super(`PROVIDER_SPEND_${receipt.decision}`);
		this.name = "ProviderSpendRefused";
	}
}

function toNumber(value: unknown): number {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function receiptFrom(row: unknown): SpendReceipt {
	const raw = (row ?? {}) as Record<string, unknown>;
	const cap = raw.capUsd;
	return {
		decision: String(raw.decision ?? "UNKNOWN_RESERVATION") as SpendDecision,
		reservationId: typeof raw.reservationId === "string" ? raw.reservationId : undefined,
		status: typeof raw.status === "string" ? raw.status : undefined,
		capUsd: cap === null || cap === undefined ? null : toNumber(cap),
		committedUsd: toNumber(raw.committedUsd),
		estimatedUsd: raw.estimatedUsd === undefined ? undefined : toNumber(raw.estimatedUsd),
		actualUsd: raw.actualUsd === undefined ? undefined : toNumber(raw.actualUsd),
	};
}

async function callSpendFunction(executor: SqlExecutor, statement: SQL, column: string): Promise<SpendReceipt> {
	const result = await executor.execute(statement);
	return receiptFrom((result.rows?.[0] as Record<string, unknown> | undefined)?.[column]);
}

/** Holds budget for one unit of work, or refuses. Never partially reserves. */
export async function reserveProviderSpend(
	executor: SqlExecutor,
	request: SpendRequest & { estimatedUsd: number },
): Promise<SpendReceipt> {
	return callSpendFunction(
		executor,
		sql`SELECT public.sv_reserve_provider_spend(
			${request.scope}::text,
			${request.organizationId}::text,
			${request.requestKey}::text,
			${request.estimatedUsd}::numeric
		) AS receipt`,
		"receipt",
	);
}

/**
 * The same call, with a refusal raised instead of returned. Callers on a paid
 * path want the work to stop, not to continue with a receipt they might forget
 * to read.
 */
export async function assertProviderSpendReserved(
	executor: SqlExecutor,
	request: SpendRequest & { estimatedUsd: number },
): Promise<SpendReceipt> {
	const receipt = await reserveProviderSpend(executor, request);
	if (receipt.decision === "RESERVED" || receipt.decision === "ALREADY_RESERVED") return receipt;
	throw new ProviderSpendRefused(receipt);
}

/** Records what the call actually cost. Safe to repeat. */
export async function settleProviderSpend(
	executor: SqlExecutor,
	request: SpendRequest & { actualUsd: number },
): Promise<SpendReceipt> {
	return callSpendFunction(
		executor,
		sql`SELECT public.sv_settle_provider_spend(
			${request.scope}::text,
			${request.organizationId}::text,
			${request.requestKey}::text,
			${request.actualUsd}::numeric
		) AS receipt`,
		"receipt",
	);
}

/** Gives an unspent reservation back after a call that never happened. */
export async function releaseProviderSpend(executor: SqlExecutor, request: SpendRequest): Promise<SpendReceipt> {
	return callSpendFunction(
		executor,
		sql`SELECT public.sv_release_provider_spend(
			${request.scope}::text,
			${request.organizationId}::text,
			${request.requestKey}::text
		) AS receipt`,
		"receipt",
	);
}
