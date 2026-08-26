// Rewrites the matrix block in the economics document in place. Run through the
// tsx already present in @workspace/lib rather than adding a runner to this
// package: the calculator is the only source of those numbers, and a stale
// table is caught by local-cycle-matrix.test.ts either way.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MATRIX_BEGIN, MATRIX_END, renderLocalCycleMatrix } from "../src/local-cycle-matrix.js";

const documentPath = fileURLToPath(
	new URL("../../../docs/selena-visibility/local-cycle-economics.md", import.meta.url),
);
const document = readFileSync(documentPath, "utf8");
const start = document.indexOf(MATRIX_BEGIN);
const end = document.indexOf(MATRIX_END);
if (start === -1 || end === -1) throw new Error("MATRIX_MARKERS_MISSING");

const next = `${document.slice(0, start + MATRIX_BEGIN.length)}\n${renderLocalCycleMatrix()}\n${document.slice(end)}`;
writeFileSync(documentPath, next);
console.log(next === document ? "matrix unchanged" : "matrix rewritten");
