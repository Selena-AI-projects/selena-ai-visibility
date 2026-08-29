import { z } from "zod";

export const visibilityMapModes = [
	"MAPS",
	"AI_LOCAL_INTENT",
	"COMPETITORS",
	"REVIEWS",
	"CHANGES",
	"BEFORE_AFTER",
] as const;

export const visibilityMapModeEvidence = Object.freeze({
	MAPS: { source: "LOCAL_RANK_OBSERVATION", spatialAnchor: "GRID_POINT" },
	AI_LOCAL_INTENT: { source: "MANUAL_LOCAL_OBSERVATION", spatialAnchor: "LOCATION" },
	COMPETITORS: { source: "LOCAL_COMPETITOR_OBSERVATION", spatialAnchor: "GRID_POINT" },
	REVIEWS: { source: "REVIEW_SNAPSHOT", spatialAnchor: "LOCATION" },
	CHANGES: { source: "CHANGE_EVENT", spatialAnchor: "LOCATION" },
	BEFORE_AFTER: { source: "LOCAL_RANK_OBSERVATION_PAIR", spatialAnchor: "GRID_POINT" },
} as const satisfies Record<(typeof visibilityMapModes)[number], { source: string; spatialAnchor: string }>);

export const visibilityMapPointStatuses = ["MEASURED", "MISSING", "INVALID", "UNKNOWN"] as const;
export type VisibilityMapPointStatus = (typeof visibilityMapPointStatuses)[number];

export const visibilityMapMarkerSemantics = Object.freeze({
	MEASURED: { shape: "CIRCLE", pattern: "SOLID" },
	MISSING: { shape: "SQUARE", pattern: "DIAGONAL" },
	INVALID: { shape: "TRIANGLE", pattern: "CROSSHATCH" },
	UNKNOWN: { shape: "DIAMOND", pattern: "DOTTED" },
} as const satisfies Record<VisibilityMapPointStatus, { shape: string; pattern: string }>);

export const visibilityMapMaterializationSchema = z.discriminatedUnion("kind", [
	z.strictObject({ kind: z.literal("LIVE_VIEW"), refreshedAt: z.null(), isStale: z.literal(false) }),
	z.strictObject({ kind: z.literal("MATERIALIZED"), refreshedAt: z.iso.datetime(), isStale: z.boolean() }),
]);

const uuid = z.string().uuid();
const uniqueNonEmptyStrings = z
	.array(z.string().trim().min(1))
	.min(1)
	.refine((values) => new Set(values).size === values.length, "Values must be unique");
const uniqueUuids = z
	.array(uuid)
	.min(1)
	.refine((values) => new Set(values).size === values.length, "UUIDs must be unique");

export const visibilityMapPointSchema = z
	.strictObject({
		organizationId: z.string().trim().min(1),
		projectId: uuid,
		locationId: uuid,
		datasetId: uuid,
		measurementCycleId: uuid,
		localCycleId: uuid,
		gridDefinitionId: uuid,
		gridDefinitionVersion: z.number().int().positive(),
		gridPointId: uuid,
		pointIndex: z.number().int().nonnegative(),
		latitude: z.number().finite().min(-90).max(90),
		longitude: z.number().finite().min(-180).max(180),
		observationId: uuid,
		capturedAt: z.iso.datetime(),
		provider: z.string().trim().min(1),
		keywordId: uuid,
		keyword: z.string().trim().min(1),
		locale: z.string().trim().min(1),
		deviceContext: z.string().trim().min(1),
		formulaVersion: z.string().trim().min(1),
		repeatIndex: z.number().int().nonnegative(),
		sourceValidity: z.enum(["VALID", "INVALID", "UNMEASURED"]),
		invalidReason: z.string().trim().min(1).nullable(),
		targetRank: z.number().int().positive().nullable(),
		displayStatus: z.enum(visibilityMapPointStatuses),
		interpolated: z.literal(false),
		materialization: visibilityMapMaterializationSchema,
	})
	.superRefine((point, context) => {
		const expected = visibilityMapPointStatus(point);
		if (point.displayStatus !== expected) {
			context.addIssue({ code: "custom", message: "VISIBILITY_MAP_STATUS_MISMATCH", path: ["displayStatus"] });
		}
		if (point.sourceValidity === "VALID" && point.invalidReason !== null) {
			context.addIssue({ code: "custom", message: "VISIBILITY_MAP_VALID_REASON_FORBIDDEN", path: ["invalidReason"] });
		}
		if (point.sourceValidity !== "VALID" && point.invalidReason === null) {
			context.addIssue({ code: "custom", message: "VISIBILITY_MAP_INVALID_REASON_REQUIRED", path: ["invalidReason"] });
		}
	});
export type VisibilityMapPoint = z.infer<typeof visibilityMapPointSchema>;

