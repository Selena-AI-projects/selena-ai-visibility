import assert from "node:assert/strict";
import test from "node:test";
import { resolveOwnerTask } from "./owner-task.js";

const worker = {
	SELENA_LOCAL_MAPS_PROVIDER_ID: "dataforseo-google-maps",
	SELENA_LOCAL_DATAFORSEO_VERSION: "v3",
	SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD: "0.002",
	SELENA_LOCAL_PROVIDER_LEASE_DURATION_MS: "300000",
};

const kora = {
	SELENA_OWNER_TASK: "local-maps-setup",
	SELENA_LOCAL_CANARY_ORGANIZATION_ID: "default",
	SELENA_LOCAL_CANARY_ACTOR_ID: "user-owner-1",
	SELENA_LOCAL_SETUP_DISPLAY_NAME: "KORA Food Hall",
	SELENA_LOCAL_SETUP_COUNTRY_CODE: "ID",
	SELENA_LOCAL_SETUP_ADMIN_AREA: "Bali",
	SELENA_LOCAL_SETUP_LOCALITY: "Ubud",
	SELENA_LOCAL_SETUP_TIMEZONE: "Asia/Makassar",
	SELENA_LOCAL_SETUP_LATITUDE: "-8.506854",
	SELENA_LOCAL_SETUP_LONGITUDE: "115.262482",
	SELENA_LOCAL_SETUP_PLACE_ID: "ChIJ-kora-test",
	SELENA_LOCAL_SETUP_KEYWORDS: "food hall ubud\n  best food court   in ubud  ",
	SELENA_LOCAL_SETUP_WINDOW_STARTS_AT: "2026-10-12T00:00:00Z",
	SELENA_LOCAL_SETUP_WINDOW_ENDS_AT: "2026-10-19T00:00:00Z",
	...worker,
};

test("setup reads one location, its keywords and the Local worker's provider terms", () => {
	const task = resolveOwnerTask(kora);
	assert.equal(task.kind, "local-maps-setup");
	if (task.kind !== "local-maps-setup") return;
	assert.deepEqual(task.input, {
		organizationId: "default",
		actorId: "user-owner-1",
		displayName: "KORA Food Hall",
		countryCode: "ID",
		adminArea: "Bali",
		locality: "Ubud",
		timezone: "Asia/Makassar",
		latitude: -8.506854,
		longitude: 115.262482,
		placeId: "ChIJ-kora-test",
		cid: undefined,
		mapsUrl: undefined,
		keywords: ["food hall ubud", "best food court in ubud"],
		language: "en",
		seDomain: "google.com",
		timestampWindow: { startsAt: "2026-10-12T00:00:00.000Z", endsAt: "2026-10-19T00:00:00.000Z" },
		provider: {
			id: "dataforseo-google-maps",
			endpoint: "https://api.dataforseo.com/v3/serp/google/maps/live/advanced",
			version: "v3",
		},
		perAttemptWorstCaseUsd: "0.002",
		leaseDurationMs: 300000,
		priceSnapshotVersion: "dataforseo-maps-live-advanced-usd-0.002",
		engineSha: "unrecorded",
	});
});

test("setup names the variable it cannot use, before any database work", () => {
	const refused = (env: Record<string, string | undefined>) => {
		const task = resolveOwnerTask({ ...kora, ...env });
		return task.kind === "refused" ? task.reason : task.kind;
	};
	assert.equal(refused({ SELENA_LOCAL_CANARY_ORGANIZATION_ID: "" }), "LOCAL_CANARY_ORGANIZATION_ID_REQUIRED");
	assert.equal(refused({ SELENA_LOCAL_CANARY_ACTOR_ID: undefined }), "LOCAL_CANARY_ACTOR_ID_REQUIRED");
	assert.equal(
		refused({ SELENA_LOCAL_SETUP_PLACE_ID: undefined, SELENA_LOCAL_SETUP_CID: "" }),
		"LOCAL_SETUP_PLACE_ID_OR_CID_REQUIRED",
	);
	assert.equal(refused({ SELENA_LOCAL_SETUP_CID: "0x1a2b" }), "LOCAL_SETUP_CID_INVALID");
	assert.equal(refused({ SELENA_LOCAL_SETUP_LATITUDE: "-91" }), "LOCAL_SETUP_LATITUDE_INVALID");
	assert.equal(refused({ SELENA_LOCAL_SETUP_LONGITUDE: "east" }), "LOCAL_SETUP_LONGITUDE_INVALID");
	assert.equal(refused({ SELENA_LOCAL_SETUP_TIMEZONE: "Bali/Ubud" }), "LOCAL_SETUP_TIMEZONE_INVALID");
	assert.equal(refused({ SELENA_LOCAL_SETUP_COUNTRY_CODE: "id" }), "LOCAL_SETUP_COUNTRY_CODE_INVALID");
	assert.equal(refused({ SELENA_LOCAL_SETUP_KEYWORDS: " \n " }), "LOCAL_SETUP_KEYWORDS_REQUIRED");
	assert.equal(refused({ SELENA_LOCAL_SETUP_KEYWORDS: "a|b|c|d|e|f" }), "LOCAL_SETUP_KEYWORDS_INVALID");
	assert.equal(
		refused({ SELENA_LOCAL_SETUP_WINDOW_ENDS_AT: "2026-10-11T00:00:00Z" }),
		"LOCAL_SETUP_WINDOW_ENDS_AT_INVALID",
	);
	assert.equal(refused({ SELENA_LOCAL_SETUP_WINDOW_STARTS_AT: "next week" }), "LOCAL_SETUP_WINDOW_STARTS_AT_INVALID");
});

