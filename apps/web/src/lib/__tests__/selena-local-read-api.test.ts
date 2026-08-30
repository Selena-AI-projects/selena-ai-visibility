import { localAiTaskContextHash } from "@workspace/selena-visibility-contracts";
import { describe, expect, it, vi } from "vitest";
import {
	createSelenaLocalReadApi,
	createSelenaLocalReadRouteHandlers,
	type LocalReadAiEvidenceRow,
	type LocalReadAiPilot,
	type LocalReadAiPilotLookup,
	type LocalReadAiTaskAssetRow,
	type LocalReadCycle,
	type LocalReadEvidenceRow,
	type LocalReadMapRow,
	type SelenaLocalReadStore,
} from "../../server/selena-local-read-api";
import { encodeSelenaApiCursor } from "../selena-api-http";

const ids = {
	cycle: "10000000-0000-4000-8000-000000000001",
	measurementCycle: "10000000-0000-4000-8000-000000000002",
	configurationLock: "10000000-0000-4000-8000-000000000015",
	project: "10000000-0000-4000-8000-000000000016",
	pilot: "10000000-0000-4000-8000-000000000017",
	pilotAmbiguous: "10000000-0000-4000-8000-000000000018",
	task: "10000000-0000-4000-8000-000000000019",
	scenario: "10000000-0000-4000-8000-000000000020",
	aiObservation: "10000000-0000-4000-8000-000000000021",
	aiEvidence: "10000000-0000-4000-8000-000000000022",
	aiCoordinateProof: "10000000-0000-4000-8000-000000000023",
	aiCoordinateProofDuplicate: "10000000-0000-4000-8000-000000000024",
	dataset: "10000000-0000-4000-8000-000000000003",
	location: "10000000-0000-4000-8000-000000000004",
	grid: "10000000-0000-4000-8000-000000000005",
	point: "10000000-0000-4000-8000-000000000006",
	keyword: "10000000-0000-4000-8000-000000000007",
	observation1: "10000000-0000-4000-8000-000000000008",
	observation2: "10000000-0000-4000-8000-000000000009",
	observation3: "10000000-0000-4000-8000-000000000010",
	evidence1: "10000000-0000-4000-8000-000000000011",
	evidence2: "10000000-0000-4000-8000-000000000012",
	evidence3: "10000000-0000-4000-8000-000000000013",
	snapshot: "10000000-0000-4000-8000-000000000014",
};

const cycle: LocalReadCycle = {
	id: ids.cycle,
	organizationId: "tenant-a",
	measurementCycleId: ids.measurementCycle,
	configurationLockId: ids.configurationLock,
	projectId: ids.project,
	configurationSnapshot: {},
	status: "RUNNING",
	expectedObservations: 5,
	createdObservations: 3,
	createdAt: new Date("2026-08-30T01:00:00.000Z"),
	updatedAt: new Date("2026-08-30T02:00:00.000Z"),
};

const localAiObserverContext = {
	observerCountryCode: "ID",
	observerGeoMode: "DECLARED_COORDINATE",
	observerLatitude: -8.506854,
	observerLongitude: 115.262482,
	pointId: ids.point,
	appLocale: "en-ID",
	queryLanguage: "en",
	deviceClass: "DESKTOP",
	accountState: "SIGNED_OUT",
	personalizationState: "UNKNOWN",
	timezone: "Asia/Makassar",
	capturedAt: "2026-08-30T02:00:00.000Z",
} as const;

function localAiSnapshot(observerContext: unknown = localAiObserverContext): unknown {
	return {
		localAiLock: {
			schemaVersion: 1,
			domainId: "LOCAL_AI",
			executionMode: "MANUAL_ONLY",
			automatedExecutionAllowed: false,
			providerAttemptsAllowed: 0,
			discovery: {
				schemaVersion: 1,
				surface: "GOOGLE_ASK_MAPS",
				captureMethod: "MANUAL_OBSERVATION",
				externalCallsAllowed: false,
				placesApiAllowed: false,
				policyVersion: "local-ai-discovery-v1",
				captureProtocolVersion: "capture-protocol-v1",
				entities: [
					{
						entityId: ids.project,
						name: "Selena",
						aliases: [],
						entityKind: "MASTER_BRAND",
						prelaunch: false,
					},
				],
				entityRelationships: [],
				businessLocations: [],
				scenarios: [
					{
						scenarioId: ids.scenario,
						queryText: "best coffee in Ubud",
						language: "en",
						targetEntityIds: [ids.project],
					},
				],
				observerContexts: [observerContext],
				repeats: 1,
				expectedObservations: 1,
				evidencePolicy: {
					queryRequired: true,
					contextRequired: true,
					timestampRequired: true,
					transcriptRequired: true,
					screenshotRequired: true,
					visibleSourcesOptional: true,
				},
			},
		},
	};
}

