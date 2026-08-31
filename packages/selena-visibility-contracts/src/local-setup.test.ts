import { describe, expect, it } from "vitest";
import {
	localBusinessLocationCreateRequestSchema,
	localKeywordSetCreateRequestSchema,
	localPlaceEntityConfirmRequestSchema,
} from "./local-setup.js";

const ids = {
	entityId: "11111111-1111-4111-8111-111111111111",
};

describe("local setup contracts", () => {
	it("accepts a client-confirmed location with paired coordinates", () => {
		expect(
			localBusinessLocationCreateRequestSchema.parse({
				entityId: ids.entityId,
				displayName: "KORA Ubud",
				countryCode: "ID",
				latitude: -8.5069,
				longitude: 115.2625,
				geoPrecision: "COORDINATE",
			}),
		).toMatchObject({ entityId: ids.entityId, geoPrecision: "COORDINATE" });
	});

	it("rejects unpaired or out-of-range coordinates", () => {
		expect(() =>
			localBusinessLocationCreateRequestSchema.parse({
				entityId: ids.entityId,
				displayName: "KORA Ubud",
				countryCode: "ID",
				latitude: -8.5,
			}),
		).toThrow("LOCATION_COORDINATES_MUST_BE_PAIRED");
		expect(() =>
			localBusinessLocationCreateRequestSchema.parse({
				entityId: ids.entityId,
				displayName: "KORA Ubud",
				countryCode: "ID",
				latitude: -90,
				longitude: 115,
			}),
		).toThrow();
	});

	it("requires a place ID or CID for identity confirmation", () => {
		expect(() =>
			localPlaceEntityConfirmRequestSchema.parse({
				mapsUrl: "https://maps.google.com/?cid=123",
				identitySource: "USER_CONFIRMED",
				matchPolicy: "PLACE_ID_OR_CID",
			}),
		).toThrow("MAPS_TARGET_IDENTITY_REQUIRED");
		expect(
			localPlaceEntityConfirmRequestSchema.parse({
				cid: "123",
				mapsUrl: "https://maps.google.com/?cid=123",
				identitySource: "USER_CONFIRMED",
				matchPolicy: "PLACE_ID_OR_CID",
			}),
		).toMatchObject({ cid: "123", matchStatus: "REVIEWED_MATCH" });
	});

	it("allows only explicitly reviewed name/address fallback identity", () => {
		const fallback = {
			matchedName: "KORA Food Hall",
			matchedAddress: "Ubud, Bali",
			mapsUrl: "https://maps.google.com/?q=KORA",
			identitySource: "USER_CONFIRMED" as const,
			matchPolicy: "REVIEWED_NAME_ADDRESS_FALLBACK" as const,
			matchStatus: "REVIEWED_MATCH" as const,
			reviewed: true,
		};
		expect(localPlaceEntityConfirmRequestSchema.parse(fallback)).toMatchObject({
			matchedName: fallback.matchedName,
			reviewed: true,
		});
		expect(() => localPlaceEntityConfirmRequestSchema.parse({ ...fallback, reviewed: false })).toThrow(
			"MAPS_NAME_ADDRESS_REVIEW_REQUIRED",
		);
		expect(() => localPlaceEntityConfirmRequestSchema.parse({ ...fallback, matchedAddress: undefined })).toThrow(
			"MAPS_NAME_ADDRESS_FALLBACK_REQUIRED",
		);
	});

	it("bounds and versions keyword input as immutable set content", () => {
		expect(
			localKeywordSetCreateRequestSchema.parse({
				language: "en",
				keywords: [{ text: "best cafe ubud", intent: "category", branded: false }],
			}),
		).toEqual({
			language: "en",
			keywords: [{ text: "best cafe ubud", intent: "category", branded: false }],
		});
	});
});
