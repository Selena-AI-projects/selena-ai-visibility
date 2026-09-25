import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractLocalCompetitors } from "./selena-local-competitors";
import { localIdentityFromMapsUrl } from "./selena-local-customer-location";

const request = { keyword: "hotel ubud", language: "en", locationCoordinate: "-8.5,115.26,13z" };

function providerBody(items: unknown[]) {
	return JSON.stringify({
		status_code: 20000,
		tasks: [
			{
				id: "task-1",
				status_code: 20000,
				data: {
					keyword: request.keyword,
					language_code: request.language,
					location_coordinate: request.locationCoordinate,
				},
				result: [{ items }],
			},
		],
	});
}

function extract(rawBody: string, targetRank: number | null) {
	return extractLocalCompetitors({
		rawBody,
		rawSha256: `sha256:${createHash("sha256").update(rawBody).digest("hex")}`,
		providerTaskId: "task-1",
		evidenceId: "evidence-1",
		...request,
		target: { cid: "300" },
		targetRank,
		captureDepth: 20,
	});
}

const organic = (rank: number, cid: string) => ({ type: "maps_search", title: `Place ${cid}`, rank_group: rank, cid });

describe("extractLocalCompetitors", () => {
	it("names every place ranked above the target, and ads separately", () => {
		const body = providerBody([
			organic(1, "100"),
			{ type: "maps_paid_item", title: "Sponsored", rank_group: 1 },
			organic(2, "200"),
			organic(3, "300"),
		]);
		const result = extract(body, 3);
		expect(result.target?.cid).toBe("300");
		expect(result.aboveTarget.map((item) => item.cid)).toEqual(["100", "200"]);
		expect(result.ads.map((item) => item.name)).toEqual(["Sponsored"]);
	});

	it("refuses a body that is not the retained evidence", () => {
		const body = providerBody([organic(1, "300")]);
		expect(() =>
			extractLocalCompetitors({
				rawBody: body,
				rawSha256: `sha256:${"0".repeat(64)}`,
				providerTaskId: "task-1",
				evidenceId: "evidence-1",
				...request,
				target: { cid: "300" },
				targetRank: 1,
				captureDepth: 20,
			}),
		).toThrow("LOCAL_COMPETITOR_HASH_MISMATCH");
	});

	it("refuses when the recorded rank disagrees with the response", () => {
		expect(() => extract(providerBody([organic(1, "100"), organic(2, "300")]), 1)).toThrow(
			"LOCAL_COMPETITOR_TARGET_MISMATCH",
		);
	});

	it("refuses a response with a gap above the target", () => {
		expect(() => extract(providerBody([organic(1, "100"), organic(3, "300")]), 3)).toThrow(
			"LOCAL_COMPETITOR_COVERAGE_INCOMPLETE",
		);
	});
});

describe("localIdentityFromMapsUrl", () => {
	it("reads a place id or cid from a full Google Maps link", () => {
		expect(localIdentityFromMapsUrl("https://www.google.com/maps?cid=12345")).toEqual({ cid: "12345" });
		expect(
			localIdentityFromMapsUrl("https://www.google.com/maps/search/?api=1&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4"),
		).toEqual({ placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" });
	});

	it("refuses short links and other hosts, which would need a lookup", () => {
		expect(() => localIdentityFromMapsUrl("https://maps.app.goo.gl/abc")).toThrow("LOCAL_MAPS_LINK_UNSUPPORTED");
		expect(() => localIdentityFromMapsUrl("https://www.google.com/maps/place/Somewhere")).toThrow(
			"LOCAL_MAPS_FULL_PLACE_LINK_REQUIRED",
		);
	});

	it("refuses a link that names two different places", () => {
		expect(() =>
			localIdentityFromMapsUrl(
				"https://www.google.com/maps?query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4&place_id=ChIJOtherPlace000000",
			),
		).toThrow("LOCAL_MAPS_LINK_CONFLICT");
	});
});
