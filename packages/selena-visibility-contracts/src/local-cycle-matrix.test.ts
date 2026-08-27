import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	MATRIX_BEGIN,
	MATRIX_END,
	PUBLISHED_DATAFORSEO_STANDARD_USD,
	PUBLISHED_PRICE_CAVEAT,
	renderLocalCycleMatrix,
} from "./local-cycle-matrix.js";

const documentPath = fileURLToPath(
	new URL("../../../docs/selena-visibility/local-cycle-economics.md", import.meta.url),
);

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
		const dataRows = renderLocalCycleMatrix()
			.split("\n")
			.filter((line) => line.startsWith("| ") && !line.includes("Grid") && !line.startsWith("| ---"));
		expect(dataRows).toHaveLength(18);
		for (const row of dataRows) {
			expect(row.trimEnd().endsWith("| — |")).toBe(true);
		}
	});

	it("leaves the sizing decisions to the owner", () => {
		expect(document).toContain("Потолок точек grid и допустимая стоимость цикла — решение владельца");
		expect(document).toContain("`<не сверено со счётом>`");
	});
});
