import { createHash, randomUUID } from "node:crypto";
import {
	canonicalLocalMapsJson,
	type LocalApiIdempotencyIdentity,
	localApiIdempotencyIdentitySchema,
	localProviderContractDigest,
	localProviderContractSchema,
	type MapsLockV1,
	mapsLockV1Schema,
	planMapsLockSlots,
} from "@workspace/selena-visibility-contracts";
import { and, eq, sql } from "drizzle-orm";
import {
	type OrganizationDatabase,
	type OrganizationTransaction,
	withOrganizationTransaction,
} from "./db/organization-transaction";
import * as schema from "./db/schema";
import { assertLocalProviderExecutionEnabled } from "./selena-local-execution";
import { assertProviderSpendReserved, LOCAL_MAPS_SPEND_SCOPE } from "./selena-provider-spend";

export function validateLocalPilotLock(value: unknown): MapsLockV1 & { pilot: NonNullable<MapsLockV1["pilot"]> } {
	const lock = mapsLockV1Schema.parse(value);
	if (
		!lock.pilot ||
		lock.grid.size !== 3 ||
		lock.grid.radiusMeters !== 3000 ||
		lock.repeats !== 1 ||
		lock.expectedSlots !== 9 ||
		lock.keywordSet.keywords?.length !== 1 ||
		lock.request.os !== "android" ||
		lock.request.zoom !== 13 ||
		lock.targetIdentity.matchPolicy !== "PLACE_ID_OR_CID" ||
		lock.targetIdentity.identitySource !== "USER_CONFIRMED"
	)
		throw new Error("LOCAL_PILOT_LOCK_INVALID");
	const digest = localProviderContractDigest(
		localProviderContractSchema.parse({
			schemaVersion: 1,
			provider: lock.provider,
			capability: {
				coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED",
				rawEvidenceReference: "REQUIRED",
				supportsAbsentWithinDepth: true,
				maxDepth: 20,
			},
			requestProtocol: lock.request,
			price: {
				billingUnit: lock.pilot.billingUnit,
				currency: "USD",
				perAttemptWorstCaseUsd: lock.pilot.perAttemptWorstCaseUsd,
				priceSnapshotVersion: lock.budget.priceSnapshotVersion,
			},
		}),
	);
	if (digest !== lock.pilot.providerContractDigest) throw new Error("LOCAL_PROVIDER_CONTRACT_DIGEST_MISMATCH");
	return { ...lock, pilot: lock.pilot };
}

export async function requireLocalOperator(
	tx: OrganizationTransaction,
	organizationId: string,
	actorId: string,
): Promise<void> {
	const [membership] = await tx
		.select({ role: schema.member.role })
		.from(schema.member)
		.where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, actorId)))
		.limit(1);
	if (!membership || !["owner", "admin"].includes(membership.role))
		throw new Error("LOCAL_OPERATOR_MEMBERSHIP_REQUIRED");
	await tx.execute(sql`select set_config('app.user_id', ${actorId}, true)`);
}

/** Response receipt and all domain writes share this transaction; no nested pool writes. */
export async function withLocalPilotMutation<T>(input: {
	db: OrganizationDatabase;
	identity: LocalApiIdempotencyIdentity;
	actorId: string;
	work: (tx: OrganizationTransaction) => Promise<T>;
}): Promise<T> {
	const identity = localApiIdempotencyIdentitySchema.parse(input.identity);
	return withOrganizationTransaction(input.db, identity.tenantId, async (tx) => {
		await requireLocalOperator(tx, identity.tenantId, input.actorId);
		const key = canonicalLocalMapsJson([
			identity.tenantId,
			identity.operation,
			identity.resourceId,
			identity.idempotencyKey,
		]);
		await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
		const where = and(
			eq(schema.svApiIdempotencyRecords.organizationId, identity.tenantId),
			eq(schema.svApiIdempotencyRecords.operation, identity.operation),
			eq(schema.svApiIdempotencyRecords.resourceId, identity.resourceId),
			eq(schema.svApiIdempotencyRecords.idempotencyKey, identity.idempotencyKey),
		);
		const [prior] = await tx.select().from(schema.svApiIdempotencyRecords).where(where).limit(1);
		if (prior) {
			if (prior.bodyHash !== identity.bodyHash) throw new Error("IDEMPOTENCY_BODY_CONFLICT");
			return prior.responseBody as T;
		}
		const body = await input.work(tx);
		await tx.insert(schema.svApiIdempotencyRecords).values({
			organizationId: identity.tenantId,
			operation: identity.operation,
			resourceId: identity.resourceId,
			idempotencyKey: identity.idempotencyKey,
			bodyHash: identity.bodyHash,
			responseStatus: 200,
			responseBody: body,
			expiresAt: sql`now() + interval '7 days'`,
		});
		return body;
	});
}

