import { sql } from "drizzle-orm";
import { hashPilotInviteCode, type SqlExecutor } from "./selena-pilot-invites";

/**
 * Minting the pilot seats an operator hands out, one row per code.
 *
 * The codes arrive as text — a file on the operator's machine, or a variable
 * on the owner's own Railway service — never as command-line arguments, which
 * end up in shell history and process lists. Nothing here ever returns or
 * prints a code: only its digest reaches the database, and what comes back is
 * counts. A code that already has a seat is left exactly as it is, spent or
 * not, so re-running after a partial failure adds the missing rows instead of
 * reissuing the whole set.
 */

export const pilotSeatPlanIds = ["visibility-snapshot", "full-discovery-landscape"] as const;

export interface PilotSeat {
	codeHash: string;
	planId: string;
	label: string | null;
}

export interface PilotSeatIssuance {
	inFile: number;
	issued: number;
	alreadyPresent: number;
	validDays: number;
}

/** One seat per line, `CODE,planId[,label]`, `#` starting a comment. */
export function parsePilotSeats(contents: string): PilotSeat[] {
	const seats: PilotSeat[] = [];
	contents.split(/\r?\n/).forEach((raw, index) => {
		const line = raw.trim();
		if (line.length === 0 || line.startsWith("#")) return;
		const [code, planId, ...labelParts] = line.split(",").map((part) => part.trim());
		if (!code || !planId) throw new Error(`Line ${index + 1}: expected CODE,planId[,label]`);
		if (!(pilotSeatPlanIds as readonly string[]).includes(planId)) {
			throw new Error(`Line ${index + 1}: unknown plan "${planId}" (expected one of ${pilotSeatPlanIds.join(", ")})`);
		}
		seats.push({ codeHash: hashPilotInviteCode(code), planId, label: labelParts.join(",").trim() || null });
	});
	if (seats.length === 0) throw new Error("No seats in the file");
	if (new Set(seats.map((seat) => seat.codeHash)).size !== seats.length)
		throw new Error("The file lists the same code twice");
	return seats;
}

export async function issuePilotSeats(
	executor: SqlExecutor,
	seats: PilotSeat[],
	validDays: number,
): Promise<PilotSeatIssuance> {
	if (!Number.isInteger(validDays) || validDays <= 0) throw new Error("Days must be a positive whole number");
	let issued = 0;
	for (const seat of seats) {
		const result = await executor.execute(sql`
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
	return { inFile: seats.length, issued, alreadyPresent: seats.length - issued, validDays };
}

/** Counts only: which guest holds which code stays in the operator's own file. */
export function formatPilotSeatIssuance(report: PilotSeatIssuance): string[] {
	return [
		`seats in file: ${report.inFile}`,
		`newly issued: ${report.issued}`,
		`already present: ${report.alreadyPresent}`,
		`valid for: ${report.validDays} days`,
	];
}
