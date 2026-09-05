import { localMapsLiveSubmittedCandidateSchema } from "@workspace/selena-visibility-contracts";
import {
	buildLocalMapsSubmittedCandidateFromDatabase,
	createLocalMapsLiveAttemptStore,
	type LocalMapsAttemptStoreDependencies,
} from "@workspace/lib/selena-local-maps-attempt-store";
import {
	type LocalMapsLiveAttemptStore,
	type LocalMapsLiveProviderPort,
	type LocalMapsLiveRunnerResult,
	runLocalMapsLiveAttempt,
} from "@workspace/lib/selena-local-maps-live-runner";
import type { Job } from "pg-boss";

/**
 * Payload for one explicitly approved Local Visibility cycle dispatch.
 *
 * This boundary is intentionally narrower than the legacy `selena-measure`
 * job. It carries only immutable cycle scope; a runtime implementation must
 * load and validate the committed Lock/permit inside a tenant transaction.
 */
export interface SelenaLocalMeasureData {
	measurementCycleId: string;
	localCycleId: string;
	organizationId: string;
	attemptId: string;
	actorId?: string;
}

export type SelenaLocalMeasureResult =
	| {
			status: "OWNER_GATE_REQUIRED";
			providerCalls: 0;
			reason: "LOCAL_RUNTIME_EXECUTOR_NOT_REGISTERED";
	  }
	| {
			status: "EXECUTED";
			providerCalls: 0 | 1 | "UNKNOWN";
			reason: LocalMapsLiveRunnerResult["kind"];
	  };

export type SelenaLocalMeasureExecutor = (data: SelenaLocalMeasureData) => Promise<SelenaLocalMeasureResult>;

type CandidateBuilder = LocalMapsAttemptStoreDependencies["buildCandidate"];

export type SelenaLocalMeasureExecutorDependencies = Omit<LocalMapsAttemptStoreDependencies, "buildCandidate"> & {
	provider: LocalMapsLiveProviderPort;
	buildCandidate?: CandidateBuilder;
	now?: () => Date;
	createStore?: (dependencies: LocalMapsAttemptStoreDependencies) => LocalMapsLiveAttemptStore;
};

type LocalMeasureScope = Pick<SelenaLocalMeasureData, "organizationId" | "measurementCycleId" | "localCycleId" | "attemptId">;

function localMeasureScope(data: SelenaLocalMeasureData): LocalMeasureScope {
	const scope = {
		organizationId: data.organizationId.trim(),
		measurementCycleId: data.measurementCycleId.trim(),
		localCycleId: data.localCycleId.trim(),
		attemptId: data.attemptId.trim(),
	};
	if (Object.values(scope).some((value) => value.length === 0)) throw new Error("LOCAL_MEASURE_SCOPE_REQUIRED");
	return scope;
}

function assertCandidateMatchesJobScope(candidateInput: unknown, scope: LocalMeasureScope) {
	let candidate: ReturnType<typeof localMapsLiveSubmittedCandidateSchema.parse>;
	try {
		candidate = localMapsLiveSubmittedCandidateSchema.parse(candidateInput);
	} catch {
		// A malformed candidate is a scope violation at this queue boundary;
		// do not leak schema details or let it reach the provider port.
		throw new Error("LOCAL_MEASURE_ATTEMPT_SCOPE_MISMATCH");
	}
	if (
		candidate.scope.organizationId !== scope.organizationId ||
		candidate.scope.measurementCycleId !== scope.measurementCycleId ||
		candidate.scope.localCycleId !== scope.localCycleId ||
		candidate.attempt.attemptId !== scope.attemptId
	)
		throw new Error("LOCAL_MEASURE_ATTEMPT_SCOPE_MISMATCH");
	return candidate;
}

function providerCallsFor(result: LocalMapsLiveRunnerResult): 0 | 1 | "UNKNOWN" {
	if (result.kind === "NOT_CALLED") return 0;
	if (result.kind === "FINALIZED") return 1;
	return "UNKNOWN";
}

/**
 * Builds one transaction-owned Local executor from an injected provider port.
 * The store commits and validates the frozen attempt before the runner can
 * call that port. This factory is deliberately not registered by default.
 */
export function createSelenaLocalMeasureExecutor(
	dependencies: SelenaLocalMeasureExecutorDependencies,
): SelenaLocalMeasureExecutor {
	const {
		provider,
		now = () => new Date(),
		createStore = createLocalMapsLiveAttemptStore,
		buildCandidate = buildLocalMapsSubmittedCandidateFromDatabase,
		...storeDependencies
	} = dependencies;

	return async (data) => {
		const scope = localMeasureScope(data);
		const store = createStore({
			...storeDependencies,
			buildCandidate: async (input) => assertCandidateMatchesJobScope(await buildCandidate(input), scope),
		});
		const result = await runLocalMapsLiveAttempt({
			intent: { organizationId: scope.organizationId, attemptId: scope.attemptId },
			store,
			provider,
			now,
		});
		return { status: "EXECUTED", providerCalls: providerCallsFor(result), reason: result.kind };
	};
}

/**
 * Safe default: registering a queue consumer must never imply that a Local
 * provider, database writer or paid path is active. Runtime wiring has to
 * inject an owner-approved executor explicitly in a later slice.
 */
export const ownerGatedLocalMeasureExecutor: SelenaLocalMeasureExecutor = async () => ({
	status: "OWNER_GATE_REQUIRED",
	providerCalls: 0,
	reason: "LOCAL_RUNTIME_EXECUTOR_NOT_REGISTERED",
});

/**
 * Consume Local jobs without acknowledging a false measurement. The default
 * executor returns a typed owner gate and performs no I/O; this function is a
 * seam for a future transaction-owned implementation, not a live provider
 * runner.
 */
export async function selenaLocalMeasureJob(
	jobs: Job<SelenaLocalMeasureData>[],
	executor: SelenaLocalMeasureExecutor = ownerGatedLocalMeasureExecutor,
): Promise<void> {
	for (const job of jobs) {
		const result = await executor(job.data);
		// Do not let pg-boss acknowledge an owner-gated job as a successful
		// measurement. With queue retries disabled, the failed job remains an
		// explicit operational signal until an approved executor is wired.
		if (result.status === "OWNER_GATE_REQUIRED") {
			throw new Error(`${result.reason}:${job.data.localCycleId}`);
		}
		console.warn(
			`[selena-local-measure] ${job.data.localCycleId}: ${result.status} (${result.reason}); providerCalls=${result.providerCalls}`,
		);
	}
}
