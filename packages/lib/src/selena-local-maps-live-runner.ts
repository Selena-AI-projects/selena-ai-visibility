import {
	assertLocalMapsLiveResultMatchesCandidate,
	attemptDisposition,
	canonicalLocalMapsProviderResult,
	type LocalMapsLiveProviderResult,
	type LocalMapsLiveSubmittedCandidate,
	type LocalMapsMaterializedProviderRequest,
	localMapsLiveProviderResultSchema,
	localMapsLiveSubmittedCandidateSchema,
} from "@workspace/selena-visibility-contracts";
import { z } from "zod";

const localMapsLiveDispatchIntentSchema = z.strictObject({
	organizationId: z.string().trim().min(1),
	attemptId: z.string().uuid(),
});
const commitTokenSchema = z.string().min(1).regex(/^\S+$/);
export type LocalMapsLiveDispatchIntent = z.infer<typeof localMapsLiveDispatchIntentSchema>;

export type LocalMapsSubmittedCommit = {
	commitToken: string;
	organizationId: string;
	attemptId: string;
	reservationId: string;
	executionKey: string;
	rowVersion: number;
	snapshot: LocalMapsLiveSubmittedCandidate;
};

const submittedContinuationBrand: unique symbol = Symbol("submittedContinuation");
type SubmittedContinuation = {
	readonly [submittedContinuationBrand]: true;
	commitToken: string;
	organizationId: string;
	attemptId: string;
	reservationId: string;
	executionKey: string;
	rowVersion: number;
};

export type LocalMapsAcquireDecision =
	| { kind: "READY"; committed: LocalMapsSubmittedCommit }
	| { kind: "BUSY" }
	| { kind: "RECONCILIATION_REQUIRED" }
	| { kind: "DONE" };

export type LocalMapsUnknownReason =
	| "COMMITTED_SNAPSHOT_INVALID"
	| "PROVIDER_CALL_THROWN"
	| "PROVIDER_RESULT_INVALID"
	| "FINALIZE_AMBIGUOUS"
	| "FINALIZE_POSTCONDITION_MISMATCH"
	| "ESTIMATED_ZERO_COST_UNRECONCILED";

export type LocalMapsLiveAttemptStore = {
	/**
	 * Future implementations must perform tenant/RLS checks, verify every
	 * cycle/lock/retry relationship, atomically reserve aggregate budget and
	 * commit CLAIMED -> SUBMITTED before returning a fresh READY exactly once.
	 * Continuations must be unforgeable, single-use and transactionally checked
	 * against every supplied tenant/attempt/reservation/version field.
	 */
	acquireAndCommitSubmitted(intent: LocalMapsLiveDispatchIntent, now: Date): Promise<LocalMapsAcquireDecision>;
	finalizeSubmitted(input: {
		continuation: SubmittedContinuation;
		result: LocalMapsLiveProviderResult;
		disposition: ReturnType<typeof attemptDisposition>;
		budgetIncident: "REPORTED_COST_EXCEEDS_RESERVATION" | null;
		requiredBudgetState: "RESERVED" | "SPENT" | "RELEASED";
	}): Promise<{
		kind: "FINALIZED";
		persistedResult: LocalMapsLiveProviderResult;
		persistedBudgetState: "RESERVED" | "SPENT" | "RELEASED";
	}>;
	/** Must keep the reservation exposed until a separate reconciliation. */
	markSubmittedUnknown(input: {
		continuation: SubmittedContinuation;
		reason: LocalMapsUnknownReason;
		completedAt: Date;
	}): Promise<{ kind: "MARKED_UNKNOWN" | "ALREADY_FINALIZED" }>;
};

export type LocalMapsLiveProviderPort = {
	id: string;
	version: string;
	endpoint: string;
	execute(
		request: LocalMapsMaterializedProviderRequest,
		context: {
			organizationId: string;
			attemptId: string;
			reservationId: string;
			executionKey: string;
			attemptIndex: 1 | 2 | 3;
			lockSnapshotCanonical: string;
			requestSnapshotCanonical: string;
		},
	): Promise<unknown>;
};

const rawProviderObservationSchema = z.strictObject({
	providerTaskId: z.unknown(),
	event: z.unknown(),
	targetRank: z.unknown(),
	evidenceEligible: z.unknown(),
	provenance: z.unknown(),
	cost: z.unknown(),
});

export type LocalMapsLiveRunnerResult =
	| { kind: "NOT_CALLED"; reason: "BUSY" | "RECONCILIATION_REQUIRED" | "DONE" }
	| {
			kind: "FINALIZED";
			result: LocalMapsLiveProviderResult;
			disposition: ReturnType<typeof attemptDisposition>;
			budgetIncident: "REPORTED_COST_EXCEEDS_RESERVATION" | null;
	  }
	| { kind: "UNKNOWN_RECONCILIATION"; reason: LocalMapsUnknownReason }
	| { kind: "UNKNOWN_PERSISTENCE_FAILED"; reason: LocalMapsUnknownReason }
	| { kind: "FINAL_STATE_ALREADY_PERSISTED"; reason: LocalMapsUnknownReason };

