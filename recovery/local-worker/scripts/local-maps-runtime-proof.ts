import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import * as s from "@workspace/lib/db/schema";
import { withSelenaApiMutation } from "@workspace/lib/selena-api-idempotency";
import { createLocalDispatchStore } from "@workspace/lib/selena-local-dispatch-store";
import {
	buildLocalMapsSubmittedCandidateFromDatabase,
	createLocalMapsLiveAttemptStore,
	localMapsAttemptStoreRlsDefault,
} from "@workspace/lib/selena-local-maps-attempt-store";
import { runLocalMapsLiveAttempt } from "@workspace/lib/selena-local-maps-live-runner";
import {
	createLocalCanaryCycleInTransaction,
	localPilotBodyHash,
	materializeLocalPilotInTransaction,
	reviewLocalCanaryInTransaction,
	validateLocalPilotLock,
	withLocalPilotMutation,
} from "@workspace/lib/selena-local-pilot-orchestrator";
import {
	checkLocalRawRetentionInTransaction,
	cleanupExpiredLocalRawEvidenceInTransaction,
} from "@workspace/lib/selena-local-raw-retention";
import { createLocalReportStore } from "@workspace/lib/selena-local-report-store";
import {
	LOCAL_GRID_FORMULA_VERSION,
	localMapsLiveSubmittedCandidateSchema,
	localProviderContractDigest,
	localProviderContractSchema,
	sphericalGridPointsV1,
} from "@workspace/selena-visibility-contracts";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { PgBoss } from "pg-boss";
import {
	localBillingManifestDigest,
	localBillingManifestSchema,
	reconcileLocalPilotBilling,
} from "../../../packages/lib/src/selena-local-billing-reconciliation";
import {
	processLocalCustomerFixtureQuery,
	startLocalCustomerTestRun,
} from "../../../packages/lib/src/selena-local-customer-execution";
import { createLocalCustomerOrderStore } from "../../../packages/lib/src/selena-local-customer-order-store";
import { createLocalCustomerApi } from "../../web/src/server/selena-local-customer-api";
import { createDurableLocalStores } from "../../web/src/server/selena-local-durable-store";
import { createSelenaLocalReportRouteHandlers } from "../../web/src/server/selena-local-report";
import { createSelenaLocalSetupRouteHandlers } from "../../web/src/server/selena-local-setup-api";
import { createSelenaLocalWriteRouteHandlers } from "../../web/src/server/selena-local-write-api";
import { recordSelenaTestPayment } from "../../web/src/server/selena-test-payment-store";
import { createUniversalPublicationStore } from "../../web/src/server/selena-universal-publication-store";
import {
	buildUniversalReportView,
	createUniversalReportHandler,
	universalReportCsv,
} from "../../web/src/server/selena-universal-report";
import { createLocalRawRetentionHandler } from "../src/jobs/selena-local-raw-retention";
import { dispatchLocalOutboxOnce } from "../src/local-dispatch-outbox";
import { LOCAL_RAW_RETENTION_QUEUE, startLocalRawRetentionScheduler } from "../src/local-raw-retention-scheduler";

// Only the Docker proof's loopback port is accepted. Never read DATABASE_URL or provider credentials.
const port = Number(process.argv[2]);
assert(Number.isInteger(port) && port > 1024 && port <= 65535, "DISPOSABLE_PORT_REQUIRED");
globalThis.fetch = async () => {
	throw new Error("NETWORK_PROVIDER_CALL_FORBIDDEN");
};
const connection = { host: "127.0.0.1", port, user: "postgres", database: "local_fresh" };
const admin = new pg.Pool(connection);
const pool = new pg.Pool({ ...connection, options: "-c role=selena_app" });
if (process.env.SELENA_LOCAL_PROOF_CLOCK_DIAGNOSTICS === "true")
	pool.on("connect", (client) => {
		client.on("notice", (notice) => {
			if (notice.message?.startsWith("PROOF_CLOCK")) console.error(notice.message);
		});
	});
const db = drizzle(pool, { schema: s });
const env = {
	SELENA_LOCAL_VISIBILITY_ENABLED: "true",
	SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED: "true",
	SELENA_LOCAL_EMERGENCY_STOP: "false",
};
const provider = {
	id: "fixture-local",
	endpoint: "fixture://local",
	version: "v1",
	rankEvidenceSource: "MAPS_SERP_PROVIDER" as const,
	placesApiUsed: false as const,
};
let fixtureCalls = 0;
const finalizerFailures: unknown[] = [];
const txFor = <T>(org: string, fn: Parameters<typeof withOrganizationTransaction<T>>[2]) =>
	withOrganizationTransaction(db, org, fn);
