/**
 * The Local Maps owner tasks, read from the owner service's variables.
 *
 * One organization and one acting owner/admin carry the whole flow — setup,
 * canary, status, canary review, pilot approval — so every task reads them from the same
 * SELENA_LOCAL_CANARY_* variables the one-shot canary already requires. The
 * provider identity, version, price and lease are the Local worker's own
 * variables: the lock the setup freezes must match what that worker will
 * send, so the owner sets them once, identically, on both services.
 */
import {
	DATAFORSEO_LOCAL_MAPS_DEFAULT_ENDPOINT,
	DATAFORSEO_LOCAL_MAPS_PROVIDER_ID,
} from "@workspace/lib/adapters/dataforseo-local-maps-rank";
import type { LocalMapsSetupInput } from "@workspace/lib/selena-local-maps-setup";

export const localMapsOwnerTaskKinds = [
	"local-maps-setup",
	"local-maps-canary",
	"local-maps-status",
	"local-maps-canary-review",
	"local-maps-pilot-approve",
] as const;
export type LocalMapsOwnerTaskKind = (typeof localMapsOwnerTaskKinds)[number];

export const LOCAL_ORGANIZATION_ENV = "SELENA_LOCAL_CANARY_ORGANIZATION_ID";
export const LOCAL_ACTOR_ENV = "SELENA_LOCAL_CANARY_ACTOR_ID";
export const LOCAL_LOCK_ENV = "SELENA_LOCAL_CANARY_CONFIGURATION_LOCK_ID";
export const LOCAL_CANARY_CYCLE_ENV = "SELENA_LOCAL_CANARY_CYCLE_ID";
export const LOCAL_CANARY_DECISION_ENV = "SELENA_LOCAL_CANARY_REVIEW_DECISION";
export const LOCAL_PILOT_CYCLE_ENV = "SELENA_LOCAL_PILOT_CYCLE_ID";
export const LOCAL_PILOT_APPROVED_ENV = "SELENA_LOCAL_PILOT_OWNER_APPROVED";
export const LOCAL_PILOT_MAX_SPEND_ENV = "SELENA_LOCAL_PILOT_MAX_SPEND_USD";

/** Inputs of local-maps-setup that only the setup reads. */
export const LOCAL_SETUP_ENV = {
	displayName: "SELENA_LOCAL_SETUP_DISPLAY_NAME",
	countryCode: "SELENA_LOCAL_SETUP_COUNTRY_CODE",
	adminArea: "SELENA_LOCAL_SETUP_ADMIN_AREA",
	locality: "SELENA_LOCAL_SETUP_LOCALITY",
	timezone: "SELENA_LOCAL_SETUP_TIMEZONE",
	latitude: "SELENA_LOCAL_SETUP_LATITUDE",
	longitude: "SELENA_LOCAL_SETUP_LONGITUDE",
	placeId: "SELENA_LOCAL_SETUP_PLACE_ID",
	cid: "SELENA_LOCAL_SETUP_CID",
	mapsUrl: "SELENA_LOCAL_SETUP_MAPS_URL",
	keywords: "SELENA_LOCAL_SETUP_KEYWORDS",
	language: "SELENA_LOCAL_SETUP_LANGUAGE",
	seDomain: "SELENA_LOCAL_SETUP_SE_DOMAIN",
	windowStartsAt: "SELENA_LOCAL_SETUP_WINDOW_STARTS_AT",
	windowEndsAt: "SELENA_LOCAL_SETUP_WINDOW_ENDS_AT",
	priceSnapshotVersion: "SELENA_LOCAL_SETUP_PRICE_SNAPSHOT_VERSION",
} as const;

export const DEFAULT_LOCAL_LANGUAGE = "en";
export const DEFAULT_LOCAL_SE_DOMAIN = "google.com";
const MAX_KEYWORDS = 5;

