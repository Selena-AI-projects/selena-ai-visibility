import { describe, expect, it } from "vitest";
import { LOCAL_COVERAGE_EXPECTED_V1, LOCAL_COVERAGE_FIXTURE_V1 } from "./fixtures/local-coverage-v1";
import { MICRO_SLICE_GRID, MICRO_SLICE_GRID_POINTS } from "./fixtures/micro-slice";
import { LOCAL_AI_DISCOVERY_POLICY } from "./local-discovery";
import {
	assertGridWithinCeiling,
	assertLocalObservationCardinality,
	assertReputationAnalysis,
	assertSurfaceCaptureAllowed,
	competitorWinCoverage,
	DEFAULT_GRID_POINT_CEILING,
	expectedLocalObservations,
	expectedReputationSnapshots,
	expectedSearchObservations,
	invalidPointRate,
	LOCAL_GRID_FORMULA_VERSION,
	localCoverage,
	localDistanceRankCurve,
	localVoiceComparison,
	reviewVelocityPer30Days,
	shareOfLocalVoice,
	sphericalGridPointsV1,
	sphericalGridSpecV1Schema,
	squareGridPoints,
	VISIBILITY_SURFACES,
	visibilityPortfolio,
} from "./visibility-os";

describe("Visibility OS surfaces", () => {
	it("keeps Ask Maps manual-only and treats missing flags as disabled", () => {
		expect(VISIBILITY_SURFACES.GOOGLE_ASK_MAPS.captureMethods).toEqual([LOCAL_AI_DISCOVERY_POLICY.captureMethod]);
		expect(() => assertSurfaceCaptureAllowed("GOOGLE_MAPS_LOCAL_PACK", "PROVIDER_API", {})).toThrow(
			"VISIBILITY_SURFACE_DISABLED",
		);
		expect(() =>
			assertSurfaceCaptureAllowed("GOOGLE_ASK_MAPS", "PROVIDER_API", { LOCAL_AI_DISCOVERY_ENABLED: "true" }),
		).toThrow("VISIBILITY_CAPTURE_METHOD_BLOCKED");
		expect(() =>
			assertSurfaceCaptureAllowed("GOOGLE_ASK_MAPS", "MANUAL_OBSERVATION", {
				LOCAL_AI_DISCOVERY_ENABLED: "true",
			}),
		).not.toThrow();
	});

	it("keeps unfinished Search, Reputation and Local provider surfaces fail-closed", () => {
		expect(() =>
			assertSurfaceCaptureAllowed("GOOGLE_ORGANIC", "PROVIDER_API", {
				SELENA_SEARCH_VISIBILITY_ENABLED: "true",
			}),
		).toThrow("VISIBILITY_SURFACE_NOT_IMPLEMENTED");
		expect(() =>
			assertSurfaceCaptureAllowed("REVIEW_PLATFORM", "MANUAL_OBSERVATION", {
				SELENA_REPUTATION_ENABLED: "true",
			}),
		).toThrow("VISIBILITY_SURFACE_NOT_IMPLEMENTED");
		expect(() =>
			assertSurfaceCaptureAllowed("GOOGLE_MAPS_LOCAL_PACK", "PROVIDER_API", {
				SELENA_LOCAL_VISIBILITY_ENABLED: "true",
			}),
		).toThrow("VISIBILITY_SURFACE_NOT_IMPLEMENTED");
	});

	it("keeps readiness and visibility beside each other without an overall score", () => {
		const valid = {
			readiness: [
				{
					evidenceType: "READINESS_SNAPSHOT" as const,
					dimension: "ACCESS",
					score: 80,
					evidenceIds: ["readiness-1"],
					measuredAt: "2026-08-29T00:00:00.000Z",
				},
			],
			surfaces: [
				{
					evidenceType: "MEASUREMENT_OBSERVATION" as const,
					surfaceId: "GOOGLE_MAPS_LOCAL_PACK",
					status: "UNKNOWN",
					metrics: null,
					evidenceIds: [],
					measuredAt: null,
				},
			],
		};
		expect(visibilityPortfolio.parse(valid)).toEqual(valid);
		expect(() => visibilityPortfolio.parse({ ...valid, overallScore: 80 })).toThrow();
	});

	it("keeps visibility unchanged when readiness changes", () => {
		const surfaces = [
			{
				evidenceType: "MEASUREMENT_OBSERVATION" as const,
				surfaceId: "REVIEW_PLATFORM" as const,
				status: "MEASURED" as const,
				metrics: { reviewVelocityPer30Days: 4 },
				evidenceIds: ["review-snapshot-1"],
				measuredAt: "2026-08-29T00:00:00.000Z",
			},
		];
		const first = visibilityPortfolio.parse({
			readiness: [
				{
					evidenceType: "READINESS_SNAPSHOT",
					dimension: "ACCESS",
					score: 20,
					evidenceIds: ["readiness-1"],
					measuredAt: "2026-08-29T00:00:00.000Z",
				},
			],
			surfaces,
		});
		const second = visibilityPortfolio.parse({
			readiness: [
				{
					evidenceType: "READINESS_SNAPSHOT",
					dimension: "ACCESS",
					score: 90,
					evidenceIds: ["readiness-2"],
					measuredAt: "2026-08-29T01:00:00.000Z",
				},
			],
			surfaces,
		});
		expect(second.surfaces).toEqual(first.surfaces);
	});
});