function acceptedAiTaskAssetRow(): LocalReadAiTaskAssetRow {
	return {
		captureTaskId: ids.task,
		scenarioId: ids.scenario,
		contextHash: localAiTaskContextHash(localAiObserverContext),
		repeatIndex: 0,
		taskStatus: "ACCEPTED",
		taskCreatedAt: new Date("2026-08-30T02:00:00.000Z"),
		taskUpdatedAt: new Date("2026-08-30T02:10:00.000Z"),
		queryTextSnapshot: "best coffee in Ubud",
		contextSnapshot: {
			...localAiObserverContext,
		},
		observationId: ids.aiObservation,
		observationCapturedAt: new Date("2026-08-30T02:05:00.000Z"),
		observationReviewStatus: "ACCEPTED",
		observationValidity: "VALID",
		observationInvalidReason: null,
		evidenceId: ids.aiEvidence,
		evidenceAssetType: "SCREENSHOT",
		evidenceSequenceIndex: 0,
		evidenceSha256: "b".repeat(64),
		evidenceCapturedAt: new Date("2026-08-30T02:05:00.000Z"),
		evidenceCreatedAt: new Date("2026-08-30T02:06:00.000Z"),
	};
}

function coordinateProofAiTaskAssetRow(): LocalReadAiTaskAssetRow {
	return {
		...acceptedAiTaskAssetRow(),
		evidenceId: ids.aiCoordinateProof,
		evidenceAssetType: "COORDINATE_PROOF",
		evidenceSequenceIndex: 1,
		evidenceSha256: "c".repeat(64),
	};
}

function pendingAiTaskAssetRow(): LocalReadAiTaskAssetRow {
	return {
		...acceptedAiTaskAssetRow(),
		taskStatus: "PENDING_CAPTURE",
		observationId: null,
		observationCapturedAt: null,
		observationReviewStatus: null,
		observationValidity: null,
		observationInvalidReason: null,
		evidenceId: null,
		evidenceAssetType: null,
		evidenceSequenceIndex: null,
		evidenceSha256: null,
		evidenceCapturedAt: null,
		evidenceCreatedAt: null,
	};
}

function acceptedAiPilot(): LocalReadAiPilot {
	return {
		id: ids.pilot,
		expectedObservations: 1,
		createdObservations: 1,
		status: "CREATED",
		updatedAt: new Date("2026-08-30T02:10:00.000Z"),
	};
}

function aiEvidenceRow(): LocalReadAiEvidenceRow {
	return {
		id: ids.aiEvidence,
		assetType: "SCREENSHOT",
		sha256: "b".repeat(64),
		capturedAt: new Date("2026-08-30T02:05:00.000Z"),
	};
}

function mapRow(
	observationId: string,
	evidenceId: string,
	capturedAt: string,
	overrides: Partial<LocalReadMapRow> = {},
): LocalReadMapRow {
	return {
		observationId,
		evidenceId,
		sourceSnapshotImmutable: true,
		sourceType: "MAPS_SERP_PROVIDER",
		sourceContentSha256: "a".repeat(64),
		sourceCapturedAt: new Date(capturedAt),
		datasetId: ids.dataset,
		measurementCycleId: ids.measurementCycle,
		localCycleId: ids.cycle,
		locationId: ids.location,
		gridDefinitionId: ids.grid,
		gridDefinitionVersion: 1,
		gridPointId: ids.point,
		pointIndex: 0,
		latitude: "-8.506900",
		longitude: "115.262500",
		capturedAt: new Date(capturedAt),
		provider: "maps-provider",
		keywordId: ids.keyword,
		keyword: "coffee ubud",
		locale: "en",
		deviceContext: "MOBILE",
		formulaVersion: "visibility-map-v1",
		repeatIndex: 0,
		sourceValidity: "VALID",
		invalidReason: null,
		targetRank: 3,
		displayStatus: "MEASURED",
		interpolated: false,
		datasetStatus: "RUNNING",
		materializationKind: "LIVE_VIEW",
		refreshedAt: null,
		isStale: false,
		...overrides,
	};
}

