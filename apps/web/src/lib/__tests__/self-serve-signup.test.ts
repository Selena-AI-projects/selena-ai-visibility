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
import {
	evaluatePilotSignup,
	pilotAllowlistFromEnv,
	pilotSeatCapFromEnv,
} from "@workspace/selena-visibility-contracts";
import { beforeEach, describe, expect, it } from "vitest";

function canRegister(env: Record<string, string | undefined>, hasUsers: boolean): boolean {
	const deployment = getDeployment({ env: { DEPLOYMENT_MODE: "local", ...env } });
	return deployment.features.selfServeSignup || (deployment.mode === "local" && !hasUsers);
}

/** The door as apps/web/src/lib/auth/server.ts actually opens it. */
function admits(env: Record<string, string | undefined>, email: string, seatsTaken: number): boolean {
	const deployment = getDeployment({ env: { DEPLOYMENT_MODE: "local", ...env } });
	if (!deployment.features.selfServeSignup) return seatsTaken === 0;
	return evaluatePilotSignup({
		email,
		allowlist: pilotAllowlistFromEnv(env),
		seatCap: pilotSeatCapFromEnv(env),
		seatsTaken,
	}).allowed;
}

const open = {
	SELENA_SELF_SERVE_SIGNUP_ENABLED: "true",
	SELENA_PILOT_SIGNUP_ALLOWLIST: "avli@example.com,kora@example.com",
	SELENA_PILOT_SEAT_CAP: "20",
};

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
		expect(canRegister({ SELENA_SELF_SERVE_SIGNUP_ENABLED: "true" }, true)).toBe(true);
	});

	it("treats anything but the exact string 'true' as closed", () => {
		for (const value of ["1", "TRUE", "yes", ""]) {
			resetDeploymentCache();
			expect(canRegister({ SELENA_SELF_SERVE_SIGNUP_ENABLED: value }, true)).toBe(false);
		}
	});

	it("never opens in demo mode, where the shared demo login is the point", () => {
		const deployment = getDeployment({
			env: { DEPLOYMENT_MODE: "demo", SELENA_SELF_SERVE_SIGNUP_ENABLED: "true" },
		});
		expect(deployment.mode).toBe("demo");
		expect(deployment.features.selfServeSignup).toBe(false);
	});
});

/**
 * Opening the door is not the same as opening registration. These cases are
 * the reason the flag exists at all: the pilot is twenty named restaurants,
 * and the deployment has to be able to prove that rather than promise it.
 */
describe("pilot guest list behind the open door", () => {
	beforeEach(() => {
		resetDeploymentCache();
	});

	it("admits an invited restaurant", () => {
		expect(admits(open, "kora@example.com", 5)).toBe(true);
	});

	it("refuses a stranger even with the door open", () => {
		expect(admits(open, "stranger@example.com", 5)).toBe(false);
	});

	it("refuses everyone when the door is open but no guest list was configured", () => {
		expect(admits({ SELENA_SELF_SERVE_SIGNUP_ENABLED: "true" }, "kora@example.com", 5)).toBe(false);
	});

	it("refuses once the seats are gone", () => {
		expect(admits({ ...open, SELENA_PILOT_SEAT_CAP: "2" }, "kora@example.com", 2)).toBe(false);
	});
});
