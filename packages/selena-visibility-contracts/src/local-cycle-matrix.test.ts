import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	CYCLE_BUDGET_CAP_USD,
	MATRIX_BEGIN,
	MATRIX_CAPTURE_DEPTH,
	MATRIX_END,
	PUBLISHED_DATAFORSEO_STANDARD_USD,
	PUBLISHED_PRICE_CAVEAT,
	renderLocalCycleMatrix,
} from "./local-cycle-matrix.js";

const documentPath = fileURLToPath(
	new URL("../../../docs/selena-visibility/local-cycle-economics.md", import.meta.url),
);

const dataRows = (): string[] =>
	renderLocalCycleMatrix()
		.split("\n")
		.filter((line) => line.startsWith("| ") && !line.includes("Grid") && !line.startsWith("| ---"));

describe("economics document", () => {
	const document = readFileSync(documentPath, "utf8");

	// The document is the artifact the owner prices from, so a hand-edited
	// table would be a wrong number nobody notices. This is the check that
	// makes "generated, not typed" enforceable.
	it("carries exactly the matrix the calculator produces", () => {
		const start = document.indexOf(MATRIX_BEGIN);
		const end = document.indexOf(MATRIX_END);
		expect(start, "matrix markers missing").toBeGreaterThan(-1);
		expect(end).toBeGreaterThan(start);
		const block = document.slice(start + MATRIX_BEGIN.length, end).trim();
		expect(block).toBe(renderLocalCycleMatrix());
	});

	// The published price is a quotable public figure; the account's real tariff
	// is not known until an invoice says so. The document may show the first
	// only while it keeps saying which one it is, and may never guess the second.
	it("quotes the published price under its caveat", () => {
		expect(renderLocalCycleMatrix()).toContain(`DataForSEO Standard $${PUBLISHED_DATAFORSEO_STANDARD_USD}`);
		expect(document).toContain(PUBLISHED_PRICE_CAVEAT);
	});

	it("leaves the account tariff empty on every row", () => {
		expect(dataRows()).toHaveLength(18);
		for (const row of dataRows()) {
			expect(row.trimEnd().endsWith("| — |")).toBe(true);
		}
	});

	// The whole reason capture depth entered the model: at a block of ten, a
	// twenty-deep read is two units, and the table must show the doubling rather
	// than quietly price a cycle at half of what it costs.
	it("bills every row at two units for the twenty-deep read the bands require", () => {
		expect(MATRIX_CAPTURE_DEPTH).toBe(20);
		for (const row of dataRows()) {
			expect(row.split("|").map((cell) => cell.trim())[7]).toBe("2");
		}
	});

	it("marks the configurations the cost cap refuses", () => {
		const rendered = renderLocalCycleMatrix();
		expect(rendered).toContain(`В капе $${CYCLE_BUDGET_CAP_USD}`);
		// 7×7 × 20 keywords × 2 repeats is the one row above the cap; if the cap
		// or the price moves, this is the assertion that notices.
		expect(rendered.split("\n").filter((line) => line.includes("**нет**"))).toHaveLength(1);
	});

	it("leaves the sizing decisions to the owner", () => {
		expect(document).toContain("`<не сверено со счётом>`");
		for (const decision of ["49", "400 м", "800 м", "$3 worst-case", "DataForSEO Standard"]) {
			expect(document, `owner decision missing: ${decision}`).toContain(decision);
		}
	});
});
