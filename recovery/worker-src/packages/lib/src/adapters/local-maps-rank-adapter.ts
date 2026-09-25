import {
	assertLocalMapsRankCapabilitySupportsTask,
	assertLocalMapsRankCoordinateProofMatchesTask,
	type LocalMapsRankAdapter,
	type LocalMapsRankRunnerObservation,
	localMapsRankCapabilitySchema,
	localMapsRankPermitSchema,
} from "@workspace/selena-visibility-contracts";
import type { LocalMapsLiveProviderPort } from "../selena-local-maps-live-runner";

/**
 * Bridges the normative Delta adapter shape to the runner's provider port.
 * Construction validates only static capability metadata; `execute` is called
 * solely by the runner after a store-committed spend permit exists.
 *
 * No adapter is registered here, and this function performs no network or
 * database work by itself.
 */
export function toLocalMapsLiveProviderPort<TRawResult>(
	adapter: LocalMapsRankAdapter<TRawResult>,
): LocalMapsLiveProviderPort {
	if (!/^\S+$/.test(adapter.id) || !/^\S+$/.test(adapter.version) || !/^\S+$/.test(adapter.endpoint))
		throw new Error("LOCAL_MAPS_RANK_ADAPTER_METADATA_INVALID");
	const capability = localMapsRankCapabilitySchema.parse(adapter.capability());
	return {
		id: adapter.id,
		version: adapter.version,
		endpoint: adapter.endpoint,
		async execute(request, context) {
			assertLocalMapsRankCapabilitySupportsTask(request, capability);
			const permit = localMapsRankPermitSchema.parse({
				organizationId: context.organizationId,
				attemptId: context.attemptId,
				reservationId: context.reservationId,
				executionKey: context.executionKey,
				attemptIndex: context.attemptIndex,
			});
			const normalized = adapter.normalize(await adapter.execute(request, permit));
			assertLocalMapsRankCoordinateProofMatchesTask(request, normalized.coordinateProof);
			const { coordinateProof: _coordinateProof, ...runnerObservation } = normalized;
			return runnerObservation satisfies LocalMapsRankRunnerObservation;
		},
	};
}