export function visibilityMapPointStatus(input: {
	sourceValidity: "VALID" | "INVALID" | "UNMEASURED";
	targetRank: number | null;
}): VisibilityMapPointStatus {
	if (input.sourceValidity === "INVALID") return "INVALID";
	if (input.sourceValidity === "UNMEASURED") return "UNKNOWN";
	return input.targetRank === null ? "MISSING" : "MEASURED";
}

export function visibilityMapPointPresentation(point: VisibilityMapPoint) {
	const parsed = visibilityMapPointSchema.parse(point);
	const marker = visibilityMapMarkerSemantics[parsed.displayStatus];
	return {
		...marker,
		tooltip: {
			timestamp: parsed.capturedAt,
			provider: parsed.provider,
			keyword: parsed.keyword,
		},
		ariaLabel: `${parsed.displayStatus}: ${parsed.keyword}; ${parsed.provider}; ${parsed.capturedAt}`,
	};
}

export const visibilityMapDatasetSchema = z
	.strictObject({
		organizationId: z.string().trim().min(1),
		projectId: uuid,
		locationId: uuid,
		datasetId: uuid,
		measurementCycleId: uuid,
		localCycleId: uuid,
		periodStart: z.iso.datetime(),
		periodEnd: z.iso.datetime(),
		keywordIds: uniqueUuids,
		gridDefinitionId: uuid,
		gridDefinitionVersion: z.number().int().positive(),
		providers: uniqueNonEmptyStrings,
		locales: uniqueNonEmptyStrings,
		deviceContexts: uniqueNonEmptyStrings,
		formulaVersions: uniqueNonEmptyStrings,
		datasetStatus: z.string().trim().min(1),
		observationCount: z.number().int().positive(),
		materialization: visibilityMapMaterializationSchema,
	})
	.refine((dataset) => Date.parse(dataset.periodEnd) >= Date.parse(dataset.periodStart), {
		message: "VISIBILITY_MAP_PERIOD_INVALID",
		path: ["periodEnd"],
	});
export type VisibilityMapDataset = z.infer<typeof visibilityMapDatasetSchema>;

export const visibilityMapCompatibilityReasons = [
	"DATASET_PAIR_IDENTICAL",
	"PROJECT_MISMATCH",
	"LOCATION_MISMATCH",
	"KEYWORD_SET_MISMATCH",
	"GRID_DEFINITION_MISMATCH",
	"PROVIDER_MISMATCH",
	"LOCALE_MISMATCH",
	"DEVICE_CONTEXT_MISMATCH",
	"FORMULA_VERSION_MISMATCH",
	"DATASET_STATUS_NOT_READY",
] as const;
export type VisibilityMapCompatibilityReason = (typeof visibilityMapCompatibilityReasons)[number];

function sameSet(left: readonly string[], right: readonly string[]): boolean {
	if (left.length !== right.length) return false;
	const rightSet = new Set(right);
	return left.every((value) => rightSet.has(value));
}

export type VisibilityMapCompatibility =
	| { comparable: true; baselineDatasetId: string; currentDatasetId: string; reasons: [] }
	| {
			comparable: false;
			baselineDatasetId: string;
			currentDatasetId: string;
			reasons: VisibilityMapCompatibilityReason[];
	  };

export function compareVisibilityMapDatasets(
	baselineInput: VisibilityMapDataset,
	currentInput: VisibilityMapDataset,
): VisibilityMapCompatibility {
	const baseline = visibilityMapDatasetSchema.parse(baselineInput);
	const current = visibilityMapDatasetSchema.parse(currentInput);
	const reasons: VisibilityMapCompatibilityReason[] = [];
	if (baseline.datasetId === current.datasetId) reasons.push("DATASET_PAIR_IDENTICAL");
	if (baseline.projectId !== current.projectId) reasons.push("PROJECT_MISMATCH");
	if (baseline.locationId !== current.locationId) reasons.push("LOCATION_MISMATCH");
	if (!sameSet(baseline.keywordIds, current.keywordIds)) reasons.push("KEYWORD_SET_MISMATCH");
	if (
		baseline.gridDefinitionId !== current.gridDefinitionId ||
		baseline.gridDefinitionVersion !== current.gridDefinitionVersion
	) {
		reasons.push("GRID_DEFINITION_MISMATCH");
	}
	if (!sameSet(baseline.providers, current.providers)) reasons.push("PROVIDER_MISMATCH");
	if (!sameSet(baseline.locales, current.locales)) reasons.push("LOCALE_MISMATCH");
	if (!sameSet(baseline.deviceContexts, current.deviceContexts)) reasons.push("DEVICE_CONTEXT_MISMATCH");
	if (!sameSet(baseline.formulaVersions, current.formulaVersions)) reasons.push("FORMULA_VERSION_MISMATCH");
	if (baseline.datasetStatus !== "READY" || current.datasetStatus !== "READY") {
		reasons.push("DATASET_STATUS_NOT_READY");
	}
	return reasons.length === 0
		? { comparable: true, baselineDatasetId: baseline.datasetId, currentDatasetId: current.datasetId, reasons: [] }
		: { comparable: false, baselineDatasetId: baseline.datasetId, currentDatasetId: current.datasetId, reasons };
}

