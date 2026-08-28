import { describe, expect, it } from "vitest";
import {
	DEFAULT_GRID_POINT_CEILING,
	VISIBILITY_SURFACES,
	assertGridWithinCeiling,
	assertLocalObservationCardinality,
	assertSurfaceCaptureAllowed,
	expectedLocalObservations,
	localCoverage,
	localVoiceComparison,
	shareOfLocalVoice,
	squareGridPoints,
	visibilityPortfolio,
} from "./visibility-os";
import { LOCAL_AI_DISCOVERY_POLICY } from "./local-discovery";
import { LOCAL_COVERAGE_EXPECTED_V1, LOCAL_COVERAGE_FIXTURE_V1 } from "./fixtures/local-coverage-v1";
import { MICRO_SLICE_GRID, MICRO_SLICE_GRID_POINTS } from "./fixtures/micro-slice";

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

	it("keeps readiness and visibility beside each other without an overall score", () => {
		const valid = {
			readiness: [
				{
					dimension: "ACCESS",
					score: 80,
					evidenceIds: ["readiness-1"],
					measuredAt: "2026-08-29T00:00:00.000Z",
				},
			],
			surfaces: [
				{
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
});
