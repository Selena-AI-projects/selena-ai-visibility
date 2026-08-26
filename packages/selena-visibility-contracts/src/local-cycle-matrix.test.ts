import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MATRIX_BEGIN, MATRIX_END, renderLocalCycleMatrix } from "./local-cycle-matrix.js";

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

	it("leaves every price to the owner", () => {
		expect(renderLocalCycleMatrix()).not.toMatch(/\$\s*\d/);
		expect(document).toContain("Потолок точек grid и допустимая стоимость цикла — решение владельца");
	});
});
