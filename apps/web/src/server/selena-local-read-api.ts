import { randomUUID } from "node:crypto";
import { db } from "@workspace/lib/db/db";
import {
	svCaptureTasks,
	svConfigurationLocks,
	svEvidenceIndex,
	svLocalObservations,
	svLocalScanCycles,
	svMeasurementDatasets,
	svObservationEvidenceAssets,
	svPilotCycles,
	svSourceSnapshots,
	svVisibilityMapDatasets,
	svVisibilityMapPoints,
} from "@workspace/lib/db/schema";
import {
	contextHash,
	LOCAL_API_EVIDENCE_TTL_SECONDS,
	type LocalApiCursorResource,
	localApiAiResultsResponseSchema,
	localApiEvidenceResponseSchema,
	localApiMapResultsResponseSchema,
	localApiProgressResponseSchema,
	readManualLocalAiLock,
} from "@workspace/selena-visibility-contracts";
import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
	encodeSelenaApiCursor,
	parseSelenaApiCursor,
	requireSelenaApiScope,
	SelenaApiHttpError,
	selenaApiErrorResponse,
	selenaApiHttpErrorResponse,
} from "../lib/selena-api-http";
import { resolveApiKeyAuthContext } from "../lib/selena-auth-context";

export type LocalReadCursorPosition = {
	sortValue: string;
	tieBreakerId: string;
};

export type LocalReadCycle = {
	id: string;
	organizationId: string;
	measurementCycleId: string;
	configurationLockId: string;
	projectId: string;
	configurationSnapshot: unknown;
	status: string;
	expectedObservations: number;
	createdObservations: number;
	createdAt: Date;
	updatedAt: Date;
};

export type LocalReadMapCounts = {
	valid: number;
	invalid: number;
	unknown: number;
};

export type LocalReadMapRow = {
	observationId: string;
	evidenceId: string;
	sourceSnapshotImmutable: boolean | null;
	sourceType: string | null;
	sourceContentSha256: string | null;
	sourceCapturedAt: Date | null;
	datasetId: string;
	measurementCycleId: string;
	localCycleId: string;
	locationId: string;
	gridDefinitionId: string;
	gridDefinitionVersion: number;
	gridPointId: string;
	pointIndex: number;
	latitude: string | number;
	longitude: string | number;
	capturedAt: Date;
	provider: string;
	keywordId: string;
	keyword: string;
	locale: string;
	deviceContext: string;
	formulaVersion: string;
	repeatIndex: number;
	sourceValidity: string;
	invalidReason: string | null;
	targetRank: number | null;
	displayStatus: string;
	interpolated: boolean;
	datasetStatus: string;
	materializationKind: string;
	refreshedAt: Date | null;
	isStale: boolean;
};

export type LocalReadEvidenceRow = {
	id: string;
	domainId: string;
	observationRef: string;
	capturedAt: Date;
	datasetId: string;
	datasetKey: string;
	datasetVersion: number;
	datasetImmutable: boolean;
	datasetCreatedAt: Date;
	sourceSnapshotId: string | null;
	sourceSnapshotImmutable: boolean | null;
	sourceType: string | null;
	sourceContentSha256: string | null;
	sourceCapturedAt: Date | null;
};

export type LocalReadAiPilot = {
	id: string;
	expectedObservations: number;
	createdObservations: number;
	status: string;
	updatedAt: Date;
};

export type LocalReadAiTaskAssetRow = {
	captureTaskId: string;
	scenarioId: string;
	contextHash: string;
	repeatIndex: number;
	taskStatus: string;
	taskCreatedAt: Date;
	taskUpdatedAt: Date;
	queryTextSnapshot: string;
	contextSnapshot: unknown;
	observationId: string | null;
	observationCapturedAt: Date | null;
	observationReviewStatus: string | null;
	observationValidity: string | null;
	observationInvalidReason: string | null;
	evidenceId: string | null;
	evidenceSequenceIndex: number | null;
	evidenceSha256: string | null;
	evidenceCapturedAt: Date | null;
};

export type LocalReadAiEvidenceRow = {
	id: string;
	assetType: string;
	sha256: string;
	capturedAt: Date;
};

export type LocalReadAiPilotLookup =
	| { state: "NONE" }
	| { state: "ONE"; pilot: LocalReadAiPilot }
	| { state: "AMBIGUOUS" };

export type SelenaLocalReadStore = {
	findCycle(input: { tenantId: string; cycleId: string }): Promise<LocalReadCycle | null>;
	findAiPilot(input: {
		tenantId: string;
		projectId: string;
		configurationLockId: string;
	}): Promise<LocalReadAiPilotLookup>;
	listAiTaskAssets(input: { tenantId: string; pilotCycleId: string }): Promise<LocalReadAiTaskAssetRow[]>;
	listAiEvidence(input: {
		tenantId: string;
		pilotCycleId: string;
		limit: number;
		after: LocalReadCursorPosition | null;
	}): Promise<LocalReadAiEvidenceRow[]>;
	countMapObservations(input: { tenantId: string; cycleId: string }): Promise<LocalReadMapCounts>;
	findMapDatasetId(input: { tenantId: string; cycleId: string }): Promise<string | null>;
	listMapResults(input: {
		tenantId: string;
		cycleId: string;
		limit: number;
		after: LocalReadCursorPosition | null;
	}): Promise<LocalReadMapRow[]>;
	listEvidence(input: {
		tenantId: string;
		measurementCycleId: string;
		limit: number;
		after: LocalReadCursorPosition | null;
	}): Promise<LocalReadEvidenceRow[]>;
};

export class SelenaLocalCycleNotFoundError extends Error {
	constructor() {
		super("Local scan cycle was not found in the authenticated tenant");
		this.name = "SelenaLocalCycleNotFoundError";
	}
}

function finiteNumber(value: string | number): number {
	const coerced = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(coerced)) throw new Error("INVALID_NUMERIC_RESULT");
	return coerced;
}

function hasImmutableSourceProvenance(input: {
	sourceSnapshotImmutable: boolean | null;
	sourceType: string | null;
	sourceContentSha256: string | null;
	sourceCapturedAt: Date | null;
}): boolean {
	return Boolean(
		input.sourceSnapshotImmutable === true &&
			input.sourceType === "MAPS_SERP_PROVIDER" &&
			input.sourceContentSha256 &&
			/^(?:sha256:)?[a-f0-9]{64}$/.test(input.sourceContentSha256) &&
			input.sourceCapturedAt,
	);
}

const blockedCycleStatuses = new Set([
	"PREFLIGHT_BLOCKED",
	"BUDGET_BLOCKED",
	"PROVIDER_BLOCKED",
	"STOPPED",
	"FAILED",
	"CARDINALITY_INCIDENT",
]);
const knownCycleStatuses = new Set([
	"CREATED",
	"APPROVED",
	"AWAITING_APPROVAL",
	"QUEUED",
	"RUNNING",
	"ANALYZING",
	"QC_REQUIRED",
	"READY",
	"PARTIAL_FAILURE",
	"COMPLETED",
	...blockedCycleStatuses,
]);

