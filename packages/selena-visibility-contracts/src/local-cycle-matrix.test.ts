import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	CYCLE_BUDGET_CAP_USD,
	MATRIX_BEGIN,
	MATRIX_CAPTURE_DEPTH,
	MATRIX_END,
	PRICE_SOURCE,
	PUBLISHED_DATAFORSEO_STANDARD_USD,
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

	it("prices at the rate the account's own card states", () => {
		expect(renderLocalCycleMatrix()).toContain(`DataForSEO Standard $${PUBLISHED_DATAFORSEO_STANDARD_USD}`);
		expect(document).toContain(PRICE_SOURCE);
		expect(dataRows()).toHaveLength(18);
	});

	// The account card bills serp/task_post per request with no per-result
	// component, so a deeper read must not multiply the charge. The column is
	// kept visible because the answer would flip the largest row past the cap.
	it("bills one unit per call at the depth the bands require", () => {
		expect(MATRIX_CAPTURE_DEPTH).toBe(20);
		for (const row of dataRows()) {
			expect(row.split("|").map((cell) => cell.trim())[7]).toBe("1");
		}
	});

	it("clears the cost cap on every configuration at this rate", () => {
		const rendered = renderLocalCycleMatrix();
		expect(rendered).toContain(`В капе $${CYCLE_BUDGET_CAP_USD}`);
		expect(rendered.split("\n").filter((line) => line.includes("**нет**"))).toHaveLength(0);
		// The row that a depth multiplier would push over $3, named so a change
		// in either direction is noticed here rather than on an invoice.
		expect(document).toContain("`7×7 × 20 запросов × 2 повтора`");
	});

	it("leaves the sizing decisions to the owner", () => {
		for (const decision of ["49", "400 м", "800 м", "$3 worst-case", "DataForSEO Standard queue"]) {
			expect(document, `owner decision missing: ${decision}`).toContain(decision);
		}
	});
});