function validNow(now: Date): Date {
	if (!Number.isFinite(now.getTime())) throw new Error("LOCAL_MAPS_LIVE_NOW_INVALID");
	return now;
}

async function persistUnknown(
	store: LocalMapsLiveAttemptStore,
	continuation: SubmittedContinuation,
	reason: LocalMapsUnknownReason,
	now: () => Date,
): Promise<LocalMapsLiveRunnerResult> {
	try {
		const outcome = await store.markSubmittedUnknown({ continuation, reason, completedAt: validNow(now()) });
		if (outcome.kind === "ALREADY_FINALIZED") return { kind: "FINAL_STATE_ALREADY_PERSISTED", reason };
		return { kind: "UNKNOWN_RECONCILIATION", reason };
	} catch {
		return { kind: "UNKNOWN_PERSISTENCE_FAILED", reason };
	}
}

/**
 * Executes at most one provider call for one store-committed SUBMITTED attempt.
 * This module is intentionally not package-exported or registered with a worker.
 */
export async function runLocalMapsLiveAttempt(input: {
	intent: LocalMapsLiveDispatchIntent;
	store: LocalMapsLiveAttemptStore;
	provider: LocalMapsLiveProviderPort;
	now: () => Date;
}): Promise<LocalMapsLiveRunnerResult> {
	const acquiredAt = validNow(input.now());
	const intent = localMapsLiveDispatchIntentSchema.parse(input.intent);
	const decision = await input.store.acquireAndCommitSubmitted(intent, acquiredAt);
	if (decision.kind !== "READY") return { kind: "NOT_CALLED", reason: decision.kind };

	const parsedCommitToken = commitTokenSchema.safeParse(decision.committed.commitToken);
	if (!parsedCommitToken.success) return { kind: "UNKNOWN_PERSISTENCE_FAILED", reason: "COMMITTED_SNAPSHOT_INVALID" };
	let snapshot: LocalMapsLiveSubmittedCandidate;
	try {
		snapshot = localMapsLiveSubmittedCandidateSchema.parse(decision.committed.snapshot);
		const validationAt = validNow(input.now());
		if (
			decision.committed.organizationId !== snapshot.scope.organizationId ||
			decision.committed.attemptId !== snapshot.attempt.attemptId ||
			decision.committed.reservationId !== snapshot.attempt.reservationId ||
			decision.committed.executionKey !== snapshot.attempt.executionKey ||
			!Number.isSafeInteger(decision.committed.rowVersion) ||
			decision.committed.rowVersion < 1 ||
			snapshot.scope.organizationId !== intent.organizationId ||
			snapshot.attempt.attemptId !== intent.attemptId ||
			input.provider.id !== snapshot.providerRequest.provider.id ||
			input.provider.version !== snapshot.providerRequest.provider.version ||
			input.provider.endpoint !== snapshot.providerRequest.provider.endpoint ||
			new Date(snapshot.attempt.submittedAt).getTime() > validationAt.getTime() ||
			new Date(snapshot.attempt.leaseExpiresAt).getTime() <= validationAt.getTime() ||
			validationAt.getTime() >= new Date(snapshot.lock.timestampWindow.endsAt).getTime()
		)
			throw new Error("LOCAL_MAPS_LIVE_COMMITTED_SNAPSHOT_INVALID");
	} catch {
		return { kind: "UNKNOWN_PERSISTENCE_FAILED", reason: "COMMITTED_SNAPSHOT_INVALID" };
	}
	const continuation: SubmittedContinuation = {
		[submittedContinuationBrand]: true,
		commitToken: parsedCommitToken.data,
		organizationId: snapshot.scope.organizationId,
		attemptId: snapshot.attempt.attemptId,
		reservationId: snapshot.attempt.reservationId,
		executionKey: snapshot.attempt.executionKey,
		rowVersion: decision.committed.rowVersion,
	};
	const dispatchAt = validNow(input.now());
	if (
		new Date(snapshot.attempt.submittedAt).getTime() > dispatchAt.getTime() ||
		new Date(snapshot.attempt.leaseExpiresAt).getTime() <= dispatchAt.getTime() ||
		dispatchAt.getTime() >= new Date(snapshot.lock.timestampWindow.endsAt).getTime()
	)
		return persistUnknown(input.store, continuation, "COMMITTED_SNAPSHOT_INVALID", input.now);
	let providerValue: unknown;
	try {
		providerValue = await input.provider.execute(snapshot.providerRequest, {
			organizationId: snapshot.scope.organizationId,
			attemptId: snapshot.attempt.attemptId,
			reservationId: snapshot.attempt.reservationId,
			executionKey: snapshot.attempt.executionKey,
			attemptIndex: snapshot.attempt.attemptIndex,
			lockSnapshotCanonical: snapshot.lockSnapshotCanonical,
			requestSnapshotCanonical: snapshot.requestSnapshotCanonical,
		});
	} catch {
		return persistUnknown(input.store, continuation, "PROVIDER_CALL_THROWN", input.now);
	}

	let matched: ReturnType<typeof assertLocalMapsLiveResultMatchesCandidate>;
	try {
		const receivedAt = validNow(input.now());
		const observation = rawProviderObservationSchema.parse(providerValue);
		const result = localMapsLiveProviderResultSchema.parse({
			schemaVersion: 1,
			kind: "LOCAL_MAPS_LIVE_PROVIDER_RESULT",
			mode: "LIVE_PROVIDER",
			canonicalizationVersion: snapshot.canonicalizationVersion,
			storageClass: "LIVE_ATTEMPT",
			organizationId: snapshot.scope.organizationId,
			measurementCycleId: snapshot.scope.measurementCycleId,
			localCycleId: snapshot.scope.localCycleId,
			configurationLockId: snapshot.scope.configurationLockId,
			attemptId: snapshot.attempt.attemptId,
			reservationId: snapshot.attempt.reservationId,
			executionKey: snapshot.attempt.executionKey,
			attemptIndex: snapshot.attempt.attemptIndex,
			lockSnapshotCanonical: snapshot.lockSnapshotCanonical,
			requestSnapshotCanonical: snapshot.requestSnapshotCanonical,
			provider: {
				id: snapshot.providerRequest.provider.id,
				version: snapshot.providerRequest.provider.version,
				providerTaskId: observation.providerTaskId,
			},
			externalProviderCalls: 1,
			completedAt: receivedAt.toISOString(),
			event: observation.event,
			targetRank: observation.targetRank,
			evidenceEligible: observation.evidenceEligible,
			provenance: observation.provenance,
			cost: observation.cost,
		});
		matched = assertLocalMapsLiveResultMatchesCandidate(snapshot, result);
		const observedAt = matched.result.provenance.providerObservedAt;
		if (
			observedAt !== null &&
			(new Date(observedAt) < dispatchAt ||
				new Date(observedAt) < new Date(snapshot.lock.timestampWindow.startsAt) ||
				new Date(observedAt) >= new Date(snapshot.lock.timestampWindow.endsAt))
		)
			throw new Error("LOCAL_MAPS_LIVE_OBSERVATION_OUTSIDE_LOCK_WINDOW");
	} catch {
		return persistUnknown(input.store, continuation, "PROVIDER_RESULT_INVALID", input.now);
	}

	const disposition = attemptDisposition(snapshot.attempt.attemptIndex, matched.result.event);
	const isKnownZero = matched.result.cost.status === "KNOWN" && /^0(?:\.0{1,6})?$/.test(matched.result.cost.amountUsd);
	if (isKnownZero && matched.result.cost.status === "KNOWN" && matched.result.cost.basis === "estimated")
		return persistUnknown(input.store, continuation, "ESTIMATED_ZERO_COST_UNRECONCILED", input.now);
	const requiredBudgetState =
		matched.result.cost.status === "UNKNOWN" ? "RESERVED" : isKnownZero ? "RELEASED" : "SPENT";
	let finalized: Awaited<ReturnType<LocalMapsLiveAttemptStore["finalizeSubmitted"]>>;
	try {
		finalized = await input.store.finalizeSubmitted({
			continuation,
			result: matched.result,
			disposition,
			budgetIncident: matched.budgetIncident,
			requiredBudgetState,
		});
	} catch {
		return persistUnknown(input.store, continuation, "FINALIZE_AMBIGUOUS", input.now);
	}
	try {
		const persisted = localMapsLiveProviderResultSchema.parse(finalized.persistedResult);
		const budgetStateMatches = finalized.persistedBudgetState === requiredBudgetState;
		if (
			canonicalLocalMapsProviderResult(persisted) !== canonicalLocalMapsProviderResult(matched.result) ||
			!budgetStateMatches
		)
			return { kind: "FINAL_STATE_ALREADY_PERSISTED", reason: "FINALIZE_POSTCONDITION_MISMATCH" };
	} catch {
		return { kind: "FINAL_STATE_ALREADY_PERSISTED", reason: "FINALIZE_POSTCONDITION_MISMATCH" };
	}
	return {
		kind: "FINALIZED",
		result: matched.result,
		disposition,
		budgetIncident: matched.budgetIncident,
	};
}
