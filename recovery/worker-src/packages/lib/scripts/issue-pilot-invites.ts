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
 * The second argument is how many days the seats stay redeemable. The same
 * issuance runs on Railway as the owner service's `issue-pilot-invites` task,
 * where the file's contents travel in a variable instead.
 */
import { readFileSync } from "node:fs";
import { db } from "../src/db/db";
import { formatPilotSeatIssuance, issuePilotSeats, parsePilotSeats } from "../src/selena-pilot-seat-issuance";

async function main(): Promise<void> {
	const [file, days] = process.argv.slice(2);
	if (!file) throw new Error("Usage: issue-pilot-invites.ts <seats.csv> [days=30]");
	const validDays = Number(days ?? 30);
	if (!Number.isInteger(validDays) || validDays <= 0) throw new Error("Days must be a positive whole number");

	const seats = parsePilotSeats(readFileSync(file, "utf8"));
	const report = await issuePilotSeats(db, seats, validDays);
	for (const line of formatPilotSeatIssuance(report)) console.log(line);
}

main().then(
	() => process.exit(0),
	(error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	},
);