function evidenceRow(overrides: Partial<LocalReadEvidenceRow> = {}): LocalReadEvidenceRow {
	return {
		id: ids.evidence1,
		domainId: "LOCAL_MAPS",
		observationRef: ids.observation1,
		capturedAt: new Date("2026-08-30T02:00:00.000Z"),
		datasetId: ids.dataset,
		datasetKey: "local-maps-cycle-1",
		datasetVersion: 1,
		datasetImmutable: true,
		datasetCreatedAt: new Date("2026-08-30T01:30:00.000Z"),
		sourceSnapshotId: ids.snapshot,
		sourceSnapshotImmutable: true,
		sourceType: "MAPS_SERP_PROVIDER",
		sourceContentSha256: "a".repeat(64),
		sourceCapturedAt: new Date("2026-08-30T02:00:00.000Z"),
		...overrides,
	};
}

function store(overrides: Partial<SelenaLocalReadStore> = {}): SelenaLocalReadStore {
	return {
		findCycle: vi.fn(async ({ tenantId, cycleId }) =>
			tenantId === cycle.organizationId && cycleId === cycle.id ? cycle : null,
		),
		findAiPilot: vi.fn(async (): Promise<LocalReadAiPilotLookup> => ({ state: "NONE" })),
		listAiTaskAssets: vi.fn(async (): Promise<LocalReadAiTaskAssetRow[]> => []),
		listAiEvidence: vi.fn(async (): Promise<LocalReadAiEvidenceRow[]> => []),
		countMapObservations: vi.fn(async () => ({ valid: 1, invalid: 1, unknown: 1 })),
		findMapDatasetId: vi.fn(async () => ({ id: ids.dataset, createdAt: new Date("2026-08-30T01:30:00.000Z") })),
		listMapResults: vi.fn(async () => []),
		listEvidence: vi.fn(async () => []),
		findEvidenceHighWater: vi.fn(async () => null),
		...overrides,
	};
}