export type LocalMapsOwnerTask =
	| { kind: "local-maps-setup"; input: LocalMapsSetupInput }
	| { kind: "local-maps-canary" }
	| { kind: "local-maps-status"; organizationId: string; configurationLockId: string }
	| {
			kind: "local-maps-canary-review";
			organizationId: string;
			actorId: string;
			configurationLockId: string;
			canaryCycleId: string;
			decision: "ACCEPTED" | "REJECTED";
	  }
	| {
			kind: "local-maps-pilot-approve";
			organizationId: string;
			actorId: string;
			configurationLockId: string;
			pilotCycleId: string;
			maxSpendUsd: string;
	  };

/** Each refusal names the variable to fix; none echoes the value it refused. */
export type LocalMapsOwnerTaskRefusal = `LOCAL_${string}_${"REQUIRED" | "INVALID"}`;

type Resolved = LocalMapsOwnerTask | { kind: "refused"; reason: LocalMapsOwnerTaskRefusal };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^\S{1,160}$/;
const USD = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;

class Refusal extends Error {
	constructor(readonly reason: LocalMapsOwnerTaskRefusal) {
		super(reason);
	}
}

function refusalName(variable: string): string {
	return variable.replace(/^SELENA_/, "");
}

function text(env: Record<string, string | undefined>, variable: string): string {
	return (env[variable] ?? "").trim();
}

function required(env: Record<string, string | undefined>, variable: string): string {
	const value = text(env, variable);
	if (value === "") throw new Refusal(`${refusalName(variable)}_REQUIRED` as LocalMapsOwnerTaskRefusal);
	return value;
}

function invalid(variable: string): Refusal {
	return new Refusal(`${refusalName(variable)}_INVALID` as LocalMapsOwnerTaskRefusal);
}

function matching(env: Record<string, string | undefined>, variable: string, pattern: RegExp): string {
	const value = required(env, variable);
	if (!pattern.test(value)) throw invalid(variable);
	return value;
}

function coordinate(env: Record<string, string | undefined>, variable: string, limit: number): number {
	const raw = required(env, variable);
	const value = Number(raw);
	if (!/^-?\d{1,3}(?:\.\d+)?$/.test(raw) || !Number.isFinite(value) || Math.abs(value) > limit) throw invalid(variable);
	return value;
}

function isoInstant(env: Record<string, string | undefined>, variable: string): string {
	const raw = required(env, variable);
	const parsed = Date.parse(raw);
	if (
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw) ||
		Number.isNaN(parsed)
	)
		throw invalid(variable);
	return new Date(parsed).toISOString();
}

function timezone(env: Record<string, string | undefined>, variable: string): string {
	const value = required(env, variable);
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: value });
	} catch {
		throw invalid(variable);
	}
	return value;
}

/** The provider identity, price and lease the Local worker will use, read from the same variables. */
function providerInputs(env: Record<string, string | undefined>) {
	const providerId = required(env, "SELENA_LOCAL_MAPS_PROVIDER_ID");
	if (providerId !== DATAFORSEO_LOCAL_MAPS_PROVIDER_ID) throw invalid("SELENA_LOCAL_MAPS_PROVIDER_ID");
	const version = matching(env, "SELENA_LOCAL_DATAFORSEO_VERSION", TOKEN);
	const endpoint = text(env, "SELENA_LOCAL_DATAFORSEO_ENDPOINT") || DATAFORSEO_LOCAL_MAPS_DEFAULT_ENDPOINT;
	try {
		if (new URL(endpoint).protocol !== "https:") throw new Error();
	} catch {
		throw invalid("SELENA_LOCAL_DATAFORSEO_ENDPOINT");
	}
	const perAttempt = matching(env, "SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD", USD);
	if (Number(perAttempt) <= 0) throw invalid("SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD");
	const leaseRaw = required(env, "SELENA_LOCAL_PROVIDER_LEASE_DURATION_MS");
	const lease = Number(leaseRaw);
	// The worker refuses a lease outside this range, so a lock frozen with one could never run.
	if (!/^\d+$/.test(leaseRaw) || !Number.isSafeInteger(lease) || lease < 10_000 || lease > 900_000)
		throw invalid("SELENA_LOCAL_PROVIDER_LEASE_DURATION_MS");
	return { provider: { id: providerId, endpoint, version }, perAttempt, lease };
}

