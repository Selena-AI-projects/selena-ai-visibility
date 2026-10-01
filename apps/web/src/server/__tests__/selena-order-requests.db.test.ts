/**
 * A pilot guest's free request against a real Postgres with migrations
 * applied: one code is one request, one dispatch slot and one order, however
 * the form is submitted and wherever the dispatch stops. Set
 * SELENA_TEST_DATABASE_URL to run, e.g.
 *
 *   SELENA_TEST_DATABASE_URL=postgres://localhost/elmo_test pnpm --filter web test selena-order-requests.db
 *
 * Without the variable the suite is skipped. Nothing here reaches a provider:
 * execution is off, so a queued order stops at the enqueue gate unless a test
 * says otherwise, and no worker runs.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { finishPermit } from "./selena-quota-fixture";

const url = process.env.SELENA_TEST_DATABASE_URL;

describe.skipIf(!url)("free pilot request on a database", () => {
	let db: import("@workspace/lib/db/organization-transaction").OrganizationDatabase;
	let sql: typeof import("drizzle-orm").sql;
	let requests: typeof import("../selena-order-request-submit");
	let desk: typeof import("../selena-order-desk-core");
	let repositories: ReturnType<typeof import("@workspace/lib/selena-visibility-repositories").createSelenaRepositories>;
	let hashCode: typeof import("@workspace/lib/selena-pilot-invites").hashPilotInviteCode;
	let reconcile: typeof import("@workspace/lib/selena-pilot-seat-reconciliation").readPilotSeatReconciliation;

	beforeAll(async () => {
		Object.assign(process.env, {
			DATABASE_URL: url,
			SELENA_PAYMENTS_ENABLED: "true",
			SELENA_PAYMENT_MODE: "test",
			SELENA_FREE_AUTO_DISPATCH_ENABLED: "true",
			SELENA_FREE_AUTO_DISPATCH_MAX_PER_DAY: "1000",
			SCHEDULE_MAINTENANCE_ENABLED: "false",
		});
		db = (await import("@workspace/lib/db/db")).db;
		sql = (await import("drizzle-orm")).sql;
		requests = await import("../selena-order-request-submit");
		desk = await import("../selena-order-desk-core");
		repositories = (await import("@workspace/lib/selena-visibility-repositories")).createSelenaRepositories(db);
		hashCode = (await import("@workspace/lib/selena-pilot-invites")).hashPilotInviteCode;
		reconcile = (await import("@workspace/lib/selena-pilot-seat-reconciliation")).readPilotSeatReconciliation;
	});

	beforeEach(() => {
		Reflect.set(process.env, "SELENA_PROVIDER_BUDGET_USD", "2");
		Reflect.set(process.env, "SELENA_MEASUREMENT_ENABLED", "false");
	});

	/** A guest workspace with a confirmed profile of three questions and one unspent seat. */
	async function guest(questions = 3) {
		const organizationId = `r2-guest-${randomUUID()}`;
		await db.execute(
			sql`insert into organization (id, name, slug, created_at) values (${organizationId}, ${organizationId}, ${organizationId}, now())`,
		);
		const context = {
			actorId: `r2-user-${randomUUID()}`,
			tenantId: organizationId,
			role: "owner" as const,
			authType: "session" as const,
			permissions: ["client:read", "client:write"],
		};
		const project = await repositories.projects.create(context, {
			name: "Synthetic studio",
			category: "Massage studio",
			country: "UZ",
			region: "Tashkent",
			languages: ["ru"],
		});
		await repositories.profiles.confirm(context, {
			projectId: project.id,
			brandName: "Synthetic Studio",
			primaryDomain: "https://synthetic-studio.example/",
			publicProfiles: [],
			mapsLocation: null,
			competitorSnapshot: [{ name: "Rival One", domains: [] }],
			scenarioSnapshot: Array.from({ length: questions }, (_, index) => ({
				text: `synthetic question ${index + 1}`,
				language: "ru",
				intentType: "discovery",
			})),
		});
		const code = `R2-${randomUUID().slice(0, 8).toUpperCase()}`;
		await db.execute(
			sql`insert into sv_pilot_invites (code_hash, plan_id, label, expires_at) values (${hashCode(code)}, 'visibility-snapshot', 'r2 fixture', now() + interval '1 day')`,
		);
		const submit = {
			projectId: project.id,
			planId: "visibility-snapshot" as const,
			contactName: "Synthetic Guest",
			contactChannel: "guest@synthetic.example",
			promoCode: code,
		};
		return { context, project, code, submit, organizationId };
	}

	const count = async (query: ReturnType<typeof sql>) => Number((await db.execute(query)).rows[0]?.count ?? 0);

	async function state(organizationId: string) {
		return {
			requests: await count(sql`select count(*) from sv_order_requests where organization_id = ${organizationId}`),
			orders: await count(sql`select count(*) from sv_orders where organization_id = ${organizationId}`),
			permits: await count(sql`select count(*) from sv_run_permits where organization_id = ${organizationId}`),
			claims: await count(
				sql`select count(*) from sv_free_auto_dispatch_claims where organization_id = ${organizationId}`,
			),
			seatsHeld: await count(
				sql`select count(*) from sv_pilot_invites where redeemed_by_organization_id = ${organizationId}`,
			),
		};
	}

	it("answers a double click with the same request and order, and says the run waits on execution", async () => {
		const g = await guest();
		const first = await requests.submitSelenaOrderRequest(g.context, g.submit);
		const second = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(second.id).toBe(first.id);
		// Execution is off: the order is approved, but no run reached the queue.
		expect(first.launch).toEqual({ state: "AWAITING_OPERATOR", orderStatus: "QUEUED" });
		expect(second.launch).toEqual(first.launch);
		expect(await state(g.organizationId)).toEqual({ requests: 1, orders: 1, permits: 9, claims: 1, seatsHeld: 1 });
	});

	it("records the plan's nominal price on the quote and nothing paid for a pilot seat", async () => {
		const g = await guest();
		await requests.submitSelenaOrderRequest(g.context, g.submit);
		const row = (
			await db.execute(
				sql`select q.price_amount::text as nominal, p.amount::text as paid from sv_orders o join sv_quotes q on q.id = o.quote_id join sv_payments p on p.order_id = o.id where o.organization_id = ${g.organizationId}`,
			)
		).rows[0];
		expect(row).toEqual({ nominal: "49.00", paid: "0.00" });
	});

	it("lets two simultaneous submissions of one code produce one request and one order", async () => {
		const g = await guest();
		const [a, b] = await Promise.all([
			requests.submitSelenaOrderRequest(g.context, g.submit),
			requests.submitSelenaOrderRequest(g.context, g.submit),
		]);
		expect(a.id).toBe(b.id);
		expect(a.promoApplied && b.promoApplied).toBe(true);
		expect(await state(g.organizationId)).toEqual({ requests: 1, orders: 1, permits: 9, claims: 1, seatsHeld: 1 });
	});

	it("keeps the code and the slot when preflight refuses, and resumes the same order once it passes", async () => {
		const g = await guest();
		Reflect.set(process.env, "SELENA_PROVIDER_BUDGET_USD", "0.01");
		const refused = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(refused.launch).toEqual({ state: "AWAITING_OPERATOR", orderStatus: "PAID_REVIEW_REQUIRED" });
		Reflect.set(process.env, "SELENA_PROVIDER_BUDGET_USD", "2");
		const resumed = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(resumed.id).toBe(refused.id);
		expect(resumed.launch).toEqual({ state: "AWAITING_OPERATOR", orderStatus: "QUEUED" });
		expect(await state(g.organizationId)).toEqual({ requests: 1, orders: 1, permits: 9, claims: 1, seatsHeld: 1 });
	});

	it("gives the slot back when nothing was ordered, and the same code works after the profile is fixed", async () => {
		const g = await guest(0);
		const failed = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(failed.launch).toMatchObject({ state: "NOT_STARTED" });
		expect(await state(g.organizationId)).toMatchObject({ requests: 1, orders: 0, claims: 0, seatsHeld: 1 });
		await repositories.profiles.confirm(g.context, {
			projectId: g.project.id,
			brandName: "Synthetic Studio",
			primaryDomain: "https://synthetic-studio.example/",
			publicProfiles: [],
			mapsLocation: null,
			competitorSnapshot: [],
			scenarioSnapshot: [{ text: "synthetic question 1", language: "ru", intentType: "discovery" }],
		});
		const retried = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(retried.id).toBe(failed.id);
		expect(retried.launch).toEqual({ state: "AWAITING_OPERATOR", orderStatus: "QUEUED" });
		expect(await state(g.organizationId)).toEqual({ requests: 1, orders: 1, permits: 3, claims: 1, seatsHeld: 1 });
	});

	it("reports a queued order after a crash that followed the enqueue, and the retry queues nothing new", async () => {
		const g = await guest();
		Reflect.set(process.env, "SELENA_MEASUREMENT_ENABLED", "true");
		const crashAfterEnqueue: typeof desk.startSelenaMeasurement = async (...args) => {
			await desk.startSelenaMeasurement(...args);
			throw new Error("SIMULATED_CRASH_AFTER_ENQUEUE");
		};
		const crashed = await requests.submitSelenaOrderRequest(g.context, g.submit, crashAfterEnqueue);
		expect(crashed.launch).toEqual({ state: "QUEUED", orderStatus: "QUEUED" });
		const jobs = () =>
			count(
				sql`select count(*) from pgboss.job where name = 'selena-measure' and data ->> 'organizationId' = ${g.organizationId}`,
			);
		expect(await jobs()).toBe(9);
		const retried = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(retried.id).toBe(crashed.id);
		expect(retried.launch).toEqual({ state: "QUEUED", orderStatus: "QUEUED" });
		expect(await jobs()).toBe(9);
		expect(await state(g.organizationId)).toEqual({ requests: 1, orders: 1, permits: 9, claims: 1, seatsHeld: 1 });
	});

	it("does not let a workspace spend one seat on a second project", async () => {
		const g = await guest();
		await requests.submitSelenaOrderRequest(g.context, g.submit);
		const other = await repositories.projects.create(g.context, {
			name: "Second project",
			category: "Massage studio",
			country: "UZ",
			region: "Tashkent",
			languages: ["ru"],
		});
		const elsewhere = await requests.submitSelenaOrderRequest(g.context, { ...g.submit, projectId: other.id });
		expect(elsewhere.seatHeldElsewhere).toBe(true);
		expect(await state(g.organizationId)).toMatchObject({ requests: 1, orders: 1 });
	});

	it("leaves a code whose measurement was rejected at QC closed, with no new runs on resubmission", async () => {
		const g = await guest();
		const first = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(first.launch).toEqual({ state: "AWAITING_OPERATOR", orderStatus: "QUEUED" });
		const fixture = {
			db,
			organizationId: g.organizationId,
			actorId: g.context.actorId,
			projectId: g.project.id,
			planId: "visibility-snapshot" as const,
		};
		const permits = (
			await db.execute(sql`select id from sv_run_permits where organization_id = ${g.organizationId} order by id`)
		).rows as Array<{ id: string }>;
		for (const permit of permits) await finishPermit(fixture, permit.id, "FAILED");
		const [order] = (await db.execute(sql`select id from sv_orders where organization_id = ${g.organizationId}`))
			.rows as Array<{ id: string }>;
		await repositories.qcRecords.create(g.context, {
			orderId: order.id,
			reviewedAt: new Date(),
			scope: "nine answers read",
			decision: "rejected",
		});
		const requestStatus = async () =>
			(await db.execute(sql`select status from sv_order_requests where id = ${first.id}`)).rows[0];
		const statusAtRejection = await requestStatus();
		const again = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(again.id).toBe(first.id);
		expect(again.launch).toEqual({ state: "STOPPED", orderStatus: "CANCELLED" });
		expect(await requestStatus()).toEqual(statusAtRejection);
		expect(await state(g.organizationId)).toEqual({ requests: 1, orders: 1, permits: 9, claims: 1, seatsHeld: 1 });
		expect(await count(sql`select count(*) from sv_runs where organization_id = ${g.organizationId}`)).toBe(9);
	});

	/**
	 * What a submission left behind before seat ids were derived: the seat
	 * redeemed by this workspace, a request under a random (v4) id and, when
	 * asked, the order drafted for it under that request's key.
	 */
	async function legacyRequest(g: Awaited<ReturnType<typeof guest>>, code: string, withOrder: boolean) {
		await db.execute(
			sql`select public.sv_redeem_pilot_invite(${hashCode(code)}, 'visibility-snapshot', ${g.organizationId}, ${g.context.actorId})`,
		);
		const [row] = (
			await db.execute(
				sql`insert into sv_order_requests (organization_id, project_id, plan_id, contact_name, contact_channel, promo_code, promo_applied, status)
					values (${g.organizationId}, ${g.project.id}, 'visibility-snapshot', 'Synthetic Guest', 'guest@synthetic.example', ${code}, true, 'AUTO_QUEUED')
					returning id::text as id`,
			)
		).rows as Array<{ id: string }>;
		if (withOrder) {
			const { familyId } = await desk.prepareSelenaScenarios(g.context, g.project.id);
			const scenarioIds = (await repositories.scenarios.list(g.context, familyId)).map((scenario) => scenario.id);
			await db.execute(sql`update sv_scenarios set status = 'APPROVED' where family_id = ${familyId}`);
			await desk.startSelenaMeasurement(g.context, {
				projectId: g.project.id,
				planId: "visibility-snapshot",
				scenarioIds,
				idempotencyKey: `auto-request:${row.id}`,
				settlement: "pilot_seat",
			});
		}
		return row.id;
	}

	async function issueSeat() {
		const code = `R3-${randomUUID().slice(0, 8).toUpperCase()}`;
		await db.execute(
			sql`insert into sv_pilot_invites (code_hash, plan_id, label, expires_at) values (${hashCode(code)}, 'visibility-snapshot', 'r3 fixture', now() + interval '1 day')`,
		);
		return code;
	}

	const seatRedeemed = async (code: string) =>
		(await count(
			sql`select count(*) from sv_pilot_invites where code_hash = ${hashCode(code)} and redeemed_at is not null`,
		)) === 1;

	const reconciled = async (organizationId: string) =>
		(await reconcile(db)).filter((row) => row.organizationId === organizationId);

	it("answers a repeated legacy code with the order it already has, and drafts no second free order", async () => {
		const g = await guest();
		const legacyId = await legacyRequest(g, g.code, true);
		const before = await state(g.organizationId);
		expect(before).toMatchObject({ requests: 1, orders: 1, seatsHeld: 1 });

		const again = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(again).toMatchObject({ id: legacyId, promoApplied: true, legacySeat: true });
		expect(again.launch).toEqual({ state: "AWAITING_OPERATOR", orderStatus: "QUEUED" });
		expect(await state(g.organizationId)).toEqual(before);
		expect(await reconciled(g.organizationId)).toMatchObject([{ class: "LEGACY_ORDERED", requestIds: [legacyId] }]);
	});

	it("does not spend another code on the plan while a legacy request is unsettled", async () => {
		const g = await guest();
		const legacyId = await legacyRequest(g, g.code, false);
		const fresh = await issueSeat();

		const withFresh = await requests.submitSelenaOrderRequest(g.context, { ...g.submit, promoCode: fresh });
		expect(withFresh).toMatchObject({ id: legacyId, legacySeat: true });
		expect(withFresh.launch).toEqual({ state: "NOT_STARTED", reason: "LEGACY_REQUEST_NEEDS_OPERATOR" });
		expect(await seatRedeemed(fresh)).toBe(false);
		expect(await state(g.organizationId)).toMatchObject({ requests: 1, orders: 0, claims: 0, seatsHeld: 1 });
		expect(await reconciled(g.organizationId)).toMatchObject([{ class: "LEGACY_NO_ORDER", orders: [] }]);
	});

	it("reports two legacy seats with two requests as ambiguous and orders nothing more for either code", async () => {
		const g = await guest();
		const second = await issueSeat();
		const firstId = await legacyRequest(g, g.code, true);
		const secondId = await legacyRequest(g, second, false);
		const before = await state(g.organizationId);
		expect(before).toMatchObject({ requests: 2, orders: 1, seatsHeld: 2 });

		for (const promoCode of [g.code, second]) {
			const again = await requests.submitSelenaOrderRequest(g.context, { ...g.submit, promoCode });
			expect(again).toMatchObject({ legacySeat: true });
			expect([firstId, secondId]).toContain(again.id);
		}
		expect(await state(g.organizationId)).toEqual(before);
		const rows = await reconciled(g.organizationId);
		expect(rows).toHaveLength(2);
		for (const row of rows) {
			expect(row.class).toBe("LEGACY_AMBIGUOUS");
			expect([...row.requestIds].sort()).toEqual([firstId, secondId].sort());
		}
	});

	it("classes a seat spent through the current flow by its derived request", async () => {
		const g = await guest();
		const done = await requests.submitSelenaOrderRequest(g.context, g.submit);
		expect(done.legacySeat).toBe(false);
		expect(await reconciled(g.organizationId)).toMatchObject([{ class: "NEW_FLOW_ORDERED", requestIds: [done.id] }]);
	});
});
