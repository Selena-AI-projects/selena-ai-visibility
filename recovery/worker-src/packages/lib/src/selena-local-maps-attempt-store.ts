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
	planMapsLockSlots,
} from "@workspace/selena-visibility-contracts";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";
import { isLocalProviderExecutionEnabled } from "./selena-local-execution";
import type {
	LocalMapsAcquireDecision,
	LocalMapsLiveAttemptStore,
	LocalMapsLiveDispatchIntent,
	LocalMapsUnknownReason,
} from "./selena-local-maps-live-runner";
import {
	cancelLocalPendingInTransaction,
	planNextLocalMapsAttemptInTransaction,
} from "./selena-local-retry-coordinator";
import { LOCAL_MAPS_SPEND_SCOPE, settleProviderSpend } from "./selena-provider-spend";

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
		locationId: string;
		provider: string;
	};
	lockId: string;
	lock: MapsLockV1;
	slot: MapsLockSlotPlan;
	keyword: LocalMapsLiveKeyword;
	keywordLocationId: string;
};

/** Build a candidate solely from transaction-local, frozen source snapshots. */
export function buildLocalMapsSubmittedCandidate(input: {
	source: LocalMapsAttemptSourceSnapshot;
}): LocalMapsLiveSubmittedCandidate {
	const { attempt, measurementCycle, localCycle, lockId, keywordLocationId } = input.source;
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
		localCycle.locationId !== lock.locationId ||
		localCycle.provider !== attempt.executorId ||
		localCycle.id.length === 0
	)
		throw new Error("LOCAL_MAPS_ATTEMPT_LOCAL_CYCLE_SCOPE_MISMATCH");
	if (keywordLocationId !== lock.locationId) throw new Error("LOCAL_MAPS_ATTEMPT_KEYWORD_LOCATION_MISMATCH");
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

/**
 * Loads the source rows needed by the pure builder while the parent attempt is
 * already locked. This helper only reads tenant-scoped rows; callers still
 * decide when to invoke it and must keep the surrounding transaction open.
 */
export async function loadLocalMapsAttemptSourceSnapshot(input: {
	tx: Tx;
	attempt: CandidateAttemptRow;
}): Promise<LocalMapsAttemptSourceSnapshot> {
	const { tx, attempt } = input;
	const [measurementCycle] = await tx
		.select({
			id: schema.svMeasurementCycles.id,
			organizationId: schema.svMeasurementCycles.organizationId,
			domainId: schema.svMeasurementCycles.domainId,
			configurationLockId: schema.svMeasurementCycles.configurationLockId,
		})
		.from(schema.svMeasurementCycles)
		.where(
			and(
				eq(schema.svMeasurementCycles.id, attempt.measurementCycleId),
				eq(schema.svMeasurementCycles.organizationId, attempt.organizationId),
				eq(schema.svMeasurementCycles.domainId, "LOCAL_MAPS"),
			),
		)
		.limit(1);
	if (!measurementCycle) throw new Error("LOCAL_MAPS_MEASUREMENT_CYCLE_NOT_FOUND");
	const [localCycle] = await tx
		.select({
			id: schema.svLocalScanCycles.id,
			organizationId: schema.svLocalScanCycles.organizationId,
			measurementCycleId: schema.svLocalScanCycles.measurementCycleId,
			configurationLockId: schema.svLocalScanCycles.configurationLockId,
			locationId: schema.svLocalScanCycles.locationId,
			provider: schema.svLocalScanCycles.provider,
		})
		.from(schema.svLocalScanCycles)
		.where(
			and(
				eq(schema.svLocalScanCycles.measurementCycleId, attempt.measurementCycleId),
				eq(schema.svLocalScanCycles.organizationId, attempt.organizationId),
				eq(schema.svLocalScanCycles.domainId, "LOCAL_MAPS"),
				eq(schema.svLocalScanCycles.configurationLockId, measurementCycle.configurationLockId),
			),
		)
		.limit(1);
	if (!localCycle) throw new Error("LOCAL_MAPS_LOCAL_CYCLE_NOT_FOUND");
	const [lockRow] = await tx
		.select({ id: schema.svConfigurationLocks.id, snapshot: schema.svConfigurationLocks.snapshot })
		.from(schema.svConfigurationLocks)
		.where(
			and(
				eq(schema.svConfigurationLocks.id, measurementCycle.configurationLockId),
				eq(schema.svConfigurationLocks.organizationId, attempt.organizationId),
			),
		)
		.limit(1);
	if (!lockRow) throw new Error("LOCAL_MAPS_CONFIGURATION_LOCK_NOT_FOUND");
	const lock = mapsLockV1Schema.parse(lockRow.snapshot);
	const [keywordRow] = await tx
		.select({
			id: schema.svLocalKeywords.id,
			locationId: schema.svLocalKeywords.locationId,
		})
		.from(schema.svLocalKeywords)
		.where(
			and(
				eq(schema.svLocalKeywords.id, attempt.itemId),
				eq(schema.svLocalKeywords.organizationId, attempt.organizationId),
			),
		)
		.limit(1);
	if (!keywordRow || !lock.keywordSet.keywordIds.includes(keywordRow.id))
		throw new Error("LOCAL_MAPS_KEYWORD_SCOPE_MISMATCH");
	const frozenKeyword = lock.keywordSet.keywords?.find((item) => item.id === attempt.itemId);
	if (!frozenKeyword || frozenKeyword.language !== lock.request.language)
		throw new Error("LOCAL_MAPS_FROZEN_KEYWORD_REQUIRED");
	const slot = planMapsLockSlots(attempt.measurementCycleId, lock).find(
		(candidate) => candidate.baseSlotKey === attempt.baseSlotKey,
	);
	if (!slot) throw new Error("LOCAL_MAPS_SLOT_NOT_FOUND");
	return {
		attempt,
		measurementCycle,
		localCycle,
		lockId: lockRow.id,
		lock,
		slot,
		keywordLocationId: keywordRow.locationId,
		keyword: {
			id: keywordRow.id,
			text: frozenKeyword.text,
			keywordSetId: lock.keywordSet.id,
			keywordSetVersion: lock.keywordSet.version,
		},
	};
}

