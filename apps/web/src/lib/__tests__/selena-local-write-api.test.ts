import {
	LOCAL_GRID_FORMULA_VERSION,
	mapsLockV1Schema,
	sphericalGridPointsV1,
} from "@workspace/selena-visibility-contracts";
import { describe, expect, it, vi } from "vitest";
import {
	createSelenaLocalWriteRouteHandlers,
	failClosedLocalWriteStore,
	prepareLocalScanCycle,
	prepareLocalScanQuote,
} from "../../server/selena-local-write-api";

const locationId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";
const lockId = "00000000-0000-4000-8000-000000000003";
const quoteId = "00000000-0000-4000-8000-000000000004";
const gridId = "00000000-0000-4000-8000-000000000005";
const cycleId = "00000000-0000-4000-8000-000000000006";
const measurementCycleId = "00000000-0000-4000-8000-000000000007";
const keywordIds = ["10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002"];
const grid = sphericalGridPointsV1({
	formulaVersion: LOCAL_GRID_FORMULA_VERSION,
	locationId,
	centerLatitude: -8.409518,
	centerLongitude: 115.188919,
	radiusMeters: 3000,
	size: 3,
});
const lock = mapsLockV1Schema.parse({
	schemaVersion: 1,
	domainId: "LOCAL_MAPS",
	lockVersion: 1,
	locationId,
	targetIdentity: {
		placeId: "place-1",
		mapsUrl: "https://maps.example/1",
		identitySource: "USER_CONFIRMED",
		matchPolicy: "PLACE_ID_OR_CID",
	},
	grid,
	keywordSet: { id: "20000000-0000-4000-8000-000000000001", version: 1, keywordIds },
	provider: {
		id: "dataforseo",
		endpoint: "maps/serp",
		version: "2026-08-30",
		rankEvidenceSource: "MAPS_SERP_PROVIDER",
		placesApiUsed: false,
	},
	request: {
		device: "MOBILE",
		os: "ios",
		language: "en",
		seDomain: "google.co.id",
		zoom: 14,
		depth: 20,
		searchThisArea: true,
	},
	timestampWindow: { startsAt: "2026-08-30T00:00:00.000Z", endsAt: "2026-09-06T00:00:00.000Z" },
	repeats: 1,
	expectedSlots: 18,
	maxProviderAttempts: 54,
	retryPolicy: { maxAttemptsPerSlot: 3, genericQueueRetryLimit: 0 },
	budget: {
		currency: "USD",
		surfaceCapUsd: "0.50",
		monthlyCapUsd: "15",
		worstCaseCostUsd: "0.032400",
		priceSnapshotVersion: "dataforseo-2026-08-30",
	},
});
const auth = {
	actorId: "actor-1",
	tenantId: "tenant-1",
	role: "owner" as const,
	authType: "api_key" as const,
	permissions: ["local:write"],
};

function request(body: unknown, headers: Record<string, string> = { "Idempotency-Key": "local-write-1" }) {
	return new Request("https://example.test", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

describe("Selena local write API", () => {
	it("projects a lock-first quote without provider calls", () => {
		const result = prepareLocalScanQuote({
			quoteId,
			locationId,
			configurationLockId: lockId,
			lock,
			commercialPriceAmount: "49.00",
			expiresAt: new Date("2026-09-01T00:00:00.000Z"),
		});
		expect(result.maps).toMatchObject({ points: 9, keywords: 2, tasks: 18, maxProviderAttempts: 54 });
		expect(result.providerEnvelope.externalProviderCalls).toBe(0);
		expect(result.priceAmount).toBe("49.00");
	});

	it("projects a new cycle as unexecuted and Maps-only", () => {
		const result = prepareLocalScanCycle({
			cycleId,
			measurementCycleId,
			locationId,
			projectId,
			configurationLockId: lockId,
			gridDefinitionId: gridId,
			lock,
			createdAt: new Date("2026-09-01T00:00:00.000Z"),
		});
		expect(result).toMatchObject({
			cycleId,
			expectedObservations: 18,
			providerCalls: 0,
			domainId: "LOCAL_MAPS",
			status: "CREATED",
		});
	});

	it("fails closed before target schema/RLS proof and never returns 201", async () => {
		const handlers = createSelenaLocalWriteRouteHandlers({
			authenticate: async () => auth,
			store: failClosedLocalWriteStore,
			requestId: () => "request-1",
		});
		const response = await handlers.quote(request({ configurationLockId: lockId }), locationId);
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			error: {
				code: "OWNER_GATE_REQUIRED",
				message: expect.stringContaining("target schema"),
				requestId: "request-1",
				retryable: false,
				details: { blocker: "LOCAL_SCHEMA_NOT_APPLIED_OR_RLS_UNVERIFIED", providerCalls: 0, operation: "quote" },
			},
		});
		const cycleResponse = await handlers.createCycle(
			request({ quoteId, configurationLockId: lockId, gridDefinitionId: gridId }),
			locationId,
		);
		expect(cycleResponse.status).toBe(503);
		expect((await cycleResponse.json()).error).toMatchObject({
			code: "OWNER_GATE_REQUIRED",
			retryable: false,
			details: expect.objectContaining({ operation: "cycle", providerCalls: 0 }),
		});
	});

	it("requires local:write and the HTTP Idempotency-Key", async () => {
		const store = { quote: vi.fn(), createCycle: vi.fn() };
		const noScope = createSelenaLocalWriteRouteHandlers({
			authenticate: async () => ({ ...auth, permissions: ["local:read"] }),
			store,
			requestId: () => "request-2",
		});
		expect((await noScope.quote(request({ configurationLockId: lockId }), locationId)).status).toBe(403);
		const missingKey = createSelenaLocalWriteRouteHandlers({
			authenticate: async () => auth,
			store,
			requestId: () => "request-3",
		});
		expect((await missingKey.quote(request({ configurationLockId: lockId }, {}), locationId)).status).toBe(400);
	});

	it("returns a standard 400 envelope for malformed JSON shapes", async () => {
		const handlers = createSelenaLocalWriteRouteHandlers({
			authenticate: async () => auth,
			store: failClosedLocalWriteStore,
			requestId: () => "request-validation",
		});
		const response = await handlers.quote(request({ configurationLockId: "not-a-uuid" }), locationId);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: {
				code: "VALIDATION_ERROR",
				message: "The request body or path is invalid.",
				requestId: "request-validation",
				retryable: false,
			},
		});
	});

	it("passes a body hash and tenant-bound inputs to an injected persistence adapter", async () => {
		const store = {
			quote: vi.fn(async () =>
				prepareLocalScanQuote({
					quoteId,
					locationId,
					configurationLockId: lockId,
					lock,
					commercialPriceAmount: "49.00",
				}),
			),
			createCycle: vi.fn(),
		};
		const handlers = createSelenaLocalWriteRouteHandlers({
			authenticate: async () => auth,
			store,
			requestId: () => "request-4",
		});
		const response = await handlers.quote(request({ configurationLockId: lockId }), locationId);
		expect(response.status).toBe(201);
		expect(store.quote).toHaveBeenCalledWith(
			expect.objectContaining({
				locationId,
				tenantId: auth.tenantId,
				idempotencyKey: "local-write-1",
				bodyHash: expect.stringMatching(/^sha256:/),
				auth,
			}),
		);
	});
});
