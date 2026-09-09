import { sql } from "drizzle-orm";
import type { SqlExecutor } from "./selena-pilot-invites";

/**
 * The ceiling a provider scope may spend, set and read as the owner.
 *
 * The ceiling lives in the database rather than in the runtime's environment,
 * so the process that spends the money cannot be handed a larger copy of its
 * own limit. Only a connection with owner rights can write it. Lowering a cap
 * below what is already committed is allowed and does exactly what it says: no
 * further reservation is granted until settled spending falls back under the
 * new line. Money already spent is never rewritten.
 */

export interface ProviderSpendBudgetReport {
	scope: string;
	/** Null when the scope has never been funded, which refuses every reservation. */
	capUsd: number | null;
	committedUsd: number;
	openReservations: number;
}

function numberOrNull(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
	return null;
}

export async function readProviderSpendBudget(
	executor: SqlExecutor,
	scope: string,
): Promise<ProviderSpendBudgetReport> {
	const result = await executor.execute(sql`
		SELECT
			(SELECT "cap_usd"::float8 FROM "sv_provider_spend_budgets" WHERE "scope" = ${scope}) AS cap_usd,
			public.sv_provider_spend_committed(${scope})::float8 AS committed_usd,
			(SELECT count(*) FROM "sv_provider_spend_reservations"
				WHERE "scope" = ${scope} AND "status" = 'RESERVED') AS open_reservations
	`);
	const row = (result.rows?.[0] ?? {}) as Record<string, unknown>;
	return {
		scope,
		capUsd: numberOrNull(row.cap_usd),
		committedUsd: numberOrNull(row.committed_usd) ?? 0,
		openReservations: numberOrNull(row.open_reservations) ?? 0,
	};
}

export async function setProviderSpendBudget(executor: SqlExecutor, scope: string, capUsd: number): Promise<void> {
	if (!Number.isFinite(capUsd) || capUsd < 0) throw new Error("The cap must be a non-negative number of dollars");
	await executor.execute(sql`
		INSERT INTO "sv_provider_spend_budgets" ("scope", "cap_usd")
		VALUES (${scope}, ${capUsd})
		ON CONFLICT ("scope") DO UPDATE SET "cap_usd" = excluded."cap_usd", "updated_at" = now()
	`);
}

export function formatProviderSpendBudget(report: ProviderSpendBudgetReport): string[] {
	return [
		`scope: ${report.scope}`,
		`cap: ${report.capUsd ?? "not funded"}`,
		`committed: ${report.committedUsd}`,
		`open reservations: ${report.openReservations}`,
	];
}
