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
const SCENARIO_ID = "11111111-1111-4111-8111-111111111111";
const REACHED_THE_MINT = "REACHED_THE_MINT";

const approval = { fromStatus: "PAID_REVIEW_REQUIRED", auditEvent: "ORDER_APPROVED" };

/**
 * An order awaiting approval and its lock, with every write past the reads
 * standing in for the mint: getting that far means approval would have minted.
 */
function dbWithLock(
	systems: (string | { systemId: string; channel: "VISITOR" | "API" })[],
	orderStatus = "PAID_REVIEW_REQUIRED",
) {
	const scopeSystems = systems.map((system) =>
		typeof system === "string" ? { systemId: system, channel: "VISITOR" as const } : system,
	);
	let selectCall = 0;
	const reachedMint = () => {
		throw new Error(REACHED_THE_MINT);
	};
	const tx = {
		execute: vi.fn(async () => undefined),
		update: vi.fn(reachedMint),
		insert: vi.fn(reachedMint),
		select: vi.fn(() => {
			selectCall += 1;
			const call = selectCall;
			const query: Record<string, unknown> = {};
			query.from = () => query;
			query.where = () => query;
			query.orderBy = () => query;
			query.limit = async () => {
				if (call === 1)
					return [{ id: ORDER_ID, organizationId: context.tenantId, lockId: LOCK_ID, status: orderStatus }];
				if (call === 2)
					return [
						{
							id: LOCK_ID,
							organizationId: context.tenantId,
							version: 1,
							expectedRuns: scopeSystems.length,
							snapshot: {
								measurementScope: {
									scenarios: [SCENARIO_ID],
									systems: scopeSystems,
									repeats: 1,
								},
							},
						},
					];
				reachedMint();
			};
			return query;
		}),
	};
	return {
		transaction: vi.fn(async (work: (runner: typeof tx) => Promise<unknown>) => work(tx)),
	} as unknown as NodePgDatabase<typeof schema>;
}

describe("approving an order locked under an earlier catalog", () => {
	it("refuses a lock that still names Perplexity before any permit is minted", async () => {
		const repositories = createSelenaRepositories(dbWithLock(["ChatGPT", "Gemini", "Perplexity"]));

		await expect(
			repositories.dispatch.createPermits(context, ORDER_ID, { approval, measuredSystemsOnly: true }),
		).rejects.toThrow("SELENA_SYSTEM_NOT_MEASURED: Perplexity");
	});

	it("lets a current Snapshot lock with Perplexity (API) through to minting", async () => {
		const repositories = createSelenaRepositories(
			dbWithLock(["ChatGPT", "Gemini", { systemId: "perplexity/sonar", channel: "API" }]),
		);

		await expect(
			repositories.dispatch.createPermits(context, ORDER_ID, { approval, measuredSystemsOnly: true }),
		).rejects.toThrow(REACHED_THE_MINT);
	});

	it("lets a ChatGPT and Gemini lock through to minting", async () => {
		const repositories = createSelenaRepositories(dbWithLock(["ChatGPT", "Gemini"]));

		await expect(
			repositories.dispatch.createPermits(context, ORDER_ID, { approval, measuredSystemsOnly: true }),
		).rejects.toThrow(REACHED_THE_MINT);
	});

	it("leaves an order that is already queued as it was", async () => {
		const repositories = createSelenaRepositories(dbWithLock(["ChatGPT", "Gemini", "Perplexity"], "QUEUED"));

		await expect(
			repositories.dispatch.createPermits(context, ORDER_ID, { approval, measuredSystemsOnly: true }),
		).rejects.toThrow(REACHED_THE_MINT);
	});
});
