/**
 * The owner service: one database step with owner rights, then exit.
 *
 * It runs from the worker image on Railway, as a service named `owner` whose
 * DATABASE_URL is the migration runner's — the one connection that may write
 * pilot seats, spend ceilings and the operator role, and read the Local
 * evidence provenance the runtime role may not select. The task and its inputs
 * are variables, so the owner sets them on the service and deploys, and the
 * log carries counts, ceilings and a masked address only: never a code, never
 * a connection string.
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
		case "grant-platform-admin": {
			const { formatPlatformAdminGrant, grantPlatformAdmin } = await import(
				"@workspace/lib/selena-platform-admin-grant"
			);
			for (const line of formatPlatformAdminGrant(await grantPlatformAdmin(db, task.email))) console.log(line);
			return;
		}
		case "local-maps-setup": {
			const { applyLocalMapsSetup, formatLocalMapsSetup } = await import("@workspace/lib/selena-local-maps-setup");
			for (const line of formatLocalMapsSetup(await applyLocalMapsSetup(db, task.input))) console.log(line);
			return;
		}
		case "local-maps-canary": {
			const { executeLocalMapsOneShot } = await import("./local-maps-one-shot.js");
			console.log(`local-maps-canary: ${JSON.stringify(await executeLocalMapsOneShot())}`);
			return;
		}
		case "local-maps-status": {
			const { formatLocalMapsLockStatus, readLocalMapsLockStatus } = await import(
				"@workspace/lib/selena-local-maps-owner"
			);
			const status = await readLocalMapsLockStatus({
				db,
				organizationId: task.organizationId,
				configurationLockId: task.configurationLockId,
			});
			for (const line of formatLocalMapsLockStatus(status)) console.log(line);
			return;
		}
		case "local-maps-canary-review": {
			const { formatLocalCanaryReview, reviewLocalMapsCanary } = await import("@workspace/lib/selena-local-maps-owner");
			const review = await reviewLocalMapsCanary({
				db,
				organizationId: task.organizationId,
				actorId: task.actorId,
				configurationLockId: task.configurationLockId,
				canaryCycleId: task.canaryCycleId,
				decision: task.decision,
			});
			for (const line of formatLocalCanaryReview(review)) console.log(line);
			return;
		}
		case "local-maps-pilot-approve": {
			const { approveLocalPilot, formatLocalPilotApproval } = await import("@workspace/lib/selena-local-maps-owner");
			const { dispatchLocalOutboxNow } = await import("./local-maps-one-shot.js");
			const approval = await approveLocalPilot({
				db,
				organizationId: task.organizationId,
				actorId: task.actorId,
				configurationLockId: task.configurationLockId,
				pilotCycleId: task.pilotCycleId,
				maxSpendUsd: task.maxSpendUsd,
				env: process.env,
			});
			for (const line of formatLocalPilotApproval(approval)) console.log(line);
			const dispatched = await dispatchLocalOutboxNow(task.organizationId);
			console.log(`dispatched: claimed ${dispatched.claimed}, enqueued ${dispatched.enqueued}`);
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
