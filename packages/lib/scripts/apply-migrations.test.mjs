import { describe, expect, it } from "vitest";
import { assertJournalPostcondition, assertJournalPrefix } from "./apply-migrations.mjs";

const expected = [
	{ hash: "hash-0049", createdAt: "1787940011000" },
	{ hash: "hash-0050", createdAt: "1787940012000" },
	{ hash: "hash-0051", createdAt: "1787940013000" },
];

describe("bounded migration journal acceptance", () => {
	it("accepts only the exact ordered reviewed prefix before migration", () => {
		expect(() => assertJournalPrefix(expected.slice(0, 2), expected)).not.toThrow();
		expect(() =>
			assertJournalPrefix([...expected, { hash: "hash-0052", createdAt: "1787940014000" }], expected),
		).toThrow("SELENA_MIGRATION_CEILING_ALREADY_EXCEEDED");
		expect(() => assertJournalPrefix([{ ...expected[0], hash: "changed" }], expected)).toThrow(
			"SELENA_MIGRATION_JOURNAL_MISMATCH",
		);
	});

	it("requires the exact reviewed journal as the postcondition", () => {
		expect(() => assertJournalPostcondition(expected, expected)).not.toThrow();
		expect(() => assertJournalPostcondition(expected.slice(0, 2), expected)).toThrow(
			"SELENA_MIGRATION_POSTCONDITION_FAILED",
		);
		expect(() => assertJournalPostcondition(null, expected)).toThrow("SELENA_MIGRATION_POSTCONDITION_FAILED");
	});
});
