/**
 * Read-only reconciliation of pilot seats: redemption → free request → order.
 * Codes and their digests are never printed — a seat is named by its id and label.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm -C packages/lib exec tsx scripts/reconcile-pilot-seat-requests.ts [--json]
 */
import { db } from "../src/db/db";
import { readPilotSeatReconciliation, type SeatClass } from "../src/selena-pilot-seat-reconciliation";

async function main(): Promise<void> {
	const rows = await readPilotSeatReconciliation(db);
	if (process.argv.includes("--json")) {
		console.log(JSON.stringify(rows, null, 1));
		return;
	}
	const counts = new Map<SeatClass, number>();
	for (const row of rows) counts.set(row.class, (counts.get(row.class) ?? 0) + 1);
	console.log(`redeemed seats: ${rows.length}`);
	for (const [kind, count] of counts) console.log(`  ${kind}: ${count}`);
	for (const row of rows)
		console.log(
			[
				row.class,
				`seat=${row.seatId}`,
				`label=${row.label ?? "-"}`,
				`org=${row.organizationId}`,
				`plan=${row.planId}`,
				`requests=${row.requestIds.join(",") || "-"}`,
				`orders=${row.orders.map((order) => `${order.orderId}:${order.status}`).join(",") || "-"}`,
			].join(" "),
		);
}

main().then(
	() => process.exit(0),
	(error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	},
);
