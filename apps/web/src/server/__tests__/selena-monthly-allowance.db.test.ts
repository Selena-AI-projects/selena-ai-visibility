/**
 * The allowance rules against a real Postgres with migrations applied, driven
 * through the same run store the worker uses. Set SELENA_TEST_DATABASE_URL to
 * run, e.g.
 *
 *   SELENA_TEST_DATABASE_URL=postgres://localhost/elmo_test pnpm --filter web test selena-monthly-allowance.db
 *
 * Without the variable the suite is skipped, so the regular unit run stays
 * database-free.
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
	ensureOrganization,
	finishPermit,
	fixtureContext,
	type QuotaFixture,
	runOutcome,
	seedCycle,
	seedOrder,
	seedQuotaProject,
} from "./selena-quota-fixture";

const url = process.env.SELENA_TEST_DATABASE_URL;

describe.skipIf(!url)("monthly answer allowance on a database", () => {
	const organizationId = `s8-quota-${Date.now().toString(36)}`;
	let db: import("@workspace/lib/db/organization-transaction").OrganizationDatabase;
	let withOrganizationTransaction: typeof import("@workspace/lib/db/organization-transaction").withOrganizationTransaction;
	let usage: typeof import("../selena-monthly-allowance");
	let repositories: ReturnType<typeof import("@workspace/lib/selena-visibility-repositories").createSelenaRepositories>;

	beforeAll(async () => {
		Reflect.set(process.env, "DATABASE_URL", url);
		db = (await import("@workspace/lib/db/db")).db;
		withOrganizationTransaction = (await import("@workspace/lib/db/organization-transaction"))
			.withOrganizationTransaction;
		usage = await import("../selena-monthly-allowance");
		repositories = (await import("@workspace/lib/selena-visibility-repositories")).createSelenaRepositories(db);
		await ensureOrganization(db, organizationId);
	});

	async function project(name: string): Promise<QuotaFixture> {
		const fixture = await seedQuotaProject(db, {
			organizationId,
			actorId: "s8-fixture",
			name,
			planId: "full-discovery-landscape",
		});
		return fixture;
	}

	const read = (fixture: QuotaFixture) =>
		withOrganizationTransaction(db, organizationId, (tx) =>
			usage.readMonthlyAnswerUsage(tx, { tenantId: organizationId, projectId: fixture.projectId }),
		);

	it("charges a partially successful cycle for its answers and a fully failed one for nothing", async () => {
		const fixture = await project("partial and failed");
		const partial = await seedOrder(fixture, { expectedRuns: 6, orderStatus: "RUNNING" });
		const partialCycle = await seedCycle(fixture, { ...partial, expectedRuns: 6, keyPrefix: `${fixture.projectId}:p` });
		for (const [index, permitId] of partialCycle.permitIds.entries())
			await finishPermit(fixture, permitId, index < 4 ? "SUCCEEDED" : "FAILED");

		const failed = await seedOrder(fixture, { expectedRuns: 6, orderStatus: "RUNNING" });
		const failedCycle = await seedCycle(fixture, { ...failed, expectedRuns: 6, keyPrefix: `${fixture.projectId}:f` });
		for (const permitId of failedCycle.permitIds) await finishPermit(fixture, permitId, "FAILED");

		expect(await read(fixture)).toEqual({ used: 4, reserved: 0 });
		// Both cycles finished every run, so nothing is reserved even though
		// the attempts numbered twelve.
		const ledger = await repositories.costEvents.listForCycle(fixtureContext(fixture), failedCycle.cycleId);
		expect(ledger).toHaveLength(6);
	});

	it("does not charge a redelivered completion twice", async () => {
		const fixture = await project("retry");
		const order = await seedOrder(fixture, { expectedRuns: 3, orderStatus: "RUNNING" });
		const cycle = await seedCycle(fixture, { ...order, expectedRuns: 3, keyPrefix: `${fixture.projectId}:r` });
		const ctx = fixtureContext(fixture);
		const [first, ...rest] = cycle.permitIds;
		if (!first) throw new Error("fixture minted no permits");

		const claimed = await repositories.runs.claim(ctx, first);
		const outcome = runOutcome(claimed.permit.dispatchKey, claimed.permit.systemId, "SUCCEEDED");
		await repositories.runs.complete(ctx, claimed.run.id, outcome);
		// The queue redelivers the job: the permit is spent, the run reused,
		// and the second completion is a no-op.
		const redelivered = await repositories.runs.claim(ctx, first);
		expect(redelivered.claimed).toBe(false);
		expect(redelivered.run.id).toBe(claimed.run.id);
		await repositories.runs.complete(ctx, claimed.run.id, outcome);
		for (const permitId of rest) await finishPermit(fixture, permitId, "SUCCEEDED");

		expect(await read(fixture)).toEqual({ used: 3, reserved: 0 });
	});

	it("reserves the unfinished runs of a cycle in flight and the whole of a paid order without one", async () => {
		const fixture = await project("in flight");
		const running = await seedOrder(fixture, { expectedRuns: 5, orderStatus: "RUNNING" });
		const cycle = await seedCycle(fixture, { ...running, expectedRuns: 5, keyPrefix: `${fixture.projectId}:i` });
		const [a, b] = cycle.permitIds;
		if (!a || !b) throw new Error("fixture minted no permits");
		await finishPermit(fixture, a, "SUCCEEDED");
		await finishPermit(fixture, b, "FAILED");
		await seedOrder(fixture, { expectedRuns: 7, orderStatus: "PAID_REVIEW_REQUIRED" });

		expect(await read(fixture)).toEqual({ used: 1, reserved: 3 + 7 });
	});

	it("lets only one of two simultaneous orders take the last of the month's allowance", async () => {
		const fixture = await project("parallel orders");
		// 800 answers on this plan; 300 already delivered this month.
		const delivered = await seedOrder(fixture, { expectedRuns: 300, orderStatus: "READY" });
		const deliveredCycle = await seedCycle(fixture, {
			...delivered,
			expectedRuns: 300,
			keyPrefix: `${fixture.projectId}:d`,
		});
		const { sql } = await import("drizzle-orm");
		await db.execute(
			sql`update sv_cycles set status = 'READY', completed_runs = 300 where id = ${deliveredCycle.cycleId}`,
		);
		await db.execute(sql`
			insert into sv_runs (organization_id, cycle_id, permit_id, dispatch_key, channel, scenario_id, system_id, status, validity, finished_at)
			select organization_id, cycle_id, id, dispatch_key, channel, scenario_id, system_id, 'SUCCEEDED', 'VALID', now()
			from sv_run_permits where cycle_id = ${deliveredCycle.cycleId}
		`);
		expect(await read(fixture)).toEqual({ used: 300, reserved: 0 });

		// Two operators place a 300-answer order at the same moment. Each
		// checks the allowance and, still inside its transaction, records the
		// paid order, as the order desk does.
		const placeOrder = (label: string) =>
			withOrganizationTransaction(db, organizationId, async (tx) => {
				await usage.assertMonthlyAllowanceAvailable(tx, {
					tenantId: organizationId,
					projectId: fixture.projectId,
					planId: fixture.planId,
					expectedRuns: 300,
				});
				await seedOrder(
					{ ...fixture, db: tx as unknown as typeof db },
					{
						expectedRuns: 300,
						orderStatus: "PAID_REVIEW_REQUIRED",
					},
				);
				return label;
			});
		const outcomes = await Promise.allSettled([placeOrder("first"), placeOrder("second")]);
		const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled");
		const rejected = outcomes.filter((outcome) => outcome.status === "rejected");
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);
		expect(String((rejected[0] as PromiseRejectedResult).reason)).toContain("SELENA_MONTHLY_ALLOWANCE_EXCEEDED");
		expect(await read(fixture)).toEqual({ used: 300, reserved: 300 });
	});
});