function cycleProgressStatus(status: string) {
	return knownCycleStatuses.has(status) ? status : "UNKNOWN";
}

function mapProgress(cycle: LocalReadCycle, counts: LocalReadMapCounts) {
	const counted = counts.valid + counts.invalid + counts.unknown;
	const created = Math.max(cycle.createdObservations, counted);
	if (created > cycle.expectedObservations) throw new Error("LOCAL_MAPS_PROGRESS_EXCEEDS_EXPECTED");
	const reconciledCounts = { ...counts, unknown: counts.unknown + Math.max(cycle.createdObservations - counted, 0) };
	const observed = reconciledCounts.valid + reconciledCounts.invalid + reconciledCounts.unknown;
	const remaining = cycle.expectedObservations - observed;
	const blocked = blockedCycleStatuses.has(cycle.status) ? remaining : 0;
	const pending = blocked > 0 ? 0 : remaining;
	const status =
		blocked > 0
			? ("BLOCKED" as const)
			: observed === 0
				? ("NOT_STARTED" as const)
				: pending > 0
					? reconciledCounts.invalid > 0 || reconciledCounts.unknown > 0
						? ("PARTIAL" as const)
						: ("RUNNING" as const)
					: reconciledCounts.invalid > 0 || reconciledCounts.unknown > 0
						? ("PARTIAL" as const)
						: ("COMPLETED" as const);
	return { status, counts: { expected: cycle.expectedObservations, pending, ...reconciledCounts, blocked } };
}

function safeIso(value: Date): string {
	return Number.isNaN(value.getTime()) ? "INVALID" : value.toISOString();
}

function assertCursorSnapshot(cycle: LocalReadCycle, snapshotVersion?: string | null, currentVersion?: string): string {
	const current = currentVersion ?? safeIso(cycle.updatedAt);
	if (snapshotVersion !== undefined && snapshotVersion !== null && snapshotVersion !== current) {
		throw new SelenaApiHttpError(
			409,
			"CURSOR_STALE",
			"The collection changed after this cursor was issued. Restart pagination from the first page.",
			true,
		);
	}
	return current;
}

function pageRows<Row>(rows: Row[], limit: number, position: (row: Row) => LocalReadCursorPosition) {
	const hasNext = rows.length > limit;
	const items = hasNext ? rows.slice(0, limit) : rows;
	return {
		items,
		nextPosition: hasNext && items.length > 0 ? position(items[items.length - 1]) : null,
	};
}

function isAfterPosition(row: LocalReadCursorPosition, after: LocalReadCursorPosition | null): boolean {
	if (!after) return true;
	return (
		row.sortValue > after.sortValue || (row.sortValue === after.sortValue && row.tieBreakerId > after.tieBreakerId)
	);
}

type LocalReadAiEvaluation = {
	included: boolean;
	status: "NOT_INCLUDED" | "NOT_STARTED" | "RUNNING" | "PARTIAL" | "COMPLETED" | "BLOCKED" | "UNKNOWN";
	pilotCycleId: string | null;
	counts: { expected: number; pending: number; valid: number; invalid: number; unknown: number; blocked: number };
	items: Array<{
		captureTaskId: string;
		localAiRunId: string;
		scanCycleId: string;
		pointId: string | null;
		latitude: number | null;
		longitude: number | null;
		coordinateProofReference: string | null;
		observationId: string | null;
		scenarioId: string;
		promptId: string;
		promptText: string | null;
		system: string | null;
		measurementSurface: "GOOGLE_ASK_MAPS";
		modelOrEnvironment: string | null;
		webSearchState: string | null;
		personalizationMode: string | null;
		accountMode: string | null;
		language: string | null;
		contextHash: string;
		repeatIndex: number;
		taskStatus: string;
		validity: "VALID" | "INVALID" | "UNMEASURED" | null;
		rawResponseReference: null;
		targetMention: boolean | null;
		recommendationPosition: number | null;
		citations: unknown[];
		competitors: unknown[];
		costEventId: string | null;
		resultStatus: "VALID" | "INVALID" | "UNKNOWN";
		progressState: "PENDING" | "VALID" | "INVALID" | "UNKNOWN";
		reasonCode: string | null;
		capturedAt: string | null;
		evidenceIds: string[];
		position: LocalReadCursorPosition;
	}>;
	updatedAt: string;
};

const pendingAiTaskStatuses = new Set(["PENDING_CAPTURE", "AWAITING_MANUAL_CAPTURE"]);
const invalidAiTaskStatuses = new Set(["REJECTED", "NEEDS_CORRECTION", "INSUFFICIENT_EVIDENCE"]);
const blockedAiPilotStatuses = new Set(["BLOCKED", "FAILED", "STOPPED", "CANCELLED"]);

function maxIso(values: string[]): string {
	return values.reduce((latest, value) => (value > latest ? value : latest));
}

function aiTaskEvidenceUsable(rows: LocalReadAiTaskAssetRow[]): boolean {
	return rows.some(
		(row) =>
			row.evidenceId !== null &&
			row.evidenceSha256 !== null &&
			/^(?:sha256:)?[a-f0-9]{64}$/.test(row.evidenceSha256) &&
			row.evidenceCapturedAt !== null &&
			!Number.isNaN(row.evidenceCapturedAt.getTime()),
	);
}

function hasCoordinateProof(snapshot: unknown): boolean {
	const parsed = z.record(z.string(), z.unknown()).safeParse(snapshot);
	if (!parsed.success) return false;
	const reference = parsed.data.coordinateProofReference;
	const latitude = parsed.data.observerLatitude;
	const longitude = parsed.data.observerLongitude;
	const pointId = parsed.data.pointId;
	return (
		typeof reference === "string" &&
		reference.trim().length > 0 &&
		typeof latitude === "number" &&
		Number.isFinite(latitude) &&
		latitude >= -90 &&
		latitude <= 90 &&
		typeof longitude === "number" &&
		Number.isFinite(longitude) &&
		longitude >= -180 &&
		longitude <= 180 &&
		typeof pointId === "string" &&
		z.string().uuid().safeParse(pointId).success
	);
}

