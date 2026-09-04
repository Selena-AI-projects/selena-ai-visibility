import { describe, expect, it } from "vitest";
import { parseCycleRunsOptions, presentAnswer, summariseLedger } from "../../server/selena-cycle-runs-view";

const options = (query: string) => parseCycleRunsOptions(new URL(`https://example.test/runs${query}`));

describe("what a cycle read costs the caller", () => {
	// Answer text is the heaviest field on the row and the one retention is
	// meant to remove on a schedule, so it is opt-in rather than default.
	it("withholds answer text until it is asked for", () => {
		expect(presentAnswer({ state: "present", text: "KORA Food Hall" }, false)).toEqual({
			state: "present",
			length: 14,
		});
		expect(presentAnswer({ state: "present", text: "KORA Food Hall" }, true)).toEqual({
			state: "present",
			text: "KORA Food Hall",
		});
	});

	it("still says when retention removed the text", () => {
		const deleted = { state: "deleted", deletedAt: "2026-09-04T00:00:00.000Z" } as const;
		expect(presentAnswer(deleted, false)).toEqual(deleted);
	});

	it("asks for text only on the documented spelling", () => {
		expect(options("").includeAnswers).toBe(false);
		expect(options("?answers=text").includeAnswers).toBe(true);
		expect(options("?answers=true").includeAnswers).toBe(false);
	});

	it("keeps one page bounded whatever the caller asks for", () => {
		expect(options("").limit).toBe(200);
		expect(options("?limit=30").limit).toBe(30);
		expect(options("?limit=5000").limit).toBe(200);
		expect(options("?limit=0").limit).toBe(200);
		expect(options("?limit=abc").limit).toBe(200);
	});
});

describe("the spend a cycle reports", () => {
	// An operator closing a cycle has to be able to tell a provider's own
	// figure from our estimate, so the split travels next to the total.
	it("splits the total by basis and by provider", () => {
		expect(
			summariseLedger([
				{ amountUsd: "0.001500", basis: "actual", provider: "brightdata" },
				{ amountUsd: "0.001500", basis: "actual", provider: "brightdata" },
				{ amountUsd: "0.002000", basis: "estimated", provider: "openrouter" },
			]),
		).toEqual({
			events: 3,
			totalUsd: 0.005,
			byBasis: { actual: 0.003, estimated: 0.002 },
			byProvider: { brightdata: 0.003, openrouter: 0.002 },
		});
	});

	it("reports an unbilled cycle as zero rather than as missing", () => {
		expect(summariseLedger([])).toEqual({ events: 0, totalUsd: 0, byBasis: {}, byProvider: {} });
	});
});
