import { ENV_REGISTRY } from "./env-registry";
import { parseScrapeTargets } from "./scrape-targets";
import type { DeploymentMode, EnvRequirement } from "./types";

export type EnvMap = Record<string, string | undefined>;

export interface MissingEnvVar {
	id: string;
	label: string;
	description?: string;
}

/**
 * Check if an environment variable has a non-empty value
 */
export const hasValue = (value: string | undefined): boolean => typeof value === "string" && value.trim().length > 0;

/**
 * Create a requirement checker that requires all specified keys to have values
 */
export const requireAll =
	(keys: string[]) =>
	(env: EnvMap): boolean =>
		keys.every((key) => hasValue(env[key]));

/**
 * Create a requirement checker that is satisfied when any key has a value.
 */
export const requireAny =
	(keys: string[]) =>
	(env: EnvMap): boolean =>
		keys.some((key) => hasValue(env[key]));

/**
 * Create a simple env requirement for a single key
 */
export function createEnvRequirement(key: string, description?: string): EnvRequirement {
	return {
		id: key,
		label: key,
		description,
		isSatisfied: requireAll([key]),
	};
}

/**
 * Requirements for every registry var hard-required by the given mode.
 */
function buildStaticRequirements(mode: DeploymentMode): EnvRequirement[] {
	return ENV_REGISTRY.filter((spec) => Array.isArray(spec.requiredBy) && spec.requiredBy.includes(mode)).map((spec) =>
		createEnvRequirement(spec.name, spec.description),
	);
}

/**
 * Build env requirements for exactly the provider keys referenced by SCRAPE_TARGETS.
 */
function buildProviderKeyRequirements(env: EnvMap = process.env): EnvRequirement[] {
	let providers: string[];
	try {
		providers = [...new Set(parseScrapeTargets(env.SCRAPE_TARGETS).map((target) => target.provider))];
	} catch {
		// A missing or malformed SCRAPE_TARGETS is reported by its own
		// requirement (and rejected at worker boot); provider keys can't be
		// derived from it.
		return [];
	}

	const requirements: EnvRequirement[] = [];
	for (const provider of providers) {
		const keys = ENV_REGISTRY.filter(
			(spec) => spec.requiredBy === "dynamic-scrape-targets" && spec.provider === provider,
		).map((spec) => spec.name);
		if (keys.length === 0) continue;
		requirements.push({
			id: `PROVIDER_${provider.toUpperCase().replace(/-/g, "_")}`,
			label: keys.join(" + "),
			description: `Required by SCRAPE_TARGETS provider "${provider}".`,
			isSatisfied: requireAll(keys),
		});
	}

	return requirements;
}

export const ENV_REQUIREMENTS: Record<DeploymentMode, EnvRequirement[]> = {
	local: [...buildStaticRequirements("local"), ...buildProviderKeyRequirements()],
	demo: [...buildStaticRequirements("demo"), ...buildProviderKeyRequirements()],
	whitelabel: [...buildStaticRequirements("whitelabel"), ...buildProviderKeyRequirements()],
	cloud: [...buildStaticRequirements("cloud"), ...buildProviderKeyRequirements()],
};

/**
 * Get the deployment mode from environment variables
 *
 * Defaults to "local" for OSS builds. The build system should set
 * DEPLOYMENT_MODE appropriately for each environment.
 */
const VALID_MODES: DeploymentMode[] = ["local", "demo", "whitelabel", "cloud"];

export function getDeploymentModeFromEnv(env: EnvMap = process.env): DeploymentMode {
	const mode = env.DEPLOYMENT_MODE?.toLowerCase();

	if (!mode) {
		throw new Error("DEPLOYMENT_MODE environment variable is required");
	}

	if (!VALID_MODES.includes(mode as DeploymentMode)) {
		throw new Error(`Invalid DEPLOYMENT_MODE: "${mode}". Must be one of: ${VALID_MODES.join(", ")}`);
	}

	return mode as DeploymentMode;
}

export function getEnvRequirements(mode: DeploymentMode): EnvRequirement[] {
	return ENV_REQUIREMENTS[mode];
}

export function getEnvValidationState(env: EnvMap = process.env): {
	mode: DeploymentMode;
	requirements: EnvRequirement[];
	missing: MissingEnvVar[];
	isValid: boolean;
} {
	const mode = getDeploymentModeFromEnv(env);
	const requirements = getEnvRequirements(mode);
	const missing = requirements
		.filter((requirement) => !requirement.isSatisfied(env))
		.map((requirement) => ({
			id: requirement.id,
			label: requirement.label,
			description: requirement.description,
		}));

	return {
		mode,
		requirements,
		missing,
		isValid: missing.length === 0,
	};
}