export const VISIBILITY_MAP_DIFF_FORMULA_VERSION = "visibility-map-before-after/1";

export type VisibilityMapPointComparison = {
	keywordId: string;
	gridPointId: string;
	provider: string;
	repeatIndex: number;
	status: "COMPARED" | "UNKNOWN";
	reason?: "NOT_IN_BASELINE" | "NOT_IN_CURRENT" | "POINT_NOT_MEASURED";
	baselineObservationId?: string;
	currentObservationId?: string;
	baselineRank?: number | null;
	currentRank?: number | null;
	rankDelta?: number | null;
};

function pointKey(point: VisibilityMapPoint): string {
	return [point.keywordId, point.gridPointId, point.provider, point.repeatIndex].join(":");
}

function indexPoints(points: readonly VisibilityMapPoint[]): Map<string, VisibilityMapPoint> {
	const indexed = new Map<string, VisibilityMapPoint>();
	for (const point of points) {
		const key = pointKey(point);
		if (indexed.has(key)) throw new Error("VISIBILITY_MAP_POINT_KEY_DUPLICATE");
		indexed.set(key, point);
	}
	return indexed;
}

function assertPointsBelongToDataset(points: readonly VisibilityMapPoint[], dataset: VisibilityMapDataset): void {
	for (const point of points) {
		if (
			point.datasetId !== dataset.datasetId ||
			point.projectId !== dataset.projectId ||
			point.locationId !== dataset.locationId
		) {
			throw new Error("VISIBILITY_MAP_POINT_DATASET_MISMATCH");
		}
	}
}

export function compareVisibilityMapPoints(input: {
	baselineDataset: VisibilityMapDataset;
	currentDataset: VisibilityMapDataset;
	baselinePoints: readonly VisibilityMapPoint[];
	currentPoints: readonly VisibilityMapPoint[];
}) {
	const baselineDataset = visibilityMapDatasetSchema.parse(input.baselineDataset);
	const currentDataset = visibilityMapDatasetSchema.parse(input.currentDataset);
	const baselinePoints = input.baselinePoints.map((point) => visibilityMapPointSchema.parse(point));
	const currentPoints = input.currentPoints.map((point) => visibilityMapPointSchema.parse(point));
	assertPointsBelongToDataset(baselinePoints, baselineDataset);
	assertPointsBelongToDataset(currentPoints, currentDataset);
	const compatibility = compareVisibilityMapDatasets(baselineDataset, currentDataset);
	if (!compatibility.comparable) {
		return { formulaVersion: VISIBILITY_MAP_DIFF_FORMULA_VERSION, compatibility, points: [] };
	}

	const baselineByKey = indexPoints(baselinePoints);
	const currentByKey = indexPoints(currentPoints);
	const keys = [...new Set([...baselineByKey.keys(), ...currentByKey.keys()])].sort();
	const points: VisibilityMapPointComparison[] = keys.map((key) => {
		const baseline = baselineByKey.get(key);
		const current = currentByKey.get(key);
		const source = baseline ?? current;
		if (!source) throw new Error("VISIBILITY_MAP_POINT_KEY_EMPTY");
		const identity = {
			keywordId: source.keywordId,
			gridPointId: source.gridPointId,
			provider: source.provider,
			repeatIndex: source.repeatIndex,
		};
		if (!baseline) return { ...identity, status: "UNKNOWN" as const, reason: "NOT_IN_BASELINE" as const };
		if (!current) return { ...identity, status: "UNKNOWN" as const, reason: "NOT_IN_CURRENT" as const };
		if (
			baseline.displayStatus === "INVALID" ||
			baseline.displayStatus === "UNKNOWN" ||
			current.displayStatus === "INVALID" ||
			current.displayStatus === "UNKNOWN"
		) {
			return {
				...identity,
				status: "UNKNOWN" as const,
				reason: "POINT_NOT_MEASURED" as const,
				baselineObservationId: baseline.observationId,
				currentObservationId: current.observationId,
			};
		}
		return {
			...identity,
			status: "COMPARED" as const,
			baselineObservationId: baseline.observationId,
			currentObservationId: current.observationId,
			baselineRank: baseline.targetRank,
			currentRank: current.targetRank,
			rankDelta:
				baseline.targetRank === null || current.targetRank === null ? null : current.targetRank - baseline.targetRank,
		};
	});
	return { formulaVersion: VISIBILITY_MAP_DIFF_FORMULA_VERSION, compatibility, points };
}
