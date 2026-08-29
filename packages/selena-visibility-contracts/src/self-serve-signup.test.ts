import { describe, expect, it } from "vitest";
import { selfServeSignupOpen } from "./self-serve-signup.js";

describe("selfServeSignupOpen", () => {
	it("is shut unless the flag says exactly true", () => {
		expect(selfServeSignupOpen({})).toBe(false);
		expect(selfServeSignupOpen({ SELENA_SELF_SERVE_SIGNUP_ENABLED: "false" })).toBe(false);
		// A deploy that meant to open signup and typed "1" gets a closed door
		// rather than a guess, the same as every other flag in this package.
		expect(selfServeSignupOpen({ SELENA_SELF_SERVE_SIGNUP_ENABLED: "1" })).toBe(false);
		expect(selfServeSignupOpen({ SELENA_SELF_SERVE_SIGNUP_ENABLED: "TRUE" })).toBe(false);
	});

	it("opens on the exact string", () => {
		expect(selfServeSignupOpen({ SELENA_SELF_SERVE_SIGNUP_ENABLED: "true" })).toBe(true);
	});
});
