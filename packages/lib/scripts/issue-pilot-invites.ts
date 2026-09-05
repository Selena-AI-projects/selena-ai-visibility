/**
 * Mint the pilot seats an operator hands out, one row per code.
 *
 * Codes are read from a file rather than from the command line: an argument
 * ends up in the shell history and in the process list of anyone on the box,
 * and a pilot code is a live credential until it is spent. Nothing here ever
 * prints a code back — the operator already has the file, and a transcript
 * that repeats them is one more place to leak from.
 *
 * The input is one seat per line, `CODE,planId[,label]`, `#` starting a
 * comment. A code that already has a seat is left exactly as it is, spent or
 * not, so re-running after a partial failure adds the missing rows instead of
 * reissuing the whole set.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm -C packages/lib exec tsx scripts/issue-pilot-invites.ts seats.csv 30
 *
 * The second argument is how many days the seats stay redeemable.
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "../src/db/db";
import { hashPilotInviteCode } from "../src/selena-pilot-invites";

const PLAN_IDS = new Set(["visitor-local", "full-ai-landscape"]);

interface Seat {
	codeHash: string;
	planId: string;
	label: string | null;
	/** Only for the operator's own error messages; never written or printed. */
	line: number;
}

function parseSeats(contents: string): Seat[] {
	const seats: Seat[] = [];
	contents.split(/\r?\n/).forEach((raw, index) => {
		const line = raw.trim();
		if (line.length === 0 || line.startsWith("#")) return;
		const [code, planId, ...labelParts] = line.split(",").map((part) => part.trim());
		if (!code || !planId) throw new Error(`Line ${index + 1}: expected CODE,planId[,label]`);
		if (!PLAN_IDS.has(planId)) {
			throw new Error(`Line ${index + 1}: unknown plan "${planId}" (expected one of ${[...PLAN_IDS].join(", ")})`);
		}
		seats.push({
			codeHash: hashPilotInviteCode(code),
			planId,
			label: labelParts.join(",").trim() || null,
			line: index + 1,
		});
	});
	return seats;
}

async function main(): Promise<void> {
	const [file, days] = process.argv.slice(2);
	if (!file) throw new Error("Usage: issue-pilot-invites.ts <seats.csv> [days=30]");
	const validDays = Number(days ?? 30);
	if (!Number.isInteger(validDays) || validDays <= 0) throw new Error("Days must be a positive whole number");

	const seats = parseSeats(readFileSync(file, "utf8"));
	if (seats.length === 0) throw new Error("No seats in the file");
	const digests = new Set(seats.map((seat) => seat.codeHash));
	if (digests.size !== seats.length) throw new Error("The file lists the same code twice");

	let issued = 0;
	for (const seat of seats) {
		const result = await db.execute(sql`
			INSERT INTO "sv_pilot_invites" ("code_hash", "plan_id", "label", "expires_at")
			VALUES (
				${seat.codeHash}::text,
				${seat.planId}::text,
				${seat.label}::text,
				now() + ${`${validDays} days`}::interval
			)
			ON CONFLICT ("code_hash") DO NOTHING
			RETURNING "id"
		`);
		if ((result.rows?.length ?? 0) > 0) issued += 1;
	}

	// Counts only. Which restaurant holds which code stays in the operator's
	// own file, and the seat itself records who spent it once someone does.
	console.log(`seats in file: ${seats.length}`);
	console.log(`newly issued: ${issued}`);
	console.log(`already present: ${seats.length - issued}`);
	console.log(`valid for: ${validDays} days`);
}

main().then(
	() => process.exit(0),
	(error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	},
);
