import { describe, expect, it } from "vitest";
import { FirstLiveOrderRefused, parseArgs, planFirstLiveOrder } from "./selena-first-live-order";

describe("planning a first live order", () => {
	it("counts one answer per question per surface", () => {
		const plan = planFirstLiveOrder(["q1", "q2", "q3"], 30);
		expect(plan.expectedRuns).toBe(9);
		expect(plan.surfaces).toEqual(["ChatGPT", "Gemini", "Perplexity"]);
	});

	// The whole point of the ceiling: a full plan is a hundred questions, and
	// reaching for one by mistake is the difference between five cents and
	// forty-five.
	it("refuses a question set that would exceed the allowed answers", () => {
		expect(() => planFirstLiveOrder(new Array(11).fill("q"), 30)).toThrow(FirstLiveOrderRefused);
		expect(() => planFirstLiveOrder(new Array(10).fill("q"), 30)).not.toThrow();
	});

	it("refuses an empty question set rather than ordering nothing", () => {
		expect(() => planFirstLiveOrder([], 30)).toThrow(FirstLiveOrderRefused);
	});
});

describe("arguments", () => {
	it("writes nothing unless the run is confirmed", () => {
		expect(parseArgs(["--questions", "q.txt"]).confirm).toBe(false);
		expect(parseArgs(["--questions", "q.txt", "--confirm"]).confirm).toBe(true);
	});

	it("requires a question file", () => {
		expect(() => parseArgs(["--confirm"])).toThrow(FirstLiveOrderRefused);
	});

	it("rejects a ceiling that is not a positive whole number", () => {
		expect(() => parseArgs(["--questions", "q.txt", "--max-runs", "0"])).toThrow(FirstLiveOrderRefused);
		expect(() => parseArgs(["--questions", "q.txt", "--max-runs", "ten"])).toThrow(FirstLiveOrderRefused);
	});
});
