import { randomUUID } from "node:crypto";
import { type AttemptDisposition, measurementExecutionKey } from "@workspace/selena-visibility-contracts";
import { and, eq, sql } from "drizzle-orm";
import type { OrganizationTransaction } from "./db/organization-transaction";
import * as schema from "./db/schema";
import { validateLocalPilotLock } from "./selena-local-pilot-orchestrator";
import { LOCAL_MAPS_SPEND_SCOPE, releaseProviderSpend, reserveProviderSpend } from "./selena-provider-spend";

type Attempt = typeof schema.svMeasurementAttempts.$inferSelect;
export async function planNextLocalMapsAttemptInTransaction(
	tx: OrganizationTransaction,
	currentAttempt: Attempt,
	disposition: AttemptDisposition,
): Promise<"CREATED" | "NOT_RETRYABLE" | "BUDGET_BLOCKED"> {
	if (
		!disposition.retryAllowed ||
		currentAttempt.status !== "RETRYABLE_FAILURE" ||
		currentAttempt.attemptIndex >= 3 ||
		!currentAttempt.localObservationId ||
		currentAttempt.budgetState === "RESERVED"
	)
		return "NOT_RETRYABLE";
	const [cycle] = await tx
		.select()
		.from(schema.svLocalScanCycles)
		.where(
			and(
				eq(schema.svLocalScanCycles.measurementCycleId, currentAttempt.measurementCycleId),
				eq(schema.svLocalScanCycles.organizationId, currentAttempt.organizationId),
			),
		)
		.for("update");
	if (cycle?.executionMode !== "PILOT" || cycle.emergencyStoppedAt || !["RUNNING", "QUEUED"].includes(cycle.status))
		return "NOT_RETRYABLE";
	const [lockRow] = await tx
		.select()
		.from(schema.svConfigurationLocks)
		.where(
			and(
				eq(schema.svConfigurationLocks.id, cycle.configurationLockId),
				eq(schema.svConfigurationLocks.organizationId, cycle.organizationId),
			),
		);
	const lock = validateLocalPilotLock(lockRow?.snapshot);
	const index = (currentAttempt.attemptIndex + 1) as 2 | 3;
	const executionKey = measurementExecutionKey(currentAttempt.baseSlotKey, index);
	const [existing] = await tx
		.select({ id: schema.svMeasurementAttempts.id })
		.from(schema.svMeasurementAttempts)
		.where(
			and(
				eq(schema.svMeasurementAttempts.organizationId, cycle.organizationId),
				eq(schema.svMeasurementAttempts.executionKey, executionKey),
			),
		);
	if (existing) return "NOT_RETRYABLE";
	const receipt = await reserveProviderSpend(tx, {
		scope: LOCAL_MAPS_SPEND_SCOPE,
		organizationId: cycle.organizationId,
		requestKey: executionKey,
		estimatedUsd: lock.pilot.perAttemptWorstCaseUsd,
	});
	if (!receipt.reservationId || receipt.status !== "RESERVED") {
		await tx
			.update(schema.svLocalScanCycles)
			.set({ status: "BUDGET_BLOCKED", emergencyStoppedAt: sql`now()` })
			.where(eq(schema.svLocalScanCycles.id, cycle.id));
		await cancelLocalPendingInTransaction(tx, cycle.organizationId, cycle.id);
		return "BUDGET_BLOCKED";
	}
	const id = randomUUID();
	await tx.insert(schema.svMeasurementAttempts).values({
		id,
		organizationId: cycle.organizationId,
		measurementCycleId: cycle.measurementCycleId,
		reservationId: receipt.reservationId,
		domainId: "LOCAL_MAPS",
		observationRef: currentAttempt.observationRef,
		localObservationId: currentAttempt.localObservationId,
		pointId: currentAttempt.pointId,
		itemId: currentAttempt.itemId,
		executorId: currentAttempt.executorId,
		repeatIndex: currentAttempt.repeatIndex,
		baseSlotKey: currentAttempt.baseSlotKey,
		attemptIndex: index,
		executionKey,
		reservedCostUsd: lock.pilot.perAttemptWorstCaseUsd,
		surfaceCapUsd: lock.budget.surfaceCapUsd,
		monthlyCapUsd: lock.budget.monthlyCapUsd,
		priceSnapshotVersion: lock.budget.priceSnapshotVersion,
		claimedAt: sql`date_trunc('milliseconds',now())`,
		leaseExpiresAt: sql`date_trunc('milliseconds',now())+${lock.pilot.leaseDurationMs}*interval '1 millisecond'`,
	});
	await tx.insert(schema.svLocalDispatchOutbox).values({
		organizationId: cycle.organizationId,
		localCycleId: cycle.id,
		measurementCycleId: cycle.measurementCycleId,
		observationId: currentAttempt.localObservationId,
		attemptId: id,
	});
	return "CREATED";
}

/** Cancel only work whose provider boundary was never crossed. */
export async function cancelLocalPendingInTransaction(
	tx: OrganizationTransaction,
	organizationId: string,
	cycleId: string,
): Promise<void> {
	const [cycle] = await tx
		.select()
		.from(schema.svLocalScanCycles)
		.where(and(eq(schema.svLocalScanCycles.id, cycleId), eq(schema.svLocalScanCycles.organizationId, organizationId)))
		.for("update");
	if (!cycle) throw new Error("LOCAL_CYCLE_NOT_FOUND");
	const attempts = await tx
		.select()
		.from(schema.svMeasurementAttempts)
		.where(
			and(
				eq(schema.svMeasurementAttempts.organizationId, organizationId),
				eq(schema.svMeasurementAttempts.measurementCycleId, cycle.measurementCycleId),
				eq(schema.svMeasurementAttempts.status, "CLAIMED"),
			),
		)
		.for("update");
	for (const attempt of attempts) {
		const receipt = await releaseProviderSpend(tx, {
			scope: LOCAL_MAPS_SPEND_SCOPE,
			organizationId,
			requestKey: attempt.executionKey,
		});
		if (receipt.reservationId !== attempt.reservationId || receipt.decision !== "RELEASED")
			throw new Error("LOCAL_CANCEL_RESERVATION_MISMATCH");
		await tx
			.update(schema.svMeasurementAttempts)
			.set({
				status: "CANCELLED_NO_CALL",
				budgetState: "RELEASED",
				releasedCostUsd: attempt.reservedCostUsd,
				completedAt: sql`now()`,
			})
			.where(
				and(
					eq(schema.svMeasurementAttempts.organizationId, organizationId),
					eq(schema.svMeasurementAttempts.id, attempt.id),
				),
			);
		await tx
			.update(schema.svLocalDispatchOutbox)
			.set({ status: "CANCELLED", claimToken: null, leaseExpiresAt: null })
			.where(
				and(
					eq(schema.svLocalDispatchOutbox.organizationId, organizationId),
					eq(schema.svLocalDispatchOutbox.attemptId, attempt.id),
				),
			);
	}
	await tx.execute(sql`update sv_local_rank_observations o set outcome='CANCELLED',validity='UNMEASURED',invalid_reason='LOCAL_STOPPED',updated_at=now()
		where o.organization_id=${organizationId} and o.cycle_id=${cycleId}::uuid and o.outcome='PENDING'
		and not exists(select 1 from sv_measurement_attempts a where a.organization_id=o.organization_id and a.local_observation_id=o.id and a.status in ('SUBMITTED','UNKNOWN_RECONCILIATION'))`);
}
