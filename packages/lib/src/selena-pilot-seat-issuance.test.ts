import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { hashPilotInviteCode } from "./selena-pilot-invites";
import { formatPilotSeatIssuance, issuePilotSeats, parsePilotSeats } from "./selena-pilot-seat-issuance";

const CODE_ONE = "SELENA-DOKI-7K3M9Q";
const CODE_TWO = "selena-petid-2b8x4d";

function executorAnswering(rowsPerCall: unknown[][]) {
	const statements: SQL[] = [];
	const answers = [...rowsPerCall];
	return {
		statements,
		execute: async (statement: SQL) => {
			statements.push(statement);
			return { rows: answers.shift() ?? [] };
		},
	};
}

/** Every bound parameter of a statement, so a test can look for what must never be there. */
function paramsOf(statement: SQL): string[] {
	// The template keeps bound values raw until the query is built.
	return statement.queryChunks
		.filter((chunk): chunk is string | number => typeof chunk === "string" || typeof chunk === "number")
		.map(String);
}

describe("pilot seat issuance", () => {
	it("reads one seat per line, skipping comments and blank lines, and keeps a label with commas", () => {
		const seats = parsePilotSeats(
			`# test clients\n\n${CODE_ONE},full-ai-landscape,doki.help\n${CODE_TWO} , visitor-local , petid.care, Bali\n`,
		);
		expect(seats).toEqual([
			{ codeHash: hashPilotInviteCode(CODE_ONE), planId: "full-ai-landscape", label: "doki.help" },
			{ codeHash: hashPilotInviteCode(CODE_TWO), planId: "visitor-local", label: "petid.care,Bali" },
		]);
		// A code is the same seat whatever its case, so the two spellings collide.
		expect(() => parsePilotSeats(`${CODE_ONE},visitor-local\n${CODE_ONE.toLowerCase()},visitor-local`)).toThrow(
			"same code twice",
		);
	});

	it("refuses a line it cannot read rather than guessing a plan", () => {
		expect(() => parsePilotSeats(`${CODE_ONE}`)).toThrow("Line 1: expected CODE,planId[,label]");
		expect(() => parsePilotSeats(`\n${CODE_ONE},growth-90-days`)).toThrow('Line 2: unknown plan "growth-90-days"');
		expect(() => parsePilotSeats("# nothing here\n")).toThrow("No seats in the file");
	});

	it("inserts a digest per seat, counts what was new, and never sends the code itself", async () => {
		const seats = parsePilotSeats(`${CODE_ONE},full-ai-landscape,doki.help\n${CODE_TWO},full-ai-landscape,petid.care`);
		const executor = executorAnswering([[{ id: "seat-1" }], []]);

		const report = await issuePilotSeats(executor, seats, 30);

		expect(report).toEqual({ inFile: 2, issued: 1, alreadyPresent: 1, validDays: 30 });
		expect(executor.statements).toHaveLength(2);
		for (const statement of executor.statements) {
			const params = paramsOf(statement);
			expect(params).toContain("30 days");
			for (const code of [CODE_ONE, CODE_TWO, CODE_TWO.toUpperCase()]) expect(params).not.toContain(code);
		}
		expect(paramsOf(executor.statements[0] as SQL)).toContain(hashPilotInviteCode(CODE_ONE));
		expect(formatPilotSeatIssuance(report)).toEqual([
			"seats in file: 2",
			"newly issued: 1",
			"already present: 1",
			"valid for: 30 days",
		]);
		await expect(issuePilotSeats(executor, seats, 0)).rejects.toThrow("positive whole number");
	});
});
