/**
 * A ceiling on how often one caller may hit the doors that cost something.
 *
 * Two kinds of request are worth limiting here. The auth endpoints are reachable
 * without credentials and answer questions worth asking repeatedly — whether an
 * address exists, whether a password is right — and the pilot guest list is
 * checked on the same path, so an unlimited sign-up endpoint is also an
 * unlimited way to test which restaurants were invited. The versioned API is
 * behind a key, but a key that leaks should cost its holder a wait rather than
 * a bill.
 *
 * Counting happens in this process, so the ceiling is per replica: with two web
 * replicas a caller gets two allowances. That is stated rather than hidden. It
 * is the right trade while the deployment runs one replica, and the shape below
 * is the one a shared counter would replace without changing any caller.
 */

export interface RateLimitPolicy {
	/** Name of the bucket, so unrelated routes never share an allowance. */
	bucket: string;
	windowMs: number;
	max: number;
}

export interface RateLimitDecision {
	allowed: boolean;
	retryAfterSeconds: number;
}

/**
 * Auth is deliberately much tighter than the API: a person signs in a handful
 * of times an hour, and everything above that is someone trying addresses.
 */
export const AUTH_POLICY: RateLimitPolicy = { bucket: "auth", windowMs: 15 * 60_000, max: 20 };
export const API_POLICY: RateLimitPolicy = { bucket: "api", windowMs: 60_000, max: 120 };

/** Keeps a single caller from filling memory with distinct keys. */
const MAX_TRACKED_KEYS = 20_000;

interface Window {
	count: number;
	resetAt: number;
}

export interface RateLimiter {
	check(key: string, policy: RateLimitPolicy, now?: number): RateLimitDecision;
	readonly size: number;
}

export function createRateLimiter(): RateLimiter {
	const windows = new Map<string, Window>();

	function evictExpired(now: number): void {
		for (const [key, window] of windows) {
			if (window.resetAt <= now) windows.delete(key);
		}
	}

	return {
		get size() {
			return windows.size;
		},
		check(key, policy, now = Date.now()) {
			const bucketKey = `${policy.bucket}:${key}`;
			const window = windows.get(bucketKey);

			if (!window || window.resetAt <= now) {
				if (windows.size >= MAX_TRACKED_KEYS) evictExpired(now);
				// Still full after eviction means live callers, not stale keys. Refuse
				// the new one rather than growing without a bound.
				if (windows.size >= MAX_TRACKED_KEYS) return { allowed: false, retryAfterSeconds: 60 };
				windows.set(bucketKey, { count: 1, resetAt: now + policy.windowMs });
				return { allowed: true, retryAfterSeconds: 0 };
			}

			if (window.count >= policy.max) {
				return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)) };
			}
			window.count += 1;
			return { allowed: true, retryAfterSeconds: 0 };
		},
	};
}

/**
 * Which allowance a request draws on, if any. Reads and page loads are not
 * limited: they cost nothing here and a limit on them is a limit on the product.
 */
export function policyForRequest(request: Request): RateLimitPolicy | null {
	const { pathname } = new URL(request.url);
	if (pathname.startsWith("/api/auth/")) {
		// Session and token reads happen on every page load; limiting them would
		// log people out for browsing. Only the credential-taking calls count.
		const guarded = ["sign-up", "sign-in", "forget-password", "reset-password", "change-password", "change-email"];
		return guarded.some((segment) => pathname.includes(segment)) ? AUTH_POLICY : null;
	}
	if (pathname.startsWith("/api/v1/")) return API_POLICY;
	return null;
}

/**
 * Who is being counted. An API key identifies its holder better than an
 * address does — several restaurants can share one office IP — and the key is
 * never stored or logged here, only reduced to a short stable label.
 */
export function callerKey(request: Request): string {
	const authorization = request.headers.get("authorization") ?? request.headers.get("x-api-key") ?? "";
	const credential = authorization.replace(/^Bearer\s+/i, "").trim();
	if (credential.length > 0) return `key:${fingerprint(credential)}`;
	const forwarded = request.headers.get("x-forwarded-for") ?? "";
	const address = forwarded.split(",")[0]?.trim();
	return `ip:${address || "unknown"}`;
}

/** Short non-reversible label; the credential itself never reaches a map key. */
function fingerprint(value: string): string {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(36);
}

export function tooManyRequests(retryAfterSeconds: number): Response {
	return Response.json(
		{ error: "Too Many Requests", message: "Slow down and try again shortly." },
		{ status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
	);
}
