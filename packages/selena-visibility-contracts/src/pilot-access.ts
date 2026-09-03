/**
 * Who may create an account while the Founding Restaurant Pilot is open.
 *
 * A pilot that is described as "20 invited restaurants" has to be closed by a
 * mechanism, not by a promise. Two rules do that here, and they are
 * deliberately narrower than the cloud signup allowlist:
 *
 *   - Only exact addresses are admitted. There is no "*" and no "@domain"
 *     entry, because either one turns a named guest list back into open
 *     registration, which is the hole this module exists to close.
 *   - The guest list is itself the capacity. Every seat is one address, and
 *     an address can be used once because the auth store keeps email unique,
 *     so the ceiling holds without a counter that two concurrent signups
 *     could both read as "one seat left".
 *
 * The seat cap is kept as a second, independent statement of the same number.
 * It cannot make the ceiling tighter than the guest list already makes it, so
 * a list longer than the cap is refused as a configuration error rather than
 * silently trusted — otherwise the cap would only be advisory.
 */

export const PILOT_ALLOWLIST_ENV = "SELENA_PILOT_SIGNUP_ALLOWLIST";
export const PILOT_SEAT_CAP_ENV = "SELENA_PILOT_SEAT_CAP";

export type PilotSignupDecision =
	| { allowed: true }
	| { allowed: false; reason: "NOT_INVITED" | "PILOT_FULL" | "PILOT_NOT_CONFIGURED" | "ALLOWLIST_EXCEEDS_SEAT_CAP" };

export interface PilotSignupInput {
	email: string;
	allowlist: readonly string[];
	seatCap: number;
	/** Accounts that already exist. Counted by the caller inside its own query. */
	seatsTaken: number;
}

/** Addresses only, lowercased and de-duplicated; anything wildcard-shaped is dropped. */
export function pilotAllowlistFromEnv(env: Record<string, string | undefined>): string[] {
	const entries = (env[PILOT_ALLOWLIST_ENV] ?? "")
		.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter((entry) => entry.length > 0 && entry !== "*" && !entry.startsWith("@") && entry.includes("@"));
	return [...new Set(entries)];
}

/** Unset, unparsable or non-positive means zero seats, which denies everyone. */
export function pilotSeatCapFromEnv(env: Record<string, string | undefined>): number {
	const raw = env[PILOT_SEAT_CAP_ENV]?.trim();
	if (!raw) return 0;
	const value = Number(raw);
	return Number.isInteger(value) && value > 0 ? value : 0;
}

export function evaluatePilotSignup(input: PilotSignupInput): PilotSignupDecision {
	const allowlist = [...new Set(input.allowlist.map((entry) => entry.trim().toLowerCase()).filter(Boolean))];
	if (allowlist.length === 0 || input.seatCap <= 0) return { allowed: false, reason: "PILOT_NOT_CONFIGURED" };
	if (allowlist.length > input.seatCap) return { allowed: false, reason: "ALLOWLIST_EXCEEDS_SEAT_CAP" };
	if (input.seatsTaken >= input.seatCap) return { allowed: false, reason: "PILOT_FULL" };

	const address = input.email.trim().toLowerCase();
	return allowlist.includes(address) ? { allowed: true } : { allowed: false, reason: "NOT_INVITED" };
}

/**
 * What the person trying to sign up is told. A closed pilot should not confirm
 * whether a given address is on the guest list, and it should never report the
 * operator's configuration state, so every refusal reads the same from outside.
 */
export const PILOT_SIGNUP_REFUSAL_MESSAGE = "Registration is open to invited pilot restaurants only.";
