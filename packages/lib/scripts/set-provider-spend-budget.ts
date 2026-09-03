/**
 * Set the ceiling a provider scope may spend, as the owner.
 *
 * The ceiling lives in the database rather than in the runtime's environment,
 * so the process that spends the money cannot be handed a larger copy of its
 * own limit. Only a connection with owner rights can run this.
 *
 * Lowering a cap below what is already committed is allowed and does exactly
 * what it says: no further reservation is granted until settled spending falls
 * back under the new line. Money already spent is never rewritten.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm -C packages/lib exec tsx scripts/set-provider-spend-budget.ts suggest 50
 *   DATABASE_URL=postgres://... pnpm -C packages/lib exec tsx scripts/set-provider-spend-budget.ts suggest
 *
 * With no amount it reports the current ceiling and what is committed against it.
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db/db";

async function report(scope: string): Promise<void> {
	const result = await db.execute(sql`
		SELECT
			(SELECT "cap_usd"::float8 FROM "sv_provider_spend_budgets" WHERE "scope" = ${scope}) AS cap_usd,
			public.sv_provider_spend_committed(${scope})::float8 AS committed_usd,
			(SELECT count(*) FROM "sv_provider_spend_reservations"
				WHERE "scope" = ${scope} AND "status" = 'RESERVED') AS open_reservations
	`);
	const row = (result.rows?.[0] ?? {}) as { cap_usd?: number; committed_usd?: number; open_reservations?: number };
	console.log(`scope: ${scope}`);
	console.log(`cap: ${row.cap_usd ?? "not funded"}`);
	console.log(`committed: ${row.committed_usd ?? 0}`);
	console.log(`open reservations: ${row.open_reservations ?? 0}`);
}

async function main(): Promise<void> {
	const [scope, amount] = process.argv.slice(2);
	if (!scope) throw new Error("Usage: set-provider-spend-budget.ts <scope> [capUsd]");

	if (amount !== undefined) {
		const capUsd = Number(amount);
		if (!Number.isFinite(capUsd) || capUsd < 0) throw new Error("The cap must be a non-negative number of dollars");
		await db.execute(sql`
			INSERT INTO "sv_provider_spend_budgets" ("scope", "cap_usd")
			VALUES (${scope}, ${capUsd})
			ON CONFLICT ("scope") DO UPDATE SET "cap_usd" = excluded."cap_usd", "updated_at" = now()
		`);
	}

	await report(scope);
}

main().then(
	() => process.exit(0),
	(error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	},
);
