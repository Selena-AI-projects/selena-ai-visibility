import { createHash, randomBytes } from "node:crypto";
import {
	assertLocalMapsLiveResultMatchesCandidate,
	attemptDisposition,
	canonicalLocalMapsLockSnapshot,
	canonicalLocalMapsProviderRequest,
	canonicalLocalMapsProviderResult,
	canonicalLocalMapsSubmittedCandidate,
	type LocalMapsLiveKeyword,
	type LocalMapsLiveProviderResult,
	type LocalMapsLiveSubmittedCandidate,
	localMapsLiveKeywordSchema,
	localMapsLiveProviderResultSchema,
	localMapsLiveSubmittedCandidateSchema,
	type MapsLockSlotPlan,
	type MapsLockV1,
	mapsLockSlotPlanSchema,
	mapsLockV1Schema,
	materializeLocalMapsProviderRequest,
} from "@workspace/selena-visibility-contracts";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";
import type {
	LocalMapsAcquireDecision,
	LocalMapsLiveAttemptStore,
	LocalMapsLiveDispatchIntent,
	LocalMapsUnknownReason,
} from "./selena-local-maps-live-runner";

type Db = NodePgDatabase<typeof schema>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type AttemptRow = typeof schema.svMeasurementAttempts.$inferSelect;
export type LocalMapsCandidateAttemptRow = Omit<AttemptRow, "submittedAt" | "leaseExpiresAt"> & {
	submittedAt: Date;
	leaseExpiresAt: Date;
};
type CandidateAttemptRow = LocalMapsCandidateAttemptRow;

export type LocalMapsAttemptSourceSnapshot = {
	attempt: CandidateAttemptRow;
	measurementCycle: {
		id: string;
		organizationId: string;
		domainId: string;
		configurationLockId: string;
	};
	localCycle: {
		id: string;
		organizationId: string;
		measurementCycleId: string;
		configurationLockId: string;
		provider: string;
	};
	lockId: string;
	lock: MapsLockV1;
	slot: MapsLockSlotPlan;
	keyword: LocalMapsLiveKeyword;
};

/** Build a candidate solely from transaction-local, frozen source snapshots. */
export function buildLocalMapsSubmittedCandidate(input: {
	source: LocalMapsAttemptSourceSnapshot;
}): LocalMapsLiveSubmittedCandidate {
	const { attempt, measurementCycle, localCycle, lockId } = input.source;
	const lock = mapsLockV1Schema.parse(input.source.lock);
	const slot = mapsLockSlotPlanSchema.parse(input.source.slot);
	const keyword = localMapsLiveKeywordSchema.parse(input.source.keyword);
	if (
		measurementCycle.id !== attempt.measurementCycleId ||
		measurementCycle.organizationId !== attempt.organizationId ||
		measurementCycle.domainId !== "LOCAL_MAPS" ||
		measurementCycle.configurationLockId !== lockId
	)
		throw new Error("LOCAL_MAPS_ATTEMPT_MEASUREMENT_SCOPE_MISMATCH");
	if (
		localCycle.organizationId !== attempt.organizationId ||
		localCycle.measurementCycleId !== attempt.measurementCycleId ||
		localCycle.configurationLockId !== lockId ||
		localCycle.provider !== attempt.executorId ||
		localCycle.id.length === 0
	)
		throw new Error("LOCAL_MAPS_ATTEMPT_LOCAL_CYCLE_SCOPE_MISMATCH");
	if (
		slot.measurementCycleId !== attempt.measurementCycleId ||
		slot.pointId !== attempt.pointId ||
		slot.keywordId !== attempt.itemId ||
		slot.providerId !== attempt.executorId ||
		slot.baseSlotKey !== attempt.baseSlotKey ||
		attempt.executionKey !== `${attempt.baseSlotKey}|${attempt.attemptIndex}` ||
		keyword.id !== attempt.itemId
	)
		throw new Error("LOCAL_MAPS_ATTEMPT_SLOT_SCOPE_MISMATCH");
	const providerRequest = materializeLocalMapsProviderRequest(lock, slot, keyword);
	return localMapsLiveSubmittedCandidateSchema.parse({
		schemaVersion: 1,
		kind: "LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE",
		mode: "LIVE_PROVIDER",
		canonicalizationVersion: "canonical-json-code-unit-v1",
		scope: {
			organizationId: attempt.organizationId,
			measurementCycleId: attempt.measurementCycleId,
			localCycleId: localCycle.id,
			configurationLockId: lockId,
			domainId: "LOCAL_MAPS",
		},
		lockSnapshotCanonical: canonicalLocalMapsLockSnapshot(lock),
		requestSnapshotCanonical: canonicalLocalMapsProviderRequest(providerRequest),
		lock,
		slot,
		keyword,
		providerRequest,
		attempt: {
			attemptId: attempt.id,
			reservationId: attempt.reservationId,
			observationRef: attempt.observationRef,
			attemptIndex: attempt.attemptIndex as 1 | 2 | 3,
			baseSlotKey: attempt.baseSlotKey,
			executionKey: attempt.executionKey,
			statusSnapshot: "SUBMITTED",
			claimedAt: attempt.claimedAt.toISOString(),
			submittedAt: attempt.submittedAt.toISOString(),
			leaseExpiresAt: attempt.leaseExpiresAt.toISOString(),
		},
		budgetReservation: {
			currency: attempt.currency as "USD",
			reservedCostUsd: String(attempt.reservedCostUsd),
			surfaceCapUsd: String(attempt.surfaceCapUsd),
			monthlyCapUsd: String(attempt.monthlyCapUsd),
			priceSnapshotVersion: attempt.priceSnapshotVersion,
		},
	});
}

