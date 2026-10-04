/**
 * The weekly digest's source against a real Postgres: the cycle a week is
 * about is the newest one that finished before the week ended, not the newest
 * one created. Set SELENA_TEST_DATABASE_URL to run; without it the suite is
 * skipped.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
	ensureOrganization,
	finishPermit,
	type QuotaFixture,
	seedCycle,
	seedOrder,
	seedQuotaProject,
	setCycleStatus,
} from "./selena-quota-fixture";

const url = process.env.SELENA_TEST_DATABASE_URL;

const SUNDAY = new Date("2026-09-27T20:00:00Z");
const MONDAY_NIGHT = new Date("2026-09-28T01:00:00Z");
const WEEK_END = new Date("2026-09-28T00:00:00Z");
const NEXT_WEEK_END = new Date("2026-10-05T00:00:00Z");
// The fixture stamps runs with placeholder scenario ids; the store looks
// scenarios up by uuid, as the real dispatcher stamps them.
const SCENARIO_IDS = [randomUUID(), randomUUID()];

describe.skipIf(!url)("weekly digest source on a database", () => {
	const organizationId = `digest-source-${Date.now().toString(36)}`;
	let db: import("@workspace/lib/db/organization-transaction").OrganizationDatabase;
	let sql: typeof import("drizzle-orm").sql;
	let withOrganizationTransaction: typeof import("@workspace/lib/db/organization-transaction").withOrganizationTransaction;
	let readWeeklyDigestSource: typeof import("@workspace/lib/selena-weekly-digest-store").readWeeklyDigestSource;
	let projectId: string;
	let sundayCycleId: string;
	let mondayCycleId: string;

	/** A READY cycle, created after the ones before it, whose runs all finished at `finishedAt`. */
	async function readyCycle(fixture: QuotaFixture, key: string, finishedAt: Date): Promise<string> {
		const order = await seedOrder(fixture, { expectedRuns: 2, orderStatus: "RUNNING" });
		const cycle = await seedCycle(fixture, { ...order, expectedRuns: 2, keyPrefix: `${fixture.projectId}:${key}` });
		for (const permitId of cycle.permitIds) await finishPermit(fixture, permitId, "SUCCEEDED");
		await setCycleStatus(fixture, cycle.cycleId, "READY");
		for (const [index, scenarioId] of SCENARIO_IDS.entries())
			await db.execute(
				sql`update sv_runs set finished_at = ${finishedAt}, scenario_id = ${scenarioId}
					where cycle_id = ${cycle.cycleId} and organization_id = ${organizationId} and scenario_id = ${`scenario-${index}`}`,
			);
		return cycle.cycleId;
	}

	beforeAll(async () => {
		Object.assign(process.env, { DATABASE_URL: url, DEPLOYMENT_MODE: "local", APP_URL: "http://localhost:3000" });
		db = (await import("@workspace/lib/db/db")).db;
		sql = (await import("drizzle-orm")).sql;
		withOrganizationTransaction = (await import("@workspace/lib/db/organization-transaction"))
			.withOrganizationTransaction;
		readWeeklyDigestSource = (await import("@workspace/lib/selena-weekly-digest-store")).readWeeklyDigestSource;
		await ensureOrganization(db, organizationId);
		const fixture = await seedQuotaProject(db, {
			organizationId,
			actorId: "digest-source-fixture",
			name: "Digest source",
			planId: "visibility-snapshot",
		});
		projectId = fixture.projectId;
		sundayCycleId = await readyCycle(fixture, "sunday", SUNDAY);
		mondayCycleId = await readyCycle(fixture, "monday", MONDAY_NIGHT);
	});

	const read = (periodEnd: Date) =>
		withOrganizationTransaction(db, organizationId, (tx) =>
			readWeeklyDigestSource(tx, organizationId, projectId, { periodEnd }),
		);

	it("digests the cycle finished on Sunday for the week that ended at Monday midnight", async () => {
		const source = await read(WEEK_END);
		expect(source?.cycle).toEqual({ id: sundayCycleId, completedAt: SUNDAY });
		expect(source?.previousCycleId).toBeNull();
		expect(source?.diff).toBeNull();
	});

	it("digests the cycle finished after midnight the week after, compared with the Sunday one", async () => {
		const source = await read(NEXT_WEEK_END);
		expect(source?.cycle).toEqual({ id: mondayCycleId, completedAt: MONDAY_NIGHT });
		expect(source?.previousCycleId).toBe(sundayCycleId);
		expect(source?.diff).not.toBeNull();
	});
});
