/**
 * The self-serve signup door: who may create an account on a deployment that
 * already has users.
 *
 * The flag alone is only half of it — apps/web/src/lib/auth/server.ts gives
 * each new signup its own workspace when the door is open, because the shared
 * local organization would otherwise seat strangers beside the operator's own
 * brands.
 */
import { getDeployment, resetDeploymentCache } from "@workspace/deployment";
import { beforeEach, describe, expect, it } from "vitest";

function canRegister(env: Record<string, string | undefined>, hasUsers: boolean): boolean {
	const deployment = getDeployment({ env: { DEPLOYMENT_MODE: "local", ...env } });
	return deployment.features.selfServeSignup || (deployment.mode === "local" && !hasUsers);
}

describe("self-serve signup", () => {
	beforeEach(() => {
		resetDeploymentCache();
	});

	it("stays closed on a bootstrapped instance by default", () => {
		expect(canRegister({}, true)).toBe(false);
	});

	it("still admits the very first signup on an empty database", () => {
		expect(canRegister({}, false)).toBe(true);
	});

	it("opens on a bootstrapped instance once the deployment opts in", () => {
		expect(canRegister({ SELENA_SELF_SERVE_SIGNUP: "true" }, true)).toBe(true);
	});

	it("treats anything but the exact string 'true' as closed", () => {
		for (const value of ["1", "TRUE", "yes", ""]) {
			resetDeploymentCache();
			expect(canRegister({ SELENA_SELF_SERVE_SIGNUP: value }, true)).toBe(false);
		}
	});

	it("never opens in demo mode, where the shared demo login is the point", () => {
		const deployment = getDeployment({
			env: { DEPLOYMENT_MODE: "demo", SELENA_SELF_SERVE_SIGNUP: "true" },
		});
		expect(deployment.mode).toBe("demo");
		expect(deployment.features.selfServeSignup).toBe(false);
	});
});