function required<T>(value: T | null | undefined): T {
	assert(value !== undefined && value !== null);
	return value;
}
const hash = (value: string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const makeStore = (database = db) => {
	const store = createLocalMapsLiveAttemptStore({
		db: database,
		executionControls: () => env,
		setTenantContext: localMapsAttemptStoreRlsDefault,
		buildCandidate: buildLocalMapsSubmittedCandidateFromDatabase,
		claimReservedBudget: async ({ attempt }) => {
			assert.equal(attempt.budgetState, "RESERVED");
		},
		leaseDurationMs: 120000,
	});
	const finalize = store.finalizeSubmitted;
	store.finalizeSubmitted = async (input) => {
		try {
			return await finalize(input);
		} catch (error) {
			finalizerFailures.push(error);
			throw error;
		}
	};

	return store;
};
const store = makeStore();

async function seed(providerId = provider.id) {
	const fixtureProvider = { ...provider, id: providerId };
	const org = `proof-${randomUUID()}`,
		actor = randomUUID(),
		project = randomUUID(),
		entity = randomUUID(),
		location = randomUUID(),
		keyword = randomUUID(),
		gridId = randomUUID(),
		lockId = randomUUID();
	await admin.query("INSERT INTO organization(id,name,slug,created_at) VALUES($1,$1,$1,now())", [org]);
	await admin.query('INSERT INTO "user"(id,name,email) VALUES($1,$1,$2)', [actor, `${actor}@example.invalid`]);
	await admin.query("INSERT INTO member(id,organization_id,user_id,role,created_at) VALUES($1,$2,$3,'owner',now())", [
		randomUUID(),
		org,
		actor,
	]);
	const grid = sphericalGridPointsV1({
		formulaVersion: LOCAL_GRID_FORMULA_VERSION,
		locationId: location,
		centerLatitude: -8,
		centerLongitude: 115,
		size: 3,
		radiusMeters: 3000,
	});
	const request = {
		device: "MOBILE",
		os: "android",
		language: "en",
		seDomain: "google.example",
		zoom: 13,
		depth: 20,
		searchThisArea: true,
	};
	const digest = localProviderContractDigest(
		localProviderContractSchema.parse({
			schemaVersion: 1,
			provider: fixtureProvider,
			capability: {
				coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED",
				rawEvidenceReference: "REQUIRED",
				supportsAbsentWithinDepth: true,
				maxDepth: 20,
			},
			requestProtocol: request,
			price: {
				billingUnit: "request",
				currency: "USD",
				perAttemptWorstCaseUsd: "0.002000",
				priceSnapshotVersion: "fixture-v1",
			},
		}),
	);
	const lock = validateLocalPilotLock({
		schemaVersion: 1,
		domainId: "LOCAL_MAPS",
		lockVersion: 1,
		locationId: location,
		targetIdentity: {
			placeId: "fixture-place",
			mapsUrl: "https://maps.example/fixture",
			identitySource: "USER_CONFIRMED",
			matchPolicy: "PLACE_ID_OR_CID",
		},
		grid,
		keywordSet: {
			id: randomUUID(),
			version: 1,
			keywordIds: [keyword],
			keywords: [{ id: keyword, text: "fixture keyword", language: "en" }],
		},
		provider: fixtureProvider,
		request,
		timestampWindow: {
			startsAt: new Date(Date.now() - 3600000).toISOString(),
			endsAt: new Date(Date.now() + 3600000).toISOString(),
		},
		repeats: 1,
		expectedSlots: 9,
		maxProviderAttempts: 27,
		retryPolicy: { maxAttemptsPerSlot: 3, genericQueueRetryLimit: 0 },
		budget: {
			currency: "USD",
			surfaceCapUsd: "0.054000",
			monthlyCapUsd: "1.000000",
			worstCaseCostUsd: "0.054000",
			priceSnapshotVersion: "fixture-v1",
		},
		pilot: {
			providerContractDigest: digest,
			billingUnit: "request",
			perAttemptWorstCaseUsd: "0.002000",
			leaseDurationMs: 120000,
			commercialPriceUsd: "0.00",
			commercialReason: "PILOT_NO_CHARGE",
		},
	});
	await txFor(org, async (tx) => {
		await tx
			.insert(s.svProjects)
			.values({ id: project, organizationId: org, name: "Fixture", category: "test", country: "ID" });
		await tx.insert(s.svEntities).values({
			id: entity,
			organizationId: org,
			projectId: project,
			name: "Fixture",
			entityKind: "LOCATION_BRAND",
			confirmationStatus: "CLIENT_CONFIRMED",
		});
		await tx.insert(s.svBusinessLocations).values({
			id: location,
			organizationId: org,
			entityId: entity,
			displayName: "Fixture",
			countryCode: "ID",
			latitude: "-8",
			longitude: "115",
			geoPrecision: "COORDINATE",
		});
		await tx.insert(s.svLocalKeywords).values({
			id: keyword,
			organizationId: org,
			locationId: location,
			text: "fixture keyword",
			normalizedText: "fixture keyword",
			language: "en",
			status: "APPROVED",
		});
		await tx.insert(s.svGridDefinitions).values({
			id: gridId,
			organizationId: org,
			locationId: location,
			version: 1,
			pointCount: 9,
			spacingMeters: 2121,
			shape: "SQUARE",
			rows: 3,
			columns: 3,
			centerLatitude: "-8",
			centerLongitude: "115",
			formulaVersion: LOCAL_GRID_FORMULA_VERSION,
		});
		for (const point of grid.points)
			await tx.insert(s.svGridPoints).values({
				id: point.id,
				organizationId: org,
				gridId,
				pointIndex: point.pointIndex,
				latitude: String(point.latitude),
				longitude: String(point.longitude),
			});
		await tx.insert(s.svConfigurationLocks).values({
			id: lockId,
			organizationId: org,
			projectId: project,
			version: 1,
			snapshot: lock,
			engineSha: "disposable-proof",
			expectedRuns: 9,
			budgetCap: "0.054000",
			createdBy: actor,
		});
	});
	return { org, actor, project, gridId, lockId, provider: fixtureProvider };
}
type Fixture = Awaited<ReturnType<typeof seed>>;
async function canary(f: Fixture) {
	return txFor(f.org, (tx) =>
		createLocalCanaryCycleInTransaction({
			tx,
			organizationId: f.org,
			configurationLockId: f.lockId,
			gridDefinitionId: f.gridId,
			env,
		}),
	);
}
async function attempts(f: Fixture, measurement: string) {
	return txFor(f.org, (tx) =>
		tx.select().from(s.svMeasurementAttempts).where(eq(s.svMeasurementAttempts.measurementCycleId, measurement)),
	);
}
async function cycle(f: Fixture, id: string) {
	return txFor(
		f.org,
		async (tx) => (await tx.select().from(s.svLocalScanCycles).where(eq(s.svLocalScanCycles.id, id)))[0],
	);
}
async function observations(f: Fixture, id: string) {
	return txFor(f.org, (tx) =>
		tx.select().from(s.svLocalRankObservations).where(eq(s.svLocalRankObservations.cycleId, id)),
	);
}
async function run(
	f: Fixture,
	attemptId: string,
	event: "FOUND" | "RETRYABLE_FAILURE" | "OUTCOME_UNKNOWN" = "FOUND",
	cost = "0.002000",
	raw = JSON.stringify({ fixture: randomUUID() }),
	expectedKind: "FINALIZED" | "UNKNOWN_RECONCILIATION" = "FINALIZED",
) {
	await dispatchLocalOutboxOnce({
		store: createLocalDispatchStore(db, f.org, 60000),
		env: () => env,
		queue: { send: async () => randomUUID() },
	});
	const targetRank = f.provider.id === "dataforseo-google-maps" ? 2 : 1;
	if (f.provider.id === "dataforseo-google-maps") {
		const candidate = await txFor(f.org, async (tx) => {
			const [attempt] = await tx
				.select()
				.from(s.svMeasurementAttempts)
				.where(eq(s.svMeasurementAttempts.id, attemptId));
			const fixtureClock = new Date((await tx.execute(sql`select clock_timestamp() as now`)).rows[0].now as string);
			return buildLocalMapsSubmittedCandidateFromDatabase({
				tx,
				attempt: { ...attempt, submittedAt: fixtureClock, leaseExpiresAt: new Date(fixtureClock.getTime() + 120000) },
			});
		});
		const request = candidate.providerRequest;
		raw = JSON.stringify({
			status_code: 20000,
			tasks: [
				{
					id: `fixture-${attemptId}`,
					status_code: 20000,
					data: {
						keyword: request.keyword.text,
						language_code: request.params.language,
						location_coordinate: `${request.point.latitude},${request.point.longitude},${request.params.zoom}`,
					},
					result: [
						{
							items: [
								{ type: "maps_paid_item", title: "Fixture advertisement", rank_group: 1, rank_absolute: 1 },
								{ type: "maps_search", title: "Fixture competitor", cid: "456", rank_group: 1, rank_absolute: 2 },
								{
									type: "maps_search",
									title: "Fixture target",
									cid: request.targetIdentity.cid,
									place_id: request.targetIdentity.placeId,
									rank_group: 2,
									rank_absolute: 3,
								},
							],
						},
					],
				},
			],
		});
	}
	const executionStore = {
		...store,
		acquireAndCommitSubmitted: async (intent: Parameters<typeof store.acquireAndCommitSubmitted>[0], at: Date) => {
			try {
				return await store.acquireAndCommitSubmitted(intent, at);
			} catch (error) {
				const times = await admin.query(
					"select claimed_at::text,submitted_at::text,clock_timestamp()::text as after from sv_measurement_attempts where id=$1",
					[intent.attemptId],
				);
				console.error("DISPOSABLE_SUBMISSION_TIMING", JSON.stringify({ at: at.toISOString(), ...times.rows[0] }));
				throw error;
			}
		},
		finalizeSubmitted: async (input: Parameters<typeof store.finalizeSubmitted>[0]) => {
			try {
				return await store.finalizeSubmitted(input);
			} catch (error) {
				const cause = error instanceof Error ? error.cause : null;
				console.error(
					"DISPOSABLE_FINALIZE_FAILURE",
					cause instanceof Error ? cause.message : error instanceof Error ? error.message : "unknown",
				);
				throw error;
			}
		},
	};
	const clock = new Date((await admin.query("SELECT clock_timestamp() AS now")).rows[0].now).getTime();
	// Freeze this fixture attempt at a DB timestamp sampled after dispatch.
	// Its completion must not be ahead of the later acceptance transaction.
	const now = () => new Date(clock);
	const result = await runLocalMapsLiveAttempt({
		intent: { organizationId: f.org, attemptId },
		store: executionStore,
		now,
		provider: {
			...f.provider,
			execute: async () => {
				fixtureCalls++;
				return {
					providerTaskId: `fixture-${attemptId}`,
					event: event === "RETRYABLE_FAILURE" ? { kind: event, reason: "PROVIDER_5XX" } : { kind: event },
					targetRank: event === "FOUND" ? targetRank : null,
					evidenceEligible: event === "FOUND",
					provenance: {
						evidenceKind: "MAPS_SERP_PROVIDER",
						checkReference: "https://maps.example/fixture",
						rawResponseReference: `private/${hash(raw)}`,
						rawResponseSha256: hash(raw),
						providerObservedAt: now().toISOString(),
					},
					cost:
						event === "OUTCOME_UNKNOWN"
							? { status: "UNKNOWN", currency: "USD", amountUsd: null, basis: null }
							: { status: "KNOWN", currency: "USD", amountUsd: cost, basis: "actual" },
					rawResponseBody: raw,
				};
			},
		},
	});
	assert.equal(result.kind, expectedKind, JSON.stringify(result));
	return result;
}
async function review(f: Fixture, c: string, a: string, evidenceId: string) {
	const body = { attemptId: a, evidenceId, decision: "ACCEPTED" as const };
	return withLocalPilotMutation({
		db,
		actorId: f.actor,
		identity: {
			tenantId: f.org,
			operation: "canary-review",
			resourceId: c,
			idempotencyKey: randomUUID(),
			bodyHash: localPilotBodyHash(body),
		},
		work: (tx) => reviewLocalCanaryInTransaction({ tx, organizationId: f.org, cycleId: c, actorId: f.actor, ...body }),
	});
}
async function reschedulePilotRequest(
	f: Fixture,
	pilotCycleId: string,
	reviewId: string,
	timestampWindow: { startsAt: string; endsAt: string },
) {
	const store = createLocalReportStore(db, env);
	const handlers = createSelenaLocalReportRouteHandlers({
		store,
		authenticate: async () => ({
			actorId: f.actor,
			tenantId: f.org,
			authType: "session",
			role: "owner",
			permissions: [],
		}),
	});
	return handlers.pilotReschedule(
		new Request("http://disposable.invalid/local/pilot-reschedule", {
			method: "POST",
			headers: { "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
			body: JSON.stringify({
				acceptedCanaryReviewId: reviewId,
				timestampWindow,
				engineSha: "a".repeat(40),
			}),
		}),
		pilotCycleId,
	);
}
async function reschedulePilot(f: Fixture, pilotCycleId: string, reviewId: string) {
	const databaseNow = new Date((await admin.query("SELECT now() AS now")).rows[0].now);
	const response = await reschedulePilotRequest(f, pilotCycleId, reviewId, {
		startsAt: new Date(databaseNow.getTime() - 30_000).toISOString(),
		endsAt: new Date(databaseNow.getTime() + 3_600_000).toISOString(),
	});
	const body = await response.json();
	assert.equal(response.status, 201, JSON.stringify(body));
	assert.equal(body.operation, "pilot-reschedule");
	assert.equal(body.supersededPilotCycleId, pilotCycleId);
	assert.equal(body.status, "CREATED");
	assert.equal(body.providerCalls, 0);
	return body as {
		pilotCycleId: string;
		pilotMeasurementCycleId: string;
		configurationLockId: string;
		lockVersion: number;
	};
}
async function evidence(f: Fixture) {
	return (
		await admin.query(
			'SELECT id,source_type AS "sourceType" FROM sv_source_snapshots WHERE organization_id=$1 ORDER BY created_at',
			[f.org],
		)
	).rows as Array<{ id: string; sourceType: string }>;
}
async function pilot(f: Fixture, c: Awaited<ReturnType<typeof canary>>) {
	const a = (await attempts(f, c.measurementCycleId))[0];
	await run(f, a.id);
	const r = await review(f, c.cycleId, a.id, (await evidence(f))[0].id);
	assert("pilotCycleId" in r && r.pilotCycleId);
	assert("pilotMeasurementCycleId" in r && r.pilotMeasurementCycleId);
	assert.equal((await cycle(f, c.cycleId)).executionMode, "CANARY");
	assert.equal((await cycle(f, r.pilotCycleId)).status, "CREATED");
	const replacement = await reschedulePilot(f, r.pilotCycleId, r.reviewId);
	assert.equal((await cycle(f, r.pilotCycleId)).status, "STOPPED");
	await txFor(f.org, async (tx) => {
		await tx
			.update(s.svLocalScanCycles)
			.set({ status: "APPROVED" })
			.where(eq(s.svLocalScanCycles.id, replacement.pilotCycleId));
		await materializeLocalPilotInTransaction({
			tx,
			organizationId: f.org,
			localCycleId: replacement.pilotCycleId,
			env,
		});
	});
	return { cycleId: replacement.pilotCycleId, measurementCycleId: replacement.pilotMeasurementCycleId };
}
async function noPending(f: Fixture, c: string) {
	assert.equal((await observations(f, c)).filter((o) => o.outcome === "PENDING").length, 0);
}
async function reportPath(f: Fixture, cycleId: string, partial: boolean) {
	const recipient = `recipient-${randomUUID()}`,
		otherMember = `member-${randomUUID()}`;
	for (const actor of [recipient, otherMember]) {
		await admin.query('INSERT INTO "user"(id,name,email) VALUES($1,$1,$2)', [actor, `${actor}@example.invalid`]);
		await admin.query(
			"INSERT INTO member(id,organization_id,user_id,role,created_at) VALUES($1,$2,$3,'member',now())",
			[randomUUID(), f.org, actor],
		);
	}
	const store = createLocalReportStore(db, env);
	const mutate = store.mutate;
	store.mutate = async (input) => {
		const before =
			input.operation === "acknowledge" ? (await admin.query("select clock_timestamp()::text as t")).rows[0].t : null;
		try {
			return await mutate(input);
		} catch (error) {
			console.error(
				"REPORT_PROOF",
				input.operation,
				error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : "unknown",
			);
			if (input.operation === "acknowledge" && input.body.deliveryId) {
				const timing = await admin.query(
					"select sent_at::text,acknowledged_at::text,clock_timestamp()::text as after from sv_local_report_deliveries where id=$1",
					[input.body.deliveryId],
				);
				console.error("DISPOSABLE_ACK_TIMING", JSON.stringify({ before, ...timing.rows[0] }));
			}
			throw error;
		}
	};
	const handlers = (actorId: string, tenantId = f.org, authType: "session" | "api_key" = "session") =>
		createSelenaLocalReportRouteHandlers({
			store,
			authenticate: async () => ({ actorId, tenantId, authType, role: "member", permissions: [] }),
		});
	const owner = handlers(f.actor),
		customer = handlers(recipient),
		other = handlers(otherMember);
	const request = (body: object, key = randomUUID()) =>
		new Request("http://disposable.invalid/local", {
			method: "POST",
			headers: { "Content-Type": "application/json", "Idempotency-Key": key },
			body: JSON.stringify(body),
		});
	const read = new Request("http://disposable.invalid/local");
	const receipt = async (response: Response) => {
		const data = await response.json();
		assert.equal(response.status, 201, JSON.stringify(data));
		return data;
	};
	const crossOrigin = request({});
	crossOrigin.headers.set("Origin", "http://other.invalid");
	assert.equal((await owner.createReport(crossOrigin, cycleId)).status, 403);
	assert.equal((await customer.read(read, cycleId)).status, 404);
	assert.equal((await customer.createReport(request({}), cycleId)).status, 403);
	const draft = await receipt(await owner.createReport(request({}), cycleId));
	const body = { reportVersionId: draft.reportVersionId };
	assert.equal((await customer.preview(read, cycleId)).status, 403);
	const preview = await owner.preview(read, cycleId);
	assert.equal(preview.status, 200);
	assert.equal((await preview.json()).id, draft.reportVersionId);
	assert.equal((await customer.read(read, cycleId)).status, 404);
	assert.equal((await owner.publish(request(body), cycleId)).status, 400);
	if (partial) {
		assert.equal(
			(await owner.qc(request({ ...body, decision: "APPROVED", note: "invalid before partial acceptance" }), cycleId))
				.status,
			400,
		);
		await receipt(
			await owner.qc(
				request({ ...body, decision: "ACCEPT_PARTIAL", note: "Reviewed terminal provider failure" }),
				cycleId,
			),
		);
		assert.equal((await owner.publish(request(body), cycleId)).status, 400);
	}
	await receipt(
		await owner.qc(
			request({ ...body, decision: "APPROVED", note: "Human reviewed each captured position and evidence" }),
			cycleId,
		),
	);
	await receipt(await owner.publish(request(body), cycleId));
	const publishedResponse = await customer.read(read, cycleId);
	assert.equal(publishedResponse.status, 200);
	assert.equal(publishedResponse.headers.get("cache-control"), "private, no-store");
	const published = await publishedResponse.json();
	assert.equal(published.content.observations.length, 9);
	assert.equal(published.content.observations[0].keyword, "fixture keyword");
	const csvRequest = new Request("http://disposable.invalid/local?download=csv");
	const csvResponse = await customer.read(csvRequest, cycleId);
	assert.equal(csvResponse.status, 200);
	assert.equal(csvResponse.headers.get("content-type"), "text/csv; charset=utf-8");
	assert.equal(csvResponse.headers.get("cache-control"), "private, no-store");
	assert(csvResponse.headers.get("content-disposition")?.startsWith("attachment;"));
	const csvBody = await csvResponse.text();
	assert(csvBody.includes('"Organic Maps position"'));
	assert.equal(csvBody.trim().split("\r\n").length, 10);
	assert.equal((await handlers(recipient, "other-tenant").read(csvRequest, cycleId)).status, 403);
	assert.equal((await handlers(recipient, f.org, "api_key").read(csvRequest, cycleId)).status, 403);
	console.log("PASS published CSV download: customer access, private caching, cross-tenant and API-key denial");
	const printRequest = new Request("http://disposable.invalid/local?download=print");
	const printable = await customer.read(printRequest, cycleId);
	assert.equal(printable.status, 200);
	assert.equal(printable.headers.get("content-type"), "text/html; charset=utf-8");
	assert(printable.headers.get("content-security-policy")?.includes("default-src 'none'"));
	assert((await printable.text()).includes("P9"));
	assert.equal((await handlers(recipient, "other-tenant").read(printRequest, cycleId)).status, 403);
	assert.equal((await handlers(recipient, f.org, "api_key").read(printRequest, cycleId)).status, 403);

	const withEvidence = published.content.observations.find((row: { evidenceId: string | null }) => row.evidenceId);
	const proof = await customer.read(
		new Request(`http://disposable.invalid/local?evidence=${withEvidence.evidenceId}`),
		cycleId,
	);
	assert.equal(proof.status, 200);
	const proofBody = await proof.json();
	assert(proofBody.evidenceSha256.startsWith("sha256:"));
	assert.equal(proofBody.observation.targetRank, 1);
	assert(!JSON.stringify(proofBody).includes("rawResponseBody"));
	assert.equal(
		(await customer.read(new Request(`http://disposable.invalid/local?evidence=${randomUUID()}`), cycleId)).status,
		404,
	);
	assert.equal((await handlers(recipient, "other-tenant").read(read, cycleId)).status, 403);
	assert.equal((await handlers(recipient, f.org, "api_key").read(read, cycleId)).status, 403);
	assert.equal((await owner.deliver(request({ ...body, recipientIdentity: "not-a-member" }), cycleId)).status, 403);
	const delivery = await receipt(await owner.deliver(request({ ...body, recipientIdentity: recipient }), cycleId));
	assert.equal((await cycle(f, cycleId)).status, "READY");
	const secondDelivery = await receipt(
		await owner.deliver(request({ ...body, recipientIdentity: recipient }), cycleId),
	);
	if (!partial && process.env.LOCAL_PROOF_BROWSER === "true") {
		const http = createServer(async (incoming, outgoing) => {
			try {
				let raw = "";
				for await (const chunk of incoming) raw += chunk;
				const url = `http://${incoming.headers.host}${incoming.url}`;
				const req = new Request(url, {
					method: incoming.method,
					headers: incoming.headers as Record<string, string>,
					...(incoming.method === "POST" ? { body: raw } : {}),
				});
				const response =
					incoming.method === "GET"
						? await customer.read(req, cycleId)
						: incoming.url?.endsWith("/acknowledge")
							? await customer.acknowledge(req, cycleId)
							: new Response(null, { status: 405 });
				if (response.status >= 400)
					console.error(
						"LIVE_BROWSER_HTTP",
						response.status,
						req.headers.get("origin"),
						new URL(req.url).origin,
						await response.clone().text(),
					);
				outgoing.writeHead(response.status, Object.fromEntries(response.headers));
				outgoing.end(await response.text());
			} catch {
				outgoing.writeHead(500);
				outgoing.end();
			}
		});
		await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
		const address = http.address();
		assert(address && typeof address === "object");
		try {
			await new Promise<void>((resolve, reject) => {
				const child = spawn(
					"pnpm",
					[
						"exec",
						"tsx",
						"apps/web/scripts/local-report-browser-proof.ts",
						process.env.LOCAL_PROOF_BROWSER_ARTIFACTS ?? "/private/tmp/selena-local-browser-live",
						cycleId,
						String(address.port),
					],
					{ stdio: "inherit" },
				);
				child.on("error", reject);
				child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`LOCAL_BROWSER_FAILED:${code}`))));
			});
		} finally {
			await new Promise<void>((resolve) => http.close(() => resolve()));
		}
	}
	const key = randomUUID();
	assert.equal((await other.acknowledge(request({ deliveryId: delivery.deliveryId }, key), cycleId)).status, 403);
	assert.equal((await owner.acknowledge(request({ deliveryId: delivery.deliveryId }, key), cycleId)).status, 403);
	await receipt(await customer.acknowledge(request({ deliveryId: delivery.deliveryId }, key), cycleId));
	assert.equal(
		(await customer.acknowledge(request({ deliveryId: secondDelivery.deliveryId }, key), cycleId)).status,
		409,
	);
	const acknowledged = (
		await admin.query("SELECT acknowledged_at FROM sv_local_report_deliveries WHERE id=$1", [delivery.deliveryId])
	).rows[0].acknowledged_at;
	await receipt(await customer.acknowledge(request({ deliveryId: delivery.deliveryId }, key), cycleId));
	await receipt(await customer.acknowledge(request({ deliveryId: delivery.deliveryId }), cycleId));
	assert.deepEqual(
		(await admin.query("SELECT acknowledged_at FROM sv_local_report_deliveries WHERE id=$1", [delivery.deliveryId]))
			.rows[0].acknowledged_at,
		acknowledged,
	);
	assert.equal((await other.acknowledge(request({ deliveryId: delivery.deliveryId }, key), cycleId)).status, 403);
	assert.equal((await cycle(f, cycleId)).status, "COMPLETED");
	const beforeRevocation = (await evidence(f)).length;
	await txFor(f.org, (tx) =>
		tx
			.update(s.svLocalReportVersions)
			.set({ status: "REVOKED", revokedAt: sql`now()` })
			.where(eq(s.svLocalReportVersions.id, draft.reportVersionId)),
	);
	assert.equal((await customer.read(read, cycleId)).status, 404);
	assert.equal((await customer.acknowledge(request({ deliveryId: delivery.deliveryId }, key), cycleId)).status, 403);
	assert.equal((await evidence(f)).length, beforeRevocation);
	console.log(
		"PASS publication rollback: revoked report unavailable, cached acknowledgement denied, immutable evidence retained",
	);
	console.log(
		`PASS real HTTP/store/RLS ${partial ? "partial acceptance -> " : ""}draft -> QC -> publication -> secure delivery -> ordinary recipient acknowledgement; prepublication isolation, member checks, private evidence, replay`,
	);
}
async function main() {
	await admin.query("GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO selena_app");
	await admin.query("REVOKE SELECT ON sv_local_external_raw_evidence FROM selena_app");
	await admin.query(
		"GRANT SELECT(provider_task_id,organization_id,audit_id,raw_sha256,captured_at,retention_expires_at,raw_deleted_at) ON sv_local_external_raw_evidence TO selena_app",
	);
	await admin.query("REVOKE SELECT ON sv_source_snapshots FROM selena_app");
	await admin.query(`GRANT SELECT (
		id, organization_id, project_id, source_type, capability_id,
		input_schema_version, output_schema_version, content_sha256_format_valid,
		captured_at, immutable, created_at
	) ON sv_source_snapshots TO selena_app`);
	const sourceBoundary = (
		await admin.query(`SELECT
			has_table_privilege('selena_app','sv_source_snapshots','SELECT') AS table_select,
			has_column_privilege('selena_app','sv_source_snapshots','source_ref','SELECT') AS source_ref_select,
			has_column_privilege('selena_app','sv_source_snapshots','content_sha256','SELECT') AS content_sha256_select,
				(SELECT prosecdef FROM pg_proc WHERE oid='sv_local_pilot_observation_guard()'::regprocedure) AS guard_security_definer,
				(SELECT prosecdef FROM pg_proc WHERE oid='sv_local_pilot_canary_review_guard()'::regprocedure) AS review_guard_security_definer`)
	).rows[0];
	assert.deepEqual(sourceBoundary, {
		table_select: false,
		source_ref_select: false,
		content_sha256_select: false,
		guard_security_definer: true,
		review_guard_security_definer: true,
	});
	console.log("PASS runtime role cannot read restricted source provenance; observation guard is security definer");
	await admin.query("INSERT INTO sv_provider_spend_budgets(scope,cap_usd) VALUES('local-maps',100)");
	if (process.env.SELENA_LOCAL_PROOF_CUSTOMER_ONLY === "true") {
		await proveCustomerOrders();
		return;
	}
	const f = await seed(),
		c = await canary(f),
		a = (await attempts(f, c.measurementCycleId))[0];
	const raw = '{"fixture":"identical-canary-and-customer"}';
	await run(f, a.id, "FOUND", "0.002000", raw);
	assert.equal((await cycle(f, c.cycleId)).status, "CANARY_REVIEW");
	await noPending(f, c.cycleId);
	assert.equal((await attempts(f, c.measurementCycleId)).length, 1);
	const canaryEvidence = (await evidence(f))[0];
	assert.equal(canaryEvidence.sourceType, "LOCAL_MAPS_CANARY_ONLY");
	await txFor(f.org, async (tx) => {
		assert.equal((await tx.select().from(s.svEvidenceIndex)).length, 0);
		assert.equal((await tx.select().from(s.svMeasurementDatasets)).length, 0);
		assert.equal((await tx.select().from(s.svEvidenceAcceptanceReceipts)).length, 0);
	});
	await assert.rejects(
		txFor(f.org, async (tx) => {
			const [mismatched] = await tx
				.insert(s.svSourceSnapshots)
				.values({
					organizationId: f.org,
					projectId: f.project,
					sourceType: "LOCAL_MAPS_CANARY_ONLY",
					sourceRef: "fixture://unrelated-canary",
					contentSha256: hash("unrelated-canary"),
					snapshot: {},
					capturedAt: new Date(),
					immutable: true,
				})
				.returning({ id: s.svSourceSnapshots.id });
			await reviewLocalCanaryInTransaction({
				tx,
				organizationId: f.org,
				cycleId: c.cycleId,
				actorId: f.actor,
				attemptId: a.id,
				evidenceId: mismatched.id,
				decision: "ACCEPTED",
			});
		}),
		(error: unknown) =>
			error instanceof Error &&
			error.cause instanceof Error &&
			error.cause.message === "LOCAL_CANARY_REVIEW_EVIDENCE_INVALID",
	);
	const foreign = await seed();
	const [foreignSource] = await txFor(foreign.org, (tx) =>
		tx
			.insert(s.svSourceSnapshots)
			.values({
				organizationId: foreign.org,
				projectId: foreign.project,
				sourceType: "LOCAL_MAPS_CANARY_ONLY",
				sourceRef: "fixture://foreign-canary",
				contentSha256: hash("foreign-canary"),
				snapshot: {},
				capturedAt: new Date(),
				immutable: true,
			})
			.returning({ id: s.svSourceSnapshots.id }),
	);
	await assert.rejects(review(f, c.cycleId, a.id, foreignSource.id), /LOCAL_CANARY_REVIEW_EVIDENCE_INVALID/);
	assert.equal((await evidence(f)).length, 1);
	const accepted = await review(f, c.cycleId, a.id, canaryEvidence.id);
	console.log(
		"PASS restricted canary review: mismatched provenance and foreign evidence rejected; valid evidence accepted",
	);
	assert(accepted.pilotCycleId);
	assert.equal((await cycle(f, accepted.pilotCycleId)).status, "CREATED");
	assert.equal((await attempts(f, required(accepted.pilotMeasurementCycleId))).length, 0);
	const databaseNow = new Date((await admin.query("SELECT now() AS now")).rows[0].now);
	const closedResponse = await reschedulePilotRequest(f, accepted.pilotCycleId, accepted.reviewId, {
		startsAt: new Date(databaseNow.getTime() - 120_000).toISOString(),
		endsAt: new Date(databaseNow.getTime() - 60_000).toISOString(),
	});
	assert.equal(closedResponse.status, 400);
	assert.equal((await closedResponse.json()).error.code, "LOCAL_PILOT_WINDOW_CLOSED");
	assert.equal((await cycle(f, accepted.pilotCycleId)).status, "CREATED");
	const replacement = await reschedulePilot(f, accepted.pilotCycleId, accepted.reviewId);
	assert.equal((await cycle(f, accepted.pilotCycleId)).status, "STOPPED");
	assert.equal((await attempts(f, replacement.pilotMeasurementCycleId)).length, 0);
	const replacementLock = await txFor(
		f.org,
		async (tx) =>
			(
				await tx
					.select()
					.from(s.svConfigurationLocks)
					.where(eq(s.svConfigurationLocks.id, replacement.configurationLockId))
			)[0],
	);
	assert.equal(replacementLock.engineSha, "a".repeat(40));
	assert.equal(replacementLock.version, replacement.lockVersion);
	assert.equal(validateLocalPilotLock(replacementLock.snapshot).lockVersion, replacement.lockVersion);
	await assert.rejects(
		txFor(f.org, async (tx) => {
			await materializeLocalPilotInTransaction({
				tx,
				organizationId: f.org,
				localCycleId: accepted.pilotCycleId,
				env,
			});
		}),
		/LOCAL_PILOT_NOT_APPROVED/,
	);
	await txFor(f.org, async (tx) => {
		await tx
			.update(s.svLocalScanCycles)
			.set({ status: "APPROVED" })
			.where(eq(s.svLocalScanCycles.id, replacement.pilotCycleId));
		await materializeLocalPilotInTransaction({
			tx,
			organizationId: f.org,
			localCycleId: replacement.pilotCycleId,
			env,
		});
	});
	const pa = await attempts(f, replacement.pilotMeasurementCycleId);
	assert.equal(pa.length, 9);

	await run(f, pa[0].id, "FOUND", "0.002000", raw);
	const sources = await evidence(f);
	assert.equal(sources.length, 2);
	assert.notEqual(sources[0].id, sources[1].id);
	await txFor(f.org, async (tx) => {
		const [e] = await tx.select().from(s.svEvidenceIndex);
		assert.notEqual(e.sourceSnapshotId, canaryEvidence.id);
	});
	await assert.rejects(
		txFor(f.org, async (tx) => {
			const [e] = await tx.select().from(s.svEvidenceIndex);
			await tx
				.insert(s.svEvidenceIndex)
				.values({ ...e, id: randomUUID(), observationRef: randomUUID(), sourceSnapshotId: canaryEvidence.id });
		}),
		(error) =>
			error instanceof Error &&
			error.cause instanceof Error &&
			error.cause.message.includes("LOCAL_CANARY_CUSTOMER_EVIDENCE_FORBIDDEN"),
	);
	await txFor(f.org, async (tx) => {
		assert.equal((await tx.select().from(s.svEvidenceAcceptanceReceipts)).length, 0);
	});
	console.log(
		"PASS real canary -> CANARY_REVIEW -> accepted review -> immutable-window PILOT replacement; hash dedup isolation",
	);
	// A successful retry consumes a distinct reservation; exhaustion creates no fourth attempt.
	await run(f, pa[1].id, "RETRYABLE_FAILURE");
	let retry = (await attempts(f, replacement.pilotMeasurementCycleId)).find(
		(x) => x.localObservationId === pa[1].localObservationId && x.attemptIndex === 2,
	);
	assert(retry);
	await run(f, retry.id);
	assert.equal(
		(await observations(f, replacement.pilotCycleId)).find((o) => o.id === pa[1].localObservationId)?.outcome,
		"FOUND",
	);
	await run(f, pa[2].id, "RETRYABLE_FAILURE");
	retry = (await attempts(f, replacement.pilotMeasurementCycleId)).find(
		(x) => x.localObservationId === pa[2].localObservationId && x.attemptIndex === 2,
	);
	assert(retry);
	await run(f, retry.id, "RETRYABLE_FAILURE");
	retry = (await attempts(f, replacement.pilotMeasurementCycleId)).find(
		(x) => x.localObservationId === pa[2].localObservationId && x.attemptIndex === 3,
	);
	assert(retry);
	await run(f, retry.id, "RETRYABLE_FAILURE");
	assert.equal(
		(await attempts(f, replacement.pilotMeasurementCycleId)).filter(
			(x) => x.localObservationId === pa[2].localObservationId,
		).length,
		3,
	);
	for (const item of pa.slice(3)) await run(f, item.id);
	await noPending(f, replacement.pilotCycleId);
	assert.equal((await cycle(f, replacement.pilotCycleId)).status, "PARTIAL_FAILURE");
	console.log("PASS real retry coordinator: retry success, max-attempt exhaustion, terminal cycle");
	// Report keywords remain frozen even if the operator edits the catalog later.
	await admin.query("UPDATE sv_local_keywords SET text='changed after measurement' WHERE organization_id=$1", [f.org]);
	await reportPath(f, replacement.pilotCycleId, true);
	const complete = await seed();
	const completeCanary = await canary(complete);
	const completePilot = await pilot(complete, completeCanary);
	for (const item of await attempts(complete, completePilot.measurementCycleId)) await run(complete, item.id);
	assert.equal((await cycle(complete, completePilot.cycleId)).status, "QC_REQUIRED");
	await reportPath(complete, completePilot.cycleId, false);
	const over = await seed(),
		oc = await canary(over),
		oa = (await attempts(over, oc.measurementCycleId))[0];
	await run(over, oa.id, "FOUND", "0.003");
	assert.equal((await cycle(over, oc.cycleId)).status, "BUDGET_BLOCKED");
	assert((await cycle(over, oc.cycleId)).emergencyStoppedAt);
	await noPending(over, oc.cycleId);
	await assert.rejects(
		review(over, oc.cycleId, oa.id, (await evidence(over))[0].id),
		/LOCAL_CANARY_REVIEW_STATE_INVALID/,
	);
	await assert.rejects(
		txFor(over.org, (tx) =>
			tx.update(s.svLocalScanCycles).set({ status: "CANARY_REVIEW" }).where(eq(s.svLocalScanCycles.id, oc.cycleId)),
		),
	);
	assert.equal((await cycle(over, oc.cycleId)).status, "BUDGET_BLOCKED");
	const before = fixtureCalls;
	assert.equal(
		(
			await runLocalMapsLiveAttempt({
				intent: { organizationId: over.org, attemptId: oa.id },
				store,
				provider: {
					...provider,
					execute: async () => {
						fixtureCalls++;
						throw Error("UNREACHABLE");
					},
				},
				now: () => new Date(),
			})
		).kind,
		"NOT_CALLED",
	);
	assert.equal(fixtureCalls, before);
	assert.equal(
		(
			await admin.query(
				"SELECT count(*)::int AS n FROM sv_local_scan_cycles WHERE organization_id=$1 AND execution_mode='PILOT'",
				[over.org],
			)
		).rows[0].n,
		0,
	);
	console.log("PASS budget incident remains BUDGET_BLOCKED; acceptance/PILOT/provider replay blocked");
	const failedCanary = await seed();
	const fc = await canary(failedCanary);
	const fa = (await attempts(failedCanary, fc.measurementCycleId))[0];
	await run(failedCanary, fa.id, "RETRYABLE_FAILURE");
	assert.equal((await attempts(failedCanary, fc.measurementCycleId)).length, 1);
	assert.equal((await attempts(failedCanary, fc.measurementCycleId))[0].status, "TERMINAL_FAILURE");
	assert.equal((await cycle(failedCanary, fc.cycleId)).status, "CANARY_REVIEW");
	await noPending(failedCanary, fc.cycleId);
	console.log("PASS canary failure terminalizes without a retry");
	const unknown = await seed(),
		uc = await canary(unknown),
		ua = (await attempts(unknown, uc.measurementCycleId))[0];
	await run(unknown, ua.id, "OUTCOME_UNKNOWN");
	const unknownAttempt = (await attempts(unknown, uc.measurementCycleId))[0];
	assert.equal(unknownAttempt.budgetState, "RESERVED");
	assert.equal(unknownAttempt.status, "UNKNOWN_RECONCILIATION");
	assert.equal((await cycle(unknown, uc.cycleId)).status, "UNKNOWN_RECONCILIATION");
	assert.equal(
		(await admin.query("SELECT count(*)::int n FROM sv_cost_events WHERE organization_id=$1", [unknown.org])).rows[0].n,
		0,
	);
	console.log("PASS ambiguous unknown cost: retained reservation, no cost event or retry");
	const unknownPilot = await seed(),
		upc = await pilot(unknownPilot, await canary(unknownPilot)),
		upa = (await attempts(unknownPilot, upc.measurementCycleId))[0];
	const priorPilotCostEvents = (
		await admin.query("SELECT id FROM sv_cost_events WHERE organization_id=$1 ORDER BY id", [unknownPilot.org])
	).rows;
	await run(unknownPilot, upa.id, "OUTCOME_UNKNOWN");
	const unknownPilotAttempts = await attempts(unknownPilot, upc.measurementCycleId);
	assert.equal((await cycle(unknownPilot, upc.cycleId)).status, "UNKNOWN_RECONCILIATION");
	assert.equal(unknownPilotAttempts.filter((attempt) => attempt.status === "UNKNOWN_RECONCILIATION").length, 1);
	assert.equal(unknownPilotAttempts.filter((attempt) => attempt.status === "CANCELLED_NO_CALL").length, 8);
	assert.equal(unknownPilotAttempts.find((attempt) => attempt.id === upa.id)?.budgetState, "RESERVED");
	assert.equal(unknownPilotAttempts.filter((attempt) => attempt.budgetState === "RELEASED").length, 8);
	await noPending(unknownPilot, upc.cycleId);
	assert.equal(
		(
			await admin.query(
				"SELECT count(*)::int n FROM sv_cost_events WHERE organization_id=$1 AND measurement_cycle_id=$2",
				[unknownPilot.org, upc.measurementCycleId],
			)
		).rows[0].n,
		0,
	);
	assert.deepEqual(
		(await admin.query("SELECT id FROM sv_cost_events WHERE organization_id=$1 ORDER BY id", [unknownPilot.org])).rows,
		priorPilotCostEvents,
	);
	console.log("PASS unknown pilot outcome stops untouched slots and preserves only the submitted reservation");
	const rollbackFixture = await seed();
	const rollbackPilot = await pilot(rollbackFixture, await canary(rollbackFixture));
	const rollbackAttempt = (await attempts(rollbackFixture, rollbackPilot.measurementCycleId))[0];
	const priorRollbackCostEvents = (
		await admin.query("SELECT id FROM sv_cost_events WHERE organization_id=$1 ORDER BY id", [rollbackFixture.org])
	).rows;
	assert.equal(finalizerFailures.length, 0);
	await admin.query("ALTER FUNCTION sv_local_pilot_observation_guard() SECURITY INVOKER");
	try {
		const rollbackResult = await run(
			rollbackFixture,
			rollbackAttempt.id,
			"FOUND",
			"0.002000",
			undefined,
			"UNKNOWN_RECONCILIATION",
		);
		assert.deepEqual(rollbackResult, { kind: "UNKNOWN_RECONCILIATION", reason: "FINALIZE_AMBIGUOUS" });
	} finally {
		await admin.query("ALTER FUNCTION sv_local_pilot_observation_guard() SECURITY DEFINER");
	}
	assert.equal(finalizerFailures.length, 1);
	const finalizerFailure = finalizerFailures[0];
	assert(finalizerFailure instanceof Error && finalizerFailure.cause instanceof Error);
	assert.equal(finalizerFailure.cause.message, "permission denied for table sv_source_snapshots");
	const rollbackAttempts = await attempts(rollbackFixture, rollbackPilot.measurementCycleId);
	const persistedUnknown = required(rollbackAttempts.find((attempt) => attempt.id === rollbackAttempt.id));
	assert.equal(persistedUnknown.status, "UNKNOWN_RECONCILIATION");
	assert.equal(persistedUnknown.unknownReason, "FINALIZE_AMBIGUOUS");
	assert.equal(persistedUnknown.budgetState, "RESERVED");
	assert.equal(persistedUnknown.costEventId, null);
	assert.equal(rollbackAttempts.filter((attempt) => attempt.status === "CANCELLED_NO_CALL").length, 8);
	assert.equal(rollbackAttempts.filter((attempt) => attempt.budgetState === "RELEASED").length, 8);
	assert.equal((await cycle(rollbackFixture, rollbackPilot.cycleId)).status, "UNKNOWN_RECONCILIATION");
	await noPending(rollbackFixture, rollbackPilot.cycleId);
	const rollbackRows = (
		await admin.query(
			`SELECT
			 (SELECT count(*)::int FROM sv_measurement_attempt_results WHERE organization_id=$1 AND attempt_id=$2) AS results,
			 (SELECT count(*)::int FROM sv_measurement_datasets WHERE organization_id=$1 AND cycle_id=$3) AS datasets,
			 (SELECT count(*)::int FROM sv_evidence_index WHERE organization_id=$1 AND cycle_id=$3) AS evidence,
			 (SELECT count(*)::int FROM sv_local_raw_evidence WHERE organization_id=$1 AND provider_task_id=$5) AS raw,
			 (SELECT count(*)::int FROM sv_local_dispatch_outbox WHERE organization_id=$1 AND local_cycle_id=$4 AND status='CANCELLED') AS cancelled_outbox`,
			[
				rollbackFixture.org,
				rollbackAttempt.id,
				rollbackPilot.measurementCycleId,
				rollbackPilot.cycleId,
				`fixture-${rollbackAttempt.id}`,
			],
		)
	).rows[0];
	assert.deepEqual(rollbackRows, { results: 0, datasets: 0, evidence: 0, raw: 0, cancelled_outbox: 8 });
	assert.deepEqual(
		(await admin.query("SELECT id FROM sv_cost_events WHERE organization_id=$1 ORDER BY id", [rollbackFixture.org]))
			.rows,
		priorRollbackCostEvents,
	);
	const callsBeforeRollbackReplay = fixtureCalls;
	assert.deepEqual(
		await store.acquireAndCommitSubmitted(
			{ organizationId: rollbackFixture.org, attemptId: rollbackAttempt.id },
			new Date(),
		),
		{ kind: "RECONCILIATION_REQUIRED" },
	);
	assert.equal(fixtureCalls, callsBeforeRollbackReplay);
	console.log(
		"PASS real finalizer privilege rollback: unknown persisted, eight slots cancelled, no result/evidence/cost, replay blocked",
	);
	const billingFixture = await seed();
	const billingPilot = await pilot(billingFixture, await canary(billingFixture));
	await dispatchLocalOutboxOnce({
		store: createLocalDispatchStore(db, billingFixture.org, 60000),
		env: () => env,
		queue: { send: async () => randomUUID() },
	});
	for (const attempt of await attempts(billingFixture, billingPilot.measurementCycleId)) {
		const clock = new Date((await admin.query("SELECT clock_timestamp() AS now")).rows[0].now);
		assert.equal(
			(await store.acquireAndCommitSubmitted({ organizationId: billingFixture.org, attemptId: attempt.id }, clock))
				.kind,
			"READY",
		);
	}
	// Reproduce the historical rollback state: all calls crossed submission,
	// but the legacy fallback saved only attempts, leaving observations pending.
	await txFor(billingFixture.org, (tx) =>
		tx
			.update(s.svMeasurementAttempts)
			.set({ status: "UNKNOWN_RECONCILIATION", completedAt: sql`now()`, unknownReason: "FINALIZE_AMBIGUOUS" })
			.where(eq(s.svMeasurementAttempts.measurementCycleId, billingPilot.measurementCycleId)),
	);
	const beforeBilling = await attempts(billingFixture, billingPilot.measurementCycleId);
	const manifest = localBillingManifestSchema.parse({
		schemaVersion: 1,
		organizationId: billingFixture.org,
		cycleId: billingPilot.cycleId,
		measurementCycleId: billingPilot.measurementCycleId,
		providerId: provider.id,
		billingSourceSha256: "c".repeat(64),
		billingConfirmedAt: new Date((await admin.query("SELECT clock_timestamp() AS now")).rows[0].now).toISOString(),
		entries: beforeBilling.map((attempt) => {
			const request = localMapsLiveSubmittedCandidateSchema.parse(attempt.submittedCandidate).providerRequest;
			return {
				attemptId: attempt.id,
				reservationId: attempt.reservationId,
				executionKey: attempt.executionKey,
				providerTaskId: `billing-fixture-${attempt.id}`,
				actualCostUsd: "0.002000",
				coordinate: `${request.point.latitude},${request.point.longitude},${request.params.zoom}`,
				keyword: request.keyword.text,
				language: request.params.language,
				seDomain: request.params.seDomain,
				device: "mobile",
				os: request.params.os,
				depth: request.params.depth,
				searchThisArea: request.params.searchThisArea,
				providerPostedAt: required(attempt.submittedAt).toISOString(),
				providerDoneAt: required(attempt.completedAt).toISOString(),
			};
		}),
	});
	const billingInput = {
		db: drizzle(admin, { schema: s }),
		actorId: billingFixture.actor,
		manifest,
		env: { SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED: "false", SELENA_LOCAL_EMERGENCY_STOP: "true" },
	};
	await assert.rejects(
		reconcileLocalPilotBilling({ ...billingInput, db }),
		/LOCAL_BILLING_RESERVATION_CARDINALITY_MISMATCH/,
	);
	assert.equal((await reconcileLocalPilotBilling(billingInput)).status, "DRY_RUN");
	assert.deepEqual(await attempts(billingFixture, billingPilot.measurementCycleId), beforeBilling);
	await assert.rejects(
		reconcileLocalPilotBilling({ ...billingInput, apply: true }),
		/LOCAL_BILLING_MANIFEST_APPROVAL_REQUIRED/,
	);
	await assert.rejects(reconcileLocalPilotBilling({ ...billingInput, env }), /LOCAL_BILLING_EXECUTION_MUST_BE_STOPPED/);
	await assert.rejects(
		reconcileLocalPilotBilling({ ...billingInput, actorId: randomUUID() }),
		/LOCAL_OPERATOR_MEMBERSHIP_REQUIRED/,
	);
	const wrongManifest = {
		...manifest,
		entries: manifest.entries.map((entry, index) => (index === 0 ? { ...entry, coordinate: "0,0,13" } : entry)),
	};
	await assert.rejects(
		reconcileLocalPilotBilling({
			...billingInput,
			manifest: wrongManifest,
			apply: true,
			approvedManifestSha256: localBillingManifestDigest(wrongManifest),
		}),
		/LOCAL_BILLING_REQUEST_MISMATCH/,
	);
	const committedBeforeBilling = (await admin.query("SELECT sv_provider_spend_committed('local-maps') AS amount"))
		.rows[0].amount;
	await admin.query(
		"CREATE FUNCTION proof_reject_billing_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event='LOCAL_PILOT_BILLING_RECONCILED' THEN RAISE EXCEPTION 'PROOF_BILLING_AUDIT_REJECTED'; END IF; RETURN NEW; END $$; CREATE TRIGGER proof_reject_billing_audit BEFORE INSERT ON sv_audit_events FOR EACH ROW EXECUTE FUNCTION proof_reject_billing_audit()",
	);
	const approvedBilling = {
		...billingInput,
		apply: true,
		approvedManifestSha256: localBillingManifestDigest(manifest),
	};
	try {
		await assert.rejects(
			reconcileLocalPilotBilling(approvedBilling),
			(error: unknown) =>
				error instanceof Error &&
				error.cause instanceof Error &&
				error.cause.message === "PROOF_BILLING_AUDIT_REJECTED",
		);
	} finally {
		await admin.query(
			"DROP TRIGGER proof_reject_billing_audit ON sv_audit_events; DROP FUNCTION proof_reject_billing_audit()",
		);
	}
	assert.deepEqual(await attempts(billingFixture, billingPilot.measurementCycleId), beforeBilling);
	assert.equal(
		(
			await admin.query("SELECT count(*)::int AS n FROM sv_cost_events WHERE measurement_cycle_id=$1", [
				billingPilot.measurementCycleId,
			])
		).rows[0].n,
		0,
	);
	assert.equal(
		(
			await admin.query(
				"SELECT count(*)::int AS n FROM sv_provider_spend_reservations WHERE organization_id=$1 AND status='RESERVED'",
				[billingFixture.org],
			)
		).rows[0].n,
		9,
	);
	const reconciliations = await Promise.all([
		reconcileLocalPilotBilling(approvedBilling),
		reconcileLocalPilotBilling(approvedBilling),
	]);
	assert.deepEqual(reconciliations.map((r) => r.status).sort(), ["ALREADY_RECONCILED", "RECONCILED"]);
	assert.equal((await cycle(billingFixture, billingPilot.cycleId)).status, "STOPPED");
	assert.equal(
		(await observations(billingFixture, billingPilot.cycleId)).filter(
			(o) => o.outcome === "UNKNOWN" && o.targetRank === null && o.evidenceId === null,
		).length,
		9,
	);
	const afterBilling = await attempts(billingFixture, billingPilot.measurementCycleId);
	assert.equal(
		afterBilling.filter(
			(a) => a.status === "UNKNOWN_RECONCILIATION" && a.budgetState === "SPENT" && a.spentCostUsd === "0.002000",
		).length,
		9,
	);
	assert.equal(
		(
			await admin.query(
				"SELECT count(*)::int AS n, sum(amount_usd)::text AS amount FROM sv_cost_events WHERE measurement_cycle_id=$1",
				[billingPilot.measurementCycleId],
			)
		).rows[0].amount,
		"0.018000",
	);
	assert.equal(
		(
			await admin.query(
				"SELECT count(*)::int AS n FROM sv_local_dispatch_outbox WHERE local_cycle_id=$1 AND status='ENQUEUED'",
				[billingPilot.cycleId],
			)
		).rows[0].n,
		9,
	);
	assert.equal(
		(await admin.query("SELECT sv_provider_spend_committed('local-maps') AS amount")).rows[0].amount,
		committedBeforeBilling,
	);
	const callsBeforeBillingReplay = fixtureCalls;
	for (const attempt of afterBilling)
		assert.equal(
			(await store.acquireAndCommitSubmitted({ organizationId: billingFixture.org, attemptId: attempt.id }, new Date()))
				.kind,
			"RECONCILIATION_REQUIRED",
		);
	assert.equal(fixtureCalls, callsBeforeBillingReplay);
	console.log(
		"PASS billing reconciliation: read-only preview, approval/identity denial, atomic rollback, concurrent idempotency, unchanged committed budget, nine actual costs, stopped cycle and no provider replay",
	);
	const refused = await seed(),
		rc = await pilot(refused, await canary(refused)),
		ra = (await attempts(refused, rc.measurementCycleId))[0];
	await admin.query("UPDATE sv_provider_spend_budgets SET cap_usd=0.001 WHERE scope='local-maps'");
	await run(refused, ra.id, "RETRYABLE_FAILURE");
	await noPending(refused, rc.cycleId);
	assert.equal((await cycle(refused, rc.cycleId)).status, "BUDGET_BLOCKED");
	assert.equal((await attempts(refused, rc.measurementCycleId)).length, 9);
	assert.equal(
		(
			await admin.query(
				"SELECT count(*)::int n FROM sv_measurement_attempt_results WHERE organization_id=$1 AND disposition->>'observationOutcome'='RETRY_PENDING'",
				[refused.org],
			)
		).rows[0].n,
		0,
	);
	assert.equal(
		(
			await admin.query(
				"SELECT count(*)::int n FROM sv_local_dispatch_outbox WHERE organization_id=$1 AND status IN ('PENDING','CLAIMED') AND attempt_id<>$2",
				[refused.org, ra.id],
			)
		).rows[0].n,
		0,
	);
	console.log("PASS retry reservation refusal: no retry, no pending observations, BUDGET_BLOCKED");
	// Use the real registered handler + durable sender on disposable pg-boss. No provider controls.
	const rawRows = (
		await admin.query("SELECT * FROM sv_local_raw_evidence WHERE organization_id=$1 ORDER BY retention_expires_at", [
			f.org,
		])
	).rows;
	assert(rawRows.length > 0);
	const expiry = new Date(rawRows[0].retention_expires_at);
	const beforeExpiry = createLocalRawRetentionHandler(db, () => new Date(expiry.getTime() - 1));
	await beforeExpiry([{ data: { organizationId: f.org } }]);
	assert(
		(await admin.query("SELECT raw_response_body FROM sv_local_raw_evidence WHERE id=$1", [rawRows[0].id])).rows[0]
			.raw_response_body,
	);
	const now = new Date(Math.max(...rawRows.map((r) => new Date(r.retention_expires_at).getTime())));
	const overdue = await txFor(f.org, (tx) => checkLocalRawRetentionInTransaction(tx, f.org, now));
	assert(overdue.overdue > 0);
	assert.equal(overdue.healthy, false);
	const boss = new PgBoss({
		...connection,
		schema: "local_retention_proof",
		schedule: false,
		maintenanceIntervalSeconds: 1,
	});
	boss.on("error", (error) => {
		throw error;
	});
	await boss.start();
	let stop: undefined | (() => Promise<void>);
	try {
		assert.equal(
			await startLocalRawRetentionScheduler({
				boss,
				env: {},
				handler: createLocalRawRetentionHandler(db),
				onError: () => {
					throw Error("UNEXPECTED");
				},
			}),
			undefined,
		);
		stop = await startLocalRawRetentionScheduler({
			boss,
			env: { SELENA_LOCAL_RAW_RETENTION_OWNER_APPROVED: "true", SELENA_LOCAL_RAW_RETENTION_ORGANIZATION_ID: f.org },
			handler: createLocalRawRetentionHandler(db, () => now),
			onError: (error) => {
				throw error;
			},
		});
		for (let i = 0; i < 100; i++) {
			if (
				(
					await admin.query(
						"SELECT count(*)::int n FROM sv_local_raw_evidence WHERE organization_id=$1 AND raw_response_body IS NOT NULL",
						[f.org],
					)
				).rows[0].n === 0
			)
				break;
			await new Promise((r) => setTimeout(r, 100));
		}
		assert.equal((await txFor(f.org, (tx) => checkLocalRawRetentionInTransaction(tx, f.org, now))).healthy, true);
		assert.equal(
			(await txFor(f.org, (tx) => checkLocalRawRetentionInTransaction(tx, f.org, new Date(now.getTime() + 181000))))
				.healthy,
			false,
		);
		const remaining = (await admin.query("SELECT * FROM sv_local_raw_evidence WHERE organization_id=$1", [f.org])).rows;
		assert(remaining.every((r) => r.raw_response_body === null && r.raw_deleted_at));
		assert.equal(remaining.length, rawRows.length);
		for (const row of remaining) {
			const original = rawRows.find((r) => r.id === row.id);
			assert.equal(row.raw_response_sha256, original.raw_response_sha256);
			assert.equal(row.provider_task_id, original.provider_task_id);
		}
		assert(
			(
				await admin.query(
					"SELECT count(*)::int n FROM sv_local_raw_evidence WHERE organization_id=$1 AND raw_response_body IS NOT NULL",
					[unknown.org],
				)
			).rows[0].n > 0,
		);
		const jobs = await admin.query("SELECT count(*)::int n FROM local_retention_proof.job WHERE name=$1", [
			LOCAL_RAW_RETENTION_QUEUE,
		]);
		assert(jobs.rows[0].n > 0);
	} finally {
		await stop?.();
		await boss.stop({ graceful: true, timeout: 5000 });
	}
	console.log(
		"PASS real retention sender/handler: approval gate, due cleanup, tenant isolation, hashes/task IDs retained",
	);
	await txFor("other-tenant", async (tx) => {
		assert.equal((await tx.select().from(s.svLocalRawEvidence)).length, 0);
		assert.equal(
			(
				await tx
					.select({
						id: s.svSourceSnapshots.id,
						organizationId: s.svSourceSnapshots.organizationId,
						sourceType: s.svSourceSnapshots.sourceType,
					})
					.from(s.svSourceSnapshots)
			).length,
			0,
		);
	});
	const mutationIdentity = {
		tenantId: f.org,
		operation: "local-setup-proof",
		resourceId: f.project,
		idempotencyKey: "concurrent-setup-proof",
		bodyHash: localPilotBodyHash({ name: "fixture" }),
	};
	let writes = 0;
	const mutate = () =>
		withSelenaApiMutation({
			db,
			identity: mutationIdentity,
			work: async (tx) => {
				writes++;
				const id = randomUUID();
				await tx.insert(s.svAuditEvents).values({
					id,
					organizationId: f.org,
					actorId: f.actor,
					event: "LOCAL_IDEMPOTENCY_PROOF",
					subjectKind: "project",
					subjectId: f.project,
					details: {},
				});
				return { id };
			},
		});
	const responses = await Promise.all([mutate(), mutate(), mutate()]);
	assert.equal(writes, 1);
	assert.deepEqual(responses[0], responses[1]);
	assert.deepEqual(responses[0], responses[2]);
	await assert.rejects(
		() =>
			withSelenaApiMutation({
				db,
				identity: { ...mutationIdentity, bodyHash: localPilotBodyHash({ name: "different" }) },
				work: async () => {
					throw new Error("MUST_NOT_EXECUTE");
				},
			}),
		/IDEMPOTENCY_BODY_CONFLICT/,
	);
	const rollbackId = randomUUID();
	const rollbackIdentity = { ...mutationIdentity, idempotencyKey: "rollback-setup-proof" };
	await assert.rejects(
		() =>
			withSelenaApiMutation({
				db,
				identity: rollbackIdentity,
				work: async (tx) => {
					await tx.insert(s.svAuditEvents).values({
						id: rollbackId,
						organizationId: f.org,
						actorId: f.actor,
						event: "LOCAL_IDEMPOTENCY_PROOF",
						subjectKind: "project",
						subjectId: f.project,
						details: {},
					});
					throw new Error("EXPECTED_ROLLBACK");
				},
			}),
		/EXPECTED_ROLLBACK/,
	);
	assert.equal(
		(await admin.query("select count(*)::int as n from sv_audit_events where id=$1", [rollbackId])).rows[0].n,
		0,
	);
	assert.equal(
		(
			await admin.query(
				"select count(*)::int as n from sv_api_idempotency_records where organization_id=$1 and idempotency_key=$2",
				[f.org, rollbackIdentity.idempotencyKey],
			)
		).rows[0].n,
		0,
	);
	const expiredIdentity = { ...mutationIdentity, idempotencyKey: "expired-retained-proof" };
	await txFor(f.org, async (tx) => {
		await tx.insert(s.svApiIdempotencyRecords).values({
			organizationId: f.org,
			operation: expiredIdentity.operation,
			resourceId: expiredIdentity.resourceId,
			idempotencyKey: expiredIdentity.idempotencyKey,
			bodyHash: expiredIdentity.bodyHash,
			responseStatus: 201,
			responseBody: responses[0],
			createdAt: sql`now() - interval '8 days'`,
			expiresAt: sql`now() - interval '1 day'`,
		});
	});
	assert.deepEqual(
		await withSelenaApiMutation({
			db,
			identity: expiredIdentity,
			work: async () => {
				throw new Error("EXPIRED_RECEIPT_REPLAYED_MUTATION");
			},
		}),
		responses[0],
	);
	assert.equal(writes, 1);
	console.log("PASS durable mutation: concurrent replay, body conflict, atomic rollback, retained expired receipt");
	const clientFixture = await seed();
	const clientStores = createDurableLocalStores(db);
	const clientAuth = {
		actorId: clientFixture.actor,
		tenantId: clientFixture.org,
		role: "owner" as const,
		authType: "session" as const,
		permissions: ["local:write"],
	};
	const setupRoutes = createSelenaLocalSetupRouteHandlers({
		authenticate: async () => clientAuth,
		store: clientStores.durableLocalSetupStore,
		requestId: randomUUID,
	});
	const writeRoutes = createSelenaLocalWriteRouteHandlers({
		authenticate: async () => clientAuth,
		store: clientStores.durableLocalWriteStore,
		requestId: randomUUID,
	});
	const clientRequest = (body: unknown, key: string) =>
		new Request("https://fixture.invalid/api/local", {
			method: "POST",
			headers: { "content-type": "application/json", "Idempotency-Key": key },
			body: JSON.stringify(body),
		});
	const clientLocation = (
		await admin.query(
			"select l.id,l.entity_id from sv_business_locations l join sv_configuration_locks c on c.snapshot->>'locationId'=l.id::text where c.id=$1",
			[clientFixture.lockId],
		)
	).rows[0];
	const locationBody = {
		entityId: clientLocation.entity_id,
		displayName: "Fixture restaurant",
		countryCode: "ID",
		latitude: -8,
		longitude: 115,
		geoPrecision: "COORDINATE",
	};
	const locationResponses = await Promise.all(
		[clientFixture.project, clientFixture.project.toUpperCase(), clientFixture.project].map((id) =>
			setupRoutes.createLocation(clientRequest(locationBody, "durable-location-proof"), id),
		),
	);
	assert(locationResponses.every((r) => r.status === 201));
	const locations = await Promise.all(locationResponses.map((r) => r.json()));
	assert.deepEqual(locations[0], locations[1]);
	assert.deepEqual(locations[0], locations[2]);
	assert.equal(
		(
			await admin.query(
				"select count(*)::int as n from sv_business_locations where organization_id=$1 and display_name=$2",
				[clientFixture.org, "Fixture restaurant"],
			)
		).rows[0].n,
		1,
	);
	const quoteResponses = await Promise.all(
		[clientLocation.id, clientLocation.id.toUpperCase()].map((id) =>
			writeRoutes.quote(clientRequest({ configurationLockId: clientFixture.lockId }, "durable-quote-proof"), id),
		),
	);
	assert(
		quoteResponses.every((r) => r.status === 201),
		JSON.stringify(
			await Promise.all(quoteResponses.map(async (r) => ({ status: r.status, body: await r.clone().json() }))),
		),
	);
	const quotes = await Promise.all(quoteResponses.map((r) => r.json()));
	assert.deepEqual(quotes[0], quotes[1]);
	const cycleBody = {
		quoteId: quotes[0].quoteId,
		configurationLockId: clientFixture.lockId,
		gridDefinitionId: clientFixture.gridId,
	};
	const cycleResponses = await Promise.all(
		[1, 2, 3].map(() => writeRoutes.createCycle(clientRequest(cycleBody, "durable-cycle-proof"), clientLocation.id)),
	);
	assert(cycleResponses.every((r) => r.status === 201));
	const cycles = await Promise.all(cycleResponses.map((r) => r.json()));
	assert.deepEqual(cycles[0], cycles[1]);
	assert.deepEqual(cycles[0], cycles[2]);
	assert.equal(
		(
			await admin.query("select count(*)::int as n from sv_local_scan_cycles where organization_id=$1", [
				clientFixture.org,
			])
		).rows[0].n,
		1,
	);
	assert.equal(
		(
			await admin.query("select count(*)::int as n from sv_measurement_attempts where organization_id=$1", [
				clientFixture.org,
			])
		).rows[0].n,
		0,
	);
	const conflicting = await setupRoutes.createLocation(
		clientRequest({ ...locationBody, displayName: "Different" }, "durable-location-proof"),
		clientFixture.project,
	);
	assert.equal(conflicting.status, 409);
	console.log(
		"PASS real setup/quote/cycle routes and durable stores: concurrent replay, UUID casing, conflict, zero attempts",
	);
	const otherClient = await seed();
	const otherAuth = { ...clientAuth, tenantId: otherClient.org, actorId: otherClient.actor };
	const otherSetup = createSelenaLocalSetupRouteHandlers({
		authenticate: async () => otherAuth,
		store: clientStores.durableLocalSetupStore,
		requestId: randomUUID,
	});
	const otherWrites = createSelenaLocalWriteRouteHandlers({
		authenticate: async () => otherAuth,
		store: clientStores.durableLocalWriteStore,
		requestId: randomUUID,
	});
	assert.equal(
		(await otherSetup.createLocation(clientRequest(locationBody, "durable-location-proof"), clientFixture.project))
			.status,
		404,
	);
	assert.equal(
		(
			await otherWrites.quote(
				clientRequest({ configurationLockId: clientFixture.lockId }, "durable-quote-proof"),
				clientLocation.id,
			)
		).status,
		404,
	);
	assert.equal(
		(await otherWrites.createCycle(clientRequest(cycleBody, "durable-cycle-proof"), clientLocation.id)).status,
		404,
	);
	assert.equal(
		(
			await admin.query("select count(*)::int as n from sv_api_idempotency_records where organization_id=$1", [
				otherClient.org,
			])
		).rows[0].n,
		0,
	);
	console.log("PASS real customer mutations reject another tenant's entity, lock and quote without response replay");
	await admin.query("UPDATE sv_provider_spend_budgets SET cap_usd=100 WHERE scope='local-maps'");
	const competitorFixture = await seed("dataforseo-google-maps");
	const competitorPilot = await pilot(competitorFixture, await canary(competitorFixture));
	for (const attempt of await attempts(competitorFixture, competitorPilot.measurementCycleId))
		await run(competitorFixture, attempt.id);
	const competitorStore = createLocalReportStore(db, env);
	const competitorDraft = await competitorStore.mutate({
		auth: { tenantId: competitorFixture.org, actorId: competitorFixture.actor, authType: "session" },
		tenantId: competitorFixture.org,
		operation: "report-create",
		cycleId: competitorPilot.cycleId,
		idempotencyKey: randomUUID(),
		bodyHash: localPilotBodyHash({}),
		body: {},
	});
	const competitorReport = await competitorStore.read({
		auth: { tenantId: competitorFixture.org, actorId: competitorFixture.actor, authType: "session" },
		cycleId: competitorPilot.cycleId,
		preview: true,
	});
	assert(competitorDraft && competitorReport && "content" in competitorReport);
	for (const row of competitorReport.content.observations) {
		assert.equal(row.competition.status, "AVAILABLE");
		assert.equal(row.competition.target.groupRank, 2);
		assert.equal(row.competition.target.absoluteRank, 3);
		assert.equal(row.competition.aboveTarget[0].name, "Fixture competitor");
		assert.equal(row.competition.ads[0].name, "Fixture advertisement");
		assert.equal(row.competition.evidenceId, row.evidenceId);
	}
	assert(!JSON.stringify(competitorReport).includes("rawResponseBody"));
	assert("reportVersionId" in competitorDraft);
	const competitionAuth = {
		tenantId: competitorFixture.org,
		actorId: competitorFixture.actor,
		authType: "session" as const,
	};
	const removed = await txFor(competitorFixture.org, (tx) =>
		cleanupExpiredLocalRawEvidenceInTransaction(tx, competitorFixture.org, new Date("2040-01-01T00:00:00Z")),
	);
	assert.equal(removed, 10);
	const newDraft = await competitorStore.mutate({
		auth: competitionAuth,
		tenantId: competitorFixture.org,
		operation: "report-create",
		cycleId: competitorPilot.cycleId,
		idempotencyKey: randomUUID(),
		bodyHash: localPilotBodyHash({}),
		body: {},
	});
	assert(newDraft);
	const unavailableComparison = await competitorStore.read({
		auth: competitionAuth,
		cycleId: competitorPilot.cycleId,
		preview: true,
	});
	assert(unavailableComparison && "content" in unavailableComparison);
	assert(unavailableComparison.content.observations.every((row) => row.competition.status === "UNAVAILABLE"));
	for (const operation of ["qc", "publish"] as const) {
		const body =
			operation === "qc"
				? {
						reportVersionId: competitorDraft.reportVersionId,
						decision: "APPROVED",
						note: "Fixture reviewer checked competitors",
					}
				: { reportVersionId: competitorDraft.reportVersionId };
		await competitorStore.mutate({
			auth: competitionAuth,
			tenantId: competitorFixture.org,
			cycleId: competitorPilot.cycleId,
			operation,
			idempotencyKey: randomUUID(),
			bodyHash: localPilotBodyHash(body),
			body,
		});
	}
	const publishedCompetition = await competitorStore.read({ auth: competitionAuth, cycleId: competitorPilot.cycleId });
	assert(publishedCompetition && "content" in publishedCompetition);
	const savedCompetition = JSON.stringify(publishedCompetition.content);

	const historicalCompetition = await competitorStore.read({ auth: competitionAuth, cycleId: competitorPilot.cycleId });
	assert(historicalCompetition && "content" in historicalCompetition);
	assert.equal(JSON.stringify(historicalCompetition.content), savedCompetition);
	assert(historicalCompetition.content.observations.every((row) => row.competition.rawRetentionExpiresAt));
	const draftAfterCleanup = await competitorStore
		.mutate({
			auth: competitionAuth,
			tenantId: competitorFixture.org,
			operation: "report-create",
			cycleId: competitorPilot.cycleId,
			idempotencyKey: randomUUID(),
			bodyHash: localPilotBodyHash({}),
			body: {},
		})
		.catch(() => null);
	assert.equal(draftAfterCleanup, null, "A published cycle cannot create replacement measurement evidence");
	console.log("PASS published historical competitor snapshot survives raw cleanup with recorded retention deadline");

	console.log(
		"PASS persisted competitor report: raw/result binding, all nine points, organic/ad distinction, no raw payload leakage",
	);
	console.log(`PASS runtime/RLS proof; fixture adapter invocations=${fixtureCalls}; external provider calls=0`);
	await proveCustomerOrders();
}
async function proveCustomerOrders() {
	const orderFixture = await seed();
	const locationRow = (
		await admin.query("select id from sv_business_locations where organization_id=$1", [orderFixture.org])
	).rows[0];
	await admin.query(
		"update sv_business_locations set local_profile=$2,local_profile_confirmed_at=now(),confirmation_status='CONFIRMED' where id=$1",
		[locationRow.id, JSON.stringify({ cid: "fixture-cid", placeId: "fixture-place" })],
	);
	const customerOrders = createLocalCustomerOrderStore(
		db,
		{ mode: "FIXTURE", priceSnapshotVersion: "fixture-zero-v1", perAttemptWorstCaseUsd: "0", orderCapUsd: "0" },
		"a".repeat(40),
	);
	const customerAuth = { tenantId: orderFixture.org, actorId: orderFixture.actor, authType: "session" as const };
	const registration = {
		name: "New fixture restaurant",
		countryCode: "ID",
		mapsUrl: "https://www.google.com/maps?cid=123456789",
		latitude: -8.8,
		longitude: 115.1,
		confirmed: true as const,
	};
	const registrationKey = randomUUID();
	const registered = await Promise.all([
		customerOrders.registerLocation(customerAuth, registration, registrationKey),
		customerOrders.registerLocation(customerAuth, registration, registrationKey),
	]);
	assert.equal(registered[0].id, registered[1].id);
	const existingLocation = await customerOrders.registerLocation(customerAuth, registration, randomUUID());
	assert.equal(existingLocation.id, registered[0].id);
	const mixed = { ...registration, mapsUrl: `${registration.mapsUrl}&query_place_id=ChIJ0wOlGBpF0i0Rkf6i93H-rxM` };
	assert.equal((await customerOrders.registerLocation(customerAuth, mixed, randomUUID())).id, registered[0].id);
	assert.equal(
		(
			await customerOrders.registerLocation(
				customerAuth,
				{ ...registration, mapsUrl: "https://www.google.com/maps?query_place_id=ChIJ0wOlGBpF0i0Rkf6i93H-rxM" },
				randomUUID(),
			)
		).id,
		registered[0].id,
	);
	await assert.rejects(
		customerOrders.registerLocation(
			customerAuth,
			{
				...registration,
				mapsUrl: "https://www.google.com/maps?cid=987654321&query_place_id=ChIJ0wOlGBpF0i0Rkf6i93H-rxM",
			},
			randomUUID(),
		),
		/IDENTITY_CONFLICT/,
	);
	await assert.rejects(
		customerOrders.registerLocation(customerAuth, { ...registration, latitude: -8.7 }, randomUUID()),
		/DETAILS_CONFLICT/,
	);
	assert.equal((await customerOrders.locations(customerAuth)).filter((row) => row.id === registered[0].id).length, 1);
	await assert.rejects(
		customerOrders.registerLocation({ ...customerAuth, actorId: randomUUID() }, registration, registrationKey),
	);
	console.log(
		"PASS new restaurant registration: user-confirmed Maps link, atomic project/entity/location, parallel replay and stable-reference reuse, member denial; no provider lookup",
	);
	const customerOrderRequest = {
		projectId: orderFixture.project,
		locationId: locationRow.id,
		queries: ["Fixture dinner", "Fixture Greek restaurant"],
		language: "en",
		gridSize: 3 as const,
	};
	const orderKey = randomUUID();
	const createdOrders = await Promise.all([
		customerOrders.create(customerAuth, customerOrderRequest, orderKey),
		customerOrders.create(customerAuth, customerOrderRequest, orderKey),
	]);
	assert.equal(createdOrders[0].id, createdOrders[1].id);
	assert.equal(createdOrders[0].snapshot.offer.priceAmount, "49.00");
	assert.equal(createdOrders[0].snapshot.expectedSlots, 18);
	assert.equal(createdOrders[0].externalProviderCalls, 0);
	await assert.rejects(customerOrders.create(customerAuth, { ...customerOrderRequest, language: "ru" }, orderKey));
	await assert.rejects(
		customerOrders.create({ ...customerAuth, actorId: randomUUID() }, customerOrderRequest, orderKey),
	);
	const storedOrder = (
		await admin.query(
			"select o.id,q.price_amount,q.currency,q.expected_runs,l.snapshot from sv_orders o join sv_quotes q on q.id=o.quote_id join sv_configuration_locks l on l.id=o.lock_id where o.id=$1",
			[createdOrders[0].id],
		)
	).rows[0];
	assert.equal(storedOrder.price_amount, "49.00");
	assert.equal(storedOrder.expected_runs, 18);
	assert.equal(storedOrder.snapshot.domainId, "LOCAL_MAPS_ORDER");
	const paymentInput = {
		tenantId: orderFixture.org,
		orderId: createdOrders[0].id,
		providerEventId: randomUUID(),
		amount: 49,
		currency: "USD",
	};
	const paymentOptions = { database: db, writesAllowed: true, localSnapshotSha256: createdOrders[0].snapshotSha256 };
	await assert.rejects(recordSelenaTestPayment(paymentInput, { ...paymentOptions, localSnapshotSha256: "wrong" }));
	const payments = await Promise.all([
		recordSelenaTestPayment(paymentInput, paymentOptions),
		recordSelenaTestPayment(paymentInput, paymentOptions),
	]);
	assert.equal(payments[0].id, payments[1].id);
	assert.equal(payments.filter((p) => p.duplicate).length, 1);
	await assert.rejects(recordSelenaTestPayment({ ...paymentInput, providerEventId: randomUUID() }, paymentOptions));
	assert.equal(
		(await admin.query("select status from sv_orders where id=$1", [createdOrders[0].id])).rows[0].status,
		"PAID_REVIEW_REQUIRED",
	);
	console.log(
		"PASS Local test payment: exact USD49/order/snapshot, concurrent event replay, second-event rejection, no dispatch",
	);
	console.log(
		"PASS Local customer order: real transaction/lock/quote/order, USD49,18 slots, concurrent replay, changed-body and membership rejection; provider calls=0",
	);
	const orderApi = createLocalCustomerApi({
		enabled: () => true,
		authenticate: async () => ({ ...customerAuth, role: "owner", permissions: [] }),
		create: (auth, input, key) => customerOrders.create(auth, input, key),
		read: (auth, id) => customerOrders.read(auth, id),
		locations: (auth) => customerOrders.locations(auth),
		pay: (auth, id, body) =>
			recordSelenaTestPayment(
				{
					tenantId: auth.tenantId,
					orderId: id,
					providerEventId: `local-test:${body.eventId}`,
					amount: 49,
					currency: "USD",
				},
				{ database: db, writesAllowed: true, requireLocalOrder: true, localSnapshotSha256: body.snapshotSha256 },
			),
	});
	const apiUrl = "https://local.test/api/v1/selena/local-orders/";
	const apiCreated = await orderApi.create(
		new Request(apiUrl, {
			method: "POST",
			headers: { Origin: "https://local.test", "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
			body: JSON.stringify({ ...customerOrderRequest, gridSize: 5 }),
		}),
	);
	assert.equal(apiCreated.status, 201);
	const apiOrder = await apiCreated.json();
	assert.equal(apiOrder.snapshot.expectedSlots, 50);
	await assert.rejects(
		startLocalCustomerTestRun(db, customerAuth, { orderId: apiOrder.id, snapshotSha256: apiOrder.snapshotSha256 }),
	);
	assert.equal((await orderApi.read(new Request(apiUrl), apiOrder.id)).status, 200);
	assert.equal((await orderApi.locations(new Request(apiUrl))).status, 200);
	const apiPayment = await orderApi.pay(
		new Request(apiUrl, {
			method: "POST",
			headers: { Origin: "https://local.test", "Content-Type": "application/json" },
			body: JSON.stringify({ eventId: randomUUID(), snapshotSha256: apiOrder.snapshotSha256 }),
		}),
		apiOrder.id,
	);
	assert.equal(apiPayment.status, 201);
	assert.equal((await (await orderApi.read(new Request(apiUrl), apiOrder.id)).json()).status, "PAID_REVIEW_REQUIRED");
	const started = await Promise.all([
		startLocalCustomerTestRun(db, customerAuth, { orderId: apiOrder.id, snapshotSha256: apiOrder.snapshotSha256 }),
		startLocalCustomerTestRun(db, customerAuth, { orderId: apiOrder.id, snapshotSha256: apiOrder.snapshotSha256 }),
	]);
	assert.equal(started.filter((r) => r.duplicate).length, 1);
	assert.equal(await processLocalCustomerFixtureQuery(db), 25);
	const progress = await customerOrders.read(customerAuth, apiOrder.id);
	assert.equal(progress?.execution?.completed, 25);
	assert.equal(progress?.execution?.status, "RUNNING");
	const advanced = await Promise.all([processLocalCustomerFixtureQuery(db), processLocalCustomerFixtureQuery(db)]);
	assert.equal(
		advanced.reduce((n, v) => n + v, 0),
		25,
	);
	const readyOrder = await customerOrders.read(customerAuth, apiOrder.id);
	assert.equal(readyOrder?.status, "READY");
	assert.equal(
		(await customerOrders.history(customerAuth)).some((item) => item.id === apiOrder.id && item.status === "READY"),
		true,
	);
	assert.equal(readyOrder?.execution?.completed, 50);
	assert.equal(
		readyOrder?.execution?.tasks.every(
			(task) => task.result?.source === "FIXTURE_NOT_GOOGLE" && task.result.externalProviderCalls === 0,
		),
		true,
	);
	assert.equal(await processLocalCustomerFixtureQuery(db), 0);
	await assert.rejects(
		admin.query("update sv_local_customer_tasks set result_json='{}' where order_id=$1", [apiOrder.id]),
		/IMMUTABLE/,
	);

	const publications = createUniversalPublicationStore(db);
	const publicationAuth = { ...customerAuth, role: "owner" as const, permissions: ["client:read", "client:write"] };
	const versions = await Promise.all([
		publications.publish(publicationAuth, apiOrder.id, false),
		publications.publish(publicationAuth, apiOrder.id, false),
	]);
	assert.equal(versions[0].id, versions[1].id);
	const saved = await publications.read(publicationAuth, versions[0].id);
	assert(saved);
	assert.equal(saved.report.observations.length, 50);
	assert.equal(saved.report.analysis.status, "PENDING");
	const otherFixture = await seed();
	const otherAuth = {
		tenantId: otherFixture.org,
		actorId: otherFixture.actor,
		authType: "session" as const,
		role: "owner" as const,
		permissions: [],
	};
	assert.equal(await publications.read(otherAuth, versions[0].id), null);
	await assert.rejects(publications.publish(otherAuth, apiOrder.id, false));
	await assert.rejects(publications.review(publicationAuth, versions[0].id, `sha256:${"0".repeat(64)}`, []));
	for (const status of ["CANCELLED", "REFUND_REVIEW"]) {
		await admin.query("update sv_orders set status=$2 where id=$1", [apiOrder.id, status]);
		await assert.rejects(publications.publish(publicationAuth, apiOrder.id, false));
		await assert.rejects(publications.review(publicationAuth, versions[0].id, versions[0].contentSha256, []));
	}
	await admin.query("update sv_orders set status='READY' where id=$1", [apiOrder.id]);
	const reviewed = await publications.review(publicationAuth, versions[0].id, versions[0].contentSha256, []);
	const afterReview = await publications.read(publicationAuth, reviewed.id);
	assert(afterReview);
	assert.equal(afterReview.version, 2);
	assert.equal(afterReview.report.analysis.status, "REVIEWED");
	assert.equal((await publications.read(publicationAuth, versions[0].id))?.report.analysis.status, "PENDING");
	await publications.revoke(publicationAuth, reviewed.id);
	assert.equal(await publications.read(publicationAuth, reviewed.id), null);
	await assert.rejects(publications.publish(publicationAuth, apiOrder.id, false));
	assert.equal((await publications.history(publicationAuth, apiOrder.id)).length, 2);
	console.log(
		"PASS universal persisted publication:50slots,concurrent replay,tenant denial,immutable analysis versions,revocation",
	);
	for (const [queries, size] of [
		[1, 3],
		[4, 3],
		[15, 5],
	] as const) {
		const request = {
			...customerOrderRequest,
			queries: Array.from({ length: queries }, (_, i) => `Universal fixture query ${i}`),
			gridSize: size,
		};
		const order = await customerOrders.create(customerAuth, request, randomUUID());
		await assert.rejects(publications.publish(publicationAuth, order.id, false));
		await recordSelenaTestPayment(
			{
				tenantId: customerAuth.tenantId,
				orderId: order.id,
				providerEventId: randomUUID(),
				amount: 49,
				currency: "USD",
			},
			{ database: db, writesAllowed: true, requireLocalOrder: true, localSnapshotSha256: order.snapshotSha256 },
		);
		await startLocalCustomerTestRun(db, customerAuth, { orderId: order.id, snapshotSha256: order.snapshotSha256 });
		for (let i = 0; i < queries; i++) assert.equal(await processLocalCustomerFixtureQuery(db), size * size);
		const published = await publications.publish(publicationAuth, order.id, false);
		const loaded = await publications.read(publicationAuth, published.id);
		assert(loaded);
		const view = buildUniversalReportView(loaded.report, {
			organizationId: customerAuth.tenantId,
			projectId: loaded.report.projectId,
		});
		assert.equal(view.valid, queries * size * size);
		assert.equal(universalReportCsv(view).split("\r\n").length, 1 + queries * size * size);
		const handler = createUniversalReportHandler({
			authenticate: async () => ({
				authType: "session",
				organizationId: publicationAuth.tenantId,
				projectId: loaded.report.projectId,
			}),
			loadPublication: async () => (await publications.read(publicationAuth, published.id))?.report ?? null,
		});
		assert.equal((await handler(new Request("https://example.test/report"), published.id)).status, 200);
		await publications.revoke(publicationAuth, published.id);
		assert.equal((await handler(new Request("https://example.test/report?format=csv"), published.id)).status, 404);
		console.log(
			`PASS universal order-to-publication ${queries}x${size * size}:exact slots,CSV,authenticated renderer,revoked download denial`,
		);
	}
	console.log(
		"PASS durable fixture execution: unpaid rejection, concurrent start,25/50 progress, competing workers, immutable50 results and no replay/provider calls",
	);
	console.log(
		"PASS actual Local customer HTTP handlers -> PostgreSQL: 5x5/two queries, options/order read, snapshot-bound test payment; fixture auth seam, external0",
	);
	const recoveryOrder = await customerOrders.create(customerAuth, customerOrderRequest, randomUUID());
	await recordSelenaTestPayment(
		{
			tenantId: customerAuth.tenantId,
			orderId: recoveryOrder.id,
			providerEventId: randomUUID(),
			amount: 49,
			currency: "USD",
		},
		{ database: db, writesAllowed: true, requireLocalOrder: true, localSnapshotSha256: recoveryOrder.snapshotSha256 },
	);
	await startLocalCustomerTestRun(db, customerAuth, {
		orderId: recoveryOrder.id,
		snapshotSha256: recoveryOrder.snapshotSha256,
	});
	assert.equal(await processLocalCustomerFixtureQuery(db), 9);
	await admin.query(`create function proof_fail_fixture_query() returns trigger language plpgsql as $$ begin raise exception 'PROOF_QUERY_FAILURE'; end; $$;
	 create trigger aaa_proof_query_failure before update on sv_local_customer_tasks for each row execute function proof_fail_fixture_query();`);
	assert.equal(await processLocalCustomerFixtureQuery(db), -1);
	await assert.rejects(publications.publish(publicationAuth, recoveryOrder.id, false));
	const partial = await publications.publish(publicationAuth, recoveryOrder.id, true);
	const partialRead = await publications.read(publicationAuth, partial.id);
	assert(partialRead);
	const partialView = buildUniversalReportView(partialRead.report, {
		organizationId: customerAuth.tenantId,
		projectId: partialRead.report.projectId,
	});
	assert.equal(partialView.valid, 9);
	assert.equal(partialView.unresolved, 9);

	const failedRun = await customerOrders.read(customerAuth, recoveryOrder.id);
	assert.equal(failedRun?.execution?.status, "FAILED");
	assert.equal(failedRun?.execution?.completed, 9);
	await admin.query(
		"create or replace function proof_fail_fixture_query() returns trigger language plpgsql as $$ begin perform pg_sleep(0.2); return NEW; end; $$",
	);
	await startLocalCustomerTestRun(db, customerAuth, {
		orderId: recoveryOrder.id,
		snapshotSha256: recoveryOrder.snapshotSha256,
		retry: true,
	});
	const timedOut = await txFor(customerAuth.tenantId, async (tx) => {
		await tx.execute(sql`set local statement_timeout='30ms'`);
		return (await tx.execute<{ processed: number }>(sql`select sv_process_local_customer_fixture_query() as processed`))
			.rows[0].processed;
	});
	assert.equal(timedOut, -1);
	assert.equal((await customerOrders.read(customerAuth, recoveryOrder.id))?.execution?.failures, 2);
	assert.equal((await customerOrders.read(customerAuth, recoveryOrder.id))?.execution?.completed, 9);
	await admin.query(
		"drop trigger aaa_proof_query_failure on sv_local_customer_tasks; drop function proof_fail_fixture_query()",
	);
	await startLocalCustomerTestRun(db, customerAuth, {
		orderId: recoveryOrder.id,
		snapshotSha256: recoveryOrder.snapshotSha256,
		retry: true,
	});
	assert.equal(await processLocalCustomerFixtureQuery(db), 9);
	const fullPublication = await publications.publish(publicationAuth, recoveryOrder.id, false);
	const fullReport = await publications.read(publicationAuth, fullPublication.id);
	assert(fullReport);
	assert.equal(fullReport.version, 2);
	assert.equal(
		buildUniversalReportView(fullReport.report, {
			organizationId: customerAuth.tenantId,
			projectId: fullReport.report.projectId,
		}).valid,
		18,
	);
	const retainedPartial = await publications.read(publicationAuth, partial.id);
	assert(retainedPartial);
	assert.equal(
		buildUniversalReportView(retainedPartial.report, {
			organizationId: customerAuth.tenantId,
			projectId: retainedPartial.report.projectId,
		}).valid,
		9,
	);
	await assert.rejects(
		admin.query("update sv_local_order_publications set bundle_json='{}' where id=$1", [partial.id]),
		/IMMUTABLE/,
	);
	console.log("PASS partial9/18 publication preserved after full18/18 version; evenowner cannot alter savedbundle");

	assert.equal((await customerOrders.read(customerAuth, recoveryOrder.id))?.execution?.completed, 18);
	const exhausted = await customerOrders.create(customerAuth, customerOrderRequest, randomUUID());
	await recordSelenaTestPayment(
		{
			tenantId: customerAuth.tenantId,
			orderId: exhausted.id,
			providerEventId: randomUUID(),
			amount: 49,
			currency: "USD",
		},
		{ database: db, writesAllowed: true, requireLocalOrder: true, localSnapshotSha256: exhausted.snapshotSha256 },
	);
	const exhaustedInput = { orderId: exhausted.id, snapshotSha256: exhausted.snapshotSha256 };
	await startLocalCustomerTestRun(db, customerAuth, exhaustedInput);
	await admin.query(
		"create function proof_exhaust_fixture() returns trigger language plpgsql as $$ begin raise exception 'PROOF_FAILURE'; end; $$; create trigger aaa_proof_exhaust before update on sv_local_customer_tasks for each row execute function proof_exhaust_fixture()",
	);
	for (let attempt = 1; attempt <= 3; attempt++) {
		assert.equal(await processLocalCustomerFixtureQuery(db), -1);
		if (attempt < 3) await startLocalCustomerTestRun(db, customerAuth, { ...exhaustedInput, retry: true });
	}
	await assert.rejects(startLocalCustomerTestRun(db, customerAuth, { ...exhaustedInput, retry: true }));
	assert.equal((await customerOrders.read(customerAuth, exhausted.id))?.execution?.failures, 3);
	await admin.query("drop trigger aaa_proof_exhaust on sv_local_customer_tasks;drop function proof_exhaust_fixture()");
	console.log(
		"PASS fixture retry ceiling: third failed query pauses permanently until operator review; no fourth retry",
	);
	console.log(
		"PASS fixture query failure rollback and explicit resume preserve nine completed points without repeat execution",
	);
}
main()
	.finally(async () => {
		await pool.end();
		await admin.end();
	})
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
