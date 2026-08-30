import { z } from "zod";

const uuid = z.string().uuid();

/**
 * Client-confirmed business-location inputs.  Coordinates and references are
 * accepted as user evidence only; this contract never authorizes a provider
 * lookup or silently normalizes an external place.
 */
export const localBusinessLocationCreateRequestSchema = z
	.strictObject({
		entityId: uuid,
		displayName: z.string().trim().min(1).max(160),
		countryCode: z.string().regex(/^[A-Z]{2}$/),
		adminArea: z.string().trim().max(160).optional(),
		locality: z.string().trim().max(160).optional(),
		addressText: z.string().trim().max(500).optional(),
		timezone: z.string().trim().max(80).optional(),
		latitude: z.number().finite().min(-85).max(85).optional(),
		longitude: z.number().finite().min(-180).max(180).optional(),
		geoPrecision: z.enum(["CITY", "ADDRESS", "COORDINATE", "UNKNOWN"]).default("UNKNOWN"),
		googleMapsUrlReference: z.url().optional(),
		googlePlaceIdReference: z.string().trim().min(1).max(300).optional(),
		referenceOrigin: z.enum(["USER_PROVIDED", "PUBLIC_SITE", "ANALYST_ENTERED"]).default("USER_PROVIDED"),
		locationRole: z.enum(["PRIMARY", "SECONDARY", "WITHIN"]).default("PRIMARY"),
	})
	.superRefine((input, context) => {
		const hasLatitude = input.latitude !== undefined;
		const hasLongitude = input.longitude !== undefined;
		if (hasLatitude !== hasLongitude)
			context.addIssue({ code: "custom", message: "LOCATION_COORDINATES_MUST_BE_PAIRED" });
		if (input.geoPrecision === "COORDINATE" && !hasLatitude)
			context.addIssue({ code: "custom", message: "COORDINATE_PRECISION_REQUIRES_COORDINATES" });
	});
export type LocalBusinessLocationCreateRequest = z.infer<typeof localBusinessLocationCreateRequestSchema>;

/** Place identity is confirmed by the client and is never a rank observation. */
export const localPlaceEntityConfirmRequestSchema = z
	.strictObject({
		placeId: z.string().trim().min(1).max(300).optional(),
		cid: z.string().trim().min(1).max(300).optional(),
		mapsUrl: z.url(),
		identitySource: z.enum(["USER_CONFIRMED", "PROVIDER_EVIDENCE"]),
		matchPolicy: z.enum(["PLACE_ID_OR_CID", "REVIEWED_NAME_ADDRESS_FALLBACK"]),
		matchStatus: z.enum(["EXACT_ALIAS", "REVIEWED_MATCH", "UNRESOLVED"]).default("REVIEWED_MATCH"),
	})
	.refine((input) => input.placeId !== undefined || input.cid !== undefined, {
		message: "MAPS_TARGET_IDENTITY_REQUIRED",
	});
export type LocalPlaceEntityConfirmRequest = z.infer<typeof localPlaceEntityConfirmRequestSchema>;

/** Immutable keyword-set version inputs; the adapter assigns the set version. */
export const localKeywordSetCreateRequestSchema = z.strictObject({
	language: z.string().trim().min(2).max(35),
	keywords: z
		.array(
			z.strictObject({
				text: z.string().trim().min(1).max(240),
				intent: z.string().trim().min(1).max(120),
				branded: z.boolean(),
			}),
		)
		.min(1)
		.max(500),
});
export type LocalKeywordSetCreateRequest = z.infer<typeof localKeywordSetCreateRequestSchema>;

export const localBusinessLocationCreateResponseSchema = z.strictObject({
	locationId: uuid,
	projectId: uuid,
	status: z.literal("CREATED"),
	normalizedCoordinates: z.strictObject({
		latitude: z.number().finite().min(-85).max(85),
		longitude: z.number().finite().min(-180).max(180),
		precision: z.enum(["CITY", "ADDRESS", "COORDINATE", "UNKNOWN"]),
	}),
});
export type LocalBusinessLocationCreateResponse = z.infer<typeof localBusinessLocationCreateResponseSchema>;

export const localPlaceEntityConfirmResponseSchema = z
	.strictObject({
		locationId: uuid,
		placeId: z.string().trim().min(1).max(300).optional(),
		cid: z.string().trim().min(1).max(300).optional(),
		mapsUrl: z.url(),
		matchStatus: z.enum(["EXACT_ALIAS", "REVIEWED_MATCH", "UNRESOLVED"]),
	})
	.refine((input) => input.placeId !== undefined || input.cid !== undefined, {
		message: "MAPS_TARGET_IDENTITY_REQUIRED",
	});
export type LocalPlaceEntityConfirmResponse = z.infer<typeof localPlaceEntityConfirmResponseSchema>;

export const localKeywordSetCreateResponseSchema = z.strictObject({
	locationId: uuid,
	keywordSetId: uuid,
	version: z.number().int().positive(),
	status: z.literal("CREATED"),
});
export type LocalKeywordSetCreateResponse = z.infer<typeof localKeywordSetCreateResponseSchema>;
