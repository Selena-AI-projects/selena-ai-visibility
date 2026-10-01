/**
 * QC sign-off against a real Postgres: a cycle with answers can be published,
 * one without a single answer cannot. Set SELENA_TEST_DATABASE_URL to run;
 * without it the suite is skipped.
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
	ensureOrganization,
	finishPermit,
	fixtureContext,
	type QuotaFixture,
	seedCycle,
	seedOrder,
	seedQuotaProject,
} from "./selena-quota-fixture";

const url = process.env.SELENA_TEST_DATABASE_URL;

describe.skipIf(!url)("QC sign-off on a database", () => {
	const organizationId = `r2-qc-${Date.now().toString(36)}`;
	let db: import("@workspace/lib/db/organization-transaction").OrganizationDatabase;
	let repositories: ReturnType<typeof import("@workspace/lib/selena-visibility-repositories").createSelenaRepositories>;

	beforeAll(async () => {
		Reflect.set(process.env, "DATABASE_URL", url);
		db = (await import("@workspace/lib/db/db")).db;
		repositories = (await import("@workspace/lib/selena-visibility-repositories")).createSelenaRepositories(db);
		await ensureOrganization(db, organizationId);
	});

	/** An order whose three runs finished with the given outcomes, sitting in QC. */
	async function reviewedOrder(name: string, outcomes: Array<"SUCCEEDED" | "FAILED">) {
		const fixture: QuotaFixture = await seedQuotaProject(db, {
			organizationId,
			actorId: "r2-qc-fixture",
			name,
			planId: "visibility-snapshot",
		});
		const order = await seedOrder(fixture, { expectedRuns: outcomes.length, orderStatus: "RUNNING" });
		const cycle = await seedCycle(fixture, { ...order, expectedRuns: outcomes.length, keyPrefix: `${fixture.projectId}:q` });
		for (const [index, permitId] of cycle.permitIds.entries()) await finishPermit(fixture, permitId, outcomes[index]);
		return { fixture, orderId: order.orderId };
	}

	const approve = (fixture: QuotaFixture, orderId: string) =>
		repositories.qcRecords.create(fixtureContext(fixture), {
			orderId,
			reviewedAt: new Date(),
			scope: "every answer read",
			decision: "approved",
		});

	const orderStatus = async (fixture: QuotaFixture, orderId: string) =>
		(await repositories.orders.list(fixtureContext(fixture))).find((order) => order.id === orderId)?.status;

	it("publishes a cycle whose runs answered", async () => {
		const { fixture, orderId } = await reviewedOrder("all answered", ["SUCCEEDED", "SUCCEEDED", "SUCCEEDED"]);
		await approve(fixture, orderId);
		expect(await orderStatus(fixture, orderId)).toBe("READY");
	});

	it("publishes a partly answered cycle, whose report then shows the gaps", async () => {
		const { fixture, orderId } = await reviewedOrder("partly answered", ["SUCCEEDED", "FAILED", "FAILED"]);
		await approve(fixture, orderId);
		expect(await orderStatus(fixture, orderId)).toBe("READY");
	});

	it("refuses to publish a cycle in which no run answered", async () => {
		const { fixture, orderId } = await reviewedOrder("nothing answered", ["FAILED", "FAILED", "FAILED"]);
		await expect(approve(fixture, orderId)).rejects.toThrow("SELENA_QC_NO_VALID_ANSWERS");
		expect(await orderStatus(fixture, orderId)).toBe("QC_REQUIRED");
	});
});
