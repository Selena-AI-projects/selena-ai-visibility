import { createHash } from "node:crypto";
import {
	assertLocalMapsRehearsalResultMatchesRequest,
	type LocalMapsRehearsalAdapter,
	type LocalMapsRehearsalRequest,
	localMapsRehearsalDeterministicOutcome,
	localMapsRehearsalRequestSchema,
	localMapsRehearsalResultSchema,
	maximumProviderAttempts,
	mapsLockV1Schema,
	type LocalMapsRankAdapter,
	type LocalMapsRankCapability,
	type LocalMapsRankQuote,
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

type DisabledLocalMapsRankResult = { readonly disabled: true };

/**
 * Type-shaped rehearsal guard for the normative live adapter boundary. It is
 * deliberately impossible to dispatch: the reserved `stub-` id is rejected
 * by the live request schema, and execute/normalize fail before any I/O. The
 * deterministic result-producing rehearsal remains `createStubLocalMapsAdapter`.
 */
export function createDisabledLocalMapsRankAdapter(): LocalMapsRankAdapter<DisabledLocalMapsRankResult> {
	return {
		id: STUB_LOCAL_MAPS_ADAPTER_ID,
		version: "rehearsal-only-v1",
		endpoint: "disabled://local-maps",
		quote(lock): LocalMapsRankQuote {
			const parsed = mapsLockV1Schema.parse(lock);
			return {
				tasks: parsed.expectedSlots,
				maxProviderAttempts: maximumProviderAttempts(parsed.expectedSlots),
				worstCaseCostUsd: parsed.budget.worstCaseCostUsd,
				currency: "USD",
				priceSnapshotVersion: parsed.budget.priceSnapshotVersion,
			};
		},
		async execute(): Promise<DisabledLocalMapsRankResult> {
			throw new Error("LOCAL_MAPS_REHEARSAL_NOT_LIVE");
		},
		normalize(): ReturnType<LocalMapsRankAdapter<DisabledLocalMapsRankResult>["normalize"]> {
			throw new Error("LOCAL_MAPS_REHEARSAL_NOT_LIVE");
		},
		capability(): LocalMapsRankCapability {
			return {
				coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED",
				rawEvidenceReference: "REQUIRED",
				supportsAbsentWithinDepth: true,
				maxDepth: 20,
			};
		},
	};
}