test("setup refuses provider terms the Local worker could not run", () => {
	const refused = (env: Record<string, string | undefined>) => {
		const task = resolveOwnerTask({ ...kora, ...env });
		return task.kind === "refused" ? task.reason : task.kind;
	};
	assert.equal(refused({ SELENA_LOCAL_MAPS_PROVIDER_ID: "http-maps" }), "LOCAL_MAPS_PROVIDER_ID_INVALID");
	assert.equal(refused({ SELENA_LOCAL_DATAFORSEO_VERSION: "" }), "LOCAL_DATAFORSEO_VERSION_REQUIRED");
	assert.equal(refused({ SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD: "0" }), "LOCAL_DATAFORSEO_PER_ATTEMPT_USD_INVALID");
	assert.equal(
		refused({ SELENA_LOCAL_PROVIDER_LEASE_DURATION_MS: "5000" }),
		"LOCAL_PROVIDER_LEASE_DURATION_MS_INVALID",
	);
	assert.equal(
		refused({ SELENA_LOCAL_DATAFORSEO_ENDPOINT: "http://api.dataforseo.com/v3" }),
		"LOCAL_DATAFORSEO_ENDPOINT_INVALID",
	);
});

test("keywords may also be separated by a bar, and a recorded commit is kept", () => {
	const task = resolveOwnerTask({
		...kora,
		SELENA_LOCAL_SETUP_KEYWORDS: "food hall ubud | bali food hall",
		RAILWAY_GIT_COMMIT_SHA: "0123456789abcdef0123456789abcdef01234567",
	});
	assert.equal(task.kind, "local-maps-setup");
	if (task.kind !== "local-maps-setup") return;
	assert.deepEqual(task.input.keywords, ["food hall ubud", "bali food hall"]);
	assert.equal(task.input.engineSha, "0123456789abcdef0123456789abcdef01234567");
});

const lockId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const pilotId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const approve = {
	SELENA_OWNER_TASK: "local-maps-pilot-approve",
	SELENA_LOCAL_CANARY_ORGANIZATION_ID: "default",
	SELENA_LOCAL_CANARY_ACTOR_ID: "user-owner-1",
	SELENA_LOCAL_CANARY_CONFIGURATION_LOCK_ID: lockId,
	SELENA_LOCAL_PILOT_CYCLE_ID: pilotId,
	SELENA_LOCAL_PILOT_OWNER_APPROVED: "true",
	SELENA_LOCAL_PILOT_MAX_SPEND_USD: "0.054",
};

test("a pilot is approved only with explicit owner approval, a spend ceiling and exact ids", () => {
	assert.deepEqual(resolveOwnerTask(approve), {
		kind: "local-maps-pilot-approve",
		organizationId: "default",
		actorId: "user-owner-1",
		configurationLockId: lockId,
		pilotCycleId: pilotId,
		maxSpendUsd: "0.054",
	});
	for (const [env, reason] of [
		[{ SELENA_LOCAL_PILOT_OWNER_APPROVED: "yes" }, "LOCAL_PILOT_OWNER_APPROVED_REQUIRED"],
		[{ SELENA_LOCAL_PILOT_MAX_SPEND_USD: undefined }, "LOCAL_PILOT_MAX_SPEND_USD_REQUIRED"],
		[{ SELENA_LOCAL_PILOT_MAX_SPEND_USD: "$1" }, "LOCAL_PILOT_MAX_SPEND_USD_INVALID"],
		[{ SELENA_LOCAL_PILOT_CYCLE_ID: "latest" }, "LOCAL_PILOT_CYCLE_ID_INVALID"],
		[{ SELENA_LOCAL_CANARY_CONFIGURATION_LOCK_ID: "" }, "LOCAL_CANARY_CONFIGURATION_LOCK_ID_REQUIRED"],
	] as const)
		assert.deepEqual(resolveOwnerTask({ ...approve, ...env }), { kind: "refused", reason });
});

test("status reads one lock, and the canary task defers to the one-shot's own controls", () => {
	assert.deepEqual(
		resolveOwnerTask({
			SELENA_OWNER_TASK: "local-maps-status",
			SELENA_LOCAL_CANARY_ORGANIZATION_ID: "default",
			SELENA_LOCAL_CANARY_CONFIGURATION_LOCK_ID: lockId,
		}),
		{ kind: "local-maps-status", organizationId: "default", configurationLockId: lockId },
	);
	assert.deepEqual(resolveOwnerTask({ SELENA_OWNER_TASK: "local-maps-canary" }), { kind: "local-maps-canary" });
});
