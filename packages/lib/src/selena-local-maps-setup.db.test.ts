/**
 * The owner's Local Maps path against a real Postgres carrying every
 * migration: setup, a canary through the real DataForSEO adapter with the
 * network replaced, the canary review, the pilot approval. Only `fetch` is a
 * test double, so every trigger, constraint and lock check on the way runs as
 * it would on staging. Set SELENA_TEST_DATABASE_URL to run.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { LocalMapsSetupInput } from "./selena-local-maps-setup";

const url = process.env.SELENA_TEST_DATABASE_URL;

const controls = {
	SELENA_LOCAL_VISIBILITY_ENABLED: "true",
	SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED: "true",
	SELENA_LOCAL_EMERGENCY_STOP: "false",
	SELENA_LOCAL_MAPS_PROVIDER_ID: "dataforseo-google-maps",
	DATAFORSEO_LOGIN: "login",
	DATAFORSEO_PASSWORD: "password",
	SELENA_LOCAL_DATAFORSEO_VERSION: "v3",
	SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD: "0.002",
};

describe.skipIf(!url)("Local Maps owner path from setup to an approved pilot", () => {
	let db: import("./db/organization-transaction").OrganizationDatabase;
	let sql: typeof import("drizzle-orm").sql;
	let setupModule: typeof import("./selena-local-maps-setup");
	let owner: typeof import("./selena-local-maps-owner");
	let orchestrator: typeof import("./selena-local-pilot-orchestrator");
	const organizationId = `local-setup-${randomUUID()}`;
	const actorId = `local-setup-owner-${randomUUID()}`;
	let input: LocalMapsSetupInput;

	beforeAll(async () => {
		Object.assign(process.env, { DATABASE_URL: url, ...controls });
		db = (await import("./db/db")).db;
		sql = (await import("drizzle-orm")).sql;
		setupModule = await import("./selena-local-maps-setup");
		owner = await import("./selena-local-maps-owner");
		orchestrator = await import("./selena-local-pilot-orchestrator");
		await db.execute(
			sql`insert into organization (id, name, slug, created_at) values (${organizationId}, 'KORA', ${organizationId}, now())`,
		);
		await db.execute(
			sql`insert into "user" (id, name, email) values (${actorId}, 'Owner', ${`${actorId}@example.com`})`,
		);
		await db.execute(
			sql`insert into member (id, organization_id, user_id, role, created_at) values (${randomUUID()}, ${organizationId}, ${actorId}, 'owner', now())`,
		);
		await db.execute(
			sql`insert into sv_provider_spend_budgets (scope, cap_usd) values ('local-maps', 1000) on conflict (scope) do update set cap_usd = greatest(sv_provider_spend_budgets.cap_usd, 1000)`,
		);
		const now = Date.now();
		input = {
			organizationId,
			actorId,
			displayName: "KORA Food Hall",
			countryCode: "ID",
			adminArea: "Bali",
			locality: "Ubud",
			timezone: "Asia/Makassar",
			latitude: -8.506854,
			longitude: 115.262482,
			placeId: "ChIJ-kora-db-test",
			keywords: ["food hall ubud", "best food court in ubud"],
			language: "en",
			seDomain: "google.com",
			timestampWindow: {
				startsAt: new Date(now - 60 * 60 * 1000).toISOString(),
				endsAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
			},
			provider: {
				id: "dataforseo-google-maps",
				endpoint: "https://api.dataforseo.com/v3/serp/google/maps/live/advanced",
				version: "v3",
			},
			perAttemptWorstCaseUsd: "0.002",
			leaseDurationMs: 300_000,
			priceSnapshotVersion: "dataforseo-maps-live-advanced-usd-0.002",
			engineSha: "unrecorded",
		};
	});

	afterAll(() => {
		vi.unstubAllGlobals();
	});

	it("creates one location, one grid and a lock per keyword, and nothing on a re-run", async () => {
		const first = await setupModule.applyLocalMapsSetup(db, input);
		expect(first.keywords).toHaveLength(2);
		expect(new Set(first.keywords.map((item) => item.configurationLockId)).size).toBe(2);
		expect(first.created.length).toBeGreaterThan(0);

		const again = await setupModule.applyLocalMapsSetup(db, input);
		expect(again.created).toEqual([]);
		expect(again).toMatchObject({
			projectId: first.projectId,
			locationId: first.locationId,
			gridDefinitionId: first.gridDefinitionId,
		});
		expect(again.keywords.map((item) => item.configurationLockId)).toEqual(
			first.keywords.map((item) => item.configurationLockId),
		);
		expect(again.keywords[0]?.idempotencyKey).toBe(
			`local-maps-canary:dataforseo-google-maps:${first.keywords[0]?.configurationLockId}`,
		);
	});

	it("refuses a setup by someone who is not an owner or admin of the organization", async () => {
		await expect(setupModule.applyLocalMapsSetup(db, { ...input, actorId: "stranger" })).rejects.toThrow(
			"LOCAL_OPERATOR_MEMBERSHIP_REQUIRED",
		);
	});

	it("runs the canary, accepts it, and approves only that canary's pilot", async () => {
		const setup = await setupModule.applyLocalMapsSetup(db, input);
		const target = setup.keywords[0];
		if (!target) throw new Error("TEST_KEYWORD_MISSING");
		const { withOrganizationTransaction } = await import("./db/organization-transaction");
		const canary = await withOrganizationTransaction(db, organizationId, async (tx) => {
			await orchestrator.requireLocalOperator(tx, organizationId, actorId);
			return orchestrator.createLocalCanaryCycleInTransaction({
				tx,
				organizationId,
				configurationLockId: target.configurationLockId,
				gridDefinitionId: setup.gridDefinitionId,
				env: process.env,
			});
		});
		expect(canary).toMatchObject({ observations: 9, attempts: 1, outbox: 1 });

		const sent: Array<Record<string, unknown>> = [];
		vi.stubGlobal(
			"fetch",
			vi.fn(async (_endpoint: string, init: { body: string }) => {
				const [task] = JSON.parse(init.body) as Array<Record<string, unknown>>;
				if (!task) throw new Error("TEST_TASK_MISSING");
				sent.push(task);
				const body = {
					status_code: 20000,
					cost: 0.002,
					tasks: [
						{
							id: `task-${randomUUID()}`,
							status_code: 20000,
							cost: 0.002,
							data: task,
							result: [
								{
									check_url: "https://www.google.com/maps/search/food+hall+ubud",
									items: [
										{ type: "maps_search", title: "Other", rank_group: 1, rank_absolute: 1, cid: "1" },
										{
											type: "maps_search",
											title: "KORA Food Hall",
											rank_group: 2,
											rank_absolute: 2,
											place_id: input.placeId,
										},
									],
								},
							],
						},
					],
				};
				return new Response(JSON.stringify(body), { status: 200 });
			}),
		);
		const { createDataForSeoLocalMapsRankAdapter } = await import("./adapters/dataforseo-local-maps-rank-adapter");
		const { toLocalMapsLiveProviderPort } = await import("./adapters/local-maps-rank-adapter");
		const store = await import("./selena-local-maps-attempt-store");
		const { runLocalMapsLiveAttempt } = await import("./selena-local-maps-live-runner");
		const [canaryAttempt] = (
			await db.execute(
				sql`select id from sv_measurement_attempts where organization_id = ${organizationId} and measurement_cycle_id = ${canary.measurementCycleId}`,
			)
		).rows as Array<{ id: string }>;
		if (!canaryAttempt) throw new Error("TEST_CANARY_ATTEMPT_MISSING");
		const run = await runLocalMapsLiveAttempt({
			intent: { organizationId, attemptId: canaryAttempt.id },
			store: store.createLocalMapsLiveAttemptStore({
				db,
				executionControls: () => process.env,
				setTenantContext: store.localMapsAttemptStoreRlsDefault,
				buildCandidate: store.buildLocalMapsSubmittedCandidateFromDatabase,
				claimReservedBudget: async () => undefined,
				leaseDurationMs: 300_000,
			}),
			provider: toLocalMapsLiveProviderPort(createDataForSeoLocalMapsRankAdapter(process.env)),
			now: () => new Date(),
		});
		expect(run.kind).toBe("FINALIZED");
		expect(sent).toEqual([
			{
				keyword: "food hall ubud",
				location_coordinate: "-8.506854,115.262482,13z",
				language_code: "en",
				se_domain: "google.com",
				device: "mobile",
				os: "android",
				depth: 20,
				search_this_area: true,
			},
		]);

		const status = await owner.readLocalMapsLockStatus({
			db,
			organizationId,
			configurationLockId: target.configurationLockId,
		});
		const canaryStatus = status.cycles.find((cycle) => cycle.cycleId === canary.cycleId);
		expect(canaryStatus).toMatchObject({ executionMode: "CANARY", status: "CANARY_REVIEW" });
		const measured = canaryStatus?.attempts[0];
		expect(measured).toMatchObject({ pointIndex: 4, status: "SUCCEEDED", event: "FOUND", targetRank: 2 });
		if (!measured?.evidenceId) throw new Error("TEST_CANARY_EVIDENCE_MISSING");

		const review = await withOrganizationTransaction(db, organizationId, (tx) =>
			orchestrator.reviewLocalCanaryInTransaction({
				tx,
				organizationId,
				cycleId: canary.cycleId,
				actorId,
				attemptId: measured.attemptId,
				evidenceId: measured.evidenceId as string,
				decision: "ACCEPTED",
			}),
		);
		const pilotCycleId = "pilotCycleId" in review ? review.pilotCycleId : undefined;
		if (!pilotCycleId) throw new Error("TEST_PILOT_NOT_CREATED");

		const approve = (overrides: Partial<Parameters<typeof owner.approveLocalPilot>[0]> = {}) =>
			owner.approveLocalPilot({
				db,
				organizationId,
				actorId,
				configurationLockId: target.configurationLockId,
				pilotCycleId,
				maxSpendUsd: "0.054",
				env: process.env,
				...overrides,
			});
		await expect(approve({ maxSpendUsd: "0.018" })).rejects.toThrow("LOCAL_PILOT_LOCK_COST_EXCEEDS_APPROVED_MAXIMUM");
		await expect(approve({ pilotCycleId: canary.cycleId })).rejects.toThrow("LOCAL_PILOT_APPROVAL_STATE_INVALID");
		const other = setup.keywords[1];
		if (!other) throw new Error("TEST_SECOND_KEYWORD_MISSING");
		await expect(approve({ configurationLockId: other.configurationLockId })).rejects.toThrow(
			"LOCAL_PILOT_APPROVAL_STATE_INVALID",
		);
		await expect(approve({ env: { ...process.env, SELENA_LOCAL_EMERGENCY_STOP: "true" } })).rejects.toThrow(
			"LOCAL_PROVIDER_EXECUTION_BLOCKED",
		);

		const approval = await approve();
		expect(approval).toMatchObject({
			pilotCycleId,
			canaryCycleId: canary.cycleId,
			observations: 9,
			attempts: 9,
			outbox: 9,
			worstCaseCostUsd: "0.054000",
			providerCalls: 0,
		});
		expect(await approve()).toEqual(approval);
		const after = await owner.readLocalMapsLockStatus({
			db,
			organizationId,
			configurationLockId: target.configurationLockId,
		});
		expect(after.cycles.find((cycle) => cycle.cycleId === pilotCycleId)).toMatchObject({
			executionMode: "PILOT",
			status: "QUEUED",
			observations: { PENDING: 9 },
		});
		const audits = await db.execute(
			sql`select count(*)::int as n from sv_audit_events where organization_id = ${organizationId} and event = 'LOCAL_PILOT_APPROVED' and subject_id = ${pilotCycleId}`,
		);
		expect((audits.rows[0] as { n: number }).n).toBe(1);
	});
});
