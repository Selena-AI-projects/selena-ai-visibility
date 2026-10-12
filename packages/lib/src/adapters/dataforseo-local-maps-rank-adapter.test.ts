import {
	LOCAL_GRID_FORMULA_VERSION,
	type LocalMapsMaterializedProviderRequest,
	mapsLockV1Schema,
	materializeLocalMapsProviderRequest,
	planMapsLockSlots,
	sphericalGridPointsV1,
} from "@workspace/selena-visibility-contracts";
import { describe, expect, it, vi } from "vitest";
import { createDataForSeoLocalMapsRankAdapter } from "./dataforseo-local-maps-rank-adapter";

const env = {
	DATAFORSEO_LOGIN: "login",
	DATAFORSEO_PASSWORD: "password",
	SELENA_LOCAL_DATAFORSEO_VERSION: "v3-test",
	SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD: "0.002",
};

// normalize() reads only the target identity, the point, the keyword and the request params.
const task = {
	targetIdentity: { cid: "300" },
	point: { id: "point-4", pointIndex: 4, latitude: -8.5, longitude: 115.26 },
	keyword: { id: "keyword-1", text: "hotel ubud" },
	params: { language: "en", seDomain: "google.com", os: "android", depth: 20, searchThisArea: true },
} as unknown as LocalMapsMaterializedProviderRequest;

function response(items: Array<Record<string, unknown>>, cost: number | undefined = 0.002) {
	const body = { status_code: 20000, cost, tasks: [{ id: "task-1", status_code: 20000, result: [{ items }] }] };
	return { ...body, __rawResponseBody: JSON.stringify(body), __task: task };
}