export type LocalMapsAttemptStoreDependencies = {
	db: Db;
	/** Set the transaction-local tenant before any row is read or written. */
	setTenantContext(tx: Tx, organizationId: string): Promise<void>;
	/**
	 * Materialize lock, slot, keyword and provider snapshots while the attempt
	 * row is locked. The callback must not perform network/provider calls.
	 */
	buildCandidate(input: {
		tx: Tx;
		attempt: CandidateAttemptRow;
	}): Promise<LocalMapsLiveSubmittedCandidate> | LocalMapsLiveSubmittedCandidate;
	/**
	 * Atomically claim the already-reserved aggregate budget. Implementations
	 * must lock and update their authoritative budget ledger in this transaction;
	 * there is deliberately no permissive default.
	 */
	claimReservedBudget(input: {
		tx: Tx;
		attempt: AttemptRow;
		candidate: LocalMapsLiveSubmittedCandidate;
	}): Promise<void>;
	/** Lease length is an explicit deployment policy, never guessed by this adapter. */
	leaseDurationMs: number;
	tokenBytes?: number;
	newCommitToken?: () => string;
};

export type LocalMapsBudgetSettlement = {
	state: "RESERVED" | "SPENT" | "RELEASED";
	spentCostUsd: string;
	releasedCostUsd: string;
	incident: "REPORTED_COST_EXCEEDS_RESERVATION" | null;
};

function micros(value: string | number): bigint {
	const text = String(value);
	if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new Error("LOCAL_MAPS_USD_INVALID");
	const [whole, fraction = ""] = text.split(".");
	return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
}

function usd(value: bigint): string {
	if (value < BigInt(0)) throw new Error("LOCAL_MAPS_USD_NEGATIVE");
	const whole = value / BigInt(1_000_000);
	const fraction = (value % BigInt(1_000_000)).toString().padStart(6, "0");
	return `${whole}.${fraction}`;
}

/**
 * Maps a validated provider result to the exact parent-row budget settlement.
 * This is pure and is intentionally exported for deterministic contract tests.
 */
