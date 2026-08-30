import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
	LOCAL_API_DEFAULT_LIMIT,
	LOCAL_API_MAX_LIMIT,
	type LocalApiCursorBinding,
	type LocalApiCursorPayload,
	type LocalApiErrorEnvelope,
	type LocalApiScope,
	localApiCursorPayloadSchema,
	localApiErrorEnvelopeSchema,
	localApiScopeSchema,
} from "@workspace/selena-visibility-contracts";

export type SelenaApiErrorInput = LocalApiErrorEnvelope["error"];

export class SelenaApiHttpError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string,
		public readonly retryable = false,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "SelenaApiHttpError";
	}
}

const SAFE_ERROR_FALLBACK = "The request could not be completed.";
const SAFE_DETAIL_KEYS = new Set([
	"blocker",
	"expectedBodyHash",
	"operation",
	"providerCalls",
	"requiredScope",
	"surface",
]);
const SAFE_SCOPES = new Set(["local:read", "local:write", "local:execute", "evidence:read", "provider:canary"]);
const SAFE_SURFACES = new Set(["LOCAL_AI", "LOCAL_MAPS"]);
const SAFE_BLOCKERS = new Set([
	"LOCAL_SCHEMA_NOT_APPLIED_OR_RLS_UNVERIFIED",
	"LOCAL_SETUP_SCHEMA_RLS_OR_APPROVAL_UNVERIFIED",
	"LOCAL_ADMIN_SCHEMA_RLS_OR_APPROVAL_UNVERIFIED",
	"PROVIDER_REGISTRY_OR_CREDENTIALS_UNVERIFIED",
	"SAFE_BLOCKER",
]);

const SAFE_MESSAGES_BY_CODE: Record<string, string> = {
	AUTH_FORBIDDEN: "The API key cannot access this tenant.",
	AUTH_UNAUTHORIZED: "A valid scoped API key is required.",
	BODY_INVALID: "Request body must be a JSON object.",
	CURSOR_INVALID: "Cursor is invalid for this resource.",
	CURSOR_STALE: "The collection changed after this cursor was issued. Restart pagination from the first page.",
	IDEMPOTENCY_KEY_INVALID: "Idempotency-Key must contain 8 to 128 characters without surrounding whitespace.",
	IDEMPOTENCY_KEY_REQUIRED: "Idempotency-Key header is required.",
	IDEMPOTENCY_KEY_REUSED: "The key was already used for another request body.",
	INTERNAL_ERROR: "The request could not be completed.",
	JSON_INVALID: "Request body must be valid JSON.",
	LIMIT_INVALID: "Limit must be an integer between 1 and 200.",
	LOCAL_CYCLE_ID_INVALID: "cycleId must be a valid UUID.",
	LOCAL_CYCLE_NOT_FOUND: "Local scan cycle was not found.",
	PAGINATION_QUERY_INVALID: "Limit and cursor may be supplied at most once.",
	PRICE_INVALID: "The commercial quote price is invalid.",
	RESOURCE_ID_INVALID: "resourceId must be a valid UUID.",
	VALIDATION_ERROR: "The request body or path is invalid.",
};

function safeErrorMessage(code: string, message: string): string {
	const normalized = message.trim();
	if (SAFE_MESSAGES_BY_CODE[code] === normalized) return normalized;
	if (
		code === "SCOPE_FORBIDDEN" &&
		/^API key lacks (?:local:read|local:write|local:execute|evidence:read|provider:canary) scope\.$/.test(normalized)
	) {
		return normalized;
	}
	if (
		code === "OWNER_GATE_REQUIRED" &&
		/^(?:LOCAL_[A-Z0-9_-]+ is unavailable until the target schema(?:, RLS| and tenant RLS)?(?: and approval gates)? are verified\.|(?:Admin action|Provider capabilities did not produce a durable registry response|Local setup action did not produce a durable response|Local setup action did not produce a valid durable response)\.)$/.test(
			normalized,
		)
	) {
		return normalized;
	}
	if (code === "PROVIDER_UNAVAILABLE" && normalized === "Provider is unavailable.") return normalized;
	return SAFE_ERROR_FALLBACK;
}

