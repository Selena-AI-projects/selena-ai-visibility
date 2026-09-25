import type { LocalMapsMaterializedProviderRequest } from "@workspace/selena-visibility-contracts";
import { describe, expect, it } from "vitest";
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
});
