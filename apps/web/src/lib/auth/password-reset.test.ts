import { describe, expect, it } from "vitest";
import { canResetPassword } from "./password-reset";

describe("canResetPassword", () => {
	it("enables password resets for cloud and invited self-serve deployments", () => {
		expect(canResetPassword({ mode: "cloud", features: { selfServeSignup: false } })).toBe(true);
		expect(canResetPassword({ mode: "local", features: { selfServeSignup: true } })).toBe(true);
	});

	it("keeps password resets disabled for closed local and demo deployments", () => {
		expect(canResetPassword({ mode: "local", features: { selfServeSignup: false } })).toBe(false);
		expect(canResetPassword({ mode: "demo", features: { selfServeSignup: false } })).toBe(false);
	});
});
