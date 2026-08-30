import { createHash } from "node:crypto";
import {
	assertLocalMapsRehearsalResultMatchesRequest,
	type LocalMapsRehearsalAdapter,
	type LocalMapsRehearsalRequest,
	localMapsRehearsalDeterministicOutcome,
	localMapsRehearsalRequestSchema,
	localMapsRehearsalResultSchema,
	STUB_LOCAL_MAPS_ADAPTER_ID,
} from "@workspace/selena-visibility-contracts";

type RehearsalSnapshot = Omit<LocalMapsRehearsalRequest, "requestSnapshotDigest">;

function snapshotDigest(snapshot: RehearsalSnapshot): string {
	return `sha256:${createHash("sha256").update(JSON.stringify(snapshot)).digest("hex")}`;
}

export function createLocalMapsRehearsalRequest(snapshot: RehearsalSnapshot): LocalMapsRehearsalRequest {
	const provisional = localMapsRehearsalRequestSchema.parse({
		...snapshot,
		requestSnapshotDigest: `sha256:${"0".repeat(64)}`,
	});
	const { requestSnapshotDigest: _provisionalDigest, ...canonicalSnapshot } = provisional;
	return localMapsRehearsalRequestSchema.parse({
		...canonicalSnapshot,
		requestSnapshotDigest: snapshotDigest(canonicalSnapshot),
	});
}

function assertRequestSnapshotIntegrity(input: LocalMapsRehearsalRequest): LocalMapsRehearsalRequest {
	const request = localMapsRehearsalRequestSchema.parse(input);
	const { requestSnapshotDigest, ...snapshot } = request;
	if (snapshotDigest(snapshot) !== requestSnapshotDigest) throw new Error("LOCAL_MAPS_REHEARSAL_SNAPSHOT_TAMPERED");
	return request;
}

/**
 * Deterministic, transport-free rehearsal only. Its result type is disjoint
 * from live provider evidence and no worker or package export registers it.
 */
export function createStubLocalMapsAdapter(): LocalMapsRehearsalAdapter {
	return {
		id: STUB_LOCAL_MAPS_ADAPTER_ID,
		kind: "REHEARSAL_ONLY",
		async execute(input) {
			const request = assertRequestSnapshotIntegrity(input);
			const outcome = localMapsRehearsalDeterministicOutcome(request.requestSnapshotDigest, request.lock.request.depth);
			const result = localMapsRehearsalResultSchema.parse({
				schemaVersion: 1,
				kind: "LOCAL_MAPS_REHEARSAL_RESULT",
				mode: "SYNTHETIC_TEST_ONLY",
				adapterId: STUB_LOCAL_MAPS_ADAPTER_ID,
				simulatedProviderId: request.lock.provider.id,
				executionKey: request.slot.executionKey,
				requestSnapshotDigest: request.requestSnapshotDigest,
				requestCoordinate: {
					pointId: request.slot.pointId,
					latitude: request.slot.latitude,
					longitude: request.slot.longitude,
				},
				keywordId: request.keyword.id,
				persistable: false,
				evidenceEligible: false,
				externalProviderCalls: 0,
				providerTaskId: null,
				costUsd: "0.000000",
				rawReference: `stub-local-maps:${request.requestSnapshotDigest}`,
				event: outcome.event,
				targetRank: outcome.targetRank,
			});
			return assertLocalMapsRehearsalResultMatchesRequest(request, result);
		},
	};
}
