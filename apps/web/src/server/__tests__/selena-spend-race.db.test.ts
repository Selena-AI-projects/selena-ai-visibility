/**
 * The measure spend scope against a real Postgres when one permit is
 * delivered twice: the first attempt is still inside the provider call when
 * the duplicate arrives. The adapter is a test double held open by a gate, so
 * nothing here reaches a provider. Set SELENA_TEST_DATABASE_URL to run.
 *
 * The scope's cap is shared by every test that writes to this database, so
 * each test sets it relative to what is already committed.
 */
import { randomUUID } from "node:crypto";
import type { SelenaExecutablePermit, SelenaMeasurementAdapter } from "@workspace/lib/selena-measurement";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureOrganization, fixtureContext, seedCycle, seedOrder, seedQuotaProject } from "./selena-quota-fixture";

const url = process.env.SELENA_TEST_DATABASE_URL;

describe.skipIf(!url)("measurement spend when a permit is delivered twice", () => {
	let db: import("@workspace/lib/db/organization-transaction").OrganizationDatabase;
	let sql: typeof import("drizzle-orm").sql;
	let runMeasurementForPermit: typeof import("@workspace/lib/selena-run-executor").runMeasurementForPermit;
	let createMeter: typeof import("@workspace/lib/selena-provider-spend").createMeasurementSpendMeter;
	let repositories: ReturnType<typeof import("@workspace/lib/selena-visibility-repositories").createSelenaRepositories>;

	beforeAll(async () => {
		Object.assign(process.env, { DATABASE_URL: url, DEPLOYMENT_MODE: "local", APP_URL: "http://localhost:3000" });
		db = (await import("@workspace/lib/db/db")).db;
		sql = (await import("drizzle-orm")).sql;
		runMeasurementForPermit = (await import("@workspace/lib/selena-run-executor")).runMeasurementForPermit;
		createMeter = (await import("@workspace/lib/selena-provider-spend")).createMeasurementSpendMeter;
		repositories = (await import("@workspace/lib/selena-visibility-repositories")).createSelenaRepositories(db);
	});

	const committed = async () =>
		Number((await db.execute(sql`select public.sv_provider_spend_committed('measure') as usd`)).rows[0]?.usd ?? 0);

	/** Leaves `headroomUsd` of the scope free above what is already committed. */
	async function capAbove(headroomUsd: number) {
		const cap = (await committed()) + headroomUsd;
		await db.execute(
			sql`insert into sv_provider_spend_budgets (scope, cap_usd) values ('measure', ${cap}) on conflict (scope) do update set cap_usd = excluded.cap_usd`,
		);
	}

	async function permits(count: number) {
		const organizationId = `spend-race-${randomUUID()}`;
		await ensureOrganization(db, organizationId);
		const fixture = await seedQuotaProject(db, {
			organizationId,
			actorId: "spend-race-operator",
			name: "Spend race",
			planId: "visibility-snapshot",
		});
		const order = await seedOrder(fixture, { expectedRuns: count, orderStatus: "QUEUED" });
		const cycle = await seedCycle(fixture, {
			orderId: order.orderId,
			lockId: order.lockId,
			expectedRuns: count,
			keyPrefix: organizationId,
		});
		return { organizationId, ctx: fixtureContext(fixture), permitIds: cycle.permitIds };
	}

	/** An adapter that charges `costUsd` and holds each call until the test opens the gate. */
	function gatedAdapter(costUsd: number) {
		let enter: () => void = () => {};
		let open: () => void = () => {};
		const entered = new Promise<void>((resolve) => {
			enter = resolve;
		});
		const gate = new Promise<void>((resolve) => {
			open = resolve;
		});
		let calls = 0;
		const adapter: SelenaMeasurementAdapter = {
			channel: "api_view",
			async measure(permit) {
				return { dispatchKey: permit.dispatchKey, status: "queued" };
			},
			async execute(permit: SelenaExecutablePermit) {
				calls += 1;
				enter();
				await gate;
				return {
					dispatchKey: permit.dispatchKey,
					status: "INVALID",
					validity: "INVALID",
					invalidReason: "EMPTY_RESPONSE",
					costUsd,
					costBasis: "actual",
					provider: "test-double",
				};
			},
		};
		return { adapter, entered, open: () => open(), calls: () => calls };
	}

	async function reservation(organizationId: string, permitId: string) {
		const [row] = (
			await db.execute(
				sql`select status, estimated_usd::float8 as estimated, actual_usd::float8 as actual from sv_provider_spend_reservations
					where scope = 'measure' and organization_id = ${organizationId} and request_key = ${permitId}`,
			)
		).rows as Array<{ status: string; estimated: number; actual: number | null }>;
		return row ?? null;
	}

	function attempt(
		input: Awaited<ReturnType<typeof permits>>,
		permitId: string,
		adapter: SelenaMeasurementAdapter,
		spend = createMeter(db, input.organizationId),
	) {
		return runMeasurementForPermit({
			permitId,
			ctx: input.ctx,
			store: repositories.runs,
			adapters: { noop: adapter },
			config: { enabled: true, adapter: "noop" },
			spend,
			cycleState: { globalEmergencyStop: false },
		});
	}

	it("keeps the running attempt's hold when the duplicate arrives, and books its full cost", async () => {
		const input = await permits(1);
		const [permitId] = input.permitIds;
		await capAbove(1);
		const before = await committed();
		const provider = gatedAdapter(0.01);

		const first = attempt(input, permitId, provider.adapter);
		await provider.entered;
		const duplicate = await attempt(input, permitId, provider.adapter);
		expect(duplicate).toEqual({ status: "skipped", reason: "SELENA_PERMIT_ALREADY_CONSUMED" });
		// While the first call is still out, its hold is intact.
		expect(await reservation(input.organizationId, permitId)).toMatchObject({ status: "RESERVED" });

		provider.open();
		expect(await first).toMatchObject({ status: "completed" });
		expect(provider.calls()).toBe(1);
		// The provider's figure, not the $0.0015 the hold was taken at.
		expect(await reservation(input.organizationId, permitId)).toEqual({
			status: "SETTLED",
			estimated: 0.0015,
			actual: 0.01,
		});
		expect((await committed()) - before).toBeCloseTo(0.01, 6);
	});

	it("counts a cost once however many times the permit completes", async () => {
		const input = await permits(1);
		const [permitId] = input.permitIds;
		await capAbove(1);
		const before = await committed();
		const provider = gatedAdapter(0.004);
		provider.open();
		await attempt(input, permitId, provider.adapter);

		expect(await attempt(input, permitId, provider.adapter)).toMatchObject({ status: "skipped" });
		await createMeter(db, input.organizationId).settle({ requestKey: permitId, actualUsd: 0.02 });

		expect(provider.calls()).toBe(1);
		expect(await reservation(input.organizationId, permitId)).toMatchObject({ status: "SETTLED", actual: 0.004 });
		expect((await committed()) - before).toBeCloseTo(0.004, 6);
	});

	it("raises a settlement that cannot be recorded, keeps the run and keeps the hold counted", async () => {
		const input = await permits(1);
		const [permitId] = input.permitIds;
		await capAbove(1);
		const before = await committed();
		const provider = gatedAdapter(0.01);
		provider.open();
		const meter = createMeter(db, input.organizationId);
		const broken = {
			reserve: meter.reserve,
			async settle() {
				throw new Error("connection terminated unexpectedly");
			},
		};

		await expect(attempt(input, permitId, provider.adapter, broken)).rejects.toThrow(/SELENA_SPEND_UNSETTLED/);
		const [run] = (
			await db.execute(
				sql`select status::text, cost_usd::float8 as cost from sv_runs where permit_id = ${permitId} and organization_id = ${input.organizationId}`,
			)
		).rows;
		expect(run).toEqual({ status: "INVALID", cost: 0.01 });
		expect(await reservation(input.organizationId, permitId)).toMatchObject({ status: "RESERVED", actual: null });
		expect((await committed()) - before).toBeCloseTo(0.0015, 6);
	});

	it("refuses the next call once a cost above its hold has used up the scope", async () => {
		const input = await permits(2);
		const [spent, next] = input.permitIds;
		await capAbove(0.005);
		const provider = gatedAdapter(0.01);
		provider.open();

		expect(await attempt(input, spent, provider.adapter)).toMatchObject({ status: "completed" });
		expect(await reservation(input.organizationId, spent)).toMatchObject({ status: "SETTLED", actual: 0.01 });
		await expect(attempt(input, next, provider.adapter)).rejects.toThrow("PROVIDER_SPEND_REFUSED_OVER_CAP");

		expect(provider.calls()).toBe(1);
		expect(await reservation(input.organizationId, next)).toBeNull();
		const [permit] = (await db.execute(sql`select consumed_at from sv_run_permits where id = ${next}`)).rows;
		expect(permit).toEqual({ consumed_at: null });
	});
});