describe("Visibility OS local grid", () => {
	it("reproduces the frozen 3x3 micro-slice coordinates", () => {
		expect(
			squareGridPoints({
				shape: MICRO_SLICE_GRID.shape,
				rows: MICRO_SLICE_GRID.rows,
				columns: MICRO_SLICE_GRID.columns,
				spacingMeters: MICRO_SLICE_GRID.spacingMeters,
				centerLatitude: MICRO_SLICE_GRID.centerLatitude,
				centerLongitude: MICRO_SLICE_GRID.centerLongitude,
				formulaVersion: "square-grid/1",
			}),
		).toEqual(MICRO_SLICE_GRID_POINTS);
	});

	it("enforces the owner-approved 49 point ceiling before queueing", () => {
		expect(DEFAULT_GRID_POINT_CEILING).toBe(49);
		expect(() =>
			assertGridWithinCeiling({
				shape: "SQUARE",
				rows: 9,
				columns: 9,
				spacingMeters: 500,
				centerLatitude: 0,
				centerLongitude: 0,
				formulaVersion: "square-grid/1",
			}),
		).toThrow("LOCAL_GRID_CEILING_EXCEEDED");
	});

	it("uses the Local domain cardinality formula", () => {
		expect(expectedLocalObservations({ locations: 1, keywords: 2, gridPoints: 9, repeats: 2, providers: 1 })).toBe(36);
		expect(() => assertLocalObservationCardinality(35, 36)).not.toThrow();
		expect(() => assertLocalObservationCardinality(36, 36)).toThrow("LOCAL_CARDINALITY_BLOCKED");
	});
});

