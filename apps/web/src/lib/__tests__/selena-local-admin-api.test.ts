import { describe, expect, it, vi } from "vitest";
import { createSelenaLocalAdminRouteHandlers, failClosedLocalAdminStore } from "../../server/selena-local-admin-api";

const cycleId = "00000000-0000-4000-8000-000000000001";
const runId = "00000000-0000-4000-8000-000000000002";
const providerId = "00000000-0000-4000-8000-000000000003";
const auth = {
	actorId: "actor-1",
	tenantId: "tenant-1",
	role: "owner" as const,
	authType: "api_key" as const,
	permissions: ["local:execute", "provider:canary"],
};

function request(body?: unknown, headers: Record<string, string> = { "Idempotency-Key": "admin-write-1" }) {
	return new Request("https://example.test", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

describe("Selena local admin API", () => {
	it("fails closed for every mutation and never returns synthetic success", async () => {
		const handlers = createSelenaLocalAdminRouteHandlers({
			authenticate: async () => auth,
			store: failClosedLocalAdminStore,
			requestId: () => "request-admin-1",
		});
		const responses = await Promise.all([
			handlers.preflight(request(), cycleId),
			handlers.approve(request(), cycleId),
			handlers.stop(request(), cycleId),
			handlers.mapsRetry(request(), runId),
			handlers.aiRetry(request(), runId),
			handlers.providerCanary(request(), providerId),
		]);
		expect(responses.map((response) => response.status)).toEqual([503, 503, 503, 503, 503, 503]);
		for (const response of responses) {
			expect((await response.json()).error).toMatchObject({
				code: "OWNER_GATE_REQUIRED",
				details: { providerCalls: 0 },
			});
		}
	});

	it("keeps local execution and provider canary scopes separate", async () => {
		const store = { execute: vi.fn(async () => null) };
		const localDenied = createSelenaLocalAdminRouteHandlers({
			authenticate: async () => ({ ...auth, permissions: ["local:read"] }),
			store,
			requestId: () => "request-admin-2",
		});
		expect((await localDenied.approve(request(), cycleId)).status).toBe(403);

		const canaryDenied = createSelenaLocalAdminRouteHandlers({
			authenticate: async () => ({ ...auth, permissions: ["local:execute"] }),
			store,
			requestId: () => "request-admin-3",
		});
		expect((await canaryDenied.providerCanary(request(), providerId)).status).toBe(403);
		expect(store.execute).not.toHaveBeenCalled();
	});

	it("requires idempotency and validates the resource UUID before dispatch", async () => {
		const store = { execute: vi.fn(async () => null) };
		const handlers = createSelenaLocalAdminRouteHandlers({
			authenticate: async () => auth,
			store,
			requestId: () => "request-admin-4",
		});
		expect((await handlers.stop(request({}, {}), cycleId)).status).toBe(400);
		expect((await handlers.stop(request(), "not-a-uuid")).status).toBe(400);
		expect(store.execute).not.toHaveBeenCalled();
	});

	it("passes tenant-bound body hash to an adapter but still requires a durable response", async () => {
		const store = { execute: vi.fn(async () => null) };
		const handlers = createSelenaLocalAdminRouteHandlers({
			authenticate: async () => auth,
			store,
			requestId: () => "request-admin-5",
		});
		const response = await handlers.stop(request({ reason: "owner-request" }), cycleId);
		expect(response.status).toBe(503);
		expect(store.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				auth,
				tenantId: auth.tenantId,
				operation: "stop",
				resourceId: cycleId,
				idempotencyKey: "admin-write-1",
				body: { reason: "owner-request" },
				bodyHash: expect.stringMatching(/^sha256:/),
			}),
		);
	});

	it("returns 202 only when the durable adapter supplies a typed result", async () => {
		const store = {
			execute: vi.fn(async () => ({
				operation: "stop" as const,
				resourceId: cycleId,
				status: "STOPPED" as const,
				providerCalls: 0,
			})),
		};
		const handlers = createSelenaLocalAdminRouteHandlers({
			authenticate: async () => auth,
			store,
			requestId: () => "request-admin-success",
		});

		const response = await handlers.stop(request({ reason: "owner-request" }), cycleId);
		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({
			operation: "stop",
			resourceId: cycleId,
			status: "STOPPED",
			providerCalls: 0,
		});
	});
});