export function settleLocalMapsBudget(
	resultInput: LocalMapsLiveProviderResult,
	reservedCostUsd: string | number,
): LocalMapsBudgetSettlement {
	const result = localMapsLiveProviderResultSchema.parse(resultInput);
	const reserved = micros(reservedCostUsd);
	if (result.cost.status === "UNKNOWN") {
		return { state: "RESERVED", spentCostUsd: "0.000000", releasedCostUsd: "0.000000", incident: null };
	}
	const amount = micros(result.cost.amountUsd);
	if (amount === BigInt(0)) {
		if (result.cost.basis !== "actual") throw new Error("LOCAL_MAPS_ESTIMATED_ZERO_COST_BLOCKED");
		return { state: "RELEASED", spentCostUsd: "0.000000", releasedCostUsd: usd(reserved), incident: null };
	}
	return {
		state: "SPENT",
		spentCostUsd: usd(amount),
		releasedCostUsd: usd(reserved > amount ? reserved - amount : BigInt(0)),
		incident: amount > reserved ? "REPORTED_COST_EXCEEDS_RESERVATION" : null,
	};
}

function digest(value: string): string {
	return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function validDate(value: Date): Date {
	if (!Number.isFinite(value.getTime())) throw new Error("LOCAL_MAPS_ATTEMPT_DATE_INVALID");
	return value;
}

function commitToken(dependencies: LocalMapsAttemptStoreDependencies): string {
	const value = dependencies.newCommitToken?.() ?? randomBytes(dependencies.tokenBytes ?? 32).toString("base64url");
	if (!/^\S+$/.test(value)) throw new Error("LOCAL_MAPS_COMMIT_TOKEN_INVALID");
	return value;
}

function identityMatchesCandidate(attempt: CandidateAttemptRow, candidate: LocalMapsLiveSubmittedCandidate): void {
	const parsed = localMapsLiveSubmittedCandidateSchema.parse(candidate);
	if (
		parsed.scope.organizationId !== attempt.organizationId ||
		parsed.scope.measurementCycleId !== attempt.measurementCycleId ||
		parsed.scope.domainId !== "LOCAL_MAPS" ||
		parsed.attempt.attemptId !== attempt.id ||
		parsed.attempt.reservationId !== attempt.reservationId ||
		parsed.attempt.observationRef !== attempt.observationRef ||
		parsed.attempt.attemptIndex !== attempt.attemptIndex ||
		parsed.attempt.baseSlotKey !== attempt.baseSlotKey ||
		parsed.attempt.executionKey !== attempt.executionKey ||
		parsed.slot.pointId !== attempt.pointId ||
		parsed.slot.keywordId !== attempt.itemId ||
		parsed.providerRequest.provider.id !== attempt.executorId ||
		parsed.lock.provider.id !== attempt.executorId ||
		parsed.budgetReservation.currency !== attempt.currency ||
		micros(parsed.budgetReservation.reservedCostUsd) !== micros(attempt.reservedCostUsd) ||
		micros(parsed.budgetReservation.surfaceCapUsd) !== micros(attempt.surfaceCapUsd) ||
		micros(parsed.budgetReservation.monthlyCapUsd) !== micros(attempt.monthlyCapUsd) ||
		parsed.budgetReservation.priceSnapshotVersion !== attempt.priceSnapshotVersion ||
		new Date(parsed.attempt.claimedAt).getTime() !== attempt.claimedAt.getTime() ||
		new Date(parsed.attempt.submittedAt).getTime() !== attempt.submittedAt?.getTime() ||
		new Date(parsed.attempt.leaseExpiresAt).getTime() !== attempt.leaseExpiresAt.getTime()
	)
		throw new Error("LOCAL_MAPS_ATTEMPT_CANDIDATE_IDENTITY_MISMATCH");
}

function finalStatus(status: string): boolean {
	return ["SUCCEEDED", "RETRYABLE_FAILURE", "TERMINAL_FAILURE"].includes(status);
}

function parseContinuation(input: Parameters<LocalMapsLiveAttemptStore["finalizeSubmitted"]>[0]) {
	return input.continuation;
}

/**
 * Concrete persistence boundary for the runner. It is not registered with a
 * worker or API by default: callers must supply tenant context, candidate
 * materialization and an authoritative budget ledger explicitly.
 */
export function createLocalMapsLiveAttemptStore(
	dependencies: LocalMapsAttemptStoreDependencies,
): LocalMapsLiveAttemptStore {
	if (!Number.isSafeInteger(dependencies.leaseDurationMs) || dependencies.leaseDurationMs <= 0)
		throw new Error("LOCAL_MAPS_LEASE_POLICY_REQUIRED");
	if (
		dependencies.tokenBytes !== undefined &&
		(!Number.isSafeInteger(dependencies.tokenBytes) || dependencies.tokenBytes < 16)
	)
		throw new Error("LOCAL_MAPS_TOKEN_POLICY_INVALID");

	return {
		async acquireAndCommitSubmitted(intent: LocalMapsLiveDispatchIntent, now: Date): Promise<LocalMapsAcquireDecision> {
			const acquiredAt = validDate(now);
			return dependencies.db.transaction(async (tx) => {
				await dependencies.setTenantContext(tx, intent.organizationId);
				const [row] = await tx
					.select()
					.from(schema.svMeasurementAttempts)
					.where(
						and(
							eq(schema.svMeasurementAttempts.id, intent.attemptId),
							eq(schema.svMeasurementAttempts.organizationId, intent.organizationId),
						),
					)
					.for("update");
				if (!row) throw new Error("LOCAL_MAPS_ATTEMPT_NOT_FOUND");
				if (row.status === "UNKNOWN_RECONCILIATION") return { kind: "RECONCILIATION_REQUIRED" };
				if (finalStatus(row.status)) return { kind: "DONE" };
				if (row.status !== "CLAIMED") return { kind: "BUSY" };
				if (row.submittedAt || row.submittedCandidate || row.submissionTokenHash)
					throw new Error("LOCAL_MAPS_CLAIMED_ROW_SHAPE_INVALID");
				// A freshly inserted CLAIMED row is the hand-off point from the
				// scheduler to this runner, so its active lease is expected. Once
				// that lease has expired, however, 0044 does not permit renewing it
				// in the same CLAIMED -> SUBMITTED update; reconciliation must own
				// that recovery path instead of risking a second dispatch.
				if (row.leaseExpiresAt <= acquiredAt) return { kind: "RECONCILIATION_REQUIRED" };

				const submittedAt = acquiredAt;
				const leaseExpiresAt = new Date(acquiredAt.getTime() + dependencies.leaseDurationMs);
				const candidate = localMapsLiveSubmittedCandidateSchema.parse(
					await dependencies.buildCandidate({
						tx,
						attempt: { ...row, submittedAt, leaseExpiresAt },
					}),
				);
				identityMatchesCandidate({ ...row, submittedAt, leaseExpiresAt }, candidate);
				await dependencies.claimReservedBudget({ tx, attempt: row, candidate });
				const token = commitToken(dependencies);
				const canonical = canonicalLocalMapsSubmittedCandidate(candidate);
				const [updated] = await tx
					.update(schema.svMeasurementAttempts)
					.set({
						status: "SUBMITTED",
						submittedAt,
						leaseExpiresAt,
						submissionTokenHash: digest(token),
						submittedCandidateFingerprint: digest(canonical),
						submittedCandidateCanonical: canonical,
						submittedCandidate: candidate,
					})
					.where(
						and(
							eq(schema.svMeasurementAttempts.id, row.id),
							eq(schema.svMeasurementAttempts.organizationId, intent.organizationId),
							eq(schema.svMeasurementAttempts.status, "CLAIMED"),
							eq(schema.svMeasurementAttempts.rowVersion, row.rowVersion),
						),
					)
					.returning();
				if (updated?.status !== "SUBMITTED" || !updated.submittedAt || !updated.submittedCandidate)
					throw new Error("LOCAL_MAPS_ATTEMPT_SUBMIT_CONFLICT");
				const persistedCandidate = localMapsLiveSubmittedCandidateSchema.parse(updated.submittedCandidate);
				identityMatchesCandidate(updated as CandidateAttemptRow, persistedCandidate);
				return {
					kind: "READY",
					committed: {
						commitToken: token,
						organizationId: updated.organizationId,
						attemptId: updated.id,
						reservationId: updated.reservationId,
						executionKey: updated.executionKey,
						rowVersion: updated.rowVersion,
						snapshot: persistedCandidate,
					},
				};
			});
		},

		async finalizeSubmitted(input) {
			const continuation = parseContinuation(input);
			return dependencies.db.transaction(async (tx) => {
				await dependencies.setTenantContext(tx, continuation.organizationId);
				const [row] = await tx
					.select()
					.from(schema.svMeasurementAttempts)
					.where(
						and(
							eq(schema.svMeasurementAttempts.id, continuation.attemptId),
							eq(schema.svMeasurementAttempts.organizationId, continuation.organizationId),
							eq(schema.svMeasurementAttempts.reservationId, continuation.reservationId),
							eq(schema.svMeasurementAttempts.executionKey, continuation.executionKey),
						),
					)
					.for("update");
				if (!row) throw new Error("LOCAL_MAPS_ATTEMPT_CONTINUATION_REJECTED");
				if (row.submissionTokenHash !== digest(continuation.commitToken))
					throw new Error("LOCAL_MAPS_ATTEMPT_TOKEN_REJECTED");
				if (finalStatus(row.status) || row.status === "UNKNOWN_RECONCILIATION") {
					const [existing] = await tx
						.select()
						.from(schema.svMeasurementAttemptResults)
						.where(eq(schema.svMeasurementAttemptResults.attemptId, row.id))
						.limit(1);
					if (!existing) throw new Error("LOCAL_MAPS_FINAL_RESULT_MISSING");
					return {
						kind: "FINALIZED" as const,
						persistedResult: localMapsLiveProviderResultSchema.parse(existing.validatedResult),
						persistedBudgetState: row.budgetState as "RESERVED" | "SPENT" | "RELEASED",
					};
				}
				if (row.rowVersion !== continuation.rowVersion) throw new Error("LOCAL_MAPS_ATTEMPT_CONTINUATION_REJECTED");
				if (row.status !== "SUBMITTED" || !row.submittedCandidate || !row.submittedAt)
					throw new Error("LOCAL_MAPS_ATTEMPT_NOT_SUBMITTED");
				const candidate = localMapsLiveSubmittedCandidateSchema.parse(row.submittedCandidate);
				identityMatchesCandidate(row as CandidateAttemptRow, candidate);
				const result = localMapsLiveProviderResultSchema.parse(input.result);
				const matched = assertLocalMapsLiveResultMatchesCandidate(candidate, result);
				if (matched.budgetIncident !== input.budgetIncident) throw new Error("LOCAL_MAPS_BUDGET_INCIDENT_MISMATCH");
				const settlement = settleLocalMapsBudget(result, row.reservedCostUsd);
				if (settlement.incident !== input.budgetIncident || settlement.state !== input.requiredBudgetState)
					throw new Error("LOCAL_MAPS_BUDGET_SETTLEMENT_MISMATCH");
				const expectedDisposition = attemptDisposition(result.attemptIndex, result.event);
				if (JSON.stringify(expectedDisposition) !== JSON.stringify(input.disposition))
					throw new Error("LOCAL_MAPS_DISPOSITION_MISMATCH");

				let costEventId: string | null = null;
				if (settlement.state === "SPENT") {
					if (result.cost.status !== "KNOWN") throw new Error("LOCAL_MAPS_SPENT_COST_STATUS_INVALID");
					const costEvent: typeof schema.svCostEvents.$inferInsert = {
						organizationId: row.organizationId,
						measurementCycleId: row.measurementCycleId,
						domainId: "LOCAL_MAPS",
						provider: result.provider.id,
						amountUsd: settlement.spentCostUsd,
						basis: result.cost.basis,
						kind: "measurement",
					};
					const [event] = await tx
						.insert(schema.svCostEvents)
						.values(costEvent)
						.returning({ id: schema.svCostEvents.id });
					if (!event) throw new Error("LOCAL_MAPS_COST_EVENT_INSERT_FAILED");
					costEventId = event.id;
				}
				const completedAt = validDate(new Date(result.completedAt));
				const [updated] = await tx
					.update(schema.svMeasurementAttempts)
					.set({
						status: input.disposition.attemptStatus,
						budgetState: settlement.state,
						spentCostUsd: settlement.spentCostUsd,
						releasedCostUsd: settlement.releasedCostUsd,
						completedAt,
						providerTaskId: result.provider.providerTaskId,
						rawRef: result.provenance.rawResponseReference,
						costEventId,
						retryReason: result.event.kind === "RETRYABLE_FAILURE" ? result.event.reason : null,
						finalInvalidReason: input.disposition.finalInvalidReason,
						unknownReason: result.event.kind === "OUTCOME_UNKNOWN" ? "PROVIDER_OUTCOME_UNKNOWN" : null,
					})
					.where(
						and(
							eq(schema.svMeasurementAttempts.id, row.id),
							eq(schema.svMeasurementAttempts.organizationId, continuation.organizationId),
							eq(schema.svMeasurementAttempts.status, "SUBMITTED"),
							eq(schema.svMeasurementAttempts.rowVersion, continuation.rowVersion),
						),
					)
					.returning();
				if (!updated) throw new Error("LOCAL_MAPS_ATTEMPT_FINALIZE_CONFLICT");
				const resultCanonical = canonicalLocalMapsProviderResult(result);
				await tx.insert(schema.svMeasurementAttemptResults).values({
					attemptId: updated.id,
					organizationId: updated.organizationId,
					measurementCycleId: updated.measurementCycleId,
					localCycleId: candidate.scope.localCycleId,
					configurationLockId: candidate.scope.configurationLockId,
					providerId: result.provider.id,
					reservationId: updated.reservationId,
					executionKey: updated.executionKey,
					attemptIndex: updated.attemptIndex,
					resultFingerprint: digest(resultCanonical),
					resultCanonical,
					validatedResult: result,
					disposition: input.disposition,
					budgetIncident: input.budgetIncident,
					requiredBudgetState: input.requiredBudgetState,
					providerTaskId: result.provider.providerTaskId,
					rawResponseReference: result.provenance.rawResponseReference,
					rawResponseSha256: result.provenance.rawResponseSha256,
				});
				return { kind: "FINALIZED" as const, persistedResult: result, persistedBudgetState: settlement.state };
			});
		},

		async markSubmittedUnknown(input) {
			const continuation = input.continuation;
			const completedAt = validDate(input.completedAt);
			return dependencies.db.transaction(async (tx) => {
				await dependencies.setTenantContext(tx, continuation.organizationId);
				const [row] = await tx
					.select()
					.from(schema.svMeasurementAttempts)
					.where(
						and(
							eq(schema.svMeasurementAttempts.id, continuation.attemptId),
							eq(schema.svMeasurementAttempts.organizationId, continuation.organizationId),
							eq(schema.svMeasurementAttempts.reservationId, continuation.reservationId),
							eq(schema.svMeasurementAttempts.executionKey, continuation.executionKey),
						),
					)
					.for("update");
				if (!row) throw new Error("LOCAL_MAPS_ATTEMPT_CONTINUATION_REJECTED");
				if (row.submissionTokenHash !== digest(continuation.commitToken))
					throw new Error("LOCAL_MAPS_ATTEMPT_TOKEN_REJECTED");
				if (finalStatus(row.status) || row.status === "UNKNOWN_RECONCILIATION")
					return { kind: "ALREADY_FINALIZED" as const };
				if (row.rowVersion !== continuation.rowVersion) throw new Error("LOCAL_MAPS_ATTEMPT_CONTINUATION_REJECTED");
				if (row.status !== "SUBMITTED" || !row.submittedAt || completedAt < row.submittedAt)
					throw new Error("LOCAL_MAPS_UNKNOWN_TRANSITION_REJECTED");
				await tx
					.update(schema.svMeasurementAttempts)
					.set({ status: "UNKNOWN_RECONCILIATION", completedAt, unknownReason: input.reason })
					.where(
						and(
							eq(schema.svMeasurementAttempts.id, row.id),
							eq(schema.svMeasurementAttempts.organizationId, continuation.organizationId),
							eq(schema.svMeasurementAttempts.status, "SUBMITTED"),
							eq(schema.svMeasurementAttempts.rowVersion, continuation.rowVersion),
						),
					);
				return { kind: "MARKED_UNKNOWN" as const };
			});
		},
	};
}

export const localMapsAttemptStoreRlsDefault = async (tx: Tx, organizationId: string): Promise<void> => {
	await tx.execute(sql`select set_config('app.organization_id', ${organizationId}, true)`);
};

export type { LocalMapsUnknownReason };
