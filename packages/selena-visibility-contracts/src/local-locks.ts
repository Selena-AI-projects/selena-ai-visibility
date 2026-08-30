import { z } from "zod";
import { localAiDiscoveryLockBlockSchema } from "./local-discovery.js";
import { MAX_ATTEMPTS_PER_SLOT, maximumProviderAttempts } from "./local-execution.js";
import { sphericalGridV1Schema } from "./visibility-os.js";

const usdAmountSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);

export const mapsTargetIdentitySchema = z
	.strictObject({
		placeId: z.string().trim().min(1).optional(),
		cid: z.string().trim().min(1).optional(),
		mapsUrl: z.url(),
		identitySource: z.enum(["USER_CONFIRMED", "PROVIDER_EVIDENCE"]),
		matchPolicy: z.enum(["PLACE_ID_OR_CID", "REVIEWED_NAME_ADDRESS_FALLBACK"]),
	})
	.refine((identity) => identity.placeId !== undefined || identity.cid !== undefined, "MAPS_TARGET_IDENTITY_REQUIRED");

export const mapsLockV1Schema = z
	.strictObject({
		schemaVersion: z.literal(1),
		domainId: z.literal("LOCAL_MAPS"),
		lockVersion: z.number().int().positive(),
		locationId: z.string().uuid(),
		targetIdentity: mapsTargetIdentitySchema,
		grid: sphericalGridV1Schema,
		keywordSet: z.strictObject({
			id: z.string().uuid(),
			version: z.number().int().positive(),
			keywordIds: z.array(z.string().uuid()).min(1),
		}),
		provider: z.strictObject({
			id: z.string().trim().min(1),
			endpoint: z.string().trim().min(1),
			version: z.string().trim().min(1),
			rankEvidenceSource: z.literal("MAPS_SERP_PROVIDER"),
			placesApiUsed: z.literal(false),
		}),
		request: z.strictObject({
			device: z.literal("MOBILE"),
			os: z.string().trim().min(1),
			language: z.string().trim().min(2).max(35),
			seDomain: z.string().trim().min(1),
			zoom: z.number().int().min(0).max(21),
			depth: z.literal(20),
			searchThisArea: z.literal(true),
		}),
		timestampWindow: z.strictObject({
			startsAt: z.iso.datetime(),
			endsAt: z.iso.datetime(),
		}),
		repeats: z.number().int().positive(),
		expectedSlots: z.number().int().positive(),
		maxProviderAttempts: z.number().int().positive(),
		retryPolicy: z.strictObject({
			maxAttemptsPerSlot: z.literal(MAX_ATTEMPTS_PER_SLOT),
			genericQueueRetryLimit: z.literal(0),
		}),
		budget: z.strictObject({
			currency: z.literal("USD"),
			surfaceCapUsd: usdAmountSchema,
			monthlyCapUsd: usdAmountSchema,
			worstCaseCostUsd: usdAmountSchema,
			priceSnapshotVersion: z.string().trim().min(1),
		}),
	})
	.superRefine((lock, issues) => {
		if (lock.locationId !== lock.grid.locationId)
			issues.addIssue({ code: "custom", message: "MAPS_LOCK_GRID_LOCATION_MISMATCH" });
		if (lock.grid.points.length !== lock.grid.size ** 2)
			issues.addIssue({ code: "custom", message: "MAPS_LOCK_GRID_CARDINALITY_MISMATCH" });
		const expectedSlots = lock.grid.points.length * lock.keywordSet.keywordIds.length * lock.repeats;
		if (lock.expectedSlots !== expectedSlots)
			issues.addIssue({ code: "custom", message: "MAPS_LOCK_SLOT_CARDINALITY_MISMATCH" });
		if (lock.maxProviderAttempts !== maximumProviderAttempts(expectedSlots))
			issues.addIssue({ code: "custom", message: "MAPS_LOCK_ATTEMPT_CARDINALITY_MISMATCH" });
		if (new Set(lock.keywordSet.keywordIds).size !== lock.keywordSet.keywordIds.length)
			issues.addIssue({ code: "custom", message: "MAPS_LOCK_KEYWORD_IDS_DUPLICATED" });
		const micros = (amount: string): bigint => {
			const [whole, fraction = ""] = amount.split(".");
			return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
		};
		const worstCase = micros(lock.budget.worstCaseCostUsd);
		if (worstCase > micros(lock.budget.surfaceCapUsd) || worstCase > micros(lock.budget.monthlyCapUsd))
			issues.addIssue({ code: "custom", message: "MAPS_LOCK_WORST_CASE_EXCEEDS_CAP" });
		if (new Date(lock.timestampWindow.endsAt) <= new Date(lock.timestampWindow.startsAt))
			issues.addIssue({ code: "custom", message: "MAPS_LOCK_TIMESTAMP_WINDOW_INVALID" });
	});
export type MapsLockV1 = z.infer<typeof mapsLockV1Schema>;

export const manualLocalAiLockV1Schema = z
	.strictObject({
		schemaVersion: z.literal(1),
		domainId: z.literal("LOCAL_AI"),
		executionMode: z.literal("MANUAL_ONLY"),
		automatedExecutionAllowed: z.literal(false),
		providerAttemptsAllowed: z.literal(0),
		discovery: localAiDiscoveryLockBlockSchema,
	})
	.superRefine((lock, issues) => {
		if (lock.discovery.externalCallsAllowed || lock.discovery.placesApiAllowed)
			issues.addIssue({ code: "custom", message: "LOCAL_AI_AUTOMATION_BLOCKED" });
	});
export type ManualLocalAiLockV1 = z.infer<typeof manualLocalAiLockV1Schema>;

export type LocalAiLockReadResult =
	| { source: "localAiLock"; lock: ManualLocalAiLockV1 }
	| { source: "localAiDiscovery"; lock: ManualLocalAiLockV1 };

export function readManualLocalAiLock(snapshot: unknown): LocalAiLockReadResult {
	const record = z.record(z.string(), z.unknown()).parse(snapshot);
	if (record.localAiLock !== undefined)
		return { source: "localAiLock", lock: manualLocalAiLockV1Schema.parse(record.localAiLock) };
	if (record.localAiDiscovery !== undefined) {
		const discovery = localAiDiscoveryLockBlockSchema.parse(record.localAiDiscovery);
		return {
			source: "localAiDiscovery",
			lock: {
				schemaVersion: 1,
				domainId: "LOCAL_AI",
				executionMode: "MANUAL_ONLY",
				automatedExecutionAllowed: false,
				providerAttemptsAllowed: 0,
				discovery,
			},
		};
	}
	throw new Error("LOCAL_AI_LOCK_MISSING");
}
