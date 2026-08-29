import { describe, expect, it } from "vitest";
import {
	compareVisibilityMapDatasets,
	compareVisibilityMapPoints,
	VISIBILITY_MAP_DIFF_FORMULA_VERSION,
	type VisibilityMapDataset,
	type VisibilityMapPoint,
	visibilityMapMarkerSemantics,
	visibilityMapModeEvidence,
	visibilityMapModes,
	visibilityMapPointPresentation,
	visibilityMapPointSchema,
	visibilityMapPointStatus,
} from "./visibility-map";

const ids = {
	project: "11111111-1111-4111-8111-111111111111",
	location: "22222222-2222-4222-8222-222222222222",
	baselineDataset: "33333333-3333-4333-8333-333333333333",
	currentDataset: "44444444-4444-4444-8444-444444444444",
	baselineCycle: "55555555-5555-4555-8555-555555555555",
	currentCycle: "66666666-6666-4666-8666-666666666666",
	baselineLocalCycle: "77777777-7777-4777-8777-777777777777",
	currentLocalCycle: "88888888-8888-4888-8888-888888888888",
	grid: "99999999-9999-4999-8999-999999999999",
	point: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	keyword: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	baselineObservation: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	currentObservation: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
} as const;

const dataset = (current = false, overrides: Partial<VisibilityMapDataset> = {}): VisibilityMapDataset => ({
	organizationId: "tenant-a",
	projectId: ids.project,
	locationId: ids.location,
	datasetId: current ? ids.currentDataset : ids.baselineDataset,
	measurementCycleId: current ? ids.currentCycle : ids.baselineCycle,
	localCycleId: current ? ids.currentLocalCycle : ids.baselineLocalCycle,
	periodStart: current ? "2026-09-01T00:00:00.000Z" : "2026-08-01T00:00:00.000Z",
	periodEnd: current ? "2026-09-01T01:00:00.000Z" : "2026-08-01T01:00:00.000Z",
	keywordIds: [ids.keyword],
	gridDefinitionId: ids.grid,
	gridDefinitionVersion: 1,
	providers: ["stub-local-rank"],
	locales: ["en"],
	deviceContexts: ["STUB"],
	formulaVersions: ["square-grid/1"],
	datasetStatus: "READY",
	observationCount: 1,
	materialization: { kind: "LIVE_VIEW", refreshedAt: null, isStale: false },
	...overrides,
});

const point = (current = false, overrides: Partial<VisibilityMapPoint> = {}): VisibilityMapPoint => ({
	organizationId: "tenant-a",
	projectId: ids.project,
	locationId: ids.location,
	datasetId: current ? ids.currentDataset : ids.baselineDataset,
	measurementCycleId: current ? ids.currentCycle : ids.baselineCycle,
	localCycleId: current ? ids.currentLocalCycle : ids.baselineLocalCycle,
	gridDefinitionId: ids.grid,
	gridDefinitionVersion: 1,
	gridPointId: ids.point,
	pointIndex: 0,
	latitude: -8.5069,
	longitude: 115.2625,
	observationId: current ? ids.currentObservation : ids.baselineObservation,
	capturedAt: current ? "2026-09-01T00:00:00.000Z" : "2026-08-01T00:00:00.000Z",
	provider: "stub-local-rank",
	keywordId: ids.keyword,
	keyword: "best bakery ubud",
	locale: "en",
	deviceContext: "STUB",
	formulaVersion: "square-grid/1",
	repeatIndex: 0,
	sourceValidity: "VALID",
	invalidReason: null,
	targetRank: current ? 2 : 5,
	displayStatus: "MEASURED",
	interpolated: false,
	materialization: { kind: "LIVE_VIEW", refreshedAt: null, isStale: false },
	...overrides,
});

describe("Visibility Map point contract", () => {
	it("defines the six canonical modes without creating separate layer contracts", () => {
		expect(visibilityMapModes).toEqual([
			"MAPS",
			"AI_LOCAL_INTENT",
			"COMPETITORS",
			"REVIEWS",
			"CHANGES",
			"BEFORE_AFTER",
		]);
		expect(visibilityMapModeEvidence).toMatchObject({
			MAPS: { source: "LOCAL_RANK_OBSERVATION", spatialAnchor: "GRID_POINT" },
			REVIEWS: { source: "REVIEW_SNAPSHOT", spatialAnchor: "LOCATION" },
			CHANGES: { source: "CHANGE_EVENT", spatialAnchor: "LOCATION" },
			BEFORE_AFTER: { source: "LOCAL_RANK_OBSERVATION_PAIR", spatialAnchor: "GRID_POINT" },
		});
	});

	it("derives measured, missing, invalid and unknown from observation facts", () => {
		expect(visibilityMapPointStatus({ sourceValidity: "VALID", targetRank: 3 })).toBe("MEASURED");
		expect(visibilityMapPointStatus({ sourceValidity: "VALID", targetRank: null })).toBe("MISSING");
		expect(visibilityMapPointStatus({ sourceValidity: "INVALID", targetRank: null })).toBe("INVALID");
		expect(visibilityMapPointStatus({ sourceValidity: "UNMEASURED", targetRank: null })).toBe("UNKNOWN");
	});

	it("requires observation provenance and rejects interpolation or contradictory status", () => {
		expect(() => visibilityMapPointSchema.parse(point())).not.toThrow();
		expect(() => visibilityMapPointSchema.parse({ ...point(), observationId: undefined })).toThrow();
		expect(() => visibilityMapPointSchema.parse({ ...point(), interpolated: true })).toThrow();
		expect(() => visibilityMapPointSchema.parse({ ...point(), displayStatus: "UNKNOWN" })).toThrow(
			"VISIBILITY_MAP_STATUS_MISMATCH",
		);
	});

	it("makes status distinguishable without color and includes the full tooltip in its accessible name", () => {
		const signatures = Object.values(visibilityMapMarkerSemantics).map(({ shape, pattern }) => `${shape}:${pattern}`);
		expect(new Set(signatures).size).toBe(4);
		const presentation = visibilityMapPointPresentation(point());
		expect(presentation).toMatchObject({
			shape: "CIRCLE",
			pattern: "SOLID",
			tooltip: {
				timestamp: "2026-08-01T00:00:00.000Z",
				provider: "stub-local-rank",
				keyword: "best bakery ubud",
			},
		});
		expect(presentation.ariaLabel).toContain("MEASURED: best bakery ubud; stub-local-rank");
	});

	it("requires explicit freshness for materialized data and honest live-view freshness", () => {
		expect(() =>
			visibilityMapPointSchema.parse({
				...point(),
				materialization: { kind: "MATERIALIZED", refreshedAt: null, isStale: false },
			}),
		).toThrow();
		expect(() =>
			visibilityMapPointSchema.parse({
				...point(),
				materialization: {
					kind: "MATERIALIZED",
					refreshedAt: "2026-08-01T02:00:00.000Z",
					isStale: true,
				},
			}),
		).not.toThrow();
	});
});