function safeErrorDetails(details: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
	if (!details) return undefined;
	const safe: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(details)) {
		if (!SAFE_DETAIL_KEYS.has(key)) continue;
		if (key === "requiredScope" && typeof value === "string" && SAFE_SCOPES.has(value)) safe[key] = value;
		else if (key === "surface" && typeof value === "string" && SAFE_SURFACES.has(value)) safe[key] = value;
		else if (key === "providerCalls" && typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
			safe[key] = value;
		else if (
			key === "expectedBodyHash" &&
			(value === "redacted" || (typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value)))
		)
			safe[key] = value;
		else if (key === "blocker" && typeof value === "string" && SAFE_BLOCKERS.has(value)) safe[key] = value;
		else if (key === "operation" && typeof value === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(value))
			safe[key] = value;
	}
	return Object.keys(safe).length > 0 ? safe : undefined;
}

export function requireSelenaApiScope(grantedScopes: readonly string[], requiredScope: LocalApiScope): LocalApiScope {
	const required = localApiScopeSchema.parse(requiredScope);
	if (!grantedScopes.includes(required)) {
		throw new SelenaApiHttpError(403, "SCOPE_FORBIDDEN", `API key lacks ${required} scope.`, false, {
			requiredScope: required,
		});
	}
	return required;
}

export function selenaApiErrorResponse(status: number, input: SelenaApiErrorInput): Response {
	if (!Number.isInteger(status) || status < 400 || status > 599) {
		throw new Error("LOCAL_API_ERROR_STATUS_INVALID");
	}
	const details = safeErrorDetails(input.details);
	const envelope = localApiErrorEnvelopeSchema.parse({
		error: {
			...input,
			message: safeErrorMessage(input.code, input.message),
			...(details ? { details } : {}),
		},
	});
	return Response.json(envelope, { status });
}

export function selenaApiHttpErrorResponse(error: SelenaApiHttpError, requestId: string): Response {
	const details = safeErrorDetails(error.details);
	return selenaApiErrorResponse(error.status, {
		code: error.code,
		message: safeErrorMessage(error.code, error.message),
		requestId,
		retryable: error.retryable,
		...(details ? { details } : {}),
	});
}

export function parseIdempotencyKey(headers: Headers): string {
	const value = headers.get("Idempotency-Key");
	if (value === null) {
		throw new SelenaApiHttpError(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required.");
	}
	if (value.length < 8 || value.length > 128 || value.trim() !== value) {
		throw new SelenaApiHttpError(
			400,
			"IDEMPOTENCY_KEY_INVALID",
			"Idempotency-Key must contain 8 to 128 characters without surrounding whitespace.",
		);
	}
	return value;
}

type JsonPrimitive = null | boolean | number | string;
type CanonicalJson = JsonPrimitive | CanonicalJson[] | { [key: string]: CanonicalJson };

function canonicalJsonValue(value: unknown, ancestors: Set<object>): CanonicalJson {
	if (value === null || typeof value === "boolean" || typeof value === "string") return value;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new Error("IDEMPOTENCY_BODY_NOT_JSON");
		return Object.is(value, -0) ? 0 : value;
	}
	if (typeof value !== "object") throw new Error("IDEMPOTENCY_BODY_NOT_JSON");
	if (ancestors.has(value)) throw new Error("IDEMPOTENCY_BODY_NOT_JSON");

	ancestors.add(value);
	try {
		if (Array.isArray(value)) return value.map((item) => canonicalJsonValue(item, ancestors));
		const prototype = Object.getPrototypeOf(value);
		if (prototype !== Object.prototype && prototype !== null) throw new Error("IDEMPOTENCY_BODY_NOT_JSON");
		const canonical: { [key: string]: CanonicalJson } = {};
		for (const key of Object.keys(value).sort()) {
			canonical[key] = canonicalJsonValue((value as Record<string, unknown>)[key], ancestors);
		}
		return canonical;
	} finally {
		ancestors.delete(value);
	}
}

