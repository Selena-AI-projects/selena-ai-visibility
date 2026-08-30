import { describe, expect, it, vi } from "vitest";
import { createSelenaLocalSetupRouteHandlers, failClosedLocalSetupStore } from "../../server/selena-local-setup-api";

const projectId = "00000000-0000-4000-8000-000000000001";
const locationId = "00000000-0000-4000-8000-000000000002";
const auth = {
	actorId: "actor-setup-1",
	tenantId: "tenant-setup-1",
	role: "owner" as const,
	authType: "api_key" as const,
	permissions: ["local:write"],
};

function request(body: unknown, headers: Record<string, string> = { "Idempotency-Key": "setup-write-1" }) {
	return new Request("https://example.test", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

const locationBody = {
	entityId: "00000000-0000-4000-8000-000000000003",
	displayName: "KORA Ubud",
	countryCode: "ID",
	latitude: -8.5069,
	longitude: 115.2625,
	geoPrecision: "COORDINATE",
};
const placeBody = {
	cid: "123456",
	mapsUrl: "https://maps.google.com/?cid=123456",
	identitySource: "USER_CONFIRMED",
	matchPolicy: "PLACE_ID_OR_CID",
};
const keywordBody = {
	language: "en",
	keywords: [{ text: "best cafe ubud", intent: "category", branded: false }],
};

describe("Selena local setup API", () => {
	it("fails closed for location, place identity and keyword-set mutations", async () => {
		const handlers = createSelenaLocalSetupRouteHandlers({
			authenticate: async () => auth,
			store: failClosedLocalSetupStore,
			requestId: () => "request-setup-1",
		});
		const responses = await Promise.all([
			handlers.createLocation(request(locationBody), projectId),
			handlers.confirmPlaceEntity(request(placeBody), locationId),
			handlers.createKeywordSet(request(keywordBody), locationId),
		]);
		expect(responses.map((response) => response.status)).toEqual([503, 503, 503]);
		for (const response of responses)
			expect((await response.json()).error).toMatchObject({
				code: "OWNER_GATE_REQUIRED",
				retryable: false,
				details: { providerCalls: 0 },
			});
	});

	it("requires local:write and idempotency before dispatch", async () => {
		const store = { execute: vi.fn(async () => null) };
		const denied = createSelenaLocalSetupRouteHandlers({
			authenticate: async () => ({ ...auth, permissions: ["local:read"] }),
			store,
			requestId: () => "request-setup-2",
		});
		expect((await denied.createLocation(request(locationBody), projectId)).status).toBe(403);
		expect((await denied.createLocation(request(locationBody), projectId)).status).toBe(403);
		const allowed = createSelenaLocalSetupRouteHandlers({
			authenticate: async () => auth,
			store,
			requestId: () => "request-setup-3",
		});
		expect((await allowed.createLocation(request(locationBody, {}), projectId)).status).toBe(400);
		expect((await allowed.createLocation(request(locationBody), "not-a-uuid")).status).toBe(400);
		expect(store.execute).not.toHaveBeenCalled();
	});

	it("passes tenant-bound setup input and hash to a future durable adapter", async () => {
		const store = { execute: vi.fn(async () => null) };
		const handlers = createSelenaLocalSetupRouteHandlers({
			authenticate: async () => auth,
			store,
			requestId: () => "request-setup-4",
		});
		const response = await handlers.confirmPlaceEntity(request(placeBody), locationId);
		expect(response.status).toBe(503);
		expect(store.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				auth,
				tenantId: auth.tenantId,
				operation: "place-entity-confirm",
				resourceId: locationId,
				idempotencyKey: "setup-write-1",
				body: expect.objectContaining({ cid: "123456" }),
				bodyHash: expect.stringMatching(/^sha256:/),
			}),
		);
	});

	it("returns a typed success only when the durable adapter supplies a valid result", async () => {
		const store = {
			execute: vi.fn(async () => ({
				locationId,
				projectId,
				status: "CREATED" as const,
				normalizedCoordinates: { latitude: -8.5, longitude: 115.2, precision: "COORDINATE" as const },
			})),
		};
		const handlers = createSelenaLocalSetupRouteHandlers({
			authenticate: async () => auth,
			store,
			requestId: () => "request-setup-success",
		});

		const response = await handlers.createLocation(request(locationBody), projectId);
		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({
			locationId,
			projectId,
			status: "CREATED",
			normalizedCoordinates: { latitude: -8.5, longitude: 115.2, precision: "COORDINATE" },
		});
	});
});
