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
	actorId?: string;
}

export interface SelenaLocalMeasureResult {
	status: "OWNER_GATE_REQUIRED";
	providerCalls: 0;
	reason: "LOCAL_RUNTIME_EXECUTOR_NOT_REGISTERED";
}

export type SelenaLocalMeasureExecutor = (data: SelenaLocalMeasureData) => Promise<SelenaLocalMeasureResult>;

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
