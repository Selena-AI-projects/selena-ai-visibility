import { describe, expect, it } from "vitest";
import { API_POLICY, AUTH_POLICY, callerKey, createRateLimiter, policyForRequest } from "../rate-limit";

function get(url: string, headers: Record<string, string> = {}): Request {
	return new Request(url, { headers });
}

describe("which requests draw on an allowance", () => {
	it("counts the auth calls that take credentials", () => {
		for (const path of ["/api/auth/sign-up/email", "/api/auth/sign-in/email", "/api/auth/forget-password"]) {
			expect(policyForRequest(get(`https://app.example.com${path}`)), path).toEqual(AUTH_POLICY);
		}
	});

	// Every page load reads the session; limiting that would sign people out
	// for browsing rather than stop anyone from guessing a password.
	it("leaves session reads alone", () => {
		expect(policyForRequest(get("https://app.example.com/api/auth/get-session"))).toBeNull();
	});

	it("counts the versioned API and nothing else", () => {
		expect(policyForRequest(get("https://app.example.com/api/v1/selena/projects"))).toEqual(API_POLICY);
		expect(policyForRequest(get("https://app.example.com/app/selena"))).toBeNull();
	});
});

describe("who is counted", () => {
	it("counts an API key's holder rather than their address", () => {
		const key = callerKey(get("https://x/api/v1/brands", { authorization: "Bearer sk-live-abc123" }));
		expect(key.startsWith("key:")).toBe(true);
		expect(key).not.toContain("sk-live-abc123");
	});

	it("counts the first forwarded address when there is no key", () => {
		expect(callerKey(get("https://x/api/auth/sign-in/email", { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
			"ip:203.0.113.7",
		);
	});

	it("keeps two different keys on separate allowances", () => {
		const first = callerKey(get("https://x/api/v1/brands", { authorization: "Bearer one" }));
		const second = callerKey(get("https://x/api/v1/brands", { authorization: "Bearer two" }));
		expect(first).not.toBe(second);
	});
});

describe("the allowance itself", () => {
	it("admits up to the limit and refuses the next one", () => {
		const limiter = createRateLimiter();
		const policy = { bucket: "test", windowMs: 1000, max: 3 };
		for (let attempt = 0; attempt < 3; attempt += 1) {
			expect(limiter.check("ip:1.2.3.4", policy, 0).allowed, `attempt ${attempt}`).toBe(true);
		}
		expect(limiter.check("ip:1.2.3.4", policy, 0)).toEqual({ allowed: false, retryAfterSeconds: 1 });
	});

	it("starts a fresh allowance once the window has passed", () => {
		const limiter = createRateLimiter();
		const policy = { bucket: "test", windowMs: 1000, max: 1 };
		expect(limiter.check("ip:1.2.3.4", policy, 0).allowed).toBe(true);
		expect(limiter.check("ip:1.2.3.4", policy, 500).allowed).toBe(false);
		expect(limiter.check("ip:1.2.3.4", policy, 1000).allowed).toBe(true);
	});

	it("never lets one caller's refusal reach another", () => {
		const limiter = createRateLimiter();
		const policy = { bucket: "test", windowMs: 1000, max: 1 };
		expect(limiter.check("ip:1.1.1.1", policy, 0).allowed).toBe(true);
		expect(limiter.check("ip:1.1.1.1", policy, 0).allowed).toBe(false);
		expect(limiter.check("ip:2.2.2.2", policy, 0).allowed).toBe(true);
	});

	it("keeps unrelated routes on separate allowances", () => {
		const limiter = createRateLimiter();
		expect(limiter.check("ip:1.2.3.4", { bucket: "auth", windowMs: 1000, max: 1 }, 0).allowed).toBe(true);
		expect(limiter.check("ip:1.2.3.4", { bucket: "api", windowMs: 1000, max: 1 }, 0).allowed).toBe(true);
	});

	it("forgets a caller once their window is over", () => {
		const limiter = createRateLimiter();
		const policy = { bucket: "test", windowMs: 1000, max: 5 };
		limiter.check("ip:1.2.3.4", policy, 0);
		expect(limiter.size).toBe(1);
		limiter.check("ip:1.2.3.4", policy, 2000);
		expect(limiter.size).toBe(1);
	});
});
