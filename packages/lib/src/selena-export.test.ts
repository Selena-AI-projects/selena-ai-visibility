import { describe, expect, it } from "vitest";
import { assertCanonicalDataset, ledgerToCsv } from "./selena-export";

const row = {
	runId: "r1",
	cycleId: "c1",
	channel: "API View" as const,
	brand: "Brand",
	scenarioId: "s1",
	scenarioText: "What is Brand, really?",
	system: "claude",
	model: "m",
	timestamp: "2026-08-15T00:00:00Z",
	language: "en",
	region: null,
	validity: "valid",
	rawResponseReference: null,
	mention: true,
	position: 1,
	ownedCitation: false,
	citations: [],
	competitors: [],
	factualErrors: [],
	tokenUsage: null,
	cost: null,
	qcStatus: "not_required",
};

describe("canonical ledger export", () => {
	it("rejects cardinality mismatch and emits safe CSV quoting", () => {
		expect(() => assertCanonicalDataset([row], 2)).toThrow("DATASET_CARDINALITY_MISMATCH");
		expect(ledgerToCsv([row])).toContain('"What is Brand, really?"');
	});

	it("never exports private raw response locators", () => {
		const csv = ledgerToCsv([{ ...row, rawResponseReference: "private://raw/answer-1" }]);
		expect(csv).not.toContain("raw_response_reference");
		expect(csv).not.toContain("private://raw/answer-1");
	});
});
