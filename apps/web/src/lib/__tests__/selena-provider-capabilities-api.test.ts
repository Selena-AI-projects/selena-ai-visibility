import { describe, expect, it, vi } from "vitest";
import {
	createProviderCapabilitiesRouteHandlers,
	failClosedProviderCapabilitiesStore,
} from "../../server/selena-provider-capabilities-api";

const providerId = "00000000-0000-4000-8000-000000000001";
const auth = {
	actorId: "actor-capabilities-1",
	tenantId: "tenant-capabilities-1",
	role: "owner" as const,
	authType: "api_key" as const,
	permissions: ["provider:canary"],
};

function request() {
	return new Request("https://example.test", { method: "GET" });
}

describe("Selena provider capabilities API", () => {
	it("fails closed without registry/credential proof and never calls a provider", async () => {
		const handlers = createProviderCapabilitiesRouteHandlers({
			authenticate: async () => auth,
			store: failClosedProviderCapabilitiesStore,
			requestId: () => "request-capabilities-1",
		});
		const response = await handlers.capabilities(request(), providerId);
		expect(response.status).toBe(503);
		expect((await response.json()).error).toMatchObject({
			code: "OWNER_GATE_REQUIRED",
			details: { providerCalls: 0 },
		});
	});

	it("requires the separate provider:canary capability scope", async () => {
		const store = { read: vi.fn(async () => null) };
		const handlers = createProviderCapabilitiesRouteHandlers({
			authenticate: async () => ({ ...auth, permissions: ["local:read"] }),
			store,
			requestId: () => "request-capabilities-2",
		});
		expect((await handlers.capabilities(request(), providerId)).status).toBe(403);
		expect(store.read).not.toHaveBeenCalled();
	});

	it("validates provider ID before dispatch", async () => {
		const store = { read: vi.fn(async () => null) };
		const handlers = createProviderCapabilitiesRouteHandlers({
			authenticate: async () => auth,
			store,
			requestId: () => "request-capabilities-3",
		});
		expect((await handlers.capabilities(request(), "not-a-uuid")).status).toBe(400);
		expect(store.read).not.toHaveBeenCalled();
	});
});