describe("DataForSEO Local Maps rank adapter", () => {
	it("cannot be created without an approved price and version", () => {
		expect(() => createDataForSeoLocalMapsRankAdapter({ ...env, SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD: "" })).toThrow(
			"LOCAL_DATAFORSEO_CONFIGURATION_REQUIRED",
		);
		expect(() => createDataForSeoLocalMapsRankAdapter({ ...env, SELENA_LOCAL_DATAFORSEO_VERSION: undefined })).toThrow(
			"LOCAL_DATAFORSEO_CONFIGURATION_REQUIRED",
		);
	});

	it("ranks the target by its organic place, never by an ad for it", () => {
		const adapter = createDataForSeoLocalMapsRankAdapter(env);
		const result = adapter.normalize(
			response([
				{ type: "maps_paid_item", cid: "300", rank_group: 1 },
				{ type: "maps_search", cid: "100", rank_group: 1 },
				{ type: "maps_search", cid: "300", rank_group: 2 },
			]),
		);
		expect(result).toMatchObject({ event: { kind: "FOUND" }, targetRank: 2, evidenceEligible: true });
		expect(result.cost).toEqual({ status: "KNOWN", currency: "USD", amountUsd: "0.002", basis: "actual" });
	});

	it("records a target missing from the returned depth as evidence of absence", () => {
		const result = createDataForSeoLocalMapsRankAdapter(env).normalize(
			response([{ type: "maps_search", cid: "100", rank_group: 1 }]),
		);
		expect(result).toMatchObject({ event: { kind: "ABSENT_WITHIN_DEPTH" }, targetRank: null, evidenceEligible: true });
	});

	it("never treats a rejected login as a measurement", () => {
		const result = createDataForSeoLocalMapsRankAdapter(env).normalize({
			status_code: 401,
			__httpStatus: 401,
			__rawResponseBody: "unauthorized",
			__task: task,
		});
		expect(result).toMatchObject({ event: { kind: "PROVIDER_AUTH_FAILURE" }, evidenceEligible: false });
	});

	it("leaves the cost unknown when a failed call reports none", () => {
		const result = createDataForSeoLocalMapsRankAdapter(env).normalize({
			status_code: 502,
			__httpStatus: 502,
			__rawResponseBody: "bad gateway",
			__task: task,
		});
		expect(result).toMatchObject({ event: { kind: "OUTCOME_UNKNOWN" }, evidenceEligible: false });
		expect(result.cost).toMatchObject({ status: "UNKNOWN", amountUsd: null });
	});

	it("asks DataForSEO for the locked point at zoom 13 in its z-suffixed coordinate format", async () => {
		const locationId = "11111111-1111-4111-8111-111111111111";
		const keywordId = "22222222-2222-4222-8222-222222222222";
		const lock = mapsLockV1Schema.parse({
			schemaVersion: 1,
			domainId: "LOCAL_MAPS",
			lockVersion: 1,
			locationId,
			targetIdentity: {
				placeId: "ChIJ-wire-test",
				mapsUrl: "https://maps.example/wire-test",
				identitySource: "USER_CONFIRMED",
				matchPolicy: "PLACE_ID_OR_CID",
			},
			grid: sphericalGridPointsV1({
				formulaVersion: LOCAL_GRID_FORMULA_VERSION,
				locationId,
				centerLatitude: -8.506854,
				centerLongitude: 115.262482,
				radiusMeters: 3000,
				size: 3,
			}),
			keywordSet: {
				id: "77777777-7777-4777-8777-777777777777",
				version: 1,
				keywordIds: [keywordId],
				keywords: [{ id: keywordId, text: "food hall ubud", language: "en" }],
			},
			provider: {
				id: "dataforseo-google-maps",
				endpoint: "https://api.dataforseo.com/v3/serp/google/maps/live/advanced",
				version: "v3-test",
				rankEvidenceSource: "MAPS_SERP_PROVIDER",
				placesApiUsed: false,
			},
			request: {
				device: "MOBILE",
				os: "android",
				language: "en",
				seDomain: "google.com",
				zoom: 13,
				depth: 20,
				searchThisArea: true,
			},
			timestampWindow: { startsAt: "2026-10-12T00:00:00.000Z", endsAt: "2026-10-19T00:00:00.000Z" },
			repeats: 1,
			expectedSlots: 9,
			maxProviderAttempts: 27,
			retryPolicy: { maxAttemptsPerSlot: 3, genericQueueRetryLimit: 0 },
			budget: {
				currency: "USD",
				surfaceCapUsd: "0.054000",
				monthlyCapUsd: "0.054000",
				worstCaseCostUsd: "0.054000",
				priceSnapshotVersion: "wire-test-price",
			},
		});
		const center = planMapsLockSlots("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", lock).find(
			(slot) => slot.pointIndex === 4,
		);
		if (!center) throw new Error("TEST_CENTER_SLOT_MISSING");
		const wireTask = materializeLocalMapsProviderRequest(lock, center, {
			id: keywordId,
			text: "food hall ubud",
			keywordSetId: lock.keywordSet.id,
			keywordSetVersion: 1,
		});
		const requests: unknown[] = [];
		vi.stubGlobal(
			"fetch",
			vi.fn(async (_url: string, init: { body: string }) => {
				requests.push(JSON.parse(init.body));
				return new Response(JSON.stringify({ status_code: 20000, cost: 0.002, tasks: [] }), { status: 200 });
			}),
		);
		try {
			await createDataForSeoLocalMapsRankAdapter(env).execute(wireTask, {
				organizationId: "default",
				attemptId: "33333333-3333-4333-8333-333333333333",
				reservationId: "44444444-4444-4444-8444-444444444444",
				executionKey: center.executionKey,
				attemptIndex: 1,
			});
		} finally {
			vi.unstubAllGlobals();
		}
		// One live call, one task: the body is DataForSEO's array of task objects.
		expect(requests).toEqual([
			[
				{
					keyword: "food hall ubud",
					location_coordinate: "-8.506854,115.262482,13z",
					language_code: "en",
					se_domain: "google.com",
					device: "mobile",
					os: "android",
					depth: 20,
					search_this_area: true,
				},
			],
		]);
	});
});
