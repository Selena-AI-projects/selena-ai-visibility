import { describe, expect, it } from "vitest";
import {
	ANONYMOUS_SUGGEST_DEFAULT_PER_DAY,
	ANONYMOUS_SUGGEST_DEFAULT_PER_VISITOR_PER_DAY,
	type AnonymousSuggestConfig,
	anonymousSuggestConfigFromEnv,
	decideAnonymousSuggest,
} from "./anonymous-suggest";

const enabled: AnonymousSuggestConfig = { enabled: true, maxPerDay: 40, maxPerVisitorPerDay: 1 };

describe("anonymous suggestion", () => {
	it("stays off until the flag is set, whatever else is true", () => {
		expect(anonymousSuggestConfigFromEnv({}).enabled).toBe(false);
		expect(anonymousSuggestConfigFromEnv({ SELENA_ANONYMOUS_SUGGEST_ENABLED: "1" }).enabled).toBe(false);
		expect(anonymousSuggestConfigFromEnv({ SELENA_ANONYMOUS_SUGGEST_ENABLED: "TRUE" }).enabled).toBe(false);
		expect(
			decideAnonymousSuggest({
				config: { ...enabled, enabled: false },
				suggestedToday: 0,
				suggestedTodayForVisitor: 0,
			}),
		).toEqual({ suggest: false, reason: "DISABLED" });
	});

	it("suggests for a visitor inside both caps", () => {
		expect(
			decideAnonymousSuggest({ config: enabled, suggestedToday: 39, suggestedTodayForVisitor: 0 }),
		).toEqual({ suggest: true });
	});

	it("gives one visitor one suggestion a day", () => {
		expect(
			decideAnonymousSuggest({ config: enabled, suggestedToday: 0, suggestedTodayForVisitor: 1 }),
		).toEqual({ suggest: false, reason: "VISITOR_CAP" });
	});

	it("stops at the day's ceiling even for a visitor who has had none", () => {
		expect(
			decideAnonymousSuggest({ config: enabled, suggestedToday: 40, suggestedTodayForVisitor: 0 }),
		).toEqual({ suggest: false, reason: "DAILY_CAP" });
	});

	it("tells a returning visitor it is their own limit, not the day's", () => {
		expect(
			decideAnonymousSuggest({ config: enabled, suggestedToday: 40, suggestedTodayForVisitor: 1 }),
		).toEqual({ suggest: false, reason: "VISITOR_CAP" });
	});

	it("reads both caps from the environment", () => {
		const config = anonymousSuggestConfigFromEnv({
			SELENA_ANONYMOUS_SUGGEST_ENABLED: "true",
			SELENA_ANONYMOUS_SUGGEST_MAX_PER_DAY: "10",
			SELENA_ANONYMOUS_SUGGEST_MAX_PER_VISITOR_PER_DAY: "2",
		});
		expect(config).toEqual({ enabled: true, maxPerDay: 10, maxPerVisitorPerDay: 2 });
	});

	it("falls back to the conservative default rather than to no limit", () => {
		const config = anonymousSuggestConfigFromEnv({
			SELENA_ANONYMOUS_SUGGEST_ENABLED: "true",
			SELENA_ANONYMOUS_SUGGEST_MAX_PER_DAY: "as many as it takes",
			SELENA_ANONYMOUS_SUGGEST_MAX_PER_VISITOR_PER_DAY: "-3",
		});
		expect(config.maxPerDay).toBe(ANONYMOUS_SUGGEST_DEFAULT_PER_DAY);
		expect(config.maxPerVisitorPerDay).toBe(ANONYMOUS_SUGGEST_DEFAULT_PER_VISITOR_PER_DAY);
	});

	it("reads zero as a closed door, not as an unset value", () => {
		const config = anonymousSuggestConfigFromEnv({
			SELENA_ANONYMOUS_SUGGEST_ENABLED: "true",
			SELENA_ANONYMOUS_SUGGEST_MAX_PER_DAY: "0",
		});
		expect(config.maxPerDay).toBe(0);
		expect(
			decideAnonymousSuggest({ config, suggestedToday: 0, suggestedTodayForVisitor: 0 }),
		).toEqual({ suggest: false, reason: "DAILY_CAP" });
	});
});
