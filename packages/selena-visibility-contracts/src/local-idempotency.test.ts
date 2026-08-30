import { describe, expect, it } from "vitest";
import {
	createLocalApiIdempotencyRecord,
	LOCAL_API_IDEMPOTENCY_RETENTION_MS,
	localApiIdempotencyRecordSchema,
	resolveLocalApiIdempotency,
} from "./local-idempotency";

const identity = {
	tenantId: "tenant-1",
	operation: "quote-create",
	resourceId: "project-1",
	idempotencyKey: "idem-key-123",
	bodyHash: `sha256:${"a".repeat(64)}`,
};
const createdAt = new Date("2026-08-30T00:00:00.000Z");

describe("local API durable idempotency contract", () => {
	it("creates a seven-day record with a replayable response", () => {
		const record = createLocalApiIdempotencyRecord(identity, 201, { id: "quote-1" }, createdAt);
		expect(new Date(record.expiresAt).getTime() - createdAt.getTime()).toBe(LOCAL_API_IDEMPOTENCY_RETENTION_MS);
		expect(resolveLocalApiIdempotency(identity, record, new Date("2026-08-30T00:01:00.000Z"))).toEqual({
			kind: "REPLAY",
			responseStatus: 201,
			responseBody: { id: "quote-1" },
		});
	});

	it("treats expired records as misses and reused keys as conflicts", () => {
		const record = createLocalApiIdempotencyRecord(identity, 200, { ok: true }, createdAt);
		expect(resolveLocalApiIdempotency(identity, record, new Date(record.expiresAt))).toEqual({ kind: "MISS" });
		expect(
			resolveLocalApiIdempotency(
				{ ...identity, bodyHash: `sha256:${"b".repeat(64)}` },
				record,
				new Date("2026-08-30T00:01:00.000Z"),
			),
		).toEqual({ kind: "CONFLICT", code: "IDEMPOTENCY_KEY_REUSED" });
	});

	it("rejects retention periods longer than seven days", () => {
		const record = createLocalApiIdempotencyRecord(identity, 200, null, createdAt);
		expect(
			localApiIdempotencyRecordSchema.safeParse({
				...record,
				expiresAt: new Date(createdAt.getTime() + LOCAL_API_IDEMPOTENCY_RETENTION_MS + 1).toISOString(),
			}).success,
		).toBe(false);
	});
});
