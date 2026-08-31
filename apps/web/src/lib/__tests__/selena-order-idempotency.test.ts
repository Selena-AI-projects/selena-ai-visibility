import { describe, expect, it } from "vitest";
import { freezeSelenaOrderRequest, matchesFrozenSelenaOrderRequest } from "../../server/selena-order-idempotency";

const request = {
	projectId: "11111111-1111-4111-8111-111111111111",
	planId: "one_time_snapshot",
	scenarioIds: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
};

describe("Selena order idempotency identity", () => {
	it("freezes caller-controlled identity independently of catalog-derived execution fields", () => {
		const frozen = freezeSelenaOrderRequest(request);
		expect(frozen).toEqual({
			schemaVersion: 1,
			projectId: request.projectId,
			planId: request.planId,
			scenarioIds: [...request.scenarioIds].sort(),
		});
		expect(frozen).not.toHaveProperty("systems");
		expect(frozen).not.toHaveProperty("repeats");
	});

	it("accepts a semantic retry with reordered scenarios", () => {
		const frozen = freezeSelenaOrderRequest(request);
		expect(
			matchesFrozenSelenaOrderRequest(frozen, { ...request, scenarioIds: [...request.scenarioIds].reverse() }),
		).toBe(true);
	});

	it("rejects reuse for a different project, plan, scenario payload, or malformed snapshot", () => {
		const frozen = freezeSelenaOrderRequest(request);
		expect(matchesFrozenSelenaOrderRequest(frozen, { ...request, projectId: "other" })).toBe(false);
		expect(matchesFrozenSelenaOrderRequest(frozen, { ...request, planId: "other" })).toBe(false);
		expect(matchesFrozenSelenaOrderRequest(frozen, { ...request, scenarioIds: [request.scenarioIds[0]] })).toBe(false);
		expect(matchesFrozenSelenaOrderRequest({ ...frozen, schemaVersion: 2 }, request)).toBe(false);
		expect(matchesFrozenSelenaOrderRequest({ ...frozen, scenarioIds: [null] }, request)).toBe(false);
	});
});
