import { createDataForSeoLocalMapsRankAdapter } from "@workspace/lib/adapters/dataforseo-local-maps-rank";
import { createHttpLocalMapsRankAdapter } from "@workspace/lib/adapters/http-local-maps-rank";
import { toLocalMapsLiveProviderPort } from "@workspace/lib/adapters/local-maps-rank";
import { db } from "@workspace/lib/db/db";
import {
	buildLocalMapsSubmittedCandidateFromDatabase,
	createLocalMapsLiveAttemptStore,
	localMapsAttemptStoreRlsDefault,
} from "@workspace/lib/selena-local-maps-attempt-store";
import { runLocalMapsLiveAttempt } from "@workspace/lib/selena-local-maps-live-runner";
import type {
	SelenaLocalMeasureData,
	SelenaLocalMeasureExecutor,
	SelenaLocalMeasureResult,
} from "./jobs/selena-local-measure";

let cached: SelenaLocalMeasureExecutor | undefined;

function leaseDurationMs(env: Record<string, string | undefined>): number {
	const value = Number(env.SELENA_LOCAL_PROVIDER_LEASE_DURATION_MS ?? "");
	if (!Number.isSafeInteger(value) || value < 10_000 || value > 900_000)
		throw new Error("LOCAL_MAPS_LEASE_POLICY_REQUIRED");
	return value;
}

/** Build the live executor only from explicit owner-provided deployment config. */
export function createConfiguredLocalMeasureExecutor(
	env: Record<string, string | undefined> = process.env,
): SelenaLocalMeasureExecutor {
	const provider =
		env.SELENA_LOCAL_MAPS_PROVIDER_ID === "dataforseo-google-maps"
			? toLocalMapsLiveProviderPort(createDataForSeoLocalMapsRankAdapter(env))
			: toLocalMapsLiveProviderPort(createHttpLocalMapsRankAdapter(env));
	const store = createLocalMapsLiveAttemptStore({
		db,
		executionControls: () => process.env,
		setTenantContext: localMapsAttemptStoreRlsDefault,
		buildCandidate: buildLocalMapsSubmittedCandidateFromDatabase,
		claimReservedBudget: async ({ attempt }) => {
			if (attempt.budgetState !== "RESERVED") throw new Error("LOCAL_MAPS_RESERVATION_NOT_AVAILABLE");
		},
		leaseDurationMs: leaseDurationMs(env),
	});
	return async (data: SelenaLocalMeasureData): Promise<SelenaLocalMeasureResult> => {
		const result = await runLocalMapsLiveAttempt({
			intent: { organizationId: data.organizationId, attemptId: data.attemptId },
			store,
			provider,
			now: () => new Date(),
		});
		switch (result.kind) {
			case "FINALIZED":
				return { status: "FINALIZED", providerCalls: 1, reason: result.result.event.kind };
			case "NOT_CALLED":
				return { status: "NOT_CALLED", providerCalls: 0, reason: result.reason };
			case "UNKNOWN_RECONCILIATION":
				return { status: "UNKNOWN_RECONCILIATION", providerCalls: 1, reason: result.reason };
			case "FINAL_STATE_ALREADY_PERSISTED":
				return { status: "FINAL_STATE_ALREADY_PERSISTED", providerCalls: 1, reason: result.reason };
			case "UNKNOWN_PERSISTENCE_FAILED":
				return { status: "UNKNOWN_PERSISTENCE_FAILED", providerCalls: 1, reason: result.reason };
		}
		throw new Error("LOCAL_MAPS_RUNNER_RESULT_UNHANDLED");
	};
}

export function configuredLocalMeasureExecutor(): SelenaLocalMeasureExecutor {
	if (!cached) cached = createConfiguredLocalMeasureExecutor();
	return cached;
}
