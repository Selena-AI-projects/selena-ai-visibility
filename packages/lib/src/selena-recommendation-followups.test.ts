import { describe, expect, it } from "vitest";
import type { GraderRecommendation } from "./selena-grader-report";
import {
	isFollowupStorageMissing,
	recommendationFollowupInputSchema,
	recommendationKey,
} from "./selena-recommendation-followups";

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
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, dueOn: "2026-02-31" }).success).toBe(false);
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, dueOn: "2028-02-29" }).success).toBe(true);
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, dueOn: "30.11.2026" }).success).toBe(false);
		expect(recommendationFollowupInputSchema.safeParse({ ...valid, dueOn: "next week" }).success).toBe(false);
	});
});

describe("follow-up storage that has not reached the database", () => {
	/** Drizzle wraps the driver's error and keeps it as the cause. */
	function queryFailure(code: string, message: string): Error {
		return new Error("Failed query: select ... from sv_recommendation_followups", {
			cause: Object.assign(new Error(message), { code }),
		});
	}

	it("counts the missing table and a missing grant on it", () => {
		expect(
			isFollowupStorageMissing(queryFailure("42P01", 'relation "sv_recommendation_followups" does not exist')),
		).toBe(true);
		expect(
			isFollowupStorageMissing(queryFailure("42501", "permission denied for table sv_recommendation_followups")),
		).toBe(true);
	});

	it("keeps a row-policy refusal and other tables' failures as real errors", () => {
		expect(
			isFollowupStorageMissing(
				queryFailure("42501", 'new row violates row-level security policy for table "sv_recommendation_followups"'),
			),
		).toBe(false);
		expect(isFollowupStorageMissing(queryFailure("42501", "permission denied for table sv_cycles"))).toBe(false);
		expect(isFollowupStorageMissing(queryFailure("42P01", 'relation "sv_cycles" does not exist'))).toBe(false);
		expect(isFollowupStorageMissing(new Error("connection terminated unexpectedly"))).toBe(false);
	});
});
