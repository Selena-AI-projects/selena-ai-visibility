import { z } from "zod";

export const LOCAL_API_IDEMPOTENCY_RETENTION_SECONDS = 604_800 as const;
export const LOCAL_API_IDEMPOTENCY_RETENTION_MS = LOCAL_API_IDEMPOTENCY_RETENTION_SECONDS * 1000;

const idempotencyKeySchema = z
	.string()
	.min(8)
	.max(128)
	.refine((value) => value.trim() === value, "IDEMPOTENCY_KEY_WHITESPACE");
const bodyHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const operationSchema = z.string().regex(/^[a-z][a-z0-9-]{1,63}$/);
const resourceIdSchema = z
	.string()
	.min(1)
	.max(160)
	.refine((value) => value.trim() === value, "RESOURCE_ID_WHITESPACE");

export const localApiIdempotencyRecordSchema = z
	.strictObject({
		schemaVersion: z.literal(1),
		tenantId: z.string().trim().min(1).max(160),
		operation: operationSchema,
		resourceId: resourceIdSchema,
		idempotencyKey: idempotencyKeySchema,
		bodyHash: bodyHashSchema,
		responseStatus: z.number().int().min(200).max(299),
		responseBody: z.unknown(),
		createdAt: z.iso.datetime(),
		expiresAt: z.iso.datetime(),
	})
	.superRefine((record, issues) => {
		const createdAt = new Date(record.createdAt).getTime();
		const expiresAt = new Date(record.expiresAt).getTime();
		if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt <= createdAt) {
			issues.addIssue({ code: "custom", message: "LOCAL_API_IDEMPOTENCY_EXPIRY_INVALID", path: ["expiresAt"] });
			return;
		}
		if (expiresAt - createdAt > LOCAL_API_IDEMPOTENCY_RETENTION_MS) {
			issues.addIssue({ code: "custom", message: "LOCAL_API_IDEMPOTENCY_RETENTION_EXCEEDED", path: ["expiresAt"] });
		}
	});
export type LocalApiIdempotencyRecord = z.infer<typeof localApiIdempotencyRecordSchema>;

export const localApiIdempotencyIdentitySchema = z.strictObject({
	tenantId: z.string().trim().min(1).max(160),
	operation: operationSchema,
	resourceId: resourceIdSchema,
	idempotencyKey: idempotencyKeySchema,
	bodyHash: bodyHashSchema,
});
export type LocalApiIdempotencyIdentity = z.infer<typeof localApiIdempotencyIdentitySchema>;

export type LocalApiIdempotencyDecision =
	| { kind: "MISS" }
	| { kind: "REPLAY"; responseStatus: number; responseBody: unknown }
	| { kind: "CONFLICT"; code: "IDEMPOTENCY_KEY_REUSED" };

/**
 * Resolves a persisted response without performing I/O. Expired records are
 * misses so a retention cleanup can safely release the key for reuse.
 */
export function resolveLocalApiIdempotency(
	identity: LocalApiIdempotencyIdentity,
	record: LocalApiIdempotencyRecord | null,
	now: Date = new Date(),
): LocalApiIdempotencyDecision {
	const parsedIdentity = localApiIdempotencyIdentitySchema.parse(identity);
	if (record === null) return { kind: "MISS" };
	const parsedRecord = localApiIdempotencyRecordSchema.parse(record);
	if (new Date(parsedRecord.expiresAt).getTime() <= now.getTime()) return { kind: "MISS" };
	if (
		parsedRecord.tenantId !== parsedIdentity.tenantId ||
		parsedRecord.operation !== parsedIdentity.operation ||
		parsedRecord.resourceId !== parsedIdentity.resourceId ||
		parsedRecord.idempotencyKey !== parsedIdentity.idempotencyKey
	)
		return { kind: "CONFLICT", code: "IDEMPOTENCY_KEY_REUSED" };
	if (parsedRecord.bodyHash !== parsedIdentity.bodyHash) return { kind: "CONFLICT", code: "IDEMPOTENCY_KEY_REUSED" };
	return {
		kind: "REPLAY",
		responseStatus: parsedRecord.responseStatus,
		responseBody: parsedRecord.responseBody,
	};
}

export function createLocalApiIdempotencyRecord(
	identity: LocalApiIdempotencyIdentity,
	responseStatus: number,
	responseBody: unknown,
	createdAt: Date = new Date(),
): LocalApiIdempotencyRecord {
	const parsedIdentity = localApiIdempotencyIdentitySchema.parse(identity);
	return localApiIdempotencyRecordSchema.parse({
		schemaVersion: 1,
		...parsedIdentity,
		responseStatus,
		responseBody,
		createdAt: createdAt.toISOString(),
		expiresAt: new Date(createdAt.getTime() + LOCAL_API_IDEMPOTENCY_RETENTION_MS).toISOString(),
	});
}
