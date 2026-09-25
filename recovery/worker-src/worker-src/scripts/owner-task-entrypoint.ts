/**
 * The owner service: one database step with owner rights, then exit.
 *
 * It runs from the worker image on Railway, as a service named `owner` whose
 * DATABASE_URL is the migration runner's — the one connection that may write
 * pilot seats and spend ceilings. The task and its inputs are variables, so
 * the owner sets them on the service and deploys, and the log carries counts
 * and ceilings only: never a code, never a connection string.
 */
import { ownerTaskUsage, resolveOwnerTask } from "./owner-task.js";

const task = resolveOwnerTask(process.env);
if (task.kind === "refused") {
	console.error(`OWNER_TASK_REFUSED: ${task.reason}`);
	for (const line of ownerTaskUsage()) console.error(line);
	process.exit(2);
}

async function run(): Promise<void> {
	const { db } = await import("@workspace/lib/db/db");
	switch (task.kind) {
		case "issue-pilot-invites": {
			const { formatPilotSeatIssuance, issuePilotSeats, parsePilotSeats } = await import(
				"@workspace/lib/selena-pilot-seat-issuance"
			);
			const report = await issuePilotSeats(db, parsePilotSeats(task.csv), task.validDays);
			for (const line of formatPilotSeatIssuance(report)) console.log(line);
			return;
		}
		case "read-spend-budget":
		case "set-spend-budget": {
			const { formatProviderSpendBudget, readProviderSpendBudget, setProviderSpendBudget } = await import(
				"@workspace/lib/selena-provider-spend-budget"
			);
			if (task.kind === "set-spend-budget") await setProviderSpendBudget(db, task.scope, task.capUsd);
			for (const line of formatProviderSpendBudget(await readProviderSpendBudget(db, task.scope))) console.log(line);
			return;
		}
	}
}

run().then(
	() => process.exit(0),
	(error: unknown) => {
		// The message is the script's own or the database's; neither carries a
		// code or a credential, and a connection failure names a host at most.
		console.error(`OWNER_TASK_FAILED: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	},
);