/** The only matrix materializer. Canary reserves the center; pilot reserves all nine. */
export async function materializeLocalPilotInTransaction(input: {
	tx: OrganizationTransaction;
	organizationId: string;
	localCycleId: string;
	env: Record<string, string | undefined>;
}): Promise<{ observations: number; attempts: number; outbox: number }> {
	assertLocalProviderExecutionEnabled(input.env);
	const { tx, organizationId, localCycleId } = input;
	const [cycle] = await tx
		.select()
		.from(schema.svLocalScanCycles)
		.where(
			and(eq(schema.svLocalScanCycles.organizationId, organizationId), eq(schema.svLocalScanCycles.id, localCycleId)),
		)
		.for("update");
	if (cycle?.status !== "APPROVED" || cycle.emergencyStoppedAt || !["CANARY", "PILOT"].includes(cycle.executionMode))
		throw new Error("LOCAL_PILOT_NOT_APPROVED");
	const [lockRow] = await tx
		.select()
		.from(schema.svConfigurationLocks)
		.where(
			and(
				eq(schema.svConfigurationLocks.organizationId, organizationId),
				eq(schema.svConfigurationLocks.id, cycle.configurationLockId),
			),
		);
	const lock = validateLocalPilotLock(lockRow?.snapshot);
	if (cycle.providerContractDigest !== lock.pilot.providerContractDigest || cycle.locationId !== lock.locationId)
		throw new Error("LOCAL_CYCLE_LOCK_MISMATCH");
	const clock = await tx.execute(sql`select now() as utc_now`);
	const now = new Date((clock.rows[0] as { utc_now: Date }).utc_now);
	if (now < new Date(lock.timestampWindow.startsAt) || now >= new Date(lock.timestampWindow.endsAt))
		throw new Error("LOCAL_WINDOW_CLOSED");
	const slots = planMapsLockSlots(cycle.measurementCycleId, lock);
	let attemptCount = 0;
	for (const slot of slots) {
		const observationId = randomUUID();
		await tx.insert(schema.svLocalRankObservations).values({
			id: observationId,
			organizationId,
			cycleId: cycle.id,
			locationId: cycle.locationId,
			keywordId: slot.keywordId,
			gridDefinitionId: cycle.gridDefinitionId,
			gridPointId: slot.pointId,
			provider: slot.providerId,
			repeatIndex: 0,
			captureDepth: 20,
			captureMode: "MOBILE",
			outcome: "PENDING",
			validity: null,
			capturedAt: null,
			targetRank: null,
			invalidReason: null,
		});
		if (cycle.executionMode === "CANARY" && slot.pointIndex !== 4) {
			await tx
				.update(schema.svLocalRankObservations)
				.set({ outcome: "BLOCKED", validity: "UNMEASURED", invalidReason: "CANARY_NOT_EXECUTED", updatedAt: now })
				.where(
					and(
						eq(schema.svLocalRankObservations.id, observationId),
						eq(schema.svLocalRankObservations.organizationId, organizationId),
					),
				);
			continue;
		}
		const receipt = await assertProviderSpendReserved(tx, {
			scope: LOCAL_MAPS_SPEND_SCOPE,
			organizationId,
			requestKey: slot.executionKey,
			estimatedUsd: lock.pilot.perAttemptWorstCaseUsd,
		});
		if (!receipt.reservationId || receipt.status !== "RESERVED") throw new Error("LOCAL_RESERVATION_ID_REQUIRED");
		const attemptId = randomUUID();
		await tx.insert(schema.svMeasurementAttempts).values({
			id: attemptId,
			organizationId,
			measurementCycleId: cycle.measurementCycleId,
			reservationId: receipt.reservationId,
			domainId: "LOCAL_MAPS",
			observationRef: observationId,
			localObservationId: observationId,
			pointId: slot.pointId,
			itemId: slot.keywordId,
			executorId: slot.providerId,
			repeatIndex: 0,
			baseSlotKey: slot.baseSlotKey,
			attemptIndex: 1,
			executionKey: slot.executionKey,
			reservedCostUsd: lock.pilot.perAttemptWorstCaseUsd,
			surfaceCapUsd: lock.budget.surfaceCapUsd,
			monthlyCapUsd: lock.budget.monthlyCapUsd,
			priceSnapshotVersion: lock.budget.priceSnapshotVersion,
			claimedAt: now,
			leaseExpiresAt: new Date(now.getTime() + lock.pilot.leaseDurationMs),
		});
		await tx.insert(schema.svLocalDispatchOutbox).values({
			organizationId,
			localCycleId: cycle.id,
			measurementCycleId: cycle.measurementCycleId,
			observationId,
			attemptId,
		});
		attemptCount++;
	}
	await tx
		.update(schema.svLocalScanCycles)
		.set({
			createdObservations: 9,
			status: cycle.executionMode === "CANARY" ? "CANARY_RUNNING" : "QUEUED",
			updatedAt: now,
		})
		.where(and(eq(schema.svLocalScanCycles.organizationId, organizationId), eq(schema.svLocalScanCycles.id, cycle.id)));
	return { observations: 9, attempts: attemptCount, outbox: attemptCount };
}

