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
 * With no amount it reports the current ceiling and what is committed against
 * it. The same read and write run on Railway as the owner service's
 * `read-spend-budget` and `set-spend-budget` tasks.
 */
import { db } from "../src/db/db";
import {
	formatProviderSpendBudget,
	readProviderSpendBudget,
	setProviderSpendBudget,
} from "../src/selena-provider-spend-budget";

async function main(): Promise<void> {
	const [scope, amount] = process.argv.slice(2);
	if (!scope) throw new Error("Usage: set-provider-spend-budget.ts <scope> [capUsd]");

	if (amount !== undefined) {
		const capUsd = Number(amount);
		if (!Number.isFinite(capUsd) || capUsd < 0) throw new Error("The cap must be a non-negative number of dollars");
		await setProviderSpendBudget(db, scope, capUsd);
	}

	for (const line of formatProviderSpendBudget(await readProviderSpendBudget(db, scope))) console.log(line);
}

main().then(
	() => process.exit(0),
	(error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	},
);
