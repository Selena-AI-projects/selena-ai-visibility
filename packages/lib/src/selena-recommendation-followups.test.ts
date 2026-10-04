import { describe, expect, it } from "vitest";
import type { GraderRecommendation } from "./selena-grader-report";
import { recommendationFollowupInputSchema, recommendationKey } from "./selena-recommendation-followups";

function sourcePresence(domain: string): GraderRecommendation {
	return { kind: "SOURCE_PRESENCE", domain, timesCited: 4, timesCitedWithoutBrand: 3 };
}

describe("recommendation follow-up keys", () => {
	it("names one row for one source however the host is spelled", () => {
		expect(recommendationKey(sourcePresence("tripadvisor.com"))).toBe("SOURCE_PRESENCE:tripadvisor.com");
		expect(recommendationKey(sourcePresence("WWW.TripAdvisor.com"))).toBe("SOURCE_PRESENCE:tripadvisor.com");
		expect(recommendationKey(sourcePresence("https://www.tripadvisor.com/Restaurants"))).toBe(
			"SOURCE_PRESENCE:tripadvisor.com",
		);
	});

	it("does not change when the counts behind the recommendation change", () => {
		const first = recommendationKey(sourcePresence("yelp.com"));
		const second = recommendationKey({
			kind: "SOURCE_PRESENCE",
			domain: "yelp.com",
			timesCited: 9,
			timesCitedWithoutBrand: 1,
		});
		expect(second).toBe(first);
	});

	it("tells an own-site recommendation apart from a source recommendation for the same host", () => {
		const ownSite: GraderRecommendation = {
			kind: "OWN_SITE_UNDERCITED",
			domain: "https://www.brand.example/",
			timesCited: 1,
			topExternalDomain: "yelp.com",
			topExternalCited: 7,
		};
		expect(recommendationKey(ownSite)).toBe("OWN_SITE_UNDERCITED:brand.example");
		expect(recommendationKey(ownSite)).not.toBe(recommendationKey(sourcePresence("brand.example")));
	});

	it("keeps a single key for the category-content recommendation", () => {
		const sparse: GraderRecommendation = {
			kind: "CATEGORY_CONTENT",
			missedAnswers: 2,
			categoryAnswers: 5,
			exampleQuestions: ["best massage in town"],
		};
		const dense: GraderRecommendation = { ...sparse, missedAnswers: 5, exampleQuestions: ["spa near me", "day spa"] };
		expect(recommendationKey(sparse)).toBe("CATEGORY_CONTENT");
		expect(recommendationKey(dense)).toBe("CATEGORY_CONTENT");
	});
});

describe("recommendation follow-up input", () => {
	const valid = { status: "IN_PROGRESS", assignee: "Anna", dueOn: "2026-11-30", note: "Reach out to the editor" };

	it("accepts a complete follow-up and one with only a status", () => {
		expect(recommendationFollowupInputSchema.safeParse(valid).success).toBe(true);
		expect(recommendationFollowupInputSchema.safeParse({ status: "DONE" }).success).toBe(true);
	});

	it("rejects a status outside the workflow", () => {
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, status: "LATER" }).success).toBe(false);
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, status: "done" }).success).toBe(false);
	});

	it("rejects a note past two thousand characters", () => {
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, note: "x".repeat(2000) }).success).toBe(true);
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, note: "x".repeat(2001) }).success).toBe(false);
	});

	it("rejects a due date that is not a calendar date", () => {
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, dueOn: "2026-13-45" }).success).toBe(false);
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, dueOn: "30.11.2026" }).success).toBe(false);
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, dueOn: "next week" }).success).toBe(false);
	});
});