describe("Visibility OS spherical local grid v1", () => {
	const equatorSpec = {
		formulaVersion: LOCAL_GRID_FORMULA_VERSION,
		locationId: "22222222-2222-4222-8222-222222222222",
		centerLatitude: 0,
		centerLongitude: 0,
		radiusMeters: 3000,
		size: 3,
	} as const;

	it("generates the Bali 5x5 golden points in north-west row-major order", () => {
		const grid = sphericalGridPointsV1({
			formulaVersion: LOCAL_GRID_FORMULA_VERSION,
			locationId: "11111111-1111-4111-8111-111111111111",
			centerLatitude: -8.506854,
			centerLongitude: 115.262482,
			radiusMeters: 3000,
			size: 5,
		});

		expect(grid.points).toHaveLength(25);
		expect(grid.spacingMeters).toBeCloseTo(1060.6601717798212, 10);
		expect(
			[grid.points[0], grid.points[12], grid.points[24]].map(({ id, pointIndex, latitude, longitude }) => ({
				id,
				pointIndex,
				latitude,
				longitude,
			})),
		).toEqual([
			{
				id: "5819c9ee-d177-522a-a308-87da0e0f25dd",
				pointIndex: 0,
				latitude: "-8.487776",
				longitude: "115.243193",
			},
			{
				id: "db359f4d-a95f-52e6-8276-8bf417ed5c91",
				pointIndex: 12,
				latitude: "-8.506854",
				longitude: "115.262482",
			},
			{
				id: "82ea65fb-a189-5697-a352-4f51d8b98c40",
				pointIndex: 24,
				latitude: "-8.525931",
				longitude: "115.281773",
			},
		]);
		expect(grid.points[0].distanceMeters).toBeCloseTo(3000, 10);
		expect(grid.points[12].distanceMeters).toBe(0);
		expect(grid.points[24].distanceMeters).toBeCloseTo(3000, 10);
	});

	it("matches the equator golden grid and produces standard UUIDv5 identifiers", () => {
		const grid = sphericalGridPointsV1(equatorSpec);
		expect(grid.points.map(({ latitude, longitude }) => `${latitude},${longitude}`)).toEqual([
			"0.019077,-0.019077",
			"0.019077,0.000000",
			"0.019077,0.019077",
			"0.000000,-0.019077",
			"0.000000,0.000000",
			"0.000000,0.019077",
			"-0.019077,-0.019077",
			"-0.019077,0.000000",
			"-0.019077,0.019077",
		]);
		expect(grid.points[0].id).toBe("ce4d6dc4-df8e-53d8-a035-59260b7e6bd0");
		for (const point of grid.points) {
			expect(point.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		}
	});

	it("keeps negative longitudes stable", () => {
		const grid = sphericalGridPointsV1({
			...equatorSpec,
			locationId: "33333333-3333-4333-8333-333333333333",
			centerLatitude: 37.7749,
			centerLongitude: -122.4194,
		});
		expect(
			[grid.points[0], grid.points[4], grid.points[8]].map(({ latitude, longitude }) => [latitude, longitude]),
		).toEqual([
			["37.793975", "-122.443542"],
			["37.774900", "-122.419400"],
			["37.755820", "-122.395270"],
		]);
	});

	it("normalizes points across the antimeridian", () => {
		const grid = sphericalGridPointsV1({
			...equatorSpec,
			locationId: "44444444-4444-4444-8444-444444444444",
			centerLongitude: 179.99,
		});
		expect(grid.points[2].longitude).toBe("-179.990923");
		expect(grid.points[5].longitude).toBe("-179.990923");
		expect(grid.points[8].longitude).toBe("-179.990923");
	});

	it("keeps rounded antimeridian coordinates inside the canonical range", () => {
		const nearPositiveBoundary = sphericalGridPointsV1({
			...equatorSpec,
			locationId: "55555555-5555-4555-8555-555555555555",
			centerLongitude: 179.9999996,
		});
		const positiveBoundary = sphericalGridPointsV1({
			...equatorSpec,
			locationId: "66666666-6666-4666-8666-666666666666",
			centerLongitude: 180,
		});
		const negativeBoundary = sphericalGridPointsV1({
			...equatorSpec,
			locationId: "66666666-6666-4666-8666-666666666666",
			centerLongitude: -180,
		});

		expect(nearPositiveBoundary.centerLongitude).toBe("-180.000000");
		for (const point of nearPositiveBoundary.points) {
			expect(Number(point.longitude)).toBeGreaterThanOrEqual(-180);
			expect(Number(point.longitude)).toBeLessThan(180);
		}
		expect(positiveBoundary).toEqual(negativeBoundary);
	});

	it("rounds the actual coordinate value half up without moving a below-midpoint value", () => {
		expect(sphericalGridPointsV1({ ...equatorSpec, centerLatitude: 1.2345644999999998 }).centerLatitude).toBe(
			"1.234564",
		);
		expect(sphericalGridPointsV1({ ...equatorSpec, centerLatitude: 0.08275249999999999 }).centerLatitude).toBe(
			"0.082752",
		);
		expect(sphericalGridPointsV1({ ...equatorSpec, centerLatitude: -1.2345645 }).centerLatitude).toBe("-1.234565");
		expect(sphericalGridPointsV1({ ...equatorSpec, centerLatitude: 1.2345645 }).centerLatitude).toBe("1.234565");
	});

	it("uses the rounded center for both geodesy and point identity", () => {
		const precise = sphericalGridPointsV1({ ...equatorSpec, centerLatitude: 1.2345645, centerLongitude: 12.3456784 });
		const canonical = sphericalGridPointsV1({ ...equatorSpec, centerLatitude: 1.234565, centerLongitude: 12.345678 });
		expect(precise).toEqual(canonical);
	});

	it("repeats the same lock exactly and fails closed outside the MVP boundary", () => {
		expect(sphericalGridPointsV1(equatorSpec)).toEqual(sphericalGridPointsV1(equatorSpec));
		expect(sphericalGridSpecV1Schema.safeParse({ ...equatorSpec, size: 7 }).success).toBe(false);
		expect(sphericalGridSpecV1Schema.safeParse({ ...equatorSpec, radiusMeters: 2999 }).success).toBe(false);
		expect(sphericalGridSpecV1Schema.safeParse({ ...equatorSpec, centerLatitude: 85.000001 }).success).toBe(false);
		expect(() => sphericalGridPointsV1({ ...equatorSpec, centerLatitude: 85 })).toThrow(
			"GRID_POLAR_REGION_UNSUPPORTED",
		);
		expect(() => sphericalGridPointsV1({ ...equatorSpec, centerLatitude: -85 })).toThrow(
			"GRID_POLAR_REGION_UNSUPPORTED",
		);
		expect(() => sphericalGridPointsV1({ ...equatorSpec, centerLatitude: 85.000001 })).toThrow(
			"GRID_POLAR_REGION_UNSUPPORTED",
		);
	});
});

describe("Visibility OS local metrics fixture v1", () => {
	it("computes coverage, outside Top-20, average rank and found share", () => {
		const full = localCoverage(LOCAL_COVERAGE_FIXTURE_V1.full, LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey);
		expect(full.top3.value).toBe(LOCAL_COVERAGE_EXPECTED_V1.full.top3);
		expect(full.top10.value).toBe(LOCAL_COVERAGE_EXPECTED_V1.full.top10);
		expect(full.top20.value).toBe(LOCAL_COVERAGE_EXPECTED_V1.full.top20);
		expect(full.outsideTop20.value).toBe(LOCAL_COVERAGE_EXPECTED_V1.full.outsideTop20);
		expect(full.averageRank).toBe(LOCAL_COVERAGE_EXPECTED_V1.full.averageRank);
		expect(full.foundShare.value).toBe(LOCAL_COVERAGE_EXPECTED_V1.full.foundShare);

		const partial = localCoverage(LOCAL_COVERAGE_FIXTURE_V1.partial, LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey);
		expect(partial.top3.value).toBe(LOCAL_COVERAGE_EXPECTED_V1.partial.top3);
		expect(partial.averageRank).toBeCloseTo(LOCAL_COVERAGE_EXPECTED_V1.partial.averageRank);
		expect(partial.foundShare.value).toBe(LOCAL_COVERAGE_EXPECTED_V1.partial.foundShare);
	});

	it("excludes shallow points from a band's denominator and returns UNKNOWN for an empty denominator", () => {
		const shallow = localCoverage(LOCAL_COVERAGE_FIXTURE_V1.shallow, LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey);
		expect(shallow.top3.value).toBeCloseTo(LOCAL_COVERAGE_EXPECTED_V1.shallow.top3);
		expect(shallow.top10.value).toBe(LOCAL_COVERAGE_EXPECTED_V1.shallow.top10);
		expect(shallow.top10.denominator).toBe(1);

		const withoutTarget = LOCAL_COVERAGE_FIXTURE_V1.shallow.map((observation) => ({
			...observation,
			entries: observation.entries.filter((entry) => entry.entityKey !== LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey),
		}));
		expect(localCoverage(withoutTarget, LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey).top10.value).toBeNull();
	});

	it("uses occupied unique entity slots for Share of Local Voice", () => {
		expect(
			shareOfLocalVoice(LOCAL_COVERAGE_FIXTURE_V1.full, LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey, 3).value,
		).toBeCloseTo(LOCAL_COVERAGE_EXPECTED_V1.full.shareOfLocalVoiceAt3);
		expect(
			shareOfLocalVoice(LOCAL_COVERAGE_FIXTURE_V1.shallow, LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey, 10).value,
		).toBeNull();
		const comparison = localVoiceComparison(
			LOCAL_COVERAGE_FIXTURE_V1.full,
			[LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey, "competitor-a"],
			3,
		);
		expect(comparison[LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey]).toBeCloseTo(1 / 3);
		expect(comparison["competitor-a"]).toBeCloseTo(2 / 9);
	});

	it("computes competitor wins, distance-rank buckets and invalid-point rate", () => {
		const observations = [
			{
				validity: "VALID" as const,
				captureDepth: 20,
				distanceMeters: 0,
				entries: [
					{ rank: 1, entityKey: "competitor-a" },
					{ rank: 4, entityKey: LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey },
				],
			},
			{
				validity: "VALID" as const,
				captureDepth: 20,
				distanceMeters: 1000,
				entries: [
					{ rank: 2, entityKey: LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey },
					{ rank: 5, entityKey: "competitor-a" },
				],
			},
			{
				validity: "INVALID" as const,
				captureDepth: 20,
				distanceMeters: 2000,
				entries: [],
			},
		];
		expect(competitorWinCoverage(observations, LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey, "competitor-a")).toEqual({
			value: 1 / 2,
			numerator: 1,
			denominator: 2,
		});
		expect(invalidPointRate(observations, 3)).toEqual({ value: 1 / 3, numerator: 1, denominator: 3 });
		expect(
			localDistanceRankCurve(observations, LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey, [
				{ minMeters: 0, maxMeters: 1000 },
				{ minMeters: 1000, maxMeters: 3000 },
			]),
		).toEqual([
			{ minMeters: 0, maxMeters: 1000, coverage: { value: 1, numerator: 1, denominator: 1 }, averageRank: 4 },
			{ minMeters: 1000, maxMeters: 3000, coverage: { value: 1, numerator: 1, denominator: 1 }, averageRank: 2 },
		]);
		expect(() =>
			localDistanceRankCurve(observations, LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey, [
				{ minMeters: 0, maxMeters: 1000 },
				{ minMeters: 500, maxMeters: 1500 },
			]),
		).toThrow("LOCAL_DISTANCE_BANDS_INVALID");
		expect(() =>
			localDistanceRankCurve(
				[{ ...observations[0], distanceMeters: Number.NaN }],
				LOCAL_COVERAGE_FIXTURE_V1.targetEntityKey,
				[{ minMeters: 0, maxMeters: 1000 }],
			),
		).toThrow("LOCAL_DISTANCE_OBSERVATION_INVALID");
		expect(() => invalidPointRate(observations, 2)).toThrow("LOCAL_CARDINALITY_INVALID");
	});
});

describe("Visibility OS Search and Reputation contracts", () => {
	it("keeps Search and Reputation cardinality formulas domain-specific", () => {
		expect(expectedSearchObservations({ queries: 2, engines: 2, regions: 1, devices: 2, repeats: 3 })).toBe(24);
		expect(expectedReputationSnapshots({ locations: 2, sources: 3, periods: 4 })).toBe(24);
		expect(() => expectedSearchObservations({ queries: 0, engines: 1, regions: 1, devices: 1, repeats: 1 })).toThrow(
			"SEARCH_OBSERVATION_SHAPE_INVALID",
		);
		expect(() => expectedReputationSnapshots({ locations: 1, sources: -1, periods: 1 })).toThrow(
			"REPUTATION_SNAPSHOT_SHAPE_INVALID",
		);
	});

	it("requires an analysis method version for every topic or sentiment", () => {
		expect(() =>
			assertReputationAnalysis({ topic: "service", sentiment: "POSITIVE", analysisMethodVersion: null }),
		).toThrow("REPUTATION_ANALYSIS_METHOD_REQUIRED");
		expect(() =>
			assertReputationAnalysis({ topic: null, sentiment: "NEGATIVE", analysisMethodVersion: "sentiment/1" }),
		).not.toThrow();
		expect(() => assertReputationAnalysis({ topic: null, sentiment: null, analysisMethodVersion: null })).not.toThrow();
	});

	it("normalizes review velocity to 30 days and preserves UNKNOWN", () => {
		expect(reviewVelocityPer30Days(5, 15)).toBe(10);
		expect(reviewVelocityPer30Days(null, 15)).toBeNull();
		expect(() => reviewVelocityPer30Days(5, 0)).toThrow("REPUTATION_PERIOD_INVALID");
		expect(() => reviewVelocityPer30Days(-1, 15)).toThrow("REPUTATION_REVIEW_COUNT_INVALID");
	});
});