/**
 * Creates the operator-owned CANARY cycle used by the bounded one-shot
 * command.  Creation and materialisation share one transaction; the provider
 * is still reached only later by the isolated worker after outbox dispatch.
 */
export async function createLocalCanaryCycleInTransaction(input: {
	tx: OrganizationTransaction;
	organizationId: string;
	configurationLockId: string;
	gridDefinitionId: string;
	env: Record<string, string | undefined>;
}): Promise<{ cycleId: string; measurementCycleId: string; observations: number; attempts: number; outbox: number }> {
	assertLocalProviderExecutionEnabled(input.env);
	const { tx, organizationId } = input;
	const [lockRow] = await tx
		.select()
		.from(schema.svConfigurationLocks)
		.where(
			and(
				eq(schema.svConfigurationLocks.organizationId, organizationId),
				eq(schema.svConfigurationLocks.id, input.configurationLockId),
			),
		)
		.limit(1);
	if (!lockRow) throw new Error("LOCAL_LOCK_NOT_FOUND");
	const lock = validateLocalPilotLock(lockRow.snapshot);
	if (lock.grid.points.length !== 9) throw new Error("LOCAL_GRID_CARDINALITY_INVALID");
	const [grid] = await tx
		.select({
			id: schema.svGridDefinitions.id,
			locationId: schema.svGridDefinitions.locationId,
			pointCount: schema.svGridDefinitions.pointCount,
		})
		.from(schema.svGridDefinitions)
		.where(
			and(
				eq(schema.svGridDefinitions.organizationId, organizationId),
				eq(schema.svGridDefinitions.id, input.gridDefinitionId),
			),
		)
		.limit(1);
	if (!grid || grid.locationId !== lock.locationId || grid.pointCount !== 9)
		throw new Error("LOCAL_GRID_NOT_FOUND_OR_INVALID");
	const measurementCycleId = randomUUID();
	const cycleId = randomUUID();
	await tx.insert(schema.svMeasurementCycles).values({
		id: measurementCycleId,
		organizationId,
		domainId: "LOCAL_MAPS",
		domainCycleId: cycleId,
		configurationLockId: lockRow.id,
		status: "CREATED",
	});
	await tx.insert(schema.svLocalScanCycles).values({
		id: cycleId,
		organizationId,
		measurementCycleId,
		domainId: "LOCAL_MAPS",
		configurationLockId: lockRow.id,
		locationId: lock.locationId,
		gridDefinitionId: grid.id,
		provider: lock.provider.id,
		repeats: lock.repeats,
		captureDepth: lock.request.depth,
		expectedObservations: 9,
		createdObservations: 0,
		worstCaseCostUsd: lock.budget.worstCaseCostUsd,
		costSnapshot: lock,
		status: "CREATED",
		executionMode: "CANARY",
		providerContractDigest: lock.pilot.providerContractDigest,
	});
	await tx
		.update(schema.svLocalScanCycles)
		.set({ status: "APPROVED", updatedAt: new Date() })
		.where(and(eq(schema.svLocalScanCycles.id, cycleId), eq(schema.svLocalScanCycles.organizationId, organizationId)));
	const materialized = await materializeLocalPilotInTransaction({
		tx,
		organizationId,
		localCycleId: cycleId,
		env: input.env,
	});
	return { cycleId, measurementCycleId, ...materialized };
}

