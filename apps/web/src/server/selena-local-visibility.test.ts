import { describe, expect, it } from "vitest";
import { localVisibilityFeatureState } from "./selena-local-visibility";

describe("Selena Local Visibility feature state", () => {
	it("is locked when the flag is absent or not exactly true", () => {
		expect(localVisibilityFeatureState({})).toEqual({ enabled: false, status: "LOCKED" });
		expect(localVisibilityFeatureState({ SELENA_LOCAL_VISIBILITY_ENABLED: "TRUE" })).toEqual({
			enabled: false,
			status: "LOCKED",
		});
	});

	it("opens with UNKNOWN data and never invents zero metrics", () => {
		expect(localVisibilityFeatureState({ SELENA_LOCAL_VISIBILITY_ENABLED: "true" })).toEqual({
			enabled: true,
			status: "UNKNOWN",
		});
	});
});
