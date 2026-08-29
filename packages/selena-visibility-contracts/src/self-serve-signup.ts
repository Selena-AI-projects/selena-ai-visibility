/**
 * Whether a stranger may create an account without the owner letting them in.
 *
 * The deployment's own modes offer two answers and neither fits: `cloud` opens
 * signup but drags in email verification, Google OAuth and Stripe, none of
 * which exist here yet; `local` opens it for exactly one person and closes it
 * behind them, which is why registration disappeared after the owner signed up.
 *
 * This flag is the third answer — signup open, everything else untouched — and
 * it is default-off, so a deploy alone never opens the door.
 *
 * The value is compared to the string `true` literally, like every other flag
 * in this package: `1`, `TRUE` and `yes` read as off, and silently, because a
 * flag that guesses at intent is worse than one that stays shut.
 */
export function selfServeSignupOpen(env: Record<string, string | undefined>): boolean {
	return env.SELENA_SELF_SERVE_SIGNUP_ENABLED === "true";
}