describe("Selena local read API core", () => {
	it("binds every read to the authenticated tenant before querying child data", async () => {
		const source = store();
		const api = createSelenaLocalReadApi(source);

		await expect(api.progress({ tenantId: "tenant-b", cycleId: ids.cycle })).rejects.toMatchObject({
			name: "SelenaLocalCycleNotFoundError",
		});
		expect(source.countMapObservations).not.toHaveBeenCalled();
	});

	it("keeps Maps partial, invalid, unknown and pending counts separate from manual-only Local AI", async () => {
		const source = store();
		const api = createSelenaLocalReadApi(source);

		await expect(api.progress({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toEqual({
			cycleId: ids.cycle,
			status: "RUNNING",
			maps: {
				surface: "LOCAL_MAPS",
				status: "PARTIAL",
				counts: { expected: 5, pending: 2, valid: 1, invalid: 1, unknown: 1, blocked: 0 },
			},
			localAi: {
				surface: "LOCAL_AI",
				executionMode: "MANUAL_ONLY",
				automationAllowed: false,
				status: "NOT_INCLUDED",
				counts: { expected: 0, pending: 0, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
			},
			updatedAt: "2026-08-30T02:00:00.000Z",
		});
		expect(source.findAiPilot).not.toHaveBeenCalled();
	});

	it("treats created rows missing from the immutable evidence view as unknown rather than completed", async () => {
		const api = createSelenaLocalReadApi(
			store({ countMapObservations: vi.fn(async () => ({ valid: 1, invalid: 0, unknown: 0 })) }),
		);

		await expect(api.progress({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			maps: {
				status: "PARTIAL",
				counts: { expected: 5, pending: 2, valid: 1, invalid: 0, unknown: 2, blocked: 0 },
			},
		});
	});

	it("fails closed when immutable Maps rows exceed the persisted cycle counter", async () => {
		const api = createSelenaLocalReadApi(
			store({ countMapObservations: vi.fn(async () => ({ valid: 4, invalid: 0, unknown: 0 })) }),
		);

		await expect(api.progress({ tenantId: "tenant-a", cycleId: ids.cycle })).rejects.toThrow(
			"LOCAL_MAPS_PROGRESS_COUNTER_MISMATCH",
		);
	});

	it("exposes a locked Local AI footprint as pending until a manual pilot exists", async () => {
		const source = store({
			findCycle: vi.fn(async () => ({ ...cycle, configurationSnapshot: localAiSnapshot() })),
			findAiPilot: vi.fn(async () => ({ state: "NONE" as const })),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(api.progress({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			localAi: {
				surface: "LOCAL_AI",
				status: "NOT_STARTED",
				counts: { expected: 1, pending: 1, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
			},
		});
		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			pilotCycleId: null,
			status: "UNKNOWN",
			items: [],
			nextPosition: null,
		});
		expect(source.findAiPilot).toHaveBeenCalledWith({
			tenantId: "tenant-a",
			projectId: ids.project,
			configurationLockId: ids.configurationLock,
		});
	});

	it("preserves a canonical READY cycle instead of degrading it to UNKNOWN", async () => {
		const readyCycle = { ...cycle, status: "READY", expectedObservations: 1, createdObservations: 1 };
		const api = createSelenaLocalReadApi(
			store({
				findCycle: vi.fn(async () => readyCycle),
				countMapObservations: vi.fn(async () => ({ valid: 1, invalid: 0, unknown: 0 })),
			}),
		);

		await expect(api.progress({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			status: "READY",
			maps: { status: "COMPLETED" },
		});
	});

	it("projects one accepted manual Local AI task only when its reviewed observation has evidence", async () => {
		const task = acceptedAiTaskAssetRow();
		const proof = coordinateProofAiTaskAssetRow();
		const source = store({
			findCycle: vi.fn(async () => ({ ...cycle, configurationSnapshot: localAiSnapshot() })),
			findAiPilot: vi.fn(async () => ({ state: "ONE" as const, pilot: acceptedAiPilot() })),
			listAiTaskAssets: vi.fn(async () => [task, proof]),
			listAiEvidence: vi.fn(async () => [aiEvidenceRow()]),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(api.progress({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			localAi: {
				surface: "LOCAL_AI",
				status: "COMPLETED",
				counts: { expected: 1, pending: 0, valid: 1, invalid: 0, unknown: 0, blocked: 0 },
			},
		});
		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			pilotCycleId: ids.pilot,
			status: "READY",
			items: [
				{
					captureTaskId: ids.task,
					observationId: ids.aiObservation,
					scenarioId: ids.scenario,
					contextHash: localAiTaskContextHash(localAiObserverContext),
					repeatIndex: 0,
					taskStatus: "ACCEPTED",
					resultStatus: "VALID",
					capturedAt: "2026-08-30T02:05:00.000Z",
					evidenceIds: [ids.aiEvidence, ids.aiCoordinateProof],
					coordinateProofReference: ids.aiCoordinateProof,
					reasonCode: null,
				},
			],
			nextPosition: null,
		});
	});

	it("fails closed when a terminal-ready cycle still has incomplete evidence-backed progress", async () => {
		const readyCycle = { ...cycle, status: "READY", expectedObservations: 3, createdObservations: 3 };
		const api = createSelenaLocalReadApi(
			store({
				findCycle: vi.fn(async () => readyCycle),
				countMapObservations: vi.fn(async () => ({ valid: 2, invalid: 0, unknown: 0 })),
			}),
		);

		await expect(api.progress({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			status: "UNKNOWN",
			maps: { status: "PARTIAL", counts: { expected: 3, valid: 2, unknown: 1 } },
		});
	});

	it("does not promote an accepted manual Local AI task without coordinate proof", async () => {
		const task = acceptedAiTaskAssetRow();
		const source = store({
			findCycle: vi.fn(async () => ({ ...cycle, configurationSnapshot: localAiSnapshot() })),
			findAiPilot: vi.fn(async () => ({ state: "ONE" as const, pilot: acceptedAiPilot() })),
			listAiTaskAssets: vi.fn(async () => [task]),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			pilotCycleId: ids.pilot,
			status: "PARTIAL",
			items: [
				{
					resultStatus: "UNKNOWN",
					reasonCode: "ACCEPTANCE_EVIDENCE_INCOMPLETE",
				},
			],
		});
	});

	it("fails closed when a task has more than one usable coordinate proof", async () => {
		const task = acceptedAiTaskAssetRow();
		const proof = coordinateProofAiTaskAssetRow();
		const source = store({
			findCycle: vi.fn(async () => ({ ...cycle, configurationSnapshot: localAiSnapshot() })),
			findAiPilot: vi.fn(async () => ({ state: "ONE" as const, pilot: acceptedAiPilot() })),
			listAiTaskAssets: vi.fn(async () => [
				task,
				proof,
				{ ...proof, evidenceId: ids.aiCoordinateProofDuplicate, evidenceSequenceIndex: 2 },
			]),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			status: "PARTIAL",
			items: [{ resultStatus: "UNKNOWN", reasonCode: "ACCEPTANCE_EVIDENCE_INCOMPLETE" }],
		});
	});

	it("does not treat area-mode coordinates as pin-level coordinate proof", async () => {
		const areaContext = {
			...localAiObserverContext,
			observerGeoMode: "DECLARED_AREA" as const,
		};
		const task = acceptedAiTaskAssetRow();
		const source = store({
			findCycle: vi.fn(async () => ({ ...cycle, configurationSnapshot: localAiSnapshot(areaContext) })),
			findAiPilot: vi.fn(async () => ({ state: "ONE" as const, pilot: acceptedAiPilot() })),
			listAiTaskAssets: vi.fn(async () => [
				{
					...task,
					contextHash: localAiTaskContextHash(areaContext),
					contextSnapshot: areaContext,
				},
				{
					...coordinateProofAiTaskAssetRow(),
					contextHash: localAiTaskContextHash(areaContext),
					contextSnapshot: areaContext,
				},
			]),
			listAiEvidence: vi.fn(async () => [aiEvidenceRow()]),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			status: "PARTIAL",
			items: [{ resultStatus: "UNKNOWN", reasonCode: "ACCEPTANCE_EVIDENCE_INCOMPLETE" }],
		});
	});

	it("fails closed when a manual Local AI task hash or query drifts from the lock", async () => {
		const task = acceptedAiTaskAssetRow();
		const source = store({
			findCycle: vi.fn(async () => ({ ...cycle, configurationSnapshot: localAiSnapshot() })),
			findAiPilot: vi.fn(async () => ({ state: "ONE" as const, pilot: acceptedAiPilot() })),
			listAiTaskAssets: vi.fn(async () => [{ ...task, contextHash: "f".repeat(64) }]),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).rejects.toThrow(
			"LOCAL_AI_TASK_OUTSIDE_LOCK",
		);
	});

	it("keeps declared observer coordinates in the locked context hash", async () => {
		const observedContext = {
			...localAiObserverContext,
			observerLatitude: -8.506854,
			observerLongitude: 115.262482,
		};
		const task = acceptedAiTaskAssetRow();
		const proof = coordinateProofAiTaskAssetRow();
		const source = store({
			findCycle: vi.fn(async () => ({
				...cycle,
				configurationSnapshot: localAiSnapshot(observedContext),
			})),
			findAiPilot: vi.fn(async () => ({ state: "ONE" as const, pilot: acceptedAiPilot() })),
			listAiTaskAssets: vi.fn(async () => [
				{
					...task,
					contextHash: localAiTaskContextHash(observedContext),
					contextSnapshot: observedContext,
				},
				{ ...proof, contextHash: localAiTaskContextHash(observedContext), contextSnapshot: observedContext },
			]),
			listAiEvidence: vi.fn(async () => [aiEvidenceRow()]),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			status: "READY",
			items: [{ resultStatus: "VALID", contextHash: localAiTaskContextHash(observedContext) }],
		});
	});

	it("keeps a pending manual Local AI task pending instead of counting it as unknown", async () => {
		const source = store({
			findCycle: vi.fn(async () => ({ ...cycle, configurationSnapshot: localAiSnapshot() })),
			findAiPilot: vi.fn(async () => ({
				state: "ONE" as const,
				pilot: { ...acceptedAiPilot(), createdObservations: 0 },
			})),
			listAiTaskAssets: vi.fn(async () => [pendingAiTaskAssetRow()]),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(api.progress({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			localAi: {
				surface: "LOCAL_AI",
				status: "NOT_STARTED",
				counts: { expected: 1, pending: 1, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
			},
		});
		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			status: "UNKNOWN",
			items: [{ resultStatus: "UNKNOWN", reasonCode: "PENDING_CAPTURE" }],
		});
	});

	it("fails closed when more than one manual pilot is linked to the locked Local AI configuration", async () => {
		const candidatePilots = [acceptedAiPilot(), { ...acceptedAiPilot(), id: ids.pilotAmbiguous }];
		const source = store({
			findCycle: vi.fn(async () => ({ ...cycle, configurationSnapshot: localAiSnapshot() })),
			findAiPilot: vi.fn(async () =>
				candidatePilots.length > 1
					? { state: "AMBIGUOUS" as const }
					: { state: "ONE" as const, pilot: candidatePilots[0] },
			),
			listAiTaskAssets: vi.fn(async () => []),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(api.progress({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			localAi: {
				surface: "LOCAL_AI",
				status: "UNKNOWN",
				counts: { expected: 1, pending: 0, valid: 0, invalid: 0, unknown: 1, blocked: 0 },
			},
		});
		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toMatchObject({
			pilotCycleId: null,
			status: "UNKNOWN",
			items: [],
			nextPosition: null,
		});
		expect(source.listAiTaskAssets).not.toHaveBeenCalled();
	});

	it("uses a limit-plus-one stable position and coerces database numerics without inventing ranks", async () => {
		const rows = [
			mapRow(ids.observation1, ids.evidence1, "2026-08-30T02:00:00.000Z"),
			mapRow(ids.observation2, ids.evidence2, "2026-08-30T02:00:00.000Z", {
				displayStatus: "MISSING",
				targetRank: null,
			}),
			mapRow(ids.observation3, ids.evidence3, "2026-08-30T03:00:00.000Z"),
		];
		const source = store({ listMapResults: vi.fn(async () => rows) });
		const api = createSelenaLocalReadApi(source);

		const result = await api.mapResults({ tenantId: "tenant-a", cycleId: ids.cycle, limit: 2, after: null });

		expect(source.listMapResults).toHaveBeenCalledWith({
			tenantId: "tenant-a",
			cycleId: ids.cycle,
			limit: 3,
			after: null,
		});
		expect(result.nextPosition).toEqual({
			sortValue: "2026-08-30T02:00:00.000Z",
			tieBreakerId: ids.observation2,
		});
		expect(result.items).toHaveLength(2);
		expect(result.items[0]).toMatchObject({
			latitude: -8.5069,
			longitude: 115.2625,
			status: "FOUND",
			targetRank: 3,
			evidenceIds: [ids.evidence1],
		});
		expect(result.items[1]).toMatchObject({ status: "ABSENT_WITHIN_DEPTH", targetRank: null, reasonCode: null });
	});

	it("does not report a measured rank when immutable source provenance is missing", async () => {
		const row = mapRow(ids.observation1, ids.evidence1, "2026-08-30T02:00:00.000Z", {
			sourceSnapshotImmutable: null,
			sourceContentSha256: null,
			sourceCapturedAt: null,
		});
		const api = createSelenaLocalReadApi(store({ listMapResults: vi.fn(async () => [row]) }));

		const result = await api.mapResults({ tenantId: "tenant-a", cycleId: ids.cycle, limit: 50, after: null });

		expect(result.items[0]).toMatchObject({
			status: "UNKNOWN",
			targetRank: null,
			reasonCode: "SOURCE_PROVENANCE_UNKNOWN",
		});
	});

	it("anchors an empty Maps page to the immutable dataset creation high-water mark", async () => {
		const api = createSelenaLocalReadApi(
			store({
				findMapDatasetId: vi.fn(async () => ({
					id: ids.dataset,
					createdAt: new Date("2026-08-30T03:00:00.000Z"),
				})),
			}),
		);

		await expect(
			api.mapResults({ tenantId: "tenant-a", cycleId: ids.cycle, limit: 50, after: null }),
		).resolves.toMatchObject({
			snapshotVersion: "2026-08-30T03:00:00.000Z",
		});
	});

	it("returns no invented automated Local AI observations", async () => {
		const api = createSelenaLocalReadApi(store());

		await expect(api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle })).resolves.toEqual({
			cycleId: ids.cycle,
			snapshotVersion: "2026-08-30T02:00:00.000Z",
			pilotCycleId: null,
			surface: "LOCAL_AI",
			executionMode: "MANUAL_ONLY",
			automationAllowed: false,
			status: "NOT_INCLUDED",
			items: [],
			nextPosition: null,
		});
	});

	it("exposes dataset and source provenance without a raw reference or signed URL", async () => {
		const source = store({ listEvidence: vi.fn(async () => [evidenceRow()]) });
		const api = createSelenaLocalReadApi(source);

		const result = await api.evidence({ tenantId: "tenant-a", cycleId: ids.cycle, limit: 50, after: null });

		expect(source.listEvidence).toHaveBeenCalledWith({
			tenantId: "tenant-a",
			measurementCycleId: ids.measurementCycle,
			limit: 51,
			after: null,
		});
		expect(result.items[0]).toEqual({
			evidenceId: ids.evidence1,
			datasetId: ids.dataset,
			surface: "LOCAL_MAPS",
			status: "VALID",
			kind: "MAPS_SERP_PROVIDER",
			contentSha256: "a".repeat(64),
			capturedAt: "2026-08-30T02:00:00.000Z",
			access: {
				state: "UNAVAILABLE",
				reason: "SIGNING_UNAVAILABLE",
				url: null,
				expiresAt: null,
				ttlSeconds: 600,
			},
		});
		expect(JSON.stringify(result)).not.toContain("raw");
	});

	it("anchors evidence cursors to the full evidence high-water mark before page slicing", async () => {
		const source = store({
			listEvidence: vi.fn(async () => [evidenceRow({ capturedAt: new Date("2026-08-30T02:00:00.000Z") })]),
			findEvidenceHighWater: vi.fn(async () => new Date("2026-08-30T03:00:00.000Z")),
		});
		const api = createSelenaLocalReadApi(source);

		await expect(
			api.evidence({ tenantId: "tenant-a", cycleId: ids.cycle, limit: 1, after: null }),
		).resolves.toMatchObject({ snapshotVersion: "2026-08-30T03:00:00.000Z" });
		await expect(
			api.evidence({
				tenantId: "tenant-a",
				cycleId: ids.cycle,
				limit: 1,
				after: null,
				snapshotVersion: "2026-08-30T02:00:00.000Z",
			}),
		).rejects.toMatchObject({ code: "CURSOR_STALE", status: 409 });
	});

	it("invalidates Local AI cursors when evidence is added after the task snapshot", async () => {
		const task = acceptedAiTaskAssetRow();
		const source = store({
			findCycle: vi.fn(async () => ({ ...cycle, configurationSnapshot: localAiSnapshot() })),
			findAiPilot: vi.fn(async () => ({ state: "ONE" as const, pilot: acceptedAiPilot() })),
			listAiTaskAssets: vi.fn(async () => [task]),
		});
		const api = createSelenaLocalReadApi(source);

		const firstPage = await api.aiResults({ tenantId: "tenant-a", cycleId: ids.cycle });
		expect(firstPage.snapshotVersion).toBe("2026-08-30T02:10:00.000Z");

		source.listAiTaskAssets = vi.fn(async () => [{ ...task, evidenceCreatedAt: new Date("2026-08-30T03:00:00.000Z") }]);

		await expect(
			api.aiResults({
				tenantId: "tenant-a",
				cycleId: ids.cycle,
				snapshotVersion: firstPage.snapshotVersion,
			}),
		).rejects.toMatchObject({ code: "CURSOR_STALE", status: 409 });
	});

	it("enforces endpoint-specific read scopes with the standard error envelope", async () => {
		const source = store();
		const handlers = createSelenaLocalReadRouteHandlers({
			api: createSelenaLocalReadApi(source),
			authenticate: vi.fn(async () => ({ tenantId: "tenant-a", permissions: ["local:read"] })),
			requestId: () => "request-local-read-1",
		});

		const response = await handlers.evidence(new Request("https://example.test/evidence"), ids.cycle);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({
			error: {
				code: "SCOPE_FORBIDDEN",
				message: "API key lacks evidence:read scope.",
				requestId: "request-local-read-1",
				retryable: false,
				details: { requiredScope: "evidence:read" },
			},
		});
		expect(source.findCycle).not.toHaveBeenCalled();
	});

	it("serializes contract-valid manual-only and unavailable evidence responses", async () => {
		const source = store({ listEvidence: vi.fn(async () => [evidenceRow()]) });
		const handlers = createSelenaLocalReadRouteHandlers({
			api: createSelenaLocalReadApi(source),
			authenticate: vi.fn(async () => ({
				tenantId: "tenant-a",
				permissions: ["local:read", "evidence:read"],
			})),
			requestId: () => "request-local-read-contract",
		});

		const ai = await handlers.aiResults(new Request("https://example.test/ai-results"), ids.cycle);
		const evidence = await handlers.evidence(new Request("https://example.test/evidence"), ids.cycle);

		expect(ai.status).toBe(200);
		expect(await ai.json()).toMatchObject({
			status: "NOT_INCLUDED",
			executionMode: "MANUAL_ONLY",
			automationAllowed: false,
			items: [],
			page: { limit: 50, nextCursor: null },
		});
		expect(evidence.status).toBe(200);
		expect(await evidence.json()).toMatchObject({
			items: [
				{
					evidenceId: ids.evidence1,
					datasetId: ids.dataset,
					access: { state: "UNAVAILABLE", reason: "SIGNING_UNAVAILABLE", ttlSeconds: 600 },
				},
			],
			page: { limit: 50, nextCursor: null },
		});
	});

	it("rejects a cursor bound to another tenant before reading the cycle", async () => {
		const source = store();
		const handlers = createSelenaLocalReadRouteHandlers({
			api: createSelenaLocalReadApi(source),
			authenticate: vi.fn(async () => ({ tenantId: "tenant-a", permissions: ["local:read"] })),
			requestId: () => "request-local-read-2",
		});
		const cursor = encodeSelenaApiCursor({
			version: 1,
			tenantId: "tenant-b",
			cycleId: ids.cycle,
			resource: "map-results",
			snapshotVersion: "2026-08-30T02:00:00.000Z",
			position: { sortValue: "2026-08-30T02:00:00.000Z", tieBreakerId: ids.observation1 },
		});

		const response = await handlers.mapResults(
			new Request(`https://example.test/map-results?cursor=${cursor}`),
			ids.cycle,
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "CURSOR_INVALID", requestId: "request-local-read-2" },
		});
		expect(source.findCycle).not.toHaveBeenCalled();
	});

	it("rejects malformed cycle ids on every route before a database-bound read", async () => {
		const source = store();
		const handlers = createSelenaLocalReadRouteHandlers({
			api: createSelenaLocalReadApi(source),
			authenticate: vi.fn(async () => ({
				tenantId: "tenant-a",
				permissions: ["local:read", "evidence:read"],
			})),
			requestId: () => "request-local-read-uuid",
		});
		const request = () => new Request("https://example.test/local-read");

		for (const response of await Promise.all([
			handlers.progress(request(), "not-a-uuid"),
			handlers.mapResults(request(), "not-a-uuid"),
			handlers.aiResults(request(), "not-a-uuid"),
			handlers.evidence(request(), "not-a-uuid"),
		])) {
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({
				error: { code: "LOCAL_CYCLE_ID_INVALID", requestId: "request-local-read-uuid", retryable: false },
			});
		}
		expect(source.findCycle).not.toHaveBeenCalled();
	});

	it("returns an opaque cursor and feeds its exact stable position into the next page", async () => {
		const rows = [
			mapRow(ids.observation1, ids.evidence1, "2026-08-30T02:00:00.000Z"),
			mapRow(ids.observation2, ids.evidence2, "2026-08-30T02:00:00.000Z"),
		];
		const listMapResults = vi
			.fn<SelenaLocalReadStore["listMapResults"]>()
			.mockResolvedValueOnce(rows)
			.mockResolvedValueOnce([]);
		const source = store({ listMapResults });
		const handlers = createSelenaLocalReadRouteHandlers({
			api: createSelenaLocalReadApi(source),
			authenticate: vi.fn(async () => ({ tenantId: "tenant-a", permissions: ["local:read"] })),
			requestId: () => "request-local-read-3",
		});

		const first = await handlers.mapResults(new Request("https://example.test/map-results?limit=1"), ids.cycle);
		const firstBody = (await first.json()) as { page: { nextCursor: string } };
		expect(first.status).toBe(200);
		expect(firstBody.page.nextCursor).toEqual(expect.any(String));

		const second = await handlers.mapResults(
			new Request(`https://example.test/map-results?limit=1&cursor=${firstBody.page.nextCursor}`),
			ids.cycle,
		);
		expect(second.status).toBe(200);
		expect(listMapResults).toHaveBeenLastCalledWith({
			tenantId: "tenant-a",
			cycleId: ids.cycle,
			limit: 2,
			after: { sortValue: "2026-08-30T02:00:00.000Z", tieBreakerId: ids.observation1 },
		});
	});

	it("returns 409 instead of silently paging after the cycle snapshot changes", async () => {
		const firstCycle = { ...cycle };
		const changedCycle = { ...cycle, updatedAt: new Date("2026-08-30T02:01:00.000Z") };
		const rows = [
			mapRow(ids.observation1, ids.evidence1, "2026-08-30T02:00:00.000Z"),
			mapRow(ids.observation2, ids.evidence2, "2026-08-30T02:00:00.000Z"),
		];
		const source = store({
			findCycle: vi
				.fn<SelenaLocalReadStore["findCycle"]>()
				.mockResolvedValueOnce(firstCycle)
				.mockResolvedValueOnce(changedCycle),
			listMapResults: vi.fn(async () => rows),
		});
		const handlers = createSelenaLocalReadRouteHandlers({
			api: createSelenaLocalReadApi(source),
			authenticate: vi.fn(async () => ({ tenantId: "tenant-a", permissions: ["local:read"] })),
			requestId: () => "request-local-read-stale",
		});

		const first = await handlers.mapResults(new Request("https://example.test/map-results?limit=1"), ids.cycle);
		const cursor = ((await first.json()) as { page: { nextCursor: string } }).page.nextCursor;
		const second = await handlers.mapResults(
			new Request(`https://example.test/map-results?limit=1&cursor=${cursor}`),
			ids.cycle,
		);

		expect(second.status).toBe(409);
		expect(await second.json()).toMatchObject({
			error: { code: "CURSOR_STALE", requestId: "request-local-read-stale", retryable: true },
		});
		expect(source.listMapResults).toHaveBeenCalledTimes(1);
	});
});
