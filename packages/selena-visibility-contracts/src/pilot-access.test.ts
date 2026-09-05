import { describe, expect, it } from "vitest";
import {
	evaluatePilotSignup,
	PILOT_ALLOWLIST_ENV,
	PILOT_SEAT_CAP_ENV,
	pilotAllowlistFromEnv,
	pilotSeatCapFromEnv,
} from "./pilot-access.js";

const invited = ["avli@example.com", "kora@example.com"];

describe("pilot signup guest list", () => {
	it("admits an invited address while seats remain", () => {
		expect(
			evaluatePilotSignup({ email: "AVLI@Example.com ", allowlist: invited, seatCap: 20, seatsTaken: 3 }),
		).toEqual({ allowed: true });
	});

	it("refuses an address nobody invited", () => {
		expect(evaluatePilotSignup({ email: "stranger@example.com", allowlist: invited, seatCap: 20, seatsTaken: 3 })).toEqual(
			{ allowed: false, reason: "NOT_INVITED" },
		);
	});

	it("refuses everyone until both the guest list and the cap are configured", () => {
		expect(evaluatePilotSignup({ email: invited[0], allowlist: [], seatCap: 20, seatsTaken: 0 })).toEqual({
			allowed: false,
			reason: "PILOT_NOT_CONFIGURED",
		});
		expect(evaluatePilotSignup({ email: invited[0], allowlist: invited, seatCap: 0, seatsTaken: 0 })).toEqual({
			allowed: false,
			reason: "PILOT_NOT_CONFIGURED",
		});
	});

	it("refuses once the pilot is full, even for an invited address", () => {
		expect(evaluatePilotSignup({ email: invited[0], allowlist: invited, seatCap: 2, seatsTaken: 2 })).toEqual({
			allowed: false,
			reason: "PILOT_FULL",
		});
	});

	/**
	 * A guest list longer than the cap would let the cap be exceeded by
	 * concurrent signups that both read the same count, so the configuration is
	 * refused instead of trusted.
	 */
	it("refuses a guest list longer than the seat cap", () => {
		expect(evaluatePilotSignup({ email: invited[0], allowlist: invited, seatCap: 1, seatsTaken: 0 })).toEqual({
			allowed: false,
			reason: "ALLOWLIST_EXCEEDS_SEAT_CAP",
		});
	});
});

describe("pilot allowlist parsing", () => {
	it("keeps exact addresses and drops every wildcard shape", () => {
		expect(
			pilotAllowlistFromEnv({
				[PILOT_ALLOWLIST_ENV]: " AVLI@example.com , *, @example.com, kora@example.com, , avli@example.com ",
			}),
		).toEqual(["avli@example.com", "kora@example.com"]);
	});

	it("admits nobody through a domain entry that would reopen registration", () => {
		const allowlist = pilotAllowlistFromEnv({ [PILOT_ALLOWLIST_ENV]: "@example.com" });
		expect(evaluatePilotSignup({ email: "anyone@example.com", allowlist, seatCap: 20, seatsTaken: 0 })).toEqual({
			allowed: false,
			reason: "PILOT_NOT_CONFIGURED",
		});
	});
});

describe("seat cap parsing", () => {
	it("reads a positive whole number of seats", () => {
		expect(pilotSeatCapFromEnv({ [PILOT_SEAT_CAP_ENV]: "20" })).toBe(20);
	});

	it("treats unset, fractional, zero and unparsable values as no seats", () => {
		expect(pilotSeatCapFromEnv({} as Record<string, string | undefined>)).toBe(0);
		expect(pilotSeatCapFromEnv({ [PILOT_SEAT_CAP_ENV]: "" })).toBe(0);
		expect(pilotSeatCapFromEnv({ [PILOT_SEAT_CAP_ENV]: "0" })).toBe(0);
		expect(pilotSeatCapFromEnv({ [PILOT_SEAT_CAP_ENV]: "2.5" })).toBe(0);
		expect(pilotSeatCapFromEnv({ [PILOT_SEAT_CAP_ENV]: "twenty" })).toBe(0);
		expect(pilotSeatCapFromEnv({ [PILOT_SEAT_CAP_ENV]: "-5" })).toBe(0);
	});
});