function nullableContextString(snapshot: unknown, key: string): string | null {
	const parsed = z.record(z.string(), z.unknown()).safeParse(snapshot);
	const value = parsed.success ? parsed.data[key] : undefined;
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function nullableContextNumber(snapshot: unknown, key: string, min: number, max: number): number | null {
	const parsed = z.record(z.string(), z.unknown()).safeParse(snapshot);
	const value = parsed.success ? parsed.data[key] : undefined;
	return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function nullableContextUuid(snapshot: unknown, key: string): string | null {
	const value = nullableContextString(snapshot, key);
	return value !== null && z.string().uuid().safeParse(value).success ? value : null;
}

function normalizedAiValidity(value: string | null): "VALID" | "INVALID" | "UNMEASURED" | null {
	return value === "VALID" || value === "INVALID" || value === "UNMEASURED" ? value : null;
}

function evaluateAiTask(rows: LocalReadAiTaskAssetRow[], pilotCycleId: string, scanCycleId: string) {
	const first = rows[0];
	if (!first) throw new Error("LOCAL_AI_TASK_ROW_MISSING");
	const evidenceIds = rows
		.filter((row) => row.evidenceId !== null)
		.sort(
			(a, b) =>
				(a.evidenceSequenceIndex ?? Number.MAX_SAFE_INTEGER) - (b.evidenceSequenceIndex ?? Number.MAX_SAFE_INTEGER),
		)
		.map((row) => row.evidenceId as string);
	const observationConsistent = rows.every(
		(row) =>
			row.observationId === first.observationId &&
			row.observationReviewStatus === first.observationReviewStatus &&
			row.observationValidity === first.observationValidity &&
			row.observationInvalidReason === first.observationInvalidReason,
	);
	let resultStatus: "VALID" | "INVALID" | "UNKNOWN" = "UNKNOWN";
	let progressState: "PENDING" | "VALID" | "INVALID" | "UNKNOWN" = "UNKNOWN";
	let reasonCode: string | null = first.taskStatus;
	if (pendingAiTaskStatuses.has(first.taskStatus)) {
		reasonCode = first.taskStatus;
		progressState = "PENDING";
	} else if (first.taskStatus === "SUBMITTED_FOR_REVIEW") {
		reasonCode = "REVIEW_PENDING";
	} else if (first.taskStatus === "SURFACE_UNAVAILABLE") {
		reasonCode = "SURFACE_UNAVAILABLE";
	} else if (first.taskStatus === "ACCEPTED") {
		if (
			observationConsistent &&
			first.observationReviewStatus === "ACCEPTED" &&
			first.observationValidity === "VALID" &&
			first.observationId !== null &&
			aiTaskEvidenceUsable(rows) &&
			rows.every((row) => hasCoordinateProof(row.contextSnapshot))
		) {
			resultStatus = "VALID";
			progressState = "VALID";
			reasonCode = null;
		} else {
			reasonCode = observationConsistent ? "ACCEPTANCE_EVIDENCE_INCOMPLETE" : "REVIEW_STATE_MISMATCH";
		}
	} else if (invalidAiTaskStatuses.has(first.taskStatus)) {
		if (
			observationConsistent &&
			first.observationReviewStatus === first.taskStatus &&
			first.observationValidity === "INVALID"
		) {
			resultStatus = "INVALID";
			progressState = "INVALID";
			reasonCode = first.observationInvalidReason ?? first.taskStatus;
		} else {
			reasonCode = observationConsistent ? "INVALIDITY_UNCONFIRMED" : "REVIEW_STATE_MISMATCH";
		}
	} else {
		reasonCode = observationConsistent ? "TASK_STATUS_UNKNOWN" : "REVIEW_STATE_MISMATCH";
	}
	return {
		captureTaskId: first.captureTaskId,
		localAiRunId: pilotCycleId,
		scanCycleId,
		pointId: nullableContextUuid(first.contextSnapshot, "pointId"),
		latitude: nullableContextNumber(first.contextSnapshot, "observerLatitude", -90, 90),
		longitude: nullableContextNumber(first.contextSnapshot, "observerLongitude", -180, 180),
		coordinateProofReference: nullableContextString(first.contextSnapshot, "coordinateProofReference"),
		observationId: first.observationId,
		scenarioId: first.scenarioId,
		promptId: first.scenarioId,
		promptText: first.queryTextSnapshot,
		system: nullableContextString(first.contextSnapshot, "system"),
		measurementSurface: "GOOGLE_ASK_MAPS" as const,
		modelOrEnvironment: nullableContextString(first.contextSnapshot, "modelOrEnvironment"),
		webSearchState: nullableContextString(first.contextSnapshot, "webSearchState"),
		personalizationMode: nullableContextString(first.contextSnapshot, "personalizationMode"),
		accountMode: nullableContextString(first.contextSnapshot, "accountMode"),
		language: nullableContextString(first.contextSnapshot, "queryLanguage"),
		contextHash: first.contextHash,
		repeatIndex: first.repeatIndex,
		taskStatus: first.taskStatus,
		validity: normalizedAiValidity(first.observationValidity),
		rawResponseReference: null,
		targetMention: null,
		recommendationPosition: null,
		citations: [],
		competitors: [],
		costEventId: null,
		resultStatus,
		progressState,
		reasonCode,
		capturedAt: first.observationCapturedAt ? safeIso(first.observationCapturedAt) : null,
		evidenceIds,
		position: { sortValue: safeIso(first.taskCreatedAt), tieBreakerId: first.captureTaskId },
		updatedAt: safeIso(first.taskUpdatedAt),
	};
}

async function evaluateLocalAi(store: SelenaLocalReadStore, cycle: LocalReadCycle): Promise<LocalReadAiEvaluation> {
	let lock: ReturnType<typeof readManualLocalAiLock>;
	try {
		lock = readManualLocalAiLock(cycle.configurationSnapshot);
	} catch (error) {
		if (error instanceof Error && error.message === "LOCAL_AI_LOCK_MISSING") {
			return {
				included: false,
				status: "NOT_INCLUDED",
				pilotCycleId: null,
				counts: { expected: 0, pending: 0, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
				items: [],
				updatedAt: safeIso(cycle.updatedAt),
			};
		}
		throw new Error("LOCAL_AI_CONFIGURATION_INVALID");
	}
	const pilotLookup = await store.findAiPilot({
		tenantId: cycle.organizationId,
		projectId: cycle.projectId,
		configurationLockId: cycle.configurationLockId,
	});
	const expected = lock.lock.discovery.expectedObservations;
	if (pilotLookup.state === "AMBIGUOUS") {
		return {
			included: true,
			status: "UNKNOWN",
			pilotCycleId: null,
			counts: { expected, pending: 0, valid: 0, invalid: 0, unknown: expected, blocked: 0 },
			items: [],
			updatedAt: safeIso(cycle.updatedAt),
		};
	}
	if (pilotLookup.state === "NONE") {
		return {
			included: true,
			status: expected === 0 ? "COMPLETED" : "NOT_STARTED",
			pilotCycleId: null,
			counts: { expected, pending: expected, valid: 0, invalid: 0, unknown: 0, blocked: 0 },
			items: [],
			updatedAt: safeIso(cycle.updatedAt),
		};
	}
	const pilot = pilotLookup.pilot;
	if (pilot.expectedObservations !== expected) throw new Error("LOCAL_AI_CARDINALITY_MISMATCH");
	const rows = await store.listAiTaskAssets({ tenantId: cycle.organizationId, pilotCycleId: pilot.id });
	const grouped = new Map<string, LocalReadAiTaskAssetRow[]>();
	for (const row of rows) grouped.set(row.captureTaskId, [...(grouped.get(row.captureTaskId) ?? []), row]);
	if (grouped.size > expected) throw new Error("LOCAL_AI_PROGRESS_EXCEEDS_EXPECTED");
	const allowedScenarioIds = new Set(lock.lock.discovery.scenarios.map((scenario) => scenario.scenarioId));
	const allowedContextHashes = new Set(lock.lock.discovery.observerContexts.map((context) => contextHash(context)));
	for (const row of rows) {
		if (
			!allowedScenarioIds.has(row.scenarioId) ||
			!allowedContextHashes.has(row.contextHash) ||
			row.repeatIndex < 0 ||
			row.repeatIndex >= lock.lock.discovery.repeats
		)
			throw new Error("LOCAL_AI_TASK_OUTSIDE_LOCK");
	}
	const items = [...grouped.values()]
		.map((taskRows) => evaluateAiTask(taskRows, pilot.id, cycle.id))
		.sort((a, b) => {
			const byTime = a.position.sortValue.localeCompare(b.position.sortValue);
			return byTime !== 0 ? byTime : a.position.tieBreakerId.localeCompare(b.position.tieBreakerId);
		});
	const valid = items.filter((item) => item.progressState === "VALID").length;
	const invalid = items.filter((item) => item.progressState === "INVALID").length;
	const unknown = items.filter((item) => item.progressState === "UNKNOWN").length;
	const pendingItems = items.filter((item) => item.progressState === "PENDING").length;
	const missing = expected - items.length;
	const blocked = blockedAiPilotStatuses.has(pilot.status) ? missing : 0;
	const pending = blocked > 0 ? 0 : missing + pendingItems;
	const observed = valid + invalid + unknown;
	const status =
		blocked > 0
			? "BLOCKED"
			: observed === 0 && pending === expected
				? "NOT_STARTED"
				: pending > 0
					? "PARTIAL"
					: invalid > 0 || unknown > 0
						? "PARTIAL"
						: "COMPLETED";
	return {
		included: true,
		status,
		pilotCycleId: pilot.id,
		counts: { expected, pending, valid, invalid, unknown, blocked },
		items,
		updatedAt: maxIso([safeIso(cycle.updatedAt), safeIso(pilot.updatedAt), ...items.map((item) => item.updatedAt)]),
	};
}

export function createSelenaLocalReadApi(store: SelenaLocalReadStore) {
	async function ownedCycle(tenantId: string, cycleId: string): Promise<LocalReadCycle> {
		const cycle = await store.findCycle({ tenantId, cycleId });
		if (!cycle) throw new SelenaLocalCycleNotFoundError();
		return cycle;
	}

	return {
		async progress(input: { tenantId: string; cycleId: string }) {
			const cycle = await ownedCycle(input.tenantId, input.cycleId);
			const [counts, localAi] = await Promise.all([store.countMapObservations(input), evaluateLocalAi(store, cycle)]);
			const maps = mapProgress(cycle, counts);
			const storedStatus = cycleProgressStatus(cycle.status);
			const status =
				(storedStatus === "READY" || storedStatus === "COMPLETED") &&
				(maps.status !== "COMPLETED" || (localAi.included && localAi.status !== "COMPLETED"))
					? ("UNKNOWN" as const)
					: storedStatus;
			return localApiProgressResponseSchema.parse({
				cycleId: cycle.id,
				status,
				maps: {
					surface: "LOCAL_MAPS",
					...maps,
				},
				localAi: {
					surface: "LOCAL_AI",
					executionMode: "MANUAL_ONLY" as const,
					status: localAi.status,
					automationAllowed: false as const,
					counts: localAi.counts,
				},
				updatedAt: maxIso([safeIso(cycle.updatedAt), localAi.updatedAt]),
			});
		},

		async mapResults(input: {
			tenantId: string;
			cycleId: string;
			limit: number;
			after: LocalReadCursorPosition | null;
			snapshotVersion?: string | null;
		}) {
			const cycle = await ownedCycle(input.tenantId, input.cycleId);
			const snapshotVersion = assertCursorSnapshot(cycle, input.snapshotVersion);
			const [counts, datasetId] = await Promise.all([store.countMapObservations(input), store.findMapDatasetId(input)]);
			const progress = mapProgress(cycle, counts);
			const page = pageRows(
				await store.listMapResults({
					tenantId: input.tenantId,
					cycleId: input.cycleId,
					limit: input.limit + 1,
					after: input.after,
				}),
				input.limit,
				(row) => ({
					sortValue: safeIso(row.capturedAt),
					tieBreakerId: row.observationId,
				}),
			);
			const pageDatasetIds = new Set(page.items.map((row) => row.datasetId));
			if (pageDatasetIds.size > 1) throw new Error("LOCAL_MAPS_MULTIPLE_DATASETS");
			const effectiveDatasetId = datasetId ?? [...pageDatasetIds][0] ?? null;
			if (page.items.some((row) => row.datasetId !== effectiveDatasetId))
				throw new Error("LOCAL_MAPS_DATASET_IDENTITY_MISMATCH");
			return {
				cycleId: input.cycleId,
				snapshotVersion,
				datasetId: effectiveDatasetId,
				surface: "LOCAL_MAPS" as const,
				status: blockedCycleStatuses.has(cycle.status)
					? ("BLOCKED" as const)
					: effectiveDatasetId === null
						? ("UNKNOWN" as const)
						: progress.status === "COMPLETED"
							? ("READY" as const)
							: progress.status === "RUNNING" || progress.status === "PARTIAL"
								? ("PARTIAL" as const)
								: ("UNKNOWN" as const),
				items: page.items.map((row) => {
					const measured = row.displayStatus === "MEASURED" || row.displayStatus === "MISSING";
					const sourceProven = hasImmutableSourceProvenance(row);
					return {
						observationId: row.observationId,
						gridPointId: row.gridPointId,
						pointIndex: row.pointIndex,
						latitude: finiteNumber(row.latitude),
						longitude: finiteNumber(row.longitude),
						keywordId: row.keywordId,
						keyword: row.keyword,
						provider: row.provider,
						repeatIndex: row.repeatIndex,
						capturedAt: safeIso(row.capturedAt),
						status:
							measured && sourceProven
								? row.displayStatus === "MEASURED"
									? ("FOUND" as const)
									: ("ABSENT_WITHIN_DEPTH" as const)
								: row.displayStatus === "INVALID"
									? ("INVALID" as const)
									: ("UNKNOWN" as const),
						targetRank: row.displayStatus === "MEASURED" && sourceProven ? row.targetRank : null,
						reasonCode:
							measured && sourceProven
								? null
								: measured
									? "SOURCE_PROVENANCE_UNKNOWN"
									: (row.invalidReason ?? "SOURCE_STATUS_UNKNOWN"),
						evidenceIds: [row.evidenceId],
					};
				}),
				nextPosition: page.nextPosition,
			};
		},

		async aiResults(input: {
			tenantId: string;
			cycleId: string;
			limit?: number;
			after?: LocalReadCursorPosition | null;
			snapshotVersion?: string | null;
		}) {
			const cycle = await ownedCycle(input.tenantId, input.cycleId);
			const evaluation = await evaluateLocalAi(store, cycle);
			const limit = input.limit ?? 50;
			const after = input.after ?? null;
			const snapshotVersion = assertCursorSnapshot(cycle, input.snapshotVersion, evaluation.updatedAt);
			const page = pageRows(
				evaluation.items.filter((item) => isAfterPosition(item.position, after)),
				limit,
				(item) => item.position,
			);
			const status = !evaluation.included
				? ("NOT_INCLUDED" as const)
				: evaluation.status === "COMPLETED"
					? ("READY" as const)
					: evaluation.status === "PARTIAL"
						? ("PARTIAL" as const)
						: evaluation.status === "BLOCKED"
							? ("BLOCKED" as const)
							: ("UNKNOWN" as const);
			return {
				cycleId: input.cycleId,
				snapshotVersion,
				pilotCycleId: evaluation.pilotCycleId,
				surface: "LOCAL_AI" as const,
				executionMode: "MANUAL_ONLY" as const,
				status,
				automationAllowed: false as const,
				items: page.items.map(({ position: _position, progressState: _progressState, ...item }) => item),
				nextPosition: page.nextPosition,
			};
		},

		async evidence(input: {
			tenantId: string;
			cycleId: string;
			limit: number;
			after: LocalReadCursorPosition | null;
			snapshotVersion?: string | null;
		}) {
			const cycle = await ownedCycle(input.tenantId, input.cycleId);
			const [evaluation, mapRows] = await Promise.all([
				evaluateLocalAi(store, cycle),
				store.listEvidence({
					tenantId: input.tenantId,
					measurementCycleId: cycle.measurementCycleId,
					limit: input.limit + 1,
					after: input.after,
				}),
			]);
			const aiRows = evaluation.pilotCycleId
				? await store.listAiEvidence({
						tenantId: input.tenantId,
						pilotCycleId: evaluation.pilotCycleId,
						limit: input.limit + 1,
						after: input.after,
					})
				: [];
			const merged = [
				...mapRows.map((row) => ({
					kind: "MAPS" as const,
					row,
					position: { sortValue: safeIso(row.capturedAt), tieBreakerId: row.id },
				})),
				...aiRows.map((row) => ({
					kind: "AI" as const,
					row,
					position: { sortValue: safeIso(row.capturedAt), tieBreakerId: row.id },
				})),
			]
				.filter((entry) => isAfterPosition(entry.position, input.after))
				.sort((a, b) =>
					a.position.sortValue === b.position.sortValue
						? a.position.tieBreakerId.localeCompare(b.position.tieBreakerId)
						: a.position.sortValue.localeCompare(b.position.sortValue),
				);
			const page = pageRows(merged, input.limit, (entry) => entry.position);
			const snapshotVersion = assertCursorSnapshot(
				cycle,
				input.snapshotVersion,
				maxIso([evaluation.updatedAt, ...page.items.map((entry) => safeIso(entry.row.capturedAt))]),
			);
			return {
				cycleId: input.cycleId,
				snapshotVersion,
				items: page.items.map((entry) => {
					if (entry.kind === "AI") {
						const hasProvenance =
							/^(?:sha256:)?[a-f0-9]{64}$/.test(entry.row.sha256) && !Number.isNaN(entry.row.capturedAt.getTime());
						return {
							evidenceId: entry.row.id,
							datasetId: null,
							surface: "LOCAL_AI" as const,
							status: hasProvenance ? ("VALID" as const) : ("UNKNOWN" as const),
							kind: entry.row.assetType,
							contentSha256: hasProvenance ? entry.row.sha256 : null,
							capturedAt: hasProvenance ? safeIso(entry.row.capturedAt) : null,
							access: {
								state: "UNAVAILABLE" as const,
								reason: "SIGNING_UNAVAILABLE" as const,
								url: null,
								expiresAt: null,
								ttlSeconds: LOCAL_API_EVIDENCE_TTL_SECONDS,
							},
						};
					}
					const row = entry.row;
					const hasSourceProvenance = hasImmutableSourceProvenance(row);
					return {
						evidenceId: row.id,
						datasetId: row.datasetId,
						surface: "LOCAL_MAPS" as const,
						status: hasSourceProvenance ? ("VALID" as const) : ("UNKNOWN" as const),
						kind: row.sourceType ?? `${row.domainId}_OBSERVATION`,
						contentSha256: hasSourceProvenance ? row.sourceContentSha256 : null,
						capturedAt: hasSourceProvenance && row.sourceCapturedAt ? safeIso(row.sourceCapturedAt) : null,
						access: {
							state: "UNAVAILABLE" as const,
							reason: "SIGNING_UNAVAILABLE" as const,
							url: null,
							expiresAt: null,
							ttlSeconds: LOCAL_API_EVIDENCE_TTL_SECONDS,
						},
					};
				}),
				nextPosition: page.nextPosition,
			};
		},
	};
}

function afterDate(position: LocalReadCursorPosition | null): Date | null {
	if (!position) return null;
	const value = new Date(position.sortValue);
	if (Number.isNaN(value.getTime())) throw new Error("INVALID_CURSOR_POSITION");
	return value;
}

export const selenaLocalReadStore: SelenaLocalReadStore = {
	async findCycle({ tenantId, cycleId }) {
		const [cycle] = await db
			.select({
				id: svLocalScanCycles.id,
				organizationId: svLocalScanCycles.organizationId,
				measurementCycleId: svLocalScanCycles.measurementCycleId,
				configurationLockId: svLocalScanCycles.configurationLockId,
				projectId: svConfigurationLocks.projectId,
				configurationSnapshot: svConfigurationLocks.snapshot,
				status: svLocalScanCycles.status,
				expectedObservations: svLocalScanCycles.expectedObservations,
				createdObservations: svLocalScanCycles.createdObservations,
				createdAt: svLocalScanCycles.createdAt,
				updatedAt: svLocalScanCycles.updatedAt,
			})
			.from(svLocalScanCycles)
			.innerJoin(
				svConfigurationLocks,
				and(
					eq(svConfigurationLocks.id, svLocalScanCycles.configurationLockId),
					eq(svConfigurationLocks.organizationId, svLocalScanCycles.organizationId),
				),
			)
			.where(and(eq(svLocalScanCycles.id, cycleId), eq(svLocalScanCycles.organizationId, tenantId)))
			.limit(1);
		return cycle ?? null;
	},

	async findAiPilot({ tenantId, projectId, configurationLockId }) {
		const pilots = await db
			.select({
				id: svPilotCycles.id,
				expectedObservations: svPilotCycles.expectedObservations,
				createdObservations: svPilotCycles.createdObservations,
				status: svPilotCycles.status,
				updatedAt: svPilotCycles.updatedAt,
			})
			.from(svPilotCycles)
			.where(
				and(
					eq(svPilotCycles.organizationId, tenantId),
					eq(svPilotCycles.projectId, projectId),
					eq(svPilotCycles.lockId, configurationLockId),
				),
			)
			.orderBy(asc(svPilotCycles.id))
			.limit(2);
		if (pilots.length === 0) return { state: "NONE" };
		if (pilots.length > 1) return { state: "AMBIGUOUS" };
		return { state: "ONE", pilot: pilots[0] };
	},

	async listAiTaskAssets({ tenantId, pilotCycleId }) {
		return db
			.select({
				captureTaskId: svCaptureTasks.id,
				scenarioId: svCaptureTasks.scenarioId,
				contextHash: svCaptureTasks.contextHash,
				repeatIndex: svCaptureTasks.repeatIndex,
				taskStatus: svCaptureTasks.status,
				taskCreatedAt: svCaptureTasks.createdAt,
				taskUpdatedAt: svCaptureTasks.updatedAt,
				queryTextSnapshot: svCaptureTasks.queryTextSnapshot,
				contextSnapshot: svCaptureTasks.contextSnapshot,
				observationId: svLocalObservations.id,
				observationCapturedAt: svLocalObservations.capturedAt,
				observationReviewStatus: svLocalObservations.reviewStatus,
				observationValidity: svLocalObservations.validity,
				observationInvalidReason: svLocalObservations.invalidReason,
				evidenceId: svObservationEvidenceAssets.id,
				evidenceSequenceIndex: svObservationEvidenceAssets.sequenceIndex,
				evidenceSha256: svObservationEvidenceAssets.sha256,
				evidenceCapturedAt: svObservationEvidenceAssets.capturedAt,
			})
			.from(svCaptureTasks)
			.innerJoin(
				svPilotCycles,
				and(
					eq(svPilotCycles.id, svCaptureTasks.pilotCycleId),
					eq(svPilotCycles.organizationId, svCaptureTasks.organizationId),
				),
			)
			.leftJoin(
				svLocalObservations,
				and(
					eq(svLocalObservations.captureTaskId, svCaptureTasks.id),
					eq(svLocalObservations.organizationId, svCaptureTasks.organizationId),
				),
			)
			.leftJoin(
				svObservationEvidenceAssets,
				and(
					eq(svObservationEvidenceAssets.observationId, svLocalObservations.id),
					eq(svObservationEvidenceAssets.organizationId, svCaptureTasks.organizationId),
				),
			)
			.where(and(eq(svCaptureTasks.organizationId, tenantId), eq(svCaptureTasks.pilotCycleId, pilotCycleId)))
			.orderBy(
				asc(svCaptureTasks.createdAt),
				asc(svCaptureTasks.id),
				asc(svObservationEvidenceAssets.sequenceIndex),
				asc(svObservationEvidenceAssets.id),
			);
	},

	async listAiEvidence({ tenantId, pilotCycleId, limit, after }) {
		const capturedAt = afterDate(after);
		return db
			.select({
				id: svObservationEvidenceAssets.id,
				assetType: svObservationEvidenceAssets.assetType,
				sha256: svObservationEvidenceAssets.sha256,
				capturedAt: svObservationEvidenceAssets.capturedAt,
			})
			.from(svObservationEvidenceAssets)
			.innerJoin(
				svLocalObservations,
				and(
					eq(svLocalObservations.id, svObservationEvidenceAssets.observationId),
					eq(svLocalObservations.organizationId, svObservationEvidenceAssets.organizationId),
				),
			)
			.innerJoin(
				svCaptureTasks,
				and(
					eq(svCaptureTasks.id, svLocalObservations.captureTaskId),
					eq(svCaptureTasks.organizationId, svObservationEvidenceAssets.organizationId),
				),
			)
			.where(
				and(
					eq(svObservationEvidenceAssets.organizationId, tenantId),
					eq(svCaptureTasks.pilotCycleId, pilotCycleId),
					capturedAt && after
						? or(
								gt(svObservationEvidenceAssets.capturedAt, capturedAt),
								and(
									eq(svObservationEvidenceAssets.capturedAt, capturedAt),
									gt(svObservationEvidenceAssets.id, after.tieBreakerId),
								),
							)
						: undefined,
				),
			)
			.orderBy(asc(svObservationEvidenceAssets.capturedAt), asc(svObservationEvidenceAssets.id))
			.limit(limit);
	},

	async countMapObservations({ tenantId, cycleId }) {
		const [counts] = await db
			.select({
				valid: sql<number>`count(*) filter (where ${svVisibilityMapPoints.displayStatus} in ('MEASURED', 'MISSING') and ${svSourceSnapshots.sourceType} = 'MAPS_SERP_PROVIDER' and ${svSourceSnapshots.immutable} is true and ${svSourceSnapshots.contentSha256} ~ '^(sha256:)?[a-f0-9]{64}$' and ${svSourceSnapshots.capturedAt} is not null)::integer`,
				invalid: sql<number>`count(*) filter (where ${svVisibilityMapPoints.displayStatus} = 'INVALID')::integer`,
				unknown: sql<number>`count(*) filter (where ${svVisibilityMapPoints.displayStatus} = 'UNKNOWN' or (${svVisibilityMapPoints.displayStatus} in ('MEASURED', 'MISSING') and (${svSourceSnapshots.sourceType} is distinct from 'MAPS_SERP_PROVIDER' or ${svSourceSnapshots.immutable} is not true or ${svSourceSnapshots.contentSha256} is null or ${svSourceSnapshots.contentSha256} !~ '^(sha256:)?[a-f0-9]{64}$' or ${svSourceSnapshots.capturedAt} is null)))::integer`,
			})
			.from(svVisibilityMapPoints)
			.innerJoin(
				svEvidenceIndex,
				and(
					eq(svEvidenceIndex.organizationId, svVisibilityMapPoints.organizationId),
					eq(svEvidenceIndex.cycleId, svVisibilityMapPoints.measurementCycleId),
					eq(svEvidenceIndex.datasetId, svVisibilityMapPoints.datasetId),
					eq(svEvidenceIndex.observationRef, sql`${svVisibilityMapPoints.observationId}::text`),
				),
			)
			.leftJoin(
				svSourceSnapshots,
				and(
					eq(svSourceSnapshots.id, svEvidenceIndex.sourceSnapshotId),
					eq(svSourceSnapshots.organizationId, svEvidenceIndex.organizationId),
				),
			)
			.where(and(eq(svVisibilityMapPoints.localCycleId, cycleId), eq(svVisibilityMapPoints.organizationId, tenantId)));
		return {
			valid: Number(counts?.valid ?? 0),
			invalid: Number(counts?.invalid ?? 0),
			unknown: Number(counts?.unknown ?? 0),
		};
	},

	async findMapDatasetId({ tenantId, cycleId }) {
		const datasets = await db
			.select({ id: svVisibilityMapDatasets.datasetId })
			.from(svVisibilityMapDatasets)
			.where(
				and(eq(svVisibilityMapDatasets.organizationId, tenantId), eq(svVisibilityMapDatasets.localCycleId, cycleId)),
			)
			.orderBy(asc(svVisibilityMapDatasets.datasetId))
			.limit(2);
		if (datasets.length > 1) throw new Error("LOCAL_MAPS_MULTIPLE_DATASETS");
		return datasets[0]?.id ?? null;
	},

	async listMapResults({ tenantId, cycleId, limit, after }) {
		const capturedAt = afterDate(after);
		return db
			.select({
				observationId: svVisibilityMapPoints.observationId,
				evidenceId: svEvidenceIndex.id,
				sourceSnapshotImmutable: svSourceSnapshots.immutable,
				sourceType: svSourceSnapshots.sourceType,
				sourceContentSha256: svSourceSnapshots.contentSha256,
				sourceCapturedAt: svSourceSnapshots.capturedAt,
				datasetId: svVisibilityMapPoints.datasetId,
				measurementCycleId: svVisibilityMapPoints.measurementCycleId,
				localCycleId: svVisibilityMapPoints.localCycleId,
				locationId: svVisibilityMapPoints.locationId,
				gridDefinitionId: svVisibilityMapPoints.gridDefinitionId,
				gridDefinitionVersion: svVisibilityMapPoints.gridDefinitionVersion,
				gridPointId: svVisibilityMapPoints.gridPointId,
				pointIndex: svVisibilityMapPoints.pointIndex,
				latitude: svVisibilityMapPoints.latitude,
				longitude: svVisibilityMapPoints.longitude,
				capturedAt: svVisibilityMapPoints.capturedAt,
				provider: svVisibilityMapPoints.provider,
				keywordId: svVisibilityMapPoints.keywordId,
				keyword: svVisibilityMapPoints.keyword,
				locale: svVisibilityMapPoints.locale,
				deviceContext: svVisibilityMapPoints.deviceContext,
				formulaVersion: svVisibilityMapPoints.formulaVersion,
				repeatIndex: svVisibilityMapPoints.repeatIndex,
				sourceValidity: svVisibilityMapPoints.sourceValidity,
				invalidReason: svVisibilityMapPoints.invalidReason,
				targetRank: svVisibilityMapPoints.targetRank,
				displayStatus: svVisibilityMapPoints.displayStatus,
				interpolated: svVisibilityMapPoints.interpolated,
				datasetStatus: svVisibilityMapPoints.datasetStatus,
				materializationKind: svVisibilityMapPoints.materializationKind,
				refreshedAt: svVisibilityMapPoints.refreshedAt,
				isStale: svVisibilityMapPoints.isStale,
			})
			.from(svVisibilityMapPoints)
			.innerJoin(
				svEvidenceIndex,
				and(
					eq(svEvidenceIndex.organizationId, svVisibilityMapPoints.organizationId),
					eq(svEvidenceIndex.cycleId, svVisibilityMapPoints.measurementCycleId),
					eq(svEvidenceIndex.datasetId, svVisibilityMapPoints.datasetId),
					eq(svEvidenceIndex.observationRef, sql`${svVisibilityMapPoints.observationId}::text`),
				),
			)
			.leftJoin(
				svSourceSnapshots,
				and(
					eq(svSourceSnapshots.id, svEvidenceIndex.sourceSnapshotId),
					eq(svSourceSnapshots.organizationId, svEvidenceIndex.organizationId),
				),
			)
			.where(
				and(
					eq(svVisibilityMapPoints.organizationId, tenantId),
					eq(svVisibilityMapPoints.localCycleId, cycleId),
					capturedAt && after
						? or(
								gt(svVisibilityMapPoints.capturedAt, capturedAt),
								and(
									eq(svVisibilityMapPoints.capturedAt, capturedAt),
									gt(svVisibilityMapPoints.observationId, after.tieBreakerId),
								),
							)
						: undefined,
				),
			)
			.orderBy(asc(svVisibilityMapPoints.capturedAt), asc(svVisibilityMapPoints.observationId))
			.limit(limit);
	},

	async listEvidence({ tenantId, measurementCycleId, limit, after }) {
		const capturedAt = afterDate(after);
		return db
			.select({
				id: svEvidenceIndex.id,
				domainId: svEvidenceIndex.domainId,
				observationRef: svEvidenceIndex.observationRef,
				capturedAt: svEvidenceIndex.capturedAt,
				datasetId: svMeasurementDatasets.id,
				datasetKey: svMeasurementDatasets.datasetKey,
				datasetVersion: svMeasurementDatasets.version,
				datasetImmutable: svMeasurementDatasets.immutable,
				datasetCreatedAt: svMeasurementDatasets.createdAt,
				sourceSnapshotId: svSourceSnapshots.id,
				sourceSnapshotImmutable: svSourceSnapshots.immutable,
				sourceType: svSourceSnapshots.sourceType,
				sourceContentSha256: svSourceSnapshots.contentSha256,
				sourceCapturedAt: svSourceSnapshots.capturedAt,
			})
			.from(svEvidenceIndex)
			.innerJoin(
				svMeasurementDatasets,
				and(
					eq(svMeasurementDatasets.id, svEvidenceIndex.datasetId),
					eq(svMeasurementDatasets.organizationId, svEvidenceIndex.organizationId),
					eq(svMeasurementDatasets.cycleId, svEvidenceIndex.cycleId),
				),
			)
			.leftJoin(
				svSourceSnapshots,
				and(
					eq(svSourceSnapshots.id, svEvidenceIndex.sourceSnapshotId),
					eq(svSourceSnapshots.organizationId, svEvidenceIndex.organizationId),
				),
			)
			.where(
				and(
					eq(svEvidenceIndex.organizationId, tenantId),
					eq(svEvidenceIndex.cycleId, measurementCycleId),
					eq(svEvidenceIndex.domainId, "LOCAL_MAPS"),
					eq(svMeasurementDatasets.immutable, true),
					capturedAt && after
						? or(
								gt(svEvidenceIndex.capturedAt, capturedAt),
								and(eq(svEvidenceIndex.capturedAt, capturedAt), gt(svEvidenceIndex.id, after.tieBreakerId)),
							)
						: undefined,
				),
			)
			.orderBy(asc(svEvidenceIndex.capturedAt), asc(svEvidenceIndex.id))
			.limit(limit);
	},
};

export const selenaLocalReadApi = createSelenaLocalReadApi(selenaLocalReadStore);

type LocalReadRouteAuth = { tenantId: string; permissions: readonly string[] };
type LocalReadApi = ReturnType<typeof createSelenaLocalReadApi>;

export type SelenaLocalReadRouteDependencies = {
	api: LocalReadApi;
	authenticate(request: Request): Promise<LocalReadRouteAuth>;
	requestId(): string;
};

const defaultRouteDependencies: SelenaLocalReadRouteDependencies = {
	api: selenaLocalReadApi,
	authenticate: resolveApiKeyAuthContext,
	requestId: randomUUID,
};

function localReadErrorResponse(error: unknown, requestId: string): Response {
	if (error instanceof SelenaApiHttpError) return selenaApiHttpErrorResponse(error, requestId);
	if (error instanceof SelenaLocalCycleNotFoundError) {
		return selenaApiErrorResponse(404, {
			code: "LOCAL_CYCLE_NOT_FOUND",
			message: "Local scan cycle was not found.",
			requestId,
			retryable: false,
		});
	}
	const message = error instanceof Error ? error.message : "";
	if (message.startsWith("Unauthorized")) {
		return selenaApiErrorResponse(401, {
			code: "AUTH_UNAUTHORIZED",
			message: "A valid scoped API key is required.",
			requestId,
			retryable: false,
		});
	}
	if (message.startsWith("Forbidden")) {
		return selenaApiErrorResponse(403, {
			code: "AUTH_FORBIDDEN",
			message: "The API key cannot access this tenant.",
			requestId,
			retryable: false,
		});
	}
	return selenaApiErrorResponse(500, {
		code: "INTERNAL_ERROR",
		message: "The local visibility read could not be completed.",
		requestId,
		retryable: false,
	});
}

function nextCursor(
	position: LocalReadCursorPosition | null,
	binding: { tenantId: string; cycleId: string; resource: LocalApiCursorResource },
	snapshotVersion: string,
): string | null {
	return position ? encodeSelenaApiCursor({ version: 1, ...binding, snapshotVersion, position }) : null;
}

function validateCycleId(cycleId: string): string {
	const parsed = z.string().uuid().safeParse(cycleId);
	if (!parsed.success) {
		throw new SelenaApiHttpError(400, "LOCAL_CYCLE_ID_INVALID", "cycleId must be a valid UUID.");
	}
	return parsed.data;
}

export function createSelenaLocalReadRouteHandlers(
	dependencies: SelenaLocalReadRouteDependencies = defaultRouteDependencies,
) {
	return {
		async progress(request: Request, cycleId: string): Promise<Response> {
			const requestId = dependencies.requestId();
			try {
				const auth = await dependencies.authenticate(request);
				requireSelenaApiScope(auth.permissions, "local:read");
				return Response.json(
					await dependencies.api.progress({ tenantId: auth.tenantId, cycleId: validateCycleId(cycleId) }),
				);
			} catch (error) {
				return localReadErrorResponse(error, requestId);
			}
		},

		async mapResults(request: Request, cycleId: string): Promise<Response> {
			const requestId = dependencies.requestId();
			try {
				const auth = await dependencies.authenticate(request);
				requireSelenaApiScope(auth.permissions, "local:read");
				const validatedCycleId = validateCycleId(cycleId);
				const binding = { tenantId: auth.tenantId, cycleId: validatedCycleId, resource: "map-results" as const };
				const query = parseSelenaApiCursor(new URL(request.url).searchParams, binding);
				const result = await dependencies.api.mapResults({
					tenantId: auth.tenantId,
					cycleId: validatedCycleId,
					limit: query.limit,
					after: query.cursor?.position ?? null,
					snapshotVersion: query.cursor?.snapshotVersion ?? null,
				});
				const { nextPosition, snapshotVersion, ...body } = result;
				return Response.json(
					localApiMapResultsResponseSchema.parse({
						...body,
						page: { limit: query.limit, nextCursor: nextCursor(nextPosition, binding, snapshotVersion) },
					}),
				);
			} catch (error) {
				return localReadErrorResponse(error, requestId);
			}
		},

		async aiResults(request: Request, cycleId: string): Promise<Response> {
			const requestId = dependencies.requestId();
			try {
				const auth = await dependencies.authenticate(request);
				requireSelenaApiScope(auth.permissions, "local:read");
				const validatedCycleId = validateCycleId(cycleId);
				const binding = { tenantId: auth.tenantId, cycleId: validatedCycleId, resource: "ai-results" as const };
				const query = parseSelenaApiCursor(new URL(request.url).searchParams, binding);
				const result = await dependencies.api.aiResults({
					tenantId: auth.tenantId,
					cycleId: validatedCycleId,
					limit: query.limit,
					after: query.cursor?.position ?? null,
					snapshotVersion: query.cursor?.snapshotVersion ?? null,
				});
				const { nextPosition, snapshotVersion, ...body } = result;
				return Response.json(
					localApiAiResultsResponseSchema.parse({
						...body,
						page: { limit: query.limit, nextCursor: nextCursor(nextPosition, binding, snapshotVersion) },
					}),
				);
			} catch (error) {
				return localReadErrorResponse(error, requestId);
			}
		},

		async evidence(request: Request, cycleId: string): Promise<Response> {
			const requestId = dependencies.requestId();
			try {
				const auth = await dependencies.authenticate(request);
				requireSelenaApiScope(auth.permissions, "evidence:read");
				const validatedCycleId = validateCycleId(cycleId);
				const binding = { tenantId: auth.tenantId, cycleId: validatedCycleId, resource: "evidence" as const };
				const query = parseSelenaApiCursor(new URL(request.url).searchParams, binding);
				const result = await dependencies.api.evidence({
					tenantId: auth.tenantId,
					cycleId: validatedCycleId,
					limit: query.limit,
					after: query.cursor?.position ?? null,
					snapshotVersion: query.cursor?.snapshotVersion ?? null,
				});
				const { nextPosition, snapshotVersion, ...body } = result;
				return Response.json(
					localApiEvidenceResponseSchema.parse({
						...body,
						page: { limit: query.limit, nextCursor: nextCursor(nextPosition, binding, snapshotVersion) },
					}),
				);
			} catch (error) {
				return localReadErrorResponse(error, requestId);
			}
		},
	};
}

export const selenaLocalReadRouteHandlers = createSelenaLocalReadRouteHandlers();
