import {
	LOCAL_GRID_FORMULA_VERSION,
	LOCAL_GRID_RADIUS_METERS,
	canonicalLocalMapsLockSnapshot,
	mapsLockV1Schema,
	materializeLocalMapsProviderRequest,
	measurementExecutionKey,
	planMapsLockSlots,
	sphericalGridPointsV1,
	type MapsLockV1,
	type LocalMapsMaterializedProviderRequest,
} from "@workspace/selena-visibility-contracts";
type SelenaLocalMeasureData = Readonly<{
	measurementCycleId: string;
	localCycleId: string;
	organizationId: string;
	attemptId: string;
	actorId?: string;
}>;
type SelenaLocalMeasureExecutor = (data: SelenaLocalMeasureData) => Promise<{ status: string; providerCalls: 0 | 1 | "UNKNOWN"; reason: string }>;

const BRIGHT_DATA_ENDPOINT = "https://api.brightdata.com/request";
const BRIGHT_DATA_PROVIDER = "brightdata-google-maps-serp";
const BRIGHT_DATA_VERSION = "brightdata-maps-serp-v1";
const CANARY_CAP_USD = "5.000000" as const;

export type LocalMapsCanaryPlanInput = Readonly<{
	organizationId: string;
	measurementCycleId: string;
	localCycleId: string;
	configurationLockId: string;
	locationId: string;
	keywordSetId: string;
	keywordId: string;
	attemptId: string;
	reservationId: string;
	mapsUrl: string;
	keywordText: string;
	startsAt: string;
	endsAt: string;
	centerLatitude?: number;
	centerLongitude?: number;
}>;

export type LocalMapsCanaryPlan = Readonly<{
	lock: MapsLockV1;
	slot: ReturnType<typeof planMapsLockSlots>[number];
	request: LocalMapsMaterializedProviderRequest;
	dispatch: SelenaLocalMeasureData;
	budgetCapUsd: typeof CANARY_CAP_USD;
	providerCallAuthorized: false;
	lockSnapshotCanonical: string;
}>;

export type LocalMapsCanaryInvocation =
	| { status: "OWNER_GATE_REQUIRED"; providerCalls: 0; reason: "EXPLICIT_PROVIDER_CALL_FLAG_REQUIRED" }
	| Awaited<ReturnType<SelenaLocalMeasureExecutor>>;

function parseAvliMapsIdentity(mapsUrl: string) {
	const parsed = new URL(mapsUrl);
	if (parsed.protocol !== "https:" || !/^(?:www\.)?google\.com$/i.test(parsed.hostname) || !parsed.pathname.startsWith("/maps/place/"))
		throw new Error("LOCAL_MAPS_CANARY_MAPS_URL_INVALID");
	const data = parsed.pathname + parsed.search;
	const cid = data.match(/0x[0-9a-f]+:0x([0-9a-f]+)/i)?.[1];
	if (!cid) throw new Error("LOCAL_MAPS_CANARY_CID_REQUIRED");
	return { mapsUrl: parsed.toString(), cid: `0x${cid}` };
}

function micros(amount: string): bigint {
	const [whole, fraction = ""] = amount.split(".");
	return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
}

/** Builds a frozen, staging-only one-keyword Maps canary plan. No DB, network or provider work occurs. */
export function prepareLocalMapsBrightDataCanary(input: LocalMapsCanaryPlanInput): LocalMapsCanaryPlan {
	const identity = parseAvliMapsIdentity(input.mapsUrl);
	const keywordText = input.keywordText.trim();
	if (keywordText !== "Greek restaurant Uluwatu") throw new Error("LOCAL_MAPS_CANARY_KEYWORD_NOT_APPROVED");
	if (micros(CANARY_CAP_USD) > micros("5.000000")) throw new Error("LOCAL_MAPS_CANARY_CAP_EXCEEDS_OWNER_APPROVAL");
	const centerLatitude = input.centerLatitude ?? -8.8165625;
	const centerLongitude = input.centerLongitude ?? 115.0958125;
	const lock = mapsLockV1Schema.parse({
		schemaVersion: 1,
		domainId: "LOCAL_MAPS",
		lockVersion: 1,
		locationId: input.locationId,
		targetIdentity: { cid: identity.cid, mapsUrl: identity.mapsUrl, identitySource: "USER_CONFIRMED", matchPolicy: "PLACE_ID_OR_CID" },
		grid: sphericalGridPointsV1({ formulaVersion: LOCAL_GRID_FORMULA_VERSION, locationId: input.locationId, centerLatitude, centerLongitude, radiusMeters: LOCAL_GRID_RADIUS_METERS, size: 3 }),
		keywordSet: { id: input.keywordSetId, version: 1, keywordIds: [input.keywordId] },
		provider: { id: BRIGHT_DATA_PROVIDER, endpoint: BRIGHT_DATA_ENDPOINT, version: BRIGHT_DATA_VERSION, rankEvidenceSource: "MAPS_SERP_PROVIDER", placesApiUsed: false },
		request: { device: "MOBILE", os: "android", language: "en", seDomain: "google.com", zoom: 13, depth: 20, searchThisArea: true },
		timestampWindow: { startsAt: input.startsAt, endsAt: input.endsAt },
		repeats: 1,
		expectedSlots: 9,
		maxProviderAttempts: 27,
		retryPolicy: { maxAttemptsPerSlot: 3, genericQueueRetryLimit: 0 },
		budget: { currency: "USD", surfaceCapUsd: CANARY_CAP_USD, monthlyCapUsd: CANARY_CAP_USD, worstCaseCostUsd: "0.040500", priceSnapshotVersion: "brightdata-local-maps-canary-v1" },
	});
	const slot = planMapsLockSlots(input.measurementCycleId, lock)[0];
	if (!slot) throw new Error("LOCAL_MAPS_CANARY_SLOT_MISSING");
	const request = materializeLocalMapsProviderRequest(lock, slot, { id: input.keywordId, text: keywordText, keywordSetId: input.keywordSetId, keywordSetVersion: 1 });
	return Object.freeze({
		lock,
		slot,
		request,
		dispatch: { organizationId: input.organizationId, measurementCycleId: input.measurementCycleId, localCycleId: input.localCycleId, attemptId: input.attemptId },
		budgetCapUsd: CANARY_CAP_USD,
		providerCallAuthorized: false,
		lockSnapshotCanonical: canonicalLocalMapsLockSnapshot(lock),
	});
}

/** Explicit invocation seam. The default and every falsey call stop before provider I/O. */
export async function invokeLocalMapsBrightDataCanary(input: { plan: LocalMapsCanaryPlan; executor: SelenaLocalMeasureExecutor; allowProviderCall?: boolean }): Promise<LocalMapsCanaryInvocation> {
	if (input.allowProviderCall !== true) return { status: "OWNER_GATE_REQUIRED", providerCalls: 0, reason: "EXPLICIT_PROVIDER_CALL_FLAG_REQUIRED" };
	return input.executor(input.plan.dispatch);
}
