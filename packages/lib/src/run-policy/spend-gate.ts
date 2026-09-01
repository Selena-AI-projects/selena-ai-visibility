/**
 * One boundary in front of every provider call that costs money.
 *
 * Three paths can reach a paid vendor: the Selena measurement runner, the
 * legacy Elmo onboarding analysis, and the Selena onboarding suggestion. The
 * first is protected by permits and an emergency stop; the other two were
 * protected by nothing at all, and the suggestion is a button a signed-in
 * customer presses that spends real money on a live API key.
 *
 * Pure and env-driven so the same rule can be asserted in the web app, in the
 * worker, and inside the provider call itself, and unit-tested without any of
 * them.
 */

export const PROVIDER_STOP_ENV = "SELENA_EMERGENCY_STOP";
export const MEASUREMENT_ENABLED_ENV = "SELENA_MEASUREMENT_ENABLED";
export const SUGGEST_BUDGET_ENV = "SELENA_SUGGEST_LLM";

/** The only value that turns the onboarding suggestion's spending on. */
export const SUGGEST_FREE_BUDGET_CLASS = "free_budget";

type Env = Record<string, string | undefined>;

export function isGlobalProviderStopEngaged(env: Env = process.env): boolean {
	return env[PROVIDER_STOP_ENV] === "true";
}

/**
 * Legacy prompt and report execution is opt-in and shares Selena's global
 * emergency stop. An unset or misspelled measurement flag is deliberately off.
 */
export function isLegacyProviderExecutionEnabled(env: Env = process.env): boolean {
	return env[MEASUREMENT_ENABLED_ENV] === "true" && !isGlobalProviderStopEngaged(env);
}

/** Run one provider transport only while legacy measurement is explicitly enabled. */
export async function executeLegacyProviderTransport<T>(
	transport: () => Promise<T>,
	env: Env = process.env,
): Promise<T> {
	if (!isLegacyProviderExecutionEnabled(env)) throw new Error("LEGACY_PROVIDER_EXECUTION_DISABLED");
	return transport();
}

/**
 * Enqueue legacy paid work only while execution is enabled. Undefined means
 * the action was intentionally skipped before the queue client was touched.
 */
export async function enqueueLegacyProviderWork<T>(
	enqueue: () => Promise<T>,
	env: Env = process.env,
): Promise<T | undefined> {
	if (!isLegacyProviderExecutionEnabled(env)) return undefined;
	return enqueue();
}

/**
 * The stop has to hold for every provider path, not only for measurement:
 * a stop that halts paid runs while an onboarding button keeps calling a
 * vendor is not a stop.
 */
export function assertGlobalProviderStop(env: Env = process.env): void {
	if (isGlobalProviderStopEngaged(env)) throw new Error("PROVIDER_CALLS_STOPPED");
}

/**
 * Whether the onboarding suggestion may call a paid model.
 *
 * Refused unless the owner has named the budget class explicitly: unset is
 * off, and so is any other value. The suggestion is worth having, but it is a
 * free feature with a real invoice behind it, and the customer pressing the
 * button has no idea of that — so switching it on is a deliberate act with a
 * name attached, the same shape as the measurement adapter allowlist.
 *
 * The class is a gate, not a meter. Nothing here counts calls or dollars; the
 * spend limit that actually holds is the cap on the provider account itself.
 */
export function assertSuggestSpendAllowed(env: Env = process.env): void {
	assertGlobalProviderStop(env);
	if (env[SUGGEST_BUDGET_ENV] !== SUGGEST_FREE_BUDGET_CLASS) throw new Error("SUGGEST_LLM_NOT_BUDGETED");
}