export function hashIdempotencyBody(body: unknown): string {
	const canonical = JSON.stringify(canonicalJsonValue(body, new Set()));
	return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function encodeSelenaApiCursor(payload: LocalApiCursorPayload): string {
	const parsed = localApiCursorPayloadSchema.parse(payload);
	return Buffer.from(JSON.stringify(parsed), "utf8").toString("base64url");
}

/**
 * Signed cursor codec for a future runtime that injects an owner-managed key.
 * The default API deliberately continues using the unsigned codec until that
 * key is provisioned and rotation/retention policy is proven.
 */
export function encodeSelenaApiCursorSigned(payload: LocalApiCursorPayload, secret: string): string {
	if (secret.length < 16) throw new Error("CURSOR_SIGNING_SECRET_INVALID");
	const unsigned = encodeSelenaApiCursor(payload);
	const signature = createHmac("sha256", secret).update(unsigned, "utf8").digest("base64url");
	return `${unsigned}.${signature}`;
}

function invalidCursor(): SelenaApiHttpError {
	return new SelenaApiHttpError(400, "CURSOR_INVALID", "Cursor is invalid for this resource.");
}

export function decodeSelenaApiCursor(cursor: string, binding: LocalApiCursorBinding): LocalApiCursorPayload {
	if (cursor.length === 0 || cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw invalidCursor();
	try {
		const payload = localApiCursorPayloadSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
		if (encodeSelenaApiCursor(payload) !== cursor) throw invalidCursor();
		if (
			payload.tenantId !== binding.tenantId ||
			payload.cycleId !== binding.cycleId ||
			payload.resource !== binding.resource
		) {
			throw invalidCursor();
		}
		return payload;
	} catch (error) {
		if (error instanceof SelenaApiHttpError) throw error;
		throw invalidCursor();
	}
}

export function decodeSelenaApiCursorSigned(
	cursor: string,
	binding: LocalApiCursorBinding,
	secret: string,
): LocalApiCursorPayload {
	if (secret.length < 16) throw new Error("CURSOR_SIGNING_SECRET_INVALID");
	const parts = cursor.split(".");
	if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1]))
		throw invalidCursor();
	const expected = createHmac("sha256", secret).update(parts[0], "utf8").digest();
	const received = Buffer.from(parts[1], "base64url");
	if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw invalidCursor();
	return decodeSelenaApiCursor(parts[0], binding);
}

export type SelenaApiCursorQuery = {
	limit: number;
	cursor: LocalApiCursorPayload | null;
};

export function parseSelenaApiCursor(
	searchParams: URLSearchParams,
	binding: LocalApiCursorBinding,
	cursorSecret?: string,
): SelenaApiCursorQuery {
	if (searchParams.getAll("limit").length > 1 || searchParams.getAll("cursor").length > 1) {
		throw new SelenaApiHttpError(400, "PAGINATION_QUERY_INVALID", "Limit and cursor may be supplied at most once.");
	}
	const rawLimit = searchParams.get("limit");
	let limit: number = LOCAL_API_DEFAULT_LIMIT;
	if (rawLimit !== null) {
		if (!/^[1-9]\d*$/.test(rawLimit)) {
			throw new SelenaApiHttpError(400, "LIMIT_INVALID", "Limit must be an integer between 1 and 200.");
		}
		limit = Number(rawLimit);
		if (!Number.isSafeInteger(limit) || limit > LOCAL_API_MAX_LIMIT) {
			throw new SelenaApiHttpError(400, "LIMIT_INVALID", "Limit must be an integer between 1 and 200.");
		}
	}

	const rawCursor = searchParams.get("cursor");
	return {
		limit,
		cursor:
			rawCursor === null
				? null
				: cursorSecret
					? decodeSelenaApiCursorSigned(rawCursor, binding, cursorSecret)
					: decodeSelenaApiCursor(rawCursor, binding),
	};
}
