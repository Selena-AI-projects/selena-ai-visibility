import { describe, expect, it } from "vitest";
import {
	decodeSelenaApiCursor,
	decodeSelenaApiCursorSigned,
	encodeSelenaApiCursor,
	encodeSelenaApiCursorSigned,
	hashIdempotencyBody,
	parseIdempotencyKey,
	parseSelenaApiCursor,
	requireSelenaApiScope,
	SelenaApiHttpError,
	selenaApiErrorResponse,
	selenaApiHttpErrorResponse,
} from "../selena-api-http";

const cycleId = "00000000-0000-4000-8000-000000000001";
const binding = { tenantId: "tenant-1", cycleId, resource: "map-results" as const };
const cursorPayload = {
	version: 1 as const,
	...binding,
	snapshotVersion: "2026-08-30T00:00:00.000Z",
	position: {
		sortValue: "2026-08-30T00:00:00.000Z",
		tieBreakerId: "00000000-0000-4000-8000-000000000042",
	},
};

describe("Selena local API HTTP helpers", () => {
	it("requires the exact requested scope", () => {
		expect(requireSelenaApiScope(["local:read", "evidence:read"], "local:read")).toBe("local:read");
		expect(() => requireSelenaApiScope(["local:read"], "local:execute")).toThrowError(
			expect.objectContaining({ status: 403, code: "SCOPE_FORBIDDEN", retryable: false }),
		);
	});

	it("returns the standard error envelope without flattening details", async () => {
		const response = selenaApiErrorResponse(409, {
			code: "IDEMPOTENCY_KEY_REUSED",
			message: "The key was already used for another request body.",
			requestId: "request-1",
			retryable: false,
			details: { expectedBodyHash: "redacted" },
		});
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: {
				code: "IDEMPOTENCY_KEY_REUSED",
				message: "The key was already used for another request body.",
				requestId: "request-1",
				retryable: false,
				details: { expectedBodyHash: "redacted" },
			},
		});
		expect(() =>
			selenaApiErrorResponse(200, {
				code: "NOT_AN_ERROR",
				message: "not an error",
				requestId: "request-1",
				retryable: false,
			}),
		).toThrow("LOCAL_API_ERROR_STATUS_INVALID");
	});

	it("converts helper errors into the same envelope", async () => {
		const error = new SelenaApiHttpError(503, "PROVIDER_UNAVAILABLE", "Provider is unavailable.", true, {
			surface: "LOCAL_MAPS",
		});
		const response = selenaApiHttpErrorResponse(error, "request-2");
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			error: {
				code: "PROVIDER_UNAVAILABLE",
				message: "Provider is unavailable.",
				requestId: "request-2",
				retryable: true,
				details: { surface: "LOCAL_MAPS" },
			},
		});
	});

	it("parses required Idempotency-Key values at the 8 and 128 character boundaries", () => {
		for (const value of ["12345678", "x".repeat(128)]) {
			const headers = new Headers({ "Idempotency-Key": value });
			expect(parseIdempotencyKey(headers)).toBe(value);
		}
		for (const value of ["1234567", "x".repeat(129), "        "] as const) {
			const headers = new Headers({ "Idempotency-Key": value });
			expect(() => parseIdempotencyKey(headers)).toThrowError(
				expect.objectContaining({ status: 400, code: "IDEMPOTENCY_KEY_INVALID" }),
			);
		}
		expect(() => parseIdempotencyKey(new Headers())).toThrowError(
			expect.objectContaining({ status: 400, code: "IDEMPOTENCY_KEY_REQUIRED" }),
		);
	});

	it("hashes semantically identical JSON objects deterministically", () => {
		const left = hashIdempotencyBody({ z: [3, { b: true, a: null }], a: "value" });
		const right = hashIdempotencyBody({ a: "value", z: [3, { a: null, b: true }] });
		expect(left).toBe(right);
		expect(left).toMatch(/^sha256:[a-f0-9]{64}$/);
		expect(hashIdempotencyBody({ values: [1, 2] })).not.toBe(hashIdempotencyBody({ values: [2, 1] }));
		expect(hashIdempotencyBody(-0)).toBe(hashIdempotencyBody(0));
	});

	it("rejects values that cannot occur in a JSON request body", () => {
		expect(() => hashIdempotencyBody({ value: undefined })).toThrow("IDEMPOTENCY_BODY_NOT_JSON");
		expect(() => hashIdempotencyBody(Number.NaN)).toThrow("IDEMPOTENCY_BODY_NOT_JSON");
		const cyclic: { self?: unknown } = {};
		cyclic.self = cyclic;
		expect(() => hashIdempotencyBody(cyclic)).toThrow("IDEMPOTENCY_BODY_NOT_JSON");
	});

	it("round-trips an opaque cursor only for its tenant, cycle, and resource binding", () => {
		const cursor = encodeSelenaApiCursor(cursorPayload);
		expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(cursor).not.toContain("tenant-1");
		expect(decodeSelenaApiCursor(cursor, binding)).toEqual(cursorPayload);
		for (const otherBinding of [
			{ ...binding, tenantId: "tenant-2" },
			{ ...binding, cycleId: "00000000-0000-4000-8000-000000000002" },
			{ ...binding, resource: "evidence" as const },
		]) {
			expect(() => decodeSelenaApiCursor(cursor, otherBinding)).toThrowError(
				expect.objectContaining({ status: 400, code: "CURSOR_INVALID" }),
			);
		}
	});

	it("rejects malformed and oversized cursor input without exposing decoder details", () => {
		for (const cursor of ["", "not+base64", "x".repeat(4097), Buffer.from("not json").toString("base64url")]) {
			expect(() => decodeSelenaApiCursor(cursor, binding)).toThrowError(
				expect.objectContaining({
					status: 400,
					code: "CURSOR_INVALID",
					message: "Cursor is invalid for this resource.",
				}),
			);
		}
	});

	it("supports an injected tamper-evident cursor secret without making it implicit", () => {
		const secret = "owner-managed-test-secret";
		const cursor = encodeSelenaApiCursorSigned(cursorPayload, secret);
		expect(cursor).toContain(".");
		expect(decodeSelenaApiCursorSigned(cursor, binding, secret)).toEqual(cursorPayload);
		expect(() => decodeSelenaApiCursorSigned(cursor, binding, "another-owner-secret")).toThrowError(
			expect.objectContaining({ status: 400, code: "CURSOR_INVALID" }),
		);
		expect(() => encodeSelenaApiCursorSigned(cursorPayload, "short")).toThrow("CURSOR_SIGNING_SECRET_INVALID");
	});

	it("rejects a canonical cursor with a non-date sort key or non-UUID tie breaker", () => {
		for (const position of [
			{ sortValue: "not-a-date", tieBreakerId: cursorPayload.position.tieBreakerId },
			{ sortValue: cursorPayload.position.sortValue, tieBreakerId: "not-a-uuid" },
		]) {
			const cursor = Buffer.from(JSON.stringify({ ...cursorPayload, position }), "utf8").toString("base64url");
			expect(() => decodeSelenaApiCursor(cursor, binding)).toThrowError(
				expect.objectContaining({ status: 400, code: "CURSOR_INVALID" }),
			);
		}
	});

	it("uses limit 50 by default, accepts 1 through 200, and returns the bound cursor", () => {
		expect(parseSelenaApiCursor(new URLSearchParams(), binding)).toEqual({ limit: 50, cursor: null });
		const encoded = encodeSelenaApiCursor(cursorPayload);
		expect(parseSelenaApiCursor(new URLSearchParams({ limit: "200", cursor: encoded }), binding)).toEqual({
			limit: 200,
			cursor: cursorPayload,
		});
		expect(parseSelenaApiCursor(new URLSearchParams({ limit: "1" }), binding)).toEqual({ limit: 1, cursor: null });
	});

	it("rejects zero, fractional, padded, negative, and over-limit page sizes", () => {
		for (const limit of ["0", "1.5", "01", "-1", "201", "", "9007199254740992"]) {
			expect(() => parseSelenaApiCursor(new URLSearchParams({ limit }), binding)).toThrowError(
				expect.objectContaining({ status: 400, code: "LIMIT_INVALID" }),
			);
		}
	});

	it("rejects ambiguous duplicate pagination parameters", () => {
		for (const query of ["limit=10&limit=20", "cursor=one&cursor=two"]) {
			expect(() => parseSelenaApiCursor(new URLSearchParams(query), binding)).toThrowError(
				expect.objectContaining({ status: 400, code: "PAGINATION_QUERY_INVALID" }),
			);
		}
	});
});
