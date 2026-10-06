/**
 * Recommendation follow-ups against a real Postgres with migration 0080
 * applied: one row per recommendation per cycle however often it is saved,
 * one audit event per save, and nothing visible or writable from another
 * workspace — through the repository and through the row policy itself. Set
 * SELENA_TEST_DATABASE_URL to run; without it the suite is skipped.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureOrganization, seedCycle, seedOrder, seedQuotaProject, setCycleStatus } from "./selena-quota-fixture";

const url = process.env.SELENA_TEST_DATABASE_URL;

// Superusers bypass row security, and the test connection is one; the policy
// is exercised through a second role that cannot.
const RLS_ROLE = "selena_actions_rls";

type Tenant = {
	organizationId: string;
	actorId: string;
	projectId: string;
	cycleId: string;
	ctx: { actorId: string; tenantId: string };
};

describe.skipIf(!url)("recommendation follow-ups on a database", () => {
	let db: import("@workspace/lib/db/organization-transaction").OrganizationDatabase;
	let rlsDb: import("drizzle-orm/node-postgres").NodePgDatabase<typeof import("@workspace/lib/db/schema")> & {
		$client: { end(): Promise<void> };
	};
	let sql: typeof import("drizzle-orm").sql;
	let schema: typeof import("@workspace/lib/db/schema");
	let withOrganizationTransaction: typeof import("@workspace/lib/db/organization-transaction").withOrganizationTransaction;
	let repository: import("@workspace/lib/selena-recommendation-followups-store").RecommendationFollowupRepository;
	let inputSchema: typeof import("@workspace/lib/selena-recommendation-followups").recommendationFollowupInputSchema;
	let Unavailable: typeof import("@workspace/lib/selena-recommendation-followups").RecommendationFollowupsUnavailable;
	let a: Tenant;
	let b: Tenant;

	beforeAll(async () => {
		Object.assign(process.env, { DATABASE_URL: url, DEPLOYMENT_MODE: "local", APP_URL: "http://localhost:3000" });
		db = (await import("@workspace/lib/db/db")).db;
		sql = (await import("drizzle-orm")).sql;
		schema = await import("@workspace/lib/db/schema");
		withOrganizationTransaction = (await import("@workspace/lib/db/organization-transaction"))
			.withOrganizationTransaction;
		repository = (
			await import("@workspace/lib/selena-recommendation-followups-store")
		).createRecommendationFollowupRepository(db);
		const followupModule = await import("@workspace/lib/selena-recommendation-followups");
		inputSchema = followupModule.recommendationFollowupInputSchema;
		Unavailable = followupModule.RecommendationFollowupsUnavailable;

		// The test connection is a superuser and so bypasses every row policy;
		// the policy is exercised through a role that cannot. Creating it needs
		// CREATEROLE on the test connection, which a local Postgres gives.
		await db
			.execute(
				sql.raw(
					`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RLS_ROLE}') THEN CREATE ROLE ${RLS_ROLE} LOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$`,
				),
			)
			.catch((cause: unknown) => {
				throw new Error(`SELENA_TEST_DATABASE_URL needs CREATEROLE for the row-policy test: ${String(cause)}`);
			});
		await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO ${RLS_ROLE}`));
		await db.execute(sql.raw(`GRANT SELECT, INSERT, UPDATE ON sv_recommendation_followups TO ${RLS_ROLE}`));
		const roleUrl = new URL(url as string);
		roleUrl.username = RLS_ROLE;
		roleUrl.password = "";
		const { drizzle } = await import("drizzle-orm/node-postgres");
		rlsDb = drizzle(roleUrl.toString(), { schema });

		a = await readyTenant("a");
		b = await readyTenant("b");
	});

	afterAll(async () => {
		await rlsDb?.$client.end();
		// The role is this suite's fixture, not the cluster's.
		await db.execute(sql.raw(`REVOKE ALL ON sv_recommendation_followups FROM ${RLS_ROLE}`));
		await db.execute(sql.raw(`REVOKE USAGE ON SCHEMA public FROM ${RLS_ROLE}`));
		await db.execute(sql.raw(`DROP ROLE IF EXISTS ${RLS_ROLE}`));
	});

	/** A workspace whose project has one signed-off cycle, as the report page finds it. */
	async function readyTenant(label: string): Promise<Tenant> {
		const organizationId = `s6-${label}-${randomUUID()}`;
		await ensureOrganization(db, organizationId);
		const fixture = await seedQuotaProject(db, {
			organizationId,
			actorId: `s6-user-${label}-${randomUUID().slice(0, 8)}`,
			name: `Follow-up ${label}`,
			planId: "visibility-snapshot",
		});
		const order = await seedOrder(fixture, { expectedRuns: 3, orderStatus: "READY" });
		const cycle = await seedCycle(fixture, { ...order, expectedRuns: 3, keyPrefix: `${fixture.projectId}:s6` });
		await setCycleStatus(fixture, cycle.cycleId, "READY");
		return {
			organizationId,
			actorId: fixture.actorId,
			projectId: fixture.projectId,
			cycleId: cycle.cycleId,
			ctx: { actorId: fixture.actorId, tenantId: organizationId },
		};
	}

	/** The database's own words: drizzle wraps a refused statement, the reason sits at the end of the cause chain. */
	async function refusal(work: Promise<unknown>): Promise<string> {
		try {
			await work;
		} catch (error) {
			let current: unknown = error;
			while (current instanceof Error && current.cause instanceof Error) current = current.cause;
			return current instanceof Error ? current.message : String(current);
		}
		throw new Error("expected the statement to be refused");
	}

	const SOURCE_KEY = "SOURCE_PRESENCE:tripadvisor.com";
	const CATEGORY_KEY = "CATEGORY_CONTENT";

	const rowCount = async (tenant: Tenant) =>
		Number(
			(
				await db.execute(
					sql`select count(*) from sv_recommendation_followups where organization_id = ${tenant.organizationId}`,
				)
			).rows[0]?.count ?? 0,
		);

	const auditTrail = async (tenant: Tenant, subjectId: string) =>
		(
			await db.execute(
				sql`select details from sv_audit_events where organization_id = ${tenant.organizationId} and event = 'RECOMMENDATION_FOLLOWUP_UPDATED' and subject_kind = 'sv_recommendation_followups' and subject_id = ${subjectId} order by at`,
			)
		).rows.map((row) => row.details);

	it("rewrites one row per recommendation and records where each save moved it from", async () => {
		const first = await repository.upsert(a.ctx, {
			projectId: a.projectId,
			cycleId: a.cycleId,
			recommendationKey: SOURCE_KEY,
			status: "IN_PROGRESS",
			assignee: "  Anna  ",
			dueOn: "2026-11-30",
			note: "",
		});
		expect(first).toMatchObject({
			recommendationKey: SOURCE_KEY,
			status: "IN_PROGRESS",
			assignee: "Anna",
			dueOn: "2026-11-30",
			note: null,
			updatedBy: a.actorId,
		});

		const second = await repository.upsert(a.ctx, {
			projectId: a.projectId,
			cycleId: a.cycleId,
			recommendationKey: SOURCE_KEY,
			status: "DONE",
			note: "Listed on the page",
		});
		expect(second.id).toBe(first.id);
		expect(second).toMatchObject({ status: "DONE", assignee: null, dueOn: null, note: "Listed on the page" });
		expect(second.updatedAt.getTime()).toBeGreaterThanOrEqual(first.updatedAt.getTime());
		expect(await rowCount(a)).toBe(1);

		const listed = await repository.list(a.ctx, { projectId: a.projectId, cycleId: a.cycleId });
		expect(listed.map((row) => [row.recommendationKey, row.status])).toEqual([[SOURCE_KEY, "DONE"]]);

		expect(await auditTrail(a, first.id)).toEqual([
			{ recommendationKey: SOURCE_KEY, from: null, to: "IN_PROGRESS", assignee: "Anna", dueOn: "2026-11-30" },
			{ recommendationKey: SOURCE_KEY, from: "IN_PROGRESS", to: "DONE", assignee: null, dueOn: null },
		]);

		// Saving the same thing again is not a change the history should show.
		const repeated = await repository.upsert(a.ctx, {
			projectId: a.projectId,
			cycleId: a.cycleId,
			recommendationKey: SOURCE_KEY,
			status: "DONE",
			note: "Listed on the page",
		});
		expect(repeated).toEqual(second);
		expect(await auditTrail(a, first.id)).toHaveLength(2);
	});

	it("keeps one workspace's follow-ups out of another's reach through the repository", async () => {
		await repository.upsert(a.ctx, {
			projectId: a.projectId,
			cycleId: a.cycleId,
			recommendationKey: CATEGORY_KEY,
			status: "IN_PROGRESS",
		});
		const before = await rowCount(a);

		expect(await repository.list(b.ctx, { projectId: a.projectId, cycleId: a.cycleId })).toEqual([]);
		await expect(
			repository.upsert(b.ctx, {
				projectId: a.projectId,
				cycleId: a.cycleId,
				recommendationKey: CATEGORY_KEY,
				status: "DISMISSED",
			}),
		).rejects.toThrow("Not found");

		expect(await rowCount(a)).toBe(before);
		expect(await rowCount(b)).toBe(0);
		const [row] = await repository.list(a.ctx, { projectId: a.projectId, cycleId: a.cycleId });
		expect(row?.status).not.toBe("DISMISSED");
	});

	it("hides and refuses the rows at the row policy for a role that cannot bypass it", async () => {
		const keysUnder = (organizationId: string) =>
			withOrganizationTransaction(rlsDb, organizationId, (tx) =>
				tx
					.select({ key: schema.svRecommendationFollowups.recommendationKey })
					.from(schema.svRecommendationFollowups)
					.then((rows) => rows.map((row) => row.key).sort()),
			);
		// No tenant filter in the query: the policy alone decides what is visible.
		expect(await keysUnder(b.organizationId)).toEqual([]);
		expect(await keysUnder(a.organizationId)).toEqual([CATEGORY_KEY, SOURCE_KEY]);

		expect(
			await refusal(
				withOrganizationTransaction(rlsDb, b.organizationId, (tx) =>
					tx.insert(schema.svRecommendationFollowups).values({
						organizationId: a.organizationId,
						projectId: a.projectId,
						cycleId: a.cycleId,
						recommendationKey: "OWN_SITE_UNDERCITED:brand.example",
						status: "NEW",
						updatedBy: b.actorId,
					}),
				),
			),
		).toMatch(/row-level security/);
		expect(await rowCount(a)).toBe(2);
	});

	it("answers unavailable, not with a driver error, where the runtime role has no grant yet", async () => {
		const { createRecommendationFollowupRepository } = await import(
			"@workspace/lib/selena-recommendation-followups-store"
		);
		const roleRepository = createRecommendationFollowupRepository(rlsDb);
		await db.execute(sql.raw(`REVOKE ALL ON sv_recommendation_followups FROM ${RLS_ROLE}`));
		try {
			await expect(roleRepository.list(a.ctx, { projectId: a.projectId, cycleId: a.cycleId })).rejects.toBeInstanceOf(
				Unavailable,
			);
		} finally {
			await db.execute(sql.raw(`GRANT SELECT, INSERT, UPDATE ON sv_recommendation_followups TO ${RLS_ROLE}`));
		}
		expect(await roleRepository.list(a.ctx, { projectId: a.projectId, cycleId: a.cycleId })).toHaveLength(2);
	});

	it("answers unavailable for reads and saves where migration 0080 has not been applied", async () => {
		await db.execute(sql.raw("ALTER TABLE sv_recommendation_followups RENAME TO sv_recommendation_followups_parked"));
		try {
			await expect(repository.list(a.ctx, { projectId: a.projectId, cycleId: a.cycleId })).rejects.toBeInstanceOf(
				Unavailable,
			);
			await expect(
				repository.upsert(a.ctx, {
					projectId: a.projectId,
					cycleId: a.cycleId,
					recommendationKey: SOURCE_KEY,
					status: "DONE",
				}),
			).rejects.toBeInstanceOf(Unavailable);
		} finally {
			await db.execute(sql.raw("ALTER TABLE sv_recommendation_followups_parked RENAME TO sv_recommendation_followups"));
		}
		expect(await rowCount(a)).toBe(2);
	});

	it("rejects a status outside the workflow before and at the database", async () => {
		expect(inputSchema.safeParse({ status: "LATER" }).success).toBe(false);
		expect(
			await refusal(
				db.execute(
					sql`insert into sv_recommendation_followups (organization_id, project_id, cycle_id, recommendation_key, status, updated_by) values (${a.organizationId}, ${a.projectId}::uuid, ${a.cycleId}::uuid, 'SOURCE_PRESENCE:yelp.com', 'LATER', ${a.actorId})`,
				),
			),
		).toMatch(/sv_recommendation_followups_status_check/);
	});
});
