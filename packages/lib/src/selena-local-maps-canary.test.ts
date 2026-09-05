import { describe, expect, it, vi } from "vitest";
import { invokeLocalMapsBrightDataCanary, prepareLocalMapsBrightDataCanary } from "./selena-local-maps-canary";

const input = {
	organizationId: "org-gate1",
	measurementCycleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	localCycleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	configurationLockId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	locationId: "11111111-1111-4111-8111-111111111111",
	keywordSetId: "22222222-2222-4222-8222-222222222222",
	keywordId: "33333333-3333-4333-8333-333333333333",
	attemptId: "44444444-4444-4444-8444-444444444444",
	reservationId: "55555555-5555-4555-8555-555555555555",
	mapsUrl: "https://www.google.com/maps/place/AVLI+Uluwatu+-+Modern+Greek/@-8.8165625,115.0932322,17z/data=!3m1!4b1!4m6!3m5!1s0x2dd2451a18a503d3:0x13affe71f7a2fe91!8m2!3d-8.8165625!4d115.0958125!16s%2Fg%2F11xghttkxm?entry=ttu",
	keywordText: "Greek restaurant Uluwatu",
	startsAt: "2026-09-05T00:00:00.000Z",
	endsAt: "2026-09-06T00:00:00.000Z",
};

describe("Local Maps Bright Data canary plan", () => {
	it("freezes AVLI identity, exact keyword and a worst-case cost below $5", () => {
		const plan = prepareLocalMapsBrightDataCanary(input);
		expect(plan.lock.targetIdentity.cid).toBe("0x13affe71f7a2fe91");
		expect(plan.request.keyword.text).toBe(input.keywordText);
		expect(plan.lock.expectedSlots).toBe(9);
		expect(plan.lock.budget.worstCaseCostUsd).toBe("0.040500");
		expect(plan.lock.budget.surfaceCapUsd).toBe("5.000000");
		expect(plan.providerCallAuthorized).toBe(false);
	});

	it("stops before the executor and provider when explicit invocation is absent", async () => {
		const executor = vi.fn();
		const result = await invokeLocalMapsBrightDataCanary({ plan: prepareLocalMapsBrightDataCanary(input), executor });
		expect(result).toEqual({ status: "OWNER_GATE_REQUIRED", providerCalls: 0, reason: "EXPLICIT_PROVIDER_CALL_FLAG_REQUIRED" });
		expect(executor).not.toHaveBeenCalled();
	});

	it("rejects a non-approved keyword or non-Google Maps identity", () => {
		expect(() => prepareLocalMapsBrightDataCanary({ ...input, keywordText: "best restaurant" })).toThrow("LOCAL_MAPS_CANARY_KEYWORD_NOT_APPROVED");
		expect(() => prepareLocalMapsBrightDataCanary({ ...input, mapsUrl: "https://example.com/place/avli" })).toThrow("LOCAL_MAPS_CANARY_MAPS_URL_INVALID");
	});
});