/**
 * Validate environment variables against a specific set of requirements
 * Used by deployment packages to validate their specific requirements
 */
export function validateEnvRequirements(
	requirements: EnvRequirement[],
	env: EnvMap = process.env,
): {
	missing: MissingEnvVar[];
	isValid: boolean;
} {
	const missing = requirements
		.filter((requirement) => !requirement.isSatisfied(env))
		.map((requirement) => ({
			id: requirement.id,
			label: requirement.label,
			description: requirement.description,
		}));

	return {
		missing,
		isValid: missing.length === 0,
	};
}

function formatMissingEnvVars(keys: string[]): string {
	return keys.length === 1
		? `Missing required environment variable: ${keys[0]}`
		: `Missing required environment variables: ${keys.join(", ")}`;
}

/**
 * Require one or more environment variables, throwing a single error that names
 * every missing key. Returns the resolved values keyed by the requested names.
 */
export function requireEnvVars<const K extends string>(
	keys: readonly K[],
	env: EnvMap = process.env,
): Record<K, string> {
	const missing = keys.filter((key) => !hasValue(env[key]));
	if (missing.length > 0) {
		throw new Error(formatMissingEnvVars(missing));
	}
	return Object.fromEntries(keys.map((key) => [key, env[key]!])) as Record<K, string>;
}

/**
 * Get an optional environment variable with a default value
 */
export function getEnv(key: string, defaultValue: string, env: EnvMap = process.env): string {
	const value = env[key];
	return hasValue(value) ? value! : defaultValue;
}

/**
 * Variables the deployment sets that no code reads.
 *
 * Every Selena gate is fail-closed on the exact string, which is the right
 * default and also the reason a typo is invisible: `SELENA_EMERGENCE_STOP` is
 * not a broken stop, it is no stop at all, and nothing complains. Boot prints
 * the ones it does not recognise, with the closest name it does, so the
 * mistake is found by reading the log rather than by discovering later that a
 * ceiling was never in force.
 *
 * Names outside the product runtime — the migration runner's own settings, and
 * whatever the host injects — are not the app's to know about, so they are not
 * reported.
 */
const MIGRATION_RUNNER_ENV_NAMES: ReadonlySet<string> = new Set([
	"SELENA_MIGRATIONS_DIR",
	"SELENA_MIGRATION_MAX_INDEX",
	"SELENA_MIGRATION_APPROVED_SHA",
	"SELENA_MIGRATION_APPROVAL_REQUIRED",
	"SELENA_MIGRATION_SOURCE_SHA",
	"SELENA_BOUNDED_MIGRATIONS_DIR",
]);

function editDistance(left: string, right: string): number {
	const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
	for (let i = 1; i <= left.length; i += 1) {
		let diagonal = previous[0];
		previous[0] = i;
		for (let j = 1; j <= right.length; j += 1) {
			const candidate = Math.min(
				previous[j] + 1,
				previous[j - 1] + 1,
				diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
			);
			diagonal = previous[j];
			previous[j] = candidate;
		}
	}
	return previous[right.length];
}

/** The registered name a misspelling most likely meant, when one is close enough. */
export function nearestKnownEnvName(name: string): string | null {
	let best: { name: string; distance: number } | null = null;
	for (const spec of ENV_REGISTRY) {
		const distance = editDistance(name, spec.name);
		if (!best || distance < best.distance) best = { name: spec.name, distance };
	}
	// Beyond a third of the name, a "did you mean" is guessing rather than helping.
	return best && best.distance <= Math.max(2, Math.floor(name.length / 3)) ? best.name : null;
}

export function unknownSelenaEnvNames(env: EnvMap = process.env): string[] {
	const known = new Set(ENV_REGISTRY.map((spec) => spec.name));
	return Object.keys(env)
		.filter((name) => name.startsWith("SELENA_"))
		.filter((name) => !known.has(name) && !MIGRATION_RUNNER_ENV_NAMES.has(name))
		.sort();
}

/**
 * Prints rather than throws. An unrecognised variable is usually a typo and
 * sometimes a leftover from a previous release; neither is worth refusing to
 * start a service over, and both are worth seeing.
 */
export function reportUnknownSelenaEnv(env: EnvMap = process.env, log: (message: string) => void = console.warn): void {
	for (const name of unknownSelenaEnvNames(env)) {
		const suggestion = nearestKnownEnvName(name);
		log(`[env] ${name} is set but nothing reads it${suggestion ? ` — did you mean ${suggestion}?` : ""}`);
	}
}