/** Create an immutable, separately executable PILOT cycle after an accepted canary. */
export async function createLocalPilotFromAcceptedCanaryInTransaction(input: {
	tx: OrganizationTransaction;
	organizationId: string;
	canaryCycleId: string;
	reviewId: string;
}): Promise<{ cycleId: string; measurementCycleId: string }> {
	const { tx, organizationId } = input;
	const [canary] = await tx
		.select()
		.from(schema.svLocalScanCycles)
		.where(
			and(
				eq(schema.svLocalScanCycles.id, input.canaryCycleId),
				eq(schema.svLocalScanCycles.organizationId, organizationId),
			),
		)
		.for("update");
	if (canary?.executionMode !== "CANARY" || canary.status !== "CANARY_REVIEW" || canary.emergencyStoppedAt)
		throw new Error("LOCAL_CANARY_REVIEW_STATE_INVALID");
	const [review] = await tx
		.select()
		.from(schema.svLocalCanaryReviews)
		.where(
			and(
				eq(schema.svLocalCanaryReviews.id, input.reviewId),
				eq(schema.svLocalCanaryReviews.organizationId, organizationId),
				eq(schema.svLocalCanaryReviews.localCycleId, canary.id),
			),
		)
		.for("update");
	if (review?.status !== "ACCEPTED" || review.providerContractDigest !== canary.providerContractDigest)
		throw new Error("LOCAL_ACCEPTED_CANARY_REQUIRED");
	const measurementCycleId = randomUUID();
	const cycleId = randomUUID();
	await tx.insert(schema.svMeasurementCycles).values({
		id: measurementCycleId,
		organizationId,
		domainId: "LOCAL_MAPS",
		domainCycleId: cycleId,
		configurationLockId: canary.configurationLockId,
		status: "CREATED",
	});
	await tx.insert(schema.svLocalScanCycles).values({
		id: cycleId,
		organizationId,
		measurementCycleId,
		domainId: "LOCAL_MAPS",
		configurationLockId: canary.configurationLockId,
		locationId: canary.locationId,
		gridDefinitionId: canary.gridDefinitionId,
		provider: canary.provider,
		repeats: canary.repeats,
		captureDepth: canary.captureDepth,
		expectedObservations: 9,
		createdObservations: 0,
		worstCaseCostUsd: canary.worstCaseCostUsd,
		costSnapshot: canary.costSnapshot,
		status: "CREATED",
		executionMode: "PILOT",
		approvedCanaryReviewId: review.id,
		providerContractDigest: canary.providerContractDigest,
	});
	return { cycleId, measurementCycleId };
}

/**
 * Replaces an unmaterialized PILOT with a new immutable lock and execution
 * window. The accepted canary and every prior lock/cycle remain unchanged.
 */
