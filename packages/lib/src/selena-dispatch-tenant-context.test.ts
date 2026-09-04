import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";
import type * as schema from "./db/schema";
import { createSelenaRepositories, type SelenaRepositoryContext } from "./selena-visibility-repositories";

const context: SelenaRepositoryContext = {
	actorId: "actor-1",
	tenantId: "tenant-1",
	role: "owner",
	authType: "api_key",
	permissions: ["client:write"],
};

const ORDER_ID = "239c25cb-a855-4dcd-8798-c85b6408cf73";
const LOCK_ID = "8e53e776-7933-4cc0-a7c9-141d95eb5aed";
const REACHED_THE_MINT = "REACHED_THE_MINT";

/**
 * A database that can only be reached through a transaction, which is what the
 * deployment behaves like: the RLS policies match on a setting that exists
 * nowhere else, so a tenant read on the pool connection returns no rows and the
 * caller's own order reads back as another tenant's.
 *
 * Modelling that as a missing capability rather than as empty results makes the
 * escape loud here instead of silent in production.
 */
function transactionOnlyDb() {
	const events: string[] = [];
	let selectCall = 0;
	const tx = {
		execute: vi.fn(async () => {
			events.push("tenant-context");
		}),
		select: vi.fn(() => {
			selectCall += 1;
			const call = selectCall;
			const query: Record<string, unknown> = {};
			query.from = () => query;
			query.where = () => query;
			query.orderBy = () => query;
			query.limit = async () => {
				if (call === 1) {
					events.push("order-read");
					return [{ id: ORDER_ID, organizationId: context.tenantId, lockId: LOCK_ID, status: "APPROVED" }];
				}
				if (call === 2) {
					events.push("lock-read");
					return [
						{
							id: LOCK_ID,
							organizationId: context.tenantId,
							version: 3,
							expectedRuns: 3,
							snapshot: {
								measurementScope: {
									scenarios: ["11111111-1111-4111-8111-111111111111"],
									systems: [
										{ systemId: "ChatGPT", channel: "VISITOR" },
										{ systemId: "Gemini", channel: "VISITOR" },
										{ systemId: "Perplexity", channel: "VISITOR" },
									],
									repeats: 1,
								},
							},
						},
					];
				}
				throw new Error(REACHED_THE_MINT);
			};
			return query;
		}),
	};
	const db = {
		transaction: vi.fn(async (work: (runner: typeof tx) => Promise<unknown>) => work(tx)),
	} as unknown as NodePgDatabase<typeof schema>;
	return { db, events };
}

describe("minting permits", () => {
	// The order and its lock were read on the pool connection, where the tenant
	// setting is absent. Every approval refused with the order reading as
	// another tenant's, and no unit test saw it because a mocked pool answers
	// queries that a policy would not.
	it("reads the order and its lock under the tenant setting", async () => {
		const { db, events } = transactionOnlyDb();
		const repositories = createSelenaRepositories(db);

		await expect(repositories.dispatch.createPermits(context, ORDER_ID)).rejects.toThrow(REACHED_THE_MINT);

		expect(events.slice(0, 4)).toEqual(["tenant-context", "order-read", "tenant-context", "lock-read"]);
	});
});
