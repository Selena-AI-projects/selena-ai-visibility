import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MATRIX_BEGIN, MATRIX_CAPTURE_DEPTH, MATRIX_END, renderLocalCycleMatrix } from "./local-cycle-matrix.js";

const documentPath = fileURLToPath(
	new URL("../../../docs/selena-visibility/local-cycle-economics.md", import.meta.url),
);

const document = readFileSync(documentPath, "utf8");
const start = document.indexOf(MATRIX_BEGIN);
const end = document.indexOf(MATRIX_END);
const generatedBlock = document.slice(start + MATRIX_BEGIN.length, end).trim();
const header = generatedBlock.match(
	/^Тариф расчёта: DataForSEO Standard \$([0-9.]+) за вызов\. Решение владельца: (\d{4}-\d{2}-\d{2})\./,
);
const cap = generatedBlock.match(/\| В капе \$([0-9.]+) \|/);
if (!header || !cap) throw new Error("MATRIX_GENERATION_METADATA_MISSING");

const input = {
	tariffUsdPerCall: Number(header[1]),
	decisionDate: header[2],
	cycleBudgetCapUsd: Number(cap[1]),
};

const dataRows = (): string[] =>
	renderLocalCycleMatrix(input)
		.split("\n")
		.filter((line) => line.startsWith("| ") && !line.includes("Grid") && !line.startsWith("| ---"));

describe("economics document", () => {
	it("labels the historical matrix as non-normative for Delta v1.2.1", () => {
		expect(document).toContain("LEGACY M0 / NON-NORMATIVE");
		expect(document).toContain("максимум три попытки");
	});

	// The document is the artifact the owner prices from, so a hand-edited
	// table would be a wrong number nobody notices. This is the check that
	// makes "generated, not typed" enforceable.
	it("carries exactly the matrix the calculator produces", () => {
		expect(start, "matrix markers missing").toBeGreaterThan(-1);
		expect(end).toBeGreaterThan(start);
		expect(generatedBlock).toBe(renderLocalCycleMatrix(input));
	});

	it("records the CLI tariff and decision date in the generated heading", () => {
		expect(input.tariffUsdPerCall).toBeGreaterThan(0);
		expect(input.decisionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
		const rendered = renderLocalCycleMatrix(input);
		expect(rendered).toContain(`В капе $${input.cycleBudgetCapUsd.toFixed(4)}`);
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

	it("keeps the selected tariff out of TypeScript", () => {
		const selectedTariff = header[1];
		for (const sourcePath of [
			new URL("./local-cycle-matrix.ts", import.meta.url),
			new URL("../scripts/render-local-cycle-matrix.ts", import.meta.url),
		]) {
			const source = readFileSync(fileURLToPath(sourcePath), "utf8");
			expect(source).not.toContain(selectedTariff);
		}
	});
});

describe("matrix input", () => {
	it("rejects missing economic provenance", () => {
		expect(() => renderLocalCycleMatrix({ ...input, tariffUsdPerCall: Number.NaN })).toThrow(
			"LOCAL_CYCLE_MATRIX_TARIFF_INVALID",
		);
		expect(() => renderLocalCycleMatrix({ ...input, cycleBudgetCapUsd: -1 })).toThrow("LOCAL_CYCLE_MATRIX_CAP_INVALID");
		expect(() => renderLocalCycleMatrix({ ...input, decisionDate: "28 August" })).toThrow(
			"LOCAL_CYCLE_MATRIX_DECISION_DATE_INVALID",
		);
	});
});