function setupInput(env: Record<string, string | undefined>): LocalMapsSetupInput {
	const organizationId = matching(env, LOCAL_ORGANIZATION_ENV, TOKEN);
	const actorId = matching(env, LOCAL_ACTOR_ENV, TOKEN);
	const displayName = required(env, LOCAL_SETUP_ENV.displayName);
	if (displayName.length > 160) throw invalid(LOCAL_SETUP_ENV.displayName);
	const countryCode = matching(env, LOCAL_SETUP_ENV.countryCode, /^[A-Z]{2}$/);
	const adminArea = text(env, LOCAL_SETUP_ENV.adminArea) || undefined;
	const locality = text(env, LOCAL_SETUP_ENV.locality) || undefined;
	const tz = timezone(env, LOCAL_SETUP_ENV.timezone);
	const latitude = coordinate(env, LOCAL_SETUP_ENV.latitude, 85);
	const longitude = coordinate(env, LOCAL_SETUP_ENV.longitude, 180);
	const placeId = text(env, LOCAL_SETUP_ENV.placeId) || undefined;
	const cid = text(env, LOCAL_SETUP_ENV.cid) || undefined;
	if (!placeId && !cid) throw new Refusal("LOCAL_SETUP_PLACE_ID_OR_CID_REQUIRED");
	if (placeId !== undefined && !/^\S{1,300}$/.test(placeId)) throw invalid(LOCAL_SETUP_ENV.placeId);
	if (cid !== undefined && !/^\d{1,30}$/.test(cid)) throw invalid(LOCAL_SETUP_ENV.cid);
	const mapsUrl = text(env, LOCAL_SETUP_ENV.mapsUrl) || undefined;
	if (mapsUrl !== undefined) {
		try {
			if (new URL(mapsUrl).protocol !== "https:") throw new Error();
		} catch {
			throw invalid(LOCAL_SETUP_ENV.mapsUrl);
		}
	}
	// One keyword per line (or separated by "|"): a keyword may itself contain commas.
	const keywords = (env[LOCAL_SETUP_ENV.keywords] ?? "")
		.split(/\r?\n|\|/)
		.map((keyword) => keyword.trim().replace(/\s+/g, " "))
		.filter((keyword) => keyword !== "");
	if (keywords.length === 0) throw new Refusal("LOCAL_SETUP_KEYWORDS_REQUIRED");
	if (keywords.length > MAX_KEYWORDS || keywords.some((keyword) => keyword.length > 240))
		throw invalid(LOCAL_SETUP_ENV.keywords);
	const language = text(env, LOCAL_SETUP_ENV.language) || DEFAULT_LOCAL_LANGUAGE;
	if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(language)) throw invalid(LOCAL_SETUP_ENV.language);
	const seDomain = text(env, LOCAL_SETUP_ENV.seDomain) || DEFAULT_LOCAL_SE_DOMAIN;
	if (!/^google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(seDomain)) throw invalid(LOCAL_SETUP_ENV.seDomain);
	const startsAt = isoInstant(env, LOCAL_SETUP_ENV.windowStartsAt);
	const endsAt = isoInstant(env, LOCAL_SETUP_ENV.windowEndsAt);
	if (Date.parse(endsAt) <= Date.parse(startsAt)) throw invalid(LOCAL_SETUP_ENV.windowEndsAt);
	const { provider, perAttempt, lease } = providerInputs(env);
	const priceSnapshotVersion =
		text(env, LOCAL_SETUP_ENV.priceSnapshotVersion) || `dataforseo-maps-live-advanced-usd-${perAttempt}`;
	if (!TOKEN.test(priceSnapshotVersion)) throw invalid(LOCAL_SETUP_ENV.priceSnapshotVersion);
	const commit = text(env, "RAILWAY_GIT_COMMIT_SHA");
	return {
		organizationId,
		actorId,
		displayName,
		countryCode,
		adminArea,
		locality,
		timezone: tz,
		latitude,
		longitude,
		placeId,
		cid,
		mapsUrl,
		keywords,
		language,
		seDomain,
		timestampWindow: { startsAt, endsAt },
		provider,
		perAttemptWorstCaseUsd: perAttempt,
		leaseDurationMs: lease,
		priceSnapshotVersion,
		engineSha: /^[a-f0-9]{40}$/.test(commit) ? commit : "unrecorded",
	};
}

