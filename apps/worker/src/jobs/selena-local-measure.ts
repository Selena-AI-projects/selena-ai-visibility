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
	observationId: string;
	attemptId: string;
}

export interface SelenaLocalMeasureResult {
	status:
		| "FINALIZED"
		| "NOT_CALLED"
		| "UNKNOWN_RECONCILIATION"
		| "FINAL_STATE_ALREADY_PERSISTED"
		| "UNKNOWN_PERSISTENCE_FAILED";
	providerCalls: 0 | 1;
	reason: string;
}

export type SelenaLocalMeasureExecutor = (data: SelenaLocalMeasureData) => Promise<SelenaLocalMeasureResult>;

/**
 * Safe default: registering a queue consumer must never imply that a Local
 * provider, database writer or paid path is active. Runtime wiring has to
 * inject an owner-approved executor explicitly in a later slice.
 */
export const ownerGatedLocalMeasureExecutor: SelenaLocalMeasureExecutor = async () => ({
	status: "NOT_CALLED",
	providerCalls: 0,
	reason: "LOCAL_MAPS_PROVIDER_CONFIGURATION_REQUIRED",
});

let defaultExecutorPromise: Promise<SelenaLocalMeasureExecutor> | undefined;
async function defaultExecutor(): Promise<SelenaLocalMeasureExecutor> {
	// Keep imports lazy so unit tests can exercise the queue contract without a
	// DATABASE_URL or provider credential. Production local-index supplies the
	// configured runtime and fails closed when its env is incomplete.
	if (!defaultExecutorPromise)
		defaultExecutorPromise = import("../local-runtime-executor.js").then((module) =>
			module.configuredLocalMeasureExecutor(),
		);
	return defaultExecutorPromise;
}

/**
 * Consume Local jobs without acknowledging a false measurement. The default
 * executor returns a typed owner gate and performs no I/O; this function is a
 * seam for a future transaction-owned implementation, not a live provider
 * runner.
 */
export async function selenaLocalMeasureJob(
	jobs: Job<SelenaLocalMeasureData>[],
	executor?: SelenaLocalMeasureExecutor,
): Promise<void> {
	for (const job of jobs) {
		const activeExecutor = executor ?? (await defaultExecutor());
		const result = await activeExecutor(job.data);
		if (result.status === "UNKNOWN_PERSISTENCE_FAILED") throw new Error(`${result.reason}:${job.data.localCycleId}`);
		console.warn(
			`[selena-local-measure] ${job.data.localCycleId}: ${result.status} (${result.reason}); providerCalls=${result.providerCalls}`,
		);
	}
}
