import { describe, expect, it, vi } from "vitest";
import { prepareLocalMapsBrightDataCanary } from "./selena-local-maps-canary";
import { persistLocalMapsCanaryPlan } from "./selena-local-maps-canary-persistence";

const ids = {
	measurementCycleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	localCycleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	locationId: "11111111-1111-4111-8111-111111111111",
	keywordSetId: "22222222-2222-4222-8222-222222222222",
	keywordId: "33333333-3333-4333-8333-333333333333",
	attemptId: "44444444-4444-4444-8444-444444444444",
};

function plan() {
	return prepareLocalMapsBrightDataCanary({
		organizationId: "org-gate1",
		...ids,
		configurationLockId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
		reservationId: "55555555-5555-4555-8555-555555555555",
		mapsUrl: "https://www.google.com/maps/place/AVLI+Uluwatu+-+Modern+Greek/@-8.8165625,115.0932322,17z/data=!3m1!4b1!4m6!3m5!1s0x2dd2451a18a503d3:0x13affe71f7a2fe91!8m2!3d-8.8165625!4d115.0958125!16s%2Fg%2F11xghttkxm?entry=ttu",
		keywordText: "Greek restaurant Uluwatu",
		startsAt: "2026-09-05T00:00:00.000Z",
		endsAt: "2026-09-06T00:00:00.000Z",
	});
}

function fakeDb() {
	const inserted: unknown[] = [];
	let selectCount = 0;
	const tx = {
		select: () => ({
			from: () => ({
				where: () => ({
					limit: async () => {
						selectCount += 1;
						return selectCount === 1 ? [{ id: "project-1" }] : [{ id: ids.locationId }];
					},
				}),
			}),
		}),
		insert: () => ({ values: async (value: unknown) => { inserted.push(value); return []; } }),
	};
	return {
		inserted,
		db: { transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx) },
	};
}

describe("durable Local Maps canary persistence", () => {
	it("writes lock, cycle, grid, keyword and one reserved attempt in one tenant transaction", async () => {
		const fake = fakeDb();
		const result = await persistLocalMapsCanaryPlan({
			db: fake.db as never,
			plan: plan(),
			projectId: "project-1",
			actorId: "owner-test",
			engineSha: "engine-test",
			setTenantContext: vi.fn(async () => undefined),
			now: () => new Date("2026-09-05T01:00:00.000Z"),
		});
		expect(result.providerCallAuthorized).toBe(false);
		expect(result.budgetCapUsd).toBe("5.000000");
		expect(fake.inserted).toHaveLength(7);
		expect(fake.inserted[0]).toMatchObject({ projectId: "project-1", budgetCap: "5.000000" });
		expect(fake.inserted[5]).toMatchObject({ provider: "brightdata-google-maps-serp", status: "CREATED" });
		expect(fake.inserted[6]).toMatchObject({ status: "CLAIMED", budgetState: "RESERVED", reservedCostUsd: "0.004500" });
	});

	it("fails closed when the project is outside the tenant", async () => {
		const fake = fakeDb();
		(fake.db.transaction as unknown as ReturnType<typeof vi.fn>);
		const tx = {
			select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
		};
		const db = { transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx) };
		await expect(persistLocalMapsCanaryPlan({
			db: db as never, plan: plan(), projectId: "other", actorId: "owner-test", engineSha: "engine-test",
			setTenantContext: vi.fn(async () => undefined),
		})).rejects.toThrow("LOCAL_MAPS_CANARY_PROJECT_NOT_FOUND");
	});
});