export async function rescheduleLocalPilotInTransaction(input: {
	tx: OrganizationTransaction;
	organizationId: string;
	pilotCycleId: string;
	reviewId: string;
	actorId: string;
	timestampWindow: MapsLockV1["timestampWindow"];
	engineSha: string;
}): Promise<{
	supersededPilotCycleId: string;
	cycleId: string;
	measurementCycleId: string;
	configurationLockId: string;
	lockVersion: number;
}> {
	const { tx, organizationId } = input;
	if (!/^[a-f0-9]{40}$/.test(input.engineSha)) throw new Error("LOCAL_ENGINE_SHA_INVALID");
	await requireLocalOperator(tx, organizationId, input.actorId);
	const [pilot] = await tx
		.select()
		.from(schema.svLocalScanCycles)
		.where(
			and(
				eq(schema.svLocalScanCycles.id, input.pilotCycleId),
				eq(schema.svLocalScanCycles.organizationId, organizationId),
			),
		)
		.for("update");
	if (
		pilot?.executionMode !== "PILOT" ||
		pilot.status !== "CREATED" ||
		pilot.createdObservations !== 0 ||
		pilot.emergencyStoppedAt ||
		pilot.approvedCanaryReviewId !== input.reviewId
	)
		throw new Error("LOCAL_PILOT_RESCHEDULE_STATE_INVALID");
	const [{ observationCount = 0 } = {}] = await tx
		.select({ observationCount: sql<number>`count(*)::int` })
		.from(schema.svLocalRankObservations)
		.where(
			and(
				eq(schema.svLocalRankObservations.organizationId, organizationId),
				eq(schema.svLocalRankObservations.cycleId, pilot.id),
			),
		);
	const [{ attemptCount = 0 } = {}] = await tx
		.select({ attemptCount: sql<number>`count(*)::int` })
		.from(schema.svMeasurementAttempts)
		.where(
			and(
				eq(schema.svMeasurementAttempts.organizationId, organizationId),
				eq(schema.svMeasurementAttempts.measurementCycleId, pilot.measurementCycleId),
			),
		);
	if (observationCount !== 0 || attemptCount !== 0) throw new Error("LOCAL_PILOT_ALREADY_MATERIALIZED");

	const [review] = await tx
		.select()
		.from(schema.svLocalCanaryReviews)
		.where(
			and(
				eq(schema.svLocalCanaryReviews.id, input.reviewId),
				eq(schema.svLocalCanaryReviews.organizationId, organizationId),
			),
		)
		.for("update");
	if (review?.status !== "ACCEPTED" || review.providerContractDigest !== pilot.providerContractDigest)
		throw new Error("LOCAL_ACCEPTED_CANARY_REQUIRED");
	const [canary] = await tx
		.select()
		.from(schema.svLocalScanCycles)
		.where(
			and(
				eq(schema.svLocalScanCycles.id, review.localCycleId),
				eq(schema.svLocalScanCycles.organizationId, organizationId),
			),
		)
		.for("update");
	if (
		canary?.executionMode !== "CANARY" ||
		canary.status !== "CANARY_REVIEW" ||
		canary.emergencyStoppedAt ||
		canary.providerContractDigest !== pilot.providerContractDigest ||
		canary.locationId !== pilot.locationId ||
		canary.gridDefinitionId !== pilot.gridDefinitionId
	)
		throw new Error("LOCAL_ACCEPTED_CANARY_REQUIRED");
	const [priorLockRow] = await tx
		.select()
		.from(schema.svConfigurationLocks)
		.where(
			and(
				eq(schema.svConfigurationLocks.id, pilot.configurationLockId),
				eq(schema.svConfigurationLocks.organizationId, organizationId),
			),
		)
		.limit(1);
	if (!priorLockRow) throw new Error("LOCAL_LOCK_NOT_FOUND");
	const priorLock = validateLocalPilotLock(priorLockRow.snapshot);
	if (
		priorLock.locationId !== pilot.locationId ||
		priorLock.grid.locationId !== pilot.locationId ||
		priorLock.pilot.providerContractDigest !== review.providerContractDigest
	)
		throw new Error("LOCAL_CYCLE_LOCK_MISMATCH");

	await tx.execute(
		sql`select pg_advisory_xact_lock(hashtextextended('selena-configuration-lock:' || ${priorLockRow.projectId}, 0))`,
	);
	const [latest] = await tx
		.select({ version: sql<number>`coalesce(max(${schema.svConfigurationLocks.version}), 0)::int` })
		.from(schema.svConfigurationLocks)
		.where(
			and(
				eq(schema.svConfigurationLocks.projectId, priorLockRow.projectId),
				eq(schema.svConfigurationLocks.organizationId, organizationId),
			),
		);
	const lockVersion = Number(latest?.version ?? 0) + 1;
	if (lockVersion > 2_147_483_647) throw new Error("SELENA_CONFIGURATION_LOCK_VERSION_EXHAUSTED");
	const lock = validateLocalPilotLock({
		...priorLock,
		lockVersion,
		timestampWindow: input.timestampWindow,
	});
	const clock = await tx.execute(sql`select now() as utc_now`);
	const now = new Date((clock.rows[0] as { utc_now: Date }).utc_now);
	if (new Date(lock.timestampWindow.endsAt) <= now) throw new Error("LOCAL_PILOT_WINDOW_CLOSED");
	const [configurationLock] = await tx
		.insert(schema.svConfigurationLocks)
		.values({
			organizationId,
			projectId: priorLockRow.projectId,
			version: lockVersion,
			legacyCollisionOrdinal: 0,
			snapshot: lock,
			engineSha: input.engineSha,
			expectedRuns: lock.expectedSlots,
			budgetCap: lock.budget.worstCaseCostUsd,
			createdBy: input.actorId,
		})
		.returning({ id: schema.svConfigurationLocks.id });
	if (!configurationLock) throw new Error("LOCAL_LOCK_INSERT_FAILED");

	await tx
		.update(schema.svLocalScanCycles)
		.set({ status: "STOPPED", updatedAt: now })
		.where(and(eq(schema.svLocalScanCycles.id, pilot.id), eq(schema.svLocalScanCycles.organizationId, organizationId)));
	await tx
		.update(schema.svMeasurementCycles)
		.set({ status: "STOPPED", updatedAt: now })
		.where(
			and(
				eq(schema.svMeasurementCycles.id, pilot.measurementCycleId),
				eq(schema.svMeasurementCycles.organizationId, organizationId),
			),
		);

	const measurementCycleId = randomUUID();
	const cycleId = randomUUID();
	await tx.insert(schema.svMeasurementCycles).values({
		id: measurementCycleId,
		organizationId,
		domainId: "LOCAL_MAPS",
		domainCycleId: cycleId,
		configurationLockId: configurationLock.id,
		status: "CREATED",
	});
	await tx.insert(schema.svLocalScanCycles).values({
		id: cycleId,
		organizationId,
		measurementCycleId,
		domainId: "LOCAL_MAPS",
		configurationLockId: configurationLock.id,
		locationId: pilot.locationId,
		gridDefinitionId: pilot.gridDefinitionId,
		provider: pilot.provider,
		repeats: pilot.repeats,
		captureDepth: pilot.captureDepth,
		expectedObservations: 9,
		createdObservations: 0,
		worstCaseCostUsd: lock.budget.worstCaseCostUsd,
		costSnapshot: lock,
		status: "CREATED",
		executionMode: "PILOT",
		approvedCanaryReviewId: review.id,
		providerContractDigest: review.providerContractDigest,
	});
	return {
		supersededPilotCycleId: pilot.id,
		cycleId,
		measurementCycleId,
		configurationLockId: configurationLock.id,
		lockVersion,
	};
}

