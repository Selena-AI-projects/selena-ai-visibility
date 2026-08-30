import openApiSpec from "@workspace/api-spec";
import { describe, expect, it } from "vitest";

type Schema = {
	additionalProperties?: boolean;
	properties?: Record<string, { enum?: unknown[] }>;
	required?: string[];
	anyOf?: Schema[];
	not?: Schema;
	oneOf?: Schema[];
};

const requestSchema = openApiSpec.components.schemas.LocalPlaceEntityConfirmRequest as Schema;
const responseSchema = openApiSpec.components.schemas.LocalPlaceEntityConfirmResponse as Schema;

function hasRequired(schema: Schema, value: Record<string, unknown>): boolean {
	return (schema.required ?? []).every((property) => Object.hasOwn(value, property));
}

function matchesBranch(schema: Schema, value: Record<string, unknown>): boolean {
	if (!hasRequired(schema, value)) return false;
	if (schema.anyOf && !schema.anyOf.some((branch) => matchesBranch(branch, value))) return false;
	if (schema.not && matchesBranch(schema.not, value)) return false;
	return Object.entries(schema.properties ?? {}).every(([property, constraint]) => {
		if (!constraint.enum || !Object.hasOwn(value, property)) return true;
		return constraint.enum.some((allowed) => allowed === value[property]);
	});
}

function matchesIdentitySchema(schema: Schema, value: Record<string, unknown>): boolean {
	if (
		schema.additionalProperties === false &&
		Object.keys(value).some((property) => !Object.hasOwn(schema.properties ?? {}, property))
	)
		return false;
	return (
		hasRequired(schema, value) && (schema.oneOf ?? []).filter((branch) => matchesBranch(branch, value)).length === 1
	);
}

const primary = {
	placeId: "ChIJ-primary",
	mapsUrl: "https://maps.google.com/?cid=123",
	identitySource: "USER_CONFIRMED",
	matchPolicy: "PLACE_ID_OR_CID",
	matchStatus: "EXACT_ALIAS",
};

const fallback = {
	matchedName: "KORA Food Hall",
	matchedAddress: "Ubud, Bali",
	mapsUrl: "https://maps.google.com/?q=KORA",
	identitySource: "USER_CONFIRMED",
	matchPolicy: "REVIEWED_NAME_ADDRESS_FALLBACK",
	matchStatus: "REVIEWED_MATCH",
	reviewed: true,
};

describe("Local setup OpenAPI identity parity", () => {
	it("keeps Place ID/CID request identities compatible", () => {
		expect(matchesIdentitySchema(requestSchema, primary)).toBe(true);
		expect(
			matchesIdentitySchema(requestSchema, {
				...(({ placeId: _placeId, ...withoutPlaceId }) => withoutPlaceId)(primary),
				cid: "123456",
			}),
		).toBe(true);
		expect(matchesIdentitySchema(requestSchema, { ...primary, cid: "123456" })).toBe(true);
	});

	it("requires explicit review metadata for fallback requests", () => {
		expect(matchesIdentitySchema(requestSchema, fallback)).toBe(true);
		expect(matchesIdentitySchema(requestSchema, { ...fallback, reviewed: false })).toBe(false);
		expect(matchesIdentitySchema(requestSchema, { ...fallback, matchStatus: "UNRESOLVED" })).toBe(false);
		expect(matchesIdentitySchema(requestSchema, { ...fallback, placeId: "ChIJ-conflict" })).toBe(false);
	});

	it("mirrors primary-or-reviewed-fallback response variants", () => {
		expect(
			matchesIdentitySchema(responseSchema, {
				locationId: "00000000-0000-4000-8000-000000000001",
				placeId: primary.placeId,
				mapsUrl: primary.mapsUrl,
				matchStatus: primary.matchStatus,
			}),
		).toBe(true);
		expect(
			matchesIdentitySchema(responseSchema, {
				locationId: "00000000-0000-4000-8000-000000000001",
				matchedName: fallback.matchedName,
				matchedAddress: fallback.matchedAddress,
				mapsUrl: fallback.mapsUrl,
				matchStatus: fallback.matchStatus,
				reviewed: fallback.reviewed,
			}),
		).toBe(true);
		expect(
			matchesIdentitySchema(responseSchema, {
				locationId: "00000000-0000-4000-8000-000000000001",
				matchedName: fallback.matchedName,
				matchedAddress: fallback.matchedAddress,
				mapsUrl: fallback.mapsUrl,
				matchStatus: fallback.matchStatus,
				reviewed: false,
			}),
		).toBe(false);
	});
});
