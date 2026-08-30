import { z } from "zod";
import { maximumProviderAttempts } from "./local-execution.js";

const uuid = z.string().uuid();
const decimalUsd = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);

/**
 * The local write API is deliberately lock-first.  A quote is calculated from
 * an immutable configuration lock; the client cannot submit a second set of
 * grid/provider values which would silently diverge from the later cycle.
 */
export const localScanQuoteRequestSchema = z.strictObject({
	configurationLockId: uuid,
});
export type LocalScanQuoteRequest = z.infer<typeof localScanQuoteRequestSchema>;

export const localScanQuoteResponseSchema = z
	.strictObject({
		quoteId: uuid,
		locationId: uuid,
		configurationLockId: uuid,
		lockVersion: z.number().int().positive(),
		status: z.enum(["ISSUED", "BUDGET_BLOCKED"]),
		surfaces: z.array(z.literal("LOCAL_MAPS")).min(1),
		maps: z.strictObject({
			points: z.number().int().positive(),
			keywords: z.number().int().positive(),
			repeats: z.number().int().positive(),
			captureDepth: z.number().int().positive(),
			tasks: z.number().int().positive(),
			maxProviderAttempts: z.number().int().positive(),
		}),
		providerEnvelope: z.strictObject({
			id: z.string().min(1),
			endpoint: z.string().min(1),
			version: z.string().min(1),
			rankEvidenceSource: z.literal("MAPS_SERP_PROVIDER"),
			externalProviderCalls: z.literal(0),
		}),
		priceAmount: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{2})$/),
		currency: z.literal("USD"),
		budget: z.strictObject({
			currency: z.literal("USD"),
			worstCaseCostUsd: decimalUsd,
			surfaceCapUsd: decimalUsd,
			monthlyCapUsd: decimalUsd,
			priceSnapshotVersion: z.string().min(1),
		}),
		caveats: z.array(z.string().min(1)),
		expiresAt: z.iso.datetime(),
	})
	.superRefine(({ maps }, issues) => {
		const expectedTasks = maps.points * maps.keywords * maps.repeats;
		if (maps.tasks !== expectedTasks)
			issues.addIssue({ code: "custom", path: ["maps", "tasks"], message: "LOCAL_QUOTE_TASK_CARDINALITY_MISMATCH" });
		if (maps.maxProviderAttempts !== maximumProviderAttempts(maps.tasks))
			issues.addIssue({
				code: "custom",
				path: ["maps", "maxProviderAttempts"],
				message: "LOCAL_QUOTE_ATTEMPT_CARDINALITY_MISMATCH",
			});
	});
export type LocalScanQuoteResponse = z.infer<typeof localScanQuoteResponseSchema>;

export const localScanCycleCreateRequestSchema = z.strictObject({
	quoteId: uuid,
	configurationLockId: uuid,
	gridDefinitionId: uuid,
});
export type LocalScanCycleCreateRequest = z.infer<typeof localScanCycleCreateRequestSchema>;

export const localScanCycleCreateResponseSchema = z.strictObject({
	cycleId: uuid,
	measurementCycleId: uuid,
	locationId: uuid,
	projectId: uuid,
	configurationLockId: uuid,
	gridDefinitionId: uuid,
	status: z.literal("CREATED"),
	domainId: z.literal("LOCAL_MAPS"),
	expectedObservations: z.number().int().positive(),
	createdObservations: z.literal(0),
	providerCalls: z.literal(0),
	providerExecution: z.literal("MANUAL_ONLY_UNTIL_APPROVED"),
	createdAt: z.iso.datetime(),
});
export type LocalScanCycleCreateResponse = z.infer<typeof localScanCycleCreateResponseSchema>;
