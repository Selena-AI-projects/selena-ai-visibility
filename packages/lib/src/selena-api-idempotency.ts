import {
	type LocalApiIdempotencyDecision,
	type LocalApiIdempotencyIdentity,
	type LocalApiIdempotencyRecord,
	localApiIdempotencyIdentitySchema,
	localApiIdempotencyRecordSchema,
	resolveLocalApiIdempotency,
} from "@workspace/selena-visibility-contracts";
import { and, eq, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";

type Db = NodePgDatabase<typeof schema>;
export type SelenaApiIdempotencyTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

function toContractRecord(row: typeof schema.svApiIdempotencyRecords.$inferSelect): LocalApiIdempotencyRecord {
	return localApiIdempotencyRecordSchema.parse({
		schemaVersion: 1,
		tenantId: row.organizationId,
		operation: row.operation,
		resourceId: row.resourceId,
		idempotencyKey: row.idempotencyKey,
		bodyHash: row.bodyHash,
		responseStatus: row.responseStatus,
		responseBody: row.responseBody,
		createdAt: row.createdAt.toISOString(),
		expiresAt: row.expiresAt.toISOString(),
	});
}

async function findRecord(tx: SelenaApiIdempotencyTransaction, identity: LocalApiIdempotencyIdentity) {
	const [row] = await tx
		.select()
		.from(schema.svApiIdempotencyRecords)
		.where(
			and(
				eq(schema.svApiIdempotencyRecords.organizationId, identity.tenantId),
				eq(schema.svApiIdempotencyRecords.operation, identity.operation),
				eq(schema.svApiIdempotencyRecords.resourceId, identity.resourceId),
				eq(schema.svApiIdempotencyRecords.idempotencyKey, identity.idempotencyKey),
			),
		)
		.limit(1);
	return row ? toContractRecord(row) : null;
}

/** Reads the durable response cache. Call this inside the mutation transaction. */
export async function readSelenaApiIdempotency(
	tx: SelenaApiIdempotencyTransaction,
	identity: LocalApiIdempotencyIdentity,
	now: Date = new Date(),
): Promise<LocalApiIdempotencyDecision> {
	const parsedIdentity = localApiIdempotencyIdentitySchema.parse(identity);
	return resolveLocalApiIdempotency(parsedIdentity, await findRecord(tx, parsedIdentity), now);
}

/**
 * Persists a completed response and resolves the winner under a concurrent
 * retry. The caller must pass its open transaction so the business mutation
 * and this insert commit or roll back together.
 */
export async function saveSelenaApiIdempotency(
	tx: SelenaApiIdempotencyTransaction,
	record: LocalApiIdempotencyRecord,
	now: Date = new Date(),
): Promise<LocalApiIdempotencyDecision> {
	const parsedRecord = localApiIdempotencyRecordSchema.parse(record);
	const identity = localApiIdempotencyIdentitySchema.parse({
		tenantId: parsedRecord.tenantId,
		operation: parsedRecord.operation,
		resourceId: parsedRecord.resourceId,
		idempotencyKey: parsedRecord.idempotencyKey,
		bodyHash: parsedRecord.bodyHash,
	});
	await tx
		.delete(schema.svApiIdempotencyRecords)
		.where(
			and(
				eq(schema.svApiIdempotencyRecords.organizationId, identity.tenantId),
				eq(schema.svApiIdempotencyRecords.operation, identity.operation),
				eq(schema.svApiIdempotencyRecords.resourceId, identity.resourceId),
				eq(schema.svApiIdempotencyRecords.idempotencyKey, identity.idempotencyKey),
				lte(schema.svApiIdempotencyRecords.expiresAt, now),
			),
		);
	await tx
		.insert(schema.svApiIdempotencyRecords)
		.values({
			organizationId: parsedRecord.tenantId,
			operation: parsedRecord.operation,
			resourceId: parsedRecord.resourceId,
			idempotencyKey: parsedRecord.idempotencyKey,
			bodyHash: parsedRecord.bodyHash,
			responseStatus: parsedRecord.responseStatus,
			responseBody: parsedRecord.responseBody,
			createdAt: new Date(parsedRecord.createdAt),
			expiresAt: new Date(parsedRecord.expiresAt),
		})
		.onConflictDoNothing({
			target: [
				schema.svApiIdempotencyRecords.organizationId,
				schema.svApiIdempotencyRecords.operation,
				schema.svApiIdempotencyRecords.resourceId,
				schema.svApiIdempotencyRecords.idempotencyKey,
			],
		});
	return resolveLocalApiIdempotency(identity, await findRecord(tx, identity), now);
}
