import { describe, expect, it } from "vitest";
import { analyzeAnswer } from "./selena-answer-analysis";
import { readRetainedAnswer } from "./selena-answer-payload";

const brand = { name: "Synthetic Dental Studio" };

function citedDomainsOf(payload: unknown): string[] | null {
	const retained = readRetainedAnswer(payload);
	if (!retained) return null;
	return analyzeAnswer({ text: retained.text, brand, citedUrls: retained.citedUrls }).citedDomains;
}

describe("sources behind a retained answer", () => {
	it("counts the sources the provider reported even when the answer text has no links", () => {
		expect(
			citedDomainsOf({
				answer: { text: "1. Example Smile Clinic\n2. Synthetic Dental Studio" },
				measurement: {
					citations: [
						{ url: "https://www.guide.example/austin", domain: "guide.example" },
						{ url: "https://synthetic-dental.example/", domain: "synthetic-dental.example" },
					],
				},
			}),
		).toEqual(["guide.example", "synthetic-dental.example"]);
	});

	it("still reads links written into the answer itself", () => {
		expect(
			citedDomainsOf({
				answer: { text: "See https://reviews.example/top for the list." },
				measurement: { citations: [{ url: "https://guide.example/a" }] },
			}),
		).toEqual(["guide.example", "reviews.example"]);
	});

	it("reports no sources when neither the provider nor the text gave any", () => {
		expect(citedDomainsOf({ answer: { text: "1. Example Smile Clinic" }, measurement: { citations: null } })).toEqual(
			[],
		);
	});

	it("has nothing to analyze when no answer text was retained", () => {
		expect(
			citedDomainsOf({ answer: { text: "" }, measurement: { citations: [{ url: "https://guide.example" }] } }),
		).toBe(null);
	});
});