export function localPilotBodyHash(value: unknown): string {
	return `sha256:${createHash("sha256").update(canonicalLocalMapsJson(value)).digest("hex")}`;
}

/** Shared by the HTTP review endpoint and the disposable runtime proof. */
export async function reviewLocalCanaryInTransaction(input: {
	tx: OrganizationTransaction;
	organizationId: string;
	cycleId: string;
	actorId: string;
	attemptId: string;
	evidenceId: string;
	decision: "PENDING" | "ACCEPTED" | "REJECTED";
}) {
	const { tx } = input;
	await requireLocalOperator(tx, input.organizationId, input.actorId);
	const [cycle] = await tx
		.select()
		.from(schema.svLocalScanCycles)
		.where(
			and(
				eq(schema.svLocalScanCycles.id, input.cycleId),
				eq(schema.svLocalScanCycles.organizationId, input.organizationId),
			),
		)
		.for("update");
	if (!cycle) throw new Error("LOCAL_CYCLE_NOT_FOUND");
	const body = input;
	if (cycle.executionMode !== "CANARY" || cycle.status !== "CANARY_REVIEW" || cycle.emergencyStoppedAt)
		throw new Error("LOCAL_CANARY_REVIEW_STATE_INVALID");
	const [attempt] = await tx
		.select()
		.from(schema.svMeasurementAttempts)
		.where(
			and(
				eq(schema.svMeasurementAttempts.id, body.attemptId),
				eq(schema.svMeasurementAttempts.organizationId, input.organizationId),
				eq(schema.svMeasurementAttempts.measurementCycleId, cycle.measurementCycleId),
			),
		)
		.limit(1);
	const [observation] = await tx
		.select({ id: schema.svLocalRankObservations.id, evidenceId: schema.svLocalRankObservations.evidenceId })
		.from(schema.svLocalRankObservations)
		.where(
			and(
				eq(schema.svLocalRankObservations.organizationId, input.organizationId),
				eq(schema.svLocalRankObservations.cycleId, cycle.id),
				eq(schema.svLocalRankObservations.id, attempt?.localObservationId ?? "00000000-0000-0000-0000-000000000000"),
			),
		)
		.limit(1);
	const [canarySource] = await tx
		.select({ id: schema.svSourceSnapshots.id })
		.from(schema.svSourceSnapshots)
		.where(
			and(
				eq(schema.svSourceSnapshots.id, body.evidenceId),
				eq(schema.svSourceSnapshots.organizationId, input.organizationId),
				eq(schema.svSourceSnapshots.sourceType, "LOCAL_MAPS_CANARY_ONLY"),
			),
		)
		.limit(1);
	if (
		attempt?.status !== "SUCCEEDED" ||
		!observation ||
		!canarySource ||
		observation.evidenceId === body.evidenceId ||
		attempt.localObservationId !== observation.id
	)
		throw new Error("LOCAL_CANARY_REVIEW_EVIDENCE_INVALID");
	// The insert guard verifies private source provenance against the attempt;
	// runtime SELECT privileges intentionally exclude those source columns.
	const [review] = await tx
		.insert(schema.svLocalCanaryReviews)
		.values({
			organizationId: input.organizationId,
			localCycleId: cycle.id,
			attemptId: attempt.id,
			evidenceId: body.evidenceId,
			actualCostUsd: attempt.spentCostUsd,
			providerContractDigest: cycle.providerContractDigest ?? "",
			status: body.decision,
			actor: input.actorId,
		})
		.returning({ id: schema.svLocalCanaryReviews.id });
	if (!review) throw new Error("LOCAL_CANARY_REVIEW_INSERT_FAILED");
	if (body.decision === "ACCEPTED") {
		const pilot = await createLocalPilotFromAcceptedCanaryInTransaction({
			tx,
			organizationId: input.organizationId,
			canaryCycleId: cycle.id,
			reviewId: review.id,
		});
		return {
			operation: "canary-review",
			cycleId: cycle.id,
			reviewId: review.id,
			status: body.decision,
			pilotCycleId: pilot.cycleId,
			pilotMeasurementCycleId: pilot.measurementCycleId,
		};
	}
	return { operation: "canary-review", cycleId: cycle.id, reviewId: review.id, status: body.decision };
}