describe("Visibility Map Before/After compatibility", () => {
	it("accepts only a distinct fully compatible ready dataset pair", () => {
		expect(compareVisibilityMapDatasets(dataset(), dataset(true))).toEqual({
			comparable: true,
			baselineDatasetId: ids.baselineDataset,
			currentDatasetId: ids.currentDataset,
			reasons: [],
		});
	});

	it("names every canonical incompatibility instead of averaging", () => {
		const result = compareVisibilityMapDatasets(
			dataset(),
			dataset(true, {
				datasetId: ids.baselineDataset,
				projectId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
				locationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
				keywordIds: ["01234567-89ab-4cde-8fab-0123456789ab"],
				gridDefinitionId: "12345678-9abc-4def-8abc-123456789abc",
				providers: ["other-provider"],
				locales: ["id"],
				deviceContexts: ["DESKTOP"],
				formulaVersions: ["square-grid/2"],
				datasetStatus: "FAILED",
			}),
		);
		expect(result).toEqual({
			comparable: false,
			baselineDatasetId: ids.baselineDataset,
			currentDatasetId: ids.baselineDataset,
			reasons: [
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
			],
		});
	});

	it("preserves the point evidence pair and computes no aggregate", () => {
		const result = compareVisibilityMapPoints({
			baselineDataset: dataset(),
			currentDataset: dataset(true),
			baselinePoints: [point()],
			currentPoints: [point(true)],
		});
		expect(result.formulaVersion).toBe(VISIBILITY_MAP_DIFF_FORMULA_VERSION);
		expect(result.points).toEqual([
			{
				keywordId: ids.keyword,
				gridPointId: ids.point,
				provider: "stub-local-rank",
				repeatIndex: 0,
				status: "COMPARED",
				baselineObservationId: ids.baselineObservation,
				currentObservationId: ids.currentObservation,
				baselineRank: 5,
				currentRank: 2,
				rankDelta: -3,
			},
		]);
		expect(result).not.toHaveProperty("average");
	});

	it("returns UNKNOWN for unmeasured or one-sided groups", () => {
		const unmeasured = point(true, {
			sourceValidity: "UNMEASURED",
			invalidReason: "PROVIDER_UNAVAILABLE",
			targetRank: null,
			displayStatus: "UNKNOWN",
		});
		const unknown = compareVisibilityMapPoints({
			baselineDataset: dataset(),
			currentDataset: dataset(true),
			baselinePoints: [point()],
			currentPoints: [unmeasured],
		});
		expect(unknown.points[0]).toMatchObject({ status: "UNKNOWN", reason: "POINT_NOT_MEASURED" });

		const oneSided = compareVisibilityMapPoints({
			baselineDataset: dataset(),
			currentDataset: dataset(true),
			baselinePoints: [point()],
			currentPoints: [],
		});
		expect(oneSided.points[0]).toMatchObject({ status: "UNKNOWN", reason: "NOT_IN_CURRENT" });
	});

	it("returns only incompatibility reasons when datasets cannot be compared", () => {
		const result = compareVisibilityMapPoints({
			baselineDataset: dataset(),
			currentDataset: dataset(true, { providers: ["other-provider"] }),
			baselinePoints: [point()],
			currentPoints: [point(true)],
		});
		expect(result.compatibility).toMatchObject({ comparable: false, reasons: ["PROVIDER_MISMATCH"] });
		expect(result.points).toEqual([]);
	});

	it("rejects a point attached to the wrong dataset", () => {
		expect(() =>
			compareVisibilityMapPoints({
				baselineDataset: dataset(),
				currentDataset: dataset(true),
				baselinePoints: [point(false, { datasetId: ids.currentDataset })],
				currentPoints: [point(true)],
			}),
		).toThrow("VISIBILITY_MAP_POINT_DATASET_MISMATCH");
	});

	it("rejects duplicate point identities instead of overwriting evidence", () => {
		expect(() =>
			compareVisibilityMapPoints({
				baselineDataset: dataset(),
				currentDataset: dataset(true),
				baselinePoints: [point(), point(false, { observationId: "abababab-abab-4bab-8bab-abababababab" })],
				currentPoints: [point(true)],
			}),
		).toThrow("VISIBILITY_MAP_POINT_KEY_DUPLICATE");
	});
});
