import { describe, expect, it } from "vitest";
import {
	assertScenariosApproved,
	assertWithinMaxRuns,
	FirstLiveOrderRefused,
	measurementScopeFor,
	nextLockVersion,
	parseArgs,
} from "./selena-first-live-order";

describe("the answer count", () => {
	it("counts one answer per question per surface", () => {
		expect(assertWithinMaxRuns(3, 30)).toBe(9);
	});

	// A full plan is a hundred questions; reaching for one by mistake is the
	// difference between five cents and forty-five.
	it("refuses a question set that would exceed the allowed answers", () => {
		expect(() => assertWithinMaxRuns(11, 30)).toThrow(FirstLiveOrderRefused);
		expect(() => assertWithinMaxRuns(10, 30)).not.toThrow();
	});

	it("refuses an empty set rather than ordering nothing", () => {
		expect(() => assertWithinMaxRuns(0, 30)).toThrow(FirstLiveOrderRefused);
	});
});

describe("the lock snapshot", () => {
	// Without this exact block the admin preflight reports LOCK_SCOPE_PRESENT
	// as false and the order can never be approved.
	it("carries the scope the preflight reads, keyed by systemId", () => {
		expect(measurementScopeFor(["a", "b"])).toEqual({
			scenarios: ["a", "b"],
			systems: [
				{ systemId: "ChatGPT", channel: "VISITOR" },
				{ systemId: "Gemini", channel: "VISITOR" },
				{ systemId: "Perplexity", channel: "VISITOR" },
			],
			repeats: 1,
		});
	});
});

describe("the lock version", () => {
	it("starts at one on a project that has never been locked", () => {
		expect(nextLockVersion([])).toBe(1);
	});

	// The endpoint reads this as the expected next version and rejects anything
	// else, so a rehearsal project with history needs its own frontier.
	it("continues from the highest version the project already carries", () => {
		expect(nextLockVersion([{ version: 1 }, { version: 7 }, { version: 3 }])).toBe(8);
		expect(nextLockVersion([{ version: "4" }])).toBe(5);
	});
});

describe("scenario approval", () => {
	const approved = [
		{ id: "a", status: "APPROVED" },
		{ id: "b", status: "APPROVED" },
	];

	it("accepts a set where every question was approved", () => {
		expect(() => assertScenariosApproved(approved, ["a", "b"])).not.toThrow();
	});

	// Permit creation trusts the ids frozen into the lock and never rechecks
	// them, so a proposed question would be measured as if it had been agreed.
	it("refuses a question still awaiting review", () => {
		expect(() => assertScenariosApproved([...approved, { id: "c", status: "PROPOSED" }], ["a", "c"])).toThrow(
			FirstLiveOrderRefused,
		);
	});

	it("refuses a rejected question", () => {
		expect(() => assertScenariosApproved([{ id: "a", status: "REJECTED" }], ["a"])).toThrow(FirstLiveOrderRefused);
	});

	it("refuses an id the family does not contain", () => {
		expect(() => assertScenariosApproved(approved, ["missing"])).toThrow(FirstLiveOrderRefused);
	});
});

describe("arguments", () => {
	it("requires a known phase", () => {
		expect(() => parseArgs(["--questions", "q.txt"])).toThrow(FirstLiveOrderRefused);
		expect(parseArgs(["propose", "--questions", "q.txt"]).phase).toBe("propose");
		expect(parseArgs(["build", "--scenarios", "s.txt"]).phase).toBe("build");
	});

	it("writes nothing unless the run is confirmed", () => {
		expect(parseArgs(["propose", "--questions", "q.txt"]).confirm).toBe(false);
		expect(parseArgs(["propose", "--questions", "q.txt", "--confirm"]).confirm).toBe(true);
	});

	it("requires an input file", () => {
		expect(() => parseArgs(["build", "--confirm"])).toThrow(FirstLiveOrderRefused);
	});

	it("rejects a ceiling that is not a positive whole number", () => {
		expect(() => parseArgs(["propose", "--questions", "q.txt", "--max-runs", "0"])).toThrow(FirstLiveOrderRefused);
		expect(() => parseArgs(["propose", "--questions", "q.txt", "--max-runs", "ten"])).toThrow(FirstLiveOrderRefused);
	});
});