export function resolveLocalMapsOwnerTask(
	kind: LocalMapsOwnerTaskKind,
	env: Record<string, string | undefined>,
): Resolved {
	try {
		switch (kind) {
			case "local-maps-setup":
				return { kind, input: setupInput(env) };
			case "local-maps-canary":
				// The one-shot canary validates its own controls before any database work.
				return { kind };
			case "local-maps-status":
				return {
					kind,
					organizationId: matching(env, LOCAL_ORGANIZATION_ENV, TOKEN),
					configurationLockId: matching(env, LOCAL_LOCK_ENV, UUID),
				};
			case "local-maps-canary-review": {
				const organizationId = matching(env, LOCAL_ORGANIZATION_ENV, TOKEN);
				const actorId = matching(env, LOCAL_ACTOR_ENV, TOKEN);
				const configurationLockId = matching(env, LOCAL_LOCK_ENV, UUID);
				const canaryCycleId = matching(env, LOCAL_CANARY_CYCLE_ENV, UUID);
				// No default: a decision on spend the owner has not read is not a decision.
				const decision = matching(env, LOCAL_CANARY_DECISION_ENV, /^(?:ACCEPTED|REJECTED)$/) as "ACCEPTED" | "REJECTED";
				return { kind, organizationId, actorId, configurationLockId, canaryCycleId, decision };
			}
			case "local-maps-pilot-approve": {
				const organizationId = matching(env, LOCAL_ORGANIZATION_ENV, TOKEN);
				const actorId = matching(env, LOCAL_ACTOR_ENV, TOKEN);
				const configurationLockId = matching(env, LOCAL_LOCK_ENV, UUID);
				const pilotCycleId = matching(env, LOCAL_PILOT_CYCLE_ENV, UUID);
				if (text(env, LOCAL_PILOT_APPROVED_ENV) !== "true") throw new Refusal("LOCAL_PILOT_OWNER_APPROVED_REQUIRED");
				const maxSpendUsd = matching(env, LOCAL_PILOT_MAX_SPEND_ENV, USD);
				return { kind, organizationId, actorId, configurationLockId, pilotCycleId, maxSpendUsd };
			}
		}
	} catch (error) {
		if (error instanceof Refusal) return { kind: "refused", reason: error.reason };
		throw error;
	}
}

export function localMapsOwnerTaskUsage(): string[] {
	return [
		`The local-maps-* tasks read ${LOCAL_ORGANIZATION_ENV} and ${LOCAL_ACTOR_ENV} (an owner or admin member of that organization).`,
		`local-maps-setup also reads ${Object.values(LOCAL_SETUP_ENV).join(", ")}, and the Local worker's SELENA_LOCAL_MAPS_PROVIDER_ID, SELENA_LOCAL_DATAFORSEO_VERSION, SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD and SELENA_LOCAL_PROVIDER_LEASE_DURATION_MS.`,
		"local-maps-canary runs the one-shot canary with its SELENA_LOCAL_CANARY_* controls.",
		`local-maps-status reads ${LOCAL_LOCK_ENV}; local-maps-canary-review also reads ${LOCAL_CANARY_CYCLE_ENV} and ${LOCAL_CANARY_DECISION_ENV} (ACCEPTED or REJECTED); local-maps-pilot-approve also reads ${LOCAL_PILOT_CYCLE_ENV}, ${LOCAL_PILOT_APPROVED_ENV}=true and ${LOCAL_PILOT_MAX_SPEND_ENV}.`,
	];
}