/** Convenience callback for a store dependency; still requires an outer transaction. */
export async function buildLocalMapsSubmittedCandidateFromDatabase(input: {
	tx: Tx;
	attempt: CandidateAttemptRow;
}): Promise<LocalMapsLiveSubmittedCandidate> {
	return buildLocalMapsSubmittedCandidate({ source: await loadLocalMapsAttemptSourceSnapshot(input) });
}

export type LocalMapsAttemptStoreDependencies = {
	executionControls?: () => Record<string, string | undefined>;
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
	return ["SUCCEEDED", "RETRYABLE_FAILURE", "TERMINAL_FAILURE", "CANCELLED_NO_CALL"].includes(status);
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
				let [row] = await tx
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
				const [cycle] = await tx
					.select()
					.from(schema.svLocalScanCycles)
					.where(
						and(
							eq(schema.svLocalScanCycles.measurementCycleId, row.measurementCycleId),
							eq(schema.svLocalScanCycles.organizationId, row.organizationId),
						),
					)
					.for("update");
				if (!cycle || cycle.executionMode === "LEGACY_SOURCE_ONLY") throw new Error("LOCAL_LEGACY_EXECUTION_FORBIDDEN");
				if (
					!isLocalProviderExecutionEnabled(dependencies.executionControls?.() ?? {}) ||
					cycle.emergencyStoppedAt ||
					cycle.status === "STOPPED"
				) {
					await cancelLocalPendingInTransaction(tx, row.organizationId, cycle.id);
					return { kind: "DONE" };
				}
				if (!["QUEUED", "RUNNING", "CANARY_RUNNING"].includes(cycle.status))
					throw new Error("LOCAL_CYCLE_NOT_EXECUTABLE");
				if (row.submittedAt || row.submittedCandidate || row.submissionTokenHash)
					throw new Error("LOCAL_MAPS_CLAIMED_ROW_SHAPE_INVALID");
				if (row.leaseExpiresAt <= acquiredAt) {
					const [renewed] = await tx
						.update(schema.svMeasurementAttempts)
						.set({ leaseExpiresAt: new Date(acquiredAt.getTime() + dependencies.leaseDurationMs) })
						.where(
							and(
								eq(schema.svMeasurementAttempts.id, row.id),
								eq(schema.svMeasurementAttempts.organizationId, row.organizationId),
								eq(schema.svMeasurementAttempts.rowVersion, row.rowVersion),
							),
						)
						.returning();
					if (!renewed) throw new Error("LOCAL_CLAIM_RENEWAL_CONFLICT");
					row = renewed;
				}

				const submittedAt = acquiredAt;
				const leaseExpiresAt = new Date(
					Math.max(row.leaseExpiresAt.getTime(), acquiredAt.getTime()) + dependencies.leaseDurationMs,
				);
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
				const rawResponseBody = input.rawResponseBody;
				if (rawResponseBody !== undefined && (!rawResponseBody.trim() || rawResponseBody.length > 4_000_000))
					throw new Error("LOCAL_MAPS_RAW_RESPONSE_INVALID");
				if (rawResponseBody !== undefined && result.provenance.rawResponseSha256 !== digest(rawResponseBody))
					throw new Error("LOCAL_MAPS_RAW_RESPONSE_HASH_MISMATCH");
				const observationId = row.localObservationId;
				if (!observationId) throw new Error("LOCAL_MAPS_OBSERVATION_LINK_REQUIRED");
				const [cycleModeRow] = await tx
					.select({ executionMode: schema.svLocalScanCycles.executionMode })
					.from(schema.svLocalScanCycles)
					.where(
						and(
							eq(schema.svLocalScanCycles.id, candidate.scope.localCycleId),
							eq(schema.svLocalScanCycles.organizationId, row.organizationId),
						),
					)
					.limit(1);
				const isCanary = cycleModeRow?.executionMode === "CANARY";
				const matched = assertLocalMapsLiveResultMatchesCandidate(candidate, result);
				if (matched.budgetIncident !== input.budgetIncident) throw new Error("LOCAL_MAPS_BUDGET_INCIDENT_MISMATCH");
				const settlement = settleLocalMapsBudget(result, row.reservedCostUsd);
				if (settlement.incident !== input.budgetIncident || settlement.state !== input.requiredBudgetState)
					throw new Error("LOCAL_MAPS_BUDGET_SETTLEMENT_MISMATCH");
				if (result.cost.status === "KNOWN" && result.cost.basis === "actual") {
					const spendReceipt = await settleProviderSpend(tx, {
						scope: LOCAL_MAPS_SPEND_SCOPE,
						organizationId: row.organizationId,
						requestKey: row.executionKey,
						actualUsd: result.cost.amountUsd,
					});
					if (
						spendReceipt.reservationId !== row.reservationId ||
						!["SETTLED", "ALREADY_SETTLED"].includes(spendReceipt.decision)
					)
						throw new Error("LOCAL_MAPS_PROVIDER_SPEND_SETTLEMENT_REJECTED");
				}
				const expectedDisposition = attemptDisposition(result.attemptIndex, result.event);
				if (JSON.stringify(expectedDisposition) !== JSON.stringify(input.disposition))
					throw new Error("LOCAL_MAPS_DISPOSITION_MISMATCH");
				let finalizedDisposition =
					isCanary && input.disposition.retryAllowed
						? {
								...input.disposition,
								attemptStatus: "TERMINAL_FAILURE" as const,
								observationValidity: "INVALID" as const,
								observationOutcome: "PROVIDER_ERROR" as const,
								retryAllowed: false as const,
								finalInvalidReason: "PROVIDER_UNAVAILABLE" as const,
								cycleStatus: "PARTIAL_FAILURE" as const,
							}
						: input.disposition;

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
						status: finalizedDisposition.attemptStatus,
						budgetState: settlement.state,
						spentCostUsd: settlement.spentCostUsd,
						releasedCostUsd: settlement.releasedCostUsd,
						completedAt,
						providerTaskId: result.provider.providerTaskId,
						rawRef: result.provenance.rawResponseReference,
						costEventId,
						retryReason: result.event.kind === "RETRYABLE_FAILURE" ? result.event.reason : null,
						finalInvalidReason: finalizedDisposition.finalInvalidReason,
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
				if (input.budgetIncident) {
					await tx
						.update(schema.svLocalScanCycles)
						.set({
							status: "BUDGET_BLOCKED",
							emergencyStoppedAt: sql`coalesce(${schema.svLocalScanCycles.emergencyStoppedAt}, ${completedAt})`,
							updatedAt: completedAt,
						})
						.where(
							and(
								eq(schema.svLocalScanCycles.id, candidate.scope.localCycleId),
								eq(schema.svLocalScanCycles.organizationId, row.organizationId),
							),
						);
					await cancelLocalPendingInTransaction(tx, row.organizationId, candidate.scope.localCycleId);
				}
				// Retry reservation and the predecessor receipt commit atomically.
				if (finalizedDisposition.retryAllowed) {
					const retry = await planNextLocalMapsAttemptInTransaction(tx, updated, finalizedDisposition);
					if (retry !== "CREATED") {
						finalizedDisposition = {
							...finalizedDisposition,
							retryAllowed: false,
							observationOutcome: "PREFLIGHT_BLOCKED",
							observationValidity: "UNMEASURED",
							finalInvalidReason: null,
							cycleStatus: "PARTIAL_FAILURE",
						};
					}
				}
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
					disposition: finalizedDisposition,
					budgetIncident: input.budgetIncident,
					requiredBudgetState: input.requiredBudgetState,
					providerTaskId: result.provider.providerTaskId,
					rawResponseReference: result.provenance.rawResponseReference,
					rawResponseSha256: result.provenance.rawResponseSha256,
				});
				// Preserve malformed/ambiguous payloads for reconciliation without
				// projecting them into customer evidence.
				if (
					rawResponseBody !== undefined &&
					result.event.kind !== "FOUND" &&
					result.event.kind !== "ABSENT_WITHIN_DEPTH"
				) {
					const rawSha = result.provenance.rawResponseSha256;
					const rawRef = result.provenance.rawResponseReference;
					if (!rawSha || !rawRef) throw new Error("LOCAL_MAPS_EVIDENCE_PROVENANCE_REQUIRED");
					const [lockRow] = await tx
						.select({ projectId: schema.svConfigurationLocks.projectId })
						.from(schema.svConfigurationLocks)
						.where(
							and(
								eq(schema.svConfigurationLocks.id, candidate.scope.configurationLockId),
								eq(schema.svConfigurationLocks.organizationId, row.organizationId),
							),
						)
						.limit(1);
					if (!lockRow) throw new Error("LOCAL_MAPS_CONFIGURATION_LOCK_NOT_FOUND");
					const snapshotResult = { ...result } as Record<string, unknown>;
					delete snapshotResult.rawResponseBody;
					const [source] = await tx
						.insert(schema.svSourceSnapshots)
						.values({
							organizationId: row.organizationId,
							projectId: lockRow.projectId,
							sourceType: isCanary ? "LOCAL_MAPS_CANARY_ONLY" : "LOCAL_MAPS_PROVIDER",
							sourceRef: rawRef,
							contentSha256: rawSha,
							snapshot: snapshotResult,
							capturedAt: new Date(result.completedAt),
							immutable: true,
						})
						.onConflictDoNothing()
						.returning({ id: schema.svSourceSnapshots.id });
					let sourceId = source?.id;
					if (!sourceId) {
						const [existingSource] = await tx
							.select({ id: schema.svSourceSnapshots.id })
							.from(schema.svSourceSnapshots)
							.where(
								and(
									eq(schema.svSourceSnapshots.organizationId, row.organizationId),
									eq(schema.svSourceSnapshots.contentSha256, rawSha),
									eq(schema.svSourceSnapshots.projectId, lockRow.projectId),
									eq(schema.svSourceSnapshots.sourceType, isCanary ? "LOCAL_MAPS_CANARY_ONLY" : "LOCAL_MAPS_PROVIDER"),
								),
							)
							.limit(1);
						sourceId = existingSource?.id;
					}
					if (!sourceId) throw new Error("LOCAL_MAPS_SOURCE_SNAPSHOT_INSERT_FAILED");
					if (sourceId)
						await tx
							.insert(schema.svLocalRawEvidence)
							.values({
								organizationId: row.organizationId,
								sourceSnapshotId: sourceId,
								rawResponseBody,
								rawResponseSha256: rawSha,
								providerTaskId: result.provider.providerTaskId,
								retentionExpiresAt: new Date(new Date(result.completedAt).getTime() + 30 * 24 * 60 * 60 * 1000),
							})
							.onConflictDoNothing();
				}

				// Project the validated provider result into the customer-facing map
				// observation in the same transaction. Successful outcomes receive an
				// immutable source, dataset and validated attempt result. PostgreSQL checks
				// their full identity before allowing FOUND/ABSENT_WITHIN_DEPTH. Human
				// acceptance belongs to the report QC path, never the provider finalizer.
				if (result.event.kind === "FOUND" || result.event.kind === "ABSENT_WITHIN_DEPTH") {
					if (!result.provenance.rawResponseReference || !result.provenance.rawResponseSha256)
						throw new Error("LOCAL_MAPS_EVIDENCE_PROVENANCE_REQUIRED");
					const [lockRow] = await tx
						.select({ projectId: schema.svConfigurationLocks.projectId })
						.from(schema.svConfigurationLocks)
						.where(
							and(
								eq(schema.svConfigurationLocks.id, candidate.scope.configurationLockId),
								eq(schema.svConfigurationLocks.organizationId, row.organizationId),
							),
						)
						.limit(1);
					if (!lockRow) throw new Error("LOCAL_MAPS_CONFIGURATION_LOCK_NOT_FOUND");
					const capturedAt = new Date(result.completedAt);
					const snapshotResult = { ...result } as Record<string, unknown>;
					delete snapshotResult.rawResponseBody;
					const [source] = await tx
						.insert(schema.svSourceSnapshots)
						.values({
							organizationId: row.organizationId,
							projectId: lockRow.projectId,
							sourceType: isCanary ? "LOCAL_MAPS_CANARY_ONLY" : "LOCAL_MAPS_PROVIDER",
							sourceRef: result.provenance.rawResponseReference,
							contentSha256: result.provenance.rawResponseSha256,
							snapshot: snapshotResult,
							capturedAt,
							immutable: true,
						})
						.onConflictDoNothing()
						.returning({ id: schema.svSourceSnapshots.id });
					let sourceId = source?.id;
					if (!sourceId) {
						const [existingSource] = await tx
							.select({ id: schema.svSourceSnapshots.id })
							.from(schema.svSourceSnapshots)
							.where(
								and(
									eq(schema.svSourceSnapshots.organizationId, row.organizationId),
									eq(schema.svSourceSnapshots.contentSha256, result.provenance.rawResponseSha256),
									eq(schema.svSourceSnapshots.projectId, lockRow.projectId),
									eq(schema.svSourceSnapshots.sourceType, isCanary ? "LOCAL_MAPS_CANARY_ONLY" : "LOCAL_MAPS_PROVIDER"),
								),
							)
							.limit(1);
						sourceId = existingSource?.id;
					}
					if (!sourceId) throw new Error("LOCAL_MAPS_SOURCE_SNAPSHOT_INSERT_FAILED");
					if (rawResponseBody !== undefined) {
						await tx
							.insert(schema.svLocalRawEvidence)
							.values({
								organizationId: row.organizationId,
								sourceSnapshotId: sourceId,
								rawResponseBody,
								rawResponseSha256: result.provenance.rawResponseSha256,
								providerTaskId: result.provider.providerTaskId,
								retentionExpiresAt: new Date(capturedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
							})
							.onConflictDoNothing();
					}
					if (isCanary) {
						await tx
							.update(schema.svLocalRankObservations)
							.set({
								outcome: "BLOCKED",
								validity: "UNMEASURED",
								targetRank: null,
								capturedAt: null,
								invalidReason: "CANARY_REVIEW_REQUIRED",
								rawReference: null,
								evidenceEnvelope: null,
								evidenceCanonical: null,
								evidenceSha256: null,
								evidenceId: null,
								attemptCount: row.attemptIndex,
								updatedAt: capturedAt,
							})
							.where(
								and(
									eq(schema.svLocalRankObservations.id, observationId),
									eq(schema.svLocalRankObservations.organizationId, row.organizationId),
									eq(schema.svLocalRankObservations.outcome, "PENDING"),
								),
							);
					} else if (!input.budgetIncident) {
						const [dataset] = await tx
							.insert(schema.svMeasurementDatasets)
							.values({
								organizationId: row.organizationId,
								cycleId: row.measurementCycleId,
								datasetKey: `local-maps-live:${result.provider.id}:${row.measurementCycleId}`,
								version: 1,
							})
							.onConflictDoNothing()
							.returning({ id: schema.svMeasurementDatasets.id });
						let datasetId = dataset?.id;
						if (!datasetId) {
							const [existingDataset] = await tx
								.select({ id: schema.svMeasurementDatasets.id })
								.from(schema.svMeasurementDatasets)
								.where(
									and(
										eq(schema.svMeasurementDatasets.organizationId, row.organizationId),
										eq(schema.svMeasurementDatasets.cycleId, row.measurementCycleId),
										eq(
											schema.svMeasurementDatasets.datasetKey,
											`local-maps-live:${result.provider.id}:${row.measurementCycleId}`,
										),
										eq(schema.svMeasurementDatasets.version, 1),
									),
								)
								.limit(1);
							datasetId = existingDataset?.id;
						}
						if (!datasetId) throw new Error("LOCAL_MAPS_DATASET_INSERT_FAILED");
						const [evidence] = await tx
							.insert(schema.svEvidenceIndex)
							.values({
								organizationId: row.organizationId,
								projectId: lockRow.projectId,
								domainId: "LOCAL_MAPS",
								cycleId: row.measurementCycleId,
								observationRef: row.observationRef,
								datasetId,
								sourceSnapshotId: sourceId,
								capturedAt,
							})
							.onConflictDoNothing()
							.returning({ id: schema.svEvidenceIndex.id });
						let evidenceId = evidence?.id;
						if (!evidenceId) {
							const [existingEvidence] = await tx
								.select({ id: schema.svEvidenceIndex.id })
								.from(schema.svEvidenceIndex)
								.where(
									and(
										eq(schema.svEvidenceIndex.organizationId, row.organizationId),
										eq(schema.svEvidenceIndex.observationRef, row.observationRef),
										eq(schema.svEvidenceIndex.cycleId, row.measurementCycleId),
										eq(schema.svEvidenceIndex.domainId, "LOCAL_MAPS"),
									),
								)
								.limit(1);
							evidenceId = existingEvidence?.id;
						}
						if (!evidenceId) throw new Error("LOCAL_MAPS_EVIDENCE_INSERT_FAILED");
						await tx
							.update(schema.svLocalRankObservations)
							.set({
								outcome: result.event.kind,
								validity: "VALID",
								targetRank: result.targetRank,
								capturedAt,
								rawReference: result.provenance.rawResponseReference,
								evidenceEnvelope: result,
								evidenceCanonical: resultCanonical,
								evidenceSha256: digest(resultCanonical),
								evidenceId,
								attemptCount: row.attemptIndex,
								updatedAt: capturedAt,
							})
							.where(
								and(
									eq(schema.svLocalRankObservations.id, observationId),
									eq(schema.svLocalRankObservations.organizationId, row.organizationId),
									eq(schema.svLocalRankObservations.outcome, "PENDING"),
								),
							);
						await tx.insert(schema.svLocalEvidenceAcceptances).values({
							organizationId: row.organizationId,
							observationId,
							evidenceId,
							evidenceSha256: digest(resultCanonical),
						});
					}
				} else if (finalizedDisposition.observationOutcome !== "RETRY_PENDING") {
					const outcome =
						finalizedDisposition.observationOutcome === "PROVIDER_BLOCKED"
							? "BLOCKED"
							: finalizedDisposition.observationOutcome === "UNKNOWN_RECONCILIATION"
								? "UNKNOWN"
								: "INVALID";
					const validity = outcome === "INVALID" ? "INVALID" : "UNMEASURED";
					await tx
						.update(schema.svLocalRankObservations)
						.set({
							outcome,
							validity,
							targetRank: null,
							capturedAt: outcome === "BLOCKED" ? null : new Date(result.completedAt),
							invalidReason:
								outcome === "BLOCKED"
									? "PROVIDER_BLOCKED"
									: (finalizedDisposition.finalInvalidReason ?? "PROVIDER_OUTCOME_UNKNOWN"),
							attemptCount: row.attemptIndex,
							updatedAt: new Date(result.completedAt),
						})
						.where(
							and(
								eq(schema.svLocalRankObservations.id, observationId),
								eq(schema.svLocalRankObservations.organizationId, row.organizationId),
								eq(schema.svLocalRankObservations.outcome, "PENDING"),
							),
						);
				}
				const [cycleState] = await tx
					.select({ executionMode: schema.svLocalScanCycles.executionMode, status: schema.svLocalScanCycles.status })
					.from(schema.svLocalScanCycles)
					.where(
						and(
							eq(schema.svLocalScanCycles.id, candidate.scope.localCycleId),
							eq(schema.svLocalScanCycles.organizationId, row.organizationId),
						),
					)
					.limit(1);
				if (
					cycleState &&
					!["BUDGET_BLOCKED", "STOPPED"].includes(cycleState.status) &&
					finalizedDisposition.observationOutcome !== "RETRY_PENDING"
				) {
					const counts = await tx.execute(
						sql`select count(*) filter (where outcome='PENDING')::int as pending, count(*) filter (where outcome='UNKNOWN')::int as unknown, count(*) filter (where outcome in ('INVALID','BLOCKED'))::int as failed from sv_local_rank_observations where organization_id=${row.organizationId} and cycle_id=${candidate.scope.localCycleId}`,
					);
					const state = (counts.rows[0] ?? {}) as { pending?: number; unknown?: number; failed?: number };
					const nextStatus =
						Number(state.unknown ?? 0) > 0
							? "UNKNOWN_RECONCILIATION"
							: Number(state.pending ?? 0) > 0
								? cycleState.status
								: cycleState.executionMode === "CANARY"
									? "CANARY_REVIEW"
									: Number(state.failed ?? 0) > 0
										? "PARTIAL_FAILURE"
										: "QC_REQUIRED";
					if (nextStatus !== cycleState.status)
						await tx
							.update(schema.svLocalScanCycles)
							.set({ status: nextStatus, updatedAt: new Date(result.completedAt) })
							.where(
								and(
									eq(schema.svLocalScanCycles.id, candidate.scope.localCycleId),
									eq(schema.svLocalScanCycles.organizationId, row.organizationId),
								),
							);
					if (nextStatus === "UNKNOWN_RECONCILIATION")
						await cancelLocalPendingInTransaction(tx, row.organizationId, candidate.scope.localCycleId);
				}
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
				if (!row.localObservationId) throw new Error("LOCAL_MAPS_OBSERVATION_LINK_REQUIRED");
				const [localCycle] = await tx
					.select({ id: schema.svLocalScanCycles.id })
					.from(schema.svLocalScanCycles)
					.where(
						and(
							eq(schema.svLocalScanCycles.measurementCycleId, row.measurementCycleId),
							eq(schema.svLocalScanCycles.organizationId, row.organizationId),
						),
					)
					.for("update");
				if (!localCycle) throw new Error("LOCAL_CYCLE_NOT_FOUND");
				await tx
					.update(schema.svLocalRankObservations)
					.set({
						outcome: "UNKNOWN",
						validity: "UNMEASURED",
						targetRank: null,
						capturedAt: completedAt,
						invalidReason: input.reason,
						attemptCount: row.attemptIndex,
						updatedAt: completedAt,
					})
					.where(
						and(
							eq(schema.svLocalRankObservations.id, row.localObservationId),
							eq(schema.svLocalRankObservations.organizationId, row.organizationId),
							eq(schema.svLocalRankObservations.outcome, "PENDING"),
						),
					);
				await tx
					.update(schema.svLocalScanCycles)
					.set({ status: "UNKNOWN_RECONCILIATION", updatedAt: completedAt })
					.where(
						and(
							eq(schema.svLocalScanCycles.id, localCycle.id),
							eq(schema.svLocalScanCycles.organizationId, row.organizationId),
						),
					);
				// The provider boundary has been crossed for this attempt, so retain
				// its reservation for reconciliation but cancel every untouched slot.
				await cancelLocalPendingInTransaction(tx, row.organizationId, localCycle.id);
				return { kind: "MARKED_UNKNOWN" as const };
			});
		},
	};
}

export const localMapsAttemptStoreRlsDefault = async (tx: Tx, organizationId: string): Promise<void> => {
	await tx.execute(sql`select set_config('app.organization_id', ${organizationId}, true)`);
};

export type { LocalMapsUnknownReason };
