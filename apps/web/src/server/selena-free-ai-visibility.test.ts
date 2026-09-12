import { describe, expect, it } from "vitest";
import { freeAiVisibilityFeatureState } from "./selena-free-ai-visibility";

describe("free AI visibility feature state", () => {
	it("fails closed unless the exact opt-in is present", () => {
		expect(freeAiVisibilityFeatureState({})).toEqual({ enabled: false });
		expect(freeAiVisibilityFeatureState({ SELENA_FREE_AI_VISIBILITY_ENABLED: "TRUE" })).toEqual({ enabled: false });
		expect(freeAiVisibilityFeatureState({ SELENA_FREE_AI_VISIBILITY_ENABLED: "true" })).toEqual({ enabled: true });
	});
});
